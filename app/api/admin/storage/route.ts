import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/auth/admin';

export const dynamic = 'force-dynamic';

interface StorageSnapshot {
  totalBytes: number;
  totalFiles: number;
  sizedBytes: number;    // 有 file_size 的文件总大小
  sizedFiles: number;    // 有 file_size 的文件数
  unsizedFiles: number;  // 缺失 file_size 的历史文件数
  byType: Record<string, { bytes: number; files: number }>;
  topUsers: Array<{
    userId: string;
    email: string;
    bytes: number;
    files: number;
  }>;
  topProjects: Array<{
    projectId: string;
    projectName: string;
    userId: string;
    userEmail: string;
    bytes: number;
    files: number;
  }>;
}

export async function GET() {
  try {
    await requireAdmin();

    // 查询所有 project_assets
    const { data: assets, error } = await supabaseAdmin
      .from('project_assets')
      .select('id, project_id, user_id, asset_type, file_size, storage_path')
      .eq('status', 'ready');

    if (error) throw error;

    const rows = (assets || []) as Array<{
      id: string;
      project_id: string;
      user_id: string;
      asset_type: string;
      file_size: number | null;
      storage_path: string;
    }>;

    // 聚合
    let totalBytes = 0;
    let sizedBytes = 0;
    let sizedFiles = 0;
    let unsizedFiles = 0;

    const byType: Record<string, { bytes: number; files: number }> = {};
    const byUser: Record<string, { bytes: number; files: number }> = {};
    const byProject: Record<string, { bytes: number; files: number; userId: string }> = {};

    for (const row of rows) {
      totalBytes += row.file_size || 0;
      if (row.file_size != null) {
        sizedBytes += row.file_size;
        sizedFiles++;
      } else {
        unsizedFiles++;
      }

      const type = row.asset_type || 'unknown';
      if (!byType[type]) byType[type] = { bytes: 0, files: 0 };
      byType[type].bytes += row.file_size || 0;
      byType[type].files++;

      if (!byUser[row.user_id]) byUser[row.user_id] = { bytes: 0, files: 0 };
      byUser[row.user_id].bytes += row.file_size || 0;
      byUser[row.user_id].files++;

      if (!byProject[row.project_id]) {
        byProject[row.project_id] = { bytes: 0, files: 0, userId: row.user_id };
      }
      byProject[row.project_id].bytes += row.file_size || 0;
      byProject[row.project_id].files++;
    }

    // 查用户名和项目名
    const userIds = Object.keys(byUser);
    const projectIds = Object.keys(byProject);

    const [{ data: profiles }, { data: projects }] = await Promise.all([
      userIds.length
        ? supabaseAdmin.from('profiles').select('id, email').in('id', userIds)
        : Promise.resolve({ data: [] }),
      projectIds.length
        ? supabaseAdmin
            .from('projects')
            .select('id, idea, product_intro')
            .in('id', projectIds)
        : Promise.resolve({ data: [] }),
    ]);

    const emailMap = new Map<string, string>();
    for (const p of (profiles || [])) {
      emailMap.set(p.id, p.email || p.id);
    }
    const nameMap = new Map<string, string>();
    for (const p of (projects || [])) {
      nameMap.set(
        p.id,
        (p.product_intro as any)?.name || p.idea || '未命名',
      );
    }

    const topUsers = Object.entries(byUser)
      .sort((a, b) => b[1].bytes - a[1].bytes)
      .slice(0, 20)
      .map(([userId, stats]) => ({
        userId,
        email: emailMap.get(userId) || userId,
        ...stats,
      }));

    const topProjects = Object.entries(byProject)
      .sort((a, b) => b[1].bytes - a[1].bytes)
      .slice(0, 20)
      .map(([projectId, stats]) => ({
        projectId,
        projectName: nameMap.get(projectId) || '未命名',
        userId: stats.userId,
        userEmail: emailMap.get(stats.userId) || stats.userId,
        bytes: stats.bytes,
        files: stats.files,
      }));

    const snapshot: StorageSnapshot = {
      totalBytes,
      totalFiles: rows.length,
      sizedBytes,
      sizedFiles,
      unsizedFiles,
      byType,
      topUsers,
      topProjects,
    };

    return NextResponse.json({ storage: snapshot });
  } catch (error: any) {
    const status =
      error.message === 'Forbidden: admin access required'
        ? 403
        : error.message === 'Unauthorized'
          ? 401
          : 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}
