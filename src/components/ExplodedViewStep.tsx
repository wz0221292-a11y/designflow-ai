'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useImageTaskStore } from '@/lib/useImageTaskStore';
import StepHeader, { stepPrimaryButtonClass, stepSecondaryButtonClass, stepSubCardClass } from './StepHeader';

interface ExplodedViewStepProps {
  image: string | null;
  isLoading: boolean;
  idea: string;
  projectId: string;
  referenceImage?: string | null;
  onUpdate: (image: string) => void;
  onGeneratingChange?: (generating: boolean) => void;
  onGenerated?: () => void;
}

export default function ExplodedViewStep({ image, isLoading, idea, projectId, referenceImage, onUpdate, onGeneratingChange, onGenerated }: ExplodedViewStepProps) {
  const [annotations, setAnnotations] = useState<string[]>(['', '', '', '', '']);
  const [lastError, setLastError] = useState<string | null>(null);

  const { generatingSlots, completedImages, startGeneration, syncFromStore } = useImageTaskStore({ projectId, step: 'exploded_view' });
  const isGenerating = Boolean(generatingSlots[0]);

  useEffect(() => { onGeneratingChange?.(isGenerating); }, [isGenerating, onGeneratingChange]);

  const lastCompletedRef = useRef<string>('');

  // 已完成图片 → 立即写入（防无限循环：按内容比较而非引用）
  useEffect(() => {
    if (!completedImages[0]) return;
    const key = completedImages[0];
    if (key === lastCompletedRef.current) return;
    lastCompletedRef.current = key;
    onUpdate(completedImages[0]);
  }, [completedImages, onUpdate]);

  const generateImage = async () => {
    if (isGenerating) return;
    setLastError(null);
    const pid = projectId;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const result = await startGeneration({
        slotIndex: 0,
        prompt: [
          `Exploded view technical illustration of ${idea}`,
          `All major components suspended in mid-air along a central axis, clean white or light gray background`,
          `Each part separated with equal spacing showing the assembly hierarchy from left to right`,
          `Individual components labeled by position: outer shell, internal mechanism, electronic core, structural frame`,
          `Semi-transparent ghost lines connecting parts to show how they fit together`,
          `3D product rendering with soft studio lighting, subtle drop shadows on each separated component`,
          `Materials clearly visible: plastics (matte/semi-gloss), metals (brushed/anodized), glass (transparent with reflections)`,
          `Technical blueprint aesthetic combined with photorealistic material rendering`,
          `Clean vector-like precision, isometric or slightly angled top-down perspective`,
          `No text labels, no watermarks, no UI overlays — purely visual technical breakdown`,
        ].join(', '),
        referenceImage: referenceImage || undefined,
        previousImageUrl: image || undefined,
        userId: user?.id,
      });
      syncFromStore();
      if (result.imageUrl && projectId === pid) onUpdate(result.imageUrl);
    } catch (error: any) {
      if (projectId !== pid) return;
      setLastError(error.message || '生成失败，请重试');
    }
  };

  if (isLoading) {
    return (
      <div className={`${stepSubCardClass} p-6 sm:p-8`}>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 aspect-[4/3] rounded-[1.75rem] bg-gradient-to-br from-slate-100 to-slate-200 animate-pulse" />
          <div className="lg:col-span-2 space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (<div key={i} className="h-12 rounded-2xl bg-slate-100 animate-pulse" />))}
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
          image ? (
            <button onClick={generateImage} disabled={isGenerating} className={stepSecondaryButtonClass}>
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              {isGenerating ? '重新生成中…' : '重新生成'}
            </button>
          ) : undefined
        }
      />

      {isGenerating && (
        <div className="mb-6 rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50 to-orange-50/50 px-5 py-3.5 text-sm font-semibold text-rose-700 flex items-center gap-3 shadow-sm">
          <span className="flex h-5 w-5 shrink-0 animate-spin rounded-full border-[3px] border-rose-200 border-t-rose-600" />
          AI 正在生成爆炸图，基于选定的外观设计保持一致性，通常需要 20-60 秒…
        </div>
      )}

      {lastError && !isGenerating && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-gradient-to-br from-red-50 to-red-50/50 px-5 py-3.5 text-sm font-semibold text-red-600 flex items-start gap-3 shadow-sm">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 text-xs font-black">!</span>
          <div className="flex-1 min-w-0">
            <p className="font-bold">生成失败</p>
            <p className="mt-0.5 text-red-600 font-medium">{lastError}</p>
          </div>
          <button onClick={() => setLastError(null)} className="shrink-0 rounded-full p-1 text-red-600 hover:bg-red-100 hover:text-red-600 transition">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Image area */}
        <div className="lg:col-span-3">
          {image ? (
            <div className="group relative overflow-hidden rounded-[1.75rem] border bg-white shadow-lg shadow-rose-100/20">
              <img src={image} alt="爆炸图" className={`w-full object-cover transition duration-500 ${isGenerating ? 'blur-[2px] scale-105' : ''}`} />
              {/* 生成中遮罩 */}
              {isGenerating && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-rose-500/20 via-rose-400/10 to-orange-500/20 backdrop-blur-[1px]">
                  <div className="relative">
                    <span className="absolute inset-0 h-14 w-14 animate-ping rounded-full bg-rose-400/30" />
                    <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-rose-400 to-orange-500 shadow-lg shadow-rose-500/40">
                      <svg className="h-7 w-7 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[14px] font-black text-rose-700 drop-shadow-sm">正在重新生成…</span>
                    <span className="text-[11px] font-bold text-rose-600/80">爆炸图 · 预计 20-60 秒</span>
                  </div>
                </div>
              )}
              <div className={`absolute inset-0 bg-gradient-to-t from-black/5 via-transparent to-transparent transition ${isGenerating ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'}`} />
              {/* 生成中脉冲边框 */}
              {isGenerating && (
                <div className="absolute inset-0 rounded-[1.75rem] ring-2 ring-rose-400/60 animate-pulse pointer-events-none" />
              )}
            </div>
          ) : (
            <div className={`flex aspect-[4/3] flex-col items-center justify-center gap-4 rounded-[1.75rem] border-2 px-6 ${isGenerating ? 'border-rose-200 bg-gradient-to-b from-rose-50 via-rose-50/50 to-white' : 'border-dashed border-slate-200 bg-gradient-to-b from-slate-50 to-white'}`}>
              {isGenerating ? (
                <>
                  <div className="relative">
                    <span className="absolute -inset-4 rounded-full bg-rose-400/20 animate-pulse blur-xl" />
                    <span className="absolute -inset-2 rounded-full bg-rose-400/30 animate-ping" />
                    <span className="relative flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-rose-400 to-orange-500 shadow-xl shadow-rose-500/40">
                      <svg className="h-8 w-8 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[15px] font-black text-rose-700">AI 正在生成爆炸图</span>
                    <span className="text-[11px] font-bold text-rose-500">技术分解视图 · 预计 20-60 秒</span>
                  </div>
                  <div className="w-48 h-1.5 rounded-full bg-rose-100 overflow-hidden">
                    <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-rose-400 to-orange-500" style={{ animation: 'progress-bar-sweep 1.5s ease-in-out infinite' }} />
                  </div>
                </>
              ) : (
                <>
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm border border-slate-200">
                    <svg className="h-8 w-8 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" /></svg>
                  </div>
                  <p className="text-sm font-bold text-slate-700">尚未生成爆炸图</p>
                  <p className="-mt-2 text-xs font-medium text-slate-500">基于选定的外观设计生成技术分解视图</p>
                  <button onClick={generateImage} disabled={isGenerating} className={stepPrimaryButtonClass}>
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    生成爆炸图
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Annotations panel */}
        <div className="lg:col-span-2">
          <div className="rounded-[1.75rem] border border-rose-100 bg-gradient-to-br from-rose-50/30 via-white to-white shadow-lg shadow-rose-100/20 p-5">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-100">
                <svg className="h-3.5 w-3.5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              </div>
              <h3 className="text-sm font-black text-slate-700">部件标注</h3>
            </div>
            <div className="space-y-2.5">
              {annotations.map((text, index) => (
                <div key={index} className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-xs font-black text-slate-500 shadow-sm border border-slate-200">
                    {index + 1}
                  </span>
                  <input
                    type="text" value={text}
                    onChange={(e) => { const newAnnotations = [...annotations]; newAnnotations[index] = e.target.value; setAnnotations(newAnnotations); }}
                    className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-500 focus:border-slate-300 focus:bg-slate-100 focus:ring-2 focus:ring-slate-200"
                    placeholder={`部件 ${index + 1} 名称/说明`}
                  />
                </div>
              ))}
            </div>
            <p className="mt-4 text-[11px] font-medium text-slate-500 flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              标注信息将在导出 PPT 时显示在爆炸图旁
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
