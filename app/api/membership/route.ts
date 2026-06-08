import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/serverClient';
import { getActivePlan, getPlanInfo, membershipPlans, type MembershipPlan } from '@/lib/membership';

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const { data, error } = await supabaseServer
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 404 });

    const activePlan = getActivePlan(data);
    return NextResponse.json({
      profile: data,
      activePlan,
      planInfo: getPlanInfo(activePlan),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, plan } = await request.json() as { userId: string; plan: MembershipPlan };
    if (!userId || !plan || plan === 'none' || !membershipPlans[plan]) {
      return NextResponse.json({ error: 'Invalid membership plan' }, { status: 400 });
    }

    const planInfo = membershipPlans[plan];
    const expiresAt = new Date(Date.now() + planInfo.days * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await (supabaseServer as any)
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
