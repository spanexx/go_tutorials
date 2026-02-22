package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// AdminAuth protects admin routes using a static token.
func AdminAuth(adminToken string) gin.HandlerFunc {
	return func(c *gin.Context) {
		if adminToken == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Admin endpoints are disabled"})
			c.Abort()
			return
		}

		token := c.GetHeader("X-Admin-Token")
		if token == "" || token != adminToken {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			c.Abort()
			return
		}

		c.Next()
	}
}
