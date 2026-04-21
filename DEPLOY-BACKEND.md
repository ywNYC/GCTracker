# 📧 邮件订阅后端 - 部署指南

这份文档告诉你如何把邮件订阅从 mock 状态切换到**真实运行**——订阅会存进 Cloudflare KV，你随时可以查到所有订阅者并发邮件。

---

## 🏗️ 架构

```
用户填邮箱 + 订阅偏好
        ↓
green-card-assistant.jsx (前端)
        ↓
POST /api/subscribe (Cloudflare Pages Function)
        ↓
Cloudflare KV (SUBSCRIBERS)  ← 所有订阅存这里
        ↓
你每月手动拉 CSV → Resend/Postmark 发邮件
```

**关键优势**:
- 同域部署 (`/api/subscribe`)，**零 CORS 配置**
- 不需要另外部署 Worker
- KV 免费额度：10万读/天 + 1000写/天，够你跑到 ~1万订阅
- 完全 serverless，没有服务器维护

---

## 📁 文件清单

```
你的项目根目录/
├── green-card-assistant.jsx   ← 前端（已改好，调用 /api/subscribe）
├── index.html                  ← 你现有的入口
└── functions/                  ← 👈 新增这个目录
    └── api/
        ├── subscribe.js        ← 订阅端点 (POST/DELETE)
        └── admin/
            └── subscribers.js  ← 管理员端点 (GET，需 token)
```

**重要**：`functions/` 目录必须和 `index.html` **同级**，Cloudflare Pages 会自动识别并部署成 Functions。

---

## 🚀 部署步骤（10分钟搞定）

### Step 1: 创建 KV 命名空间

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 左侧菜单 → **Storage & Databases** → **KV**
3. 点 **Create a namespace**
4. 名字填：`SUBSCRIBERS`
5. 点 **Add**

### Step 2: 绑定 KV 到你的 Pages 项目

1. 进入你的 Pages 项目（比如 `green-card-assistant.pages.dev`）
2. **Settings** → **Bindings** (或老版本叫 **Functions** → **KV namespace bindings**)
3. 点 **Add binding** → 选 **KV namespace**
4. 填：
   - **Variable name**: `SUBSCRIBERS` (必须完全一致，大小写敏感)
   - **KV namespace**: 选刚创建的 `SUBSCRIBERS`
5. **Save**

### Step 3: 设置 admin token（用来查订阅）

1. Pages 项目 → **Settings** → **Environment variables**
2. **Add variable**:
   - **Variable name**: `ADMIN_TOKEN`
   - **Value**: 随便生成一个长字符串，比如用这条命令:
     ```bash
     openssl rand -hex 32
     ```
     复制出来的 64 位字符串就是你的 token。**保存好，后面查订阅要用**
3. 保存

### Step 4: 上传 `functions/` 目录

把本次输出的 `functions/` 文件夹放到你的项目根目录（和 `index.html` 同级），然后按你原本的部署方式推送（git push 或直接拖拽到 Pages）。

Cloudflare Pages 会自动识别 `functions/api/subscribe.js` 并把它挂到 `/api/subscribe` 路由上。**不用改前端代码路径**。

### Step 5: 验证

#### 5.1 测试订阅
```bash
curl -X POST https://your-site.pages.dev/api/subscribe \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "userCase": {
      "country": "Taiwan",
      "category": "EB3",
      "priorityDate": "2024-07-15",
      "inUS": true
    },
    "alerts": {
      "whenCurrent": true,
      "whenEligible": true,
      "monthlyUpdates": true,
      "retrogression": true
    },
    "language": "zh"
  }'
```

期待返回:
```json
{"success":true,"isUpdate":false,"message":"Subscribed"}
```

#### 5.2 查所有订阅
```bash
curl https://your-site.pages.dev/api/admin/subscribers \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN_FROM_STEP_3"
```

期待返回所有订阅记录。

#### 5.3 下载 CSV（适合每月推送前拉数据）
```bash
curl "https://your-site.pages.dev/api/admin/subscribers?format=csv" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -o subscribers.csv
```

#### 5.4 按条件筛选
```bash
# 只要订阅月更 + 中文的 EB3 用户
curl "https://your-site.pages.dev/api/admin/subscribers?lang=zh&category=EB3" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

---

## 📬 下一步：每月发邮件

推荐服务：**[Resend](https://resend.com)** (免费100封/天，域名验证简单，API 清爽)

### 示例发送脚本

在你本地（不用放进项目）建个 `send-monthly.js`:

```javascript
// npm install resend
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const API_BASE = 'https://your-site.pages.dev';

// 1. 拉订阅
const res = await fetch(`${API_BASE}/api/admin/subscribers`, {
  headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
});
const { subscribers } = await res.json();

// 2. 循环发邮件
for (const sub of subscribers) {
  if (!sub.alerts?.monthlyUpdates) continue;

  const { country, category, priorityDate } = sub.userCase || {};
  const langLabel = { zh: '中文', tw: '繁體', en: 'English' }[sub.language];

  // 示例 body - 你可以复用 jsx 里的翻译和逻辑生成更丰富内容
  const html = `
    <h2>📊 2026年5月绿卡排期更新</h2>
    <p>你好, ${sub.email}</p>
    <p>你的案子: <strong>${category} · ${country}</strong>, 优先日 ${priorityDate}</p>
    <p>本月排期 (示例)：${category} 最终裁定排期推进了 31 天。</p>
    <p>详细查看: <a href="${API_BASE}">${API_BASE}</a></p>
    <hr>
    <p style="font-size:11px;color:#888">
      不想再收？<a href="${API_BASE}/api/subscribe?email=${encodeURIComponent(sub.email)}">点此退订</a>
    </p>
  `;

  try {
    await resend.emails.send({
      from: 'bulletin@your-domain.com',
      to: sub.email,
      subject: '📊 2026年5月绿卡排期更新',
      html,
    });
    console.log(`✅ Sent to ${sub.email}`);
    await new Promise((r) => setTimeout(r, 300)); // 轻微限速
  } catch (err) {
    console.error(`❌ Failed ${sub.email}:`, err.message);
  }
}
```

跑一次:
```bash
RESEND_API_KEY=re_xxx ADMIN_TOKEN=xxx node send-monthly.js
```

---

## 🛡️ 安全考虑

**当前版本是 MVP**，适合几百到几千订阅的个人项目。如果规模上去要考虑：

### 已做
- ✅ 邮箱格式校验
- ✅ KV 绑定检查
- ✅ Admin endpoint 用 Bearer token 保护
- ✅ 同域部署，无 CORS 漏洞

### 建议后续加
- 🟡 **Rate limiting**：目前同一 IP 可以刷订阅（虽然一般没人闲着）。可以加 Cloudflare Turnstile (免费验证码)
- 🟡 **双重确认订阅 (double opt-in)**：发确认邮件 + 用户点链接才真正订阅。防止恶意拿别人邮箱订阅
- 🟡 **退订签名链接**：目前任何人知道邮箱就能退订。更安全的方式是在 `userCase` 里生成一个退订 token (HMAC-SHA256)，邮件里的退订链接带这个 token

### 数据隐私
- KV 里存的是邮箱 + `userCase`（含出生国、类别、优先日）+ IP + user-agent
- 如果要合规（GDPR/CCPA）：
  - 在前端订阅表单加"我同意..."复选框
  - 提供"请求删除我的数据"接口（DELETE /api/subscribe 已实现）
  - 隐私政策里说清楚收集什么、干什么用

---

## 🐛 排错

### "KV namespace SUBSCRIBERS not bound"
Step 2 没做好。回去确认绑定的 variable name 就是 `SUBSCRIBERS`（大写、完全一致）。

### "Unauthorized" 访问 admin 端点
Step 3 的 ADMIN_TOKEN 没设置，或者 curl 里 `Bearer` 后面的 token 不对。

### 前端订阅按钮一直转圈
打开浏览器控制台 (F12) 看 Network 面板，点订阅后看 `/api/subscribe` 请求：
- 404: `functions/` 目录没部署成功，检查目录结构
- 500 + "KV namespace SUBSCRIBERS not bound": KV 没绑定
- 200 + success: 功能正常，可能前端逻辑 bug

### KV 存的数据格式
Cloudflare Dashboard → KV → SUBSCRIBERS → 能看到每一条记录（email 是 key, JSON 是 value）。你也可以直接在 Dashboard 手动加/删/改订阅。

---

## 📊 监控

Cloudflare Pages → 项目 → **Functions** 标签可以看：
- 调用次数
- 错误率
- 最近的 console.log / console.error 输出

免费额度跑完会自动报错 (429 Too Many Requests)，届时再考虑升级。

---

_部署完成后，用户点"订阅"按钮，数据就会自动存进 KV。每月月初 visa bulletin 发布后你跑一次发送脚本就行_
