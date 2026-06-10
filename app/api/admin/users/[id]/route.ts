import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/auth/admin';
import { membershipPlans, type MembershipPlan } from '@/lib/membership';

export const dynamic = 'force-dynamic';

function isValidPlan(plan: MembershipPlan) {
  return plan === 'none' || Boolean(membershipPlans[plan as Exclude<MembershipPlan, 'none'>]);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    const updates: Record<string, any> = {};

    if (typeof body.plan === 'string') {
      const plan = body.plan as MembershipPlan;
      if (!isValidPlan(plan)) {
        return NextResponse.json({ error: '无效的会员套餐' }, { status: 400 });
      }
      updates.membership_plan = plan;
      if (plan === 'none') {
        updates.membership_expires_at = null;
      } else if (typeof body.expiresAt === 'string' && body.expiresAt) {
        const expiresAt = new Date(body.expiresAt);
        if (Number.isNaN(expiresAt.getTime())) {
          return NextResponse.json({ error: '无效的到期时间' }, { status: 400 });
        }
        updates.membership_expires_at = expiresAt.toISOString();
      } else {
        const info = membershipPlans[plan];
        updates.membership_expires_at = new Date(Date.now() + info.days * 24 * 60 * 60 * 1000).toISOString();
      }
    }

    if (body.resetImageUsage === true) {
      updates.image_usage = {};
    }

    if (!Object.keys(updates).length) {
      return NextResponse.json({ error: '没有可更新的字段' }, { status: 400 });
    }

    const adminUser = await requireAdmin(); // re-fetch for logging
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select('id, email, full_name, membership_plan, membership_expires_at, image_usage, created_at')
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Auto-log membership/usage changes
    if (typeof body.plan === 'string') {
      const planLabel = body.plan === 'none' ? '取消会员' : membershipPlans[body.plan as Exclude<MembershipPlan, 'none'>]?.name || body.plan;
      await supabaseAdmin.from('changelogs').insert({
        title: `调整用户会员`,
        content: `管理员将用户 ${data.email} 的会员调整为「${planLabel}」`,
        category: 'improvement',
        created_by: adminUser.id,
      });
    }
    if (body.resetImageUsage === true) {
      await supabaseAdmin.from('changelogs').insert({
        title: `清空用户用量`,
        content: `管理员清空了用户 ${data.email} 的图片生成用量`,
        category: 'improvement',
        created_by: adminUser.id,
      });
    }

    return NextResponse.json({ user: data });
  } catch (error: any) {
    const status = error.message === 'Forbidden: admin access required' ? 403
      : error.message === 'Unauthorized' ? 401
      : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}
