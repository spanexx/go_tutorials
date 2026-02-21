package handlers

import (
	"database/sql"
	"log"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

// SearchHandler handles search API requests
type SearchHandler struct {
	db *sql.DB
}

// NewSearchHandler creates a new search handler
func NewSearchHandler(db *sql.DB) *SearchHandler {
	return &SearchHandler{db: db}
}

// SearchResult represents a search result item
type SearchResult struct {
	Type string `json:"type"` // user, post, hashtag
	ID   string `json:"id"`
	Data any    `json:"data"`
}

// SearchUser represents a user in search results
type SearchUser struct {
	ID          string `json:"id"`
	Username    string `json:"username"`
	DisplayName string `json:"display_name"`
	AvatarURL   string `json:"avatar_url"`
	Bio         string `json:"bio"`
	Followers   int    `json:"followers"`
}

// SearchHashtag represents a hashtag in search results
type SearchHashtag struct {
	Tag   string `json:"tag"`
	Count int    `json:"count"`
}

// Search performs a search across users, posts, and hashtags
// @Summary Search
// @Description Search across users, posts, and hashtags
// @Tags search
// @Security BearerAuth
// @Param q query string true "Search query"
// @Param type query string false "Filter by type (users, posts, hashtags)"
// @Param limit query int false "Max results" default(10)
// @Param offset query int false "Offset for pagination" default(0)
// @Success 200 {object} map[string]interface{}
// @Router /api/v1/search [get]
func (h *SearchHandler) Search(c *gin.Context) {
	query := c.Query("q")
	filterType := strings.ToLower(c.Query("type"))
	limit := 10
	offset := 0

	if limitStr := c.Query("limit"); limitStr != "" {
		if n, err := strconv.Atoi(limitStr); err == nil {
			limit = n
		}
	}
	if offsetStr := c.Query("offset"); offsetStr != "" {
		if n, err := strconv.Atoi(offsetStr); err == nil {
			offset = n
		}
	}
	if limit <= 0 {
		limit = 10
	}
	if limit > 50 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}

	if query == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Query parameter 'q' is required"})
		return
	}

	if h.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "database not configured"})
		return
	}

	results := gin.H{
		"users":    []SearchUser{},
		"hashtags": []SearchHashtag{},
		"query":    query,
		"total":    0,
		"limit":    limit,
		"offset":   offset,
	}

	like := "%%" + strings.ToLower(query) + "%%"

	if filterType == "" || filterType == "users" {
		rows, err := h.db.QueryContext(
			c.Request.Context(),
			`
			SELECT u.id, u.username, u.display_name, COALESCE(u.avatar_url, ''), COALESCE(u.bio, ''),
			       COALESCE(f.cnt, 0) AS followers
			FROM users u
			LEFT JOIN (
				SELECT following_id, COUNT(*)::int AS cnt
				FROM follows
				WHERE deleted_at IS NULL
				GROUP BY following_id
			) f ON f.following_id = u.id
			WHERE LOWER(u.username) LIKE $1 OR LOWER(u.display_name) LIKE $1
			ORDER BY followers DESC, u.username ASC
			LIMIT $2 OFFSET $3
			`,
			like,
			limit,
			offset,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "search failed"})
			return
		}
		defer rows.Close()

		users := make([]SearchUser, 0)
		for rows.Next() {
			var u SearchUser
			if err := rows.Scan(&u.ID, &u.Username, &u.DisplayName, &u.AvatarURL, &u.Bio, &u.Followers); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "search failed"})
				return
			}
			users = append(users, u)
		}
		results["users"] = users
		results["total"] = len(users)
	}

	if filterType == "" || filterType == "hashtags" {
		tagQuery := strings.TrimPrefix(query, "#")
		tagLike := "%%" + strings.ToLower(tagQuery) + "%%"
		rows, err := h.db.QueryContext(
			c.Request.Context(),
			`
			SELECT hashtag, COUNT(*)::int AS cnt
			FROM post_hashtags
			WHERE LOWER(hashtag) LIKE $1
			GROUP BY hashtag
			ORDER BY cnt DESC, hashtag ASC
			LIMIT $2 OFFSET $3
			`,
			tagLike,
			limit,
			offset,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "search failed"})
			return
		}
		defer rows.Close()

		hashtags := make([]SearchHashtag, 0)
		for rows.Next() {
			var htag SearchHashtag
			if err := rows.Scan(&htag.Tag, &htag.Count); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "search failed"})
				return
			}
			hashtags = append(hashtags, htag)
		}
		results["hashtags"] = hashtags
	}

	c.JSON(http.StatusOK, results)
}

// GetTrendingHashtags returns trending hashtags
// @Summary Get trending hashtags
// @Description Get currently trending hashtags
// @Tags search
// @Success 200 {array} SearchHashtag
// @Router /api/v1/hashtags/trending [get]
func (h *SearchHandler) GetTrendingHashtags(c *gin.Context) {
	limit := 10
	rid := c.GetString("request_id")
	log.Printf("[SEARCH] GetTrendingHashtags starting request_id=%s limit=%d", rid, limit)
	if h.db == nil {
		log.Printf("[SEARCH] GetTrendingHashtags no db request_id=%s", rid)
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "database not configured"})
		return
	}

	rows, err := h.db.QueryContext(
		c.Request.Context(),
		`
		SELECT hashtag, COUNT(*)::int AS cnt
		FROM post_hashtags
		GROUP BY hashtag
		ORDER BY cnt DESC, hashtag ASC
		LIMIT $1
		`,
		limit,
	)
	if err != nil {
		log.Printf("[SEARCH] GetTrendingHashtags query failed request_id=%s: %v", rid, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load trending hashtags"})
		return
	}
	defer rows.Close()

	hashtags := make([]SearchHashtag, 0)
	for rows.Next() {
		var htag SearchHashtag
		if err := rows.Scan(&htag.Tag, &htag.Count); err != nil {
			log.Printf("[SEARCH] GetTrendingHashtags scan failed request_id=%s: %v", rid, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load trending hashtags"})
			return
		}
		hashtags = append(hashtags, htag)
	}

	log.Printf("[SEARCH] GetTrendingHashtags success request_id=%s count=%d", rid, len(hashtags))
	c.JSON(http.StatusOK, hashtags)
}

// GetSuggestedUsers returns suggested users to follow
// @Summary Get suggested users
// @Description Get suggested users to follow
// @Tags users
// @Security BearerAuth
// @Param limit query int false "Max results" default(5)
// @Success 200 {array} SearchUser
// @Router /api/v1/users/suggested [get]
func (h *SearchHandler) GetSuggestedUsers(c *gin.Context) {
	limit := 5
	rid := c.GetString("request_id")
	log.Printf("[SEARCH] GetSuggestedUsers starting request_id=%s limit=%d", rid, limit)
	if h.db == nil {
		log.Printf("[SEARCH] GetSuggestedUsers no db request_id=%s", rid)
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "database not configured"})
		return
	}

	rows, err := h.db.QueryContext(
		c.Request.Context(),
		`
		SELECT u.id, u.username, u.display_name, COALESCE(u.avatar_url, ''), COALESCE(u.bio, ''),
		       COALESCE(f.cnt, 0) AS followers
		FROM users u
		LEFT JOIN (
			SELECT following_id, COUNT(*)::int AS cnt
			FROM follows
			WHERE deleted_at IS NULL
			GROUP BY following_id
		) f ON f.following_id = u.id
		ORDER BY followers DESC, u.username ASC
		LIMIT $1
		`,
		limit,
	)
	if err != nil {
		log.Printf("[SEARCH] GetSuggestedUsers query failed request_id=%s: %v", rid, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load suggested users"})
		return
	}
	defer rows.Close()

	users := make([]SearchUser, 0)
	for rows.Next() {
		var u SearchUser
		if err := rows.Scan(&u.ID, &u.Username, &u.DisplayName, &u.AvatarURL, &u.Bio, &u.Followers); err != nil {
			log.Printf("[SEARCH] GetSuggestedUsers scan failed request_id=%s: %v", rid, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load suggested users"})
			return
		}
		users = append(users, u)
	}

	log.Printf("[SEARCH] GetSuggestedUsers success request_id=%s count=%d", rid, len(users))

	c.JSON(http.StatusOK, users)
}
