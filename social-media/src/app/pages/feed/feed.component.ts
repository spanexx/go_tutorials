import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PostCardComponent } from '../../components/post-card/post-card.component';
import { CreatePostComponent } from '../../components/create-post/create-post.component';
import { LucideAngularModule, Hash } from 'lucide-angular';
import { PostService } from '../../shared/services/post.service';
import { PostSkeletonComponent } from '../../shared/skeleton/post-skeleton.component';
import { SkeletonComponent } from '../../shared/skeleton/skeleton.component';
import { RefreshIndicatorComponent } from '../../shared/refresh-indicator/refresh-indicator.component';
import { RefreshService } from '../../shared/services/refresh.service';
import { ToastService } from '../../shared/services/toast.service';
import { InfiniteScrollDirective } from '../../shared/directives/infinite-scroll.directive';
import { LoadingIndicatorComponent } from '../../shared/loading-indicator/loading-indicator.component';
import { SearchService } from '../../shared/services/search.service';

@Component({
  selector: 'app-feed',
  standalone: true,
  imports: [CommonModule, RouterModule, PostCardComponent, CreatePostComponent, LucideAngularModule, PostSkeletonComponent, SkeletonComponent, RefreshIndicatorComponent, InfiniteScrollDirective, LoadingIndicatorComponent],
  templateUrl: './feed.component.html',
  styleUrls: ['./feed.component.scss']
})
export class FeedComponent implements OnInit, OnDestroy {
  hashtagIcon = Hash;
  
  // Use signals for reactive state
  currentPage = signal(1);
  feedType = signal<'home' | 'trending' | 'latest'>('home');

  // Computed signals
  posts = computed(() => this.postService.posts());
  isLoading = computed(() => this.postService.isLoading());
  hasMorePosts = computed(() => this.postService.hasMore());
  isRefreshing = signal(false);
  isLoadingMore = signal(false);

  constructor(
    private postService: PostService,
    private refreshService: RefreshService,
    public searchService: SearchService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    // Load initial feed data from real API
    this.loadFeed();

	// Warm sidebar data (best-effort)
	void this.searchService.refreshTrendingHashtags();
	void this.searchService.refreshSuggestedUsers(5);
  }

  async loadFeed(): Promise<void> {
    try {
      await this.postService.getFeed(this.feedType(), 1, 20).toPromise();
      this.currentPage.set(1);
    } catch (error) {
      console.error('Failed to load feed:', error);
      this.toastService.error('Error', 'Failed to load feed');
    }
  }

  get showRefreshIndicator(): boolean {
    return this.refreshService.refreshState().isRefreshing;
  }

  async onRefresh(): Promise<void> {
    this.isRefreshing.set(true);
    try {
      await this.refreshService.refresh();
      await this.loadFeed();
      this.toastService.success('Feed updated', 'New posts have been loaded');
    } catch (error) {
      console.error('Failed to refresh feed:', error);
    } finally {
      this.isRefreshing.set(false);
    }
  }

  async onLoadMore(): Promise<void> {
    if (this.isLoadingMore() || !this.hasMorePosts()) {
      return;
    }

    this.isLoadingMore.set(true);
    
    try {
      const nextPage = this.currentPage() + 1;
      await this.postService.getFeed(this.feedType(), nextPage, 20).toPromise();
      this.currentPage.set(nextPage);
    } catch (error) {
      console.error('Failed to load more posts:', error);
      this.toastService.error('Error', 'Failed to load more posts');
    } finally {
      this.isLoadingMore.set(false);
    }
  }

  onDismissNewPosts(): void {
    this.refreshService.dismissNewPosts();
  }

  ngOnDestroy(): void {
    this.refreshService.destroy();
    this.postService.clear();
  }
}
