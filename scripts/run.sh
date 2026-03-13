#!/bin/bash
# ATLAS Run Script — start all services in the correct order
set -e
cd "$(dirname "$0")/.."
PROJECT_ROOT="$(pwd)"

echo "=== ATLAS Quick Start ==="

# 1. Start database
echo "[1/4] Starting PostgreSQL..."
docker compose up db -d
sleep 2

# 2. Rebuild seed (fixes VersionMissing) and run migrations + seed
echo "[2/4] Seeding database (rebuilds to include migration 008)..."
cd "$PROJECT_ROOT/backend"
cargo clean -p atlas-backend 2>/dev/null || true
cargo run --bin seed

# 3. Kill any existing backend on 8080, then start backend in background
echo "[3/4] Starting backend..."
lsof -ti:8080 | xargs kill -9 2>/dev/null || true
sleep 1
cargo run &
BACKEND_PID=$!
sleep 3

# 4. Start frontend
echo "[4/4] Starting frontend..."
cd "$PROJECT_ROOT/frontend"
npm install --silent
npm run dev

# If user Ctrl+C, cleanup
trap "kill $BACKEND_PID 2>/dev/null || true" EXIT
