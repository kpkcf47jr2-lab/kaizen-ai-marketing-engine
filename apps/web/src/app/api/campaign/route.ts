/**
 * Campaign API — GET / PUT
 * Manages the user's campaign settings (1 campaign per user).
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// ─── GET: Load current campaign ──────────────────────────

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const userId = (session.user as any).id;

  const campaign = await prisma.campaign.findUnique({
    where: { userId },
  });

  return NextResponse.json({ campaign });
}

// ─── PUT: Create or update campaign ──────────────────────

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const userId = (session.user as any).id;
  const body = await req.json();

  // Validate fields
  const videoTier = (['FREE', 'PRO', 'ULTRA'] as const).includes(body.videoTier) ? body.videoTier : 'PRO';
  const frequency = [1, 2].includes(body.frequency) ? body.frequency : 1;
  const publishHours: number[] = Array.isArray(body.publishHours)
    ? body.publishHours.filter((h: number) => h >= 0 && h <= 23).slice(0, 4)
    : [9];
  const status = (['ACTIVE', 'PAUSED'] as const).includes(body.status) ? body.status : undefined;

  const campaign = await prisma.campaign.upsert({
    where: { userId },
    create: {
      userId,
      videoTier,
      frequency,
      publishHours,
      avatarId: body.avatarId || null,
      voiceId: body.voiceId || null,
      language: body.language || 'es',
      autoPublish: body.autoPublish !== false,
      status: status || 'ACTIVE',
    },
    update: {
      ...(videoTier && { videoTier }),
      ...(frequency && { frequency }),
      ...(publishHours.length > 0 && { publishHours }),
      ...(body.avatarId !== undefined && { avatarId: body.avatarId || null }),
      ...(body.voiceId !== undefined && { voiceId: body.voiceId || null }),
      ...(body.language && { language: body.language }),
      ...(body.autoPublish !== undefined && { autoPublish: body.autoPublish }),
      ...(status && { status }),
    },
  });

  return NextResponse.json({ campaign });
}
