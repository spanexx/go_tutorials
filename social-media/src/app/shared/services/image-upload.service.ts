/**
 * ImageUploadService
 * 
 * Service for handling image uploads with validation and processing:
 * - File validation (type: jpg, png, gif, webp; size: max 5MB)
 * - Image dimensions validation
 * - Multiple image support (up to 4 per post)
 * - Progress tracking
 * - Error handling for failed uploads
 * - Mock upload for development (base64 or blob URL)
 * 
 * CID: Phase-3 Milestone 3.5 - Image Uploads & Media
 */
import { Injectable, signal, computed } from '@angular/core';

export interface UploadProgress {
  fileId: string;
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
  url?: string;
}

export interface ImageValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface UploadedImage {
  id: string;
  url: string;
  fileName: string;
  size: number;
  type: string;
  width?: number;
  height?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ImageUploadService {
  private readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private readonly MAX_IMAGES = 4;
  private readonly ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  private readonly MIN_WIDTH = 100;
  private readonly MIN_HEIGHT = 100;
  private readonly MAX_WIDTH = 4096;
  private readonly MAX_HEIGHT = 4096;

  private uploadsSignal = signal<UploadProgress[]>([]);
  private uploadedImagesSignal = signal<UploadedImage[]>([]);

  readonly uploads = computed(() => this.uploadsSignal());
  readonly uploadedImages = computed(() => this.uploadedImagesSignal());
  readonly hasUploads = computed(() => this.uploadsSignal().length > 0);
  readonly isUploading = computed(() => 
    this.uploadsSignal().some(u => u.status === 'uploading')
  );
  readonly hasErrors = computed(() => 
    this.uploadsSignal().some(u => u.status === 'error')
  );

  /**
   * Upload one or multiple images
   */
  async uploadImages(files: File[]): Promise<UploadedImage[]> {
    const validFiles = files.slice(0, this.MAX_IMAGES);
    const results: UploadedImage[] = [];

    for (const file of validFiles) {
      const fileId = this.generateFileId();
      
      // Add to uploads tracking
      this.uploadsSignal.update(uploads => [
        ...uploads,
        {
          fileId,
          fileName: file.name,
          progress: 0,
          status: 'pending'
        }
      ]);

      // Validate file
      const validation = this.validateImage(file);
      if (!validation.valid) {
        this.updateUploadStatus(fileId, 'error', 0, validation.errors.join(', '));
        continue;
      }

      // Add warnings to console
      validation.warnings.forEach(warning => console.warn('Image upload warning:', warning));

      // Upload the image
      try {
        const uploadedImage = await this.processUpload(fileId, file);
        results.push(uploadedImage);
        this.uploadedImagesSignal.update(images => [...images, uploadedImage]);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Upload failed';
        this.updateUploadStatus(fileId, 'error', 0, errorMessage);
      }
    }

    return results;
  }

  /**
   * Validate an image file
   */
  validateImage(file: File): ImageValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check file type
    if (!this.ALLOWED_TYPES.includes(file.type)) {
      errors.push(`Invalid file type. Allowed: JPG, PNG, GIF, WebP`);
    }

    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      errors.push(`File too large. Maximum size: 5MB`);
    } else if (file.size > this.MAX_FILE_SIZE * 0.8) {
      warnings.push(`File size is close to the 5MB limit`);
    }

    // Check image dimensions (requires reading the file)
    // This is done asynchronously in processUpload

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Get image URL from uploaded image
   */
  getImageUrl(image: UploadedImage): string {
    return image.url;
  }

  /**
   * Remove an upload from tracking
   */
  removeUpload(fileId: string): void {
    this.uploadsSignal.update(uploads => uploads.filter(u => u.fileId !== fileId));
  }

  /**
   * Remove an uploaded image
   */
  removeImage(imageId: string): void {
    this.uploadedImagesSignal.update(images => images.filter(i => i.id !== imageId));
    
    // Also revoke the blob URL to free memory
    const image = this.uploadedImagesSignal().find(i => i.id === imageId);
    if (image?.url.startsWith('blob:')) {
      URL.revokeObjectURL(image.url);
    }
  }

  /**
   * Clear all uploads
   */
  clearAll(): void {
    // Revoke all blob URLs
    this.uploadedImagesSignal().forEach(image => {
      if (image.url.startsWith('blob:')) {
        URL.revokeObjectURL(image.url);
      }
    });

    this.uploadsSignal.set([]);
    this.uploadedImagesSignal.set([]);
  }

  /**
   * Get upload progress for a specific file
   */
  getUploadProgress(fileId: string): UploadProgress | undefined {
    return this.uploadsSignal().find(u => u.fileId === fileId);
  }

  /**
   * Check if can upload more images
   */
  canUploadMore(): boolean {
    return this.uploadedImagesSignal().length < this.MAX_IMAGES;
  }

  /**
   * Get remaining upload slots
   */
  getRemainingSlots(): number {
    return this.MAX_IMAGES - this.uploadedImagesSignal().length;
  }

  /**
   * Process a single upload (mock implementation)
   */
  private async processUpload(fileId: string, file: File): Promise<UploadedImage> {
    // Update status to uploading
    this.updateUploadStatus(fileId, 'uploading', 10);

    // Get image dimensions
    const dimensions = await this.getImageDimensions(file);

    // Validate dimensions
    if (dimensions.width < this.MIN_WIDTH || dimensions.height < this.MIN_HEIGHT) {
      throw new Error(`Image too small. Minimum: ${this.MIN_WIDTH}x${this.MIN_HEIGHT}px`);
    }

    if (dimensions.width > this.MAX_WIDTH || dimensions.height > this.MAX_HEIGHT) {
      throw new Error(`Image too large. Maximum: ${this.MAX_WIDTH}x${this.MAX_HEIGHT}px`);
    }

    // Simulate upload progress
    await this.simulateProgress(fileId);

    // Create blob URL (mock upload - in production this would be a real API call)
    const url = URL.createObjectURL(file);

    // Mark as completed
    this.updateUploadStatus(fileId, 'completed', 100, undefined, url);

    return {
      id: fileId,
      url,
      fileName: file.name,
      size: file.size,
      type: file.type,
      width: dimensions.width,
      height: dimensions.height
    };
  }

  /**
   * Get image dimensions from file
   */
  private getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Simulate upload progress
   */
  private async simulateProgress(fileId: string): Promise<void> {
    const steps = [30, 50, 70, 90];
    
    for (const progress of steps) {
      await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
      this.updateUploadProgress(fileId, progress);
    }
  }

  /**
   * Update upload status
   */
  private updateUploadStatus(
    fileId: string,
    status: UploadProgress['status'],
    progress: number,
    error?: string,
    url?: string
  ): void {
    this.uploadsSignal.update(uploads =>
      uploads.map(u =>
        u.fileId === fileId
          ? { ...u, status, progress, error, url }
          : u
      )
    );
  }

  /**
   * Update upload progress
   */
  private updateUploadProgress(fileId: string, progress: number): void {
    this.uploadsSignal.update(uploads =>
      uploads.map(u =>
        u.fileId === fileId ? { ...u, progress } : u
      )
    );
  }

  /**
   * Generate unique file ID
   */
  private generateFileId(): string {
    return `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
