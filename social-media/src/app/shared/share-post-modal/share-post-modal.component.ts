import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, X, Link, Share2, ExternalLink } from 'lucide-angular';
import { SharePostService, ShareOption } from '../../shared/services/share-post.service';

@Component({
  selector: 'app-share-post-modal',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './share-post-modal.component.html',
  styleUrls: ['./share-post-modal.component.scss']
})
export class SharePostModalComponent {
  closeIcon = X;
  linkIcon = Link;
  shareIcon = Share2;
  externalIcon = ExternalLink;

  constructor(public shareService: SharePostService) {}

  showModal = this.shareService.showModal;
  shareData = this.shareService.currentShareData;
  shareOptions = this.shareService.getOptions();

  closeModal(): void {
    this.shareService.hideShareModal();
  }

  onShare(option: ShareOption): void {
    const data = this.shareData();
    if (data) {
      this.shareService.share(option, data);
    }
  }

  getIconClass(icon: string): string {
    return `icon-${icon}`;
  }

  getPostUrl(): string {
    const data = this.shareData();
    return data?.postUrl || '';
  }

  getShortUrl(): string {
    const url = this.getPostUrl();
    if (url.length > 40) {
      return url.substring(0, 37) + '...';
    }
    return url;
  }
}
