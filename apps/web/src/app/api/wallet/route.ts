import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { WalletService } from '@/services/wallet.service';
import { connectWalletSchema, submitPaymentSchema } from '@kaizen/shared';
import { rateLimit } from '@/lib/rate-limit';

// GET /api/wallet — Get wallet info + payment history
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const [wallet, payments] = await Promise.all([
      WalletService.getWallet(userId),
      WalletService.getPayments(userId),
    ]);

    return NextResponse.json({ success: true, data: { wallet, payments } });
  } catch (error) {
    console.error('Wallet GET error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/wallet — Connect wallet or submit payment
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit: 10 payment attempts per user per minute
    const userId = (session.user as any).id;
    const body = await req.json();
    const { action } = body;

    if (action === 'pay') {
      const rl = await rateLimit(`pay:${userId}`, 10, 60);
      if (!rl.allowed) {
        return NextResponse.json(
          { success: false, error: 'Too many payment attempts. Please wait.' },
          { status: 429 },
        );
      }
    }

    if (action === 'connect') {
      const parsed = connectWalletSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 });
      }
      const wallet = await WalletService.connectWallet(userId, parsed.data.address, parsed.data.chainId);
      return NextResponse.json({ success: true, data: wallet });
    }

    if (action === 'pay') {
      const parsed = submitPaymentSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json({ success: false, error: parsed.error.errors[0].message }, { status: 400 });
      }
      const payment = await WalletService.submitPayment(
        userId,
        parsed.data.txHash,
        parsed.data.packageId,
        parsed.data.chainId,
        parsed.data.fromAddress,
      );
      return NextResponse.json({ success: true, data: payment });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Wallet POST error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
