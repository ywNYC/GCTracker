# 众包案件进度墙 实施方案（2026-08-20）

> **当前状态：前端草稿做完了，数据全是 mock，后端一行没写，未提交未推送。**
> 分支 `feat/tracker`，前端在 `src/Tracker.jsx`（801 行），挂在「动态」tab 内
> （`src/App.jsx` 第 17002 行），截图在 `shots/w1`-`w5`。
> 下面第一、三、四节（D1、接口、反刷）**还没做**，第二节的路由方案**已被推翻**，
> 第五节的卡片**已做完但口径改了**（改成按批次、用人数不用百分比）。
> 交接摘要见 `PROJECT_STATE.md` 第 26 轮。


开工前的关键发现：**这个功能有一大半站上已经在收了。** `/api/community` 的 `timeline`
类型已在收「六个阶段日期 + 服务中心 + AOS/CP」，`/api/progress` 在收「当前阶段」，
只是散在两个 KV 端点里、没有优先日、没法认领、没有列表页、没有卡片。
所以这不是从零建，是把已有的散数据收拢进 D1 再补上前台。

---

## 一、要业主拍板的三件事（其余按推荐值走）

### ① D1 得业主去 Cloudflare 后台建，AI 做不了

仓库里没有 `wrangler.toml`，现有的 KV 也是在后台绑的。需要：
Dashboard → Workers & Pages → D1 → 建库（建议名 `gctracker`）→ 回到 Pages 项目 →
Settings → Functions → D1 database bindings → 变量名填 **`DB`**，指向那个库。

绑完必须**触发一次新部署**——Retry deployment 不生效（PROJECT_STATE「别重踩的坑」有记）。

### ② 本地要跑 `/api/*`，得装 `wrangler`

现在 `npm run dev` 是纯 Vite，Pages Functions 根本不跑——第 19 轮吃过这个亏
（「提交本身没有实测，只测到前端把请求 body 拼对为止」）。要做到「改完先跑本地
让我看效果」，就得加 `wrangler` 到 devDependencies，用 `wrangler pages dev` 起本地 D1
（`--local`，落成本机 SQLite 文件，不碰线上）。

它不是 UI 库，不违反「不引入新 UI 库」那条硬约束。
不想装的退路：本地只用假数据看 UI，接口等上线后实测。**推荐装。**

### ③ 旧数据要不要迁进 D1 当冷启动种子

KV 里已有的 `cd:timeline:*` 和 `pr:*` 记录（包括那条 1234 天的测试留言）可以一次性
搬进 D1，这样列表页上线第一天不是空的。这些记录没有优先日，优先日列留空、
只显示阶段和已等月数。搬是只读 + 写新表，**不删任何 KV 数据**。**推荐搬。**

---

## 二、挂在哪（已定：不新开导航位，进「动态」tab）

**原方案（`public/_redirects` + `pathname === '/tracker'` 整页渲染）已作废。**
业主原话：「你可以放在 6 个选项里面的其中一个你不要再新开设」。

现在的做法：

- `src/App.jsx` 第 17002-17003 行，`{tab === 'update' && <TrackerPage userCase={userCase} />}`，
  跟在 `MonthlyUpdate` 下面，不进 `tabs` 数组、不占导航位
- `public/_redirects` 已删除；tab 白名单里加过的 `'tracker'` 项也已撤掉
- `TrackerPage` 接 `userCase`，用户在站上已选的类别/出生地/优先日直接预填进表单
- 同一页的「各类别变化」15 类别表格已包进原生 `<details>` 收起
  （第 7123-7174 行），给进度墙腾出视觉重心

iOS 壳不受影响——本来就是同一个 tab state，没有路径依赖。

## 三、数据（D1）

一张主表 + 一张邮箱表分开放——这样列表页的 SQL 无论怎么写都不可能顺手把邮箱带出来：

```sql
CREATE TABLE cases (
  id            TEXT PRIMARY KEY,
  owner_id      TEXT NOT NULL,          -- 浏览器本地生成的匿名 ID
  cat           TEXT NOT NULL,          -- EB1/EB2/.../F4，沿用 community.js 的 15 个枚举
  country       TEXT NOT NULL,
  priority_date TEXT NOT NULL,          -- YYYY-MM-DD
  path          TEXT NOT NULL,          -- aos | cp
  center        TEXT NOT NULL,          -- NSC/TSC/Potomac/MSC/guangzhou/...
  milestone     TEXT NOT NULL,          -- 当前阶段
  d_filed TEXT, d_receipt TEXT, d_bio TEXT,
  d_int_sched TEXT, d_interview TEXT, d_approved TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  ip_hash TEXT                          -- SHA-256(ip + 日期 + 盐)，不存原始 IP
);
CREATE INDEX idx_cases_cat_pd ON cases(cat, country, priority_date);
CREATE INDEX idx_cases_owner  ON cases(owner_id);

CREATE TABLE notify_emails (            -- 可选，本轮只落库不发信
  case_id TEXT PRIMARY KEY,
  email   TEXT NOT NULL,
  created_at TEXT NOT NULL
);
```

阶段枚举与 `community.js` 的 `TIMELINE_KEYS` 对齐，多加一个「面试排期」（现在没有）。
类别 / 国家 / 服务中心枚举从 `community.js` 抽成共享常量，不重打一遍——
不然哪天加类别（像上次加 EW、EB5R）又得改两处。

**为什么用 D1 不继续用 KV**：列表页要按类别、优先日区间、服务中心筛选并排序。
KV 只能全量 list 再在内存里过，现在几十条无所谓，几千条就是每次请求把整个库读一遍。
这是 D1 真正值的地方，不是为了用而用。

---

## 四、接口

**`functions/api/tracker.js`**

| 方法 | 用途 |
|---|---|
| `POST` | 提交/更新。带 `owner_id` 且库里已有该 owner 的记录就 UPDATE，否则 INSERT。**返回值直接带上算好的卡片统计**，前端不用二次请求——「三步之内看到结果」靠这个 |
| `GET ?owner=<id>` | 取回自己的记录用于回访修改 |
| `GET ?list=1&cat=&country=&pdFrom=&pdTo=&center=&page=` | 列表页，服务端分页 `LIMIT 50`，默认 `ORDER BY priority_date ASC`。**返回值绝不含 `owner_id` / `ip_hash`** |
| `GET ?stats=1&cat=&country=&pd=` | 卡片统计单独可取（分享链接打开时用） |

**反刷与数据质量**

- 同 `ip_hash` 每日 3 次（比现有 `crl:` 的 20 严）
- 优先日早于 2005-01-01 或晚于今天直接拒
- 各阶段日期必须单调递增、不早于优先日、不晚于今天
- POST body 上限 2KB
- 统计一律中位数，不用均值

**`functions/api/admin/tracker-import.js`**（一次性，带 `ADMIN_TOKEN`）：
把 KV 的 timeline/progress 搬进 D1，幂等（同一条 KV key 只搬一次）。

---

## 五、进度卡（重点，做丑了整个功能白做）

复用 `ShareCardModal` 已验证过的 **SVG → canvas → PNG** 管道（`src/App.jsx` 第 3137 行），
尺寸从 1080×1350 改成 **1080×1440（3:4，小红书竖版）**。

### 三个已知的坑，照抄现有卡的做法避开

1. SVG 序列化后喂 `new Image()`，**外部字体和 CSS 全部失效**。卡面只能用 `<text>` +
   系统字体族（PingFang / Noto），不能用 `foreignObject`、不能用 Tailwind class。
   现有那张卡就是这么写的。
2. 卡面配色**写死**，不跟主题变量走——站上有报纸米色和领事馆藏青两套主题，
   卡跟着变会导致同一张卡两个人看到两个样。
3. 微信 / 小红书内置浏览器和 iOS Safari 对 `link.click()` 下载支持很差，经常是直接
   打开而不是存图。所以除了下载按钮，**同时把生成的 PNG 塞进一个 `<img>` 显示出来
   让用户长按保存**——手机上真正走得通的是这条。

### 卡面内容与口径

- **「你排在同类第 X 位」** = 同类别同国家、优先日早于你的人数 + 1。
  必须写清「在本站已登记的 N 人中」，否则就是在编一个全国排名。
- **「同优先日的人已等 Y 个月」** —— 用中位数，且「同优先日」放宽成 **±45 天**。
  卡死在同一天几乎凑不出样本。
- **「同批人里 Z% 批准」** —— 分母同上那批人，**样本 <5 不显示百分比**。
- **时间轴** —— 把用户填了的阶段按日期画出来，没填的画成灰色待走。

### 冷启动的处理

样本不足 5 人时，卡片不显示那三个统计，换成「你是本站第 N 位登记的 EB-2 中国案例，
还差 X 人解锁同批人对比」。第一个填的人看到「你排第 1 位、0% 批准」是最难堪的失败
模式，反过来做成「缺人」反而是分享动机。

卡上固定一行小字「用户自报数据，非官方统计 · gc.jmjvc.us」——
既是防误读的免责，也是引流。

---

## 六、交付分四步，每步业主都能看到东西

| 步 | 内容 | 状态 |
|---|---|---|
| 1 | D1 建表 + `/api/tracker` + 本地 wrangler 跑通 | **没做**，卡在业主拍板那三件事 |
| 2 | 填表页（挂进「动态」tab） | 做完，`shots/w1` |
| 3 | 进度卡 + PNG 导出 | 做完，`shots/w2` |
| 4 | ~~列表页~~ → 批次图表页 + 旧数据迁移 | 图表做完（`shots/w3`-`w5`），迁移没做 |

**列表页被业主砍了**：原话「不可以把所有人的信息都这样子呈现出来……太多信息了」。
换成季度分桶波浪图 + 各阶段人数条 + 一句话小结，页面上不出现任何个案明细。

全程不 push，业主说了才推。做完把结论按现有格式追加成 PROJECT_STATE.md 的「第 26 轮」。

**本轮不做**：登录、评论、私信、通知邮件。邮箱只落库不发信。

---

## 七、工作区是脏的，开工前要处理

`~/GCTracker` 现有一堆未提交改动——Capacitor iOS 那轮的 `ios/`、`codemagic.yaml`、
`capacitor.config.ts`，还有 `src/App.jsx` 里那 23 处 `API_BASE` 前缀。新功能会叠在这些之上。

**所有 `fetch('/api/tracker')` 都必须写成 `` `${API_BASE}/api/tracker` ``**，
不然 iOS 版这个功能整个失灵——PROJECT_STATE 里明确写了这条规矩。

建议开 `feat/tracker` 分支做，iOS 那堆先原样留在工作区别动。

---

## 补充（2026-08-20）：社区化的十条建议 + 隐私防线

核心思路：**让所有互动发生在「批次」上，不发生在「个人」上**——
社区感和不泄漏个人信息，走的是同一条路。

| # | 建议 | 参考的成功例子 | 类型 |
|---|---|---|---|
| 1 | 按批次分组（`2021 Q1 · EB2 · 中国`），页面永不出现个人 | Trackitt 的 receipt-month 讨论串 | 引擎 |
| 2 | give-to-get：不填表只看全站粗汇总，填完解锁自己那批细分 | Levels.fyi / Glassdoor | 引擎 |
| 3 | 任何切片样本 <5 就返回「样本不足」，**写死在后端取数层** | k-匿名惯例 | 防线 |
| 4 | 列表/图表日期一律粗化到月，只有本人看自己的卡才到日 | — | 防线 |
| 5 | 提交后立刻给「本周有 23 人跟你同一批也在等指纹」 | DownDetector | 引擎 |
| 6 | 月度一题改成按批次问「你这批这个月动了吗」，只公布比例 | 已有 CURRENT_POLL 改造 | 留存 |
| 7 | 匿名喜报广播「EB-2 中国 2021 Q1 有人批了」，不带其他字段 | VisaJourney / Trackitt | 引擎 |
| 8 | 进度卡改放「我这批 47 人里排第 12」而不是个人精确日期 | — | 防线+传播 |
| 9 | 标数据新鲜度「3 天前更新，来自 12 个人」 | 一亩三分地积分感 | 留存 |
| 10 | 月度邮件加一行「你这批本月有 3 个人走到面试」 | 已有 send-monthly 体系 | 留存 |

**为什么 3 和 4 必须一起做**：类别 + 服务中心 + 精确到日的批准日，三样叠在一起
在几百人的微信群里足以指认出是谁。只做样本门槛、不做日期粗化，防线是漏的。

第 8 条顺带解决了草稿里那个「同批已批准 0%」的难堪显示——批次口径下不出现空数字。

---

## 补充（2026-08-20 收工）：十条都已落进 `src/Tracker.jsx`

组件里用 ①-⑩ 注释一一对应上表。落地时改口径的三处：

- 第 8 条把卡面统计从百分比改成**人数**（「这批已批准 1 人」），顺带解决了冷启动
  「0% 批准」的难堪显示。原来那个「还差 N 人解锁」的变体保留，样本 <5 时才出。
- 第 9 条算「这批多久前有人更新」时**排除自己**——把自己刚提交的 0 天算进去，
  永远显示「0 天前」。0 天渲染成「今天」，没有别人时走 null 分支不显示这行。
- 第 10 条已经改进 `functions/api/_emailTemplates.js` 了（可选参数 `batchNews`，
  不传时输出逐字节不变），但 `send-monthly.js` 还没传，等后端能出数再接。

`K_MIN`、`coarse()`、中位数这三条现在写在前端常量里，**上线时必须挪进后端取数层**——
前端藏起来的数据，接口照样能拿到。
