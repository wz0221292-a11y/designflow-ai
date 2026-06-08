import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/serverClient';
import { buildImageUsageKey, getActivePlan, getImageLimit, MEMBERSHIP_ENABLED } from '@/lib/membership';
import { generateImage } from '@/lib/image/replicate';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, projectId, type, slotIndex, expectedTotal } = body;

    const expectedTotals: Record<string, number> = {
      appearance: 3,
      storyboard: 6,
      exploded_view: 1,
    };

    if (!type || !(type in expectedTotals)) {
      return NextResponse.json({ error: '无效的图片生成类型' }, { status: 400 });
    }

    const requiredTotal = expectedTotals[type];
    if (expectedTotal !== requiredTotal || !Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= requiredTotal) {
      return NextResponse.json({ error: '生图请求次数与当前页面不匹配' }, { status: 400 });
    }

    if (MEMBERSHIP_ENABLED && (!userId || !projectId)) {
      return NextResponse.json({ error: '缺少会员校验信息' }, { status: 400 });
    }

    let imageLimit: number | null = null;
    let currentUsage = 0;
    let usageKey = '';
    let usage: Record<string, number> = {};

    if (MEMBERSHIP_ENABLED) {
      const { data: profile, error: profileError } = await supabaseServer
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        return NextResponse.json({ error: profileError.message }, { status: 404 });
      }

      const activePlan = getActivePlan(profile);
      imageLimit = getImageLimit(activePlan);
      if (imageLimit === 0) {
        return NextResponse.json({ error: '请先充值会员后再生成图片' }, { status: 403 });
      }

      usage = ((profile as any).image_usage || {}) as Record<string, number>;
      usageKey = buildImageUsageKey(projectId, type);
      currentUsage = usage[usageKey] || 0;
      if (imageLimit !== null && currentUsage >= imageLimit) {
        return NextResponse.json({ error: '当前阶段图片生成次数已用完，请升级月度及以上会员' }, { status: 403 });
      }
    }

    const result = await generateImage(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    if (MEMBERSHIP_ENABLED) {
      await (supabaseServer as any)
        .from('profiles')
        .update({ image_usage: { ...usage, [usageKey]: currentUsage + 1 } })
        .eq('id', userId);
    }

    return NextResponse.json({ success: true, imageUrl: result.imageUrl, imageUsage: currentUsage + 1, imageLimit });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}