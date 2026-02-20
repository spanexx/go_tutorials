package httpserver

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/socialhub/auth-service/internal/config"
	"github.com/socialhub/auth-service/internal/handlers"
	"github.com/socialhub/auth-service/internal/middleware"
	"github.com/socialhub/auth-service/internal/service"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
)

// Server represents the HTTP server
type Server struct {
	router *gin.Engine
	httpSrv *http.Server
	config *config.Config
}

// NewServer creates a new HTTP server
func NewServer(cfg *config.Config, authService *service.AuthService) *Server {
	router := gin.Default()

	// Apply middleware
	router.Use(middleware.Recovery())
	router.Use(middleware.Logger())
	router.Use(middleware.CORS())
	router.Use(middleware.RequestID())

	// Health endpoints
	router.GET("/healthz", healthCheck)
	router.GET("/readyz", readinessCheck)

	// API v1 routes
	v1 := router.Group("/api/v1")
	{
		// Auth handlers
		authHandler := handlers.NewAuthHandler(authService)
		
		// Analytics handlers
		analyticsHandler := handlers.NewAnalyticsHandler()
		
		// Search handlers
		searchHandler := handlers.NewSearchHandler()
		
		// User handlers
		userHandler := handlers.NewUserHandler(authService)

		// Public routes
		auth := v1.Group("/auth")
		{
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
			auth.POST("/refresh", authHandler.RefreshToken)
			auth.GET("/verify/:token", authHandler.VerifyEmail)
		}
		
		// Search routes (public)
		search := v1.Group("/search")
		{
			search.GET("", searchHandler.Search)
		}
		
		// Hashtags routes (public)
		hashtags := v1.Group("/hashtags")
		{
			hashtags.GET("/trending", searchHandler.GetTrendingHashtags)
		}
		
		// Users routes (mixed)
		users := v1.Group("/users")
		{
			users.GET("/suggested", searchHandler.GetSuggestedUsers)
			users.GET("/:username", userHandler.GetUserByUsername)
			users.GET("/id/:id", userHandler.GetUserByID)
			users.POST("/:username/follow", userHandler.FollowUser)
			users.POST("/:username/unfollow", userHandler.UnfollowUser)
		}
		
		// Analytics routes (protected)
		analytics := v1.Group("/analytics")
		analytics.Use(middleware.Auth(authService))
		{
			analytics.GET("/engagement", analyticsHandler.GetEngagement)
			analytics.GET("/followers", analyticsHandler.GetFollowers)
			analytics.GET("/stats", analyticsHandler.GetStats)
		}

		// Protected routes
		protected := v1.Group("")
		protected.Use(middleware.Auth(authService))
		{
			protected.POST("/auth/logout", authHandler.Logout)
			protected.GET("/auth/me", authHandler.GetCurrentUser)
			protected.PUT("/user/profile", authHandler.UpdateProfile)
		}
	}

	// Swagger documentation
	router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	srv := &Server{
		router: router,
		config: cfg,
	}

	srv.httpSrv = &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      srv.router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	return srv
}

// Run starts the HTTP server
func (s *Server) Run() error {
	return s.httpSrv.ListenAndServe()
}

// Shutdown gracefully shuts down the server
func (s *Server) Shutdown(ctx context.Context) error {
	return s.httpSrv.Shutdown(ctx)
}

// healthCheck returns server health status
// @Summary Health check
// @Description Returns server health status
// @Tags health
// @Success 200 {object} map[string]string
// @Router /healthz [get]
func healthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

// readinessCheck checks if server is ready to handle requests
// @Summary Readiness check
// @Description Checks if server is ready to handle requests
// @Tags health
// @Success 200 {object} map[string]string
// @Failure 503 {object} map[string]string
// @Router /readyz [get]
func readinessCheck(c *gin.Context) {
	// Add database connectivity check here
	c.JSON(http.StatusOK, gin.H{"status": "ready"})
}
