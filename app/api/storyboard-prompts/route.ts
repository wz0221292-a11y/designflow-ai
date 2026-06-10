import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { generateStoryboardPrompts } from '@/lib/ai/deepseek';

export const dynamic = 'force-dynamic';

/**
 * POST /api/storyboard-prompts
 *
 * 根据产品理念生成6帧故事板视觉提示词。
 * 每一帧的 visualPrompt 是英文，可直接发给 gpt-image-2。
 *
 * Body: { idea: string; context?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const { user } = await getCurrentUser();
    const { idea, context } = await request.json() as { idea: string; context?: string };

    if (!idea || typeof idea !== 'string' || !idea.trim()) {
      return NextResponse.json({ error: '缺少产品想法' }, { status: 400 });
    }

    const result = await generateStoryboardPrompts(idea.trim(), context || undefined);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ frames: result.frames });
  } catch (error: any) {
    if (error.message === 'Unauthorized') {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
