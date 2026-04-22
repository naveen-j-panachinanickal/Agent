#!/bin/zsh

set -e

APP_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Cleaning up existing processes on ports 8080 and 5173..."
lsof -ti :8080,5173 | xargs kill -9 2>/dev/null || true
echo

echo "Starting OfflineChat Spring Boot migration..."
echo

osascript -e "tell application \"Terminal\" to do script \"cd '$APP_DIR/backend' && mvn spring-boot:run\""
osascript -e "tell application \"Terminal\" to do script \"cd '$APP_DIR/frontend' && npm install && npm run dev\""

echo "Backend:  http://localhost:8080"
echo "Frontend: http://localhost:5173"
