// Code Map: comment.service.ts
// - CommentService: Service for managing comments and replies
// - Signals: commentState for reactive state management
// - Methods: getCommentsForPost, addComment, addReply, removeComment, getCommentCount
// - Support for nested replies with parentId
// CID: Phase-2 Milestone 2.2 - Comments & Replies System
import { Injectable, signal } from '@angular/core';
import { Comment, CommentInput, CommentState, createEmptyCommentState, addReplyToTree, removeCommentFromTree } from '../models/comment.model';

@Injectable({
  providedIn: 'root'
})
export class CommentService {
  private commentState = signal<CommentState>(createEmptyCommentState());

  constructor() {
    // Initialize with mock data for development
    this.initializeMockData();
  }

  private initializeMockData(): void {
    // Mock data for development - will be replaced with API calls in Phase 2.6
    const mockPosts = ['post-1', 'post-2', 'post-3'];
    const updates: Partial<CommentState> = {
      comments: {},
      counts: {},
      isLoading: {}
    };

    mockPosts.forEach(postId => {
      updates.comments![postId] = this.generateMockComments(postId);
      updates.counts![postId] = this.countAllComments(updates.comments![postId]);
      updates.isLoading![postId] = false;
    });

    this.commentState.update(state => ({
      ...state,
      ...updates
    }));
  }

  private generateMockComments(postId: string): Comment[] {
    const numComments = Math.floor(Math.random() * 5);
    const comments: Comment[] = [];

    for (let i = 0; i < numComments; i++) {
      const comment: Comment = {
        id: `comment-${postId}-${i}`,
        postId,
        author: {
          id: `user-${i}`,
          name: `User ${i + 1}`,
          username: `user${i + 1}`,
          avatar: `https://i.pravatar.cc/150?img=${i}`
        },
        content: `This is a mock comment ${i + 1} on post ${postId}. Great post!`,
        parentId: null,
        createdAt: new Date(Date.now() - Math.random() * 86400000 * 7),
        likes: Math.floor(Math.random() * 10),
        replies: this.generateMockReplies(postId, i, 2)
      };
      comments.push(comment);
    }

    return comments;
  }

  private generateMockReplies(postId: string, parentIndex: number, count: number): Comment[] {
    const replies: Comment[] = [];
    for (let i = 0; i < count; i++) {
      replies.push({
        id: `reply-${postId}-${parentIndex}-${i}`,
        postId,
        author: {
          id: `user-reply-${i}`,
          name: `Reply User ${i + 1}`,
          username: `replyuser${i + 1}`,
          avatar: `https://i.pravatar.cc/150?img=${i + 10}`
        },
        content: `This is a mock reply ${i + 1} to comment ${parentIndex}.`,
        parentId: `comment-${postId}-${parentIndex}`,
        createdAt: new Date(Date.now() - Math.random() * 86400000 * 3),
        likes: Math.floor(Math.random() * 5),
        replies: []
      });
    }
    return replies;
  }

  private countAllComments(comments: Comment[]): number {
    let count = comments.length;
    for (const comment of comments) {
      if (comment.replies && comment.replies.length > 0) {
        count += this.countAllComments(comment.replies);
      }
    }
    return count;
  }

  /**
   * Get all comments for a post
   */
  getCommentsForPost(postId: string): Comment[] {
    return this.commentState().comments[postId] || [];
  }

  /**
   * Get comment count for a post
   */
  getCommentCount(postId: string): number {
    return this.commentState().counts[postId] || 0;
  }

  /**
   * Check if comments are loading for a post
   */
  isLoading(postId: string): boolean {
    return this.commentState().isLoading[postId] || false;
  }

  /**
   * Add a new comment to a post
   */
  addComment(input: CommentInput): Promise<Comment> {
    return new Promise((resolve, reject) => {
      const newComment: Comment = {
        id: `comment-${Date.now()}`,
        postId: input.postId,
        author: {
          id: 'current-user',
          name: 'Current User',
          username: 'currentuser',
          avatar: 'https://i.pravatar.cc/150?img=0'
        },
        content: input.content,
        parentId: input.parentId || null,
        createdAt: new Date(),
        likes: 0,
        replies: []
      };

      // Optimistic update
      this.commentState.update(state => {
        const comments = state.comments[input.postId] || [];
        const counts = { ...state.counts };

        if (input.parentId) {
          // Add as reply to existing comment
          const updatedComments = addReplyToTree(comments, input.parentId!, newComment);
          counts[input.postId] = this.countAllComments(updatedComments);
          return {
            ...state,
            comments: { ...state.comments, [input.postId]: updatedComments },
            counts
          };
        } else {
          // Add as top-level comment
          counts[input.postId] = (counts[input.postId] || 0) + 1;
          return {
            ...state,
            comments: { ...state.comments, [input.postId]: [...comments, newComment] },
            counts
          };
        }
      });

      // Simulate API call (replace with actual API in Phase 2.6)
      setTimeout(() => {
        console.log(`Comment added to post ${input.postId}`);
        resolve(newComment);
      }, 300);
    });
  }

  /**
   * Add a reply to an existing comment
   */
  addReply(postId: string, parentId: string, content: string): Promise<Comment> {
    return this.addComment({ postId, content, parentId });
  }

  /**
   * Get replies for a specific comment
   */
  getReplies(postId: string, parentId: string): Comment[] {
    const comments = this.getCommentsForPost(postId);
    return this.findCommentAndReplies(comments, parentId);
  }

  private findCommentAndReplies(comments: Comment[], commentId: string): Comment[] {
    for (const comment of comments) {
      if (comment.id === commentId) {
        return comment.replies || [];
      }
      if (comment.replies && comment.replies.length > 0) {
        const found = this.findCommentAndReplies(comment.replies, commentId);
        if (found.length > 0) {
          return found;
        }
      }
    }
    return [];
  }

  /**
   * Remove a comment (soft delete - Phase 3 feature)
   */
  removeComment(postId: string, commentId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Optimistic update
      this.commentState.update(state => {
        const comments = state.comments[postId] || [];
        const updatedComments = removeCommentFromTree(comments, commentId);
        const counts = {
          ...state.counts,
          [postId]: this.countAllComments(updatedComments)
        };

        return {
          ...state,
          comments: { ...state.comments, [postId]: updatedComments },
          counts
        };
      });

      // Simulate API call
      setTimeout(() => {
        console.log(`Comment ${commentId} removed from post ${postId}`);
        resolve();
      }, 300);
    });
  }

  /**
   * Initialize comment state for a new post
   */
  initializePost(postId: string): void {
    this.commentState.update(state => {
      if (state.comments[postId]) {
        return state;
      }

      return {
        ...state,
        comments: {
          ...state.comments,
          [postId]: []
        },
        counts: {
          ...state.counts,
          [postId]: 0
        },
        isLoading: {
          ...state.isLoading,
          [postId]: false
        }
      };
    });
  }

  /**
   * Like a comment (placeholder for Phase 3)
   */
  likeComment(postId: string, commentId: string): Promise<void> {
    return new Promise((resolve) => {
      // Optimistic update
      this.commentState.update(state => {
        const comments = state.comments[postId] || [];
        const updatedComments = this.toggleLikeInTree(comments, commentId);
        return {
          ...state,
          comments: { ...state.comments, [postId]: updatedComments }
        };
      });

      setTimeout(() => resolve(), 300);
    });
  }

  private toggleLikeInTree(comments: Comment[], commentId: string): Comment[] {
    return comments.map(comment => {
      if (comment.id === commentId) {
        return {
          ...comment,
          likes: comment.isLiked ? comment.likes - 1 : comment.likes + 1,
          isLiked: !comment.isLiked
        };
      }
      if (comment.replies && comment.replies.length > 0) {
        return {
          ...comment,
          replies: this.toggleLikeInTree(comment.replies, commentId)
        };
      }
      return comment;
    });
  }
}
