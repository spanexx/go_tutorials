import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { LucideAngularModule, Hash, TrendingUp } from 'lucide-angular';
import { PostCardComponent } from '../../components/post-card/post-card.component';
import { HashtagService, HashtagInfo } from '../../shared/services/hashtag.service';
import { Post } from '../../shared/services/post.service';

@Component({
  selector: 'app-hashtag',
  standalone: true,
  imports: [CommonModule, RouterModule, LucideAngularModule, PostCardComponent],
  templateUrl: './hashtag.component.html',
  styleUrls: ['./hashtag.component.scss']
})
export class HashtagComponent {
  hashtagIcon = Hash;
  trendingIcon = TrendingUp;

  currentHashtag: string | null = null;
  posts: Post[] = [];
  hashtagInfo: HashtagInfo | undefined;
  trendingHashtags: HashtagInfo[] = [];

  constructor(
    private route: ActivatedRoute,
    private hashtagService: HashtagService
  ) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const tag = params.get('tag');
      if (tag) {
        this.currentHashtag = tag.replace('#', '');
        this.hashtagInfo = this.hashtagService.getHashtagInfo(this.currentHashtag);
        this.posts = this.hashtagInfo?.posts || [];
      }
    });

    this.trendingHashtags = this.hashtagService.getTrendingHashtags(5);
  }

  get displayTag(): string {
    return this.currentHashtag ? `#${this.currentHashtag}` : '';
  }

  get postCount(): number {
    return this.posts.length;
  }

  get hasPosts(): boolean {
    return this.posts.length > 0;
  }

  get hasNoPosts(): boolean {
    return !this.hasPosts && this.currentHashtag !== null;
  }
}
