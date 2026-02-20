import { Injectable, signal, computed } from '@angular/core';
import { PostService, Post } from './post.service';

export interface HashtagInfo {
  tag: string;
  count: number;
  posts: Post[];
}

@Injectable({
  providedIn: 'root'
})
export class HashtagService {
  private hashtagsSignal = signal<HashtagInfo[]>([]);

  hashtags = this.hashtagsSignal.asReadonly();

  constructor(private postService: PostService) {
    this.extractHashtagsFromPosts();
  }

  private extractHashtagsFromPosts(): void {
    const posts = this.postService.posts();
    const hashtagMap = new Map<string, Post[]>();

    this.collectHashtagsFromPosts(posts, hashtagMap);

    const hashtagInfos: HashtagInfo[] = Array.from(hashtagMap.entries())
      .map(([tag, posts]) => ({
        tag,
        count: posts.length,
        posts
      }))
      .sort((a, b) => b.count - a.count);

    this.hashtagsSignal.set(hashtagInfos);
  }

  private collectHashtagsFromPosts(posts: Post[], hashtagMap: Map<string, Post[]>): void {
    for (const post of posts) {
      const hashtags = this.extractHashtags(post.content);
      
      for (const tag of hashtags) {
        const normalizedTag = tag.toLowerCase();
        const existingPosts = hashtagMap.get(normalizedTag) || [];
        
        if (!existingPosts.find(p => p.id === post.id)) {
          existingPosts.push(post);
          hashtagMap.set(normalizedTag, existingPosts);
        }
      }

      if (post.repliesList) {
        this.collectHashtagsFromPosts(post.repliesList, hashtagMap);
      }
    }
  }

  private extractHashtags(content: string): string[] {
    const hashtagRegex = /#[\w]+/g;
    const matches = content.match(hashtagRegex);
    return matches ? matches.map(tag => tag.substring(1)) : [];
  }

  getHashtagInfo(tag: string): HashtagInfo | undefined {
    const normalizedTag = tag.toLowerCase().replace('#', '');
    return this.hashtagsSignal().find(info => info.tag === normalizedTag);
  }

  getPostsByHashtag(tag: string): Post[] {
    const info = this.getHashtagInfo(tag);
    return info?.posts || [];
  }

  getTrendingHashtags(limit: number = 5): HashtagInfo[] {
    return this.hashtagsSignal().slice(0, limit);
  }

  getAllHashtags(): string[] {
    return this.hashtagsSignal().map(info => info.tag);
  }

  searchHashtags(query: string): HashtagInfo[] {
    const normalizedQuery = query.toLowerCase();
    return this.hashtagsSignal().filter(info => 
      info.tag.includes(normalizedQuery)
    );
  }
}
