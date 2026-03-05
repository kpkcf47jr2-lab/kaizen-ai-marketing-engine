/**
 * Content Generation Processor — HeyGen-Powered Pipeline
 *
 * NEW FLOW (HeyGen handles video + voice):
 *   1. GPT-4o generates script + HeyGen video prompt (derived from Master Prompt)
 *   2. HeyGen generates avatar video with lip-synced voice (no separate TTS!)
 *   3. DALL-E generates thumbnail (optional)
 *   4. Posts are scheduled for connected social accounts
 *   5. Credits are charged based on video tier (FREE/PRO/ULTRA)
 *
 * The user pays in KairosCoin → KAME pays HeyGen in USD on their behalf.
 */
import prisma from '../lib/prisma.js';
import {
  OpenAILLMProvider,
  HeyGenVideoProvider,
  MockLLMProvider,
  MockVideoProvider,
  MockThumbnailProvider,
  DALLEThumbnailProvider,
  CREDITS_BY_TIER,
} from '@kaizen/shared';
import type {
  LLMProvider,
  VideoProvider,
  ThumbnailProvider,
  BrandConfig,
  StorageUploadFn,
} from '@kaizen/shared';
import type { GeneratedContentPlan } from '@kaizen/shared/src/openai-llm.js';
import type { VideoQualityTier } from '@kaizen/shared';

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

function createProviders(
  uploadFn: StorageUploadFn,
  tier: VideoQualityTier = 'pro',
  campaignConfig?: { avatarId?: string; voiceId?: string },
): {
  llm: LLMProvider & { generateContentPlan?: typeof OpenAILLMProvider.prototype.generateContentPlan };
  video: VideoProvider;
  thumbnail: ThumbnailProvider;
} {
  return {
    llm: process.env.OPENAI_API_KEY ? new OpenAILLMProvider() : new MockLLMProvider(),
    video: process.env.HEYGEN_API_KEY
      ? new HeyGenVideoProvider({
          tier,
          defaultAvatarId: campaignConfig?.avatarId,
          defaultVoiceId: campaignConfig?.voiceId,
        })
      : new MockVideoProvider(),
    thumbnail: process.env.OPENAI_API_KEY
      ? new DALLEThumbnailProvider(undefined, uploadFn)
      : new MockThumbnailProvider(),
  };
}

// ─── Main Processor ──────────────────────────────────────

export async function processContentJob(data: ContentJobData) {
  const { contentJobId, userId } = data;

  // Load the content job to get the video tier
  const contentJob = await prisma.contentJob.findUnique({
    where: { id: contentJobId },
  });
  if (!contentJob) throw new Error(`Content job ${contentJobId} not found`);

  const videoTier = (contentJob.videoTier?.toLowerCase() || 'pro') as VideoQualityTier;

  // Update job to RUNNING
  await prisma.contentJob.update({
    where: { id: contentJobId },
    data: { status: 'RUNNING', startedAt: new Date(), progress: 5 },
  });

  try {
    // Load brand profile
    const brand = await prisma.brandProfile.findUnique({ where: { userId } });
    if (!brand) throw new Error('Brand profile not found — cannot generate content');

    // Load campaign config for avatar/voice preferences
    const campaign = await prisma.campaign.findUnique({ where: { userId } });

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

    // Get recent topics to avoid repetition (last 30)
    const recentJobs = await prisma.asset.findMany({
      where: { userId, type: 'SCRIPT' },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: { filename: true },
    });
    const previousTopics = recentJobs.map((a) => a.filename || '').filter(Boolean);

    const uploadFn = await getStorageUpload();
    const providers = createProviders(uploadFn, videoTier, {
      avatarId: campaign?.avatarId || undefined,
      voiceId: campaign?.voiceId || undefined,
    });

    // ── Step 1: Generate content plan (script + HeyGen directives) ──
    await prisma.contentJob.update({
      where: { id: contentJobId },
      data: { status: 'GENERATING_SCRIPT', progress: 10 },
    });

    console.log(`  [content:${contentJobId}] 📝 Generating content plan (tier: ${videoTier})...`);

    let contentPlan: GeneratedContentPlan;
    if ('generateContentPlan' in providers.llm && providers.llm.generateContentPlan) {
      contentPlan = await providers.llm.generateContentPlan(brandConfig, {
        topic: data.topic,
        previousTopics,
        language: data.language || brand.language,
        contentDay: new Date().getDate(),
      });
    } else {
      // Fallback for MockLLMProvider
      const script = await providers.llm.generateScript(brandConfig, {
        topic: data.topic,
        previousTopics,
        language: data.language || brand.language,
      });
      contentPlan = {
        ...script,
        heygenPrompt: `A ${brand.tone || 'professional'} presenter talking about ${brand.niche || 'business'}`,
        sceneDirection: 'Avatar centered, natural gestures',
        background: 'modern office',
        avatarMood: 'confident',
      };
    }

    // Save script as asset
    const scriptText = [
      `# ${contentPlan.title}`,
      '',
      contentPlan.script,
      '',
      '---',
      `Caption: ${contentPlan.caption}`,
      `Hashtags: ${contentPlan.hashtags.join(', ')}`,
      `CTA: ${contentPlan.cta}`,
      `HeyGen Prompt: ${contentPlan.heygenPrompt}`,
      `Scene: ${contentPlan.sceneDirection}`,
      `Background: ${contentPlan.background}`,
      `Mood: ${contentPlan.avatarMood}`,
    ].join('\n');

    const scriptKey = `scripts/${contentJobId}-script.txt`;
    const scriptUrl = await uploadFn(scriptKey, new TextEncoder().encode(scriptText), 'text/plain');

    const scriptAsset = await prisma.asset.create({
      data: {
        userId,
        contentJobId,
        type: 'SCRIPT',
        url: scriptUrl,
        filename: contentPlan.title,
        mimeType: 'text/plain',
        sizeBytes: new TextEncoder().encode(scriptText).byteLength,
      },
    });

    await prisma.contentJob.update({
      where: { id: contentJobId },
      data: { progress: 30 },
    });

    // ── Step 2: Generate video via HeyGen (includes voice!) ──
    // NO separate TTS step — HeyGen handles voice + lip-sync + avatar
    await prisma.contentJob.update({
      where: { id: contentJobId },
      data: { status: 'GENERATING_VIDEO', progress: 35 },
    });

    console.log(`  [content:${contentJobId}] 🎬 Generating video via HeyGen (${videoTier})...`);
    let video;
    try {
      // Primary: Avatar video with the script (HeyGen does TTS internally)
      video = await providers.video.generateAvatarVideo(
        contentPlan.script,
        '', // No separate audio URL needed — HeyGen generates the voice
        {
          backgroundUrl: undefined, // TODO: brand background images
          width: videoTier === 'free' ? 720 : 1080,
          height: videoTier === 'free' ? 1280 : 1920,
        },
      );
    } catch (avatarError) {
      console.warn(`  [content:${contentJobId}] ⚠️ Avatar video failed, trying template...`, avatarError);
      video = await providers.video.generateTemplateVideo(contentPlan.script, undefined, {
        brandColor: brandConfig.styleGuidelines || undefined,
        width: videoTier === 'free' ? 720 : 1080,
        height: videoTier === 'free' ? 1280 : 1920,
      });
    }

    const videoAsset = await prisma.asset.create({
      data: {
        userId,
        contentJobId,
        type: 'VIDEO',
        url: video.url,
        filename: `${contentPlan.title}-video.mp4`,
        mimeType: 'video/mp4',
        durationMs: video.durationMs,
      },
    });

    await prisma.contentJob.update({
      where: { id: contentJobId },
      data: { progress: 80 },
    });

    // ── Step 3: Generate thumbnail (optional) ────────────
    console.log(`  [content:${contentJobId}] 🖼️ Generating thumbnail...`);
    let thumbnailAsset = null;
    try {
      // Use HeyGen's thumbnail if available, otherwise DALL-E
      if (video.thumbnailUrl) {
        thumbnailAsset = await prisma.asset.create({
          data: {
            userId,
            contentJobId,
            type: 'THUMBNAIL',
            url: video.thumbnailUrl,
            filename: `${contentPlan.title}-thumb.png`,
            mimeType: 'image/png',
          },
        });
      } else {
        const thumbnail = await providers.thumbnail.generateThumbnail(contentPlan.title, brandConfig);
        thumbnailAsset = await prisma.asset.create({
          data: {
            userId,
            contentJobId,
            type: 'THUMBNAIL',
            url: thumbnail.url,
            filename: `${contentPlan.title}-thumb.png`,
            mimeType: 'image/png',
          },
        });
      }
    } catch (err) {
      console.warn(`  [content:${contentJobId}] ⚠️ Thumbnail generation skipped:`, err);
    }

    await prisma.contentJob.update({
      where: { id: contentJobId },
      data: { progress: 90 },
    });

    // ── Step 4: Create draft posts for connected social accounts ──
    const socialAccounts = await prisma.socialAccount.findMany({
      where: { userId, status: 'ACTIVE' },
    });

    const autoPublish = campaign?.autoPublish !== false; // default true

    for (const account of socialAccounts) {
      await prisma.post.create({
        data: {
          userId,
          socialAccountId: account.id,
          contentJobId,
          assetId: videoAsset.id,
          provider: account.provider,
          caption: contentPlan.caption,
          hashtags: contentPlan.hashtags,
          status: autoPublish ? 'SCHEDULED' : 'DRAFT',
          scheduledFor: autoPublish ? new Date(Date.now() + 5 * 60 * 1000) : undefined,
        },
      });
    }

    // ── Step 5: Spend credits (based on tier) ────────────
    const creditsToSpend = CREDITS_BY_TIER[videoTier.toUpperCase() as keyof typeof CREDITS_BY_TIER] ?? 10;

    if (creditsToSpend > 0) {
      const lastLedger = await prisma.creditLedger.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
      const currentBalance = lastLedger?.balanceAfter ?? 0;

      if (currentBalance >= creditsToSpend) {
        await prisma.creditLedger.create({
          data: {
            userId,
            type: 'SPEND',
            amount: -creditsToSpend,
            balanceAfter: currentBalance - creditsToSpend,
            referenceId: contentJobId,
            description: `${videoTier.toUpperCase()} video: ${contentPlan.title}`,
          },
        });
      }
    }

    // Update campaign stats
    if (campaign) {
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: {
          totalGenerated: { increment: 1 },
          lastGeneratedAt: new Date(),
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

    console.log(`  [content:${contentJobId}] ✅ Pipeline complete — ${socialAccounts.length} posts ${autoPublish ? 'scheduled' : 'drafted'} (tier: ${videoTier}, credits: -${creditsToSpend})`);

    return {
      success: true,
      videoAssetId: videoAsset.id,
      scriptAssetId: scriptAsset.id,
      thumbnailAssetId: thumbnailAsset?.id,
      postsCreated: socialAccounts.length,
      creditsSpent: creditsToSpend,
      videoTier,
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

