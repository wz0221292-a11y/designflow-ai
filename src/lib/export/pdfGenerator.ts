import { readFileSync } from 'fs';
import { join } from 'path';
import pdfMake from 'pdfmake/build/pdfmake';
import type { Content, TDocumentDefinitions } from 'pdfmake/build/pdfmake';
import type { Database } from '@/types/database';

// ── Image safety ─────────────────────────────────────────────────

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB per image
const MAX_TOTAL_IMAGE_BYTES = 40 * 1024 * 1024; // 40 MB total
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const IMAGE_FETCH_TIMEOUT = 5000; // 5 seconds per image

type ProjectRow = import('@/types').Project;

const imageCache = new Map<string, string>();
let totalImageBytes = 0;

function resetImageBytesCounter() {
  totalImageBytes = 0;
}

async function fetchImageBase64(url: string): Promise<string | null> {
  const cached = imageCache.get(url);
  if (cached) return cached;
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(IMAGE_FETCH_TIMEOUT),
      redirect: 'error', // 拒绝重定向（防止 SSRF 跳转绕过白名单）
    });
    if (!res.ok) return null;

    // 校验 Content-Type
    const ct = (res.headers.get('content-type') || '').toLowerCase();
    if (!ALLOWED_IMAGE_TYPES.some((t) => ct.startsWith(t))) {
      console.warn(`PDF 导出拒绝非图片响应: ${ct} from ${url}`);
      return null;
    }

    // 预检 Content-Length
    const contentLength = Number(res.headers.get('content-length') || 0);
    if (contentLength > MAX_IMAGE_BYTES) {
      console.warn(`PDF 导出图片过大(content-length): ${contentLength} bytes from ${url}`);
      return null;
    }

    const ab = await res.arrayBuffer();
    if (ab.byteLength > MAX_IMAGE_BYTES) {
      console.warn(`PDF 导出图片过大(actual): ${ab.byteLength} bytes from ${url}`);
      return null;
    }

    // 累计大小限制
    totalImageBytes += ab.byteLength;
    if (totalImageBytes > MAX_TOTAL_IMAGE_BYTES) {
      throw new Error('导出图片总大小超过限制');
    }

    const bytes = new Uint8Array(ab);
    const chunks: string[] = [];
    for (let i = 0; i < bytes.length; i += 8192) {
      chunks.push(String.fromCharCode(...bytes.slice(i, i + 8192)));
    }
    const ext = ct.includes('png') ? 'png' : ct.includes('webp') ? 'jpeg' : 'jpeg';
    const dataUrl = `data:image/${ext};base64,${btoa(chunks.join(''))}`;
    imageCache.set(url, dataUrl);
    return dataUrl;
  } catch (e: any) {
    if (e.message?.includes('总大小超过限制')) throw e; // 向上传播
    return null;
  }
}

// ── Font loading ─────────────────────────────────────────────────

let fontLoaded = false;

function ensureFont() {
  if (fontLoaded) return;
  try {
    const fontPath = join(process.cwd(), 'public', 'fonts', 'simhei.ttf');
    const buffer = readFileSync(fontPath);
    const b64 = buffer.toString('base64');

    // pdfmake 0.3.x uses addFontContainer (vfs + fonts together)
    pdfMake.addFontContainer({
      vfs: { 'simhei.ttf': b64 },
      fonts: {
        SimHei: { normal: 'simhei.ttf', bold: 'simhei.ttf', italics: 'simhei.ttf', bolditalics: 'simhei.ttf' },
      },
    });
  } catch (e) {
    console.warn('Chinese font load failed:', e);
  }
  fontLoaded = true;
}

// ── Design tokens ────────────────────────────────────────────────

const INK = '#0F172A';
const BODY = '#475569';
const MUTED = '#64748B';
const BORDER = '#E2E8F0';
const SURFACE = '#F8FAFC';
const INDIGO = '#6366F1';
const EMERALD = '#10B981';
const AMBER = '#F59E0B';
const ROSE = '#F43F5E';
const SLATE100 = '#F1F5F9';

const FONT = 'SimHei';
const BASE_FS = 10;
const LH = 1.35;

// ── Helpers ──────────────────────────────────────────────────────

function t(v: unknown): string {
  return String(v ?? '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
}

function clampText(text: string, maxLen = 300): string {
  const clean = t(text);
  if (!clean) return '暂无内容';
  if (clean.length <= maxLen) return clean;
  return clean.slice(0, maxLen) + '…';
}

function finiteNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function safeHex(value: unknown, fallback = '#CBD5E1'): string {
  const raw = t(value).replace('#', '');
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return `#${raw.toUpperCase()}`;
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    return `#${raw.split('').map((c) => c + c).join('').toUpperCase()}`;
  }
  return fallback;
}

function assertFinitePdfNumbers(node: unknown, path = 'docDefinition') {
  if (typeof node === 'number') {
    if (!Number.isFinite(node)) throw new Error(`PDF 导出数据包含无效数字: ${path}`);
    return;
  }
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    node.forEach((item, index) => assertFinitePdfNumbers(item, `${path}[${index}]`));
    return;
  }
  for (const [key, value] of Object.entries(node)) {
    if (typeof value !== 'function') assertFinitePdfNumbers(value, `${path}.${key}`);
  }
}


// ── Building blocks ──────────────────────────────────────────────

/** Section title + accent bar */
function sectionBlock(title: string, subtitle?: string): Content[] {
  const blocks: Content[] = [
    { text: t(title), style: 'sectionTitle', margin: [0, 0, 0, 6] },
    { canvas: [{ type: 'rect', x: 0, y: 0, w: 36, h: 1.5, r: 0.75, color: INDIGO }], margin: [0, 0, 0, subtitle ? 8 : 10] },
  ];
  if (subtitle) {
    blocks.push(
      { text: t(subtitle), style: 'subtitle', margin: [0, 0, 0, 12] },
    );
  }
  return blocks;
}

/** Card with left accent bar */
function card(label: string, body: string, accent = INDIGO): Content {
  const val = t(body);
  if (!val) return null;
  return {
    table: {
      widths: [2.5, '*'],
      body: [[
        { text: '', fillColor: accent, margin: [0, 0, 0, 0] } satisfies any,
        {
          stack: [
            { text: t(label), style: 'cardLabel' },
            { text: clampText(val, 400), style: 'cardBody', margin: [0, 3, 0, 0] },
          ],
          margin: [9, 7.5, 8, 7.5],
          fillColor: SURFACE,
        } satisfies any,
      ]],
    },
    layout: {
      defaultBorder: false,
      fillColor: () => SURFACE,
      hLineWidth: () => 1,
      vLineWidth: () => 0,
      hLineColor: () => BORDER,
    } as any,
    margin: [0, 0, 0, 8],
    unbreakable: true,
  };
}

/** Note card with round dot */
function noteCard(label: string, body: string, accent = INDIGO): Content {
  const val = t(body);
  if (!val) return null;
  return {
    table: {
      widths: [2.5, '*'],
      body: [[
        { text: '', fillColor: accent, margin: [0, 0, 0, 0] } satisfies any,
        {
          stack: [
            {
              columns: [
                { width: 4, canvas: [{ type: 'ellipse', x: 0, y: 0, w: 8, h: 8, r: 4, color: accent }] },
                { width: '*', text: t(label), style: 'cardLabel', margin: [0, 1.5, 0, 0] },
              ],
              columnGap: 5,
            },
            { text: val, style: 'cardBody', margin: [0, 5, 0, 0] },
          ],
          margin: [9, 7.5, 8, 7.5],
          fillColor: SURFACE,
        } satisfies any,
      ]],
    },
    layout: {
      defaultBorder: false,
      fillColor: () => SURFACE,
      hLineWidth: () => 1,
      vLineWidth: () => 0,
      hLineColor: () => BORDER,
    } as any,
    margin: [0, 0, 0, 8],
    unbreakable: true,
  };
}

/** Numbered bullet list */
function bulletList(items: string[]): Content {
  const clean = items.map(t).filter(Boolean);
  if (!clean.length) return null;
  return {
    ul: clean.map((item, i) => ({
      text: item,
      style: 'body',
      margin: [0, 0, 0, 4],
    })),
    margin: [0, 4, 0, 8],
  };
}

/** Label + custom content */
function labelBlock(label: string, child: unknown): Content {
  return {
    stack: [
      { text: t(label), style: 'label', margin: [0, 0, 0, 4] },
      child,
    ],
    margin: [0, 6, 0, 4],
  };
}

/** Persona section */
function personaSection(persona: any, index: number): Content {
  const name = t(persona.name) || `用户 ${index + 1}`;
  const age = t(persona.age);
  const occupation = t(persona.occupation);
  const meta = [age && `${age}岁`, occupation].filter(Boolean).join(' · ');
  const initials = name.slice(0, 2);
  const ACCENTS = [INDIGO, EMERALD, AMBER, ROSE, '#3B82F6', '#A855F7'];
  const accent = ACCENTS[index % ACCENTS.length]!;

  const pieces: Content = [
    // Avatar + name row
    {
      columns: [
        {
          width: 28,
          stack: [
            { canvas: [{ type: 'ellipse', x: 0, y: 0, w: 27, h: 27, r: 13.5, color: accent }] },
            { text: initials, style: 'personaInitials', alignment: 'center', margin: [0, -20, 0, 0] },
          ],
        },
        {
          width: '*',
          stack: [
            { text: name, style: 'personaName' },
            meta ? { text: meta, style: 'tiny', margin: [0, 1, 0, 0] } : null,
          ].filter(Boolean),
        },
      ],
      columnGap: 12,
      margin: [0, 0, 0, 14],
    },
  ];

  [
    ['需  求', persona.needs, INDIGO],
    ['痛  点', persona.pain_points, AMBER],
    ['场  景', persona.scenario, EMERALD],
  ].forEach(([l, v, c]) => {
    const n = noteCard(l as string, v as string, c as string);
    if (n) pieces.push(n);
  });

  return { stack: pieces, unbreakable: true, margin: [0, 0, 0, 16] };
}

/** Image grid (3 columns, equal width) */
function imageGrid(images: string[], capPrefix: string): Content {
  if (!images.length) return null;
  const rows: Content = [];
  const imgW = 155; // image width — columns auto-distribute

  for (let i = 0; i < Math.min(images.length, 9); i += 3) {
    const row = images.slice(i, i + 3);
    const cols: Content = row.map((url, ci) => ({
      width: '*',
      stack: [
        { image: url, width: imgW, height: imgW * 0.68, fit: [imgW, imgW * 0.68] },
        { text: `${capPrefix} ${i + ci + 1}`, style: 'caption', alignment: 'center', margin: [0, 3, 0, 0] },
      ],
    }));
    rows.push({ columns: cols, columnGap: 8, margin: [0, 0, 0, 14] });
  }
  return { stack: rows };
}

/** Storyboard grid (3 columns, equal width) */
function storyboardGrid(images: any[]): Content {
  if (!images.length) return null;
  const rows: Content = [];
  const imgW = 155;

  for (let i = 0; i < images.length; i += 3) {
    const row = images.slice(i, i + 3);
    const cols = row.map((img) => ({
      width: '*',
      stack: [
        { image: img.url, width: imgW, height: imgW * 0.58, fit: [imgW, imgW * 0.58] },
        { text: t(img.description), style: 'caption', alignment: 'center', margin: [0, 3, 0, 0] },
      ],
    }));
    rows.push({ columns: cols, columnGap: 8, margin: [0, 0, 0, 14] });
  }
  return { stack: rows };
}

/** CMF swatches */
function cmfSection(cmf: any): Content {
  const pieces: Content = [];

  const primaryHex = safeHex(cmf.primary_color_hex || '#000000');
  const secondaryHex = safeHex(cmf.secondary_color_hex || '#FFFFFF');

  // Two color swatches side by side
  pieces.push({
    columns: [
      swatchCard('主色', cmf.primary_color, primaryHex, 0),
      swatchCard('辅色', cmf.secondary_color, secondaryHex, 1),
    ],
    columnGap: 10,
    margin: [0, 0, 0, 10],
  });

  if (cmf.material) {
    const m = noteCard('材  料', cmf.material, EMERALD);
    if (m) pieces.push(m);
  }
  if (cmf.surface_treatment) {
    const st = noteCard('表面处理', cmf.surface_treatment, AMBER);
    if (st) pieces.push(st);
  }

  return { stack: pieces };
}

function swatchCard(label: string, name: string, hex: string, _idx: number): Content {
  return {
    table: {
      widths: [2.5, '*'],
      body: [[
        { text: '', fillColor: INDIGO, margin: [0, 0, 0, 0] } satisfies any,
        {
          stack: [
            { canvas: [{ type: 'rect', x: 0, y: 0, w: 52, h: 52, r: 5, color: hex }] },
            { text: `${label}：${t(name) || '未命名'}`, style: 'cardLabel', margin: [0, 8, 0, 0] },
            { text: hex, style: 'tiny', margin: [0, 2, 0, 0] },
          ],
          margin: [9, 7.5, 8, 7.5],
          fillColor: SURFACE,
        } satisfies any,
      ]],
    },
    layout: {
      defaultBorder: false,
      fillColor: () => SURFACE,
      hLineWidth: () => 1,
      vLineWidth: () => 0,
      hLineColor: () => BORDER,
    } as any,
    unbreakable: true,
  };
}

/** Hero image (exploded view) */
function heroImage(url: string): Content {
  return { image: url, width: 440, alignment: 'center', margin: [0, 10, 0, 0] };
}

// ── Cover page ──────────────────────────────────────────────────

function buildCover(title: string, tagline: string): Content {
  return {
    stack: [
      // Decorative circles
      {
        canvas: [
          { type: 'ellipse', x: 415, y: 20, w: 170, h: 170, r: 85, color: SLATE100 },
          { type: 'ellipse', x: 430, y: 38, w: 120, h: 120, r: 60, color: SURFACE },
        ],
        absolutePosition: { x: 0, y: 0 },
      },
      // Top brand
      { text: 'DESIGNFLOW AI', style: 'brandLabel', margin: [0, 140, 0, 0] },
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 493, y2: 0, lineWidth: 0.5, lineColor: BORDER }], margin: [0, 6, 0, 0] },
      // Title
      { text: t(title), style: 'coverTitle', margin: [0, 110, 0, 0] },
      // Tagline
      { text: t(tagline), style: 'coverSubtitle', margin: [0, 18, 0, 0] },
      // Accent bar
      { canvas: [{ type: 'rect', x: 0, y: 0, w: 60, h: 3, r: 1.5, color: INDIGO }], margin: [0, 28, 0, 0] },
      // Info block
      { text: '产品设计方案', style: 'coverDocType', margin: [0, 36, 0, 0] },
      { text: '背景研究 / 用户画像 / 外观设计 / CMF / 故事板 / 爆炸图', style: 'coverMeta', margin: [0, 8, 0, 0] },
      // Bottom line
      { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 493, y2: 0, lineWidth: 0.5, lineColor: BORDER }], margin: [0, 162, 0, 0] },
      { text: `生成时间：${new Date().toLocaleDateString('zh-CN')}`, style: 'coverDate' },
    ],
    pageBreak: 'after',
  };
}

// ── Table of Contents ───────────────────────────────────────────

function buildToc(entries: { num: string; name: string }[]): Content {
  return {
    stack: [
      ...sectionBlock('目  录', '报告内容结构'),
      ...entries.map((e) => ({
        columns: [
          {
            width: 26,
            stack: [
              { canvas: [{ type: 'rect', x: 0, y: 0, w: 22, h: 11, r: 3, color: INDIGO }], margin: [0, 2, 0, 0] },
              { text: e.num, style: 'tocNumber', alignment: 'center', margin: [0, -11, 4, 0] },
            ],
          },
          { width: '*', text: e.name, style: 'tocTitle', margin: [8, 0, 0, 0] },
        ],
        columnGap: 0,
        margin: [0, 0, 0, 4],
      })),
      ...entries.map(() =>
        ({ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 493, y2: 0, lineWidth: 0.3, lineColor: BORDER }], margin: [0, 0, 0, 6] })
      ),
    ],
    pageBreak: 'after',
  };
}

// ── Main generator ──────────────────────────────────────────────

export async function generatePDF(
  project: ProjectRow,
  includeSections?: Record<string, boolean>,
): Promise<Uint8Array> {
  ensureFont();
  resetImageBytesCounter();

  const intro = project.product_intro as any;
  const personas = ((project.personas as any[]) || []).filter(Boolean);
  const cmf = project.cmf as any;
  const appearanceImages = ((project.appearance_images as any[]) || []).filter((i: any) => i?.url);
  const storyboardImages = ((project.storyboard_images as any[]) || []).filter((i: any) => i?.url);

  const appearanceUrls: string[] = appearanceImages.map((i: any) => i.url || i).filter(Boolean);
  const title = t(intro?.name) || t(project.idea) || '设计方案';
  const tagline = t(intro?.tagline) || 'AI 产品设计方案';

  const include = includeSections ?? {
    background: true,
    product_intro: true,
    personas: true,
    appearance: true,
    cmf: true,
    storyboard: true,
    exploded_view: true,
  };

  // Build section list for TOC
  const sections: { num: string; name: string }[] = [];
  if (include.background && project.background) sections.push({ num: '01', name: '背景研究' });
  if (include.product_intro && intro) sections.push({ num: '02', name: '产品介绍' });
  if (include.personas && personas.length) sections.push({ num: '03', name: '用户画像' });
  if (include.appearance && appearanceImages.length) sections.push({ num: '04', name: '外观设计' });
  if (include.cmf && cmf) sections.push({ num: '05', name: 'CMF 方案' });
  if (include.storyboard && storyboardImages.length) sections.push({ num: '06', name: '故事板' });
  if (include.exploded_view && project.exploded_view_image?.url) sections.push({ num: '07', name: '爆炸图' });

  const content: Content = [
    buildCover(title, tagline),
    buildToc(sections),
  ];

  // 1. Background
  if (include.background && project.background) {
    content.push({
      stack: [
        ...sectionBlock('背景研究', '痛点、机会点与趋势分析'),
        card('研究内容', project.background, INDIGO),
      ],
      pageBreak: 'before',
    });
  }

  // 2. Product intro
  if (include.product_intro && intro) {
    const pieces: Content = [...sectionBlock('产品介绍', '产品定位、核心功能与使用场景')];
    if (intro.name) {
      const n = card('产品名称', intro.name || '未命名产品', INDIGO);
      if (n) pieces.push(n);
    }
    if (intro.tagline) {
      const tl = card('产品定位', intro.tagline, INDIGO);
      if (tl) pieces.push(tl);
    }
    if (intro.features?.length) {
      pieces.push({ text: '核心功能', style: 'label', margin: [0, 10, 0, 6] });
      const bl = bulletList(intro.features);
      if (bl) pieces.push(bl);
    }
    if (intro.scenario) {
      const sc = noteCard('使用场景', intro.scenario, EMERALD);
      if (sc) pieces.push(sc);
    }
    content.push({ stack: pieces, pageBreak: 'before' });
  }

  // 3. Personas
  if (include.personas && personas.length) {
    const pieces: Content = [
      ...sectionBlock('用户画像', '目标用户、核心需求与使用场景'),
      ...personas.map((p, i) => personaSection(p, i)),
    ];
    content.push({ stack: pieces, pageBreak: 'before' });
  }

  // 4. Appearance
  if (include.appearance && appearanceImages.length) {
    content.push({
      stack: [
        ...sectionBlock('外观设计', '产品效果图与形态探索'),
        imageGrid(appearanceUrls, '效果图'),
      ].filter(Boolean),
      pageBreak: 'before',
    });
  }

  // 5. CMF
  if (include.cmf && cmf) {
    content.push({
      stack: [...sectionBlock('CMF 方案', '色彩、材料与表面处理'), cmfSection(cmf)].filter(Boolean),
      pageBreak: 'before',
    });
  }

  // 6. Storyboard
  if (include.storyboard && storyboardImages.length) {
    content.push({
      stack: [
        ...sectionBlock('故事板', '产品使用流程与场景表达'),
        storyboardGrid(storyboardImages),
      ].filter(Boolean),
      pageBreak: 'before',
    });
  }

  // 7. Exploded view
  if (include.exploded_view && project.exploded_view_image?.url) {
    content.push({
      stack: [
        ...sectionBlock('爆炸图', '产品结构分解视图'),
        heroImage(project.exploded_view_image?.url || ''),
      ],
      pageBreak: 'before',
    });
  }

  const docDef: TDocumentDefinitions = {
    pageSize: 'A4',
    pageMargins: [50, 50, 50, 50], // ~18mm each side
    defaultStyle: { font: FONT, fontSize: BASE_FS, lineHeight: LH },
    content,
    styles: {
      coverTitle: { fontSize: 28, bold: true, color: INK, font: FONT, lineHeight: 1.15 },
      coverSubtitle: { fontSize: 12, color: MUTED, font: FONT },
      coverDocType: { fontSize: 10, bold: true, color: INK, font: FONT },
      coverMeta: { fontSize: 9, color: MUTED, font: FONT },
      coverDate: { fontSize: 9, color: MUTED, font: FONT, margin: [0, 6, 0, 0] },
      brandLabel: { fontSize: 9, bold: true, color: INDIGO, font: FONT },
      sectionTitle: { fontSize: 18, bold: true, color: INK, font: FONT },
      subtitle: { fontSize: 10, color: MUTED, font: FONT },
      label: { fontSize: 13, bold: true, color: INK, font: FONT },
      cardLabel: { fontSize: 10, bold: true, color: INK, font: FONT },
      cardBody: { fontSize: 10, color: BODY, font: FONT, lineHeight: 1.4 },
      body: { fontSize: 10, color: BODY, font: FONT, lineHeight: 1.4 },
      caption: { fontSize: 7.5, color: MUTED, font: FONT },
      tiny: { fontSize: 9, color: MUTED, font: FONT },
      tocNumber: { fontSize: 9.5, bold: true, color: '#FFFFFF', font: FONT },
      tocTitle: { fontSize: 11, bold: true, color: INK, font: FONT },
      personaInitials: { fontSize: 11, bold: true, color: '#FFFFFF', font: FONT },
      personaName: { fontSize: 12, bold: true, color: INK, font: FONT },
    },
    header: (currentPage: number, _pageCount: number, _pageSize: any) => {
      if (currentPage === 1) return null;
      return {
        stack: [
          {
            columns: [
              { text: 'DesignFlow AI', style: 'tiny', width: 'auto' },
              { text: '设计方案', style: 'tiny', width: '*', alignment: 'right' },
            ],
          },
          { canvas: [{ type: 'line' as const, x1: 0, y1: 0, x2: 493, y2: 0, lineWidth: 0.3, lineColor: BORDER }] },
        ],
        margin: [50, 30, 50, 0],
      };
    },
    footer: (currentPage: number, pageCount: number, _pageSize: any) => {
      if (pageCount <= 1 || currentPage === 1) return null; // no footer on cover
      return {
        columns: [
          { text: `${currentPage} / ${pageCount}`, style: 'caption', width: 'auto' },
          { text: 'Generated by DesignFlow AI', style: 'caption', width: '*', alignment: 'right' },
        ],
        margin: [50, 0, 50, 30],
      };
    },
    images: {} as Record<string, string>,
  };

  // Fetch all images and build URL→base64 map
  const imgMap: Record<string, string> = {};

  const urlsToFetch = [
    ...appearanceUrls,
    ...storyboardImages.map((img: any) => img.url),
    project.exploded_view_image?.url || '',
  ].filter((u): u is string => Boolean(u));

  await Promise.all(
    urlsToFetch.map(async (url) => {
      const b64 = await fetchImageBase64(url);
      if (b64) imgMap[url] = b64;
    }),
  );

  // Replace image URLs with base64 in the content
  function replaceImages(nodes: any): any {
    if (!nodes || typeof nodes !== 'object') return nodes;
    if (Array.isArray(nodes)) return nodes.map(replaceImages);
    if (nodes.image && typeof nodes.image === 'string' && imgMap[nodes.image]) {
      return { ...nodes, image: imgMap[nodes.image] };
    }
    const result: Record<string, any> = {};
    for (const [k, v] of Object.entries(nodes)) {
      result[k] = replaceImages(v);
    }
    return result;
  }
  const finalContent = replaceImages(content);

  const pdfInput = { ...docDef, content: finalContent };
  assertFinitePdfNumbers(pdfInput);
  const pdfDoc = pdfMake.createPdf(pdfInput);

  // pdfmake 0.3.x getBuffer() returns Promise<Buffer>, not callback-based
  const buffer = await pdfDoc.getBuffer();
  return new Uint8Array(buffer);
}
