import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getCurrentUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/auth/admin';
import { createYftPayment } from '@/lib/payment/yft';
import { membershipPlans, type MembershipPlan } from '@/lib/membership';

const ORDER_TTL_MS = 15 * 60 * 1000;

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // 身份仅从 session 获取——绝不相信 body.userId
    const { user } = await getCurrentUser();
    const body = await request.json() as { plan: MembershipPlan; paymentType?: string };
    const { plan } = body;

    if (!plan || plan === 'none' || !membershipPlans[plan]) {
      return NextResponse.json({ error: '无效的会员套餐' }, { status: 400 });
    }

    const planInfo = membershipPlans[plan];
    const orderNo = `DF${Date.now()}${crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`;
    const expiresAt = new Date(Date.now() + ORDER_TTL_MS).toISOString();

    await supabaseAdmin
      .from('payment_orders')
      .update({ status: 'closed', closed_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .lt('expires_at', new Date().toISOString());
    const { data: order, error } = await supabaseAdmin
      .from('payment_orders')
      .insert({
        order_no: orderNo,
        user_id: user.id,
        plan,
        amount: planInfo.price,
        status: 'pending',
        provider: 'yft',
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      '127.0.0.1';

    const payment = await createYftPayment({
      orderNo,
      userId: user.id,
      plan,
      amount: planInfo.price,
      clientIp,
      paymentType: body.paymentType,
    });

    await supabaseAdmin
      .from('payment_orders')
      .update({ provider_payload: payment.raw })
      .eq('id', order.id);

    return NextResponse.json({
      order: { ...order, expires_at: expiresAt },
      payUrl: payment.payUrl,
      tradeNo: payment.tradeNo,
      expiresAt,
      createdAt: order.created_at,
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: '请先登录' }, { status: 401 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
