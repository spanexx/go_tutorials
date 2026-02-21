import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Image, X, Send, Smile, MapPin } from 'lucide-angular';
import { PostService } from '../../shared/services/post.service';
import { ToastService } from '../../shared/services/toast.service';

const MAX_CHARACTERS = 280;

@Component({
  selector: 'app-create-post',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './create-post.component.html',
  styleUrls: ['./create-post.component.scss']
})
export class CreatePostComponent {
  imageIcon = Image;
  closeIcon = X;
  sendIcon = Send;
  smileIcon = Smile;
  locationIcon = MapPin;

  @Output() postCreated = new EventEmitter<void>();

  postContent = '';
  selectedImage: string | null = null;
  selectedImageFile: File | null = null;
  showEmojiPicker = false;
  isPosting = false;

  readonly emojis: string[] = ['😀', '😂', '😍', '🥰', '😎', '🤔', '👍', '❤️', '🔥', '🎉', '👏', '💯', '✨', '🚀', '💪', '🙏'];
  
  get emojiRows(): string[][] {
    const rows: string[][] = [];
    for (let i = 0; i < this.emojis.length; i += 8) {
      rows.push(this.emojis.slice(i, i + 8));
    }
    return rows;
  }

  constructor(
    private postService: PostService,
    private toastService: ToastService
  ) {}

  get characterCount(): number {
    return this.postContent.length;
  }

  get remainingCharacters(): number {
    return MAX_CHARACTERS - this.characterCount;
  }

  get isOverLimit(): boolean {
    return this.remainingCharacters < 0;
  }

  get canPost(): boolean {
    return (this.postContent.trim().length > 0 || !!this.selectedImage) && 
           !this.isOverLimit && 
           !this.isPosting;
  }

  get progressPercentage(): number {
    return Math.min((this.characterCount / MAX_CHARACTERS) * 100, 100);
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (file) {
      if (!file.type.startsWith('image/')) {
        return;
      }

      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        return;
      }

      this.selectedImageFile = file;
      
      const reader = new FileReader();
      reader.onload = (e) => {
        this.selectedImage = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }

    input.value = '';
  }

  removeImage(): void {
    this.selectedImage = null;
    this.selectedImageFile = null;
  }

  onPostClick(): void {
    if (!this.canPost) {
      return;
    }

    this.isPosting = true;

    // Create the post via real API
    this.postService.createPost(this.postContent, this.selectedImage || undefined).subscribe({
      next: () => {
        // Show success toast
        this.toastService.success('Post created!', 'Your post has been published successfully.');
        
        // Reset form
        this.postContent = '';
        this.selectedImage = null;
        this.selectedImageFile = null;
        this.showEmojiPicker = false;
        this.isPosting = false;
        
        this.postCreated.emit();
      },
      error: (error) => {
        this.isPosting = false;
        this.toastService.error('Error', 'Failed to create post. Please try again.');
        console.error('Create post error:', error);
      }
    });
  }

  toggleEmojiPicker(): void {
    this.showEmojiPicker = !this.showEmojiPicker;
  }

  addEmoji(emoji: string): void {
    this.postContent += emoji;
    this.showEmojiPicker = false;
  }

  onTextareaInput(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  }
}
