import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LucideAngularModule, Search, TrendingUp, Users, Hash } from 'lucide-angular';
import { ExploreService, TrendingTopic, SuggestedUser, ExploreCategory } from '../../shared/services/explore.service';
import { ActivityFeedComponent } from '../../shared/activity-feed/activity-feed.component';

@Component({
  selector: 'app-explore',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule, ActivityFeedComponent],
  templateUrl: './explore.component.html',
  styleUrls: ['./explore.component.scss']
})
export class ExploreComponent {
  searchIcon = Search;
  trendingIcon = TrendingUp;
  usersIcon = Users;
  hashtagIcon = Hash;

  selectedCategory = 'all';
  searchQuery = '';

  constructor(public exploreService: ExploreService) {}

  get categories(): ExploreCategory[] {
    return this.exploreService.categories;
  }

  get trendingTopics(): TrendingTopic[] {
    if (this.searchQuery.trim()) {
      return this.exploreService.searchTopics(this.searchQuery);
    }
    return this.exploreService.getTrendingByCategory(this.selectedCategory);
  }

  get suggestedUsers(): SuggestedUser[] {
    return this.exploreService.suggestedUsers.slice(0, 5);
  }

  get topTrending(): TrendingTopic[] {
    return this.exploreService.getTopTrending(6);
  }

  selectCategory(categoryId: string): void {
    this.selectedCategory = categoryId;
  }

  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery = input.value;
  }

  toggleFollow(username: string): void {
    this.exploreService.toggleFollow(username);
  }

  formatPostCount(count: number): string {
    if (count >= 1000000) {
      return (count / 1000000).toFixed(1) + 'M';
    }
    if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'K';
    }
    return count.toString();
  }

  formatFollowers(count: number): string {
    if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'K';
    }
    return count.toString();
  }

  getCategoryName(categoryId: string): string {
    const category = this.categories.find(c => c.id === categoryId);
    return category?.name || categoryId;
  }
}
