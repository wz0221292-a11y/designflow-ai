import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/auth/admin';
import { buildImageUsageKey, getActivePlan, getImageLimitServer, isMembershipEnforced } from '@/lib/membership';
import { generateImage } from '@/lib/image/replicate';
import { persistGeneratedImage } from '@/lib/image/storage';

const EXPECTED_TOTALS: Record<string, number> = {
  appearance: 3,
  storyboard: 6,
  exploded_view: 1,
};

// image_jobs 状态写入属于后端任务协调，使用 service role；用户侧读取走 RLS。
const jobsTable = () => supabaseAdmin.from('image_jobs') as any;

let jobsTableExists: boolean | null = null;

async function ensureJobsTable() {
  if (jobsTableExists !== null) return jobsTableExists;
  try {
    const { error } = await supabaseAdmin.from('image_jobs').select('id').limit(1);
    jobsTableExists = !error || error.code !== '42P01';
    return jobsTableExists;
  } catch {
    jobsTableExists = false;
    return false;
  }
}

async function createJob(projectId: string, stepKey: string, slotIndex: number, prompt: string) {
  if (!(await ensureJobsTable())) return null;
  try {
    const { data, error } = await jobsTable()
      .insert({ project_id: projectId, step_key: stepKey, slot_index: slotIndex, prompt, status: 'processing' })
      .select()
      .single();
    if (error) {
      if (error.code === '23505') {
        const { data: existing } = await jobsTable()
          .select('*')
          .eq('project_id', projectId)
          .eq('step_key', stepKey)
          .eq('slot_index', slotIndex)
          .in('status', ['queued', 'processing'])
          .maybeSingle();
        return existing;
      }
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

async function updateJobStatus(jobId: string, updates: Record<string, any>) {
  if (!(await ensureJobsTable())) return;
  try {
    await jobsTable().update(updates).eq('id', jobId);
  } catch {}
}

async function findExistingJob(projectId: string, stepKey: string, slotIndex: number) {
  if (!(await ensureJobsTable())) return null;
  try {
    const { data } = await jobsTable()
      .select('*')
      .eq('project_id', projectId)
      .eq('step_key', stepKey)
      .eq('slot_index', slotIndex)
      .in('status', ['queued', 'processing'])
      .maybeSingle();
    return data;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    // 身份仅从 session 获取；supabase 是用户客户端（受 RLS 保护）
    const { user, supabase } = await getCurrentUser();
    const body = await request.json();
    const { projectId, type, slotIndex, expectedTotal, prompt, referenceImage } = body;

    if (!type || !(type in EXPECTED_TOTALS)) {
      return NextResponse.json({ error: '无效的图片生成类型' }, { status: 400 });
    }

    const requiredTotal = EXPECTED_TOTALS[type];
    if (expectedTotal !== requiredTotal || !Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= requiredTotal) {
      return NextResponse.json({ error: '生图请求次数与当前页面不匹配' }, { status: 400 });
    }

    if (!projectId) {
      return NextResponse.json({ error: '缺少 projectId' }, { status: 400 });
    }

    // 验证项目归属（session 客户端 + RLS 双重保护）
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id, user_id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: '项目不存在或无权访问' }, { status: 404 });
    }

    // 会员检查（查当前 session 用户的 profile，RLS 允许读自己的）
    let imageLimit: number | null = null;
    let currentUsage = 0;
    let usageKey = '';
    let usage: Record<string, number> = {};

    if (isMembershipEnforced()) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, membership_plan, membership_expires_at, image_usage')
        .eq('id', user.id)
        .single();

      if (profileError) {
        return NextResponse.json({ error: profileError.message }, { status: 404 });
      }

      const activePlan = getActivePlan(profile);
      imageLimit = getImageLimitServer(activePlan);
      if (imageLimit === 0) {
        return NextResponse.json({ error: '请先充值会员后再生成图片' }, { status: 403 });
      }

      usage = ((profile as any).image_usage || {}) as Record<string, number>;
      usageKey = buildImageUsageKey(projectId, type);
      currentUsage = usage[usageKey] || 0;
      if (imageLimit !== null && currentUsage >= imageLimit) {
        return NextResponse.json({ error: '当前阶段图片生成次数已用完，请升级月度及以上会员' }, { status: 403 });
      }
    }

    const jobPrompt = prompt || `AI生成图片: ${type} #${slotIndex + 1}`;

    // Dedup
    const existingJob = await findExistingJob(projectId, type, slotIndex);
    if (existingJob) {
      const jobAge = Date.now() - new Date(existingJob.created_at).getTime();
      if (!existingJob.image_url && jobAge > 120_000) {
        await updateJobStatus(existingJob.id, { status: 'failed', error_message: '任务超时，自动重试' });
      } else if (existingJob.image_url) {
        return NextResponse.json({
          success: true,
          imageUrl: existingJob.image_url,
          job: existingJob,
          message: '该槽位图片已生成完成',
        });
      } else {
        return NextResponse.json({
          success: true,
          imageUrl: null,
          job: existingJob,
          message: '该槽位已有生成任务正在进行中',
        });
      }
    }

    const job = await createJob(projectId, type, slotIndex, jobPrompt);

    let result;
    try {
      result = await generateImage({ type, prompt: prompt || '', referenceImage, slotIndex, expectedTotal });
    } catch (genError: any) {
      if (job) await updateJobStatus(job.id, { status: 'failed', error_message: genError.message });
      return NextResponse.json({ error: genError.message }, { status: 500 });
    }

    if (!result.success) {
      if (job) await updateJobStatus(job.id, { status: 'failed', error_message: result.error });
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    const tempUrl = result.imageUrl!;

    // 持久化：从临时 CDN 下载并转存到 Supabase Storage
    const saved = await persistGeneratedImage({
      tempUrl,
      userId: user.id,
      projectId,
      step: type,
      slotIndex,
    });

    const finalUrl = saved.publicUrl;

    let completedJob = job;
    if (job) {
      const { data: updated } = await jobsTable()
        .update({ status: 'completed', image_url: finalUrl })
        .eq('id', job.id)
        .select()
        .single();
      if (updated) completedJob = updated;
    }

    // 写入 project_assets（独立资产表）
    try {
      await supabaseAdmin.from('project_assets').upsert({
        project_id: projectId,
        user_id: user.id,
        asset_type: type,
        slot_index: slotIndex,
        storage_bucket: 'generated-images',
        storage_path: saved.storagePath,
        public_url: finalUrl,
        source_url: tempUrl,
        source_provider: 'img-cn.65535.space',
        status: 'ready',
      }, { onConflict: 'project_id,asset_type,slot_index' });
    } catch (assetErr: any) {
      console.error('写入 project_assets 失败:', assetErr.message);
    }

    // 同时更新 projects JSONB（向后兼容，单 slot 写入）
    try {
      const { data: currentProject } = await supabase
        .from('projects')
        .select('appearance_images, storyboard_images, exploded_view_image')
        .eq('id', projectId)
        .eq('user_id', user.id)
        .single();

      if (currentProject) {
        if (type === 'appearance') {
          const existingImages = Array.from({ length: 3 }, (_, i) => (currentProject.appearance_images as string[])?.[i] || '');
          existingImages[slotIndex] = finalUrl;
          await supabase.from('projects').update({ appearance_images: existingImages }).eq('id', projectId).eq('user_id', user.id);
        } else if (type === 'storyboard') {
          const storyImages = (currentProject.storyboard_images as any[]) || [];
          while (storyImages.length < 6) storyImages.push({ url: '', description: '' });
          storyImages[slotIndex] = { ...storyImages[slotIndex], url: finalUrl };
          await supabase.from('projects').update({ storyboard_images: storyImages }).eq('id', projectId).eq('user_id', user.id);
        } else if (type === 'exploded_view') {
          await supabase.from('projects').update({ exploded_view_image: finalUrl }).eq('id', projectId).eq('user_id', user.id);
        }
      }
    } catch (saveErr: any) {
      console.error('更新 projects JSONB 失败:', saveErr.message);
    }

    // 更新用量（session 客户端，RLS 允许更新自己的 profile）
    if (isMembershipEnforced()) {
      await supabase
        .from('profiles')
        .update({ image_usage: { ...usage, [usageKey]: currentUsage + 1 } })
        .eq('id', user.id);
    }

    return NextResponse.json({
      success: true,
      imageUrl: finalUrl,
      imageUsage: currentUsage + 1,
      imageLimit,
      job: completedJob || { ...job, status: 'completed', image_url: finalUrl },
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: '请先登录' }, { status: 401 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
