/**
 * 图片 URL 解析工具
 *
 * 核心原则：storagePath 是唯一稳定标识，URL 可随时重建。
 * - 优先使用已缓存的 URL
 * - URL 失效时通过 storagePath 重建
 * - 支持公开 bucket 的 getPublicUrl 和私有 bucket 的 createSignedUrl
 */
import { supabase } from '@/lib/supabase/client';

const BUCKET = 'generated-images';

/** 从 storagePath 获取当前可访问的图片 URL */
export function getStorageUrl(storagePath: string): string {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

/** 从 storagePath 获取签名 URL（bucket 私有场景，1小时有效） */
export async function getSignedStorageUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 3600);
  if (error || !data?.signedUrl) throw new Error('无法获取签名 URL');
  return data.signedUrl;
}

/**
 * 解析图片 URL：优先用 cachedUrl，如果它看起来像第三方临时链接（65535.space 且非 supabase），
 * 则退回 storagePath 重建。返回 { url, isRecovered } 用于判断是否需要更新缓存。
 */
export function resolveImageUrl(
  cachedUrl: string | undefined | null,
  storagePath: string | undefined | null,
): { url: string; isRecovered: boolean } {
  // 有 storagePath → 优先用它生成稳定 URL
  if (storagePath) {
    const stableUrl = getStorageUrl(storagePath);
    return { url: stableUrl, isRecovered: cachedUrl !== stableUrl };
  }

  // 没有 storagePath → 退回 cachedUrl
  if (cachedUrl) {
    // 如果是第三方临时 URL（65535.space 且不含 supabase），标记为需要恢复
    const isThirdParty =
      cachedUrl.includes('65535.space') && !cachedUrl.includes('supabase');
    return { url: cachedUrl, isRecovered: isThirdParty };
  }

  return { url: '', isRecovered: false };
}
