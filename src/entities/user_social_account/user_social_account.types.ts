// Manual type definition for user_social_accounts table (exists in database but missing from auto-generated types)
export interface UserSocialAccountRow {
  created_at: string | null;
  id: string;
  platform: string;
  updated_at: string | null;
  url: string;
  user_id: string;
}

export interface UserSocialAccountInsertRow {
  created_at?: string | null;
  id?: string;
  platform: string;
  updated_at?: string | null;
  url: string;
  user_id: string;
}

export interface UserSocialAccountUpdateRow {
  created_at?: string | null;
  id?: string;
  platform?: string;
  updated_at?: string | null;
  url?: string;
  user_id?: string;
}

export type UserSocialAccount = UserSocialAccountRow;
export type UserSocialAccountInsert = UserSocialAccountInsertRow;
export type UserSocialAccountUpdate = UserSocialAccountUpdateRow;
