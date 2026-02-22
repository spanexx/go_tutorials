import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { LucideAngularModule, Mail, Link, Calendar, Edit3, MapPin } from 'lucide-angular';
import { AuthService } from '../../shared/services/auth.service';
import { FollowService } from '../../shared/services/follow.service';
import { ProfileSkeletonComponent } from '../../shared/skeleton/profile-skeleton.component';
import { FollowButtonComponent } from '../../shared/components/follow-button/follow-button.component';
import { environment } from '../../../environments/environment';
import { IMAGE_PLACEHOLDERS } from '../../shared/constants/app.constants';

interface UserProfileResponse {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  bio: string;
  followers_count?: number;
  following_count?: number;
  posts_count?: number;
  is_following?: boolean;
  is_verified?: boolean;
  created_at?: string;
  location?: string;
  website?: string;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule, ProfileSkeletonComponent, FollowButtonComponent],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent {
  mailIcon = Mail;
  linkIcon = Link;
  calendarIcon = Calendar;
  editIcon = Edit3;
  locationIcon = MapPin;

  isLoading = true;
  isError = false;
  errorMessage = '';
  isCurrentUser = false;
  profileId = '';
  profileUserId = '';

  user = {
    name: '',
    username: '',
    email: '',
    bio: '',
    avatar: '',
    location: '',
    website: '',
    joinedDate: ''
  };

  stats = {
    posts: 0,
    followers: 0,
    following: 0
  };

  private readonly apiUrl = environment.apiUrl + '/v1';

  private isUUID(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  }

  constructor(
    private authService: AuthService,
    private route: ActivatedRoute,
    private http: HttpClient,
    private followService: FollowService
  ) {
    this.route.params.subscribe(params => {
      this.profileId = params['id'];
      this.loadProfile();
    });

	void this.followService.ensureMyFollowingLoaded();
  }

  /**
   * Format large numbers with K/M notation
   */
  formatNumber(value: number): string {
    if (value < 1000) {
      return value.toString();
    }
    if (value < 1000000) {
      const formatted = (value / 1000).toFixed(1);
      return formatted.endsWith('.0') ? formatted.slice(0, -2) + 'K' : formatted + 'K';
    }
    const formatted = (value / 1000000).toFixed(1);
    return formatted.endsWith('.0') ? formatted.slice(0, -2) + 'M' : formatted + 'M';
  }

  /**
   * Load profile from backend API
   */
  loadProfile(): void {
    this.isLoading = true;
    this.isError = false;
    this.errorMessage = '';
    
    const currentUser = this.authService.user;
    this.isCurrentUser = currentUser?.username === this.profileId;

    // If current user, use local data
    if (this.isCurrentUser && currentUser) {
      this.user = {
        name: currentUser.name || '',
        username: currentUser.username || '',
        email: currentUser.email || '',
        bio: currentUser.bio || '',
        avatar: '',
        location: '',
        website: '',
        joinedDate: '' // Would need to be added to User interface
      };
      this.isLoading = false;
      return;
    }

    // Fetch from API for other users
    const profileEndpoint = this.isUUID(this.profileId)
      ? `${this.apiUrl}/users/id/${this.profileId}`
      : `${this.apiUrl}/users/${this.profileId}`;

    this.http.get<UserProfileResponse>(profileEndpoint).subscribe({
      next: (userData) => {
        this.profileUserId = userData.id;
        this.user = {
          name: userData.display_name,
          username: userData.username,
          email: '',
          bio: userData.bio || '',
          avatar: userData.avatar_url,
          location: userData.location || '',
          website: userData.website || '',
          joinedDate: userData.created_at 
            ? new Date(userData.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
            : ''
        };

        this.stats = {
          posts: userData.posts_count || 0,
          followers: userData.followers_count || 0,
          following: userData.following_count || 0
        };

        this.isLoading = false;
      },
      error: (error) => {
        console.warn(`Failed to fetch profile for ${this.profileId}, using fallback data`);
        this.isError = true;
        this.errorMessage = 'Unable to load profile';
        
        // Fallback to basic profile
        this.user = {
          name: this.formatName(this.profileId),
          username: this.profileId,
          email: '',
          bio: '',
          avatar: IMAGE_PLACEHOLDERS.avatar,
          location: '',
          website: '',
          joinedDate: ''
        };
        this.stats = { posts: 0, followers: 0, following: 0 };
        this.profileUserId = '';
        this.isLoading = false;
      }
    });
  }

  formatName(username: string): string {
    return username
      .split(/(?=[A-Z])|[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  get displayEmail(): boolean {
    return this.isCurrentUser && !!this.user.email;
  }
}
