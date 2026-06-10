import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/auth/admin';

export const dynamic = 'force-dynamic';

function sumPaidOrders(orders: any[]) {
  return orders.reduce((total, order) => total + Number(order.amount || 0), 0);
}

export async function GET() {
  try {
    // 管理员身份仅从 session 校验
    await requireAdmin();

    const [profiles, projects, imageJobs, paidOrders, pendingOrders, announcements] = await Promise.all([
      supabaseAdmin.from('profiles').select('id, created_at, membership_plan', { count: 'exact', head: false }),
      supabaseAdmin.from('projects').select('id, created_at', { count: 'exact', head: false }),
      supabaseAdmin.from('image_jobs').select('id, status, created_at', { count: 'exact', head: false }),
      supabaseAdmin.from('payment_orders').select('id, amount, plan, paid_at, created_at').eq('status', 'paid'),
      supabaseAdmin.from('payment_orders').select('id, amount, plan, created_at').eq('status', 'pending'),
      supabaseAdmin.from('announcements').select('id', { count: 'exact', head: false }),
    ]);

    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const users = (profiles.data || []) as any[];
    const projectRows = (projects.data || []) as any[];
    const jobs = imageJobs.error?.code === '42P01' ? [] : ((imageJobs.data || []) as any[]);
    const paid = paidOrders.error?.code === '42P01' ? [] : ((paidOrders.data || []) as any[]);
    const pending = pendingOrders.error?.code === '42P01' ? [] : ((pendingOrders.data || []) as any[]);

    const stats = {
      users: {
        total: profiles.count ?? users.length,
        newToday: users.filter((item) => now - new Date(item.created_at).getTime() < dayMs).length,
        members: users.filter((item) => item.membership_plan && item.membership_plan !== 'none').length,
      },
      projects: {
        total: projects.count ?? projectRows.length,
        newToday: projectRows.filter((item) => now - new Date(item.created_at).getTime() < dayMs).length,
      },
      usage: {
        imageJobs: imageJobs.error?.code === '42P01' ? 0 : (imageJobs.count ?? jobs.length),
        completedImages: jobs.filter((item) => item.status === 'completed').length,
      },
      revenue: {
        total: sumPaidOrders(paid),
        today: sumPaidOrders(paid.filter((item) => item.paid_at && now - new Date(item.paid_at).getTime() < dayMs)),
        paidOrders: paid.length,
        pendingOrders: pending.length,
      },
      announcements: announcements.error?.code === '42P01' ? 0 : (announcements.count ?? 0),
      // 勿返回完整订单对象——只返回脱敏后的摘要
      recentOrders: paid.slice(0, 10).map((order) => ({
        amount: order.amount,
        plan: order.plan,
        paid_at: order.paid_at,
      })),
    };

    return NextResponse.json({ stats });
  } catch (error: any) {
    const status = error.message === 'Forbidden: admin access required' ? 403
      : error.message === 'Unauthorized' ? 401
      : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}
