# Milestone 2.2 - Comments & Replies System - Summary

## Status: ✅ COMPLETE

**Audit Date**: 2026-02-22

---

## Executive Summary

Milestone 2.2 provides a threaded comments & replies system for posts: adding comments, nested replies, collapsible threads, pagination UX, and a character-limited input.

During the audit, I verified the real backend endpoints and updated the frontend to correctly consume the backend API and to ensure the UI actually loads and renders comment threads end-to-end.

---

## What’s Implemented

- Comment model supporting nesting (`parentId` + recursive `replies`).
- `CommentService` with per-post signal state (comments + counts + loading).
- `CommentComponent` for author info, relative time, reply action, and like placeholder.
- `CommentListComponent` for list + sort toggle + pagination UX.
- `CommentInputComponent` with character count (max 280), submit/cancel, and keyboard shortcuts.
- `ThreadComponent` for threaded/nested rendering, collapse/expand, and “show more replies”.

---

## Audit Findings & Fixes Applied (2026-02-22)

- Fixed frontend/backend contract mismatches:
  - Comment list endpoints return wrapped payloads; the frontend now parses those correctly.
  - Delete route corrected to `DELETE /api/v1/comments/:id`.
- Switched frontend load to `GET /api/v1/posts/:id/comments/tree` so nested replies are returned and displayed.
- Updated `CommentListComponent` to actually call `loadCommentsForPost()` on init and to read comments reactively from the service state.
- Integrated comments UI into `PostCardComponent`:
  - Toggle comments panel
  - Submit comment / submit reply
  - Reply and like events wired to `CommentService`

---

## Verification

- `npm run typecheck`

---

## Affected Files

- `src/app/shared/models/comment.model.ts`
- `src/app/shared/services/comment.service.ts`
- `src/app/shared/comment/comment.component.ts`
- `src/app/shared/comment-list/comment-list.component.ts`
- `src/app/shared/comment-input/comment-input.component.ts`
- `src/app/shared/thread/thread.component.ts`
- `src/app/components/post-card/post-card.component.ts`
- `src/app/components/post-card/post-card.component.html`

---

## Notes

- Backend supports both paginated top-level comment lists and full trees. The frontend currently uses the tree endpoint to meet “nested replies” requirements.
- “Like comment” is still a Phase 3 feature; the frontend keeps it as a local-only toggle to avoid calling a nonexistent endpoint.
