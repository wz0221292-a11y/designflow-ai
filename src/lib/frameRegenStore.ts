/**
 * 故事板帧重生成本地镜像 Store
 *
 * 和 imageTaskStore 模式一致：
 * - 点击时乐观写入 localStorage → UI 零延迟显示状态
 * - 刷新/切页后首屏直接从 localStorage 恢复 → 不会空
 * - 服务端 GET /api/frame-regeneration 轮询后 reconcile → 校准真相
 * - completed/failed 后清理本地镜像
 */

export type FrameRegenStatus =
  | 'queued'
  | 'generating_prompt'
  | 'generating_image'
  | 'completed'
  | 'failed';

export interface FrameRegenJob {
  jobId?: string;           // 服务端 job id（创建后绑定）
  projectId: string;
  slotIndex: number;
  generationId: string;
  status: FrameRegenStatus;
  updatedAt: number;
}

interface FrameRegenStoreSnapshot {
  version: 1;
  jobs: Record<string, FrameRegenJob>;  // key: `${projectId}:${slotIndex}`
}

// ── 常量 ──
const STORAGE_KEY = 'frame-regen-store:v1';
const ACTIVE_TTL_MS = 10 * 60 * 1000;   // 活跃 job 超时 10 分钟
const COMPLETED_TTL_MS = 60 * 1000;      // 完成后保留 1 分钟（用于过渡）

const ACTIVE_STATUSES: Set<FrameRegenStatus> = new Set([
  'queued',
  'generating_prompt',
  'generating_image',
]);

const TERMINAL_STATUSES: Set<FrameRegenStatus> = new Set([
  'completed',
  'failed',
]);

// ── localStorage 读写 ──

function readStore(): FrameRegenStoreSnapshot {
  if (typeof window === 'undefined') return { version: 1, jobs: {} };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { version: 1, jobs: {} };
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== 1 || typeof parsed.jobs !== 'object') {
      return { version: 1, jobs: {} };
    }
    return parsed;
  } catch {
    return { version: 1, jobs: {} };
  }
}

function writeStore(snapshot: FrameRegenStoreSnapshot) {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot)); } catch {}
}

// ── 订阅 ──

type Subscriber = (jobs: Record<string, FrameRegenJob>) => void;
const subscribers = new Set<Subscriber>();

function notify(jobs: Record<string, FrameRegenJob>) {
  subscribers.forEach(fn => { try { fn(jobs); } catch {} });
}

export function subscribeFrameRegen(fn: Subscriber): () => void {
  subscribers.add(fn);
  return () => { subscribers.delete(fn); };
}

// ── 初始化：刷新后首屏恢复 ──

export function initializeFrameRegenStore(
  projectId: string,
): Record<string, FrameRegenJob> {
  const snapshot = readStore();
  const now = Date.now();
  const result: Record<string, FrameRegenJob> = {};
  let changed = false;

  for (const [key, job] of Object.entries(snapshot.jobs)) {
    if (job.projectId !== projectId) continue;

    if (ACTIVE_STATUSES.has(job.status)) {
      if (now - job.updatedAt > ACTIVE_TTL_MS) {
        // 超时 → 标记 unknown（前端不知道服务端是否还在跑）
        snapshot.jobs[key] = { ...job, status: 'failed' as FrameRegenStatus, updatedAt: now };
        changed = true;
        continue;
      }
      result[key] = job;
    } else if (job.status === 'completed') {
      if (now - job.updatedAt < COMPLETED_TTL_MS) {
        result[key] = job;
      } else {
        delete snapshot.jobs[key];
        changed = true;
      }
    }
    // failed 不返回（不阻塞 UI）
  }

  if (changed) writeStore(snapshot);
  return result;
}

// ── 创建 key ──

function jobKey(projectId: string, slotIndex: number): string {
  return `${projectId}:${slotIndex}`;
}

// ── 乐观写入 ──

export function upsertLocalRegenJob(job: FrameRegenJob) {
  const snapshot = readStore();
  const key = jobKey(job.projectId, job.slotIndex);
  const existing = snapshot.jobs[key];

  // 只禁止同一代任务从 terminal 回退到 active。
  // 新一代 generationId 必须允许覆盖旧 completed/failed，否则点击无反应。
  const isSameGeneration = existing && existing.generationId === job.generationId;
  if (
    existing &&
    isSameGeneration &&
    TERMINAL_STATUSES.has(existing.status) &&
    ACTIVE_STATUSES.has(job.status)
  ) {
    return;
  }

  snapshot.jobs[key] = {
    ...existing,
    ...job,
    updatedAt: Date.now(),
  };
  writeStore(snapshot);
  notify(snapshot.jobs);
}

// ── 服务端校准 ──

export function reconcileServerRegenJobs(serverJobs: FrameRegenJob[]) {
  const snapshot = readStore();
  let changed = false;
  const now = Date.now();

  for (const serverJob of serverJobs) {
    const key = jobKey(serverJob.projectId, serverJob.slotIndex);
    const local = snapshot.jobs[key];

    // 如果本地已经是更新一代 active job，忽略旧 generation 的服务端结果
    if (
      local &&
      local.generationId !== serverJob.generationId &&
      ACTIVE_STATUSES.has(local.status)
    ) {
      continue;
    }

    // 服务端终态 → 覆盖本地
    if (TERMINAL_STATUSES.has(serverJob.status)) {
      snapshot.jobs[key] = { ...local, ...serverJob, updatedAt: now };
      changed = true;
      continue;
    }

    // 服务端 active：如果本地没有，补充
    if (!local) {
      snapshot.jobs[key] = { ...serverJob, updatedAt: now };
      changed = true;
    } else if (ACTIVE_STATUSES.has(local.status)) {
      // 本地和远端都是 active → 用远端状态更新（可能状态推进了）
      snapshot.jobs[key] = { ...local, ...serverJob, updatedAt: now };
      changed = true;
    }
    // 本地旧 terminal，服务端新 active（不同 generation）→ 允许新 gen 覆盖
    else if (local.generationId !== serverJob.generationId && ACTIVE_STATUSES.has(serverJob.status)) {
      snapshot.jobs[key] = { ...serverJob, updatedAt: now };
      changed = true;
    }
  }

  if (changed) {
    writeStore(snapshot);
    notify(snapshot.jobs);
  }
}

// ── 完成/失败后清理 ──

export function removeLocalRegenJob(
  projectId: string,
  slotIndex: number,
  generationId?: string,
) {
  const snapshot = readStore();
  const key = jobKey(projectId, slotIndex);
  const existing = snapshot.jobs[key];
  if (!existing) return;
  // 只清理指定 generation 的 job，避免误删新一轮任务
  if (generationId && existing.generationId !== generationId) return;
  delete snapshot.jobs[key];
  writeStore(snapshot);
  notify(snapshot.jobs);
}

// ── 查询 ──

export function getActiveRegenJobsForProject(
  projectId: string,
): FrameRegenJob[] {
  const snapshot = readStore();
  return Object.values(snapshot.jobs).filter(
    j => j.projectId === projectId && ACTIVE_STATUSES.has(j.status),
  );
}

export function isRegenActive(job: FrameRegenJob): boolean {
  return ACTIVE_STATUSES.has(job.status);
}
