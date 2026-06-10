import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase browser env vars');
}

/**
 * 浏览器端 Supabase 客户端（基于 @supabase/ssr）
 *
 * createBrowserClient 自动处理：
 * 1. cookie 读写（让服务端 proxy 和 API 路由能读到 session）
 * 2. localStorage 持久化（让登录状态在标签页关闭后仍然存在）
 *
 * 这样客户端登录后，cookie 里有 session → proxy 刷新 → API 路由 getUser() 成功
 */
export const supabase = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
