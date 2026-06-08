'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useProject } from '@/contexts/ProjectContext';
import type { Project } from '@/types';
import BackgroundStep from '@/components/BackgroundStep';
import ProductIntroStep from '@/components/ProductIntroStep';
import PersonaStep from '@/components/PersonaStep';
import AppearanceStep from '@/components/AppearanceStep';
import CMFStep from '@/components/CMFStep';
import StoryboardStep from '@/components/StoryboardStep';
import ExplodedViewStep from '@/components/ExplodedViewStep';
import ExportPanel from '@/components/ExportPanel';

const stepFieldMapping: Record<number, string> = {
  0: 'background',
  1: 'product_intro',
  2: 'personas',
  3: 'appearance_images',
  4: 'cmf',
  5: 'storyboard_images',
  6: 'exploded_view_image',
};

const stepNames = [
  '背景研究',
  '产品介绍',
  '用户画像',
  '外观设计',
  'CMF方案',
  '故事板',
  '爆炸图',
];

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const { state, fetchProject, generateStep, nextStep, updateProject, goToStep, localUpdate, saveCurrentStep } = useProject();
  const projectId = params.projectId as string;
  const [selectedAppearance, setSelectedAppearance] = useState<string | null>(null);
  const [appearanceGeneratingSlots, setAppearanceGeneratingSlots] = useState<Record<number, boolean>>({});
  const [storyboardGeneratingSlots, setStoryboardGeneratingSlots] = useState<Record<number, boolean>>({});
  const [isExplodedViewGenerating, setIsExplodedViewGenerating] = useState(false);

  const updateAppearanceGenerating = (index: number, value: boolean) => {
    setAppearanceGeneratingSlots((prev) => ({ ...prev, [index]: value }));
  };

  const updateStoryboardGenerating = (index: number, value: boolean) => {
    setStoryboardGeneratingSlots((prev) => ({ ...prev, [index]: value }));
  };

  useEffect(() => {
    setSelectedAppearance(state.project?.appearance_images?.[0] || null);
  }, [state.project?.id, state.project?.appearance_images?.[0]]);

  useEffect(() => {
    if (projectId) {
      fetchProject(projectId);
    }
  }, [projectId]);

  useEffect(() => {
    if (state.project && state.currentStep === 0 && !state.project.background && !state.isLoading) {
      generateStep(0);
    }
  }, [state.project?.id, state.currentStep, state.project?.background, state.isLoading]);

  const handleRegenerate = async () => {
    await saveCurrentStep();
    if (state.currentStep < 7) {
      generateStep(state.currentStep, { force: true, referenceImage: selectedAppearance });
    }
  };

  const handleNextStep = async () => {
    // 图片步骤必须至少生成一张图才能继续
    if (state.currentStep === 3) {
      if (!state.project?.appearance_images?.some(Boolean)) return;
      if (state.project?.appearance_images?.some(Boolean) && !selectedAppearance) return;
    }
    if (state.currentStep === 5) {
      if (!state.project?.storyboard_images?.some(img => img.url)) return;
    }
    if (state.currentStep === 6) {
      if (!state.project?.exploded_view_image) return;
    }
    await saveCurrentStep();
    // 先保存当前步骤，再导航到下一步，避免全局loading阻塞UI
    const field = stepFieldMapping[state.currentStep];
    if (field) {
      await updateProject({ [field]: (state.project as any)[field] } as Partial<Project>);
    }
    nextStep();
  };

  const handleSkipStep = async () => {
    nextStep({ autoGenerate: false });
  };

  const renderStepContent = () => {
    const { project, currentStep, isLoading } = state;

    if (!project) return null;

    // 只在当前步骤对应的数据正在生成时才显示loading骨架屏
    // 其他已完成的步骤数据保持可见
    const isCurrentStepLoading = isLoading && !!stepFieldMapping[currentStep];

    switch (currentStep) {
      case 0:
        return (
          <BackgroundStep
            content={project.background}
            isLoading={isCurrentStepLoading}
            onUpdate={(content) => localUpdate('background', content)}
          />
        );
      case 1:
        return (
          <ProductIntroStep
            data={project.product_intro}
            isLoading={isCurrentStepLoading}
            onUpdate={(data) => localUpdate('product_intro', data)}
          />
        );
      case 2:
        return (
          <PersonaStep
            personas={project.personas}
            isLoading={isCurrentStepLoading}
            onUpdate={(personas) => localUpdate('personas', personas)}
          />
        );
      case 3:
        return (
          <AppearanceStep
            images={project.appearance_images}
            isLoading={isCurrentStepLoading}
            idea={project.idea}
            projectId={project.id}
            generatingSlots={appearanceGeneratingSlots}
            onGeneratingChange={updateAppearanceGenerating}
            onUpdate={(images) => localUpdate('appearance_images', images)}
            onSelectionChange={setSelectedAppearance}
          />
        );
      case 4:
        return (
          <CMFStep
            cmf={project.cmf}
            isLoading={isCurrentStepLoading}
            onUpdate={(cmf) => localUpdate('cmf', cmf)}
          />
        );
      case 5:
        return (
          <StoryboardStep
            images={project.storyboard_images}
            isLoading={isCurrentStepLoading}
            idea={project.idea}
            projectId={project.id}
            referenceImage={selectedAppearance}
            generatingSlots={storyboardGeneratingSlots}
            onGeneratingChange={updateStoryboardGenerating}
            onUpdate={(images) => localUpdate('storyboard_images', images)}
          />
        );
      case 6:
        return (
          <ExplodedViewStep
            image={project.exploded_view_image}
            isLoading={isCurrentStepLoading}
            idea={project.idea}
            projectId={project.id}
            referenceImage={selectedAppearance}
            isGenerating={isExplodedViewGenerating}
            onGeneratingChange={setIsExplodedViewGenerating}
            onUpdate={(image) => localUpdate('exploded_view_image', image)}
          />
        );
      case 7:
        return <ExportPanel project={project} selectedAppearance={selectedAppearance} />;
      default:
        return null;
    }
  };

  if (state.isLoading && !state.project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-100 border-b-blue-600" />
      </div>
    );
  }

  const completedStep = state.project?.current_step || 0;
  const title = (state.project?.product_intro as any)?.name || '产品设计项目';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 text-slate-950">
      <header className="sticky top-0 z-30 border-b border-white/70 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-4 py-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm outline-none transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 active:translate-y-0 focus-visible:ring-4 focus-visible:ring-blue-100"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
                项目列表
              </button>
              <button
                onClick={() => router.push('/')}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm outline-none transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 active:translate-y-0 focus-visible:ring-4 focus-visible:ring-blue-100"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l5-5M7 10l5 5M7 10l-5 5" /></svg>
                主页
              </button>
            </div>

            <div className="min-w-0 flex-1 lg:text-center">
              <h1 className="truncate text-xl font-black tracking-tight text-slate-950">{title}</h1>
              <div className="mt-1 flex items-center gap-2 text-sm text-slate-500 lg:justify-center">
                {state.isSaving && <span>保存中...</span>}
                {state.lastSaved && !state.isSaving && (
                  <span>已保存 {state.lastSaved.toLocaleTimeString('zh-CN')}</span>
                )}
              </div>
            </div>

            <div className="rounded-full bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700 shadow-sm outline-none transition hover:-translate-y-0.5 hover:bg-blue-100">
              {state.currentStep < 7 ? `第 ${state.currentStep + 1} / 7 步` : '导出方案'}
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-8">
              {stepNames.map((name, index) => {
                const enabled = index <= completedStep;
                const active = index === state.currentStep;
                return (
                  <button
                    key={index}
                    onClick={() => enabled && goToStep(index)}
                    className={`rounded-xl px-2 py-2 text-xs font-bold outline-none transition ${
                      active
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                        : enabled
                        ? 'bg-white text-slate-600 hover:bg-blue-50 hover:text-blue-700'
                        : 'cursor-not-allowed bg-slate-100 text-slate-400'
                    }`}
                    title={name}
                  >
                    <span className="block text-[10px] opacity-70">{index + 1}</span>
                    <span className="block truncate">{name}</span>
                  </button>
                );
              })}
              <button
                onClick={() => state.project?.current_step === 7 && goToStep(7)}
                className={`rounded-xl px-2 py-2 text-xs font-bold outline-none transition ${
                  state.currentStep === 7
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                    : state.project?.current_step === 7
                    ? 'bg-white text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                    : 'cursor-not-allowed bg-slate-100 text-slate-400'
                }`}
                title="导出"
              >
                <span className="block text-[10px] opacity-70">8</span>
                <span className="block truncate">导出</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {state.error && (
          <div className="mb-6 flex items-center justify-between rounded-2xl border border-red-100 bg-red-50 p-4 text-red-700 shadow-sm">
            <span>{state.error}</span>
            <button
              onClick={() => window.location.reload()}
              className="rounded-full bg-white px-4 py-2 text-sm font-bold text-red-700 outline-none transition hover:-translate-y-0.5 hover:bg-red-100 active:translate-y-0 focus-visible:ring-4 focus-visible:ring-red-100"
            >
              重试
            </button>
          </div>
        )}

        <div className="relative">
          <div className="pointer-events-none absolute -left-10 top-10 h-48 w-48 rounded-full bg-blue-200/30 blur-3xl" />
          <div className="relative">{renderStepContent()}</div>
        </div>

        {state.currentStep < 7 && (
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            {![3, 5, 6].includes(state.currentStep) && (
              <button
                onClick={handleRegenerate}
                disabled={state.isLoading || state.isSaving}
                className="rounded-full border border-slate-200 bg-white px-6 py-3 font-bold text-slate-700 shadow-sm outline-none transition hover:-translate-y-0.5 hover:bg-slate-50 active:translate-y-0 focus-visible:ring-4 focus-visible:ring-slate-200 disabled:bg-slate-50 disabled:text-slate-400 disabled:shadow-none disabled:hover:translate-y-0"
              >
                {state.isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-600 border-b-transparent" />
                    生成中...
                  </span>
                ) : '重新生成'}
              </button>
            )}
            <button
              onClick={handleSkipStep}
              disabled={state.isLoading || state.isSaving}
              className="rounded-full border border-slate-200 bg-white px-6 py-3 font-bold text-slate-700 shadow-sm outline-none transition hover:-translate-y-0.5 hover:bg-slate-50 active:translate-y-0 focus-visible:ring-4 focus-visible:ring-slate-200 disabled:bg-slate-50 disabled:text-slate-400 disabled:shadow-none disabled:hover:translate-y-0"
            >
              跳过此部分
            </button>
            <button
              onClick={handleNextStep}
              disabled={state.isLoading || state.isSaving || (state.currentStep === 3 && (!state.project?.appearance_images?.some(Boolean) || (state.project?.appearance_images?.some(Boolean) && !selectedAppearance))) || (state.currentStep === 5 && !state.project?.storyboard_images?.some(img => img.url)) || (state.currentStep === 6 && !state.project?.exploded_view_image)}
              className={`rounded-full px-7 py-3 font-bold shadow-lg outline-none transition hover:-translate-y-0.5 active:translate-y-0 focus-visible:ring-4 disabled:shadow-none disabled:hover:translate-y-0 ${
                state.isLoading
                  ? 'bg-slate-400 text-white'
                  : (state.currentStep === 3 && (!state.project?.appearance_images?.some(Boolean) || (state.project?.appearance_images?.some(Boolean) && !selectedAppearance))) || (state.currentStep === 5 && !state.project?.storyboard_images?.some(img => img.url)) || (state.currentStep === 6 && !state.project?.exploded_view_image)
                  ? 'bg-slate-300 text-slate-500'
                  : 'bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-200'
              }`}
            >
              {state.isLoading ? '请稍候...' : (
                (() => {
                  const isDisabled = (state.currentStep === 3 && (!state.project?.appearance_images?.some(Boolean) || (state.project?.appearance_images?.some(Boolean) && !selectedAppearance))) || (state.currentStep === 5 && !state.project?.storyboard_images?.some(img => img.url)) || (state.currentStep === 6 && !state.project?.exploded_view_image);
                  if (isDisabled) {
                    return '请先生成图片';
                  }
                  return '满意，下一步 →';
                })()
              )}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
