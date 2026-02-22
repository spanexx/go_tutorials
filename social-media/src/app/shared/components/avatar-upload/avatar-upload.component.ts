/**
 * AvatarUploadComponent
 * 
 * Avatar upload functionality for profile edit:
 * - Avatar click to upload new image
 * - Crop to square/circle preview
 * - File validation (max 2MB)
 * - Progress indicator
 * - Preview before save
 * - Revert option
 * - Default avatar fallback
 * - Update in real-time across app
 * 
 * CID: Phase-3 Milestone 3.5 - Image Uploads & Media
 */
import { Component, Input, Output, EventEmitter, signal, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Camera, X, Check, AlertCircle, RotateCcw } from 'lucide-angular';
import { IMAGE_PLACEHOLDERS } from '../../constants/app.constants';

export interface AvatarUploadEvent {
  url: string;
  file: File;
}

@Component({
  selector: 'app-avatar-upload',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="avatar-upload-container">
      <!-- Avatar Display -->
      <div class="avatar-wrapper" [class.has-preview]="hasPreview()">
        <img 
          [src]="displayUrl()" 
          [alt]="altText || 'Profile avatar'"
          class="avatar-image"
          [class.loading]="isUploading()"
        />
        
        @if (isUploading()) {
          <div class="upload-overlay">
            <div class="upload-spinner"></div>
            <span class="upload-progress">{{ uploadProgress() }}%</span>
          </div>
        } @else {
          <!-- Upload Overlay (hover) -->
          <div class="upload-overlay" (click)="triggerFileInput()">
            <lucide-icon [img]="cameraIcon" [size]="24"></lucide-icon>
            <span class="upload-text">Change</span>
          </div>
        }

        <!-- Error Badge -->
        @if (error()) {
          <div class="error-badge" title="{{ error() }}">
            <lucide-icon [img]="alertIcon" [size]="14"></lucide-icon>
          </div>
        }
      </div>

      <!-- Hidden File Input -->
      <input
        #fileInput
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        hidden
        (change)="onFileSelected($event)"
      />

      <!-- Preview Actions -->
      @if (hasPreview() && !isUploading()) {
        <div class="preview-actions">
          <button class="action-btn revert" (click)="revert()" title="Revert to original">
            <lucide-icon [img]="revertIcon" [size]="16"></lucide-icon>
            <span>Revert</span>
          </button>
          <button class="action-btn save" (click)="save()" title="Save changes">
            <lucide-icon [img]="checkIcon" [size]="16"></lucide-icon>
            <span>Save</span>
          </button>
        </div>
      }

      <!-- Error Message -->
      @if (error()) {
        <div class="error-message">
          <lucide-icon [img]="alertIcon" [size]="14"></lucide-icon>
          <span>{{ error() }}</span>
          <button class="error-dismiss" (click)="clearError()">
            <lucide-icon [img]="closeIcon" [size]="12"></lucide-icon>
          </button>
        </div>
      }

      <!-- Size Hint -->
      <p class="size-hint">
        <lucide-icon [img]="cameraIcon" [size]="12"></lucide-icon>
        <span>Click to upload. Max 2MB. JPG, PNG, GIF, WebP.</span>
      </p>
    </div>
  `,
  styles: [`
    .avatar-upload-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.75rem;
      width: 100%;
    }

    .avatar-wrapper {
      position: relative;
      width: 120px;
      height: 120px;
      border-radius: 50%;
      overflow: hidden;
      cursor: pointer;
      transition: all 0.2s;
      background: hsl(var(--muted));

      &:hover .upload-overlay {
        opacity: 1;
      }

      &.has-preview {
        border: 2px solid hsl(var(--accent));
      }

      .avatar-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: opacity 0.2s;

        &.loading {
          opacity: 0.5;
        }
      }

      .upload-overlay {
        position: absolute;
        inset: 0;
        background: hsl(var(--foreground) / 0.7);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.375rem;
        opacity: 0;
        transition: opacity 0.2s;
        color: hsl(var(--foreground-foreground));

        lucide-icon {
          color: white;
        }

        .upload-text {
          color: white;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .upload-spinner {
          width: 24px;
          height: 24px;
          border: 3px solid hsl(var(--border) / 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .upload-progress {
          color: white;
          font-size: 0.75rem;
          font-weight: 700;
        }
      }

      .error-badge {
        position: absolute;
        top: 0.25rem;
        right: 0.25rem;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: hsl(var(--destructive));
        color: hsl(var(--destructive-foreground));
        border-radius: 50%;
        border: 2px solid hsl(var(--card));
      }
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    .preview-actions {
      display: flex;
      gap: 0.5rem;
    }

    .action-btn {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.5rem 1rem;
      border: 1px solid hsl(var(--border));
      border-radius: calc(var(--radius) - 0.25rem);
      font-size: 0.75rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;

      lucide-icon {
        width: 16px;
        height: 16px;
      }

      &.revert {
        background: hsl(var(--background));
        color: hsl(var(--foreground));

        &:hover {
          background: hsl(var(--muted));
          border-color: hsl(var(--ring));
        }
      }

      &.save {
        background: hsl(var(--accent));
        color: hsl(var(--accent-foreground));
        border-color: hsl(var(--accent));

        &:hover {
          opacity: 0.9;
        }
      }
    }

    .error-message {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      background: hsl(var(--destructive) / 0.1);
      border: 1px solid hsl(var(--destructive) / 0.2);
      border-radius: calc(var(--radius) - 0.25rem);
      font-size: 0.75rem;
      color: hsl(var(--destructive));
      width: 100%;

      lucide-icon {
        width: 14px;
        height: 14px;
        flex-shrink: 0;
      }

      span {
        flex: 1;
      }

      .error-dismiss {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        background: transparent;
        border: none;
        border-radius: calc(var(--radius) - 0.25rem);
        cursor: pointer;
        color: hsl(var(--destructive));
        transition: all 0.2s;

        &:hover {
          background: hsl(var(--destructive) / 0.2);
        }

        lucide-icon {
          width: 12px;
          height: 12px;
        }
      }
    }

    .size-hint {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      font-size: 0.625rem;
      color: hsl(var(--muted-foreground));
      margin: 0;

      lucide-icon {
        width: 12px;
        height: 12px;
      }
    }
  `]
})
export class AvatarUploadComponent implements OnDestroy {
  @Input() currentAvatar: string = '';
  @Input() altText: string = '';
  @Input() defaultAvatar: string = IMAGE_PLACEHOLDERS.avatar;
  
  @Output() avatarChange = new EventEmitter<AvatarUploadEvent>();
  @Output() avatarSaved = new EventEmitter<string>();
  @Output() avatarReverted = new EventEmitter<void>();

  cameraIcon = Camera;
  checkIcon = Check;
  revertIcon = RotateCcw;
  alertIcon = AlertCircle;
  closeIcon = X;

  // State signals
  previewUrlSignal = signal<string | null>(null);
  previewFileSignal = signal<File | null>(null);
  isUploadingSignal = signal(false);
  uploadProgressSignal = signal(0);
  errorSignal = signal<string | null>(null);

  // Computed signals
  displayUrl = computed(() => {
    return this.previewUrlSignal() || this.currentAvatar || this.defaultAvatar;
  });

  hasPreview = computed(() => {
    return this.previewUrlSignal() !== null;
  });

  uploadProgress = this.uploadProgressSignal.asReadonly();
  error = this.errorSignal.asReadonly();

  /**
   * Trigger file input click
   */
  triggerFileInput(): void {
    if (this.isUploadingSignal()) return;
    
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (input) {
      input.click();
    }
  }

  /**
   * Handle file selection
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) return;

    // Validate file
    const validation = this.validateFile(file);
    if (!validation.valid) {
      this.errorSignal.set(validation.error ?? null);
      input.value = '';
      return;
    }

    // Clear any previous error
    this.clearError();

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    this.previewUrlSignal.set(previewUrl);
    this.previewFileSignal.set(file);

    // Reset input value
    input.value = '';
  }

  /**
   * Validate file
   */
  private validateFile(file: File): { valid: boolean; error?: string } {
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return { valid: false, error: 'Invalid file type. Allowed: JPG, PNG, GIF, WebP' };
    }

    // Check file size (max 2MB)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      return { valid: false, error: 'File too large. Maximum size: 2MB' };
    }

    return { valid: true };
  }

  /**
   * Save the uploaded avatar
   */
  async save(): Promise<void> {
    const file = this.previewFileSignal();
    const url = this.previewUrlSignal();

    if (!file || !url) return;

    this.isUploadingSignal.set(true);
    this.uploadProgressSignal.set(0);

    try {
      // Simulate upload progress
      await this.simulateUpload();

      // Emit the upload event
      this.avatarChange.emit({ url, file });
      this.avatarSaved.emit(url);

      // Clear preview state
      this.previewUrlSignal.set(null);
      this.previewFileSignal.set(null);
    } catch (error) {
      this.errorSignal.set('Failed to upload avatar. Please try again.');
    } finally {
      this.isUploadingSignal.set(false);
      this.uploadProgressSignal.set(0);
    }
  }

  /**
   * Revert to original avatar
   */
  revert(): void {
    // Revoke preview URL to free memory
    if (this.previewUrlSignal()) {
      URL.revokeObjectURL(this.previewUrlSignal()!);
    }

    this.previewUrlSignal.set(null);
    this.previewFileSignal.set(null);
    this.clearError();
    this.avatarReverted.emit();
  }

  /**
   * Clear error message
   */
  clearError(): void {
    this.errorSignal.set(null);
  }

  /**
   * Simulate upload progress
   */
  private async simulateUpload(): Promise<void> {
    const steps = [20, 40, 60, 80, 100];
    
    for (const progress of steps) {
      await new Promise(resolve => setTimeout(resolve, 150 + Math.random() * 150));
      this.uploadProgressSignal.set(progress);
    }
  }

  /**
   * Cleanup on destroy
   */
  ngOnDestroy(): void {
    // Revoke preview URL to free memory
    if (this.previewUrlSignal()) {
      URL.revokeObjectURL(this.previewUrlSignal()!);
    }
  }
}
