package config

import (
	"fmt"
	"log"
	"os"
	"strconv"
	"time"
)

// Config holds all configuration for the auth service
type Config struct {
	// Server configuration
	Port string

	// Database configuration
	DatabaseURL string

	// Redis configuration
	RedisURL string

	// JWT configuration
	JWTSecret  string
	JWTExpiry  time.Duration
	RefreshExpiry time.Duration

	// Environment
	Env string
}

// Load loads configuration from environment variables with defaults
func Load() (*Config, error) {
	cfg := &Config{
		// Server defaults
		Port: getEnv("PORT", "8080"),

		// Database
		DatabaseURL: getEnv("DATABASE_URL", "postgres://localhost:5432/socialhub?sslmode=disable"),

		// Redis
		RedisURL: getEnv("REDIS_URL", "redis://localhost:6379"),

		// JWT
		JWTSecret:     getEnv("JWT_SECRET", "dev-secret-key-change-in-production"),
		JWTExpiry:     getEnvDuration("JWT_EXPIRY", 15*time.Minute),
		RefreshExpiry: getEnvDuration("REFRESH_EXPIRY", 7*24*time.Hour),

		// Environment
		Env: getEnv("ENV", "development"),
	}

	// Validate required fields
	if cfg.JWTSecret == "" {
		return nil, fmt.Errorf("JWT_SECRET is required")
	}

	// Log configuration (excluding secrets)
	logConfig(cfg)

	return cfg, nil
}

// getEnv gets environment variable with default fallback
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// getEnvDuration gets environment variable as duration with default fallback
func getEnvDuration(key string, defaultValue time.Duration) time.Duration {
	if value := os.Getenv(key); value != "" {
		if duration, err := time.ParseDuration(value); err == nil {
			return duration
		}
	}
	return defaultValue
}

// getEnvInt gets environment variable as int with default fallback
func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}

// logConfig logs the configuration (excluding secrets)
func logConfig(cfg *Config) {
	log.Printf("Configuration loaded:")
	log.Printf("  Port: %s", cfg.Port)
	log.Printf("  Database: [configured]")
	log.Printf("  Redis: [configured]")
	log.Printf("  JWT Expiry: %v", cfg.JWTExpiry)
	log.Printf("  Refresh Expiry: %v", cfg.RefreshExpiry)
	log.Printf("  Environment: %s", cfg.Env)
}
