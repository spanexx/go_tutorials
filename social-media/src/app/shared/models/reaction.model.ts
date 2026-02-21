// Code Map: reaction.model.ts
// - ReactionType: Enum for 6 reaction types
// - Reaction: Interface for reaction data
// - ReactionCounts: Interface for reaction counts per post
// - ReactionSummary: Interface for reaction summary display
// CID: Phase-2 Milestone 2.1 - Post Reactions
export enum ReactionType {
  Like = 'like',
  Love = 'love',
  Laugh = 'laugh',
  Wow = 'wow',
  Sad = 'sad',
  Angry = 'angry'
}

export interface Reaction {
  id: string;
  userId: string;
  postId: string;
  type: ReactionType;
  createdAt: Date;
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

export interface ReactionSummary {
  counts: ReactionCounts;
  userReaction: ReactionType | null;
  topReactions: { type: ReactionType; count: number }[];
}

// Reaction type metadata for UI display
export interface ReactionTypeMeta {
  type: ReactionType;
  label: string;
  emoji: string;
  color: string;
}

export const REACTION_TYPES: ReactionTypeMeta[] = [
  { type: ReactionType.Like, label: 'Like', emoji: '👍', color: '#1877f2' },
  { type: ReactionType.Love, label: 'Love', emoji: '❤️', color: '#f33e58' },
  { type: ReactionType.Laugh, label: 'Haha', emoji: '😂', color: '#f7b125' },
  { type: ReactionType.Wow, label: 'Wow', emoji: '😮', color: '#f7b125' },
  { type: ReactionType.Sad, label: 'Sad', emoji: '😢', color: '#f7b125' },
  { type: ReactionType.Angry, label: 'Angry', emoji: '😠', color: '#ff613b' }
];

// Helper function to get reaction metadata by type
export function getReactionMeta(type: ReactionType): ReactionTypeMeta | undefined {
  return REACTION_TYPES.find(r => r.type === type);
}

// Helper function to create empty reaction counts
export function createEmptyReactionCounts(): ReactionCounts {
  return {
    like: 0,
    love: 0,
    laugh: 0,
    wow: 0,
    sad: 0,
    angry: 0,
    total: 0
  };
}

// Helper function to calculate total from counts
export function calculateTotalCounts(counts: Omit<ReactionCounts, 'total'>): number {
  return counts.like + counts.love + counts.laugh + counts.wow + counts.sad + counts.angry;
}
