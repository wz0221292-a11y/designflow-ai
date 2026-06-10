import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/auth/admin';
import { getActivePlan } from '@/lib/membership';

export const dynamic = 'force-dynamic';

function containsQuery(user: any, query: string) {
  if (!query) return true;
  const haystack = `${user.email || ''} ${user.full_name || ''}`.toLowerCase();
  return haystack.includes(query.toLowerCase());
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get('q') || '').trim();
    const page = Math.max(1, Number(searchParams.get('page') || '1'));
    const pageSize = Math.min(50, Math.max(10, Number(searchParams.get('pageSize') || '20')));
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data: profiles, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name, membership_plan, membership_expires_at, image_usage, created_at')
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const filtered = (profiles || []).filter((user: any) => containsQuery(user, query));
    const pageUsers = filtered.slice(from, to + 1);
    const userIds = pageUsers.map((user: any) => user.id);

    const [projectsRes, ordersRes] = await Promise.all([
      userIds.length
        ? supabaseAdmin.from('projects').select('id, user_id, created_at').in('user_id', userIds)
        : Promise.resolve({ data: [], error: null } as any),
      userIds.length
        ? supabaseAdmin.from('payment_orders').select('id, user_id, status, amount, paid_at, created_at').in('user_id', userIds).order('created_at', { ascending: false })
        : Promise.resolve({ data: [], error: null } as any),
    ]);

    if (projectsRes.error) return NextResponse.json({ error: projectsRes.error.message }, { status: 500 });
    if (ordersRes.error) return NextResponse.json({ error: ordersRes.error.message }, { status: 500 });

    const projectsByUser = new Map<string, number>();
    for (const project of projectsRes.data || []) {
      projectsByUser.set(project.user_id, (projectsByUser.get(project.user_id) || 0) + 1);
    }

    const orderSummaryByUser = new Map<string, { total: number; paid: number; pending: number; revenue: number; lastPaidAt: string | null }>();
    for (const order of ordersRes.data || []) {
      const summary = orderSummaryByUser.get(order.user_id) || { total: 0, paid: 0, pending: 0, revenue: 0, lastPaidAt: null };
      summary.total += 1;
      if (order.status === 'paid') {
        summary.paid += 1;
        summary.revenue += Number(order.amount || 0);
        if (order.paid_at && (!summary.lastPaidAt || new Date(order.paid_at) > new Date(summary.lastPaidAt))) {
          summary.lastPaidAt = order.paid_at;
        }
      }
      if (order.status === 'pending') summary.pending += 1;
      orderSummaryByUser.set(order.user_id, summary);
    }

    const users = pageUsers.map((user: any) => {
      const orderSummary = orderSummaryByUser.get(user.id) || { total: 0, paid: 0, pending: 0, revenue: 0, lastPaidAt: null };
      return {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        membership_plan: user.membership_plan,
        membership_expires_at: user.membership_expires_at,
        active_plan: getActivePlan(user),
        created_at: user.created_at,
        project_count: projectsByUser.get(user.id) || 0,
        orders: orderSummary,
      };
    });

    return NextResponse.json({ users, total: filtered.length, page, pageSize });
  } catch (error: any) {
    const status = error.message === 'Forbidden: admin access required' ? 403
      : error.message === 'Unauthorized' ? 401
      : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}
