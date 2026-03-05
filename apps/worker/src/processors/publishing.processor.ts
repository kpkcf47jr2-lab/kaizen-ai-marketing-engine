/**
 * Social Publishing Processor
 * Publishes generated video assets to connected social accounts.
 * Uses correct Prisma schema field names (see PROJECT-CONTEXT.md §4).
 */
import prisma from '../lib/prisma.js';
import { getPublisher, MockPublisher, decrypt } from '@kaizen/shared';
import type { SocialPublisher } from '@kaizen/shared';

interface PublishJobData {
  postId: string;
  contentJobId?: string;
  socialAccountId: string;
  assetId: string;
}

export async function processPublishJob(data: PublishJobData) {
  const { postId, socialAccountId, assetId } = data;

  try {
    // Mark post as PUBLISHING
    await prisma.post.update({
      where: { id: postId },
      data: { status: 'PUBLISHING' },
    });

    const socialAccount = await prisma.socialAccount.findUnique({
      where: { id: socialAccountId },
    });
    if (!socialAccount || socialAccount.status !== 'ACTIVE') {
      throw new Error(`Social account ${socialAccountId} not found or inactive`);
    }

    const asset = await prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) throw new Error(`Asset ${assetId} not found`);

    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post) throw new Error(`Post ${postId} not found`);

    console.log(`  [publish:${postId}] Publishing to ${socialAccount.provider} (@${socialAccount.providerUsername})...`);

    // Decrypt access token
    const encKey = process.env.ENCRYPTION_KEY;
    if (!encKey) throw new Error('ENCRYPTION_KEY not configured');
    const accessToken = await decrypt(socialAccount.accessTokenEncrypted, encKey);

    // Get the appropriate publisher
    let publisher: SocialPublisher;
    try {
      publisher = getPublisher(socialAccount.provider);
    } catch {
      console.warn(`  [publish:${postId}] No real publisher for ${socialAccount.provider}, using mock`);
      publisher = new MockPublisher();
    }

    // Publish the video
    const result = await publisher.publishVideo({
      videoUrl: asset.url,
      caption: post.caption || '',
      hashtags: post.hashtags,
      accessToken,
      accountId: socialAccount.providerAccountId || undefined,
    });

    // Update post with success status
    await prisma.post.update({
      where: { id: postId },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
        remotePostId: result.remotePostId,
        remoteUrl: result.remoteUrl,
      },
    });

    console.log(`  [publish:${postId}] ✅ Published: ${result.remotePostId}`);
    return { success: true, remotePostId: result.remotePostId };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';

    await prisma.post.update({
      where: { id: postId },
      data: {
        status: 'FAILED',
        error: errorMsg,
      },
    });

    console.error(`  [publish:${postId}] ❌ Failed: ${errorMsg}`);
    throw error;
  }
}

