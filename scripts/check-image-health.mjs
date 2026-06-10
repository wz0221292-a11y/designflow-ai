/**
 * 图片健康检查 - 扫描所有项目图片，检测 404 / 失效
 *
 * 用法: node scripts/check-image-health.mjs
 *
 * 输出: 受影响项目列表、失效 URL 数量
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envRaw = readFileSync(join(__dirname, '..', '.env.local'), 'utf-8');
const env = {};
for (const line of envRaw.split('\n')) {
  const t = line.trim();
  if (!t || t.startsWith('#')) continue;
  const i = t.indexOf('=');
  if (i < 0) continue;
  env[t.slice(0, i)] = t.slice(i + 1).replace(/^["']|["']$/g, '');
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

function findAllUrls(project) {
  const urls = [];
  const name = (project.product_intro || {}).name || project.idea;
  const appearances = (project.appearance_images || []);
  const storyboards = (project.storyboard_images || []);
  const exploded = project.exploded_view_image;

  appearances.forEach((url, i) => {
    if (url) urls.push({ project: name, projectId: project.id, step: 'appearance', slot: i, url });
  });
  storyboards.forEach((s, i) => {
    if (s?.url) urls.push({ project: name, projectId: project.id, step: 'storyboard', slot: i, url: s.url });
  });
  if (exploded) {
    urls.push({ project: name, projectId: project.id, step: 'exploded_view', slot: 0, url: exploded });
  }

  // Also check project_assets
  return urls;
}

async function checkUrl(url) {
  try {
    const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(8000) });
    return { ok: res.ok, status: res.status };
  } catch {
    return { ok: false, status: 0 };
  }
}

async function main() {
  console.log('🔍 扫描图片健康状态...\n');

  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });

  const allUrls = [];
  for (const p of projects || []) {
    allUrls.push(...findAllUrls(p));
  }

  let total = allUrls.length;
  let ok = 0, failed = 0;
  const failures = [];

  for (const item of allUrls) {
    const result = await checkUrl(item.url);
    if (result.ok) {
      ok++;
    } else {
      failed++;
      failures.push(item);
      // 标记 project_assets
      try {
        await supabase.from('project_assets')
          .update({ status: 'missing', updated_at: new Date().toISOString() })
          .eq('project_id', item.projectId)
          .eq('asset_type', item.step)
          .eq('slot_index', item.slot);
      } catch {}
    }
  }

  console.log(`总 URL: ${total}  |  ✅ ${ok}  |  ❌ ${failed}`);
  if (failures.length) {
    console.log(`\n失效图片:`);
    for (const f of failures) {
      console.log(`  ${f.project}  ${f.step}[${f.slot}]  → 404/不可达`);
      console.log(`    ${f.url.substring(0, 80)}`);
    }
  }
}

main().catch(console.error);
