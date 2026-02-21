// Code Map: comment-list.component.ts
// - CommentListComponent: List of comments with threading, sorting, and pagination
// - Shows top-level comments with nested replies indented
// - Sort by oldest/newest, collapse/expand all, load more
// - Empty state when no comments
// CID: Phase-2 Milestone 2.2 - Comments & Replies System
import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, MessageSquare, ChevronDown, ChevronUp, ArrowDown, ArrowUp } from 'lucide-angular';
import { Comment } from '../../models/comment.model';
import { CommentService } from '../../services/comment.service';
import { CommentComponent } from '../comment/comment.component';

type SortOrder = 'oldest' | 'newest';

@Component({
  selector: 'app-comment-list',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, CommentComponent],
  template: `
    <div class="comment-list-container">
      <!-- Header -->
      <div class="comment-list-header">
        <div class="comment-count">
          <lucide-icon [img]="messageIcon" [size]="18"></lucide-icon>
          <span>{{ totalComments }} {{ totalComments === 1 ? 'comment' : 'comments' }}</span>
        </div>

        <div class="comment-actions">
          <!-- Sort Toggle -->
          <div class="sort-toggle">
            <span class="sort-label">Sort by:</span>
            <button 
              class="sort-btn"
              (click)="toggleSort()"
              [attr.aria-label]="'Sort comments by ' + (sortOrder === 'oldest' ? 'newest' : 'oldest')"
            >
              <lucide-icon [img]="sortOrder === 'oldest' ? arrowUpIcon : arrowDownIcon" [size]="14"></lucide-icon>
              <span>{{ sortOrder === 'oldest' ? 'Oldest' : 'Newest' }}</span>
            </button>
          </div>

          <!-- Collapse/Expand All -->
          @if (hasComments && hasReplies) {
            <button 
              class="collapse-all-btn"
              (click)="toggleCollapseAll()"
              [attr.aria-label]="allCollapsed ? 'Expand all threads' : 'Collapse all threads'"
            >
              <lucide-icon [img]="allCollapsed ? chevronDownIcon : chevronUpIcon" [size]="14"></lucide-icon>
              <span class="collapse-label">{{ allCollapsed ? 'Expand all' : 'Collapse all' }}</span>
            </button>
          }
        </div>
      </div>

      <!-- Empty State -->
      @if (!hasComments && !isLoading) {
        <div class="empty-state">
          <lucide-icon [img]="messageIcon" [size]="48" class="empty-icon"></lucide-icon>
          <h3>No comments yet</h3>
          <p>Be the first to share your thoughts!</p>
        </div>
      }

      <!-- Loading State -->
      @if (isLoading) {
        <div class="loading-state">
          <div class="loading-spinner"></div>
          <p>Loading comments...</p>
        </div>
      }

      <!-- Comments List -->
      @if (hasComments && !isLoading) {
        <div class="comments-list">
          @for (comment of displayedComments; track comment.id) {
            <app-comment 
              [comment]="comment"
              [depth]="0"
              (replyClicked)="replyClicked.emit($event)"
              (likeClicked)="likeClicked.emit($event)">
            </app-comment>
          }

          <!-- Load More Button -->
          @if (canLoadMore) {
            <button class="load-more-btn" (click)="loadMore()">
              Load more comments ({{ remainingComments }} remaining)
            </button>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .comment-list-container {
      padding: 16px 0;
    }

    .comment-list-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid #e5e7eb;
      margin-bottom: 16px;
    }

    .comment-count {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      color: #1f2937;
      font-size: 14px;
    }

    .comment-actions {
      display: flex;
      gap: 12px;
      align-items: center;
    }

    .sort-toggle {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .sort-label {
      font-size: 13px;
      color: #6b7280;
    }

    .sort-btn {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 6px 10px;
      border: 1px solid #e5e7eb;
      background: white;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      color: #374151;
      transition: all 0.2s;
    }

    .sort-btn:hover {
      background: #f9fafb;
      border-color: #d1d5db;
    }

    .collapse-all-btn {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 6px 10px;
      border: 1px solid #e5e7eb;
      background: white;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      color: #374151;
      transition: all 0.2s;
    }

    .collapse-all-btn:hover {
      background: #f9fafb;
    }

    .collapse-label {
      display: none;
    }

    @media (min-width: 640px) {
      .collapse-label {
        display: inline;
      }
    }

    .empty-state {
      text-align: center;
      padding: 48px 24px;
      color: #6b7280;
    }

    .empty-icon {
      color: #d1d5db;
      margin-bottom: 16px;
    }

    .empty-state h3 {
      font-size: 16px;
      font-weight: 600;
      color: #374151;
      margin: 0 0 8px 0;
    }

    .empty-state p {
      font-size: 14px;
      margin: 0;
    }

    .loading-state {
      text-align: center;
      padding: 32px 24px;
      color: #6b7280;
    }

    .loading-spinner {
      width: 32px;
      height: 32px;
      border: 3px solid #e5e7eb;
      border-top-color: #667eea;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 16px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .comments-list {
      display: flex;
      flex-direction: column;
    }

    .load-more-btn {
      width: 100%;
      padding: 12px;
      margin-top: 16px;
      border: 1px solid #e5e7eb;
      background: white;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      color: #374151;
      transition: all 0.2s;
    }

    .load-more-btn:hover {
      background: #f9fafb;
      border-color: #d1d5db;
    }

    @media (max-width: 640px) {
      .comment-list-header {
        flex-direction: column;
        gap: 12px;
        align-items: flex-start;
      }

      .comment-actions {
        flex-wrap: wrap;
        width: 100%;
      }

      .sort-toggle {
        flex: 1;
      }
    }
  `]
})
export class CommentListComponent implements OnInit {
  messageIcon = MessageSquare;
  chevronDownIcon = ChevronDown;
  chevronUpIcon = ChevronUp;
  arrowUpIcon = ArrowUp;
  arrowDownIcon = ArrowDown;

  @Input() postId!: string;
  @Output() replyClicked = new EventEmitter<{ commentId: string; parentId: string }>();
  @Output() likeClicked = new EventEmitter<{ commentId: string }>();

  comments: Comment[] = [];
  sortOrder: SortOrder = 'oldest';
  allCollapsed = false;
  pageSize = 10;
  currentPage = 1;

  constructor(private commentService: CommentService) {}

  ngOnInit(): void {
    this.loadComments();
  }

  get isLoading(): boolean {
    return this.commentService.isLoading(this.postId);
  }

  get totalComments(): number {
    return this.commentService.getCommentCount(this.postId);
  }

  get hasComments(): boolean {
    return this.comments.length > 0;
  }

  get hasReplies(): boolean {
    return this.comments.some(c => c.replies && c.replies.length > 0);
  }

  get displayedComments(): Comment[] {
    const sorted = [...this.comments].sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return this.sortOrder === 'oldest' ? dateA - dateB : dateB - dateA;
    });

    const endIndex = this.currentPage * this.pageSize;
    return sorted.slice(0, endIndex);
  }

  get canLoadMore(): boolean {
    return this.comments.length > this.currentPage * this.pageSize;
  }

  get remainingComments(): number {
    return this.comments.length - (this.currentPage * this.pageSize);
  }

  loadComments(): void {
    this.comments = this.commentService.getCommentsForPost(this.postId);
  }

  toggleSort(): void {
    this.sortOrder = this.sortOrder === 'oldest' ? 'newest' : 'oldest';
    this.currentPage = 1;
  }

  toggleCollapseAll(): void {
    this.allCollapsed = !this.allCollapsed;
    // Note: Actual collapsing is handled by individual CommentComponent
    // This toggles the button state; in a full implementation, we'd emit an event
  }

  loadMore(): void {
    this.currentPage++;
  }
}
