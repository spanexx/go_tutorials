import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, X, Palette, Folder } from 'lucide-angular';
import { BookmarkCollectionService } from '../../shared/services/bookmark-collection.service';
import { ToastService } from '../../shared/services/toast.service';

@Component({
  selector: 'app-collection-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './collection-modal.component.html',
  styleUrls: ['./collection-modal.component.scss']
})
export class CollectionModalComponent {
  @Input() visible: boolean = false;
  @Input() editCollectionId?: string;
  @Output() closed = new EventEmitter<void>();
  @Output() collectionSaved = new EventEmitter<void>();

  paletteIcon = Palette;
  folderIcon = Folder;

  name = '';
  description = '';
  selectedColor = '#6366f1';
  selectedIcon = 'folder';

  constructor(
    public collectionService: BookmarkCollectionService,
    private toastService: ToastService
  ) {}

  get colors(): string[] {
    return this.collectionService.getCollectionColors();
  }

  get icons(): { icon: string; label: string }[] {
    return this.collectionService.getCollectionIcons();
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

  get isEditing(): boolean {
    return !!this.editCollectionId;
  }

  get canSave(): boolean {
    return this.name.trim().length > 0 && this.name.trim().length <= 30;
  }

  ngOnInit(): void {
    if (this.editCollectionId) {
      this.loadCollectionForEdit();
    }
  }

  loadCollectionForEdit(): void {
    const collection = this.collectionService.getCollection(this.editCollectionId!);
    if (collection) {
      this.name = collection.name;
      this.description = collection.description || '';
      this.selectedColor = collection.color;
      this.selectedIcon = collection.icon;
    }
  }

  selectColor(color: string): void {
    this.selectedColor = color;
  }

  selectIcon(icon: string): void {
    this.selectedIcon = icon;
  }

  close(): void {
    this.resetForm();
    this.closed.emit();
  }

  resetForm(): void {
    this.name = '';
    this.description = '';
    this.selectedColor = '#6366f1';
    this.selectedIcon = 'folder';
    this.editCollectionId = undefined;
  }

  onSave(): void {
    if (!this.canSave) {
      this.toastService.warning('Invalid name', 'Collection name must be between 1 and 30 characters');
      return;
    }

    if (this.isEditing && this.editCollectionId) {
      this.collectionService.updateCollection(this.editCollectionId, {
        name: this.name.trim(),
        description: this.description.trim(),
        color: this.selectedColor,
        icon: this.selectedIcon
      });
      this.toastService.success('Collection updated', 'Your collection has been updated');
    } else {
      this.collectionService.createCollection(
        this.name.trim(),
        this.description.trim(),
        this.selectedColor,
        this.selectedIcon
      );
      this.toastService.success('Collection created', 'Your new collection has been created');
    }

    this.collectionSaved.emit();
    this.close();
  }

  onDelete(): void {
    if (this.editCollectionId && !this.collectionService.getCollection(this.editCollectionId)?.isDefault) {
      this.collectionService.deleteCollection(this.editCollectionId);
      this.toastService.success('Collection deleted', 'Your collection has been deleted');
      this.collectionSaved.emit();
      this.close();
    }
  }
}
