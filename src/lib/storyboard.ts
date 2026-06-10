import type { StoryboardImage } from '@/types';

export const STORYBOARD_FRAME_COUNT = 6;

export function createEmptyStoryboardImage(): StoryboardImage {
  return { url: '', description: '', prompt: '', storagePath: '' };
}

export function normalizeStoryboardImages(images: unknown, length = STORYBOARD_FRAME_COUNT): StoryboardImage[] {
  const source = Array.isArray(images) ? images : [];
  return Array.from({ length }, (_, index) => {
    const item = source[index] as Partial<StoryboardImage> | null | undefined;
    return {
      url: typeof item?.url === 'string' ? item.url : '',
      description: typeof item?.description === 'string' ? item.description : '',
      prompt: typeof item?.prompt === 'string' ? item.prompt : '',
      storagePath: typeof item?.storagePath === 'string' ? item.storagePath : '',
    };
  });
}

export function mergeStoryboardSlot(
  currentSlot: unknown,
  patch: Partial<StoryboardImage>,
): StoryboardImage {
  const current = normalizeStoryboardImages([currentSlot], 1)[0];
  return {
    url: patch.url ?? current.url,
    description: patch.description ?? current.description,
    prompt: patch.prompt ?? current.prompt,
    storagePath: patch.storagePath ?? current.storagePath,
  };
}
