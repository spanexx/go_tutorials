import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularModule, User, Hash, FileText, TrendingUp } from 'lucide-angular';
import { SearchResult, SearchUser, SearchHashtag } from '../../shared/services/search.service';
import { Post } from '../services/post.service';

@Component({
  selector: 'app-search-results',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  templateUrl: './search-results.component.html',
  styleUrls: ['./search-results.component.scss']
})
export class SearchResultsComponent {
  @Input() results!: SearchResult;
  @Input() query!: string;
  @Input() isSearching = false;

  userIcon = User;
  hashtagIcon = Hash;
  postIcon = FileText;
  trendingIcon = TrendingUp;

  get hasResults(): boolean {
    return !this.isSearching && 
           (this.results.posts.length > 0 || 
            this.results.users.length > 0 || 
            this.results.hashtags.length > 0);
  }

  get hasNoResults(): boolean {
    return !this.isSearching && !this.hasResults && this.query.trim().length > 0;
  }

  getPreviewContent(content: string): string {
    const maxLength = 80;
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  }
}
