# 🚀 快速部署指南 — 10分钟上线

最快的方式：GitHub + Cloudflare Pages。**零服务器、免费、全球 CDN**。

## Step 1: 推到 GitHub (2分钟)

```bash
# 在本地项目目录（解压后的 green-card-assistant-repo）
git init
git add .
git commit -m "initial commit"

# GitHub 上创建一个新仓库 (不要勾选 README/gitignore/license)
# 然后连接:
git remote add origin https://github.com/YOUR_USERNAME/green-card-assistant.git
git branch -M main
git push -u origin main
```

## Step 2: 连接 Cloudflare Pages (5分钟)

1. 打开 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 左边栏 **Workers & Pages** → **Create application** → **Pages** tab → **Connect to Git**
3. 授权 GitHub → 选择 `green-card-assistant` 仓库
4. 构建配置:
   ```
   Framework preset:        None (或 Vite)
   Build command:           npm run build
   Build output directory:  dist
   Root directory:          /
   Environment variables:   (留空)
   ```
5. **Save and Deploy**

等 2-3 分钟，部署完成。访问 `https://green-card-assistant-xxx.pages.dev` 即可看到你的网站！

## Step 3: 绑定自定义域名 (可选, 3分钟)

- Pages 项目 → **Custom domains** → **Set up a custom domain**
- 输入你的域名 → 按提示改 DNS (CNAME 到 `xxx.pages.dev`)
- SSL 自动配置

## Step 4: 开启自动排期更新 (2分钟)

1. GitHub repo → **Settings** → **Actions** → **General**
2. 滚到底部 **Workflow permissions** → 选 **Read and write permissions** → **Save**
3. **Actions** tab → 左侧选 **Auto-update Visa Bulletin** → 右上角 **Run workflow** → 点绿色 Run workflow 按钮
4. 等约30秒。如果看到绿色✅ 就成功了

之后每月8-21号自动运行，抓到新公告自动推送新 commit → Cloudflare 自动重部署。

## ✅ 部署后验证清单

访问你的网站:
- [ ] 首页正常加载，看到绿卡logo
- [ ] 切换三种语言（EN/简/繁）
- [ ] 切换 tab 查看所有功能
- [ ] 点击顶部"时光机"按钮，能看到3个月份选择
- [ ] 打开 F12 控制台，看到 `[bulletin] Loaded fresh data: 2026-05 source: initial-seed`

## 🔧 常见问题

**Q: 部署后看到空白页面**  
A: 检查 Cloudflare Pages 的 Build output directory 设为 `dist`。重新 trigger 部署。

**Q: 本地 `npm install` 报错**  
A: 确保 Node.js 版本 ≥ 18。推荐 Node 20。

**Q: GitHub Actions 第一次跑失败了**  
A: 大概率是 Workflow permissions 没开写入权限。检查 Step 4。

**Q: 想本地测试?**
```bash
npm install
npm run dev
# 访问 http://localhost:5173
```

**Q: 想手动更新排期数据?**
```bash
# 拉最新代码
git pull

# 手动跑一次爬虫
npm run scrape

# 如果 bulletin.json 有改动，推上去触发部署
git add bulletin.json
git commit -m "manual bulletin update"
git push
```

---

## 📚 深入阅读

- `README.md` — 项目总览和技术栈
- `AUTOMATED-UPDATES.md` — 自动更新系统的详细原理
- `DEPLOY-BACKEND.md` — 邮件订阅后端部署（可选功能）

有问题随时查看这些文档，基本覆盖所有场景。
