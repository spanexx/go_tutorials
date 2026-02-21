# Milestone 5.4 - Angular Frontend Unit Tests - Services & Guards

## Problem Statement
Angular services and guards require unit testing to ensure proper state management, API communication, and route protection. Service tests validate business logic in the frontend independently from UI components.

## Success Metrics
- All services have >= 80% test coverage
- All route guards have comprehensive tests
- HTTP client mocking works correctly
- Service state management tested
- Test execution < 30 seconds

## Non-Goals
- Component rendering tests (covered in Milestone 5.5)
- API endpoint testing (covered in Milestone 5.6)
- E2E user flows (covered in Milestone 5.9-5.10)

## Items

### Item 5.4.1 - AuthService Unit Tests
**Type:** Test
**Description:** Unit tests for AuthService covering authentication state and API calls.
**Acceptance Criteria:**
- Test login() with valid credentials
- Test login() with invalid credentials (error handling)
- Test register() with valid data
- Test logout() clears state
- Test isAuthenticated signal updates
- Test currentUser signal updates
- Test localStorage persistence
- Test token storage and retrieval
- Mock HttpClient for API calls
- Test Observables with marble testing
**Passes:** false

### Item 5.4.2 - PostService Unit Tests
**Type:** Test
**Description:** Unit tests for PostService covering feed and post operations.
**Acceptance Criteria:**
- Test createPost() with content
- Test getFeed() with different types
- Test getPost() by ID
- Test updatePost() with changes
- Test deletePost() confirmation
- Test getUserPosts() pagination
- Test loading state signals
- Test error state handling
- Mock HttpClient for all requests
**Passes:** false

### Item 5.4.3 - CommentService Unit Tests
**Type:** Test
**Description:** Unit tests for CommentService with nested comment support.
**Acceptance Criteria:**
- Test addComment() to post
- Test addComment() as reply
- Test getComments() pagination
- Test getCommentTree() nested structure
- Test deleteComment() by ID
- Test updateComment() content
- Test comment depth tracking
- Mock HttpClient for all requests
**Passes:** false

### Item 5.4.4 - ReactionService Unit Tests
**Type:** Test
**Description:** Unit tests for ReactionService covering reactions and counts.
**Acceptance Criteria:**
- Test react() with different types
- Test toggleReaction() add/remove
- Test removeReaction() idempotent
- Test getReactionCounts() aggregation
- Test getUserReaction() check
- Test optimistic UI updates
- Mock HttpClient for all requests
**Passes:** false

### Item 5.4.5 - FollowService Unit Tests
**Type:** Test
**Description:** Unit tests for FollowService covering follow/unfollow operations.
**Acceptance Criteria:**
- Test followUser() new follow
- Test unfollowUser() existing
- Test toggleFollow() behavior
- Test isFollowing() check
- Test getFollowers() pagination
- Test getFollowing() pagination
- Test getFollowSuggestions()
- Mock HttpClient for all requests
**Passes:** false

### Item 5.4.6 - FeedService Unit Tests
**Type:** Test
**Description:** Unit tests for FeedService (if separate from PostService).
**Acceptance Criteria:**
- Test getHomeFeed() with following
- Test getTrendingFeed() with scores
- Test getLatestFeed() chronological
- Test feed pagination (hasMore)
- Test feed type switching
- Test refresh functionality
- Mock HttpClient for all requests
**Passes:** false

### Item 5.4.7 - authGuard Unit Tests
**Type:** Test
**Description:** Unit tests for authentication route guard.
**Acceptance Criteria:**
- Test allow access when authenticated
- Test redirect to login when not authenticated
- Test preserve URL in query params
- Test async auth state resolution
- Mock Router and AuthService
- Test both true/false outcomes
**Passes:** false

### Item 5.4.8 - guestGuard Unit Tests
**Type:** Test
**Description:** Unit tests for guest route guard (redirects authenticated users).
**Acceptance Criteria:**
- Test redirect to feed when authenticated
- Test allow access when not authenticated
- Test redirect after login page
- Mock Router and AuthService
- Test both true/false outcomes
**Passes:** false

### Item 5.4.9 - ToastService Unit Tests
**Type:** Test
**Description:** Unit tests for ToastService notifications.
**Acceptance Criteria:**
- Test success() adds toast
- Test error() adds toast
- Test warning() adds toast
- Test info() adds toast
- Test auto-dismiss timeout
- Test manual dismiss
- Test toast queue limits
- Test signal updates
**Passes:** false

## Affected Files
- `src/app/shared/services/auth.service.spec.ts`
- `src/app/shared/services/post.service.spec.ts`
- `src/app/shared/services/comment.service.spec.ts`
- `src/app/shared/services/reaction.service.spec.ts`
- `src/app/shared/services/follow.service.spec.ts`
- `src/app/shared/services/feed.service.spec.ts`
- `src/app/shared/guards/auth.guard.spec.ts`
- `src/app/shared/guards/guest.guard.spec.ts`
- `src/app/shared/services/toast.service.spec.ts`

## Affected Dependencies
- @angular/core/testing
- @angular/common/http/testing
- jasmine
- karma

## Notes
- Use HttpTestingController for HTTP mocking
- Test services in isolation with TestBed
- Use TestScheduler for Observable testing
- Mock localStorage for persistence tests
