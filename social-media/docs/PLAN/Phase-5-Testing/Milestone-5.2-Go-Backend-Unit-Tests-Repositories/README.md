# Milestone 5.2 - Go Backend Unit Tests - Repositories

## Problem Statement
The database repository layer requires thorough testing to ensure SQL queries are correct, transactions work properly, and database constraints are respected. Repository tests validate the data access layer independently from business logic.

## Success Metrics
- All repository methods have unit tests
- Test coverage for repository layer >= 70%
- Tests run against isolated test database
- Transaction rollback verification
- Edge cases (null values, empty results) covered

## Non-Goals
- Business logic testing (covered in Milestone 5.1)
- API endpoint testing (covered in Milestone 5.6)
- Load testing database performance (future phase)

## Items

### Item 5.2.1 - PostRepository Unit Tests
**Type:** Test
**Description:** Unit tests for PostRepository covering all CRUD operations and complex queries.
**Acceptance Criteria:**
- Test CreatePost with all fields
- Test GetPostByID with existing/non-existing
- Test UpdatePost all fields
- Test DeletePost soft delete verification
- Test GetPostsByUserID pagination
- Test GetPostsWithDetails joins
- Test GetPostsByHashtag filtering
- Test Increment/Decrement counts
- Test post_hashtags junction operations
- Test post_mentions junction operations
- Use test database with transaction rollback
**Passes:** false

### Item 5.2.2 - CommentRepository Unit Tests
**Type:** Test
**Description:** Unit tests for CommentRepository including recursive queries and pagination.
**Acceptance Criteria:**
- Test CreateComment with/without parent_id
- Test GetCommentByID
- Test GetCommentsByPostID pagination
- Test GetRepliesToComment
- Test GetCommentTree recursive CTE
- Test UpdateComment
- Test DeleteComment soft delete
- Test Increment/Decrement like counts
- Test depth calculation for nested comments
- Use test database with transaction rollback
**Passes:** false

### Item 5.2.3 - UserRepository Unit Tests
**Type:** Test
**Description:** Unit tests for UserRepository covering user management and search.
**Acceptance Criteria:**
- Test CreateUser with all fields
- Test GetUserByID
- Test GetUserByEmail
- Test GetUserByUsername
- Test UpdateUser profile changes
- Test DeleteUser soft delete
- Test SearchUsers with query
- Test username uniqueness constraint
- Test email uniqueness constraint
- Test password hash storage
- Use test database with transaction rollback
**Passes:** false

### Item 5.2.4 - ReactionRepository Unit Tests
**Type:** Test
**Description:** Unit tests for ReactionRepository covering upsert pattern and aggregations.
**Acceptance Criteria:**
- Test CreateReaction new reaction
- Test UpdateReaction type change
- Test DeleteReaction
- Test GetReactionsByPostID
- Test GetReactionsByCommentID
- Test GetUserReaction check
- Test CountReactionsByType aggregation
- Test HasUserReacted boolean
- Test UpsertReaction pattern
- Use test database with transaction rollback
**Passes:** false

### Item 5.2.5 - FollowRepository Unit Tests
**Type:** Test
**Description:** Unit tests for FollowRepository covering follow relationships and queries.
**Acceptance Criteria:**
- Test CreateFollow new follow
- Test CreateFollow upsert existing
- Test DeleteFollow
- Test GetFollowers with user details
- Test GetFollowing with user details
- Test GetMutualFollows intersection
- Test CountFollowers/CountFollowing
- Test IsFollowing check
- Test GetFollowSuggestions
- Use test database with transaction rollback
**Passes:** false

### Item 5.2.6 - Test Database Infrastructure
**Type:** Test Infrastructure
**Description:** Setup test database utilities including migrations, fixtures, and cleanup.
**Acceptance Criteria:**
- Test database connection management
- Migration runner for test schema
- Transaction wrapper for test isolation
- Test fixture loading (seed data)
- Automatic cleanup after tests
- Parallel test support (unique test DBs)
- Testcontainers integration for CI
**Passes:** false

## Affected Files
- `backend/internal/repository/post_repository_test.go`
- `backend/internal/repository/comment_repository_test.go`
- `backend/internal/repository/user_repository_test.go`
- `backend/internal/repository/reaction_repository_test.go`
- `backend/internal/repository/follow_repository_test.go`
- `backend/internal/testutil/db.go`
- `backend/internal/testutil/fixtures.go`

## Affected Dependencies
- testify/assert
- testify/suite
- testcontainers-go/postgres
- golang-migrate/migrate

## Notes
- Each test runs in transaction that rolls back
- Use fixtures for common test data
- Testcontainers for PostgreSQL in CI
- Parallel test execution where possible
