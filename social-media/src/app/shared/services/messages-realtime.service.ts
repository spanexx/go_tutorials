/**
 * MessagesRealtimeService
 *
 * Integrates real-time messaging into the Angular app using WebSocket.
 *
 * Features:
 * - Live message updates in conversation view
 * - Typing indicator display
 * - Online status in user avatars
 * - Unread count in conversation list
 * - Message delivery status
 *
 * CID: Phase-3 Milestone 3.7 - Realtime Service
 */
import { Injectable, OnDestroy } from '@angular/core';
import { WebSocketService, WSMessage, ConnectionStatus } from '../../shared/services/websocket.service';
import { MessageService } from '../../shared/services/message.service';
import { AuthService } from '../../shared/services/auth.service';
import { Conversation, Message } from '../../shared/models/message.model';
import { filter, takeUntil, tap } from 'rxjs/operators';
import { Subject } from 'rxjs';

/**
 * Real-time message payload structure
 */
export interface RealtimeMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
  sender?: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string;
  };
}

/**
 * Typing indicator payload structure
 */
export interface TypingIndicator {
  conversation_id: string;
  user_id: string;
  username: string;
  is_typing: boolean;
}

/**
 * Presence update payload structure
 */
export interface PresenceUpdate {
  user_id: string;
  status: 'online' | 'offline' | 'away' | 'busy';
  last_seen?: string;
}

/**
 * User typing state
 */
export interface UserTypingState {
  userId: string;
  username: string;
  timeout: any;
}

@Injectable({
  providedIn: 'root'
})
export class MessagesRealtimeService implements OnDestroy {
  /** Destroy subject for cleanup */
  private destroySubject = new Subject<void>();

  /** Current conversation ID */
  private currentConversationId: string | null = null;

  /** Typing users map: conversationId -> userId -> UserTypingState */
  private typingUsers = new Map<string, Map<string, UserTypingState>>();

  /** Online users set */
  private onlineUsers = new Set<string>();

  /** Typing indicator subject */
  private typingSubject = new Subject<{ conversationId: string; userId: string; username: string; isTyping: boolean }>();

  /** Presence subject */
  private presenceSubject = new Subject<{ userId: string; status: string }>();

  constructor(
    private wsService: WebSocketService,
    private messageService: MessageService,
    private authService: AuthService
  ) {
    this.setupWebSocketListeners();
  }

  /**
   * Initialize real-time messaging
   * Should be called when user navigates to messages page
   */
  initialize(): void {
    const user = this.authService.user;
    const token = this.authService.getToken();

    if (!user || !token) {
      return;
    }

    // Connect to WebSocket if not already connected
    if (this.wsService.status === ConnectionStatus.DISCONNECTED) {
      this.wsService.connect(token, user.id);
    }
  }

  /**
   * Set current conversation for real-time updates
   */
  setCurrentConversation(conversationId: string | null): void {
    if (this.currentConversationId && this.currentConversationId !== conversationId) {
      // Unsubscribe from old conversation
      this.wsService.unsubscribe(`conversation:${this.currentConversationId}`);
      // Clear typing indicators for old conversation
      this.typingUsers.delete(this.currentConversationId);
    }

    this.currentConversationId = conversationId;

    if (conversationId) {
      // Subscribe to new conversation
      this.subscribeToConversation(conversationId);
    }
  }

  /**
   * Clean up on destroy
   */
  ngOnDestroy(): void {
    this.destroySubject.next();
    this.destroySubject.complete();

    if (this.currentConversationId) {
      this.wsService.unsubscribe(`conversation:${this.currentConversationId}`);
    }
  }

  /**
   * Get typing users for a conversation
   */
  getTypingUsers(conversationId: string): string[] {
    const conversationTyping = this.typingUsers.get(conversationId);
    if (!conversationTyping) {
      return [];
    }

    return Array.from(conversationTyping.values()).map(state => state.username);
  }

  /**
   * Check if a user is online
   */
  isUserOnline(userId: string): boolean {
    return this.onlineUsers.has(userId);
  }

  /**
   * Get all online users
   */
  getOnlineUsers(): string[] {
    return Array.from(this.onlineUsers);
  }

  /**
   * Send typing indicator
   */
  sendTypingIndicator(conversationId: string, isTyping: boolean): void {
    if (!this.wsService.isConnected) {
      return;
    }

    const user = this.authService.user;
    if (!user) {
      return;
    }

    this.wsService.send({
      type: isTyping ? 'typing_start' : 'typing_stop',
      channel: `conversation:${conversationId}`,
      payload: {
        conversation_id: conversationId,
        user_id: user.id,
        username: user.username || user.name
      }
    });
  }

  /**
   * Get typing indicator observable
   */
  onTypingIndicator(): ReturnType<typeof this.typingSubject.asObservable> {
    return this.typingSubject.asObservable();
  }

  /**
   * Get presence update observable
   */
  onPresenceUpdate(): ReturnType<typeof this.presenceSubject.asObservable> {
    return this.presenceSubject.asObservable();
  }

  /**
   * Setup WebSocket connection listeners
   */
  private setupWebSocketListeners(): void {
    // Listen for connection status changes
    this.wsService.status$
      .pipe(
        filter(status => status === ConnectionStatus.CONNECTED),
        takeUntil(this.destroySubject)
      )
      .subscribe(() => {
        // Subscribe to presence channel
        this.subscribeToPresence();
        
        // Re-subscribe to current conversation if exists
        if (this.currentConversationId) {
          this.subscribeToConversation(this.currentConversationId);
        }
      });

    // Listen for new messages
    this.wsService.on<RealtimeMessage>('message')
      .pipe(takeUntil(this.destroySubject))
      .subscribe({
        next: (message: WSMessage<RealtimeMessage>) => {
          this.handleNewMessage(message.payload);
        },
        error: (error) => {
          console.error('Error receiving real-time message:', error);
        }
      });

    // Listen for typing indicators
    this.wsService.on<TypingIndicator>('typing_start')
      .pipe(takeUntil(this.destroySubject))
      .subscribe({
        next: (message: WSMessage<TypingIndicator>) => {
          this.handleTypingStart(message.payload);
        }
      });

    this.wsService.on<TypingIndicator>('typing_stop')
      .pipe(takeUntil(this.destroySubject))
      .subscribe({
        next: (message: WSMessage<TypingIndicator>) => {
          this.handleTypingStop(message.payload);
        }
      });

    // Listen for presence updates
    this.wsService.on<PresenceUpdate>('presence')
      .pipe(takeUntil(this.destroySubject))
      .subscribe({
        next: (message: WSMessage<PresenceUpdate>) => {
          this.handlePresenceUpdate(message.payload);
        }
      });

    // Listen for read receipts
    this.wsService.on('read_receipt')
      .pipe(takeUntil(this.destroySubject))
      .subscribe({
        next: (message: WSMessage) => {
          this.handleReadReceipt(message.payload);
        }
      });
  }

  /**
   * Subscribe to conversation channel
   */
  private subscribeToConversation(conversationId: string): void {
    this.wsService.subscribe(`conversation:${conversationId}`);
  }

  /**
   * Subscribe to presence channel
   */
  private subscribeToPresence(): void {
    this.wsService.subscribe('presence');
  }

  /**
   * Handle new message
   */
  private handleNewMessage(message: RealtimeMessage): void {
    // Don't process own messages (they're already added optimistically)
    const currentUserId = this.authService.user?.id;
    if (message.sender_id === currentUserId) {
      return;
    }

    // Add message to conversation
    this.messageService.addMessage(message.conversation_id, message);

    // Update unread count if not in active conversation
    if (message.conversation_id !== this.currentConversationId) {
      this.messageService.incrementUnreadCount(message.conversation_id);
    }
  }

  /**
   * Handle typing start
   */
  private handleTypingStart(payload: TypingIndicator): void {
    // Don't show typing indicator for own messages
    const currentUserId = this.authService.user?.id;
    if (payload.user_id === currentUserId) {
      return;
    }

    // Get or create conversation typing map
    let conversationTyping = this.typingUsers.get(payload.conversation_id);
    if (!conversationTyping) {
      conversationTyping = new Map();
      this.typingUsers.set(payload.conversation_id, conversationTyping);
    }

    // Clear existing timeout
    const existingState = conversationTyping.get(payload.user_id);
    if (existingState) {
      clearTimeout(existingState.timeout);
    }

    // Set new timeout to auto-clear typing indicator after 5 seconds
    const timeout = setTimeout(() => {
      this.handleTypingStop(payload);
    }, 5000);

    // Store typing state
    conversationTyping.set(payload.user_id, {
      userId: payload.user_id,
      username: payload.username,
      timeout
    });

    // Emit typing indicator event
    this.typingSubject.next({
      conversationId: payload.conversation_id,
      userId: payload.user_id,
      username: payload.username,
      isTyping: true
    });
  }

  /**
   * Handle typing stop
   */
  private handleTypingStop(payload: TypingIndicator): void {
    const conversationTyping = this.typingUsers.get(payload.conversation_id);
    if (!conversationTyping) {
      return;
    }

    const state = conversationTyping.get(payload.user_id);
    if (state) {
      clearTimeout(state.timeout);
      conversationTyping.delete(payload.user_id);
    }

    // Emit typing indicator event
    this.typingSubject.next({
      conversationId: payload.conversation_id,
      userId: payload.user_id,
      username: payload.username,
      isTyping: false
    });
  }

  /**
   * Handle presence update
   */
  private handlePresenceUpdate(payload: PresenceUpdate): void {
    if (payload.status === 'online') {
      this.onlineUsers.add(payload.user_id);
    } else {
      this.onlineUsers.delete(payload.user_id);
    }

    // Emit presence update event
    this.presenceSubject.next({
      userId: payload.user_id,
      status: payload.status
    });
  }

  /**
   * Handle read receipt
   */
  private handleReadReceipt(payload: any): void {
    const { conversation_id, message_ids, read_at } = payload;
    
    // Update message read status in service
    message_ids.forEach((messageId: string) => {
      this.messageService.markMessageAsRead(messageId);
    });
  }
}
