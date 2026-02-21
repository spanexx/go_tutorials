import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PostCardComponent } from '../../components/post-card/post-card.component';
import { LucideAngularModule, Bookmark, Plus, Folder } from 'lucide-angular';
import { PostService, Post } from '../../shared/services/post.service';
import { BookmarkCollectionService, BookmarkCollection } from '../../shared/services/bookmark-collection.service';
import { CollectionModalComponent } from '../../shared/collection-modal/collection-modal.component';

@Component({
  selector: 'app-bookmarks',
  standalone: true,
  imports: [CommonModule, PostCardComponent, LucideAngularModule, CollectionModalComponent],
  templateUrl: './bookmarks.component.html',
  styleUrls: ['./bookmarks.component.scss']
})
export class BookmarksComponent {
  bookmarkIcon = Bookmark;
  plusIcon = Plus;
  folderIcon = Folder;

  selectedCollectionId: string = 'default';
  showCollectionModal = false;
  editCollectionId?: string;

  constructor(
    private postService: PostService,
    public collectionService: BookmarkCollectionService
  ) { }

  get collections(): BookmarkCollection[] {
    return this.collectionService.getCollections();
  }

  get selectedCollection(): BookmarkCollection | undefined {
    return this.collectionService.getCollection(this.selectedCollectionId);
  }

  get savedPosts(): Post[] {
    const postIds = this.collectionService.getPostsInCollection(this.selectedCollectionId);
    return postIds
      .map(id => this.postService.getPostById(id))
      .filter((post): post is Post => !!post);
  }

  get hasSavedPosts(): boolean {
    return this.savedPosts.length > 0;
  }

  getTotalSavedCount(): number {
    return this.collectionService.getTotalSavedCount();
  }

  getCollectionCount(collectionId: string): number {
    return this.collectionService.getCollectionCount(collectionId);
  }

  selectCollection(collectionId: string): void {
    this.selectedCollectionId = collectionId;
  }

  openNewCollectionModal(): void {
    this.editCollectionId = undefined;
    this.showCollectionModal = true;
  }

  openEditCollectionModal(collectionId: string): void {
    this.editCollectionId = collectionId;
    this.showCollectionModal = true;
  }

  closeCollectionModal(): void {
    this.showCollectionModal = false;
    this.editCollectionId = undefined;
  }

  getIconEmoji(icon: string): string {
    const emojiMap: Record<string, string> = {
      'bookmark': '🔖',
      'folder': '📁',
      'star': '⭐',
      'heart': '❤️',
      'file': '📄',
      'image': '🖼️',
      'video': '🎬',
      'link': '🔗'
    };
    return emojiMap[icon] || '📁';
  }
}
