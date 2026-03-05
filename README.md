# Kaizen AI Marketing Engine

> Automated AI video generation + social publishing + KairosCoin payments

## Architecture

```
kaizen-ai-marketing/
├── apps/
│   ├── web/          # Next.js 14 (App Router) — UI + API routes
│   └── worker/       # BullMQ workers — content gen, publishing, payments
├── packages/
│   └── shared/       # Types, constants, crypto, validators, provider interfaces
├── docker-compose.yml  # Postgres, Redis, MinIO (S3-compatible)
└── .env.example        # All environment variables
```

## Quick Start

### 1. Prerequisites
- **Node.js** ≥ 20
- **pnpm** ≥ 9
- **Docker** (for Postgres, Redis, MinIO)

### 2. Setup

```bash
# Clone & install
cd kaizen-ai-marketing
pnpm install

# Start infrastructure
docker compose up -d

# Copy env
cp .env.example .env
# → Edit .env with your API keys

# Setup database
pnpm db:push
pnpm db:seed

# Start development
pnpm dev      # Web app on http://localhost:3000
pnpm worker   # BullMQ workers (separate terminal)
```

### 3. Demo Accounts
After running `pnpm db:seed`:
| Email | Password | Role |
|-------|----------|------|
| admin@kaizen.ai | (SEED_ADMIN_PASSWORD or admin123) | ADMIN |
| demo@kaizen.ai | (SEED_DEMO_PASSWORD or demo123) | USER |

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Backend | Next.js API Routes, Prisma ORM |
| Database | PostgreSQL 16 |
| Queue | BullMQ + Redis |
| Storage | S3-compatible (AWS S3 / MinIO) |
| AI | OpenAI GPT-4o (scripts), TTS, Video gen |
| Payments | KairosCoin (BEP20 stablecoin on BSC) + ethers.js |
| Auth | NextAuth v4 (Credentials + Google) |

## Key Features

- 🎬 **AI Video Pipeline** — Script → Voice → Video generation
- 📱 **Multi-Platform Publishing** — Instagram, Facebook, TikTok, YouTube, X
- 🪙 **KairosCoin Payments** — BEP20 stablecoin on-chain verification
- 📅 **Content Calendar** — Schedule and visualize posts
- 🎨 **Brand Kit** — Centralized brand identity management
- 🔐 **Encrypted Token Vault** — AES-256-GCM for social tokens
- 📊 **Admin Dashboard** — Platform monitoring and management

## Environment Variables

See `.env.example` for all required variables. Key ones:

```bash
DATABASE_URL=postgresql://kaizen:kaizen@localhost:5432/kaizen
REDIS_URL=redis://localhost:6379
NEXTAUTH_SECRET=your-secret-here
OPENAI_API_KEY=sk-...
```

## Scripts

```bash
pnpm dev          # Start web app (dev mode)
pnpm build        # Build for production
pnpm worker       # Start BullMQ workers
pnpm db:push      # Push Prisma schema to DB
pnpm db:seed      # Seed demo data
pnpm db:studio    # Open Prisma Studio
```

## License

Private — All rights reserved.
