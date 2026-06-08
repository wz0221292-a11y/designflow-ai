import PptxGenJS from 'pptxgenjs';
import type { Database } from '@/types/database';

type ProjectRow = Database['public']['Tables']['projects']['Row'];

// ═══════════════════════════════════════════════════════════════
// Design tokens
// ═══════════════════════════════════════════════════════════════
const SLIDE_W = 10;
const SLIDE_H = 5.625;
const MARGIN = 0.55;
const CW = SLIDE_W - MARGIN * 2; // content width

const HEADER_H = 0.5;
const FOOTER_H = 0.25;
const CONTENT_TOP = 0.8;
const CONTENT_BOT = SLIDE_H - FOOTER_H - 0.2;

// Colors
const INK    = '0F172A';
const BODY   = '334155';
const MUTED  = '64748B';
const BORDER = 'CBD5E1';
const SURFACE= 'F8FAFC';
const INDIGO = '6366F1';
const EMERALD= '10B981';
const AMBER  = 'F59E0B';
const ROSE   = 'F43F5E';
const WHITE  = 'FFFFFF';

const FONT = 'Microsoft YaHei';

// ═══════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════

function t(value: unknown): string {
  return String(value ?? '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
}

function splitContent(content: string, maxChars = 520): string[] {
  const clean = t(content);
  if (!clean) return [];
  const paragraphs = clean.split(/\n+/).map(p => p.trim()).filter(Boolean);
  const chunks: string[] = [];
  let cur = '';
  for (const p of paragraphs.length ? paragraphs : [clean]) {
    if (p.length > maxChars) {
      if (cur) { chunks.push(cur.trim()); cur = ''; }
      for (let i = 0; i < p.length; i += maxChars) chunks.push(p.slice(i, i + maxChars));
      continue;
    }
    if ((cur + '\n' + p).trim().length > maxChars) {
      chunks.push(cur.trim());
      cur = p;
    } else {
      cur = cur ? `${cur}\n${p}` : p;
    }
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks;
}

function addImageSafe(slide: any, path: string, x: number, y: number, w: number, h: number) {
  if (!path) return;
  (slide as any).addImage({ path, x, y, w, h, sizing: { type: 'crop' } });
}

// ═══════════════════════════════════════════════════════════════
// Slide building blocks
// ═══════════════════════════════════════════════════════════════

/** Add page number + subtle footer line */
function addFooter(slide: any, pageNum: number) {
  (slide as any).addText(`${pageNum}`, {
    x: MARGIN, y: SLIDE_H - FOOTER_H - 0.05, w: 1, h: FOOTER_H,
    fontSize: 7, fontFace: FONT, color: '94A3B8', align: 'left',
  });
  (slide as any).addText('DesignFlow AI', {
    x: MARGIN, y: SLIDE_H - FOOTER_H - 0.05, w: CW, h: FOOTER_H,
    fontSize: 7, fontFace: FONT, color: 'CBD5E1', align: 'right',
  });
}

/** Section title with accent bar */
function addSectionTitle(slide: any, title: string, subtitle?: string) {
  (slide as any).addText(t(title), {
    x: MARGIN, y: CONTENT_TOP, w: CW, h: 0.42,
    fontSize: 24, fontFace: FONT, color: INK, bold: true, fit: 'shrink',
  });
  // Accent bar
  (slide as any).addShape('rect', {
    x: MARGIN, y: CONTENT_TOP + 0.5, w: 0.55, h: 0.05, fill: { color: INDIGO },
  });
  (slide as any).addShape('rect', {
    x: MARGIN + 0.6, y: CONTENT_TOP + 0.5, w: CW - 0.6, h: 0.05, fill: { color: 'E2E8F0' },
  });
  if (subtitle) {
    (slide as any).addText(t(subtitle), {
      x: MARGIN, y: CONTENT_TOP + 0.63, w: CW, h: 0.25,
      fontSize: 9, fontFace: FONT, color: MUTED, fit: 'shrink',
    });
  }
}

/** Body text (for content slides) */
function addBody(slide: any, content: string, y: number, h: number, fontSize = 11) {
  (slide as any).addText(t(content), {
    x: MARGIN, y, w: CW, h, fontSize, fontFace: FONT, color: BODY,
    valign: 'top', breakLine: false, fit: 'shrink', margin: 0.04,
    lineSpacingMultiple: 0.95,
  });
}

/** Card with accent left bar */
function addCard(slide: any, label: string, body: string, y: number, h: number, accent: string, x?: number, w?: number) {
  const cx = x ?? MARGIN;
  const cw = w ?? CW;

  // Card bg
  (slide as any).addShape('rect', {
    x: cx, y, w: cw, h,
    fill: { color: SURFACE },
    line: { color: BORDER, width: 0.5 },
    rectRadius: 0.08,
  });
  // Accent bar
  (slide as any).addShape('rect', {
    x: cx, y, w: 0.06, h,
    fill: { color: accent },
  });

  const tx = cx + 0.2;
  // Label
  (slide as any).addText(t(label), {
    x: tx, y: y + 0.08, w: cw - 0.28, h: 0.22,
    fontSize: 10, fontFace: FONT, color: INK, bold: true,
  });
  // Body
  (slide as any).addText(t(body), {
    x: tx, y: y + 0.34, w: cw - 0.28, h: h - 0.42,
    fontSize: 9, fontFace: FONT, color: BODY,
    valign: 'top', fit: 'shrink', lineSpacingMultiple: 0.9,
  });
}

/** Text section with auto-pagination */
function addTextSection(pptx: PptxGenJS, title: string, content: string, subtitle?: string, pageNumRef?: { val: number }) {
  const chunks = splitContent(content);
  chunks.forEach((chunk, i) => {
    const slide = pptx.addSlide();
    addSectionTitle(slide, title, chunks.length > 1 ? `${subtitle || ''} ${i + 1}/${chunks.length}`.trim() : subtitle);
    addBody(slide, chunk, CONTENT_TOP + 0.85, CONTENT_BOT - CONTENT_TOP - 0.95, 11);
    if (pageNumRef) { addFooter(slide, pageNumRef.val); pageNumRef.val++; }
  });
}

/** Numbered feature grid */
function addFeatureGrid(slide: any, items: string[], y: number, accent: string) {
  const clean = items.map(t).filter(Boolean);
  if (!clean.length) return;

  const cols = Math.min(3, clean.length);
  const cardW = (CW - (cols - 1) * 0.2) / cols;
  const cardH = 1.15;

  clean.forEach((item, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = MARGIN + col * (cardW + 0.2);
    const cy = y + row * (cardH + 0.15);

    // Card bg
    (slide as any).addShape('rect', {
      x: cx, y: cy, w: cardW, h: cardH,
      fill: { color: SURFACE },
      line: { color: BORDER, width: 0.5 },
      rectRadius: 0.08,
    });
    // Number badge
    (slide as any).addShape('rect', {
      x: cx + 0.12, y: cy + 0.12, w: 0.28, h: 0.28,
      fill: { color: accent }, rectRadius: 0.06,
    });
    (slide as any).addText(String(i + 1), {
      x: cx + 0.12, y: cy + 0.12, w: 0.28, h: 0.28,
      fontSize: 9, fontFace: FONT, color: WHITE, bold: true, align: 'center', valign: 'middle',
    });
    // Text
    (slide as any).addText(item, {
      x: cx + 0.5, y: cy + 0.1, w: cardW - 0.62, h: cardH - 0.2,
      fontSize: 9, fontFace: FONT, color: BODY,
      valign: 'middle', fit: 'shrink', lineSpacingMultiple: 0.9,
    });
  });
}

// ═══════════════════════════════════════════════════════════════
// Image fetching
// ═══════════════════════════════════════════════════════════════

async function fetchImageAsBase64(url: string): Promise<{ data: Buffer; type: 'png' | 'jpeg' } | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') || '';
    const ab = await res.arrayBuffer();
    return { data: new Uint8Array(ab) as any, type: ct.includes('png') ? 'png' : 'jpeg' };
  } catch { return null; }
}

// ═══════════════════════════════════════════════════════════════
// Main generator
// ═══════════════════════════════════════════════════════════════

export async function generatePPT(project: ProjectRow, includeSections?: Record<string, boolean>): Promise<Uint8Array> {
  const pptx = new PptxGenJS();

  const intro = project.product_intro as any;
  const personas = ((project.personas as any[]) || []).filter(Boolean);
  const cmf = project.cmf as any;
  const appearanceImages = ((project.appearance_images as string[]) || []).filter(Boolean);
  const storyboardImages = ((project.storyboard_images as any[]) || []).filter((i: any) => i?.url);

  const include = includeSections || {
    background: true, product_intro: true, personas: true,
    appearance: true, cmf: true, storyboard: true, exploded_view: true,
  };

  pptx.layout = 'LAYOUT_16x9';
  pptx.title = t(intro?.name) || '设计方案';
  pptx.author = 'DesignFlow AI';
  pptx.company = 'DesignFlow AI';
  pptx.subject = t(project.idea);

  // ── Slide Master ──────────────────────────────────────────────

  pptx.defineSlideMaster({
    title: 'MASTER',
    background: { color: WHITE },
    objects: [
      // Header bar
      { rect: { x: 0, y: 0, w: '100%', h: HEADER_H, fill: { color: INK } } },
      { text: { text: 'DesignFlow AI', options: { x: MARGIN, y: 0.1, fontSize: 9, fontFace: FONT, color: WHITE, bold: true } } },
      // Bottom line
      { rect: { x: 0, y: SLIDE_H - FOOTER_H - 0.02, w: '100%', h: 0.02, fill: { color: 'E2E8F0' } } },
    ],
  });

  let pageNum = 1;

  // ═══════════════════════════════════════════════════════════
  // COVER SLIDE
  // ═══════════════════════════════════════════════════════════
  {
    const slide = pptx.addSlide();
    slide.background = { color: WHITE };

    // Decorative circle
    (slide as any).addShape('ellipse', {
      x: SLIDE_W - 1.4, y: -1.0, w: 3.0, h: 3.0,
      fill: { color: 'F1F5F9' },
    });
    (slide as any).addShape('ellipse', {
      x: SLIDE_W - 1.1, y: -0.6, w: 2.2, h: 2.2,
      fill: { color: 'F8FAFC' },
    });

    // Brand
    (slide as any).addText('DESIGNFLOW AI', {
      x: MARGIN, y: 0.4, w: CW, h: 0.3,
      fontSize: 9, fontFace: FONT, color: INDIGO, bold: true,
    });

    // Title
    (slide as any).addText(t(intro?.name) || '设计方案', {
      x: MARGIN, y: 1.6, w: CW - 0.4, h: 1.2,
      fontSize: 36, fontFace: FONT, color: INK, bold: true,
      valign: 'middle', fit: 'shrink',
    });

    // Tagline
    (slide as any).addText(t(intro?.tagline), {
      x: MARGIN, y: 3.0, w: CW * 0.7, h: 0.5,
      fontSize: 14, fontFace: FONT, color: MUTED, fit: 'shrink',
    });

    // Accent bars
    (slide as any).addShape('rect', {
      x: MARGIN, y: 3.7, w: 0.6, h: 0.06, fill: { color: INDIGO },
    });
    (slide as any).addShape('rect', {
      x: MARGIN + 0.65, y: 3.7, w: 2.4, h: 0.06, fill: { color: 'E2E8F0' },
    });

    // Bottom labels
    (slide as any).addText('产品设计方案', {
      x: MARGIN, y: 4.1, w: CW, h: 0.3,
      fontSize: 10, fontFace: FONT, color: INK, bold: true,
    });
    (slide as any).addText('背景研究 / 用户画像 / 外观设计 / CMF / 故事板 / 爆炸图', {
      x: MARGIN, y: 4.4, w: CW, h: 0.25,
      fontSize: 8, fontFace: FONT, color: MUTED,
    });
    (slide as any).addText(`生成日期：${new Date().toLocaleDateString('zh-CN')}`, {
      x: MARGIN, y: SLIDE_H - FOOTER_H - 0.35, w: CW, h: 0.22,
      fontSize: 8, fontFace: FONT, color: '94A3B8',
    });
  }

  // ═══════════════════════════════════════════════════════════
  // TABLE OF CONTENTS
  // ═══════════════════════════════════════════════════════════
  {
    const slide = pptx.addSlide();
    addSectionTitle(slide, '目  录', '报告内容结构');
    addFooter(slide, pageNum++);

    const secs = [
      ['01', '背景研究', include.background && Boolean(project.background)],
      ['02', '产品介绍', include.product_intro && Boolean(intro)],
      ['03', '用户画像', include.personas && personas.length > 0],
      ['04', '外观设计', include.appearance && appearanceImages.length > 0],
      ['05', 'CMF 方案', include.cmf && Boolean(cmf)],
      ['06', '故事板', include.storyboard && storyboardImages.length > 0],
      ['07', '爆炸图', include.exploded_view && Boolean(project.exploded_view_image)],
    ].filter(([, , ok]) => ok);

    secs.forEach(([num, name], i) => {
      const cy = CONTENT_TOP + 0.85 + i * 0.52;

      // Number badge
      (slide as any).addShape('rect', {
        x: MARGIN, y: cy, w: 0.48, h: 0.32,
        fill: { color: INDIGO }, rectRadius: 0.06,
      });
      (slide as any).addText(String(num), {
        x: MARGIN, y: cy, w: 0.48, h: 0.32,
        fontSize: 10, fontFace: FONT, color: WHITE, bold: true,
        align: 'center', valign: 'middle',
      });
      // Name
      (slide as any).addText(String(name), {
        x: MARGIN + 0.6, y: cy, w: CW - 0.6, h: 0.32,
        fontSize: 13, fontFace: FONT, color: INK, bold: true,
        valign: 'middle',
      });
      // Divider
      (slide as any).addShape('rect', {
        x: MARGIN, y: cy + 0.4, w: CW, h: 0.015,
        fill: { color: 'E2E8F0' },
      });
    });
  }

  // ═══════════════════════════════════════════════════════════
  // 1. BACKGROUND
  // ═══════════════════════════════════════════════════════════
  if (include.background && project.background) {
    addTextSection(pptx, '背景研究', project.background, '痛点、机会点与趋势分析', { val: pageNum });
    pageNum += Math.max(1, splitContent(project.background).length);
  }

  // ═══════════════════════════════════════════════════════════
  // 2. PRODUCT INTRO
  // ═══════════════════════════════════════════════════════════
  if (include.product_intro && intro) {
    {
      const slide = pptx.addSlide();
      addSectionTitle(slide, '产品介绍', '产品定位、核心功能与使用场景');
      addFooter(slide, pageNum++);

      // Product name hero card
      (slide as any).addShape('rect', {
        x: MARGIN, y: CONTENT_TOP + 0.8, w: CW, h: 0.65,
        fill: { color: SURFACE },
        line: { color: BORDER, width: 0.5 }, rectRadius: 0.08,
      });
      (slide as any).addShape('rect', {
        x: MARGIN, y: CONTENT_TOP + 0.8, w: 0.06, h: 0.65,
        fill: { color: INDIGO },
      });
      (slide as any).addText('产品名称', {
        x: MARGIN + 0.2, y: CONTENT_TOP + 0.86, w: 1.5, h: 0.22,
        fontSize: 10, fontFace: FONT, color: INK, bold: true,
      });
      (slide as any).addText(t(intro.name) || '未命名产品', {
        x: MARGIN + 0.2, y: CONTENT_TOP + 1.12, w: CW - 0.4, h: 0.24,
        fontSize: 14, fontFace: FONT, color: INK, bold: true, fit: 'shrink',
      });

      // Tagline card
      if (intro.tagline) {
        addCard(slide, '产品定位', intro.tagline, CONTENT_TOP + 1.65, 0.55, INDIGO);
      }

      // Features grid
      if (intro.features?.length) {
        (slide as any).addText('核心功能', {
          x: MARGIN, y: CONTENT_TOP + 2.42, w: CW, h: 0.28,
          fontSize: 13, fontFace: FONT, color: INK, bold: true,
        });
        addFeatureGrid(slide, intro.features, CONTENT_TOP + 2.78, INDIGO);
      }

      // Scenario
      if (intro.scenario) {
        const scenarioY = intro.features?.length ? CONTENT_TOP + 4.08 : CONTENT_TOP + 2.7;
        if (intro.features?.length > 3) {
          // Features took 2 rows → scenario goes on next slide
        } else {
          const cardH = Math.min(0.6, 0.35 + (Math.ceil(t(intro.scenario).length / 80) * 0.18));
          addCard(slide, '使用场景', intro.scenario, scenarioY, cardH, EMERALD);
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 3. PERSONAS
  // ═══════════════════════════════════════════════════════════
  if (include.personas && personas.length > 0) {
    const PERSONA_ACCENTS = [INDIGO, EMERALD, AMBER, ROSE, '3B82F6', 'A855F7'];

    for (const persona of personas) {
      const slide = pptx.addSlide();
      const accent = PERSONA_ACCENTS[personas.indexOf(persona) % PERSONA_ACCENTS.length];
      const name = t(persona.name) || '未命名';
      const age = t(persona.age);
      const occupation = t(persona.occupation);
      const meta = [age && `${age}岁`, occupation].filter(Boolean).join(' · ');
      const initials = name.slice(0, 2);

      addSectionTitle(slide, `用户画像：${name}`, meta);
      addFooter(slide, pageNum++);

      // Avatar circle
      (slide as any).addShape('ellipse', {
        x: MARGIN + 0.05, y: CONTENT_TOP + 0.78, w: 0.52, h: 0.52,
        fill: { color: accent },
      });
      (slide as any).addText(initials, {
        x: MARGIN + 0.05, y: CONTENT_TOP + 0.78, w: 0.52, h: 0.52,
        fontSize: 14, fontFace: FONT, color: WHITE, bold: true,
        align: 'center', valign: 'middle',
      });

      // Name
      (slide as any).addText(name, {
        x: MARGIN + 0.68, y: CONTENT_TOP + 0.82, w: CW - 0.68, h: 0.28,
        fontSize: 14, fontFace: FONT, color: INK, bold: true, valign: 'middle',
      });
      if (meta) {
        (slide as any).addText(meta, {
          x: MARGIN + 0.68, y: CONTENT_TOP + 1.08, w: CW - 0.68, h: 0.2,
          fontSize: 9, fontFace: FONT, color: MUTED, valign: 'middle',
        });
      }

      // Info cards
      const entries = [
        ['需  求', persona.needs, INDIGO],
        ['痛  点', persona.pain_points, AMBER],
        ['场  景', persona.scenario, EMERALD],
      ] as const;

      const cardStartY = CONTENT_TOP + 1.5;
      entries.forEach(([label, value, color], idx) => {
        const val = t(value);
        if (!val) return;
        const cardH = 0.35 + Math.ceil(val.length / 90) * 0.22;
        const cy = cardStartY + idx * (cardH + 0.12);
        addCard(slide, label, val, cy, cardH, color);
      });
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 4. APPEARANCE IMAGES
  // ═══════════════════════════════════════════════════════════
  if (include.appearance && appearanceImages.length > 0) {
    const slide = pptx.addSlide();
    addSectionTitle(slide, '外观设计', '产品效果图与形态探索');
    addFooter(slide, pageNum++);

    const gap = 0.25;
    const colW = (CW - gap * 2) / 3;
    const imgH = colW * 0.68;

    appearanceImages.slice(0, 6).forEach((img, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = MARGIN + col * (colW + gap);
      const y = CONTENT_TOP + 0.8 + row * (imgH + 0.38);

      addImageSafe(slide, img, x, y, colW, imgH);
      (slide as any).addText(`效果图 ${i + 1}`, {
        x, y: y + imgH + 0.04, w: colW, h: 0.18,
        fontSize: 7, fontFace: FONT, color: MUTED, align: 'center',
      });
    });
  }

  // ═══════════════════════════════════════════════════════════
  // 5. CMF
  // ═══════════════════════════════════════════════════════════
  if (include.cmf && cmf) {
    const slide = pptx.addSlide();
    addSectionTitle(slide, 'CMF 方案', '色彩、材料与表面处理');
    addFooter(slide, pageNum++);

    const cardW = (CW - 0.3) / 2;
    const swatchY = CONTENT_TOP + 0.8;

    const swatches = [
      { label: '主色', name: cmf.primary_color, hex: t(cmf.primary_color_hex || '#000000'), x: MARGIN },
      { label: '辅色', name: cmf.secondary_color, hex: t(cmf.secondary_color_hex || '#FFFFFF'), x: MARGIN + cardW + 0.3 },
    ];

    swatches.forEach((s) => {
      const hex = s.hex.replace('#', '') || 'CCCCCC';

      // Card bg
      (slide as any).addShape('rect', {
        x: s.x, y: swatchY, w: cardW, h: 1.6,
        fill: { color: SURFACE },
        line: { color: BORDER, width: 0.5 }, rectRadius: 0.08,
      });
      // Color swatch
      (slide as any).addShape('rect', {
        x: s.x + 0.18, y: swatchY + 0.22, w: 1.0, h: 1.0,
        fill: { color: hex }, rectRadius: 0.06,
        line: { color: BORDER, width: 0.5 },
      });
      // Label
      (slide as any).addText(`${s.label}：${t(s.name) || '未命名'}`, {
        x: s.x + 0.18, y: swatchY + 1.28, w: cardW - 0.36, h: 0.22,
        fontSize: 10, fontFace: FONT, color: INK, bold: true, fit: 'shrink',
      });
      (slide as any).addText(`HEX ${s.hex}`, {
        x: s.x + 0.18, y: swatchY + 1.46, w: cardW - 0.36, h: 0.18,
        fontSize: 8, fontFace: FONT, color: MUTED,
      });
    });

    // Material & surface treatment
    let matY = swatchY + 1.9;
    if (cmf.material) {
      const val = t(cmf.material);
      const h = Math.min(0.55, 0.3 + Math.ceil(val.length / 85) * 0.2);
      addCard(slide, '材  料', val, matY, h, EMERALD);
      matY += h + 0.12;
    }
    if (cmf.surface_treatment) {
      const val = t(cmf.surface_treatment);
      const h = Math.min(0.55, 0.3 + Math.ceil(val.length / 85) * 0.2);
      addCard(slide, '表面处理', val, matY, h, AMBER);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 6. STORYBOARD
  // ═══════════════════════════════════════════════════════════
  if (include.storyboard && storyboardImages.length > 0) {
    const slide = pptx.addSlide();
    addSectionTitle(slide, '故事板', '产品使用流程与场景表达');
    addFooter(slide, pageNum++);

    const gap = 0.25;
    const colW = (CW - gap * 2) / 3;
    const imgH = colW * 0.55;

    storyboardImages.slice(0, 6).forEach((img: any, i: number) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = MARGIN + col * (colW + gap);
      const y = CONTENT_TOP + 0.75 + row * (imgH + 0.55);

      addImageSafe(slide, img.url, x, y, colW, imgH);
      (slide as any).addText(t(img.description), {
        x, y: y + imgH + 0.04, w: colW, h: 0.38,
        fontSize: 7, fontFace: FONT, color: MUTED,
        align: 'center', fit: 'shrink', lineSpacingMultiple: 0.9,
      });
    });
  }

  // ═══════════════════════════════════════════════════════════
  // 7. EXPLODED VIEW
  // ═══════════════════════════════════════════════════════════
  if (include.exploded_view && project.exploded_view_image) {
    const slide = pptx.addSlide();
    addSectionTitle(slide, '爆炸图', '产品结构分解视图');
    addFooter(slide, pageNum++);
    addImageSafe(slide, project.exploded_view_image, MARGIN, CONTENT_TOP + 0.8, CW, CONTENT_BOT - CONTENT_TOP - 0.9);
  }

  const output = await pptx.write({ outputType: 'arraybuffer' }) as ArrayBuffer;
  return new Uint8Array(output);
}
