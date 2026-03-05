/**
 * Cron Scheduler
 * Two responsibilities:
 * 1. Enqueue publishing jobs for posts that are due (every 15 min)
 * 2. Enqueue daily content generation for users with auto-post enabled (daily)
 */
import { Queue, type ConnectionOptions } from 'bullmq';
import prisma from './lib/prisma.js';
import { DEFAULT_PUBLISH_HOUR, MAX_JOB_RETRIES, JOB_RETRY_DELAY_MS } from '@kaizen/shared';

export function startScheduler(connection: ConnectionOptions) {
  const contentQueue = new Queue('content-generation', { connection });
  const publishQueue = new Queue('social-publishing', { connection });

  // ── Publish Scheduler (every 15 min) ───────────────────

  const PUBLISH_INTERVAL_MS = 15 * 60 * 1000;

  async function publishTick() {
    try {
      console.log('[scheduler] 🔍 Checking for scheduled posts...');

      // Find posts that are SCHEDULED and due for publishing
      const duePosts = await prisma.post.findMany({
        where: {
          status: 'SCHEDULED',
          scheduledFor: { lte: new Date() },
        },
        include: {
          socialAccount: true,
          asset: true,
          contentJob: true,
        },
        take: 50,
      });

      for (const post of duePosts) {
        if (!post.asset || !post.socialAccount) {
          console.warn(`[scheduler] ⚠️ Post ${post.id} missing asset or socialAccount, skipping`);
          continue;
        }

        await publishQueue.add(
          `publish-${post.id}`,
          {
            postId: post.id,
            contentJobId: post.contentJobId,
            socialAccountId: post.socialAccountId,
            assetId: post.assetId,
          },
          {
            attempts: MAX_JOB_RETRIES,
            backoff: { type: 'exponential', delay: JOB_RETRY_DELAY_MS },
          },
        );

        // Mark as PUBLISHING so we don't double-process
        await prisma.post.update({
          where: { id: post.id },
          data: { status: 'PUBLISHING' },
        });

        console.log(`[scheduler] 📤 Queued publish for post ${post.id} → ${post.provider}`);
      }

      if (duePosts.length > 0) {
        console.log(`[scheduler] ✅ Queued ${duePosts.length} posts for publishing`);
      }
    } catch (error) {
      console.error('[scheduler] ❌ Publish tick error:', error);
    }
  }

  // ── Content Generation Scheduler (daily) ───────────────

  const CONTENT_INTERVAL_MS = 60 * 60 * 1000; // Check every hour
  let lastContentRunDate = '';

  async function contentTick() {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Only run once per day
    if (lastContentRunDate === today) return;

    const currentHour = new Date().getHours();
    // Generate content a few hours before the default publish time
    // so it's ready when publish time comes
    const generateHour = Math.max(0, DEFAULT_PUBLISH_HOUR - 3);
    if (currentHour < generateHour) return;

    try {
      console.log(`[scheduler] 🤖 Running daily content generation for ${today}...`);
      lastContentRunDate = today;

      // Find users with active social accounts and brand profiles
      const eligibleUsers = await prisma.user.findMany({
        where: {
          brandProfile: { isNot: null },
          socialAccounts: { some: { status: 'ACTIVE' } },
        },
        include: {
          brandProfile: true,
          creditLedger: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      let generated = 0;

      for (const user of eligibleUsers) {
        // Check if user has enough credits
        const balance = user.creditLedger[0]?.balanceAfter ?? 0;
        if (balance <= 0) {
          console.log(`[scheduler] ⚠️ User ${user.email} has no credits, skipping`);
          continue;
        }

        // Check if content was already generated today
        const existingJob = await prisma.contentJob.findFirst({
          where: {
            userId: user.id,
            createdAt: { gte: new Date(`${today}T00:00:00Z`) },
            status: { in: ['QUEUED', 'RUNNING', 'GENERATING_SCRIPT', 'GENERATING_VOICE', 'GENERATING_VIDEO', 'SUCCESS'] },
          },
        });

        if (existingJob) {
          console.log(`[scheduler] ⏭️ User ${user.email} already has content for today`);
          continue;
        }

        // Create a content job
        const scheduledFor = new Date();
        scheduledFor.setHours(DEFAULT_PUBLISH_HOUR, 0, 0, 0);

        const contentJob = await prisma.contentJob.create({
          data: {
            userId: user.id,
            status: 'QUEUED',
            scheduledFor,
            maxRetries: MAX_JOB_RETRIES,
          },
        });

        await contentQueue.add(
          `daily-content-${user.id}-${today}`,
          {
            contentJobId: contentJob.id,
            userId: user.id,
          },
          {
            attempts: MAX_JOB_RETRIES,
            backoff: { type: 'exponential', delay: JOB_RETRY_DELAY_MS },
          },
        );

        generated++;
        console.log(`[scheduler] 📝 Queued content generation for ${user.email}`);
      }

      if (generated > 0) {
        console.log(`[scheduler] ✅ Queued daily content for ${generated} users`);
      } else {
        console.log('[scheduler] ℹ️ No eligible users for daily content generation');
      }
    } catch (error) {
      console.error('[scheduler] ❌ Content generation tick error:', error);
      // Reset so it retries next hour
      lastContentRunDate = '';
    }
  }

  // ── Start schedulers ───────────────────────────────────

  // Initial ticks
  publishTick();
  contentTick();

  // Recurring intervals
  setInterval(publishTick, PUBLISH_INTERVAL_MS);
  setInterval(contentTick, CONTENT_INTERVAL_MS);

  console.log(`[scheduler] ⏰ Publish check: every ${PUBLISH_INTERVAL_MS / 60000} min`);
  console.log(`[scheduler] ⏰ Daily content generation: checked every hour (runs at ~${DEFAULT_PUBLISH_HOUR - 3}:00)`);
}

