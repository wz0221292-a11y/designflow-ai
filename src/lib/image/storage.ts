/**
 * 持久化图片存储 - 从临时 CDN 下载后上传到 Supabase Storage
 *
 * 核心原则：数据库只保存自己的永久 URL，绝不保存第三方临时 URL。
 */
import { supabaseAdmin } from '@/lib/auth/admin';
import { Buffer } from 'buffer';

const BUCKET = 'generated-images';

interface PersistInput {
  tempUrl: string;
  userId: string;
  projectId: string;
  step: 'appearance' | 'storyboard' | 'exploded_view';
  slotIndex: number;
}

interface PersistResult {
  publicUrl: string;
  storagePath: string;
}

export async function persistGeneratedImage({
  tempUrl,
  userId,
  projectId,
  step,
  slotIndex,
}: PersistInput): Promise<PersistResult> {
  // 1. 下载
  const res = await fetch(tempUrl, {
    signal: AbortSignal.timeout(15000),
    redirect: 'error',
  });

  if (!res.ok) {
    throw new Error(`下载生成图片失败: ${res.status}`);
  }

  // 2. 校验 Content-Type
  const contentType = res.headers.get('content-type') || '';
  if (!['image/png', 'image/jpeg', 'image/webp'].some((t) => contentType.startsWith(t))) {
    throw new Error(`非法图片类型: ${contentType}`);
  }

  // 3. 校验大小
  const ab = await res.arrayBuffer();
  const maxBytes = 10 * 1024 * 1024;
  if (ab.byteLength > maxBytes) {
    throw new Error('图片过大');
  }

  // 4. 确定扩展名
  const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';

  // 5. 上传到 Supabase Storage
  const path = `${userId}/${projectId}/${step}/${slotIndex}-${Date.now()}.${ext}`;
  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, Buffer.from(ab), {
      contentType,
      upsert: false,
    });

  if (error) throw error;

  // 6. 返回永久 URL
  const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);

  return {
    publicUrl: data.publicUrl,
    storagePath: path,
  };
}
