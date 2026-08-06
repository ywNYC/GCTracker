# GCTracker · 绿卡晴雨表

美国绿卡排期追踪站。线上 `gc.jmjvc.us`，托管在 Cloudflare Pages，仓库 `ywNYC/GCTracker`。

技术栈：Vite 5 + React 18 + Tailwind 3，无路由库（单页），`src/App.jsx` 是唯一组件文件（约 7000 行）。
Cloudflare Pages Functions 提供 `functions/api/` 下的订阅接口。

---

## 推送 = 上线，推送前必须问我

Cloudflare Pages 连着 GitHub，**推上 `main` 会立刻触发构建并上线**。

- 改动走功能分支，开 PR，我确认后再合
- 任何 `git push`（包括推分支）之前先问一句
- 不要自作主张 `git push --force`

本仓库历史此前全部由 GitHub 网页版拖拽上传产生（`Add files via upload`），
所以 commit 历史很乱且没有有意义的信息，不要指望从中考古。

---

## 最容易踩的坑：bulletin.json 有两份

```
bulletin.json          ← 仓库根，Vite 完全不管它，是历史遗留物，改它没有任何效果
public/bulletin.json   ← 真正被服务成 /bulletin.json 的那一份
```

Vite 把 `public/` 下的内容原样发布到站点根。**只有 `public/bulletin.json` 是活的。**
爬虫曾经写到根目录那份，导致即使抓取成功线上也永远不变（2026-08-06 已修）。

根目录那份暂时留着没删（AGENTS 式约束：删文件先问）。要清理请明确告诉我。

---

## 数据源：不要用 travel.state.gov

`travel.state.gov` 挂在 Cloudflare bot management 后面，对任何非浏览器客户端返回 **403**，
整站皆然（2026-08-06 从两条独立网络链路验证过，包括站点根）。GitHub Actions 跑在数据中心 IP 上，
只会被拦得更彻底。

改用 **`adoption.state.gov`**——国务院的另一个官方主机，用完全相同的路径镜像同一份公告，
普通请求返回 200。这不是绕过反爬，是换一台同样官方的服务器取同一份公开数据。

`scripts/scrape-bulletin.mjs` 里的 `BULLETIN_HOSTS` 按顺序尝试，第一个返回 200 的胜出。

---

## 爬虫

```
npm run scrape                                  # 正常模式：抓「下个月」公告（cron 用这个）
npm run scrape:seed                             # 种子模式：抓「当月」公告
node scripts/scrape-bulletin.mjs --month=2026-07  # 指定月份，用于回补
```

**回补历史月份要按时间顺序跑两次。** 每次写入时会把旧的 `current` 轮转成 `previous`，
所以想得到「current=8月, previous=7月」，就先 `--month=2026-07` 再 `--month=2026-08`。
`previous` 必须是 `current` 的相邻月——前端拿这两者之差算月度推进速度和预测曲线，
差了几个月会让趋势图严重失真。

退出码有语义，改的时候别破坏：

| 码 | 含义 | Actions 里的后果 |
|---|---|---|
| 0 | 成功（写了新数据，或本来就是最新） | 绿灯 |
| 1 | 网络错误 / 所有主机都失败 | 红灯，第二天 cron 自动重试 |
| 2 | 解析失败（对方改了 HTML 结构） | 红灯，需要人改 parser |

解析器直接对原始 HTML 做正则，没有 DOM 库。三个已知易碎点：

1. **`&nbsp;`** —— 真实标题是 `FOR&nbsp;EMPLOYMENT-BASED`，`\s+` 匹配不了。
   `parseVisaBulletinHTML` 开头统一把它归一成空格，所有偏移量都基于归一后的字符串。
2. **章节标题没有 `A.` / `B.` 序号**，别把序号加回正则里。
3. **文档顺序是「家庭」在前、「就业」在后**。四个章节各自从 0 开始独立搜索，
   不要改回单调游标——那会让后搜的那一对永远找不到。

---

## 定时任务

`.github/workflows/scrape-bulletin.yml`，cron `0 14 8-21 * *`（每月 8–21 号，UTC 14:00 = ET 09:00）。

**这个文件在 2026-08-06 之前从未存在过**，是"自动更新"一直没生效的根因。
它需要仓库设置里 **Settings → Actions → General → Workflow permissions = Read and write**，
否则 workflow 无法把新的 `public/bulletin.json` commit 回来。

---

## 已知未修

- `parseDate` 把 `U`（Unavailable，无名额）转成 `null`，与"缺数据"撞车。
  2026-08 的 EB2 印度就是 `U`，前端只判断 `days === null`，会渲染成"排期未到"，语义是错的。
  改它要同时动 scraper 输出和 `App.jsx` 的渲染，属于数据契约变更。
- 线上数据缺 2026-06、07 期。正常模式只抓「下个月」，永远不会回补中间月份。
- `src/App.jsx` 单文件约 7000 行；主包 582 KB 未做代码分割。

---

## 约定

- 正文与注释用中文，专业术语保留英文原词（`final action date`、`priority date`、`retrogression`、`I-485`）
- 不要为了"顺手整理"去重排或格式化没被要求改的代码
- 改 `src/App.jsx` 时先 grep 定位，不要整文件重写
