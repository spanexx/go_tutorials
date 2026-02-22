/**
 * ImageLightboxComponent
 * 
 * Full-screen image lightbox with navigation:
 * - Full-screen overlay
 * - Image centered with max dimensions
 * - Navigation arrows for multiple images
 * - Image counter (1 of 4)
 * - Zoom functionality (click or pinch)
 * - Download button
 * - Close button and ESC key
 * - Swipe gestures for mobile
 * 
 * CID: Phase-3 Milestone 3.5 - Image Uploads & Media
 */
import { Component, Input, Output, EventEmitter, signal, computed, HostListener, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, X, ChevronLeft, ChevronRight, Download, ZoomIn, ZoomOut, Minimize2 } from 'lucide-angular';
import { GalleryImage } from '../image-gallery/image-gallery.component';

@Component({
  selector: 'app-image-lightbox',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  template: `
    @if (isOpen()) {
      <div class="lightbox-overlay" (click)="closeLightbox()">
        <!-- Close Button -->
        <button class="close-btn" (click)="closeLightbox()" title="Close (Esc)">
          <lucide-icon [img]="closeIcon" [size]="24"></lucide-icon>
        </button>

        <!-- Navigation - Previous -->
        @if (showNavigation() && currentIndex() > 0) {
          <button class="nav-btn prev" (click)="previousImage($event)" title="Previous">
            <lucide-icon [img]="chevronLeftIcon" [size]="32"></lucide-icon>
          </button>
        }

        <!-- Navigation - Next -->
        @if (showNavigation() && currentIndex() < images().length - 1) {
          <button class="nav-btn next" (click)="nextImage($event)" title="Next">
            <lucide-icon [img]="chevronRightIcon" [size]="32"></lucide-icon>
          </button>
        }

        <!-- Image Container -->
        <div class="lightbox-content" (click)="$event.stopPropagation()">
          <div 
            class="image-wrapper" 
            [class.zoomed]="zoomLevel() > 1"
            (click)="toggleZoom()"
            (wheel)="onWheel($event)"
          >
            <img 
              [src]="currentImage()?.url" 
              [alt]="currentImage()?.alt || 'Lightbox image'"
              class="lightbox-image"
              [style.transform]="'scale(' + zoomLevel() + ')'"
              loading="eager"
            />
          </div>

          <!-- Image Counter -->
          @if (showCounter()) {
            <div class="image-counter">
              <span>{{ currentIndex() + 1 }} / {{ images().length }}</span>
            </div>
          }

          <!-- Action Buttons -->
          <div class="lightbox-actions">
            <button class="action-btn" (click)="toggleZoom()" [title]="zoomLevel() > 1 ? 'Zoom out' : 'Zoom in'">
              <lucide-icon [img]="zoomLevel() > 1 ? zoomOutIcon : zoomInIcon" [size]="20"></lucide-icon>
            </button>
            @if (zoomLevel() > 1) {
              <button class="action-btn" (click)="resetZoom()" title="Reset zoom">
                <lucide-icon [img]="minimizeIcon" [size]="20"></lucide-icon>
              </button>
            }
            <button class="action-btn" (click)="downloadImage()" title="Download">
              <lucide-icon [img]="downloadIcon" [size]="20"></lucide-icon>
            </button>
          </div>
        </div>

        <!-- Touch/Swipe Support -->
        <div 
          class="touch-layer"
          (touchstart)="onTouchStart($event)"
          (touchmove)="onTouchMove($event)"
          (touchend)="onTouchEnd($event)"
        ></div>
      </div>
    }
  `,
  styles: [`
    .lightbox-overlay {
      position: fixed;
      inset: 0;
      background: hsl(var(--foreground) / 0.95);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      animation: fadeIn 0.2s ease;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    .close-btn {
      position: absolute;
      top: 1rem;
      right: 1rem;
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: hsl(var(--background) / 0.2);
      border: 1px solid hsl(var(--border) / 0.3);
      border-radius: 50%;
      cursor: pointer;
      color: hsl(var(--foreground));
      transition: all 0.2s;
      backdrop-filter: blur(4px);
      z-index: 10;

      &:hover {
        background: hsl(var(--destructive));
        border-color: hsl(var(--destructive));
        color: hsl(var(--destructive-foreground));
      }

      lucide-icon {
        width: 24px;
        height: 24px;
      }
    }

    .nav-btn {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: hsl(var(--background) / 0.2);
      border: 1px solid hsl(var(--border) / 0.3);
      border-radius: 50%;
      cursor: pointer;
      color: hsl(var(--foreground));
      transition: all 0.2s;
      backdrop-filter: blur(4px);
      z-index: 10;

      &:hover {
        background: hsl(var(--accent));
        border-color: hsl(var(--accent));
        color: hsl(var(--accent-foreground));
      }

      &.prev {
        left: 1.5rem;
      }

      &.next {
        right: 1.5rem;
      }

      lucide-icon {
        width: 32px;
        height: 32px;
      }
    }

    .lightbox-content {
      position: relative;
      max-width: 90vw;
      max-height: 90vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .image-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.3s ease;
      cursor: zoom-in;

      &.zoomed {
        cursor: zoom-out;
      }

      .lightbox-image {
        max-width: 90vw;
        max-height: 90vh;
        object-fit: contain;
        border-radius: calc(var(--radius) - 0.25rem);
        box-shadow: 0 25px 50px -12px hsl(var(--shadow) / 0.25);
        transition: transform 0.3s ease;
      }
    }

    .image-counter {
      position: absolute;
      bottom: 1rem;
      left: 50%;
      transform: translateX(-50%);
      padding: 0.375rem 0.75rem;
      background: hsl(var(--background) / 0.9);
      color: hsl(var(--foreground));
      border-radius: calc(var(--radius) - 0.25rem);
      font-size: 0.75rem;
      font-weight: 600;
      backdrop-filter: blur(4px);
    }

    .lightbox-actions {
      position: absolute;
      bottom: 1rem;
      right: 1rem;
      display: flex;
      gap: 0.5rem;
    }

    .action-btn {
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: hsl(var(--background) / 0.2);
      border: 1px solid hsl(var(--border) / 0.3);
      border-radius: calc(var(--radius) - 0.25rem);
      cursor: pointer;
      color: hsl(var(--foreground));
      transition: all 0.2s;
      backdrop-filter: blur(4px);

      &:hover {
        background: hsl(var(--accent));
        border-color: hsl(var(--accent));
        color: hsl(var(--accent-foreground));
      }

      lucide-icon {
        width: 20px;
        height: 20px;
      }
    }

    .touch-layer {
      position: absolute;
      inset: 0;
      z-index: 5;
    }

    /* Mobile Responsive */
    @media (max-width: 768px) {
      .nav-btn {
        width: 40px;
        height: 40px;

        &.prev {
          left: 0.75rem;
        }

        &.next {
          right: 0.75rem;
        }

        lucide-icon {
          width: 24px;
          height: 24px;
        }
      }

      .lightbox-actions {
        bottom: 3.5rem;
        right: 50%;
        transform: translateX(50%);
      }

      .image-counter {
        bottom: 3.5rem;
      }
    }
  `]
})
export class ImageLightboxComponent implements OnDestroy {
  @Input() set open(value: boolean) {
    this.isOpenSignal.set(value);
    if (value) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }
  @Input() set images(value: GalleryImage[]) {
    this.imagesSignal.set(value || []);
  }
  @Input() set currentIndex(value: number) {
    this.currentIndexSignal.set(value);
  }

  @Output() closed = new EventEmitter<void>();
  @Output() indexChange = new EventEmitter<number>();

  closeIcon = X;
  chevronLeftIcon = ChevronLeft;
  chevronRightIcon = ChevronRight;
  downloadIcon = Download;
  zoomInIcon = ZoomIn;
  zoomOutIcon = ZoomOut;
  minimizeIcon = Minimize2;

  isOpenSignal = signal(false);
  imagesSignal = signal<GalleryImage[]>([]);
  currentIndexSignal = signal(0);
  zoomLevelSignal = signal(1);

  readonly isOpen = this.isOpenSignal.asReadonly();
  readonly images = this.imagesSignal.asReadonly();
  readonly currentIndex = this.currentIndexSignal.asReadonly();
  readonly zoomLevel = this.zoomLevelSignal.asReadonly();

  currentImage = computed(() => this.imagesSignal()[this.currentIndexSignal()]);
  showNavigation = computed(() => this.imagesSignal().length > 1);
  showCounter = computed(() => this.imagesSignal().length > 1);

  // Touch/swipe support
  private touchStartX = 0;
  private touchStartY = 0;
  private touchEndX = 0;
  private touchEndY = 0;

  /**
   * Handle keyboard events
   */
  @HostListener('document:keydown', ['$event'])
  handleKeydown(event: KeyboardEvent): void {
    if (!this.isOpenSignal()) return;

    switch (event.key) {
      case 'Escape':
        this.closeLightbox();
        break;
      case 'ArrowLeft':
        if (this.currentIndexSignal() > 0) {
          this.previousImage();
        }
        break;
      case 'ArrowRight':
        if (this.currentIndexSignal() < this.imagesSignal().length - 1) {
          this.nextImage();
        }
        break;
      case '+':
      case '=':
        this.zoomIn();
        break;
      case '-':
        this.zoomOut();
        break;
      case '0':
        this.resetZoom();
        break;
    }
  }

  /**
   * Close lightbox
   */
  closeLightbox(): void {
    this.isOpenSignal.set(false);
    this.resetZoom();
    this.closed.emit();
  }

  /**
   * Navigate to previous image
   */
  previousImage(event?: MouseEvent): void {
    event?.stopPropagation();
    if (this.currentIndexSignal() > 0) {
      this.currentIndexSignal.update(i => i - 1);
      this.indexChange.emit(this.currentIndexSignal());
      this.resetZoom();
    }
  }

  /**
   * Navigate to next image
   */
  nextImage(event?: MouseEvent): void {
    event?.stopPropagation();
    if (this.currentIndexSignal() < this.imagesSignal().length - 1) {
      this.currentIndexSignal.update(i => i + 1);
      this.indexChange.emit(this.currentIndexSignal());
      this.resetZoom();
    }
  }

  /**
   * Toggle zoom
   */
  toggleZoom(): void {
    if (this.zoomLevelSignal() > 1) {
      this.resetZoom();
    } else {
      this.zoomIn();
    }
  }

  /**
   * Zoom in
   */
  zoomIn(): void {
    this.zoomLevelSignal.update(z => Math.min(z + 0.5, 3));
  }

  /**
   * Zoom out
   */
  zoomOut(): void {
    this.zoomLevelSignal.update(z => Math.max(z - 0.5, 1));
  }

  /**
   * Reset zoom
   */
  resetZoom(): void {
    this.zoomLevelSignal.set(1);
  }

  /**
   * Handle wheel zoom
   */
  onWheel(event: WheelEvent): void {
    event.preventDefault();
    if (event.deltaY < 0) {
      this.zoomIn();
    } else {
      this.zoomOut();
    }
  }

  /**
   * Download current image
   */
  downloadImage(): void {
    const image = this.currentImage();
    if (!image) return;

    const link = document.createElement('a');
    link.href = image.url;
    link.download = image.alt || `image-${this.currentIndexSignal() + 1}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Touch start handler
   */
  onTouchStart(event: TouchEvent): void {
    this.touchStartX = event.touches[0].clientX;
    this.touchStartY = event.touches[0].clientY;
  }

  /**
   * Touch move handler
   */
  onTouchMove(event: TouchEvent): void {
    this.touchEndX = event.touches[0].clientX;
    this.touchEndY = event.touches[0].clientY;
  }

  /**
   * Touch end handler - swipe navigation
   */
  onTouchEnd(): void {
    const deltaX = this.touchStartX - this.touchEndX;
    const deltaY = Math.abs(this.touchStartY - this.touchEndY);

    // Only handle horizontal swipes (not vertical scrolls)
    if (Math.abs(deltaX) > 50 && deltaY < 100) {
      if (deltaX > 0) {
        // Swipe left - next image
        if (this.currentIndexSignal() < this.imagesSignal().length - 1) {
          this.nextImage();
        }
      } else {
        // Swipe right - previous image
        if (this.currentIndexSignal() > 0) {
          this.previousImage();
        }
      }
    }
  }

  /**
   * Cleanup on destroy
   */
  ngOnDestroy(): void {
    document.body.style.overflow = '';
  }
}
