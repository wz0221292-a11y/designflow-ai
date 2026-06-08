interface ImageRequest {
  type: 'appearance' | 'storyboard' | 'exploded_view';
  prompt: string;
  referenceImage?: string;
  slotIndex?: number;
  expectedTotal?: number;
}

interface ImageResponse {
  success: boolean;
  imageUrl?: string;
  error?: string;
}

export async function generateImage(request: ImageRequest): Promise<ImageResponse> {
  const apiToken = process.env.IMAGE_API_KEY;
  const apiEndpoint = process.env.IMAGE_API_ENDPOINT || 'https://img-cn.65535.space';

  if (!apiToken) {
    return { success: false, error: '图片生成 API 密钥未配置' };
  }

  try {
    const consistencyPrompt = request.referenceImage
      ? 'Strictly preserve the exact same product appearance, shape, proportions, colors, materials, details and design language from the reference image. Do not redesign the product.'
      : '';
    const enhancedPrompt = `${request.prompt}, ${consistencyPrompt}, product design, professional, high quality, detailed, 8k`;

    let response: Response;

    if (request.referenceImage) {
      const referenceResponse = await fetch(request.referenceImage, { signal: AbortSignal.timeout(15000) });
      if (!referenceResponse.ok) throw new Error('参考外观图下载失败');
      const referenceBlob = await referenceResponse.blob();
      const formData = new FormData();
      formData.append('image', referenceBlob, 'reference.png');
      formData.append('model', 'gpt-image-2');
      formData.append('prompt', enhancedPrompt);
      formData.append('size', '1024x1024');
      formData.append('response_format', 'url');

      response = await fetch(`${apiEndpoint}/v1/images/edits`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
        },
        body: formData,
      });
    } else {
      response = await fetch(`${apiEndpoint}/v1/images/generations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiToken}`,
        },
        body: JSON.stringify({
          model: 'gpt-image-2',
          prompt: enhancedPrompt,
          size: '1024x1024',
          quality: 'high',
          n: 1,
          response_format: 'url',
        }),
      });
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || errorData.message || `HTTP ${response.status}`;
      throw new Error(`API 请求失败: ${errorMessage}`);
    }

    const data = await response.json();

    if (!data.data || !Array.isArray(data.data) || data.data.length === 0) {
      throw new Error('API 响应中未包含图片数据');
    }

    const imageUrl = data.data[0].url;
    if (!imageUrl) {
      throw new Error('图片 URL 为空');
    }

    return { success: true, imageUrl };
  } catch (error: any) {
    console.error('图片生成错误:', error);
    return { success: false, error: error.message || '图片生成失败' };
  }
}
