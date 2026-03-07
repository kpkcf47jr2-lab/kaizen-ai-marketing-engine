/**
 * Banner Service — Generates promotional banners using DALL-E 3
 * and written content using GPT-4o for messaging channels (Telegram/WhatsApp).
 */

import type { BrandConfig } from '@kaizen/shared';
import { storage } from '@/lib/storage';

interface GeneratedBanner {
  url: string;
  width: number;
  height: number;
  format: string;
}

interface GeneratedArticle {
  title: string;
  body: string;
  summary: string;
  hashtags: string[];
  callToAction: string;
}

interface MessagingContent {
  article: GeneratedArticle;
  banner?: GeneratedBanner;
}

export class BannerService {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';
  }

  /**
   * Generate a promotional banner image using DALL-E 3.
   * Optimized for messaging channels (horizontal 16:9 for better display).
   */
  async generateBanner(
    title: string,
    brand: BrandConfig,
    options?: { style?: string; orientation?: 'horizontal' | 'square' },
  ): Promise<GeneratedBanner> {
    const style = options?.style || 'modern';
    const size = options?.orientation === 'square' ? '1024x1024' : '1792x1024';

    const prompt = `Create a stunning promotional banner for a messaging channel post.
Title: "${title}"
Brand: ${brand.brandName}
Niche: ${brand.niche || 'business'}
Style: ${style}, premium, eye-catching, high contrast, professional marketing banner.
The banner should be:
- Clean and modern with bold visual impact
- Professional color scheme matching the brand
- NO text in the image — just compelling visuals and graphics
- Suitable for Telegram channels and WhatsApp broadcasts
- Uses abstract shapes, gradients, and brand-relevant imagery
Make it look like a premium agency designed it.`;

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
        size,
        quality: 'standard',
        response_format: 'url',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DALL-E banner error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const imageUrl = data.data?.[0]?.url;
    if (!imageUrl) throw new Error('DALL-E did not return a banner URL');

    // Download and persist to S3 (DALL-E URLs expire after ~1 hour)
    let finalUrl = imageUrl;
    try {
      const imageResponse = await fetch(imageUrl);
      if (imageResponse.ok) {
        const imageBuffer = new Uint8Array(await imageResponse.arrayBuffer());
        const key = `banners/banner-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
        const result = await storage.upload({ key, body: imageBuffer, contentType: 'image/png' });
        finalUrl = result.url;
      }
    } catch (err) {
      console.warn('Failed to persist banner to storage, using DALL-E URL:', err);
    }

    const [w, h] = size === '1024x1024' ? [1024, 1024] : [1792, 1024];
    return { url: finalUrl, width: w, height: h, format: 'png' };
  }

  /**
   * Generate a written article/post using GPT-4o for messaging channels.
   * Creates engaging content optimized for Telegram/WhatsApp reading format.
   */
  async generateArticle(
    brand: BrandConfig,
    options?: { topic?: string; previousTopics?: string[]; language?: string },
  ): Promise<GeneratedArticle> {
    const language = options?.language || brand.language || 'es';
    const previousStr = options?.previousTopics?.length
      ? `\nTopics already covered (avoid repeating): ${options.previousTopics.join(', ')}`
      : '';

    const systemPrompt = `You are an expert marketing copywriter for "${brand.brandName}".
Your job is to write engaging content for messaging channels (Telegram, WhatsApp).
The content must be:
- Written in ${language === 'es' ? 'Spanish' : 'English'}
- Optimized for mobile reading (short paragraphs, emojis, bold formatting)
- Professional yet approachable
- Include actionable tips or insights
- Use Telegram/WhatsApp compatible formatting (bold with *, italic with _, etc.)
Brand niche: ${brand.niche || 'general business'}
Brand tone: ${brand.tone || 'professional'}
Target audience: ${brand.targetAudience || 'business owners and entrepreneurs'}
${brand.masterPrompt}
${previousStr}`;

    const userPrompt = options?.topic
      ? `Write an engaging article about: "${options.topic}"\n\nThe article should be 150-300 words, formatted for messaging apps. Include a catchy title, main body with key points, and a clear call to action. Also provide 3-5 relevant hashtags.`
      : `Write an engaging daily tip or insight for the brand's audience.\n\nThe article should be 150-300 words, formatted for messaging apps. Include a catchy title, main body with key points, and a clear call to action. Also provide 3-5 relevant hashtags.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 1000,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'article_output',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                title: { type: 'string', description: 'Catchy article title with emoji' },
                body: { type: 'string', description: 'Main article text formatted for messaging apps (use *, _, etc.)' },
                summary: { type: 'string', description: 'One-line summary for preview' },
                hashtags: { type: 'array', items: { type: 'string' }, description: '3-5 relevant hashtags' },
                callToAction: { type: 'string', description: 'Clear CTA at the end' },
              },
              required: ['title', 'body', 'summary', 'hashtags', 'callToAction'],
              additionalProperties: false,
            },
          },
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GPT-4o article error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('GPT-4o did not return article content');

    const article = JSON.parse(content);
    return {
      title: article.title,
      body: article.body,
      summary: article.summary,
      hashtags: article.hashtags,
      callToAction: article.callToAction,
    };
  }

  /**
   * Full messaging content pipeline: article + banner.
   * Generates both a written article and a promotional banner.
   */
  async generateMessagingContent(
    brand: BrandConfig,
    options?: { topic?: string; previousTopics?: string[]; includeBanner?: boolean },
  ): Promise<MessagingContent> {
    const article = await this.generateArticle(brand, options);

    let banner: GeneratedBanner | undefined;
    if (options?.includeBanner !== false) {
      try {
        banner = await this.generateBanner(article.title, brand);
      } catch (err) {
        console.warn('Banner generation failed, sending text only:', err);
      }
    }

    return { article, banner };
  }
}
