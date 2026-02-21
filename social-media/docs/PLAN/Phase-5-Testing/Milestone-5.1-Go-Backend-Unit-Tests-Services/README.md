# Milestone 5.1 - Go Backend Unit Tests - Services

## Problem Statement
The Go backend services contain critical business logic that must be thoroughly tested to ensure correctness, prevent regressions, and enable safe refactoring. Without comprehensive service layer tests, bugs in business logic may go undetected and changes to the codebase become risky.

## Success Metrics
- All service methods have corresponding unit tests
- Test coverage for service layer >= 80%
- Mock-based testing isolates services from dependencies
- Edge cases and error scenarios are covered
- Test execution completes in < 30 seconds

## Non-Goals
- Integration with real database (covered in Milestone 5.6)
- HTTP handler testing (covered in Milestone 5.3)
- Performance benchmarking (future phase)
- Load testing (future phase)

## Items

### Item 5.1.1 - PostService Unit Tests
**Type:** Test
**Description:** Comprehensive unit tests for PostService covering all business logic methods with mocked repository dependencies.
**Acceptance Criteria:**
- Test CreatePost with valid/invalid input
- Test GetPost with existing/non-existing post
- Test GetFeed with home/trending/latest types
- Test UpdatePost with authorization checks
- Test DeletePost with authorization checks
- Test GetPostsByUser pagination
- Test trending score calculation logic
- Mock PostRepository for all tests
- Test error handling scenarios
**Passes:** false

### Item 5.1.2 - CommentService Unit Tests
**Type:** Test
**Description:** Unit tests for CommentService including nested comments, depth validation, and authorization.
**Acceptance Criteria:**
- Test AddComment with/without parent (nested)
- Test GetComments pagination
- Test GetCommentTree with nested structure
- Test UpdateComment authorization
- Test DeleteComment authorization
- Test comment depth limit enforcement (max 5 levels)
- Mock CommentRepository for all tests
- Test error cases (not found, unauthorized)
**Passes:** false

### Item 5.1.3 - ReactionService Unit Tests
**Type:** Test
**Description:** Unit tests for ReactionService covering reaction types, toggle behavior, and count aggregations.
**Acceptance Criteria:**
- Test React with all valid types (like, love, laugh, wow, sad, angry)
- Test ToggleReaction (add/remove on second call)
- Test RemoveReaction idempotent behavior
- Test GetReactionCounts aggregation
- Test ValidateReactionType with invalid types
- Mock ReactionRepository for all tests
- Test GetReactionEmoji/GetReactionLabel helpers
**Passes:** false

### Item 5.1.4 - FollowService Unit Tests
**Type:** Test
**Description:** Unit tests for FollowService including follow/unfollow, mutual follows, and suggestions.
**Acceptance Criteria:**
- Test FollowUser with new/existing follow
- Test UnfollowUser existing/non-existing
- Test ToggleFollow behavior
- Test IsFollowing check
- Test GetFollowers/GetFollowing pagination
- Test GetMutualFollows logic
- Test self-follow prevention
- Mock FollowRepository for all tests
**Passes:** false

### Item 5.1.5 - UserService Unit Tests
**Type:** Test
**Description:** Unit tests for UserService covering profile management, validation, and search functionality.
**Acceptance Criteria:**
- Test GetUserByID with existing/non-existing user
- Test GetUserByUsername with valid/invalid username
- Test UpdateProfile with validation
- Test SearchUsers with query/pagination
- Test username uniqueness validation
- Test avatar URL generation
- Mock UserRepository for all tests
**Passes:** false

### Item 5.1.6 - EmailService Unit Tests
**Type:** Test
**Description:** Unit tests for EmailService covering template rendering, queue management, and error handling.
**Acceptance Criteria:**
- Test SendWelcomeEmail template rendering
- Test SendVerificationEmail with token
- Test SendPasswordResetEmail with token
- Test email queue enqueue/dequeue
- Test SMTP connection error handling
- Test template variable substitution
- Mock SMTP client and queue for tests
**Passes:** false

## Affected Files
- `backend/internal/service/post_service_test.go`
- `backend/internal/service/comment_service_test.go`
- `backend/internal/service/reaction_service_test.go`
- `backend/internal/service/follow_service_test.go`
- `backend/internal/service/user_service_test.go`
- `backend/internal/service/email_service_test.go`
- `backend/internal/mocks/*_mock.go` (generated mocks)

## Affected Dependencies
- testify/assert
- testify/suite
- gomock/mockgen

## Notes
- Use table-driven tests for comprehensive coverage
- Generate mocks with `mockgen` for repositories
- Test both success and failure paths
- Use testify/suite for organized test structure
