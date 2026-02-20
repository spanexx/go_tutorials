# Milestone 2.3 - Hashtags & Mentions

## Problem Statement
Content discovery and user connection require hashtags for topic grouping and @mentions for user references. These features enable organic content organization and social interaction.

## Success Metrics
- Hashtags in posts are clickable
- Clicking hashtag navigates to hashtag page showing all posts
- @mentions are clickable and link to user profiles
- Hashtag suggestions appear when typing #
- User suggestions appear when typing @
- Trending hashtags are discoverable

## Non-Goals
- Hashtag following (Phase 3)
- Hashtag analytics (Phase 4)
- Advanced mention autocomplete (Phase 3)

## Items

### Item 2.3.1 - Hashtag Parsing & Linking
**Type:** Feature
**Description:** Parse post content to identify and link hashtags automatically.
**Acceptance Criteria:**
- Regex to identify #hashtag patterns
- Clickable hashtag links in post content
- Support for hashtags with underscores and numbers
- Prevent linking in code blocks
- Case-insensitive hashtag matching
- Hashtag service to track usage
**Passes:** false

### Item 2.3.2 - Hashtag Page
**Type:** Feature
**Description:** Create the hashtag page showing all posts containing a specific hashtag.
**Acceptance Criteria:**
- Route: /hashtag/:tag
- Page header with #hashtag and post count
- Grid/list of posts containing hashtag
- Infinite scroll for posts
- Follow button placeholder (Phase 3)
- Trending indicator
- Empty state when no posts
**Passes:** false

### Item 2.3.3 - Mention Parsing & Linking
**Type:** Feature
**Description:** Parse post content to identify and link @mentions to user profiles.
**Acceptance Criteria:**
- Regex to identify @username patterns
- Clickable mention links to user profiles
- Validate username exists (show if invalid)
- Support for usernames with dots and underscores
- Profile card on hover (reuse existing)
**Passes:** false

### Item 2.3.4 - Trending Hashtags
**Type:** Feature
**Description:** Display trending hashtags in the Explore page sidebar.
**Acceptance Criteria:**
- Calculate trending based on recent usage
- Show top 10 trending hashtags
- Display post count for each
- Click to navigate to hashtag page
- Update periodically (mock for now)
- "View all" link to full list
**Passes:** false

### Item 2.3.5 - Hashtag Input Suggestions
**Type:** Feature
**Description:** Show hashtag suggestions when user types # in post input.
**Acceptance Criteria:**
- Detect # character in create post textarea
- Show dropdown with popular hashtags
- Filter as user types
- Click to insert hashtag
- Keyboard navigation (up/down, enter)
- Maximum 5 suggestions shown
**Passes:** false

## Affected Files
- `src/app/shared/pipes/hashtag-link.pipe.ts`
- `src/app/shared/pipes/mention-link.pipe.ts`
- `src/app/pages/hashtag/hashtag.component.ts`
- `src/app/shared/services/hashtag.service.ts`
- `src/app/shared/components/trending-hashtags/trending-hashtags.component.ts`
- `src/app/shared/components/hashtag-suggestions/hashtag-suggestions.component.ts`
- `src/app/shared/components/create-post/create-post.component.ts`

## Affected Dependencies
- None

## Notes
- Hashtags should be stored normalized (lowercase)
- Prepare for full-text search integration
