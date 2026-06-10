/**
 * 图片生成任务状态机 + localStorage 持久化
 *
 * 核心原则：
 * - UI 状态从 task store 派生，轮询只负责校准
 * - 空结果不能清除本地 generating
 * - 只有 completed/failed/cancelled 才能结束 generating
 * - 状态只能向前推进，禁止回退
 */

export type ImageStep = 'appearance' | 'storyboard' | 'exploded_view';

export type ImageTaskStatus =
  | 'optimistic'   // 用户刚点击，前端本地已记录，服务端还没确认
  | 'queued'        // 服务端已创建任务，等待执行
  | 'processing'    // AI 正在生成
  | 'completed'     // 生成完成，有 imageUrl
  | 'failed'        // 生成失败，有 errorMessage
  | 'cancelled'     // 用户取消
  | 'unknown';      // 本地任务太久未被服务端确认

export interface ImageTask {
  clientRequestId: string;
  serverJobId?: string;
  projectId: string;
  step: ImageStep;
  slotIndex: number;
  status: ImageTaskStatus;
  imageUrl?: string;
  previousImageUrl?: string;
  errorMessage?: string;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
}

interface ImageTaskStoreSnapshot {
  version: 1;
  tasks: Record<string, ImageTask>;
}

// ── 常量 ──────────────────────────────────────────────────────

const STORAGE_KEY = 'image-task-store:v1';
const TASK_TTL_MS = 30 * 60 * 1000;
const TERMINAL_RETENTION_MS = 24 * 60 * 60 * 1000;

const ACTIVE_STATUSES = new Set<ImageTaskStatus>(['optimistic', 'queued', 'processing']);
const TERMINAL_STATUSES = new Set<ImageTaskStatus>(['completed', 'failed', 'cancelled']);

const STATUS_RANK: Record<ImageTaskStatus, number> = {
  optimistic: 0,
  unknown: 0,
  queued: 1,
  processing: 2,
  completed: 3,
  failed: 3,
  cancelled: 3,
};

// ── localStorage 读写 ─────────────────────────────────────────

function readTaskStore(): ImageTaskStoreSnapshot {
  if (typeof window === 'undefined') return { version: 1, tasks: {} };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { version: 1, tasks: {} };
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 1 || typeof parsed.tasks !== 'object') {
      return { version: 1, tasks: {} };
    }
    return parsed;
  } catch {
    return { version: 1, tasks: {} };
  }
}

function writeTaskStore(snapshot: ImageTaskStoreSnapshot) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch { /* quota exceeded, silently ignore */ }
}

// ── 订阅机制 ──────────────────────────────────────────────────

type TasksSubscriber = (tasks: Record<string, ImageTask>) => void;
const subscribers = new Set<TasksSubscriber>();

function notifySubscribers(tasks: Record<string, ImageTask>) {
  subscribers.forEach(fn => { try { fn(tasks); } catch {} });
}

export function subscribeToTasks(fn: TasksSubscriber): () => void {
  subscribers.add(fn);
  return () => { subscribers.delete(fn); };
}

// ── 工具函数 ──────────────────────────────────────────────────

export function isActiveTask(task: ImageTask): boolean {
  return ACTIVE_STATUSES.has(task.status);
}

export function isTerminalTask(task: ImageTask): boolean {
  return TERMINAL_STATUSES.has(task.status);
}

export function createClientRequestId(projectId: string, step: string, slotIndex: number): string {
  const random = crypto.randomUUID?.() || Math.random().toString(36).slice(2);
  return ['image', projectId, step, String(slotIndex), Date.now(), random].join(':');
}

export function createSlotKey(projectId: string, step: ImageStep, slotIndex: number): string {
  return `${projectId}:${step}:${slotIndex}`;
}

// ── 初始化：刷新页面后零延迟恢复 ──────────────────────────────

export function initializeTaskStore(): Record<string, ImageTask> {
  const snapshot = readTaskStore();
  const now = Date.now();
  const tasks: Record<string, ImageTask> = {};

  for (const task of Object.values(snapshot.tasks)) {
    if (isTerminalTask(task)) {
      tasks[task.clientRequestId] = task;
      continue;
    }
    if (task.expiresAt < now) {
      tasks[task.clientRequestId] = { ...task, status: 'unknown', updatedAt: now };
      continue;
    }
    tasks[task.clientRequestId] = task;
  }

  // 清理过期终态任务
  const cleaned = cleanupTasks(tasks);
  if (Object.keys(cleaned).length !== Object.keys(tasks).length) {
    writeTaskStore({ version: 1, tasks: cleaned });
  }

  return cleaned;
}

// ── 任务清理 ──────────────────────────────────────────────────

function cleanupTasks(tasks: Record<string, ImageTask>): Record<string, ImageTask> {
  const now = Date.now();
  const next: Record<string, ImageTask> = {};
  for (const task of Object.values(tasks)) {
    if (isTerminalTask(task)) {
      if (now - task.updatedAt < TERMINAL_RETENTION_MS) {
        next[task.clientRequestId] = task;
      }
      continue;
    }
    next[task.clientRequestId] = task;
  }
  return next;
}

// ── upsert：写入 optimistic / 本地更新 ────────────────────────

function upsertLocalTask(task: ImageTask) {
  const snapshot = readTaskStore();
  const existing = snapshot.tasks[task.clientRequestId];

  // 禁止状态回退
  if (existing) {
    const localRank = STATUS_RANK[existing.status];
    const newRank = STATUS_RANK[task.status];
    if (newRank < localRank) return;
    if (isTerminalTask(existing) && !isTerminalTask(task)) return;
  }

  snapshot.tasks[task.clientRequestId] = task;
  writeTaskStore(snapshot);
  notifySubscribers(snapshot.tasks);
}

// ── 远程 job 合并规则 ─────────────────────────────────────────

export interface RemoteImageJob {
  id: string;
  clientRequestId: string;
  projectId: string;
  step: ImageStep;
  slotIndex: number;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  imageUrl?: string;
  errorMessage?: string;
}

function mergeTask(local: ImageTask | undefined, remote: RemoteImageJob): ImageTask {
  const remoteStatus = remote.status as ImageTaskStatus;
  const now = Date.now();

  if (!local) {
    return {
      clientRequestId: remote.clientRequestId,
      serverJobId: remote.id,
      projectId: remote.projectId,
      step: remote.step,
      slotIndex: remote.slotIndex,
      status: remoteStatus,
      imageUrl: remote.imageUrl,
      errorMessage: remote.errorMessage,
      createdAt: now,
      updatedAt: now,
      expiresAt: now + TASK_TTL_MS,
    };
  }

  const localRank = STATUS_RANK[local.status];
  const remoteRank = STATUS_RANK[remoteStatus];

  // 禁止状态回退
  if (remoteRank < localRank) return local;
  // 终态不被 active 状态复活
  if (isTerminalTask(local) && !TERMINAL_STATUSES.has(remoteStatus)) return local;

  return {
    ...local,
    serverJobId: remote.id,
    status: remoteStatus,
    imageUrl: remote.imageUrl || local.imageUrl,
    errorMessage: remote.errorMessage || local.errorMessage,
    updatedAt: now,
    expiresAt: now + TASK_TTL_MS,
  };
}

// ── 按多重策略匹配本地任务 ──────────────────────────────────

function findLocalTaskForRemoteJob(
  tasks: Record<string, ImageTask>,
  remote: RemoteImageJob,
): ImageTask | undefined {
  // 1) 优先按 clientRequestId 精确匹配
  if (remote.clientRequestId && tasks[remote.clientRequestId]) {
    return tasks[remote.clientRequestId];
  }
  // 2) 按服务端 job ID 匹配
  const byServerId = Object.values(tasks).find(
    t => t.serverJobId && t.serverJobId === remote.id,
  );
  if (byServerId) return byServerId;
  // 3) 按同 slot 最近一条任务兜底
  const sameSlot = Object.values(tasks)
    .filter(t =>
      t.projectId === remote.projectId &&
      t.step === remote.step &&
      t.slotIndex === remote.slotIndex,
    )
    .sort((a, b) => b.createdAt - a.createdAt);
  return sameSlot[0];
}

// ── 终态到达时关闭同 slot 更旧的 active 任务 ─────────────────

function closeOlderActiveTasksForSameSlot(
  tasks: Record<string, ImageTask>,
  terminalTask: ImageTask,
) {
  for (const task of Object.values(tasks)) {
    if (task.clientRequestId === terminalTask.clientRequestId) continue;
    if (
      task.projectId !== terminalTask.projectId ||
      task.step !== terminalTask.step ||
      task.slotIndex !== terminalTask.slotIndex
    ) continue;
    if (isActiveTask(task) && task.createdAt <= terminalTask.createdAt) {
      tasks[task.clientRequestId] = {
        ...task,
        status: 'cancelled',
        updatedAt: Date.now(),
      };
    }
  }
}

// ── reconcile：服务端 job 列表校准本地状态 ────────────────────

export function reconcileRemoteJobs(remoteJobs: RemoteImageJob[]) {
  const snapshot = readTaskStore();
  let changed = false;

  for (const remoteJob of remoteJobs) {
    const local = findLocalTaskForRemoteJob(snapshot.tasks, remoteJob);
    const merged = mergeTask(local, remoteJob);

    // 如果匹配到了旧任务但 clientRequestId 不同，删旧留新
    if (local && local.clientRequestId !== merged.clientRequestId) {
      delete snapshot.tasks[local.clientRequestId];
    }

    snapshot.tasks[merged.clientRequestId] = merged;
    changed = true;

    // 终态到达 → 关闭同 slot 旧的 active 任务，防止 UI 卡在 generating
    if (isTerminalTask(merged)) {
      closeOlderActiveTasksForSameSlot(snapshot.tasks, merged);
    }
  }

  if (changed) {
    writeTaskStore(snapshot);
    notifySubscribers(snapshot.tasks);
  }
}

// ── 启动图片生成（optimistic write → API 调用）────────────────

export async function startImageGeneration(input: {
  projectId: string;
  step: ImageStep;
  slotIndex: number;
  prompt: string;
  referenceImage?: string;
  previousImageUrl?: string;
  userId?: string;
  /** 外部指定 clientRequestId，用于幂等（如 prompt runner 派生图片任务 ID） */
  clientRequestId?: string;
}): Promise<{ imageUrl?: string; storagePath?: string; job?: any }> {
  const now = Date.now();
  const clientRequestId = input.clientRequestId || createClientRequestId(input.projectId, input.step, input.slotIndex);

  // 1. 检查是否已有活跃任务
  const snapshot = readTaskStore();
  const existingForSlot = Object.values(snapshot.tasks).find(
    t => t.projectId === input.projectId && t.step === input.step && t.slotIndex === input.slotIndex && isActiveTask(t)
  );
  if (existingForSlot) return { job: existingForSlot };

  // 2. 先写 optimistic
  const optimisticTask: ImageTask = {
    clientRequestId,
    projectId: input.projectId,
    step: input.step,
    slotIndex: input.slotIndex,
    status: 'optimistic',
    previousImageUrl: input.previousImageUrl,
    createdAt: now,
    updatedAt: now,
    expiresAt: now + TASK_TTL_MS,
  };
  upsertLocalTask(optimisticTask);

  // 3. 请求服务端
  try {
    const body: any = {
      clientRequestId,
      type: input.step,
      projectId: input.projectId,
      slotIndex: input.slotIndex,
      prompt: input.prompt,
      expectedTotal: input.step === 'appearance' ? 3 : input.step === 'storyboard' ? 6 : 1,
    };
    if (input.referenceImage) body.referenceImage = input.referenceImage;
    if (input.userId) body.userId = input.userId;

    const res = await fetch('/api/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();

    if (!res.ok || data.error) {
      // 服务端拒绝
      upsertLocalTask({
        ...optimisticTask,
        status: 'failed',
        errorMessage: data.error || `HTTP ${res.status}`,
        updatedAt: Date.now(),
      });
      throw new Error(data.error || `HTTP ${res.status}`);
    }

    // 同步完成 or 异步 job
    if (data.imageUrl) {
      upsertLocalTask({
        ...optimisticTask,
        serverJobId: data.job?.id,
        status: 'completed',
        imageUrl: data.imageUrl,
        updatedAt: Date.now(),
      });
      return { imageUrl: data.imageUrl, storagePath: data.storagePath, job: data.job };
    }

    if (data.job) {
      upsertLocalTask({
        ...optimisticTask,
        serverJobId: data.job.id,
        status: 'queued',
        updatedAt: Date.now(),
      });
      return { job: data.job };
    }

    return {};
  } catch (error: any) {
    // 网络错误不覆盖已有 optimistic（可能还在生成中）
    if (error.message?.includes('HTTP')) {
      upsertLocalTask({
        ...optimisticTask,
        status: 'failed',
        errorMessage: error.message,
        updatedAt: Date.now(),
      });
    }
    throw error;
  }
}

// ── 重试失败任务 ──────────────────────────────────────────────

export async function retryImageGeneration(failedTask: ImageTask, prompt: string, referenceImage?: string) {
  return startImageGeneration({
    projectId: failedTask.projectId,
    step: failedTask.step,
    slotIndex: failedTask.slotIndex,
    prompt,
    referenceImage,
    previousImageUrl: failedTask.previousImageUrl || failedTask.imageUrl,
  });
}

// ── Slot 当前任务：终端态优先，active 其次 ──────────────────

function getCurrentTaskForSlot(
  tasks: Record<string, ImageTask>,
  projectId: string,
  step: ImageStep,
  slotIndex: number,
): ImageTask | undefined {
  const slotTasks = Object.values(tasks).filter(
    t => t.projectId === projectId && t.step === step && t.slotIndex === slotIndex,
  );
  if (slotTasks.length === 0) return undefined;

  const latestTerminal = slotTasks
    .filter(t => isTerminalTask(t))
    .sort((a, b) => b.createdAt - a.createdAt)[0];
  const latestActive = slotTasks
    .filter(t => isActiveTask(t))
    .sort((a, b) => b.createdAt - a.createdAt)[0];

  // 终态任务比 active 任务更新 → 用终态
  if (latestTerminal && (!latestActive || latestTerminal.createdAt >= latestActive.createdAt)) {
    return latestTerminal;
  }
  // 否则取 active（或兜底取最新一条）
  return latestActive || slotTasks.sort((a, b) => b.createdAt - a.createdAt)[0];
}

// ── Slot 视图状态派生 ─────────────────────────────────────────

export type SlotViewState =
  | { state: 'generating'; imageUrl?: string; task: ImageTask }
  | { state: 'ready'; imageUrl: string; task?: ImageTask }
  | { state: 'failed'; imageUrl?: string; errorMessage?: string; task: ImageTask }
  | { state: 'unknown'; imageUrl?: string; task: ImageTask }
  | { state: 'empty'; task?: ImageTask };

export function getSlotViewState(
  tasks: Record<string, ImageTask>,
  projectId: string,
  step: ImageStep,
  slotIndex: number,
  currentImageUrl?: string,
): SlotViewState {
  const task = getCurrentTaskForSlot(tasks, projectId, step, slotIndex);

  if (!task) {
    return currentImageUrl
      ? { state: 'ready', imageUrl: currentImageUrl }
      : { state: 'empty' };
  }

  // completed 不要求必须有 imageUrl——服务端已终态就应退出 generating
  if (task.status === 'completed') {
    return { state: 'ready', imageUrl: task.imageUrl || currentImageUrl || '', task };
  }

  if (task.status === 'failed') {
    return {
      state: 'failed',
      imageUrl: task.previousImageUrl || currentImageUrl,
      errorMessage: task.errorMessage,
      task,
    };
  }

  if (task.status === 'cancelled') {
    return currentImageUrl
      ? { state: 'ready', imageUrl: currentImageUrl, task }
      : { state: 'empty', task };
  }

  if (isActiveTask(task)) {
    return {
      state: 'generating',
      imageUrl: task.previousImageUrl || currentImageUrl,
      task,
    };
  }

  // unknown 等其他状态
  return currentImageUrl
    ? { state: 'ready', imageUrl: currentImageUrl, task }
    : { state: 'empty', task };
}

// ── 检查是否有活跃任务 ───────────────────────────────────────

export function hasActiveTasksForProject(tasks: Record<string, ImageTask>, projectId: string): boolean {
  return Object.values(tasks).some(t => t.projectId === projectId && isActiveTask(t));
}

// ── 清理 ──────────────────────────────────────────────────────

export function clearAllTasks() {
  writeTaskStore({ version: 1, tasks: {} });
  notifySubscribers({});
}
