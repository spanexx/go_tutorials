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
 * - Image optimization (resize, compress, WebP conversion)
 * - Responsive images (srcset generation)
 * - Blur placeholder generation
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
  optimizedUrl?: string;
  optimizedSize?: number;
  srcset?: string;
  blurPlaceholder?: string;
  thumbnailUrl?: string;
}

export interface ImageSize {
  label: string;
  width: number;
  quality: number;
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

  // Optimization settings
  private readonly OPTIMIZE_WIDTH = 1920; // Max width for optimized image
  private readonly OPTIMIZE_HEIGHT = 1080; // Max height for optimized image
  private readonly OPTIMIZE_QUALITY = 0.8; // WebP quality (0.7-0.85 recommended)
  private readonly THUMBNAIL_WIDTH = 400; // Thumbnail width
  private readonly THUMBNAIL_QUALITY = 0.7; // Thumbnail quality
  private readonly BLUR_SIZE = 10; // Blur placeholder size (small for performance)

  // Responsive image sizes for srcset
  private readonly RESPONSIVE_SIZES: ImageSize[] = [
    { label: 'small', width: 640, quality: 0.75 },
    { label: 'medium', width: 1024, quality: 0.8 },
    { label: 'large', width: 1920, quality: 0.85 }
  ];

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
    const image = this.uploadedImagesSignal().find(i => i.id === imageId);
    
    this.uploadedImagesSignal.update(images => images.filter(i => i.id !== imageId));

    // Revoke all blob URLs to free memory
    if (image) {
      this.revokeImageUrl(image.url);
      if (image.optimizedUrl) this.revokeImageUrl(image.optimizedUrl);
      if (image.thumbnailUrl) this.revokeImageUrl(image.thumbnailUrl);
      if (image.srcset) {
        // Extract URLs from srcset string
        const urls = image.srcset.split(',').map(part => part.trim().split(' ')[0]);
        urls.forEach(url => this.revokeImageUrl(url));
      }
    }
  }

  /**
   * Revoke a blob URL to free memory
   */
  private revokeImageUrl(url: string | undefined): void {
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  }

  /**
   * Clear all uploads
   */
  clearAll(): void {
    // Revoke all blob URLs
    this.uploadedImagesSignal().forEach(image => {
      this.revokeImageUrl(image.url);
      if (image.optimizedUrl) this.revokeImageUrl(image.optimizedUrl);
      if (image.thumbnailUrl) this.revokeImageUrl(image.thumbnailUrl);
      if (image.srcset) {
        const urls = image.srcset.split(',').map(part => part.trim().split(' ')[0]);
        urls.forEach(url => this.revokeImageUrl(url));
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

    // Optimize image (resize, compress, convert to WebP)
    const optimizedUrl = await this.optimizeImage(file);
    const optimizedSize = await this.getFileSizeFromUrl(optimizedUrl);

    // Generate thumbnail
    const thumbnailUrl = await this.resizeImage(file, this.THUMBNAIL_WIDTH, this.THUMBNAIL_QUALITY);

    // Generate blur placeholder
    const blurPlaceholder = await this.generateBlurPlaceholder(file);

    // Generate srcset for responsive images
    const srcset = await this.generateSrcset(file);

    // Mark as completed
    this.updateUploadStatus(fileId, 'completed', 100, undefined, url);

    return {
      id: fileId,
      url,
      fileName: file.name,
      size: file.size,
      type: file.type,
      width: dimensions.width,
      height: dimensions.height,
      optimizedUrl,
      optimizedSize,
      srcset,
      blurPlaceholder,
      thumbnailUrl
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
   * Optimize image: resize, compress, and convert to WebP
   */
  async optimizeImage(file: File): Promise<string> {
    return this.resizeImage(file, this.OPTIMIZE_WIDTH, this.OPTIMIZE_QUALITY, true);
  }

  /**
   * Resize image to specified max width with quality compression
   * Converts to WebP format for better compression
   */
  async resizeImage(
    file: File,
    maxWidth: number,
    quality: number,
    convertToWebP: boolean = false
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        // Calculate new dimensions maintaining aspect ratio
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        // Create canvas for resizing
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // High-quality image scaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw resized image
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob URL
        const mimeType = convertToWebP ? 'image/webp' : file.type;
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to create resized image blob'));
              return;
            }
            const url = URL.createObjectURL(blob);
            resolve(url);
          },
          mimeType,
          quality
        );
      };
      img.onerror = () => {
        reject(new Error('Failed to load image for resizing'));
      };
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Generate blur placeholder (tiny image scaled up with CSS blur)
   */
  async generateBlurPlaceholder(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = this.BLUR_SIZE;
        canvas.height = Math.round((img.height * this.BLUR_SIZE) / img.width);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Draw tiny image
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Convert to base64 data URL for inline use
        const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
        resolve(dataUrl);
      };
      img.onerror = () => {
        reject(new Error('Failed to load image for blur placeholder'));
      };
      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Generate srcset for responsive images
   * Returns a comma-separated list of URLs with descriptors
   */
  async generateSrcset(file: File): Promise<string> {
    const srcsetParts: string[] = [];

    for (const size of this.RESPONSIVE_SIZES) {
      try {
        const url = await this.resizeImage(file, size.width, size.quality, true);
        srcsetParts.push(`${url} ${size.width}w`);
      } catch (error) {
        console.warn(`Failed to generate srcset size ${size.label}:`, error);
      }
    }

    return srcsetParts.join(', ');
  }

  /**
   * Get file size from blob URL (approximate)
   */
  async getFileSizeFromUrl(url: string): Promise<number> {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return blob.size;
    } catch (error) {
      console.warn('Failed to get file size from URL:', error);
      return 0;
    }
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
