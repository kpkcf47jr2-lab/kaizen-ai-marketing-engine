import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { CreditsService } from '@/services/credits.service';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const [balance, history] = await Promise.all([
      CreditsService.getBalance(userId),
      CreditsService.getHistory(userId),
    ]);

    return NextResponse.json({ success: true, data: { balance, history } });
  } catch (error) {
    console.error('Credits GET error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
