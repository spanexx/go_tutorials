/**
 * SearchResultsPageComponent
 * 
 * Dedicated search results page with:
 * - Route: /search?q=query
 * - Tabs: All, Posts, Users, Hashtags
 * - All tab shows mixed results by relevance
 * - Posts tab with post cards
 * - Users tab with user list
 * - Hashtags tab with hashtag tiles
 * - Filter by time (optional)
 * - Sort options (relevance, recent)
 * - Empty state when no results
 * 
 * CID: Phase-3 Milestone 3.3 - Search & Explore
 */
import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { LucideAngularModule, Search, Filter, Clock, TrendingUp, User, Hash, FileText, ArrowUpDown, X } from 'lucide-angular';
import { SearchService, SearchItem, SearchUser, SearchHashtag } from '../../shared/services/search.service';
import { PostCardComponent } from '../../components/post-card/post-card.component';
import { PostService, Post } from '../../shared/services/post.service';

type SearchTab = 'all' | 'posts' | 'users' | 'hashtags';
type SortOption = 'relevance' | 'recent';
type TimeFilter = 'any' | 'day' | 'week' | 'month' | 'year';

@Component({
  selector: 'app-search-results',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule, PostCardComponent],
  template: `
    <div class="search-results-page">
      <!-- Search Header -->
      <div class="search-header">
        <div class="search-box">
          <lucide-icon [img]="searchIcon" class="search-icon"></lucide-icon>
          <input
            type="text"
            class="search-input"
            placeholder="Search posts, people, or hashtags..."
            [value]="query()"
            (input)="onQueryChange($event)"
            (keydown.enter)="performSearch()"
          />
          @if (query()) {
            <button class="clear-btn" (click)="clearSearch()" type="button">
              <lucide-icon [img]="closeIcon" [size]="16"></lucide-icon>
            </button>
          }
        </div>
      </div>

      <!-- Tabs and Filters -->
      <div class="search-controls">
        <div class="tabs">
          <button
            class="tab"
            [class.active]="activeTab() === 'all'"
            (click)="setTab('all')"
          >
            All
            @if (totalCount() > 0) {
              <span class="tab-count">{{ totalCount() }}</span>
            }
          </button>
          <button
            class="tab"
            [class.active]="activeTab() === 'posts'"
            (click)="setTab('posts')"
          >
            <lucide-icon [img]="fileIcon" [size]="16"></lucide-icon>
            Posts
            @if (postsCount() > 0) {
              <span class="tab-count">{{ postsCount() }}</span>
            }
          </button>
          <button
            class="tab"
            [class.active]="activeTab() === 'users'"
            (click)="setTab('users')"
          >
            <lucide-icon [img]="userIcon" [size]="16"></lucide-icon>
            Users
            @if (usersCount() > 0) {
              <span class="tab-count">{{ usersCount() }}</span>
            }
          </button>
          <button
            class="tab"
            [class.active]="activeTab() === 'hashtags'"
            (click)="setTab('hashtags')"
          >
            <lucide-icon [img]="hashIcon" [size]="16"></lucide-icon>
            Hashtags
            @if (hashtagsCount() > 0) {
              <span class="tab-count">{{ hashtagsCount() }}</span>
            }
          </button>
        </div>

        <div class="filters">
          <div class="filter-group">
            <lucide-icon [img]="clockIcon" [size]="14"></lucide-icon>
            <select [value]="timeFilter()" (change)="onTimeFilterChange($event)">
              <option value="any">Any time</option>
              <option value="day">Past 24 hours</option>
              <option value="week">Past week</option>
              <option value="month">Past month</option>
              <option value="year">Past year</option>
            </select>
          </div>

          <div class="filter-group">
            <lucide-icon [img]="sortIcon" [size]="14"></lucide-icon>
            <select [value]="sortOption()" (change)="onSortChange($event)">
              <option value="relevance">Relevance</option>
              <option value="recent">Most Recent</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Results Content -->
      <div class="results-content">
        @if (isLoading()) {
          <div class="loading-state">
            <div class="loading-spinner"></div>
            <p>Searching...</p>
          </div>
        } @else if (hasSearched() && !hasResults()) {
          <div class="empty-state">
            <lucide-icon [img]="searchIcon" [size]="64" class="empty-icon"></lucide-icon>
            <h2>No results found</h2>
            <p>We couldn't find anything matching "<strong>{{ query() }}</strong>"</p>
            <div class="empty-tips">
              <p>Try different keywords or check your spelling</p>
              <p>Use fewer keywords for broader results</p>
            </div>
          </div>
        } @else if (hasResults()) {
          @switch (activeTab()) {
            @case ('all') {
              <div class="all-results">
                @if (groupedResults().users.length > 0) {
                  <section class="results-section">
                    <div class="section-header">
                      <lucide-icon [img]="userIcon" [size]="18"></lucide-icon>
                      <h3>Users</h3>
                    </div>
                    <div class="users-list">
                      @for (user of groupedResults().users; track $any(user.item).id) {
                        <a [routerLink]="['/profile', $any(user.item).username]" class="user-card">
                          <img [src]="$any(user.item).avatar_url" class="user-avatar" />
                          <div class="user-info">
                            <span class="user-name">{{ $any(user.item).display_name }}</span>
                            <span class="user-handle">&#64;{{ $any(user.item).username }}</span>
                          </div>
                          <span class="user-followers">{{ $any(user.item).followers | number }} followers</span>
                        </a>
                      }
                    </div>
                  </section>
                }

                @if (groupedResults().hashtags.length > 0) {
                  <section class="results-section">
                    <div class="section-header">
                      <lucide-icon [img]="hashIcon" [size]="18"></lucide-icon>
                      <h3>Hashtags</h3>
                    </div>
                    <div class="hashtags-list">
                      @for (hashtag of groupedResults().hashtags; track $any(hashtag.item).tag) {
                        <a [routerLink]="['/hashtag', $any(hashtag.item).tag]" class="hashtag-card">
                          <span class="hashtag-tag">#{{ $any(hashtag.item).tag }}</span>
                          <span class="hashtag-count">{{ $any(hashtag.item).count | number }} posts</span>
                        </a>
                      }
                    </div>
                  </section>
                }

                @if (groupedResults().posts.length > 0) {
                  <section class="results-section">
                    <div class="section-header">
                      <lucide-icon [img]="fileIcon" [size]="18"></lucide-icon>
                      <h3>Posts</h3>
                    </div>
                    <div class="posts-grid">
                      @for (postItem of groupedResults().posts; track $any(postItem.item).id) {
                        <app-post-card [post]="postItem.item"></app-post-card>
                      }
                    </div>
                  </section>
                }
              </div>
            }

            @case ('posts') {
              <div class="posts-list">
                @for (postItem of filteredPosts(); track $any(postItem.item).id) {
                  <app-post-card [post]="postItem.item"></app-post-card>
                }
                @if (filteredPosts().length === 0) {
                  <div class="empty-tab-state">
                    <p>No posts found</p>
                  </div>
                }
              </div>
            }

            @case ('users') {
              <div class="users-list-full">
                @for (userItem of filteredUsers(); track $any(userItem.item).id) {
                  <a [routerLink]="['/profile', $any(userItem.item).username]" class="user-card-full">
                    <img [src]="$any(userItem.item).avatar_url" class="user-avatar-full" />
                    <div class="user-info-full">
                      <span class="user-name-full">{{ $any(userItem.item).display_name }}</span>
                      <span class="user-handle-full">&#64;{{ $any(userItem.item).username }}</span>
                      @if ($any(userItem.item).bio) {
                        <span class="user-bio">{{ $any(userItem.item).bio }}</span>
                      }
                    </div>
                    <span class="user-followers-full">{{ $any(userItem.item).followers | number }} followers</span>
                  </a>
                }
                @if (filteredUsers().length === 0) {
                  <div class="empty-tab-state">
                    <p>No users found</p>
                  </div>
                }
              </div>
            }

            @case ('hashtags') {
              <div class="hashtags-grid">
                @for (hashtagItem of filteredHashtags(); track $any(hashtagItem.item).tag) {
                  <a [routerLink]="['/hashtag', $any(hashtagItem.item).tag]" class="hashtag-tile">
                    <div class="hashtag-info">
                      <span class="hashtag-name">#{{ $any(hashtagItem.item).tag }}</span>
                      <span class="hashtag-posts">{{ $any(hashtagItem.item).count | number }} posts</span>
                    </div>
                    <lucide-icon [img]="trendingIcon" [size]="20" class="hashtag-trending"></lucide-icon>
                  </a>
                }
                @if (filteredHashtags().length === 0) {
                  <div class="empty-tab-state">
                    <p>No hashtags found</p>
                  </div>
                }
              </div>
            }
          }
        } @else {
          <div class="initial-state">
            <lucide-icon [img]="searchIcon" [size]="64" class="initial-icon"></lucide-icon>
            <h2>Search for content</h2>
            <p>Enter a search term to find posts, users, and hashtags</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .search-results-page {
      max-width: 1000px;
      margin: 0 auto;
      padding: 1.5rem;
      min-height: calc(100vh - 64px);
    }

    .search-header {
      margin-bottom: 1.5rem;

      .search-box {
        position: relative;
        max-width: 600px;
        margin: 0 auto;
      }

      .search-icon {
        position: absolute;
        left: 1rem;
        top: 50%;
        transform: translateY(-50%);
        width: 20px;
        height: 20px;
        color: hsl(var(--muted-foreground));
        pointer-events: none;
      }

      .search-input {
        width: 100%;
        padding: 0.75rem 3rem 0.75rem 3rem;
        background: hsl(var(--background));
        border: 1px solid hsl(var(--border));
        border-radius: var(--radius);
        color: hsl(var(--foreground));
        font-size: 1rem;
        transition: all 0.2s;

        &:focus {
          outline: none;
          border-color: hsl(var(--ring));
          box-shadow: 0 0 0 2px hsl(var(--ring) / 0.1);
        }

        &::placeholder {
          color: hsl(var(--muted-foreground));
        }
      }

      .clear-btn {
        position: absolute;
        right: 0.75rem;
        top: 50%;
        transform: translateY(-50%);
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: hsl(var(--muted));
        border: none;
        border-radius: 50%;
        cursor: pointer;
        color: hsl(var(--muted-foreground));
        transition: all 0.2s;

        &:hover {
          background: hsl(var(--destructive));
          color: hsl(var(--destructive-foreground));
        }
      }
    }

    .search-controls {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.5rem;
      gap: 1rem;
      flex-wrap: wrap;

      .tabs {
        display: flex;
        gap: 0.25rem;
        background: hsl(var(--muted));
        padding: 0.25rem;
        border-radius: calc(var(--radius) - 0.25rem);

        .tab {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.5rem 0.875rem;
          background: transparent;
          border: none;
          border-radius: calc(var(--radius) - 0.25rem);
          color: hsl(var(--muted-foreground));
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;

          &:hover {
            color: hsl(var(--foreground));
          }

          &.active {
            background: hsl(var(--background));
            color: hsl(var(--foreground));
            box-shadow: 0 1px 2px hsl(var(--shadow) / 0.1);
          }

          .tab-count {
            background: hsl(var(--muted));
            padding: 0.125rem 0.375rem;
            border-radius: 9999px;
            font-size: 0.7rem;
            font-weight: 600;
          }

          lucide-icon {
            width: 16px;
            height: 16px;
          }
        }
      }

      .filters {
        display: flex;
        gap: 0.75rem;

        .filter-group {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.375rem 0.625rem;
          background: hsl(var(--background));
          border: 1px solid hsl(var(--border));
          border-radius: calc(var(--radius) - 0.25rem);
          font-size: 0.875rem;
          color: hsl(var(--foreground));

          lucide-icon {
            width: 14px;
            height: 14px;
            color: hsl(var(--muted-foreground));
          }

          select {
            background: transparent;
            border: none;
            color: inherit;
            font-size: inherit;
            cursor: pointer;
            outline: none;
          }
        }
      }
    }

    .results-content {
      min-height: 400px;
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 4rem 2rem;
      text-align: center;

      .loading-spinner {
        width: 48px;
        height: 48px;
        border: 3px solid hsl(var(--border));
        border-top-color: hsl(var(--accent));
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      p {
        margin-top: 1rem;
        color: hsl(var(--muted-foreground));
        font-size: 0.9rem;
      }
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    .empty-state, .initial-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 4rem 2rem;
      text-align: center;

      .empty-icon, .initial-icon {
        color: hsl(var(--muted-foreground));
        opacity: 0.5;
        margin-bottom: 1rem;
      }

      h2 {
        font-size: 1.25rem;
        font-weight: 600;
        color: hsl(var(--foreground));
        margin: 0 0 0.5rem 0;
      }

      p {
        color: hsl(var(--muted-foreground));
        font-size: 0.9rem;
        margin: 0 0 1.5rem 0;

        strong {
          color: hsl(var(--foreground));
        }
      }

      .empty-tips {
        background: hsl(var(--muted) / 0.3);
        padding: 1rem 1.5rem;
        border-radius: var(--radius);
        text-align: left;

        p {
          margin: 0.25rem 0;
          font-size: 0.875rem;

          &:first-child {
            margin-top: 0;
          }

          &:last-child {
            margin-bottom: 0;
          }
        }
      }
    }

    .all-results {
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    .results-section {
      .section-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 1rem;
        padding-bottom: 0.5rem;
        border-bottom: 1px solid hsl(var(--border));

        lucide-icon {
          width: 18px;
          height: 18px;
          color: hsl(var(--accent));
        }

        h3 {
          font-size: 1rem;
          font-weight: 600;
          color: hsl(var(--foreground));
          margin: 0;
        }
      }
    }

    .users-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;

      .user-card {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem;
        background: hsl(var(--card));
        border: 1px solid hsl(var(--border));
        border-radius: var(--radius);
        text-decoration: none;
        color: inherit;
        transition: all 0.2s;

        &:hover {
          background: hsl(var(--muted));
          border-color: hsl(var(--ring));
        }

        .user-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          object-fit: cover;
        }

        .user-info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 0.125rem;

          .user-name {
            font-weight: 600;
            color: hsl(var(--foreground));
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .user-handle {
            font-size: 0.875rem;
            color: hsl(var(--muted-foreground));
          }
        }

        .user-followers {
          font-size: 0.75rem;
          color: hsl(var(--muted-foreground));
          white-space: nowrap;
        }
      }
    }

    .hashtags-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;

      .hashtag-card {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 0.875rem;
        background: hsl(var(--card));
        border: 1px solid hsl(var(--border));
        border-radius: calc(var(--radius) - 0.25rem);
        text-decoration: none;
        color: inherit;
        transition: all 0.2s;

        &:hover {
          background: hsl(var(--accent));
          color: hsl(var(--accent-foreground));
          border-color: hsl(var(--accent));
        }

        .hashtag-tag {
          font-weight: 500;
        }

        .hashtag-count {
          font-size: 0.75rem;
          color: hsl(var(--muted-foreground));
        }
      }
    }

    .posts-grid {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .posts-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .users-list-full {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;

      .user-card-full {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1rem;
        background: hsl(var(--card));
        border: 1px solid hsl(var(--border));
        border-radius: var(--radius);
        text-decoration: none;
        color: inherit;
        transition: all 0.2s;

        &:hover {
          background: hsl(var(--muted));
          border-color: hsl(var(--ring));
        }

        .user-avatar-full {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          object-fit: cover;
        }

        .user-info-full {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;

          .user-name-full {
            font-weight: 600;
            color: hsl(var(--foreground));
          }

          .user-handle-full {
            font-size: 0.875rem;
            color: hsl(var(--muted-foreground));
          }

          .user-bio {
            font-size: 0.875rem;
            color: hsl(var(--muted-foreground));
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
          }
        }

        .user-followers-full {
          font-size: 0.75rem;
          color: hsl(var(--muted-foreground));
          white-space: nowrap;
        }
      }
    }

    .hashtags-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 0.75rem;

      .hashtag-tile {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1rem;
        background: hsl(var(--card));
        border: 1px solid hsl(var(--border));
        border-radius: var(--radius);
        text-decoration: none;
        color: inherit;
        transition: all 0.2s;

        &:hover {
          background: hsl(var(--muted));
          border-color: hsl(var(--ring));
        }

        .hashtag-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;

          .hashtag-name {
            font-weight: 600;
            color: hsl(var(--foreground));
          }

          .hashtag-posts {
            font-size: 0.875rem;
            color: hsl(var(--muted-foreground));
          }
        }

        .hashtag-trending {
          color: hsl(var(--accent));
        }
      }
    }

    .empty-tab-state {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 3rem;
      color: hsl(var(--muted-foreground));
      font-size: 0.9rem;
    }
  `]
})
export class SearchResultsPageComponent implements OnInit {
  searchIcon = Search;
  closeIcon = X;
  clockIcon = Clock;
  trendingIcon = TrendingUp;
  userIcon = User;
  hashIcon = Hash;
  fileIcon = FileText;
  sortIcon = ArrowUpDown;

  query = signal<string>('');
  activeTab = signal<SearchTab>('all');
  sortOption = signal<SortOption>('relevance');
  timeFilter = signal<TimeFilter>('any');
  isLoading = signal(false);
  hasSearched = signal(false);

  allResults = signal<SearchItem[]>([]);

  totalCount = computed(() => this.allResults().length);
  postsCount = computed(() => this.allResults().filter(r => r.type === 'post').length);
  usersCount = computed(() => this.allResults().filter(r => r.type === 'user').length);
  hashtagsCount = computed(() => this.allResults().filter(r => r.type === 'hashtag').length);

  hasResults = computed(() => this.allResults().length > 0);

  groupedResults = computed(() => {
    const results = this.allResults();
    return {
      posts: results.filter(r => r.type === 'post'),
      users: results.filter(r => r.type === 'user'),
      hashtags: results.filter(r => r.type === 'hashtag')
    };
  });

  filteredPosts = computed(() => {
    const results = this.allResults().filter(r => r.type === 'post');
    return this.sortResults(results, this.sortOption());
  });

  filteredUsers = computed(() => {
    const results = this.allResults().filter(r => r.type === 'user');
    return this.sortResults(results, this.sortOption());
  });

  filteredHashtags = computed(() => {
    const results = this.allResults().filter(r => r.type === 'hashtag');
    return this.sortResults(results, this.sortOption());
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private searchService: SearchService,
    private postService: PostService
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      const q = params['q'];
      if (q) {
        this.query.set(q);
        this.performSearch();
      }
    });
  }

  /**
   * Handle query change
   */
  onQueryChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.query.set(input.value);
  }

  /**
   * Perform search
   */
  performSearch(): void {
    const q = this.query().trim();
    if (!q) return;

    this.isLoading.set(true);
    this.hasSearched.set(true);

    // Use search service to get results
    const results = this.searchService.searchAll(q, 20);
    this.allResults.set(results);
    this.isLoading.set(false);

    // Update URL with query
    this.router.navigate([], {
      queryParams: { q },
      queryParamsHandling: 'merge'
    });
  }

  /**
   * Clear search
   */
  clearSearch(): void {
    this.query.set('');
    this.allResults.set([]);
    this.hasSearched.set(false);
    this.router.navigate([], {
      queryParams: { q: null },
      queryParamsHandling: 'merge'
    });
  }

  /**
   * Set active tab
   */
  setTab(tab: SearchTab): void {
    this.activeTab.set(tab);
  }

  /**
   * Handle time filter change
   */
  onTimeFilterChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.timeFilter.set(select.value as TimeFilter);
    // In a real app, this would filter results by time
  }

  /**
   * Handle sort change
   */
  onSortChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.sortOption.set(select.value as SortOption);
  }

  /**
   * Sort results
   */
  private sortResults(results: SearchItem[], sort: SortOption): SearchItem[] {
    if (sort === 'relevance') {
      return [...results].sort((a, b) => b.relevanceScore - a.relevanceScore);
    }
    // For 'recent', would sort by date (not implemented in mock data)
    return results;
  }
}
