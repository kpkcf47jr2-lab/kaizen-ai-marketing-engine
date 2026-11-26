/**
 * Social Publishing Processor
 * Publishes generated video assets to connected social accounts.
 * Uses correct Prisma schema field names (see PROJECT-CONTEXT.md §4).
 */
import prisma from '../lib/prisma.js';
import { getPublisher, requirePublishBinding, decrypt } from '@kaizen/shared';
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
    requirePublishBinding(post, socialAccount, asset);
    if (post.status === 'PUBLISHED') return { success: true, remotePostId: post.remotePostId };
    // Unknown submissions must be reconciled, never posted twice on retry.
    if (post.status === 'PUBLISHING') throw new Error('KAME_PUBLICATION_RECONCILIATION_REQUIRED');
    if (post.status !== 'SCHEDULED') throw new Error('KAME_PUBLICATION_NOT_SCHEDULED');

    console.log(`  [publish:${postId}] Publishing to ${socialAccount.provider} (@${socialAccount.providerUsername})...`);

    // Decrypt access token
    const encKey = process.env.ENCRYPTION_KEY;
    if (!encKey) throw new Error('ENCRYPTION_KEY not configured');
    const accessToken = await decrypt(socialAccount.accessTokenEncrypted, encKey);

    // Get the appropriate publisher
    const publisher: SocialPublisher = getPublisher(socialAccount.provider);
    const claimed = await prisma.post.updateMany({
      where: { id: postId, status: post.status },
      data: { status: 'PUBLISHING' },
    });
    if (claimed.count !== 1) throw new Error('KAME_PUBLICATION_ALREADY_CLAIMED');

    // Publish the video
    const result = await publisher.publishVideo({
      videoUrl: asset.url,
      caption: post.caption || '',
      hashtags: post.hashtags,
      accessToken,
      accountId: socialAccount.providerAccountId || undefined,
    });
    if (typeof result?.remotePostId !== 'string' || !result.remotePostId.trim() ||
        result.remotePostId.length > 512 || result.remotePostId.startsWith('mock_')) {
      throw new Error('KAME_PUBLICATION_RECONCILIATION_REQUIRED');
    }

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

    // Preserve PUBLISHING after ambiguous remote calls. Do not modify a row when
    // queue IDs failed ownership/binding checks; the queue error remains visible.

    console.error(`  [publish:${postId}] ❌ Failed: ${errorMsg}`);
    throw error;
  }
}

