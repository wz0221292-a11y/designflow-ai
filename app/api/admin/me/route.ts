import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/me
 *
 * 返回当前用户是否为管理员。
 * 仅使用 ADMIN_EMAILS 环境变量判断（不依赖数据库 profiles.is_admin）。
 *
 * 前端用此接口决定是否显示"管理员面板"按钮。
 * 真正的权限校验仍由 /api/admin/* 的 requireAdmin() 执行。
 */
export async function GET() {
  try {
    const { user } = await getCurrentUser();

    const adminEmails = (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean);

    return NextResponse.json({
      isAdmin: adminEmails.includes(user.email?.toLowerCase() || ''),
    });
  } catch {
    return NextResponse.json({ isAdmin: false });
  }
}
