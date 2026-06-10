/**
 * Supabase 客户端
 *
 * ⚠️ 所有客户端统一从 @/lib/auth 导出，此文件仅做兼容 re-export。
 *
 * - 高权限 service role 客户端请从 @/lib/auth/admin 显式导入，避免普通接口误用
 * - getCurrentUser(): 从 session cookie 获取身份（所有普通接口使用，受 RLS 保护）
 */
export { createClient, getCurrentUser, getCurrentUserOrNull } from '@/lib/auth';

import type { Database } from '@/types/database';
export type { Database };
export type ProjectData = Database['public']['Tables']['projects']['Row'];
