# Milestone 5.6 - API Integration Tests

## Problem Statement
API integration tests verify that all backend endpoints work correctly with real database and service layers. These tests validate the full request-response cycle including authentication, validation, and database persistence.

## Success Metrics
- All API endpoints have integration tests
- Tests run against real test database
- HTTP status codes verified for all scenarios
- Request/response contracts validated
- Authentication flows work end-to-end

## Non-Goals
- Frontend testing (covered in Milestones 5.4-5.5)
- E2E browser testing (covered in Milestones 5.9-5.10)
- Load/performance testing (future phase)

## Items

### Item 5.6.1 - Posts API Integration Tests
**Type:** Integration Test
**Description:** Integration tests for post endpoints with real database.
**Acceptance Criteria:**
- Test POST /api/v1/posts creates post in DB
- Test GET /api/v1/posts/:id retrieves correct post
- Test PUT /api/v1/posts/:id updates post
- Test DELETE /api/v1/posts/:id soft deletes
- Test GET /api/v1/feed returns posts array
- Test pagination parameters work
- Test content validation (max length)
- Test 404 for non-existing post
- Test 403 for unauthorized update/delete
- Test with real database and migrations
**Passes:** false

### Item 5.6.2 - Comments API Integration Tests
**Type:** Integration Test
**Description:** Integration tests for comment endpoints.
**Acceptance Criteria:**
- Test POST /api/v1/posts/:id/comments creates comment
- Test nested reply creation with parent_id
- Test GET /api/v1/posts/:id/comments lists comments
- Test GET /api/v1/comments/:id/tree returns tree
- Test DELETE /api/v1/comments/:id authorization
- Test comment depth limit enforcement
- Test pagination with has_more flag
- Verify database persistence
**Passes:** false

### Item 5.6.3 - Reactions API Integration Tests
**Type:** Integration Test
**Description:** Integration tests for reaction endpoints.
**Acceptance Criteria:**
- Test POST /api/v1/posts/:id/reactions creates reaction
- Test reaction upsert (update existing)
- Test DELETE /api/v1/posts/:id/reactions removes
- Test GET /api/v1/posts/:id/reactions returns counts
- Test valid reaction types only
- Test toggle behavior in database
- Verify reaction counts update correctly
**Passes:** false

### Item 5.6.4 - Follow API Integration Tests
**Type:** Integration Test
**Description:** Integration tests for follow endpoints.
**Acceptance Criteria:**
- Test POST /api/v1/users/:id/follow creates follow
- Test DELETE /api/v1/users/:id/follow removes
- Test GET /api/v1/users/:id/followers pagination
- Test GET /api/v1/users/:id/following pagination
- Test self-follow rejection (400)
- Test duplicate follow handling
- Verify follow relationship in DB
**Passes:** false

### Item 5.6.5 - Users API Integration Tests
**Type:** Integration Test
**Description:** Integration tests for user management endpoints.
**Acceptance Criteria:**
- Test GET /api/v1/users/:id retrieves profile
- Test GET /api/v1/users/:username retrieves by username
- Test PUT /api/v1/users/:id updates profile
- Test GET /api/v1/users/search?q= query
- Test username uniqueness validation
- Test email uniqueness validation
- Verify user data persistence
**Passes:** false

### Item 5.6.6 - API Contract Validation
**Type:** Integration Test
**Description:** Validate API request/response contracts against OpenAPI spec.
**Acceptance Criteria:**
- Test all request DTOs match OpenAPI spec
- Test all response DTOs match OpenAPI spec
- Test error response format consistency
- Test field types and validation rules
- Test required vs optional fields
- Generate contract test reports
**Passes:** false

### Item 5.6.7 - Test Database Setup
**Type:** Test Infrastructure
**Description:** Setup integration test infrastructure with test database.
**Acceptance Criteria:**
- Test database migrations run
- Test fixtures seed initial data
- Cleanup between test suites
- Parallel test database isolation
- Testcontainers for PostgreSQL in CI
- Migration rollback testing
**Passes:** false

## Affected Files
- `backend/tests/integration/posts_test.go`
- `backend/tests/integration/comments_test.go`
- `backend/tests/integration/reactions_test.go`
- `backend/tests/integration/follow_test.go`
- `backend/tests/integration/users_test.go`
- `backend/tests/integration/setup_test.go`

## Affected Dependencies
- testify/suite
- testcontainers-go
- golang-migrate
- gin-gonic/gin test helpers

## Notes
- Use httptest.Server for integration tests
- Run against real PostgreSQL instance
- Clean database between test runs
- Use fixtures for test data
