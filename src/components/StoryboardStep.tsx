'use client';

import { useEffect, useRef, useState } from 'react';
import type { StoryboardImage } from '@/types';
import { supabase } from '@/lib/supabase/client';
import StepHeader, { stepInputClass, stepPrimaryButtonClass, stepSecondaryButtonClass, stepSubCardClass } from './StepHeader';

interface StoryboardStepProps {
  images: StoryboardImage[] | null;
  isLoading: boolean;
  idea: string;
  projectId: string;
  referenceImage?: string | null;
  generatingSlots?: Record<number, boolean>;
  onGeneratingChange?: (index: number, value: boolean) => void;
  onUpdate: (images: StoryboardImage[]) => void;
}

const defaultPanelDescriptions = [
  '场景引入 - 用户遇到问题的初始情境',
  '问题呈现 - 用户面临的具体痛点',
  '产品出现 - 产品作为解决方案登场',
  '使用过程 - 用户与产品互动的关键步骤',
  '效果展示 - 产品带来的积极改变',
  '满意结局 - 用户获得理想结果',
];

const normalizeImages = (images: StoryboardImage[] | null | undefined) =>
  Array.from({ length: 6 }, (_, index) => images?.[index] || { url: '', description: '' });

const activeStoryboardGenerations: Record<string, Record<number, boolean>> = {};

const getActiveStoryboardGenerations = (projectId: string) => activeStoryboardGenerations[projectId] || {};

export default function StoryboardStep({ images, isLoading, idea, projectId, referenceImage, generatingSlots: externalGeneratingSlots, onGeneratingChange, onUpdate }: StoryboardStepProps) {
  const [internalGeneratingSlots, setInternalGeneratingSlots] = useState<Record<number, boolean>>(() => getActiveStoryboardGenerations(projectId));
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const imagesRef = useRef<StoryboardImage[]>(normalizeImages(images));

  useEffect(() => {
    imagesRef.current = normalizeImages(images);
  }, [images]);

  useEffect(() => {
    setInternalGeneratingSlots(getActiveStoryboardGenerations(projectId));
  }, [projectId]);

  const generatingSlots = externalGeneratingSlots || internalGeneratingSlots;

  const setSlotGenerating = (index: number, value: boolean) => {
    const next = { ...getActiveStoryboardGenerations(projectId), [index]: value };
    activeStoryboardGenerations[projectId] = next;
    setInternalGeneratingSlots(next);
    onGeneratingChange?.(index, value);
  };

  const setMultipleSlotsGenerating = (indices: number[], value: boolean) => {
    const next = { ...getActiveStoryboardGenerations(projectId) };
    indices.forEach((index) => {
      next[index] = value;
      onGeneratingChange?.(index, value);
    });
    activeStoryboardGenerations[projectId] = next;
    setInternalGeneratingSlots(next);
  };

  const commitImages = (updater: (images: StoryboardImage[]) => StoryboardImage[]) => {
    const latestImages = normalizeImages(imagesRef.current);
    const nextImages = normalizeImages(updater(latestImages));
    imagesRef.current = nextImages;
    onUpdate(nextImages);
  };

  const generateImage = async (index: number, options: { skipGeneratingState?: boolean } = {}) => {
    if (getActiveStoryboardGenerations(projectId)[index] && !options.skipGeneratingState) return;
    if (!options.skipGeneratingState) {
      setSlotGenerating(index, true);
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const currentImages = normalizeImages(imagesRef.current);
      const existingDesc = currentImages[index]?.description || defaultPanelDescriptions[index] || `场景 ${index + 1}`;

      const body: any = {
        type: 'storyboard',
        prompt: `故事板分镜 ${index + 1}/6,${existingDesc},${idea}`,
        slotIndex: index,
        expectedTotal: 6,
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

      commitImages((latestImages) => {
        const newImages = normalizeImages(latestImages);
        newImages[index] = {
          ...newImages[index],
          url: data.imageUrl || '',
          description: newImages[index]?.description || existingDesc,
        };
        return newImages;
      });
    } catch (error) {
      console.error('生成图片失败:', error);
    } finally {
      setSlotGenerating(index, false);
    }
  };

  const handleDescriptionChange = (index: number, description: string) => {
    commitImages((latestImages) => {
      const newImages = normalizeImages(latestImages);
      newImages[index] = { ...newImages[index], description };
      return newImages;
    });
  };

  const generateAll = async () => {
    const activeGenerations = getActiveStoryboardGenerations(projectId);
    const targetIndices = Array.from({ length: 6 }, (_, i) => i).filter((i) => !imagesRef.current[i]?.url && !activeGenerations[i]);
    if (targetIndices.length === 0) return;

    setMultipleSlotsGenerating(targetIndices, true);

    await Promise.all(targetIndices.map((index) => generateImage(index, { skipGeneratingState: true })));
  };

  if (isLoading) {
    return (
      <div className={`${stepSubCardClass} p-6 sm:p-8`}>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="aspect-video rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const currentImages = normalizeImages(images);
  const hasAnyImage = currentImages.some(img => img.url);
  const isAnyGenerating = Object.values(generatingSlots).some(Boolean);
  const emptySlotCount = currentImages.filter(img => !img.url).length;

  return (
    <div className={`${stepSubCardClass} p-6 sm:p-8`}>
      <StepHeader
        title="故事板"
        description="描绘产品使用的 6 个关键场景，基于选定的外观设计保持视觉一致性"
        accent="amber"
        icon={
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
        }
        action={
          !hasAnyImage && (
            <button
              onClick={generateAll}
              disabled={isAnyGenerating}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-amber-500/25 outline-none transition hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 focus-visible:ring-4 focus-visible:ring-amber-200 disabled:from-slate-300 disabled:to-slate-300 disabled:shadow-none disabled:hover:translate-y-0"
            >
              {isAnyGenerating ? (
                <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-b-transparent" />生成中…</>
              ) : (
                <><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>一键生成全部</>
              )}
            </button>
          )
        }
      />

      {/* Status banner */}
      {isAnyGenerating && (
        <div className="mb-6 rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-orange-50/50 px-5 py-3.5 text-sm font-semibold text-amber-800 flex items-center gap-3 shadow-sm">
          <span className="flex h-5 w-5 shrink-0 animate-spin rounded-full border-[3px] border-amber-200 border-t-amber-600" />
          <span>AI 正在绘制 {Object.values(generatingSlots).filter(Boolean).length} 个分镜图，基于选定的外观设计保持一致性，通常需要 20-60 秒…</span>
        </div>
      )}

      {!hasAnyImage && !isAnyGenerating && (
        <div className="mb-6 rounded-2xl border border-dashed border-slate-300 bg-gradient-to-b from-slate-50 to-white px-6 py-10 text-center">
          <div className="mb-3 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 ring-1 ring-amber-100">
              <svg className="h-8 w-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
            </div>
          </div>
          <p className="text-sm font-bold text-slate-700">准备好创建故事板了吗？</p>
          <p className="mt-1 text-xs font-medium text-slate-500">点击上方按钮即可一键生成 6 个故事板分镜</p>
        </div>
      )}

      {/* Storyboard grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
        {currentImages.map((img, index) => {
          const isThisSlotGenerating = generatingSlots[index];
          const accentColors = [
            'from-violet-500 to-purple-500',
            'from-blue-500 to-cyan-500',
            'from-emerald-500 to-teal-500',
            'from-amber-500 to-orange-500',
            'from-rose-500 to-pink-500',
            'from-indigo-500 to-blue-500',
          ];
          const accentLight = [
            'border-violet-200 bg-violet-50 text-violet-700',
            'border-blue-200 bg-blue-50 text-blue-700',
            'border-emerald-200 bg-emerald-50 text-emerald-700',
            'border-amber-200 bg-amber-50 text-amber-700',
            'border-rose-200 bg-rose-50 text-rose-700',
            'border-indigo-200 bg-indigo-50 text-indigo-700',
          ];
          return (
            <div
              key={index}
              className={`group relative flex flex-col overflow-hidden rounded-[1.5rem] border bg-white transition-all duration-300 ${
                isThisSlotGenerating
                  ? 'border-amber-200 shadow-xl shadow-amber-100/40 ring-1 ring-amber-300/50'
                  : img.url
                  ? 'border-slate-200/80 shadow-lg shadow-slate-200/20 hover:shadow-xl hover:-translate-y-0.5'
                  : 'border-slate-200/70 shadow-sm shadow-slate-200/10 hover:shadow-md'
              }`}
            >
              {/* Top accent bar */}
              <div className={`h-1.5 w-full bg-gradient-to-r ${accentColors[index]} shrink-0 ${img.url ? 'opacity-100' : 'opacity-30'}`} />

              {/* Card header */}
              <div className="flex items-center gap-2.5 px-4 py-3 shrink-0">
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-xs font-black shadow-sm ${
                  isThisSlotGenerating
                    ? 'bg-amber-100 text-amber-600 ring-1 ring-amber-200'
                    : img.url
                    ? `bg-gradient-to-br ${accentColors[index]} text-white`
                    : 'bg-slate-100 text-slate-400'
                }`}>
                  {index + 1}
                </span>
                <span className="text-sm font-black text-slate-800 tracking-tight truncate">
                  {['场景引入', '问题呈现', '产品登场', '使用过程', '效果展示', '满意结局'][index]}
                </span>
                {isThisSlotGenerating && (
                  <span className="ml-auto flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-600 shrink-0">
                    <span className="h-2 w-2 animate-spin rounded-full border-2 border-amber-400 border-t-amber-600" />
                    生成中…
                  </span>
                )}
              </div>

              {/* Image */}
              {img.url ? (
                <div
                  className="relative aspect-video cursor-zoom-in overflow-hidden bg-slate-100 border-y border-slate-100/80"
                  onClick={() => setPreviewImage(img.url)}
                >
                  <img
                    src={img.url}
                    alt={`故事板 ${index + 1}`}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
                </div>
              ) : (
                <div className="flex aspect-video flex-col items-center justify-center gap-3 border-y border-slate-100/60 bg-gradient-to-b from-slate-50/80 to-white px-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${img.url ? '' : 'bg-white shadow-sm border border-slate-100'}`}>
                    <svg className={`h-6 w-6 ${isThisSlotGenerating ? 'text-amber-400 animate-pulse' : 'text-slate-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  </div>
                  <button
                    onClick={() => generateImage(index)}
                    disabled={isThisSlotGenerating}
                    className={stepPrimaryButtonClass + ' text-xs px-4 py-2'}
                  >
                    {isThisSlotGenerating ? (
                      <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-b-transparent" />生成中…</>
                    ) : (
                      <><svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>生成分镜</>
                    )}
                  </button>
                </div>
              )}

              {/* Card body */}
              <div className="p-4 space-y-2.5 flex-1 flex flex-col">
                <textarea
                  value={img.description || ''}
                  onChange={(e) => handleDescriptionChange(index, e.target.value)}
                  className={`flex-1 min-h-[4rem] w-full resize-none px-3.5 py-2.5 text-xs font-medium leading-relaxed ${stepInputClass}`}
                  placeholder={defaultPanelDescriptions[index] || `描述分镜 ${index + 1} 的场景…`}
                />
                {img.url && (
                  <button
                    onClick={() => generateImage(index)}
                    disabled={isThisSlotGenerating}
                    className={`inline-flex items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold transition-all shrink-0 ${
                      isThisSlotGenerating
                        ? 'bg-slate-50 text-slate-400 cursor-not-allowed'
                        : 'bg-slate-50 text-slate-500 hover:bg-amber-50 hover:text-amber-600'
                    }`}
                  >
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    {isThisSlotGenerating ? '重新生成中…' : '更换图片'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom generate-all for partially filled */}
      {hasAnyImage && !isAnyGenerating && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={generateAll}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-amber-500/20 outline-none transition hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 focus-visible:ring-4 focus-visible:ring-amber-200"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            补全剩余 {emptySlotCount} 个分镜
          </button>
        </div>
      )}

      {/* Image preview modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-sm"
          onClick={() => setPreviewImage(null)}
        >
          <button
            className="absolute top-5 right-5 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/80 transition hover:bg-white/20 hover:text-white"
            onClick={() => setPreviewImage(null)}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <img
            src={previewImage}
            alt="预览"
            className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
