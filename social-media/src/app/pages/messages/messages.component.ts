import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule, Search, Edit, Phone, Video, Info, Plus, Smile, Send, Loader2 } from 'lucide-angular';
import { MessageService } from '../../shared/services/message.service';
import { Conversation, Message } from '../../shared/models/message.model';
import { IMAGE_PLACEHOLDERS } from '../../shared/constants/app.constants';

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './messages.component.html',
  styleUrls: ['./messages.component.scss']
})
export class MessagesComponent implements OnInit {
  searchIcon = Search;
  editIcon = Edit;
  phoneIcon = Phone;
  videoIcon = Video;
  infoIcon = Info;
  plusIcon = Plus;
  smileIcon = Smile;
  sendIcon = Send;
  loaderIcon = Loader2;

  avatarPlaceholder = IMAGE_PLACEHOLDERS.avatar;

  // State signals
  isLoading = signal(true);
  isSending = signal(false);
  searchQuery = signal('');
  newMessageContent = signal('');

  // Computed signals
  conversations = computed(() => this.messageService.conversations());
  activeConversation = computed(() => this.messageService.activeConversation());
  activeMessages = computed(() => this.messageService.activeMessages());
  totalUnreadCount = computed(() => this.messageService.getTotalUnreadCount());

  filteredConversations = computed(() => {
    const query = this.searchQuery().toLowerCase();
    if (!query) return this.conversations();

    return this.conversations().filter(conv => {
      const otherUser = this.getOtherUser(conv);
      return otherUser.display_name.toLowerCase().includes(query) ||
             otherUser.username.toLowerCase().includes(query);
    });
  });

  constructor(public messageService: MessageService) {}

  ngOnInit(): void {
    this.loadConversations();
  }

  async loadConversations(): Promise<void> {
    this.isLoading.set(true);
    await this.messageService.getConversations(1, 20);
    this.isLoading.set(false);
  }

  async selectConversation(conversation: Conversation): Promise<void> {
    this.messageService.setActiveConversation(conversation.id);
    await this.messageService.getMessages(conversation.id, 1, 50);
    await this.messageService.markAsRead(conversation.id);
  }

  async sendMessage(): Promise<void> {
    const content = this.newMessageContent().trim();
    const activeId = this.activeConversation()?.id;

    if (!content || !activeId || this.isSending()) return;

    this.isSending.set(true);
    const sent = await this.messageService.sendMessage(activeId, content);

    if (sent) {
      this.newMessageContent.set('');
    }
    this.isSending.set(false);
  }

  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery.set(input.value);
  }

  onMessageInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.newMessageContent.set(input.value);
  }

  getOtherUser(conversation: Conversation): any {
    // In a real app, get current user ID from auth service
    // For now, return first participant (will need auth integration)
    return conversation.participants[0] || { id: '', username: '', display_name: '', avatar_url: '' };
  }

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

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  isOwnMessage(message: Message): boolean {
    // In real app, compare with current user ID from auth service
    return false; // Placeholder - needs auth integration
  }
}
