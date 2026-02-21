# Milestone 5.10 - End-to-End Tests - Social Features

## Problem Statement
End-to-end tests for social interaction features validate complex user workflows including following, reactions, comments, bookmarks, and notifications. These tests ensure the social aspects of the platform work correctly.

## Success Metrics
- All social flows have E2E test coverage
- Multi-user interactions tested
- Real-time updates verified
- Notifications triggered correctly
- Data consistency across users

## Non-Goals
- Performance under load (future phase)
- WebSocket real-time testing (separate scope)
- Email delivery testing (separate scope)

## Items

### Item 5.10.1 - Follow User E2E Test
**Type:** E2E Test
**Description:** Follow and unfollow user flow.
**Acceptance Criteria:**
- Login as User A
- Navigate to User B profile
- Click follow button
- Verify button changes to following
- Verify follower count increases
- Logout and login as User B
- Verify User A in followers list
- Click unfollow
- Verify button changes back
- Verify follower count decreases
- Test self-follow prevention
**Passes:** false

### Item 5.10.2 - Post Reactions E2E Test
**Type:** E2E Test
**Description:** React to posts with different reaction types.
**Acceptance Criteria:**
- Login as test user
- Find post in feed
- Click reaction button
- Select reaction type (like, love, etc.)
- Verify reaction count updates
- Verify reaction icon highlighted
- Toggle reaction off
- Verify count decreases
- Verify icon no longer highlighted
- Test reaction type switching
- Verify correct reaction stored
**Passes:** false

### Item 5.10.3 - Comments E2E Test
**Type:** E2E Test
**Description:** Add and interact with comments.
**Acceptance Criteria:**
- Login as User A
- Navigate to post
- Click comment button
- Type comment text
- Submit comment
- Verify comment appears
- Reply to comment as User B
- Verify nested reply structure
- Delete own comment
- Verify comment removed
- Test comment pagination
- Test comment depth limit
**Passes:** false

### Item 5.10.4 - Bookmarks E2E Test
**Type:** E2E Test
**Description:** Bookmark posts and manage collections.
**Acceptance Criteria:**
- Login as test user
- Navigate to feed
- Click bookmark on post
- Verify bookmark icon highlighted
- Navigate to bookmarks page
- Verify post appears in list
- Create new collection
- Move bookmark to collection
- Remove bookmark
- Verify removed from list
- Test collection privacy
**Passes:** false

### Item 5.10.5 - Share Post E2E Test
**Type:** E2E Test
**Description:** Share posts via different methods.
**Acceptance Criteria:**
- Login as test user
- Click share on post
- Verify share modal opens
- Copy link to clipboard
- Verify clipboard content
- Share via email (if implemented)
- Share via message (if implemented)
- Repost to own feed (if implemented)
- Verify share count increment
- Test share modal close
**Passes:** false

### Item 5.10.6 - Notifications E2E Test
**Type:** E2E Test
**Description:** Receive and view notifications.
**Acceptance Criteria:**
- Login as User A
- User B likes User A post
- Verify notification badge appears
- Click notification icon
- Verify notification list opens
- Verify like notification shown
- Click notification
- Navigate to relevant post
- Mark notification as read
- Verify badge updates
- Test notification pagination
- Test mark all as read
**Passes:** false

### Item 5.10.7 - Search E2E Test
**Type:** E2E Test
**Description:** Search for users, posts, and hashtags.
**Acceptance Criteria:**
- Login as test user
- Click search in header
- Type user name
- Verify user results appear
- Click on user result
- Navigate to profile
- Search for hashtag
- Verify hashtag results
- Click hashtag result
- Navigate to hashtag page
- Search for post content
- Verify post results
**Passes:** false

### Item 5.10.8 - Activity Feed E2E Test
**Type:** E2E Test
**Description:** View and filter activity feed.
**Acceptance Criteria:**
- Login as test user
- Navigate to activity page
- Verify activities load
- Filter by likes
- Filter by comments
- Filter by follows
- Test mark as read
- Test mark all as read
- Click activity item
- Navigate to relevant content
- Test infinite scroll
**Passes:** false

### Item 5.10.9 - Multi-User Interaction E2E Test
**Type:** E2E Test
**Description:** Complex multi-user scenarios.
**Acceptance Criteria:**
- Setup: User A, User B, User C
- User B follows User A
- User C follows User A
- User A posts content
- User B likes post
- User C comments on post
- User B replies to comment
- User A views notifications
- Verify all activities appear
- Test concurrent interactions
- Verify data consistency
**Passes:** false

### Item 5.10.10 - Privacy Controls E2E Test
**Type:** E2E Test
**Description:** Test privacy settings if implemented.
**Acceptance Criteria:**
- Login as User A
- Set profile to private (if feature exists)
- Login as User B (not following)
- Attempt to view User A profile
- Verify access denied or limited
- User A follows User B back
- User B now sees full profile
- Test post visibility settings
- Test follower list privacy
- Test activity feed privacy
**Passes:** false

## Affected Files
- `e2e/tests/social/follow.spec.ts`
- `e2e/tests/social/reactions.spec.ts`
- `e2e/tests/social/comments.spec.ts`
- `e2e/tests/social/bookmarks.spec.ts`
- `e2e/tests/social/share.spec.ts`
- `e2e/tests/social/notifications.spec.ts`
- `e2e/tests/social/search.spec.ts`
- `e2e/tests/social/activity.spec.ts`
- `e2e/tests/social/multi-user.spec.ts`
- `e2e/tests/social/privacy.spec.ts`

## Affected Dependencies
- @playwright/test

## Notes
- Use multiple authenticated contexts for multi-user tests
- Create test data fixtures
- Clean up test data after runs
- Test both happy path and edge cases
