import { Component, Input, ViewContainerRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Heart, MessageCircle, Share2, Bookmark, MoreHorizontal, CornerDownRight } from 'lucide-angular';
import { PostService, Post as PostData } from '../../shared/services/post.service';
import { PostContentPipe } from '../../shared/pipes/post-content.pipe';
import { UserProfileCardComponent } from '../../shared/user-profile-card/user-profile-card.component';
import { UserProfileDirective } from '../../shared/directives/user-profile.directive';
import { SharePostService } from '../../shared/services/share-post.service';
import { ReactionService, ReactionType, ReactionCounts } from '../../shared/services/reaction.service';
import { ReactionPickerComponent } from '../../shared/reaction-picker/reaction-picker.component';
import { ReplyService, Reply } from '../../shared/services/reply.service';
import { ReplyFormComponent } from '../../shared/reply-form/reply-form.component';
import { LightboxService, LightboxImage } from '../../shared/services/lightbox.service';
import { ImageLightboxComponent } from '../../shared/image-lightbox/image-lightbox.component';

export interface ThreadData {
  id: number;
  author: { name: string; username: string; avatar: string };
  content: string;
  timestamp: string;
  likes: number;
  replies?: number;
  shares?: number;
  image?: string;
  repliesList?: ThreadData[];
}

@Component({
  selector: 'app-thread',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, PostContentPipe, UserProfileCardComponent, UserProfileDirective, ReactionPickerComponent, ReplyFormComponent, ImageLightboxComponent],
  templateUrl: './thread.component.html',
  styleUrls: ['./thread.component.scss']
})
export class ThreadComponent {
  heartIcon = Heart;
  commentIcon = MessageCircle;
  shareIcon = Share2;
  bookmarkIcon = Bookmark;
  moreIcon = MoreHorizontal;
  replyIcon = CornerDownRight;

  @Input() post!: ThreadData;
  @Input() isReply = false;
  @Input() depth = 0;

  isLiked = false;
  isSaved = false;
  isExpanded = true;
  showReactionPicker = false;
  showReplyForm = false;

  constructor(
    private postService: PostService,
    private shareService: SharePostService,
    public reactionService: ReactionService,
    private replyService: ReplyService,
    private lightboxService: LightboxService
  ) {}

  toggleLike() {
    this.postService.toggleLike(this.post.id);
  }

  toggleSave() {
    this.postService.toggleSave(this.post.id);
  }

  toggleExpand() {
    this.isExpanded = !this.isExpanded;
  }

  onShare(): void {
    const shareData = {
      postId: this.post.id,
      postUrl: this.shareService.generatePostUrl(this.post.id),
      postContent: this.post.content.substring(0, 100) + (this.post.content.length > 100 ? '...' : ''),
      author: this.post.author.username
    };
    this.shareService.showShareModal(shareData);
  }

  getShareCount(): number {
    return this.shareService.getShareCount(this.post.id);
  }

  showPicker(): void {
    this.showReactionPicker = true;
  }

  hidePicker(): void {
    this.showReactionPicker = false;
  }

  onReactionSelect(reaction: ReactionType): void {
    this.reactionService.addReaction(this.post.id, reaction);
    this.showReactionPicker = false;
  }

  getUserReaction(): ReactionType | null {
    return this.reactionService.getUserReaction(this.post.id);
  }

  getReactionCounts(): ReactionCounts {
    return this.reactionService.getReactionCounts(this.post.id);
  }

  getDisplayCount(): number {
    const counts = this.getReactionCounts();
    const userReaction = this.getUserReaction();
    return counts.total + (userReaction ? 0 : this.post.likes);
  }

  getReactionEmoji(): string | null {
    const userReaction = this.getUserReaction();
    if (userReaction) {
      return this.reactionService.getReactionEmoji(userReaction);
    }
    return null;
  }

  getReactionColor(): string | null {
    const userReaction = this.getUserReaction();
    if (userReaction) {
      return this.reactionService.getReactionColor(userReaction);
    }
    return null;
  }

  toggleReplyForm(): void {
    this.showReplyForm = !this.showReplyForm;
  }

  onReplyAdded(): void {
    this.showReplyForm = false;
  }

  getReplies(): Reply[] {
    return this.replyService.getReplies(this.post.id);
  }

  getReplyCount(): number {
    return this.replyService.getReplyCount(this.post.id);
  }

  openImage(): void {
    if (this.post.image) {
      const image: LightboxImage = {
        url: this.post.image,
        alt: this.post.content.substring(0, 50),
        postId: this.post.id,
        author: this.post.author.username
      };
      this.lightboxService.openImage(image);
    }
  }
}
