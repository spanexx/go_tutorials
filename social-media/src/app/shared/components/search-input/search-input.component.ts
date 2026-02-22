/**
 * SearchInputComponent
 * 
 * Enhanced search input with:
 * - Search input with icon in header
 * - Dropdown with search suggestions
 * - Recent searches list
 * - Clear search button
 * - Keyboard navigation (arrow keys, enter)
 * - Click suggestion to search
 * - Loading indicator during search
 * 
 * CID: Phase-3 Milestone 3.3 - Search & Explore
 */
import { Component, signal, computed, OnInit, OnDestroy, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularModule, Search, X, Clock, TrendingUp, User, Hash, Trash2 } from 'lucide-angular';
import { SearchService, SearchResult, SearchItem, SearchUser, SearchHashtag } from '../../services/search.service';
import { debounceTime, Subject, takeUntil } from 'rxjs';

interface Suggestion {
  type: 'recent' | 'post' | 'user' | 'hashtag';
  item: any;
  label: string;
  sublabel?: string;
}

interface RecentSearch {
  query: string;
  timestamp: number;
}

@Component({
  selector: 'app-search-input',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule],
  template: `
    <div class="search-input-wrapper" [class.active]="isFocused() || hasQuery()">
      <lucide-icon [img]="searchIcon" class="search-icon"></lucide-icon>
      
      <input
        #searchInput
        type="text"
        class="search-input"
        placeholder="Search posts, people, or hashtags..."
        [value]="query()"
        (input)="onInput($event)"
        (focus)="onFocus()"
        (blur)="onBlur()"
        (keydown.arrowdown)="onArrowDown($event)"
        (keydown.arrowup)="onArrowUp($event)"
        (keydown.enter)="onEnter($event)"
        (keydown.escape)="onEscape($event)"
        autocomplete="off"
      />

      @if (isLoading()) {
        <div class="loading-indicator">
          <div class="spinner"></div>
        </div>
      } @else if (hasQuery()) {
        <button class="clear-btn" (click)="clear()" type="button">
          <lucide-icon [img]="closeIcon" [size]="14"></lucide-icon>
        </button>
      }

      @if (showDropdown()) {
        <div class="search-dropdown">
          @if (isLoading()) {
            <div class="dropdown-loading">
              <div class="spinner-small"></div>
              <span>Searching...</span>
            </div>
          } @else if (suggestions().length > 0) {
            @if (recentSearches().length > 0 && !query()) {
              <div class="dropdown-section">
                <div class="section-header">
                  <lucide-icon [img]="clockIcon" [size]="14"></lucide-icon>
                  <span>Recent Searches</span>
                  @if (showClearAll()) {
                    <button class="clear-all-btn" (click)="clearAllRecentSearches()" title="Clear all">
                      <lucide-icon [img]="trashIcon" [size]="12"></lucide-icon>
                    </button>
                  }
                </div>
                @for (suggestion of recentSearches(); track suggestion.label; let i = $index) {
                  <button
                    class="suggestion-item"
                    [class.selected]="selectedIndex() === i"
                    (click)="selectSuggestion(suggestion)"
                  >
                    <lucide-icon [img]="clockIcon" [size]="14" class="suggestion-icon"></lucide-icon>
                    <div class="suggestion-content">
                      <span class="suggestion-label">{{ suggestion.label }}</span>
                    </div>
                    <button
                      class="clear-item-btn"
                      (click)="clearRecentSearch(i, $event)"
                      title="Remove"
                    >
                      <lucide-icon [img]="closeIcon" [size]="12"></lucide-icon>
                    </button>
                  </button>
                }
              </div>
            }

            @if (trendingHashtags().length > 0 && !query()) {
              <div class="dropdown-section">
                <div class="section-header">
                  <lucide-icon [img]="trendingIcon" [size]="14"></lucide-icon>
                  <span>Trending</span>
                </div>
                @for (hashtag of trendingHashtags(); track hashtag.tag; let i = $index) {
                  <button
                    class="suggestion-item"
                    [class.selected]="selectedIndex() === recentSearches().length + i"
                    (click)="selectHashtag(hashtag)"
                  >
                    <lucide-icon [img]="hashIcon" [size]="14" class="suggestion-icon"></lucide-icon>
                    <div class="suggestion-content">
                      <span class="suggestion-label">#{{ hashtag.tag }}</span>
                      <span class="suggestion-sublabel">{{ hashtag.count | number }} posts</span>
                    </div>
                  </button>
                }
              </div>
            }

            @if (suggestedUsers().length > 0 && !query()) {
              <div class="dropdown-section">
                <div class="section-header">
                  <lucide-icon [img]="userIcon" [size]="14"></lucide-icon>
                  <span>Suggested</span>
                </div>
                @for (user of suggestedUsers(); track user.id; let i = $index) {
                  <button
                    class="suggestion-item"
                    [class.selected]="selectedIndex() === recentSearches().length + trendingHashtags().length + i"
                    (click)="selectUser(user)"
                  >
                    <img [src]="user.avatar_url" class="user-avatar" />
                    <div class="suggestion-content">
                      <span class="suggestion-label">{{ user.display_name }}</span>
                      <span class="suggestion-sublabel">@{{ user.username }}</span>
                    </div>
                  </button>
                }
              </div>
            }

            @if (query() && searchResults().length > 0) {
              @for (section of groupedResults(); track section.type) {
                <div class="dropdown-section">
                  <div class="section-header">
                    @switch (section.type) {
                      @case ('post') {
                        <lucide-icon [img]="searchIcon" [size]="14"></lucide-icon>
                      }
                      @case ('user') {
                        <lucide-icon [img]="userIcon" [size]="14"></lucide-icon>
                      }
                      @case ('hashtag') {
                        <lucide-icon [img]="hashIcon" [size]="14"></lucide-icon>
                      }
                    }
                    <span>{{ section.label }}</span>
                    <span class="section-count">{{ section.items.length }}</span>
                  </div>
                  @for (item of section.items; track item.label; let i = $index) {
                    <button
                      class="suggestion-item"
                      [class.selected]="selectedIndex() === getGlobalIndex(section.type, i)"
                      (click)="selectSuggestion(item)"
                    >
                      @switch (item.type) {
                        @case ('user') {
                          <img [src]="item.item.avatar_url" class="user-avatar" />
                        }
                        @default {
                          <lucide-icon [img]="getIconForType(item.type)" [size]="14" class="suggestion-icon"></lucide-icon>
                        }
                      }
                      <div class="suggestion-content">
                        <span class="suggestion-label">{{ item.label }}</span>
                        @if (item.sublabel) {
                          <span class="suggestion-sublabel">{{ item.sublabel }}</span>
                        }
                      </div>
                    </button>
                  }
                </div>
              }
            }
          } @else if (query() && !isLoading()) {
            <div class="dropdown-empty">
              <lucide-icon [img]="searchIcon" [size]="24"></lucide-icon>
              <p>No suggestions found</p>
              <p class="empty-hint">Try searching for posts, users, or hashtags</p>
            </div>
          }

          @if (query() && hasResults()) {
            <div class="dropdown-footer">
              <a [routerLink]="['/search']" [queryParams]="{ q: query() }">
                View all results
              </a>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .search-input-wrapper {
      position: relative;
      width: 100%;
      max-width: 400px;
    }

    .search-icon {
      position: absolute;
      left: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      width: 18px;
      height: 18px;
      color: hsl(var(--muted-foreground));
      pointer-events: none;
    }

    .search-input {
      width: 100%;
      padding: 0.625rem 2.5rem 0.625rem 2.5rem;
      background: hsl(var(--background));
      border: 1px solid hsl(var(--border));
      border-radius: calc(var(--radius) - 0.25rem);
      color: hsl(var(--foreground));
      font-size: 0.875rem;
      transition: all 0.2s;

      &:focus {
        outline: none;
        border-color: hsl(var(--ring));
        box-shadow: 0 0 0 2px hsl(var(--ring) / 0.1);
      }

      &::placeholder {
        color: hsl(var(--muted-foreground));
      }
    }

    .loading-indicator, .clear-btn {
      position: absolute;
      right: 0.5rem;
      top: 50%;
      transform: translateY(-50%);
    }

    .loading-indicator .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid hsl(var(--border));
      border-top-color: hsl(var(--accent));
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .clear-btn {
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: hsl(var(--muted));
      border: none;
      border-radius: 50%;
      cursor: pointer;
      color: hsl(var(--muted-foreground));
      transition: all 0.2s;

      &:hover {
        background: hsl(var(--destructive));
        color: hsl(var(--destructive-foreground));
      }
    }

    .search-dropdown {
      position: absolute;
      top: calc(100% + 0.5rem);
      left: 0;
      right: 0;
      background: hsl(var(--card));
      border: 1px solid hsl(var(--border));
      border-radius: var(--radius);
      box-shadow: 0 8px 32px hsl(var(--shadow) / 0.15);
      z-index: 1000;
      max-height: 400px;
      overflow-y: auto;
      animation: slideIn 0.15s ease;

      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateY(-8px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    }

    .dropdown-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 1.5rem;
      color: hsl(var(--muted-foreground));
      font-size: 0.875rem;

      .spinner-small {
        width: 14px;
        height: 14px;
        border: 2px solid hsl(var(--border));
        border-top-color: hsl(var(--accent));
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
    }

    .dropdown-section {
      border-bottom: 1px solid hsl(var(--border));

      &:last-child {
        border-bottom: none;
      }

      .section-header {
        display: flex;
        align-items: center;
        gap: 0.375rem;
        padding: 0.625rem 0.875rem;
        font-size: 0.75rem;
        font-weight: 600;
        color: hsl(var(--muted-foreground));
        text-transform: uppercase;
        letter-spacing: 0.025em;

        lucide-icon {
          width: 14px;
          height: 14px;
        }

        .section-count {
          margin-left: auto;
          background: hsl(var(--muted));
          padding: 0.125rem 0.375rem;
          border-radius: 9999px;
          font-size: 0.7rem;
        }

        .clear-all-btn {
          margin-left: auto;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          background: transparent;
          border: none;
          border-radius: calc(var(--radius) - 0.25rem);
          cursor: pointer;
          color: hsl(var(--muted-foreground));
          transition: all 0.2s;

          &:hover {
            background: hsl(var(--destructive) / 0.1);
            color: hsl(var(--destructive));
          }

          lucide-icon {
            width: 12px;
            height: 12px;
          }
        }
      }
    }

    .suggestion-item {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      width: 100%;
      padding: 0.625rem 0.875rem;
      background: transparent;
      border: none;
      cursor: pointer;
      transition: background 0.15s;
      text-align: left;

      &:hover, &.selected {
        background: hsl(var(--muted));
      }

      .clear-item-btn {
        margin-left: auto;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        background: transparent;
        border: none;
        border-radius: 50%;
        cursor: pointer;
        color: hsl(var(--muted-foreground));
        opacity: 0;
        transition: all 0.2s;

        .suggestion-item:hover & {
          opacity: 1;
        }

        &:hover {
          background: hsl(var(--destructive));
          color: hsl(var(--destructive-foreground));
        }

        lucide-icon {
          width: 12px;
          height: 12px;
        }
      }

      .suggestion-icon {
        width: 14px;
        height: 14px;
        color: hsl(var(--muted-foreground));
        flex-shrink: 0;
      }

      .user-avatar {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        object-fit: cover;
        flex-shrink: 0;
      }

      .suggestion-content {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 0.125rem;

        .suggestion-label {
          font-size: 0.875rem;
          color: hsl(var(--foreground));
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .suggestion-sublabel {
          font-size: 0.75rem;
          color: hsl(var(--muted-foreground));
        }
      }
    }

    .dropdown-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 2rem 1.5rem;
      text-align: center;
      color: hsl(var(--muted-foreground));

      lucide-icon {
        width: 24px;
        height: 24px;
        margin-bottom: 0.5rem;
        opacity: 0.5;
      }

      p {
        margin: 0;
        font-size: 0.875rem;

        &.empty-hint {
          font-size: 0.75rem;
          margin-top: 0.25rem;
        }
      }
    }

    .dropdown-footer {
      padding: 0.75rem 0.875rem;
      border-top: 1px solid hsl(var(--border));
      text-align: center;

      a {
        font-size: 0.875rem;
        font-weight: 500;
        color: hsl(var(--accent));
        text-decoration: none;

        &:hover {
          text-decoration: underline;
        }
      }
    }
  `]
})
export class SearchInputComponent implements OnInit, OnDestroy {
  searchIcon = Search;
  closeIcon = X;
  clockIcon = Clock;
  trendingIcon = TrendingUp;
  userIcon = User;
  hashIcon = Hash;
  trashIcon = Trash2;

  query = signal<string>('');
  isFocused = signal(false);
  isLoading = signal(false);
  selectedIndex = signal(-1);
  destroy$ = new Subject<void>();
  showClearAll = signal(false);

  recentSearches = signal<Suggestion[]>([]);
  trendingHashtags = signal<SearchHashtag[]>([]);
  suggestedUsers = signal<SearchUser[]>([]);
  searchResults = signal<Suggestion[]>([]);

  showDropdown = computed(() => this.isFocused() && !this.isLoading());

  groupedResults = computed(() => {
    const results = this.searchResults();
    const posts = results.filter(r => r.type === 'post');
    const users = results.filter(r => r.type === 'user');
    const hashtags = results.filter(r => r.type === 'hashtag');

    const groups: { type: string; label: string; items: Suggestion[] }[] = [];
    if (users.length > 0) groups.push({ type: 'user', label: 'Users', items: users });
    if (hashtags.length > 0) groups.push({ type: 'hashtag', label: 'Hashtags', items: hashtags });
    if (posts.length > 0) groups.push({ type: 'post', label: 'Posts', items: posts });

    return groups;
  });

  hasResults = computed(() => this.searchResults().length > 0);
  hasQuery = computed(() => this.query().trim().length > 0);

  constructor(
    private searchService: SearchService,
    private elementRef: ElementRef
  ) {}

  ngOnInit(): void {
    this.loadRecentSearches();
    this.loadTrendingHashtags();
    this.loadSuggestedUsers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isFocused.set(false);
    }
  }

  /**
   * Load recent searches from localStorage
   */
  loadRecentSearches(): void {
    const stored = localStorage.getItem('recent_searches');
    if (stored) {
      try {
        const searches: RecentSearch[] = JSON.parse(stored);
        // Filter to last 10 searches and convert to suggestions
        const recent = searches.slice(0, 10).map(s => ({
          type: 'recent' as const,
          item: { query: s.query, timestamp: s.timestamp },
          label: s.query
        }));
        this.recentSearches.set(recent);
        this.showClearAll.set(recent.length > 0);
      } catch {
        this.recentSearches.set([]);
        this.showClearAll.set(false);
      }
    } else {
      this.recentSearches.set([]);
      this.showClearAll.set(false);
    }
  }

  /**
   * Load trending hashtags
   */
  loadTrendingHashtags(): void {
    this.trendingHashtags.set(this.searchService.getTrendingHashtags());
  }

  /**
   * Load suggested users
   */
  loadSuggestedUsers(): void {
    this.suggestedUsers.set(this.searchService.getSuggestedUsers(5));
  }

  /**
   * Handle input event with debounce
   */
  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    this.query.set(value);
    this.selectedIndex.set(-1);

    if (value.trim().length >= 2) {
      this.performSearch(value);
    } else {
      this.searchResults.set([]);
    }
  }

  /**
   * Perform search with debounce
   */
  private performSearch(query: string): void {
    this.isLoading.set(true);
    
    // Simple debounce using setTimeout
    setTimeout(() => {
      const results = this.searchService.searchAll(query, 5);
      this.searchResults.set(results.map(r => ({
        type: r.type,
        item: r.item,
        label: this.getLabelForItem(r.type, r.item),
        sublabel: this.getSublabelForItem(r.type, r.item)
      })));
      this.isLoading.set(false);
    }, 300);
  }

  /**
   * Handle focus
   */
  onFocus(): void {
    this.isFocused.set(true);
    this.loadTrendingHashtags();
    this.loadSuggestedUsers();
  }

  /**
   * Handle blur
   */
  onBlur(): void {
    // Delay to allow click on suggestion
    setTimeout(() => {
      this.isFocused.set(false);
    }, 150);
  }

  /**
   * Handle arrow down
   */
  onArrowDown(event: KeyboardEvent): void {
    event.preventDefault();
    const maxIndex = this.getTotalSuggestionsCount() - 1;
    if (this.selectedIndex() < maxIndex) {
      this.selectedIndex.update(i => i + 1);
    }
  }

  /**
   * Handle arrow up
   */
  onArrowUp(event: KeyboardEvent): void {
    event.preventDefault();
    if (this.selectedIndex() > 0) {
      this.selectedIndex.update(i => i - 1);
    }
  }

  /**
   * Handle enter
   */
  onEnter(event: KeyboardEvent): void {
    event.preventDefault();
    const index = this.selectedIndex();
    if (index >= 0) {
      const suggestion = this.getSuggestionAtIndex(index);
      if (suggestion) {
        this.selectSuggestion(suggestion);
      }
    } else if (this.hasQuery()) {
      this.performFullSearch();
    }
  }

  /**
   * Handle escape
   */
  onEscape(event: KeyboardEvent): void {
    event.preventDefault();
    this.isFocused.set(false);
    this.selectedIndex.set(-1);
  }

  /**
   * Clear search
   */
  clear(): void {
    this.query.set('');
    this.searchResults.set([]);
    this.selectedIndex.set(-1);
  }

  /**
   * Select a suggestion
   */
  selectSuggestion(suggestion: Suggestion): void {
    this.query.set(suggestion.label);
    this.isFocused.set(false);
    this.saveRecentSearch(suggestion);
    
    // Navigate to search results page
    // In a real app, this would trigger the search
    console.log('Selected suggestion:', suggestion);
  }

  /**
   * Select a user
   */
  selectUser(user: SearchUser): void {
    this.query.set(user.display_name);
    this.isFocused.set(false);
    this.saveRecentSearch({
      type: 'user',
      item: user,
      label: user.display_name,
      sublabel: user.username
    });
  }

  /**
   * Select a hashtag
   */
  selectHashtag(hashtag: SearchHashtag): void {
    this.query.set(hashtag.tag);
    this.isFocused.set(false);
    this.saveRecentSearch({
      type: 'hashtag',
      item: hashtag,
      label: hashtag.tag
    });
  }

  /**
   * Perform full search
   */
  performFullSearch(): void {
    if (this.hasQuery()) {
      this.saveRecentSearch({
        type: 'recent',
        item: null,
        label: this.query()
      });
      // Navigate to search results page
      console.log('Performing full search:', this.query());
    }
  }

  /**
   * Save recent search
   */
  private saveRecentSearch(suggestion: Suggestion): void {
    const stored = localStorage.getItem('recent_searches');
    let searches: RecentSearch[] = [];
    
    if (stored) {
      try {
        searches = JSON.parse(stored);
      } catch {
        searches = [];
      }
    }
    
    // Remove existing entry if present
    searches = searches.filter(s => s.query !== suggestion.label);
    
    // Add new search at the beginning
    searches.unshift({
      query: suggestion.label,
      timestamp: Date.now()
    });
    
    // Keep only last 10
    searches = searches.slice(0, 10);
    
    localStorage.setItem('recent_searches', JSON.stringify(searches));
    
    // Update signal
    this.loadRecentSearches();
  }

  /**
   * Clear individual recent search
   */
  clearRecentSearch(index: number, event: MouseEvent): void {
    event.stopPropagation();
    const current = this.recentSearches();
    const removed = current[index];
    
    const stored = localStorage.getItem('recent_searches');
    let searches: RecentSearch[] = [];
    
    if (stored) {
      try {
        searches = JSON.parse(stored);
      } catch {
        searches = [];
      }
    }
    
    // Remove the specific search
    searches = searches.filter(s => s.query !== removed.label);
    
    localStorage.setItem('recent_searches', JSON.stringify(searches));
    this.loadRecentSearches();
  }

  /**
   * Clear all recent searches
   */
  clearAllRecentSearches(): void {
    localStorage.removeItem('recent_searches');
    this.recentSearches.set([]);
    this.showClearAll.set(false);
  }

  /**
   * Get total suggestions count
   */
  private getTotalSuggestionsCount(): number {
    if (!this.hasQuery()) {
      return this.recentSearches().length + this.trendingHashtags().length + this.suggestedUsers().length;
    }
    return this.searchResults().length;
  }

  /**
   * Get suggestion at index
   */
  private getSuggestionAtIndex(index: number): Suggestion | null {
    if (!this.hasQuery()) {
      const all = [...this.recentSearches(), ...this.trendingHashtags().map(h => ({
        type: 'hashtag' as const,
        item: h,
        label: h.tag,
        sublabel: `${h.count} posts`
      })), ...this.suggestedUsers().map(u => ({
        type: 'user' as const,
        item: u,
        label: u.display_name,
        sublabel: u.username
      }))];
      return all[index] || null;
    }
    return this.searchResults()[index] || null;
  }

  /**
   * Get global index for section
   */
  getGlobalIndex(type: string, localIndex: number): number {
    if (!this.hasQuery()) return localIndex;
    
    let offset = 0;
    const groups = this.groupedResults();
    for (const group of groups) {
      if (group.type === type) {
        return offset + localIndex;
      }
      offset += group.items.length;
    }
    return localIndex;
  }

  /**
   * Get label for item
   */
  private getLabelForItem(type: string, item: any): string {
    switch (type) {
      case 'user':
        return item.display_name;
      case 'hashtag':
        return item.tag;
      case 'post':
        return item.content?.substring(0, 50) || 'Post';
      default:
        return '';
    }
  }

  /**
   * Get sublabel for item
   */
  private getSublabelForItem(type: string, item: any): string | undefined {
    switch (type) {
      case 'user':
        return `@${item.username}`;
      case 'hashtag':
        return `${item.count} posts`;
      case 'post':
        return `By ${item.author?.name || 'Unknown'}`;
      default:
        return undefined;
    }
  }

  /**
   * Get icon for type
   */
  getIconForType(type: string): any {
    switch (type) {
      case 'user':
        return this.userIcon;
      case 'hashtag':
        return this.hashIcon;
      case 'post':
        return this.searchIcon;
      default:
        return this.searchIcon;
    }
  }
}
