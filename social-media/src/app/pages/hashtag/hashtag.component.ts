import { Component, OnInit } from '@angular/core';
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
export class HashtagComponent implements OnInit {
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
        void this.loadHashtagInfo(this.currentHashtag);
      }
    });

    void this.loadTrendingHashtags();
  }

  private async loadHashtagInfo(tag: string): Promise<void> {
    try {
      this.hashtagInfo = await this.hashtagService.getHashtagInfo(tag);
      this.posts = this.hashtagInfo?.posts || [];
    } catch {
      this.hashtagInfo = undefined;
      this.posts = [];
    }
  }

  private async loadTrendingHashtags(): Promise<void> {
    try {
      this.trendingHashtags = await this.hashtagService.getTrendingHashtags(5);
    } catch {
      this.trendingHashtags = [];
    }
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
