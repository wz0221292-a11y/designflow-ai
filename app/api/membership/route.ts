import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/auth/admin';
import { getActivePlan, getPlanInfo, membershipPlans, type MembershipPlan } from '@/lib/membership';

/**
 * GET /api/membership — 查询当前登录用户的会员状态
 * 使用 session 客户端（受 RLS 保护），不接受 ?userId= 参数
 */
export async function GET() {
  try {
    const { user, supabase } = await getCurrentUser();

    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, membership_plan, membership_expires_at, image_usage, is_admin')
      .eq('id', user.id)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 404 });

    const activePlan = getActivePlan(data);
    return NextResponse.json({
      profile: data,
      activePlan,
      planInfo: getPlanInfo(activePlan),
    });
  } catch (error: any) {
    const status = error.message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}

/**
 * POST /api/membership — 管理员手动激活会员（仅从 session 校验管理员身份）
 * userId 从 body 传入（因为管理员可能为其他用户操作），但管理员身份必须来自 session
 */
export async function POST(request: NextRequest) {
  try {
    // 管理员身份仅从 session 获取
    await requireAdmin();

    const { userId, plan } = await request.json() as {
      userId: string;
      plan: MembershipPlan;
    };

    if (!userId || !plan || plan === 'none' || !membershipPlans[plan]) {
      return NextResponse.json({ error: 'Invalid membership plan' }, { status: 400 });
    }

    const planInfo = membershipPlans[plan];
    const expiresAt = new Date(Date.now() + planInfo.days * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({
        membership_plan: plan,
        membership_expires_at: expiresAt,
        image_usage: {},
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      profile: data,
      activePlan: plan,
      planInfo,
    });
  } catch (error: any) {
    const status = error.message === 'Forbidden: admin access required' ? 403
      : error.message === 'Unauthorized' ? 401
      : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}
