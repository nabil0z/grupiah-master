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

# Stop all PM2 processes first
pm2 delete all 2>/dev/null || true
sleep 1

# Kill ALL grupiah ports to prevent conflicts
for port in 53000 53001 53002 53004 53006 53007; do
    fuser -k $port/tcp 2>/dev/null || true
done
sleep 2

# API: cluster mode (port 53000) — START FIRST
pm2 start apps/api/dist/src/main.js --name grupiah-api -i max

# Wait for API to be ready before starting other services
echo "⏳ Waiting for API to be ready on port 53000..."
for i in $(seq 1 30); do
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:53000/ 2>/dev/null | grep -q "200\|404\|401"; then
        echo "   ✅ API ready! (${i}s)"
        break
    fi
    sleep 1
    echo -n "."
done
echo ""

# Bot (port 53001)
pm2 start apps/bot/dist/main.js --name grupiah-bot

# TMA Client (port 53002)
pm2 start "npx serve@latest /opt/grupiah/apps/tma-client/dist -l 53002 -s" --name grupiah-client
sleep 3

# TMA Landing (port 53004 → grupiah.online)
pm2 start "npx serve@latest /opt/grupiah/apps/tma-landing/dist -l 53004 -s" --name grupiah-landing
sleep 3

# Admin Dashboard (port 53006 → admin.grupiah.online)
pm2 start "npx serve@latest /opt/grupiah/apps/admin-dashboard/out -l 53006 -s" --name grupiah-admin
sleep 3

# Admin TMA (port 53007)
pm2 start "npx serve@latest /opt/grupiah/apps/admin-tma/dist -l 53007 -s" --name grupiah-admin-tma
sleep 3

pm2 save

# Health check
sleep 3
echo ""
echo "🔍 Port Health Check:"
for port in 53000 53002 53004 53006 53007; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$port/ 2>/dev/null || echo "FAIL")
    if [ "$STATUS" = "200" ]; then
        echo "   ✅ Port $port: OK"
    else
        echo "   ❌ Port $port: $STATUS"
    fi
done

echo ""
echo "================================"
echo "✅ Deploy complete!"
pm2 status
