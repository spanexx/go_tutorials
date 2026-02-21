// Code Map: follow-button.component.ts
// - FollowButtonComponent: Follow/unfollow button with state management
// - Shows 'Follow' when not following, 'Following' when following
// - Hover on 'Following' shows 'Unfollow' style
// - Loading state during action
// - Success feedback with toast
// - Prevents self-follow
// - Works on profile pages and cards
// CID: Phase-2 Milestone 2.5 - Social Graph (Follow System)
import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, UserPlus, Check, Loader } from 'lucide-angular';
import { FollowService } from '../../services/follow.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-follow-button',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    @if (isCurrentUser) {
      <span class="self-note" title="You cannot follow yourself">
        <lucide-icon [img]="userIcon" [size]="14"></lucide-icon>
        <span>Your Profile</span>
      </span>
    } @else {
      <button
        class="follow-btn"
        [class.following]="isFollowing"
        [class.loading]="isLoading"
        [disabled]="isLoading"
        (click)="handleClick()"
        [attr.aria-label]="buttonLabel"
      >
        @if (isLoading) {
          <lucide-icon [img]="loaderIcon" [size]="16" class="spinner"></lucide-icon>
          <span>{{ isFollowing ? 'Unfollowing...' : 'Following...' }}</span>
        } @else if (isFollowing) {
          <lucide-icon [img]="checkIcon" [size]="16"></lucide-icon>
          <span>Following</span>
        } @else {
          <lucide-icon [img]="userPlusIcon" [size]="16"></lucide-icon>
          <span>Follow</span>
        }
      </button>
    }
  `,
  styles: [`
    .follow-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.625rem 1.25rem;
      border: 1px solid hsl(var(--border));
      background: hsl(var(--background));
      color: hsl(var(--foreground));
      border-radius: calc(var(--radius) - 0.25rem);
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;

      &:hover:not(:disabled) {
        background: hsl(var(--accent));
        color: hsl(var(--accent-foreground));
        border-color: hsl(var(--accent));
      }

      &.following {
        background: hsl(var(--foreground));
        color: hsl(var(--background));
        border-color: hsl(var(--foreground));

        &:hover:not(:disabled) {
          background: hsl(var(--destructive));
          color: hsl(var(--destructive-foreground));
          border-color: hsl(var(--destructive));
        }
      }

      &:disabled {
        opacity: 0.7;
        cursor: not-allowed;
      }

      .spinner {
        animation: spin 1s linear infinite;
      }
    }

    .self-note {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.625rem 1.25rem;
      border: 1px dashed hsl(var(--border));
      background: hsl(var(--muted) / 0.3);
      color: hsl(var(--muted-foreground));
      border-radius: calc(var(--radius) - 0.25rem);
      font-size: 0.875rem;
      font-weight: 500;
      cursor: default;

      lucide-icon {
        width: 16px;
        height: 16px;
      }
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    :host(.compact) .follow-btn {
      padding: 0.375rem 0.75rem;
      font-size: 0.8rem;
      gap: 0.375rem;

      lucide-icon {
        width: 14px;
        height: 14px;
      }
    }

    :host(.compact) .self-note {
      padding: 0.375rem 0.75rem;
      font-size: 0.8rem;
    }
  `]
})
export class FollowButtonComponent implements OnInit {
  userPlusIcon = UserPlus;
  checkIcon = Check;
  loaderIcon = Loader;
  userIcon = UserPlus;

  @Input() userId!: string;
  @Input() username?: string;
  @Input() compact = false;

  isFollowing = false;
  isLoading = false;
  isCurrentUser = false;

  constructor(
    private followService: FollowService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    this.checkFollowStatus();
  }

  get buttonLabel(): string {
    if (this.isCurrentUser) {
      return 'Your profile';
    }
    if (this.isLoading) {
      return this.isFollowing ? 'Unfollowing...' : 'Following...';
    }
    return this.isFollowing ? 'Unfollow' : 'Follow';
  }

  private checkFollowStatus(): void {
    const currentUserId = this.followService.currentUserId();
    
    if (this.userId === currentUserId) {
      this.isCurrentUser = true;
      return;
    }

    this.isFollowing = this.followService.isFollowing(this.userId);
  }

  async handleClick(): Promise<void> {
    if (this.isLoading || this.isCurrentUser) {
      return;
    }

    this.isLoading = true;

    try {
      const success = await this.followService.toggleFollow(this.userId);

      if (success) {
        this.isFollowing = !this.isFollowing;
        
        if (this.isFollowing) {
          this.toastService.success(
            'Success',
            `You are now following ${this.username || 'this user'}`
          );
        } else {
          this.toastService.info(
            'Unfollowed',
            `You have unfollowed ${this.username || 'this user'}`
          );
        }
      } else {
        this.toastService.error('Error', 'Failed to update follow status');
      }
    } catch (error) {
      console.error('Follow toggle error:', error);
      this.toastService.error('Error', 'An unexpected error occurred');
    } finally {
      this.isLoading = false;
    }
  }

  refresh(): void {
    this.checkFollowStatus();
  }
}
