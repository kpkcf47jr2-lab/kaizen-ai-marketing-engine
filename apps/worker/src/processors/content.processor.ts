/**
 * Content Generation Processor
 * Orchestrates: Script → Voice → Video → Thumbnail pipeline via real providers.
 * Uses correct Prisma schema field names (see PROJECT-CONTEXT.md §4).
 */
import prisma from '../lib/prisma.js';
import {
  OpenAILLMProvider,
  ElevenLabsTTSProvider,
  MockLLMProvider,
  MockTTSProvider,
  MockVideoProvider,
  MockThumbnailProvider,
  DALLEThumbnailProvider,
  CREDITS_PER_VIDEO,
} from '@kaizen/shared';
import type {
  LLMProvider,
  TTSProvider,
  VideoProvider,
  ThumbnailProvider,
  BrandConfig,
  StorageUploadFn,
} from '@kaizen/shared';

interface ContentJobData {
  contentJobId: string;
  userId: string;
  topic?: string;
  language?: string;
}

// ─── S3 Storage Upload (inline, no web-app dependency) ───

let s3Upload: StorageUploadFn | undefined;

async function getStorageUpload(): Promise<StorageUploadFn> {
  if (s3Upload) return s3Upload;

  const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');

  const s3 = new S3Client({
    region: process.env.S3_REGION || 'us-east-1',
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: !!process.env.S3_ENDPOINT,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY || '',
      secretAccessKey: process.env.S3_SECRET_KEY || '',
    },
  });

  const bucket = process.env.S3_BUCKET || 'kaizen-assets';
  const baseUrl = process.env.S3_ENDPOINT
    ? `${process.env.S3_ENDPOINT}/${bucket}`
    : `https://${bucket}.s3.${process.env.S3_REGION}.amazonaws.com`;

  s3Upload = async (key: string, data: Uint8Array | ArrayBuffer, contentType: string) => {
    const body = data instanceof Uint8Array ? data : new Uint8Array(data);
    await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }));
    return `${baseUrl}/${key}`;
  };

  return s3Upload;
}

// ─── Provider Factory ────────────────────────────────────

function createProviders(uploadFn: StorageUploadFn): {
  llm: LLMProvider;
  tts: TTSProvider;
  video: VideoProvider;
  thumbnail: ThumbnailProvider;
} {
  return {
    llm: process.env.OPENAI_API_KEY ? new OpenAILLMProvider() : new MockLLMProvider(),
    tts: process.env.ELEVENLABS_API_KEY
      ? new ElevenLabsTTSProvider(undefined, uploadFn)
      : new MockTTSProvider(),
    video: new MockVideoProvider(), // TODO: Replace with Remotion compositor
    thumbnail: process.env.OPENAI_API_KEY
      ? new DALLEThumbnailProvider(undefined, uploadFn)
      : new MockThumbnailProvider(),
  };
}

// ─── Main Processor ──────────────────────────────────────

export async function processContentJob(data: ContentJobData) {
  const { contentJobId, userId } = data;

  // Update job to RUNNING
  await prisma.contentJob.update({
    where: { id: contentJobId },
    data: { status: 'RUNNING', startedAt: new Date(), progress: 5 },
  });

  try {
    // Load brand profile
    const brand = await prisma.brandProfile.findUnique({ where: { userId } });
    if (!brand) throw new Error('Brand profile not found — cannot generate content');

    const brandConfig: BrandConfig = {
      brandName: brand.brandName,
      niche: brand.niche || undefined,
      language: brand.language,
      tone: brand.tone || undefined,
      masterPrompt: brand.masterPrompt,
      ctas: brand.ctas,
      links: brand.links,
      hashtagsDefault: brand.hashtagsDefault,
      styleGuidelines: brand.styleGuidelines || undefined,
      products: brand.products || undefined,
      targetAudience: brand.targetAudience || undefined,
    };

    // Get recent topics to avoid repetition
    const recentJobs = await prisma.asset.findMany({
      where: { userId, type: 'SCRIPT' },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { filename: true },
    });
    const previousTopics = recentJobs.map((a) => a.filename || '').filter(Boolean);

    const uploadFn = await getStorageUpload();
    const providers = createProviders(uploadFn);

    // ── Step 1: Generate script ──────────────────────────
    await prisma.contentJob.update({
      where: { id: contentJobId },
      data: { status: 'GENERATING_SCRIPT', progress: 10 },
    });

    console.log(`  [content:${contentJobId}] 📝 Generating script...`);
    const script = await providers.llm.generateScript(brandConfig, {
      topic: data.topic,
      previousTopics,
      language: data.language || brand.language,
    });

    // Save script as asset
    const scriptText = `# ${script.title}\n\n${script.script}\n\n---\nCaption: ${script.caption}\nHashtags: ${script.hashtags.join(', ')}\nCTA: ${script.cta}`;
    const scriptKey = `scripts/${contentJobId}-script.txt`;
    const scriptUrl = await uploadFn(scriptKey, new TextEncoder().encode(scriptText), 'text/plain');

    const scriptAsset = await prisma.asset.create({
      data: {
        userId,
        contentJobId,
        type: 'SCRIPT',
        url: scriptUrl,
        filename: script.title,
        mimeType: 'text/plain',
        sizeBytes: new TextEncoder().encode(scriptText).byteLength,
      },
    });

    await prisma.contentJob.update({
      where: { id: contentJobId },
      data: { progress: 30 },
    });

    // ── Step 2: Generate voiceover ───────────────────────
    await prisma.contentJob.update({
      where: { id: contentJobId },
      data: { status: 'GENERATING_VOICE', progress: 35 },
    });

    console.log(`  [content:${contentJobId}] 🎙️ Generating voiceover...`);
    const voice = await providers.tts.synthesize(script.script, {
      language: script.language,
    });

    const audioAsset = await prisma.asset.create({
      data: {
        userId,
        contentJobId,
        type: 'AUDIO',
        url: voice.url,
        filename: `${script.title}-voiceover.mp3`,
        mimeType: 'audio/mpeg',
        durationMs: voice.durationMs,
      },
    });

    await prisma.contentJob.update({
      where: { id: contentJobId },
      data: { progress: 55 },
    });

    // ── Step 3: Generate video ───────────────────────────
    await prisma.contentJob.update({
      where: { id: contentJobId },
      data: { status: 'GENERATING_VIDEO', progress: 60 },
    });

    console.log(`  [content:${contentJobId}] 🎬 Generating video...`);
    let video;
    try {
      video = await providers.video.generateAvatarVideo(script.script, voice.url);
    } catch {
      video = await providers.video.generateTemplateVideo(script.script, voice.url);
    }

    const videoAsset = await prisma.asset.create({
      data: {
        userId,
        contentJobId,
        type: 'VIDEO',
        url: video.url,
        filename: `${script.title}-video.mp4`,
        mimeType: 'video/mp4',
        durationMs: video.durationMs,
      },
    });

    await prisma.contentJob.update({
      where: { id: contentJobId },
      data: { progress: 80 },
    });

    // ── Step 4: Generate thumbnail ───────────────────────
    console.log(`  [content:${contentJobId}] 🖼️ Generating thumbnail...`);
    let thumbnailAsset = null;
    try {
      const thumbnail = await providers.thumbnail.generateThumbnail(script.title, brandConfig);
      thumbnailAsset = await prisma.asset.create({
        data: {
          userId,
          contentJobId,
          type: 'THUMBNAIL',
          url: thumbnail.url,
          filename: `${script.title}-thumb.png`,
          mimeType: 'image/png',
        },
      });
    } catch (err) {
      console.warn(`  [content:${contentJobId}] ⚠️ Thumbnail generation skipped:`, err);
    }

    await prisma.contentJob.update({
      where: { id: contentJobId },
      data: { progress: 90 },
    });

    // ── Step 5: Create draft posts for connected social accounts ──
    const socialAccounts = await prisma.socialAccount.findMany({
      where: { userId, status: 'ACTIVE' },
    });

    for (const account of socialAccounts) {
      await prisma.post.create({
        data: {
          userId,
          socialAccountId: account.id,
          contentJobId,
          assetId: videoAsset.id,
          provider: account.provider,
          caption: script.caption,
          hashtags: script.hashtags,
          status: 'SCHEDULED',
          scheduledFor: new Date(Date.now() + 5 * 60 * 1000), // Schedule 5 min from now
        },
      });
    }

    // ── Step 6: Spend credits ────────────────────────────
    const lastLedger = await prisma.creditLedger.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    const currentBalance = lastLedger?.balanceAfter ?? 0;

    if (currentBalance >= CREDITS_PER_VIDEO) {
      await prisma.creditLedger.create({
        data: {
          userId,
          type: 'SPEND',
          amount: -CREDITS_PER_VIDEO,
          balanceAfter: currentBalance - CREDITS_PER_VIDEO,
          referenceId: contentJobId,
          description: `Content generation: ${script.title}`,
        },
      });
    }

    // ── Mark job as SUCCESS ──────────────────────────────
    await prisma.contentJob.update({
      where: { id: contentJobId },
      data: {
        status: 'SUCCESS',
        progress: 100,
        completedAt: new Date(),
      },
    });

    console.log(`  [content:${contentJobId}] ✅ Pipeline complete — ${socialAccounts.length} posts scheduled`);

    return {
      success: true,
      videoAssetId: videoAsset.id,
      scriptAssetId: scriptAsset.id,
      audioAssetId: audioAsset.id,
      thumbnailAssetId: thumbnailAsset?.id,
      postsCreated: socialAccounts.length,
    };
  } catch (error) {
    console.error(`  [content:${contentJobId}] ❌ Failed:`, error);
    await prisma.contentJob.update({
      where: { id: contentJobId },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
    throw error;
  }
}

