import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/auth/admin';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { user } = await getCurrentUser();
    const now = new Date().toISOString();

    await supabaseAdmin
      .from('payment_orders')
      .update({ status: 'closed', closed_at: now })
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .lt('expires_at', now);

    const { data, error } = await supabaseAdmin
      .from('payment_orders')
      .select('id, order_no, plan, amount, status, paid_at, expires_at, closed_at, created_at, updated_at')
      .eq('user_id', user.id)
      .not('status', 'eq', 'paid_late')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ orders: data || [] });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
