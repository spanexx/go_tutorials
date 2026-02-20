import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularModule, Bell, Heart, MessageCircle, Share2, User, AtSign, Check, Trash2, CheckCheck } from 'lucide-angular';
import { NotificationsService, Notification, NotificationType } from '../../shared/services/notifications.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.scss']
})
export class NotificationsComponent {
  bellIcon = Bell;
  heartIcon = Heart;
  commentIcon = MessageCircle;
  shareIcon = Share2;
  userIcon = User;
  mentionIcon = AtSign;
  checkIcon = Check;
  trashIcon = Trash2;
  checkAllIcon = CheckCheck;

  constructor(public notificationsService: NotificationsService) {}

  get notifications(): Notification[] {
    return this.notificationsService.filteredNotifications;
  }

  get unreadCount(): number {
    return this.notificationsService.unreadCount;
  }

  get selectedFilter(): NotificationType {
    return this.notificationsService.getFilter();
  }

  get filterOptions(): { value: NotificationType; label: string; icon: any }[] {
    return [
      { value: 'all', label: 'All', icon: this.bellIcon },
      { value: 'like', label: 'Likes', icon: this.heartIcon },
      { value: 'comment', label: 'Comments', icon: this.commentIcon },
      { value: 'share', label: 'Shares', icon: this.shareIcon },
      { value: 'follow', label: 'Follows', icon: this.userIcon },
      { value: 'mention', label: 'Mentions', icon: this.mentionIcon }
    ];
  }

  selectFilter(filter: NotificationType): void {
    this.notificationsService.setFilter(filter);
  }

  markAsRead(notificationId: number): void {
    this.notificationsService.markAsRead(notificationId);
  }

  markAllAsRead(): void {
    this.notificationsService.markAllAsRead();
  }

  deleteNotification(notificationId: number): void {
    this.notificationsService.deleteNotification(notificationId);
  }

  getNotificationIcon(type: NotificationType): any {
    switch (type) {
      case 'like': return this.heartIcon;
      case 'comment': return this.commentIcon;
      case 'share': return this.shareIcon;
      case 'follow': return this.userIcon;
      case 'mention': return this.mentionIcon;
      default: return this.bellIcon;
    }
  }

  getNotificationRoute(notification: Notification): string[] {
    if (notification.postId) {
      return ['/feed'];
    }
    return ['/profile', notification.user.username];
  }

  formatTimeAgo(timestamp: string): string {
    return timestamp;
  }
}
