#!/bin/bash
# ============================================
# Generate Prisma migration
# ============================================
# Usage: ./scripts/create-migration.sh [migration-name]
#
# Prerequisites:
#   - Docker running (docker compose up -d)  
#   - Or DATABASE_URL pointing to a running PostgreSQL
#
# First time: ./scripts/create-migration.sh init
# After schema changes: ./scripts/create-migration.sh add-feature-name

set -e

MIGRATION_NAME=${1:-"init"}

echo "🔄 Generating Prisma migration: $MIGRATION_NAME"

cd "$(dirname "$0")/../apps/web"

# Generate the migration SQL
npx prisma migrate dev --name "$MIGRATION_NAME"

echo ""
echo "✅ Migration created!"
echo "📁 Check: apps/web/prisma/migrations/"
echo ""
echo "For production deploy, Render will run: prisma migrate deploy"
