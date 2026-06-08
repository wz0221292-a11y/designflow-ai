import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();
    const apiToken = process.env.IMAGE_API_KEY;
    const apiEndpoint = process.env.IMAGE_API_ENDPOINT || 'https://img-cn.65535.space';

    if (!apiToken) {
      return NextResponse.json({ error: 'IMAGE_API_KEY not configured' }, { status: 500 });
    }

    const enhancedPrompt = `${prompt}, product design, professional, high quality, detailed, 8k`;

    // 使用 OpenAI 兼容的同步模式
    const response = await fetch(`${apiEndpoint}/v1/images/generations`, {
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

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || errorData.message || `HTTP ${response.status}`;
      return NextResponse.json(
        { error: `API request failed: ${errorMessage}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (!data.data || !Array.isArray(data.data) || data.data.length === 0) {
      return NextResponse.json(
        { error: 'No image data in response', rawResponse: data },
        { status: 500 }
      );
    }

    const imageUrl = data.data[0].url;
    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is empty', rawResponse: data },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, imageUrl, rawResponse: data });
  } catch (error: any) {
    console.error('Test image API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
