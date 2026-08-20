# 交接 · 2026-08-17（iOS App 打包，进行中，未提交未推送）

下一轮会话从这份开始读。项目规则见 `CLAUDE.md`（同目录，会自动加载）。

---

## 本轮在做什么：把网页版打包成 iOS App，纯云端流程（用户没有 Mac）

用 Capacitor 包 iOS 壳 + Codemagic 云端 macOS 编译签名上传 TestFlight，用户全程手机操作、
git push 触发。按用户原始 11 步计划走，**当前只做完阶段1全部 + 阶段2第4步（codemagic.yaml），
阶段2第5步起（连接 Codemagic 到 GitHub）还没做**，暂停在等用户说「继续」。

**所有改动都还只在本地工作区，没有 `git add`/commit/push。**

### 两个关键架构决定（别在后续会话里无意中推翻）

1. **Codemagic 触发规则 = 只看 `ios/**`、`capacitor.config.ts`、`codemagic.yaml` 这几个路径的改动**
   （`codemagic.yaml` 里 `triggering.when.changeset.includes`），不是「main 有任何推送就编译」。
   **原因**：本仓库已经有个云端 routine 每月 10–23 号自动抓公告数据、自动提交推送到 main
   好几次（见下方旧记录）。如果 Codemagic 盯着「main 任何推送」，那个自动抓取 routine
   每次跑都会顺带触发一次完整 iOS 编译+签名+上传 TestFlight，属于误触发。此决定是问过用户后选的。
2. **App 用「本地打包 + 接口指向线上地址」，不是「整站套壳」。** 原因：App.jsx 里有约20处
   `fetch('/api/...')`、`fetch('/bulletin.json')` 这类相对路径调用（订阅、社区墙、投票、公告数据），
   如果直接把 `dist/` 原样塞进 App，这些相对路径会打到 App 本地根本不存在的后端，功能全废。
   两条路都跟用户确认过：整站套壳虽然功能最新但苹果审核容易因「功能太薄」卡在 4.2 条款；
   最终选的是本地打包保留原生壳（审核更容易过），但接口调用统一加了 `API_BASE` 前缀，
   iOS 构建时注入 `VITE_API_BASE=https://gc.jmjvc.us`，网页版构建不设这个变量、行为完全不变。

### 已完成的改动（全部本地，未提交）

- `package.json`/`package-lock.json`：新增 `@capacitor/core`、`@capacitor/ios`、
  `@capacitor/cli`（devDep）、`typescript`（devDep，capacitor.config.ts 需要它才能被解析）。
- `capacitor.config.ts`（新建）：`appId: com.jmjvc.gctracker`，`appName: 绿卡晴雨表`，
  `webDir: dist`。
- `src/App.jsx`：顶部新增 `const API_BASE = import.meta.env.VITE_API_BASE || '';`
  （紧跟 `_gcMath.js` 的 import 之后），下方 23 处 fetch 调用（`/api/community`、
  `/api/subscribe`、`/api/update-subtype`、`SUBSCRIBE_API` 常量、`bulletin.json`、
  `history.json`、`notice-translations.json`、`uscis-charts.json`）全部改成
  `` `${API_BASE}/...` `` 模板字符串前缀。改完跑过 `npm run build` 确认能正常编译。
  以后如果 App.jsx 里再加新的 fetch 相对路径调用，记得也要套这个前缀，否则 iOS 版会失灵。
- `.gitignore`（新建）：覆盖 `node_modules/`、`dist/`、`ios/App/Pods`、`ios/App/build` 等，
  **不影响已经被跟踪的 node_modules/dist 旧文件**（那是历史遗留问题，见下方「其他已知问题」
  第4条，这轮没动，删除已跟踪文件要先问用户）。
- `ios/`（新建，`npx cap add ios` 生成，37个文件）：用的是 Capacitor 8 的 Swift Package
  Manager 方案（`ios/App/CapApp-SPM/`），**不是 CocoaPods，没有 Podfile/Pods 目录**，
  git 体积干净很多。
- App 图标 + 启动屏：照着 `public/favicon.svg` 的绿色渐变卡片图标风格，本地用
  `qlmanage`（渲染 SVG）+ Python Pillow（拼合/转格式）生成，没找外部素材：
  - `ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png`：1024×1024，
    RGB 无 alpha（App Store 要求图标必须不透明），去掉了 favicon 原本的圆角
    （iOS 系统会自动做圆角遮罩，图标源文件必须是满血方形，不能自己预先切圆角）。
  - `ios/App/App/Assets.xcassets/Splash.imageset/splash-2732x2732*.png`（3份同一张图）：
    2732×2732，白底居中放大版 logo（这个不走系统遮罩，保留了原本的圆角徽章造型）。
- `ios/APP_VERSION`（新建，纯文本，当前内容 `1.0.0`）：App 的 marketing version
  （CFBundleShortVersionString）唯一数据源，`codemagic.yaml` 构建脚本会读这个文件写入
  Xcode 项目。**以后想发新版本号，改这个文件就行**（放在 `ios/` 下是有意的，正好落在
  上面第1条的触发路径范围内，改了会自动触发编译）。build number（CFBundleVersion）
  用构建时间戳自动生成，不用管。
- `codemagic.yaml`（新建）：workflow 名 `ios-release`。`npm ci` → `npm run build`
  （注入 `VITE_API_BASE`）→ `npx cap sync ios` → 写版本号 → `app-store-connect
  fetch-signing-files` + `xcode-project use-profiles`（自动签名，靠 App Store Connect
  API Key，见下面「还没做」）→ `xcode-project build-ipa` → 发布到 TestFlight
  （`submit_to_testflight: true`，`submit_to_app_store: false`——不会自动提交正式审核，
  这个得用户在 App Store Connect 里手动点）。`integrations.app_store_connect` 填的名字
  是 `gctracker_appstore`——**这个名字必须和用户在 Codemagic 网站上创建 App Store
  Connect 集成时用的名字完全一致**，是后续步骤（阶段3）里要做的事，还没做。

### 副作用，无害但会出现在 diff 里

`npm run build` 顺带把已经提交过的 `dist/` 快照重新生成了一版（`index.html` 内容变、
旧的 `dist/assets/index-*.js` 文件名哈希变了导致旧文件显示为删除）。纯粹是构建产物刷新，
不是逻辑改动。

### 还没做（按用户原计划的阶段/步骤编号）

阶段2第5步：手机浏览器上把 Codemagic 连到这个 GitHub 仓库（`ywNYC/GCTracker`）。
阶段3（第6-7步）：App Store Connect API Key（.p8 + Key ID + Issuer ID）生成，上传到
Codemagic——**这一步的 API Key 权限建议选 Admin**（低权限角色可能没法自动建证书/描述文件，
是 Codemagic 自动签名最常见的失败点）。
阶段4（第8-9步）：App Store 上架素材清单（名称/描述/关键词/隐私政策URL/截图尺寸）；
隐私清单（App 收集 Resend 邮箱订阅数据，需要在 Privacy Nutrition Label 里如实填）。
阶段5（第10-11步）：怎么在手机上看构建日志、常见失败点排查（证书过期/Bundle ID冲突/
4.2审核被拒）。

**这轮的改动还没提交没推送**，且推送到 main 前用户有过「须先问」的习惯（见 kb 记忆
`gctracker-project.md`），下一轮/下一步操作前要按这个规矩来，不能因为只是加了 ios/
文件就默认直接推。

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

**2026-08-20 已修复并推送**：`functions/api/admin/subscribers.js` 的按前缀跳过名单漏了
`trkl:`（`tracker.js` 排期查询页的限流计数器前缀），导致这些裸数字计数器被当成订阅记录混进
`/api/admin/subscribers` 返回列表，kb 侧 `subs.sh` 读取时因拿到 int 而不是 dict 报错崩溃。
commit `f156f60`，已推送到 main（只改了这一行，跟本轮 iOS 打包的未提交改动互不冲突），会跟着
Cloudflare Pages 自动部署上线。kb 侧脚本此前已加的防御（跳过非 dict 项）保留，双重保险。

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

## 第 12 轮（2026-08-09）：邮件 v3 + A/B 顺序逻辑 + 访问统计 + 订阅弹窗

**邮件 v3**（feat/email-v3，已合并）：
- `send-monthly` 加 `?only=<email>` 安全阀：测试发送只命中指定邮箱，群发保留给真实月度更新。
- `_gcMath` 增 `adopted`（采用表自身 12 个月 pace 的 hero 数字）与 `stations`（A/B 各自
  gap/ETA），并修了一个真 bug：eligible 案子的 `status.days` 是**超过**截止日的天数，
  不是剩余差距，误当 gap 会给已能递件的人算出假等待。
- 模板：采用表驱动的等待卡（约X年 + 乐观/保守 + 好消息delta + 怎么算的三行 + 进度条）、
  A/B 双站块（「你看这张」标记 + 每表自己的 距X天·预计X）、公告无类别命中时兜底 D 节、
  图表跟随采用表（眉标注明 递件/获批口径）、tw 订阅者整封简转繁（S2T 字符表 +
  `toTraditional` 终段处理；公告的 tw 译文本来就是繁体，字表只收简体字所以不受影响）。

**A 不早于 B（用户截图抓到的逻辑洞）**：获批（表A）不可能早于递件（表B），但分表外推
在 A pace 快时会算出 A 先到。两侧同修：`_gcMath` 里 stations/adopted 的 A ETA 以 B 为
下限并带 `clampedToB` 标记；App 侧 `paceDaysToCalendar` 内置 B 托底（`chartBFloorCal`
从两表 cutoff 差反推 B gap，所有调用点自动继承），hero 依据行和 A 站块在被托底时
显示「获批不会早于递件，已按表B托底」/「（不早于B）」。

**访问统计（此前完全没有，站上无任何 beacon）**：
- `/api/beacon`：无 cookie 无 IP，vid（localStorage）/sid（sessionStorage）自铸随机 id，
  只计可见时间，`an:<日>:<sid>` 存 SUBSCRIBERS KV，TTL 90 天，同 session 覆盖写。
- `/api/admin/analytics`（ADMIN_TOKEN）：按天聚合 sessions / unique / 平均·中位停留 /
  语言 / 配案占比 / 订阅占比。
- **遍历订阅者的地方现在要同时跳过 `rl:` 和 `an:` 前缀**（send-monthly、subscribers 已改）。

**一键订阅弹窗** `SubscribeNudge`：已选案（hasOnboarded）+ 未订阅（无
`gc_subscribedEmail`）+ 14 天内没关过 → 停留 40 秒弹底部卡片，预填当前案子，邮箱 +
一键订阅，成功后引导去邮箱点确认。40s 是启发式，等 beacon 数据攒几周后按
「中位停留的 ~60%」校准 `SUB_NUDGE_DELAY_MS`。注意：弹窗必须自带
`className="visa-root" data-theme`（挂在主题根之外，不带就取不到 CSS 变量，背景全透明）。

**遗留**：`scripts/lib/gcMath.mjs` 是 re-export，无需镜像改动。dist/ 这轮误提交了
（无害，Cloudflare 从源码构建，但下轮记得清）。

---

## 第 13 轮（2026-08-09 下午）：backlog 清理

**垃圾订阅排查结论（虚惊）**：KV 里「纯数字键」是 QQ 邮箱（24182822@qq.com 等 5 个真实
用户），值为 1/2 的是 `rl:` 限流计数器，`an:` 是访问统计。19 个订阅者全真实，无垃圾。
服务端 `isValidEmail` 本来就在 POST/DELETE 强制执行，本轮只补了 254 字符长度上限。

**admin 转正接口** `/api/admin/confirm-subscriber?email=x`（POST + ADMIN_TOKEN）：给确认
邮件掉垃圾箱的真实用户手动完成 double opt-in，等效用户点链接（发欢迎邮件），带
`adminConfirmed` 标记；`&welcome=0` 静默转正。比在 CF 后台手改 JSON 好——不会漏字段、
不会改坏格式。**只给挂着真实案子的地址用**。

**大陆「打不开」元凶**：`fonts.googleapis.com` 的 CSS `@import` 写在 <style> 里，大陆被墙
→ 渲染阻塞到超时=白屏。已改为 monocle 主题激活时 JS 异步注入 <link>，失败只回退系统
字体。Cloudflare 边缘部分大陆线路仍可能慢/断，那层无解（除非国内备案托管）。

**EB4/SR/EB5 接入**（小红书三条评论催的）：scraper 认 `4th`/`Certain Religious`/`5th
Unreserved`（set-aside 行暂不解析），`--seed --force` 重抓当月 + backfill 24 个月。
bulletin.json 的 previous 是旧解析时，要从 history 补新类别（/tmp/fix_privious 模式），
否则月度对比把新类别误判「恢复名额」。UI 数组共 7 处（两个 label 下拉 × 同一字面量、
紧凑条、3 个 cats 数组、onboarding）。EB4 全球一个截止日（2026-08: 2022-10-15）。

**observedRates 改日历窗口语义（重要口径修正）**：旧版跳过 U/C 月只平均可观测差值，
EB4 这种 FY 断供类别的窗口被拉到几年前，邮件 pace 26.4 vs 网站 70 天/月。现在镜像
App 的 monthlyMovementFromArchive：窗口=最近 N 个日历月，U 月计零（订阅者的等待是
日历时间）。series 里 null=不可观测月，邮件图表按零柱画。

**A/B 顺序钳制按「哪张表管递件」分流（EB5 教训）**：亲属类递件走表B → A 托底到 B
（F4 保持 7.2y）；职业类递件走表A、表B 是冻结的收件闸门 → 外推不可信，反而按公告
不变式（B 永远不落后于 A）把表B 的预计钳到不晚于表A（EB5-China 曾被托到 11.8y，
实为 5.2y）。教训：托底/钳制导入另一张表的数字前，先问那张表的外推可不可信、
它到底是不是这个类别的真实里程碑闸门。

**EB-5 细分（预留类别）**：新增 EB5R（乡村20%）/EB5H（高失业区10%）/EB5I（基建2%），
scraper 按关键词认 set-aside 行（标签措辞逐月有变，用 RURAL/HIGH UNEMPLOYMENT/
INFRASTRUCTURE 匹配）。2026-08 三个预留类别对所有国家（含中国）均 Current。EB5* 案子
的本月小结固定附关键日期提示（2026-09-30 祖父条款、2027-01 投资额上调、预留类别
积压预期）。9 月公告由 GitHub Actions cron（每月 10–23 号每天两次）自动抓，届时留意
乡村类是否首次出现排期。

**提醒 tab → 订阅**：改名 + Mail 图标 + 常驻绿底（唯一转化动作，像按钮不像页签）。

---

## 第 14 轮（2026-08-10 凌晨）：邮件投递可观测性

**接入 Resend webhook**（`/api/webhooks/resend`）：收 email.sent / delivered /
opened / clicked / bounced / complained / delivery_delayed。签名走 Svix 规范
（HMAC-SHA256 over `<id>.<ts>.<body>`，密钥是 `whsec_` 后的 base64 段），实现已用
Svix 官方测试向量对过（`g0hM9SsE+OTPJTGt/tmIKtSyZlE3uFJELVlNIOLJ1OE=`），5 分钟
重放窗口。**未配置 `RESEND_WEBHOOK_SECRET` 时仍收录但打 `verified:false`**，这样
端点一注册就有数据；密钥配好后自动转为已验证，`email-stats` 里的
`unverifiedEvents` 就是「密钥还没配」的指示灯。

**存储**：`ev:<日期>:<id>`（原始事件，TTL 180 天）+ `es:<邮箱>`（按地址汇总）。
**遍历订阅者的地方现在要跳过四种前缀**：`rl:`（限流）、`an:`（访问统计）、
`ev:`/`es:`（邮件事件）——send-monthly 与 subscribers 已改。

**`/api/admin/email-stats`**：打开率按**地址**而非事件计（同一人开六次算一次），
分母优先用 delivered、退回用 sent；产出三个可执行清单：硬退信、投诉、从未打开。
`?days=30` 可限窗口。`@example.com`（RFC 2606 保留域）事件永久排除，自测不污染真值。

**业主待办（需 Resend 后台权限）**：① Webhooks 里新建端点指向
`https://gc.jmjvc.us/api/webhooks/resend`，勾全部 email.* 事件；② 把签名密钥写进
Cloudflare Pages 的 `RESEND_WEBHOOK_SECRET` 并**触发新部署**（Retry deployment 不
生效，见下方坑）；③ 域名设置里**单独打开 Open tracking 与 Click tracking**，否则
这两类事件根本不会产生。

---

## 第 15 轮（2026-08-10）：排期到行动中心 + 分享卡改版

**ActionCenter**（仅 `isActionable` = current/eligible/overdue/C 渲染，等待视图零改动，
三态截图验证过）：递件窗口 banner、六步路线图（按 `userCase.inUS` 分境内 I-485 /
境外领事馆 CP，CP 附 6 个月签证有效期与 USCIS 移民费两大坑）、材料清单（通用+EB/F+
境内外分支，勾选存 localStorage `gc_packChecklist`）、匿名进度共建。

**/api/progress**：POST 匿名上报（cat/country/filedMonth/milestone，白名单校验，
每 IP 每日 5 次），GET 按类别聚合。存 `pr:<cat>:<uuid>`（TTL 2 年）+ `prl:` 限流。
**订阅者遍历现在要跳过六种前缀**：rl: an: ev: es: pr: prl:。前端样本 <5 只显示
已收集份数，≥5 显示阶段分布条。

**EB-5 条件卡**：绿卡庆祝区的解除条件表格按类别切换——EB5* 显示 I-829（窗口算法
与 I-751 相同：2 周年前 90 天），并在未勾选条件卡时提示「EB-5 新卡必为条件卡」。

**分享卡改版**：副标题/题注用本人真实等待（优先日→获批日的天数与年数），卡面精修
（金芯片、机读区、软阴影、纸屑），三栏数据行。SVG→Canvas 下载管道未动。

**坑（本轮踩了两次同一个）**：`git checkout -- src/App.jsx` 会连未提交的功能改动一起
抹掉——临时测试补丁要用 python 定点还原（存原文再替换回来），不要用 checkout。

---

## 第 16 轮（2026-08-10 晚）：社区数据系统（10 项收集）

**/api/community** 一个端点收 8 种匿名记录：timeline（六节点日期+服务中心/领事馆+
AOS/CP）、rfe（是否+类型）、switch（降级/换雇主/加急+结果）、cost（四档区间）、
poll（月度投票，pollId 硬编码在 App 的 CURRENT_POLL，每月手动换）、wall（等待天数+
≤60字留言，服务端剥掉链接/6位以上数字/微信QQ字样——公开墙必须 fail closed）、
question（原文仅 ADMIN_TOKEN 可读）、postgc（绿卡后去向）。cd: TTL 2 年，crl: 每 IP
日 20。**订阅遍历跳过前缀现有八种**：rl: an: ev: es: pr: prl: cd: crl:。

**触点**：CommunityHub（全员，小结下方，三页签：每月一题/打卡墙/调查·提问，EB 类
才显示降级调查）；ActionCenter 互助区升级为完整时间线+RFE（仅排期到）；绿卡庆祝区
postgc 一键去向。均 localStorage 防重复。聚合门槛：时间线中位数 ≥3 份，投票即时。

**第 10 项（邮件内渐进画像）暂缓**：需要月度邮件模板改造+签名令牌，等 9 月群发一并做。

**已知测试痕迹**：打卡墙上有一条我 API 实测留下的 1234 天空留言记录（敏感词过滤的
验证品）；无删除接口，要么留作种子要么下轮加 admin 清理端点。

**KV 最终一致性**：list 索引落后写入几十秒，POST 后立刻 GET 聚合可能少一条——前端
体验无碍（用户下次展开就有了），别当 bug 修。

---

## 第 17 轮（2026-08-16）：订阅弹窗加可选昵称字段 + 主页问候（已推 main）

**发现**：`/api/subscribe`（`functions/api/subscribe.js`）早就接收并落盘 `name` 字段
（trim 后截 50 字），但 `SubscribeModal` 的 POST body 一直没带这个字段——后端功能建好后
前端没接上，所以生产 KV 里现存记录的 `name` 全是空字符串。

**改了什么**：
- `SubscribeModal`——新增 `nickname` state，邮箱框下面加一行可选文本框（占位「怎么称呼您
  （可选）」，不填不挡订阅），POST body 补 `name: nickname.trim()`。只碰了这一个入口；
  SmartAlerts/InlineSubscribeCTA 两条直接 POST 的路径没有昵称框，仍不带 `name` 字段
  （不在这轮范围内，需要的话是独立一轮）。
- 订阅成功后把昵称写进 `localStorage.gc_nickname`（新增 `useNickname` hook，跟
  `useSubscribed` 同一模式，靠 `gc-subscribed` 事件刷新）。
- Header 下方新增一条问候条，`gc_nickname` 有值时显示「Jack，你好」/`Hi, Jack`，无值不渲染。

**验证方式**：Playwright 起本地 dev server 截图两处——表单长相、以及预置
`localStorage.gc_nickname='Jack'` 后主页的问候条效果——用户看过截图后确认推送。

---

## 第 18 轮（2026-08-16）：beacon 匿名带上案子信息（已推 main）

**起因**：分析当天 0 新增订阅时发现，`hasCase`/`subscribed` 这两个布尔位是 `/api/beacon`
唯一记的东西——配了案但没订阅的访客，类别/国家/优先日从来没传到服务器，落地页流量里
大多数其实是"配过案的老访客"，这部分人的案子分布完全是黑的。用户要求把这块信息也
匿名收集起来，越详细越好，但明确要求不能影响埋点无感的体验。

**改了什么**：
- `index.html` 的 beacon `send()`——新增读取 `localStorage.gc_userCase`，把
  `category`/`country`/`priorityDate`/`subtype` 一并放进 payload。**刻意不带
  `birthYearMonth` 和姓名**——跟 `writeUserCaseToURL` 里不把生日放进可分享 URL 是
  同一个理由（生日是准标识符，匿名埋点里也不该存原始值），这个先例直接沿用，没有
  另外问用户要不要把生日也搭进去。
- `functions/api/beacon.js`——新增白名单校验：`category`/`country` 必须命中
  `src/App.jsx` 里的枚举值，`priorityDate` 必须是 `YYYY-MM-DD`，`subtype` 限
  `[a-z0-9]{1,20}`。这是无鉴权公开写入端点，不校验的话谁都能把任意字符串塞进
  统计表，四个字段全部按此收紧。
- `functions/api/admin/analytics.js`——新增 `caseBreakdown`（`"F4-China": 12` 这种
  按 category-country 计数，同一 vid 同一天只算一次，不会因为多次 ping 重复计数），
  覆盖全部配过案的访客而不只是订阅者。

**验证方式**：Playwright 起本地 dev server，拦截 `/api/beacon` 请求实测发出的 payload——
确认 category/country/priorityDate 能正确带出，即使 `localStorage.gc_userCase` 里塞了
`birthYearMonth` 也不会出现在 payload 里；另用 node 脚本单独跑了后端校验逻辑，
确认 XSS 载荷/伪造 country/垃圾日期格式都会被清空成空字符串而不是原样入库。

**状态**：已 commit 并推 main，Cloudflare Pages 会自动部署。

**状态**：已 commit 并推 main，Cloudflare Pages 会自动部署。

---

## 第 19 轮（2026-08-16 晚）：姓名字段补到第二弹窗 + 邮件问候（已推 main）

**起因**：用户发现第 17 轮只把 `name` 接到了 `SubscribeModal`（订阅时一次性问），但
`SubtypeUpdateModal`（老订阅者靠月度邮件深链/本机已订阅标记补填 subtype/生日的那个
「补充信息」弹窗）和邮件模板都还没接上，问「是用户没填对吧」得到否定回答后，要求
补全 + 全流程 dry run 出截图。

**改了什么**：
- `src/App.jsx` `SubtypeUpdateModal`——新增 `currentName` prop（从 App() 的
  `nicknameGreeting` 传入）和 `needsName = (needsSubtype || needsBirth) && !currentName`。
  **刻意没把 needsName 单独设成弹窗触发条件**——只在 subtype/birth 任一缺失、弹窗本来
  就要弹的时候顺带问一次，不然会对着几乎所有第 17 轮之前注册的老订阅者（同一批
  `needsBirth` 覆盖的人）单独弹一次新弹窗，太打扰。这是本轮唯一需要用户后续确认的
  设计判断，其余都是照抄第 17 轮已验证过的模式。保存成功后写
  `localStorage.gc_nickname` 并 `announceSubscribed()`，让主页问候条不用刷新就更新。
- 后端三处透传 `name`：`functions/api/update-subtype.js`（token 深链路径，新增可选
  `name` 字段，写入 `record.name`，允许"只改名字、不改 subtype/birth"这种请求）、
  `functions/api/confirm.js`（欢迎邮件调用带上 `record.name`）、
  `functions/api/admin/send-monthly.js`（月度邮件调用带上 `record.name`）。
- `functions/api/_emailTemplates.js`——`renderWelcomeEmail`/`renderMonthlyUpdateEmail`
  新增可选 `name` 参数，有值时在正文标题上方加一行「Jack，你好：」/「Hi Jack,」，
  中英文版、HTML/纯文本版都覆盖；无值时完全回退成改动前的文案，不影响没填过名字的
  存量订阅者收到的邮件。

**验证方式**：本地 `npm run dev`（纯 vite，不含 Pages Functions，所以 `/api/*` 提交
本身没有实测，只测到前端把请求 body 拼对为止）+ Playwright 用
`localStorage`/`sessionStorage` 预置状态触发四个界面截图：第二弹窗（SIJS/1995年6月/
Jack 三项都填）、主页问候条、订阅弹窗（email+Jack 已填）、`renderWelcomeEmail` 直接
渲染成 HTML 截图（不经 Resend，没有真实发信）。四张图发给用户确认过。

**状态**：已 commit 并推 main（跟第 20/21/22 轮合并成一个 commit `51b50ac` 一起推的，
用户看完全部四轮截图后才一次性拍板），Cloudflare Pages 会自动部署。

---

## 第 20 轮（2026-08-16 晚，接第 19 轮）：看完截图后两处追加——可递件状态加重 + 补两个对比场景

**起因**：用户看完第 19 轮四张图后指出两点：（1）只看到「补充小信息」这个第二弹窗，
没看过用户第一次进来时的引导弹窗长什么样；（2）案子卡片里「现在可递件」这行看着
不够重——变成可递件是个有仪式感的时刻，配色/字重该更突出；同时想看还没排到、
仍要等的案子首页和邮件长什么样做对比。

**改了什么**：
- `src/App.jsx` 案子卡片「现在可递件」那行（`eligibleLayout` 分支里，约第 4805-4822
  行）——字号 22px→25px，字重 700→800，颜色从 `var(--gc-green)`（#0e4d2e）换成
  `var(--gc-green-ink)`（#0a3a23，主题里本来就有的更深一档），对勾图标 20px→23px。
  只挪用已有设计 token，没有新造颜色。**没改的两处**：`bigSubLabel`（第 4690 行）和
  第 10411 行的另一处「现在可递件」文案是分享卡/其他组件，用户这次指的是首页案子卡片
  这一处，没让我扩大范围就没碰。

**验证方式（纯截图对比，代码未跑单元测试，这类视觉调整本来也没有）**：
- 首次进入引导弹窗：清空全部 localStorage/sessionStorage 只留语言选择，重新加载，
  截到「简单告诉我你的情况」两选项卡片。
- 可递件样式：用第 19 轮同一个 EB4-菲律宾-2021/3/15 案子（本来就是可递件状态）重截，
  跟第 19 轮那张图对比能看出字更大更深。
- 对比场景：换成 EB3-印度-优先日 2023-01-01（真实表A截止日 2014-01-01，差 9 年），
  首页显示「还需要约 14.7 年」+ 进度条 + 图表；对应邮件用 `functions/api/_gcMath.js`
  的 `computeCaseUpdate()` 喂真实 `public/history.json` 的最近两期公告数据算出
  `update` 对象，再交给 `renderMonthlyUpdateEmail` 渲染——这条路径没有手搓假数据，
  走的是生产同一套计算逻辑，只是喂了一个虚构优先日。

**状态**：已 commit 并推 main（`51b50ac`，跟第 19/21/22 轮合并一次推送）。
`node_modules/.vite/deps/_metadata.json` 再次因跑 dev server 变脏，已 `git checkout` 撤销。

---

## 第 21 轮（2026-08-17，接第 19/20 轮）：名字字段挪到 OnboardingModal 首屏，不用等订阅

**起因**：用户看完第 19 轮「补充小信息」弹窗截图后说没看到"第一次点进去"那个更早的
弹窗（`mode: 'choose'` 那屏本身没有字段，用户其实想看的是点「我已在排期中」之后那个
字段很多的表单，`OnboardingModal` 的 `mode: 'form'`），并且明确要求在"绿卡类别"这一行
左边加一个"你的名字"输入框试一下。

**改了什么（全部在 `src/App.jsx` 的 `OnboardingModal` 里）**：
- `form` state 新增 `name: ''`（第 14137 行附近），可选，不参与 Start 按钮的必填校验链。
- 原来"绿卡类别"是独占一行的 `<div>`，现在改成 `gridTemplateColumns: '1fr 1fr'` 两栏
  （跟下面"优先日 + 出生年月"那行同款布局）：左栏"你的名字"文本框（占位"可选"），
  右栏挪过去的原有 `CategoryDropdown` + `SubtypeChips`（chips 保持嵌在右栏内、紧跟在
  下拉之下，没有被拆到栏外——避免因为改成两栏布局而拉大 chips 与下拉之间的间距）。
- Start 按钮点击时：`form.name` 有值就先写 `localStorage.gc_nickname` 并调用
  `announceSubscribed()`（跟 `SubscribeModal`/`SubtypeUpdateModal` 存名字是同一个
  store、同一个刷新信号），再用解构 `const { name: _formName, ...caseOnly } = form`
  把 `name` 从对象里摘出去，`onComplete(caseOnly)` 传给上层——**刻意不让 name 混进
  `userCase`**：`userCase` 会被 `writeUserCaseToURL`/`beacon` 按白名单字段读取，虽然
  两处都不会因为多一个陌生字段就出错，但姓名概念上是身份信息不是案子数据，跟第 17
  轮"nickname 独立于 userCase"的设计保持一致。
- 三语翻译新增 `yourName`/`yourNamePlaceholder`（en/zh/tw 各一份，占位统一是"可选"/
  "Optional"）。

**已知粗糙点，没进一步打磨**：EB2 这类 subtype 选项文案较长（如"雇主担保 PERM"），
挤在两栏布局的右半栏里换行会比原来单栏宽版更容易折行——用户这轮只要求"试一下"这个
布局，没要求同步优化 chips 折行，先如实截图给用户看，没有自作主张改字号或改成单独一行。

**验证方式**：本地 dev server + Playwright，清空 localStorage 只留语言选择，点「我已在
排期中」进入 `mode: 'form'`，在新输入框填 "Jack" 后截图确认布局。未打开类别下拉验证
selected 态（跟这次请求无关，没有必要多花一轮截图）。

**状态**：已 commit 并推 main（`51b50ac`，跟第 19/20/22 轮合并一次推送）。

---

## 第 22 轮（2026-08-17）：主页问候条字号太小，加大加深

**改了什么**：`src/App.jsx` 主页问候条（约第 16812-16820 行，`nicknameGreeting` 那个
条）——字号 12px→16px，颜色 `var(--gc-ink-soft)`（灰）→`var(--gc-ink)`（正文黑），
上下 padding 6px→9px 配合更大字号。同样只挪用已有 token，没造新颜色。

**验证方式**：本地 dev server + Playwright，用第 19 轮同一个 EB4-菲律宾-Jack 案子重截，
"Jack，你好"明显比之前大一号、更黑。

**状态**：已 commit 并推 main（`51b50ac`，跟第 19-21 轮合并一次推送）。

---

## 第 23 轮（2026-08-17，真机实测反馈）：表单三行重排 + 问候条改卡片样式

**起因**：用户在真机（gc.jmjvc.us，第 19-22 轮已上线的版本）上用手机截图反馈两点：
（1）第 21 轮加的"你的名字"+"绿卡类别"同行，导致 EB2 这类有 3 个细分选项的类别，
细分标签挤在半栏宽度里换成 3 行，图上用圈标出来了；（2）首页"Jack，你好"跟下面
"EB-2 高学历"案子标题字体不统一、有点突兀，问候条的底色也想跟下面案子卡片"有自己
小窗口"的感觉对齐。

**改了什么（都在 `src/App.jsx`，`OnboardingModal` 表单区 + 主页问候条）**：
- 表单重排成三行：第一行"你的名字"+"你的出生年月"同行（都是轻量输入，不需要整行）；
  第二行"绿卡类别"改回独占一行，`SubtypeChips` 跟着回到满宽——EB2 的三个细分现在
  一行排开，不再挤成 3 行；第三行"优先日"独占一行（DOB 挪到第一行后，优先日不用再
  跟谁拼行）。
- 问候条不再是灰底、edge-to-edge 的横幅：改成跟下面案子卡片同款的独立卡片——
  `background: var(--gc-surface)` + `1px solid var(--gc-rule)` 边框 + 4px 圆角，
  包在跟 `<main>` 一样的 `max-w-3xl mx-auto` 页面留白里，不再通栏；文字换成
  `gc-serif` 字体家族，跟案子标题（"EB-4 特殊移民"那行同样用 `gc-serif`）统一，
  字号 15px/字重 600，比案子标题（17px/700）略轻一档，不抢真正的案子标题的视觉重量。

**验证方式**：本地 dev server + Playwright——表单截图复现用户截图里的 EB2-中国场景
（细分三个标签确认排在一行）；问候条用第 19 轮同款 EB4-菲律宾-Jack 案子重截，跟案子
卡片并排能看出字体、底色都统一了。两张图发给用户看过后直接推送（用户这轮指令是
"截图看效果，然后推送"，不是先截图等下一轮确认）。

**状态**：已 commit 并推 main。

---

## 第 24 轮（2026-08-17）：改名字这件事的 audit——发现一个真 bug，顺手补了修改入口

**起因**：用户问"订阅那里有给改名字的机会吗"，让我 audit 一下。查完发现不只是缺入口，
是一个**真的会丢数据的 bug**。

**发现的 bug**：`functions/api/subscribe.js` 组装 `record` 时，`name` 字段是
`name: (typeof name === 'string' ? name.trim().slice(0, 50) : '')`——不管客户端这次
有没有传，一律用这次的值覆盖。同一个函数里 `alerts`/`userCase` 两个字段早就为同样的
问题打过补丁（注释原话："a request that omits alerts entirely is not the same as
one turning them all off"），唯独 `name` 没跟上。后果：`SubscribeModal` 里的
`nickname` state 每次打开都是空字符串（不会从 `gc_nickname` 读现有值），只要老订阅者
打开订阅弹窗只是想改改提醒开关、不重新打一遍名字就点提交，后端会把之前存的名字
直接清空成 `''`。`SmartAlerts`（提醒设置页）和 `InlineSubscribeCTA` 这两条路径的
POST body 本来就不带 `name` 字段（第 17 轮就记录过这个已知缺口），同样会踩这个坑。

**改了什么**：
- `functions/api/subscribe.js`——`name` 改成 `(typeof name === 'string' && name.trim())
  ? name.trim().slice(0, 50) : (existingName || '')`，跟 `alerts`/`userCase` 同一个
  "没传不等于清空" 规则对齐，新增 `existingName` 读现有记录。这一个改动同时保护了
  `SmartAlerts`/`InlineSubscribeCTA` 两条不带 `name` 字段的路径——它们本来就会把
  `name` 清空，现在不会了，不用等它们各自补字段。
- `src/App.jsx` `SubscribeModal`——新增 `useNickname()` 读 `knownName`，名字这一栏
  改成跟细分/出生年月同一套"已知值 + 修改链接"模式（`nameKnown && !editName` 显示
  只读行，否则显示输入框），不再是每次打开都空着的输入框。
- `SubscribeModal` 的"你已订阅"快捷弹窗（原来只有邮箱 + "提醒设置"/"关闭"两个按钮，
  没有任何名字相关内容）——新增"称呼：Jack 修改"一行。点"修改"会带着
  `forceForm=true`（新状态，绕过快捷弹窗直接进完整表单）、预填邮箱、`editName=true`
  进完整表单，不用重新输入邮箱就能改名字。这一步是必须的：不加的话，已订阅用户
  从"订阅"按钮点进来只会看到快捷弹窗，永远碰不到我在表单里加的"已知值+修改"UI。

**验证方式**：本地 dev server + Playwright，三个场景各截一张图：（1）没订阅过但
`gc_nickname` 已知（比如刚在首屏填过名字）——打开订阅弹窗直接显示"称呼：Jack 修改"；
（2）已订阅——快捷弹窗新增的那行；（3）点快捷弹窗的"修改"——确认能落到可编辑的
完整表单，邮箱自动带出。三张图给用户看过。后端那处 fallback 逻辑没有单独跑单元测试
（这个函数目前没有测试套件），靠代码走查确认跟 `alerts`/`userCase` 那两处的判断结构
完全一致。

**状态**：已 commit 并推 main。

---

## 第 25 轮（2026-08-17）：订阅弹窗"细分"标签改名"签证类型细分"

**改了什么**：`src/App.jsx` 第 15035 行附近，`SubscribeModal` 里已知细分那一行的
标签——`'细分：'`→`'签证类型细分：'`（繁体同步改 `'簽證類型細分：'`），英文 `'Subtype: '`
不变，用户只要求改中文。这是第 24 轮新加的"称呼/细分/出生年月 已知值+修改"三行里的
中间那一行，只改文案，没碰逻辑。

**验证方式**：本地 dev server + Playwright 重截订阅弹窗，确认显示"签证类型细分：SIJS
特殊青少年"。截图给用户看过，用户还没回复要不要推送。

**状态**：已 commit 并推 main（`cc76063`）。

---

## 第 26 轮（2026-08-20）：众包案件进度墙草稿（`src/Tracker.jsx`，全 mock 数据，未提交未推送）

在 `feat/tracker` 分支上做的，叠在第 25 轮那堆 iOS/Capacitor 未提交改动之上。
**目前只有前端，数据全是 `MOCK_CASES` 假数据，D1 和 `/api/tracker` 一行没写。**
方案与十条社区化改造记在 `TRACKER-PLAN.md`（未跟踪文件，在仓库根目录）。

### 三个被业主当场推翻的设计（别在后续会话里改回去）

1. **不新开导航位、不做 `/tracker` 路由。** 原方案是 `public/_redirects` + `pathname`
   判断整页渲染，业主原话「你可以放在 6 个选项里面的其中一个你不要再新开设」。
   现在挂在**「动态」tab 内**（`src/App.jsx` 第 17002-17003 行，跟在 `MonthlyUpdate`
   下面）。`_redirects` 已删除，tab 白名单里的 `'tracker'` 项也已撤掉。
2. **不列个人明细。** 原方案有一张「每行一个匿名案件」的可筛选列表页，业主原话
   「不可以把所有人的信息都这样子呈现出来……太多信息了」。列表整个删掉，换成
   季度分桶的波浪图（琥珀色标「你这批」）+ 各阶段人数条 + 一句话小结。
3. **各类别变化表默认收起。** `src/App.jsx` 第 7123-7174 行，原来那个 15 类别表格
   包进了原生 `<details>/<summary>`（不引库、不加 state），summary 上写
   「· 展开看全部 15 个类别」。理由是业主认为图表和统计才是「动态」页的核心。

### 核心口径：一切围绕「批次」，不围绕「个人」

批次 = `类别 | 出生地 | 优先日所在季度`，例如「2021 年 Q1 · EB-2 · 中国大陆」。
这条同时解决社区感和隐私——页面上永远只出现批次，不出现个人。
进度卡的主角也从「我等了多少个月」改成「我这批 7 个人，我排第 4」。

四条防线写在 `src/Tracker.jsx` 顶部，**上线时必须挪到后端取数层，前端藏没用**：

- `K_MIN = 5`：任何切片样本不足 5 人就不出数，页面直说「还差 N 人」
- `coarse()`：对外日期一律粗化到 `YYYY-MM`，只有本人看自己的卡才到日
- 统计一律中位数，不用均值
- 卡面统计用**人数不用百分比**（「这批已批准 1 人」而不是「0% 批准」）——
  第一版冷启动显示「你排第 1 位、0% 批准」是最难堪的失败模式

### `src/Tracker.jsx` 里有什么（801 行，组件都带 ①-⑩ 注释对应 TRACKER-PLAN 的十条建议）

`computeBatch()` 算批次统计 → `ProgressCardSVG`（1080×1440 竖版卡）→
`ApprovalTicker`（匿名喜报滚动）→ `BatchPoll`（按批次的月度一题）→
`CardView`（回声条 + PNG 下载 + 长按保存的 `<img>`）→ `FormView`（填优先日时实时提示
落在哪一批）→ `LockedTeaser`（没填表只看全站粗汇总）→ `BatchView`（波浪图 + 阶段条）。

一个已修的坑：数据新鲜度算「这批最近多久前有人更新」时**必须排除自己**——
把自己刚提交的 0 天算进去，永远显示「0 天前」，没有信息量。

### 邮件模板已经改了（唯一一处碰到线上代码路径的改动）

`functions/api/_emailTemplates.js` 的 `renderMonthlyUpdateEmail` 多了个可选参数
`batchNews`，形如 `{label:'2021 年 Q1', moved:3, approved:1, total:12}`，
渲染成正文里一行「你这批本月有 3 个人往前走了一步」。**不传时输出与改动前逐字节相同**，
所以现在推上去也不会影响月度信。`send-monthly.js` 还没有传这个参数，等后端能出数了再接。

### 截图

`shots/` 目录（未跟踪）：`t*` 第一版草稿、`u*` 改成图表并挪进 tab、`v*` 类别表收起、
`w1`-`w5` 十条社区化改造后的最终草稿。`shot_tracker.mjs` 是 Playwright 截图脚本
（要先 `npm run dev`，脚本用 `addInitScript` 预置 localStorage 的 `userCase`）。
**seed 的 `userCase` 必须带 `inUS: true`**，否则 App 的加载判断不认，会 fallback 成
默认优先日 2024-07-15，填表的日期单调校验就过不了、提交按钮一直是灰的。

### 下一步要业主先拍板三件事，backend 才能动

1. 去 Cloudflare 后台建 D1 库并绑成变量名 `DB`（AI 做不了，仓库里没有 `wrangler.toml`）；
   绑完必须触发**新部署**，Retry deployment 不生效
2. 同意加 `wrangler` 到 devDependencies，否则本地跑不了 Pages Functions，
   「改完先跑本地看效果」做不到
3. 同意把 KV 里已有的 `cd:timeline:*` / `pr:*` 记录迁进 D1 当冷启动种子（只读不删）

写 `functions/api/tracker.js` 时记住：**所有 fetch 都要写成 `` `${API_BASE}/api/tracker` ``**，
不然 iOS 版这个功能整个失灵。

**状态**：未 commit、未推送，业主还没说要推。

---

## 第 27 轮（2026-08-20）：接后端——D1 建了、`/api/tracker` 写了、`Tracker.jsx` 全部换成真数据

还在 `feat/tracker` 分支，叠在第 26 轮之上，**依然未 commit、未推送**。这轮把上一轮的 mock 换成真 D1 + Pages Function，`src/Tracker.jsx` 里唯一一处 `TODO(api)` 已清掉。

### D1：库建了，但生产环境还没绑定

这台机器上其实有现成的 wrangler OAuth 登录（`ywang0226@gmail.com`），比原计划设想的"AI 完全做不了"要多一点权限：

- 已用 `wrangler d1 create gctracker` 建库，`database_id = 3efb6f15-556a-4188-89df-cceae87af893`，
  已跑 `d1/tracker-schema.sql` 建表（`--remote` 真库和 `--local` 本地库都跑过）。
- **生产 Pages 项目 `greencardtracker` 还没绑定这个 D1**，这步业主要自己去 Dashboard 做：
  Settings → Functions → D1 database bindings → 变量名填 `DB` → 选 `gctracker`，绑完触发一次新部署。
  **没有直接用 Cloudflare API 绑**是有意为之——查了下项目现有 `env_vars` 里的
  `ADMIN_TOKEN`/`UNSUBSCRIBE_SECRET` 是 `secret_text`，GET 接口只回空字符串（API 不吐真值），
  如果照搬 GET 到的 `deployment_configs.production` 整段 PATCH 回去，等于把这两个密钥焊成空值——
  退订链接和 `/api/admin/send-monthly` 会全线失效且没法恢复。业主选了"去 Dashboard 手动绑"这条路。

### KV → D1 迁移：决定不搬，原因是两份旧数据压根没有优先日

`TRACKER-PLAN.md` 原计划写"搬只读不删、推荐搬"，但真去看了 `cd:timeline:*`（`community.js`）和
`pr:*`（`progress.js`）两份 KV 数据的字段，发现**都没有 priority date 这个字段**——
`cd:timeline:*` 存的是"递交日"不是"优先日"（两者对 F4/EB2 中国这类排队大类可以差好几年），
`pr:*` 只有 `filedMonth`，同样不是优先日。而这整个进度墙功能的批次机制（`quarterOf(priorityDate)`）
完全靠优先日分批，编一个假优先日会直接污染真实用户会看到的"这批中位等待""这批排第几"这些数字。
所以这轮**没有写迁移脚本**，D1 从空表开始积累真实提交，不算漏做，是数据完整性判断下的取舍。

### `functions/api/tracker.js`（新建）

`POST`（提交/更新，`ownerId` 唯一键 upsert）、`GET ?owner=`（老用户回访水合）、
`GET ?summary=1`（没填表的人看的全站粗汇总）。**K_MIN=5、日期粗化到月、中位数**这三条
全部在这个文件里算，前端拿到的永远是算好的聚合数字（`batch`/`cat` 两个对象），
除了自己的记录（`record`）之外**看不到任何一条别人的原始逐条数据**——
这是第 26 轮结尾明确要求的"上线时必须挪进后端取数层"。
限流复用 `SUBSCRIBERS` KV，前缀 `trkl:`，3 次/IP/天（比 community.js 的 20 次更严，照抄 TRACKER-PLAN 的建议值）。

### `src/Tracker.jsx`：`MOCK_CASES` 整段删了，`computeBatch`/图表分桶/阶段分布/日期粗化全部移除

浏览器端新增 `localStorage` 存的匿名 `ownerId`（key `gc_tracker_owner_id`），页面挂载时并发拉
`GET ?summary=1` + `GET ?owner=<id>`，有记录就直接进卡片页（老用户回访不用重填）。
`CardView`/`BatchView` 现在吃的是后端返回的 `batch`/`cat` 聚合对象，不再自己拿 `rows` 数组算——
这个改动是这轮的核心，不只是换数据源，是把"谁能看到什么"的边界从前端约定改成后端强制。
`BatchPoll`（月度一题）**这轮没碰**，百分比还是写死的占位数字——`Tracker.jsx` 里当时只标了
一处 `TODO(api)`（就是 `MOCK_CASES` 那行），投票没标，视为本轮范围外。

### 本地联调：真跑通了，不是只测到 fetch 拼对

装了 `wrangler`（devDependencies）。**新建了 `wrangler.toml`，但特意没提交**——加进了
`.gitignore`（连同 `.wrangler/`）。原因：这个 Pages 项目是 Git 集成部署（Cloudflare 从源码构建，
不是从 `wrangler.toml` 构建），但较新版本的 Cloudflare Pages 一旦检测到仓库里有
`wrangler.toml`（尤其带 `pages_build_output_dir`）会开始用它接管构建配置，有动到生产部署行为的风险。
这份 `wrangler.toml` 只用来给本机 `wrangler pages dev`/`wrangler d1 execute --local` 解析绑定名，
下一轮想在本地跑 `/api/*` 记得它还在（未跟踪，`git status` 看不到很正常）。

用 `wrangler pages dev dist --port 8791` 起本地服务器（真跑 Pages Functions + 本地 D1 SQLite），
`curl` 验证了：新提交建批次、同 `ownerId` 二次提交是更新不是建新记录、K_MIN 从"还差 N 人"到
"enough=true"的临界点、无效 `cat`/日期早于优先日会被拒、限流第 4 次真的 429。
又用 Playwright（`shot_tracker_live.mjs`，未跟踪，仿照第 26 轮的 `shot_tracker.mjs`）跑了完整浏览器流程：
填表提交 → 卡片页（真实批次统计渲染正确）→ 批次页（图表/阶段分布/走过的日期范围全部来自真数据）→
刷新页面回到"动态" tab（验证 `GET ?owner=` 真的能把老用户直接带回卡片页，不用重填）。
截图在 `shots/live1`-`live4`。跑完照 `CLAUDE.md` 规矩 `git checkout -- dist/ && git clean -fdq dist/` 清过了。

### 下一步

1. 业主去 Dashboard 把 D1 绑到 `greencardtracker` 项目（变量名 `DB`），绑完触发新部署——
   这步做完之前，推上 `main` 后线上的 `/api/tracker` 会因为 `env.DB` 不存在直接报 500。
2. `BatchPoll` 投票百分比还是占位数字，要接真数据是另一轮的事。
3. ~~全程没 commit、没 push，等业主看完说推再推~~ ——第 28 轮已经 commit + push
   到 `feat/tracker`（不是 main），见下方。

---

## 第 28 轮（2026-08-20）：「如果」tab 让位给「社区」，位置图重做，commit + push 到 feat/tracker（未合并 main）

同一天内、接第 27 轮之后继续。业主在会话里连续给了三轮反馈，这轮全部做完了：

### 1. 导航结构变了：「如果」(CompareHub) 让位给「社区」

业主原话「这个可以把'如果'这个tab替代，换成'社区'」——不新开导航位（依然只有 6 个 tab），
把原来挂在「如果」位置的 `CompareHub` 挪进新「社区」tab 底部的 `<details>`（默认收起，
标题「如果换类别、换身份会更快吗」），`CompareHub` 组件本身一行没删，只是不再占独立导航位。
新「社区」tab（`tab === 'compare'` 这个 id 复用了，只是 label/icon 换了）内容从上到下是：
`TrackerPage`（案件进度墙，从「动态」tab 挪过来）→ `CommunityHub`（投票/打卡墙/调查，
原来缩在「总结」页最底下，现在提到独立 tab）→ 收起的 `CompareHub`。
翻译对象里 `navCompare` 的三语字符串（`如果`/如果`/`What if`）改成了 `社区`/`社區`/`Community`，
key 名字没动（省得再改别处引用）。图标从 `Target` 换成 `Users`。

新增组件 `CommunityPage`（`src/App.jsx`，紧跟在 `CompareHub` 定义之后），是这轮唯一新增的
拼装组件，纯粹组合上面三块，没有自己的业务逻辑。

**「动态」tab 现在干净了**——`TrackerPage` 的挂载点从 `tab === 'update'` 分支移到了
`tab === 'compare'` 分支，「总结」页底部也不再渲染 `CommunityHub`。

### 2. 打卡墙默认收起到 5 条

业主原话「打卡墙占用位置太多，收起来」。`CommunityHub`（`src/App.jsx`，`wall` tab 渲染块）
新增本地状态 `wallExpanded`（默认 `false`），列表默认 `wall.entries.slice(0, 5)`，超过 5 条
才出现「展开全部 N 条」按钮，点了变「收起」。纯前端截断，不改 `/api/community` 返回的数据
（后端本来就只返回最近 20 条，这条不用动）。

### 3. 「你在哪个位置」重做了两轮才定型

第一版做了两个方案给业主看（位置刻度尺 `RankGauge` + 排队点阵 `RankQueueDots`），业主反馈
「都做的不怎么样，有没有bar chart或者histogram」，两个方案整个删掉重做，换成：

- **`RankBar`**（分段条形图）：整条按"前面 N 人 / 你 / 后面 M 人"分三段，你那一段固定
  给最小可视宽度（否则人多时你那一段会细成看不见的一条线），下面配一行直接标数字的说明，
  另加一句「位置按优先日先后排，不是案子的等待进度」——防止被当成完成度进度条看。
- **`StageHistogram`**（阶段直方图）：真正的柱状图，直接吃 `b.stageDist`（后端第 27 轮
  已经算好、`CardView` 本来就有这个 prop，零新增数据），你自己在的那根柱子琥珀色高亮。

两个都只用 `rank`/`total`/`stageDist`，不需要任何人的原始逐条数据，后端一行没改。

### 4. 进度卡（`ProgressCardSVG`）数字顶到统计框上边框——第 26 轮遗留的排版 bug，这轮修了

业主反馈「文字都顶到边框上沿了」。根因：`bigNum()` 里数字用 86px 字号，原来基线定在
`y=522`，而统计框 `<rect y="468" height="176">` 顶边在 468——86px 字体的上伸部分大概
65px 高，`522-65=457`，比框顶（468）还高 11px，数字顶部实际上探出了框的上边框。
改法：把整组文字（数字/label/sub-label）基线整体下移，数字 `522→548`、label `570→594`、
sub-label `608→624`，两条分隔竖线 `y1/y2` 从 `502/612` 改成 `526/620`，"还差 N 人"那个
分支的三行文字同步下移对齐。这是 `ProgressCardSVG` 里的问题，第 26 轮写的时候就带着，
不是这轮新引入的——以后再手调这张卡的坐标，字号超过 60px 的文字都要留这个心。

### 验证方式

`npm run build` → `wrangler pages dev dist` 本地起真后端 → Playwright 截图验证（脚本
`shot_community.mjs`/`shot_rankcharts.mjs`/`shot_barchart_wall.mjs`/`shot_verify_fix.mjs`，
未跟踪，跟第 26/27 轮的 `shot_tracker*.mjs` 一个套路）：导航栏文字确认变了、社区页三块都在、
CompareHub 展开后功能完整、打卡墙收起/展开都好使、进度卡数字不再顶边框。每次测完照
`CLAUDE.md` 规矩清过 `dist/`。

### 状态：已 commit + push 到 `feat/tracker`，没碰 main

业主原话「改完后你先commit和push，我看看真实长什么样」——这次不是只截图了，是真推了。
commit `33d9fff`，`git push -u origin feat/tracker`（**不是 main**，生产站 gc.jmjvc.us 没受影响）。
Cloudflare 自动建了预览部署：`https://f8956006.greencardtracker-brv.pages.dev`。

**这个提交范围是精心挑过的，没有顺手带上第 25 轮那堆 iOS/Capacitor 的未提交改动**
（`capacitor.config.ts`、`codemagic.yaml`、`ios/` 依然是未跟踪状态，这轮没碰它们，
以后 `git status` 看到这几个还在很正常，不是漏提交）。`package.json`/`package-lock.json`/
`node_modules/.package-lock.json` 这三个文件例外——iOS 那轮加的 `@capacitor/*`、
`typescript` 依赖跟这轮加的 `wrangler` 已经混在同一份 `package.json` 里没法干净拆开，
这轮直接原样提交了整份（多出来的 capacitor 依赖躺在 devDependencies 里不影响这次的构建）。

**这个预览链接上 `/api/tracker` 会报错**——D1 还没在 Dashboard 绑定（见第 27 轮「下一步」
第 1 条），社区 tab 的导航结构、CompareHub 收起、打卡墙收起这些纯前端改动能看，
但填表提交会因为 `env.DB` 不存在直接 500。已经明确告诉业主这条限制。

---

## 第 29 轮（2026-08-20，接第 28 轮）：D1 绑定完成、合并 main 上线、自动加入、图表换真实大样本

### D1 绑定 + 合并 main（业主在 Dashboard 手动操作，我这边验证）

业主在 Cloudflare Pages Dashboard → Settings → Bindings 里，给 Production 和 Preview 两个环境
都加了 D1 database 绑定（`DB` → `gctracker`）。绑定生效需要新部署（Retry 不算），先用一个空
commit 触发（`7fd2811`），确认 `/api/tracker` 在生产环境不再 500。业主问清楚 `feat/tracker`
分支是什么、确认「做！」之后合并进 `main`，`gc.jmjvc.us` 正式带上众包进度墙功能。合并后
`curl` 一度收到旧 HTML（边缘缓存没刷新，不是真故障），加时间戳参数重试后恢复正常。

### 自动加入（不用重填表单）

业主原话「有没有默认就有……不需要给那么多其他信息」——选了「自动用已知信息交一条，别再问
一遍」而不是「只读预览不留数据」。逻辑：进「社区」tab 时如果本站已经知道你的类别+优先日
（首次引导时填过），自动 POST 一条到 D1（阶段日期全留空），直接出卡，跳过填表页。`CardView`
加了 `autoJoined` 时的透明提示（「用你已经填过的……不想加入的话点『改一下我填的』可以改」），
不完全隐式。commit `fd46342`，已推 main。上线后清测试记录时，D1 里发现一条不是我建的真实
记录（EB3·台湾·2024-07-15）——大概率是自动加入功能已经被真实访客用了，没有删，只删了自己
那条测试记录。

### 图表"太单调"——换成真实的 90+ 订阅者做样本，不再只看 D1 那 1、2 条

业主看完线上效果说位置图/阶段图太单调，要求"无论是谁一点进去都要看到 bar chart、histogram、
line chart，还要有排名、平均数、中位数"。根因不是图表组件本身有问题（`RankBar`、
`StageHistogram`、`BatchView` 里的季度折线图早就是真正的图表组件），是数据源太小——D1
`cases` 表是全新的 opt-in 表，刚上线时只有个位数真实记录，`total`/`enough` 卡在 K_MIN=5
门槛下面，图表整块被隐藏。

真正的大样本其实早就在了：`SUBSCRIBERS` KV 里有 90+ 个已确认邮件订阅者，每人的
`userCase.{category,country,priorityDate}` 从订阅表单收集，跟 `cases` 表问的是同一件事，
只是入口不同（`~/kb/scripts/gctracker/subs.sh -a` 能查，08-20 实测 EB2 21/F4 20/EB3 16/
EB1 10/EB4 8/EW 7/F2B 6/EB5 5/F2A 3/SR 1）。方案是把这两个population 合并，但只合并"总人数/
中位数/平均数/排名/季度分布直方图"这几项——阶段进度（递交/收件/指纹……）不合并，因为订阅者
没填过那些日期，硬合并会让"大家走到哪一步了"图表显示成一堆假的"还没递交"。

改动在 `functions/api/tracker.js`：
- 新增 `subscriberPopulation(env)`：遍历 `SUBSCRIBERS` KV（复用
  `admin/subscribers.js` 那套按前缀跳过限流/分析/进度墙/社区互动等非订阅者 key 的过滤逻辑），
  取 `confirmed===true` 且类别/国别/优先日合法的记录，结果缓存进 KV（`cs:subpop:v1`，15 分钟
  TTL）——避免每次请求都全量 list+get 一遍 KV。
- 新增 `aggregatePop(rows)`：只算 `total`/`medianWait`/`meanWait`，D1 行和订阅者行统一按
  `priority_date` 算等待时长（订阅者没有 `d_approved`，自动按"还在等"处理，语义正确）。
- `hydrate()` 改成两条平行的聚合：`stageAgg`（D1-only，喂 `stageDist`/`walked`/`approvedN`，
  语义不变）+ `popAgg`（D1 ∪ 订阅者合并，喂 `total`/`rank`/`medianWait`/`meanWait`/K_MIN 门槛
  判断、以及 `cat.chart.buckets` 季度直方图）。返回结构新增 `stageN` 字段区分"填过完整进度的
  人数"和"总人数"两个不同分母。

前端 `src/Tracker.jsx` 配合调整：
- `CardView` 的"位置图+阶段图"从硬性 `b.total > 1` 才显示，改成看 `b.enough`（K_MIN 判断），
  不够时显示"还差 N 人"提示而不是整块消失（跟 `BatchView` 已有的 `locked` 套路保持一致）。
  阶段图额外加了"只算 N 个登记过完整进度的人"的说明，避免"排第 9 位/共 16 人"和"阶段图只有
  1 个批准"两个数字放在一起显得矛盾。
- `BatchView` 汇总段落加了平均等待（原来只有中位数），阶段相关的两个板块（阶段柱状图、
  "各步都在什么时候走过"）在 `stageN === 0` 时改成一句提示文字，不再渲染全零的空图表。

本地用 `wrangler pages dev --local` 真实 D1+KV 验证过：手动往本地 KV 塞了几条模拟订阅者记录
（不同季度/已确认/未确认都测了），确认未确认的被过滤掉、跨季度的正确分流进 `cat` 但不进
`batch`、`stageDist`/`walked` 不被订阅者数据污染，Playwright 截图（`shot_bigpop.mjs`，未提交）
确认位置条形图、阶段柱状图、季度折线图三种图表和排名/中位数/平均数文案都正常渲染。

业主说「推」，commit `d4102a5` 推了 main。上线后用真实数据核对：EB2·中国大陆合并后有 20 人
（跟 `subs.sh -a` 报的 21 人基本对上），EB3·台湾这种冷门组合合并后只有 1 人，正确显示"还差 4
人"而不是硬凑——两条路径都验证过是真实数据在跑，不是假数据。用完删掉了自己建的测试记录
（`verify-eb2-china-test-9f8e7d6c`）。

### 追加：连"批次"这层季度过滤也去掉了（业主反馈"不要卡人，直接给总体数据"）

业主看完线上效果，指出即使合并了订阅者，`batch`（同类别+同国家+**同季度**）这个口径还是切
太细——大多数人自己那个季度依然凑不够 K_MIN=5，位置图照样显示"还差 N 人"。业主原话「你就不
要卡季度啊……你还没懂我的意思，你这里不要卡人，直接给总体数据」。

改法：`hydrate()` 里 `mates`/`subMates` 不再按 `quarterOf(priority_date) === myQuarter` 过滤，
直接用整个 `catRows`/`subCatRows`——`batch` 现在在数值上就是 `cat`（只是 `batch` 多带
`rank`/`fresh`/`sameStep` 这几个"跟我有关"的字段，`cat` 多带 `chart.buckets` 季度直方图）。
`label`/`short` 还是显示"你自己优先日落在哪一季"，纯描述性，不再是过滤条件。

前端 `BatchView` 原来的"只看我这批 / 整个类别"切换按钮因此变成了纯摆设（两个 tab 数字会一模
一样）——直接删掉切换逻辑，`scope` state 整个去掉，统一显示同类别同国家的数据，锁定判断从
`scope==='mine' && !b.enough` 简化成 `!b.enough`。相关文案里"这{批/类}"的三元表达式全部改成
固定用"同类别同国家"或"这类"，不再区分两种口径。

本地验证：本来 EB2·中国·2021Q1 合并后是 16 人（第一次改动只合并了同季度的订阅者），这次改完
变成 17 人（多算进了一条 2020Q4 的模拟订阅者），确认季度过滤真的被去掉了；`BatchView` 截图
确认切换按钮消失、页面统一显示"同类别同国家一共 17 个人"。

**尚未推送**——这次改完本地验证过，还没 push。

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
- **`SUBSCRIBERS` KV 里混了一堆用途的 key**（限流 `rl:`/`trkl:`、分析 `an:`、邮件事件
  `ev:`/`es:`、进度墙 `pr:`/`prl:`、社区互动 `cd:`/`crl:`），真正的订阅者记录是裸 email 做
  key、没有前缀。新写任何"遍历全部订阅者"的逻辑，前缀跳过表必须完整抄一份（见
  `admin/subscribers.js` 或第 29 轮 `subscriberPopulation()`），漏一个前缀就会把非订阅者的
  裸数字/短记录当 JSON 解析出错或者当假订阅者混进统计——第 29 轮之前已经因为漏了 `trkl:`
  导致 `subs.sh` 崩溃过一次（commit `f156f60`）。全量 list+get 有 KV 读取成本，遍历结果要缓存
  （15 分钟 TTL 起步），不要每个请求都扫一遍。

---

## 边界

- 代码不进 kb。kb 里只有一页索引：`~/kb/projects/GCTracker 绿卡排期追踪站.md`。
- 不要向用户索取 Cloudflare 登录凭证或 `ADMIN_TOKEN`。
