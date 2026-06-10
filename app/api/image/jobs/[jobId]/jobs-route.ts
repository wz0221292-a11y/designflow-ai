import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { user, supabase } = await getCurrentUser();
    const { jobId } = await params;

    const { data: job, error } = await supabase
      .from('image_jobs')
      .select('id, status, image_url, error_message, step_key, slot_index, project_id')
      .eq('id', jobId)
      .maybeSingle();

    if (error) {
      if (error.code === '42P01') {
        return NextResponse.json({ status: 'not_found' });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!job) {
      return NextResponse.json({ status: 'not_found' });
    }

    // 用 session 客户端验证项目归属（RLS 保护）
    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('id', job.project_id)
      .eq('user_id', user.id)
      .single();

    if (!project) {
      return NextResponse.json({ error: '无权访问该任务' }, { status: 404 });
    }

    return NextResponse.json({
      id: job.id,
      status: job.status,
      imageUrl: job.image_url || null,
      errorMessage: job.error_message || null,
      stepKey: job.step_key,
      slotIndex: job.slot_index,
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: '请先登录' }, { status: 401 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
