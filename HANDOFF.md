# 交接 · 2026-08-07（第二次更新）

下一轮会话从这份开始读。项目规则见 `CLAUDE.md`（同目录，会自动加载）。

---

## 立刻要知道的三件事

1. **GitHub 账号因 billing 被锁，Actions 完全跑不了。** run 31158607139 的错误是
   「account is locked due to a billing issue」——这才是自动更新从未成功的真正原因
   （不是 runner 故障）。只有用户能修：GitHub Settings → Billing。解锁后
   `gh workflow run scrape-bulletin.yml` 验证一次。
2. **这个仓库是 PUBLIC。** 任何真实邮箱、优先日、密钥都不能进代码。
   `scripts/render-monthly-preview.mjs` 已改为全部从环境变量读，别改回硬编码。
3. **Resend API key 曾在一次对话记录里出现过。** 若介意，去 Resend 后台吊销重发，
   并同步更新 Cloudflare Pages 的 `RESEND_API_KEY`。

（PR #3 —— 预测页改用真实数据 —— 已于 08-07 合并上线，交叉点 2037→2033。）

---

## PR #3 做了什么（等合并）

**根因：长期走势图完全跑在假数据上。** `generateHistoricalData()` 锚定写死的
`bulletinMay2026` 种子，再用一张编造的速率表（`'F4-China': 8` 天/月）倒推「最近 12 个月」。
于是图上观测速度**按构造恒等于那个编造的常数**，起点又落后真实公告三期。两个偏差同向
叠加，把 F4 中国交叉点推到 2037/3；用真实数据是 2033/6。

- `generateHistoricalData` 改读 `BULLETIN_ARCHIVE`（history.json 的 26 期真实公告），
  早于存档的月份才走 `interpolateCutoff`。编造的速率表已删。
- 新增 `BULLETIN_CURRENT_KEY` + `bulletinAnchorDate()`，替掉四处写死的 `new Date(2026, 4, ...)`。
- 新增 `observedPaceFromArchive()`，坐标轴自动缩放与图上曲线共用一个估计器
  （此前一个用单月、一个用窗口均值，差数年）。
- `computeForecast` 返回区间，**默认保守端**（近 12 月均速），UI 可切换口径并有说明。
- 邮件模板同步同一区间、同一取整与年/月阈值。

**合并前没做的验证：观感。** 「下月预测」里的口径切换器是新组件，手机上的间距/换行没人看过。

**合并后用户会看到明显落差**：同一个 F4 中国案子，原来说约 14 个月，现在默认说 6.9 年。
这是有意的（宁保守不乐观），但如果要发公告，这是要说明的点。

---

## 月度更新邮件：模板好了，发送逻辑还不存在

`renderMonthlyUpdateEmail()` 在 `functions/api/_emailTemplates.js`，已随 PR #3 提交。
经过多轮真机预览定稿，包含：按 case 个性化、表A/表B 变化、预测区间、
12 个月逐月推进条形图、深链接。

计算逻辑抽在 **`scripts/lib/gcMath.mjs`**（Node 侧），与 `src/App.jsx` 是**两份平行实现**。
改模型时两边都要改——文件顶部注释里写了这条。

### 批量发送：已实现为 POST /api/admin/send-monthly

`functions/api/admin/send-monthly.js`（Pages Function，因为 KV 只有它能碰）。
公告更新后手动触发：

```
curl -X POST https://gc.jmjvc.us/api/admin/send-monthly \
  -H "Authorization: Bearer $ADMIN_TOKEN"          # ?dryRun=1 先看会发给谁
```

- 遍历 KV 跳过 `rl:`，只发 `confirmed === true` 且类别有变化的人
- **幂等**：成功发送后往记录写 `lastNotifiedMonth`，同月重跑不会二次发送（`?force=1` 覆盖）
- 数据从 `${SITE_URL}/history.json` 拉（和前端同源），并复现 `applyRecentRateOverride`
- 若 `/uscis-charts.json` 覆盖当月，邮件注释自动换成「本月递 I-485 用表 X（USCIS 判定）」
- **尚未实发过一次真实批量**——第一次跑先 `?dryRun=1`

计算逻辑唯一实现在 `functions/api/_gcMath.js`（Pages 打包不跨 functions/ 边界），
`scripts/lib/gcMath.mjs` 只是 re-export。与 `src/App.jsx` 仍是两份平行实现，改模型两边都要动。

预览脚本跑法：
```
PREVIEW_TO=you@example.com RESEND_API_KEY=re_xxx RESEND_FROM="..." \
  node scripts/render-monthly-preview.mjs [--dry-run]
```

---

## 邮件里的两个设计决定（别无意中改回去）

- **图表必须是 table + 背景色方块。** Gmail 剥掉内联 `<svg>`，Outlook 的 Word 引擎不支持
  SVG，外链 PNG 在多个客户端默认被拦。所以没有图片、没有脚本。代价是没有 hover。
- **前进/倒退用 `#0d7cb5` / `#c1571f`，不要换回绿/红。** 原来的深绿 `#0e4d2e` 与暗红
  `#8b3a3a` 在红绿色盲下 ΔE 只有 **2.0**（不可区分），新配色 20.8。

---

## 抓取扩展：已完成

`scrape-bulletin.mjs` 现在额外解析（全部 **additive、软失败**——只 warn 不红灯，
四张排期表仍是唯一硬契约）：

- `dv` / `dvNext`：DV 当月 + 下月预告，6 地区 rank cutoff + 国家例外（是抽签排名数字不是日期，别喂 parseDate）
- `notices`：D 之后的字母节（标题 + 正文），**结构化解析**——字母严格递增、全大写标题，
  因为各月主题不同不能按内容匹配。E/F 这类倒退预警就在这里
- `f2aExempt`：F2A 免 per-country 限额日期（2026-08 实值是 `22JUL25` → 2025-07-22）
- `meta`：Volume / Number / CA-VO 日期

新增 `--force`：重抓已有月份以补新字段，且**不轮转 previous**（同月重抓时轮转会让
previous == current，破坏相邻月不变量——已在代码里防住）。2026-08 已用它补全。

**USCIS「用哪张表」也已完成**：`npm run scrape:uscis` → `public/uscis-charts.json`。
2026-08 实抓结果：家庭类=表 B（filing），就业类=表 A（finalAction）。三个消费方都接上了：
发信端点（邮件注释给确定答案）、前端（运行时覆盖 `FILING_AUTHORIZED`）、workflow（每日跑，`|| true` 软失败）。

历史月份如需补这些字段：按时间顺序对每个月跑 `--month=YYYY-MM --force`（注意相邻序）。

---

## 当前状态

| 环节 | 状态 |
|---|---|
| 抓取公告数据（含 DV/notices/meta） | ✅ 可用，2026-08 已带全字段 |
| USCIS 表格判定抓取 | ✅ 可用（`npm run scrape:uscis`），前端+邮件已接 |
| 网站显示 2026-08 | ✅ 已上线 |
| 预测页用真实数据 + 区间口径 | ✅ 已上线（PR #3） |
| 订阅收集 + 双重确认 | ✅ 已上线 |
| 订阅区勾选顺序（A） | ✅ 已修（勾选块移到表单前） |
| 月度邮件模板 | ✅ 在 main |
| 批量发送端点 | ✅ 代码完成，**从未实发过**（先 dryRun） |
| GitHub Actions 自动更新 | ❌ **被账号 billing 锁挡死**（见顶部第 1 条） |

cron 是 `0 14 8-21 * *`（每月 8–21 号）。billing 解锁后九月公告（通常 8–15 号发布）
会被自动抓到；随后需要有人（或未来的自动化）调 send-monthly 端点发信。

---

## 其他已知问题（按优先级）

1. **`U`（Unavailable）被 `parseDate` 转成 `null`**，与「缺数据」撞车。2026-08 的 EB2 印度
   即为 `U`，前端只判断 `days === null`，会渲染成「排期未到」，语义错误。
   改动涉及数据契约（scraper 输出 + App.jsx 渲染）。
2. **`_emailTemplates.js` 的 `formatCountry` 映射从未命中。** 它映射 `CHN`/`IND`/`ROW`
   三字母码，但订阅记录存的是 App 原始格式（`China`/`Taiwan`）。靠 `map[c] || c` 兜底
   才显示正常，想要的「China · 中国」永远出不来。
3. **Turnstile 验证码未加** —— 需要用户在 Cloudflare 建 Turnstile 拿 key，AI 拿不到。
4. `DEPLOY-BACKEND.md` 已过时（描述手动拉 CSV 发信的旧方案）。
5. `src/App.jsx` 单文件约 11000 行；主包 545 KB 未做代码分割。

---

## 别重踩的坑

- **推 `main` 即上线**（Cloudflare Pages 自动部署），推送前先问用户。改动走功能分支 + PR。
- **`dist/` 被 git 跟踪但 Cloudflare 是从源码构建的。** 本地 `npm run build` 会弄脏它，
  提交前 `git checkout -- dist/ && git clean -fdq dist/`。
- **深链接已经能用**：`?c=F4&ct=China&pd=2015-06-01&ps=USC`。App 里 `if (urlCase) return true`
  会把带 case 的访问判定为「已引导过」，直接跳过首次选择页。订阅记录存的 `userCase`
  格式与 URL 参数完全一致。
- **改优先日后端已通**：`/api/subscribe` 是 upsert，已确认的订阅者改设置不会重发确认信。
- **`travel.state.gov` 对非浏览器客户端整站 403**（Cloudflare bot management）。用 `adoption.state.gov`。
- **公告 URL 路径是美国财年不是日历年**：10–12 月的公告归档在下一年目录。
- **Cloudflare 会拦 python urllib**（错误码 1010），测接口用 `curl`。
- **Retry deployment 不会应用新的 KV 绑定/变量**，它重放旧部署的配置快照，必须触发新部署。
- **`gh auth login` 默认权限不含 `workflow`**，要动 `.github/workflows/` 需 `gh auth refresh -s workflow`。
- **限流计数器和订阅数据同在 `SUBSCRIBERS` KV**，前缀 `rl:`，遍历订阅者时必须跳过。

---

## 边界

- 代码不进 kb。kb 里只有一页索引：`~/kb/projects/GCTracker 绿卡排期追踪站.md`。
- 不要向用户索取 Cloudflare 登录凭证或 `ADMIN_TOKEN`。
