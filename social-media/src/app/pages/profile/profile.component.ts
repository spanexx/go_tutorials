import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { LucideAngularModule, Mail, Link, Calendar, Edit3, MapPin } from 'lucide-angular';
import { AuthService } from '../../shared/services/auth.service';
import { ProfileSkeletonComponent } from '../../shared/skeleton/profile-skeleton.component';

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
    posts: 12,
    followers: 2500,
    following: 342
  };

  constructor(
    private authService: AuthService,
    private route: ActivatedRoute
  ) {
    this.route.params.subscribe(params => {
      this.profileId = params['id'];
      // Simulate loading delay for demonstration
      setTimeout(() => {
        this.loadProfile();
        this.isLoading = false;
      }, 1000);
    });
  }

  loadProfile(): void {
    const currentUser = this.authService.user;
    this.isCurrentUser = currentUser?.username === this.profileId;

    if (this.isCurrentUser && currentUser) {
      this.user = {
        name: currentUser.name || '',
        username: currentUser.username || '',
        email: currentUser.email || '',
        bio: currentUser.bio || 'Software developer passionate about web technologies ✨',
        avatar: currentUser.avatar || 'https://i.pravatar.cc/150?img=1',
        location: 'San Francisco, CA',
        website: 'example.com',
        joinedDate: 'January 2024'
      };
    } else {
      // Load other user's profile (mock data)
      this.user = {
        name: 'John Doe',
        username: this.profileId,
        email: '',
        bio: 'Digital creator and content enthusiast 🎨',
        avatar: 'https://i.pravatar.cc/150?img=60',
        location: 'New York, NY',
        website: 'johndoe.com',
        joinedDate: 'March 2024'
      };
    }
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
