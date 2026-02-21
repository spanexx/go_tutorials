package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"github.com/redis/go-redis/v9"
	httpserver "github.com/socialhub/auth-service/internal/http"
	"github.com/socialhub/auth-service/internal/config"
	"github.com/socialhub/auth-service/internal/email"
	"github.com/socialhub/auth-service/internal/repository"
	"github.com/socialhub/auth-service/internal/service"
)

// @title SocialHub Auth API
// @version 1.0.0
// @description Authentication service for SocialHub platform
// @host localhost:8080
// @BasePath /api/v1

// getRedisAddr extracts the address from Redis URL
func getRedisAddr(redisURL string) string {
	// Simple parsing for redis://localhost:6379 format
	// In production, use redis.ParseURL from go-redis
	if redisURL == "" {
		return "localhost:6379"
	}
	// Remove redis:// prefix
	addr := redisURL
	if len(addr) > 7 && addr[:7] == "redis://" {
		addr = addr[7:]
	}
	// Remove any path/query parts
	if idx := strings.Index(addr, "/"); idx != -1 {
		addr = addr[:idx]
	}
	if idx := strings.Index(addr, "?"); idx != -1 {
		addr = addr[:idx]
	}
	return addr
}
func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	log.Printf("Starting auth service on port %s", cfg.Port)

	// Initialize database repository
	repo, err := repository.NewRepository(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to initialize repository: %v", err)
	}
	defer repo.Close()

	// Initialize Redis client
	redisClient := redis.NewClient(&redis.Options{
		Addr:     getRedisAddr(cfg.RedisURL),
		Password: "", // No password by default
		DB:       0,  // Default DB
	})

	// Test Redis connection
	if _, err := redisClient.Ping(context.Background()).Result(); err != nil {
		log.Printf("Warning: Redis connection failed: %v", err)
		log.Println("Running without Redis - token blacklisting will be disabled")
		redisClient = nil // Run without Redis
	} else {
		log.Println("Connected to Redis")
	}

	// Initialize email service
	var emailService *email.EmailService
	var emailQueue *email.EmailQueue
	if cfg.EmailEnabled {
		// Get absolute path to templates directory
		execPath, err := os.Executable()
		if err != nil {
			log.Printf("Warning: Could not determine executable path: %v", err)
			execPath = "."
		}
		execDir := filepath.Dir(execPath)
		templateDir := filepath.Join(execDir, "internal", "email", "templates")

		// Check if templates directory exists, if not, try relative path
		if _, err := os.Stat(templateDir); os.IsNotExist(err) {
			// Try relative to working directory
			templateDir = filepath.Join("internal", "email", "templates")
			if _, err := os.Stat(templateDir); os.IsNotExist(err) {
				log.Printf("Warning: Email templates directory not found at %s", templateDir)
				templateDir = ""
			}
		}

		smtpConfig := &email.SMTPConfig{
			Host:       cfg.EmailHost,
			Port:       cfg.EmailPort,
			Username:   cfg.EmailUsername,
			Password:   cfg.EmailPassword,
			FromName:   cfg.EmailFromName,
			FromEmail:  cfg.EmailFromAddress,
		}
		emailService = email.NewEmailService(smtpConfig, templateDir, cfg.EmailEnabled)

		// Set frontend URL for email links
		emailService.SetFrontendURL(cfg.FrontendURL)

		// Print Ethereal Email credentials for development
		if cfg.EmailHost == "smtp.ethereal.email" && cfg.EmailUsername != "" {
			log.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
			log.Println("📧 ETHEREAL EMAIL (Development)")
			log.Printf("   Username: %s", cfg.EmailUsername)
			log.Printf("   Password: %s", cfg.EmailPassword)
			log.Println("   Web Inbox: https://ethereal.email/messages")
			log.Println("   Use these credentials to view sent emails")
			log.Println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
		}

		// Initialize email queue if Redis is available
		if redisClient != nil {
			emailQueue = email.NewEmailQueue(redisClient, "email_queue", "email_dlq")
			emailService.SetQueue(emailQueue)
			emailQueue.StartWorker(emailService)
			log.Println("Email queue worker started")
		}

		log.Printf("Email service initialized (host: %s:%d, enabled: %v)", cfg.EmailHost, cfg.EmailPort, emailService.IsEnabled())
	} else {
		log.Println("Email service is disabled")
		emailService = email.NewEmailService(nil, "", false)
	}

	// Initialize service layer
	authService := service.NewAuthService(repo, cfg, redisClient, emailService)

	// Initialize HTTP server
	server := httpserver.NewServer(cfg, authService, redisClient, emailService)

	// Channel to listen for shutdown signals
	shutdown := make(chan os.Signal, 1)
	signal.Notify(shutdown, os.Interrupt, syscall.SIGTERM)

	// Start server in a goroutine
	go func() {
		if err := server.Run(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server failed: %v", err)
		}
	}()

	log.Println("Auth service is ready to handle requests")

	// Wait for shutdown signal
	<-shutdown
	log.Println("Shutting down auth service...")

	// Create context with timeout for graceful shutdown
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// Stop email queue worker gracefully
	if emailQueue != nil {
		log.Println("Waiting for email queue to finish...")
		emailQueue.Stop()
	}

	if err := server.Shutdown(ctx); err != nil {
		log.Fatalf("Server shutdown error: %v", err)
	}

	log.Println("Auth service stopped")
}
