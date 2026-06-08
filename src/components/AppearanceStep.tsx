'use client';

import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import StepHeader, { stepPrimaryButtonClass, stepSecondaryButtonClass, stepGhostButtonClass, stepSubCardClass } from './StepHeader';

interface AppearanceStepProps {
  images: string[] | null;
  isLoading: boolean;
  idea: string;
  projectId: string;
  generatingSlots?: Record<number, boolean>;
  onGeneratingChange?: (index: number, value: boolean) => void;
  onUpdate: (images: string[]) => void;
  onSelectionChange?: (selected: string | null) => void;
}

const activeAppearanceGenerations: Record<string, Record<number, boolean>> = {};

const getActiveAppearanceGenerations = (projectId: string) => activeAppearanceGenerations[projectId] || {};

export default function AppearanceStep({ images, isLoading, idea, projectId, generatingSlots: externalGeneratingSlots, onGeneratingChange, onUpdate, onSelectionChange }: AppearanceStepProps) {
  const currentImages = images || ['', '', ''];
  const imagesRef = useRef(currentImages);
  const [selectedImage, setSelectedImage] = useState<string | null>(currentImages[0] || null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [internalGeneratingSlots, setInternalGeneratingSlots] = useState<Record<number, boolean>>(() => getActiveAppearanceGenerations(projectId));
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingSelection, setPendingSelection] = useState<string | null>(null);

  useEffect(() => {
    imagesRef.current = currentImages;
  }, [currentImages]);

  useEffect(() => {
    setInternalGeneratingSlots(getActiveAppearanceGenerations(projectId));
  }, [projectId]);

  const generatingSlots = externalGeneratingSlots || internalGeneratingSlots;

  const setSlotGenerating = (index: number, value: boolean) => {
    const next = { ...getActiveAppearanceGenerations(projectId), [index]: value };
    activeAppearanceGenerations[projectId] = next;
    setInternalGeneratingSlots(next);
    onGeneratingChange?.(index, value);
  };

  const commitImages = (updater: (images: string[]) => string[]) => {
    const nextImages = updater([...(imagesRef.current || ['', '', ''])]);
    imagesRef.current = nextImages;
    onUpdate(nextImages);
  };

  const generateImage = async (index: number) => {
    if (getActiveAppearanceGenerations(projectId)[index]) return;
    setSlotGenerating(index, true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const response = await fetch('/api/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'appearance',
          prompt: `产品设计效果图,${idea}, variation ${index + 1}, distinct visual direction`,
          slotIndex: index,
          expectedTotal: 3,
          userId: user?.id,
          projectId,
        }),
      });
      const data = await response.json();
      if (!response.ok || data.error) throw new Error(data.error || `HTTP ${response.status}`);

      commitImages((latestImages) => {
        const newImages = latestImages.length >= 3 ? latestImages : ['', '', ''];
        newImages[index] = data.imageUrl;
        return newImages;
      });
    } catch (error) {
      console.error('生成图片失败:', error);
    } finally {
      setSlotGenerating(index, false);
    }
  };

  const handleSelect = (img: string) => {
    if (selectedImage) return;
    setPendingSelection(img);
    setShowConfirmDialog(true);
  };

  const confirmSelection = () => {
    if (pendingSelection) {
      setSelectedImage(pendingSelection);
      onSelectionChange?.(pendingSelection);
      commitImages((latestImages) => latestImages);
      setPendingSelection(null);
    }
    setShowConfirmDialog(false);
  };

  if (isLoading) {
    return (
      <div className={`${stepSubCardClass} p-6 sm:p-8`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="aspect-square rounded-[2rem] bg-gradient-to-br from-slate-100 to-slate-200 animate-pulse" />
          ))}
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
      />

      {/* State banners */}
      {selectedImage && (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-50/50 px-5 py-3.5 text-sm font-semibold text-emerald-800 flex items-center gap-3 shadow-sm">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
            <svg className="h-5 w-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <span>已选定外观设计，后续<strong>故事板</strong>和<strong>爆炸图</strong>将基于此效果图生成。</span>
        </div>
      )}

      {isAnyGenerating && (
        <div className="mb-6 rounded-2xl border border-cyan-100 bg-gradient-to-br from-cyan-50 to-blue-50/50 px-5 py-3.5 text-sm font-semibold text-cyan-800 flex items-center gap-3 shadow-sm">
          <span className="flex h-5 w-5 shrink-0 animate-spin rounded-full border-[3px] border-cyan-200 border-t-cyan-600" />
          <span>AI 正在为您生成效果图，通常需要 20-60 秒，请耐心等待…</span>
        </div>
      )}

      {/* Image grid */}
      <div className={`grid gap-6 transition-all duration-700 ${
        selectedImage ? 'grid-cols-1 max-w-lg mx-auto' : 'grid-cols-1 md:grid-cols-3'
      }`}>
        {currentImages.map((img, index) => {
          const isHidden = selectedImage && selectedImage !== img;
          if (isHidden) return null;

          const isThisSlotGenerating = generatingSlots[index];

          return (
            <div
              key={index}
              className={`group relative overflow-hidden rounded-[1.75rem] border bg-white transition-all duration-300 ${
                selectedImage === img
                  ? 'border-cyan-300 shadow-2xl shadow-cyan-200/40 ring-2 ring-cyan-400'
                  : isThisSlotGenerating
                  ? 'border-cyan-200 shadow-xl shadow-cyan-100/30 ring-1 ring-cyan-300'
                  : 'border-slate-200/80 shadow-lg shadow-slate-200/30 hover:shadow-xl hover:-translate-y-1'
              }`}
            >
              {/* Card header */}
              <div className="flex items-center justify-between border-b border-slate-100/80 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-black ${
                    isThisSlotGenerating ? 'bg-cyan-100 text-cyan-600' : img ? 'bg-slate-100 text-slate-600' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {index + 1}
                  </span>
                  <span className={`text-sm font-bold ${isThisSlotGenerating ? 'text-cyan-600' : 'text-slate-700'}`}>
                    效果图 {index + 1}
                  </span>
                </div>
                {isThisSlotGenerating && (
                  <span className="flex items-center gap-1.5 rounded-full bg-cyan-50 px-2.5 py-1 text-[11px] font-bold text-cyan-600">
                    <span className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-cyan-400 border-t-cyan-600" />
                    生成中…
                  </span>
                )}
                {selectedImage === img && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-cyan-600 px-2.5 py-1 text-[11px] font-black text-white shadow-sm">
                    <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    已选定
                  </span>
                )}
              </div>

              {/* Image area */}
              {img ? (
                <div
                  className="relative aspect-square cursor-zoom-in bg-slate-50 overflow-hidden"
                  onClick={() => setPreviewImage(img)}
                >
                  <img
                    src={img}
                    alt={`外观设计 ${index + 1}`}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
                </div>
              ) : (
                <div className="flex aspect-square flex-col items-center justify-center gap-4 bg-gradient-to-b from-slate-50 to-slate-100 px-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm border border-slate-100">
                    <svg className="h-6 w-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  </div>
                  <p className="text-xs font-medium text-slate-400 text-center">点击下方按钮生成方案 {index + 1}</p>
                </div>
              )}

              {/* Card footer */}
              <div className="flex items-center gap-2 border-t border-slate-100/80 px-4 py-3">
                {img ? (
                  <>
                    <button
                      onClick={() => handleSelect(img)}
                      disabled={!!selectedImage}
                      className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-bold transition-all ${
                        selectedImage === img
                          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                          : selectedImage
                          ? 'bg-slate-50 text-slate-400 cursor-not-allowed'
                          : 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-md shadow-emerald-500/20 hover:from-emerald-600 hover:to-emerald-700 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0'
                      }`}
                    >
                      {selectedImage === img && (
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                      )}
                      {selectedImage === img ? '已选择' : selectedImage ? '已选定' : '选定此方案'}
                    </button>
                    {!selectedImage && (
                      <button
                        onClick={() => generateImage(index)}
                        disabled={isThisSlotGenerating}
                        className={`inline-flex items-center gap-1 rounded-full p-2.5 text-sm font-bold transition-all ${
                          isThisSlotGenerating
                            ? 'bg-slate-50 text-slate-400 cursor-not-allowed'
                            : 'bg-slate-50 text-slate-500 hover:bg-blue-50 hover:text-blue-600'
                        }`}
                        title="重新生成"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                      </button>
                    )}
                  </>
                ) : (
                  <button
                    onClick={() => generateImage(index)}
                    disabled={isThisSlotGenerating}
                    className={stepPrimaryButtonClass + ' w-full'}
                  >
                    {isThisSlotGenerating ? (
                      <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-b-transparent" />生成中…</>
                    ) : (
                      <><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>生成效果图</>
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Generate all CTA */}
      {!allGenerated && !isAnyGenerating && !selectedImage && (
        <div className="mt-8 flex justify-center">
          <button
            onClick={() => {
              imagesRef.current.forEach((img, index) => {
                if (!img && !generatingSlots[index]) generateImage(index);
              });
            }}
            className="inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 px-8 py-3.5 text-sm font-black text-white shadow-xl shadow-cyan-500/25 outline-none transition hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-cyan-500/30 active:translate-y-0 focus-visible:ring-4 focus-visible:ring-cyan-200"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            一键生成全部效果图
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

      {/* Confirm dialog */}
      {showConfirmDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          onClick={() => setShowConfirmDialog(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 ring-1 ring-amber-200">
                <svg className="h-6 w-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              </div>
              <h3 className="text-lg font-black text-slate-950">确认选择此效果图？</h3>
            </div>
            <p className="mb-6 text-sm leading-relaxed text-slate-600">
              选定后将<strong className="text-slate-900">无法更改</strong>。后续的<strong className="text-slate-900">故事板</strong>和<strong className="text-slate-900">爆炸图</strong>将基于此外观图生成，请谨慎选择。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                再想想
              </button>
              <button
                onClick={confirmSelection}
                className="flex-1 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition hover:from-emerald-600 hover:to-emerald-700 hover:shadow-xl active:shadow-md"
              >
                确定，就它了
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
