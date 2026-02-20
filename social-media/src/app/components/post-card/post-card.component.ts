import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Heart, MessageCircle, Share2, Bookmark, MoreHorizontal } from 'lucide-angular';
import { PostService } from '../../shared/services/post.service';

@Component({
  selector: 'app-post-card',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './post-card.component.html',
  styleUrls: ['./post-card.component.scss']
})
export class PostCardComponent {
  heartIcon = Heart;
  commentIcon = MessageCircle;
  shareIcon = Share2;
  bookmarkIcon = Bookmark;
  moreIcon = MoreHorizontal;

  @Input() post!: any;

  constructor(private postService: PostService) {}

  toggleLike() {
    this.postService.toggleLike(this.post.id);
  }

  toggleSave() {
    this.postService.toggleSave(this.post.id);
  }
}
