#!/bin/bash

# Social Media App - Start Both Backend and Frontend
# This script starts the Go backend (port 3000) and Angular frontend (port 4200)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$SCRIPT_DIR/backend"
FRONTEND_DIR="$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Starting Social Media App ===${NC}"
echo ""

# Check if backend database is initialized
echo -e "${BLUE}Checking backend requirements...${NC}"
if ! command -v go &> /dev/null; then
    echo -e "${RED}Error: Go is not installed${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}Error: npm is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Dependencies found${NC}"
echo ""

# Start backend in background
echo -e "${BLUE}Starting Go Backend (port 3000)...${NC}"
cd "$BACKEND_DIR"
PORT=3000 \
DATABASE_URL="postgres://postgres:postgres@localhost:5432/socialhub?sslmode=disable" \
REDIS_URL="redis://localhost:6379" \
go run ./cmd/auth-service &
BACKEND_PID=$!
echo -e "${GREEN}✓ Backend started (PID: $BACKEND_PID)${NC}"
echo ""

# Give backend time to start
sleep 3

# Start frontend in background
echo -e "${BLUE}Starting Angular Frontend (port 4200)...${NC}"
cd "$FRONTEND_DIR"
npm start &
FRONTEND_PID=$!
echo -e "${GREEN}✓ Frontend started (PID: $FRONTEND_PID)${NC}"
echo ""

echo -e "${GREEN}=== Both services are running ===${NC}"
echo ""
echo -e "Backend:  ${BLUE}http://localhost:3000${NC}"
echo -e "Frontend: ${BLUE}http://localhost:4200${NC}"
echo ""
echo -e "Health Check: ${BLUE}http://localhost:3000/healthz${NC}"
echo -e "API Docs:     ${BLUE}http://localhost:3000/swagger${NC}"
echo ""
echo -e "${BLUE}Press Ctrl+C to stop all services${NC}"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${BLUE}Stopping services...${NC}"
    kill $BACKEND_PID 2>/dev/null || true
    kill $FRONTEND_PID 2>/dev/null || true
    echo -e "${GREEN}✓ Services stopped${NC}"
}

# Set trap to cleanup on script exit
trap cleanup EXIT

# Wait for both processes
wait
