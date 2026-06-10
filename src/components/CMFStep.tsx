'use client';

import type { CMF } from '@/types';
import StepHeader, { stepSubCardClass } from './StepHeader';

interface CMFStepProps {
  cmf: CMF | null;
  isLoading: boolean;
  onUpdate: (cmf: CMF) => void;
}

export default function CMFStep({ cmf, isLoading, onUpdate }: CMFStepProps) {
  const defaults: CMF = {
    primary_color: '', primary_color_hex: '#6366F1',
    secondary_color: '', secondary_color_hex: '#F1F5F9',
    material: '', surface_treatment: '',
  };
  const c = { ...defaults, ...cmf };

  const handleChange = (field: keyof CMF, value: string) => {
    onUpdate({ ...c, [field]: value });
  };

  const primaryHex = c.primary_color_hex;
  const secondaryHex = c.secondary_color_hex;

  if (isLoading) {
    return (
      <div className={`${stepSubCardClass} p-6 sm:p-8`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="h-52 rounded-[1.75rem] bg-gradient-to-br from-slate-100 to-slate-200 animate-pulse" />
          ))}
        </div>
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-20 rounded-2xl bg-slate-100 animate-pulse" />
          <div className="h-20 rounded-2xl bg-slate-100 animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className={`${stepSubCardClass} p-6 sm:p-8`}>
      <StepHeader
        title="CMF 方案"
        description="色彩搭配 · 材料选择 · 表面处理工艺"
        accent="rose"
        icon={
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485A2 2 0 015 17.828c0-.538.213-1.055.593-1.435l2.414-2.414" /></svg>
        }
        action={
          (c.primary_color || c.material) ? (
            <div className="flex items-center gap-2 rounded-full bg-rose-50 px-4 py-2 text-sm font-bold text-rose-600">
              <span className="flex h-2.5 w-2.5 rounded-full bg-rose-500" />
              CMF 已配置
            </div>
          ) : undefined
        }
      />

      {/* ── 色彩方案 ── */}
      <section className="mb-6">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-rose-500 text-white text-[10px] font-black">C</span>
          <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">色彩方案</h3>
          <span className="h-px flex-1 bg-slate-100" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Primary */}
          <div className="group overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-white shadow-md shadow-slate-200/10 transition hover:shadow-lg">
            <div className="relative h-40 flex items-end overflow-hidden" style={{ backgroundColor: primaryHex }}>
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-white/10" />
              <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-white/8" />
              <div className="relative z-10 flex items-center justify-between w-full px-5 pb-4">
                <span className="rounded-full bg-white/25 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-white backdrop-blur-sm">主色</span>
                <span className="rounded-full bg-black/10 px-3 py-1 font-mono text-[10px] font-bold text-white/90 backdrop-blur-sm">{primaryHex}</span>
              </div>
            </div>
            <div className="p-4">
              <input type="text" value={c.primary_color || ''} onChange={(e) => handleChange('primary_color', e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-rose-300 focus:bg-white focus:ring-4 focus:ring-rose-50"
                placeholder="颜色名称（如：深空蓝）" />
              <div className="mt-2 flex items-center gap-2">
                <input type="color" value={primaryHex} onChange={(e) => handleChange('primary_color_hex', e.target.value)}
                  className="h-9 w-9 cursor-pointer rounded-lg border-0 shadow-sm" />
                <input type="text" value={primaryHex} onChange={(e) => handleChange('primary_color_hex', e.target.value)}
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-[11px] font-bold text-slate-500 outline-none transition focus:border-rose-300 focus:bg-white focus:ring-4 focus:ring-rose-50" />
              </div>
            </div>
          </div>
          {/* Secondary */}
          <div className="group overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-white shadow-md shadow-slate-200/10 transition hover:shadow-lg">
            <div className="relative h-40 flex items-end overflow-hidden border-b border-slate-200" style={{ backgroundColor: secondaryHex }}>
              <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-white/5" />
              <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/15" />
              <div className="relative z-10 flex items-center justify-between w-full px-5 pb-4">
                <span className="rounded-full bg-black/8 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-800 backdrop-blur-sm">辅色</span>
                <span className="rounded-full bg-white/10 px-3 py-1 font-mono text-[10px] font-bold text-slate-700 backdrop-blur-sm">{secondaryHex}</span>
              </div>
            </div>
            <div className="p-4">
              <input type="text" value={c.secondary_color || ''} onChange={(e) => handleChange('secondary_color', e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-50"
                placeholder="颜色名称（如：星空白）" />
              <div className="mt-2 flex items-center gap-2">
                <input type="color" value={secondaryHex} onChange={(e) => handleChange('secondary_color_hex', e.target.value)}
                  className="h-9 w-9 cursor-pointer rounded-lg border-0 shadow-sm" />
                <input type="text" value={secondaryHex} onChange={(e) => handleChange('secondary_color_hex', e.target.value)}
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-[11px] font-bold text-slate-500 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-4 focus:ring-slate-50" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 材质与工艺 ── */}
      <section>
        <div className="mb-4 flex items-center gap-2.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500 text-white text-[10px] font-black">M</span>
          <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">材质与工艺</h3>
          <span className="h-px flex-1 bg-slate-100" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="rounded-[1.5rem] border border-emerald-100 bg-white p-6 shadow-sm transition-all focus-within:ring-4 focus-within:ring-emerald-50">
            <div className="flex items-center gap-3 mb-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-sm"><svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg></span>
              <label className="text-[10px] font-black uppercase tracking-[0.15em] text-emerald-600">材料 Material</label>
            </div>
            <textarea value={c.material || ''} onChange={(e) => handleChange('material', e.target.value)}
              className="h-24 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium leading-6 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-300 focus:bg-white focus:ring-4 focus:ring-emerald-50"
              placeholder="ABS 塑料 · 6061 铝合金 · 钢化玻璃 · 食品级硅胶…" />
          </div>
          <div className="rounded-[1.5rem] border border-amber-100 bg-white p-6 shadow-sm transition-all focus-within:ring-4 focus-within:ring-amber-50">
            <div className="flex items-center gap-3 mb-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm"><svg className="h-[18px] w-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg></span>
              <label className="text-[10px] font-black uppercase tracking-[0.15em] text-amber-600">表面处理 Finish</label>
            </div>
            <textarea value={c.surface_treatment || ''} onChange={(e) => handleChange('surface_treatment', e.target.value)}
              className="h-24 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium leading-6 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-amber-300 focus:bg-white focus:ring-4 focus:ring-amber-50"
              placeholder="磨砂哑光 · 高光镜面 · 阳极氧化 · 类肤涂层…" />
          </div>
        </div>
      </section>
    </div>
  );
}
