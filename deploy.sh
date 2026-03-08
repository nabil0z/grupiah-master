#!/bin/bash
# ============================================
# GRupiah Deploy Script
# Usage: bash deploy.sh
# ============================================

set -e

API_URL="https://api.grupiah.online"

echo "🚀 GRupiah Deploy Starting..."
echo "================================"

cd /opt/grupiah

# 1. Pull latest code
echo "📥 Pulling latest code..."
git pull

# 2. Build provider-adapters (dependency)
echo "📦 Building provider-adapters..."
cd packages/provider-adapters && npm run build && cd ../..

# 3. Database migration + Prisma Client generate
echo "🗄️  Syncing database schema..."
npx prisma db push --schema=./packages/database/prisma/schema.prisma --accept-data-loss
npx prisma generate --schema=./packages/database/prisma/schema.prisma
echo "✅ Database synced!"

# 4. Build API
echo "🔧 Building API..."
npm run build --workspace=grupiah-api

# 4. Build TMA Client
echo "📱 Building TMA Client..."
VITE_API_URL=$API_URL npm run build --workspace=tma-client

# 4.5. Build TMA Landing
echo "🌍 Building TMA Landing..."
npm run build --workspace=tma-landing

# 5. Build Admin TMA
echo "📱 Building Admin TMA..."
VITE_API_URL=$API_URL npm run build --workspace=admin-tma

# 6. Build Admin Dashboard (Next.js)
echo "🖥️  Building Admin Dashboard..."
NEXT_PUBLIC_API_URL=$API_URL npm run build --workspace=admin-dashboard

# 7. Restart services
echo "🔄 Restarting services..."
fuser -k 53000/tcp 2>/dev/null || true
sleep 2
pm2 restart grupiah-api grupiah-client grupiah-admin grupiah-landing

# Restart admin-tma with SPA mode (absolute path + -s flag)
pm2 delete grupiah-admin-tma 2>/dev/null || true
pm2 start "npx serve /opt/grupiah/apps/admin-tma/dist -l 53007 -s" --name grupiah-admin-tma
pm2 save

echo "================================"
echo "✅ Deploy complete!"
pm2 status
