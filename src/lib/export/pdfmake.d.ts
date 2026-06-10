/* eslint-disable @typescript-eslint/no-explicit-any */

declare module 'pdfmake/build/pdfmake' {

  // ── Fonts ──────────────────────────────────────────────────

  export interface TFontFamily {
    normal?: string;
    bold?: string;
    italics?: string;
    bolditalics?: string;
  }

  export interface TVFS {
    [filename: string]: string;
  }

  export interface CSize { width: number; height: number }

  // ── Canvas elements ─────────────────────────────────────────

  export interface CanvasRect {
    type: 'rect';
    x: number;
    y: number;
    w: number;
    h: number;
    r?: number;
    color?: string;
    lineWidth?: number;
    lineColor?: string;
  }

  export interface CanvasEllipse {
    type: 'ellipse';
    x: number;
    y: number;
    w: number;
    h: number;
    r?: number;
    color?: string;
    lineWidth?: number;
    lineColor?: string;
  }

  export interface CanvasLine {
    type: 'line';
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    lineWidth?: number;
    lineColor?: string;
  }

  export type CanvasElement = CanvasRect | CanvasEllipse | CanvasLine;

  // ── Content nodes ───────────────────────────────────────────

  interface ContentBase {
    style?: string | string[];
    margin?: [number, number, number, number] | [number, number] | number;
    absolutePosition?: { x: number; y: number };
    relativePosition?: { x: number; y: number };
    pageBreak?: 'before' | 'after';
    unbreakable?: boolean;
    alignment?: 'left' | 'center' | 'right' | 'justify';
    fillColor?: string;
    fillOpacity?: number;
    width?: number | 'auto' | '*';
    lineHeight?: number;
    headlineLevel?: number;
  }

  export interface ContentText extends ContentBase {
    text: string | (ContentText | string)[];
    fontSize?: number;
    font?: string;
    bold?: boolean;
    italics?: boolean;
    color?: string;
    decoration?: 'underline' | 'lineThrough' | 'overline';
    decorationStyle?: 'solid' | 'dashed' | 'dotted' | 'double' | 'wavy';
    background?: string;
    link?: string;
    linkToPage?: number;
    preserveLeadingSpaces?: boolean;
    preserveTrailingSpaces?: boolean;
  }

  export interface ContentColumns extends ContentBase {
    columns: Content[];
    columnGap?: number;
  }

  export interface ContentStack extends ContentBase {
    stack: Content[];
  }

  export interface ContentTable extends ContentBase {
    table: {
      widths: (number | '*' | 'auto')[];
      body: Content[][];
      headerRows?: number;
      dontBreakRows?: boolean;
    };
    layout?: any;
  }

  export interface ContentImage extends ContentBase {
    image: string;
    height?: number;
    fit?: [number, number];
    cover?: { width: number; height: number };
  }

  export interface ContentCanvas extends ContentBase {
    canvas: CanvasElement[];
  }

  export interface ContentUl extends ContentBase {
    ul: Content[];
    type?: 'square' | 'circle' | 'none';
    markerColor?: string;
  }

  export interface ContentOl extends ContentBase {
    ol: Content[];
    type?: 'lower-alpha' | 'upper-alpha' | 'decimal' | 'none';
    separator?: string | [string, string];
    start?: number;
  }

  export interface ContentQr extends ContentBase {
    qr: string;
    foreground?: string;
    fit?: number;
    version?: number;
    eccLevel?: 'L' | 'M' | 'Q' | 'H';
    mode?: 'numeric' | 'alphanumeric' | 'octet';
    mask?: number;
  }

  export type Content =
    | ContentText
    | ContentColumns
    | ContentStack
    | ContentTable
    | ContentImage
    | ContentCanvas
    | ContentUl
    | ContentOl
    | ContentQr
    | Record<string, any>
    | null
    | false
    | undefined;

  // ── Document ────────────────────────────────────────────────

  export interface Style {
    fontSize?: number;
    font?: string;
    bold?: boolean;
    italics?: boolean;
    color?: string;
    alignment?: 'left' | 'center' | 'right' | 'justify';
    lineHeight?: number;
    margin?: [number, number, number, number] | [number, number] | number;
    fillColor?: string;
    background?: string;
    decoration?: string;
    decorationStyle?: string;
  }

  export type PageFn<T = Content | null> = (
    currentPage: number,
    pageCount: number,
    pageSize: CSize,
  ) => T;

  export interface TDocumentDefinitions {
    pageSize?: string | { width: number; height: number };
    pageOrientation?: 'portrait' | 'landscape';
    pageMargins?: [number, number, number, number] | number;
    defaultStyle?: { font?: string; fontSize?: number; lineHeight?: number; color?: string };
    content: Content;
    styles?: Record<string, Style>;
    images?: Record<string, string>;
    header?: PageFn | Content;
    footer?: PageFn | Content;
    background?: PageFn | Content;
    compress?: boolean;
    info?: { title?: string; author?: string; subject?: string; keywords?: string };
    waterMark?: Content;
    pageBreakBefore?: (currentNode: Content, followingNodesOnPage: Content[], nodesOnNextPage: Content[], previousNodesOnPage: Content[]) => boolean;
  }

  export interface TCreatedPdf {
    getBuffer(): Promise<Buffer>;
    getBase64(): Promise<string>;
    getDataUrl(): Promise<string>;
    getBlob(): Promise<Blob>;
    download(defaultFileName?: string): void;
    open(options?: Record<string, unknown>, win?: Window | null): void;
    print(options?: Record<string, unknown>, win?: Window | null): void;
  }

  export interface FontContainer {
    vfs: TVFS;
    fonts: Record<string, TFontFamily>;
  }

  export interface PdfMake {
    createPdf(docDefinition: TDocumentDefinitions, options?: Record<string, unknown>): TCreatedPdf;
    vfs?: TVFS;
    fonts?: Record<string, TFontFamily>;
    addFonts(fonts: Record<string, TFontFamily>): void;
    setFonts(fonts: Record<string, TFontFamily>): void;
    addFontContainer(container: FontContainer): void;
    addVirtualFileSystem(vfs: TVFS): void;
  }

  const pdfMake: PdfMake;
  export default pdfMake;
}
