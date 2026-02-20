# Milestone 1.3 - Feed Page & Post Creation

## Problem Statement
The feed is the core of SocialHub where users consume and create content. Without a functional feed, users cannot engage with the platform's primary purpose. This milestone delivers the main feed page with post creation, infinite scroll, and basic post display.

## Success Metrics
- Users can create posts with text content
- Feed displays posts in chronological order
- Infinite scroll loads more posts as user scrolls
- Post cards display author, content, timestamp, and engagement stats
- Create post form has character count and validation
- Skeleton loading provides smooth experience during data fetch

## Non-Goals
- Image uploads in posts (Phase 2+)
- Post reactions (Phase 2+)
- Post comments/replies (Phase 2+)
- Share functionality (Phase 2+)
- Real-time feed updates (Phase 4+)

## Items

### Item 1.3.1 - Post Model & Service
**Type:** Feature
**Description:** Define the Post data model and create a PostService for CRUD operations with mock data.
**Acceptance Criteria:**
- Post interface with fields: id, author, content, createdAt, likesCount, commentsCount, sharesCount, images (optional)
- Author interface with fields: id, name, username, avatar
- PostService with methods: getFeedPosts, getUserPosts, createPost, getPostById
- Mock data generator for development
- Signal-based state management for posts
- Pagination support (offset, limit)
**Passes:** false

### Item 1.3.2 - Post Card Component
**Type:** Feature
**Description:** Create the post card component that displays individual posts with author info, content, timestamp, and engagement preview.
**Acceptance Criteria:**
- Author avatar and name link to profile
- Username displayed (@username)
- Relative timestamp (e.g., "2h ago")
- Post content with clickable hashtags and mentions
- Engagement stats row (likes, comments, shares)
- Hover effects on interactive elements
- Responsive layout
**Passes:** false

### Item 1.3.3 - Create Post Component
**Type:** Feature
**Description:** Build the create post form with text input, character count, and submit functionality.
**Acceptance Criteria:**
- Textarea with placeholder "What's on your mind?"
- Character count display (max 280 characters)
- Visual indicator when near/over limit
- Submit button (disabled when empty or over limit)
- Loading state during submission
- Success toast on post creation
- Auto-focus on textarea when opened
- Keyboard shortcut (C) to open
**Passes:** false

### Item 1.3.4 - Feed Page Layout
**Type:** Feature
**Description:** Create the main feed page layout with create post section, posts list, and infinite scroll.
**Acceptance Criteria:**
- Create post component at top of feed
- Posts list with vertical spacing
- Infinite scroll implementation
- Loading spinner at bottom during fetch
- Empty state when no posts
- Error state with retry button
- Refresh button to reload feed
**Passes:** false

### Item 1.3.5 - Infinite Scroll Implementation
**Type:** Feature
**Description:** Implement infinite scroll for the feed to load posts progressively as user scrolls.
**Acceptance Criteria:**
- Intersection Observer based scroll detection
- Load more posts when nearing bottom
- Page size: 10 posts per fetch
- Loading indicator during fetch
- No duplicate posts loaded
- Smooth scroll behavior
- Handle end of feed (no more posts)
**Passes:** false

## Affected Files
- `src/app/shared/models/post.model.ts`
- `src/app/shared/services/post.service.ts`
- `src/app/shared/components/post-card/post-card.component.ts`
- `src/app/shared/components/create-post/create-post.component.ts`
- `src/app/pages/feed/feed.component.ts`
- `src/app/pages/feed/feed.component.html`
- `src/app/shared/directives/infinite-scroll.directive.ts`

## Affected Dependencies
- Angular Signals
- RxJS

## Notes
- Start with mock data service
- Prepare structure for real API integration
- Consider virtual scrolling for very long feeds (Phase 4)
