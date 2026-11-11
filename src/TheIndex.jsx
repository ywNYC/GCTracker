// UI-23 code split: PATHWAYS data + TheIndex, lazy chunk for the index tab and onboarding explorer.
// Extracted verbatim from App.jsx; shared helpers stay in App.jsx (imported
// below) or in functions/api/_gcMath.js. Loaded lazily by App.jsx per tab.
import React, { useState } from 'react';
import { FileText } from 'lucide-react';
import { useLang } from './App.jsx';
// ============================================================
// THE INDEX — 45+ documented green-card / immigration pathways
// ============================================================
const PATHWAYS = [
  // ── FAMILY ────────────────────────────────────────────────
  {
    id: 'fam-usc-spouse-inside-valid',
    group: 'family', category: 'IR-1 / CR-1', waitStatus: 'none', goesTo: null,
    en: {
      name: 'USC + foreign spouse, inside US with valid status',
      summary: 'Adjustment of Status (AOS) — I-130 + I-485 concurrently.',
      explanation: 'Spouses of US Citizens fall under "Immediate Relatives" (IR) — a category exempt from annual visa caps. No priority date, no waitlist. Cases are processed first-come, first-served. The distinction between CR-1 and IR-1 is simple: if you have been married less than 2 years when the green card is issued, you get CR-1 (conditional, valid 2 years). Otherwise you get IR-1 (full, valid 10 years).',
      steps: ['File I-130 and I-485 concurrently', 'File I-765 for work permit + I-131 for travel permit', 'Interview at USCIS field office', 'Receive green card (CR-1 if married <2y, IR-1 otherwise)'],
      timeline: '~10-14 months',
      caveat: 'No priority-date wait. CR-1 (conditional) requires I-751 after 2 years to remove conditions.'
    },
    zh: {
      name: '美国公民 + 外籍配偶 · 境内有合法身份',
      summary: '境内调整身份(AOS)— I-130 + I-485 同时递',
      explanation: '美国公民的配偶属于"直系亲属"(Immediate Relative, IR)类别,这类案子不受年度签证配额限制,所以没有排期、没有优先日,案子按先后顺序处理。CR-1 和 IR-1 的区别很简单:拿到绿卡时结婚不满 2 年 → CR-1(条件绿卡,2 年有效);满 2 年 → IR-1(正式绿卡,10 年有效)。',
      steps: ['同时递交 I-130 和 I-485', '同时申请 I-765 工卡 + I-131 回美证', 'USCIS 办公室面谈', '拿到绿卡(结婚<2年为 CR-1 条件绿卡,否则 IR-1)'],
      timeline: '约 10-14 个月',
      caveat: 'CR-1 是 2 年条件绿卡,到期前需递 I-751 解除条件。'
    },
    tw: {
      name: '美國公民 + 外籍配偶 · 境內有合法身份',
      summary: '境內調整身份(AOS)— I-130 + I-485 同時遞',
      explanation: '美國公民的配偶屬於「直系親屬」(Immediate Relative, IR)類別,這類案子不受年度簽證配額限制,所以沒有排期、沒有優先日,案子按先後順序處理。CR-1 和 IR-1 的區別很簡單:拿到綠卡時結婚不滿 2 年 → CR-1(條件綠卡,2 年有效);滿 2 年 → IR-1(正式綠卡,10 年有效)。',
      steps: ['同時遞交 I-130 和 I-485', '同時申請 I-765 工卡 + I-131 回美證', 'USCIS 辦公室面談', '拿到綠卡(結婚<2年為 CR-1 條件綠卡,否則 IR-1)'],
      timeline: '約 10-14 個月',
      caveat: 'CR-1 是 2 年條件綠卡,到期前需遞 I-751 解除條件。'
    }
  },
  {
    id: 'fam-usc-spouse-outside',
    group: 'family', category: 'IR-1 / CR-1', waitStatus: 'none', goesTo: null,
    en: {
      name: 'USC + foreign spouse, outside US',
      summary: 'Consular Processing — I-130 → NVC → embassy interview',
      explanation: 'Spouses of US Citizens fall under "Immediate Relatives" (IR) — exempt from visa caps, so no priority date or waitlist. Because the spouse is outside the US, the case goes through Consular Processing (CP): I-130 approval, then NVC takes over, then interview at the US embassy in the spouse\'s home country. Spouse enters the US as an immigrant and becomes a permanent resident on arrival.',
      steps: ['USC files I-130', 'Case transfers to NVC after approval', 'Complete DS-260 and pay fees', 'Embassy interview in home country', 'Enter US with immigrant visa → green card'],
      timeline: '~12-18 months',
      caveat: 'Spouse interviews at US consulate in home country. Receives green card upon US entry.'
    },
    zh: {
      name: '美国公民 + 外籍配偶 · 境外',
      summary: '领事馆处理 — I-130 → NVC → 领事馆面签',
      explanation: '美国公民的配偶属于"直系亲属"(Immediate Relative, IR)类别,不受年度签证配额限制 — 没有排期、没有优先日。因为配偶在美国境外,走的是"领事馆处理"(Consular Processing, CP):USCIS 批准 I-130 → NVC 接手 → 配偶户籍国美领馆面签 → 配偶以移民签入境美国,入境即获绿卡。',
      steps: ['美国公民递交 I-130', '批准后案件转至 NVC', '完成 DS-260 表格,缴纳费用', '在配偶户籍国美领馆面签', '入境美国即获绿卡'],
      timeline: '约 12-18 个月',
      caveat: '在配偶户籍国的美国领事馆面签。入境时即获绿卡。'
    },
    tw: {
      name: '美國公民 + 外籍配偶 · 境外',
      summary: '領事館處理 — I-130 → NVC → 領事館面簽',
      explanation: '美國公民的配偶屬於「直系親屬」(Immediate Relative, IR)類別,不受年度簽證配額限制 — 沒有排期、沒有優先日。因為配偶在美國境外,走的是「領事館處理」(Consular Processing, CP):USCIS 批准 I-130 → NVC 接手 → 配偶戶籍國美領館面簽 → 配偶以移民簽入境美國,入境即獲綠卡。',
      steps: ['美國公民遞交 I-130', '批准後案件轉至 NVC', '完成 DS-260 表格,繳納費用', '在配偶戶籍國美領館面簽', '入境美國即獲綠卡'],
      timeline: '約 12-18 個月',
      caveat: '在配偶戶籍國的美國領事館面簽。入境時即獲綠卡。'
    }
  },
  {
    id: 'fam-usc-spouse-inside-nostatus',
    group: 'family', category: 'IR-1 / CR-1 (复杂)', waitStatus: 'varies', goesTo: null, needsLawyer: true,
    en: {
      name: 'USC + spouse inside US without legal status',
      summary: '⚠️ Complex — must consult an immigration attorney',
      explanation: 'The spouse of a USC is eligible as an Immediate Relative (no visa cap wait), BUT being in the US without legal status changes everything. Entering the US illegally or overstaying a visa triggers "unlawful presence bars" — 3 years (180+ days out of status) or 10 years (1 year+). To get around this, attorneys use strategies like I-601A Provisional Waivers or 245(i) grandfathering. Getting this wrong can mean deportation and a 10-year ban from reentering the US.',
      steps: ['Possible paths: I-601A Provisional Waiver + CP, or 245(i) grandfathering', 'Do NOT file alone — consequences of getting this wrong are severe (10-year bar, deportation)'],
      timeline: 'Varies widely',
      caveat: 'Entering the US illegally or overstaying triggers bars. Specific exceptions (245(i), waivers) exist but require legal expertise.'
    },
    zh: {
      name: '美国公民 + 境内无合法身份的配偶',
      summary: '⚠️ 情况复杂 — 必须咨询移民律师',
      explanation: '美国公民的配偶本身符合直系亲属(Immediate Relative)资格(无需等排期),但**在美国境内无合法身份**会完全改变情况。非法入境或逾期滞留会触发"非法居留禁令":逾期 180+ 天 → 3 年禁令;逾期 1 年+ → 10 年禁令。律师通常用 I-601A 临时豁免或 245(i) 保留条款等策略绕开,但办错后果极严重 — 可能遭遣返 + 10 年禁止入境。',
      steps: ['可能路径:I-601A 临时豁免 + 领事馆处理,或 245(i) 保留条款', '不要自己递件 — 办错后果极严重(10 年禁令、遣返)'],
      timeline: '视情况',
      caveat: '存在 245(i) 等豁免但需要专业律师评估。'
    },
    tw: {
      name: '美國公民 + 境內無合法身份的配偶',
      summary: '⚠️ 情況複雜 — 必須諮詢移民律師',
      explanation: '美國公民的配偶本身符合直系親屬(Immediate Relative)資格(無需等排期),但**在美國境內無合法身份**會完全改變情況。非法入境或逾期滯留會觸發「非法居留禁令」:逾期 180+ 天 → 3 年禁令;逾期 1 年+ → 10 年禁令。律師通常用 I-601A 臨時豁免或 245(i) 保留條款等策略繞開,但辦錯後果極嚴重 — 可能遭遣返 + 10 年禁止入境。',
      steps: ['可能路徑:I-601A 臨時豁免 + 領事館處理,或 245(i) 保留條款', '不要自己遞件 — 辦錯後果極嚴重(10 年禁令、遣返)'],
      timeline: '視情況',
      caveat: '存在 245(i) 等豁免但需要專業律師評估。'
    }
  },
  {
    id: 'fam-usc-parent-inside',
    group: 'family', category: 'IR-5', waitStatus: 'none', goesTo: null,
    en: { name: 'USC (≥21) + parent, inside US with valid status', summary: 'AOS for parent — I-130 + I-485 concurrently', steps: ['USC must be 21 or older', 'File I-130 + I-485 concurrently', 'Parent interview at USCIS', 'Receive green card'], timeline: '~10-14 months', caveat: 'USC must be 21+. Parent must have entered US legally and maintained status.' },
    zh: { name: '美国公民(≥21 岁)+ 父母 · 境内有合法身份', summary: '为父母办 AOS — I-130 + I-485 同时递', steps: ['公民必须年满 21 岁', '同时递交 I-130 + I-485', '父母在 USCIS 面谈', '拿到绿卡'], timeline: '约 10-14 个月', caveat: '公民必须年满 21 岁。父母必须合法入境且保持合法身份。' },
    tw: { name: '美國公民(≥21 歲)+ 父母 · 境內有合法身份', summary: '為父母辦 AOS — I-130 + I-485 同時遞', steps: ['公民必須年滿 21 歲', '同時遞交 I-130 + I-485', '父母在 USCIS 面談', '拿到綠卡'], timeline: '約 10-14 個月', caveat: '公民必須年滿 21 歲。父母必須合法入境且保持合法身份。' }
  },
  {
    id: 'fam-usc-parent-outside',
    group: 'family', category: 'IR-5', waitStatus: 'none', goesTo: null,
    en: { name: 'USC (≥21) + parent, outside US', summary: 'Consular Processing for parent', steps: ['USC (21+) files I-130', 'Case transfers to NVC', 'Parent interviews at home-country embassy', 'Parent enters US with immigrant visa'], timeline: '~12-18 months', caveat: 'USC must be 21+. No priority-date wait.' },
    zh: { name: '美国公民(≥21 岁)+ 父母 · 境外', summary: '父母走领事馆处理', steps: ['公民(≥21)递 I-130', '案件转至 NVC', '父母在户籍国领事馆面签', '父母入境美国即获绿卡'], timeline: '约 12-18 个月', caveat: '公民必须年满 21 岁。无需等排期。' },
    tw: { name: '美國公民(≥21 歲)+ 父母 · 境外', summary: '父母走領事館處理', steps: ['公民(≥21)遞 I-130', '案件轉至 NVC', '父母在戶籍國領事館面簽', '父母入境美國即獲綠卡'], timeline: '約 12-18 個月', caveat: '公民必須年滿 21 歲。無需等排期。' }
  },
  {
    id: 'fam-usc-minor-child',
    group: 'family', category: 'IR-2', waitStatus: 'none', goesTo: null,
    en: { name: 'USC + unmarried child under 21', summary: 'Immediate Relative (IR-2) — no wait', steps: ['USC files I-130 for child', 'If child inside US with status: AOS', 'If child outside: Consular Processing'], timeline: '~10-16 months', caveat: 'Stepchild must have had step-relationship before age 18. Watch for CSPA protection if child approaches 21.' },
    zh: { name: '美国公民 + 未成年未婚子女(<21 岁)', summary: '直系亲属(IR-2)— 无需排期', steps: ['公民为子女递 I-130', '子女境内有身份 → AOS', '子女境外 → 领事馆处理'], timeline: '约 10-16 个月', caveat: '继子女的继亲关系必须在子女 18 岁前确立。接近 21 岁注意 CSPA 保护计算。' },
    tw: { name: '美國公民 + 未成年未婚子女(<21 歲)', summary: '直系親屬(IR-2)— 無需排期', steps: ['公民為子女遞 I-130', '子女境內有身份 → AOS', '子女境外 → 領事館處理'], timeline: '約 10-16 個月', caveat: '繼子女的繼親關係必須在子女 18 歲前確立。接近 21 歲注意 CSPA 保護計算。' }
  },
  {
    id: 'fam-usc-adult-unmarried',
    group: 'family', category: 'F1', waitStatus: 'long', goesTo: 'F1',
    en: { name: 'USC + unmarried adult child (≥21)', summary: 'F1 — Family First Preference, has priority date', steps: ['USC files I-130', 'Wait for priority date (Table A Final Action)', 'File I-485 (if in US) or CP', 'Watch CSPA if child might marry or age'], timeline: 'Priority date + ~12 months', caveat: 'If child marries, auto-converts to F3 (longer wait). Stay unmarried for F1.' },
    zh: { name: '美国公民 + 成年未婚子女(≥21 岁)', summary: 'F1 — 第一优先,需等排期', steps: ['公民递 I-130', '等待排期(Table A 最终裁定日)', '排期到了递 I-485 或走 CP', 'CSPA:子女结婚或年满会变类别'], timeline: '排期 + 约 12 个月', caveat: '子女结婚则自动转 F3(等更久)。保持未婚则走 F1。' },
    tw: { name: '美國公民 + 成年未婚子女(≥21 歲)', summary: 'F1 — 第一優先,需等排期', steps: ['公民遞 I-130', '等待排期(Table A 最終裁定日)', '排期到了遞 I-485 或走 CP', 'CSPA:子女結婚或年滿會變類別'], timeline: '排期 + 約 12 個月', caveat: '子女結婚則自動轉 F3(等更久)。保持未婚則走 F1。' }
  },
  {
    id: 'fam-usc-married-child',
    group: 'family', category: 'F3', waitStatus: 'long', goesTo: 'F3',
    en: { name: 'USC + married child (any age)', summary: 'F3 — Third Preference, longest family wait (~12-25y)', steps: ['USC files I-130', 'Long priority-date wait (varies by country)', 'File I-485 or CP once current'], timeline: 'Priority date + ~12 months', caveat: 'If child divorces, auto-converts to F1 (faster). Spouse and minor children of child are derivatives.' },
    zh: { name: '美国公民 + 已婚子女(任何年龄)', summary: 'F3 — 第三优先,家庭类等待最长(约 12-25 年)', steps: ['公民递 I-130', '等待长期排期(取决于出生国)', '排期 current 后递 I-485 或 CP'], timeline: '排期 + 约 12 个月', caveat: '子女离婚则自动转 F1(更快)。已婚子女的配偶和未成年子女为衍生受益人。' },
    tw: { name: '美國公民 + 已婚子女(任何年齡)', summary: 'F3 — 第三優先,家庭類等待最長(約 12-25 年)', steps: ['公民遞 I-130', '等待長期排期(取決於出生國)', '排期 current 後遞 I-485 或 CP'], timeline: '排期 + 約 12 個月', caveat: '子女離婚則自動轉 F1(更快)。已婚子女的配偶和未成年子女為衍生受益人。' }
  },
  {
    id: 'fam-usc-sibling',
    group: 'family', category: 'F4', waitStatus: 'long', goesTo: 'F4',
    en: { name: 'USC (≥21) + sibling', summary: 'F4 — Fourth Preference, 15-25+ year wait', steps: ['USC (21+) files I-130', 'Extremely long priority-date wait', 'When current, file I-485 or CP'], timeline: 'Priority date + ~12 months', caveat: 'USC must be 21+. Wait often exceeds 20 years. Sibling\'s spouse and minor children are derivatives — age out at 21.' },
    zh: { name: '美国公民(≥21 岁)+ 兄弟姐妹', summary: 'F4 — 第四优先,等待 15-25+ 年', steps: ['公民(≥21)递 I-130', '等待极长排期', '排期 current 后递 I-485 或 CP'], timeline: '排期 + 约 12 个月', caveat: '公民必须年满 21 岁。等待常超过 20 年。兄弟姐妹的配偶/子女为衍生受益人,21 岁会脱离儿童身份。' },
    tw: { name: '美國公民(≥21 歲)+ 兄弟姐妹', summary: 'F4 — 第四優先,等待 15-25+ 年', steps: ['公民(≥21)遞 I-130', '等待極長排期', '排期 current 後遞 I-485 或 CP'], timeline: '排期 + 約 12 個月', caveat: '公民必須年滿 21 歲。等待常超過 20 年。兄弟姐妹的配偶/子女為衍生受益人,21 歲會脫離兒童身份。' }
  },
  {
    id: 'fam-lpr-spouse',
    group: 'family', category: 'F2A', waitStatus: 'short', goesTo: 'F2A',
    en: { name: 'LPR + foreign spouse', summary: 'F2A — currently Current (no wait) for most countries', steps: ['LPR files I-130', 'F2A currently Current → can file I-485 (inside) or CP (outside) immediately', 'Maintain status while waiting'], timeline: '~10-16 months total', caveat: 'LPR must maintain US domicile. If LPR naturalizes during wait, case upgrades to IR-1 (immediate).' },
    zh: { name: '绿卡持有人 + 外籍配偶', summary: 'F2A — 目前多数国家无排期(Current)', steps: ['绿卡持有人递 I-130', '目前 F2A 无排期 → 可立即递 I-485 或 CP', '等待期间保持合法身份'], timeline: '总计约 10-16 个月', caveat: '绿卡持有人必须保持美国常住。等待期间如果入籍,案件升级为 IR-1(立即可办)。' },
    tw: { name: '綠卡持有人 + 外籍配偶', summary: 'F2A — 目前多數國家無排期(Current)', steps: ['綠卡持有人遞 I-130', '目前 F2A 無排期 → 可立即遞 I-485 或 CP', '等待期間保持合法身份'], timeline: '總計約 10-16 個月', caveat: '綠卡持有人必須保持美國常住。等待期間如果入籍,案件升級為 IR-1(立即可辦)。' }
  },
  {
    id: 'fam-lpr-minor',
    group: 'family', category: 'F2A', waitStatus: 'short', goesTo: 'F2A',
    en: { name: 'LPR + unmarried child under 21', summary: 'F2A — currently Current for most', steps: ['LPR files I-130', 'File I-485 or CP when current (now)', 'Watch CSPA if child approaches 21'], timeline: '~10-16 months', caveat: 'If child turns 21 before completion, CSPA may still protect F2A classification.' },
    zh: { name: '绿卡持有人 + 未成年未婚子女(<21)', summary: 'F2A — 目前多数无排期', steps: ['绿卡持有人递 I-130', '排期 current 即可递 I-485 或 CP', '子女接近 21 岁时注意 CSPA'], timeline: '约 10-16 个月', caveat: '子女满 21 岁前未完成,CSPA 可能仍保留 F2A 类别。' },
    tw: { name: '綠卡持有人 + 未成年未婚子女(<21)', summary: 'F2A — 目前多數無排期', steps: ['綠卡持有人遞 I-130', '排期 current 即可遞 I-485 或 CP', '子女接近 21 歲時注意 CSPA'], timeline: '約 10-16 個月', caveat: '子女滿 21 歲前未完成,CSPA 可能仍保留 F2A 類別。' }
  },
  {
    id: 'fam-lpr-adult',
    group: 'family', category: 'F2B', waitStatus: 'long', goesTo: 'F2B',
    en: { name: 'LPR + unmarried adult child (≥21)', summary: 'F2B — has priority date (5-10 year wait typically)', steps: ['LPR files I-130', 'Wait for priority date', 'File I-485 or CP when current'], timeline: 'Priority date + ~12 months', caveat: 'If LPR parent naturalizes: auto-converts to F1. Can opt-out to stay in F2B if F2B is faster (rare now).' },
    zh: { name: '绿卡持有人 + 成年未婚子女(≥21)', summary: 'F2B — 有排期(通常 5-10 年)', steps: ['绿卡持有人递 I-130', '等待排期', 'current 后递 I-485 或 CP'], timeline: '排期 + 约 12 个月', caveat: '绿卡持有人入籍则自动转 F1。如 F2B 更快可选择保留(近年少见)。' },
    tw: { name: '綠卡持有人 + 成年未婚子女(≥21)', summary: 'F2B — 有排期(通常 5-10 年)', steps: ['綠卡持有人遞 I-130', '等待排期', 'current 後遞 I-485 或 CP'], timeline: '排期 + 約 12 個月', caveat: '綠卡持有人入籍則自動轉 F1。如 F2B 更快可選擇保留(近年少見)。' }
  },
  {
    id: 'fam-lpr-cannot',
    group: 'family', category: '⚠️ 不可申请', waitStatus: 'varies', goesTo: null, warning: true,
    en: { name: 'LPR cannot petition: married children, parents, or siblings', summary: '⚠️ Only US Citizens can petition these', steps: ['LPR → Wait to naturalize (usually 5 years after green card, 3 if married to USC)', 'Once USC, file I-130 for the relative', 'Categories: F3 (married children), IR-5 (parents), F4 (siblings)'], timeline: 'Naturalization + category wait', caveat: 'Plan ahead: if naturalization is close, it may be worth waiting rather than filing early under a wrong category.' },
    zh: { name: '绿卡持有人不可申请:已婚子女、父母、兄弟姐妹', summary: '⚠️ 只有美国公民才能申请这些关系', steps: ['绿卡持有人 → 等待入籍(一般绿卡后 5 年,与公民结婚 3 年)', '入籍后递 I-130', '类别:F3(已婚子女)、IR-5(父母)、F4(兄弟姐妹)'], timeline: '入籍时间 + 类别排期', caveat: '提前规划:如果接近入籍,不如等入籍再办,避免走错类别。' },
    tw: { name: '綠卡持有人不可申請:已婚子女、父母、兄弟姐妹', summary: '⚠️ 只有美國公民才能申請這些關係', steps: ['綠卡持有人 → 等待入籍(一般綠卡後 5 年,與公民結婚 3 年)', '入籍後遞 I-130', '類別:F3(已婚子女)、IR-5(父母)、F4(兄弟姐妹)'], timeline: '入籍時間 + 類別排期', caveat: '提前規劃:如果接近入籍,不如等入籍再辦,避免走錯類別。' }
  },
  // ── EMPLOYMENT ────────────────────────────────────────────
  {
    id: 'emp-eb1a',
    group: 'employment', category: 'EB-1A', waitStatus: 'medium', goesTo: 'EB1',
    en: { name: 'EB-1A Extraordinary Ability (self-petition)', summary: 'International-level achievement, no employer needed', steps: ['Prove sustained international/national acclaim (Nobel-level, OR 3+ of 10 criteria)', 'Self-petition I-140 (no PERM)', 'File I-485 when current (or CP)'], timeline: 'I-140 6-8mo + priority date + I-485 6-12mo', caveat: 'No employer required. High evidence bar: publications, awards, media, judging, exclusive-association membership.' },
    zh: { name: 'EB-1A 杰出人才(自我申请)', summary: '国际级成就,无需雇主', steps: ['证明持续的国际/国家级声誉(诺贝尔级,或 10 项指标中 3 项以上)', '自己递 I-140(无需 PERM)', '排期 current 后递 I-485 或 CP'], timeline: 'I-140 约 6-8 月 + 排期 + I-485 6-12 月', caveat: '无需雇主。证据门槛高:出版物、奖项、媒体、评审他人、顶级学会会员等。' },
    tw: { name: 'EB-1A 傑出人才(自我申請)', summary: '國際級成就,無需雇主', steps: ['證明持續的國際/國家級聲譽(諾貝爾級,或 10 項指標中 3 項以上)', '自己遞 I-140(無需 PERM)', '排期 current 後遞 I-485 或 CP'], timeline: 'I-140 約 6-8 月 + 排期 + I-485 6-12 月', caveat: '無需雇主。證據門檻高:出版物、獎項、媒體、評審他人、頂級學會會員等。' }
  },
  {
    id: 'emp-eb1b',
    group: 'employment', category: 'EB-1B', waitStatus: 'medium', goesTo: 'EB1',
    en: { name: 'EB-1B Outstanding Professor/Researcher', summary: 'International recognition + 3y experience + offer from university/research institute', steps: ['Employer (university/research institute) files I-140', 'Prove international recognition (2+ of 6 criteria)', 'I-485 when current'], timeline: 'I-140 6-8mo + priority date + I-485 6-12mo', caveat: 'No PERM. Must have offered tenure, tenure-track, or permanent research position.' },
    zh: { name: 'EB-1B 杰出教授/研究员', summary: '国际认可 + 3 年以上经验 + 大学/研究机构职位', steps: ['雇主(大学/研究机构)递 I-140', '证明国际认可(6 项指标满足 2 项)', '排期 current 递 I-485'], timeline: 'I-140 约 6-8 月 + 排期 + I-485 6-12 月', caveat: '无需 PERM。必须是终身教职、终身轨、或长期研究职位。' },
    tw: { name: 'EB-1B 傑出教授/研究員', summary: '國際認可 + 3 年以上經驗 + 大學/研究機構職位', steps: ['雇主(大學/研究機構)遞 I-140', '證明國際認可(6 項指標滿足 2 項)', '排期 current 遞 I-485'], timeline: 'I-140 約 6-8 月 + 排期 + I-485 6-12 月', caveat: '無需 PERM。必須是終身教職、終身軌、或長期研究職位。' }
  },
  {
    id: 'emp-eb1c',
    group: 'employment', category: 'EB-1C', waitStatus: 'medium', goesTo: 'EB1',
    en: { name: 'EB-1C Multinational Manager/Executive', summary: 'Internal transfer from foreign parent company', steps: ['Worked abroad ≥1 year in exec/managerial role for same company', 'US entity files I-140', 'Typical: L-1A visa first, then EB-1C'], timeline: 'I-140 6-8mo + priority date + I-485 6-12mo', caveat: 'No PERM. Foreign and US companies must have qualifying relationship. Documentation of managerial role critical.' },
    zh: { name: 'EB-1C 跨国公司经理/高管', summary: '从海外母公司内部调动', steps: ['在海外同一公司担任高管/经理 ≥1 年', '美国子公司递 I-140', '典型路径:先 L-1A 签证,再转 EB-1C'], timeline: 'I-140 约 6-8 月 + 排期 + I-485 6-12 月', caveat: '无需 PERM。中外公司必须有合规关联关系。管理职责的证据很关键。' },
    tw: { name: 'EB-1C 跨國公司經理/高管', summary: '從海外母公司內部調動', steps: ['在海外同一公司擔任高管/經理 ≥1 年', '美國子公司遞 I-140', '典型路徑:先 L-1A 簽證,再轉 EB-1C'], timeline: 'I-140 約 6-8 月 + 排期 + I-485 6-12 月', caveat: '無需 PERM。中外公司必須有合規關聯關係。管理職責的證據很關鍵。' }
  },
  {
    id: 'emp-eb2-standard',
    group: 'employment', category: 'EB-2', waitStatus: 'varies', goesTo: 'EB2',
    en: { name: 'EB-2 Standard (Master\'s + job offer)', summary: 'Master\'s degree or Bachelor\'s + 5 years progressive experience', steps: ['Employer files PERM Labor Certification (12-18 months)', 'Employer files I-140', 'I-485 when current'], timeline: 'PERM 12-18mo + I-140 6-8mo + priority date + I-485 6-12mo', caveat: 'Most EB-2 positions require at least DOL Level II prevailing wage (typically $75K-$150K+, varies heavily by occupation and metro area). If your offer only meets Level I, employer may be forced to file EB-3 instead. ⚠️ March 2026 DOL proposed rule would raise Level I from 17th → 34th percentile (30%+ jump); not yet final but watch before filing. China/India have long waits (5-10 years); other countries usually short.' },
    zh: { name: 'EB-2 标准(硕士 + 对口工作)', summary: '硕士学位,或本科 + 5 年以上进阶经验', steps: ['雇主递交 PERM 劳工证(12-18 月)', '雇主递 I-140', '排期 current 递 I-485'], timeline: 'PERM 12-18 月 + I-140 6-8 月 + 排期 + I-485 6-12 月', caveat: '大部分 EB-2 岗位要求雇主给到 DOL Level II 工资(视岗位+城市,典型范围 $75K-$150K+)。如果工资只够 Level I,雇主可能改走 EB-3。⚠️ 2026年3月 DOL 拟议规则:Level I 将从第 17 百分位提到第 34 百分位(涨 30%+),目前还在评论期未生效,2026 年内递件前请持续关注。中国/印度长期排期(5-10 年)。' },
    tw: { name: 'EB-2 標準(碩士 + 對口工作)', summary: '碩士學位,或本科 + 5 年以上進階經驗', steps: ['雇主遞交 PERM 勞工證(12-18 月)', '雇主遞 I-140', '排期 current 遞 I-485'], timeline: 'PERM 12-18 月 + I-140 6-8 月 + 排期 + I-485 6-12 月', caveat: '大部分 EB-2 崗位要求雇主給到 DOL Level II 工資(視崗位+城市,典型範圍 $75K-$150K+)。如果工資只夠 Level I,雇主可能改走 EB-3。⚠️ 2026年3月 DOL 擬議規則:Level I 將從第 17 百分位提到第 34 百分位(漲 30%+),目前還在評論期未生效,2026 年內遞件前請持續關注。中國/印度長期排期(5-10 年)。' }
  },
  {
    id: 'emp-eb2-niw',
    group: 'employment', category: 'EB-2 NIW', waitStatus: 'varies', goesTo: 'EB2',
    en: { name: 'EB-2 NIW National Interest Waiver (self-petition)', summary: 'Master\'s + prove national interest — no employer needed', steps: ['Self-petition I-140 with NIW evidence (3-prong Dhanasar test)', 'Common: PhDs, researchers, startup founders', 'I-485 when current (same dates as EB-2)'], timeline: 'I-140 6-8mo + EB-2 priority date + I-485 6-12mo', caveat: 'No employer required. Shares EB-2 priority dates. Strong national-impact evidence needed.' },
    zh: { name: 'EB-2 NIW 国家利益豁免(自我申请)', summary: '硕士 + 证明国家利益 — 无需雇主', steps: ['自己递 I-140 + NIW 证据(Dhanasar 三要件测试)', '常见人群:博士、研究员、创业者', '排期 current 递 I-485(与 EB-2 同)'], timeline: 'I-140 约 6-8 月 + EB-2 排期 + I-485 6-12 月', caveat: '无需雇主。与 EB-2 共享排期。需强力证明国家影响。' },
    tw: { name: 'EB-2 NIW 國家利益豁免(自我申請)', summary: '碩士 + 證明國家利益 — 無需雇主', steps: ['自己遞 I-140 + NIW 證據(Dhanasar 三要件測試)', '常見人群:博士、研究員、創業者', '排期 current 遞 I-485(與 EB-2 同)'], timeline: 'I-140 約 6-8 月 + EB-2 排期 + I-485 6-12 月', caveat: '無需雇主。與 EB-2 共享排期。需強力證明國家影響。' }
  },
  {
    id: 'emp-eb2-schedule-a',
    group: 'employment', category: 'EB-2 Schedule A', waitStatus: 'varies', goesTo: 'EB2',
    en: { name: 'EB-2 Schedule A (nurses, physical therapists)', summary: 'Pre-certified — no PERM', steps: ['Employer files I-140 directly (PERM waived)', 'I-485 when current'], timeline: 'I-140 6-8mo + priority date + I-485 6-12mo', caveat: 'Limited to DOL pre-certified occupations. Registered Nurses and Physical Therapists most common.' },
    zh: { name: 'EB-2 Schedule A(护士、物理治疗师等)', summary: '已预批,无需 PERM', steps: ['雇主直接递 I-140(PERM 豁免)', '排期 current 递 I-485'], timeline: 'I-140 6-8 月 + 排期 + I-485 6-12 月', caveat: '仅限 DOL 预批的特定职业。注册护士和物理治疗师最常见。' },
    tw: { name: 'EB-2 Schedule A(護士、物理治療師等)', summary: '已預批,無需 PERM', steps: ['雇主直接遞 I-140(PERM 豁免)', '排期 current 遞 I-485'], timeline: 'I-140 6-8 月 + 排期 + I-485 6-12 月', caveat: '僅限 DOL 預批的特定職業。註冊護士和物理治療師最常見。' }
  },
  {
    id: 'emp-eb3-professional',
    group: 'employment', category: 'EB-3 Professional', waitStatus: 'varies', goesTo: 'EB3',
    en: { name: 'EB-3 Professional (Bachelor\'s + job)', summary: 'Bachelor\'s degree + job requiring bachelor\'s', steps: ['PERM Labor Certification', 'Employer files I-140', 'I-485 when current'], timeline: 'PERM 12-18mo + I-140 6-8mo + priority date + I-485 6-12mo', caveat: 'If EB-3 is faster than EB-2, EB-2 holders can "downgrade" to EB-3 (re-file I-140).' },
    zh: { name: 'EB-3 专业人员(本科 + 工作)', summary: '本科学位 + 需要本科的工作', steps: ['PERM 劳工证', '雇主递 I-140', '排期 current 递 I-485'], timeline: 'PERM 12-18 月 + I-140 6-8 月 + 排期 + I-485 6-12 月', caveat: '如 EB-3 比 EB-2 快,EB-2 持有人可"降级"至 EB-3(重递 I-140)。' },
    tw: { name: 'EB-3 專業人員(本科 + 工作)', summary: '本科學位 + 需要本科的工作', steps: ['PERM 勞工證', '雇主遞 I-140', '排期 current 遞 I-485'], timeline: 'PERM 12-18 月 + I-140 6-8 月 + 排期 + I-485 6-12 月', caveat: '如 EB-3 比 EB-2 快,EB-2 持有人可"降級"至 EB-3(重遞 I-140)。' }
  },
  {
    id: 'emp-eb3-skilled',
    group: 'employment', category: 'EB-3 Skilled Worker', waitStatus: 'varies', goesTo: 'EB3',
    en: { name: 'EB-3 Skilled Worker (2+ years training/experience)', summary: 'At least 2 years of training or experience', steps: ['PERM', 'I-140', 'I-485 when current'], timeline: 'Similar to EB-3 Professional', caveat: 'Same priority date as EB-3 Professional.' },
    zh: { name: 'EB-3 技术工(≥2 年培训/经验)', summary: '至少 2 年培训或经验', steps: ['PERM', 'I-140', '排期 current 递 I-485'], timeline: '与 EB-3 专业人员相似', caveat: '排期与 EB-3 专业人员相同。' },
    tw: { name: 'EB-3 技術工(≥2 年培訓/經驗)', summary: '至少 2 年培訓或經驗', steps: ['PERM', 'I-140', '排期 current 遞 I-485'], timeline: '與 EB-3 專業人員相似', caveat: '排期與 EB-3 專業人員相同。' }
  },
  {
    id: 'emp-eb3-other',
    group: 'employment', category: 'EB-3 Other Workers (EW)', waitStatus: 'long', goesTo: 'EB3',
    en: { name: 'EB-3 Other Workers / Unskilled', summary: 'No degree or skill requirement (e.g. restaurant, domestic)', steps: ['PERM', 'I-140', 'I-485 when current'], timeline: 'Longer priority-date wait than regular EB-3', caveat: 'Separate, longer backlog than Professional/Skilled EB-3.' },
    zh: { name: 'EB-3 其他工人(EW · 无技能)', summary: '无学历无技能要求(餐厅、家政等)', steps: ['PERM', 'I-140', '排期 current 递 I-485'], timeline: '排期比专业/技术工 EB-3 更长', caveat: '与 EB-3 专业/技术工分开排期,积压更长。' },
    tw: { name: 'EB-3 其他工人(EW · 無技能)', summary: '無學歷無技能要求(餐廳、家政等)', steps: ['PERM', 'I-140', '排期 current 遞 I-485'], timeline: '排期比專業/技術工 EB-3 更長', caveat: '與 EB-3 專業/技術工分開排期,積壓更長。' }
  },
  {
    id: 'emp-eb4',
    group: 'employment', category: 'EB-4', waitStatus: 'long', goesTo: null,
    en: { name: 'EB-4 Special Immigrant (religious workers, etc.)', summary: 'Certain UN employees (religious workers SR and SIJS each have their own card)', steps: ['Petition filed per specific EB-4 category', 'I-485 when current'], timeline: 'Varies', caveat: 'Niche category. Recent retrogression — currently long wait. Most users won\'t qualify.' },
    zh: { name: 'EB-4 特殊移民(宗教工作者等)', summary: '联合国特定员工等(宗教工作者 SR、特殊少年移民 SIJS 各有专条)', steps: ['按具体 EB-4 小类递件', '排期 current 递 I-485'], timeline: '视情况', caveat: '小众类别。近期倒退,等待较长。大部分用户不符合。' },
    tw: { name: 'EB-4 特殊移民(宗教工作者等)', summary: '聯合國特定員工等(宗教工作者 SR、特殊少年移民 SIJS 各有專條)', steps: ['按具體 EB-4 小類遞件', '排期 current 遞 I-485'], timeline: '視情況', caveat: '小眾類別。近期倒退,等待較長。大部分用戶不符合。' }
  },
  {
    id: 'emp-eb5-direct',
    group: 'employment', category: 'EB-5 Direct', waitStatus: 'varies', goesTo: null,
    en: { name: 'EB-5 Direct Investment ($1.05M)', summary: 'Invest $1,050,000 in your own business, create 10 jobs', steps: ['Establish/invest in US business', 'Create 10 full-time US jobs', 'File I-526E', '2-year conditional green card', 'File I-829 to remove conditions'], timeline: '2-4 years + conditional period', caveat: 'High financial/business risk. Must personally operate business. Jobs must be W-2 employees.' },
    zh: { name: 'EB-5 直接投资($1,050,000)', summary: '自己投资美国生意 $1.05M,创造 10 个工作', steps: ['建立/投资美国企业', '创造 10 个全职美国工作', '递 I-526E', '2 年条件绿卡', '递 I-829 解除条件'], timeline: '2-4 年 + 条件期', caveat: '高财务和经营风险。必须亲自经营。工作必须是 W-2 员工。' },
    tw: { name: 'EB-5 直接投資($1,050,000)', summary: '自己投資美國生意 $1.05M,創造 10 個工作', steps: ['建立/投資美國企業', '創造 10 個全職美國工作', '遞 I-526E', '2 年條件綠卡', '遞 I-829 解除條件'], timeline: '2-4 年 + 條件期', caveat: '高財務和經營風險。必須親自經營。工作必須是 W-2 員工。' }
  },
  {
    id: 'emp-eb5-rc',
    group: 'employment', category: 'EB-5 Regional Center', waitStatus: 'varies', goesTo: null,
    en: { name: 'EB-5 Regional Center ($800K TEA)', summary: 'Invest $800,000 in USCIS-approved Regional Center project in a TEA', steps: ['Select approved Regional Center project', 'Invest $800K (TEA) or $1.05M (non-TEA)', 'File I-526E', '2-year conditional green card', 'File I-829'], timeline: '2-4 years + conditional period', caveat: 'Passive investment. Indirect job creation counts. Project selection critical. China set-aside visas help Chinese investors.' },
    zh: { name: 'EB-5 区域中心($800K TEA)', summary: '投资 $800,000 到 USCIS 批准的 TEA 区域中心项目', steps: ['选择已批准的区域中心项目', '投资 $800K(TEA)或 $1.05M(非 TEA)', '递 I-526E', '2 年条件绿卡', '递 I-829'], timeline: '2-4 年 + 条件期', caveat: '被动投资,间接创造就业也算。项目选择至关重要。中国有专属预留签证配额。' },
    tw: { name: 'EB-5 區域中心($800K TEA)', summary: '投資 $800,000 到 USCIS 批准的 TEA 區域中心項目', steps: ['選擇已批准的區域中心項目', '投資 $800K(TEA)或 $1.05M(非 TEA)', '遞 I-526E', '2 年條件綠卡', '遞 I-829'], timeline: '2-4 年 + 條件期', caveat: '被動投資,間接創造就業也算。項目選擇至關重要。中國有專屬預留簽證配額。' }
  },

  // ── STUDENT ROUTES ────────────────────────────────────────
  {
    id: 'stu-phd-niw',
    group: 'student', category: 'F1 → EB-2 NIW', waitStatus: 'varies', goesTo: 'EB2',
    en: { name: 'F1 PhD/Master → EB-2 NIW (self-petition)', summary: 'Most common self-petition path for students', steps: ['F1 during study', 'OPT + STEM OPT', 'Self-petition NIW with Dhanasar evidence', 'No employer required — great for job flexibility'], timeline: 'Priority date depends on country', caveat: 'Doesn\'t require employer sponsorship — huge advantage for job hopping. PhDs have higher approval rates.' },
    zh: { name: 'F1 博士/硕士 → EB-2 NIW(自我申请)', summary: '留学生最常见的自主路径', steps: ['F1 学习', 'OPT + STEM OPT', '自己递 NIW + Dhanasar 证据', '无需雇主 — 换工作灵活'], timeline: '排期取决于国家', caveat: '无需雇主担保 — 对跳槽极有利。博士通过率更高。' },
    tw: { name: 'F1 博士/碩士 → EB-2 NIW(自我申請)', summary: '留學生最常見的自主路徑', steps: ['F1 學習', 'OPT + STEM OPT', '自己遞 NIW + Dhanasar 證據', '無需雇主 — 換工作靈活'], timeline: '排期取決於國家', caveat: '無需雇主擔保 — 對跳槽極有利。博士通過率更高。' }
  },
  {
    id: 'stu-master-h1b-eb2',
    group: 'student', category: 'F1 → H-1B → EB-2', waitStatus: 'varies', goesTo: 'EB2',
    en: { name: 'F1 Master → OPT → H-1B → EB-2 (employer)', summary: 'The classic worker pipeline', steps: ['F1 Master\'s', 'OPT (12mo) + STEM OPT (24mo for STEM)', 'Employer sponsors H-1B (lottery ~25%)', 'PERM → I-140', 'I-485 when current'], timeline: '5-10+ years total', caveat: 'Two big filters: (1) H-1B lottery (~25% base, higher for US Master\'s); (2) your PERM wage must hit Level II for EB-2 — if only Level I, employer drops to EB-3. US Master\'s gets better lottery odds. ⚠️ DOL 2026 rule would raise wage floors significantly.' },
    zh: { name: 'F1 硕士 → OPT → H-1B → EB-2(雇主)', summary: '最主流的打工人路径', steps: ['F1 读硕士', 'OPT(12 月)+ STEM OPT(24 月)', '雇主担保 H-1B(抽签约 25%)', 'PERM → I-140', '排期 current 递 I-485'], timeline: '总计 5-10+ 年', caveat: '两个大关卡:(1) H-1B 抽签约 25%(美国硕士有 Master\'s Cap 更高); (2) PERM 工资必须到 Level II 才能走 EB-2,否则被迫走 EB-3。 ⚠️ DOL 2026年3月拟议规则将大幅提高工资门槛。' },
    tw: { name: 'F1 碩士 → OPT → H-1B → EB-2(雇主)', summary: '最主流的打工人路徑', steps: ['F1 讀碩士', 'OPT(12 月)+ STEM OPT(24 月)', '雇主擔保 H-1B(抽籤約 25%)', 'PERM → I-140', '排期 current 遞 I-485'], timeline: '總計 5-10+ 年', caveat: '兩個大關卡:(1) H-1B 抽籤約 25%(美國碩士有 Master\'s Cap 更高); (2) PERM 工資必須到 Level II 才能走 EB-2,否則被迫走 EB-3。 ⚠️ DOL 2026年3月擬議規則將大幅提高工資門檻。' }
  },
  {
    id: 'stu-bachelor-h1b-eb3',
    group: 'student', category: 'F1 → H-1B → EB-3', waitStatus: 'varies', goesTo: 'EB3',
    en: { name: 'F1 Bachelor → OPT → H-1B → EB-3 (employer)', summary: 'Like Master\'s path, but uses EB-3', steps: ['F1 Bachelor', 'OPT + STEM OPT (if STEM)', 'H-1B lottery', 'PERM → EB-3 I-140', 'I-485 when current'], timeline: '5-15+ years', caveat: 'Consider getting Master\'s to qualify for EB-2 instead (shorter wait for some countries).' },
    zh: { name: 'F1 本科 → OPT → H-1B → EB-3(雇主)', summary: '和硕士路径类似,但走 EB-3', steps: ['F1 本科', 'OPT + STEM OPT(如 STEM)', 'H-1B 抽签', 'PERM → EB-3 I-140', '排期 current 递 I-485'], timeline: '5-15+ 年', caveat: '考虑读个硕士升级到 EB-2(某些国家排期更短)。' },
    tw: { name: 'F1 本科 → OPT → H-1B → EB-3(雇主)', summary: '和碩士路徑類似,但走 EB-3', steps: ['F1 本科', 'OPT + STEM OPT(如 STEM)', 'H-1B 抽籤', 'PERM → EB-3 I-140', '排期 current 遞 I-485'], timeline: '5-15+ 年', caveat: '考慮讀個碩士升級到 EB-2(某些國家排期更短)。' }
  },
  {
    id: 'stu-academia-eb1b',
    group: 'student', category: 'F1 → EB-1B', waitStatus: 'medium', goesTo: 'EB1',
    en: { name: 'F1 → Postdoc → EB-1B (academic career)', summary: 'For PhDs staying in academia', steps: ['F1 PhD → OPT', 'Postdoc or faculty position', 'Accumulate publications, invited talks, peer reviews', 'University files EB-1B'], timeline: '3-8 years post-PhD', caveat: 'Great for assistant professors and senior researchers.' },
    zh: { name: 'F1 → 博士后 → EB-1B(走学术)', summary: '适合留在学术界的博士', steps: ['F1 博士 → OPT', '博士后或教职', '积累发表、受邀报告、同行评审', '大学递 EB-1B'], timeline: '博士后 3-8 年', caveat: '适合助理教授和资深研究员。' },
    tw: { name: 'F1 → 博士後 → EB-1B(走學術)', summary: '適合留在學術界的博士', steps: ['F1 博士 → OPT', '博士後或教職', '積累發表、受邀報告、同行評審', '大學遞 EB-1B'], timeline: '博士後 3-8 年', caveat: '適合助理教授和資深研究員。' }
  },
  {
    id: 'stu-marry',
    group: 'student', category: 'F1 → AOS (marriage)', waitStatus: 'none', goesTo: null,
    en: { name: 'F1 → marry USC/LPR in US → AOS', summary: 'If you marry a USC (or LPR) during studies', steps: ['Marry USC → file I-130 + I-485 concurrently (IR-1)', 'Marry LPR → F2A, currently Current', 'Maintain F1 status until AOS approved'], timeline: '~10-14 months (USC spouse)', caveat: 'Marriage must be bona fide. USCIS scrutinizes student-marriage AOS cases carefully.' },
    zh: { name: 'F1 → 在美国与公民/绿卡结婚 → AOS', summary: '读书期间与公民/绿卡结婚', steps: ['与公民结婚 → I-130 + I-485 同时递(IR-1)', '与绿卡结婚 → F2A 目前 Current', 'AOS 批准前保持 F1 合法身份'], timeline: '与公民配偶约 10-14 个月', caveat: '婚姻必须真实。USCIS 对留学生结婚 AOS 审查极严。' },
    tw: { name: 'F1 → 在美國與公民/綠卡結婚 → AOS', summary: '讀書期間與公民/綠卡結婚', steps: ['與公民結婚 → I-130 + I-485 同時遞(IR-1)', '與綠卡結婚 → F2A 目前 Current', 'AOS 批准前保持 F1 合法身份'], timeline: '與公民配偶約 10-14 個月', caveat: '婚姻必須真實。USCIS 對留學生結婚 AOS 審查極嚴。' }
  },

  // ── VISA TO GREEN CARD ────────────────────────────────────
  {
    id: 'v2g-h1b-eb23',
    group: 'visa-to-gc', category: 'H-1B → EB-2/EB-3', waitStatus: 'varies', goesTo: 'EB2',
    en: { name: 'H-1B → EB-2/EB-3 (employer sponsor)', summary: 'Most common working-professional path', steps: ['H-1B approved (3 years, extendable to 6)', 'Employer starts PERM', 'Approved I-140 extends H-1B beyond 6 years', 'I-485 when current'], timeline: 'PERM + I-140 + priority date + I-485', caveat: 'Approved I-140 is the anchor — H-1B can extend indefinitely via AC21. Your PERM wage level (I/II/III/IV) determines whether employer can file EB-2 or must drop to EB-3 — most EB-2 requires at least Level II. ⚠️ DOL March 2026 proposed rule would significantly raise all wage level floors.' },
    zh: { name: 'H-1B → EB-2/EB-3(雇主担保)', summary: '最常见的打工人路径', steps: ['H-1B 批准(3 年,可延至 6 年)', '雇主开始 PERM', 'I-140 批准后 H-1B 可超 6 年延期', '排期 current 递 I-485'], timeline: 'PERM + I-140 + 排期 + I-485', caveat: 'I-140 批准是锚点 — 可通过 AC21 无限延 H-1B。你的 PERM 工资 Level(I/II/III/IV)决定走 EB-2 还是被迫走 EB-3 — 大部分 EB-2 要求 Level II 以上。⚠️ DOL 2026年3月拟议规则将大幅提高所有 Level 门槛。' },
    tw: { name: 'H-1B → EB-2/EB-3(雇主擔保)', summary: '最常見的打工人路徑', steps: ['H-1B 批准(3 年,可延至 6 年)', '雇主開始 PERM', 'I-140 批准後 H-1B 可超 6 年延期', '排期 current 遞 I-485'], timeline: 'PERM + I-140 + 排期 + I-485', caveat: 'I-140 批准是錨點 — 可通過 AC21 無限延 H-1B。你的 PERM 工資 Level(I/II/III/IV)決定走 EB-2 還是被迫走 EB-3 — 大部分 EB-2 要求 Level II 以上。⚠️ DOL 2026年3月擬議規則將大幅提高所有 Level 門檻。' }
  },
  {
    id: 'v2g-h1b-niw',
    group: 'visa-to-gc', category: 'H-1B → EB-2 NIW', waitStatus: 'varies', goesTo: 'EB2',
    en: { name: 'H-1B → EB-2 NIW (bypass employer)', summary: 'If employer won\'t sponsor, self-petition NIW', steps: ['H-1B status maintained', 'Self-petition NIW I-140', 'I-485 when current (AC21 portability after 180 days)'], timeline: 'I-140 + EB-2 priority date + I-485', caveat: 'Freedom from employer. Strong option for researchers/scientists on H-1B whose employer won\'t do PERM.' },
    zh: { name: 'H-1B → EB-2 NIW(绕开雇主)', summary: '雇主不愿担保时,自己递 NIW', steps: ['保持 H-1B 身份', '自己递 NIW I-140', '排期 current 递 I-485(180 天后可用 AC21 跳槽)'], timeline: 'I-140 + EB-2 排期 + I-485', caveat: '摆脱雇主束缚。雇主不做 PERM 时对研究员/科学家极好。' },
    tw: { name: 'H-1B → EB-2 NIW(繞開雇主)', summary: '雇主不願擔保時,自己遞 NIW', steps: ['保持 H-1B 身份', '自己遞 NIW I-140', '排期 current 遞 I-485(180 天後可用 AC21 跳槽)'], timeline: 'I-140 + EB-2 排期 + I-485', caveat: '擺脫雇主束縛。雇主不做 PERM 時對研究員/科學家極好。' }
  },
  {
    id: 'v2g-l1a-eb1c',
    group: 'visa-to-gc', category: 'L-1A → EB-1C', waitStatus: 'medium', goesTo: 'EB1',
    en: { name: 'L-1A → EB-1C (intra-company transfer)', summary: 'The executive/manager golden path', steps: ['Work abroad ≥1y as exec/manager at foreign parent', 'Transfer to US on L-1A (5-7 year max)', 'Employer files EB-1C (no PERM)', 'I-485 when current'], timeline: 'L-1A 3-4y before EB-1C typical', caveat: 'Documentation of exec/managerial duties critical. "Manager of function" can qualify.' },
    zh: { name: 'L-1A → EB-1C(跨国公司内部调动)', summary: '高管/经理的黄金路径', steps: ['海外母公司高管/经理 ≥1 年', '调到美国 L-1A(最多 5-7 年)', '雇主递 EB-1C(无需 PERM)', '排期 current 递 I-485'], timeline: '通常 L-1A 干 3-4 年后开始 EB-1C', caveat: '高管/经理职责证据至关重要。"职能经理"也符合。' },
    tw: { name: 'L-1A → EB-1C(跨國公司內部調動)', summary: '高管/經理的黃金路徑', steps: ['海外母公司高管/經理 ≥1 年', '調到美國 L-1A(最多 5-7 年)', '雇主遞 EB-1C(無需 PERM)', '排期 current 遞 I-485'], timeline: '通常 L-1A 乾 3-4 年後開始 EB-1C', caveat: '高管/經理職責證據至關重要。"職能經理"也符合。' }
  },
  {
    id: 'v2g-l1b-eb23',
    group: 'visa-to-gc', category: 'L-1B → EB-2/EB-3', waitStatus: 'varies', goesTo: 'EB2',
    en: { name: 'L-1B → EB-2/EB-3 (specialized knowledge)', summary: 'Non-executive L-1 path', steps: ['L-1B (5 year max) for specialized knowledge', 'Employer must do PERM for green card', 'I-140 → I-485 when current'], timeline: 'PERM + I-140 + priority date + I-485', caveat: 'Unlike L-1A, requires PERM. L-1B expires at 5 years (no extension beyond).' },
    zh: { name: 'L-1B → EB-2/EB-3(专业知识员工)', summary: '非高管 L-1 路径', steps: ['L-1B(最多 5 年)专业知识', '雇主需做 PERM 才能办绿卡', 'I-140 → 排期 current 递 I-485'], timeline: 'PERM + I-140 + 排期 + I-485', caveat: '与 L-1A 不同,需要 PERM。L-1B 到 5 年不能再延。' },
    tw: { name: 'L-1B → EB-2/EB-3(專業知識員工)', summary: '非高管 L-1 路徑', steps: ['L-1B(最多 5 年)專業知識', '雇主需做 PERM 才能辦綠卡', 'I-140 → 排期 current 遞 I-485'], timeline: 'PERM + I-140 + 排期 + I-485', caveat: '與 L-1A 不同,需要 PERM。L-1B 到 5 年不能再延。' }
  },
  {
    id: 'v2g-o1-eb1',
    group: 'visa-to-gc', category: 'O-1 → EB-1A/EB-1B', waitStatus: 'medium', goesTo: 'EB1',
    en: { name: 'O-1 → EB-1A or EB-1B', summary: 'Natural progression from O-1 extraordinary ability visa', steps: ['O-1 visa approved (3y, extendable indefinitely)', 'Build more evidence of achievement', 'File EB-1A (self) or EB-1B (employer)', 'I-485 when current'], timeline: '1-3 years from O-1 to I-140 typical', caveat: 'O-1 criteria are a subset of EB-1A — documentation for most requirements is already in hand.' },
    zh: { name: 'O-1 → EB-1A / EB-1B', summary: '从 O-1 杰出人才签证自然升级', steps: ['O-1 批准(3 年,可无限延期)', '积累更多成就证据', '递 EB-1A(自己)或 EB-1B(雇主)', '排期 current 递 I-485'], timeline: 'O-1 到 I-140 通常 1-3 年', caveat: 'O-1 标准是 EB-1A 证据的子集 — 大部分证据已经有。' },
    tw: { name: 'O-1 → EB-1A / EB-1B', summary: '從 O-1 傑出人才簽證自然升級', steps: ['O-1 批准(3 年,可無限延期)', '積累更多成就證據', '遞 EB-1A(自己)或 EB-1B(雇主)', '排期 current 遞 I-485'], timeline: 'O-1 到 I-140 通常 1-3 年', caveat: 'O-1 標準是 EB-1A 證據的子集 — 大部分證據已經有。' }
  },
  {
    id: 'v2g-j1',
    group: 'visa-to-gc', category: 'J-1 (waiver or home residence)', waitStatus: 'varies', goesTo: null,
    en: { name: 'J-1 exchange visitor → Green card', summary: 'J-1 may have 212(e) 2-year home residency requirement', steps: ['Check if J-1 carries 212(e)', 'If yes: apply for waiver (Hardship / No-Objection / Persecution / IGA / Conrad 30 for doctors)', 'Or fulfill 2-year home residency', 'Then pursue any green card path'], timeline: 'Waiver 6-12mo, then category-dependent', caveat: 'Waivers take time. Conrad 30 for doctors comes with service commitments.' },
    zh: { name: 'J-1 交流访问 → 绿卡', summary: 'J-1 可能有 212(e) 两年回国要求', steps: ['查看是否带 212(e)', '如是:申请豁免(困难/无异议信/迫害/政府请求/医生 Conrad 30)', '或回国服务满 2 年', '然后走任何绿卡路径'], timeline: '豁免 6-12 月,然后按类别', caveat: '豁免需时。Conrad 30 医生豁免附带服务承诺。' },
    tw: { name: 'J-1 交流訪問 → 綠卡', summary: 'J-1 可能有 212(e) 兩年回國要求', steps: ['查看是否帶 212(e)', '如是:申請豁免(困難/無異議信/迫害/政府請求/醫生 Conrad 30)', '或回國服務滿 2 年', '然後走任何綠卡路徑'], timeline: '豁免 6-12 月,然後按類別', caveat: '豁免需時。Conrad 30 醫生豁免附帶服務承諾。' }
  },
  {
    id: 'v2g-b12-ir',
    group: 'visa-to-gc', category: 'B-1/B-2 → IR AOS', waitStatus: 'none', goesTo: null, warning: true,
    en: { name: 'B-1/B-2 → AOS (IR only, risky)', summary: '⚠️ Tourist visa to AOS — only for immediate-relative marriage', steps: ['Enter on B visa with no pre-existing intent to stay', 'If you marry a USC after entry, can file I-485', '30/60/90-day rule: filing within 30 days presumed fraud'], timeline: '~10-14mo if approved', caveat: '⚠️ HIGH RISK of fraud accusation if timing is suspicious. Only IR relatives (USC spouse/parent/minor child). Consult a lawyer.' },
    zh: { name: 'B-1/B-2 → AOS(仅 IR 直系亲属,风险高)', summary: '⚠️ 旅游签转 AOS — 仅限与公民结婚等', steps: ['入境时不能有预先移民意图', '入境后与公民结婚可递 I-485', '30/60/90 天规则:30 天内递默认欺诈'], timeline: '约 10-14 个月', caveat: '⚠️ 时间可疑会被认定欺诈。仅限 IR 直系亲属。必须咨询律师。' },
    tw: { name: 'B-1/B-2 → AOS(僅 IR 直系親屬,風險高)', summary: '⚠️ 旅遊簽轉 AOS — 僅限與公民結婚等', steps: ['入境時不能有預先移民意圖', '入境後與公民結婚可遞 I-485', '30/60/90 天規則:30 天內遞默認欺詐'], timeline: '約 10-14 個月', caveat: '⚠️ 時間可疑會被認定欺詐。僅限 IR 直系親屬。必須諮詢律師。' }
  },

  // ── SPECIAL ──────────────────────────────────────────────
  {
    id: 'sp-dv',
    group: 'special', category: 'DV Lottery', waitStatus: 'varies', goesTo: null,
    en: { name: 'Diversity Visa Lottery', summary: 'Annual lottery for low-immigration-rate countries', steps: ['Register in October (free) at dvprogram.state.gov', 'Check selection status in May', 'If selected, complete DS-260 and interview'], timeline: 'Register Oct → results May → GC by Sept next year', caveat: '⚠️ China, India, Mexico, Philippines, Vietnam, Korea, UK, Canada NOT eligible. Taiwan, HK, Macao eligible.' },
    zh: { name: 'DV 抽签(多元化签证)', summary: '每年抽签,来自低移民率国家', steps: ['10 月免费登记 dvprogram.state.gov', '次年 5 月查询中签', '中签后完成 DS-260 面签'], timeline: '10 月登记 → 次年 5 月结果 → 9 月绿卡', caveat: '⚠️ 中国、印度、墨西哥、菲律宾、越南、韩国、英国、加拿大无资格。台湾、港澳有资格。' },
    tw: { name: 'DV 抽籤(多元化簽證)', summary: '每年抽籤,來自低移民率國家', steps: ['10 月免費登記 dvprogram.state.gov', '次年 5 月查詢中籤', '中籤後完成 DS-260 面簽'], timeline: '10 月登記 → 次年 5 月結果 → 9 月綠卡', caveat: '⚠️ 中國、印度、墨西哥、菲律賓、越南、韓國、英國、加拿大無資格。台灣、港澳有資格。' }
  },
  {
    id: 'sp-asylum',
    group: 'special', category: 'Asylum', waitStatus: 'long', goesTo: null,
    en: { name: 'Political Asylum', summary: 'For those facing persecution in home country', steps: ['Apply within 1 year of US entry (I-589)', 'Affirmative interview or court hearing', 'If granted: work permit immediately, green card 1 year later'], timeline: 'Case backlog 2-5+ years', caveat: 'Must prove credible fear on protected grounds. Consult experienced asylum attorney.' },
    zh: { name: '政治庇护', summary: '面临本国迫害的人', steps: ['入境 1 年内递 I-589', '肯定性面谈或法庭审理', '批准后:立即获工卡,1 年后可调整身份拿绿卡'], timeline: '积压 2-5+ 年', caveat: '必须证明基于受保护理由的可信迫害恐惧。咨询经验丰富的庇护律师。' },
    tw: { name: '政治庇護', summary: '面臨本國迫害的人', steps: ['入境 1 年內遞 I-589', '肯定性面談或法庭審理', '批准後:立即獲工卡,1 年後可調整身份拿綠卡'], timeline: '積壓 2-5+ 年', caveat: '必須證明基於受保護理由的可信迫害恐懼。諮詢經驗豐富的庇護律師。' }
  },
  {
    id: 'sp-vawa',
    group: 'special', category: 'VAWA', waitStatus: 'varies', goesTo: null,
    en: { name: 'VAWA (abused spouse/child/parent)', summary: 'Self-petition if abused by USC/LPR family member', steps: ['File I-360 confidentially (no notice to abuser)', 'If approved, file I-485 (IR or F2A equivalent)', 'Can include certain children'], timeline: '~2-4 years', caveat: 'Confidential — abuser is NOT notified. Strong evidence of abuse required.' },
    zh: { name: 'VAWA(受虐配偶/子女/父母)', summary: '被公民/绿卡家属虐待,可自我申请', steps: ['保密递 I-360(施虐者不通知)', '批准后递 I-485(等同 IR 或 F2A)', '可包括特定子女'], timeline: '约 2-4 年', caveat: '保密 — 施虐者不会被通知。需强力证据:警察报告、医疗记录、证人陈述。' },
    tw: { name: 'VAWA(受虐配偶/子女/父母)', summary: '被公民/綠卡家屬虐待,可自我申請', steps: ['保密遞 I-360(施虐者不通知)', '批准後遞 I-485(等同 IR 或 F2A)', '可包括特定子女'], timeline: '約 2-4 年', caveat: '保密 — 施虐者不會被通知。需強力證據。' }
  },
  {
    id: 'emp-sr-religious',
    group: 'employment', category: 'SR (EB-4 religious)', waitStatus: 'long', goesTo: 'SR',
    en: { name: 'SR — Religious worker (EB-4)', summary: 'Ministers and non-minister religious workers sponsored by a bona fide U.S. religious organization', steps: ['2+ years of continuous membership and religious work', 'Employer files I-360 (ministers may self-petition in limited cases)', 'I-485 or consular processing when the SR date is current'], timeline: 'I-360 6-12 mo + SR priority-date wait', caveat: 'The non-minister SR program runs on a sunset clause Congress must keep renewing — it has lapsed before. Ministers are NOT subject to that sunset. SR shares the EB-4 numbers and moves on its own line in the bulletin.' },
    zh: { name: 'SR 宗教工作者(EB-4)', summary: '由正当美国宗教组织担保的神职人员与非神职宗教工作者', steps: ['先满足连续 2 年以上的会籍与宗教工作经历', '雇主递 I-360(神职人员在特定情形下可自我申请)', 'SR 排期到后递 I-485 或走领事馆'], timeline: 'I-360 约 6-12 个月 + SR 排期', caveat: '非神职的 SR 类别带日落条款,需要国会一次次续期,历史上真的失效过;神职人员不受该条款限制。SR 与 EB-4 共用名额,但在公告里是单独一行,不能照抄 EB-4 的截止日。' },
    tw: { name: 'SR 宗教工作者(EB-4)', summary: '由正當美國宗教組織擔保的神職人員與非神職宗教工作者', steps: ['先滿足連續 2 年以上的會籍與宗教工作經歷', '雇主遞 I-360(神職人員在特定情形下可自我申請)', 'SR 排期到後遞 I-485 或走領事館'], timeline: 'I-360 約 6-12 個月 + SR 排期', caveat: '非神職的 SR 類別帶日落條款,需要國會一次次續期,歷史上真的失效過;神職人員不受該條款限制。SR 與 EB-4 共用名額,但在公告裡是單獨一行,不能照抄 EB-4 的截止日。' }
  },
  {
    id: 'sp-sijs',
    group: 'special', category: 'SIJS (EB-4)', waitStatus: 'long', goesTo: 'EB4', needsLawyer: true,
    en: { name: 'SIJS — Special Immigrant Juvenile', summary: 'Under 21, unmarried, in the U.S., cannot reunite with a parent due to abuse, neglect or abandonment', steps: ['State family/juvenile court makes the required findings', 'File I-360 with USCIS', 'File I-485 when the EB-4 date is current', 'Work permit and SSN available while waiting'], timeline: 'Court 3-9 mo → I-360 3-8 mo → EB-4 wait 1-3 yr', caveat: 'Court findings must come BEFORE the 21st birthday (state age limits vary). EB-4 retrogressed — the wait after approval is real. A petition through SIJS never confers status on the abusive parent.' },
    zh: { name: 'SIJS 特殊青少年移民', summary: '未满 21 岁、未婚、人在美国境内,因虐待/忽视/遗弃无法与父母团聚', steps: ['先由州家事/少年法院做出认定', '向 USCIS 递 I-360', 'EB-4 排期到后递 I-485', '等待期间可申请工卡与 SSN'], timeline: '法院 3-9 月 → I-360 3-8 月 → EB-4 排期 1-3 年', caveat: '法院认定必须在 21 岁生日前完成(各州年龄上限不同)。EB-4 近期倒退,批准后仍要等排期。通过 SIJS 拿身份的孩子,不能再为施虐的父母申请。' },
    tw: { name: 'SIJS 特殊青少年移民', summary: '未滿 21 歲、未婚、人在美國境內,因虐待/忽視/遺棄無法與父母團聚', steps: ['先由州家事/少年法院做出認定', '向 USCIS 遞 I-360', 'EB-4 排期到後遞 I-485', '等待期間可申請工卡與 SSN'], timeline: '法院 3-9 月 → I-360 3-8 月 → EB-4 排期 1-3 年', caveat: '法院認定必須在 21 歲生日前完成(各州年齡上限不同)。EB-4 近期倒退,批准後仍要等排期。透過 SIJS 拿身份的孩子,不能再為施虐的父母申請。' }
  },
  {
    id: 'sp-t-visa',
    group: 'special', category: 'T Visa', waitStatus: 'medium', goesTo: null, needsLawyer: true,
    en: { name: 'T Visa (trafficking victim)', summary: 'For victims of labor or sex trafficking who cooperate with law enforcement', steps: ['File I-914 (+ I-914B law-enforcement declaration if available)', 'Work permit with approval', 'Apply for the green card after 3 years of T status'], timeline: '~2-3 yr to T status, green card after 3 more', caveat: 'The annual cap is rarely hit, so the wait is shorter than U visa. Law-enforcement certification helps but is not strictly required.' },
    zh: { name: 'T 签证(人口贩运受害者)', summary: '劳工或性剥削贩运的受害者,配合执法即可申请', steps: ['递 I-914(如能取得,附 I-914B 执法声明)', '批准即获工卡', 'T 身份满 3 年后申请绿卡'], timeline: '约 2-3 年拿 T 身份,再 3 年拿绿卡', caveat: '年配额很少用满,等待明显短于 U 签证。执法证明有帮助但非硬性要求。与 U 签证的差别常被混淆,先咨询律师再选。' },
    tw: { name: 'T 簽證(人口販運受害者)', summary: '勞工或性剝削販運的受害者,配合執法即可申請', steps: ['遞 I-914(如能取得,附 I-914B 執法聲明)', '批准即獲工卡', 'T 身份滿 3 年後申請綠卡'], timeline: '約 2-3 年拿 T 身份,再 3 年拿綠卡', caveat: '年配額很少用滿,等待明顯短於 U 簽證。執法證明有幫助但非硬性要求。' }
  },
  {
    id: 'sp-widow',
    group: 'special', category: 'Widow(er) I-360', waitStatus: 'none', goesTo: null,
    en: { name: 'Widow(er) of a U.S. citizen (self-petition)', summary: 'Your USC spouse died before the green card came through — you can still self-petition', steps: ['File I-360 within 2 years of the death', 'File I-485 (or consular process) — immediate-relative, no quota', 'Remarriage before approval ends eligibility'], timeline: 'No priority-date wait; processing only', caveat: 'The 2-year deadline is hard. A pending I-130 filed by the deceased spouse automatically converts to an I-360 — many people refile unnecessarily.' },
    zh: { name: '美国公民的丧偶配偶(自我申请)', summary: '公民配偶在绿卡下来前去世,你仍可自己申请', steps: ['去世后 2 年内递 I-360', '递 I-485 或走领事馆 — 属直系亲属,无配额', '批准前再婚即失去资格'], timeline: '无排期,只等审理', caveat: '2 年期限是硬的。已故配偶生前递交、尚未批准的 I-130 会自动转为 I-360 — 很多人不知道,白重递一次。' },
    tw: { name: '美國公民的喪偶配偶(自我申請)', summary: '公民配偶在綠卡下來前去世,你仍可自己申請', steps: ['去世後 2 年內遞 I-360', '遞 I-485 或走領事館 — 屬直系親屬,無配額', '批准前再婚即失去資格'], timeline: '無排期,只等審理', caveat: '2 年期限是硬的。已故配偶生前遞交、尚未批准的 I-130 會自動轉為 I-360 — 很多人白重遞一次。' }
  },
  {
    id: 'sp-cancellation',
    group: 'special', category: 'Cancellation of Removal', waitStatus: 'long', goesTo: null, needsLawyer: true,
    en: { name: 'Cancellation of removal (non-LPR)', summary: 'Only available to someone already in removal proceedings before an immigration judge', steps: ['Be in removal proceedings (this is a defense, not an application you file on your own)', 'Show 10+ years continuous presence, good moral character', 'Show exceptional and extremely unusual hardship to a USC/LPR spouse, parent or child', 'Judge grants — green card issued directly'], timeline: 'Court backlog years; 4,000 grants per year nationwide', caveat: 'You cannot apply for this affirmatively — it exists only as a defense in court. The hardship standard is very high and the annual cap creates its own queue. Never enter proceedings on purpose to try for it.' },
    zh: { name: '取消遣返(非绿卡持有者)', summary: '只有已经在移民法庭遣返程序中的人才能申请', steps: ['人已在遣返程序中(这是抗辩手段,不是自己主动递的申请)', '证明连续居住满 10 年、品行良好', '证明遣返会给公民/绿卡的配偶、父母或子女造成"异常且极不寻常的困难"', '法官批准即直接发绿卡'], timeline: '法庭积压数年;全美每年仅 4,000 个名额', caveat: '不能主动申请,只能在法庭上作为抗辩。困难标准极高(远超"经济困难"),名额上限自成一条队。绝不要为了争取它而故意进入遣返程序。' },
    tw: { name: '取消遣返(非綠卡持有者)', summary: '只有已經在移民法庭遣返程序中的人才能申請', steps: ['人已在遣返程序中(這是抗辯手段,不是自己主動遞的申請)', '證明連續居住滿 10 年、品行良好', '證明遣返會給公民/綠卡的配偶、父母或子女造成「異常且極不尋常的困難」', '法官批准即直接發綠卡'], timeline: '法庭積壓數年;全美每年僅 4,000 個名額', caveat: '不能主動申請,只能在法庭上作為抗辯。困難標準極高,名額上限自成一條隊。絕不要為了爭取它而故意進入遣返程序。' }
  },
  {
    id: 'sp-u-visa',
    group: 'special', category: 'U Visa', waitStatus: 'long', goesTo: null,
    en: { name: 'U Visa (crime victim)', summary: 'For victims of serious crimes who help law enforcement', steps: ['Law enforcement signs U certification (I-918B)', 'File I-918 + I-192 if needed', '10,000/year cap → ~5+ year wait', 'After 3 years of U status, apply for green card'], timeline: '5-10+ years', caveat: 'Hard cap creates long backlog. Certification from police/prosecutor required.' },
    zh: { name: 'U 签证(犯罪受害者)', summary: '严重犯罪受害者协助执法可申请', steps: ['执法部门签 U 证明(I-918B)', '递 I-918 +(如需)I-192', '每年 10,000 个配额 → 等待 5+ 年', 'U 身份 3 年后可申请绿卡'], timeline: '5-10+ 年', caveat: '硬配额造成长积压。需警察/检察官证明。' },
    tw: { name: 'U 簽證(犯罪受害者)', summary: '嚴重犯罪受害者協助執法可申請', steps: ['執法部門簽 U 證明(I-918B)', '遞 I-918 +(如需)I-192', '每年 10,000 個配額 → 等待 5+ 年', 'U 身份 3 年後可申請綠卡'], timeline: '5-10+ 年', caveat: '硬配額造成長積壓。需警察/檢察官證明。' }
  },
];

const PATHWAY_GROUPS = {
  family: { en: 'Family-Based', zh: '亲属移民', tw: '親屬移民' },
  employment: { en: 'Employment-Based', zh: '职业移民', tw: '職業移民' },
  student: { en: 'Student Routes', zh: '留学生路径', tw: '留學生路徑' },
  'visa-to-gc': { en: 'Visa → Green Card', zh: '签证转绿卡', tw: '簽證轉綠卡' },
  special: { en: 'Special Cases', zh: '特殊情况', tw: '特殊情況' },
};

// ============================================================
// The Index — interactive pathway finder component
// ============================================================
const TheIndex = ({ userCase, setTab, setUserCase, previousTab, onSetupCase, onCategoryPicked }) => {
  const { t, lang } = useLang();
  const [mode, setMode] = useState('quiz');
  const [filterGroup, setFilterGroup] = useState('all');
  const [expandedId, setExpandedId] = useState(null);
  const [answers, setAnswers] = useState({});
  const [step, setStep] = useState(0);

  const pathways = filterGroup === 'all'
    ? PATHWAYS
    : PATHWAYS.filter(p => p.group === filterGroup);

  const waitLabel = (status) => {
    const labels = {
      none:   { en: 'No wait', zh: '无排期', tw: '無排期', color: 'var(--gc-green)' },
      short:  { en: 'Short', zh: '短', tw: '短', color: 'var(--gc-green)' },
      medium: { en: 'Medium', zh: '中', tw: '中', color: 'var(--gc-amber)' },
      long:   { en: 'Long', zh: '长', tw: '長', color: 'var(--gc-red)' },
      varies: { en: 'Varies', zh: '视情况', tw: '視情況', color: 'var(--gc-muted)' },
    };
    return labels[status] || labels.varies;
  };

  // Decision tree: define all possible questions. Some have branches depending on previous answer.
  const quizSteps = [
    {
      id: 'q1',
      en: { q: 'How do you plan to get a green card?', help: 'The main doorway matters most.' },
      zh: { q: '你打算通过什么路径拿绿卡?', help: '第一个大方向决定走哪条路。' },
      tw: { q: '你打算通過什麼路徑拿綠卡?', help: '第一個大方向決定走哪條路。' },
      options: [
        { val: 'family', en: 'A family member in US will sponsor me', zh: '在美家人担保我', tw: '在美家人擔保我' },
        { val: 'work',   en: 'Through my job / skills / education', zh: '通过工作 / 技能 / 学历', tw: '通過工作 / 技能 / 學歷' },
        { val: 'invest', en: 'By investing money', zh: '通过投资', tw: '通過投資' },
        { val: 'other',  en: 'Special situation (lottery, asylum, abuse)', zh: '特殊情况(抽签/庇护/家暴)', tw: '特殊情況(抽籤/庇護/家暴)' },
      ]
    },
    {
      id: 'q2',
      dependsOn: 'q1',
      branches: {
        family: {
          en: { q: 'Who will sponsor you?', help: '' },
          zh: { q: '谁来担保你?', help: '' },
          tw: { q: '誰來擔保你?', help: '' },
          options: [
            { val: 'usc', en: 'A US Citizen', zh: '美国公民', tw: '美國公民' },
            { val: 'lpr', en: 'A Green Card holder (LPR)', zh: '绿卡持有人', tw: '綠卡持有人' },
          ]
        },
        work: {
          en: { q: 'What\'s your situation?', help: '' },
          zh: { q: '你的情况是?', help: '' },
          tw: { q: '你的情況是?', help: '' },
          options: [
            { val: 'extraordinary', en: 'International-level awards / achievement', zh: '国际级奖项 / 成就', tw: '國際級獎項 / 成就' },
            { val: 'professor',     en: 'Professor or senior researcher', zh: '教授或资深研究员', tw: '教授或資深研究員' },
            { val: 'exec',          en: 'Executive / manager transferred from abroad', zh: '海外高管/经理调来美国', tw: '海外高管/經理調來美國' },
            { val: 'phd-master',    en: 'PhD or Master\'s, want job flexibility', zh: '博士/硕士,想要工作灵活性', tw: '博士/碩士,想要工作靈活性' },
            { val: 'employed',      en: 'Master\'s/Bachelor\'s with employer willing to sponsor', zh: '硕士/本科,有雇主愿担保', tw: '碩士/本科,有雇主願擔保' },
            { val: 'unskilled',     en: 'Technical or unskilled worker', zh: '技术工或无技能工', tw: '技術工或無技能工' },
            { val: 'student',       en: 'Currently an F1 student', zh: '目前是 F1 留学生', tw: '目前是 F1 留學生' },
          ]
        },
        invest: {
          en: { q: 'How much can you invest?', help: '' },
          zh: { q: '你能投资多少?', help: '' },
          tw: { q: '你能投資多少?', help: '' },
          options: [
            { val: 'eb5-rc',     en: '$800K in a pre-approved project', zh: '$800K 投已批项目', tw: '$800K 投已批項目' },
            { val: 'eb5-direct', en: '$1.05M, run my own business', zh: '$1.05M 自己经营', tw: '$1.05M 自己經營' },
          ]
        },
        other: {
          en: { q: 'Which applies?', help: '' },
          zh: { q: '哪一项适用?', help: '' },
          tw: { q: '哪一項適用?', help: '' },
          options: [
            { val: 'dv',     en: 'I want to try the DV lottery', zh: '我想试 DV 抽签', tw: '我想試 DV 抽籤' },
            { val: 'asylum', en: 'I fear persecution in my home country', zh: '我在本国面临迫害', tw: '我在本國面臨迫害' },
            { val: 'vawa',   en: 'I\'ve been abused by USC/LPR family', zh: '被公民/绿卡家属虐待', tw: '被公民/綠卡家屬虐待' },
            { val: 'uvisa',  en: 'I\'m a crime victim helping police', zh: '犯罪受害者协助执法', tw: '犯罪受害者協助執法' },
          ]
        },
      }
    },
    {
      id: 'q3',
      dependsOn: 'q2',
      condition: (ans) => ans.q1 === 'family',
      branches: {
        usc: {
          en: { q: 'What\'s the relationship?', help: '' },
          zh: { q: '关系是?', help: '' },
          tw: { q: '關係是?', help: '' },
          options: [
            { val: 'spouse',      en: 'Spouse', zh: '配偶', tw: '配偶' },
            { val: 'parent',      en: 'Parent', zh: '父母', tw: '父母' },
            { val: 'minor-child', en: 'Unmarried child under 21', zh: '未成年未婚子女 (<21)', tw: '未成年未婚子女 (<21)' },
            { val: 'adult-unm',   en: 'Unmarried adult child (≥21)', zh: '成年未婚子女 (≥21)', tw: '成年未婚子女 (≥21)' },
            { val: 'married',     en: 'Married child (any age)', zh: '已婚子女', tw: '已婚子女' },
            { val: 'sibling',     en: 'Sibling', zh: '兄弟姐妹', tw: '兄弟姐妹' },
          ]
        },
        lpr: {
          en: { q: 'What\'s the relationship?', help: 'LPR cannot petition married children, parents, or siblings.' },
          zh: { q: '关系是?', help: '绿卡持有人不能申请已婚子女、父母或兄弟姐妹。' },
          tw: { q: '關係是?', help: '綠卡持有人不能申請已婚子女、父母或兄弟姐妹。' },
          options: [
            { val: 'spouse',      en: 'Spouse', zh: '配偶', tw: '配偶' },
            { val: 'minor-child', en: 'Unmarried child under 21', zh: '未成年未婚子女 (<21)', tw: '未成年未婚子女 (<21)' },
            { val: 'adult-unm',   en: 'Unmarried adult child (≥21)', zh: '成年未婚子女 (≥21)', tw: '成年未婚子女 (≥21)' },
            { val: 'blocked',     en: 'Married child, parent, or sibling', zh: '已婚子女、父母或兄弟姐妹', tw: '已婚子女、父母或兄弟姐妹' },
          ]
        }
      }
    },
    {
      id: 'q4',
      dependsOn: 'q3',
      condition: (ans) => ans.q1 === 'family' && ans.q2 === 'usc' && ['spouse','parent','minor-child'].includes(ans.q3),
      en: { q: 'Where is your relative now?', help: '' },
      zh: { q: '你的亲属现在在哪里?', help: '' },
      tw: { q: '你的親屬現在在哪裡?', help: '' },
      options: [
        { val: 'inside-valid', en: 'In US, with legal status (F1/H1B/B2/etc.)', zh: '在美国,有合法身份', tw: '在美國,有合法身份' },
        { val: 'inside-no',    en: 'In US, no legal status', zh: '在美国,无合法身份', tw: '在美國,無合法身份' },
        { val: 'outside',      en: 'Outside the US', zh: '美国境外', tw: '美國境外' },
      ]
    },
  ];

  const resolveResult = (ans) => {
    if (ans.q1 === 'family') {
      if (ans.q2 === 'usc') {
        if (ans.q3 === 'spouse') {
          if (ans.q4 === 'inside-valid') return 'fam-usc-spouse-inside-valid';
          if (ans.q4 === 'inside-no') return 'fam-usc-spouse-inside-nostatus';
          if (ans.q4 === 'outside') return 'fam-usc-spouse-outside';
        }
        if (ans.q3 === 'parent') {
          if (ans.q4 === 'outside') return 'fam-usc-parent-outside';
          return 'fam-usc-parent-inside';
        }
        if (ans.q3 === 'minor-child') return 'fam-usc-minor-child';
        if (ans.q3 === 'adult-unm')   return 'fam-usc-adult-unmarried';
        if (ans.q3 === 'married')     return 'fam-usc-married-child';
        if (ans.q3 === 'sibling')     return 'fam-usc-sibling';
      }
      if (ans.q2 === 'lpr') {
        if (ans.q3 === 'spouse')      return 'fam-lpr-spouse';
        if (ans.q3 === 'minor-child') return 'fam-lpr-minor';
        if (ans.q3 === 'adult-unm')   return 'fam-lpr-adult';
        if (ans.q3 === 'blocked')     return 'fam-lpr-cannot';
      }
    }
    if (ans.q1 === 'work') {
      if (ans.q2 === 'extraordinary') return 'emp-eb1a';
      if (ans.q2 === 'professor')     return 'emp-eb1b';
      if (ans.q2 === 'exec')          return 'emp-eb1c';
      if (ans.q2 === 'phd-master')    return 'emp-eb2-niw';
      if (ans.q2 === 'employed')      return 'emp-eb2-standard';
      if (ans.q2 === 'unskilled')     return 'emp-eb3-other';
      if (ans.q2 === 'student')       return 'stu-master-h1b-eb2';
    }
    if (ans.q1 === 'invest') {
      if (ans.q2 === 'eb5-rc')     return 'emp-eb5-rc';
      if (ans.q2 === 'eb5-direct') return 'emp-eb5-direct';
    }
    if (ans.q1 === 'other') {
      if (ans.q2 === 'dv')     return 'sp-dv';
      if (ans.q2 === 'asylum') return 'sp-asylum';
      if (ans.q2 === 'vawa')   return 'sp-vawa';
      if (ans.q2 === 'uvisa')  return 'sp-u-visa';
    }
    return null;
  };

  const getActiveStep = () => {
    const applicable = quizSteps.filter(s => !s.condition || s.condition(answers));
    return applicable[step];
  };

  const resultId = resolveResult(answers);
  const resultPath = resultId ? PATHWAYS.find(p => p.id === resultId) : null;
  const activeStep = getActiveStep();

  const getCurrentQuestion = () => {
    if (!activeStep) return null;
    // If this step has a gating condition and it's not met, skip the step entirely
    // (returning null — quizDone logic will treat this as "move on to result").
    if (activeStep.condition && !activeStep.condition(answers)) return null;
    // Branching question: look up the right branch based on the parent's answer.
    if (activeStep.branches) {
      const parentAns = answers[activeStep.dependsOn];
      if (!parentAns || !activeStep.branches[parentAns]) return null;
      return activeStep.branches[parentAns];
    }
    // Flat question — no branches. May still have dependsOn for positioning
    // and a condition above for gating. Return the step itself.
    return activeStep;
  };

  const currentQ = getCurrentQuestion();

  const handleAnswer = (val) => {
    setAnswers({ ...answers, [activeStep.id]: val });
    setStep(step + 1);
  };

  const handleReset = () => {
    setAnswers({});
    setStep(0);
  };

  const handleBack = () => {
    if (step > 0) {
      const newAnswers = { ...answers };
      delete newAnswers[activeStep?.id || `q${step + 1}`];
      setAnswers(newAnswers);
      setStep(step - 1);
    }
  };

  const quizDone = step >= quizSteps.length || (resultId && !currentQ);

  return (
    <div style={{ padding: '0 12px 20px' }}>
      {/* Top row: back button (left) + "fill in my case" CTA (right) */}
      {(() => {
        const hasBack = previousTab && previousTab !== 'index' && setTab;
        const hasSetup = !!onSetupCase;
        if (!hasBack && !hasSetup) return null;
        const tabNames = {
          en: { overview: 'Overview', trends: 'Forecast', update: 'Monthly Update', i485: 'I-485', compare: 'Compare', alerts: 'Alerts', help: 'Help' },
          zh: { overview: '总结',     trends: '预测',     update: '本月更新',     i485: 'I-485流程', compare: '对比', alerts: '提醒', help: '帮助中心' },
          tw: { overview: '總結',     trends: '預測',     update: '本月更新',     i485: 'I-485流程', compare: '對比', alerts: '提醒', help: '幫助中心' },
        };
        const backLabel = hasBack
          ? ((tabNames[lang] || tabNames.en)[previousTab] || (tabNames[lang] || tabNames.en).overview)
          : null;
        return (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            paddingTop: '6px',
            marginBottom: '-2px',
          }}>
            {/* Left: back button or placeholder */}
            {hasBack ? (
              <button
                onClick={() => setTab(previousTab)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '6px 0',
                  background: 'transparent',
                  border: 'none',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--gc-muted)',
                  cursor: 'pointer',
                  letterSpacing: '0.02em',
                  transition: 'color 120ms',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--gc-ink)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--gc-muted)'; }}
              >
                ← {lang === 'en' ? `Back to ${backLabel}` : `返回${backLabel}`}
              </button>
            ) : <span />}

            {/* Right: "I know my category — set up my case" CTA */}
            {hasSetup && (
              <button
                onClick={() => onSetupCase()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '6px 10px',
                  background: 'var(--gc-green-soft)',
                  border: '1px solid var(--gc-green-border)',
                  borderRadius: '3px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--gc-green-ink)',
                  cursor: 'pointer',
                  letterSpacing: '0.01em',
                  transition: 'all 120ms',
                  flexShrink: 0,
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--gc-green)'; e.currentTarget.style.color = 'var(--gc-paper)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--gc-green-soft)'; e.currentTarget.style.color = 'var(--gc-green-ink)'; }}
              >
                <FileText size={11} strokeWidth={2.2} />
                <span>
                  {lang === 'en' ? 'I know my case →' : lang === 'tw' ? '填寫我的案件 →' : '填写我的案件 →'}
                </span>
              </button>
            )}
          </div>
        );
      })()}

      <div style={{ padding: '14px 0 10px', borderBottom: '1px solid var(--gc-rule)' }}>
        <div className="gc-eyebrow" style={{ color: 'var(--gc-green)' }}>
          {lang === 'en' ? 'THE PATH' : lang === 'tw' ? '身份路徑' : '身份路径'}
        </div>
        <h2 className="gc-serif" style={{ fontSize: '20px', fontWeight: 700, color: 'var(--gc-ink)', margin: '2px 0 4px', letterSpacing: '-0.01em' }}>
          {lang === 'en' ? 'Find Your Pathway' : lang === 'tw' ? '找到你的路徑' : '找到你的路径'}
        </h2>
        <p style={{ fontSize: '12px', color: 'var(--gc-muted)', margin: 0 }}>
          {lang === 'en' 
            ? `Answer a few questions, or browse all ${PATHWAYS.length} documented paths to US permanent residence.` 
            : lang === 'tw' 
              ? `回答幾個問題,或瀏覽全部 ${PATHWAYS.length} 條已整理的美國綠卡路徑。`
              : `回答几个问题,或浏览全部 ${PATHWAYS.length} 条已整理的美国绿卡路径。`}
        </p>
      </div>

      <div style={{ display: 'flex', gap: '6px', margin: '12px 0', border: '1px solid var(--gc-rule)', borderRadius: '3px', overflow: 'hidden' }}>
        {[
          { id: 'quiz',   en: 'Quick Check', zh: '快速判断', tw: '快速判斷' },
          { id: 'browse', en: 'Browse All',  zh: '浏览全部', tw: '瀏覽全部' },
        ].map((m, i) => (
          <button key={m.id}
            onClick={() => { setMode(m.id); if (m.id === 'quiz') handleReset(); }}
            style={{
              flex: 1, padding: '9px 12px', fontSize: '12px', fontWeight: 600,
              background: mode === m.id ? 'var(--gc-green)' : 'var(--gc-surface)',
              color: mode === m.id ? 'var(--gc-paper)' : 'var(--gc-muted)',
              borderLeft: i > 0 ? '1px solid var(--gc-rule)' : 'none',
              transition: 'all 120ms',
            }}>
            {m[lang] || m.en}
          </button>
        ))}
      </div>

      {mode === 'quiz' && (
        <div>
          {!quizDone && currentQ && (
            <div style={{ background: 'var(--gc-surface)', border: '1px solid var(--gc-rule)', borderRadius: 'var(--gc-radius)', padding: '16px', borderTop: '2px solid var(--gc-green)' }}>
              <div className="gc-eyebrow" style={{ color: 'var(--gc-muted)', marginBottom: '6px', fontSize: '11px' }}>
                {lang === 'en' ? `Question ${step + 1}` : `第 ${step + 1} 题`}
              </div>
              <div className="gc-serif" style={{ fontSize: '17px', fontWeight: 700, color: 'var(--gc-ink)', lineHeight: 1.3, marginBottom: '4px', letterSpacing: '-0.005em' }}>
                {currentQ[lang]?.q || currentQ.en.q}
              </div>
              {(currentQ[lang]?.help || currentQ.en.help) && (
                <div style={{ fontSize: '11px', color: 'var(--gc-muted)', marginBottom: '12px', lineHeight: 1.4 }}>
                  {currentQ[lang]?.help || currentQ.en.help}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                {currentQ.options.map(opt => (
                  <button key={opt.val}
                    onClick={() => handleAnswer(opt.val)}
                    style={{
                      textAlign: 'left', padding: '11px 14px', fontSize: '13px', fontWeight: 500,
                      background: 'var(--gc-paper-soft)', color: 'var(--gc-ink)',
                      border: '1px solid var(--gc-rule)', borderRadius: 'var(--gc-radius-sm)',
                      transition: 'all 120ms', cursor: 'pointer',
                    }}>
                    {opt[lang] || opt.en}
                  </button>
                ))}
              </div>
              {step > 0 && (
                <button onClick={handleBack}
                  style={{ marginTop: '10px', padding: '6px 10px', fontSize: '11px', color: 'var(--gc-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
                  ← {lang === 'en' ? 'Back' : '返回'}
                </button>
              )}
            </div>
          )}

          {quizDone && resultPath && (() => {
            const info = resultPath[lang] || resultPath.en;
            const wl = waitLabel(resultPath.waitStatus);
            return (
              <div>
                <div style={{ background: 'var(--gc-surface)', border: '1px solid var(--gc-rule)', borderTop: '2px solid var(--gc-green)', borderRadius: 'var(--gc-radius)', padding: '16px' }}>
                  <div className="gc-eyebrow" style={{ color: 'var(--gc-green)', marginBottom: '4px' }}>
                    {lang === 'en' ? 'YOUR MATCH' : '你的匹配'}
                  </div>
                  <div className="gc-serif" style={{ fontSize: '22px', fontWeight: 700, color: 'var(--gc-ink)', lineHeight: 1.2, letterSpacing: '-0.01em', marginBottom: '4px' }}>
                    {resultPath.category}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--gc-ink-soft)', marginBottom: '10px' }}>
                    {info.name}
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--gc-ink)', lineHeight: 1.5, marginBottom: '10px' }}>
                    {info.summary}
                  </div>
                  {info.explanation && (
                    <div style={{
                      padding: '10px 12px',
                      background: 'var(--gc-paper-soft)',
                      border: '1px solid var(--gc-rule-soft)',
                      borderLeft: '2px solid var(--gc-green)',
                      borderRadius: '3px',
                      marginBottom: '12px',
                    }}>
                      <div className="gc-eyebrow" style={{
                        color: 'var(--gc-green-ink)',
                        marginBottom: '5px',
                        fontSize: '11px',
                      }}>
                        {lang === 'en' ? 'WHY THIS PATH' : lang === 'tw' ? '為什麼是這條路徑' : '为什么是这条路径'}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: 'var(--gc-ink-soft)',
                        lineHeight: 1.6,
                      }}>
                        {info.explanation}
                      </div>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '12px', fontSize: '11px', marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid var(--gc-rule-soft)', flexWrap: 'wrap' }}>
                    <div>
                      <div className="gc-eyebrow" style={{ fontSize: '11px' }}>{lang === 'en' ? 'WAIT' : '排期'}</div>
                      <div style={{ color: wl.color, fontWeight: 700 }}>{wl[lang]}</div>
                    </div>
                    <div>
                      <div className="gc-eyebrow" style={{ fontSize: '11px' }}>{lang === 'en' ? 'TIMELINE' : '时间线'}</div>
                      <div className="gc-mono" style={{ color: 'var(--gc-ink)', fontWeight: 600 }}>{info.timeline}</div>
                    </div>
                  </div>
                  <div className="gc-eyebrow" style={{ color: 'var(--gc-muted)', marginBottom: '6px', fontSize: '11px' }}>
                    {lang === 'en' ? 'STEPS' : '步骤'}
                  </div>
                  <ol style={{ paddingLeft: '18px', fontSize: '12px', color: 'var(--gc-ink-soft)', lineHeight: 1.6, margin: '0 0 12px' }}>
                    {info.steps.map((s, i) => <li key={i} style={{ marginBottom: '3px' }}>{s}</li>)}
                  </ol>
                  <div style={{ padding: '8px 10px', background: 'var(--gc-amber-soft)', border: '1px solid var(--gc-amber-border)', borderRadius: 'var(--gc-radius-sm)', fontSize: '11px', color: 'var(--gc-amber-ink)', lineHeight: 1.5 }}>
                    <b>{lang === 'en' ? 'Note: ' : '注意:'}</b>{info.caveat}
                  </div>
                  {resultPath.goesTo && (onCategoryPicked || (setUserCase && setTab)) && (
                    <button
                      onClick={() => {
                        if (onCategoryPicked) { onCategoryPicked(resultPath.goesTo); return; }
                        setUserCase({ ...userCase, category: resultPath.goesTo });
                        setTab('trends');
                      }}
                      style={{
                        marginTop: '12px', width: '100%', padding: '11px',
                        fontSize: '12px', fontWeight: 700,
                        background: 'var(--gc-green)', color: 'var(--gc-paper)',
                        border: 'none', borderRadius: 'var(--gc-radius-sm)',
                        cursor: 'pointer', letterSpacing: '0.02em',
                      }}>
                      {onCategoryPicked
                        ? (lang === 'en' ? `Use ${resultPath.goesTo} — set up my case →` : `用 ${resultPath.goesTo} 填写我的案件 →`)
                        : (lang === 'en' ? `See ${resultPath.goesTo} wait times →` : `查看 ${resultPath.goesTo} 排期 →`)}
                    </button>
                  )}
                </div>
                <button onClick={handleReset}
                  style={{
                    marginTop: '10px', padding: '8px 14px', fontSize: '12px', fontWeight: 600,
                    color: 'var(--gc-ink)', background: 'var(--gc-paper-soft)',
                    border: '1px solid var(--gc-rule)', borderRadius: 'var(--gc-radius-sm)',
                    cursor: 'pointer',
                  }}>
                  ↻ {lang === 'en' ? 'Start Over' : '重新开始'}
                </button>
                <div style={{ marginTop: '14px', padding: '10px 12px', fontSize: '11px', color: 'var(--gc-muted)', background: 'var(--gc-paper-soft)', border: '1px solid var(--gc-rule-soft)', borderRadius: 'var(--gc-radius-sm)', lineHeight: 1.5 }}>
                  {lang === 'en' 
                    ? 'This tool provides general guidance only. It is not legal advice. Always consult a licensed immigration attorney for your specific case.'
                    : lang === 'tw'
                      ? '本工具僅提供一般性指引,非法律建議。具體案件請務必諮詢合格的移民律師。'
                      : '本工具仅提供一般性指引,非法律建议。具体案件请务必咨询合格的移民律师。'}
                </div>
              </div>
            );
          })()}

          {quizDone && !resultPath && (
            <div style={{ padding: '20px', textAlign: 'center', fontSize: '13px', color: 'var(--gc-muted)' }}>
              {lang === 'en' ? 'No match found. Please consult a lawyer.' : '未找到匹配,请咨询律师。'}
              <div style={{ marginTop: '10px' }}>
                <button onClick={handleReset}
                  style={{ padding: '8px 14px', fontSize: '12px', border: '1px solid var(--gc-rule)', borderRadius: '3px', background: 'var(--gc-surface)', cursor: 'pointer' }}>
                  ↻ {lang === 'en' ? 'Start Over' : '重新开始'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {mode === 'browse' && (
        <div>
          <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', padding: '2px 0 10px', marginBottom: '8px', borderBottom: '1px solid var(--gc-rule-soft)' }}>
            {[{ id: 'all', en: 'All', zh: '全部', tw: '全部' }, ...Object.entries(PATHWAY_GROUPS).map(([id, g]) => ({ id, ...g }))].map(g => (
              <button key={g.id}
                onClick={() => setFilterGroup(g.id)}
                style={{
                  padding: '6px 10px', fontSize: '11px',
                  fontWeight: filterGroup === g.id ? 700 : 500,
                  color: filterGroup === g.id ? 'var(--gc-paper)' : 'var(--gc-muted)',
                  background: filterGroup === g.id ? 'var(--gc-green)' : 'transparent',
                  border: filterGroup === g.id ? 'none' : '1px solid var(--gc-rule)',
                  borderRadius: 'var(--gc-radius-sm)', whiteSpace: 'nowrap', cursor: 'pointer',
                }}>
                {g[lang] || g.en}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {pathways.map((p) => {
              const info = p[lang] || p.en;
              const wl = waitLabel(p.waitStatus);
              const isExpanded = expandedId === p.id;
              return (
                <div key={p.id}
                  style={{
                    background: 'var(--gc-surface)', border: '1px solid var(--gc-rule)',
                    borderRadius: 'var(--gc-radius-sm)', overflow: 'hidden',
                  }}>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : p.id)}
                    style={{
                      width: '100%', textAlign: 'left', padding: '10px 12px',
                      display: 'flex', alignItems: 'flex-start', gap: '10px',
                      background: 'transparent', border: 'none', cursor: 'pointer',
                    }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="gc-mono" style={{ fontSize: '11px', color: 'var(--gc-muted)', fontWeight: 700, letterSpacing: '0.08em' }}>
                        {p.category}
                      </div>
                      <div className="gc-serif" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--gc-ink)', lineHeight: 1.3, marginTop: '2px' }}>
                        {info.name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--gc-muted)', marginTop: '3px', lineHeight: 1.4 }}>
                        {info.summary}
                      </div>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: wl.color, whiteSpace: 'nowrap', marginTop: '2px' }}>
                      {wl[lang]}
                    </span>
                  </button>
                  {isExpanded && (
                    <div style={{ padding: '0 12px 12px', borderTop: '1px solid var(--gc-rule-soft)', paddingTop: '10px' }}>
                      {info.explanation && (
                        <div style={{
                          padding: '9px 10px',
                          background: 'var(--gc-paper-soft)',
                          border: '1px solid var(--gc-rule-soft)',
                          borderLeft: '2px solid var(--gc-green)',
                          borderRadius: '3px',
                          marginBottom: '10px',
                        }}>
                          <div className="gc-eyebrow" style={{
                            color: 'var(--gc-green-ink)',
                            marginBottom: '4px',
                            fontSize: '11px',
                          }}>
                            {lang === 'en' ? 'WHY THIS PATH' : lang === 'tw' ? '為什麼是這條路徑' : '为什么是这条路径'}
                          </div>
                          <div style={{
                            fontSize: '11.5px',
                            color: 'var(--gc-ink-soft)',
                            lineHeight: 1.55,
                          }}>
                            {info.explanation}
                          </div>
                        </div>
                      )}
                      <div className="gc-eyebrow" style={{ fontSize: '11px', color: 'var(--gc-muted)', marginBottom: '4px' }}>
                        {lang === 'en' ? 'TIMELINE' : '时间线'}
                      </div>
                      <div className="gc-mono" style={{ fontSize: '11px', color: 'var(--gc-ink)', marginBottom: '8px' }}>{info.timeline}</div>
                      <div className="gc-eyebrow" style={{ fontSize: '11px', color: 'var(--gc-muted)', marginBottom: '4px' }}>
                        {lang === 'en' ? 'STEPS' : '步骤'}
                      </div>
                      <ol style={{ paddingLeft: '16px', fontSize: '11px', color: 'var(--gc-ink-soft)', lineHeight: 1.55, margin: '0 0 8px' }}>
                        {info.steps.map((s, i) => <li key={i} style={{ marginBottom: '2px' }}>{s}</li>)}
                      </ol>
                      <div style={{ padding: '7px 9px', background: 'var(--gc-amber-soft)', border: '1px solid var(--gc-amber-border)', borderRadius: 'var(--gc-radius-sm)', fontSize: '11px', color: 'var(--gc-amber-ink)', lineHeight: 1.5 }}>
                        <b>{lang === 'en' ? 'Note: ' : '注意:'}</b>{info.caveat}
                      </div>
                      {p.goesTo && (onCategoryPicked || (setUserCase && setTab)) && (
                        <button
                          onClick={() => {
                            if (onCategoryPicked) { onCategoryPicked(p.goesTo); return; }
                            setUserCase({ ...userCase, category: p.goesTo });
                            setTab('trends');
                          }}
                          style={{
                            marginTop: '10px', width: '100%', padding: '8px',
                            fontSize: '11px', fontWeight: 700,
                            background: 'var(--gc-green)', color: 'var(--gc-paper)',
                            border: 'none', borderRadius: 'var(--gc-radius-sm)',
                            cursor: 'pointer', letterSpacing: '0.02em',
                          }}>
                          {onCategoryPicked
                            ? (lang === 'en' ? `Use ${p.goesTo} — set up my case →` : `用 ${p.goesTo} 填写我的案件 →`)
                            : (lang === 'en' ? `See ${p.goesTo} wait times →` : `查看 ${p.goesTo} 排期 →`)}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: '14px', padding: '10px 12px', fontSize: '11px', color: 'var(--gc-muted)', background: 'var(--gc-paper-soft)', border: '1px solid var(--gc-rule-soft)', borderRadius: 'var(--gc-radius-sm)', lineHeight: 1.5 }}>
            {lang === 'en' 
              ? 'This tool provides general guidance only. It is not legal advice. Always consult a licensed immigration attorney for your specific case.'
              : lang === 'tw'
                ? '本工具僅提供一般性指引,非法律建議。具體案件請務必諮詢合格的移民律師。'
                : '本工具仅提供一般性指引,非法律建议。具体案件请务必咨询合格的移民律师。'}
          </div>
        </div>
      )}
    </div>
  );
};


export default TheIndex;
