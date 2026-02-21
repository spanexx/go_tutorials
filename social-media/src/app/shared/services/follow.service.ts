// Code Map: follow.service.ts
// - FollowService: Service for managing follow relationships
// - Follow interface with id, followerId, followingId, createdAt
// - Methods: followUser, unfollowUser, isFollowing, getFollowers, getFollowing
// - Signal-based follow state with follow counts per user
// - Prevents self-following
// CID: Phase-2 Milestone 2.5 - Social Graph (Follow System)
import { Injectable, signal, computed } from '@angular/core';

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
export class FollowService {
  private followState = signal<FollowState>({
    follows: [],
    counts: {},
    currentUserId: 'current-user',
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

  constructor() {
    this.initializeMockData();
  }

  private initializeMockData(): void {
    const currentUserId = 'current-user';
    
    const mockFollows: Follow[] = [
      { id: 'follow-1', followerId: 'user-1', followingId: currentUserId, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24) },
      { id: 'follow-2', followerId: 'user-2', followingId: currentUserId, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48) },
      { id: 'follow-3', followerId: currentUserId, followingId: 'user-3', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12) },
      { id: 'follow-4', followerId: currentUserId, followingId: 'user-4', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 36) },
      { id: 'follow-5', followerId: 'user-3', followingId: 'user-4', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6) },
      { id: 'follow-6', followerId: 'user-5', followingId: 'user-1', createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72) },
    ];

    // Calculate counts
    const counts: Record<string, FollowCounts> = {};
    const users = new Set<string>();
    
    mockFollows.forEach(follow => {
      users.add(follow.followerId);
      users.add(follow.followingId);
    });

    users.forEach(userId => {
      const followers = mockFollows.filter(f => f.followingId === userId).length;
      const following = mockFollows.filter(f => f.followerId === userId).length;
      counts[userId] = { followers, following };
    });

    this.followState.set({
      follows: mockFollows,
      counts,
      currentUserId,
      isLoading: false
    });
  }

  /**
   * Follow a user
   */
  async followUser(userId: string): Promise<boolean> {
    const state = this.followState();
    
    // Prevent self-following
    if (userId === state.currentUserId) {
      console.warn('Cannot follow yourself');
      return false;
    }

    // Check if already following
    const alreadyFollowing = state.follows.some(
      f => f.followerId === state.currentUserId && f.followingId === userId
    );

    if (alreadyFollowing) {
      return false;
    }

    this.followState.update(state => ({
      ...state,
      isLoading: true
    }));

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 300));

    const newFollow: Follow = {
      id: `follow-${Date.now()}`,
      followerId: state.currentUserId,
      followingId: userId,
      createdAt: new Date()
    };

    this.followState.update(state => {
      const newFollows = [...state.follows, newFollow];
      
      // Update counts
      const newCounts = { ...state.counts };
      
      // Increment following count for current user
      if (!newCounts[state.currentUserId]) {
        newCounts[state.currentUserId] = { followers: 0, following: 0 };
      }
      newCounts[state.currentUserId].following++;
      
      // Increment followers count for followed user
      if (!newCounts[userId]) {
        newCounts[userId] = { followers: 0, following: 0 };
      }
      newCounts[userId].followers++;

      return {
        ...state,
        follows: newFollows,
        counts: newCounts,
        isLoading: false
      };
    });

    return true;
  }

  /**
   * Unfollow a user
   */
  async unfollowUser(userId: string): Promise<boolean> {
    const state = this.followState();

    this.followState.update(state => ({
      ...state,
      isLoading: true
    }));

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 300));

    this.followState.update(state => {
      const followToRemove = state.follows.find(
        f => f.followerId === state.currentUserId && f.followingId === userId
      );

      if (!followToRemove) {
        return { ...state, isLoading: false };
      }

      const newFollows = state.follows.filter(f => f.id !== followToRemove.id);
      
      // Update counts
      const newCounts = { ...state.counts };
      
      // Decrement following count for current user
      if (newCounts[state.currentUserId]) {
        newCounts[state.currentUserId].following = Math.max(0, newCounts[state.currentUserId].following - 1);
      }
      
      // Decrement followers count for unfollowed user
      if (newCounts[userId]) {
        newCounts[userId].followers = Math.max(0, newCounts[userId].followers - 1);
      }

      return {
        ...state,
        follows: newFollows,
        counts: newCounts,
        isLoading: false
      };
    });

    return true;
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
    const state = this.followState();
    return state.follows.some(
      f => f.followerId === state.currentUserId && f.followingId === userId
    );
  }

  /**
   * Get followers of a user
   */
  getFollowers(userId: string): Follow[] {
    const state = this.followState();
    return state.follows.filter(f => f.followingId === userId);
  }

  /**
   * Get users that a user is following
   */
  getFollowing(userId: string): Follow[] {
    const state = this.followState();
    return state.follows.filter(f => f.followerId === userId);
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
    this.followState.update(state => ({
      ...state,
      currentUserId: userId
    }));
  }

  /**
   * Refresh follow data (for API integration)
   */
  async refresh(): Promise<void> {
    this.followState.update(state => ({ ...state, isLoading: true }));
    
    // Simulate API refresh
    await new Promise(resolve => setTimeout(resolve, 500));
    
    this.followState.update(state => ({ ...state, isLoading: false }));
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
