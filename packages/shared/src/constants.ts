// ─── App Constants ───────────────────────────────────────

export const APP_NAME = 'Kaizen AI Marketing';
export const APP_VERSION = '0.1.0';

// ─── Credits ─────────────────────────────────────────────
export const CREDITS_PER_VIDEO = 10;

export const CREDIT_PACKAGES = [
  { id: 'starter', name: 'Starter', credits: 100, priceKairosCoin: '50', priceWei: '50000000000000000000', popular: false },
  { id: 'growth', name: 'Growth', credits: 500, priceKairosCoin: '200', priceWei: '200000000000000000000', popular: true },
  { id: 'pro', name: 'Pro', credits: 2000, priceKairosCoin: '700', priceWei: '700000000000000000000', popular: false },
  { id: 'enterprise', name: 'Enterprise', credits: 10000, priceKairosCoin: '3000', priceWei: '3000000000000000000000', popular: false },
] as const;

// ─── Social Providers Config ─────────────────────────────
export const SOCIAL_PROVIDERS = {
  META_INSTAGRAM: {
    name: 'Instagram',
    icon: 'instagram',
    color: '#E4405F',
    scopes: ['instagram_basic', 'instagram_content_publish', 'pages_show_list'],
  },
  META_FACEBOOK: {
    name: 'Facebook',
    icon: 'facebook',
    color: '#1877F2',
    scopes: ['pages_manage_posts', 'pages_read_engagement', 'pages_show_list'],
  },
  YOUTUBE: {
    name: 'YouTube',
    icon: 'youtube',
    color: '#FF0000',
    scopes: ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube.readonly'],
  },
  TIKTOK: {
    name: 'TikTok',
    icon: 'tiktok',
    color: '#000000',
    scopes: ['video.upload', 'video.list'],
  },
  X_TWITTER: {
    name: 'X (Twitter)',
    icon: 'twitter',
    color: '#000000',
    scopes: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'],
  },
} as const;

// ─── Video Config ────────────────────────────────────────
export const VIDEO_CONFIG = {
  width: 1080,
  height: 1920,
  aspectRatio: '9:16',
  minDuration: 15_000,  // ms
  maxDuration: 45_000,  // ms
  fps: 30,
  format: 'mp4',
} as const;

// ─── Supported Languages ─────────────────────────────────
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
] as const;

// ─── Tone Options ────────────────────────────────────────
export const TONE_OPTIONS = [
  'professional',
  'casual',
  'energetic',
  'inspirational',
  'educational',
  'humorous',
  'luxurious',
  'friendly',
] as const;

// ─── Blockchain ──────────────────────────────────────────
export const BSC_MAINNET_CHAIN_ID = 56;
export const BSC_TESTNET_CHAIN_ID = 97;
export const PAYMENT_CONFIRMATIONS_REQUIRED = 5;

// ─── Scheduler ───────────────────────────────────────────
export const DEFAULT_PUBLISH_HOUR = 9; // 9 AM user-local
export const MAX_JOB_RETRIES = 3;
export const JOB_RETRY_DELAY_MS = 60_000; // 1 min base delay
