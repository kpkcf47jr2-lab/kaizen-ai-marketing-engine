import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { brandProfileSchema } from '@kaizen/shared';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await prisma.brandProfile.findUnique({
      where: { userId: (session.user as any).id },
    });

    return NextResponse.json({ success: true, data: profile });
  } catch (error) {
    console.error('Brand GET error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = brandProfileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 },
      );
    }

    const userId = (session.user as any).id;

    const profile = await prisma.brandProfile.upsert({
      where: { userId },
      update: parsed.data,
      create: { userId, ...parsed.data },
    });

    return NextResponse.json({ success: true, data: profile });
  } catch (error) {
    console.error('Brand POST error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
