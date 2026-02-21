// Posts Service - SocialHub Backend
// @title SocialHub Posts API
// @version 1.0
// @description Posts, comments, reactions, and feed management API for SocialHub
// @termsOfService http://swagger.io/terms/

// @contact.name API Support
// @contact.email support@socialhub.com

// @license.name MIT
// @license.url https://opensource.org/licenses/MIT

// @host localhost:8081
// @BasePath /api/v1

// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description Enter your bearer token in the format: Bearer {token}

package main

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	_ "github.com/lib/pq"

	"github.com/socialhub/auth-service/internal/handlers"
	"github.com/socialhub/auth-service/internal/service"
	swaggerFiles "github.com/swaggo/files"
	"github.com/swaggo/gin-swagger"
)

// @title SocialHub Posts API
// @version 1.0
// @description Comprehensive API for managing posts, comments, reactions, and feeds
// @termsOfService http://swagger.io/terms/

// @contact.name API Support
// @contact.email support@socialhub.com

// @license.name MIT
// @license.url https://opensource.org/licenses/MIT

// @host localhost:8081
// @BasePath /api/v1

// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description Enter your bearer token in the format: Bearer {token}

func main() {
	// Get database URL from environment
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://localhost:5432/socialhub?sslmode=disable"
	}

	// Connect to database
	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Test database connection
	if err := db.Ping(); err != nil {
		log.Printf("Warning: Database connection failed: %v", err)
		log.Println("Starting with mock data (no database connection)")
	}

	// Initialize services
	postService := service.NewPostService(db)
	reactionService := service.NewReactionService(db)
	commentService := service.NewCommentService(db)
	followService := service.NewFollowService(db)

	// Set up Gin router
	router := gin.Default()

	// Health check endpoint
	// @Summary Health check
	// @Description Check if the service is running
	// @Tags health
	// @Success 200 {object} map[string]string
	// @Router /health [get]
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":    "ok",
			"timestamp": time.Now().Format(time.RFC3339),
		})
	})

	// Swagger documentation
	// @Summary Swagger UI
	// @Description Interactive API documentation
	// @Tags documentation
	// @Router /swagger/index.html [get]
	router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	// API v1 routes
	v1 := router.Group("/api/v1")
	{
		// Post routes
		handlers.RegisterPostRoutes(v1, postService, reactionService, commentService)

		// Comment routes
		handlers.RegisterCommentRoutes(v1, commentService)

		// Reaction routes
		handlers.RegisterReactionRoutes(v1, reactionService)

		// Follow routes
		handlers.RegisterFollowRoutes(v1, followService)
	}

	// Set up graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	// Start server
	server := &http.Server{
		Addr:    ":8081",
		Handler: router,
	}

	go func() {
		fmt.Println("🚀 Posts Service starting on port 8081")
		fmt.Println("📚 Swagger UI available at http://localhost:8081/swagger/index.html")
		fmt.Println("🏥 Health check at http://localhost:8081/health")

		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	// Wait for interrupt signal
	<-quit
	log.Println("Shutting down server...")

	// Graceful shutdown with timeout
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exited gracefully")
}
