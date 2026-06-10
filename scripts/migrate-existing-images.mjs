/**
 * 抢救还存活的外部图片，转存到 Supabase Storage
 *
 * 用法: node scripts/migrate-existing-images.mjs
 * 建议定期执行（cron / 手动）。
 *
 * 逻辑：
 * 1. 扫描所有包含 image.65535.space 的项目
 * 2. HEAD 检查每个 URL
 * 3. 200 → 下载 → 上传到 generated-images → 替换 URL
 * 4. 404 → 标记为 missing
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

const BUCKET = 'generated-images';

async function persistImage(tempUrl, userId, projectId, step, slotIndex) {
  try {
    const res = await fetch(tempUrl, { method: 'HEAD', signal: AbortSignal.timeout(10000) });
    if (!res.ok) return { status: 'missing', reason: `HTTP ${res.status}` };

    const contentType = res.headers.get('content-type') || '';
    if (!['image/png', 'image/jpeg', 'image/webp'].some((t) => contentType.startsWith(t))) {
      return { status: 'failed', reason: `bad content-type: ${contentType}` };
    }

    const dlRes = await fetch(tempUrl, { signal: AbortSignal.timeout(30000) });
    const ab = await dlRes.arrayBuffer();
    if (ab.byteLength === 0) return { status: 'missing', reason: 'empty response' };
    if (ab.byteLength > 10 * 1024 * 1024) return { status: 'failed', reason: 'too large' };

    const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
    const path = `${userId}/${projectId}/${step}/${slotIndex}-${Date.now()}.${ext}`;

    const { error } = await supabase.storage.from(BUCKET).upload(path, Buffer.from(ab), { contentType, upsert: false });
    if (error) return { status: 'failed', reason: error.message };

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    return { status: 'migrated', publicUrl: data.publicUrl, storagePath: path };
  } catch (e) {
    return { status: 'failed', reason: e.message };
  }
}

async function main() {
  const { data: projects, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) { console.error(error); return; }

  let migrated = 0, missing = 0, skipped = 0;

  for (const p of projects || []) {
    const appearances = (p.appearance_images || []);
    const storyboards = (p.storyboard_images || []);
    const exploded = p.exploded_view_image;

    // Check appearance images
    for (let i = 0; i < appearances.length; i++) {
      const url = appearances[i];
      if (!url || !url.includes('image.65535.space')) continue;

      const result = await persistImage(url, p.user_id, p.id, 'appearance', i);
      if (result.status === 'migrated') {
        appearances[i] = result.publicUrl;
        console.log(`✅ ${(p.product_intro && p.product_intro.name) || p.id} appearance[${i}] → migrated`);
        migrated++;

        // Also write to project_assets
        await supabase.from('project_assets').upsert({
          project_id: p.id, user_id: p.user_id,
          asset_type: 'appearance', slot_index: i,
          storage_bucket: BUCKET, storage_path: result.storagePath,
          public_url: result.publicUrl, source_url: url,
          source_provider: 'img-cn.65535.space', status: 'ready',
        }, { onConflict: 'project_id,asset_type,slot_index' });
      } else {
        console.log(`❌ ${(p.product_intro && p.product_intro.name) || p.id} appearance[${i}] ${result.status}: ${result.reason}`);
        if (result.status === 'missing') missing++;
      }
    }

    // Check storyboard images
    for (let i = 0; i < storyboards.length; i++) {
      const url = storyboards[i]?.url;
      if (!url || !url.includes('image.65535.space')) continue;

      const result = await persistImage(url, p.user_id, p.id, 'storyboard', i);
      if (result.status === 'migrated') {
        storyboards[i] = { ...storyboards[i], url: result.publicUrl };
        console.log(`✅ ${(p.product_intro && p.product_intro.name) || p.id} storyboard[${i}] → migrated`);
        migrated++;

        await supabase.from('project_assets').upsert({
          project_id: p.id, user_id: p.user_id,
          asset_type: 'storyboard', slot_index: i,
          storage_bucket: BUCKET, storage_path: result.storagePath,
          public_url: result.publicUrl, source_url: url,
          source_provider: 'img-cn.65535.space', status: 'ready',
        }, { onConflict: 'project_id,asset_type,slot_index' });
      } else {
        console.log(`❌ ${(p.product_intro && p.product_intro.name) || p.id} storyboard[${i}] ${result.status}: ${result.reason}`);
        if (result.status === 'missing') missing++;
      }
    }

    // Check exploded view
    if (exploded && exploded.includes('image.65535.space')) {
      const result = await persistImage(exploded, p.user_id, p.id, 'exploded_view', 0);
      if (result.status === 'migrated') {
        await supabase.from('projects').update({ exploded_view_image: result.publicUrl }).eq('id', p.id);
        console.log(`✅ ${(p.product_intro && p.product_intro.name) || p.id} exploded → migrated`);
        migrated++;

        await supabase.from('project_assets').upsert({
          project_id: p.id, user_id: p.user_id,
          asset_type: 'exploded_view', slot_index: 0,
          storage_bucket: BUCKET, storage_path: result.storagePath,
          public_url: result.publicUrl, source_url: exploded,
          source_provider: 'img-cn.65535.space', status: 'ready',
        }, { onConflict: 'project_id,asset_type,slot_index' });
      } else {
        console.log(`❌ ${(p.product_intro && p.product_intro.name) || p.id} exploded ${result.status}: ${result.reason}`);
        if (result.status === 'missing') missing++;
      }
    }

    // Save back to DB
    if (appearances.some((u, i) => u !== (p.appearance_images || [])[i]) ||
        storyboards.some((s, i) => s?.url !== (p.storyboard_images || [])[i]?.url)) {
      await supabase.from('projects')
        .update({ appearance_images: appearances, storyboard_images: storyboards })
        .eq('id', p.id);
    }

    skipped++;
  }

  console.log(`\n完成: ${migrated} 已迁移, ${missing} 已失效, ${skipped} 项目扫描完毕`);
}

main().catch(console.error);
