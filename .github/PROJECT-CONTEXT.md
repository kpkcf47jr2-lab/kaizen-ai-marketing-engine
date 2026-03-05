# 🧠 Kaizen AI Marketing Engine — Project Context & Backup

> **INSTRUCCIÓN PARA AGENTES IA:** Este documento es la fuente de verdad del proyecto. Léelo completo antes de hacer cualquier cambio. Contiene toda la arquitectura, estado actual, y próximos pasos.

> **Última actualización:** 5 de marzo de 2026  
> **Build status:** ✅ COMPILA EXITOSAMENTE (next build + worker tsc pasan)  
> **Production readiness:** ✅ Auditoría completa — listo para deploy  
> **Deployment:** 🔄 EN PROCESO — Blueprint aplicado en Render, esperando API keys  
> **Ubicación local:** `/Users/marioisaacrodriguezdelrey/Projects/kaizen-ai-marketing/`  
> **GitHub repo:** `https://github.com/kpkcf47jr2-lab/kaizen-ai-marketing-engine.git`

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
- [x] **Prisma migrations**: ✅ Generada con `prisma migrate diff --from-empty` (342 líneas SQL, sin Docker)
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

## 10. DEPLOYMENT (Render) — ESTADO ACTUAL

**Plataforma:** Render (https://render.com)  
**Workspace:** "Kairos 777's workspace" (login con Google, NO GitHub)  
**Blueprint:** "KAME" — aplicado el 5 de marzo de 2026  
**Costo total:** $14/mes (web $7 + worker $7 + DB free + Redis free)  
**Estado:** 🔄 Blueprint aplicado, servicios creándose, faltan API keys externas

### 10.1 GitHub
- **Repo:** `https://github.com/kpkcf47jr2-lab/kaizen-ai-marketing-engine.git`
- **Owner:** `kpkcf47jr2-lab`
- **Visibilidad:** Public
- **Branch:** `main`
- **Commit inicial:** 83 archivos, 14,367 líneas
- **PAT (Personal Access Token):** Guardado localmente (NO incluir en docs — GitHub Push Protection lo bloquea)
- **Push command:** Se usa temporalmente en URL y se remueve después por seguridad:
  ```bash
  git remote set-url origin https://kpkcf47jr2-lab:<TU_PAT>@github.com/kpkcf47jr2-lab/kaizen-ai-marketing-engine.git
  git push
  git remote set-url origin https://github.com/kpkcf47jr2-lab/kaizen-ai-marketing-engine.git
  ```

### 10.2 Servicios en Render
| Servicio | Tipo | Plan | Estado |
|----------|------|------|--------|
| `kaizen-web` | Web Service | Starter ($7/mo) | 🔄 Creado via Blueprint |
| `kaizen-worker` | Background Worker | Starter ($7/mo) | 🔄 Creado via Blueprint |
| `kaizen-db` | PostgreSQL | Free (256MB) | ✅ Auto-creado por Blueprint |
| `KAME-redis` | Key Value (Redis) | Free (25MB, 50 conn) | ✅ Creado manualmente |

### 10.3 Redis (creado manualmente)
- **Nombre en Render:** `KAME-redis`
- **Internal URL:** `redis://red-d6khtoqli9vc73f8d8qg:6379`
- **Región:** Oregon
- **Plan:** Free (25MB, 50 conexiones)
- **IMPORTANTE:** `render.yaml` usa `sync: false` para REDIS_URL (no `fromService`), porque el nombre no es `kaizen-redis`

### 10.4 Env Vars — Estado

#### ✅ Auto-configuradas por Render:
| Variable | Valor | Servicio |
|----------|-------|----------|
| `NODE_ENV` | `production` | web + worker |
| `NODE_VERSION` | `20` | web + worker |
| `DATABASE_URL` | Auto (fromDatabase) | web + worker |
| `NEXTAUTH_SECRET` | Auto (generateValue) | web |
| `ENCRYPTION_KEY` | Auto (generateValue) | web + worker |
| `WEB3_RPC_URL` | `https://bsc-dataseed1.binance.org/` | web + worker |
| `CHAIN_ID` | `56` | web |

#### ✅ Configuradas manualmente en Blueprint:
| Variable | Valor | Servicio |
|----------|-------|----------|
| `REDIS_URL` | `redis://red-d6khtoqli9vc73f8d8qg:6379` | web + worker |
| `KAIROSCOIN_TOKEN_ADDRESS` | `0x14D41707269c7D8b8DFa5095b38824a46dA05da3` | web + worker |
| `PAYMENT_RECEIVER_ADDRESS` | `0xda32780a6d7F4e9267D28a5C41EA75050e2A8B9B` | web + worker |

#### 🔴 FALTAN — Prioridad 1 (esenciales):
| Variable | Para qué | Cómo obtenerla | Costo |
|----------|----------|----------------|-------|
| `NEXTAUTH_URL` | Auth funcione en prod | Esperar a que Render despliegue → copiar URL del servicio web (ej: `https://kaizen-web-xxxx.onrender.com`) | Gratis |
| `OPENAI_API_KEY` | Generar scripts + thumbnails (GPT-4o + DALL-E 3) | https://platform.openai.com/api-keys → Create new secret key → agregar $10 de créditos en Billing | ~$0.01-0.03/script |
| `ELEVENLABS_API_KEY` | Voiceovers TTS | https://elevenlabs.io → Perfil → API Keys (plan Free = 10K chars/mes) | Gratis |

#### 🟡 FALTAN — Prioridad 2 (storage para assets):
| Variable | Para qué | Cómo obtenerla |
|----------|----------|----------------|
| `S3_BUCKET` | Nombre del bucket | Cloudflare R2: crear bucket `kame-assets` |
| `S3_REGION` | Región | `auto` (para R2) |
| `S3_ACCESS_KEY` | Auth de storage | R2 → Manage API Tokens → Create → Object Read & Write |
| `S3_SECRET_KEY` | Auth de storage | Mismo token de arriba |
| `S3_ENDPOINT` | URL del storage | `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` |
| **Alternativa:** AWS S3 directo (más complejo) o MinIO self-hosted |

#### 🟢 FALTAN — Prioridad 3 (Google login, opcional):
| Variable | Cómo obtenerla |
|----------|----------------|
| `GOOGLE_CLIENT_ID` | Google Cloud Console → APIs & Services → Credentials → Create OAuth client ID (Web) |
| `GOOGLE_CLIENT_SECRET` | Mismo de arriba |
| **Redirect URI:** `https://<RENDER_URL>/api/auth/callback/google` |

#### 🔵 FALTAN — Prioridad 4 (publicación en redes, cuando estés listo):
| Variable | Plataforma | URL para obtener |
|----------|------------|------------------|
| `META_APP_ID` + `META_APP_SECRET` | Facebook/Instagram | https://developers.facebook.com → Create App → Business type |
| `TIKTOK_CLIENT_KEY` + `TIKTOK_CLIENT_SECRET` | TikTok | https://developers.tiktok.com → Create App (tarda 2-5 días aprobación) |
| `X_CLIENT_ID` + `X_CLIENT_SECRET` | X/Twitter | https://developer.x.com → Portal → Create Project+App (Free tier = solo postear) |

### 10.5 Migración de BD
- **Archivo:** `prisma/migrations/0_init/migration.sql` (342 líneas SQL)
- **Lock:** `prisma/migrations/migration_lock.toml` (provider = postgresql)
- **Generado con:** `prisma migrate diff --from-empty --to-schema-datamodel` (sin Docker, sin DB local)
- **Se ejecuta en deploy:** `prisma migrate deploy` en el buildCommand de `render.yaml`

### 10.6 Archivos de deploy
- `render.yaml` — Blueprint IaC (2 services + 1 database)
- `/api/health` — Health check con verificación de DB (`SELECT 1`) + Redis (`ping`)
- Worker health: HTTP en `:8080`

### 10.7 Storage (S3)
- **Recomendado:** Cloudflare R2 (0 egress fees, S3-compatible, 10GB gratis/mes)
- **Alternativa:** AWS S3
- **URL para R2:** https://dash.cloudflare.com → R2 Object Storage

---

## 11. PRÓXIMOS PASOS INMEDIATOS (para la próxima sesión)

### Paso 1: Verificar que Render haya desplegado
- Ir a https://dashboard.render.com → Blueprint "KAME"
- Verificar que `kaizen-web` y `kaizen-worker` tengan status "Live"
- Copiar la URL del servicio web (ej: `https://kaizen-web-xxxx.onrender.com`)
- Verificar health: `curl https://<URL>/api/health`

### Paso 2: Configurar NEXTAUTH_URL
- En Render → kaizen-web → Environment → Add env var
- Key: `NEXTAUTH_URL`, Value: la URL del paso 1
- Redeploy el servicio

### Paso 3: Obtener API keys (en orden de prioridad)
1. **OPENAI_API_KEY** → https://platform.openai.com/api-keys (agregar $10 billing)
2. **ELEVENLABS_API_KEY** → https://elevenlabs.io (plan Free)
3. **S3 Storage (Cloudflare R2)** → https://dash.cloudflare.com → R2 (5 env vars)
4. Google OAuth → https://console.cloud.google.com/apis/credentials (opcional)
5. Social APIs → Meta, TikTok, X (cuando estés listo para publicar)

### Paso 4: Agregar keys a Render
- Cada key se agrega en AMBOS servicios (kaizen-web + kaizen-worker) donde aplique
- Después de agregar, Render hace auto-redeploy

### Paso 5: Probar flujo completo
1. Abrir `https://<URL>/register` → crear cuenta
2. Dashboard → Brand Kit → configurar marca
3. Dashboard → Credits → comprar con KairosCoin (o seed con FORCE_SEED=1)
4. Generar contenido (necesita OPENAI_API_KEY)
5. Ver en Library
6. Conectar red social y publicar

---

## 12. CÓMO CONTINUAR EN UN NUEVO CHAT

Pega esta instrucción al agente:

```
Estoy trabajando en el proyecto KAME (Kaizen AI Marketing Engine).
Ubicación: /Users/marioisaacrodriguezdelrey/Projects/kaizen-ai-marketing/
GitHub: https://github.com/kpkcf47jr2-lab/kaizen-ai-marketing-engine.git
Lee el archivo .github/PROJECT-CONTEXT.md para entender todo el contexto.

Estado actual:
- El código está completo y compila (next build + worker tsc pasan)
- El repo está en GitHub (83 archivos, 14,367 líneas)
- Render Blueprint "KAME" fue aplicado ($14/mes)
- Redis creado en Render (KAME-redis, Internal URL en el doc)
- FALTAN API keys externas — ver sección 10.4 del PROJECT-CONTEXT.md
- Continúa desde la sección 11 "Próximos pasos inmediatos"
```

---

## 13. HISTORIAL DE SESIONES

| Fecha | Qué se hizo |
|-------|-------------|
| 3-4 mar 2026 | Construcción completa: monorepo, schema, providers, UI, workers, KairosPay, auditoría prod round 1+2 |
| 5 mar 2026 | Git init, GitHub push (kpkcf47jr2-lab/kaizen-ai-marketing-engine), Render Redis (KAME-redis), Blueprint "KAME" aplicado, render.yaml fix (REDIS_URL sync:false). Pendiente: API keys externas |

---

*Este archivo se actualiza manualmente o por el agente al final de cada sesión de trabajo.*
