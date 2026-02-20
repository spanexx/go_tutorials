# Milestone 3.3 - Search & Explore

## Problem Statement
Content discovery is essential for user engagement. Users need to find posts, users, and topics of interest through effective search and exploration features.

## Success Metrics
- Search returns relevant results across posts, users, and hashtags
- Search suggestions appear as user types
- Explore page shows trending and suggested content
- Search history is saved
- Results are filterable by type

## Non-Goals
- Advanced search filters (date, location) (Phase 4)
- Search analytics (Phase 4)
- Elasticsearch integration (Phase 4)

## Items

### Item 3.3.1 - Search Service
**Type:** Feature
**Description:** Create comprehensive search service with indexing.
**Acceptance Criteria:**
- SearchService with methods: searchPosts, searchUsers, searchHashtags, searchAll
- Search result interface with type, item, relevance score
- Local search index from existing data
- Debounced search input (300ms)
- Minimum query length (2 characters)
- Maximum results per type (20)
**Passes:** false

### Item 3.3.2 - Search Input Component
**Type:** Feature
**Description:** Enhance header search with autocomplete and suggestions.
**Acceptance Criteria:**
- Search input with icon in header
- Dropdown with search suggestions
- Recent searches list
- Clear search button
- Keyboard navigation (arrow keys, enter)
- Click suggestion to search
- Loading indicator during search
**Passes:** false

### Item 3.3.3 - Search Results Page
**Type:** Feature
**Description:** Create dedicated search results page with filtering.
**Acceptance Criteria:**
- Route: /search?q=query
- Tabs: All, Posts, Users, Hashtags
- All tab shows mixed results by relevance
- Posts tab with post cards
- Users tab with user list
- Hashtags tab with hashtag tiles
- Filter by time (optional)
- Sort options (relevance, recent)
- Empty state when no results
**Passes:** false

### Item 3.3.4 - Explore Page Enhancement
**Type:** Feature
**Description:** Enhance explore page with trending content and discovery features.
**Acceptance Criteria:**
- Trending section with posts
- Suggested users to follow
- Popular hashtags section
- Featured content carousel
- Category filtering (optional)
- Infinite scroll for content
- Refresh button
**Passes:** false

### Item 3.3.5 - Search History
**Type:** Feature
**Description:** Implement search history with localStorage persistence.
**Acceptance Criteria:**
- Save recent searches to localStorage
- Show recent searches in dropdown
- Clear individual history items
- Clear all history option
- Maximum 10 recent searches
- Click recent search to re-run
- Delete individual items with X button
**Passes:** false

## Affected Files
- `src/app/shared/services/search.service.ts`
- `src/app/shared/components/search-input/search-input.component.ts`
- `src/app/pages/explore/explore.component.ts`
- `src/app/pages/search-results/search-results.component.ts`
- `src/app/shared/components/header/header.component.ts`

## Affected Dependencies
- None

## Notes
- Implement client-side search initially
- Prepare for server-side search API
