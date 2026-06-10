import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/image/jobs?projectId=xxx&step=appearance|storyboard|exploded_view
 *
 * 返回指定项目+步骤的图片任务列表。
 * - 权限：通过 session 客户端验证项目归属
 * - 去重：每个 slot 只返回最新一条任务
 * - 字段：统一转为 camelCase（imageUrl / projectId 等）
 */
export async function GET(request: NextRequest) {
  try {
    const { user, supabase } = await getCurrentUser();
    const { searchParams } = new URL(request.url);

    const projectId = searchParams.get('projectId');
    const step = searchParams.get('step');

    if (!projectId) {
      return NextResponse.json({ error: '缺少 projectId 参数' }, { status: 400 });
    }

    if (!step || !['appearance', 'storyboard', 'exploded_view'].includes(step)) {
      return NextResponse.json({ error: '缺少或无效的 step 参数' }, { status: 400 });
    }

    // 验证项目归属（RLS 保护）
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: '项目不存在或无权访问' }, { status: 404 });
    }

    const { data: jobs, error } = await supabase
      .from('image_jobs')
      .select('*')
      .eq('project_id', projectId)
      .eq('step_key', step)
      .order('slot_index', { ascending: true })
      .order('created_at', { ascending: false });

    // 表不存在或查询失败 → 直接报错，不吞
    if (error) {
      console.error('查询 image_jobs 失败:', error);
      return NextResponse.json(
        { error: `查询图片任务失败: ${error.message}` },
        { status: 500 }
      );
    }

    // 每个 slot 只保留最新一条（数据库已按 created_at DESC 排序）
    const latestBySlot = new Map<number, any>();

    for (const job of jobs || []) {
      const existing = latestBySlot.get(job.slot_index);
      if (
        !existing ||
        new Date(job.created_at).getTime() > new Date(existing.created_at).getTime()
      ) {
        latestBySlot.set(job.slot_index, job);
      }
    }

    const latestJobs = Array.from(latestBySlot.values())
      .sort((a, b) => a.slot_index - b.slot_index)
      .map((job) => ({
        id: job.id,
        projectId: job.project_id,
        step: job.step_key,
        slotIndex: job.slot_index,
        status: job.status,
        prompt: job.prompt,
        imageUrl: job.image_url,
        errorMessage: job.error_message,
        createdAt: job.created_at,
        updatedAt: job.updated_at,
        completedAt: job.completed_at,
      }));

    return NextResponse.json({ jobs: latestJobs });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    console.error('查询图片任务异常:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
