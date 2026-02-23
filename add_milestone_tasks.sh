#!/bin/bash
TM="/home/spanexx/Shared/Learn/go_tutorials/task-manager-dev"

# Milestone 1.1 - Authentication System (milestone-2-2)
$TM task add milestone-2-2 "Login Page Implementation" -p high -d "Create login form with validation and auth integration"
$TM task add milestone-2-2 "Registration Page Implementation" -p high -d "Create registration form with email validation and password confirmation"
$TM task add milestone-2-2 "Authentication Service & State Management" -p high -d "Implement AuthService with signals and localStorage persistence"
$TM task add milestone-2-2 "Route Guards Implementation" -p high -d "Create authGuard and guestGuard for protected routes"
$TM task add milestone-2-2 "User Menu & Logout Functionality" -p medium -d "Add user dropdown menu with profile, settings, logout options"

# Milestone 1.2 - Core UI Components (milestone-2-3)
$TM task add milestone-2-3 "Card Component" -p medium -d "Reusable card component with header, body, footer sections"
$TM task add milestone-2-3 "Button Component" -p medium -d "Button component with variants, sizes, loading states"
$TM task add milestone-2-3 "Input Component" -p medium -d "Text input with validation, error messages, labels"
$TM task add milestone-2-3 "Modal Component" -p medium -d "Modal dialog with overlay, close button, actions"
$TM task add milestone-2-3 "Sidebar Navigation" -p medium -d "Responsive sidebar with menu items and collapse"
$TM task add milestone-2-3 "Navbar Component" -p medium -d "Top navigation bar with logo, menu, user profile"

# Milestone 1.5 - Go Backend Foundation (milestone-2-28)
$TM task add milestone-2-28 "Project Structure & Module Setup" -p high -d "Initialize Go module with standard project layout"
$TM task add milestone-2-28 "Database Schema & Migrations" -p high -d "Create PostgreSQL users table with migrations"
$TM task add milestone-2-28 "Configuration Management" -p high -d "Implement Config struct with environment variables"
$TM task add milestone-2-28 "HTTP Server & Router Setup" -p high -d "Set up Gin HTTP server with middleware"
$TM task add milestone-2-28 "Repository Layer (sqlc)" -p high -d "Implement type-safe database access using sqlc"
$TM task add milestone-2-28 "Service Layer & Business Logic" -p high -d "Implement authentication business logic in service layer"
$TM task add milestone-2-28 "JWT Authentication Middleware" -p high -d "Implement JWT token generation, validation, and middleware"
$TM task add milestone-2-28 "HTTP Handlers & Routes" -p high -d "Create HTTP handlers for auth endpoints"
$TM task add milestone-2-28 "API Documentation (OpenAPI/Swagger)" -p medium -d "Generate OpenAPI 3.0 documentation for all endpoints"
$TM task add milestone-2-28 "Integration Tests" -p medium -d "Write comprehensive integration tests for auth service"
$TM task add milestone-2-28 "Docker Setup" -p medium -d "Create docker-compose.yml for PostgreSQL and Redis"
$TM task add milestone-2-28 "Makefile & Build Scripts" -p low -d "Create Makefile with build, run, test, migrate commands"

# Milestone 2.1 - Post Reactions (milestone-3-30)
$TM task add milestone-3-30 "Reaction Types & Data Model" -p high -d "Define reaction types (like, love, happy, angry, sad) and schema"
$TM task add milestone-3-30 "Backend Reaction Service" -p high -d "Implement React, RemoveReaction, GetReactions methods"
$TM task add milestone-3-30 "Reaction API Endpoints" -p high -d "Create POST/DELETE endpoints for react/unreact"
$TM task add milestone-3-30 "Frontend Reaction Component" -p high -d "Create reaction button/picker component with animation"
$TM task add milestone-3-30 "Reaction Counts Display" -p medium -d "Display reaction counts per type under posts"
$TM task add milestone-3-30 "User Reaction History" -p medium -d "Track and display user's reaction history"

# Milestone 2.6 - Posts Service API (milestone-3-35)
$TM task add milestone-3-35 "Posts CRUD Endpoints" -p high -d "Implement POST/GET/PUT/DELETE endpoints for posts"
$TM task add milestone-3-35 "Posts Database Schema" -p high -d "Create posts, comments, reactions tables with relationships"
$TM task add milestone-3-35 "Feed Algorithm Implementation" -p high -d "Implement home, trending, and latest feed algorithms"
$TM task add milestone-3-35 "Comments CRUD" -p high -d "Implement nested comments with CRUD operations"
$TM task add milestone-3-35 "Post Search & Filtering" -p high -d "Implement search by user, hashtag, content, date range"
$TM task add milestone-3-35 "Pagination & Limits" -p medium -d "Implement cursor-based pagination for feeds and comments"
$TM task add milestone-3-35 "Posts Integration Tests" -p medium -d "Write integration tests for all posts endpoints"
$TM task add milestone-3-35 "Frontend Posts Service" -p medium -d "Create Angular service for posts API communication"

# Milestone 3.7 - Realtime Service (milestone-4-42)
$TM task add milestone-4-42 "WebSocket Server Setup" -p high -d "Set up WebSocket server with connection management"
$TM task add milestone-4-42 "Connection & Authentication" -p high -d "Implement WebSocket authentication using JWT"
$TM task add milestone-4-42 "Real-time Notifications" -p high -d "Implement notification system for likes, comments, follows"
$TM task add milestone-4-42 "Presence Tracking" -p high -d "Track user presence (online/offline status)"
$TM task add milestone-4-42 "Typing Indicators" -p medium -d "Implement typing indicator for conversations"
$TM task add milestone-4-42 "Message Broadcasting" -p medium -d "Broadcast messages to subscribed clients"
$TM task add milestone-4-42 "Frontend WebSocket Service" -p medium -d "Create Angular service for WebSocket communication"
$TM task add milestone-4-42 "Realtime Service Integration Tests" -p medium -d "Write integration tests for WebSocket functionality"

# Milestone 4.7 - Production Backend (milestone-5-49)
$TM task add milestone-5-49 "Redis Caching Layer" -p high -d "Implement Redis caching for frequently accessed data"
$TM task add milestone-5-49 "Rate Limiting Middleware" -p high -d "Add rate limiting to API endpoints"
$TM task add milestone-5-49 "Monitoring & Logging" -p high -d "Add structured logging and monitoring"
$TM task add milestone-5-49 "Error Handling & Recovery" -p high -d "Implement comprehensive error handling and recovery"
$TM task add milestone-5-49 "Performance Optimization" -p medium -d "Optimize queries, add indexes, cache frequently used data"
$TM task add milestone-5-49 "Database Backup Strategy" -p medium -d "Implement automated backups and recovery procedures"
$TM task add milestone-5-49 "Horizontal Scaling" -p medium -d "Implement load balancing and service replication"
$TM task add milestone-5-49 "API Versioning" -p low -d "Implement API versioning strategy for backward compatibility"

echo "All tasks created!"
