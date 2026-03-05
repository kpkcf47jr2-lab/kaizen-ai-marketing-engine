/**
 * Credits Service — Manages credit ledger, balance, spend, and purchase.
 */

import prisma from '@/lib/prisma';
import type { LedgerType } from '@prisma/client';

export class CreditsService {
  /**
   * Get current credit balance for a user.
   */
  static async getBalance(userId: string): Promise<number> {
    const lastEntry = await prisma.creditLedger.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return lastEntry?.balanceAfter ?? 0;
  }

  /**
   * Add credits (purchase or bonus).
   */
  static async addCredits(
    userId: string,
    amount: number,
    type: LedgerType,
    referenceId?: string,
    description?: string,
  ): Promise<number> {
    return prisma.$transaction(async (tx) => {
      const lastEntry = await tx.creditLedger.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
      const currentBalance = lastEntry?.balanceAfter ?? 0;
      const newBalance = currentBalance + amount;

      await tx.creditLedger.create({
        data: {
          userId,
          type,
          amount,
          balanceAfter: newBalance,
          referenceId,
          description,
        },
      });

      return newBalance;
    }, { isolationLevel: 'Serializable' });
  }

  /**
   * Spend credits. Returns true if successful, false if insufficient balance.
   */
  static async spendCredits(
    userId: string,
    amount: number,
    referenceId?: string,
    description?: string,
  ): Promise<{ success: boolean; balance: number }> {
    return prisma.$transaction(async (tx) => {
      const lastEntry = await tx.creditLedger.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
      const currentBalance = lastEntry?.balanceAfter ?? 0;

      if (currentBalance < amount) {
        return { success: false, balance: currentBalance };
      }

      const newBalance = currentBalance - amount;

      await tx.creditLedger.create({
        data: {
          userId,
          type: 'SPEND',
          amount: -amount,
          balanceAfter: newBalance,
          referenceId,
          description,
        },
      });

      return { success: true, balance: newBalance };
    }, { isolationLevel: 'Serializable' });
  }

  /**
   * Get credit history for a user.
   */
  static async getHistory(userId: string, limit = 50) {
    return prisma.creditLedger.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
