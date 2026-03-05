/**
 * ElevenLabs TTS Provider — Real implementation.
 * Converts text to speech using ElevenLabs API and uploads to storage.
 */

import type { TTSProvider, StorageUploadFn } from './providers';
import type { GeneratedVoice } from './types';

const ELEVENLABS_API_BASE = 'https://api.elevenlabs.io/v1';

export class ElevenLabsTTSProvider implements TTSProvider {
  readonly name = 'elevenlabs';
  private apiKey: string;
  private uploadFn?: StorageUploadFn;

  constructor(apiKey?: string, uploadFn?: StorageUploadFn) {
    this.apiKey = apiKey || process.env.ELEVENLABS_API_KEY || '';
    this.uploadFn = uploadFn;
  }

  async listVoices(language?: string): Promise<Array<{ id: string; name: string; language: string; gender: string }>> {
    const response = await fetch(`${ELEVENLABS_API_BASE}/voices`, {
      headers: { 'xi-api-key': this.apiKey },
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs voices error (${response.status}): ${await response.text()}`);
    }

    const data = await response.json();
    const voices = (data.voices || []).map((v: any) => ({
      id: v.voice_id,
      name: v.name,
      language: v.labels?.language || 'en',
      gender: v.labels?.gender || 'unknown',
    }));

    if (language) {
      return voices.filter((v: any) => v.language.toLowerCase().includes(language.toLowerCase()));
    }
    return voices;
  }

  async synthesize(
    text: string,
    options?: { voiceId?: string; language?: string; speed?: number },
  ): Promise<GeneratedVoice> {
    // Default voice: Rachel (ElevenLabs default) or use provided
    const voiceId = options?.voiceId || '21m00Tcm4TlvDq8ikWAM';
    const speed = options?.speed || 1.0;

    const response = await fetch(`${ELEVENLABS_API_BASE}/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': this.apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true,
          speed,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ElevenLabs TTS error (${response.status}): ${errorText}`);
    }

    const audioBuffer = await response.arrayBuffer();
    const audioBytes = new Uint8Array(audioBuffer);

    // Estimate duration: ~150 words per minute spoken, ~5 chars per word average
    const wordCount = text.split(/\s+/).length;
    const estimatedDurationMs = Math.round((wordCount / 150) * 60 * 1000);

    // Upload to storage if upload function is provided
    let url: string;
    if (this.uploadFn) {
      const key = `audio/tts-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mp3`;
      url = await this.uploadFn(key, audioBytes, 'audio/mpeg');
    } else {
      // Return a data URL as fallback (not recommended for production)
      const base64 = Buffer.from(audioBytes).toString('base64');
      url = `data:audio/mpeg;base64,${base64.slice(0, 100)}...`; // truncated
    }

    return {
      url,
      durationMs: estimatedDurationMs,
      format: 'mp3',
    };
  }
}
