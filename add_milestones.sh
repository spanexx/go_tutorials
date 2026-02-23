#!/bin/bash
TM="/home/spanexx/Shared/Learn/go_tutorials/task-manager-dev"

# Phase 1 milestones
$TM milestone add phase-2 "Milestone 1.3: Feed Page" -d "Homepage feed with posts, pagination, lazy loading, filtering"
$TM milestone add phase-2 "Milestone 1.5: Go Backend Foundation" -d "Auth service with database, JWT, migrations, OpenAPI docs"
$TM milestone add phase-2 "Milestone 1.6: Email Service Integration" -d "Email notifications for registration, password reset, activity"

# Phase 2 milestones
$TM milestone add phase-3 "Milestone 2.1: Post Reactions" -d "Like/react functionality with counts and user feedback"
$TM milestone add phase-3 "Milestone 2.2: Comments & Replies" -d "Nested commenting system with real-time updates"
$TM milestone add phase-3 "Milestone 2.3: Hashtags & Mentions" -d "Tag parsing, searching, mention notifications"
$TM milestone add phase-3 "Milestone 2.4: Sharing & Activity" -d "Share posts, activity feed, engagement metrics"
$TM milestone add phase-3 "Milestone 2.5: Social Graph" -d "Follow/unfollow system, follower lists, recommendations"
$TM milestone add phase-3 "Milestone 2.6: Posts Service API" -d "Full CRUD posts, comments, reactions with feed algorithms"

# Phase 3 milestones
$TM milestone add phase-4 "Milestone 3.1: Notifications" -d "Real-time notifications for likes, comments, follows"
$TM milestone add phase-4 "Milestone 3.2: Bookmarks" -d "Save/bookmark posts, bookmark management"
$TM milestone add phase-4 "Milestone 3.3: Search & Explore" -d "Full-text search, trending topics, discover page"
$TM milestone add phase-4 "Milestone 3.4: Analytics" -d "User analytics, engagement metrics, insights dashboard"
$TM milestone add phase-4 "Milestone 3.5: Image Uploads" -d "Image upload, storage, optimization, gallery"
$TM milestone add phase-4 "Milestone 3.6: Messages" -d "Direct messaging, conversation history, notifications"
$TM milestone add phase-4 "Milestone 3.7: Realtime Service" -d "WebSocket server, real-time notifications, presence, typing"

# Phase 4 milestones
$TM milestone add phase-5 "Milestone 4.1: Real-time Updates" -d "Socket.io integration, live feeds, real-time notifications"
$TM milestone add phase-5 "Milestone 4.2: PWA Features" -d "Progressive web app, offline support, install prompt"
$TM milestone add phase-5 "Milestone 4.3: Accessibility" -d "WCAG 2.1 compliance, keyboard navigation, screen readers"
$TM milestone add phase-5 "Milestone 4.4: Internationalization" -d "Multi-language support, locale switching"
$TM milestone add phase-5 "Milestone 4.5: Performance" -d "Code splitting, lazy loading, caching, optimization"
$TM milestone add phase-5 "Milestone 4.6: Admin Panel" -d "User management, content moderation, analytics"
$TM milestone add phase-5 "Milestone 4.7: Production Backend" -d "Redis caching, rate limiting, observability, scaling"

# Phase 5 milestones
$TM milestone add phase-6 "Milestone 5.1: Backend Unit Tests - Services" -d "Service layer unit tests with mocks"
$TM milestone add phase-6 "Milestone 5.2: Backend Unit Tests - Repositories" -d "Repository layer tests with test database"
$TM milestone add phase-6 "Milestone 5.3: Backend Unit Tests - Handlers" -d "HTTP handler tests with mock services"
$TM milestone add phase-6 "Milestone 5.4: Frontend Unit Tests - Services" -d "Angular service unit tests with HttpClientTestingModule"
$TM milestone add phase-6 "Milestone 5.5: Frontend Unit Tests - Components" -d "Angular component tests with TestBed"
$TM milestone add phase-6 "Milestone 5.6: API Integration Tests" -d "Backend API integration tests with test database"
$TM milestone add phase-6 "Milestone 5.7: Auth Integration Tests" -d "Authentication flow integration tests"
$TM milestone add phase-6 "Milestone 5.8: Database Integration Tests" -d "Database operations and migration tests"
$TM milestone add phase-6 "Milestone 5.9: E2E Tests - Core Flows" -d "End-to-end tests for login, feed, post creation"
$TM milestone add phase-6 "Milestone 5.10: E2E Tests - Social Features" -d "E2E tests for comments, reactions, follows"

echo "All milestones created!"
