// Code Map: comment.component.ts
// - CommentComponent: Individual comment with author info, content, and actions
// - Author avatar and name linking to profile
// - Relative timestamp, reply button, like button placeholder
// - Nested replies indicator and collapsible threads
// CID: Phase-2 Milestone 2.2 - Comments & Replies System
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Heart, Reply, MoreHorizontal, ChevronDown, ChevronRight } from 'lucide-angular';
import { Comment } from '../../models/comment.model';

@Component({
  selector: 'app-comment',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="comment" [class.has-replies]="hasReplies" [class.collapsed]="collapsed">
      <div class="comment-avatar">
        <img [src]="comment.author.avatar" [alt]="comment.author.name" class="avatar" />
      </div>

      <div class="comment-body">
        <div class="comment-header">
          <div class="author-info">
            <span class="author-name" [attr.title]="'View profile of ' + comment.author.name">
              {{ comment.author.name }}
            </span>
            <span class="author-username">@{{ comment.author.username }}</span>
            <span class="comment-timestamp" [attr.title]="comment.createdAt | date:'medium'">
              {{ getRelativeTime(comment.createdAt) }}
            </span>
          </div>
        </div>

        <p class="comment-content">{{ comment.content }}</p>

        <div class="comment-actions">
          <button 
            class="action-btn like-btn" 
            [class.liked]="comment.isLiked"
            (click)="onLike()"
            [attr.aria-label]="'Like comment with ' + comment.likes + ' likes'"
          >
            <lucide-icon [img]="heartIcon" [size]="14"></lucide-icon>
            <span class="action-count">{{ comment.likes }}</span>
          </button>

          <button 
            class="action-btn reply-btn"
            (click)="onReply()"
            [attr.aria-label]="'Reply to comment'"
          >
            <lucide-icon [img]="replyIcon" [size]="14"></lucide-icon>
            <span class="action-label">Reply</span>
          </button>

          @if (hasReplies) {
            <button 
              class="action-btn collapse-btn"
              (click)="toggleCollapse()"
              [attr.aria-label]="collapsed ? 'Expand replies' : 'Collapse replies'"
              [attr.aria-expanded]="!collapsed"
            >
              <lucide-icon [img]="collapsed ? chevronRightIcon : chevronDownIcon" [size]="14"></lucide-icon>
              <span class="action-label">{{ replyCount }} {{ replyCount === 1 ? 'reply' : 'replies' }}</span>
            </button>
          }

          <button class="action-btn more-btn" [attr.aria-label]="'More options'">
            <lucide-icon [img]="moreIcon" [size]="14"></lucide-icon>
          </button>
        </div>

        @if (hasReplies && !collapsed) {
          <div class="comment-replies">
            @for (reply of comment.replies; track reply.id) {
              <app-comment 
                [comment]="reply" 
                [depth]="depth + 1"
                (replyClicked)="replyClicked.emit($event)"
                (likeClicked)="likeClicked.emit($event)">
              </app-comment>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .comment {
      display: flex;
      gap: 12px;
      padding: 12px 0;
      border-bottom: 1px solid #e5e7eb;
    }

    .comment:last-child {
      border-bottom: none;
    }

    .comment.has-replies {
      padding-bottom: 4px;
    }

    .comment.collapsed .comment-body {
      opacity: 0.7;
    }

    .comment-avatar {
      flex-shrink: 0;
    }

    .avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      object-fit: cover;
    }

    .comment-body {
      flex: 1;
      min-width: 0;
    }

    .comment-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
    }

    .author-info {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .author-name {
      font-weight: 600;
      color: #1f2937;
      font-size: 14px;
      cursor: pointer;
    }

    .author-name:hover {
      text-decoration: underline;
    }

    .author-username {
      color: #6b7280;
      font-size: 13px;
    }

    .comment-timestamp {
      color: #9ca3af;
      font-size: 12px;
    }

    .comment-content {
      color: #1f2937;
      font-size: 14px;
      line-height: 1.5;
      margin: 0 0 10px 0;
      word-wrap: break-word;
    }

    .comment-actions {
      display: flex;
      gap: 16px;
      align-items: center;
    }

    .action-btn {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      border: none;
      background: transparent;
      color: #6b7280;
      cursor: pointer;
      border-radius: 4px;
      transition: all 0.2s;
      font-size: 13px;
    }

    .action-btn:hover {
      background: #f3f4f6;
      color: #1f2937;
    }

    .like-btn.liked {
      color: #ef4444;
    }

    .like-btn.liked:hover {
      background: #fef2f2;
    }

    .action-count {
      font-weight: 500;
    }

    .action-label {
      font-weight: 500;
    }

    .collapse-btn {
      color: #6b7280;
    }

    .collapse-btn:hover {
      color: #1f2937;
    }

    .comment-replies {
      margin-top: 8px;
      padding-left: 12px;
      border-left: 2px solid #e5e7eb;
    }

    @media (max-width: 640px) {
      .avatar {
        width: 32px;
        height: 32px;
      }

      .comment-content {
        font-size: 13px;
      }

      .action-btn {
        padding: 4px 6px;
        font-size: 12px;
      }

      .action-label {
        display: none;
      }
    }
  `]
})
export class CommentComponent {
  heartIcon = Heart;
  replyIcon = Reply;
  moreIcon = MoreHorizontal;
  chevronDownIcon = ChevronDown;
  chevronRightIcon = ChevronRight;

  @Input() comment!: Comment;
  @Input() depth: number = 0;
  @Output() replyClicked = new EventEmitter<{ commentId: string; parentId: string }>();
  @Output() likeClicked = new EventEmitter<{ commentId: string }>();

  collapsed = false;

  get hasReplies(): boolean {
    return this.comment.replies && this.comment.replies.length > 0;
  }

  get replyCount(): number {
    return this.comment.replies?.length || 0;
  }

  getRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) {
      return 'just now';
    } else if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return new Date(date).toLocaleDateString();
    }
  }

  onLike(): void {
    this.likeClicked.emit({ commentId: this.comment.id });
  }

  onReply(): void {
    this.replyClicked.emit({ 
      commentId: this.comment.id, 
      parentId: this.comment.parentId || this.comment.id 
    });
  }

  toggleCollapse(): void {
    this.collapsed = !this.collapsed;
  }
}
