import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LucideAngularModule, Search, TrendingUp, Users, Hash, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-angular';
import { ExploreService, TrendingTopic, SuggestedUser, ExploreCategory } from '../../shared/services/explore.service';
import { ActivityFeedComponent } from '../../shared/activity-feed/activity-feed.component';
import { PostService } from '../../shared/services/post.service';

@Component({
  selector: 'app-explore',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule, ActivityFeedComponent],
  templateUrl: './explore.component.html',
  styleUrls: ['./explore.component.scss']
})
export class ExploreComponent implements OnInit {
  searchIcon = Search;
  trendingIcon = TrendingUp;
  usersIcon = Users;
  hashtagIcon = Hash;
  refreshIcon = RefreshCw;
  chevronLeft = ChevronLeft;
  chevronRight = ChevronRight;

  selectedCategory = signal<string>('all');
  searchQuery = signal<string>('');
  isLoading = signal(false);
  currentSlide = signal(0);
  displayedTopics = signal<TrendingTopic[]>([]);
  hasMore = signal(true);
  page = signal(1);
  readonly pageSize = 8;

  constructor(
    public exploreService: ExploreService,
    private postService: PostService
  ) {}

  ngOnInit(): void {
    this.loadInitialTopics();
    this.startAutoSlide();
  }

  get categories(): ExploreCategory[] {
    return this.exploreService.categories();
  }

  get trendingTopics(): TrendingTopic[] {
    if (this.searchQuery().trim()) {
      return this.exploreService.searchTopics(this.searchQuery());
    }
    return this.displayedTopics();
  }

  get suggestedUsers(): SuggestedUser[] {
    return this.exploreService.suggestedUsers().slice(0, 5);
  }

  get topTrending(): TrendingTopic[] {
    return this.exploreService.getTopTrending(6);
  }

  get featuredTopics(): TrendingTopic[] {
    return this.exploreService.getTopTrending(4);
  }

  get hasMultipleSlides(): boolean {
    return this.featuredTopics.length > 3;
  }

  selectCategory(categoryId: string): void {
    this.selectedCategory.set(categoryId);
    this.loadInitialTopics();
  }

  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  toggleFollow(username: string): void {
    this.exploreService.toggleFollow(username);
  }

  formatPostCount(count: number): string {
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1) + 'M';
    }
    if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'K';
    }
    return count.toString();
  }

  formatFollowers(count: number): string {
    if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'K';
    }
    return count.toString();
  }

  getCategoryName(categoryId: string): string {
    const category = this.categories.find(c => c.id === categoryId);
    return category?.name || categoryId;
  }

  /**
   * Load initial topics
   */
  loadInitialTopics(): void {
    const allTopics = this.exploreService.getTrendingByCategory(this.selectedCategory());
    this.displayedTopics.set(allTopics.slice(0, this.pageSize));
    this.hasMore.set(allTopics.length > this.pageSize);
    this.page.set(1);
  }

  /**
   * Refresh content
   */
  async refreshContent(): Promise<void> {
    this.isLoading.set(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));

    this.loadInitialTopics();
    this.currentSlide.set(0);
    this.isLoading.set(false);
  }

  /**
   * Load more topics (infinite scroll)
   */
  loadMore(): void {
    if (!this.hasMore()) return;

    const allTopics = this.exploreService.getTrendingByCategory(this.selectedCategory());
    const nextPage = this.page() + 1;
    const start = 0;
    const end = nextPage * this.pageSize;

    this.displayedTopics.set(allTopics.slice(start, end));
    this.page.set(nextPage);
    this.hasMore.set(end < allTopics.length);
  }

  /**
   * Featured carousel navigation
   */
  nextSlide(): void {
    if (this.hasMultipleSlides) {
      this.currentSlide.update(s => (s + 1) % (this.featuredTopics.length - 2));
    }
  }

  prevSlide(): void {
    if (this.hasMultipleSlides && this.currentSlide() > 0) {
      this.currentSlide.update(s => s - 1);
    }
  }

  goToSlide(index: number): void {
    this.currentSlide.set(index);
  }

  /**
   * Auto-slide for featured carousel
   */
  private startAutoSlide(): void {
    setInterval(() => {
      if (this.hasMultipleSlides) {
        this.nextSlide();
      }
    }, 5000);
  }
}
