import { jsPDF } from 'jspdf';
import type { Database } from '@/types/database';

// ── Cloudflare-compatible helpers ──────────────────────────────

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const CHUNK = 8192;
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i += CHUNK) {
    parts.push(String.fromCharCode(...bytes.slice(i, i + CHUNK)));
  }
  return btoa(parts.join(''));
}

let _fontBase64: string | null = null;

async function loadFontBase64(): Promise<string> {
  if (_fontBase64) return _fontBase64;
  const res = await fetch('/fonts/simhei.ttf');
  if (!res.ok) throw new Error(`Font fetch failed: ${res.status}`);
  _fontBase64 = arrayBufferToBase64(await res.arrayBuffer());
  return _fontBase64;
}

type ProjectRow = Database['public']['Tables']['projects']['Row'];
type Rgb = readonly [number, number, number];
type ImageData = { dataUrl: string; format: 'JPEG' | 'PNG' };

// ── Page geometry ───────────────────────────────────────────────
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 18;
const CW = PAGE_W - MARGIN * 2;           // content width
const HEADER_Y = 13;
const CONTENT_TOP = 28;
const CONTENT_BOT = 274;
const FOOTER_Y = 289;
const FONT_NAME = 'SimHei';
const LINE_H = 0.62; // Chinese-friendly line-height

// ── Color palette (modern, professional) ────────────────────────
const INK    = [15,  23,  42]  as const; // #0F172A — titles
const BODY   = [51,  65,  85]  as const; // #334155 — body
const MUTED  = [100, 116, 139] as const; // #64748B — captions
const BORDER = [226, 232, 240] as const; // #E2E8F0 — card borders
const SURFACE= [248, 250, 252] as const; // #F8FAFC — card bg
const INDIGO = [99,  102, 241] as const; // #6366F1 — primary accent
const EMERALD= [16,  185, 129] as const; // #10B981 — success
const AMBER  = [245, 158, 11]  as const; // #F59E0B — warning/highlight
const ROSE   = [244, 63,  94]  as const; // #F43F5E — secondary accent
const WHITE  = [255, 255, 255] as const;

// ── Helpers ─────────────────────────────────────────────────────

function text(value: unknown): string {
  return String(value ?? '')
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function hexToRgb(hex: unknown, fallback = '#FFFFFF') {
  const v = text(hex) || fallback;
  const n = /^#?[0-9a-fA-F]{6}$/.test(v) ? v.replace('#', '') : fallback.replace('#', '');
  return { r: parseInt(n.slice(0, 2), 16), g: parseInt(n.slice(2, 4), 16), b: parseInt(n.slice(4, 6), 16) };
}

function h(lines: number, fontSize: number): number {
  return Math.max(1, lines) * fontSize * LINE_H;
}

// ── Main generator ──────────────────────────────────────────────

export async function generatePDF(project: ProjectRow, includeSections?: Record<string, boolean>): Promise<Uint8Array> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const fontOk = await registerFont(doc);
  let y = CONTENT_TOP;
  let sectionTitle = '设计方案';

  const intro = project.product_intro as any;
  const personas = ((project.personas as any[]) || []).filter(Boolean);
  const cmf = project.cmf as any;
  const appearanceImages = ((project.appearance_images as string[]) || []).filter(Boolean);
  const storyboardImages = ((project.storyboard_images as any[]) || []).filter((i: any) => i?.url);
  const title = text(intro?.name) || text(project.idea) || '设计方案';
  const tagline = text(intro?.tagline) || 'AI 产品设计方案';

  const include = includeSections || {
    background: true, product_intro: true, personas: true,
    appearance: true, cmf: true, storyboard: true, exploded_view: true,
  };

  // ── Drawing shortcuts ─────────────────────────────────────────

  const sf = (bold = false) => { if (fontOk) doc.setFont(FONT_NAME, bold ? 'bold' : 'normal'); };
  const tc = (c: Rgb) => doc.setTextColor(...c);
  const fc = (c: Rgb) => doc.setFillColor(...c);
  const dc = (c: Rgb) => doc.setDrawColor(...c);

  const wrap = (content: string, w: number, max?: number): string[] => {
    const ls = doc.splitTextToSize(text(content), w) as string[];
    if (!max || ls.length <= max) return ls;
    const clip = ls.slice(0, max);
    clip[clip.length - 1] = clip[clip.length - 1].replace(/…$/, '') + '…';
    return clip;
  };

  // ── Page management ───────────────────────────────────────────

  const newPage = () => { doc.addPage(); drawHeader(); y = CONTENT_TOP; };

  const ensure = (need: number) => {
    if (y + need > CONTENT_BOT && y > CONTENT_TOP + 10) newPage();
    if (y + need > CONTENT_BOT) newPage();
  };

  // ── Header / Footer ───────────────────────────────────────────

  const drawHeader = () => {
    dc(BORDER); doc.setLineWidth(0.3);
    doc.line(MARGIN, HEADER_Y, PAGE_W - MARGIN, HEADER_Y);
    sf(true); doc.setFontSize(8); tc(INK);
    doc.text('DesignFlow AI', MARGIN, 9.5);
    sf(); doc.setFontSize(7.5); tc(MUTED);
    doc.text(sectionTitle, PAGE_W - MARGIN, 9.5, { align: 'right' });
  };

  const drawFooters = () => {
    const total = doc.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      doc.setPage(i);
      sf(); doc.setFontSize(7.5); tc(MUTED);
      doc.text(`${i} / ${total}`, MARGIN, FOOTER_Y);
      doc.text('Generated by DesignFlow AI', PAGE_W - MARGIN, FOOTER_Y, { align: 'right' });
    }
  };

  // ── Section title ─────────────────────────────────────────────

  const addSection = (name: string, subtitle?: string) => {
    sectionTitle = name;
    const need = subtitle ? 34 : 24;
    ensure(need);
    y += 1;

    sf(true); doc.setFontSize(18); tc(INK);
    doc.text(text(name), MARGIN, y);

    // Dual-color accent bar
    fc(INDIGO);
    doc.roundedRect(MARGIN, y + 4.5, 14, 1.2, 0.6, 0.6, 'F');
    fc(BORDER);
    doc.roundedRect(MARGIN + 15.5, y + 4.5, CW - 15.5, 1.2, 0.6, 0.6, 'F');
    y += 12;

    if (subtitle) {
      sf(); doc.setFontSize(9); tc(MUTED);
      doc.text(text(subtitle), MARGIN, y);
      y += 9;
    }
  };

  // ── Body card (paginated, for long content) ───────────────────

  const addBodyCard = (content: string, accent: Rgb = INDIGO, label?: string) => {
    const val = text(content);
    if (!val) return;

    const fs = 10;
    const lh = fs * LINE_H;
    const tw = CW - 16;
    const allLines = wrap(val, tw);
    const maxCardH = CONTENT_BOT - CONTENT_TOP - 10;
    const hdrH = label ? 12 : 6;

    let first = true;
    const paras = splitParas(allLines);

    for (const pl of paras) {
      const ch = hdrH + h(pl.length, fs) + 10;
      if (ch <= maxCardH) {
        ensure(ch + 6);
        drawBodyChunk({ lines: pl, accent, label: first ? label : undefined, fs, lh, tw, ch, hdrH });
        first = false;
      } else {
        const avail = maxCardH - hdrH - 10;
        const perChunk = Math.max(3, Math.floor(avail / lh));
        let li = 0;
        while (li < pl.length) {
          const chunk = pl.slice(li, li + perChunk);
          const h2 = hdrH + h(chunk.length, fs) + 10;
          ensure(h2 + 6);
          drawBodyChunk({ lines: chunk, accent, label: first ? label : `${label || ''}（续）`, fs, lh, tw, ch: h2, hdrH });
          first = false;
          li += chunk.length;
        }
      }
    }
  };

  const drawBodyChunk = (o: { lines: string[]; accent: Rgb; label?: string; fs: number; lh: number; tw: number; ch: number; hdrH: number }) => {
    const top = y;

    // Card bg + border
    fc(SURFACE);
    doc.roundedRect(MARGIN, top, CW, o.ch, 3, 3, 'F');
    dc(BORDER); doc.setLineWidth(0.4);
    doc.roundedRect(MARGIN, top, CW, o.ch, 3, 3, 'S');

    // Accent left bar
    fc(o.accent);
    doc.roundedRect(MARGIN, top, 3, o.ch, 1.5, 1.5, 'F');

    const tx = MARGIN + 9;

    if (o.label) {
      sf(true); doc.setFontSize(10); tc(INK);
      doc.text(text(o.label), tx, top + 8.5);
    }

    sf(); doc.setFontSize(o.fs); tc(BODY);
    doc.text(o.lines, tx, top + o.hdrH + 2);
    y += o.ch + 6;
  };

  const splitParas = (lines: string[]): string[][] => {
    const r: string[][] = [];
    let cur: string[] = [];
    for (const l of lines) {
      if (l.trim() === '' && cur.length > 0) { r.push(cur); cur = []; }
      else if (l.trim() !== '') cur.push(l);
    }
    if (cur.length > 0) r.push(cur);
    return r.length > 0 ? r : [lines];
  };

  // ── Note card (needs / pain points / scenario) ────────────────

  const addNoteCard = (label: string, body: string, accent: Rgb = INDIGO) => {
    const val = text(body);
    if (!val) return;

    const fs = 9.5;
    const lh = fs * LINE_H;
    const tw = CW - 16;
    const allLines = wrap(val, tw);
    const maxCardH = CONTENT_BOT - CONTENT_TOP - 10;
    const hdrH = 11;
    const cardH = Math.min(maxCardH, hdrH + h(allLines.length, fs) + 10);

    if (cardH <= maxCardH) {
      ensure(cardH + 6);
      drawNoteChunk({ label, lines: allLines, accent, fs, lh, tw, cardH, hdrH });
    } else {
      const perChunk = Math.max(2, Math.floor((maxCardH - hdrH - 10) / lh));
      let li = 0;
      while (li < allLines.length) {
        const chunk = allLines.slice(li, li + perChunk);
        const h2 = hdrH + h(chunk.length, fs) + 10;
        ensure(h2 + 6);
        drawNoteChunk({ label, lines: chunk, accent, fs, lh, tw, cardH: h2, hdrH });
        li += chunk.length;
      }
    }
  };

  const drawNoteChunk = (o: { label: string; lines: string[]; accent: Rgb; fs: number; lh: number; tw: number; cardH: number; hdrH: number }) => {
    const top = y;

    fc(SURFACE);
    doc.roundedRect(MARGIN, top, CW, o.cardH, 3, 3, 'F');
    dc(BORDER); doc.setLineWidth(0.4);
    doc.roundedRect(MARGIN, top, CW, o.cardH, 3, 3, 'S');
    fc(o.accent);
    doc.roundedRect(MARGIN, top, 3, o.cardH, 1.5, 1.5, 'F');

    const tx = MARGIN + 9;

    // Label with accent dot
    fc(o.accent);
    doc.circle(tx, top + 8.5, 2, 'F');
    sf(true); doc.setFontSize(10); tc(INK);
    doc.text(text(o.label), tx + 5, top + 12);

    sf(); doc.setFontSize(o.fs); tc(BODY);
    doc.text(o.lines, tx, top + o.hdrH + 8);
    y += o.cardH + 6;
  };

  // ── Bullet list ───────────────────────────────────────────────

  const addBullets = (items: string[]) => {
    const clean = items.map(text).filter(Boolean);
    if (!clean.length) return;

    clean.forEach((item, i) => {
      const ls = wrap(item, CW - 14, 4);
      const blockH = Math.max(10, h(ls.length, 9.5) + 5);
      ensure(blockH + 2);

      // Number badge
      fc(INDIGO);
      doc.setFontSize(7.5);
      tc(WHITE);
      sf(true);
      doc.text(String(i + 1), MARGIN + 4.5, y + 5.8, { align: 'center' });

      sf(); doc.setFontSize(9.5); tc(BODY);
      doc.text(ls, MARGIN + 11, y + 5.5);
      y += blockH;
    });
    y += 3;
  };

  const addLabel = (label: string) => {
    ensure(14);
    sf(true); doc.setFontSize(12); tc(INK);
    doc.text(text(label), MARGIN, y);
    y += 8;
  };

  // ── Image helpers ─────────────────────────────────────────────

  const addImageFrame = async (url: string, x: number, top: number, w: number, h: number) => {
    fc(SURFACE); doc.roundedRect(x, top, w, h, 2.5, 2.5, 'F');
    const img = await fetchImage(url);
    if (img) doc.addImage(img.dataUrl, img.format, x, top, w, h);
  };

  const addImageGrid = async (images: string[], name: string, subtitle: string, capPrefix: string) => {
    if (!images.length) return;
    addSection(name, subtitle);

    const gap = 6;
    const colW = (CW - gap * 2) / 3;
    const imgH = colW * 0.7;

    for (let i = 0; i < Math.min(images.length, 9); i += 3) {
      const rowH = imgH + 15;
      ensure(rowH);
      const top = y;
      const row = images.slice(i, i + 3);

      for (let col = 0; col < row.length; col++) {
        const x = MARGIN + col * (colW + gap);
        await addImageFrame(row[col], x, top, colW, imgH);

        sf(); doc.setFontSize(7.5); tc(MUTED);
        doc.text(`${capPrefix} ${i + col + 1}`, x + colW / 2, top + imgH + 6, { align: 'center' });
      }
      y += rowH;
    }
  };

  // ── Storyboard ────────────────────────────────────────────────

  const addStoryboard = async () => {
    const gap = 6;
    const colW = (CW - gap * 2) / 3;
    const imgH = colW * 0.6;

    for (let i = 0; i < storyboardImages.length; i += 3) {
      const rowH = imgH + 24;
      ensure(rowH);
      const top = y;
      const row = storyboardImages.slice(i, i + 3);

      for (let col = 0; col < row.length; col++) {
        const x = MARGIN + col * (colW + gap);
        await addImageFrame(row[col].url, x, top, colW, imgH);

        const capLs = wrap(text(row[col].description), colW, 3);
        sf(); doc.setFontSize(7.2); tc(MUTED);
        doc.text(capLs, x, top + imgH + 5.5, { align: 'left' });
      }
      y += rowH;
    }
  };

  const addHeroImage = async (url: string) => {
    const img = await fetchImage(url);
    if (!img) return;
    const mw = CW * 0.85;
    const mh = 110;
    const w = mw;
    const h = Math.min(mh, w * 0.65);
    ensure(h + 10);
    const x = MARGIN + (CW - w) / 2;
    doc.addImage(img.dataUrl, img.format, x, y, w, h);
    y += h + 10;
  };

  // ── Persona ───────────────────────────────────────────────────

  const PERSONA_COLORS: Rgb[] = [INDIGO, EMERALD, AMBER, ROSE, [59, 130, 246] as Rgb, [168, 85, 247] as Rgb];

  const addPersona = (persona: any, index: number) => {
    const name = text(persona.name) || `用户 ${index + 1}`;
    const age = text(persona.age);
    const occupation = text(persona.occupation);
    const meta = [age && `${age}岁`, occupation].filter(Boolean).join(' · ');
    const accent = PERSONA_COLORS[index % PERSONA_COLORS.length];
    const initials = name.slice(0, 2);

    const entries = [
      ['需  求', persona.needs, INDIGO],
      ['痛  点', persona.pain_points, AMBER],
      ['场  景', persona.scenario, EMERALD],
    ] as const;

    ensure(32);

    // Avatar circle + name + meta
    fc(accent);
    doc.circle(MARGIN + 8, y + 7, 8, 'F');
    sf(true); doc.setFontSize(11); tc(WHITE);
    doc.text(initials, MARGIN + 8, y + 10.5, { align: 'center' });

    sf(true); doc.setFontSize(12); tc(INK);
    doc.text(name, MARGIN + 20, y + 7.5);
    if (meta) {
      sf(); doc.setFontSize(8.5); tc(MUTED);
      doc.text(meta, MARGIN + 20, y + 14.5);
    }
    y += 22;

    entries.forEach(([label, value, color]) => {
      if (!text(value)) return;
      addNoteCard(label, value, color);
    });
  };

  // ── CMF ───────────────────────────────────────────────────────

  const addCmf = () => {
    ensure(58);

    const cardW = (CW - 8) / 2;
    const swatches = [
      ['主色', cmf.primary_color, cmf.primary_color_hex, hexToRgb(cmf.primary_color_hex, '#000000'), MARGIN],
      ['辅色', cmf.secondary_color, cmf.secondary_color_hex, hexToRgb(cmf.secondary_color_hex, '#FFFFFF'), MARGIN + cardW + 8],
    ] as const;

    swatches.forEach(([label, colName, hex, rgb, x]) => {
      fc(SURFACE);
      doc.roundedRect(x, y, cardW, 42, 3, 3, 'F');
      dc(BORDER); doc.setLineWidth(0.4);
      doc.roundedRect(x, y, cardW, 42, 3, 3, 'S');

      // Large color swatch
      doc.setFillColor(rgb.r, rgb.g, rgb.b);
      doc.roundedRect(x + 7, y + 7, 28, 28, 2.5, 2.5, 'F');
      dc(BORDER); doc.setLineWidth(0.5);
      doc.roundedRect(x + 7, y + 7, 28, 28, 2.5, 2.5, 'S');

      sf(true); doc.setFontSize(10); tc(INK);
      doc.text(`${label}：${text(colName) || '未命名'}`, x + 42, y + 16);
      sf(); doc.setFontSize(8.5); tc(MUTED);
      doc.text(text(hex), x + 42, y + 27);
    });

    y += 50;
    if (cmf.material) addNoteCard('材  料', cmf.material, EMERALD);
    if (cmf.surface_treatment) addNoteCard('表面处理', cmf.surface_treatment, AMBER);
  };

  // ── Cover page ────────────────────────────────────────────────

  const addCover = () => {
    fc(WHITE);
    doc.rect(0, 0, PAGE_W, PAGE_H, 'F');

    // Geometric decoration — subtle circles
    fc([241, 245, 249]);
    doc.circle(PAGE_W - 25, 45, 60, 'F');
    fc([248, 250, 252]);
    doc.circle(PAGE_W - 20, 50, 42, 'F');

    // Top brand bar
    sf(true); doc.setFontSize(9); tc(INDIGO);
    doc.text('DESIGNFLOW AI', MARGIN, 26);

    dc(BORDER); doc.setLineWidth(0.3);
    doc.line(MARGIN, 32, PAGE_W - MARGIN, 32);
    doc.line(MARGIN, 255, PAGE_W - MARGIN, 255);

    // Title
    sf(true); doc.setFontSize(28); tc(INK);
    doc.text(wrap(title, CW - 20, 3), MARGIN, 78);

    // Tagline
    sf(); doc.setFontSize(12); tc(MUTED);
    doc.text(wrap(tagline, CW * 0.75, 3), MARGIN, 114);

    // Accent bars
    fc(INDIGO);
    doc.roundedRect(MARGIN, 138, 20, 2.2, 1.1, 1.1, 'F');
    fc(BORDER);
    doc.roundedRect(MARGIN + 23, 138, 90, 2.2, 1.1, 1.1, 'F');

    // Info block
    sf(true); doc.setFontSize(10); tc(INK);
    doc.text('产品设计方案', MARGIN, 160);
    sf(); doc.setFontSize(9); tc(MUTED);
    doc.text('背景研究 / 用户画像 / 外观设计 / CMF / 故事板 / 爆炸图', MARGIN, 172);
    doc.text(`生成时间：${new Date().toLocaleDateString('zh-CN')}`, MARGIN, 262);
  };

  // ── Table of Contents ─────────────────────────────────────────

  const addToc = () => {
    addSection('目  录', '报告内容结构');

    const secs = [
      ['01', '背景研究', include.background && Boolean(project.background)],
      ['02', '产品介绍', include.product_intro && Boolean(intro)],
      ['03', '用户画像', include.personas && personas.length > 0],
      ['04', '外观设计', include.appearance && appearanceImages.length > 0],
      ['05', 'CMF 方案', include.cmf && Boolean(cmf)],
      ['06', '故事板', include.storyboard && storyboardImages.length > 0],
      ['07', '爆炸图', include.exploded_view && Boolean(project.exploded_view_image)],
    ].filter(([, , ok]) => ok);

    secs.forEach(([num, name]) => {
      ensure(17);
      fc(INDIGO);
      doc.roundedRect(MARGIN, y - 5, 22, 11, 3, 3, 'F');
      sf(true); doc.setFontSize(9.5); tc(WHITE);
      doc.text(String(num), MARGIN + 5, y + 2.2);

      sf(true); doc.setFontSize(11); tc(INK);
      doc.text(String(name), MARGIN + 26, y + 2);

      dc(BORDER); doc.setLineWidth(0.3);
      doc.line(MARGIN, y + 6, PAGE_W - MARGIN, y + 6);
      y += 13;
    });
  };

  // ── Build document ────────────────────────────────────────────

  addCover();
  doc.addPage();
  sectionTitle = '目录';
  drawHeader(); y = CONTENT_TOP;
  addToc();

  // 1. Background
  if (include.background && project.background) {
    doc.addPage(); sectionTitle = '背景研究';
    drawHeader(); y = CONTENT_TOP;
    addSection('背景研究', '痛点、机会点与趋势分析');
    addBodyCard(project.background, INDIGO, '研究内容');
  }

  // 2. Product intro
  if (include.product_intro && intro) {
    doc.addPage(); sectionTitle = '产品介绍';
    drawHeader(); y = CONTENT_TOP;
    addSection('产品介绍', '产品定位、核心功能与使用场景');
    if (intro.name) addNoteCard('产品名称', text(intro.name) || '未命名产品', INDIGO);
    if (intro.tagline) addNoteCard('定位语', intro.tagline, INDIGO);
    if (intro.features?.length) {
      addLabel('核心功能');
      addBullets(intro.features);
    }
    if (intro.scenario) addNoteCard('使用场景', intro.scenario, EMERALD);
  }

  // 3. Personas
  if (include.personas && personas.length) {
    doc.addPage(); sectionTitle = '用户画像';
    drawHeader(); y = CONTENT_TOP;
    addSection('用户画像', '目标用户、核心需求与使用场景');
    personas.forEach((p, i) => addPersona(p, i));
  }

  // 4. Appearance
  if (include.appearance) {
    await addImageGrid(appearanceImages.slice(0, 9), '外观设计', '产品效果图与形态探索', '效果图');
  }

  // 5. CMF
  if (include.cmf && cmf) {
    doc.addPage(); sectionTitle = 'CMF 方案';
    drawHeader(); y = CONTENT_TOP;
    addSection('CMF 方案', '色彩、材料与表面处理');
    addCmf();
  }

  // 6. Storyboard
  if (include.storyboard && storyboardImages.length) {
    doc.addPage(); sectionTitle = '故事板';
    drawHeader(); y = CONTENT_TOP;
    addSection('故事板', '产品使用流程与场景表达');
    await addStoryboard();
  }

  // 7. Exploded view
  if (include.exploded_view && project.exploded_view_image) {
    doc.addPage(); sectionTitle = '爆炸图';
    drawHeader(); y = CONTENT_TOP;
    addSection('爆炸图', '产品结构分解视图');
    await addHeroImage(project.exploded_view_image);
  }

  drawFooters();

  const buf = doc.output('arraybuffer');
  return new Uint8Array(buf);
}

// ── Font / Image loading ────────────────────────────────────────

async function registerFont(doc: jsPDF): Promise<boolean> {
  try {
    const b64 = await loadFontBase64();
    doc.addFileToVFS('simhei.ttf', b64);
    doc.addFont('simhei.ttf', FONT_NAME, 'normal');
    doc.addFont('simhei.ttf', FONT_NAME, 'bold');
    doc.setFont(FONT_NAME, 'normal');
    return true;
  } catch (e) {
    console.warn('Chinese font load failed:', e);
    return false;
  }
}

async function fetchImage(url: string): Promise<ImageData | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') || '';
    const fmt: ImageData['format'] = ct.includes('png') ? 'PNG' : 'JPEG';
    const ab = await res.arrayBuffer();
    const b64 = arrayBufferToBase64(ab);
    return { dataUrl: `data:image/${fmt.toLowerCase()};base64,${b64}`, format: fmt };
  } catch { return null; }
}
