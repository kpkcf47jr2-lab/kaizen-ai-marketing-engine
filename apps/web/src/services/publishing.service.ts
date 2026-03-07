/**
 * Publishing Service — Posts content to social networks.
 * Uses publisher implementations from @kaizen/shared.
 */

import prisma from '@/lib/prisma';
import { decryptToken } from '@/lib/token-vault';
import {
  getPublisher,
  MockPublisher,
} from '@kaizen/shared';
import type { SocialPublisher } from '@kaizen/shared';

// ─── Publishing Orchestrator ─────────────────────────────

export class PublishingService {
  /**
   * Publish a video post to a specific social account.
   * Handles token decryption, publisher selection, and DB status updates.
   */
  static async publishToAccount(
    postId: string,
    socialAccountId: string,
    videoUrl: string,
    caption: string,
    hashtags: string[],
  ) {
    const socialAccount = await prisma.socialAccount.findUnique({
      where: { id: socialAccountId },
    });
    if (!socialAccount) throw new Error('Social account not found');

    let publisher: SocialPublisher;
    try {
      publisher = getPublisher(socialAccount.provider);
    } catch {
      console.warn(`No real publisher for ${socialAccount.provider}, using mock`);
      publisher = new MockPublisher();
    }

    const accessToken = await decryptToken(socialAccount.accessTokenEncrypted);

    try {
      const result = await publisher.publishVideo({
        videoUrl,
        caption,
        hashtags,
        accessToken,
        accountId: socialAccount.providerAccountId || undefined,
      });

      await prisma.post.update({
        where: { id: postId },
        data: {
          status: 'PUBLISHED',
          remotePostId: result.remotePostId,
          remoteUrl: result.remoteUrl,
          publishedAt: new Date(),
        },
      });

      return result;
    } catch (error: any) {
      await prisma.post.update({
        where: { id: postId },
        data: {
          status: 'FAILED',
          error: error.message || 'Unknown publishing error',
        },
      });
      throw error;
    }
  }

  /**
   * Fetch latest metrics for a published post and update the DB.
   */
  static async updateMetrics(postId: string) {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { socialAccount: true },
    });
    if (!post || !post.remotePostId || !post.socialAccount) return null;

    let publisher: SocialPublisher;
    try {
      publisher = getPublisher(post.provider);
    } catch {
      return null;
    }

    const accessToken = await decryptToken(post.socialAccount.accessTokenEncrypted);
    const metrics = await publisher.getMetrics({
      remotePostId: post.remotePostId,
      accessToken,
    });

    await prisma.post.update({
      where: { id: postId },
      data: { metrics: metrics as any },
    });

    return metrics;
  }

  /**
   * Refresh an expired social account token.
   */
  static async refreshAccountToken(socialAccountId: string) {
    const account = await prisma.socialAccount.findUnique({
      where: { id: socialAccountId },
    });
    if (!account || !account.refreshTokenEncrypted) return false;

    let publisher: SocialPublisher;
    try {
      publisher = getPublisher(account.provider);
    } catch {
      return false;
    }

    const refreshToken = await decryptToken(account.refreshTokenEncrypted);
    const { encrypt } = await import('@kaizen/shared');
    const encKey = process.env.ENCRYPTION_KEY!;

    try {
      const result = await publisher.refreshToken(refreshToken);
      const newAccessEncrypted = await encrypt(result.accessToken, encKey);

      const updateData: any = {
        accessTokenEncrypted: newAccessEncrypted,
        tokenExpiresAt: result.expiresAt,
        status: 'ACTIVE',
      };

      if (result.refreshToken) {
        updateData.refreshTokenEncrypted = await encrypt(result.refreshToken, encKey);
      }

      await prisma.socialAccount.update({
        where: { id: socialAccountId },
        data: updateData,
      });

      return true;
    } catch (error) {
      await prisma.socialAccount.update({
        where: { id: socialAccountId },
        data: { status: 'EXPIRED' },
      });
      return false;
    }
  }

  /**
   * Publish a text + image/banner post to a messaging channel (Telegram/WhatsApp).
   * Uses the publishPost method of the publisher.
   */
  static async publishPostToChannel(
    postId: string,
    socialAccountId: string,
    text: string,
    imageUrl?: string,
    hashtags?: string[],
  ) {
    const socialAccount = await prisma.socialAccount.findUnique({
      where: { id: socialAccountId },
    });
    if (!socialAccount) throw new Error('Social account not found');

    let publisher: SocialPublisher;
    try {
      publisher = getPublisher(socialAccount.provider);
    } catch {
      console.warn(`No real publisher for ${socialAccount.provider}, using mock`);
      publisher = new MockPublisher();
    }

    // Check if publisher supports text+image posts
    if (!publisher.publishPost) {
      // Fallback: try publishVideo with text as caption if no publishPost
      throw new Error(`Publisher ${socialAccount.provider} does not support text posts`);
    }

    const accessToken = await decryptToken(socialAccount.accessTokenEncrypted);
    const metadata = socialAccount.metadata as any;
    const channelId = metadata?.channelId || socialAccount.providerAccountId || undefined;

    try {
      const result = await publisher.publishPost({
        text,
        imageUrl,
        hashtags,
        accessToken,
        channelId,
      });

      await prisma.post.update({
        where: { id: postId },
        data: {
          status: 'PUBLISHED',
          remotePostId: result.remotePostId,
          remoteUrl: result.remoteUrl,
          publishedAt: new Date(),
        },
      });

      return result;
    } catch (error: any) {
      await prisma.post.update({
        where: { id: postId },
        data: {
          status: 'FAILED',
          error: error.message || 'Unknown publishing error',
        },
      });
      throw error;
    }
  }
}

// Re-export for convenience
export { getPublisher, MockPublisher };

