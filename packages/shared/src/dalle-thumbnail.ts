/**
 * DALL-E Thumbnail Provider — Generates thumbnails using OpenAI DALL-E 3.
 */

import type { ThumbnailProvider, StorageUploadFn } from './providers';
import type { GeneratedThumbnail, BrandConfig } from './types';

export class DALLEThumbnailProvider implements ThumbnailProvider {
  readonly name = 'dalle';
  private apiKey: string;
  private uploadFn?: StorageUploadFn;

  constructor(apiKey?: string, uploadFn?: StorageUploadFn) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';
    this.uploadFn = uploadFn;
  }

  async generateThumbnail(
    title: string,
    brand: BrandConfig,
    options?: { style?: string; width?: number; height?: number },
  ): Promise<GeneratedThumbnail> {
    const style = options?.style || 'vibrant';

    const prompt = `Create a visually striking social media thumbnail for a short video titled "${title}".
Brand: ${brand.brandName}
Niche: ${brand.niche || 'general'}
Style: ${style}, modern, eye-catching, high contrast.
The thumbnail should be vertical (9:16 aspect ratio), suitable for Instagram Reels / TikTok / YouTube Shorts.
Do NOT include any text in the image — just a compelling visual that represents the topic.
Use bold colors and clean composition.`;

    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size: '1024x1792', // Vertical for short-form video
        quality: 'standard',
        response_format: 'url',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DALL-E API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const imageUrl = data.data?.[0]?.url;
    if (!imageUrl) {
      throw new Error('DALL-E did not return an image URL');
    }

    // Download the image and upload to our storage for persistence
    // (DALL-E URLs expire after ~1 hour)
    let finalUrl = imageUrl;
    if (this.uploadFn) {
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error('Failed to download DALL-E generated image');
      }
      const imageBuffer = new Uint8Array(await imageResponse.arrayBuffer());
      const key = `thumbnails/thumb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
      finalUrl = await this.uploadFn(key, imageBuffer, 'image/png');
    }

    return {
      url: finalUrl,
      width: 1024,
      height: 1792,
      format: 'png',
    };
  }
}
