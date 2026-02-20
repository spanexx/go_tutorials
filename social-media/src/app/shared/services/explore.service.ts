import { Injectable, signal } from '@angular/core';

export interface TrendingTopic {
  id: number;
  title: string;
  category: string;
  posts: number;
  image?: string;
  gradient: string;
}

export interface ExploreCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface SuggestedUser {
  username: string;
  name: string;
  avatar: string;
  bio: string;
  followers: number;
  isFollowing: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ExploreService {
  private categoriesData: ExploreCategory[] = [
    { id: 'all', name: 'All', icon: '🌐', color: '#6366f1' },
    { id: 'technology', name: 'Technology', icon: '💻', color: '#3b82f6' },
    { id: 'design', name: 'Design', icon: '🎨', color: '#ec4899' },
    { id: 'development', name: 'Development', icon: '⚡', color: '#8b5cf6' },
    { id: 'business', name: 'Business', icon: '📈', color: '#10b981' },
    { id: 'lifestyle', name: 'Lifestyle', icon: '✨', color: '#f59e0b' }
  ];

  private trendingTopicsData: TrendingTopic[] = [
    { id: 1, title: 'WebDevelopment', category: 'development', posts: 145200, gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
    { id: 2, title: 'UIDesign', category: 'design', posts: 89300, gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
    { id: 3, title: 'TypeScript', category: 'development', posts: 112500, gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
    { id: 4, title: 'Angular', category: 'development', posts: 67800, gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' },
    { id: 5, title: 'StartupLife', category: 'business', posts: 54200, gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' },
    { id: 6, title: 'TechNews', category: 'technology', posts: 198400, gradient: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)' },
    { id: 7, title: 'Coding', category: 'development', posts: 234100, gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)' },
    { id: 8, title: 'ProductDesign', category: 'design', posts: 76500, gradient: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)' },
    { id: 9, title: 'JavaScript', category: 'development', posts: 287600, gradient: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)' },
    { id: 10, title: 'RemoteWork', category: 'lifestyle', posts: 92300, gradient: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)' },
    { id: 11, title: 'AI', category: 'technology', posts: 312400, gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
    { id: 12, title: 'DevOps', category: 'development', posts: 45600, gradient: 'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)' }
  ];

  private suggestedUsersData: SuggestedUser[] = [
    {
      username: 'sarahjohnson',
      name: 'Sarah Johnson',
      avatar: 'https://i.pravatar.cc/150?img=5',
      bio: 'Frontend Developer | UI/UX Enthusiast',
      followers: 12500,
      isFollowing: false
    },
    {
      username: 'alexchen',
      name: 'Alex Chen',
      avatar: 'https://i.pravatar.cc/150?img=3',
      bio: 'Full Stack Developer | Open Source Contributor',
      followers: 8900,
      isFollowing: false
    },
    {
      username: 'marcuswilliams',
      name: 'Marcus Williams',
      avatar: 'https://i.pravatar.cc/150?img=12',
      bio: 'Tech Writer | TypeScript Advocate',
      followers: 15300,
      isFollowing: false
    },
    {
      username: 'emmadavis',
      name: 'Emma Davis',
      avatar: 'https://i.pravatar.cc/150?img=7',
      bio: 'Product Designer | Creative Thinker',
      followers: 6700,
      isFollowing: false
    },
    {
      username: 'ninapatel',
      name: 'Nina Patel',
      avatar: 'https://i.pravatar.cc/150?img=9',
      bio: 'Software Engineer | AI Enthusiast',
      followers: 21000,
      isFollowing: false
    }
  ];

  categoriesSignal = signal<ExploreCategory[]>(this.categoriesData);
  trendingTopicsSignal = signal<TrendingTopic[]>(this.trendingTopicsData);
  suggestedUsersSignal = signal<SuggestedUser[]>(this.suggestedUsersData);

  get categories(): ExploreCategory[] {
    return this.categoriesSignal();
  }

  get trendingTopics(): TrendingTopic[] {
    return this.trendingTopicsSignal();
  }

  get suggestedUsers(): SuggestedUser[] {
    return this.suggestedUsersSignal();
  }

  getTrendingByCategory(category: string): TrendingTopic[] {
    if (category === 'all') {
      return this.trendingTopicsData;
    }
    return this.trendingTopicsData.filter(topic => topic.category === category);
  }

  getTopTrending(limit: number = 6): TrendingTopic[] {
    return [...this.trendingTopicsData]
      .sort((a, b) => b.posts - a.posts)
      .slice(0, limit);
  }

  toggleFollow(username: string): void {
    this.suggestedUsersSignal.update(users =>
      users.map(user =>
        user.username === username
          ? { ...user, isFollowing: !user.isFollowing }
          : user
      )
    );
  }

  isFollowing(username: string): boolean {
    const user = this.suggestedUsersSignal().find(u => u.username === username);
    return user?.isFollowing || false;
  }

  searchTopics(query: string): TrendingTopic[] {
    const normalizedQuery = query.toLowerCase();
    return this.trendingTopicsData.filter(topic =>
      topic.title.toLowerCase().includes(normalizedQuery) ||
      topic.category.toLowerCase().includes(normalizedQuery)
    );
  }
}
