import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/auth/admin';
import { persistGeneratedImage } from '@/lib/image/storage';

export const dynamic = 'force-dynamic';

const MAX_CHECK_PER_PROJECT = 30;

async function checkUrl(url: string): Promise<'alive' | 'dead'> {
  try {
    const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
    return res.ok ? 'alive' : 'dead';
  } catch {
    return 'dead';
  }
}

interface AssetInfo {
  type: string;
  typeLabel: string;
  slot: number;
  url: string;
  isThirdParty: boolean;
  status?: 'alive' | 'dead' | 'unchecked';
}

interface ProjectHealth {
  projectId: string;
  projectName: string;
  userId: string;
  totalImages: number;
  safeImages: number;
  thirdPartyImages: number;
  checkedAlive: number;
  checkedDead: number;
  unchecked: number;
  risk: 'critical' | 'warning' | 'healthy';
  assets: AssetInfo[];
}

interface HealthSummary {
  totalProjects: number;
  healthyProjects: number;
  warningProjects: number;
  criticalProjects: number;
  totalImages: number;
  safeImages: number;
  thirdPartyImages: number;
  deadImages: number;
  fixableImages: number;
  uncheckedImages: number;
}

export async function GET() {
  try {
    await requireAdmin();

    const { data: projects } = await supabaseAdmin
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (!projects) return NextResponse.json({ health: [], summary: null });

    const results: ProjectHealth[] = [];

    for (const p of projects) {
      const name = (p.product_intro as any)?.name || p.idea || '未命名';
      const assets: AssetInfo[] = [];

      ((p.appearance_images as string[]) || []).forEach((url, i) => {
        if (url) assets.push({ type: 'appearance', typeLabel: '外观', slot: i, url, isThirdParty: url.includes('65535.space') && !url.includes('supabase') });
      });

      ((p.storyboard_images as any[]) || []).forEach((s: any, i: number) => {
        if (s?.url) assets.push({ type: 'storyboard', typeLabel: '故事板', slot: i, url: s.url, isThirdParty: s.url.includes('65535.space') && !s.url.includes('supabase') });
      });

      if (p.exploded_view_image) {
        assets.push({ type: 'exploded_view', typeLabel: '爆炸图', slot: 0, url: p.exploded_view_image, isThirdParty: p.exploded_view_image.includes('65535.space') && !p.exploded_view_image.includes('supabase') });
      }

      if (!assets.length) continue;

      const thirdPartyAssets = assets.filter((a) => a.isThirdParty);
      const safeImages = assets.length - thirdPartyAssets.length;
      let checkedAlive = 0;
      let checkedDead = 0;
      let unchecked = 0;

      // Check third-party URLs up to MAX_CHECK_PER_PROJECT
      for (let i = 0; i < thirdPartyAssets.length; i++) {
        if (i < MAX_CHECK_PER_PROJECT) {
          const status = await checkUrl(thirdPartyAssets[i].url);
          thirdPartyAssets[i].status = status;
          if (status === 'alive') checkedAlive++;
          else checkedDead++;
        } else {
          thirdPartyAssets[i].status = 'unchecked';
          unchecked++;
        }
      }

      results.push({
        projectId: p.id,
        projectName: name,
        userId: p.user_id,
        totalImages: assets.length,
        safeImages,
        thirdPartyImages: thirdPartyAssets.length,
        checkedAlive,
        checkedDead,
        unchecked,
        risk: thirdPartyAssets.length > 0
          ? (checkedDead > 0 ? 'critical' : 'warning')
          : 'healthy',
        assets,
      });
    }

    // Sort: critical → warning → healthy
    const riskOrder: Record<string, number> = { critical: 0, warning: 1, healthy: 2 };
    results.sort((a, b) => (riskOrder[a.risk] ?? 2) - (riskOrder[b.risk] ?? 2));

    // Build image-level summary
    const summary: HealthSummary = {
      totalProjects: results.length,
      healthyProjects: results.filter((r) => r.risk === 'healthy').length,
      warningProjects: results.filter((r) => r.risk === 'warning').length,
      criticalProjects: results.filter((r) => r.risk === 'critical').length,
      totalImages: results.reduce((s, r) => s + r.totalImages, 0),
      safeImages: results.reduce((s, r) => s + r.safeImages, 0),
      thirdPartyImages: results.reduce((s, r) => s + r.thirdPartyImages, 0),
      deadImages: results.reduce((s, r) => s + r.checkedDead, 0),
      fixableImages: results.reduce((s, r) => s + r.checkedAlive, 0),
      uncheckedImages: results.reduce((s, r) => s + r.unchecked, 0),
    };

    return NextResponse.json({ health: results, summary });
  } catch (error: any) {
    const status = error.message === 'Forbidden: admin access required' ? 403
      : error.message === 'Unauthorized' ? 401 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}

/**
 * POST /api/admin/health — 单槽修复：下载第三方 URL → 上传 Storage → 更新 DB
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const { projectId, userId, type, slotIndex, url } = await request.json();

    if (!projectId || !userId || !type || url === undefined) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 });
    }

    // Download + upload
    const saved = await persistGeneratedImage({
      tempUrl: url,
      userId,
      projectId,
      step: type,
      slotIndex,
    });

    // Update project_assets
    await supabaseAdmin.from('project_assets').upsert({
      project_id: projectId,
      user_id: userId,
      asset_type: type,
      slot_index: slotIndex,
      storage_bucket: 'generated-images',
      storage_path: saved.storagePath,
      public_url: saved.publicUrl,
      source_url: url,
      source_provider: 'img-cn.65535.space',
      status: 'ready',
      file_size: saved.fileSize,
    }, { onConflict: 'project_id,asset_type,slot_index' });

    // Update projects JSONB (single slot)
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('appearance_images, storyboard_images, exploded_view_image')
      .eq('id', projectId)
      .single();

    if (project) {
      if (type === 'appearance') {
        const images = Array.from({ length: 3 }, (_, i) => (project.appearance_images as string[])?.[i] || '');
        images[slotIndex] = saved.publicUrl;
        await supabaseAdmin.from('projects').update({ appearance_images: images }).eq('id', projectId);
      } else if (type === 'storyboard') {
        const images = ((project.storyboard_images as any[]) || []).slice(0, 6);
        while (images.length < 6) images.push({ url: '', description: '' });
        images[slotIndex] = { ...images[slotIndex], url: saved.publicUrl, storagePath: saved.storagePath };
        await supabaseAdmin.from('projects').update({ storyboard_images: images }).eq('id', projectId);
      } else if (type === 'exploded_view') {
        await supabaseAdmin.from('projects').update({ exploded_view_image: saved.publicUrl }).eq('id', projectId);
      }
    }

    return NextResponse.json({ success: true, publicUrl: saved.publicUrl });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
