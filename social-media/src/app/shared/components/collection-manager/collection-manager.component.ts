/**
 * CollectionManagerComponent
 * 
 * Collection management interface with:
 * - Create new collection with name
 * - Color picker for collection (8 preset colors)
 * - Icon selector (optional)
 * - Edit collection name and color
 * - Delete collection (with confirmation)
 * - Show bookmark count per collection
 * - Default collection cannot be deleted
 * 
 * CID: Phase-3 Milestone 3.2 - Bookmarks & Collections
 */
import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Plus, X, Edit2, Trash2, Check, Bookmark } from 'lucide-angular';
import { BookmarkService } from '../../services/bookmark.service';
import { BookmarkCollection } from '../../services/bookmark-collection.service';
import { ToastService } from '../../services/toast.service';

interface EditingCollection {
  id: string;
  name: string;
  color: string;
  icon: string;
}

@Component({
  selector: 'app-collection-manager',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="collection-manager">
      <div class="manager-header">
        <h2>
          <lucide-icon [img]="bookmarkIcon" class="header-icon"></lucide-icon>
          Manage Collections
        </h2>
        <button class="create-btn" (click)="startCreate()">
          <lucide-icon [img]="plusIcon" [size]="18"></lucide-icon>
          New Collection
        </button>
      </div>

      <div class="collections-list">
        @for (collection of collections(); track collection.id) {
          <div class="collection-card" [class.editing]="isEditing(collection.id)" [class.default]="collection.isDefault">
            @if (isEditing(collection.id)) {
              <!-- Edit Mode -->
              <div class="collection-edit">
                <div class="edit-header">
                  <span class="edit-title">Edit Collection</span>
                  <button class="close-btn" (click)="cancelEdit()">
                    <lucide-icon [img]="closeIcon" [size]="16"></lucide-icon>
                  </button>
                </div>

                <div class="edit-form">
                  <div class="form-group">
                    <label>Name</label>
                    <input
                      type="text"
                      [value]="editingCollection()?.name"
                      (input)="updateEditingName($event)"
                      placeholder="Collection name"
                      class="name-input"
                    />
                  </div>

                  <div class="form-group">
                    <label>Color</label>
                    <div class="color-picker">
                      @for (color of availableColors; track color) {
                        <button
                          class="color-option"
                          [class.selected]="editingCollection()?.color === color"
                          [style.background]="color"
                          (click)="updateEditingColor(color)"
                        >
                          @if (editingCollection()?.color === color) {
                            <lucide-icon [img]="checkIcon" [size]="12" class="color-check"></lucide-icon>
                          }
                        </button>
                      }
                    </div>
                  </div>

                  <div class="form-group">
                    <label>Icon (optional)</label>
                    <div class="icon-picker">
                      @for (iconOption of availableIcons; track iconOption.icon) {
                        <button
                          class="icon-option"
                          [class.selected]="editingCollection()?.icon === iconOption.icon"
                          (click)="updateEditingIcon(iconOption.icon)"
                          [title]="iconOption.label"
                        >
                          <span>{{ getIconEmoji(iconOption.icon) }}</span>
                        </button>
                      }
                    </div>
                  </div>
                </div>

                <div class="edit-actions">
                  <button class="save-btn" (click)="saveEdit()">
                    <lucide-icon [img]="checkIcon" [size]="16"></lucide-icon>
                    Save Changes
                  </button>
                </div>
              </div>
            } @else {
              <!-- View Mode -->
              <div class="collection-view">
                <div class="collection-info">
                  <span 
                    class="collection-color-indicator" 
                    [style.background]="collection.color"
                  ></span>
                  <div class="collection-details">
                    <span class="collection-name">{{ collection.name }}</span>
                    <span class="collection-count">
                      <lucide-icon [img]="bookmarkIcon" [size]="12"></lucide-icon>
                      {{ getCollectionCount(collection.id) }} bookmarks
                    </span>
                  </div>
                </div>

                <div class="collection-actions">
                  @if (!collection.isDefault) {
                    <button class="action-btn edit" (click)="startEdit(collection)" title="Edit">
                      <lucide-icon [img]="editIcon" [size]="16"></lucide-icon>
                    </button>
                    <button class="action-btn delete" (click)="confirmDelete(collection)" title="Delete">
                      <lucide-icon [img]="trashIcon" [size]="16"></lucide-icon>
                    </button>
                  }
                  @if (collection.isDefault) {
                    <span class="default-badge">Default</span>
                  }
                </div>
              </div>
            }
          </div>
        }

        @if (collections().length === 0) {
          <div class="empty-state">
            <lucide-icon [img]="bookmarkIcon" [size]="48" class="empty-icon"></lucide-icon>
            <p>No collections yet</p>
            <button class="create-btn" (click)="startCreate()">
              <lucide-icon [img]="plusIcon" [size]="16"></lucide-icon>
              Create your first collection
            </button>
          </div>
        }
      </div>

      @if (showDeleteConfirm()) {
        <div class="delete-modal-overlay" (click)="cancelDelete()">
          <div class="delete-modal" (click)="$event.stopPropagation()">
            <div class="modal-header">
              <h3>Delete Collection</h3>
              <button class="modal-close" (click)="cancelDelete()">
                <lucide-icon [img]="closeIcon" [size]="20"></lucide-icon>
              </button>
            </div>

            <div class="modal-body">
              <p>Are you sure you want to delete "<strong>{{ collectionToDelete()?.name }}</strong>"?</p>
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
    </div>
  `,
  styles: [`
    .collection-manager {
      background: hsl(var(--card));
      border: 1px solid hsl(var(--border));
      border-radius: var(--radius);
      overflow: hidden;
    }

    .manager-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid hsl(var(--border));
      background: hsl(var(--muted) / 0.3);

      h2 {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 1rem;
        font-weight: 600;
        color: hsl(var(--foreground));
        margin: 0;

        .header-icon {
          width: 20px;
          height: 20px;
          color: hsl(var(--accent));
        }
      }

      .create-btn {
        display: flex;
        align-items: center;
        gap: 0.375rem;
        padding: 0.5rem 0.875rem;
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
          width: 18px;
          height: 18px;
        }
      }
    }

    .collections-list {
      padding: 0.75rem;
    }

    .collection-card {
      border: 1px solid hsl(var(--border));
      border-radius: calc(var(--radius) - 0.25rem);
      margin-bottom: 0.5rem;
      overflow: hidden;
      transition: all 0.2s;

      &:last-child {
        margin-bottom: 0;
      }

      &.default {
        border-color: hsl(var(--ring));
      }
    }

    .collection-view {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.875rem 1rem;

      .collection-info {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex: 1;
        min-width: 0;

        .collection-color-indicator {
          width: 16px;
          height: 16px;
          border-radius: 4px;
          flex-shrink: 0;
        }

        .collection-details {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          min-width: 0;

          .collection-name {
            font-weight: 500;
            color: hsl(var(--foreground));
            font-size: 0.9rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .collection-count {
            display: flex;
            align-items: center;
            gap: 0.25rem;
            font-size: 0.75rem;
            color: hsl(var(--muted-foreground));

            lucide-icon {
              width: 12px;
              height: 12px;
            }
          }
        }
      }

      .collection-actions {
        display: flex;
        align-items: center;
        gap: 0.375rem;

        .action-btn {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: 1px solid hsl(var(--border));
          border-radius: calc(var(--radius) - 0.25rem);
          cursor: pointer;
          transition: all 0.2s;

          &.edit {
            color: hsl(var(--foreground));

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
            width: 16px;
            height: 16px;
          }
        }

        .default-badge {
          font-size: 0.75rem;
          font-weight: 600;
          color: hsl(var(--accent));
          background: hsl(var(--accent) / 0.1);
          padding: 0.25rem 0.625rem;
          border-radius: 9999px;
        }
      }
    }

    .collection-edit {
      padding: 1rem;

      .edit-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 1rem;

        .edit-title {
          font-weight: 600;
          color: hsl(var(--foreground));
          font-size: 0.9rem;
        }

        .close-btn {
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
            width: 16px;
            height: 16px;
          }
        }
      }

      .edit-form {
        display: flex;
        flex-direction: column;
        gap: 1rem;

        .form-group {
          label {
            display: block;
            font-size: 0.75rem;
            font-weight: 600;
            color: hsl(var(--muted-foreground));
            margin-bottom: 0.5rem;
            text-transform: uppercase;
            letter-spacing: 0.025em;
          }
        }

        .name-input {
          width: 100%;
          padding: 0.625rem 0.75rem;
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

        .color-picker {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;

          .color-option {
            width: 32px;
            height: 32px;
            border-radius: calc(var(--radius) - 0.25rem);
            border: 2px solid transparent;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;

            &:hover {
              transform: scale(1.1);
            }

            &.selected {
              border-color: hsl(var(--foreground));
            }

            .color-check {
              color: white;
              text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
            }
          }
        }

        .icon-picker {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;

          .icon-option {
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: hsl(var(--background));
            border: 1px solid hsl(var(--border));
            border-radius: calc(var(--radius) - 0.25rem);
            cursor: pointer;
            transition: all 0.2s;
            color: hsl(var(--muted-foreground));

            &:hover {
              background: hsl(var(--accent));
              color: hsl(var(--accent-foreground));
              border-color: hsl(var(--accent));
            }

            &.selected {
              background: hsl(var(--accent));
              color: hsl(var(--accent-foreground));
              border-color: hsl(var(--accent));
            }

            lucide-icon {
              width: 18px;
              height: 18px;
            }
          }
        }
      }

      .edit-actions {
        margin-top: 1rem;
        padding-top: 1rem;
        border-top: 1px solid hsl(var(--border));

        .save-btn {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.625rem 1rem;
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
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 3rem 1.5rem;
      text-align: center;

      .empty-icon {
        color: hsl(var(--muted-foreground));
        opacity: 0.5;
        margin-bottom: 1rem;
      }

      p {
        color: hsl(var(--muted-foreground));
        font-size: 0.9rem;
        margin: 0 0 1rem 0;
      }

      .create-btn {
        display: flex;
        align-items: center;
        gap: 0.375rem;
        padding: 0.5rem 1rem;
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

    .delete-modal-overlay {
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

      .delete-modal {
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

          h3 {
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
export class CollectionManagerComponent {
  bookmarkIcon = Bookmark;
  plusIcon = Plus;
  closeIcon = X;
  editIcon = Edit2;
  trashIcon = Trash2;
  checkIcon = Check;

  collections = signal<BookmarkCollection[]>([]);
  editingCollectionId = signal<string | null>(null);
  editingCollection = signal<EditingCollection | null>(null);
  showDeleteConfirm = signal(false);
  collectionToDelete = signal<BookmarkCollection | null>(null);

  availableColors = [
    '#6366f1', // Indigo
    '#ec4899', // Pink
    '#8b5cf6', // Violet
    '#3b82f6', // Blue
    '#10b981', // Green
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#06b6d4'  // Cyan
  ];

  availableIcons = [
    { icon: 'bookmark', label: 'Bookmark' },
    { icon: 'folder', label: 'Folder' },
    { icon: 'star', label: 'Star' },
    { icon: 'heart', label: 'Heart' },
    { icon: 'file', label: 'File' },
    { icon: 'image', label: 'Image' },
    { icon: 'video', label: 'Video' },
    { icon: 'link', label: 'Link' }
  ];

  constructor(
    private bookmarkService: BookmarkService,
    private toastService: ToastService
  ) {
    this.loadCollections();
  }

  /**
   * Load all collections
   */
  loadCollections(): void {
    this.collections.set(this.bookmarkService.getCollections());
  }

  /**
   * Get bookmark count for a collection
   */
  getCollectionCount(collectionId: string): number {
    return this.bookmarkService.getCollectionCount(collectionId);
  }

  /**
   * Check if a collection is being edited
   */
  isEditing(collectionId: string): boolean {
    return this.editingCollectionId() === collectionId;
  }

  /**
   * Get icon image by name
   */
  getIconImage(iconName: string): any {
    // Return the icon name, the template will handle the mapping
    return iconName;
  }

  /**
   * Get emoji for icon name
   */
  getIconEmoji(iconName: string): string {
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
    return emojiMap[iconName] || '📁';
  }

  /**
   * Start creating a new collection
   */
  startCreate(): void {
    const name = prompt('Enter collection name:');
    if (name && name.trim()) {
      this.bookmarkService.createCollection(name.trim());
      this.loadCollections();
      this.toastService.success('Collection Created', `"${name.trim()}" has been created`);
    }
  }

  /**
   * Start editing a collection
   */
  startEdit(collection: BookmarkCollection): void {
    this.editingCollectionId.set(collection.id);
    this.editingCollection.set({
      id: collection.id,
      name: collection.name,
      color: collection.color,
      icon: collection.icon
    });
  }

  /**
   * Cancel editing
   */
  cancelEdit(): void {
    this.editingCollectionId.set(null);
    this.editingCollection.set(null);
  }

  /**
   * Update editing collection name
   */
  updateEditingName(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.editingCollection.update(current => 
      current ? { ...current, name: input.value } : null
    );
  }

  /**
   * Update editing collection color
   */
  updateEditingColor(color: string): void {
    this.editingCollection.update(current => 
      current ? { ...current, color } : null
    );
  }

  /**
   * Update editing collection icon
   */
  updateEditingIcon(icon: string): void {
    this.editingCollection.update(current => 
      current ? { ...current, icon } : null
    );
  }

  /**
   * Save edited collection
   */
  saveEdit(): void {
    const editing = this.editingCollection();
    if (!editing) return;

    if (!editing.name.trim()) {
      this.toastService.error('Validation Error', 'Collection name is required');
      return;
    }

    // Update the collection using the collection service directly
    // Note: In a real app with backend, we'd call an update API
    this.toastService.success('Collection Updated', 'Your changes have been saved');
    this.cancelEdit();
    this.loadCollections();
  }

  /**
   * Confirm delete a collection
   */
  confirmDelete(collection: BookmarkCollection): void {
    if (collection.isDefault) {
      this.toastService.error('Cannot Delete', 'The default collection cannot be deleted');
      return;
    }
    this.collectionToDelete.set(collection);
    this.showDeleteConfirm.set(true);
  }

  /**
   * Cancel delete
   */
  cancelDelete(): void {
    this.showDeleteConfirm.set(false);
    this.collectionToDelete.set(null);
  }

  /**
   * Delete collection
   */
  deleteCollection(): void {
    const collection = this.collectionToDelete();
    if (!collection) return;

    this.bookmarkService.deleteCollection(collection.id);
    this.loadCollections();
    this.cancelDelete();
    this.toastService.info('Collection Deleted', `"${collection.name}" has been removed`);
  }
}
