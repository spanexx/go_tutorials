// Code Map: follow.service.ts
// - FollowService: Service for managing follow relationships
// - Follow interface with id, followerId, followingId, createdAt
// - Methods: followUser, unfollowUser, isFollowing, getFollowers, getFollowing
// - Signal-based follow state with follow counts per user
// - Prevents self-following
// CID: Phase-2 Milestone 2.5 - Social Graph (Follow System)
import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { AuthService } from './auth.service';

export interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: Date;
}

export interface FollowCounts {
  followers: number;
  following: number;
}

export interface FollowState {
  follows: Follow[];
  counts: Record<string, FollowCounts>;
  currentUserId: string;
  isLoading: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class FollowService extends BaseApiService {
  private followState = signal<FollowState>({
    follows: [],
    counts: {},
    currentUserId: '',
    isLoading: false
  });

  // Get all follows
  follows = computed(() => this.followState().follows);

  // Check if loading
  isLoading = computed(() => this.followState().isLoading);

  // Get current user ID
  currentUserId = computed(() => this.followState().currentUserId);

  /**
   * Get follow counts for a user
   */
  getFollowCounts(userId: string): FollowCounts {
    return this.followState().counts[userId] || { followers: 0, following: 0 };
  }

  private followingIds = signal<Set<string>>(new Set());

  constructor(http: HttpClient, private authService: AuthService) {
    super(http);
    this.followState.update(s => ({ ...s, currentUserId: this.authService.user?.id ?? '' }));
  }

  async ensureMyFollowingLoaded(): Promise<void> {
    const me = this.authService.user?.id;
    if (!me) {
      return;
    }
    if (this.followingIds().size > 0) {
      return;
    }

    await this.refreshMyFollowing();
  }

  async refreshMyFollowing(): Promise<void> {
    const me = this.authService.user?.id;
    if (!me) {
      return;
    }

    this.followState.update(s => ({ ...s, isLoading: true, currentUserId: me }));
    try {
      const resp = await firstValueFrom(this.get<{ following: Array<{ follow: any; is_following_back?: boolean; user_username: string; user_name: string }>; total: number; has_more: boolean }>(`/users/id/${me}/following`, {
        page: '1',
        limit: '100'
      }));

      const ids = new Set<string>();
      for (const f of resp.following ?? []) {
        const id = f.follow?.following_id;
        if (id) {
          ids.add(String(id));
        }
      }
      this.followingIds.set(ids);
    } finally {
      this.followState.update(s => ({ ...s, isLoading: false }));
    }
  }

  /**
   * Follow a user
   */
  async followUser(userId: string): Promise<boolean> {
    const me = this.authService.user?.id;
    if (!me || userId === me) {
      return false;
    }

    await this.ensureMyFollowingLoaded();
    if (this.isFollowing(userId)) {
      return false;
    }

    this.followState.update(s => ({ ...s, isLoading: true, currentUserId: me }));
    try {
      await firstValueFrom(this.post(`/users/id/${userId}/follow`, {}));
      this.followingIds.update(set => new Set([...set, userId]));

      const currentCounts = this.followState().counts;
      const meCounts = currentCounts[me] ?? { followers: 0, following: 0 };
      const targetCounts = currentCounts[userId] ?? { followers: 0, following: 0 };
      this.followState.update(s => ({
        ...s,
        counts: {
          ...currentCounts,
          [me]: { ...meCounts, following: meCounts.following + 1 },
          [userId]: { ...targetCounts, followers: targetCounts.followers + 1 }
        }
      }));
      return true;
    } finally {
      this.followState.update(s => ({ ...s, isLoading: false }));
    }
  }

  /**
   * Unfollow a user
   */
  async unfollowUser(userId: string): Promise<boolean> {
    const me = this.authService.user?.id;
    if (!me || userId === me) {
      return false;
    }

    await this.ensureMyFollowingLoaded();
    if (!this.isFollowing(userId)) {
      return false;
    }

    this.followState.update(s => ({ ...s, isLoading: true, currentUserId: me }));
    try {
      await firstValueFrom(this.delete(`/users/id/${userId}/follow`));
      this.followingIds.update(set => {
        const next = new Set(set);
        next.delete(userId);
        return next;
      });

      const currentCounts = this.followState().counts;
      const meCounts = currentCounts[me] ?? { followers: 0, following: 0 };
      const targetCounts = currentCounts[userId] ?? { followers: 0, following: 0 };
      this.followState.update(s => ({
        ...s,
        counts: {
          ...currentCounts,
          [me]: { ...meCounts, following: Math.max(0, meCounts.following - 1) },
          [userId]: { ...targetCounts, followers: Math.max(0, targetCounts.followers - 1) }
        }
      }));
      return true;
    } finally {
      this.followState.update(s => ({ ...s, isLoading: false }));
    }
  }

  /**
   * Toggle follow/unfollow
   */
  async toggleFollow(userId: string): Promise<boolean> {
    const isFollowing = this.isFollowing(userId);
    
    if (isFollowing) {
      return this.unfollowUser(userId);
    } else {
      return this.followUser(userId);
    }
  }

  /**
   * Check if current user is following another user
   */
  isFollowing(userId: string): boolean {
    return this.followingIds().has(userId);
  }

  /**
   * Get followers of a user
   */
  async getFollowers(userId: string, page: number = 1, limit: number = 20): Promise<any> {
    return firstValueFrom(this.get(`/users/id/${userId}/followers`, { page: String(page), limit: String(limit) }));
  }

  /**
   * Get users that a user is following
   */
  async getFollowing(userId: string, page: number = 1, limit: number = 20): Promise<any> {
    return firstValueFrom(this.get(`/users/id/${userId}/following`, { page: String(page), limit: String(limit) }));
  }

  /**
   * Get follower count for a user
   */
  getFollowerCount(userId: string): number {
    return this.getFollowCounts(userId).followers;
  }

  /**
   * Get following count for a user
   */
  getFollowingCount(userId: string): number {
    return this.getFollowCounts(userId).following;
  }

  /**
   * Get mutual follows (users that both follow each other)
   */
  getMutualFollows(userId: string): string[] {
    const state = this.followState();
    const myFollowing = state.follows
      .filter(f => f.followerId === state.currentUserId)
      .map(f => f.followingId);
    
    const theirFollowers = state.follows
      .filter(f => f.followingId === userId)
      .map(f => f.followerId);
    
    return myFollowing.filter(id => theirFollowers.includes(id));
  }

  /**
   * Check if user can be followed (not self, not already following)
   */
  canFollow(userId: string): boolean {
    const state = this.followState();
    return userId !== state.currentUserId && !this.isFollowing(userId);
  }

  /**
   * Set current user ID (for auth integration)
   */
  setCurrentUserId(userId: string): void {
    this.followState.update(state => ({ ...state, currentUserId: userId }));
  }

  /**
   * Refresh follow data (for API integration)
   */
  async refresh(): Promise<void> {
    await this.refreshMyFollowing();
  }

  /**
   * Clear follow data (for testing)
   */
  clear(): void {
    this.followState.set({
      follows: [],
      counts: {},
      currentUserId: 'current-user',
      isLoading: false
    });
  }
}
