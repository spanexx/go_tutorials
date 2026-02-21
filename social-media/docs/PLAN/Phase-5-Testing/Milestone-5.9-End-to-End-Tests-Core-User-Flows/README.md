# Milestone 5.9 - End-to-End Tests - Core User Flows

## Problem Statement
End-to-end tests validate critical user journeys through the application using a real browser. These tests ensure all components work together correctly and user workflows function as expected.

## Success Metrics
- Core user flows have E2E test coverage
- Tests run in CI with headless browser
- Tests complete in < 5 minutes
- Screenshots captured on failure
- Video recording for debugging

## Non-Goals
- Unit testing components (covered in Milestone 5.5)
- API testing (covered in Milestone 5.6)
- Visual regression testing (future phase)

## Items

### Item 5.9.1 - Registration Flow E2E Test
**Type:** E2E Test
**Description:** Complete user registration flow test.
**Acceptance Criteria:**
- Navigate to registration page
- Fill name, email, password fields
- Verify password strength indicator
- Check terms checkbox
- Submit registration form
- Verify success toast notification
- Verify redirect to feed page
- Verify user is logged in (header shows user)
- Test duplicate email error
- Take screenshot on failure
**Passes:** false

### Item 5.9.2 - Login Flow E2E Test
**Type:** E2E Test
**Description:** User login and session management flow.
**Acceptance Criteria:**
- Navigate to login page
- Fill email and password
- Submit login form
- Verify loading state
- Verify redirect to feed page
- Verify user menu shows correct user
- Test invalid credentials error
- Test "Remember me" persistence
- Logout and verify redirect
- Test protected route redirect
**Passes:** false

### Item 5.9.3 - Post Creation E2E Test
**Type:** E2E Test
**Description:** Create post with various content types.
**Acceptance Criteria:**
- Login as test user
- Navigate to feed page
- Click create post button
- Type post content
- Verify character counter
- Attach image(s)
- Verify image preview
- Submit post
- Verify post appears in feed
- Verify toast notification
- Test validation (empty content, too long)
**Passes:** false

### Item 5.9.4 - Feed Interaction E2E Test
**Type:** E2E Test
**Description:** Interact with feed and posts.
**Acceptance Criteria:**
- Login and view feed
- Verify posts load with skeleton
- Scroll and trigger infinite load
- Verify hasMore pagination
- Click like on post
- Verify like count updates
- Click comment button
- View comments section
- Click share button
- Click bookmark button
- Navigate to different feed tabs
**Passes:** false

### Item 5.9.5 - Profile Management E2E Test
**Type:** E2E Test
**Description:** View and edit user profile.
**Acceptance Criteria:**
- Login as test user
- Navigate to profile page
- Verify profile info displays
- Click edit profile
- Change bio text
- Upload new avatar
- Verify image crop/modal
- Save changes
- Verify profile updated
- View posts grid
- Test follow/unfollow buttons
**Passes:** false

### Item 5.9.6 - Navigation E2E Test
**Type:** E2E Test
**Description:** Test application navigation and routing.
**Acceptance Criteria:**
- Test sidebar navigation links
- Test header navigation
- Test mobile menu toggle
- Test browser back/forward
- Test direct URL access
- Test 404 page
- Test query parameter handling
- Test active route highlighting
- Test keyboard navigation (Tab)
**Passes:** false

### Item 5.9.7 - Responsive Design E2E Test
**Type:** E2E Test
**Description:** Test application at different viewports.
**Acceptance Criteria:**
- Test at mobile viewport (375px)
- Test at tablet viewport (768px)
- Test at desktop viewport (1440px)
- Verify sidebar collapse on mobile
- Verify feed layout adjustments
- Verify post card responsive
- Test mobile navigation drawer
- Take screenshots at each size
**Passes:** false

### Item 5.9.8 - Dark Mode E2E Test
**Type:** E2E Test
**Description:** Test dark mode toggle and persistence.
**Acceptance Criteria:**
- Toggle dark mode
- Verify dark class applied to body
- Verify dark theme styles applied
- Navigate between pages
- Verify theme persists
- Reload page
- Verify theme still active
- Toggle back to light
- Verify light theme restored
**Passes:** false

## Affected Files
- `e2e/tests/auth/register.spec.ts`
- `e2e/tests/auth/login.spec.ts`
- `e2e/tests/posts/create.spec.ts`
- `e2e/tests/feed/interact.spec.ts`
- `e2e/tests/profile/manage.spec.ts`
- `e2e/tests/navigation/nav.spec.ts`
- `e2e/tests/ui/responsive.spec.ts`
- `e2e/tests/ui/dark-mode.spec.ts`

## Affected Dependencies
- @playwright/test
- Playwright browsers (chromium)

## Notes
- Use Page Object Model pattern
- Create test users in beforeAll
- Clean up test data in afterAll
- Run tests in parallel where possible
- Use test isolation (fresh browser context)
