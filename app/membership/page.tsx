'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { membershipPlans, type MembershipPlan } from '@/lib/membership';

const planOrder: Exclude<MembershipPlan, 'none'>[] = ['day', 'week', 'month', 'half_year', 'year'];

const planUseCases: Record<Exclude<MembershipPlan, 'none'>, string> = {
  day: '临时汇报或一次性作业',
  week: '短期课程项目推进',
  month: '持续完善一个产品方案',
  half_year: '多项目学习与作品集整理',
  year: '长期设计训练或工作室使用',
};

const planBenefits = (plan: Exclude<MembershipPlan, 'none'>) => {
  const info = membershipPlans[plan];
  return [
    { label: 'AI 文本生成', value: '不限次数', highlight: false },
    { label: 'AI 图片生成', value: info.imageLimit ? `每阶段 ${info.imageLimit} 次` : '不限次数', highlight: true },
    { label: 'PPT / PDF 导出', value: '完整文档导出', highlight: false },
    { label: '项目数量', value: `最多 ${info.projectLimit} 个`, highlight: false },
    { label: '生成队列', value: plan === 'day' ? '普通队列' : '优先队列', highlight: false },
    { label: '模板库', value: plan === 'day' ? '基础模板' : plan === 'year' ? '全部模板' : '高级模板', highlight: false },
  ];
};

const buttonBase = 'inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-bold outline-none transition hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0';

export default function MembershipPage() {
  const [profile, setProfile] = useState<any>(null);
  const [activePlan, setActivePlan] = useState<MembershipPlan>('none');
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState<MembershipPlan | null>(null);
  const [paymentError, setPaymentError] = useState('');
  const [orders, setOrders] = useState<any[]>([]);
  const [lastOrder, setLastOrder] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    fetchMembership();
  }, []);

  const fetchMembership = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      const profileData = data as any;
      setProfile(profileData);

      const plan = profileData.membership_plan || 'none';
      const expires = profileData.membership_expires_at;
      if (plan !== 'none' && expires && new Date(expires).getTime() > Date.now()) {
        setActivePlan(plan);
      } else {
        setActivePlan('none');
      }
      await fetchOrders();
    } catch (error) {
      console.error('获取会员信息失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/payments/orders', { cache: 'no-store', credentials: 'include' });
      const data = await response.json();
      if (response.ok) setOrders(data.orders || []);
    } catch (error) {
      console.error('获取订单失败:', error);
    }
  };

  const handleActivate = async (plan: Exclude<MembershipPlan, 'none'>) => {
    setActivating(plan);
    setPaymentError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const response = await fetch('/api/payments/yft/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '创建支付订单失败');
      setLastOrder(data.order);
      await fetchOrders();
      window.location.href = data.payUrl;
    } catch (error: any) {
      setPaymentError(error.message);
    } finally {
      setActivating(null);
    }
  };

  if (loading) {
    return (
      <div className="df-workspace flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-blue-100 border-t-blue-600" />
      </div>
    );
  }

  const expiresAt = profile?.membership_expires_at;
  const isExpired = !expiresAt || new Date(expiresAt).getTime() <= Date.now();
  const activeInfo = activePlan === 'none' ? null : membershipPlans[activePlan];
  const daysRemaining = activeInfo && !isExpired
    ? Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
    : 0;

  return (
    <div className="df-workspace min-h-screen">
      <header className="df-shell sticky top-0 z-30">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/dashboard')}
              className={`${buttonBase} border border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus-visible:ring-4 focus-visible:ring-blue-100`}
            >
              ← 项目列表
            </button>
            <h1 className="text-xl font-black tracking-tight text-slate-950">会员中心</h1>
          </div>
          <button
            onClick={() => router.push('/')}
            className={`${buttonBase} border border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 focus-visible:ring-4 focus-visible:ring-blue-100`}
          >
            主页
          </button>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-[24px] bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-950 p-7 text-white shadow-2xl shadow-blue-950/20 sm:p-10">
            <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
              <div>
                <p className="text-sm font-black text-blue-100">创作额度与导出权限</p>
                <h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">开通会员，完整交付设计方案</h2>
                <p className="mt-5 max-w-xl text-base leading-7 text-blue-50">支付完成后通常 1 分钟内自动生效。未开通会员也能预览全部 AI 生成内容。</p>
              </div>
              <div className="rounded-[18px] border border-white/10 bg-white/10 p-6 backdrop-blur-sm">
                <p className="text-sm font-black text-blue-100">当前状态</p>
                {activeInfo && !isExpired ? (
                  <div className="mt-4 space-y-3">
                    <span className="inline-flex w-fit rounded-full bg-white/20 px-4 py-2 text-sm font-black text-white ring-1 ring-white/25">{activeInfo.name}</span>
                    <p className="text-sm font-medium text-blue-100">
                      到期时间：<span className="font-black text-white">{new Date(expiresAt).toLocaleString('zh-CN')}</span>
                    </p>
                    <p className="text-sm font-medium text-blue-100">
                      剩余：<span className="font-black text-emerald-300">{daysRemaining} 天</span>
                    </p>
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    <span className="inline-flex rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-white/60 ring-1 ring-white/15">未开通会员</span>
                    <p className="text-sm font-medium leading-6 text-blue-100">选择下方套餐即可使用图片生成、导出和更高项目上限。</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {paymentError && (
          <div className="mx-auto max-w-6xl px-4 pb-0 sm:px-6 lg:px-8">
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{paymentError}</div>
          </div>
        )}

        <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6">
            <h2 className="text-2xl font-black text-slate-950">选择套餐</h2>
            <p className="mt-1 text-sm font-medium text-slate-600">按你的使用周期选择，月卡适合持续完善一个方案。<span className="inline-flex items-center gap-1 ml-2 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-600"><svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>仅支持支付宝</span></p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {planOrder.map((plan) => {
              const info = membershipPlans[plan];
              const isCurrent = activePlan === plan && !isExpired;
              const recommended = plan === 'month';
              const benefits = planBenefits(plan);

              return (
                <article
                  key={plan}
                  className={`relative overflow-hidden rounded-[20px] border bg-white transition hover:-translate-y-1 ${
                    recommended
                      ? 'border-indigo-200 shadow-xl shadow-indigo-100/40 ring-1 ring-indigo-100'
                      : isCurrent
                      ? 'border-emerald-200 shadow-lg shadow-emerald-100/30 ring-1 ring-emerald-100'
                      : 'border-slate-200 shadow-sm shadow-blue-950/5 hover:shadow-lg hover:shadow-blue-950/8'
                  }`}
                >
                  {recommended && (
                    <div className="absolute right-0 top-0 rounded-bl-[16px] bg-gradient-to-r from-indigo-500 to-violet-600 px-4 py-1.5 text-xs font-black text-white shadow-sm">
                      推荐
                    </div>
                  )}

                  <div className="p-5">
                    <h3 className="text-lg font-black text-slate-950">{info.name}</h3>
                    <p className="mt-1.5 min-h-[2.25rem] text-xs font-medium leading-5 text-slate-500">{planUseCases[plan]}</p>

                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="text-3xl font-black tracking-tight text-slate-950">¥{info.price}</span>
                      <span className="text-sm font-bold text-slate-500">
                        /{info.days === 1 ? '天' : info.days === 7 ? '周' : info.days === 30 ? '月' : info.days === 180 ? '半年' : '年'}
                      </span>
                    </div>

                    <div className="mt-5 space-y-2.5 border-t border-slate-100 pt-4">
                      {benefits.map((b) => (
                        <div key={b.label} className="flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-600">{b.label}</span>
                          <span className={`font-bold ${b.highlight ? 'text-indigo-700' : 'text-slate-400'}`}>{b.value}</span>
                        </div>
                      ))}
                    </div>

                    {isCurrent ? (
                      <button disabled className="mt-5 w-full rounded-full border border-emerald-200 bg-emerald-50 py-2.5 text-sm font-black text-emerald-700">
                        <span className="flex items-center justify-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          当前套餐
                        </span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleActivate(plan)}
                        disabled={activating === plan}
                        className={`mt-5 w-full rounded-full py-2.5 text-sm font-black outline-none transition hover:-translate-y-0.5 active:translate-y-0 ${
                          recommended
                            ? 'bg-gradient-to-r from-indigo-600 to-violet-700 text-white shadow-lg shadow-indigo-600/20 hover:shadow-xl hover:shadow-indigo-600/30'
                            : 'border border-slate-200 bg-slate-50 text-slate-700 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700'
                        }`}
                      >
                        {activating === plan ? '创建订单中...' : `开通${info.name}`}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          <p className="mt-6 text-center text-xs font-medium text-slate-500">
            支付完成后自动开通，订单有效期为 15 分钟。如果短时间内未生效，请刷新页面或稍后再查看。
          </p>

          {/* Order history */}
          {orders.length > 0 && (
            <section className="mx-auto mt-10 max-w-6xl pb-8">
              <h2 className="mb-4 text-xl font-black text-slate-950">支付记录</h2>
              <div className="overflow-x-auto rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead className="text-xs font-bold text-slate-500">
                    <tr>
                      <th className="px-3 py-2">订单号</th>
                      <th className="px-3 py-2">套餐</th>
                      <th className="px-3 py-2">金额</th>
                      <th className="px-3 py-2">状态</th>
                      <th className="px-3 py-2">创建时间</th>
                      <th className="px-3 py-2">过期时间</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order: any) => (
                      <tr key={order.id} className="border-t border-slate-100">
                        <td className="px-3 py-3 font-mono text-xs font-bold text-slate-600">{order.order_no}</td>
                        <td className="px-3 py-3 font-bold text-slate-950">
                          {membershipPlans[order.plan as Exclude<MembershipPlan, 'none'>]?.name || order.plan}
                        </td>
                        <td className="px-3 py-3 font-bold text-slate-950">¥{Number(order.amount).toFixed(2)}</td>
                        <td className="px-3 py-3">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${
                            order.status === 'paid' ? 'bg-emerald-50 text-emerald-700' :
                            order.status === 'closed' ? 'bg-slate-50 text-slate-500' :
                            'bg-amber-50 text-amber-700'
                          }`}>
                            {order.status === 'paid' ? '已支付' : order.status === 'closed' ? '已关闭' : '待支付'}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-xs text-slate-500">{new Date(order.created_at).toLocaleString('zh-CN')}</td>
                        <td className="px-3 py-3 text-xs text-slate-500">{order.expires_at ? new Date(order.expires_at).toLocaleString('zh-CN') : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </section>
      </main>
    </div>
  );
}
