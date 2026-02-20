# Milestone 2.1 - Post Reactions & Engagement

## Problem Statement
Users need ways to express reactions to posts beyond simple likes. The 6-reaction system (Like, Love, Laugh, Wow, Sad, Angry) provides emotional range and increases engagement.

## Success Metrics
- Users can react to posts with 6 different reactions
- Reaction counts display correctly
- User's own reactions are visually indicated
- Clicking a reaction toggles it on/off
- Reaction summary shows breakdown of each type

## Non-Goals
- Reaction animations (Phase 3)
- Custom reactions (Phase 4)
- Reactions on comments (Phase 3)

## Items

### Item 2.1.1 - Reaction Model & Service
**Type:** Feature
**Description:** Define reaction data model and service for handling reactions.
**Acceptance Criteria:**
- ReactionType enum: Like, Love, Laugh, Wow, Sad, Angry
- Reaction interface with user, post, type, timestamp
- ReactionService with methods: addReaction, removeReaction, getReactionsForPost
- Signal-based reaction counts per post
- Optimistic UI updates
**Passes:** false

### Item 2.1.2 - Reaction Bar Component
**Type:** Feature
**Description:** Create the reaction bar showing 6 reaction buttons with counts.
**Acceptance Criteria:**
- 6 reaction buttons with icons (heart, laughing, wow, sad, angry, thumbs-up)
- Each shows current count
- User's active reaction highlighted
- Click to toggle reaction
- Hover tooltip with reaction names
- Compact design fitting in post card
- Accessible with keyboard
**Passes:** false

### Item 2.1.3 - Post Card Integration
**Type:** Feature
**Description:** Integrate reaction bar into post cards with engagement tracking.
**Acceptance Criteria:**
- Reaction bar appears below post content
- Like count updates optimistically
- Clicking like again removes the reaction
- Visual feedback on interaction
- Update post stats in real-time
**Passes:** false

### Item 2.1.4 - Reaction Summary Display
**Type:** Feature
**Description:** Show a summary of all reactions on a post with breakdown.
**Acceptance Criteria:**
- Summary bar showing top 3 reactions with icons
- Total reaction count
- Expandable view showing all reaction counts
- Click to see who reacted (Phase 3)
- Positioned at top of reaction bar
**Passes:** false

## Affected Files
- `src/app/shared/models/reaction.model.ts`
- `src/app/shared/services/reaction.service.ts`
- `src/app/shared/components/reaction-bar/reaction-bar.component.ts`
- `src/app/shared/components/post-card/post-card.component.ts`
- `src/app/shared/components/reaction-summary/reaction-summary.component.ts`

## Affected Dependencies
- Lucide icons

## Notes
- Store user reactions in localStorage for mock mode
- Prepare for API integration in Phase 3
