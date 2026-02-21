// Code Map: share-modal.component.ts
// - ShareModalComponent: Modal with share options grid
// - Copy link button with feedback
// - Social platform buttons (Twitter, Facebook, LinkedIn, WhatsApp)
// - Email share option
// - Close button and click-outside-to-close
// CID: Phase-2 Milestone 2.4 - Sharing & Activity Feed
import { Component, EventEmitter, Input, Output, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, X, Copy, Link, Twitter, Facebook, Linkedin, MessageCircle, Mail, Qrcode, Code2, Check } from 'lucide-angular';
import { ShareService, SharePlatform } from '../../services/share.service';

@Component({
  selector: 'app-share-modal',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    @if (isOpen) {
      <div class="modal-backdrop" (click)="close()"></div>
      
      <div class="share-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div class="modal-header">
          <h2 id="modal-title">Share this post</h2>
          <button class="close-btn" (click)="close()" aria-label="Close modal">
            <lucide-icon [img]="closeIcon" [size]="20"></lucide-icon>
          </button>
        </div>

        <div class="modal-content">
          <!-- Copy Link Section -->
          <div class="copy-link-section">
            <label>Share link</label>
            <div class="copy-link-input">
              <input 
                type="text" 
                [value]="postUrl" 
                readonly 
                class="link-input"
                aria-label="Post URL"
              />
              <button 
                class="copy-btn" 
                (click)="copyLink()"
                [disabled]="isCopying"
                aria-label="Copy link to clipboard"
              >
                @if (isCopying) {
                  <lucide-icon [img]="checkIcon" [size]="18" class="success-icon"></lucide-icon>
                  <span>Copied!</span>
                } @else {
                  <lucide-icon [img]="copyIcon" [size]="18"></lucide-icon>
                  <span>Copy</span>
                }
              </button>
            </div>
          </div>

          <!-- Social Platforms Grid -->
          <div class="platforms-section">
            <h3>Share to</h3>
            <div class="platforms-grid">
              @for (platform of platforms; track platform.id) {
                <button 
                  class="platform-btn"
                  [style.--platform-color]="platform.color"
                  (click)="shareToPlatform(platform.id)"
                  [disabled]="isSharing"
                  [attr.aria-label]="'Share to ' + platform.name"
                >
                  <div class="platform-icon" [style.background]="platform.color">
                    @switch (platform.id) {
                      @case ('twitter') {
                        <lucide-icon [img]="twitterIcon" [size]="20" color="white"></lucide-icon>
                      }
                      @case ('facebook') {
                        <lucide-icon [img]="facebookIcon" [size]="20" color="white"></lucide-icon>
                      }
                      @case ('linkedin') {
                        <lucide-icon [img]="linkedinIcon" [size]="20" color="white"></lucide-icon>
                      }
                      @case ('whatsapp') {
                        <lucide-icon [img]="messageCircleIcon" [size]="20" color="white"></lucide-icon>
                      }
                      @case ('email') {
                        <lucide-icon [img]="mailIcon" [size]="20" color="white"></lucide-icon>
                      }
                    }
                  </div>
                  <span class="platform-name">{{ platform.name }}</span>
                </button>
              }
            </div>
          </div>

          <!-- Additional Options -->
          <div class="additional-options">
            <h3>More options</h3>
            <div class="options-grid">
              <button class="option-btn" (click)="showQRCode()" [disabled]="true">
                <div class="option-icon">
                  <lucide-icon [img]="qrIcon" [size]="20"></lucide-icon>
                </div>
                <span>QR Code</span>
                <span class="option-badge">Soon</span>
              </button>
              
              <button class="option-btn" (click)="showEmbedCode()" [disabled]="true">
                <div class="option-icon">
                  <lucide-icon [img]="codeIcon" [size]="20"></lucide-icon>
                </div>
                <span>Embed</span>
                <span class="option-badge">Soon</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 1000;
      animation: fadeIn 0.2s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .share-modal {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 90%;
      max-width: 480px;
      max-height: 90vh;
      background: hsl(var(--card));
      border-radius: var(--radius);
      box-shadow: var(--shadow-lg);
      z-index: 1001;
      overflow: hidden;
      animation: slideUp 0.3s ease-out;
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translate(-50%, -45%);
      }
      to {
        opacity: 1;
        transform: translate(-50%, -50%);
      }
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid hsl(var(--border));

      h2 {
        font-size: 1.25rem;
        font-weight: 600;
        color: hsl(var(--foreground));
        margin: 0;
      }

      .close-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 36px;
        height: 36px;
        border: none;
        background: transparent;
        border-radius: calc(var(--radius) - 0.25rem);
        cursor: pointer;
        color: hsl(var(--muted-foreground));
        transition: all 0.2s;

        &:hover {
          background: hsl(var(--muted));
          color: hsl(var(--foreground));
        }
      }
    }

    .modal-content {
      padding: 1.5rem;
      overflow-y: auto;
      max-height: calc(90vh - 80px);
    }

    .copy-link-section {
      margin-bottom: 1.5rem;

      label {
        display: block;
        font-size: 0.875rem;
        font-weight: 500;
        color: hsl(var(--foreground));
        margin-bottom: 0.5rem;
      }

      .copy-link-input {
        display: flex;
        gap: 0.5rem;

        .link-input {
          flex: 1;
          padding: 0.625rem 0.875rem;
          border: 1px solid hsl(var(--border));
          border-radius: calc(var(--radius) - 0.25rem);
          font-size: 0.875rem;
          color: hsl(var(--muted-foreground));
          background: hsl(var(--muted) / 0.3);
          cursor: default;

          &:focus {
            outline: none;
          }
        }

        .copy-btn {
          display: flex;
          align-items: center;
          gap: 0.375rem;
          padding: 0.625rem 1rem;
          border: 1px solid hsl(var(--border));
          background: hsl(var(--background));
          border-radius: calc(var(--radius) - 0.25rem);
          font-size: 0.875rem;
          font-weight: 500;
          color: hsl(var(--foreground));
          cursor: pointer;
          transition: all 0.2s;

          &:hover:not(:disabled) {
            background: hsl(var(--accent));
            color: hsl(var(--accent-foreground));
            border-color: hsl(var(--accent));
          }

          &:disabled {
            opacity: 0.7;
            cursor: not-allowed;
          }

          .success-icon {
            color: hsl(var(--success));
          }
        }
      }
    }

    .platforms-section {
      margin-bottom: 1.5rem;

      h3 {
        font-size: 0.875rem;
        font-weight: 500;
        color: hsl(var(--muted-foreground));
        margin-bottom: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .platforms-grid {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 0.75rem;

        @media (max-width: 480px) {
          grid-template-columns: repeat(3, 1fr);
        }

        .platform-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 0.5rem;
          border: 1px solid hsl(var(--border));
          background: hsl(var(--background));
          border-radius: calc(var(--radius) - 0.25rem);
          cursor: pointer;
          transition: all 0.2s;

          &:hover:not(:disabled) {
            border-color: var(--platform-color);
            background: hsl(var(--muted) / 0.5);
          }

          &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .platform-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 40px;
            height: 40px;
            border-radius: 50%;
          }

          .platform-name {
            font-size: 0.75rem;
            font-weight: 500;
            color: hsl(var(--foreground));
            text-align: center;
          }
        }
      }
    }

    .additional-options {
      h3 {
        font-size: 0.875rem;
        font-weight: 500;
        color: hsl(var(--muted-foreground));
        margin-bottom: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .options-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 0.75rem;

        .option-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          padding: 1rem;
          border: 1px dashed hsl(var(--border));
          background: hsl(var(--muted) / 0.3);
          border-radius: calc(var(--radius) - 0.25rem);
          cursor: pointer;
          transition: all 0.2s;
          position: relative;

          &:hover:not(:disabled) {
            border-color: hsl(var(--accent));
            background: hsl(var(--accent) / 0.1);
          }

          &:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .option-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 40px;
            height: 40px;
            color: hsl(var(--muted-foreground));
          }

          span {
            font-size: 0.875rem;
            font-weight: 500;
            color: hsl(var(--foreground));
          }

          .option-badge {
            position: absolute;
            top: 0.5rem;
            right: 0.5rem;
            font-size: 0.65rem;
            font-weight: 600;
            color: hsl(var(--accent));
            background: hsl(var(--accent) / 0.1);
            padding: 0.125rem 0.375rem;
            border-radius: calc(var(--radius) - 0.5rem);
            text-transform: uppercase;
          }
        }
      }
    }
  `]
})
export class ShareModalComponent {
  closeIcon = X;
  copyIcon = Copy;
  checkIcon = Check;
  twitterIcon = Twitter;
  facebookIcon = Facebook;
  linkedinIcon = Linkedin;
  messageCircleIcon = MessageCircle;
  mailIcon = Mail;
  qrIcon = Qrcode;
  codeIcon = Code2;

  @Input() isOpen = false;
  @Input() postId = '';
  @Input() postUrl = '';
  @Input() postText = '';
  @Output() closed = new EventEmitter<void>();

  platforms: SharePlatform[] = [];
  isCopying = false;
  isSharing = false;

  constructor(private shareService: ShareService) {
    this.platforms = this.shareService.getPlatforms();
  }

  @HostListener('document:keydown.escape')
  handleEscape(): void {
    if (this.isOpen) {
      this.close();
    }
  }

  close(): void {
    this.closed.emit();
  }

  async copyLink(): Promise<void> {
    if (this.isCopying) return;

    this.isCopying = true;
    
    const success = await this.shareService.copyLink(this.postId, this.postUrl);
    
    if (success) {
      setTimeout(() => {
        this.isCopying = false;
      }, 2000);
    } else {
      this.isCopying = false;
    }
  }

  async shareToPlatform(platformId: string): Promise<void> {
    if (this.isSharing) return;

    this.isSharing = true;

    try {
      await this.shareService.sharePost(
        this.postId,
        platformId,
        this.postUrl,
        this.postText
      );
    } catch (error) {
      console.error('Share failed:', error);
    } finally {
      this.isSharing = false;
    }
  }

  showQRCode(): void {
    // Placeholder for Phase 3
    console.log('QR Code feature coming soon');
  }

  showEmbedCode(): void {
    // Placeholder for Phase 3
    console.log('Embed code feature coming soon');
  }
}
