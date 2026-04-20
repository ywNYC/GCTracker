# Changelog

All notable changes are documented here.

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
- **I-485 卡重构** — 单一 source of truth;级联勾选;服务中心速度选择器;collapsed/expanded 状态优化
- **距离卡 editorial 重做** — "你已在排期中"主标语替代裸数字,4 档 urgency 文案
- **双表状态行** — 主卡下加入 A + B 并列显示,解决"可递件 ≠ 可获批"混淆
- **"下一步" pill 语义修正** — 排期未到时改显"等待排期到达 · 预计 XX",不再把 7 年后的 I-797 当"下一步"
- **Forecast 加"预计获批日"pill** — 第二个 pill 堆叠在"可递件 pill"下,I-485 服务中心切换时同步更新
- **同月区间合并** — `"33年3月 – 33年3月"` 折叠为 `"33年3月"`
- **Alerts 加 I-751 / N-400 开关** — 条件显示(approvalDate 存在时)

### Design
- **去 emoji 化** — 全面 editorial 排版(MILESTONE eyebrow + 衬线标题 + hairline rule)
- **"繁"→"正"** — 正体中文的正确称呼(Taiwan 偏好)
- **品牌改名** — "绿卡排期助手" → "绿卡晴雨表"
- **字符 `✓`/`⧖`** 代替图标 in-line

### Fixed
- Q4 spouse location 问题在 dependsOn + condition 无 branches 时不渲染,导致流程卡死 — 已修复
- 图表 Y 轴 auto-fit 只向上不向下的问题
- 切换案子时 `selectedCategory='mine'` 被 reset 的 bug
- 切换国家后 `rangeUserAdjusted` 不重置
- "可递件" (eligible) 状态下无 badge 视觉强调

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
