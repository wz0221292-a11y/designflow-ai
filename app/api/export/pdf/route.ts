import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { canExportServer, getActivePlan } from '@/lib/membership';
import { generatePDF } from '@/lib/export/pdfGenerator';

// 允许的图片域名白名单（防止 SSRF）
const ALLOWED_IMAGE_HOSTS = [
  'design-flow-ai.vercel.app',
  'designflow-ai.vercel.app',
  '65535.space',
  new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co').hostname,
];

function assertSafeImageUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    if (url.protocol !== 'https:') throw new Error(`不允许的图片协议: ${url.protocol}`);

    // 禁止第三方临时 URL（必须经过持久化）
    if (url.hostname.includes('65535.space') && url.hostname !== new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || '').hostname) {
      throw new Error(`图片尚未永久保存，无法导出（外部临时 URL: ${url.hostname}）。请重新生成图片后导出。`);
    }

    if (!ALLOWED_IMAGE_HOSTS.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))) {
      throw new Error(`图片域名不在白名单中: ${url.hostname}`);
    }
  } catch (e: any) {
    if (e.message?.includes('白名单') || e.message?.includes('协议') || e.message?.includes('永久')) throw e;
    throw new Error('无效的图片 URL');
  }
}

export async function POST(request: NextRequest) {
  try {
    // 使用 session 客户端（受 RLS 保护）而非 supabaseAdmin
    const { user, supabase } = await getCurrentUser();
    const body = await request.json();
    const { projectId } = body;

    if (!projectId) {
      return NextResponse.json({ error: '缺少 projectId' }, { status: 400 });
    }

    // 查项目（RLS + 应用层双重校验归属）
    const { data: project, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single();

    if (error || !project) {
      return NextResponse.json({ error: '项目不存在或无权访问' }, { status: 404 });
    }

    // 会员校验（查当前 session 用户，RLS 只允许读自己的 profile）
    const { data: profile } = await supabase
      .from('profiles')
      .select('membership_plan, membership_expires_at')
      .eq('id', user.id)
      .single();

    if (profile && !canExportServer(getActivePlan(profile))) {
      return NextResponse.json({ error: '请先充值会员后再导出文件' }, { status: 403 });
    }

    const projectData = project as any;
    if (body.selectedAppearance && projectData.appearance_images?.length > 0) {
      projectData.appearance_images = [body.selectedAppearance];
    }

    // 校验所有图片 URL
    const imageUrls: string[] = [];
    if (projectData.appearance_images) imageUrls.push(...(projectData.appearance_images as string[]));
    if (projectData.storyboard_images) {
      (projectData.storyboard_images as any[]).forEach((s: any) => {
        if (s.url) imageUrls.push(s.url);
      });
    }
    if (projectData.exploded_view_image) imageUrls.push(projectData.exploded_view_image);
    for (const url of imageUrls) {
      if (url) assertSafeImageUrl(url);
    }

    const pdfBuffer = await generatePDF(projectData, body.includeSections);
    const filename = projectData.product_intro?.name || 'design';

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(`${filename}.pdf`)}`,
      },
    });
  } catch (error: any) {
    if (error.message === 'Unauthorized') return NextResponse.json({ error: '请先登录' }, { status: 401 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
