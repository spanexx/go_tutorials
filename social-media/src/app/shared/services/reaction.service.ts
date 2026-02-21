// Code Map: reaction.service.ts
// - ReactionService: Service for managing post reactions
// - Signals: reactionCounts, userReaction
// - Methods: addReaction, removeReaction, getReactionsForPost, toggleReaction
// - Optimistic UI updates with rollback on error
// CID: Phase-2 Milestone 2.1 - Post Reactions
import { Injectable, signal } from '@angular/core';
import { Reaction, ReactionType, ReactionCounts, createEmptyReactionCounts, REACTION_TYPES } from '../models/reaction.model';

export interface ReactionState {
  counts: Record<string, ReactionCounts>;
  userReactions: Record<string, ReactionType | null>;
  isLoading: Record<string, boolean>;
}

@Injectable({
  providedIn: 'root'
})
export class ReactionService {
  private reactionState = signal<ReactionState>({
    counts: {},
    userReactions: {},
    isLoading: {}
  });

  constructor() {
    // Initialize with mock data for development
    this.initializeMockData();
  }

  private initializeMockData(): void {
    // Mock data for development - will be replaced with API calls in Phase 2.6
    const mockPosts = ['post-1', 'post-2', 'post-3'];
    const updates: Partial<ReactionState> = {
      counts: {},
      userReactions: {},
      isLoading: {}
    };

    mockPosts.forEach(postId => {
      updates.counts![postId] = {
        like: Math.floor(Math.random() * 10),
        love: Math.floor(Math.random() * 5),
        laugh: Math.floor(Math.random() * 3),
        wow: Math.floor(Math.random() * 2),
        sad: Math.floor(Math.random() * 2),
        angry: Math.floor(Math.random() * 1),
        total: 0
      };
      updates.counts![postId].total = this.calculateTotal(updates.counts![postId]);
      updates.userReactions![postId] = null;
      updates.isLoading![postId] = false;
    });

    this.reactionState.update(state => ({
      ...state,
      ...updates
    }));
  }

  private calculateTotal(counts: ReactionCounts): number {
    return counts.like + counts.love + counts.laugh + counts.wow + counts.sad + counts.angry;
  }

  /**
   * Get reaction counts for a post
   */
  getReactionCounts(postId: string): ReactionCounts {
    return this.reactionState().counts[postId] || createEmptyReactionCounts();
  }

  /**
   * Get user's reaction for a post
   */
  getUserReaction(postId: string): ReactionType | null {
    return this.reactionState().userReactions[postId] || null;
  }

  /**
   * Check if post is loading
   */
  isLoading(postId: string): boolean {
    return this.reactionState().isLoading[postId] || false;
  }

  /**
   * Get top reactions for a post
   */
  getTopReactions(postId: string): { type: ReactionType; count: number }[] {
    const counts = this.getReactionCounts(postId);
    const reactions = REACTION_TYPES
      .map(r => ({ type: r.type, count: counts[r.type] }))
      .filter(r => r.count > 0)
      .sort((a, b) => b.count - a.count);
    return reactions.slice(0, 3);
  }

  /**
   * Get reaction emoji icon for a reaction type
   */
  getReactionIcon(type: ReactionType): string {
    const meta = REACTION_TYPES.find(r => r.type === type);
    return meta?.emoji || '👍';
  }

  /**
   * Get reaction label for a reaction type
   */
  getReactionLabel(type: ReactionType): string {
    const meta = REACTION_TYPES.find(r => r.type === type);
    return meta?.label || 'Like';
  }

  /**
   * Get reaction color for a reaction type
   */
  getReactionColor(type: ReactionType): string {
    const meta = REACTION_TYPES.find(r => r.type === type);
    return meta?.color || '#1877f2';
  }

  /**
   * Add a reaction to a post with optimistic UI update
   */
  addReaction(postId: string, type: ReactionType): Promise<void> {
    return new Promise((resolve, reject) => {
      const currentState = this.reactionState();
      const previousReaction = currentState.userReactions[postId];
      const previousCounts = { ...currentState.counts[postId] || createEmptyReactionCounts() };

      // Optimistic update
      this.optimisticUpdate(postId, type);

      // Simulate API call (replace with actual API in Phase 2.6)
      setTimeout(() => {
        // Success - keep the optimistic update
        console.log(`Reaction ${type} added to post ${postId}`);
        resolve();
      }, 300);
    });
  }

  /**
   * Remove a reaction from a post with optimistic UI update
   */
  removeReaction(postId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const currentState = this.reactionState();
      const previousReaction = currentState.userReactions[postId];
      
      if (!previousReaction) {
        resolve();
        return;
      }

      const previousCounts = { ...currentState.counts[postId] || createEmptyReactionCounts() };

      // Optimistic update
      this.optimisticRemove(postId);

      // Simulate API call (replace with actual API in Phase 2.6)
      setTimeout(() => {
        console.log(`Reaction removed from post ${postId}`);
        resolve();
      }, 300);
    });
  }

  /**
   * Toggle a reaction on a post
   */
  toggleReaction(postId: string, type: ReactionType): Promise<void> {
    const currentState = this.reactionState();
    const currentReaction = currentState.userReactions[postId];

    if (currentReaction === type) {
      // Same reaction - remove it
      return this.removeReaction(postId);
    } else if (currentReaction) {
      // Different reaction - change it
      return this.changeReaction(postId, type);
    } else {
      // No reaction - add it
      return this.addReaction(postId, type);
    }
  }

  /**
   * Change reaction type on a post
   */
  private changeReaction(postId: string, newType: ReactionType): Promise<void> {
    return new Promise((resolve, reject) => {
      const currentState = this.reactionState();
      const previousReaction = currentState.userReactions[postId];
      
      if (!previousReaction) {
        resolve();
        return;
      }

      const previousCounts = { ...currentState.counts[postId] || createEmptyReactionCounts() };

      // Optimistic update for changing reaction
      this.reactionState.update(state => {
        const newCounts = { ...state.counts[postId] || createEmptyReactionCounts() };
        
        // Decrement old reaction
        newCounts[previousReaction] = Math.max(0, newCounts[previousReaction] - 1);
        // Increment new reaction
        newCounts[newType] = (newCounts[newType] || 0) + 1;
        newCounts.total = this.calculateTotal(newCounts);

        return {
          ...state,
          counts: {
            ...state.counts,
            [postId]: newCounts
          },
          userReactions: {
            ...state.userReactions,
            [postId]: newType
          }
        };
      });

      // Simulate API call
      setTimeout(() => {
        console.log(`Reaction changed to ${newType} on post ${postId}`);
        resolve();
      }, 300);
    });
  }

  /**
   * Optimistic UI update for adding reaction
   */
  private optimisticUpdate(postId: string, type: ReactionType): void {
    this.reactionState.update(state => {
      const currentCounts = state.counts[postId] || createEmptyReactionCounts();
      const currentReaction = state.userReactions[postId];
      
      const newCounts = { ...currentCounts };
      
      // If user already has a reaction, decrement it first
      if (currentReaction && currentReaction !== type) {
        newCounts[currentReaction] = Math.max(0, newCounts[currentReaction] - 1);
      }
      
      // Increment the new reaction
      newCounts[type] = (newCounts[type] || 0) + 1;
      newCounts.total = this.calculateTotal(newCounts);

      return {
        ...state,
        counts: {
          ...state.counts,
          [postId]: newCounts
        },
        userReactions: {
          ...state.userReactions,
          [postId]: type
        }
      };
    });
  }

  /**
   * Optimistic UI update for removing reaction
   */
  private optimisticRemove(postId: string): void {
    this.reactionState.update(state => {
      const currentCounts = state.counts[postId] || createEmptyReactionCounts();
      const currentReaction = state.userReactions[postId];
      
      if (!currentReaction) {
        return state;
      }

      const newCounts = { ...currentCounts };
      newCounts[currentReaction] = Math.max(0, newCounts[currentReaction] - 1);
      newCounts.total = this.calculateTotal(newCounts);

      return {
        ...state,
        counts: {
          ...state.counts,
          [postId]: newCounts
        },
        userReactions: {
          ...state.userReactions,
          [postId]: null
        }
      };
    });
  }

  /**
   * Get reactions for a post (for Phase 2.6 API integration)
   */
  async getReactionsForPost(postId: string): Promise<Reaction[]> {
    // TODO: Implement API call in Phase 2.6
    return [];
  }

  /**
   * Initialize reaction state for a new post
   */
  initializePost(postId: string): void {
    this.reactionState.update(state => {
      if (state.counts[postId]) {
        return state;
      }

      return {
        ...state,
        counts: {
          ...state.counts,
          [postId]: createEmptyReactionCounts()
        },
        userReactions: {
          ...state.userReactions,
          [postId]: null
        },
        isLoading: {
          ...state.isLoading,
          [postId]: false
        }
      };
    });
  }
}
