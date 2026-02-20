# Milestone 2.5 - Social Graph (Follow System)

## Problem Statement
The social graph is the foundation of connection in SocialHub. Users need to follow others to build their timeline and establish relationships.

## Success Metrics
- Users can follow other users
- Users can unfollow
- Follower and following counts display correctly
- Followers list page shows all followers
- Following list page shows all following
- Private account handling (Phase 3)

## Non-Goals
- Follow requests for private accounts (Phase 3)
- Follow suggestions (Phase 3)
- Follow analytics (Phase 4)

## Items

### Item 2.5.1 - Follow Model & Service
**Type:** Feature
**Description:** Define follow relationship model and service for managing follows.
**Acceptance Criteria:**
- Follow interface with id, followerId, followingId, createdAt
- FollowService with methods: followUser, unfollowUser, isFollowing, getFollowers, getFollowing
- Signal-based follow state
- Follow counts per user
- Prevent self-following
**Passes:** false

### Item 2.5.2 - Follow Button Component
**Type:** Feature
**Description:** Create the follow/unfollow button with state management.
**Acceptance Criteria:**
- Shows "Follow" when not following
- Shows "Following" when following (with hover to show "Unfollow")
- Loading state during action
- Success feedback
- Prevents self-follow
- Works on profile pages and cards
**Passes:** false

### Item 2.5.3 - Followers Page
**Type:** Feature
**Description:** Create the followers list page showing users who follow a profile.
**Acceptance Criteria:**
- Route: /profile/:id/followers
- List of follower users
- User cards with follow button
- Infinite scroll for large lists
- Follow back button
- Empty state when no followers
- Back to profile link
**Passes:** false

### Item 2.5.4 - Following Page
**Type:** Feature
**Description:** Create the following list page showing users a profile follows.
**Acceptance Criteria:**
- Route: /profile/:id/following
- List of followed users
- User cards with unfollow button
- Infinite scroll
- Empty state when not following anyone
- Back to profile link
**Passes:** false

### Item 2.5.5 - Profile Stats Integration
**Type:** Feature
**Description:** Integrate follow counts into profile display and make them clickable.
**Acceptance Criteria:**
- Show follower count on profile
- Show following count on profile
- Clicking counts navigates to respective list pages
- Real-time updates when following/unfollowing
- Format large numbers (1.2K, 1.5M)
**Passes:** false

## Affected Files
- `src/app/shared/models/follow.model.ts`
- `src/app/shared/services/follow.service.ts`
- `src/app/shared/components/follow-button/follow-button.component.ts`
- `src/app/pages/profile/followers/followers.component.ts`
- `src/app/pages/profile/following/following.component.ts`
- `src/app/pages/profile/profile.component.ts`
- `src/app/shared/components/profile-card/profile-card.component.ts`

## Affected Dependencies
- None

## Notes
- Mock follow relationships initially
- Prepare for real-time updates in Phase 4
