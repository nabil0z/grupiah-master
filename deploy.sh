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

# 1.5. Install dependencies (picks up new packages)
echo "📦 Installing dependencies..."
npm install

# 2. Build provider-adapters (dependency)
echo "📦 Building provider-adapters..."
cd packages/provider-adapters && npm run build && cd ../..

# 3. Database migration + Prisma Client generate
echo "🗄️  Syncing database schema..."
npx prisma db push --schema=./packages/database/prisma/schema.prisma --accept-data-loss
npx prisma generate --schema=./packages/database/prisma/schema.prisma
echo "✅ Database synced!"

# 4. Build API (nest build handles TS compilation + asset copying)
echo "🔧 Building API..."
npm run build --workspace=grupiah-api

# 5. Build TMA Client
echo "📱 Building TMA Client..."
VITE_API_URL=$API_URL npm run build --workspace=tma-client

# 5.5. Build TMA Landing
echo "🌍 Building TMA Landing..."
npm run build --workspace=tma-landing

# 6. Build Admin TMA
echo "📱 Building Admin TMA..."
VITE_API_URL=$API_URL npm run build --workspace=admin-tma

# 7. Build Admin Dashboard (Next.js)
echo "🖥️  Building Admin Dashboard..."
NEXT_PUBLIC_API_URL=$API_URL npm run build --workspace=admin-dashboard

# 8. Restart ALL services
echo "🔄 Restarting services..."
fuser -k 53000/tcp 2>/dev/null || true
sleep 2

# Stop all grupiah services
pm2 delete all 2>/dev/null || true

# API: cluster mode (port 53000)
pm2 start apps/api/dist/src/main.js --name grupiah-api -i max

# Bot (port 53001)
pm2 start apps/bot/dist/main.js --name grupiah-bot

# TMA Client (port 53002)
pm2 start "npx serve /opt/grupiah/apps/tma-client/dist -l 53002 -s" --name grupiah-client

# TMA Landing (port 53004 → grupiah.online)
pm2 start "npx serve /opt/grupiah/apps/tma-landing/dist -l 53004 -s" --name grupiah-landing

# Admin Dashboard (port 53006 → admin.grupiah.online)
pm2 start "npx serve /opt/grupiah/apps/admin-dashboard/out -l 53006 -s" --name grupiah-admin

# Admin TMA (port 53007)
pm2 start "npx serve /opt/grupiah/apps/admin-tma/dist -l 53007 -s" --name grupiah-admin-tma

pm2 save

echo "================================"
echo "✅ Deploy complete!"
pm2 status
