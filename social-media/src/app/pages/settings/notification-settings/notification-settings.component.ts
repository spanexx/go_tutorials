/**
 * NotificationSettingsComponent
 * 
 * Notification settings page with:
 * - Toggle switches for notification types
 * - Email notification preferences (placeholder)
 * - Push notification preferences (placeholder)
 * - Sound settings (placeholder)
 * - Save settings functionality
 * 
 * CID: Phase-3 Milestone 3.1 - Notifications System
 */
import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { LucideAngularModule, Bell, Mail, Smartphone, Volume2, Save, RotateCcw, AlertCircle } from 'lucide-angular';
import { ToastService } from '../../../shared/services/toast.service';

interface NotificationTypeSetting {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  email: boolean;
  push: boolean;
}

@Component({
  selector: 'app-notification-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, LucideAngularModule],
  template: `
    <div class="notification-settings">
      <div class="settings-header">
        <div class="header-left">
          <lucide-icon [img]="bellIcon" class="page-icon"></lucide-icon>
          <div>
            <h1>Notification Settings</h1>
            <p>Manage how and when you receive notifications</p>
          </div>
        </div>
      </div>

      <div class="settings-content">
        <!-- Notification Types -->
        <section class="settings-section">
          <h2>
            <lucide-icon [img]="bellIcon" class="section-icon"></lucide-icon>
            Notification Types
          </h2>
          <p class="section-description">
            Choose which activities you want to be notified about
          </p>

          <div class="settings-list">
            @for (setting of notificationTypes(); track setting.id) {
              <div class="setting-item">
                <div class="setting-info">
                  <div class="setting-label">{{ setting.label }}</div>
                  <div class="setting-description">{{ setting.description }}</div>
                </div>
                <div class="setting-controls">
                  <label class="toggle-switch">
                    <input
                      type="checkbox"
                      [checked]="setting.enabled"
                      (change)="toggleNotificationType(setting.id, $event)"
                    />
                    <span class="toggle-slider"></span>
                  </label>
                </div>
              </div>
            }
          </div>
        </section>

        <!-- Email Notifications (Placeholder) -->
        <section class="settings-section">
          <h2>
            <lucide-icon [img]="mailIcon" class="section-icon"></lucide-icon>
            Email Notifications
          </h2>
          <p class="section-description">
            Receive notifications via email
          </p>

          <div class="placeholder-section">
            <lucide-icon [img]="alertIcon" class="placeholder-icon"></lucide-icon>
            <div class="placeholder-content">
              <h3>Coming Soon</h3>
              <p>Email notification preferences will be available in a future update.</p>
              <ul class="placeholder-features">
                <li>Digest emails (daily/weekly)</li>
                <li>Immediate email notifications</li>
                <li>Marketing emails opt-in</li>
              </ul>
            </div>
          </div>
        </section>

        <!-- Push Notifications (Placeholder) -->
        <section class="settings-section">
          <h2>
            <lucide-icon [img]="phoneIcon" class="section-icon"></lucide-icon>
            Push Notifications
          </h2>
          <p class="section-description">
            Browser and mobile push notifications
          </p>

          <div class="placeholder-section">
            <lucide-icon [img]="alertIcon" class="placeholder-icon"></lucide-icon>
            <div class="placeholder-content">
              <h3>Coming Soon</h3>
              <p>Push notification settings will be available in a future update.</p>
              <ul class="placeholder-features">
                <li>Browser push notifications</li>
                <li>Mobile app notifications</li>
                <li>Quiet hours configuration</li>
              </ul>
            </div>
          </div>
        </section>

        <!-- Sound Settings (Placeholder) -->
        <section class="settings-section">
          <h2>
            <lucide-icon [img]="volumeIcon" class="section-icon"></lucide-icon>
            Sound Settings
          </h2>
          <p class="section-description">
            Configure notification sounds
          </p>

          <div class="placeholder-section">
            <lucide-icon [img]="alertIcon" class="placeholder-icon"></lucide-icon>
            <div class="placeholder-content">
              <h3>Coming Soon</h3>
              <p>Sound settings will be available in a future update.</p>
              <ul class="placeholder-features">
                <li>Custom notification sounds</li>
                <li>Volume control</li>
                <li>Mute all sounds option</li>
              </ul>
            </div>
          </div>
        </section>

        <!-- Save Actions -->
        <div class="settings-actions">
          <button class="btn btn-secondary" (click)="resetSettings()">
            <lucide-icon [img]="resetIcon" [size]="18"></lucide-icon>
            Reset to Defaults
          </button>
          <button class="btn btn-primary" (click)="saveSettings()">
            <lucide-icon [img]="saveIcon" [size]="18"></lucide-icon>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .notification-settings {
      max-width: 800px;
      margin: 0 auto;
      padding: 1.5rem;
    }

    .settings-header {
      margin-bottom: 2rem;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid hsl(var(--border));

      .header-left {
        display: flex;
        align-items: flex-start;
        gap: 1rem;

        .page-icon {
          width: 32px;
          height: 32px;
          color: hsl(var(--accent));
        }

        h1 {
          font-size: 1.5rem;
          font-weight: 700;
          color: hsl(var(--foreground));
          margin: 0 0 0.25rem 0;
        }

        p {
          color: hsl(var(--muted-foreground));
          font-size: 0.9rem;
          margin: 0;
        }
      }
    }

    .settings-content {
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    .settings-section {
      background: hsl(var(--card));
      border: 1px solid hsl(var(--border));
      border-radius: var(--radius);
      padding: 1.5rem;

      h2 {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 1.125rem;
        font-weight: 600;
        color: hsl(var(--foreground));
        margin: 0 0 0.5rem 0;

        .section-icon {
          width: 20px;
          height: 20px;
          color: hsl(var(--muted-foreground));
        }
      }

      .section-description {
        color: hsl(var(--muted-foreground));
        font-size: 0.875rem;
        margin: 0 0 1.25rem 0;
      }
    }

    .settings-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .setting-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem;
      background: hsl(var(--background));
      border: 1px solid hsl(var(--border));
      border-radius: calc(var(--radius) - 0.25rem);
      transition: all 0.2s;

      &:hover {
        border-color: hsl(var(--ring));
      }

      .setting-info {
        flex: 1;

        .setting-label {
          font-weight: 500;
          color: hsl(var(--foreground));
          font-size: 0.9rem;
          margin-bottom: 0.25rem;
        }

        .setting-description {
          color: hsl(var(--muted-foreground));
          font-size: 0.8rem;
          margin: 0;
        }
      }

      .setting-controls {
        margin-left: 1rem;
      }
    }

    .toggle-switch {
      position: relative;
      display: inline-block;
      width: 44px;
      height: 24px;

      input {
        opacity: 0;
        width: 0;
        height: 0;

        &:checked + .toggle-slider {
          background-color: hsl(var(--accent));
        }

        &:checked + .toggle-slider:before {
          transform: translateX(20px);
        }

        &:focus + .toggle-slider {
          box-shadow: 0 0 0 2px hsl(var(--ring));
        }

        + .toggle-slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: hsl(var(--input));
          transition: 0.2s;
          border-radius: 24px;

          &:before {
            position: absolute;
            content: "";
            height: 18px;
            width: 18px;
            left: 3px;
            bottom: 3px;
            background-color: white;
            transition: 0.2s;
            border-radius: 50%;
          }
        }
      }
    }

    .placeholder-section {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      padding: 1.5rem;
      background: hsl(var(--muted) / 0.3);
      border: 1px dashed hsl(var(--border));
      border-radius: calc(var(--radius) - 0.25rem);

      .placeholder-icon {
        width: 32px;
        height: 32px;
        color: hsl(var(--muted-foreground));
        flex-shrink: 0;
      }

      .placeholder-content {
        h3 {
          font-size: 1rem;
          font-weight: 600;
          color: hsl(var(--foreground));
          margin: 0 0 0.5rem 0;
        }

        p {
          color: hsl(var(--muted-foreground));
          font-size: 0.875rem;
          margin: 0 0 0.75rem 0;
        }

        .placeholder-features {
          margin: 0;
          padding-left: 1.25rem;
          color: hsl(var(--muted-foreground));
          font-size: 0.875rem;

          li {
            margin-bottom: 0.25rem;
          }
        }
      }
    }

    .settings-actions {
      display: flex;
      gap: 1rem;
      padding-top: 1rem;
      border-top: 1px solid hsl(var(--border));
      justify-content: flex-end;

      .btn {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.625rem 1.25rem;
        border-radius: calc(var(--radius) - 0.25rem);
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        border: 1px solid transparent;

        &.btn-primary {
          background: hsl(var(--accent));
          color: hsl(var(--accent-foreground));
          border-color: hsl(var(--accent));

          &:hover {
            opacity: 0.9;
          }
        }

        &.btn-secondary {
          background: hsl(var(--background));
          color: hsl(var(--foreground));
          border-color: hsl(var(--border));

          &:hover {
            background: hsl(var(--muted));
          }
        }

        lucide-icon {
          width: 18px;
          height: 18px;
        }
      }
    }
  `]
})
export class NotificationSettingsComponent implements OnInit {
  bellIcon = Bell;
  mailIcon = Mail;
  phoneIcon = Smartphone;
  volumeIcon = Volume2;
  saveIcon = Save;
  resetIcon = RotateCcw;
  alertIcon = AlertCircle;

  notificationTypes = signal<NotificationTypeSetting[]>([
    {
      id: 'likes',
      label: 'Likes',
      description: 'When someone likes your post or comment',
      enabled: true,
      email: false,
      push: false
    },
    {
      id: 'comments',
      label: 'Comments',
      description: 'When someone comments on your post',
      enabled: true,
      email: false,
      push: false
    },
    {
      id: 'replies',
      label: 'Replies',
      description: 'When someone replies to your comment',
      enabled: true,
      email: false,
      push: false
    },
    {
      id: 'mentions',
      label: 'Mentions',
      description: 'When someone mentions you in a post',
      enabled: true,
      email: false,
      push: false
    },
    {
      id: 'follows',
      label: 'New Followers',
      description: 'When someone starts following you',
      enabled: true,
      email: false,
      push: false
    },
    {
      id: 'shares',
      label: 'Shares',
      description: 'When someone shares your post',
      enabled: true,
      email: false,
      push: false
    }
  ]);

  private defaultSettings: NotificationTypeSetting[] = [];

  constructor(private toastService: ToastService) {
    this.defaultSettings = this.notificationTypes().map(s => ({ ...s }));
  }

  ngOnInit(): void {
    // Load saved settings from localStorage if available
    this.loadSettings();
  }

  loadSettings(): void {
    const saved = localStorage.getItem('notificationSettings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.notificationTypes.update(settings =>
          settings.map(s => {
            const savedSetting = parsed.find((p: NotificationTypeSetting) => p.id === s.id);
            return savedSetting ? { ...s, enabled: savedSetting.enabled } : s;
          })
        );
      } catch (error) {
        console.error('Failed to load notification settings:', error);
      }
    }
  }

  saveSettings(): void {
    const settings = this.notificationTypes();
    localStorage.setItem('notificationSettings', JSON.stringify(settings));
    this.toastService.success('Settings Saved', 'Your notification preferences have been updated');
  }

  resetSettings(): void {
    this.notificationTypes.set(this.defaultSettings.map(s => ({ ...s })));
    localStorage.removeItem('notificationSettings');
    this.toastService.info('Settings Reset', 'Notification preferences reset to defaults');
  }

  toggleNotificationType(id: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    this.notificationTypes.update(settings =>
      settings.map(s => s.id === id ? { ...s, enabled: input.checked } : s)
    );
  }
}
