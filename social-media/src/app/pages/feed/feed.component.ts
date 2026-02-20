import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThreadComponent } from '../../components/thread/thread.component';
import { CreatePostComponent } from '../../components/create-post/create-post.component';
import { LucideAngularModule, Hash } from 'lucide-angular';
import { PostService, Post } from '../../shared/services/post.service';
import { PostSkeletonComponent } from '../../shared/skeleton/post-skeleton.component';
import { SkeletonComponent } from '../../shared/skeleton/skeleton.component';
import { RefreshIndicatorComponent } from '../../shared/refresh-indicator/refresh-indicator.component';
import { RefreshService } from '../../shared/services/refresh.service';
import { ToastService } from '../../shared/services/toast.service';
import { InfiniteScrollDirective } from '../../shared/directives/infinite-scroll.directive';
import { LoadingIndicatorComponent } from '../../shared/loading-indicator/loading-indicator.component';

@Component({
  selector: 'app-feed',
  standalone: true,
  imports: [CommonModule, ThreadComponent, CreatePostComponent, LucideAngularModule, PostSkeletonComponent, SkeletonComponent, RefreshIndicatorComponent, InfiniteScrollDirective, LoadingIndicatorComponent],
  templateUrl: './feed.component.html',
  styleUrls: ['./feed.component.scss']
})
export class FeedComponent implements OnDestroy {
  hashtagIcon = Hash;
  isLoading = true;
  isRefreshing = false;
  isLoadingMore = false;
  hasMorePosts = true;
  currentPage = 1;
  readonly postsPerPage = 5;

  constructor(
    private postService: PostService,
    private refreshService: RefreshService,
    private toastService: ToastService
  ) {
    // Simulate initial loading delay
    setTimeout(() => {
      this.isLoading = false;
      this.refreshService.refresh();
    }, 1500);
  }

  get posts(): Post[] {
    const allPosts = this.postService.posts();
    // For demo, limit initial posts and load more on scroll
    return allPosts.slice(0, this.currentPage * this.postsPerPage);
  }

  get showRefreshIndicator(): boolean {
    return this.refreshService.refreshState().isRefreshing;
  }

  async onRefresh(): Promise<void> {
    this.isRefreshing = true;
    await this.refreshService.refresh();
    this.isRefreshing = false;
    this.toastService.success('Feed updated', 'New posts have been loaded');
  }

  onLoadMore(): void {
    if (this.isLoadingMore || !this.hasMorePosts) {
      return;
    }

    this.isLoadingMore = true;
    
    // Simulate API call to load more posts
    setTimeout(() => {
      this.currentPage++;
      this.isLoadingMore = false;
      
      // For demo, assume we have unlimited posts
      // In real app, check if there are more posts to load
      if (this.currentPage >= 10) {
        this.hasMorePosts = false;
      }
    }, 1000);
  }

  onDismissNewPosts(): void {
    this.refreshService.dismissNewPosts();
  }

  ngOnDestroy(): void {
    this.refreshService.destroy();
  }
}
