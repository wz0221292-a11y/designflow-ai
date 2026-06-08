'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { membershipPlans, type MembershipPlan } from '@/lib/membership';

const planOrder: Exclude<MembershipPlan, 'none'>[] = ['day', 'week', 'month', 'half_year', 'year'];

export default function MembershipPage() {
  const [profile, setProfile] = useState<any>(null);
  const [activePlan, setActivePlan] = useState<MembershipPlan>('none');
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState<MembershipPlan | null>(null);
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
    } catch (error) {
      console.error('获取会员信息失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (plan: Exclude<MembershipPlan, 'none'>) => {
    setActivating(plan);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const response = await fetch('/api/membership', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, plan }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      setActivePlan(plan);
      setProfile(data.profile);
    } catch (error: any) {
      alert('激活失败: ' + error.message);
    } finally {
      setActivating(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-100 border-b-blue-600" />
      </div>
    );
  }

  const expiresAt = profile?.membership_expires_at;
  const isExpired = !expiresAt || new Date(expiresAt).getTime() <= Date.now();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="sticky top-0 z-30 border-b border-white/70 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/dashboard')} className="rounded-full px-3 py-2 text-sm font-semibold text-slate-600 outline-none transition hover:-translate-y-0.5 hover:bg-slate-100 hover:text-slate-950 active:translate-y-0 focus-visible:ring-4 focus-visible:ring-blue-100">
              ← 返回
            </button>
            <h1 className="text-xl font-black tracking-tight text-slate-950">会员中心</h1>
          </div>
          <button onClick={() => router.push('/')} className="rounded-full px-3 py-2 text-sm font-semibold text-slate-600 outline-none transition hover:-translate-y-0.5 hover:bg-slate-100 hover:text-slate-950 active:translate-y-0 focus-visible:ring-4 focus-visible:ring-blue-100">
            主页
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <section className="mb-8 rounded-[2rem] border border-white/70 bg-gradient-to-br from-amber-400 via-orange-500 to-slate-900 p-8 text-white shadow-2xl shadow-orange-900/15">
          <p className="text-sm font-bold text-amber-100">Membership</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">会员权益与套餐</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-amber-50/90">开通后可使用图片生成、PPT/PDF 导出和更多项目额度。</p>
        </section>

        <div className="mb-8 rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-xl shadow-slate-200/70">
          <h2 className="text-lg font-black text-slate-950">当前会员状态</h2>
          {activePlan !== 'none' && !isExpired ? (
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
              <div className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-700">
                {membershipPlans[activePlan].name}
              </div>
              <div className="text-sm text-slate-600">
                到期时间：<span className="font-bold text-slate-900">{new Date(expiresAt).toLocaleString('zh-CN')}</span>
              </div>
              <div className="text-sm text-slate-600">
                剩余：<span className="font-bold text-emerald-600">{Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)))} 天</span>
              </div>
            </div>
          ) : (
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
              <span className="w-fit rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600">未开通会员</span>
              <span className="text-sm text-slate-500">充值后可使用图片生成和导出功能</span>
            </div>
          )}
        </div>

        <h2 className="mb-4 text-lg font-black text-slate-950">选择套餐</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {planOrder.map((plan) => {
            const info = membershipPlans[plan];
            const isCurrent = activePlan === plan && !isExpired;
            return (
              <div
                key={plan}
                className={`rounded-3xl border bg-white/90 p-6 shadow-xl shadow-slate-200/60 transition hover:-translate-y-1 hover:shadow-2xl ${
                  isCurrent ? 'border-amber-300 ring-4 ring-amber-100' : 'border-white/80 hover:border-blue-200'
                }`}
              >
                <h3 className="text-lg font-black text-slate-950">{info.name}</h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-4xl font-black text-blue-600">¥{info.price}</span>
                  <span className="text-sm font-semibold text-slate-500">
                    /{info.days === 1 ? '天' : info.days === 7 ? '周' : info.days === 30 ? '月' : info.days === 180 ? '半年' : '年'}
                  </span>
                </div>
                <div className="mt-5 space-y-2 text-sm font-medium text-slate-700">
                  <p>✓ AI 文本生成</p>
                  <p>{info.imageLimit ? `✓ 图片生成 ${info.imageLimit}次/阶段` : '✓ 图片生成 无限次'}</p>
                  <p>✓ 导出 PPT / PDF</p>
                  <p>✓ 最多 {info.projectLimit} 个项目</p>
                </div>
                {isCurrent ? (
                  <button
                    disabled
                    className="mt-6 w-full rounded-full border border-amber-200 bg-amber-50 py-3 font-bold text-amber-700"
                  >
                    当前套餐
                  </button>
                ) : (
                  <button
                    onClick={() => handleActivate(plan)}
                    disabled={activating === plan}
                    className="mt-6 w-full rounded-full bg-blue-600 py-3 font-bold text-white shadow-lg shadow-blue-600/20 outline-none transition hover:-translate-y-0.5 hover:bg-blue-700 active:translate-y-0 focus-visible:ring-4 focus-visible:ring-blue-200 disabled:bg-blue-300 disabled:shadow-none disabled:hover:translate-y-0"
                  >
                    {activating === plan ? '开通中...' : '立即开通'}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <p className="mt-6 text-center text-sm text-slate-500">
          测试版：点击「立即开通」即可直接激活，无需真实支付
        </p>
      </main>
    </div>
  );
}
