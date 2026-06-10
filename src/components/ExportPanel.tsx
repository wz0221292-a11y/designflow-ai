'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { Project } from '@/types';
import StepHeader, { stepSubCardClass } from './StepHeader';

interface ExportPanelProps {
  project: Project;
  selectedAppearance?: string | null;
  onExportingChange?: (exporting: boolean) => void;
}

const SECTIONS = [
  { key: 'background', label: '背景研究', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', accent: 'bg-blue-50 text-blue-600 border-blue-200', dot: 'bg-blue-500' },
  { key: 'product_intro', label: '产品介绍', icon: 'M13 10V3L4 14h7v7l9-11h-7z', accent: 'bg-blue-50 text-indigo-600 border-indigo-200', dot: 'bg-blue-500' },
  { key: 'personas', label: '用户画像', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', accent: 'bg-violet-50 text-violet-600 border-violet-200', dot: 'bg-violet-500' },
  { key: 'appearance', label: '外观设计', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z', accent: 'bg-cyan-50 text-cyan-600 border-cyan-200', dot: 'bg-cyan-500' },
  { key: 'cmf', label: 'CMF 方案', icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01', accent: 'bg-red-50 text-red-600 border-rose-200', dot: 'bg-red-500' },
  { key: 'storyboard', label: '故事板', icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z', accent: 'bg-amber-50 text-amber-600 border-[#78350f]', dot: 'bg-amber-500' },
  { key: 'exploded_view', label: '爆炸图', icon: 'M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z', accent: 'bg-orange-50 text-orange-600 border-orange-200', dot: 'bg-orange-500' },
];

export default function ExportPanel({ project, selectedAppearance, onExportingChange }: ExportPanelProps) {
  const [exporting, setExporting] = useState(false);
  const [exportType, setExportType] = useState<'ppt' | 'pdf' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [includeSections, setIncludeSections] = useState<Record<string, boolean>>({
    background: true,
    product_intro: true,
    personas: true,
    appearance: true,
    cmf: true,
    storyboard: true,
    exploded_view: true,
  });

  const toggleSection = (section: string) => {
    setIncludeSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleExport = async (type: 'ppt' | 'pdf') => {
    setExporting(true);
    setExportType(type);
    setError(null);
    onExportingChange?.(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const response = await fetch(`/api/export/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: project.id, selectedAppearance, includeSections }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || '导出失败');
      }

      const blob = await response.blob();
      const extension = type === 'ppt' ? 'pptx' : 'pdf';
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.product_intro?.name || 'design'}.${extension}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setExporting(false);
      setExportType(null);
      onExportingChange?.(false);
    }
  };

  const sectionChecks = SECTIONS.map((s) => {
    const hasContent = s.key === 'background' ? !!project.background :
      s.key === 'product_intro' ? !!project.product_intro :
      s.key === 'personas' ? !!project.personas?.length :
      s.key === 'appearance' ? !!project.appearance_images?.length :
      s.key === 'cmf' ? !!project.cmf :
      s.key === 'storyboard' ? !!project.storyboard_images?.length :
      !!project.exploded_view_image;
    return { ...s, hasContent };
  });

  const completedCount = sectionChecks.filter((s) => s.hasContent).length;
  const selectedCount = sectionChecks.filter((s) => s.hasContent && includeSections[s.key]).length;

  return (
    <div className={`${stepSubCardClass} p-6 sm:p-8`}>
      <StepHeader
        title="导出设计方案"
        description="将项目整理为可汇报、可打印的专业文档"
        accent="emerald"
        icon={
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
        }
        action={
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-500">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
              已完成 {completedCount}/7
            </div>
          </div>
        }
      />

      {/* Error */}
      {error && (
        <div className="mb-8 rounded-2xl border border-red-200 bg-gradient-to-br from-red-50 to-red-50/50 px-5 py-4 text-sm font-semibold text-red-600 flex items-center gap-3 shadow-sm">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100">
            <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <span>{error}</span>
        </div>
      )}

      {/* ===== Section selectors ===== */}
      <div className="mb-8">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100">
              <svg className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            </div>
            <h3 className="text-base font-black text-slate-950">选择导出内容</h3>
            <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600">
              已选 {selectedCount} 项
            </span>
          </div>
          <button
            onClick={() => {
              const allOn = SECTIONS.every((s) => includeSections[s.key]);
              const next: Record<string, boolean> = {};
              SECTIONS.forEach((s) => {
                next[s.key] = !allOn;
              });
              setIncludeSections(next);
            }}
            className="text-[11px] font-bold text-slate-500 transition hover:text-slate-700"
          >
            {SECTIONS.every((s) => includeSections[s.key]) ? '取消全选' : '全选'}
          </button>
        </div>

        {/* Content grid as cards */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
          {sectionChecks.map((item) => (
            <button
              key={item.key}
              onClick={() => item.hasContent && toggleSection(item.key)}
              disabled={!item.hasContent}
              className={`group relative flex flex-col items-center gap-2 rounded-2xl border-2 p-3.5 text-center transition-all duration-200 select-none ${
                !item.hasContent
                  ? 'border-slate-200 bg-white/50 opacity-40 cursor-not-allowed'
                  : includeSections[item.key]
                  ? `border-current bg-white shadow-md shadow-slate-200/40 -translate-y-0.5 ${item.accent}`
                  : 'border-slate-200 bg-white hover:border-slate-200 hover:shadow-sm hover:-translate-y-0.5'
              }`}
            >
              {/* Status dot */}
              {item.hasContent && (
                <div className={`absolute top-2 right-2 h-2 w-2 rounded-full transition ${
                  includeSections[item.key] ? item.dot : 'bg-[#2a2a40]'
                }`} />
              )}
              {/* Icon */}
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl border transition ${
                item.hasContent
                  ? includeSections[item.key]
                    ? item.accent
                    : 'border-slate-200 bg-white text-slate-500'
                  : 'border-slate-200 bg-white text-slate-700'
              }`}>
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} /></svg>
              </div>
              {/* Label */}
              <span className={`text-xs font-bold leading-tight transition ${
                item.hasContent
                  ? includeSections[item.key]
                    ? 'text-slate-950'
                    : 'text-slate-500'
                  : 'text-slate-500'
              }`}>
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ===== Export action cards ===== */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* PPT Card */}
        <div className="group relative overflow-hidden rounded-[1.75rem] border border-blue-200 bg-gradient-to-br from-blue-50/60 via-white to-white p-7 shadow-lg shadow-blue-100/20 transition hover:shadow-xl hover:shadow-blue-100/30 hover:-translate-y-0.5">
          {/* Background decoration */}
          <div className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-blue-100/50 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-cyan-100/40 blur-xl" />

          <div className="relative">
            {/* Icon + title */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-600 text-white shadow-xl shadow-blue-600/20">
                <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /></svg>
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-950">PowerPoint 演示</h3>
                <p className="text-xs font-semibold text-slate-500">.pptx 格式</p>
              </div>
            </div>

            {/* Features */}
            <div className="space-y-2 mb-6">
              {[
                { icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', text: `包含 ${selectedCount} 个已选章节` },
                { icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm0 8a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zm12 0a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z', text: '16:9 宽屏自动排版' },
                { icon: 'M13 10V3L4 14h7v7l9-11h-7z', text: '适合汇报、展示、路演' },
              ].map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-xs font-medium text-slate-500">
                  <svg className="h-3.5 w-3.5 shrink-0 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={f.icon} /></svg>
                  {f.text}
                </div>
              ))}
            </div>

            {/* Action */}
            <button
              onClick={() => handleExport('ppt')}
              disabled={exporting}
              className="w-full inline-flex items-center justify-center gap-2.5 rounded-full bg-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-blue-600/20 outline-none transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-2xl hover:shadow-blue-600/20 active:translate-y-0 focus-visible:ring-4 focus-visible:ring-slate-200 disabled:bg-blue-100 disabled:shadow-none disabled:hover:translate-y-0"
            >
              {exporting && exportType === 'ppt' ? (
                <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-b-transparent" />正在生成 PPT…</>
              ) : (
                <><svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>导出 PPT 文稿</>
              )}
            </button>
          </div>
        </div>

        {/* PDF Card */}
        <div className="group relative overflow-hidden rounded-[1.75rem] border border-emerald-100 bg-gradient-to-br from-emerald-50/60 via-white to-white p-7 shadow-lg shadow-emerald-100/20 transition hover:shadow-xl hover:shadow-emerald-100/30 hover:-translate-y-0.5">
          {/* Background decoration */}
          <div className="pointer-events-none absolute -top-10 -right-10 h-32 w-32 rounded-full bg-emerald-100/50 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-6 -left-6 h-24 w-24 rounded-full bg-teal-100/40 blur-xl" />

          <div className="relative">
            {/* Icon + title */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-xl shadow-emerald-600/20">
                <svg className="h-7 w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-950">PDF 展板文档</h3>
                <p className="text-xs font-semibold text-slate-500">.pdf 格式</p>
              </div>
            </div>

            {/* Features */}
            <div className="space-y-2 mb-6">
              {[
                { icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', text: `包含 ${selectedCount} 个已选章节` },
                { icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z', text: '高清矢量无损输出' },
                { icon: 'M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z', text: '适合打印、归档、分享' },
              ].map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-xs font-medium text-slate-500">
                  <svg className="h-3.5 w-3.5 shrink-0 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={f.icon} /></svg>
                  {f.text}
                </div>
              ))}
            </div>

            {/* Action */}
            <button
              onClick={() => handleExport('pdf')}
              disabled={exporting}
              className="w-full inline-flex items-center justify-center gap-2.5 rounded-full bg-blue-600 px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-blue-600/20 outline-none transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-2xl hover:shadow-blue-600/20 active:translate-y-0 focus-visible:ring-4 focus-visible:ring-slate-200 disabled:bg-blue-100 disabled:shadow-none disabled:hover:translate-y-0"
            >
              {exporting && exportType === 'pdf' ? (
                <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-b-transparent" />正在生成 PDF…</>
              ) : (
                <><svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>导出 PDF 文档</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Bottom hint */}
      <p className="mt-6 text-center text-xs font-medium text-slate-500">
        选择上方内容板块，点击导出按钮即可下载相应格式的文件
      </p>
    </div>
  );
}
