import { Injectable, signal } from '@angular/core';

export interface LightboxImage {
  url: string;
  alt: string;
  postId?: number;
  author?: string;
}

@Injectable({
  providedIn: 'root'
})
export class LightboxService {
  private currentImageSignal = signal<LightboxImage | null>(null);
  currentImage = this.currentImageSignal.asReadonly();

  private imagesSignal = signal<LightboxImage[]>([]);
  images = this.imagesSignal.asReadonly();

  private currentIndexSignal = signal(-1);
  currentIndex = this.currentIndexSignal.asReadonly();

  openImage(image: LightboxImage, images?: LightboxImage[]): void {
    if (images && images.length > 1) {
      this.imagesSignal.set(images);
      const index = images.findIndex(img => img.url === image.url);
      this.currentIndexSignal.set(index >= 0 ? index : 0);
    } else {
      this.imagesSignal.set([image]);
      this.currentIndexSignal.set(0);
    }
    this.currentImageSignal.set(image);
  }

  close(): void {
    this.currentImageSignal.set(null);
    this.imagesSignal.set([]);
    this.currentIndexSignal.set(-1);
  }

  next(): void {
    const images = this.imagesSignal();
    const currentIndex = this.currentIndexSignal();
    
    if (images.length > 1) {
      const nextIndex = (currentIndex + 1) % images.length;
      this.currentIndexSignal.set(nextIndex);
      this.currentImageSignal.set(images[nextIndex]);
    }
  }

  previous(): void {
    const images = this.imagesSignal();
    const currentIndex = this.currentIndexSignal();
    
    if (images.length > 1) {
      const prevIndex = (currentIndex - 1 + images.length) % images.length;
      this.currentIndexSignal.set(prevIndex);
      this.currentImageSignal.set(images[prevIndex]);
    }
  }

  goToIndex(index: number): void {
    const images = this.imagesSignal();
    if (index >= 0 && index < images.length) {
      this.currentIndexSignal.set(index);
      this.currentImageSignal.set(images[index]);
    }
  }

  hasMultipleImages(): boolean {
    return this.imagesSignal().length > 1;
  }

  getCurrentIndex(): number {
    return this.currentIndexSignal();
  }

  getTotalImages(): number {
    return this.imagesSignal().length;
  }
}
