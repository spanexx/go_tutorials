/**
 * ImageUploadComponent
 * 
 * Image upload UI for post creation with:
 * - Drag and drop zone
 * - Click to browse files
 * - Image preview before upload
 * - Remove image option
 * - Multiple image support
 * - Upload progress indicator
 * - Error messages for invalid files
 * - Maximum file size warning
 * 
 * CID: Phase-3 Milestone 3.5 - Image Uploads & Media
 */
import { Component, EventEmitter, Output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Upload, Image, X, AlertCircle, FileWarning } from 'lucide-angular';
import { ImageUploadService, UploadedImage, UploadProgress } from '../../services/image-upload.service';

@Component({
  selector: 'app-image-upload',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    <div class="image-upload-container">
      <!-- Drop Zone -->
      @if (canUploadMore()) {
        <div
          class="drop-zone"
          [class.drag-over]="isDragOver()"
          [class.has-images]="uploadedImages().length > 0"
          (dragover)="onDragOver($event)"
          (dragleave)="onDragLeave($event)"
          (drop)="onDrop($event)"
          (click)="triggerFileInput()"
        >
          <div class="drop-zone-content">
            <lucide-icon [img]="uploadIcon" [size]="48" class="drop-zone-icon"></lucide-icon>
            <p class="drop-zone-text">Drag and drop images here</p>
            <p class="drop-zone-subtext">or click to browse</p>
            <p class="drop-zone-hint">Supports: JPG, PNG, GIF, WebP (Max 5MB each)</p>
          </div>
          <input
            #fileInput
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            multiple
            hidden
            (change)="onFileSelected($event)"
          />
        </div>
      }

      <!-- Remaining Slots Indicator -->
      @if (canUploadMore() && uploadedImages().length > 0) {
        <div class="remaining-slots">
          <lucide-icon [img]="imageIcon" [size]="14"></lucide-icon>
          <span>{{ getRemainingSlots() }} image{{ getRemainingSlots() !== 1 ? 's' : '' }} remaining</span>
        </div>
      }

      <!-- Upload Progress -->
      @if (isUploading()) {
        <div class="upload-progress">
          @for (upload of uploads(); track upload.fileId) {
            @if (upload.status === 'uploading') {
              <div class="progress-item">
                <span class="progress-filename">{{ upload.fileName }}</span>
                <div class="progress-bar">
                  <div class="progress-fill" [style.width.%]="upload.progress"></div>
                </div>
                <span class="progress-percent">{{ upload.progress }}%</span>
              </div>
            }
          }
        </div>
      }

      <!-- Error Messages -->
      @if (hasErrors()) {
        <div class="error-messages">
          @for (upload of uploads(); track upload.fileId) {
            @if (upload.status === 'error') {
              <div class="error-item">
                <lucide-icon [img]="alertIcon" [size]="16"></lucide-icon>
                <span>{{ upload.fileName }}: {{ upload.error }}</span>
                <button class="error-dismiss" (click)="removeUpload(upload.fileId)">
                  <lucide-icon [img]="xIcon" [size]="14"></lucide-icon>
                </button>
              </div>
            }
          }
        </div>
      }

      <!-- Image Previews -->
      @if (uploadedImages().length > 0) {
        <div class="image-previews" [class.grid]="uploadedImages().length > 1">
          @for (image of uploadedImages(); track image.id) {
            <div class="preview-item">
              <div class="preview-image-wrapper">
                <img [src]="image.url" [alt]="image.fileName" class="preview-image" />
                @if (uploadedImages().length > 1) {
                  <span class="image-index">{{ $index + 1 }}</span>
                }
              </div>
              <div class="preview-info">
                <span class="preview-filename">{{ image.fileName }}</span>
                <span class="preview-size">{{ formatFileSize(image.size) }}</span>
              </div>
              <button class="remove-btn" (click)="removeImage(image.id)" title="Remove image">
                <lucide-icon [img]="xIcon" [size]="16"></lucide-icon>
              </button>
            </div>
          }
        </div>
      }

      <!-- Max File Size Warning -->
      @if (showMaxSizeWarning()) {
        <div class="warning-message">
          <lucide-icon [img]="warningIcon" [size]="16"></lucide-icon>
          <span>Some files may be close to the 5MB size limit. Consider compressing large images.</span>
        </div>
      }
    </div>
  `,
  styles: [`
    .image-upload-container {
      width: 100%;
    }

    .drop-zone {
      border: 2px dashed hsl(var(--border));
      border-radius: var(--radius);
      padding: 2rem;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;
      background: hsl(var(--card));

      &:hover {
        border-color: hsl(var(--accent));
        background: hsl(var(--accent) / 0.05);
      }

      &.drag-over {
        border-color: hsl(var(--accent));
        background: hsl(var(--accent) / 0.1);
        transform: scale(1.01);
      }

      &.has-images {
        margin-top: 1rem;
      }

      .drop-zone-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;

        .drop-zone-icon {
          color: hsl(var(--muted-foreground));
          margin-bottom: 0.5rem;
        }

        .drop-zone-text {
          font-size: 1rem;
          font-weight: 600;
          color: hsl(var(--foreground));
          margin: 0;
        }

        .drop-zone-subtext {
          font-size: 0.875rem;
          color: hsl(var(--muted-foreground));
          margin: 0;
        }

        .drop-zone-hint {
          font-size: 0.75rem;
          color: hsl(var(--muted-foreground));
          margin: 0.5rem 0 0 0;
        }
      }
    }

    .remaining-slots {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      margin-top: 0.75rem;
      padding: 0.5rem 0.75rem;
      background: hsl(var(--muted) / 0.3);
      border-radius: calc(var(--radius) - 0.25rem);
      font-size: 0.75rem;
      font-weight: 500;
      color: hsl(var(--muted-foreground));

      lucide-icon {
        width: 14px;
        height: 14px;
      }
    }

    .upload-progress {
      margin-top: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;

      .progress-item {
        display: flex;
        align-items: center;
        gap: 0.75rem;

        .progress-filename {
          font-size: 0.75rem;
          font-weight: 500;
          color: hsl(var(--foreground));
          min-width: 100px;
        }

        .progress-bar {
          flex: 1;
          height: 6px;
          background: hsl(var(--muted));
          border-radius: 9999px;
          overflow: hidden;

          .progress-fill {
            height: 100%;
            background: hsl(var(--accent));
            border-radius: 9999px;
            transition: width 0.3s ease;
          }
        }

        .progress-percent {
          font-size: 0.75rem;
          font-weight: 600;
          color: hsl(var(--accent));
          min-width: 35px;
          text-align: right;
        }
      }
    }

    .error-messages {
      margin-top: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;

      .error-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.625rem 0.75rem;
        background: hsl(var(--destructive) / 0.1);
        border: 1px solid hsl(var(--destructive) / 0.2);
        border-radius: calc(var(--radius) - 0.25rem);
        font-size: 0.75rem;
        color: hsl(var(--destructive));

        lucide-icon {
          width: 16px;
          height: 16px;
          flex-shrink: 0;
        }

        span {
          flex: 1;
        }

        .error-dismiss {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
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
            width: 14px;
            height: 14px;
          }
        }
      }
    }

    .image-previews {
      margin-top: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;

      &.grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 0.75rem;
      }

      .preview-item {
        position: relative;
        background: hsl(var(--card));
        border: 1px solid hsl(var(--border));
        border-radius: calc(var(--radius) - 0.25rem);
        overflow: hidden;
        transition: all 0.2s;

        &:hover {
          border-color: hsl(var(--ring));
        }

        .preview-image-wrapper {
          position: relative;
          width: 100%;
          padding-top: 75%; /* 4:3 aspect ratio */
          background: hsl(var(--muted));

          .preview-image {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: cover;
          }

          .image-index {
            position: absolute;
            top: 0.5rem;
            left: 0.5rem;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: hsl(var(--background) / 0.9);
            color: hsl(var(--foreground));
            border-radius: 50%;
            font-size: 0.75rem;
            font-weight: 700;
          }
        }

        .preview-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          padding: 0.75rem;

          .preview-filename {
            font-size: 0.75rem;
            font-weight: 500;
            color: hsl(var(--foreground));
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .preview-size {
            font-size: 0.625rem;
            color: hsl(var(--muted-foreground));
          }
        }

        .remove-btn {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: hsl(var(--background) / 0.9);
          border: 1px solid hsl(var(--border));
          border-radius: 50%;
          cursor: pointer;
          color: hsl(var(--foreground));
          opacity: 0;
          transition: all 0.2s;

          &:hover {
            background: hsl(var(--destructive));
            color: hsl(var(--destructive-foreground));
            border-color: hsl(var(--destructive));
          }

          .preview-item:hover & {
            opacity: 1;
          }

          lucide-icon {
            width: 16px;
            height: 16px;
          }
        }
      }
    }

    .warning-message {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 0.75rem;
      padding: 0.625rem 0.75rem;
      background: hsl(var(--warning) / 0.1);
      border: 1px solid hsl(var(--warning) / 0.2);
      border-radius: calc(var(--radius) - 0.25rem);
      font-size: 0.75rem;
      color: hsl(var(--warning));

      lucide-icon {
        width: 16px;
        height: 16px;
        flex-shrink: 0;
      }
    }
  `]
})
export class ImageUploadComponent {
  uploadIcon = Upload;
  imageIcon = Image;
  xIcon = X;
  alertIcon = AlertCircle;
  warningIcon = FileWarning;

  @Output() imagesUploaded = new EventEmitter<UploadedImage[]>();
  @Output() imagesRemoved = new EventEmitter<void>();

  isDragOver = signal(false);
  showMaxSizeWarning = signal(false);

  constructor(private uploadService: ImageUploadService) {}

  uploads = computed(() => this.uploadService.uploads());
  uploadedImages = computed(() => this.uploadService.uploadedImages());
  isUploading = computed(() => this.uploadService.isUploading());
  hasErrors = computed(() => this.uploadService.hasErrors());
  canUploadMore = computed(() => this.uploadService.canUploadMore());
  getRemainingSlots = computed(() => this.uploadService.getRemainingSlots());

  /**
   * Handle drag over event
   */
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(true);
  }

  /**
   * Handle drag leave event
   */
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
  }

  /**
   * Handle drop event
   */
  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFiles(files);
    }
  }

  /**
   * Trigger file input click
   */
  triggerFileInput(): void {
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (input) {
      input.click();
    }
  }

  /**
   * Handle file selection from input
   */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (files && files.length > 0) {
      this.handleFiles(files);
    }
    // Reset input value to allow selecting same file again
    input.value = '';
  }

  /**
   * Handle files (from drop or input)
   */
  async handleFiles(files: FileList): Promise<void> {
    if (!this.canUploadMore()) {
      return;
    }

    const fileArray = Array.from(files).slice(0, this.getRemainingSlots());
    const uploadedImages = await this.uploadService.uploadImages(fileArray);

    if (uploadedImages.length > 0) {
      this.imagesUploaded.emit(uploadedImages);
    }

    // Check for size warnings
    const hasLargeFiles = fileArray.some(f => f.size > 4 * 1024 * 1024);
    this.showMaxSizeWarning.set(hasLargeFiles);
  }

  /**
   * Remove upload from tracking
   */
  removeUpload(fileId: string): void {
    this.uploadService.removeUpload(fileId);
  }

  /**
   * Remove uploaded image
   */
  removeImage(imageId: string): void {
    this.uploadService.removeImage(imageId);
    this.imagesRemoved.emit();
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    if (bytes >= 1024) {
      return `${(bytes / 1024).toFixed(0)} KB`;
    }
    return `${bytes} B`;
  }
}
