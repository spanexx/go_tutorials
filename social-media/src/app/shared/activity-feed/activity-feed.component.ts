import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularModule, Activity as ActivityIcon, Check, CheckCheck, Heart, MessageCircle, Share2, User, FileText, AtSign } from 'lucide-angular';
import { ActivityService, Activity, ActivityType } from '../../shared/services/activity.service';

@Component({
  selector: 'app-activity-feed',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './activity-feed.component.html',
  styleUrls: ['./activity-feed.component.scss']
})
export class ActivityFeedComponent {
  activityIcon = ActivityIcon;
  checkIcon = Check;
  checkAllIcon = CheckCheck;
  heartIcon = Heart;
  commentIcon = MessageCircle;
  shareIcon = Share2;
  userIcon = User;
  postIcon = FileText;
  mentionIcon = AtSign;

  constructor(public activityService: ActivityService) {}

  activities = this.activityService.getActivities(10);
  unreadCount = this.activityService.getUnreadCount();

  markAsRead(activityId: string): void {
    this.activityService.markAsRead(activityId);
  }

  markAllAsRead(): void {
    this.activityService.markAllAsRead();
    this.unreadCount = 0;
  }

  getIcon(type: ActivityType): any {
    switch (type) {
      case 'like': return this.heartIcon;
      case 'comment': return this.commentIcon;
      case 'follow': return this.userIcon;
      case 'share': return this.shareIcon;
      case 'post': return this.postIcon;
      case 'mention': return this.mentionIcon;
      default: return this.activityIcon;
    }
  }

  getColorClass(type: ActivityType): string {
    return `activity-${type}`;
  }

  getTimeAgo(timestamp: Date): string {
    return this.activityService.getTimeAgo(timestamp);
  }

  getActionText(activity: Activity): string {
    switch (activity.type) {
      case 'like':
        return `<strong>${activity.user.name}</strong> liked your post`;
      case 'comment':
        return `<strong>${activity.user.name}</strong> commented on your post`;
      case 'follow':
        return `<strong>${activity.user.name}</strong> started following ${activity.target?.username ? '@' + activity.target.username : 'someone'}`;
      case 'share':
        return `<strong>${activity.user.name}</strong> shared your post`;
      case 'mention':
        return `<strong>${activity.user.name}</strong> mentioned you`;
      case 'post':
        return `<strong>${activity.user.name}</strong> created a new post`;
      default:
        return 'Activity occurred';
    }
  }
}
