/**
 * CollectionDetailComponent
 * 
 * Dedicated view for individual bookmark collections with:
 * - Route: /bookmarks/collection/:id
 * - Collection header with name, color, count
 * - Posts filtered to collection
 * - Edit collection button
 * - Delete collection button
 * - Back to all bookmarks link
 * - Empty state for empty collection
 * 
 * CID: Phase-3 Milestone 3.2 - Bookmarks & Collections
 */
import { Component, signal, computed, OnInit, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { LucideAngularModule, ArrowLeft, Edit2, Trash2, Bookmark, Grid3x3, List, Search, X } from 'lucide-angular';
import { PostService, Post } from '../../../shared/services/post.service';
import { PostCardComponent } from '../../../components/post-card/post-card.component';
import { BookmarkService } from '../../../shared/services/bookmark.service';
import { BookmarkCollection } from '../../../shared/services/bookmark-collection.service';
import { BookmarkButtonComponent } from '../../../shared/components/bookmark-button/bookmark-button.component';
import { ToastService } from '../../../shared/services/toast.service';

type ViewMode = 'grid' | 'list';

@Component({
  selector: 'app-collection-detail',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    LucideAngularModule,
    PostCardComponent,
    BookmarkButtonComponent
  ],
  template: `
    @if (isLoading()) {
      <div class="loading-container">
        <div class="loading-spinner"></div>
        <p>Loading collection...</p>
      </div>
    } @else if (error()) {
      <div class="error-container">
        <h2>Collection Not Found</h2>
        <p>{{ error() }}</p>
        <button class="back-btn" (click)="goBack()">
          <lucide-icon [img]="backIcon" [size]="16"></lucide-icon>
          Back to Bookmarks
        </button>
      </div>
    } @else if (collection()) {
      <div class="collection-detail-page">
        <!-- Collection Header -->
        <header class="collection-header">
          <div class="header-left">
            <button class="back-button" (click)="goBack()" title="Back to bookmarks">
              <lucide-icon [img]="backIcon" [size]="20"></lucide-icon>
            </button>
            
            <div class="collection-info">
              <span 
                class="collection-color-indicator" 
                [style.background]="collection()?.color"
              ></span>
              <h1>{{ collection()?.name }}</h1>
              <span class="post-count">{{ filteredPosts().length }} bookmarks</span>
            </div>
          </div>

          <div class="header-actions">
            <button class="action-btn edit" (click)="editCollection()" title="Edit collection">
              <lucide-icon [img]="editIcon" [size]="18"></lucide-icon>
              <span>Edit</span>
            </button>
            @if (!collection()?.isDefault) {
              <button class="action-btn delete" (click)="confirmDelete()" title="Delete collection">
                <lucide-icon [img]="trashIcon" [size]="18"></lucide-icon>
                <span>Delete</span>
              </button>
            }
          </div>
        </header>

        <!-- Toolbar -->
        <div class="collection-toolbar">
          <!-- Search -->
          <div class="search-box">
            <lucide-icon [img]="searchIcon" [size]="18" class="search-icon"></lucide-icon>
            <input
              type="text"
              placeholder="Search in collection..."
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

        <!-- Posts Grid/List -->
        <div class="posts-container" [class.grid]="viewMode() === 'grid'" [class.list]="viewMode() === 'list'">
          @if (filteredPosts().length === 0) {
            <div class="empty-state">
              <lucide-icon [img]="bookmarkIcon" [size]="64" class="empty-icon"></lucide-icon>
              <h3>No bookmarks in this collection</h3>
              @if (searchQuery()) {
                <p>No posts match your search. Try a different term.</p>
                <button class="clear-search-btn" (click)="clearSearch()">
                  Clear search
                </button>
              } @else {
                <p>Bookmark posts to save them to this collection.</p>
                <a routerLink="/feed" class="browse-feed-btn">
                  Browse Feed
                </a>
              }
            </div>
          } @else {
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
          }
        </div>

        <!-- Load More -->
        @if (hasMore() && displayedPosts().length < filteredPosts().length) {
          <div class="load-more">
            <button class="load-more-btn" (click)="loadMore()">
              Load more bookmarks
            </button>
          </div>
        }
      </div>

      <!-- Delete Confirmation Modal -->
      @if (showDeleteConfirm()) {
        <div class="modal-overlay" (click)="cancelDelete()">
          <div class="modal-content" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h2>Delete Collection</h2>
              <button class="modal-close" (click)="cancelDelete()">
                <lucide-icon [img]="closeIcon" [size]="20"></lucide-icon>
              </button>
            </div>

            <div class="modal-body">
              <p>Are you sure you want to delete "<strong>{{ collection()?.name }}</strong>"?</p>
              <p class="warning">All bookmarks in this collection will be moved to "All Bookmarks".</p>
            </div>

            <div class="modal-actions">
              <button class="cancel-btn" (click)="cancelDelete()">Cancel</button>
              <button class="delete-confirm-btn" (click)="deleteCollection()">
                <lucide-icon [img]="trashIcon" [size]="16"></lucide-icon>
                Delete Collection
              </button>
            </div>
          </div>
        </div>
      }
    }
  `,
  styles: [`
    .loading-container, .error-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 400px;
      padding: 2rem;
      text-align: center;

      .loading-spinner {
        width: 48px;
        height: 48px;
        border: 3px solid hsl(var(--border));
        border-top-color: hsl(var(--accent));
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      h2 {
        font-size: 1.25rem;
        font-weight: 600;
        color: hsl(var(--foreground));
        margin: 1rem 0 0.5rem 0;
      }

      p {
        color: hsl(var(--muted-foreground));
        font-size: 0.9rem;
        margin: 0 0 1.5rem 0;
      }

      .back-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
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

        lucide-icon {
          width: 16px;
          height: 16px;
        }
      }
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    .collection-detail-page {
      max-width: 1200px;
      margin: 0 auto;
      padding: 1.5rem;
    }

    .collection-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.5rem;
      background: hsl(var(--card));
      border: 1px solid hsl(var(--border));
      border-radius: var(--radius);
      margin-bottom: 1.5rem;

      .header-left {
        display: flex;
        align-items: center;
        gap: 1rem;

        .back-button {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: hsl(var(--background));
          border: 1px solid hsl(var(--border));
          border-radius: calc(var(--radius) - 0.25rem);
          cursor: pointer;
          color: hsl(var(--foreground));
          transition: all 0.2s;

          &:hover {
            background: hsl(var(--accent));
            color: hsl(var(--accent-foreground));
            border-color: hsl(var(--accent));
          }

          lucide-icon {
            width: 20px;
            height: 20px;
          }
        }

        .collection-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;

          .collection-color-indicator {
            width: 16px;
            height: 16px;
            border-radius: 4px;
            flex-shrink: 0;
          }

          h1 {
            font-size: 1.5rem;
            font-weight: 700;
            color: hsl(var(--foreground));
            margin: 0;
          }

          .post-count {
            font-size: 0.875rem;
            color: hsl(var(--muted-foreground));
            background: hsl(var(--muted));
            padding: 0.25rem 0.75rem;
            border-radius: 9999px;
          }
        }
      }

      .header-actions {
        display: flex;
        gap: 0.5rem;

        .action-btn {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.625rem 1rem;
          border: 1px solid hsl(var(--border));
          border-radius: calc(var(--radius) - 0.25rem);
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          background: hsl(var(--background));
          color: hsl(var(--foreground));

          &.edit {
            &:hover {
              background: hsl(var(--accent));
              color: hsl(var(--accent-foreground));
              border-color: hsl(var(--accent));
            }
          }

          &.delete {
            color: hsl(var(--destructive));

            &:hover {
              background: hsl(var(--destructive));
              color: hsl(var(--destructive-foreground));
              border-color: hsl(var(--destructive));
            }
          }

          lucide-icon {
            width: 18px;
            height: 18px;
          }
        }
      }
    }

    .collection-toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.5rem;
      gap: 1rem;

      .search-box {
        position: relative;
        flex: 1;
        max-width: 400px;

        .search-icon {
          position: absolute;
          left: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          color: hsl(var(--muted-foreground));
          pointer-events: none;
        }

        .search-input {
          width: 100%;
          padding: 0.625rem 2.5rem 0.625rem 2.5rem;
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
          top: 50%;
          transform: translateY(-50%);
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

    .empty-state {
      grid-column: 1 / -1;
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
      }

      .clear-search-btn, .browse-feed-btn {
        padding: 0.625rem 1.25rem;
        background: hsl(var(--accent));
        color: hsl(var(--accent-foreground));
        border: none;
        border-radius: calc(var(--radius) - 0.25rem);
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        text-decoration: none;

        &:hover {
          opacity: 0.9;
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

    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.15s ease;

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      .modal-content {
        background: hsl(var(--card));
        border: 1px solid hsl(var(--border));
        border-radius: var(--radius);
        width: 100%;
        max-width: 400px;
        box-shadow: 0 8px 32px hsl(var(--shadow) / 0.15);
        overflow: hidden;

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.25rem;
          border-bottom: 1px solid hsl(var(--border));

          h2 {
            font-size: 1rem;
            font-weight: 600;
            color: hsl(var(--foreground));
            margin: 0;
          }

          .modal-close {
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: transparent;
            border: none;
            border-radius: calc(var(--radius) - 0.25rem);
            cursor: pointer;
            color: hsl(var(--muted-foreground));
            transition: all 0.2s;

            &:hover {
              background: hsl(var(--muted));
              color: hsl(var(--foreground));
            }

            lucide-icon {
              width: 20px;
              height: 20px;
            }
          }
        }

        .modal-body {
          padding: 1.25rem;

          p {
            color: hsl(var(--foreground));
            font-size: 0.9rem;
            margin: 0 0 0.75rem 0;
            line-height: 1.5;

            strong {
              color: hsl(var(--accent));
            }
          }

          .warning {
            color: hsl(var(--destructive));
            font-size: 0.875rem;
          }
        }

        .modal-actions {
          display: flex;
          gap: 0.75rem;
          padding: 1rem 1.25rem;
          border-top: 1px solid hsl(var(--border));
          background: hsl(var(--muted) / 0.3);

          .cancel-btn {
            flex: 1;
            padding: 0.625rem 1rem;
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

          .delete-confirm-btn {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.375rem;
            padding: 0.625rem 1rem;
            background: hsl(var(--destructive));
            color: hsl(var(--destructive-foreground));
            border: none;
            border-radius: calc(var(--radius) - 0.25rem);
            font-size: 0.875rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;

            &:hover {
              opacity: 0.9;
            }

            lucide-icon {
              width: 16px;
              height: 16px;
            }
          }
        }
      }
    }
  `]
})
export class CollectionDetailComponent implements OnInit {
  backIcon = ArrowLeft;
  editIcon = Edit2;
  trashIcon = Trash2;
  bookmarkIcon = Bookmark;
  gridIcon = Grid3x3;
  listIcon = List;
  searchIcon = Search;
  closeIcon = X;

  collectionId = signal<string>('');
  collection = signal<BookmarkCollection | null>(null);
  collectionPosts = signal<Post[]>([]);
  searchQuery = signal<string>('');
  viewMode = signal<ViewMode>('grid');
  isLoading = signal(false);
  error = signal<string | null>(null);
  currentPage = signal(1);
  pageSize = 10;
  showDeleteConfirm = signal(false);

  filteredPosts = computed(() => {
    let posts = this.collectionPosts();
    
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

  hasMore = computed(() => {
    return this.filteredPosts().length > this.displayedPosts().length;
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private postService: PostService,
    private bookmarkService: BookmarkService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.error.set('Collection ID is required');
      return;
    }
    this.collectionId.set(id);
    this.loadCollection();
  }

  /**
   * Load collection data
   */
  async loadCollection(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const id = this.collectionId();
      const collection = this.bookmarkService.getCollections().find((c: BookmarkCollection) => c.id === id);
      
      if (!collection) {
        this.error.set('Collection not found');
        return;
      }

      this.collection.set(collection);

      // Get all posts and filter by collection
      const allPosts = this.postService.posts();
      const collectionPostIds = this.bookmarkService.getCollectionCount(id);
      
      // Filter posts that are bookmarked in this collection
      const collectionPosts = collectionPostIds > 0
        ? allPosts.filter(post => this.bookmarkService.isBookmarked(post.id))
          .slice(0, collectionPostIds)
        : [];

      this.collectionPosts.set(collectionPosts);
    } catch (err) {
      this.error.set('Failed to load collection');
      console.error('Failed to load collection:', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Go back to bookmarks page
   */
  goBack(): void {
    this.router.navigate(['/bookmarks']);
  }

  /**
   * Edit collection
   */
  editCollection(): void {
    // In a real app, open edit modal
    this.toastService.info('Edit', 'Edit collection functionality coming soon');
  }

  /**
   * Confirm delete
   */
  confirmDelete(): void {
    if (this.collection()?.isDefault) {
      this.toastService.error('Cannot Delete', 'The default collection cannot be deleted');
      return;
    }
    this.showDeleteConfirm.set(true);
  }

  /**
   * Cancel delete
   */
  cancelDelete(): void {
    this.showDeleteConfirm.set(false);
  }

  /**
   * Delete collection
   */
  deleteCollection(): void {
    const id = this.collectionId();
    this.bookmarkService.deleteCollection(id);
    this.toastService.info('Deleted', 'Collection has been deleted');
    this.goBack();
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
   * Load more posts
   */
  loadMore(): void {
    this.currentPage.update(page => page + 1);
  }
}
