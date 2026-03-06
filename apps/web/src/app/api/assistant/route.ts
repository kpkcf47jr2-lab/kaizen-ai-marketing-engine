/**
 * KAME AI Assistant — Marketing Expert Chat API
 *
 * Streaming endpoint that powers the floating assistant.
 * Uses GPT-4o with a specialized marketing system prompt
 * that adapts to the user's brand profile if available.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

const SYSTEM_PROMPT = `Eres KAME AI, el asistente experto en marketing digital de la plataforma Kaizen AI Marketing Engine. Tu misión es ayudar a cualquier persona — desde principiantes absolutos hasta profesionales — a tener éxito con su marketing.

## TU PERSONALIDAD
- Eres amable, paciente y entusiasta
- Explicas todo de forma simple, sin jerga técnica innecesaria
- Das consejos prácticos y accionables, no teoría abstracta
- Motivas al usuario: "Sí se puede, y yo te ayudo"
- Eres conciso: respuestas cortas y directas (máximo 3-4 párrafos)
- Usas emojis con moderación para ser más cercano

## TUS CAPACIDADES
1. **Estrategia de Marketing**: Ayudas a definir audiencia, tono de marca, nichos, diferenciación
2. **Ideas de Contenido**: Generas ideas de posts, videos, campañas temáticas, series
3. **Copywriting**: Ayudas a escribir captions, CTAs, descripciones, hashtags
4. **Consejos de Plataforma**: Tips específicos para Instagram, TikTok, YouTube, X, Facebook, Elite
5. **Guía de KAME**: Explicas cómo usar la plataforma (Brand Kit, Campaigns, Credits, Connections)
6. **Tendencias**: Sugieres formatos y tendencias actuales en cada red social
7. **Análisis**: Ayudas a interpretar métricas y optimizar resultados

## REGLAS
- Si el usuario pregunta algo fuera de marketing/KAME, responde amablemente que eres especialista en marketing y redirige la conversación
- Si detectas que el usuario es principiante, simplifica AÚN MÁS tu lenguaje
- Siempre termina con una pregunta o sugerencia para mantener la conversación
- Si el usuario no sabe por dónde empezar, guíalo paso a paso
- Responde en el idioma del usuario (español o inglés)

## SOBRE KAME (para cuando pregunten)
- KAME genera videos con IA automáticamente y los publica en redes sociales
- El usuario configura su Brand Kit (nombre, nicho, tono, prompt maestro)
- Luego crea una Campaña (frecuencia, tier de video, horarios)
- KAME genera el script, video, thumbnail y publica automáticamente
- Tiers: FREE (con watermark), PRO (10 créditos), ULTRA (50 créditos, calidad premium)
- Los créditos se compran con KairosCoin (KRS), una stablecoin en Binance Smart Chain
- Redes soportadas: Elite (recomendada), Instagram, Facebook, YouTube, TikTok, X

## CONTEXTO DEL USUARIO
{USER_CONTEXT}`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages required' }, { status: 400 });
    }

    // Get user context if authenticated
    let userContext = 'Usuario no autenticado (visitante).';
    const session = await getServerSession(authOptions);

    if (session?.user) {
      const userId = (session.user as any).id;
      try {
        const [brand, socials, campaign] = await Promise.all([
          prisma.brandProfile.findUnique({ where: { userId } }),
          prisma.socialAccount.findMany({
            where: { userId },
            select: { provider: true, providerUsername: true, status: true },
          }),
          prisma.campaign.findFirst({ where: { userId } }),
        ]);

        const parts: string[] = [];
        parts.push(`Nombre: ${session.user.name || 'No configurado'}`);

        if (brand) {
          parts.push(`Marca: ${brand.brandName}`);
          parts.push(`Nicho: ${brand.niche || 'No definido'}`);
          parts.push(`Tono: ${brand.tone || 'No definido'}`);
          parts.push(`Idioma: ${brand.language}`);
          parts.push(`Tiene Brand Kit: ✅`);
        } else {
          parts.push('Tiene Brand Kit: ❌ (no configurado aún)');
        }

        if (socials.length > 0) {
          parts.push(`Redes conectadas: ${socials.map((s) => `${s.provider} (@${s.providerUsername})`).join(', ')}`);
        } else {
          parts.push('Redes conectadas: ninguna');
        }

        if (campaign) {
          parts.push(`Campaña: ${campaign.status} (${campaign.frequency}, tier ${campaign.videoTier})`);
        } else {
          parts.push('Campaña: no creada');
        }

        userContext = parts.join('\n');
      } catch {
        userContext = `Usuario autenticado: ${session.user.email}`;
      }
    }

    const systemPrompt = SYSTEM_PROMPT.replace('{USER_CONTEXT}', userContext);

    // Call OpenAI with streaming
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        reply:
          '¡Hola! 👋 Soy KAME AI, tu asistente de marketing. Actualmente estoy en modo de configuración. Pronto estaré 100% disponible para ayudarte con todo lo que necesites. ¡Vuelve pronto!',
      });
    }

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.slice(-10), // Last 10 messages for context
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!openaiRes.ok) {
      const err = await openaiRes.json().catch(() => ({}));
      console.error('[assistant] OpenAI error:', err);
      return NextResponse.json({
        reply:
          '¡Ups! Tuve un pequeño problema. 😅 Intenta de nuevo en un momento. Si el problema persiste, no te preocupes — estamos trabajando en ello.',
      });
    }

    const data = await openaiRes.json();
    const reply = data.choices?.[0]?.message?.content || 'No pude generar una respuesta. ¿Puedes intentar de nuevo?';

    return NextResponse.json({ reply });
  } catch (error) {
    console.error('[assistant] Error:', error);
    return NextResponse.json({
      reply: 'Algo salió mal. Por favor intenta de nuevo. 🙏',
    });
  }
}
