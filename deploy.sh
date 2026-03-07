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

# 3. Build API
echo "🔧 Building API..."
npm run build --workspace=grupiah-api

# 4. Build TMA Client
echo "📱 Building TMA Client..."
VITE_API_URL=$API_URL npm run build --workspace=tma-client

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
pm2 restart grupiah-api grupiah-client grupiah-admin grupiah-admin-tma

echo "================================"
echo "✅ Deploy complete!"
pm2 status
