'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { ImageStep, ImageTask, SlotViewState } from './imageTaskStore';
import {
  initializeTaskStore,
  subscribeToTasks,
  reconcileRemoteJobs,
  startImageGeneration as startGen,
  retryImageGeneration as retryGen,
  getSlotViewState,
  hasActiveTasksForProject,
  isActiveTask,
  isTerminalTask,
  markTaskFailed,
} from './imageTaskStore';

interface UseImageTaskStoreOptions {
  projectId: string;
  step: ImageStep;
}

/**
 * 桥接 imageTaskStore 到 React 组件
 *
 * - useState initializer 同步读取 localStorage（零延迟恢复生成中状态）
 * - subscribeToTasks 监听跨组件/store变更
 * - 轮询服务端 jobs 做 reconcile
 */
export function useImageTaskStore({ projectId, step }: UseImageTaskStoreOptions) {
  // 首屏立即从 localStorage 恢复
  const [tasks, setTasks] = useState<Record<string, ImageTask>>(() => {
    if (typeof window === 'undefined') return {};
    return initializeTaskStore();
  });

  // 订阅 store 变更（跨组件同步）
  useEffect(() => {
    return subscribeToTasks((updated: Record<string, ImageTask>) => {
      setTasks(updated);
    });
  }, []);

  // 挂载时立即从 localStorage 恢复 + reconcile 服务端（不等待 800ms 首次轮询）
  useEffect(() => {
    // 每次 projectId 或 step 变化时重新同步
    const sync = async () => {
      // 强制从 localStorage 恢复最新状态
      const latest = initializeTaskStore();
      setTasks(latest);
      // 立即 reconcile 服务端
      if (!inFlightRef.current) {
        inFlightRef.current = true;
        try {
          const res = await fetch(
            `/api/image/jobs?projectId=${encodeURIComponent(projectId)}&step=${encodeURIComponent(step)}`,
            { cache: 'no-store' },
          );
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.jobs)) {
              const remotes = data.jobs.map((j: any) => ({
                id: j.id,
                clientRequestId: j.clientRequestId || '',
                projectId: j.projectId || projectId,
                step: (j.step || step) as ImageStep,
                slotIndex: typeof j.slotIndex === 'number' ? j.slotIndex : 0,
                status: j.status as 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled',
                imageUrl: j.imageUrl,
                errorMessage: j.errorMessage,
              }));
              reconcileRemoteJobs(remotes.filter((r: { clientRequestId: string }) => r.clientRequestId));
              const latest2 = initializeTaskStore();
              setTasks(latest2);
            }
          }
        } catch { /* transient */ }
        finally { inFlightRef.current = false; }
      }
    };
    sync();
  }, [projectId, step]);

  const inFlightRef = useRef(false);
  const cancelledRef = useRef(false);

  // reconcile：拉服务端 jobs 校准本地状态 + 强制同步 React state
  const refresh = useCallback(async () => {
    if (inFlightRef.current || cancelledRef.current) return;
    inFlightRef.current = true;
    try {
      const res = await fetch(
        `/api/image/jobs?projectId=${encodeURIComponent(projectId)}&step=${encodeURIComponent(step)}`,
        { cache: 'no-store' },
      );
      if (res.status === 401 || !res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.jobs)) {
        const remotes = data.jobs.map((j: any) => ({
          id: j.id,
          clientRequestId: j.clientRequestId || '',
          projectId: j.projectId || projectId,
          step: (j.step || step) as ImageStep,
          slotIndex: typeof j.slotIndex === 'number' ? j.slotIndex : 0,
          status: j.status as 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled',
          imageUrl: j.imageUrl,
          errorMessage: j.errorMessage,
        }));
        reconcileRemoteJobs(remotes.filter((r: { clientRequestId: string }) => r.clientRequestId));
        // 强制从 localStorage 重新读取以同步 React state（subscribe 回调可能不可靠）
        const latest = initializeTaskStore();
        setTasks(latest);
      }
    } catch { /* transient */ }
    finally { inFlightRef.current = false; }
  }, [projectId, step]);

  // 轮询 + visibility 监听
  useEffect(() => {
    cancelledRef.current = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const schedule = (delay: number) => {
      if (cancelledRef.current) return;
      timer = setTimeout(async () => {
        if (cancelledRef.current) return;
        await refresh();
        if (cancelledRef.current) return;
        const store = initializeTaskStore();
        const hasActive = Object.values(store).some(
          t => t.projectId === projectId && t.step === step && isActiveTask(t)
        );
        schedule(hasActive ? 2000 : 10000);
      }, delay);
    };

    schedule(800);

    const onVisible = () => {
      if (document.visibilityState === 'visible' && !cancelledRef.current) refresh();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelledRef.current = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh, projectId, step]);

  // 本地 optimistic 超时兜底：请求没真正发到服务端时，自动退出生成中，允许用户重试。
  useEffect(() => {
    const now = Date.now();
    for (const task of Object.values(tasks)) {
      if (
        task.projectId === projectId &&
        task.step === step &&
        task.status === 'optimistic' &&
        !task.serverJobId &&
        now - task.createdAt > 15_000
      ) {
        markTaskFailed(task.clientRequestId, '本地生图请求未被服务端确认，请重试');
      }
    }
  }, [tasks, projectId, step]);

  // slot 视图状态
  const getSlotState = useCallback((slotIndex: number, currentImageUrl?: string): SlotViewState => {
    return getSlotViewState(tasks, projectId, step, slotIndex, currentImageUrl);
  }, [tasks, projectId, step]);

  // 启动生成
  const startGeneration = useCallback(async (input: {
    slotIndex: number;
    prompt: string;
    referenceImage?: string;
    previousImageUrl?: string;
    userId?: string;
  }) => {
    return startGen({
      projectId,
      step,
      slotIndex: input.slotIndex,
      prompt: input.prompt,
      referenceImage: input.referenceImage,
      previousImageUrl: input.previousImageUrl,
      userId: input.userId,
    });
  }, [projectId, step]);

  // 重试
  const retryGeneration = useCallback(async (task: ImageTask, prompt: string, referenceImage?: string) => {
    return retryGen(task, prompt, referenceImage);
  }, []);

  // 是否有活跃任务
  const hasActive = hasActiveTasksForProject(tasks, projectId);

  // 聚合 generating/completed 状态 —— 用 currentTaskPerSlot 避免同 slot 多条任务冲突
  const generatingSlots: Record<number, boolean> = {};
  const completedImages: Record<number, string> = {};

  // 收集所有涉及的 slotIndex
  const slotSet = new Set<number>();
  for (const task of Object.values(tasks)) {
    if (task.projectId === projectId && task.step === step) {
      slotSet.add(task.slotIndex);
    }
  }

  for (const slotIndex of slotSet) {
    const slotTasks = Object.values(tasks).filter(
      t => t.projectId === projectId && t.step === step && t.slotIndex === slotIndex,
    );
    const latestTerminal = slotTasks
      .filter(t => isTerminalTask(t))
      .sort((a, b) => b.createdAt - a.createdAt)[0];
    const latestActive = slotTasks
      .filter(t => isActiveTask(t))
      .sort((a, b) => b.createdAt - a.createdAt)[0];

    // 终端态任务不比 active 旧 → 优先用终端态，不标记 generating
    if (latestTerminal && (!latestActive || latestTerminal.createdAt >= latestActive.createdAt)) {
      if (latestTerminal.status === 'completed') {
        completedImages[slotIndex] = latestTerminal.imageUrl || '';
      }
      continue; // 不标记 generating
    }

    // active 任务仍在进行
    if (latestActive) {
      generatingSlots[slotIndex] = true;
    }
  }

  // 强制从 localStorage 同步 React state（用于同步完成后的即时更新）
  const syncFromStore = useCallback(() => {
    const latest = initializeTaskStore();
    setTasks(latest);
  }, []);

  return {
    tasks,
    refresh,
    syncFromStore,
    getSlotState,
    startGeneration,
    retryGeneration,
    hasActive,
    generatingSlots,
    completedImages,
  };
}
