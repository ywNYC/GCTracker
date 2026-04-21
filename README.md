# 绿卡晴雨表 · Green Card Tracker

一个陪伴你走完美国绿卡全生命周期的 React 应用 — 从排期查询、I-485 流程追踪、到获批后的 I-751 / N-400 规划。

A comprehensive React app that accompanies you through the entire U.S. green card lifecycle — from visa bulletin tracking and I-485 progress to post-approval I-751 / N-400 planning.

**🌐 Live demo**: _add your deployment URL here_

---

## ✨ 主要功能 · Features

### 排期追踪 · Visa Bulletin
- **双表状态卡** — 递件表 B + 排期表 A 并列显示,一眼看清"可递件 ≠ 可获批"
- **分档等待文案** — 24+ mo / 12–24 mo / 6–12 mo / <6 mo 四档不同情感温度
- **时光机** — 回看任意历史月份的排期状态
- **AI 走势预测** — 基于 21 年历史数据的 5 级场景(乐观 → 悲观)
- **跨国对比** — CHN / IND / MEX / PHL / ROW 并列

### I-485 流程 · Adjustment of Status
- **6 步时间线** — 收据 → 指纹 → EAD → AP → 面试 → 最终批准
- **服务中心速度** — 快 / 平均 / 慢(0.75× / 1.0× / 1.35×)影响时间估计
- **级联勾选** — 勾第 3 步,1-3 全自动勾上;取消第 3 步,3-6 全自动取消
- **Forecast 联动** — 切速度时 Forecast 图表的"预计获批日"同步更新

### 获批后生命周期 · Post-Approval
- **庆祝面板** — 一次性五彩纸屑动画 + editorial"里程碑"排版
- **I-751 窗口提醒** — 条件绿卡 CR-1,自动计算 2 年前 90 天窗口
- **N-400 倒计时** — 3 年(USC 配偶)/ 5 年(默认)到期天数
- **Header GC 快捷入口** — 从任何 tab 点开绿卡 mini 仪表盘
- **旅行记录** — 出入境日期记录,超 180 天单次出境警告(打断连续居留)
- **分享卡片** — 1080×1350 SVG 海报(Xiaohongshu / IG / 朋友圈格式)+ PNG 导出

### 体验 · UX
- **三语支持** — 简体中文 / 正体中文 / English
- **4 种主题** — 晨间 / 典章 / 朱批 / 刊(editorial 风格)
- **URL 状态分享** — 每个案子生成 shareable 链接
- **Bloomberg / FT / Economist** 式信息密度
- **纯 CSS 五彩纸屑** — 零外部依赖,~1.5KB

---

## 🚀 快速开始 · Quick Start

```bash
# Clone
git clone https://github.com/YOUR_USERNAME/green-card-tracker.git
cd green-card-tracker

# Install
npm install

# Dev server
npm run dev
# → http://localhost:5173

# Production build
npm run build
# → outputs to ./dist
```

### 抓取最新排期数据

```bash
# 从 travel.state.gov 抓取最新 Visa Bulletin
npm run scrape

# 首次运行时爬取历史数据 (过去 20+ 年)
npm run scrape:seed
```

---

## 📂 项目结构 · Project Structure

```
├── src/
│   ├── App.jsx              # 主应用 (~12,000 行,所有 UI + 逻辑)
│   ├── main.jsx             # React 入口
│   └── index.css            # Tailwind + 全局样式
├── public/
│   ├── favicon.svg
│   └── bulletin.json        # 排期数据(GitHub Actions 自动更新)
├── scripts/
│   └── scrape-bulletin.mjs  # 从 travel.state.gov 爬取 Visa Bulletin
├── .github/workflows/
│   └── scrape-bulletin.yml  # 每月 8-21 号每天 9am EST 自动抓取
├── functions/api/           # Cloudflare Pages Functions (可选邮件订阅后端)
│   ├── subscribe.js
│   └── admin/
│       └── subscribers.js
├── bulletin.json            # 本地抓取产物(被 public/ 镜像)
├── DESIGN-BRIEF.md          # 设计语言文档
├── AUTOMATED-UPDATES.md     # 自动化详解
├── DEPLOY-BACKEND.md        # 后端部署
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── package.json
```

---

## 🌐 部署 · Deployment

### Cloudflare Pages (推荐)

免费,全球 CDN,GitHub 集成:

1. Push repo 到 GitHub
2. [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**
3. 选 repo,配置:
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Node version**: `20`
4. **Save and Deploy**

后续每次 `git push` 自动重部署。

### Vercel

```bash
npx vercel
# Framework: Vite (auto-detected)
# Build: npm run build
# Output: dist
```

### 本地构建后手动上传

```bash
npm run build
# 上传 dist/ 到任何静态托管(Netlify / GitHub Pages / S3)
```

---

## 🤖 自动更新排期数据

每月 Visa Bulletin 发布时(通常 8-15 号),GitHub Actions 会自动:

1. 抓取 travel.state.gov 最新公告
2. 对比本地 `bulletin.json`
3. 有变化 → commit → 触发 Cloudflare Pages 重部署

**启用步骤**:

1. **Settings** → **Actions** → **General** → **Workflow permissions** → 选 **Read and write permissions**
2. **Actions** tab → **Run workflow** 手动测试
3. 之后每月 8-21 号每天 9am EST 自动运行

详见 [AUTOMATED-UPDATES.md](./AUTOMATED-UPDATES.md)。

---

## 📧 邮件订阅(可选)

想让用户订阅排期变化通知:

1. Cloudflare Dashboard → **Workers & Pages** → **KV** → 创建命名空间 `SUBSCRIBERS`
2. Pages 项目 → **Settings** → **Bindings** → 绑定 KV
3. `functions/api/subscribe.js` 已包含,push 即生效

详见 [DEPLOY-BACKEND.md](./DEPLOY-BACKEND.md)。

---

## 🎨 技术栈 · Tech Stack

| 层 | 选型 |
|----|------|
| UI 框架 | React 18 + Hooks |
| 构建 | Vite 5 |
| 样式 | Tailwind CSS 3 (hand-tuned editorial) |
| 图标 | Lucide React |
| 持久化 | `localStorage` (案子状态 / I-485 进度 / 绿卡信息 / 旅行记录) |
| 图表 | 手写 SVG(无 chart 库依赖) |
| 部署 | Cloudflare Pages / Vercel / Netlify |
| 自动化 | GitHub Actions(月度抓取) |
| 后端(可选)| Cloudflare Pages Functions + KV |

**零运行时外部依赖**(除了 React / lucide-react / Tailwind 编译产物)。

---

## 🗂 本地状态持久化

所有状态都在 `localStorage`,不需要账号或后端:

| Key | 内容 |
|-----|------|
| URL query params | 当前案子(category / country / PD / inUS / petitioner) |
| `gc_greenCardInfo` | 获批日 / CR-1 / celebrated flag |
| `gc_travelRecords` | 出入境记录数组 |
| `gc_i485ServiceCenter` | I-485 服务中心速度 |

切换案子 ≠ 清空绿卡信息(绿卡是永久的)。

---

## 📝 许可证 · License

MIT License — see [LICENSE](./LICENSE)

数据来源: [travel.state.gov Visa Bulletin](https://travel.state.gov/content/travel/en/legal/visa-law0/visa-bulletin.html)

---

## ⚠️ 免责声明

**本工具仅供信息参考,不构成法律建议**。

- 排期数据以 travel.state.gov 官方为准
- I-485 / I-751 / N-400 时间估计来自社区经验均值,实际因个案差异极大
- 重大移民决策请咨询持牌移民律师

---

## 🤝 Contributing

PRs welcome. 主要扩展方向:

- 更多 category 的历史数据回填
- PERM 阶段跟踪(H-1B / O-1 / F-1 → I-140)
- AI 律师对话(通过 Claude API)
- iOS / Android 原生 wrapper

---

Built with Claude + React · Last updated 2026
