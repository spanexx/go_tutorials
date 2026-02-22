import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Heart, MessageCircle, Share2, Bookmark, MoreHorizontal } from 'lucide-angular';
import { Router } from '@angular/router';
import { PostService } from '../../shared/services/post.service';
import { ReactionBarComponent } from '../../shared/reaction-bar/reaction-bar.component';
import { ReactionSummaryComponent } from '../../shared/reaction-summary/reaction-summary.component';
import { ReactionService } from '../../shared/services/reaction.service';
import { ReactionCounts, ReactionType } from '../../shared/models/reaction.model';
import { CommentService } from '../../shared/services/comment.service';
import { CommentListComponent } from '../../shared/comment-list/comment-list.component';
import { CommentInputComponent } from '../../shared/comment-input/comment-input.component';
import { ContentLinkPipe } from '../../shared/pipes/content-link.pipe';
import { ShareModalComponent } from '../../shared/components/share-modal/share-modal.component';
import { BookmarkService } from '../../shared/services/bookmark.service';

@Component({
  selector: 'app-post-card',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, ReactionBarComponent, ReactionSummaryComponent, CommentListComponent, CommentInputComponent, ContentLinkPipe, ShareModalComponent],
  templateUrl: './post-card.component.html',
  styleUrls: ['./post-card.component.scss']
})
export class PostCardComponent implements OnInit {
  heartIcon = Heart;
  commentIcon = MessageCircle;
  shareIcon = Share2;
  bookmarkIcon = Bookmark;
  moreIcon = MoreHorizontal;

  @Input() post!: any;

  isSaved = false;

  shareModalOpen = false;

  commentsOpen = false;
  replyingTo: { commentId: string; parentId: string } | null = null;

  constructor(
    private router: Router,
    private postService: PostService,
    private reactionService: ReactionService,
    private commentService: CommentService,
    private bookmarkService: BookmarkService
  ) { }

  ngOnInit(): void {
    const postId = String(this.post.id);
    this.reactionService.initializePost(postId);
    this.reactionService.loadPostReactions(postId).catch(() => {
      // handled by service caller
    });

    this.commentService.initializePost(postId);

    this.isSaved = this.bookmarkService.isBookmarked(postId);
  }

  get counts(): ReactionCounts {
    return this.reactionService.getReactionCounts(String(this.post.id));
  }

  get userReaction(): ReactionType | null {
    return this.reactionService.getUserReaction(String(this.post.id));
  }

  get isLiked(): boolean {
    return !!this.userReaction;
  }

  async toggleLike() {
    const postId = String(this.post.id);
    if (this.userReaction === ReactionType.Like) {
      await this.reactionService.removeReaction(postId);
      return;
    }

    if (this.userReaction) {
      await this.reactionService.toggleReaction(postId, ReactionType.Like);
      return;
    }

    await this.reactionService.addReaction(postId, ReactionType.Like);
  }

  async toggleSave(): Promise<void> {
    const postId = String(this.post.id);
    if (this.isSaved) {
      await this.bookmarkService.removeBookmark(postId);
      this.isSaved = false;
      return;
    }

    const ok = await this.bookmarkService.bookmarkPost(postId, 'default');
    if (ok) {
      this.isSaved = true;
    }
  }

  openShare(): void {
    this.shareModalOpen = true;
  }

  closeShare(): void {
    this.shareModalOpen = false;
  }

  get shareUrl(): string {
    if (typeof window === 'undefined') {
      return '';
    }
    return `${window.location.origin}/post/${this.post.id}`;
  }

  toggleComments(): void {
    this.commentsOpen = !this.commentsOpen;
    if (this.commentsOpen) {
      this.commentService.loadCommentsForPost(String(this.post.id));
    }
  }

  onReplyClicked(evt: { commentId: string; parentId: string }): void {
    this.replyingTo = evt;
    this.commentsOpen = true;
  }

  onLikeClicked(evt: { commentId: string }): void {
    this.commentService.likeComment(String(this.post.id), evt.commentId);
  }

  async onCommentSubmitted(content: string): Promise<void> {
    await this.commentService.addComment({
      postId: String(this.post.id),
      content,
      parentId: this.replyingTo?.parentId ?? null
    });
    this.replyingTo = null;
  }

  onReplyCancelled(): void {
    this.replyingTo = null;
  }

  onContentClick(event: MouseEvent): void {
    const el = event.target as HTMLElement | null;
    if (!el) {
      return;
    }

    const link = el.closest('a') as HTMLAnchorElement | null;
    if (!link) {
      return;
    }

    const hashtag = link.getAttribute('data-hashtag');
    if (hashtag) {
      event.preventDefault();
      void this.router.navigate(['/hashtag', hashtag]);
      return;
    }

    const username = link.getAttribute('data-username');
    if (username) {
      event.preventDefault();
      void this.router.navigate(['/profile', username]);
    }
  }

  async onReactionSelected(reaction: ReactionType): Promise<void> {
    await this.reactionService.toggleReaction(String(this.post.id), reaction);
  }
}
