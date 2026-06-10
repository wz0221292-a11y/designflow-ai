import crypto from 'crypto';
import { membershipPlans, type MembershipPlan } from '@/lib/membership';

export type YftCreateOrderInput = {
  orderNo: string;
  plan: Exclude<MembershipPlan, 'none'>;
  userId: string;
  amount: number;
  clientIp: string;
  paymentType?: string;
};

export function getYftConfig() {
  return {
    pid: process.env.YFT_PID || process.env.YFT_MERCHANT_ID || '',
    secretKey: process.env.YFT_SECRET_KEY || '',
    apiUrl: process.env.YFT_API_URL || 'https://www.yifut.com/mapi.php',
    notifyUrl: process.env.YFT_NOTIFY_URL || '',
    returnUrl: process.env.YFT_RETURN_URL || '',
  };
}

function sortParams(params: Record<string, string | number | undefined | null>) {
  return Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([a], [b]) => a.localeCompare(b));
}

/**
 * 易付通 MD5 签名：参数按 ASCII 升序排序 → 拼接 key=value → 末尾拼接 &key=密钥 → MD5 小写
 */
export function signYftParams(params: Record<string, string | number | undefined | null>, secretKey: string) {
  const base = sortParams(params)
    .map(([key, value]) => `${key}=${value}`)
    .join('&');
  return crypto.createHash('md5').update(`${base}${secretKey}`, 'utf8').digest('hex').toLowerCase();
}

/**
 * 验证易付通回调签名
 */
export function verifyYftParams(params: Record<string, string>, secretKey: string) {
  const sign = params.sign;
  if (!sign) return false;
  const clean: Record<string, string> = {};
  for (const [k, v] of Object.entries(params)) {
    if (k !== 'sign' && k !== 'sign_type') clean[k] = v;
  }
  const computed = signYftParams(clean, secretKey);
  return computed === sign.toLowerCase();
}

/**
 * API 接口支付：https://www.yifut.com/mapi.php
 */
export async function createYftPayment(input: YftCreateOrderInput) {
  const config = getYftConfig();
  const planInfo = membershipPlans[input.plan];

  if (!config.pid || !config.secretKey) {
    throw new Error('易付通配置未完成，请设置 YFT_PID 和 YFT_SECRET_KEY');
  }

  const params: Record<string, string | number> = {
    pid: config.pid,
    type: input.paymentType || 'alipay',
    out_trade_no: input.orderNo,
    notify_url: config.notifyUrl,
    return_url: config.returnUrl,
    name: `DesignFlow AI ${planInfo.name}`,
    money: input.amount.toFixed(2),
    clientip: input.clientIp || '127.0.0.1',
    param: JSON.stringify({ userId: input.userId, plan: input.plan }),
  };

  params.sign = signYftParams(params, config.secretKey);
  params.sign_type = 'MD5';

  const response = await fetch(config.apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params as Record<string, string>).toString(),
  });

  const text = await response.text();
  let payload: any;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error(`易付通返回非 JSON: ${text.slice(0, 200)}`);
  }

  if (!response.ok || payload.code !== 1) {
    console.error('易付通下单失败，原始返回:', JSON.stringify(payload));
    throw new Error(payload.msg || payload.message || `易付通下单失败(code=${payload.code})`);
  }

  // 支付宝：优先 payurl，兜底 qrcode/urlscheme
  const payUrl = payload.payurl || payload.qrcode || payload.urlscheme;
  if (!payUrl) throw new Error('易付通返回中缺少支付链接字段 (payurl/qrcode/urlscheme)');

  return { payUrl, tradeNo: payload.trade_no, raw: payload };
}
