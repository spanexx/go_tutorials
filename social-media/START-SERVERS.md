# Starting the Social Media App

This guide explains how to start both the backend and frontend servers for the Social Media application.

## Quick Start

Run the startup script to start both services at once:

```bash
./start-both.sh
```

This will start:
- **Backend**: Go Auth Service on `http://localhost:3000`
- **Frontend**: Angular App on `http://localhost:4200`

## Prerequisites

Before running the script, ensure you have:

1. **Go** - Backend is written in Go
   ```bash
   go version
   ```

2. **Node.js & npm** - Frontend is an Angular app
   ```bash
   npm --version
   ```

3. **PostgreSQL** - Database for the backend
   - Database: `socialhub`
   - User: `postgres`
   - Password: `postgres`
   - Host: `localhost:5432`

4. **Redis** (optional) - For token blacklisting
   - Default: `localhost:6379`
   - If Redis is unavailable, the app will still work with token blacklisting disabled

## Running Servers Individually

### Start Backend Only

```bash
cd backend
PORT=3000 \
DATABASE_URL="postgres://postgres:postgres@localhost:5432/socialhub?sslmode=disable" \
go run ./cmd/auth-service
```

### Start Frontend Only

```bash
npm start
```

The frontend will ask to use a different port if 4200 is already in use.

## Service Endpoints

### Backend (Go)
- **Health Check**: `GET http://localhost:3000/healthz`
- **Readiness**: `GET http://localhost:3000/readyz`
- **API Docs**: `http://localhost:3000/swagger`
- **Auth**: `/api/v1/auth/*`
- **Users**: `/api/v1/users/*`
- **Search**: `/api/v1/search`
- **Analytics**: `/api/v1/analytics/*`

### Frontend (Angular)
- **App**: `http://localhost:4200`

## Troubleshooting

### Port Already in Use
If port 4200 is already in use, the Angular CLI will ask if you want to use a different port. Type `yes` and it will use the next available port.

### Database Connection Failed
Ensure PostgreSQL is running and the `socialhub` database exists:

```bash
# Create database if it doesn't exist
sudo -u postgres psql -c "CREATE DATABASE socialhub;"

# Set password for postgres user
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';"
```

### Redis Connection Failed
Redis is optional. If unavailable:
- The backend will start with a warning
- Token blacklisting will be disabled
- All other features will work normally

## Stopping the Services

Press `Ctrl+C` in the terminal running `./start-both.sh` to stop both services gracefully.

## Manual Cleanup

If services don't stop properly:

```bash
# Kill backend
pkill -f "go run ./cmd/auth-service"

# Kill frontend
pkill -f "ng serve"
```

## Environment Variables

You can customize the startup by modifying these variables in `start-both.sh` or setting them before running:

```bash
export PORT=3000
export DATABASE_URL="postgres://postgres:postgres@localhost:5432/socialhub?sslmode=disable"
export REDIS_URL="redis://localhost:6379"
./start-both.sh
```

## API Example

### Register a new user
```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "username": "username"
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

For more API endpoints, visit the Swagger documentation at `http://localhost:3000/swagger`

## Project Structure

```
social-media/
├── start-both.sh          # Main startup script
├── backend/               # Go backend service
│   ├── cmd/               # Command entry points
│   ├── internal/          # Internal packages
│   ├── go.mod             # Go module file
│   └── Makefile           # Build commands
├── src/                   # Angular frontend
│   ├── app/               # Application components
│   ├── main.ts            # Application entry point
│   └── index.html         # HTML template
└── package.json           # Frontend dependencies
```

## Development

### Making Changes

**Backend Changes**:
- Edit files in `backend/internal/`
- The backend will auto-reload on save (if using a file watcher)
- Or restart with `./start-both.sh`

**Frontend Changes**:
- Edit files in `src/`
- Angular CLI will auto-compile and refresh the browser

### Building for Production

**Frontend**:
```bash
npm run build
```

**Backend**:
```bash
cd backend
make build
```

## Additional Resources

- [Backend README](./backend/README.md)
- [Project Documentation](./docs/)
- [API Planning](./docs/PLAN/GO-BACKEND-PLAN-SUMMARY.md)
