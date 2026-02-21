import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { LucideAngularModule, Mail, Link, MapPin, Calendar, Check, UserPlus } from 'lucide-angular';
import { AuthService } from '../../shared/services/auth.service';
import { environment } from '../../../environments/environment';

export interface UserProfileData {
  id: string;
  username: string;
  name: string;
  bio: string;
  avatar: string;
  location?: string;
  website?: string;
  joinedDate?: string;
  followers: number;
  following: number;
  isFollowing: boolean;
  isVerified?: boolean;
}

// API response interface
interface UserProfileResponse {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  bio: string;
  followers_count?: number;
  following_count?: number;
  is_following?: boolean;
  is_verified?: boolean;
  created_at?: string;
  location?: string;
  website?: string;
  name?: string;
}

/**
 * UserProfileCardComponent - Displays a user profile card
 *
 * Fetches user profile data from backend API with caching
 * to avoid repeated calls for the same user.
 */
@Component({
  selector: 'app-user-profile-card',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './user-profile-card.component.html',
  styleUrls: ['./user-profile-card.component.scss']
})
export class UserProfileCardComponent implements OnChanges {
  @Input() username: string = '';
  @Input() position: 'top' | 'bottom' = 'bottom';

  mailIcon = Mail;
  linkIcon = Link;
  locationIcon = MapPin;
  calendarIcon = Calendar;
  checkIcon = Check;
  followIcon = UserPlus;

  user: UserProfileData | null = null;
  isLoading = true;
  isError = false;
  isCurrentUser = false;
  errorMessage = '';

  private readonly apiUrl = environment.apiUrl + '/v1';

  constructor(
    private authService: AuthService,
    private http: HttpClient
  ) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['username'] && changes['username'].currentValue) {
      this.loadUserProfile();
    }
  }

  /**
   * Load user profile from backend API with caching
   */
  loadUserProfile(): void {
    this.isLoading = true;
    this.isError = false;
    this.errorMessage = '';

    const currentUser = this.authService.user;
    this.isCurrentUser = currentUser?.username === this.username;

    // Fetch from API
    this.http.get<UserProfileResponse>(`${this.apiUrl}/users/${this.username}`).subscribe({
      next: (userData) => {
        // Transform API response to component format
        this.user = {
          id: userData.id,
          username: userData.username,
          name: userData.display_name || userData.name || this.formatName(userData.username),
          bio: userData.bio || '',
          avatar: userData.avatar_url,
          location: userData.location,
          website: userData.website,
          joinedDate: userData.created_at ? new Date(userData.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : undefined,
          followers: userData.followers_count || 0,
          following: userData.following_count || 0,
          isFollowing: userData.is_following || false,
          isVerified: userData.is_verified || false
        };

        this.isLoading = false;
      },
      error: (error) => {
        console.warn(`Failed to fetch profile for ${this.username}, using fallback data`);
        this.isError = true;
        this.errorMessage = 'Unable to load profile';

        // Fallback to basic profile structure
        this.user = this.getFallbackProfile();
        this.isLoading = false;
      }
    });
  }

  /**
   * Get fallback profile when API is unavailable
   */
  private getFallbackProfile(): UserProfileData {
    const currentUser = this.authService.user;

    if (this.isCurrentUser && currentUser) {
      return {
        id: currentUser.id,
        username: currentUser.username,
        name: currentUser.name || '',
        bio: currentUser.bio || '',
        avatar: currentUser.avatar || 'https://i.pravatar.cc/150?img=1',
        followers: 0,
        following: 0,
        isFollowing: false,
        isVerified: false
      };
    }

    return {
      id: '',
      username: this.username,
      name: this.formatName(this.username),
      bio: '',
      avatar: `https://i.pravatar.cc/150?u=${this.username}`,
      followers: 0,
      following: 0,
      isFollowing: false,
      isVerified: false
    };
  }

  formatName(username: string): string {
    return username
      .split(/(?=[A-Z])|[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  formatNumber(num: number): string {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  toggleFollow(): void {
    if (this.user) {
      const previousIsFollowing = this.user.isFollowing;
      const previousFollowers = this.user.followers;

      this.user.isFollowing = !this.user.isFollowing;
      this.user.followers += this.user.isFollowing ? 1 : -1;

      const userId = this.user.id;
      if (!userId) {
        return;
      }

      const request$ = this.user.isFollowing
        ? this.http.post(`${this.apiUrl}/users/${userId}/follow`, {})
        : this.http.delete(`${this.apiUrl}/users/${userId}/follow`);

      request$.subscribe({
        error: () => {
          if (this.user) {
            this.user.isFollowing = previousIsFollowing;
            this.user.followers = previousFollowers;
          }
        }
      });
    }
  }
}
