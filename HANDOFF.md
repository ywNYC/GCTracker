# 交接 · 2026-08-07

下一轮会话从这份开始读。项目规则见 `CLAUDE.md`（同目录，会自动加载）。

---

## 立刻要知道的三件事

1. **PR #3 开着没合，线上仍是错的。** https://github.com/ywNYC/GCTracker/pull/3
   分支 `fix/forecast-real-data`。合并前 `gc.jmjvc.us` 的预测页仍显示 2037 年那个错数字。
2. **这个仓库是 PUBLIC。** 任何真实邮箱、优先日、密钥都不能进代码。
   `scripts/render-monthly-preview.mjs` 已改为全部从环境变量读，别改回硬编码。
3. **Resend API key 曾在一次对话记录里出现过。** 若介意，去 Resend 后台吊销重发，
   并同步更新 Cloudflare Pages 的 `RESEND_API_KEY`。

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

### 还欠的：批量发送脚本

`scripts/send-monthly.js` 不存在。需要：遍历 `SUBSCRIBERS` KV（**跳过 `rl:` 前缀**，
那是限流计数器）→ 过滤 `confirmed === true` → 逐个算 `computeCaseUpdate` →
只给类别有变化的人发 → 调 Resend。

预览脚本可参考跑法：
```
PREVIEW_TO=you@example.com RESEND_API_KEY=re_xxx RESEND_FROM="..." \
  node scripts/render-monthly-preview.mjs [--dry-run]
```
`--dry-run` 只写 `/tmp/gc-monthly-preview.html` 不发信。

---

## 邮件里的两个设计决定（别无意中改回去）

- **图表必须是 table + 背景色方块。** Gmail 剥掉内联 `<svg>`，Outlook 的 Word 引擎不支持
  SVG，外链 PNG 在多个客户端默认被拦。所以没有图片、没有脚本。代价是没有 hover。
- **前进/倒退用 `#0d7cb5` / `#c1571f`，不要换回绿/红。** 原来的深绿 `#0e4d2e` 与暗红
  `#8b3a3a` 在红绿色盲下 ΔE 只有 **2.0**（不可区分），新配色 20.8。

---

## 抓取扩展（用户已确认要做，还没开始）

现在只抓四张排期表。已实地核对 2026-08 公告，**确认可抓**：

| 内容 | 位置 | 备注 |
|---|---|---|
| DV 当月排期 | B 节，7 地区 × 3 列 | 带国家例外（Algeria/Egypt/Nepal） |
| DV **下月**预告 | C 节 | 前瞻数据，八月公告里就登了九月截止号 |
| D/E/F/G 说明段 | 纯文本 | **E/F 是明确的倒退预警**，对通知产品价值极高 |
| F2A 免限额日期 | 五个单格小表 | 2026-08 是 `22MAR05` |
| 年度配额数字 | A 节段落 4/5 | FY 上限、各优先级百分比 |
| 公告元数据 | 页首 | Volume XI、Number 17、CA/VO 日期 |

**USCIS「用哪张表」要单独抓一个源。** 公告本身不含判定，只写「去 uscis.gov/visabulletininfo 查」。
该页 `curl` 返回 200（会跳转到 `.../adjustment-of-status-filing-charts-from-the-visa-bulletin`），
表述规整，还有「Next Month's」区块。2026-08 的答案是：**家庭类用表 B，就业类用表 A**。

> 注意：F4 属家庭类，八月 USCIS 认的是表 B。邮件目前把表 A 放主位——对家庭类而言主次是反的，
> 等这个抓取做好后可以直接给出当月确定答案。

---

## 当前状态

| 环节 | 状态 |
|---|---|
| 抓取公告数据 | ✅ 可用（`npm run scrape`，本地验证过 404 优雅退出） |
| 网站显示 2026-08 | ✅ 已上线 |
| 26 个月历史 + 月份选择器 | ✅ 已上线 |
| 订阅收集 + 双重确认 | ✅ 已上线 |
| 预测页用真实数据 | ⏳ **PR #3 待合并** |
| 月度邮件模板 | ⏳ 随 PR #3 待合并 |
| 批量发送脚本 | ❌ 不存在 |
| GitHub Actions 自动更新 | ❌ **从未成功跑通过一次** |
| 订阅区勾选顺序（A） | ❌ 未做 |

---

## GitHub Actions：唯一一次运行是失败的

run `31123677747` 失败原因是 `The job was not acquired by Runner of type hosted` ——
GitHub 没把托管 runner 派下来，脚本压根没执行。是 GitHub 的故障，不是代码问题，
但**这条链至今没有被端到端证明过**。

cron 是 `0 14 8-21 * *`（每月 8–21 号）。九月公告通常 8–15 号发布，所以正常情况下
它会自己抓到。想手动验证的话现在跑是**空转**（九月尚未发布，404 → exit 0，不 commit
不部署），能证明管道通不通。

---

## 还欠着的 A：订阅区勾选顺序

勾选块在 `src/App.jsx` 的 `alertItems.map` 附近，在 `{!isSubscribed ? ... : ...}` 三元
表达式**之外**，要整块移到订阅表单**之前**。未订阅时被长表单推到下方，观感像是
「订阅完才出现」。功能性问题已在 `5f196d9` 修复，这里只剩观感。

> 注意：PR #3 动过 `src/App.jsx`，行号已偏移，动手前先 grep 定位。

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
