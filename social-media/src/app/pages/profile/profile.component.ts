import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { LucideAngularModule, Mail, Link, Calendar, Edit3, MapPin } from 'lucide-angular';
import { AuthService } from '../../shared/services/auth.service';
import { ProfileSkeletonComponent } from '../../shared/skeleton/profile-skeleton.component';
import { environment } from '../../../environments/environment';

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
  imports: [CommonModule, RouterModule, LucideAngularModule, ProfileSkeletonComponent],
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

  constructor(
    private authService: AuthService,
    private route: ActivatedRoute,
    private http: HttpClient
  ) {
    this.route.params.subscribe(params => {
      this.profileId = params['id'];
      this.loadProfile();
    });
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
        avatar: currentUser.avatar || 'https://i.pravatar.cc/150?img=1',
        location: '',
        website: '',
        joinedDate: '' // Would need to be added to User interface
      };
      this.isLoading = false;
      return;
    }

    // Fetch from API for other users
    this.http.get<UserProfileResponse>(`${this.apiUrl}/users/${this.profileId}`).subscribe({
      next: (userData) => {
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
          avatar: `https://i.pravatar.cc/150?u=${this.profileId}`,
          location: '',
          website: '',
          joinedDate: ''
        };
        this.stats = { posts: 0, followers: 0, following: 0 };
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

  formatNumber(num: number): string {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }
}
