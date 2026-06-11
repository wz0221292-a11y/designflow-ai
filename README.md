# DesignFlow AI — 完整使用与部署指南

> AI 产品设计流程引擎：从创意到设计方案书，7 步生成完整工业设计文档，支持导出 PPT 和 PDF。

**线上版**：[www.design-flow-ai.cloud](https://www.design-flow-ai.cloud) **当前版本**：v3.3.1

---

## 目录

- [产品概述](#产品概述)
- [快速开始](#快速开始)
- [7 步设计流程](#7-步设计流程)
- [图片生成系统](#图片生成系统)
- [故事板 AI 提示词系统](#故事板-ai-提示词系统)
- [项目导出](#项目导出)
- [公告系统](#公告系统)
- [管理员后台](#管理员后台)
- [会员与支付](#会员与支付)
- [设计系统](#设计系统)
- [安全模型](#安全模型)
- [本地开发](#本地开发)
- [部署上线](#部署上线)
- [环境变量完整清单](#环境变量完整清单)
- [数据库迁移](#数据库迁移)
- [API 接口清单](#api-接口清单)
- [项目结构](#项目结构)
- [技术栈](#技术栈)
- [数据模型](#数据模型)
- [常见问题](#常见问题)

---

## 产品概述

DesignFlow AI 是一款面向产品设计教育和工作场景的 AI 驱动设计工具。输入一个产品想法（如"智能宠物喂食器"），系统自动引导你完成从市场研究到方案交付的完整设计流程。

### 核心能力

| 能力 | 说明 |
|------|------|
| **AI 文本生成** | DeepSeek API 驱动，自动生成市场分析、产品介绍、用户画像、CMF 方案、故事板分镜提示词 |
| **AI 图片生成** | 支持外观设计图（3张）、故事板（6帧）、爆炸图（1张）三类视觉输出，支持参考图保持一致性 |
| **7 步引导流程** | 从背景研究到爆炸图，每步 AI 生成后可编辑修改 |
| **图片状态机持久化** | 工业级任务状态机 + localStorage 零延迟恢复，刷新/切页面不丢生成状态 |
| **PPT 导出** | 使用 PptxGenJS 生成专业演示文稿（.pptx） |
| **PDF 导出** | 使用 pdfmake 生成设计展板（.pdf），支持中文 |
| **会员系统** | 5 档套餐，支持支付宝在线支付自动开通 |
| **公告系统** | 全站公告弹窗，进入项目列表自动弹出，支持"今日不再提示" |
| **管理员后台** | 数据统计面板 + 公告发布 + 更新日志管理 + 用户管理 + 图片健康检查 |
| **支付系统** | 易付通在线支付，15分钟超时自动关闭，晚到支付 `paid_late` 补偿 |
| **服务端安全** | 项目数量/导出/图片生成服务端强制校验，PUT 字段白名单，profiles RLS 收紧 |
| **更新日志系统** | 全站公开 changelog，管理员可发布/编辑/导出 Markdown |

### 适用场景

- **设计专业学生**：课程作业、毕业设计、作品集
- **产品设计从业者**：方案提案、概念验证、设计归档
- **设计教育机构**：教学演示、学生作品管理

---

## 快速开始

### 用户端

1. 打开 [www.design-flow-ai.cloud](https://www.design-flow-ai.cloud)
2. 点击「注册」填写姓名、邮箱、密码（≥6 位）
3. 登录后进入项目仪表板
4. 点击「新建项目」，输入产品想法描述
5. 按 7 个步骤依次完成设计流程
6. 完成后导出 PPT 或 PDF

### 开发端

```bash
git clone <repository-url>
cd designflow-ai
npm install
cp .env.example .env.local
# 编辑 .env.local 填入必需的 API Key
npm run dev
# 访问 http://localhost:3000
```

---

## 7 步设计流程

进入项目后按顺序完成 7 个步骤（+ 导出页），每步 AI 自动生成内容，生成后可手动编辑。

### 步骤 1：背景研究（BackgroundStep）

**AI 生成内容**：市场痛点分析、技术趋势、竞品分析（约 300 字）

- 首次进入自动触发 AI 生成
- 生成后可自由编辑文本
- 为后续步骤提供市场上下文

### 步骤 2：产品介绍（ProductIntroStep）

**AI 生成内容**：完整产品介绍，覆盖 7 个字段

| 字段 | 约束 | 说明 |
|------|------|------|
| 产品名称 | 最长 12 字 | 简洁有创意的产品名称 |
| 一句话定位 | 最长 30 字 | 核心价值主张 |
| 目标用户 | 最长 120 字 | 典型用户画像、年龄段、职业特征 |
| 核心痛点 | 最长 120 字 | 产品要解决的具体问题 |
| 核心功能 | 最多 8 项 | 产品核心能力列表，8色彩虹编号 |
| 核心优势 | 最长 150 字 | 与竞品的差异化优势 |
| 使用场景 | 最长 200 字 | 谁在什么情况下如何使用？完整流程 |

- 每个输入框有实时字符计数进度条（接近上限变黄、超出变红）
- 已填写/未填写双视觉态：已填写彩色边框，未填写虚线灰底
- Header 显示已填项数 / 7 饼图 badge
- 核心功能支持添加/删除/编辑，8色彩虹循环编号
- AI 自动填充所有空字段

### 步骤 3：用户画像（PersonaStep）

**AI 生成内容**：2-3 个典型用户画像

每个画像包含：
- 姓名、年龄、职业
- 设计需求（蓝色标签）
- 用户痛点（琥珀色标签）
- 使用场景（绿色标签）

### 步骤 4：外观设计（AppearanceStep）

**AI 生成内容**：3 张产品外观效果图

- 并行生成 3 张效果图，三种差异化方向：
  1. **Hero Shot**：纯白背景棚拍，3/4 前视角，干净构图
  2. **Full View**：纯白背景俯拍，产品居中留白，高级目录风
  3. **Detail Study**：纯白背景微距特写，强调材质和工艺细节
- 外观提示词统一限定：
  - **纯白背景**（pure white background）
  - **无 logo**（no logo）
  - **无文字/排版**（no text, no typography）
  - **无水印**（no watermark）
  - **大师级渲染**（master-level rendering）
  - **博物馆级工业设计可视化**（museum-grade industrial design visualization）
- 图片任务状态机 + localStorage 持久化：刷新页面同步恢复生成状态
- 选择一张作为主方案（影响故事板、爆炸图的参考图），选后切换为单列大图展示
- 已生成的图片可以重新生成替换
- 生成中动画：大号渐变 spinner + 脉冲光环 + ping 扩散 + 进度条 + 脉冲边框，和故事板统一风格
- 选定外观存入 DB `selected_appearance_index`，跨步骤持久化

### 步骤 5：CMF 方案（CMFStep）

**AI 生成内容**：主色 + 辅色（含色值）、主要材料、表面处理方案

- 主色卡片：大色块预览 + HEX 色值 badge + 颜色名称 + 取色器
- 辅色卡片：同上
- 材质输入：多行文本框，注明各部件对应材料
- 表面处理：多行文本框，注明对应工艺效果
- AI 生成时综合考虑使用场景、审美偏好、人手接触区域

### 步骤 6：故事板（StoryboardStep）

**AI 生成内容**：6 帧分镜描述 + 6 张故事板图片

提示词采用 6 帧叙事结构，强制保持连贯性与一致性：
1. **问题环境**：展示产品要解决的问题场景（远景，产品未出现）
2. **痛点特写**：人类面对问题的具体困难（近景特写，情绪张力）
3. **产品登场**：产品作为解决方案出现（中景，产品外观清晰）
4. **人机交互**：关键使用瞬间（特写，手部动作 + 产品互动）
5. **改变发生**：产品产生效果后的场景（对比第1帧）
6. **满意结局**：安静、有力量的收束画面（产品自然融入）

详细见下方 [故事板 AI 提示词系统](#故事板-ai-提示词系统) 章节。

**交互逻辑**：
- 首次进入自动调用 DeepSeek 生成全部 6 帧分镜描述和视觉提示词
- 空卡片点「生成分镜」直接用已有提示词生成图片
- 已有图片的卡片点「**重想故事再生图**」：创建服务端 `frame_regeneration_jobs` 任务并立即返回；前端立刻进入「重整故事」镜像状态，服务端完成新描述和新 prompt 后再进入真实 `generating_image` 生图状态，最终将新文字 + 新图片 + `generationId` 一次性写回故事板槽位
- 重生成期间隐藏 textarea 旧内容，完成后新文字和新图片一起出现；已生成的图文槽位带 `generationId` 锁，防止旧任务或普通补图结果覆盖
- 顶部「一键生成全部」/「补全 N 个」

### 步骤 7：爆炸图（ExplodedViewStep）

**AI 生成内容**：1 张产品结构分解图

- 10 层技术描述提示词：组件层级 → ghost lines → 材质区分 → 等距视角 → 无文字标签
- 展示部件关系和技术拆解
- 基于选定的外观方案生成，保持视觉一致性
- 生成中动画：大号渐变 spinner + 脉冲光环 + ping 扩散 + 进度条（玫红/橙色系）
- 附带 5 个部件标注输入框（1-5 编号），导出 PPT 时显示在爆炸图旁

### 步骤 8：导出（ExportPanel）

- 勾选需要包含的章节
- 选择 PPT 或 PDF 格式
- 导出期间阻止离开页面，防止状态丢失
- 使用用户选中的外观图作为封面和内容插图

### 操作按钮

每个步骤底部对齐的操作栏：

| 按钮 | 功能 | 样式 |
|------|------|------|
| ← 上一步 | 返回上一页（第 1 步不显示） | 白色底 + 灰色边框 |
| 重新生成 | 强制重新生成当前步骤的 AI 文本 | 白色底 + 灰色边框 |
| 跳过此部分 | 跳过当前步骤（导出时不包含） | 白色底 + 灰色边框 |
| 满意，下一步 → | 保存并进入下一步 | 蓝色实心按钮 |

> 图片生成步骤（4/5/6）中，未选中外观/无图片时不可跳过。

---

## 图片生成系统

### 任务状态机架构

生图系统基于工业级任务状态机，确保状态在任何情况下都可靠持久化：

```
optimistic(0) → queued(1) → processing(2) → completed(3)/failed(3)
                    ↘ cancelled(3)
```

**核心特性**：

| 特性 | 实现 |
|------|------|
| **严格单向推进** | rank 比较，禁止状态回退（optimistic=0 < queued=1 < processing=2 < terminal=3） |
| **localStorage 持久化** | 所有任务写入 `image-task-store:v1` key，刷新/切页面零延迟恢复 |
| **镜像级同步** | `useState(() => initializeTaskStore())` 首帧同步读取，无闪烁 |
| **三级远程匹配** | `clientRequestId` → `serverJobId` → `projectId+step+slotIndex` |
| **幂等创建** | 相同 `clientRequestId` 不会创建重复任务，image_jobs 表 UNIQUE 索引保护 |
| **终端优先** | 同 slot 同时存在 active + terminal 时，terminal 胜出 |
| **自动清理** | 新终端到达时自动 cancel 旧 active 任务 |
| **slot 级状态隔离** | generatingSlots/completedImages 按 slot 派生，互不干扰 |

### useImageTaskStore Hook

组件通过 `useImageTaskStore({ projectId, step })` 获取：

| 返回值 | 类型 | 说明 |
|--------|------|------|
| `generatingSlots` | `Record<number, boolean>` | 哪些槽位正在生成 |
| `completedImages` | `Record<number, string>` | 已完成图片的 URL（按 slot 索引） |
| `startGeneration(input)` | `async () => { imageUrl?, storagePath?, job? }` | 开始生成图片，写入 optimistic 任务 |
| `syncFromStore()` | `() => void` | 生成立即同步到 React state |
| `refresh()` | `() => void` | 从 localStorage 重新加载（reconcile 后强制刷新） |

**组件使用模式**（AppearanceStep / StoryboardStep / ExplodedViewStep 均一致）：
1. `generatingSlots[idx]` 控制 UI 生成中动画
2. `completedImages` useEffect 监听完成，写入 project state
3. `lastCompletedRef` + `JSON.stringify` 比较防止无限重渲染
4. 切换步骤/刷新页面不丢失状态

### 图片 ID 与存储

- 生成时通过 `POST /api/image` 传入 `clientRequestId`（格式：`image:{projectId}:{step}:{slotIndex}:{timestamp}`）
- 服务端创建后返回 `jobId` + `clientRequestId`
- 图片持久化到 Supabase Storage `generated-images` bucket
- `/api/image` 返回 `imageUrl + storagePath`，`storagePath` 是断链恢复的稳定来源
- `project_assets` 表追踪每张图片的存储路径、来源、状态
- 管理员健康检查面板可检测第三方临时 URL 并一键修复

---

## 故事板 AI 提示词系统

### 提示词生成架构

故事板是 7 步流程中最复杂的 AI 步骤，其提示词生成涉及多层约束：

```
用户产品想法 + 产品介绍(7字段) + 已选外观参考约束
  ↓
POST /api/storyboard-prompts (DeepSeek API)
  ↓
6 帧分镜 JSON { sceneTitle, description, shotType, visualPrompt }
  ↓
buildBoundStoryboardPrompt(visualPrompt, description)
  注入：比例物理约束 + 连贯性约束 + 外观匹配约束 + no text/logo/watermark
  ↓
最终生图提示词（英文，120-180 words）
  ↓
POST /api/image → gpt-image-2
```

### 提示词的多层约束

**第一层：AI 级别（DeepSeek prompt）**

| 约束 | 说明 |
|------|------|
| 产品介绍绑定 | 必须结合目标用户、核心痛点、核心功能、优势、典型使用场景生成 |
| 外观一致性 | 产品出现时必须严格匹配用户选中的外观图形体/颜色/材质/结构 |
| 6帧统一视觉圣经 | 同一用户、产品外观、环境、色彩基调、光线方向、摄影风格 |
| 比例合理性 | 生成前确定产品与人体尺寸关系、接触点、支撑面、受力 |
| description 字段 | 中文，至少 10 个汉字，具体写出画面中发生了什么 |

**第二层：生图级别（visualPrompt 构建）**

| 约束 | 说明 |
|------|------|
| 描述绑定 | visualPrompt 必须忠实复述 description 画面 |
| 物理校验 | 阻止比例错误、悬浮错位、手部穿模、不合理交互 |
| 连贯性 | 6帧像同一支短片的连续镜头 |
| 外观锁定 | "match the selected reference product appearance exactly" |
| 无文字 | no text, no logo, no watermark, no readable labels |
| 16:9 电影画幅 | photorealistic, cinematic, 16:9 aspect ratio |

### 中文描述的"硬绑定"机制

每帧的 `description`（用户可见的中文故事描述）和 `visualPrompt`（发送给图片 API 的英文提示词）之间建立了硬约束：

1. AI 首先生成 `description`（画面叙事）和 `visualPrompt`（视觉指令）
2. `buildBoundStoryboardPrompt` 把 `description` 前置为 `CRITICAL: The image must faithfully visualize this scene`
3. 要求图片模型忠实呈现中文描述里的画面核心，不允许遗漏或替换关键元素
4. 用户手动编辑 textarea 后，普通保存走 2 秒防抖；点「重想故事再生图」会创建服务端重生成 job，job 按 `generating_prompt → generating_image → completed` 推进，并在完成前隐藏旧文字
5. 服务端提交时重新读取最新 `storyboard_images`，只替换当前槽位，并带上 `generationId` 锁；完成后前端刷新项目，新文字和新图片一起显示

### 分镜卡片布局

每张故事板卡片的组成：
- 顶部细色条（6色区分帧位）
- 图片区（aspect-video，16:9）
- 左下帧序号（1-6）+ 帧标签（问题环境/痛点特写/...）
- 右下「重想故事再生图」按钮（已有图片时）
- 底部 textarea（显示中文故事描述，可编辑）

---

## 自动保存系统

所有文字编辑操作受到多层保存保护，确保数据不因刷新而丢失：

| 层级 | 触发时机 | 说明 |
|------|---------|------|
| **防抖自动保存** | 停止输入 2 秒后 | 所有待保存字段合并为一次请求写入数据库 |
| **步骤切换保存** | 下一步/上一步/跳步骤 | 先刷新全部待保存内容，再完整保存当前步骤字段 |
| **跳过步骤保存** | 点击「跳过此部分」 | 先保存当前步骤文字再跳过 |
| **页面离开保存** | 刷新/关闭/切后台 | `beforeunload` + `visibilitychange` 双事件用 `fetch + keepalive` 强制落库 |
| **AI 生成后立即保存** | AI 文本/故事描述生成完成 | 不等 2 秒防抖，直接调用 `flushPendingSave` 写库 |
| **生图前保存** | 「重想故事再生图」等操作 | 先确保文字落库，再执行长时间图片生成 |

### 故事板文字防丢机制

故事板的文字（中文描述 + 英文 prompt）最容易因生成流程复杂而丢失，额外保护：

- AI 生成 6 帧描述后立即 `flushPendingSave` 写库
- 单卡「重想故事再生图」通过 `/api/frame-regeneration` 创建服务端 job，前端 localStorage 只作为镜像恢复状态，刷新/切页后继续轮询服务端真相
- 服务端 job 先生成 `description + prompt`，再进入 `generating_image` 调用图片生成；`generating_image` 状态只在真实生图开始后写入
- `src/lib/storyboard.ts` 统一维护 `normalizeStoryboardImages` / `mergeStoryboardSlot`，前后端共享同一 JSONB 槽位合并规则
- `completedImages` 合并完成图时严格保留已有 `description` 和 `prompt`，有 `generationId + url + description` 的槽位不接受旧任务覆盖
- 用户手动编辑 textarea 走正常 2 秒防抖自动保存；已锁定的生成槽位不会被普通输入或旧 prompt 批量生成覆盖

---

## 项目导出

### PPT 导出（.pptx）

使用 PptxGenJS 生成，包含：
- 封面页（项目标题 + 日期）
- 目录页
- 各章节内容幻灯片（段落标题页 + 内容卡片）
- 产品效果图、故事板图片
- CMF 色板展示
- 图片缺失占位符（虚线框 + 文字提示）

### PDF 导出（.pdf）

使用 pdfmake 生成，包含：
- 封面（大标题 + 副标题 + 装饰线）
- 目录（已完成/未完成状态区分）
- 各章节（段落标题 + 内容卡片 + 左侧强调条）
- 图片网格（统一间距 + 圆角）
- 页眉页脚（品牌名 + 章节名 + 页码）
- 正文截断保护（400 字符上限 + 省略号）

### 导出安全

- 图片 URL 域名白名单（拒绝第三方临时 URL）
- Content-Type 校验（仅允许 image/jpeg、image/png、image/webp）
- 大小限制：单图 ≤8MB，总量 ≤40MB
- 超时 5s，拒绝重定向
- 图片缺失不崩溃，使用占位符

### 字体支持

中文渲染依赖 `public/fonts/simhei.ttf`。部署前确保该文件存在，否则中文会显示为方块。

---

## 公告系统

### 用户端体验

- 进入项目列表自动弹出最新公告对话框
- 顶部渐变 Hero 区域（indigo→violet→fuchsia）
- 可向下滚动查看历史公告（折叠式 details/summary 交互）
- **「关闭」**：关闭弹窗，下次进入仍显示
- **「今日不再提示」**：当天不再弹出当前最新公告
- **「我知道了」**：关闭弹窗
- 导航栏按钮未读红点带数字 pulse badge

### 技术实现

- 公告按 `published_at DESC` 倒序排列
- "今日不再提示"使用 `localStorage`，键名：`{最新公告ID}:{当天日期}`
- 公开读取接口 `GET /api/announcements`（无需登录，anon key）
- 公告表不存在时静默降级为空数组，不报错
- 仅返回 `is_published = true` 且 `published_at <= now()` 的公告

---

## 管理员后台

### 如何成为管理员

**推荐方式**：Vercel 环境变量设置 `ADMIN_EMAILS`：

```
ADMIN_EMAILS=your-email@example.com,another-admin@example.com
```

支持多个邮箱，英文逗号分隔，重新部署生效。

> 不再支持通过数据库 `profiles.is_admin` 字段提权。管理员身份仅从 `ADMIN_EMAILS` 环境变量判断。

### 管理员后台功能

访问 [https://www.design-flow-ai.cloud/admin](https://www.design-flow-ai.cloud/admin)

#### Tab 1：数据统计

4 组 8 个核心指标卡片：

| 分组 | 卡片 |
|------|------|
| 收入 | 总收入 + 付费订单数 |
| 用户 | 用户总数 + 当前会员数 |
| 内容 | 项目总数 + 公告数 |
| 系统 | 更新日志数 + 图片任务数 |

#### Tab 2：公告管理

- 创建面板默认隐藏，点击「发布公告」展开
- 列表通栏卡片展示，操作按钮 hover 显示
- 提交或取消后自动收起

#### Tab 3：更新日志管理

- 时间线展示，分类标签（feature/fix/improvement/other）
- 版本号标注
- 支持导出为 Markdown 或 JSON 文件

#### Tab 4：用户管理

- 顶部统计条（总用户/会员/今日新增/总收入）
- 筛选标签（全部/会员/非会员）
- 用户卡片紧凑布局，点击「详情」展开完整面板
- 支持手动调整会员套餐、到期时间、清空图片用量
- 所有操作自动记录到系统日志

#### Tab 5：图片健康检查

- 全局汇总：图片总数 / 安全存储 / 第三方URL / 已失效 / 待修复
- 每个项目卡片显示比例条（安全/在线/失效/未检）
- 单个修复 + 一键全部修复
- 已404图片标红提示手动重新生成

### 安全机制

- 所有管理员 API 服务端校验 `requireAdmin()`
- 管理员身份**仅从 `ADMIN_EMAILS` 环境变量判断**
- 非管理员访问返回 403

---

## 会员与支付

### 会员套餐

| 套餐 | 价格 | 时长 | 图片生成 | 项目上限 | 生成队列 | 模板库 |
|------|------|------|---------|---------|---------|--------|
| 一天会员 | ¥5 | 1 天 | 5 次/阶段 | 10 个 | 普通队列 | 基础模板 |
| 一周会员 | ¥15 | 7 天 | 5 次/阶段 | 10 个 | 优先队列 | 高级模板 |
| 一月会员 | ¥30 | 30 天 | 不限次数 | 20 个 | 优先队列 | 高级模板 |
| 半年会员 | ¥100 | 180 天 | 不限次数 | 20 个 | 优先队列 | 全部模板 |
| 一年会员 | ¥250 | 365 天 | 不限次数 | 20 个 | 优先队列 | 全部模板 |

> 未开通会员也能预览全部 AI 生成内容，但图片生成次数、项目数量和导出功能受限。当前仅支持**支付宝**支付。

### 会员控制开关

| 变量 | 作用域 | 说明 |
|------|--------|------|
| `MEMBERSHIP_ENABLED` | **服务端** | 唯一决定 API 是否强制会员限制 |
| `NEXT_PUBLIC_MEMBERSHIP_ENABLED` | **客户端** | 仅控制 UI 显示/隐藏 |

> 上线收费模式必须**同时**设置为 `true`。

### 支付流程（易付通 YFT）

```
用户点击「开通套餐」→ 创建支付订单（DB，含 expires_at 15分钟）→ 调用易付通下单 API
→ 返回支付宝支付链接 → 浏览器跳转支付宝收银台
→ 用户完成支付 → 易付通 GET/POST 回调 notify 接口
→ 服务端验证签名 + 金额校验（分整数比较）→ 更新订单为 paid → 激活会员
```

### 订单超时与晚到支付补偿

- 下单时写入 `expires_at`，默认 **15 分钟**有效
- 超过 `expires_at` 的 `pending` 订单自动标记为 `closed`
- 已过期但用户完成真实支付 → 标记 `paid_late`，不自动激活会员
- 管理员后台可查看 `paid_late` 订单并手动补开会员

### 易付通配置

| 变量 | 说明 |
|------|------|
| `YFT_MERCHANT_ID` | 商户号 |
| `YFT_SECRET_KEY` | 签名密钥 |
| `YFT_API_URL` | 下单接口 URL |
| `YFT_NOTIFY_URL` | 异步回调地址 |
| `YFT_RETURN_URL` | 支付完成跳转地址 |

### 回调安全

1. 验证 MD5 签名（忽略 sign 和 sign_type 字段）
2. 检查 `trade_status === 'TRADE_SUCCESS'`
3. 防重复处理：已支付/已逾期待审核直接返回 success
4. 金额校验：统一转为分（整数）比较，拒绝浮点误差
5. 订单已过期/已关闭但支付成功 → `paid_late`，完整记录 payload
6. 从数据库订单获取 `user_id` 和 `plan`（绝不信任回调参数）
7. 先激活会员，成功后再标记支付完成（防止中间坏状态）
8. 返回纯文本 `success`（非 JSON）

---

## 设计系统

### 双表面策略

| 表面 | 类名 | 用途 | 风格 |
|------|------|------|------|
| 品牌页 | `df-page` | 首页、登录、注册 | 深色品牌调性 |
| 工作台 | `df-workspace` | 项目列表、步骤页、会员页、管理后台 | 浅色产品工作区 |

### CSS 变量（品牌页）

```css
--df-bg: #020617;           /* 页面背景 */
--df-surface: rgba(15, 23, 42, 0.6);  /* 卡片背景 */
--df-ink: #f8fafc;          /* 主文字 */
--df-body: #94a3b8;         /* 正文 */
--df-muted: #64748b;        /* 辅助文字 */
--df-primary: #3b82f6;      /* 主色 */
--df-accent: #818cf8;       /* 强调色 */
```

### 共享组件类

工作台页面通过 `StepHeader` 导出的共享 class 保持一致性：

```tsx
stepSubCardClass       // 白色卡片 + 圆角 + 边框 + 阴影
stepInputClass         // 白色输入框 + 蓝色聚焦环
stepPrimaryButtonClass // 蓝色主按钮（全圆角）
stepSecondaryButtonClass // 白色次按钮（灰色边框）
```

### 配色色阶

| 色相 | 用途 |
|------|------|
| Blue (#3b82f6) | 主操作色、步骤导航 |
| Indigo (#6366f1) | 推荐套餐、强调、故事板 AI 状态 |
| Emerald (#10b981) | 当前套餐、成功状态、核心功能 |
| Amber (#f59e0b) | 用户痛点标签、故事板框架 |
| Rose (#f43f5e) | 使用场景标签、爆炸图框架 |
| Violet (#8b5cf6) | 用户画像框架 |
| Cyan (#06b6d4) | 外观设计框架 |
| Slate | 中性灰阶（边框、辅助文字、表面） |

### 首页动效系统

首页品牌页（`app/page.tsx`）使用多层动效营造沉浸式体验：

| 层级 | 类名 | 效果 | 说明 |
|------|------|------|------|
| 环境层 | `.ambient-orb` | 3 颗模糊光球漂移 | 深蓝/靛蓝/紫，18-22s 循环 |
| 纹理层 | `.dot-grid` | 径向点阵叠加 | 32px 间距，渐变遮罩 |
| 磁力场 | `.magnetic-field` | 3 个同心环缩放旋转 | 14-20s 独立周期 |
| 粒子层 | `.particles-container` | 10 颗微粒上浮 | 17-25s 各异时长 |
| 光标层 | `.cursor-glow` | 600px 径向光晕跟随 | rAF 节流 |
| 卡片层 | `.hero-preview-card` | 3D 倾斜 + 动态高光 | 鼠标位置驱动 perspective |
| 卫星标签 | `.hero-satellite` | 卡片外围浮动文字标签 | 8s 轨道动画，位置错开 |
| 滚入动画 | `.reveal` / `.stagger-children` | Intersection Observer 触发 | 淡入+上移，子元素交错延迟 |
| 微交互 | `.shine-sweep` / `.gradient-border-card` | 悬停闪光/旋转边框 | 卡片悬停时激活 |

技术保障：所有动画通过 `prefers-reduced-motion: reduce` 媒体查询关闭，尊重无障碍偏好。

---


## 安全模型

### 身份验证原则

1. **用户身份仅来自 Supabase session cookie** — API 路由通过 `createServerClient` 从请求 cookie 中读取 session
2. **管理员身份仅从 `ADMIN_EMAILS` 判断** — 不查数据库 `profiles.is_admin`
3. **资源归属强制校验** — 所有项目操作加 `.eq('user_id', user.id)` 条件
4. **回调参数不可信** — 支付回调中的 `param` 字段仅作辅助日志

### 会员权限分离

| 层级 | 开关 | 用途 |
|------|------|------|
| **服务端** | `MEMBERSHIP_ENABLED` | 控制实际权限校验（图片生成/导出/项目数） |
| **客户端** | `NEXT_PUBLIC_MEMBERSHIP_ENABLED` | 仅控制按钮/标签显示 |

### 双客户端架构

| 客户端 | 用途 | 权限 |
|--------|------|------|
| `supabaseAdmin` (service role) | 支付回调、管理员后台 | 绕过 RLS |
| 用户 session 客户端 | 普通用户接口 | 受 RLS 保护 |

> `supabaseAdmin` 仅在 `src/lib/auth/admin.ts` 中导出，不会暴露到客户端代码。

### SSRF 防护（导出图片）

- 图片 URL 域名白名单 + Content-Type 校验 + 大小限制
- PDF: 单图最大 8MB，总量最大 40MB，超时 5s
- PPT: 图片预下载为 base64 data URI
- 仅允许 `image/jpeg`、`image/png`、`image/webp`

### 数据保护

- 管理员统计接口只返回脱敏摘要，不含原始用户数据
- 会员查询接口只返回当前 session 用户信息
- 图片任务查询先验证项目归属
- 公开公告接口使用 anon key（非 service role）

---

## 本地开发

### 前置条件

| 依赖 | 版本要求 |
|------|---------|
| Node.js | ≥ 20 |
| npm | ≥ 9 |
| Supabase 项目 | 免费套餐即可 |
| DeepSeek API Key | 文本生成（必需） |
| 图片生成 API Key | 图片生成（必需） |

### 首次启动

```bash
# 1. 进入项目
cd designflow-ai

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env.local
# 编辑 .env.local，填入真实的 API Key 和 Supabase 信息

# 4. 初始化数据库
# 打开 Supabase Dashboard → SQL Editor
# 粘贴并执行数据库迁移脚本

# 5. 启动开发服务器
npm run dev
# 访问 http://localhost:3000
```

### 开发命令

```bash
npm run dev      # 启动开发服务器（Turbopack HMR）
npm run build    # 生产构建
npm run start    # 启动生产服务器
npm run lint     # ESLint 检查
```

---

## 部署上线

### Vercel 部署

```bash
cd designflow-ai

# 首次部署
npx vercel --prod --yes

# 后续增量部署
npx vercel deploy --prod --yes
```

### 部署后步骤

1. 在 Vercel Dashboard → Settings → Environment Variables 配置所有环境变量
2. 在 Supabase SQL Editor 执行数据库迁移脚本
3. 在易付通商户后台添加支付域名白名单
4. 重新部署使环境变量生效

---

## 环境变量完整清单

### Supabase（必需）

| 变量 | 说明 | 示例 |
|------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名密钥（浏览器端） | `eyJ...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 服务角色密钥（仅服务端） | `eyJ...` |

### AI 生成（必需）

| 变量 | 说明 | 示例 |
|------|------|------|
| `DEEPSEEK_API_KEY` | DeepSeek API 密钥 | `sk-...` |
| `IMAGE_API_KEY` | 图片生成 API 密钥 | `sk-...` |
| `IMAGE_API_ENDPOINT` | 图片生成 API 端点 | `https://img-cn.65535.space` |

### 会员与支付（按需）

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `NEXT_PUBLIC_MEMBERSHIP_ENABLED` | 会员 UI 显示开关 | `false` |
| `MEMBERSHIP_ENABLED` | 会员 API 强制校验 | `false` |
| `ADMIN_EMAILS` | 管理员邮箱（逗号分隔） | 空 |
| `YFT_MERCHANT_ID` | 易付通商户号 | 空 |
| `YFT_SECRET_KEY` | 易付通签名密钥 | 空 |
| `YFT_API_URL` | 易付通下单接口 | `https://www.yifut.com/mapi.php` |
| `YFT_NOTIFY_URL` | 支付异步回调地址 | 空 |
| `YFT_RETURN_URL` | 支付完成跳转地址 | 空 |

---

## 数据库迁移

首次部署前，在 Supabase SQL Editor 中执行以下脚本。

### 表结构

| 表名 | 说明 |
|------|------|
| `profiles` | 用户表（关联 auth.users） |
| `projects` | 项目表（含 JSONB 步骤数据） |
| `image_jobs` | 图片生成任务表 |
| `project_assets` | 图片资产追踪表 |
| `announcements` | 公告表 |
| `changelogs` | 更新日志表 |
| `payment_orders` | 支付订单表 |

### 关键索引

- `idx_announcements_published_at`：公告排序
- `idx_payment_orders_status` + `idx_payment_orders_pending_expires_at`：订单查询与自动关闭
- `idx_payment_orders_provider_trade_no`：支付流水去重
- `idx_image_jobs_client_request_id`：幂等生图去重
- `image_jobs(project_id, step_key, slot_index)`：单槽唯一约束

### RLS 策略

| 表 | SELECT | INSERT | UPDATE | DELETE |
|----|--------|--------|--------|--------|
| profiles | 本人 | — | 本人 | — |
| projects | 本人 | 本人 | 本人 | 本人 |
| announcements | 已发布 | 管理员 | 管理员 | 管理员 |
| payment_orders | 本人 | — | — | — |

### 完整迁移 SQL

完整 SQL 脚本见 `supabase-setup.sql` 和 `supabase/migrations/` 目录。在 Supabase SQL Editor 中执行即可。

---

## API 接口清单

### 公开接口（无需登录）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/announcements` | 获取已发布公告列表 |
| GET | `/api/changelogs` | 获取更新日志列表 |
| GET | `/api/payments/yft/notify` | 易付通支付异步回调 |
| POST | `/api/payments/yft/notify` | 易付通支付回调（POST 兼容） |

### 需要登录的接口

#### 项目相关

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/projects` | 获取当前用户项目列表 |
| POST | `/api/projects` | 创建新项目 |
| GET | `/api/projects/[id]` | 获取单个项目详情 |
| PUT | `/api/projects/[id]` | 更新项目（字段白名单） |
| DELETE | `/api/projects/[id]` | 删除项目（级联清理存储） |
| PATCH | `/api/projects/[id]/image-slot` | 更新图片槽位 |

#### AI 生成

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/ai` | AI 文本生成（DeepSeek） |
| POST | `/api/image` | 创建图片生成任务（幂等） |
| GET | `/api/image/jobs` | 列出图片任务（按 projectId + step） |
| POST | `/api/storyboard-prompts` | 故事板 6 帧分镜提示词生成 |

#### 导出

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/export/pdf` | 导出 PDF |
| POST | `/api/export/ppt` | 导出 PPT |

#### 会员

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/membership` | 查询当前用户会员状态 |
| POST | `/api/payments/yft/create` | 创建支付订单 |
| GET | `/api/payments/orders` | 查询当前用户订单 |

#### 管理员接口（需 `isAdmin` 权限）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/stats` | 全站统计数据 |
| GET | `/api/admin/me` | 验证管理员身份 |
| GET | `/api/admin/users` | 用户列表（分页、搜索） |
| PATCH | `/api/admin/users/[id]` | 修改用户会员/用量 |
| GET | `/api/admin/announcements` | 公告列表（含草稿） |
| POST | `/api/admin/announcements` | 发布公告 |
| PATCH | `/api/admin/announcements/[id]` | 编辑公告 |
| DELETE | `/api/admin/announcements/[id]` | 删除公告 |
| GET | `/api/admin/changelogs` | 更新日志列表 |
| POST | `/api/admin/changelogs` | 新增更新日志 |
| PATCH | `/api/admin/changelogs/[id]` | 编辑更新日志 |
| DELETE | `/api/admin/changelogs/[id]` | 删除更新日志 |
| GET | `/api/admin/health` | 图片健康检查 |
| POST | `/api/admin/health` | 单槽图片修复 |

---

## 项目结构

```
designflow-ai/
├── app/                                    # Next.js App Router
│   ├── (auth)/                             # 认证页面组
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── admin/page.tsx                      # 管理员后台（5 Tab）
│   ├── api/
│   │   ├── admin/                          # 管理员 API
│   │   │   ├── announcements/
│   │   │   ├── changelogs/
│   │   │   ├── health/
│   │   │   ├── me/route.ts
│   │   │   ├── stats/route.ts
│   │   │   └── users/
│   │   ├── ai/route.ts                     # AI 文本生成
│   │   ├── announcements/route.ts          # 公开公告
│   │   ├── changelogs/route.ts             # 公开更新日志
│   │   ├── export/
│   │   │   ├── pdf/route.ts
│   │   │   └── ppt/route.ts
│   │   ├── image/
│   │   │   ├── jobs/route.ts               # 任务列表
│   │   │   └── route.ts                    # 创建任务（幂等）
│   │   ├── membership/route.ts
│   │   ├── payments/
│   │   │   ├── orders/route.ts             # 订单查询
│   │   │   └── yft/
│   │   │       ├── create/route.ts         # 创建支付订单
│   │   │       └── notify/route.ts         # 支付回调
│   │   ├── projects/
│   │   │   ├── [id]/
│   │   │   │   ├── image-slot/route.ts     # 图片槽位更新
│   │   │   │   └── route.ts               # 项目 CRUD
│   │   │   └── route.ts                    # 项目列表 + 创建
│   │   ├── storyboard-prompts/route.ts     # 故事板 AI 提示词
│   │   └── test-replicate/route.ts         # 图片 API 测试
│   ├── dashboard/
│   │   ├── layout.tsx                      # ProjectContext Provider
│   │   ├── page.tsx                        # 项目列表
│   │   └── [projectId]/page.tsx            # 项目步骤页
│   ├── membership/page.tsx                 # 会员中心
│   ├── test-image-api/page.tsx             # 图片 API 测试（生产 404）
│   ├── layout.tsx                          # 根布局
│   ├── page.tsx                            # 首页 Landing Page
│   └── globals.css                         # 全局样式 + CSS 变量
├── src/
│   ├── components/
│   │   ├── StepHeader.tsx                  # 步骤头部 + 共享 class
│   │   ├── BackgroundStep.tsx              # 步骤 1
│   │   ├── ProductIntroStep.tsx            # 步骤 2（7字段 + 字符计数 + 双视觉态）
│   │   ├── PersonaStep.tsx                 # 步骤 3
│   │   ├── AppearanceStep.tsx              # 步骤 4（白底产品棚拍）
│   │   ├── CMFStep.tsx                     # 步骤 5
│   │   ├── StoryboardStep.tsx              # 步骤 6（AI 6帧 + 单卡重想）
│   │   ├── ExplodedViewStep.tsx            # 步骤 7（10层技术提示词）
│   │   └── ExportPanel.tsx                 # 导出面板
│   ├── contexts/
│   │   └── ProjectContext.tsx              # 项目状态管理（reducer + 9 actions）
│   ├── lib/
│   │   ├── ai/
│   │   │   ├── deepseek.ts                 # DeepSeek API + generateStoryboardPrompts
│   │   │   └── prompts.ts                  # 所有 AI 提示词模板
│   │   ├── auth.ts                         # 认证核心逻辑
│   │   ├── auth/
│   │   │   └── admin.ts                    # supabaseAdmin（service role 隔离）
│   │   ├── export/
│   │   │   ├── pdfGenerator.ts             # pdfmake 生成器
│   │   │   └── pptGenerator.ts             # PptxGenJS 生成器
│   │   ├── image/
│   │   │   ├── replicate.ts                # 图片生成 API 封装
│   │   │   ├── storage.ts                  # 图片持久化到 Supabase Storage
│   │   │   └── urlResolver.ts              # storagePath → 可访问 URL 恢复
│   │   ├── imageTaskStore.ts               # 图片任务状态机 + localStorage
│   │   ├── storyboard.ts                    # 故事板 JSONB 规格化/槽位合并规则
│   │   ├── membership.ts                   # 会员/权限逻辑
│   │   ├── payment/
│   │   │   └── yft.ts                      # 易付通 SDK（签名/下单/验签）
│   │   ├── supabase/
│   │   │   ├── client.ts                   # 浏览器端 Supabase client
│   │   │   └── serverClient.ts             # 服务端 Supabase client
│   │   ├── useImageTaskStore.ts            # 任务状态机 React Hook
│   │   └── proxy.ts                        # Session 刷新代理
│   └── types/
│       ├── database.ts                     # Supabase 数据库类型
│       └── index.ts                        # 应用类型定义
├── supabase/
│   └── migrations/                         # 数据库迁移脚本
├── scripts/
│   └── sync-changelogs.mjs                 # 批量同步更新日志到 Supabase
├── public/
│   └── fonts/
│       └── simhei.ttf                      # 中文 PDF 导出字体
├── supabase-setup.sql                      # 完整数据库初始化 SQL
├── .env.example
├── package.json
├── next.config.ts
├── tsconfig.json
├── AGENTS.md
├── CLAUDE.md
└── README.md
```

---

## 技术栈

| 层 | 技术 | 版本 |
|---|------|------|
| **框架** | Next.js (App Router + Turbopack) | 16.2.7 |
| **UI 库** | React | 19.2.4 |
| **CSS** | Tailwind CSS | v4 |
| **语言** | TypeScript | 5.x |
| **认证** | Supabase Auth | 2.x |
| **数据库** | Supabase PostgreSQL | — |
| **AI 文本** | DeepSeek API (`deepseek-chat`) | — |
| **AI 图片** | OpenAI 兼容图片 API (`gpt-image-2`) | — |
| **PDF 导出** | pdfmake | 0.3.x |
| **PPT 导出** | PptxGenJS | 4.x |
| **支付** | 易付通 (YFT) 商户系统 | — |
| **部署** | Vercel | — |
| **包管理** | npm | 9+ |

### 关键依赖版本

```json
{
  "@supabase/supabase-js": "^2.107.0",
  "next": "16.2.7",
  "pdfmake": "^0.3.10",
  "pptxgenjs": "^4.0.1",
  "react": "19.2.4",
  "react-dom": "19.2.4"
}
```

---

## 数据模型

### profiles（用户表）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | UUID (PK) | 关联 `auth.users.id` |
| `email` | TEXT | 邮箱 |
| `full_name` | TEXT | 姓名 |
| `membership_plan` | TEXT | `none`/`day`/`week`/`month`/`half_year`/`year` |
| `membership_expires_at` | TIMESTAMPTZ | 会员到期时间 |
| `image_usage` | JSONB | 图片使用次数 `{ "projectId:step": count }` |
| `is_admin` | BOOLEAN | 保留字段（不再作为权限判断依据） |
| `created_at` | TIMESTAMPTZ | 注册时间 |

### projects（项目表）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | UUID (PK) | 项目 ID |
| `user_id` | UUID (FK) | 所属用户 |
| `idea` | TEXT | 原始产品想法 |
| `background` | TEXT | 背景研究文本 |
| `product_intro` | JSONB | 产品介绍（name, tagline, target_users, problem, features, advantages, scenario） |
| `personas` | JSONB | 用户画像数组 |
| `appearance_images` | JSONB | 外观图片 URL 数组（3张） |
| `cmf` | JSONB | CMF 方案（primary_color, primary_color_hex, secondary_color, secondary_color_hex, material, surface_treatment） |
| `storyboard_images` | JSONB | 故事板数组 `[{ url, description, prompt }]`（6帧） |
| `exploded_view_image` | TEXT | 爆炸图 URL |
| `current_step` | INTEGER | 当前步骤（0-7） |
| `selected_appearance_index` | INTEGER | 选中的外观方案索引 |
| `created_at` | TIMESTAMP | 创建时间 |
| `updated_at` | TIMESTAMP | 更新时间 |

### image_jobs（图片任务表）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | UUID (PK) | 任务 ID |
| `project_id` | UUID (FK) | 所属项目 |
| `step_key` | TEXT | `appearance`/`storyboard`/`exploded_view` |
| `slot_index` | INTEGER | 槽位索引（0-5） |
| `prompt` | TEXT | 生成提示词 |
| `client_request_id` | TEXT (UNIQUE) | 客户端幂等 ID |
| `provider` | TEXT | `replicate`/`openai` |
| `provider_job_id` | TEXT | 提供方任务 ID |
| `status` | TEXT | `queued` → `processing` → `completed`/`failed` |
| `image_url` | TEXT | 生成的图片 URL |
| `error_message` | TEXT | 错误信息 |

### payment_orders（支付订单表）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | UUID (PK) | 订单 ID |
| `order_no` | TEXT (UNIQUE) | 商户订单号 |
| `user_id` | UUID (FK) | 下单用户 |
| `plan` | TEXT | 套餐标识 |
| `amount` | NUMERIC(10,2) | 金额（元） |
| `status` | TEXT | `pending`/`paid`/`failed`/`closed`/`paid_late` |
| `provider` | TEXT | `yft` |
| `provider_trade_no` | TEXT (UNIQUE) | 易付通交易流水号 |
| `provider_payload` | JSONB | 原始请求/响应数据 |
| `paid_at` | TIMESTAMPTZ | 支付完成时间 |
| `expires_at` | TIMESTAMPTZ | 订单过期时间（创建后 15 分钟） |
| `closed_at` | TIMESTAMPTZ | 订单关闭时间 |

---

## 常见问题

### 注册/登录

**Q: 注册失败，提示 "email rate limit"？**
A: Supabase 免费套餐有注册频率限制，等待几分钟后重试。

**Q: 登录提示 "Email not confirmed"？**
A: Supabase Dashboard → Authentication → Settings → 关闭「Enable email confirmations」。

### AI 生成

**Q: AI 文本生成失败？**
A: 检查 `DEEPSEEK_API_KEY` 配置，确认账户余额充足。

**Q: 故事板提示词生成失败/空白？**
A: 检查 Vercel 函数日志，确认 `/api/storyboard-prompts` 返回正确。DeepSeek 偶尔会返回非标准 JSON，代码已做 `replace(/```json|```/g)` 清理。

**Q: 图片生成失败或超时？**
A: 检查 `IMAGE_API_KEY` 和 `IMAGE_API_ENDPOINT`。图片生成约 20-60 秒，可在浏览器 Network 标签查看 image/jobs 轮询状态。

**Q: 刷新页面后图片生成状态丢失？**
A: v3.0.0 起已通过 localStorage 任务状态机修复，刷新立即恢复生成中状态。如果仍丢失，检查浏览器是否禁用了 localStorage。

**Q: 故事板图片内容和描述不一致？**
A: v3.1.0 已通过 `buildBoundStoryboardPrompt` 将中文描述硬绑定为图片核心约束。如果偏差仍然较大，手动编辑卡片的 textarea 描述后点击「重想故事再生图」。

### PDF/PPT 导出

**Q: PDF 导出中文显示方块？**
A: 确保 `public/fonts/simhei.ttf` 存在。可用其他中文字体替换，在 `pdfGenerator.ts` 修改字体路径。

**Q: PPT 导出缺少图片？**
A: 检查图片 URL 是否有效。导出时会对第三方临时 URL 做域名白名单校验，不通过的会被拒绝。可重新生成图片获得持久 URL。

### 会员与支付

**Q: 支付成功但会员未开通？**
A: 检查易付通回调地址和域名白名单配置，查看 Vercel Function Logs 回调处理日志。

**Q: 如何设置管理员？**
A: 在 Vercel 环境变量 `ADMIN_EMAILS` 中设置你的邮箱，重新部署即可。

### 部署

**Q: Vercel 部署后环境变量未生效？**
A: 添加环境变量后需要重新部署（Redeploy）。

**Q: 本地运行正常但线上报错？**
A: 检查 Vercel 环境变量是否与 `.env.local` 一致，检查 Supabase RLS 策略是否配置。

---

> 最后更新：2026-06-10 · 版本 v3.2.0
