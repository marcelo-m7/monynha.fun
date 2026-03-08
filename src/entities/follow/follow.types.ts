export interface FollowStats {
  followersCount: number;
  followingCount: number;
}

export interface FollowListItem {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  followed_at: string;
}
