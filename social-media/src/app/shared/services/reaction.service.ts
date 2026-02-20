import { Injectable, signal } from '@angular/core';

export type ReactionType = 'like' | 'love' | 'laugh' | 'wow' | 'sad' | 'angry';

export interface Reaction {
  id: string;
  type: ReactionType;
  userId: string;
  postId: number;
  timestamp: Date;
}

export interface ReactionCounts {
  like: number;
  love: number;
  laugh: number;
  wow: number;
  sad: number;
  angry: number;
  total: number;
}

export interface ReactionData {
  emoji: string;
  label: string;
  color: string;
  hoverColor: string;
}

@Injectable({
  providedIn: 'root'
})
export class ReactionService {
  private reactionsSignal = signal<Reaction[]>([]);
  reactions = this.reactionsSignal.asReadonly();

  private userReactionsSignal = signal<Map<number, ReactionType>>(new Map());
  userReactions = this.userReactionsSignal.asReadonly();

  readonly reactionTypes: Record<ReactionType, ReactionData> = {
    like: { emoji: '👍', label: 'Like', color: '#1877f2', hoverColor: '#1877f2' },
    love: { emoji: '❤️', label: 'Love', color: '#f33e58', hoverColor: '#f33e58' },
    laugh: { emoji: '😂', label: 'Haha', color: '#f7b125', hoverColor: '#f7b125' },
    wow: { emoji: '😮', label: 'Wow', color: '#f7b125', hoverColor: '#f7b125' },
    sad: { emoji: '😢', label: 'Sad', color: '#f7b125', hoverColor: '#f7b125' },
    angry: { emoji: '😠', label: 'Angry', color: '#e44b23', hoverColor: '#e44b23' }
  };

  getReactionCounts(postId: number): ReactionCounts {
    const postReactions = this.reactionsSignal().filter(r => r.postId === postId);
    
    const counts: ReactionCounts = {
      like: 0,
      love: 0,
      laugh: 0,
      wow: 0,
      sad: 0,
      angry: 0,
      total: 0
    };

    postReactions.forEach(reaction => {
      counts[reaction.type]++;
      counts.total++;
    });

    return counts;
  }

  getUserReaction(postId: number): ReactionType | null {
    return this.userReactionsSignal().get(postId) || null;
  }

  addReaction(postId: number, type: ReactionType): void {
    const existingReaction = this.getUserReaction(postId);
    
    if (existingReaction === type) {
      this.removeReaction(postId);
      return;
    }

    if (existingReaction) {
      this.removeReaction(postId);
    }

    const reaction: Reaction = {
      id: `reaction-${postId}-${Date.now()}`,
      type,
      userId: 'current-user',
      postId,
      timestamp: new Date()
    };

    this.reactionsSignal.update(reactions => [...reactions, reaction]);
    
    this.userReactionsSignal.update(map => {
      const newMap = new Map(map);
      newMap.set(postId, type);
      return newMap;
    });
  }

  removeReaction(postId: number): void {
    this.reactionsSignal.update(reactions => 
      reactions.filter(r => r.postId !== postId || r.userId !== 'current-user')
    );

    this.userReactionsSignal.update(map => {
      const newMap = new Map(map);
      newMap.delete(postId);
      return newMap;
    });
  }

  getReactionEmoji(type: ReactionType): string {
    return this.reactionTypes[type].emoji;
  }

  getReactionColor(type: ReactionType): string {
    return this.reactionTypes[type].color;
  }

  getReactionLabel(type: ReactionType): string {
    return this.reactionTypes[type].label;
  }

  getAllReactions(): ReactionType[] {
    return Object.keys(this.reactionTypes) as ReactionType[];
  }

  formatReactionCount(counts: ReactionCounts): string {
    if (counts.total === 0) return '';
    if (counts.total === 1) {
      const type = Object.keys(counts).find(key => counts[key as keyof ReactionCounts] === 1 && key !== 'total') as ReactionType | undefined;
      if (type) return `1 ${this.reactionTypes[type].label}`;
    }
    return counts.total.toString();
  }

  getTopReactions(counts: ReactionCounts): { type: ReactionType; count: number }[] {
    return (Object.keys(counts) as Array<keyof ReactionCounts>)
      .filter(key => key !== 'total' && counts[key] > 0)
      .map(key => ({ type: key as ReactionType, count: counts[key] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }
}
