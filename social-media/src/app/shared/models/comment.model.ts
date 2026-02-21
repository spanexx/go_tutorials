// Code Map: comment.model.ts
// - Comment: Interface for comment data with nested reply support
// - CommentInput: Interface for creating new comments
// - CommentState: Interface for signal-based comment state management
// CID: Phase-2 Milestone 2.2 - Comments & Replies System
export interface Comment {
  id: string;
  postId: string;
  author: {
    id: string;
    name: string;
    username: string;
    avatar: string;
  };
  content: string;
  parentId: string | null;
  createdAt: Date;
  updatedAt?: Date;
  likes: number;
  replies: Comment[];
  isLiked?: boolean;
}

export interface CommentInput {
  postId: string;
  content: string;
  parentId?: string | null;
}

export interface CommentState {
  comments: Record<string, Comment[]>;
  counts: Record<string, number>;
  isLoading: Record<string, boolean>;
}

// Helper function to create empty comment state
export function createEmptyCommentState(): CommentState {
  return {
    comments: {},
    counts: {},
    isLoading: {}
  };
}

// Helper function to flatten nested comments for display
export function flattenComments(comments: Comment[], depth: number = 0): (Comment & { depth: number })[] {
  const result: (Comment & { depth: number })[] = [];
  
  for (const comment of comments) {
    result.push({ ...comment, depth });
    if (comment.replies && comment.replies.length > 0) {
      result.push(...flattenComments(comment.replies, depth + 1));
    }
  }
  
  return result;
}

// Helper function to add a reply to a nested comment tree
export function addReplyToTree(comments: Comment[], parentId: string, reply: Comment): Comment[] {
  return comments.map(comment => {
    if (comment.id === parentId) {
      return {
        ...comment,
        replies: [...comment.replies, reply]
      };
    }
    if (comment.replies && comment.replies.length > 0) {
      return {
        ...comment,
        replies: addReplyToTree(comment.replies, parentId, reply)
      };
    }
    return comment;
  });
}

// Helper function to remove a comment from a nested tree
export function removeCommentFromTree(comments: Comment[], commentId: string): Comment[] {
  return comments
    .filter(comment => comment.id !== commentId)
    .map(comment => ({
      ...comment,
      replies: comment.replies && comment.replies.length > 0
        ? removeCommentFromTree(comment.replies, commentId)
        : []
    }));
}
