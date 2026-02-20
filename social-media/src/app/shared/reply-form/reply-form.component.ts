import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Smile, Send, X } from 'lucide-angular';
import { ReplyService } from '../../shared/services/reply.service';
import { ToastService } from '../../shared/services/toast.service';

@Component({
  selector: 'app-reply-form',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './reply-form.component.html',
  styleUrls: ['./reply-form.component.scss']
})
export class ReplyFormComponent {
  @Input() postId!: number;
  @Input() parentReplyId?: number;
  @Input() placeholder: string = 'Write a reply...';
  @Input() autoFocus: boolean = false;
  @Output() replyAdded = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  smileIcon = Smile;
  sendIcon = Send;
  closeIcon = X;

  content = '';
  isFocused = false;
  isSubmitting = false;
  showEmojiPicker = false;

  readonly emojis = ['😀', '😂', '😍', '🥰', '😎', '🤔', '👍', '❤️', '🔥', '🎉', '👏', '💯'];

  constructor(
    private replyService: ReplyService,
    private toastService: ToastService
  ) {}

  get characterCount(): number {
    return this.content.length;
  }

  get maxLength(): number {
    return 280;
  }

  get remaining(): number {
    return this.maxLength - this.characterCount;
  }

  get isOverLimit(): boolean {
    return this.remaining < 0;
  }

  get canSubmit(): boolean {
    return this.content.trim().length > 0 && !this.isOverLimit && !this.isSubmitting;
  }

  onFocus(): void {
    this.isFocused = true;
  }

  onBlur(): void {
    if (!this.content.trim()) {
      this.isFocused = false;
    }
  }

  toggleEmojiPicker(): void {
    this.showEmojiPicker = !this.showEmojiPicker;
  }

  addEmoji(emoji: string): void {
    this.content += emoji;
    this.showEmojiPicker = false;
  }

  cancel(): void {
    this.content = '';
    this.isFocused = false;
    this.showEmojiPicker = false;
    this.cancelled.emit();
  }

  async onSubmit(): Promise<void> {
    if (!this.canSubmit) {
      return;
    }

    this.isSubmitting = true;

    try {
      this.replyService.addReply(this.postId, this.content.trim(), this.parentReplyId);
      this.toastService.success('Reply posted', 'Your reply has been added');
      
      this.content = '';
      this.isFocused = false;
      this.showEmojiPicker = false;
      this.replyAdded.emit();
    } catch (error) {
      this.toastService.error('Failed to post reply', 'Please try again');
    } finally {
      this.isSubmitting = false;
    }
  }
}
