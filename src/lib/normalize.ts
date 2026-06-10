/**
 * 项目资源规范化工具 —— 防串台核心模块
 *
 * 规则：
 * 1. 所有项目内资源在进入 state 前必须经过 normalize，注入 projectId/stepKey/slotIndex
 * 2. 所有 UI 渲染前必须通过 safe* 守卫过滤
 * 3. 所有保存入口必须通过 assertProjectBoundData 校验
 */
import type { AppearanceImage, ExplodedViewImage, StoryboardImage } from '@/types';

// ═══════════════════════════════════════════════════════════════
// 工具
// ═══════════════════════════════════════════════════════════════

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// ═══════════════════════════════════════════════════════════════
// AppearanceImage 规范化
// ═══════════════════════════════════════════════════════════════

const APPEARANCE_SLOTS = 3;

export function normalizeAppearanceImages(
  images: unknown,
  projectId: string,
): AppearanceImage[] {
  const source = Array.isArray(images) ? images : [];

  return Array.from({ length: APPEARANCE_SLOTS }, (_, slotIndex) => {
    const item = source[slotIndex];

    // 旧格式：纯字符串 URL
    if (typeof item === 'string') {
      return {
        projectId,
        stepKey: 'appearance' as const,
        slotIndex,
        url: item,
        storagePath: undefined,
        status: item ? 'ready' as const : undefined,
      };
    }

    // 新格式：对象
    if (isObject(item)) {
      return {
        projectId: (item.projectId as string) || projectId,
        stepKey: 'appearance' as const,
        slotIndex: typeof item.slotIndex === 'number' ? item.slotIndex : slotIndex,
        generationId: item.generationId as string | undefined,
        url: typeof item.url === 'string' ? item.url : '',
        storagePath: typeof item.storagePath === 'string' ? item.storagePath : undefined,
        status: item.status as AppearanceImage['status'],
      };
    }

    // 空槽位
    return {
      projectId,
      stepKey: 'appearance' as const,
      slotIndex,
      url: '',
    };
  });
}

// ═══════════════════════════════════════════════════════════════
// ExplodedViewImage 规范化
// ═══════════════════════════════════════════════════════════════

export function normalizeExplodedViewImage(
  image: unknown,
  projectId: string,
): ExplodedViewImage | null {
  if (!image) return null;

  // 旧格式：纯字符串 URL
  if (typeof image === 'string') {
    if (!image) return null;
    return {
      projectId,
      stepKey: 'exploded_view' as const,
      slotIndex: 0,
      url: image,
      status: 'ready',
    };
  }

  // 新格式：对象
  if (isObject(image)) {
    const url = typeof image.url === 'string' ? image.url : '';
    if (!url) return null;
    return {
      projectId: (image.projectId as string) || projectId,
      stepKey: 'exploded_view' as const,
      slotIndex: typeof image.slotIndex === 'number' ? image.slotIndex : 0,
      generationId: image.generationId as string | undefined,
      url,
      storagePath: typeof image.storagePath === 'string' ? image.storagePath : undefined,
      status: image.status as ExplodedViewImage['status'],
    };
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════
// 渲染守卫 —— UI 层过滤不属于当前项目的数据
// ═══════════════════════════════════════════════════════════════

export function safeFrameForProject(
  frame: StoryboardImage | undefined | null,
  currentProjectId: string,
): StoryboardImage | undefined {
  if (!frame) return undefined;
  if (frame.projectId && frame.projectId !== currentProjectId) return undefined;
  return frame;
}

export function safeAppearanceForProject(
  img: AppearanceImage | undefined | null,
  currentProjectId: string,
): AppearanceImage | undefined {
  if (!img) return undefined;
  if (img.projectId && img.projectId !== currentProjectId) return undefined;
  return img;
}

export function safeExplodedViewForProject(
  img: ExplodedViewImage | undefined | null,
  currentProjectId: string,
): ExplodedViewImage | undefined {
  if (!img) return undefined;
  if (img.projectId && img.projectId !== currentProjectId) return undefined;
  return img;
}

// ═══════════════════════════════════════════════════════════════
// 保存前强校验 —— 防止脏数据写入 DB
// ═══════════════════════════════════════════════════════════════

export function assertProjectBoundData(
  projectId: string,
  data: Record<string, unknown>,
): void {
  // 校验 storyboard_images
  const frames = data.storyboard_images as StoryboardImage[] | undefined;
  if (Array.isArray(frames)) {
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      if (!frame || !isObject(frame)) continue;
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

  // 校验 appearance_images
  const appearances = data.appearance_images as AppearanceImage[] | undefined;
  if (Array.isArray(appearances)) {
    for (let i = 0; i < appearances.length; i++) {
      const img = appearances[i];
      if (!img || !isObject(img)) continue;
      if (img.projectId && img.projectId !== projectId) {
        throw new Error(
          `Appearance image projectId mismatch at slot ${i}: ${img.projectId} !== ${projectId}`,
        );
      }
    }
  }

  // 校验 exploded_view_image
  const exploded = data.exploded_view_image;
  if (exploded && isObject(exploded)) {
    if (
      (exploded as unknown as ExplodedViewImage).projectId &&
      (exploded as unknown as ExplodedViewImage).projectId !== projectId
    ) {
      throw new Error(
        `Exploded view projectId mismatch: ${(exploded as unknown as ExplodedViewImage).projectId} !== ${projectId}`,
      );
    }
  }
}
