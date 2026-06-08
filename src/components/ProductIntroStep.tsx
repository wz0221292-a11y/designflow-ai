'use client';

import type { ProductIntro } from '@/types';
import StepHeader, { stepInputClass, stepSubCardClass } from './StepHeader';

interface ProductIntroStepProps {
  data: ProductIntro | null;
  isLoading: boolean;
  onUpdate: (data: ProductIntro) => void;
}

export default function ProductIntroStep({ data, isLoading, onUpdate }: ProductIntroStepProps) {
  const handleChange = (field: keyof ProductIntro, value: string | string[]) => {
    onUpdate({
      ...data,
      name: data?.name || '',
      tagline: data?.tagline || '',
      features: data?.features || [],
      scenario: data?.scenario || '',
      [field]: value,
    });
  };

  const handleFeatureChange = (index: number, value: string) => {
    const newFeatures = [...(data?.features || [])];
    newFeatures[index] = value;
    handleChange('features', newFeatures);
  };

  const addFeature = () => {
    const newFeatures = [...(data?.features || []), ''];
    handleChange('features', newFeatures);
  };

  const removeFeature = (index: number) => {
    const newFeatures = (data?.features || []).filter((_, i) => i !== index);
    handleChange('features', newFeatures);
  };

  const hasContent = Boolean(data?.name || data?.tagline || (data?.features?.length && data.features.some(Boolean)) || data?.scenario);

  return (
    <div className={`${stepSubCardClass} p-6 sm:p-8`}>
      <StepHeader
        title="产品介绍"
        description="定义产品名称、定位、核心功能与使用场景"
        accent="indigo"
        icon={
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
        }
      />

      {/* Status banner */}
      {hasContent && (
        <div className="mb-6 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-blue-50/50 px-5 py-3.5 text-sm font-semibold text-indigo-800 flex items-center gap-3 shadow-sm">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100">
            <svg className="h-5 w-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <span>产品介绍已填充，可继续编辑优化</span>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-6">
          <div className="h-16 rounded-[1.25rem] bg-slate-100 animate-pulse" />
          <div className="h-16 rounded-[1.25rem] bg-slate-100 animate-pulse w-5/6" />
          <div className="h-40 rounded-[1.25rem] bg-slate-100 animate-pulse" />
        </div>
      ) : (
        <div className="space-y-5">
          {/* ── Product Name ── */}
          <div className="group overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-md shadow-slate-200/20 transition-all focus-within:border-indigo-300 focus-within:shadow-lg focus-within:shadow-indigo-100/20 focus-within:ring-2 focus-within:ring-indigo-200">
            <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 to-blue-500" />
            <div className="px-5 py-4">
              <div className="mb-2.5 flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50">
                  <svg className="h-3.5 w-3.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                </div>
                <label className="text-xs font-black uppercase tracking-wider text-indigo-600">产品名称</label>
              </div>
              <input
                type="text"
                value={data?.name || ''}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full border-none bg-transparent text-xl font-black text-slate-950 outline-none placeholder:font-bold placeholder:text-slate-300 focus:ring-0"
                placeholder="为你的产品取一个名字"
              />
            </div>
          </div>

          {/* ── Tagline ── */}
          <div className="group overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm shadow-slate-200/10 transition-all focus-within:border-indigo-300 focus-within:shadow-md focus-within:ring-2 focus-within:ring-indigo-200">
            <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50">
                <svg className="h-3.5 w-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
              </div>
              <label className="text-xs font-black uppercase tracking-wider text-amber-600">一句话定位</label>
            </div>
            <input
              type="text"
              value={data?.tagline || ''}
              onChange={(e) => handleChange('tagline', e.target.value)}
              className="w-full border-none bg-white px-5 py-4 text-sm font-bold text-slate-800 outline-none placeholder:font-medium placeholder:text-slate-400 focus:ring-0"
              placeholder="用一句话简洁描述产品定位和价值主张"
            />
          </div>

          {/* ── Features ── */}
          <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm shadow-slate-200/10">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50">
                  <svg className="h-3.5 w-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
                </div>
                <label className="text-xs font-black uppercase tracking-wider text-emerald-600">核心功能</label>
              </div>
              <span className="text-[10px] font-bold text-slate-400">{(data?.features || []).filter(Boolean).length} 项</span>
            </div>
            <div className="space-y-2 p-4">
              {(data?.features || []).map((feature, index) => (
                <div key={index} className="group/item flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-black text-slate-500 transition group-hover/item:bg-emerald-100 group-hover/item:text-emerald-600">
                    {index + 1}
                  </span>
                  <input
                    type="text"
                    value={feature}
                    onChange={(e) => handleFeatureChange(index, e.target.value)}
                    className={`flex-1 rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:bg-white focus:ring-2 focus:ring-emerald-100`}
                    placeholder={`功能 ${index + 1}`}
                  />
                  <button
                    onClick={() => removeFeature(index)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-slate-300 transition hover:bg-red-50 hover:text-red-500"
                    aria-label="删除功能"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
              {(data?.features || []).length < 8 && (
                <button
                  onClick={addFeature}
                  className="mt-1 inline-flex items-center gap-2 rounded-xl border-2 border-dashed border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-500 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-600"
                >
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  添加功能
                </button>
              )}
            </div>
          </div>

          {/* ── Scenario ── */}
          <div className="group overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm shadow-slate-200/10 transition-all focus-within:border-indigo-300 focus-within:shadow-md focus-within:ring-2 focus-within:ring-indigo-200">
            <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50">
                <svg className="h-3.5 w-3.5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </div>
              <label className="text-xs font-black uppercase tracking-wider text-rose-600">使用场景</label>
            </div>
            <textarea
              value={data?.scenario || ''}
              onChange={(e) => handleChange('scenario', e.target.value)}
              className="h-28 w-full resize-none border-none bg-white px-5 py-4 text-sm font-medium leading-relaxed text-slate-800 outline-none placeholder:font-medium placeholder:text-slate-400 focus:ring-0"
              placeholder="描述用户会在什么样的情境下使用这个产品"
            />
          </div>
        </div>
      )}
    </div>
  );
}
