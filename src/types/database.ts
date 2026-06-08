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
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          membership_plan?: 'none' | 'day' | 'week' | 'month' | 'half_year' | 'year';
          membership_expires_at?: string | null;
          image_usage?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          membership_plan?: 'none' | 'day' | 'week' | 'month' | 'half_year' | 'year';
          membership_expires_at?: string | null;
          image_usage?: Json | null;
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
          created_at?: string;
          updated_at?: string;
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