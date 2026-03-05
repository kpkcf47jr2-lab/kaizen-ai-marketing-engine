# 🧠 Kaizen AI Marketing Engine — Project Context & Backup

> **INSTRUCCIÓN PARA AGENTES IA:** Este documento es la fuente de verdad del proyecto. Léelo completo antes de hacer cualquier cambio. Contiene toda la arquitectura, estado actual, y próximos pasos.

> **Última actualización:** 4 de marzo de 2026  
> **Build status:** ✅ COMPILA EXITOSAMENTE (next build + worker tsc pasan)  
> **Production readiness:** ✅ Auditoría completa — listo para deploy  
> **Ubicación:** `/Users/marioisaacrodriguezdelrey/Projects/kaizen-ai-marketing/`

---

## 1. VISIÓN DEL PRODUCTO

**Kaizen AI Marketing Engine** es una plataforma SaaS que automatiza el marketing digital completo de empresas e influencers:

- **Generación automática diaria** de contenido (scripts, voiceovers, videos HD, thumbnails)
- **Publicación multi-plataforma** (Instagram Reels, TikTok, YouTube Shorts, Facebook, X/Twitter)
- **Pagos con KairosCoin** (BEP20 stablecoin en Binance Smart Chain)
- **Calidad superior** a competidores (Predis.ai, Lately, Buffer, Hootsuite)
- **Contenido consistente** — la IA aprende el tono de marca y genera contenido alineado cada día

### Diferenciadores clave:
1. Video HD real (1080x1920, 30fps) con voiceover y subtítulos
2. IA que entiende la marca (Brand Kit + Master Prompt)
3. Publicación automática en 5+ redes a la vez
4. Pagos crypto nativos (KairosCoin stablecoin)
5. Zero-touch: configuras una vez y genera + publica diariamente

---

## 2. TECH STACK

| Capa | Tecnología | Versión |
|------|-----------|---------|
| **Framework** | Next.js (App Router) | 14.2.35 |
| **Lenguaje** | TypeScript | ^5.6.0 |
| **Estilos** | Tailwind CSS | ^3.4.0 |
| **ORM** | Prisma | ^5.20.0 |
| **Base de datos** | PostgreSQL | 16-alpine |
| **Cola de jobs** | BullMQ + Redis | ^5.25.0 / 7-alpine |
| **Storage** | S3-compatible (AWS S3 / MinIO) | @aws-sdk/client-s3 |
| **Auth** | NextAuth v4 | ^4.24.0 |
| **AI - Scripts** | OpenAI GPT-4o | ^4.70.0 |
| **AI - TTS** | ElevenLabs (real) + Mock fallback | elevenlabs-tts.ts |
| **AI - Thumbnails** | DALL-E 3 (real) + Mock fallback | dalle-thumbnail.ts |
| **AI - Video** | (Por implementar: Remotion / Replicate) | — |
| **Blockchain** | ethers.js (BSC / KairosCoin BEP20) | ^6.13.0 |
| **Monorepo** | pnpm workspaces | >=9 |
| **Infra local** | Docker Compose | postgres + redis + minio |

---

## 3. ESTRUCTURA DEL PROYECTO

```
kaizen-ai-marketing/
├── package.json                    # Monorepo root scripts
├── pnpm-workspace.yaml             # apps/* + packages/*
├── tsconfig.json                   # Base TS config
├── docker-compose.yml              # Postgres:16, Redis:7, MinIO
├── .env.example                    # Todas las env vars documentadas
├── .gitignore
├── README.md
│
├── packages/
│   └── shared/                     # Código compartido
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts            # Barrel exports
│           ├── types.ts            # Interfaces: SocialProvider, CreditPackage, GeneratedScript, GeneratedVoice, GeneratedVideo, ContentBundle, BrandConfig, WalletInfo, PublishResult, JobStatus, ApiResponse, UserProfile
│           ├── constants.ts        # APP_NAME, CREDIT_PACKAGES(4), SOCIAL_PROVIDERS(5), VIDEO_CONFIG(1080x1920), SUPPORTED_LANGUAGES, TONE_OPTIONS(8), blockchain constants
│           ├── crypto.ts           # AES-256-GCM encrypt/decrypt (Web Crypto API, Edge compatible)
│           ├── providers.ts        # Interfaces abstractas: LLMProvider, TTSProvider, VideoProvider, SocialPublisher, StorageProvider
│           └── validators.ts       # Zod schemas: register, login, brandProfile, connectWallet, submitPayment, autoPostConfig, generateContent
│
├── apps/
│   ├── web/                        # Next.js App
│   │   ├── package.json            # Deps: next, prisma, nextauth, openai, ethers, bullmq, ioredis, tailwind, radix, zod, zustand, etc.
│   │   ├── tsconfig.json
│   │   ├── next.config.js
│   │   ├── tailwind.config.ts
│   │   ├── postcss.config.js
│   │   │
│   │   ├── prisma/
│   │   │   ├── schema.prisma       # 13 modelos, 8 enums (VER SECCIÓN 4)
│   │   │   └── seed.ts             # Admin + Demo user + créditos + brand profile
│   │   │
│   │   └── src/
│   │       ├── middleware.ts        # Route protection, auth guard, admin-only, HSTS
│   │       ├── lib/
│   │       │   ├── prisma.ts       # Singleton PrismaClient
│   │       │   ├── redis.ts        # Singleton ioredis
│   │       │   ├── auth.ts         # NextAuth: Credentials + Google (conditional), JWT, explicit secret
│   │       │   ├── storage.ts      # S3-compatible StorageProvider (upload, getSignedUrl, delete)
│   │       │   ├── token-vault.ts  # encryptToken/decryptToken (AES-256-GCM)
│   │       │   ├── rate-limit.ts   # Redis sliding window rate limiter
│   │       │   └── utils.ts        # cn(), formatCredits(), shortenAddress(), formatDate()
│   │       │
│   │       ├── services/
│   │       │   ├── credits.service.ts    # getBalance, addCredits, spendCredits, getHistory (ledger pattern)
│   │       │   ├── wallet.service.ts     # connectWallet, submitPayment, verifyPayment (on-chain ERC20), getWallet, getPayments
│   │       │   ├── content.service.ts    # OpenAILLMProvider (GPT-4o real), MockLLMProvider, MockTTSProvider, MockVideoProvider, ContentService orchestrator
│   │       │   └── publishing.service.ts # MetaInstagramPublisher (Instagram Reels API real), MockPublisher, PublishingService
│   │       │
│   │       └── app/
│   │           ├── globals.css           # Tailwind + CSS vars, dark theme, purple primary (HSL 262 83% 58%)
│   │           ├── layout.tsx            # Root layout, Inter font, dark mode, KairosPay SDK
│   │           ├── page.tsx              # Landing: hero + 6-feature grid + footer (Kairos links)
│   │           ├── error.tsx             # Global error boundary
│   │           ├── not-found.tsx         # Custom 404 page
│   │           ├── login/page.tsx        # Login: email/password + Google OAuth
│   │           ├── register/page.tsx     # Register: name/email/password
│   │           │
│   │           ├── dashboard/
│   │           │   ├── layout.tsx        # Sidebar (7 nav items), auth guard, user footer
│   │           │   ├── page.tsx          # Overview: stats, quick actions, recent posts
│   │           │   ├── error.tsx         # Dashboard-specific error boundary
│   │           │   ├── loading.tsx       # Skeleton loading state
│   │           │   ├── brand/page.tsx    # Brand Kit: identity, products, master prompt, CTAs, links, hashtags
│   │           │   ├── connections/page.tsx  # Social OAuth connect/disconnect UI
│   │           │   ├── credits/page.tsx  # Credit packages, buy with KairosCoin (KairosPay SDK), balance, history
│   │           │   ├── calendar/page.tsx # Content calendar: grid mensual interactivo
│   │           │   ├── library/page.tsx  # Asset browser: videos, audio, scripts, thumbnails
│   │           │   └── admin/page.tsx    # Admin: stats, quick actions, users table
│   │           │
│   │           └── api/
│   │               ├── auth/[...nextauth]/route.ts    # NextAuth handler
│   │               ├── auth/register/route.ts          # POST: register con bcrypt
│   │               ├── brand/route.ts                  # GET + POST: brand profile CRUD
│   │               ├── credits/route.ts                # GET: balance + history
│   │               ├── wallet/route.ts                 # GET + POST: wallet connect / pay
│   │               ├── social/route.ts                 # GET + DELETE: social accounts
│   │               ├── social/meta/callback/route.ts   # Meta OAuth callback (full flow)
│   │               └── posts/route.ts                  # GET: list posts
│   │
│   └── worker/                     # BullMQ Worker
│       ├── package.json            # Deps: bullmq, ioredis, prisma, @kaizen/shared — prod: tsc → node dist/
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts            # Entry: 3 workers (content, publish, payment) + scheduler + health HTTP + graceful shutdown
│           ├── scheduler.ts        # Cron: cada 15min busca posts programados y los encola
│           ├── lib/
│           │   └── prisma.ts       # Singleton PrismaClient for worker
│           └── processors/
│               ├── content.processor.ts    # Pipeline: script → voice → video (TODO: conectar providers reales)
│               ├── publishing.processor.ts # Publicar assets a redes sociales (TODO: publishers reales)
│               └── payment.processor.ts    # Verificar pagos on-chain + acreditar
```

---

## 4. SCHEMA DE BASE DE DATOS (Prisma)

### Modelos (13):
| Modelo | Descripción |
|--------|-------------|
| `User` | Usuarios con role (USER/ADMIN), passwordHash, email |
| `Account` | NextAuth: OAuth accounts |
| `Session` | NextAuth: sesiones |
| `VerificationToken` | NextAuth: tokens de verificación |
| `BrandProfile` | Kit de marca: brandName, niche, tone, masterPrompt, ctas[], links[], hashtagsDefault[], products, targetAudience |
| `SocialAccount` | Cuentas sociales OAuth: provider(enum), tokens encriptados, status, scopes[] |
| `Wallet` | Wallet BSC: address, chainId |
| `CreditLedger` | Ledger de créditos: type(PURCHASE/SPEND/REFUND/BONUS), amount, balanceAfter |
| `OnchainPayment` | Pagos blockchain: txHash, status(PENDING/CONFIRMING/CONFIRMED/FAILED), confirmations |
| `ContentJob` | Jobs de generación: status(QUEUED→RUNNING→SUCCESS/FAILED), progress(0-100), retries |
| `Asset` | Archivos generados: type(VIDEO/IMAGE/AUDIO/SCRIPT/CAPTION/THUMBNAIL), url, durationMs |
| `Post` | Publicaciones: provider, caption, hashtags[], status(DRAFT→SCHEDULED→PUBLISHING→PUBLISHED), remotePostId, metrics(JSON) |
| `AuditLog` | Log de auditoría inmutable |

### Enums (8):
`Role`, `SocialProvider`, `SocialAccountStatus`, `LedgerType`, `PaymentStatus`, `JobStatus`, `AssetType`, `PostStatus`

### Notas importantes del schema:
- `Asset.url` es String (NO storageKey) — fue renombrado
- `ContentJob` usa `scheduledFor`, `completedAt`, `error`, `progress`, `retries`, `maxRetries` — NO tiene scriptTitle/scriptBody
- `Post` usa `remotePostId`, `remoteUrl`, `scheduledFor`, `metrics` — NO tiene platformPostId/platformUrl/publishedAt
- `CreditLedger.type` usa enum `LedgerType` (PURCHASE/SPEND/REFUND/BONUS) — NO tiene CREDIT/DEBIT
- `BrandProfile` usa `brandName` (no businessName), `niche` (no industry), `tone` (no brandVoice), `ctas` (no ctasJson), `hashtagsDefault`, `products`, `links`

---

## 5. CREDENCIALES Y CUENTAS DEMO

| Email | Password | Role |
|-------|----------|------|
| admin@kaizen.ai | (from SEED_ADMIN_PASSWORD env var, default: admin123) | ADMIN |
| demo@kaizen.ai | (from SEED_DEMO_PASSWORD env var, default: demo123) | USER (500 créditos) |

> **Nota:** El seed no se ejecuta en producción sin `FORCE_SEED=1`.

---

## 6. COMANDOS PRINCIPALES

```bash
pnpm dev          # Arranca Next.js en http://localhost:3000
pnpm build        # Build de producción
pnpm worker       # Arranca BullMQ workers
pnpm worker:dev   # Workers en modo watch
pnpm db:push      # Push schema a PostgreSQL
pnpm db:seed      # Seed datos demo
pnpm db:studio    # Prisma Studio GUI
pnpm db:migrate   # Crear migración

# Infraestructura
docker compose up -d    # Postgres + Redis + MinIO
```

---

## 7. VARIABLES DE ENTORNO NECESARIAS

Ver `.env.example` para la lista completa documentada. Las más importantes:

```bash
# Database
DATABASE_URL=postgresql://kaizen:kaizen@localhost:5432/kaizen

# Redis
REDIS_URL=redis://localhost:6379

# Auth
NEXTAUTH_SECRET=<random-secret>
NEXTAUTH_URL=http://localhost:3000

# Google OAuth (optional — app works without it)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Meta (Instagram/Facebook)
META_APP_ID=
META_APP_SECRET=

# OpenAI
OPENAI_API_KEY=sk-...

# ElevenLabs (TTS)
ELEVENLABS_API_KEY=

# S3/MinIO Storage
S3_BUCKET=kaizen-assets
S3_REGION=us-east-1
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_ENDPOINT=http://localhost:9000

# Blockchain (KairosCoin BEP20 on BSC)
KAIROSCOIN_TOKEN_ADDRESS=0x14D41707269c7D8b8DFa5095b38824a46dA05da3
PAYMENT_RECEIVER_ADDRESS=0xda32780a6d7F4e9267D28a5C41EA75050e2A8B9B
NEXT_PUBLIC_PAYMENT_RECEIVER_ADDRESS=0xda32780a6d7F4e9267D28a5C41EA75050e2A8B9B
WEB3_RPC_URL=https://bsc-dataseed1.binance.org/
CHAIN_ID=56

# Encryption
ENCRYPTION_KEY=<64-char-hex>

# Worker
HEALTH_PORT=8080

# TikTok
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=

# X (Twitter)
X_CLIENT_ID=
X_CLIENT_SECRET=
```

---

## 8. ESTADO ACTUAL — QUÉ FUNCIONA

### ✅ Completado y compilando:
- [x] Monorepo config (pnpm workspaces, tsconfig, docker-compose)
- [x] Package shared (types, constants, crypto, providers, validators)
- [x] Prisma schema completo (13 modelos, 8 enums, todas las relaciones)
- [x] Prisma Client generado (v5.22.0)
- [x] Libs: prisma singleton, redis singleton, auth config, S3 storage, token vault, utils
- [x] Services: credits (ledger), wallet (on-chain verification), content (OpenAI real + mocks), publishing (Instagram real + mocks)
- [x] API Routes: auth (register + nextauth), brand CRUD, credits, wallet, social (+ meta callback), posts
- [x] UI Pages: landing, login, register, dashboard (overview, brand, connections, credits, calendar, library, admin)
- [x] Worker: BullMQ setup con 3 workers + scheduler + graceful shutdown
- [x] Seed: admin + demo users + credits + brand profile
- [x] `next build` PASA ✅
- [x] **ElevenLabs TTS Provider** — `packages/shared/src/elevenlabs-tts.ts` (API real, upload a S3)
- [x] **DALL-E Thumbnail Provider** — `packages/shared/src/dalle-thumbnail.ts` (genera thumbnails 1024x1792)
- [x] **OpenAI LLM Provider** — movido a `packages/shared/src/openai-llm.ts` (tools API actualizada)
- [x] **Social Publishers reales** — `packages/shared/src/social-publishers.ts`:
  - MetaInstagramPublisher (Reels API)
  - TikTokPublisher (Content Posting API v2)
  - YouTubePublisher (Data API v3 resumable upload)
  - XTwitterPublisher (Media Upload v1.1 + Tweets v2)
- [x] **Mock providers centralizados** — `packages/shared/src/mock-providers.ts`
- [x] **Content processor real** — `apps/worker/src/processors/content.processor.ts` (pipeline completo: script → voice → video → thumbnail → posts)
- [x] **Publishing processor real** — `apps/worker/src/processors/publishing.processor.ts` (decrypta tokens, usa publishers reales)
- [x] **Payment processor corregido** — verificación on-chain real via JSON-RPC, LedgerType PURCHASE
- [x] **Daily pipeline scheduler** — `apps/worker/src/scheduler.ts` (auto-genera contenido diario + publica posts programados)
- [x] **API de generación** — `POST/GET /api/content/generate` (trigger manual + status de jobs)
- [x] **KairosPay SDK** — Integrado en layout.tsx + credits page con checkout completo
- [x] **KairosCoin (KRS)** — BEP20 stablecoin, contract: `0x14D41707269c7D8b8DFa5095b38824a46dA05da3`

### ✅ Production Hardening (completado):
- [x] **middleware.ts** — Protege /dashboard/* y /api/*, admin-only guard, HSTS en prod
- [x] **Security headers** — X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, X-Powered-By removed
- [x] **Rate limiting** — Redis sliding window en /api/auth/register (5/min) y /api/wallet (pay, 10/min)
- [x] **Error pages** — error.tsx, not-found.tsx, dashboard/error.tsx, dashboard/loading.tsx
- [x] **Auth hardened** — Explicit NEXTAUTH_SECRET, Google OAuth condicional (no falla sin credentials)
- [x] **API error handling** — try/catch en todas las API routes (brand, credits, posts, social, wallet)
- [x] **Worker singleton** — PrismaClient singleton en apps/worker/src/lib/prisma.ts
- [x] **Worker health check** — HTTP server en :8080 con status de workers
- [x] **Worker prod build** — tsc → node dist/index.js (no tsx en producción)
- [x] **Env var consistency** — S3_ACCESS_KEY/S3_SECRET_KEY (no _ID/_ACCESS_KEY), WEB3_RPC_URL (no BSC_)
- [x] **Prisma migrate deploy** — render.yaml usa `prisma migrate deploy` en producción
- [x] **Seed security** — Passwords from env vars, production guard (FORCE_SEED required)
- [x] **Render blueprint** — render.yaml completo para deploy con 1 click
- [x] **.env.example** — Documentado con todas las variables + worker + seed

### ⚠️ Funcional pero con mocks/TODOs:
- [x] ~~`content.service.ts` tiene OpenAILLMProvider real pero TTS y Video usan mocks~~ → TTS real con ElevenLabs, thumbnails con DALL-E. Video aún usa mock (TODO: Remotion)
- [x] ~~`publishing.service.ts` tiene MetaInstagramPublisher real pero falta TikTok, YouTube, X, LinkedIn~~ → 4 publishers reales implementados
- [x] ~~Worker processors usan placeholders~~ → Conectados a providers reales con pipeline completo
- [ ] Dashboard UI usa fetch pero no hay estados de loading/error robustos (loading.tsx added)
- [ ] No hay componentes reutilizables (todo inline en pages)

### ❌ Por implementar (PRÓXIMA FASE):
- [ ] **Prisma migrations**: Ejecutar `./scripts/create-migration.sh init` cuando haya DB local disponible (Docker)
- [ ] **Video Compositor real**: Remotion con text overlays, transiciones, branding, subtítulos automáticos
- [ ] **LinkedIn Publisher**: LinkedIn Marketing API
- [ ] **Content Strategy AI**: trending topics, optimal posting times, content variety
- [ ] **Dashboard avanzado**: preview de video, progress en tiempo real (SSE/WebSocket), analytics, A/B testing
- [ ] **Métricas pull**: job periódico que actualiza métricas post-publicación (views, likes, comments)
- [ ] **Notificaciones**: email/push cuando se publica o falla
- [ ] **Onboarding wizard**: setup guiado para nuevos usuarios
- [ ] **Content approval workflow**: preview antes de publicar (opcional)
- [ ] **Multi-idioma real**: i18n en la UI
- [ ] **Tests**: unit + integration tests
- [ ] **Webhook receivers**: para callbacks de TikTok/YouTube cuando el video termina de procesarse

---

## 9. DECISIONES ARQUITECTÓNICAS CLAVE

1. **Provider pattern**: Todas las integraciones AI y social usan interfaces abstractas (`LLMProvider`, `TTSProvider`, `VideoProvider`, `SocialPublisher`, `StorageProvider`). Se pueden swappear sin tocar lógica core.

2. **Tokens encriptados**: Los access tokens de redes sociales se guardan encriptados con AES-256-GCM en la DB. Se desencriptan solo en el momento de uso.

3. **Credit ledger**: Sistema de créditos tipo contabilidad con balance calculado. Cada operación registra amount + balanceAfter.

4. **On-chain verification**: Los pagos con KairosCoin se verifican leyendo logs de Transfer del contrato ERC20 directamente del blockchain (ethers.js).

5. **Worker separation**: El worker es un proceso separado (no serverless) para poder correr jobs largos (generación de video puede tardar minutos).

6. **Dark theme**: UI con tema oscuro, primary color purple (HSL 262 83% 58%).

7. **Token rebranding**: El token de pago es **KairosCoin (KRS)** — un stablecoin BEP20 en BSC. Todas las referencias fueron migradas de KaizenCoin → KairosCoin.

---

## 10. DEPLOYMENT (Render)

**Plataforma elegida:** Render (https://render.com)

### Servicios en Render:
| Servicio | Tipo | Plan |
|----------|------|------|
| `kaizen-web` | Web Service | Starter ($7/mo) |
| `kaizen-worker` | Background Worker | Starter ($7/mo) |
| `kaizen-db` | PostgreSQL | Free (256MB) → Starter ($7/mo) |
| `kaizen-redis` | Redis | Free (25MB) → Starter ($10/mo) |

### Archivos de deploy:
- `render.yaml` — Blueprint (Infrastructure as Code)
- `/api/health` — Health check endpoint

### Pasos para deployar:
1. Generar migración inicial: `./scripts/create-migration.sh init` (requiere DB local con Docker)
2. Push repo a GitHub
3. En Render → "New" → "Blueprint" → seleccionar repo
4. Crear Redis manualmente ("New" → "Redis") con nombre `kaizen-redis`
5. Configurar env vars marcadas como `sync: false` (API keys, etc.)
6. Render detecta `render.yaml` y crea web + worker + postgres automáticamente
7. El build ejecuta `prisma migrate deploy` automáticamente

### Worker Health Check:
- El worker expone HTTP en `:8080` con estado de los 3 workers
- Render puede monitorearlo via HTTP health check

### Storage (S3):
- Opción recomendada: **Cloudflare R2** (0 egress fees, S3-compatible)
- Alternativa: AWS S3 directamente

---

## 11. CÓMO CONTINUAR EN UN NUEVO CHAT

Pega esta instrucción al agente:

```
Estoy trabajando en el proyecto Kaizen AI Marketing Engine.
Ubicación: /Users/marioisaacrodriguezdelrey/Projects/kaizen-ai-marketing/
Lee el archivo .github/PROJECT-CONTEXT.md para entender todo el contexto del proyecto.
El proyecto ya compila (next build pasa). Continúa desde donde se quedó la sección 8 "Por implementar".
```

---

*Este archivo se actualiza manualmente o por el agente al final de cada sesión de trabajo.*
