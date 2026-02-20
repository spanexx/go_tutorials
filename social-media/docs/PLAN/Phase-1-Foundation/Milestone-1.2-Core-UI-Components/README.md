# Milestone 1.2 - Core UI Components & Design System

## Problem Statement
SocialHub needs a consistent, modern design system with reusable UI components to ensure visual coherence across all pages. Without a solid component foundation, development will be inconsistent and maintenance will be difficult.

## Success Metrics
- Design tokens (CSS variables) are consistent across the app
- Header component is fully functional with search, theme toggle, and user menu
- Sidebar navigation works with keyboard shortcuts and active state highlighting
- Toast notification system can display success, error, warning, and info messages
- Skeleton loading components provide smooth content transitions
- All components are responsive across breakpoints

## Non-Goals
- Advanced animations (Phase 2+)
- Custom icon library (use Lucide)
- Component library documentation site (Phase 4+)

## Items

### Item 1.2.1 - Design Tokens & CSS Variables
**Type:** Feature
**Description:** Implement the complete design system with CSS custom properties for colors, typography, spacing, shadows, and border radius.
**Acceptance Criteria:**
- All color variables defined (--accent, --destructive, --success, --warning, --info, --muted, etc.)
- Typography scale implemented (0.75rem to 2rem)
- Spacing system defined (0.25rem to 2rem)
- Border radius tokens (small, default, large, full)
- Shadow elevations (small, medium, large)
- CSS reset and base styles
- Variables work in both light and dark modes
**Passes:** false

### Item 1.2.2 - Header Component
**Type:** Feature
**Description:** Create the global header with logo, search, theme toggle, notifications badge, and user menu.
**Acceptance Criteria:**
- Logo links to feed
- Search input with icon and keyboard shortcut (/)
- Theme toggle button (sun/moon icons)
- Notifications bell with unread count badge
- User avatar dropdown menu
- Sticky positioning at top
- Responsive: search collapses to icon on mobile
**Passes:** false

### Item 1.2.3 - Sidebar Navigation
**Type:** Feature
**Description:** Create the sidebar navigation menu with icons, active route highlighting, and keyboard shortcuts.
**Acceptance Criteria:**
- Navigation links: Feed, Explore, Messages, Notifications, Bookmarks, Analytics, Profile, Settings
- Icons from Lucide for each nav item
- Active route highlighted with accent color
- Hover states with subtle background
- Keyboard shortcuts displayed (G F, G E, etc.)
- Collapsible on mobile (hamburger menu)
- Quick post creation button (C shortcut)
**Passes:** false

### Item 1.2.4 - Toast Notification System
**Type:** Feature
**Description:** Implement a toast notification service and components for user feedback.
**Acceptance Criteria:**
- ToastService with success, error, warning, info methods
- Toast component with icons and colors per type
- Auto-dismiss after 5 seconds
- Manual dismiss with X button
- Stack multiple toasts
- Position: top-right on desktop, bottom on mobile
- Smooth enter/exit animations
**Passes:** false

### Item 1.2.5 - Skeleton Loading Components
**Type:** Feature
**Description:** Create skeleton loading states for posts, profiles, and lists to improve perceived performance.
**Acceptance Criteria:**
- Skeleton post card component
- Skeleton profile card component
- Skeleton list item component
- Shimmer animation effect
- Configurable number of skeleton items
- Match the layout of actual content
- Accessible (aria-busy, aria-label)
**Passes:** false

### Item 1.2.6 - Dark Mode Toggle
**Type:** Feature
**Description:** Implement theme switching between light and dark modes with system preference detection.
**Acceptance Criteria:**
- Theme toggle in header
- localStorage persists user preference
- System preference detection (prefers-color-scheme)
- Smooth transition between themes
- All components respect theme variables
- Default to system preference on first visit
**Passes:** false

## Affected Files
- `src/styles.scss` (design tokens)
- `src/app/shared/components/header/header.component.ts`
- `src/app/shared/components/sidebar/sidebar.component.ts`
- `src/app/shared/components/toast/toast.component.ts`
- `src/app/shared/services/toast.service.ts`
- `src/app/shared/components/skeleton-post/skeleton-post.component.ts`
- `src/app/shared/components/skeleton-profile/skeleton-profile.component.ts`

## Affected Dependencies
- Lucide Angular icons
- Angular animations module

## Notes
- Follow shadcn/ui design patterns
- Ensure keyboard accessibility throughout
- Test on multiple screen sizes
