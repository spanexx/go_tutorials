# Phase 2: Social Interactions

## Overview
This phase adds the interactive social features that make SocialHub engaging: reactions, comments, sharing, hashtags, mentions, and the social graph (following). This phase also implements the Go Posts Service API, transitioning the frontend from mock data to real backend integration.

## Scope
- Post reactions (6 types: Like, Love, Laugh, Wow, Sad, Angry)
- Comment and reply system with nesting
- Hashtag support with clickable tags and pages
- User mentions with @username and profile links
- Share functionality (copy link, social platforms)
- Follow/unfollow system
- Activity feed showing platform interactions
- Go Posts Service: CRUD APIs, feed generation, reactions, comments

## Out of Scope
- Real-time updates (WebSockets) (Phase 3)
- Image uploads in posts/comments (Phase 3)
- Advanced content moderation (Phase 4)
- Search indexing with Elasticsearch (Phase 3)

## Milestones

### Milestone 2.1 - Post Reactions & Engagement
Implement the 6 reaction types and engagement tracking on posts.

### Milestone 2.2 - Comments & Replies System
Build the comment system with nested replies and threading support.

### Milestone 2.3 - Hashtags & Mentions
Implement clickable hashtags leading to topic pages and @mentions linking to profiles.

### Milestone 2.4 - Sharing & Activity Feed
Create share functionality and an activity feed showing user interactions.

### Milestone 2.5 - Social Graph (Follow System)
Implement follow/unfollow functionality and follower/following lists.

### Milestone 2.6 - Go Posts Service API
**Status:** Ready for Implementation
**Dependencies:** Milestone 1.5 (Go Backend Foundation), Milestone 2.1-2.5 (frontend contracts)

Implement the Go Posts Service with full API support for posts, comments, and reactions. Transition Angular frontend from mock data to real backend APIs.

## Success Criteria
- Users can react to posts with 6 emotion types (via Go API)
- Users can comment on posts and reply to comments (via Go API)
- Hashtags are clickable and lead to filtered views
- @mentions link to user profiles
- Users can share posts via multiple methods
- Users can follow/unfollow other users
- Activity feed shows relevant interactions
- Go Posts Service running with all endpoints functional
- PostgreSQL schema with posts, comments, reactions tables
- Angular frontend fully integrated with Go APIs (no mock data)
- API latency < 150ms for feed endpoint (p95)

## Phase Entry Criteria
- Phase 1 completed (authentication, feed, profiles)
- Go Auth Service running and accessible
- User can create and view posts (mock data)

## Phase Exit Criteria
- All social interaction features functional
- No critical bugs in engagement features
- Activity feed displays correctly
- Go Posts Service deployed and accessible
- All frontend services using real APIs
- Integration tests passing for posts endpoints
- Database migrations applied successfully
