'use client';

import type { ProductIntro } from '@/types';
import StepHeader, { stepSubCardClass } from './StepHeader';

interface ProductIntroStepProps {
  data: ProductIntro | null;
  isLoading: boolean;
  onUpdate: (data: ProductIntro) => void;
}

export default function ProductIntroStep({ data, isLoading, onUpdate }: ProductIntroStepProps) {
  const defaults: ProductIntro = {
    name: '', tagline: '', target_users: '', problem: '',
    features: [], advantages: '', scenario: '',
  };
  const d = { ...defaults, ...data };

  const handleChange = (field: keyof ProductIntro, value: string | string[]) => {
    onUpdate({ ...d, [field]: value } as ProductIntro);
  };

  const features = d.features;
  const filledFeatures = features.filter(Boolean).length;

  const handleFeatureChange = (index: number, value: string) => {
    const next = [...features];
    next[index] = value;
    handleChange('features', next);
  };
  const addFeature = () => handleChange('features', [...features, '']);
  const removeFeature = (index: number) => handleChange('features', features.filter((_, i) => i !== index));

  if (isLoading) {
    return (
      <div className={`${stepSubCardClass} p-6 sm:p-8`}>
        <div className="space-y-6">
          <div className="h-20 rounded-[1.5rem] bg-gradient-to-br from-slate-100 to-slate-200 animate-pulse" />
          <div className="h-20 rounded-[1.5rem] bg-gradient-to-br from-slate-100 to-slate-200 animate-pulse w-4/5" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-14 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 animate-pulse" />
            ))}
          </div>
          <div className="h-36 rounded-[1.5rem] bg-gradient-to-br from-slate-100 to-slate-200 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className={`${stepSubCardClass} p-6 sm:p-8`}>
      <StepHeader
        title="产品介绍"
        description="产品名称 · 定位 · 目标用户 · 痛点 · 核心功能 · 优势 · 使用场景"
        accent="indigo"
        icon={
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        }
        action={
          Boolean(d.name) ? (
            <div className="flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-600">
              <span className="flex h-2.5 w-2.5 rounded-full bg-indigo-500" />
              {d.name}
            </div>
          ) : undefined
        }
      />

      <div className="space-y-6">
        {/* ── Identity: Name + Tagline ── */}
        <div className="grid gap-5 sm:grid-cols-[1fr_auto_1fr]">
          <div className="rounded-[1.5rem] border border-indigo-100 bg-white p-6 shadow-sm transition-all focus-within:ring-4 focus-within:ring-indigo-50">
            <label className="mb-1 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-indigo-500">产品名称</label>
            <input type="text" value={d.name} onChange={(e) => handleChange('name', e.target.value)}
              className="mt-3 w-full border-none bg-transparent text-2xl font-black tracking-tight text-slate-950 outline-none placeholder:font-bold placeholder:text-slate-300 focus:ring-0"
              placeholder="为产品命名" />
          </div>
          <div className="hidden sm:block w-px bg-gradient-to-b from-transparent via-slate-200 to-transparent" />
          <div className="rounded-[1.5rem] border border-amber-100 bg-white p-6 shadow-sm transition-all focus-within:ring-4 focus-within:ring-amber-50">
            <label className="mb-1 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-amber-600">一句话定位</label>
            <input type="text" value={d.tagline} onChange={(e) => handleChange('tagline', e.target.value)}
              className="mt-3 w-full border-none bg-transparent text-lg font-bold text-slate-700 outline-none placeholder:font-semibold placeholder:text-slate-300 focus:ring-0"
              placeholder="核心价值主张" />
          </div>
        </div>

        {/* ── Target Users + Problem ── */}
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="rounded-[1.5rem] border border-sky-100 bg-white p-6 shadow-sm transition-all focus-within:ring-4 focus-within:ring-sky-50">
            <label className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-sky-600">👤 目标用户</label>
            <textarea value={d.target_users} onChange={(e) => handleChange('target_users', e.target.value)}
              className="mt-3 h-24 w-full resize-none border-none bg-transparent text-sm font-medium leading-6 text-slate-700 outline-none placeholder:font-medium placeholder:text-slate-300 focus:ring-0"
              placeholder="谁会使用这个产品？描述典型用户画像…" />
          </div>
          <div className="rounded-[1.5rem] border border-orange-100 bg-white p-6 shadow-sm transition-all focus-within:ring-4 focus-within:ring-orange-50">
            <label className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-orange-600">⚡ 核心问题</label>
            <textarea value={d.problem} onChange={(e) => handleChange('problem', e.target.value)}
              className="mt-3 h-24 w-full resize-none border-none bg-transparent text-sm font-medium leading-6 text-slate-700 outline-none placeholder:font-medium placeholder:text-slate-300 focus:ring-0"
              placeholder="产品要解决什么具体问题或痛点？" />
          </div>
        </div>

        {/* ── Features ── */}
        <section className="overflow-hidden rounded-[1.5rem] border border-emerald-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-emerald-50 bg-emerald-50/30 px-6 py-4">
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500 text-white text-sm font-black">{filledFeatures}</span>
              <div><h3 className="text-sm font-black text-slate-900">核心功能</h3><p className="text-[11px] font-medium text-slate-500">产品能力的清晰表达</p></div>
            </div>
            {features.length < 8 && (
              <button onClick={addFeature} className="rounded-full bg-emerald-600 px-4 py-2 text-[11px] font-bold text-white shadow-sm outline-none transition hover:bg-emerald-700 active:scale-[0.97]">+ 添加</button>
            )}
          </div>
          <div className="p-4 space-y-2">
            {features.map((f, i) => (
              <div key={i} className="group flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3 transition hover:border-emerald-100 hover:bg-white">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-[10px] font-black text-white">{i + 1}</span>
                <input type="text" value={f} onChange={(e) => handleFeatureChange(i, e.target.value)}
                  className="flex-1 border-none bg-transparent text-sm font-semibold text-slate-800 outline-none placeholder:text-slate-400 focus:ring-0"
                  placeholder={`功能 ${i + 1}`} />
                <button onClick={() => removeFeature(i)} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-300 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"><svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/></svg></button>
              </div>
            ))}
            {features.length === 0 && (
              <div className="rounded-xl border-2 border-dashed border-slate-200 py-10 text-center">
                <p className="text-sm font-bold text-slate-400">点击右上角「+ 添加」开始填写核心功能</p>
              </div>
            )}
          </div>
        </section>

        {/* ── Advantages + Scenario ── */}
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="rounded-[1.5rem] border border-violet-100 bg-white p-6 shadow-sm transition-all focus-within:ring-4 focus-within:ring-violet-50">
            <label className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-violet-600">✨ 核心优势</label>
            <textarea value={d.advantages} onChange={(e) => handleChange('advantages', e.target.value)}
              className="mt-3 h-28 w-full resize-none border-none bg-transparent text-sm font-medium leading-6 text-slate-700 outline-none placeholder:font-medium placeholder:text-slate-300 focus:ring-0"
              placeholder="与竞品相比，差异化优势在哪里？" />
          </div>
          <div className="rounded-[1.5rem] border border-rose-100 bg-white p-6 shadow-sm transition-all focus-within:ring-4 focus-within:ring-rose-50">
            <label className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-rose-600">📍 使用场景</label>
            <textarea value={d.scenario} onChange={(e) => handleChange('scenario', e.target.value)}
              className="mt-3 h-28 w-full resize-none border-none bg-transparent text-sm font-medium leading-6 text-slate-700 outline-none placeholder:font-medium placeholder:text-slate-300 focus:ring-0"
              placeholder="描述典型使用情境：谁在什么情况下如何使用？" />
          </div>
        </div>
      </div>
    </div>
  );
}
