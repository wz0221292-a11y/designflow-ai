'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import StepHeader, { stepInputClass, stepPrimaryButtonClass, stepSecondaryButtonClass, stepSubCardClass } from './StepHeader';

interface ExplodedViewStepProps {
  image: string | null;
  isLoading: boolean;
  idea: string;
  projectId: string;
  referenceImage?: string | null;
  isGenerating?: boolean;
  onGeneratingChange?: (value: boolean) => void;
  onUpdate: (image: string) => void;
}

const activeExplodedViewGenerations: Record<string, boolean> = {};

export default function ExplodedViewStep({ image, isLoading, idea, projectId, referenceImage, isGenerating: externalIsGenerating, onGeneratingChange, onUpdate }: ExplodedViewStepProps) {
  const [annotations, setAnnotations] = useState<string[]>(['', '', '', '', '']);
  const [internalIsGenerating, setInternalIsGenerating] = useState(() => activeExplodedViewGenerations[projectId] || false);

  useEffect(() => {
    setInternalIsGenerating(activeExplodedViewGenerations[projectId] || false);
  }, [projectId]);

  const isGenerating = externalIsGenerating ?? internalIsGenerating;

  const setProjectGenerating = (value: boolean) => {
    activeExplodedViewGenerations[projectId] = value;
    setInternalIsGenerating(value);
    onGeneratingChange?.(value);
  };

  const generateImage = async () => {
    if (activeExplodedViewGenerations[projectId]) return;
    setProjectGenerating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const body: any = {
        type: 'exploded_view',
        prompt: `产品爆炸图,技术分解视图,${idea}`,
        slotIndex: 0,
        expectedTotal: 1,
        userId: user?.id,
        projectId,
      };

      if (referenceImage) {
        body.referenceImage = referenceImage;
      }

      const response = await fetch('/api/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      onUpdate(data.imageUrl);
    } catch (error) {
      console.error('生成图片失败:', error);
    } finally {
      setProjectGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className={`${stepSubCardClass} p-6 sm:p-8`}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="aspect-[4/3] rounded-[2rem] bg-gradient-to-br from-slate-100 to-slate-200 animate-pulse" />
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 rounded-2xl bg-slate-100 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${stepSubCardClass} p-6 sm:p-8`}>
      <StepHeader
        title="爆炸图"
        description="展示产品的结构分解与部件关系，基于选定的外观设计保持视觉一致性"
        accent="rose"
        icon={
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" /></svg>
        }
        action={
          image && (
            <button
              onClick={generateImage}
              disabled={isGenerating}
              className={stepSecondaryButtonClass}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              {isGenerating ? '重新生成中…' : '重新生成'}
            </button>
          )
        }
      />

      {/* Status banner */}
      {isGenerating && (
        <div className="mb-6 rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50 to-orange-50/50 px-5 py-3.5 text-sm font-semibold text-rose-800 flex items-center gap-3 shadow-sm">
          <span className="flex h-5 w-5 shrink-0 animate-spin rounded-full border-[3px] border-rose-200 border-t-rose-600" />
          <span>AI 正在生成爆炸图，基于选定的外观设计保持一致性，通常需要 20-60 秒…</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Image area */}
        <div className="lg:col-span-3">
          {image ? (
            <div className="group relative overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-xl">
              <img src={image} alt="爆炸图" className="w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/5 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
            </div>
          ) : (
            <div className="flex aspect-[4/3] flex-col items-center justify-center gap-4 rounded-[1.75rem] border-2 border-dashed border-slate-200 bg-gradient-to-b from-slate-50 to-slate-100 px-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm border border-slate-100">
                <svg className="h-8 w-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" /></svg>
              </div>
              <p className="text-sm font-bold text-slate-700">尚未生成爆炸图</p>
              <p className="-mt-2 text-xs font-medium text-slate-400">基于选定的外观设计生成技术分解视图</p>
              <button
                onClick={generateImage}
                disabled={isGenerating}
                className={stepPrimaryButtonClass}
              >
                {isGenerating ? (
                  <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-b-transparent" />生成中…</>
                ) : (
                  <><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>生成爆炸图</>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Annotations panel */}
        <div className="lg:col-span-2">
          <div className="rounded-[1.5rem] border border-slate-100 bg-gradient-to-b from-slate-50 to-white p-5">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-100">
                <svg className="h-3.5 w-3.5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              </div>
              <h3 className="text-sm font-black text-slate-800">部件标注</h3>
            </div>
            <div className="space-y-2.5">
              {annotations.map((text, index) => (
                <div key={index} className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-xs font-black text-slate-500 shadow-sm border border-slate-100">
                    {index + 1}
                  </span>
                  <input
                    type="text"
                    value={text}
                    onChange={(e) => {
                      const newAnnotations = [...annotations];
                      newAnnotations[index] = e.target.value;
                      setAnnotations(newAnnotations);
                    }}
                    className={`flex-1 px-4 py-2 text-sm font-medium ${stepInputClass}`}
                    placeholder={`部件 ${index + 1} 名称/说明`}
                  />
                </div>
              ))}
            </div>
            <p className="mt-4 text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              标注信息将在导出 PPT 时显示在爆炸图旁
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
