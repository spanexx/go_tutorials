# SocialHub Auth Service

Authentication service for the SocialHub platform, built with Go and Gin.

## Features

- User registration and login
- JWT-based authentication
- Refresh token support
- Email verification
- Profile management
- Swagger API documentation

## Quick Start

### Prerequisites

- Go 1.21+
- PostgreSQL 16+
- Redis 7+
- Docker & Docker Compose (optional)

### Development Setup

1. **Install dependencies:**
   ```bash
   make deps
   ```

2. **Set up environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Run with Docker Compose:**
   ```bash
   make docker-run
   ```

### Logs & Debugging

#### View Docker logs
```bash
# All services
docker-compose logs -f

# Specific services
docker-compose logs -f auth-service
docker-compose logs -f postgres
docker-compose logs -f redis
```

#### Request correlation (request_id)
The backend emits a `request_id` field in request logs and also returns it as an `X-Request-ID` response header.

- If the client sends `X-Request-ID`, the server will reuse it.
- Otherwise, the server generates a UUID.

Use the `request_id` value to correlate:
- Request logs (middleware)
- Handler logs (e.g. `[AUTH]`, `[SEARCH]`)

Example log fields:
- `request_id`
- `status`
- `method`
- `path`
- `latency`

   Or run locally:
   ```bash
   # Start PostgreSQL and Redis
   docker-compose up -d postgres redis

   # Run migrations
   make migrate-up DATABASE_URL="postgres://postgres:postgres@localhost:5432/socialhub?sslmode=disable"

   # Run the service
   make run
   ```

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/login` | Login user |
| POST | `/api/v1/auth/logout` | Logout user |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| GET | `/api/v1/auth/verify/:token` | Verify email |
| GET | `/api/v1/auth/me` | Get current user |
| PUT | `/api/v1/user/profile` | Update profile |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/healthz` | Health check |
| GET | `/readyz` | Readiness check |

### Documentation

Swagger UI is available at: `http://localhost:8080/swagger/index.html`

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | Server port |
| `DATABASE_URL` | - | PostgreSQL connection string |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string |
| `JWT_SECRET` | - | JWT signing secret (required) |
| `JWT_EXPIRY` | `15m` | Access token expiry |
| `REFRESH_EXPIRY` | `168h` | Refresh token expiry (7 days) |
| `ENV` | `development` | Environment name |

## Project Structure

```
backend/
├── cmd/
│   └── auth-service/
│       └── main.go           # Application entry point
├── internal/
│   ├── auth/
│   │   └── jwt.go            # JWT token management
│   ├── config/
│   │   └── config.go         # Configuration loading
│   ├── handlers/
│   │   └── auth_handler.go   # HTTP handlers
│   ├── http/
│   │   └── server.go         # HTTP server setup
│   ├── middleware/
│   │   ├── middleware.go     # Common middleware
│   │   └── auth_middleware.go # Auth middleware
│   ├── repository/
│   │   └── repository.go     # Database repository
│   └── service/
│       └── auth_service.go   # Business logic
├── migrations/
│   ├── 000001_create_users_table.up.sql
│   └── 000001_create_users_table.down.sql
├── docker-compose.yml
├── Dockerfile
├── Makefile
└── go.mod
```

## Development Commands

```bash
make build          # Build the application
make run            # Run the application
make test           # Run tests
make test-coverage  # Run tests with coverage
make clean          # Clean build artifacts
make migrate-up     # Run migrations up
make migrate-down   # Run migrations down
make docs           # Generate Swagger docs
make lint           # Run linter
make fmt            # Format code
```

## Testing

```bash
# Run all tests
make test

# Run with coverage
make test-coverage

# Run specific test
go test -v ./internal/service -run TestAuthService_Register
```

## License

MIT
