// Code Map: reaction.service.ts
// - ReactionService: Service for managing post reactions
// - Signals: reactionCounts, userReaction
// - Methods: addReaction, removeReaction, getReactionsForPost, toggleReaction
// - Optimistic UI updates with rollback on error
// CID: Phase-2 Milestone 2.1 - Post Reactions
import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BaseApiService } from './base-api.service';
import { Reaction, ReactionType, ReactionCounts, createEmptyReactionCounts, REACTION_TYPES } from '../models/reaction.model';

export interface ReactionState {
  counts: Record<string, ReactionCounts>;
  userReactions: Record<string, ReactionType | null>;
  isLoading: Record<string, boolean>;
}

@Injectable({
  providedIn: 'root'
})
export class ReactionService extends BaseApiService {
  private reactionState = signal<ReactionState>({
    counts: {},
    userReactions: {},
    isLoading: {}
  });

  constructor(http: HttpClient) {
    super(http);
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
  async addReaction(postId: string, type: ReactionType): Promise<void> {
    const currentState = this.reactionState();
    const previousReaction = currentState.userReactions[postId];
    const previousCounts = { ...currentState.counts[postId] || createEmptyReactionCounts() };

    this.optimisticUpdate(postId, type);

    try {
      await this.post(`/posts/${postId}/reactions`, { type }).toPromise();
      await this.loadReactionState(postId);
    } catch (error) {
      this.restoreState(postId, previousReaction || null, previousCounts);
      throw error;
    }
  }

  /**
   * Load reactions for a post from the API into local signal state.
   */
  async loadPostReactions(postId: string): Promise<void> {
    await this.loadReactionState(postId);
  }

  /**
   * Remove a reaction from a post with optimistic UI update
   */
  async removeReaction(postId: string): Promise<void> {
    const currentState = this.reactionState();
    const previousReaction = currentState.userReactions[postId];
    if (!previousReaction) {
      return;
    }

    const previousCounts = { ...currentState.counts[postId] || createEmptyReactionCounts() };
    this.optimisticRemove(postId);

    try {
      await this.delete(`/posts/${postId}/reactions?type=${encodeURIComponent(previousReaction)}`).toPromise();
      await this.loadReactionState(postId);
    } catch (error) {
      this.restoreState(postId, previousReaction, previousCounts);
      throw error;
    }
  }

  /**
   * Toggle a reaction on a post
   */
  async toggleReaction(postId: string, type: ReactionType): Promise<void> {
    const currentState = this.reactionState();
    const previousReaction = currentState.userReactions[postId] || null;
    const previousCounts = { ...currentState.counts[postId] || createEmptyReactionCounts() };

    if (previousReaction === type) {
      this.optimisticRemove(postId);
    } else {
      this.optimisticUpdate(postId, type);
    }

    try {
      await this.post(`/posts/${postId}/reactions/toggle`, { type }).toPromise();
      await this.loadReactionState(postId);
    } catch (error) {
      this.restoreState(postId, previousReaction, previousCounts);
      throw error;
    }
  }

  /**
   * Change reaction type on a post
   */
  private changeReaction(postId: string, newType: ReactionType): Promise<void> {
    return this.toggleReaction(postId, newType);
  }

  private restoreState(postId: string, reaction: ReactionType | null, counts: ReactionCounts): void {
    this.reactionState.update(state => ({
      ...state,
      counts: { ...state.counts, [postId]: counts },
      userReactions: { ...state.userReactions, [postId]: reaction }
    }));
  }

  private async loadReactionState(postId: string): Promise<void> {
    this.reactionState.update(state => ({
      ...state,
      isLoading: { ...state.isLoading, [postId]: true }
    }));

    try {
      const [reactionsResponse, userReactionResponse] = await Promise.all([
        this.get<{ counts: ReactionCounts; success: boolean }>(`/posts/${postId}/reactions`).toPromise(),
        this.get<{ reaction: { type: ReactionType } | null; success: boolean }>(`/posts/${postId}/reactions/me`).toPromise(),
      ]);

      const counts = reactionsResponse?.counts || createEmptyReactionCounts();
      const userReaction = userReactionResponse?.reaction?.type || null;

      this.reactionState.update(state => ({
        ...state,
        counts: { ...state.counts, [postId]: counts },
        userReactions: { ...state.userReactions, [postId]: userReaction },
        isLoading: { ...state.isLoading, [postId]: false }
      }));
    } catch (error) {
      this.reactionState.update(state => ({
        ...state,
        isLoading: { ...state.isLoading, [postId]: false }
      }));
      throw error;
    }
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
   * Get reactions for a post
   */
  async getReactionsForPost(postId: string): Promise<Reaction[]> {
    const response = await this.get<{ reactions: Array<{ id: string; user_id: string; post_id: string | null; type: ReactionType; created_at: string }>; success: boolean }>(
      `/posts/${postId}/reactions/list`,
      { limit: '50', offset: '0' }
    ).toPromise();

    if (!response?.reactions) {
      return [];
    }

    return response.reactions
      .filter(r => r.post_id)
      .map(r => ({
        id: r.id,
        userId: r.user_id,
        postId: r.post_id as string,
        type: r.type,
        createdAt: new Date(r.created_at)
      }));
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
