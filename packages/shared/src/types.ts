// ─── Social Providers ────────────────────────────────────
export type SocialProvider = 'ELITE' | 'META_INSTAGRAM' | 'META_FACEBOOK' | 'YOUTUBE' | 'TIKTOK' | 'X_TWITTER';

export interface SocialTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scopes: string[];
}

// ─── Credits ─────────────────────────────────────────────
export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  priceKairosCoin: string; // human-readable amount
  priceWei: string;         // on-chain amount
  popular?: boolean;
}

// ─── Content Generation ──────────────────────────────────
export interface GeneratedScript {
  title: string;
  script: string;
  caption: string;
  hashtags: string[];
  cta: string;
  language: string;
}

export interface GeneratedVoice {
  url: string;
  durationMs: number;
  format: string;
}

export interface GeneratedVideo {
  url: string;
  durationMs: number;
  width: number;
  height: number;
  format: string;
  thumbnailUrl?: string;
}

export interface GeneratedThumbnail {
  url: string;
  width: number;
  height: number;
  format: string;
}

export interface ContentBundle {
  script: GeneratedScript;
  voice?: GeneratedVoice;
  video: GeneratedVideo;
  thumbnail?: GeneratedThumbnail;
}

// ─── Brand Profile ───────────────────────────────────────
export interface BrandConfig {
  brandName: string;
  niche?: string;
  language: string;
  tone?: string;
  masterPrompt: string;
  ctas: string[];
  links: string[];
  hashtagsDefault: string[];
  styleGuidelines?: string;
  products?: string;
  targetAudience?: string;
}

// ─── Wallet ──────────────────────────────────────────────
export interface WalletInfo {
  address: string;
  chainId: number;
}

// ─── Publish Result ──────────────────────────────────────
export interface PublishResult {
  success: boolean;
  remotePostId?: string;
  remoteUrl?: string;
  error?: string;
}

// ─── Job ─────────────────────────────────────────────────
export type JobStatus =
  | 'QUEUED'
  | 'RUNNING'
  | 'GENERATING_SCRIPT'
  | 'GENERATING_VOICE'
  | 'GENERATING_VIDEO'
  | 'PUBLISHING'
  | 'SUCCESS'
  | 'FAILED'
  | 'CANCELLED';

// ─── API Responses ───────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ─── User ────────────────────────────────────────────────
export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  image?: string;
  role: 'USER' | 'ADMIN';
  creditBalance: number;
  hasWallet: boolean;
  hasBrandProfile: boolean;
  connectedSocials: SocialProvider[];
  autoPostEnabled: boolean;
}
