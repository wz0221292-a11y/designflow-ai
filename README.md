# DesignFlow AI — 完整使用与部署指南

> AI 产品设计流程引擎：从创意到设计方案书，7 步生成完整工业设计文档，支持导出 PPT 和 PDF。

**线上版**：[www.design-flow-ai.cloud](https://www.design-flow-ai.cloud)

---

## 目录

- [产品概述](#产品概述)
- [快速开始](#快速开始)
- [7 步设计流程](#7-步设计流程)
- [项目导出](#项目导出)
- [公告系统](#公告系统)
- [管理员后台](#管理员后台)
- [会员与支付](#会员与支付)
- [设计系统](#设计系统)
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
| **AI 文本生成** | DeepSeek API 驱动，自动生成市场分析、产品介绍、用户画像、CMF 方案 |
| **AI 图片生成** | 支持外观设计图、故事板、爆炸图三类视觉输出，支持参考图保持一致性 |
| **7 步引导流程** | 从背景研究到爆炸图，每步 AI 生成后可编辑修改 |
| **PPT 导出** | 使用 PptxGenJS 生成专业演示文稿（.pptx） |
| **PDF 导出** | 使用 pdfmake 生成设计展板（.pdf），支持中文 |
| **会员系统** | 5 档套餐，支持在线支付自动开通 |
| **公告系统** | 全站公告，用户进入项目列表自动弹出 |
| **管理员后台** | 数据统计面板 + 公告发布管理 + 用户管理与会员手动开通 |
| **支付系统** | 易付通在线支付，订单 15 分钟超时自动关闭 |
| **服务端安全** | 项目数量/导出/图片生成服务端强制校验，PUT 字段白名单 |

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

**AI 生成内容**：产品名称、定位语、核心功能列表（5 项）、使用场景

- 布局：左侧核心功能列表 + 右侧使用场景编辑器
- 功能项支持添加/删除/编辑
- 场景描述可自由修改
- 所有内容在白色面板卡片中展示

### 步骤 3：用户画像（PersonaStep）

**AI 生成内容**：2-3 个典型用户画像

每个画像包含：
- 姓名、年龄、职业
- 设计需求（蓝色标签）
- 用户痛点（琥珀色标签）
- 使用场景（绿色标签）

### 步骤 4：外观设计（AppearanceStep）

**AI 生成内容**：3 张产品外观效果图

- 并行生成 3 张 1024×1024 效果图
- 使用 `useImageJobs` Hook 轮询生成状态
- 选择一张作为主方案（影响故事板、爆炸图的参考图）
- 已生成的图片可以重新生成替换

### 步骤 5：CMF 方案（CMFStep）

**AI 生成内容**：主色 + 辅色（含色值）、主要材料、表面处理方案

- 色彩卡片展示：大色块 + 色值标注
- 支持手动修改所有字段
- 双向数据流：编辑即时反映

### 步骤 6：故事板（StoryboardStep）

**AI 生成内容**：6 格叙事情节 + 6 张故事板图片

提示词采用 6 帧叙事结构：
1. **开场**：使用环境与初始情境（远景）
2. **冲突**：用户痛点特写（近景/中景）
3. **转折**：产品登场（中景）
4. **交互**：关键操作瞬间（特写）
5. **成果**：产品带来的改变（对比第 2 帧）
6. **结局**：安静满足的收束画面

- 参考图模式下保持产品外观一致性
- 每帧支持独立重新生成

### 步骤 7：爆炸图（ExplodedViewStep）

**AI 生成内容**：1 张产品结构分解图

- 展示部件关系和技术拆解
- 基于选定的外观方案生成

### 步骤 8：导出（ExportPanel）

- 勾选需要包含的章节
- 选择 PPT 或 PDF 格式
- 导出期间阻止离开页面，防止状态丢失

### 操作按钮

每个步骤底部对齐的操作栏：

| 按钮 | 功能 | 样式 |
|------|------|------|
| ← 上一步 | 返回上一页（第 1 步不显示） | 白色底 + 灰色边框 |
| 重新生成 | 强制重新生成当前步骤内容 | 虚线描边蓝色文字 |
| 跳过此部分 | 跳过当前步骤（导出时不包含） | 蓝色主按钮 |
| 满意，下一步 → | 保存并进入下一步 | 蓝色实心按钮 |

> 图片生成步骤（4/6/7）中，**生成图片时不可跳过**，需等图片全部生成完成。

---

## 项目导出

### PPT 导出（.pptx）

使用 PptxGenJS 生成，包含：
- 封面页（项目标题 + 日期）
- 目录页
- 各章节内容幻灯片（段落标题页 + 内容卡片）
- 产品效果图、故事板图片
- CMF 色板展示

### PDF 导出（.pdf）

使用 pdfmake 生成，包含：
- 封面（大标题 + 副标题 + 装饰线）
- 目录（已完成/未完成状态区分）
- 各章节（段落标题 + 内容卡片 + 左侧强调条）
- 图片网格（统一间距 + 圆角）
- 页眉页脚（品牌名 + 章节名 + 页码）

### 字体支持

中文渲染依赖 `public/fonts/simhei.ttf`。部署前确保该文件存在，否则中文会显示为方块。

---

## 公告系统

### 用户端体验

- 进入项目列表自动弹出最新公告卡片
- 可向下滚动查看历史公告列表
- **「关闭」**：关闭弹窗，下次进入仍显示
- **「今日不再提示」**：当天不再弹出当前最新公告
- **「我知道了」**：关闭弹窗

### 技术实现

- 公告按 `published_at DESC` 倒序排列
- "今日不再提示"使用 `localStorage`，键名：`{最新公告ID}:{当天日期}`
- 公开读取接口 `GET /api/announcements`（无需登录）
- 公告表不存在时静默降级为空数组，不报错

---

## 管理员后台

### 如何成为管理员

**方式一（推荐）**：Vercel 环境变量设置 `ADMIN_EMAILS`：

```
ADMIN_EMAILS=your-email@example.com,another-admin@example.com
```

支持多个邮箱，英文逗号分隔，重新部署生效。

**方式二（已废弃）**：不再支持通过数据库 `profiles.is_admin` 字段提权。管理员身份仅从 `ADMIN_EMAILS` 环境变量判断。profile 敏感字段更新必须走服务端 service role。

### 管理员后台功能

访问 [https://www.design-flow-ai.cloud/admin](https://www.design-flow-ai.cloud/admin)

#### 数据统计面板

6 个核心指标卡片：

| 指标 | 内容 |
|------|------|
| 总收入 | 累计支付金额 + 今日收入 |
| 用户数 | 总注册用户 + 今日新增 |
| 项目数 | 总项目数 + 今日新增 |
| 图片任务 | 总生成任务 + 已完成数 |
| 付费订单 | 已支付订单 + 待支付数 |
| 会员用户 | 当前有效会员数 + 公告总数 |

#### 公告管理

- 左侧表单：填写标题 + 内容 → 点击「发布公告」
- 右侧列表：展示所有公告，标注"已发布"或"草稿"
- 支持通过 API 删除或编辑公告

#### 安全机制

- 所有管理员 API 服务端校验 `requireAdmin()`
- 管理员身份**仅从 `ADMIN_EMAILS` 环境变量判断**（不再依赖 `profiles.is_admin`）
- profiles 敏感字段（`is_admin`、`membership_plan`、`membership_expires_at`、`image_usage`）只能由 service role 服务端 API 修改，客户端无权更新整行
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

> 未开通会员也能预览全部 AI 生成内容，但图片生成次数、项目数量和导出功能受限。

> 当前仅支持**支付宝**支付。

### 会员控制开关

会员功能受两层环境变量控制，服务端与客户端严格分离：

| 变量 | 作用域 | 说明 |
|------|--------|------|
| `MEMBERSHIP_ENABLED` | **服务端** | 唯一决定 API 是否强制会员限制（图片生成/导出/项目数） |
| `NEXT_PUBLIC_MEMBERSHIP_ENABLED` | **客户端** | 仅控制 UI（会员按钮、套餐卡片、限额提示显示/隐藏） |

> 上线收费模式必须**同时**设置为 `true`。若仅设置 `NEXT_PUBLIC_MEMBERSHIP_ENABLED=true`，客户端可能显示会员 UI 但服务端不校验。

### 支付流程（易付通 YFT）

```
用户点击「开通套餐」→ 创建支付订单（DB）→ 调用易付通下单 API
→ 返回支付宝支付链接 → 浏览器跳转支付宝收银台
→ 用户完成支付 → 易付通 GET 回调 notify 接口
→ 服务端验证签名 → 更新订单状态为 paid → 激活会员
```

### 易付通配置

#### 第一步：获取商户信息

登录 [易付通商户后台](https://www.yifut.com)，获取：
- 商户号（PID）
- 密钥（Secret Key）
- 下单接口地址（通常为 `https://www.yifut.com/mapi.php`）

#### 第二步：添加支付域名白名单

在易付通商户后台 → 支付域名授权 → 添加 `www.design-flow-ai.cloud`

#### 第三步：配置环境变量

本地（`.env.local`）或 Vercel 环境变量：

| 变量 | 值 | 说明 |
|------|-----|------|
| `NEXT_PUBLIC_MEMBERSHIP_ENABLED` | `true` | 启用会员功能 |
| `YFT_MERCHANT_ID` | 你的商户号 | 对应 API 参数 `pid` |
| `YFT_SECRET_KEY` | 你的密钥 | 用于 MD5 签名 |
| `YFT_API_URL` | 下单接口完整 URL | 如 `https://www.yifut.com/mapi.php` |
| `YFT_NOTIFY_URL` | `https://www.design-flow-ai.cloud/api/payments/yft/notify` | 支付异步回调地址 |
| `YFT_RETURN_URL` | `https://www.design-flow-ai.cloud/membership` | 支付完成跳转地址 |

#### 第四步：重新部署

```bash
npx vercel --prod --yes
```

### 签名算法

易付通 MD5 签名流程（在 `src/lib/payment/yft.ts` 中实现）：

```
1. 将所有请求参数（除 sign 和 sign_type 外）按 key 的 ASCII 升序排序
2. 拼接为 key1=value1&key2=value2&... 格式
3. 在末尾直接拼接密钥（不加 &key= 分隔符）
4. 计算 MD5 哈希，转为小写十六进制
```

关键代码路径：`src/lib/payment/yft.ts` → `signYftParams()`

### 请求参数对照

| 参数名 | 说明 | 示例 |
|--------|------|------|
| `pid` | 商户号 | `1362` |
| `type` | 支付方式 | `alipay` |
| `out_trade_no` | 商户订单号 | `DF1717000000A1B2C3` |
| `notify_url` | 异步通知地址 | 完整 URL |
| `return_url` | 同步跳转地址 | 完整 URL |
| `name` | 商品名称 | `DesignFlow AI 一月会员` |
| `money` | 金额（元） | `30.00` |
| `clientip` | 客户端 IP | 从请求头获取 |
| `param` | 附加参数 | JSON 字符串 `{"userId":"...", "plan":"month"}` |
| `sign` | MD5 签名 | 自动计算 |
| `sign_type` | 签名类型 | `MD5` |

### 回调处理

回调接口 `GET /api/payments/yft/notify` 处理逻辑：

1. 接收 GET 请求参数
2. 验证 MD5 签名（忽略 `sign` 和 `sign_type` 字段后计算）
3. 检查 `trade_status === 'TRADE_SUCCESS'`
4. 查询 `payment_orders` 表确认订单存在
5. 防重复处理：已支付/已逾期待审核订单直接返回 `success`
6. 金额校验：回调金额与订单金额**统一转为分（整数）比较**，拒绝浮点误差导致的误判或绕过
7. 订单已过期/已关闭但支付成功 → 标记为 `paid_late` 并记录完整 payload，**不自动激活会员**，由管理员后台人工审核补开
8. 正常订单：更新状态为 `paid`，记录交易流水号
9. 从数据库订单记录中获取 `user_id` 和 `plan`（**绝不信任回调 param 参数**）
10. 先激活会员，成功后再标记支付完成（防止中间坏状态）
11. 返回 `success`（纯文本，非 JSON）

> 回调中的 `param` JSON 字段仅作备注，激活会员时只使用数据库订单中的 `user_id`/`plan`，防止伪造。

### 订单超时自动关闭与晚到支付补偿

- 下单时写入 `expires_at`，默认 **15 分钟**有效
- 超过 `expires_at` 的 `pending` 订单在下次创建或查询时自动标记为 `closed`
- 已过期但用户仍完成真实支付 → 标记 `paid_late`，完整记录 payload 和金额供管理员人工审核
- 管理员后台可查看 `paid_late` 订单并手动补开会员
- 金额校验统一转为**分**(整数)比较——`30` 和 `30.00` 的格式差异不再影响校验结果

> 同时兼容 POST 回调，POST 会转为 GET 复用同一处理逻辑。

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
stepSubCardClass      // 白色卡片 + 边框 + 阴影
stepInputClass        // 白色输入框 + 蓝色聚焦环
stepPrimaryButtonClass // 蓝色主按钮（圆角全圆）
stepSecondaryButtonClass // 白色次按钮（灰色边框）
stepGhostButtonClass  // 蓝色虚线幽灵按钮
```

### 配色色阶

| 色相 | 用途 |
|------|------|
| Blue (#3b82f6) | 主操作色 |
| Indigo (#6366f1) | 推荐套餐、强调 |
| Emerald (#10b981) | 当前套餐、成功状态 |
| Amber (#f59e0b) | 用户痛点标签 |
| Rose (#f43f5e) | 场景标签 |
| Violet (#8b5cf6) | 用户画像 |
| Cyan (#06b6d4) | 外观设计 |
| Slate | 中性灰阶（边框、辅助文字、表面） |

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
# 编辑 .env.local，填入真实的 API Key 和 Supabase 信息（见下方完整清单）

# 4. 初始化数据库
# 打开 Supabase Dashboard → SQL Editor
# 粘贴并执行下方数据库迁移脚本

# 5. 启动开发服务器
npm run dev
# 访问 http://localhost:3000
```

### 开发命令

```bash
npm run dev      # 启动开发服务器（Turbopack 热更新）
npm run build    # 生产构建
npm run start    # 启动生产服务器
npm run lint     # ESLint 检查
```

---

## 部署上线

### Vercel 部署（推荐）

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

## 安全模型

### 身份验证原则

1. **用户身份仅来自 Supabase session cookie** — API 路由通过 `createServerClient` 从请求 cookie 中读取 session，绝不相信请求体或查询参数中的 `userId`、`email`
2. **管理员身份仅从 `ADMIN_EMAILS` 判断** — `requireAdmin()` 不查数据库 `profiles.is_admin`（防止普通用户通过 RLS 漏洞提权），只检查当前 session 用户邮箱是否在 `ADMIN_EMAILS` 环境变量中
3. **资源归属强制校验** — 所有项目相关操作（查询、更新、删除、导出、图片生成）都加 `.eq('user_id', user.id)` 条件
4. **回调参数不可信** — 支付回调中的 `param` 字段仅作辅助日志，用户身份和套餐标识严格从数据库订单记录中获取

### 会员权限分离（服务端 vs 客户端）

| 层级 | 开关读取 | 权限函数 | 用途 |
|------|---------|---------|------|
| **服务端 (API 路由)** | `MEMBERSHIP_ENABLED` | `isMembershipEnforced()`, `canExportServer()`, `getImageLimitServer()`, `getProjectLimitServer()` | 控制实际权限校验 |
| **客户端 (UI)** | `NEXT_PUBLIC_MEMBERSHIP_ENABLED` | `MEMBERSHIP_ENABLED`, `canExport()`, `getImageLimit()`, `getProjectLimit()` | 仅控制按钮/标签显示 |

**关键安全规则**：`NEXT_PUBLIC_MEMBERSHIP_ENABLED=false` + `MEMBERSHIP_ENABLED=true` 时，服务端仍执行完整会员校验，客户端只隐藏会员相关 UI。两个变量的值可以不同，客户端变量绝不能影响 API 权限。

### 双客户端架构

| 客户端 | 用途 | 权限 |
|--------|------|------|
| `supabaseAdmin` (service role) | 支付回调、已验证的管理员后台 | 绕过 RLS |
| 用户 session 客户端 | 普通用户接口 | 受 RLS 保护 |

### SSRF 防护（导出图片）

- 图片 URL 域名白名单（route 层）+ Content-Type 校验 + 大小限制（generator 层）
- PDF: 单图最大 8MB，总量最大 40MB，超时 5s，拒绝重定向
- PPT: 同上，且所有图片预下载为 base64 data URI，不将原始 URL 透传给 pptxgenjs
- 仅允许 `image/jpeg`、`image/png`、`image/webp` 三种 MIME 类型

### 敏感数据保护

- 管理员统计接口的 `recentOrders` 只返回 `amount`、`plan`、`paid_at`
- 会员查询接口只返回当前 session 用户的信息，不接受 `?userId=` 参数
- 图片任务查询接口先验证项目归属再返回任务数据
- 支付回调查订单从数据库获取 user_id/plan，不使用回调参数中的 userId/plan
- 公开公告接口使用 anon key（非 service role）读取

### 已删除的危险模式

- ❌ `supabaseServer` 别名（容易误用为普通客户端，实际是 service role）— 已彻底删除
- ❌ `requireAdmin(userId, email)` 带参数 — 已改为无参，仅读 session
- ❌ API 接受 `body.userId` — 已全部改为从 `getCurrentUser()` 获取
- ❌ API 接受 `?userId=` 查询参数 — 已全部移除
- ❌ `profiles.is_admin` 数据库字段作为管理员判断依据 — 已改为纯 `ADMIN_EMAILS`

---

## 环境变量完整清单

### Supabase（必需）

| 变量 | 说明 | 示例 |
|------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名密钥（浏览器端使用） | `eyJ...` |
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
| `NEXT_PUBLIC_MEMBERSHIP_ENABLED` | 会员功能开关（客户端 UI 显示） | `false` |
| `MEMBERSHIP_ENABLED` | 会员强制校验开关（服务端 API 权限） | `false` |
| `ADMIN_EMAILS` | 管理员邮箱（逗号分隔，唯一管理员判断依据） | 空 |
| `YFT_MERCHANT_ID` | 易付通商户号 | 空 |
| `YFT_SECRET_KEY` | 易付通签名密钥 | 空 |
| `YFT_API_URL` | 易付通下单接口 | `https://www.yifut.com/mapi.php` |
| `YFT_NOTIFY_URL` | 支付异步回调地址 | 空 |
| `YFT_RETURN_URL` | 支付完成跳转地址 | 空 |

---

## 数据库迁移

首次部署前，在 Supabase SQL Editor 中执行以下脚本。**所有表都使用 `CREATE TABLE IF NOT EXISTS`，可以安全地重复执行。**

### 完整迁移 SQL

```sql
-- ============================================================
-- DesignFlow AI 数据库初始化脚本
-- 请在 Supabase SQL Editor 中一次性执行
-- ============================================================

-- ── 基础表 ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  membership_plan TEXT DEFAULT 'none',
  membership_expires_at TIMESTAMP WITH TIME ZONE,
  image_usage JSONB DEFAULT '{}'::jsonb,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  idea TEXT NOT NULL,
  background TEXT,
  product_intro JSONB,
  personas JSONB,
  appearance_images JSONB,
  cmf JSONB,
  storyboard_images JSONB,
  exploded_view_image TEXT,
  current_step INTEGER DEFAULT 0,
  selected_appearance_index INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS image_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL,
  step_key TEXT NOT NULL CHECK (step_key IN ('appearance', 'storyboard', 'exploded_view')),
  slot_index INTEGER NOT NULL DEFAULT 0,
  prompt TEXT NOT NULL DEFAULT '',
  provider TEXT NOT NULL DEFAULT 'replicate',
  provider_job_id TEXT,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  image_url TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, step_key, slot_index)
);

CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id),
  is_published BOOLEAN DEFAULT TRUE,
  published_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no TEXT NOT NULL UNIQUE,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  plan TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  provider TEXT NOT NULL DEFAULT 'yft',
  provider_trade_no TEXT,
  provider_payload JSONB,
  paid_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ── 索引 ────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_announcements_published_at
  ON announcements (is_published, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_orders_user_id ON payment_orders (user_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON payment_orders (status);
CREATE INDEX IF NOT EXISTS idx_payment_orders_pending_expires_at
  ON payment_orders (status, expires_at)
  WHERE status = 'pending';
-- 防止同一支付流水重复绑定多个订单
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_orders_provider_trade_no
  ON payment_orders (provider_trade_no) WHERE provider_trade_no IS NOT NULL;

-- ── 行级安全策略 (RLS) ─────────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_orders ENABLE ROW LEVEL SECURITY;

-- profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- projects
DROP POLICY IF EXISTS "Users can view own projects" ON projects;
CREATE POLICY "Users can view own projects" ON projects
  FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can create own projects" ON projects;
CREATE POLICY "Users can create own projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own projects" ON projects;
CREATE POLICY "Users can update own projects" ON projects
  FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own projects" ON projects;
CREATE POLICY "Users can delete own projects" ON projects
  FOR DELETE USING (auth.uid() = user_id);

-- announcements
DROP POLICY IF EXISTS "Anyone can view published announcements" ON announcements;
CREATE POLICY "Anyone can view published announcements" ON announcements
  FOR SELECT USING (is_published = TRUE);
DROP POLICY IF EXISTS "Admins can manage announcements" ON announcements;
CREATE POLICY "Admins can manage announcements" ON announcements
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_admin = TRUE)
  );

-- payment_orders
DROP POLICY IF EXISTS "Users can view own payment orders" ON payment_orders;
CREATE POLICY "Users can view own payment orders" ON payment_orders
  FOR SELECT USING (auth.uid() = user_id);

-- ── 触发器 ──────────────────────────────────────────────────

-- 注册自动创建 profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 自动更新 updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_projects_updated ON projects;
CREATE TRIGGER on_projects_updated
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_announcements_updated ON announcements;
CREATE TRIGGER on_announcements_updated
  BEFORE UPDATE ON announcements
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS on_payment_orders_updated ON payment_orders;
CREATE TRIGGER on_payment_orders_updated
  BEFORE UPDATE ON payment_orders
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
```

---

## API 接口清单

### 公开接口（无需登录）

| 方法 | 路径 | 说明 | 参数 |
|------|------|------|------|
| GET | `/api/announcements` | 获取已发布公告列表 | 无 |
| GET | `/api/payments/yft/notify` | 易付通支付异步回调 | 易付通回调参数 |
| POST | `/api/payments/yft/notify` | 易付通支付回调（POST 兼容） | 易付通回调参数 |

### 需要登录的接口

所有需要登录的接口在 `app/api/` 路由中通过 Supabase Auth 校验用户身份。

#### 项目相关

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/projects/[id]` | 获取单个项目详情 |
| PUT | `/api/projects/[id]` | 更新项目（字段级合并） |
| DELETE | `/api/projects/[id]` | 删除项目（不可恢复） |

#### AI 生成

| 方法 | 路径 | 说明 | 请求体 |
|------|------|------|--------|
| POST | `/api/ai` | AI 文本生成 | `{ step, idea, existingData? }` |
| POST | `/api/image` | 创建图片生成任务 | `{ projectId, step, prompt, slotIndex?, referenceImage? }` |
| GET | `/api/image/jobs` | 列出图片任务 | `?projectId=&step=` |
| GET | `/api/image/jobs/[jobId]` | 查询单个任务状态 | 无 |

#### 导出

| 方法 | 路径 | 说明 | 请求体 |
|------|------|------|--------|
| POST | `/api/export/pdf` | 导出 PDF | `{ projectId, includeSections }` |
| POST | `/api/export/ppt` | 导出 PPT | `{ projectId, includeSections }` |

#### 会员

| 方法 | 路径 | 说明 | 请求体/参数 |
|------|------|------|------------|
| GET | `/api/membership` | 查询会员状态 | `?userId=` |
| POST | `/api/payments/yft/create` | 创建支付订单 | `{ userId, plan }` |

#### 管理员接口（需管理员权限）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/admin/stats` | 获取全站统计数据 |
| GET | `/api/admin/announcements` | 获取所有公告（含草稿） |
| POST | `/api/admin/announcements` | 发布新公告 |
| PATCH | `/api/admin/announcements/[id]` | 编辑公告 |
| DELETE | `/api/admin/announcements/[id]` | 删除公告 |

---

## 项目结构

```
designflow-ai/
├── app/                              # Next.js App Router 页面和 API
│   ├── (auth)/                       # 认证页面组
│   │   ├── layout.tsx                # 认证页布局
│   │   ├── login/page.tsx           # 登录页
│   │   └── signup/page.tsx          # 注册页
│   ├── admin/
│   │   └── page.tsx                  # 管理员后台
│   ├── api/                          # API 路由
│   │   ├── admin/
│   │   │   ├── announcements/        # 公告 CRUD
│   │   │   │   ├── [id]/route.ts
│   │   │   │   └── route.ts
│   │   │   └── stats/route.ts        # 统计数据
│   │   ├── ai/route.ts               # AI 文本生成
│   │   ├── announcements/route.ts    # 公开公告查询
│   │   ├── export/
│   │   │   ├── pdf/route.ts          # PDF 导出
│   │   │   └── ppt/route.ts          # PPT 导出
│   │   ├── image/                    # 图片生成
│   │   │   ├── jobs/
│   │   │   │   ├── [jobId]/route.ts  # 单任务状态
│   │   │   │   └── route.ts          # 任务列表
│   │   │   └── route.ts              # 创建任务
│   │   ├── membership/route.ts       # 会员状态查询
│   │   ├── payments/yft/             # 易付通支付
│   │   │   ├── create/route.ts       # 创建订单
│   │   │   └── notify/route.ts       # 支付回调
│   │   └── projects/[id]/route.ts    # 项目 CRUD
│   ├── dashboard/
│   │   ├── layout.tsx                # 项目上下文 Provider
│   │   ├── page.tsx                  # 项目列表（浅色工作台）
│   │   └── [projectId]/page.tsx      # 项目详情/步骤页
│   ├── membership/page.tsx           # 会员中心
│   ├── test-image-api/page.tsx       # 图片 API 测试页
│   ├── layout.tsx                    # 根布局
│   ├── page.tsx                      # 首页（Landing Page）
│   └── globals.css                   # 全局样式 + 设计系统
├── src/
│   ├── components/                   # React 组件
│   │   ├── StepHeader.tsx            # 步骤页头部 + 共享 class 导出
│   │   ├── BackgroundStep.tsx        # 步骤 1：背景研究
│   │   ├── ProductIntroStep.tsx      # 步骤 2：产品介绍
│   │   ├── PersonaStep.tsx           # 步骤 3：用户画像
│   │   ├── AppearanceStep.tsx        # 步骤 4：外观设计
│   │   ├── CMFStep.tsx               # 步骤 5：CMF 方案
│   │   ├── StoryboardStep.tsx        # 步骤 6：故事板
│   │   ├── ExplodedViewStep.tsx      # 步骤 7：爆炸图
│   │   └── ExportPanel.tsx           # 导出面板
│   ├── contexts/                     # React Context
│   │   └── ProjectContext.tsx        # 项目状态管理（reducer + actions）
│   ├── lib/                          # 核心库
│   │   ├── admin.ts                  # 管理员校验逻辑
│   │   ├── ai/
│   │   │   ├── deepseek.ts           # DeepSeek API 封装
│   │   │   └── prompts.ts           # AI 提示词模板
│   │   ├── export/
│   │   │   ├── pdfGenerator.ts       # PDF 生成器（pdfmake）
│   │   │   ├── pdfmake.d.ts          # pdfmake 类型声明
│   │   │   └── pptGenerator.ts       # PPT 生成器（PptxGenJS）
│   │   ├── image/
│   │   │   └── replicate.ts          # 图片生成 API 封装
│   │   ├── membership.ts             # 会员核心逻辑
│   │   ├── payment/
│   │   │   └── yft.ts                # 易付通 SDK（签名、下单、验签）
│   │   ├── supabase/
│   │   │   ├── client.ts             # 浏览器端 Supabase 客户端
│   │   │   └── serverClient.ts       # 服务端 Supabase 客户端
│   │   └── useImageJobs.ts           # 图片任务轮询 Hook
│   └── types/
│       ├── database.ts               # Supabase 数据库类型
│       └── index.ts                  # 应用类型定义（Project, Profile, CMF 等）
├── public/
│   └── fonts/
│       └── simhei.ttf                # 中文 PDF 导出字体
├── .env.example                      # 环境变量模板
├── package.json
├── next.config.ts
├── tsconfig.json
├── AGENTS.md                         # Next.js 16 注意事项
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

### 关键依赖

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
| `membership_plan` | TEXT | 会员套餐：`none`/`day`/`week`/`month`/`half_year`/`year` |
| `membership_expires_at` | TIMESTAMPTZ | 会员到期时间 |
| `image_usage` | JSONB | 图片使用次数记录 `{ "projectId:step": count }` |
| `is_admin` | BOOLEAN | 是否为管理员 |
| `created_at` | TIMESTAMPTZ | 注册时间 |

### projects（项目表）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | UUID (PK) | 项目 ID |
| `user_id` | UUID (FK) | 所属用户 |
| `idea` | TEXT | 原始产品想法 |
| `background` | TEXT | 背景研究文本 |
| `product_intro` | JSONB | 产品介绍（name, tagline, features[], scenario） |
| `personas` | JSONB | 用户画像数组 |
| `appearance_images` | JSONB | 外观图片 URL 数组 |
| `cmf` | JSONB | CMF 方案（primary_color, material 等） |
| `storyboard_images` | JSONB | 故事板数组（url, description, prompt） |
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
| `step_key` | TEXT | 步骤标识：`appearance`/`storyboard`/`exploded_view` |
| `slot_index` | INTEGER | 槽位索引（0-5） |
| `prompt` | TEXT | 生成提示词 |
| `provider` | TEXT | 图片提供方 |
| `provider_job_id` | TEXT | 提供方任务 ID |
| `status` | TEXT | `queued` → `processing` → `completed`/`failed` |
| `image_url` | TEXT | 生成的图片 URL |
| `error_message` | TEXT | 错误信息 |

> 唯一约束：`(project_id, step_key, slot_index)` 确保同一项目同一步骤同一槽位只有一条记录。

### payment_orders（支付订单表）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | UUID (PK) | 订单 ID |
| `order_no` | TEXT (UNIQUE) | 商户订单号（`DF` + 时间戳 + 随机码） |
| `user_id` | UUID (FK) | 下单用户 |
| `plan` | TEXT | 套餐标识 |
| `amount` | NUMERIC(10,2) | 金额（元） |
| `status` | TEXT | `pending`/`paid`/`failed`/`closed` |
| `provider` | TEXT | 支付提供方（`yft`） |
| `provider_trade_no` | TEXT | 易付通交易流水号 |
| `provider_payload` | JSONB | 易付通完整的请求/响应数据 |
| `paid_at` | TIMESTAMPTZ | 支付完成时间 |

### announcements（公告表）

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | UUID (PK) | 公告 ID |
| `title` | TEXT | 标题 |
| `content` | TEXT | 正文内容 |
| `created_by` | UUID (FK) | 发布人 |
| `is_published` | BOOLEAN | 是否发布 |
| `published_at` | TIMESTAMPTZ | 发布时间 |

---

## 常见问题

### 注册/登录

**Q: 注册失败，提示 "email rate limit"？**
A: Supabase 免费套餐有注册频率限制，等待几分钟后重试。

**Q: 登录提示 "Email not confirmed"？**
A: Supabase Dashboard → Authentication → Settings → 关闭「Enable email confirmations」。

**Q: 用户头像/姓名不显示？**
A: 检查数据库触发器 `handle_new_user()` 是否正确创建，确认 `profiles` 表中有对应用户记录。

### 数据库

**Q: 提示找不到表（relation does not exist）？**
A: 在 Supabase SQL Editor 中运行[数据库迁移脚本](#数据库迁移)。

**Q: RLS 策略导致查询为空？**
A: 检查是否已执行 RLS 部分的 SQL。服务端使用 `SUPABASE_SERVICE_ROLE_KEY` 会绕过 RLS。

### AI 生成

**Q: AI 文本生成失败？**
A: 检查 `DEEPSEEK_API_KEY` 是否正确配置，确认 DeepSeek 账户余额充足。

**Q: 图片生成失败或超时？**
A: 检查 `IMAGE_API_KEY` 和 `IMAGE_API_ENDPOINT` 配置。图片生成可能需要 30-60 秒，超时时间设置足够长。

**Q: 图片生成返回 JSON 解析错误？**
A: 检查图片 API 端点是否兼容 OpenAI 格式。当前代码期望返回 `{ data: [{ url: "..." }] }` 结构。

### PDF/PPT 导出

**Q: PDF 导出中文显示方块？**
A: 确保 `public/fonts/simhei.ttf` 字体文件存在。也可以用其他中文字体替换，在 `pdfGenerator.ts` 中修改字体路径。

**Q: PDF 导出报 "包含无效数字"？**
A: 数据中有 `NaN` 或 `Infinity` 值。导出前系统会自动检查，在服务端日志中查看完整错误信息。

**Q: PPT 导出缺少图片？**
A: 检查图片 URL 是否仍然有效（外部 URL 可能过期）。本地开发时确保网络能访问图片 URL。

### 会员与支付

**Q: 会员套餐按钮不显示？**
A: 确认环境变量 `NEXT_PUBLIC_MEMBERSHIP_ENABLED=true`，然后重新部署。

**Q: 支付下单报 "支付方式(type)不能为空"？**
A: 当前版本已修复，默认使用支付宝。如果问题持续，检查 Vercel 部署是否为最新版本。

**Q: 支付成功但会员未开通？**
A: 检查：
1. 易付通回调地址是否正确配置
2. 域名是否在易付通白名单中
3. Vercel 函数日志中是否有回调处理错误
4. Supabase `payment_orders` 和 `profiles` 表数据是否正确

**Q: 如何更换支付商户？**
A: 修改 `YFT_MERCHANT_ID` 和 `YFT_SECRET_KEY` 环境变量，重新部署即可。

**Q: 如何接入其他支付平台（微信支付等）？**
A: 
1. 在易付通商户后台开通对应支付通道
2. 在 `src/lib/payment/yft.ts` 中修改 `type` 参数值
3. 前端会员页添加支付方式选择器

### 管理员

**Q: 如何设置自己为管理员？**
A: 见[管理员后台](#管理员后台)中的「如何成为管理员」章节。推荐使用 `ADMIN_EMAILS` 环境变量。

**Q: 管理员后台打不开？**
A: 确认已设置管理员权限，检查 `ADMIN_EMAILS` 环境变量拼写是否正确（注意是 `ADMIN_EMAILS` 不是 `ADMIN_EMAIL`）。

### 部署

**Q: Vercel 部署后环境变量未生效？**
A: 在 Vercel Dashboard 添加环境变量后，需要**重新部署**（Redeploy）才能使变量生效。增量部署（`vercel deploy --prod`）会使用新变量。

**Q: 本地运行正常但线上报错？**
A: 检查：
1. Vercel 环境变量是否与 `.env.local` 一致
2. Supabase RLS 策略是否配置
3. Vercel 构建日志是否有 TypeScript 错误
4. `NEXT_PUBLIC_*` 前缀的变量是否在客户端代码中使用

---

## 维护与下线

### 日常维护

- **监控 Vercel 函数日志**：Vercel Dashboard → Functions → 查看错误和性能
- **监控 Supabase 数据库**：定期检查 `payment_orders` 和 `projects` 表大小
- **更新依赖**：`npm outdated` 检查，`npm update` 更新

### 下线

1. 打开 [Vercel Dashboard](https://vercel.com/dashboard)
2. 进入项目 → Settings → General → 滚动到底部 → Delete Project

### 重新上线

```bash
cd designflow-ai
npx vercel deploy --prod --yes
```

注意：重新上线需要重新配置所有环境变量。

---

> 最后更新：2026-06-09
