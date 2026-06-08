import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    // 使用 Pollinations.ai 作为默认图片生成服务（免费）
    const seed = Math.floor(Math.random() * 1000000);
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&seed=${seed}&model=flux&nologo=true`;

    // 验证图片是否可以访问
    const response = await fetch(imageUrl, { method: 'HEAD' });
    if (!response.ok) {
      return NextResponse.json(
        { error: `图片生成失败: ${response.status} ${response.statusText}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, imageUrl });
  } catch (error: any) {
    console.error('Pollinations error:', error);
    return NextResponse.json(
      { error: error.message || '图片生成失败' },
      { status: 500 }
    );
  }
}
