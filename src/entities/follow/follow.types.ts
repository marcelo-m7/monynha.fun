export interface FollowStats {
  followersCount: number;
  followingCount: number;
}

export interface FollowUser {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  followedAt: string;
}
