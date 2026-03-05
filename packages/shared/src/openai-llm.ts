/**
 * OpenAI LLM Provider — Real implementation using GPT-4o.
 * Generates video scripts, captions, and content based on brand config.
 */

import type { LLMProvider } from './providers';
import type { GeneratedScript, BrandConfig } from './types';

export class OpenAILLMProvider implements LLMProvider {
  readonly name = 'openai';
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';
  }

  async generateScript(
    brand: BrandConfig,
    options?: { topic?: string; previousTopics?: string[]; language?: string },
  ): Promise<GeneratedScript> {
    const lang = options?.language || brand.language || 'en';
    const avoidTopics = options?.previousTopics?.slice(0, 10).join(', ') || 'none';

    const systemPrompt = `You are a creative social media content writer for the brand "${brand.brandName}".
Niche: ${brand.niche || 'general'}
Tone: ${brand.tone || 'professional'}
Target audience: ${brand.targetAudience || 'general'}
Brand guidelines: ${brand.styleGuidelines || 'none'}
Products: ${brand.products || 'none'}

Your master prompt: ${brand.masterPrompt}

Generate content in ${lang === 'es' ? 'Spanish' : 'English'}.
The video should be 15-45 seconds when spoken.
Avoid these recently used topics: ${avoidTopics}`;

    const userPrompt = options?.topic
      ? `Create a short video script about: ${options.topic}`
      : `Create a fresh, engaging short video script for today. Be creative and don't repeat previous topics.`;

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
        tools: [
          {
            type: 'function',
            function: {
              name: 'create_video_content',
              description: 'Creates structured video content for a short-form social media video',
              parameters: {
                type: 'object',
                properties: {
                  title: { type: 'string', description: 'Short catchy title (max 100 chars)' },
                  script: { type: 'string', description: 'The spoken script (15-45 seconds when read aloud)' },
                  caption: { type: 'string', description: 'Social media caption (under 300 chars)' },
                  hashtags: {
                    type: 'array',
                    items: { type: 'string' },
                    description: '5-10 relevant hashtags without # prefix',
                  },
                  cta: { type: 'string', description: 'Call to action phrase' },
                },
                required: ['title', 'script', 'caption', 'hashtags', 'cta'],
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'create_video_content' } },
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error('OpenAI did not return expected tool call');
    }

    const result = JSON.parse(toolCall.function.arguments);

    // Merge brand default hashtags
    const allHashtags = [...new Set([...result.hashtags, ...brand.hashtagsDefault])];
    const cta = result.cta || brand.ctas[0] || '';

    return {
      title: result.title,
      script: result.script,
      caption: `${result.caption}\n\n${cta}`,
      hashtags: allHashtags.slice(0, 15),
      cta,
      language: lang,
    };
  }

  async generateCaption(
    brand: BrandConfig,
    context: string,
  ): Promise<{ caption: string; hashtags: string[] }> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Write a social media caption for "${brand.brandName}". Tone: ${brand.tone}. Language: ${brand.language}.`,
          },
          {
            role: 'user',
            content: `Context: ${context}. Return JSON: { "caption": "...", "hashtags": ["..."] }`,
          },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI caption error: ${response.status}`);
    }

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
  }
}
