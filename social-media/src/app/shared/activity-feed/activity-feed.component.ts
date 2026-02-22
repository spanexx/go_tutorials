// Code Map: activity-feed.component.ts
// - ActivityFeedComponent: Activity feed with filtering and infinite scroll
// - List of activity items with actor, action, target, timestamp
// - Different icons for different activity types
// - Click to navigate to relevant content
// - Filter by type (All, Likes, Comments, Follows, etc.)
// - Mark as read functionality
// - Infinite scroll support
// CID: Phase-2 Milestone 2.4 - Sharing & Activity Feed
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularModule, Activity as ActivityIcon, Check, CheckCheck, Heart, MessageCircle, Share2, User, FileText, AtSign, Smile, CornerDownRight, UserPlus, Filter } from 'lucide-angular';
import { ActivityService, Activity, ActivityType } from '../../shared/services/activity.service';

type ActivityFilter = 'all' | ActivityType;

@Component({
  selector: 'app-activity-feed',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './activity-feed.component.html',
  styleUrls: ['./activity-feed.component.scss']
})
export class ActivityFeedComponent implements OnInit {
  activityIcon = ActivityIcon;
  checkIcon = Check;
  checkAllIcon = CheckCheck;
  heartIcon = Heart;
  commentIcon = MessageCircle;
  shareIcon = Share2;
  userIcon = User;
  postIcon = FileText;
  mentionIcon = AtSign;
  smileIcon = Smile;
  replyIcon = CornerDownRight;
  followIcon = UserPlus;
  filterIcon = Filter;

  activities: Activity[] = [];
  filteredActivities: Activity[] = [];
  unreadCount = 0;
  isLoading = false;
  hasMore = true;
  currentFilter: ActivityFilter = 'all';
  currentPage = 1;
  pageSize = 10;

  // Filter options
  filterOptions: { value: ActivityFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: ActivityType.LIKE, label: 'Likes' },
    { value: ActivityType.COMMENT, label: 'Comments' },
    { value: ActivityType.FOLLOW, label: 'Follows' },
    { value: ActivityType.SHARE, label: 'Shares' },
    { value: ActivityType.MENTION, label: 'Mentions' },
    { value: ActivityType.REACTION, label: 'Reactions' },
    { value: ActivityType.REPLY, label: 'Replies' }
  ];

  constructor(public activityService: ActivityService) {}

  ngOnInit(): void {
    void this.activityService.refresh().then(() => this.loadActivities());
  }

  // Cleanup methods can be added here when needed

  loadActivities(): void {
    this.activities = this.activityService.activities();
    this.unreadCount = this.activityService.unreadCount();
    this.hasMore = this.activityService.hasMore();
    this.applyFilter();
  }

  applyFilter(): void {
    if (this.currentFilter === 'all') {
      this.filteredActivities = this.activities;
    } else {
      this.filteredActivities = this.activities.filter(
        a => a.type === this.currentFilter
      );
    }
  }

  setFilter(filter: ActivityFilter): void {
    this.currentFilter = filter;
    this.currentPage = 1;
    this.applyFilter();
  }

  get displayedActivities(): Activity[] {
    const endIndex = this.currentPage * this.pageSize;
    return this.filteredActivities.slice(0, endIndex);
  }

  get canLoadMore(): boolean {
    return this.filteredActivities.length > this.currentPage * this.pageSize;
  }

  loadMore(): void {
    if (this.canLoadMore && !this.isLoading) {
      this.currentPage++;
    }
  }

  onScroll(): void {
    if (this.canLoadMore && !this.isLoading) {
      this.loadMore();
    }
  }

  navigateToActivity(activity: Activity): void {
    const route = this.getActivityRoute(activity);
    if (route) {
      // Navigation handled by routerLink in template
    }
    
    // Mark as read when clicked
    if (!activity.read) {
      this.markAsRead(activity.id);
    }
  }

  getActivityRoute(activity: Activity): string[] {
    switch (activity.type) {
      case ActivityType.LIKE:
      case ActivityType.COMMENT:
      case ActivityType.SHARE:
      case ActivityType.REACTION:
        return ['/post', activity.target.id];
      case ActivityType.FOLLOW:
        return ['/profile', activity.actor.username];
      case ActivityType.MENTION:
        return ['/post', activity.target.id];
      case ActivityType.POST:
        return ['/post', activity.target.id];
      case ActivityType.REPLY:
        return ['/post', activity.target.id];
      default:
        return [];
    }
  }

  markAsRead(activityId: string): void {
    this.activityService.markAsRead(activityId);
    this.loadActivities();
  }

  markAllAsRead(): void {
    this.activityService.markAllAsRead();
    this.loadActivities();
  }

  getIcon(type: ActivityType): any {
    switch (type) {
      case ActivityType.LIKE: return this.heartIcon;
      case ActivityType.COMMENT: return this.commentIcon;
      case ActivityType.FOLLOW: return this.followIcon;
      case ActivityType.SHARE: return this.shareIcon;
      case ActivityType.POST: return this.postIcon;
      case ActivityType.MENTION: return this.mentionIcon;
      case ActivityType.REACTION: return this.smileIcon;
      case ActivityType.REPLY: return this.replyIcon;
      default: return this.activityIcon;
    }
  }

  getColorClass(type: ActivityType): string {
    return `activity-${type.toLowerCase()}`;
  }

  getActionText(activity: Activity): string {
    const actorName = activity.actor.name;

    switch (activity.type) {
      case ActivityType.LIKE:
        return `<strong>${actorName}</strong> liked your post`;
      case ActivityType.COMMENT:
        return `<strong>${actorName}</strong> commented on your post`;
      case ActivityType.FOLLOW:
        return `<strong>${actorName}</strong> started following you`;
      case ActivityType.SHARE:
        return `<strong>${actorName}</strong> shared your post`;
      case ActivityType.MENTION:
        return `<strong>${actorName}</strong> mentioned you`;
      case ActivityType.POST:
        return `<strong>${actorName}</strong> created a new post`;
      case ActivityType.REACTION:
        const reactionType = activity.metadata?.['reactionType'] || 'reacted to';
        return `<strong>${actorName}</strong> ${reactionType.toLowerCase()} your post`;
      case ActivityType.REPLY:
        return `<strong>${actorName}</strong> replied to your comment`;
      default:
        return 'Activity occurred';
    }
  }

  getTimeAgo(timestamp: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - new Date(timestamp).getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) {
      return 'just now';
    } else if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return new Date(timestamp).toLocaleDateString();
    }
  }
}
