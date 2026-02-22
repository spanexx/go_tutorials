// Code Map: followers.component.ts
// - FollowersComponent: Followers list page showing users who follow a profile
// - Route: /profile/:id/followers
// - List of follower users with user cards
// - User cards with follow button
// - Infinite scroll for large lists
// - Follow back button
// - Empty state when no followers
// - Back to profile link
// CID: Phase-2 Milestone 2.5 - Social Graph (Follow System)
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { LucideAngularModule, ArrowLeft, Users, UserPlus } from 'lucide-angular';
import { FollowService } from '../../shared/services/follow.service';
import { UserService, UserProfile } from '../../shared/services/user.service';
import { FollowButtonComponent } from '../../shared/components/follow-button/follow-button.component';

interface FollowerUser {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  bio?: string;
  isFollowing: boolean;
  followBack: boolean;
}

@Component({
  selector: 'app-followers',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule, FollowButtonComponent],
  template: `
    <div class="followers-page">
      <div class="followers-header">
        <a [routerLink]="['/profile', profileId]" class="back-link">
          <lucide-icon [img]="arrowIcon" [size]="20"></lucide-icon>
          <span>Back to Profile</span>
        </a>

        <div class="page-title">
          <lucide-icon [img]="usersIcon" class="page-icon"></lucide-icon>
          <h1>Followers</h1>
          @if (totalCount > 0) {
            <span class="count-badge">{{ totalCount }}</span>
          }
        </div>
      </div>

      <div class="followers-content">
        @if (isLoading && followers.length === 0) {
          <div class="loading-state">
            <div class="loading-spinner"></div>
            <p>Loading followers...</p>
          </div>
        }

        @if (!isLoading && followers.length === 0) {
          <div class="empty-state">
            <lucide-icon [img]="usersIcon" class="empty-icon"></lucide-icon>
            <h2>No followers yet</h2>
            <p>{{ profileUsername }} doesn't have any followers yet</p>
            <a [routerLink]="['/profile', profileId]" class="back-btn">
              <lucide-icon [img]="arrowIcon" [size]="16"></lucide-icon>
              <span>Back to Profile</span>
            </a>
          </div>
        }

        @if (followers.length > 0) {
          <div class="followers-list">
            @for (follower of displayedFollowers; track follower.id) {
              <div class="follower-card">
                <a [routerLink]="['/profile', follower.id]" class="follower-avatar">
                  <img [src]="follower.avatar || '/avatars/default.jpg'" [alt]="follower.name" />
                </a>

                <div class="follower-info">
                  <a [routerLink]="['/profile', follower.id]" class="follower-name">
                    {{ follower.name }}
                  </a>
                  <p class="follower-username">&#64;{{ follower.username }}</p>
                  @if (follower.bio) {
                    <p class="follower-bio">{{ follower.bio }}</p>
                  }
                  @if (follower.followBack) {
                    <span class="follow-back-badge">
                      <lucide-icon [img]="userPlusIcon" [size]="12"></lucide-icon>
                      <span>Follows you</span>
                    </span>
                  }
                </div>

                <div class="follower-action">
                  <app-follow-button
                    [userId]="follower.id"
                    [username]="follower.username"
                    [compact]="true">
                  </app-follow-button>
                </div>
              </div>
            }

            @if (canLoadMore) {
              <div class="load-more-indicator">
                <div class="loading-spinner"></div>
                <p>Loading more followers...</p>
              </div>
            }

            @if (!canLoadMore && displayedFollowers.length === followers.length) {
              <div class="end-of-list">
                <p>You've seen all {{ totalCount }} followers</p>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .followers-page {
      max-width: 800px;
      margin: 0 auto;
      padding: 1.5rem;
      min-height: 100vh;
    }

    .followers-header {
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

    .followers-content {
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

      .followers-list {
        display: flex;
        flex-direction: column;
        gap: 1rem;

        .follower-card {
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

          .follower-avatar {
            flex-shrink: 0;

            img {
              width: 56px;
              height: 56px;
              border-radius: 50%;
              object-fit: cover;
            }
          }

          .follower-info {
            flex: 1;
            min-width: 0;

            .follower-name {
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

            .follower-username {
              color: hsl(var(--muted-foreground));
              font-size: 0.875rem;
              margin: 0 0 0.5rem 0;
            }

            .follower-bio {
              color: hsl(var(--foreground));
              font-size: 0.875rem;
              margin: 0 0 0.5rem 0;
              overflow: hidden;
              text-overflow: ellipsis;
              display: -webkit-box;
              -webkit-line-clamp: 2;
              -webkit-box-orient: vertical;
            }

            .follow-back-badge {
              display: inline-flex;
              align-items: center;
              gap: 0.375rem;
              padding: 0.25rem 0.625rem;
              background: hsl(var(--accent) / 0.1);
              color: hsl(var(--accent));
              border-radius: calc(var(--radius) - 0.5rem);
              font-size: 0.75rem;
              font-weight: 600;

              lucide-icon {
                width: 12px;
                height: 12px;
              }
            }
          }

          .follower-action {
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
      .follower-card {
        .follower-avatar img {
          width: 48px;
          height: 48px;
        }

        .follower-action {
          app-follow-button {
            padding: 0.375rem 0.75rem;
            font-size: 0.8rem;
          }
        }
      }
    }
  `]
})
export class FollowersComponent implements OnInit {
  arrowIcon = ArrowLeft;
  usersIcon = Users;
  userPlusIcon = UserPlus;

  profileId = '';
  profileUsername = '';
  followers: FollowerUser[] = [];
  displayedFollowers: FollowerUser[] = [];
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
        void this.loadFollowers(true);
      }
    });
  }

  get canLoadMore(): boolean {
    return this.displayedFollowers.length < this.followers.length;
  }

  async loadFollowers(reset: boolean = false): Promise<void> {
    if (this.isLoading) {
      return;
    }
    this.isLoading = true;

    if (reset) {
      this.followers = [];
      this.displayedFollowers = [];
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
      const resp = await this.followService.getFollowers(profile.id, this.currentPage, this.pageSize);

      const items: any[] = resp?.followers ?? [];
      const mapped = items.map((f: any) => {
        const followerId = String(f.follower_id ?? f.follow?.follower_id ?? '');
        return {
          id: followerId,
          name: f.user_name ?? 'User',
          username: f.user_username ?? 'user',
          avatar: f.user_avatar ?? '/avatars/default.jpg',
          bio: '',
          isFollowing: this.followService.isFollowing(followerId),
          followBack: Boolean(f.is_following_back)
        } as FollowerUser;
      });

      this.totalCount = resp?.total ?? this.totalCount;
      this.hasMore = Boolean(resp?.has_more);

      this.followers = [...this.followers, ...mapped];
      this.displayedFollowers = this.followers;
      this.currentPage++;
    } catch (error) {
      console.error('Failed to load followers:', error);
    } finally {
      this.isLoading = false;
    }
  }

  loadMore(): void {
    if (this.hasMore && !this.isLoading) {
      void this.loadFollowers(false);
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
