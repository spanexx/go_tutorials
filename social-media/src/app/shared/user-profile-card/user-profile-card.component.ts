import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularModule, Mail, Link, MapPin, Calendar, Check, UserPlus } from 'lucide-angular';
import { AuthService } from '../../shared/services/auth.service';

export interface UserProfileData {
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
  isCurrentUser = false;

  constructor(private authService: AuthService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['username'] && changes['username'].currentValue) {
      this.loadUserProfile();
    }
  }

  loadUserProfile(): void {
    this.isLoading = true;
    const currentUser = this.authService.user;
    this.isCurrentUser = currentUser?.username === this.username;

    // Simulate API call with mock data
    setTimeout(() => {
      if (this.isCurrentUser && currentUser) {
        this.user = {
          username: currentUser.username,
          name: currentUser.name || '',
          bio: currentUser.bio || 'Software developer passionate about web technologies ✨',
          avatar: currentUser.avatar || 'https://i.pravatar.cc/150?img=1',
          location: 'San Francisco, CA',
          website: 'example.com',
          joinedDate: 'January 2024',
          followers: 2500,
          following: 342,
          isFollowing: false,
          isVerified: true
        };
      } else {
        // Mock data for other users
        this.user = {
          username: this.username,
          name: this.formatName(this.username),
          bio: 'Digital creator and content enthusiast 🎨',
          avatar: `https://i.pravatar.cc/150?u=${this.username}`,
          location: 'New York, NY',
          website: `${this.username}.com`,
          joinedDate: 'March 2024',
          followers: Math.floor(Math.random() * 5000) + 500,
          following: Math.floor(Math.random() * 1000) + 100,
          isFollowing: false,
          isVerified: Math.random() > 0.7
        };
      }
      this.isLoading = false;
    }, 300);
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
      this.user.isFollowing = !this.user.isFollowing;
      this.user.followers += this.user.isFollowing ? 1 : -1;
    }
  }
}
