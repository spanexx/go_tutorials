// Code Map: post.service.ts
// - PostService: Service for post operations with real API integration
// - Methods: getFeed, getPost, createPost, updatePost, deletePost
// - Feed types: home, trending, latest
// - Optimistic UI updates for reactions
// - Error handling with toast notifications
// CID: Phase-2 Milestone 2.6 - Posts Service API Integration
import { Injectable, signal, computed } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ToastService } from './toast.service';
import { AuthService } from './auth.service';

export interface User {
  id?: string;
  name: string;
  username: string;
  avatar: string;
  is_verified?: boolean;
}

export interface Post {
  id: string;
  author: User;
  content: string;
  timestamp: string;
  created_at?: string;
  likes: number;
  total_likes?: number;
  replies: number;
  comments_count?: number;
  shares: number;
  shares_count?: number;
  image?: string;
  image_url?: string;
  video_url?: string;
  isLiked?: boolean;
  user_reaction?: string;
  isSaved?: boolean;
}

export interface FeedResponse {
  posts: Post[];
  total_count: number;
  has_more: boolean;
  page: number;
  limit: number;
}

export type FeedType = 'home' | 'trending' | 'latest';

@Injectable({
  providedIn: 'root'
})
export class PostService {
  private readonly apiUrl = `${environment.apiUrl}/${environment.apiVersion}`;

  private postsSignal = signal<Post[]>([]);
  private isLoadingSignal = signal<boolean>(false);
  private hasMoreSignal = signal<boolean>(true);
  private currentPageSignal = signal<number>(1);

  posts = this.postsSignal.asReadonly();
  isLoading = this.isLoadingSignal.asReadonly();
  hasMore = this.hasMoreSignal.asReadonly();

  constructor(
    private http: HttpClient,
    private toastService: ToastService,
    private authService: AuthService
  ) {}

  /**
   * Get feed with pagination
   */
  getFeed(type: FeedType = 'home', page: number = 1, limit: number = 20): Observable<FeedResponse> {
    this.isLoadingSignal.set(true);

    const params = new HttpParams()
      .set('type', type)
      .set('page', page.toString())
      .set('limit', limit.toString());

    return this.http.get<FeedResponse>(`${this.apiUrl}/feed`, { params }).pipe(
      tap(response => {
        if (page === 1) {
          this.postsSignal.set(response.posts);
        } else {
          this.postsSignal.update(posts => [...posts, ...response.posts]);
        }
        this.hasMoreSignal.set(response.has_more);
        this.currentPageSignal.set(page);
        this.isLoadingSignal.set(false);
      }),
      catchError(error => {
        this.isLoadingSignal.set(false);
        this.toastService.error('Error', 'Failed to load feed');
        console.error('Feed error:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get single post by ID
   */
  getPost(postId: string): Observable<Post> {
    return this.http.get<Post>(`${this.apiUrl}/posts/${postId}`).pipe(
      catchError(error => {
        this.toastService.error('Error', 'Failed to load post');
        return throwError(() => error);
      })
    );
  }

  /**
   * Create new post
   */
  createPost(content: string, imageUrl?: string, videoUrl?: string): Observable<Post> {
    const body = {
      content,
      image_url: imageUrl,
      video_url: videoUrl
    };

    return this.http.post<Post>(`${this.apiUrl}/posts`, body).pipe(
      tap(post => {
        this.postsSignal.update(posts => [post, ...posts]);
        this.toastService.success('Success', 'Post created successfully');
      }),
      catchError(error => {
        this.toastService.error('Error', 'Failed to create post');
        return throwError(() => error);
      })
    );
  }

  /**
   * Update existing post
   */
  updatePost(postId: string, content: string, imageUrl?: string, videoUrl?: string): Observable<Post> {
    const body = {
      content,
      image_url: imageUrl,
      video_url: videoUrl
    };

    return this.http.put<Post>(`${this.apiUrl}/posts/${postId}`, body).pipe(
      tap(updatedPost => {
        this.postsSignal.update(posts =>
          posts.map(p => p.id === postId ? { ...p, ...updatedPost } : p)
        );
        this.toastService.success('Success', 'Post updated successfully');
      }),
      catchError(error => {
        this.toastService.error('Error', 'Failed to update post');
        return throwError(() => error);
      })
    );
  }

  /**
   * Delete post
   */
  deletePost(postId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/posts/${postId}`).pipe(
      tap(() => {
        this.postsSignal.update(posts => posts.filter(p => p.id !== postId));
        this.toastService.success('Success', 'Post deleted successfully');
      }),
      catchError(error => {
        this.toastService.error('Error', 'Failed to delete post');
        return throwError(() => error);
      })
    );
  }

  /**
   * Get posts by user
   */
  getPostsByUser(userId: string, page: number = 1, limit: number = 20): Observable<FeedResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    return this.http.get<FeedResponse>(`${this.apiUrl}/users/${userId}/posts`, { params }).pipe(
      tap(response => {
        if (page === 1) {
          this.postsSignal.set(response.posts);
        } else {
          this.postsSignal.update(posts => [...posts, ...response.posts]);
        }
        this.hasMoreSignal.set(response.has_more);
      }),
      catchError(error => {
        this.toastService.error('Error', 'Failed to load user posts');
        return throwError(() => error);
      })
    );
  }

  /**
   * Get posts by hashtag
   */
  getPostsByHashtag(hashtag: string, page: number = 1, limit: number = 20): Observable<FeedResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('limit', limit.toString());

    return this.http.get<FeedResponse>(`${this.apiUrl}/hashtag/${hashtag}`, { params }).pipe(
      tap(response => {
        if (page === 1) {
          this.postsSignal.set(response.posts);
        } else {
          this.postsSignal.update(posts => [...posts, ...response.posts]);
        }
        this.hasMoreSignal.set(response.has_more);
      }),
      catchError(error => {
        this.toastService.error('Error', 'Failed to load hashtag posts');
        return throwError(() => error);
      })
    );
  }

  /**
   * Optimistic like update (for instant UI feedback)
   */
  toggleLikeOptimistic(postId: string): void {
    this.postsSignal.update(posts => {
      return posts.map(post => {
        if (post.id === postId) {
          const newIsLiked = !post.isLiked;
          return {
            ...post,
            isLiked: newIsLiked,
            likes: post.likes + (newIsLiked ? 1 : -1)
          };
        }
        return post;
      });
    });
  }

  /**
   * Revert optimistic update on error
   */
  revertLike(postId: string): void {
    this.postsSignal.update(posts => {
      return posts.map(post => {
        if (post.id === postId) {
          const newIsLiked = !post.isLiked;
          return {
            ...post,
            isLiked: newIsLiked,
            likes: post.likes + (newIsLiked ? 1 : -1)
          };
        }
        return post;
      });
    });
  }

  /**
   * Clear posts (for logout or refresh)
   */
  clear(): void {
    this.postsSignal.set([]);
    this.hasMoreSignal.set(true);
    this.currentPageSignal.set(1);
  }

  /**
   * Refresh feed
   */
  refresh(type: FeedType = 'home'): Observable<FeedResponse> {
    this.currentPageSignal.set(1);
    return this.getFeed(type, 1, 20);
  }

  // Legacy methods for backward compatibility (to be removed in future refactor)
  
  /**
   * @deprecated Use createPost() instead - this is for mock data only
   */
  addPost(content: string, image?: string): void {
    // This is now a no-op for mock data
    // Use createPost() for real API calls
    console.warn('addPost() is deprecated. Use createPost() for API calls.');
  }

  /**
   * @deprecated Use getPost() instead - this is for mock data only
   */
  getPostById(postId: string): Post | undefined {
    return this.postsSignal().find(p => p.id === postId);
  }

  /**
   * @deprecated Use toggleLike() from reaction service instead
   */
  toggleLike(postId: string): void {
    this.toggleLikeOptimistic(postId);
  }

  /**
   * @deprecated Use bookmark service instead
   */
  toggleSave(postId: string, collectionId?: string): void {
    // Handled by BookmarkCollectionService
    console.warn('toggleSave() is deprecated. Use BookmarkCollectionService.');
  }

  /**
   * @deprecated Use savedPosts signal instead
   */
  getSavedPosts(): Post[] {
    return this.postsSignal().filter(post => post.isSaved);
  }

  /**
   * Update reply count (for mock data compatibility)
   */
  updateReplyCount(postId: string, count: number): void {
    this.postsSignal.update(posts => {
      return posts.map(post => {
        if (post.id === postId) {
          return { ...post, replies: count };
        }
        return post;
      });
    });
  }
}
