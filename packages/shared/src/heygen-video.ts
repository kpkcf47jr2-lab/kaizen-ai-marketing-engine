/**
 * HeyGen Video Provider — Real implementation using HeyGen API.
 * Generates avatar videos with AI voice (no separate TTS needed).
 *
 * API Docs: https://docs.heygen.com/reference
 * Pricing (pay-as-you-go):
 *   - Video Agent:      $0.0333/sec (~$1.00 for 30s)
 *   - Public Avatar III: $0.0167/sec (~$0.50 for 30s)
 *   - Public Avatar IV:  $0.10/sec  (~$3.00 for 30s) — ultra-realistic
 */

import type { VideoProvider } from './providers';
import type { GeneratedVideo } from './types';
import { VIDEO_CONFIG } from './constants';

/** Quality tier determines avatar engine and resolution */
export type VideoQualityTier = 'free' | 'pro' | 'ultra';

interface HeyGenConfig {
  apiKey: string;
  /** Default avatar ID to use (from HeyGen's library) */
  defaultAvatarId?: string;
  /** Default voice ID (HeyGen has 1000+ voices) */
  defaultVoiceId?: string;
  /** Quality tier — determines avatar engine version */
  tier?: VideoQualityTier;
}

/** Map tier to cost per second (USD) for internal tracking */
export const HEYGEN_COST_PER_SEC: Record<VideoQualityTier, number> = {
  free: 0.0167,   // Avatar III (720p, watermark via free plan)
  pro: 0.0167,    // Avatar III (1080p, no watermark)
  ultra: 0.10,    // Avatar IV (1080p, ultra-realistic)
};

/** Credits (KRC) cost per video by tier */
export const CREDITS_PER_VIDEO_BY_TIER: Record<VideoQualityTier, number> = {
  free: 0,       // Free tier — watermarked
  pro: 10,       // ~$0.50 cost → charge 10 KRC credits
  ultra: 50,     // ~$3.00 cost → charge 50 KRC credits
};

export class HeyGenVideoProvider implements VideoProvider {
  readonly name = 'heygen';
  private apiKey: string;
  private defaultAvatarId: string;
  private defaultVoiceId: string;
  private tier: VideoQualityTier;

  constructor(config?: Partial<HeyGenConfig>) {
    this.apiKey = config?.apiKey || process.env.HEYGEN_API_KEY || '';
    this.defaultAvatarId = config?.defaultAvatarId || process.env.HEYGEN_AVATAR_ID || 'Angela-inTshirt-20220820';
    this.defaultVoiceId = config?.defaultVoiceId || process.env.HEYGEN_VOICE_ID || '';
    this.tier = config?.tier || 'pro';
  }

  /**
   * Generate a video using HeyGen's Video Agent API.
   * This is the simplest path: one prompt → one video (includes voice).
   * No separate TTS needed — HeyGen handles everything.
   */
  async generateFromPrompt(prompt: string, options?: {
    avatarId?: string;
    voiceId?: string;
    tier?: VideoQualityTier;
    width?: number;
    height?: number;
  }): Promise<GeneratedVideo> {
    const tier = options?.tier || this.tier;

    // Video Agent: prompt → video (fastest path)
    const createRes = await fetch('https://api.heygen.com/v1/video_agent/generate', {
      method: 'POST',
      headers: {
        'X-API-KEY': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
      }),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      throw new Error(`HeyGen Video Agent error (${createRes.status}): ${errText}`);
    }

    const createData = await createRes.json();
    const videoId = createData.data?.video_id;
    if (!videoId) throw new Error('HeyGen did not return a video_id');

    // Poll for completion
    return this.pollVideoStatus(videoId);
  }

  /**
   * Generate avatar-style video using HeyGen's Create Video API.
   * Script is spoken by the avatar with lip-sync.
   */
  async generateAvatarVideo(script: string, _audioUrl: string, options?: {
    avatarId?: string;
    backgroundUrl?: string;
    width?: number;
    height?: number;
  }): Promise<GeneratedVideo> {
    const avatarId = options?.avatarId || this.defaultAvatarId;
    const width = options?.width || VIDEO_CONFIG.width;
    const height = options?.height || VIDEO_CONFIG.height;
    const useAvatarIV = this.tier === 'ultra';

    const body: Record<string, unknown> = {
      video_inputs: [
        {
          character: {
            type: 'avatar',
            avatar_id: avatarId,
            avatar_style: 'normal',
          },
          voice: {
            type: 'text',
            input_text: script,
            ...(this.defaultVoiceId ? { voice_id: this.defaultVoiceId } : {}),
          },
          ...(options?.backgroundUrl ? {
            background: {
              type: 'image',
              url: options.backgroundUrl,
            },
          } : {}),
        },
      ],
      dimension: { width, height },
      ...(useAvatarIV ? { use_avatar_iv_model: true } : {}),
    };

    const createRes = await fetch('https://api.heygen.com/v2/video/generate', {
      method: 'POST',
      headers: {
        'X-API-KEY': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      throw new Error(`HeyGen Create Video error (${createRes.status}): ${errText}`);
    }

    const createData = await createRes.json();
    const videoId = createData.data?.video_id;
    if (!videoId) throw new Error('HeyGen did not return a video_id');

    return this.pollVideoStatus(videoId);
  }

  /**
   * Fallback: generate template-based video.
   * Uses HeyGen's Video Agent with the script as prompt.
   */
  async generateTemplateVideo(script: string, _audioUrl?: string, options?: {
    templateId?: string;
    images?: string[];
    brandColor?: string;
    width?: number;
    height?: number;
  }): Promise<GeneratedVideo> {
    // Use Video Agent as template fallback
    return this.generateFromPrompt(
      `Create a short marketing video. Script: "${script}". Make it visually engaging with motion graphics.`,
      { width: options?.width, height: options?.height },
    );
  }

  /**
   * List available avatars from HeyGen's library.
   */
  async listAvatars(): Promise<Array<{ id: string; name: string; preview?: string }>> {
    const res = await fetch('https://api.heygen.com/v2/avatars', {
      headers: { 'X-API-KEY': this.apiKey },
    });

    if (!res.ok) throw new Error(`HeyGen List Avatars error (${res.status})`);

    const data = await res.json();
    const avatars = data.data?.avatars || [];
    return avatars.map((a: { avatar_id: string; avatar_name: string; preview_image_url?: string }) => ({
      id: a.avatar_id,
      name: a.avatar_name,
      preview: a.preview_image_url,
    }));
  }

  /**
   * List available voices from HeyGen's library.
   */
  async listVoices(language?: string): Promise<Array<{ id: string; name: string; language: string; gender: string }>> {
    const res = await fetch('https://api.heygen.com/v2/voices', {
      headers: { 'X-API-KEY': this.apiKey },
    });

    if (!res.ok) throw new Error(`HeyGen List Voices error (${res.status})`);

    const data = await res.json();
    const voices = data.data?.voices || [];
    const filtered = language
      ? voices.filter((v: { language: string }) => v.language?.startsWith(language))
      : voices;
    return filtered.map((v: { voice_id: string; name: string; language: string; gender: string }) => ({
      id: v.voice_id,
      name: v.name,
      language: v.language || 'en',
      gender: v.gender || 'unknown',
    }));
  }

  /**
   * Check remaining API balance.
   */
  async getBalance(): Promise<{ remaining: number }> {
    const res = await fetch('https://api.heygen.com/v2/user/remaining_quota', {
      headers: { 'X-API-KEY': this.apiKey },
    });
    if (!res.ok) throw new Error(`HeyGen quota check error (${res.status})`);
    const data = await res.json();
    return { remaining: data.data?.remaining_quota ?? 0 };
  }

  // ─── Private Helpers ───────────────────────────────────

  private async pollVideoStatus(videoId: string, maxWaitMs = 600_000): Promise<GeneratedVideo> {
    const startTime = Date.now();
    const pollIntervalMs = 10_000; // 10 seconds

    while (Date.now() - startTime < maxWaitMs) {
      const res = await fetch(`https://api.heygen.com/v1/video_status.get?video_id=${videoId}`, {
        headers: { 'X-API-KEY': this.apiKey },
      });

      if (!res.ok) throw new Error(`HeyGen status check error (${res.status})`);

      const data = await res.json();
      const status = data.data?.status;

      if (status === 'completed') {
        const videoUrl = data.data?.video_url;
        const duration = data.data?.duration || 30;
        const thumbnailUrl = data.data?.thumbnail_url;

        if (!videoUrl) throw new Error('HeyGen returned completed status but no video URL');

        return {
          url: videoUrl,
          durationMs: Math.round(duration * 1000),
          width: VIDEO_CONFIG.width,
          height: VIDEO_CONFIG.height,
          format: 'mp4',
          thumbnailUrl,
        };
      }

      if (status === 'failed' || status === 'error') {
        const errorMsg = data.data?.error || 'Video generation failed';
        throw new Error(`HeyGen video failed: ${errorMsg}`);
      }

      // status is 'processing' or 'pending' — wait and retry
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    throw new Error(`HeyGen video generation timed out after ${maxWaitMs / 1000}s`);
  }
}
