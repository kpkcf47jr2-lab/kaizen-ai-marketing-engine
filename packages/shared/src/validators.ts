/**
 * Zod validators for API inputs
 */

import { z } from 'zod';

// ─── Auth ────────────────────────────────────────────────

export const registerSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1).max(100).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// ─── Brand Profile ───────────────────────────────────────

export const brandProfileSchema = z.object({
  brandName: z.string().min(1).max(200),
  niche: z.string().max(200).optional(),
  language: z.enum(['en', 'es']).default('en'),
  tone: z.string().max(50).optional(),
  masterPrompt: z.string().min(10).max(5000),
  ctas: z.array(z.string().max(200)).max(10).default([]),
  links: z.array(z.string().url()).max(10).default([]),
  hashtagsDefault: z.array(z.string().max(50)).max(30).default([]),
  styleGuidelines: z.string().max(5000).optional(),
  products: z.string().max(5000).optional(),
  targetAudience: z.string().max(500).optional(),
});

// ─── Wallet ──────────────────────────────────────────────

export const connectWalletSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid wallet address'),
  chainId: z.number().int().positive(),
});

// ─── Payment ─────────────────────────────────────────────

export const submitPaymentSchema = z.object({
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction hash'),
  packageId: z.string().min(1),
  chainId: z.number().int().positive(),
  fromAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
});

// ─── Auto-post Config ────────────────────────────────────

export const autoPostConfigSchema = z.object({
  enabled: z.boolean(),
  publishHour: z.number().int().min(0).max(23).default(9),
  frequency: z.enum(['daily', 'every_other_day', 'weekdays']).default('daily'),
  providers: z.array(z.enum([
    'ELITE', 'META_INSTAGRAM', 'META_FACEBOOK', 'YOUTUBE', 'TIKTOK', 'X_TWITTER',
  ])).min(1),
});

// ─── Content Override ────────────────────────────────────

export const generateContentSchema = z.object({
  topic: z.string().max(500).optional(),
  providers: z.array(z.enum([
    'ELITE', 'META_INSTAGRAM', 'META_FACEBOOK', 'YOUTUBE', 'TIKTOK', 'X_TWITTER',
  ])).optional(),
  scheduledFor: z.string().datetime().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type BrandProfileInput = z.infer<typeof brandProfileSchema>;
export type ConnectWalletInput = z.infer<typeof connectWalletSchema>;
export type SubmitPaymentInput = z.infer<typeof submitPaymentSchema>;
export type AutoPostConfigInput = z.infer<typeof autoPostConfigSchema>;
export type GenerateContentInput = z.infer<typeof generateContentSchema>;
