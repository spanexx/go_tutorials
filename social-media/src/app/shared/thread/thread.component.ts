// Code Map: thread.component.ts
// - ThreadComponent: Threaded conversation view for nested replies
// - Visual nesting with indentation and lines
// - Collapse/expand individual threads
// - Show reply count on collapsed threads
// - Show more for long threads (maxDepth display)
// CID: Phase-2 Milestone 2.2 - Comments & Replies System
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, CornerDownRight, MessageSquare } from 'lucide-angular';
import { Comment } from '../../models/comment.model';
import { CommentComponent } from '../comment/comment.component';

const MAX_VISIBLE_REPLIES = 3;

@Component({
  selector: 'app-thread',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, CommentComponent],
  template: `
    <div class="thread" [class.collapsed]="collapsed">
      <!-- Parent Comment -->
      <div class="thread-parent">
        <app-comment
          [comment]="comment"
          [depth]="depth"
          (replyClicked)="replyClicked.emit($event)"
          (likeClicked)="likeClicked.emit($event)">
        </app-comment>
      </div>

      <!-- Replies -->
      @if (hasReplies && !collapsed) {
        <div class="thread-replies" [style.padding-left]="indentSize * depth + 'px'">
          <!-- Show More Button -->
          @if (showMoreVisible) {
            <button class="show-more-btn" (click)="showMore()">
              Show {{ hiddenReplies }} more {{ hiddenReplies === 1 ? 'reply' : 'replies' }}
              <lucide-icon [img]="messageIcon" [size]="14"></lucide-icon>
            </button>
          }

          <!-- Visible Replies -->
          @for (reply of visibleReplies; track reply.id) {
            <div class="reply-item">
              @if (reply.replies && reply.replies.length > 0) {
                <!-- Nested Thread -->
                <app-thread
                  [comment]="reply"
                  [depth]="depth + 1"
                  [maxDepth]="maxDepth"
                  (replyClicked)="replyClicked.emit($event)"
                  (likeClicked)="likeClicked.emit($event)">
                </app-thread>
              } @else {
                <!-- Simple Reply -->
                <app-comment
                  [comment]="reply"
                  [depth]="depth + 1"
                  (replyClicked)="replyClicked.emit($event)"
                  (likeClicked)="likeClicked.emit($event)">
                </app-comment>
              }
            </div>
          }

          <!-- Collapse Thread Button -->
          @if (totalReplies > 0) {
            <button class="collapse-thread-btn" (click)="toggleCollapse()">
              <lucide-icon [img]="cornerIcon" [size]="14"></lucide-icon>
              <span>Collapse {{ totalReplies }} {{ totalReplies === 1 ? 'reply' : 'replies' }}</span>
            </button>
          }
        </div>
      }

      <!-- Collapsed Reply Summary -->
      @if (collapsed && hasReplies) {
        <div class="thread-collapsed" (click)="toggleCollapse()">
          <button class="expand-summary-btn">
            <lucide-icon [img]="cornerIcon" [size]="14"></lucide-icon>
            <span class="reply-count">{{ totalReplies }}</span>
            <lucide-icon [img]="messageIcon" [size]="14"></lucide-icon>
            <span class="expand-text">Click to expand</span>
          </button>
        </div>
      }
    </div>
  `,
  styles: [`
    .thread {
      position: relative;
    }

    .thread.collapsed .thread-parent {
      border-bottom: none;
    }

    .thread-replies {
      position: relative;
    }

    .thread-replies::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 2px;
      background: #e5e7eb;
    }

    .reply-item {
      margin-left: 16px;
    }

    .show-more-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      margin: 8px 0;
      border: none;
      background: #f9fafb;
      color: #667eea;
      cursor: pointer;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.2s;
    }

    .show-more-btn:hover {
      background: #f3f4f6;
    }

    .collapse-thread-btn {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 12px;
      margin-top: 8px;
      border: none;
      background: transparent;
      color: #9ca3af;
      cursor: pointer;
      border-radius: 6px;
      font-size: 12px;
      transition: all 0.2s;
    }

    .collapse-thread-btn:hover {
      background: #f9fafb;
      color: #6b7280;
    }

    .thread-collapsed {
      padding: 8px 0;
    }

    .expand-summary-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border: 1px dashed #e5e7eb;
      background: #f9fafb;
      color: #6b7280;
      cursor: pointer;
      border-radius: 6px;
      font-size: 13px;
      transition: all 0.2s;
    }

    .expand-summary-btn:hover {
      border-color: #667eea;
      color: #667eea;
      background: #f3f4f6;
    }

    .reply-count {
      font-weight: 600;
      color: #1f2937;
    }

    .expand-text {
      font-size: 12px;
      color: #9ca3af;
    }

    @media (max-width: 640px) {
      .reply-item {
        margin-left: 8px;
      }

      .thread-replies::before {
        left: 4px;
      }
    }
  `]
})
export class ThreadComponent {
  messageIcon = MessageSquare;
  cornerIcon = CornerDownRight;

  @Input() comment!: Comment;
  @Input() depth: number = 0;
  @Input() maxDepth: number = 5;
  @Output() replyClicked = new EventEmitter<{ commentId: string; parentId: string }>();
  @Output() likeClicked = new EventEmitter<{ commentId: string }>();

  collapsed = false;
  showAll = false;

  get hasReplies(): boolean {
    return this.comment.replies && this.comment.replies.length > 0;
  }

  get totalReplies(): number {
    return this.countAllReplies(this.comment);
  }

  get visibleReplies(): Comment[] {
    if (!this.hasReplies) return [];
    
    const replies = this.comment.replies;
    if (this.showAll || replies.length <= MAX_VISIBLE_REPLIES) {
      return replies;
    }
    return replies.slice(0, MAX_VISIBLE_REPLIES);
  }

  get showMoreVisible(): boolean {
    return this.hasReplies && 
           !this.showAll && 
           this.comment.replies.length > MAX_VISIBLE_REPLIES;
  }

  get hiddenReplies(): number {
    return this.comment.replies.length - MAX_VISIBLE_REPLIES;
  }

  get indentSize(): number {
    return 24; // pixels per depth level
  }

  private countAllReplies(comment: Comment): number {
    if (!comment.replies || comment.replies.length === 0) {
      return 0;
    }
    
    let count = comment.replies.length;
    for (const reply of comment.replies) {
      count += this.countAllReplies(reply);
    }
    return count;
  }

  toggleCollapse(): void {
    this.collapsed = !this.collapsed;
    if (!this.collapsed) {
      this.showAll = false;
    }
  }

  showMore(): void {
    this.showAll = true;
  }
}
