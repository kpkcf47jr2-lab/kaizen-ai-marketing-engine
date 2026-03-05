/**
 * Payment Verification Processor
 * Verifies on-chain KairosCoin (BEP20) payments and credits user accounts.
 * Uses correct Prisma schema field names (see PROJECT-CONTEXT.md §4):
 * - CreditLedger.type uses LedgerType enum (PURCHASE, not CREDIT)
 * - CreditLedger has referenceId (not referenceType)
 * - OnchainPayment has confirmations (not blockNumber)
 */
import prisma from '../lib/prisma.js';
import { PAYMENT_CONFIRMATIONS_REQUIRED } from '@kaizen/shared';

interface PaymentJobData {
  paymentId: string;
  txHash: string;
  userId: string;
  expectedAmount: string; // wei string
  creditAmount: number;
}

export async function processPaymentJob(data: PaymentJobData) {
  const { paymentId, txHash, userId, creditAmount } = data;

  try {
    console.log(`  [payment:${paymentId}] Verifying tx ${txHash}...`);

    const payment = await prisma.onchainPayment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new Error(`Payment ${paymentId} not found`);

    if (payment.status === 'CONFIRMED') {
      console.log(`  [payment:${paymentId}] Already confirmed, skipping`);
      return { success: true, alreadyConfirmed: true };
    }

    // ── On-chain verification using ethers.js ────────────
    let confirmations = 0;
    let verified = false;

    const rpcUrl = process.env.WEB3_RPC_URL || 'https://bsc-dataseed1.binance.org/';

    try {
      // Fetch transaction receipt via JSON-RPC
      const receiptRes = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getTransactionReceipt',
          params: [txHash],
          id: 1,
        }),
      });
      const receiptData = await receiptRes.json();
      const receipt = receiptData.result;

      if (receipt && receipt.status === '0x1') {
        // Get current block number
        const blockRes = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_blockNumber',
            params: [],
            id: 2,
          }),
        });
        const blockData = await blockRes.json();
        const currentBlock = parseInt(blockData.result, 16);
        const txBlock = parseInt(receipt.blockNumber, 16);
        confirmations = currentBlock - txBlock;

        verified = confirmations >= PAYMENT_CONFIRMATIONS_REQUIRED;
      }
    } catch (rpcError) {
      console.warn(`  [payment:${paymentId}] RPC error, will retry:`, rpcError);
    }

    // Update confirmations count
    await prisma.onchainPayment.update({
      where: { id: paymentId },
      data: {
        confirmations,
        status: verified ? 'CONFIRMED' : 'CONFIRMING',
      },
    });

    if (verified) {
      // Update payment as confirmed
      await prisma.onchainPayment.update({
        where: { id: paymentId },
        data: {
          status: 'CONFIRMED',
          confirmedAt: new Date(),
          confirmations,
          creditsPurchased: creditAmount,
        },
      });

      // Credit user account using the ledger pattern
      const lastEntry = await prisma.creditLedger.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
      const currentBalance = lastEntry?.balanceAfter ?? 0;

      await prisma.creditLedger.create({
        data: {
          userId,
          type: 'PURCHASE',
          amount: creditAmount,
          balanceAfter: currentBalance + creditAmount,
          referenceId: paymentId,
          description: `KairosCoin payment confirmed: ${txHash.slice(0, 10)}...`,
        },
      });

      console.log(`  [payment:${paymentId}] ✅ Confirmed (${confirmations} blocks), +${creditAmount} credits`);
      return { success: true, creditsAdded: creditAmount, confirmations };
    } else {
      console.log(`  [payment:${paymentId}] ⏳ ${confirmations}/${PAYMENT_CONFIRMATIONS_REQUIRED} confirmations, will retry`);
      throw new Error('Payment not yet confirmed on-chain');
    }
  } catch (error) {
    if ((error as Error).message?.includes('not yet confirmed')) {
      throw error; // Let BullMQ retry with backoff
    }
    // Permanent failure
    console.error(`  [payment:${paymentId}] ❌ Permanent failure:`, error);
    await prisma.onchainPayment.update({
      where: { id: paymentId },
      data: { status: 'FAILED' },
    });
    throw error;
  }
}

