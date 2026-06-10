'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { StoryboardImage } from '@/types';
import { supabase } from '@/lib/supabase/client';
import { useImageJobs } from '@/lib/useImageJobs';
import StepHeader, { stepSubCardClass } from './StepHeader';

interface StoryboardStepProps {
  images: StoryboardImage[] | null;
  isLoading: boolean;
  idea: string;
  projectId: string;
  referenceImage?: string | null;
  onUpdate: (images: StoryboardImage[]) => void;
  onGeneratingChange?: (generating: boolean) => void;
  onGenerated?: () => void;
}

const SCENE_LABELS = ['问题环境', '痛点特写', '产品登场', '人机交互', '改变发生', '满意结局'];
const SCENE_COLORS = [
  { bar: 'bg-violet-500', dot: 'bg-violet-100 text-violet-600' },
  { bar: 'bg-blue-500', dot: 'bg-blue-100 text-blue-600' },
  { bar: 'bg-emerald-500', dot: 'bg-emerald-100 text-emerald-600' },
  { bar: 'bg-amber-500', dot: 'bg-amber-100 text-amber-600' },
  { bar: 'bg-rose-500', dot: 'bg-rose-100 text-rose-600' },
  { bar: 'bg-indigo-500', dot: 'bg-indigo-100 text-indigo-600' },
];
const defaultPanelDescriptions = [
  '用户遇到问题的初始情境——宽景镜头建立空间感',
  '用户面临的具体痛点与困扰——近景特写强化情绪张力',
  '产品作为解决方案登场——中景展示产品与人的目光交汇',
  '用户与产品交互的关键瞬间——手部动作、界面或产品的互动特写',
  '产品带来的积极改变——环境与情绪对比第2帧形成叙事弧线',
  '用户获得理想结果——安静满足的收束画面传递积极情绪',
];

// 每帧英文视觉提示词模板——仅在 AI 生成失败时作为 fallback
const frameVisualPrompts = (idea: string, frameIndex: number): string[] => {
  const templates: string[][] = [
    [
      `Wide establishing shot, cinematic 16:9 composition`,
      `The environment shows a problem scenario related to: ${idea} — the product is NOT yet present in this frame`,
      `Atmospheric lighting establishes the mood — soft, natural, slightly somber`,
      `Photorealistic, editorial quality, 16:9 cinematic aspect ratio, no text no watermarks`,
    ],
    [
      `Medium close-up shot, a person visibly affected by the problem that ${idea} aims to solve`,
      `Facial expression and body language convey the difficulty or cost of the current situation`,
      `Cooler tones, subtle shadows, shallow depth of field on the person`,
      `Photorealistic, emotional storytelling, no text no watermarks`,
    ],
    [
      `Medium shot, the ${idea} product enters as the solution — product design clearly visible`,
      `The lighting shifts warmer as the product appears, a visual spotlight moment`,
      `Person's gaze or gesture directed at the product with curiosity and hope`,
      `Photorealistic, 3D product render quality, no text no watermarks`,
    ],
    [
      `Close-up action shot, human hands actively interacting with the ${idea} product`,
      `Product details, textures, and interface clearly visible in the foreground`,
      `Warm dynamic lighting, slight motion blur conveying fluid action`,
      `Photorealistic, tactile and sensory, no text no watermarks`,
    ],
    [
      `Medium-wide shot, the same setting transformed — visibly improved after using the product`,
      `Warm golden-hour light fills the scene, brighter and more harmonious than frame 1`,
      `The product sits naturally integrated, the person relaxed and satisfied`,
      `Photorealistic, positive emotional tone, no text no watermarks`,
    ],
    [
      `Quiet cinematic ending shot, peaceful resolution — the journey is complete`,
      `Soft diffused natural light, gentle warm tones, balanced restful composition`,
      `The product is a natural companion in the frame, not the hero anymore`,
      `Photorealistic, serene and aspirational, no text no watermarks`,
    ],
  ];
  return templates[frameIndex] || templates[0];
};

const buildFallbackPrompt = (idea: string, frameIndex: number, desc: string): string => {
  const visual = frameVisualPrompts(idea, frameIndex);
  const sceneArc = ['Opening', 'Conflict', 'Turning Point', 'Interaction', 'Resolution', 'Closure'];
  return [
    `Frame ${frameIndex + 1} of a 6-frame visual storyboard: "${sceneArc[frameIndex]}"`,
    `Product: ${idea}`,
    `Scene: ${visual.join('. ')}`,
    `Context: ${desc || 'Seamless narrative continuation'}`,
    `Style: photorealistic, cinematic, 16:9, no text no watermarks`,
  ].join(' | ');
};

const normalizeImages = (images: StoryboardImage[] | null | undefined) =>
  Array.from({ length: 6 }, (_, i) => images?.[i] || { url: '', description: '' });

export default function StoryboardStep({ images, isLoading, idea, projectId, referenceImage, onUpdate, onGeneratingChange, onGenerated }: StoryboardStepProps) {
  const [internalGeneratingSlots, setInternalGeneratingSlots] = useState<Record<number, boolean>>({});
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [promptGenStatus, setPromptGenStatus] = useState<'idle' | 'generating' | 'done' | 'error'>('idle');
  const [aiFramePrompts, setAiFramePrompts] = useState<string[]>([]);
  const imagesRef = useRef<StoryboardImage[]>(normalizeImages(images));
  const localPendingRef = useRef<Record<number, boolean>>({});

  useEffect(() => { imagesRef.current = normalizeImages(images); }, [images]);

  const commitImages = useCallback((updater: (imgs: StoryboardImage[]) => StoryboardImage[]) => {
    const latest = normalizeImages(imagesRef.current);
    const next = normalizeImages(updater(latest));
    imagesRef.current = next;
    onUpdate(next);
  }, [onUpdate]);

  // 自动生成AI提示词：当组件挂载且尚未生成过时触发
  const generateAIPrompts = useCallback(async () => {
    if (promptGenStatus === 'generating' || promptGenStatus === 'done') return;
    setPromptGenStatus('generating');
    try {
      const r = await fetch('/api/storyboard-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea }),
      });
      const d = await r.json();
      if (!r.ok || !d.frames) throw new Error(d.error || 'AI prompt generation failed');
      const prompts = d.frames.map((f: any) => f.visualPrompt as string);
      // 将 AI 生成的描述写入对应帧的 description 字段
      commitImages(latest => {
        const n = normalizeImages(latest);
        d.frames.forEach((f: any) => {
          const i = f.index;
          n[i] = { ...n[i], description: n[i]?.description || f.sceneTitle, prompt: f.visualPrompt };
        });
        return n;
      });
      setAiFramePrompts(prompts);
      setPromptGenStatus('done');
    } catch (e: any) {
      console.error('AI storyboard prompt generation failed:', e);
      setPromptGenStatus('error');
    }
  }, [idea, promptGenStatus, commitImages]);

  // 首次进入故事板步骤时自动生成提示词
  useEffect(() => {
    const cur = normalizeImages(images);
    const hasAnyPrompt = cur.some(img => img.prompt);
    if (!hasAnyPrompt && promptGenStatus === 'idle' && !isLoading) {
      generateAIPrompts();
    }
    // 如果已有 prompt（从DB恢复），标记为 done
    if (hasAnyPrompt && promptGenStatus === 'idle') {
      const prompts = cur.map(img => img.prompt || '');
      if (prompts.some(Boolean)) {
        setAiFramePrompts(prompts);
        setPromptGenStatus('done');
      }
    }
  }, [images, isLoading, promptGenStatus, generateAIPrompts]);

  // 获取某一帧的视觉提示词：优先 AI 生成，回退模板
  const getFramePrompt = useCallback((idx: number, desc: string): string => {
    if (aiFramePrompts[idx]) return aiFramePrompts[idx];
    return buildFallbackPrompt(idea, idx, desc);
  }, [aiFramePrompts, idea]);

  const generatingSlots = internalGeneratingSlots;

  // Slot generating state helpers
  const setSlotGenerating = useCallback((i: number, v: boolean) => {
    setInternalGeneratingSlots(p => { const n = { ...p }; if (v) n[i] = true; else delete n[i]; return n; });
  }, []);
  const setMultipleSlotsGenerating = useCallback((indices: number[], v: boolean) => {
    setInternalGeneratingSlots(p => { const n = { ...p }; indices.forEach(i => { if (v) n[i] = true; else delete n[i]; }); return n; });
  }, []);

  useEffect(() => { onGeneratingChange?.(Object.values(internalGeneratingSlots).some(Boolean)); }, [internalGeneratingSlots, onGeneratingChange]);

  // useImageJobs 每 2s 轮询：同步生成中状态 + 合并已完成图片 URL
  const { refresh: refreshJobs } = useImageJobs({
    projectId, step: 'storyboard',
    onJobsLoaded: useCallback((slots: Record<number, boolean>, completedImages: Record<number, string>) => {
      // 合并式更新 + 本地锁保护
      setInternalGeneratingSlots(prev => {
        const next = { ...prev };
        for (const key of Object.keys(localPendingRef.current)) { next[Number(key)] = true; }
        for (const idx of Object.keys(slots)) { next[Number(idx)] = true; }
        for (const idx of Object.keys(completedImages)) {
          delete localPendingRef.current[Number(idx)];
          delete next[Number(idx)];
        }
        return next;
      });
      // 有已完成图片 → 立即合并到本地 images，不等页面级 polling
      const completedSlots = Object.keys(completedImages).map(Number);
      if (completedSlots.length > 0) {
        commitImages(latest => {
          const n = normalizeImages(latest);
          for (const idx of completedSlots) {
            n[idx] = { ...n[idx], url: completedImages[idx], description: n[idx]?.description || defaultPanelDescriptions[idx] };
          }
          return n;
        });
      }
    }, [commitImages]),
  });

  const generateImage = async (idx: number, opts: { skipGeneratingState?: boolean } = {}) => {
    if (generatingSlots[idx] && !opts.skipGeneratingState) return;
    if (!opts.skipGeneratingState) { localPendingRef.current[idx] = true; setSlotGenerating(idx, true); setLastError(null); }
    let completedImmediately = false;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const cur = normalizeImages(imagesRef.current);
      const desc = cur[idx]?.description || defaultPanelDescriptions[idx];
      // 优先使用 AI 为产品定制的提示词，回退到模板
      const prompt = getFramePrompt(idx, desc);
      const body: any = { type: 'storyboard', prompt, slotIndex: idx, expectedTotal: 6, userId: user?.id, projectId };
      if (referenceImage) body.referenceImage = referenceImage;
      const r = await fetch('/api/image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const d = await r.json();
      if (!r.ok || d.error) throw new Error(d.error || `HTTP ${r.status} (${r.statusText || '未知错误'})`);
      if (d.imageUrl) { commitImages(latest => { const n = normalizeImages(latest); n[idx] = { ...n[idx], url: d.imageUrl || '', description: n[idx]?.description || desc }; return n; }); completedImmediately = true; setLastError(null); }
    } catch (e: any) {
      console.error('生成失败:', e);
      delete localPendingRef.current[idx];
      setSlotGenerating(idx, false);
      setLastError(e.message || '生成失败，请重试');
    }
    // 同步返回 → 直接完成；异步 job → 立即刷新 jobs 状态 + useImageJobs 持续轮询
    if (completedImmediately) {
      delete localPendingRef.current[idx];
      setSlotGenerating(idx, false);
    } else {
      // 立即查一次 jobs 表确认 slot 状态已写入，不等 2s 轮询周期
      setTimeout(() => refreshJobs(), 500);
    }
  };

  const handleDesc = (idx: number, val: string) => { commitImages(latest => { const n = normalizeImages(latest); n[idx] = { ...n[idx], description: val }; return n; }); };

  const generateAll = async () => {
    const targets = Array.from({ length: 6 }, (_, i) => i).filter(i => !imagesRef.current[i]?.url && !generatingSlots[i]);
    if (!targets.length) return;
    setMultipleSlotsGenerating(targets, true);
    await Promise.all(targets.map(i => generateImage(i, { skipGeneratingState: true })));
  };

  if (isLoading) {
    return (
      <div className={`${stepSubCardClass} p-6 sm:p-8`}>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="rounded-2xl border border-slate-200 bg-white p-3">
              <div className="aspect-video rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 animate-pulse" />
              <div className="mt-3 space-y-2"><div className="h-3 w-2/3 rounded-full bg-slate-100 animate-pulse" /><div className="h-2.5 w-full rounded-full bg-white animate-pulse" /></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const currentImages = normalizeImages(images);
  const hasAnyImage = currentImages.some(img => img.url);
  const isAnyGenerating = Object.values(generatingSlots).some(Boolean);
  const emptySlotCount = currentImages.filter(img => !img.url).length;
  const generatingCount = Object.values(generatingSlots).filter(Boolean).length;

  return (
    <div className={`${stepSubCardClass} p-6 sm:p-8`}>
      <StepHeader
        title="故事板"
        description="6 个关键分镜 · 基于选定外观保持视觉一致"
        accent="amber"
        icon={
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
        }
        action={
          <div className="flex items-center gap-2.5">
            {promptGenStatus === 'generating' && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1.5 text-[11px] font-bold text-indigo-600">
                <span className="h-2 w-2 animate-spin rounded-full border-2 border-indigo-300 border-t-indigo-600" />
                AI 构思故事…
              </span>
            )}
            {promptGenStatus === 'done' && (
              <button onClick={() => { setPromptGenStatus('idle'); generateAIPrompts(); }}
                className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1.5 text-[10px] font-bold text-indigo-500 outline-none transition hover:bg-indigo-100 hover:text-indigo-700"
                title="重新生成故事板提示词">
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                重想故事
              </button>
            )}
            {isAnyGenerating && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-600">
                <span className="h-2 w-2 animate-spin rounded-full border-2 border-amber-400 border-t-amber-600" />
                {generatingCount}/6
              </span>
            )}
            {!hasAnyImage ? (
              <button onClick={generateAll} disabled={isAnyGenerating}
                className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-4 py-2 text-[13px] font-bold text-white shadow-sm outline-none transition hover:bg-blue-700 active:scale-[0.97] disabled:bg-blue-100">
                {isAnyGenerating ? <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />生成中</> : <><svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>一键生成全部</>}
              </button>
            ) : hasAnyImage && emptySlotCount > 0 && !isAnyGenerating ? (
              <button onClick={generateAll}
                className="inline-flex items-center gap-1.5 rounded-full bg-white border border-slate-200 px-4 py-2 text-[13px] font-bold text-slate-700 shadow-sm outline-none transition hover:bg-white hover:border-slate-300 active:scale-[0.97]">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                补全 {emptySlotCount} 个
              </button>
            ) : null}
          </div>
        }
      />

      {/* Generating banner */}
      {isAnyGenerating && (
        <div className="mb-5 rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-orange-50/50 px-4 py-3 text-[13px] font-semibold text-amber-600 flex items-center gap-2.5 shadow-sm">
          <span className="flex h-2 w-2 shrink-0 rounded-full bg-amber-500 animate-pulse" />
          AI 正在绘制 {generatingCount} 个分镜图，基于选定外观保持一致性，预计 20-60 秒
        </div>
      )}

      {/* Error banner */}
      {lastError && !isAnyGenerating && (
        <div className="mb-5 rounded-2xl border border-red-200 bg-gradient-to-br from-red-50 to-red-50/50 px-4 py-3 text-[13px] font-semibold text-red-600 flex items-start gap-2.5 shadow-sm">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 text-[10px] font-black">!</span>
          <div className="flex-1 min-w-0">
            <p className="font-bold">生成失败</p>
            <p className="mt-0.5 text-red-600 font-medium">{lastError}</p>
          </div>
          <button onClick={() => setLastError(null)} className="shrink-0 rounded-full p-1 text-red-600 hover:bg-red-100 hover:text-red-600 transition">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      {/* Grid: 3 columns × 2 rows = 6 panels */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {currentImages.map((img, idx) => {
          const isGen = generatingSlots[idx];
          const hasImg = Boolean(img.url);
          const col = SCENE_COLORS[idx];

          return (
            <div
              key={idx}
              className={`group relative flex flex-col overflow-hidden rounded-[1.75rem] border bg-white transition-all duration-300 shadow-lg ${
                isGen ? 'border-[#78350f] shadow-xl shadow-amber-100/30 ring-1 ring-amber-300/50' :
                hasImg ? 'border-slate-200/80 shadow-slate-200/20 hover:shadow-xl hover:-translate-y-0.5' :
                'border-slate-200/70 shadow-slate-100/20'
              }`}
            >
              {/* Thin color bar */}
              <div className={`h-1 w-full ${col.bar} shrink-0 ${hasImg ? 'opacity-90' : 'opacity-30'}`} />

              {/* Image */}
              {hasImg ? (
                <div className="relative aspect-video cursor-pointer overflow-hidden bg-slate-100" onClick={() => setPreviewImage(img.url)}>
                  <img src={img.url} alt={SCENE_LABELS[idx]} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                  <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/5" />
                  <span className="absolute top-2.5 left-2.5 flex h-6 w-6 items-center justify-center rounded-lg bg-black/45 text-[11px] font-bold text-white backdrop-blur-sm">{idx + 1}</span>
                </div>
              ) : (
                <div className="flex aspect-video flex-col items-center justify-center gap-3 bg-gradient-to-b from-slate-50 to-white border-b border-slate-200">
                  {isGen ? (
                    <>
                      <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#78350f] border-t-amber-500" />
                      <span className="text-xs font-medium text-amber-600">生成中…</span>
                    </>
                  ) : (
                    <button onClick={() => generateImage(idx)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-4 py-2 text-[12px] font-bold text-white shadow-sm outline-none transition hover:bg-blue-700 active:scale-[0.97]">
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      生成分镜
                    </button>
                  )}
                </div>
              )}

              {/* Body */}
              <div className="flex flex-col flex-1 p-3.5 gap-2.5">
                <div className="flex items-center gap-2">
                  <span className={`flex h-5 w-5 items-center justify-center rounded-md ${col.dot} text-[10px] font-bold`}>{idx + 1}</span>
                  <span className="text-[13px] font-bold text-slate-700 truncate">{SCENE_LABELS[idx]}</span>
                  {hasImg && !isGen && (
                    <button onClick={() => generateImage(idx)}
                      className="ml-auto inline-flex items-center gap-1 rounded-full border border-slate-200/80 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-500 outline-none transition-all hover:bg-white hover:border-slate-300 hover:text-slate-700 active:scale-[0.96]"
                      title="重新生成此分镜">
                      <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                      重新生成
                    </button>
                  )}
                </div>
                <textarea
                  value={img.description || ''}
                  onChange={e => handleDesc(idx, e.target.value)}
                  className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] leading-relaxed text-slate-700 outline-none transition placeholder:text-slate-500 focus:border-slate-300 focus:bg-slate-100 focus:ring-2 focus:ring-slate-200 h-16"
                  placeholder={defaultPanelDescriptions[idx]}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {!hasAnyImage && !isAnyGenerating && (
        <div className="mt-6 flex flex-col items-center rounded-[1.75rem] border-2 border-dashed border-slate-200 bg-gradient-to-b from-slate-50 to-white px-6 py-12 text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm border border-slate-200">
            <svg className="h-7 w-7 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
          </div>
          <p className="text-sm font-bold text-slate-700">尚未生成故事板</p>
          <p className="mt-1 text-xs font-medium text-slate-500">点击上方「一键生成全部」由 AI 自动创建 6 个分镜</p>
        </div>
      )}

      {/* Preview modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 p-4 backdrop-blur-sm" onClick={() => setPreviewImage(null)}>
          <button className="absolute top-5 right-5 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/80 transition hover:bg-white/20" onClick={() => setPreviewImage(null)}>
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
          <img src={previewImage} alt="预览" className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}
