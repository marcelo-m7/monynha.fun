export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_enrichments: {
        Row: {
          created_at: string | null
          cultural_relevance: string | null
          id: string
          language: string | null
          optimized_title: string | null
          reprocessed_at: string | null
          semantic_tags: string[] | null
          short_summary: string | null
          suggested_category_id: string | null
          summary_description: string | null
          video_id: string
        }
        Insert: {
          created_at?: string | null
          cultural_relevance?: string | null
          id?: string
          language?: string | null
          optimized_title?: string | null
          reprocessed_at?: string | null
          semantic_tags?: string[] | null
          short_summary?: string | null
          suggested_category_id?: string | null
          summary_description?: string | null
          video_id: string
        }
        Update: {
          created_at?: string | null
          cultural_relevance?: string | null
          id?: string
          language?: string | null
          optimized_title?: string | null
          reprocessed_at?: string | null
          semantic_tags?: string[] | null
          short_summary?: string | null
          suggested_category_id?: string | null
          summary_description?: string | null
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_enrichments_suggested_category_id_fkey"
            columns: ["suggested_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_enrichments_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          color: string
          created_at: string
          icon: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
          video_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
          video_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      direct_messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_read: boolean | null
          read_at: string | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          read_at?: string | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          read_at?: string | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "direct_messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "direct_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      playlist_collaborators: {
        Row: {
          id: string
          invited_at: string | null
          playlist_id: string
          role: string
          user_id: string
        }
        Insert: {
          id?: string
          invited_at?: string | null
          playlist_id: string
          role?: string
          user_id: string
        }
        Update: {
          id?: string
          invited_at?: string | null
          playlist_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "playlist_collaborators_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      playlist_progress: {
        Row: {
          created_at: string | null
          id: string
          last_position_seconds: number | null
          playlist_id: string
          updated_at: string | null
          user_id: string
          video_id: string
          watched: boolean
          watched_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_position_seconds?: number | null
          playlist_id: string
          updated_at?: string | null
          user_id: string
          video_id: string
          watched?: boolean
          watched_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          last_position_seconds?: number | null
          playlist_id?: string
          updated_at?: string | null
          user_id?: string
          video_id?: string
          watched?: boolean
          watched_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "playlist_progress_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playlist_progress_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      playlist_videos: {
        Row: {
          added_by: string | null
          created_at: string | null
          id: string
          notes: string | null
          playlist_id: string
          position: number
          video_id: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          playlist_id: string
          position?: number
          video_id: string
        }
        Update: {
          added_by?: string | null
          created_at?: string | null
          id?: string
          notes?: string | null
          playlist_id?: string
          position?: number
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "playlist_videos_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "playlist_videos_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      playlists: {
        Row: {
          author_id: string
          course_code: string | null
          created_at: string | null
          description: string | null
          id: string
          is_ordered: boolean
          is_public: boolean
          language: string
          name: string
          slug: string
          thumbnail_url: string | null
          total_duration_seconds: number | null
          unit_code: string | null
          updated_at: string | null
          video_count: number | null
        }
        Insert: {
          author_id: string
          course_code?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_ordered?: boolean
          is_public?: boolean
          language?: string
          name: string
          slug: string
          thumbnail_url?: string | null
          total_duration_seconds?: number | null
          unit_code?: string | null
          updated_at?: string | null
          video_count?: number | null
        }
        Update: {
          author_id?: string
          course_code?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_ordered?: boolean
          is_public?: boolean
          language?: string
          name?: string
          slug?: string
          thumbnail_url?: string | null
          total_duration_seconds?: number | null
          unit_code?: string | null
          updated_at?: string | null
          video_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "playlists_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actor_id: string | null
          created_at: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          is_read: boolean | null
          message: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_path: string | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          submissions_count: number
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_path?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          submissions_count?: number
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_path?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          submissions_count?: number
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      user_follows: {
        Row: {
          created_at: string | null
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string | null
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string | null
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_social_accounts: {
        Row: {
          created_at: string | null
          id: string
          platform: string
          updated_at: string | null
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          platform: string
          updated_at?: string | null
          url: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          platform?: string
          updated_at?: string | null
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      video_view_events: {
        Row: {
          created_at: string
          id: string
          session_id: string | null
          user_id: string | null
          video_id: string
          viewed_on: string
        }
        Insert: {
          created_at?: string
          id?: string
          session_id?: string | null
          user_id?: string | null
          video_id: string
          viewed_on?: string
        }
        Update: {
          created_at?: string
          id?: string
          session_id?: string | null
          user_id?: string | null
          video_id?: string
          viewed_on?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_view_events_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          category_id: string | null
          channel_name: string
          created_at: string
          description: string | null
          duration_seconds: number | null
          favorites_count: number
          id: string
          is_featured: boolean
          language: string
          playlist_add_count: number
          submitted_by: string | null
          thumbnail_url: string
          title: string
          updated_at: string
          view_count: number
          youtube_id: string
        }
        Insert: {
          category_id?: string | null
          channel_name: string
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          favorites_count?: number
          id?: string
          is_featured?: boolean
          language?: string
          playlist_add_count?: number
          submitted_by?: string | null
          thumbnail_url: string
          title: string
          updated_at?: string
          view_count?: number
          youtube_id: string
        }
        Update: {
          category_id?: string | null
          channel_name?: string
          created_at?: string
          description?: string | null
          duration_seconds?: number | null
          favorites_count?: number
          id?: string
          is_featured?: boolean
          language?: string
          playlist_add_count?: number
          submitted_by?: string | null
          thumbnail_url?: string
          title?: string
          updated_at?: string
          view_count?: number
          youtube_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "videos_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "videos_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      follow_by_username_secure: {
        Args: { p_target_username: string }
        Returns: string
      }
      get_conversation_by_username_secure: {
        Args: { p_other_username: string }
        Returns: {
          content: string
          created_at: string
          id: string
          is_mine: boolean
          is_read: boolean
          receiver_avatar_url: string | null
          receiver_display_name: string | null
          receiver_username: string | null
          sender_avatar_url: string | null
          sender_display_name: string | null
          sender_username: string | null
        }[]
      }
      get_follow_stats_by_username_secure: {
        Args: { p_target_username: string }
        Returns: {
          followers_count: number
          following_count: number
        }[]
      }
      get_unread_messages_count_secure: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      get_unread_notifications_count_secure: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      increment_video_view_count:
        | { Args: { p_video_id: string }; Returns: number }
        | {
            Args: { p_session_id?: string; p_video_id: string }
            Returns: number
          }
      list_featured_videos: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          category: Json
          category_id: string
          channel_name: string
          created_at: string
          description: string
          duration_seconds: number
          favorites_count: number
          featured_score: number
          id: string
          is_featured: boolean
          language: string
          playlist_add_count: number
          submitted_by: string
          thumbnail_url: string
          title: string
          updated_at: string
          view_count: number
          youtube_id: string
        }[]
      }
      list_followers_by_username_secure: {
        Args: { p_target_username: string }
        Returns: {
          followed_at: string
          follower_avatar_url: string | null
          follower_display_name: string | null
          follower_username: string | null
        }[]
      }
      list_following_by_username_secure: {
        Args: { p_target_username: string }
        Returns: {
          followed_at: string
          following_avatar_url: string | null
          following_display_name: string | null
          following_username: string | null
        }[]
      }
      list_inbox_conversations_secure: {
        Args: Record<PropertyKey, never>
        Returns: {
          last_message_content: string
          last_message_created_at: string
          last_message_id: string
          last_message_is_read: boolean
          last_message_sender_username: string | null
          partner_avatar_url: string | null
          partner_display_name: string | null
          partner_username: string | null
          unread_count: number
        }[]
      }
      list_notifications_secure: {
        Args: { p_limit?: number }
        Returns: {
          actor_avatar_url: string | null
          actor_display_name: string | null
          actor_username: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          is_read: boolean
          message: string | null
          read_at: string | null
          title: string
          type: string
        }[]
      }
      mark_top_videos_as_featured: {
        Args: { p_limit?: number }
        Returns: number
      }
      mark_all_notifications_as_read_secure: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      mark_conversation_as_read_by_username_secure: {
        Args: { p_other_username: string }
        Returns: number
      }
      mark_notification_as_read_secure: {
        Args: { p_notification_id: string }
        Returns: boolean
      }
      playlist_accessible_to_user:
        | { Args: { p_playlist_id: string }; Returns: boolean }
        | {
            Args: { p_playlist_id: string; p_user_id: string }
            Returns: boolean
          }
      send_direct_message_by_username_secure: {
        Args: { p_content: string; p_receiver_username: string }
        Returns: {
          content: string
          created_at: string
          id: string
          is_mine: boolean
          is_read: boolean
          receiver_username: string | null
          sender_username: string | null
        }[]
      }
      unfollow_by_username_secure: {
        Args: { p_target_username: string }
        Returns: number
      }
      is_following_by_username_secure: {
        Args: { p_target_username: string }
        Returns: boolean
      }
      update_playlist_derived_fields: {
        Args: { p_playlist_id: string }
        Returns: undefined
      }
      update_playlist_thumbnail_from_first_video: {
        Args: { p_playlist_id: string }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
