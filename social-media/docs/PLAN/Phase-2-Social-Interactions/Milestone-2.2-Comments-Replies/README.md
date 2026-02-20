# Milestone 2.2 - Comments & Replies System

## Problem Statement
Discussion and conversation are core to social media. Users need to comment on posts and reply to other comments in threaded conversations.

## Success Metrics
- Users can add comments to posts
- Comments display chronologically
- Users can reply to comments (nesting)
- Reply threads are collapsible
- Comment count updates in real-time
- Comment input has character limit

## Non-Goals
- Rich text in comments (Phase 3)
- Comment reactions (Phase 3)
- Comment editing/deletion (Phase 3)
- Image attachments in comments (Phase 3)

## Items

### Item 2.2.1 - Comment Model & Service
**Type:** Feature
**Description:** Define comment data model and service with support for nested replies.
**Acceptance Criteria:**
- Comment interface with id, author, content, postId, parentId, createdAt
- CommentService with methods: getCommentsForPost, addComment, getReplies
- Support for nested replies (parentId references)
- Signal-based comment state per post
- Comment count tracking
**Passes:** false

### Item 2.2.2 - Comment Component
**Type:** Feature
**Description:** Create individual comment component with author info and content.
**Acceptance Criteria:**
- Author avatar and name linking to profile
- Comment content with clickable mentions
- Relative timestamp
- Reply button
- Like button placeholder (Phase 3)
- Nested replies indicator
- Collapsible nested threads
**Passes:** false

### Item 2.2.3 - Comment List Component
**Type:** Feature
**Description:** Create the comment list showing all comments on a post with threading.
**Acceptance Criteria:**
- List of top-level comments
- Nested replies shown indented
- Load more button for pagination
- Empty state when no comments
- Sort by oldest/newest toggle
- Collapse/expand all threads button
**Passes:** false

### Item 2.2.4 - Comment Input Component
**Type:** Feature
**Description:** Build the comment input form with character count and submit.
**Acceptance Criteria:**
- Textarea with placeholder
- Character count (max 280)
- Submit button
- Cancel button (when replying)
- Loading state
- Auto-focus when opening reply
- Keyboard shortcut (R to reply)
**Passes:** false

### Item 2.2.5 - Thread Component
**Type:** Feature
**Description:** Create the threaded conversation view for nested replies.
**Acceptance Criteria:**
- Visual nesting with indentation or lines
- Collapse/expand individual threads
- Show reply count on collapsed threads
- "Show more replies" for long threads
- Maintain context when replying deep in thread
**Passes:** false

## Affected Files
- `src/app/shared/models/comment.model.ts`
- `src/app/shared/services/comment.service.ts`
- `src/app/shared/components/comment/comment.component.ts`
- `src/app/shared/components/comment-list/comment-list.component.ts`
- `src/app/shared/components/comment-input/comment-input.component.ts`
- `src/app/shared/components/thread/thread.component.ts`
- `src/app/shared/components/post-card/post-card.component.ts`

## Affected Dependencies
- None

## Notes
- Maximum nesting depth: 3 levels
- Use Intersection Observer for pagination
