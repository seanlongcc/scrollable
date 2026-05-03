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
          is_admin: boolean;
          cloud_quota_bytes: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          is_admin?: boolean;
          cloud_quota_bytes?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          display_name?: string | null;
          is_admin?: boolean;
          cloud_quota_bytes?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      feed_configs: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          post_urls: string[];
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
          post_urls: string[];
          timer_seconds?: number;
          display_options?: Json;
          is_nsfw?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["feed_configs"]["Insert"]>;
        Relationships: [];
      };
      share_links: {
        Row: {
          id: string;
          owner_id: string;
          slug: string;
          feed_config_id: string | null;
          viewer_session_id: string | null;
          viewer_template_id: string | null;
          is_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string;
          slug: string;
          feed_config_id?: string | null;
          viewer_session_id?: string | null;
          viewer_template_id?: string | null;
          is_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["share_links"]["Insert"]>;
        Relationships: [];
      };
      viewer_sessions: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          layers: Json;
          active_layer_id: string;
          layout_mode: "fixed" | "free";
          fixed_columns: number;
          fixed_rows: number;
          global_timer_seconds: number;
          sessions: Json;
          template_slots: Json;
          metadata_bytes: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string;
          name: string;
          layers?: Json;
          active_layer_id?: string;
          layout_mode?: "fixed" | "free";
          fixed_columns?: number;
          fixed_rows?: number;
          global_timer_seconds?: number;
          sessions?: Json;
          template_slots?: Json;
          metadata_bytes?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["viewer_sessions"]["Insert"]
        >;
        Relationships: [];
      };
      viewer_templates: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          layers: Json;
          active_layer_id: string;
          global_timer_seconds: number;
          slots: Json;
          metadata_bytes: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string;
          name: string;
          layers?: Json;
          active_layer_id?: string;
          global_timer_seconds?: number;
          slots?: Json;
          metadata_bytes?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["viewer_templates"]["Insert"]
        >;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
