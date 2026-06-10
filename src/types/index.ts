export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  membership_plan: 'none' | 'day' | 'week' | 'month' | 'half_year' | 'year';
  membership_expires_at: string | null;
  image_usage: Record<string, number> | null;
  is_admin: boolean;
  created_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  idea: string;
  background: string | null;
  product_intro: ProductIntro | null;
  personas: Persona[] | null;
  /** 外观设计图片 —— 每项为 AppearanceImage 对象（旧数据 string 会在 normalize 时转换） */
  appearance_images: AppearanceImage[] | null;
  cmf: CMF | null;
  storyboard_images: StoryboardImage[] | null;
  /** 爆炸图 —— ExplodedViewImage 对象（旧数据 string 会在 normalize 时转换） */
  exploded_view_image: ExplodedViewImage | null;
  current_step: number;
  selected_appearance_index: number | null;
  created_at: string;
  updated_at: string;
}

export interface ProductIntro {
  name: string;
  tagline: string;
  target_users: string;
  problem: string;
  features: string[];
  advantages: string;
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

/** 项目内资源统一身份字段 —— 防串台核心 */
export interface ProjectBoundFields {
  projectId: string;
  stepKey: 'appearance' | 'storyboard' | 'exploded_view';
  slotIndex: number;
  /** 防竞态版本标记：同一槽位多次生成时，只有最新 generationId 的结果能写回 */
  generationId?: string;
}

export interface StoryboardImage extends ProjectBoundFields {
  url: string;
  description: string;
  prompt?: string;
  /** Supabase Storage 对象路径，用于 URL 失效后重建访问地址 */
  storagePath?: string;
  status?: 'idle' | 'text_generating' | 'image_generating' | 'ready' | 'failed';
  /** @deprecated 迁移到 generationId，保留用于读取旧数据 */
  _regenerationId?: string;
}

export interface AppearanceImage extends ProjectBoundFields {
  url: string;
  storagePath?: string;
  status?: 'generating' | 'ready' | 'failed';
}

export interface ExplodedViewImage extends ProjectBoundFields {
  url: string;
  storagePath?: string;
  status?: 'generating' | 'ready' | 'failed';
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  created_by: string | null;
  is_published: boolean;
  published_at: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentOrder {
  id: string;
  order_no: string;
  user_id: string;
  plan: 'day' | 'week' | 'month' | 'half_year' | 'year';
  amount: number;
  status: 'pending' | 'paid' | 'failed' | 'closed' | 'paid_late';
  provider: string;
  provider_trade_no: string | null;
  provider_payload: Record<string, any> | null;
  paid_at: string | null;
  expires_at: string | null;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
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
  | { type: 'MERGE_SILENT'; payload: Partial<Project> }
  | { type: 'MARK_DIRTY' }
  | { type: 'MARK_CLEAN' }
  | { type: 'RESET' };

export interface Changelog {
  id: string;
  title: string;
  content: string;
  category: 'feature' | 'fix' | 'improvement' | 'other';
  version: string | null;
  created_by: string | null;
  created_at: string;
}