import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularModule, Home, Compass, Mail, Bell, User, Bookmark, Settings, PenSquare, Zap, BarChart3 } from 'lucide-angular';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent {
  pencilIcon = PenSquare;
  zapIcon = Zap;
  chartIcon = BarChart3;

  constructor(private authService: AuthService) {}

  menuItems = [
    { label: 'Feed', icon: Home, route: '/feed' },
    { label: 'Explore', icon: Compass, route: '/explore' },
    { label: 'Messages', icon: Mail, route: '/messages' },
    { label: 'Notifications', icon: Bell, route: '/notifications' },
    { label: 'Profile', icon: User, route: this.getMyProfileRoute() },
    { label: 'Analytics', icon: BarChart3, route: '/analytics' },
    { label: 'Bookmarks', icon: Bookmark, route: '/bookmarks' },
    { label: 'Settings', icon: Settings, route: '/settings' }
  ];

  private getMyProfileRoute(): string {
    const username = this.authService.user?.username;
    return username ? `/profile/${username}` : '/feed';
  }

  activePath = '/feed';

  setActive(route: string) {
    this.activePath = route;
  }
}
