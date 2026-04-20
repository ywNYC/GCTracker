# 🤖 全自动公告更新 — GitHub Actions 方案

完全不碰 Cloudflare 后台。只改 Git 仓库。Cloudflare Pages 自动检测到提交就重新部署。

---

## 🏗️ 原理

```
每天 UTC 14:00 (EST 9am, 日期 8-21号)
    ↓
GitHub Actions 自动跑 scripts/scrape-bulletin.mjs
    ↓
抓 travel.state.gov → 解析 → 验证
    ↓
如果有变化 → 更新 bulletin.json → git commit + push
    ↓
Cloudflare Pages 检测到推送 → 自动重新部署（你现有机制）
    ↓
前端加载时 fetch('/bulletin.json') → 显示新数据
```

**失败了怎么办？** GitHub 自动给你发邮件（"Workflow failed: Auto-update Visa Bulletin"），里面有日志链接。

**成功但数据错了怎么办？** Git 版本历史里每一次改动都能看，随时可以 `git revert` 回滚。

---

## 📁 你需要放进仓库的3个文件

把 outputs 里的这些路径**完整搬过去**（保持目录结构）：

```
你的仓库/
├── .github/
│   └── workflows/
│       └── scrape-bulletin.yml        ← 定时任务配置
├── scripts/
│   └── scrape-bulletin.mjs            ← 爬虫脚本
└── green-card-assistant.jsx           ← 已改好（fetch /bulletin.json）
```

`bulletin.json` 不需要你手动放——爬虫第一次跑时会自动创建。

---

## 🚀 部署步骤（5分钟，一次性）

### Step 1: 提交 3 个文件到你的 repo

```bash
# 在你的项目根目录
mkdir -p .github/workflows scripts

# 把这俩文件放进去（从 /mnt/user-data/outputs/ 下载）
# .github/workflows/scrape-bulletin.yml
# scripts/scrape-bulletin.mjs

# 前端也更新
# green-card-assistant.jsx (已改)

git add .github/ scripts/ green-card-assistant.jsx
git commit -m "feat: add GitHub Actions auto-scrape for visa bulletin"
git push
```

### Step 2: 允许 Actions 写入 repo（1次点击）

1. 打开你的 GitHub repo
2. **Settings** → **Actions** → **General**
3. 滚到最下面 **Workflow permissions**
4. 选 **Read and write permissions**
5. 点 **Save**

**就这一步**。这允许 workflow 把新的 bulletin.json commit 回来。

### Step 3: 手动跑一次测试

1. GitHub repo → **Actions** tab
2. 左边列表找到 **Auto-update Visa Bulletin**
3. 右上角 **Run workflow** → **Run workflow**
4. 等 ~30 秒，看结果

**可能结果：**

| 结果 | 含义 | 要做什么 |
|---|---|---|
| ✅ Green check, 有新 commit | 抓取成功，bulletin.json 已生成 | 等 ~1 分钟 Cloudflare 重部署，访问网站验证 |
| ✅ Green check, 无 commit | "Already up to date" | 也算正常，公告还没发 |
| ❌ 红色 X (exit 2) | 解析失败 (travel.state.gov 改结构了) | 查 log, 可能需要修 parser |
| ❌ 红色 X (exit 1) | 网络错误等 | 重试一次；连续失败再排查 |

### Step 4: 验证前端

打开你的网站，F12 开控制台，刷新页面。应该看到：

```
[bulletin] Loaded fresh data: 2026-05 source: github-actions-auto
```

或者（如果爬虫还没首次跑成功）：

```
[bulletin] Using hardcoded fallback: fetch-not-ok
```

两种都正常。第一种说明自动更新已生效，第二种说明还在用硬编码（安全兜底）。

---

## 📊 监控 & 日常使用

### 每次 workflow 运行后会怎样？

**GitHub UI**: Actions tab 里每次运行都有记录。点进去能看：
- 完整 log（抓的 URL、解析结果、validation 输出）
- "Summary" 部分有人类友好的总结

**邮件通知**: 默认 GitHub 只在 workflow 失败时给 repo owner 发邮件。成功不发（避免骚扰）。如果想成功也收邮件：
- GitHub profile → **Settings** → **Notifications** → **Actions** → 勾 "Send notifications for successful workflows"

### 如果发现数据错了怎么修复？

```bash
# 方法1: 直接改 bulletin.json 提交
# (打开文件，改好错的日期，commit push)

# 方法2: 回滚到上个月的数据
git log --oneline bulletin.json        # 找到上次的 commit
git revert <commit-hash>               # 回滚那次 auto-update

# 方法3: 手动重新跑爬虫
# GitHub Actions → Run workflow
```

### 查看历史

```bash
# 看每个月 bulletin.json 怎么变的
git log --follow bulletin.json

# 看某次 commit 具体改了什么
git show <commit-hash> -- bulletin.json
```

---

## 💰 费用

**GitHub Actions 免费额度**（public repo 无限；private repo 每月 2000 分钟）:
- 我们每月触发 ~14 次 × 每次 ~30 秒 = ~7 分钟
- **占免费额度的 0.35%**，完全不用担心

**爬虫访问 travel.state.gov**: 完全免费（公开数据）。

**总成本**: $0。

---

## 🔧 文件结构详解

### `.github/workflows/scrape-bulletin.yml`
- Cron: `0 14 8-21 * *` (UTC 14:00 = EST 9am 的 8-21号)
- 权限: `contents: write` (允许 commit 回来)
- 步骤: checkout → setup-node → run script → detect changes → commit+push

### `scripts/scrape-bulletin.mjs`
- 纯 Node.js，**零依赖**（用 Node 20+ 内置的 `fetch`）
- 智能模式：
  - 首次运行 (bulletin.json 不存在) → 抓**当前月**（seed）
  - 正常运行 → 抓**下个月**（新公告）
- Exit code: `0` = 正常（可能有/无变化）, `1` = 网络错误, `2` = 解析失败

### `bulletin.json` (自动生成)
格式：
```json
{
  "lastUpdated": "2026-05-15T14:00:00.000Z",
  "source": "github-actions-auto",
  "sourceUrl": "https://travel.state.gov/.../visa-bulletin-for-june-2026.html",
  "current": {
    "month": "2026-06",
    "scrapedAt": "2026-05-15T14:00:00.000Z",
    "finalAction": {
      "EB1": { "Other": "C", "China": "2023-01-15", "India": "2022-09-01", "Mexico": "C", "Philippines": "C" },
      "EB2": { ... },
      ...
    },
    "filing": { ... }
  },
  "previous": {
    "month": "2026-05",
    "finalAction": { ... },
    "filing": { ... }
  }
}
```

前端的 `bulletinCurrent` / `bulletinPrevious` 会被这个文件的 `current` / `previous` 替换。

---

## 🛡️ 风险 & 兜底

| 风险 | 概率 | 兜底 |
|---|---|---|
| travel.state.gov 改 HTML 结构 | 低 (10年没大改) | 解析失败 exit 2 → GitHub 邮件警告 → 你手动改 parser |
| 网络 transient 错误 | 中 | 第二天 cron 自动重试 |
| GitHub Actions 宕机 | 极低 | 前端有硬编码 fallback 兜底 |
| 数据写错了 | 低 | Git 历史，随时 revert |

---

## ⚠️ 诚实说一下

**解析器从未用真实 travel.state.gov 数据测试过**（我没法爬外网）。第一次真实运行大概率需要微调——但不会影响你网站正常运行：

1. 爬虫验证失败 → **不会写入** bulletin.json（你仓库干净）
2. 前端自动用**硬编码 fallback**
3. 你**GitHub 邮件收到警告** "Workflow failed"
4. 把失败日志发我，我修 parser 一般 < 5 分钟

---

## 🎯 部署检查清单

- [ ] 3个文件推送到 repo (`.github/workflows/scrape-bulletin.yml`, `scripts/scrape-bulletin.mjs`, 更新后的 `green-card-assistant.jsx`)
- [ ] GitHub **Settings → Actions → General → Workflow permissions** 设为 "Read and write"
- [ ] 手动 `Run workflow` 测试一次，看 log
- [ ] 浏览器打开网站，F12 控制台查看 `[bulletin]` log
- [ ] （可选）打开 **Notifications → Actions → Send notifications for successful workflows**

全勾 → **完了，你可以永远忘记这事**。

---

_跟 Cloudflare Worker 方案相比：少配 5 项东西，免申请 Resend API，数据版本可追溯，Cloudflare Pages 照常工作。真·无脑。_
