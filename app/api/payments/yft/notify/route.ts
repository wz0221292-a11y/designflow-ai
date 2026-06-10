import { NextRequest, NextResponse } from 'next/server';
import { getYftConfig, verifyYftParams } from '@/lib/payment/yft';
import { membershipPlans, type MembershipPlan } from '@/lib/membership';
import { supabaseAdmin } from '@/lib/auth/admin';

export const dynamic = 'force-dynamic';

function parseAmountCents(value: unknown) {
  const text = String(value ?? '').trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) return null;
  const [yuan, cents = ''] = text.split('.');
  return Number(yuan) * 100 + Number(cents.padEnd(2, '0'));
}

async function markPaidLate(orderId: string, params: Record<string, string>) {
  const { error } = await supabaseAdmin
    .from('payment_orders')
    .update({
      status: 'paid_late',
      provider_trade_no: params.trade_no || null,
      provider_payload: params,
      paid_at: new Date().toISOString(),
      closed_at: new Date().toISOString(),
    })
    .eq('id', orderId)
    .in('status', ['pending', 'closed']);
  if (error) throw new Error(error.message);
}

async function activateMembership(userId: string, plan: Exclude<MembershipPlan, 'none'>) {
  const planInfo = membershipPlans[plan];
  const expiresAt = new Date(Date.now() + planInfo.days * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({
      membership_plan: plan,
      membership_expires_at: expiresAt,
      image_usage: {},
    })
    .eq('id', userId);
  if (error) throw new Error(error.message);
}

/**
 * 易付通异步通知回调（GET）
 *
 * 安全原则：
 * 1. 验签（证明来自易付通）
 * 2. 查订单（从 DB 获取 user_id/plan/amount，绝不相信回调里的 param 参数）
 * 3. 防重复（已支付直接返回 success）
 * 4. 激活会员
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });

    const config = getYftConfig();

    // 验证签名
    if (!verifyYftParams(params, config.secretKey)) {
      console.error('易付通回调验签失败');
      return new NextResponse('fail', { status: 400 });
    }

    // 校验商户号
    if (params.pid && params.pid !== String(config.pid)) {
      console.error('易付通回调 pid 不匹配:', params.pid, config.pid);
      return new NextResponse('fail', { status: 400 });
    }

    // 只有 TRADE_SUCCESS 才算支付成功
    const tradeStatus = params.trade_status;
    if (tradeStatus !== 'TRADE_SUCCESS') {
      return new NextResponse('success');
    }

    const orderNo = params.out_trade_no;
    if (!orderNo) return new NextResponse('fail', { status: 400 });

    // 查订单（来源：数据库，不可伪造）
    const { data: order, error } = await supabaseAdmin
      .from('payment_orders')
      .select('*')
      .eq('order_no', orderNo)
      .single();

    if (error || !order) {
      console.error('易付通回调找不到订单:', orderNo);
      return new NextResponse('fail', { status: 404 });
    }

    if (order.status === 'paid') return new NextResponse('success');
    if (order.status === 'paid_late') return new NextResponse('success');

    const callbackAmountCents = parseAmountCents(params.money);
    const orderAmountCents = parseAmountCents(order.amount);
    if (callbackAmountCents === null || orderAmountCents === null || callbackAmountCents !== orderAmountCents) {
      console.error('易付通回调金额不匹配:', orderNo, params.money, order.amount);
      return new NextResponse('fail', { status: 400 });
    }

    const expiredOrClosed = order.status === 'closed' || (order.expires_at && new Date(order.expires_at).getTime() <= Date.now());
    if (expiredOrClosed) {
      await markPaidLate(order.id, params);
      return new NextResponse('success');
    }

    // provider_trade_no 唯一性：已有相同流水号直接返回 success
    if (params.trade_no) {
      const { data: dup } = await supabaseAdmin
        .from('payment_orders')
        .select('id')
        .eq('provider_trade_no', params.trade_no)
        .neq('id', order.id)
        .maybeSingle();
      if (dup) {
        console.error('易付通回调重复流水号:', orderNo, params.trade_no);
        return new NextResponse('success');
      }
    }

    // ⚠️ 用户身份和套餐只看数据库订单记录，绝不相信回调 param 里的值
    const userId = order.user_id;
    const plan = order.plan;

    if (!membershipPlans[plan as Exclude<MembershipPlan, 'none'>]) {
      console.error('易付通回调订单套餐无效:', orderNo, plan);
      return new NextResponse('success');
    }

    // 先激活会员，成功后再标记订单已支付（防止中间坏状态）
    await activateMembership(userId, plan as Exclude<MembershipPlan, 'none'>);

    await supabaseAdmin
      .from('payment_orders')
      .update({
        status: 'paid',
        provider_trade_no: params.trade_no || null,
        provider_payload: params,
        paid_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    return new NextResponse('success');
  } catch (error) {
    console.error('易付通回调处理失败:', error);
    return new NextResponse('fail', { status: 500 });
  }
}

/**
 * 兼容 POST 回调
 */
export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const params: Record<string, string> = {};
    form.forEach((value, key) => {
      params[key] = String(value);
    });

    const url = new URL(request.url);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    return GET(new NextRequest(url));
  } catch (error) {
    console.error('易付通回调处理失败:', error);
    return new NextResponse('fail', { status: 500 });
  }
}
