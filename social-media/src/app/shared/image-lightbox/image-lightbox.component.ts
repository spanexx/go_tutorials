import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Download, Maximize } from 'lucide-angular';
import { LightboxService, LightboxImage } from '../../shared/services/lightbox.service';

@Component({
  selector: 'app-image-lightbox',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './image-lightbox.component.html',
  styleUrls: ['./image-lightbox.component.scss']
})
export class ImageLightboxComponent {
  closeIcon = X;
  leftIcon = ChevronLeft;
  rightIcon = ChevronRight;
  zoomInIcon = ZoomIn;
  zoomOutIcon = ZoomOut;
  downloadIcon = Download;
  maximizeIcon = Maximize;

  zoom = 1;
  isFullscreen = false;

  constructor(public lightboxService: LightboxService) {}

  currentImage = this.lightboxService.currentImage;

  get images() {
    return this.lightboxService.images();
  }

  get hasMultiple(): boolean {
    return this.lightboxService.hasMultipleImages();
  }

  get currentIndex(): number {
    return this.lightboxService.getCurrentIndex();
  }

  get totalImages(): number {
    return this.lightboxService.getTotalImages();
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboard(event: KeyboardEvent): void {
    if (!this.currentImage()) return;

    switch (event.key) {
      case 'Escape':
        this.close();
        break;
      case 'ArrowRight':
        this.next();
        break;
      case 'ArrowLeft':
        this.previous();
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

  close(): void {
    this.lightboxService.close();
    this.resetZoom();
  }

  next(): void {
    this.lightboxService.next();
    this.resetZoom();
  }

  previous(): void {
    this.lightboxService.previous();
    this.resetZoom();
  }

  goToIndex(index: number): void {
    this.lightboxService.goToIndex(index);
    this.resetZoom();
  }

  zoomIn(): void {
    if (this.zoom < 3) {
      this.zoom = Math.min(this.zoom + 0.25, 3);
    }
  }

  zoomOut(): void {
    if (this.zoom > 0.5) {
      this.zoom = Math.max(this.zoom - 0.25, 0.5);
    }
  }

  resetZoom(): void {
    this.zoom = 1;
  }

  toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        this.isFullscreen = true;
      }).catch(() => {
        // Fullscreen not supported
      });
    } else {
      document.exitFullscreen().then(() => {
        this.isFullscreen = false;
      });
    }
  }

  download(): void {
    const image = this.currentImage();
    if (image?.url) {
      const link = document.createElement('a');
      link.href = image.url;
      link.download = `socialhub-image-${image.postId || 'download'}.jpg`;
      link.target = '_blank';
      link.click();
    }
  }

  stopPropagation(event: Event): void {
    event.stopPropagation();
  }

  getImageTransform(): string {
    return `scale(${this.zoom})`;
  }
}
