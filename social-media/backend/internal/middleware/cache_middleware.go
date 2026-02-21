package middleware

import (
	"bytes"
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

// responseBodyWriter is a custom gin.ResponseWriter that captures the response body
type responseBodyWriter struct {
	gin.ResponseWriter
	body *bytes.Buffer
}

// Write intercepts the write operation and stores a copy of the body
func (w responseBodyWriter) Write(b []byte) (int, error) {
	w.body.Write(b)
	return w.ResponseWriter.Write(b)
}

// Cache is a middleware that caches the JSON response of a GET request via Redis.
func Cache(redisClient *redis.Client, ttl time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		// If Redis is not configured or HTTP method is not GET, skip caching
		if redisClient == nil || c.Request.Method != http.MethodGet {
			c.Next()
			return
		}

		// Use the request URI (includes query params) as the cache key
		cacheKey := "cache:" + c.Request.RequestURI
		ctx := context.Background()

		// 1. Try to fetch from Redis
		cachedResponse, err := redisClient.Get(ctx, cacheKey).Result()
		if err == nil && cachedResponse != "" {
			// Cache Hit: Return the cached response
			c.Header("Content-Type", "application/json")
			c.Header("X-Cache", "HIT")
			c.String(http.StatusOK, cachedResponse)
			c.Abort() // Stop the handler chain
			return
		}

		// Cache Miss: Prepare to capture the response
		// Set header here so it's included before body is written
		c.Header("X-Cache", "MISS")

		// Wrap the standard Gin ResponseWriter with our custom one
		w := &responseBodyWriter{
			ResponseWriter: c.Writer,
			body:           &bytes.Buffer{},
		}
		c.Writer = w

		// 2. Process the request via standard handler chain
		c.Next()

		// 3. After the handler finishes, check if it was successful (200 OK)
		if c.Writer.Status() == http.StatusOK {
			// Read the captured body
			responseBody := w.body.String()

			// Asynchronously save to Redis to not block the current request response
			go func(key, value string, duration time.Duration) {
				redisClient.Set(context.Background(), key, value, duration)
			}(cacheKey, responseBody, ttl)
		}
	}
}
