import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-messages',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="messages-container">
      <div class="messages-header">
        <h1>Messages</h1>
        <button class="compose-btn">✉️</button>
      </div>

      <div class="messages-layout">
        <aside class="conversations-list">
          <div class="search-box">
            <input type="text" placeholder="Search conversations..." />
          </div>
          <div class="conversation-item active">
            <img src="https://i.pravatar.cc/150?img=10" alt="User" />
            <div class="conversation-info">
              <p class="conversation-name">Sarah Johnson</p>
              <p class="conversation-preview">That sounds great! Let's meet...</p>
            </div>
          </div>
          <div class="conversation-item">
            <img src="https://i.pravatar.cc/150?img=11" alt="User" />
            <div class="conversation-info">
              <p class="conversation-name">Alex Chen</p>
              <p class="conversation-preview">Thanks for your help with the project</p>
            </div>
          </div>
          <div class="conversation-item">
            <img src="https://i.pravatar.cc/150?img=12" alt="User" />
            <div class="conversation-info">
              <p class="conversation-name">Emma Davis</p>
              <p class="conversation-preview">See you at the conference!</p>
            </div>
          </div>
        </aside>

        <main class="messages-main">
          <div class="chat-header">
            <div class="chat-user">
              <img src="https://i.pravatar.cc/150?img=10" alt="User" />
              <div>
                <p class="chat-name">Sarah Johnson</p>
                <p class="chat-status">Active now</p>
              </div>
            </div>
          </div>

          <div class="messages-list">
            <div class="message other">
              <p>Hey! How are you doing?</p>
            </div>
            <div class="message own">
              <p>Hi Sarah! Doing great, thanks for asking</p>
            </div>
            <div class="message other">
              <p>That sounds great! Let's meet up soon</p>
            </div>
          </div>

          <div class="message-input">
            <input type="text" placeholder="Type a message..." />
            <button>Send</button>
          </div>
        </main>
      </div>
    </div>
  `,
  styleUrls: ['./messages.component.scss']
})
export class MessagesComponent {}
