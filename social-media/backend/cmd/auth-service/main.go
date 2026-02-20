package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/socialhub/auth-service/internal/config"
	"github.com/socialhub/auth-service/internal/http"
	"github.com/socialhub/auth-service/internal/repository"
	"github.com/socialhub/auth-service/internal/service"
)

// @title SocialHub Auth API
// @version 1.0.0
// @description Authentication service for SocialHub platform
// @host localhost:8080
// @BasePath /api/v1
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

	// Initialize service layer
	authService := service.NewAuthService(repo, cfg)

	// Initialize HTTP server
	server := httpserver.NewServer(cfg, authService)

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

	if err := server.Shutdown(ctx); err != nil {
		log.Fatalf("Server shutdown error: %v", err)
	}

	log.Println("Auth service stopped")
}
