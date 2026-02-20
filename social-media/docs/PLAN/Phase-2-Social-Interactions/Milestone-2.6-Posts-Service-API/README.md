# Milestone 2.6 - Posts Service API

## Problem Statement
The frontend currently stores posts in localStorage with no real backend persistence, preventing multi-user interactions, feed algorithms, and data consistency. A dedicated Posts Service is needed to handle post CRUD operations, comments, reactions, and feed generation with proper database persistence and API endpoints.

## Success Metrics
- Posts service running on port 8081
- PostgreSQL schema for posts, comments, reactions
- All CRUD endpoints functional and tested
- Feed endpoint returns paginated results in <150ms (p95)
- Angular frontend successfully migrated from mock to real API
- API documentation complete with Swagger
- Integration test coverage >80%

## Non-Goals
- Real-time post updates via WebSocket - Phase 3
- Image upload and processing - Phase 3
- Full-text search with Elasticsearch - Phase 3
- Rate limiting and throttling - Phase 4
- CDN integration for media - Phase 4

## Items

### Item 2.6.1 - Database Schema Design & Migrations
**Type:** Infrastructure
**Description:** Design and implement PostgreSQL schema for posts, comments, and reactions.
**Acceptance Criteria:**
- `migrations/000002_create_posts_tables.up.sql` with:
  - `posts` table: id, user_id, content, code_snippet, language, image_urls, parent_id (for threads), created_at, updated_at
  - `comments` table: id, post_id, user_id, content, parent_id (for nested replies), created_at, updated_at
  - `reactions` table: id, post_id, user_id, type (like, love, laugh, wow, sad, angry), created_at
  - `follows` table: id, follower_id, followee_id, created_at
- Indexes on: user_id, created_at, parent_id, post_id
- Foreign keys with CASCADE delete where appropriate
- Unique constraint on (post_id, user_id, type) for reactions
- Down migrations for rollback
- `make migrate-up` applies all migrations
**Passes:** false

### Item 2.6.2 - Post Repository Layer
**Type:** Feature
**Description:** Implement database access layer for post operations using sqlc.
**Acceptance Criteria:**
- `internal/repository/posts.sql` with queries:
  - CreatePost, GetPostByID, GetPostsWithDetails, UpdatePost, DeletePost
  - GetPostsByUserID, GetPostsByHashtag, GetThreadPosts
  - IncrementLikeCount, DecrementLikeCount, IncrementCommentCount
- `internal/repository/posts.sql.go` generated
- Transactions for complex operations
- Handles soft deletes (deleted_at column)
- Efficient JOINs for user data in post queries
**Passes:** false

### Item 2.6.3 - Comment Repository Layer
**Type:** Feature
**Description:** Implement database access layer for comment operations.
**Acceptance Criteria:**
- `internal/repository/comments.sql` with queries:
  - CreateComment, GetCommentsByPostID, GetCommentByID, DeleteComment
  - GetRepliesToComment (nested comments)
  - CountCommentsByPostID
- Supports nested comments via parent_id
- Efficient tree retrieval for threaded discussions
- Cascading delete for replies
**Passes:** false

### Item 2.6.4 - Reaction Repository Layer
**Type:** Feature
**Description:** Implement database access layer for reaction operations.
**Acceptance Criteria:**
- `internal/repository/reactions.sql` with queries:
  - AddReaction, RemoveReaction, GetReactionsByPostID
  - GetUserReaction (check if user reacted)
  - CountReactionsByType, GetReactionCountsByPostID
- Upsert pattern for add/update reactions
- Efficient aggregation for reaction counts
**Passes:** false

### Item 2.6.5 - Post Service Layer
**Type:** Feature
**Description:** Implement business logic for post operations.
**Acceptance Criteria:**
- `internal/service/post_service.go` with PostService
- Methods:
  - CreatePost(content, userID, codeSnippet, language, imageUrls)
  - GetPost(postID, currentUserID)
  - GetFeed(currentUserID, limit, offset, feedType)
  - UpdatePost(postID, userID, updates)
  - DeletePost(postID, userID)
  - GetPostsByUser(userID, currentUserID)
- Feed types: home (following), trending, latest
- Trending algorithm: score = likes*1 + comments*2 + recency_boost
- Authorization: users can only update/delete their own posts
- Content validation (max 5000 chars, no XSS)
**Passes:** false

### Item 2.6.6 - Reaction Service Layer
**Type:** Feature
**Description:** Implement business logic for post reactions.
**Acceptance Criteria:**
- `internal/service/reaction_service.go` with ReactionService
- Methods:
  - React(postID, userID, reactionType)
  - RemoveReaction(postID, userID)
  - GetReactions(postID)
- Valid reaction types: like, love, laugh, wow, sad, angry
- Toggle behavior (reacting again with same type removes reaction)
- Updates post reaction counts atomically
- Prevents duplicate reactions
**Passes:** false

### Item 2.6.7 - Comment Service Layer
**Type:** Feature
**Description:** Implement business logic for comment operations.
**Acceptance Criteria:**
- `internal/service/comment_service.go` with CommentService
- Methods:
  - AddComment(postID, userID, content, parentID)
  - GetComments(postID, currentUserID)
  - DeleteComment(commentID, userID)
- Nested comments supported (parentID optional)
- Comment depth limit (max 5 levels)
- Authorization checks for deletion
- Notification trigger for post author (prepare for Phase 3)
**Passes:** false

### Item 2.6.8 - Post HTTP Handlers
**Type:** Feature
**Description:** Create HTTP handlers for post endpoints.
**Acceptance Criteria:**
- `internal/handlers/post_handler.go` with PostHandler
- Routes:
  - `GET /api/v1/posts` - List posts (paginated)
  - `POST /api/v1/posts` - Create post (auth required)
  - `GET /api/v1/posts/:id` - Get single post
  - `PUT /api/v1/posts/:id` - Update post (auth + owner)
  - `DELETE /api/v1/posts/:id` - Delete post (auth + owner)
  - `GET /api/v1/feed` - Get personalized feed
  - `GET /api/v1/users/:id/posts` - Get user's posts
- Request validation with go-playground/validator
- Consistent error responses
- Pagination: page, limit, has_more
**Passes:** false

### Item 2.6.9 - Reaction HTTP Handlers
**Type:** Feature
**Description:** Create HTTP handlers for reaction endpoints.
**Acceptance Criteria:**
- `internal/handlers/reaction_handler.go` with ReactionHandler
- Routes:
  - `POST /api/v1/posts/:id/reactions` - Add reaction (auth required)
  - `DELETE /api/v1/posts/:id/reactions` - Remove reaction (auth required)
  - `GET /api/v1/posts/:id/reactions` - Get all reactions
- Reaction type in body: `{ "type": "like" }`
- Returns 400 for invalid reaction type
- Idempotent delete (no error if reaction doesn't exist)
**Passes:** false

### Item 2.6.10 - Comment HTTP Handlers
**Type:** Feature
**Description:** Create HTTP handlers for comment endpoints.
**Acceptance Criteria:**
- `internal/handlers/comment_handler.go` with CommentHandler
- Routes:
  - `GET /api/v1/posts/:id/comments` - Get comments (tree structure)
  - `POST /api/v1/posts/:id/comments` - Add comment (auth required)
  - `DELETE /api/v1/comments/:id` - Delete comment (auth + owner)
- Nested replies via `parent_id` in request body
- Returns comment tree with nested replies
- Comment count endpoint: `GET /api/v1/posts/:id/comments/count`
**Passes:** false

### Item 2.6.11 - Feed Algorithm Implementation
**Type:** Feature
**Description:** Implement feed ranking and pagination logic.
**Acceptance Criteria:**
- Home feed: posts from followed users, ranked by score
- Trending feed: posts with highest engagement in last 24h
- Latest feed: chronological, all posts
- Score calculation: `likes*1 + comments*2 + shares*3 + time_decay`
- Time decay: `score / (hours_since_posted + 2)^1.5`
- Cursor-based pagination (not offset)
- Cache feed results in Redis for 5 minutes (prepare for Phase 4)
- Exclude deleted posts and blocked users
**Passes:** false

### Item 2.6.12 - Angular Frontend Integration
**Type:** Integration
**Description:** Migrate Angular frontend from mock to real Posts API.
**Acceptance Criteria:**
- `src/app/shared/services/post.service.ts` calls real API
- `src/app/shared/services/feed.service.ts` updated
- `src/app/shared/services/reaction.service.ts` created
- `src/app/shared/services/comment.service.ts` created
- HTTP interceptors handle auth tokens
- Feed page loads from API with skeleton loading
- Create post modal submits to API
- Reactions update in real-time (optimistic UI)
- Comments load in tree structure
- Error handling with toast notifications
- Retry logic for failed requests
- Fallback to mock in dev if API unavailable
**Passes:** false

### Item 2.6.13 - Integration Tests
**Type:** Test
**Description:** Write comprehensive integration tests for posts service.
**Acceptance Criteria:**
- `internal/handlers/post_handler_test.go`
- `internal/handlers/comment_handler_test.go`
- `internal/handlers/reaction_handler_test.go`
- Test database with testcontainers
- Test cases:
  - Create post (success, validation errors)
  - Get feed (home, trending, latest)
  - CRUD operations with authorization
  - Reaction toggle behavior
  - Nested comments
  - Pagination
  - Concurrent reactions (race conditions)
- Test coverage >80%
- `make test` runs all tests
**Passes:** false

### Item 2.6.14 - API Documentation Update
**Type:** Documentation
**Description:** Generate OpenAPI documentation for posts and comments endpoints.
**Acceptance Criteria:**
- Swag comments on all handlers
- `make docs` updates `docs/swagger.yaml`
- Documentation includes:
  - Post schemas with all fields
  - Comment tree structure
  - Reaction types enum
  - Feed types and ranking
  - Error responses
  - Example requests/responses
- Swagger UI accessible at `/swagger`
- API changelog updated
**Passes:** false

## Affected Files
- `backend/cmd/posts-service/main.go`
- `backend/internal/service/post_service.go`
- `backend/internal/service/comment_service.go`
- `backend/internal/service/reaction_service.go`
- `backend/internal/handlers/post_handler.go`
- `backend/internal/handlers/comment_handler.go`
- `backend/internal/handlers/reaction_handler.go`
- `backend/internal/repository/posts.sql`
- `backend/internal/repository/posts.sql.go`
- `backend/internal/repository/comments.sql`
- `backend/internal/repository/comments.sql.go`
- `backend/internal/repository/reactions.sql`
- `backend/internal/repository/reactions.sql.go`
- `backend/internal/dto/post_dto.go`
- `backend/migrations/000002_create_posts_tables.up.sql`
- `backend/migrations/000002_create_posts_tables.down.sql`
- `backend/docs/swagger.yaml`
- `src/app/shared/services/post.service.ts`
- `src/app/shared/services/feed.service.ts`
- `src/app/shared/services/reaction.service.ts`
- `src/app/shared/services/comment.service.ts`

## Affected Dependencies
- github.com/gin-gonic/gin
- github.com/jackc/pgx/v5
- github.com/sqlc-dev/sqlc
- github.com/golang-migrate/migrate/v4
- github.com/go-playground/validator/v10
- github.com/redis/go-redis/v9
- github.com/google/uuid
- github.com/stretchr/testify
- github.com/testcontainers/testcontainers-go

## Notes
- Use cursor-based pagination for better performance
- Implement database indexes before load testing
- Consider materialized views for trending feed
- Cache frequently accessed posts in Redis
- Use database transactions for comment + notification
- Sanitize HTML in post content (bluemonday)
- Rate limiting coming in Phase 4
- Prepare webhook events for real-time updates (Phase 3)
- Image URLs stored as JSON array, actual storage in Phase 3
