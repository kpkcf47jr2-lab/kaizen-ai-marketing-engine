/**
 * Wallet Service — On-chain payment verification for KairosCoin (BEP20).
 */

import { ethers } from 'ethers';
import prisma from '@/lib/prisma';
import { CreditsService } from './credits.service';
import { CREDIT_PACKAGES, PAYMENT_CONFIRMATIONS_REQUIRED } from '@kaizen/shared';

// Minimal ERC20 ABI for Transfer event
const ERC20_ABI = [
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

function getProvider() {
  const rpcUrl = process.env.NODE_ENV === 'production'
    ? process.env.WEB3_RPC_URL
    : process.env.WEB3_RPC_URL_TESTNET || process.env.WEB3_RPC_URL;
  return new ethers.JsonRpcProvider(rpcUrl || 'https://bsc-dataseed1.binance.org/');
}

export class WalletService {
  /**
   * Connect wallet — save address to user profile.
   */
  static async connectWallet(userId: string, address: string, chainId: number) {
    return prisma.wallet.upsert({
      where: { userId },
      update: { address: address.toLowerCase(), chainId },
      create: { userId, address: address.toLowerCase(), chainId },
    });
  }

  /**
   * Submit a payment tx for verification.
   */
  static async submitPayment(
    userId: string,
    txHash: string,
    packageId: string,
    chainId: number,
    fromAddress: string,
  ) {
    const pkg = CREDIT_PACKAGES.find((p) => p.id === packageId);
    if (!pkg) throw new Error('Invalid package');

    const existing = await prisma.onchainPayment.findUnique({ where: { txHash } });
    if (existing) throw new Error('Transaction already submitted');

    const payment = await prisma.onchainPayment.create({
      data: {
        userId,
        txHash,
        chainId,
        fromAddress: fromAddress.toLowerCase(),
        toAddress: (process.env.PAYMENT_RECEIVER_ADDRESS || '').toLowerCase(),
        tokenAddress: (process.env.KAIROSCOIN_TOKEN_ADDRESS || '').toLowerCase(),
        amount: pkg.priceWei,
        amountDisplay: pkg.priceKairosCoin,
        creditsPurchased: pkg.credits,
        status: 'PENDING',
      },
    });

    // Kick off async verification (in production this would be a BullMQ job)
    this.verifyPayment(payment.id).catch(console.error);

    return payment;
  }

  /**
   * Verify an on-chain payment.
   */
  static async verifyPayment(paymentId: string) {
    const payment = await prisma.onchainPayment.findUnique({ where: { id: paymentId } });
    if (!payment || payment.status === 'CONFIRMED') return;

    const provider = getProvider();

    try {
      const receipt = await provider.getTransactionReceipt(payment.txHash);
      if (!receipt) {
        // TX not mined yet
        return;
      }

      const currentBlock = await provider.getBlockNumber();
      const confirmations = currentBlock - receipt.blockNumber;

      await prisma.onchainPayment.update({
        where: { id: paymentId },
        data: {
          confirmations,
          status: confirmations >= PAYMENT_CONFIRMATIONS_REQUIRED ? 'CONFIRMED' : 'CONFIRMING',
        },
      });

      if (confirmations >= PAYMENT_CONFIRMATIONS_REQUIRED) {
        // Verify it's a valid ERC20 transfer to our address
        const tokenContract = new ethers.Contract(
          payment.tokenAddress,
          ERC20_ABI,
          provider,
        );

        const transferEvents = receipt.logs
          .filter((log) => log.address.toLowerCase() === payment.tokenAddress.toLowerCase())
          .map((log) => {
            try {
              return tokenContract.interface.parseLog({ topics: log.topics as string[], data: log.data });
            } catch {
              return null;
            }
          })
          .filter(Boolean);

        const validTransfer = transferEvents.some(
          (event) =>
            event &&
            event.args.from.toLowerCase() === payment.fromAddress &&
            event.args.to.toLowerCase() === payment.toAddress &&
            event.args.value.toString() === payment.amount,
        );

        if (validTransfer) {
          await prisma.onchainPayment.update({
            where: { id: paymentId },
            data: { status: 'CONFIRMED', confirmedAt: new Date() },
          });

          // Credit the user
          if (payment.creditsPurchased) {
            await CreditsService.addCredits(
              payment.userId,
              payment.creditsPurchased,
              'PURCHASE',
              payment.id,
              `Purchased ${payment.creditsPurchased} credits with ${payment.amountDisplay} KairosCoin`,
            );
          }
        } else {
          await prisma.onchainPayment.update({
            where: { id: paymentId },
            data: { status: 'FAILED' },
          });
        }
      }
    } catch (error) {
      console.error('Payment verification error:', error);
    }
  }

  /**
   * Get user's wallet info.
   */
  static async getWallet(userId: string) {
    return prisma.wallet.findUnique({ where: { userId } });
  }

  /**
   * Get payment history.
   */
  static async getPayments(userId: string, limit = 20) {
    return prisma.onchainPayment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
