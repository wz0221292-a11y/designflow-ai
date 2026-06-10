import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getActivePlan, getProjectLimitServer } from '@/lib/membership';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { user, supabase } = await getCurrentUser();
    const body = await request.json();
    const idea = String(body.idea || '').trim();

    if (!idea) {
      return NextResponse.json({ error: '项目想法不能为空' }, { status: 400 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('membership_plan, membership_expires_at')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    const activePlan = getActivePlan(profile);
    const projectLimit = getProjectLimitServer(activePlan);

    const { count, error: countError } = await supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 });
    }

    if ((count || 0) >= projectLimit) {
      return NextResponse.json(
        { error: `当前项目数已达上限(${projectLimit}个)，请升级会员以创建更多项目` },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from('projects')
      .insert({ user_id: user.id, idea })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
