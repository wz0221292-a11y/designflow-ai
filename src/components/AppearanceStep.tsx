'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useImageTaskStore } from '@/lib/useImageTaskStore';
import StepHeader, { stepPrimaryButtonClass, stepSecondaryButtonClass, stepSubCardClass } from './StepHeader';

interface AppearanceStepProps {
  images: string[] | null;
  isLoading: boolean;
  idea: string;
  projectId: string;
  onUpdate: (images: string[]) => void;
  onSelectionChange?: (index: number) => void;
  onGeneratingChange?: (generating: boolean) => void;
  selectedIndex?: number | null;
  onGenerated?: () => void;
}

const appearanceQualityConstraints = [
  'pure white background',
  'no logo',
  'no text',
  'no typography',
  'no watermark',
  'master-level rendering',
  'museum-grade industrial design visualization',
  'premium studio product rendering',
].join(', ');

const appearanceVariations = (idea: string) => [
  `Hero product shot of ${idea}: pure white background, studio lighting, soft shadow beneath the product, 3/4 front angle showing the design silhouette, crisp edge definition, clean centered composition, ${appearanceQualityConstraints}, 8k photorealistic`,
  `Full product view of ${idea}: pure white background, slightly elevated camera angle, product isolated with generous negative space, refined material finish, subtle ambient occlusion, premium catalog photography style, ${appearanceQualityConstraints}, photorealistic`,
  `Detail and material study of ${idea}: pure white background, close-up macro angle focusing on surface textures, material junctions, and craftsmanship details, strong side lighting to reveal contours and finishes, minimal composition with negative space, ${appearanceQualityConstraints}, photorealistic`,
];

export default function AppearanceStep({ images, isLoading, idea, projectId, onUpdate, onSelectionChange, onGeneratingChange, selectedIndex, onGenerated }: AppearanceStepProps) {
  const currentImages = Array.isArray(images) ? images : ['', '', ''];
  const imagesRef = useRef(currentImages);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(selectedIndex != null ? selectedIndex : null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => { imagesRef.current = currentImages; }, [currentImages]);

  const { generatingSlots, completedImages, startGeneration, syncFromStore } = useImageTaskStore({ projectId, step: 'appearance' });

  const lastCompletedRef = useRef<string>('');

  // 已完成图片 → 写入 project state（防无限循环：按内容比较而非引用）
  useEffect(() => {
    const urls = Object.entries(completedImages);
    if (urls.length === 0) return;
    const key = JSON.stringify(urls);
    if (key === lastCompletedRef.current) return;
    lastCompletedRef.current = key;
    const newImages = [...imagesRef.current];
    while (newImages.length < 3) newImages.push('');
    for (const [idxStr, url] of urls) {
      const idx = Number(idxStr);
      if (idx >= 0 && idx < 3) newImages[idx] = url;
    }
    imagesRef.current = newImages;
    onUpdate(newImages);
  }, [completedImages, onUpdate]);

  useEffect(() => { onGeneratingChange?.(Object.values(generatingSlots).some(Boolean)); }, [generatingSlots, onGeneratingChange]);

  const generateImage = async (index: number) => {
    if (generatingSlots[index]) return;
    setLastError(null);
    const pid = projectId;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const prompt = appearanceVariations(idea)[index] || appearanceVariations(idea)[0];
      const result = await startGeneration({
        slotIndex: index,
        prompt,
        previousImageUrl: currentImages[index] || undefined,
        userId: user?.id,
      });
      if (result.imageUrl && projectId === pid) {
        syncFromStore();
        const newImages = [...imagesRef.current];
        while (newImages.length < 3) newImages.push('');
        newImages[index] = result.imageUrl;
        imagesRef.current = newImages;
        onUpdate(newImages);
      } else if (result.imageUrl) {
        syncFromStore();
      }
    } catch (error: any) {
      if (projectId !== pid) return;
      setLastError(error.message || '生成失败，请重试');
    }
  };

  const handleSelect = (index: number) => {
    if (selectedImageIndex !== null || Object.values(generatingSlots).some(Boolean)) return;
    setPendingIndex(index); setShowConfirmDialog(true);
  };

  const confirmSelection = () => {
    if (pendingIndex !== null) {
      setSelectedImageIndex(pendingIndex); onSelectionChange?.(pendingIndex);
      onUpdate([...imagesRef.current]);
      setPendingIndex(null);
    }
    setShowConfirmDialog(false);
  };

  if (isLoading) {
    return (
      <div className={`${stepSubCardClass} p-6 sm:p-8`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (<div key={i} className="aspect-square rounded-[1.75rem] bg-gradient-to-br from-slate-100 to-slate-200 animate-pulse" />))}
        </div>
      </div>
    );
  }

  const allGenerated = currentImages.every(Boolean);
  const isAnyGenerating = Object.values(generatingSlots).some(Boolean);

  return (
    <div className={`${stepSubCardClass} p-6 sm:p-8`}>
      <StepHeader
        title="外观设计"
        description="生成 3 个不同效果图，选择 1 个作为后续故事板和爆炸图的唯一外观参考"
        accent="cyan"
        icon={
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
        }
        action={
          selectedImageIndex !== null ? (
            <div className="flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-600">
              <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
              外观已选定
            </div>
          ) : isAnyGenerating ? (
            <div className="flex items-center gap-2 rounded-full bg-cyan-50 px-4 py-2 text-sm font-bold text-cyan-600">
              <span className="flex h-2 w-2 animate-spin rounded-full border-2 border-cyan-400 border-t-cyan-600" />
              生成中
            </div>
          ) : undefined
        }
      />

      {/* Status banners */}
      {selectedImageIndex !== null && (
        <div className="mb-6 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-emerald-50/50 px-5 py-3.5 text-sm font-semibold text-emerald-600 flex items-center gap-3 shadow-sm">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
            <svg className="h-5 w-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <span>已选定外观设计，后续<strong>故事板</strong>和<strong>爆炸图</strong>将基于此效果图生成。</span>
        </div>
      )}

      {isAnyGenerating && (
        <div className="mb-6 rounded-2xl border border-cyan-100 bg-gradient-to-br from-cyan-50 to-blue-50/50 px-5 py-3.5 text-sm font-semibold text-cyan-700 flex items-center gap-3 shadow-sm">
          <span className="flex h-5 w-5 shrink-0 animate-spin rounded-full border-[3px] border-cyan-200 border-t-cyan-600" />
          AI 正在为您生成效果图，通常需要 20-60 秒，请耐心等待…
        </div>
      )}

      {lastError && !isAnyGenerating && (
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

      {/* Image grid */}
      <div className={`grid gap-6 transition-all duration-700 ${selectedImageIndex !== null ? 'grid-cols-1 max-w-lg mx-auto' : 'grid-cols-1 md:grid-cols-3'}`}>
        {currentImages.map((img, index) => {
          const isHidden = selectedImageIndex !== null && selectedImageIndex !== index;
          if (isHidden) return null;
          const isThisSlotGenerating = generatingSlots[index];
          const isSelected = selectedImageIndex === index;

          return (
            <div
              key={index}
              className={`group relative overflow-hidden rounded-[1.75rem] border bg-white transition-all duration-300 ${
                isSelected
                  ? 'border-cyan-200 shadow-xl shadow-cyan-100/30 ring-1 ring-cyan-300'
                  : isThisSlotGenerating
                  ? 'border-cyan-300 shadow-xl shadow-cyan-200/40 ring-2 ring-cyan-400/50 animate-pulse'
                  : 'border-slate-200/80 shadow-lg shadow-slate-200/20 hover:shadow-xl hover:-translate-y-0.5'
              }`}
            >
              {/* Card header */}
              <div className="flex items-center justify-between border-b border-slate-200/80 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${isThisSlotGenerating ? 'bg-cyan-100 text-cyan-600' : img ? 'bg-slate-100 text-slate-500' : 'bg-slate-100 text-slate-500'}`}>
                    {index + 1}
                  </span>
                  <span className={`text-sm font-bold ${isThisSlotGenerating ? 'text-cyan-600' : 'text-slate-700'}`}>效果图 {index + 1}</span>
                </div>
                {isThisSlotGenerating && (
                  <span className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 px-3 py-1.5 text-[11px] font-black text-white shadow-md shadow-cyan-500/30 animate-pulse">
                    <span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />生成中…
                  </span>
                )}
                {isSelected && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-cyan-600 px-2.5 py-1 text-[11px] font-black text-white shadow-sm">
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>已选定
                  </span>
                )}
              </div>

              {/* Image area */}
              {img ? (
                <div className="relative aspect-square cursor-zoom-in bg-white overflow-hidden" onClick={() => !isThisSlotGenerating && setPreviewImage(img)}>
                  <img src={img} alt={`外观设计 ${index + 1}`} className={`h-full w-full object-cover transition duration-500 ${isThisSlotGenerating ? 'blur-[2px] scale-105' : 'group-hover:scale-105'}`} />
                  {/* 生成中遮罩 */}
                  {isThisSlotGenerating && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-cyan-500/20 via-cyan-400/10 to-blue-500/20 backdrop-blur-[1px]">
                      <div className="relative">
                        <span className="absolute inset-0 h-12 w-12 animate-ping rounded-full bg-cyan-400/30" />
                        <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 shadow-lg shadow-cyan-500/40">
                          <svg className="h-6 w-6 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        </span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[13px] font-black text-cyan-700 drop-shadow-sm">正在重新生成…</span>
                        <span className="text-[10px] font-bold text-cyan-600/80">方案 {index + 1} · 预计 20-60 秒</span>
                      </div>
                    </div>
                  )}
                  <div className={`absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent transition ${isThisSlotGenerating ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'}`} />
                  {/* 生成中脉冲边框 */}
                  {isThisSlotGenerating && (
                    <div className="absolute inset-0 rounded-[1.75rem] ring-2 ring-cyan-400/60 animate-pulse pointer-events-none" />
                  )}
                </div>
              ) : (
                <div className={`flex aspect-square flex-col items-center justify-center gap-4 px-4 ${isThisSlotGenerating ? 'bg-gradient-to-b from-cyan-50 via-cyan-50/50 to-white' : 'bg-gradient-to-b from-slate-50 to-white'}`}>
                  {isThisSlotGenerating ? (
                    <>
                      <div className="relative">
                        <span className="absolute -inset-4 rounded-full bg-cyan-400/20 animate-pulse blur-xl" />
                        <span className="absolute -inset-2 rounded-full bg-cyan-400/30 animate-ping" />
                        <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 shadow-xl shadow-cyan-500/40">
                          <svg className="h-7 w-7 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        </span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[14px] font-black text-cyan-700">AI 正在生成方案 {index + 1}</span>
                        <span className="text-[11px] font-bold text-cyan-500">外观设计 · 预计 20-60 秒</span>
                      </div>
                      <div className="w-40 h-1 rounded-full bg-cyan-100 overflow-hidden">
                        <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" style={{ animation: 'progress-bar-sweep 1.5s ease-in-out infinite' }} />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm border border-slate-200">
                        <svg className="h-6 w-6 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      </div>
                      <p className="text-xs font-medium text-slate-500 text-center">点击下方按钮生成方案 {index + 1}</p>
                    </>
                  )}
                </div>
              )}

              {/* Card footer */}
              <div className="flex items-center gap-2 border-t border-slate-200/80 px-4 py-3">
                {img ? (
                  <>
                    <button onClick={() => handleSelect(index)} disabled={selectedImageIndex !== null || isAnyGenerating}
                      className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-bold transition-all ${
                        isSelected ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20' :
                        selectedImageIndex !== null || isAnyGenerating ? 'bg-white text-slate-500 cursor-not-allowed' :
                        'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-md shadow-emerald-500/20 hover:from-emerald-600 hover:to-emerald-700 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0'
                      }`}>
                      {isSelected && (<svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>)}
                      {isSelected ? '已选择' : selectedImageIndex !== null ? '已选定' : isAnyGenerating ? '生成中不可选择' : '选定此方案'}
                    </button>
                    {selectedImageIndex === null && (
                      <button onClick={() => generateImage(index)} disabled={isThisSlotGenerating}
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all ${
                          isThisSlotGenerating ? 'border-slate-200 bg-white text-slate-500 cursor-not-allowed' :
                          'border-slate-200/80 bg-white text-slate-500 hover:bg-white hover:border-slate-300 hover:text-slate-700 active:scale-[0.96]'
                        }`} title="重新生成">
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        重新生成
                      </button>
                    )}
                  </>
                ) : (
                  <button onClick={() => generateImage(index)} disabled={isThisSlotGenerating} className={stepPrimaryButtonClass + ' w-full'}>
                    {isThisSlotGenerating ? (<><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-b-transparent" />生成中…</>) : (<><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>生成效果图</>)}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Generate all CTA */}
      {!allGenerated && !isAnyGenerating && selectedImageIndex === null && (
        <div className="mt-8 flex justify-center">
          <button onClick={() => { imagesRef.current.forEach((img, index) => { if (!img && !generatingSlots[index]) generateImage(index); }); }}
            className="inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-8 py-3.5 text-sm font-black text-white shadow-xl shadow-cyan-500/25 outline-none transition hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-cyan-500/30 active:translate-y-0">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            一键生成全部效果图
          </button>
        </div>
      )}

      {/* Image preview modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 p-4 backdrop-blur-sm" onClick={() => setPreviewImage(null)}>
          <button className="absolute top-5 right-5 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/80 transition hover:bg-white/20" onClick={() => setPreviewImage(null)}>
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <img src={previewImage} alt="预览" className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {/* Confirm dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/50 p-4 backdrop-blur-sm" onClick={() => setShowConfirmDialog(false)}>
          <div className="w-full max-w-sm rounded-[1.75rem] bg-white p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 ring-1 ring-amber-200">
                <svg className="h-6 w-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <h3 className="text-lg font-black text-slate-950">确认选择此效果图？</h3>
            </div>
            <p className="mb-6 text-sm leading-relaxed text-slate-500">
              选定后将<strong className="text-slate-950">无法更改</strong>。后续的<strong className="text-slate-950">故事板</strong>和<strong className="text-slate-950">爆炸图</strong>将基于此外观图生成，请谨慎选择。
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirmDialog(false)} className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-white">再想想</button>
              <button onClick={confirmSelection} className="flex-1 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition hover:from-emerald-600 hover:to-emerald-700 hover:shadow-xl active:shadow-md">确定，就它了</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
