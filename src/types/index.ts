export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  membership_plan: 'none' | 'day' | 'week' | 'month' | 'half_year' | 'year';
  membership_expires_at: string | null;
  image_usage: Record<string, number> | null;
  created_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  idea: string;
  background: string | null;
  product_intro: ProductIntro | null;
  personas: Persona[] | null;
  appearance_images: string[] | null;
  cmf: CMF | null;
  storyboard_images: StoryboardImage[] | null;
  exploded_view_image: string | null;
  current_step: number;
  created_at: string;
  updated_at: string;
}

export interface ProductIntro {
  name: string;
  tagline: string;
  features: string[];
  scenario: string;
}

export interface Persona {
  name: string;
  age: number;
  occupation: string;
  needs: string;
  pain_points: string;
  scenario: string;
}

export interface CMF {
  primary_color: string;
  primary_color_hex: string;
  secondary_color: string;
  secondary_color_hex: string;
  material: string;
  surface_treatment: string;
}

export interface StoryboardImage {
  url: string;
  description: string;
  prompt?: string;
}

export type Step =
  | 'background'
  | 'product_intro'
  | 'personas'
  | 'appearance'
  | 'cmf'
  | 'storyboard'
  | 'exploded_view';

export interface ProjectState {
  project: Project | null;
  currentStep: number;
  isLoading: boolean;
  error: string | null;
  isExporting: boolean;
  isSaving: boolean;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
}

export type ProjectAction =
  | { type: 'SET_PROJECT'; payload: Project }
  | { type: 'SET_STEP'; payload: number }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_EXPORTING'; payload: boolean }
  | { type: 'SET_SAVING'; payload: boolean }
  | { type: 'SET_LAST_SAVED'; payload: Date }
  | { type: 'UPDATE_FIELD'; payload: { field: string; value: any } }
  | { type: 'MERGE_PROJECT'; payload: Partial<Project> }
  | { type: 'MARK_DIRTY' }
  | { type: 'MARK_CLEAN' }
  | { type: 'RESET' };