import { Injectable, signal } from '@angular/core';
import { ToastService } from './toast.service';

export interface ShareData {
  postId: number;
  postUrl: string;
  postContent: string;
  author: string;
}

export interface ShareOption {
  id: string;
  name: string;
  icon: string;
  color: string;
  shareUrl: (data: ShareData) => string;
  isNative?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SharePostService {
  private showModalSignal = signal(false);
  showModal = this.showModalSignal.asReadonly();

  private currentShareDataSignal = signal<ShareData | null>(null);
  currentShareData = this.currentShareDataSignal.asReadonly();

  private shareCountSignal = signal<Map<number, number>>(new Map());
  shareCount = this.shareCountSignal.asReadonly();

  private shareOptions: ShareOption[] = [
    {
      id: 'copy',
      name: 'Copy Link',
      icon: 'link',
      color: '#6b7280',
      shareUrl: (data) => data.postUrl,
      isNative: false
    },
    {
      id: 'twitter',
      name: 'Share on Twitter',
      icon: 'twitter',
      color: '#1da1f2',
      shareUrl: (data) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(data.postContent)}&url=${encodeURIComponent(data.postUrl)}`
    },
    {
      id: 'facebook',
      name: 'Share on Facebook',
      icon: 'facebook',
      color: '#4267b2',
      shareUrl: (data) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(data.postUrl)}`
    },
    {
      id: 'linkedin',
      name: 'Share on LinkedIn',
      icon: 'linkedin',
      color: '#0077b5',
      shareUrl: (data) => `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(data.postUrl)}&summary=${encodeURIComponent(data.postContent)}`
    },
    {
      id: 'whatsapp',
      name: 'Share on WhatsApp',
      icon: 'whatsapp',
      color: '#25d366',
      shareUrl: (data) => `https://wa.me/?text=${encodeURIComponent(data.postContent + ' ' + data.postUrl)}`
    },
    {
      id: 'email',
      name: 'Share via Email',
      icon: 'mail',
      color: '#ea4335',
      shareUrl: (data) => `mailto:?subject=Check out this post&body=${encodeURIComponent(data.postContent + '\n\n' + data.postUrl)}`
    }
  ];

  constructor(private toastService: ToastService) {}

  getOptions(): ShareOption[] {
    return this.shareOptions;
  }

  showShareModal(data: ShareData): void {
    this.currentShareDataSignal.set(data);
    this.showModalSignal.set(true);
  }

  hideShareModal(): void {
    this.showModalSignal.set(false);
    setTimeout(() => {
      this.currentShareDataSignal.set(null);
    }, 300);
  }

  async share(option: ShareOption, data: ShareData): Promise<void> {
    try {
      if (option.id === 'copy') {
        await navigator.clipboard.writeText(data.postUrl);
        this.toastService.success('Link copied', 'Post URL copied to clipboard');
        this.trackShare(data.postId);
        this.hideShareModal();
        return;
      }

      // Check for native Web Share API support
      if (navigator.share && option.isNative) {
        await navigator.share({
          title: 'Check out this post',
          text: data.postContent,
          url: data.postUrl
        });
        this.trackShare(data.postId);
        this.hideShareModal();
        return;
      }

      // Open share URL in new window
      const shareUrl = option.shareUrl(data);
      window.open(shareUrl, '_blank', 'width=600,height=400');
      this.trackShare(data.postId);
      this.hideShareModal();

    } catch (error) {
      if ((error as any).name !== 'AbortError') {
        this.toastService.error('Share failed', 'Unable to share post. Please try again.');
      }
    }
  }

  private trackShare(postId: number): void {
    const currentMap = this.shareCountSignal();
    const newMap = new Map(currentMap);
    newMap.set(postId, (newMap.get(postId) || 0) + 1);
    this.shareCountSignal.set(newMap);
  }

  getShareCount(postId: number): number {
    return this.shareCountSignal().get(postId) || 0;
  }

  generatePostUrl(postId: number): string {
    return `${window.location.origin}/post/${postId}`;
  }
}
