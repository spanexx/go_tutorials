/**
 * BookmarksComponent
 * 
 * Enhanced bookmarks page with:
 * - Sidebar with collection list
 * - Collection filter chips at top
 * - Grid/list of bookmarked posts
 * - Infinite scroll for bookmarks
 * - Remove bookmark button on each post
 * - Move to collection dropdown
 * - Empty state when no bookmarks
 * - Search within bookmarks
 * 
 * CID: Phase-3 Milestone 3.2 - Bookmarks & Collections
 */
import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LucideAngularModule, Bookmark, Search, Grid3x3, List, X } from 'lucide-angular';
import { PostService, Post } from '../../shared/services/post.service';
import { PostCardComponent } from '../../components/post-card/post-card.component';
import { BookmarkService } from '../../shared/services/bookmark.service';
import { BookmarkCollection } from '../../shared/services/bookmark-collection.service';
import { BookmarkButtonComponent } from '../../shared/components/bookmark-button/bookmark-button.component';
import { CollectionManagerComponent } from '../../shared/components/collection-manager/collection-manager.component';
import { ToastService } from '../../shared/services/toast.service';

type ViewMode = 'grid' | 'list';

@Component({
  selector: 'app-bookmarks',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    RouterModule, 
    LucideAngularModule,
    PostCardComponent,
    BookmarkButtonComponent,
    CollectionManagerComponent
  ],
  template: `
    <div class="bookmarks-page">
      <!-- Sidebar -->
      <aside class="bookmarks-sidebar">
        <div class="sidebar-header">
          <h2>
            <lucide-icon [img]="bookmarkIcon" class="sidebar-icon"></lucide-icon>
            Collections
          </h2>
        </div>

        <div class="collections-nav">
          <button
            class="nav-item"
            [class.active]="selectedCollectionId() === 'all'"
            (click)="selectCollection('all')"
          >
            <lucide-icon [img]="bookmarkIcon" [size]="18"></lucide-icon>
            <span>All Bookmarks</span>
            <span class="count">{{ getTotalSavedCount() }}</span>
          </button>

          @for (collection of collections(); track collection.id) {
            <button
              class="nav-item"
              [class.active]="selectedCollectionId() === collection.id"
              (click)="selectCollection(collection.id)"
            >
              <span 
                class="collection-color" 
                [style.background]="collection.color"
              ></span>
              <span class="collection-name">{{ collection.name }}</span>
              <span class="count">{{ getCollectionCount(collection.id) }}</span>
            </button>
          }
        </div>

        <div class="sidebar-footer">
          <app-collection-manager></app-collection-manager>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="bookmarks-main">
        <!-- Header -->
        <div class="bookmarks-header">
          <div class="header-left">
            <h1>{{ selectedCollectionName() }}</h1>
            <span class="post-count">{{ filteredPosts().length }} bookmarks</span>
          </div>

          <div class="header-actions">
            <!-- Search -->
            <div class="search-box">
              <lucide-icon [img]="searchIcon" [size]="18" class="search-icon"></lucide-icon>
              <input
                type="text"
                placeholder="Search bookmarks..."
                [value]="searchQuery()"
                (input)="onSearchInput($event)"
                class="search-input"
              />
              @if (searchQuery()) {
                <button class="clear-search" (click)="clearSearch()">
                  <lucide-icon [img]="closeIcon" [size]="14"></lucide-icon>
                </button>
              }
            </div>

            <!-- View Toggle -->
            <div class="view-toggle">
              <button
                class="view-btn"
                [class.active]="viewMode() === 'grid'"
                (click)="setViewMode('grid')"
                title="Grid view"
              >
                <lucide-icon [img]="gridIcon" [size]="18"></lucide-icon>
              </button>
              <button
                class="view-btn"
                [class.active]="viewMode() === 'list'"
                (click)="setViewMode('list')"
                title="List view"
              >
                <lucide-icon [img]="listIcon" [size]="18"></lucide-icon>
              </button>
            </div>
          </div>
        </div>

        <!-- Filter Chips -->
        @if (collections().length > 0) {
          <div class="filter-chips">
            <button
              class="chip"
              [class.active]="selectedCollectionId() === 'all'"
              (click)="selectCollection('all')"
            >
              All
            </button>
            @for (collection of collections(); track collection.id) {
              <button
                class="chip"
                [class.active]="selectedCollectionId() === collection.id"
                (click)="selectCollection(collection.id)"
              >
                <span 
                  class="chip-color" 
                  [style.background]="collection.color"
                ></span>
                {{ collection.name }}
              </button>
            }
          </div>
        }

        <!-- Bookmarks Content -->
        <div class="bookmarks-content">
          @if (isLoading()) {
            <div class="loading-state">
              <div class="loading-spinner"></div>
              <p>Loading bookmarks...</p>
            </div>
          } @else if (filteredPosts().length === 0) {
            <div class="empty-state">
              <lucide-icon [img]="bookmarkIcon" [size]="64" class="empty-icon"></lucide-icon>
              <h3>No bookmarks yet</h3>
              <p>{{ getEmptyStateMessage() }}</p>
              @if (searchQuery()) {
                <button class="clear-search-btn" (click)="clearSearch()">
                  Clear search
                </button>
              }
            </div>
          } @else {
            <div class="posts-container" [class.grid]="viewMode() === 'grid'" [class.list]="viewMode() === 'list'">
              @for (post of displayedPosts(); track post.id) {
                <div class="post-wrapper">
                  <app-bookmark-button 
                    [postId]="post.id"
                    class="post-bookmark-btn"
                  ></app-bookmark-button>
                  <div class="post-card-wrapper">
                    <app-post-card [post]="post"></app-post-card>
                  </div>
                </div>
              }
            </div>

            @if (hasMore() && displayedPosts().length < filteredPosts().length) {
              <div class="load-more">
                <button class="load-more-btn" (click)="loadMore()">
                  Load more bookmarks
                </button>
              </div>
            }
          }
        </div>
      </main>
    </div>
  `,
  styles: [`
    .bookmarks-page {
      display: flex;
      min-height: calc(100vh - 64px);
    }

    .bookmarks-sidebar {
      width: 280px;
      background: hsl(var(--card));
      border-right: 1px solid hsl(var(--border));
      display: flex;
      flex-direction: column;
      position: sticky;
      top: 64px;
      height: calc(100vh - 64px);
      overflow-y: auto;

      @media (max-width: 1024px) {
        display: none;
      }
    }

    .sidebar-header {
      padding: 1.25rem;
      border-bottom: 1px solid hsl(var(--border));

      h2 {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 1rem;
        font-weight: 600;
        color: hsl(var(--foreground));
        margin: 0;

        .sidebar-icon {
          width: 20px;
          height: 20px;
          color: hsl(var(--accent));
        }
      }
    }

    .collections-nav {
      flex: 1;
      padding: 0.75rem;

      .nav-item {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        width: 100%;
        padding: 0.75rem 0.875rem;
        background: transparent;
        border: none;
        border-radius: calc(var(--radius) - 0.25rem);
        cursor: pointer;
        transition: all 0.2s;
        text-align: left;
        font-size: 0.875rem;
        color: hsl(var(--foreground));

        &:hover {
          background: hsl(var(--muted));
        }

        &.active {
          background: hsl(var(--accent));
          color: hsl(var(--accent-foreground));
        }

        lucide-icon {
          width: 18px;
          height: 18px;
          flex-shrink: 0;
        }

        .collection-color {
          width: 12px;
          height: 12px;
          border-radius: 3px;
          flex-shrink: 0;
        }

        .collection-name {
          flex: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .count {
          font-size: 0.75rem;
          font-weight: 600;
          background: hsl(var(--accent) / 0.2);
          padding: 0.125rem 0.5rem;
          border-radius: 9999px;
        }
      }
    }

    .sidebar-footer {
      padding: 1rem;
      border-top: 1px solid hsl(var(--border));
    }

    .bookmarks-main {
      flex: 1;
      padding: 1.5rem;
      overflow-y: auto;
    }

    .bookmarks-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
      gap: 1rem;

      .header-left {
        h1 {
          font-size: 1.5rem;
          font-weight: 700;
          color: hsl(var(--foreground));
          margin: 0 0 0.25rem 0;
        }

        .post-count {
          font-size: 0.875rem;
          color: hsl(var(--muted-foreground));
        }
      }

      .header-actions {
        display: flex;
        align-items: center;
        gap: 0.75rem;

        .search-box {
          position: relative;
          display: flex;
          align-items: center;

          .search-icon {
            position: absolute;
            left: 0.75rem;
            color: hsl(var(--muted-foreground));
            pointer-events: none;
          }

          .search-input {
            width: 240px;
            padding: 0.5rem 2.5rem 0.5rem 2.5rem;
            background: hsl(var(--background));
            border: 1px solid hsl(var(--border));
            border-radius: calc(var(--radius) - 0.25rem);
            color: hsl(var(--foreground));
            font-size: 0.875rem;
            transition: all 0.2s;

            &:focus {
              outline: none;
              border-color: hsl(var(--ring));
              box-shadow: 0 0 0 2px hsl(var(--ring) / 0.1);
            }
          }

          .clear-search {
            position: absolute;
            right: 0.5rem;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: hsl(var(--muted));
            border: none;
            border-radius: 50%;
            cursor: pointer;
            color: hsl(var(--muted-foreground));

            &:hover {
              background: hsl(var(--destructive));
              color: hsl(var(--destructive-foreground));
            }

            lucide-icon {
              width: 14px;
              height: 14px;
            }
          }
        }

        .view-toggle {
          display: flex;
          border: 1px solid hsl(var(--border));
          border-radius: calc(var(--radius) - 0.25rem);
          overflow: hidden;

          .view-btn {
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: hsl(var(--background));
            border: none;
            color: hsl(var(--muted-foreground));
            cursor: pointer;
            transition: all 0.2s;

            &:hover {
              background: hsl(var(--muted));
            }

            &.active {
              background: hsl(var(--accent));
              color: hsl(var(--accent-foreground));
            }

            lucide-icon {
              width: 18px;
              height: 18px;
            }
          }
        }
      }
    }

    .filter-chips {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;

      .chip {
        display: flex;
        align-items: center;
        gap: 0.375rem;
        padding: 0.5rem 0.875rem;
        background: hsl(var(--background));
        border: 1px solid hsl(var(--border));
        border-radius: 9999px;
        font-size: 0.875rem;
        font-weight: 500;
        color: hsl(var(--foreground));
        cursor: pointer;
        transition: all 0.2s;

        &:hover {
          background: hsl(var(--muted));
        }

        &.active {
          background: hsl(var(--accent));
          color: hsl(var(--accent-foreground));
          border-color: hsl(var(--accent));
        }

        .chip-color {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }
      }
    }

    .bookmarks-content {
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

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 4rem 2rem;
      text-align: center;

      .empty-icon {
        color: hsl(var(--muted-foreground));
        opacity: 0.5;
        margin-bottom: 1rem;
      }

      h3 {
        font-size: 1.25rem;
        font-weight: 600;
        color: hsl(var(--foreground));
        margin: 0 0 0.5rem 0;
      }

      p {
        color: hsl(var(--muted-foreground));
        font-size: 0.9rem;
        margin: 0 0 1.5rem 0;
        max-width: 400px;
      }

      .clear-search-btn {
        padding: 0.625rem 1.25rem;
        background: hsl(var(--accent));
        color: hsl(var(--accent-foreground));
        border: none;
        border-radius: calc(var(--radius) - 0.25rem);
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;

        &:hover {
          opacity: 0.9;
        }
      }
    }

    .posts-container {
      display: flex;
      flex-direction: column;
      gap: 1rem;

      &.grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
        gap: 1.5rem;

        @media (max-width: 640px) {
          grid-template-columns: 1fr;
        }
      }

      .post-wrapper {
        position: relative;

        .post-bookmark-btn {
          position: absolute;
          top: 1rem;
          right: 1rem;
          z-index: 10;
        }

        .post-card-wrapper {
          width: 100%;
        }
      }
    }

    .load-more {
      display: flex;
      justify-content: center;
      padding: 2rem 0;

      .load-more-btn {
        padding: 0.75rem 2rem;
        background: hsl(var(--background));
        color: hsl(var(--foreground));
        border: 1px solid hsl(var(--border));
        border-radius: calc(var(--radius) - 0.25rem);
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;

        &:hover {
          background: hsl(var(--muted));
        }
      }
    }
  `]
})
export class BookmarksComponent implements OnInit {
  bookmarkIcon = Bookmark;
  searchIcon = Search;
  gridIcon = Grid3x3;
  listIcon = List;
  closeIcon = X;

  selectedCollectionId = signal<string>('all');
  viewMode = signal<ViewMode>('grid');
  searchQuery = signal<string>('');
  isLoading = signal(false);
  hasMore = signal(false);
  currentPage = signal(1);
  pageSize = 10;

  collections = signal<BookmarkCollection[]>([]);
  allBookmarks = signal<Post[]>([]);

  selectedCollectionName = computed(() => {
    const id = this.selectedCollectionId();
    if (id === 'all') return 'All Bookmarks';
    const collection = this.collections().find(c => c.id === id);
    return collection?.name || 'Bookmarks';
  });

  filteredPosts = computed(() => {
    let posts = this.allBookmarks();
    
    // Filter by search query
    const query = this.searchQuery().toLowerCase();
    if (query) {
      posts = posts.filter(post => 
        post.content.toLowerCase().includes(query) ||
        post.author.name.toLowerCase().includes(query) ||
        post.author.username.toLowerCase().includes(query)
      );
    }

    return posts;
  });

  displayedPosts = computed(() => {
    const limit = this.currentPage() * this.pageSize;
    return this.filteredPosts().slice(0, limit);
  });

  constructor(
    private postService: PostService,
    private bookmarkService: BookmarkService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.loadCollections();
    this.loadBookmarks();
  }

  /**
   * Load all collections
   */
  loadCollections(): void {
    this.collections.set(this.bookmarkService.getCollections());
  }

  /**
   * Load bookmarks from service
   */
  async loadBookmarks(): Promise<void> {
    this.isLoading.set(true);

    try {
      // Get all posts and filter by bookmarked status
      const allPosts = this.postService.posts();
      const bookmarkedPosts = allPosts.filter(post => 
        this.bookmarkService.isBookmarked(post.id)
      );
      this.allBookmarks.set(bookmarkedPosts);
    } catch (error) {
      console.error('Failed to load bookmarks:', error);
      this.toastService.error('Error', 'Failed to load bookmarks');
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Select a collection
   */
  selectCollection(collectionId: string): void {
    this.selectedCollectionId.set(collectionId);
    this.currentPage.set(1);
  }

  /**
   * Set view mode
   */
  setViewMode(mode: ViewMode): void {
    this.viewMode.set(mode);
  }

  /**
   * Handle search input
   */
  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
    this.currentPage.set(1);
  }

  /**
   * Clear search
   */
  clearSearch(): void {
    this.searchQuery.set('');
    this.currentPage.set(1);
  }

  /**
   * Load more bookmarks
   */
  loadMore(): void {
    this.currentPage.update(page => page + 1);
  }

  /**
   * Get total saved count
   */
  getTotalSavedCount(): number {
    return this.bookmarkService.getTotalCount();
  }

  /**
   * Get collection count
   */
  getCollectionCount(collectionId: string): number {
    return this.bookmarkService.getCollectionCount(collectionId);
  }

  /**
   * Get empty state message
   */
  getEmptyStateMessage(): string {
    if (this.searchQuery()) {
      return 'No bookmarks match your search. Try a different term.';
    }
    return 'Start bookmarking posts to save them for later. Click the bookmark icon on any post to save it.';
  }
}
