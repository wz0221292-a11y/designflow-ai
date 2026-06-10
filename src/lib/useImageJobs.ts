'use client';

import { useEffect, useRef, useCallback } from 'react';

type ImageStep = 'appearance' | 'storyboard' | 'exploded_view';

interface ImageJob {
  id: string;
  slotIndex: number;
  status: string;
  imageUrl?: string;
  errorMessage?: string;
  createdAt?: string;
}

interface UseImageJobsOptions {
  projectId: string;
  step: ImageStep;
  /** Called with incremental slot state — callers MUST merge, not replace */
  onJobsLoaded: (
    generatingSlots: Record<number, boolean>,
    completedImages: Record<number, string>,
    failedSlots?: Record<number, boolean>,
  ) => void;
}

const ACTIVE_STATUSES = new Set(['pending', 'queued', 'processing']);
const POLL_MS = 2000;
const INITIAL_DELAY_MS = 800;
const HIDDEN_POLL_MS = 6000;

/**
 * 监听图片生成任务状态
 *
 * 关键设计：
 * - setTimeout 链式轮询（非 setInterval），避免慢请求堆积
 * - inFlightRef 防止并发请求互相覆盖
 * - 回调返回增量信息，调用方合并而非替换本地状态
 * - 首次延迟 800ms，给 job 创建留写入窗口
 * - 页面隐藏时降频到 6s，切回立即刷新
 */
export function useImageJobs({ projectId, step, onJobsLoaded }: UseImageJobsOptions) {
  const onJobsLoadedRef = useRef(onJobsLoaded);
  onJobsLoadedRef.current = onJobsLoaded;
  const inFlightRef = useRef(false);
  const cancelledRef = useRef(false);

  const fetchAndApply = useCallback(async () => {
    if (inFlightRef.current || cancelledRef.current) return;
    inFlightRef.current = true;

    try {
      const res = await fetch(
        `/api/image/jobs?projectId=${encodeURIComponent(projectId)}&step=${encodeURIComponent(step)}`,
        { cache: 'no-store' },
      );

      // 401 = 未登录，停止轮询避免刷屏
      if (res.status === 401) return;

      if (!res.ok) return;

      const data = await res.json();
      const jobs: ImageJob[] = Array.isArray(data.jobs) ? data.jobs : [];

      const generatingSlots: Record<number, boolean> = {};
      const completedImages: Record<number, string> = {};
      const failedSlots: Record<number, boolean> = {};

      for (const job of jobs) {
        if (typeof job.slotIndex !== 'number') continue;

        if (ACTIVE_STATUSES.has(job.status)) {
          generatingSlots[job.slotIndex] = true;
          continue;
        }

        if (job.status === 'completed' && job.imageUrl) {
          // 服务端已按 created_at DESC 排序 + dedup per slot，取第一个即可
          if (!completedImages[job.slotIndex]) {
            completedImages[job.slotIndex] = job.imageUrl;
          }
          continue;
        }

        if (job.status === 'failed') {
          failedSlots[job.slotIndex] = true;
        }
      }

      onJobsLoadedRef.current(generatingSlots, completedImages, failedSlots);
    } catch {
      // 网络抖动不改变 UI 状态
    } finally {
      inFlightRef.current = false;
    }
  }, [projectId, step]);

  useEffect(() => {
    cancelledRef.current = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const schedule = (delay: number) => {
      if (cancelledRef.current) return;
      timer = setTimeout(async () => {
        if (cancelledRef.current) return;
        await fetchAndApply();
        if (cancelledRef.current) return;
        const nextDelay = document.visibilityState === 'visible' ? POLL_MS : HIDDEN_POLL_MS;
        schedule(nextDelay);
      }, delay);
    };

    // 首次延迟给 job 创建留出 DB 写入窗口
    schedule(INITIAL_DELAY_MS);

    function onVisible() {
      if (document.visibilityState === 'visible' && !cancelledRef.current) {
        fetchAndApply();
      }
    }
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelledRef.current = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [fetchAndApply]);

  return { refresh: fetchAndApply };
}
