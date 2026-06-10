'use client';

import type { ProductIntro } from '@/types';
import StepHeader, { stepSubCardClass } from './StepHeader';

interface ProductIntroStepProps {
  data: ProductIntro | null;
  isLoading: boolean;
  onUpdate: (data: ProductIntro) => void;
}

const charLimit = (text: string, max: number) => {
  const len = (text || '').length;
  if (len === 0) return null;
  const pct = Math.min(100, Math.round((len / max) * 100));
  const color = len > max ? 'text-red-500' : len > max * 0.9 ? 'text-amber-500' : 'text-slate-400';
  return { len, pct, color };
};

const CharCounter = ({ text, max }: { text: string; max: number }) => {
  const info = charLimit(text, max);
  if (!info) return null;
  return (
    <div className="flex items-center gap-1.5 mt-1.5">
      <div className="h-1 flex-1 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${info.len > max ? 'bg-red-400' : info.len > max * 0.9 ? 'bg-amber-400' : 'bg-indigo-400'}`}
          style={{ width: `${info.pct}%` }}
        />
      </div>
      <span className={`text-[10px] font-bold tabular-nums ${info.color}`}>
        {info.len}/{max}
      </span>
    </div>
  );
};

const sectionLabel = (icon: string, color: string, text: string) => (
  <div className="flex items-center gap-2 mb-3">
    <span className={`flex h-7 w-7 items-center justify-center rounded-lg bg-${color}-500 text-white text-xs`}>{icon}</span>
    <span className={`text-[11px] font-black uppercase tracking-[0.15em] text-${color}-600`}>{text}</span>
  </div>
);

export default function ProductIntroStep({ data, isLoading, onUpdate }: ProductIntroStepProps) {
  const defaults: ProductIntro = {
    name: '', tagline: '', target_users: '', problem: '',
    features: [], advantages: '', scenario: '',
  };
  const d = { ...defaults, ...data };

  const handleChange = (field: keyof ProductIntro, value: string | string[]) => {
    onUpdate({ ...d, [field]: value } as ProductIntro);
  };

  const features = d.features || [];
  const filledFeatures = features.filter(Boolean).length;

  const handleFeatureChange = (index: number, value: string) => {
    const next = [...features];
    next[index] = value;
    handleChange('features', next);
  };
  const addFeature = () => handleChange('features', [...features, '']);
  const removeFeature = (index: number) => handleChange('features', features.filter((_, i) => i !== index));

  const filledCount = [d.name, d.tagline, d.target_users, d.problem, d.advantages, d.scenario]
    .filter(Boolean).length + (filledFeatures > 0 ? 1 : 0);
  const totalFields = 7;

  if (isLoading) {
    return (
      <div className={`${stepSubCardClass} p-6 sm:p-8`}>
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-5">
            <div className="h-20 rounded-[1.5rem] bg-gradient-to-br from-slate-100 to-slate-200 animate-pulse" />
            <div className="hidden sm:block w-px bg-slate-100" />
            <div className="h-20 rounded-[1.5rem] bg-gradient-to-br from-slate-100 to-slate-200 animate-pulse" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="h-24 rounded-[1.5rem] bg-gradient-to-br from-slate-100 to-slate-200 animate-pulse" />
            <div className="h-24 rounded-[1.5rem] bg-gradient-to-br from-slate-100 to-slate-200 animate-pulse" />
          </div>
          <div className="h-32 rounded-[1.5rem] bg-gradient-to-br from-slate-100 to-slate-200 animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="h-28 rounded-[1.5rem] bg-gradient-to-br from-slate-100 to-slate-200 animate-pulse" />
            <div className="h-28 rounded-[1.5rem] bg-gradient-to-br from-slate-100 to-slate-200 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${stepSubCardClass} p-6 sm:p-8`}>
      <StepHeader
        title="产品介绍"
        description="定义产品身份、用户、功能和市场定位"
        accent="indigo"
        icon={
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        }
        action={
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1.5 text-[11px] font-bold text-indigo-500">
              <span className="flex h-1.5 w-1.5 rounded-full bg-indigo-400" />
              {filledCount}/{totalFields} 项
            </div>
            {Boolean(d.name) && (
              <span className="hidden sm:inline text-[13px] font-bold text-slate-600 truncate max-w-[160px]">{d.name}</span>
            )}
          </div>
        }
      />

      <div className="space-y-5">
        {/* ── Row 1: 产品名称 + 一句话定位 ── */}
        <div className="grid gap-5 sm:grid-cols-[1fr_auto_1fr]">
          <div className={`rounded-[1.5rem] border bg-white p-5 shadow-sm transition-all focus-within:ring-4 ${
            d.name ? 'border-indigo-200 ring-indigo-50/0' : 'border-dashed border-slate-300 bg-slate-50/50'
          }`}>
            <label className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-indigo-600">
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
              产品名称
            </label>
            <input type="text" value={d.name} onChange={(e) => handleChange('name', e.target.value)}
              className="mt-2.5 w-full border-none bg-transparent text-2xl font-black tracking-tight text-slate-950 outline-none placeholder:font-bold placeholder:text-slate-300 focus:ring-0"
              placeholder="为产品命名" />
            <CharCounter text={d.name} max={12} />
          </div>
          <div className="hidden sm:flex items-center justify-center">
            <div className="h-12 w-px bg-gradient-to-b from-transparent via-slate-200 to-transparent" />
          </div>
          <div className={`rounded-[1.5rem] border bg-white p-5 shadow-sm transition-all focus-within:ring-4 ${
            d.tagline ? 'border-amber-200 ring-amber-50/0' : 'border-dashed border-slate-300 bg-slate-50/50'
          }`}>
            <label className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-amber-700">
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
              一句话定位
            </label>
            <input type="text" value={d.tagline} onChange={(e) => handleChange('tagline', e.target.value)}
              className="mt-2.5 w-full border-none bg-transparent text-lg font-bold text-slate-700 outline-none placeholder:font-semibold placeholder:text-slate-300 focus:ring-0"
              placeholder="核心价值主张" />
            <CharCounter text={d.tagline} max={30} />
          </div>
        </div>

        {/* ── Row 2: 目标用户 + 核心问题 ── */}
        <div className="grid gap-5 sm:grid-cols-2">
          <div className={`rounded-[1.5rem] border bg-white p-5 shadow-sm transition-all focus-within:ring-4 ${
            d.target_users ? 'border-sky-200 ring-sky-50/0' : 'border-dashed border-slate-300 bg-slate-50/50'
          }`}>
            <label className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-sky-700">👤 目标用户</label>
            <textarea value={d.target_users} onChange={(e) => handleChange('target_users', e.target.value)}
              className="mt-2.5 h-24 w-full resize-none border-none bg-transparent text-sm font-medium leading-6 text-slate-700 outline-none placeholder:font-medium placeholder:text-slate-300 focus:ring-0"
              placeholder="谁会使用这个产品？描述典型用户画像、年龄段、职业特征…" />
            <CharCounter text={d.target_users} max={120} />
          </div>
          <div className={`rounded-[1.5rem] border bg-white p-5 shadow-sm transition-all focus-within:ring-4 ${
            d.problem ? 'border-orange-200 ring-orange-50/0' : 'border-dashed border-slate-300 bg-slate-50/50'
          }`}>
            <label className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-orange-700">⚡ 核心痛点</label>
            <textarea value={d.problem} onChange={(e) => handleChange('problem', e.target.value)}
              className="mt-2.5 h-24 w-full resize-none border-none bg-transparent text-sm font-medium leading-6 text-slate-700 outline-none placeholder:font-medium placeholder:text-slate-300 focus:ring-0"
              placeholder="产品要解决什么具体问题？用户当前有什么困扰？" />
            <CharCounter text={d.problem} max={120} />
          </div>
        </div>

        {/* ── Row 3: 核心功能 ── */}
        <section className="overflow-hidden rounded-[1.5rem] border border-emerald-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-emerald-50 bg-gradient-to-r from-emerald-50 to-teal-50/50 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-3 py-1.5 text-white">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                <span className="text-sm font-black">{filledFeatures}</span>
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">核心功能</h3>
                <p className="text-[11px] font-medium text-slate-500">{filledFeatures > 0 ? `${filledFeatures} 项功能已填写` : '产品能力的清晰表达'}</p>
              </div>
            </div>
            {features.length < 8 && (
              <button onClick={addFeature} className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3.5 py-2 text-[11px] font-bold text-white shadow-sm outline-none transition hover:bg-emerald-700 active:scale-[0.97]">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/></svg>
                添加
              </button>
            )}
          </div>
          <div className="p-4 space-y-2">
            {features.map((f, i) => (
              <div key={i} className={`group flex items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
                f ? 'border-emerald-100 bg-white hover:shadow-sm' : 'border-dashed border-slate-200 bg-slate-50/50'
              }`}>
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[10px] font-black text-white ${
                  ['bg-emerald-500','bg-teal-500','bg-cyan-500','bg-sky-500','bg-blue-500','bg-indigo-500','bg-violet-500','bg-purple-500'][i % 8]
                }`}>{i + 1}</span>
                <input type="text" value={f} onChange={(e) => handleFeatureChange(i, e.target.value)}
                  className="flex-1 border-none bg-transparent text-[13px] font-semibold text-slate-800 outline-none placeholder:font-medium placeholder:text-slate-400 focus:ring-0"
                  placeholder={`功能 ${i + 1}：描述产品的一个核心能力`} />
                <button onClick={() => removeFeature(i)} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-300 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100">
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>
            ))}
            {features.length === 0 && (
              <div className="rounded-xl border-2 border-dashed border-slate-200 py-10 text-center">
                <div className="mb-2 flex justify-center">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-500">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
                  </span>
                </div>
                <p className="text-sm font-bold text-slate-400">点击右上角「添加」开始填写核心功能</p>
                <p className="mt-1 text-[11px] font-medium text-slate-300">AI 会自动为每个功能项生成合理描述</p>
              </div>
            )}
          </div>
        </section>

        {/* ── Row 4: 核心优势 + 使用场景 ── */}
        <div className="grid gap-5 sm:grid-cols-2">
          <div className={`rounded-[1.5rem] border bg-white p-5 shadow-sm transition-all focus-within:ring-4 ${
            d.advantages ? 'border-violet-200 ring-violet-50/0' : 'border-dashed border-slate-300 bg-slate-50/50'
          }`}>
            <label className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-violet-700">✨ 核心优势</label>
            <textarea value={d.advantages} onChange={(e) => handleChange('advantages', e.target.value)}
              className="mt-2.5 h-28 w-full resize-none border-none bg-transparent text-sm font-medium leading-6 text-slate-700 outline-none placeholder:font-medium placeholder:text-slate-300 focus:ring-0"
              placeholder="与竞品相比，差异化优势在哪里？技术、体验、成本、生态…" />
            <CharCounter text={d.advantages} max={150} />
          </div>
          <div className={`rounded-[1.5rem] border bg-white p-5 shadow-sm transition-all focus-within:ring-4 ${
            d.scenario ? 'border-rose-200 ring-rose-50/0' : 'border-dashed border-slate-300 bg-slate-50/50'
          }`}>
            <label className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-rose-700">📍 使用场景</label>
            <textarea value={d.scenario} onChange={(e) => handleChange('scenario', e.target.value)}
              className="mt-2.5 h-28 w-full resize-none border-none bg-transparent text-sm font-medium leading-6 text-slate-700 outline-none placeholder:font-medium placeholder:text-slate-300 focus:ring-0"
              placeholder="描述典型使用情境：谁在什么情况下如何使用？从触发到结束的完整流程…" />
            <CharCounter text={d.scenario} max={200} />
          </div>
        </div>
      </div>
    </div>
  );
}
