import { Injectable } from '@angular/core';
import { Post } from './post.service';

export interface MentionedUser {
  username: string;
  name: string;
  avatar: string;
  mentionCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class MentionService {
  private mockUsers: Map<string, MentionedUser> = new Map([
    ['sarahjohnson', { username: 'sarahjohnson', name: 'Sarah Johnson', avatar: 'https://i.pravatar.cc/150?img=5', mentionCount: 0 }],
    ['alexchen', { username: 'alexchen', name: 'Alex Chen', avatar: 'https://i.pravatar.cc/150?img=3', mentionCount: 0 }],
    ['marcuswilliams', { username: 'marcuswilliams', name: 'Marcus Williams', avatar: 'https://i.pravatar.cc/150?img=12', mentionCount: 0 }],
    ['emmadavis', { username: 'emmadavis', name: 'Emma Davis', avatar: 'https://i.pravatar.cc/150?img=7', mentionCount: 0 }],
    ['ninapatel', { username: 'ninapatel', name: 'Nina Patel', avatar: 'https://i.pravatar.cc/150?img=9', mentionCount: 0 }],
    ['lisarodriguez', { username: 'lisarodriguez', name: 'Lisa Rodriguez', avatar: 'https://i.pravatar.cc/150?img=11', mentionCount: 0 }],
    ['jakethompson', { username: 'jakethompson', name: 'Jake Thompson', avatar: 'https://i.pravatar.cc/150?img=8', mentionCount: 0 }],
    ['michaelchen', { username: 'michaelchen', name: 'Michael Chen', avatar: 'https://i.pravatar.cc/150?img=10', mentionCount: 0 }]
  ]);

  constructor() {}

  extractMentionsFromContent(content: string): string[] {
    const mentionRegex = /@([\w]+)/g;
    const matches = content.match(mentionRegex);
    return matches ? matches.map(mention => mention.substring(1)) : [];
  }

  getMentionedUsers(posts: Post[]): MentionedUser[] {
    const mentionMap = new Map<string, number>();

    for (const post of posts) {
      const mentions = this.extractMentionsFromContent(post.content);
      for (const mention of mentions) {
        const normalizedMention = mention.toLowerCase();
        const currentCount = mentionMap.get(normalizedMention) || 0;
        mentionMap.set(normalizedMention, currentCount + 1);
      }

      if (post.repliesList) {
        this.processRepliesForMentions(post.repliesList, mentionMap);
      }
    }

    const mentionedUsers: MentionedUser[] = [];
    mentionMap.forEach((count, username) => {
      const user = this.mockUsers.get(username.toLowerCase());
      if (user) {
        mentionedUsers.push({
          ...user,
          mentionCount: count
        });
      }
    });

    return mentionedUsers.sort((a, b) => b.mentionCount - a.mentionCount);
  }

  private processRepliesForMentions(replies: Post[], mentionMap: Map<string, number>): void {
    for (const reply of replies) {
      const mentions = this.extractMentionsFromContent(reply.content);
      for (const mention of mentions) {
        const normalizedMention = mention.toLowerCase();
        const currentCount = mentionMap.get(normalizedMention) || 0;
        mentionMap.set(normalizedMention, currentCount + 1);
      }

      if (reply.repliesList) {
        this.processRepliesForMentions(reply.repliesList, mentionMap);
      }
    }
  }

  getUserByUsername(username: string): MentionedUser | undefined {
    return this.mockUsers.get(username.toLowerCase());
  }

  getAllUsers(): MentionedUser[] {
    return Array.from(this.mockUsers.values());
  }

  searchUsers(query: string): MentionedUser[] {
    const normalizedQuery = query.toLowerCase();
    return Array.from(this.mockUsers.values()).filter(user =>
      user.username.includes(normalizedQuery) ||
      user.name.toLowerCase().includes(normalizedQuery)
    );
  }

  isMentionedUser(username: string): boolean {
    return this.mockUsers.has(username.toLowerCase());
  }
}
