# Copilot Instructions for KAME (Kaizen AI Marketing Engine)

> **⚠️ AGENTE: LEE ESTA SECCIÓN PRIMERO — ES TU BRIEFING DE CONTINUIDAD**

## 🔄 Estado actual (5 mar 2026 noche) — DÓNDE ESTAMOS

### Resumen ejecutivo
KAME es una plataforma SaaS de marketing con IA **100% LIVE en producción**.
Web + Worker + DB + Redis desplegados y corriendo en Render.

### Lo que YA está hecho ✅
- **Todo compilando limpio**: `next build` ✅ | `worker tsc` ✅
- **Web LIVE**: https://kaizen-ai-marketing-engine.onrender.com
- **Worker LIVE**: `srv-d6l2nh7pm1nc7393pjg0` (3 BullMQ workers + scheduler + health check)
- **DB PostgreSQL**: `kame_u79u` en Render (schema pushed)
- **Redis**: `KAME-redis` → `redis://red-d6khtoqli9vc73f8d8qg:6379`
- **17 env vars** configuradas en ambos servicios (web + worker)
- **Landing page premium** en español con ambient glow, pricing, features, CTA
- **AI Assistant flotante** (GPT-4o-mini) integrado en todas las páginas
- **OAuth callbacks**: X, TikTok, YouTube, Elite configurados
- **Terms/Privacy pages** creadas
- **Audit fixes**: 9 critical issues resueltos
- **render.yaml** actualizado con HEYGEN_API_KEY, ELITE keys, prisma db push

### Lo que FALTA ahora 🔴
1. **Agregar tarjeta en HeyGen** → https://app.heygen.com/settings/billing (Pay-As-You-Go)
2. **Activar billing en OpenAI** → https://platform.openai.com/settings/organization/billing ($5-10)
3. **Configurar Cloudflare R2** (storage para videos/thumbnails) → S3_BUCKET, S3_ACCESS_KEY, etc.
4. **YouTube API keys** → Google Cloud Console → YouTube Data API v3
5. **Meta API keys** → Blocked (phone verification cooldown)
6. **TikTok URL verification** → developers.tiktok.com (ahora que app está live)
7. **Custom domain** → Usuario va a comprar dominio
8. **Probar flujo completo**: register → brand kit → credits → generar contenido → publicar

### Render Services
| Servicio | ID | Estado | Plan |
|----------|----|--------|------|
| **kaizen-web** | `srv-d6ku55nafjfc73en8eig` | ✅ LIVE | Starter $7/mes |
| **kaizen-worker** | `srv-d6l2nh7pm1nc7393pjg0` | ✅ LIVE | Starter $7/mes |
| **kaizen-db** | PostgreSQL `kame_u79u` | ✅ Active | Free |
| **KAME-redis** | `red-d6khtoqli9vc73f8d8qg` | ✅ Active | Free |
| **Total** | | | **$14/mes** |

### Render API Key
- `rnd_6M1ALbz5pCRw3PoBiNifCWy0MDXB` (para gestión via API)

### GitHub
- **Repo:** `https://github.com/kpkcf47jr2-lab/kaizen-ai-marketing-engine.git`
- **Owner:** `kpkcf47jr2-lab`
- **Branch:** `main`
- **Last commit:** `ea45eef` — render.yaml fixes

### Blockchain
- **KairosCoin (KRS):** BEP20 stablecoin en BSC
- **Contract:** `0x14D41707269c7D8b8DFa5095b38824a46dA05da3`
- **Payment wallet:** `0xda32780a6d7F4e9267D28a5C41EA75050e2A8B9B`

### Modelo de negocio (pricing validado)
- **FREE**: MockVideoProvider (sin HeyGen) → watermark KAME → $0 costo
- **PRO**: HeyGen Avatar III → 10 créditos → ~$0.50-0.99 costo HeyGen → margen 83-90%
- **ULTRA**: HeyGen Avatar IV → 50 créditos → ~$0.50-0.99 costo HeyGen → margen 96-98%
- HeyGen plan: Pay-As-You-Go (sin suscripción fija, cobra por video)

### Historial de sesiones
| Fecha | Qué se hizo |
|-------|-------------|
| 3-4 mar 2026 | Construcción completa: monorepo, schema, providers, UI, workers, KairosPay, auditoría prod round 1+2 |
| 5 mar 2026 AM | Git init, GitHub push, Render deploy web+DB, API keys (X, TikTok), audit 9 fixes |
| 5 mar 2026 PM | AI Assistant (API+widget), landing page premium, worker service creado en Render via API, 17 env vars, render.yaml fixes, análisis pricing HeyGen |

---

## Propósito
Plataforma SaaS de marketing automatizado con IA. Genera contenido diario (scripts, voiceovers, videos HD, thumbnails) y lo publica automáticamente en múltiples redes sociales.

## Ubicación
`/Users/marioisaacrodriguezdelrey/Projects/kaizen-ai-marketing/`

## Contexto completo detallado
→ `.github/PROJECT-CONTEXT.md` — arquitectura, schema DB, env vars, providers, todo lo técnico.

## Stack
- **Next.js 14.2.35** (App Router) + TypeScript + Tailwind (dark theme)
- **Prisma 5** + PostgreSQL 16 (13 modelos, 8 enums)
- **BullMQ + Redis** para jobs de generación y publicación
- **OpenAI GPT-4o** para scripts + GPT-4o-mini para AI assistant + DALL-E 3 para thumbnails
- **HeyGen** para video con avatar IA + voz (reemplazó ElevenLabs + Remotion)
- **ethers.js v6** para pagos con KairosCoin (BEP20 stablecoin on BSC)
- **NextAuth v4** (Credentials + Google)
- **pnpm monorepo**: `apps/web`, `apps/worker`, `packages/shared`

## Convenciones
- **Provider pattern**: Toda integración externa implementa una interfaz abstracta de `packages/shared/src/providers.ts`
- **Tokens encriptados**: AES-256-GCM via `src/lib/token-vault.ts`
- **Credit ledger**: Patrón contable (amount + balanceAfter en cada entrada)
- **Enums de Prisma**: Siempre importar de `@prisma/client`, NO usar strings literales
- **Nombres de campos DB**: Respetar exactamente lo que dice `prisma/schema.prisma` (e.g., `brandName` no `businessName`, `remotePostId` no `platformPostId`)
- **Dark theme**: CSS variables en `globals.css`, primary = purple HSL 262 83% 58%

## Reglas
1. NO mezclar con NovaSolutionTax — son proyectos completamente separados
2. Siempre compilar con `next build` antes de declarar algo terminado
3. Usar la versión local de Prisma: `apps/web/node_modules/.bin/prisma`
4. Los workers son procesos separados, no serverless functions
5. Todo contenido generado se sube a S3 y se referencia por URL en la DB
6. Para push a GitHub usar PAT temporal en URL (ver PROJECT-CONTEXT.md sección 10.1)
7. Actualizar ESTE archivo (`copilot-instructions.md`) al final de cada sesión con el estado actual

## Comandos
```bash
pnpm dev          # Web en http://localhost:3000
pnpm build        # Build producción
pnpm worker:dev   # Workers (modo watch)
pnpm db:push      # Push schema
pnpm db:seed      # Seed demo data
docker compose up -d  # Infra local
```
