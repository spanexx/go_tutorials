# Milestone 1.6 - Email Service Integration

## Problem Statement
The authentication system requires email functionality for user verification, password reset, and notifications. Currently, no email infrastructure exists in the backend, blocking critical auth flows like email verification and password recovery.

## Success Metrics
- SMTP client integrated and tested with Ethereal Email (dev)
- Welcome email sent on user registration
- Email verification flow functional with token-based verification
- Password reset emails with secure tokens
- HTML + plain text email templates
- Email queue/async processing for reliability
- Rate limiting on email endpoints (prevent abuse)

## Non-Goals
- Production mail provider integration (SendGrid, Mailgun) - Phase 3
- Email analytics/open tracking - Phase 3
- Marketing email campaigns - Phase 4
- Multi-language email templates - Phase 3
- Attachments in emails - Phase 3

## Items

### Item 1.6.1 - Email Service Infrastructure
**Type:** Infrastructure
**Description:** Set up SMTP client and email service abstraction in Go backend.
**Acceptance Criteria:**
- `internal/email/email_service.go` with EmailService interface
- SMTP configuration in Config struct (host, port, username, password, from_address)
- Ethereal Email auto-generation for dev environment (no manual signup)
- Support for both HTML and plain text email bodies
- Email service initialization in main.go
- Test email sending capability verified
**Passes:** false

### Item 1.6.2 - Email Templates System
**Type:** Feature
**Description:** Create template system for auth-related emails.
**Acceptance Criteria:**
- `internal/email/templates/` directory
- Base template with branding (SocialHub logo, colors)
- Welcome email template (subject: "Welcome to SocialHub!")
- Email verification template with token link
- Password reset template with reset link
- Plain text fallbacks for all templates
- Template caching for performance
**Passes:** false

### Item 1.6.3 - Welcome Email on Registration
**Type:** Feature
**Description:** Send welcome email when users successfully register.
**Acceptance Criteria:**
- Welcome email triggered after successful registration
- Email includes user's name, welcome message, next steps
- Link to complete profile setup
- Async email sending (non-blocking registration response)
- Error handling (log failed emails, don't fail registration)
**Passes:** false

### Item 1.6.4 - Email Verification Flow
**Type:** Feature
**Description:** Implement complete email verification system with tokens.
**Acceptance Criteria:**
- Verification token generation (secure random, 24h expiry)
- `users` table migration: add email_verified (boolean), email_verification_token, email_verification_expires
- Verification email sent on registration (if enabled) or on demand
- `POST /api/v1/auth/verify-email` endpoint with token validation
- `POST /api/v1/auth/resend-verification` endpoint (rate limited)
- Token invalidation after successful verification
- Update auth middleware to check email_verified status (optional enforcement)
**Passes:** false

### Item 1.6.5 - Password Reset via Email
**Type:** Feature
**Description:** Allow users to reset passwords via secure email tokens.
**Acceptance Criteria:**
- `POST /api/v1/auth/forgot-password` endpoint (accepts email)
- Reset token generation (secure random, 1h expiry)
- `users` table migration: add password_reset_token, password_reset_expires
- Password reset email with secure link
- `POST /api/v1/auth/reset-password` endpoint (token + new password)
- Token validation and expiration checking
- Password validation (same rules as registration)
- Clear all reset tokens after successful reset
- Rate limiting: max 3 reset requests per email per hour
**Passes:** false

### Item 1.6.6 - Async Email Queue
**Type:** Infrastructure
**Description:** Implement background email processing for reliability.
**Acceptance Criteria:**
- Email queue using Redis ( lightweight task queue)
- `internal/email/queue.go` with QueueEmail method
- Background worker goroutine processing email queue
- Retry logic: 3 attempts with exponential backoff
- Failed email logging and dead letter queue
- Graceful shutdown handling (finish in-flight emails)
**Passes:** false

### Item 1.6.7 - Email Testing & Dev Tools
**Type:** Test
**Description:** Provide tools for testing emails in development.
**Acceptance Criteria:**
- Ethereal Email credentials auto-printed on server startup
- `GET /api/v1/admin/test-email` endpoint (dev only, sends test email)
- Email preview endpoint for template testing
- Documentation: how to view sent emails (Ethereal web inbox)
- Environment variable to disable emails (EMAIL_ENABLED=false)
**Passes:** false

### Item 1.6.8 - Rate Limiting & Security
**Type:** Security
**Description:** Prevent email abuse and ensure security.
**Acceptance Criteria:**
- Rate limiting on email-sending endpoints (Resend: 1 per 60s per email)
- Rate limiting on password reset (3 per hour per IP)
- Token entropy: minimum 32 bytes random
- HTTPS-only verification/reset links in production
- Audit logging: log all email sends with metadata
**Passes:** false

### Item 1.6.9 - Frontend Email Flow Integration
**Type:** Integration
**Description:** Update Angular frontend to handle email flows.
**Acceptance Criteria:**
- "Verify email" banner on feed if email not verified
- "Resend verification" button with cooldown
- Password reset page: email input → confirmation → new password
- Toast notifications for email-related actions
- Links in emails direct to Angular routes with token handling
**Passes:** false

### Item 1.6.10 - Email Integration Tests
**Type:** Test
**Description:** Comprehensive tests for email functionality.
**Acceptance Criteria:**
- `internal/email/email_service_test.go`
- Mock SMTP server for testing (using Ethereal or mock)
- Tests: send email, template rendering, token generation
- Integration tests for verification flow end-to-end
- Integration tests for password reset flow
- Test coverage >80% for email package
**Passes:** false

## Affected Files
- `backend/internal/email/email_service.go`
- `backend/internal/email/templates/*.html`
- `backend/internal/email/templates/*.txt`
- `backend/internal/email/queue.go`
- `backend/internal/handlers/auth_handler.go`
- `backend/internal/service/auth_service.go`
- `backend/internal/config/config.go`
- `backend/migrations/000002_add_email_fields.up.sql`
- `backend/migrations/000002_add_email_fields.down.sql`
- `src/app/pages/auth/verify-email/verify-email.component.ts` (new)
- `src/app/pages/auth/forgot-password/forgot-password.component.ts` (new)
- `src/app/pages/auth/reset-password/reset-password.component.ts` (new)
- `src/app/shared/services/auth.service.ts`

## Affected Dependencies
- Go: github.com/jordan-wright/email or gomail.v2
- Go: github.com/google/uuid (for tokens)
- Angular: Router for token parameter handling

## Notes
- Use Ethereal Email for development (smtp.ethereal.email)
- Ethereal provides web inbox to view sent emails
- For production (Phase 3): integrate SendGrid or Mailgun
- Keep templates simple and mobile-friendly
- Email verification is optional enforcement in Phase 1 (configurable)
- All tokens should be URL-safe base64 encoded
