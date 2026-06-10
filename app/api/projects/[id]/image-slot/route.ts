import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/auth/admin';
import { mergeStoryboardSlot } from '@/lib/storyboard';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/projects/:id/image-slot
 *
 * 原子更新图片数组的单个槽位，不会覆盖其他槽位的图片。
 *
 * Body:
 *   field: 'appearance_images' | 'storyboard_images'
 *   index: number (0-based slot index)
 *   url: string (图片 URL，传 '' 表示清空)
 *   description?: string (故事板槽位描述)
 *   prompt?: string (故事板槽位提示词)
 *   storagePath?: string (Supabase Storage 路径)
 *
 * 流程：
 *   1. 验证用户拥有该项目
 *   2. 从 DB 读取最新数组
 *   3. 只替换 index 位置的元素
 *   4. 写回 DB
 *
 * 这是解决"外观设计三图生成时其他卡片消失"的根本方案。
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const { user, supabase } = await getCurrentUser();

    const body = await request.json();
    const { field, index, url } = body;

    // 参数校验
    if (!field || !['appearance_images', 'storyboard_images'].includes(field)) {
      return NextResponse.json(
        { error: '无效的 field 参数，仅支持 appearance_images 或 storyboard_images' },
        { status: 400 }
      );
    }

    if (typeof index !== 'number' || index < 0) {
      return NextResponse.json({ error: '缺少或无效的 index 参数' }, { status: 400 });
    }

    if (typeof url !== 'string') {
      return NextResponse.json({ error: '缺少 url 参数' }, { status: 400 });
    }

    // 验证项目归属
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select(`${field}, user_id`)
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: '项目不存在或无权访问' }, { status: 404 });
    }

    // 读取当前数组，只替换指定槽位
    const maxSlots = field === 'appearance_images' ? 3 : 6;
    const currentArray = Array.isArray(project[field])
      ? [...(project[field] as any[])]
      : [];

    while (currentArray.length < maxSlots) {
      currentArray.push(field === 'appearance_images' ? '' : null);
    }

    if (index >= currentArray.length) {
      return NextResponse.json(
        { error: `index ${index} 超出范围（最大 ${currentArray.length - 1}）` },
        { status: 400 }
      );
    }

    if (field === 'storyboard_images') {
      // storyboard_images 数组中每项是 { url, description, prompt, storagePath }
      currentArray[index] = mergeStoryboardSlot(currentArray[index], {
        url,
        description: typeof body.description === 'string' ? body.description : undefined,
        prompt: typeof body.prompt === 'string' ? body.prompt : undefined,
        storagePath: typeof body.storagePath === 'string' ? body.storagePath : undefined,
      });
    } else {
      // appearance_images 数组中每项是 string
      currentArray[index] = url;
    }

    // 原子写回
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('projects')
      .update({ [field]: currentArray })
      .eq('id', projectId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('更新图片槽位失败:', updateError);
      return NextResponse.json(
        { error: `更新失败: ${updateError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }
    console.error('image-slot PATCH 异常:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
