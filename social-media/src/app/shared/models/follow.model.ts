export interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: Date;
}

export interface FollowUser {
  followId: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  isVerified?: boolean;
  isFollowingBack?: boolean;
}

export interface FollowCounts {
  followers: number;
  following: number;
}
