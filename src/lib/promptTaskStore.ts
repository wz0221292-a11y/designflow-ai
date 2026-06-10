/**
 * 故事板提示词重整任务状态机 + localStorage 持久化 + 模块级执行器
 *
 * 和 imageTaskStore 完全同级：
 * - running 立即写入 localStorage（expiresAt），零延迟显示状态
 * - 模块级 runner：切路由/卸载不中断正在跑的任务
 * - 刷新后 resume 所有 unexpired running（幂等重跑）
 * - clientRequestId 幂等 + resumeCount 上限防死循环
 */

export type PromptTaskStatus = 'running' | 'completed' | 'failed';

export interface PromptTask {
  clientRequestId: string;
  projectId: string;
  slotIndex: number;
  status: PromptTaskStatus;
  description?: string;
  prompt?: string;
  errorMessage?: string;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
  resumeCount: number;
  lastAttemptAt: number;
}

interface PromptStoreSnapshot {
  version: 1;
  tasks: Record<string, PromptTask>;
}

const STORAGE_KEY = 'prompt-task-store:v1';
const PROMPT_TASK_TTL_MS = 5 * 60 * 1000;
const MAX_RESUME_COUNT = 3;

// ── localStorage 读写 ──

function readStore(): PromptStoreSnapshot {
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

function writeStore(snapshot: PromptStoreSnapshot) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot)); } catch {}
}

// ── 订阅 ──

type Subscriber = (tasks: Record<string, PromptTask>) => void;
const subscribers = new Set<Subscriber>();

function notifySubscribers(tasks: Record<string, PromptTask>) {
  subscribers.forEach(fn => { try { fn(tasks); } catch {} });
}

export function subscribePromptTasks(fn: Subscriber): () => void {
  subscribers.add(fn);
  return () => { subscribers.delete(fn); };
}

// ── 工具 ──

export function isPromptActive(task: PromptTask): boolean {
  return task.status === 'running';
}

export function isPromptTerminal(task: PromptTask): boolean {
  return task.status === 'completed' || task.status === 'failed';
}

export function createPromptClientRequestId(projectId: string, slotIndex: number): string {
  const random = crypto.randomUUID?.() || Math.random().toString(36).slice(2);
  return ['prompt', projectId, String(slotIndex), Date.now(), random].join(':');
}

// ── 内查 ──

function findActivePromptForSlot(
  tasks: Record<string, PromptTask>,
  projectId: string,
  slotIndex: number,
): PromptTask | undefined {
  const now = Date.now();
  return Object.values(tasks)
    .filter(t =>
      t.projectId === projectId &&
      t.slotIndex === slotIndex &&
      t.status === 'running' &&
      t.expiresAt > now,
    )
    .sort((a, b) => b.createdAt - a.createdAt)[0];
}

// ── 初始化 ──

export function initializePromptStore(): Record<string, PromptTask> {
  const snapshot = readStore();
  const now = Date.now();
  const tasks: Record<string, PromptTask> = {};
  let changed = false;

  for (const task of Object.values(snapshot.tasks)) {
    if (task.status === 'completed' || task.status === 'failed') {
      tasks[task.clientRequestId] = task;
      continue;
    }
    if (task.status === 'running') {
      if (task.expiresAt > now) {
        tasks[task.clientRequestId] = task;
      } else {
        tasks[task.clientRequestId] = {
          ...task,
          status: 'failed',
          errorMessage: task.errorMessage || '提示词任务已超时，请重试',
          updatedAt: now,
        };
        changed = true;
      }
    }
  }

  if (changed) writeStore({ version: 1, tasks });
  return tasks;
}

// ── 查询 ──

export function hasActivePromptForSlot(projectId: string, slotIndex: number): boolean {
  return !!findActivePromptForSlot(readStore().tasks, projectId, slotIndex);
}

/** 获取所有需要 resume 的 unexpired running 任务（挂载/恢复时调用） */
export function getResumableRunningTasks(projectId: string): PromptTask[] {
  const tasks = initializePromptStore();
  return Object.values(tasks).filter(
    t => t.projectId === projectId && t.status === 'running',
  );
}

// ── 写入 ──

export function startPromptTask(projectId: string, slotIndex: number): PromptTask {
  const snapshot = readStore();

  const existing = findActivePromptForSlot(snapshot.tasks, projectId, slotIndex);
  if (existing) return existing;

  const now = Date.now();
  const clientRequestId = createPromptClientRequestId(projectId, slotIndex);
  const task: PromptTask = {
    clientRequestId,
    projectId,
    slotIndex,
    status: 'running',
    createdAt: now,
    updatedAt: now,
    expiresAt: now + PROMPT_TASK_TTL_MS,
    resumeCount: 0,
    lastAttemptAt: now,
  };

  snapshot.tasks[clientRequestId] = task;
  // 清理同 slot 超过 1 小时的终端态
  for (const key of Object.keys(snapshot.tasks)) {
    const t = snapshot.tasks[key];
    if (t.clientRequestId !== clientRequestId &&
        t.projectId === projectId &&
        t.slotIndex === slotIndex &&
        !isPromptActive(t)) {
      if (now - t.updatedAt > 60 * 60 * 1000) delete snapshot.tasks[key];
    }
  }

  writeStore(snapshot);
  notifySubscribers(snapshot.tasks);
  return task;
}

export function completePromptTask(clientRequestId: string, description: string, prompt: string) {
  const snapshot = readStore();
  if (!snapshot.tasks[clientRequestId]) return;
  const now = Date.now();
  snapshot.tasks[clientRequestId] = {
    ...snapshot.tasks[clientRequestId],
    status: 'completed',
    description,
    prompt,
    updatedAt: now,
  };
  writeStore(snapshot);
  notifySubscribers(snapshot.tasks);
}

export function failPromptTask(clientRequestId: string, errorMessage: string) {
  const snapshot = readStore();
  if (!snapshot.tasks[clientRequestId]) return;
  const now = Date.now();
  snapshot.tasks[clientRequestId] = {
    ...snapshot.tasks[clientRequestId],
    status: 'failed',
    errorMessage,
    updatedAt: now,
  };
  writeStore(snapshot);
  notifySubscribers(snapshot.tasks);
}

export function bumpResumeCount(clientRequestId: string) {
  const snapshot = readStore();
  if (!snapshot.tasks[clientRequestId]) return;
  const task = snapshot.tasks[clientRequestId];
  const now = Date.now();
  const resumeCount = (task.resumeCount || 0) + 1;

  if (resumeCount > MAX_RESUME_COUNT) {
    snapshot.tasks[clientRequestId] = {
      ...task,
      status: 'failed',
      errorMessage: '提示词任务恢复失败，请重试',
      resumeCount,
      lastAttemptAt: now,
      updatedAt: now,
    };
  } else {
    snapshot.tasks[clientRequestId] = {
      ...task,
      resumeCount,
      lastAttemptAt: now,
      updatedAt: now,
    };
  }
  writeStore(snapshot);
  notifySubscribers(snapshot.tasks);
}

// ═══════════════════════════════════════════════════════════════
// 模块级执行器 —— 不属于任何组件，切路由/卸载不中断
// pipeline: generate → complete → flush → startImage（幂等）
// ═══════════════════════════════════════════════════════════════

type FramePromptResult = { description: string; prompt: string };

type PromptTaskExecutor = (task: PromptTask) => Promise<FramePromptResult>;
type PromptTaskFlush = (task: PromptTask, result: FramePromptResult) => Promise<void>;
type PromptToImageExecutor = (task: PromptTask, result: FramePromptResult) => Promise<void>;

let promptExecutor: PromptTaskExecutor | null = null;
let flushPromptResult: PromptTaskFlush | null = null;
let startImageAfterPrompt: PromptToImageExecutor | null = null;

/** 注入执行器（组件挂载时调用） */
export function setPromptTaskExecutor(
  executor: PromptTaskExecutor,
  onFlushed: PromptTaskFlush,
  onStartImage?: PromptToImageExecutor,
) {
  promptExecutor = executor;
  flushPromptResult = onFlushed;
  startImageAfterPrompt = onStartImage ?? null;
}

export function clearPromptTaskExecutor() {
  // 模块级执行器不随组件卸载清除：
  // 1. inflight 的 Promise 需要继续跑完 Phase 3 (flush) 和 Phase 4 (startImage)
  // 2. 回调在下次 setPromptTaskExecutor 时自然覆盖
  // 3. 回调内部检查 task.projectId !== pid 防止跨项目串扰
}

const inflightPromptRuns = new Map<string, Promise<void>>();

/** 确保任务正在执行——模块级，不绑定组件生命周期 */
export function ensurePromptTaskRunning(task: PromptTask) {
  const existing = inflightPromptRuns.get(task.clientRequestId);
  if (existing) return existing;

  const run = runPromptTask(task).finally(() => {
    inflightPromptRuns.delete(task.clientRequestId);
  });

  inflightPromptRuns.set(task.clientRequestId, run);
  return run;
}

function isRetryablePromptError(error: unknown): boolean {
  const msg = (error instanceof Error ? error.message : String(error ?? '')).toLowerCase();
  return (
    msg.includes('fetch') ||
    msg.includes('network') ||
    msg.includes('timeout') ||
    msg.includes('abort') ||
    msg.includes('econnrefused') ||
    msg.includes('enotfound')
  );
}

async function runPromptTask(task: PromptTask) {
  if (!promptExecutor) return;

  // ── Phase 1: 生成提示词 ──
  // 只有这个阶段失败才影响 prompt task 状态

  let result: FramePromptResult;
  try {
    bumpResumeCount(task.clientRequestId);
    result = await promptExecutor(task);
  } catch (error: any) {
    const msg = error?.message || '提示词生成失败';

    if (isRetryablePromptError(error) && (task.resumeCount || 0) < MAX_RESUME_COUNT) {
      // 保持 running，等下次 resume
      bumpResumeCount(task.clientRequestId);
    } else {
      failPromptTask(task.clientRequestId, msg);
    }
    return;
  }

  // ── Phase 2: 标记完成（prompt 阶段到此结束）──
  completePromptTask(task.clientRequestId, result.description, result.prompt);

  // ── Phase 3: flush 保存帧内容到 DB ──
  // flush 失败 → 不生图，但 prompt 保持 completed
  if (flushPromptResult) {
    try {
      await flushPromptResult(task, result);
    } catch (flushError: any) {
      console.error('Flush prompt result failed, skipping image generation:', flushError);
      return; // 不生图
    }
  }

  // ── Phase 4: 触发生图（幂等：clientRequestId 由 prompt task 派生）──
  // 生图失败交给 imageTaskStore，不影响 prompt completed
  if (startImageAfterPrompt) {
    try {
      await startImageAfterPrompt(task, result);
    } catch (imageError: any) {
      console.error('Start image after prompt failed (prompt stays completed):', imageError);
      // prompt 保持 completed，imageTaskStore 会显示失败
    }
  }
}

/** 派生图片任务幂等 ID */
export function deriveImageClientRequestId(promptTaskClientRequestId: string): string {
  return `image-from-prompt:${promptTaskClientRequestId}`;
}
