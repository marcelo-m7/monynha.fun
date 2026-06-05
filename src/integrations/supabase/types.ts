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
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          metadata: Json
          name: string
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          metadata?: Json
          name: string
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          metadata?: Json
          name?: string
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      editor_applications: {
        Row: {
          confirmation_error: string | null
          confirmation_provider_id: string | null
          confirmation_sent_at: string | null
          consent_privacy: boolean
          created_at: string
          email: string
          full_name: string
          id: string
          motivation: string | null
          portfolio_url: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source_page: string
          status: string
          updated_at: string
        }
        Insert: {
          confirmation_error?: string | null
          confirmation_provider_id?: string | null
          confirmation_sent_at?: string | null
          consent_privacy: boolean
          created_at?: string
          email: string
          full_name: string
          id?: string
          motivation?: string | null
          portfolio_url?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_page?: string
          status?: string
          updated_at?: string
        }
        Update: {
          confirmation_error?: string | null
          confirmation_provider_id?: string | null
          confirmation_sent_at?: string | null
          consent_privacy?: boolean
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          motivation?: string | null
          portfolio_url?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_page?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "editor_applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
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
          role: string
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
          role?: string
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
          role?: string
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
      video_analysis_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          metadata: Json
          provider: string
          provider_model: string | null
          started_at: string | null
          status: string
          submission_id: string | null
          updated_at: string
          video_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json
          provider?: string
          provider_model?: string | null
          started_at?: string | null
          status?: string
          submission_id?: string | null
          updated_at?: string
          video_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json
          provider?: string
          provider_model?: string | null
          started_at?: string | null
          status?: string
          submission_id?: string | null
          updated_at?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_analysis_jobs_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "video_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_analysis_jobs_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_submissions: {
        Row: {
          completed_at: string | null
          created_at: string
          duplicate_video_id: string | null
          error_message: string | null
          id: string
          metadata: Json
          processing_started_at: string | null
          recoverable: boolean
          status: string
          updated_at: string
          user_id: string
          video_id: string | null
          youtube_id: string
          youtube_url: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          duplicate_video_id?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json
          processing_started_at?: string | null
          recoverable?: boolean
          status?: string
          updated_at?: string
          user_id: string
          video_id?: string | null
          youtube_id: string
          youtube_url: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          duplicate_video_id?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json
          processing_started_at?: string | null
          recoverable?: boolean
          status?: string
          updated_at?: string
          user_id?: string
          video_id?: string | null
          youtube_id?: string
          youtube_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_submissions_duplicate_video_id_fkey"
            columns: ["duplicate_video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_submissions_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_transcripts: {
        Row: {
          confidence: number
          created_at: string
          error_message: string | null
          id: string
          language: string | null
          metadata: Json
          provider: string
          provider_model: string
          status: string
          summary: string | null
          transcript_text: string | null
          updated_at: string
          video_id: string
        }
        Insert: {
          confidence?: number
          created_at?: string
          error_message?: string | null
          id?: string
          language?: string | null
          metadata?: Json
          provider?: string
          provider_model: string
          status?: string
          summary?: string | null
          transcript_text?: string | null
          updated_at?: string
          video_id: string
        }
        Update: {
          confidence?: number
          created_at?: string
          error_message?: string | null
          id?: string
          language?: string | null
          metadata?: Json
          provider?: string
          provider_model?: string
          status?: string
          summary?: string | null
          transcript_text?: string | null
          updated_at?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_transcripts_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
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
      v_home_exhibition: {
        Row: {
          categories: Json
          curation_signals: Json
          facodi_highlights: Json
          featured_playlists: Json
          generated_at: string
          hero_videos: Json
          metrics: Json
        }
        Insert: {
          categories?: never
          curation_signals?: never
          facodi_highlights?: never
          featured_playlists?: never
          generated_at?: never
          hero_videos?: never
          metrics?: never
        }
        Update: {
          categories?: never
          curation_signals?: never
          facodi_highlights?: never
          featured_playlists?: never
          generated_at?: never
          hero_videos?: never
          metrics?: never
        }
        Relationships: []
      }
      v_video_exhibition: {
        Row: {
          id: string | null
          youtube_id: string | null
          title: string | null
          description: string | null
          channel_name: string | null
          duration_seconds: number | null
          thumbnail_url: string | null
          language: string | null
          category_id: string | null
          submitted_by: string | null
          view_count: number | null
          is_featured: boolean | null
          created_at: string | null
          updated_at: string | null
          favorites_count: number | null
          playlist_add_count: number | null
          category_name: string | null
          category_slug: string | null
          category_color: string | null
          submitted_by_username: string | null
          submitted_by_display_name: string | null
          submitted_by_avatar_url: string | null
          enrichment_optimized_title: string | null
          enrichment_short_summary: string | null
          enrichment_summary_description: string | null
          enrichment_cultural_relevance: string | null
          enrichment_semantic_tags: string[] | null
          enrichment_language: string | null
          playlist_count: number | null
          comment_count: number | null
          detected_language: string | null
          effective_language: string | null
          transcript_summary: string | null
          transcript_language: string | null
          transcript_status: string | null
        }
        Insert: {
          [key: string]: never
        }
        Update: {
          [key: string]: never
        }
        Relationships: []
      }
      v_playlist_exhibition: {
        Row: {
          id: string | null
          name: string | null
          slug: string | null
          description: string | null
          author_id: string | null
          thumbnail_url: string | null
          course_code: string | null
          unit_code: string | null
          language: string | null
          is_public: boolean | null
          is_ordered: boolean | null
          created_at: string | null
          updated_at: string | null
          video_count: number | null
          total_duration_seconds: number | null
          author_username: string | null
          author_display_name: string | null
          author_avatar_url: string | null
          collaborator_count: number | null
          preview_video_id: string | null
          preview_video_title: string | null
          preview_video_thumbnail_url: string | null
          preview_video_channel_name: string | null
          activity_at: string | null
        }
        Insert: {
          [key: string]: never
        }
        Update: {
          [key: string]: never
        }
        Relationships: []
      }
      v_course_playlist_summary: {
        Row: {
          course_code: string | null
          course_name: string | null
          playlists_total: number | null
          public_playlists_total: number | null
          learning_paths_total: number | null
          collections_total: number | null
          units_total: number | null
          empty_playlists_total: number | null
          videos_total: number | null
          total_duration_seconds: number | null
          first_playlist_created_at: string | null
          last_playlist_updated_at: string | null
          languages: string[] | null
          semesters: string[] | null
          playlists: Json | null
        }
        Insert: {
          [key: string]: never
        }
        Update: {
          [key: string]: never
        }
        Relationships: []
      }
      v_course_playlist_catalog: {
        Row: {
          playlist_id: string | null
          course_code: string | null
          course_name: string | null
          unit_code: string | null
          playlist_name: string | null
          playlist_slug: string | null
          playlist_description: string | null
          language: string | null
          is_public: boolean | null
          is_ordered: boolean | null
          video_count: number | null
          total_duration_seconds: number | null
          thumbnail_url: string | null
          author_id: string | null
          created_at: string | null
          updated_at: string | null
          semester_label: string | null
          video_range: string | null
          collaborators_count: number | null
          playlist_videos_rows: number | null
        }
        Insert: {
          [key: string]: never
        }
        Update: {
          [key: string]: never
        }
        Relationships: []
      }
    }
    Functions: {
      add_video_to_default_education_playlist: {
        Args: { p_video_id: string }
        Returns: string
      }
      current_profile_can_manage_facodi_playlist: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
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
      get_default_education_playlist_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      increment_video_view_count:
        | { Args: { p_video_id: string }; Returns: number }
        | {
            Args: { p_session_id?: string; p_video_id: string }
            Returns: number
          }
      is_facodi_playlist: {
        Args: {
          p_course_code: string
          p_is_ordered: boolean
          p_unit_code: string
        }
        Returns: boolean
      }
      is_education_assignment_playlist: {
        Args: {
          p_course_code: string
          p_is_ordered: boolean
          p_slug: string
          p_unit_code: string
        }
        Returns: boolean
      }
      list_education_playlists_for_assignment: {
        Args: { p_language?: string; p_limit?: number }
        Returns: {
          course_code: string | null
          description: string | null
          id: string
          is_ordered: boolean
          is_public: boolean
          language: string
          name: string
          unit_code: string | null
        }[]
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
      mark_video_submission_client_error: {
        Args: {
          p_error_code?: string
          p_error_message: string
          p_stage?: string
          p_submission_id: string
        }
        Returns: Database["public"]["Tables"]["video_submissions"]["Row"]
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
