// Code Map: comment-input.component.ts
// - CommentInputComponent: Textarea form for adding comments/replies
// - Character count (max 280), submit/cancel buttons
// - Auto-focus when replying, keyboard shortcut (R to reply)
// - Loading state during submission
// CID: Phase-2 Milestone 2.2 - Comments & Replies System
import { Component, Input, Output, EventEmitter, ElementRef, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Send, X, Loader } from 'lucide-angular';

const MAX_CHARS = 280;

@Component({
  selector: 'app-comment-input',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="comment-input-container" [class.is-reply]="isReply">
      <div class="input-wrapper">
        <textarea
          #commentTextarea
          class="comment-textarea"
          [placeholder]="placeholder"
          [(ngModel)]="commentText"
          [disabled]="isSubmitting"
          [maxlength]="MAX_CHARS"
          (input)="onInput()"
          (keydown.control.enter)="onSubmit()"
          (keydown.meta.enter)="onSubmit()"
          (keydown.escape)="onCancel()"
          rows="3"
          [attr.aria-label]="isReply ? 'Write a reply' : 'Write a comment'"
        ></textarea>

        <div class="input-footer">
          <div class="char-count" [class.warning]="remainingChars < 50" [class.danger]="remainingChars <= 0">
            {{ remainingChars }} / {{ MAX_CHARS }}
          </div>

          <div class="input-actions">
            @if (isReply) {
              <button
                class="btn btn-cancel"
                (click)="onCancel()"
                [disabled]="isSubmitting"
                [attr.aria-label]="'Cancel reply'"
              >
                <lucide-icon [img]="xIcon" [size]="16"></lucide-icon>
                <span>Cancel</span>
              </button>
            }

            <button
              class="btn btn-submit"
              (click)="onSubmit()"
              [disabled]="!canSubmit || isSubmitting"
              [attr.aria-label]="isReply ? 'Submit reply' : 'Submit comment'"
            >
              @if (isSubmitting) {
                <lucide-icon [img]="loaderIcon" [size]="16" class="spinner"></lucide-icon>
                <span>{{ isReply ? 'Replying...' : 'Posting...' }}</span>
              } @else {
                <lucide-icon [img]="sendIcon" [size]="16"></lucide-icon>
                <span>{{ isReply ? 'Reply' : 'Post' }}</span>
              }
            </button>
          </div>
        </div>
      </div>

      @if (isReply) {
        <div class="reply-hint">
          <kbd>Ctrl</kbd> + <kbd>Enter</kbd> to submit · <kbd>Esc</kbd> to cancel
        </div>
      }
    </div>
  `,
  styles: [`
    .comment-input-container {
      padding: 16px 0;
    }

    .comment-input-container.is-reply {
      padding: 12px 0;
    }

    .input-wrapper {
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      overflow: hidden;
      transition: border-color 0.2s;
    }

    .input-wrapper:focus-within {
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }

    .comment-textarea {
      width: 100%;
      padding: 12px;
      border: none;
      resize: vertical;
      font-family: inherit;
      font-size: 14px;
      line-height: 1.5;
      color: #1f2937;
      min-height: 80px;
      max-height: 200px;
    }

    .comment-textarea:focus {
      outline: none;
    }

    .comment-textarea:disabled {
      background: #f9fafb;
      cursor: not-allowed;
    }

    .input-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      background: #f9fafb;
      border-top: 1px solid #e5e7eb;
    }

    .char-count {
      font-size: 12px;
      color: #9ca3af;
      font-weight: 500;
    }

    .char-count.warning {
      color: #f59e0b;
    }

    .char-count.danger {
      color: #ef4444;
    }

    .input-actions {
      display: flex;
      gap: 8px;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 16px;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-cancel {
      background: #f3f4f6;
      color: #6b7280;
    }

    .btn-cancel:hover:not(:disabled) {
      background: #e5e7eb;
      color: #374151;
    }

    .btn-submit {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .btn-submit:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    .spinner {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .reply-hint {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-top: 8px;
      font-size: 11px;
      color: #9ca3af;
    }

    kbd {
      display: inline-block;
      padding: 2px 6px;
      background: #f3f4f6;
      border: 1px solid #e5e7eb;
      border-radius: 4px;
      font-family: monospace;
      font-size: 10px;
    }

    @media (max-width: 640px) {
      .input-footer {
        flex-direction: column;
        gap: 8px;
        align-items: flex-start;
      }

      .input-actions {
        width: 100%;
        justify-content: flex-end;
      }

      .btn span {
        display: none;
      }

      .reply-hint {
        justify-content: flex-end;
      }
    }
  `]
})
export class CommentInputComponent implements AfterViewInit, OnDestroy {
  @ViewChild('commentTextarea') textareaRef!: ElementRef<HTMLTextAreaElement>;

  sendIcon = Send;
  xIcon = X;
  loaderIcon = Loader;

  @Input() isReply: boolean = false;
  @Input() placeholder: string = '';
  @Input() autoFocus: boolean = false;
  @Output() submitted = new EventEmitter<string>();
  @Output() cancelled = new EventEmitter<void>();

  commentText: string = '';
  isSubmitting: boolean = false;
  readonly MAX_CHARS = MAX_CHARS;

  private keyboardListener?: (event: KeyboardEvent) => void;

  constructor(private elementRef: ElementRef) {}

  ngAfterViewInit(): void {
    if (this.autoFocus && this.textareaRef) {
      this.textareaRef.nativeElement.focus();
    }

    // Set up keyboard shortcut listener (R to reply when not in input)
    if (!this.isReply) {
      this.keyboardListener = (event: KeyboardEvent) => {
        // Only trigger if not already in an input/textarea
        if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
          return;
        }
        
        if (event.key === 'r' && !event.ctrlKey && !event.metaKey) {
          // Emit event to focus this input (parent should handle)
          this.elementRef.nativeElement.dispatchEvent(new CustomEvent('focusInput'));
        }
      };

      document.addEventListener('keydown', this.keyboardListener);
    }
  }

  ngOnDestroy(): void {
    if (this.keyboardListener) {
      document.removeEventListener('keydown', this.keyboardListener);
    }
  }

  get remainingChars(): number {
    return this.MAX_CHARS - this.commentText.length;
  }

  get canSubmit(): boolean {
    return this.commentText.trim().length > 0 && this.remainingChars > 0;
  }

  get defaultPlaceholder(): string {
    if (this.placeholder) {
      return this.placeholder;
    }
    return this.isReply 
      ? 'Write a reply...' 
      : 'Share your thoughts...';
  }

  onInput(): void {
    // Auto-resize textarea
    if (this.textareaRef) {
      const textarea = this.textareaRef.nativeElement;
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
    }
  }

  onSubmit(): void {
    if (!this.canSubmit || this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;
    const comment = this.commentText.trim();
    
    // Emit the comment text to parent
    this.submitted.emit(comment);
    
    // Clear input after emit (parent should handle actual submission)
    // The parent will call reset() when done
  }

  onCancel(): void {
    this.cancelled.emit();
    this.reset();
  }

  reset(): void {
    this.commentText = '';
    this.isSubmitting = false;
    if (this.textareaRef) {
      this.textareaRef.nativeElement.style.height = 'auto';
    }
  }

  completeSubmission(): void {
    this.isSubmitting = false;
    this.reset();
  }

  focus(): void {
    if (this.textareaRef) {
      this.textareaRef.nativeElement.focus();
    }
  }
}
