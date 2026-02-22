import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BaseApiService } from './base-api.service';
import { Bookmark } from '../models/bookmark.model';
import { BookmarkCollection } from './bookmark-collection.service';
import { ToastService } from './toast.service';

export type BookmarkFilter = 'all' | string;

export interface BookmarksQueryResult {
  bookmarks: Bookmark[];
  totalCount: number;
  hasMore: boolean;
  page: number;
  limit: number;
}

/**
 * BookmarkService
 * 
 * Manages bookmarks and collections for the current user via API.
 * Provides methods to bookmark posts, manage collections, and organize saved content.
 * 
 * Features:
 * - Signal-based state management for reactive UI updates
 * - Collection management (create, edit, delete)
 * - Bookmark operations (add, remove, move)
 * - Filtering by collection
 * - API-only persistence (no localStorage fallback)
 * 
 * CID: Phase-3 Milestone 3.2 - Bookmarks & Collections (Refactored)
 */
@Injectable({
  providedIn: 'root'
})
export class BookmarkService extends BaseApiService {
  /** Signal holding all bookmarks */
  private bookmarksSignal = signal<Bookmark[]>([]);
  
  /** Signal holding all collections */
  private collectionsSignal = signal<BookmarkCollection[]>([]);
  
  /** Current filter applied to bookmarks */
  private currentFilter = signal<BookmarkFilter>('all');
  
  /** Loading state */
  private loadingSignal = signal<boolean>(false);
  
  /** Error state */
  private errorSignal = signal<string | null>(null);

  /**
   * Computed signal for filtered bookmarks
   */
  readonly bookmarks = computed(() => {
    const filter = this.currentFilter();
    const all = this.bookmarksSignal();
    
    if (filter === 'all') {
      return all;
    }
    return all.filter(b => b.collectionId === filter);
  });

  /**
   * Computed signal for collections
   */
  readonly collections = computed(() => this.collectionsSignal());

  /**
   * Computed signal for total bookmark count
   */
  readonly totalCount = computed(() => this.bookmarksSignal().length);

  /**
   * Computed signal for loading state
   */
  readonly isLoading = computed(() => this.loadingSignal());

  /**
   * Computed signal for error state
   */
  readonly error = computed(() => this.errorSignal());

  constructor(
    http: HttpClient,
    private toastService: ToastService
  ) {
    super(http);
    // Initial load from API only
    void this.refresh();
  }

  /**
   * Get bookmarks from the API
   * Returns empty result on API failure
   */
  async getBookmarks(page: number = 1, limit: number = 20): Promise<BookmarksQueryResult> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const response = await this.get<BookmarksQueryResult>('/bookmarks', { 
        page: page.toString(), 
        limit: limit.toString() 
      }).toPromise();

      if (response) {
        this.bookmarksSignal.set(response.bookmarks);
        this.loadingSignal.set(false);
        return response;
      }
    } catch (error) {
      console.warn('Failed to fetch bookmarks from API');
      this.errorSignal.set('Failed to load bookmarks');
    }

    this.loadingSignal.set(false);
    return {
      bookmarks: [],
      totalCount: 0,
      hasMore: false,
      page,
      limit
    };
  }

  /**
   * Bookmark a post
   * @param postId - ID of post to bookmark
   * @param collectionId - Optional collection ID (defaults to 'default')
   */
  async bookmarkPost(postId: number | string, collectionId: string = 'default'): Promise<boolean> {
    try {
      const response = await this.post<Bookmark>('/bookmarks', { postId, collectionId }).toPromise();
      
      if (response) {
        // Add to local state on success
        this.bookmarksSignal.update(bookmarks => [response, ...bookmarks]);
        this.toastService.success('Bookmarked', 'Post saved to your collection');
        return true;
      }
    } catch (error) {
      console.error('Failed to bookmark post:', error);
      this.toastService.error('Error', 'Failed to bookmark post');
    }
    
    return false;
  }

  /**
   * Remove a bookmark
   * @param postId - ID of post to remove bookmark for
   * @param collectionId - Optional collection ID (removes from all if not specified)
   */
  async removeBookmark(postId: number | string, collectionId?: string): Promise<boolean> {
    try {
      const url = collectionId 
        ? `/bookmarks/${postId}?collectionId=${collectionId}`
        : `/bookmarks/${postId}`;
      await this.delete(url).toPromise();
      
      // Remove from local state on success
      this.bookmarksSignal.update(bookmarks => 
        bookmarks.filter(b => b.postId !== postId)
      );
      
      this.toastService.info('Removed', 'Post removed from bookmarks');
      return true;
    } catch (error) {
      console.error('Failed to remove bookmark:', error);
      this.toastService.error('Error', 'Failed to remove bookmark');
      return false;
    }
  }

  /**
   * Get all collections (current cached state)
   */
  getCollections(): BookmarkCollection[] {
    return this.collectionsSignal();
  }

  /**
   * Fetch all collections from API
   */
  async fetchCollectionsFromApi(): Promise<BookmarkCollection[]> {
    try {
      const response = await this.get<BookmarkCollection[]>('/bookmarks/collections').toPromise();
      if (response) {
        this.collectionsSignal.set(response);
        return response;
      }
    } catch (error) {
      console.warn('Failed to fetch collections from API');
    }
    return this.collectionsSignal();
  }

  /**
   * Create a new collection via API
   * @param name - Collection name
   * @param options - Optional color, icon, description
   */
  async createCollection(
    name: string, 
    options?: { color?: string; icon?: string; description?: string }
  ): Promise<BookmarkCollection | null> {
    try {
      const response = await this.post<BookmarkCollection>('/bookmarks/collections', {
        name,
        ...options
      }).toPromise();

      if (response) {
        this.collectionsSignal.update(collections => [...collections, response]);
        this.toastService.success('Collection Created', `"${name}" has been created`);
        return response;
      }
    } catch (error) {
      console.error('Failed to create collection:', error);
      this.toastService.error('Error', 'Failed to create collection');
    }

    return null;
  }

  /**
   * Delete a collection via API
   * @param collectionId - ID of collection to delete
   */
  async deleteCollection(collectionId: string): Promise<boolean> {
    if (collectionId === 'default') {
      this.toastService.error('Cannot Delete', 'The default collection cannot be deleted');
      return false;
    }

    try {
      await this.delete(`/bookmarks/collections/${collectionId}`).toPromise();
      
      // Remove from local state on success
      this.collectionsSignal.update(collections => 
        collections.filter(c => c.id !== collectionId)
      );
      this.bookmarksSignal.update(bookmarks => 
        bookmarks.filter(b => b.collectionId !== collectionId)
      );
      
      this.toastService.info('Collection Deleted', 'The collection has been removed');
      return true;
    } catch (error) {
      console.error('Failed to delete collection:', error);
      this.toastService.error('Error', 'Failed to delete collection');
      return false;
    }
  }

  /**
   * Add a bookmark to a collection via API
   * @param postId - ID of post to add
   * @param collectionId - ID of collection to add to
   */
  async addToCollection(postId: number | string, collectionId: string): Promise<boolean> {
    try {
      await this.post('/bookmarks/add-to-collection', { postId, collectionId }).toPromise();
      this.toastService.success('Added', 'Post added to collection');
      return true;
    } catch (error) {
      console.error('Failed to add to collection:', error);
      this.toastService.error('Error', 'Failed to add to collection');
      return false;
    }
  }

  /**
   * Move a bookmark to a different collection via API
   * @param postId - ID of post to move
   * @param fromCollectionId - Current collection ID
   * @param toCollectionId - New collection ID
   */
  async moveBookmark(
    postId: number | string, 
    fromCollectionId: string, 
    toCollectionId: string
  ): Promise<boolean> {
    try {
      await this.post('/bookmarks/move', { postId, fromCollectionId, toCollectionId }).toPromise();
      this.toastService.info('Moved', 'Post moved to different collection');
      return true;
    } catch (error) {
      console.error('Failed to move bookmark:', error);
      this.toastService.error('Error', 'Failed to move bookmark');
      return false;
    }
  }

  /**
   * Check if a post is bookmarked
   * @param postId - ID of post to check
   */
  isBookmarked(postId: number | string): boolean {
    return this.bookmarksSignal().some(b => b.postId === postId);
  }

  /**
   * Get collections that contain a specific post
   * @param postId - ID of post
   */
  getCollectionsForPost(postId: number | string): BookmarkCollection[] {
    const bookmark = this.bookmarksSignal().find(b => b.postId === postId);
    if (!bookmark) return [];
    return this.collectionsSignal().filter(c => c.id === bookmark.collectionId);
  }

  /**
   * Set the current filter
   * @param filter - Filter to apply
   */
  setFilter(filter: BookmarkFilter): void {
    this.currentFilter.set(filter);
  }

  /**
   * Get the current filter
   */
  getFilter(): BookmarkFilter {
    return this.currentFilter();
  }

  /**
   * Refresh bookmarks and collections from API
   */
  async refresh(): Promise<void> {
    await Promise.all([
      this.getBookmarks(),
      this.fetchCollectionsFromApi()
    ]);
  }

  /**
   * Get count of bookmarks in a collection
   * @param collectionId - Collection ID
   */
  getCollectionCount(collectionId: string): number {
    return this.bookmarksSignal().filter(b => b.collectionId === collectionId).length;
  }

  /**
   * Get total number of unique bookmarks
   */
  getTotalCount(): number {
    return this.bookmarksSignal().length;
  }
}
