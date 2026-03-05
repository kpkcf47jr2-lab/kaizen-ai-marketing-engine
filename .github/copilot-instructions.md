# Copilot Instructions for Kaizen AI Marketing Engine

## Propósito
Plataforma SaaS de marketing automatizado con IA. Genera contenido diario (scripts, voiceovers, videos HD, thumbnails) y lo publica automáticamente en múltiples redes sociales.

## Ubicación
`/Users/marioisaacrodriguezdelrey/Projects/kaizen-ai-marketing/`

## Contexto completo
**LEE PRIMERO** → `.github/PROJECT-CONTEXT.md` — contiene toda la arquitectura, estado, schema de DB, y próximos pasos.

## Stack
- **Next.js 14.2.35** (App Router) + TypeScript + Tailwind (dark theme)
- **Prisma 5** + PostgreSQL 16 (13 modelos, 8 enums)
- **BullMQ + Redis** para jobs de generación y publicación
- **OpenAI GPT-4o** para scripts, ElevenLabs para TTS (por implementar), Remotion para video (por implementar)
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

## Comandos
```bash
pnpm dev          # Web en http://localhost:3000
pnpm build        # Build producción
pnpm worker:dev   # Workers (modo watch)
pnpm db:push      # Push schema
pnpm db:seed      # Seed demo data
docker compose up -d  # Infra local
```
