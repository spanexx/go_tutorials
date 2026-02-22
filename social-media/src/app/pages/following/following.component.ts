// Code Map: following.component.ts
// - FollowingComponent: Following list page showing users a profile follows
// - Route: /profile/:id/following
// - List of followed users with user cards
// - User cards with follow/unfollow button
// - Infinite scroll for large lists
// - Empty state when not following anyone
// - Back to profile link
// CID: Phase-2 Milestone 2.5 - Social Graph (Follow System)
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { LucideAngularModule, ArrowLeft, Users, UserPlus } from 'lucide-angular';
import { FollowService } from '../../shared/services/follow.service';
import { UserService, UserProfile } from '../../shared/services/user.service';
import { FollowButtonComponent } from '../../shared/components/follow-button/follow-button.component';

interface FollowingUser {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  bio?: string;
  isFollowing: boolean;
}

@Component({
  selector: 'app-following',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule, FollowButtonComponent],
  template: `
    <div class="following-page">
      <div class="following-header">
        <a [routerLink]="['/profile', profileId]" class="back-link">
          <lucide-icon [img]="arrowIcon" [size]="20"></lucide-icon>
          <span>Back to Profile</span>
        </a>

        <div class="page-title">
          <lucide-icon [img]="usersIcon" class="page-icon"></lucide-icon>
          <h1>Following</h1>
          @if (totalCount > 0) {
            <span class="count-badge">{{ totalCount }}</span>
          }
        </div>
      </div>

      <div class="following-content">
        @if (isLoading && following.length === 0) {
          <div class="loading-state">
            <div class="loading-spinner"></div>
            <p>Loading...</p>
          </div>
        }

        @if (!isLoading && following.length === 0) {
          <div class="empty-state">
            <lucide-icon [img]="usersIcon" class="empty-icon"></lucide-icon>
            <h2>Not following anyone yet</h2>
            <p>{{ profileUsername }} is not following anyone yet</p>
            <a [routerLink]="['/profile', profileId]" class="back-btn">
              <lucide-icon [img]="arrowIcon" [size]="16"></lucide-icon>
              <span>Back to Profile</span>
            </a>
          </div>
        }

        @if (following.length > 0) {
          <div class="following-list">
            @for (user of displayedFollowing; track user.id) {
              <div class="following-card">
                <a [routerLink]="['/profile', user.id]" class="user-avatar">
                  <img [src]="user.avatar || '/avatars/default.jpg'" [alt]="user.name" />
                </a>

                <div class="user-info">
                  <a [routerLink]="['/profile', user.id]" class="user-name">
                    {{ user.name }}
                  </a>
                  <p class="user-username">&#64;{{ user.username }}</p>
                  @if (user.bio) {
                    <p class="user-bio">{{ user.bio }}</p>
                  }
                </div>

                <div class="user-action">
                  <app-follow-button
                    [userId]="user.id"
                    [username]="user.username"
                    [compact]="true">
                  </app-follow-button>
                </div>
              </div>
            }

            @if (canLoadMore) {
              <div class="load-more-indicator">
                <div class="loading-spinner"></div>
                <p>Loading more...</p>
              </div>
            }

            @if (!canLoadMore && displayedFollowing.length === following.length) {
              <div class="end-of-list">
                <p>You've seen all {{ totalCount }} following</p>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .following-page {
      max-width: 800px;
      margin: 0 auto;
      padding: 1.5rem;
      min-height: 100vh;
    }

    .following-header {
      margin-bottom: 1.5rem;

      .back-link {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        color: hsl(var(--muted-foreground));
        text-decoration: none;
        font-size: 0.875rem;
        font-weight: 500;
        margin-bottom: 1rem;
        transition: color 0.2s;

        &:hover {
          color: hsl(var(--foreground));
        }

        lucide-icon {
          width: 20px;
          height: 20px;
        }
      }

      .page-title {
        display: flex;
        align-items: center;
        gap: 0.75rem;

        .page-icon {
          width: 28px;
          height: 28px;
          color: hsl(var(--accent));
        }

        h1 {
          font-size: 1.5rem;
          font-weight: 700;
          color: hsl(var(--foreground));
          margin: 0;
        }

        .count-badge {
          background: hsl(var(--muted));
          color: hsl(var(--muted-foreground));
          font-size: 0.875rem;
          font-weight: 600;
          padding: 0.25rem 0.75rem;
          border-radius: 9999px;
        }
      }
    }

    .following-content {
      .loading-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 4rem 2rem;
        gap: 1rem;

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid hsl(var(--border));
          border-top-color: hsl(var(--accent));
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        p {
          color: hsl(var(--muted-foreground));
          font-size: 0.95rem;
          margin: 0;
        }
      }

      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 4rem 2rem;
        text-align: center;
        background: hsl(var(--card));
        border: 1px solid hsl(var(--border));
        border-radius: var(--radius);

        .empty-icon {
          width: 64px;
          height: 64px;
          color: hsl(var(--muted-foreground));
          margin-bottom: 1.5rem;
          opacity: 0.5;
        }

        h2 {
          font-size: 1.25rem;
          font-weight: 600;
          color: hsl(var(--foreground));
          margin: 0 0 0.5rem 0;
        }

        p {
          color: hsl(var(--muted-foreground));
          font-size: 0.95rem;
          margin: 0 0 1.5rem 0;
        }

        .back-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.625rem 1.25rem;
          border: 1px solid hsl(var(--border));
          background: hsl(var(--background));
          color: hsl(var(--foreground));
          border-radius: calc(var(--radius) - 0.25rem);
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: 500;
          transition: all 0.2s;

          &:hover {
            background: hsl(var(--muted));
          }

          lucide-icon {
            width: 16px;
            height: 16px;
          }
        }
      }

      .following-list {
        display: flex;
        flex-direction: column;
        gap: 1rem;

        .following-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: hsl(var(--card));
          border: 1px solid hsl(var(--border));
          border-radius: var(--radius);
          transition: border-color 0.2s;

          &:hover {
            border-color: hsl(var(--accent));
          }

          .user-avatar {
            flex-shrink: 0;

            img {
              width: 56px;
              height: 56px;
              border-radius: 50%;
              object-fit: cover;
            }
          }

          .user-info {
            flex: 1;
            min-width: 0;

            .user-name {
              font-weight: 600;
              color: hsl(var(--foreground));
              text-decoration: none;
              font-size: 1rem;
              display: block;
              margin-bottom: 0.25rem;

              &:hover {
                text-decoration: underline;
              }
            }

            .user-username {
              color: hsl(var(--muted-foreground));
              font-size: 0.875rem;
              margin: 0 0 0.5rem 0;
            }

            .user-bio {
              color: hsl(var(--foreground));
              font-size: 0.875rem;
              margin: 0 0 0.5rem 0;
              overflow: hidden;
              text-overflow: ellipsis;
              display: -webkit-box;
              -webkit-line-clamp: 2;
              -webkit-box-orient: vertical;
            }
          }

          .user-action {
            flex-shrink: 0;
          }
        }

        .load-more-indicator {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
          padding: 2rem;

          .loading-spinner {
            width: 32px;
            height: 32px;
            border: 2px solid hsl(var(--border));
            border-top-color: hsl(var(--accent));
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }

          p {
            color: hsl(var(--muted-foreground));
            font-size: 0.875rem;
            margin: 0;
          }
        }

        .end-of-list {
          text-align: center;
          padding: 2rem;
          color: hsl(var(--muted-foreground));
          font-size: 0.875rem;
        }
      }
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    @media (max-width: 640px) {
      .following-card {
        .user-avatar img {
          width: 48px;
          height: 48px;
        }

        .user-action {
          app-follow-button {
            padding: 0.375rem 0.75rem;
            font-size: 0.8rem;
          }
        }
      }
    }
  `]
})
export class FollowingComponent implements OnInit {
  arrowIcon = ArrowLeft;
  usersIcon = Users;
  userPlusIcon = UserPlus;

  profileId = '';
  profileUsername = '';
  following: FollowingUser[] = [];
  displayedFollowing: FollowingUser[] = [];
  totalCount = 0;
  isLoading = false;
  hasMore = true;
  currentPage = 1;
  pageSize = 10;

  constructor(
    private route: ActivatedRoute,
    private followService: FollowService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.profileUsername = id;
        void this.loadFollowing(true);
      }
    });
  }

  get canLoadMore(): boolean {
    return this.displayedFollowing.length < this.following.length;
  }

  async loadFollowing(reset: boolean = false): Promise<void> {
    if (this.isLoading) {
      return;
    }
    this.isLoading = true;

    if (reset) {
      this.following = [];
      this.displayedFollowing = [];
      this.currentPage = 1;
      this.hasMore = true;
    }

    try {
      const profile = await this.userService.getUserByUsername(this.profileUsername).toPromise();
      if (!profile?.id) {
        this.isLoading = false;
        return;
      }

      this.profileId = profile.id;
      const resp = await this.followService.getFollowing(profile.id, this.currentPage, this.pageSize);

      const items: any[] = resp?.following ?? [];
      const mapped = items.map((f: any) => {
        const followingId = String(f.following_id ?? f.follow?.following_id ?? '');
        return {
          id: followingId,
          name: f.user_name ?? 'User',
          username: f.user_username ?? 'user',
          avatar: f.user_avatar ?? '/avatars/default.jpg',
          bio: '',
          isFollowing: this.followService.isFollowing(followingId)
        } as FollowingUser;
      });

      this.totalCount = resp?.total ?? this.totalCount;
      this.hasMore = Boolean(resp?.has_more);

      this.following = [...this.following, ...mapped];
      this.displayedFollowing = this.following;
      this.currentPage++;
    } catch (error) {
      console.error('Failed to load following:', error);
    } finally {
      this.isLoading = false;
    }
  }

  loadMore(): void {
    if (this.hasMore && !this.isLoading) {
      void this.loadFollowing(false);
    }
  }

  onScroll(event: Event): void {
    const element = event.target as HTMLElement;
    const scrollTop = element.scrollTop;
    const scrollHeight = element.scrollHeight;
    const clientHeight = element.clientHeight;

    if (scrollTop + clientHeight >= scrollHeight - 100) {
      this.loadMore();
    }
  }
}
