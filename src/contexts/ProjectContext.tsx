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
      return Boolean(project.storyboard_images?.some((image) => image.url || image.description));
    case 6:
      return Boolean(project.exploded_view_image);
    default:
      return true;
  }
}

function projectReducer(state: ProjectState, action: ProjectAction): ProjectState {
  switch (action.type) {
    case 'SET_PROJECT':
      return {
        ...state,
        project: action.payload,
        currentStep: state.project ? state.currentStep : action.payload.current_step,
      };
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
    try {
      const response = await fetch(`/api/projects/${id}`);
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setState({ type: 'SET_PROJECT', payload: data });
      setState({ type: 'SET_LOADING', payload: false });
      setState({ type: 'SET_LAST_SAVED', payload: new Date() });
    } catch (error: any) {
      setState({ type: 'SET_ERROR', payload: error.message });
      setState({ type: 'SET_LOADING', payload: false });
    }
  };

  const updateProject = async (updates: Partial<Project>) => {
    const currentProject = stateRef.current.project;
    if (!currentProject) return;
    setState({ type: 'SET_SAVING', payload: true });
    setState({ type: 'SET_ERROR', payload: null });
    try {
      const response = await fetch(`/api/projects/${currentProject.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setState({ type: 'MERGE_PROJECT', payload: data });
      setState({ type: 'SET_LAST_SAVED', payload: new Date() });
    } catch (error: any) {
      setState({ type: 'SET_ERROR', payload: error.message });
      setState({ type: 'SET_SAVING', payload: false });
    }
  };

  const localUpdate = (field: string, value: any) => {
    setState({ type: 'UPDATE_FIELD', payload: { field, value } });
    setState({ type: 'MARK_DIRTY' });
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
                  userId: user?.id,
                  projectId: currentProject.id,
                }),
              });
              data = await imageResponse.json();
              if (data.error) throw new Error(data.error);
              imageUrls[i] = data.imageUrl || '';
            } catch (err: any) {
              console.error(`生成外观图片 ${i + 1} 失败:`, err);
            }
          }
          await updateProject({ appearance_images: imageUrls });
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
                  userId: user?.id,
                  projectId: currentProject.id,
                }),
              });
              data = await imageResponse.json();
              if (data.error) throw new Error(data.error);
              storyboardImages[i] = { url: data.imageUrl || '', description: storyboardPrompts[i], prompt: storyboardPrompts[i] };
            } catch (err: any) {
              console.error(`生成故事板图片 ${i + 1} 失败:`, err);
            }
          }
          await updateProject({ storyboard_images: storyboardImages });
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
              userId: user?.id,
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
    setState({ type: 'SET_STEP', payload: newStep });
    if (options.autoGenerate !== false) {
      await generateStep(newStep, { autoTrigger: true });
    }
  };

  const goToStep = async (step: number) => {
    if (step >= 0 && step <= 7) {
      setState({ type: 'SET_STEP', payload: step });
      await generateStep(step, { autoTrigger: true });
    }
  };

  return (
    <ProjectContext.Provider
      value={{
        state,
        dispatch,
        fetchProject,
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