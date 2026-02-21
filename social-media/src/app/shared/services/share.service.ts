// Code Map: share.service.ts
// - ShareService: Service for handling post sharing operations and tracking
// - Methods: sharePost, copyLink, getShareUrl
// - Support for multiple platforms (Twitter, Facebook, LinkedIn, WhatsApp, Email)
// - Share tracking (increment share count)
// - Copy to clipboard functionality
// CID: Phase-2 Milestone 2.4 - Sharing & Activity Feed
import { Injectable, signal, computed } from '@angular/core';

export interface SharePlatform {
  id: string;
  name: string;
  icon: string;
  color: string;
  shareUrl: (url: string, text: string) => string;
}

export interface ShareStats {
  postId: string;
  totalShares: number;
  platformShares: Record<string, number>;
}

export interface ShareState {
  stats: Record<string, ShareStats>;
  isSharing: boolean;
  lastShared: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class ShareService {
  private shareState = signal<ShareState>({
    stats: {},
    isSharing: false,
    lastShared: null
  });

  // Get share stats for a post
  getShareStats = computed((postId: string) => 
    this.shareState().stats[postId] || this.createDefaultStats(postId)
  );

  // Check if currently sharing
  isSharing = computed(() => this.shareState().isSharing);

  // Get last shared post ID
  lastShared = computed(() => this.shareState().lastShared);

  // Share platforms configuration
  private platforms: SharePlatform[] = [
    {
      id: 'twitter',
      name: 'Twitter',
      icon: 'twitter',
      color: '#1DA1F2',
      shareUrl: (url, text) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`
    },
    {
      id: 'facebook',
      name: 'Facebook',
      icon: 'facebook',
      color: '#4267B2',
      shareUrl: (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
    },
    {
      id: 'linkedin',
      name: 'LinkedIn',
      icon: 'linkedin',
      color: '#0077B5',
      shareUrl: (url, text) => `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(url)}&summary=${encodeURIComponent(text)}`
    },
    {
      id: 'whatsapp',
      name: 'WhatsApp',
      icon: 'whatsapp',
      color: '#25D366',
      shareUrl: (url, text) => `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`
    },
    {
      id: 'email',
      name: 'Email',
      icon: 'mail',
      color: '#667eea',
      shareUrl: (url, text) => `mailto:?subject=${encodeURIComponent('Check out this post')}&body=${encodeURIComponent(text + '\n\n' + url)}`
    }
  ];

  constructor() {
    // Initialize with mock data for development
    this.initializeMockData();
  }

  private initializeMockData(): void {
    const mockPosts = ['post-1', 'post-2', 'post-3'];
    const stats: Record<string, ShareStats> = {};

    mockPosts.forEach(postId => {
      stats[postId] = {
        postId,
        totalShares: Math.floor(Math.random() * 50),
        platformShares: {
          twitter: Math.floor(Math.random() * 20),
          facebook: Math.floor(Math.random() * 15),
          linkedin: Math.floor(Math.random() * 10),
          whatsapp: Math.floor(Math.random() * 10),
          email: Math.floor(Math.random() * 5)
        }
      };
    });

    this.shareState.set({
      stats,
      isSharing: false,
      lastShared: null
    });
  }

  private createDefaultStats(postId: string): ShareStats {
    return {
      postId,
      totalShares: 0,
      platformShares: {
        twitter: 0,
        facebook: 0,
        linkedin: 0,
        whatsapp: 0,
        email: 0
      }
    };
  }

  /**
   * Get all available share platforms
   */
  getPlatforms(): SharePlatform[] {
    return this.platforms;
  }

  /**
   * Get share URL for a specific platform
   */
  getShareUrl(platformId: string, postUrl: string, text: string): string | null {
    const platform = this.platforms.find(p => p.id === platformId);
    if (!platform) {
      return null;
    }
    return platform.shareUrl(postUrl, text);
  }

  /**
   * Share a post to a specific platform
   */
  sharePost(postId: string, platformId: string, postUrl: string, text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.shareState.update(state => ({
        ...state,
        isSharing: true
      }));

      const shareUrl = this.getShareUrl(platformId, postUrl, text);
      if (!shareUrl) {
        this.shareState.update(state => ({
          ...state,
          isSharing: false
        }));
        reject(new Error(`Unknown platform: ${platformId}`));
        return;
      }

      // Track the share
      this.trackShare(postId, platformId);

      // Open share dialog in a new window
      const width = 600;
      const height = 400;
      const left = window.screenX + (window.innerWidth - width) / 2;
      const top = window.screenY + (window.innerHeight - height) / 2;
      
      window.open(
        shareUrl,
        'Share',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      this.shareState.update(state => ({
        ...state,
        isSharing: false,
        lastShared: postId
      }));

      resolve();
    });
  }

  /**
   * Copy post link to clipboard
   */
  async copyLink(postId: string, postUrl: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(postUrl);
      this.trackShare(postId, 'copy');
      this.shareState.update(state => ({
        ...state,
        lastShared: postId
      }));
      return true;
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = postUrl;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();
      
      try {
        document.execCommand('copy');
        this.trackShare(postId, 'copy');
        this.shareState.update(state => ({
          ...state,
          lastShared: postId
        }));
        document.body.removeChild(textArea);
        return true;
      } catch (err) {
        document.body.removeChild(textArea);
        return false;
      }
    }
  }

  /**
   * Track a share operation
   */
  private trackShare(postId: string, platformId: string): void {
    this.shareState.update(state => {
      const stats = state.stats[postId] || this.createDefaultStats(postId);
      
      return {
        ...state,
        stats: {
          ...state.stats,
          [postId]: {
            ...stats,
            totalShares: stats.totalShares + 1,
            platformShares: {
              ...stats.platformShares,
              [platformId]: (stats.platformShares[platformId] || 0) + 1
            }
          }
        }
      };
    });
  }

  /**
   * Get share count for a post
   */
  getShareCount(postId: string): number {
    return this.getShareStats(postId).totalShares;
  }

  /**
   * Get platform-specific share count
   */
  getPlatformShareCount(postId: string, platformId: string): number {
    const stats = this.getShareStats(postId);
    return stats.platformShares[platformId] || 0;
  }

  /**
   * Reset share state (for testing)
   */
  reset(): void {
    this.shareState.set({
      stats: {},
      isSharing: false,
      lastShared: null
    });
    this.initializeMockData();
  }
}
