import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import redis from '@/lib/redis';

export const dynamic = 'force-dynamic';

/**
 * Health check endpoint for Render / load balancers.
 * Verifies DB and Redis connectivity.
 */
export async function GET() {
  const checks: Record<string, 'ok' | 'fail'> = { db: 'fail', redis: 'fail' };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.db = 'ok';
  } catch { /* db down */ }

  try {
    await redis.ping();
    checks.redis = 'ok';
  } catch { /* redis down */ }

  const healthy = checks.db === 'ok' && checks.redis === 'ok';

  return NextResponse.json(
    {
      status: healthy ? 'ok' : 'degraded',
      service: 'kaizen-web',
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 },
  );
}
