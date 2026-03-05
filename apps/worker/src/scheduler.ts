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

  // ── Campaign-Aware Content Scheduler (hourly checks) ────

  const CONTENT_INTERVAL_MS = 60 * 60 * 1000; // Check every hour

  async function contentTick() {
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const currentHour = now.getHours();

    try {
      console.log(`[scheduler] 🤖 Checking campaigns (${today} ${currentHour}:00)...`);

      // Find ACTIVE campaigns with brand profiles and social accounts
      const campaigns = await prisma.campaign.findMany({
        where: {
          status: 'ACTIVE',
          user: {
            brandProfile: { isNot: null },
            socialAccounts: { some: { status: 'ACTIVE' } },
          },
        },
        include: {
          user: {
            include: {
              brandProfile: true,
              creditLedger: {
                orderBy: { createdAt: 'desc' },
                take: 1,
              },
            },
          },
        },
      });

      let generated = 0;

      for (const campaign of campaigns) {
        const user = campaign.user;
        const publishHours: number[] = campaign.publishHours;

        // ── Check: Is this a publish hour for the campaign? ──
        // We generate content 1 hour BEFORE the publish hour so it's ready
        const isGenerationHour = publishHours.some(
          (h) => h - 1 === currentHour || h === currentHour,
        );
        if (!isGenerationHour) continue;

        // ── Check: Credit balance ──
        const balance = user.creditLedger[0]?.balanceAfter ?? 0;
        const tierKey = campaign.videoTier as string;
        const requiredCredits = tierKey === 'FREE' ? 0 : tierKey === 'ULTRA' ? 50 : 10;

        if (requiredCredits > 0 && balance < requiredCredits) {
          console.log(`[scheduler] ⚠️ ${user.email} — not enough credits (${balance} < ${requiredCredits}), skipping`);
          continue;
        }

        // ── Check: How many jobs already generated today? ──
        const jobsToday = await prisma.contentJob.count({
          where: {
            userId: user.id,
            createdAt: { gte: new Date(`${today}T00:00:00Z`) },
            status: {
              in: ['QUEUED', 'RUNNING', 'GENERATING_SCRIPT', 'GENERATING_VIDEO', 'SUCCESS'],
            },
          },
        });

        if (jobsToday >= campaign.frequency) {
          // Already reached daily limit
          continue;
        }

        // ── Create content job for this campaign ──
        const scheduledFor = new Date();
        const nextPublishHour = publishHours.find((h) => h >= currentHour) ?? publishHours[0];
        scheduledFor.setHours(nextPublishHour, 0, 0, 0);

        const contentJob = await prisma.contentJob.create({
          data: {
            userId: user.id,
            status: 'QUEUED',
            scheduledFor,
            maxRetries: MAX_JOB_RETRIES,
            videoTier: campaign.videoTier,
          },
        });

        await contentQueue.add(
          `campaign-${campaign.id}-${user.id}-${today}-${jobsToday + 1}`,
          {
            contentJobId: contentJob.id,
            userId: user.id,
            language: campaign.language || undefined,
          },
          {
            attempts: MAX_JOB_RETRIES,
            backoff: { type: 'exponential', delay: JOB_RETRY_DELAY_MS },
          },
        );

        generated++;
        console.log(
          `[scheduler] 📝 Queued content for ${user.email} (tier: ${campaign.videoTier}, ${jobsToday + 1}/${campaign.frequency} today)`,
        );
      }

      // ── Fallback: Users without campaigns (legacy behavior) ──
      const usersWithoutCampaign = await prisma.user.findMany({
        where: {
          brandProfile: { isNot: null },
          socialAccounts: { some: { status: 'ACTIVE' } },
          campaign: null, // No campaign configured yet
        },
        include: {
          brandProfile: true,
          creditLedger: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      const generateHour = Math.max(0, DEFAULT_PUBLISH_HOUR - 3);

      if (currentHour === generateHour) {
        for (const user of usersWithoutCampaign) {
          const balance = user.creditLedger[0]?.balanceAfter ?? 0;
          if (balance <= 0) continue;

          const existingJob = await prisma.contentJob.findFirst({
            where: {
              userId: user.id,
              createdAt: { gte: new Date(`${today}T00:00:00Z`) },
              status: {
                in: ['QUEUED', 'RUNNING', 'GENERATING_SCRIPT', 'GENERATING_VIDEO', 'SUCCESS'],
              },
            },
          });
          if (existingJob) continue;

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
          console.log(`[scheduler] 📝 Queued legacy content for ${user.email}`);
        }
      }

      if (generated > 0) {
        console.log(`[scheduler] ✅ Queued content for ${generated} users`);
      }
    } catch (error) {
      console.error('[scheduler] ❌ Content generation tick error:', error);
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
  console.log(`[scheduler] ⏰ Campaign content: checked every hour, respects campaign.publishHours`);
}

