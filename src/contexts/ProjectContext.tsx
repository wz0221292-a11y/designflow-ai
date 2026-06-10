'use client';

import { createContext, useContext, useReducer, ReactNode, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { Project, ProjectState, ProjectAction } from '@/types';

const initialState: ProjectState = {
  project: null,
  currentStep: 0,
  isLoading: false,
  error: null,
  isExporting: false,
  isSaving: false,
  lastSaved: null,
  hasUnsavedChanges: false,
};

const stepFieldMapping: Record<number, keyof Project> = {
  0: 'background',
  1: 'product_intro',
  2: 'personas',
  3: 'appearance_images',
  4: 'cmf',
  5: 'storyboard_images',
  6: 'exploded_view_image',
};

function getViewedStepKey(projectId: string) {
  return `project_viewed_step_${projectId}`;
}

function getStoredViewedStep(project: Project) {
  if (typeof window === 'undefined') return project.current_step;
  const raw = window.localStorage.getItem(getViewedStepKey(project.id));
  const step = raw ? Number.parseInt(raw, 10) : project.current_step;
  return Number.isInteger(step) && step >= 0 && step <= 7 ? step : project.current_step;
}

function storeViewedStep(projectId: string, step: number) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(getViewedStepKey(projectId), String(step));
}

function hasStepContent(project: Project | null, step: number) {
  if (!project) return false;
  switch (step) {
    case 0:
      return Boolean(project.background?.trim());
    case 1:
      return Boolean(project.product_intro);
    case 2:
      return Boolean(project.personas?.length);
    case 3:
      return Boolean(project.appearance_images?.some(Boolean));
    case 4:
      return Boolean(project.cmf);
    case 5:
      return (project.storyboard_images?.filter((image) => image?.url).length || 0) >= 6;
    case 6:
      return Boolean(project.exploded_view_image);
    default:
      return true;
  }
}

function projectReducer(state: ProjectState, action: ProjectAction): ProjectState {
  switch (action.type) {
    case 'SET_PROJECT': {
      const viewedStep = getStoredViewedStep(action.payload);
      const isSameProject = state.project?.id === action.payload.id;
      return {
        ...state,
        project: action.payload,
        // 同项目刷新 → 保持当前步骤；切换到其他项目 → 用新项目的步骤
        currentStep: isSameProject ? state.currentStep : viewedStep,
      };
    }
    case 'SET_STEP':
      return {
        ...state,
        currentStep: action.payload,
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
      };
    case 'SET_EXPORTING':
      return {
        ...state,
        isExporting: action.payload,
      };
    case 'SET_SAVING':
      return {
        ...state,
        isSaving: action.payload,
      };
    case 'SET_LAST_SAVED':
      return {
        ...state,
        lastSaved: action.payload,
        isSaving: false,
        hasUnsavedChanges: false,
      };
    case 'MARK_DIRTY':
      return {
        ...state,
        hasUnsavedChanges: true,
      };
    case 'MARK_CLEAN':
      return {
        ...state,
        hasUnsavedChanges: false,
      };
    case 'UPDATE_FIELD':
      if (!state.project) return state;
      return {
        ...state,
        project: {
          ...state.project,
          [action.payload.field]: action.payload.value,
        },
      };
    case 'MERGE_PROJECT':
      if (!state.project) return state;
      return {
        ...state,
        project: {
          ...state.project,
          ...action.payload,
        },
      };
    case 'MERGE_SILENT':
      if (!state.project) return state;
      return {
        ...state,
        isSaving: false,
        isLoading: false,
        lastSaved: new Date(),
        project: {
          ...state.project,
          ...action.payload,
        },
      };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

interface ProjectContextType {
  state: ProjectState;
  dispatch: React.Dispatch<ProjectAction>;
  fetchProject: (id: string) => Promise<void>;
  refreshProjectSilent: (id: string) => Promise<void>;
  mergeImagesSilent: (images: Partial<Project>) => void;
  updateProject: (updates: Partial<Project>) => Promise<void>;
  localUpdate: (field: string, value: any) => void;
  saveCurrentStep: () => Promise<void>;
  generateStep: (step: number, options?: { force?: boolean; referenceImage?: string | null }) => Promise<void>;
  nextStep: (options?: { autoGenerate?: boolean }) => Promise<void>;
  goToStep: (step: number) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(projectReducer, initialState);
  const stateRef = useRef(initialState);

  const setState = (action: ProjectAction) => {
    stateRef.current = projectReducer(stateRef.current, action);
    dispatch(action);
  };

  const fetchProject = async (id: string) => {
    setState({ type: 'SET_LOADING', payload: true });
    setState({ type: 'SET_ERROR', payload: null });
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(`/api/projects/${id}`, { cache: 'no-store', signal: controller.signal });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setState({ type: 'SET_PROJECT', payload: data });
      setState({ type: 'SET_LOADING', payload: false });
      setState({ type: 'SET_LAST_SAVED', payload: new Date() });
    } catch (error: any) {
      const isTimeout = error.name === 'AbortError' || error.message?.includes('abort') || error.message?.includes('超时');
      const message = isTimeout ? '连接超时，无法加载项目。请检查网络后刷新重试。' : error.message;
      setState({ type: 'SET_ERROR', payload: message });
      setState({ type: 'SET_LOADING', payload: false });
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const updateProject = async (updates: Partial<Project>) => {
    const currentProject = stateRef.current.project;
    if (!currentProject) return;
    setState({ type: 'SET_SAVING', payload: true });
    setState({ type: 'SET_ERROR', payload: null });
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(`/api/projects/${currentProject.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
        signal: controller.signal,
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setState({ type: 'MERGE_PROJECT', payload: data });
      setState({ type: 'SET_LAST_SAVED', payload: new Date() });
      setState({ type: 'SET_SAVING', payload: false });
    } catch (error: any) {
      const isTimeout = error.name === 'AbortError' || error.message?.includes('abort') || error.message?.includes('超时');
      const message = isTimeout ? '保存超时，请检查网络后重试。' : error.message;
      setState({ type: 'SET_ERROR', payload: message });
      setState({ type: 'SET_SAVING', payload: false });
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const localUpdate = (field: string, value: any) => {
    setState({ type: 'UPDATE_FIELD', payload: { field, value } });
    setState({ type: 'MARK_DIRTY' });
  };

  // 生图轮询使用：只合并图片字段，不触发 loading/dirty
  const mergeImagesSilent = (images: Partial<Project>) => {
    setState({ type: 'MERGE_SILENT', payload: images });
  };

  // 后台静默刷新：不影响 loading 和 dirty 状态
  const refreshProjectSilent = async (id: string) => {
    try {
      const response = await fetch(`/api/projects/${id}`, {
        cache: 'no-store',
        credentials: 'include',
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setState({ type: 'MERGE_SILENT', payload: data });
    } catch (error) {
      console.error('静默刷新项目失败:', error);
    }
  };

  const saveCurrentStep = async () => {
    const currentProject = stateRef.current.project;
    if (!currentProject || !stateRef.current.hasUnsavedChanges) return;
    const field = stepFieldMapping[stateRef.current.currentStep];
    if (!field) return;
    await updateProject({ [field]: (currentProject as any)[field] } as Partial<Project>);
  };

  const generateStep = async (step: number, options: { force?: boolean; referenceImage?: string | null; autoTrigger?: boolean } = {}) => {
    const currentProject = stateRef.current.project;
    if (!currentProject) return;

    // 图片步骤跳过自动生成，必须由用户手动触发
    if (options.autoTrigger && (step === 3 || step === 5 || step === 6)) return;

    // 跳过已完成的步骤（除非强制重新生成）
    if (!options.force && hasStepContent(currentProject, step)) return;

    setState({ type: 'SET_LOADING', payload: true });
    setState({ type: 'SET_ERROR', payload: null });
    try {
      const stepNames = ['background', 'product_intro', 'personas', 'appearance', 'cmf', 'storyboard', 'exploded_view'];
      let data: { error?: string; data?: any; imageUrl?: string };

      if (step === 3 || step === 5 || step === 6) {
        const imagePrompts: Record<number, string> = {
          3: `产品设计效果图,${currentProject.idea}`,
          6: `产品爆炸图,结构分解图,${currentProject.idea}`,
        };
        const storyboardPrompts = [
          '场景引入 - 用户遇到问题的初始情境',
          '问题呈现 - 用户面临的具体痛点',
          '产品出现 - 产品作为解决方案登场',
          '使用过程 - 用户与产品互动的关键步骤',
          '效果展示 - 产品带来的积极改变',
          '满意结局 - 用户获得理想结果',
        ];
        const { data: { user } } = await supabase.auth.getUser();

        if (step === 3) {
          // 保留已有的图片，只生成空白槽位
          const existingImages = currentProject.appearance_images || ['', '', ''];
          const imageUrls: string[] = [...existingImages];
          const indicesToGenerate = imageUrls.map((img, i) => img ? -1 : i).filter(i => i >= 0);

          for (const i of indicesToGenerate) {
            try {
              const imageResponse = await fetch('/api/image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: stepNames[step],
                  prompt: `${imagePrompts[step]}, variation ${i + 1}, distinct visual direction`,
                  projectId: currentProject.id,
                }),
              });
              data = await imageResponse.json();
              if (data.error) throw new Error(data.error);

              if (data.imageUrl) {
                imageUrls[i] = data.imageUrl;
                // 本地即时更新 UI（不覆盖其他正在生成的图像）
                setState({
                  type: 'UPDATE_FIELD',
                  payload: { field: 'appearance_images', value: [...imageUrls] },
                });
                // 原子写入单个槽位 —— 关键：不会覆盖其他槽位已完成的图
                try {
                  await fetch(`/api/projects/${currentProject.id}/image-slot`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      field: 'appearance_images',
                      index: i,
                      url: data.imageUrl,
                    }),
                  });
                } catch (slotErr: any) {
                  console.error(`写入外观图片槽位 ${i} 失败:`, slotErr);
                }
              }
            } catch (err: any) {
              console.error(`生成外观图片 ${i + 1} 失败:`, err);
            }
          }
          // 不再 await updateProject({ appearance_images: imageUrls }) —— 避免整体覆盖
          setState({ type: 'SET_LOADING', payload: false });
          return;
        }

        if (step === 5) {
          const referenceImage = options.referenceImage || currentProject.appearance_images?.[0] || null;
          // 保留已有的故事板，只生成空白槽位
          const existingImages = currentProject.storyboard_images || [];
          const storyboardImages = [...existingImages];
          const indicesToGenerate = storyboardImages.map((img, i) => (img?.url ? -1 : i)).filter(i => i >= 0);

          for (const i of indicesToGenerate) {
            try {
              const imageResponse = await fetch('/api/image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: stepNames[step],
                  prompt: `故事板分镜 ${i + 1}/6,${storyboardPrompts[i]},${currentProject.idea}`,
                  referenceImage,
                  projectId: currentProject.id,
                }),
              });
              data = await imageResponse.json();
              if (data.error) throw new Error(data.error);

              if (data.imageUrl) {
                const slot = { url: data.imageUrl, description: storyboardPrompts[i], prompt: storyboardPrompts[i] };
                storyboardImages[i] = slot;
                // 本地即时更新 UI
                setState({
                  type: 'UPDATE_FIELD',
                  payload: { field: 'storyboard_images', value: [...storyboardImages] },
                });
                // 原子写入单个槽位
                try {
                  await fetch(`/api/projects/${currentProject.id}/image-slot`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      field: 'storyboard_images',
                      index: i,
                      url: data.imageUrl,
                    }),
                  });
                } catch (slotErr: any) {
                  console.error(`写入故事板槽位 ${i} 失败:`, slotErr);
                }
              }
            } catch (err: any) {
              console.error(`生成故事板图片 ${i + 1} 失败:`, err);
            }
          }
          // 不再 await updateProject({ storyboard_images: storyboardImages }) —— 避免整体覆盖
          setState({ type: 'SET_LOADING', payload: false });
          return;
        }

        try {
          const referenceImage = options.referenceImage || currentProject.appearance_images?.[0] || null;
          const imageResponse = await fetch('/api/image', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: stepNames[step],
              prompt: imagePrompts[step],
              referenceImage,
              projectId: currentProject.id,
            }),
          });
          data = await imageResponse.json();
          if (data.error) throw new Error(data.error);

          const generatedData = data.imageUrl;
          await updateProject({ [stepFieldMapping[step]]: generatedData });
        } catch (err: any) {
          console.error('生成爆炸图失败:', err);
        }
        setState({ type: 'SET_LOADING', payload: false });
        return;
      }

      // 非图片步骤
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: stepNames[step],
          idea: currentProject.idea,
          existingData: currentProject,
        }),
      });
      data = await response.json();
      if (data.error) throw new Error(data.error);

      await updateProject({ [stepFieldMapping[step]]: data.data });
    } catch (error: any) {
      setState({ type: 'SET_ERROR', payload: error.message });
    } finally {
      setState({ type: 'SET_LOADING', payload: false });
    }
  };

  const nextStep = async (options: { autoGenerate?: boolean } = { autoGenerate: true }) => {
    const currentProject = stateRef.current.project;
    const currentStep = stateRef.current.currentStep;
    if (!currentProject || currentStep >= 7) return;
    const newStep = currentStep + 1;
    const skipUpdates: Partial<Project> = {
      current_step: Math.max(currentProject.current_step, newStep),
    };
    const skippedField = stepFieldMapping[currentStep];
    if (options.autoGenerate === false && skippedField) {
      (skipUpdates as any)[skippedField] = null;
    }
    await updateProject(skipUpdates);
    storeViewedStep(currentProject.id, newStep);
    setState({ type: 'SET_STEP', payload: newStep });
    if (options.autoGenerate !== false) {
      await generateStep(newStep, { autoTrigger: true });
    }
  };

  const goToStep = async (step: number) => {
    const currentProject = stateRef.current.project;
    if (!currentProject || step < 0 || step > 7) return;
    storeViewedStep(currentProject.id, step);
    setState({ type: 'SET_STEP', payload: step });
    await generateStep(step, { autoTrigger: true });
  };

  return (
    <ProjectContext.Provider
      value={{
        state,
        dispatch,
        fetchProject,
        refreshProjectSilent,
        mergeImagesSilent,
        updateProject,
        localUpdate,
        saveCurrentStep,
        generateStep,
        nextStep,
        goToStep,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}