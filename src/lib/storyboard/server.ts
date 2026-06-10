/**
 * 故事板服务端工具：prompt 构建 + context 拼接
 * 从 StoryboardStep.tsx 提取，供 /api/frame-regeneration 复用
 */
import type { ProductIntro } from '@/types';

export function buildStoryboardContext(
  productIntro?: ProductIntro | null,
  referenceImage?: string | null,
  selectedAppearanceIndex?: number | null,
): string {
  const parts = [
    productIntro?.name ? `产品名称：${productIntro.name}` : '',
    productIntro?.tagline ? `一句话定位：${productIntro.tagline}` : '',
    productIntro?.target_users ? `目标用户：${productIntro.target_users}` : '',
    productIntro?.problem ? `核心痛点：${productIntro.problem}` : '',
    productIntro?.features?.filter(Boolean).length
      ? `核心功能：${productIntro.features.filter(Boolean).join('；')}`
      : '',
    productIntro?.advantages ? `核心优势：${productIntro.advantages}` : '',
    productIntro?.scenario ? `典型使用场景：${productIntro.scenario}` : '',
    referenceImage
      ? `用户已选定第${(selectedAppearanceIndex ?? 0) + 1}张外观图作为唯一产品外观参考；凡是画面中出现产品，必须严格沿用该参考图的形体比例、轮廓、材质、颜色、结构细节和设计语言，不允许重新设计产品外观。`
      : '',
  ].filter(Boolean);
  return parts.join('\n');
}

export function buildBoundStoryboardPrompt(
  visualPrompt: string,
  description: string,
): string {
  return [
    `CRITICAL: The image must faithfully visualize this scene: "${description}"`,
    `Every element in the description must appear in the generated image. Do not contradict, omit, or replace any described detail.`,
    `CHARACTER CONSISTENCY: The same person must appear across all frames that include a human — identical facial features, hairstyle, clothing, body type, and accessories. No frame may change the character's appearance.`,
    `SCALE VERIFICATION before rendering: product size must be physically correct relative to human body parts. Verify hand-to-product ratio, body-to-product height, and realistic spatial placement. Common failures to avoid: phone-sized product appearing as large as a laptop, hand fingers thicker than product buttons, product floating without a support surface.`,
    `PHYSICS CHECK before rendering: gravity applies to all objects (no floating), materials behave realistically (metal reflects sharply with specular highlights, glass is transparent with refraction, plastic is semi-matte diffuse, fabric drapes and folds naturally), all contact points are believable (no hand penetration through product surfaces, no impossible joint angles, realistic weight feedback in muscle tension).`,
    visualPrompt,
    `When the product appears: match the selected reference product appearance exactly — same silhouette, proportions, materials, color palette, component layout, and design language. Do not redesign or reinterpret the product.`,
    `Photorealistic cinematic frame, 16:9 aspect ratio, no text, no logo, no watermark, no readable labels.`,
  ].join(' ');
}
