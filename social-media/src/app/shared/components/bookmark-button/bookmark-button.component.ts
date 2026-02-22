/**
 * BookmarkButtonComponent
 * 
 * Bookmark button for post cards with:
 * - Bookmark icon (filled when bookmarked, outline when not)
 * - Click to toggle bookmark status
 * - Dropdown to select collection
 * - Toast feedback on action
 * - Keyboard accessible
 * 
 * CID: Phase-3 Milestone 3.2 - Bookmarks & Collections
 */
import { Component, Input, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Bookmark, BookmarkCheck, ChevronDown, Plus } from 'lucide-angular';
import { BookmarkService } from '../../services/bookmark.service';
import { BookmarkCollection } from '../../services/bookmark-collection.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-bookmark-button',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="bookmark-button-wrapper" [class.open]="showDropdown()">
      <button
        class="bookmark-btn"
        [class.bookmarked]="isBookmarked()"
        [title]="buttonTitle()"
        (click)="toggleBookmark()"
        (keydown.enter)="toggleBookmark()"
        (keydown.space)="toggleBookmark(); $event.preventDefault()"
        tabindex="0"
        role="button"
        aria-pressed="isBookmarked()"
        aria-label="Bookmark this post"
      >
        <lucide-icon 
          [img]="isBookmarked() ? bookmarkCheckIcon : bookmarkIcon" 
          [size]="20"
          class="bookmark-icon"
        ></lucide-icon>
        @if (bookmarkCount() > 0) {
          <span class="bookmark-count">{{ bookmarkCount() }}</span>
        }
        <lucide-icon 
          [img]="chevronIcon" 
          [size]="14"
          class="chevron-icon"
        ></lucide-icon>
      </button>

      @if (showDropdown()) {
        <div class="bookmark-dropdown" (clickOutside)="closeDropdown()">
          <div class="dropdown-header">
            <span>Save to collection</span>
          </div>

          <div class="dropdown-content">
            @for (collection of collections(); track collection.id) {
              <button
                class="collection-item"
                [class.active]="isInCollection(collection.id)"
                (click)="selectCollection(collection.id)"
              >
                <span 
                  class="collection-color" 
                  [style.background]="collection.color"
                ></span>
                <span class="collection-name">{{ collection.name }}</span>
                @if (isInCollection(collection.id)) {
                  <lucide-icon [img]="bookmarkCheckIcon" [size]="16" class="check-icon"></lucide-icon>
                }
              </button>
            }
          </div>

          <div class="dropdown-footer">
            <button class="new-collection-btn" (click)="createNewCollection()">
              <lucide-icon [img]="plusIcon" [size]="14"></lucide-icon>
              New collection
            </button>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .bookmark-button-wrapper {
      position: relative;
      display: inline-block;

      &.open {
        .bookmark-btn {
          background: hsl(var(--accent));
          color: hsl(var(--accent-foreground));
        }
      }
    }

    .bookmark-btn {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.5rem 0.625rem;
      background: transparent;
      border: 1px solid hsl(var(--border));
      border-radius: calc(var(--radius) - 0.25rem);
      color: hsl(var(--muted-foreground));
      cursor: pointer;
      transition: all 0.2s;
      font-size: 0.875rem;
      font-weight: 500;

      &:hover {
        background: hsl(var(--accent));
        color: hsl(var(--accent-foreground));
        border-color: hsl(var(--accent));
      }

      &.bookmarked {
        background: hsl(var(--accent));
        color: hsl(var(--accent-foreground));
        border-color: hsl(var(--accent));

        .bookmark-icon {
          fill: currentColor;
        }
      }

      .bookmark-icon {
        width: 20px;
        height: 20px;
        transition: all 0.2s;
      }

      .chevron-icon {
        width: 14px;
        height: 14px;
        opacity: 0.6;
        transition: transform 0.2s;
      }

      .bookmark-count {
        font-size: 0.75rem;
        font-weight: 600;
        background: hsl(var(--accent) / 0.2);
        padding: 0.125rem 0.375rem;
        border-radius: 9999px;
      }
    }

    .bookmark-dropdown {
      position: absolute;
      top: calc(100% + 0.5rem);
      right: 0;
      width: 240px;
      background: hsl(var(--card));
      border: 1px solid hsl(var(--border));
      border-radius: var(--radius);
      box-shadow: 0 8px 32px hsl(var(--shadow) / 0.15);
      z-index: 1000;
      overflow: hidden;
      animation: slideIn 0.15s ease;

      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateY(-8px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .dropdown-header {
        padding: 0.75rem 1rem;
        border-bottom: 1px solid hsl(var(--border));
        font-size: 0.75rem;
        font-weight: 600;
        color: hsl(var(--muted-foreground));
        text-transform: uppercase;
        letter-spacing: 0.025em;
      }

      .dropdown-content {
        max-height: 240px;
        overflow-y: auto;
        padding: 0.5rem;

        .collection-item {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          width: 100%;
          padding: 0.625rem 0.75rem;
          background: transparent;
          border: none;
          border-radius: calc(var(--radius) - 0.25rem);
          cursor: pointer;
          transition: background 0.15s;
          text-align: left;
          font-size: 0.875rem;
          color: hsl(var(--foreground));

          &:hover {
            background: hsl(var(--muted));
          }

          &.active {
            background: hsl(var(--accent) / 0.1);
            color: hsl(var(--accent));

            .check-icon {
              color: hsl(var(--accent));
            }
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

          .check-icon {
            width: 16px;
            height: 16px;
            flex-shrink: 0;
          }
        }
      }

      .dropdown-footer {
        padding: 0.5rem;
        border-top: 1px solid hsl(var(--border));

        .new-collection-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          width: 100%;
          padding: 0.625rem 0.75rem;
          background: transparent;
          border: 1px dashed hsl(var(--border));
          border-radius: calc(var(--radius) - 0.25rem);
          color: hsl(var(--muted-foreground));
          cursor: pointer;
          transition: all 0.15s;
          font-size: 0.875rem;

          &:hover {
            background: hsl(var(--muted));
            border-color: hsl(var(--ring));
            color: hsl(var(--foreground));
          }

          lucide-icon {
            width: 14px;
            height: 14px;
          }
        }
      }
    }
  `]
})
export class BookmarkButtonComponent implements OnInit {
  @Input({ required: true }) postId!: number | string;
  @Input() showCount = false;

  bookmarkIcon = Bookmark;
  bookmarkCheckIcon = BookmarkCheck;
  chevronIcon = ChevronDown;
  plusIcon = Plus;

  isBookmarked = signal(false);
  bookmarkCount = signal(0);
  showDropdown = signal(false);
  collections = signal<BookmarkCollection[]>([]);

  buttonTitle = computed(() => 
    this.isBookmarked() ? 'Remove from bookmarks' : 'Add to bookmarks'
  );

  constructor(
    private bookmarkService: BookmarkService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.loadBookmarkState();
    this.loadCollections();
  }

  /**
   * Load bookmark state for the current post
   */
  loadBookmarkState(): void {
    this.isBookmarked.set(this.bookmarkService.isBookmarked(this.postId));
    const collections = this.bookmarkService.getCollectionsForPost(this.postId);
    this.bookmarkCount.set(collections.length);
  }

  /**
   * Load all collections
   */
  loadCollections(): void {
    this.collections.set(this.bookmarkService.getCollections());
  }

  /**
   * Check if post is in a specific collection
   */
  isInCollection(collectionId: string): boolean {
    const collections = this.bookmarkService.getCollectionsForPost(this.postId);
    return collections.some(c => c.id === collectionId);
  }

  /**
   * Toggle bookmark dropdown
   */
  toggleDropdown(): void {
    this.showDropdown.update(show => !show);
  }

  /**
   * Close dropdown
   */
  closeDropdown(): void {
    this.showDropdown.set(false);
  }

  /**
   * Toggle bookmark status
   */
  toggleBookmark(): void {
    if (this.isBookmarked()) {
      // Show dropdown to let user choose which collection to remove from
      this.toggleDropdown();
    } else {
      // Add to default collection
      this.bookmarkService.bookmarkPost(this.postId, 'default');
      this.loadBookmarkState();
    }
  }

  /**
   * Select a collection for bookmarking
   */
  selectCollection(collectionId: string): void {
    if (this.isInCollection(collectionId)) {
      // Remove from this collection
      this.bookmarkService.removeBookmark(this.postId, collectionId);
      this.toastService.info('Removed', 'Post removed from collection');
    } else {
      // Add to this collection
      this.bookmarkService.addToCollection(this.postId, collectionId);
      this.toastService.success('Saved', `Post added to ${this.collections().find(c => c.id === collectionId)?.name}`);
    }
    this.loadBookmarkState();
    this.closeDropdown();
  }

  /**
   * Create a new collection
   */
  createNewCollection(): void {
    const name = prompt('Enter collection name:');
    if (name && name.trim()) {
      this.bookmarkService.createCollection(name.trim());
      this.loadCollections();
      this.closeDropdown();
    }
  }
}
