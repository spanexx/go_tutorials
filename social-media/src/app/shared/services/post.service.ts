import { Injectable, signal, computed } from '@angular/core';
import { BookmarkCollectionService } from './bookmark-collection.service';

export interface User {
  name: string;
  username: string;
  avatar: string;
}

export interface Post {
  id: number;
  author: User;
  content: string;
  timestamp: string;
  likes: number;
  replies: number;
  shares: number;
  image?: string;
  repliesList?: Post[];
  isLiked?: boolean;
  isSaved?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PostService {
  private readonly initialPosts: Post[] = [
    {
      id: 1,
      author: { name: 'Sarah Johnson', username: 'sarahjohnson', avatar: 'https://i.pravatar.cc/150?img=5' },
      content: 'Just launched my new portfolio website! Check it out and let me know what you think 🚀 Thanks @alexchen for the design review! #WebDevelopment #Portfolio #Coding',
      timestamp: '2h',
      likes: 243,
      replies: 45,
      shares: 12,
      image: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=500&h=300&fit=crop',
      isLiked: false,
      isSaved: false,
      repliesList: [
        {
          id: 11,
          author: { name: 'Alex Chen', username: 'alexchen', avatar: 'https://i.pravatar.cc/150?img=3' },
          content: 'This looks amazing! Love the clean design and smooth animations 🔥 Great work @sarahjohnson! #UIDesign',
          timestamp: '1h',
          likes: 42,
          replies: 0,
          shares: 0,
          isLiked: false,
          isSaved: false,
          repliesList: [
            {
              id: 111,
              author: { name: 'Sarah Johnson', username: 'sarahjohnson', avatar: 'https://i.pravatar.cc/150?img=5' },
              content: 'Thanks Alex! Really appreciate it ❤️',
              timestamp: '45m',
              likes: 12,
              replies: 0,
              shares: 0,
              isLiked: false,
              isSaved: false
            }
          ]
        },
        {
          id: 12,
          author: { name: 'Emma Davis', username: 'emmadavis', avatar: 'https://i.pravatar.cc/150?img=7' },
          content: 'The color palette is perfect! What framework did you use? @sarahjohnson',
          timestamp: '30m',
          likes: 18,
          replies: 0,
          shares: 0,
          isLiked: false,
          isSaved: false
        }
      ]
    },
    {
      id: 2,
      author: { name: 'Marcus Williams', username: 'marcuswilliams', avatar: 'https://i.pravatar.cc/150?img=12' },
      content: 'Hot take: TypeScript makes you a better developer, even if you\'re working on small projects. The type safety catches bugs before they happen. What do you think @jakethompson? #TypeScript #JavaScript #WebDevelopment',
      timestamp: '4h',
      likes: 512,
      replies: 87,
      shares: 34,
      isLiked: false,
      isSaved: false,
      repliesList: [
        {
          id: 21,
          author: { name: 'Lisa Rodriguez', username: 'lisarodriguez', avatar: 'https://i.pravatar.cc/150?img=11' },
          content: '100% agree! The initial setup time pays off exponentially #TypeScript',
          timestamp: '3h',
          likes: 67,
          replies: 0,
          shares: 0,
          isLiked: false,
          isSaved: false
        },
        {
          id: 22,
          author: { name: 'Jake Thompson', username: 'jakethompson', avatar: 'https://i.pravatar.cc/150?img=8' },
          content: 'Disagree. It adds unnecessary complexity for simple scripts and prototypes. #JavaScript',
          timestamp: '2h',
          likes: 23,
          replies: 0,
          shares: 0,
          isLiked: false,
          isSaved: false,
          repliesList: [
            {
              id: 221,
              author: { name: 'Marcus Williams', username: 'marcuswilliams', avatar: 'https://i.pravatar.cc/150?img=12' },
              content: 'Fair point, but I think the discipline it builds is valuable regardless of project size #Coding',
              timestamp: '1h',
              likes: 45,
              replies: 0,
              shares: 0,
              isLiked: false,
              isSaved: false
            }
          ]
        }
      ]
    },
    {
      id: 3,
      author: { name: 'Nina Patel', username: 'ninapatel', avatar: 'https://i.pravatar.cc/150?img=9' },
      content: 'Just finished a 30-day coding challenge! Built 30 small projects in 30 days. Here\'s what I learned:\n\n1. Consistency > Intensity\n2. Small wins compound\n3. Community support is everything\n\nThank you all for the encouragement! Special thanks to @emmadavis and @michaelchen for the support 🙏 #Coding #WebDevelopment #Challenge',
      timestamp: '6h',
      likes: 891,
      replies: 156,
      shares: 203,
      isLiked: false,
      isSaved: false
    }
  ];

  private postsSignal = signal<Post[]>([...this.initialPosts]);

  posts = this.postsSignal.asReadonly();

  savedPosts = computed(() => this.postsSignal().filter(post => post.isSaved));

  toggleLike(postId: number): void {
    this.postsSignal.update(posts => {
      const updatedPosts = [...posts];
      const post = this.findPostById(updatedPosts, postId);
      if (post) {
        post.isLiked = !post.isLiked;
        post.likes += post.isLiked ? 1 : -1;
      }
      return updatedPosts;
    });
  }

  toggleSave(postId: number, collectionId?: string): void {
    const isCurrentlySaved = this.postsSignal().some(p => p.id === postId && p.isSaved);
    
    this.postsSignal.update(posts => {
      const updatedPosts = [...posts];
      const post = this.findPostById(updatedPosts, postId);
      if (post) {
        post.isSaved = !post.isSaved;
      }
      return updatedPosts;
    });

    // Also update bookmark collections
    if (!isCurrentlySaved) {
      // Saving - add to collection
      // In a real app, we'd inject BookmarkCollectionService here
      // For now, the collection service handles this separately
    } else {
      // Unsaving - remove from all collections
    }
  }

  addPost(content: string, image?: string): void {
    const newPost: Post = {
      id: Date.now(),
      author: {
        name: 'Current User',
        username: 'currentuser',
        avatar: 'https://i.pravatar.cc/150?img=1'
      },
      content,
      timestamp: 'now',
      likes: 0,
      replies: 0,
      shares: 0,
      image,
      isLiked: false,
      isSaved: false
    };

    this.postsSignal.update(posts => [newPost, ...posts]);
  }

  getPostById(postId: number): Post | undefined {
    return this.findPostById(this.postsSignal(), postId);
  }

  private findPostById(posts: Post[], postId: number): Post | undefined {
    for (const post of posts) {
      if (post.id === postId) {
        return post;
      }
      if (post.repliesList) {
        const found = this.findPostById(post.repliesList, postId);
        if (found) {
          return found;
        }
      }
    }
    return undefined;
  }

  getSavedPosts(): Post[] {
    return this.savedPosts();
  }

  updateReplyCount(postId: number, count: number): void {
    this.postsSignal.update(posts => {
      const updateNested = (posts: Post[]): Post[] => {
        return posts.map(post => {
          if (post.id === postId) {
            return { ...post, replies: count };
          }
          if (post.repliesList) {
            return {
              ...post,
              repliesList: updateNested(post.repliesList)
            };
          }
          return post;
        });
      };
      return updateNested(posts);
    });
  }
}
