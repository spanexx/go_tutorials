import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularModule, Home, Compass, Mail, Bell, User, Bookmark, Settings, PenSquare, Zap, BarChart3 } from 'lucide-angular';

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

  menuItems = [
    { label: 'Feed', icon: Home, route: '/feed' },
    { label: 'Explore', icon: Compass, route: '/explore' },
    { label: 'Messages', icon: Mail, route: '/messages' },
    { label: 'Notifications', icon: Bell, route: '/notifications' },
    { label: 'Profile', icon: User, route: '/profile/1' },
    { label: 'Analytics', icon: BarChart3, route: '/analytics' },
    { label: 'Bookmarks', icon: Bookmark, route: '/bookmarks' },
    { label: 'Settings', icon: Settings, route: '/settings' }
  ];

  activePath = '/feed';

  setActive(route: string) {
    this.activePath = route;
  }
}
