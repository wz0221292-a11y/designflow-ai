'use client';

import { useMemo } from 'react';
import StepHeader, { stepInputClass, stepSubCardClass } from './StepHeader';

interface BackgroundStepProps {
  content: string | null;
  isLoading: boolean;
  onUpdate: (content: string) => void;
}

const TAG_PILLS = [
  { label: '现有痛点', color: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  { label: '机会点', color: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  { label: '相关趋势', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  { label: '技术成熟度', color: 'bg-indigo-50 text-indigo-700 border-indigo-200', dot: 'bg-indigo-500' },
  { label: '竞品分析', color: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
];

export default function BackgroundStep({ content, isLoading, onUpdate }: BackgroundStepProps) {
  const wordCount = useMemo(() => {
    const text = content || '';
    return text.replace(/\s/g, '').length;
  }, [content]);

  const hasContent = Boolean(content);

  return (
    <div className={`${stepSubCardClass} p-6 sm:p-8`}>
      <StepHeader
        title="背景研究"
        description="分析市场痛点、机会点与行业趋势"
        accent="blue"
        icon={
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
        }
      />

      {/* Status banner */}
      {hasContent && (
        <div className="mb-6 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-cyan-50/50 px-5 py-3.5 text-sm font-semibold text-blue-800 flex items-center gap-3 shadow-sm">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100">
            <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div>
            <span>背景研究已完成</span>
            <span className="ml-2 font-normal text-blue-600">· {wordCount} 字</span>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={`h-4 rounded-full animate-pulse ${i === 1 ? 'w-full bg-blue-100' : i === 2 ? 'w-11/12 bg-slate-100' : i === 3 ? 'w-4/5 bg-slate-100' : i === 4 ? 'w-full bg-slate-100' : 'w-2/3 bg-slate-100'}`} />
          ))}
        </div>
      ) : (
        <div className="relative">
          {/* Editor card */}
          <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-lg shadow-slate-200/20 transition-all focus-within:border-blue-300 focus-within:shadow-xl focus-within:shadow-blue-100/30 focus-within:ring-2 focus-within:ring-blue-200">
            {/* Card top bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-blue-500 to-cyan-500" />

            <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50">
                <svg className="h-4 w-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              </div>
              <span className="text-sm font-black text-slate-800">研究内容编辑</span>
              {hasContent && (
                <span className="ml-auto rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-500">{wordCount} 字符</span>
              )}
            </div>

            <textarea
              value={content || ''}
              onChange={(e) => onUpdate(e.target.value)}
              placeholder="在此编辑背景研究内容，涵盖现有痛点、市场机会、技术趋势和竞品分析等方面…"
              className="h-72 w-full resize-none border-none bg-white px-5 py-4 text-sm font-medium leading-7 text-slate-800 outline-none placeholder:font-medium placeholder:text-slate-400 focus:ring-0"
            />
          </div>
        </div>
      )}

      {/* Tag pills */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">研究方向</span>
        {TAG_PILLS.map((tag) => (
          <span
            key={tag.label}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-bold transition hover:-translate-y-0.5 ${tag.color}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${tag.dot}`} />
            {tag.label}
          </span>
        ))}
      </div>
    </div>
  );
}
