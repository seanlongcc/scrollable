export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          display_name?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      feed_configs: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          subreddit: string;
          sort: "top" | "hot" | "new";
          time_range: "hour" | "day" | "week" | "month" | "year" | "all";
          limit_count: number;
          skip_count: number;
          timer_seconds: number;
          display_options: Json;
          is_nsfw: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string;
          name: string;
          subreddit: string;
          sort?: "top" | "hot" | "new";
          time_range?: "hour" | "day" | "week" | "month" | "year" | "all";
          limit_count?: number;
          skip_count?: number;
          timer_seconds?: number;
          display_options?: Json;
          is_nsfw?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["feed_configs"]["Insert"]>;
        Relationships: [];
      };
      collections: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          description: string | null;
          is_nsfw: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string;
          name: string;
          description?: string | null;
          is_nsfw?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["collections"]["Insert"]>;
        Relationships: [];
      };
      collection_items: {
        Row: {
          id: string;
          collection_id: string;
          feed_config_id: string;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          collection_id: string;
          feed_config_id: string;
          position: number;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["collection_items"]["Insert"]
        >;
        Relationships: [];
      };
      tags: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string;
          name: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["tags"]["Insert"]>;
        Relationships: [];
      };
      collection_tags: {
        Row: {
          collection_id: string;
          tag_id: string;
          created_at: string;
        };
        Insert: {
          collection_id: string;
          tag_id: string;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["collection_tags"]["Insert"]
        >;
        Relationships: [];
      };
      share_links: {
        Row: {
          id: string;
          owner_id: string;
          slug: string;
          feed_config_id: string | null;
          collection_id: string | null;
          is_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string;
          slug: string;
          feed_config_id?: string | null;
          collection_id?: string | null;
          is_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["share_links"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
