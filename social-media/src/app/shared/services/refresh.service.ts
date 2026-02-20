import { Injectable, signal, effect } from '@angular/core';
import { PostService } from './post.service';

export interface RefreshState {
  isRefreshing: boolean;
  lastRefreshed: Date | null;
  newPostsCount: number;
  autoRefreshEnabled: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class RefreshService {
  private refreshStateSignal = signal<RefreshState>({
    isRefreshing: false,
    lastRefreshed: null,
    newPostsCount: 0,
    autoRefreshEnabled: true
  });

  refreshState = this.refreshStateSignal.asReadonly();
  private refreshInterval: any;

  constructor(private postService: PostService) {
    this.initAutoRefresh();
  }

  private initAutoRefresh(): void {
    // Auto-refresh every 60 seconds when enabled
    this.refreshInterval = setInterval(() => {
      if (this.refreshStateSignal().autoRefreshEnabled && !this.refreshStateSignal().isRefreshing) {
        this.checkForNewPosts(false);
      }
    }, 60000);
  }

  destroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  async checkForNewPosts(showIndicator: boolean = true): Promise<number> {
    this.refreshStateSignal.update(state => ({
      ...state,
      isRefreshing: showIndicator
    }));

    // Simulate API call to check for new posts
    await new Promise(resolve => setTimeout(resolve, showIndicator ? 1000 : 500));

    // In a real app, this would call an API to check for new posts
    // For demo, we'll simulate finding 0-3 new posts
    const newPostsCount = Math.floor(Math.random() * 4);

    const now = new Date();
    
    this.refreshStateSignal.update(state => ({
      ...state,
      isRefreshing: false,
      lastRefreshed: now,
      newPostsCount: showIndicator ? newPostsCount : state.newPostsCount + newPostsCount
    }));

    return newPostsCount;
  }

  async refresh(): Promise<void> {
    await this.checkForNewPosts(true);
  }

  getNewPostsCount(): number {
    return this.refreshStateSignal().newPostsCount;
  }

  showNewPostsIndicator(): boolean {
    const state = this.refreshStateSignal();
    return state.newPostsCount > 0 && !state.isRefreshing;
  }

  dismissNewPosts(): void {
    this.refreshStateSignal.update(state => ({
      ...state,
      newPostsCount: 0
    }));
  }

  toggleAutoRefresh(): void {
    this.refreshStateSignal.update(state => ({
      ...state,
      autoRefreshEnabled: !state.autoRefreshEnabled
    }));
  }

  isAutoRefreshEnabled(): boolean {
    return this.refreshStateSignal().autoRefreshEnabled;
  }

  getLastRefreshed(): Date | null {
    return this.refreshStateSignal().lastRefreshed;
  }

  getFormattedLastRefresh(): string {
    const lastRefreshed = this.getLastRefreshed();
    if (!lastRefreshed) return 'Never';

    const now = new Date();
    const diffMs = now.getTime() - lastRefreshed.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins === 0) return 'Just now';
    if (diffMins === 1) return '1 minute ago';
    if (diffMins < 60) return `${diffMins} minutes ago`;

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;

    return lastRefreshed.toLocaleTimeString();
  }
}
