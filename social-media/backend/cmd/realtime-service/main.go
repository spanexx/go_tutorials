package main

import (
	"context"
	"database/sql"
	"flag"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"

	"github.com/socialhub/auth-service/internal/websocket"
)

func main() {
	// Parse flags
	port := flag.String("port", ":8082", "WebSocket server port")
	redisAddr := flag.String("redis", "localhost:6379", "Redis address")
	dbConn := flag.String("db", "postgres://localhost:5432/socialhub?sslmode=disable", "Database connection string")
	logLevel := flag.String("log-level", "info", "Log level (debug, info, warn, error)")
	flag.Parse()

	// Setup logger
	logger, err := setupLogger(*logLevel)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to setup logger: %v\n", err)
		os.Exit(1)
	}
	defer logger.Sync()

	// Setup Redis client
	redisClient := setupRedis(*redisAddr)
	defer redisClient.Close()

	// Setup database connection
	db, err := setupDatabase(*dbConn)
	if err != nil {
		logger.Warn("Failed to connect to database, messaging features will be limited", zap.Error(err))
	}
	defer db.Close()

	// Create WebSocket server config
	config := websocket.DefaultConfig()
	config.Port = *port

	// Create WebSocket server
	wsServer := websocket.NewWebSocketServer(config, logger, redisClient, db)

	// Setup context with cancellation
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Start WebSocket server
	if err := wsServer.Start(ctx); err != nil {
		logger.Fatal("Failed to start WebSocket server", zap.Error(err))
	}

	logger.Info("WebSocket realtime service started",
		zap.String("port", *port),
		zap.String("redis", *redisAddr))

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Info("Shutting down WebSocket server...")

	// Graceful shutdown
	if err := wsServer.Stop(ctx); err != nil {
		logger.Error("Error during shutdown", zap.Error(err))
		os.Exit(1)
	}

	logger.Info("WebSocket server stopped")
}

func setupLogger(level string) (*zap.Logger, error) {
	var logLevel zap.AtomicLevel
	switch level {
	case "debug":
		logLevel = zap.NewAtomicLevelAt(zap.DebugLevel)
	case "info":
		logLevel = zap.NewAtomicLevelAt(zap.InfoLevel)
	case "warn":
		logLevel = zap.NewAtomicLevelAt(zap.WarnLevel)
	case "error":
		logLevel = zap.NewAtomicLevelAt(zap.ErrorLevel)
	default:
		logLevel = zap.NewAtomicLevelAt(zap.InfoLevel)
	}

	config := zap.NewProductionConfig()
	config.Level = logLevel
	return config.Build()
}

func setupRedis(addr string) *redis.Client {
	return redis.NewClient(&redis.Options{
		Addr: addr,
	})
}

func setupDatabase(connStr string) (*sql.DB, error) {
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return nil, err
	}

	// Test connection
	if err := db.Ping(); err != nil {
		return nil, err
	}

	// Set connection pool settings
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)

	return db, nil
}
