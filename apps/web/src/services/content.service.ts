/**
 * Content Service — Orchestrates AI content generation (script, voice, video, thumbnail).
 * Uses provider interfaces from @kaizen/shared so implementations can be swapped.
 */

import type {
  LLMProvider,
  TTSProvider,
  VideoProvider,
  ThumbnailProvider,
  BrandConfig,
  ContentBundle,
} from '@kaizen/shared';
import {
  OpenAILLMProvider,
  ElevenLabsTTSProvider,
  DALLEThumbnailProvider,
  MockLLMProvider,
  MockTTSProvider,
  MockVideoProvider,
  MockThumbnailProvider,
} from '@kaizen/shared';
import { storage } from '@/lib/storage';

// ─── Storage upload helper for providers ─────────────────

async function storageUpload(key: string, data: Uint8Array | ArrayBuffer, contentType: string): Promise<string> {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  const result = await storage.upload({ key, body: bytes, contentType });
  return result.url;
}

// ─── Content Orchestrator ────────────────────────────────

export class ContentService {
  private llm: LLMProvider;
  private tts: TTSProvider;
  private video: VideoProvider;
  private thumbnail: ThumbnailProvider;

  constructor(
    llm?: LLMProvider,
    tts?: TTSProvider,
    video?: VideoProvider,
    thumbnail?: ThumbnailProvider,
  ) {
    this.llm = llm || (process.env.OPENAI_API_KEY ? new OpenAILLMProvider() : new MockLLMProvider());
    this.tts = tts || (process.env.ELEVENLABS_API_KEY
      ? new ElevenLabsTTSProvider(undefined, storageUpload)
      : new MockTTSProvider());
    this.video = video || new MockVideoProvider();
    this.thumbnail = thumbnail || (process.env.OPENAI_API_KEY
      ? new DALLEThumbnailProvider(undefined, storageUpload)
      : new MockThumbnailProvider());
  }

  /** Full content generation pipeline: script → voice → video → thumbnail */
  async generateContent(
    brand: BrandConfig,
    options?: { topic?: string; previousTopics?: string[] },
  ): Promise<ContentBundle> {
    // Step 1: Generate script via LLM
    const script = await this.llm.generateScript(brand, options);

    // Step 2: Generate voiceover from script text
    const voice = await this.tts.synthesize(script.script, { language: script.language });

    // Step 3: Generate video
    let video;
    try {
      video = await this.video.generateAvatarVideo(script.script, voice.url);
    } catch {
      // Fallback to template video
      video = await this.video.generateTemplateVideo(script.script, voice.url);
    }

    // Step 4: Generate thumbnail
    let thumbnail;
    try {
      thumbnail = await this.thumbnail.generateThumbnail(script.title, brand);
    } catch (err) {
      console.warn('Thumbnail generation failed, skipping:', err);
    }

    return { script, voice, video, thumbnail };
  }

  /** Generate only a script (useful for preview/approval workflows) */
  async generateScriptOnly(
    brand: BrandConfig,
    options?: { topic?: string; previousTopics?: string[] },
  ) {
    return this.llm.generateScript(brand, options);
  }

  /** Get available TTS voices */
  async listVoices(language?: string) {
    return this.tts.listVoices(language);
  }
}

// Re-export provider classes for convenience
export {
  OpenAILLMProvider,
  ElevenLabsTTSProvider,
  DALLEThumbnailProvider,
  MockLLMProvider,
  MockTTSProvider,
  MockVideoProvider,
  MockThumbnailProvider,
};

