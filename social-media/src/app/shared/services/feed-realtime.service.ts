/**
 * FeedRealtimeService
 *
 * Integrates real-time feed updates into the Angular app using WebSocket.
 *
 * Features:
 * - Subscribe to feed updates channel
 * - New post notification (toast or banner)
 * - X new posts banner (click to load)
 * - Live reaction/comment counts
 * - Throttle updates (batch every 30 seconds)
 *
 * CID: Phase-3 Milestone 3.7 - Realtime Service
 */
import { Injectable, OnDestroy } from '@angular/core';
import { WebSocketService, WSMessage, ConnectionStatus } from '../../shared/services/websocket.service';
import { PostService, Post } from '../../shared/services/post.service';
import { ToastService } from '../../shared/services/toast.service';
import { AuthService } from '../../shared/services/auth.service';
import { filter, takeUntil, throttleTime } from 'rxjs/operators';
import { Subject, timer } from 'rxjs';

/**
 * Real-time feed update payload structure
 */
export interface FeedUpdate {
  type: 'new_post' | 'post_updated' | 'reaction' | 'comment' | 'share';
  post_id: string;
  user_id?: string;
  username?: string;
  action?: string;
  count?: number;
  post?: Post;
  created_at: string;
}

/**
 * Batched feed updates
 */
export interface BatchedFeedUpdates {
  newPostsCount: number;
  updates: FeedUpdate[];
  lastBatchTime: number;
}

@Injectable({
  providedIn: 'root'
})
export class FeedRealtimeService implements OnDestroy {
  /** Destroy subject for cleanup */
  private destroySubject = new Subject<void>();

  /** Whether new posts are available */
  private hasNewPosts = false;

  /** Count of new posts */
  private newPostsCount = 0;

  /** Batched updates */
  private batchedUpdates: FeedUpdate[] = [];

  /** Last batch time */
  private lastBatchTime = 0;

  /** Batch interval in milliseconds */
  private readonly BATCH_INTERVAL = 30000; // 30 seconds

  /** New posts subject */
  private newPostsSubject = new Subject<number>();

  /** Feed update subject */
  private feedUpdateSubject = new Subject<FeedUpdate>();

  constructor(
    private wsService: WebSocketService,
    private postService: PostService,
    private toastService: ToastService,
    private authService: AuthService
  ) {
    this.setupWebSocketListeners();
    this.startBatchTimer();
  }

  /**
   * Initialize real-time feed updates
   * Should be called when user navigates to feed page
   */
  initialize(): void {
    const user = this.authService.user;
    const token = this.authService.getToken();

    if (!user || !token) {
      return;
    }

    // Connect to WebSocket if not already connected
    if (this.wsService.status === ConnectionStatus.DISCONNECTED) {
      this.wsService.connect(token, user.id);
    }

    // Subscribe to feed updates channel
    this.subscribeToFeedUpdates();
  }

  /**
   * Clean up on destroy
   */
  ngOnDestroy(): void {
    this.destroySubject.next();
    this.destroySubject.complete();
    this.wsService.unsubscribe('feed:updates');
  }

  /**
   * Check if there are new posts
   */
  getHasNewPosts(): boolean {
    return this.hasNewPosts;
  }

  /**
   * Get count of new posts
   */
  getNewPostsCount(): number {
    return this.newPostsCount;
  }

  /**
   * Reset new posts flag and count
   */
  resetNewPosts(): void {
    this.hasNewPosts = false;
    this.newPostsCount = 0;
    this.newPostsSubject.next(0);
  }

  /**
   * Load new posts
   */
  loadNewPosts(): void {
    this.resetNewPosts();
    // Trigger feed refresh in parent component
    // This would typically be handled by the feed component
  }

  /**
   * Get new posts observable
   */
  onNewPosts(): ReturnType<typeof this.newPostsSubject.asObservable> {
    return this.newPostsSubject.asObservable();
  }

  /**
   * Get feed update observable
   */
  onFeedUpdate(): ReturnType<typeof this.feedUpdateSubject.asObservable> {
    return this.feedUpdateSubject.asObservable();
  }

  /**
   * Setup WebSocket connection listeners
   */
  private setupWebSocketListeners(): void {
    // Listen for connection status changes
    this.wsService.status$
      .pipe(
        filter(status => status === ConnectionStatus.CONNECTED),
        takeUntil(this.destroySubject)
      )
      .subscribe(() => {
        // Re-subscribe to feed updates channel
        this.subscribeToFeedUpdates();
      });

    // Listen for feed updates with throttling
    this.wsService.on<FeedUpdate>('feed_update')
      .pipe(
        takeUntil(this.destroySubject),
        throttleTime(1000) // Prevent spam
      )
      .subscribe({
        next: (message: WSMessage<FeedUpdate>) => {
          this.handleFeedUpdate(message.payload);
        },
        error: (error) => {
          console.error('Error receiving feed update:', error);
        }
      });

    // Listen for reaction updates
    this.wsService.on<FeedUpdate>('reaction')
      .pipe(takeUntil(this.destroySubject))
      .subscribe({
        next: (message: WSMessage<FeedUpdate>) => {
          this.handleReactionUpdate(message.payload);
        }
      });

    // Listen for comment updates
    this.wsService.on<FeedUpdate>('comment')
      .pipe(takeUntil(this.destroySubject))
      .subscribe({
        next: (message: WSMessage<FeedUpdate>) => {
          this.handleCommentUpdate(message.payload);
        }
      });

    // Listen for share updates
    this.wsService.on<FeedUpdate>('share')
      .pipe(takeUntil(this.destroySubject))
      .subscribe({
        next: (message: WSMessage<FeedUpdate>) => {
          this.handleShareUpdate(message.payload);
        }
      });
  }

  /**
   * Subscribe to feed updates channel
   */
  private subscribeToFeedUpdates(): void {
    this.wsService.subscribe('feed:updates');
  }

  /**
   * Start batch timer for throttling updates
   */
  private startBatchTimer(): void {
    timer(0, this.BATCH_INTERVAL)
      .pipe(takeUntil(this.destroySubject))
      .subscribe(() => {
        this.flushBatchedUpdates();
      });
  }

  /**
   * Handle feed update
   */
  private handleFeedUpdate(payload: FeedUpdate): void {
    // Don't process own actions
    const currentUserId = this.authService.user?.id;
    if (payload.user_id === currentUserId) {
      return;
    }

    // Add to batch
    this.batchedUpdates.push(payload);

    if (payload.type === 'new_post') {
      this.newPostsCount++;
      this.hasNewPosts = true;
      this.newPostsSubject.next(this.newPostsCount);

      // Show toast for first new post
      if (this.newPostsCount === 1) {
        this.showToastNotification('New post available');
      }
    }

    // Emit individual update
    this.feedUpdateSubject.next(payload);
  }

  /**
   * Handle reaction update
   */
  private handleReactionUpdate(payload: FeedUpdate): void {
    // Update post reaction count in real-time
    // This would typically update the post in the feed
    console.log('Reaction update:', payload);
  }

  /**
   * Handle comment update
   */
  private handleCommentUpdate(payload: FeedUpdate): void {
    // Update post comment count in real-time
    console.log('Comment update:', payload);
  }

  /**
   * Handle share update
   */
  private handleShareUpdate(payload: FeedUpdate): void {
    // Update post share count in real-time
    console.log('Share update:', payload);
  }

  /**
   * Flush batched updates
   */
  private flushBatchedUpdates(): void {
    if (this.batchedUpdates.length === 0) {
      return;
    }

    // Process batched updates
    const batch: BatchedFeedUpdates = {
      newPostsCount: this.newPostsCount,
      updates: [...this.batchedUpdates],
      lastBatchTime: Date.now()
    };

    console.log('Flushing batched updates:', batch);

    // Clear batch
    this.batchedUpdates = [];
  }

  /**
   * Show toast notification
   */
  private showToastNotification(message: string): void {
    this.toastService.show('Feed Update', {
      type: 'info',
      message,
      duration: 5000
    });
  }
}
