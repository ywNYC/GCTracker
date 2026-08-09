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
3. **两个密钥曾出现在对话记录里，属于已知弱点：**
   - `RESEND_API_KEY` —— 若介意，去 Resend 后台吊销重发
   - `ADMIN_TOKEN` 目前是 `gc-admin-8f3k2m9x7q4w1v6z`，这串是 AI 在对话中给的**示例值**，
     等同公开。它能导出订阅者名单（邮箱/优先日/出生国）并触发群发。
     用户已知悉并选择暂不更换。换的时候记得：改完 Cloudflare 变量后**必须推一个空提交**
     触发新部署才生效（Retry deployment 会重放旧配置快照）。

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

**2026-08-07 已在生产环境实跑并验证通过**：dryRun 与真实发送各一次，`sentCount: 1`
（当时唯一的已确认订阅者）；紧接着重跑一次得到 `sentCount: 0`、`alreadyNotified: 1`，
证明 `lastNotifiedMonth` 幂等保护有效。当时另有 1 个订阅者因未完成双重确认被正确跳过。

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
| 批量发送端点 | ✅ 已在生产实跑验证，含幂等保护 |
| 定时抓取（云端 routine） | ✅ 已生效，不依赖 GitHub |
| GitHub Actions 自动更新 | ❌ **被账号 billing 锁挡死**（见顶部第 1 条） |

## 定时抓取：云端 routine（GitHub Actions 的替代品）

https://claude.ai/code/routines/trig_01P9kcG21GxGKxXtpHUxsgsM

跑在 Anthropic 云上，不受 GitHub billing 锁影响。cron `0 13,17,21 10-23 * *`
——每月 10–23 号每天三次（美东 9:00 / 13:00 / 17:00）。抓到就自动提交推送上线并报告。
提示词第 0 步会先比对 `bulletin.json` 的 `current.month` 与「下个月」，已抓到就秒退，
所以命中之后那些触发几乎不消耗。

**发信仍需人工**：routine 只负责抓取上线，不调 send-monthly（云端 agent 拿不到
`ADMIN_TOKEN`，而仓库是公开的不能写进代码）。将来 billing 解锁后，最干净的接法是让
workflow 用 `${{ secrets.ADMIN_TOKEN }}` 在抓到新数据后调一次端点。

### 公告的真实发布日（别再搞错）

用 Wayback Machine 每期公告页最早成功快照实测（上个月的日）：
```
Sep→13 · Oct→12 · Nov→15 · Dec→14 · Jan→18 · Feb→12 · Mar→19 · Apr→17 · May→22 · Jul→18
```
真实范围 **12–22 号**，所以窗口取 10–23 号。

**不要用公告正文里的 `CA/VO: <date>` 当发布日** —— 那是签证办公室内部定稿日（约每月
1–5 号），据此设窗口会错过每一期。本轮踩过这个坑：一度把 cron 改成 1–6 号，
后经 Wayback 证据推翻。原来的 `8-21` 方向虽对，但会漏掉 22 号发布的五月号。

---

## 其他已知问题（按优先级）

1. **Turnstile 验证码未加** —— 需要用户在 Cloudflare 建 Turnstile 拿 key，AI 拿不到。
2. `DEPLOY-BACKEND.md` 已过时（描述手动拉 CSV 发信的旧方案）。
3. `src/App.jsx` 单文件约 13500 行；主包 ~550 KB 未做代码分割。
4. **`node_modules/`（6767 个文件）整个被 commit 在这个公开仓库里，且没有 `.gitignore`。**
   用户已知悉，待清理（涉及删除已跟踪文件，动手前先问）。
5. 英文界面长单词（"Philippines"、"retrogressed 107 days"）在窄卡里的换行未实测过。
6. U 案子的月度邮件没有图表和 ETA（forecast 为 null 时整块跳过）——语义正确但可以
   考虑降级显示历史柱图。

## 月度更新配套清单（每次新公告触发，缺一不可）

1. 抓取：routine 跑 npm run scrape（10–23 号窗口自动）→ bulletin.json/history.json 更新
2. npm run scrape:uscis → 表 A/B 判定更新
3. **notices 翻译**：把 current.notices 忠实译为简/繁（台港表达），写入
   public/notice-translations.json 对应月份（AI 步骤，见第十轮说明；漏做则回退英文）
4. 一致性自检（全部应自动跟随，抽查即可）：页脚月份、公告 tab 页头 Vol/No、
   下期倒计时、总结 hero/推导链数字、图表窗口终点、同期对照
5. 发送订阅邮件：POST /api/admin/send-monthly（无需 force，幂等保护生效）

## 2026-08-09 第十一轮：公告独立成第 3 个 tab（PR #28）

notices（三语）+DV+配额+Vol/No 从动态页拆出，独立「公告」tab 列导航第 3 位，
「如果」退第 4；动态页回归纯「变化解读」（影响条/之最/倒计时/类别表）。
?tab=bulletin 深链支持。

## 2026-08-09 第十轮：公告 notices 三语化（PR #27）

- 新增 public/notice-translations.json：按 月份→节号 存 zh/tw AI 译文（独立文件，
  scraper 不会冲掉）。繁体按台/港移民圈表达（身分調整、遞件、名額、鑑於）。
- 前端 locNotice()：zh/tw 显示译文+「AI 译文 · 查看英文原文」逐条展开器，
  英文用户看原文；总结小结的官方提醒标题同步本地化。
- 邮件链路：send-monthly/preview 取译文传模板，zh 订阅者看译文
  （附「AI 译文，以英文原文为准 · 原题」小注），en 原文不变。
- **每月维护**：新公告抓取后 notices 需补译。建议在云端 routine 提示词里追加：
  「抓到新月份后，将 current.notices 各节忠实翻译为简体与繁体（台港表达），
  按现有格式写入 public/notice-translations.json 的对应月份并一并提交。」
  未补译时前端自动回退英文原文，不会坏。

## 2026-08-08 第九轮：新增 EB-3 Other Workers（EW）类别（PR #24）

网友提问驱动。scraper classifyRow 加 OTHER WORKER 行 → 回补 24 个月 history.json
+ --force 重抓当月 bulletin.json → 前端全链路（translations ew、FILING_AUTHORIZED、
四处类别选择器、动态页 cats、catLabels、邮件 formatCategory）。EW 中国 A 表
2019-05-01，比技术工 EB3 落后近 3 年——独立类别的价值所在。
注意：RATES_DB 无 EW-* 条目，预测 tab（已隐藏）对 EW 走默认回退；如恢复该 tab 需补。

## 2026-08-08 第八轮：「如果」简化为零选择一页纸（PR #23）

用户反馈三场景版太复杂。重写为自动一页纸：按案子自动出 2 张结论卡
（配偶出生地 vs ROW；类别转换按 F2A/F2B/EB2/EB3 自动匹配），零配置、
结论句先行、规则可展开。三场景版与自由对比（Comparison）代码保留未挂载。
动态页官方 notices 挪到类别表上方。AI 预测按用户意见继续保留隐藏。

## 2026-08-08 第七轮：「如果」情景页 + 公告数据全量呈现（PR #22）

- **对比 tab 重构为「如果」**：三场景——配偶出生地（交叉归属 INA §202(b)(2)，
  结论句先行+共轴双时间线+规则卡）、类别转换（F2A→IR/F2B→F1 含 opt-out 提醒/
  EB2⇄EB3 降级回流，8 CFR 204.5(e) 优先日保留）、自由对比（原组件保留）。
  情景可存 localStorage（gc_scenarios）。
- **公告 extras 全量上屏**（BULLETIN_EXTRAS 模块变量，来自 /bulletin.json）：
  DV 六区 rank cutoff+国家例外+下月预告、F2A 免国别限额日（小结注入）、
  官方 notices 全文列表、Vol/No 页脚、同期对照（去年同月实走天数）、
  本月之最条、下期发布倒计时（12–22 号规律）、法定年度配额卡（INA §201–203）。
- **搁置（Cloudflare bot 墙，curl 与 headless Chrome 均 403）**：USCIS 处理时长
  API、季度积压 CSV、签发统计、NVC 时间——需浏览器指纹级方案（Playwright 真浏览器
  或云 routine 内置浏览器）才能抓，另行立项。

## 2026-08-08 第六轮：连续迭代（PR #13–#21）

用户逐屏反馈驱动的密集迭代，主线：
- 邮件柱状图数字贴柱（#13）；总结页层级反转 12 项（#14）；显式推理链（#15）
- B/A 口径切换 + 时光机全页一致（VIEWING_MONTH_KEY 封顶所有速度计算）+
  月份选择器（#16）；选中色统一绿/自然语言/预测页区间化/USC-LPR 中文（#17）
- 状态卡与案卡合并单卡（#18）；**B 口径改用表B 自身速度**（#19，重要逻辑修正：
  monthlyMovementFromArchive/paceDaysToCalendar 带 chart 参数）
- 图表独立成卡+表A/B切换、I-485 等排期到才显示、文案锁单行（#20）
- 预测 tab 下架（代码保留）；动态页 A/B 切换；提醒页修改改弹窗
  （CompactCaseBar defaultExpanded）；本月小结接入 /bulletin.json 官方 notices
  （BULLETIN_NOTICES 模块变量）+ 财年规则句；月份 chip 与品牌并列（#21）

**教训**：①python 批量替换的锚点必须避开 translations 字典里的同名字符串
（「我们尊重你的隐私」在两处，插错组件炸页面）；②shell 管道后接 && echo OK
反映的是 tail 的退出码——验证构建必须显式 `echo exit=$?`。

**对比 tab 重构提案（待用户拍板）**：改「如果……会怎样」情景页：①配偶出生地
交叉归属 ②类别转换（F2B→F1/EB 降级）③自由对比。

## 2026-08-08 第五轮：Pareto 图表（分支 feat/pareto-figure）

- **App BulletinMovementChart**：单月柱独立比例 + SVG 绿色累计阶梯线叠加（独立归一化，
  图例注明），终点标签在右侧 34px 槽内防叠字；删右侧独立累计柱；12月视图数字单行。
- **邮件 renderBulletinFigure**：走势图与逐月推进合并为单面板行情图（价格+成交量式），
  共用 12 个月窗口与月份轴；走势层改绿色（累计语义），端标「起/现 cutoff · +累计」；
  删独立累计柱；连接语+图例。旧的 renderMovementChart/renderCutoffTrendChart 已删除。
- **邮件侧 U 语义同步**：_gcMath computeMovement 补 unavailable/resumed；
  movementCopy/标题（持续/转为无名额）/moveColor/formatDateForLang（无名额（U））齐活。
  EB1 印度真实公告 notice 卡首次实测渲染通过。

## 2026-08-08 第四轮：整站审计修复（分支 fix/stale-data-and-ui-audit，6 个 commit）

1. **旧数据家族（最重要）**：MonthlyUpdate 两个 useMemo + Forecast 的 useMemo 按 props
   做依赖，缓存了 history.json 加载前的 2026-05 种子数据——动态页整页、下月预测的速度
   与区间全是五月数。**教训：bulletinCurrent/BULLETIN_ARCHIVE 是原地变异的模块对象，
   任何 useMemo 包住它们的读取都会烂**。已全部拆成直接计算。页脚月份改读运行时标签，
   「历史视角」横幅只在时光机指向旧月份时出现。
2. **U 语义链（App 侧）**：U 在数据里是 null（scraper parseDate 契约，null≈U 因为四表
   解析是硬契约）。新增 unavailable/resumed 状态与变化类型，贯通 computeStatus/
   computeMovement/formatDate/状态卡/本月变化/动态页/本月小结。
3. **I-485 日期估算**：paceDaysToCalendar()——「差 N 天等 N 天」改为近12月表A均速换算，
   37年3月 → 32年12月，与本月小结/预测页口径一致；U 案子显示「待定」。
4. **桌面 max-width**：`.visa-root * { max-width:100% }` 兜底规则特异性压过 Tailwind
   容器类，桌面全宽。加恢复规则，主容器 max-w-3xl（768px）。
5. **?tab= 深链**（overview/trends/update/compare/index/alerts）；重置按钮独立成行；
   对比页天数千分位。
6. **三页并入主题 token**：主题级 CSS 覆盖（App.jsx 大 style 块里「Legacy Tailwind
   palette → theme tokens」段）把 bg-white/slate/emerald/indigo/violet 映射到 --gc-*。
   下月预测层级反转（概率置顶、长期 ETA 降级+口径说明）；走势图药丸改「41年10月」格式。

## 2026-08-07 第三轮：总结页图表 + 邮件套件全面翻新（分支 feat/email-suite-overview-charts）

**App（src/App.jsx）：**
- 新增 `BulletinMovementChart`：I-485 卡「仍在排期中」时显示逐月推进柱状图
  （12/24 月切换、数字标签自动错行、倒退挂基线下、右侧独立累计柱、点按读数）。
  数据来自新的模块级 `monthlyMovementFromArchive()`。
- 「建议下一步」卡改成「本月小结」：本期 A/B 变化 + 近12月累计 + ETA 一段话，
  配乐观/中等/悲观三速切换（按数值排序贴标签，不是固定映射）+「看公式」展开
  （距离 ÷ 速度 ≈ 月数 → 日历时间）。原建议文案融入收尾句。
- 配色过了 dataviz 验证器；主题 token 全适配，consulate 主题蓝绿同色靠分隔线+标签兜底。

**邮件（functions/api/_emailTemplates.js，全部本地渲染+截图验证过）：**
- 月度邮件：逐月推进图改 12 月窗口（数字一行对齐）、单月柱与累计柱独立比例
  （图注明示）、柱下自动括注最显著连续段（如「连续 5 个月没动」）、走势图无缝
  连柱成线 + 起/现端点标签、ETA 面板加「换算到日历上」一行、乐观端/保守端措辞
  与站内统一、preheader 改为增量信息（表A cutoff · 距优先日 · 乐观日历）、
  纯文本版补齐所有新事实。
- `formatCountry` 修复（原 CHN/IND 键永远打不中；`Taiwan` 现在显示 ROW·全球/港澳台，
  三字母码留作 legacy 别名）——原「已知问题 2」已消。
- 欢迎邮件：发布日 8–15 号的**错误文案**改为中旬 12–22 号（4 处）、中文 footer 残句
  补全、CTA 换 `buildCaseUrl` 深链、案子卡加国旗、masthead 收成单行。
- 确认邮件（双重确认）按报纸风重做：masthead + 墨线 + 方角 + 黑色方按钮，
  与另两封统一设计语言。
- 新增共享 `emailHead()`：三封邮件共用 `<head>`（含 color-scheme:light 双保险），
  消除每封各自拷贝导致的漂移。

**发送验证计划**：合并上线后用 `?force=1` 对唯一订阅者重发 2026-08 验证新模板
（`lastNotifiedMonth` 已是 2026-08，需 force 覆盖幂等保护）。

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
