#!/bin/bash
TM="/home/spanexx/Shared/Learn/go_tutorials/task-manager-dev"

# Phase 5 milestones - using correct phase id
$TM milestone add phase-5 "Milestone 5.1: Backend Unit Tests - Services" -d "Service layer unit tests with mocks"
$TM milestone add phase-5 "Milestone 5.2: Backend Unit Tests - Repositories" -d "Repository layer tests with test database"
$TM milestone add phase-5 "Milestone 5.3: Backend Unit Tests - Handlers" -d "HTTP handler tests with mock services"
$TM milestone add phase-5 "Milestone 5.4: Frontend Unit Tests - Services" -d "Angular service unit tests with HttpClientTestingModule"
$TM milestone add phase-5 "Milestone 5.5: Frontend Unit Tests - Components" -d "Angular component tests with TestBed"
$TM milestone add phase-5 "Milestone 5.6: API Integration Tests" -d "Backend API integration tests with test database"
$TM milestone add phase-5 "Milestone 5.7: Auth Integration Tests" -d "Authentication flow integration tests"
$TM milestone add phase-5 "Milestone 5.8: Database Integration Tests" -d "Database operations and migration tests"
$TM milestone add phase-5 "Milestone 5.9: E2E Tests - Core Flows" -d "End-to-end tests for login, feed, post creation"
$TM milestone add phase-5 "Milestone 5.10: E2E Tests - Social Features" -d "E2E tests for comments, reactions, follows"

echo "Phase 5 milestones created!"
