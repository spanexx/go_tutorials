/**
 * ConversationListComponent
 *
 * Conversation list sidebar showing all chats:
 * - List of conversations ordered by most recent
 * - Participant avatar and name
 * - Last message preview (truncated)
 * - Unread count badge
 * - Timestamp of last message
 * - Click to open conversation
 * - Search conversations
 *
 * CID: Phase-3 Milestone 3.6 - Messages Enhancement
 */
import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Search, MessageCircle, MoreVertical } from 'lucide-angular';
import { Conversation } from '../../models/message.model';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-conversation-list',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  template: `
    <div class="conversation-list-container">
      <!-- Search Header -->
      <div class="search-header">
        <div class="search-input-wrapper">
          <lucide-icon [img]="searchIcon" [size]="16" class="search-icon"></lucide-icon>
          <input
            type="text"
            [placeholder]="searchPlaceholder"
            [value]="searchQuery()"
            (input)="onSearchInput($event)"
            class="search-input"
          />
        </div>
      </div>

      <!-- Conversations List -->
      <div class="conversations-list">
        @if (filteredConversations().length === 0) {
          <div class="empty-state">
            <lucide-icon [img]="messageIcon" [size]="48" class="empty-icon"></lucide-icon>
            <p class="empty-text">{{ conversations().length === 0 ? 'No conversations yet' : 'No matches found' }}</p>
            <p class="empty-hint">{{ conversations().length === 0 ? 'Start a new conversation to begin messaging' : 'Try a different search term' }}</p>
          </div>
        } @else {
          @for (conversation of filteredConversations(); track conversation.id) {
            <div
              class="conversation-item"
              [class.active]="conversation.id === activeConversationId()"
              [class.unread]="conversation.unread_count > 0"
              (click)="onConversationClick(conversation)"
            >
              <!-- Avatar -->
              <div class="avatar-wrapper">
                <img
                  [src]="getOtherUser(conversation).avatar_url || avatarPlaceholder"
                  [alt]="getOtherUser(conversation).display_name"
                  class="avatar"
                />
                @if (getOtherUser(conversation).is_online) {
                  <span class="online-indicator"></span>
                }
              </div>

              <!-- Content -->
              <div class="conversation-content">
                <!-- Header: Name + Time -->
                <div class="conversation-header">
                  <h3 class="participant-name">{{ getOtherUser(conversation).display_name }}</h3>
                  <span class="message-time" [class.unread-time]="conversation.unread_count > 0">
                    {{ formatTimestamp(conversation.updated_at) }}
                  </span>
                </div>

                <!-- Last Message + Unread Badge -->
                <div class="conversation-footer">
                  <p class="last-message" [class.unread-message]="conversation.unread_count > 0">
                    {{ truncateMessage(conversation.last_message?.content || 'No messages yet') }}
                  </p>
                  @if (conversation.unread_count > 0) {
                    <span class="unread-badge">{{ conversation.unread_count }}</span>
                  }
                </div>
              </div>

              <!-- More Options -->
              <button class="more-button" (click)="onMoreClick($event, conversation)">
                <lucide-icon [img]="moreIcon" [size]="16"></lucide-icon>
              </button>
            </div>
          }
        }
      </div>
    </div>
  `,
  styles: [`
    .conversation-list-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: hsl(var(--background));
      border-right: 1px solid hsl(var(--border));
    }

    .search-header {
      padding: 1rem;
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

    .search-input {
      width: 100%;
      padding: 0.5rem 0.75rem 0.5rem 2.25rem;
      border: 1px solid hsl(var(--border));
      border-radius: calc(var(--radius) - 2px);
      background: hsl(var(--background));
      color: hsl(var(--foreground));
      font-size: 0.875rem;

      &::placeholder {
        color: hsl(var(--muted-foreground));
      }

      &:focus {
        outline: none;
        border-color: hsl(var(--ring));
        box-shadow: 0 0 0 2px hsl(var(--ring) / 0.2);
      }
    }

    .conversations-list {
      flex: 1;
      overflow-y: auto;
    }

    .empty-state {
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
        margin-bottom: 0.25rem;
        color: hsl(var(--foreground));
      }

      .empty-hint {
        font-size: 0.875rem;
      }
    }

    .conversation-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem 1rem;
      cursor: pointer;
      transition: background-color 0.2s;
      border-bottom: 1px solid hsl(var(--border) / 0.5);

      &:hover {
        background: hsl(var(--muted) / 0.5);
      }

      &.active {
        background: hsl(var(--accent));
      }

      &.unread {
        background: hsl(var(--accent) / 0.3);
      }
    }

    .avatar-wrapper {
      position: relative;
      flex-shrink: 0;

      .avatar {
        width: 48px;
        height: 48px;
        border-radius: 50%;
        object-fit: cover;
      }

      .online-indicator {
        position: absolute;
        bottom: 0;
        right: 0;
        width: 12px;
        height: 12px;
        background: hsl(var(--success));
        border: 2px solid hsl(var(--background));
        border-radius: 50%;
      }
    }

    .conversation-content {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .conversation-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
    }

    .participant-name {
      font-size: 0.9375rem;
      font-weight: 600;
      color: hsl(var(--foreground));
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .message-time {
      font-size: 0.75rem;
      color: hsl(var(--muted-foreground));
      flex-shrink: 0;

      &.unread-time {
        color: hsl(var(--accent-foreground));
        font-weight: 600;
      }
    }

    .conversation-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
    }

    .last-message {
      font-size: 0.8125rem;
      color: hsl(var(--muted-foreground));
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;

      &.unread-message {
        color: hsl(var(--foreground));
        font-weight: 500;
      }
    }

    .unread-badge {
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 20px;
      height: 20px;
      padding: 0 0.375rem;
      background: hsl(var(--destructive));
      color: hsl(var(--destructive-foreground));
      font-size: 0.6875rem;
      font-weight: 600;
      border-radius: 9999px;
      flex-shrink: 0;
    }

    .more-button {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.25rem;
      background: transparent;
      border: none;
      border-radius: calc(var(--radius) - 2px);
      color: hsl(var(--muted-foreground));
      cursor: pointer;
      opacity: 0;
      transition: all 0.2s;

      &:hover {
        background: hsl(var(--muted));
        color: hsl(var(--foreground));
      }

      .conversation-item:hover & {
        opacity: 1;
      }
    }

    /* Scrollbar Styling */
    .conversations-list::-webkit-scrollbar {
      width: 6px;
    }

    .conversations-list::-webkit-scrollbar-track {
      background: transparent;
    }

    .conversations-list::-webkit-scrollbar-thumb {
      background: hsl(var(--border));
      border-radius: 3px;

      &:hover {
        background: hsl(var(--muted-foreground) / 0.5);
      }
    }
  `]
})
export class ConversationListComponent {
  @Input() set conversations(value: Conversation[]) {
    this.conversationsSignal.set(value || []);
  }
  @Input() activeConversationId = signal<string | null>(null);
  @Input() searchPlaceholder = 'Search conversations...';
  @Input() avatarPlaceholder = '/assets/images/default-avatar.png';

  @Output() conversationClick = new EventEmitter<Conversation>();
  @Output() moreClick = new EventEmitter<{ event: MouseEvent; conversation: Conversation }>();
  @Output() search = new EventEmitter<string>();

  searchIcon = Search;
  messageIcon = MessageCircle;
  moreIcon = MoreVertical;

  conversationsSignal = signal<Conversation[]>([]);
  searchQuery = signal('');

  // Current user ID for filtering participants
  currentUserId = computed(() => this.authService.user?.id || '');

  readonly conversations = this.conversationsSignal.asReadonly();

  constructor(private authService: AuthService) {}

  filteredConversations = computed(() => {
    const conversations = this.conversationsSignal();
    const query = this.searchQuery().toLowerCase().trim();

    if (!query) {
      // Sort by most recent
      return [...conversations].sort((a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
    }

    // Filter by participant name or username
    return conversations.filter(conv => {
      const otherUser = this.getOtherUser(conv);
      return (
        otherUser.display_name.toLowerCase().includes(query) ||
        otherUser.username.toLowerCase().includes(query)
      );
    }).sort((a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  });

  /**
   * Get the other participant (not current user)
   */
  getOtherUser(conversation: Conversation): any {
    // Filter out current user from participants to get the other user
    const currentId = this.currentUserId();
    const otherUser = conversation.participants.find(p => p.id !== currentId);
    
    // Return the other participant, or a default user if not found
    return otherUser || {
      id: '',
      username: '',
      display_name: '',
      avatar_url: '',
      is_online: false
    };
  }

  /**
   * Truncate message preview
   */
  truncateMessage(message: string, maxLength: number = 35): string {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
  }

  /**
   * Format timestamp
   */
  formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }

    const isThisYear = date.getFullYear() === now.getFullYear();
    if (isThisYear) {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  /**
   * Handle search input
   */
  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
    this.search.emit(input.value);
  }

  /**
   * Handle conversation click
   */
  onConversationClick(conversation: Conversation): void {
    this.conversationClick.emit(conversation);
  }

  /**
   * Handle more button click
   */
  onMoreClick(event: MouseEvent, conversation: Conversation): void {
    event.stopPropagation();
    this.moreClick.emit({ event, conversation });
  }
}
