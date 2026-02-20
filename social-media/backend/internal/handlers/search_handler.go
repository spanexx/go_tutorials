package handlers

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// SearchHandler handles search API requests
type SearchHandler struct {
	// In a full implementation, this would inject search service
}

// NewSearchHandler creates a new search handler
func NewSearchHandler() *SearchHandler {
	return &SearchHandler{}
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
	_ = c.Query("type") // Reserved for future filtering
	limit := 10
	offset := 0

	if query == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Query parameter 'q' is required"})
		return
	}

	// In a full implementation, search the database
	// For now, return sample results based on query
	results := gin.H{
		"users":     []SearchUser{},
		"hashtags":  []SearchHashtag{},
		"query":     query,
		"total":     0,
		"limit":     limit,
		"offset":    offset,
	}

	// Sample data for demonstration
	if strings.Contains(strings.ToLower(query), "john") {
		results["users"] = []SearchUser{
			{
				ID:          "1",
				Username:    "johndoe",
				DisplayName: "John Doe",
				AvatarURL:   "https://i.pravatar.cc/150?img=1",
				Bio:         "Software developer",
				Followers:   1250,
			},
		}
	}

	if strings.HasPrefix(query, "#") {
		tag := strings.TrimPrefix(query, "#")
		results["hashtags"] = []SearchHashtag{
			{Tag: tag, Count: 156},
		}
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
	
	// In a full implementation, fetch from database
	hashtags := []SearchHashtag{
		{Tag: "WebDevelopment", Count: 145000},
		{Tag: "Angular", Count: 89000},
		{Tag: "TypeScript", Count: 67000},
		{Tag: "Golang", Count: 54000},
		{Tag: "UIDesign", Count: 45000},
		{Tag: "JavaScript", Count: 234000},
		{Tag: "Coding", Count: 189000},
		{Tag: "Programming", Count: 167000},
		{Tag: "Tech", Count: 156000},
		{Tag: "Developer", Count: 134000},
	}

	if len(hashtags) > limit {
		hashtags = hashtags[:limit]
	}

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

	// In a full implementation, fetch based on user's interests
	users := []SearchUser{
		{
			ID:          "2",
			Username:    "sarahjohnson",
			DisplayName: "Sarah Johnson",
			AvatarURL:   "https://i.pravatar.cc/150?img=5",
			Bio:         "Frontend developer & UI designer",
			Followers:   2340,
		},
		{
			ID:          "3",
			Username:    "marcuswilliams",
			DisplayName: "Marcus Williams",
			AvatarURL:   "https://i.pravatar.cc/150?img=12",
			Bio:         "Backend engineer | Go enthusiast",
			Followers:   1890,
		},
		{
			ID:          "4",
			Username:    "ninapatel",
			DisplayName: "Nina Patel",
			AvatarURL:   "https://i.pravatar.cc/150?img=9",
			Bio:         "Full-stack developer | Tech blogger",
			Followers:   3120,
		},
		{
			ID:          "5",
			Username:    "alexchen",
			DisplayName: "Alex Chen",
			AvatarURL:   "https://i.pravatar.cc/150?img=3",
			Bio:         "DevOps engineer | Cloud architect",
			Followers:   1560,
		},
		{
			ID:          "6",
			Username:    "emmadavis",
			DisplayName: "Emma Davis",
			AvatarURL:   "https://i.pravatar.cc/150?img=7",
			Bio:         "UX designer | Accessibility advocate",
			Followers:   2780,
		},
	}

	if len(users) > limit {
		users = users[:limit]
	}

	c.JSON(http.StatusOK, users)
}
