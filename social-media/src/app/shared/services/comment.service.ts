// Code Map: comment.service.ts
// - CommentService: Service for managing comments and replies via API
// - Extends BaseApiService for HTTP calls
// - Methods: getCommentsForPost, addComment, addReply, removeComment, getCommentCount
// - Support for nested replies with parentId
// CID: Phase-2 Milestone 2.2 - Comments & Replies System
import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BaseApiService } from './base-api.service';
import { Comment, CommentInput, CommentState, createEmptyCommentState, addReplyToTree, removeCommentFromTree } from '../models/comment.model';

type ApiComment = {
  id: string;
  post_id: string;
  user_id: string;
  parent_id?: string | null;
  content: string;
  created_at: string;
  updated_at?: string;
  likes_count?: number;
  replies_count?: number;
  replies?: ApiComment[];
  user_name?: string;
  user_username?: string;
  user_avatar?: string;
};

type CommentsResponse = {
  comments: ApiComment[];
  total_count?: number;
  has_more?: boolean;
  page?: number;
  limit?: number;
};

type CommentResponse = {
  comment: ApiComment;
  success: boolean;
  message?: string;
};

@Injectable({
  providedIn: 'root'
})
export class CommentService extends BaseApiService {
  private commentState = signal<CommentState>(createEmptyCommentState());

  constructor(http: HttpClient) {
    super(http);
  }

  /**
   * Fetch comments for a post from API
   */
  async loadCommentsForPost(postId: string): Promise<void> {
    this.commentState.update(state => ({
      ...state,
      isLoading: { ...state.isLoading, [postId]: true }
    }));

    try {
      const response = await this.get<CommentsResponse>(`/posts/${postId}/comments/tree`, {
        page: '1',
        limit: '100'
      }).toPromise();

      const comments = (response?.comments ?? []).map(c => this.mapApiCommentToModel(c));
      const count = this.countAllComments(comments);
      
      this.commentState.update(state => ({
        ...state,
        comments: { ...state.comments, [postId]: comments },
        counts: { ...state.counts, [postId]: count },
        isLoading: { ...state.isLoading, [postId]: false }
      }));
    } catch (error) {
      console.error(`Failed to load comments for post ${postId}:`, error);
      this.commentState.update(state => ({
        ...state,
        isLoading: { ...state.isLoading, [postId]: false }
      }));
    }
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
   * Add a new comment to a post via API
   */
  async addComment(input: CommentInput): Promise<Comment> {
    const response = await this.post<CommentResponse>(`/posts/${input.postId}/comments`, {
      content: input.content,
      parent_id: input.parentId || null
    }).toPromise();

    if (!response?.comment) {
      throw new Error('Failed to create comment');
    }

    const newComment = this.mapApiCommentToModel(response.comment);

    // Optimistic update
    this.commentState.update(state => {
      const comments = state.comments[input.postId] || [];
      const counts = { ...state.counts };

      if (input.parentId) {
        const updatedComments = addReplyToTree(comments, input.parentId!, newComment);
        counts[input.postId] = this.countAllComments(updatedComments);
        return {
          ...state,
          comments: { ...state.comments, [input.postId]: updatedComments },
          counts
        };
      } else {
        counts[input.postId] = (counts[input.postId] || 0) + 1;
        return {
          ...state,
          comments: { ...state.comments, [input.postId]: [...comments, newComment] },
          counts
        };
      }
    });

    return newComment;
  }

  /**
   * Add a reply to an existing comment
   */
  addReply(postId: string, parentId: string, content: string): Promise<Comment> {
    return this.addComment({ postId, content, parentId });
  }

  /**
   * Get all comments for a post (from state)
   */
  getCommentsForPost(postId: string): Comment[] {
    return this.commentState().comments[postId] || [];
  }

  /**
   * Count all comments including nested replies
   */
  private countAllComments(comments: Comment[]): number {
    let count = comments.length;
    for (const comment of comments) {
      if (comment.replies && comment.replies.length > 0) {
        count += this.countAllComments(comment.replies);
      }
    }
    return count;
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
   * Remove a comment via API
   */
  async removeComment(postId: string, commentId: string): Promise<void> {
    await this.delete<void>(`/comments/${commentId}`).toPromise();

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
   * Like a comment via API
   */
  async likeComment(postId: string, commentId: string): Promise<void> {
    // Phase 3 feature: backend endpoint not implemented yet. Keep UI responsive by
    // toggling local state only.
    this.commentState.update(state => {
      const comments = state.comments[postId] || [];
      const updatedComments = this.toggleLikeInTree(comments, commentId);
      return {
        ...state,
        comments: { ...state.comments, [postId]: updatedComments }
      };
    });
  }

  private mapApiCommentToModel(api: ApiComment): Comment {
    return {
      id: api.id,
      postId: api.post_id,
      author: {
        id: api.user_id,
        name: api.user_name ?? 'Unknown',
        username: api.user_username ?? 'unknown',
        avatar: api.user_avatar ?? ''
      },
      content: api.content,
      parentId: api.parent_id ?? null,
      createdAt: new Date(api.created_at),
      updatedAt: api.updated_at ? new Date(api.updated_at) : undefined,
      likes: api.likes_count ?? 0,
      replies: (api.replies ?? []).map(r => this.mapApiCommentToModel(r)),
      isLiked: false
    };
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
