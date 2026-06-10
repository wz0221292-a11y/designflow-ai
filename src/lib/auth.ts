/**
 * 统一身份验证模块
 *
 * 核心原则：
 * 1. 用户身份只能来自 Supabase session cookie，绝不相信 query/body 传入的 userId/email
 * 2. admin 客户端仅用于回调/管理员跨用户操作，普通请求走用户客户端（受 RLS 保护）
 * 3. 用户客户端 + RLS = 纵深防御；即使忘记写 .eq('user_id', user.id)，RLS 也会拦住
 */
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// ── 环境变量 ──────────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase server env vars');
}

// ── 创建服务端 Supabase 客户端（基于 @supabase/ssr） ──────────
// 中间件会自动刷新过期的 cookie，所以服务端和客户端 session 一致

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options),
        );
      },
    },
  });
}

// ── 从 session 获取当前登录用户 ───────────────────────────────
// 这是所有需要登录的接口的唯一身份来源
// 返回的 supabase 是用户客户端（受 RLS 保护），优于 supabaseAdmin

export async function getCurrentUser() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Unauthorized');
  }

  return { user, supabase };
}

// ── 获取当前用户（不抛异常，返回 null） ──────────────────────

export async function getCurrentUserOrNull() {
  try {
    return await getCurrentUser();
  } catch {
    return null;
  }
}

// ── 管理员校验（仅从 session + ADMIN_EMAILS 判断） ────────────
// 不再接受 userId/email 参数——攻击者可伪造
// 不再查数据库 profiles.is_admin——普通用户可能通过 RLS 漏洞提权

export async function requireAdmin() {
  const { user } = await getCurrentUser();

  const adminEmails = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (!adminEmails.includes(user.email?.toLowerCase() || '')) {
    throw new Error('Forbidden: admin access required');
  }

  return user;
}
