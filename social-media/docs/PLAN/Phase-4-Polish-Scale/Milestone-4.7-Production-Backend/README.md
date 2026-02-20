# Milestone 4.7 - Production Backend

## Problem Statement
The backend services work in development but lack production-ready features such as caching, rate limiting, observability, high availability, and security hardening. Without these capabilities, the system cannot handle production traffic, diagnose issues, or maintain reliability under load. This milestone productionizes all Go backend services.

## Success Metrics
- API response time p95 <200ms with caching
- Rate limiting: 100 requests/minute per user
- 99.9% uptime (less than 8.76 hours downtime/year)
- Mean time to detection (MTTD) <5 minutes
- Mean time to recovery (MTTR) <30 minutes
- Zero critical security vulnerabilities
- Horizontal scaling to 3+ instances
- Load test: 10,000 concurrent users

## Non-Goals
- Kubernetes orchestration - Future phase
- Multi-region deployment - Future phase
- Machine learning recommendations - Future phase
- GraphQL API layer - Future phase
- Edge computing/CloudFlare Workers - Future phase

## Items

### Item 4.7.1 - Redis Caching Layer
**Type:** Infrastructure
**Description:** Implement comprehensive caching strategy with Redis.
**Acceptance Criteria:**
- `internal/cache/cache.go` with CacheService
- Cache strategies:
  - User profile: 5 minutes
  - Feed: 5 minutes (invalidate on new post)
  - Post details: 10 minutes
  - Session tokens: TTL-based
  - Rate limit counters: 1 minute
- Cache-aside pattern with lazy loading
- Cache invalidation on writes
- Redis clusters support (sentinel mode)
- Cache metrics (hit rate, miss rate, eviction)
- Fallback to database on cache failure
**Passes:** false

### Item 4.7.2 - Rate Limiting Middleware
**Type:** Infrastructure
**Description:** Implement rate limiting to prevent abuse and ensure fair usage.
**Acceptance Criteria:**
- `internal/middleware/ratelimit.go` with RateLimiter
- Algorithms: Token bucket or sliding window
- Limits:
  - API: 100 requests/minute per user
  - Auth: 5 requests/minute per IP
  - WebSocket: 50 messages/second per connection
- Redis-based distributed rate limiting
- Rate limit headers:
  - `X-RateLimit-Limit`
  - `X-RateLimit-Remaining`
  - `X-RateLimit-Reset`
- 429 Too Many Requests response
- Exponential backoff suggestions
- Whitelist for internal services
**Passes:** false

### Item 4.7.3 - Structured Logging Enhancement
**Type:** Infrastructure
**Description:** Implement production-grade structured logging.
**Acceptance Criteria:**
- `internal/logging/logger.go` with zerolog or zap
- JSON format for production, console for dev
- Log levels: DEBUG, INFO, WARN, ERROR, FATAL
- Correlation IDs (trace_id, span_id)
- Contextual logging (user_id, request_id, endpoint)
- Log sampling for high-volume endpoints
- PII redaction (emails, tokens, passwords)
- Log rotation and retention (30 days)
- Centralized logging (ELK stack ready)
**Passes:** false

### Item 4.7.4 - Metrics Collection (Prometheus)
**Type:** Infrastructure
**Description:** Implement metrics collection and exposition.
**Acceptance Criteria:**
- `internal/metrics/prometheus.go` with metrics registry
- Metrics collected:
  - HTTP request duration (histogram)
  - HTTP request count (counter by status, endpoint)
  - WebSocket connections (gauge)
  - Database query duration (histogram)
  - Cache hit/miss ratio (gauge)
  - Rate limit rejections (counter)
  - Error count by type (counter)
- `/metrics` endpoint for Prometheus scraping
- Custom business metrics (posts created, notifications sent)
- Service-specific dashboards (Grafana)
- Alert rules (Prometheus Alertmanager)
**Passes:** false

### Item 4.7.5 - Distributed Tracing (OpenTelemetry)
**Type:** Infrastructure
**Description:** Implement distributed tracing for request flow visibility.
**Acceptance Criteria:**
- `internal/tracing/tracing.go` with OpenTelemetry setup
- Trace context propagation (W3C trace context)
- Spans for:
  - HTTP handlers
  - Database queries
  - Redis operations
  - External API calls
  - WebSocket events
- Export to Jaeger or Tempo
- Trace sampling (10% for production)
- Trace ID in log correlation
- Service graph (dependency visualization)
- Latency breakdown by service
**Passes:** false

### Item 4.7.6 - Health Checks & Readiness Probes
**Type:** Infrastructure
**Description:** Implement comprehensive health checking.
**Acceptance Criteria:**
- `GET /healthz` - Liveness probe (always up if running)
- `GET /readyz` - Readiness probe (checks dependencies)
- Readiness checks:
  - Database connection
  - Redis connection
  - Required config present
- `GET /healthz/live` - Detailed liveness
- `GET /healthz/ready` - Detailed readiness
- Kubernetes probe compatible
- Health check interval: 10 seconds
- Unhealthy auto-restart (Kubernetes)
- Not ready: remove from load balancer
**Passes:** false

### Item 4.7.7 - Circuit Breaker Pattern
**Type:** Infrastructure
**Description:** Implement circuit breaker for fault tolerance.
**Acceptance Criteria:**
- `internal/resilience/circuit_breaker.go` with gobreaker
- Circuit states: Closed, Open, Half-Open
- Failure threshold: 5 failures in 10 seconds
- Recovery timeout: 30 seconds
- Applied to:
  - Database queries
  - Redis operations
  - External API calls
- Fallback behavior on open circuit
- Metrics: circuit state, failure count
- Manual reset capability
**Passes:** false

### Item 4.7.8 - Graceful Shutdown & Drain
**Type:** Infrastructure
**Description:** Implement graceful shutdown for zero-downtime deployments.
**Acceptance Criteria:**
- SIGTERM and SIGINT handling
- Shutdown sequence:
  1. Stop accepting new connections
  2. Drain existing requests (30s timeout)
  3. Close database connections
  4. Close Redis connections
  5. Flush logs and metrics
- WebSocket connection drain notification
- In-flight request completion
- Kubernetes preStop hook
- Max shutdown time: 60 seconds
**Passes:** false

### Item 4.7.9 - Database Connection Pooling Optimization
**Type:** Infrastructure
**Description:** Optimize database connection pooling for production.
**Acceptance Criteria:**
- Connection pool configuration:
  - Max connections: 100
  - Min idle: 10
  - Max lifetime: 30 minutes
  - Max idle time: 5 minutes
- Connection health checks
- Leak detection (5 minute timeout)
- Pool metrics (active, idle, waiting)
- Query timeout: 10 seconds
- Retry logic for transient failures
- Read replicas support (prepare)
**Passes:** false

### Item 4.7.10 - API Gateway Setup
**Type:** Infrastructure
**Description:** Set up API Gateway for routing and cross-cutting concerns.
**Acceptance Criteria:**
- Traefik or Kong configuration
- Routing rules:
  - `/api/v1/auth/*` → Auth Service (8080)
  - `/api/v1/posts/*` → Posts Service (8081)
  - `/api/v1/realtime/*` → Realtime Service (8082)
  - `/ws` → Realtime Service (WebSocket upgrade)
- Cross-cutting middleware:
  - CORS
  - Request ID
  - Rate limiting (global)
  - Authentication verification
- SSL/TLS termination
- Request/Response logging
- Circuit breaker at gateway level
**Passes:** false

### Item 4.7.11 - Security Hardening
**Type:** Security
**Description:** Implement production security measures.
**Acceptance Criteria:**
- HTTPS enforcement (HSTS)
- Security headers:
  - X-Content-Type-Options: nosniff
  - X-Frame-Options: DENY
  - X-XSS-Protection: 1; mode=block
  - Content-Security-Policy
- SQL injection prevention (parameterized queries)
- XSS prevention (input sanitization)
- CSRF protection for state-changing operations
- JWT security:
  - RS256 algorithm (asymmetric)
  - Key rotation support
  - Short-lived access tokens
- Dependency vulnerability scanning (gosec, snyk)
- OWASP Top 10 compliance
**Passes:** false

### Item 4.7.12 - Backup & Recovery Procedures
**Type:** Infrastructure
**Description:** Implement backup and disaster recovery.
**Acceptance Criteria:**
- PostgreSQL backup script (pg_dump)
- Daily full backups, hourly WAL archiving
- Backup retention: 30 days
- Backup encryption (AES-256)
- Off-site backup storage (S3)
- Recovery procedure documented
- Recovery time objective (RTO): 4 hours
- Recovery point objective (RPO): 1 hour
- Backup verification (restore test monthly)
**Passes:** false

### Item 4.7.13 - Docker Production Images
**Type:** Infrastructure
**Description:** Create production-optimized Docker images.
**Acceptance Criteria:**
- Multi-stage Dockerfile:
  - Stage 1: Build (Go 1.21)
  - Stage 2: Runtime (distroless or alpine)
- Image size <50MB (without dependencies)
- Non-root user (security)
- Read-only filesystem
- Health check in Dockerfile
- Labels for versioning:
  - `org.opencontainers.image.version`
  - `org.opencontainers.image.created`
- Docker Compose for production
- Image scanning (trivy, grype)
**Passes:** false

### Item 4.7.14 - CI/CD Pipeline
**Type:** Infrastructure
**Description:** Set up continuous integration and deployment.
**Acceptance Criteria:**
- GitHub Actions workflow:
  - Lint (golangci-lint)
  - Test (go test with coverage)
  - Security scan (gosec)
  - Build (multi-arch: amd64, arm64)
  - Docker build and push
  - Deploy to staging
- Branch protection rules
- Required checks before merge
- Automated changelog generation
- Semantic versioning
- Rollback capability
- Manual approval for production
**Passes:** false

### Item 4.7.15 - Load Testing & Performance Tuning
**Type:** Test
**Description:** Conduct load testing and optimize performance.
**Acceptance Criteria:**
- k6 or Vegeta load test scripts
- Scenarios:
  - Smoke test: 100 users, 1 minute
  - Load test: 1000 users, 10 minutes
  - Stress test: ramp to 10,000 users
  - Soak test: 1000 users, 1 hour
- Performance targets:
  - p95 latency <200ms
  - Error rate <0.1%
  - Throughput >1000 req/s
- Bottleneck identification
- Optimization report
- Database query optimization
- Connection pool tuning
**Passes:** false

### Item 4.7.16 - Operations Runbook
**Type:** Documentation
**Description:** Create comprehensive operations documentation.
**Acceptance Criteria:**
- `docs/runbook.md` with:
  - Service architecture diagram
  - Deployment procedure
  - Rollback procedure
  - Incident response流程
  - On-call rotation schedule
  - Escalation matrix
  - Contact information
- Common troubleshooting:
  - High latency diagnosis
  - Memory leak investigation
  - Database connection issues
  - WebSocket disconnection debugging
- Monitoring dashboard links
- Runbook tested in game day
**Passes:** false

### Item 4.7.17 - Alerting Configuration
**Type:** Infrastructure
**Description:** Set up alerting for critical conditions.
**Acceptance Criteria:**
- Prometheus Alertmanager rules:
  - Service down (immediate, P1)
  - High error rate >1% (5 minutes, P2)
  - High latency p95 >500ms (10 minutes, P2)
  - Low disk space <20% (30 minutes, P3)
  - High memory usage >80% (15 minutes, P2)
  - Database connection pool exhausted (immediate, P1)
  - WebSocket connection drop >50% (5 minutes, P2)
- Notification channels:
  - Slack (all alerts)
  - PagerDuty (P1, P2)
  - Email (P3, digest)
- Alert suppression and grouping
- On-call rotation support
**Passes:** false

### Item 4.7.18 - Grafana Dashboards
**Type:** Infrastructure
**Description:** Create operational dashboards for monitoring.
**Acceptance Criteria:**
- Dashboard 1: Service Overview
  - Request rate, error rate, latency
  - Uptime percentage
  - Active users
- Dashboard 2: Infrastructure
  - CPU, memory, disk usage
  - Network I/O
  - Connection pool status
- Dashboard 3: Business Metrics
  - Posts created per hour
  - Notifications sent
  - WebSocket connections
  - User growth
- Dashboard 4: Database
  - Query performance
  - Cache hit rate
  - Replication lag
- Annotations for deployments
- Alert integration
**Passes:** false

## Affected Files
- `backend/internal/cache/cache.go`
- `backend/internal/middleware/ratelimit.go`
- `backend/internal/logging/logger.go`
- `backend/internal/metrics/prometheus.go`
- `backend/internal/tracing/tracing.go`
- `backend/internal/resilience/circuit_breaker.go`
- `backend/internal/config/production.go`
- `backend/cmd/auth-service/main.go` (updated)
- `backend/cmd/posts-service/main.go` (updated)
- `backend/cmd/realtime-service/main.go` (updated)
- `backend/Dockerfile.production`
- `backend/docker-compose.production.yml`
- `backend/.github/workflows/ci.yml`
- `backend/scripts/backup.sh`
- `backend/docs/runbook.md`
- `backend/configs/prometheus.yml`
- `backend/configs/alertmanager.yml`
- `backend/configs/grafana/dashboards/`
- `backend/k6/load_test.js`
- `traefik/traefik.yml`
- `traefik/dynamic/`

## Affected Dependencies
- github.com/prometheus/client_golang
- github.com/redis/go-redis/v9
- github.com/golang-migrate/migrate/v4
- go.opentelemetry.io/otel
- go.opentelemetry.io/otel/exporters/jaeger
- github.com/rs/zerolog
- github.com/sony/gobreaker
- github.com/sethvargo/go-limiter
- github.com/gosec/gosec
- sigs.k8s.io/yaml

## Notes
- Start with single-instance, design for multi-instance
- Use feature flags for gradual rollout
- Implement chaos engineering (random failures)
- Document all operational procedures
- Practice incident response (game days)
- Keep runbooks updated after incidents
- Monitor cost alongside performance
- Plan capacity for 2x growth
- Security is ongoing, not one-time
