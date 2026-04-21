# 🎨 设计重构简报 · Design Brief

把这份文档粘给一个新的 Claude 对话，它会立刻理解本项目的现状、用户、约束和目标，无需你重复描述。

---

## 📱 产品是什么

**绿卡排期助手**（Green Card Priority Date Assistant）

一个帮助美国移民申请者追踪、分析、预测 Visa Bulletin 排期的 Web 工具。
- 核心用户: 在美华人专业人士，中国/印度出生的EB-2/EB-3 申请人为主
- 主要入口: **小红书** (Xiaohongshu) 分享流量
- 使用场景: 手机浏览 (iPhone WebView 为主)，短时间查看、分享截图

## 🎯 核心价值主张

排期数据是枯燥的表格。这个产品把它做成：
1. **个性化** — 输入你的情况一键诊断，而不是"去对照官方表格"
2. **AI 预测** — 基于26年历史数据，告诉你"什么时候可能到你"
3. **全流程** — 从排期到 I-485 递件到拿卡的整个journey都覆盖
4. **三语** — 简/繁/英文

## 📊 当前功能地图（10个 Tab）

| Tab | 中文名 | 作用 | 优先级 |
|---|---|---|---|
| overview | 总结 | 一屏看完你的案子状态 | ⭐⭐⭐ 首屏 |
| dashboard | 我的状态 | 详细排期诊断 | ⭐⭐⭐ |
| trends | 排期预测 AI | 26年走势图 + AI 未来预测 | ⭐⭐⭐ 亮点 |
| forecast | 下月预测 | 5级场景预测（乐观→悲观）| ⭐⭐ |
| update | 本月更新 | 月对月变化 | ⭐⭐ |
| i485 | I-485 流程 | 6步时间线 | ⭐⭐⭐ |
| scenarios | 情景 | What-if 分析 | ⭐⭐ |
| compare | 对比 | 跨国家/类别对比 | ⭐⭐ |
| alerts | 提醒 | 邮件订阅 | ⭐ |
| help | 帮助中心 | FAQ + 术语 + 数据来源合并 | ⭐ |

## 🌟 最近新功能

### 时光机 🕐
顶部有个按钮，可以切到过去月份视角（3月/4月/5月）。切换后**全局数据同步**变成那个月的快照。用户可以"回到过去看当时排期什么样"。

### 自动更新
GitHub Actions 每月自动爬 travel.state.gov，写入 `bulletin.json`，Cloudflare Pages 自动重部署。**零维护**。

### 邮件订阅
有 Cloudflare Pages Functions 后端 (`/api/subscribe`)，用户可填邮箱+案子信息订阅排期变化。

## 🎨 当前视觉风格（要评估是否保留）

- **主色**: Indigo + Emerald（靛蓝 + 翠绿），偶尔 Purple（AI 相关）
- **字体**: 中文 PingFang SC / 英文 system-ui
- **布局**: Tailwind `rounded-2xl` 卡片 + `shadow-sm` + `border-slate-200`
- **尺寸**: 手机优先，字号 `text-[9px]` ~ `text-xs`，间距 `p-2` ~ `p-3`
- **倾向**: 信息密度偏高（用户抱怨过滚动太多），追求"一屏看尽"

## 🔴 已知问题 / 改进方向

### 用户反馈过的痛点
1. **信息密度过高** — 某些 tab 仍要反复滚动
2. **Tab 太多** — 从12个缩减到10个，仍显拥挤
3. **Logo 通用** — 之前是 Globe 图标，最近改成自定义绿卡+箭头 SVG
4. **移动端体验不够精致** — 虽然是移动优先设计，但没达到"原生 app"质感

### 作者 (J W) 的审美偏好
- 喜欢紧凑但不拥挤
- 喜欢**数据可视化**（waterfall、radar、benchmark bar）
- 喜欢深色主色 + 亮色 accent 的组合
- **不喜欢 AI 生成文字感明显的 UI**（比如过多 gradient、过多 emoji）
- 喜欢 Apple/Stripe 那种**"精确克制"的感觉**

## 🧭 设计重构目标（建议方向）

如果要做一次 UI 重构，可以考虑：

### 1. 视觉语言升级
- 减少 emoji 使用，用精准的 lucide 图标
- 统一字号等级体系（目前太多 `text-[9px]`、`text-[11px]`等随意值）
- 引入 clear hierarchy：主标题 / 次级 / 正文 / 辅助 4 档就够
- 考虑深色模式或者单色卡片 + 彩色 accent

### 2. 首屏信息架构
- 总结 tab 应该是"一眼 wow"级：用户打开立刻知道自己状态
- 现在 Overview 有点长，可以考虑 "hero 数字 + 卡片"布局
- 用大字号数字（比如`text-5xl`）呈现关键数据

### 3. 移动原生感
- 考虑底部 tab bar（像 iOS app）而不是顶部双行 tabs
- 下拉刷新、滑动切换 tab 等手势
- 过渡动画（react-spring 或 framer-motion）

### 4. 数据可视化增强
- Trend chart 已经很好，但配色可以更柔和
- 添加 sparkline 迷你图显示在卡片里
- 使用 `recharts` 统一风格

### 5. 品牌识别度
- 当前 logo (绿卡+箭头 SVG) 还行，但可以更有记忆点
- 产品名可能需要更抓人的副标题
- 配色是否需要一个独特的"signature color"

## 📐 技术栈（不要改）

- React 18 + Hooks (useState, useMemo, useEffect)
- Tailwind CSS 3 (不要引入其他 CSS 框架)
- Vite (构建)
- Lucide React (图标库)
- 部署: Cloudflare Pages + GitHub Actions

## 🔒 重要约束

1. **必须保持 3 种语言支持** (en/zh/tw)
2. **必须兼容 iPhone WebView 和 Xiaohongshu in-app browser**（这俩是主要流量入口）
3. **文件结构**: 目前所有代码在单一 `src/App.jsx` (~8300 行)。可以拆分但要谨慎（用户是 vibe-coder, 大量文件反而难维护）
4. **不要用 localStorage/sessionStorage**（部分嵌入环境不支持）
5. **不要用复杂表单库**（仍然用原生 input）

## 📋 交付方式

如果你要在新对话里做设计：

**选项 A: 渐进式改进**
让 Claude 在现有 `src/App.jsx` 上逐个 tab 改进（低风险）

**选项 B: 完全重构**
让 Claude 做一个全新的 UI 层，保留业务逻辑。可以拆分为：
- `src/App.jsx` (路由 + 数据)
- `src/components/ui/*` (设计系统)
- `src/features/*/` (每个 tab 独立目录)

**选项 C: 先做 mock**
让 Claude 先出一个单独的 HTML/React 概念稿，获批后再落地到主代码库

## 💡 建议的"启动提示词"（给新对话）

```
这是一个现有的 React + Tailwind 移民排期应用。阅读 DESIGN-BRIEF.md 了解项目。
我想对它做 UI 重构，目标是 [你的目标]。

请先：
1. 读 src/App.jsx 前 500 行，理解 i18n 和样式约定
2. 阅读 README.md 和 DESIGN-BRIEF.md
3. 提出 3-5 个设计方向让我选，每个方向有明确取舍
4. 不要立刻改代码

我们决定方向后再开始。
```

---

## 🎁 彩蛋: 完整功能清单 (给新对话参考)

- [x] 三语支持（EN/简/繁）
- [x] 排期数字诊断（Table A + Table B 智能选择）
- [x] AI 预测曲线（26年历史 + 5级场景）
- [x] I-485 6步追踪（动态阶段：远/近/可递/已递）
- [x] 月度变化视图
- [x] 跨国对比
- [x] 时光机（3个月历史视角切换）
- [x] 邮件订阅后端
- [x] 自动爬虫更新
- [x] 帮助中心（FAQ + 术语 + 数据来源）
- [x] 专属报告生成
- [x] 三国家对比（中国/印度/其他）

就这些。希望新对话的 Claude 能给你一个惊艳的设计。
