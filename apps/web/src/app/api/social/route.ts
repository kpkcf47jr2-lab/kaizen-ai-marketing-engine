import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/social — List connected accounts
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const accounts = await prisma.socialAccount.findMany({
      where: { userId: (session.user as any).id },
      select: {
        id: true,
        provider: true,
        providerUsername: true,
        status: true,
        scopes: true,
        connectedAt: true,
        tokenExpiresAt: true,
      },
    });

    return NextResponse.json({ success: true, data: accounts });
  } catch (error) {
    console.error('Social GET error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/social — Disconnect an account
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get('id');
    if (!accountId) {
      return NextResponse.json({ success: false, error: 'Missing account id' }, { status: 400 });
    }

    await prisma.socialAccount.deleteMany({
      where: { id: accountId, userId: (session.user as any).id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Social DELETE error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
