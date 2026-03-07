/**
 * Mock Providers — For development and testing when API keys are not available.
 */

import type { LLMProvider, TTSProvider, VideoProvider, ThumbnailProvider, SocialPublisher } from './providers';
import type { GeneratedScript, GeneratedVoice, GeneratedVideo, GeneratedThumbnail, BrandConfig } from './types';
import { VIDEO_CONFIG } from './constants';

// ─── Mock LLM Provider ──────────────────────────────────

export class MockLLMProvider implements LLMProvider {
  readonly name = 'mock-llm';

  async generateScript(brand: BrandConfig): Promise<GeneratedScript> {
    return {
      title: `${brand.brandName} Daily Tip`,
      script: `Hey! Welcome back. Today I want to share a quick tip about ${brand.niche || 'business'}. Remember, consistency is key. Follow us for more daily tips and don't forget to like and share!`,
      caption: `🚀 Daily tip from ${brand.brandName}! Consistency is key in ${brand.niche || 'business'}.`,
      hashtags: ['#dailytip', '#marketing', '#growth', ...brand.hashtagsDefault],
      cta: brand.ctas[0] || 'Follow for more!',
      language: brand.language,
    };
  }

  async generateCaption(brand: BrandConfig, _context: string) {
    return { caption: `Check out ${brand.brandName}! 🔥`, hashtags: brand.hashtagsDefault };
  }
}

// ─── Mock TTS Provider ──────────────────────────────────

export class MockTTSProvider implements TTSProvider {
  readonly name = 'mock-tts';

  async listVoices() {
    return [
      { id: 'voice-1', name: 'Alex', language: 'en', gender: 'male' },
      { id: 'voice-2', name: 'Maria', language: 'es', gender: 'female' },
    ];
  }

  async synthesize(text: string): Promise<GeneratedVoice> {
    return {
      url: 'https://placeholder.kaizen.ai/audio/mock-voiceover.mp3',
      durationMs: Math.min(45000, Math.max(15000, text.length * 80)),
      format: 'mp3',
    };
  }
}

// ─── Mock Video Provider ─────────────────────────────────

export class MockVideoProvider implements VideoProvider {
  readonly name = 'mock-video';

  async generateAvatarVideo(): Promise<GeneratedVideo> {
    return {
      url: 'https://placeholder.kaizen.ai/video/mock-avatar.mp4',
      durationMs: 30000,
      width: VIDEO_CONFIG.width,
      height: VIDEO_CONFIG.height,
      format: 'mp4',
    };
  }

  async generateTemplateVideo(): Promise<GeneratedVideo> {
    return {
      url: 'https://placeholder.kaizen.ai/video/mock-template.mp4',
      durationMs: 30000,
      width: VIDEO_CONFIG.width,
      height: VIDEO_CONFIG.height,
      format: 'mp4',
    };
  }
}

// ─── Mock Thumbnail Provider ─────────────────────────────

export class MockThumbnailProvider implements ThumbnailProvider {
  readonly name = 'mock-thumbnail';

  async generateThumbnail(title: string, _brand: BrandConfig): Promise<GeneratedThumbnail> {
    return {
      url: `https://placeholder.kaizen.ai/thumbnails/mock-${encodeURIComponent(title.slice(0, 30))}.png`,
      width: 1024,
      height: 1792,
      format: 'png',
    };
  }
}

// ─── Mock Publisher ──────────────────────────────────────

export class MockPublisher implements SocialPublisher {
  readonly provider = 'MOCK';

  async publishVideo() {
    await new Promise((r) => setTimeout(r, 500));
    return {
      remotePostId: `mock_${Date.now()}`,
      remoteUrl: 'https://example.com/mock-post',
    };
  }

  async publishPost() {
    await new Promise((r) => setTimeout(r, 300));
    return {
      remotePostId: `mock_post_${Date.now()}`,
      remoteUrl: 'https://example.com/mock-article',
    };
  }

  async getMetrics() {
    return { views: 1234, likes: 89, comments: 12, shares: 5 };
  }

  async refreshToken(refreshToken: string) {
    return { accessToken: refreshToken, expiresAt: new Date(Date.now() + 86400000) };
  }
}
