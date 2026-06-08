import { prompts } from './prompts';

interface AIRequest {
  step: string;
  idea: string;
  existingData?: any;
}

interface AIResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export async function generateContent(request: AIRequest): Promise<AIResponse> {
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    return { success: false, error: 'API key not configured' };
  }

  try {
    let promptText = '';

    switch (request.step) {
      case 'background':
        promptText = prompts.background(request.idea);
        break;
      case 'product_intro':
        promptText = prompts.productIntro(request.idea);
        break;
      case 'personas':
        promptText = prompts.personas(request.idea);
        break;
      case 'cmf':
        promptText = prompts.cmf(request.idea);
        break;
      case 'appearance':
      case 'storyboard':
      case 'exploded_view':
        return {
          success: false,
          error: 'Image generation should use the image API',
        };
      default:
        return { success: false, error: 'Unknown step' };
    }

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: '你是一位专业的产品设计顾问,擅长产品研究、用户分析和设计策略。请用中文回答。',
          },
          {
            role: 'user',
            content: promptText,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'AI generation failed');
    }

    const data = await response.json();
    let content = data.choices[0]?.message?.content || '';

    // Try to parse as JSON if the step requires structured data
    if (['product_intro', 'personas', 'cmf'].includes(request.step)) {
      try {
        // Remove potential markdown code block markers
        content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        const parsed = JSON.parse(content);
        return { success: true, data: parsed };
      } catch {
        // If parsing fails, return raw content
        return { success: true, data: content };
      }
    }

    return { success: true, data: content };
  } catch (error: any) {
    console.error('AI generation error:', error);
    return { success: false, error: error.message || 'AI generation failed' };
  }
}