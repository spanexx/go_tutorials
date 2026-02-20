import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { LucideAngularModule, Search, Bell, MessageSquare, Sun, Moon, LogOut, User, Settings, ChevronDown } from 'lucide-angular';
import { ThemeService } from '../services/theme.service';
import { SearchService, SearchResult } from '../services/search.service';
import { SearchResultsComponent } from '../search-results/search-results.component';
import { NotificationsService } from '../services/notifications.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule, SearchResultsComponent],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {
  searchIcon = Search;
  bellIcon = Bell;
  messageIcon = MessageSquare;
  sunIcon = Sun;
  moonIcon = Moon;
  logoutIcon = LogOut;
  userIcon = User;
  settingsIcon = Settings;
  chevronIcon = ChevronDown;

  isSearchActive = false;
  searchInputValue = '';
  showUserMenu = false;

  constructor(
    public themeService: ThemeService,
    private searchService: SearchService,
    private notificationsService: NotificationsService,
    public authService: AuthService
  ) {}

  toggleSearch() {
    this.isSearchActive = !this.isSearchActive;
  }

  toggleUserMenu() {
    this.showUserMenu = !this.showUserMenu;
  }

  closeUserMenu() {
    this.showUserMenu = false;
  }

  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchInputValue = input.value;
    this.searchService.search(this.searchInputValue);
  }

  onSearchSubmit(event: Event): void {
    event.preventDefault();
    if (this.searchInputValue.trim()) {
      this.searchService.search(this.searchInputValue);
    }
  }

  clearSearch(): void {
    this.searchInputValue = '';
    this.searchService.clearSearch();
  }

  get hasQuery(): boolean {
    return this.searchInputValue.trim().length > 0;
  }

  get searchResults(): SearchResult {
    return this.searchService.searchResults;
  }

  get isSearching(): boolean {
    return this.searchService.isSearching;
  }

  get showResults(): boolean {
    return this.isSearchActive && (this.hasQuery || this.isSearching);
  }

  get unreadNotifications(): number {
    return this.notificationsService.unreadCount;
  }

  logout(): void {
    this.authService.logout();
    this.closeUserMenu();
    window.location.reload();
  }
}
