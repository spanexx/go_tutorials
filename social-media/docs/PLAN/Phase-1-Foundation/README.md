# Phase 1: Foundation & Core Features

## Overview
This phase establishes the foundational infrastructure and core user-facing features of SocialHub. It includes authentication, basic feed functionality, user profiles, and the essential UI components needed for the application to function as a social media platform. This phase also lays the groundwork for the Go backend infrastructure.

## Scope
- User authentication and session management (Angular mock + Go backend foundation)
- Core page structure and routing
- Basic feed with post creation
- User profile pages (view and edit)
- Design system implementation
- Toast notification system
- Dark mode toggle
- Go backend foundation: Auth Service, PostgreSQL setup, JWT authentication

## Out of Scope
- Real-time features (WebSockets)
- Image uploads and optimization
- Advanced social features (reactions, comments)
- Notifications system
- Analytics dashboard
- Full backend API integration (Phase 2)

## Milestones

### Milestone 1.1 - Authentication System
**Status:** Ready for Implementation
**Dependencies:** None

Complete user authentication with login/register flows, protected routes, and session persistence.

### Milestone 1.2 - Core UI Components & Design System
**Status:** Ready for Implementation
**Dependencies:** None

Implement the design system with CSS variables, reusable components, and the foundational UI structure including header, sidebar, and navigation.

### Milestone 1.3 - Feed Page & Post Creation
**Status:** Ready for Implementation
**Dependencies:** Milestone 1.1, 1.2

Build the main feed page with post creation functionality, infinite scroll, and skeleton loading states.

### Milestone 1.4 - Profile System
**Status:** Ready for Implementation
**Dependencies:** Milestone 1.1, 1.2

Create user profile pages (view and edit), profile cards, and user information management.

### Milestone 1.5 - Go Backend Foundation
**Status:** Ready for Implementation
**Dependencies:** Milestone 1.1 (for API contract understanding)

Establish the Go backend foundation with Auth Service, PostgreSQL database, JWT authentication, and core API infrastructure. Enables real authentication for subsequent phases.

## Success Criteria
- Users can register, login, and logout (mock initially, real API ready)
- Authenticated routes are protected
- Users can create posts and view them in the feed
- Users can view and edit their profiles
- Dark mode works across all pages
- Design system is consistent throughout
- Toast notifications provide user feedback
- Go Auth Service running with all auth endpoints functional
- PostgreSQL database with users table and migrations
- JWT authentication with refresh token support
- OpenAPI documentation available at /api/docs

## Phase Entry Criteria
- Angular 18 project is set up
- Basic routing structure exists
- SCSS is configured
- Go 1.21+ installed for backend development
- Docker installed for local database setup

## Phase Exit Criteria
- All milestones completed and validated
- No critical bugs in authentication
- Feed displays posts correctly
- Profiles are functional
- UI is responsive across breakpoints
- Go Auth Service deployed and accessible
- Database migrations applied successfully
- Integration tests passing for auth endpoints
- Angular environment configured for backend API
