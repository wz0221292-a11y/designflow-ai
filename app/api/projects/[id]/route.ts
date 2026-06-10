import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/auth/admin';

export const dynamic = 'force-dynamic';

const STORAGE_BUCKET = 'generated-images';

/**
 * 删除用户在 Supabase Storage 中的项目目录及所有文件
 */
async function deleteProjectStorage(userId: string, projectId: string): Promise<number> {
  const prefix = `${userId}/${projectId}/`;
  let deletedCount = 0;

  try {
    // list() 最多返回 100 条，递归收集所有文件
    const allFiles: string[] = [];
    let offset = 0;

    while (true) {
      const { data: items, error } = await supabaseAdmin.storage
        .from(STORAGE_BUCKET)
        .list(prefix, { limit: 100, offset });

      if (error) {
        // 目录不存在不算错
        if (error.message?.includes('not found') || error.message?.includes('Not Found')) break;
        console.error(`列出存储文件失败 (${prefix}):`, error.message);
        break;
      }

      if (!items || !items.length) break;

      for (const item of items) {
        allFiles.push(`${prefix}${item.name}`);
      }

      if (items.length < 100) break;
      offset += 100;
    }

    if (allFiles.length > 0) {
      // Supabase remove() 一次最多删 1000 个，分批处理
      for (let i = 0; i < allFiles.length; i += 500) {
        const batch = allFiles.slice(i, i + 500);
        const { error: delErr } = await supabaseAdmin.storage
          .from(STORAGE_BUCKET)
          .remove(batch);

        if (delErr) {
          console.error(`删除存储文件失败 (batch ${i}):`, delErr.message);
        } else {
          deletedCount += batch.length;
        }
      }
    }
  } catch (err: any) {
    console.error('删除项目存储异常:', err.message);
  }

  return deletedCount;
}

/**
 * 项目 CRUD —— 使用 session 客户端（受 RLS 保护）
 *
 * 纵深防御：
 * 1. RLS 策略：auth.uid() = user_id（数据库层）
 * 2. 应用层校验：.eq('user_id', user.id)（代码层）
 * 两层都生效，即使忘记写第二层，RLS 也会拦住越权请求
 */

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, supabase } = await getCurrentUser();

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: '项目不存在或无权访问' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, supabase } = await getCurrentUser();
    const body = await request.json();

    const allowedFields = new Set([
      'idea',
      'background',
      'product_intro',
      'personas',
      'appearance_images',
      'cmf',
      'storyboard_images',
      'exploded_view_image',
      'current_step',
      'selected_appearance_index',
    ]);
    const updates: Record<string, any> = {};

    for (const [key, value] of Object.entries(body)) {
      if (!allowedFields.has(key)) {
        return NextResponse.json({ error: `不允许更新字段: ${key}` }, { status: 400 });
      }
      updates[key] = value;
    }

    if (typeof updates.idea === 'string') {
      updates.idea = updates.idea.trim();
      if (!updates.idea) {
        return NextResponse.json({ error: '项目想法不能为空' }, { status: 400 });
      }
    }

    if (typeof updates.current_step === 'number') {
      updates.current_step = Math.max(0, Math.min(7, Math.trunc(updates.current_step)));
    }

    const { data, error } = await supabase
      .from('projects')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, supabase } = await getCurrentUser();

    // 先取项目信息（确认归属 + 获取 userId）
    const { data: project, error: fetchErr } = await supabase
      .from('projects')
      .select('id, user_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (fetchErr || !project) {
      return NextResponse.json({ error: '项目不存在或无权访问' }, { status: 404 });
    }

    // 1. 清理 Supabase Storage 图片文件
    const storageDeleted = await deleteProjectStorage(project.user_id, id);

    // 2. 删除 project_assets 记录（用 admin 客户端绕过 RLS 限制）
    const { error: assetsErr } = await supabaseAdmin
      .from('project_assets')
      .delete()
      .eq('project_id', id);

    if (assetsErr) {
      console.error('删除 project_assets 失败:', assetsErr.message);
    }

    // 3. 删除 image_jobs 记录
    const { error: jobsErr } = await supabaseAdmin
      .from('image_jobs')
      .delete()
      .eq('project_id', id);

    if (jobsErr) {
      console.error('删除 image_jobs 失败:', jobsErr.message);
    }

    // 4. 删除项目本身
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      cleaned: { storageFiles: storageDeleted },
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
