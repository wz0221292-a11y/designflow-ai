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
    title: '首页视觉全面增强：3D卡片倾斜 + 卫星标签 + 磁力场 + 迷你面板 + 实时状态动效',
    content: '1) 新增 hero-preview-card 3D 透视倾斜效果，鼠标移动驱动 rotateX/rotateY 变换 + 径向渐变动态高光跟踪光标位置。2) 卡片外围新增 3 颗 hero-satellite 浮动标签（AI/CMF/PDF），8s 独立轨道动画，悬停增强光晕。3) 新增 magnetic-field 装饰层：3 个同心圆环缩放旋转（14-20s 独立周期），低频高雅的深空氛围。4) 预览卡内新增 3 块 mini-panel 模块卡片（外观设计/CMF/故事板），悬停变色+上浮微交互。5) 生成中 badge 新增 live-status-pill 脉冲动画。6) 新增 heroPanels + liveSignals 动态数据驱动渲染。7) globals.css 新增 ~170 行动效样式，全部通过 prefers-reduced-motion 媒体查询关闭。8) README 新增首页动效系统章节，文档化全部动效层级与类名。',
    category: 'feature',
    version: 'v3.3.0',
  },
  {
    title: '故事板重整文字同步终极修复：regenerationId 版本控制 + pending 文本隔离 + 原子持久化',
    content: '1) StoryboardImage 新增 _regenerationId 字段，每次重整生成唯一 ID。2) regenerateFrameAndImage 触发时立即清空该帧 description/prompt，仅写 imagesRef 不触发 onUpdate（不入自动保存队列），防止刷新时空文本落库覆盖数据库。3) 新增 slotsWithPendingText (Set<number>) 状态标记等待新文案的槽位，UI 渲染 displayImages 覆盖 currentImages，pending 槽位显示空白 textarea + disabled 禁止编辑。4) prompt executor Phase 1 写回前校验 imagesRef 中 _regenerationId 是否匹配 task.clientRequestId，不匹配则返回空结果丢弃。5) Phase 2 flush 和 Phase 3 startImage 回调同样加版本校验 + 空结果跳过保护。6) textarea 新增 key={desc-${idx}-${slotRegenKey[idx]}} 强制 React 在新文本到达时卸载/重挂 DOM。7) image-slot PATCH 接口新增接受 description/prompt/storagePath 字段，请求体优先于 DB 旧值。8) imageTaskStore.startImageGeneration 返回值新增 storagePath，供前端写入图片槽位的同时携带恢复路径。',
    category: 'fix',
    version: 'v3.3.0',
  },
  {
    title: '故事板 AI 提示词系统全面升级：Pre-Production Bible 四重约束 + 产品-人体比例精确控制',
    content: '1) 完全重写 src/lib/ai/prompts.ts 中 storyboardPrompts，引入 Pre-Production Bible 架构：Character Bible（年龄/性别/身高/发型/服装/配饰/姿态）、Product Spec Sheet（尺寸 cm/重量级别/材质/结构特征/颜色）、Interaction Physics（姿态/接触点/视线/动作路径/支撑面/重量反馈/比例对照）、Environment Bible（地点/时段/光源方向/色调/场景连续性）。2) 6 帧结构每帧引用对应 Bible 约束，确保跨帧人物一致、产品比例准确、物理真实、环境连贯。3) buildBoundStoryboardPrompt 新增 CHARACTER CONSISTENCY、SCALE VERIFICATION、PHYSICS CHECK 三个强制性预渲染验证段落。4) description 最小长度从 10 提升至 15 字符，确保 AI 生成足够场景描述。5) deepseek.ts 同步更新校验阈值。',
    category: 'improvement',
    version: 'v3.2.0',
  },
  {
    title: '图片持久化全链路贯通：storagePath 端到端传递 + project_assets 资产登记 + URL 失效自动恢复',
    content: '1) 新建 src/lib/image/urlResolver.ts 工具模块，resolveImageUrl 优先使用 storagePath 重建 Supabase 公开 URL，getStorageUrl/getSignedStorageUrl 作为降级方案。2) persistGeneratedImage 返回值扩展为 { publicUrl, storagePath, fileSize }。3) POST /api/image 响应新增 storagePath 字段，同步写入 project_assets 表（含 storage_path、file_size、public_url）。4) image-slot PATCH 接口接受并持久化 storagePath。5) ProjectContext.generateStep 传递 storagePath 到 image-slot 请求。6) StoryboardImage 类型新增 storagePath 可选字段。7) <img onError> fallback 使用 resolveImageUrl(img.storagePath) 自动从 Supabase Storage 重建已失效的第三方临时 URL。8) supabase-setup.sql 新增 project_assets.file_size 列迁移。',
    category: 'feature',
    version: 'v3.2.0',
  },
  {
    title: '项目切换交叉污染全面修复：key 强制重挂 + async guard + ExplodedView/Appearance 异步保护',
    content: '1) app/dashboard/[projectId]/page.tsx 中 AppearanceStep/StoryboardStep/ExplodedViewStep 统一加 key={project.id}，切换项目时 React 强制卸载旧组件挂载新组件，彻底清除组件内部 state。2) StoryboardStep 新增 useEffect 监听 projectId 变化重置 promptGenStatus/aiFramePrompts/lastError。3) StoryboardStep executor 闭包中 projectId 改为局部 const pid 快照，async 回调内校验 task.projectId !== pid 立即 return。4) ExplodedViewStep 和 AppearanceStep 的 generateImage async 回调同样加 projectId 校验，不匹配时静默丢弃旧项目结果。5) ProjectContext 新增 MERGE_SILENT action 和 refreshProjectSilent 方法，后台刷新不影响 loading/dirty 状态，防止 loading 闪烁覆盖。',
    category: 'fix',
    version: 'v3.1.0',
  },
  {
    title: '重整想法竞态防护：regenerateIdRef 递增计数器 + 单槽位原子写入 image-slot',
    content: '1) ProjectContext 新增 regenerateIdRef = useRef(0)，每次 generateStep 调用 ++，异步回调写回前校验 requestId === regenerateIdRef.current，不匹配则丢弃。2) 图片生成步骤（3/5/6）改为逐槽位 fetch /api/image + PATCH /image-slot 原子写入，替代整个数组 PUT，防止三个槽位并行生成时后完成的图片覆盖先完成的。3) 故事板生成时每帧独立调用 image-slot 写入 url/storagePath/description/prompt，其他帧不受影响。4) 不再 await updateProject 整体覆盖，避免覆盖其他正在生成的图片。',
    category: 'fix',
    version: 'v3.1.0',
  },
  {
    title: '提示词任务模块级执行器：promptTaskStore 独立生命周期 + localStorage 持久化 + 刷新恢复',
    content: '1) 新建 src/lib/promptTaskStore.ts 核心模块：PromptTask 状态机 (running→completed/failed) + localStorage 持久化 + 订阅机制。2) createPromptClientRequestId 幂等 ID 生成 + hasActivePromptForSlot 槽位状态查询。3) 模块级 inflightPromptRuns Map 确保执行不绑定组件生命周期，切路由/卸载不中断。4) 三阶段 pipeline：generate(只有此阶段失败才影响 prompt status) → complete(one-way door) → flush(失败跳过生图) → startImage(失败不影响 completed)。5) getResumableRunningTasks 返回所有 unexpired running 任务，刷新页面后零延迟恢复。6) bumpResumeCount + MAX_RESUME_COUNT=3 防止死循环。7) StoryboardStep 通过 setPromptTaskExecutor 注入执行器，组件卸载时 clearPromptTaskExecutor 清理。8) useImageTaskStore 新增 syncFromStore 方法强制从 localStorage 同步 React state。',
    category: 'feature',
    version: 'v3.1.0',
  },
  {
    title: '管理员存储用量监控面板',
    content: '1) 新建 GET /api/admin/storage 接口，聚合 project_assets 表统计 totalBytes/totalFiles/byType 分类。2) topUsers TOP 20（join profiles 获取 email）和 topProjects TOP 20（join projects 获取名称）。3) app/admin/page.tsx 新增"存储用量"标签页：6 张汇总卡片（总量/已计量/未计量/按类型）、用量进度条（相对于 1GB 免费配额）、用户/项目 TOP 20 表格。4) formatBytes 工具函数支持 B/KB/MB/GB 自动选择最佳单位。',
    category: 'feature',
    version: 'v3.1.0',
  },
  {
    title: '外观设计/故事板/爆炸图异步回调统一防护：projectId 校验 + 静默丢弃旧项目结果',
    content: 'AppearanceStep 和 ExplodedViewStep 的 generateImage async 回调中新增 const pid = projectId 局部快照，fetch 完成后校验 projectId === pid，不匹配时 return 不调 onUpdate，防止切换项目后旧项目图片错误覆盖新项目槽位。StoryboardStep executor 回调同样加固。',
    category: 'fix',
    version: 'v3.0.2',
  },
  {
    title: '产品介绍页面全面优化：字符计数 + 填写状态可视化 + 7字段AI全覆盖',
    content: '1) 每个输入框新增字符计数进度条，接近上限变黄、超出变红。2) 已填写/未填写双视觉态：已填写彩色边框，未填写虚线灰底，一眼识别空字段。3) Header新增已填项数/总数badge。4) 核心功能编号从单一色改为8色彩虹循环。5) 每个字段独立彩色icon label提升辨识度。6) AI prompt已覆盖全部7字段（name/tagline/target_users/problem/features/advantages/scenario），空框均可AI自动填充。',
    category: 'improvement',
    version: 'v3.0.1',
  },
  {
    title: '修复AI重想故事按钮无效：stale closure导致直接return',
    content: 'generateAIPrompts使用useCallback依赖promptGenStatus，但点击时先setState再调函数，state未更新导致读到旧值done直接返回。修复：拆为generateAIPromptsCore(forceOverwrite)通过promptGenStatusRef读取状态；新增regenerateAIPrompts直接setState+调core；forceOverwrite参数控制重想时覆盖description；新增error状态重试按钮。',
    category: 'fix',
    version: 'v3.0.1',
  },
  {
    title: '修复无限重渲染Maximum update depth exceeded',
    content: 'useImageTaskStore中completedImages每帧都是新对象引用，三个组件的useEffect以completedImages为依赖，每次渲染都触发onUpdate→localUpdate→dispatch→重渲染形成死循环。修复：三组件各加lastCompletedRef，JSON.stringify比较内容，相同则跳过onUpdate。',
    category: 'fix',
    version: 'v3.0.1',
  },
  {
    title: '修复图片完成但UI仍显示生成中：同slot旧active任务遮住completed',
    content: 'reconcileRemoteJobs按三级匹配(clientRequestId→serverJobId→slot)覆盖而非新增；终态到达时closeOlderActiveTasksForSameSlot自动取消旧active任务；getCurrentTaskForSlot终端态优先级高于active；generatingSlots派生改为按slot取currentTask而非遍历所有任务。',
    category: 'fix',
    version: 'v3.0.1',
  },
  {
    title: '修复useSyncExternalStore导致生产页面崩溃：改用useState+subscribeToTasks',
    content: 'useSyncExternalStore在React 19+Next.js 16 Turbopack下触发客户端bundle初始化异常，页面完全无法加载。改用useState(() => initializeTaskStore())同步恢复+useEffect订阅store变更；reconcile后强制setTasks(initializeTaskStore())确保React state同步；generateImage成功后调syncFromStore即时刷新状态。',
    category: 'fix',
    version: 'v3.0.0',
  },
  {
    title: '生图系统工业级重构：任务状态机 + localStorage持久化 + 幂等 + 零延迟恢复',
    content: '1) 新建 imageTaskStore.ts 核心状态机（optimistic→queued→processing→completed/failed，严格单向推进禁止回退）。2) localStorage持久化ImageTaskStore，刷新页面同步恢复首屏零延迟显示生成中。3) useImageTaskStore React Hook通过useSyncExternalStore桥接store到组件。4) image_jobs表新增client_request_id唯一索引，POST /api/image支持幂等创建。5) AppearanceStep/StoryboardStep/ExplodedViewStep全部接入新系统，移除旧useImageJobs+localPendingRef+setInternalGeneratingSlots。6) 页面级pollJobs effect移除，轮询改由useImageTaskStore统一管理。7) 点击生成→0延迟显示生成中；切页面回来→立即显示生成中；刷新页面→首屏立即显示生成中；重复点击→不重复创建脏任务。',
    category: 'feature',
    version: 'v3.0.0',
  },
  {
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
    version: 'v3.1.0',
  },
  {
    title: '故事板单卡重生：重想故事融入每张卡片，先刷新提示词再生图',
    content: '移除全局「重想故事」按钮。每张故事板卡片已有图片时点击「重想故事再生图」：先调用 DeepSeek 重新生成该帧的中文描述和英文视觉提示词，写入卡片 textarea 和 prompt，再用新提示词生成对应图片。空卡片点「生成分镜」直接用已有提示词生图不受影响。新增 promptingSlots 状态跟踪每张卡片的故事重整进度。',
    category: 'improvement',
    version: 'v3.1.0',
  },
  {
    title: '故事板提示词深度优化：产品介绍绑定 + 外观参考 + 连贯性 + 比例合理性',
    content: '1) 故事板生成时传入完整产品介绍上下文（名称/定位/目标用户/痛点/功能/优势/场景），DeepSeek 必须基于此生成而非仅凭产品名称。2) 已选外观约束：产品在画面中出现必须严格沿用参考图形体/颜色/材质/设计语言。3) 6帧可视圣经：强制同一用户/产品外观/环境/影调/摄影语言贯穿，像同一支短片。4) 比例物理约束：生成前确定产品与人体尺寸/接触点/支撑面/受力，禁止比例错误、悬浮、穿模、不合理交互。5) description 字段从 sceneTitle 升级为至少10字完整中文描述，visualPrompt 必须忠实复述 description 画面。6) 外观提示词统一加白底/无logo/无文字/无水印/大师级渲染。',
    category: 'improvement',
    version: 'v3.1.0',
  },
  {
    title: '保存系统全面加固：自动保存 + 离开前保存 + 故事板文字防丢',
    content: '1) 新增防抖自动保存：用户停止输入2秒后自动将所有待保存字段写入数据库。2) beforeunload + visibilitychange 事件：刷新/关闭/切后台时用 fetch+keepalive 强制落库。3) saveCurrentStep 增强：先刷新待保存内容再完整保存当前步骤。4) goToStep/nextStep/handleSkipStep 全部在切步骤前先刷保存。5) 故事板 AI 生成描述后立即调用 flushPendingSave 不等2秒窗口期。6) completedImages 合并时严格保留 description 和 prompt 不覆盖。7) StoryboardStep 新增 onFlushSave 回调，重想故事再生图时保证文字先落库再执行图片生成。',
    category: 'improvement',
    version: 'v3.2.0',
  },
  {
    title: '故事板生图动画重构：空卡片 + 已有图片两种状态视觉全面升级',
    content: '1) 空卡片生成中：14x14大号渐变spinner+脉冲光环+ping扩散+文字"AI 正在绘制第N帧"+副标题"XX标签·预计20-60秒"+底部扫描进度条+暖色背景渐变+卡片脉冲边框。2) 已有图片重新生成：图片模糊+遮罩+居中大号spinner+"正在重新生成…"+"第N帧·XX标签"。3) 重整故事阶段：单独提示"重整故事…"+"AI 重写分镜描述"。4) 外观设计和爆炸图同步升级为统一动画风格（青色系/玫红系）。5) globals.css 新增 progress-bar-sweep 关键帧动画。',
    category: 'improvement',
    version: 'v3.2.0',
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
