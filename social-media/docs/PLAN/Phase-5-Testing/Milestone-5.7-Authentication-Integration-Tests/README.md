# Milestone 5.7 - Authentication Integration Tests

## Problem Statement
Authentication integration tests verify the complete authentication flow works end-to-end including JWT token generation, validation, refresh, and logout. These tests ensure the security layer is robust and handles edge cases properly.

## Success Metrics
- All auth endpoints tested with real database
- JWT token lifecycle validated
- Token refresh flow works correctly
- Logout invalidates tokens properly
- Security edge cases covered

## Non-Goals
- Password hashing implementation details
- Rate limiting (separate milestone)
- Social OAuth testing (future phase)

## Items

### Item 5.7.1 - Registration Flow Integration Tests
**Type:** Integration Test
**Description:** End-to-end registration flow testing.
**Acceptance Criteria:**
- Test successful registration creates user in DB
- Test password is hashed in database
- Test duplicate email rejection (409)
- Test invalid email format rejection (400)
- Test weak password rejection (400)
- Test missing required fields rejection
- Test response includes user data (no password)
- Test automatic login on registration
- Verify user record in database
**Passes:** false

### Item 5.7.2 - Login Flow Integration Tests
**Type:** Integration Test
**Description:** End-to-end login flow with JWT tokens.
**Acceptance Criteria:**
- Test valid credentials return access + refresh tokens
- Test invalid email returns 401
- Test invalid password returns 401
- Test non-existent user returns 401
- Test access token is valid JWT
- Test refresh token is valid JWT
- Test token expiry times are correct
- Test response includes user data
- Verify tokens stored correctly
**Passes:** false

### Item 5.7.3 - Token Refresh Integration Tests
**Type:** Integration Test
**Description:** JWT token refresh flow testing.
**Acceptance Criteria:**
- Test valid refresh token returns new access token
- Test invalid refresh token rejection (401)
- Test expired refresh token rejection (401)
- Test refresh token rotation (new refresh token)
- Test old refresh token invalidation
- Test access token contains correct claims
- Test refresh token blacklisting
- Test sequence of multiple refreshes
**Passes:** false

### Item 5.7.4 - Logout Integration Tests
**Type:** Integration Test
**Description:** Logout flow and token invalidation.
**Acceptance Criteria:**
- Test logout invalidates access token
- Test logout invalidates refresh token
- Test access after logout returns 401
- Test refresh after logout returns 401
- Test token blacklist in database
- Test concurrent logout scenarios
- Verify tokens marked as revoked
**Passes:** false

### Item 5.7.5 - Protected Route Access Tests
**Type:** Integration Test
**Description:** Verify protected routes require valid authentication.
**Acceptance Criteria:**
- Test protected route with valid token (200)
- Test protected route without token (401)
- Test protected route with expired token (401)
- Test protected route with invalid token (401)
- Test protected route with malformed token (401)
- Test user ID extracted from token correctly
- Test X-User-ID header injection
**Passes:** false

### Item 5.7.6 - Session Management Tests
**Type:** Integration Test
**Description:** Multi-device and concurrent session handling.
**Acceptance Criteria:**
- Test multiple logins from different devices
- Test independent token pairs per session
- Test logout from one device doesn't affect others
- Test device tracking in token claims
- Test session listing (if implemented)
- Test global logout (all sessions)
**Passes:** false

## Affected Files
- `backend/tests/integration/auth_test.go`
- `backend/tests/integration/auth_refresh_test.go`
- `backend/tests/integration/auth_logout_test.go`
- `backend/tests/integration/auth_protected_test.go`

## Affected Dependencies
- testify/suite
- golang-jwt/jwt/v5
- testcontainers-go

## Notes
- Use time manipulation for token expiry tests
- Verify JWT signatures are valid
- Test both access and refresh tokens
- Use blackbox approach (public endpoints only)
