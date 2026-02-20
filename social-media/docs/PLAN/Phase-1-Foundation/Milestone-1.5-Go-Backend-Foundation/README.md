# Milestone 1.5 - Go Backend Foundation

## Problem Statement
The application currently relies on mock authentication with localStorage, which doesn't provide real user persistence, security, or multi-user support. A production-ready backend is needed to handle user authentication, session management, and API requests securely and scalably.

## Success Metrics
- Auth service running on port 8080
- PostgreSQL database with users table and migrations
- JWT-based authentication working end-to-end
- API endpoints respond in <100ms (p95)
- Angular frontend can authenticate against real API
- All auth endpoints covered by integration tests
- OpenAPI documentation available at `/swagger`

## Non-Goals
- OAuth/Social login (GitHub, GitLab, Google) - Phase 2
- Password reset via email - Phase 2
- Rate limiting - Phase 4
- Distributed tracing - Phase 4
- Kubernetes deployment - Phase 4

## Items

### Item 1.5.1 - Project Structure & Module Setup
**Type:** Infrastructure
**Description:** Initialize Go module and create standard project layout following Go best practices.
**Acceptance Criteria:**
- Go module initialized at `backend/go.mod` with Go 1.21+
- Directory structure created: `cmd/`, `internal/`, `pkg/`, `configs/`, `migrations/`
- `cmd/auth-service/main.go` with basic server startup
- `.gitignore` for Go projects
- `Makefile` with common commands (build, run, test, migrate)
- `docker-compose.yml` for local PostgreSQL + Redis
**Passes:** false

### Item 1.5.2 - Database Schema & Migrations
**Type:** Infrastructure
**Description:** Design and implement PostgreSQL schema for users and authentication.
**Acceptance Criteria:**
- `migrations/000001_create_users_table.up.sql` with users table
- `migrations/000001_create_users_table.down.sql` for rollback
- Users table includes: id (UUID), email (unique), username (unique), password_hash, display_name, avatar_url, bio, created_at, updated_at
- Indexes on email, username, created_at
- Migration tool configured (golang-migrate or goose)
- `make migrate-up` and `make migrate-down` commands work
**Passes:** false

### Item 1.5.3 - Configuration Management
**Type:** Infrastructure
**Description:** Implement centralized configuration with environment variable support.
**Acceptance Criteria:**
- `internal/config/config.go` with Config struct
- Supports: PORT, DATABASE_URL, REDIS_URL, JWT_SECRET, JWT_EXPIRY, ENV
- Default values for development
- Validation for required fields
- `configs/dev.yaml` and `configs/prod.yaml` examples
- Config loaded at startup and logged (excluding secrets)
**Passes:** false

### Item 1.5.4 - HTTP Server & Router Setup
**Type:** Feature
**Description:** Set up Gin HTTP server with middleware chain and health endpoints.
**Acceptance Criteria:**
- `internal/http/server.go` with Gin router setup
- Middleware: Recovery, Logger, CORS, RequestID
- Health endpoint: `GET /healthz` returns `{"status": "ok"}`
- Ready endpoint: `GET /readyz` checks DB connection
- Graceful shutdown with context timeout
- Server runs on configurable port (default 8080)
**Passes:** false

### Item 1.5.5 - Repository Layer (sqlc)
**Type:** Feature
**Description:** Implement type-safe database access using sqlc for SQL generation.
**Acceptance Criteria:**
- `sqlc.yaml` configuration file
- `internal/repository/users.sql.go` generated from SQL
- `internal/repository/users.sql` with queries: CreateUser, GetUserByID, GetUserByEmail, GetUserByUsername, UpdateUser
- `make generate` command runs sqlc
- Repository interface defined in `internal/repository/repository.go`
- All queries use transactions where appropriate
**Passes:** false

### Item 1.5.6 - Service Layer & Business Logic
**Type:** Feature
**Description:** Implement authentication business logic in service layer.
**Acceptance Criteria:**
- `internal/service/auth_service.go` with AuthService struct
- Methods: Register, Login, Logout, RefreshToken, GetCurrentUser
- Password hashing with bcrypt (cost 12)
- Email format validation
- Username validation (alphanumeric, 3-30 chars)
- Password strength validation (min 8 chars, mixed case, number)
- Duplicate email/username error handling
- Returns proper domain errors (ErrUserExists, ErrInvalidCredentials)
**Passes:** false

### Item 1.5.7 - JWT Authentication Middleware
**Type:** Feature
**Description:** Implement JWT token generation, validation, and middleware.
**Acceptance Criteria:**
- `internal/auth/jwt.go` with JWTManager struct
- Access token (15 min expiry) and Refresh token (7 day expiry)
- Claims include: user_id, email, username, exp, iat, jti
- `AuthMiddleware()` extracts and validates JWT from Authorization header
- `Bearer <token>` format supported
- Invalid/expired tokens return 401 Unauthorized
- Token refresh endpoint rotates refresh tokens
- Blacklist revoked tokens in Redis
**Passes:** false

### Item 1.5.8 - HTTP Handlers & Routes
**Type:** Feature
**Description:** Create HTTP handlers and wire up authentication routes.
**Acceptance Criteria:**
- `internal/handlers/auth_handler.go` with AuthHandler
- Routes registered in `cmd/auth-service/main.go`:
  - `POST /api/v1/auth/register`
  - `POST /api/v1/auth/login`
  - `POST /api/v1/auth/refresh`
  - `POST /api/v1/auth/logout`
  - `GET /api/v1/auth/me` (protected)
- Request/Response DTOs in `internal/dto/`
- Consistent error response format: `{ "error": "message", "code": "ERROR_CODE" }`
- Input validation before calling service layer
- HTTP status codes: 200, 201, 400, 401, 404, 409, 500
**Passes:** false

### Item 1.5.9 - API Documentation (OpenAPI/Swagger)
**Type:** Documentation
**Description:** Generate OpenAPI 3.0 documentation for all auth endpoints.
**Acceptance Criteria:**
- Swag comments on all handlers
- `make docs` generates `docs/swagger.yaml` and `docs/swagger.json`
- Swagger UI served at `GET /swagger/*`
- Documentation includes:
  - Request/response schemas
  - Authentication requirements
  - Error responses
  - Example values
- API versioning noted (`/api/v1/`)
**Passes:** false

### Item 1.5.10 - Integration Tests
**Type:** Test
**Description:** Write comprehensive integration tests for auth service.
**Acceptance Criteria:**
- `internal/handlers/auth_handler_test.go`
- Test database with testcontainers or separate DB
- Test cases:
  - Register new user (success)
  - Register duplicate email (error)
  - Login with valid credentials (success)
  - Login with invalid credentials (error)
  - Refresh token flow
  - Logout invalidates token
  - Protected route without token (401)
  - Protected route with valid token (success)
- Test coverage >80%
- `make test` runs all tests
**Passes:** false

### Item 1.5.11 - Docker & Local Development Setup
**Type:** Infrastructure
**Description:** Containerize auth service and simplify local development.
**Acceptance Criteria:**
- `Dockerfile` with multi-stage build (build + runtime)
- `docker-compose.yml` with: auth-service, postgres, redis
- `docker-compose.dev.yml` for development with hot reload
- `.env.example` with all required variables
- `README.md` with local setup instructions:
  - `docker-compose up -d` to start
  - `make migrate-up` to run migrations
  - `curl` examples for testing endpoints
- Health checks configured in Docker
**Passes:** false

### Item 1.5.12 - Frontend Integration Configuration
**Type:** Integration
**Description:** Configure Angular frontend to use real auth API instead of mocks.
**Acceptance Criteria:**
- `src/environments/environment.ts` with `apiUrl: 'http://localhost:8080'`
- `src/app/shared/services/auth.service.ts` updated to call real API
- HTTP interceptor adds JWT token to requests
- HTTP interceptor handles 401 responses (token refresh)
- CORS configured in Go backend for `http://localhost:4200`
- Login/Register flows tested end-to-end
- Session persistence works across page refreshes
- Fallback to mock API if backend unavailable (dev only)
**Passes:** false

## Affected Files
- `backend/go.mod`
- `backend/go.sum`
- `backend/cmd/auth-service/main.go`
- `backend/internal/config/config.go`
- `backend/internal/http/server.go`
- `backend/internal/handlers/auth_handler.go`
- `backend/internal/service/auth_service.go`
- `backend/internal/repository/users.sql`
- `backend/internal/repository/users.sql.go`
- `backend/internal/dto/auth_dto.go`
- `backend/internal/auth/jwt.go`
- `backend/migrations/000001_create_users_table.up.sql`
- `backend/migrations/000001_create_users_table.down.sql`
- `backend/sqlc.yaml`
- `backend/Dockerfile`
- `backend/docker-compose.yml`
- `backend/Makefile`
- `backend/.env.example`
- `backend/docs/swagger.yaml`
- `src/environments/environment.ts`
- `src/app/shared/services/auth.service.ts`
- `src/app/shared/interceptors/auth.interceptor.ts`

## Affected Dependencies
- Go 1.21+
- github.com/gin-gonic/gin
- github.com/jackc/pgx/v5
- github.com/sqlc-dev/sqlc
- github.com/golang-migrate/migrate/v4
- github.com/golang-jwt/jwt/v5
- github.com/redis/go-redis/v9
- golang.org/x/crypto/bcrypt
- github.com/swaggo/swag
- github.com/swaggo/gin-swagger
- github.com/stretchr/testify

## Notes
- Use UUIDs for user IDs (github.com/google/uuid)
- Store passwords with bcrypt, never plain text
- Use parameterized queries (sqlc handles this)
- Implement rate limiting in Phase 4, not now
- Keep business logic in service layer, not handlers
- Log all auth failures for security monitoring
- Use structured logging (zerolog or zap)
- Prepare for OAuth by having clean auth interfaces
