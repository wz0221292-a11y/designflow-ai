import type { StoryboardImage } from '@/types';

export const STORYBOARD_FRAME_COUNT = 6;

export function createEmptyStoryboardImage(projectId?: string, slotIndex?: number): StoryboardImage {
  return {
    projectId: projectId || '',
    stepKey: 'storyboard',
    slotIndex: typeof slotIndex === 'number' ? slotIndex : 0,
    url: '',
    description: '',
    prompt: '',
    storagePath: '',
  };
}

/**
 * 规范化故事板图片数组 —— 自动注入 projectId/stepKey/slotIndex
 * 兼容旧数据（无 projectId 字段的纯 {url, description} 对象）
 */
export function normalizeStoryboardImages(
  images: unknown,
  projectId: string,
  length = STORYBOARD_FRAME_COUNT,
): StoryboardImage[] {
  const source = Array.isArray(images) ? images : [];
  return Array.from({ length }, (_, index) => {
    const item = source[index] as Partial<StoryboardImage> | null | undefined;
    return {
      projectId: item?.projectId || projectId,
      stepKey: 'storyboard' as const,
      slotIndex: typeof item?.slotIndex === 'number' ? item.slotIndex : index,
      generationId: item?.generationId || item?._regenerationId || undefined,
      url: typeof item?.url === 'string' ? item.url : '',
      description: typeof item?.description === 'string' ? item.description : '',
      prompt: typeof item?.prompt === 'string' ? item.prompt : '',
      storagePath: typeof item?.storagePath === 'string' ? item.storagePath : '',
      status: item?.status,
    };
  });
}

export function mergeStoryboardSlot(
  currentSlot: unknown,
  patch: Partial<StoryboardImage>,
): StoryboardImage {
  const current = normalizeStoryboardImages([currentSlot], patch.projectId || '', 1)[0];
  return {
    projectId: patch.projectId ?? current.projectId,
    stepKey: 'storyboard',
    slotIndex: typeof patch.slotIndex === 'number' ? patch.slotIndex : current.slotIndex,
    generationId: patch.generationId ?? current.generationId,
    url: patch.url ?? current.url,
    description: patch.description ?? current.description,
    prompt: patch.prompt ?? current.prompt,
    storagePath: patch.storagePath ?? current.storagePath,
    status: patch.status ?? current.status,
  };
}

/**
 * 渲染守卫：过滤不属于当前项目的故事板帧
 * 如果 frame.projectId 存在且不匹配当前项目，返回 undefined
 */
export function safeFrameForProject(
  frame: StoryboardImage | undefined | null,
  currentProjectId: string,
): StoryboardImage | undefined {
  if (!frame) return undefined;
  if (frame.projectId && frame.projectId !== currentProjectId) return undefined;
  return frame;
}

/**
 * 保存前强校验：确保所有资源数据都属于当前项目
 * 发现不匹配时抛出错误，防止脏数据落库
 */
export function assertStoryboardBoundData(
  projectId: string,
  frames: StoryboardImage[] | undefined | null,
): void {
  if (!Array.isArray(frames)) return;
  for (let i = 0; i < frames.length; i++) {
    const frame = frames[i];
    if (!frame) continue;
    if (frame.projectId && frame.projectId !== projectId) {
      throw new Error(
        `Storyboard frame projectId mismatch at slot ${i}: ${frame.projectId} !== ${projectId}`,
      );
    }
    if (frame.slotIndex !== undefined && frame.slotIndex !== i) {
      throw new Error(
        `Storyboard frame slotIndex mismatch at slot ${i}: ${frame.slotIndex}`,
      );
    }
  }
}
