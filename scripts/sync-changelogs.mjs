/**
 * 批量写入更新日志到 Supabase
 * 用法: node scripts/sync-changelogs.mjs
 * 需要 .env.local 中有 SUPABASE_SERVICE_ROLE_KEY
 */
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env.local');

// 解析 .env.local
const envRaw = readFileSync(envPath, 'utf-8');
const env = {};
for (const line of envRaw.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx < 0) continue;
  env[trimmed.slice(0, eqIdx)] = trimmed.slice(eqIdx + 1).replace(/^["']|["']$/g, '');
}

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

const CHANGELOGS = [  {
    title: '生图状态防抖终极加固：localPendingRef 本地锁',
    content: 'AppearanceStep/StoryboardStep/ExplodedViewStep 各新增 localPendingRef：用户点击生成时设锁，轮询合并时本地锁保护的 slot 永远不会被清除。只有服务端确认 completed（完成图到达）或 failed（显式失败）或 catch error 时才释放锁。确保任何源（空轮询/旧数据/竞态）都无法清掉用户刚发起的生成中状态。',
    category: 'fix',
    version: 'v2.6.2',
  },
  {
    title: '修复 useImageJobs 轮询覆盖导致生图状态闪烁回退',
    content: '1) useImageJobs 从 setInterval 改为 setTimeout 链式轮询，inFlightRef 防并发请求互相覆盖。2) 首次轮询延迟 800ms，给 job 创建留 DB 写入窗口。3) 页面隐藏降频到 6s，切回立即刷新。4) AppearanceStep/StoryboardStep/ExplodedViewStep 的 onJobsLoaded 从直接 setXxxState(slots) 替换覆盖改为合并式更新：服务端确认才设为生成中，完成图到达才清除，服务端未返回某 slot 时保持本地状态不变。彻底消除服务端短暂缺 job 时 UI 生图状态被清空的问题。',
    category: 'fix',
    version: 'v2.6.1',
  },
  {
    title: '故事板AI智能提示词系统：产品专属逻辑链 + DeepSeek驱动',
    content: '1) 新增 POST /api/storyboard-prompts 端点，调用DeepSeek根据产品理念生成6帧故事板视觉提示词。2) AI按产品逻辑链生成：问题环境→痛点特写→产品登场→人机交互→改变发生→满意结局。3) deepseek.ts新增generateStoryboardPrompts()，prompts.ts新增storyboardPrompts模板。4) StoryboardStep首次进入自动触发AI生成，visualPrompt存入storyboard_images[].prompt持久化。5) 优先AI定制提示词，失败回退fallback模板。6) 步骤头部新增AI构思状态和重想故事按钮。',
    version: 'v2.6.0',
  },
  {
    title: '图片生成提示词全面优化：故事板场景交互 + 外观差异化 + 爆炸图技术细节',
    content: '1) 故事板6帧全部改为英文cinematic visual prompt，每帧包含shot type/composition/lighting/mood/human-product interaction细节。新增frameVisualPrompts模板系统和buildStoryboardPrompt构建函数。2) 外观设计3个variation改为明确差异化方向：hero studio shot / lifestyle context / detail material study。3) 爆炸图prompt升级为10层技术描述（组件层级/ghost lines/材质区分/等距视角等）。4) replicate.ts移除冗余generic后缀，prompt已自含完整风格描述。5) AI文本prompt同步升级：productIntro新增target_users/problem/advantages字段，CMF新增材质分部件+触觉体验要求。',
    category: 'improvement',
    version: 'v2.5.1',
  },

  {
    title: '安全加固 v2.5：profiles RLS 收紧 + admin 模型统一 + 支付回调补偿',
    content: '1) 客户端 MEMBERSHIP_ENABLED 从 !==false 改为 ===true 显式语义。2) profiles 表撤销 authenticated 的 UPDATE 权限，敏感字段只能由 service role 修改。3) 删除 supabase-setup 中基于 profiles.is_admin 的管理员 RLS 策略，管理员写操作统一走服务端。4) 拆分 supabaseAdmin 到 @/lib/auth/admin 独立模块。5) 测试页 /test-image-api 生产环境 404。6) 支付回调超时订单改为 paid_late 标记，管理后台可人工补开。7) 支付金额校验改为分整数比较。8) 浏览器 Supabase 客户端增加环境变量缺失显式报错。9) getActivePlan 增加类型安全和非法日期防御。',
    category: 'improvement',
    version: 'v2.5.0',
  },
  {
    title: '支付订单超时自动关闭',
    content: '创建订单时写入 expires_at（15 分钟有效）。超过有效期的 pending 订单自动标记为 closed。支付回调校验金额一致性，已关闭/已过期订单不再激活会员。新增用户订单查询接口 GET /api/payments/orders。会员页面新增支付记录表格。',
    category: 'feature',
    version: 'v1.2.0',
  },
  {
    title: '管理员用户管理面板',
    content: '新增 GET/PATCH /api/admin/users 接口。管理员可搜索用户、查看项目数/订单摘要/最近支付时间。支持手动调整会员套餐、到期时间、清空图片用量。操作自动记录到更新日志。',
    category: 'feature',
    version: 'v1.2.0',
  },
  {
    title: '服务端安全加固',
    content: '项目创建从客户端 Supabase 迁移到 POST /api/projects 服务端接口，会员项目数量限制在 API 层强制校验。项目更新 PUT 接口新增字段白名单，拒绝任意字段写入。保留身份仅来自 session、管理员仅来自 ADMIN_EMAILS 的安全原则。',
    category: 'improvement',
    version: 'v1.2.0',
  },
  {
    title: '公告展示逻辑修复',
    content: '公开公告接口新增 published_at <= now() 过滤防止定时发布提前显示。未读判断改为按「公告 ID + 日期」而非仅日期。公告独立于项目列表加载，避免弹窗迟到。关闭/我知道了按钮同步标记已读。',
    category: 'fix',
    version: 'v1.2.0',
  },
  {
    title: '图片与导出稳定性改进',
    content: '仪表板封面图新增 onError 回退到占位符。PPT 导出新增图片缺失占位符（虚线框 + 文字提示）。PDF 导出新增正文截断保护（400 字符上限 + 省略号）。导出图片域名白名单新增 65535.space。',
    category: 'improvement',
    version: 'v1.2.0',
  },
  {
    title: '更新日志系统上线',
    content: '新增 changelogs 数据库表、公开读取接口 GET /api/changelogs 和管理员 CRUD 接口。管理员后台全面重构为 Tab 导航布局，新增更新日志管理区（时间线展示、分类标签、版本号）。用户管理从表格改为卡片布局。',
    category: 'feature',
    version: 'v1.2.0',
  },
  {
    title: '更新日志面板优化',
    content: '创建面板改为按钮触发，默认隐藏，点击「新增日志」后展开。提交或取消后自动收起。时间线样式升级：竖线贯穿、操作按钮 hover 显示、圆点带背景光环。',
    category: 'improvement',
    version: 'v1.2.1',
  },
  {
    title: '公告面板排版统一优化',
    content: '公告管理页改为与更新日志一致的布局：创建面板默认隐藏，点击「发布公告」后展开；提交或取消后自动收起。公告列表改为通栏卡片，操作按钮 hover 显示。',
    category: 'improvement',
    version: 'v1.2.2',
  },
  {
    title: '用户管理界面优化',
    content: '新增顶部统计条（总用户/会员/今日新增/总收入）。新增筛选标签（全部/会员/非会员）。用户卡片改为紧凑型布局，会员状态用绿色标识。卡片内联显示项目数、订单数、收入、剩余天数。点击「详情」展开完整面板：到期时间、最近支付、快捷会员按钮、清空用量。操作按钮和下拉框在非展开态始终可见。',
    category: 'improvement',
    version: 'v1.3.0',
  },
  {
    title: '图片持久化存储修复',
    content: '图片生成后自动从临时 CDN 下载并转存到 Supabase Storage，用持久 URL 替换临时 URL。解决 image.65535.space 约 24 小时自动清理导致图片全部丢失的问题。新增 src/lib/image/storage.ts 持久化模块。',
    category: 'fix',
    version: 'v1.3.1',
  },
  {
    title: '图片资产安全体系重构',
    content: '1. 新增 persistGeneratedImage() 函数，生成后立即下载并上传到 Supabase Storage（bucket: generated-images），含类型/大小校验，数据库只存永久 URL。\n2. 新增 project_assets 独立资产表，精确追踪每张图片的用户、项目、步骤、槽位、存储路径、来源、状态。\n3. 导出 PDF/PPT 新增第三方 URL 拦截——image.65535.space 的临时 URL 会被拒绝，提示重新生成。\n4. 收紧 profiles RLS 更新策略，禁止用户通过 RLS 修改 is_admin/membership_plan/expires_at/image_usage 敏感字段。\n5. 新增 npm run images:migrate 抢救脚本（扫描→下载→上传存储→替换URL）和 npm run images:health 健康检查脚本。',
    category: 'feature',
    version: 'v2.0.0',
  },
  {
    title: '管理员健康检查面板',
    content: '新增 /api/admin/health 接口和管理员「健康检查」标签页。显示每个项目的图片总数、第三方临时 URL 数、已失效数、可迁移数。支持一键扫描，危险项目标红提示。',
    category: 'feature',
    version: 'v2.0.1',
  },
  {
    title: '健康检查面板升级：风险分级 + 一键修复',
    content: '重写健康检查 UI，按严重/警告/健康三级风险排序。每个第三方 URL 旁新增「修复」按钮，单击即下载上传。顶部新增「一键全部修复」按钮，批量处理所有风险项目。已404 图片标红提示手动重新生成。后端新增 POST /api/admin/health 单槽修复接口。',
    category: 'feature',
    version: 'v2.1.0',
  },
  {
    title: '健康检查数字逻辑与 UI 重构',
    content: '后端重构 /api/admin/health GET 接口：新增 summary 全局汇总（图片总数/安全存储/第三方URL/已失效/待修复），每张第三方图片独立检测标记 alive/dead/unchecked，检测上限提升至 30 张。前端重写健康检查卡片：顶部 5 个指标卡全部改为图片级统计并附说明文字，项目卡片新增比例条可视化（安全/在线/失效/未检），每个第三方 URL 旁显示状态标签（在线/失效/未检），只有确认在线才显示修复按钮。',
    category: 'improvement',
    version: 'v2.1.1',
  },
  {
    title: '修复 PersonaStep 非数组数据崩溃',
    content: '修复数据库 JSONB 字段返回 {} 空对象时，PersonaStep 组件 (personas || []).filter 报错问题。添加 Array.isArray 防护层 safePersonas，兼容非数组输入。同步加固 AppearanceStep images 字段。',
    category: 'fix',
    version: 'v2.1.2',
  },
  {
    title: '生图轮询逻辑重构：静默同步，不再整页刷新',
    content: '核心改动：1) 轮询完成不再调用 fetchProject() 导致整页 loading 闪烁，改为 mergeImagesSilent 只合并图片字段到 project state。2) ProjectContext 新增 MERGE_SILENT action + refreshProjectSilent() 静默刷新方法 + mergeImagesSilent() 图片合并方法。3) 轮询 useEffect 新增 visibilitychange 监听，切回页面立即 poll 不等待 1.5s。4) 新增 polling 防重入锁，避免多个 timer 同时跑。5) 按钮状态统一使用 effectiveImageGenerating = localGenerating || dbJobRunning，切走页面回来 jobs 表驱动按钮立即恢复生成中状态。6) 错误重试按钮 window.location.reload() 改为 fetchProject() 避免全页刷新。',
    category: 'improvement',
    version: 'v2.2.0',
  },
  {
    title: '项目删除联动清理存储图片',
    content: 'DELETE /api/projects/:id 重构：删除项目前依次清理 Supabase Storage 文件（generated-images bucket 下 userId/projectId/ 目录递归列出并分批删除）、project_assets 表记录、image_jobs 表记录，再删除项目行。dashboard 页面删除改用 API 路由（之前直接用 Supabase 客户端删，跳过服务端清理），确认文案提示图片将被永久删除。',
    category: 'fix',
    version: 'v2.2.1',
  },
  {
    title: '管理员数据概览卡片重新分组',
    content: '修正 statGroups 逻辑错配：公告数从收入组移除并入「内容」组，更新日志从用户组移除并入「系统」组。重新划分为 4 组 8 卡：收入（总收入/付费订单）、用户（用户总数/会员）、内容（项目/公告）、系统（更新日志/图片任务）。每张卡片的副指标与主指标语义一致。',
    category: 'improvement',
    version: 'v2.2.2',
  },
  {
    title: '图片步骤组件去重轮询：统一用 useImageJobs 定时同步',
    content: '移除 AppearanceStep / StoryboardStep / ExplodedViewStep 中独立的 per-slot setInterval pollJob 轮询逻辑（pollTimersRef / addPollTimer / removePollTimer / 单 job 查询 / fallback job ID 查找）。改为统一使用 useImageJobs 每 2s 轮询 /api/image/jobs 来同步 slot 级生成状态，页面级 polling 每 1.5s 负责图片 URL 静默合并。组件 generateImage 同步返回时直接更新，异步时交由两层轮询处理。彻底消除切页面回来生成状态丢失问题。',
    category: 'improvement',
    version: 'v2.3.0',
  },
  {
    title: 'P0/P1 安全审计修复：支付回调顺序、故事板判断、session 刷新',
    content: '1) 支付回调重构：先 activateMembership 再标记 paid（防止中间坏状态），新增 pid 商户号校验，新增 provider_trade_no 唯一性去重。2) hasStepContent 故事板判断从 image.url||image.description 改为要求 6 张全部有 url。3) 确认 proxy.ts 已处理 session 自动刷新（之前误以为缺少 middleware）。4) 确认 profiles RLS 已收紧 WITH CHECK 禁止修改敏感字段。',
    category: 'fix',
    version: 'v2.3.1',
  },
  {
    title: '公告弹窗 UI 全面重设计',
    content: '重写公告弹窗：1) 顶部渐变 Hero 区域（indigo→violet→fuchsia）配装饰圆形+喇叭 emoji，标题/日期白色层级清晰。2) 内容区独立分段，行距加宽。3) 历史公告改为折叠式 details/summary 交互，圆点+箭头指示，展开显示正文。4) 底部按钮组左「今日不再提示」右「我知道了」主次分明。5) 导航栏按钮加喇叭 SVG 图标，未读红点改为带数字的脉冲 badge。6) 整体入场动画 fade-in + fade-up。',
    category: 'improvement',
    version: 'v2.3.2',
  },
  {
    title: '公告正文字体优化 + 更新日志导出功能',
    content: '1) 公告弹窗正文从 text-sm text-slate-600 改为 text-[15px] text-slate-800 font-medium，更粗更深更易读。2) 管理员更新日志标签页新增「导出」按钮，点击下载为 Markdown 文件（含标题/分类/版本/日期/正文），也支持 JSON 格式。文件名 changelogs-YYYY-MM-DD.md。',
    category: 'improvement',
    version: 'v2.3.3',
  },
  {
    title: '修复创建项目后跳到错误步骤的 bug',
    content: 'ProjectContext SET_PROJECT reducer 在切换项目时错误保留了旧项目的 currentStep。修复：比较 project.id，同项目刷新保持当前步骤，切换到不同项目则使用新项目的步骤（来自 localStorage 或 DB current_step 字段）。新创建的项目 current_step 默认为 0，用户始终从第一步开始。',
    category: 'fix',
    version: 'v2.3.4',
  },
  {
    title: '修复故事板生图状态不稳定：useImageJobs 增加 completedImages 回传',
    content: 'useImageJobs 回调签名从 (generatingSlots, jobIds) 升级为 (generatingSlots, completedImages)。每 2s 轮询时同时返回已完成图片的 URL (slotIndex→imageUrl)，组件立即合并到本地 images，不再依赖页面级 polling 异步传递。消除 job 完成后 slot 短暂空白（状态已清除但图片未到）的竞态。生成 async job 后 500ms 立即 refreshJobs，不等 2s 周期。AppearanceStep / ExplodedViewStep 同步升级。',
    category: 'fix',
    version: 'v2.3.5',
  },
  {
    title: '产品介绍页面 UI 重设计',
    content: '核心功能卡片：表头从灰底改为 emerald-teal 渐变横幅（含装饰图形+功能计数 badge），功能项改为彩色编号圆点（8色循环）+ 白色卡片 hover 抬升阴影，空态新增引导性 emerald 实心按钮。使用场景卡片：表头改为 rose-pink 渐变横幅，正文区新增 emoji pill 提示（用户是谁/问题/解决方案），textarea 加玫瑰色边框+hover 环，底部字符计数。',
    category: 'improvement',
    version: 'v2.3.6',
  },
  {
    title: '产品介绍 + CMF 全面重构：更多字段 + 全新 UI',
    content: 'ProductIntro 新增 target_users（目标用户）、problem（核心问题）、advantages（核心优势）三个字段。UI 完全重写：顶部改为产品名称+一句话定位双卡片横排，中段为目标用户+核心问题双卡片，核心功能列表精简为单列 emerald 编号样式，底部为核心优势+使用场景双卡片。CMF 类型统一默认值模式，色彩方案卡片精简（主色/辅色各含色块预览+hex badge+名称+取色器），材质/表面处理改为 textarea 多行输入。',
    category: 'improvement',
    version: 'v2.4.0',
  },
];

async function main() {
  // 去重：清除同标题的旧记录，避免重复写入
  for (const entry of CHANGELOGS) {
    const { data: existing } = await supabase
      .from('changelogs')
      .select('id')
      .eq('title', entry.title)
      .limit(1);

    if (existing && existing.length > 0) {
      console.log(`⏭️  跳过已存在: ${entry.title}`);
      continue;
    }

    const { data, error } = await supabase
      .from('changelogs')
      .insert(entry)
      .select()
      .single();

    if (error) {
      console.error(`❌ 写入失败: ${entry.title}`, error.message);
    } else {
      console.log(`✅ 已写入: ${entry.title}`);
    }
  }
  console.log('完成');
}

main().catch(console.error);
