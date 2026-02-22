package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

type ipLimiters struct {
	mu sync.Mutex
	m  map[string]*rate.Limiter
}

type userLimiters struct {
	mu sync.Mutex
	m  map[string]*rate.Limiter
}

func newIPLimiters() *ipLimiters {
	return &ipLimiters{m: make(map[string]*rate.Limiter)}
}

func newUserLimiters() *userLimiters {
	return &userLimiters{m: make(map[string]*rate.Limiter)}
}

func (l *ipLimiters) get(ip string, r rate.Limit, b int) *rate.Limiter {
	l.mu.Lock()
	defer l.mu.Unlock()
	lim, ok := l.m[ip]
	if !ok {
		lim = rate.NewLimiter(r, b)
		l.m[ip] = lim
	}
	return lim
}

func (l *userLimiters) get(userID string, r rate.Limit, b int) *rate.Limiter {
	l.mu.Lock()
	defer l.mu.Unlock()
	lim, ok := l.m[userID]
	if !ok {
		lim = rate.NewLimiter(r, b)
		l.m[userID] = lim
	}
	return lim
}

var globalIPLimiters = newIPLimiters()
var globalUserLimiters = newUserLimiters()

func perDurationToRate(limit int, per time.Duration) rate.Limit {
	if per <= 0 {
		return rate.Inf
	}
	return rate.Every(per / time.Duration(limit))
}

func RateLimitByIP(limit int, per time.Duration) gin.HandlerFunc {
	r := perDurationToRate(limit, per)
	burst := limit
	if burst < 1 {
		burst = 1
	}

	return func(c *gin.Context) {
		ip := c.ClientIP()
		lim := globalIPLimiters.get(ip, r, burst)
		if !lim.Allow() {
			c.Header("Retry-After", "60")
			c.JSON(http.StatusTooManyRequests, gin.H{"error": "rate_limit_exceeded"})
			c.Abort()
			return
		}
		c.Next()
	}
}

func RateLimitByUser(limit int, per time.Duration) gin.HandlerFunc {
	r := perDurationToRate(limit, per)
	burst := limit
	if burst < 1 {
		burst = 1
	}

	return func(c *gin.Context) {
		userID := c.GetString("user_id")
		if userID == "" {
			c.Next()
			return
		}
		lim := globalUserLimiters.get(userID, r, burst)
		if !lim.Allow() {
			c.Header("Retry-After", "60")
			c.JSON(http.StatusTooManyRequests, gin.H{"error": "rate_limit_exceeded"})
			c.Abort()
			return
		}
		c.Next()
	}
}
