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
      audit_logs: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          new_value: Json | null
          old_value: Json | null
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          new_value?: Json | null
          old_value?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          new_value?: Json | null
          old_value?: Json | null
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      cloudflare_streams: {
        Row: {
          created_at: string
          duration: number | null
          event_id: number | null
          id: number
          live_input_uid: string | null
          playback_url: string | null
          preview_url: string | null
          raw_payload: Json
          status: string | null
          thumbnail_url: string | null
          title: string
          uid: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration?: number | null
          event_id?: number | null
          id?: number
          live_input_uid?: string | null
          playback_url?: string | null
          preview_url?: string | null
          raw_payload?: Json
          status?: string | null
          thumbnail_url?: string | null
          title?: string
          uid: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration?: number | null
          event_id?: number | null
          id?: number
          live_input_uid?: string | null
          playback_url?: string | null
          preview_url?: string | null
          raw_payload?: Json
          status?: string | null
          thumbnail_url?: string | null
          title?: string
          uid?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cloudflare_streams_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cloudflare_streams_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          created_at: string | null
          id: number
          post_id: number
          text: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          post_id: number
          text: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: number
          post_id?: number
          text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: number
          participant1_id: string
          participant2_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: number
          participant1_id: string
          participant2_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: number
          participant1_id?: string
          participant2_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_participant1_id_fkey"
            columns: ["participant1_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_participant2_id_fkey"
            columns: ["participant2_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          attendees: number | null
          category: string
          city: string | null
          created_at: string | null
          date: string
          description: string | null
          event_highlights: Json | null
          id: number
          image_url: string | null
          location: string
          organizer_id: string
          price: string | null
          price_range: string | null
          status: string | null
          streaming: Json | null
          subcategory: string | null
          ticket_tiers: Json | null
          time: string | null
          title: string
          updated_at: string
          views: number | null
        }
        Insert: {
          attendees?: number | null
          category: string
          city?: string | null
          created_at?: string | null
          date: string
          description?: string | null
          event_highlights?: Json | null
          id?: number
          image_url?: string | null
          location: string
          organizer_id: string
          price?: string | null
          price_range?: string | null
          status?: string | null
          streaming?: Json | null
          subcategory?: string | null
          ticket_tiers?: Json | null
          time?: string | null
          title: string
          updated_at?: string
          views?: number | null
        }
        Update: {
          attendees?: number | null
          category?: string
          city?: string | null
          created_at?: string | null
          date?: string
          description?: string | null
          event_highlights?: Json | null
          id?: number
          image_url?: string | null
          location?: string
          organizer_id?: string
          price?: string | null
          price_range?: string | null
          status?: string | null
          streaming?: Json | null
          subcategory?: string | null
          ticket_tiers?: Json | null
          time?: string | null
          title?: string
          updated_at?: string
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "events_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          created_at: string | null
          description: string | null
          enabled: boolean | null
          id: string
          key: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          id?: string
          key: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          enabled?: boolean | null
          id?: string
          key?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: number
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: number
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: number
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      likes: {
        Row: {
          created_at: string | null
          id: number
          post_id: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          post_id: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: number
          post_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: number
          created_at: string
          id: number
          is_read: boolean | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: number
          created_at?: string
          id?: number
          is_read?: boolean | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: number
          created_at?: string
          id?: number
          is_read?: boolean | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
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
          id: number
          message: string
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string | null
          id?: number
          message: string
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string | null
          id?: number
          message?: string
          read?: boolean | null
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
      organizer_profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          contact_email: string | null
          cover_url: string | null
          created_at: string | null
          description: string | null
          id: string
          location: string | null
          organizer_avatar_url: string | null
          organizer_name: string | null
          organizer_type: string | null
          phone: string | null
          social_links: Json | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          contact_email?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          id: string
          location?: string | null
          organizer_avatar_url?: string | null
          organizer_name?: string | null
          organizer_type?: string | null
          phone?: string | null
          social_links?: Json | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          contact_email?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          location?: string | null
          organizer_avatar_url?: string | null
          organizer_name?: string | null
          organizer_type?: string | null
          phone?: string | null
          social_links?: Json | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      post_comments: {
        Row: {
          created_at: string
          id: number
          post_id: number
          text: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          post_id: number
          text: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: number
          post_id?: number
          text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: number
          post_id: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          post_id: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: number
          post_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          content: string | null
          created_at: string | null
          duration: string | null
          event_id: number | null
          hashtags: string[] | null
          id: number
          image_urls: string[] | null
          posted_as_organizer: boolean | null
          user_id: string
          video_url: string | null
          views: number | null
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          duration?: string | null
          event_id?: number | null
          hashtags?: string[] | null
          id?: number
          image_urls?: string[] | null
          posted_as_organizer?: boolean | null
          user_id: string
          video_url?: string | null
          views?: number | null
        }
        Update: {
          content?: string | null
          created_at?: string | null
          duration?: string | null
          event_id?: number | null
          hashtags?: string[] | null
          id?: number
          image_urls?: string[] | null
          posted_as_organizer?: boolean | null
          user_id?: string
          video_url?: string | null
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          birthdate: string | null
          contact_email: string | null
          cover_url: string | null
          created_at: string | null
          description: string | null
          email: string | null
          full_name: string | null
          id: string
          is_organizer: boolean | null
          last_notification_read_at: string | null
          location: string | null
          organizer_type: string | null
          phone: string | null
          preferences: Json | null
          social_links: Json | null
          updated_at: string | null
          username: string | null
          verified: boolean | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          birthdate?: string | null
          contact_email?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          is_organizer?: boolean | null
          last_notification_read_at?: string | null
          location?: string | null
          organizer_type?: string | null
          phone?: string | null
          preferences?: Json | null
          social_links?: Json | null
          updated_at?: string | null
          username?: string | null
          verified?: boolean | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          birthdate?: string | null
          contact_email?: string | null
          cover_url?: string | null
          created_at?: string | null
          description?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_organizer?: boolean | null
          last_notification_read_at?: string | null
          location?: string | null
          organizer_type?: string | null
          phone?: string | null
          preferences?: Json | null
          social_links?: Json | null
          updated_at?: string | null
          username?: string | null
          verified?: boolean | null
          website?: string | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          content_id: string
          content_type: string
          created_at: string | null
          details: string | null
          id: string
          reason: string
          reported_user_id: string | null
          reporter_id: string | null
          resolution_note: string | null
          resolved_by: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          content_id: string
          content_type: string
          created_at?: string | null
          details?: string | null
          id?: string
          reason: string
          reported_user_id?: string | null
          reporter_id?: string | null
          resolution_note?: string | null
          resolved_by?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          content_id?: string
          content_type?: string
          created_at?: string | null
          details?: string | null
          id?: string
          reason?: string
          reported_user_id?: string | null
          reporter_id?: string | null
          resolution_note?: string | null
          resolved_by?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_events: {
        Row: {
          created_at: string
          event_id: number
          id: number
          is_reminder: boolean | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: number
          id?: number
          is_reminder?: boolean | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: number
          id?: number
          is_reminder?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_events_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_posts: {
        Row: {
          created_at: string
          id: number
          post_id: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          post_id: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: number
          post_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_posts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stream_chat_messages: {
        Row: {
          created_at: string
          event_id: number
          id: number
          message: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: number
          id?: number
          message: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: number
          id?: number
          message?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stream_chat_messages_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stream_chat_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          barcode: string
          created_at: string | null
          customer_email: string
          customer_name: string
          event_id: number
          id: number
          price: string
          purchase_date: string
          qr_code: string | null
          scanned_at: string | null
          scanned_by: string | null
          status: string | null
          ticket_number: string
          ticket_type: string
          user_id: string
        }
        Insert: {
          barcode: string
          created_at?: string | null
          customer_email: string
          customer_name: string
          event_id: number
          id?: number
          price: string
          purchase_date?: string
          qr_code?: string | null
          scanned_at?: string | null
          scanned_by?: string | null
          status?: string | null
          ticket_number: string
          ticket_type: string
          user_id: string
        }
        Update: {
          barcode?: string
          created_at?: string | null
          customer_email?: string
          customer_name?: string
          event_id?: number
          id?: number
          price?: string
          purchase_date?: string
          qr_code?: string | null
          scanned_at?: string | null
          scanned_by?: string | null
          status?: string | null
          ticket_number?: string
          ticket_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          event_id: number | null
          id: number
          metadata: Json | null
          provider: string
          provider_transaction_id: string | null
          status: string | null
          ticket_id: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          event_id?: number | null
          id?: number
          metadata?: Json | null
          provider: string
          provider_transaction_id?: string | null
          status?: string | null
          ticket_id?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          event_id?: number | null
          id?: number
          metadata?: Json | null
          provider?: string
          provider_transaction_id?: string | null
          status?: string | null
          ticket_id?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_media: {
        Row: {
          caption: string | null
          created_at: string
          duration: string | null
          id: number
          likes: number | null
          media_type: string
          thumbnail_url: string | null
          url: string
          user_id: string
          views: number | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          duration?: string | null
          id?: number
          likes?: number | null
          media_type: string
          thumbnail_url?: string | null
          url: string
          user_id: string
          views?: number | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          duration?: string | null
          id?: number
          likes?: number | null
          media_type?: string
          thumbnail_url?: string | null
          url?: string
          user_id?: string
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_media_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      become_organizer: {
        Args: {
          p_avatar_url: string
          p_bio: string
          p_contact_email?: string
          p_full_name: string
          p_location: string
          p_organizer_type: string
          p_username: string
        }
        Returns: Json
      }
      delete_event_complete: {
        Args: { target_event_id: number }
        Returns: undefined
      }
      downgrade_to_personal_account: { Args: never; Returns: undefined }
      get_event_analytics: { Args: { target_event_id: number }; Returns: Json }
      get_organizer_stats: { Args: { target_user_id: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_event_view: { Args: { event_id: number }; Returns: undefined }
      increment_media_view: { Args: { media_id: number }; Returns: undefined }
      increment_post_view: { Args: { post_id: number }; Returns: undefined }
      purchase_ticket:
        | {
            Args: {
              p_customer_email: string
              p_customer_name: string
              p_event_id: number
              p_price?: string
              p_qr_code: string
              p_ticket_number: string
              p_ticket_type: string
              p_user_id?: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_customer_email: string
              p_customer_name: string
              p_event_id: number
              p_price?: string
              p_qr_code: string
              p_ticket_number: string
              p_ticket_type: string
              p_transaction_id?: number
              p_user_id?: string
            }
            Returns: Json
          }
      scan_ticket: {
        Args: { p_event_id: number; p_ticket_code: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
    Enums: {
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
