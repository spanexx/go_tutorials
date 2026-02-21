import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Heart, MessageCircle, Share2, Bookmark, MoreHorizontal } from 'lucide-angular';
import { PostService } from '../../shared/services/post.service';
import { ReactionBarComponent } from '../../shared/reaction-bar/reaction-bar.component';
import { ReactionSummaryComponent } from '../../shared/reaction-summary/reaction-summary.component';
import { ReactionService } from '../../shared/services/reaction.service';
import { ReactionCounts, ReactionType } from '../../shared/models/reaction.model';

@Component({
  selector: 'app-post-card',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, ReactionBarComponent, ReactionSummaryComponent],
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

  counts: ReactionCounts | null = null;
  userReaction: ReactionType | null = null;
  isLiked = false;
  isSaved = false;

  constructor(
    private postService: PostService,
    private reactionService: ReactionService
  ) { }

  ngOnInit(): void {
    // Initialize reaction state for this post
    this.counts = this.reactionService.getReactionCounts(String(this.post.id));
    this.userReaction = this.reactionService.getUserReaction(String(this.post.id));
    this.isLiked = !!this.userReaction;
  }

  toggleLike() {
    if (this.userReaction) {
      // Remove reaction
      this.reactionService.removeReaction(String(this.post.id));
      this.userReaction = null;
      this.isLiked = false;
    } else {
      // Add like reaction
      this.reactionService.addReaction(String(this.post.id), ReactionType.Like);
      this.userReaction = ReactionType.Like;
      this.isLiked = true;
    }
    this.counts = this.reactionService.getReactionCounts(String(this.post.id));
  }

  toggleSave() {
    this.isSaved = !this.isSaved;
  }

  onReactionSelected(reaction: ReactionType): void {
    this.reactionService.toggleReaction(String(this.post.id), reaction);
    this.userReaction = reaction;
    this.isLiked = true;
    this.counts = this.reactionService.getReactionCounts(String(this.post.id));
  }
}
