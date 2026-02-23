/**
 * ImageGalleryComponent
 *
 * Gallery display for posts with multiple images:
 * - Grid layout for multiple images (2x2, 1+2, etc.)
 * - Single image full width
 * - Hover effect on images
 * - Click to open lightbox
 * - Image count badge for 3+ images
 * - Responsive grid adjustment
 * - Blur-up lazy loading
 * - Responsive images with srcset
 *
 * CID: Phase-3 Milestone 3.5 - Image Uploads & Media
 */
import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Maximize2, Images } from 'lucide-angular';

export interface GalleryImage {
  id: string;
  url: string;
  alt?: string;
  width?: number;
  height?: number;
  optimizedUrl?: string;
  srcset?: string;
  blurPlaceholder?: string;
  thumbnailUrl?: string;
}

@Component({
  selector: 'app-image-gallery',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    @if (images().length > 0) {
      <div
        class="image-gallery"
        [class]="gridClass()"
        (click)="openLightbox($event)"
      >
        @for (image of displayImages(); track image.id; let i = $index) {
          <div class="gallery-item" [class]="getItemClass(i)">
            <img
              [src]="getImageSrc(image)"
              [srcset]="image.srcset || ''"
              [alt]="image.alt || 'Gallery image'"
              class="gallery-image"
              loading="lazy"
              [class.blur-up]="isBlurUp(image)"
              [style.background-image]="getBlurStyle(image)"
            />

            @if (showOverlay(i)) {
              <div class="image-overlay">
                <lucide-icon [img]="maximizeIcon" [size]="24"></lucide-icon>
              </div>
            }

            @if (showCountBadge()) {
              <div class="count-badge">
                <lucide-icon [img]="imagesIcon" [size]="14"></lucide-icon>
                <span>+{{ images().length - 1 }}</span>
              </div>
            }
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .image-gallery {
      display: grid;
      gap: 0.25rem;
      border-radius: calc(var(--radius) - 0.25rem);
      overflow: hidden;
      cursor: pointer;
    }

    /* Single Image - Full Width */
    .single-image {
      grid-template-columns: 1fr;
      
      .gallery-item {
        position: relative;
        padding-top: 75%; /* 4:3 aspect ratio */
        
        .gallery-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
      }
    }

    /* Two Images - Side by Side */
    .two-images {
      grid-template-columns: 1fr 1fr;
      
      .gallery-item {
        position: relative;
        padding-top: 75%;
        
        .gallery-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
      }
    }

    /* Three Images - 1 Large + 2 Small */
    .three-images {
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 1fr 1fr;
      
      .gallery-item {
        position: relative;
        
        &:first-child {
          grid-row: 1 / 3;
          padding-top: 0;
          height: 100%;
          
          .gallery-image {
            height: 100%;
            object-fit: cover;
          }
        }
        
        &:not(:first-child) {
          padding-top: 75%;
          
          .gallery-image {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
        }
      }
    }

    /* Four Images - 2x2 Grid */
    .four-images {
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 1fr 1fr;
      
      .gallery-item {
        position: relative;
        padding-top: 75%;
        
        .gallery-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
      }
    }

    .gallery-item {
      background: hsl(var(--muted));
      overflow: hidden;
      transition: all 0.2s;

      &:hover {
        .gallery-image {
          transform: scale(1.05);
        }

        .image-overlay {
          opacity: 1;
        }
      }

      .gallery-image {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        transition: transform 0.3s ease;
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;

        &.blur-up {
          filter: blur(20px);
          transform: scale(1.1);
        }
      }

      .image-overlay {
        position: absolute;
        inset: 0;
        background: hsl(var(--foreground) / 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transition: opacity 0.2s;

        lucide-icon {
          color: white;
        }
      }

      .count-badge {
        position: absolute;
        top: 0.5rem;
        right: 0.5rem;
        display: flex;
        align-items: center;
        gap: 0.25rem;
        padding: 0.25rem 0.5rem;
        background: hsl(var(--background) / 0.9);
        color: hsl(var(--foreground));
        border-radius: calc(var(--radius) - 0.25rem);
        font-size: 0.75rem;
        font-weight: 600;
        backdrop-filter: blur(4px);

        lucide-icon {
          width: 14px;
          height: 14px;
        }
      }
    }

    /* Responsive Adjustments */
    @media (max-width: 640px) {
      .three-images,
      .four-images {
        grid-template-columns: 1fr;
        grid-template-rows: auto;

        .gallery-item {
          padding-top: 75% !important;
          grid-row: auto !important;
        }
      }
    }
  `]
})
export class ImageGalleryComponent {
  @Input({ required: true }) set images(value: GalleryImage[]) {
    this.imagesSignal.set(value || []);
  }
  @Input() lightboxEnabled = true;
  
  @Output() imageClick = new EventEmitter<{ image: GalleryImage; index: number }>();

  maximizeIcon = Maximize2;
  imagesIcon = Images;

  imagesSignal = signal<GalleryImage[]>([]);

  readonly images = this.imagesSignal.asReadonly();

  displayImages = computed(() => {
    const images = this.imagesSignal();
    // Display maximum 4 images (with count badge for additional images)
    return images.slice(0, 4);
  });

  gridClass = computed(() => {
    const count = this.imagesSignal().length;
    if (count === 1) return 'single-image';
    if (count === 2) return 'two-images';
    if (count === 3) return 'three-images';
    return 'four-images';
  });

  showCountBadge = computed(() => {
    return this.imagesSignal().length > 1;
  });

  /**
   * Get item class based on index
   */
  getItemClass(index: number): string {
    return `item-${index}`;
  }

  /**
   * Show overlay on hover
   */
  showOverlay(index: number): boolean {
    // Show overlay on all images except when count badge is shown on first image
    if (this.showCountBadge() && index === 0) {
      return false;
    }
    return true;
  }

  /**
   * Handle image click
   */
  openLightbox(event: MouseEvent): void {
    if (!this.lightboxEnabled) return;

    event.stopPropagation();

    // Get the clicked image index
    const target = event.target as HTMLElement;
    const galleryItem = target.closest('.gallery-item');

    if (galleryItem) {
      const index = Array.from(galleryItem.parentElement?.children || []).indexOf(galleryItem);
      const image = this.imagesSignal()[index];

      if (image) {
        this.imageClick.emit({ image, index });
      }
    }
  }

  /**
   * Get image src - use optimized URL if available, otherwise original
   */
  getImageSrc(image: GalleryImage): string {
    return image.optimizedUrl || image.url;
  }

  /**
   * Check if blur-up effect should be applied
   */
  isBlurUp(image: GalleryImage): boolean {
    return !!image.blurPlaceholder;
  }

  /**
   * Get blur placeholder background style
   */
  getBlurStyle(image: GalleryImage): string {
    if (image.blurPlaceholder) {
      return `url("${image.blurPlaceholder}")`;
    }
    return 'none';
  }
}
