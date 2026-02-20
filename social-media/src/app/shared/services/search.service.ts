import { Injectable, signal, computed } from '@angular/core';
import { PostService, Post } from './post.service';

export interface SearchUser {
  name: string;
  username: string;
  avatar: string;
  bio?: string;
  followers?: number;
}

export interface SearchResult {
  posts: Post[];
  users: SearchUser[];
  hashtags: SearchHashtag[];
}

export interface SearchHashtag {
  tag: string;
  count: number;
}

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private searchQuerySignal = signal<string>('');
  private searchResultsSignal = signal<SearchResult>({ posts: [], users: [], hashtags: [] });
  private isSearchingSignal = signal<boolean>(false);

  private mockUsers: SearchUser[] = [
    { name: 'Sarah Johnson', username: 'sarahjohnson', avatar: 'https://i.pravatar.cc/150?img=5', bio: 'Frontend Developer | UI/UX Enthusiast', followers: 12500 },
    { name: 'Alex Chen', username: 'alexchen', avatar: 'https://i.pravatar.cc/150?img=3', bio: 'Full Stack Developer | Open Source Contributor', followers: 8900 },
    { name: 'Marcus Williams', username: 'marcuswilliams', avatar: 'https://i.pravatar.cc/150?img=12', bio: 'Tech Writer | TypeScript Advocate', followers: 15300 },
    { name: 'Emma Davis', username: 'emmadavis', avatar: 'https://i.pravatar.cc/150?img=7', bio: 'Product Designer | Creative Thinker', followers: 6700 },
    { name: 'Nina Patel', username: 'ninapatel', avatar: 'https://i.pravatar.cc/150?img=9', bio: 'Software Engineer | AI Enthusiast', followers: 21000 },
    { name: 'Lisa Rodriguez', username: 'lisarodriguez', avatar: 'https://i.pravatar.cc/150?img=11', bio: 'DevOps Engineer | Cloud Architect', followers: 9400 },
    { name: 'Jake Thompson', username: 'jakethompson', avatar: 'https://i.pravatar.cc/150?img=8', bio: 'Mobile Developer | Flutter Expert', followers: 5600 },
    { name: 'Michael Chen', username: 'michaelchen', avatar: 'https://i.pravatar.cc/150?img=10', bio: 'Backend Developer | Database Guru', followers: 7800 }
  ];

  private mockHashtags: SearchHashtag[] = [
    { tag: 'WebDevelopment', count: 145000 },
    { tag: 'Angular', count: 89000 },
    { tag: 'TypeScript', count: 112000 },
    { tag: 'JavaScript', count: 234000 },
    { tag: 'UIDesign', count: 67000 },
    { tag: 'ReactJS', count: 198000 },
    { tag: 'NodeJS', count: 156000 },
    { tag: 'Python', count: 287000 },
    { tag: 'MachineLearning', count: 178000 },
    { tag: 'DevOps', count: 92000 }
  ];

  constructor(private postService: PostService) {}

  get searchQuery(): string {
    return this.searchQuerySignal();
  }

  get searchResults(): SearchResult {
    return this.searchResultsSignal();
  }

  get isSearching(): boolean {
    return this.isSearchingSignal();
  }

  search(query: string): void {
    if (!query || query.trim().length === 0) {
      this.clearSearch();
      return;
    }

    this.isSearchingSignal.set(true);
    this.searchQuerySignal.set(query.trim());

    const normalizedQuery = query.toLowerCase().trim();

    // Search posts
    const allPosts = this.postService.posts();
    const matchingPosts = this.searchPosts(allPosts, normalizedQuery);

    // Search users
    const matchingUsers = this.mockUsers.filter(user =>
      user.name.toLowerCase().includes(normalizedQuery) ||
      user.username.toLowerCase().includes(normalizedQuery) ||
      (user.bio && user.bio.toLowerCase().includes(normalizedQuery))
    );

    // Search hashtags
    const matchingHashtags = this.mockHashtags.filter(hashtag =>
      hashtag.tag.toLowerCase().includes(normalizedQuery)
    );

    this.searchResultsSignal.set({
      posts: matchingPosts.slice(0, 10),
      users: matchingUsers.slice(0, 10),
      hashtags: matchingHashtags.slice(0, 10)
    });

    this.isSearchingSignal.set(false);
  }

  private searchPosts(posts: Post[], query: string): Post[] {
    const results: Post[] = [];

    for (const post of posts) {
      const contentMatch = post.content.toLowerCase().includes(query);
      const authorNameMatch = post.author.name.toLowerCase().includes(query);
      const authorUsernameMatch = post.author.username.toLowerCase().includes(query);

      if (contentMatch || authorNameMatch || authorUsernameMatch) {
        results.push(post);
      }

      // Search in replies
      if (post.repliesList) {
        const matchingReplies = this.searchPosts(post.repliesList, query);
        if (matchingReplies.length > 0) {
          // Add parent post if it has matching replies
          if (!results.find(p => p.id === post.id)) {
            results.push(post);
          }
        }
      }
    }

    return results;
  }

  clearSearch(): void {
    this.searchQuerySignal.set('');
    this.searchResultsSignal.set({ posts: [], users: [], hashtags: [] });
  }

  getTrendingHashtags(): SearchHashtag[] {
    return [...this.mockHashtags].sort((a, b) => b.count - a.count).slice(0, 5);
  }

  getSuggestedUsers(): SearchUser[] {
    return [...this.mockUsers].sort((a, b) => b.followers! - a.followers!).slice(0, 5);
  }
}
