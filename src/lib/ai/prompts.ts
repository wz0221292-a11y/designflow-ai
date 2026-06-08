export const prompts = {
  background: (idea: string) => `
你是一位资深产品设计研究员。请根据以下产品想法，生成300字左右的市场背景分析。

产品想法: ${idea}

请分析以下内容:
1. 现有市场痛点和用户需求
2. 技术趋势和发展机会
3. 竞品分析和差异化机会

请直接输出分析文本,不要添加标题或额外格式。
`,

  productIntro: (idea: string) => `
根据以下产品想法,生成产品介绍信息。

产品想法: ${idea}

请输出以下JSON格式(不要添加markdown代码块标记):
{
  "name": "产品名称(简洁有创意)",
  "tagline": "一句话定位(10-20字)",
  "features": ["功能1", "功能2", "功能3", "功能4", "功能5"],
  "scenario": "典型使用场景描述(50-100字)"
}
`,

  personas: (idea: string) => `
根据以下产品想法,生成2-3个典型用户画像。

产品想法: ${idea}

请输出以下JSON数组格式(不要添加markdown代码块标记):
[
  {
    "name": "用户姓名",
    "age": 25,
    "occupation": "职业",
    "needs": "该用户的设计需求",
    "pain_points": "该用户的痛点",
    "scenario": "使用场景描述"
  }
]
`,

  cmf: (idea: string) => `
为以下产品推荐CMF(色彩、材料、表面处理)方案。

产品: ${idea}

请输出以下JSON格式(不要添加markdown代码块标记):
{
  "primary_color": "主色名称(如: 深空蓝)",
  "primary_color_hex": "#1E3A5F",
  "secondary_color": "辅色名称(如: 星空白)",
  "secondary_color_hex": "#F5F5F5",
  "material": "主要材料(如: ABS塑料、铝合金)",
  "surface_treatment": "表面处理(如: 磨砂、阳极氧化)"
}
`,
};