import { Injectable, signal } from '@angular/core';
import { PostService } from './post.service';

export interface Reply {
  id: number;
  author: {
    name: string;
    username: string;
    avatar: string;
  };
  content: string;
  timestamp: string;
  likes: number;
  replies: number;
  shares: number;
  isLiked: boolean;
  isSaved: boolean;
  repliesList?: Reply[];
}

@Injectable({
  providedIn: 'root'
})
export class ReplyService {
  private repliesSignal = signal<Map<number, Reply[]>>(new Map());
  replies = this.repliesSignal.asReadonly();

  constructor(private postService: PostService) {}

  getReplies(postId: number): Reply[] {
    return this.repliesSignal().get(postId) || [];
  }

  getReplyCount(postId: number): number {
    const replies = this.getReplies(postId);
    return this.countAllReplies(replies);
  }

  private countAllReplies(replies: Reply[]): number {
    let count = replies.length;
    replies.forEach(reply => {
      if (reply.repliesList) {
        count += this.countAllReplies(reply.repliesList);
      }
    });
    return count;
  }

  addReply(postId: number, content: string, parentReplyId?: number): Reply {
    const currentUser = {
      name: 'Current User',
      username: 'currentuser',
      avatar: 'https://i.pravatar.cc/150?img=1'
    };

    const newReply: Reply = {
      id: Date.now(),
      author: currentUser,
      content,
      timestamp: 'now',
      likes: 0,
      replies: 0,
      shares: 0,
      isLiked: false,
      isSaved: false,
      repliesList: []
    };

    this.repliesSignal.update(map => {
      const newMap = new Map(map);
      const existingReplies = newMap.get(postId) || [];

      if (parentReplyId) {
        // Add as nested reply
        const addNestedReply = (replies: Reply[]): Reply[] => {
          return replies.map(reply => {
            if (reply.id === parentReplyId) {
              return {
                ...reply,
                replies: reply.replies + 1,
                repliesList: addNestedReply(reply.repliesList || []).concat(newReply)
              };
            }
            if (reply.repliesList) {
              return {
                ...reply,
                repliesList: addNestedReply(reply.repliesList)
              };
            }
            return reply;
          });
        };
        newMap.set(postId, addNestedReply(existingReplies));
      } else {
        // Add as top-level reply
        newMap.set(postId, [...existingReplies, newReply]);
      }

      return newMap;
    });

    // Update post reply count
    this.postService.updateReplyCount(postId, this.getReplyCount(postId));

    return newReply;
  }

  toggleLike(postId: number, replyId: number): void {
    this.repliesSignal.update(map => {
      const newMap = new Map(map);
      const replies = newMap.get(postId) || [];

      const toggleNestedLike = (replies: Reply[]): Reply[] => {
        return replies.map(reply => {
          if (reply.id === replyId) {
            return {
              ...reply,
              isLiked: !reply.isLiked,
              likes: reply.isLiked ? reply.likes - 1 : reply.likes + 1
            };
          }
          if (reply.repliesList) {
            return {
              ...reply,
              repliesList: toggleNestedLike(reply.repliesList)
            };
          }
          return reply;
        });
      };

      newMap.set(postId, toggleNestedLike(replies));
      return newMap;
    });
  }

  deleteReply(postId: number, replyId: number): void {
    this.repliesSignal.update(map => {
      const newMap = new Map(map);
      const replies = newMap.get(postId) || [];

      const deleteNestedReply = (replies: Reply[]): Reply[] => {
        return replies
          .filter(reply => reply.id !== replyId)
          .map(reply => {
            if (reply.repliesList) {
              return {
                ...reply,
                repliesList: deleteNestedReply(reply.repliesList)
              };
            }
            return reply;
          });
      };

      newMap.set(postId, deleteNestedReply(replies));
      return newMap;
    });

    // Update post reply count
    this.postService.updateReplyCount(postId, this.getReplyCount(postId));
  }

  getReplyById(postId: number, replyId: number): Reply | undefined {
    const replies = this.getReplies(postId);
    
    const findNested = (replies: Reply[]): Reply | undefined => {
      for (const reply of replies) {
        if (reply.id === replyId) {
          return reply;
        }
        if (reply.repliesList) {
          const found = findNested(reply.repliesList);
          if (found) return found;
        }
      }
      return undefined;
    };

    return findNested(replies);
  }
}
