# Changelog

All notable changes are documented here.

## [2.2.0] — 2026-04-20

### Added — 完整会话持久化 + 重置入口

- **完整会话记忆** — 所有用户选择现在都保存到 `localStorage`,刷新/关浏览器/过几天再回来都原样恢复。新增持久化:
  - `gc_userCase`:国家 · 类别 · 优先日 · 在美否 · 申请人身份
  - `gc_lang`:语言(简/正/EN)
  - `gc_theme`:主题(晨间/典章/朱批/刊)
  - `gc_hasOnboarded`:是否已完成首次引导
- **Footer 重置按钮** — 放在 Project by JMJ 后面,低调但可发现。两段式确认:
  - 第一下 → 变琥珀色询问 `【确定清除全部?】[是,清除] [取消]`
  - 5 秒内不动 → 自动恢复中性状态(防误触)
  - 只清 `gc_*` 开头的 key,不误伤其他网站数据
  - 清除后自动移除 URL 参数 + 刷新,回到完全初始状态

### 数据加载优先级

当用户从 URL 进入时,仍优先使用 URL 里的 case(朋友分享链接不会覆盖你自己的 case,因为下次直接访问主域名,localStorage 里存的仍是你自己的)。

```
URL 参数  >  localStorage  >  默认(Taiwan/EB3/2024-07-15)
```

### Edge cases

- Incognito 模式 / localStorage 被 block → `try/catch` 吞掉错误,app 照常跑
- localStorage 数据损坏 → JSON 解析失败自动 fallback 到默认
- 字段不全或非法值 → sanity check + whitelist 过滤

---

## [2.1.0] — 2026-04-20

### Fixed — 计算模型 & 状态同步

这个版本集中修复了几个**深层 bug**,涉及"Overview 显示正确但 Forecast 显示错误"的错位问题。

- **混合速率算法 bug** — `computeHybridAdvance` 的 for 循环 `for (m=1; m<=monthsAhead; m++)` 只处理整数月份,导致 binary search 永远 snap 到整数月,effectiveRate 总是等于 `gap / 整数` ≈ recent12。换句话说**混合速率永远 = 近12月**,21 年长期均值是装饰品。现已重写为支持 fractional month 累积。
- **预测 tab 渲染分支 bug** — 导航配置里 `{ id: 'trends' }` 但 `App.jsx` 里有两个 `ForecastHub` 渲染:`tab === 'trends'`(旧,未传 props)和 `tab === 'forecast'`(新,传了 props)。用户点击预测时走的是**旧分支**,所有 `i485ServiceCenter` / `completedI485Steps` 都不生效。两个分支现都正确传 props。
- **`completedI485Steps` 无持久化** — `useState([])` 没挂 localStorage,刷新后丢失已勾步骤。但 `stepActualDates` 有持久化,导致"日期还在、勾选消失"的幽灵状态。已加 `gc_completedI485Steps` 持久化 + 从 `stepActualDates` 推导的 recovery fallback。
- **获批时间的 A 表门禁逻辑错误** — 之前把 `crossoverCalDate`(A 表 current 日)当 filing 日再加 15 个月,实际上 crossoverCalDate 已经是"可以批准"的时刻。改为 `approval = max(baseline + approval range, A current + progress-scaled buffer)`。
- **获批时间不根据 I-485 进度变化** — 原来所有用户一律加 60 天。改为按 stepsDone 动态缩放:0 步 ~11 个月,收据 ~9 个月,指纹 ~7 个月,EAD ~5 个月,AP ~3 个月,面试 ~1.5 个月。

### Changed — 公式与显示

- **混合速率**:`0.7 × recent12 + 0.3 × policy5y` → `0.55 × recent12 + 0.20 × policy5y + 0.25 × long21y`(21 年长期均值真的纳入)。弹窗每一项加 `· 权重%` 标签,透明化。
- **获批 step 典型区间**:`estMin 240 / estMax 720`(8–24 个月)→ `estMin 180 / estMax 450`(6–15 个月)+ `estimatedDays 450 → 330`(中位 15→11 月)。
- **每一步都可输入实际日期** — 之前只有 receipt。现在 6 步每一步完成时都有虚线绿框 `<input type="date">`,最新的填写日期自动成为锚点,下游全部 recalibrate。
- **Forecast 获批显示从"单点"→"区间"** — 图表 pill 直接显示 `预计 26/9–27/3 获批`,弹窗显示 `26年9月 – 27年3月 · ~6 个月区间`,与 Overview I-485 卡的最终批准 step 完全同步。

### Infrastructure
- `completedI485Steps` → localStorage `gc_completedI485Steps` + 校验合法 step id
- `stepActualDates`(map)取代 `receiptActualDate`(单值),自动从老 key `gc_receiptActualDate` 迁移
- `stepActualDates` 传入 TrendChart,让 Forecast 可以复用 Overview 的 anchor 逻辑

---

## [2.0.0] — 2026-04

### Added — 获批后生命周期(post-approval)
- **庆祝面板** — 一次性五彩纸屑动画(纯 CSS/React,零依赖,~1.5KB)
- **获批日字段** — 自动在完成 I-485 第 6 步时记录为今天,用户可手动编辑
- **条件绿卡切换** — CR-1(2 年条件)vs IR-1(10 年永久)
- **N-400 入籍倒计时** — 3 年(USC 配偶)/ 5 年(默认)精确到天
- **I-751 窗口计算** — 2 年前 90 天,窗口开启时琥珀警告
- **Header GC 快捷入口** — 绿色 pill + 260px mini 仪表盘,从任何 tab 访问
- **旅行记录** — 出入境日期列表,超 180 天单次出境自动琥珀警告
- **分享卡片** — 1080×1350 SVG 海报(小红书/IG/朋友圈)+ PNG 导出

### Changed — 现有功能提升
- **I-485 卡重构** — 单一 source of truth;级联勾选;服务中心速度选择器
- **距离卡 editorial 重做** — "你已在排期中"主标语替代裸数字,4 档 urgency 文案
- **双表状态行** — 主卡下加入 A + B 并列显示,解决"可递件 ≠ 可获批"混淆
- **"下一步" pill 语义修正** — 排期未到时改显"等待排期到达 · 预计 XX"
- **Forecast 加"预计获批日"pill** — 第二个 pill 堆叠在"可递件 pill"下
- **同月区间合并** — `"33年3月 – 33年3月"` 折叠为 `"33年3月"`
- **Alerts 加 I-751 / N-400 开关** — 条件显示(approvalDate 存在时)

### Design
- **去 emoji 化** — 全面 editorial 排版
- **"繁"→"正"** — 正体中文的正确称呼(Taiwan 偏好)
- **品牌改名** — "绿卡排期助手" → "绿卡晴雨表"

### Fixed
- Q4 spouse location 在 dependsOn + condition 无 branches 时不渲染
- 图表 Y 轴 auto-fit 只向上不向下
- 切换案子时 `selectedCategory='mine'` 被 reset
- 切换国家后 `rangeUserAdjusted` 不重置

### Infrastructure
- `i485ServiceCenter` 提升到 App 级 + localStorage(`gc_i485ServiceCenter`)
- `greenCardInfo` 持久化(`gc_greenCardInfo`)
- `travelRecords` 持久化(`gc_travelRecords`)

---

## [1.0.0] — 2024-01

### Initial release
- 基础 Visa Bulletin 追踪
- I-485 6 步时间线
- AI 预测与跨国对比
- 三语支持(简中 / 繁中 / En)
- 4 主题系统
