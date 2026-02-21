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
  // Fallback users for when API is unavailable
  private readonly fallbackUsers: Map<string, MentionedUser> = new Map([
    ['sarahjohnson', { id: '1', username: 'sarahjohnson', name: 'Sarah Johnson', avatar: 'https://i.pravatar.cc/150?img=5', mentionCount: 0 }],
    ['alexchen', { id: '2', username: 'alexchen', name: 'Alex Chen', avatar: 'https://i.pravatar.cc/150?img=3', mentionCount: 0 }],
    ['marcuswilliams', { id: '3', username: 'marcuswilliams', name: 'Marcus Williams', avatar: 'https://i.pravatar.cc/150?img=12', mentionCount: 0 }],
    ['emmadavis', { id: '4', username: 'emmadavis', name: 'Emma Davis', avatar: 'https://i.pravatar.cc/150?img=7', mentionCount: 0 }],
    ['ninapatel', { id: '5', username: 'ninapatel', name: 'Nina Patel', avatar: 'https://i.pravatar.cc/150?img=9', mentionCount: 0 }],
    ['lisarodriguez', { id: '6', username: 'lisarodriguez', name: 'Lisa Rodriguez', avatar: 'https://i.pravatar.cc/150?img=11', mentionCount: 0 }],
    ['jakethompson', { id: '7', username: 'jakethompson', name: 'Jake Thompson', avatar: 'https://i.pravatar.cc/150?img=8', mentionCount: 0 }],
    ['michaelchen', { id: '8', username: 'michaelchen', name: 'Michael Chen', avatar: 'https://i.pravatar.cc/150?img=10', mentionCount: 0 }]
  ]);

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
      // Try cache first, then fallback
      const user = this.userCache.get(username) || this.fallbackUsers.get(username);
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
   * Falls back to cached/fallback data if API unavailable
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
    
    return this.fallbackUsers.get(normalizedUsername);
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
    return Array.from(this.fallbackUsers.values());
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
    
    // Fallback to local search
    return Array.from(this.fallbackUsers.values()).filter(user =>
      user.username.includes(normalizedQuery) ||
      user.name.toLowerCase().includes(normalizedQuery)
    );
  }

  /**
   * Check if a username exists in the system
   */
  isMentionedUser(username: string): boolean {
    return this.userCache.has(username.toLowerCase()) ||
      this.fallbackUsers.has(username.toLowerCase());
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
        const fallback = this.fallbackUsers.get(normalized);
        if (fallback) {
          this.userCache.set(normalized, fallback);
        }
      }
    });
  }
}
