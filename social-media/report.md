# Smoke Test Report

Date: 2026-02-21

## Scope
- Rebuild backend docker containers (auth-service + postgres + redis)
- Apply DB migrations
- Smoke test key backend endpoints with `curl`
- Validate critical frontend flow with Playwright (register -> feed)

## Backend: Rebuild + Migrations

### Docker rebuild
- `docker-compose up -d --build` completed successfully.

### Migrations
Applied successfully after rebuild:
- `000001_create_users_table`
- `000002_add_email_fields`
- `000003_create_posts_tables`

## Backend: Endpoint Smoke Tests (curl)
Full captured output: `/tmp/backend-smoke.txt`

### GET /healthz
- **Result:** PASS (200)

### GET /readyz
- **Result:** PASS (200)

### GET /api/v1/hashtags/trending
- **Result:** PASS (200)
- **Notes:** Returned `[]` (no hashtags yet). Response includes `X-Cache` header.

### GET /api/v1/users/suggested?limit=5
- **Result:** PASS (200)
- **Notes:** Initially returned `[]` when DB had few/no users. After creating users via register flow, endpoint returns a populated list.

### POST /api/v1/auth/register
- **Result:** PASS (201)
- **Notes:** Returns `user`, `access_token`, `refresh_token`, `expires_in`.

### POST /api/v1/auth/login
- **Result:** PASS (200)

### GET /api/v1/search?q=test&limit=3
- **Result:** PASS (200)
- **Notes:** Returned user matches for test accounts.

## Frontend: Playwright Validation

### Navigation
- Navigated to `/login` and `/register` successfully.

### Registration flow
- Filled register form and submitted.
- **Result:** PASS
- **Observed:** Redirected to `/feed`.

### Feed load
- **Result:** PASS
- **Observed:** App performed background refresh calls to:
  - `GET /api/v1/hashtags/trending`
  - `GET /api/v1/users/suggested?limit=5`

## Issues Found

### 1) Backend email templates missing
Backend logs during registration show:
- `failed to parse template welcome.html: open welcome.html: no such file or directory`
- `failed to parse template verification.html: open verification.html: no such file or directory`

**Impact:**
- Registration still succeeds.
- Email sending/verification email rendering fails.

**Suggested fix:**
- Add required template files to the backend image (or configure template search path).

### 2) Trending hashtags empty
- Endpoint works, but returns `[]` because there is no data in `post_hashtags`.

**Impact:**
- UI shows no trending hashtags.

**Suggested fix:**
- Create seed data or ensure hashtag extraction/population is implemented when creating posts.

### 3) Frontend-only issue: missing favicon
Playwright console observed a 404 for `/favicon.ico` on initial load.

**Impact:**
- Cosmetic only.

**Suggested fix:**
- Add a favicon to Angular assets or update index.html.

## Notable Recent Fixes Included in This Run
- **Backend migration schema fix:** users.id is `VARCHAR(36)` and all `*_user_id` foreign keys now match.
- **Backend follows table fix:** added `deleted_at` and `updated_at` to support query filtering.
- **Frontend field-level validation:** register/login now display inline field errors based on backend validator messages.
- **Debug logging:** added togglable frontend debug logger and improved backend request correlation via `request_id`.
