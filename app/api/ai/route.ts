import { NextRequest, NextResponse } from 'next/server';
import { generateContent } from '@/lib/ai/deepseek';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const result = await generateContent(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}