package handlers

import (
	"database/sql"
	"math"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
)

// TopPost represents a top performing post
type TopPost struct {
	ID         string `json:"id"`
	Content    string `json:"content"`
	ImageURL   string `json:"image_url,omitempty"`
	Likes      int    `json:"likes"`
	Comments   int    `json:"comments"`
	Shares     int    `json:"shares"`
	Views      int    `json:"views"`
	Engagement int    `json:"engagement"`
	CreatedAt  string `json:"created_at"`
}

// AnalyticsHandler handles analytics API requests
type AnalyticsHandler struct {
	db *sql.DB
}

// NewAnalyticsHandler creates a new analytics handler
func NewAnalyticsHandler(db *sql.DB) *AnalyticsHandler {
	return &AnalyticsHandler{db: db}
}

// EngagementData represents engagement metrics
type EngagementData struct {
	Date     string `json:"date"`
	Likes    int    `json:"likes"`
	Comments int    `json:"comments"`
	Shares   int    `json:"shares"`
	Views    int    `json:"views"`
}

// FollowerGrowth represents follower growth data
type FollowerGrowth struct {
	Date  string `json:"date"`
	Count int    `json:"count"`
	New   int    `json:"new"`
	Lost  int    `json:"lost"`
}

// PeriodComparison represents comparison metrics between two periods
type PeriodComparison struct {
	EngagementChange float64 `json:"engagementChange"`
	FollowersChange  float64 `json:"followersChange"`
	PostsChange      float64 `json:"postsChange"`
}

// GetEngagement returns engagement analytics
// @Summary Get engagement analytics
// @Description Get user engagement metrics over time
// @Tags analytics
// @Security BearerAuth
// @Param period query string false "Time period (7d, 30d, 90d)" default(7d)
// @Success 200 {array} EngagementData
// @Router /api/v1/analytics/engagement [get]
func (h *AnalyticsHandler) GetEngagement(c *gin.Context) {
	period := c.DefaultQuery("period", "7d")

	userID := c.GetString("user_id")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	if h.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Database not configured"})
		return
	}

	var days int
	switch period {
	case "7d":
		days = 7
	case "30d":
		days = 30
	case "90d":
		days = 90
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid period. Use 7d, 30d, or 90d"})
		return
	}

	from := time.Now().AddDate(0, 0, -days)

	rows, err := h.db.QueryContext(
		c.Request.Context(),
		`
			SELECT
				date_trunc('day', created_at) AS day,
				COALESCE(SUM(likes_count), 0) AS likes,
				COALESCE(SUM(comments_count), 0) AS comments,
				COALESCE(SUM(shares_count), 0) AS shares,
				COALESCE(SUM(views_count), 0) AS views
			FROM posts
			WHERE user_id = $1
			  AND created_at >= $2
			  AND deleted_at IS NULL
			GROUP BY 1
			ORDER BY 1 ASC
		`,
		userID,
		from,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query engagement"})
		return
	}
	defer rows.Close()

	data := make([]EngagementData, 0)
	for rows.Next() {
		var day time.Time
		var likes, comments, shares, views int
		if err := rows.Scan(&day, &likes, &comments, &shares, &views); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read engagement"})
			return
		}
		data = append(data, EngagementData{
			Date:     day.Format("2006-01-02"),
			Likes:    likes,
			Comments: comments,
			Shares:   shares,
			Views:    views,
		})
	}
	if err := rows.Err(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query engagement"})
		return
	}

	c.JSON(http.StatusOK, data)
}

// GetFollowers returns follower growth analytics
// @Summary Get follower growth analytics
// @Description Get user follower growth over time
// @Tags analytics
// @Security BearerAuth
// @Param period query string false "Time period (7d, 30d, 90d)" default(7d)
// @Success 200 {array} FollowerGrowth
// @Router /api/v1/analytics/followers [get]
func (h *AnalyticsHandler) GetFollowers(c *gin.Context) {
	period := c.DefaultQuery("period", "7d")

	// In a full implementation, fetch from database
	data := []FollowerGrowth{
		{Date: "2026-02-14", Count: 1250, New: 15, Lost: 3},
		{Date: "2026-02-15", Count: 1268, New: 22, Lost: 4},
		{Date: "2026-02-16", Count: 1281, New: 18, Lost: 5},
		{Date: "2026-02-17", Count: 1305, New: 31, Lost: 7},
		{Date: "2026-02-18", Count: 1342, New: 42, Lost: 5},
		{Date: "2026-02-19", Count: 1368, New: 28, Lost: 2},
		{Date: "2026-02-20", Count: 1389, New: 25, Lost: 4},
	}

	if period != "7d" {
		// Extend data for longer periods
	}

	c.JSON(http.StatusOK, data)
}

// GetStats returns overall user statistics
// @Summary Get user statistics
// @Description Get overall user statistics
// @Tags analytics
// @Security BearerAuth
// @Success 200 {object} map[string]interface{}
// @Router /api/v1/analytics/stats [get]
func (h *AnalyticsHandler) GetStats(c *gin.Context) {
	// In a full implementation, fetch from database
	c.JSON(http.StatusOK, gin.H{
		"total_posts":     156,
		"total_likes":     2847,
		"total_comments":  523,
		"total_shares":    189,
		"total_followers": 1389,
		"total_following": 245,
		"engagement_rate": 4.2,
	})
}

// CompareWithPreviousPeriod returns comparison between current period and previous period
// @Summary Compare current period to previous period
// @Description Compare engagement, followers, and posts for current period vs the previous equal-length period
// @Tags analytics
// @Security BearerAuth
// @Param period query string false "Time period (7d, 30d, 90d)" default(7d)
// @Success 200 {object} PeriodComparison
// @Router /api/v1/analytics/compare [get]
func (h *AnalyticsHandler) CompareWithPreviousPeriod(c *gin.Context) {
	period := c.DefaultQuery("period", "7d")

	userID := c.GetString("user_id")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	if h.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Database not configured"})
		return
	}

	var days int
	switch period {
	case "7d":
		days = 7
	case "30d":
		days = 30
	case "90d":
		days = 90
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid period. Use 7d, 30d, or 90d"})
		return
	}

	now := time.Now()
	curFrom := now.AddDate(0, 0, -days)
	prevFrom := now.AddDate(0, 0, -2*days)

	var curPosts, prevPosts int64
	err := h.db.QueryRowContext(
		c.Request.Context(),
		`SELECT COUNT(*) FROM posts WHERE user_id = $1 AND created_at >= $2 AND deleted_at IS NULL`,
		userID,
		curFrom,
	).Scan(&curPosts)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query posts"})
		return
	}

	err = h.db.QueryRowContext(
		c.Request.Context(),
		`SELECT COUNT(*) FROM posts WHERE user_id = $1 AND created_at >= $2 AND created_at < $3 AND deleted_at IS NULL`,
		userID,
		prevFrom,
		curFrom,
	).Scan(&prevPosts)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query posts"})
		return
	}

	var curEngagement, prevEngagement int64
	err = h.db.QueryRowContext(
		c.Request.Context(),
		`
			SELECT COALESCE(SUM(likes_count + comments_count + shares_count), 0)
			FROM posts
			WHERE user_id = $1 AND created_at >= $2 AND deleted_at IS NULL
		`,
		userID,
		curFrom,
	).Scan(&curEngagement)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query engagement"})
		return
	}

	err = h.db.QueryRowContext(
		c.Request.Context(),
		`
			SELECT COALESCE(SUM(likes_count + comments_count + shares_count), 0)
			FROM posts
			WHERE user_id = $1 AND created_at >= $2 AND created_at < $3 AND deleted_at IS NULL
		`,
		userID,
		prevFrom,
		curFrom,
	).Scan(&prevEngagement)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query engagement"})
		return
	}

	var curFollowers, prevFollowers int64
	err = h.db.QueryRowContext(
		c.Request.Context(),
		`SELECT COUNT(*) FROM follows WHERE following_id = $1 AND deleted_at IS NULL`,
		userID,
	).Scan(&curFollowers)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query followers"})
		return
	}

	err = h.db.QueryRowContext(
		c.Request.Context(),
		`SELECT COUNT(*) FROM follows WHERE following_id = $1 AND created_at < $2 AND deleted_at IS NULL`,
		userID,
		curFrom,
	).Scan(&prevFollowers)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query followers"})
		return
	}

	percent := func(cur, prev int64) float64 {
		if prev <= 0 {
			if cur == 0 {
				return 0
			}
			return 100
		}
		return (float64(cur-prev) / float64(prev)) * 100
	}

	resp := PeriodComparison{
		EngagementChange: math.Round(percent(curEngagement, prevEngagement)*10) / 10,
		FollowersChange:  math.Round(percent(curFollowers, prevFollowers)*10) / 10,
		PostsChange:      math.Round(percent(curPosts, prevPosts)*10) / 10,
	}

	c.JSON(http.StatusOK, resp)
}

// GetTopPosts returns top performing posts
// @Summary Get top posts
// @Description Get top performing posts by engagement
// @Tags analytics
// @Security BearerAuth
// @Param period query string false "Time period (7d, 30d, 90d)" default(7d)
// @Param limit query int false "Max results" default(5)
// @Success 200 {array} TopPost
// @Router /api/v1/analytics/top-posts [get]
func (h *AnalyticsHandler) GetTopPosts(c *gin.Context) {
	period := c.DefaultQuery("period", "7d")
	limit := 5
	if l := c.Query("limit"); l != "" {
		if n, err := strconv.Atoi(l); err == nil && n > 0 {
			limit = n
		}
	}

	userID := c.GetString("user_id")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	if h.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Database not configured"})
		return
	}

	var days int
	switch period {
	case "7d":
		days = 7
	case "30d":
		days = 30
	case "90d":
		days = 90
	default:
		days = 7
	}

	from := time.Now().AddDate(0, 0, -days)

	rows, err := h.db.QueryContext(
		c.Request.Context(),
		`
			SELECT
				id,
				content,
				COALESCE(image_url, '') as image_url,
				likes_count,
				comments_count,
				shares_count,
				views_count,
				(likes_count + comments_count + shares_count) as engagement,
				created_at
			FROM posts
			WHERE user_id = $1
			  AND created_at >= $2
			  AND deleted_at IS NULL
			ORDER BY engagement DESC, created_at DESC
			LIMIT $3
		`,
		userID,
		from,
		limit,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to query top posts"})
		return
	}
	defer rows.Close()

	posts := make([]TopPost, 0)
	for rows.Next() {
		var p TopPost
		var createdAt time.Time
		if err := rows.Scan(&p.ID, &p.Content, &p.ImageURL, &p.Likes, &p.Comments, &p.Shares, &p.Views, &p.Engagement, &createdAt); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read top posts"})
			return
		}
		p.CreatedAt = createdAt.Format("2006-01-02T15:04:05Z")
		posts = append(posts, p)
	}

	c.JSON(http.StatusOK, posts)
}
