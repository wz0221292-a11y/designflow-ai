'use client';

import type { CMF } from '@/types';
import StepHeader, { stepSubCardClass } from './StepHeader';

interface CMFStepProps {
  cmf: CMF | null;
  isLoading: boolean;
  onUpdate: (cmf: CMF) => void;
}

export default function CMFStep({ cmf, isLoading, onUpdate }: CMFStepProps) {
  const handleChange = (field: keyof CMF, value: string) => {
    onUpdate({
      ...cmf,
      primary_color: cmf?.primary_color || '',
      primary_color_hex: cmf?.primary_color_hex || '#3B82F6',
      secondary_color: cmf?.secondary_color || '',
      secondary_color_hex: cmf?.secondary_color_hex || '#F8FAFC',
      material: cmf?.material || '',
      surface_treatment: cmf?.surface_treatment || '',
      [field]: value,
    });
  };

  const hasContent = Boolean(cmf?.primary_color || cmf?.secondary_color || cmf?.material || cmf?.surface_treatment);

  if (isLoading) {
    return (
      <div className={`${stepSubCardClass} p-6 sm:p-8`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[1, 2].map((i) => (
            <div key={i} className="h-36 rounded-[1.5rem] bg-slate-100 animate-pulse" />
          ))}
        </div>
        <div className="mt-5 space-y-4">
          <div className="h-14 rounded-2xl bg-slate-100 animate-pulse" />
          <div className="h-14 rounded-2xl bg-slate-100 animate-pulse w-5/6" />
        </div>
      </div>
    );
  }

  return (
    <div className={`${stepSubCardClass} p-6 sm:p-8`}>
      <StepHeader
        title="CMF 方案"
        description="定义产品的色彩、材料与表面处理工艺"
        accent="rose"
        icon={
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485A2 2 0 015 17.828c0-.538.213-1.055.593-1.435l2.414-2.414" /></svg>
        }
      />

      {/* Status banner */}
      {hasContent && (
        <div className="mb-6 rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50 to-pink-50/50 px-5 py-3.5 text-sm font-semibold text-rose-800 flex items-center gap-3 shadow-sm">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100">
            <svg className="h-5 w-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <span>CMF 方案已填充</span>
        </div>
      )}

      <div className="space-y-5">
        {/* ── Color Swatches ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Primary color */}
          <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-md shadow-slate-200/20 transition-all focus-within:ring-2 focus-within:ring-rose-200">
            <div className="h-1.5 w-full bg-gradient-to-r from-rose-500 to-pink-500" />
            <div className="p-5">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-100 text-[10px] font-black text-rose-600">主</span>
                <span className="text-xs font-black uppercase tracking-wider text-rose-600">主色 Primary</span>
              </div>
              <div className="mb-4">
                <div
                  className="h-20 w-full rounded-xl border border-slate-200 shadow-inner transition"
                  style={{ backgroundColor: cmf?.primary_color_hex || '#3B82F6' }}
                />
              </div>
              <div className="space-y-2.5">
                <input
                  type="text"
                  value={cmf?.primary_color || ''}
                  onChange={(e) => handleChange('primary_color', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-800 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-rose-300 focus:bg-white focus:ring-2 focus:ring-rose-100"
                  placeholder="颜色名称（如：深空蓝）"
                />
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={cmf?.primary_color_hex || '#3B82F6'}
                    onChange={(e) => handleChange('primary_color_hex', e.target.value)}
                    className="h-10 w-10 cursor-pointer rounded-xl border-2 border-slate-200 shadow-sm"
                  />
                  <input
                    type="text"
                    value={cmf?.primary_color_hex || ''}
                    onChange={(e) => handleChange('primary_color_hex', e.target.value)}
                    className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 font-mono text-xs font-bold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-rose-300 focus:bg-white focus:ring-2 focus:ring-rose-100"
                    placeholder="#3B82F6"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Secondary color */}
          <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-md shadow-slate-200/20 transition-all focus-within:ring-2 focus-within:ring-slate-200">
            <div className="h-1.5 w-full bg-gradient-to-r from-slate-400 to-slate-500" />
            <div className="p-5">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-black text-slate-500">辅</span>
                <span className="text-xs font-black uppercase tracking-wider text-slate-500">辅色 Secondary</span>
              </div>
              <div className="mb-4">
                <div
                  className="h-20 w-full rounded-xl border border-slate-200 shadow-inner transition"
                  style={{ backgroundColor: cmf?.secondary_color_hex || '#F8FAFC' }}
                />
              </div>
              <div className="space-y-2.5">
                <input
                  type="text"
                  value={cmf?.secondary_color || ''}
                  onChange={(e) => handleChange('secondary_color', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-800 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-100"
                  placeholder="颜色名称（如：星空白）"
                />
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={cmf?.secondary_color_hex || '#F8FAFC'}
                    onChange={(e) => handleChange('secondary_color_hex', e.target.value)}
                    className="h-10 w-10 cursor-pointer rounded-xl border-2 border-slate-200 shadow-sm"
                  />
                  <input
                    type="text"
                    value={cmf?.secondary_color_hex || ''}
                    onChange={(e) => handleChange('secondary_color_hex', e.target.value)}
                    className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 font-mono text-xs font-bold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-100"
                    placeholder="#F8FAFC"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Material ── */}
        <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm shadow-slate-200/10 transition-all focus-within:ring-2 focus-within:ring-emerald-200">
          <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50">
              <svg className="h-3.5 w-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
            </div>
            <label className="text-xs font-black uppercase tracking-wider text-emerald-600">材料</label>
          </div>
          <input
            type="text"
            value={cmf?.material || ''}
            onChange={(e) => handleChange('material', e.target.value)}
            className="w-full border-none bg-white px-5 py-4 text-sm font-bold text-slate-800 outline-none placeholder:font-medium placeholder:text-slate-400 focus:ring-0"
            placeholder="如：ABS 塑料、铝合金、玻璃、硅胶"
          />
        </div>

        {/* ── Surface Treatment ── */}
        <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm shadow-slate-200/10 transition-all focus-within:ring-2 focus-within:ring-amber-200">
          <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50">
              <svg className="h-3.5 w-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
            </div>
            <label className="text-xs font-black uppercase tracking-wider text-amber-600">表面处理</label>
          </div>
          <input
            type="text"
            value={cmf?.surface_treatment || ''}
            onChange={(e) => handleChange('surface_treatment', e.target.value)}
            className="w-full border-none bg-white px-5 py-4 text-sm font-bold text-slate-800 outline-none placeholder:font-medium placeholder:text-slate-400 focus:ring-0"
            placeholder="如：磨砂、高光、阳极氧化、喷涂、电镀"
          />
        </div>
      </div>
    </div>
  );
}
