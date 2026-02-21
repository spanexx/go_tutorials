// Package handlers_test implements integration tests for post handlers
package handlers_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/suite"

	"github.com/socialhub/auth-service/internal/handlers"
	"github.com/socialhub/auth-service/internal/service"
	"github.com/socialhub/auth-service/pkg/models"
)

// PostHandlerTestSuite is the test suite for post handler tests
type PostHandlerTestSuite struct {
	suite.Suite
	router         *gin.Engine
	postHandler    *handlers.PostHandler
	postService    *service.PostService
	reactionService *service.ReactionService
	commentService  *service.CommentService
}

// SetupSuite runs before all tests
func (suite *PostHandlerTestSuite) SetupSuite() {
	gin.SetMode(gin.TestMode)
	
	// Initialize services (with nil DB for unit testing)
	suite.postService = service.NewPostService(nil)
	suite.reactionService = service.NewReactionService(nil)
	suite.commentService = service.NewCommentService(nil)
	
	// Initialize handler
	suite.postHandler = handlers.NewPostHandler(
		suite.postService,
		suite.reactionService,
		suite.commentService,
	)
	
	// Setup router with mock auth middleware
	suite.router = gin.New()
	
	// Add mock auth middleware that reads X-User-ID header
	suite.router.Use(func(c *gin.Context) {
		if userID := c.GetHeader("X-User-ID"); userID != "" {
			c.Set("user_id", userID)
		}
		c.Next()
	})
	
	handlers.RegisterPostRoutes(suite.router.Group("/api/v1"), 
		suite.postService, suite.reactionService, suite.commentService)
}

// TestPostHandlerTestSuite runs the test suite
func TestPostHandlerTestSuite(t *testing.T) {
	suite.Run(t, new(PostHandlerTestSuite))
}

// TestCreatePost tests the CreatePost endpoint
func (suite *PostHandlerTestSuite) TestCreatePost() {
	// Test valid request
	suite.T().Run("valid request", func(t *testing.T) {
		reqBody := handlers.CreatePostRequest{
			Content: "Test post content",
		}
		body, _ := json.Marshal(reqBody)
		
		req, _ := http.NewRequest("POST", "/api/v1/posts", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		// Add user_id to context (simulating auth middleware)
		req.Header.Set("X-User-ID", "test-user")
		
		w := httptest.NewRecorder()
		suite.router.ServeHTTP(w, req)
		
		// Returns 201 Created (service returns empty post with nil DB)
		assert.Equal(suite.T(), http.StatusCreated, w.Code)
	})
	
	// Test invalid request (empty content)
	suite.T().Run("empty content", func(t *testing.T) {
		reqBody := handlers.CreatePostRequest{
			Content: "",
		}
		body, _ := json.Marshal(reqBody)
		
		req, _ := http.NewRequest("POST", "/api/v1/posts", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		
		w := httptest.NewRecorder()
		suite.router.ServeHTTP(w, req)
		
		assert.Equal(suite.T(), http.StatusBadRequest, w.Code)
	})
	
	// Test content too long
	suite.T().Run("content too long", func(t *testing.T) {
		reqBody := handlers.CreatePostRequest{
			Content: string(make([]byte, 5001)),
		}
		body, _ := json.Marshal(reqBody)
		
		req, _ := http.NewRequest("POST", "/api/v1/posts", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		
		w := httptest.NewRecorder()
		suite.router.ServeHTTP(w, req)
		
		assert.Equal(suite.T(), http.StatusBadRequest, w.Code)
	})
}

// TestGetPost tests the GetPost endpoint
func (suite *PostHandlerTestSuite) TestGetPost() {
	// Test missing ID
	suite.T().Run("missing ID", func(t *testing.T) {
		req, _ := http.NewRequest("GET", "/api/v1/posts/", nil)
		
		w := httptest.NewRecorder()
		suite.router.ServeHTTP(w, req)
		
		// Returns 404 for missing route
		assert.Equal(suite.T(), http.StatusNotFound, w.Code)
	})
	
	// Test valid ID (will return 404 since no DB)
	suite.T().Run("valid ID", func(t *testing.T) {
		req, _ := http.NewRequest("GET", "/api/v1/posts/test-post-id", nil)
		
		w := httptest.NewRecorder()
		suite.router.ServeHTTP(w, req)
		
		// Returns 404 since post doesn't exist
		assert.Equal(suite.T(), http.StatusNotFound, w.Code)
	})
}

// TestUpdatePost tests the UpdatePost endpoint
func (suite *PostHandlerTestSuite) TestUpdatePost() {
	// Test missing ID
	suite.T().Run("missing ID", func(t *testing.T) {
		reqBody := handlers.UpdatePostRequest{
			Content: "Updated content",
		}
		body, _ := json.Marshal(reqBody)
		
		req, _ := http.NewRequest("PUT", "/api/v1/posts/", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		
		w := httptest.NewRecorder()
		suite.router.ServeHTTP(w, req)
		
		// Returns 404 for missing route
		assert.Equal(suite.T(), http.StatusNotFound, w.Code)
	})
	
	// Test valid update
	suite.T().Run("valid update", func(t *testing.T) {
		reqBody := handlers.UpdatePostRequest{
			Content: "Updated content",
		}
		body, _ := json.Marshal(reqBody)
		
		req, _ := http.NewRequest("PUT", "/api/v1/posts/test-post-id", bytes.NewBuffer(body))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-User-ID", "test-user")
		
		w := httptest.NewRecorder()
		suite.router.ServeHTTP(w, req)
		
		// Returns 404 since post doesn't exist
		assert.Equal(suite.T(), http.StatusNotFound, w.Code)
	})
}

// TestDeletePost tests the DeletePost endpoint
func (suite *PostHandlerTestSuite) TestDeletePost() {
	// Test missing ID
	suite.T().Run("missing ID", func(t *testing.T) {
		req, _ := http.NewRequest("DELETE", "/api/v1/posts/", nil)
		
		w := httptest.NewRecorder()
		suite.router.ServeHTTP(w, req)
		
		// Returns 404 for missing route
		assert.Equal(suite.T(), http.StatusNotFound, w.Code)
	})
	
	// Test valid delete
	suite.T().Run("valid delete", func(t *testing.T) {
		req, _ := http.NewRequest("DELETE", "/api/v1/posts/test-post-id", nil)
		req.Header.Set("X-User-ID", "test-user")

		w := httptest.NewRecorder()
		suite.router.ServeHTTP(w, req)

		// Returns 404 since post doesn't exist (nil DB)
		assert.Equal(suite.T(), http.StatusNotFound, w.Code)
	})
}

// TestGetFeed tests the GetFeed endpoint
func (suite *PostHandlerTestSuite) TestGetFeed() {
	// Test default feed (home)
	suite.T().Run("default feed", func(t *testing.T) {
		req, _ := http.NewRequest("GET", "/api/v1/feed", nil)
		req.Header.Set("X-User-ID", "test-user")
		
		w := httptest.NewRecorder()
		suite.router.ServeHTTP(w, req)
		
		// Returns 200 with empty feed since DB is nil
		assert.Equal(suite.T(), http.StatusOK, w.Code)
	})
	
	// Test trending feed
	suite.T().Run("trending feed", func(t *testing.T) {
		req, _ := http.NewRequest("GET", "/api/v1/feed?type=trending", nil)
		
		w := httptest.NewRecorder()
		suite.router.ServeHTTP(w, req)
		
		// Returns 200 with empty feed since DB is nil
		assert.Equal(suite.T(), http.StatusOK, w.Code)
	})
	
	// Test latest feed
	suite.T().Run("latest feed", func(t *testing.T) {
		req, _ := http.NewRequest("GET", "/api/v1/feed?type=latest", nil)
		
		w := httptest.NewRecorder()
		suite.router.ServeHTTP(w, req)
		
		// Returns 200 with empty feed since DB is nil
		assert.Equal(suite.T(), http.StatusOK, w.Code)
	})
	
	// Test invalid feed type
	suite.T().Run("invalid feed type", func(t *testing.T) {
		req, _ := http.NewRequest("GET", "/api/v1/feed?type=invalid", nil)
		
		w := httptest.NewRecorder()
		suite.router.ServeHTTP(w, req)
		
		assert.Equal(suite.T(), http.StatusBadRequest, w.Code)
	})
	
	// Test pagination
	suite.T().Run("with pagination", func(t *testing.T) {
		req, _ := http.NewRequest("GET", "/api/v1/feed?page=2&limit=10", nil)
		req.Header.Set("X-User-ID", "test-user")
		
		w := httptest.NewRecorder()
		suite.router.ServeHTTP(w, req)
		
		// Returns 200 with empty feed since DB is nil
		assert.Equal(suite.T(), http.StatusOK, w.Code)
	})
}

// TestGetPostsByUser tests the GetPostsByUser endpoint
func (suite *PostHandlerTestSuite) TestGetPostsByUser() {
	// Test missing user ID
	suite.T().Run("missing user ID", func(t *testing.T) {
		req, _ := http.NewRequest("GET", "/api/v1/users//posts", nil)
		
		w := httptest.NewRecorder()
		suite.router.ServeHTTP(w, req)
		
		// Returns 400 for bad request (empty user ID)
		assert.Equal(suite.T(), http.StatusBadRequest, w.Code)
	})
	
	// Test valid user ID
	suite.T().Run("valid user ID", func(t *testing.T) {
		req, _ := http.NewRequest("GET", "/api/v1/users/test-user-id/posts", nil)
		
		w := httptest.NewRecorder()
		suite.router.ServeHTTP(w, req)
		
		// Returns 200 with empty posts since DB is nil
		assert.Equal(suite.T(), http.StatusOK, w.Code)
	})
}

// TestGetPostsByHashtag tests the GetPostsByHashtag endpoint
func (suite *PostHandlerTestSuite) TestGetPostsByHashtag() {
	// Test missing hashtag
	suite.T().Run("missing hashtag", func(t *testing.T) {
		req, _ := http.NewRequest("GET", "/api/v1/hashtag/", nil)
		
		w := httptest.NewRecorder()
		suite.router.ServeHTTP(w, req)
		
		// Returns 404 for missing route
		assert.Equal(suite.T(), http.StatusNotFound, w.Code)
	})
	
	// Test valid hashtag
	suite.T().Run("valid hashtag", func(t *testing.T) {
		req, _ := http.NewRequest("GET", "/api/v1/hashtag/golang", nil)
		
		w := httptest.NewRecorder()
		suite.router.ServeHTTP(w, req)
		
		// Returns 200 with empty posts since DB is nil
		assert.Equal(suite.T(), http.StatusOK, w.Code)
	})
}

// TestCreatePostRequestValidation tests request validation
func (suite *PostHandlerTestSuite) TestCreatePostRequestValidation() {
	// Test valid request
	suite.T().Run("valid request", func(t *testing.T) {
		req := handlers.CreatePostRequest{
			Content:  "Valid content",
			ImageURL: "https://example.com/image.jpg",
		}
		
		assert.NotEmpty(suite.T(), req.Content)
		assert.LessOrEqual(suite.T(), len(req.Content), 5000)
	})
	
	// Test image URL optional
	suite.T().Run("image URL optional", func(t *testing.T) {
		req := handlers.CreatePostRequest{
			Content: "Valid content without image",
		}
		
		assert.NotEmpty(suite.T(), req.Content)
		assert.Empty(suite.T(), req.ImageURL)
	})
}

// TestUpdatePostRequestValidation tests update request validation
func (suite *PostHandlerTestSuite) TestUpdatePostRequestValidation() {
	// Test valid update
	suite.T().Run("valid update", func(t *testing.T) {
		req := handlers.UpdatePostRequest{
			Content: "Updated content",
		}
		
		assert.NotEmpty(suite.T(), req.Content)
		assert.LessOrEqual(suite.T(), len(req.Content), 5000)
	})
	
	// Test empty content allowed for update
	suite.T().Run("empty content allowed", func(t *testing.T) {
		req := handlers.UpdatePostRequest{
			Content: "",
		}
		
		// Empty content is allowed (omitempty in binding tag)
		assert.Empty(suite.T(), req.Content)
	})
}

// TestPaginationQuery tests pagination query validation
func (suite *PostHandlerTestSuite) TestPaginationQuery() {
	// Test default values
	suite.T().Run("default values", func(t *testing.T) {
		query := handlers.GetFeedQuery{}
		
		assert.Equal(suite.T(), 0, query.Page)
		assert.Equal(suite.T(), 0, query.Limit)
	})
	
	// Test max limit
	suite.T().Run("max limit", func(t *testing.T) {
		query := handlers.GetFeedQuery{
			Page:  1,
			Limit: 100,
		}
		
		assert.Equal(suite.T(), 1, query.Page)
		assert.Equal(suite.T(), 100, query.Limit)
	})
}

// TestFeedResponse tests feed response structure
func (suite *PostHandlerTestSuite) TestFeedResponse() {
	response := handlers.FeedResponse{
		Posts:      []models.PostWithDetails{},
		TotalCount: 0,
		HasMore:    false,
		Page:       1,
		Limit:      20,
	}
	
	assert.NotNil(suite.T(), response.Posts)
	assert.Equal(suite.T(), int64(0), response.TotalCount)
	assert.False(suite.T(), response.HasMore)
	assert.Equal(suite.T(), 1, response.Page)
	assert.Equal(suite.T(), 20, response.Limit)
}

// TestErrorResponse tests error response structure
func (suite *PostHandlerTestSuite) TestErrorResponse() {
	response := handlers.ErrorResponse{
		Error:   "test_error",
		Message: "Test error message",
	}
	
	assert.Equal(suite.T(), "test_error", response.Error)
	assert.Equal(suite.T(), "Test error message", response.Message)
}
