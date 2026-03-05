/**
 * POST /api/content/generate — Trigger content generation for the authenticated user.
 * Creates a ContentJob and enqueues it in BullMQ for async processing.
 *
 * Body (optional): { topic?: string, providers?: SocialProvider[], scheduledFor?: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import redis from '@/lib/redis';
import { Queue } from 'bullmq';
import { generateContentSchema, CREDITS_PER_VIDEO, MAX_JOB_RETRIES, JOB_RETRY_DELAY_MS } from '@kaizen/shared';

const contentQueue = new Queue('content-generation', { connection: redis as any });

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id as string;

    // Validate input
    const body = await req.json().catch(() => ({}));
    const parsed = generateContentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    // Check user has a brand profile
    const brandProfile = await prisma.brandProfile.findUnique({ where: { userId } });
    if (!brandProfile) {
      return NextResponse.json(
        { success: false, error: 'Brand profile required. Set up your brand first.' },
        { status: 400 },
      );
    }

    // Check user has enough credits
    const lastEntry = await prisma.creditLedger.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    const balance = lastEntry?.balanceAfter ?? 0;

    if (balance < CREDITS_PER_VIDEO) {
      return NextResponse.json(
        { success: false, error: `Insufficient credits. Need ${CREDITS_PER_VIDEO}, have ${balance}.` },
        { status: 402 },
      );
    }

    // Check user has at least one connected social account
    const socialAccounts = await prisma.socialAccount.findMany({
      where: { userId, status: 'ACTIVE' },
    });

    if (socialAccounts.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No connected social accounts. Connect at least one platform.' },
        { status: 400 },
      );
    }

    // Determine scheduledFor
    const scheduledFor = parsed.data.scheduledFor
      ? new Date(parsed.data.scheduledFor)
      : new Date(); // Immediate if not specified

    // Create ContentJob
    const contentJob = await prisma.contentJob.create({
      data: {
        userId,
        status: 'QUEUED',
        scheduledFor,
        maxRetries: MAX_JOB_RETRIES,
        metadata: {
          topic: parsed.data.topic || null,
          requestedProviders: parsed.data.providers || null,
        },
      },
    });

    // Enqueue the job
    await contentQueue.add(
      `content-${contentJob.id}`,
      {
        contentJobId: contentJob.id,
        userId,
        topic: parsed.data.topic,
        language: brandProfile.language,
      },
      {
        attempts: MAX_JOB_RETRIES,
        backoff: { type: 'exponential', delay: JOB_RETRY_DELAY_MS },
      },
    );

    return NextResponse.json({
      success: true,
      data: {
        jobId: contentJob.id,
        status: 'QUEUED',
        scheduledFor: scheduledFor.toISOString(),
        message: 'Content generation started. Check dashboard for progress.',
      },
    });
  } catch (error: any) {
    console.error('[API] Content generation error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// GET /api/content/generate — Get status of user's content jobs
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id as string;
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);
    const status = searchParams.get('status');

    const where: any = { userId };
    if (status) where.status = status;

    const jobs = await prisma.contentJob.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        assets: {
          select: { id: true, type: true, url: true, filename: true },
        },
        posts: {
          select: {
            id: true,
            provider: true,
            status: true,
            remoteUrl: true,
            publishedAt: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: jobs });
  } catch (error: any) {
    console.error('[API] Content jobs fetch error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 },
    );
  }
}
