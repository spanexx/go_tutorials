# Milestone 3.2 - Bookmarks & Collections

## Problem Statement
Users want to save interesting posts for later reference and organize them into meaningful collections. Bookmarks enable content curation and personal organization.

## Success Metrics
- Users can bookmark any post
- Users can create custom bookmark collections
- Collections can be color-coded
- Bookmarks page shows saved posts
- Collections are filterable
- Users can remove bookmarks

## Non-Goals
- Public collections (Phase 4)
- Collection sharing (Phase 4)
- Collection collaboration (Phase 4)

## Items

### Item 3.2.1 - Bookmark Model & Service
**Type:** Feature
**Description:** Define bookmark and collection models with comprehensive service.
**Acceptance Criteria:**
- Bookmark interface with id, userId, postId, collectionId, createdAt
- Collection interface with id, userId, name, color, icon, createdAt
- BookmarkService with methods: bookmarkPost, removeBookmark, getBookmarks, getCollections, createCollection, deleteCollection, addToCollection
- Signal-based bookmark state
- Default "All Bookmarks" collection
**Passes:** false

### Item 3.2.2 - Bookmark Button Component
**Type:** Feature
**Description:** Create bookmark button for post cards.
**Acceptance Criteria:**
- Bookmark icon button on posts
- Filled icon when bookmarked, outline when not
- Click to toggle bookmark status
- Dropdown to select collection (or default)
- Toast feedback on action
- Keyboard accessible
**Passes:** false

### Item 3.2.3 - Collection Manager Component
**Type:** Feature
**Description:** Create collection management interface for creating and organizing.
**Acceptance Criteria:**
- Create new collection with name
- Color picker for collection (8 preset colors)
- Icon selector (optional)
- Edit collection name and color
- Delete collection (with confirmation)
- Show bookmark count per collection
- Default collection cannot be deleted
**Passes:** false

### Item 3.2.4 - Bookmarks Page Enhancement
**Type:** Feature
**Description:** Enhance bookmarks page with collections sidebar and filtering.
**Acceptance Criteria:**
- Sidebar with collection list
- Collection filter chips at top
- Grid/list of bookmarked posts
- Infinite scroll for bookmarks
- Remove bookmark button on each post
- Move to collection dropdown
- Empty state when no bookmarks
- Search within bookmarks
**Passes:** false

### Item 3.2.5 - Collection Detail View
**Type:** Feature
**Description:** Create dedicated view for individual collections.
**Acceptance Criteria:**
- Route: /bookmarks/collection/:id
- Collection header with name, color, count
- Posts filtered to collection
- Edit collection button
- Delete collection button
- Back to all bookmarks link
- Empty state for empty collection
**Passes:** false

## Affected Files
- `src/app/shared/models/bookmark.model.ts`
- `src/app/shared/models/collection.model.ts`
- `src/app/shared/services/bookmark.service.ts`
- `src/app/shared/components/bookmark-button/bookmark-button.component.ts`
- `src/app/shared/components/collection-manager/collection-manager.component.ts`
- `src/app/pages/bookmarks/bookmarks.component.ts`
- `src/app/pages/bookmarks/collection-detail/collection-detail.component.ts`

## Affected Dependencies
- None

## Notes
- Bookmarks are private to each user
- Collections are user-specific
