/**
 * Bookmark Model
 * 
 * Defines the structure for bookmarks and collections in the SocialHub application.
 * Bookmarks allow users to save posts for later reference and organize them into collections.
 * 
 * CID: Phase-3 Milestone 3.2 - Bookmarks & Collections
 */

/**
 * Bookmark interface
 * Represents a saved bookmark linking a user to a post within a collection
 */
export interface Bookmark {
  /** Unique identifier for the bookmark */
  id: string;
  
  /** ID of the user who saved the bookmark */
  userId: string;
  
  /** ID of the bookmarked post */
  postId: number | string;
  
  /** ID of the collection this bookmark belongs to */
  collectionId: string;
  
  /** When the bookmark was created */
  createdAt: Date | string;
}

/**
 * BookmarkCollection interface
 * Represents a collection for organizing bookmarks
 */
export interface BookmarkCollection {
  /** Unique identifier for the collection */
  id: string;
  
  /** ID of the user who owns this collection */
  userId: string;
  
  /** Name of the collection */
  name: string;
  
  /** Optional description of the collection */
  description?: string;
  
  /** Color code for the collection (hex) */
  color: string;
  
  /** Icon name for the collection */
  icon: string;
  
  /** Array of post IDs in this collection */
  postIds: (number | string)[];
  
  /** When the collection was created */
  createdAt: Date | string;
  
  /** Whether this is the default collection */
  isDefault?: boolean;
}

/**
 * BookmarkFilter type
 * Used for filtering bookmarks by collection
 */
export type BookmarkFilter = 'all' | string;

/**
 * BookmarksQueryResult interface
 * Represents the result of a bookmarks query with pagination
 */
export interface BookmarksQueryResult {
  bookmarks: Bookmark[];
  totalCount: number;
  hasMore: boolean;
  page: number;
  limit: number;
}
