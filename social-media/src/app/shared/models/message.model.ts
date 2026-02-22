/**
 * Message Model
 *
 * Represents a direct message between users.
 *
 * CID: Phase-3 Milestone 3.3 - Direct Messaging
 */

export interface User {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string;
  is_verified?: boolean;
  is_online?: boolean;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  updated_at?: string;
  is_read: boolean;
  sender?: User;
}

export interface Conversation {
  id: string;
  participants: User[];
  last_message?: Message;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

export interface ConversationResponse {
  conversations: Conversation[];
  total_count: number;
  has_more: boolean;
  page: number;
  limit: number;
}

export interface MessagesResponse {
  messages: Message[];
  total_count: number;
  has_more: boolean;
  page: number;
  limit: number;
}

export interface SendMessageInput {
  conversation_id: string;
  content: string;
}

export interface CreateConversationInput {
  user_id: string;
}
