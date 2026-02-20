import { Injectable, signal } from '@angular/core';

export interface BookmarkCollection {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  postIds: number[];
  createdAt: Date;
  isDefault: boolean;
}

export interface SavedPost {
  postId: number;
  collectionId: string;
  savedAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class BookmarkCollectionService {
  private collectionsSignal = signal<BookmarkCollection[]>([]);
  collections = this.collectionsSignal.asReadonly();

  private savedPostsSignal = signal<SavedPost[]>([]);
  savedPosts = this.savedPostsSignal.asReadonly();

  constructor() {
    this.initializeDefaultCollection();
    this.loadFromStorage();
  }

  private initializeDefaultCollection(): void {
    const defaultCollection: BookmarkCollection = {
      id: 'default',
      name: 'All Bookmarks',
      description: 'All your saved posts',
      color: '#6366f1',
      icon: 'bookmark',
      postIds: [],
      createdAt: new Date(),
      isDefault: true
    };
    this.collectionsSignal.set([defaultCollection]);
  }

  private loadFromStorage(): void {
    const stored = localStorage.getItem('socialhub_collections');
    if (stored) {
      try {
        const collections = JSON.parse(stored);
        this.collectionsSignal.set(collections);
      } catch {
        // Use default if parsing fails
      }
    }
  }

  private saveToStorage(): void {
    localStorage.setItem('socialhub_collections', JSON.stringify(this.collectionsSignal()));
  }

  getCollections(): BookmarkCollection[] {
    return this.collectionsSignal();
  }

  getCollection(collectionId: string): BookmarkCollection | undefined {
    return this.collectionsSignal().find(c => c.id === collectionId);
  }

  createCollection(name: string, description?: string, color?: string, icon?: string): BookmarkCollection {
    const newCollection: BookmarkCollection = {
      id: `collection-${Date.now()}`,
      name,
      description,
      color: color || '#6366f1',
      icon: icon || 'folder',
      postIds: [],
      createdAt: new Date(),
      isDefault: false
    };

    this.collectionsSignal.update(collections => [...collections, newCollection]);
    this.saveToStorage();

    return newCollection;
  }

  updateCollection(collectionId: string, updates: Partial<BookmarkCollection>): void {
    this.collectionsSignal.update(collections =>
      collections.map(c =>
        c.id === collectionId ? { ...c, ...updates } : c
      )
    );
    this.saveToStorage();
  }

  deleteCollection(collectionId: string): void {
    if (collectionId === 'default') {
      return; // Cannot delete default collection
    }

    this.collectionsSignal.update(collections =>
      collections.filter(c => c.id !== collectionId)
    );

    // Move posts from deleted collection to default
    this.collectionsSignal.update(collections => {
      const deletedCollection = this.collectionsSignal().find(c => c.id === collectionId);
      if (deletedCollection) {
        const defaultCollection = collections.find(c => c.id === 'default');
        if (defaultCollection) {
          defaultCollection.postIds = [...new Set([...defaultCollection.postIds, ...deletedCollection.postIds])];
        }
      }
      return collections;
    });

    this.saveToStorage();
  }

  savePost(postId: number, collectionId: string = 'default'): void {
    const savedPost: SavedPost = {
      postId,
      collectionId,
      savedAt: new Date()
    };

    this.savedPostsSignal.update(posts => [...posts, savedPost]);

    this.collectionsSignal.update(collections =>
      collections.map(c => {
        if (c.id === collectionId && !c.postIds.includes(postId)) {
          return { ...c, postIds: [...c.postIds, postId] };
        }
        return c;
      })
    );

    this.saveToStorage();
  }

  removePost(postId: number, collectionId?: string): void {
    if (collectionId) {
      // Remove from specific collection
      this.collectionsSignal.update(collections =>
        collections.map(c => {
          if (c.id === collectionId) {
            return { ...c, postIds: c.postIds.filter(id => id !== postId) };
          }
          return c;
        })
      );
    } else {
      // Remove from all collections
      this.collectionsSignal.update(collections =>
        collections.map(c => ({
          ...c,
          postIds: c.postIds.filter(id => id !== postId)
        }))
      );
    }

    this.savedPostsSignal.update(posts =>
      posts.filter(p => p.postId !== postId)
    );

    this.saveToStorage();
  }

  movePost(postId: number, fromCollectionId: string, toCollectionId: string): void {
    this.removePost(postId, fromCollectionId);
    this.savePost(postId, toCollectionId);
  }

  getPostsInCollection(collectionId: string): number[] {
    const collection = this.getCollection(collectionId);
    return collection?.postIds || [];
  }

  getCollectionsForPost(postId: number): BookmarkCollection[] {
    return this.collectionsSignal().filter(c => c.postIds.includes(postId));
  }

  isPostSaved(postId: number): boolean {
    return this.collectionsSignal().some(c => c.postIds.includes(postId));
  }

  getCollectionCount(collectionId: string): number {
    const collection = this.getCollection(collectionId);
    return collection?.postIds.length || 0;
  }

  getTotalSavedCount(): number {
    const allPostIds = new Set<number>();
    this.collectionsSignal().forEach(c => {
      c.postIds.forEach(id => allPostIds.add(id));
    });
    return allPostIds.size;
  }

  getCollectionIcons(): { icon: string; label: string }[] {
    return [
      { icon: 'bookmark', label: 'Bookmark' },
      { icon: 'folder', label: 'Folder' },
      { icon: 'star', label: 'Star' },
      { icon: 'heart', label: 'Heart' },
      { icon: 'file', label: 'File' },
      { icon: 'image', label: 'Image' },
      { icon: 'video', label: 'Video' },
      { icon: 'link', label: 'Link' }
    ];
  }

  getCollectionColors(): string[] {
    return [
      '#6366f1', // Indigo
      '#ec4899', // Pink
      '#8b5cf6', // Violet
      '#3b82f6', // Blue
      '#10b981', // Green
      '#f59e0b', // Amber
      '#ef4444', // Red
      '#06b6d4'  // Cyan
    ];
  }
}
