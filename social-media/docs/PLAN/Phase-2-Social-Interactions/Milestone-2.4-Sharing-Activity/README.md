# Milestone 2.4 - Sharing & Activity Feed

## Problem Statement
Content distribution and user engagement tracking require sharing functionality and an activity feed. Users want to share interesting posts externally and see what's happening on the platform.

## Success Metrics
- Users can share posts via multiple methods (copy link, social platforms)
- Share modal provides various sharing options
- Activity feed shows user interactions in real-time
- Activity items are filterable by type
- Shared posts track engagement

## Non-Goals
- Share analytics (Phase 4)
- Advanced share customization (Phase 4)
- Push notifications for activity (Phase 4)

## Items

### Item 2.4.1 - Share Service
**Type:** Feature
**Description:** Create service for handling post sharing operations and tracking.
**Acceptance Criteria:**
- ShareService with methods: sharePost, copyLink, getShareUrl
- Share tracking (increment share count)
- Support for multiple platforms (Twitter, Facebook, LinkedIn, WhatsApp, Email)
- Generate shareable URLs with post ID
- Copy to clipboard functionality
**Passes:** false

### Item 2.4.2 - Share Modal Component
**Type:** Feature
**Description:** Create the share modal with various sharing options.
**Acceptance Criteria:**
- Modal with share options grid
- Copy link button with feedback
- Social platform buttons (Twitter, Facebook, LinkedIn, WhatsApp)
- Email share option
- QR code generation (optional)
- Embed code option (placeholder)
- Close button and click-outside-to-close
**Passes:** false

### Item 2.4.3 - Activity Model & Service
**Type:** Feature
**Description:** Define activity data model and service for tracking user interactions.
**Acceptance Criteria:**
- Activity interface with id, type, actor, target, timestamp
- Activity types: LIKE, COMMENT, FOLLOW, POST, SHARE, MENTION
- ActivityService with methods: getUserActivity, getFeedActivity, createActivity
- Signal-based activity feed
- Pagination support
**Passes:** false

### Item 2.4.4 - Activity Feed Component
**Type:** Feature
**Description:** Create the activity feed showing user interactions.
**Acceptance Criteria:**
- List of activity items
- Each item shows: actor, action, target, timestamp
- Different icons for different activity types
- Click to navigate to relevant content
- Filter by type (All, Likes, Comments, Follows, etc.)
- Mark as read functionality
- Infinite scroll
**Passes:** false

### Item 2.4.5 - Activity Page
**Type:** Feature
**Description:** Create the dedicated activity/notifications page.
**Acceptance Criteria:**
- Route: /notifications or /activity
- Activity feed component as main content
- Filter tabs by activity type
- Mark all as read button
- Settings link for notification preferences (placeholder)
- Empty state when no activity
- Loading and error states
**Passes:** false

## Affected Files
- `src/app/shared/services/share.service.ts`
- `src/app/shared/components/share-modal/share-modal.component.ts`
- `src/app/shared/models/activity.model.ts`
- `src/app/shared/services/activity.service.ts`
- `src/app/shared/components/activity-feed/activity-feed.component.ts`
- `src/app/pages/notifications/notifications.component.ts`
- `src/app/shared/components/post-card/post-card.component.ts`

## Affected Dependencies
- Clipboard API

## Notes
- Activity feed is preliminary (no real-time updates until Phase 4)
- Prepare for WebSocket integration
