/**
 * AI Provider Interfaces — Abstract layer so providers can be swapped without touching core logic.
 */

import type { GeneratedScript, GeneratedVideo, GeneratedVoice, GeneratedThumbnail, BrandConfig } from './types';

// ─── Shared utility type ─────────────────────────────────

/** Upload function that providers can use to persist generated files to storage */
export type StorageUploadFn = (
  key: string,
  data: Uint8Array | ArrayBuffer,
  contentType: string,
) => Promise<string>; // returns public URL

// ─── LLM Provider ────────────────────────────────────────

export interface LLMProvider {
  readonly name: string;

  /** Generate a video script + caption based on brand config */
  generateScript(brand: BrandConfig, options?: {
    topic?: string;
    previousTopics?: string[];
    language?: string;
  }): Promise<GeneratedScript>;

  /** Generate just a caption (for repurposing) */
  generateCaption(brand: BrandConfig, context: string): Promise<{ caption: string; hashtags: string[] }>;
}

// ─── TTS Provider ────────────────────────────────────────

export interface TTSProvider {
  readonly name: string;

  /** List available voices */
  listVoices(language?: string): Promise<Array<{ id: string; name: string; language: string; gender: string }>>;

  /** Convert text to speech, returns URL to audio file */
  synthesize(text: string, options?: {
    voiceId?: string;
    language?: string;
    speed?: number;
  }): Promise<GeneratedVoice>;
}

// ─── Video Provider ──────────────────────────────────────

export interface VideoProvider {
  readonly name: string;

  /** Generate avatar-style video (HeyGen-like) */
  generateAvatarVideo(script: string, audioUrl: string, options?: {
    avatarId?: string;
    backgroundUrl?: string;
    width?: number;
    height?: number;
  }): Promise<GeneratedVideo>;

  /** Generate template video (B-roll + text + voice fallback) */
  generateTemplateVideo(script: string, audioUrl?: string, options?: {
    templateId?: string;
    images?: string[];
    brandColor?: string;
    width?: number;
    height?: number;
  }): Promise<GeneratedVideo>;
}

// ─── Thumbnail Provider ──────────────────────────────────

export interface ThumbnailProvider {
  readonly name: string;

  /** Generate a thumbnail image for a video */
  generateThumbnail(title: string, brand: BrandConfig, options?: {
    style?: string;
    width?: number;
    height?: number;
  }): Promise<GeneratedThumbnail>;
}

// ─── Social Publishing Provider ──────────────────────────

export interface SocialPublisher {
  readonly provider: string;

  /** Publish a video post */
  publishVideo(params: {
    videoUrl: string;
    caption: string;
    hashtags?: string[];
    accessToken: string;
    accountId?: string;
  }): Promise<{ remotePostId: string; remoteUrl?: string }>;

  /** Get basic metrics for a post */
  getMetrics(params: {
    remotePostId: string;
    accessToken: string;
  }): Promise<{ views?: number; likes?: number; comments?: number; shares?: number }>;

  /** Refresh an expired token */
  refreshToken(refreshToken: string): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
  }>;
}

// ─── Storage Provider ────────────────────────────────────

export interface StorageProvider {
  /** Upload a file and return its public URL */
  upload(params: {
    key: string;
    body: ArrayBuffer | ReadableStream | Uint8Array;
    contentType: string;
  }): Promise<{ url: string; key: string }>;

  /** Get a signed URL for temporary access */
  getSignedUrl(key: string, expiresIn?: number): Promise<string>;

  /** Delete a file */
  delete(key: string): Promise<void>;
}
