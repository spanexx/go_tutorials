import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BaseApiService } from './base-api.service';
import { Post } from './post.service';

export interface MentionedUser {
  id: string;
  username: string;
  name: string;
  avatar: string;
  mentionCount: number;
}

/**
 * MentionService - Handles user mentions and user lookup
 *
 * Provides methods to:
 * - Extract mentions from post content
 * - Get mentioned users from posts
 * - Search users for mention suggestions
 * - Get user by username
 */
@Injectable({
  providedIn: 'root'
})
export class MentionService extends BaseApiService {
  // Cache for frequently mentioned users
  private userCache: Map<string, MentionedUser> = new Map();

  constructor(http: HttpClient) {
    super(http);
  }

  /**
   * Extract @mentions from post content
   */
  extractMentionsFromContent(content: string): string[] {
    const mentionRegex = /@([\w]+)/g;
    const matches = content.match(mentionRegex);
    return matches ? matches.map(mention => mention.substring(1)) : [];
  }

  /**
   * Get mentioned users from posts with mention counts
   */
  getMentionedUsers(posts: Post[]): MentionedUser[] {
    const mentionMap = new Map<string, number>();

    for (const post of posts) {
      const mentions = this.extractMentionsFromContent(post.content);
      for (const mention of mentions) {
        const normalizedMention = mention.toLowerCase();
        const currentCount = mentionMap.get(normalizedMention) || 0;
        mentionMap.set(normalizedMention, currentCount + 1);
      }
    }

    const mentionedUsers: MentionedUser[] = [];
    mentionMap.forEach((count, username) => {
      const user = this.userCache.get(username);
      if (user) {
        mentionedUsers.push({
          ...user,
          mentionCount: count
        });
      }
    });

    return mentionedUsers.sort((a, b) => b.mentionCount - a.mentionCount);
  }

  /**
   * Get user by username from backend API
   * Falls back to cached data if API unavailable
   */
  async getUserByUsername(username: string): Promise<MentionedUser | undefined> {
    const normalizedUsername = username.toLowerCase();

    // Check cache first
    const cached = this.userCache.get(normalizedUsername);
    if (cached) {
      return Promise.resolve(cached);
    }

    // Try API
    try {
      const user = await this.get<{ id: string; username: string; display_name: string; avatar_url: string }>(`/users/${username}`).toPromise();
      if (user) {
        const mentionedUser: MentionedUser = {
          id: user.id,
          username: user.username,
          name: user.display_name,
          avatar: user.avatar_url,
          mentionCount: 0
        };
        this.userCache.set(normalizedUsername, mentionedUser);
        return mentionedUser;
      }
    } catch (error) {
      console.warn(`Failed to fetch user ${username} from API, using fallback`);
    }

    return undefined;
  }

  /**
   * Get all users from API (for dropdown suggestions)
   */
  async getAllUsers(): Promise<MentionedUser[]> {
    try {
      const users = await this.get<{ id: string; username: string; display_name: string; avatar_url: string }[]>('/users').toPromise();
      if (users) {
        return users.map(u => ({
          id: u.id,
          username: u.username,
          name: u.display_name,
          avatar: u.avatar_url,
          mentionCount: 0
        }));
      }
    } catch (error) {
      console.warn('Failed to fetch users from API, using fallback');
    }
    return [];
  }

  /**
   * Search users by query via backend API
   */
  async searchUsers(query: string): Promise<MentionedUser[]> {
    const normalizedQuery = query.toLowerCase();

    try {
      const users = await this.get<{ id: string; username: string; display_name: string; avatar_url: string }[]>('/users/search', { q: normalizedQuery }).toPromise();
      if (users) {
        return users.map(u => ({
          id: u.id,
          username: u.username,
          name: u.display_name,
          avatar: u.avatar_url,
          mentionCount: 0
        }));
      }
    } catch (error) {
      console.warn('Failed to search users from API, using fallback');
    }

    return [];
  }

  /**
   * Check if a username exists in the system
   */
  isMentionedUser(username: string): boolean {
    return this.userCache.has(username.toLowerCase());
  }

  /**
   * Clear the user cache
   */
  clearCache(): void {
    this.userCache.clear();
  }

  /**
   * Pre-populate cache with users (for performance)
   */
  preloadUsers(usernames: string[]): void {
    usernames.forEach(username => {
      const normalized = username.toLowerCase();
      if (!this.userCache.has(normalized)) {
        // no-op
      }
    });
  }
}
