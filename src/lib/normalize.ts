/**
 * 项目资源规范化工具 —— 防串台核心模块
 *
 * 规则：
 * 1. 所有项目内资源在进入 state 前必须经过 normalize，注入 projectId/stepKey/slotIndex
 * 2. 所有 UI 渲染前必须通过 safe* 守卫过滤
 * 3. 所有保存入口必须通过 assertProjectBoundData 校验
 * 4. 所有保存入口必须先 normalizeProjectImagesBeforeSave 再落库
 * 5. 临时 URL（65535.space）禁止进入数据库主数据
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

// ═══════════════════════════════════════════════════════════════
// 临时 URL 检测 —— 核心防线：禁止 65535.space 临时链接进入主数据
// ═══════════════════════════════════════════════════════════════

const TEMPORARY_URL_PATTERN = /image\.65535\.space\/jobs\//;

export function isTemporaryImageUrl(url: unknown): boolean {
  return typeof url === 'string' && TEMPORARY_URL_PATTERN.test(url);
}

/**
 * 深度检测 JSON 数据中是否包含临时 URL。
 * 用于保存前硬拦截——只要有一条临时链接，整次保存就拒绝。
 */
export function containsTemporaryImageUrl(data: unknown): boolean {
  return TEMPORARY_URL_PATTERN.test(JSON.stringify(data));
}

// ═══════════════════════════════════════════════════════════════
// 保存前归一化 —— 确保数据库主字段只存 storagePath，不存临时 URL
// ═══════════════════════════════════════════════════════════════

/**
 * 归一化单个图片记录：
 * - 有 storagePath → url 清空（前端展示时从 storagePath 重建）
 * - 无 storagePath 但 url 是临时链接 → 抛出错误
 * - 无 storagePath 但 url 是稳定链接 → 保留
 */
function normalizeImageRecord(image: Record<string, unknown> | null | undefined): Record<string, unknown> | null | undefined {
  if (!image) return image;

  const storagePath = typeof image.storagePath === 'string' && image.storagePath ? image.storagePath : null;
  const url = typeof image.url === 'string' ? image.url : '';

  if (storagePath) {
    // 有 storagePath → 以 storagePath 为唯一真相，不保存 url
    return {
      ...image,
      url: '',
    };
  }

  if (url && isTemporaryImageUrl(url)) {
    throw new Error(
      `Refusing to save temporary image URL: ${url.slice(0, 80)}... ` +
      `storagePath is required before persisting to database.`
    );
  }

  return image;
}

/**
 * 保存前归一化整个项目的所有图片字段。
 * 必须在 PUT /api/projects/[id] 等写 DB 的入口调用。
 */
export function normalizeProjectImagesBeforeSave(project: Record<string, unknown>): Record<string, unknown> {
  const result = { ...project };

  // storyboard_images
  if (Array.isArray(result.storyboard_images)) {
    result.storyboard_images = (result.storyboard_images as any[]).map((img) =>
      normalizeImageRecord(img)
    );
  }

  // appearance_images
  if (Array.isArray(result.appearance_images)) {
    result.appearance_images = (result.appearance_images as any[]).map((img) =>
      normalizeImageRecord(img)
    );
  }

  // exploded_view_image
  if (result.exploded_view_image && typeof result.exploded_view_image === 'object') {
    result.exploded_view_image = normalizeImageRecord(
      result.exploded_view_image as Record<string, unknown>
    );
  }

  return result;
}

/**
 * 获取图片的渲染 URL：优先从 storagePath 生成，没有则退回 url 字段。
 * 这是所有 UI 展示图片的统一入口，不允许直接读取 image.url。
 */
export function getImageDisplayUrl(image: { url?: string | null; storagePath?: string | null } | null | undefined): string {
  if (!image) return '';

  // storagePath 是唯一稳定标识，优先用它生成 URL
  if (typeof image.storagePath === 'string' && image.storagePath) {
    // 动态生成 Supabase public URL
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl) {
      return `${supabaseUrl}/storage/v1/object/public/generated-images/${image.storagePath}`;
    }
    // fallback: 运行时拼接
    return `/api/storage/generated-images/${image.storagePath}`;
  }

  // 回退到 url 字段（旧数据 or 第三方暂存）
  if (typeof image.url === 'string' && image.url) {
    return image.url;
  }

  return '';
}

// ═══════════════════════════════════════════════════════════════
// 统一图片引用解析层 —— 所有"图片是否存在 / 取展示 URL"的唯一入口
// ═══════════════════════════════════════════════════════════════

export interface ImageRef {
  storagePath: string | null;
  url: string;
}

/**
 * 从任意图片对象中提取统一引用。
 * 兼容不同字段名：url / imageUrl, storagePath / imageStoragePath
 */
export function getImageRef(image: any): ImageRef {
  if (!image || typeof image !== 'object') return { storagePath: null, url: '' };
  return {
    storagePath: image.storagePath ?? image.imageStoragePath ?? null,
    url: image.url ?? image.imageUrl ?? (typeof image === 'string' ? image : ''),
  };
}

/**
 * 判断图片是否有可渲染内容。
 * 规则：有 storagePath → 一定有图片；有 url 但不是临时链接 → 有图片。
 * 绝对不能只检查 url，因为保存归一化后 url 会被清空。
 */
export function hasImageRef(image: any): boolean {
  const ref = getImageRef(image);
  if (typeof ref.storagePath === 'string' && ref.storagePath) return true;
  if (ref.url && !isTemporaryImageUrl(ref.url)) return true;
  return false;
}

/**
 * 判断图片引用是否为临时第三方链接（需修复）。
 */
export function isTemporaryImageRef(image: any): boolean {
  const ref = getImageRef(image);
  return !ref.storagePath && isTemporaryImageUrl(ref.url);
}

/**
 * 获取图片的最终渲染 URL。
 * 优先从 storagePath 生成 Supabase URL，否则退回 url 字段。
 * 与 getImageDisplayUrl 等价，但入参更宽泛。
 */
export function getRenderableImageUrl(image: any): string {
  return getImageDisplayUrl(getImageRef(image));
}
