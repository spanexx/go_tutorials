/**
 * ChatInterfaceComponent
 *
 * Chat view with message history and input:
 * - Header with participant info
 * - Message list (bubble style)
 * - Own messages right-aligned, others left
 * - Timestamp on messages
 * - Read indicators (placeholder)
 * - Typing indicator (placeholder)
 * - Scroll to bottom on new message
 * - Load more history on scroll up
 *
 * CID: Phase-3 Milestone 3.6 - Messages Enhancement
 */
import { Component, Input, Output, EventEmitter, signal, computed, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Phone, Video, Info, MoreVertical, ChevronDown, Loader2 } from 'lucide-angular';
import { Conversation, Message, User } from '../../models/message.model';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-chat-interface',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="chat-interface">
      @if (!activeConversation()) {
        <!-- Empty State -->
        <div class="empty-state">
          <div class="empty-content">
            <div class="empty-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <h3 class="empty-title">Select a conversation</h3>
            <p class="empty-subtitle">Choose a conversation from the list to start messaging</p>
          </div>
        </div>
      } @else {
        <!-- Chat Header -->
        <div class="chat-header">
          <div class="participant-info">
            <img
              [src]="otherUser()?.avatar_url || avatarPlaceholder"
              [alt]="otherUser()?.display_name || 'Participant'"
              class="participant-avatar"
            />
            <div class="participant-details">
              <h2 class="participant-name">{{ otherUser()?.display_name || 'Unknown' }}</h2>
              <span class="participant-status" [class.online]="otherUser()?.is_online">
                {{ otherUser()?.is_online ? 'Online' : 'Offline' }}
              </span>
            </div>
          </div>
          <div class="header-actions">
            <button class="action-button" title="Voice call">
              <lucide-icon [img]="phoneIcon" [size]="20"></lucide-icon>
            </button>
            <button class="action-button" title="Video call">
              <lucide-icon [img]="videoIcon" [size]="20"></lucide-icon>
            </button>
            <button class="action-button" title="More options">
              <lucide-icon [img]="moreIcon" [size]="20"></lucide-icon>
            </button>
          </div>
        </div>

        <!-- Messages List -->
        <div
          class="messages-container"
          #messagesContainer
          (scroll)="onScroll($event)"
        >
          <!-- Load More Indicator -->
          @if (isLoadingMore()) {
            <div class="load-more-indicator">
              <lucide-icon [img]="loaderIcon" [size]="20" class="spin"></lucide-icon>
              <span>Loading older messages...</span>
            </div>
          }

          <!-- Messages -->
          <div class="messages-list">
            @for (message of messages(); track message.id) {
              <div
                class="message-wrapper"
                [class.own]="isOwnMessage(message)"
              >
                @if (!isOwnMessage(message)) {
                  <img
                    [src]="message.sender?.avatar_url || avatarPlaceholder"
                    [alt]="message.sender?.display_name || 'Sender'"
                    class="message-avatar"
                  />
                } @else {
                  <div class="message-avatar-placeholder"></div>
                }

                <div class="message-bubble">
                  <p class="message-content">{{ message.content }}</p>
                  <div class="message-meta">
                    <span class="message-time">{{ formatMessageTime(message.created_at) }}</span>
                    @if (isOwnMessage(message)) {
                      <span class="read-indicator" [class.read]="message.is_read" title="{{ message.is_read ? 'Read' : 'Delivered' }}">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                          <polyline points="20 6 9 17 4 12"/>
                          @if (message.is_read) {
                            <polyline points="20 12 9 17 4 12"/>
                          }
                        </svg>
                      </span>
                    }
                  </div>
                </div>
              </div>
            } @empty {
              <div class="no-messages">
                <p>No messages yet. Start the conversation!</p>
              </div>
            }
          </div>

          <!-- Typing Indicator -->
          @if (isOtherTyping()) {
            <div class="typing-indicator">
              <div class="typing-dot"></div>
              <div class="typing-dot"></div>
              <div class="typing-dot"></div>
            </div>
          }
        </div>

        <!-- Scroll to Bottom Button -->
        @if (showScrollButton()) {
          <button class="scroll-to-bottom" (click)="scrollToBottom()">
            <lucide-icon [img]="chevronDownIcon" [size]="20"></lucide-icon>
          </button>
        }
      }
    </div>
  `,
  styles: [`
    .chat-interface {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: hsl(var(--background));
      overflow: hidden;
    }

    /* Empty State */
    .empty-state {
      display: flex;
      flex: 1;
      align-items: center;
      justify-content: center;
      background: hsl(var(--background));
    }

    .empty-content {
      text-align: center;
      padding: 2rem;
      max-width: 400px;
    }

    .empty-icon {
      margin-bottom: 1.5rem;
      color: hsl(var(--muted-foreground));
      opacity: 0.5;
    }

    .empty-title {
      font-size: 1.25rem;
      font-weight: 600;
      color: hsl(var(--foreground));
      margin-bottom: 0.5rem;
    }

    .empty-subtitle {
      font-size: 0.875rem;
      color: hsl(var(--muted-foreground));
    }

    /* Chat Header */
    .chat-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid hsl(var(--border));
      background: hsl(var(--card));
    }

    .participant-info {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .participant-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      object-fit: cover;
    }

    .participant-details {
      display: flex;
      flex-direction: column;
      gap: 0.125rem;
    }

    .participant-name {
      font-size: 0.9375rem;
      font-weight: 600;
      color: hsl(var(--foreground));
      margin: 0;
    }

    .participant-status {
      font-size: 0.75rem;
      color: hsl(var(--muted-foreground));

      &.online {
        color: hsl(var(--success));
      }
    }

    .header-actions {
      display: flex;
      gap: 0.5rem;
    }

    .action-button {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border: none;
      background: transparent;
      border-radius: calc(var(--radius) - 2px);
      color: hsl(var(--foreground));
      cursor: pointer;
      transition: background-color 0.2s;

      &:hover {
        background: hsl(var(--muted));
      }
    }

    /* Messages Container */
    .messages-container {
      flex: 1;
      overflow-y: auto;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .load-more-indicator {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 0.75rem;
      color: hsl(var(--muted-foreground));
      font-size: 0.875rem;

      .spin {
        animation: spin 1s linear infinite;
      }
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .messages-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .message-wrapper {
      display: flex;
      gap: 0.5rem;
      align-items: flex-end;

      &.own {
        flex-direction: row-reverse;

        .message-bubble {
          background: hsl(var(--primary));
          color: hsl(var(--primary-foreground));

          .message-time {
            color: hsl(var(--primary-foreground) / 0.7);
          }
        }
      }
    }

    .message-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      object-fit: cover;
      flex-shrink: 0;
    }

    .message-avatar-placeholder {
      width: 32px;
      height: 32px;
      flex-shrink: 0;
    }

    .message-bubble {
      max-width: 70%;
      padding: 0.625rem 0.875rem;
      background: hsl(var(--muted));
      border-radius: calc(var(--radius) - 2px);
      word-wrap: break-word;
    }

    .message-content {
      margin: 0 0 0.25rem 0;
      font-size: 0.9375rem;
      line-height: 1.4;
      white-space: pre-wrap;
    }

    .message-meta {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      justify-content: flex-end;
    }

    .message-time {
      font-size: 0.6875rem;
      color: hsl(var(--muted-foreground));
    }

    .read-indicator {
      display: flex;
      align-items: center;
      color: hsl(var(--muted-foreground));

      &.read {
        color: hsl(var(--primary));
      }
    }

    .no-messages {
      text-align: center;
      padding: 2rem;
      color: hsl(var(--muted-foreground));
      font-size: 0.875rem;
    }

    /* Typing Indicator */
    .typing-indicator {
      display: flex;
      gap: 0.25rem;
      padding: 0.75rem 1rem;
      background: hsl(var(--muted));
      border-radius: calc(var(--radius) - 2px);
      width: fit-content;
      align-items: center;
    }

    .typing-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: hsl(var(--muted-foreground));
      animation: typing 1.4s infinite;

      &:nth-child(2) {
        animation-delay: 0.2s;
      }

      &:nth-child(3) {
        animation-delay: 0.4s;
      }
    }

    @keyframes typing {
      0%, 60%, 100% {
        transform: translateY(0);
        opacity: 0.4;
      }
      30% {
        transform: translateY(-4px);
        opacity: 1;
      }
    }

    /* Scroll to Bottom Button */
    .scroll-to-bottom {
      position: absolute;
      bottom: 1rem;
      right: 1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      background: hsl(var(--primary));
      color: hsl(var(--primary-foreground));
      border: none;
      border-radius: 50%;
      cursor: pointer;
      box-shadow: 0 2px 8px hsl(var(--shadow));
      transition: transform 0.2s;

      &:hover {
        transform: scale(1.1);
      }
    }

    /* Scrollbar Styling */
    .messages-container::-webkit-scrollbar {
      width: 6px;
    }

    .messages-container::-webkit-scrollbar-track {
      background: transparent;
    }

    .messages-container::-webkit-scrollbar-thumb {
      background: hsl(var(--border));
      border-radius: 3px;

      &:hover {
        background: hsl(var(--muted-foreground) / 0.5);
      }
    }
  `]
})
export class ChatInterfaceComponent implements AfterViewChecked, OnDestroy {
  @Input() set activeConversation(value: Conversation | null) {
    this.activeConversationSignal.set(value);
  }
  @Input() set messages(value: Message[]) {
    this.messagesSignal.set(value || []);
  }
  @Input() isOtherTyping = signal(false);
  @Input() isLoadingMore = signal(false);
  @Input() avatarPlaceholder = '/assets/images/default-avatar.png';

  @Output() loadMore = new EventEmitter<void>();
  @Output() participantClick = new EventEmitter<User>();

  phoneIcon = Phone;
  videoIcon = Video;
  moreIcon = MoreVertical;
  chevronDownIcon = ChevronDown;
  loaderIcon = Loader2;

  activeConversationSignal = signal<Conversation | null>(null);
  messagesSignal = signal<Message[]>([]);

  readonly activeConversation = this.activeConversationSignal.asReadonly();
  readonly messages = this.messagesSignal.asReadonly();

  showScrollButton = signal(false);
  private lastMessageCount = 0;
  private isNearBottom = true;

  @ViewChild('messagesContainer') private messagesContainer?: ElementRef<HTMLDivElement>;

  constructor(private authService: AuthService) {}

  /**
   * Get current user ID
   */
  currentUserId = computed(() => this.authService.user?.id || '');

  /**
   * Get the other participant in the conversation
   */
  otherUser = computed(() => {
    const conversation = this.activeConversationSignal();
    if (!conversation) return null;

    const currentId = this.currentUserId();
    return conversation.participants.find(p => p.id !== currentId) || null;
  });

  /**
   * Check if a message is from the current user
   */
  isOwnMessage(message: Message): boolean {
    const currentId = this.currentUserId();
    return currentId !== '' && message.sender_id === currentId;
  }

  /**
   * Format message timestamp
   */
  formatMessageTime(timestamp: string): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  /**
   * Handle scroll event for load more
   */
  onScroll(event: Event): void {
    const container = event.target as HTMLElement;
    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;

    // Check if near top (for load more)
    if (scrollTop < 100 && !this.isLoadingMore()) {
      this.loadMore.emit();
    }

    // Check if near bottom (for scroll button visibility)
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
    this.showScrollButton.set(!isNearBottom);
    this.isNearBottom = isNearBottom;
  }

  /**
   * Scroll to bottom of messages
   */
  scrollToBottom(): void {
    this.messagesContainer?.nativeElement.scrollTo({
      top: this.messagesContainer.nativeElement.scrollHeight,
      behavior: 'smooth'
    });
  }

  /**
   * Auto-scroll to bottom on new messages
   */
  ngAfterViewChecked(): void {
    const currentCount = this.messagesSignal().length;
    if (currentCount !== this.lastMessageCount && this.isNearBottom) {
      this.scrollToBottom();
      this.lastMessageCount = currentCount;
    }
  }
}
