package handlers

import (
	"database/sql"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

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
