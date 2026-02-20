# Milestone 0.1 - Unmock Codebase - Summary

## Generated
- **Findings:** 12
- **Files:** 6
- **PRD Items:** 12

## Scan Details

**Frontend (Angular/TypeScript):**
- `analytics.service.ts` - 6 occurrences (mock engagement/follower data)
- `search.service.ts` - 6 occurrences (mock users/hashtags)
- `mention.service.ts` - 3 occurrences (mock users map)
- `user-profile-card.component.ts` - 2 occurrences (mock profile loading)
- `profile.component.ts` - 2 occurrences (mock profile data)

**Backend (Go):**
- `auth_handler.go` - 1 occurrence (email verification TODO)
- `auth_service.go` - 3 occurrences (logout placeholder, UUID/avatar generators)

## Categorized Backlog

### Tech Debt (9 items)
- C.001: AnalyticsService mock data
- C.002: SearchService mock data
- C.003: MentionService mock data
- C.004: UserProfileCardComponent mock data
- C.005: ProfileComponent mock data
- C.006: Email verification implementation
- C.007: Logout/token blacklist implementation
- C.008: UUID generation
- C.009: Random avatar ID generation

### Infrastructure (3 items)
- C.010: HTTP client module for Angular
- C.011: Critic scanner pattern improvements
- C.012: Backend API endpoints

## Next

Implement items top-to-bottom, marking each as `passes=true` and updating Progress.md.

**Recommended starting point:** C.011 (improve critic scanner) → C.010 (HTTP client module) → C.012 (backend APIs)

---

*Last updated: 2026-02-20*
*Critic session: 333a6cbf-c6af-4498-a310-feb20be44cf9*
