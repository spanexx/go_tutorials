# Milestone 2.5 - Social Graph (Follow System) - Summary

## Status: ✅ COMPLETE

**Audit Date**: 2026-02-22

---

## Executive Summary

Milestone 2.5 implements following relationships, follower/following list pages, and profile stats integration.

During the audit, I found the UI was marked complete but the follow system still relied on mock/local state in the frontend and mismatched backend contracts (backend follow APIs are ID-based while profile routes are username-based). I refactored the frontend to use the real backend follow endpoints and fixed backend follow list responses to correctly compute `is_following_back` for the currently authenticated viewer.

---

## What’s Implemented

- Follow/unfollow via backend:
  - `POST /api/v1/users/id/:id/follow`
  - `DELETE /api/v1/users/id/:id/follow`
- Followers list:
  - `GET /api/v1/users/id/:id/followers`
- Following list:
  - `GET /api/v1/users/id/:id/following`
- Follow counts:
  - `GET /api/v1/users/id/:id/follow/counts`
- Followers/Following pages in the frontend.
- Follow button component with proper self-follow prevention.

---

## Audit Findings & Fixes Applied (2026-02-22)

- Removed local/mock follow relationships in the frontend:
  - Refactored `FollowService` to be API-backed and to track following state for the current authenticated user.
- Fixed user API mismatch:
  - Added `UserService.getUserByUsername()`.
  - Fixed `UserService.getUserById()` to use `/users/id/:id`.
  - Removed `getUsersByIds()` usage (no backend endpoint exists).
- Corrected followers/following pages to load from backend:
  - Username route param is resolved to user ID via `GET /api/v1/users/:username`.
  - Pages paginate via backend responses and append results.
- Fixed backend `is_following_back` behavior:
  - Backend now computes follow-back relative to the authenticated viewer.
- Wired follow button into profile header:
  - Follow/unfollow is now available directly on the profile page when viewing another user.

---

## Verification

- `go test ./...`
- `npm run typecheck`

---

## Affected Files

- `backend/internal/service/follow_service.go`
- `backend/internal/handlers/follow_handler.go`
- `src/app/shared/models/follow.model.ts`
- `src/app/shared/services/user.service.ts`
- `src/app/shared/services/follow.service.ts`
- `src/app/shared/components/follow-button/follow-button.component.ts`
- `src/app/pages/followers/followers.component.ts`
- `src/app/pages/following/following.component.ts`
- `src/app/pages/profile/profile.component.ts`
- `src/app/pages/profile/profile.component.html`

---

## Notes

- Profile routes use `:id` as a username. Backend follow APIs use user IDs, so frontend resolves username → user ID before calling follow endpoints.
