# 交接 · 2026-08-06

下一轮会话从这份开始读。项目规则见 `CLAUDE.md`（同目录，会自动加载）。

---

## 下一轮第一件事：月度更新邮件

**这是整条产品链唯一缺失的一环。** 订阅系统能收人了，但公告更新时**没有任何东西会通知他们**。
`_emailTemplates.js` 只有 welcome / confirm / unsubscribe 三个模板，`scripts/` 里没有发送逻辑。
`DEPLOY-BACKEND.md` 里那段 `send-monthly.js` 是示意草稿（数字硬编码），从未落地。

### 已和用户约定的做法

1. **先渲染一封出来发给用户看**，确认内容方向对了再接发送脚本——不要闭门造车做完整条。
2. 渲染用**真实数据**：用户的 case 是 **F4 / China / PD 2015-06-01**，收件 `ywang0226@gmail.com`，
   数据用 `public/history.json` 里真实的 2026-07 → 2026-08。

### 内容要求

邮件必须**按每个订阅者的 case 个性化**，回答三个问题：

> 我的排期动了吗？动了多少？还要等多久？

F4 中国 7→8 月实际推进 **243 天**（2009-01-01 → 2009-09-01），这是罕见的大幅前进，
邮件应该突出这种变化，而不是套一句"本月有更新"。

### 技术要点

计算逻辑（`computeStatus` / `computeHybridAdvance` / `estimateMonthsToReachPD` / `RATES_DB`）
目前全部埋在 `src/App.jsx` 里。发送脚本在 Node 环境跑，**需要把这些抽成一个共用模块**，
不要复制粘贴一份到脚本里——两份会漂移。

注意 `RATES_DB.recent` 在浏览器里是**运行时**被 `history.json` 覆盖的（见 App.jsx 的 history effect）。
脚本里要复现同样的覆盖逻辑，否则邮件里的预测和网站上显示的对不上。

---

## 还欠着的 A：订阅区勾选顺序

用户发现「订阅项目的勾选」排在订阅表单**下面**，未订阅时被长表单推到下方，观感上像是"订阅完才出现"。

- 勾选块在 `src/App.jsx` 约 5545 起（`alertItems.map`），在 `{!isSubscribed ? ... : ...}` 三元表达式**之外**
- 要把它整块移到订阅表单**之前**
- 上轮没做的原因：两个块各几十行 JSX，token 见底时盲搬有搞坏布局的风险

功能性问题（切换开关不同步服务器）**已在 commit `5f196d9` 修复**，A 现在只是观感问题。

---

## 当前状态

| 环节 | 状态 |
|---|---|
| 抓取公告数据 | ✅ 可用（`npm run scrape`） |
| 网站显示 2026-08 | ✅ 已上线 |
| 26 个月历史 + 月份选择器 | ✅ 已上线 |
| 预测锚用真实数据 | ✅ 已上线 |
| 订阅收集 + 双重确认 | ✅ 已上线 |
| **公告更新通知订阅者** | ❌ **不存在 ← 下一轮做这个** |
| GitHub Actions 自动更新 | ⏸ 等 GitHub 故障恢复后重跑验证 |

---

## 其他已知问题（按优先级）

1. **`U`（Unavailable）被 `parseDate` 转成 `null`**，与"缺数据"撞车。2026-08 的 EB2 印度即为 `U`，
   前端只判断 `days === null`，会渲染成"排期未到"，语义错误。改动涉及数据契约（scraper 输出 + App.jsx 渲染）。
2. **Turnstile 验证码未加** —— 需要用户在 Cloudflare 建 Turnstile 拿 site key + secret，AI 拿不到。
   限流（同 IP 每小时 5 次）已挡住大部分脚本刷量，有真实流量后再加。
3. **预测仍以单月环比作为观测速率**（权重 0.55），建议改为近 3 月中位数抗噪。
   本轮只换了失真的锚，没动模型结构。
4. `DEPLOY-BACKEND.md` 已过时（描述手动拉 CSV 发信的旧方案，代码已升级为自动发信）。
5. `src/App.jsx` 单文件约 11000 行；主包 542 KB 未做代码分割。

---

## 别重踩的坑

- **Retry deployment 不会应用新的 KV 绑定/变量**，它重放旧部署的配置快照。必须触发**新部署**
  （推一个空提交即可）。错误提示只说 `KV namespace SUBSCRIBERS not bound`，不会告诉你是部署没刷新。
- **`travel.state.gov` 对非浏览器客户端整站 403**（Cloudflare bot management）。用 `adoption.state.gov`。
- **公告 URL 路径是美国财年不是日历年**：10–12 月的公告归档在下一年目录。
- **Cloudflare 会拦 python urllib**（错误码 1010），测接口用 `curl`。
- **`gh auth login` 默认权限不含 `workflow`**，要动 `.github/workflows/` 需 `gh auth refresh -s workflow`。
- **找不到的 GitHub 设置优先查 API**，别教用户在 UI 里翻——手机版 GitHub 很多设置根本不显示。
  例：`gh api -X PUT repos/{owner}/{repo}/actions/permissions/workflow -f default_workflow_permissions=write`
- **限流计数器和订阅数据同在 `SUBSCRIBERS` KV**，前缀 `rl:`，遍历订阅者时必须跳过。

---

## 边界

- **推 `main` 即上线**（Cloudflare Pages 自动部署），推送前先问用户。
- 代码不进 kb。kb 里只有一页索引：`~/kb/projects/GCTracker 绿卡排期追踪站.md`。
- 不要向用户索取 Cloudflare 登录凭证或 `ADMIN_TOKEN`——会永久留在对话记录里。
