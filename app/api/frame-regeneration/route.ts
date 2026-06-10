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
 * POST /api/frame-regeneration
 *
 * 服务端编排：单槽位 prompt 生成 + 图片生成 → 原子提交到 projects.storyboard_images
 *
 * Body: {
 *   projectId: string;
 *   slotIndex: number;
 *   generationId: string;
 *   idea: string;
 *   productIntro?: ProductIntro;
 *   referenceImage?: string;
 *   selectedAppearanceIndex?: number;
 *   context?: string;
 * }
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

    // 验证项目归属
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('id, user_id, storyboard_images')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: '项目不存在或无权访问' }, { status: 404 });
    }

    // 幂等：检查是否已有同一 generationId 的 job
    const { data: existingJob } = await supabaseAdmin
      .from('frame_regeneration_jobs')
      .select('*')
      .eq('project_id', projectId)
      .eq('slot_index', slotIndex)
      .eq('generation_id', generationId)
      .maybeSingle();

    if (existingJob) {
      if (existingJob.status === 'completed') {
        return NextResponse.json({ success: true, job: existingJob });
      }
      if (existingJob.status === 'failed') {
        // 允许重试：删除旧 job 继续
        await supabaseAdmin
          .from('frame_regeneration_jobs')
          .delete()
          .eq('id', existingJob.id);
      } else {
        // queued / generating_prompt / generating_image — 还在跑，返回当前状态
        return NextResponse.json({ success: true, job: existingJob });
      }
    }

    // 创建 job
    const { data: job, error: createError } = await supabaseAdmin
      .from('frame_regeneration_jobs')
      .insert({
        project_id: projectId,
        user_id: user.id,
        slot_index: slotIndex,
        generation_id: generationId,
        status: 'generating_prompt',
      })
      .select()
      .single();

    if (createError || !job) {
      console.error('创建 frame_regeneration_job 失败:', createError);
      return NextResponse.json({ error: '创建任务失败' }, { status: 500 });
    }

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

      // 更新 job: prompt 完成，进入生图阶段
      await supabaseAdmin
        .from('frame_regeneration_jobs')
        .update({
          status: 'generating_image',
          description_draft: description,
          prompt_draft: prompt,
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id);
    } catch (promptError: any) {
      await supabaseAdmin
        .from('frame_regeneration_jobs')
        .update({
          status: 'failed',
          error_message: `Prompt: ${promptError.message}`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id);
      return NextResponse.json(
        { error: `提示词生成失败: ${promptError.message}` },
        { status: 500 },
      );
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

      // 持久化
      const saved = await persistGeneratedImage({
        tempUrl: imageResult.imageUrl,
        userId: user.id,
        projectId,
        step: 'storyboard',
        slotIndex,
      });

      imageUrl = saved.publicUrl;
      storagePath = saved.storagePath;
      fileSize = saved.fileSize;
    } catch (imageError: any) {
      await supabaseAdmin
        .from('frame_regeneration_jobs')
        .update({
          status: 'failed',
          error_message: `Image: ${imageError.message}`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id);
      return NextResponse.json(
        { error: `图片生成失败: ${imageError.message}` },
        { status: 500 },
      );
    }

    // ── Phase 3: 原子提交 — 一次性写回 storyboard_images ──
    try {
      const currentImages = normalizeStoryboardImages(
        (project as any).storyboard_images,
        projectId,
      );

      // 版本校验：只允许当前 generationId 的结果写入
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
        .eq('user_id', user.id);
    } catch (commitError: any) {
      await supabaseAdmin
        .from('frame_regeneration_jobs')
        .update({
          status: 'failed',
          error_message: `Commit: ${commitError.message}`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', job.id);
      return NextResponse.json(
        { error: `保存失败: ${commitError.message}` },
        { status: 500 },
      );
    }

    // ── Phase 4: 标记完成 ──
    const { data: completedJob } = await supabaseAdmin
      .from('frame_regeneration_jobs')
      .update({
        status: 'completed',
        image_url_draft: imageUrl,
        storage_path_draft: storagePath,
        file_size_draft: fileSize,
        updated_at: new Date().toISOString(),
      })
      .eq('id', job.id)
      .select()
      .single();

    return NextResponse.json({ success: true, job: completedJob || job });
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
 * 查询项目下所有活跃/最近完成的 regeneration jobs
 */
export async function GET(request: NextRequest) {
  try {
    const { user } = await getCurrentUser();
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: '缺少 projectId' }, { status: 400 });
    }

    // 验证项目归属
    const { data: project, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: '项目不存在或无权访问' }, { status: 404 });
    }

    // 返回最近 5 分钟内活跃或完成的 jobs
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
