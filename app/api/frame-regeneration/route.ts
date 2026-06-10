import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/auth/admin';
import { generateStoryboardPrompts } from '@/lib/ai/deepseek';
import { generateImage } from '@/lib/image/replicate';
import { persistGeneratedImage } from '@/lib/image/storage';
import { buildStoryboardContext, buildBoundStoryboardPrompt } from '@/lib/storyboard/server';
import { normalizeStoryboardImages } from '@/lib/storyboard';

export const dynamic = 'force-dynamic';

/**
 * 后台执行帧重生成全流程（不绑定 HTTP 请求生命周期）
 * 刷新/切页不影响执行——状态全部写到 frame_regeneration_jobs 表中
 */
async function processFrameRegeneration(jobId: string, params: {
  projectId: string;
  userId: string;
  slotIndex: number;
  generationId: string;
  idea: string;
  productIntro?: any;
  referenceImage?: string;
  selectedAppearanceIndex?: number;
  storyboardImages: any;
}) {
  const {
    projectId, userId, slotIndex, generationId, idea,
    productIntro, referenceImage, selectedAppearanceIndex,
    storyboardImages,
  } = params;

  const jobUpdate = (fields: Record<string, any>) =>
    supabaseAdmin.from('frame_regeneration_jobs').update({
      ...fields,
      updated_at: new Date().toISOString(),
    }).eq('id', jobId);

  // ── Phase 1: 生成提示词 ──
  let description: string;
  let prompt: string;

  try {
    const ctx = buildStoryboardContext(productIntro, referenceImage, selectedAppearanceIndex);
    const promptResult = await generateStoryboardPrompts(idea, ctx);

    if (!promptResult.success || !promptResult.frames) {
      throw new Error(promptResult.error || '提示词生成失败');
    }

    const frame = promptResult.frames.find((f: any) => f.index === slotIndex)
      || promptResult.frames[slotIndex];

    if (!frame) throw new Error(`未找到第 ${slotIndex + 1} 帧的提示词`);

    description = frame.description || frame.sceneTitle || '';
    prompt = buildBoundStoryboardPrompt(frame.visualPrompt, description);

    await jobUpdate({
      status: 'generating_image',
      description_draft: description,
      prompt_draft: prompt,
    });
  } catch (err: any) {
    await jobUpdate({ status: 'failed', error_message: `Prompt: ${err.message}` });
    return;
  }

  // ── Phase 2: 生成图片 ──
  let imageUrl: string;
  let storagePath: string;
  let fileSize: number;

  try {
    const imageResult = await generateImage({
      type: 'storyboard',
      prompt,
      referenceImage: referenceImage || undefined,
      slotIndex,
      expectedTotal: 6,
    });

    if (!imageResult.success || !imageResult.imageUrl) {
      throw new Error(imageResult.error || '图片生成失败');
    }

    const saved = await persistGeneratedImage({
      tempUrl: imageResult.imageUrl,
      userId,
      projectId,
      step: 'storyboard',
      slotIndex,
    });

    imageUrl = saved.publicUrl;
    storagePath = saved.storagePath;
    fileSize = saved.fileSize;
  } catch (err: any) {
    await jobUpdate({ status: 'failed', error_message: `Image: ${err.message}` });
    return;
  }

  // ── Phase 3: 原子提交到 projects.storyboard_images ──
  try {
    const currentImages = normalizeStoryboardImages(storyboardImages, projectId);
    currentImages[slotIndex] = {
      ...currentImages[slotIndex],
      projectId,
      stepKey: 'storyboard' as const,
      slotIndex,
      generationId,
      url: imageUrl,
      storagePath,
      description,
      prompt,
    };

    await supabaseAdmin
      .from('projects')
      .update({ storyboard_images: currentImages })
      .eq('id', projectId)
      .eq('user_id', userId);
  } catch (err: any) {
    await jobUpdate({ status: 'failed', error_message: `Commit: ${err.message}` });
    return;
  }

  // ── Phase 4: 标记完成 ──
  await jobUpdate({
    status: 'completed',
    image_url_draft: imageUrl,
    storage_path_draft: storagePath,
    file_size_draft: fileSize,
  });
}

/**
 * POST /api/frame-regeneration
 *
 * 只创建 job 并立即返回。后台异步执行 prompt + image + 原子提交。
 * 刷新/切页不中断——前端回来轮询 GET 即可。
 */
export async function POST(request: NextRequest) {
  try {
    const { user } = await getCurrentUser();
    const body = await request.json();
    const {
      projectId,
      slotIndex,
      generationId,
      idea,
      productIntro,
      referenceImage,
      selectedAppearanceIndex,
    } = body;

    if (!projectId || typeof slotIndex !== 'number' || !generationId || !idea) {
      return NextResponse.json(
        { error: '缺少必要参数：projectId, slotIndex, generationId, idea' },
        { status: 400 },
      );
    }

    if (slotIndex < 0 || slotIndex >= 6) {
      return NextResponse.json({ error: 'slotIndex 必须在 0-5 之间' }, { status: 400 });
    }

    // 验证项目归属 + 读取 storyboard_images（供后台提交时使用）
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('id, user_id, storyboard_images')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: '项目不存在或无权访问' }, { status: 404 });
    }

    // 幂等：同 generationId 不重复创建
    const { data: existingJob } = await supabaseAdmin
      .from('frame_regeneration_jobs')
      .select('*')
      .eq('project_id', projectId)
      .eq('slot_index', slotIndex)
      .eq('generation_id', generationId)
      .maybeSingle();

    if (existingJob) {
      if (existingJob.status === 'failed') {
        await supabaseAdmin.from('frame_regeneration_jobs').delete().eq('id', existingJob.id);
      } else {
        return NextResponse.json({ success: true, job: existingJob });
      }
    }

    // 创建 job（初始状态：queued）
    const { data: job, error: createError } = await supabaseAdmin
      .from('frame_regeneration_jobs')
      .insert({
        project_id: projectId,
        user_id: user.id,
        slot_index: slotIndex,
        generation_id: generationId,
        status: 'queued',  // ← 不在此请求中跑编排
      })
      .select()
      .single();

    if (createError || !job) {
      console.error('创建 frame_regeneration_job 失败:', createError);
      return NextResponse.json({ error: '创建任务失败' }, { status: 500 });
    }

    // fire-and-forget：后台异步执行全流程，不阻塞 HTTP 响应
    processFrameRegeneration(job.id, {
      projectId,
      userId: user.id,
      slotIndex,
      generationId,
      idea,
      productIntro,
      referenceImage,
      selectedAppearanceIndex,
      storyboardImages: (project as any).storyboard_images,
    }).catch(err => {
      console.error('frame-regeneration 后台任务异常:', err);
    });

    // 立即返回 job，前端轮询 GET 获取进展
    return NextResponse.json({ success: true, job });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }
    console.error('frame-regeneration POST 异常:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/**
 * GET /api/frame-regeneration?projectId=...
 *
 * 纯查询：返回项目下最近 5 分钟的 jobs
 */
export async function GET(request: NextRequest) {
  try {
    const { user } = await getCurrentUser();
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: '缺少 projectId' }, { status: 400 });
    }

    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: '项目不存在或无权访问' }, { status: 404 });
    }

    const since = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data: jobs, error } = await supabaseAdmin
      .from('frame_regeneration_jobs')
      .select('*')
      .eq('project_id', projectId)
      .gte('updated_at', since)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ jobs: jobs || [] });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
