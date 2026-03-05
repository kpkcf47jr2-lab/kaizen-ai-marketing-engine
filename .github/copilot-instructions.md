# Copilot Instructions for KAME (Kaizen AI Marketing Engine)

> **⚠️ AGENTE: LEE ESTA SECCIÓN PRIMERO — ES TU BRIEFING DE CONTINUIDAD**

## 🔄 Estado actual (5 mar 2026) — DÓNDE ESTAMOS

### Resumen ejecutivo
KAME es una plataforma SaaS de marketing con IA que ya está **100% codificada y compilando**.
El deployment en Render está **en proceso** — Blueprint aplicado, pero faltan API keys externas.

### Lo que YA está hecho ✅
- **83 archivos, 14,367 líneas** de código — TODO compila limpio
- `next build` ✅ pasa | `worker tsc --noEmit` ✅ pasa
- Git repo inicializado, pusheado a GitHub
- Render Blueprint "KAME" aplicado ($14/mes: web $7 + worker $7 + DB free + Redis free)
- Redis creado en Render (KAME-redis): `redis://red-d6khtoqli9vc73f8d8qg:6379`
- Prisma migration generada (342 líneas SQL, sin Docker)
- 2 rondas de hardening de producción completadas (25+ fixes)

### Lo que FALTA ahora 🔴
1. **Verificar que Render haya terminado de desplegar** → `https://dashboard.render.com`
2. **Configurar NEXTAUTH_URL** en Render → copiar URL del servicio web desplegado
3. **Obtener API keys externas** (en orden de prioridad):
   - 🔴 `OPENAI_API_KEY` → https://platform.openai.com/api-keys (necesita $10 billing)
   - 🔴 `ELEVENLABS_API_KEY` → https://elevenlabs.io → API Keys (plan Free = 10K chars/mes)
   - 🟡 Storage (5 vars): Cloudflare R2 → https://dash.cloudflare.com → R2
   - 🟢 Google OAuth (opcional): https://console.cloud.google.com/apis/credentials
   - 🔵 Social APIs (después): Meta, TikTok, X → ver PROJECT-CONTEXT.md §10.4
4. **Agregar cada key** en Render → Environment para kaizen-web y kaizen-worker
5. **Probar flujo completo**: register → brand kit → credits → generar contenido → publicar

### GitHub
- **Repo:** `https://github.com/kpkcf47jr2-lab/kaizen-ai-marketing-engine.git`
- **Owner:** `kpkcf47jr2-lab`
- **Branch:** `main`
- **Push:** Usar PAT temporal en URL, remover después (ver PROJECT-CONTEXT.md §10.1)

### Render
- **Blueprint:** KAME (kaizen-web + kaizen-worker + kaizen-db)
- **Redis:** KAME-redis (creado manualmente, Internal URL: `redis://red-d6khtoqli9vc73f8d8qg:6379`)
- **Workspace:** "Kairos 777's workspace" (login con Google)
- **Config:** render.yaml (REDIS_URL usa `sync:false`, no `fromService`)
- **Costo:** $14/mes total

### Blockchain
- **KairosCoin (KRS):** BEP20 stablecoin en BSC
- **Contract:** `0x14D41707269c7D8b8DFa5095b38824a46dA05da3`
- **Payment wallet:** `0xda32780a6d7F4e9267D28a5C41EA75050e2A8B9B`

### Historial de sesiones
| Fecha | Qué se hizo |
|-------|-------------|
| 3-4 mar 2026 | Construcción completa: monorepo, schema, providers, UI, workers, KairosPay, auditoría prod round 1+2 |
| 5 mar 2026 | Git init, GitHub push, Render Redis (KAME-redis), Blueprint "KAME" aplicado, render.yaml fix. Pendiente: API keys externas |

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
- **OpenAI GPT-4o** para scripts + DALL-E 3 para thumbnails
- **ElevenLabs** para TTS voiceovers
- **Remotion** para video (por implementar)
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
