/**
 * MessageInputComponent
 *
 * Message input with send functionality:
 * - Text input field
 * - Send button (disabled when empty)
 * - Enter key to send
 * - Auto-resize textarea
 * - Emoji picker (placeholder)
 * - File attachment (placeholder)
 * - Typing indicator trigger
 *
 * CID: Phase-3 Milestone 3.6 - Messages Enhancement
 */
import { Component, Output, EventEmitter, signal, computed, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Send, Smile, Paperclip, Loader2 } from 'lucide-angular';

@Component({
  selector: 'app-message-input',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="message-input-container">
      <!-- Input Wrapper -->
      <div class="input-wrapper">
        <!-- Emoji Picker Button (Placeholder) -->
        <button
          type="button"
          class="action-button emoji-button"
          title="Add emoji"
          (click)="onEmojiClick()"
        >
          <lucide-icon [img]="smileIcon" [size]="20"></lucide-icon>
        </button>

        <!-- Textarea with Auto-Resize -->
        <textarea
          #messageTextarea
          [placeholder]="placeholder"
          [value]="message()"
          (input)="onInput($event)"
          (keydown)="onKeydown($event)"
          (focus)="onFocus()"
          (blur)="onBlur()"
          class="message-textarea"
          [disabled]="isSending()"
          rows="1"
        ></textarea>

        <!-- File Attachment Button (Placeholder) -->
        <button
          type="button"
          class="action-button attachment-button"
          title="Attach file"
          (click)="onAttachmentClick()"
        >
          <lucide-icon [img]="paperclipIcon" [size]="20"></lucide-icon>
        </button>
      </div>

      <!-- Send Button -->
      <button
        type="button"
        class="send-button"
        [disabled]="!canSend()"
        [class.sending]="isSending()"
        (click)="onSend()"
        title="Send message"
      >
        @if (isSending()) {
          <lucide-icon [img]="loaderIcon" [size]="20" class="spin"></lucide-icon>
        } @else {
          <lucide-icon [img]="sendIcon" [size]="20"></lucide-icon>
        }
      </button>

      <!-- Hidden File Input -->
      <input
        #fileInput
        type="file"
        [accept]="acceptedFileTypes"
        [multiple]="allowMultipleFiles"
        class="hidden-file-input"
        (change)="onFileSelected($event)"
      />
    </div>
  `,
  styles: [`
    .message-input-container {
      display: flex;
      gap: 0.75rem;
      padding: 1rem;
      background: hsl(var(--background));
      border-top: 1px solid hsl(var(--border));
      align-items: flex-end;
    }

    .input-wrapper {
      flex: 1;
      display: flex;
      gap: 0.5rem;
      align-items: flex-end;
      background: hsl(var(--muted));
      border: 1px solid hsl(var(--border));
      border-radius: calc(var(--radius) - 2px);
      padding: 0.5rem;
      transition: border-color 0.2s, box-shadow 0.2s;

      &:has(.message-textarea:focus) {
        border-color: hsl(var(--ring));
        box-shadow: 0 0 0 2px hsl(var(--ring) / 0.2);
      }
    }

    .action-button {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      width: 36px;
      height: 36px;
      border: none;
      background: transparent;
      border-radius: calc(var(--radius) - 2px);
      color: hsl(var(--muted-foreground));
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        background: hsl(var(--background));
        color: hsl(var(--foreground));
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    .emoji-button {
      align-self: flex-end;
    }

    .attachment-button {
      align-self: flex-end;
    }

    .message-textarea {
      flex: 1;
      min-height: 24px;
      max-height: 120px;
      padding: 0.5rem 0.75rem;
      border: none;
      background: transparent;
      color: hsl(var(--foreground));
      font-size: 0.9375rem;
      font-family: inherit;
      resize: none;
      line-height: 1.5;

      &::placeholder {
        color: hsl(var(--muted-foreground));
      }

      &:focus {
        outline: none;
      }

      /* Hide scrollbar but allow scrolling */
      &::-webkit-scrollbar {
        display: none;
      }
      -ms-overflow-style: none;
      scrollbar-width: none;
    }

    .send-button {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      width: 44px;
      height: 44px;
      border: none;
      background: hsl(var(--primary));
      color: hsl(var(--primary-foreground));
      border-radius: calc(var(--radius) - 2px);
      cursor: pointer;
      transition: all 0.2s;

      &:hover:not(:disabled) {
        background: hsl(var(--primary) / 0.9);
        transform: scale(1.05);
      }

      &:disabled {
        background: hsl(var(--muted));
        color: hsl(var(--muted-foreground));
        cursor: not-allowed;
      }

      &.sending {
        background: hsl(var(--muted));
        cursor: wait;
      }

      .spin {
        animation: spin 1s linear infinite;
      }
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .hidden-file-input {
      display: none;
    }
  `]
})
export class MessageInputComponent implements AfterViewInit, OnDestroy {
  @Output() send = new EventEmitter<string>();
  @Output() attachmentSelected = new EventEmitter<FileList>();
  @Output() emojiPicker = new EventEmitter<void>();
  @Output() typingStart = new EventEmitter<void>();
  @Output() typingEnd = new EventEmitter<void>();

  smileIcon = Smile;
  paperclipIcon = Paperclip;
  sendIcon = Send;
  loaderIcon = Loader2;

  message = signal('');
  isSending = signal(false);
  isFocused = signal(false);

  @ViewChild('messageTextarea') messageTextarea?: ElementRef<HTMLTextAreaElement>;
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  // Configuration inputs
  placeholder = 'Type a message...';
  acceptedFileTypes = 'image/*,application/pdf';
  allowMultipleFiles = false;
  maxMessageLength = 2000;

  /**
   * Check if message can be sent
   */
  canSend = computed(() => {
    const msg = this.message().trim();
    return msg.length > 0 && msg.length <= this.maxMessageLength && !this.isSending();
  });

  ngAfterViewInit(): void {
    this.autoResize();
  }

  /**
   * Handle input event
   */
  onInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.message.set(target.value);
    this.autoResize();

    // Trigger typing indicator
    if (!this.isFocused()) {
      this.typingStart.emit();
    }
  }

  /**
   * Handle keydown event
   */
  onKeydown(event: KeyboardEvent): void {
    // Enter to send (without Shift)
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.onSend();
    }
  }

  /**
   * Handle focus event
   */
  onFocus(): void {
    this.isFocused.set(true);
  }

  /**
   * Handle blur event
   */
  onBlur(): void {
    this.isFocused.set(false);
    this.typingEnd.emit();
  }

  /**
   * Auto-resize textarea based on content
   */
  private autoResize(): void {
    const textarea = this.messageTextarea?.nativeElement;
    if (!textarea) return;

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';

    // Calculate new height
    const newHeight = Math.min(textarea.scrollHeight, 120); // Max 120px
    textarea.style.height = `${newHeight}px`;
  }

  /**
   * Handle send button click
   */
  onSend(): void {
    const msg = this.message().trim();
    if (!msg || !this.canSend()) return;

    this.isSending.set(true);
    this.send.emit(msg);
  }

  /**
   * Complete send operation (called by parent after message is sent)
   */
  completeSend(): void {
    this.message.set('');
    this.isSending.set(false);

    // Reset textarea height
    setTimeout(() => this.autoResize(), 0);
  }

  /**
   * Handle emoji button click
   */
  onEmojiClick(): void {
    this.emojiPicker.emit();
    // Emoji picker integration to be implemented
  }

  /**
   * Handle attachment button click
   */
  onAttachmentClick(): void {
    this.fileInput?.nativeElement.click();
  }

  /**
   * Handle file selection
   */
  onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      this.attachmentSelected.emit(target.files);
    }
    // Reset input value to allow selecting the same file again
    target.value = '';
  }

  /**
   * Set sending state from parent
   */
  setSendingState(sending: boolean): void {
    this.isSending.set(sending);
  }
}
