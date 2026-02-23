/**
 * NewConversationDialogComponent
 *
 * Dialog for starting new conversations:
 * - 'New message' button trigger
 * - User search/select dialog
 * - Search users by name/username
 * - Select user to start conversation
 * - Prevent duplicate conversations
 * - Navigate to new conversation
 *
 * CID: Phase-3 Milestone 3.6 - Messages Enhancement
 */
import { Component, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Search, X, User, MessageCircle, Loader2 } from 'lucide-angular';
import { User as UserModel } from '../../models/message.model';

export interface UserSearchResult {
  id: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  is_verified?: boolean;
  bio?: string;
}

@Component({
  selector: 'app-new-conversation-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    @if (isOpen()) {
      <div class="dialog-overlay" (click)="onOverlayClick($event)">
        <div class="dialog-content" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
          <!-- Header -->
          <div class="dialog-header">
            <h2 id="dialog-title" class="dialog-title">New Message</h2>
            <button class="close-button" (click)="onClose()" title="Close">
              <lucide-icon [img]="closeIcon" [size]="20"></lucide-icon>
            </button>
          </div>

          <!-- Search Input -->
          <div class="search-container">
            <div class="search-input-wrapper">
              <lucide-icon [img]="searchIcon" [size]="18" class="search-icon"></lucide-icon>
              <input
                type="text"
                [placeholder]="searchPlaceholder"
                [value]="searchQuery()"
                (input)="onSearchInput($event)"
                class="search-input"
                autocomplete="off"
              />
              @if (isLoading()) {
                <lucide-icon [img]="loaderIcon" [size]="18" class="loader-icon spin"></lucide-icon>
              }
            </div>
          </div>

          <!-- Search Results -->
          <div class="search-results">
            @if (isLoading()) {
              <div class="loading-state">
                <lucide-icon [img]="loaderIcon" [size]="24" class="spin"></lucide-icon>
                <span>Searching users...</span>
              </div>
            } @else if (hasSearched() && filteredUsers().length === 0) {
              <div class="empty-state">
                <lucide-icon [img]="userIcon" [size]="48" class="empty-icon"></lucide-icon>
                <p class="empty-text">No users found</p>
                <p class="empty-hint">Try searching with a different name or username</p>
              </div>
            } @else if (!hasSearched()) {
              <div class="initial-state">
                <lucide-icon [img]="messageCircleIcon" [size]="48" class="empty-icon"></lucide-icon>
                <p class="empty-text">Start a new conversation</p>
                <p class="empty-hint">Search for a user by name or username</p>
              </div>
            } @else {
              <div class="users-list">
                @for (user of filteredUsers(); track user.id) {
                  <div
                    class="user-item"
                    [class.selected]="selectedUserId() === user.id"
                    [class.disabled]="isExistingConversation(user.id)"
                    (click)="onUserClick(user)"
                  >
                    <img
                      [src]="user.avatar_url || avatarPlaceholder"
                      [alt]="user.display_name"
                      class="user-avatar"
                    />
                    <div class="user-info">
                      <div class="user-header">
                        <h3 class="user-name">{{ user.display_name }}</h3>
                        @if (user.is_verified) {
                          <span class="verified-badge" title="Verified">✓</span>
                        }
                      </div>
                      <p class="user-username">@{{ user.username }}</p>
                      @if (user.bio) {
                        <p class="user-bio">{{ truncateBio(user.bio) }}</p>
                      }
                    </div>
                    @if (isExistingConversation(user.id)) {
                      <span class="existing-badge">
                        <lucide-icon [img]="messageCircleIcon" [size]="16"></lucide-icon>
                        Existing
                      </span>
                    } @else if (selectedUserId() === user.id) {
                      <span class="selected-badge">Selected</span>
                    }
                  </div>
                }
              </div>
            }
          </div>

          <!-- Footer Actions -->
          <div class="dialog-footer">
            <button class="cancel-button" (click)="onClose()">Cancel</button>
            <button
              class="start-button"
              [disabled]="!canStart()"
              (click)="onStartConversation()"
            >
              <lucide-icon [img]="messageCircleIcon" [size]="18"></lucide-icon>
              Start Conversation
            </button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .dialog-overlay {
      position: fixed;
      inset: 0;
      background: hsl(var(--foreground) / 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      padding: 1rem;
      animation: fadeIn 0.2s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .dialog-content {
      background: hsl(var(--background));
      border-radius: calc(var(--radius) + 4px);
      width: 100%;
      max-width: 500px;
      max-height: 80vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 25px 50px -12px hsl(var(--shadow));
      animation: slideUp 0.3s ease-out;
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .dialog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid hsl(var(--border));
    }

    .dialog-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: hsl(var(--foreground));
      margin: 0;
    }

    .close-button {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border: none;
      background: transparent;
      border-radius: calc(var(--radius) - 2px);
      color: hsl(var(--muted-foreground));
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        background: hsl(var(--muted));
        color: hsl(var(--foreground));
      }
    }

    .search-container {
      padding: 1rem 1.5rem;
      border-bottom: 1px solid hsl(var(--border));
    }

    .search-input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .search-icon {
      position: absolute;
      left: 0.75rem;
      color: hsl(var(--muted-foreground));
      pointer-events: none;
    }

    .loader-icon {
      position: absolute;
      right: 0.75rem;
      color: hsl(var(--muted-foreground));
    }

    .spin {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .search-input {
      width: 100%;
      padding: 0.625rem 0.75rem 0.625rem 2.25rem;
      border: 1px solid hsl(var(--border));
      border-radius: calc(var(--radius) - 2px);
      background: hsl(var(--background));
      color: hsl(var(--foreground));
      font-size: 0.9375rem;

      &::placeholder {
        color: hsl(var(--muted-foreground));
      }

      &:focus {
        outline: none;
        border-color: hsl(var(--ring));
        box-shadow: 0 0 0 2px hsl(var(--ring) / 0.2);
      }
    }

    .search-results {
      flex: 1;
      overflow-y: auto;
      min-height: 200px;
      max-height: 400px;
    }

    .loading-state,
    .empty-state,
    .initial-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem 1rem;
      text-align: center;
      color: hsl(var(--muted-foreground));

      .empty-icon {
        margin-bottom: 1rem;
        opacity: 0.5;
      }

      .empty-text {
        font-size: 1rem;
        font-weight: 600;
        color: hsl(var(--foreground));
        margin-bottom: 0.25rem;
      }

      .empty-hint {
        font-size: 0.875rem;
      }
    }

    .users-list {
      display: flex;
      flex-direction: column;
    }

    .user-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.875rem 1.5rem;
      cursor: pointer;
      transition: background-color 0.2s;
      border-bottom: 1px solid hsl(var(--border) / 0.5);

      &:hover:not(.disabled) {
        background: hsl(var(--muted) / 0.5);
      }

      &.selected {
        background: hsl(var(--accent));
      }

      &.disabled {
        cursor: not-allowed;
        opacity: 0.6;
      }
    }

    .user-avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      object-fit: cover;
      flex-shrink: 0;
    }

    .user-info {
      flex: 1;
      min-width: 0;
    }

    .user-header {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      margin-bottom: 0.125rem;
    }

    .user-name {
      font-size: 0.9375rem;
      font-weight: 600;
      color: hsl(var(--foreground));
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .verified-badge {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      height: 16px;
      background: hsl(var(--primary));
      color: white;
      font-size: 0.625rem;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .user-username {
      font-size: 0.8125rem;
      color: hsl(var(--muted-foreground));
      margin: 0;
    }

    .user-bio {
      font-size: 0.75rem;
      color: hsl(var(--muted-foreground));
      margin: 0.25rem 0 0 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .existing-badge,
    .selected-badge {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.25rem 0.5rem;
      font-size: 0.75rem;
      font-weight: 500;
      border-radius: calc(var(--radius) - 4px);
      flex-shrink: 0;
    }

    .existing-badge {
      background: hsl(var(--muted));
      color: hsl(var(--muted-foreground));
    }

    .selected-badge {
      background: hsl(var(--primary));
      color: hsl(var(--primary-foreground));
    }

    .dialog-footer {
      display: flex;
      gap: 0.75rem;
      padding: 1rem 1.5rem;
      border-top: 1px solid hsl(var(--border));
    }

    .cancel-button {
      flex: 1;
      padding: 0.625rem 1rem;
      border: 1px solid hsl(var(--border));
      background: transparent;
      color: hsl(var(--foreground));
      border-radius: calc(var(--radius) - 2px);
      font-size: 0.9375rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        background: hsl(var(--muted));
      }
    }

    .start-button {
      flex: 2;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.625rem 1rem;
      border: none;
      background: hsl(var(--primary));
      color: hsl(var(--primary-foreground));
      border-radius: calc(var(--radius) - 2px);
      font-size: 0.9375rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;

      &:hover:not(:disabled) {
        background: hsl(var(--primary) / 0.9);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    /* Scrollbar Styling */
    .search-results::-webkit-scrollbar {
      width: 6px;
    }

    .search-results::-webkit-scrollbar-track {
      background: transparent;
    }

    .search-results::-webkit-scrollbar-thumb {
      background: hsl(var(--border));
      border-radius: 3px;

      &:hover {
        background: hsl(var(--muted-foreground) / 0.5);
      }
    }
  `]
})
export class NewConversationDialogComponent {
  @Output() close = new EventEmitter<void>();
  @Output() startConversation = new EventEmitter<string>(); // Emits userId
  @Output() searchUsers = new EventEmitter<string>(); // Emits search query

  closeIcon = X;
  searchIcon = Search;
  userIcon = User;
  messageCircleIcon = MessageCircle;
  loaderIcon = Loader2;

  isOpen = signal(false);
  searchQuery = signal('');
  selectedUserId = signal<string | null>(null);
  isLoading = signal(false);
  hasSearched = signal(false);
  allUsers = signal<UserSearchResult[]>([]);
  existingConversationUserIds = signal<string[]>([]);

  searchPlaceholder = 'Search by name or username...';
  avatarPlaceholder = '/assets/images/default-avatar.png';

  /**
   * Filtered users based on search query
   */
  filteredUsers = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) return [];

    return this.allUsers().filter(user =>
      user.display_name.toLowerCase().includes(query) ||
      user.username.toLowerCase().includes(query)
    );
  });

  /**
   * Check if can start conversation
   */
  canStart = computed(() => {
    const selectedId = this.selectedUserId();
    return selectedId !== null && !this.isExistingConversation(selectedId);
  });

  /**
   * Open the dialog
   */
  open(): void {
    this.isOpen.set(true);
    this.searchQuery.set('');
    this.selectedUserId.set(null);
    this.hasSearched.set(false);
    this.isLoading.set(false);
  }

  /**
   * Close the dialog
   */
  closeDialog(): void {
    this.isOpen.set(false);
    this.close.emit();
  }

  /**
   * Handle overlay click
   */
  onOverlayClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeDialog();
    }
  }

  /**
   * Handle close button click
   */
  onClose(): void {
    this.closeDialog();
  }

  /**
   * Handle search input
   */
  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const query = target.value;
    this.searchQuery.set(query);
    this.selectedUserId.set(null);

    if (query.trim().length >= 2) {
      this.hasSearched.set(true);
      this.isLoading.set(true);
      this.searchUsers.emit(query);
    } else if (query.trim().length === 0) {
      this.hasSearched.set(false);
      this.allUsers.set([]);
      this.isLoading.set(false);
    }
  }

  /**
   * Set search results (called by parent)
   */
  setSearchResults(users: UserSearchResult[]): void {
    this.allUsers.set(users);
    this.isLoading.set(false);
  }

  /**
   * Set existing conversation user IDs
   */
  setExistingConversations(userIds: string[]): void {
    this.existingConversationUserIds.set(userIds);
  }

  /**
   * Check if user has existing conversation
   */
  isExistingConversation(userId: string): boolean {
    return this.existingConversationUserIds().includes(userId);
  }

  /**
   * Handle user click
   */
  onUserClick(user: UserSearchResult): void {
    if (this.isExistingConversation(user.id)) return;
    this.selectedUserId.set(user.id);
  }

  /**
   * Handle start conversation button
   */
  onStartConversation(): void {
    const userId = this.selectedUserId();
    if (userId) {
      this.startConversation.emit(userId);
    }
  }

  /**
   * Truncate bio for display
   */
  truncateBio(bio: string, maxLength: number = 50): string {
    if (bio.length <= maxLength) return bio;
    return bio.substring(0, maxLength) + '...';
  }
}
