export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          membership_plan: 'none' | 'day' | 'week' | 'month' | 'half_year' | 'year';
          membership_expires_at: string | null;
          image_usage: Json | null;
          is_admin: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          membership_plan?: 'none' | 'day' | 'week' | 'month' | 'half_year' | 'year';
          membership_expires_at?: string | null;
          image_usage?: Json | null;
          is_admin?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          membership_plan?: 'none' | 'day' | 'week' | 'month' | 'half_year' | 'year';
          membership_expires_at?: string | null;
          image_usage?: Json | null;
          is_admin?: boolean;
          created_at?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          user_id: string;
          idea: string;
          background: string | null;
          product_intro: Json | null;
          personas: Json | null;
          appearance_images: Json | null;
          cmf: Json | null;
          storyboard_images: Json | null;
          exploded_view_image: string | null;
          current_step: number;
          selected_appearance_index: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          idea: string;
          background?: string | null;
          product_intro?: Json | null;
          personas?: Json | null;
          appearance_images?: Json | null;
          cmf?: Json | null;
          storyboard_images?: Json | null;
          exploded_view_image?: string | null;
          current_step?: number;
          selected_appearance_index?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          idea?: string;
          background?: string | null;
          product_intro?: Json | null;
          personas?: Json | null;
          appearance_images?: Json | null;
          cmf?: Json | null;
          storyboard_images?: Json | null;
          exploded_view_image?: string | null;
          current_step?: number;
          selected_appearance_index?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      image_jobs: {
        Row: {
          id: string;
          project_id: string;
          step_key: 'appearance' | 'storyboard' | 'exploded_view';
          slot_index: number;
          prompt: string;
          provider: string;
          provider_job_id: string | null;
          status: 'queued' | 'processing' | 'completed' | 'failed';
          image_url: string | null;
          error_message: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          step_key: 'appearance' | 'storyboard' | 'exploded_view';
          slot_index?: number;
          prompt: string;
          provider?: string;
          provider_job_id?: string | null;
          status?: 'queued' | 'processing' | 'completed' | 'failed';
          image_url?: string | null;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          step_key?: 'appearance' | 'storyboard' | 'exploded_view';
          slot_index?: number;
          prompt?: string;
          provider?: string;
          provider_job_id?: string | null;
          status?: 'queued' | 'processing' | 'completed' | 'failed';
          image_url?: string | null;
          error_message?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      announcements: {
        Row: {
          id: string;
          title: string;
          content: string;
          created_by: string | null;
          is_published: boolean;
          published_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          content: string;
          created_by?: string | null;
          is_published?: boolean;
          published_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          content?: string;
          created_by?: string | null;
          is_published?: boolean;
          published_at?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      payment_orders: {
        Row: {
          id: string;
          order_no: string;
          user_id: string;
          plan: 'day' | 'week' | 'month' | 'half_year' | 'year';
          amount: number;
          status: 'pending' | 'paid' | 'failed' | 'closed' | 'paid_late';
          provider: string;
          provider_trade_no: string | null;
          provider_payload: Json | null;
          paid_at: string | null;
          expires_at: string | null;
          closed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          order_no: string;
          user_id: string;
          plan: 'day' | 'week' | 'month' | 'half_year' | 'year';
          amount: number;
          status?: 'pending' | 'paid' | 'failed' | 'closed' | 'paid_late';
          provider?: string;
          provider_trade_no?: string | null;
          provider_payload?: Json | null;
          paid_at?: string | null;
          expires_at?: string | null;
          closed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          order_no?: string;
          user_id?: string;
          plan?: 'day' | 'week' | 'month' | 'half_year' | 'year';
          amount?: number;
          status?: 'pending' | 'paid' | 'failed' | 'closed' | 'paid_late';
          provider?: string;
          provider_trade_no?: string | null;
          provider_payload?: Json | null;
          paid_at?: string | null;
          expires_at?: string | null;
          closed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      project_assets: {
        Row: {
          id: string;
          project_id: string;
          user_id: string;
          asset_type: 'appearance' | 'storyboard' | 'exploded_view';
          slot_index: number;
          storage_bucket: string;
          storage_path: string;
          public_url: string | null;
          source_url: string | null;
          source_provider: string | null;
          status: 'ready' | 'missing' | 'failed';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          user_id: string;
          asset_type: 'appearance' | 'storyboard' | 'exploded_view';
          slot_index?: number;
          storage_bucket: string;
          storage_path: string;
          public_url?: string | null;
          source_url?: string | null;
          source_provider?: string | null;
          status?: 'ready' | 'missing' | 'failed';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          user_id?: string;
          asset_type?: 'appearance' | 'storyboard' | 'exploded_view';
          slot_index?: number;
          storage_bucket?: string;
          storage_path?: string;
          public_url?: string | null;
          source_url?: string | null;
          source_provider?: string | null;
          status?: 'ready' | 'missing' | 'failed';
          created_at?: string;
          updated_at?: string;
        };
      };
      changelogs: {
        Row: {
          id: string;
          title: string;
          content: string;
          category: 'feature' | 'fix' | 'improvement' | 'other';
          version: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          content?: string;
          category?: 'feature' | 'fix' | 'improvement' | 'other';
          version?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          content?: string;
          category?: 'feature' | 'fix' | 'improvement' | 'other';
          version?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}