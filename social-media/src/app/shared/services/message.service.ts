/**
 * MessageService
 *
 * Service for managing direct messages and conversations via API.
 *
 * Features:
 * - Signal-based state management for reactive UI updates
 * - Fetch conversations and messages from backend
 * - Send messages and create conversations
 * - Real-time updates via polling (WebSocket for future)
 * - Optimistic UI updates for sending messages
 *
 * CID: Phase-3 Milestone 3.3 - Direct Messaging
 */
import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BaseApiService } from './base-api.service';
import { ToastService } from './toast.service';
import {
  Conversation,
  ConversationResponse,
  Message,
  MessagesResponse,
  SendMessageInput,
  CreateConversationInput
} from '../models/message.model';

interface MessageState {
  conversations: Conversation[];
  currentMessages: Record<string, Message[]>;
  activeConversationId: string | null;
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class MessageService extends BaseApiService {
  private messageState = signal<MessageState>({
    conversations: [],
    currentMessages: {},
    activeConversationId: null,
    isLoading: false,
    isSending: false,
    error: null
  });

  // Computed signals
  readonly conversations = computed(() => this.messageState().conversations);
  readonly activeConversationId = computed(() => this.messageState().activeConversationId);
  readonly isLoading = computed(() => this.messageState().isLoading);
  readonly isSending = computed(() => this.messageState().isSending);
  readonly error = computed(() => this.messageState().error);

  readonly activeMessages = computed(() => {
    const state = this.messageState();
    if (!state.activeConversationId) return [];
    return state.currentMessages[state.activeConversationId] || [];
  });

  readonly activeConversation = computed(() => {
    const state = this.messageState();
    if (!state.activeConversationId) return null;
    return state.conversations.find(c => c.id === state.activeConversationId) || null;
  });

  constructor(
    http: HttpClient,
    private toastService: ToastService
  ) {
    super(http);
  }

  /**
   * Fetch conversations from API
   */
  async getConversations(page: number = 1, limit: number = 20): Promise<ConversationResponse> {
    this.messageState.update(state => ({ ...state, isLoading: true, error: null }));

    try {
      const response = await this.get<ConversationResponse>('/conversations', {
        page: page.toString(),
        limit: limit.toString()
      }).toPromise();

      if (response) {
        this.messageState.update(state => ({
          ...state,
          conversations: page === 1 ? response.conversations : [...state.conversations, ...response.conversations],
          isLoading: false
        }));
        return response;
      }
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
      this.messageState.update(state => ({
        ...state,
        error: 'Failed to load conversations',
        isLoading: false
      }));
    }

    return {
      conversations: [],
      total_count: 0,
      has_more: false,
      page,
      limit
    };
  }

  /**
   * Fetch messages for a conversation
   */
  async getMessages(conversationId: string, page: number = 1, limit: number = 50): Promise<MessagesResponse> {
    this.messageState.update(state => ({ ...state, isLoading: true, error: null }));

    try {
      const response = await this.get<MessagesResponse>(`/conversations/${conversationId}/messages`, {
        page: page.toString(),
        limit: limit.toString()
      }).toPromise();

      if (response) {
        this.messageState.update(state => ({
          ...state,
          currentMessages: {
            ...state.currentMessages,
            [conversationId]: page === 1
              ? response.messages
              : [...(state.currentMessages[conversationId] || []), ...response.messages]
          },
          activeConversationId: conversationId,
          isLoading: false
        }));
        return response;
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      this.messageState.update(state => ({
        ...state,
        error: 'Failed to load messages',
        isLoading: false
      }));
    }

    return {
      messages: [],
      total_count: 0,
      has_more: false,
      page,
      limit
    };
  }

  /**
   * Send a message in a conversation
   */
  async sendMessage(conversationId: string, content: string): Promise<Message | null> {
    this.messageState.update(state => ({ ...state, isSending: true }));

    try {
      const input: SendMessageInput = { conversation_id: conversationId, content };
      const message = await this.post<Message>(`/conversations/${conversationId}/messages`, input).toPromise();

      if (message) {
        this.messageState.update(state => ({
          ...state,
          currentMessages: {
            ...state.currentMessages,
            [conversationId]: [...(state.currentMessages[conversationId] || []), message]
          },
          isSending: false
        }));
        return message;
      }
    } catch (error) {
      console.error('Failed to send message:', error);
      this.toastService.error('Error', 'Failed to send message');
    }

    this.messageState.update(state => ({ ...state, isSending: false }));
    return null;
  }

  /**
   * Create a new conversation with a user
   */
  async createConversation(userId: string): Promise<Conversation | null> {
    this.messageState.update(state => ({ ...state, isLoading: true }));

    try {
      const input: CreateConversationInput = { user_id: userId };
      const conversation = await this.post<Conversation>('/conversations', input).toPromise();

      if (conversation) {
        this.messageState.update(state => ({
          ...state,
          conversations: [conversation, ...state.conversations],
          isLoading: false
        }));
        return conversation;
      }
    } catch (error) {
      console.error('Failed to create conversation:', error);
      this.toastService.error('Error', 'Failed to start conversation');
    }

    this.messageState.update(state => ({ ...state, isLoading: false }));
    return null;
  }

  /**
   * Set active conversation
   */
  setActiveConversation(conversationId: string | null): void {
    this.messageState.update(state => ({ ...state, activeConversationId: conversationId }));
  }

  /**
   * Mark conversation as read
   */
  async markAsRead(conversationId: string): Promise<void> {
    try {
      await this.post(`/conversations/${conversationId}/read`, {}).toPromise();

      // Update local state
      this.messageState.update(state => ({
        ...state,
        conversations: state.conversations.map(c =>
          c.id === conversationId ? { ...c, unread_count: 0 } : c
        )
      }));
    } catch (error) {
      console.warn('Failed to mark conversation as read:', error);
    }
  }

  /**
   * Refresh conversations
   */
  async refreshConversations(): Promise<void> {
    await this.getConversations(1, 20);
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this.messageState.update(state => ({ ...state, error: null }));
  }

  /**
   * Get unread count across all conversations
   */
  getTotalUnreadCount(): number {
    return this.messageState().conversations.reduce((sum, c) => sum + c.unread_count, 0);
  }

  /**
   * Add a message to a conversation (for real-time updates)
   */
  addMessage(conversationId: string, message: Message): void {
    this.messageState.update(state => ({
      ...state,
      currentMessages: {
        ...state.currentMessages,
        [conversationId]: [...(state.currentMessages[conversationId] || []), message]
      }
    }));
  }

  /**
   * Increment unread count for a conversation (for real-time updates)
   */
  incrementUnreadCount(conversationId: string): void {
    this.messageState.update(state => ({
      ...state,
      conversations: state.conversations.map(c =>
        c.id === conversationId ? { ...c, unread_count: c.unread_count + 1 } : c
      )
    }));
  }

  /**
   * Mark a message as read (for real-time updates)
   */
  markMessageAsRead(messageId: string): void {
    this.messageState.update(state => {
      const updatedMessages = { ...state.currentMessages };
      
      // Update message in all conversations
      Object.keys(updatedMessages).forEach(convId => {
        updatedMessages[convId] = updatedMessages[convId].map(msg =>
          msg.id === messageId ? { ...msg, is_read: true } : msg
        );
      });

      return {
        ...state,
        currentMessages: updatedMessages
      };
    });
  }
}
