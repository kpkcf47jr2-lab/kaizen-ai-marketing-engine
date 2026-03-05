/**
 * OpenAI LLM Provider — Real implementation using GPT-4o.
 * Powers the daily content engine:
 *   1. Generates unique video scripts from Master Prompt (never repeats)
 *   2. Creates HeyGen-optimized video prompts with avatar direction
 *   3. Produces captions, hashtags, CTAs tailored to brand
 */

import type { LLMProvider } from './providers';
import type { GeneratedScript, BrandConfig } from './types';

/** Extended script with HeyGen video prompt */
export interface GeneratedContentPlan extends GeneratedScript {
  /** Optimized prompt for HeyGen Video Agent */
  heygenPrompt: string;
  /** Scene description for avatar video */
  sceneDirection: string;
  /** Suggested background/setting */
  background: string;
  /** Emotion/energy level for the avatar */
  avatarMood: string;
}

export class OpenAILLMProvider implements LLMProvider {
  readonly name = 'openai';
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.OPENAI_API_KEY || '';
  }

  /**
   * Generate a unique daily content plan from the Master Prompt.
   * Uses a content matrix to ensure variety:
   *   - Rotates between content types (tips, stories, tutorials, etc.)
   *   - Never repeats topics from the last 30 days
   *   - Adapts tone and energy to brand settings
   */
  async generateScript(
    brand: BrandConfig,
    options?: { topic?: string; previousTopics?: string[]; language?: string; contentDay?: number },
  ): Promise<GeneratedScript> {
    const plan = await this.generateContentPlan(brand, options);
    // Return as GeneratedScript (compatible with existing interface)
    return {
      title: plan.title,
      script: plan.script,
      caption: plan.caption,
      hashtags: plan.hashtags,
      cta: plan.cta,
      language: plan.language,
    };
  }

  /**
   * Full content plan with HeyGen-specific directives.
   * This is what the content processor uses to generate the video.
   */
  async generateContentPlan(
    brand: BrandConfig,
    options?: { topic?: string; previousTopics?: string[]; language?: string; contentDay?: number },
  ): Promise<GeneratedContentPlan> {
    const lang = options?.language || brand.language || 'en';
    const avoidTopics = options?.previousTopics?.slice(0, 30).join(', ') || 'none';
    const dayNum = options?.contentDay || new Date().getDate();

    // Content type rotation — ensures variety throughout the month
    const contentTypes = [
      'quick_tip', 'myth_buster', 'how_to', 'story_time', 'behind_the_scenes',
      'trending_take', 'challenge', 'before_after', 'faq_answer', 'motivation',
      'product_spotlight', 'customer_success', 'industry_news', 'prediction',
      'controversial_opinion', 'listicle', 'comparison', 'hack',
      'day_in_life', 'q_and_a', 'case_study', 'mistake_to_avoid',
      'tool_recommendation', 'transformation', 'unpopular_opinion',
      'step_by_step', 'statistic_breakdown', 'trend_analysis',
      'beginner_guide', 'expert_insight',
    ];
    const todaysType = contentTypes[dayNum % contentTypes.length];

    const systemPrompt = `You are a world-class short-form video content strategist for "${brand.brandName}".

BRAND IDENTITY:
- Niche: ${brand.niche || 'general business'}
- Tone: ${brand.tone || 'professional'}
- Target audience: ${brand.targetAudience || 'general'}
- Products/Services: ${brand.products || 'not specified'}
- Brand guidelines: ${brand.styleGuidelines || 'none'}

MASTER PROMPT (the soul of this brand's content):
${brand.masterPrompt}

CONTENT STRATEGY:
- Today's content type: ${todaysType.replace(/_/g, ' ')}
- Language: ${lang === 'es' ? 'Spanish' : 'English'}
- Script length: 15-45 seconds when spoken naturally
- NEVER repeat these recent topics: ${avoidTopics}

RULES:
1. The script is what the AI avatar SPEAKS — write it as natural speech, first person
2. Start with a HOOK in the first 3 seconds (question, bold statement, or surprising fact)
3. Deliver ONE clear value point — don't try to cover everything
4. End with a soft CTA — never pushy, always value-first
5. Sound human, not robotic — use contractions, pauses, emotions
6. Each video must teach something new or provide a fresh perspective
7. Derive ALL content from the Master Prompt — stay on brand, always`;

    const userPrompt = options?.topic
      ? `Create a ${todaysType.replace(/_/g, ' ')} video about: ${options.topic}`
      : `Create today's ${todaysType.replace(/_/g, ' ')} video. Be creative, surprising, and add real value. Don't repeat anything from before.`;

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
              description: 'Creates a complete content plan for a short-form AI avatar video',
              parameters: {
                type: 'object',
                properties: {
                  title: { type: 'string', description: 'Short catchy title (max 100 chars)' },
                  script: { type: 'string', description: 'What the avatar SPEAKS (15-45 seconds). Natural, first-person, conversational.' },
                  caption: { type: 'string', description: 'Social media caption (under 300 chars, with emojis)' },
                  hashtags: {
                    type: 'array',
                    items: { type: 'string' },
                    description: '5-10 relevant hashtags without # prefix',
                  },
                  cta: { type: 'string', description: 'Call to action phrase' },
                  heygen_prompt: { type: 'string', description: 'Video direction for HeyGen: describe the visual style, energy, and what the avatar should convey. Example: "A confident presenter in a modern office explaining a marketing tip with hand gestures and enthusiasm"' },
                  scene_direction: { type: 'string', description: 'Brief scene description: avatar position, gestures, energy level' },
                  background: { type: 'string', description: 'Suggested background setting (e.g., modern office, studio, outdoor, minimalist)' },
                  avatar_mood: { type: 'string', description: 'Avatar emotion (e.g., confident, excited, thoughtful, serious, friendly)' },
                },
                required: ['title', 'script', 'caption', 'hashtags', 'cta', 'heygen_prompt', 'scene_direction', 'background', 'avatar_mood'],
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'create_video_content' } },
        temperature: 0.85,
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
      heygenPrompt: result.heygen_prompt || `A presenter delivering a ${brand.tone || 'professional'} video about ${brand.niche || 'business'}`,
      sceneDirection: result.scene_direction || 'Avatar centered, natural gestures',
      background: result.background || 'modern office',
      avatarMood: result.avatar_mood || 'confident',
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
