'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { ProductIntro, StoryboardImage } from '@/types';
import { supabase } from '@/lib/supabase/client';
import { useImageTaskStore } from '@/lib/useImageTaskStore';
import {
  initializePromptStore,
  subscribePromptTasks,
  startPromptTask,
  isPromptActive,
  getResumableRunningTasks,
  setPromptTaskExecutor,
  clearPromptTaskExecutor,
  ensurePromptTaskRunning,
  deriveImageClientRequestId,
  type PromptTask,
} from '@/lib/promptTaskStore';
import { startImageGeneration } from '@/lib/imageTaskStore';
import { resolveImageUrl } from '@/lib/image/urlResolver';
import { normalizeStoryboardImages, safeFrameForProject } from '@/lib/storyboard';
import StepHeader, { stepSubCardClass } from './StepHeader';

interface StoryboardStepProps {
  images: StoryboardImage[] | null;
  isLoading: boolean;
  idea: string;
  projectId: string;
  referenceImage?: string | null;
  productIntro?: ProductIntro | null;
  selectedAppearanceIndex?: number | null;
  onUpdate: (images: StoryboardImage[]) => void;
  onGeneratingChange?: (generating: boolean) => void;
  onGenerated?: () => void;
  onFlushSave?: () => void;
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

const buildStoryboardContext = (productIntro?: ProductIntro | null, referenceImage?: string | null, selectedAppearanceIndex?: number | null): string => {
  const parts = [
    productIntro?.name ? `产品名称：${productIntro.name}` : '',
    productIntro?.tagline ? `一句话定位：${productIntro.tagline}` : '',
    productIntro?.target_users ? `目标用户：${productIntro.target_users}` : '',
    productIntro?.problem ? `核心痛点：${productIntro.problem}` : '',
    productIntro?.features?.filter(Boolean).length ? `核心功能：${productIntro.features.filter(Boolean).join('；')}` : '',
    productIntro?.advantages ? `核心优势：${productIntro.advantages}` : '',
    productIntro?.scenario ? `典型使用场景：${productIntro.scenario}` : '',
    referenceImage ? `用户已选定第${(selectedAppearanceIndex ?? 0) + 1}张外观图作为唯一产品外观参考；凡是画面中出现产品，必须严格沿用该参考图的形体比例、轮廓、材质、颜色、结构细节和设计语言，不允许重新设计产品外观。` : '',
  ].filter(Boolean);
  return parts.join('\n');
};

const buildBoundStoryboardPrompt = (visualPrompt: string, description: string): string => [
  // 描述绑定 —— visualPrompt 必须以 description 为画面核心
  `CRITICAL: The image must faithfully visualize this scene: "${description}"`,
  `Every element in the description must appear in the generated image. Do not contradict, omit, or replace any described detail.`,

  // 人物一致性
  `CHARACTER CONSISTENCY: The same person must appear across all frames that include a human — identical facial features, hairstyle, clothing, body type, and accessories. No frame may change the character's appearance.`,

  // 比例与尺度
  `SCALE VERIFICATION before rendering: product size must be physically correct relative to human body parts. Verify hand-to-product ratio, body-to-product height, and realistic spatial placement. Common failures to avoid: phone-sized product appearing as large as a laptop, hand fingers thicker than product buttons, product floating without a support surface.`,

  // 物理真实
  `PHYSICS CHECK before rendering: gravity applies to all objects (no floating), materials behave realistically (metal reflects sharply with specular highlights, glass is transparent with refraction, plastic is semi-matte diffuse, fabric drapes and folds naturally), all contact points are believable (no hand penetration through product surfaces, no impossible joint angles, realistic weight feedback in muscle tension).`,

  // 原 visualPrompt
  visualPrompt,

  // 产品外观
  `When the product appears: match the selected reference product appearance exactly — same silhouette, proportions, materials, color palette, component layout, and design language. Do not redesign or reinterpret the product.`,

  // 通用约束
  `Photorealistic cinematic frame, 16:9 aspect ratio, no text, no logo, no watermark, no readable labels.`,
].join(' ');

// 每帧英文视觉提示词模板——仅在 AI 生成失败时作为 fallback
const frameVisualPrompts = (idea: string, frameIndex: number): string[] => {
  const templates: string[][] = [
    [
      `Wide establishing shot, cinematic 16:9 composition`,
      `The environment shows a problem scenario related to: ${idea} — the product is NOT yet present in this frame`,
      `Atmospheric lighting establishes the mood — soft, natural, slightly somber`,
      `Photorealistic, editorial quality, 16:9 cinematic aspect ratio, no text, no logo, no watermarks`,
    ],
    [
      `Medium close-up shot, a person visibly affected by the problem that ${idea} aims to solve`,
      `Facial expression and body language convey the difficulty or cost of the current situation`,
      `Cooler tones, subtle shadows, shallow depth of field on the person`,
      `Photorealistic, emotional storytelling, no text, no logo, no watermarks`,
    ],
    [
      `Medium shot, the ${idea} product enters as the solution — product design clearly visible`,
      `The lighting shifts warmer as the product appears, a visual spotlight moment`,
      `Person's gaze or gesture directed at the product with curiosity and hope`,
      `Photorealistic, 3D product render quality, no text, no logo, no watermarks`,
    ],
    [
      `Close-up action shot, human hands actively interacting with the ${idea} product`,
      `Product details, textures, and interface clearly visible in the foreground`,
      `Warm dynamic lighting, slight motion blur conveying fluid action`,
      `Photorealistic, tactile and sensory, no text, no logo, no watermarks`,
    ],
    [
      `Medium-wide shot, the same setting transformed — visibly improved after using the product`,
      `Warm golden-hour light fills the scene, brighter and more harmonious than frame 1`,
      `The product sits naturally integrated, the person relaxed and satisfied`,
      `Photorealistic, positive emotional tone, no text, no logo, no watermarks`,
    ],
    [
      `Quiet cinematic ending shot, peaceful resolution — the journey is complete`,
      `Soft diffused natural light, gentle warm tones, balanced restful composition`,
      `The product is a natural companion in the frame, not the hero anymore`,
      `Photorealistic, serene and aspirational, no text, no logo, no watermarks`,
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
    `Style: photorealistic, cinematic, 16:9, no text, no logo, no watermarks`,
  ].join(' | ');
};

const normalizeImages = (images: StoryboardImage[] | null | undefined, projectId: string) =>
  normalizeStoryboardImages(images, projectId);

export default function StoryboardStep({ images, isLoading, idea, projectId, referenceImage, productIntro, selectedAppearanceIndex, onUpdate, onGeneratingChange, onGenerated, onFlushSave }: StoryboardStepProps) {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  // ── 提示词任务状态机（模块级执行器） ──
  const [promptTasks, setPromptTasks] = useState<Record<string, PromptTask>>(() => {
    if (typeof window === 'undefined') return {};
    return initializePromptStore();
  });

  const [aiFramePrompts, setAiFramePrompts] = useState<string[]>([]);
  const imagesRef = useRef<StoryboardImage[]>(normalizeImages(images, projectId));

  // 正在等新文案的槽位——该阶段不通过 onUpdate 触发自动保存，只标记 UI 状态
  const [slotsWithPendingText, setSlotsWithPendingText] = useState<Set<number>>(new Set());
  const [slotsWithImageStarting, setSlotsWithImageStarting] = useState<Set<number>>(new Set());

  useEffect(() => { imagesRef.current = normalizeImages(images, projectId); }, [images, projectId]);

  const { generatingSlots, completedImages, startGeneration, syncFromStore } = useImageTaskStore({ projectId, step: 'storyboard' });

  // 注入模块级执行器：generateFramePrompt 生命周期脱离组件
  useEffect(() => {
    const pid = projectId;
    setPromptTaskExecutor(
      // (1) 生成提示词
      async (task) => {
        if (task.projectId !== pid) throw new Error('SKIP_STALE');
        const { description, prompt } = await generateFramePrompt(task.slotIndex);
        // 写帧 state —— 但必须校验版本号：只有当前帧的 _regenerationId 还匹配，才允许写回
        const regenerationId = task.clientRequestId;
        const currentFrame = normalizeImages(imagesRef.current, pid)[task.slotIndex];
        if (currentFrame.generationId && currentFrame.generationId !== regenerationId) {
          // 不是本轮重整的结果，丢弃
          return { description: '', prompt: '' };
        }
        commitDescriptions(latest => {
          const n = normalizeImages(latest, pid);
          n[task.slotIndex] = {
            ...n[task.slotIndex],
            description,
            prompt,
            generationId: regenerationId,
          };
          return n;
        });
        // 新文案已到达，清除 pending 标记
        setSlotsWithPendingText(prev => { const next = new Set(prev); next.delete(task.slotIndex); return next; });
    setSlotsWithImageStarting(prev => { const next = new Set(prev); next.delete(task.slotIndex); return next; });
        setAiFramePrompts(prev => { const next = [...prev]; next[task.slotIndex] = prompt; return next; });
        return { description, prompt };
      },
      // (2) flush 保存帧到 DB
      async (task, result) => {
        if (task.projectId !== pid) return;
        // 校验版本号：不是本轮重整的结果，不写入 DB
        const currentFrame = normalizeImages(imagesRef.current, pid)[task.slotIndex];
        if (currentFrame.generationId && currentFrame.generationId !== task.clientRequestId) return;
        if (!result.description && !result.prompt) return; // 空结果（版本被淘汰）
        const res = await fetch(`/api/projects/${task.projectId}/image-slot`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            field: 'storyboard_images',
            index: task.slotIndex,
            url: currentFrame?.url || '',
            description: result.description,
            prompt: result.prompt,
            storagePath: currentFrame?.storagePath || null,
          }),
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || '保存故事板描述失败');
        onFlushSave?.();
      },
      // (3) 触发生图（幂等：clientRequestId 由 prompt task 派生）
      async (task, result) => {
        if (task.projectId !== pid) return;
        // 校验版本号
        const currentSlot = normalizeImages(imagesRef.current, pid)[task.slotIndex];
        if (currentSlot.generationId && currentSlot.generationId !== task.clientRequestId) return;
        if (!result.prompt) return; // 空结果（版本被淘汰）
        const imageClientRequestId = deriveImageClientRequestId(task.clientRequestId);
        setSlotsWithImageStarting(prev => new Set(prev).add(task.slotIndex));
        const { data: { user } } = await supabase.auth.getUser();
        const imageResult = await startImageGeneration({
          projectId: task.projectId,
          step: 'storyboard',
          slotIndex: task.slotIndex,
          prompt: result.prompt,
          referenceImage: referenceImage || undefined,
          previousImageUrl: imagesRef.current[task.slotIndex]?.url || undefined,
          userId: user?.id,
          clientRequestId: imageClientRequestId,
        });
        setSlotsWithImageStarting(prev => { const next = new Set(prev); next.delete(task.slotIndex); return next; });
        const latestSlot = normalizeImages(imagesRef.current, projectId)[task.slotIndex];
        const patch = await fetch(`/api/projects/${task.projectId}/image-slot`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            field: 'storyboard_images',
            index: task.slotIndex,
            url: imageResult.imageUrl || latestSlot?.url || '',
            description: result.description,
            prompt: result.prompt,
            storagePath: imageResult.storagePath || latestSlot?.storagePath || null,
          }),
        });
        const patchData = await patch.json();
        if (!patch.ok || patchData.error) throw new Error(patchData.error || '保存故事板图片槽位失败');
        syncFromStore();
      },
    );
    return () => clearPromptTaskExecutor();
  }, [projectId, idea, productIntro, referenceImage, selectedAppearanceIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // hydrate 后同步 + 订阅
  useEffect(() => {
    setPromptTasks(initializePromptStore());
    return subscribePromptTasks((updated) => setPromptTasks(updated));
  }, []);

  // resume：挂载/切路由回来时恢复所有 unexpired running 任务
  useEffect(() => {
    const tasks = getResumableRunningTasks(projectId);
    for (const task of tasks) void ensurePromptTaskRunning(task);
  }, [projectId, promptTasks]); // eslint-disable-line react-hooks/exhaustive-deps

  // promptingSlots 从 promptTasks 派生
  const promptingSlots: Record<number, boolean> = {};
  /** 每帧最新的重整 key，用于 textarea 强制重新挂载 */
  const slotRegenKey: Record<number, string> = {};
  for (const task of Object.values(promptTasks)) {
    if (task.projectId === projectId && isPromptActive(task)) {
      promptingSlots[task.slotIndex] = true;
      slotRegenKey[task.slotIndex] = task.clientRequestId;
    }
  }

  const [promptGenStatus, setPromptGenStatus] = useState<'idle' | 'generating' | 'done' | 'error'>('idle');
  const promptGenStatusRef = useRef(promptGenStatus);
  promptGenStatusRef.current = promptGenStatus;

  // 切换项目时重置提示词状态，防止旧项目数据串到新项目
  useEffect(() => {
    setPromptGenStatus('idle');
    setAiFramePrompts([]);
    setSlotsWithImageStarting(new Set());
    setLastError(null);
  }, [projectId]);

  const lastCompletedRef = useRef<string>('');

  // 已完成图片 → 立即合并到本地 images（防无限循环：按内容比较而非引用）
  // 严格保留已有 description 和 prompt，不覆盖用户编辑或 AI 生成的文字
  useEffect(() => {
    const urls = Object.entries(completedImages);
    if (urls.length === 0) return;
    const key = JSON.stringify(urls);
    if (key === lastCompletedRef.current) return;
    lastCompletedRef.current = key;
    const cur = normalizeImages(imagesRef.current, projectId);
    for (const [idxStr, url] of urls) {
      const idx = Number(idxStr);
      if (idx >= 0 && idx < 6) {
        cur[idx] = {
          ...cur[idx],
          url,
          description: cur[idx]?.description || '',
          prompt: cur[idx]?.prompt || '',
        };
      }
    }
    imagesRef.current = cur;
    onUpdate(cur);
  }, [completedImages, onUpdate]);

  useEffect(() => { onGeneratingChange?.(Object.values(generatingSlots).some(Boolean)); }, [generatingSlots, onGeneratingChange]);

  const commitDescriptions = useCallback((updater: (imgs: StoryboardImage[]) => StoryboardImage[]) => {
    const latest = normalizeImages(imagesRef.current, projectId);
    const next = normalizeImages(updater(latest), projectId);
    imagesRef.current = next;
    onUpdate(next);
  }, [onUpdate]);

  const generateFramePrompt = useCallback(async (idx: number): Promise<{ description: string; prompt: string }> => {
    const r = await fetch('/api/storyboard-prompts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idea, context: buildStoryboardContext(productIntro, referenceImage, selectedAppearanceIndex) }),
    });
    const d = await r.json();
    if (!r.ok || !d.frames) throw new Error(d.error || 'AI prompt generation failed');
    const frame = d.frames.find((f: any) => f.index === idx) || d.frames[idx];
    if (!frame) throw new Error('AI prompt generation failed');
    const description = frame.description || frame.sceneTitle || defaultPanelDescriptions[idx];
    const prompt = buildBoundStoryboardPrompt(frame.visualPrompt, description);
    return { description, prompt };
  }, [idea, productIntro, referenceImage, selectedAppearanceIndex]);

  // 生成AI提示词 —— 通过 ref 读取状态避免 stale closure
  const generateAIPromptsCore = useCallback(async (forceOverwrite: boolean) => {
    const status = promptGenStatusRef.current;
    if (status === 'generating') return;
    if (!forceOverwrite && status === 'done') return;
    setPromptGenStatus('generating');
    try {
      const r = await fetch('/api/storyboard-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idea, context: buildStoryboardContext(productIntro, referenceImage, selectedAppearanceIndex) }),
      });
      const d = await r.json();
      if (!r.ok || !d.frames) throw new Error(d.error || 'AI prompt generation failed');
      const prompts = d.frames.map((f: any) => buildBoundStoryboardPrompt(f.visualPrompt as string, f.description || f.sceneTitle));
      // 写入帧——forceOverwrite 时覆盖 description，初次保留用户编辑
      commitDescriptions(latest => {
        const n = normalizeImages(latest, projectId);
        d.frames.forEach((f: any) => {
          const i = f.index;
          const description = f.description || f.sceneTitle;
          n[i] = {
            ...n[i],
            description: forceOverwrite ? description : (n[i]?.description || description),
            prompt: buildBoundStoryboardPrompt(f.visualPrompt, description),
          };
        });
        return n;
      });
      setAiFramePrompts(prompts);
      setPromptGenStatus('done');
      // AI 生成的描述必须立即落库，不等 2 秒自动保存（防止窗口期内刷新丢失）
      onFlushSave?.();
    } catch (e: any) {
      console.error('AI storyboard prompt generation failed:', e);
      setPromptGenStatus('error');
    }
  }, [idea, productIntro, referenceImage, selectedAppearanceIndex, commitDescriptions, onFlushSave]);

  // 首次进入时自动生成（不覆盖已有描述）
  const generateAIPrompts = useCallback(() => generateAIPromptsCore(false), [generateAIPromptsCore]);

  // 首次进入故事板步骤时自动生成提示词
  useEffect(() => {
    const cur = normalizeImages(images, projectId);
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

  // 获取某一帧的视觉提示词：始终把中文描述绑定到图片提示词，优先 AI 生成，回退模板
  const getFramePrompt = useCallback((idx: number, desc: string): string => {
    const visualPrompt = aiFramePrompts[idx] || buildFallbackPrompt(idea, idx, desc);
    return buildBoundStoryboardPrompt(visualPrompt, desc || defaultPanelDescriptions[idx]);
  }, [aiFramePrompts, idea]);

  // 单卡重新生成：只触发，模块级 runner 接管全部后续（generate → flush → startImage）
  const regenerateFrameAndImage = (idx: number) => {
    if (generatingSlots[idx] || promptingSlots[idx] || slotsWithImageStarting.has(idx)) return;
    setLastError(null);
    const task = startPromptTask(projectId, idx);
    const regenerationId = task.clientRequestId;
    // 把 _regenerationId 写进 imagesRef（不触发 onUpdate → 不加入自动保存队列，防止刷新时空文本落库）
    const cur = normalizeImages(imagesRef.current, projectId);
    cur[idx] = { ...cur[idx], description: '', prompt: '', generationId: regenerationId };
    imagesRef.current = cur;
    // 标记 UI 状态
    setSlotsWithImageStarting(prev => { const next = new Set(prev); next.add(idx); return next; });
    setSlotsWithPendingText(prev => new Set(prev).add(idx));
    setPromptTasks(initializePromptStore());
    void ensurePromptTaskRunning(task);
  };

  // 首次生成/补全：直接使用已有提示词生成图片（不重新刷新提示词）
  const generateImage = async (idx: number) => {
    if (generatingSlots[idx]) return;
    setLastError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const cur = normalizeImages(imagesRef.current, projectId);
      const desc = cur[idx]?.description || defaultPanelDescriptions[idx];
      const prompt = getFramePrompt(idx, desc);
      const result = await startGeneration({
        slotIndex: idx,
        prompt,
        referenceImage: referenceImage || undefined,
        previousImageUrl: cur[idx]?.url || undefined,
        userId: user?.id,
      });
      syncFromStore();
      if (result.imageUrl) {
        const n = normalizeImages(imagesRef.current, projectId);
        n[idx] = { ...n[idx], url: result.imageUrl, description: n[idx]?.description || desc };
        imagesRef.current = n;
        onUpdate(n);
      }
    } catch (e: any) {
      setLastError(e.message || '生成失败，请重试');
    }
  };

  const handleDesc = (idx: number, val: string) => { commitDescriptions(latest => { const n = normalizeImages(latest, projectId); n[idx] = { ...n[idx], description: val }; return n; }); };

  const generateAll = async () => {
    const targets = Array.from({ length: 6 }, (_, i) => i).filter(i => !imagesRef.current[i]?.url && !generatingSlots[i]);
    if (!targets.length) return;
    await Promise.all(targets.map(i => generateImage(i)));
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

  const _currentImages = normalizeImages(images, projectId);
  // 合并 UI 状态：pending 文字槽位显示为已清空，不展示旧文案
  // 同时过滤不属于当前项目的数据（防串台最终防线）
  const displayImages = _currentImages.map((img, idx) => {
    const safe = safeFrameForProject(img, projectId);
    const base = safe || normalizeImages([], projectId)[idx];
    if (slotsWithPendingText.has(idx)) {
      return { ...base, description: '', prompt: '' };
    }
    return base;
  });
  const currentImages = displayImages;
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
        {displayImages.map((img, idx) => {
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
                <div className="relative aspect-video cursor-pointer overflow-hidden bg-slate-100" onClick={() => !isGen && !promptingSlots[idx] && !slotsWithImageStarting.has(idx) && setPreviewImage(img.url)}>
                  <img src={img.url} alt={SCENE_LABELS[idx]} className={`h-full w-full object-cover transition duration-500 ${isGen || promptingSlots[idx] || slotsWithImageStarting.has(idx) ? 'blur-[2px] scale-105' : 'group-hover:scale-105'}`}
                    onError={(e) => {
                      const { url } = resolveImageUrl(null, img.storagePath || null);
                      if (url && url !== (e.target as HTMLImageElement).src) {
                        (e.target as HTMLImageElement).src = url;
                      }
                    }}
                  />
                  {/* 生成中遮罩 */}
                  {(isGen || promptingSlots[idx] || slotsWithImageStarting.has(idx)) && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-amber-500/20 via-amber-400/10 to-orange-500/20 backdrop-blur-[1px]">
                      <div className="relative">
                        <span className="absolute inset-0 h-12 w-12 animate-ping rounded-full bg-amber-400/30" />
                        <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-500/40">
                          <svg className="h-6 w-6 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        </span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[13px] font-black text-amber-700 drop-shadow-sm">
                          {promptingSlots[idx] ? '重整故事…' : '正在重新生成…'}
                        </span>
                        <span className="text-[10px] font-bold text-amber-600/80">
                          {promptingSlots[idx] ? 'AI 重写分镜描述' : `第 ${idx + 1} 帧 · ${SCENE_LABELS[idx]}`}
                        </span>
                      </div>
                    </div>
                  )}
                  <div className={`absolute inset-0 bg-black/0 transition-colors ${isGen || promptingSlots[idx] || slotsWithImageStarting.has(idx) ? '' : 'group-hover:bg-black/5'}`} />
                  <span className="absolute top-2.5 left-2.5 flex h-6 w-6 items-center justify-center rounded-lg bg-black/45 text-[11px] font-bold text-white backdrop-blur-sm">{idx + 1}</span>
                  {/* 生成中脉冲边框 */}
                  {isGen && (
                    <div className="absolute inset-0 rounded-[1.75rem] ring-2 ring-amber-400/60 animate-pulse pointer-events-none" />
                  )}
                </div>
              ) : (
                <div className={`flex aspect-video flex-col items-center justify-center gap-4 bg-gradient-to-b border-b border-slate-200 ${isGen ? 'from-amber-50 via-amber-50/50 to-white' : 'from-slate-50 to-white border-slate-200'}`}>
                  {isGen ? (
                    <>
                      {/* 大号动画 spinner + glow */}
                      <div className="relative">
                        <span className="absolute -inset-4 rounded-full bg-amber-400/20 animate-pulse blur-xl" />
                        <span className="absolute -inset-2 rounded-full bg-amber-400/30 animate-ping" />
                        <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-xl shadow-amber-500/40">
                          <svg className="h-7 w-7 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        </span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-[14px] font-black text-amber-700">
                          AI 正在绘制第 {idx + 1} 帧
                        </span>
                        <span className="text-[11px] font-bold text-amber-500">
                          {SCENE_LABELS[idx]} · 预计 20-60 秒
                        </span>
                      </div>
                      {/* 进度动画条 */}
                      <div className="w-40 h-1 rounded-full bg-amber-100 overflow-hidden">
                        <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-amber-400 to-orange-500" style={{ animation: 'progress-bar-sweep 1.5s ease-in-out infinite' }} />
                      </div>
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
                    <button onClick={() => regenerateFrameAndImage(idx)}
                      disabled={!!promptingSlots[idx] || slotsWithImageStarting.has(idx)}
                      className="ml-auto inline-flex items-center gap-1 rounded-full border border-slate-200/80 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-500 outline-none transition-all hover:bg-white hover:border-slate-300 hover:text-slate-700 active:scale-[0.96] disabled:opacity-50"
                      title="重新生成此分镜（先刷新故事描述，再生成图片）">
                      {promptingSlots[idx] || slotsWithImageStarting.has(idx) ? (
                        <><span className="h-3 w-3 animate-spin rounded-full border-2 border-indigo-300 border-t-indigo-600" />重整故事…</>
                      ) : (
                        <><svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>重想故事再生图</>
                      )}
                    </button>
                  )}
                </div>
                <textarea
                  key={`desc-${idx}-${slotRegenKey[idx] || 'stable'}`}
                  value={img.description || ''}
                  onChange={e => handleDesc(idx, e.target.value)}
                  className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-[12px] leading-relaxed text-slate-700 outline-none transition placeholder:text-slate-500 focus:border-slate-300 focus:bg-slate-100 focus:ring-2 focus:ring-slate-200 h-16"
                  placeholder={defaultPanelDescriptions[idx]}
                  disabled={!!promptingSlots[idx]}
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
