import React, { useState, useMemo, useCallback, memo, createContext, useContext, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Globe, Calendar, MapPin, Briefcase, Home, TrendingUp, TrendingDown, Minus, AlertCircle, AlertTriangle, CheckCircle2, Clock, Info, FileText, Zap, Shield, Users, Target, Database, RefreshCw, ExternalLink, Sparkles, Eye, Bell, BarChart3, Mail, Download, History, HelpCircle, DollarSign, Scale, Plane, Activity, Ruler, Dot, ClipboardList, Share2, Lock } from 'lucide-react';
// Shared with the Cloudflare Pages Functions email pipeline (functions/api/admin/send-monthly.js)
// so the site and the monthly emails can't silently diverge — see _gcMath.js's own header
// comment for what still can't be shared (parseDate's 'U' handling differs on purpose;
// nothing in this file calls it with 'U' as an argument, but keep that in mind before adding one).
import {
  FILING_AUTHORIZED,
  resolveCountry,
  RATES_DB,
  getRates,
  getLongTermRate,
  computeStatus,
  computeMovement,
  computeHybridAdvance,
  estimateMonthsToReachPD,
} from '../functions/api/_gcMath.js';

// Native app build (Capacitor iOS) points relative API/data paths at production,
// since the bundled webview has no local Pages Functions runtime of its own.
// Web build (Cloudflare Pages) leaves this empty so paths stay relative, unchanged.
const API_BASE = import.meta.env.VITE_API_BASE || '';

// 众包案件进度墙（挂在「动态」tab 内；草稿：数据还是 mock，见 TRACKER-PLAN.md）
import TrackerPage from './Tracker.jsx';

// ============================================================
// i18n — Translation dictionaries (EN / Simplified / Traditional)
// ============================================================
const translations = {
  en: {
    appTitle: 'Green Card Tracker',
    appSubtitle: 'Know where you stand. Know what to do next.',
    bulletinMonth: 'Bulletin',
    navUpdate: 'Updates',
    navCompare: 'Community',
    compareByCountry: 'By Country',
    compareByCountryDesc: 'See how the same case fares in different countries.',
    navFAQ: 'FAQ',
    navData: 'Data Source',
    navGlossary: 'Glossary',
    navIndex: 'Index',
    inputTitle: 'Your Case',
    inputSubtitle: 'Enter your details to see personalized analysis',
    countryLabel: 'Country or Region of Birth',
    countryChina: 'China (Mainland)',
    countryTaiwan: 'ROW / Hong Kong, Taiwan & Macao',
    countryIndia: 'India',
    countryMexico: 'Mexico',
    countryPhilippines: 'Philippines',
    categoryLabel: 'Category',
    petitionerLabel: 'Petitioner (F only)',
    petitionerUSC: 'US Citizen',
    petitionerLPR: 'Green Card Holder',
    petitionerHelp: 'Who filed the I-130? USC files F1/F3/F4; LPR files F2A/F2B.',
    petitionerMismatch: 'Category-petitioner mismatch',
    petitionerMismatchUSC: 'F2A/F2B require LPR petitioner. Did your LPR sponsor naturalize? F2B → F1 (auto-convert).',
    petitionerMismatchLPR: 'F1/F3/F4 require US citizen petitioner. LPRs cannot file these categories.',
    petitionerInfo: 'If petitioner naturalized: F2A → IR (no wait), F2B → F1 (opt-out possible).',
    f2bStrategyTitle: 'Strategic consideration',
    f2bStrategyMsg: 'If your LPR sponsor naturalizes, F2B will auto-convert to F1. Compare current F1 vs F2B wait times — F2B is often faster. You have the right to opt-out under INA 204(k) to stay in F2B.',
    f2aStrategyMsg: 'If your LPR sponsor naturalizes BEFORE you turn 21, you upgrade to Immediate Relative (no backlog wait). If after 21, you become F1.',
    f1StrategyMsg: 'Your US citizen petitioner ensures F1 status. If beneficiary marries, converts to F3 (longer wait). If beneficiary divorces, can convert back to F1.',
    f3StrategyMsg: 'If the married beneficiary divorces, the petition converts back to F1 (typically faster).',
    f4StrategyMsg: 'F4 requires US citizen petitioner who is 21+. F4 wait times are among the longest. No upgrades available.',
    priorityDateLabel: 'Priority Date',
    locationLabel: 'Currently in the US?',
    locationYes: 'Yes, I am in the US',
    locationNo: 'No, I am abroad',
    statusNotCurrent: 'Not Current',
    statusEligibleFile: 'Eligible to File',
    statusCurrent: 'Current',
    statusNotCurrentDesc: 'Your priority date has not yet been reached.',
    statusEligibleFileDesc: 'You may submit your I-485 adjustment of status application.',
    statusCurrentDesc: 'You are current. Final action can be taken on your case.',
    dashTitle: 'Your Personal Status',
    chartFinalAction: 'Final Action Date',
    chartFiling: 'Dates for Filing',
    distance: 'Distance',
    daysAway: 'days away',
    daysAhead: 'days past cutoff',
    alreadyCurrent: 'Already current',
    monthlyMovement: 'Monthly Movement',
    days: 'days',
    months: 'months',
    progressPD: 'Your PD',
    progressCutoff: 'Cutoff',
    progressToday: 'Today',
    updateTitle: "This Month's Update",
    updateSubtitle: 'What changed from last month',
    overallSummary: 'May 2026 brings a slowdown after April\'s dramatic advances. Most employment categories are frozen at April\'s dates. USCIS switched back to Final Action Dates for EB filings (stricter), while family categories continue to use Dates for Filing. The State Department warns EB-5 India may retrogress if demand surges.',
    categoryChanges: 'Category Changes',
    yourImpact: 'Impact on You',
    impactAdvanced: 'Good news — your category advanced this month.',
    impactNoChange: 'No change for your category this month.',
    impactRetrogressed: 'Caution — your category retrogressed this month.',
    impactBecameCurrent: 'You just became current!',
    actionTitle: 'Recommended Next Steps',
    actionMonitor: 'Monitor updates monthly',
    actionMonitorDesc: 'You are still far from current. No action needed right now. Check back next month.',
    actionPrepare: 'Start preparing your documents',
    actionPrepareDesc: 'You are getting close. Gather medical exam, tax returns, I-94, and photos so you are ready when filing opens.',
    actionFile: 'You may file this month',
    actionFileDesc: 'Submit your I-485 package now. Consider filing before any potential retrogression in the next bulletin.',
    actionFileSoon: 'File as soon as possible',
    actionFileSoonDesc: 'Movement has been volatile. If eligible, file before the window narrows or retrogresses.',
    actionCurrent: 'Your case can be finalized',
    actionCurrentDesc: 'Final action can be taken on your I-485. Follow up with your attorney or USCIS.',
    overviewSubtitle: 'Your current situation at a glance',
    chartTableA: 'Final Action Dates (Table A)',
    chartTableB: 'Dates for Filing (Table B)',
    chartActive: 'USCIS is using this table',
    chartInactive: 'Reference only',
    yourCategory: 'Your Category',
    yourPD: 'Your Priority Date',
    yourBirthCountry: 'Your Birth Country',
    statusTableA: 'Table A Status',
    statusTableB: 'Table B Status',
    nextAction: 'Recommended Next Action',
    whichChart: 'Which table should I use?',
    whichChartDesc: 'USCIS announces monthly which table to use for I-485 filing. For May 2026: Employment categories use Table A, Family categories use Table B.',
    compareSubtitle: 'See why country of birth matters for the same category and priority date',
    compareCategory: 'Category',
    comparePD: 'Priority Date',
    chinaBorn: 'China-born',
    taiwanBorn: 'Taiwan-born',
    compareExplainTitle: 'Why the difference?',
    compareExplain: 'Each country is capped at 7% of annual visas. Because China has high demand, its line is much longer. Taiwan-born applicants are charged to the general "All Others" pool, which moves much faster.',
    glossaryTitle: 'Key Terms',
    termFAD: 'Final Action Date',
    termFADDesc: 'The date USCIS or the consulate can approve your green card. Your priority date must be earlier than this date for approval.',
    termDFF: 'Dates for Filing',
    termDFFDesc: 'An earlier date that may allow you to submit I-485 before approval is possible. Used only when USCIS authorizes it each month.',
    termPD: 'Priority Date',
    termPDDesc: 'Your place in line. Usually the date your I-140 or labor certification was filed.',
    termCurrent: 'Current',
    termCurrentDesc: 'No backlog exists for your category. Anyone eligible can file or be approved immediately.',
    termRetrogression: 'Retrogression',
    termRetrogressionDesc: 'When the cutoff date moves backward instead of forward. Happens when demand exceeds supply.',
    termUSCIS: 'USCIS',
    termUSCISDesc: 'US Citizenship and Immigration Services. The federal agency that processes green card and other immigration applications.',
    termVisaBulletin: 'Visa Bulletin',
    termVisaBulletinDesc: 'Monthly report by the US State Department showing cutoff dates for each category and country. Determines who can file or be approved.',
    termI140: 'I-140 Petition',
    termI140Desc: 'Employer-sponsored immigrant petition for employment-based green cards. Must be approved before (or concurrent with) I-485.',
    termI485: 'I-485 Application',
    termI485Desc: 'Application to adjust status to permanent resident while in the US. Filed once your priority date is current (or filing date is available).',
    termPERM: 'PERM / Labor Cert',
    termPERMDesc: 'Department of Labor certification proving no qualified US worker is available for the job. Required for most EB-2/EB-3 cases before filing I-140.',
    termEAD: 'EAD (Work Permit)',
    termEADDesc: 'Employment Authorization Document. Allows you to work legally while I-485 is pending. Typically valid 2-5 years, renewable.',
    termAP: 'Advance Parole',
    termAPDesc: 'Travel document letting you re-enter the US while I-485 is pending without abandoning your application. Costs ~$630 (no longer free as of 2024).',
    termAOS: 'AOS (Adjustment of Status)',
    termAOSDesc: 'Getting your green card while inside the US by filing I-485. Faster than consular processing but requires you to stay in the US during processing.',
    termCP: 'Consular Processing',
    termCPDesc: 'Getting your immigrant visa at a US consulate abroad, then entering the US as a permanent resident. Alternative to AOS if outside the US.',
    termCrossCharge: 'Cross-Chargeability',
    termCrossChargeDesc: "Rule letting you use your spouse's country of birth for priority date purposes. Can dramatically reduce wait times if spouse is from a non-backlogged country.",
    termPerCountryCap: 'Per-Country Cap',
    termPerCountryCapDesc: 'Each country receives at most 7% of annual employment-based and family-preference visas. Causes long waits for China/India/Mexico/Philippines.',
    termDerivative: 'Derivative Beneficiary',
    termDerivativeDesc: 'Spouse or unmarried child under 21 of the principal applicant. They get green cards alongside the main applicant under the same priority date.',
    termNIW: 'NIW (National Interest Waiver)',
    termNIWDesc: 'EB-2 subcategory that waives the job offer and PERM requirements. Self-petition possible if your work is in the national interest.',
    termPremium: 'Premium Processing',
    termPremiumDesc: 'Optional expedited service for I-140 (and some others). $2,805 for 15-business-day decision. Does NOT speed up priority date waits.',
    termRFE: 'RFE (Request for Evidence)',
    termRFEDesc: 'USCIS letter asking for additional documentation before making a decision. Common and usually not fatal — respond thoroughly and on time.',
    eb1: 'EB-1 Priority Workers',
    eb2: 'EB-2 Advanced Degree',
    eb3: 'EB-3 Skilled Worker',
    ew: 'EB-3 Other Workers',
    eb4: 'EB-4 Special Immigrants (incl. SIJ)',
    sr: 'EB-4 Religious Workers (SR)',
    eb5: 'EB-5 Investors (Unreserved / traditional)',
    eb5r: 'EB-5 Rural Set-Aside (20%)',
    eb5h: 'EB-5 High Unemployment (10%)',
    eb5i: 'EB-5 Infrastructure (2%)',
    f1: 'F1 Unmarried Adult Children of Citizens',
    f2a: 'F2A Spouses & Children of LPRs',
    f2b: 'F2B Unmarried Adult Children of LPRs',
    f3: 'F3 Married Children of Citizens',
    f4: 'F4 Siblings of Adult Citizens',
    currentLabel: 'C',
    dataTitle: 'Where does this data come from?',
    dataSourceLabel: 'Source',
    dataSourceValue: 'U.S. Department of State Visa Bulletin (travel.state.gov)',
    dataAccuracyLabel: 'Accuracy',
    dataAccuracyValue: 'Data reflects the official May 2026 bulletin (current month) and April 2026 bulletin (prior month), sourced directly from travel.state.gov on April 15, 2026. This is the authoritative source.',
    dataFrequencyLabel: 'Update Frequency',
    dataFrequencyValue: 'Once per month. DOS releases each bulletin in the 2nd or 3rd week of the prior month. USCIS then announces within 1 week which chart to use for I-485 filings.',
    dataNextLabel: 'Next Bulletin',
    dataNextValue: 'June 2026 bulletin expected mid-May 2026 (typically released 2nd or 3rd week of the prior month)',
    dataDisclaimerLabel: 'Disclaimer',
    dataDisclaimerValue: 'This tool is for informational use only. For legal advice, consult a licensed immigration attorney. Always cross-reference travel.state.gov before filing.',
    dataViewSource: 'View official bulletin',
    dataViewUSCIS: 'Check USCIS chart selection',
    updateStatus: 'Data Status',
    lastUpdated: 'Last Updated',
    dataFresh: 'Data is current',
    dataStale: 'Data may be outdated',
    autoUpdate: 'Auto-update available',
    manualUpdate: 'Manual update required',
    updateFreq: 'Updates monthly around 15th',
    nextUpdateEst: 'Next update estimated',
    trendHistory: 'Recent Movement',
    thisMonth: 'This Month',
    lastMonth: 'Last Month',
    movement: 'Movement',
    advanced: 'Advanced',
    noMovement: 'No Movement',
    retrogressed: 'Retrogressed',
    becameCurrent: 'Became Current',
    alerts: 'Smart Alerts',
    alertTitle: 'Set up notifications',
    alertSubtitle: 'Get notified when important changes happen',
    alertWhenCurrent: 'When I become current',
    alertWhenEligible: 'When I become eligible to file',
    alertMonthlyUpdates: 'Monthly bulletin updates',
    alertRetrogression: 'If my category retrogresses',
    alertEnabled: 'Alert enabled',
    alertDisabled: 'Alert disabled',
    scenarioTitle: 'What-If Scenarios',
    scenarioSubtitle: 'See how different priority dates would affect your timeline',
    comparePDTitle: 'Compare Priority Dates',
    earlier6months: '6 months earlier',
    earlier1year: '1 year earlier',
    later6months: '6 months later',
    later1year: '1 year later',
    yourCurrent: 'Your current PD',
    emailSubscription: 'Email Subscription',
    emailTitle: 'Get monthly updates by email',
    emailSubtitle: 'Never miss important changes to your case',
    emailPlaceholder: 'Enter your email address',
    emailSubscribe: 'Subscribe',
    emailUnsubscribe: 'Unsubscribe',
    emailSuccess: 'Successfully subscribed!',
    emailError: 'Failed to subscribe. Please try again.',
    emailInvalid: 'Please enter a valid email address',
    emailPrivacy: 'We respect your privacy. No spam, unsubscribe anytime.',
    trendChart: 'Forecast',
    trendChartTitle: 'Priority Date Forecast',
    trendChartSubtitle: 'Historical + predictive view',
    currentPD: 'Current Priority Date',
    chartZoomIn: 'Zoom In',
    chartZoomOut: 'Zoom Out',
    chartReset: 'Reset View',
    // I-485 Post-filing Process
    i485Process: 'I-485 Post-Filing Timeline',
    i485ProcessSubtitle: 'What to expect after filing your I-485',
    i485AlreadyFiled: 'I have already filed I-485',
    i485NotYetFiled: 'I have not filed yet',
    i485FilingDate: 'I-485 Filing Date',
    i485EstimatedRange: 'Estimated Timeframe',
    i485Completed: 'Completed',
    i485Upcoming: 'Upcoming',
    i485Overdue: 'May be delayed',
    // Personalized Report
    generateReport: 'Generate My Report',
    reportTitle: 'Your Personalized Green Card Report',
    reportSubtitle: 'A comprehensive analysis of your case',
    reportCurrentStatus: 'Current Status',
    reportEstimatedWait: 'Estimated Wait Time',
    reportNextSteps: 'Recommended Next Steps',
    reportKeyDates: 'Key Dates',
    reportRiskFactors: 'Risk Factors to Watch',
    reportDownload: 'Download Report',
    reportClose: 'Close',
    reportShare: 'Share Report',
    forecastTitle: 'Next Bulletin Forecast',
    forecastSubtitle: 'Hybrid model: observed month-over-month + 21-year long-term average',
    probBecomeCurrent: 'Probability you become current next month',
    probAdvance: 'Probability of further advancement',
    probRetrogress: 'Probability of retrogression',
    probMonths: 'Estimated months until current',
    paceBasisLabel: 'Estimate basis',
    paceBasisConservative: 'Last 12 months',
    paceBasisRecent: 'This month',
    paceRangeLabel: 'Full range',
    paceExplainConservative: 'Based on the average pace actually delivered over the last 12 bulletins — the deliberately cautious end.',
    paceExplainRecent: 'Based on this month\'s movement alone. Responsive, but one fast month is a weak basis for a multi-year estimate.',
    paceRangeNote: 'Both ends are measured from real bulletins. The gap between them is how unsettled this category is — not model error.',
    avgMovement: 'Average monthly movement',
    forecastMethodology: 'Methodology',
    forecastMethodologyDesc: 'This forecast is a statistical estimate based on the average movement of your category and country over recent months. It is not a guarantee. Movement can change due to demand surges, fiscal year resets (every October 1st), or policy changes. In FY2026, the travel ban and processing pause have accelerated ROW advancement — this may reverse.',
    forecastConfidence: 'Confidence',
    confLow: 'Low',
    confMed: 'Medium',
    confHigh: 'High',
    moreThanYear: '> 60 months',
    currentlyCurrent: 'Your category is already current',
    eligibleNow: 'You are already eligible to file',
    chartFooterNote: 'For May 2026, USCIS uses Final Action Dates for employment-based filings (Chart A) and Dates for Filing for family-based filings (Chart B). We automatically pick the right chart based on your category.',
    navOverview: 'Overview',
    navAlerts: 'Subscribe',
    navTrends: 'Forecast',
  },
  zh: {
    appTitle: '绿卡晴雨表',
    appSubtitle: '看清进度,知道下一步该做什么',
    bulletinMonth: '公告月',
    navOverview: '总结',
    navAlerts: '订阅',
    navTrends: '预测',
    navUpdate: '动态',
    navCompare: '社区',
    compareByCountry: '按国家',
    compareByCountryDesc: '看同一情况在不同国家的排期。',
    navFAQ: '常见问题',
    navData: '数据来源',
    navGlossary: '名词解释',
    navIndex: '索引',
    inputTitle: '你的案子',
    inputSubtitle: '填写信息获取专属分析',
    countryLabel: '出生国或地区',
    countryChina: '中国大陆',
    countryTaiwan: '全球 / 港澳台',
    countryIndia: '印度',
    countryMexico: '墨西哥',
    countryPhilippines: '菲律宾',
    categoryLabel: '申请类别',
    petitionerLabel: '申请人身份',
    petitionerUSC: '美国公民',
    petitionerLPR: '绿卡持有人',
    petitionerHelp: '谁递的I-130？美国公民申请F1/F3/F4；绿卡持有人申请F2A/F2B。',
    petitionerMismatch: '类别与身份不匹配',
    petitionerMismatchUSC: 'F2A/F2B只能由绿卡持有人申请。如申请人已入籍：F2B自动转F1（可选择保留F2B）。',
    petitionerMismatchLPR: 'F1/F3/F4只能由美国公民申请。绿卡持有人无法申请这些类别。',
    petitionerInfo: '若申请人已入籍：F2A升级为IR（无需排期），F2B转F1（可选择保留）。',
    f2bStrategyTitle: '策略建议',
    f2bStrategyMsg: '若你的绿卡申请人入籍，F2B会自动转为F1。记得对比F1和F2B的当前排期 — F2B通常更快。根据INA 204(k)你有权选择保留F2B身份。',
    f2aStrategyMsg: '若申请人在你21岁前入籍，你会升级为立即亲属（无需排期）。若21岁后入籍，你会变成F1。',
    f1StrategyMsg: '美国公民申请人保证F1身份。若受益人结婚则转F3（等更久）；若离婚可转回F1。',
    f3StrategyMsg: '若已婚受益人离婚，申请会转回F1（通常更快）。',
    f4StrategyMsg: 'F4要求美国公民申请人年满21岁。F4等待时间是最长的之一，无升级通道。',
    priorityDateLabel: '优先日',
    locationLabel: '目前在美国境内?',
    locationYes: '是,我在美国',
    locationNo: '否,我在海外',
    statusNotCurrent: '排期未到',
    statusEligibleFile: '可以递件',
    statusCurrent: '无排期',
    statusNotCurrentDesc: '你的优先日还没到,暂时不能递件。',
    statusEligibleFileDesc: '你可以提交 I-485 身份调整申请了。',
    statusCurrentDesc: '你已无排期,你的案子可以最终裁定。',
    dashTitle: '你的个人状态',
    chartFinalAction: '最终裁定排期 (表A)',
    chartFiling: '递件排期 (表B)',
    distance: '距离',
    daysAway: '天后到你',
    daysAhead: '天前已过',
    alreadyCurrent: '已经无排期',
    monthlyMovement: '本月进度',
    days: '天',
    months: '个月',
    progressPD: '你的优先日',
    progressCutoff: '当前排期',
    progressToday: '今天',
    updateTitle: '本月公告解读',
    updateSubtitle: '和上个月相比有什么变化',
    overallSummary: '2026年5月推进明显放缓,职业移民类别大部分冻结在 4 月的日期。USCIS 本月对职业移民改回使用表A (最终裁定排期) — 比上月的表B 更严格。亲属移民类别仍继续使用表B。国务院警告如果需求激增,EB-5 印度类别可能出现倒退。',
    categoryChanges: '各类别变化',
    yourImpact: '对你的影响',
    impactAdvanced: '好消息 — 你的类别本月前进了。',
    impactNoChange: '你的类别本月没有变化。',
    impactRetrogressed: '注意 — 你的类别本月倒退了。',
    impactBecameCurrent: '你刚刚变成无排期了!',
    actionTitle: '建议下一步',
    actionMonitor: '每月关注进度即可',
    actionMonitorDesc: '你离当前排期还比较远,暂时无需行动。下个月再来看看。',
    actionPrepare: '开始准备材料',
    actionPrepareDesc: '快轮到你了。提前准备好体检、税表、I-94、照片等材料,届时才能立即递件。',
    actionFile: '本月可以递件',
    actionFileDesc: '尽快提交 I-485 材料包。考虑在下个月可能倒退之前递交。',
    actionFileSoon: '尽快递件',
    actionFileSoonDesc: '排期波动较大。如果已经符合条件,应在窗口收紧或倒退前尽快递交。',
    actionCurrent: '可以最终裁定',
    actionCurrentDesc: '你的 I-485 可以最终批准了。联系律师或 USCIS 跟进。',
    compareTitle: '中国大陆 vs 台湾',
    compareSubtitle: '看看在同类别、同优先日下,出生地如何影响排期',
    overviewSubtitle: '一眼看清你的当前情况',
    chartTableA: '最终裁定排期 (表A)',
    chartTableB: '递件排期 (表B)',
    chartActive: 'USCIS正在使用此表',
    chartInactive: '仅供参考',
    yourCategory: '你的类别',
    yourPD: '你的优先日',
    yourBirthCountry: '你的出生国',
    statusTableA: '表A状态',
    statusTableB: '表B状态',
    nextAction: '建议下一步',
    whichChart: '我应该用哪个表?',
    whichChartDesc: 'USCIS每月公布I-485递件应使用哪个表。2026年5月：职业移民用表A，亲属移民用表B。',
    compareCategory: '类别',
    comparePD: '优先日',
    chinaBorn: '中国大陆出生',
    taiwanBorn: '台湾出生',
    compareExplainTitle: '为什么差这么多?',
    compareExplain: '每个国家每年最多只能用 7% 的签证名额。因为中国大陆申请人众多,队伍很长。而台湾出生的申请人归到「其他所有国家」池子里,推进速度快得多。',
    glossaryTitle: '关键名词',
    termFAD: '最终裁定排期 (Final Action Date)',
    termFADDesc: 'USCIS 或领馆可以批准你绿卡的日期。你的优先日必须早于这个日期才能获批。',
    termDFF: '递件排期 (Dates for Filing)',
    termDFFDesc: '比最终裁定更早的日期,可能允许你提前递交 I-485。每月由 USCIS 单独授权使用。',
    termPD: '优先日 (Priority Date)',
    termPDDesc: '你在排队中的位置。通常是你的 I-140 或劳工证提交的日期。',
    termCurrent: '无排期 (Current)',
    termCurrentDesc: '该类别没有积压。所有符合条件的人都可以立即递件或获批。',
    termRetrogression: '排期倒退 (Retrogression)',
    termRetrogressionDesc: '排期日期往回走,不是往前走。当需求超过供给时就会发生。',
    termUSCIS: 'USCIS (移民局)',
    termUSCISDesc: '美国公民及移民服务局。负责审理绿卡和其他移民申请的联邦机构。',
    termVisaBulletin: '排期表 (Visa Bulletin)',
    termVisaBulletinDesc: '美国国务院每月发布的排期公告,列出各类别和国家的截止日期。决定谁可以递件或获批。',
    termI140: 'I-140 移民申请',
    termI140Desc: '雇主为员工申请职业移民绿卡的申请。必须先批准(或与 I-485 同时递交)。',
    termI485: 'I-485 身份调整',
    termI485Desc: '在美国境内调整身份为永久居民的申请。需要排期到(或递件日期开放)才能递交。',
    termPERM: 'PERM 劳工证',
    termPERMDesc: '劳工部认证,证明没有合格的美国工人能做这份工作。EB-2/EB-3 递 I-140 之前大多需要这个。',
    termEAD: '工卡 (EAD)',
    termEADDesc: '工作许可证。I-485 审批期间合法工作的凭证。通常 2-5 年有效,可续签。',
    termAP: '回美证 (Advance Parole)',
    termAPDesc: 'I-485 审批期间出入境的旅行证件,不会放弃申请。2024 年起费用约 $630(不再免费)。',
    termAOS: '境内调整 (AOS)',
    termAOSDesc: '在美国境内通过 I-485 获得绿卡。比领事处理快,但审批期间需留在美国。',
    termCP: '领事处理 (CP)',
    termCPDesc: '在美国驻外领馆获得移民签证,然后以永久居民身份入境美国。AOS 的替代方案(境外申请者用)。',
    termCrossCharge: '交叉归属 (Cross-Chargeability)',
    termCrossChargeDesc: '允许用配偶出生国的排期。如果配偶来自无积压国家,可大幅缩短等待时间。',
    termPerCountryCap: '国家上限 (7% 规则)',
    termPerCountryCapDesc: '每个国家最多获得年度职业/亲属签证的 7%。这就是中国/印度/墨西哥/菲律宾排期长的原因。',
    termDerivative: '附属受益人',
    termDerivativeDesc: '主申请人的配偶和未满 21 岁未婚子女。与主申请人同一优先日一起获得绿卡。',
    termNIW: 'NIW 国家利益豁免',
    termNIWDesc: 'EB-2 的一个子类别,豁免雇主担保和劳工证要求。工作涉及国家利益可自行申请。',
    termPremium: '加急处理 (Premium Processing)',
    termPremiumDesc: 'I-140(和部分其他申请)的加急服务。$2,805 换 15 个工作日出结果。但无法加速排期等待。',
    termRFE: 'RFE 补件通知',
    termRFEDesc: 'USCIS 要求补充材料后再决定。很常见,通常不是拒签前兆 —— 详尽按时回复就好。',
    eb1: 'EB-1 杰出人才',
    eb2: 'EB-2 高学历',
    eb3: 'EB-3 技术工',
    ew: 'EB-3 非技术劳工',
    eb4: 'EB-4 特殊移民（含SIJ青少年）',
    sr: 'EB-4 宗教工作者（SR）',
    eb5: 'EB-5 投资移民（未预留/传统）',
    eb5r: 'EB-5 预留·乡村（20%）',
    eb5h: 'EB-5 预留·高失业区（10%）',
    eb5i: 'EB-5 预留·基建（2%）',
    f1: 'F1 公民成年未婚子女',
    f2a: 'F2A 绿卡持有人配偶与子女',
    f2b: 'F2B 绿卡持有人成年未婚子女',
    f3: 'F3 公民已婚子女',
    f4: 'F4 公民的兄弟姐妹',
    currentLabel: '无排期',
    dataTitle: '数据从哪里来?',
    dataSourceLabel: '数据来源',
    dataSourceValue: '美国国务院 (Department of State) 每月公布的 Visa Bulletin (travel.state.gov)',
    dataAccuracyLabel: '准确性',
    dataAccuracyValue: '本应用使用 2026 年 5 月 (当前) 和 4 月 (上月) 的官方公告数据,于 2026 年 4 月 15 日直接从 travel.state.gov 获取,这是权威来源。',
    dataFrequencyLabel: '更新频率',
    dataFrequencyValue: '每月更新一次。国务院通常在当月的前一个月的第 2 至第 3 周公布新公告。USCIS 随后在 1 周内宣布 I-485 使用哪张表。',
    dataNextLabel: '下期公告',
    dataNextValue: '2026 年 6 月公告预计在 2026 年 5 月中旬公布',
    dataDisclaimerLabel: '免责声明',
    dataDisclaimerValue: '本工具仅供信息参考。法律建议请咨询持牌移民律师。递件前请务必与 travel.state.gov 核对。',
    dataViewSource: '查看官方公告',
    dataViewUSCIS: '查看 USCIS 选表公告',
    updateStatus: '数据状态',
    lastUpdated: '最后更新',
    dataFresh: '数据为最新',
    dataStale: '数据可能过期',
    autoUpdate: '可自动更新',
    manualUpdate: '需手动更新',
    updateFreq: '每月15号左右更新',
    nextUpdateEst: '预计下次更新',
    trendHistory: '最近推进情况',
    thisMonth: '本月',
    lastMonth: '上月',
    movement: '推进幅度',
    advanced: '前进',
    noMovement: '无变化',
    retrogressed: '倒退',
    becameCurrent: '变成无排期',
    alerts: '智能提醒',
    alertTitle: '设置通知提醒',
    alertSubtitle: '重要变化时第一时间通知你',
    alertWhenCurrent: '当我变成无排期时',
    alertWhenEligible: '当我可以递件时',
    alertMonthlyUpdates: '每月公告更新',
    alertRetrogression: '如果我的类别倒退',
    alertEnabled: '已开启提醒',
    alertDisabled: '已关闭提醒',
    scenarioTitle: '假设情景',
    scenarioSubtitle: '看看不同优先日对你的时间线有何影响',
    comparePDTitle: '优先日对比',
    earlier6months: '早6个月',
    earlier1year: '早1年',
    later6months: '晚6个月',
    later1year: '晚1年',
    yourCurrent: '你的当前优先日',
    emailSubscription: '邮件订阅',
    emailTitle: '订阅每月邮件更新',
    emailSubtitle: '第一时间获取重要变化通知',
    emailPlaceholder: '请输入你的邮箱地址',
    emailSubscribe: '订阅',
    emailUnsubscribe: '取消订阅',
    emailSuccess: '订阅成功！',
    emailError: '订阅失败，请重试。',
    emailInvalid: '请输入有效的邮箱地址',
    emailPrivacy: '我们尊重你的隐私。无垃圾邮件，随时可取消订阅。',
    trendChart: '排期预测',
    trendChartTitle: '排期预测',
    trendChartSubtitle: '历史数据 + AI预测未来推进',
    currentPD: '当前优先日',
    chartZoomIn: '放大',
    chartZoomOut: '缩小',
    chartReset: '重置视图',
    // I-485 Post-filing Process
    i485Process: 'I-485 递交后时间线',
    i485ProcessSubtitle: '递交 I-485 后你可以期待什么',
    i485AlreadyFiled: '我已经递交了 I-485',
    i485NotYetFiled: '我还没递交',
    i485FilingDate: 'I-485 递交日期',
    i485EstimatedRange: '预计时间',
    i485Completed: '已完成',
    i485Upcoming: '即将到来',
    i485Overdue: '可能延迟',
    // Personalized Report
    generateReport: '生成个性化报告',
    reportTitle: '你的专属绿卡报告',
    reportSubtitle: '你案子的全面分析',
    reportCurrentStatus: '当前状态',
    reportEstimatedWait: '预计等待时间',
    reportNextSteps: '推荐下一步',
    reportKeyDates: '关键日期',
    reportRiskFactors: '需要注意的风险',
    reportDownload: '下载报告',
    reportClose: '关闭',
    reportShare: '分享报告',
    forecastTitle: '下期公告预测',
    forecastSubtitle: '混合模型: 当月实测推进 + 21年长期均值',
    probBecomeCurrent: '下月变无排期的概率',
    probAdvance: '继续前进的概率',
    probRetrogress: '倒退的概率',
    probMonths: '预计多久能无排期',
    paceBasisLabel: '估算口径',
    paceBasisConservative: '近 12 个月',
    paceBasisRecent: '本月',
    paceRangeLabel: '完整区间',
    paceExplainConservative: '按过去 12 期公告实际平均推进速度估算——刻意取保守的一端。',
    paceExplainRecent: '只按本月这一次的推进速度估算。反应快，但用单月速度去承诺好几年，依据是很薄的。',
    paceRangeNote: '两端都来自真实公告。它们之间的差距反映的是这个类别本身有多不稳定，不是模型算错了。',
    avgMovement: '平均每月推进',
    forecastMethodology: '预测方法',
    forecastMethodologyDesc: '此预测是根据你类别和国家近几个月的平均推进速度做出的统计估算,不保证准确。需求激增、新财年重置 (每年 10 月 1 日)、政策变化都会影响实际进度。2026 财年,旅行禁令和处理暂停导致 ROW 加速前进,未来可能反转。',
    forecastConfidence: '可信度',
    confLow: '低',
    confMed: '中',
    confHigh: '高',
    moreThanYear: '> 60 个月',
    currentlyCurrent: '你的类别已经无排期',
    eligibleNow: '你已经符合递件条件',
    chartFooterNote: '2026 年 5 月:USCIS 对职业移民使用表A (最终裁定排期),对亲属移民使用表B (递件排期)。系统会根据你的类别自动选用正确的表。',
  },
  tw: {
    appTitle: '綠卡晴雨表',
    appSubtitle: '看清進度,知道下一步該做什麼',
    bulletinMonth: '公告月',
    navOverview: '總結',
    navAlerts: '訂閱',
    navTrends: '預測',
    navUpdate: '動態',
    navCompare: '社區',
    compareByCountry: '按國家',
    compareByCountryDesc: '看同一情況在不同國家的排期。',
    navFAQ: '常見問題',
    navData: '資料來源',
    navGlossary: '名詞解釋',
    navIndex: '索引',
    inputTitle: '你的案子',
    inputSubtitle: '填寫資訊取得專屬分析',
    countryLabel: '出生國或地區',
    countryChina: '中國大陸',
    countryTaiwan: '全球 / 港澳台',
    countryIndia: '印度',
    countryMexico: '墨西哥',
    countryPhilippines: '菲律賓',
    categoryLabel: '申請類別',
    petitionerLabel: '申請人身份',
    petitionerUSC: '美國公民',
    petitionerLPR: '綠卡持有人',
    petitionerHelp: '誰遞的I-130？美國公民申請F1/F3/F4；綠卡持有人申請F2A/F2B。',
    petitionerMismatch: '類別與身份不匹配',
    petitionerMismatchUSC: 'F2A/F2B只能由綠卡持有人申請。如申請人已入籍：F2B自動轉F1（可選擇保留F2B）。',
    petitionerMismatchLPR: 'F1/F3/F4只能由美國公民申請。綠卡持有人無法申請這些類別。',
    petitionerInfo: '若申請人已入籍：F2A升級為IR（無需排期），F2B轉F1（可選擇保留）。',
    f2bStrategyTitle: '策略建議',
    f2bStrategyMsg: '若你的綠卡申請人入籍，F2B會自動轉為F1。記得對比F1和F2B的當前排期 — F2B通常更快。根據INA 204(k)你有權選擇保留F2B身份。',
    f2aStrategyMsg: '若申請人在你21歲前入籍，你會升級為立即親屬（無需排期）。若21歲後入籍，你會變成F1。',
    f1StrategyMsg: '美國公民申請人保證F1身份。若受益人結婚則轉F3（等更久）；若離婚可轉回F1。',
    f3StrategyMsg: '若已婚受益人離婚，申請會轉回F1（通常更快）。',
    f4StrategyMsg: 'F4要求美國公民申請人年滿21歲。F4等待時間是最長的之一，無升級通道。',
    priorityDateLabel: '優先日',
    locationLabel: '目前在美國境內?',
    locationYes: '是,我在美國',
    locationNo: '否,我在海外',
    statusNotCurrent: '排期未到',
    statusEligibleFile: '可以遞件',
    statusCurrent: '無排期',
    statusNotCurrentDesc: '你的優先日還沒到,暫時無法遞件。',
    statusEligibleFileDesc: '你可以提交 I-485 身分調整申請了。',
    statusCurrentDesc: '你已無排期,你的案子可以最終裁定。',
    dashTitle: '你的個人狀態',
    chartFinalAction: '最終裁定排期 (表A)',
    chartFiling: '遞件排期 (表B)',
    distance: '距離',
    daysAway: '天後到你',
    daysAhead: '天前已過',
    alreadyCurrent: '已經無排期',
    monthlyMovement: '本月進度',
    days: '天',
    months: '個月',
    progressPD: '你的優先日',
    progressCutoff: '當前排期',
    progressToday: '今天',
    updateTitle: '本月公告解讀',
    updateSubtitle: '和上個月相比有什麼變化',
    overallSummary: '2026 年 5 月推進明顯放緩,職業移民類別大部分凍結在 4 月的日期。USCIS 本月對職業移民改回使用表A (最終裁定排期) — 比上月的表B 更嚴格。親屬移民類別仍繼續使用表B。國務院警告如果需求激增,EB-5 印度類別可能出現倒退。',
    categoryChanges: '各類別變化',
    yourImpact: '對你的影響',
    impactAdvanced: '好消息 — 你的類別本月前進了。',
    impactNoChange: '你的類別本月沒有變化。',
    impactRetrogressed: '注意 — 你的類別本月倒退了。',
    impactBecameCurrent: '你剛剛變成無排期了!',
    actionTitle: '建議下一步',
    actionMonitor: '每月關注進度即可',
    actionMonitorDesc: '你離當前排期還比較遠,暫時無需行動。下個月再來看看。',
    actionPrepare: '開始準備文件',
    actionPrepareDesc: '快輪到你了。提前準備好體檢、稅表、I-94、照片等文件,屆時才能立即遞件。',
    actionFile: '本月可以遞件',
    actionFileDesc: '盡快提交 I-485 資料包。考慮在下個月可能倒退之前遞交。',
    actionFileSoon: '盡快遞件',
    actionFileSoonDesc: '排期波動較大。如果已經符合條件,應在視窗收緊或倒退前盡快遞交。',
    actionCurrent: '可以最終裁定',
    actionCurrentDesc: '你的 I-485 可以最終核准了。聯絡律師或 USCIS 跟進。',
    compareTitle: '中國 vs 台灣',
    compareSubtitle: '看看在同類別、同優先日下,出生地如何影響排期',
    overviewSubtitle: '一眼看清你的當前情況',
    chartTableA: '最終裁定排期 (表A)',
    chartTableB: '遞件排期 (表B)',
    chartActive: 'USCIS正在使用此表',
    chartInactive: '僅供參考',
    yourCategory: '你的類別',
    yourPD: '你的優先日',
    yourBirthCountry: '你的出生國',
    statusTableA: '表A狀態',
    statusTableB: '表B狀態',
    nextAction: '建議下一步',
    whichChart: '我應該用哪個表?',
    whichChartDesc: 'USCIS每月公布I-485遞件應使用哪個表。2026年5月：職業移民用表A，親屬移民用表B。',
    compareCategory: '類別',
    comparePD: '優先日',
    chinaBorn: '中國大陸出生',
    taiwanBorn: '台灣出生',
    compareExplainTitle: '為什麼差這麼多?',
    compareExplain: '每個國家每年最多只能用 7% 的簽證名額。因為中國大陸申請人眾多,隊伍很長。而台灣出生的申請人歸到「其他所有國家」池子裡,推進速度快得多。',
    glossaryTitle: '關鍵名詞',
    termFAD: '最終裁定排期 (Final Action Date)',
    termFADDesc: 'USCIS 或領館可以核准你綠卡的日期。你的優先日必須早於這個日期才能獲批。',
    termDFF: '遞件排期 (Dates for Filing)',
    termDFFDesc: '比最終裁定更早的日期,可能允許你提前遞交 I-485。每月由 USCIS 單獨授權使用。',
    termPD: '優先日 (Priority Date)',
    termPDDesc: '你在排隊中的位置。通常是你的 I-140 或勞工證提交的日期。',
    termCurrent: '無排期 (Current)',
    termCurrentDesc: '該類別沒有積壓。所有符合條件的人都可以立即遞件或獲批。',
    termRetrogression: '排期倒退 (Retrogression)',
    termRetrogressionDesc: '排期日期往回走,不是往前走。當需求超過供給時就會發生。',
    termUSCIS: 'USCIS (移民局)',
    termUSCISDesc: '美國公民及移民服務局。負責審理綠卡和其他移民申請的聯邦機構。',
    termVisaBulletin: '排期表 (Visa Bulletin)',
    termVisaBulletinDesc: '美國國務院每月發布的排期公告,列出各類別和國家的截止日期。決定誰可以遞件或獲批。',
    termI140: 'I-140 移民申請',
    termI140Desc: '雇主為員工申請職業移民綠卡的申請。必須先批准(或與 I-485 同時遞交)。',
    termI485: 'I-485 身份調整',
    termI485Desc: '在美國境內調整身份為永久居民的申請。需要排期到(或遞件日期開放)才能遞交。',
    termPERM: 'PERM 勞工證',
    termPERMDesc: '勞工部認證,證明沒有合格的美國工人能做這份工作。EB-2/EB-3 遞 I-140 之前大多需要這個。',
    termEAD: '工卡 (EAD)',
    termEADDesc: '工作許可證。I-485 審批期間合法工作的憑證。通常 2-5 年有效,可續簽。',
    termAP: '回美證 (Advance Parole)',
    termAPDesc: 'I-485 審批期間出入境的旅行證件,不會放棄申請。2024 年起費用約 $630(不再免費)。',
    termAOS: '境內調整 (AOS)',
    termAOSDesc: '在美國境內通過 I-485 獲得綠卡。比領事處理快,但審批期間需留在美國。',
    termCP: '領事處理 (CP)',
    termCPDesc: '在美國駐外領館獲得移民簽證,然後以永久居民身份入境美國。AOS 的替代方案(境外申請者用)。',
    termCrossCharge: '交叉歸屬 (Cross-Chargeability)',
    termCrossChargeDesc: '允許用配偶出生國的排期。如果配偶來自無積壓國家,可大幅縮短等待時間。',
    termPerCountryCap: '國家上限 (7% 規則)',
    termPerCountryCapDesc: '每個國家最多獲得年度職業/親屬簽證的 7%。這就是中國/印度/墨西哥/菲律賓排期長的原因。',
    termDerivative: '附屬受益人',
    termDerivativeDesc: '主申請人的配偶和未滿 21 歲未婚子女。與主申請人同一優先日一起獲得綠卡。',
    termNIW: 'NIW 國家利益豁免',
    termNIWDesc: 'EB-2 的一個子類別,豁免雇主擔保和勞工證要求。工作涉及國家利益可自行申請。',
    termPremium: '加急處理 (Premium Processing)',
    termPremiumDesc: 'I-140(和部分其他申請)的加急服務。$2,805 換 15 個工作日出結果。但無法加速排期等待。',
    termRFE: 'RFE 補件通知',
    termRFEDesc: 'USCIS 要求補充材料後再決定。很常見,通常不是拒簽前兆 —— 詳盡按時回覆就好。',
    eb1: 'EB-1 傑出人才',
    eb2: 'EB-2 高學歷',
    eb3: 'EB-3 技術工',
    ew: 'EB-3 非技術勞工',
    eb4: 'EB-4 特殊移民（含SIJ青少年）',
    sr: 'EB-4 宗教工作者（SR）',
    eb5: 'EB-5 投資移民（未預留/傳統）',
    eb5r: 'EB-5 預留·鄉村（20%）',
    eb5h: 'EB-5 預留·高失業區（10%）',
    eb5i: 'EB-5 預留·基建（2%）',
    f1: 'F1 公民成年未婚子女',
    f2a: 'F2A 綠卡持有人配偶與子女',
    f2b: 'F2B 綠卡持有人成年未婚子女',
    f3: 'F3 公民已婚子女',
    f4: 'F4 公民的兄弟姊妹',
    currentLabel: '無排期',
    dataTitle: '資料從哪裡來?',
    dataSourceLabel: '資料來源',
    dataSourceValue: '美國國務院 (Department of State) 每月公布的 Visa Bulletin (travel.state.gov)',
    dataAccuracyLabel: '準確性',
    dataAccuracyValue: '本應用使用 2026 年 5 月 (當前) 和 4 月 (上月) 的官方公告資料,於 2026 年 4 月 15 日直接從 travel.state.gov 獲取,這是權威來源。',
    dataFrequencyLabel: '更新頻率',
    dataFrequencyValue: '每月更新一次。國務院通常在當月的前一個月的第 2 至第 3 週公布新公告。USCIS 隨後在 1 週內宣布 I-485 使用哪張表。',
    dataNextLabel: '下期公告',
    dataNextValue: '2026 年 6 月公告預計在 2026 年 5 月中旬公布',
    dataDisclaimerLabel: '免責聲明',
    dataDisclaimerValue: '本工具僅供資訊參考。法律建議請諮詢持牌移民律師。遞件前請務必與 travel.state.gov 核對。',
    dataViewSource: '查看官方公告',
    dataViewUSCIS: '查看 USCIS 選表公告',
    updateStatus: '資料狀態',
    lastUpdated: '最後更新',
    dataFresh: '資料為最新',
    dataStale: '資料可能過期',
    autoUpdate: '可自動更新',
    manualUpdate: '需手動更新',
    updateFreq: '每月15號左右更新',
    nextUpdateEst: '預計下次更新',
    trendHistory: '最近推進情況',
    thisMonth: '本月',
    lastMonth: '上月',
    movement: '推進幅度',
    advanced: '前進',
    noMovement: '無變化',
    retrogressed: '倒退',
    becameCurrent: '變成無排期',
    alerts: '智能提醒',
    alertTitle: '設置通知提醒',
    alertSubtitle: '重要變化時第一時間通知你',
    alertWhenCurrent: '當我變成無排期時',
    alertWhenEligible: '當我可以遞件時',
    alertMonthlyUpdates: '每月公告更新',
    alertRetrogression: '如果我的類別倒退',
    alertEnabled: '已開啟提醒',
    alertDisabled: '已關閉提醒',
    scenarioTitle: '假設情景',
    scenarioSubtitle: '看看不同優先日對你的時間線有何影響',
    comparePDTitle: '優先日對比',
    earlier6months: '早6個月',
    earlier1year: '早1年',
    later6months: '晚6個月',
    later1year: '晚1年',
    yourCurrent: '你的當前優先日',
    emailSubscription: '郵件訂閱',
    emailTitle: '訂閱每月郵件更新',
    emailSubtitle: '第一時間獲取重要變化通知',
    emailPlaceholder: '請輸入你的郵箱地址',
    emailSubscribe: '訂閱',
    emailUnsubscribe: '取消訂閱',
    emailSuccess: '訂閱成功！',
    emailError: '訂閱失敗，請重試。',
    emailInvalid: '請輸入有效的郵箱地址',
    emailPrivacy: '我們尊重你的隱私。無垃圾郵件，隨時可取消訂閱。',
    trendChart: '排期預測',
    trendChartTitle: '排期預測',
    trendChartSubtitle: '歷史數據 + AI預測未來推進',
    currentPD: '當前優先日',
    chartZoomIn: '放大',
    chartZoomOut: '縮小',
    chartReset: '重置視圖',
    // I-485 Post-filing Process
    i485Process: 'I-485 遞交後時間線',
    i485ProcessSubtitle: '遞交 I-485 後你可以期待什麼',
    i485AlreadyFiled: '我已經遞交了 I-485',
    i485NotYetFiled: '我還沒遞交',
    i485FilingDate: 'I-485 遞交日期',
    i485EstimatedRange: '預計時間',
    i485Completed: '已完成',
    i485Upcoming: '即將到來',
    i485Overdue: '可能延遲',
    // Personalized Report
    generateReport: '生成個性化報告',
    reportTitle: '你的專屬綠卡報告',
    reportSubtitle: '你案子的全面分析',
    reportCurrentStatus: '當前狀態',
    reportEstimatedWait: '預計等待時間',
    reportNextSteps: '推薦下一步',
    reportKeyDates: '關鍵日期',
    reportRiskFactors: '需要注意的風險',
    reportDownload: '下載報告',
    reportClose: '關閉',
    reportShare: '分享報告',
    forecastTitle: '下期公告預測',
    forecastSubtitle: '混合模型: 當月實測推進 + 21年長期均值',
    probBecomeCurrent: '下月變無排期的機率',
    probAdvance: '繼續前進的機率',
    probRetrogress: '倒退的機率',
    probMonths: '預計多久能無排期',
    paceBasisLabel: '估算口徑',
    paceBasisConservative: '近 12 個月',
    paceBasisRecent: '本月',
    paceRangeLabel: '完整區間',
    paceExplainConservative: '按過去 12 期公告實際平均推進速度估算——刻意取保守的一端。',
    paceExplainRecent: '只按本月這一次的推進速度估算。反應快，但用單月速度去承諾好幾年，依據是很薄的。',
    paceRangeNote: '兩端都來自真實公告。它們之間的差距反映的是這個類別本身有多不穩定，不是模型算錯了。',
    avgMovement: '平均每月推進',
    forecastMethodology: '預測方法',
    forecastMethodologyDesc: '此預測是根據你類別和國家近幾個月的平均推進速度做出的統計估算,不保證準確。需求激增、新財年重置 (每年 10 月 1 日)、政策變化都會影響實際進度。2026 財年,旅行禁令和處理暫停導致 ROW 加速前進,未來可能反轉。',
    forecastConfidence: '可信度',
    confLow: '低',
    confMed: '中',
    confHigh: '高',
    moreThanYear: '> 60 個月',
    currentlyCurrent: '你的類別已經無排期',
    eligibleNow: '你已經符合遞件條件',
    chartFooterNote: '2026 年 5 月:USCIS 對職業移民使用表A (最終裁定排期),對親屬移民使用表B (遞件排期)。系統會根據你的類別自動選用正確的表。',
  }
};

// ============================================================
// Language Context
// ============================================================
const LanguageContext = createContext();
const useLang = () => useContext(LanguageContext);

// ============================================================
// Real Visa Bulletin Data — April & March 2026 (Source: travel.state.gov)
// Note: Taiwan-born applicants are charged to the "Other" (ROW) pool.
// ============================================================
const BULLETIN_CURRENT_MONTH = { en: 'May 2026', zh: '2026年5月', tw: '2026年5月' };

// The month currently on screen, as 'YYYY-MM'. Kept in sync with viewingMonth by the
// same effect that swaps bulletinCurrent/bulletinPrevious. Every calendar anchor in the
// forecast chart derives from this — they used to be four separate `new Date(2026, 4, …)`
// literals, which silently pinned the whole projection to May 2026 no matter what
// bulletin was actually loaded.
const BULLETIN_CURRENT_KEY = { value: '2026-05' };
const bulletinAnchorDate = (day = 1) => {
  const [y, m] = BULLETIN_CURRENT_KEY.value.split('-').map(Number);
  return new Date(y, m - 1, day);
};

// USCIS announced for May 2026: EB uses Final Action Dates (Chart A),
// Family categories continue to use Dates for Filing (Chart B)
// Country flags mapping
const COUNTRY_FLAGS = {
  'China': '🇨🇳',
  'Taiwan': '',
  'India': '🇮🇳',
  'Mexico': '🇲🇽',
  'Philippines': '🇵🇭'
};

// SVG flag component - works universally, no emoji dependency
const CountryFlag = ({ country, size = 20 }) => {
  const flags = {
    'China': (
      <svg width={size} height={size * 2/3} viewBox="0 0 30 20" style={{ display: 'inline-block' }}>
        <rect width="30" height="20" fill="#DE2910"/>
        <g fill="#FFDE00">
          <polygon points="6,4 7,6.5 9.5,6.5 7.5,8 8.3,10.5 6,9 3.7,10.5 4.5,8 2.5,6.5 5,6.5" transform="scale(0.5) translate(3,2)"/>
          <circle cx="10" cy="3" r="0.5"/>
          <circle cx="12" cy="5" r="0.5"/>
          <circle cx="12" cy="8" r="0.5"/>
          <circle cx="10" cy="10" r="0.5"/>
        </g>
      </svg>
    ),
    'Taiwan': (
      <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'inline-block' }}>
        <circle cx="12" cy="12" r="11" fill="#3b82f6" stroke="#1e40af" strokeWidth="1"/>
        <path d="M 2 12 Q 12 6 22 12 M 2 12 Q 12 18 22 12" stroke="#fff" strokeWidth="0.8" fill="none"/>
        <ellipse cx="12" cy="12" rx="11" ry="5" fill="none" stroke="#fff" strokeWidth="0.8"/>
        <line x1="12" y1="1" x2="12" y2="23" stroke="#fff" strokeWidth="0.8"/>
      </svg>
    ),
    'India': (
      <svg width={size} height={size * 2/3} viewBox="0 0 30 20" style={{ display: 'inline-block' }}>
        <rect width="30" height="6.67" fill="#FF9933"/>
        <rect y="6.67" width="30" height="6.67" fill="#fff"/>
        <rect y="13.33" width="30" height="6.67" fill="#138808"/>
        <circle cx="15" cy="10" r="2.5" fill="none" stroke="#000080" strokeWidth="0.5"/>
      </svg>
    ),
    'Mexico': (
      <svg width={size} height={size * 2/3} viewBox="0 0 30 20" style={{ display: 'inline-block' }}>
        <rect width="10" height="20" fill="#006847"/>
        <rect x="10" width="10" height="20" fill="#fff"/>
        <rect x="20" width="10" height="20" fill="#CE1126"/>
        <circle cx="15" cy="10" r="2.5" fill="none" stroke="#8B4513" strokeWidth="0.5"/>
      </svg>
    ),
    'Philippines': (
      <svg width={size} height={size * 2/3} viewBox="0 0 30 20" style={{ display: 'inline-block' }}>
        <rect width="30" height="10" fill="#0038A8"/>
        <rect y="10" width="30" height="10" fill="#CE1126"/>
        <polygon points="0,0 0,20 12,10" fill="#fff"/>
        <circle cx="4" cy="10" r="1.5" fill="#FCD116"/>
      </svg>
    ),
  };
  return flags[country] || <span></span>;
};

// Passport-style 3-letter country codes (ISO 3166-1 alpha-3)
// Note: "Taiwan" in our data model actually represents ROW (Rest of World including TW/HK/Macao),
// so we use ROW here rather than TWN — it reflects what the app is tracking.
const COUNTRY_CODE = {
  China: 'CHN',
  Taiwan: 'ROW',
  Other: 'ROW',    // Comparison component uses "Other" as the ROW key
  India: 'IND',
  Mexico: 'MEX',
  Philippines: 'PHL',
};

// Same country pills, but reading in the active UI language — English keeps the
// passport-style code (CHN/IND/...), zh/tw show the actual country name so the
// label under the flag isn't stuck in English when the rest of the page isn't.
const COUNTRY_LABEL_ZH = { China: '中国', Taiwan: '全球', Other: '全球', India: '印度', Mexico: '墨西哥', Philippines: '菲律宾' };
const COUNTRY_LABEL_TW = { China: '中國', Taiwan: '全球', Other: '全球', India: '印度', Mexico: '墨西哥', Philippines: '菲律賓' };
const countryShortLabel = (v, lang) => {
  if (lang === 'tw') return COUNTRY_LABEL_TW[v] || v;
  if (lang === 'zh') return COUNTRY_LABEL_ZH[v] || v;
  return COUNTRY_CODE[v] || v.slice(0, 3).toUpperCase();
};

const bulletinMay2026 = {
  finalAction: {
    EB1: { Other: 'C', China: '2023-04-01', India: '2023-04-01' },
    EB2: { Other: 'C', China: '2021-09-01', India: '2014-07-15' },
    EB3: { Other: '2024-06-01', China: '2021-06-15', India: '2013-11-15' },
    F1:  { Other: '2017-06-01', China: '2017-06-01', India: '2017-06-01' },
    F2A: { Other: '2024-03-01', China: '2024-03-01', India: '2024-03-01' },
    F2B: { Other: '2017-06-22', China: '2017-06-22', India: '2017-06-22' },
    F3:  { Other: '2012-01-22', China: '2012-01-22', India: '2012-01-22' },
    F4:  { Other: '2008-07-08', China: '2008-07-08', India: '2006-12-01' },
  },
  filing: {
    EB1: { Other: 'C', China: '2023-12-01', India: '2023-12-01' },
    EB2: { Other: 'C', China: '2022-01-01', India: '2015-01-15' },
    EB3: { Other: 'C', China: '2022-01-01', India: '2015-01-15' },
    F1:  { Other: '2018-10-01', China: '2018-10-01', India: '2018-10-01' },
    F2A: { Other: 'C', China: 'C', India: 'C' },
    F2B: { Other: '2017-09-08', China: '2017-09-08', India: '2017-09-08' },
    F3:  { Other: '2012-12-22', China: '2012-12-22', India: '2012-12-22' },
    F4:  { Other: '2009-06-15', China: '2009-06-15', India: '2007-01-15' },
  }
};

const bulletinApril2026 = {
  finalAction: {
    EB1: { Other: 'C', China: '2023-04-01', India: '2023-04-01' },
    EB2: { Other: 'C', China: '2021-09-01', India: '2014-07-15' },
    EB3: { Other: '2024-06-01', China: '2021-06-15', India: '2013-11-15' },
    F1:  { Other: '2017-05-01', China: '2017-05-01', India: '2017-05-01' },
    F2A: { Other: '2024-02-01', China: '2024-02-01', India: '2024-02-01' },
    F2B: { Other: '2017-05-22', China: '2017-05-22', India: '2017-05-22' },
    F3:  { Other: '2011-12-22', China: '2011-12-22', India: '2011-12-22' },
    F4:  { Other: '2008-06-08', China: '2008-06-08', India: '2006-11-01' },
  },
  filing: {
    EB1: { Other: 'C', China: '2023-12-01', India: '2023-12-01' },
    EB2: { Other: 'C', China: '2022-01-01', India: '2015-01-15' },
    EB3: { Other: 'C', China: '2022-01-01', India: '2015-01-15' },
    F1:  { Other: '2018-03-01', China: '2018-03-01', India: '2018-03-01' },
    F2A: { Other: 'C', China: 'C', India: 'C' },
    F2B: { Other: '2017-08-08', China: '2017-08-08', India: '2017-08-08' },
    F3:  { Other: '2012-11-22', China: '2012-11-22', India: '2012-11-22' },
    F4:  { Other: '2009-05-15', China: '2009-05-15', India: '2006-12-15' },
  }
};

const bulletinMarch2026 = {
  finalAction: {
    EB1: { Other: 'C', China: '2023-03-01', India: '2023-03-01' },
    EB2: { Other: '2024-10-15', China: '2021-09-01', India: '2013-09-15' },
    EB3: { Other: '2023-10-01', China: '2021-05-01', India: '2013-11-15' },
    F1:  { Other: '2017-05-01', China: '2017-05-01', India: '2017-05-01' },
    F2A: { Other: '2022-01-01', China: '2022-01-01', India: '2022-01-01' },
    F2B: { Other: '2017-05-22', China: '2017-05-22', India: '2017-05-22' },
    F3:  { Other: '2011-12-22', China: '2011-12-22', India: '2011-12-22' },
    F4:  { Other: '2008-06-08', China: '2008-06-08', India: '2006-11-01' },
  },
  filing: {
    EB1: { Other: 'C', China: '2023-12-01', India: '2023-12-01' },
    EB2: { Other: 'C', China: '2022-01-01', India: '2014-11-01' },
    EB3: { Other: '2024-01-15', China: '2022-01-01', India: '2014-08-15' },
    F1:  { Other: '2018-03-01', China: '2018-03-01', India: '2018-03-01' },
    F2A: { Other: 'C', China: 'C', India: 'C' },
    F2B: { Other: '2017-08-08', China: '2017-08-08', India: '2017-08-08' },
    F3:  { Other: '2012-11-22', China: '2012-11-22', India: '2012-11-22' },
    F4:  { Other: '2009-05-15', China: '2009-05-15', India: '2006-12-15' },
  }
};

// Archive of all available bulletin snapshots (real historical data only).
// Used by the Time Machine feature to let users view the app from a past month's perspective.
// Each entry has the data itself + the "previous month" reference for month-over-month deltas.
// When GitHub Actions auto-scraper runs, it grows this by auto-rotating new months in.
const BULLETIN_ARCHIVE = {
  '2026-05': { label: { en: 'May 2026', zh: '2026年5月', tw: '2026年5月' }, data: bulletinMay2026, previous: bulletinApril2026 },
  '2026-04': { label: { en: 'April 2026', zh: '2026年4月', tw: '2026年4月' }, data: bulletinApril2026, previous: bulletinMarch2026 },
  '2026-03': { label: { en: 'March 2026', zh: '2026年3月', tw: '2026年3月' }, data: bulletinMarch2026, previous: null /* no Feb data yet */ },
};
// Seeded with the hardcoded months above so the picker still works if /history.json
// is unavailable; both are replaced at runtime by the real 26-month archive.
// `let` because the newest available month is only known after history.json loads.
let DEFAULT_VIEWING_MONTH = '2026-05';
// The month the Time Machine is looking through, mirrored from App state each render.
// Every pace/window helper caps its archive walk at this month, so a historical view
// shows the numbers as they stood THEN — not today's pace under an old month's header.
let VIEWING_MONTH_KEY = null;
// The current bulletin's lettered notice sections (D onward) from /bulletin.json —
// the State Department's own words (retrogression warnings etc.), shown verbatim
// in the monthly summary. Never fabricated: empty until the fetch fills it.
let BULLETIN_NOTICES = [];
let BULLETIN_NOTICES_MONTH = null;
// Localized view of a notice: zh/tw get the AI translation when available; the
// English body is always reachable (shown via a per-item expander in the UI).
const locNotice = (n, lang) => {
  if (!n) return { title: '', text: '', translated: false };
  if (lang === 'en') return { title: n.title || '', text: n.text || '', translated: false };
  const tr = NOTICE_I18N?.months?.[BULLETIN_NOTICES_MONTH]?.[n.letter]?.[lang === 'tw' ? 'tw' : 'zh'];
  if (tr) return { title: tr.title || n.title || '', text: tr.text ?? n.text ?? '', translated: true };
  return { title: n.title || '', text: n.text || '', translated: false };
};

// Full extras block from /bulletin.json (dv, dvNext, f2aExempt, meta) — all real
// scraped bulletin content that never had a UI until now.
let BULLETIN_EXTRAS = null;
// AI translations of the notices (public/notice-translations.json). English original
// stays authoritative; missing translations fall back to it.
let NOTICE_I18N = null;

// Average monthly movement (days) — approximate, from Nov 2025 - Apr 2026 trend
// ==============================================================
// AI PREDICTION DATABASE - BUILT FROM REAL 26-YEAR HISTORICAL DATA
// ==============================================================
// Source: travel.state.gov Visa Bulletin Archive + AILA archive
// Anchor points: Jan 2000, Jan 2005, Jan 2010, Jan 2015, Jan 2020, May 2026
// Methodology: Linear regression on 6 real anchor points (26.3 years)
// Results calibrated against user's F4 China case (2000→2011 ≈ 365 d/y)
//
// KEY INSIGHT FROM DATA: Most backlogged categories show SIGNIFICANT SLOWDOWN
// in recent years. Recent 6-year rates often much lower than long-term 26-year rates.
// Examples:
//   F4 Other/China: 277 d/y long-term → only 94 d/y in last 6 years (severe slowdown)
//   F2B all:  343 d/y long-term → 173 d/y in last 6 years
//   F4 India: 272 d/y long-term → 114 d/y in last 6 years
// This means long-term forecasts should weight RECENT rates more heavily.
// ==============================================================

// HISTORICAL_DATA - Real Final Action Dates from 5 anchor points
// Format: {'YYYY-MM': {category: {country: 'YYYY-MM-DD' | 'C'}}}
// This serves as a BACKUP DATABASE the UI can reference if current data is unavailable
const HISTORICAL_DATA = {
  '2000-01': {
    // 26 years ago - real data from AILA archive (AILA Doc. 99121572)
    // Note: China was NOT yet oversubscribed separately in 2000 (used Other pool)
    // All EB categories were Current except EB3 Other Workers
    F1:  {Other:'1998-09-15', China:'1998-09-15', India:'1998-09-15', Mexico:'1993-10-22', Philippines:'1988-03-22'},
    F2A: {Other:'1995-09-15', China:'1995-09-15', India:'1995-09-15', Mexico:'1994-06-22', Philippines:'1995-09-15'},
    F2B: {Other:'1992-11-22', China:'1992-11-22', India:'1992-11-22', Mexico:'1991-08-22', Philippines:'1992-11-22'},
    F3:  {Other:'1995-10-08', China:'1995-10-08', India:'1995-10-08', Mexico:'1991-07-08', Philippines:'1987-11-15'},
    F4:  {Other:'1988-10-01', China:'1988-10-01', India:'1987-03-15', Mexico:'1988-10-01', Philippines:'1979-07-15'},
    EB1: {Other:'C', China:'C', India:'C', Mexico:'C', Philippines:'C'},
    EB2: {Other:'C', China:'C', India:'C', Mexico:'C', Philippines:'C'},
    EB3: {Other:'C', China:'C', India:'C', Mexico:'C', Philippines:'C'},
  },
  '2005-01': {
    F1:  {Other:'2000-12-22', China:'2000-12-22', India:'2000-12-22', Mexico:'1994-10-15', Philippines:'1990-10-15'},
    F2A: {Other:'2000-08-15', China:'2000-08-15', India:'2000-08-15', Mexico:'1997-10-15', Philippines:'2000-08-15'},
    F2B: {Other:'1995-08-01', China:'1995-08-01', India:'1995-08-01', Mexico:'1992-02-15', Philippines:'1995-08-01'},
    F3:  {Other:'1997-12-22', China:'1997-12-22', India:'1997-12-22', Mexico:'1995-01-22', Philippines:'1990-06-01'},
    F4:  {Other:'1992-11-22', China:'1992-11-22', India:'1992-04-08', Mexico:'1992-11-22', Philippines:'1982-09-22'},
    EB1: {Other:'C', China:'C', India:'C', Mexico:'C', Philippines:'C'},
    EB2: {Other:'C', China:'C', India:'C', Mexico:'C', Philippines:'C'},
    EB3: {Other:'C', China:'2002-01-01', India:'2002-01-01', Mexico:'C', Philippines:'2002-01-01'},
  },
  '2010-01': {
    F1:  {Other:'2004-04-01', China:'2004-04-01', India:'2004-04-01', Mexico:'1992-08-15', Philippines:'1993-12-01'},
    F2A: {Other:'2006-01-01', China:'2006-01-01', India:'2006-01-01', Mexico:'2004-01-01', Philippines:'2006-01-01'},
    F2B: {Other:'2001-12-01', China:'2001-12-01', India:'2001-12-01', Mexico:'1992-06-08', Philippines:'1998-07-01'},
    F3:  {Other:'2001-05-22', China:'2001-05-22', India:'2001-05-22', Mexico:'1992-09-15', Philippines:'1991-12-01'},
    F4:  {Other:'1999-10-01', China:'1999-10-01', India:'1999-10-01', Mexico:'1995-11-22', Philippines:'1987-05-01'},
    EB1: {Other:'C', China:'C', India:'C', Mexico:'C', Philippines:'C'},
    EB2: {Other:'C', China:'2005-05-01', India:'2005-01-22', Mexico:'C', Philippines:'C'},
    EB3: {Other:'2002-08-01', China:'2002-08-01', India:'2001-06-22', Mexico:'2002-07-01', Philippines:'2002-08-01'},
  },
  '2015-01': {
    F1:  {Other:'2007-07-08', China:'2007-07-08', India:'2007-07-08', Mexico:'1994-09-15', Philippines:'2004-12-22'},
    F2A: {Other:'2013-04-15', China:'2013-04-15', India:'2013-04-15', Mexico:'2013-02-22', Philippines:'2013-04-15'},
    F2B: {Other:'2008-04-01', China:'2008-04-01', India:'2008-04-01', Mexico:'1994-11-01', Philippines:'2004-02-01'},
    F3:  {Other:'2003-12-22', China:'2003-12-22', India:'2003-12-22', Mexico:'1993-12-15', Philippines:'1993-07-08'},
    F4:  {Other:'2002-03-22', China:'2002-03-22', India:'2002-03-22', Mexico:'1997-03-22', Philippines:'1991-07-15'},
    EB1: {Other:'C', China:'C', India:'C', Mexico:'C', Philippines:'C'},
    EB2: {Other:'C', China:'2010-02-01', India:'2005-02-15', Mexico:'C', Philippines:'C'},
    EB3: {Other:'2013-06-01', China:'2011-03-01', India:'2003-12-15', Mexico:'2013-06-01', Philippines:'2013-06-01'},
  },
  '2020-01': {
    F1:  {Other:'2013-07-15', China:'2013-07-15', India:'2013-07-15', Mexico:'1997-08-08', Philippines:'2009-01-15'},
    F2A: {Other:'C', China:'C', India:'C', Mexico:'C', Philippines:'C'},
    F2B: {Other:'2014-08-08', China:'2014-08-08', India:'2014-08-08', Mexico:'1998-08-22', Philippines:'2009-02-01'},
    F3:  {Other:'2007-11-15', China:'2007-11-15', India:'2007-11-15', Mexico:'1996-03-01', Philippines:'1999-01-01'},
    F4:  {Other:'2007-02-01', China:'2007-02-01', India:'2004-11-08', Mexico:'1998-01-08', Philippines:'1999-03-01'},
    EB1: {Other:'2018-10-01', China:'2017-05-22', India:'2015-01-01', Mexico:'2018-10-01', Philippines:'2018-10-01'},
    EB2: {Other:'C', China:'2015-07-01', India:'2009-05-18', Mexico:'C', Philippines:'C'},
    EB3: {Other:'C', China:'2015-12-01', India:'2009-01-01', Mexico:'C', Philippines:'2018-03-15'},
  },
  '2026-05': {
    F1:  {Other:'2017-05-01', China:'2017-05-01', India:'2017-05-01', Mexico:'2008-04-15', Philippines:'2013-05-01'},
    F2A: {Other:'C', China:'C', India:'C', Mexico:'C', Philippines:'C'},
    F2B: {Other:'2017-08-08', China:'2017-08-08', India:'2017-08-08', Mexico:'2006-01-01', Philippines:'2013-08-01'},
    F3:  {Other:'2011-12-22', China:'2011-12-22', India:'2011-12-22', Mexico:'2001-01-01', Philippines:'2005-07-15'},
    F4:  {Other:'2008-09-15', China:'2008-09-15', India:'2006-11-01', Mexico:'2001-03-01', Philippines:'2007-02-01'},
    EB1: {Other:'C', China:'2023-04-01', India:'2023-04-01', Mexico:'C', Philippines:'C'},
    EB2: {Other:'C', China:'2021-09-01', India:'2014-07-15', Mexico:'C', Philippines:'C'},
    EB3: {Other:'2023-06-15', China:'2021-06-15', India:'2013-11-15', Mexico:'2023-06-15', Philippines:'2023-08-01'},
  },
};

// RATES_DB / FILING_AUTHORIZED / resolveCountry / getRates / getLongTermRate / computeStatus /
// computeMovement / computeHybridAdvance / estimateMonthsToReachPD now live in
// functions/api/_gcMath.js (imported above) — that's the send-monthly email pipeline's copy
// of this same math, and the two had drifted (computeStatus disagreed on U-cutoff months
// until the 2026-08-12 dedup pass). Backward compat: simple long-term rate accessor.
const LONG_TERM_RATES = Object.fromEntries(
  Object.entries(RATES_DB).map(([k, v]) => [k, v.long])
);

// Observed month-over-month pace (days/month) for one category+country, averaged across
// the trailing window of REAL bulletins in BULLETIN_ARCHIVE.
//
// One estimator, used by both the chart's projection curve and the axis autofit. They
// used to disagree: autofit fed estimateMonthsToReachPD a single month's movement while
// the drawn curve used a windowed average, so the crossover pill and the line it was
// supposed to label could differ by years. A single month is far too noisy to anchor a
// multi-year projection anyway — F4-China sat at 0 days for 6 of the last 12 months and
// then jumped 243 in one.
const observedPaceFromArchive = (cat, country, windowMonths = 12) => {
  let keys = Object.keys(BULLETIN_ARCHIVE).sort();
  if (VIEWING_MONTH_KEY) keys = keys.filter((k) => k <= VIEWING_MONTH_KEY);
  if (keys.length < 2) return null;
  const win = keys.slice(-(windowMonths + 1));
  const valueAt = (k) => BULLETIN_ARCHIVE[k]?.data?.finalAction?.[cat]?.[country];
  const first = valueAt(win[0]);
  const last = valueAt(win[win.length - 1]);
  // 'C' and 'U' carry no usable cutoff date; a retrogression would invert the anchor.
  if (!first || !last || first === 'C' || last === 'C' || first === 'U' || last === 'U') return null;
  const days = (new Date(`${last}T00:00:00`) - new Date(`${first}T00:00:00`)) / 86400000;
  const span = win.length - 1;
  if (span <= 0 || days < 0) return null;
  return days / span;
};

// Per-month signed movement (days) over the trailing window, from consecutive pairs in
// BULLETIN_ARCHIVE. Unlike observedPaceFromArchive (one two-ended average for the
// projection anchor), this keeps every month separate so a chart can show the real
// stall-then-jump rhythm. days === null when either end is C/U/missing (no cutoff to
// diff) — callers must treat null as "no data", not zero.
// `chart`: 'finalAction' | 'filing'. Chart B moves on its own rhythm (F4-China 12mo:
// A +609 vs B +537) — estimating a B gap with A's pace was a real logical hole.
const monthlyMovementFromArchive = (cat, country, windowMonths = 12, chart = 'finalAction') => {
  let keys = Object.keys(BULLETIN_ARCHIVE).sort();
  if (VIEWING_MONTH_KEY) keys = keys.filter((k) => k <= VIEWING_MONTH_KEY);
  if (keys.length < 2) return null;
  const win = keys.slice(-(windowMonths + 1));
  const valueAt = (k) => BULLETIN_ARCHIVE[k]?.data?.[chart]?.[cat]?.[country];
  const out = [];
  for (let i = 1; i < win.length; i++) {
    const a = valueAt(win[i - 1]);
    const b = valueAt(win[i]);
    const usable = a && b && a !== 'C' && a !== 'U' && b !== 'C' && b !== 'U';
    out.push({
      month: win[i],
      // Raw cutoff for that month (date string, 'C', or null≈U) — the chart's tap
      // readout shows it alongside the movement.
      cutoff: b ?? null,
      days: usable
        ? Math.round((new Date(`${b}T00:00:00`) - new Date(`${a}T00:00:00`)) / 86400000)
        : null,
    });
  }
  return out.some((p) => p.days !== null) ? out : null;
};

// Gap-days → estimated calendar days at the observed 12-month Chart A pace. The old
// reading — wait one calendar day per day of cutoff gap — had the I-485 card promising
// "2037" while the summary card and Forecast tab said "2033" on the same screen.
// Chart A pace is the only observed pace we track; applying it to a Chart B gap is an
// approximation (the two charts move roughly together). No usable pace → degrade to
// the old 1:1 reading rather than invent a number.
const paceCalRaw = (cat, country, gapDays, chart) => {
  if (!gapDays || gapDays <= 0) return 0;
  const hist = monthlyMovementFromArchive(cat, country, 12, chart);
  const total = hist ? hist.reduce((s, p) => s + (p.days || 0), 0) : 0;
  if (total <= 0) return gapDays;
  return Math.round((gapDays / (total / 12)) * 30.44);
};
// Chart B's ETA for the same case, derived from the A-chart gap: gapB = gapA minus the
// distance between the two cutoffs. Null when B is current/unavailable or already past
// the PD (then no floor applies).
const chartBFloorCal = (cat, country, gapDaysA) => {
  const cutA = bulletinCurrent.finalAction?.[cat]?.[country];
  const cutB = bulletinCurrent.filing?.[cat]?.[country];
  if (!cutA || !cutB || cutA === 'C' || cutB === 'C') return null;
  const dA = parseDate(cutA);
  const dB = parseDate(cutB);
  if (!dA || !dB) return null;
  const gapB = gapDaysA - Math.round((dB - dA) / 86400000);
  if (gapB <= 0) return null;
  return paceCalRaw(cat, country, gapB, 'filing');
};
const paceDaysToCalendar = (cat, country, gapDays, chart = 'finalAction') => {
  const raw = paceCalRaw(cat, country, gapDays, chart);
  if (chart !== 'finalAction' || !raw) return raw;
  // FAMILY categories only: filing runs on chart B there, so approval (A) can never
  // land before filing (B) and A's estimate is floored to B's — B is a real,
  // steadily-moving gate for family cases, so the floor imports a credible number.
  // EMPLOYMENT categories are exempt: filing runs on chart A, and chart B is a
  // frozen intake lever whose extrapolation is garbage (EB5-China: B said 11.8y
  // while A moves 30 days/mo — flooring A by that inflated a 5.2y wait to 11.8y).
  if (!FILING_AUTHORIZED[cat]) return raw;
  const floor = chartBFloorCal(cat, country, gapDays);
  return floor !== null ? Math.max(raw, floor) : raw;
};
// Whether the floor actually changed the number — the UI shows a one-line explanation
// only in that case.
const paceEtaFlooredToB = (cat, country, gapDaysA) => {
  if (!FILING_AUTHORIZED[cat]) return false;
  const raw = paceCalRaw(cat, country, gapDaysA, 'finalAction');
  if (!raw) return false;
  const floor = chartBFloorCal(cat, country, gapDaysA);
  return floor !== null && floor > raw;
};

// AI HYBRID PREDICTION MODEL (computeHybridAdvance, estimateMonthsToReachPD) — now imported
// from _gcMath.js above; see that file for the blending rationale.

// Legacy table (kept for backward compat; days-per-month for short-term estimates)
const historicalMovement = {
  EB1: { Other: 25, China: 25, India: 25, Taiwan: 25 },
  EB2: { Other: 90, China: 10, India: 35, Taiwan: 90 },
  EB3: { Other: 60, China: 12, India: 3, Taiwan: 60 },
  F1:  { Other: 20, China: 20, India: 20, Taiwan: 20 },
  F2A: { Other: 45, China: 45, India: 45, Taiwan: 45 },
  F2B: { Other: 12, China: 12, India: 12, Taiwan: 12 },
  F3:  { Other: 10, China: 10, India: 10, Taiwan: 10 },
  F4:  { Other: 8, China: 8, India: 5, Taiwan: 8 },
};

// bulletinCurrent / bulletinPrevious — MUTABLE references that the app reads from everywhere.
// At startup they hold May 2026 / April 2026. Two things can swap their contents:
//   1. GitHub Actions fetches /bulletin.json → Object.assign() replaces fields in place
//   2. Time Machine selector → Object.assign() from BULLETIN_ARCHIVE[selectedMonth]
// Both use in-place mutation so the const references stay valid throughout the app.
const bulletinCurrent = JSON.parse(JSON.stringify(bulletinMay2026));
const bulletinPrevious = JSON.parse(JSON.stringify(bulletinApril2026));

// ============================================================
// Logic helpers
// ============================================================
const parseDate = (s) => {
  if (!s || s === 'C') return null;
  return new Date(s + 'T00:00:00');
};
const daysBetween = (a, b) => Math.round((a - b) / (1000 * 60 * 60 * 24));
const formatDate = (s, lang) => {
  if (s === 'C') {
    if (lang === 'zh') return '无排期';
    if (lang === 'tw') return '無排期';
    return 'Current';
  }
  // null = the bulletin's U (see computeStatus). "无" read as missing data; say what
  // it actually means.
  if (!s || s === 'U') return lang === 'en' ? 'No visas (U)' : lang === 'tw' ? '本月無名額（U）' : '本月无名额（U）';
  const d = parseDate(s);
  if (lang === 'zh' || lang === 'tw') return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatDateShort = (s, lang) => {
  if (s === 'C') return lang === 'zh' ? '无排期' : lang === 'tw' ? '無排期' : 'Current';
  if (s === 'U') return 'U';
  if (!s) return 'U'; // null = the bulletin's U (no visas), not missing data
  const d = parseDate(s);
  if (lang === 'zh' || lang === 'tw') return `${d.getFullYear().toString().slice(-2)}年${d.getMonth() + 1}月`;
  return d.toLocaleDateString('en-US', { year: '2-digit', month: 'short' });
};
// computeStatus / computeMovement — now imported from _gcMath.js above.

// Forecast: probability + months-until-current (HYBRID model).
// `paceBasis` picks which observed pace anchors the estimate: 'conservative' (trailing
// 12-month average, the default) or 'recent' (this month's movement). The UI exposes it.
const computeForecast = (userCase, paceBasis = 'conservative') => {
  const country = resolveCountry(userCase.country);
  const cat = userCase.category;
  // IMPORTANT: Use finalAction (Table A) as the primary source — same as TrendChart.
  // This keeps Forecast tab and TrendChart in lockstep. Previously this used filing (Table B)
  // which created phantom mismatches when both tables diverged.
  const currentCutoff = bulletinCurrent.finalAction[cat]?.[country];
  const prevCutoff = bulletinPrevious.finalAction[cat]?.[country];

  if (currentCutoff === 'C') {
    return { alreadyCurrent: true, avgMovement: 999, confidence: 'high' };
  }
  const pd = parseDate(userCase.priorityDate);
  const co = parseDate(currentCutoff);
  const gapDays = daysBetween(co, pd);
  const thisMonthMovement = computeMovement(currentCutoff, prevCutoff);
  const thisMonthDays = thisMonthMovement.type === 'advanced' ? thisMonthMovement.days
    : thisMonthMovement.type === 'retrogressed' ? -thisMonthMovement.days : 0;

  // Two observed paces, both measured off real bulletins, neither invented:
  //   · "recent"       — this month's own movement (responsive, but very noisy)
  //   · "conservative" — the trailing 12-month average from BULLETIN_ARCHIVE
  // They can differ by years, so this returns BOTH and the UI shows a range. Default is
  // the conservative end: a single fast month is the weakest possible basis for a
  // multi-year promise, and over-promising here is the costly direction to be wrong in.
  const longTermRate = getLongTermRate(cat, country);  // days/year
  const longTermDpm = longTermRate / 12;
  const singleMonthPace = thisMonthDays > 0 ? thisMonthDays : longTermDpm;
  const archivePace = observedPaceFromArchive(cat, country);

  // Ordered by value, not by name — a month slower than the 12-month average flips them.
  const paceFast = archivePace !== null ? Math.max(singleMonthPace, archivePace) : singleMonthPace;
  const paceSlow = archivePace !== null ? Math.min(singleMonthPace, archivePace) : singleMonthPace;
  const recentDaysPerMonth = paceBasis === 'recent' ? paceFast : paceSlow;

  // The display "avgMovement" tracks whichever basis is selected
  const avgMovement = Math.round(recentDaysPerMonth);

  if (gapDays >= 0) {
    return { eligible: true, gapDays, avgMovement, thisMonthDays, confidence: 'high' };
  }

  const distanceDays = Math.abs(gapDays);

  const monthsAtPace = (pace) => (pace > 0
    ? estimateMonthsToReachPD(currentCutoff, userCase.priorityDate, pace, longTermRate, cat, country)
    : null);

  const monthsFast = monthsAtPace(paceFast);
  const monthsSlow = monthsAtPace(paceSlow);
  const monthsToCurrent = paceBasis === 'recent' ? monthsFast : monthsSlow;

  // Probability of becoming Current NEXT MONTH — now derived from the hybrid
  // one-month advance projection (month=1 from computeHybridAdvance) rather than
  // a flat linear heuristic. Keeps the probability bars consistent with the same
  // model the number above comes from.
  const catCountryKey = `${cat}-${country}`;
  const oneMonthAdvance = computeHybridAdvance(recentDaysPerMonth, longTermRate, 1, catCountryKey);
  let probCurrentNext = 0;
  if (oneMonthAdvance >= distanceDays) probCurrentNext = 0.75;
  else if (distanceDays < oneMonthAdvance * 1.5) probCurrentNext = 0.40;
  else if (distanceDays < oneMonthAdvance * 3) probCurrentNext = 0.10;
  else probCurrentNext = 0.02;

  let probAdvance = 0.60;
  if (thisMonthMovement.type === 'advanced') probAdvance = 0.72;
  if (thisMonthMovement.type === 'retrogressed') probAdvance = 0.35;
  if (thisMonthMovement.type === 'none') probAdvance = 0.45;

  const today = new Date();
  const fyEnd = new Date(today.getFullYear(), 8, 30);
  const monthsToFyEnd = Math.max(0, (fyEnd - today) / (1000 * 60 * 60 * 24 * 30));
  let probRetrogress = 0.10;
  if (monthsToFyEnd < 3) probRetrogress = 0.25;
  if (thisMonthMovement.type === 'retrogressed') probRetrogress = 0.40;

  let confidence = 'medium';
  if (longTermRate < 30) confidence = 'low'; // Severe backlog = low confidence
  if (monthsToCurrent && monthsToCurrent > 120) confidence = 'low'; // 10+ years = low
  if (recentDaysPerMonth >= 60 && thisMonthMovement.type === 'advanced') confidence = 'high';

  return {
    alreadyCurrent: false, eligible: false, distanceDays, avgMovement, thisMonthDays,
    // Raw months, rounded only at display — the email renders the same figures, and
    // rounding here instead made the two surfaces disagree by a month on the same case.
    monthsToCurrent: monthsToCurrent ?? null,
    probCurrentNext, probAdvance, probRetrogress, confidence,
    longTermRate, // expose for UI display
    // Range + the inputs behind it, so the UI can show both ends and say where they came from
    paceBasis,
    paceFast: Math.round(paceFast),
    paceSlow: Math.round(paceSlow),
    monthsFast: monthsFast ?? null,
    monthsSlow: monthsSlow ?? null,
    hasRange: Math.round(paceFast) !== Math.round(paceSlow),
  };
};

// ============================================================
// UI Primitives
// ============================================================
const Tooltip = ({ children, text }) => (
  <span className="group relative inline-flex items-center">
    {children}
    <span className="invisible group-hover:visible absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 px-2.5 py-2 text-[11px] z-20 leading-relaxed"
          style={{ background: 'var(--gc-ink)', color: 'var(--gc-paper)', borderRadius: '3px' }}>
      {text}
      <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent" style={{ borderTopColor: 'var(--gc-ink)' }}></span>
    </span>
  </span>
);

const StatusBadge = ({ status, daysAgo }) => {
  const { t, lang } = useLang();

  const configs = {
    current:    { bg: 'var(--gc-green-soft)',  bd: 'var(--gc-green-border)', fg: 'var(--gc-green-ink)', label: t.statusCurrent, icon: CheckCircle2 },
    eligible:   { bg: 'var(--gc-blue-soft)',   bd: 'var(--gc-blue-border)',  fg: 'var(--gc-blue)',      label: t.statusEligibleFile, icon: Zap },
    overdue:    { bg: 'var(--gc-green-soft)',  bd: 'var(--gc-green-border)', fg: 'var(--gc-green-ink)',
                  label: lang === 'en' ? 'No wait needed' : '无需排期', icon: CheckCircle2 },
    notCurrent: { bg: 'var(--gc-amber-soft)',  bd: 'var(--gc-amber-border)', fg: 'var(--gc-amber-ink)', label: t.statusNotCurrent, icon: Clock },
    // The bulletin printed U — no visas at all this month. Distinct from notCurrent:
    // there is no cutoff to be behind.
    unavailable: { bg: 'var(--gc-red-soft)',   bd: 'var(--gc-red-border)',   fg: 'var(--gc-red-ink)',
                  label: lang === 'en' ? 'No visas (U)' : lang === 'tw' ? '本月無名額' : '本月无名额', icon: Clock },
    suspicious: { bg: 'var(--gc-red-soft)',    bd: 'var(--gc-red-border)',   fg: 'var(--gc-red-ink)',
                  label: lang === 'en' ? 'Check your PD' : '请检查优先日', icon: AlertCircle },
  };
  const c = configs[status] || configs.notCurrent;
  const Icon = c.icon;
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold"
          style={{ backgroundColor: c.bg, border: `1px solid ${c.bd}`, color: c.fg, borderRadius: '2px', letterSpacing: '0.02em' }}>
      <Icon size={10} strokeWidth={2.5} />
      <span>{c.label}</span>
    </span>

  );
};

// 3-way Language Switcher — editorial segmented
const LangSwitcher = () => {
  const { lang, setLang } = useLang();
  const opts = [
    { v: 'en', label: 'EN', title: 'English' },
    { v: 'zh', label: '简', title: '简体中文' },
    { v: 'tw', label: '正', title: '正體中文' },
  ];
  return (
    <div className="inline-flex items-center flex-shrink-0"
         style={{ border: '1px solid var(--gc-rule)', borderRadius: '3px', overflow: 'hidden' }}>
      {opts.map((o, i) => (
        <button key={o.v} onClick={() => setLang(o.v)} title={o.title}
          style={{
            padding: '4px 7px',
            fontSize: '10px',
            fontWeight: 600,
            letterSpacing: '0.04em',
            borderLeft: i === 0 ? 'none' : '1px solid var(--gc-rule-soft)',
            background: lang === o.v ? 'var(--gc-green)' : 'transparent',
            color: lang === o.v ? 'var(--gc-paper)' : 'var(--gc-muted)',
            transition: 'all 120ms',
          }}>
          {o.label}
        </button>
      ))}
    </div>
  );
};

// ============================================================
// Input Panel
// Dropdown panels render through a PORTAL to document.body: the onboarding modal
// animates with transform and blurs with backdrop-filter, both of which hijack
// position:fixed descendants (the containing block becomes the modal, not the
// viewport) — panels ended up mispositioned and clipped. The portal escapes any
// such ancestor; the panel carries its own visa-root/theme wrapper for CSS vars.
const currentThemeAttr = () => {
  try {
    return document.querySelector('.visa-root[data-theme]')?.getAttribute('data-theme') || 'passport';
  } catch {
    return 'passport';
  }
};

// ============================================================
// CategoryDropdown — themed replacement for the native <select>. The OS draws a
// native select's option sheet (white system UI on iOS) and CSS can't reach it,
// so the picker is drawn in-page instead: grouped, scrollable, theme-tokened.
// ============================================================
const CategoryDropdown = ({ value, onChange, triggerStyle = {}, placeholder = '' }) => {
  const { t, lang } = useLang();
  const [open, setOpen] = useState(false);
  // Panel position is FIXED (viewport coords from the trigger's rect): ancestors use
  // overflow:hidden for expand animations, which clips an absolute panel.
  const [rect, setRect] = useState(null);
  const wrapRef = useRef(null);
  const panelRef = useRef(null);
  const toggleOpen = () => {
    if (!open && wrapRef.current) setRect(wrapRef.current.getBoundingClientRect());
    setOpen((v) => !v);
  };
  useEffect(() => {
    if (!open) return undefined;
    const inSelf = (t) => (wrapRef.current && wrapRef.current.contains(t))
      || (panelRef.current && panelRef.current.contains(t));
    const close = (e) => {
      if (!inSelf(e.target)) setOpen(false);
    };
    const onScroll = (e) => {
      // The panel scrolls internally — only close when the PAGE scrolls.
      if (inSelf(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('touchstart', close);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 400;
  const spaceBelow = rect ? vh - rect.bottom - 16 : 320;
  const panelMaxH = Math.max(200, Math.min(320, spaceBelow));
  const openUp = rect ? spaceBelow < 200 && rect.top > 260 : false;

  const groups = [
    { key: 'eb', label: lang === 'en' ? 'EMPLOYMENT · EB' : lang === 'tw' ? '職業移民 · EB' : '职业移民 · EB', items: ['EB1', 'EB2', 'EB3', 'EW', 'EB4', 'SR', 'EB5', 'EB5R', 'EB5H', 'EB5I'] },
    { key: 'f', label: lang === 'en' ? 'FAMILY · F' : lang === 'tw' ? '親屬移民 · F' : '亲属移民 · F', items: ['F1', 'F2A', 'F2B', 'F3', 'F4'] },
  ];
  const descOf = (v) => (t[v.toLowerCase()] || v).replace(/^(EB[-]?\d[A-Z]?|F\d[A-Z]?|SR)\s*/i, '');
  const curDesc = value ? descOf(value) : '';

  return (
    <div ref={wrapRef} style={{ position: 'relative', minWidth: 0 }}>
      <button type="button" onClick={toggleOpen}
        className="flex items-center justify-between"
        style={{
          boxSizing: 'border-box', width: '100%', minWidth: 0, gap: '6px',
          padding: '6px 7px', fontSize: '11px', fontWeight: 600, textAlign: 'left',
          color: 'var(--gc-ink)', background: 'var(--gc-surface)',
          border: open ? '1px solid var(--gc-green)' : '1px solid var(--gc-rule)',
          borderRadius: '3px', cursor: 'pointer',
          ...triggerStyle,
        }}>
        <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value ? (
            <>
              <span className="gc-mono" style={{ fontWeight: 700 }}>{value}</span>
              <span style={{ color: 'var(--gc-ink-soft)', fontWeight: 500 }}> {curDesc}</span>
            </>
          ) : (
            <span style={{ color: 'var(--gc-muted)', fontWeight: 400 }}>{placeholder}</span>
          )}
        </span>
        <span style={{ flexShrink: 0, color: 'var(--gc-muted)', fontSize: '8px', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 120ms' }}>▼</span>
      </button>
      {open && rect && createPortal(
        <div ref={panelRef} className="visa-root" data-theme={currentThemeAttr()} style={{
          position: 'fixed', zIndex: 1200,
          top: openUp ? undefined : rect.bottom + 4,
          bottom: openUp ? (vh - rect.top + 4) : undefined,
          left: Math.max(8, Math.min(rect.left, vw - Math.min(vw * 0.78, 300) - 8)),
          width: 'min(78vw, 300px)', maxHeight: `${panelMaxH}px`, overflowY: 'auto',
          WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain',
          background: 'var(--gc-surface)', border: '1px solid var(--gc-rule)',
          borderTop: '2px solid var(--gc-green)', borderRadius: '4px',
          boxShadow: '0 14px 40px rgba(0,0,0,0.18)',
        }}>
          {groups.map((g) => (
            <div key={g.key}>
              <div className="gc-eyebrow" style={{
                position: 'sticky', top: 0, fontSize: '8.5px', letterSpacing: '0.12em', fontWeight: 700,
                color: 'var(--gc-green)', background: 'var(--gc-paper-soft)',
                padding: '5px 10px 4px', borderBottom: '1px solid var(--gc-rule-soft)',
              }}>{g.label}</div>
              {g.items.map((v) => {
                const sel = v === value;
                return (
                  <button key={v} type="button"
                    onClick={() => { onChange(v); setOpen(false); }}
                    className="flex items-center"
                    style={{
                      width: '100%', gap: '7px', padding: '7px 10px', border: 'none', textAlign: 'left',
                      cursor: 'pointer', fontSize: '11.5px', lineHeight: 1.4,
                      background: sel ? 'var(--gc-green-soft)' : 'transparent',
                      color: 'var(--gc-ink)',
                      borderLeft: sel ? '2px solid var(--gc-green)' : '2px solid transparent',
                    }}>
                    <span className="gc-mono" style={{ fontWeight: 700, flexShrink: 0, minWidth: '38px', color: sel ? 'var(--gc-green-ink)' : 'var(--gc-ink)' }}>{v}</span>
                    <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--gc-ink-soft)' }}>{descOf(v)}</span>
                    {sel && <span style={{ marginLeft: 'auto', flexShrink: 0, color: 'var(--gc-green)', fontWeight: 700 }}>✓</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
};

// ============================================================
// CATEGORY_SUBTYPES — the identification layer under each bulletin category.
// Bulletin dates never differ INSIDE a parent category: the rows that do move
// independently (SR, EW, EB-5 set-asides) are already top-level options. So the
// subtype is stored purely to know who the user is — analytics, email
// segmentation, future personalization — and the UI says so out loud.
const CATEGORY_SUBTYPES = {
  EB1: [
    ['eb1a', 'EB-1A 杰出人才', 'EB-1A 傑出人才', 'EB-1A extraordinary'],
    ['eb1b', 'EB-1B 教授/研究员', 'EB-1B 教授/研究員', 'EB-1B researcher'],
    ['eb1c', 'EB-1C 跨国高管', 'EB-1C 跨國高管', 'EB-1C executive'],
  ],
  EB2: [
    ['perm', '雇主担保 PERM', '雇主擔保 PERM', 'PERM sponsored'],
    ['niw', 'NIW 自我申请', 'NIW 自我申請', 'NIW self-petition'],
    ['scha', 'Schedule A 护士/理疗', 'Schedule A 護士/理療', 'Schedule A'],
  ],
  EB3: [
    ['prof', '专业人员(本科)', '專業人員(本科)', 'Professional'],
    ['skilled', '技术工(≥2年经验)', '技術工(≥2年經驗)', 'Skilled worker'],
  ],
  EB4: [
    ['sijs', 'SIJS 特殊青少年', 'SIJS 特殊青少年', 'SIJS'],
    ['un', '联合国/国际组织', '聯合國/國際組織', "UN / int'l org"],
    ['other4', '其他特殊移民', '其他特殊移民', 'Other special'],
  ],
  EB5: [
    ['direct', '直接投资', '直接投資', 'Direct investment'],
    ['rc', '区域中心', '區域中心', 'Regional Center'],
  ],
};

const subtypeLabel = (cat, id, lang) => {
  const row = (CATEGORY_SUBTYPES[cat] || []).find((o) => o[0] === id);
  if (!row) return null;
  return lang === 'en' ? row[3] : lang === 'tw' ? row[2] : row[1];
};

// defaultSubtype — the subtype field should never sit empty: whenever a category
// has subtypes, pre-pick the first one instead of nulling it out. Users can still
// change it, they just can't be left with no selection after a category swap.
const defaultSubtype = (cat) => (CATEGORY_SUBTYPES[cat] ? CATEGORY_SUBTYPES[cat][0][0] : null);

// SubtypeChips — single-select pills under the category picker. `subtype` is never
// left empty (see defaultSubtype): picking a different chip changes it, tapping the
// already-active chip is a no-op. `required`/`error` are kept as a belt-and-suspenders
// check for any legacy record that still has a null subtype on file.
const SubtypeChips = ({ userCase, setUserCase, required = false, error = false }) => {
  const { lang } = useLang();
  const opts = CATEGORY_SUBTYPES[userCase.category];
  if (!opts) return null;
  return (
    <div style={{ marginTop: '7px' }}>
      <div className="flex" style={{ gap: '5px', flexWrap: 'wrap' }}>
        {opts.map(([id, zh, tw, en]) => {
          const on = userCase.subtype === id;
          return (
            <button key={id} type="button"
              onClick={() => { if (!on) setUserCase({ ...userCase, subtype: id }); }}
              style={{
                padding: '4px 9px', fontSize: '10.5px', fontWeight: on ? 700 : 500,
                border: `1px solid ${on ? 'var(--gc-green)' : error ? 'var(--gc-red)' : 'var(--gc-rule)'}`,
                borderRadius: '11px',
                background: on ? 'var(--gc-green)' : 'var(--gc-surface)',
                color: on ? 'var(--gc-paper)' : 'var(--gc-ink-soft)',
                cursor: 'pointer', transition: 'all 120ms',
              }}>
              {lang === 'en' ? en : lang === 'tw' ? tw : zh}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// DateDropdown — themed priority-date picker. The native date input opens the OS
// wheel (system UI, unstylable); this draws the picker in-page instead: a year
// stepper (tap the year for a full tappable grid — no scrolling), a 12-month grid,
// a day grid. Same fixed-position pattern as CategoryDropdown (ancestors clip absolute
// panels with their overflow:hidden animations).
// ============================================================
const DateDropdown = ({ value, onChange, triggerStyle = {}, allowEmpty = false, placeholder = '', minYear = 1995, newestYearFirst = false }) => {
  const { lang } = useLang();
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState(null);
  // 'ymd' = steppers + month/day grids; 'years' = full tappable year grid. NO
  // horizontal scrolling anywhere — a scrolled-away year is an unfindable year
  // (first-time users on iOS could not reach their year in the old swipe strip).
  const [view, setView] = useState('ymd');
  const wrapRef = useRef(null);
  const panelRef = useRef(null);
  const rawParts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  const hasValue = !!rawParts;
  // Empty + allowEmpty: the panel still needs a cursor position — default to今年.
  const parts = rawParts || [null, String(new Date().getFullYear()), '01', '01'];
  const y = parseInt(parts[1], 10);
  const m = parseInt(parts[2], 10);
  const d = parseInt(parts[3], 10);

  const toggleOpen = () => {
    if (!open && wrapRef.current) {
      setRect(wrapRef.current.getBoundingClientRect());
      setView('ymd');
    }
    setOpen((v) => !v);
  };
  useEffect(() => {
    if (!open) return undefined;
    const inSelf = (t) => (wrapRef.current && wrapRef.current.contains(t))
      || (panelRef.current && panelRef.current.contains(t));
    const close = (e) => {
      if (!inSelf(e.target)) setOpen(false);
    };
    const onScroll = (e) => {
      // The panel scrolls internally (year strip) — only close on outside scrolls.
      if (inSelf(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('touchstart', close);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open]);
  const pad2 = (n) => String(n).padStart(2, '0');
  const daysInMonth = (yy, mm) => new Date(yy, mm, 0).getDate();
  const setDate = (ny, nm, nd, closeAfter = false) => {
    const nd2 = Math.min(nd, daysInMonth(ny, nm));
    onChange(`${ny}-${pad2(nm)}-${pad2(nd2)}`);
    if (closeAfter) setOpen(false);
  };

  const thisYear = new Date().getFullYear();
  const years = [];
  for (let yy = minYear; yy <= thisYear; yy++) years.push(yy);
  if (newestYearFirst) years.reverse();
  const dim = daysInMonth(y, m);
  const days = [];
  for (let dd = 1; dd <= dim; dd++) days.push(dd);

  const fmt = hasValue
    ? (lang === 'en'
        ? new Date(y, m - 1, d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
        : `${y}年${m}月${d}日`)
    : (placeholder || (lang === 'en' ? 'Select date' : lang === 'tw' ? '選擇日期' : '选择日期'));

  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 400;
  const spaceBelow = rect ? vh - rect.bottom - 16 : 340;
  const spaceAbove = rect ? rect.top - 16 : 340;
  const openUp = rect ? (spaceBelow < 340 && spaceAbove > spaceBelow) : false;
  // The panel must never extend past the screen edge (the onboarding modal puts the
  // trigger near the bottom — an unbounded upward panel lost its year section off
  // the top). Cap height to the chosen side's space and scroll internally.
  const panelMaxH = Math.max(220, Math.min(440, openUp ? spaceAbove : spaceBelow));

  const gridBtn = (sel) => ({
    border: 'none', borderRadius: '3px', cursor: 'pointer', padding: '6px 0',
    fontSize: '11px', fontWeight: sel ? 700 : 500, textAlign: 'center',
    background: sel ? 'var(--gc-green)' : 'var(--gc-paper-soft)',
    color: sel ? 'var(--gc-paper)' : 'var(--gc-ink-soft)',
  });

  return (
    <div ref={wrapRef} style={{ position: 'relative', minWidth: 0 }}>
      <button type="button" onClick={toggleOpen}
        className="flex items-center justify-between gc-mono"
        style={{
          boxSizing: 'border-box', width: '100%', minWidth: 0, gap: '6px',
          padding: '6px 7px', fontSize: '11px', fontWeight: 600, textAlign: 'left',
          color: 'var(--gc-ink)', background: 'var(--gc-surface)',
          border: open ? '1px solid var(--gc-green)' : '1px solid var(--gc-rule)',
          borderRadius: '3px', cursor: 'pointer',
          ...triggerStyle,
        }}>
        <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: hasValue ? 'inherit' : 'var(--gc-muted)', fontWeight: hasValue ? 'inherit' : 400 }}>{fmt}</span>
        <span className="flex items-center flex-shrink-0" style={{ gap: '6px' }}>
          {allowEmpty && hasValue && (
            <span role="button" onClick={(e) => { e.stopPropagation(); onChange(''); setOpen(false); }}
              style={{ color: 'var(--gc-muted)', fontSize: '11px', lineHeight: 1, padding: '2px' }}>✕</span>
          )}
          <span style={{ color: 'var(--gc-muted)', fontSize: '8px', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 120ms' }}>▼</span>
        </span>
      </button>
      {open && rect && createPortal(
        <div ref={panelRef} className="visa-root" data-theme={currentThemeAttr()} style={{
          position: 'fixed', zIndex: 1200,
          top: openUp ? undefined : rect.bottom + 4,
          bottom: openUp ? (vh - rect.top + 4) : undefined,
          left: Math.max(8, Math.min(rect.left, vw - Math.min(vw * 0.86, 320) - 8)),
          width: 'min(86vw, 320px)', maxHeight: `${panelMaxH}px`,
          overflowY: 'auto', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain',
          background: 'var(--gc-surface)', border: '1px solid var(--gc-rule)',
          borderTop: '2px solid var(--gc-green)', borderRadius: '4px',
          boxShadow: '0 14px 40px rgba(0,0,0,0.18)', padding: '10px',
        }}>
          {view === 'years' ? (
            <>
              <div className="gc-eyebrow" style={{ fontSize: '8.5px', letterSpacing: '0.12em', fontWeight: 700, color: 'var(--gc-green)', marginBottom: '5px' }}>
                {lang === 'en' ? 'PICK A YEAR' : lang === 'tw' ? '選擇年份' : '选择年份'}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px' }}>
                {years.map((yy) => (
                  <button key={yy} type="button"
                    onClick={() => { setDate(yy, m, d); setView('ymd'); }}
                    className="gc-mono" style={gridBtn(yy === y)}>
                    {yy}
                  </button>
                ))}
              </div>
            </>
          ) : (
          <>
          <div className="gc-eyebrow" style={{ fontSize: '8.5px', letterSpacing: '0.12em', fontWeight: 700, color: 'var(--gc-green)', marginBottom: '5px' }}>
            {lang === 'en' ? 'YEAR' : '年'}
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button type="button" onClick={() => y > minYear && setDate(y - 1, m, d)}
              className="gc-mono" style={{ ...gridBtn(false), width: '44px', opacity: y <= minYear ? 0.35 : 1 }}>
              ‹
            </button>
            <button type="button" onClick={() => setView('years')}
              className="gc-mono"
              style={{
                flex: 1, border: '1px solid var(--gc-green)', borderRadius: '3px', cursor: 'pointer',
                padding: '6px 0', fontSize: '12px', fontWeight: 700, textAlign: 'center',
                background: 'var(--gc-green-soft)', color: 'var(--gc-green-ink)',
              }}>
              {y} ▾
            </button>
            <button type="button" onClick={() => y < thisYear && setDate(y + 1, m, d)}
              className="gc-mono" style={{ ...gridBtn(false), width: '44px', opacity: y >= thisYear ? 0.35 : 1 }}>
              ›
            </button>
          </div>
          <div className="gc-eyebrow" style={{ fontSize: '8.5px', letterSpacing: '0.12em', fontWeight: 700, color: 'var(--gc-green)', margin: '7px 0 5px' }}>
            {lang === 'en' ? 'MONTH' : '月'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '4px' }}>
            {[1,2,3,4,5,6,7,8,9,10,11,12].map((mm) => (
              <button key={mm} type="button" onClick={() => setDate(y, mm, d)}
                className="gc-mono" style={gridBtn(mm === m)}>
                {mm}
              </button>
            ))}
          </div>
          <div className="gc-eyebrow" style={{ fontSize: '8.5px', letterSpacing: '0.12em', fontWeight: 700, color: 'var(--gc-green)', margin: '7px 0 5px' }}>
            {lang === 'en' ? 'DAY' : '日'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
            {days.map((dd) => (
              <button key={dd} type="button" onClick={() => setDate(y, m, dd, true)}
                className="gc-mono" style={gridBtn(dd === d)}>
                {dd}
              </button>
            ))}
          </div>
          </>
          )}
        </div>,
        document.body
      )}
    </div>
  );
};

// YearMonthDropdown — same trigger/panel styling as DateDropdown, but year+month
// only (no day grid). Used for fields like date of birth where a day isn't asked.
// ============================================================
// A single flat-list dropdown (no stepper/grid navigation), reused twice below for
// year and month. Native <select> was tried first but its option list is OS-chrome
// and can't be styled consistently across platforms, so this stays a custom
// in-page popup matching the rest of the app's dropdown look.
const SimpleListDropdown = ({ options, value, onChange, placeholder, style = {} }) => {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState(null);
  const wrapRef = useRef(null);
  const panelRef = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const inSelf = (t) => (wrapRef.current && wrapRef.current.contains(t)) || (panelRef.current && panelRef.current.contains(t));
    const close = (e) => { if (!inSelf(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('touchstart', close); };
  }, [open]);
  const selected = options.find((o) => String(o.value) === String(value));
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const panelMaxH = rect ? Math.max(160, Math.min(260, vh - rect.bottom - 20)) : 220;
  return (
    <div ref={wrapRef} style={{ position: 'relative', flex: 1, minWidth: 0 }}>
      <button type="button"
        onClick={() => { if (!open && wrapRef.current) setRect(wrapRef.current.getBoundingClientRect()); setOpen((v) => !v); }}
        className="flex items-center justify-between gc-mono"
        style={{
          boxSizing: 'border-box', width: '100%', gap: '6px',
          padding: '6px 7px', fontSize: '11px', fontWeight: 600, textAlign: 'left',
          color: selected ? 'var(--gc-ink)' : 'var(--gc-muted)', background: 'var(--gc-surface)',
          border: open ? '1px solid var(--gc-green)' : '1px solid var(--gc-rule)',
          borderRadius: '3px', cursor: 'pointer',
          ...style,
        }}>
        <span>{selected ? selected.label : placeholder}</span>
        <span style={{ color: 'var(--gc-muted)', fontSize: '8px', transform: open ? 'rotate(180deg)' : 'none' }}>▼</span>
      </button>
      {open && rect && createPortal(
        <div ref={panelRef} className="visa-root" data-theme={currentThemeAttr()} style={{
          position: 'fixed', zIndex: 1200, top: rect.bottom + 4, left: rect.left, width: Math.max(rect.width, 88),
          maxHeight: `${panelMaxH}px`, overflowY: 'auto', WebkitOverflowScrolling: 'touch',
          background: 'var(--gc-surface)', border: '1px solid var(--gc-rule)', borderTop: '2px solid var(--gc-green)',
          borderRadius: '4px', boxShadow: '0 14px 40px rgba(0,0,0,0.18)', padding: '4px',
        }}>
          {options.map((o) => (
            <button key={o.value} type="button" onClick={() => { onChange(o.value); setOpen(false); }}
              className="gc-mono" style={{
                display: 'block', width: '100%', textAlign: 'left', border: 'none', borderRadius: '3px',
                padding: '6px 8px', fontSize: '11px', cursor: 'pointer',
                fontWeight: String(o.value) === String(value) ? 700 : 500,
                background: String(o.value) === String(value) ? 'var(--gc-green)' : 'transparent',
                color: String(o.value) === String(value) ? 'var(--gc-paper)' : 'var(--gc-ink)',
              }}>
              {o.label}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
};

// Order follows locale convention: zh/tw = 年→月, en = Month→Year (US date convention).
const YearMonthDropdown = ({ value, onChange, triggerStyle = {}, allowEmpty = false, placeholder = '' }) => {
  const { lang } = useLang();
  const rawParts = /^(\d{4})-(\d{2})$/.exec(value || '');
  // Local pending state so picking just the year doesn't silently commit a
  // month (e.g. defaulting to January) before both halves are actually chosen —
  // onChange only fires once year AND month are both known.
  const [pendingY, setPendingY] = useState(rawParts ? rawParts[1] : '');
  const [pendingM, setPendingM] = useState(rawParts ? rawParts[2] : '');
  useEffect(() => {
    const rp = /^(\d{4})-(\d{2})$/.exec(value || '');
    setPendingY(rp ? rp[1] : '');
    setPendingM(rp ? rp[2] : '');
  }, [value]);
  const pad2 = (n) => String(n).padStart(2, '0');

  const thisYear = new Date().getFullYear();
  const yearOpts = [];
  for (let yy = thisYear; yy >= 1930; yy--) yearOpts.push({ value: String(yy), label: lang === 'en' ? String(yy) : `${yy}年` });
  const monthNamesEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthOpts = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((mm) => ({
    value: pad2(mm), label: lang === 'en' ? monthNamesEn[mm - 1] : `${mm}月`,
  }));

  const setY = (ny) => { setPendingY(ny); if (pendingM) onChange(`${ny}-${pendingM}`); };
  const setM = (nm) => { setPendingM(nm); if (pendingY) onChange(`${pendingY}-${nm}`); };

  const yearPicker = (
    <SimpleListDropdown key="y" options={yearOpts} value={pendingY} onChange={setY}
      placeholder={lang === 'en' ? 'Year' : '年'} style={triggerStyle} />
  );
  const monthPicker = (
    <SimpleListDropdown key="m" options={monthOpts} value={pendingM} onChange={setM}
      placeholder={lang === 'en' ? 'Month' : '月'} style={triggerStyle} />
  );

  return (
    <div className="flex items-center" style={{ gap: '6px', minWidth: 0 }}>
      {lang === 'en' ? [monthPicker, yearPicker] : [yearPicker, monthPicker]}
      {allowEmpty && (pendingY || pendingM) && (
        <button type="button" onClick={() => { setPendingY(''); setPendingM(''); onChange(''); }}
          aria-label="clear"
          style={{ flexShrink: 0, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--gc-muted)', fontSize: '13px', padding: '4px' }}>
          ✕
        </button>
      )}
    </div>
  );
};

// ============================================================
const InputPanel = ({ userCase, setUserCase }) => {
  const { t, lang } = useLang();
  const categories = [
    { v: 'EB1', label: t.eb1 }, { v: 'EB2', label: t.eb2 }, { v: 'EB3', label: t.eb3 },
    { v: 'EW', label: t.ew },
    { v: 'EB4', label: t.eb4 }, { v: 'SR', label: t.sr }, { v: 'EB5', label: t.eb5 },
    { v: 'EB5R', label: t.eb5r }, { v: 'EB5H', label: t.eb5h }, { v: 'EB5I', label: t.eb5i },
    { v: 'F1', label: t.f1 }, { v: 'F2A', label: t.f2a }, { v: 'F2B', label: t.f2b },
    { v: 'F3', label: t.f3 }, { v: 'F4', label: t.f4 },
  ];
  const countries = [
    { v: 'Taiwan', label: t.countryTaiwan },
    { v: 'China', label: t.countryChina },
    { v: 'India', label: t.countryIndia },
    { v: 'Mexico', label: t.countryMexico },
    { v: 'Philippines', label: t.countryPhilippines },
  ];

  return (
    <div style={{
           background: 'var(--gc-surface)',
           border: '1px solid var(--gc-rule)',
           borderRadius: '4px',
           boxSizing: 'border-box',
           width: '100%',
           maxWidth: '100%',
           overflow: 'hidden',
         }}>
      {/* Header with hairline */}
      <div style={{ padding: '10px 12px 8px', borderBottom: '1px solid var(--gc-rule-soft)' }}>
        <div className="gc-eyebrow">{t.inputTitle}</div>
        <p style={{ fontSize: '10px', color: 'var(--gc-muted)', marginTop: '2px', lineHeight: 1.4 }}>
          {t.inputSubtitle}
        </p>
      </div>

      <div style={{ padding: '10px 12px 12px' }}>
        {/* Country row */}
        <div style={{ width: '100%', marginBottom: '10px' }}>
          <div className="flex items-center gap-1 mb-1.5">
            <MapPin size={10} style={{ color: 'var(--gc-muted-soft)' }} className="flex-shrink-0" />
            <span className="gc-label" style={{ fontSize: '9px' }}>{t.countryLabel}</span>
          </div>
          <div className="grid grid-cols-5" style={{ width: '100%', border: '1px solid var(--gc-rule)', borderRadius: '3px', overflow: 'hidden' }}>
            {countries.map((c, i) => {
              const selected = userCase.country === c.v;
              return (
                <button key={c.v} onClick={() => setUserCase({ ...userCase, country: c.v })}
                  style={{
                    boxSizing: 'border-box',
                    minWidth: 0,
                    padding: '7px 2px',
                    borderLeft: i === 0 ? 'none' : '1px solid var(--gc-rule-soft)',
                    background: selected ? 'var(--gc-green)' : 'var(--gc-surface)',
                    color: selected ? 'var(--gc-paper)' : 'var(--gc-ink-soft)',
                    transition: 'all 120ms',
                  }}
                  className="flex flex-col items-center gap-1 justify-center">
                  <CountryFlag country={c.v} size={16} />
                  <span className="gc-mono truncate" style={{ fontSize: '10px', fontWeight: 700, lineHeight: 1, letterSpacing: '0.08em' }}>
                    {countryShortLabel(c.v, lang)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3-column row: Category / PD / In-US */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px', width: '100%', marginBottom: '2px' }}>
          {/* Category */}
          <div style={{ minWidth: 0 }}>
            <div className="flex items-center gap-1 mb-1">
              <Briefcase size={10} style={{ color: 'var(--gc-muted-soft)' }} className="flex-shrink-0" />
              <span className="gc-label" style={{ fontSize: '9px' }}>{t.categoryLabel}</span>
            </div>
            <CategoryDropdown value={userCase.category}
              triggerStyle={{ padding: '9px 9px' }}
              onChange={(newCat) => {
                if (newCat === userCase.category) return;
                let newPetitioner = userCase.petitionerStatus;
                if (newCat === 'F2A' || newCat === 'F2B') newPetitioner = 'LPR';
                else if (newCat === 'F1' || newCat === 'F3' || newCat === 'F4') newPetitioner = 'USC';
                setUserCase({ ...userCase, category: newCat, petitionerStatus: newPetitioner, subtype: defaultSubtype(newCat) });
              }} />
          </div>

          {/* Priority Date */}
          <div style={{ minWidth: 0 }}>
            <div className="flex items-center gap-1 mb-1">
              <Calendar size={10} style={{ color: 'var(--gc-muted-soft)' }} className="flex-shrink-0" />
              <span className="gc-label" style={{ fontSize: '9px' }}>{t.priorityDateLabel}</span>
            </div>
            <DateDropdown value={userCase.priorityDate}
              triggerStyle={{ padding: '9px 9px' }}
              onChange={(pd) => setUserCase({ ...userCase, priorityDate: pd })} />
          </div>

          {/* In US toggle */}
          <div style={{ minWidth: 0 }}>
            <div className="flex items-center justify-center gap-0.5 mb-1">
              <Home size={10} style={{ color: 'var(--gc-muted-soft)' }} className="flex-shrink-0" />
              <span className="gc-label" style={{ fontSize: '9px' }}>{lang === 'en' ? 'In US' : '在美'}</span>
            </div>
            <button onClick={() => setUserCase({ ...userCase, inUS: !userCase.inUS })}
              style={{
                boxSizing: 'border-box',
                minWidth: '56px',
                padding: '9px 8px',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.04em',
                background: userCase.inUS ? 'var(--gc-ink)' : 'var(--gc-surface)',
                color: userCase.inUS ? 'var(--gc-paper)' : 'var(--gc-ink-soft)',
                border: '1px solid ' + (userCase.inUS ? 'var(--gc-ink)' : 'var(--gc-rule)'),
                borderRadius: '3px',
                transition: 'all 120ms',
              }}>
              {userCase.inUS ? (lang === 'en' ? 'YES' : '是') : (lang === 'en' ? 'NO' : '否')}
            </button>
          </div>
        </div>

        {/* Date of birth — optional, only powers the "how old will you be" line
            on the Overview countdown card. Year+month only; day defaults to the
            1st wherever an age gets computed from it. */}
        <div style={{ width: '100%', marginTop: '10px' }}>
          <div className="flex items-center gap-1 mb-1">
            <Calendar size={10} style={{ color: 'var(--gc-muted-soft)' }} className="flex-shrink-0" />
            <span className="gc-label" style={{ fontSize: '9px' }}>
              {lang === 'en' ? 'Date of birth (optional)' : lang === 'tw' ? '出生年月（選填）' : '出生年月（选填）'}
            </span>
          </div>
          <YearMonthDropdown value={userCase.birthYearMonth || ''} allowEmpty
            placeholder={lang === 'en' ? 'Not set' : '未填写'}
            triggerStyle={{ padding: '9px 9px' }}
            onChange={(ym) => setUserCase({ ...userCase, birthYearMonth: ym })} />
        </div>

        <SubtypeChips userCase={userCase} setUserCase={setUserCase} />

        {/* Petitioner Status — ONLY for F categories */}
        {userCase.category.startsWith('F') && (() => {
          const isF2 = userCase.category === 'F2A' || userCase.category === 'F2B';
          const expectedPetitioner = isF2 ? 'LPR' : 'USC';
          const isMismatch = userCase.petitionerStatus !== expectedPetitioner;

          return (
            <div style={{ width: '100%', marginTop: '10px' }}>
              <div className="flex items-center gap-1 mb-1">
                <Users size={10} style={{ color: 'var(--gc-muted-soft)' }} className="flex-shrink-0" />
                <span className="gc-label" style={{ fontSize: '9px' }}>{t.petitionerLabel}</span>
                <Tooltip text={t.petitionerHelp}>
                  <Info size={10} style={{ color: 'var(--gc-muted-soft)' }} />
                </Tooltip>
              </div>
              <div className="grid grid-cols-2" style={{ width: '100%', border: '1px solid var(--gc-rule)', borderRadius: '3px', overflow: 'hidden' }}>
                <button
                  onClick={() => setUserCase({ ...userCase, petitionerStatus: 'USC' })}
                  style={{
                    boxSizing: 'border-box',
                    padding: '9px 8px',
                    fontSize: '11px',
                    fontWeight: 600,
                    background: userCase.petitionerStatus === 'USC' ? 'var(--gc-ink)' : 'var(--gc-surface)',
                    color: userCase.petitionerStatus === 'USC' ? 'var(--gc-paper)' : 'var(--gc-ink-soft)',
                    transition: 'all 120ms',
                  }}
                  className="truncate">
                  {t.petitionerUSC}
                </button>
                <button
                  onClick={() => setUserCase({ ...userCase, petitionerStatus: 'LPR' })}
                  style={{
                    boxSizing: 'border-box',
                    padding: '9px 8px',
                    fontSize: '11px',
                    fontWeight: 600,
                    borderLeft: '1px solid var(--gc-rule-soft)',
                    background: userCase.petitionerStatus === 'LPR' ? 'var(--gc-green)' : 'var(--gc-surface)',
                    color: userCase.petitionerStatus === 'LPR' ? 'var(--gc-paper)' : 'var(--gc-ink-soft)',
                    transition: 'all 120ms',
                  }}
                  className="truncate">
                  {t.petitionerLPR}
                </button>
              </div>

              {/* Mismatch warning */}
              {isMismatch && (
                <div style={{
                  marginTop: '8px',
                  padding: '7px 9px',
                  background: 'var(--gc-amber-soft)',
                  border: '1px solid var(--gc-amber-border)',
                  borderRadius: '3px',
                  fontSize: '10px',
                  color: 'var(--gc-amber-ink)',
                  lineHeight: 1.5,
                }}>
                  <div className="flex items-center gap-1 mb-0.5" style={{ fontWeight: 700 }}>
                    <AlertTriangle size={10} className="flex-shrink-0" />
                    {t.petitionerMismatch}
                  </div>
                  <div>{userCase.petitionerStatus === 'USC' ? t.petitionerMismatchUSC : t.petitionerMismatchLPR}</div>
                </div>
              )}

              {/* Info note */}
              {!isMismatch && isF2 && (
                <div style={{
                  marginTop: '8px',
                  padding: '7px 9px',
                  background: 'var(--gc-blue-soft)',
                  border: '1px solid var(--gc-blue-border)',
                  borderRadius: '3px',
                  fontSize: '10px',
                  color: 'var(--gc-blue-ink)',
                  lineHeight: 1.5,
                }}>
                  <div className="flex items-start gap-1.5">
                    <Info size={10} className="flex-shrink-0" style={{ marginTop: '2px' }} />
                    <span>{t.petitionerInfo}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
};

// ============================================================
// Compact Case Bar — used on all non-Overview pages
// Three fields inline: country / category / priority date. F-category adds
// a fourth (petitioner) inline when needed. Taps open inline controls.
// ============================================================
const CompactCaseBar = ({ userCase, setUserCase, defaultExpanded = false }) => {
  const { t, lang } = useLang();
  const [expanded, setExpanded] = useState(defaultExpanded);
  const categories = [
    { v: 'EB1' }, { v: 'EB2' }, { v: 'EB3' }, { v: 'EW' },
    { v: 'EB4' }, { v: 'SR' }, { v: 'EB5' }, { v: 'EB5R' }, { v: 'EB5H' }, { v: 'EB5I' },
    { v: 'F1' }, { v: 'F2A' }, { v: 'F2B' }, { v: 'F3' }, { v: 'F4' },
  ];
  const countries = [
    { v: 'Taiwan' }, { v: 'China' }, { v: 'India' }, { v: 'Mexico' }, { v: 'Philippines' },
  ];
  const isF = userCase.category.startsWith('F');
  const isF2 = userCase.category === 'F2A' || userCase.category === 'F2B';
  const expectedPetitioner = isF2 ? 'LPR' : 'USC';
  const mismatch = isF && userCase.petitionerStatus !== expectedPetitioner;

  // Compact date: 2024-07-15 → "2024/7/15"
  const formatCompactPD = (pd) => {
    if (!pd) return '—';
    const [y, m, d] = pd.split('-');
    return `${y}/${parseInt(m, 10)}/${parseInt(d, 10)}`;
  };

  return (
    <div style={{
      background: 'var(--gc-surface)',
      border: '1px solid var(--gc-rule)',
      borderRadius: 'var(--gc-radius)',
      marginBottom: '10px',
      boxSizing: 'border-box',
      width: '100%',
      maxWidth: '100%',
      overflow: 'hidden',
      transition: 'all 140ms',
    }}>
      {/* COLLAPSED header — always visible, click to toggle expand */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%',
          padding: '8px 10px',
          background: 'transparent',
          border: 'none',
          borderBottom: expanded ? '1px solid var(--gc-rule-soft)' : 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          textAlign: 'left',
          minWidth: 0,
        }}>
        <span className="gc-eyebrow" style={{ fontSize: '8px', letterSpacing: '0.14em', flexShrink: 0, color: 'var(--gc-muted)' }}>
          {lang === 'en' ? 'Case' : lang === 'tw' ? '案件' : '案件'}
        </span>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0, overflow: 'hidden' }}>
          <CountryFlag country={userCase.country} size={12} />
          <span className="gc-mono" style={{ fontSize: '10px', fontWeight: 700, color: 'var(--gc-ink)', letterSpacing: '0.06em', flexShrink: 0 }}>
            {countryShortLabel(userCase.country, lang)}
          </span>
          <span style={{ color: 'var(--gc-rule)', flexShrink: 0 }}>·</span>
          <span className="gc-serif" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--gc-ink)', letterSpacing: '-0.005em', flexShrink: 0 }}>
            {userCase.category}
          </span>
          <span style={{ color: 'var(--gc-rule)', flexShrink: 0 }}>·</span>
          <span className="gc-mono" style={{ fontSize: '11px', color: 'var(--gc-ink-soft)', flexShrink: 0, fontWeight: 500 }}>
            {formatCompactPD(userCase.priorityDate)}
          </span>
          {isF && (
            <>
              <span style={{ color: 'var(--gc-rule)', flexShrink: 0 }}>·</span>
              <span className="gc-mono" style={{
                fontSize: '9px', fontWeight: 700, letterSpacing: '0.04em',
                color: userCase.petitionerStatus === 'LPR' ? 'var(--gc-green)' : 'var(--gc-ink-soft)',
                flexShrink: 0,
              }}>
                {lang === 'en'
                  ? userCase.petitionerStatus
                  : userCase.petitionerStatus === 'LPR' ? (lang === 'tw' ? '綠卡' : '绿卡') : '公民'}
              </span>
            </>
          )}
          {mismatch && !expanded && (
            <AlertTriangle size={11} style={{ color: 'var(--gc-amber)', flexShrink: 0, marginLeft: 'auto' }} />
          )}
        </div>
        <span className="gc-eyebrow" style={{
          fontSize: '9px',
          color: expanded ? 'var(--gc-ink)' : 'var(--gc-paper)',
          flexShrink: 0,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          letterSpacing: '0.08em',
          padding: '4px 8px',
          border: `1px solid ${expanded ? 'var(--gc-rule)' : 'var(--gc-green)'}`,
          background: expanded ? 'var(--gc-paper-soft)' : 'var(--gc-green)',
          borderRadius: '3px',
          fontWeight: 700,
          transition: 'all 140ms',
        }}>
          {expanded
            ? (lang === 'en' ? 'CLOSE' : lang === 'tw' ? '收起' : '收起')
            : (lang === 'en' ? '✎ EDIT CASE'  : lang === 'tw' ? '✎ 編輯案子'  : '✎ 编辑案子')}
          <span style={{
            fontSize: '11px',
            transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 140ms',
            display: 'inline-block',
            lineHeight: 1,
          }}>⌄</span>
        </span>
      </button>

      {/* EXPANDED body — segmented controls for editing */}
      {expanded && (
        <div style={{ padding: '8px 8px 8px' }}>
          <div className="gc-eyebrow" style={{ fontSize: '8.5px', color: 'var(--gc-muted)', margin: '2px 2px 7px', letterSpacing: '0.12em' }}>
            {lang === 'en' ? 'EDIT · COUNTRY / CATEGORY / PRIORITY DATE' : lang === 'tw' ? '編輯 · 國籍／類別／優先日' : '编辑 · 国籍／类别／优先日'}
          </div>
          {/* Country segmented — 5 tight buttons (flag + passport code) */}
          <div className="grid grid-cols-5" style={{
            border: '1px solid var(--gc-rule)',
            borderRadius: '3px',
            overflow: 'hidden',
            marginBottom: '6px',
          }}>
            {countries.map((c, i) => {
              const selected = userCase.country === c.v;
              return (
                <button key={c.v} onClick={() => setUserCase({ ...userCase, country: c.v })}
                  style={{
                    padding: '5px 2px 4px',
                    boxSizing: 'border-box',
                    minWidth: 0,
                    borderLeft: i === 0 ? 'none' : '1px solid var(--gc-rule-soft)',
                    background: selected ? 'var(--gc-green)' : 'var(--gc-surface)',
                    color: selected ? 'var(--gc-paper)' : 'var(--gc-ink-soft)',
                    transition: 'all 120ms',
                  }}
                  className="flex flex-col items-center justify-center gap-0.5">
                  <CountryFlag country={c.v} size={13} />
                  <span className="gc-mono" style={{ fontSize: '8px', fontWeight: 700, lineHeight: 1, letterSpacing: '0.08em' }}>
                    {countryShortLabel(c.v, lang)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Row: Category · PD · (F-only) Petitioner */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isF ? '1fr 1fr auto' : '1fr 1fr',
            gap: '6px',
            width: '100%',
          }}>
            {/* Category */}
            <CategoryDropdown value={userCase.category}
              onChange={(newCat) => {
                if (newCat === userCase.category) return;
                let newPetitioner = userCase.petitionerStatus;
                if (newCat === 'F2A' || newCat === 'F2B') newPetitioner = 'LPR';
                else if (newCat === 'F1' || newCat === 'F3' || newCat === 'F4') newPetitioner = 'USC';
                setUserCase({ ...userCase, category: newCat, petitionerStatus: newPetitioner, subtype: defaultSubtype(newCat) });
              }} />

            {/* Priority Date */}
            <DateDropdown value={userCase.priorityDate}
              onChange={(pd) => setUserCase({ ...userCase, priorityDate: pd })} />

            {/* Petitioner — only shown for F categories */}
            {isF && (
              <div style={{
                display: 'inline-flex',
                border: '1px solid var(--gc-rule)',
                borderRadius: '3px',
                overflow: 'hidden',
              }}>
                <button onClick={() => setUserCase({ ...userCase, petitionerStatus: 'USC' })}
                  style={{
                    padding: '6px 7px',
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    background: userCase.petitionerStatus === 'USC' ? 'var(--gc-ink)' : 'transparent',
                    color: userCase.petitionerStatus === 'USC' ? 'var(--gc-paper)' : 'var(--gc-ink-soft)',
                    transition: 'all 120ms',
                  }}>
                  {lang === 'en' ? 'USC' : '公民'}
                </button>
                <button onClick={() => setUserCase({ ...userCase, petitionerStatus: 'LPR' })}
                  style={{
                    padding: '6px 7px',
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    borderLeft: '1px solid var(--gc-rule-soft)',
                    background: userCase.petitionerStatus === 'LPR' ? 'var(--gc-green)' : 'transparent',
                    color: userCase.petitionerStatus === 'LPR' ? 'var(--gc-paper)' : 'var(--gc-ink-soft)',
                    transition: 'all 120ms',
                  }}>
                  {lang === 'en' ? 'LPR' : lang === 'tw' ? '綠卡' : '绿卡'}
                </button>
              </div>
            )}
          </div>

          <SubtypeChips userCase={userCase} setUserCase={setUserCase} />

          {/* Date of birth — optional; only powers the "how old will you be"
              line on the Overview countdown card. Year+month only, so any age
              computed from it defaults the day to the 1st. */}
          <div style={{ marginTop: '6px' }}>
            <div className="gc-eyebrow" style={{ fontSize: '8px', color: 'var(--gc-muted)', marginBottom: '3px', letterSpacing: '0.1em' }}>
              {lang === 'en' ? 'DATE OF BIRTH (OPTIONAL)' : lang === 'tw' ? '出生年月（選填）' : '出生年月（选填）'}
            </div>
            <YearMonthDropdown value={userCase.birthYearMonth || ''} allowEmpty
              placeholder={lang === 'en' ? 'Not set' : '未填写'}
              onChange={(ym) => setUserCase({ ...userCase, birthYearMonth: ym })} />
          </div>

          {/* F-category mismatch hint — compact */}
          {mismatch && (
            <div style={{
              marginTop: '6px',
              padding: '5px 7px',
              background: 'var(--gc-amber-soft)',
              border: '1px solid var(--gc-amber-border)',
              borderRadius: '3px',
              fontSize: '10px',
              color: 'var(--gc-amber-ink)',
              lineHeight: 1.4,
              display: 'flex',
              alignItems: 'flex-start',
              gap: '5px',
            }}>
              <AlertTriangle size={10} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{t.petitionerMismatch}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================
// Progress Timeline (edge-aware labels + shared scale)
// ============================================================
const labelAlignClass = (pct) => {
  if (pct < 12) return 'left-0 translate-x-0 text-left';
  if (pct > 88) return 'right-0 left-auto translate-x-0 text-right';
  return 'left-1/2 -translate-x-1/2 text-center';
};

const ProgressTimeline = ({ priorityDate, cutoff, chartLabel, sharedScale, showPerm = false, showI485 = false, i485FilingDate, hideStatus = false }) => {
  const { t, lang } = useLang();
  const pd = parseDate(priorityDate);
  const today = new Date();
  const isCurrent = cutoff === 'C';
  const co = isCurrent ? today : parseDate(cutoff);

  // Determine status: has the priority date been reached?
  const reached = isCurrent || pd <= co;

  // SMART SPACING ALGORITHM
  // Place the two markers (cutoff + PD) at fixed positions in the timeline
  // and derive the scale such that the visual distance matches the actual time gap in a meaningful way
  let start, end, pdPos, coPos;

  if (sharedScale) {
    start = sharedScale.start;
    end = sharedScale.end;
    const totalSpan = Math.max(daysBetween(end, start), 1);
    pdPos = Math.max(0, Math.min(100, (daysBetween(pd, start) / totalSpan) * 100));
    coPos = Math.max(0, Math.min(100, (daysBetween(co, start) / totalSpan) * 100));
  } else if (isCurrent) {
    // Current case: show PD on left, "Green Card ready" on right
    start = new Date(pd.getTime() - 30 * 24 * 60 * 60 * 1000);
    end = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const totalSpan = Math.max(daysBetween(end, start), 1);
    pdPos = (daysBetween(pd, start) / totalSpan) * 100;
    coPos = 100;
  } else {
    // Smart: place cutoff at ~25% from left, PD at ~75% from right
    // This maximizes visual distance for the gap, making small gaps look significant
    // (e.g. "only 1 month" looks like a real gap, not a tiny line)
    const gapDays = Math.abs(daysBetween(pd, co));
    // Proportional padding: 35% of gap on each side (ensures markers aren't at edges)
    const paddingDays = Math.max(30, gapDays * 0.4);

    if (pd < co) {
      // User already reached (shouldn't happen since reached handled above, but defensive)
      start = new Date(pd.getTime() - paddingDays * 24 * 60 * 60 * 1000);
      end = new Date(co.getTime() + paddingDays * 24 * 60 * 60 * 1000);
    } else {
      // Normal case: cutoff < PD, gap in between
      start = new Date(co.getTime() - paddingDays * 24 * 60 * 60 * 1000);
      end = new Date(pd.getTime() + paddingDays * 24 * 60 * 60 * 1000);
    }
    const totalSpan = Math.max(daysBetween(end, start), 1);
    pdPos = (daysBetween(pd, start) / totalSpan) * 100;
    coPos = (daysBetween(co, start) / totalSpan) * 100;
  }

  // Days remaining calculation
  const daysRemaining = reached ? 0 : daysBetween(pd, co);
  const monthsRemaining = Math.ceil(daysRemaining / 30);

  // Calculate PERM and I-485 projected positions (for Table B - filing timeline)
  // These appear to the right of PD on the timeline
  const totalSpanDays = Math.max(daysBetween(end, start), 1);
  let permPos = null, i485Pos = null;

  if (showI485 && i485FilingDate && !isCurrent && !reached) {
    // I-485 filing happens when PD reaches cutoff (or when reached)
    // So I-485 marker is at the same position as PD essentially (when they cross)
    // Better: show I-485 as "after PD reached" - position it at PD position
    const i485Date = new Date(i485FilingDate);
    const i485DaysFromStart = daysBetween(i485Date, start);
    i485Pos = Math.max(0, Math.min(100, (i485DaysFromStart / totalSpanDays) * 100));
  }

  return (
    <div className="space-y-1.5">
      {/* Title + Status */}
      {(chartLabel || isCurrent) && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500 font-medium">{chartLabel}</span>
          {isCurrent && (
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold">
              {t.currentLabel}
            </span>
          )}
        </div>
      )}

      {/* Status Summary - shows clearly where user stands (suppressed when parent renders it inline) */}
      {!isCurrent && !hideStatus && (
        <div className="flex items-center justify-between text-[11px]">
          {reached ? (
            <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
              <CheckCircle2 size={12} />
              <span>{lang === 'en' ? 'You are eligible to file!' : '你可以递交啦！'}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-amber-700 font-semibold">
              <Clock size={12} />
              <span>
                {lang === 'en'
                  ? `${daysRemaining.toLocaleString('en-US')} days to go (~${monthsRemaining} mo)`
                  : `还差 ${daysRemaining.toLocaleString('en-US')} 天（约${monthsRemaining}个月）`}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Dynamic marker labels - inline dot is anchored at the SAME X as the bar dot below.
          Determines layout by checking if labels can actually fit without overlap:
            - "outward" arrangement: labels extend AWAY from each other. Works when both dots
              are in the middle (neither near an edge).
            - "inward" arrangement: labels point toward each other. Works only when dots are
              far apart (gap ≥ 2 × label-width).
          If neither works, stack vertically. */}
      {!isCurrent ? (() => {
        const LABEL_WIDTH_PCT = 33; // realistic estimate for "当前排期 21年6月" width
        const pdOnRight = pdPos > coPos;
        const leftDotPos = pdOnRight ? coPos : pdPos;
        const rightDotPos = pdOnRight ? pdPos : coPos;
        const gap = rightDotPos - leftDotPos;

        // Can both labels fit in the OUTWARD arrangement? (labels extend away from each other)
        // Needs: left dot's label (extending further left) doesn't overflow,
        //        right dot's label (extending further right) doesn't overflow.
        const outwardFits = leftDotPos >= LABEL_WIDTH_PCT &&
                            rightDotPos <= (100 - LABEL_WIDTH_PCT);

        // Can both fit in the INWARD arrangement? (labels converge between dots)
        // Needs enough gap between dots for both labels.
        const inwardFits = gap >= 2 * LABEL_WIDTH_PCT;

        const crowded = !(outwardFits || inwardFits);
        const useInward = !outwardFits && inwardFits;

        // Pick direction for a single label based purely on edge proximity (no collision concern)
        const getEdgeDir = (pos) => {
          if (pos > 100 - LABEL_WIDTH_PCT) return 'left';   // near right edge -> must go left
          if (pos < LABEL_WIDTH_PCT) return 'right';         // near left edge -> must go right
          return 'left';                                      // default: point label backward
        };

        // Compute direction for each label
        let cutoffDir, pdDir;
        if (crowded) {
          cutoffDir = getEdgeDir(coPos);
          pdDir = getEdgeDir(pdPos);
        } else if (useInward) {
          // Labels extend TOWARD the other dot
          cutoffDir = pdOnRight ? 'right' : 'left';
          pdDir = pdOnRight ? 'left' : 'right';
        } else {
          // Outward: labels extend AWAY from the other dot
          cutoffDir = pdOnRight ? 'left' : 'right';
          pdDir = pdOnRight ? 'right' : 'left';
        }

        const trans = (dir) => dir === 'left' ? 'translateX(-100%)' : 'translateX(0)';

        const cutoffText = lang === 'en' ? 'Current' : '当前排期';
        const pdText = lang === 'en' ? 'Your PD' : '你的优先日';
        const cutoffDate = formatDateShort(cutoff, lang);
        const pdDate = formatDateShort(priorityDate, lang);

        return (
          <div className="relative text-[10px]" style={{ height: crowded ? '32px' : '18px' }}>
            {/* Cutoff label - dot sits at coPos, text extends in cutoffDir */}
            <div
              className="absolute flex items-center gap-1 whitespace-nowrap"
              style={{ left: `${coPos}%`, top: '0', transform: trans(cutoffDir) }}
            >
              {cutoffDir === 'left' ? (
                <>
                  <span className="font-bold text-emerald-700">{cutoffText}</span>
                  <span className="font-semibold text-slate-700">{cutoffDate}</span>
                  <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0"></div>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0"></div>
                  <span className="font-bold text-emerald-700">{cutoffText}</span>
                  <span className="font-semibold text-slate-700">{cutoffDate}</span>
                </>
              )}
            </div>
            {/* PD label - dot sits at pdPos, text extends in pdDir. On second row if crowded. */}
            <div
              className="absolute flex items-center gap-1 whitespace-nowrap"
              style={{ left: `${pdPos}%`, top: crowded ? '16px' : '0', transform: trans(pdDir) }}
            >
              {pdDir === 'left' ? (
                <>
                  <span className="font-bold text-slate-900">{pdText}</span>
                  <span className="font-semibold text-slate-700">{pdDate}</span>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${reached ? 'bg-emerald-600' : 'bg-slate-900'}`}></div>
                </>
              ) : (
                <>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${reached ? 'bg-emerald-600' : 'bg-slate-900'}`}></div>
                  <span className="font-bold text-slate-900">{pdText}</span>
                  <span className="font-semibold text-slate-700">{pdDate}</span>
                </>
              )}
            </div>
          </div>
        );
      })() : (
        /* Current case: only show PD label on the right */
        <div className="flex items-center justify-end gap-1 text-[10px]">
          <div className="w-2 h-2 rounded-full bg-emerald-600"></div>
          <span className="font-bold text-slate-900">{lang === 'en' ? 'Your PD' : '你的优先日'}</span>
          <span className="font-semibold text-slate-700">{formatDateShort(priorityDate, lang)}</span>
        </div>
      )}

      {/* Progress bar - dots only, labels moved to info row above */}
      <div className="relative" style={{ paddingTop: '6px', paddingBottom: '6px' }}>
        {/* Track (gray background) */}
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-2 bg-slate-100 rounded-full"></div>

        {/* Progress fill */}
        {isCurrent ? (
          /* Current - entire track green */
          <div className="absolute top-1/2 -translate-y-1/2 h-2 bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full"
            style={{ left: '0%', right: '0%' }}></div>
        ) : reached ? (
          /* User PD has been reached - green up to PD position */
          <div className="absolute top-1/2 -translate-y-1/2 h-2 bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full"
            style={{ left: '0%', width: `${pdPos}%` }}></div>
        ) : (
          /* Not reached - green up to cutoff, amber (waiting) from cutoff to PD */
          <>
            <div className="absolute top-1/2 -translate-y-1/2 h-2 bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full"
              style={{ left: '0%', width: `${coPos}%` }}></div>
            <div className="absolute top-1/2 -translate-y-1/2 h-2 bg-amber-300 opacity-60"
              style={{ left: `${coPos}%`, width: `${pdPos - coPos}%` }}></div>
          </>
        )}

        {/* Cutoff marker (当前排期) - dot only, label moved to info row */}
        {!isCurrent && (
          <div className="absolute top-1/2 -translate-y-1/2" style={{ left: `${coPos}%` }}>
            <div className="w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white shadow-md -translate-x-1/2"></div>
          </div>
        )}

        {/* Priority Date marker (你的优先日) - dot only, label moved to info row */}
        <div className="absolute top-1/2 -translate-y-1/2" style={{ left: `${pdPos}%` }}>
          <div className={`w-3 h-3 rounded-full ring-2 ring-white shadow-md -translate-x-1/2 ${
            reached ? 'bg-emerald-600' : 'bg-slate-900'
          }`}></div>
        </div>
      </div>
    </div>
  );
};

// I-485 Progress Bar - compact version for Dashboard, syncs with I-485 tab completion
const I485ProgressBar = ({ completedSteps = [], userCase }) => {
  const { lang } = useLang();

  const stepOrder = ['receipt', 'biometrics', 'ead', 'ap', 'interview', 'approval'];
  const stepLabels = {
    en: {
      receipt: 'Receipt', biometrics: 'Biometrics', ead: 'EAD',
      ap: 'AP', interview: 'Interview', approval: 'Approval'
    },
    zh: {
      receipt: '收据', biometrics: '指纹', ead: '工卡',
      ap: '旅行证', interview: '面试', approval: '批准'
    },
    tw: {
      receipt: '收據', biometrics: '指紋', ead: '工卡',
      ap: '旅行證', interview: '面試', approval: '批准'
    }
  };
  const labels = stepLabels[lang] || stepLabels.en;

  const completedCount = completedSteps.length;
  const totalSteps = stepOrder.length;
  const progressPct = (completedCount / totalSteps) * 100;

  // Find current step (first uncompleted)
  const currentStepIdx = stepOrder.findIndex(id => !completedSteps.includes(id));
  const nextStepId = currentStepIdx === -1 ? null : stepOrder[currentStepIdx];

  // Estimated cumulative days from filing for each step (Texas SC / average speed)
  // receipt: 14, biometrics: 60, ead: 120, ap: 150, interview: 365, approval: 450
  const cumulativeDays = {
    receipt: 14, biometrics: 60, ead: 120, ap: 150, interview: 365, approval: 450
  };

  // Estimated filing date = today (user just became eligible, assume file now)
  const filingDate = new Date();

  // Calculate estimated date for each step
  const getStepDate = (stepId) => {
    const d = new Date(filingDate);
    d.setDate(d.getDate() + cumulativeDays[stepId]);
    return d;
  };

  const formatShortDate = (d) => {
    if (lang === 'en') {
      return d.toLocaleDateString('en-US', { year: '2-digit', month: 'short' });
    }
    return `${String(d.getFullYear()).slice(-2)}/${d.getMonth() + 1}`;
  };

  // Calculate gap days between consecutive steps
  const getGapDays = (fromId, toId) => {
    return cumulativeDays[toId] - cumulativeDays[fromId];
  };

  const formatGapDays = (days) => {
    if (days < 30) return lang === 'en' ? `~${days}d` : `约${days}天`;
    const months = Math.round(days / 30);
    const totalDays = days;
    return lang === 'en' ? `~${totalDays}d` : `约${totalDays}天`;
  };

  return (
    <div className="space-y-2">
      {/* Title + badge counter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs">
          <FileText size={12} className="text-indigo-600" />
          <span className="font-semibold text-slate-700">
            {lang === 'en' ? 'I-485 Progress' : 'I-485 流程进度'}
          </span>
        </div>
        {/* Badge style counter */}
        <div className="inline-flex items-center px-2 py-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 shadow-sm">
          <span className="text-[10px] font-bold text-white leading-none">{completedCount}</span>
          <span className="text-[10px] text-white/60 leading-none mx-0.5">/</span>
          <span className="text-[10px] font-bold text-white/90 leading-none">{totalSteps}</span>
        </div>
      </div>

      {/* Step pills with CONTINUOUS connecting line + ruler-style gap labels + dates */}
      <div className="relative" style={{ paddingTop: '24px', paddingBottom: '32px' }}>
        {/* Ruler-style gap labels - tick marks tight to circle edges (no gap) */}
        <div className="absolute top-0 left-0 right-0 h-[22px] pointer-events-none">
          {stepOrder.slice(0, -1).map((id, idx) => {
            const gapDays = getGapDays(id, stepOrder[idx + 1]);
            const circleCenter1 = ((idx + 0.5) / totalSteps) * 100;
            const circleCenter2 = ((idx + 1.5) / totalSteps) * 100;
            // Ticks sit EXACTLY at circle edge (no visible gap between circle and tick)
            // Circle w-5 = 20px, on typical container width that's ~1.3-1.5% of 6-step row
            const circleHalfPct = 1.3;
            const rulerStart = circleCenter1 + circleHalfPct;
            const rulerEnd = circleCenter2 - circleHalfPct;
            const rulerMid = (rulerStart + rulerEnd) / 2;
            return (
              <div key={`gap-${idx}`}>
                {/* Left tick mark (vertical bar) - sits right at/on the left circle center */}
                <div className="absolute bg-slate-600"
                  style={{
                    left: `${rulerStart}%`,
                    top: '6px',
                    width: '2px',
                    height: '12px',
                    transform: 'translateX(-50%)',
                    borderRadius: '1px'
                  }}></div>
                {/* Horizontal ruler line */}
                <div className="absolute bg-slate-400"
                  style={{
                    left: `${rulerStart}%`,
                    top: '11px',
                    width: `${rulerEnd - rulerStart}%`,
                    height: '2px'
                  }}></div>
                {/* Right tick mark (vertical bar) */}
                <div className="absolute bg-slate-600"
                  style={{
                    left: `${rulerEnd}%`,
                    top: '6px',
                    width: '2px',
                    height: '12px',
                    transform: 'translateX(-50%)',
                    borderRadius: '1px'
                  }}></div>
                {/* Day count label - white background breaks the line */}
                <div className="absolute text-[10px] text-slate-700 font-semibold whitespace-nowrap bg-white px-1.5"
                  style={{
                    left: `${rulerMid}%`,
                    top: '3px',
                    transform: 'translateX(-50%)'
                  }}>
                  {formatGapDays(gapDays)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Connecting track - ONLY between first and last circle centers (no extra at edges) */}
        {(() => {
          const firstCircleCenter = (0.5 / totalSteps) * 100;     // 8.33%
          const lastCircleCenter = ((totalSteps - 0.5) / totalSteps) * 100; // 91.67%
          const trackWidth = lastCircleCenter - firstCircleCenter;
          return (
            <>
              <div className="absolute h-0.5 bg-slate-300"
                style={{
                  left: `${firstCircleCenter}%`,
                  width: `${trackWidth}%`,
                  top: '58px'
                }}></div>
              <div className="absolute h-0.5 bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all"
                style={{
                  left: `${firstCircleCenter}%`,
                  width: `${trackWidth * (progressPct / 100)}%`,
                  top: '58px'
                }}></div>
            </>
          );
        })()}

        {/* Step dots */}
        <div className="relative flex justify-between" style={{ marginTop: '25px' }}>
          {stepOrder.map((id, idx) => {
            const isCompleted = completedSteps.includes(id);
            const isCurrent = idx === currentStepIdx;
            // Only pulse when user actively progressing (not the initial state)
            const shouldPulse = isCurrent && completedCount > 0;
            const stepDate = getStepDate(id);
            return (
              <div key={id} className="flex flex-col items-center" style={{ width: '16.66%' }}>
                <div className={`w-5 h-5 rounded-full ring-2 ring-white shadow flex items-center justify-center text-[9px] font-bold transition-all ${
                  isCompleted ? 'bg-emerald-500 text-white' :
                  shouldPulse ? 'bg-indigo-500 text-white animate-pulse' :
                  isCurrent ? 'bg-indigo-500 text-white' :
                  'bg-slate-200 text-slate-500'
                }`}>
                  {isCompleted ? '✓' : (idx + 1)}
                </div>
                <div className={`text-[9px] mt-1 text-center leading-tight whitespace-nowrap ${
                  isCompleted ? 'text-emerald-700 font-semibold' :
                  isCurrent ? 'text-indigo-700 font-bold' :
                  'text-slate-500'
                }`}>
                  {labels[id]}
                </div>
                <div className="text-[8px] text-slate-400 mt-0.5 whitespace-nowrap">
                  {formatShortDate(stepDate)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Status message */}
      {completedCount === 0 && (
        <div className="flex items-center gap-1.5 text-[11px] text-slate-600 bg-slate-50 rounded-lg p-2">
          <span>→</span>
          <span>
            {lang === 'en'
              ? 'Dates assume filing today. Go to "I-485 Process" tab to track progress.'
              : '日期基于今日递件估算。去 "I-485流程" tab 跟踪进度。'}
          </span>
        </div>
      )}
      {completedCount > 0 && completedCount < totalSteps && nextStepId && (
        <div className="flex items-center gap-1.5 text-[11px] text-indigo-700 bg-indigo-50 rounded-lg p-2">
          <span>→</span>
          <span>
            {lang === 'en'
              ? `Next: ${labels[nextStepId]} (est. ${formatShortDate(getStepDate(nextStepId))})`
              : `下一步：${labels[nextStepId]}（预计 ${formatShortDate(getStepDate(nextStepId))}）`}
          </span>
        </div>
      )}
      {completedCount === totalSteps && (
        <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 bg-emerald-50 rounded-lg p-2 font-semibold">
          <CheckCircle2 size={12} />
          <span>
            {lang === 'en' ? 'All steps complete! Green Card obtained!' : '所有步骤完成！绿卡到手！'}
          </span>
        </div>
      )}
    </div>
  );
};

// ============================================================
// Movement Indicator
// ============================================================
const MovementIndicator = ({ movement, compact }) => {
  const { t, lang } = useLang();
  const size = compact ? 14 : 16;
  const textSize = compact ? 'text-xs' : 'text-sm';
  if (movement.type === 'advanced') return (
    <div className="flex items-center gap-1 text-emerald-600">
      <TrendingUp size={size} strokeWidth={2.5} />
      <span className={`${textSize} font-bold`}>+{movement.days}{compact ? '' : ` ${t.days}`}</span>
    </div>
  );
  if (movement.type === 'retrogressed') return (
    <div className="flex items-center gap-1 text-red-600">
      <TrendingDown size={size} strokeWidth={2.5} />
      <span className={`${textSize} font-bold`}>{movement.days ? `-${movement.days}` : '↓'}</span>
    </div>
  );
  if (movement.type === 'unavailable') return (
    <div className="flex items-center gap-1 text-red-600">
      <TrendingDown size={size} strokeWidth={2.5} />
      <span className={`${textSize} font-bold`}>{movement.still ? 'U' : '→U'}</span>
    </div>
  );
  if (movement.type === 'resumed') return (
    <div className="flex items-center gap-1 text-emerald-600">
      <TrendingUp size={size} strokeWidth={2.5} />
      <span className={`${textSize} font-bold`}>{lang === 'en' ? 'resumed' : '恢复'}</span>
    </div>
  );
  if (movement.type === 'current') return (
    <div className="flex items-center gap-1 text-emerald-600">
      <CheckCircle2 size={size} strokeWidth={2.5} />
      <span className={`${textSize} font-bold`}>{t.statusCurrent}</span>
    </div>
  );
  return (
    <div className="flex items-center gap-1 text-slate-400">
      <Minus size={size} strokeWidth={2.5} />
      <span className={`${textSize} font-medium`}>{t.noMovement}</span>
    </div>
  );
};

// ============================================================
// Confetti — pure CSS/React, no libs. Fires once when triggered.
// 36 rectangles, random colors/angles, spring outward then fall.
// ============================================================
const Confetti = ({ fire }) => {
  if (!fire) return null;
  // Theme-friendly palette — mostly green, with warm accents
  const colors = ['#0e4d2e', '#35805a', '#77b088', '#d4a343', '#c44536', '#e6c49a'];
  const pieces = Array.from({ length: 36 }).map((_, i) => {
    const color = colors[i % colors.length];
    const angle = (Math.random() - 0.5) * 160; // -80° to 80°
    const distance = 150 + Math.random() * 120;
    const delay = Math.random() * 0.15;
    const dur = 1.2 + Math.random() * 0.8;
    const dx = Math.sin(angle * Math.PI / 180) * distance;
    const dy = -Math.cos(angle * Math.PI / 180) * distance * 0.5 - Math.random() * 60;
    const rot = Math.random() * 720 - 360;
    const w = 6 + Math.random() * 8;
    const h = 10 + Math.random() * 14;
    return (
      <span key={i} style={{
        position: 'absolute',
        left: '50%', top: '50%',
        width: `${w}px`, height: `${h}px`,
        background: color,
        borderRadius: '1px',
        pointerEvents: 'none',
        transform: 'translate(-50%, -50%)',
        animation: `gc-confetti-burst ${dur}s cubic-bezier(0.2, 0.7, 0.3, 1) ${delay}s forwards`,
        '--gc-dx': `${dx}px`,
        '--gc-dy': `${dy}px`,
        '--gc-rot': `${rot}deg`,
      }} />
    );
  });
  return (
    <div style={{
      position: 'absolute', inset: 0,
      pointerEvents: 'none', overflow: 'visible',
      zIndex: 2,
    }}>
      {pieces}
      <style>{`
        @keyframes gc-confetti-burst {
          0% {
            transform: translate(-50%, -50%) rotate(0deg) scale(0.6);
            opacity: 0;
          }
          15% {
            opacity: 1;
          }
          100% {
            transform: translate(calc(-50% + var(--gc-dx)), calc(-50% + var(--gc-dy) + 220px)) rotate(var(--gc-rot)) scale(1);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

// ============================================================
// CelebrationMarker — invisible helper that marks "celebrated" flag
// after a delay, so the confetti animation plays exactly once per case.
// ============================================================
const CelebrationMarker = ({ onDone }) => {
  useEffect(() => {
    const timer = setTimeout(() => onDone(), 2500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
};

// ============================================================
// ShareCardModal — editorial-styled share card for celebrating GC approval.
// Renders SVG (crisp, beautiful) + offers PNG download via canvas.
// Designed for 小红书 / 朋友圈 / Instagram square-ish format.
// ============================================================
const ShareCardModal = ({ userCase, greenCardInfo, lang, onClose }) => {
  const svgRef = useRef(null);
  const [downloaded, setDownloaded] = useState(false);
  const W = 1080;
  const H = 1350; // 4:5 portrait — Xiaohongshu friendly

  const approvalDate = greenCardInfo.approvalDate ? new Date(greenCardInfo.approvalDate) : new Date();
  const approvalDateStr = lang === 'en'
    ? approvalDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : `${approvalDate.getFullYear()}年${approvalDate.getMonth()+1}月${approvalDate.getDate()}日`;

  const headline = lang === 'en' ? 'I got my green card.' : lang === 'tw' ? '我拿到綠卡了。' : '我拿到绿卡了。';
  // The number that makes people stop scrolling: how long THIS person waited,
  // priority date → approval, in days.
  const pdDate = userCase.priorityDate ? new Date(userCase.priorityDate + 'T00:00:00') : null;
  const waitedDays = pdDate && approvalDate && approvalDate > pdDate
    ? Math.round((approvalDate - pdDate) / 86400000) : null;
  const waitedYearsTxt = waitedDays !== null ? (waitedDays / 365.25).toFixed(1) : null;
  const subline = waitedDays !== null
    ? (lang === 'en' ? `${waitedDays.toLocaleString('en-US')} days from priority date to approval.`
      : lang === 'tw' ? `從優先日到這一天，一共 ${waitedDays.toLocaleString('en-US')} 天。`
      : `从优先日到这一天，一共 ${waitedDays.toLocaleString('en-US')} 天。`)
    : (lang === 'en' ? 'After years of waiting — this day finally came.'
      : lang === 'tw' ? '等了這些年 — 這一天終於來了。'
      : '等了这些年 — 这一天终于来了。');
  const catLabel = lang === 'en' ? 'CATEGORY' : '类别';
  const dateLabel = lang === 'en' ? 'APPROVED' : '获批日';
  const waitLabel = lang === 'en' ? 'THE WAIT' : '等待';
  const footerLabel = 'gc.jmjvc.us · ' + (lang === 'en' ? 'Green Card Tracker' : lang === 'tw' ? '綠卡晴雨表' : '绿卡晴雨表');

  // Download as PNG via canvas — serializes SVG → image → canvas → blob → link download
  const handleDownload = async () => {
    const svg = svgRef.current;
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, W, H);
      canvas.toBlob((pngBlob) => {
        if (!pngBlob) return;
        const link = document.createElement('a');
        link.href = URL.createObjectURL(pngBlob);
        link.download = `greencard-${greenCardInfo.approvalDate || 'celebration'}.png`;
        link.click();
        URL.revokeObjectURL(link.href);
        URL.revokeObjectURL(url);
        setDownloaded(true);
        setTimeout(() => setDownloaded(false), 2000);
      }, 'image/png');
    };
    img.onerror = () => { URL.revokeObjectURL(url); };
    img.src = url;
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--gc-paper)',
          borderRadius: '6px',
          padding: '14px',
          maxWidth: '360px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
          position: 'relative',
        }}>
        {/* Close */}
        <button
          onClick={onClose}
          aria-label={lang === 'en' ? 'Close' : '关闭'}
          style={{
            position: 'absolute', top: '8px', right: '10px',
            background: 'transparent', border: 'none',
            fontSize: '20px', color: 'var(--gc-muted)',
            cursor: 'pointer', lineHeight: 1, padding: '4px 8px',
          }}>×</button>
        <div className="gc-eyebrow" style={{ color: 'var(--gc-green)', marginBottom: '8px', textAlign: 'center' }}>
          {lang === 'en' ? 'SHARE THE NEWS' : lang === 'tw' ? '分享喜訊' : '分享喜讯'}
        </div>
        {/* SVG preview — scaled to fit modal */}
        <div style={{ border: '1px solid var(--gc-rule)', borderRadius: '4px', overflow: 'hidden', marginBottom: '12px' }}>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            xmlns="http://www.w3.org/2000/svg"
            style={{ width: '100%', display: 'block' }}>
            <defs>
              <linearGradient id="gc-bg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#e8dfce" />
                <stop offset="100%" stopColor="#d8cdb6" />
              </linearGradient>
              <linearGradient id="gc-card" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0e4d2e" />
                <stop offset="100%" stopColor="#082818" />
              </linearGradient>
              <pattern id="gc-grain" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse">
                <rect width="4" height="4" fill="transparent" />
                <circle cx="1" cy="1" r="0.4" fill="rgba(255,255,255,0.03)" />
                <circle cx="3" cy="3" r="0.3" fill="rgba(0,0,0,0.02)" />
              </pattern>
            </defs>
            {/* Paper background */}
            <rect width={W} height={H} fill="url(#gc-bg)" />
            <rect width={W} height={H} fill="url(#gc-grain)" />

            {/* Double editorial frame */}
            <rect x="40" y="40" width={W - 80} height={H - 80} fill="none" stroke="#0e4d2e" strokeWidth="2.5" />
            <rect x="54" y="54" width={W - 108} height={H - 108} fill="none" stroke="#0e4d2e" strokeWidth="0.6" opacity="0.35" />

            {/* Confetti — muted brand palette, deterministic scatter */}
            <g opacity="0.85">
              {[[150,230,7,'#d4a343'],[230,180,5,'#0e4d2e'],[330,250,4,'#8a2a1c'],[880,210,6,'#d4a343'],
                [800,270,4,'#0e4d2e'],[950,300,5,'#3d5a80'],[120,420,4,'#3d5a80'],[960,450,6,'#8a2a1c'],
                [180,880,5,'#d4a343'],[900,860,4,'#0e4d2e'],[120,1060,5,'#8a2a1c'],[955,1080,6,'#d4a343'],
                [280,1180,4,'#3d5a80'],[760,1170,5,'#0e4d2e']].map(([cx,cy,r,f],i2) => (
                <circle key={i2} cx={cx} cy={cy} r={r} fill={f} opacity="0.55" />
              ))}
            </g>

            {/* Eyebrow */}
            <text x={W / 2} y="148" textAnchor="middle"
              fontFamily="Georgia, serif" fontSize="24" letterSpacing={lang === 'en' ? 6 : 10}
              fill="#0e4d2e" fontWeight="700">
              {lang === 'en' ? 'GREEN CARD TRACKER · MILESTONE' : lang === 'tw' ? '綠卡晴雨表 · 里程碑' : '绿卡晴雨表 · 里程碑'}
            </text>
            <line x1={W / 2 - 130} y1="174" x2={W / 2 + 130} y2="174" stroke="#0e4d2e" strokeWidth="1.2" />

            {/* Headline */}
            <text x={W / 2} y="330" textAnchor="middle"
              fontFamily="Georgia, serif" fontSize="88" fontWeight="700"
              fill="#0e4d2e">
              {headline}
            </text>

            {/* Subline — the personal number */}
            <text x={W / 2} y="408" textAnchor="middle"
              fontFamily="Georgia, serif" fontSize="34" fontWeight="400"
              fill="#6d604e" fontStyle="italic">
              {subline}
            </text>

            {/* Green card illustration */}
            <g transform={`translate(${W / 2 - 280}, 490)`}>
              {/* soft shadow */}
              <rect x="14" y="20" width="560" height="336" rx="22" fill="#3a3325" opacity="0.18" />
              {/* card body */}
              <rect x="0" y="0" width="560" height="336" rx="22" fill="url(#gc-card)" stroke="#06200f" strokeWidth="2" />
              {/* top cream band */}
              <path d="M 0 22 Q 0 0 22 0 L 538 0 Q 560 0 560 22 L 560 64 L 0 64 Z" fill="#f5efd9" />
              <text x="28" y="42" fontFamily="Arial, sans-serif" fontSize="24" fontWeight="700"
                fill="#0e4d2e" letterSpacing="3">PERMANENT RESIDENT</text>
              <text x="532" y="42" textAnchor="end" fontFamily="Georgia, serif" fontSize="22"
                fontWeight="700" fill="#8a2a1c" letterSpacing="2">USA</text>
              {/* photo box */}
              <rect x="30" y="92" width="150" height="188" rx="8" fill="#1c3f2c" stroke="#d4a343" strokeWidth="1.5" />
              <circle cx="105" cy="158" r="32" fill="#5d8a6e" />
              <path d="M 58 252 Q 105 212 152 252 L 152 268 Q 152 274 146 274 L 64 274 Q 58 274 58 268 Z" fill="#5d8a6e" />
              {/* gold chip */}
              <rect x="470" y="92" width="60" height="46" rx="8" fill="#d4a343" stroke="#a67c2e" strokeWidth="1.5" />
              <line x1="470" y1="115" x2="530" y2="115" stroke="#a67c2e" strokeWidth="1.2" />
              <line x1="500" y1="92" x2="500" y2="138" stroke="#a67c2e" strokeWidth="1.2" />
              {/* info block */}
              <text x="210" y="120" fontFamily="Arial, sans-serif" fontSize="14"
                fill="#77b088" letterSpacing="2">CATEGORY</text>
              <text x="210" y="162" fontFamily="Georgia, serif" fontSize="40"
                fontWeight="700" fill="#f5efd9" letterSpacing="1">{userCase.category}</text>
              <text x="210" y="204" fontFamily="Arial, sans-serif" fontSize="14"
                fill="#77b088" letterSpacing="2">RESIDENT SINCE</text>
              <text x="210" y="240" fontFamily="Georgia, serif" fontSize="28"
                fontWeight="600" fill="#f5efd9">{approvalDate.getFullYear()}</text>
              {/* machine-readable zone */}
              <path d="M 0 292 L 560 292 L 560 314 Q 560 336 538 336 L 22 336 Q 0 336 0 314 Z" fill="#f5efd9" />
              <text x="24" y="322" fontFamily="Courier, monospace" fontSize="19" fill="#0e4d2e" letterSpacing="2.5">
                {`USA${userCase.category}<<<<GREEN<CARD<TRACKER<<<<<<`.slice(0, 40)}
              </text>
            </g>

            {/* Stats row — three columns */}
            <g transform="translate(0, 960)">
              <line x1="110" y1="0" x2={W - 110} y2="0" stroke="#0e4d2e" strokeWidth="0.6" opacity="0.35" />
              <text x={W * 0.22} y="52" textAnchor="middle" fontFamily="Arial, sans-serif"
                fontSize="17" letterSpacing="4" fill="#6d604e">{catLabel}</text>
              <text x={W * 0.22} y="118" textAnchor="middle" fontFamily="Georgia, serif"
                fontSize="56" fontWeight="700" fill="#0e4d2e">{userCase.category}</text>
              <line x1={W * 0.37} y1="26" x2={W * 0.37} y2="128" stroke="#0e4d2e" strokeWidth="0.6" opacity="0.25" />
              <text x={W / 2} y="52" textAnchor="middle" fontFamily="Arial, sans-serif"
                fontSize="17" letterSpacing="4" fill="#6d604e">{waitLabel}</text>
              <text x={W / 2} y="118" textAnchor="middle" fontFamily="Georgia, serif"
                fontSize="56" fontWeight="700" fill="#0e4d2e">
                {waitedDays !== null
                  ? (lang === 'en' ? `${waitedYearsTxt} yrs` : `${waitedYearsTxt} 年`)
                  : '—'}
              </text>
              <line x1={W * 0.63} y1="26" x2={W * 0.63} y2="128" stroke="#0e4d2e" strokeWidth="0.6" opacity="0.25" />
              <text x={W * 0.78} y="52" textAnchor="middle" fontFamily="Arial, sans-serif"
                fontSize="17" letterSpacing="4" fill="#6d604e">{dateLabel}</text>
              <text x={W * 0.78} y="110" textAnchor="middle" fontFamily="Georgia, serif"
                fontSize="34" fontWeight="600" fill="#0e4d2e">{approvalDateStr}</text>
              <line x1="110" y1="160" x2={W - 110} y2="160" stroke="#0e4d2e" strokeWidth="0.6" opacity="0.35" />
            </g>

            {/* waited-days caption under stats */}
            {waitedDays !== null && (
              <text x={W / 2} y="1180" textAnchor="middle" fontFamily="Georgia, serif"
                fontSize="26" fontStyle="italic" fill="#6d604e">
                {lang === 'en'
                  ? `= ${waitedDays.toLocaleString('en-US')} days, counted one bulletin at a time`
                  : lang === 'tw' ? `= ${waitedDays.toLocaleString('en-US')} 天，一期一期公告數過來的`
                  : `= ${waitedDays.toLocaleString('en-US')} 天，一期一期公告数过来的`}
              </text>
            )}

            {/* Footer */}
            <text x={W / 2} y={H - 84} textAnchor="middle"
              fontFamily="Courier, monospace" fontSize="22" letterSpacing="3"
              fill="#6d604e">
              {footerLabel}
            </text>
          </svg>
        </div>

        {/* Download button */}
        <button
          onClick={handleDownload}
          style={{
            width: '100%', padding: '10px',
            fontSize: '12px', fontWeight: 700,
            background: downloaded ? 'var(--gc-green)' : 'var(--gc-ink)',
            color: 'var(--gc-paper)',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer',
            letterSpacing: '0.02em',
            transition: 'background 200ms',
          }}>
          {downloaded
            ? (lang === 'en' ? '✓ Downloaded' : '✓ 已下载')
            : (lang === 'en' ? '↓ Download image' : lang === 'tw' ? '↓ 下載圖片' : '↓ 下载图片')}
        </button>

        <div style={{
          marginTop: '8px',
          fontSize: '10px', color: 'var(--gc-muted)',
          textAlign: 'center', lineHeight: 1.5,
        }}>
          {lang === 'en'
            ? '1080×1350 · Perfect for Instagram, Xiaohongshu, WeChat Moments'
            : lang === 'tw'
            ? '1080×1350 · 適合小紅書、IG、朋友圈'
            : '1080×1350 · 适合小红书、IG、朋友圈'}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// ActionCenter — everything a person whose date HAS ARRIVED needs next.
// Rendered ONLY when the case is actionable (current/eligible/overdue/C);
// the waiting view is untouched by design (owner requirement 2026-08-10).
// Three cards: don't-miss-the-window banner, the 6-step roadmap (AOS vs
// consular picked by userCase.inUS), and the document checklist. Plus the
// anonymous crowd-progress report (minimal v1).
// ============================================================
const AC_MILESTONES = [
  { id: 'filed', zh: '已递交', tw: '已遞交', en: 'Filed' },
  { id: 'receipt', zh: '收到收据', tw: '收到收據', en: 'Receipt' },
  { id: 'ead', zh: 'EAD 到手', tw: 'EAD 到手', en: 'EAD' },
  { id: 'interview', zh: '面试通知', tw: '面試通知', en: 'Interview' },
  { id: 'approved', zh: '已批准', tw: '已批准', en: 'Approved' },
];

const ActionCenter = ({ userCase }) => {
  const { lang } = useLang();
  const inUS = !!userCase.inUS;
  const isEB = !userCase.category?.startsWith('F');
  const [openList, setOpenList] = useState(false);
  const [roadmapOpen, setRoadmapOpen] = useState(false);
  const [checked, setChecked] = useState(() => {
    try { return JSON.parse(window.localStorage.getItem('gc_packChecklist')) || {}; } catch { return {}; }
  });
  const toggleItem = (id) => {
    const next = { ...checked, [id]: !checked[id] };
    setChecked(next);
    try { window.localStorage.setItem('gc_packChecklist', JSON.stringify(next)); } catch { /* noop */ }
  };

  // ---- crowd timeline + RFE ----
  const [crowdOpen, setCrowdOpen] = useState(false);
  const [tlAgg, setTlAgg] = useState(null);
  const [rfeAgg, setRfeAgg] = useState(null);
  const [tlDates, setTlDates] = useState({ filed: '', receipt: '', biometrics: '', ead: '', interview: '', approved: '' });
  const [tlCenter, setTlCenter] = useState('unknown');
  const [tlState, setTlState] = useState(''); // '' | 'loading' | 'done' | 'error'
  const [rfeGot, setRfeGot] = useState(null); // null | false | true
  const [rfeType, setRfeType] = useState(null);
  const [rfeDone, setRfeDone] = useState(() => {
    try { return !!window.localStorage.getItem('gc_cd_rfe'); } catch { return false; }
  });
  useEffect(() => {
    if (!crowdOpen || tlAgg) return;
    fetch(`${API_BASE}/api/community?type=timeline&cat=${userCase.category}`)
      .then((r) => r.json()).then(setTlAgg).catch(() => setTlAgg({ total: 0 }));
    fetch(`${API_BASE}/api/community?type=rfe&cat=${userCase.category}`)
      .then((r) => r.json()).then(setRfeAgg).catch(() => {});
  }, [crowdOpen]); // eslint-disable-line react-hooks/exhaustive-deps
  const submitTimeline = async () => {
    if (!tlDates.filed) return;
    setTlState('loading');
    try {
      const dates = {};
      Object.entries(tlDates).forEach(([k, v]) => { if (v) dates[k] = v; });
      const r = await fetch(`${API_BASE}/api/community`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'timeline', cat: userCase.category, country: userCase.country, path: inUS ? 'aos' : 'cp', center: tlCenter, dates }),
      });
      if (!r.ok) throw new Error();
      setTlState('done');
      try { window.localStorage.setItem('gc_cd_timeline', '1'); } catch { /* noop */ }
      setTlAgg(null); // refetch
    } catch { setTlState('error'); setTimeout(() => setTlState(''), 2500); }
  };
  const submitRfe = async (got, type2) => {
    try {
      const r = await fetch(`${API_BASE}/api/community`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'rfe', cat: userCase.category, country: userCase.country, got, rfeType: type2 }),
      });
      if (r.ok) {
        setRfeDone(true);
        try { window.localStorage.setItem('gc_cd_rfe', '1'); } catch { /* noop */ }
      }
    } catch { /* noop */ }
  };

  const card = { background: 'var(--gc-surface)', border: '1px solid var(--gc-rule)', borderRadius: '4px', overflow: 'hidden' };
  const eyebrow = { fontSize: '9px', letterSpacing: '0.12em', fontWeight: 700 };

  // ---- roadmap steps ----
  const steps = inUS
    ? (lang === 'en' ? [
        ['Medical exam (I-693)', 'See a USCIS-designated civil surgeon; keep the sealed envelope sealed.', '1-2 wk'],
        ['Assemble your packet', 'Use the checklist below — missing items are the #1 cause of rejection.', '1-2 wk'],
        ['File I-485', 'Optionally add I-765 (work permit, $260) and I-131 (travel permit, $630) — separate fees since Apr 2024, no longer free.', 'day 0'],
        ['Receipt (I-797) & biometrics', 'Receipt in ~2-6 weeks, fingerprint appointment in ~1-2 months.', '1-2 mo'],
        ['EAD / AP arrive; possible RFE', 'Work & travel cards typically 2-6 months; answer any RFE fully and on time.', '2-6 mo'],
        ['Interview or waiver → approval', 'After filing, track each step with the I-485 progress card below.', 'varies'],
      ] : lang === 'tw' ? [
        ['體檢 I-693', '找 USCIS 認證的 civil surgeon，密封信封不要拆。', '1-2 週'],
        ['備齊材料包', '用下方清單逐項勾——缺件是被退件的頭號原因。', '1-2 週'],
        ['遞交 I-485', '可同包附上 I-765（工卡，$260）與 I-131（回美證，$630）——2024 年 4 月起需分別繳費，不再免費。', '第 0 天'],
        ['收據 I-797 與打指模', '收據約 2-6 週，指模預約約 1-2 個月。', '1-2 月'],
        ['EAD／回美證下發；可能補件', '工卡回美證一般 2-6 個月；收到 RFE 按時完整回覆。', '2-6 月'],
        ['面試或免面試 → 批准', '遞交後用下方「I-485 流程進度」逐步打勾。', '不定'],
      ] : [
        ['体检 I-693', '找 USCIS 认证的 civil surgeon，密封信封不要拆。', '1-2 周'],
        ['备齐材料包', '用下方清单逐项勾——缺件是被退件的头号原因。', '1-2 周'],
        ['递交 I-485', '可同包附上 I-765（工卡，$260）与 I-131（回美证，$630）——2024 年 4 月起需分别缴费，不再免费。', '第 0 天'],
        ['收据 I-797 与打指模', '收据约 2-6 周，指模预约约 1-2 个月。', '1-2 月'],
        ['EAD／回美证下发；可能补件', '工卡回美证一般 2-6 个月；收到 RFE 按时完整回复。', '2-6 月'],
        ['面试或免面试 → 批准', '递交后用下方「I-485 流程进度」逐步打勾。', '不定'],
      ])
    : (lang === 'en' ? [
        ['NVC welcome & fees', 'NVC opens your case; pay the IV and AOS fees online.', '2-6 wk'],
        ['File DS-260', 'The online immigrant-visa application, one per applicant.', '1 wk'],
        ['Upload civil documents', 'Birth/marriage notarials, police certificates → CEAC.', '2-8 wk'],
        ['Documentarily qualified → wait for interview', 'NVC confirms your file is complete, then the consulate schedules you.', '1-6 mo'],
        ['Medical at panel physician + interview', 'Exam only at designated hospitals; visa usually issued days after approval.', '2-4 wk'],
        ['Enter the U.S. & pay the USCIS fee', 'Visa is typically valid 6 months — enter before it expires, then pay the $235 immigrant fee online or the card will not be mailed.', '≤6 mo'],
      ] : lang === 'tw' ? [
        ['NVC 建檔與繳費', 'NVC 開案後在線繳 IV 簽證費與 AOS 費。', '2-6 週'],
        ['填 DS-260', '移民簽證網上申請表，每位申請人一份。', '1 週'],
        ['上傳民事文件', '出生／結婚公證、無犯罪證明 → 上傳 CEAC。', '2-8 週'],
        ['審結（DQ）→ 等面試排期', 'NVC 確認材料齊全後，由使領館排面試。', '1-6 月'],
        ['指定醫院體檢 + 面試', '體檢只認指定醫院；面試通過後簽證通常數日內簽發。', '2-4 週'],
        ['入境美國並繳 USCIS 移民費', '移民簽證一般僅 6 個月有效——過期作廢；入境後在線繳 $235，不繳綠卡不會寄出。', '≤6 月'],
      ] : [
        ['NVC 建档与缴费', 'NVC 开案后在线缴 IV 签证费与 AOS 费。', '2-6 周'],
        ['填 DS-260', '移民签证网上申请表，每位申请人一份。', '1 周'],
        ['上传民事文件', '出生／结婚公证、无犯罪证明 → 上传 CEAC。', '2-8 周'],
        ['审结（DQ）→ 等面试排期', 'NVC 确认材料齐全后，由使领馆排面试。', '1-6 月'],
        ['指定医院体检 + 面试', '体检只认指定医院；面试通过后签证通常数日内签发。', '2-4 周'],
        ['入境美国并缴 USCIS 移民费', '移民签证一般仅 6 个月有效——过期作废；入境后在线缴 $235，不缴绿卡不会寄出。', '≤6 月'],
      ]);

  // ---- checklist ----
  const L = (zh, tw, en) => (lang === 'en' ? en : lang === 'tw' ? tw : zh);
  const groups = [
    {
      title: L('所有人都要', '所有人都要', 'Everyone'),
      items: [
        ['passport', L('护照全本复印（含所有签证页）', '護照全本影印（含所有簽證頁）', 'Full passport copy (all visa pages)')],
        ['birth', L('出生公证（白皮书）', '出生公證（白皮書）', 'Birth certificate notarial booklet')],
        ['photos', L('美式 2×2 寸照片', '美式 2×2 吋照片', '2×2 inch US-style photos')],
        ['petition', L(isEB ? 'I-140 批准通知（I-797）副本' : 'I-130 批准通知（I-797）副本',
                       isEB ? 'I-140 批准通知（I-797）副本' : 'I-130 批准通知（I-797）副本',
                       isEB ? 'I-140 approval notice (I-797) copy' : 'I-130 approval notice (I-797) copy')],
        ...(userCase.priorityDate ? [['marriage', L('结婚公证（如随行配偶）', '結婚公證（如隨行配偶）', 'Marriage notarial (if spouse included)')]] : []),
      ],
    },
    isEB ? {
      title: L('职业移民专属', '職業移民專屬', 'Employment-based'),
      items: [
        ['joblet', L('雇主在职信 / Supplement J（仍在原岗位）', '雇主在職信 / Supplement J（仍在原崗位）', 'Employer letter / Supplement J')],
        ['degree', L('学历学位证明与认证', '學歷學位證明與認證', 'Degree certificates & evaluation')],
      ],
    } : {
      title: L('亲属移民专属', '親屬移民專屬', 'Family-based'),
      items: [
        ['i864', L('担保人 I-864 + 最近报税记录', '擔保人 I-864 + 最近報稅記錄', 'Sponsor I-864 + recent tax returns')],
        ['relation', L('亲属关系证明（户口本/出生公证链）', '親屬關係證明', 'Relationship evidence')],
      ],
    },
    inUS ? {
      title: L('境内递件（I-485）', '境內遞件（I-485）', 'Filing inside the U.S.'),
      items: [
        ['i693', L('I-693 体检密封件（civil surgeon）', 'I-693 體檢密封件', 'Sealed I-693 medical (civil surgeon)'), ],
        ['i94', L('I-94 与当前身份文件（I-797/I-20 等）', 'I-94 與當前身份文件', 'I-94 & current status documents')],
        ['combo', L('I-765 + I-131 组合递交（各自缴费 $260/$630，2024-04 起不再免费）', 'I-765 + I-131 組合遞交（各自繳費 $260/$630，不再免費）', 'I-765 + I-131 combo ($260/$630 since Apr 2024, no longer free)')],
      ],
    } : {
      title: L('境外领事馆（CP）', '境外領事館（CP）', 'Consular processing'),
      items: [
        ['ds260', L('DS-260 确认页', 'DS-260 確認頁', 'DS-260 confirmation page')],
        ['police', L('无犯罪证明（16 岁后住满 6 个月的国家都要）', '無犯罪證明（16 歲後住滿 6 個月的國家）', 'Police certificates (countries lived 6+ months since 16)')],
        ['nvcfee', L('NVC 缴费收据', 'NVC 繳費收據', 'NVC fee receipts')],
      ],
    },
  ];
  const totalItems = groups.reduce((n, g) => n + g.items.length, 0);
  const doneItems = groups.reduce((n, g) => n + g.items.filter(([id]) => checked[id]).length, 0);

  return (
    <>
      {/* ① Don't-miss-the-window banner */}
      <div style={{ ...card, borderLeft: '3px solid var(--gc-green)', background: 'var(--gc-green-soft)' }}>
        <div style={{ padding: '12px 14px' }}>
          <div className="gc-eyebrow" style={{ ...eyebrow, color: 'var(--gc-green)' }}>
            {L('递件窗口已开', '遞件窗口已開', 'FILING WINDOW OPEN')}
          </div>
          <div style={{ fontSize: '13.5px', fontWeight: 700, color: 'var(--gc-green-ink)', margin: '4px 0 3px' }}>
            {L('本月就递，别等下个月', '本月就遞，別等下個月', 'File this month — don\'t wait')}
          </div>
          <div style={{ fontSize: '11.5px', lineHeight: 1.65, color: 'var(--gc-ink-soft)' }}>
            {L('排期每月重算，截止日可能回调（历史上多次发生）。窗口一关，你会退回等待，重新排到没有时间表。材料齐了就尽快递交。',
               '排期每月重算，截止日可能回調（歷史上多次發生）。窗口一關就退回等待，重新排到沒有時間表。材料齊了就盡快遞交。',
               'The bulletin resets monthly and cutoffs can retrogress — it has happened many times. If the window closes you go back to waiting with no timetable. File as soon as your packet is ready.')}
          </div>
        </div>
      </div>

      {/* ② Roadmap — collapsed by default: reference material, not a dashboard */}
      <div style={card}>
        <button type="button" onClick={() => setRoadmapOpen((v) => !v)}
          className="flex items-center justify-between"
          style={{ width: '100%', padding: '12px 14px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}>
          <span className="gc-eyebrow" style={{ ...eyebrow, color: 'var(--gc-muted)' }}>
            {inUS
              ? L('接下来 6 步 · 境内递件（I-485）', '接下來 6 步 · 境內遞件（I-485）', 'NEXT 6 STEPS · ADJUSTMENT (I-485)')
              : L('接下来 6 步 · 境外领事馆（CP）', '接下來 6 步 · 境外領事館（CP）', 'NEXT 6 STEPS · CONSULAR')}
          </span>
          <span style={{ fontSize: '9px', color: 'var(--gc-muted)', transform: roadmapOpen ? 'rotate(180deg)' : 'none', transition: 'transform 120ms' }}>▼</span>
        </button>
        {roadmapOpen && (
        <div style={{ padding: '0 14px 12px' }}>
          {steps.map(([tt, dd, dur], i) => (
            <div key={i} className="flex" style={{ gap: '10px', padding: '7px 0', borderBottom: i < steps.length - 1 ? '1px solid var(--gc-rule-soft)' : 'none' }}>
              <span className="gc-mono flex-shrink-0" style={{
                width: '20px', height: '20px', borderRadius: '50%', textAlign: 'center', lineHeight: '20px',
                fontSize: '10px', fontWeight: 700, background: 'var(--gc-green-soft)', color: 'var(--gc-green-ink)',
                border: '1px solid var(--gc-green-border)',
              }}>{i + 1}</span>
              <span style={{ minWidth: 0, flex: 1 }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gc-ink)' }}>{tt}</span>
                <span className="gc-mono" style={{ fontSize: '9.5px', color: 'var(--gc-muted)', marginLeft: '7px' }}>{dur}</span>
                <div style={{ fontSize: '11px', lineHeight: 1.55, color: 'var(--gc-ink-soft)', marginTop: '1px' }}>{dd}</div>
              </span>
            </div>
          ))}
          {!inUS && (
            <div style={{ marginTop: '9px', padding: '8px 10px', background: 'var(--gc-amber-soft)', borderLeft: '2px solid var(--gc-amber)', fontSize: '10.5px', lineHeight: 1.6, color: 'var(--gc-amber-ink)' }}>
              {L('两个最常踩的坑：①移民签证有效期一般只有 6 个月，逾期作废要重走流程；②入境后不缴 USCIS 移民费，绿卡永远不会寄出。',
                 '兩個最常踩的坑：①移民簽證一般僅 6 個月有效，逾期作廢要重走流程；②入境後不繳 USCIS 移民費，綠卡永遠不會寄出。',
                 'Two classic traps: ① the immigrant visa is typically valid only 6 months — expired means starting over; ② skip the USCIS immigrant fee after entry and the card is never mailed.')}
            </div>
          )}
        </div>
        )}
      </div>

      {/* ③ Document checklist */}
      <div style={card}>
        <button type="button" onClick={() => setOpenList((v) => !v)}
          className="flex items-center justify-between"
          style={{ width: '100%', padding: '12px 14px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}>
          <span className="gc-eyebrow" style={{ ...eyebrow, color: 'var(--gc-muted)' }}>
            {L('材料清单', '材料清單', 'DOCUMENT CHECKLIST')}
            <span className="gc-mono" style={{ marginLeft: '8px', fontSize: '10px', color: doneItems === totalItems && totalItems > 0 ? 'var(--gc-green)' : 'var(--gc-muted)', letterSpacing: 0, textTransform: 'none' }}>
              {doneItems}/{totalItems}
            </span>
          </span>
          <span style={{ fontSize: '9px', color: 'var(--gc-muted)', transform: openList ? 'rotate(180deg)' : 'none', transition: 'transform 120ms' }}>▼</span>
        </button>
        {openList && (
          <div style={{ padding: '0 14px 12px' }}>
            {groups.map((g, gi) => (
              <div key={gi} style={{ marginBottom: gi < groups.length - 1 ? '10px' : 0 }}>
                <div className="gc-eyebrow" style={{ fontSize: '8.5px', letterSpacing: '0.1em', fontWeight: 700, color: 'var(--gc-green)', margin: '6px 0 3px' }}>{g.title}</div>
                {g.items.map(([id, label]) => (
                  <label key={id} className="flex items-center" style={{ gap: '8px', padding: '4px 0', cursor: 'pointer', fontSize: '12px', color: checked[id] ? 'var(--gc-muted)' : 'var(--gc-ink-soft)', textDecoration: checked[id] ? 'line-through' : 'none' }}>
                    <input type="checkbox" checked={!!checked[id]} onChange={() => toggleItem(id)}
                      style={{ accentColor: 'var(--gc-green)', width: '14px', height: '14px', flexShrink: 0 }} />
                    {label}
                  </label>
                ))}
              </div>
            ))}
            <div style={{ marginTop: '8px', fontSize: '10px', lineHeight: 1.6, color: 'var(--gc-muted)' }}>
              {inUS
                ? L('提示：EAD 一般 1-2 年有效，过期前 180 天内可递 I-765 续期，别等断档。清单为常见项，个案差异请以律师意见为准。',
                    '提示：EAD 一般 1-2 年有效，過期前 180 天內可遞 I-765 續期。清單為常見項，個案請以律師意見為準。',
                    'Note: EADs typically run 1-2 years; renew within 180 days of expiry. This list covers the common items — follow your attorney for case specifics.')
                : L('清单为常见项，各领事馆要求略有差异，以面试通知与律师意见为准。',
                    '清單為常見項，各領事館要求略有差異，以面試通知與律師意見為準。',
                    'Common items only — consulates vary; follow your interview notice and attorney.')}
            </div>
          </div>
        )}
      </div>

      {/* ④ Crowd timeline + RFE — the dataset nobody else has in Chinese */}
      <div style={card}>
        <button type="button" onClick={() => setCrowdOpen((v) => !v)}
          className="flex items-center justify-between"
          style={{ width: '100%', padding: '12px 14px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}>
          <span className="gc-eyebrow" style={{ ...eyebrow, color: 'var(--gc-muted)' }}>
            {L('真实时间线互助（匿名）', '真實時間線互助（匿名）', 'REAL TIMELINES (ANONYMOUS)')}
            {tlAgg && tlAgg.total > 0 && (
              <span className="gc-mono" style={{ marginLeft: '8px', fontSize: '10px', color: 'var(--gc-green)', letterSpacing: 0, textTransform: 'none' }}>
                {tlAgg.total}
              </span>
            )}
          </span>
          <span style={{ fontSize: '9px', color: 'var(--gc-muted)', transform: crowdOpen ? 'rotate(180deg)' : 'none', transition: 'transform 120ms' }}>▼</span>
        </button>
        {crowdOpen && (
          <div style={{ padding: '0 14px 12px' }}>
            {/* aggregates first — give before you ask */}
            {tlAgg && tlAgg.total >= 3 ? (
              <div style={{ marginBottom: '10px', padding: '8px 10px', background: 'var(--gc-green-soft)', borderRadius: '3px' }}>
                <div style={{ fontSize: '10.5px', color: 'var(--gc-green-ink)', fontWeight: 700, marginBottom: '3px' }}>
                  {L(`${userCase.category} · ${tlAgg.total} 份真实时间线`, `${userCase.category} · ${tlAgg.total} 份真實時間線`, `${userCase.category} · ${tlAgg.total} real timelines`)}
                </div>
                <div className="gc-mono" style={{ fontSize: '10.5px', color: 'var(--gc-ink-soft)', lineHeight: 1.7 }}>
                  {tlAgg.medians?.receipt !== null && tlAgg.counts?.receipt >= 3 && <div>{L('递件→收据 中位 ', '遞件→收據 中位 ', 'filed→receipt median ')}{tlAgg.medians.receipt}{L(' 天', ' 天', 'd')}</div>}
                  {tlAgg.medians?.ead !== null && tlAgg.counts?.ead >= 3 && <div>{L('递件→EAD 中位 ', '遞件→EAD 中位 ', 'filed→EAD median ')}{tlAgg.medians.ead}{L(' 天', ' 天', 'd')}</div>}
                  {tlAgg.medians?.approved !== null && tlAgg.counts?.approved >= 3 && <div>{L('递件→批准 中位 ', '遞件→批准 中位 ', 'filed→approved median ')}{tlAgg.medians.approved}{L(' 天', ' 天', 'd')}</div>}
                </div>
              </div>
            ) : tlAgg ? (
              <div style={{ marginBottom: '10px', fontSize: '10.5px', color: 'var(--gc-muted)' }}>
                {L(`${userCase.category} 已收集 ${tlAgg.total || 0} 份时间线，满 3 份后显示中位耗时。`,
                   `${userCase.category} 已收集 ${tlAgg.total || 0} 份時間線，滿 3 份後顯示中位耗時。`,
                   `${tlAgg.total || 0} timeline(s) so far — medians appear at 3+.`)}
              </div>
            ) : null}

            {tlState === 'done' ? (
              <div style={{ marginBottom: '8px' }}>
                <div style={{ fontSize: '11px', color: 'var(--gc-green-ink)', fontWeight: 600 }}>
                  {L('时间线已提交 ✓ 谢谢你帮到了后来人', '時間線已提交 ✓ 謝謝', 'Timeline submitted ✓')}
                </div>
                <InlineSubscribeCTA userCase={userCase}
                  label={L('订阅后，你类别的时间线统计每月发到你邮箱', '訂閱後，你類別的時間線統計每月發到你信箱', 'Get your category\'s timeline stats by email monthly')} />
              </div>
            ) : (
              <>
                <div style={{ fontSize: '11px', color: 'var(--gc-ink-soft)', marginBottom: '7px', lineHeight: 1.55 }}>
                  {L('报你的关键日期（记得几个填几个，完全匿名），后来人就能看到真实的处理耗时：',
                     '報你的關鍵日期（記得幾個填幾個，完全匿名）：',
                     'Report the dates you know — fully anonymous:')}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '7px' }}>
                  {[['filed', L('递件日 *', '遞件日 *', 'Filed *')], ['receipt', L('收据', '收據', 'Receipt')],
                    ['biometrics', L('打指模', '打指模', 'Biometrics')], ['ead', L('EAD 到手', 'EAD 到手', 'EAD')],
                    ['interview', L('面试', '面試', 'Interview')], ['approved', L('批准', '批准', 'Approved')]].map(([k, label]) => (
                    <div key={k} style={{ fontSize: '9.5px', color: 'var(--gc-muted)' }}>
                      {label}
                      <div style={{ marginTop: '2px' }}>
                        <DateDropdown allowEmpty value={tlDates[k]}
                          onChange={(v) => setTlDates({ ...tlDates, [k]: v })}
                          triggerStyle={{ padding: '5px 7px', fontSize: '11px' }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center" style={{ gap: '6px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  <span style={{ fontSize: '10px', color: 'var(--gc-muted)' }}>{inUS ? L('服务中心', '服務中心', 'Service center') : L('领事馆', '領事館', 'Consulate')}</span>
                  <span className="inline-flex" style={{ border: '1px solid var(--gc-rule)', borderRadius: '3px', overflow: 'hidden', flexWrap: 'wrap' }}>
                    {(inUS
                      ? [['unknown', L('不确定', '不確定', 'N/A')], ['NSC', 'NSC'], ['TSC', 'TSC'], ['Potomac', 'Potomac'], ['MSC', 'MSC'], ['other-center', L('其他', '其他', 'Other')]]
                      : [['guangzhou', L('广州', '廣州', 'Guangzhou')], ['other-consulate', L('其他', '其他', 'Other')]]
                    ).map(([id, label], ci) => (
                      <button key={id} type="button" onClick={() => setTlCenter(id)}
                        style={{
                          fontSize: '10px', fontWeight: 700, padding: '4px 8px', border: 'none', cursor: 'pointer',
                          borderLeft: ci === 0 ? 'none' : '1px solid var(--gc-rule-soft)',
                          background: tlCenter === id ? 'var(--gc-green)' : 'var(--gc-surface)',
                          color: tlCenter === id ? 'var(--gc-paper)' : 'var(--gc-muted)',
                        }}>{label}</button>
                    ))}
                  </span>
                  <button type="button" onClick={submitTimeline} disabled={!tlDates.filed || tlState === 'loading'}
                    style={{ fontSize: '11px', fontWeight: 700, padding: '6px 12px', border: 'none', borderRadius: '3px', cursor: 'pointer', background: tlDates.filed ? 'var(--gc-green)' : 'var(--gc-rule)', color: 'var(--gc-paper)' }}>
                    {tlState === 'loading' ? '…' : L('匿名提交', '匿名提交', 'Submit')}
                  </button>
                </div>
                {tlState === 'error' && (
                  <div style={{ fontSize: '10px', color: 'var(--gc-red)', marginBottom: '6px' }}>{L('提交失败，检查递件日是否早于其他日期', '提交失敗', 'Failed — check that filed is the earliest date')}</div>
                )}
              </>
            )}

            {/* RFE mini-survey */}
            <div style={{ paddingTop: '8px', borderTop: '1px solid var(--gc-rule-soft)' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gc-ink)', marginBottom: '5px' }}>
                {L('收到过补件（RFE）吗？', '收到過補件（RFE）嗎？', 'Ever received an RFE?')}
                {rfeAgg && rfeAgg.total >= 3 && (
                  <span style={{ fontWeight: 400, fontSize: '10px', color: 'var(--gc-muted)', marginLeft: '7px' }}>
                    {L(`${rfeAgg.total} 份中 ${rfeAgg.gotRfe} 份收到过`, `${rfeAgg.total} 份中 ${rfeAgg.gotRfe} 份收到過`, `${rfeAgg.gotRfe}/${rfeAgg.total} did`)}
                  </span>
                )}
              </div>
              {rfeDone ? (
                <div style={{ fontSize: '11px', color: 'var(--gc-green-ink)', fontWeight: 600 }}>{L('已记录 ✓', '已記錄 ✓', 'Recorded ✓')}</div>
              ) : rfeGot === true ? (
                <div className="flex" style={{ gap: '6px', flexWrap: 'wrap' }}>
                  {[['medical', L('体检相关', '體檢相關', 'Medical')], ['financial', L('资金/担保', '資金/擔保', 'Financial')], ['relationship', L('关系证明', '關係證明', 'Relationship')], ['other', L('其他', '其他', 'Other')]].map(([id, label]) => (
                    <button key={id} type="button" onClick={() => { setRfeType(id); submitRfe(true, id); }}
                      style={{ fontSize: '10.5px', fontWeight: 700, padding: '5px 10px', border: '1px solid var(--gc-rule)', borderRadius: '3px', cursor: 'pointer', background: 'var(--gc-surface)', color: 'var(--gc-ink-soft)' }}>{label}</button>
                  ))}
                </div>
              ) : (
                <div className="flex" style={{ gap: '6px' }}>
                  <button type="button" onClick={() => submitRfe(false, null)}
                    style={{ fontSize: '10.5px', fontWeight: 700, padding: '5px 12px', border: '1px solid var(--gc-rule)', borderRadius: '3px', cursor: 'pointer', background: 'var(--gc-surface)', color: 'var(--gc-ink-soft)' }}>
                    {L('没有', '沒有', 'No')}
                  </button>
                  <button type="button" onClick={() => setRfeGot(true)}
                    style={{ fontSize: '10.5px', fontWeight: 700, padding: '5px 12px', border: '1px solid var(--gc-amber-border)', borderRadius: '3px', cursor: 'pointer', background: 'var(--gc-amber-soft)', color: 'var(--gc-amber-ink)' }}>
                    {L('收到过', '收到過', 'Yes')}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

// ============================================================
// CommunityHub — the always-on interaction card: monthly one-tap poll, the
// milestone wall, and the surveys/question box. Every submission is anonymous
// (see /api/community); localStorage only guards against double-submits.
// ============================================================
const CURRENT_POLL = {
  id: 'poll-2026-09-bulletin',
  q: { zh: '9 月排期，你觉得你的类别会怎么走？', tw: '9 月排期，你覺得你的類別會怎麼走？', en: 'Your call for the September bulletin:' },
  options: [
    { id: 'advance', zh: '会前进', tw: '會前進', en: 'Advances' },
    { id: 'flat', zh: '原地不动', tw: '原地不動', en: 'Flat' },
    { id: 'retro', zh: '会回调', tw: '會回調', en: 'Retrogresses' },
  ],
};

const CommunityHub = ({ userCase }) => {
  const { lang } = useLang();
  const L = (zh, tw, en) => (lang === 'en' ? en : lang === 'tw' ? tw : zh);
  const isEB = !userCase.category?.startsWith('F');
  const [tab, setTab] = useState(null); // null = collapsed | poll | wall | survey
  const [busy, setBusy] = useState('');

  const post = async (payload, doneKey) => {
    setBusy(doneKey);
    try {
      const r = await fetch(`${API_BASE}/api/community`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, cat: userCase.category, country: userCase.country }),
      });
      if (!r.ok) throw new Error();
      try { window.localStorage.setItem(`gc_cd_${doneKey}`, '1'); } catch { /* noop */ }
      setBusy('');
      return true;
    } catch { setBusy(''); return false; }
  };
  const done = (k) => { try { return !!window.localStorage.getItem(`gc_cd_${k}`); } catch { return false; } };

  // poll
  const pollKey = CURRENT_POLL.id;
  const [pollAgg, setPollAgg] = useState(null);
  const [voted, setVoted] = useState(() => done(pollKey));
  useEffect(() => {
    if (tab === 'poll' && voted && !pollAgg) {
      fetch(`${API_BASE}/api/community?type=poll&pollId=${pollKey}`).then((r) => r.json()).then(setPollAgg).catch(() => {});
    }
  }, [tab, voted]); // eslint-disable-line react-hooks/exhaustive-deps
  const vote = async (choice) => {
    if (await post({ type: 'poll', pollId: pollKey, choice }, pollKey)) {
      setVoted(true);
      // Optimistic: KV's list index lags writes by up to a minute — the voter must
      // still see their own vote in the bars immediately.
      setPollAgg((prev) => {
        const base = prev || { total: 0, choices: {} };
        return { total: base.total + 1, choices: { ...base.choices, [choice]: (base.choices[choice] || 0) + 1 } };
      });
      fetch(`${API_BASE}/api/community?type=poll&pollId=${pollKey}`).then((r) => r.json())
        .then((data) => setPollAgg((prev) => (data && data.total >= (prev?.total || 0) ? data : prev)))
        .catch(() => {});
    }
  };

  // wall
  const pdD2 = userCase.priorityDate ? new Date(userCase.priorityDate + 'T00:00:00') : null;
  const myDays = pdD2 ? Math.max(0, Math.round((Date.now() - pdD2.getTime()) / 86400000)) : null;
  const [wallMsg, setWallMsg] = useState('');
  const [wall, setWall] = useState(null);
  const [walled, setWalled] = useState(() => done('wall'));
  const [wallExpanded, setWallExpanded] = useState(false); // 默认只显示前 5 条，别把页面撑太长
  useEffect(() => {
    if (tab === 'wall' && !wall) {
      fetch(`${API_BASE}/api/community?type=wall`).then((r) => r.json()).then(setWall).catch(() => {});
    }
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps
  const checkIn = async () => {
    if (myDays === null) return;
    if (await post({ type: 'wall', days: myDays, message: wallMsg }, 'wall')) {
      setWalled(true);
      setWall(null);
      fetch(`${API_BASE}/api/community?type=wall`).then((r) => r.json()).then(setWall).catch(() => {});
    }
  };

  // surveys
  const [swAction, setSwAction] = useState(null);
  const [swAgg, setSwAgg] = useState(null);
  const [swOutcome, setSwOutcome] = useState(null);
  const [swDone, setSwDone] = useState(() => done('switch'));
  useEffect(() => {
    if (tab === 'survey' && swDone && !swAgg) {
      fetch(`${API_BASE}/api/community?type=switch&cat=${userCase.category}`).then((r) => r.json()).then(setSwAgg).catch(() => {});
    }
  }, [tab, swDone]); // eslint-disable-line react-hooks/exhaustive-deps
  const [costDone, setCostDone] = useState(() => done('cost'));
  const [costAgg, setCostAgg] = useState(null);
  useEffect(() => {
    if (tab === 'survey' && costDone && !costAgg) {
      fetch(`${API_BASE}/api/community?type=cost&cat=${userCase.category}`).then((r) => r.json()).then(setCostAgg).catch(() => {});
    }
  }, [tab, costDone]); // eslint-disable-line react-hooks/exhaustive-deps
  const [qText, setQText] = useState('');
  const [qDone, setQDone] = useState(() => done('question'));

  // The "switched category" option only makes sense worded toward whatever direction
  // is actually reachable from THIS user's category (EB2 goes down to EB-3, EB3 goes
  // up to EB-2) — a fixed "降级 EB-3" label was nonsensical for an EB-2 or EB-1 reader.
  const switchOpt = {
    EB2: { id: 'downgrade', label: L('降级到 EB-3', '降級到 EB-3', 'Downgraded to EB-3') },
    EB3: { id: 'upgrade', label: L('升级到 EB-2', '升級到 EB-2', 'Upgraded to EB-2') },
  }[userCase.category] || { id: 'switched', label: L('换过类别', '換過類別', 'Switched category') };

  const chip = (active) => ({
    fontSize: '10.5px', fontWeight: 700, padding: '6px 10px', border: `1px solid ${active ? 'var(--gc-green)' : 'var(--gc-rule)'}`,
    borderRadius: '3px', cursor: 'pointer', background: active ? 'var(--gc-green)' : 'var(--gc-surface)',
    color: active ? 'var(--gc-paper)' : 'var(--gc-ink-soft)',
  });
  const submitBtn = { fontSize: '11px', fontWeight: 700, padding: '6px 14px', border: 'none', borderRadius: '3px', cursor: 'pointer', background: 'var(--gc-green)', color: 'var(--gc-paper)' };
  const doneNote = (txt) => (
    <div style={{ fontSize: '11px', color: 'var(--gc-green-ink)', fontWeight: 600 }}>{txt}</div>
  );

  return (
    <div style={{ background: 'var(--gc-surface)', border: '1px solid var(--gc-rule)', borderRadius: '4px', overflow: 'hidden' }}>
      <div className="flex items-center justify-between" style={{ padding: '11px 14px 0' }}>
        <span className="gc-eyebrow" style={{ fontSize: '9px', letterSpacing: '0.12em', fontWeight: 700, color: 'var(--gc-muted)' }}>
          {L('同路人', '同路人', 'COMMUNITY')}
        </span>
        <span className="inline-flex" style={{ border: '1px solid var(--gc-rule)', borderRadius: '3px', overflow: 'hidden' }}>
          {[['poll', L('每月一题', '每月一題', 'Poll')], ['wall', L('打卡墙', '打卡牆', 'Wall')], ['survey', L('调查·提问', '調查·提問', 'Surveys')]].map(([id, label], i) => (
            <button key={id} type="button" onClick={() => setTab(tab === id ? null : id)}
              style={{
                fontSize: '10px', fontWeight: 700, padding: '3px 9px', border: 'none', cursor: 'pointer',
                borderLeft: i === 0 ? 'none' : '1px solid var(--gc-rule-soft)',
                background: tab === id ? 'var(--gc-green)' : 'var(--gc-surface)',
                color: tab === id ? 'var(--gc-paper)' : 'var(--gc-muted)',
              }}>{label}</button>
          ))}
        </span>
      </div>

      {tab === null && <div style={{ height: '11px' }} />}
      {tab !== null && (
      <div style={{ padding: '10px 14px 13px' }}>
        {tab === 'poll' && (
          <div>
            <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--gc-ink)', marginBottom: '8px' }}>
              {CURRENT_POLL.q[lang] || CURRENT_POLL.q.zh}
            </div>
            {!voted ? (
              <div className="flex" style={{ gap: '8px', flexWrap: 'wrap' }}>
                {CURRENT_POLL.options.map((o) => (
                  <button key={o.id} type="button" disabled={busy === pollKey} onClick={() => vote(o.id)} style={chip(false)}>
                    {o[lang] || o.zh}
                  </button>
                ))}
              </div>
            ) : pollAgg ? (
              <div>
                {CURRENT_POLL.options.map((o) => {
                  const n = pollAgg.choices?.[o.id] || 0;
                  const pct = pollAgg.total ? Math.round((n / pollAgg.total) * 100) : 0;
                  return (
                    <div key={o.id} className="flex items-center" style={{ gap: '8px', padding: '2px 0' }}>
                      <span style={{ fontSize: '11px', color: 'var(--gc-ink-soft)', width: '72px', flexShrink: 0 }}>{o[lang] || o.zh}</span>
                      <span style={{ flex: 1, height: '8px', background: 'var(--gc-rule-soft)', borderRadius: '4px', overflow: 'hidden' }}>
                        <span style={{ display: 'block', height: '100%', width: `${pct}%`, background: 'var(--gc-green)' }} />
                      </span>
                      <span className="gc-mono" style={{ fontSize: '10.5px', color: 'var(--gc-muted)', width: '42px', textAlign: 'right' }}>{pct}%</span>
                    </div>
                  );
                })}
                <div style={{ fontSize: '10px', color: 'var(--gc-muted)', marginTop: '5px' }}>
                  {L(`已投 ${pollAgg.total} 票 · 匿名`, `已投 ${pollAgg.total} 票 · 匿名`, `${pollAgg.total} votes · anonymous`)}
                </div>
              </div>
            ) : doneNote(L('已投票 ✓', '已投票 ✓', 'Voted ✓'))}
          </div>
        )}

        {tab === 'wall' && (
          <div>
            {myDays !== null && (
              <div style={{ fontSize: '12px', color: 'var(--gc-ink-soft)', marginBottom: '7px' }}>
                {L(`你已等待 `, `你已等待 `, `You've waited `)}
                <b className="gc-mono" style={{ color: 'var(--gc-green-ink)' }}>{myDays.toLocaleString('en-US')}</b>
                {L(' 天', ' 天', ' days')}
              </div>
            )}
            {!walled ? (
              <div className="flex" style={{ gap: '6px', flexWrap: 'wrap' }}>
                <input value={wallMsg} onChange={(e) => setWallMsg(e.target.value.slice(0, 40))}
                  placeholder={L('说一句（可留空，40 字内）', '說一句（可留空）', 'One line (optional)')}
                  style={{ flex: '1 1 180px', minWidth: 0, fontSize: '11.5px', padding: '6px 9px', border: '1px solid var(--gc-rule)', borderRadius: '3px', background: 'var(--gc-paper)', color: 'var(--gc-ink)' }} />
                <button type="button" onClick={checkIn} disabled={busy === 'wall' || myDays === null} style={submitBtn}>
                  {L('打卡', '打卡', 'Check in')}
                </button>
              </div>
            ) : doneNote(L('已打卡 ✓', '已打卡 ✓', 'Checked in ✓'))}
            <div style={{ marginTop: '9px', paddingTop: '8px', borderTop: '1px solid var(--gc-rule-soft)' }}>
              {wall === null ? (
                <div style={{ fontSize: '10.5px', color: 'var(--gc-muted)' }}>…</div>
              ) : wall.entries?.length ? (
                <>
                  {(wallExpanded ? wall.entries : wall.entries.slice(0, 5)).map((e, i, arr) => (
                    <div key={i} className="flex items-baseline" style={{ gap: '8px', padding: '3px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--gc-rule-soft)' : 'none' }}>
                      <span className="gc-mono" style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--gc-green-ink)', flexShrink: 0 }}>
                        {Number(e.days).toLocaleString('en-US')}{L('天', '天', 'd')}
                      </span>
                      {e.cat && <span className="gc-mono" style={{ fontSize: '9.5px', color: 'var(--gc-muted)', flexShrink: 0 }}>{e.cat}</span>}
                      <span style={{ fontSize: '11px', color: 'var(--gc-ink-soft)', minWidth: 0 }}>{e.message || L('……', '……', '…')}</span>
                    </div>
                  ))}
                  {wall.entries.length > 5 && (
                    <button type="button" onClick={() => setWallExpanded((v) => !v)}
                      style={{ border: 'none', background: 'transparent', padding: '6px 0 0', cursor: 'pointer', fontSize: '10.5px', color: 'var(--gc-green)', fontWeight: 700 }}>
                      {wallExpanded ? L('收起', '收起', 'Collapse') : L(`展开全部 ${wall.entries.length} 条`, `展開全部 ${wall.entries.length} 條`, `Show all ${wall.entries.length}`)}
                    </button>
                  )}
                </>
              ) : (
                <div style={{ fontSize: '10.5px', color: 'var(--gc-muted)' }}>
                  {L('还没有人打卡——做第一个。', '還沒有人打卡——做第一個。', 'No check-ins yet — be the first.')}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'survey' && (
          <div>
            {isEB && (
              <div style={{ marginBottom: '11px' }}>
                <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--gc-ink)', marginBottom: '5px' }}>
                  {L('你为缩短等待做过什么？', '你為縮短等待做過什麼？', 'Have you tried to shorten the wait?')}
                </div>
                {!swDone ? (
                  <>
                    <div className="flex" style={{ gap: '6px', flexWrap: 'wrap', marginBottom: '5px' }}>
                      {[[switchOpt.id, switchOpt.label], ['porting', L('换雇主', '換雇主', 'Changed employer')], ['premium', L('用过加急', '用過加急', 'Premium processing')], ['none', L('都没有', '都沒有', 'None')]].map(([id, label]) => (
                        <button key={id} type="button" onClick={() => { setSwAction(id); if (id === 'none') setSwOutcome(null); }} style={chip(swAction === id)}>{label}</button>
                      ))}
                    </div>
                    {swAction && swAction !== 'none' && (
                      <div className="flex" style={{ gap: '6px', flexWrap: 'wrap', marginBottom: '5px' }}>
                        {[['faster', L('确实快了', '確實快了', 'Faster')], ['same', L('差不多', '差不多', 'Same')], ['regret', L('后悔了', '後悔了', 'Regret it')], ['pending', L('还在等结果', '還在等結果', 'Pending')]].map(([id, label]) => (
                          <button key={id} type="button" onClick={() => setSwOutcome(id)} style={chip(swOutcome === id)}>{label}</button>
                        ))}
                      </div>
                    )}
                    {swAction && (swAction === 'none' || swOutcome) && (
                      <button type="button" style={submitBtn} disabled={busy === 'switch'}
                        onClick={async () => {
                          if (await post({ type: 'switch', action: swAction, outcome: swOutcome }, 'switch')) {
                            setSwDone(true);
                            setSwAgg((prev) => {
                              const base = prev || { total: 0, actions: {} };
                              return { total: base.total + 1, actions: { ...base.actions, [swAction]: (base.actions[swAction] || 0) + 1 } };
                            });
                            fetch(`${API_BASE}/api/community?type=switch&cat=${userCase.category}`).then((r) => r.json())
                              .then((data) => setSwAgg((prev) => (data && data.total >= (prev?.total || 0) ? data : prev)))
                              .catch(() => {});
                          }
                        }}>
                        {L('匿名提交', '匿名提交', 'Submit')}
                      </button>
                    )}
                  </>
                ) : (
                  <div>
                    {doneNote(L('已提交 ✓', '已提交 ✓', 'Submitted ✓'))}
                    {swAgg && swAgg.total > 0 && (
                      <div style={{ marginTop: '5px' }}>
                        {[[switchOpt.id, switchOpt.label], ['porting', L('换雇主', '換雇主', 'Port')], ['premium', L('加急', '加急', 'Premium')], ['none', L('都没有', '都沒有', 'None')]].map(([id, label]) => {
                          const n = swAgg.actions?.[id] || 0;
                          const pct = swAgg.total ? Math.round((n / swAgg.total) * 100) : 0;
                          return (
                            <div key={id} className="flex items-center" style={{ gap: '8px', padding: '2px 0' }}>
                              <span style={{ fontSize: '10.5px', color: 'var(--gc-ink-soft)', width: '70px', flexShrink: 0 }}>{label}</span>
                              <span style={{ flex: 1, height: '7px', background: 'var(--gc-rule-soft)', borderRadius: '3px', overflow: 'hidden' }}>
                                <span style={{ display: 'block', height: '100%', width: `${pct}%`, background: 'var(--gc-green)' }} />
                              </span>
                              <span className="gc-mono" style={{ fontSize: '10px', color: 'var(--gc-muted)', width: '38px', textAlign: 'right' }}>{pct}%</span>
                            </div>
                          );
                        })}
                        <div style={{ fontSize: '9.5px', color: 'var(--gc-muted)', marginTop: '3px' }}>
                          {L(`${swAgg.total} 份 · 匿名`, `${swAgg.total} 份 · 匿名`, `${swAgg.total} responses`)}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div style={{ marginBottom: '11px' }}>
              <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--gc-ink)', marginBottom: '5px' }}>
                {L('整个流程的律师费＋官费，大概花了多少？', '整個流程的律師費＋官費，大概花了多少？', 'Total attorney + filing fees so far?')}
              </div>
              {!costDone ? (
                <div className="flex" style={{ gap: '6px', flexWrap: 'wrap' }}>
                  {[['lt5k', '< $5k'], ['b5to10k', '$5-10k'], ['b10to15k', '$10-15k'], ['gt15k', '> $15k']].map(([id, label]) => (
                    <button key={id} type="button" disabled={busy === 'cost'} style={chip(false)}
                      onClick={async () => {
                        if (await post({ type: 'cost', bracket: id }, 'cost')) {
                          setCostDone(true);
                          setCostAgg((prev) => {
                            const base = prev || { total: 0, brackets: {} };
                            return { total: base.total + 1, brackets: { ...base.brackets, [id]: (base.brackets[id] || 0) + 1 } };
                          });
                          fetch(`${API_BASE}/api/community?type=cost&cat=${userCase.category}`).then((r) => r.json())
                            .then((data) => setCostAgg((prev) => (data && data.total >= (prev?.total || 0) ? data : prev)))
                            .catch(() => {});
                        }
                      }}>{label}</button>
                  ))}
                </div>
              ) : (
                <div>
                  {doneNote(L('已提交 ✓ 谢谢', '已提交 ✓ 謝謝', 'Submitted ✓'))}
                  {costAgg && costAgg.total > 0 && (
                    <div style={{ marginTop: '5px' }}>
                      {[['lt5k', '< $5k'], ['b5to10k', '$5-10k'], ['b10to15k', '$10-15k'], ['gt15k', '> $15k']].map(([id, label]) => {
                        const n = costAgg.brackets?.[id] || 0;
                        const pct = costAgg.total ? Math.round((n / costAgg.total) * 100) : 0;
                        return (
                          <div key={id} className="flex items-center" style={{ gap: '8px', padding: '2px 0' }}>
                            <span style={{ fontSize: '10.5px', color: 'var(--gc-ink-soft)', width: '70px', flexShrink: 0 }}>{label}</span>
                            <span style={{ flex: 1, height: '7px', background: 'var(--gc-rule-soft)', borderRadius: '3px', overflow: 'hidden' }}>
                              <span style={{ display: 'block', height: '100%', width: `${pct}%`, background: 'var(--gc-green)' }} />
                            </span>
                            <span className="gc-mono" style={{ fontSize: '10px', color: 'var(--gc-muted)', width: '38px', textAlign: 'right' }}>{pct}%</span>
                          </div>
                        );
                      })}
                      <div style={{ fontSize: '9.5px', color: 'var(--gc-muted)', marginTop: '3px' }}>
                        {L(`${costAgg.total} 份 · 匿名`, `${costAgg.total} 份 · 匿名`, `${costAgg.total} responses`)}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--gc-ink)', marginBottom: '5px' }}>
                {L('关于排期，你最想搞懂什么？', '關於排期，你最想搞懂什麼？', 'What do you most want explained?')}
              </div>
              {!qDone ? (
                <div className="flex" style={{ gap: '6px', flexWrap: 'wrap' }}>
                  <input value={qText} onChange={(e) => setQText(e.target.value.slice(0, 200))}
                    placeholder={L('写一句，会变成后续内容选题', '寫一句，會變成後續內容選題', 'One line — it shapes what we write next')}
                    style={{ flex: '1 1 200px', minWidth: 0, fontSize: '11.5px', padding: '6px 9px', border: '1px solid var(--gc-rule)', borderRadius: '3px', background: 'var(--gc-paper)', color: 'var(--gc-ink)' }} />
                  <button type="button" style={submitBtn} disabled={busy === 'question' || qText.trim().length < 4}
                    onClick={async () => { if (await post({ type: 'question', text: qText }, 'question')) setQDone(true); }}>
                    {L('提交', '提交', 'Send')}
                  </button>
                </div>
              ) : doneNote(L('已收到 ✓ 谢谢', '已收到 ✓ 謝謝', 'Received ✓'))}
            </div>
          </div>
        )}
        {(voted || walled || swDone || costDone || qDone) && (
          <div style={{ marginTop: '4px' }}>
            <InlineSubscribeCTA userCase={userCase}
              label={L('这批社区数据的完整分析，每月随排期邮件发出', '這批社區數據的完整分析，每月隨排期郵件發出', 'Full analysis of this data ships with the monthly email')} />
          </div>
        )}
      </div>
      )}
    </div>
  );
};

// ============================================================
// Overview - Summary page showing user's status at a glance
// ============================================================
// While the case is still queued, the I-485 card has nothing procedural to show — so it
// shows the thing the subscriber actually watches: how the bulletin moved. Monthly
// signed columns (advance up in blue, retrogression down in red — polarity is carried
// by POSITION relative to the baseline, color is reinforcement) plus one separated,
// direct-labeled cumulative column in green. All marks use theme tokens; identity never
// rides on color alone (the consulate theme's blue and green are the same navy by
// design, so the divider + 「累计」 label do that work there).
const BulletinMovementChart = ({ cat, country, chart = null, onChartChange = null }) => {
  const { lang } = useLang();
  const [windowMonths, setWindowMonths] = useState(12);
  // Defaults to the ADOPTED chart — hero says "B · 约4.5年" while the chart opened
  // on A, two different measures on one screen with no reason. When the parent passes
  // `chart`/`onChartChange`, this toggle and the case card's B/A toggle are ONE
  // switch: flipping either flips both.
  const [chartSelInternal, setChartSelInternal] = useState(FILING_AUTHORIZED[cat] ? 'B' : 'A');
  const chartSel = chart || chartSelInternal;
  const setChartSel = (c) => { setChartSelInternal(c); if (onChartChange) onChartChange(c); };
  const [sel, setSel] = useState(null); // null → latest month

  const points = monthlyMovementFromArchive(cat, country, windowMonths, chartSel === 'B' ? 'filing' : 'finalAction');
  if (!points || points.filter((p) => p.days !== null).length < 3) return null;

  const total = points.reduce((s, p) => s + (p.days || 0), 0);
  const maxUp = Math.max(...points.map((p) => Math.max(p.days || 0, 0)), 0);
  const maxDown = Math.max(...points.map((p) => Math.max(-(p.days || 0), 0)), 0);

  const UP_PX = 84;
  // 12-month columns are wide enough for single-line labels; only the 24-month view
  // needs the two-row stagger, so only it pays the extra headroom.
  const LABEL_ROOM = windowMonths === 24 ? 20 : 12;
  const plotH = UP_PX - LABEL_ROOM;
  // Bars scale to the biggest single month — NOT to the cumulative total. Sharing one
  // scale with the total squashed every bar into the bottom sixth of the chart. The
  // cumulative story now rides the overlay line, which has its own normalization.
  const perDay = plotH / Math.max(maxUp, maxDown, 1);
  const downPx = maxDown > 0 ? Math.ceil(maxDown * perDay) + LABEL_ROOM : 0;

  // Stagger assignment (24-month view only): a labeled column whose immediate left
  // neighbor is labeled on the same side of the baseline takes the raised row.
  const labelRow = points.map(() => 0);
  if (windowMonths === 24) {
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1].days, b = points[i].days;
      if (a && b && Math.sign(a) === Math.sign(b) && labelRow[i - 1] === 0) labelRow[i] = 1;
    }
  }

  // Cumulative step line: running net total per month, normalized to the plot height
  // (its own scale — the legend says so). Flat runs = stalls; drops = retrogression.
  const cums = [];
  {
    let run = 0;
    for (const p of points) { run += p.days || 0; cums.push(run); }
  }
  const cumMax = Math.max(...cums, 0);
  const cumMin = Math.min(...cums, 0);
  const cumSpan = Math.max(cumMax - cumMin, 1);
  const showLine = cumMax > 0;
  // Step path across N equal columns in a 0–100 × 0–UP_PX viewBox (non-uniform scale).
  const n = points.length;
  const yOf = (v) => 2 + (1 - (v - cumMin) / cumSpan) * (plotH - 4) + LABEL_ROOM;
  // Start at the zero level, then per month: rise to that month's running total,
  // run flat across the column. Flat runs are stalls, drops are retrogression.
  const linePath = (() => {
    let d = `M 0 ${yOf(cums[0] - (points[0].days || 0)).toFixed(1)}`;
    for (let i = 0; i < n; i++) {
      d += ` V ${yOf(cums[i]).toFixed(1)} H ${(((i + 1) / n) * 100).toFixed(2)}`;
    }
    return d;
  })();
  const areaPath = `${linePath} V ${yOf(cumMin < 0 ? cumMin : 0).toFixed(1)} H 0 Z`;

  const selIdx = sel === null ? points.length - 1 : sel;
  const selPt = points[selIdx];

  const fmtMonth = (m) => {
    const [y, mo] = m.split('-');
    return lang === 'en' ? `${mo}/${y.slice(2)}` : `${y.slice(2)}年${parseInt(mo, 10)}月`;
  };
  // Tapped-month readout: what happened + where the cutoff stood that month.
  const cutText = selPt.cutoff === 'C'
    ? (lang === 'en' ? 'Current' : '无排期（C）')
    : selPt.cutoff || (lang === 'en' ? 'U' : '无名额（U）');
  const readout = selPt.days === null
    ? (lang === 'en' ? `${fmtMonth(selPt.month)} · cutoff ${cutText}` : `${fmtMonth(selPt.month)} · 截止日 ${cutText}`)
    : selPt.days === 0
      ? (lang === 'en' ? `${fmtMonth(selPt.month)} · no movement · cutoff ${cutText}` : lang === 'tw' ? `${fmtMonth(selPt.month)} · 沒有變化 · 停在 ${cutText}` : `${fmtMonth(selPt.month)} · 没有变化 · 停在 ${cutText}`)
      : (lang === 'en'
          ? `${fmtMonth(selPt.month)} · ${selPt.days > 0 ? 'advanced' : 'retrogressed'} ${Math.abs(selPt.days)} days · cutoff ${cutText}`
          : lang === 'tw'
            ? `${fmtMonth(selPt.month)} · ${selPt.days > 0 ? '前進' : '倒退'} ${Math.abs(selPt.days)} 天 · ${selPt.days > 0 ? '排到' : '回到'} ${cutText}`
            : `${fmtMonth(selPt.month)} · ${selPt.days > 0 ? '前进' : '倒退'} ${Math.abs(selPt.days)} 天 · ${selPt.days > 0 ? '排到' : '回到'} ${cutText}`);

  const hasNegative = maxDown > 0;
  const manual = sel !== null;

  return (
    <div style={{ padding: '10px 12px 9px' }}>
      {/* Header: eyebrow + chart (A/B) and window (12/24) toggles */}
      <div className="flex items-center justify-between" style={{ marginBottom: '8px' }}>
        <span className="gc-eyebrow" style={{ fontSize: '9px', color: 'var(--gc-muted)', minWidth: 0 }}>
          {lang === 'en' ? 'Bulletin movement' : lang === 'tw' ? '排期推進' : '排期推进'}
          <span style={{ fontWeight: 400, letterSpacing: 0, textTransform: 'none', marginLeft: '5px', color: 'var(--gc-muted-soft)' }}>
            {chartSel === 'A'
              ? (lang === 'en' ? '— approval pace (Chart A)' : lang === 'tw' ? '—— 獲批口徑（表A）' : '—— 获批口径（表A）')
              : (lang === 'en' ? '— filing pace (Chart B)' : lang === 'tw' ? '—— 遞件口徑（表B）' : '—— 递件口径（表B）')}
          </span>
        </span>
        <div className="inline-flex items-center" style={{ gap: '5px', flexShrink: 0 }}>
          <span className="inline-flex" style={{ border: '1px solid var(--gc-rule)', borderRadius: '3px', overflow: 'hidden' }}>
            {/* B first, matching the case card's B·递件 / A·获批 order. */}
            {['B', 'A'].map((c, i) => (
              <button key={c} type="button"
                onClick={() => { setChartSel(c); setSel(null); }}
                className="gc-mono"
                style={{
                  fontSize: '9px', fontWeight: 700, padding: '2px 7px', lineHeight: 1.4,
                  border: 'none', cursor: 'pointer',
                  borderLeft: i === 0 ? 'none' : '1px solid var(--gc-rule-soft)',
                  background: chartSel === c ? 'var(--gc-green)' : 'var(--gc-surface)',
                  color: chartSel === c ? 'var(--gc-paper)' : 'var(--gc-muted)',
                }}>
                {lang === 'en' ? c : `表${c}`}
              </button>
            ))}
          </span>
          <span className="inline-flex" style={{ border: '1px solid var(--gc-rule)', borderRadius: '3px', overflow: 'hidden' }}>
            {[12, 24].map((w, i) => (
              <button key={w} type="button"
                onClick={() => { setWindowMonths(w); setSel(null); }}
                className="gc-mono"
                style={{
                  fontSize: '9px', fontWeight: 700, padding: '2px 7px', lineHeight: 1.4,
                  border: 'none', cursor: 'pointer',
                  borderLeft: i === 0 ? 'none' : '1px solid var(--gc-rule-soft)',
                  background: windowMonths === w ? 'var(--gc-ink)' : 'transparent',
                  color: windowMonths === w ? 'var(--gc-paper)' : 'var(--gc-muted)',
                }}>
                {lang === 'en' ? `${w}mo` : `${w}月`}
              </button>
            ))}
          </span>
        </div>
      </div>

      {/* Plot: monthly columns with the cumulative step line washed behind them.
          A 34px gutter on the right keeps the line's endpoint label out of the last
          column — without it, "+609" lands on top of the last bar's own number
          whenever the biggest month is also the latest one. */}
      <div style={{ position: 'relative', paddingRight: showLine ? '34px' : 0 }}>
        {showLine && (
          <svg viewBox={`0 0 100 ${UP_PX}`} preserveAspectRatio="none" aria-hidden="true"
               style={{ position: 'absolute', left: 0, top: 0, width: 'calc(100% - 34px)', height: `${UP_PX}px`, pointerEvents: 'none' }}>
            <path d={areaPath} fill="var(--gc-green)" opacity="0.08" />
            <path d={linePath} fill="none" stroke="var(--gc-green)" strokeWidth="1.5"
                  vectorEffect="non-scaling-stroke" opacity="0.75" />
          </svg>
        )}
        {/* Endpoint label in the gutter, vertically centered on the line's end.
            HTML, not SVG text, so the non-uniform viewBox can't distort glyphs. */}
        {showLine && (
          <span className="gc-mono" style={{
            position: 'absolute', right: 0, top: `${Math.min(Math.max(yOf(cums[n - 1]) - 5, LABEL_ROOM - 4), UP_PX - 12)}px`,
            fontSize: '9.5px', fontWeight: 700, color: 'var(--gc-green-ink)',
            pointerEvents: 'none',
          }}>
            {total >= 0 ? '+' : '−'}{Math.abs(total)}
          </span>
        )}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px' }}>
          {points.map((p, i) => {
            const isSel = i === selIdx;
            const barOpacity = manual ? (isSel ? 1 : 0.35) : 0.9;
            const upH = p.days > 0 ? Math.max(p.days * perDay, 2) : 0;
            const dnH = p.days < 0 ? Math.max(-p.days * perDay, 2) : 0;
            return (
              <button key={p.month} type="button"
                onClick={() => setSel(i === selIdx && sel !== null ? null : i)}
                aria-label={readout}
                style={{
                  flex: '1 1 0', minWidth: 0, padding: 0, border: 'none', cursor: 'pointer',
                  background: manual && isSel ? 'var(--gc-paper-soft)' : 'transparent',
                  borderRadius: '3px 3px 0 0',
                }}>
                <div style={{ height: `${UP_PX}px`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
                  {p.days > 0 && (
                    <>
                      <span className="gc-mono" style={{
                        fontSize: '8px', lineHeight: '9px', fontWeight: 600,
                        color: 'var(--gc-ink-soft)', whiteSpace: 'nowrap',
                        transform: labelRow[i] ? 'translateY(-9px)' : 'none',
                        opacity: barOpacity, marginBottom: '1px',
                      }}>{p.days}</span>
                      <div style={{
                        width: '100%', maxWidth: '18px', height: `${upH}px`,
                        background: 'var(--gc-blue)', borderRadius: '2px 2px 0 0',
                        opacity: barOpacity,
                      }} />
                    </>
                  )}
                  {p.days === 0 && (
                    <div style={{ width: '100%', maxWidth: '12px', height: '2px', background: 'var(--gc-subtle)', opacity: manual && !isSel ? 0.4 : 1 }} />
                  )}
                  {p.days === null && (p.cutoff === 'C' ? (
                    <div className="flex items-start justify-center" style={{
                      width: '100%', maxWidth: '18px', height: `${Math.round(plotH)}px`,
                      background: 'var(--gc-green-soft)',
                      border: '1px dashed var(--gc-green-border)',
                      borderBottom: 'none',
                      borderRadius: '2px 2px 0 0',
                      opacity: manual && !isSel ? 0.4 : 1,
                    }}>
                      <span className="gc-mono" style={{ fontSize: '9px', lineHeight: 1, fontWeight: 700, color: 'var(--gc-green)', marginTop: '3px' }}>C</span>
                    </div>
                  ) : (
                    <div style={{ width: '4px', height: '4px', borderRadius: '50%', border: '1px solid var(--gc-subtle)', marginBottom: '-1px' }} />
                  ))}
                </div>
                {hasNegative && (
                  <div style={{ height: `${downPx}px`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start' }}>
                    {p.days < 0 && (
                      <>
                        <div style={{
                          width: '100%', maxWidth: '18px', height: `${dnH}px`,
                          background: 'var(--gc-red)', borderRadius: '0 0 2px 2px',
                          opacity: barOpacity,
                        }} />
                        <span className="gc-mono" style={{
                          fontSize: '8px', lineHeight: '9px', fontWeight: 600,
                          color: 'var(--gc-red-ink)', whiteSpace: 'nowrap',
                          transform: labelRow[i] ? 'translateY(9px)' : 'none',
                          opacity: barOpacity, marginTop: '1px',
                        }}>−{Math.abs(p.days)}</span>
                      </>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Baseline */}
      <div style={{ height: '1px', background: 'var(--gc-rule)', marginTop: hasNegative ? '0' : '-1px' }} />

      {/* X ticks: every 3rd month (12-mo view) / every 6th (24-mo), plus the latest.
          Cells mirror the bar columns exactly (same flex + gutter), so each tick sits
          centered under its own column instead of floating at the row's edges. */}
      <div className="gc-mono" style={{ display: 'flex', gap: '2px', paddingRight: showLine ? '34px' : 0, marginTop: '3px', fontSize: '8.5px', color: 'var(--gc-muted-soft)' }}>
        {points.map((p, i) => {
          const every = windowMonths === 24 ? 6 : 3;
          const show = (i % every === 0 && i < n - 2) || i === n - 1;
          const isSel = i === selIdx && sel !== null;
          return (
            <span key={p.month} style={{
              flex: '1 1 0', minWidth: 0, textAlign: 'center', whiteSpace: 'nowrap',
              overflow: 'visible', fontWeight: isSel ? 700 : 400,
              color: isSel ? 'var(--gc-ink-soft)' : 'var(--gc-muted-soft)',
            }}>
              {show ? fmtMonth(p.month) : ''}
            </span>
          );
        })}
      </div>

      {/* Readout for the tapped column (defaults to the latest month) */}
      <div className="gc-mono" style={{
        fontSize: '10.5px', fontWeight: manual ? 700 : 600,
        color: manual ? 'var(--gc-ink)' : 'var(--gc-ink-soft)',
        marginTop: '6px',
        borderLeft: manual ? `3px solid ${selPt.days > 0 ? 'var(--gc-blue)' : selPt.days < 0 ? 'var(--gc-red)' : 'var(--gc-green)'}` : 'none',
        paddingLeft: manual ? '6px' : 0,
        background: manual ? 'var(--gc-paper-soft)' : 'transparent',
        paddingTop: manual ? '3px' : 0, paddingBottom: manual ? '3px' : 0,
        borderRadius: manual ? '0 3px 3px 0' : 0,
        transition: 'background 120ms',
      }}>
        {readout}
      </div>

      {/* Legend — the line's scale independence is declared here */}
      <div className="flex items-center gap-3" style={{ fontSize: '9px', color: 'var(--gc-muted)', marginTop: '4px', flexWrap: 'wrap' }}>
        <span className="inline-flex items-center gap-1">
          <span style={{ width: '7px', height: '7px', background: 'var(--gc-blue)', borderRadius: '1px', display: 'inline-block' }} />
          {lang === 'en' ? 'Monthly advance' : lang === 'tw' ? '單月前進' : '单月前进'}
        </span>
        {hasNegative && (
          <span className="inline-flex items-center gap-1">
            <span style={{ width: '7px', height: '7px', background: 'var(--gc-red)', borderRadius: '1px', display: 'inline-block' }} />
            {lang === 'en' ? 'Retrogression' : '倒退'}
          </span>
        )}
        {showLine && (
          <span className="inline-flex items-center gap-1">
            <span style={{ width: '10px', height: '2px', background: 'var(--gc-green)', display: 'inline-block' }} />
            {lang === 'en' ? `${windowMonths}-mo cumulative (own scale)` : lang === 'tw' ? `${windowMonths}個月累計（獨立比例）` : `${windowMonths}个月累计（独立比例）`}
          </span>
        )}
        {points.some((p) => p.cutoff === 'C') && (
          <span className="inline-flex items-center gap-1">
            <span style={{
              width: '7px', height: '7px', display: 'inline-block',
              background: 'var(--gc-green-soft)', border: '1px dashed var(--gc-green-border)', borderRadius: '1px',
            }} />
            {lang === 'en' ? 'C · current, no queue' : lang === 'tw' ? 'C · 無需排隊' : 'C · 无需排队'}
          </span>
        )}
      </div>
    </div>
  );
};

const Overview = ({ userCase, setTab = () => {}, completedI485Steps = [], setCompletedI485Steps = () => {}, greenCardInfo = { approvalDate: null, isConditional: false, celebrated: false }, setGreenCardInfo = () => {}, travelRecords = [], setTravelRecords = () => {}, i485ServiceCenter = 'average', setI485ServiceCenter = () => {}, stepActualDates = {}, setStepActualDates = () => {} }) => {
  const isSubscribedOv = useSubscribed();
  const { t, lang } = useLang();
  const country = resolveCountry(userCase.country);
  const [i485Expanded, setI485Expanded] = useState(false);
  // Monthly-summary ETA controls: which pace anchors the estimate, and whether the
  // arithmetic behind it is unfolded. Lives here because hooks can't sit inside the
  // render-time IIFE that builds the card.
  const [sumPaceIdx, setSumPaceIdx] = useState(1);
  const [sumFormulaOpen, setSumFormulaOpen] = useState(false);
  // Ref to the I-485 card wrapper — used to scroll it back into view when
  // collapsing, so the ~250px height reduction doesn't jumble the user's visual anchor.
  const i485CardRef = useRef(null);
  // Travel tracker UI state — collapsed by default, opens a compact editor
  const [travelExpanded, setTravelExpanded] = useState(false);
  const [newTripFrom, setNewTripFrom] = useState('');
  const [newTripTo, setNewTripTo] = useState('');
  // Share card modal state
  const [showShareCard, setShowShareCard] = useState(false);
  const [showStatusShare, setShowStatusShare] = useState(false);
  const [showHeroMath, setShowHeroMath] = useState(false);
  // Which chart the status card reads from: null → the adopted one. The B/A toggle
  // lets a reader answer "and how long until APPROVAL?" without leaving the card.
  const [heroChart, setHeroChart] = useState(null);

  const finalActionCutoff = bulletinCurrent.finalAction[userCase.category]?.[country];
  const filingCutoff = bulletinCurrent.filing[userCase.category]?.[country];
  const filingAuthorized = FILING_AUTHORIZED[userCase.category];

  const finalActionStatus = computeStatus(userCase.priorityDate, finalActionCutoff);
  const filingStatus = computeStatus(userCase.priorityDate, filingCutoff);

  const getActionRec = (faStatus, fStatus, authorized) => {
    if (faStatus.status === 'suspicious' || fStatus.status === 'suspicious') {
      return lang === 'en' ? 'Verify your Priority Date' : '请先核实优先日';
    }
    if (authorized && (fStatus.status === 'current' || fStatus.status === 'overdue')) return t.actionCurrent;
    if (authorized && fStatus.status === 'eligible') return t.actionFile;
    if (faStatus.status === 'current' || faStatus.status === 'overdue') return t.actionCurrent;
    if (faStatus.status === 'eligible') return t.actionFile;
    if (faStatus.days !== null && faStatus.days < 180) return t.actionPrepare;
    return t.actionMonitor;
  };

  // De-emphasized text version of StatusBadge for the non-adopted chart (#12):
  // same words, no pill chrome, so the adopted side keeps the visual weight.
  const plainStatusText = (status) => ({
    current: t.statusCurrent, eligible: t.statusEligibleFile, overdue: t.statusCurrent,
    notCurrent: t.statusNotCurrent,
    unavailable: lang === 'en' ? 'No visas (U)' : lang === 'tw' ? '本月無名額' : '本月无名额',
    suspicious: lang === 'en' ? 'Check PD' : '请核实优先日',
  }[status] || '—');

  const countryLabel = userCase.country === 'China' ? (lang === 'en' ? 'China (Mainland)' : '中国大陆')
    : userCase.country === 'Taiwan' ? (lang === 'en' ? 'ROW / HK / TW / Macao' : lang === 'tw' ? '全球/港澳台' : '全球/港澳台')
    : userCase.country === 'India' ? (lang === 'en' ? 'India' : '印度')
    : userCase.country === 'Mexico' ? (lang === 'en' ? 'Mexico' : lang === 'tw' ? '墨西哥' : '墨西哥')
    : userCase.country === 'Philippines' ? (lang === 'en' ? 'Philippines' : lang === 'tw' ? '菲律賓' : '菲律宾')
    : userCase.country;

  const primaryStatus = filingAuthorized ? filingStatus : finalActionStatus;
  const primaryCutoff = filingAuthorized ? filingCutoff : finalActionCutoff;
  // Gate for the arrived-date experience: everything in ActionCenter renders
  // ONLY here — the waiting view stays byte-identical.
  const isActionable = ['current', 'eligible', 'overdue'].includes(primaryStatus.status) || primaryCutoff === 'C';

  return (
    <div className="space-y-2">

      {/* Suspicious PD warning */}
      {(finalActionStatus.status === 'suspicious' || filingStatus.status === 'suspicious') && (
        <div style={{ background: 'var(--gc-red-soft)', border: '1px solid var(--gc-red-border)', borderRadius: '4px', padding: '10px 12px' }}>
          <div className="flex items-start gap-2">
            <AlertCircle size={15} style={{ color: 'var(--gc-red)', flexShrink: 0, marginTop: '2px' }} />
            <div className="flex-1 min-w-0">
              <div className="gc-eyebrow" style={{ color: 'var(--gc-red)', marginBottom: '4px' }}>
                {lang === 'en' ? 'Verify priority date' : '请核实优先日'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--gc-red-ink)', lineHeight: 1.5 }}>
                {lang === 'en' ? (
                  <>Your PD (<span className="gc-mono" style={{ fontWeight: 700 }}>{formatDate(userCase.priorityDate, lang)}</span>) is unusually far from the current cutoffs. Possible reasons:
                    <ul style={{ listStyle: 'disc', marginLeft: '16px', marginTop: '4px' }}>
                      <li>Date entered incorrectly (check format)</li>
                      <li>Case was already approved years ago</li>
                      <li>Case was abandoned</li>
                    </ul>
                  </>
                ) : (
                  <>你的优先日（<span className="gc-mono" style={{ fontWeight: 700 }}>{formatDate(userCase.priorityDate, lang)}</span>）和当前排期差距异常。可能原因：
                    <ul style={{ listStyle: 'disc', marginLeft: '16px', marginTop: '4px' }}>
                      <li>日期输入错误（检查格式）</li>
                      <li>案子多年前已批准</li>
                      <li>案子已放弃/撤回</li>
                    </ul>
                  </>
                )}
              </div>
              <div style={{ marginTop: '6px', fontSize: '10px', color: 'var(--gc-red)' }}>
                {lang === 'en'
                  ? 'Please consult an immigration attorney if you believe your PD is correct.'
                  : '如确认优先日正确，请咨询移民律师了解案子状态。'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Index entry pointer — ONLY for users who look like they haven't set up yet.
          Existing users see a subtle link at the bottom of Overview instead. */}
      {(() => {
        // Detect if user looks like they're on defaults (haven't customized)
        const isDefault = (
          userCase.country === 'Taiwan' &&
          userCase.category === 'EB3' &&
          userCase.priorityDate === '2024-07-15' &&
          userCase.inUS === true &&
          userCase.petitionerStatus === 'USC'
        );
        if (!isDefault) return null;
        return (
          <button
            onClick={() => setTab('index')}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '10px 12px',
              background: 'var(--gc-surface)',
              border: '1px solid var(--gc-rule)',
              borderLeft: '2px solid var(--gc-green)',
              borderRadius: 'var(--gc-radius-sm)',
              cursor: 'pointer',
              transition: 'all 120ms',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}>
            <ClipboardList size={16} style={{ color: 'var(--gc-green)', flexShrink: 0 }} strokeWidth={1.8} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="gc-eyebrow" style={{ fontSize: '9px', color: 'var(--gc-green)', letterSpacing: '0.14em', marginBottom: '2px' }}>
                {lang === 'en' ? 'NOT SURE WHICH CATEGORY YOU ARE?' : lang === 'tw' ? '不確定自己屬於哪個類別?' : '不确定自己属于哪个类别?'}
              </div>
              <div className="gc-serif" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--gc-ink)', lineHeight: 1.3, letterSpacing: '-0.005em' }}>
                {lang === 'en' 
                  ? 'Answer 3 questions → we\'ll tell you your pathway' 
                  : lang === 'tw' 
                    ? '回答 3 個問題 → 幫你找到適合的路徑'
                    : '回答 3 个问题 → 帮你找到适合的路径'}
              </div>
            </div>
            <span style={{ fontSize: '16px', color: 'var(--gc-muted)', flexShrink: 0, lineHeight: 1 }}>›</span>
          </button>
        );
      })()}

      {/* Countdown block — big-number distance to active cutoff (theme-aware) */}
      {(() => {
        // The card reads from the SELECTED chart (B/A toggle), defaulting to the
        // adopted one. Every number downstream — hero, ETA, chain, progress — follows.
        const heroSel = heroChart || (filingAuthorized ? 'B' : 'A');
        const ps = heroSel === 'B' ? filingStatus : finalActionStatus;
        const heroCutoff = heroSel === 'B' ? filingCutoff : finalActionCutoff;
        const mvAх = computeMovement(bulletinCurrent.finalAction[userCase.category]?.[country], bulletinPrevious.finalAction[userCase.category]?.[country]);
        const mvBх = computeMovement(bulletinCurrent.filing[userCase.category]?.[country], bulletinPrevious.filing[userCase.category]?.[country]);
        const mvChipText = (m) => {
          if (m.type === 'advanced') return { t: `+${m.days}${lang === 'en' ? 'd' : '天'}`, c: 'var(--gc-green)' };
          if (m.type === 'retrogressed') return { t: `−${m.days ?? ''}${lang === 'en' ? 'd' : '天'}`, c: 'var(--gc-red)' };
          if (m.type === 'current') return { t: 'C', c: 'var(--gc-green)' };
          if (m.type === 'unavailable') return { t: m.still ? 'U' : '→U', c: 'var(--gc-red)' };
          if (m.type === 'resumed') return { t: lang === 'en' ? 'resumed' : '恢复', c: 'var(--gc-green)' };
          return { t: '—', c: 'var(--gc-muted)' };
        };
        if (primaryStatus.status === 'suspicious') return null; // suspicious PD has its own warning above
        const activeTableLabel = heroSel === 'B'
          ? (lang === 'en' ? 'Filing · B' : lang === 'tw' ? '遞件表B' : '递件表B')
          : (lang === 'en' ? 'Final Action · A' : lang === 'tw' ? '排期表A' : '排期表A');

        // Dual status rows — show BOTH A (Final Action) and B (Filing) compactly
        // below the main title, so users see the complete picture rather than
        // only the "primary" (adopted) table. Shown only for filing-authorized
        // categories (F types); EB categories without B fall back to single row.
        const fmtCutoffShort = (cutoff) => {
          if (cutoff === 'C') return null; // "无排期" handled by label
          if (!cutoff) return '—';
          const d = parseDate(cutoff);
          if (!d) return '—';
          if (lang === 'en') return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
          return `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()}`;
        };
        const buildDualRow = (status, cutoff) => {
          // Returns { icon: '✓'|'⧖'|'·', label: string, good: boolean }
          if (cutoff === 'C') {
            return { icon: '✓', label: lang === 'en' ? 'Current (C)' : lang === 'tw' ? '無排期' : '无排期', good: true };
          }
          if (status.status === 'current' || status.status === 'overdue') {
            return { icon: '✓', label: lang === 'en' ? 'Reached' : lang === 'tw' ? '已過' : '已过', good: true };
          }
          if (status.status === 'eligible') {
            // Date lives on the block's dedicated cutoff line now — no repeat here.
            return { icon: '✓', label: lang === 'en' ? 'Past' : '已过', good: true };
          }
          if (status.status === 'notCurrent') {
            const days = status.days;
            if (days === null) return { icon: '⧖', label: lang === 'en' ? 'Not current' : '排期未到', good: false };
            return { icon: '⧖', label: lang === 'en' ? `${days.toLocaleString()}d away` : `距 ${days.toLocaleString()} 天`, good: false };
          }
          return { icon: '·', label: '—', good: null };
        };
        // Only show dual-row if filing is authorized AND both tables are meaningfully
        // different (otherwise one row is redundant). Always show when filingAuthorized
        // to give users the full picture.
        const showDualStatus = true; // every category — EB users need the A/B breakdown too
        const dualB = showDualStatus ? buildDualRow(filingStatus, filingCutoff) : null;
        const dualA = showDualStatus ? buildDualRow(finalActionStatus, finalActionCutoff) : null;

        // Decide color + label by status
        // Flag for eligible-state — changes render layout so user sees
        // "can file now" as the primary message, not a raw number.
        let bigText, bigSubLabel, accentColor, accentSoft, accentBorder, monthsText;
        let eligibleLayout = false;
        let eligibleDays = null;
        let eligibleMonths = null;
        // "In queue" (排期未到) layout — reframes notCurrent from "big number"
        // to a subject-first ("你已在排期中") card, matching the eligibleLayout's
        // structure. Days/months demoted to a small mono caption.
        let waitingLayout = false;
        let waitingTitle = null;
        let waitingSub = null;
        let waitingDistance = null;
        if (heroCutoff === 'C' || ps.status === 'current' || ps.status === 'overdue') {
          bigText = lang === 'en' ? 'Current' : lang === 'tw' ? '排期到' : '排期到';
          bigSubLabel = lang === 'en' ? 'You are eligible — file now' : lang === 'tw' ? '你已符合 — 現在可遞件' : '你已符合 — 现在可递件';
          accentColor = 'var(--gc-green)';
          accentSoft = 'var(--gc-green-soft)';
          accentBorder = 'var(--gc-green-border)';
          monthsText = null;
        } else if (ps.status === 'eligible') {
          // User's PD is already ahead of cutoff — they can file NOW.
          // The exact "lead days" is secondary info; surface "现在就能递" loudly.
          eligibleLayout = true;
          eligibleDays = ps.days;
          eligibleMonths = Math.floor(ps.days / 30);
          accentColor = 'var(--gc-green)';
          accentSoft = 'var(--gc-green-soft)';
          accentBorder = 'var(--gc-green-border)';
        } else {
          // notCurrent — user is waiting for cutoff to reach their PD.
          // Use "in queue" layout: subject-first, number demoted to caption.
          waitingLayout = true;
          const days = ps.days;
          const months = days !== null ? Math.ceil(days / 30) : null;
          // 4-tier urgency: accent color + copy shift based on wait length.
          //   ≥ 24mo  → muted grey  (far away, calm)
          //   12-24mo → ink         (approaching)
          //   6-12mo  → amber       (close, start preparing)
          //   < 6mo   → green       (imminent)
          if (ps.status === 'unavailable') {
            // The bulletin printed U — no visas this month, no queue position to show.
            accentColor = 'var(--gc-amber, var(--gc-ink))';
            waitingTitle = lang === 'en' ? 'No visas this month (U)' : lang === 'tw' ? '本月無名額（U）' : '本月无名额（U）';
            waitingSub = lang === 'en' ? 'The bulletin lists no cutoff — numbers may resume in a future month' : lang === 'tw' ? '公告未給出截止日，之後月份可能恢復名額' : '公告未给出截止日，之后月份可能恢复名额';
          } else if (months === null) {
            accentColor = 'var(--gc-ink)';
            waitingTitle = lang === 'en' ? 'In queue' : lang === 'tw' ? '你已在排期中' : '你已在排期中';
            waitingSub = lang === 'en' ? 'Awaiting cutoff advancement' : lang === 'tw' ? '等待截止日推進' : '等待截止日推进';
          } else if (months >= 24) {
            accentColor = 'var(--gc-muted)';
            waitingTitle = lang === 'en' ? 'In queue' : lang === 'tw' ? '你已在排期中' : '你已在排期中';
            waitingSub = lang === 'en' ? 'Waiting for cutoff to reach your PD' : lang === 'tw' ? '等待截止日推進到你' : '等待截止日推进到你';
          } else if (months >= 12) {
            accentColor = 'var(--gc-ink)';
            waitingTitle = lang === 'en' ? 'In queue' : lang === 'tw' ? '你已在排期中' : '你已在排期中';
            waitingSub = lang === 'en' ? 'Cutoff is moving toward you' : lang === 'tw' ? '排期正朝你推進' : '排期正朝你推进';
          } else if (months >= 6) {
            accentColor = 'var(--gc-amber)';
            waitingTitle = lang === 'en' ? 'Getting close' : lang === 'tw' ? '排期臨近' : '排期临近';
            waitingSub = lang === 'en' ? 'Start preparing your packet' : lang === 'tw' ? '開始準備遞件材料' : '开始准备递件材料';
          } else {
            accentColor = 'var(--gc-green)';
            waitingTitle = lang === 'en' ? 'Almost there' : lang === 'tw' ? '即將到來' : '即将到来';
            waitingSub = lang === 'en'
              ? `Filing in about ${months} month${months === 1 ? '' : 's'}`
              : lang === 'tw' ? `大約 ${months} 個月後可遞件` : `大约 ${months} 个月后可递件`;
          }
          accentSoft = 'var(--gc-paper-soft)';
          accentBorder = 'var(--gc-rule)';
          // Compose small mono distance caption: "2,502 天 · 约 84 个月 (7.0 年)"
          if (days !== null && months !== null) {
            const years = months / 12;
            const daysStr = days.toLocaleString() + (lang === 'en' ? ' days' : ' 天');
            const monthsStr = months.toLocaleString() + (lang === 'en' ? ' mo' : ' 个月');
            waitingDistance = years >= 2
              ? `${daysStr} · ${lang === 'en' ? '~' : '约'} ${monthsStr} (${years.toFixed(1)}${lang === 'en' ? ' yrs' : ' 年'})`
              : `${daysStr} · ${lang === 'en' ? '~' : '约'} ${monthsStr}`;
          }
        }

        return (
          <div style={{
            background: 'var(--gc-surface)',
            border: '1px solid var(--gc-rule)',
            borderLeft: `2px solid ${accentColor}`,
            borderRadius: '4px',
            overflow: 'hidden',
          }}>
            {/* Unified header — the category title lives here now; the separate
                A/B cutoff card it used to crown has been absorbed below. */}
            <div style={{ padding: '11px 14px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <span className="gc-serif" style={{ fontSize: '17px', fontWeight: 700, color: 'var(--gc-ink)', letterSpacing: '-0.01em', minWidth: 0 }}>
                {t[userCase.category.toLowerCase()]}
              </span>
              <span className="flex items-center gap-2 flex-shrink-0">
                {waitingLayout && (
                  <span className="gc-eyebrow" style={{
                    fontSize: '9px', fontWeight: 700, color: accentColor,
                    border: `1px solid ${accentColor}`, borderRadius: '2px',
                    padding: '2px 6px', letterSpacing: '0.08em',
                  }}>
                    {waitingTitle}
                  </span>
                )}
                <button type="button" onClick={() => setShowStatusShare(true)}
                  title={lang === 'en' ? 'Share' : '分享'}
                  style={{ border: '1px solid var(--gc-rule)', background: 'transparent', borderRadius: '2px', padding: '3px 5px', cursor: 'pointer', lineHeight: 0 }}>
                  <Share2 size={11} style={{ color: 'var(--gc-muted)' }} />
                </button>
                {!isSubscribedOv && (
                <button type="button" onClick={() => window.dispatchEvent(new Event('gc-open-subscribe'))}
                  title={lang === 'en' ? 'Subscribe' : '订阅'}
                  style={{ border: '1px solid var(--gc-green-border)', background: 'var(--gc-green-soft)', borderRadius: '2px', padding: '3px 5px', cursor: 'pointer', lineHeight: 0 }}>
                  <Mail size={11} style={{ color: 'var(--gc-green)' }} />
                </button>
                )}
              </span>
            </div>
            {/* Top row: either standard distance display OR "can file now" message for eligible users */}
            {eligibleLayout ? (
              <div style={{
                padding: '14px 14px 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                flexWrap: 'wrap',
              }}>
                {/* Left: big "now" message */}
                <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                  <div className="gc-eyebrow" style={{ color: 'var(--gc-muted)', marginBottom: '3px' }}>
                    {lang === 'en' ? 'Status · ' : lang === 'tw' ? '狀態 · ' : '状态 · '}{activeTableLabel}
                  </div>
                  <div className="gc-serif" style={{
                    fontSize: '25px',
                    fontWeight: 800,
                    color: 'var(--gc-green-ink)',
                    letterSpacing: '-0.01em',
                    lineHeight: 1.1,
                    marginTop: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '7px',
                  }}>
                    <CheckCircle2 size={23} strokeWidth={2.5} />
                    <span>{lang === 'en' ? 'Can file now' : lang === 'tw' ? '現在可遞件' : '现在可递件'}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--gc-muted)', marginTop: '6px', lineHeight: 1.4 }}>
                    {lang === 'en'
                      ? 'Your PD is already past the cutoff.'
                      : lang === 'tw'
                      ? '你的優先日已過截止日。'
                      : '你的优先日已过截止日。'}
                  </div>
                </div>
                {/* Right: small mono caption with lead time — for the curious, not the main message */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div className="gc-eyebrow" style={{ fontSize: '8px', color: 'var(--gc-muted)', marginBottom: '2px' }}>
                    {lang === 'en' ? 'Ahead by' : lang === 'tw' ? '提前' : '提前'}
                  </div>
                  <div className="gc-mono" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gc-ink-soft)' }}>
                    {eligibleDays.toLocaleString()}{lang === 'en' ? ' d' : '天'}
                    <span style={{ margin: '0 4px', color: 'var(--gc-rule)' }}>·</span>
                    {lang === 'en' ? `~${eligibleMonths} mo` : `约 ${eligibleMonths} 个月`}
                  </div>
                </div>
              </div>
            ) : waitingLayout ? (
              (() => {
                // NUMBER-FIRST: the time estimate is the card's hero; the status phrase
                // is a small tier-colored badge. The old layout inverted this — 28px of
                // ceremony ("你已在排期中") over 10px of the numbers people came for.
                const today2 = new Date();
                // The pace itself, surfaced (not just consumed): the reasoning chain
                // below shows the reader how the hero number is derived from it.
                const heroChartKey = heroSel === 'B' ? 'filing' : 'finalAction';
                const hist12h = monthlyMovementFromArchive(userCase.category, country, 12, heroChartKey);
                const total12h = hist12h ? hist12h.reduce((sm, pp) => sm + (pp.days || 0), 0) : 0;
                const paceMo = total12h > 0 ? total12h / 12 : null;
                let paceCal = ps.days ? paceDaysToCalendar(userCase.category, country, ps.days, heroChartKey) : null;
                const aFloored = heroSel === 'A' && ps.days ? paceEtaFlooredToB(userCase.category, country, ps.days) : false;
                // EB categories viewed on chart B: B is a frozen intake lever whose own
                // extrapolation is garbage, but the bulletin invariant (B ≥ A) means B
                // crosses a PD no later than A — cap B's estimate at A's.
                let bCappedToA = false;
                if (heroSel === 'B' && !filingAuthorized && paceCal
                    && finalActionStatus?.status === 'notCurrent' && finalActionStatus.days) {
                  const aCal = paceDaysToCalendar(userCase.category, country, finalActionStatus.days, 'finalAction');
                  if (aCal && aCal < paceCal) { paceCal = aCal; bCappedToA = true; }
                }
                const etaDate = paceCal ? new Date(today2.getTime() + paceCal * 86400000) : null;
                const yearsF = paceCal ? paceCal / 365.25 : null;
                const heroText = paceCal === null ? (lang === 'en' ? 'TBD' : '待定')
                  : yearsF >= 1.5
                    ? (lang === 'en' ? `~${yearsF.toFixed(1)} yrs` : `约 ${yearsF.toFixed(1)} 年`)
                    : (lang === 'en' ? `~${Math.max(Math.round(paceCal / 30.44), 1)} mo` : `约 ${Math.max(Math.round(paceCal / 30.44), 1)} 个月`);
                const fmtYM = (d) => lang === 'en'
                  ? d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
                  : `${d.getFullYear()}年${d.getMonth() + 1}月`;
                // Primary chart's monthly movement, framed as what it did to YOUR wait.
                const mvP = heroSel === 'B'
                  ? computeMovement(bulletinCurrent.filing[userCase.category]?.[country], bulletinPrevious.filing[userCase.category]?.[country])
                  : computeMovement(bulletinCurrent.finalAction[userCase.category]?.[country], bulletinPrevious.finalAction[userCase.category]?.[country]);
                const delta = mvP.type === 'advanced'
                  ? { text: lang === 'en' ? `Good news — this month's bulletin cut your wait by ${mvP.days} days ↓` : lang === 'tw' ? `好消息：這個月的公告幫你縮短了 ${mvP.days} 天 ↓` : `好消息：这个月的公告帮你缩短了 ${mvP.days} 天 ↓`, color: 'var(--gc-green)' }
                  : mvP.type === 'retrogressed'
                    ? { text: lang === 'en' ? `Heads up — this month pushed your wait back by ${mvP.days ?? '—'} days ↑` : lang === 'tw' ? `注意：這個月排期倒退，等待拉長了 ${mvP.days ?? '—'} 天 ↑` : `注意：这个月排期倒退，等待拉长了 ${mvP.days ?? '—'} 天 ↑`, color: 'var(--gc-red)' }
                    : mvP.type === 'resumed'
                      ? { text: lang === 'en' ? 'Numbers resumed this month' : '本月恢复名额了', color: 'var(--gc-green)' }
                      : mvP.type === 'unavailable'
                        ? { text: lang === 'en' ? 'No visas issued this month (U)' : lang === 'tw' ? '本月不發名額（U）' : '本月不发名额（U）', color: 'var(--gc-red)' }
                        : { text: lang === 'en' ? 'This month\'s bulletin didn\'t move — check back next month' : lang === 'tw' ? '這個月排期沒動，下月再看' : '这个月排期没动，下月再看', color: 'var(--gc-muted)' };
                // Wait-journey progress: share of the predicted total wait already served.
                const pdD = parseDate(userCase.priorityDate);
                let pct = null;
                if (pdD && etaDate && etaDate > pdD) {
                  const done = (today2 - pdD) / (etaDate - pdD);
                  if (done > 0 && done < 1) pct = Math.round(done * 100);
                }
                return (
                  <div style={{ padding: '12px 14px 12px' }}>
                    {ps.status === 'unavailable' ? (
                      <>
                        <div className="gc-serif" style={{ fontSize: '30px', fontWeight: 700, color: accentColor, letterSpacing: '-0.02em', lineHeight: 1 }}>
                          {lang === 'en' ? 'TBD' : '待定'}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--gc-muted)', marginTop: '6px', lineHeight: 1.5 }}>{waitingSub}</div>
                      </>
                    ) : (
                      <>
                        {/* What the number IS, said before the number */}
                        <div className="gc-eyebrow" style={{ fontSize: '9px', color: 'var(--gc-muted)', marginBottom: '3px' }}>
                          {heroSel === 'B'
                            ? (lang === 'en' ? 'TIME UNTIL YOU CAN FILE' : lang === 'tw' ? '距離可以遞件，還需要' : '距离可以递件，还需要')
                            : (lang === 'en' ? 'TIME UNTIL APPROVAL WINDOW' : lang === 'tw' ? '距離可以獲批，還需要' : '距离可以获批，还需要')}
                        </div>
                        <div className="gc-serif" style={{ fontSize: '32px', fontWeight: 700, color: 'var(--gc-ink)', letterSpacing: '-0.02em', lineHeight: 1 }}>
                          {heroText}
                        </div>
                        {/* Single forced line — wrapping mid-phrase reads badly on phones. */}
                        {etaDate && ps.days !== null && (
                          <div style={{ fontSize: '12px', color: 'var(--gc-ink-soft)', marginTop: '7px', lineHeight: 1.55 }}>
                            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {heroSel === 'B'
                                ? (lang === 'en' ? `At this pace you could file around ${fmtYM(etaDate)}` : lang === 'tw' ? `照這個速度，約 ${fmtYM(etaDate)} 前後就能遞件` : `照这个速度，约 ${fmtYM(etaDate)} 前后就能递件`)
                                : (lang === 'en' ? `At this pace, approval opens around ${fmtYM(etaDate)}` : lang === 'tw' ? `照這個速度，約 ${fmtYM(etaDate)} 前後可獲批` : `照这个速度，约 ${fmtYM(etaDate)} 前后可获批`)}
                            </div>
                            {/* Optional — only when a birth year/month is on file. Day defaults
                                to the 1st since we only collect year+month. */}
                            {userCase.birthYearMonth && (() => {
                              const [by, bm] = userCase.birthYearMonth.split('-').map(Number);
                              const birth = new Date(by, bm - 1, 1);
                              let age = etaDate.getFullYear() - birth.getFullYear();
                              const hadBirthday = etaDate.getMonth() > birth.getMonth()
                                || (etaDate.getMonth() === birth.getMonth() && etaDate.getDate() >= birth.getDate());
                              if (!hadBirthday) age -= 1;
                              return (
                                <div style={{ marginTop: '2px' }}>
                                  {lang === 'en' ? `You'll be about ${age} then` : lang === 'tw' ? `屆時你大約 ${age} 歲` : `届时你大约 ${age} 岁`}
                                </div>
                              );
                            })()}
                          </div>
                        )}
                        {/* Where the number comes from — declared up front, expandable proof */}
                        {paceMo && (
                          <div style={{ fontSize: '10.5px', color: 'var(--gc-muted)', marginTop: '5px', lineHeight: 1.5 }}>
                            {lang === 'en'
                              ? `Assumes the last 12 months' real pace holds (${Math.round(paceMo)} days forward per month). `
                              : lang === 'tw'
                                ? `依據：過去 12 個月表${heroSel}實際平均每月前進 ${Math.round(paceMo)} 天。`
                                : `依据：过去 12 个月表${heroSel}实际平均每月前进 ${Math.round(paceMo)} 天。`}
                            {aFloored && (lang === 'en'
                              ? 'Approval can\'t precede filing, so this is floored to Chart B\'s estimate. '
                              : lang === 'tw'
                                ? '獲批不會早於遞件，已按表B的預計託底。'
                                : '获批不会早于递件，已按表B的预计托底。')}
                            {bCappedToA && (lang === 'en'
                              ? 'Chart B always sits at or ahead of Chart A, so this is capped at Chart A\'s estimate. '
                              : lang === 'tw'
                                ? '表B始終不落後於表A，預計按不晚於表A估算。'
                                : '表B始终不落后于表A，预计按不晚于表A估算。')}
                            <button type="button" onClick={() => setShowHeroMath((v) => !v)}
                              style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', fontSize: '10.5px', color: 'var(--gc-green)', textDecoration: 'underline', textUnderlineOffset: '2px', fontWeight: 600 }}>
                              {showHeroMath
                                ? (lang === 'en' ? 'hide the math' : lang === 'tw' ? '收起推導' : '收起推导')
                                : (lang === 'en' ? 'how is this derived?' : lang === 'tw' ? '怎麼算的？' : '怎么算的？')}
                            </button>
                          </div>
                        )}
                        {paceMo && showHeroMath && (() => {
                          const cutoffP = heroCutoff;
                          const cutoffLabel = heroSel === 'B'
                            ? (lang === 'en' ? 'Chart B cutoff' : lang === 'tw' ? '表B截止日' : '表B截止日')
                            : (lang === 'en' ? 'Chart A cutoff' : lang === 'tw' ? '表A截止日' : '表A截止日');
                          const months2 = Math.round(ps.days / paceMo);
                          const chartRef = heroSel === 'A'
                            ? (lang === 'en' ? ' (the green line in the chart below)' : '（下方图表的绿线）')
                            : '';
                          const steps = lang === 'en' ? [
                            `1. Your PD ${userCase.priorityDate} − ${cutoffLabel} ${cutoffP} = ${ps.days.toLocaleString('en-US')} days of queue ahead`,
                            `2. Chart ${heroSel} moved ${total12h} days in the last 12 months${chartRef} ≈ ${Math.round(paceMo)} days/mo`,
                            `3. ${ps.days.toLocaleString('en-US')} ÷ ${Math.round(paceMo)} ≈ ${months2} months ≈ ${heroText.replace('~', '')} → ${etaDate ? fmtYM(etaDate) : ''}`,
                          ] : [
                            `① 你的优先日 ${userCase.priorityDate} − ${cutoffLabel} ${cutoffP} ＝ 还差 ${ps.days.toLocaleString('en-US')} 天`,
                            `② 近 12 个月表${heroSel}实际前进 ${total12h} 天${chartRef} ≈ ${Math.round(paceMo)} 天/月`,
                            `③ ${ps.days.toLocaleString('en-US')} ÷ ${Math.round(paceMo)} ≈ ${months2} 个月 ≈ ${heroText.replace('约 ', '')} → ${etaDate ? fmtYM(etaDate) : ''}`,
                          ];
                          return (
                            <div className="gc-mono" style={{
                              fontSize: '10px', lineHeight: 1.8, color: 'var(--gc-ink-soft)',
                              background: 'var(--gc-paper-soft)', border: '1px solid var(--gc-rule-soft)',
                              borderRadius: '3px', padding: '7px 10px', marginTop: '6px',
                            }}>
                              {steps.map((st, i2) => <div key={i2}>{st}</div>)}
                            </div>
                          );
                        })()}
                        <div style={{ fontSize: '13px', fontWeight: 700, color: delta.color, marginTop: '8px' }}>
                          {delta.text}
                        </div>
                        {pct !== null && (
                          <div style={{ marginTop: '10px' }}>
                            <div style={{ height: '6px', background: 'var(--gc-rule-soft)', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${pct}%`, background: accentColor === 'var(--gc-muted)' ? 'var(--gc-green)' : accentColor, borderRadius: '3px' }} />
                            </div>
                            <div className="flex items-center justify-between gc-mono" style={{ fontSize: '9px', color: 'var(--gc-muted)', marginTop: '4px' }}>
                              <span>{lang === 'en' ? 'PD ' : '优先日 '}{pdD ? fmtYM(pdD) : ''}</span>
                              <span style={{ fontWeight: 700, color: 'var(--gc-ink-soft)' }}>
                                {lang === 'en' ? `you're ~${pct}% of the way there` : lang === 'tw' ? `你已走完約 ${pct}% 的等待` : `你已走完约 ${pct}% 的等待`}
                              </span>
                              <span>{lang === 'en' ? 'est. ' : '预计 '}{fmtYM(etaDate)}</span>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })()
            ) : (
            <div style={{
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
            }}>
              {/* Left: big label ("排期到" / "Current") for current/overdue states */}
              <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                <div className="gc-eyebrow" style={{ color: 'var(--gc-muted)', marginBottom: '2px' }}>
                  {lang === 'en' ? 'Status · ' : lang === 'tw' ? '狀態 · ' : '状态 · '}{activeTableLabel}
                </div>
                <div className="gc-serif" style={{
                  fontSize: '34px',
                  fontWeight: 700,
                  color: accentColor,
                  letterSpacing: '-0.02em',
                  lineHeight: 1,
                  marginTop: '2px',
                }}>
                  {bigText}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--gc-muted)', marginTop: '6px', lineHeight: 1.4 }}>
                  {bigSubLabel}
                </div>
              </div>
            </div>
            )}
            {/* Dual status row — shows BOTH A and B tables' statuses compactly,
                for every category; gives users the full picture rather than
                seeing only the "primary" (adopted) table.
                Placement: below the main title block, above monthly movement. */}
            {showDualStatus && (
              <div style={{
                borderTop: '1px solid var(--gc-rule-soft)',
                background: 'var(--gc-paper-soft)',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
              }}>
                {[{ code: 'B', title: lang === 'en' ? 'B · can you file?' : lang === 'tw' ? 'B · 能否遞件' : 'B · 能否递件', info: dualB, adopted: filingAuthorized, st: filingStatus, cut: filingCutoff, mv: mvBх },
                  { code: 'A', title: lang === 'en' ? 'A · can you be approved?' : lang === 'tw' ? 'A · 能否獲批' : 'A · 能否获批', info: dualA, adopted: !filingAuthorized, st: finalActionStatus, cut: finalActionCutoff, mv: mvAх }]
                  .map((blk, i) => {
                    // Per-station ETA: same 12-month pace applied to each chart's own gap,
                    // so the hero (B station) and the summary card (A station) both have a
                    // visible anchor here — the wait reads as two stops on one line.
                    let etaTxt = null;
                    if (blk.st.status === 'notCurrent' && blk.st.days) {
                      let cal = paceDaysToCalendar(userCase.category, country, blk.st.days, blk.code === 'B' ? 'filing' : 'finalAction');
                      let floorNote = '';
                      if (cal && blk.code === 'A' && paceEtaFlooredToB(userCase.category, country, blk.st.days)) {
                        floorNote = lang === 'en' ? ' (≥ B)' : lang === 'tw' ? '（不早於B）' : '（不早于B）';
                      }
                      // EB: B is a frozen intake lever — its own extrapolation can land
                      // after A, which the bulletin invariant (B ≥ A) forbids. Cap at A.
                      if (cal && blk.code === 'B' && !filingAuthorized
                          && finalActionStatus?.status === 'notCurrent' && finalActionStatus.days) {
                        const aCal = paceDaysToCalendar(userCase.category, country, finalActionStatus.days, 'finalAction');
                        if (aCal && aCal < cal) {
                          cal = aCal;
                          floorNote = lang === 'en' ? ' (≤ A)' : lang === 'tw' ? '（不晚於A）' : '（不晚于A）';
                        }
                      }
                      if (cal) {
                        const d2 = new Date(Date.now() + cal * 86400000);
                        etaTxt = lang === 'en'
                          ? `est. ${d2.toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}${floorNote}`
                          : `预计 ${d2.getFullYear()}年${d2.getMonth() + 1}月${floorNote}`;
                      }
                    }
                    const isSelStation = (heroChart || (filingAuthorized ? 'B' : 'A')) === blk.code;
                    return (
                    <div key={blk.code} onClick={() => setHeroChart(blk.code)} style={{
                      padding: '8px 14px 9px',
                      borderLeft: i === 1 ? '1px solid var(--gc-rule-soft)' : 'none',
                      background: isSelStation ? 'var(--gc-green-soft)' : 'transparent',
                      boxShadow: isSelStation ? 'inset 0 2px 0 var(--gc-green)' : 'none',
                      cursor: 'pointer',
                    }}>
                      <div className="gc-eyebrow" style={{ fontSize: '8.5px', color: blk.adopted ? 'var(--gc-green)' : 'var(--gc-muted)', letterSpacing: '0.1em', marginBottom: '2px' }}>
                        {blk.title}{blk.adopted ? (lang === 'en' ? ' · ACTIVE' : ' · 采用') : ''}
                      </div>
                      {/* Movement first and biggest — what changed this month is the
                          headline; the remaining-gap figure follows it. */}
                      <div className="gc-mono" style={{ fontSize: '13px', fontWeight: 700, color: blk.info.good ? 'var(--gc-green-ink)' : 'var(--gc-ink)', lineHeight: 1.3 }}>
                        {mvChipText(blk.mv).t && (
                          <span style={{ fontSize: '17px', fontWeight: 800, color: mvChipText(blk.mv).c, marginRight: '7px' }}>
                            {mvChipText(blk.mv).t}
                          </span>
                        )}
                        {blk.info.label}
                      </div>
                      {blk.cut && blk.cut !== 'C' && (
                        <div className="gc-mono" style={{ fontSize: '9.5px', color: 'var(--gc-muted)', marginTop: '1px' }}>
                          {lang === 'en' ? 'cutoff ' : '截止日 '}{blk.cut}
                        </div>
                      )}
                      {etaTxt && (
                        <div className="gc-mono" style={{ fontSize: '9.5px', color: 'var(--gc-muted)', marginTop: '1px' }}>
                          {etaTxt}
                        </div>
                      )}
                    </div>
                    );
                  })}
              </div>
            )}
          </div>
        );
      })()}

      {/* Arrived-date action center — window banner, roadmap, checklist, crowd
          progress. Strictly gated: waiting cases never see any of it. */}
      {isActionable && <ActionCenter userCase={userCase} />}

      {/* Bulletin movement chart — its own card now. It used to live inside the
          I-485 card's waiting preview; with I-485 hidden until filing opens, the
          chart earns a standalone home right under the case card. */}
      <div style={{ background: 'var(--gc-surface)', border: '1px solid var(--gc-rule)', borderRadius: '4px', overflow: 'hidden' }}>
        <BulletinMovementChart
          cat={userCase.category} country={country}
          chart={heroChart || (filingAuthorized ? 'B' : 'A')}
          onChartChange={setHeroChart} />
      </div>

      {/* Inline subscribe — moved out of the case card to sit under the movement
          chart, where "watch this number for me" lands hardest. Waiting cases
          only; the component hides itself once subscribed. */}
      {!isActionable && (() => {
        const selOut = heroChart || (filingAuthorized ? 'B' : 'A');
        const stOut = selOut === 'B' ? filingStatus : finalActionStatus;
        const calOut = stOut?.status === 'notCurrent' && stOut.days
          ? paceDaysToCalendar(userCase.category, country, stOut.days, selOut === 'B' ? 'filing' : 'finalAction')
          : null;
        const yrs = calOut ? calOut / 365.25 : null;
        let ctaLabel;
        if (yrs !== null && yrs >= 3) {
          const yTxt = yrs.toFixed(1);
          ctaLabel = lang === 'en' ? `📮 ${yTxt} years is a long watch — we'll do it for you`
            : lang === 'tw' ? `📮 這一等就是 ${yTxt} 年，每月替你盯著`
            : `📮 这一等就是 ${yTxt} 年，每月替你盯着`;
        } else if (yrs !== null && yrs < 1) {
          ctaLabel = lang === 'en' ? '📮 Almost there — get the email the day it opens'
            : lang === 'tw' ? '📮 快到了，遞件窗口一開就發郵件提醒你'
            : '📮 快到了，递件窗口一开就发邮件提醒你';
        } else {
          ctaLabel = lang === 'en' ? '📮 Get an email the moment this number moves'
            : lang === 'tw' ? '📮 這個數字一變，就發郵件告訴你'
            : '📮 这个数字一变，就发邮件告诉你';
        }
        return (
          <div style={{ background: 'var(--gc-surface)', border: '1px solid var(--gc-rule)', borderRadius: '4px', padding: '0 14px 12px' }}>
            <InlineSubscribeCTA userCase={userCase} label={ctaLabel} />
          </div>
        );
      })()}

      {/* I-485 Progress — only once it's actionable: your date has arrived (or you
          have already logged steps). A 0/6 checklist promising dates seven years out
          was dead weight between the case card and the chart. */}
      {(['current', 'eligible', 'overdue'].includes(primaryStatus.status) || primaryCutoff === 'C' || completedI485Steps.length > 0) && (() => {
        const I485_STEPS = ['receipt', 'biometrics', 'ead', 'ap', 'interview', 'approval'];
        const stepMeta = {
          receipt:    { estMin: 7,   estMax: 30,  estimatedDays: 14,  icon: FileText,    scAffected: false },
          biometrics: { estMin: 30,  estMax: 90,  estimatedDays: 60,  icon: Shield,      scAffected: false },
          ead:        { estMin: 90,  estMax: 180, estimatedDays: 120, icon: Briefcase,   scAffected: true },
          ap:         { estMin: 90,  estMax: 180, estimatedDays: 150, icon: Globe,       scAffected: true },
          interview:  { estMin: 180, estMax: 540, estimatedDays: 365, icon: Users,       scAffected: true },
          // Approval range calibrated to reality: 6–15 months typical (some fast field
          // offices under 8 mo, median around 10–12 mo, slow offices up to 15 mo).
          // Prior 240–720 days range was too pessimistic on both ends.
          approval:   { estMin: 180, estMax: 450, estimatedDays: 330, icon: CheckCircle2,scAffected: true },
        };
        const stepTitleFull = {
          en: { receipt: 'Receipt Notice (I-797)', biometrics: 'Biometrics appointment', ead: 'Work Authorization (EAD)', ap: 'Travel Document (AP)', interview: 'Interview (if required)', approval: 'Final Approval (Green Card)' },
          zh: { receipt: '收据通知 (I-797)',        biometrics: '按指纹预约',               ead: '工卡 (EAD)',              ap: '旅行证 (Advance Parole)', interview: '面试(如需要)',        approval: '最终批准(绿卡)' },
          tw: { receipt: '收據通知 (I-797)',        biometrics: '按指紋預約',               ead: '工卡 (EAD)',              ap: '旅行證 (Advance Parole)', interview: '面試(如需要)',        approval: '最終批准(綠卡)' },
        }[lang];

        // Service center speed multipliers (affects EAD/AP/interview/approval):
        //   fast = Nebraska-type (~10mo), average = Texas-type (~14mo), slow = NBC/NY (~18mo)
        const speedMult = { fast: 0.75, average: 1.0, slow: 1.35 }[i485ServiceCenter] || 1.0;

        const doneCount = completedI485Steps.length;
        const progressPct = (doneCount / I485_STEPS.length) * 100;
        const notStarted = doneCount === 0;
        const allDone = doneCount === I485_STEPS.length;

        // Determine filing baseline:
        //   if user can file now (current/eligible/overdue) → today
        //   otherwise → today + the gap CONVERTED AT OBSERVED PACE (not 1 day per day —
        //   that naive reading put this card four years apart from the summary card)
        const today = new Date();
        const filingBaseline = (() => {
          if (primaryStatus.status === 'current' || primaryStatus.status === 'eligible' || primaryStatus.status === 'overdue' || primaryCutoff === 'C') {
            return today;
          }
          const daysAway = paceDaysToCalendar(userCase.category, country, primaryStatus.days || 0, filingAuthorized ? 'filing' : 'finalAction');
          return new Date(today.getTime() + daysAway * 24 * 60 * 60 * 1000);
        })();
        const isFilingProjected = !(primaryStatus.status === 'current' || primaryStatus.status === 'eligible' || primaryStatus.status === 'overdue' || primaryCutoff === 'C');
        // U (stored as null — see computeStatus) means no visas this month: no gap to
        // convert, no date to promise. Downstream shows 待定 instead of a fake "today".
        const filingDateUnknown = primaryStatus.status === 'unavailable' || (isFilingProjected && primaryStatus.days === null);

        const addDays = (date, days) => {
          const d = new Date(date);
          d.setDate(d.getDate() + days);
          return d;
        };
        const fmtDate = (d) => {
          if (lang === 'en') return d.toLocaleDateString('en-US', { year: '2-digit', month: 'short' });
          const y = String(d.getFullYear()).slice(2);
          const m = d.getMonth() + 1;
          return `${y}年${m}月`;
        };
        // Collapse same-month range "33年3月 – 33年3月" into just "33年3月".
        // Step durations (e.g. receipt: 7-30 days) often fall in the same calendar month
        // after being rounded, making "X – X" visually redundant.
        const fmtDateRange = (d1, d2) => {
          const sameMonth = d1.getFullYear() === d2.getFullYear()
                         && d1.getMonth() === d2.getMonth();
          return sameMonth ? fmtDate(d1) : `${fmtDate(d1)} – ${fmtDate(d2)}`;
        };

        // CASCADING STEP TOGGLE — linear process, all earlier steps must be complete.
        // Clicking step N:
        //   - if N is currently done  → uncomplete N and ALL later steps (cascade uncheck)
        //   - if N is currently undone → complete N and ALL earlier steps (cascade check)
        const cascadingToggle = (stepId) => {
          const stepIdx = I485_STEPS.indexOf(stepId);
          const isCurrentlyDone = completedI485Steps.includes(stepId);
          if (isCurrentlyDone) {
            // uncheck this + all later — keep only steps before this one
            setCompletedI485Steps(I485_STEPS.slice(0, stepIdx).filter(s => completedI485Steps.includes(s)));
          } else {
            // check this + all earlier — set to all steps up to and including this one
            setCompletedI485Steps(I485_STEPS.slice(0, stepIdx + 1));
          }
        };

        // APPROVAL GATE — USCIS will not adjudicate (approve) I-485 until Final Action
        // (A table) cutoff reaches user's PD, REGARDLESS of when filing happened.
        // This matters especially when B current > A (user can file early but must wait
        // for A to catch up for the actual approval).
        const aCurrent = finalActionCutoff === 'C'
                      || finalActionStatus.status === 'current'
                      || finalActionStatus.status === 'eligible'
                      || finalActionStatus.status === 'overdue';
        const aCurrentDate = aCurrent
          ? today
          : new Date(today.getTime() + paceDaysToCalendar(userCase.category, country, finalActionStatus.days || 0, 'finalAction') * 24 * 60 * 60 * 1000);
        // After A becomes current, USCIS typically issues approval within ~30–90 days.
        const postACurrentMin = 30;
        const postACurrentMax = 90;

        // ANCHOR LOGIC: walk completed steps in reverse and find the LATEST one that
        // has an actual date entered. Use it as the "anchor": pretend filing happened on
        // (anchor_date - step.estimatedDays). All subsequent steps re-estimate from this
        // grounded baseline instead of the abstract projected filing date.
        // Multiple anchors OK — latest wins for baseline; earlier dates still display
        // exactly for their own steps.
        const anchorStep = (() => {
          for (let i = I485_STEPS.length - 1; i >= 0; i--) {
            const id = I485_STEPS[i];
            if (completedI485Steps.includes(id) && stepActualDates[id]) {
              return { id, date: new Date(stepActualDates[id]) };
            }
          }
          return null;
        })();
        const hasAnchor = !!anchorStep;
        const effectiveBaseline = hasAnchor
          ? new Date(anchorStep.date.getTime() - stepMeta[anchorStep.id].estimatedDays * 24 * 60 * 60 * 1000)
          : filingBaseline;

        // Build step infos with service-center-adjusted dates
        const stepInfos = I485_STEPS.map((id, i) => {
          const meta = stepMeta[id];
          const mult = meta.scAffected ? speedMult : 1.0;
          const adjMin = Math.round(meta.estMin * mult);
          const adjMax = Math.round(meta.estMax * mult);
          let earliestDate = addDays(effectiveBaseline, adjMin);
          let latestDate = addDays(effectiveBaseline, adjMax);
          // If THIS step has an actual date, display it exactly (both min and max collapse to it).
          if (stepActualDates[id]) {
            const actual = new Date(stepActualDates[id]);
            earliestDate = actual;
            latestDate = actual;
          }
          // Approval is gated on A being current AND by progress-aware processing time.
          // For users who haven't filed yet, "A current + 60d" is too aggressive — they still
          // need to go through the whole I-485 process (~11 mo). So we take the LATER of:
          //   (a) where the step-list estimate lands (effectiveBaseline + step range)
          //   (b) A_current + progress-scaled buffer (smaller buffer if user is further along)
          if (id === 'approval' && !aCurrent && !stepActualDates[id]) {
            const stepsDone = completedI485Steps.length;
            // As user progresses, the post-A-current buffer shrinks (they've done more work)
            //   0 steps done: ~300d (full processing from A if they file at A)
            //   receipt:     ~270d (a lot left)
            //   biometrics:  ~220d
            //   EAD:         ~160d
            //   AP:          ~100d
            //   interview:   ~45d (almost there)
            const progressBufferMin = [180, 150, 120, 80, 50, 20][stepsDone] || 180;
            const progressBufferMax = [330, 280, 220, 160, 100, 60][stepsDone] || 330;
            const postAMin = addDays(aCurrentDate, Math.round(progressBufferMin * mult));
            const postAMax = addDays(aCurrentDate, Math.round(progressBufferMax * mult));
            if (postAMin.getTime() > earliestDate.getTime()) earliestDate = postAMin;
            if (postAMax.getTime() > latestDate.getTime()) latestDate = postAMax;
          }
          return {
            id,
            title: stepTitleFull[id],
            Icon: meta.icon,
            done: completedI485Steps.includes(id),
            earliestDate,
            latestDate,
          };
        });
        const nextStepIndex = stepInfos.findIndex(s => !s.done);

        return (
          <div ref={i485CardRef} style={{
            width: '100%',
            maxWidth: '100%',
            background: allDone ? 'var(--gc-green-soft)' : 'var(--gc-surface)',
            border: '1px solid ' + (allDone ? 'var(--gc-green)' : 'var(--gc-rule)'),
            borderLeft: allDone ? '3px solid var(--gc-green)' : '1px solid var(--gc-rule)',
            borderRadius: '4px',
            overflow: 'hidden',
            // Subtle celebratory glow when complete — like a ribbon of satisfaction
            boxShadow: allDone ? '0 2px 12px rgba(14, 77, 46, 0.12), inset 0 0 0 1px rgba(255, 255, 255, 0.4)' : 'none',
            transition: 'all 200ms',
          }}>
            {/* Header — always visible, clickable to toggle expand/collapse.
                Shows title + counter + progress bar. Expand pill on the right. */}
            <button
              type="button"
              onClick={() => {
                const willCollapse = i485Expanded;
                setI485Expanded(!i485Expanded);
                // When collapsing, viewport position shifts dramatically because
                // the card shrinks by ~250px. Re-anchor the card top to the viewport
                // so the user doesn't lose their place.
                if (willCollapse) {
                  requestAnimationFrame(() => {
                    i485CardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  });
                }
              }}
              style={{
                width: '100%',
                padding: '10px 12px 9px',
                background: 'transparent',
                border: 'none',
                textAlign: 'left',
                cursor: 'pointer',
              }}
              className="active:opacity-90">
              <div className="flex items-center justify-between" style={{ marginBottom: '6px' }}>
                <div className="flex items-center gap-1.5 min-w-0">
                  {allDone
                    ? <CheckCircle2 size={12} style={{ color: 'var(--gc-green)', flexShrink: 0 }} strokeWidth={2.5} />
                    : <FileText size={11} style={{ color: 'var(--gc-muted)', flexShrink: 0 }} />}
                  <span className="gc-eyebrow" style={allDone ? { color: 'var(--gc-green-ink)' } : undefined}>
                    {allDone
                      ? (lang === 'en' ? 'I-485 Complete' : lang === 'tw' ? 'I-485 全部完成' : 'I-485 全部完成')
                      : (lang === 'en' ? 'I-485 Progress' : lang === 'tw' ? 'I-485 進度' : 'I-485 流程进度')}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="gc-mono" style={{ fontSize: '11px', fontWeight: 700, color: allDone ? 'var(--gc-green-ink)' : 'var(--gc-ink)' }}>
                    {doneCount}/{I485_STEPS.length}
                  </span>
                  <span className="gc-eyebrow" style={{
                    fontSize: '9px',
                    color: i485Expanded ? 'var(--gc-ink)' : 'var(--gc-green-ink)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                    letterSpacing: '0.08em',
                    padding: '3px 7px',
                    border: `1px solid ${i485Expanded ? 'var(--gc-rule)' : 'var(--gc-green-border)'}`,
                    background: i485Expanded ? 'var(--gc-paper-soft)' : 'var(--gc-green-soft)',
                    borderRadius: '3px',
                    fontWeight: 700,
                    transition: 'all 140ms',
                  }}>
                    {i485Expanded ? (lang === 'en' ? 'CLOSE' : '收起') : (lang === 'en' ? 'OPEN' : '展开')}
                    <span style={{
                      fontSize: '11px',
                      transform: i485Expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 140ms',
                      display: 'inline-block',
                      lineHeight: 1,
                    }}>⌄</span>
                  </span>
                </div>
              </div>
              {/* Progress bar */}
              <div style={{ height: '3px', background: 'var(--gc-rule-soft)', borderRadius: '0', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: 'var(--gc-green)', width: `${progressPct}%`, transition: 'width 200ms' }} />
              </div>
            </button>

            {/* Collapsed: preview of what's next — two variants:
                  (a) Filing is still projected and no steps done yet → "等待排期到达",
                      shows the PROJECTED FILING date as the real next milestone.
                      (Step 1 "receipt I-797" isn't a user action — USCIS sends it after filing.
                       Showing it 7 years out conflicts with the "每月关注进度" suggestion below.)
                  (b) Filing eligible OR user has started filing → normal NEXT step preview. */}
            {!i485Expanded && !allDone && nextStepIndex >= 0 && (() => {
              const isWaitingForPD = isFilingProjected && completedI485Steps.length === 0;
              const pillLabel = isWaitingForPD
                ? (lang === 'en' ? 'WAITING' : lang === 'tw' ? '等待' : '等待')
                : (lang === 'en' ? 'NEXT' : lang === 'tw' ? '下一步' : '下一步');
              const titleText = isWaitingForPD
                ? (lang === 'en' ? 'Priority date reached' : lang === 'tw' ? '排期到達' : '排期到达')
                : stepInfos[nextStepIndex].title;
              const dateText = isWaitingForPD
                ? (filingDateUnknown
                    ? (lang === 'en' ? 'TBD — no visas (U)' : lang === 'tw' ? '待定 · 本月無名額（U）' : '待定 · 本月无名额（U）')
                    : (lang === 'en' ? `est. ${fmtDate(filingBaseline)}` : `预计 ${fmtDate(filingBaseline)}`))
                : fmtDateRange(stepInfos[nextStepIndex].earliestDate, stepInfos[nextStepIndex].latestDate);
              return (
                <>
                <div style={{
                  padding: '8px 12px 10px',
                  borderTop: '1px solid var(--gc-rule-soft)',
                  background: 'var(--gc-green-soft)',
                  borderLeft: '2px solid var(--gc-green)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  <span className="gc-eyebrow" style={{
                    fontSize: '8px',
                    color: 'var(--gc-green)',
                    letterSpacing: '0.12em',
                    padding: '1px 5px',
                    border: '1px solid var(--gc-green-border)',
                    borderRadius: '2px',
                    fontWeight: 700,
                    background: 'var(--gc-paper)',
                    flexShrink: 0,
                  }}>
                    {pillLabel}
                  </span>
                  <span style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--gc-green-ink)',
                    flex: '1 1 auto',
                    minWidth: 0,
                  }} className="truncate">
                    {titleText}
                  </span>
                  <span className="gc-mono" style={{
                    fontSize: '10.5px',
                    fontWeight: 600,
                    color: 'var(--gc-green-ink)',
                    flexShrink: 0,
                  }}>
                    {dateText}
                  </span>
                </div>
                </>
              );
            })()}

            {/* Collapsed + allDone: celebratory row with a nod to what comes next
                (maintain green card status, eligible for citizenship in 3-5 years).
                This replaces the "next step" peek with something warmer. */}
            {!i485Expanded && allDone && (
              <div style={{
                padding: '10px 12px 12px',
                borderTop: '1px solid var(--gc-rule-soft)',
                background: 'var(--gc-green-soft)',
                borderLeft: '2px solid var(--gc-green)',
              }}>
                <div className="gc-eyebrow" style={{
                  fontSize: '8.5px',
                  color: 'var(--gc-green)',
                  letterSpacing: '0.16em',
                  marginBottom: '3px',
                }}>
                  {lang === 'en' ? 'MILESTONE' : lang === 'tw' ? '里程碑' : '里程碑'}
                </div>
                <div className="gc-serif" style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: 'var(--gc-green-ink)',
                  lineHeight: 1.3,
                  letterSpacing: '-0.005em',
                  marginBottom: '4px',
                }}>
                  {lang === 'en'
                    ? 'You made it — welcome, permanent resident.'
                    : lang === 'tw'
                    ? '你做到了 — 歡迎成為永久居民。'
                    : '你做到了 — 欢迎成为永久居民。'}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: 'var(--gc-muted)',
                  lineHeight: 1.5,
                }}>
                  {lang === 'en'
                    ? 'Next chapter: maintain your green card, then apply for citizenship in 3-5 years (N-400).'
                    : lang === 'tw'
                    ? '下一章:維持綠卡身份,3-5 年後可申請入籍(N-400)。'
                    : '下一章:维持绿卡身份,3-5 年后可申请入籍(N-400)。'}
                </div>
              </div>
            )}

            {/* Expanded body — compact service center picker + step list */}
            {i485Expanded && (
              <div style={{ borderTop: '1px solid var(--gc-rule-soft)' }}>
                {/* Compact service center speed selector — single row, inline labels.
                    Was 3 stacked tiles; now a thin segmented control to save space. */}
                <div style={{
                  padding: '7px 12px',
                  background: 'var(--gc-paper-soft)',
                  borderBottom: '1px solid var(--gc-rule-soft)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  <span className="gc-eyebrow" style={{
                    fontSize: '9px', letterSpacing: '0.12em', color: 'var(--gc-muted)',
                    flexShrink: 0,
                  }}>
                    {lang === 'en' ? 'SPEED' : lang === 'tw' ? '速度' : '速度'}
                  </span>
                  <div style={{
                    display: 'inline-flex',
                    flex: '1 1 auto',
                    border: '1px solid var(--gc-rule)',
                    borderRadius: '3px',
                    overflow: 'hidden',
                    background: 'var(--gc-surface)',
                  }}>
                    {[
                      { id: 'fast',    label: lang === 'en' ? 'Fast' : '快' },
                      { id: 'average', label: lang === 'en' ? 'Avg'  : '平均' },
                      { id: 'slow',    label: lang === 'en' ? 'Slow' : '慢' },
                    ].map((opt, i) => {
                      const active = i485ServiceCenter === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => setI485ServiceCenter(opt.id)}
                          style={{
                            flex: 1,
                            padding: '5px 4px',
                            background: active ? 'var(--gc-ink)' : 'transparent',
                            color: active ? 'var(--gc-paper)' : 'var(--gc-muted)',
                            border: 'none',
                            borderLeft: i > 0 ? '1px solid var(--gc-rule)' : 'none',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: active ? 700 : 600,
                            letterSpacing: '0.01em',
                            transition: 'all 120ms',
                          }}>
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                  <span className="gc-mono" style={{
                    fontSize: '10px',
                    color: 'var(--gc-muted)',
                    flexShrink: 0,
                  }}>
                    {i485ServiceCenter === 'fast' ? (lang === 'en' ? '~10mo' : '~10个月')
                     : i485ServiceCenter === 'slow' ? (lang === 'en' ? '~18mo' : '~18个月')
                     : (lang === 'en' ? '~14mo' : '~14个月')}
                  </span>
                </div>

                {/* Projection caveat — when filing date is not today */}
                {isFilingProjected && (
                  <div className="gc-eyebrow" style={{
                    padding: '6px 12px 4px',
                    fontSize: '8.5px',
                    color: 'var(--gc-muted)',
                    letterSpacing: '0.1em',
                    display: 'flex', alignItems: 'center', gap: '5px',
                    borderBottom: '1px solid var(--gc-rule-soft)',
                  }}>
                    <Clock size={9} strokeWidth={2.2} />
                    {lang === 'en'
                      ? `PROJECTED FROM EST. FILING · ${fmtDate(filingBaseline)}`
                      : lang === 'tw'
                      ? `基於預計遞件日 · ${fmtDate(filingBaseline)}`
                      : `基于预计递件日 · ${fmtDate(filingBaseline)}`}
                  </div>
                )}

                {/* Step list with dates — cascading toggle */}
                <div>
                  {stepInfos.map((step, i) => {
                    const isNext = i === nextStepIndex;
                    return (
                      <button
                        key={step.id}
                        type="button"
                        onClick={() => cascadingToggle(step.id)}
                        className="active:opacity-80"
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '9px 12px',
                          background: isNext ? 'var(--gc-green-soft)' : 'transparent',
                          border: 'none',
                          borderLeft: isNext ? '2px solid var(--gc-green)' : '2px solid transparent',
                          borderTop: i > 0 ? '1px solid var(--gc-rule-soft)' : 'none',
                          textAlign: 'left',
                          cursor: 'pointer',
                          transition: 'background 120ms',
                        }}>
                        {/* Status marker */}
                        <span style={{
                          flexShrink: 0,
                          width: '18px',
                          height: '18px',
                          borderRadius: '50%',
                          background: step.done ? 'var(--gc-green)' : 'transparent',
                          border: step.done ? 'none' : `1.5px solid ${isNext ? 'var(--gc-green)' : 'var(--gc-rule)'}`,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: step.done ? 'var(--gc-paper)' : (isNext ? 'var(--gc-green-ink)' : 'var(--gc-muted)'),
                          fontSize: '9px',
                          fontWeight: 700,
                        }}>
                          {step.done ? <CheckCircle2 size={12} strokeWidth={2.5} /> : (i + 1)}
                        </span>
                        {/* Name + "next step" badge */}
                        <div style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{
                            fontSize: '12px',
                            fontWeight: isNext ? 700 : 500,
                            color: step.done ? 'var(--gc-muted)' : (isNext ? 'var(--gc-green-ink)' : 'var(--gc-ink)'),
                            textDecoration: step.done ? 'line-through' : 'none',
                          }} className="truncate">
                            {step.title}
                          </span>
                          {isNext && (
                            <span className="gc-eyebrow" style={{
                              flexShrink: 0,
                              fontSize: '8px',
                              color: 'var(--gc-green)',
                              letterSpacing: '0.12em',
                              padding: '1px 5px',
                              border: '1px solid var(--gc-green-border)',
                              borderRadius: '2px',
                              fontWeight: 700,
                              background: 'var(--gc-paper)',
                            }}>
                              {lang === 'en' ? 'NEXT' : lang === 'tw' ? '下一步' : '下一步'}
                            </span>
                          )}
                        </div>
                        {/* Right: date range OR (for done steps) an editable date input.
                            Each done step can have its actual date entered. The latest
                            done-with-date step becomes the anchor that re-calibrates
                            all subsequent estimates. */}
                        {step.done ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                            {/* Show a subtle hint only for the MOST RECENT done step if
                                it has no actual date yet — guides user to start anchoring. */}
                            {!stepActualDates[step.id] && step.id === completedI485Steps[completedI485Steps.length - 1] && !hasAnchor && (
                              <span style={{
                                fontSize: '9.5px',
                                color: 'var(--gc-green)',
                                fontWeight: 600,
                                letterSpacing: '0.02em',
                                whiteSpace: 'nowrap',
                              }}>
                                {lang === 'en' ? '← actual date' : '← 实际日期'}
                              </span>
                            )}
                            <span style={{ minWidth: '132px', display: 'inline-block' }}>
                            <DateDropdown allowEmpty value={stepActualDates[step.id] || ''}
                              onChange={(val) => {
                                const next = { ...stepActualDates };
                                if (val) next[step.id] = val;
                                else delete next[step.id];
                                setStepActualDates(next);
                              }}
                              triggerStyle={{ padding: '3px 6px', fontSize: '10.5px' }} />
                          </span>
                          </div>
                        ) : (
                          <span className="gc-mono" style={{
                            flexShrink: 0,
                            fontSize: '10px',
                            fontWeight: isNext ? 600 : 500,
                            color: isNext ? 'var(--gc-green-ink)' : 'var(--gc-muted)',
                            letterSpacing: '0.01em',
                          }}>
                            {fmtDateRange(step.earliestDate, step.latestDate)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Anchor banner — when user has entered actual dates, explain that the
                    timeline is re-anchored from the LATEST entered date. */}
                {hasAnchor && !allDone && (
                  <div style={{
                    padding: '7px 12px',
                    borderTop: '1px solid var(--gc-rule-soft)',
                    background: 'var(--gc-green-soft)',
                    borderLeft: '2px solid var(--gc-green)',
                    fontSize: '10px',
                    color: 'var(--gc-green-ink)',
                    lineHeight: 1.45,
                  }}>
                    {(() => {
                      const anchorTitle = stepTitleFull[anchorStep.id];
                      const d = anchorStep.date;
                      const dateStr = lang === 'en'
                        ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`;
                      const countEntered = Object.keys(stepActualDates).filter(k => completedI485Steps.includes(k)).length;
                      return lang === 'en'
                        ? `✓ Timeline re-anchored from actual ${anchorTitle} (${dateStr}). ${countEntered > 1 ? `${countEntered} dates entered.` : ''} Downstream steps re-estimated.`
                        : lang === 'tw'
                        ? `✓ 時間軸已以實際 ${anchorTitle}(${dateStr})重新錨定。${countEntered > 1 ? `已輸入 ${countEntered} 個日期。` : ''} 後續步驟重新估算。`
                        : `✓ 时间轴已以实际 ${anchorTitle}(${dateStr})重新锚定。${countEntered > 1 ? `已输入 ${countEntered} 个日期。` : ''} 后续步骤重新估算。`;
                    })()}
                  </div>
                )}

                {/* Cascading hint — only when there are some but not all done */}
                {!notStarted && !allDone && (
                  <div style={{
                    padding: '7px 12px',
                    borderTop: '1px solid var(--gc-rule-soft)',
                    background: 'var(--gc-paper-soft)',
                    fontSize: '10px', color: 'var(--gc-muted)', lineHeight: 1.4,
                  }}>
                    {lang === 'en'
                      ? 'Tap any step — earlier steps auto-complete, later ones clear.'
                      : lang === 'tw'
                      ? '點擊任一步驟 — 前面自動勾選,後面自動取消。'
                      : '点击任一步骤 — 前面自动勾选,后面自动取消。'}
                  </div>
                )}
                {allDone && (() => {
                  // Auto-fire confetti ONCE when first reaching allDone for this case
                  const shouldFire = !greenCardInfo.celebrated;
                  // Parse approval date
                  const approvalDate = greenCardInfo.approvalDate
                    ? new Date(greenCardInfo.approvalDate)
                    : null;
                  // Compute days until N-400 eligibility (3 years if conditional/spouse, 5 otherwise)
                  // Rule of thumb: CR-1/IR-1 (conditional or USC spouse) = 3 years, others = 5 years.
                  // User toggles isConditional to flip between the two.
                  const yearsToN400 = greenCardInfo.isConditional ? 3 : 5;
                  const n400EligibleDate = approvalDate
                    ? new Date(approvalDate.getTime() + yearsToN400 * 365.25 * 24 * 60 * 60 * 1000)
                    : null;
                  // EB-5 investors get the SAME 2-year conditional card but remove
                  // conditions with I-829 (not the marriage-based I-751) — the window
                  // math (90 days before the 2-year anniversary) is identical.
                  const isEB5Card = userCase.category?.startsWith('EB5');
                  const removalForm = isEB5Card ? 'I-829' : 'I-751';
                  // I-751 window: 90 days BEFORE 2-year anniversary, ends AT 2-year anniversary
                  const i751WindowStart = approvalDate
                    ? new Date(approvalDate.getTime() + (2 * 365.25 - 90) * 24 * 60 * 60 * 1000)
                    : null;
                  const i751WindowEnd = approvalDate
                    ? new Date(approvalDate.getTime() + 2 * 365.25 * 24 * 60 * 60 * 1000)
                    : null;
                  const now = new Date();
                  const daysUntilN400 = n400EligibleDate
                    ? Math.ceil((n400EligibleDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                    : null;
                  const daysUntilI751Start = i751WindowStart
                    ? Math.ceil((i751WindowStart.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                    : null;
                  const inI751Window = i751WindowStart && i751WindowEnd
                    && now >= i751WindowStart && now <= i751WindowEnd;

                  return (
                    <div style={{
                      position: 'relative',
                      borderTop: '1px solid var(--gc-rule-soft)',
                      background: 'linear-gradient(180deg, var(--gc-green-soft) 0%, var(--gc-green-soft) 100%)',
                    }}>
                      {/* One-shot confetti — fires on first render when !celebrated */}
                      <Confetti fire={shouldFire} />
                      {shouldFire && (
                        <CelebrationMarker onDone={() => setGreenCardInfo({ ...greenCardInfo, celebrated: true })} />
                      )}
                      {/* Celebratory title — editorial style, no emoji */}
                      <div style={{ padding: '16px 14px 12px', textAlign: 'center' }}>
                        <div className="gc-eyebrow" style={{
                          fontSize: '9px',
                          color: 'var(--gc-green)',
                          letterSpacing: '0.2em',
                          marginBottom: '6px',
                        }}>
                          {lang === 'en' ? 'MILESTONE' : lang === 'tw' ? '里程碑' : '里程碑'}
                        </div>
                        <div className="gc-serif" style={{
                          fontSize: '18px',
                          fontWeight: 700,
                          color: 'var(--gc-green-ink)',
                          marginBottom: '6px',
                          letterSpacing: '-0.01em',
                          lineHeight: 1.25,
                        }}>
                          {lang === 'en'
                            ? 'Congratulations — you\'re a permanent resident.'
                            : lang === 'tw'
                            ? '恭喜 — 你已正式成為永久居民。'
                            : '恭喜 — 你已正式成为永久居民。'}
                        </div>
                        {/* Thin hairline separator, editorial feel */}
                        <div style={{
                          width: '32px',
                          height: '1px',
                          background: 'var(--gc-green)',
                          opacity: 0.5,
                          margin: '10px auto',
                        }} />
                        <div style={{ fontSize: '11px', color: 'var(--gc-muted)', lineHeight: 1.55, fontStyle: 'italic' }}>
                          {lang === 'en'
                            ? 'This moment was years in the making. Here\'s what comes next.'
                            : lang === 'tw'
                            ? '這一刻你等了多久,只有你知道。接下來是新的一章。'
                            : '这一刻你等了多久,只有你知道。接下来是新的一章。'}
                        </div>
                      </div>

                      {/* Approval date + conditional toggle */}
                      <div style={{
                        padding: '10px 14px',
                        background: 'var(--gc-paper-soft)',
                        borderTop: '1px solid var(--gc-rule-soft)',
                        borderBottom: '1px solid var(--gc-rule-soft)',
                      }}>
                        <div className="gc-eyebrow" style={{ fontSize: '8.5px', color: 'var(--gc-muted)', letterSpacing: '0.12em', marginBottom: '6px' }}>
                          {lang === 'en' ? 'GREEN CARD DETAILS' : lang === 'tw' ? '綠卡資訊' : '绿卡信息'}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '11px', color: 'var(--gc-ink-soft)', flexShrink: 0 }}>
                            {lang === 'en' ? 'Approval date:' : lang === 'tw' ? '獲批日:' : '获批日:'}
                          </span>
                          <span style={{ minWidth: '150px', display: 'inline-block' }}>
                            <DateDropdown allowEmpty value={greenCardInfo.approvalDate || ''}
                              onChange={(v) => setGreenCardInfo({ ...greenCardInfo, approvalDate: v })}
                              triggerStyle={{ padding: '4px 7px', fontSize: '11px' }} />
                          </span>
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '11px', color: 'var(--gc-ink-soft)' }}>
                          <input
                            type="checkbox"
                            checked={greenCardInfo.isConditional}
                            onChange={(e) => setGreenCardInfo({ ...greenCardInfo, isConditional: e.target.checked })}
                            style={{ accentColor: 'var(--gc-green)' }}
                          />
                          {isEB5Card
                            ? (lang === 'en'
                                ? 'Conditional 2-year card (EB-5) — requires I-829'
                                : lang === 'tw'
                                ? '條件 2 年綠卡（EB-5 投資）— 需要遞 I-829'
                                : '条件 2 年绿卡（EB-5 投资）— 需要递 I-829')
                            : (lang === 'en'
                                ? 'Conditional 2-year card (CR-1) — requires I-751'
                                : lang === 'tw'
                                ? '條件 2 年綠卡 (CR-1) — 需要遞 I-751'
                                : '条件 2 年绿卡 (CR-1) — 需要递 I-751')}
                        </label>
                        {isEB5Card && !greenCardInfo.isConditional && (
                          <div style={{ fontSize: '10px', color: 'var(--gc-amber-ink)', marginTop: '4px', lineHeight: 1.5 }}>
                            {lang === 'en'
                              ? 'Note: every new EB-5 green card is a 2-year conditional card — this almost certainly applies to you.'
                              : lang === 'tw'
                              ? '提示：EB-5 新發綠卡一律是 2 年條件卡——這一項幾乎必然適用於你。'
                              : '提示：EB-5 新发绿卡一律是 2 年条件卡——这一项几乎必然适用于你。'}
                          </div>
                        )}
                      </div>

                      {/* Post-GC plans — one-tap anonymous survey; the aggregate is
                          both content material and the mortgage-lead signal. */}
                      {(() => {
                        let pgDone = false;
                        try { pgDone = !!window.localStorage.getItem('gc_cd_postgc'); } catch { /* noop */ }
                        if (pgDone) return null;
                        const send = async (plan) => {
                          try {
                            await fetch(`${API_BASE}/api/community`, {
                              method: 'POST', headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ type: 'postgc', plan, cat: userCase.category, country: userCase.country }),
                            });
                            try { window.localStorage.setItem('gc_cd_postgc', '1'); } catch { /* noop */ }
                            setGreenCardInfo({ ...greenCardInfo });
                          } catch { /* noop */ }
                        };
                        return (
                          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--gc-rule-soft)' }}>
                            <div className="gc-eyebrow" style={{ fontSize: '8.5px', color: 'var(--gc-muted)', letterSpacing: '0.12em', marginBottom: '6px' }}>
                              {lang === 'en' ? 'NEXT 12 MONTHS (ANONYMOUS)' : lang === 'tw' ? '接下來 12 個月（匿名）' : '接下来 12 个月（匿名）'}
                            </div>
                            <div className="flex" style={{ gap: '6px', flexWrap: 'wrap' }}>
                              {[['buy-home', lang === 'en' ? 'Buy a home' : lang === 'tw' ? '買房' : '买房'],
                                ['change-job', lang === 'en' ? 'Change job' : lang === 'tw' ? '換工作' : '换工作'],
                                ['move-state', lang === 'en' ? 'Move states' : lang === 'tw' ? '搬州' : '搬州'],
                                ['naturalize', lang === 'en' ? 'Start the citizenship clock' : lang === 'tw' ? '開始攢入籍' : '开始攒入籍'],
                                ['none', lang === 'en' ? 'Not sure yet' : lang === 'tw' ? '還沒想' : '还没想']].map(([id, label]) => (
                                <button key={id} type="button" onClick={() => send(id)}
                                  style={{ fontSize: '10.5px', fontWeight: 700, padding: '5px 10px', border: '1px solid var(--gc-green-border)', borderRadius: '3px', cursor: 'pointer', background: 'var(--gc-surface)', color: 'var(--gc-green-ink)' }}>
                                  {label}
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      })()}

                      {/* I-751 countdown — only if conditional */}
                      {greenCardInfo.isConditional && approvalDate && (
                        <div style={{
                          padding: '10px 14px',
                          borderBottom: '1px solid var(--gc-rule-soft)',
                          background: inI751Window ? 'var(--gc-amber-soft)' : 'transparent',
                          borderLeft: inI751Window ? '2px solid var(--gc-amber)' : 'none',
                        }}>
                          <div className="gc-eyebrow" style={{ fontSize: '8.5px', color: inI751Window ? 'var(--gc-amber-ink)' : 'var(--gc-muted)', letterSpacing: '0.12em', marginBottom: '4px' }}>
                            {inI751Window
                              ? (lang === 'en' ? `⚠ ${removalForm} WINDOW OPEN NOW` : `⚠ ${removalForm} 申请窗口已开`)
                              : (lang === 'en' ? `${removalForm} (REMOVE CONDITIONS)` : `${removalForm} 解除条件`)}
                          </div>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--gc-ink)', lineHeight: 1.5 }}>
                            {inI751Window
                              ? (lang === 'en'
                                  ? `File ${removalForm} before ${i751WindowEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} (2-year anniversary)`
                                  : lang === 'tw'
                                  ? `請在 ${i751WindowEnd.getFullYear()}/${i751WindowEnd.getMonth()+1}/${i751WindowEnd.getDate()} 前遞交 ${removalForm}(2 年期限)`
                                  : `请在 ${i751WindowEnd.getFullYear()}/${i751WindowEnd.getMonth()+1}/${i751WindowEnd.getDate()} 前递交 ${removalForm}(2 年期限)`)
                              : daysUntilI751Start > 0
                              ? (lang === 'en'
                                  ? `Window opens in ${daysUntilI751Start} days (${i751WindowStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })})`
                                  : lang === 'tw'
                                  ? `還有 ${daysUntilI751Start} 天窗口开(${i751WindowStart.getFullYear()}年${i751WindowStart.getMonth()+1}月)`
                                  : `还有 ${daysUntilI751Start} 天窗口开(${i751WindowStart.getFullYear()}年${i751WindowStart.getMonth()+1}月)`)
                              : (lang === 'en' ? 'Window passed — consult an attorney' : '窗口已过 — 请咨询律师')}
                          </div>
                        </div>
                      )}

                      {/* N-400 countdown */}
                      {approvalDate && daysUntilN400 !== null && (
                        <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--gc-rule-soft)' }}>
                          <div className="gc-eyebrow" style={{ fontSize: '8.5px', color: 'var(--gc-muted)', letterSpacing: '0.12em', marginBottom: '4px' }}>
                            {lang === 'en' ? 'N-400 (CITIZENSHIP)' : lang === 'tw' ? 'N-400 入籍' : 'N-400 入籍'}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
                            {daysUntilN400 > 0 ? (
                              <>
                                <span className="gc-mono" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--gc-green-ink)', letterSpacing: '-0.01em' }}>
                                  {daysUntilN400.toLocaleString()}
                                </span>
                                <span style={{ fontSize: '12px', color: 'var(--gc-ink-soft)' }}>
                                  {lang === 'en'
                                    ? `days until eligible (${n400EligibleDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })})`
                                    : lang === 'tw'
                                    ? `天后可申请(${n400EligibleDate.getFullYear()}年${n400EligibleDate.getMonth()+1}月)`
                                    : `天后可申请(${n400EligibleDate.getFullYear()}年${n400EligibleDate.getMonth()+1}月)`}
                                </span>
                              </>
                            ) : (
                              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gc-green-ink)' }}>
                                {lang === 'en' ? '✓ You are eligible to file N-400 now!' : '✓ 你现在就可以递 N-400 了!'}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Travel tracker — collapsible. Tracks trips out of US,
                          flags any single trip >180d (breaks continuous residence). */}
                      {(() => {
                        const calcDays = (from, to) => {
                          if (!from || !to) return 0;
                          const f = new Date(from);
                          const t = new Date(to);
                          return Math.max(0, Math.round((t.getTime() - f.getTime()) / 86400000) + 1);
                        };
                        const totalOut = travelRecords.reduce((sum, r) => sum + calcDays(r.from, r.to), 0);
                        const hasLongTrip = travelRecords.some(r => calcDays(r.from, r.to) > 180);
                        const longestTrip = travelRecords.reduce((max, r) => Math.max(max, calcDays(r.from, r.to)), 0);
                        return (
                          <div style={{ borderBottom: '1px solid var(--gc-rule-soft)' }}>
                            <button
                              onClick={() => setTravelExpanded(!travelExpanded)}
                              style={{
                                width: '100%',
                                padding: '9px 14px',
                                background: 'transparent',
                                border: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                cursor: 'pointer',
                                textAlign: 'left',
                              }}>
                              <Plane size={12} style={{ color: hasLongTrip ? 'var(--gc-amber-ink)' : 'var(--gc-muted)', flexShrink: 0 }} strokeWidth={2} />
                              <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                                <div className="gc-eyebrow" style={{
                                  fontSize: '8.5px',
                                  color: hasLongTrip ? 'var(--gc-amber-ink)' : 'var(--gc-muted)',
                                  letterSpacing: '0.12em',
                                }}>
                                  {lang === 'en' ? 'TRAVEL RECORDS' : lang === 'tw' ? '出境紀錄' : '出境记录'}
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--gc-ink-soft)', marginTop: '1px' }}>
                                  {travelRecords.length === 0
                                    ? (lang === 'en' ? 'Tap to log trips outside US' : '点击记录出境')
                                    : (lang === 'en'
                                        ? `${travelRecords.length} trip${travelRecords.length > 1 ? 's' : ''} · ${totalOut} days total${hasLongTrip ? ` · ⚠ longest ${longestTrip}d` : ''}`
                                        : `${travelRecords.length} 次出境 · 共 ${totalOut} 天${hasLongTrip ? ` · ⚠ 最长 ${longestTrip} 天` : ''}`)}
                                </div>
                              </div>
                              <span style={{
                                fontSize: '11px', color: 'var(--gc-muted)', flexShrink: 0,
                                transform: travelExpanded ? 'rotate(180deg)' : 'rotate(0)',
                                transition: 'transform 140ms',
                                lineHeight: 1,
                              }}>⌄</span>
                            </button>

                            {travelExpanded && (
                              <div style={{ padding: '0 14px 12px', background: 'var(--gc-paper-soft)', borderTop: '1px solid var(--gc-rule-soft)' }}>
                                {/* List existing trips */}
                                {travelRecords.length > 0 && (
                                  <div style={{ padding: '8px 0' }}>
                                    {travelRecords.map((r, i) => {
                                      const days = calcDays(r.from, r.to);
                                      const isLong = days > 180;
                                      return (
                                        <div key={i} style={{
                                          display: 'flex', alignItems: 'center', gap: '8px',
                                          padding: '5px 0',
                                          borderBottom: i < travelRecords.length - 1 ? '1px solid var(--gc-rule-soft)' : 'none',
                                        }}>
                                          <span className="gc-mono" style={{
                                            fontSize: '10.5px',
                                            color: isLong ? 'var(--gc-amber-ink)' : 'var(--gc-ink)',
                                            flex: '1 1 auto', minWidth: 0,
                                          }}>
                                            {r.from} → {r.to}
                                          </span>
                                          <span className="gc-mono" style={{
                                            fontSize: '10px', fontWeight: 600,
                                            color: isLong ? 'var(--gc-amber-ink)' : 'var(--gc-muted)',
                                          }}>
                                            {isLong && '⚠ '}{days}{lang === 'en' ? 'd' : '天'}
                                          </span>
                                          <button
                                            onClick={() => setTravelRecords(travelRecords.filter((_, idx) => idx !== i))}
                                            aria-label={lang === 'en' ? 'Remove' : '删除'}
                                            style={{
                                              background: 'transparent', border: 'none', cursor: 'pointer',
                                              color: 'var(--gc-muted-soft)', fontSize: '14px', padding: '0 2px',
                                              lineHeight: 1,
                                            }}>×</button>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                                {/* Add new trip */}
                                <div style={{
                                  display: 'flex', alignItems: 'center', gap: '6px',
                                  paddingTop: travelRecords.length > 0 ? '8px' : '10px',
                                  borderTop: travelRecords.length > 0 ? '1px solid var(--gc-rule-soft)' : 'none',
                                  flexWrap: 'wrap',
                                }}>
                                  <span style={{ flex: '1 1 110px', minWidth: 0, display: 'inline-block' }}>
                                    <DateDropdown allowEmpty value={newTripFrom}
                                      onChange={(v) => setNewTripFrom(v)}
                                      placeholder={lang === 'en' ? 'Left US' : '离开日'}
                                      triggerStyle={{ padding: '4px 6px', fontSize: '11px' }} />
                                  </span>
                                  <span style={{ color: 'var(--gc-muted)', fontSize: '11px' }}>→</span>
                                  <span style={{ flex: '1 1 110px', minWidth: 0, display: 'inline-block' }}>
                                    <DateDropdown allowEmpty value={newTripTo}
                                      onChange={(v) => setNewTripTo(v)}
                                      placeholder={lang === 'en' ? 'Returned' : '返回日'}
                                      triggerStyle={{ padding: '4px 6px', fontSize: '11px' }} />
                                  </span>
                                  <button
                                    disabled={!newTripFrom || !newTripTo || newTripTo < newTripFrom}
                                    onClick={() => {
                                      if (newTripFrom && newTripTo && newTripTo >= newTripFrom) {
                                        setTravelRecords([...travelRecords, { from: newTripFrom, to: newTripTo }].sort((a, b) => a.from.localeCompare(b.from)));
                                        setNewTripFrom('');
                                        setNewTripTo('');
                                      }
                                    }}
                                    style={{
                                      padding: '5px 10px', fontSize: '11px', fontWeight: 700,
                                      background: (!newTripFrom || !newTripTo || newTripTo < newTripFrom) ? 'var(--gc-rule)' : 'var(--gc-ink)',
                                      color: 'var(--gc-paper)', border: 'none', borderRadius: '3px',
                                      cursor: (!newTripFrom || !newTripTo || newTripTo < newTripFrom) ? 'not-allowed' : 'pointer',
                                      letterSpacing: '0.03em',
                                    }}>
                                    {lang === 'en' ? '+ Add' : '+ 记录'}
                                  </button>
                                </div>
                                {hasLongTrip && (
                                  <div style={{
                                    marginTop: '8px', padding: '7px 9px',
                                    background: 'var(--gc-amber-soft)',
                                    border: '1px solid var(--gc-amber-border)',
                                    borderLeft: '2px solid var(--gc-amber)',
                                    borderRadius: '3px',
                                    fontSize: '10.5px', color: 'var(--gc-amber-ink)', lineHeight: 1.5,
                                  }}>
                                    {lang === 'en'
                                      ? '⚠ Single trips over 180 days can break continuous residence for N-400 — consult an attorney before your next long trip.'
                                      : lang === 'tw'
                                      ? '⚠ 單次出境超過 180 天可能中斷 N-400 連續居留計算。下次長期出境前請諮詢律師。'
                                      : '⚠ 单次出境超过 180 天可能中断 N-400 连续居留计算。下次长期出境前请咨询律师。'}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Share button — opens a beautifully designed share card modal */}
                      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--gc-rule-soft)' }}>
                        <button
                          onClick={() => setShowShareCard(true)}
                          style={{
                            width: '100%',
                            padding: '9px 12px',
                            fontSize: '12px', fontWeight: 700,
                            background: 'var(--gc-ink)',
                            color: 'var(--gc-paper)',
                            border: 'none',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            letterSpacing: '0.02em',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                          }}>
                          <Sparkles size={12} strokeWidth={2.4} />
                          {lang === 'en' ? 'Share the news' : lang === 'tw' ? '分享喜訊' : '分享喜讯'}
                        </button>
                      </div>

                      {/* Footer tips */}
                      <div style={{ padding: '10px 14px', fontSize: '10.5px', color: 'var(--gc-muted)', lineHeight: 1.55 }}>
                        {lang === 'en'
                          ? 'Tips: don\'t spend >6 months outside the US per trip (breaks continuous residence), renew card every 10 years, keep tax filings current.'
                          : lang === 'tw'
                          ? '提醒:單次離境勿超 6 個月(否則中斷連續居留)、每 10 年換卡、每年正常報稅。'
                          : '提醒:单次离境勿超 6 个月(否则中断连续居留)、每 10 年换卡、每年正常报税。'}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        );
      })()}

      {/* Monthly summary — replaces the bare "next step" chip. The same numbers the
          cards above show, composed into a short narrative that changes with every
          bulletin; the old recommendation survives as the bolded closing line. */}
      {(() => {
        const cat = userCase.category;
        const hasPrev = bulletinPrevious?.finalAction && Object.keys(bulletinPrevious.finalAction).length > 0;
        const mvA = hasPrev ? computeMovement(bulletinCurrent.finalAction[cat]?.[country], bulletinPrevious.finalAction[cat]?.[country]) : null;
        const mvB = hasPrev ? computeMovement(bulletinCurrent.filing[cat]?.[country], bulletinPrevious.filing[cat]?.[country]) : null;
        const hist = monthlyMovementFromArchive(cat, country, 12);
        const total12 = hist ? hist.reduce((s, p) => s + (p.days || 0), 0) : null;

        const seg = (m, label) => {
          if (!m) return '';
          if (m.type === 'current') return lang === 'en' ? `${label} became current (C)` : lang === 'tw' ? `${label}轉為無需排隊（C）` : `${label}转为无需排队（C）`;
          if (m.type === 'advanced') return lang === 'en' ? `${label} advanced ${m.days} days` : lang === 'tw' ? `${label}前進 ${m.days} 天` : `${label}前进 ${m.days} 天`;
          if (m.type === 'retrogressed') return m.days === null
            ? (lang === 'en' ? `${label} retrogressed from current` : lang === 'tw' ? `${label}從 C 回落` : `${label}从 C 回落`)
            : (lang === 'en' ? `${label} retrogressed ${m.days} days` : lang === 'tw' ? `${label}倒退 ${m.days} 天` : `${label}倒退 ${m.days} 天`);
          if (m.wasCurrent) return lang === 'en' ? `${label} stayed current (C)` : lang === 'tw' ? `${label}維持無需排隊（C）` : `${label}保持无需排队（C）`;
          if (m.type === 'unavailable') return m.still
            ? (lang === 'en' ? `${label} remains unavailable (U)` : lang === 'tw' ? `${label}持續無名額（U）` : `${label}持续无名额（U）`)
            : (lang === 'en' ? `${label} went unavailable (U — no visas this month)` : lang === 'tw' ? `${label}轉為無名額（U，本月不發名額）` : `${label}转为无名额（U，本月不发名额）`);
          if (m.type === 'resumed') return lang === 'en' ? `${label} resumed (numbers are back)` : lang === 'tw' ? `${label}恢復名額` : `${label}恢复名额`;
          return lang === 'en' ? `${label} held steady` : lang === 'tw' ? `${label}原地不動` : `${label}没有变化`;
        };

        const sentences = [];
        if (mvA && mvB) {
          sentences.push(lang === 'en'
            ? `This bulletin: ${seg(mvA, 'Chart A')}, ${seg(mvB, 'Chart B')}.`
            : `本期${seg(mvA, '表A')}，${seg(mvB, '表B')}。`);
        }
        if (total12 !== null && total12 !== 0) {
          sentences.push(lang === 'en'
            ? `Over the past 12 months Chart A has ${total12 >= 0 ? 'advanced' : 'retrogressed'} ${Math.abs(total12).toLocaleString('en-US')} days in total.`
            : lang === 'tw'
              ? `近 12 個月表A累計${total12 >= 0 ? '前進' : '倒退'} ${Math.abs(total12).toLocaleString('en-US')} 天。`
              : `近 12 个月表A累计${total12 >= 0 ? '前进' : '倒退'} ${Math.abs(total12).toLocaleString('en-US')} 天。`);
        }
        const isSuspicious = finalActionStatus.status === 'suspicious' || filingStatus.status === 'suspicious';
        const stillQueued = !isSuspicious && finalActionStatus.days !== null && finalActionStatus.days > 0;

        // Three candidate paces (this month / 12-mo mean / 24-mo mean), sorted fast →
        // slow and labeled 乐观/中等/悲观 by their ORDER, not their source — a hot month
        // makes "this month" the optimistic anchor, a stall makes it the pessimistic
        // one. Complements the 预测 tab rather than replacing it: same idea, one tap.
        const hist24 = monthlyMovementFromArchive(cat, country, 24);
        const total24 = hist24 ? hist24.reduce((s, p) => s + (p.days || 0), 0) : null;
        const paceCandidates = stillQueued ? [
          { rate: mvA && mvA.type === 'advanced' && mvA.days > 0 ? mvA.days : null,
            basis: lang === 'en' ? 'this month' : lang === 'tw' ? '本月速度' : '本月速度' },
          { rate: total12 > 0 ? total12 / 12 : null,
            basis: lang === 'en' ? '12-mo avg' : lang === 'tw' ? '近12月均速' : '近12月均速' },
          { rate: total24 > 0 ? total24 / 24 : null,
            basis: lang === 'en' ? '24-mo avg' : lang === 'tw' ? '近24月均速' : '近24月均速' },
        ].filter((c) => c.rate !== null && isFinite(c.rate)).sort((a, b) => b.rate - a.rate) : [];
        // Same-value candidates collapse (a flat year makes 12-mo == 24-mo).
        const paceOptions = paceCandidates.filter((c, i, arr) => i === 0 || Math.round(c.rate) !== Math.round(arr[i - 1].rate));
        const paceLabels = paceOptions.length >= 3
          ? (lang === 'en' ? ['Optimistic', 'Middle', 'Pessimistic'] : lang === 'tw' ? ['樂觀', '中等', '悲觀'] : ['乐观', '中等', '悲观'])
          : (lang === 'en' ? ['Optimistic', 'Pessimistic'] : lang === 'tw' ? ['樂觀', '悲觀'] : ['乐观', '悲观']);
        const paceIdx = Math.min(sumPaceIdx, Math.max(paceOptions.length - 1, 0));
        const pace = paceOptions[paceIdx] || null;

        let etaBlock = null;
        if (pace) {
          const gapDays = finalActionStatus.days;
          const months = gapDays / pace.rate;
          const etaText = months > 360
            ? (lang === 'en' ? 'over 30 years' : '30 年以上')
            : months >= 24
              ? (lang === 'en' ? `about ${(months / 12).toFixed(1)} years` : lang === 'tw' ? `約 ${(months / 12).toFixed(1)} 年` : `约 ${(months / 12).toFixed(1)} 年`)
              : (lang === 'en' ? `about ${Math.max(Math.round(months), 1)} months` : lang === 'tw' ? `約 ${Math.max(Math.round(months), 1)} 個月` : `约 ${Math.max(Math.round(months), 1)} 个月`);
          const target = new Date();
          target.setDate(target.getDate() + Math.round(months * 30.44));
          const targetText = months > 360 ? null
            : lang === 'en'
              ? target.toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
              : `${target.getFullYear()}年${target.getMonth() + 1}月`;
          const rateText = `${Math.round(pace.rate)} ${lang === 'en' ? 'd/mo' : '天/月'}`;
          const stationNote = filingAuthorized
            ? (lang === 'en' ? ' (approval milestone — the status card above shows the earlier filing milestone)'
               : lang === 'tw' ? '（獲批口徑；上方狀態卡的年數是更早的遞件口徑）'
               : '（获批口径；上方状态卡的年数是更早的递件口径）')
            : '';
          const sentence = lang === 'en'
            ? `At the ${pace.basis} pace (${rateText}), Chart A reaches your priority date in ${etaText}${targetText ? ` — around ${targetText}` : ''}${stationNote}.`
            : lang === 'tw'
              ? `按${pace.basis}（${rateText}），表A排到你的優先日預計還需${etaText}${targetText ? `，約在 ${targetText}` : ''}${stationNote}。`
              : `按${pace.basis}（${rateText}），表A排到你的优先日预计还需${etaText}${targetText ? `，约在 ${targetText}` : ''}${stationNote}。`;
          const formula = lang === 'en'
            ? `${gapDays.toLocaleString('en-US')} days ÷ ${rateText} ≈ ${Math.round(months).toLocaleString('en-US')} mo${targetText ? ` → now + ${Math.round(months)} mo ≈ ${targetText}` : ''}`
            : lang === 'tw'
              ? `${gapDays.toLocaleString('en-US')} 天 ÷ ${rateText} ≈ ${Math.round(months).toLocaleString('en-US')} 個月${targetText ? ` → 今天 + ${Math.round(months)} 個月 ≈ ${targetText}` : ''}`
              : `${gapDays.toLocaleString('en-US')} 天 ÷ ${rateText} ≈ ${Math.round(months).toLocaleString('en-US')} 个月${targetText ? ` → 今天 + ${Math.round(months)} 个月 ≈ ${targetText}` : ''}`;
          etaBlock = { sentence, formula };
        }

        // Real-world context, never fabricated: (a) the bulletin's own lettered
        // notices that mention this category, quoted with their section letter;
        // (b) the fiscal-year calendar, which is a hard fact of the system.
        const officialNotes = [];
        {
          const catTok = userCase.category || '';
          const catRe2 = catTok.startsWith('EB')
            ? new RegExp(`EB-?${catTok.slice(2)}\\b`, 'i')
            : new RegExp(`\\b${catTok}\\b`, 'i');
          const isViewingNoticeMonth = !VIEWING_MONTH_KEY || !BULLETIN_NOTICES_MONTH || VIEWING_MONTH_KEY === BULLETIN_NOTICES_MONTH;
          if (isViewingNoticeMonth) {
            const hit = BULLETIN_NOTICES.find((nz) => nz && (catRe2.test(nz.title || '') || catRe2.test(nz.text || '')));
            if (hit) {
              const locT = locNotice(hit, lang).title;
              officialNotes.push(lang === 'en'
                ? `Official notice (section ${hit.letter || '—'}): “${locT.slice(0, 90)}”.`
                : lang === 'tw'
                  ? `官方提醒（公告 ${hit.letter || '—'} 節）：「${locT.slice(0, 90)}」。`
                  : `官方提醒（公告 ${hit.letter || '—'} 节）：「${locT.slice(0, 90)}」。`);
            }
          }
          // EB-5 family: the deadlines that create real time pressure even while the
          // set-aside pools print Current. Sources: RIA grandfather clause (file
          // I-526E by 09/30/2026), EB-5 investment-amount inflation adjustment
          // (expected ~01/2027), industry backlog expectations for the set-asides.
          if (catTok.startsWith('EB5')) {
            officialNotes.push(lang === 'en'
              ? 'EB-5 key dates: I-526E filed before Sep 30, 2026 is protected by the grandfather clause even if the regional-center program lapses in 2027; investment minimums are expected to rise around Jan 2027 (TEA $800k → ~$900k); the Rural/High-Unemployment set-asides are Current for every country today, but the industry expects backlogs to form — earlier filings lock an earlier priority date.'
              : lang === 'tw'
                ? 'EB-5 關鍵日期：2026-09-30 前遞交 I-526E 受祖父條款保護（區域中心計畫即使 2027 年到期也須繼續審理）；2027 年 1 月前後投資額預計上調（TEA 80 萬→約 90 萬美元）；鄉村/高失業區預留類別目前對所有國家無排期，但業界普遍預期將出現積壓——越早遞件優先日越早。'
                : 'EB-5 关键日期：2026-09-30 前递交 I-526E 受祖父条款保护（区域中心计划即使 2027 年到期也须继续审理）；2027 年 1 月前后投资额预计上调（TEA 80 万→约 90 万美元）；乡村/高失业区预留类别目前对所有国家无排期，但业内普遍预期将出现积压——越早递件优先日越早。');
          }
          if (userCase.category === 'F2A' && BULLETIN_EXTRAS?.f2aExempt) {
            officialNotes.push(lang === 'en'
              ? `F2A note: priority dates before ${BULLETIN_EXTRAS.f2aExempt} are exempt from the per-country limit this month (bulletin section B note).`
              : lang === 'tw'
                ? `F2A 豁免：優先日早於 ${BULLETIN_EXTRAS.f2aExempt} 的 F2A 本月不佔國別限額(公告原文)。`
                : `F2A 豁免：优先日早于 ${BULLETIN_EXTRAS.f2aExempt} 的 F2A 本月不占国别限额（公告原文）。`);
          }
          // Year-over-year: same month last year, from the real archive.
          {
            const vm2 = VIEWING_MONTH_KEY || '';
            const [vy, vmo] = vm2.split('-').map(Number);
            const lastYearKey = vy ? `${vy - 1}-${String(vmo).padStart(2, '0')}` : null;
            const thenCut = lastYearKey ? BULLETIN_ARCHIVE[lastYearKey]?.data?.finalAction?.[cat]?.[country] : null;
            const nowCut = bulletinCurrent.finalAction[cat]?.[country];
            if (thenCut && nowCut && thenCut !== 'C' && nowCut !== 'C' && thenCut !== 'U' && nowCut !== 'U') {
              const dThen = parseDate(thenCut), dNow = parseDate(nowCut);
              if (dThen && dNow) {
                const moved = Math.round((dNow - dThen) / 86400000);
                officialNotes.push(lang === 'en'
                  ? `Year over year: last ${vmo}/${vy - 1} Chart A stood at ${thenCut}; one year later it reached ${nowCut} — ${moved >= 0 ? '+' : ''}${moved} days of real movement.`
                  : lang === 'tw'
                    ? `同期對照：去年${vmo}月表A停在 ${thenCut}，一年實走 ${moved >= 0 ? '' : '−'}${Math.abs(moved)} 天到 ${nowCut}。`
                    : `同期对照：去年${vmo}月表A停在 ${thenCut}，一年实走 ${moved >= 0 ? '' : '−'}${Math.abs(moved)} 天到 ${nowCut}。`);
              }
            }
          }
          const vm = VIEWING_MONTH_KEY || '';
          const mo = parseInt(vm.split('-')[1] || '0', 10);
          if (mo === 8 || mo === 9) {
            officialNotes.push(lang === 'en'
              ? 'Fiscal-year note: annual quotas run out by Sep 30 and reset Oct 1 — late-summer slowdowns or retrogressions often rebound in October.'
              : lang === 'tw'
                ? '財年提示：年度配額 9 月 30 日用盡、10 月 1 日重置——夏末的放緩或倒退常在 10 月回彈。'
                : '财年提示：年度配额 9 月 30 日用尽、10 月 1 日重置——夏末的放缓或倒退常在 10 月回弹。');
          } else if (mo === 10) {
            officialNotes.push(lang === 'en'
              ? 'Fiscal-year note: October opens a new fiscal year with fresh quotas — early-FY movement is often faster than the spring.'
              : lang === 'tw'
                ? '財年提示：10 月是新財年首月、配額全新——財年初的推進常快於春季。'
                : '财年提示：10 月是新财年首月、配额全新——财年初的推进常快于春季。');
          }
        }

        // Same branch order as getActionRec, but pulling the description strings.
        const closeDesc = isSuspicious
          ? (lang === 'en' ? 'Verify your priority date first — the numbers above assume it is right.' : lang === 'tw' ? '請先核實優先日——以上結論都建立在它正確的前提上。' : '请先核实优先日——以上结论都建立在它正确的前提上。')
          : (filingAuthorized && (filingStatus.status === 'current' || filingStatus.status === 'overdue')) || finalActionStatus.status === 'current' || finalActionStatus.status === 'overdue'
            ? t.actionCurrentDesc
            : (filingAuthorized && filingStatus.status === 'eligible') || finalActionStatus.status === 'eligible'
              ? t.actionFileDesc
              : finalActionStatus.days !== null && finalActionStatus.days < 180
                ? t.actionPrepareDesc
                : t.actionMonitorDesc;
        const closeTitle = getActionRec(finalActionStatus, filingStatus, filingAuthorized);

        return (
          <div style={{
            background: 'var(--gc-green-soft)',
            border: '1px solid var(--gc-green-border)',
            borderLeft: '2px solid var(--gc-green)',
            borderRadius: '4px',
            padding: '10px 12px 11px',
          }}>
            <div className="flex items-center justify-between gap-2" style={{ marginBottom: '5px' }}>
              <div className="flex items-center gap-1.5 min-w-0">
                <CheckCircle2 size={13} style={{ color: 'var(--gc-green)', flexShrink: 0 }} />
                <span className="gc-eyebrow" style={{ color: 'var(--gc-green-ink)' }}>
                  {lang === 'en' ? 'This month in summary' : lang === 'tw' ? '本月小結' : '本月小结'}
                </span>
              </div>
              {paceOptions.length >= 2 && (
                <div className="inline-flex flex-shrink-0" style={{ border: '1px solid var(--gc-green-border)', borderRadius: '3px', overflow: 'hidden' }}>
                  {paceOptions.map((_, i) => (
                    <button key={i} type="button"
                      onClick={() => setSumPaceIdx(i)}
                      style={{
                        fontSize: '9px', fontWeight: 700, padding: '2px 7px', lineHeight: 1.5,
                        border: 'none', cursor: 'pointer', letterSpacing: '0.05em',
                        borderLeft: i === 0 ? 'none' : '1px solid var(--gc-green-border)',
                        background: paceIdx === i ? 'var(--gc-green)' : 'transparent',
                        color: paceIdx === i ? 'var(--gc-paper)' : 'var(--gc-muted)',
                      }}>
                      {paceLabels[i]}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {sentences.length > 0 && (
              <p style={{ fontSize: '12px', lineHeight: 1.7, color: 'var(--gc-ink-soft)', margin: 0 }}>
                {sentences.join(' ')}
              </p>
            )}
            {etaBlock && (
              <p style={{ fontSize: '12px', lineHeight: 1.7, color: 'var(--gc-ink-soft)', margin: '2px 0 0' }}>
                {etaBlock.sentence}
                {' '}
                <button type="button"
                  onClick={() => setSumFormulaOpen((v) => !v)}
                  style={{
                    border: 'none', background: 'transparent', padding: 0, cursor: 'pointer',
                    fontSize: '10.5px', color: 'var(--gc-green)', textDecoration: 'underline',
                    textUnderlineOffset: '2px', fontWeight: 600,
                  }}>
                  {sumFormulaOpen
                    ? (lang === 'en' ? 'hide formula' : lang === 'tw' ? '收起公式' : '收起公式')
                    : (lang === 'en' ? 'show formula' : lang === 'tw' ? '看公式' : '看公式')}
                </button>
              </p>
            )}
            {etaBlock && sumFormulaOpen && (
              <div className="gc-mono" style={{
                fontSize: '10.5px', lineHeight: 1.6, color: 'var(--gc-ink-soft)',
                background: 'var(--gc-paper-soft)', border: '1px solid var(--gc-rule-soft)',
                borderRadius: '3px', padding: '6px 9px', margin: '6px 0 0',
                overflowX: 'auto', whiteSpace: 'nowrap',
              }}>
                {etaBlock.formula}
              </div>
            )}
            {officialNotes.map((note, ni) => (
              <p key={ni} style={{ fontSize: '11px', lineHeight: 1.65, color: 'var(--gc-amber-ink, var(--gc-ink-soft))', margin: '5px 0 0', paddingLeft: '8px', borderLeft: '2px solid var(--gc-amber-border, var(--gc-rule))' }}>
                {note}
              </p>
            ))}
            <p style={{ fontSize: '12px', lineHeight: 1.7, color: 'var(--gc-green-ink)', margin: sentences.length > 0 || etaBlock ? '4px 0 0' : 0 }}>
              <span style={{ fontWeight: 700 }}>{closeTitle}</span>
              <span style={{ color: 'var(--gc-ink-soft)' }}>{lang === 'en' ? ' — ' : '——'}{closeDesc}</span>
            </p>
          </div>
        );
      })()}

      {/* Community — moved to its own "社区" tab (see CommunityPage), so it no longer
          renders here. Kept CommunityHub itself unchanged; only its mount point moved. */}

      {/* Status share modal (#11) — a self-contained, screenshot-friendly card:
          brand + month + case + hero estimate. No canvas export; the card IS the
          shareable artifact, sized to screenshot cleanly. */}
      {showStatusShare && (() => {
        const heroSel2 = heroChart || (filingAuthorized ? 'B' : 'A');
        const ps2 = heroSel2 === 'B' ? filingStatus : finalActionStatus;
        const paceCal = ps2.days ? paceDaysToCalendar(userCase.category, country, ps2.days, heroSel2 === 'B' ? 'filing' : 'finalAction') : null;
        const etaDate = paceCal ? new Date(Date.now() + paceCal * 86400000) : null;
        const yearsF = paceCal ? paceCal / 365.25 : null;
        const heroText = paceCal === null ? (lang === 'en' ? 'TBD' : '待定')
          : yearsF >= 1.5
            ? (lang === 'en' ? `~${yearsF.toFixed(1)} yrs` : `约 ${yearsF.toFixed(1)} 年`)
            : (lang === 'en' ? `~${Math.max(Math.round(paceCal / 30.44), 1)} mo` : `约 ${Math.max(Math.round(paceCal / 30.44), 1)} 个月`);
        const fmtYM = (d) => lang === 'en'
          ? d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
          : `${d.getFullYear()}年${d.getMonth() + 1}月`;
        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'rgba(15,20,25,0.55)' }}
               onClick={() => setShowStatusShare(false)}>
            <div onClick={(e) => e.stopPropagation()} style={{
              background: 'var(--gc-surface)', border: '1px solid var(--gc-rule)', borderTop: '3px solid var(--gc-green)',
              borderRadius: '6px', maxWidth: '340px', width: '100%', padding: '20px 18px 14px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}>
              <div className="flex items-center justify-between" style={{ marginBottom: '12px' }}>
                <span className="gc-serif" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--gc-ink)' }}>
                  {lang === 'en' ? 'Green Card Tracker' : '绿卡晴雨表'}
                </span>
                <span className="gc-mono" style={{ fontSize: '10px', color: 'var(--gc-muted)' }}>{BULLETIN_CURRENT_MONTH[lang]}</span>
              </div>
              <div className="gc-eyebrow" style={{ fontSize: '9px', color: 'var(--gc-muted)', marginBottom: '3px' }}>
                {t[userCase.category.toLowerCase()]} · {countryLabel}
              </div>
              <div className="gc-serif" style={{ fontSize: '36px', fontWeight: 700, color: 'var(--gc-ink)', letterSpacing: '-0.02em', lineHeight: 1.05 }}>
                {heroText}
              </div>
              <div className="gc-mono" style={{ fontSize: '11px', color: 'var(--gc-ink-soft)', marginTop: '6px' }}>
                {etaDate ? (lang === 'en' ? `est. ${fmtYM(etaDate)}` : `预计 ${fmtYM(etaDate)}`) : ''}
                {ps2.days !== null && <span> · {lang === 'en' ? `${ps2.days.toLocaleString('en-US')} days to go` : `还差 ${ps2.days.toLocaleString('en-US')} 天`}</span>}
              </div>
              <div className="gc-mono" style={{ fontSize: '10px', color: 'var(--gc-muted)', marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--gc-rule-soft)', display: 'flex', justifyContent: 'space-between' }}>
                <span>gc.jmjvc.us</span>
                <span>{lang === 'en' ? 'monthly auto-update' : '每月自动更新'}</span>
              </div>
              <div style={{ fontSize: '10px', color: 'var(--gc-muted)', marginTop: '10px', textAlign: 'center' }}>
                {lang === 'en' ? 'Screenshot this card to share · tap outside to close' : '截图这张卡分享给同路人 · 点外部关闭'}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Share card modal — shown when user clicks "分享喜讯" in the celebration panel */}
      {showShareCard && (
        <ShareCardModal
          userCase={userCase}
          greenCardInfo={greenCardInfo}
          lang={lang}
          onClose={() => setShowShareCard(false)}
        />
      )}

    </div>
  );
};

// ============================================================
// Monthly Update
// ============================================================
// CopyChip — tap-to-copy contact chip. WeChat/XHS in-app browsers often lack
// navigator.clipboard (non-secure context), so fall back to a hidden textarea +
// execCommand; if even that fails the chip selects its text so a long-press copy
// still works. Confirmation is inline — no toast layer to maintain.
const CopyChip = ({ label, value, hint, compact = false }) => {
  const { lang } = useLang();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    let ok = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);
        ok = true;
      }
    } catch { /* fall through */ }
    if (!ok) {
      try {
        const ta = document.createElement('textarea');
        ta.value = value;
        ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:absolute;left:-9999px;top:0;';
        document.body.appendChild(ta);
        ta.select();
        ta.setSelectionRange(0, value.length);
        ok = document.execCommand('copy');
        document.body.removeChild(ta);
      } catch { /* noop */ }
    }
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  };
  return (
    <button type="button" onClick={copy}
      className="flex items-center gc-mono"
      style={{
        gap: compact ? '5px' : '7px', fontSize: compact ? '10px' : '11px',
        cursor: 'pointer', textAlign: 'left',
        border: `1px solid ${copied ? 'var(--gc-green)' : 'var(--gc-green-border)'}`,
        background: 'var(--gc-green-soft)', color: 'var(--gc-green-ink)',
        borderRadius: '3px', padding: compact ? '5px 7px' : '7px 10px',
        minWidth: 0, flex: '0 1 auto', overflow: 'hidden',
      }}>
      {/* Never wraps to a second line: the value truncates with an ellipsis
          instead. The copy button still puts the FULL value on the clipboard,
          so a clipped email is readable the moment it's pasted. */}
      <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label && <><span style={{ color: 'var(--gc-muted)' }}>{label}</span>{' '}</>}
        <b style={{ userSelect: 'all' }}>{value}</b>
      </span>
      <span style={{
        flexShrink: 0, fontWeight: 700, fontSize: compact ? '8.5px' : '9.5px', letterSpacing: '0.04em',
        color: copied ? 'var(--gc-paper)' : 'var(--gc-green-ink)',
        background: copied ? 'var(--gc-green)' : 'var(--gc-surface)',
        border: `1px solid ${copied ? 'var(--gc-green)' : 'var(--gc-green-border)'}`,
        borderRadius: '2px', padding: compact ? '2px 4px' : '2.5px 6px', lineHeight: 1.2,
      }}>
        {copied
          ? (lang === 'en' ? 'COPIED ✓' : lang === 'tw' ? '已複製 ✓' : '已复制 ✓')
          : (hint || (lang === 'en' ? 'COPY' : lang === 'tw' ? '複製' : '复制'))}
      </span>
    </button>
  );
};

// ============================================================
// AboutTab — what this site is, where the data comes from, and the placeholder for
// the future partners/sponsorship slot (mortgage / immigration-attorney referrals).
// Keep the partners card copy generic until real partners are signed.
// ============================================================
const AboutTab = () => {
  const { lang } = useLang();
  const card = { background: 'var(--gc-surface)', border: '1px solid var(--gc-rule)', borderRadius: '4px', padding: '14px 16px' };
  const eyebrow = { fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gc-green)', fontWeight: 700, marginBottom: '6px' };
  return (
    <div className="space-y-2">
      <div style={{ padding: '4px 0 0' }}>
        <div className="gc-eyebrow" style={{ color: 'var(--gc-green)' }}>{lang === 'en' ? 'ABOUT' : '关于'}</div>
        <h2 className="gc-serif" style={{ fontSize: '20px', fontWeight: 700, color: 'var(--gc-ink)', margin: '2px 0 2px' }}>
          {lang === 'en' ? 'About Green Card Tracker' : lang === 'tw' ? '關於綠卡晴雨表' : '关于绿卡晴雨表'}
        </h2>
      </div>
      {/* One intro card, not two — "什么" 与 "边界" 合并后正文各收一句，
          省下的高度让下方的服务卡上移进首屏。 */}
      <div style={card}>
        <div className="gc-eyebrow" style={eyebrow}>{lang === 'en' ? 'What this is · data & limits' : lang === 'tw' ? '這是什麼 · 資料與邊界' : '这是什么 · 数据与边界'}</div>
        <p style={{ fontSize: '12.5px', lineHeight: 1.75, color: 'var(--gc-ink-soft)', margin: 0 }}>
          {lang === 'en'
            ? 'Green Card Tracker turns the monthly Visa Bulletin into an answer you can use: how long is MY wait, and what changed this month. Free, in Chinese and English, updated automatically.'
            : lang === 'tw'
              ? '綠卡晴雨表把國務院每月的簽證公告，變成你真正需要的答案：我還要等多久、這個月發生了什麼。免費，簡繁英三語，每月自動更新。'
              : '绿卡晴雨表把国务院每月的签证公告，变成你真正需要的答案：我还要等多久、这个月发生了什么。免费，简繁英三语，每月自动更新。'}
        </p>
        <p style={{ fontSize: '11.5px', lineHeight: 1.7, color: 'var(--gc-muted)', margin: '7px 0 0' }}>
          {lang === 'en'
            ? 'Cutoffs come from travel.state.gov; wait estimates are projections from real historical pace and can speed up, slow down or retrogress. Not legal advice.'
            : lang === 'tw'
              ? '截止日來自 travel.state.gov；等待預計按真實歷史速度推算，排期可能加速、放緩或倒退。本站不構成法律意見。'
              : '截止日来自 travel.state.gov；等待预计按真实历史速度推算，排期可能加速、放缓或倒退。本站不构成法律意见。'}
        </p>
      </div>
      <div style={{ ...card, borderLeft: '3px solid var(--gc-green)' }}>
        <div className="gc-eyebrow" style={eyebrow}>{lang === 'en' ? 'From the builder · U.S. mortgage' : lang === 'tw' ? '站長服務 · 全美房屋貸款' : '站长服务 · 全美房屋贷款'}</div>
        <div className="flex items-center" style={{ gap: '12px', marginBottom: '8px' }}>
          <img src="/jack-avatar.png?v=2" alt="Jack" width="52" height="52"
            style={{ width: '52px', height: '52px', borderRadius: '50%', border: '2px solid var(--gc-green-border)', flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <div className="gc-serif" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--gc-ink)' }}>
              Jack ｜ 全美房贷 MLO
            </div>
            <div style={{ fontSize: '10.5px', color: 'var(--gc-muted)' }}>
              {lang === 'en' ? 'Licensed Mortgage Loan Officer · built this site' : lang === 'tw' ? '持牌 Mortgage Loan Officer · 本站作者' : '持牌 Mortgage Loan Officer · 本站作者'}
            </div>
          </div>
        </div>
        <p style={{ fontSize: '12.5px', lineHeight: 1.75, color: 'var(--gc-ink-soft)', margin: '0 0 10px' }}>
          {lang === 'en'
            ? 'U.S. home loans nationwide: primary & investment, purchase & refinance. When it\'s time to settle in, happy to talk.'
            : lang === 'tw'
              ? '全美房屋貸款：自住與投資、購房與重貸。要安家置業，歡迎聊聊。'
              : '全美房屋贷款：自住与投资、购房与重贷。要安家置业，欢迎聊聊。'}
        </p>
        <div className="flex" style={{ gap: '8px', flexWrap: 'wrap' }}>
          <CopyChip label={lang === 'en' ? 'WeChat' : '微信'} value="yiaccount" />
          <CopyChip label={lang === 'en' ? 'XHS ID' : '小红书号'} value="49330048750" />
        </div>
        <p style={{ fontSize: '10px', color: 'var(--gc-muted)', margin: '8px 0 0' }}>
          {lang === 'en' ? 'Mortgage services are independent of this site\'s bulletin data. Not financial advice.' : lang === 'tw' ? '貸款服務與本站排期資料相互獨立，不構成金融建議。' : '贷款服务与本站排期数据相互独立，不构成金融建议。'}
        </p>
      </div>
      {/* Paid partner slot #1 — Wu Law (SIJS). Halved from the builder-card
          skeleton: 40px logo, one qualifying sentence, timings folded into the
          chip row, contact inline. An ad the reader scrolls past costs the same
          as no ad — but one that eats half the page costs trust. */}
      <div style={{ ...card, borderLeft: '3px solid var(--gc-blue)' }}>
        <div className="flex items-center" style={{ gap: '10px' }}>
          <img src="/wulaw-logo.png" alt={lang === 'en' ? 'Wu Law Office' : '吴律师事务所'} width="40" height="40"
            style={{ width: '40px', height: '40px', borderRadius: '50%', border: '1.5px solid var(--gc-rule)', flexShrink: 0, objectFit: 'cover' }} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="gc-eyebrow" style={{ ...eyebrow, marginBottom: '1px' }}>
              {lang === 'en' ? 'Partner · immigration law' : lang === 'tw' ? '合作欄位 · 移民法律服務' : '合作栏位 · 移民法律服务'}
            </div>
            <a href="https://www.robertwulaw.com" target="_blank" rel="noopener noreferrer sponsored"
              className="gc-serif" style={{
                fontSize: '14px', fontWeight: 700, color: 'var(--gc-ink)', lineHeight: 1.3,
                textDecoration: 'none', display: 'inline-flex', alignItems: 'baseline', gap: '5px',
              }}>
              {lang === 'en' ? 'Wu Law Office ｜ SIJS' : lang === 'tw' ? '吳律師事務所 ｜ SIJS' : '吴律师事务所 ｜ SIJS'}
              <span className="gc-mono" style={{ fontSize: '9.5px', fontWeight: 700, color: 'var(--gc-green)' }}>
                robertwulaw.com ↗
              </span>
            </a>
          </div>
        </div>
        <p style={{ fontSize: '12px', lineHeight: 1.7, color: 'var(--gc-ink-soft)', margin: '7px 0 6px' }}>
          {lang === 'en'
            ? 'SIJS — for a child under 21, unmarried, inside the U.S., who cannot reunite with a parent due to abuse, neglect or abandonment. Work permit, SSN and a license while the case runs.'
            : lang === 'tw'
              ? 'SIJS 特殊青少年身份：未滿 21 歲、未婚、人在美國境內，因虐待／忽視／遺棄無法與父母團聚者。等待期間可拿工卡、SSN、駕照。'
              : 'SIJS 特殊青少年身份：未满 21 岁、未婚、人在美国境内，因虐待／忽视／遗弃无法与父母团聚者。等待期间可拿工卡、SSN、驾照。'}
        </p>
        <div className="flex items-center" style={{ gap: '6px', flexWrap: 'wrap' }}>
          <span className="gc-mono" style={{
            fontSize: '9.5px', padding: '3px 7px', borderRadius: '10px',
            border: '1px solid var(--gc-rule)', color: 'var(--gc-muted)', whiteSpace: 'nowrap',
          }}>{lang === 'en' ? 'Court 3-9mo · petition 3-8mo · GC 1-3yr' : lang === 'tw' ? '家事法院 3-9 月 · 移民申請 3-8 月 · 排期 1-3 年' : '家事法院 3-9 月 · 移民申请 3-8 月 · 排期 1-3 年'}</span>
        </div>
        <div className="flex" style={{ gap: '5px', flexWrap: 'nowrap', marginTop: '6px' }}>
          <CopyChip compact label={lang === 'en' ? 'Tel' : '电话'} value="718-567-5566" />
          <CopyChip compact value="info@robertwulaw.com" />
        </div>
        <p style={{ fontSize: '9.5px', color: 'var(--gc-muted)', margin: '7px 0 0' }}>
          {lang === 'en'
            ? 'Paid slot · Flushing NY 133-32 41 Rd 3A · this site is not a law firm; timings are the firm\u2019s own figures.'
            : lang === 'tw'
              ? '付費欄位 · 法拉盛 41 路 133-32 號 3A · 本站非律師事務所，時長為該所提供的參考值。'
              : '付费栏位 · 法拉盛 41 路 133-32 号 3A · 本站非律师事务所，时长为该所提供的参考值。'}
        </p>
      </div>
      <div style={{ ...card, borderStyle: 'dashed', borderColor: 'var(--gc-green-border)', background: 'var(--gc-green-soft)' }}>
        <div className="gc-eyebrow" style={eyebrow}>{lang === 'en' ? 'Partner slots · open' : lang === 'tw' ? '合作欄位 · 長期招募' : '合作栏位 · 长期招募'}</div>
        <p style={{ fontSize: '12.5px', lineHeight: 1.75, color: 'var(--gc-ink-soft)', margin: 0 }}>
          {lang === 'en'
            ? 'A small number of partner slots stay open for services our readers actually need — immigration attorneys (EB-4 / SIJ / EB-5 and family cases) and cross-border finance. To reach us, subscribe and reply to any of our emails.'
            : lang === 'tw'
              ? '本站長期開放少量合作欄位，只限讀者真正需要的服務：移民律師（EB-4／SIJ／EB-5 及親屬移民）、跨境金融。洽談方式：訂閱後直接回覆任一封郵件。'
              : '本站长期开放少量合作栏位，只限读者真正需要的服务：移民律师（EB-4／SIJ／EB-5 及亲属移民）、跨境金融。洽谈方式：订阅后直接回复任一封邮件。'}
        </p>
      </div>
      {/* Sister site — same builder, adjacent need (rates decide the mortgage you'll
          carry once the wait ends). Keeps traffic inside the JMJ family. */}
      <a href="https://rate.jmjvc.us" target="_blank" rel="noopener noreferrer"
        style={{ ...card, display: 'block', textDecoration: 'none', background: 'var(--gc-paper-soft)' }}>
        <div className="gc-eyebrow" style={eyebrow}>{lang === 'en' ? 'Also by the builder' : lang === 'tw' ? '站長的其他作品' : '站长的其他作品'}</div>
        <div className="flex items-center justify-between" style={{ gap: '10px' }}>
          <div style={{ minWidth: 0 }}>
            <div className="gc-serif" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--gc-ink)' }}>
              {lang === 'en' ? 'Rate Navigator' : lang === 'tw' ? '利率導航 · Rate Navigator' : '利率导航 · Rate Navigator'}
            </div>
            <div className="gc-mono" style={{ fontSize: '11px', color: 'var(--gc-green)', marginTop: '2px' }}>
              rate.jmjvc.us →
            </div>
          </div>
          <span className="gc-mono flex-shrink-0" style={{
            fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em',
            border: '1px solid var(--gc-green-border)', background: 'var(--gc-green-soft)',
            color: 'var(--gc-green-ink)', borderRadius: '11px', padding: '4px 10px',
          }}>
            {lang === 'en' ? 'FREE TOOL' : lang === 'tw' ? '免費工具' : '免费工具'}
          </span>
        </div>
        <p style={{ fontSize: '12.5px', lineHeight: 1.75, color: 'var(--gc-ink-soft)', margin: '8px 0 0' }}>
          {lang === 'en'
            ? 'Another free tool by the same builder — U.S. interest rates on one page. The wait and the rate are linked: whatever the rate is when your date arrives decides the payment you carry for the next 30 years.'
            : lang === 'tw'
              ? '同一個作者做的另一個免費工具：把美國利率放在一頁看清楚。等排期與看利率其實是同一件事——排期到了要買房，那時的利率決定你之後 30 年的月供。'
              : '同一个作者做的另一个免费工具：把美国利率放在一页看清楚。等排期与看利率其实是同一件事——排期到了要买房，那时的利率决定你之后 30 年的月供。'}
        </p>
      </a>
      <div style={card}>
        <div className="gc-eyebrow" style={eyebrow}>{lang === 'en' ? 'Reminders & subscription' : lang === 'tw' ? '提醒與訂閱' : '提醒与订阅'}</div>
        <p style={{ fontSize: '12.5px', lineHeight: 1.75, color: 'var(--gc-ink-soft)', margin: '0 0 8px' }}>
          {lang === 'en'
            ? 'Email updates when your line moves, plus I-751 / N-400 timing reminders.'
            : lang === 'tw'
              ? '排期一動就發郵件，另有 I-751／N-400 時點提醒。'
              : '排期一动就发邮件，另有 I-751／N-400 时点提醒。'}
        </p>
        <div className="flex items-center" style={{ gap: '8px' }}>
          <button type="button" onClick={() => window.dispatchEvent(new Event('gc-open-subscribe'))}
            style={{ border: 'none', borderRadius: '4px', background: 'var(--gc-green)', color: 'var(--gc-paper)', padding: '8px 16px', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}>
            {lang === 'en' ? 'Subscribe' : lang === 'tw' ? '訂閱' : '订阅'}
          </button>
          <button type="button" onClick={() => window.dispatchEvent(new Event('gc-goto-alerts'))}
            style={{ border: '1px solid var(--gc-rule)', borderRadius: '4px', background: 'var(--gc-paper)', padding: '7px 12px', cursor: 'pointer', fontSize: '11.5px', color: 'var(--gc-ink-soft)' }}>
            {lang === 'en' ? 'Reminder settings' : lang === 'tw' ? '提醒設定' : '提醒设置'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// BulletinTab — the bulletin itself as a first-class page: official notices
// (trilingual), DV cutoffs, statutory quotas, edition metadata.
// ============================================================
const BulletinTab = ({ userCase = null }) => {
  const { lang } = useLang();
  const [openNotice, setOpenNotice] = useState(null);
  // Category-relevant notices float to the top so the reader doesn't wade through
  // every section to find theirs; everything else stays below, unchanged.
  const catTok = userCase?.category || '';
  const catRe = !catTok ? null
    : catTok === 'EW' ? /other worker/i
    : catTok === 'SR' ? /religious/i
    : catTok.startsWith('EB') ? new RegExp(`EB-?${catTok.slice(2)}\\b|\\b${catTok.slice(0, 2)}${catTok.slice(2)}\\b`, 'i')
    : new RegExp(`\\b${catTok}\\b`, 'i');
  const noticeHit = (nz) => !!(catRe && nz && (catRe.test(nz.title || '') || catRe.test(nz.text || '')));
  const indexed = BULLETIN_NOTICES.map((nz, ni) => ({ nz, ni }));
  const mineNotices = indexed.filter(({ nz }) => noticeHit(nz));
  const otherNotices = mineNotices.length ? indexed.filter(({ nz }) => !noticeHit(nz)) : indexed;
  return (
    <div className="space-y-2">
      <div style={{ padding: '4px 0 0' }}>
        <div className="gc-eyebrow" style={{ color: 'var(--gc-green)' }}>{lang === 'en' ? 'BULLETIN' : '公告'}</div>
        <h2 className="gc-serif" style={{ fontSize: '20px', fontWeight: 700, color: 'var(--gc-ink)', margin: '2px 0 2px' }}>
          {lang === 'en' ? 'This month\'s Visa Bulletin' : lang === 'tw' ? '本期簽證公告' : '本期签证公告'}
        </h2>
        <p style={{ fontSize: '12px', color: 'var(--gc-muted)', margin: 0 }}>
          {BULLETIN_CURRENT_MONTH[lang]}
          {BULLETIN_EXTRAS?.meta?.volume ? ` · Vol. ${BULLETIN_EXTRAS.meta.volume} No. ${BULLETIN_EXTRAS.meta.number}` : ''}
          {BULLETIN_EXTRAS?.meta?.printedDate ? ` · ${BULLETIN_EXTRAS.meta.printedDate}` : ''}
        </p>
      </div>
      {/* B3: the bulletin's own lettered notices, verbatim — the user's category first */}
      {mineNotices.length > 0 && (
        <div className="bg-white rounded-2xl p-3 shadow-sm mt-2" style={{ border: '1px solid var(--gc-green-border)' }}>
          <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--gc-green)' }}>
            {lang === 'en' ? `About your category · ${catTok}` : lang === 'tw' ? `與你的類別相關 · ${catTok}` : `与你的类别相关 · ${catTok}`}
          </div>
          {mineNotices.map(({ nz, ni }) => {
            const loc = locNotice(nz, lang);
            const isOpen = openNotice === ni;
            return (
            <div key={ni} style={{ borderLeft: '2px solid var(--gc-green)', padding: '6px 10px', marginBottom: '6px', background: 'var(--gc-green-soft)' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gc-ink)' }}>
                {nz.letter ? `${nz.letter} · ` : ''}{loc.title}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--gc-ink-soft)', lineHeight: 1.65, marginTop: '2px' }}>
                {loc.translated ? loc.text : `${(loc.text || '').slice(0, 220)}${(loc.text || '').length > 220 ? '…' : ''}`}
              </div>
              {loc.translated && (
                <div style={{ marginTop: '3px' }}>
                  <button type="button" onClick={() => setOpenNotice(isOpen ? null : ni)}
                    style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', fontSize: '9.5px', color: 'var(--gc-muted)', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
                    {isOpen
                      ? (lang === 'tw' ? '收起英文原文' : '收起英文原文')
                      : (lang === 'tw' ? 'AI 譯文 · 查看英文原文' : 'AI 译文 · 查看英文原文')}
                  </button>
                  {isOpen && (
                    <div style={{ fontSize: '10.5px', color: 'var(--gc-muted)', lineHeight: 1.6, marginTop: '3px', fontStyle: 'italic' }}>
                      {nz.title}{nz.text ? ` — ${nz.text}` : ''}
                    </div>
                  )}
                </div>
              )}
            </div>
            );
          })}
        </div>
      )}
      {otherNotices.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-sm mt-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
            {mineNotices.length
              ? (lang === 'en' ? 'Other notices' : lang === 'tw' ? '其餘公告' : '其余公告')
              : (lang === 'en' ? 'Official notices (from the bulletin)' : lang === 'tw' ? '公告原文提醒（官方）' : '公告原文提醒（官方）')}
          </div>
          {otherNotices.map(({ nz, ni }) => {
            const loc = locNotice(nz, lang);
            const isOpen = openNotice === ni;
            return (
            <div key={ni} style={{ borderLeft: '2px solid var(--gc-amber-border)', padding: '6px 10px', marginBottom: '6px', background: 'var(--gc-paper-soft)' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gc-ink)' }}>
                {nz.letter ? `${nz.letter} · ` : ''}{loc.title}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--gc-ink-soft)', lineHeight: 1.65, marginTop: '2px' }}>
                {loc.translated ? loc.text : `${(loc.text || '').slice(0, 220)}${(loc.text || '').length > 220 ? '…' : ''}`}
              </div>
              {loc.translated && (
                <div style={{ marginTop: '3px' }}>
                  <button type="button" onClick={() => setOpenNotice(isOpen ? null : ni)}
                    style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', fontSize: '9.5px', color: 'var(--gc-muted)', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
                    {isOpen
                      ? (lang === 'tw' ? '收起英文原文' : '收起英文原文')
                      : (lang === 'tw' ? 'AI 譯文 · 查看英文原文' : 'AI 译文 · 查看英文原文')}
                  </button>
                  {isOpen && (
                    <div style={{ fontSize: '10.5px', color: 'var(--gc-muted)', lineHeight: 1.6, marginTop: '3px', fontStyle: 'italic' }}>
                      {nz.title}{nz.text ? ` — ${nz.text}` : ''}
                    </div>
                  )}
                </div>
              )}
            </div>
            );
          })}
        </div>
      )}



      {/* B1: DV lottery rank cutoffs — scraped since day one, displayed at last */}
      {BULLETIN_EXTRAS?.dv && (
        <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-sm mt-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
            {lang === 'en' ? 'DV lottery rank cutoffs' : lang === 'tw' ? 'DV 抽籤排名截止' : 'DV 抽签排名截止'}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--gc-muted)', marginBottom: '6px' }}>
            {lang === 'en'
              ? 'Case numbers BELOW the cutoff may proceed. Numbers are ranks, not dates.'
              : '案件编号低于截止数即可推进；这些是抽签排名数字，不是日期。'}
          </div>
          {Object.entries({ africa: lang === 'en' ? 'Africa' : '非洲', asia: lang === 'en' ? 'Asia' : '亚洲', europe: lang === 'en' ? 'Europe' : '欧洲', northAmerica: lang === 'en' ? 'N. America' : '北美', oceania: lang === 'en' ? 'Oceania' : '大洋洲', southAmerica: lang === 'en' ? 'S. America' : '南美/加勒比' }).map(([k, label]) => {
            const cur = BULLETIN_EXTRAS.dv?.[k];
            const nxt = BULLETIN_EXTRAS.dvNext?.regions?.[k];
            if (!cur) return null;
            const fmtDv = (v) => (v === 'C' ? (lang === 'en' ? 'Current' : '无限制') : (typeof v === 'number' ? v.toLocaleString('en-US') : v));
            return (
              <div key={k} className="flex items-center justify-between" style={{ fontSize: '11.5px', padding: '3px 0', borderTop: '1px solid var(--gc-rule-soft)' }}>
                <span style={{ color: 'var(--gc-ink-soft)' }}>{label}
                  {cur.exceptions && Object.keys(cur.exceptions).length > 0 && (
                    <span style={{ fontSize: '9.5px', color: 'var(--gc-muted)', marginLeft: '5px' }}>
                      {Object.entries(cur.exceptions).map(([cc, vv]) => `${cc} ${fmtDv(vv)}`).join(' · ')}
                    </span>
                  )}
                </span>
                <span className="gc-mono" style={{ fontWeight: 700, color: 'var(--gc-ink)' }}>
                  {fmtDv(cur.cutoff)}
                  {nxt && <span style={{ color: 'var(--gc-muted)', fontWeight: 400 }}> → {fmtDv(nxt.cutoff)}</span>}
                </span>
              </div>
            );
          })}
          {BULLETIN_EXTRAS?.dvNext?.monthName && (
            <div style={{ fontSize: '9.5px', color: 'var(--gc-muted)', marginTop: '4px' }}>
              {lang === 'en' ? `→ = advance notification for ${BULLETIN_EXTRAS.dvNext.monthName}` : `→ 为下月（${BULLETIN_EXTRAS.dvNext.monthName}）预告`}
            </div>
          )}
        </div>
      )}

      {/* B12: statutory annual limits — INA §201/202/203 constants, cited */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-sm mt-2">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
          {lang === 'en' ? 'Why the backlog: statutory annual limits' : lang === 'tw' ? '為什麼積壓：法定年度配額' : '为什么积压：法定年度配额'}
        </div>
        {[
          ['F1', '23,400'], ['F2A/F2B', '114,200'], ['F3', '23,400'], ['F4', '65,000'],
          ['EB-1', '≈40,040'], ['EB-2', '≈40,040'], ['EB-3', '≈40,040'], ['EB-4/EB-5', lang === 'en' ? '≈9,940 each' : '各 ≈9,940'],
        ].map(([k, v]) => (
          <div key={k} className="flex items-center justify-between" style={{ fontSize: '11.5px', padding: '2px 0' }}>
            <span style={{ color: 'var(--gc-ink-soft)' }}>{k}</span>
            <span className="gc-mono" style={{ fontWeight: 600, color: 'var(--gc-ink)' }}>{v}{lang === 'en' ? '/yr' : ' 张/年'}</span>
          </div>
        ))}
        <div style={{ fontSize: '10px', color: 'var(--gc-muted)', marginTop: '5px', lineHeight: 1.6 }}>
          {lang === 'en'
            ? 'Plus a 7% per-country ceiling — that ceiling, not processing speed, is why China/India queues are long. Source: INA §201–203.'
            : lang === 'tw'
              ? '另有單一國家 7% 上限——中國/印度的長隊來自這個上限，而非審理速度。來源：INA §201–203。'
              : '另有单一国家 7% 上限——中国/印度的长队来自这个上限，而非审理速度。来源：INA §201–203。'}
        </div>
      </div>
    </div>
  );
};

const MonthlyUpdate = ({ userCase }) => {
  const { t, lang } = useLang();
  const userCountry = resolveCountry(userCase.country);
  // Which chart the whole page reads: A (finalAction) or B (filing).
  const [updChart, setUpdChart] = useState('B');
  // Which half of the category table shows — preset from the user's own case:
  // an F-case lands on 亲属类, everything else on 职业/人才类.
  const [catGroup, setCatGroup] = useState(userCase.category?.startsWith('F') ? 'family' : 'emp');
  const chartKey = updChart === 'B' ? 'filing' : 'finalAction';
  const showsTwoColumns = userCase.country === 'China' || userCase.country === 'India'; // These have separate cutoffs from ROW

  // Time machine: detect if we have previous-month data to diff against
  // (earliest month in archive has no previous reference)
  const hasPreviousData = bulletinPrevious && bulletinPrevious.finalAction && Object.keys(bulletinPrevious.finalAction).length > 0;

  // NOT useMemo. bulletinCurrent/bulletinPrevious are module objects mutated in place
  // when history.json loads (and by the Time Machine); a memo keyed on props caches the
  // seeded May-2026 numbers from the first render and never recomputes — this tab spent
  // a whole release showing "+30 days" under an August header because of exactly that.
  // The computation is 8 categories of date diffs; per-render cost is negligible.
  const changes = (() => {
    const cats = ['EB1', 'EB2', 'EB3', 'EW', 'EB4', 'SR', 'EB5', 'EB5R', 'EB5H', 'EB5I', 'F1', 'F2A', 'F2B', 'F3', 'F4'];
    const catLabels = { EB1: t.eb1, EB2: t.eb2, EB3: t.eb3, EW: t.ew, EB4: t.eb4, SR: t.sr, EB5: t.eb5, EB5R: t.eb5r, EB5H: t.eb5h, EB5I: t.eb5i, F1: t.f1, F2A: t.f2a, F2B: t.f2b, F3: t.f3, F4: t.f4 };
    if (!hasPreviousData) {
      // Return category rows but with no movement deltas
      return cats.map(c => ({
        cat: c, label: catLabels[c],
        primaryDate: bulletinCurrent[chartKey][c]?.[userCountry],
        secondaryDate: userCountry !== 'Other' ? bulletinCurrent[chartKey][c]?.Other : null,
        primary: { type: 'none', days: 0 },
        secondary: userCountry !== 'Other' ? { type: 'none', days: 0 } : null,
      }));
    }
    return cats.map(c => ({
      cat: c, label: catLabels[c],
      primaryDate: bulletinCurrent[chartKey][c]?.[userCountry],
      secondaryDate: userCountry !== 'Other' ? bulletinCurrent[chartKey][c]?.Other : null,
      primary: computeMovement(bulletinCurrent[chartKey][c]?.[userCountry], bulletinPrevious[chartKey]?.[c]?.[userCountry]),
      secondary: userCountry !== 'Other' ? computeMovement(bulletinCurrent[chartKey][c]?.Other, bulletinPrevious[chartKey]?.[c]?.Other) : null,
    }));
  })();

  const userImpact = !hasPreviousData
    ? { type: 'none', days: 0 }
    : computeMovement(bulletinCurrent[chartKey][userCase.category]?.[userCountry], bulletinPrevious[chartKey]?.[userCase.category]?.[userCountry]);

  const impactTextRaw = {
    advanced: t.impactAdvanced, retrogressed: t.impactRetrogressed, none: t.impactNoChange, current: t.impactBecameCurrent,
    unavailable: lang === 'en' ? 'Your category is unavailable this month (U) — no visas issued.' : lang === 'tw' ? '你的類別本月無名額（U）。' : '你的类别本月无名额（U）。',
    resumed: lang === 'en' ? 'Your category resumed — numbers are back.' : lang === 'tw' ? '你的類別恢復名額了。' : '你的类别恢复名额了。',
  }[userImpact.type];
  // Name the case inline — "你的类别" alone forces the reader to remember what they
  // filled in; "你的类别 中国大陆·F4" doesn't.
  const impactCaseTag = `${userCase.country === 'China' && lang !== 'en'
    ? (lang === 'tw' ? '中國大陸' : '中国大陆')
    : countryShortLabel(userCase.country, lang)}·${userCase.category}`;
  const impactText = lang === 'en'
    ? impactTextRaw.replace(/your category/i, (m) => `${m} (${impactCaseTag})`)
    : impactTextRaw.replace(/你的[类類][别別]/, (m) => `${m} ${impactCaseTag} `);
  const impactTone = {
    advanced: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    retrogressed: 'bg-red-50 text-red-900 border-red-200',
    unavailable: 'bg-red-50 text-red-900 border-red-200',
    resumed: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    none: 'bg-slate-50 text-slate-700 border-slate-200',
    current: 'bg-emerald-50 text-emerald-900 border-emerald-200',
  }[userImpact.type];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-sm">
      <div className="mb-2.5">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <h2 className="text-base font-bold text-slate-900">{t.updateTitle}</h2>
          <span className="px-2 py-0.5 bg-slate-900 text-white text-[10px] font-bold rounded-full">
            {BULLETIN_CURRENT_MONTH[lang]}
          </span>
          {/* 表B/表A toggle moved down into the category-table header, next to the
              人才/亲属 group toggle — the two selectors live together now. */}
        </div>
        <p className="text-[11px] text-slate-500">{t.updateSubtitle}</p>
      </div>
      {!hasPreviousData && (
        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl mb-2.5 flex items-start gap-2">
          <span className="text-sm flex-shrink-0"></span>
          <p className="text-[11px] text-amber-900 leading-snug">
            {lang === 'en'
              ? 'Viewing the earliest archived month — no prior-month data available to compute changes. Switch to a more recent month via the time machine.'
              : lang === 'tw'
                ? '正在查看檔案中最早的月份 — 沒有更早的資料可做月度對比。可透過時光機切換到較近月份。'
                : '正在查看档案中最早的月份 — 没有更早的数据可做月度对比。可通过时光机切换到较近月份。'}
          </p>
        </div>
      )}
      {/* The narrative summary was written for May 2026 and only shows for that month.
          The "historical view" note shows only when the Time Machine is on an OLD month
          — the latest month is not "historical", and labeling live August data that way
          read as a bug. Latest month simply shows no extra banner; the table speaks. */}
      {BULLETIN_CURRENT_MONTH.zh === '2026年5月' && DEFAULT_VIEWING_MONTH === '2026-05' ? (
        <div className="p-2.5 bg-slate-50 rounded-xl mb-2.5">
          <p className="text-[12px] text-slate-700 leading-relaxed">{t.overallSummary}</p>
        </div>
      ) : (() => {
        const [ly, lm] = DEFAULT_VIEWING_MONTH.split('-');
        const latestZh = `${ly}年${parseInt(lm, 10)}月`;
        const viewingLatest = BULLETIN_CURRENT_MONTH.zh === latestZh;
        return viewingLatest ? null : (
          <div className="p-2.5 bg-slate-50 rounded-xl mb-2.5 border border-dashed border-slate-200">
            <p className="text-[11px] text-slate-500 leading-relaxed italic">
              {lang === 'en'
                ? `Historical view of ${BULLETIN_CURRENT_MONTH.en}. See the category table below for month-over-month changes in your case.`
                : lang === 'tw'
                  ? `${BULLETIN_CURRENT_MONTH.tw} 歷史視角。月度變化詳見下方類別表格。`
                  : `${BULLETIN_CURRENT_MONTH.zh}历史视角。月度变化详见下方类别表格。`}
            </p>
          </div>
        );
      })()}
      {/* One line — the sentence already names the case, no eyebrow label needed. */}
      <div className={`p-2.5 rounded-xl border mb-2.5 flex items-center gap-2 ${impactTone}`}>
        <div className="text-[13px] font-semibold flex-1 min-w-0">{impactText}</div>
        <MovementIndicator movement={userImpact} />
      </div>
      {/* B5: this month's extremes — computed from the rows already on screen */}
      {hasPreviousData && (() => {
        const flat = [];
        changes.forEach((ch) => {
          if (ch.primary?.days) flat.push({ label: `${ch.cat}·${countryShortLabel(userCase.country, lang)}`, d: ch.primary.type === 'advanced' ? ch.primary.days : -ch.primary.days });
          if (ch.secondary?.days) flat.push({ label: `${ch.cat}·ROW`, d: ch.secondary.type === 'advanced' ? ch.secondary.days : -ch.secondary.days });
        });
        if (!flat.length) return null;
        const best = flat.reduce((a, b) => (b.d > a.d ? b : a));
        const worst = flat.reduce((a, b) => (b.d < a.d ? b : a));
        // Expected next release: mid-month per the observed 12th–22nd pattern.
        const now = new Date();
        const target = new Date(now.getFullYear(), now.getMonth() + (now.getDate() > 22 ? 1 : 0), 15);
        const daysTo = Math.max(Math.ceil((target - now) / 86400000), 0);
        return (
          <div className="p-2 bg-slate-50 rounded-xl mb-2.5" style={{ fontSize: '11px', lineHeight: 1.7 }}>
            {/* Single line: extremes + next-release countdown, separated by dots. */}
            <span style={{ color: 'var(--gc-ink-soft)' }}>
              {lang === 'en' ? 'This month: ' : '本月之最：'}
              <b style={{ color: 'var(--gc-green)' }}>{best.label} +{best.d}{lang === 'en' ? 'd' : '天'}</b>
              {worst.d < 0 && <>
                <span style={{ color: 'var(--gc-rule)' }}> · </span>
                <b style={{ color: 'var(--gc-red)' }}>{worst.label} −{Math.abs(worst.d)}{lang === 'en' ? 'd' : '天'}</b>
              </>}
              <span style={{ color: 'var(--gc-rule)' }}> · </span>
              <span style={{ color: 'var(--gc-muted)' }}>
                {lang === 'en' ? `next bulletin ~${daysTo}d` : lang === 'tw' ? `下期公告約 ${daysTo} 天後` : `下期公告约 ${daysTo} 天后`}
              </span>
            </span>
          </div>
        );
      })()}
      {/* 各类别变化：按 职业(人才)/亲属 分组显示，各组 5–10 行一屏放得下，所以
          不再折叠。分组默认跟用户自己的类别走——EB* 进来看职业组，F* 看亲属组。 */}
      <div style={{ border: '1px solid var(--gc-rule)', borderRadius: '4px', background: 'var(--gc-surface)', padding: '8px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gc-ink-soft)' }}>{t.categoryChanges}</span>
          <span className="inline-flex" style={{ marginLeft: 'auto', border: '1px solid var(--gc-rule)', borderRadius: '3px', overflow: 'hidden' }}>
            {/* B leads — same order as the summary card's stations: filing before approval. */}
            {['B', 'A'].map((c, i) => (
              <button key={c} type="button" onClick={() => setUpdChart(c)}
                className="gc-mono"
                style={{
                  fontSize: '10px', fontWeight: 700, padding: '3px 9px', lineHeight: 1.4,
                  border: 'none', cursor: 'pointer',
                  borderLeft: i === 0 ? 'none' : '1px solid var(--gc-rule-soft)',
                  background: updChart === c ? 'var(--gc-green)' : 'var(--gc-surface)',
                  color: updChart === c ? 'var(--gc-paper)' : 'var(--gc-muted)',
                }}>
                {lang === 'en' ? `Chart ${c}` : `表${c}`}
              </button>
            ))}
          </span>
          <span className="inline-flex" style={{ border: '1px solid var(--gc-rule)', borderRadius: '3px', overflow: 'hidden' }}>
            {[['emp', lang === 'en' ? 'Employment' : lang === 'tw' ? '人才類' : '人才类'],
              ['family', lang === 'en' ? 'Family' : lang === 'tw' ? '親屬類' : '亲属类']].map(([g, gl], i) => (
              <button key={g} type="button" onClick={() => setCatGroup(g)}
                style={{
                  fontSize: '10px', fontWeight: 700, padding: '3px 9px', lineHeight: 1.4,
                  border: 'none', cursor: 'pointer',
                  borderLeft: i === 0 ? 'none' : '1px solid var(--gc-rule-soft)',
                  background: catGroup === g ? 'var(--gc-green)' : 'var(--gc-surface)',
                  color: catGroup === g ? 'var(--gc-paper)' : 'var(--gc-muted)',
                }}>{gl}</button>
            ))}
          </span>
        </div>
        <div style={{ height: '8px' }} />
        {/* Faithful copy of the widely-shared 小红书 排期表 layout, in our tokens:
            numbered circle + category code on the left, FULL cutoff date as the big
            figure per country column, movement as a rounded pill under the date,
            "无需排期" rendered as a green pill in place of a date. */}
        {(() => {
          let groupChanges = changes.filter((ch) => (catGroup === 'family' ? ch.cat.startsWith('F') : !ch.cat.startsWith('F')));
          // The three EB-5 set-asides are Current in both columns almost every month —
          // three identical 无需排期 rows say nothing. Collapse them into one row and
          // only break them out again the month any of them picks up a cutoff date.
          if (catGroup === 'emp') {
            const res = ['EB5R', 'EB5H', 'EB5I'];
            const resRows = groupChanges.filter((r) => res.includes(r.cat));
            const allCurrent = resRows.length === 3 && resRows.every((r) =>
              r.primaryDate === 'C' && (r.secondaryDate === null || r.secondaryDate === 'C'));
            if (allCurrent) {
              const at = groupChanges.findIndex((r) => r.cat === 'EB5R');
              groupChanges = groupChanges.filter((r) => !res.includes(r.cat));
              groupChanges.splice(at, 0, {
                cat: 'EB5RES',
                label: lang === 'en' ? 'EB-5 set-asides (rural/high-unemp/infra)'
                  : lang === 'tw' ? 'EB-5 預留（鄉村/高失業/基建）' : 'EB-5 预留（乡村/高失业/基建）',
                primaryDate: 'C',
                secondaryDate: resRows[0].secondaryDate === null ? null : 'C',
                primary: null, secondary: null,
                mine: res.includes(userCase.category),
              });
            }
          }
          const fmtFull = (ds) => {
            const [y, m, dd] = ds.split('-').map(Number);
            return lang === 'en'
              ? new Date(y, m - 1, dd).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
              : `${y}年${m}月${dd}日`;
          };
          const P = { adv: { bg: 'var(--gc-green-soft)', fg: 'var(--gc-green-ink)' },
                      bad: { bg: 'var(--gc-red-soft)', fg: 'var(--gc-red-ink)' },
                      none: { bg: 'var(--gc-paper-soft)', fg: 'var(--gc-muted)' } };
          {/* One pill size everywhere — the oversized 无需排期 pill read wider than
              the movement pills next to it and broke the column rhythm. */}
          const Pill = ({ tone, children }) => (
            <span style={{
              display: 'inline-block', fontSize: '10.5px', fontWeight: 700,
              color: P[tone].fg, background: P[tone].bg, borderRadius: '999px',
              padding: '3px 9px', whiteSpace: 'nowrap',
            }}>{children}</span>
          );
          const mvPill = (mv) => {
            if (!mv) return null;
            const [tone, txt] = mv.type === 'advanced'
              ? ['adv', lang === 'en' ? `↑ +${mv.days}d` : `↑ 前进${mv.days}天`]
              : mv.type === 'retrogressed'
                ? ['bad', lang === 'en' ? `↓ ${mv.days ? `-${mv.days}d` : 'back'}` : `↓ 倒退${mv.days ?? ''}天`]
                : mv.type === 'unavailable'
                  ? ['bad', lang === 'en' ? 'U · no visas' : lang === 'tw' ? 'U · 不發名額' : 'U · 不发名额']
                  : mv.type === 'resumed'
                    ? ['adv', lang === 'en' ? '↑ resumed' : lang === 'tw' ? '↑ 恢復' : '↑ 恢复']
                    : ['none', lang === 'en' ? 'no change' : lang === 'tw' ? '無變化' : '无变化'];
            return <div style={{ marginTop: '4px' }}><Pill tone={tone}>{txt}</Pill></div>;
          };
          // A country cell: pill-only for Current, big full date + movement pill otherwise.
          const cell = (date, mv) => {
            if (!date) return <span style={{ fontSize: '11px', color: 'var(--gc-muted)' }}>—</span>;
            if (date === 'C') return <Pill tone="adv">{lang === 'en' ? 'Current' : lang === 'tw' ? '無需排期' : '无需排期'}</Pill>;
            if (date === 'U') return <Pill tone="bad">{lang === 'en' ? 'U · no visas' : lang === 'tw' ? 'U · 不發名額' : 'U · 不发名额'}</Pill>;
            return (
              <>
                <div style={{ fontSize: '13px', fontWeight: 800, color: 'var(--gc-ink)', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
                  {fmtFull(date)}
                </div>
                {mvPill(mv)}
              </>
            );
          };
          // "EB-1 杰出人才" → code "EB-1" big, remainder as the small line under it.
          const splitLabel = (label) => {
            const sp = label.indexOf(' ');
            return sp === -1 ? [label, ''] : [label.slice(0, sp), label.slice(sp + 1)];
          };
          const gridCols = '0.85fr 1.1fr 1.1fr';
          return (
            <div>
              {/* Header band — grey strip naming the columns once, like the shared table */}
              <div style={{
                display: 'grid', gridTemplateColumns: gridCols, alignItems: 'center',
                padding: '8px 8px', background: 'var(--gc-paper-soft)', borderRadius: '4px',
              }}>
                <div style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--gc-ink-soft)' }}>
                  {lang === 'en' ? 'Category' : lang === 'tw' ? '簽證類別' : '签证类别'}
                </div>
                <div style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--gc-ink-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                  <CountryFlag country={userCase.country} size={12} />
                  <span>{userCase.country === 'China' && lang !== 'en' ? (lang === 'tw' ? '中國大陸' : '中国大陆') : countryShortLabel(userCase.country, lang)}</span>
                </div>
                <div style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--gc-ink-soft)', textAlign: 'center' }}>
                  {lang === 'en' ? 'ROW' : lang === 'tw' ? '全球 / 港澳台' : '全球 / 港澳台'}
                </div>
              </div>
              {groupChanges.map((ch, idx) => {
                const [code, sub] = splitLabel(ch.label);
                return (
                  <div key={ch.cat} style={{
                    display: 'grid', gridTemplateColumns: gridCols, columnGap: '6px', alignItems: 'center',
                    padding: '11px 8px',
                    borderBottom: idx === groupChanges.length - 1 ? 'none' : '1px solid var(--gc-rule-soft)',
                    background: (ch.cat === userCase.category || ch.mine) ? 'var(--gc-green-soft)' : 'transparent',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
                      {/* Numbered circle — same role as the ①②③ in the shared table */}
                      <span style={{
                        width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0,
                        background: (ch.cat === userCase.category || ch.mine) ? 'var(--gc-green)' : 'var(--gc-paper-soft)',
                        border: '1px solid var(--gc-rule)',
                        color: (ch.cat === userCase.category || ch.mine) ? 'var(--gc-paper)' : 'var(--gc-ink-soft)',
                        fontSize: '10px', fontWeight: 700,
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      }}>{idx + 1}</span>
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: '14px', fontWeight: 800, color: 'var(--gc-ink)', lineHeight: 1.15, whiteSpace: 'nowrap' }}>{code}</span>
                        {sub && <span style={{ display: 'block', fontSize: '8.5px', color: 'var(--gc-muted)', lineHeight: 1.25 }}>{sub}</span>}
                      </span>
                    </div>
                    <div style={{ textAlign: 'center' }}>{cell(ch.primaryDate, ch.primary)}</div>
                    <div style={{ textAlign: 'center' }}>{ch.secondaryDate !== null ? cell(ch.secondaryDate, ch.secondary) : <span style={{ fontSize: '11px', color: 'var(--gc-muted)' }}>—</span>}</div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>


    </div>

  );
};

// ============================================================
// Forecast (Probability)
// ============================================================
const Forecast = ({ userCase }) => {
  const { t, lang } = useLang();
  // Defaults to the cautious end. The user can switch, but they have to choose to.
  const [paceBasis, setPaceBasis] = useState('conservative');
  // Not memoized: computeForecast reads the mutated-in-place BULLETIN_ARCHIVE, so a
  // memo keyed on props serves pre-history.json seed numbers forever (same trap as
  // MonthlyUpdate's changes). The hybrid simulation is a few hundred iterations — cheap.
  const forecast = computeForecast(userCase, paceBasis);
  // Switch to years past two years. The conservative basis routinely lands past the old
  // "> 60 months" ceiling, and "60+" tells the reader almost nothing.
  // Threshold matches formatMonthsCompact() in functions/api/_emailTemplates.js — the
  // monthly email renders the same figures, so the switch to years has to happen at the
  // same point or the two disagree on cases landing between 18 and 24 months.
  const durationParts = (m) => {
    if (m === null || m === undefined) return { value: '—', unit: '' };
    return m / 12 >= 1.5
      ? { value: (m / 12).toFixed(1), unit: lang === 'en' ? 'years' : '年' }
      : { value: String(Math.round(m)), unit: t.months };
  };
  const fmtDuration = (m) => {
    const p = durationParts(m);
    return p.unit ? `${p.value} ${p.unit}` : p.value;
  };
  const confLabel = { low: t.confLow, medium: t.confMed, high: t.confHigh }[forecast.confidence];
  const confTone = {
    low: 'bg-red-50 text-red-700 ring-red-200',
    medium: 'bg-amber-50 text-amber-700 ring-amber-200',
    high: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  }[forecast.confidence];

  // Token-colored meter: fill carries the outcome's color, track is a light step of
  // the same surface. Gradients were Tailwind blues/greens outside the theme system.
  const ProbBar = ({ label, value, tone }) => {
    const pct = Math.round(value * 100);
    const fill = { good: 'var(--gc-green)', neutral: 'var(--gc-blue)', bad: 'var(--gc-red)' }[tone] || 'var(--gc-muted)';
    return (
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold" style={{ color: 'var(--gc-ink-soft)' }}>{label}</span>
          <span className="text-sm font-bold gc-mono" style={{ color: fill }}>{pct}%</span>
        </div>
        <div style={{ height: '8px', background: 'var(--gc-rule-soft)', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: fill, borderRadius: '4px', transition: 'width 200ms' }}></div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-2">
      <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-sm">
        <div className="flex items-start justify-between mb-2 gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Activity size={14} className="flex-shrink-0" style={{ color: 'var(--gc-green)' }} strokeWidth={2.2} />
              <h2 className="text-base font-bold text-slate-900">{t.forecastTitle}</h2>
            </div>
            <p className="text-xs text-slate-500">{t.forecastSubtitle}</p>
          </div>
          <span className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ring-1 ${confTone}`}>
            {t.forecastConfidence}: {confLabel}
          </span>
        </div>

        {forecast.alreadyCurrent ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-600" />
              <span className="text-sm font-bold text-emerald-900">{t.currentlyCurrent}</span>
            </div>
          </div>
        ) : forecast.eligible ? (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Zap size={18} className="text-blue-600" />
              <span className="text-sm font-bold text-blue-900">{t.eligibleNow}</span>
            </div>
            <div className="text-xs text-blue-800">
              {t.avgMovement}: <span className="font-bold">+{forecast.avgMovement} {t.days}/{lang === 'en' ? 'mo' : t.months}</span>
            </div>
          </div>
        ) : (
          <>
            {/* This sub-tab is called 下月预测 — so NEXT MONTH's probabilities lead.
                The long-term ETA used to sit on top in a violet hero card, which made
                the page answer a question nobody asked it. */}
            <div className="space-y-3 mb-4">
              <ProbBar label={t.probBecomeCurrent} value={forecast.probCurrentNext} tone="good" />
              <ProbBar label={t.probAdvance} value={forecast.probAdvance} tone="neutral" />
              <ProbBar label={t.probRetrogress} value={forecast.probRetrogress} tone="bad" />
            </div>

            {/* Long-term ETA, demoted to a reference card and tokenized (was violet). */}
            <div style={{ background: 'var(--gc-paper-soft)', border: '1px solid var(--gc-rule)', borderRadius: 'var(--gc-radius)', padding: '14px' }}>
              <div className="gc-eyebrow" style={{ color: 'var(--gc-muted)', marginBottom: '4px' }}>{t.probMonths}</div>
              {/* ONE range, not a bare conservative point — a lone "9.4 年" next to the
                  summary card's linear "3.9 年" read as the site contradicting itself. */}
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black" style={{ color: 'var(--gc-ink)' }}>
                  {forecast.hasRange
                    ? `${fmtDuration(forecast.monthsFast)} – ${fmtDuration(forecast.monthsSlow)}`
                    : fmtDuration(forecast.monthsToCurrent)}
                </span>
              </div>
              <div className="mt-2 text-[11px]" style={{ color: 'var(--gc-ink-soft)' }}>
                {t.avgMovement}: <span className="font-bold">+{forecast.avgMovement} {t.days}/{lang === 'en' ? 'mo' : t.months}</span>
              </div>

              {forecast.hasRange && (
                <>
                  {/* The basis switch. Conservative is preselected; picking the optimistic
                      end is a deliberate act, and the copy under it says what that costs. */}
                  <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--gc-rule-soft)' }}>
                    <div className="gc-eyebrow" style={{ color: 'var(--gc-muted)', marginBottom: '6px' }}>{t.paceBasisLabel}</div>
                    <div className="inline-flex" style={{ border: '1px solid var(--gc-rule)', borderRadius: '3px', overflow: 'hidden' }}>
                      {[
                        { key: 'conservative', label: t.paceBasisConservative, pace: forecast.paceSlow, months: forecast.monthsSlow },
                        { key: 'recent', label: t.paceBasisRecent, pace: forecast.paceFast, months: forecast.monthsFast },
                      ].map((opt, i) => (
                        <button
                          key={opt.key}
                          onClick={() => setPaceBasis(opt.key)}
                          aria-pressed={paceBasis === opt.key}
                          className="px-2.5 py-1.5 text-[11px] font-semibold transition-colors"
                          style={{
                            border: 'none', cursor: 'pointer',
                            borderLeft: i === 0 ? 'none' : '1px solid var(--gc-rule-soft)',
                            background: paceBasis === opt.key ? 'var(--gc-ink)' : 'var(--gc-surface)',
                            color: paceBasis === opt.key ? 'var(--gc-paper)' : 'var(--gc-ink-soft)',
                          }}
                        >
                          {opt.label}
                          <span className="ml-1 gc-mono" style={{ opacity: 0.8 }}>+{opt.pace}{lang === 'en' ? 'd' : '天'}</span>
                        </button>
                      ))}
                    </div>
                    <div className="mt-2 text-[11px] leading-relaxed" style={{ color: 'var(--gc-ink-soft)' }}>
                      {paceBasis === 'recent' ? t.paceExplainRecent : t.paceExplainConservative}
                    </div>
                    <div className="mt-1 text-[10px] leading-relaxed" style={{ color: 'var(--gc-muted)' }}>{t.paceRangeNote}</div>
                  </div>
                </>
              )}

              {/* Why this number differs from the long-term chart and the summary card —
                  three estimators with different assumptions, stated once, here. */}
              <div className="mt-3 pt-2 text-[10px] leading-relaxed" style={{ borderTop: '1px solid var(--gc-rule-soft)', color: 'var(--gc-muted)' }}>
                {lang === 'en'
                  ? 'This figure blends the current month with the 21-year long-term average. The Long-term chart and the Overview summary extrapolate observed pace directly, so their numbers differ — different assumptions, same data.'
                  : lang === 'tw'
                    ? '口徑說明：此處為混合模型（當月速度＋21 年長期均值）。「長期走勢」圖與總結頁按觀測均速直線外推，數字會不同——是假設不同，不是資料錯了。'
                    : '口径说明：此处为混合模型（当月速度＋21 年长期均值）。「长期走势」图与总结页按观测均速直线外推，数字会不同——是假设不同，不是数据错了。'}
              </div>
            </div>
          </>
        )}

        <div className="mt-5 p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-start gap-2">
            <Info size={13} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-[11px] font-bold text-amber-900 mb-1">{t.forecastMethodology}</div>
              <p className="text-[11px] text-amber-800 leading-relaxed">{t.forecastMethodologyDesc}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// Data Status Checker
// ============================================================
const DataStatusChecker = () => {
  const { t, lang } = useLang();

  // Derive the "viewed bulletin month" from BULLETIN_CURRENT_MONTH (which time machine mutates).
  // Parse strings like "2026年5月" / "May 2026" / "2026年5月" -> {year, month}
  const parseViewedMonth = () => {
    const zh = BULLETIN_CURRENT_MONTH.zh; // "2026年5月"
    const m = zh && zh.match(/(\d{4})年(\d{1,2})月/);
    if (m) return { year: parseInt(m[1], 10), month: parseInt(m[2], 10) };
    return { year: 2026, month: 5 }; // fallback
  };
  const viewed = parseViewedMonth();
  // Bulletins are usually published ~15th of the month prior. So May 2026 bulletin ≈ released Apr 15.
  const bulletinDate = new Date(viewed.year, viewed.month - 2, 15);
  const today = new Date();
  const daysSinceUpdate = Math.floor((today - bulletinDate) / (1000 * 60 * 60 * 24));
  const isDataFresh = daysSinceUpdate <= 45;

  // Next update estimate: ~15th of the viewed month (when NEXT month's bulletin drops)
  const nextMonth = new Date(viewed.year, viewed.month - 1, 15);
  const nextUpdateEst = nextMonth.toLocaleDateString(lang === 'en' ? 'en-US' : 'zh-CN', {
    month: 'short',
    day: 'numeric'
  });

  return (
    <div className={`p-4 rounded-xl border-2 ${isDataFresh ?
      'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
    }`}>
      <div className="flex items-start gap-3">
        {isDataFresh ? (
          <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0 mt-0.5" />
        ) : (
          <AlertCircle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h3 className={`text-sm font-bold ${isDataFresh ? 'text-emerald-900' : 'text-amber-900'}`}>
              {t.updateStatus}
            </h3>
            <div className={`px-2 py-0.5 rounded-full text-xs font-bold ${isDataFresh ?
              'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {isDataFresh ? t.dataFresh : t.dataStale}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-slate-500 font-medium">{t.lastUpdated}</div>
              <div className={`font-bold ${isDataFresh ? 'text-emerald-800' : 'text-amber-800'}`}>
                {bulletinDate.toLocaleDateString(lang === 'en' ? 'en-US' : 'zh-CN', {
                  month: 'short',
                  day: 'numeric'
                })}
              </div>
            </div>
            <div>
              <div className="text-slate-500 font-medium">{t.nextUpdateEst}</div>
              <div className={`font-bold ${isDataFresh ? 'text-emerald-800' : 'text-amber-800'}`}>
                {nextUpdateEst}
              </div>
            </div>
          </div>

          <div className={`mt-2 text-xs ${isDataFresh ? 'text-emerald-700' : 'text-amber-700'}`}>
            {t.updateFreq}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// Data Source panel
// ============================================================
const DataSource = () => {
  const { t } = useLang();
  const items = [
    { icon: Database, label: t.dataSourceLabel, value: t.dataSourceValue },
    { icon: CheckCircle2, label: t.dataAccuracyLabel, value: t.dataAccuracyValue },
    { icon: RefreshCw, label: t.dataFrequencyLabel, value: t.dataFrequencyValue },
    { icon: Calendar, label: t.dataNextLabel, value: t.dataNextValue },
    { icon: AlertCircle, label: t.dataDisclaimerLabel, value: t.dataDisclaimerValue },
  ];
  return (
    <div className="space-y-4">
      <DataStatusChecker />
      <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-sm">
        <h2 className="text-base font-bold text-slate-900 mb-4">{t.dataTitle}</h2>
        <div className="space-y-3 mb-4">
          {items.map((it, i) => (
            <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
              <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                <it.icon size={14} className="text-slate-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">{it.label}</div>
                <div className="text-xs text-slate-700 leading-relaxed">{it.value}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <a href="https://travel.state.gov/content/travel/en/legal/visa-law0/visa-bulletin.html" target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-between gap-2 w-full p-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all">
            <span className="text-xs font-bold">{t.dataViewSource}</span>
            <ExternalLink size={13} />
          </a>
          <a href="https://www.uscis.gov/green-card/green-card-processes-and-procedures/visa-availability-priority-dates/adjustment-of-status-filing-charts-from-the-visa-bulletin" target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-between gap-2 w-full p-3 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-all">
            <span className="text-xs font-bold">{t.dataViewUSCIS}</span>
            <ExternalLink size={13} />
          </a>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// Comparison
// ============================================================
const CompareByCountry = ({ userCase }) => {
  const { t, lang } = useLang();
  const [compareCat, setCompareCat] = useState(userCase.category);
  const [comparePD, setComparePD] = useState(userCase.priorityDate);
  // Default: user's country (resolved) vs China (or India if user is China)
  const userResolved = resolveCountry(userCase.country);
  const [countryA, setCountryA] = useState(userResolved === 'China' ? 'India' : 'China');
  const [countryB, setCountryB] = useState(userResolved);

  const allCountries = [
    { v: 'Other', label: lang === 'en' ? 'Global/Taiwan' : '全球/港澳台', flag: '' },
    { v: 'China', label: lang === 'tw' ? '中國大陸' : '中国大陆', flag: '🇨🇳' },
    { v: 'India', label: lang === 'en' ? 'India' : '印度', flag: '🇮🇳' },
    { v: 'Mexico', label: lang === 'en' ? 'Mexico' : '墨西哥', flag: '🇲🇽' },
    { v: 'Philippines', label: lang === 'en' ? 'Philippines' : (lang === 'tw' ? '菲律賓' : '菲律宾'), flag: '🇵🇭' },
  ];

  const categories = [
    { v: 'EB1', label: t.eb1 }, { v: 'EB2', label: t.eb2 }, { v: 'EB3', label: t.eb3 },
    { v: 'EW', label: t.ew },
    { v: 'EB4', label: t.eb4 }, { v: 'SR', label: t.sr }, { v: 'EB5', label: t.eb5 },
    { v: 'EB5R', label: t.eb5r }, { v: 'EB5H', label: t.eb5h }, { v: 'EB5I', label: t.eb5i },
    { v: 'F1', label: t.f1 }, { v: 'F2A', label: t.f2a }, { v: 'F2B', label: t.f2b },
    { v: 'F3', label: t.f3 }, { v: 'F4', label: t.f4 },
  ];

  // Resolve country for bulletin lookup (Mexico/Philippines/Taiwan → Other)
  const resolveForLookup = (c) => (c === 'China' || c === 'India') ? c : 'Other';

  const cutoffA = bulletinCurrent.finalAction[compareCat]?.[resolveForLookup(countryA)];
  const cutoffB = bulletinCurrent.finalAction[compareCat]?.[resolveForLookup(countryB)];
  const statusA = computeStatus(comparePD, cutoffA);
  const statusB = computeStatus(comparePD, cutoffB);

  const countryALabel = allCountries.find(c => c.v === countryA)?.label || countryA;
  const countryBLabel = allCountries.find(c => c.v === countryB)?.label || countryB;
  const countryAFlag = allCountries.find(c => c.v === countryA)?.flag || '';
  const countryBFlag = allCountries.find(c => c.v === countryB)?.flag || '';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-sm">
      {/* Category & PD selectors */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div style={{ minWidth: 0 }}>
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">
            {t.compareCategory}
          </label>
          <select value={compareCat} onChange={(e) => setCompareCat(e.target.value)}
            style={{ boxSizing: 'border-box', width: '100%', maxWidth: '100%' }}
            className="px-2 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900">
            {categories.map(c => <option key={c.v} value={c.v}>{c.label}</option>)}
          </select>
        </div>
        <div style={{ minWidth: 0 }}>
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 block">
            {t.comparePD}
          </label>
          <DateDropdown value={comparePD} onChange={(v) => setComparePD(v)}
            triggerStyle={{ padding: '7px 9px', fontSize: '12px' }} />
        </div>
      </div>

      {/* Country A selector */}
      <div className="mb-2">
        <label className="gc-eyebrow block mb-1.5" style={{ fontSize: '9px' }}>
          {lang === 'en' ? 'Country A' : '国家 A'}
          <span style={{
            display: 'inline-block',
            width: '6px', height: '6px', borderRadius: '50%',
            background: 'var(--gc-ink)', marginLeft: '6px', verticalAlign: 'middle'
          }}></span>
        </label>
        <div className="grid grid-cols-5" style={{
          border: '1px solid var(--gc-rule)',
          borderRadius: '3px',
          overflow: 'hidden',
          width: '100%',
        }}>
          {allCountries.map((c, i) => {
            const selected = countryA === c.v;
            return (
              <button key={c.v} onClick={() => setCountryA(c.v)}
                style={{
                  boxSizing: 'border-box',
                  minWidth: 0,
                  padding: '6px 2px',
                  borderLeft: i === 0 ? 'none' : '1px solid var(--gc-rule-soft)',
                  background: 'var(--gc-surface)',
                  color: selected ? 'var(--gc-ink)' : 'var(--gc-ink-soft)',
                  boxShadow: selected ? 'inset 0 0 0 2px var(--gc-ink)' : 'none',
                  transition: 'all 120ms',
                }}
                className="flex flex-col items-center gap-0.5 justify-center">
                <CountryFlag country={c.v} size={14} />
                <span className="gc-mono" style={{ fontSize: '9px', fontWeight: 700, lineHeight: 1, letterSpacing: '0.08em' }}>
                  {countryShortLabel(c.v, lang)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Country B selector */}
      <div className="mb-3">
        <label className="gc-eyebrow block mb-1.5" style={{ fontSize: '9px' }}>
          {lang === 'en' ? 'Country B' : '国家 B'}
          <span style={{
            display: 'inline-block',
            width: '6px', height: '6px', borderRadius: '50%',
            background: 'var(--gc-muted)', marginLeft: '6px', verticalAlign: 'middle',
            border: '1px solid var(--gc-ink)',
          }}></span>
        </label>
        <div className="grid grid-cols-5" style={{
          border: '1px solid var(--gc-rule)',
          borderRadius: '3px',
          overflow: 'hidden',
          width: '100%',
        }}>
          {allCountries.map((c, i) => {
            const selected = countryB === c.v;
            return (
              <button key={c.v} onClick={() => setCountryB(c.v)}
                style={{
                  boxSizing: 'border-box',
                  minWidth: 0,
                  padding: '6px 2px',
                  borderLeft: i === 0 ? 'none' : '1px solid var(--gc-rule-soft)',
                  background: selected ? 'var(--gc-surface)' : 'var(--gc-surface)',
                  color: selected ? 'var(--gc-ink)' : 'var(--gc-ink-soft)',
                  boxShadow: selected ? 'inset 0 0 0 2px var(--gc-ink)' : 'none',
                  transition: 'all 120ms',
                }}
                className="flex flex-col items-center gap-0.5 justify-center">
                <CountryFlag country={c.v} size={14} />
                <span className="gc-mono" style={{ fontSize: '9px', fontWeight: 700, lineHeight: 1, letterSpacing: '0.08em' }}>
                  {countryShortLabel(c.v, lang)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {(() => {
        const pdDate = parseDate(comparePD);
        const today = new Date();
        const coA = cutoffA === 'C' ? today : parseDate(cutoffA);
        const coB = cutoffB === 'C' ? today : parseDate(cutoffB);
        const candidates = [pdDate, coA, coB, today].filter(Boolean);
        const sharedStart = new Date(Math.min(...candidates.map(d => d.getTime())));
        const sharedEnd = new Date(Math.max(...candidates.map(d => d.getTime())));
        const scale = { start: sharedStart, end: sharedEnd };

        // Calculate gap between A and B
        let gapLabel = null;
        if (cutoffA !== 'C' && cutoffB !== 'C' && cutoffA && cutoffB && coA && coB) {
          const gapDays = daysBetween(coA, coB);
          const absDays = Math.abs(gapDays);
          const gapYears = Math.floor(absDays / 365);
          const gapMonths = Math.round((absDays % 365) / 30);
          const faster = gapDays > 0 ? countryALabel : countryBLabel; // More recent = faster
          const timeStr = gapYears > 0 ? `${gapYears}年${gapMonths}月` : `${gapMonths}月`;
          gapLabel = lang === 'en'
            ? `${faster} is ~${gapYears > 0 ? gapYears + 'y ' : ''}${gapMonths}m faster`
            : `${faster} 快约 ${timeStr}`;
        } else if (cutoffA === 'C' && cutoffB !== 'C') {
          gapLabel = lang === 'en' ? `${countryALabel} is Current ✓` : `${countryALabel} 无排期 ✓`;
        } else if (cutoffB === 'C' && cutoffA !== 'C') {
          gapLabel = lang === 'en' ? `${countryBLabel} is Current ✓` : `${countryBLabel} 无排期 ✓`;
        } else if (cutoffA === 'C' && cutoffB === 'C') {
          gapLabel = lang === 'en' ? 'Both Current ✓' : '两个都无排期 ✓';
        }

        return (
          <div className="space-y-2">
            {gapLabel && (
              <div className="flex items-center gap-1.5 text-xs font-semibold w-fit" style={{
                padding: '5px 10px',
                background: 'var(--gc-paper-soft)',
                color: 'var(--gc-ink-soft)',
                border: '1px solid var(--gc-rule)',
                borderRadius: '3px',
              }}>
                <TrendingUp size={11} strokeWidth={2} />{gapLabel}
              </div>
            )}

            {/* Country A card — neutral surface, left accent strip for identity */}
            <div style={{
              padding: '12px',
              background: 'var(--gc-paper-soft)',
              border: '1px solid var(--gc-rule)',
              borderLeft: '3px solid var(--gc-ink)',
              borderRadius: '3px',
            }}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex items-center gap-1.5 flex-shrink-0" style={{
                    padding: '3px 8px',
                    background: 'var(--gc-ink)',
                    borderRadius: '3px',
                  }}>
                    <CountryFlag country={countryA} size={11} />
                    <span className="gc-mono" style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gc-paper)', letterSpacing: '0.06em' }}>
                      {countryShortLabel(countryA, lang)}
                    </span>
                  </div>
                  <div className="text-sm font-bold" style={{ color: 'var(--gc-ink)' }}>{countryALabel}</div>
                </div>
                <StatusBadge status={statusA.status} />
              </div>
              {/* Combined date + gap status (same line) */}
              <div className="flex items-center justify-between gap-2 mb-1 text-xs">
                <div className="text-slate-600 min-w-0 truncate">
                  {t.chartFinalAction}: <span className="font-semibold text-slate-900">{formatDate(cutoffA, lang)}</span>
                </div>
                {cutoffA !== 'C' && (() => {
                  const pdD = parseDate(comparePD);
                  const coD = parseDate(cutoffA);
                  if (!pdD || !coD) return null;
                  const reachedA = pdD <= coD;
                  // When reached, the top-right StatusBadge already says "可以递件".
                  // Only show the inline indicator when user still needs to wait.
                  if (reachedA) return null;
                  const daysA = daysBetween(pdD, coD);
                  const monthsA = Math.ceil(daysA / 30);
                  return (
                    <span className="flex items-center gap-0.5 text-amber-700 font-semibold flex-shrink-0 text-[11px]">
                      <Clock size={11} strokeWidth={2.5} />
                      {lang === 'en' ? `${daysA.toLocaleString('en-US')}d (~${monthsA}m)` : `还差${daysA.toLocaleString('en-US')}天(${monthsA}月)`}
                    </span>
                  );
                })()}
              </div>
              {/* Progress timeline — skip when PD already reached, since positions collapse
                  and labels/dots cluster confusingly. StatusBadge covers the "eligible" message. */}
              {(() => {
                const pdD = parseDate(comparePD);
                const coD = cutoffA === 'C' ? new Date() : parseDate(cutoffA);
                const reached = cutoffA === 'C' || (pdD && coD && pdD <= coD);
                if (reached) return null;
                return <ProgressTimeline priorityDate={comparePD} cutoff={cutoffA} chartLabel="" sharedScale={scale} hideStatus={true} />;
              })()}
            </div>

            {/* Country B card — neutral surface, muted left accent (distinct from A's solid strip) */}
            <div style={{
              padding: '12px',
              background: 'var(--gc-paper-soft)',
              border: '1px solid var(--gc-rule)',
              borderLeft: '3px double var(--gc-muted)',
              borderRadius: '3px',
            }}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex items-center gap-1.5 flex-shrink-0" style={{
                    padding: '3px 8px',
                    background: 'var(--gc-surface)',
                    border: '1px solid var(--gc-ink)',
                    borderRadius: '3px',
                  }}>
                    <CountryFlag country={countryB} size={11} />
                    <span className="gc-mono" style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gc-ink)', letterSpacing: '0.06em' }}>
                      {countryShortLabel(countryB, lang)}
                    </span>
                  </div>
                  <div className="text-sm font-bold" style={{ color: 'var(--gc-ink)' }}>{countryBLabel}</div>
                </div>
                <StatusBadge status={statusB.status} />
              </div>
              {/* Combined date + gap status (same line) */}
              <div className="flex items-center justify-between gap-2 mb-1 text-xs">
                <div className="text-slate-600 min-w-0 truncate">
                  {t.chartFinalAction}: <span className="font-semibold text-slate-900">{formatDate(cutoffB, lang)}</span>
                </div>
                {cutoffB !== 'C' && (() => {
                  const pdD = parseDate(comparePD);
                  const coD = parseDate(cutoffB);
                  if (!pdD || !coD) return null;
                  const reachedB = pdD <= coD;
                  if (reachedB) return null;
                  const daysB = daysBetween(pdD, coD);
                  const monthsB = Math.ceil(daysB / 30);
                  return (
                    <span className="flex items-center gap-0.5 text-amber-700 font-semibold flex-shrink-0 text-[11px]">
                      <Clock size={11} strokeWidth={2.5} />
                      {lang === 'en' ? `${daysB.toLocaleString('en-US')}d (~${monthsB}m)` : `还差${daysB.toLocaleString('en-US')}天(${monthsB}月)`}
                    </span>
                  );
                })()}
              </div>
              {(() => {
                const pdD = parseDate(comparePD);
                const coD = cutoffB === 'C' ? new Date() : parseDate(cutoffB);
                const reached = cutoffB === 'C' || (pdD && coD && pdD <= coD);
                if (reached) return null;
                return <ProgressTimeline priorityDate={comparePD} cutoff={cutoffB} chartLabel="" sharedScale={scale} hideStatus={true} />;
              })()}
            </div>
          </div>
        );
      })()}

      <div className="mt-2.5 p-2.5 bg-amber-50 border border-amber-200 rounded-xl">
        <div className="flex items-start gap-2">
          <AlertCircle size={13} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-[11px] font-bold text-amber-900 mb-0.5">
              {lang === 'en' ? 'Why this matters' : '为什么这个重要'}
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              {lang === 'en'
                ? 'Your country of birth (not citizenship) determines which priority date applies. Cross-chargeability rules may allow spouse\'s country to be used.'
                : '你的出生国（不是国籍）决定了你用哪个排期。通过配偶国籍有时可以使用"交叉归属"规则。'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// Which signup-time fields this case is still missing. There are three subscribe
// entry points (SmartAlerts, InlineSubscribeCTA, SubscribeModal) and only the modal
// ever asked for these — the other two POSTed userCase raw, so anyone arriving on a
// ?c=&ct=&pd= link (which skips onboarding entirely, see parseUserCaseFromURL) could
// subscribe with no birth month at all. 2026-08-15: 1 of 82 records had one.
// Single source of truth so the three paths can't drift apart again.
// ============================================================
const caseIntakeGaps = (uc) => ({
  needsSubtype: !!CATEGORY_SUBTYPES[uc?.category] && !uc?.subtype,
  needsBirth: !uc?.birthYearMonth,
});
const caseNeedsIntake = (uc) => {
  const g = caseIntakeGaps(uc);
  return g.needsSubtype || g.needsBirth;
};
// Hand off to SubscribeModal (which owns the subtype/birth pickers) instead of
// POSTing an incomplete case. Carries the address already typed so the visitor
// doesn't retype it — the modal is one more tap, not a restart.
const openSubscribeModal = (prefillEmail = '') => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('gc-open-subscribe', { detail: { email: prefillEmail } }));
};

// ============================================================
// Smart Alerts Component
// ============================================================
const SmartAlerts = ({ userCase, setUserCase = () => {}, setTab = () => {}, greenCardInfo = { approvalDate: null, isConditional: false } }) => {
  const [showCaseEdit, setShowCaseEdit] = useState(false);
  const [showConfirmPrompt, setShowConfirmPrompt] = useState(false);
  const { t, lang } = useLang();
  const [alerts, setAlerts] = useState({
    whenCurrent: false,
    whenEligible: false,
    monthlyUpdates: true,
    retrogression: false,
    i751Window: true,        // remind when I-751 window is ~30 days away
    n400Eligible: true,      // remind when N-400 eligibility is ~30 days away
  });

  // Hydrate from the same persisted flag useSubscribed() reads elsewhere — otherwise a
  // returning subscriber (new session, isSubscribed reset to false) sees the signup form
  // again instead of their saved state, and the case/alert sync effect below never arms.
  const [email, setEmail] = useState(() => {
    try { return window.localStorage.getItem('gc_subscribedEmail') || ''; } catch { return ''; }
  });
  const [emailStatus, setEmailStatus] = useState(''); // 'success' | 'updated' | 'error' | 'invalid' | 'loading'
  const [isSubscribed, setIsSubscribed] = useState(() => {
    try { return !!window.localStorage.getItem('gc_subscribedEmail'); } catch { return false; }
  });
  // "Already a subscriber? Update here" — for a browser/device with no local
  // gc_subscribedEmail flag (private window, different device, cleared storage).
  // Doesn't change what gets submitted (same email+userCase POST works either way,
  // /api/subscribe already upserts by email) — purely changes the copy so someone
  // who IS already subscribed isn't afraid re-submitting will duplicate them.
  const [updateMode, setUpdateMode] = useState(false);

  const toggleAlert = (key) => {
    setAlerts(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // ---- Email subscription API endpoint ----
  // Default: /api/subscribe (Cloudflare Pages Function, same domain, no CORS).
  // If using a standalone Worker instead, replace with full URL:
  //   const SUBSCRIBE_API = 'https://greencard-api.YOUR_ACCOUNT.workers.dev/subscribe';
  const SUBSCRIBE_API = `${API_BASE}/api/subscribe`;

  const handleSubscribe = async () => {
    if (!validateEmail(email)) {
      setEmailStatus('invalid');
      setTimeout(() => setEmailStatus(''), 3000);
      return;
    }

    // This form has no subtype/birth pickers of its own. Rather than silently
    // writing a record missing them, hand the visitor to SubscribeModal, which does.
    // updateMode is no exception: an existing subscriber whose stored case predates
    // these fields is exactly who we need them from.
    if (caseNeedsIntake(userCase)) {
      openSubscribeModal(email.trim().toLowerCase());
      return;
    }

    setEmailStatus('loading');

    try {
      const response = await fetch(SUBSCRIBE_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          userCase: userCase,
          alerts: alerts,
          language: lang,
        }),
      });

      const result = await response.json().catch(() => ({ success: false }));

      if (response.ok && result.success) {
        setIsSubscribed(true);
        // Every other entry point keys off this to never bother an existing subscriber.
        // Also what makes this browser recognize itself as subscribed going forward —
        // the whole point of the "already a subscriber? update here" path below.
        try { window.localStorage.setItem('gc_subscribedEmail', email.trim().toLowerCase()); } catch {}
        announceSubscribed();
        if (result.confirmed) {
          // Re-submitting the email of an already-confirmed subscriber (the "update
          // my subscription" path, e.g. from a browser/device with no local flag) —
          // server upserted the record, no confirmation mail was sent because none
          // was needed. Showing the "check your inbox" prompt here would be a lie.
          setEmailStatus('updated');
          setTimeout(() => setEmailStatus(''), 3000);
        } else {
          setEmailStatus('success');
          setShowConfirmPrompt(true); // 双重确认漏斗的洞：明确告诉用户还差一步
          setTimeout(() => setEmailStatus(''), 3000);
        }
      } else {
        console.error('Subscription failed:', result.error || response.statusText);
        setEmailStatus('error');
        setTimeout(() => setEmailStatus(''), 3000);
      }
    } catch (error) {
      console.error('Subscription error:', error);
      setEmailStatus('error');
      setTimeout(() => setEmailStatus(''), 3000);
    }
  };

  // Persist alert toggles AND case edits (category/PD/country/subtype/...) made AFTER
  // subscribing. handleSubscribe is the only other place that POSTs and it fires solely
  // from the subscribe button, so before this every post-subscribe change to alerts or
  // to userCase only touched local state and was never sent — editing your case on the
  // case card silently drifted away from what the server had on file for your emails.
  // Debounced so several changes in a row are one request, which also keeps well clear
  // of the per-IP rate limit on /api/subscribe.
  const skipAlertSync = useRef(true);
  const [syncToast, setSyncToast] = useState(false);
  useEffect(() => {
    // Not subscribed (or no usable address) — nothing to sync. Re-arm the skip so the
    // first change after a future subscribe doesn't fire a redundant duplicate of the
    // POST that handleSubscribe just made.
    if (!isSubscribed || !validateEmail(email)) {
      skipAlertSync.current = true;
      return;
    }
    if (skipAlertSync.current) {
      skipAlertSync.current = false;
      return;
    }
    const timer = setTimeout(() => {
      fetch(SUBSCRIBE_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          userCase,
          alerts,
          language: lang,
        }),
      })
        .then((resp) => {
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          // Silent sync otherwise gives no sign the case edit actually reached the
          // subscription — a brief toast is the only feedback this flow gets.
          setSyncToast(true);
          setTimeout(() => setSyncToast(false), 3000);
        })
        .catch((err) => console.error('Case/alert preference sync failed:', err));
    }, 800);
    return () => clearTimeout(timer);
  }, [alerts, userCase, isSubscribed]);

  const handleUnsubscribe = async () => {
    // Fire-and-forget unsubscribe (user stays unsubscribed in UI regardless of API result)
    if (email) {
      try {
        await fetch(`${SUBSCRIBE_API}?email=${encodeURIComponent(email.trim().toLowerCase())}`, {
          method: 'DELETE',
        });
      } catch (e) {
        console.error('Unsubscribe error:', e);
      }
    }
    setIsSubscribed(false);
    setEmail('');
    setEmailStatus('');
  };

  const alertItems = [
    { key: 'whenCurrent', icon: Target, label: t.alertWhenCurrent },
    { key: 'whenEligible', icon: FileText, label: t.alertWhenEligible },
    { key: 'monthlyUpdates', icon: Calendar, label: t.alertMonthlyUpdates },
    { key: 'retrogression', icon: TrendingDown, label: t.alertRetrogression },
    // Green-card-holder reminders — only show if user has approvalDate set
    // (means they've completed I-485 and we're tracking their post-GC lifecycle)
    ...(greenCardInfo.approvalDate && greenCardInfo.isConditional ? [
      { key: 'i751Window', icon: Shield, label: lang === 'en'
          ? 'I-751 filing window opens (removes conditions)'
          : lang === 'tw' ? 'I-751 申請窗口開啟(解除條件)' : 'I-751 申请窗口开启(解除条件)'
      },
    ] : []),
    ...(greenCardInfo.approvalDate ? [
      { key: 'n400Eligible', icon: CheckCircle2, label: lang === 'en'
          ? 'N-400 citizenship eligibility'
          : lang === 'tw' ? 'N-400 入籍資格到期' : 'N-400 入籍资格到期'
      },
    ] : []),
  ];

  return (
    <div className="space-y-2">
      {/* Sync toast — the case/alert sync above is otherwise silent, so an edit made
          on the persistent case bar while already subscribed gives no sign it actually
          reached the subscription record. Auto-dismisses; doesn't block anything. */}
      {syncToast && (
        <div style={{
          position: 'fixed', left: '50%', bottom: '24px', transform: 'translateX(-50%)',
          zIndex: 1100, display: 'flex', alignItems: 'center', gap: '7px',
          background: 'var(--gc-green)', color: 'var(--gc-paper)',
          padding: '9px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
          boxShadow: '0 8px 24px rgba(0,0,0,0.25)', whiteSpace: 'nowrap',
        }}>
          <CheckCircle2 size={14} />
          {lang === 'en' ? 'Synced — your email updates now use this case'
            : lang === 'tw' ? '已同步 — 郵件更新已改用這個案子'
            : '已同步 — 邮件更新已改用这个案子'}
        </div>
      )}

      {/* Alert Preferences — ABOVE the subscribe form. When it sat below, an
          unsubscribed visitor had the whole form between them and the toggles,
          which read as "these appear only after you subscribe". */}
      <div style={{
        background: 'var(--gc-surface)',
        border: '1px solid var(--gc-rule)',
        borderRadius: '4px',
        padding: '12px 14px',
      }}>
        <div style={{ marginBottom: '12px' }}>
          <div className="flex items-center gap-2" style={{ marginBottom: '3px' }}>
            <Bell size={14} strokeWidth={2} style={{ color: 'var(--gc-ink-soft)' }} />
            <div className="gc-eyebrow" style={{ color: 'var(--gc-muted)' }}>
              {t.alerts}
            </div>
          </div>
          <h3 className="gc-serif" style={{
            fontSize: '16px', fontWeight: 700, color: 'var(--gc-ink)',
            margin: '0 0 3px', letterSpacing: '-0.005em',
          }}>
            {lang === 'en' ? 'Smart reminders' : lang === 'tw' ? '智能提醒' : '智能提醒'}
          </h3>
          <p style={{
            fontSize: '11px', color: 'var(--gc-muted)', margin: 0, lineHeight: 1.45,
          }}>
            {t.alertSubtitle}
          </p>
        </div>

        <div className="space-y-2">
          {alertItems.map(item => (
            <div key={item.key} className="flex items-center justify-between" style={{
              padding: '10px 12px',
              background: 'var(--gc-paper-soft)',
              border: '1px solid var(--gc-rule)',
              borderRadius: '3px',
            }}>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center flex-shrink-0" style={{
                  width: '28px', height: '28px',
                  background: 'var(--gc-surface)',
                  border: '1px solid var(--gc-rule)',
                  borderRadius: '3px',
                }}>
                  <item.icon size={13} strokeWidth={2} style={{ color: 'var(--gc-ink-soft)' }} />
                </div>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--gc-ink)' }}>{item.label}</span>
              </div>
              <button onClick={() => toggleAlert(item.key)}
                className="relative transition-all duration-200"
                style={{
                  width: '40px', height: '22px',
                  borderRadius: '11px',
                  background: alerts[item.key] ? 'var(--gc-green)' : 'var(--gc-rule)',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}>
                <div className="absolute transition-transform duration-200" style={{
                  width: '18px', height: '18px',
                  background: 'var(--gc-paper)',
                  borderRadius: '50%',
                  top: '2px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                  transform: alerts[item.key] ? 'translateX(20px)' : 'translateX(2px)',
                }}></div>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Email Subscription Section — editorial style (paper/ink/rule, no blue) */}
      <div style={{
        background: 'var(--gc-surface)',
        border: '1px solid var(--gc-rule)',
        borderLeft: '2px solid var(--gc-green)',
        borderRadius: '4px',
        padding: '12px 14px',
      }}>
        <div className="flex items-center gap-2" style={{ marginBottom: '8px' }}>
          <Mail size={14} strokeWidth={2} style={{ color: 'var(--gc-green)' }} />
          <div className="gc-eyebrow" style={{ color: 'var(--gc-green)' }}>
            {t.emailSubscription}
          </div>
        </div>

        <h3 className="gc-serif" style={{
          fontSize: '16px', fontWeight: 700, color: 'var(--gc-ink)',
          margin: '0 0 3px', letterSpacing: '-0.005em',
        }}>
          {t.emailTitle}
        </h3>
        <p style={{
          fontSize: '11px', color: 'var(--gc-muted)', margin: '0 0 10px', lineHeight: 1.45,
        }}>
          {t.emailSubtitle}
        </p>

        {!isSubscribed ? (
          <div className="space-y-2.5">
            {/* 案子摘要预览 */}
            <div style={{
              padding: '9px 11px',
              background: 'var(--gc-paper-soft)',
              border: '1px solid var(--gc-rule)',
              borderRadius: '3px',
            }}>
              <div className="flex items-center justify-between mb-1">
                <span className="gc-eyebrow" style={{
                  fontSize: '8px', color: 'var(--gc-muted)', letterSpacing: '0.14em',
                }}>
                  {lang === 'en' ? 'Subscription based on' : lang === 'tw' ? '訂閱將基於' : '订阅将基于'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowCaseEdit(true)}
                  className="flex items-center gap-0.5 flex-shrink-0"
                  style={{
                    fontSize: '10px', fontWeight: 700,
                    color: 'var(--gc-green-ink)',
                    background: 'transparent', border: 'none', padding: 0,
                    cursor: 'pointer', letterSpacing: '0.02em',
                  }}>
                  {lang === 'en' ? 'Edit →' : lang === 'tw' ? '修改 →' : '修改 →'}
                </button>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap leading-snug" style={{ fontSize: '11px', color: 'var(--gc-ink-soft)' }}>
                <span className="gc-mono" style={{ fontWeight: 700, color: 'var(--gc-ink)' }}>{userCase.category}</span>
                <span style={{ color: 'var(--gc-rule)' }}>·</span>
                <span>
                  {userCase.country === 'China' ? (lang === 'tw' ? '中國大陸' : '中国大陆') :
                   userCase.country === 'Taiwan' ? (lang === 'en' ? 'Global/Taiwan HK Macao' : '全球/港澳台') :
                   userCase.country === 'India' ? (lang === 'en' ? 'India' : '印度') :
                   userCase.country === 'Mexico' ? (lang === 'en' ? 'Mexico' : '墨西哥') :
                   userCase.country === 'Philippines' ? (lang === 'en' ? 'Philippines' : lang === 'tw' ? '菲律賓' : '菲律宾') :
                   userCase.country}
                </span>
                <span style={{ color: 'var(--gc-rule)' }}>·</span>
                <span className="gc-mono">{formatDate(userCase.priorityDate, lang)}</span>
                <span style={{ color: 'var(--gc-rule)' }}>·</span>
                <span style={{ color: 'var(--gc-muted)' }}>
                  {userCase.inUS
                    ? (lang === 'en' ? 'In US' : lang === 'tw' ? '在美國' : '在美国')
                    : (lang === 'en' ? 'Abroad' : lang === 'tw' ? '境外' : '境外')}
                </span>
                {(userCase.category === 'F1' || userCase.category === 'F2A' || userCase.category === 'F2B' || userCase.category === 'F3' || userCase.category === 'F4') && userCase.petitionerStatus && (
                  <>
                    <span style={{ color: 'var(--gc-rule)' }}>·</span>
                    <span style={{ color: 'var(--gc-muted)' }}>
                      {userCase.petitionerStatus === 'USC'
                        ? (lang === 'en' ? 'USC petitioner' : lang === 'tw' ? '公民擔保' : '公民担保')
                        : (lang === 'en' ? 'LPR petitioner' : lang === 'tw' ? '綠卡擔保' : '绿卡担保')}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* 邮箱 + 订阅按钮 */}
            <div>
              <div className="flex items-center justify-between" style={{ marginBottom: '4px' }}>
                <label className="gc-eyebrow" style={{
                  fontSize: '8px', color: 'var(--gc-muted)', letterSpacing: '0.14em',
                }}>
                  {lang === 'en' ? 'Email' : lang === 'tw' ? '郵箱' : '邮箱'}
                </label>
                <button type="button" onClick={() => setUpdateMode((v) => !v)}
                  style={{
                    fontSize: '10.5px', color: 'var(--gc-green-ink)', fontWeight: 600,
                    background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
                  }}>
                  {updateMode
                    ? (lang === 'en' ? '← New signup instead' : lang === 'tw' ? '← 改成新訂閱' : '← 改成新订阅')
                    : (lang === 'en' ? 'Already subscribed? Update here' : lang === 'tw' ? '已經訂閱過？點此更改訂閱' : '已经订阅过？点此更改订阅')}
                </button>
              </div>
              {updateMode && (
                <div style={{
                  fontSize: '10.5px', color: 'var(--gc-muted)', lineHeight: 1.5,
                  marginBottom: '6px', padding: '6px 8px',
                  background: 'var(--gc-paper-soft)', border: '1px solid var(--gc-rule-soft)', borderRadius: '3px',
                }}>
                  {lang === 'en'
                    ? 'Enter the email you subscribed with. Submitting updates your existing subscription with the case above — it won\'t create a duplicate.'
                    : lang === 'tw'
                      ? '填你訂閱時用的郵箱。提交後會用上面這個案子更新你現有的訂閱，不會重複訂閱。'
                      : '填你订阅时用的邮箱。提交后会用上面这个案子更新你现有的订阅，不会重复订阅。'}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.emailPlaceholder}
                  className="flex-1 min-w-0"
                  style={{
                    padding: '8px 10px',
                    fontSize: '13px',
                    background: 'var(--gc-paper)',
                    border: '1px solid var(--gc-rule)',
                    borderRadius: '3px',
                    color: 'var(--gc-ink)',
                    outline: 'none',
                    transition: 'border-color 120ms',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--gc-green)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--gc-rule)'; }}
                  disabled={emailStatus === 'loading'}
                />
                <button
                  onClick={handleSubscribe}
                  disabled={emailStatus === 'loading' || !email}
                  className="flex-shrink-0"
                  style={{
                    padding: '8px 16px',
                    fontSize: '12px',
                    fontWeight: 700,
                    background: (emailStatus === 'loading' || !email) ? 'var(--gc-muted)' : 'var(--gc-green)',
                    color: 'var(--gc-paper)',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: (emailStatus === 'loading' || !email) ? 'not-allowed' : 'pointer',
                    opacity: (emailStatus === 'loading' || !email) ? 0.5 : 1,
                    letterSpacing: '0.02em',
                    transition: 'all 120ms',
                  }}>
                  {emailStatus === 'loading' ? '...' : updateMode
                    ? (lang === 'en' ? 'Update' : lang === 'tw' ? '更新訂閱' : '更新订阅')
                    : t.emailSubscribe}
                </button>
              </div>
            </div>

            {emailStatus === 'updated' && (
              <div className="flex items-center gap-2" style={{
                fontSize: '12px', color: 'var(--gc-green-ink)',
                background: 'var(--gc-green-soft)',
                padding: '8px 12px', borderRadius: '3px',
                border: '1px solid var(--gc-green-border)',
              }}>
                <CheckCircle2 size={14} />
                {lang === 'en' ? 'Subscription updated — future emails use this case.'
                  : lang === 'tw' ? '訂閱已更新 — 之後的郵件會用這個案子。'
                  : '订阅已更新 — 之后的邮件会用这个案子。'}
              </div>
            )}

            {emailStatus === 'success' && (
              <div className="flex items-center gap-2" style={{
                fontSize: '12px', color: 'var(--gc-green-ink)',
                background: 'var(--gc-green-soft)',
                padding: '8px 12px', borderRadius: '3px',
                border: '1px solid var(--gc-green-border)',
              }}>
                <CheckCircle2 size={14} />
                {t.emailSuccess}
              </div>
            )}

            {emailStatus === 'error' && (
              <div className="flex items-center gap-2" style={{
                fontSize: '12px', color: '#991b1b',
                background: 'rgba(138,24,24,0.06)',
                padding: '8px 12px', borderRadius: '3px',
                border: '1px solid rgba(138,24,24,0.2)',
              }}>
                <AlertCircle size={14} />
                {t.emailError}
              </div>
            )}

            {emailStatus === 'invalid' && (
              <div className="flex items-center gap-2" style={{
                fontSize: '12px', color: 'var(--gc-amber-ink)',
                background: 'var(--gc-amber-soft)',
                padding: '8px 12px', borderRadius: '3px',
                border: '1px solid var(--gc-amber-border)',
              }}>
                <AlertCircle size={14} />
                {t.emailInvalid}
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between" style={{
              padding: '10px 12px',
              background: 'var(--gc-green-soft)',
              border: '1px solid var(--gc-green-border)',
              borderRadius: '3px',
            }}>
              <div className="flex items-center gap-2 min-w-0 flex-1" style={{ color: 'var(--gc-green-ink)' }}>
                <CheckCircle2 size={14} className="flex-shrink-0" />
                <span style={{ fontSize: '12px', fontWeight: 600 }} className="truncate">{email}</span>
              </div>
              <button
                onClick={handleUnsubscribe}
                className="flex-shrink-0"
                style={{
                  padding: '4px 10px',
                  fontSize: '10px',
                  fontWeight: 700,
                  color: 'var(--gc-green-ink)',
                  background: 'transparent',
                  border: '1px solid var(--gc-green-border)',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  letterSpacing: '0.04em',
                }}>
                {t.emailUnsubscribe}
              </button>
            </div>
          </div>
        )}

        <div style={{
          marginTop: '10px',
          fontSize: '10px',
          color: 'var(--gc-muted)',
          lineHeight: 1.45,
        }}>
          {t.emailPrivacy}
        </div>
      </div>

    
      {/* Post-subscribe prompt — subscription is NOT live until the confirmation
          link is clicked; two of the first four real signups stalled exactly here. */}
      {showConfirmPrompt && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'rgba(15,20,25,0.55)' }}
             onClick={() => setShowConfirmPrompt(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: 'var(--gc-surface)', border: '1px solid var(--gc-rule)', borderTop: '3px solid var(--gc-green)',
            borderRadius: '6px', maxWidth: '340px', width: '100%', padding: '20px 18px 16px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)', textAlign: 'center',
          }}>
            <Mail size={28} strokeWidth={1.8} style={{ color: 'var(--gc-green)', margin: '0 auto 10px' }} />
            <div className="gc-serif" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--gc-ink)', marginBottom: '8px' }}>
              {lang === 'en' ? 'One more step' : lang === 'tw' ? '還差一步' : '还差一步'}
            </div>
            <div style={{ fontSize: '13px', lineHeight: 1.7, color: 'var(--gc-ink-soft)', textAlign: 'left' }}>
              {lang === 'en'
                ? <>A confirmation email was sent to <b>{email}</b>. Your subscription is NOT active until you click the link inside.</>
                : lang === 'tw'
                  ? <>確認郵件已發送到 <b>{email}</b>。<b>點擊郵件裡的確認連結後，訂閱才會生效。</b></>
                  : <>确认邮件已发送到 <b>{email}</b>。<b>点开邮件里的确认链接后，订阅才会生效。</b></>}
            </div>
            <div style={{ fontSize: '12px', lineHeight: 1.7, color: 'var(--gc-muted)', marginTop: '8px', textAlign: 'left', background: 'var(--gc-paper-soft)', border: '1px solid var(--gc-rule-soft)', borderRadius: '3px', padding: '8px 10px' }}>
              {lang === 'en'
                ? 'Can\'t find it? Check your spam/junk folder and add the sender to your contacts.'
                : lang === 'tw'
                  ? '沒看到？請檢查垃圾郵件匣，並把發件人加入通訊錄，以免之後的月度更新被攔截。'
                  : '没看到？请检查垃圾邮件，并把发件人加入通讯录，以免之后的月度更新被拦截。'}
            </div>
            <button type="button" onClick={() => setShowConfirmPrompt(false)}
              style={{
                width: '100%', marginTop: '12px', padding: '10px', fontSize: '13px', fontWeight: 700,
                background: 'var(--gc-green)', color: 'var(--gc-paper)', border: 'none',
                borderRadius: '4px', cursor: 'pointer',
              }}>
              {lang === 'en' ? 'Got it — off to my inbox' : lang === 'tw' ? '知道了，這就去點' : '知道了，这就去点'}
            </button>
          </div>
        </div>
      )}

      {/* Case-edit modal — the old Edit button dumped users back on the Overview tab;
          now the same segmented editor opens in place, pre-expanded. */}
      {showCaseEdit && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '48px 16px', background: 'rgba(15,20,25,0.55)' }}
             onClick={() => setShowCaseEdit(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '480px' }}>
            <CompactCaseBar userCase={userCase} setUserCase={setUserCase} defaultExpanded />
            <button type="button" onClick={() => setShowCaseEdit(false)}
              style={{
                width: '100%', marginTop: '8px', padding: '10px', fontSize: '13px', fontWeight: 700,
                background: 'var(--gc-green)', color: 'var(--gc-paper)', border: 'none',
                borderRadius: '4px', cursor: 'pointer',
              }}>
              {lang === 'en' ? 'Done' : lang === 'tw' ? '完成' : '完成'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// Comparison — By-country view (the "By Priority Date" variant was removed)
// ============================================================
// ============================================================
// CompareHub — the "What if" page. Three scenarios that answer real decisions:
// spouse's birth country (cross-chargeability), category change (naturalization /
// EB downgrade), and free comparison (the original tool). Verdict sentence first,
// timelines as evidence — same language as the Overview card.
// ============================================================
// Tone → chip/fill colors. Kept to 3 tones (matches the rest of the app's
// status vocabulary): green = better, red = worse, ink = wash (neutral/minor).
const CH_TONE = {
  'var(--gc-green)': { soft: 'var(--gc-green-soft)', border: 'var(--gc-green-border)' },
  'var(--gc-red)': { soft: 'var(--gc-red-soft)', border: 'var(--gc-red-border)' },
  'var(--gc-ink)': { soft: 'var(--gc-paper-soft)', border: 'var(--gc-rule)' },
};

// One row of the two-row compare: a real duration is a proportional bar; an
// already-current state isn't a point on that duration scale at all (it's a
// categorical "done"), so it gets a solid filled bar with a checkmark instead
// of being squashed into a barely-visible sliver at the "now" end.
const CompareBarRow = ({ label, r, color, zMin, zMax, lang }) => {
  if (r.now) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ fontSize: '10px', color: 'var(--gc-muted)', width: '68px', flexShrink: 0, textAlign: 'right', lineHeight: 1.3 }}>{label}</div>
        <div style={{ flex: 1, height: '16px', borderRadius: '0 4px 4px 0', background: color, display: 'flex', alignItems: 'center', gap: '5px', paddingLeft: '8px' }}>
          <CheckCircle2 size={11} style={{ color: '#fff' }} strokeWidth={2.2} />
          <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#fff', letterSpacing: '0.01em' }}>
            {lang === 'en' ? 'Available now' : '现在就可推进'}
          </span>
        </div>
      </div>
    );
  }
  if (r.unavailable || r.months == null) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ fontSize: '10px', color: 'var(--gc-muted)', width: '68px', flexShrink: 0, textAlign: 'right' }}>{label}</div>
        <div style={{ fontSize: '11px', color: 'var(--gc-muted)' }}>{lang === 'en' ? 'No visas this month (U)' : '本月无名额（U）'}</div>
      </div>
    );
  }
  const pct = Math.max(((r.months - zMin) / (zMax - zMin || 1)) * 100, 3);
  const fmtEta = r.months / 12 >= 1.5 ? (lang === 'en' ? `~${(r.months / 12).toFixed(1)} yrs` : `约 ${(r.months / 12).toFixed(1)} 年`)
    : (lang === 'en' ? `~${Math.max(Math.round(r.months), 1)} mo` : `约 ${Math.max(Math.round(r.months), 1)} 个月`);
  const fmtYM2 = r.eta ? (lang === 'en' ? r.eta.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) : `${r.eta.getFullYear()}年${r.eta.getMonth() + 1}月`) : '';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ fontSize: '10px', color: 'var(--gc-muted)', width: '68px', flexShrink: 0, textAlign: 'right', lineHeight: 1.3 }}>{label}</div>
      <div style={{ flex: 1, height: '16px', background: 'var(--gc-paper-soft)', borderRadius: '0 4px 4px 0', position: 'relative', overflow: 'hidden' }}>
        {zMin > 0 && (
          <span style={{ position: 'absolute', left: '2px', top: 0, bottom: 0, width: '4px', zIndex: 2,
            background: 'repeating-linear-gradient(-55deg, var(--gc-paper-soft), var(--gc-paper-soft) 1.5px, var(--gc-muted-soft) 1.5px, var(--gc-muted-soft) 3px)' }} />
        )}
        <div style={{ position: 'relative', height: '100%', width: `${pct}%`, background: color, borderRadius: '0 4px 4px 0' }} />
      </div>
      <div className="gc-mono" style={{ fontSize: '10.5px', fontWeight: 700, color, whiteSpace: 'nowrap', flexShrink: 0 }}>
        {fmtEta}{fmtYM2 ? ` · ${fmtYM2}` : ''}
      </div>
    </div>
  );
};

// Two aligned bars sharing one baseline/scale — the length gap IS the point for
// a big difference. For a genuinely close pair (< 20% apart), 0..max makes the
// real gap disappear visually, so the track zooms to just the gap between them
// instead; the diagonal break mark is the standard "axis doesn't start at zero"
// tell, and the delta line below still states the honest number either way.
const CompareRows = ({ rowA, rowB, lang }) => {
  const aM = rowA.r.now ? 0 : (rowA.r.months ?? null);
  const bM = rowB.r.now ? 0 : (rowB.r.months ?? null);
  if (aM == null || bM == null) {
    return (
      <div style={{ marginTop: '9px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
        <CompareBarRow label={rowA.label} r={rowA.r} color={rowA.color} zMin={0} zMax={1} lang={lang} />
        <CompareBarRow label={rowB.label} r={rowB.r} color={rowB.color} zMin={0} zMax={1} lang={lang} />
      </div>
    );
  }
  const maxM = Math.max(aM, bM, 1);
  const bothReal = !rowA.r.now && !rowB.r.now;
  const relDelta = Math.abs(aM - bM) / maxM;
  const zoom = bothReal && relDelta > 0 && relDelta < 0.2;
  const zMin = zoom ? Math.min(aM, bM) * 0.85 : 0;
  const zMax = zoom ? Math.max(aM, bM) * 1.15 : maxM;

  const dm = aM - bM; // positive = row B is faster
  const dAbs = Math.abs(dm);
  const deltaTxt = dAbs < 1
    ? (lang === 'en' ? 'Almost no difference (< 1 mo)' : '几乎没有差异（< 1 个月）')
    : (() => {
        const pct = Math.round(dAbs / maxM * 100);
        const mTxt = dAbs >= 18 ? (lang === 'en' ? `~${(dAbs / 12).toFixed(1)} yrs` : `约 ${(dAbs / 12).toFixed(1)} 年`) : (lang === 'en' ? `~${Math.round(dAbs)} mo` : `约 ${Math.round(dAbs)} 个月`);
        return dm > 0
          ? (lang === 'en' ? `${pct}% apart · faster by ${mTxt}` : `相差 ${pct}% · 快 ${mTxt}`)
          : (lang === 'en' ? `${pct}% apart · slower by ${mTxt}` : `相差 ${pct}% · 慢 ${mTxt}`);
      })();
  const deltaColor = dAbs < 1 ? 'var(--gc-muted)' : dm > 0 ? 'var(--gc-green)' : 'var(--gc-red)';

  return (
    <div style={{ marginTop: '9px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        <CompareBarRow label={rowA.label} r={rowA.r} color={rowA.color} zMin={zMin} zMax={zMax} lang={lang} />
        <CompareBarRow label={rowB.label} r={rowB.r} color={rowB.color} zMin={zMin} zMax={zMax} lang={lang} />
      </div>
      <div style={{ fontSize: '10.5px', fontWeight: 700, color: deltaColor, margin: '5px 0 0 76px' }}>
        {deltaTxt}
        {zoom && <span style={{ fontWeight: 600, color: 'var(--gc-muted)' }}>{lang === 'en' ? ' · bars zoomed to show the gap' : ' · 条形已局部放大，便于看清差距'}</span>}
      </div>
      <div className="flex items-center justify-between" style={{ fontSize: '9px', color: 'var(--gc-muted-soft)', marginTop: '2px', marginLeft: '76px' }}>
        <span>{zoom ? (lang === 'en' ? 'zoomed' : '局部放大') : (lang === 'en' ? 'today' : '今天')}</span>
        <span>{lang === 'en' ? `~${(maxM / 12).toFixed(1)} yrs out` : `约 ${(maxM / 12).toFixed(1)} 年后`}</span>
      </div>
    </div>
  );
};

const CompareHub = ({ userCase }) => {
  const { lang, t } = useLang();
  const [openRule, setOpenRule] = useState(null); // index of the card whose rule is open

  // Zero choices: everything below is auto-computed from the user's own case, on the
  // adopted chart. The three-scenario picker version confused its one real user —
  // an answer page beats a tool page here. (Comparison component kept, unused.)
  const chartSel = FILING_AUTHORIZED[userCase.category] ? 'B' : 'A';
  const chartKey = chartSel === 'B' ? 'filing' : 'finalAction';

  const etaFor = (cat, country) => {
    const rc = resolveCountry(country);
    const cutoff = bulletinCurrent[chartKey]?.[cat]?.[rc];
    const st = computeStatus(userCase.priorityDate, cutoff);
    if (cutoff === 'C' || ['current', 'eligible', 'overdue'].includes(st.status)) return { now: true, months: 0 };
    if (st.days === null) return { unavailable: true, months: null };
    const cal = paceDaysToCalendar(cat, rc, st.days, chartKey);
    return { months: cal / 30.44, eta: new Date(Date.now() + cal * 86400000) };
  };
  const diffText = (m) => Math.abs(m) / 12 >= 1
    ? `${(Math.abs(m) / 12).toFixed(1)} ${lang === 'en' ? 'yrs' : '年'}`
    : `${Math.round(Math.abs(m))} ${lang === 'en' ? 'mo' : '个月'}`;
  const catLabel = t?.[userCase.category.toLowerCase()] || userCase.category;

  // Ordered slots: [cross-chargeability OR pool] then [category move OR "not applicable"].
  // A slot that doesn't apply renders as a slim ghost row instead of vanishing —
  // the page should look like it checked everything, not like it ran out of content.
  const cards = [];
  let catMoveGhost = null; // set below if there's no adjacent-category move for this case

  if (userCase.country !== 'Taiwan') {
    const mine = etaFor(userCase.category, userCase.country);
    const row = etaFor(userCase.category, 'Taiwan');
    const d = (mine.months ?? 0) - (row.months ?? 0);
    const big = (row.now && !mine.now) || d > 1;
    cards.push({
      icon: Users,
      title: lang === 'en' ? "Spouse's birth country" : '配偶出生地',
      badge: row.now && !mine.now ? (lang === 'en' ? 'now' : '现在就可') : d > 1 ? (lang === 'en' ? 'faster' : '可提前') : (lang === 'en' ? 'minor' : '影响不大'),
      verdict: row.now && !mine.now
        ? (lang === 'en' ? 'Charged to a ROW-born spouse, you could proceed NOW.' : '按配偶的出生国（非积压国）计，你现在就可推进。')
        : d > 1
          ? (lang === 'en' ? `Marrying/married to someone born outside China·India etc. saves about ${diffText(d)}.` : `按配偶的出生国计，约可提前 ${diffText(d)}。`)
          : (lang === 'en' ? 'Right now this would not change your wait much.' : '目前这样做对你的等待影响不大。'),
      tone: big ? 'var(--gc-green)' : 'var(--gc-ink)',
      rows: [
        { label: lang === 'en' ? 'As is' : '现状', r: mine, color: 'var(--gc-blue)' },
        { label: lang === 'en' ? 'Via spouse' : '按配偶出生国', r: row, color: big ? 'var(--gc-green)' : 'var(--gc-muted)' },
      ],
      rule: lang === 'en'
        ? "Cross-chargeability, INA §202(b)(2): when spouses immigrate together, the case may be charged to either spouse's country of birth. Consult a lawyer for specifics."
        : '交叉归属（INA §202(b)(2)）：夫妻一同移民时，案件可计入任一方的出生国配额，两人都按更快的那国排期。细节请咨询律师。',
    });
  } else {
    cards.push({
      icon: CheckCircle2,
      title: lang === 'en' ? 'Your quota pool' : '你的配额池',
      badge: lang === 'en' ? 'optimal' : '无需操作',
      verdict: lang === 'en' ? 'You are already in the fastest (ROW) pool — a spouse\'s birth country cannot speed this up.' : '你已在最快的全球配额池——配偶出生地无法再加速。',
      tone: 'var(--gc-green)', rows: null, rule: null,
    });
  }

  const catMove = {
    F2A: { to: 'IR', title: lang === 'en' ? 'Spouse naturalizes' : '配偶入籍',
      rule: lang === 'en' ? 'Spouses of U.S. citizens are Immediate Relatives: no quota, no bulletin. The upgrade is automatic on naturalization.' : '公民配偶属直系亲属（IR）：不占配额、不用等公告。担保人入籍后自动升级，通知 USCIS 即可。' },
    F2B: { to: 'F1', title: lang === 'en' ? 'Parent naturalizes' : '父母入籍',
      rule: lang === 'en' ? 'F2B auto-converts to F1 on naturalization. If F1 is SLOWER for your country, CSPA §6 lets you opt out in writing and stay in F2B.' : 'F2B 在父母入籍后自动转 F1。若你的国家 F1 反而更慢，CSPA 第 6 条允许书面 opt-out 留在 F2B。' },
    EB2: { to: 'EB3', title: lang === 'en' ? 'Downgrade to EB-3' : '降级到 EB-3',
      rule: lang === 'en' ? 'File a new I-140 under EB-3 with the same PERM and keep your original priority date (8 CFR 204.5(e)).' : '用同一份 PERM 重递 EB-3 的 I-140，原优先日保留（8 CFR 204.5(e)）。' },
    EB3: { to: 'EB2', title: lang === 'en' ? 'Upgrade to EB-2' : '升级到 EB-2',
      rule: lang === 'en' ? 'Same mechanism in reverse; priority date retention applies if the original I-140 was approved.' : '同一机制反向操作；只要原 I-140 获批过，优先日同样保留。' },
  }[userCase.category];

  if (catMove) {
    const from = etaFor(userCase.category, userCase.country);
    const to = catMove.to === 'IR' ? { now: true, months: 0 } : etaFor(catMove.to, userCase.country);
    const d = (from.months ?? 0) - (to.months ?? 0);
    const good = catMove.to === 'IR' || d > 1;
    const bad = d < -1;
    cards.push({
      icon: RefreshCw,
      title: catMove.title,
      badge: catMove.to === 'IR' ? (lang === 'en' ? 'now' : '现在就可') : good ? (lang === 'en' ? 'faster' : '可提前') : bad ? (lang === 'en' ? 'slower' : '会变慢') : (lang === 'en' ? 'minor' : '影响不大'),
      verdict: catMove.to === 'IR'
        ? (lang === 'en' ? 'You would become an Immediate Relative — no bulletin wait at all.' : '你将升级为直系亲属——完全不用再等公告。')
        : d > 1
          ? (lang === 'en' ? `The switch saves about ${diffText(d)}.` : `转换后约可提前 ${diffText(d)}。`)
          : d < -1
            ? (lang === 'en' ? `Careful — the new category is slower by ~${diffText(d)}. Consider opting out.` : `注意：新类别反而慢约 ${diffText(d)}——可考虑 opt-out 留在原类别。`)
            : (lang === 'en' ? 'Both categories are about the same right now.' : '两个类别目前差别不大。'),
      tone: good ? 'var(--gc-green)' : bad ? 'var(--gc-red)' : 'var(--gc-ink)',
      rows: [
        { label: userCase.category, r: from, color: 'var(--gc-blue)' },
        { label: catMove.to === 'IR' ? (lang === 'en' ? 'IR' : '直系亲属') : catMove.to, r: to, color: good ? 'var(--gc-green)' : bad ? 'var(--gc-red)' : 'var(--gc-muted)' },
      ],
      rule: catMove.rule,
    });
  } else {
    catMoveGhost = lang === 'en'
      ? `${catLabel} has no adjacent category with an automatic conversion or speed-up.`
      : `${catLabel} 没有可自动转换或提速的邻近类别。`;
  }

  return (
    <div className="space-y-2">
      <div style={{ padding: '4px 0 0' }}>
        <div className="gc-eyebrow" style={{ color: 'var(--gc-green)' }}>{lang === 'en' ? 'WHAT IF' : '如果'}</div>
        <h2 className="gc-serif" style={{ fontSize: '20px', fontWeight: 700, color: 'var(--gc-ink)', margin: '2px 0 2px' }}>
          {lang === 'en' ? 'Would this make you faster' : '这样做会不会更快'}
        </h2>
        <p style={{ fontSize: '12px', color: 'var(--gc-muted)', margin: 0 }}>
          {lang === 'en'
            ? `Auto-computed from your case (${userCase.category} · PD ${userCase.priorityDate}). Nothing to configure.`
            : `已根据你的案子（${userCase.category} · 优先日 ${userCase.priorityDate}）自动算好，无需任何设置。`}
        </p>
      </div>
      {cards.map((c, i) => {
        const t = CH_TONE[c.tone];
        const Icon = c.icon;
        return (
          <React.Fragment key={i}>
            <div style={{ background: 'var(--gc-surface)', border: '1px solid var(--gc-rule)', borderLeft: `2px solid ${c.tone}`, borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ padding: '11px 14px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
                  <Icon size={15} style={{ color: c.tone, flexShrink: 0 }} strokeWidth={1.8} />
                  <span className="gc-serif" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gc-ink)' }}>{c.title}</span>
                </div>
                <span className="gc-eyebrow" style={{ fontSize: '9px', fontWeight: 700, color: c.tone, border: `1px solid ${t.border}`, background: t.soft, borderRadius: '2px', padding: '2px 6px', letterSpacing: '0.08em', flexShrink: 0 }}>
                  {c.badge}
                </span>
              </div>
              <div style={{ padding: '8px 14px 12px' }}>
                <div className="gc-serif" style={{ fontSize: '16px', fontWeight: 700, lineHeight: 1.35, color: c.tone }}>{c.verdict}</div>
                {c.rows && <CompareRows rowA={c.rows[0]} rowB={c.rows[1]} lang={lang} />}
                {c.rule && (
                  <>
                    <button type="button" onClick={() => setOpenRule(openRule === i ? null : i)}
                      style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', fontSize: '10.5px', color: 'var(--gc-green)', textDecoration: 'underline', textUnderlineOffset: '2px', fontWeight: 600, marginTop: '8px' }}>
                      {openRule === i ? (lang === 'en' ? 'hide the rule' : '收起规则') : (lang === 'en' ? 'which rule allows this?' : '依据什么规则？')}
                    </button>
                    {openRule === i && (
                      <div style={{ fontSize: '11px', lineHeight: 1.7, color: 'var(--gc-ink-soft)', background: 'var(--gc-paper-soft)', border: '1px solid var(--gc-rule-soft)', borderRadius: '3px', padding: '8px 10px', marginTop: '6px' }}>
                        {c.rule}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </React.Fragment>
        );
      })}
      {catMoveGhost && (
        <div style={{ padding: '10px 12px', background: 'transparent', border: '1px dashed var(--gc-rule-soft)', borderRadius: '3px', display: 'flex', alignItems: 'center', gap: '10px', opacity: 0.8 }}>
          <Lock size={15} style={{ color: 'var(--gc-muted-soft)', flexShrink: 0 }} strokeWidth={1.8} />
          <div style={{ fontSize: '12px', color: 'var(--gc-muted)', lineHeight: 1.4 }}>{catMoveGhost}</div>
        </div>
      )}
      <p style={{ fontSize: '10.5px', color: 'var(--gc-muted)', lineHeight: 1.6, margin: '4px 2px 0' }}>
        {lang === 'en'
          ? 'Estimates use the same 12-month real pace as the Overview. Individual cases vary — talk to a lawyer before acting.'
          : '估算与总结页同口径（近 12 个月实速）。个案有差异，行动前请咨询律师。'}
      </p>
    </div>
  );
};

// ============================================================
// CommunityPage — 「社区」tab（原「如果」/CompareHub 的位置）。
// 不新增导航位，是把已有的三块拼到一起：案件进度墙（原挂在「动态」）+
// 同路人互动（原挂在「总结」页底部，poll/打卡墙/调查全部原样保留）+
// CompareHub（原「如果」的全部内容，没删，收进默认收起的 <details> 里）。
// ============================================================
const CommunityPage = ({ userCase }) => {
  const { lang } = useLang();
  return (
    <div className="space-y-2">
      <div style={{ padding: '4px 0 0' }}>
        <div className="gc-eyebrow" style={{ color: 'var(--gc-green)' }}>{lang === 'en' ? 'COMMUNITY' : '社区'}</div>
        <h2 className="gc-serif" style={{ fontSize: '20px', fontWeight: 700, color: 'var(--gc-ink)', margin: '2px 0 2px' }}>
          {lang === 'en' ? "You're not doing this alone" : '你不是一个人在等'}
        </h2>
        <p style={{ fontSize: '12px', color: 'var(--gc-muted)', margin: 0 }}>
          {lang === 'en' ? 'Everything below is anonymous, crowd-sourced — no email, no case number.' : '下面全部匿名众包——不收邮箱，不收案号。'}
        </p>
      </div>

      <TrackerPage userCase={userCase} />

      <CommunityHub userCase={userCase} />

      <details style={{ border: '1px solid var(--gc-rule)', borderRadius: '4px', background: 'var(--gc-surface)', padding: '8px 10px' }}>
        <summary style={{ cursor: 'pointer', fontSize: '12px', fontWeight: 700, color: 'var(--gc-ink-soft)', listStyle: 'revert' }}>
          {lang === 'en' ? 'What if I switch category or status?' : '如果换类别、换身份会更快吗'}
          <span style={{ fontWeight: 400, color: 'var(--gc-muted)' }}>{lang === 'en' ? ' · tap for the auto-computed comparison' : ' · 展开看自动算好的对比'}</span>
        </summary>
        <div style={{ height: '8px' }} />
        <CompareHub userCase={userCase} />
      </details>
    </div>
  );
};

const Comparison = ({ userCase }) => {
  const { t, lang } = useLang();

  return (
    <div style={{ padding: '0 12px 12px' }}>
      {/* Header */}
      <div style={{ padding: '8px 0 8px', borderBottom: '1px solid var(--gc-rule)' }}>
        <div className="gc-eyebrow" style={{ color: 'var(--gc-green)' }}>
          {lang === 'en' ? 'COMPARE' : lang === 'tw' ? '對比' : '对比'}
        </div>
        <h2 className="gc-serif" style={{
          fontSize: '18px', fontWeight: 700, color: 'var(--gc-ink)',
          margin: '2px 0 3px', letterSpacing: '-0.01em'
        }}>
          {lang === 'en' ? 'What if…?' : lang === 'tw' ? '如果⋯會怎樣?' : '如果⋯会怎样?'}
        </h2>
        <p style={{ fontSize: '11px', color: 'var(--gc-muted)', margin: 0, lineHeight: 1.35 }}>
          {t.compareByCountryDesc}
        </p>
      </div>

      {/* Content — by country only */}
      <div style={{ marginTop: '8px' }}>
        <CompareByCountry userCase={userCase} />
      </div>
    </div>
  );
};

// ============================================================
// Trend Chart Component (mimicking the professional chart style)
// ============================================================
const TrendChart = ({ userCase, i485ServiceCenter = 'average', completedI485Steps = [], stepActualDates = {} }) => {
  const { t, lang } = useLang();
  const [hoveredMonthIndex, setHoveredMonthIndex] = useState(null);
  const [hoveredForecast, setHoveredForecast] = useState(null); // For forecast zone hover
  // Default to showing JUST the user's own category — their personal line is
  // what they care about most. Other categories are one tap away via the filter.
  const [selectedCategory, setSelectedCategory] = useState('mine');
  const [showCrossoverInfo, setShowCrossoverInfo] = useState(false);
  const [showHelp, setShowHelp] = useState(false); // 说明默认折叠
  // Forecast extension: how many MONTHS of forecast to show (8 months default, up to 600 = 50 years)
  const [forecastMonths, setForecastMonths] = useState(8);
  // Tracks whether the user has manually touched EITHER range slider — if so,
  // we stop auto-fitting to respect their choice. Reset on case change.
  const [rangeUserAdjusted, setRangeUserAdjusted] = useState(false);
  // Past extension: how many MONTHS of historical data to show (12 default, up to 312 = 26 years)
  // Using real anchor data from HISTORICAL_DATA constant (2005-2026)
  const [pastMonths, setPastMonths] = useState(12);
  // Forecast scenario: 5 levels - optimistic(1.5×) | somewhatOptimistic(1.25×) | expected(1.0×, default) | somewhatPessimistic(0.75×) | pessimistic(0.5×)
  const [scenario, setScenario] = useState('expected');
  // Terminal mode REMOVED — the Bloomberg-style dark skin didn't fit the editorial aesthetic.
  // Keeping the variable (hardcoded false) so the ~90 conditional references still work
  // and always take the "standard" (document-style) branch.
  const terminalMode = false;
  // Tracks whether the last range change was auto-fit (for UI hint)
  const [autoFitted, setAutoFitted] = useState(false);
  // When user is already eligible (PD ≥ cutoff), we default to showing a big
  // "can file now" banner instead of the chart. User can opt-in to view the
  // chart via a small "查看图表" link. Reset if case changes.
  const [showChartAnyway, setShowChartAnyway] = useState(false);

  // Chart color tokens — two skins: standard (document) and terminal (Bloomberg-at-night).
  // NOTE: `crossover` used to be red (warning semantics) but that's wrong — the crossover
  // marks the eligibility milestone (good news). In Standard mode we use the app theme's
  // primary accent (via CSS var); in Terminal mode we use a distinct phosphor-gold so it
  // stands apart from the NOW amber line.
  const C = terminalMode ? {
    bg: '#0b0f14',          // deep terminal background
    panel: '#0b0f14',
    gridMajor: '#1d2430',   // stronger grid
    gridMinor: '#141a23',   // faint grid
    frame: '#2a323f',
    axis: '#5a6472',
    axisMuted: '#3a424e',
    text: '#d9d2b8',        // warm ink on black (Bloomberg cream-ish)
    textMuted: '#8a8472',
    nowLine: '#ffb74d',     // Bloomberg amber for "now"
    nowText: '#ffb74d',
    forecastZone: '#1a2420', // very faint green tint on forecast area
    pdLine: '#d9d2b8',       // user PD line = cream
    pdBadge: '#3a424e',
    crossover: '#7ad9a0',    // mint phosphor — distinct from amber NOW, reads as "good milestone"
    crossoverBadge: '#7ad9a0',
    crossoverText: '#0b0f14', // dark text on mint bg
    crossoverSoft: '#17291f', // dim mint for hint text
    cardBg: '#12171f',
    cardBorder: '#2a323f',
    hoverLine: '#ffb74d',
  } : {
    bg: '#fafafa',
    panel: '#fafafa',
    gridMajor: '#e2e8f0',
    gridMinor: '#eef2f6',
    frame: '#e2e8f0',
    axis: '#475569',
    axisMuted: '#94a3b8',
    text: '#1f2937',
    textMuted: '#64748b',
    nowLine: '#10b981',
    nowText: '#059669',
    forecastZone: '#dcfce7',
    pdLine: '#475569',
    pdBadge: '#475569',
    crossover: 'var(--gc-green)',        // theme's primary accent (ink-green, navy, seal-red, or muted-green per theme)
    crossoverBadge: 'var(--gc-green)',
    crossoverText: 'var(--gc-paper)',    // paper color text on accent bg
    crossoverSoft: 'var(--gc-green-ink)',// for small hint text under the pill
    cardBg: '#ffffff',
    cardBorder: '#e2e8f0',
    hoverLine: '#475569',
  };
  
  // CRITICAL: Auto-switch chart filter when user's category changes
  // When user's case fundamentally changes, reset state so auto-fit can re-run
  // and give them a fresh optimal view. We DON'T override selectedCategory here —
  // the default 'mine' mode (only user's own category) stays consistent.
  useEffect(() => {
    setSelectedCategory('mine');
    setRangeUserAdjusted(false);
  }, [userCase.category, userCase.country, userCase.priorityDate]);

  // When the category FILTER changes (user switches tabs between "only me" / EB / F / all),
  // re-run auto-fit so the chart doesn't stay stuck on stale range settings.
  // Example: user manually set forecast=8y while viewing "only me", then switches to
  // "Employment" — without this, the 8y stays and the crossover gets squished to the left.
  useEffect(() => {
    setRangeUserAdjusted(false);
  }, [selectedCategory]);

  // AUTO-FIT dual ranges (history + forecast):
  // Position the crossover (where user's PD line meets forecast curve) at ~66% of total x-axis,
  // with history showing enough context on the left. This simultaneously teaches users that
  // BOTH sliders can move — the chart "breathes" in response to their case.
  //
  // Skipped if the user has manually moved either slider (respect their choice).
  useEffect(() => {
    if (rangeUserAdjusted) return;
    const country = resolveCountry(userCase.country);
    const cat = userCase.category;
    const currentCutoff = bulletinCurrent.finalAction[cat]?.[country];
    if (!currentCutoff || currentCutoff === 'C') {
      setAutoFitted(false);
      return;
    }
    const pd = parseDate(userCase.priorityDate);
    const co = parseDate(currentCutoff);
    if (!pd || !co || pd <= co) {
      setAutoFitted(false);
      return;
    }
    // Same Hybrid model — and the same observed pace — the chart's own curve uses.
    const longTermRate = getLongTermRate(cat, country);
    const recentDpm = observedPaceFromArchive(cat, country) ?? (longTermRate / 12);

    const estMonths = estimateMonthsToReachPD(
      currentCutoff, userCase.priorityDate, recentDpm, longTermRate, cat, country
    );
    if (!estMonths) return;

    // Apply scenario multiplier (same as chart's forecast curve)
    const scenarioMult = { optimistic: 1.5, somewhatOptimistic: 1.25, expected: 1.0, somewhatPessimistic: 0.75, pessimistic: 0.5 }[scenario] || 1.0;
    const scenarioAdjustedMonths = estMonths / scenarioMult;

    // ===== DUAL AUTO-FIT LOGIC =====
    // Goal: crossover lands at ~66% of total x-axis.
    // Formula: pastM / (pastM + forecastM + scenarioAdjustedMonths - scenarioAdjustedMonths) = 0.34
    //          scenarioAdjustedMonths / (pastM + forecastM) = distance past the NOW line
    // We target: past is ~half the width of future, so crossover sits right of center.
    //   → forecastM = scenarioAdjustedMonths / 0.66 (same as before)
    //   → pastM = forecastM * 0.5 (half as much history as forecast)
    //
    // But we snap both to clean waypoint values for nice axis ticks.

    // STEP 1: compute target forecast range
    const targetForecastRaw = Math.ceil(scenarioAdjustedMonths / 0.66);
    // STEP 2: compute target history range (half the forecast, but at least 12 months of context)
    const targetPastRaw = Math.max(12, Math.ceil(targetForecastRaw * 0.5));

    // Waypoint snap — align with slider shortcut values for visual cleanliness
    const forecastWaypoints = [8, 12, 18, 24, 36, 60, 96, 120, 180, 240, 360, 480, 600];
    const pastWaypoints = [6, 12, 24, 36, 60, 96, 120, 180, 240, 312];
    const snapUp = (v, waypoints) => {
      for (const w of waypoints) if (w >= v) return w;
      return waypoints[waypoints.length - 1];
    };

    const snappedForecast = Math.max(6, Math.min(600, snapUp(targetForecastRaw, forecastWaypoints)));
    const snappedPast = Math.max(6, Math.min(312, snapUp(targetPastRaw, pastWaypoints)));

    // Apply auto-fit for both directions (expand OR shrink). Previously only
    // allowed expansion — but that caused issues when switching tabs/scenarios
    // where the optimal range became much smaller, leaving the chart stuck on
    // a now-oversized view (crossover squished to the left).
    let didChange = false;
    if (snappedForecast !== forecastMonths) {
      setForecastMonths(snappedForecast);
      didChange = true;
    }
    if (snappedPast !== pastMonths) {
      setPastMonths(snappedPast);
      didChange = true;
    }
    setAutoFitted(didChange);
  }, [userCase.category, userCase.country, userCase.priorityDate, scenario, rangeUserAdjusted]);
  
  // When historical/forecast range changes, clear any stale hover state
  // (a hover on month 200 in 360-month view becomes invalid when user drags to 12-month view)
  useEffect(() => {
    setHoveredMonthIndex(null);
    setHoveredForecast(null);
  }, [pastMonths, forecastMonths]);

  // Helper to safely add months and return ISO date string
  const addMonths = (year, month, monthsToAdd) => {
    const date = new Date(year, month - 1, 1);
    date.setMonth(date.getMonth() + monthsToAdd);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}-15`;
  };

  // For 'Current' display, use a date ~2 years in the future (visual position above all data)
  const CURRENT_DATE = addMonths(2028, 1, 0);

  // Interpolate cutoff date at a given bulletin date by finding the two surrounding anchors
  // Returns ISO date string or 'C' if both surrounding anchors are Current
  const interpolateCutoff = (cat, country, targetYear, targetMonth) => {
    // Use anchor points from HISTORICAL_DATA (defined globally)
    const anchors = ['2000-01', '2005-01', '2010-01', '2015-01', '2020-01', '2026-05'];
    const getAnchorDate = (k) => {
      const [y, m] = k.split('-').map(Number);
      return new Date(y, m - 1, 15);
    };
    const getAnchorValue = (k) => {
      if (!HISTORICAL_DATA[k]) return null;
      const catData = HISTORICAL_DATA[k][cat];
      if (!catData) return null;
      // Try specific country, else fall back to 'Other' (Taiwan/Mexico/Philippines use Other pool sometimes)
      return catData[country] !== undefined ? catData[country] : catData.Other;
    };
    
    const target = new Date(targetYear, targetMonth - 1, 15);
    
    // If target is before first anchor, extrapolate backwards using first two anchors
    if (target < getAnchorDate(anchors[0])) {
      const v0 = getAnchorValue(anchors[0]);
      const v1 = getAnchorValue(anchors[1]);
      if (v0 === 'C' && v1 === 'C') return 'C';
      if (!v0 || !v1 || v0 === 'C' || v1 === 'C') return null;
      const d0 = new Date(v0), d1 = new Date(v1);
      const t0 = getAnchorDate(anchors[0]), t1 = getAnchorDate(anchors[1]);
      const ratio = (target - t0) / (t1 - t0);
      const cutoffMs = d0.getTime() + ratio * (d1.getTime() - d0.getTime());
      const cd = new Date(cutoffMs);
      return `${cd.getFullYear()}-${String(cd.getMonth()+1).padStart(2,'0')}-${String(cd.getDate()).padStart(2,'0')}`;
    }
    
    // If target is after last anchor, return null (should use current data instead)
    if (target > getAnchorDate(anchors[anchors.length-1])) return null;
    
    // Find surrounding anchors
    for (let i = 0; i < anchors.length - 1; i++) {
      const t0 = getAnchorDate(anchors[i]);
      const t1 = getAnchorDate(anchors[i+1]);
      if (target >= t0 && target <= t1) {
        const v0 = getAnchorValue(anchors[i]);
        const v1 = getAnchorValue(anchors[i+1]);
        if (v0 === 'C' && v1 === 'C') return 'C';
        if (!v0 || !v1) return null;
        // Edge case: one end Current, other end has date
        // Real behavior: category transitions to Current at some point in the interval
        // We approximate: linearly advance from v0 until hitting target date, or jump to Current
        // near the end of the interval if v1 === 'C'
        if (v0 === 'C' && v1 !== 'C') {
          // Going from Current to non-Current (retrogression) - rare
          // First half shows Current, then jumps to v1 date
          const ratio = (target - t0) / (t1 - t0);
          return ratio < 0.5 ? 'C' : v1;
        }
        if (v0 !== 'C' && v1 === 'C') {
          // Common case: category becomes Current during this interval (e.g. F2A 2015→2020)
          // First 80% of interval: linearly advance v0 toward what a "becomes current" date would be
          // Last 20%: show Current
          const ratio = (target - t0) / (t1 - t0);
          if (ratio >= 0.8) return 'C';
          // Extrapolate v0 forward at 400 d/y rate (typical catch-up rate)
          const d0 = new Date(v0);
          const yearsElapsed = ratio * (t1 - t0) / (365.25 * 24 * 60 * 60 * 1000);
          const advancedMs = d0.getTime() + yearsElapsed * 400 * 24 * 60 * 60 * 1000;
          const cd = new Date(advancedMs);
          return `${cd.getFullYear()}-${String(cd.getMonth()+1).padStart(2,'0')}-${String(cd.getDate()).padStart(2,'0')}`;
        }
        const d0 = new Date(v0), d1 = new Date(v1);
        const ratio = (target - t0) / (t1 - t0);
        const cutoffMs = d0.getTime() + ratio * (d1.getTime() - d0.getTime());
        const cd = new Date(cutoffMs);
        return `${cd.getFullYear()}-${String(cd.getMonth()+1).padStart(2,'0')}-${String(cd.getDate()).padStart(2,'0')}`;
      }
    }
    return null;
  };

  // Generate historical data covering `pastMonths` months ending at the loaded bulletin.
  // Every month inside BULLETIN_ARCHIVE (26 real bulletins from history.json) is read
  // straight out of it; only months older than the archive fall back to interpolation
  // between the real HISTORICAL_DATA anchor points.
  //
  // This used to anchor on the hardcoded `bulletinMay2026` seed and back-extrapolate the
  // "recent 12 months" with an invented rate table (F4-China: 8 days/month). That made
  // the chart's observed pace exactly that invented constant, and pinned its starting
  // cutoff three bulletins in the past — the two errors compounded and pushed F4-China's
  // crossover out to 2037 while the real data implied a fraction of that.
  const generateHistoricalData = () => {
    const months = [];
    const now = bulletinAnchorDate(1);

    // Fallback anchor for months the archive doesn't cover — bulletinCurrent tracks the
    // month actually on screen, unlike the frozen May seed this used to read.
    const fa = bulletinCurrent.finalAction;
    const currentData = {
      'EB1-China': fa.EB1.China, 'EB1-Other': fa.EB1.Other, 'EB1-India': fa.EB1.India,
      'EB1-Mexico': fa.EB1.Other, 'EB1-Philippines': fa.EB1.Other,
      'EB2-China': fa.EB2.China, 'EB2-Other': fa.EB2.Other, 'EB2-India': fa.EB2.India,
      'EB2-Mexico': fa.EB2.Other, 'EB2-Philippines': fa.EB2.Other,
      'EB3-China': fa.EB3.China, 'EB3-Other': fa.EB3.Other, 'EB3-India': fa.EB3.India,
      'EB3-Mexico': fa.EB3.Other, 'EB3-Philippines': fa.EB3.Other,
      'F1-China': fa.F1.China, 'F1-Other': fa.F1.Other, 'F1-India': fa.F1.India,
      'F1-Mexico': fa.F1.Other, 'F1-Philippines': fa.F1.Other,
      'F2A-China': fa.F2A.China, 'F2A-Other': fa.F2A.Other, 'F2A-India': fa.F2A.India,
      'F2A-Mexico': fa.F2A.Other, 'F2A-Philippines': fa.F2A.Other,
      'F3-China': fa.F3.China, 'F3-Other': fa.F3.Other, 'F3-India': fa.F3.India,
      'F3-Mexico': fa.F3.Other, 'F3-Philippines': fa.F3.Other,
      'F4-China': fa.F4.China, 'F4-Other': fa.F4.Other, 'F4-India': fa.F4.India,
      'F4-Mexico': fa.F4.Other, 'F4-Philippines': fa.F4.Other,
    };

    // Mexico and Philippines are charged to the "Other" pool in this app's model
    // (see resolveCountry), so their series read from the Other column.
    const archiveCountry = (ctry) => (ctry === 'Mexico' || ctry === 'Philippines' ? 'Other' : ctry);

    // Build pastMonths months; i=0 is latest, i=pastMonths-1 is earliest.
    // Real bulletin first, interpolated anchors for anything older than the archive.
    for (let i = pastMonths - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const targetYear = date.getFullYear();
      const targetMonth = date.getMonth() + 1;
      const archiveKey = `${targetYear}-${String(targetMonth).padStart(2, '0')}`;
      const archived = BULLETIN_ARCHIVE[archiveKey]?.data?.finalAction || null;

      const monthData = {};
      Object.keys(currentData).forEach(key => {
        const [cat, ctry] = key.split('-');
        const fromArchive = archived?.[cat]?.[archiveCountry(ctry)];
        if (fromArchive) {
          monthData[key] = fromArchive;
          return;
        }
        // Older than the archive — interpolate between real anchor points.
        const interpolated = interpolateCutoff(cat, ctry, targetYear, targetMonth);
        // Last resort (no anchor coverage either): hold the current value flat rather
        // than inventing movement, so a data gap can never masquerade as a trend.
        monthData[key] = interpolated !== null ? interpolated : currentData[key];
      });

      months.push({
        month: `${date.getFullYear()}年${date.getMonth() + 1}月`,
        shortMonth: `${String(date.getFullYear()).slice(-2)}/${date.getMonth() + 1}`,
        date: date,
        data: monthData
      });
    }
    return months;
  };

  const historicalData = generateHistoricalData();
  const country = resolveCountry(userCase.country);

  // Category configuration
  const ebCategories = ['EB1', 'EB2', 'EB3', 'EW'];
  const fCategories = ['F1', 'F2A', 'F3', 'F4'];
  const allCategories = [...ebCategories, ...fCategories];

  const colors = {
    'EB1': '#3b82f6', 'EB2': '#ef4444', 'EB3': '#8b5cf6',
    'F1': '#f59e0b', 'F2A': '#10b981', 'F3': '#f97316', 'F4': '#6366f1',
  };

  // Smart filtering: identify categories that are ALWAYS Current for this country
  // (no meaningful data to plot - they'd be flat lines at top)
  const isAlwaysCurrent = (cat) => {
    return historicalData.every(m => m.data[`${cat}-${country}`] === 'C');
  };
  
  // Categories that have meaningful (non-Current) data to plot
  const plottableCategories = allCategories.filter(cat => !isAlwaysCurrent(cat));
  // Categories that are always Current (shown as a summary info, not plotted)
  const alwaysCurrentCategories = allCategories.filter(cat => isAlwaysCurrent(cat));
  
  // Apply user's filter selection AFTER smart filtering
  // But always include user's own category (even if Current) for context
  const userCat = userCase.category;
  const baseCategories = selectedCategory === 'mine'
    ? (plottableCategories.includes(userCat) ? [userCat] : [])
    : selectedCategory === 'EB' 
    ? plottableCategories.filter(c => ebCategories.includes(c))
    : selectedCategory === 'F' 
    ? plottableCategories.filter(c => fCategories.includes(c))
    : plottableCategories;
  
  // Ensure user's own category is in displayCategories (for context), even if Current.
  // Exception: 'mine' mode is explicitly just the user's category — don't expand it.
  const displayCategories = selectedCategory === 'mine'
    ? baseCategories
    : (baseCategories.includes(userCat) 
      ? baseCategories 
      : (plottableCategories.includes(userCat) ? [...baseCategories, userCat] : baseCategories));
  
  // Filter alwaysCurrent by selectedCategory (for the info message)
  const filteredAlwaysCurrent = selectedCategory === 'mine'
    ? []
    : selectedCategory === 'EB'
    ? alwaysCurrentCategories.filter(c => ebCategories.includes(c))
    : selectedCategory === 'F'
    ? alwaysCurrentCategories.filter(c => fCategories.includes(c))
    : alwaysCurrentCategories;

  const dualAxis = selectedCategory === 'all';

  // Safe date parse - 'C' returns special marker, NOT a fake future date
  const safeParseDate = (dateStr) => {
    if (!dateStr) return null;
    if (dateStr === 'C') return 'CURRENT'; // Special marker
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d;
  };

  // Get date range for a set of categories.
  // Y-axis strategy: CENTER on the user's own category + PD so the user's
  // personal story fits the chart. Other categories can extend slightly but
  // won't stretch the scale so much that the user's line squishes to an edge.
  // This matters for cases like India EB3 where EB1 sits near 2024 but EB3
  // sits at 2013 — without scoping, EB3 would be pinned to the bottom edge.
  const getDateRangeFor = (cats) => {
    const userCat = userCase.category;
    const userCatInCats = cats.includes(userCat);

    // Collect dates from USER'S category first (they drive the scale)
    const primaryDates = [];
    // Collect dates from OTHER categories (they're context, get clipped)
    const secondaryDates = [];

    historicalData.forEach(month => {
      cats.forEach(cat => {
        const d = safeParseDate(month.data[`${cat}-${country}`]);
        if (d && d !== 'CURRENT') {
          if (cat === userCat) primaryDates.push(d.getTime());
          else secondaryDates.push(d.getTime());
        }
      });
    });

    // User's PD always drives the scale — always in primary
    const pdDate = safeParseDate(userCase.priorityDate);
    if (pdDate && pdDate !== 'CURRENT') {
      primaryDates.push(pdDate.getTime());
    }

    // Forecast expected values — primary for user's cat, secondary otherwise
    cats.forEach(cat => {
      const categoryKey = `${cat}-${country}`;
      const latestData = historicalData[historicalData.length - 1].data[categoryKey];
      if (latestData === 'C') return;
      const latestDate = safeParseDate(latestData);
      const earliestDate = safeParseDate(historicalData[0].data[categoryKey]);
      if (!latestDate || latestDate === 'CURRENT') return;

      let actualEarliestDate = earliestDate;
      if (!actualEarliestDate || actualEarliestDate === 'CURRENT') {
        for (const m of historicalData) {
          const d = safeParseDate(m.data[categoryKey]);
          if (d && d !== 'CURRENT') { actualEarliestDate = d; break; }
        }
      }
      if (!actualEarliestDate || actualEarliestDate === 'CURRENT') return;

      const monthsElapsed = historicalData.length - 1;
      const totalProgress = latestDate.getTime() - actualEarliestDate.getTime();
      const avgProgressPerMonth = totalProgress / monthsElapsed;
      const bulletinMonth = bulletinAnchorDate(15).getTime();
      const maxForecastDate = bulletinMonth + forecastMonths * 30.44 * 24 * 60 * 60 * 1000;
      const expectedFuture = Math.min(
        latestDate.getTime() + avgProgressPerMonth * forecastMonths,
        maxForecastDate
      );
      if (!isNaN(expectedFuture) && isFinite(expectedFuture)) {
        if (cat === userCat) primaryDates.push(expectedFuture);
        else secondaryDates.push(expectedFuture);
      }
    });

    // If user's category is NOT in this set (e.g., showing EB for an F user),
    // fall back to using ALL dates — no user-centric scoping to apply.
    let dates;
    if (!userCatInCats || primaryDates.length === 0) {
      dates = [...primaryDates, ...secondaryDates];
    } else {
      // PRIMARY range drives the axis. SECONDARY dates expand the range only
      // up to a bounded amount (2x primary span in each direction) — enough
      // to show sibling category context but not so much they squish user's line.
      const pMin = Math.min(...primaryDates);
      const pMax = Math.max(...primaryDates);
      const pSpan = Math.max(pMax - pMin, 365 * 24 * 60 * 60 * 1000); // min 1y
      const secLimit = pSpan * 1.0; // let secondary expand range by at most pSpan on either side
      const allowedMin = pMin - secLimit;
      const allowedMax = pMax + secLimit;
      const clampedSecondary = secondaryDates.filter(d => d >= allowedMin && d <= allowedMax);
      dates = [...primaryDates, ...clampedSecondary];
    }

    if (dates.length === 0) {
      const today = new Date().getTime();
      return { min: today - 365 * 24 * 60 * 60 * 1000, max: today };
    }

    const min = Math.min(...dates);
    const max = Math.max(...dates);
    const span = max - min;

    const MS_PER_YEAR = 365 * 24 * 60 * 60 * 1000;
    const paddingMs = Math.max(span * 0.1, MS_PER_YEAR * 0.15);

    const rawMin = min - paddingMs;
    const rawMax = max + paddingMs;

    const minDate = new Date(rawMin);
    const maxDate = new Date(rawMax);

    const minQuarter = Math.floor(minDate.getMonth() / 3) * 3;
    const snappedMin = new Date(minDate.getFullYear(), minQuarter, 1).getTime();

    const maxQuarter = Math.floor(maxDate.getMonth() / 3) * 3 + 3;
    const snappedMax = new Date(maxDate.getFullYear(), maxQuarter, 1).getTime();

    return { min: snappedMin, max: snappedMax };
  };

  const ebRange = getDateRangeFor(ebCategories);
  const fRange = getDateRangeFor(fCategories);
  const singleRange = getDateRangeFor(displayCategories);

  // Chart dimensions - extended width for forecast zone
  const chartWidth = 600;
  const chartHeight = 384; // Bumped +34 to keep plot area unchanged after pad.bottom grew for 2nd pill
  const pad = { top: 30, right: dualAxis ? 50 : 20, bottom: 130, left: 32 }; // Bottom expanded to fit 2 pills (filing + approval) + hint

  // ==============================================
  // UNIFIED X-AXIS: treat ALL months (history + forecast) as one continuous timeline
  // No distinction between "history" and "forecast" in spacing logic
  // forecastMonths is dynamic (user-controlled via slider, 8-120 months)
  // ==============================================
  const TOTAL_MONTHS = historicalData.length + forecastMonths; // 12 + N months total
  const totalDrawWidth = chartWidth - pad.left - pad.right;
  const monthWidth = totalDrawWidth / (TOTAL_MONTHS - 1); // Distance between adjacent month centers
  
  // Universal X-scale: given a month slot index, return X coordinate
  const xScale = (monthSlot) => pad.left + monthSlot * monthWidth;
  
  // History zone: slots 0..(historicalData.length-1)
  const historyEndSlot = historicalData.length - 1; // 11 (= 26/5 bulletin month)
  const historyEndX = xScale(historyEndSlot);
  
  // Forecast zone: from historyEndSlot (line start) to historyEndSlot + forecastMonths
  const forecastStartSlot = historyEndSlot; // Line visually starts here
  const forecastStartX = xScale(forecastStartSlot);
  const forecastEndSlot = historyEndSlot + forecastMonths;
  const forecastEndX = xScale(forecastEndSlot);
  
  // Widths
  const historyWidth = monthWidth * historyEndSlot;
  const forecastWidth = monthWidth * forecastMonths;
  
  // "NOW" line: position at the LATEST bulletin month (slot 11 = May 2026).
  // This is the month reflected in the chart's most recent data.
  // Everything after this slot is forecast (future/projected).
  const nowX = xScale(historyEndSlot);
  const nowDate = new Date(2026, 4, 15); // May 2026 bulletin month

  // Y scale factory - CURRENT maps to top of chart (special zone)
  const CURRENT_Y_OFFSET = 10; // 距离顶部的像素
  const DATA_Y_MIN = 22; // 数据区最高点（留出Current zone条16px + 6px padding）

  // Pure y-scale (no clamp) - used for axis labels to ensure equal spacing
  const makeYScaleRaw = (range) => (dateStr) => {
    const d = safeParseDate(dateStr);
    if (!d) return null;
    if (d === 'CURRENT') return pad.top + CURRENT_Y_OFFSET;
    const normalized = (d.getTime() - range.min) / (range.max - range.min);
    return chartHeight - pad.bottom - normalized * (chartHeight - pad.top - pad.bottom);
  };

  // Clamped y-scale - used for drawing data points (prevents overflow)
  const makeYScale = (range) => (dateStr) => {
    const rawY = makeYScaleRaw(range)(dateStr);
    if (rawY === null) return null;
    const d = safeParseDate(dateStr);
    if (d === 'CURRENT') return rawY; // Current already at safe position
    return Math.max(pad.top + DATA_Y_MIN, Math.min(chartHeight - pad.bottom, rawY));
  };

  const yScaleEB = makeYScale(ebRange);
  const yScaleF = makeYScale(fRange);
  const yScaleSingle = makeYScale(singleRange);

  const getYScale = (category) => {
    if (!dualAxis) return yScaleSingle;
    return ebCategories.includes(category) ? yScaleEB : yScaleF;
  };

  // Y-axis labels generator - show every year with equal spacing
  const makeYAxisLabels = (range, yScale) => {
    const labels = [];
    const topReserved = pad.top + 22;
    const bottomLimit = chartHeight - pad.bottom;

    // Determine grain based on range span
    const spanMs = range.max - range.min;
    const spanMonths = spanMs / (30 * 24 * 60 * 60 * 1000);
    
    // Grain logic: 
    // ≤12 months → every month
    // ≤24 months → every 2 months (bi-monthly)
    // ≤60 months → every quarter (3 months)
    // ≤120 months → every half year (6 months)
    // ≤360 months (30y) → every year
    // ≤720 months (60y) → every 2 years
    // ≤1200 months (100y) → every 5 years
    // >1200 months → every 10 years
    let stepMonths;
    if (spanMonths <= 12) stepMonths = 1;
    else if (spanMonths <= 24) stepMonths = 2;
    else if (spanMonths <= 60) stepMonths = 3;
    else if (spanMonths <= 120) stepMonths = 6;
    else if (spanMonths <= 360) stepMonths = 12;
    else if (spanMonths <= 720) stepMonths = 24;
    else if (spanMonths <= 1200) stepMonths = 60;
    else stepMonths = 120;
    
    // Start from range.min's month, snap to step boundary
    const minDate = new Date(range.min);
    const startYear = minDate.getFullYear();
    const startMonth = minDate.getMonth();
    // Snap to step boundary (e.g. if step=3, snap to 0, 3, 6, 9)
    const snappedStartMonth = Math.floor(startMonth / stepMonths) * stepMonths;
    
    // Iterate through each step until we exceed range.max
    let curYear = startYear;
    let curMonth = snappedStartMonth;
    while (true) {
      const d = new Date(curYear, curMonth, 1);
      if (d.getTime() > range.max) break;
      
      const dateStr = `${curYear}-${String(curMonth + 1).padStart(2, '0')}-01`;
      const y = yScale(dateStr);
      if (y !== null && y >= topReserved && y <= bottomLimit) {
        // Label format: year for Jan, just month for others
        let labelText;
        if (curMonth === 0 || stepMonths >= 12) {
          labelText = `'${String(curYear).slice(-2)}`;
        } else {
          labelText = `${curMonth + 1}月`;
        }
        labels.push({ 
          year: curYear, 
          month: curMonth, 
          y, 
          label: labelText, 
          isYearStart: curMonth === 0 
        });
      }
      
      curMonth += stepMonths;
      while (curMonth >= 12) {
        curMonth -= 12;
        curYear += 1;
      }
      
      if (labels.length > 50) break; // safety - increased to allow more labels for wide ranges
    }
    
    // Filter out labels that are too close together (< 14px apart vertically)
    // Keep year-start labels preferentially when there's a conflict
    const MIN_Y_GAP = 14;
    const filtered = [];
    // Sort labels by y (top to bottom)
    labels.sort((a, b) => a.y - b.y);
    for (const lbl of labels) {
      if (filtered.length === 0) {
        filtered.push(lbl);
      } else {
        const last = filtered[filtered.length - 1];
        if (Math.abs(lbl.y - last.y) >= MIN_Y_GAP) {
          filtered.push(lbl);
        } else {
          // Conflict - prefer year-start labels
          if (lbl.isYearStart && !last.isYearStart) {
            filtered[filtered.length - 1] = lbl;
          }
        }
      }
    }
    return filtered;
  };

  const yScaleEBRaw = makeYScaleRaw(ebRange);
  const yScaleFRaw = makeYScaleRaw(fRange);
  const yScaleSingleRaw = makeYScaleRaw(singleRange);

  const yAxisLabelsLeft = dualAxis ? makeYAxisLabels(ebRange, yScaleEBRaw) : makeYAxisLabels(singleRange, yScaleSingleRaw);
  const yAxisLabelsRight = dualAxis ? makeYAxisLabels(fRange, yScaleFRaw) : [];

  // Compute forecast using HYBRID model (uses global LONG_TERM_RATES):
  // - First 12 months: use recent trend (responsive to current conditions)
  // - Beyond 12 months: gradually blend with historical long-term average
  const computeForecastForCategory = (cat) => {
    const categoryKey = `${cat}-${country}`;
    const latestData = historicalData[historicalData.length - 1].data[categoryKey];
    const earliestData = historicalData[0].data[categoryKey];

    // If latest is Current, just keep it current
    if (latestData === 'C') {
      return { isCurrent: true };
    }

    const latestDate = safeParseDate(latestData);
    const earliestDate = safeParseDate(earliestData);

    if (!latestDate || latestDate === 'CURRENT') return null;

    // Use first non-CURRENT date as earliest
    let actualEarliestDate = earliestDate;
    if (!actualEarliestDate || actualEarliestDate === 'CURRENT') {
      for (const m of historicalData) {
        const d = safeParseDate(m.data[categoryKey]);
        if (d && d !== 'CURRENT') {
          actualEarliestDate = d;
          break;
        }
      }
    }

    if (!actualEarliestDate || actualEarliestDate === 'CURRENT') return null;

    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const MS_PER_MONTH = 30.44 * MS_PER_DAY;
    
    // RECENT TREND: shared estimator, so this curve and the axis autofit agree.
    // Falls back to the span of whatever history is on screen when the archive can't
    // answer (e.g. a window reaching back past the 26 real bulletins).
    const monthsElapsed = historicalData.length - 1;
    const totalRecentProgress = latestDate.getTime() - actualEarliestDate.getTime();
    const recentDaysPerMonth = observedPaceFromArchive(cat, country)
      ?? ((totalRecentProgress / MS_PER_DAY) / monthsElapsed);
    
    // LONG-TERM RATE: historical average days per year (from 21-year AI model)
    const longTermDaysPerYear = getLongTermRate(cat, country);
    const catCountryKey = `${cat}-${country}`;
    
    // Use the global hybrid advance function (uses 3-layer rates from RATES_DB)
    // Multiplier depends on user-selected scenario (5 levels: lower pessimistic means less extreme stall)
    const SCENARIO_MULT = {
      optimistic: 1.5,
      somewhatOptimistic: 1.25,
      expected: 1.0,
      somewhatPessimistic: 0.75,
      pessimistic: 0.5,
    };
    const scenarioMultiplier = SCENARIO_MULT[scenario] || 1.0;
    
    const computeCumulativeAdvance = (monthN) => {
      const baseDays = computeHybridAdvance(recentDaysPerMonth, longTermDaysPerYear, monthN, catCountryKey);
      return baseDays * scenarioMultiplier * MS_PER_DAY;
    };
    
    // Use user-selected forecast range (from slider)
    const projectionMonths = forecastMonths;
    const expectedAdvance = computeCumulativeAdvance(projectionMonths);

    return {
      optimistic: latestDate.getTime() + expectedAdvance * (1.5 / scenarioMultiplier),
      somewhatOptimistic: latestDate.getTime() + expectedAdvance * (1.25 / scenarioMultiplier),
      expected: latestDate.getTime() + expectedAdvance * (1.0 / scenarioMultiplier),
      somewhatPessimistic: latestDate.getTime() + expectedAdvance * (0.75 / scenarioMultiplier),
      pessimistic: latestDate.getTime() + expectedAdvance * (0.5 / scenarioMultiplier),
      selected: latestDate.getTime() + expectedAdvance, // The line that will be drawn (per scenario)
      scenario,
      isCurrent: false,
      monthsProjected: projectionMonths,
      // Store the curve function for use when drawing the line
      computeAdvanceAt: computeCumulativeAdvance,
      // Raw formula inputs — exposed so popups can show the actual math
      recentDaysPerMonth,
      longTermDaysPerYear,
      scenarioMultiplier,
    };
  };

  // Forecast X positions (3 points in the forecast zone, starting from end of historical data)
  const forecastPoints = [
    forecastStartX + forecastWidth * 0.33,
    forecastStartX + forecastWidth * 0.66,
    forecastStartX + forecastWidth * 1.0
  ];

  const handlePointHover = (monthIndex, category) => {
    const month = historicalData[monthIndex];
    const dateStr = month.data[`${category}-${country}`];
    const d = safeParseDate(dateStr);
    setHoveredPoint({
      monthIndex, category,
      month: month.month,
      date: dateStr === 'C' ? (lang === 'en' ? 'Current' : '无排期') :
            (d && d !== 'CURRENT') ? d.toLocaleDateString(lang === 'en' ? 'en-US' : 'zh-CN', { year: 'numeric', month: 'short' }) : 'N/A',
      color: colors[category]
    });
  };

  const countryDisplay = userCase.country === 'China' ? (lang === 'tw' ? '中國大陸' : '中国大陆') :
                        userCase.country === 'Taiwan' ? '全球/港澳台' :
                        userCase.country === 'India' ? '印度' :
                        userCase.country === 'Mexico' ? '墨西哥' :
                        userCase.country === 'Philippines' ? (lang === 'tw' ? '菲律賓' : '菲律宾') :
                        userCase.country;

  // Detect if user's PD has already passed current cutoff — if so, the forecast
  // chart's main purpose (showing WHEN they'll be eligible) is moot. We show a
  // big banner instead; user can opt into the chart for historical context.
  const isAlreadyEligible = (() => {
    const pd = safeParseDate(userCase.priorityDate);
    if (!pd || pd === 'CURRENT') return false;
    const latestRaw = historicalData[historicalData.length - 1].data[`${userCase.category}-${country}`];
    if (latestRaw === 'C') return true;
    const ld = safeParseDate(latestRaw);
    if (!ld || ld === 'CURRENT') return false;
    return ld >= pd;
  })();

  // Reset "show chart anyway" when user's case changes (so a freshly-eligible
  // case gets the banner on first view rather than carrying over an old pref).
  useEffect(() => {
    setShowChartAnyway(false);
  }, [userCase.category, userCase.country, userCase.priorityDate]);

  return (
    <div style={{
      boxSizing: 'border-box',
      width: '100%',
      maxWidth: '100%',
      overflow: 'hidden',
      padding: '10px',
      background: terminalMode ? C.bg : 'var(--gc-surface)',
      border: terminalMode ? `1px solid ${C.frame}` : '1px solid var(--gc-rule)',
      borderRadius: terminalMode ? '2px' : 'var(--gc-radius-lg)',
      color: terminalMode ? C.text : 'inherit',
      transition: 'background 200ms, border-color 200ms',
    }}>
      {/* Title + terminal toggle row */}
      <div className="mb-2 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <h2 className="text-sm font-bold flex items-center gap-1.5"
              style={{ color: terminalMode ? C.text : 'var(--gc-ink)',
                       fontFamily: terminalMode ? 'ui-monospace, monospace' : 'inherit',
                       letterSpacing: terminalMode ? '0.04em' : 'normal' }}>
            <span>{terminalMode ? (lang === 'en' ? 'FORECAST' : '预测') : t.trendChart}</span>
          </h2>
          {/* Clean mono [AI] tag — replaces the animated purple/pink gradient */}
          <span style={{
            fontSize: '9px',
            fontWeight: 700,
            letterSpacing: '0.12em',
            padding: '2px 5px',
            border: `1px solid ${terminalMode ? C.axis : 'var(--gc-green)'}`,
            color: terminalMode ? C.nowText : 'var(--gc-green)',
            borderRadius: '2px',
            fontFamily: 'ui-monospace, monospace',
            lineHeight: 1,
          }}>
            AI
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] truncate"
                style={{ color: terminalMode ? C.textMuted : 'var(--gc-muted)',
                         fontFamily: terminalMode ? 'ui-monospace, monospace' : 'inherit' }}>
            <span className="gc-mono" style={{ fontWeight: 700 }}>
              {countryShortLabel(userCase.country, lang)}
            </span>
            {' · '}
            {lang === 'en' ? '12mo + forecast' : '12个月 + 预测'}
          </span>
        </div>
      </div>

      {/* When user is already eligible, the forecast chart's main message
          ("when will you be eligible") is moot. Show a bold banner by default
          and let the user opt into the historical chart if they want context. */}
      {isAlreadyEligible && !showChartAnyway && (
        <div style={{
          position: 'relative',
          padding: '40px 20px 36px',
          background: 'var(--gc-green-soft)',
          border: `1px solid var(--gc-green-border)`,
          borderRadius: 'var(--gc-radius-sm)',
          textAlign: 'center',
        }}>
          {/* Opt-in link — view the chart anyway (small, top-right) */}
          <button
            onClick={() => setShowChartAnyway(true)}
            style={{
              position: 'absolute', top: '10px', right: '10px',
              padding: '4px 8px',
              background: 'transparent',
              border: '1px solid var(--gc-green-border)',
              borderRadius: '2px',
              fontSize: '10px',
              fontWeight: 600,
              color: 'var(--gc-green-ink)',
              cursor: 'pointer',
              letterSpacing: '0.04em',
              transition: 'all 120ms',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--gc-green)';
              e.currentTarget.style.color = 'var(--gc-paper)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--gc-green-ink)';
            }}>
            {lang === 'en' ? 'View chart →' : lang === 'tw' ? '查看圖表 →' : '查看图表 →'}
          </button>
          {/* Big check-circle icon */}
          <div style={{
            width: '56px', height: '56px',
            margin: '0 auto 14px',
            borderRadius: '50%',
            background: 'var(--gc-green)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <CheckCircle2 size={32} strokeWidth={2.2} style={{ color: 'var(--gc-paper)' }} />
          </div>
          {/* Headline */}
          <h3 className="gc-serif" style={{
            fontSize: '24px',
            fontWeight: 700,
            color: 'var(--gc-green-ink)',
            margin: '0 0 6px',
            letterSpacing: '-0.01em',
            lineHeight: 1.15,
          }}>
            {lang === 'en' ? 'You can file now' : lang === 'tw' ? '排期已到' : '排期已到'}
          </h3>
          {/* Subtitle */}
          <p style={{
            fontSize: '12px',
            color: 'var(--gc-green-ink)',
            opacity: 0.85,
            margin: '0 auto',
            maxWidth: '280px',
            lineHeight: 1.5,
          }}>
            {lang === 'en'
              ? 'Your priority date has passed the current cutoff. Head to the I-485 timeline to start your filing.'
              : lang === 'tw'
              ? '你的優先日已過當前截止日,可以去 I-485 流程開始遞件。'
              : '你的优先日已过当前截止日,可以去 I-485 流程开始递件。'}
          </p>
        </div>
      )}

      {/* Chart content — hidden by default when user is already eligible */}
      {(!isAlreadyEligible || showChartAnyway) && (<>
      {/* Category Filter — terminal-aware */}
      <div className="flex items-center gap-1 mb-2 p-0.5 rounded-lg" style={{
        width: '100%',
        boxSizing: 'border-box',
        background: terminalMode ? C.cardBg : 'var(--gc-paper-soft)',
        border: terminalMode ? `1px solid ${C.frame}` : 'none',
        borderRadius: terminalMode ? '2px' : 'var(--gc-radius-sm)',
      }}>
        {['mine', 'EB', 'F', 'all'].map(key => {
          const active = selectedCategory === key;
          const label = key === 'mine' ? (lang === 'en' ? `Only ${userCat}` : lang === 'tw' ? `只看 ${userCat}` : `只看 ${userCat}`)
                      : key === 'EB' ? (lang === 'en' ? 'Employment' : '职业移民')
                      : key === 'F'  ? (lang === 'en' ? 'Family' : '亲属移民')
                      :                 (lang === 'en' ? 'All' : '全部');
          return (
            <button key={key} onClick={() => setSelectedCategory(key)}
              style={{
                flex: '1 1 0%', minWidth: 0, boxSizing: 'border-box',
                padding: '5px 4px',
                fontSize: '11px',
                fontWeight: active ? 700 : 600,
                borderRadius: terminalMode ? '2px' : 'var(--gc-radius-sm)',
                background: active
                  ? (terminalMode ? C.nowLine : 'var(--gc-surface)')
                  : 'transparent',
                color: active
                  ? (terminalMode ? C.bg : 'var(--gc-ink)')
                  : (terminalMode ? C.textMuted : 'var(--gc-muted)'),
                border: active && !terminalMode ? '1px solid var(--gc-rule)' : '1px solid transparent',
                boxShadow: active && !terminalMode ? '0 1px 2px rgba(0,0,0,0.04)' : 'none',
                fontFamily: terminalMode ? 'ui-monospace, monospace' : 'inherit',
                letterSpacing: terminalMode ? '0.04em' : 'normal',
                transition: 'all 120ms',
              }}
              className="truncate">
              {terminalMode ? label.toUpperCase() : label}
            </button>
          );
        })}
      </div>

      {/* Combined: Chart title + Legend — terminal-aware text colors */}
      <div className="mb-0.5 px-0.5 flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-semibold flex-shrink-0"
              style={{ color: terminalMode ? C.nowText : 'var(--gc-blue)',
                       fontFamily: terminalMode ? 'ui-monospace, monospace' : 'inherit',
                       letterSpacing: terminalMode ? '0.08em' : 'normal' }}>
          {terminalMode ? (lang === 'en' ? 'TABLE·A' : 'A表') : (lang === 'en' ? 'Table A' : '表A')}
        </span>
        <span className="text-[10px] flex-shrink-0" style={{ color: terminalMode ? C.axis : 'var(--gc-muted-soft)' }}>·</span>
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          {displayCategories.map((cat) => (
            <span key={cat} className="flex items-center gap-0.5 flex-shrink-0">
              <span style={{
                display: 'inline-block',
                width: 10, height: 2,
                backgroundColor: colors[cat],
                borderRadius: 1
              }}></span>
              <span className="text-[10px] font-semibold"
                    style={{ color: colors[cat],
                             fontFamily: terminalMode ? 'ui-monospace, monospace' : 'inherit' }}>{cat}</span>
            </span>
          ))}
        </div>
        <span className="text-[9px] flex-shrink-0 ml-auto"
              style={{ color: terminalMode ? C.textMuted : 'var(--gc-muted)',
                       fontFamily: terminalMode ? 'ui-monospace, monospace' : 'inherit' }}>
          {terminalMode
            ? (countryShortLabel(userCase.country, lang))
            : (country === 'China' ? '中国大陆' :
               country === 'India' ? '印度' :
               country === 'Other' ? (lang === 'en' ? 'Others' : '全球/其他') :
               country)}
        </span>
      </div>

      {/* Line-style legend: solid vs dotted */}
      <div className="mb-1.5 px-0.5 flex items-center gap-3 text-[9px]"
           style={{ color: terminalMode ? C.textMuted : 'var(--gc-muted)' }}>
        <span className="flex items-center gap-1">
          <svg width="16" height="4"><line x1="0" y1="2" x2="16" y2="2" stroke={terminalMode ? C.text : "#475569"} strokeWidth="2" strokeLinecap="round" /></svg>
          <span style={{ fontFamily: terminalMode ? 'ui-monospace, monospace' : 'inherit' }}>
            {lang === 'en' ? 'backlog progress' : '有排期推进'}
          </span>
        </span>
        <span className="flex items-center gap-1">
          <svg width="16" height="4"><line x1="0" y1="2" x2="16" y2="2" stroke={terminalMode ? C.axisMuted : "#cbd5e1"} strokeWidth="1" strokeDasharray="1,3" strokeLinecap="round" /></svg>
          <span style={{ color: terminalMode ? C.textMuted : 'var(--gc-muted-soft)',
                         fontFamily: terminalMode ? 'ui-monospace, monospace' : 'inherit' }}>
            {lang === 'en' ? 'current (no wait)' : '无排期期间'}
          </span>
        </span>
      </div>

      {/* Dual-axis indicator */}
      {dualAxis && (
        <div className="flex items-center justify-between mb-1 text-[10px] px-2">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm" style={{ background: terminalMode ? C.nowLine : '#3b82f6' }}></span>
            <span style={{ color: terminalMode ? C.textMuted : 'var(--gc-muted)',
                           fontFamily: terminalMode ? 'ui-monospace, monospace' : 'inherit' }}>
              {lang === 'en' ? 'EB (left)' : 'EB (左轴)'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span style={{ color: terminalMode ? C.textMuted : 'var(--gc-muted)',
                           fontFamily: terminalMode ? 'ui-monospace, monospace' : 'inherit' }}>
              {lang === 'en' ? 'F (right)' : 'F (右轴)'}
            </span>
            <span className="w-2 h-2 rounded-sm" style={{ background: terminalMode ? C.nowText : '#f59e0b' }}></span>
          </div>
        </div>
      )}
      
      {/* Always-Current categories info (shown when some categories are hidden from chart) */}
      {filteredAlwaysCurrent.length > 0 && (
        <div className="mb-2 mx-2 px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-md flex items-center gap-1.5 flex-wrap">
          <CheckCircle2 size={11} className="text-emerald-600 flex-shrink-0" />
          <span className="text-[10px] text-emerald-700 font-semibold">
            {lang === 'en' ? 'Always Current:' : '一直无排期:'}
          </span>
          {filteredAlwaysCurrent.map((cat, idx) => (
            <React.Fragment key={cat}>
              <span className="text-[10px] font-bold" style={{ color: colors[cat] }}>{cat}</span>
              {idx < filteredAlwaysCurrent.length - 1 && <span className="text-emerald-400">·</span>}
            </React.Fragment>
          ))}
          <span className="text-[9px] text-emerald-600 ml-1">
            ({lang === 'en' ? 'no wait for your country' : '你的出生国无需等待'})
          </span>
        </div>
      )}

      {/* SVG Chart with forecast zone (only render if there are categories to plot) */}
      {displayCategories.length === 0 ? (
        <div className="p-8 text-center bg-emerald-50 border-2 border-dashed border-emerald-200 rounded-xl">
          <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2" />
          <div className="text-sm font-bold text-emerald-900 mb-1">
            {lang === 'en' ? 'All Current for your country!' : '你的出生国所有类别都无排期！'}
          </div>
          <p className="text-xs text-emerald-700">
            {lang === 'en' 
              ? 'No wait times to display for the selected filter.' 
              : '当前筛选下没有需要等待的类别。'}
          </p>
        </div>
      ) : (
      <div className="relative" style={{ width: '100%', overflow: 'hidden' }}>
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`}
             preserveAspectRatio="xMidYMid meet"
             style={{ 
               width: '100%',
               height: 'auto',
               maxWidth: '100%',
               display: 'block',
               touchAction: 'pan-y' 
             }}
             onTouchStart={(e) => {
               e.preventDefault();
               // If the crossover popup is currently open, treat any tap on the chart as "dismiss"
               // rather than registering a new hover. This keeps popups mutually exclusive.
               if (showCrossoverInfo) {
                 setShowCrossoverInfo(false);
                 return;
               }
               const svgEl = e.currentTarget;
               const rect = svgEl.getBoundingClientRect();
               const touch = e.touches[0];
               // Convert touch position to SVG viewBox coordinates
               const svgX = ((touch.clientX - rect.left) / rect.width) * chartWidth;

               // Determine if touch is in historical zone or forecast zone
               if (svgX >= pad.left && svgX < forecastStartX) {
                 // Historical zone - find closest month index
                 const relativeX = svgX - pad.left;
                 const monthIdx = Math.round((relativeX / historyWidth) * (historicalData.length - 1));
                 const clampedIdx = Math.max(0, Math.min(historicalData.length - 1, monthIdx));
                 setHoveredMonthIndex(clampedIdx);
                 setHoveredForecast(null);
               } else if (svgX >= forecastStartX && svgX <= forecastStartX + forecastWidth) {
                 // Forecast zone - find month offset (1-8)
                 const relativeX = svgX - forecastStartX;
                 // Use actual forecastMonths (dynamic via slider) instead of hardcoded 8
                 const monthOffset = Math.max(1, Math.min(forecastMonths, Math.ceil((relativeX / forecastWidth) * forecastMonths)));
                 const xCenter = xScale(historyEndSlot + monthOffset);
                 setHoveredForecast({ x: xCenter, monthOffset });
                 setHoveredMonthIndex(null);
               }
             }}
             onTouchMove={(e) => {
               e.preventDefault();
               if (showCrossoverInfo) return; // Crossover popup open — don't track hover
               const svgEl = e.currentTarget;
               const rect = svgEl.getBoundingClientRect();
               const touch = e.touches[0];
               const svgX = ((touch.clientX - rect.left) / rect.width) * chartWidth;

               if (svgX >= pad.left && svgX < forecastStartX) {
                 const relativeX = svgX - pad.left;
                 const monthIdx = Math.round((relativeX / historyWidth) * (historicalData.length - 1));
                 const clampedIdx = Math.max(0, Math.min(historicalData.length - 1, monthIdx));
                 setHoveredMonthIndex(clampedIdx);
                 setHoveredForecast(null);
               } else if (svgX >= forecastStartX && svgX <= forecastStartX + forecastWidth) {
                 const relativeX = svgX - forecastStartX;
                 // Use actual forecastMonths (dynamic via slider) instead of hardcoded 8
                 const monthOffset = Math.max(1, Math.min(forecastMonths, Math.ceil((relativeX / forecastWidth) * forecastMonths)));
                 const xCenter = xScale(historyEndSlot + monthOffset);
                 setHoveredForecast({ x: xCenter, monthOffset });
                 setHoveredMonthIndex(null);
               }
             }}
             onTouchEnd={() => {
               // Keep the highlight visible - don't clear on touchEnd
               // User can tap elsewhere to change it
             }}
             onMouseMove={(e) => {
               // Desktop: also support mouse drag/hover
               if (showCrossoverInfo) return; // Crossover popup open — don't track hover
               const svgEl = e.currentTarget;
               const rect = svgEl.getBoundingClientRect();
               const svgX = ((e.clientX - rect.left) / rect.width) * chartWidth;

               if (svgX >= pad.left && svgX < forecastStartX) {
                 const relativeX = svgX - pad.left;
                 const monthIdx = Math.round((relativeX / historyWidth) * (historicalData.length - 1));
                 const clampedIdx = Math.max(0, Math.min(historicalData.length - 1, monthIdx));
                 setHoveredMonthIndex(clampedIdx);
                 setHoveredForecast(null);
               } else if (svgX >= forecastStartX && svgX <= forecastStartX + forecastWidth) {
                 const relativeX = svgX - forecastStartX;
                 // Use actual forecastMonths (dynamic via slider) instead of hardcoded 8
                 const monthOffset = Math.max(1, Math.min(forecastMonths, Math.ceil((relativeX / forecastWidth) * forecastMonths)));
                 const xCenter = xScale(historyEndSlot + monthOffset);
                 setHoveredForecast({ x: xCenter, monthOffset });
                 setHoveredMonthIndex(null);
               }
             }}
             onMouseLeave={() => {
               setHoveredMonthIndex(null);
               setHoveredForecast(null);
             }}>

          {/* Unified background - one single plotting area */}
          <rect x={pad.left} y={pad.top}
            width={chartWidth - pad.left - pad.right}
            height={chartHeight - pad.top - pad.bottom}
            fill={C.bg} stroke={C.frame} strokeWidth="1" />

          {/* Forecast zone - subtle green tint overlay. 
              Starts at slot 12 (26/6) since slot 11 (26/5) is still real historical data */}
          <rect x={xScale(historyEndSlot + 1)} y={pad.top}
            width={xScale(forecastEndSlot) - xScale(historyEndSlot + 1)}
            height={chartHeight - pad.top - pad.bottom}
            fill={C.forecastZone} fillOpacity={terminalMode ? "1" : "0.4"} />

          {/* Forecast zone label */}
          <text x={xScale(forecastEndSlot) - 6} y={pad.top + 11}
            textAnchor="end" fontSize="8" fill={C.nowText} fontWeight="600"
            fontFamily={terminalMode ? "ui-monospace, monospace" : "inherit"}
            letterSpacing={terminalMode ? "0.1em" : "normal"}>
            {terminalMode ? (lang === 'en' ? 'FORECAST' : '预测区') : (lang === 'en' ? 'Forecast' : '预测区')}
          </text>

          {/* Y-axis grid lines */}
          {yAxisLabelsLeft.map(label => (
            <g key={`left-${label.year}-${label.month || 0}`}>
              <line x1={pad.left} y1={label.y} x2={chartWidth - pad.right} y2={label.y}
                stroke={label.isYearStart ? C.gridMajor : C.gridMinor} strokeWidth="1" 
                strokeDasharray={label.isYearStart ? "3,2" : "1,3"} 
                opacity={label.isYearStart ? "0.8" : "0.5"} />
              <text x={pad.left - 5} y={label.y + 3} textAnchor="end" fontSize="9"
                    fill={dualAxis ? "#3b82f6" : (label.isYearStart ? C.text : C.textMuted)} 
                    fontWeight={label.isYearStart ? "700" : "400"}
                    fontFamily={terminalMode ? "ui-monospace, monospace" : "inherit"}>
                {label.label}
              </text>
            </g>
          ))}

          {dualAxis && yAxisLabelsRight.map(label => (
            <g key={`right-${label.year}-${label.month || 0}`}>
              <text x={chartWidth - pad.right + 5} y={label.y + 3} textAnchor="start" fontSize="9"
                    fill="#f59e0b" fontWeight={label.isYearStart ? "700" : "400"}
                    fontFamily={terminalMode ? "ui-monospace, monospace" : "inherit"}>
                {label.label}
              </text>
            </g>
          ))}

          {/* NOW vertical line at today's position */}
          <line x1={nowX} y1={pad.top} x2={nowX} y2={chartHeight - pad.bottom}
            stroke={C.nowLine} strokeWidth={terminalMode ? "1.5" : "2.5"} strokeDasharray="5,3" opacity="0.95" />
          <text x={nowX} y={pad.top - 4}
            textAnchor="middle" fontSize="10" fill={C.nowText} fontWeight="700"
            fontFamily={terminalMode ? "ui-monospace, monospace" : "inherit"}
            letterSpacing={terminalMode ? "0.12em" : "normal"}>
            {terminalMode ? (lang === 'en' ? 'NOW' : 'NOW') : (lang === 'en' ? 'NOW' : '现在')}
          </text>

          {/* User's Priority Date horizontal line - shows how far user needs to go */}
          {(() => {
            const pdDateStr = userCase.priorityDate;
            if (!pdDateStr) return null;
            
            // Use the yScale of user's own category (or default if not in display)
            const userCatYScale = getYScale(userCase.category);
            const userPdY = userCatYScale(pdDateStr);
            
            if (userPdY === null || userPdY === undefined) return null;
            // Only draw if within visible range
            if (userPdY < pad.top || userPdY > chartHeight - pad.bottom) return null;

            // Try to compute where this user's crossover X sits.
            // If computable, the "Your PD" label will attach there instead of floating
            // at the far right edge — the label follows the crossover point.
            let crossoverX = null;
            try {
              const pdDate = safeParseDate(pdDateStr);
              const latestRaw = historicalData[historicalData.length - 1].data[`${userCase.category}-${country}`];
              const latestDate = safeParseDate(latestRaw);
              if (pdDate && pdDate !== 'CURRENT' && latestDate && latestDate !== 'CURRENT' && latestDate < pdDate) {
                const fc = computeForecastForCategory(userCase.category);
                if (fc && !fc.isCurrent && fc.computeAdvanceAt) {
                  const targetMs = pdDate.getTime() - latestDate.getTime();
                  const maxAdv = fc.computeAdvanceAt(forecastMonths);
                  if (maxAdv >= targetMs) {
                    let lo = 0, hi = forecastMonths;
                    for (let iter = 0; iter < 30; iter++) {
                      const mid = (lo + hi) / 2;
                      if (fc.computeAdvanceAt(mid) < targetMs) lo = mid;
                      else hi = mid;
                      if (hi - lo < 0.01) break;
                    }
                    const monthsToReach = (lo + hi) / 2;
                    crossoverX = xScale(historyEndSlot + monthsToReach);
                  }
                }
              }
            } catch (e) { /* noop */ }

            return (
              <g>
                {/* Horizontal dashed line at user's PD level.
                    Trims at crossoverX if known — past the crossover point, the line
                    has no informational value (the forecast has already reached PD).
                    Extending further is just visual noise. */}
                <line x1={pad.left} y1={userPdY} 
                  x2={crossoverX !== null ? crossoverX : chartWidth - pad.right} y2={userPdY}
                  stroke={C.pdLine} strokeWidth="1.5" strokeDasharray="4,3" opacity={terminalMode ? "0.85" : "0.7"} />
                {/* Label — larger, theme-green, attached to crossover point if we know where it is.
                    Falls back to right edge if no crossover (e.g. PD already reached, or never). */}
                {(() => {
                  const labelText = lang === 'en' ? 'Your PD' : '你的优先日';
                  // Approximate width needed for the text (at 11px font, Chinese avg ~11.5px/char, English ~6.5)
                  const approxTextWidth = lang === 'en'
                    ? labelText.length * 6.5 + 14
                    : labelText.length * 11.5 + 14;
                  const badgeW = Math.max(70, approxTextWidth);
                  const badgeH = 18;
                  // Vertical placement: badge sits ABOVE PD line by default to avoid
                  // overlapping with both the dashed PD line AND the forecast curve
                  // (which converges on PD from below-left). Connector line links
                  // the badge down to the crossover marker.
                  // Edge cases:
                  //   - If PD is near chart top → place below (would clip otherwise)
                  //   - If PD is near chart bottom → place above (might overlap with
                  //     historical data but cleaner than clipping)
                  const GAP = 6;
                  const tooCloseToTop = userPdY < pad.top + badgeH + GAP + 2;
                  const placeAbove = !tooCloseToTop;
                  const badgeY = placeAbove
                    ? userPdY - badgeH - GAP   // badge above PD line (with gap)
                    : userPdY + GAP;            // badge below PD line (fallback)
                  const textY = badgeY + badgeH / 2 + 4;
                  // Horizontal: attach to crossover if known, otherwise right edge.
                  // When placed ABOVE and crossover exists, center the badge on the
                  // crossover X (with a connector line); otherwise fall back to side-placement.
                  let badgeX;
                  let connectorX = null; // x-coord of vertical connector line, null if no connector
                  if (crossoverX !== null) {
                    // Center above crossover for cleanest visual flag pattern
                    const centeredX = crossoverX - badgeW / 2;
                    if (centeredX >= pad.left && centeredX + badgeW <= chartWidth - pad.right) {
                      badgeX = centeredX;
                      connectorX = crossoverX;
                    } else if (centeredX + badgeW > chartWidth - pad.right) {
                      // Would clip right edge — anchor to right, connect from nearest edge
                      badgeX = chartWidth - pad.right - badgeW;
                      connectorX = Math.min(crossoverX, badgeX + badgeW - 6);
                    } else {
                      badgeX = pad.left;
                      connectorX = Math.max(crossoverX, badgeX + 6);
                    }
                  } else {
                    badgeX = chartWidth - pad.right - badgeW;
                  }
                  return (
                    <g>
                      {/* Vertical connector line from badge to PD line (if we have a crossover).
                          Only drawn when badge is NOT overlapping with PD line already. */}
                      {connectorX !== null && placeAbove && (
                        <line
                          x1={connectorX} y1={badgeY + badgeH}
                          x2={connectorX} y2={userPdY}
                          stroke={terminalMode ? C.pdBadge : 'var(--gc-green)'}
                          strokeWidth="1.5"
                          opacity="0.6" />
                      )}
                      {connectorX !== null && !placeAbove && (
                        <line
                          x1={connectorX} y1={userPdY}
                          x2={connectorX} y2={badgeY}
                          stroke={terminalMode ? C.pdBadge : 'var(--gc-green)'}
                          strokeWidth="1.5"
                          opacity="0.6" />
                      )}
                      {/* Badge background — theme green */}
                      <rect x={badgeX} y={badgeY}
                        width={badgeW} height={badgeH} rx={terminalMode ? "0" : "3"}
                        fill={terminalMode ? C.pdBadge : 'var(--gc-green)'}
                        stroke={terminalMode ? "none" : 'var(--gc-green-ink)'}
                        strokeWidth="0.5"
                        opacity="0.98" />
                      <text x={badgeX + badgeW / 2} y={textY}
                        textAnchor="middle" fontSize="11"
                        fill={terminalMode ? C.bg : 'var(--gc-paper)'}
                        fontWeight="700"
                        fontFamily={terminalMode ? "ui-monospace, monospace" : "inherit"}
                        letterSpacing={terminalMode ? "0.06em" : "0.02em"}>
                        {terminalMode ? (lang === 'en' ? 'YOUR PD' : 'YOUR PD') : labelText}
                      </text>
                    </g>
                  );
                })()}
              </g>
            );
          })()}

          {/* Estimated "eligible to file" date - where user's category forecast crosses PD line */}
          {(() => {
            const pdDateStr = userCase.priorityDate;
            if (!pdDateStr) return null;
            const pdDate = safeParseDate(pdDateStr);
            if (!pdDate || pdDate === 'CURRENT') return null;
            
            const userCat = userCase.category;
            const categoryKey = `${userCat}-${country}`;
            const latestData = historicalData[historicalData.length - 1].data[categoryKey];
            
            // If user's category is already Current or PD already reached, no need for crossover line
            if (latestData === 'C') return null;
            const latestDate = safeParseDate(latestData);
            if (!latestDate || latestDate === 'CURRENT') return null;
            if (latestDate >= pdDate) return null; // PD already reached
            
            // Compute forecast for user's category
            const forecast = computeForecastForCategory(userCat);
            if (!forecast || forecast.isCurrent) return null;
            
            // NEW: Find crossover by searching the NON-LINEAR forecast curve
            // Binary search for the month where projected date === pd
            const computeAdvanceAt = forecast.computeAdvanceAt;
            if (!computeAdvanceAt) return null;
            
            const targetAdvanceMs = pdDate.getTime() - latestDate.getTime();
            if (targetAdvanceMs <= 0) return null;
            
            // Binary search: find month M such that computeAdvanceAt(M) == targetAdvanceMs
            let lo = 0, hi = forecastMonths;
            // First, check if the target is reachable within forecast range
            const maxAdvance = computeAdvanceAt(forecastMonths);
            if (maxAdvance < targetAdvanceMs) return null; // Never reaches PD in this range
            
            for (let iter = 0; iter < 30; iter++) {
              const mid = (lo + hi) / 2;
              const advance = computeAdvanceAt(mid);
              if (advance < targetAdvanceMs) lo = mid;
              else hi = mid;
              if (hi - lo < 0.01) break;
            }
            const monthsToReach = (lo + hi) / 2;
            
            if (monthsToReach <= 0 || monthsToReach > forecastMonths) return null;
            
            // Position X at this month slot
            const crossoverSlot = historyEndSlot + monthsToReach;
            const crossoverX = xScale(crossoverSlot);
            
            // Calculate the estimated calendar date
            const bulletinMonth = bulletinAnchorDate(15);
            const crossoverCalDate = new Date(bulletinMonth);
            const wholeMonths = Math.floor(monthsToReach);
            const fractionalDays = (monthsToReach - wholeMonths) * 30;
            crossoverCalDate.setMonth(crossoverCalDate.getMonth() + wholeMonths);
            crossoverCalDate.setDate(crossoverCalDate.getDate() + Math.round(fractionalDays));
            // Readable "41年10月" / "Oct '41", not the cryptic "41/10" two-digit slash form.
            const crossoverLabel = lang === 'en'
              ? `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][crossoverCalDate.getMonth()]} '${String(crossoverCalDate.getFullYear()).slice(-2)}`
              : `${String(crossoverCalDate.getFullYear()).slice(-2)}年${crossoverCalDate.getMonth() + 1}月`;

            // APPROVAL DATE ESTIMATE — mirrors Overview's I-485 card approval logic EXACTLY
            // so both views show the same range. The Overview calc is:
            //   1. Find anchor: latest done step with stepActualDates entry
            //   2. effectiveBaseline = anchor.date - anchor.estimatedDays
            //      (or filingBaseline if no anchor)
            //   3. Range from baseline: estMin..estMax * speedMult
            //   4. A-gate floor: aCurrentDate + progressBuffer * speedMult
            //   5. Take max of (baseline-based, A-gate-based)
            const speedMult = { fast: 0.75, average: 1.0, slow: 1.35 }[i485ServiceCenter] || 1.0;
            const stepsDone = completedI485Steps.length;

            // Step metadata — duplicated from Overview; if changed, update both
            const I485_STEP_IDS = ['receipt', 'biometrics', 'ead', 'ap', 'interview', 'approval'];
            const STEP_ESTIMATED_DAYS = { receipt: 14, biometrics: 60, ead: 120, ap: 150, interview: 365, approval: 330 };
            const APPROVAL_EST_MIN = 180;
            const APPROVAL_EST_MAX = 450;

            // Find anchor (latest done step with actual date entered)
            let effectiveBaseline = null;
            for (let i = I485_STEP_IDS.length - 1; i >= 0; i--) {
              const id = I485_STEP_IDS[i];
              if (completedI485Steps.includes(id) && stepActualDates[id]) {
                const anchorDate = new Date(stepActualDates[id]);
                effectiveBaseline = new Date(anchorDate.getTime() - STEP_ESTIMATED_DAYS[id] * 86400000);
                break;
              }
            }
            // If no anchor, use today as filing proxy (user can file soon when B current)
            if (!effectiveBaseline) effectiveBaseline = new Date();

            // Base range from effectiveBaseline + approval estimates
            let earliestApproval = new Date(effectiveBaseline.getTime() + Math.round(APPROVAL_EST_MIN * speedMult) * 86400000);
            let latestApproval   = new Date(effectiveBaseline.getTime() + Math.round(APPROVAL_EST_MAX * speedMult) * 86400000);

            // A-gate: approval can't happen until A is current (= crossoverCalDate) + progress buffer
            // Progress-scaled: further along in I-485 → shorter post-A buffer
            const progressBufferMin = [180, 150, 120, 80, 50, 20][stepsDone] || 180;
            const progressBufferMax = [330, 280, 220, 160, 100, 60][stepsDone] || 330;
            const postAMin = new Date(crossoverCalDate.getTime() + Math.round(progressBufferMin * speedMult) * 86400000);
            const postAMax = new Date(crossoverCalDate.getTime() + Math.round(progressBufferMax * speedMult) * 86400000);
            if (postAMin.getTime() > earliestApproval.getTime()) earliestApproval = postAMin;
            if (postAMax.getTime() > latestApproval.getTime())   latestApproval = postAMax;

            // If user entered actual approval date, collapse to that single point
            if (stepActualDates.approval) {
              const actual = new Date(stepActualDates.approval);
              earliestApproval = actual;
              latestApproval = actual;
            }

            // For the small chart pill, show a RANGE directly ("27年3–5月"), readable
            // year-month words instead of the cryptic YY/M slash form. Same-year ranges
            // collapse the year so the text still fits the 144px pill.
            const enMon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            const fmtYM = (d) => lang === 'en'
              ? `${enMon[d.getMonth()]} '${String(d.getFullYear()).slice(-2)}`
              : `${String(d.getFullYear()).slice(-2)}年${d.getMonth() + 1}月`;
            const approvalLabel = (() => {
              const a = earliestApproval, b = latestApproval;
              if (a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()) return fmtYM(a);
              if (a.getFullYear() === b.getFullYear()) {
                return lang === 'en'
                  ? `${enMon[a.getMonth()]}–${enMon[b.getMonth()]} '${String(a.getFullYear()).slice(-2)}`
                  : `${String(a.getFullYear()).slice(-2)}年${a.getMonth() + 1}–${b.getMonth() + 1}月`;
              }
              return `${fmtYM(a)}–${fmtYM(b)}`;
            })();
            // If the user has already completed the approval step in Overview,
            // celebrate that instead of showing a forecast.
            const alreadyApproved = completedI485Steps.includes('approval');
            const speedSuffix = i485ServiceCenter === 'fast'
              ? (lang === 'en' ? ' (fast SC)' : '(快)')
              : i485ServiceCenter === 'slow'
              ? (lang === 'en' ? ' (slow SC)' : '(慢)')
              : '';
            
            return (
              <g>
                {/* Vertical crossover line — only the LOWER half (below PD level).
                    The upper half is redundant now: badge + connector + dot already
                    triple-mark the crossover point above. Keeping the lower half
                    visually tethers the crossover dot to the pill below the chart. */}
                <line x1={crossoverX} y1={getYScale(userCat)(userCase.priorityDate)} 
                  x2={crossoverX} y2={chartHeight - pad.bottom}
                  stroke={C.crossover} strokeWidth="2" strokeDasharray="4,3" opacity="0.9" 
                  style={{ pointerEvents: 'none' }} />
                {/* Crossover point marker - not clickable */}
                <circle cx={crossoverX} cy={getYScale(userCat)(userCase.priorityDate)}
                  r="5" fill={C.crossover} stroke={terminalMode ? C.bg : "white"} strokeWidth="2" 
                  style={{ pointerEvents: 'none' }} />
                {/* Clickable pill — editorial design, theme-aware color (achievement, not warning) */}
                <g 
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setShowCrossoverInfo(!showCrossoverInfo);
                    setHoveredMonthIndex(null);
                    setHoveredForecast(null);
                  }}
                  onTouchStart={(e) => { 
                    e.stopPropagation(); 
                    e.preventDefault();
                    setShowCrossoverInfo(!showCrossoverInfo);
                    setHoveredMonthIndex(null);
                    setHoveredForecast(null);
                  }}>
                  {/* Invisible hit area — big for thumb, covers BOTH pills now */}
                  <rect x={crossoverX - 100} y={chartHeight - pad.bottom + 34} 
                    width="200" height="82" rx="4"
                    fill="transparent" />
                  {/* Thin "flagpole" line from crossover point down to the first pill — visual tether */}
                  <line x1={crossoverX} y1={getYScale(userCat)(userCase.priorityDate)}
                        x2={crossoverX} y2={chartHeight - pad.bottom + 42}
                        stroke={C.crossover} strokeWidth="1" strokeDasharray="1,2" opacity="0.4"
                        style={{ pointerEvents: 'none' }} />
                  {/* PILL 1 — Filing / 可递件 */}
                  <rect x={crossoverX - 72} y={chartHeight - pad.bottom + 46} 
                    width="144" height="26" 
                    rx={terminalMode ? "1" : "3"}
                    fill={C.crossoverBadge}
                    stroke={terminalMode ? C.bg : C.crossoverBadge}
                    strokeWidth="1" />
                  {/* Tiny dot — echoes the crossover point on the chart */}
                  <circle cx={crossoverX - 58} cy={chartHeight - pad.bottom + 59}
                          r="3" fill={C.crossoverText}
                          style={{ pointerEvents: 'none' }} />
                  <text x={crossoverX - 4} y={chartHeight - pad.bottom + 63}
                    textAnchor="middle" fontSize="11.5"
                    fill={C.crossoverText} fontWeight="700"
                    fontFamily={terminalMode ? "ui-monospace, monospace" : "inherit"}
                    letterSpacing={terminalMode ? "0.04em" : "0.005em"}
                    style={{ pointerEvents: 'none' }}>
                    {lang === 'en' ? `Eligible ~${crossoverLabel}` : `预计 ${crossoverLabel} 可递`}
                  </text>
                  <g transform={`translate(${crossoverX + 60}, ${chartHeight - pad.bottom + 59})`}
                     style={{ pointerEvents: 'none' }}>
                    <path d="M -2.5 -3.5 L 1.5 0 L -2.5 3.5"
                          stroke={C.crossoverText} strokeWidth="1.6" fill="none"
                          strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
                  </g>

                  {/* PILL 2 — Final GC approval / 拿到绿卡 — OUTLINED variant to differentiate.
                      Same width + position, 6px below the filing pill. */}
                  <rect x={crossoverX - 72} y={chartHeight - pad.bottom + 78} 
                    width="144" height="26" 
                    rx={terminalMode ? "1" : "3"}
                    fill={terminalMode ? C.bg : 'var(--gc-paper)'}
                    stroke={C.crossoverBadge}
                    strokeWidth="1.25" />
                  {/* Tiny hollow circle marker */}
                  <circle cx={crossoverX - 58} cy={chartHeight - pad.bottom + 91}
                          r="3" fill={terminalMode ? C.bg : 'var(--gc-paper)'}
                          stroke={C.crossoverBadge} strokeWidth="1.5"
                          style={{ pointerEvents: 'none' }} />
                  <text x={crossoverX - 4} y={chartHeight - pad.bottom + 95}
                    textAnchor="middle" fontSize="11.5"
                    fill={C.crossoverBadge} fontWeight="700"
                    fontFamily={terminalMode ? "ui-monospace, monospace" : "inherit"}
                    letterSpacing={terminalMode ? "0.04em" : "0.005em"}
                    style={{ pointerEvents: 'none' }}>
                    {alreadyApproved
                      ? (lang === 'en' ? '✓ Approved' : '✓ 已获批')
                      : (lang === 'en' ? `GC ${approvalLabel}` : `预计 ${approvalLabel} 获批`)}
                  </text>

                  {/* Hint — editorial small-caps, theme-aware — moved down for 2nd pill */}
                  <text x={crossoverX} y={chartHeight - pad.bottom + 118}
                    textAnchor="middle" fontSize="8.5"
                    fill={terminalMode ? C.crossover : 'var(--gc-muted)'}
                    fontWeight="600"
                    fontFamily={terminalMode ? "ui-monospace, monospace" : "inherit"}
                    letterSpacing="0.14em"
                    style={{ pointerEvents: 'none' }}>
                    {lang === 'en' ? `FILING + I-485${speedSuffix} · TAP` : `递件 + I-485${speedSuffix} · 点击查看`}
                  </text>
                </g>
              </g>
            );
          })()}

          {/* "Already eligible" badge — shown when PD has already passed cutoff.
              Replaces the crossover pill which doesn't apply in this case. */}
          {(() => {
            const pdDateStr = userCase.priorityDate;
            if (!pdDateStr) return null;
            const pdDate = safeParseDate(pdDateStr);
            if (!pdDate || pdDate === 'CURRENT') return null;
            const latestData = historicalData[historicalData.length - 1].data[`${userCase.category}-${country}`];
            // Only render when already current or PD has surpassed cutoff
            const isAlreadyEligible = latestData === 'C' || (() => {
              const ld = safeParseDate(latestData);
              return ld && ld !== 'CURRENT' && ld >= pdDate;
            })();
            if (!isAlreadyEligible) return null;

            const badgeW = lang === 'en' ? 132 : 124;
            const badgeH = 26;
            const badgeX = chartWidth / 2 - badgeW / 2;
            const badgeY = chartHeight - pad.bottom + 46;
            return (
              <g style={{ pointerEvents: 'none' }}>
                {/* Pill — same vertical position as the crossover pill, so the layout feels consistent.
                    Green fill with check icon on the left. */}
                <rect x={badgeX} y={badgeY}
                  width={badgeW} height={badgeH}
                  rx={terminalMode ? "1" : "3"}
                  fill={C.crossoverBadge}
                  stroke={terminalMode ? C.bg : C.crossoverBadge}
                  strokeWidth="1" />
                {/* Check-circle glyph at left */}
                <circle cx={badgeX + 14} cy={badgeY + 13} r="6.5"
                  fill="none" stroke={C.crossoverText} strokeWidth="1.3" />
                <path d={`M ${badgeX + 11} ${badgeY + 13} L ${badgeX + 13.5} ${badgeY + 15.5} L ${badgeX + 17.5} ${badgeY + 11}`}
                  stroke={C.crossoverText} strokeWidth="1.5"
                  strokeLinecap="round" strokeLinejoin="round" fill="none" />
                {/* Main label */}
                <text x={badgeX + badgeW / 2 + 6} y={badgeY + 17}
                  textAnchor="middle" fontSize="11.5"
                  fill={C.crossoverText} fontWeight="700"
                  fontFamily={terminalMode ? "ui-monospace, monospace" : "inherit"}
                  letterSpacing={terminalMode ? "0.04em" : "0.005em"}>
                  {lang === 'en' ? 'Eligible to file now' : lang === 'tw' ? '現在可遞件' : '现在可递件'}
                </text>
                {/* Small hint below — encourages action */}
                <text x={chartWidth / 2} y={badgeY + 38}
                  textAnchor="middle" fontSize="8.5"
                  fill="var(--gc-muted)"
                  fontWeight="600"
                  letterSpacing="0.14em">
                  {lang === 'en' ? 'PD HAS PASSED THE CUTOFF' : '你的优先日已过截止日'}
                </text>
              </g>
            );
          })()}

          {/* Hover vertical line (when hovering) — hidden when crossover popup open */}
          {hoveredMonthIndex !== null && !showCrossoverInfo && (
            <line x1={xScale(hoveredMonthIndex)} y1={pad.top}
              x2={xScale(hoveredMonthIndex)} y2={chartHeight - pad.bottom}
              stroke={C.hoverLine} strokeWidth="1" strokeDasharray="2,2" opacity="0.7" />
          )}
          {hoveredForecast !== null && !showCrossoverInfo && (
            <line x1={hoveredForecast.x} y1={pad.top}
              x2={hoveredForecast.x} y2={chartHeight - pad.bottom}
              stroke={C.nowLine} strokeWidth="1" strokeDasharray="2,2" opacity="0.7" />
          )}

          {/* RATE PHASE BACKGROUND BANDS - only for user's category when past range >= 24 months
              Identifies "fast" vs "slow" periods in user's category history by analyzing 
              month-to-month advancement from historicalData. Colored bands overlay the chart. */}
          {pastMonths >= 24 && (() => {
            const userKey = `${userCase.category}-${country}`;
            // Compute advancement rate between consecutive months (days/month)
            const rates = [];
            for (let i = 1; i < historicalData.length; i++) {
              const prev = historicalData[i-1].data[userKey];
              const curr = historicalData[i].data[userKey];
              if (prev === 'C' || curr === 'C' || !prev || !curr) {
                rates.push(null);
                continue;
              }
              const p = new Date(prev), c = new Date(curr);
              if (isNaN(p.getTime()) || isNaN(c.getTime())) { rates.push(null); continue; }
              const daysAdvanced = (c - p) / (24 * 60 * 60 * 1000);
              rates.push(daysAdvanced);
            }
            // Classify into phases: fast (>40 d/mo), normal (10-40), slow (<10)
            // Group consecutive similar rates into bands
            const classify = (r) => {
              if (r === null) return 'unknown';
              if (r >= 40) return 'fast';
              if (r >= 10) return 'normal';
              return 'slow';
            };
            // Smooth by averaging 3-month windows to avoid noise
            const smoothRates = rates.map((_, i) => {
              const window = [];
              for (let j = Math.max(0, i-1); j <= Math.min(rates.length-1, i+1); j++) {
                if (rates[j] !== null) window.push(rates[j]);
              }
              return window.length ? window.reduce((a,b)=>a+b,0) / window.length : null;
            });
            
            // Build bands: consecutive months with same classification
            const bands = [];
            let currentBand = null;
            smoothRates.forEach((r, i) => {
              const cls = classify(r);
              if (!currentBand || currentBand.type !== cls) {
                if (currentBand) bands.push(currentBand);
                currentBand = { type: cls, startSlot: i, endSlot: i+1, avgRate: r };
              } else {
                currentBand.endSlot = i+1;
                currentBand.avgRate = (currentBand.avgRate + r) / 2;
              }
            });
            if (currentBand) bands.push(currentBand);
            
            // Only show bands that are at least 6 months wide for clarity
            const visibleBands = bands.filter(b => (b.endSlot - b.startSlot) >= 6 && b.type !== 'unknown');
            
            const bandColors = {
              fast: '#10b9811f',   // green tint - fast
              normal: '#f59e0b1f', // amber tint - normal
              slow: '#ef44441f',   // red tint - slow
            };
            const strokeColors = {
              fast: '#10b98170',
              normal: '#f59e0b50', 
              slow: '#ef444470',
            };
            const bandLabels = lang === 'en' ? {
              fast: 'Fast', normal: 'Normal', slow: 'Slow'
            } : lang === 'tw' ? {
              fast: '推進快', normal: '正常', slow: '推進慢'
            } : {
              fast: '推进快', normal: '正常', slow: '推进慢'
            };
            
            return visibleBands.map((b, idx) => {
              const x0 = xScale(b.startSlot);
              const x1 = xScale(b.endSlot);
              const w = x1 - x0;
              if (w < 20) return null;
              const rateDisplay = b.avgRate !== null ? `${Math.round(b.avgRate)}${lang === 'en' ? 'd/mo' : '天/月'}` : '';
              return (
                <g key={`band-${idx}`}>
                  <rect x={x0} y={pad.top} width={w} height={chartHeight - pad.top - pad.bottom}
                    fill={bandColors[b.type]} stroke={strokeColors[b.type]} strokeWidth="0.5" strokeDasharray="3,3" />
                  {w > 60 && (
                    <text x={x0 + w/2} y={pad.top + 12} textAnchor="middle" fontSize="8.5" 
                      fill={b.type === 'fast' ? '#047857' : b.type === 'slow' ? '#b91c1c' : '#92400e'} 
                      fontWeight="600">
                      {bandLabels[b.type]} {rateDisplay && `· ${rateDisplay}`}
                    </text>
                  )}
                </g>
              );
            }).filter(b => b !== null);
          })()}
          
          {/* Historical trend lines + Forecast lines */}
          {(() => {
            // Pre-compute the user's crossover month (where user's projection meets their PD).
            // Used below to trim the forecast for ALL categories at this x-position:
            // everything to the right of it is irrelevant for this user.
            let sharedTrimMonth = null;
            try {
              const userCatEarly = userCase.category;
              const pdDateEarly = safeParseDate(userCase.priorityDate);
              if (pdDateEarly && pdDateEarly !== 'CURRENT') {
                const latestRawEarly = historicalData[historicalData.length - 1].data[`${userCatEarly}-${country}`];
                const latestDEarly = safeParseDate(latestRawEarly);
                if (latestDEarly && latestDEarly !== 'CURRENT') {
                  const userForecast = computeForecastForCategory(userCatEarly);
                  if (userForecast && !userForecast.isCurrent && userForecast.computeAdvanceAt) {
                    const targetMs = pdDateEarly.getTime() - latestDEarly.getTime();
                    if (targetMs > 0) {
                      const maxAdv = userForecast.computeAdvanceAt(forecastMonths);
                      if (maxAdv >= targetMs) {
                        let lo = 0, hi = forecastMonths;
                        for (let iter = 0; iter < 30; iter++) {
                          const mid = (lo + hi) / 2;
                          if (userForecast.computeAdvanceAt(mid) < targetMs) lo = mid;
                          else hi = mid;
                          if (hi - lo < 0.01) break;
                        }
                        sharedTrimMonth = (lo + hi) / 2;
                      }
                    }
                  }
                }
              }
            } catch (e) { /* noop */ }
            return displayCategories.map(cat => {
            const yScale = getYScale(cat);
            const isCurrentOnly = historicalData.every(m => m.data[`${cat}-${country}`] === 'C');

            // Skip drawing line for categories that are Current the whole time
            // (they'll still appear in tooltips and summary)
            if (isCurrentOnly) return null;

            const currentY = pad.top + CURRENT_Y_OFFSET;

            // Historical points - ensure ALL months are drawn at equal x-spacing
            const historyPoints = historicalData.map((month, i) => {
              const y = yScale(month.data[`${cat}-${country}`]);
              const raw = month.data[`${cat}-${country}`];
              if (y === null) return null;
              return { x: xScale(i), y, raw, isCurrent: raw === 'C', monthIdx: i };
            }).filter(p => p !== null);

            if (historyPoints.length === 0) return null;

            const historyPath = historyPoints.map(p => `${p.x},${p.y}`).join(' ');

            // Compute forecast
            const forecast = computeForecastForCategory(cat);
            const lastPoint = historyPoints[historyPoints.length - 1];
            
            // Highlight user's own category; fade others much more
            const isUserCat = cat === userCase.category;
            const lineOpacity = isUserCat ? 1.0 : 0.3;   // 其他淡化到30%
            const lineWidth = isUserCat ? 3.5 : 1.5;      // 用户线更粗
            const pointRadius = isUserCat ? 3 : 1.5;

            return (
              <g key={cat} style={{ opacity: lineOpacity }}>
                {/* Historical line - rendered as SEGMENTS so Current periods and
                    Current↔Backlog transitions can be visually distinguished from
                    normal backlog movement. Rules:
                    - Backlog→Backlog: SOLID (user) or short-dashed (others) — real progression, full visual weight
                    - Current→Current: GHOST line — super-thin, grayish, low opacity, barely visible
                    - Transition: GHOST line — same treatment, fades the jump
                */}
                {(() => {
                  const segs = [];
                  for (let i = 0; i < historyPoints.length - 1; i++) {
                    const a = historyPoints[i], b = historyPoints[i + 1];
                    const bothCurrent = a.isCurrent && b.isCurrent;
                    const isTransition = a.isCurrent !== b.isCurrent;
                    const isGhost = bothCurrent || isTransition;
                    if (isGhost) {
                      // Barely-visible ghost line for Current periods and transitions
                      segs.push(
                        <line key={i}
                          x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                          stroke="#cbd5e1"                        // slate-300 (gray, not category color)
                          strokeWidth={Math.max(0.6, lineWidth * 0.3)}  // much thinner
                          strokeLinecap="round"
                          strokeDasharray="1,3"                   // dotted, not dashed
                          opacity={0.35}                          // very faded
                        />
                      );
                    } else {
                      // Normal backlog-progression segment: full visual weight
                      segs.push(
                        <line key={i}
                          x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                          stroke={colors[cat]} strokeWidth={lineWidth}
                          strokeLinecap="round"
                          strokeDasharray={isUserCat ? undefined : '3,3'}
                        />
                      );
                    }
                  }
                  return segs;
                })()}

                {/* Historical data points - only show when data isn't too dense */}
                {historyPoints.length <= 30 && historyPoints.map((p, i) => (
                  <circle key={i}
                    cx={p.x} cy={p.y}
                    r={hoveredMonthIndex === i ? (isUserCat ? 5 : 4) : pointRadius}
                    fill={p.isCurrent ? 'white' : colors[cat]}
                    stroke={colors[cat]} strokeWidth={p.isCurrent ? 1.5 : 1.5}
                    style={{ transition: 'r 0.15s' }}
                  />
                ))}
                {/* For long ranges, show enlarged point only when hovered */}
                {historyPoints.length > 30 && hoveredMonthIndex !== null && historyPoints[hoveredMonthIndex] && (
                  <circle
                    cx={historyPoints[hoveredMonthIndex].x} cy={historyPoints[hoveredMonthIndex].y}
                    r={isUserCat ? 5 : 4}
                    fill={colors[cat]} stroke={terminalMode ? C.bg : "white"} strokeWidth="1.5"
                  />
                )}

                {/* Forecast line - CURVED/non-linear based on hybrid model.
                    For user's category specifically: trim at crossover point (beyond it
                    the projection is no longer relevant to THIS user) and add a filled
                    area underneath to give the user's line visual weight vs. references. */}
                {forecast && !forecast.isCurrent && (() => {
                  const latestRaw = historicalData[historicalData.length - 1].data[`${cat}-${country}`];
                  const latestD = safeParseDate(latestRaw);
                  if (!latestD || latestD === 'CURRENT') return null;
                  
                  const computeAdvanceAt = forecast.computeAdvanceAt;
                  if (!computeAdvanceAt) return null;

                  // Trim logic: for ALL categories, stop the forecast at the user's crossover X.
                  // Beyond that point, "how fast other categories would advance" is irrelevant to this user.
                  let trimAtMonth = sharedTrimMonth;
                  let crossoverPoint = null;
                  if (isUserCat && sharedTrimMonth !== null) {
                    // User cat's crossover point is where user's projection meets user's PD
                    const cxSlot = historyEndSlot + sharedTrimMonth;
                    crossoverPoint = {
                      x: xScale(cxSlot),
                      y: yScale(userCase.priorityDate),
                    };
                  }
                  
                  // Sample forecast curve every month (consistent density regardless of range)
                  // Use 0.5-month step to ensure line is smooth and crossover alignment is precise
                  const sampleStep = forecastMonths > 240 ? 2 : forecastMonths > 60 ? 1 : 0.5;
                  
                  const currentZoneThreshold = pad.top + 25;
                  const clamp = (y) => Math.max(pad.top + CURRENT_Y_OFFSET, Math.min(chartHeight - pad.bottom, y));
                  
                  // Build polyline points — stop at trimAtMonth if user's line and crossover exists
                  const points = [];
                  let hitCurrentZone = false;
                  const stopAt = trimAtMonth !== null ? trimAtMonth : forecastMonths;
                  
                  for (let m = 0; m <= stopAt; m += sampleStep) {
                    const monthSlot = historyEndSlot + m;
                    const x = xScale(monthSlot);
                    const advanceMs = computeAdvanceAt(m);
                    const projectedDate = new Date(latestD.getTime() + advanceMs);
                    const dateStr = projectedDate.toISOString().split('T')[0];
                    const rawY = yScale(dateStr);
                    if (rawY === null) continue;
                    const y = clamp(rawY);
                    
                    // If hit current zone, add turn point then cap horizontally
                    if (rawY < currentZoneThreshold && !hitCurrentZone) {
                      // Linearly find where line crossed the threshold
                      if (points.length > 0) {
                        const prev = points[points.length - 1];
                        const t = (prev.y - currentZoneThreshold) / (prev.y - y);
                        const turnX = prev.x + (x - prev.x) * t;
                        points.push({ x: turnX, y: currentZoneThreshold });
                      }
                      points.push({ x, y: currentZoneThreshold });
                      hitCurrentZone = true;
                    } else if (hitCurrentZone) {
                      // Stay at threshold
                      points.push({ x, y: currentZoneThreshold });
                    } else {
                      points.push({ x, y });
                    }
                  }
                  
                  // Ensure final point at endX. If the user has a crossover, ALL categories
                  // truncate at that X — info past that point is irrelevant (user already eligible).
                  if (points.length > 0) {
                    const lastSampled = points[points.length - 1];
                    let endX, endY;
                    if (crossoverPoint) {
                      // User's own cat: land exactly on PD y-level
                      endX = crossoverPoint.x;
                      endY = crossoverPoint.y;
                    } else if (sharedTrimMonth !== null) {
                      // Other cat + user has crossover: truncate at same X, keep this line's own y
                      endX = xScale(historyEndSlot + sharedTrimMonth);
                      endY = lastSampled.y;
                    } else {
                      // No crossover at all: full forecast range
                      endX = xScale(historyEndSlot + forecastMonths);
                      endY = lastSampled.y;
                    }
                    if (Math.abs(lastSampled.x - endX) > 1) {
                      points.push({ x: endX, y: endY });
                    }
                  }
                  
                  if (points.length === 0) return null;
                  const pathStr = points.map(p => `${p.x},${p.y}`).join(' ');
                  const endPoint = points[points.length - 1];
                  
                  // For user cat: build area fill polygon that covers history + forecast
                  // closed down to the chart baseline. This gives the user's line visual weight.
                  let areaPath = null;
                  if (isUserCat) {
                    const baselineY = chartHeight - pad.bottom;
                    // Combine history points + forecast points
                    const allPoints = [...historyPoints.map(p => ({ x: p.x, y: p.y })), ...points];
                    if (allPoints.length > 1) {
                      const first = allPoints[0];
                      const last = allPoints[allPoints.length - 1];
                      const coords = allPoints.map(p => `${p.x},${p.y}`).join(' ');
                      // Close polygon: go to baseline below last, then baseline below first, back to start
                      areaPath = `${coords} ${last.x},${baselineY} ${first.x},${baselineY}`;
                    }
                  }
                  
                  return (
                    <g>
                      {/* User cat only: soft area fill under the line — 等待的"体量感" */}
                      {isUserCat && areaPath && (
                        <polygon
                          points={areaPath}
                          fill={colors[cat]}
                          opacity="0.08"
                          style={{ pointerEvents: 'none' }}
                        />
                      )}
                      {/* Single expected forecast curve (non-linear) - much bolder for user cat */}
                      <polyline 
                        points={pathStr} 
                        fill="none" 
                        stroke={colors[cat]} 
                        strokeWidth={isUserCat ? 3 : 1.2} 
                        strokeDasharray={isUserCat ? '6,4' : '3,3'} 
                        opacity={isUserCat ? 1 : 0.85}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {/* End point — for user cat with crossover, give it a pulsing halo to emphasize the milestone.
                          Two outer rings breathe outward (scale + opacity) in an endless loop,
                          while the inner solid dot stays stable for precise reading. */}
                      {isUserCat && crossoverPoint ? (
                        <g style={{ pointerEvents: 'none' }}>
                          <style>{`
                            @keyframes gcPulseRing {
                              0%   { transform: scale(1);    opacity: 0.5; }
                              70%  { transform: scale(3.2);  opacity: 0; }
                              100% { transform: scale(3.2);  opacity: 0; }
                            }
                            .gc-crossover-pulse-outer,
                            .gc-crossover-pulse-middle {
                              animation: gcPulseRing 2000ms cubic-bezier(0.2, 0.6, 0.3, 1) infinite;
                              transform-origin: center;
                              transform-box: fill-box;
                            }
                            .gc-crossover-pulse-middle {
                              animation-delay: 700ms;
                              opacity: 0;
                            }
                            @media (prefers-reduced-motion: reduce) {
                              .gc-crossover-pulse-outer,
                              .gc-crossover-pulse-middle { animation: none; opacity: 0.15; transform: scale(2); }
                            }
                          `}</style>
                          {/* First ripple */}
                          <circle className="gc-crossover-pulse-outer"
                                  cx={endPoint.x} cy={endPoint.y}
                                  r="4" fill={C.crossover} />
                          {/* Second ripple — staggered for continuous breathing feel */}
                          <circle className="gc-crossover-pulse-middle"
                                  cx={endPoint.x} cy={endPoint.y}
                                  r="4" fill={C.crossover} />
                          {/* Inner solid dot — always stable, the actual milestone marker */}
                          <circle cx={endPoint.x} cy={endPoint.y}
                            r="4" fill={C.crossover} stroke={terminalMode ? C.bg : "white"} strokeWidth="1.5" />
                        </g>
                      ) : (
                        <circle cx={endPoint.x} cy={endPoint.y}
                          r={isUserCat ? 3.5 : 2.5} fill={colors[cat]} stroke={terminalMode ? C.bg : "white"} strokeWidth="1.5" />
                      )}
                    </g>
                  );
                })()}

                {/* For Current ('C') at end - extend horizontal line */}
                {forecast && forecast.isCurrent && (
                  <line x1={lastPoint.x} y1={lastPoint.y}
                    x2={forecastStartX + forecastWidth} y2={lastPoint.y}
                    stroke={colors[cat]} strokeWidth="2" strokeDasharray="4,2" opacity="0.6" />
                )}
              </g>
            );
            });
          })()}

          {/* "Current" zone indicator - shows which categories are Current */}
          {(() => {
            const currentCats = displayCategories.filter(cat =>
              historicalData[historicalData.length - 1].data[`${cat}-${country}`] === 'C'
            );
            if (currentCats.length === 0) return null;
            return (
              <g>
                <rect x={pad.left} y={pad.top}
                  width={chartWidth - pad.left - pad.right} height={16}
                  fill={terminalMode ? C.forecastZone : "#ecfdf5"} opacity="0.85" />
                <text x={pad.left + 6} y={pad.top + 11}
                  textAnchor="start" fontSize="8" fill={C.nowText} fontWeight="700"
                  fontFamily={terminalMode ? "ui-monospace, monospace" : "inherit"}
                  letterSpacing={terminalMode ? "0.06em" : "normal"}>
                  ✓ {currentCats.join(', ')} {lang === 'en' ? 'Current (no wait)' : '无排期'}
                </text>
              </g>
            );
          })()}

          {/* Invisible hover zones for each month (historical) - simplified, main handler on SVG */}
          {historicalData.map((month, i) => (
            <rect key={`hover-${i}`}
              x={xScale(i) - (historyWidth / historicalData.length) / 2}
              y={pad.top}
              width={historyWidth / historicalData.length}
              height={chartHeight - pad.top - pad.bottom}
              fill="transparent"
              style={{ cursor: 'pointer', pointerEvents: 'none' }}
            />
          ))}

          {/* Invisible hover zones for forecast (one per month, 8 months) - simplified */}
          {Array.from({ length: 8 }, (_, idx) => {
            const monthOffset = idx + 1;
            const fracEnd = monthOffset / 8;
            const fracStart = idx / 8;
            const xStart = forecastStartX + forecastWidth * fracStart;
            const xEnd = forecastStartX + forecastWidth * fracEnd;
            return (
              <rect key={`hover-fc-${idx}`}
                x={xStart}
                y={pad.top}
                width={xEnd - xStart}
                height={chartHeight - pad.top - pad.bottom}
                fill="transparent"
                style={{ cursor: 'pointer', pointerEvents: 'none' }}
              />
            );
          })}

          {/* UNIFIED X-axis labels - same format for history and forecast
              Step depends on total span to avoid overlap (~20 labels max on screen):
              - ≤24 months: every month
              - ≤48 months: every 2 months
              - ≤96 months: every 3 months (quarterly)
              - ≤144 months: every 6 months (semi-annual)
              - ≤240 months (20y): every 12 months (yearly)
              - ≤480 months (40y): every 24 months (every 2 years)
              - otherwise: every 60 months (every 5 years)
          */}
          {(() => {
            let stepMonths;
            if (TOTAL_MONTHS <= 24) stepMonths = 1;
            else if (TOTAL_MONTHS <= 48) stepMonths = 2;
            else if (TOTAL_MONTHS <= 96) stepMonths = 3;
            else if (TOTAL_MONTHS <= 144) stepMonths = 6;
            else if (TOTAL_MONTHS <= 240) stepMonths = 12;
            else if (TOTAL_MONTHS <= 480) stepMonths = 24;
            else stepMonths = 60;
            
            const labels = [];
            // Start from slot 0 (earliest historical month)
            // baseDate = first month in historicalData (dynamic based on pastMonths)
            const baseDate = historicalData[0].date;
            for (let slot = 0; slot < TOTAL_MONTHS; slot += stepMonths) {
              const x = xScale(slot);
              const d = new Date(baseDate.getFullYear(), baseDate.getMonth() + slot, 1);
              const year = d.getFullYear();
              const month = d.getMonth() + 1;
              // Different label format for different step sizes
              let label;
              if (stepMonths >= 12) {
                // Year-level - just show 4-digit year
                label = String(year);
              } else {
                // Month-level - show YY/M
                label = `${String(year).slice(-2)}/${month}`;
              }
              
              // Color: forecast zone = accent, historical = axis
              const isForecast = slot > historyEndSlot;
              const fill = isForecast ? C.nowText : C.axis;
              const isEven = slot % 2 === 0;
              // For year-level labels with wide step, no need to alternate (more space)
              const yOffset = stepMonths >= 12 ? 16 : (isEven ? 14 : 26);
              
              labels.push(
                <text key={`x-${slot}`} x={x} y={chartHeight - pad.bottom + yOffset}
                  textAnchor="middle" fontSize="8.5" fill={fill} fontWeight={isForecast ? "600" : "500"}
                  fontFamily={terminalMode ? "ui-monospace, monospace" : "inherit"}>
                  {label}
                </text>
              );
            }
            return labels;
          })()}

        </svg>

        {/* Dual-range slider: past (left) + forecast (right) */}
        <div className="mt-2 px-2 pb-1 space-y-2">
          {/* PAST range */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-semibold flex items-center gap-1" style={{ color: 'var(--gc-ink-soft)' }}>
                <History size={11} strokeWidth={2.2} className="flex-shrink-0" style={{ color: 'var(--gc-muted)' }} />
                {lang === 'en' ? 'Historical Range' : '历史范围'}
                {autoFitted && (
                  <span className="gc-eyebrow flex-shrink-0"
                        style={{ fontSize: '8px', color: 'var(--gc-muted)', letterSpacing: '0.1em', marginLeft: '4px' }}
                        title={lang === 'en' ? 'Auto-adjusted to frame your crossover' : '已自动调整以框住你的交叉点'}>
                    {lang === 'en' ? 'AUTO' : '自动'}
                  </span>
                )}
              </label>
              <span className="gc-mono" style={{
                fontSize: '10px',
                fontWeight: 700,
                color: 'var(--gc-ink)',
                padding: '2px 6px',
                background: 'var(--gc-paper-soft)',
                border: '1px solid var(--gc-rule)',
                borderRadius: '2px',
                letterSpacing: '0.02em',
              }}>
                {pastMonths < 12
                  ? (lang === 'en' ? `${pastMonths}mo` : `${pastMonths}个月`)
                  : pastMonths === 12
                  ? (lang === 'en' ? '1 year' : '1年')
                  : (lang === 'en'
                    ? `${Math.floor(pastMonths / 12)}y ${pastMonths % 12}mo`
                    : `${Math.floor(pastMonths / 12)}年${pastMonths % 12 > 0 ? pastMonths % 12 + '个月' : ''}`)}
              </span>
            </div>
            <input
              type="range"
              min="6"
              max="312"
              step="1"
              value={pastMonths}
              onChange={(e) => {
                setPastMonths(parseInt(e.target.value));
                setRangeUserAdjusted(true);
                setAutoFitted(false);
              }}
              className="gc-slider w-full h-1.5 appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, var(--gc-ink) 0%, var(--gc-ink) ${(pastMonths - 6) / (312 - 6) * 100}%, var(--gc-rule) ${(pastMonths - 6) / (312 - 6) * 100}%, var(--gc-rule) 100%)`,
                borderRadius: '2px',
              }}
            />
            <div className="flex justify-between mt-1 text-[9px]" style={{ color: 'var(--gc-muted)' }}>
              <span>6{lang === 'en' ? 'mo' : '个月'}</span>
              <button
                onClick={() => { setPastMonths(12); setRangeUserAdjusted(true); setAutoFitted(false); }}
                className="font-medium"
                style={{ color: 'var(--gc-muted)', transition: 'color 120ms' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--gc-ink)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--gc-muted)'; }}>
                1{lang === 'en' ? 'y' : '年'}
              </button>
              <button
                onClick={() => { setPastMonths(60); setRangeUserAdjusted(true); setAutoFitted(false); }}
                className="font-medium"
                style={{ color: 'var(--gc-muted)', transition: 'color 120ms' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--gc-ink)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--gc-muted)'; }}>
                5{lang === 'en' ? 'y' : '年'}
              </button>
              <button
                onClick={() => { setPastMonths(120); setRangeUserAdjusted(true); setAutoFitted(false); }}
                className="font-medium"
                style={{ color: 'var(--gc-muted)', transition: 'color 120ms' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--gc-ink)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--gc-muted)'; }}>
                10{lang === 'en' ? 'y' : '年'}
              </button>
              <button
                onClick={() => { setPastMonths(252); setRangeUserAdjusted(true); setAutoFitted(false); }}
                className="font-medium"
                style={{ color: 'var(--gc-muted)', transition: 'color 120ms' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--gc-ink)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--gc-muted)'; }}>
                21{lang === 'en' ? 'y' : '年'}
              </button>
              <span>26{lang === 'en' ? 'y' : '年'}</span>
            </div>
          </div>

          {/* FUTURE range */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-semibold flex items-center gap-1" style={{ color: 'var(--gc-ink-soft)' }}>
                <TrendingUp size={11} strokeWidth={2.2} className="flex-shrink-0" style={{ color: 'var(--gc-muted)' }} />
                {lang === 'en' ? 'Forecast Range' : '预测范围'}
                {autoFitted && (
                  <span className="gc-eyebrow flex-shrink-0"
                        style={{ fontSize: '8px', color: 'var(--gc-muted)', letterSpacing: '0.1em', marginLeft: '4px' }}
                        title={lang === 'en' ? 'Auto-extended to show your crossover' : '已自动延长以显示你的交叉点'}>
                    {lang === 'en' ? 'AUTO' : '自动'}
                  </span>
                )}
              </label>
              <span className="gc-mono" style={{
                fontSize: '10px',
                fontWeight: 700,
                color: 'var(--gc-ink)',
                padding: '2px 6px',
                background: 'var(--gc-paper-soft)',
                border: '1px solid var(--gc-rule)',
                borderRadius: '2px',
                letterSpacing: '0.02em',
              }}>
                {forecastMonths < 12
                  ? (lang === 'en' ? `${forecastMonths}mo` : `${forecastMonths}个月`)
                  : forecastMonths === 12
                  ? (lang === 'en' ? '1 year' : '1年')
                  : (lang === 'en'
                    ? `${Math.floor(forecastMonths / 12)}y ${forecastMonths % 12}mo`
                    : `${Math.floor(forecastMonths / 12)}年${forecastMonths % 12 > 0 ? forecastMonths % 12 + '个月' : ''}`)}
              </span>
            </div>
            <input
              type="range"
              min="6"
              max="600"
              step="1"
              value={forecastMonths}
              onChange={(e) => {
                setForecastMonths(parseInt(e.target.value));
                setRangeUserAdjusted(true);
                setAutoFitted(false);
              }}
              className="gc-slider w-full h-1.5 appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, var(--gc-ink) 0%, var(--gc-ink) ${(forecastMonths - 6) / (600 - 6) * 100}%, var(--gc-rule) ${(forecastMonths - 6) / (600 - 6) * 100}%, var(--gc-rule) 100%)`,
                borderRadius: '2px',
              }}
            />
            <div className="flex justify-between mt-1 text-[9px]" style={{ color: 'var(--gc-muted)' }}>
              <span>6{lang === 'en' ? 'mo' : '个月'}</span>
              <button
                onClick={() => { setForecastMonths(12); setRangeUserAdjusted(true); setAutoFitted(false); }}
                className="font-medium"
                style={{ color: 'var(--gc-muted)', transition: 'color 120ms' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--gc-ink)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--gc-muted)'; }}>
                1{lang === 'en' ? 'y' : '年'}
              </button>
              <button
                onClick={() => { setForecastMonths(60); setRangeUserAdjusted(true); setAutoFitted(false); }}
                className="font-medium"
                style={{ color: 'var(--gc-muted)', transition: 'color 120ms' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--gc-ink)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--gc-muted)'; }}>
                5{lang === 'en' ? 'y' : '年'}
              </button>
              <button
                onClick={() => { setForecastMonths(120); setRangeUserAdjusted(true); setAutoFitted(false); }}
                className="font-medium"
                style={{ color: 'var(--gc-muted)', transition: 'color 120ms' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--gc-ink)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--gc-muted)'; }}>
                10{lang === 'en' ? 'y' : '年'}
              </button>
              <button
                onClick={() => { setForecastMonths(240); setRangeUserAdjusted(true); setAutoFitted(false); }}
                className="font-medium"
                style={{ color: 'var(--gc-muted)', transition: 'color 120ms' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--gc-ink)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--gc-muted)'; }}>
                20{lang === 'en' ? 'y' : '年'}
              </button>
              <span>50{lang === 'en' ? 'y' : '年'}</span>
            </div>
          </div>

        </div>

        {/* Collapsible help section - moved BELOW chart for less clutter */}
        <div className="mt-2 mx-2">
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="w-full flex items-center justify-between transition-colors"
            style={{
              padding: '6px 10px',
              background: showHelp ? 'var(--gc-paper-soft)' : 'var(--gc-surface)',
              border: '1px solid var(--gc-rule)',
              borderRadius: '3px',
              color: 'var(--gc-ink-soft)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--gc-paper-soft)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = showHelp ? 'var(--gc-paper-soft)' : 'var(--gc-surface)'; }}>
            <span className="text-[11px] font-semibold flex items-center gap-1" style={{ color: 'var(--gc-ink-soft)' }}>
              <HelpCircle size={12} strokeWidth={2} className="flex-shrink-0" style={{ color: 'var(--gc-muted)' }} />
              {lang === 'en' ? 'How to read this chart & AI model' : '怎么看这个图 & AI模型'}
            </span>
            <span style={{ color: 'var(--gc-muted)', fontSize: '10px' }}>{showHelp ? '▲' : '▼'}</span>
          </button>
          {showHelp && (
            <div className="mt-1" style={{
              padding: '10px 12px',
              background: 'var(--gc-paper-soft)',
              border: '1px solid var(--gc-rule)',
              borderRadius: '3px',
            }}>
              <div className="space-y-1.5 text-[10px] leading-relaxed" style={{ color: 'var(--gc-ink-soft)' }}>
                <div className="flex items-start gap-1.5">
                  <span className="flex-shrink-0" style={{ color: "var(--gc-muted-soft)", fontSize: "9px", marginTop: "2px" }}>▸</span>
                  <span>{lang === 'en'
                    ? 'Each line = one category\'s cutoff over time. Line going UP = PD moving forward (good!).'
                    : lang === 'tw'
                    ? '每條線代表一個類別的cutoff隨時間變化。線向上走 = 排期前進（好事！）'
                    : '每条线代表一个类别的cutoff随时间变化。线向上走 = 排期前进（好事！）'}</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="flex-shrink-0" style={{ color: "var(--gc-muted-soft)", fontSize: "9px", marginTop: "2px" }}>▸</span>
                  <span>{lang === 'en'
                    ? 'Gray dashed line = YOUR PD. When a category line crosses above it, you can file!'
                    : lang === 'tw'
                    ? '灰色橫虛線 = 你的優先日。哪條類別線漲到這條虛線之上，你就能遞件了！'
                    : '灰色横虚线 = 你的优先日。哪条类别线涨到这条虚线之上，你就能递件了！'}</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="flex-shrink-0" style={{ color: "var(--gc-muted-soft)", fontSize: "9px", marginTop: "2px" }}>▸</span>
                  <span>{lang === 'en'
                    ? 'Green line = latest bulletin month ("now"). Light green area to the right = forecast zone (dashed lines).'
                    : lang === 'tw'
                    ? '綠色豎虛線 = 最新排期月份（"現在"）。右側淡綠色區 = 預測區域（虛線）。'
                    : '绿色竖虚线 = 最新排期月份（"现在"）。右侧淡绿色区 = 预测区域（虚线）。'}</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="flex-shrink-0" style={{ color: "var(--gc-muted-soft)", fontSize: "9px", marginTop: "2px" }}>▸</span>
                  <span>{lang === 'en'
                    ? 'Red line + tag below X-axis = forecasted date your PD might become current. Tap tag for details.'
                    : lang === 'tw'
                    ? '紅色豎虛線 + 膠囊 = 預計你的優先日可能到期的月份。點擊膠囊看詳情。'
                    : '红色竖虚线 + 胶囊 = 预计你的优先日可能到期的月份。点击胶囊看详情。'}</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="flex-shrink-0" style={{ color: "var(--gc-muted-soft)", fontSize: "9px", marginTop: "2px" }}>▸</span>
                  <span>{lang === 'en'
                    ? 'Two sliders above: extend history back (up to 26yr), extend forecast further (up to 50yr).'
                    : lang === 'tw'
                    ? '上方兩個滑塊：擴展歷史範圍（最多26年），擴展預測範圍（最多50年）。'
                    : '上方两个滑块：扩展历史范围（最多26年），扩展预测范围（最多50年）。'}</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="flex-shrink-0" style={{ color: "var(--gc-muted-soft)", fontSize: "9px", marginTop: "2px" }}>▸</span>
                  <span>{lang === 'en'
                    ? 'Pick a forecast scenario below (Optimistic / Expected / Pessimistic) - the dashed line redraws based on your choice.'
                    : lang === 'tw'
                    ? '在下方選擇預測情景（樂觀/預期/悲觀）- 虛線會根據你的選擇重新繪製。'
                    : '在下方选择预测情景（乐观/预期/悲观）- 虚线会根据你的选择重新绘制。'}</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="flex-shrink-0" style={{ color: "var(--gc-muted-soft)", fontSize: "9px", marginTop: "2px" }}>▸</span>
                  <span>{lang === 'en'
                    ? 'Tap any month on the chart for exact dates. Tap category chips below to filter.'
                    : lang === 'tw'
                    ? '點擊圖上任意月份看具體日期。點擊下方類別卡片可篩選。'
                    : '点击图上任意月份看具体日期。点击下方类别卡片可筛选。'}</span>
                </div>
              </div>
              
              {/* Calculation formula - helps technical users understand */}
              <div className="mt-2 pt-2 border-t border-blue-300">
                <div className="text-[10px] font-bold text-blue-900 mb-1 flex items-center gap-1">
                  {lang === 'en' ? 'Calculation formula' : lang === 'tw' ? '計算公式' : '计算公式'}
                </div>
                <div className="bg-white/60 rounded p-1.5 text-[9px] font-mono text-blue-900 leading-relaxed mb-1">
                  {lang === 'en' ? '// Time-horizon blended rate' : '// 时间段混合速率'}<br/>
                  {lang === 'en' ? 'if months ≤ 12:' : '若 月份 ≤ 12:'}<br/>
                  &nbsp;&nbsp;rate = 0.7 × recent12mo + 0.3 × recent5yr<br/>
                  {lang === 'en' ? 'elif months ≤ 36:' : '若 月份 ≤ 36:'}<br/>
                  &nbsp;&nbsp;rate = blend(recent, 10yrAvg)<br/>
                  {lang === 'en' ? 'elif months ≤ 120:' : '若 月份 ≤ 120:'}<br/>
                  &nbsp;&nbsp;rate = blend(10yrAvg, 21yrAvg)<br/>
                  {lang === 'en' ? 'else:' : '否则:'}<br/>
                  &nbsp;&nbsp;rate = 0.6 × 21yrAvg + 0.4 × 10yrAvg<br/>
                  <br/>
                  {lang === 'en' ? 'forecast =' : '预测值 ='}<br/>
                  &nbsp;&nbsp;latest + Σ(rate × scenarioMult)
                </div>
                <div className="text-[9px] text-blue-700 leading-snug">
                  {lang === 'en'
                    ? 'Scenario multiplier: Optimistic=1.5, Expected=1.0, Pessimistic=0.3. Near-term forecasts prioritize recent observed trends; long-term forecasts gradually anchor to 21yr historical averages for stability.'
                    : lang === 'tw'
                    ? '情景乘數：樂觀=1.5、預期=1.0、悲觀=0.3。近期預測優先近期觀察到的趨勢；長期預測逐漸錨定到21年歷史均值以保持穩定。'
                    : '情景乘数：乐观=1.5、预期=1.0、悲观=0.3。近期预测优先近期观察到的趋势；长期预测逐渐锚定到21年历史均值以保持稳定。'}
                </div>
                <div className="mt-1.5 pt-1.5 border-t border-blue-200 text-[9px] text-blue-600 italic leading-snug">
                  {lang === 'en'
                    ? 'Historical data: 6 real anchors (Jan 2000/2005/2010/2015/2020, May 2026) interpolated across 26 years.'
                    : lang === 'tw'
                    ? '歷史數據：6個真實錨點（2000/1、2005/1、2010/1、2015/1、2020/1、2026/5）插值覆蓋26年。'
                    : '历史数据：6个真实锚点（2000/1、2005/1、2010/1、2015/1、2020/1、2026/5）插值覆盖26年。'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Crossover info tooltip - shows when user taps the crossover label */}
        {showCrossoverInfo && (() => {
          const pdDateStr = userCase.priorityDate;
          if (!pdDateStr) return null;
          const pdDate = safeParseDate(pdDateStr);
          if (!pdDate || pdDate === 'CURRENT') return null;
          
          const userCat = userCase.category;
          const categoryKey = `${userCat}-${country}`;
          const latestData = historicalData[historicalData.length - 1].data[categoryKey];
          if (latestData === 'C') return null;
          const latestDate = safeParseDate(latestData);
          if (!latestDate || latestDate === 'CURRENT') return null;
          if (latestDate >= pdDate) return null;
          
          const forecast = computeForecastForCategory(userCat);
          if (!forecast || forecast.isCurrent) return null;
          
          // NEW: Use the SAME non-linear binary search as the red crossover line
          // This ensures the popup date matches the red pill date and responds to scenario changes
          const computeAdvanceAt = forecast.computeAdvanceAt;
          if (!computeAdvanceAt) return null;
          
          const targetAdvanceMs = pdDate.getTime() - latestDate.getTime();
          if (targetAdvanceMs <= 0) return null;
          
          // Check if reachable within forecast range
          const maxAdvance = computeAdvanceAt(forecastMonths);
          if (maxAdvance < targetAdvanceMs) return null;
          
          // Binary search for month where advance == target
          let lo = 0, hi = forecastMonths;
          for (let iter = 0; iter < 30; iter++) {
            const mid = (lo + hi) / 2;
            const advance = computeAdvanceAt(mid);
            if (advance < targetAdvanceMs) lo = mid;
            else hi = mid;
            if (hi - lo < 0.01) break;
          }
          const monthsToReach = (lo + hi) / 2;
          if (monthsToReach <= 0 || monthsToReach > forecastMonths) return null;
          
          // Calendar date: current bulletin month + monthsToReach months
          const bulletinMonth = bulletinAnchorDate(15);
          const crossoverCalDate = new Date(bulletinMonth);
          const wholeMonths = Math.floor(monthsToReach);
          const fractionalDays = (monthsToReach - wholeMonths) * 30;
          crossoverCalDate.setMonth(crossoverCalDate.getMonth() + wholeMonths);
          crossoverCalDate.setDate(crossoverCalDate.getDate() + Math.round(fractionalDays));
          const fullDate = crossoverCalDate.toLocaleDateString(lang === 'en' ? 'en-US' : 'zh-CN', { year: 'numeric', month: 'long' });

          // ===== Raw formula inputs for transparent display =====
          const gapDays = Math.round(targetAdvanceMs / (24 * 60 * 60 * 1000));
          // Recent observed rate: how fast the line has been moving over the last 12 months
          const recentRateDpm = forecast.recentDaysPerMonth != null
            ? Math.round(forecast.recentDaysPerMonth)
            : null;
          // Long-term 21y rate from RATES_DB
          const longRateDpy = getLongTermRate(userCat, country);
          const scenarioMultDisplay = { optimistic: 1.5, somewhatOptimistic: 1.25, expected: 1.0, somewhatPessimistic: 0.75, pessimistic: 0.5 }[scenario] || 1.0;
          // Effective rate = gap / monthsToReach — this is the de-facto blended rate the model used
          const effectiveRateDpm = monthsToReach > 0 ? Math.round(gapDays / monthsToReach) : null;
          
          return (
            <div className="absolute z-40 cursor-pointer gc-serif"
              style={{
                left: '50%',
                top: '20px',
                transform: 'translateX(-50%)',
                minWidth: '210px',
                maxWidth: '78%',
                background: 'var(--gc-surface)',
                border: '1px solid var(--gc-rule)',
                borderTop: '2px solid var(--gc-green)',   // theme accent as masthead rule
                borderRadius: 'var(--gc-radius)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
                padding: '10px 12px 9px 12px',
              }}
              onClick={(e) => { e.stopPropagation(); setShowCrossoverInfo(false); }}
              onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); setShowCrossoverInfo(false); }}>
              {/* Close indicator — subtle */}
              <div className="absolute flex items-center justify-center pointer-events-none"
                style={{
                  top: '8px', right: '8px',
                  width: '20px', height: '20px',
                  color: 'var(--gc-muted)',
                  fontSize: '14px',
                  lineHeight: 1,
                }}>
                ×
              </div>

              {/* Eyebrow */}
              <div className="gc-eyebrow mb-1 pr-6" style={{ color: 'var(--gc-green)', fontSize: '9px' }}>
                {lang === 'en' ? 'Estimated Eligibility' : '预计可递件日期'}
              </div>

              {/* Headline date — serif display */}
              <div className="gc-serif mb-0.5" style={{
                fontSize: '18px',
                fontWeight: 700,
                color: 'var(--gc-ink)',
                lineHeight: 1.1,
                letterSpacing: '-0.01em',
              }}>
                {fullDate}
              </div>

              {/* Relative time — neutral muted */}
              <div className="gc-mono" style={{ fontSize: '10.5px', color: 'var(--gc-muted)', marginBottom: '7px' }}>
                {lang === 'en'
                  ? `≈ ${Math.ceil(monthsToReach)} mo`
                  : `≈ ${Math.ceil(monthsToReach)} 个月`}
                <span style={{ margin: '0 5px', color: 'var(--gc-rule)' }}>·</span>
                <span style={{ color: 'var(--gc-ink-soft)' }}>
                  {scenario === 'optimistic' && (lang === 'en' ? '↑↑ opt' : '↑↑ 乐观')}
                  {scenario === 'somewhatOptimistic' && (lang === 'en' ? '↑ above' : '↑ 偏乐观')}
                  {scenario === 'expected' && (lang === 'en' ? '→ expected' : '→ 预期')}
                  {scenario === 'somewhatPessimistic' && (lang === 'en' ? '↓ below' : '↓ 偏悲观')}
                  {scenario === 'pessimistic' && (lang === 'en' ? '↓↓ pess' : '↓↓ 悲观')}
                </span>
              </div>

              {/* ===== Live formula breakdown — real numbers, no filler ===== */}
              <div className="gc-mono" style={{
                fontSize: '10px',
                color: 'var(--gc-ink-soft)',
                lineHeight: 1.55,
                borderTop: '1px solid var(--gc-rule)',
                paddingTop: '6px',
              }}>
                <div className="gc-eyebrow mb-1" style={{ fontSize: '8.5px', color: 'var(--gc-muted)', letterSpacing: '0.16em' }}>
                  {lang === 'en' ? 'CALCULATION' : '计算'}
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span style={{ color: 'var(--gc-muted)' }}>{lang === 'en' ? 'Gap' : '缺口'}</span>
                  <span style={{ color: 'var(--gc-ink)' }}><b>{gapDays.toLocaleString()}</b> {lang === 'en' ? 'd' : '天'}</span>
                </div>
                {recentRateDpm != null && (
                  <div className="flex items-baseline justify-between gap-2">
                    <span style={{ color: 'var(--gc-muted)' }}>
                      {lang === 'en' ? 'Recent 12mo' : '近 12 月'}
                      <span style={{ color: 'var(--gc-muted-soft)', marginLeft: '4px', fontSize: '9px' }}>· 55%</span>
                    </span>
                    <span style={{ color: 'var(--gc-ink)' }}><b>{recentRateDpm}</b> {lang === 'en' ? 'd/mo' : '天/月'}</span>
                  </div>
                )}
                <div className="flex items-baseline justify-between gap-2">
                  <span style={{ color: 'var(--gc-muted)' }}>
                    {lang === 'en' ? '5y policy' : '5 年政策'}
                    <span style={{ color: 'var(--gc-muted-soft)', marginLeft: '4px', fontSize: '9px' }}>· 20%</span>
                  </span>
                  <span style={{ color: 'var(--gc-ink)' }}><b>{Math.round((RATES_DB[`${userCat}-${country}`]?.recent || longRateDpy) / 12)}</b> {lang === 'en' ? 'd/mo' : '天/月'}</span>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span style={{ color: 'var(--gc-muted)' }}>
                    {lang === 'en' ? '21y avg' : '21 年均值'}
                    <span style={{ color: 'var(--gc-muted-soft)', marginLeft: '4px', fontSize: '9px' }}>· 25%</span>
                  </span>
                  <span style={{ color: 'var(--gc-ink)' }}><b>{Math.round(longRateDpy / 12)}</b> {lang === 'en' ? 'd/mo' : '天/月'}</span>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span style={{ color: 'var(--gc-muted)' }}>{lang === 'en' ? 'Scenario' : '情景'}</span>
                  <span style={{ color: 'var(--gc-ink)' }}><b>×{scenarioMultDisplay}</b></span>
                </div>
                {effectiveRateDpm != null && (
                  <div className="flex items-baseline justify-between gap-2" style={{ marginTop: '3px', paddingTop: '3px', borderTop: '1px dashed var(--gc-rule-soft)' }}>
                    <span style={{ color: 'var(--gc-muted)' }}>{lang === 'en' ? 'Blended' : '混合速率'}</span>
                    <span style={{ color: 'var(--gc-green)', fontWeight: 700 }}>{effectiveRateDpm} {lang === 'en' ? 'd/mo' : '天/月'}</span>
                  </div>
                )}
                {/* Final formula on its own row, accented */}
                <div style={{
                  marginTop: '6px',
                  paddingTop: '6px',
                  borderTop: '1px solid var(--gc-rule)',
                  fontSize: '10.5px',
                  color: 'var(--gc-ink)',
                  letterSpacing: '0.01em',
                  textAlign: 'right',
                }}>
                  {gapDays.toLocaleString()} ÷ {effectiveRateDpm} = <b style={{ color: 'var(--gc-green)' }}>{Math.ceil(monthsToReach)}</b> {lang === 'en' ? 'mo' : '月'}
                </div>
              </div>

              {/* ===== I-485 approval forecast — second milestone ===== */}
              {(() => {
                // Re-derive the SAME approval range that the chart pill used above
                // (duplicate logic is intentional — this IIFE is isolated from the outer
                //  scope's locals, and replicating is simpler than refactoring). If the
                //  Overview formula changes, update BOTH places + the chart-pill block.
                const speedMult = { fast: 0.75, average: 1.0, slow: 1.35 }[i485ServiceCenter] || 1.0;
                const stepsDone = completedI485Steps.length;
                const I485_STEP_IDS = ['receipt', 'biometrics', 'ead', 'ap', 'interview', 'approval'];
                const STEP_ESTIMATED_DAYS = { receipt: 14, biometrics: 60, ead: 120, ap: 150, interview: 365, approval: 330 };
                const APPROVAL_EST_MIN = 180;
                const APPROVAL_EST_MAX = 450;

                let baseline = null;
                for (let i = I485_STEP_IDS.length - 1; i >= 0; i--) {
                  const id = I485_STEP_IDS[i];
                  if (completedI485Steps.includes(id) && stepActualDates[id]) {
                    baseline = new Date(new Date(stepActualDates[id]).getTime() - STEP_ESTIMATED_DAYS[id] * 86400000);
                    break;
                  }
                }
                if (!baseline) baseline = new Date();
                let earliest = new Date(baseline.getTime() + Math.round(APPROVAL_EST_MIN * speedMult) * 86400000);
                let latest   = new Date(baseline.getTime() + Math.round(APPROVAL_EST_MAX * speedMult) * 86400000);

                const pbMin = [180, 150, 120, 80, 50, 20][stepsDone] || 180;
                const pbMax = [330, 280, 220, 160, 100, 60][stepsDone] || 330;
                const pAMin = new Date(crossoverCalDate.getTime() + Math.round(pbMin * speedMult) * 86400000);
                const pAMax = new Date(crossoverCalDate.getTime() + Math.round(pbMax * speedMult) * 86400000);
                if (pAMin.getTime() > earliest.getTime()) earliest = pAMin;
                if (pAMax.getTime() > latest.getTime())   latest = pAMax;

                if (stepActualDates.approval) {
                  const actual = new Date(stepActualDates.approval);
                  earliest = actual;
                  latest = actual;
                }

                // Format each end as "YY年M月" (match Overview's format)
                const fmt = (d) => {
                  if (lang === 'en') return d.toLocaleDateString('en-US', { year: '2-digit', month: 'short' });
                  return `${String(d.getFullYear()).slice(2)}年${d.getMonth()+1}月`;
                };
                const sameMonth = earliest.getFullYear() === latest.getFullYear() && earliest.getMonth() === latest.getMonth();
                const rangeLabel = sameMonth ? fmt(earliest) : `${fmt(earliest)} – ${fmt(latest)}`;

                // Roughly how wide is the window, in months
                const spanMonths = Math.max(1, Math.round((latest.getTime() - earliest.getTime()) / (1000 * 60 * 60 * 24 * 30.44)));

                const progressDesc = [
                  lang === 'en' ? 'not yet filed' : '还没递件',
                  lang === 'en' ? 'receipt done' : '已收到 I-797',
                  lang === 'en' ? 'biometrics done' : '已做指纹',
                  lang === 'en' ? 'EAD approved' : '工卡已批',
                  lang === 'en' ? 'AP approved' : '旅行证已批',
                  lang === 'en' ? 'interview done — nearly there' : '面试已做 · 即将获批',
                ][stepsDone] || (lang === 'en' ? 'not yet filed' : '还没递件');
                const scLabel = i485ServiceCenter === 'fast'
                  ? (lang === 'en' ? 'fast (0.75×)' : '快 (0.75×)')
                  : i485ServiceCenter === 'slow'
                  ? (lang === 'en' ? 'slow (1.35×)' : '慢 (1.35×)')
                  : (lang === 'en' ? 'average (1.0×)' : '平均 (1.0×)');
                const isApproved = completedI485Steps.includes('approval');
                return (
                  <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--gc-rule)' }}>
                    <div className="gc-eyebrow" style={{ fontSize: '9px', color: 'var(--gc-green)', marginBottom: '3px' }}>
                      {lang === 'en' ? 'Then · GC Approval' : '然后 · 拿到绿卡'}
                    </div>
                    <div className="gc-serif" style={{
                      fontSize: '18px',
                      fontWeight: 700,
                      color: isApproved ? 'var(--gc-green)' : 'var(--gc-ink)',
                      lineHeight: 1.1,
                      letterSpacing: '-0.01em',
                      marginBottom: '4px',
                    }}>
                      {isApproved
                        ? (lang === 'en' ? '✓ Already approved' : '✓ 已获批')
                        : rangeLabel}
                    </div>
                    {!isApproved && (
                      <>
                        <div className="gc-mono" style={{ fontSize: '10.5px', color: 'var(--gc-muted)' }}>
                          {sameMonth
                            ? scLabel
                            : <><span>~{spanMonths} {lang === 'en' ? 'mo window' : '个月区间'}</span>
                                <span style={{ margin: '0 5px', color: 'var(--gc-rule)' }}>·</span>
                                <span style={{ color: 'var(--gc-ink-soft)' }}>{scLabel}</span></>}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--gc-muted)', marginTop: '3px' }}>
                          <span style={{ color: 'var(--gc-ink-soft)', fontWeight: 600 }}>{lang === 'en' ? 'Your progress: ' : '你的进度: '}</span>
                          {progressDesc}
                        </div>
                        <div style={{ fontSize: '9.5px', color: 'var(--gc-muted)', marginTop: '4px', lineHeight: 1.45, fontStyle: 'italic' }}>
                          {lang === 'en'
                            ? 'Matches the range shown on the Overview I-485 card (approval step).'
                            : lang === 'tw'
                            ? '與「總結」頁 I-485 卡最終批准區間一致。'
                            : '与「总结」页 I-485 卡最终批准区间一致。'}
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}
            </div>
          );
        })()}

        {/* Tooltip for historical data - shows ALL categories at that month.
            Suppressed when crossover detail popup is open (only one popup at a time). */}
        {hoveredMonthIndex !== null && !showCrossoverInfo && (() => {
          const month = historicalData[hoveredMonthIndex];
          // Defensive: historicalData may have fewer entries after pastMonths slider change
          // If hovered index is now out of bounds, just skip rendering
          if (!month || !month.month) return null;
          const xPos = (xScale(hoveredMonthIndex) / chartWidth) * 100;
          const isRightSide = xPos > 50;
          return (
            <div className="absolute bg-white border border-slate-200 rounded-lg shadow-xl p-2.5 z-30 cursor-pointer"
              style={{
                left: isRightSide ? 'auto' : `${xPos}%`,
                right: isRightSide ? `${100 - xPos}%` : 'auto',
                top: '40px',
                marginLeft: isRightSide ? 0 : '8px',
                marginRight: isRightSide ? '8px' : 0,
                minWidth: '140px'
              }}
              onClick={(e) => {
                e.stopPropagation();
                setHoveredMonthIndex(null);
              }}
              onTouchEnd={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setHoveredMonthIndex(null);
              }}>
              {/* Close button visible indicator */}
              <div className="absolute top-1 right-1 w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 z-10 pointer-events-none"
                style={{ fontSize: '12px' }}>
                ✕
              </div>
              <div className="text-[11px] font-bold text-slate-900 mb-1 pb-1 border-b border-slate-100 pr-5">
                {month.month}
              </div>
              <div className="space-y-0.5">
                {displayCategories.map(cat => {
                  const raw = month.data[`${cat}-${country}`];
                  const d = safeParseDate(raw);
                  const dateText = raw === 'C' ? (lang === 'en' ? 'Current ✓' : '无排期 ✓') :
                                  (d && d !== 'CURRENT') ? d.toLocaleDateString(lang === 'en' ? 'en-US' : 'zh-CN', { year: 'numeric', month: 'short' }) : 'N/A';
                  return (
                    <div key={cat} className="text-[10px] flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: colors[cat] }}></div>
                      <span className="font-semibold" style={{ color: colors[cat] }}>{cat}:</span>
                      <span className="text-slate-700">{dateText}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Tooltip for forecast hover.
            Suppressed when crossover detail popup is open. */}
        {hoveredForecast !== null && !showCrossoverInfo && (() => {
          // Forecast months extend from whichever bulletin month is currently loaded.
          const bulletinMonth = bulletinAnchorDate(1);
          const future = new Date(bulletinMonth.getFullYear(), bulletinMonth.getMonth() + hoveredForecast.monthOffset, 1);
          const futureLabel = lang === 'en' 
            ? future.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
            : `${future.getFullYear()}年${future.getMonth() + 1}月`;
          const xPos = (hoveredForecast.x / chartWidth) * 100;
          const isRightSide = xPos > 50;
          return (
            <div className="absolute cursor-pointer z-30"
              style={{
                left: isRightSide ? 'auto' : `${xPos}%`,
                right: isRightSide ? `${100 - xPos}%` : 'auto',
                top: '40px',
                marginLeft: isRightSide ? 0 : '8px',
                marginRight: isRightSide ? '8px' : 0,
                minWidth: '180px',
                background: 'var(--gc-surface)',
                border: '1px solid var(--gc-rule)',
                borderRadius: '3px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                padding: '10px',
              }}
              onClick={(e) => {
                e.stopPropagation();
                setHoveredForecast(null);
              }}
              onTouchEnd={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setHoveredForecast(null);
              }}>
              {/* Close button visible indicator */}
              <div className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center pointer-events-none"
                style={{ fontSize: '11px', color: 'var(--gc-muted)' }}>
                ✕
              </div>
              {/* Title: show actual calendar month + "forecast" label */}
              <div className="text-[11px] font-bold mb-0.5 pr-5 flex items-center gap-1" style={{ color: 'var(--gc-ink)' }}>
                <Activity size={10} style={{ color: 'var(--gc-muted)' }} />
                {futureLabel}
              </div>
              <div className="text-[9px] mb-1.5 pb-1" style={{ color: 'var(--gc-muted)', borderBottom: '1px solid var(--gc-rule-soft)' }}>
                {lang === 'en'
                  ? `Forecast (+${hoveredForecast.monthOffset}mo from now)`
                  : `预测中 (距现在+${hoveredForecast.monthOffset}个月)`}
              </div>
              <div className="space-y-0.5">
                {displayCategories.map(cat => {
                  const forecast = computeForecastForCategory(cat);
                  if (!forecast) return null;

                  if (forecast.isCurrent) {
                    return (
                      <div key={cat} className="text-[10px] flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: colors[cat] }}></div>
                        <span className="font-semibold" style={{ color: colors[cat] }}>{cat}:</span>
                        <span className="text-slate-700">{lang === 'en' ? 'Current ✓' : '无排期 ✓'}</span>
                      </div>
                    );
                  }

                  // Use the non-linear forecast curve for accurate date at this month
                  const latestRaw = historicalData[historicalData.length - 1].data[`${cat}-${country}`];
                  const latestD = safeParseDate(latestRaw);
                  if (!latestD || latestD === 'CURRENT') return null;

                  const advanceMs = forecast.computeAdvanceAt 
                    ? forecast.computeAdvanceAt(hoveredForecast.monthOffset)
                    : (forecast.expected - latestD.getTime()) * (hoveredForecast.monthOffset / forecastMonths);
                  const expectedDate = new Date(latestD.getTime() + advanceMs);
                  const fmt = (d) => d.toLocaleDateString(lang === 'en' ? 'en-US' : 'zh-CN', { year: '2-digit', month: 'short' });

                  return (
                    <div key={cat} className="text-[10px] flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: colors[cat] }}></div>
                      <span className="font-semibold" style={{ color: colors[cat] }}>{cat}:</span>
                      <span className="text-slate-700 font-medium">{fmt(expectedDate)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-1.5 pt-1.5 text-[8px] italic" style={{ color: 'var(--gc-muted)', borderTop: '1px solid var(--gc-rule-soft)' }}>
                {lang === 'en'
                  ? '* Based on avg monthly progress over past 12 months'
                  : '* 基于过去12个月的平均推进速度估算'}
              </div>
            </div>
          );
        })()}
      </div>
      )}

      {/* Forecast Scenario Selector — editorial dial.
          Reads as a spectrum from optimistic to pessimistic. Selection marked by
          a solid underline beneath the active cell (like newspaper section tabs)
          plus typographic emphasis. No color fills, no box highlight. */}
      <div className="mt-2" style={{
        padding: '10px 12px 8px',
        background: 'var(--gc-surface)',
        border: '1px solid var(--gc-rule)',
        borderRadius: 'var(--gc-radius-sm)',
      }}>
        <div className="flex items-baseline justify-between mb-2">
          <div className="gc-eyebrow" style={{ fontSize: '9px', color: 'var(--gc-muted)', letterSpacing: '0.14em' }}>
            {lang === 'en'
              ? 'FORECAST · SCENARIO'
              : lang === 'tw'
              ? '預測 · 情景'
              : '预测 · 情景'}
          </div>
          <span style={{ fontSize: '9px', color: 'var(--gc-muted-soft)' }}>
            {lang === 'en' ? 'tap to switch' : lang === 'tw' ? '點擊切換' : '点击切换'}
          </span>
        </div>
        {/* Rail container — 5 cells, each with its own tick & label; active cell gets an underline accent */}
        <div style={{ position: 'relative' }}>
          {/* Thin horizontal rule running through all cells — the "spectrum" */}
          <div style={{
            position: 'absolute',
            left: '2%', right: '2%',
            top: 'calc(50% - 0.5px)',
            height: '1px',
            background: 'var(--gc-rule-soft)',
            pointerEvents: 'none',
          }} />
          <div className="grid grid-cols-5" style={{ position: 'relative' }}>
            {[
              { id: 'optimistic',          arrow: '↑↑', labelEn: 'Opt',   labelZh: '乐观',   labelTw: '樂觀',   mult: '1.5'  },
              { id: 'somewhatOptimistic',  arrow: '↑',  labelEn: 'Above', labelZh: '偏乐观', labelTw: '偏樂觀', mult: '1.25' },
              { id: 'expected',            arrow: '→',  labelEn: 'Avg',   labelZh: '预期',   labelTw: '預期',   mult: '1.0'  },
              { id: 'somewhatPessimistic', arrow: '↓',  labelEn: 'Below', labelZh: '偏悲观', labelTw: '偏悲觀', mult: '0.75' },
              { id: 'pessimistic',         arrow: '↓↓', labelEn: 'Pes',   labelZh: '悲观',   labelTw: '悲觀',   mult: '0.5'  },
            ].map(s => {
              const active = scenario === s.id;
              const label = lang === 'en' ? s.labelEn : lang === 'tw' ? s.labelTw : s.labelZh;
              return (
                <button key={s.id}
                  onClick={() => setScenario(s.id)}
                  style={{
                    padding: '4px 2px 6px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '2px',
                    position: 'relative',
                    transition: 'all 120ms',
                  }}>
                  {/* Arrow + label — top row */}
                  <div style={{
                    fontSize: '10.5px',
                    fontWeight: active ? 700 : 500,
                    color: active ? 'var(--gc-ink)' : 'var(--gc-muted)',
                    letterSpacing: '0.01em',
                    lineHeight: 1.15,
                    transition: 'all 120ms',
                  }}>
                    <span style={{ marginRight: '2px' }}>{s.arrow}</span>{label}
                  </div>
                  {/* Multiplier — bottom row, smaller + monospace for tabular alignment */}
                  <div className="gc-mono" style={{
                    fontSize: '8.5px',
                    fontWeight: active ? 600 : 400,
                    color: active ? 'var(--gc-ink-soft)' : 'var(--gc-muted-soft)',
                    letterSpacing: '0.02em',
                    lineHeight: 1,
                    transition: 'all 120ms',
                  }}>
                    ×{s.mult}
                  </div>
                  {/* Active underline — 2px ink bar, full width of the cell */}
                  {active && (
                    <div style={{
                      position: 'absolute',
                      bottom: '-1px',
                      left: '10%', right: '10%',
                      height: '2px',
                      background: 'var(--gc-ink)',
                      borderRadius: '1px',
                    }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
        <div className="mt-2 flex items-start gap-2" style={{ padding: '6px 8px', background: 'var(--gc-paper-soft)', border: '1px solid var(--gc-rule-soft)', borderRadius: 'var(--gc-radius-sm)' }}>
          <Activity size={11} strokeWidth={2.2} className="flex-shrink-0" style={{ color: 'var(--gc-muted)', marginTop: '2px' }} />
          <div className="flex-1 min-w-0">
            <span className="gc-eyebrow" style={{ fontSize: '8px', marginRight: '6px' }}>
              {lang === 'en' ? 'MODEL' : lang === 'tw' ? '模型' : '模型'}
            </span>
            <span style={{ fontSize: '10px', color: 'var(--gc-ink-soft)', lineHeight: 1.5 }}>
          {scenario === 'optimistic' && (lang === 'en'
            ? 'Fast-track: current pace + strong policy / visa pool recovery boost.'
            : lang === 'tw'
            ? '快速推進：當前速度 + 政策/簽證池恢復強力加速。'
            : '快速推进：当前速度 + 政策/签证池恢复强力加速。')}
          {scenario === 'somewhatOptimistic' && (lang === 'en'
            ? 'Above average: mild tailwinds, slightly better than baseline.'
            : lang === 'tw'
            ? '偏樂觀：略有利環境,比基線稍快。'
            : '偏乐观：略有利环境，比基线稍快。')}
          {scenario === 'expected' && (lang === 'en'
            ? 'Recent 12mo trend + 21yr long-term average (baseline).'
            : lang === 'tw'
            ? '近12個月趨勢 + 21年長期均值（基線）。'
            : '近12个月趋势 + 21年长期均值（基线）。')}
          {scenario === 'somewhatPessimistic' && (lang === 'en'
            ? 'Below average: mild headwinds, demand uptick or slight drag.'
            : lang === 'tw'
            ? '偏悲觀：略有阻力,需求略增或輕微拖累。'
            : '偏悲观：略有阻力，需求略增或轻微拖累。')}
          {scenario === 'pessimistic' && (lang === 'en'
            ? 'Slow: demand surge, minor retrogression, or visa pool shortage.'
            : lang === 'tw'
            ? '緩慢：需求激增、輕度倒退或簽證池短缺。'
            : '缓慢：需求激增、轻度倒退或签证池短缺。')}
            </span>
          </div>
        </div>
      </div>

      {/* Chart Summary - compact cards (4 columns fits all F or EB categories on one row) */}
      <div className="mt-2 grid grid-cols-4 gap-1" style={{ width: '100%' }}>
        {displayCategories.slice(0, 6).map(cat => {
          const latestData = historicalData[historicalData.length - 1].data[`${cat}-${country}`];
          const previousData = historicalData[historicalData.length - 2].data[`${cat}-${country}`];

          if (!latestData) return null;

          const latestDate = safeParseDate(latestData);
          const prevDate = safeParseDate(previousData);

          let movementDays = 0;
          let isAdvanced = false;
          if (latestDate && prevDate && latestDate !== 'CURRENT' && prevDate !== 'CURRENT' && latestData !== 'C' && previousData !== 'C') {
            movementDays = Math.round((latestDate - prevDate) / (1000 * 60 * 60 * 24));
            isAdvanced = movementDays > 0;
          }

          const displayDate = latestData === 'C' ? (lang === 'en' ? 'Current' : '无排期') :
                              (latestDate && latestDate !== 'CURRENT') ?
                              latestDate.toLocaleDateString(lang === 'en' ? 'en-US' : 'zh-CN', { year: '2-digit', month: 'short' }) :
                              'N/A';

          return (
            <div key={cat} className="px-1.5 py-1 bg-slate-50 rounded-md" style={{ minWidth: 0 }}>
              <div className="flex items-center gap-1 mb-0">
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: colors[cat] }}></div>
                <span className="text-[10px] font-bold text-slate-700 truncate">{cat}</span>
                {Math.abs(movementDays) > 0 && (
                  <span className={`text-[9px] font-medium flex-shrink-0 ml-auto ${isAdvanced ? 'text-emerald-600' : 'text-red-600'}`}>
                    {isAdvanced ? '+' : ''}{movementDays}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-slate-600 truncate">
                {displayDate}
              </div>
            </div>
          );
        })}
      </div>
      </>)}
    </div>
  );
};

// ============================================================
// ForecastHub — wraps TrendChart + Forecast as sub-tabs
// ============================================================
const ForecastHub = ({ userCase, i485ServiceCenter = 'average', completedI485Steps = [], stepActualDates = {} }) => {
  const { t, lang } = useLang();
  const [view, setView] = useState('next'); // 'chart' | 'next'（chart 暂下架）

  const subTabs = [
    // 「长期走势」暂时下架：它与总结卡/下月预测的口径不一致（hybrid 模型 vs 直线外推），
    // 统一口径前先只保留下月预测。TrendChart 组件代码保留，恢复时把这段解开即可。
    // {
    //   id: 'chart',
    //   icon: BarChart3,
    //   en: { label: 'Long-term chart', desc: 'Historical movement + forecast to eligibility' },
    //   zh: { label: '长期走势', desc: '历史排期 + 预测到符合条件的时间' },
    //   tw: { label: '長期走勢', desc: '歷史排期 + 預測到符合條件的時間' },
    // },
    {
      id: 'next',
      icon: Sparkles,
      en: { label: 'Next month', desc: 'AI estimate for next month\'s bulletin' },
      zh: { label: '下月预测', desc: 'AI 预估下月公告的移动' },
      tw: { label: '下月預測', desc: 'AI 預估下月公告的移動' },
    },
  ];

  const active = subTabs.find(s => s.id === view);
  const activeI18n = active[lang] || active.en;

  return (
    <div>
      {/* Header */}
      <div style={{ padding: '14px 12px 10px', borderBottom: '1px solid var(--gc-rule)' }}>
        <div className="gc-eyebrow" style={{ color: 'var(--gc-green)' }}>
          {lang === 'en' ? 'FORECAST' : lang === 'tw' ? '預測' : '预测'}
        </div>
        <h2 className="gc-serif" style={{
          fontSize: '20px', fontWeight: 700, color: 'var(--gc-ink)',
          margin: '2px 0 4px', letterSpacing: '-0.01em'
        }}>
          {lang === 'en' ? 'When will your date be current?' : lang === 'tw' ? '排期什麼時候到?' : '排期什么时候到?'}
        </h2>
        <p style={{ fontSize: '12px', color: 'var(--gc-muted)', margin: 0, lineHeight: 1.4 }}>
          {activeI18n.desc}
        </p>
      </div>

      {/* Sub-tab toggle — hidden entirely while only one view is available */}
      <div style={{ padding: '0 12px', display: subTabs.length > 1 ? 'block' : 'none' }}>
        <div style={{
          display: 'flex', gap: 0, margin: '12px 0',
          border: '1px solid var(--gc-rule)', borderRadius: '3px', overflow: 'hidden'
        }}>
          {subTabs.map((s, i) => {
            const isActive = view === s.id;
            const Icon = s.icon;
            const i18n = s[lang] || s.en;
            return (
              <button key={s.id}
                onClick={() => setView(s.id)}
                style={{
                  flex: 1, padding: '10px 12px', fontSize: '12px', fontWeight: 600,
                  background: isActive ? 'var(--gc-green)' : 'var(--gc-surface)',
                  color: isActive ? 'var(--gc-paper)' : 'var(--gc-muted)',
                  borderLeft: i > 0 ? '1px solid var(--gc-rule)' : 'none',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  gap: '6px', transition: 'all 120ms', cursor: 'pointer',
                }}>
                <Icon size={12} strokeWidth={2} />
                <span>{i18n.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      {view === 'chart' && <TrendChart userCase={userCase} i485ServiceCenter={i485ServiceCenter} completedI485Steps={completedI485Steps} stepActualDates={stepActualDates} />}
      {view === 'next'  && <Forecast userCase={userCase} />}
    </div>
  );
};

// ============================================================
// FAQ - Frequently Asked Questions (including cost breakdown)
// ============================================================
const FAQ = () => {
  const { lang } = useLang();
  const [openIdx, setOpenIdx] = useState(null); // All FAQs collapsed by default

  const faqs = {
    zh: [
      {
        q: '申请绿卡总共需要多少钱？',
        a: (
          <div className="space-y-2">
            <p>根据申请类别和家庭人数不同，总费用大致如下：</p>
            <div className="bg-slate-50 rounded-lg p-2.5 space-y-1 text-[11px]">
              <div className="font-bold text-slate-900 mb-1">政府官方费用（一人）：</div>
              <div className="flex justify-between"><span>PERM 劳工证（EB2/EB3）</span><span className="font-mono">$0 政府*</span></div>
              <div className="flex justify-between"><span>I-140 移民申请</span><span className="font-mono">$715</span></div>
              <div className="flex justify-between"><span>I-485 身份调整</span><span className="font-mono">$1,440</span></div>
              <div className="flex justify-between"><span>I-765 工卡 EAD</span><span className="font-mono">$520</span></div>
              <div className="flex justify-between"><span>I-131 旅行证 AP</span><span className="font-mono">$630</span></div>
              <div className="flex justify-between"><span>生物采集</span><span className="font-mono">$85</span></div>
              <div className="flex justify-between"><span>体检费（视医生）</span><span className="font-mono">$200-500</span></div>
              <div className="border-t border-slate-300 mt-1 pt-1 flex justify-between font-bold text-slate-900">
                <span>小计</span><span className="font-mono">~$3,600-3,900</span>
              </div>
              <p className="text-[9px] text-slate-500 mt-1">* PERM政府无费用，但雇主广告/审核成本约 $5,000-10,000（全由雇主承担）</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-2.5 text-[11px]">
              <div className="font-bold text-amber-900 mb-1">律师费（可选但推荐）：</div>
              <div className="flex justify-between"><span>PERM 律师费（雇主付）</span><span className="font-mono">$3,000-6,000</span></div>
              <div className="flex justify-between"><span>I-140 律师费</span><span className="font-mono">$2,000-4,000</span></div>
              <div className="flex justify-between"><span>I-485 律师费</span><span className="font-mono">$2,500-5,000</span></div>
            </div>
            <div className="bg-emerald-50 rounded-lg p-2.5 text-[11px] text-emerald-900">
              <div className="flex justify-between items-baseline py-0.5">
                <span className="gc-eyebrow" style={{ fontSize: '8px' }}>总预算</span>
                <span className="font-mono font-bold">$6,000 – $13,000</span>
              </div>
              <div className="flex justify-between items-baseline py-0.5" style={{ borderTop: '1px solid var(--gc-green-border)' }}>
                <span className="gc-eyebrow" style={{ fontSize: '8px' }}>DIY</span>
                <span className="font-mono font-bold">$3,600 – $3,900</span>
              </div>
              <div className="flex justify-between items-baseline py-0.5" style={{ borderTop: '1px solid var(--gc-green-border)' }}>
                <span className="gc-eyebrow" style={{ fontSize: '8px' }}>雇主出</span>
                <span className="font-mono font-bold">$8,000 – $16,000</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-500">※ 配偶和21岁以下子女需各自缴 I-485/EAD/AP/体检费用（AP自2024年起收费$630）。雇主通常承担PERM和I-140所有费用。</p>
          </div>
        )
      },
      {
        q: '换工作会影响我的优先日（PD）吗？',
        a: (
          <div className="space-y-1.5">
            <p><strong>优先日跟着你走，不跟着雇主走。</strong>I-140批准后的优先日是你的永久财产。</p>
            <p><strong>I-140 portability规则</strong>：只要 I-485 等待超过180天且仍pending，你可以换同类工作（same/similar）而不影响排期。</p>
            <p className="bg-amber-50 rounded-lg p-2 text-[11px] text-amber-900">
              注意：如果I-140还没批就换工作，新雇主需要重新走PERM+I-140流程，但你的原优先日可以保留（portability）。
            </p>
          </div>
        )
      },
      {
        q: '配偶和孩子怎么办？',
        a: (
          <div className="space-y-1.5">
            <p><strong>配偶和21岁以下未婚子女</strong>可以作为衍生申请人（derivative beneficiary）一起申请绿卡。</p>
            <p>他们与主申请人<strong>同时递交</strong> I-485（concurrent filing），使用同一个优先日。</p>
            <p className="bg-blue-50 rounded-lg p-2 text-[11px] text-blue-900">
              <strong>Child Status Protection Act (CSPA)</strong>：如果I-140审批的时间让你的孩子年龄超过21岁，CSPA可以"冻结"年龄。具体请咨询律师。
            </p>
            <p>每个家庭成员需要各自的I-485、EAD、AP申请费（主申之外 $1,440/人）。</p>
          </div>
        )
      },
      {
        q: '港澳台出生算"中国大陆"吗？',
        a: (
          <div className="space-y-1.5">
            <p><strong>不算。</strong>美国签证排期按"出生地（chargeability）"划分，不看国籍。</p>
            <p>以下出生地算作"全球/ROW"（Rest of World）：</p>
            <ul className="ml-4 space-y-0.5 text-[11px]">
              <li>✓ 台湾出生</li>
              <li>✓ 香港出生</li>
              <li>✓ 澳门出生</li>
              <li>✓ 其他国家出生（如加拿大、新加坡等）</li>
            </ul>
            <p className="bg-emerald-50 rounded-lg p-2 text-[11px] text-emerald-900">
              <strong>Cross-chargeability规则</strong>：如果你出生在中国大陆但配偶出生在港澳台或其他国家，可以申请用配偶的出生地排期，通常更快！
            </p>
          </div>
        )
      },
      {
        q: 'EB-2和EB-3可以同时申请吗？',
        a: (
          <div className="space-y-1.5">
            <p><strong>可以，这叫"downgrade"（降级）策略</strong>。</p>
            <p>当EB-3排期比EB-2快时（确实会发生），你可以：</p>
            <ol className="ml-4 space-y-0.5 text-[11px]">
              <li>1. 已有I-140（EB-2）批准</li>
              <li>2. 用同一个PERM重新递交一个EB-3的I-140</li>
              <li>3. 用较快的那个来递交I-485</li>
            </ol>
            <p className="bg-amber-50 rounded-lg p-2 text-[11px] text-amber-900">
              需要雇主配合（雇主出新的I-140申请费）。2023年就有很多中国大陆EB-2申请人downgrade到EB-3。
            </p>
          </div>
        )
      },
      {
        q: 'I-140批了但PD没到，能递I-485吗？',
        a: (
          <div className="space-y-1.5">
            <p><strong>要看USCIS本月用哪个表（表A还是表B）：</strong></p>
            <div className="bg-slate-50 rounded-lg p-2 text-[11px] space-y-1">
              <div><strong>USCIS用表B（Dates for Filing）</strong>：你的PD早于表B日期，<strong>可以递 I-485</strong>（即使表A还没到）</div>
              <div><strong>USCIS用表A（Final Action）</strong>：必须PD早于表A日期才能递</div>
            </div>
            <p>USCIS每月会在官网宣布"本月用哪个表"。你可以在【总结】tab看到当前用的是哪个表。</p>
            <p className="bg-blue-50 rounded-lg p-2 text-[11px] text-blue-900">
              <strong>建议</strong>：一旦能用表B递件，立刻递！可以同时拿到EAD（工卡）和AP（旅行证），灵活度大增。
            </p>
          </div>
        )
      },
      {
        q: '排期倒退（retrogression）怎么办？',
        a: (
          <div className="space-y-1.5">
            <p><strong>排期倒退不可怕，已经递交的案件不受影响。</strong></p>
            <p>倒退影响的是：</p>
            <ul className="ml-4 space-y-0.5 text-[11px]">
              <li>✕ <strong>新案件</strong>：不能在倒退期间递 I-485</li>
              <li>✓ <strong>已pending的I-485</strong>：继续处理，不会被退回</li>
              <li>⏳ <strong>批准时间</strong>：需等PD重新current才能最终批准</li>
            </ul>
            <p className="bg-emerald-50 rounded-lg p-2 text-[11px] text-emerald-900">
              倒退通常发生在财年末（7-9月）因签证额度用完，10月新财年开始后会重新current。
            </p>
          </div>
        )
      },
      {
        q: '递交I-485后多久能拿到绿卡？',
        a: (
          <div className="space-y-1.5">
            <p>根据2026年USCIS数据，I-485处理时间差异很大：</p>
            <div className="bg-slate-50 rounded-lg p-2 text-[11px] space-y-0.5">
              <div><strong>最快</strong>（内布拉斯加处理中心）：~10个月</div>
              <div>→ <strong>平均</strong>（德州处理中心）：~14个月</div>
              <div><strong>最慢</strong>（NBC/纽约/加州都市区）：~18-20个月</div>
            </div>
            <p>影响因素：你的居住州（决定处理中心）、案件类别（EB1最快）、是否需要面试（~72% EB类免面试）、背景调查速度等。</p>
            <p className="bg-blue-50 rounded-lg p-2 text-[11px] text-blue-900">
              去【I-485流程】tab选择你的处理中心速度，可以看到每一步的具体时间线。
            </p>
          </div>
        )
      },
      {
        q: '递交I-485后能出境/旅行吗？',
        a: (
          <div className="space-y-1.5">
            <p><strong>需要Advance Parole（AP，旅行证）才能出境并返回。</strong>否则被视为"放弃申请"。</p>
            <p>AP是I-131申请的产物，通常跟I-485一起递交，免费（如果同时递交I-485）。</p>
            <div className="bg-amber-50 rounded-lg p-2 text-[11px] text-amber-900 space-y-1">
              <div><strong>例外</strong>：如果你持有有效H-1B或L-1签证，可以不用AP直接使用原签证出入境（recapture H-1B进出日期）。</div>
            </div>
            <p>AP通常3-5个月拿到，目前和EAD一起做成一张combo卡片。</p>
          </div>
        )
      },
      {
        q: '递交I-485后能换工作吗？',
        a: (
          <div className="space-y-1.5">
            <p><strong>可以，但要满足条件：</strong></p>
            <ul className="ml-4 space-y-0.5 text-[11px]">
              <li>✓ I-485已pending <strong>超过180天</strong></li>
              <li>✓ 新工作属于<strong>同类或相近</strong>职位（same/similar occupational classification）</li>
              <li>✓ 需要提交 Form I-485 Supplement J 通知USCIS</li>
            </ul>
            <p className="bg-emerald-50 rounded-lg p-2 text-[11px] text-emerald-900">
              这就是 <strong>AC21 portability</strong>。180天后你基本"自由"了，不被雇主绑定。
            </p>
            <p>换工作前，<strong>强烈建议咨询律师</strong>评估新职位是否符合"same/similar"要求，否则可能导致I-485被拒。</p>
          </div>
        )
      },
      {
        q: '亲属移民：F类别与申请人身份有什么关系？',
        a: (
          <div className="space-y-2">
            <p>F类别的申请人身份<strong>非常重要</strong>，不同类别对应不同的申请人：</p>
            <div className="bg-slate-50 rounded-lg p-2.5 text-[11px] space-y-1">
              <div className="flex justify-between"><span className="font-semibold">F1</span><span>🇺🇸 美国公民申请成年未婚子女</span></div>
              <div className="flex justify-between"><span className="font-semibold">F2A</span><span>🪪 绿卡持有人申请配偶/未成年子女</span></div>
              <div className="flex justify-between"><span className="font-semibold">F2B</span><span>🪪 绿卡持有人申请成年未婚子女</span></div>
              <div className="flex justify-between"><span className="font-semibold">F3</span><span>🇺🇸 美国公民申请已婚子女</span></div>
              <div className="flex justify-between"><span className="font-semibold">F4</span><span>🇺🇸 美国公民申请兄弟姐妹</span></div>
            </div>
            <p className="bg-amber-50 rounded-lg p-2 text-[11px] text-amber-900">
              <strong>绿卡持有人不能申请 F1/F3/F4</strong>，也不能申请兄弟姐妹。只有入籍成为美国公民后才可以。
            </p>
          </div>
        )
      },
      {
        q: 'F2B的"opt-out"权利是什么？值得保留吗？',
        a: (
          <div className="space-y-2">
            <p>这是一个<strong>很多人不知道但非常重要</strong>的权利。</p>
            <p>根据 <strong>INA 204(k)</strong>（《儿童身份保护法》CSPA第6节）：</p>
            <div className="bg-blue-50 rounded-lg p-2.5 text-[11px] space-y-1.5">
              <p className="font-semibold text-blue-900">场景：你妈妈是绿卡，她给你（21+未婚）申请F2B。</p>
              <p>多年等待中，你妈妈<strong>入籍成为美国公民</strong>了。按默认规则，F2B会自动转为F1（优先日保留）。</p>
              <p className="font-semibold text-blue-900">但是！</p>
              <p>如果F2B当前排期比F1更快（历史上常见！），你有权<strong>书面申请选择保留F2B身份</strong>，不转F1。</p>
            </div>
            <div className="bg-emerald-50 rounded-lg p-2 text-[11px] text-emerald-900">
              <strong>操作方法</strong>：以beneficiary身份写一封签名信给USCIS/NVC，注明"opt out of conversion from F2B to F1, INA 204(k)"，附上I-130收据号码、申请人入籍证书复印件、双方姓名出生日期。
            </div>
            <p className="text-[11px] text-slate-600">
              对比F1和F2B的方法：查看<a href="https://travel.state.gov" className="text-blue-600 underline">Visa Bulletin</a>最新的cutoff日期。数字越大（越新），排期越快。
            </p>
          </div>
        )
      },
      {
        q: 'F2A/F2B申请人中途入籍会怎样？',
        a: (
          <div className="space-y-2">
            <p>这是一个<strong>双刃剑</strong>。入籍后会触发类别自动转换，**但**不一定都是好事：</p>
            <div className="bg-emerald-50 rounded-lg p-2.5 text-[11px]">
              <div className="font-bold text-emerald-900 mb-1">✓ 对你有利的情况：</div>
              <ul className="list-disc pl-4 space-y-1">
                <li><strong>F2A + 受益人21岁以下</strong> → 升级为 <strong>IR（立即亲属）</strong>：无需等待，马上可以申请！</li>
                <li><strong>F2B</strong> + F1排期比F2B快 → 自动转F1，加速获批</li>
              </ul>
            </div>
            <div className="bg-red-50 rounded-lg p-2.5 text-[11px]">
              <div className="font-bold text-red-900 mb-1">需要注意的情况：</div>
              <ul className="list-disc pl-4 space-y-1">
                <li><strong>F2A + 受益人已21岁（aged out）</strong> → 按CSPA公式算调整年龄，可能变F2B然后F1。<strong>没有opt-out权利</strong>，无法回到F2A。</li>
                <li><strong>F2B + F1比F2B慢</strong> → 你反而要等更久！这时务必用opt-out权利保留F2B。</li>
                <li><strong>F2A受益人有衍生子女（derivatives）</strong> → 升级到IR后，衍生子女不能再跟随，需要单独申请。</li>
              </ul>
            </div>
            <p className="bg-blue-50 rounded-lg p-2 text-[11px] text-blue-900">
              <strong>关键</strong>：入籍前先查当前Visa Bulletin，评估对孩子签证的影响。必要时咨询移民律师。
            </p>
          </div>
        )
      },
    ],
    tw: [
      {
        q: '申請綠卡總共需要多少錢？',
        a: (
          <div className="space-y-2">
            <p>根據申請類別和家庭人數不同，總費用大致如下：</p>
            <div className="bg-slate-50 rounded-lg p-2.5 space-y-1 text-[11px]">
              <div className="font-bold text-slate-900 mb-1">政府官方費用（一人）：</div>
              <div className="flex justify-between"><span>PERM 勞工證（EB2/EB3）</span><span className="font-mono">$0 政府*</span></div>
              <div className="flex justify-between"><span>I-140 移民申請</span><span className="font-mono">$715</span></div>
              <div className="flex justify-between"><span>I-485 身份調整</span><span className="font-mono">$1,440</span></div>
              <div className="flex justify-between"><span>I-765 工卡 EAD</span><span className="font-mono">$520</span></div>
              <div className="flex justify-between"><span>I-131 旅行證 AP</span><span className="font-mono">$630</span></div>
              <div className="flex justify-between"><span>生物採集</span><span className="font-mono">$85</span></div>
              <div className="flex justify-between"><span>體檢費（視醫生）</span><span className="font-mono">$200-500</span></div>
              <div className="border-t border-slate-300 mt-1 pt-1 flex justify-between font-bold text-slate-900">
                <span>小計</span><span className="font-mono">~$3,600-3,900</span>
              </div>
              <p className="text-[9px] text-slate-500 mt-1">* PERM政府無費用，但雇主廣告/審核成本約 $5,000-10,000（全由雇主承擔）</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-2.5 text-[11px]">
              <div className="font-bold text-amber-900 mb-1">律師費（可選但推薦）：</div>
              <div className="flex justify-between"><span>PERM 律師費（雇主付）</span><span className="font-mono">$3,000-6,000</span></div>
              <div className="flex justify-between"><span>I-140 律師費</span><span className="font-mono">$2,000-4,000</span></div>
              <div className="flex justify-between"><span>I-485 律師費</span><span className="font-mono">$2,500-5,000</span></div>
            </div>
            <div className="bg-emerald-50 rounded-lg p-2.5 text-[11px] text-emerald-900">
              <div className="flex justify-between items-baseline py-0.5">
                <span className="gc-eyebrow" style={{ fontSize: '8px' }}>總預算</span>
                <span className="font-mono font-bold">$6,000 – $13,000</span>
              </div>
              <div className="flex justify-between items-baseline py-0.5" style={{ borderTop: '1px solid var(--gc-green-border)' }}>
                <span className="gc-eyebrow" style={{ fontSize: '8px' }}>DIY</span>
                <span className="font-mono font-bold">$3,600 – $3,900</span>
              </div>
              <div className="flex justify-between items-baseline py-0.5" style={{ borderTop: '1px solid var(--gc-green-border)' }}>
                <span className="gc-eyebrow" style={{ fontSize: '8px' }}>雇主出</span>
                <span className="font-mono font-bold">$8,000 – $16,000</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-500">※ 配偶和21歲以下子女需各自繳 I-485/EAD/AP/體檢費用（AP自2024年起收費$630）。雇主通常承擔PERM和I-140所有費用。</p>
          </div>
        )
      },
      {
        q: '換工作會影響我的優先日（PD）嗎？',
        a: (
          <div className="space-y-1.5">
            <p><strong>優先日跟著你走，不跟著雇主走。</strong>I-140批准後的優先日是你的永久財產。</p>
            <p><strong>I-140 portability規則</strong>：只要 I-485 等待超過180天且仍pending，你可以換同類工作（same/similar）而不影響排期。</p>
            <p className="bg-amber-50 rounded-lg p-2 text-[11px] text-amber-900">
              注意：如果I-140還沒批就換工作，新雇主需要重新走PERM+I-140流程，但你的原優先日可以保留（portability）。
            </p>
          </div>
        )
      },
      {
        q: '配偶和孩子怎麼辦？',
        a: (
          <div className="space-y-1.5">
            <p><strong>配偶和21歲以下未婚子女</strong>可以作為衍生申請人（derivative beneficiary）一起申請綠卡。</p>
            <p>他們與主申請人<strong>同時遞交</strong> I-485（concurrent filing），使用同一個優先日。</p>
            <p className="bg-blue-50 rounded-lg p-2 text-[11px] text-blue-900">
              <strong>Child Status Protection Act (CSPA)</strong>：如果I-140審批的時間讓你的孩子年齡超過21歲，CSPA可以「凍結」年齡。具體請諮詢律師。
            </p>
            <p>每個家庭成員需要各自的I-485、EAD、AP申請費（主申之外 $1,440/人）。</p>
          </div>
        )
      },
      {
        q: '港澳台出生算「中國大陸」嗎？',
        a: (
          <div className="space-y-1.5">
            <p><strong>不算。</strong>美國簽證排期按「出生地（chargeability）」劃分，不看國籍。</p>
            <p>以下出生地算作「全球/ROW」（Rest of World）：</p>
            <ul className="ml-4 space-y-0.5 text-[11px]">
              <li>✓ 台灣出生</li>
              <li>✓ 香港出生</li>
              <li>✓ 澳門出生</li>
              <li>✓ 其他國家出生（如加拿大、新加坡等）</li>
            </ul>
            <p className="bg-emerald-50 rounded-lg p-2 text-[11px] text-emerald-900">
              <strong>Cross-chargeability規則</strong>：如果你出生在中國大陸但配偶出生在港澳台或其他國家，可以申請用配偶的出生地排期，通常更快！
            </p>
          </div>
        )
      },
      {
        q: 'EB-2和EB-3可以同時申請嗎？',
        a: (
          <div className="space-y-1.5">
            <p><strong>可以，這叫「downgrade」（降級）策略</strong>。</p>
            <p>當EB-3排期比EB-2快時（確實會發生），你可以：</p>
            <ol className="ml-4 space-y-0.5 text-[11px]">
              <li>1. 已有I-140（EB-2）批准</li>
              <li>2. 用同一個PERM重新遞交一個EB-3的I-140</li>
              <li>3. 用較快的那個來遞交I-485</li>
            </ol>
            <p className="bg-amber-50 rounded-lg p-2 text-[11px] text-amber-900">
              需要雇主配合（雇主出新的I-140申請費）。2023年就有很多中國大陸EB-2申請人downgrade到EB-3。
            </p>
          </div>
        )
      },
      {
        q: 'I-140批了但PD沒到，能遞I-485嗎？',
        a: (
          <div className="space-y-1.5">
            <p><strong>要看USCIS本月用哪個表（表A還是表B）：</strong></p>
            <div className="bg-slate-50 rounded-lg p-2 text-[11px] space-y-1">
              <div><strong>USCIS用表B（Dates for Filing）</strong>：你的PD早於表B日期，<strong>可以遞 I-485</strong>（即使表A還沒到）</div>
              <div><strong>USCIS用表A（Final Action）</strong>：必須PD早於表A日期才能遞</div>
            </div>
            <p>USCIS每月會在官網宣布「本月用哪個表」。你可以在【總結】tab看到當前用的是哪個表。</p>
            <p className="bg-blue-50 rounded-lg p-2 text-[11px] text-blue-900">
              <strong>建議</strong>：一旦能用表B遞件，立刻遞！可以同時拿到EAD（工卡）和AP（旅行證），靈活度大增。
            </p>
          </div>
        )
      },
      {
        q: '排期倒退（retrogression）怎麼辦？',
        a: (
          <div className="space-y-1.5">
            <p><strong>排期倒退不可怕，已經遞交的案件不受影響。</strong></p>
            <p>倒退影響的是：</p>
            <ul className="ml-4 space-y-0.5 text-[11px]">
              <li>✕ <strong>新案件</strong>：不能在倒退期間遞 I-485</li>
              <li>✓ <strong>已pending的I-485</strong>：繼續處理，不會被退回</li>
              <li>⏳ <strong>批准時間</strong>：需等PD重新current才能最終批准</li>
            </ul>
            <p className="bg-emerald-50 rounded-lg p-2 text-[11px] text-emerald-900">
              倒退通常發生在財年末（7-9月）因簽證額度用完，10月新財年開始後會重新current。
            </p>
          </div>
        )
      },
      {
        q: '遞交I-485後多久能拿到綠卡？',
        a: (
          <div className="space-y-1.5">
            <p>根據2026年USCIS數據，I-485處理時間差異很大：</p>
            <div className="bg-slate-50 rounded-lg p-2 text-[11px] space-y-0.5">
              <div><strong>最快</strong>（內布拉斯加處理中心）：~10個月</div>
              <div>→ <strong>平均</strong>（德州處理中心）：~14個月</div>
              <div><strong>最慢</strong>（NBC/紐約/加州都市區）：~18-20個月</div>
            </div>
            <p>影響因素：你的居住州（決定處理中心）、案件類別（EB1最快）、是否需要面試（~72% EB類免面試）、背景調查速度等。</p>
            <p className="bg-blue-50 rounded-lg p-2 text-[11px] text-blue-900">
              去【I-485流程】tab選擇你的處理中心速度，可以看到每一步的具體時間線。
            </p>
          </div>
        )
      },
      {
        q: '遞交I-485後能出境/旅行嗎？',
        a: (
          <div className="space-y-1.5">
            <p><strong>需要Advance Parole（AP，旅行證）才能出境並返回。</strong>否則被視為「放棄申請」。</p>
            <p>AP是I-131申請的產物，通常跟I-485一起遞交，免費（如果同時遞交I-485）。</p>
            <div className="bg-amber-50 rounded-lg p-2 text-[11px] text-amber-900 space-y-1">
              <div><strong>例外</strong>：如果你持有有效H-1B或L-1簽證，可以不用AP直接使用原簽證出入境（recapture H-1B進出日期）。</div>
            </div>
            <p>AP通常3-5個月拿到，目前和EAD一起做成一張combo卡片。</p>
          </div>
        )
      },
      {
        q: '遞交I-485後能換工作嗎？',
        a: (
          <div className="space-y-1.5">
            <p><strong>可以，但要滿足條件：</strong></p>
            <ul className="ml-4 space-y-0.5 text-[11px]">
              <li>✓ I-485已pending <strong>超過180天</strong></li>
              <li>✓ 新工作屬於<strong>同類或相近</strong>職位（same/similar occupational classification）</li>
              <li>✓ 需要提交 Form I-485 Supplement J 通知USCIS</li>
            </ul>
            <p className="bg-emerald-50 rounded-lg p-2 text-[11px] text-emerald-900">
              這就是 <strong>AC21 portability</strong>。180天後你基本「自由」了，不被雇主綁定。
            </p>
            <p>換工作前，<strong>強烈建議諮詢律師</strong>評估新職位是否符合「same/similar」要求，否則可能導致I-485被拒。</p>
          </div>
        )
      },
      {
        q: '親屬移民：F類別與申請人身份有什麼關係？',
        a: (
          <div className="space-y-2">
            <p>F類別的申請人身份<strong>非常重要</strong>，不同類別對應不同的申請人：</p>
            <div className="bg-slate-50 rounded-lg p-2.5 text-[11px] space-y-1">
              <div className="flex justify-between"><span className="font-semibold">F1</span><span>🇺🇸 美國公民申請成年未婚子女</span></div>
              <div className="flex justify-between"><span className="font-semibold">F2A</span><span>🪪 綠卡持有人申請配偶/未成年子女</span></div>
              <div className="flex justify-between"><span className="font-semibold">F2B</span><span>🪪 綠卡持有人申請成年未婚子女</span></div>
              <div className="flex justify-between"><span className="font-semibold">F3</span><span>🇺🇸 美國公民申請已婚子女</span></div>
              <div className="flex justify-between"><span className="font-semibold">F4</span><span>🇺🇸 美國公民申請兄弟姐妹</span></div>
            </div>
            <p className="bg-amber-50 rounded-lg p-2 text-[11px] text-amber-900">
              <strong>綠卡持有人不能申請 F1/F3/F4</strong>，也不能申請兄弟姐妹。只有入籍成為美國公民後才可以。
            </p>
          </div>
        )
      },
      {
        q: 'F2B的「opt-out」權利是什麼？值得保留嗎？',
        a: (
          <div className="space-y-2">
            <p>這是一個<strong>很多人不知道但非常重要</strong>的權利。</p>
            <p>根據 <strong>INA 204(k)</strong>（《兒童身份保護法》CSPA第6節）：</p>
            <div className="bg-blue-50 rounded-lg p-2.5 text-[11px] space-y-1.5">
              <p className="font-semibold text-blue-900">場景：你媽媽是綠卡，她給你（21+未婚）申請F2B。</p>
              <p>多年等待中，你媽媽<strong>入籍成為美國公民</strong>了。按預設規則，F2B會自動轉為F1（優先日保留）。</p>
              <p className="font-semibold text-blue-900">但是！</p>
              <p>如果F2B當前排期比F1更快（歷史上常見！），你有權<strong>書面申請選擇保留F2B身份</strong>，不轉F1。</p>
            </div>
            <div className="bg-emerald-50 rounded-lg p-2 text-[11px] text-emerald-900">
              <strong>操作方法</strong>：以beneficiary身份寫一封簽名信給USCIS/NVC，註明「opt out of conversion from F2B to F1, INA 204(k)」，附上I-130收據號碼、申請人入籍證書副本、雙方姓名出生日期。
            </div>
            <p className="text-[11px] text-slate-600">
              對比F1和F2B的方法：查看<a href="https://travel.state.gov" className="text-blue-600 underline">Visa Bulletin</a>最新的cutoff日期。數字越大（越新），排期越快。
            </p>
          </div>
        )
      },
      {
        q: 'F2A/F2B申請人中途入籍會怎樣？',
        a: (
          <div className="space-y-2">
            <p>這是一個<strong>雙刃劍</strong>。入籍後會觸發類別自動轉換，**但**不一定都是好事：</p>
            <div className="bg-emerald-50 rounded-lg p-2.5 text-[11px]">
              <div className="font-bold text-emerald-900 mb-1">✓ 對你有利的情況：</div>
              <ul className="list-disc pl-4 space-y-1">
                <li><strong>F2A + 受益人21歲以下</strong> → 升級為 <strong>IR（立即親屬）</strong>：無需等待，馬上可以申請！</li>
                <li><strong>F2B</strong> + F1排期比F2B快 → 自動轉F1，加速獲批</li>
              </ul>
            </div>
            <div className="bg-red-50 rounded-lg p-2.5 text-[11px]">
              <div className="font-bold text-red-900 mb-1">需要注意的情況：</div>
              <ul className="list-disc pl-4 space-y-1">
                <li><strong>F2A + 受益人已21歲（aged out）</strong> → 按CSPA公式算調整年齡，可能變F2B然後F1。<strong>沒有opt-out權利</strong>，無法回到F2A。</li>
                <li><strong>F2B + F1比F2B慢</strong> → 你反而要等更久！這時務必用opt-out權利保留F2B。</li>
                <li><strong>F2A受益人有衍生子女（derivatives）</strong> → 升級到IR後，衍生子女不能再跟隨，需要單獨申請。</li>
              </ul>
            </div>
            <p className="bg-blue-50 rounded-lg p-2 text-[11px] text-blue-900">
              <strong>關鍵</strong>：入籍前先查當前Visa Bulletin，評估對孩子簽證的影響。必要時諮詢移民律師。
            </p>
          </div>
        )
      },
    ],
    en: [
      {
        q: 'How much does the entire green card process cost?',
        a: (
          <div className="space-y-2">
            <p>Total cost varies by category and family size. Here&apos;s the breakdown:</p>
            <div className="bg-slate-50 rounded-lg p-2.5 space-y-1 text-[11px]">
              <div className="font-bold text-slate-900 mb-1">Government fees (per person):</div>
              <div className="flex justify-between"><span>PERM Labor Cert (EB2/EB3)</span><span className="font-mono">$0 govt*</span></div>
              <div className="flex justify-between"><span>I-140 Immigrant Petition</span><span className="font-mono">$715</span></div>
              <div className="flex justify-between"><span>I-485 Adjustment of Status</span><span className="font-mono">$1,440</span></div>
              <div className="flex justify-between"><span>I-765 EAD Work Permit</span><span className="font-mono">$520</span></div>
              <div className="flex justify-between"><span>I-131 Advance Parole</span><span className="font-mono">$630</span></div>
              <div className="flex justify-between"><span>Biometrics</span><span className="font-mono">$85</span></div>
              <div className="flex justify-between"><span>Medical exam (varies)</span><span className="font-mono">$200-500</span></div>
              <div className="border-t border-slate-300 mt-1 pt-1 flex justify-between font-bold text-slate-900">
                <span>Subtotal</span><span className="font-mono">~$3,600-3,900</span>
              </div>
              <p className="text-[9px] text-slate-500 mt-1">* PERM has no govt fee, but employer recruitment/audit costs ~$5,000-10,000 (employer pays)</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-2.5 text-[11px]">
              <div className="font-bold text-amber-900 mb-1">Attorney fees (optional but recommended):</div>
              <div className="flex justify-between"><span>PERM attorney (employer pays)</span><span className="font-mono">$3,000-6,000</span></div>
              <div className="flex justify-between"><span>I-140 attorney fee</span><span className="font-mono">$2,000-4,000</span></div>
              <div className="flex justify-between"><span>I-485 attorney fee</span><span className="font-mono">$2,500-5,000</span></div>
            </div>
            <div className="bg-emerald-50 rounded-lg p-2.5 text-[11px] text-emerald-900">
              <div className="flex justify-between items-baseline py-0.5">
                <span className="gc-eyebrow" style={{ fontSize: '8px' }}>Total</span>
                <span className="font-mono font-bold">$6,000 – $13,000</span>
              </div>
              <div className="flex justify-between items-baseline py-0.5" style={{ borderTop: '1px solid var(--gc-green-border)' }}>
                <span className="gc-eyebrow" style={{ fontSize: '8px' }}>DIY</span>
                <span className="font-mono font-bold">$3,600 – $3,900</span>
              </div>
              <div className="flex justify-between items-baseline py-0.5" style={{ borderTop: '1px solid var(--gc-green-border)' }}>
                <span className="gc-eyebrow" style={{ fontSize: '8px' }}>Employer</span>
                <span className="font-mono font-bold">$8,000 – $16,000</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-500">※ Spouse and children under 21 need their own I-485/EAD/AP/medical fees (AP no longer free as of 2024, now $630). Employer typically pays all PERM and I-140 fees.</p>
          </div>
        )
      },
      {
        q: 'Does changing jobs affect my Priority Date (PD)?',
        a: (
          <div className="space-y-1.5">
            <p><strong>Your PD belongs to you, not your employer.</strong> Once I-140 is approved, the PD is permanently yours.</p>
            <p><strong>I-140 portability rule</strong>: If I-485 has been pending 180+ days, you can change to a same/similar job without losing your place in line.</p>
            <p className="bg-amber-50 rounded-lg p-2 text-[11px] text-amber-900">
              Note: If I-140 isn&apos;t approved yet and you change jobs, the new employer needs to redo PERM+I-140, but you can retain your original PD through portability.
            </p>
          </div>
        )
      },
      {
        q: 'What about my spouse and children?',
        a: (
          <div className="space-y-1.5">
            <p><strong>Spouses and unmarried children under 21</strong> can apply as derivative beneficiaries.</p>
            <p>They file I-485 <strong>concurrently</strong> with the primary applicant, using the same priority date.</p>
            <p className="bg-blue-50 rounded-lg p-2 text-[11px] text-blue-900">
              <strong>Child Status Protection Act (CSPA)</strong>: If I-140 processing time ages your child past 21, CSPA can &quot;freeze&quot; their age. Consult an attorney.
            </p>
            <p>Each family member pays their own I-485, EAD, AP fees ($1,440/person beyond primary).</p>
          </div>
        )
      },
      {
        q: 'Are Hong Kong/Macau/Taiwan births counted as &quot;China&quot;?',
        a: (
          <div className="space-y-1.5">
            <p><strong>No.</strong> US visa bulletin categorizes by &quot;country of birth (chargeability)&quot;, not nationality.</p>
            <p>The following births count as &quot;Rest of World (ROW)&quot;:</p>
            <ul className="ml-4 space-y-0.5 text-[11px]">
              <li>✓ Born in Taiwan</li>
              <li>✓ Born in Hong Kong</li>
              <li>✓ Born in Macau</li>
              <li>✓ Born in other countries (Canada, Singapore, etc.)</li>
            </ul>
            <p className="bg-emerald-50 rounded-lg p-2 text-[11px] text-emerald-900">
              <strong>Cross-chargeability rule</strong>: If you were born in mainland China but your spouse was born in HK/Macau/Taiwan/elsewhere, you can use your spouse&apos;s chargeability—often much faster!
            </p>
          </div>
        )
      },
      {
        q: 'Can I apply for EB-2 and EB-3 simultaneously?',
        a: (
          <div className="space-y-1.5">
            <p><strong>Yes, this is called the &quot;downgrade&quot; strategy.</strong></p>
            <p>When EB-3 moves faster than EB-2 (it does happen), you can:</p>
            <ol className="ml-4 space-y-0.5 text-[11px]">
              <li>1. Have an approved I-140 under EB-2</li>
              <li>2. File another I-140 under EB-3 using the same PERM</li>
              <li>3. File I-485 based on whichever is faster</li>
            </ol>
            <p className="bg-amber-50 rounded-lg p-2 text-[11px] text-amber-900">
              Requires employer cooperation (new I-140 filing fee). Many China EB-2 applicants downgraded to EB-3 in 2023.
            </p>
          </div>
        )
      },
      {
        q: 'I-140 approved but PD not current—can I file I-485?',
        a: (
          <div className="space-y-1.5">
            <p><strong>Depends on which chart USCIS uses this month:</strong></p>
            <div className="bg-slate-50 rounded-lg p-2 text-[11px] space-y-1">
              <div><strong>USCIS uses Table B (Dates for Filing)</strong>: If your PD is earlier than Table B, <strong>you CAN file I-485</strong> (even if Table A isn&apos;t reached)</div>
              <div><strong>USCIS uses Table A (Final Action)</strong>: PD must be earlier than Table A</div>
            </div>
            <p>USCIS announces which chart each month. Check the [Overview] tab to see which one is active.</p>
            <p className="bg-blue-50 rounded-lg p-2 text-[11px] text-blue-900">
              <strong>Recommendation</strong>: File as soon as Table B allows! You&apos;ll get EAD and AP, greatly increasing flexibility.
            </p>
          </div>
        )
      },
      {
        q: 'What if the visa bulletin retrogresses?',
        a: (
          <div className="space-y-1.5">
            <p><strong>Don&apos;t panic—already-filed cases are not affected.</strong></p>
            <p>Retrogression impacts:</p>
            <ul className="ml-4 space-y-0.5 text-[11px]">
              <li>✕ <strong>New cases</strong>: Can&apos;t file I-485 during retrogression</li>
              <li>✓ <strong>Pending I-485</strong>: Continues processing, won&apos;t be returned</li>
              <li>⏳ <strong>Final approval</strong>: Waits until PD becomes current again</li>
            </ul>
            <p className="bg-emerald-50 rounded-lg p-2 text-[11px] text-emerald-900">
              Retrogression usually happens at fiscal year-end (Jul-Sep) when visa quota runs out. New quota starts Oct 1.
            </p>
          </div>
        )
      },
      {
        q: 'How long does I-485 take after filing?',
        a: (
          <div className="space-y-1.5">
            <p>Based on 2026 USCIS data, processing varies widely:</p>
            <div className="bg-slate-50 rounded-lg p-2 text-[11px] space-y-0.5">
              <div><strong>Fastest</strong> (Nebraska SC): ~10 months</div>
              <div>→ <strong>Average</strong> (Texas SC): ~14 months</div>
              <div><strong>Slowest</strong> (NBC/NY/CA metros): ~18-20 months</div>
            </div>
            <p>Factors: your state (determines SC), category (EB1 fastest), interview requirement (~72% EB cases waived), background check speed.</p>
            <p className="bg-blue-50 rounded-lg p-2 text-[11px] text-blue-900">
              Go to [I-485 Timeline] tab and select your service center speed to see step-by-step timeline.
            </p>
          </div>
        )
      },
      {
        q: 'Can I travel abroad after filing I-485?',
        a: (
          <div className="space-y-1.5">
            <p><strong>You need Advance Parole (AP) to exit and re-enter.</strong> Otherwise, USCIS may deem your I-485 abandoned.</p>
            <p>AP comes from I-131, usually filed with I-485 (free if concurrent).</p>
            <div className="bg-amber-50 rounded-lg p-2 text-[11px] text-amber-900 space-y-1">
              <div><strong>Exception</strong>: If you have valid H-1B or L-1, you can travel on that visa without AP (and recapture H-1B time).</div>
            </div>
            <p>AP typically takes 3-5 months and is issued as a combo card with EAD.</p>
          </div>
        )
      },
      {
        q: 'Can I change jobs after filing I-485?',
        a: (
          <div className="space-y-1.5">
            <p><strong>Yes, if you meet the conditions:</strong></p>
            <ul className="ml-4 space-y-0.5 text-[11px]">
              <li>✓ I-485 has been pending <strong>more than 180 days</strong></li>
              <li>✓ New job is in <strong>same/similar</strong> occupational classification</li>
              <li>✓ File Form I-485 Supplement J to notify USCIS</li>
            </ul>
            <p className="bg-emerald-50 rounded-lg p-2 text-[11px] text-emerald-900">
              This is <strong>AC21 portability</strong>. After 180 days, you&apos;re essentially &quot;free&quot; from your sponsor.
            </p>
            <p>Before switching, <strong>strongly consult an attorney</strong> to assess whether the new role qualifies as &quot;same/similar&quot; or risk I-485 denial.</p>
          </div>
        )
      },
      {
        q: 'Family Immigration: What is the relationship between F categories and petitioner status?',
        a: (
          <div className="space-y-2">
            <p>Petitioner status is <strong>very important</strong> for F categories:</p>
            <div className="bg-slate-50 rounded-lg p-2.5 text-[11px] space-y-1">
              <div className="flex justify-between"><span className="font-semibold">F1</span><span>🇺🇸 USC petitions unmarried adult children</span></div>
              <div className="flex justify-between"><span className="font-semibold">F2A</span><span>🪪 LPR petitions spouse/minor children</span></div>
              <div className="flex justify-between"><span className="font-semibold">F2B</span><span>🪪 LPR petitions unmarried adult children</span></div>
              <div className="flex justify-between"><span className="font-semibold">F3</span><span>🇺🇸 USC petitions married children</span></div>
              <div className="flex justify-between"><span className="font-semibold">F4</span><span>🇺🇸 USC petitions siblings</span></div>
            </div>
            <p className="bg-amber-50 rounded-lg p-2 text-[11px] text-amber-900">
              <strong>LPRs cannot petition F1/F3/F4</strong>, nor can they petition siblings. Must naturalize to US citizen first.
            </p>
          </div>
        )
      },
      {
        q: 'What is the F2B "opt-out" right? Should I exercise it?',
        a: (
          <div className="space-y-2">
            <p>This is a <strong>lesser-known but very important</strong> right.</p>
            <p>Under <strong>INA 204(k)</strong> (CSPA Section 6):</p>
            <div className="bg-blue-50 rounded-lg p-2.5 text-[11px] space-y-1.5">
              <p className="font-semibold text-blue-900">Scenario: Your LPR mother petitions you (21+ unmarried) as F2B.</p>
              <p>During the long wait, your mother <strong>naturalizes to US citizen</strong>. By default, F2B auto-converts to F1 (priority date retained).</p>
              <p className="font-semibold text-blue-900">However!</p>
              <p>If the current F2B cutoff is MORE advanced than F1 (common historically!), you have the right to <strong>submit a written request to opt-out</strong> and stay in F2B.</p>
            </div>
            <div className="bg-emerald-50 rounded-lg p-2 text-[11px] text-emerald-900">
              <strong>How to do it</strong>: As beneficiary, write a signed letter to USCIS/NVC stating "opt out of conversion from F2B to F1, INA 204(k)" with the I-130 receipt number, copy of petitioner's naturalization certificate, and both parties' names and dates of birth.
            </div>
            <p className="text-[11px] text-slate-600">
              How to compare F1 vs F2B: Check the latest <a href="https://travel.state.gov" className="text-blue-600 underline">Visa Bulletin</a> cutoff dates. More recent dates = faster progression.
            </p>
          </div>
        )
      },
      {
        q: 'What happens when an F2A/F2B petitioner naturalizes?',
        a: (
          <div className="space-y-2">
            <p>This is a <strong>double-edged sword</strong>. Naturalization triggers auto-conversion, but it&apos;s not always beneficial:</p>
            <div className="bg-emerald-50 rounded-lg p-2.5 text-[11px]">
              <div className="font-bold text-emerald-900 mb-1">✓ Favorable scenarios:</div>
              <ul className="list-disc pl-4 space-y-1">
                <li><strong>F2A + beneficiary under 21</strong> → Upgrades to <strong>IR (Immediate Relative)</strong>: No wait, file immediately!</li>
                <li><strong>F2B</strong> + F1 cutoff faster than F2B → Auto-converts to F1, faster approval</li>
              </ul>
            </div>
            <div className="bg-red-50 rounded-lg p-2.5 text-[11px]">
              <div className="font-bold text-red-900 mb-1">Tricky scenarios:</div>
              <ul className="list-disc pl-4 space-y-1">
                <li><strong>F2A + beneficiary aged out (21+)</strong> → CSPA-adjusted age determines path (may become F2B then F1). <strong>No opt-out right</strong>; cannot return to F2A.</li>
                <li><strong>F2B + F1 slower than F2B</strong> → You&apos;d actually wait LONGER! Use your opt-out right to stay in F2B.</li>
                <li><strong>F2A beneficiary has derivatives</strong> → Upgrading to IR means derivatives cannot follow; each needs separate petition.</li>
              </ul>
            </div>
            <p className="bg-blue-50 rounded-lg p-2 text-[11px] text-blue-900">
              <strong>Key</strong>: Before naturalizing, check current Visa Bulletin and evaluate impact on your children&apos;s cases. Consult an immigration attorney when necessary.
            </p>
          </div>
        )
      },
    ],
  };

  const activeList = faqs[lang] || faqs.en;
  const title = lang === 'en' ? 'Frequently Asked Questions' : lang === 'tw' ? '常見問題' : '常见问题';
  const subtitle = lang === 'en'
    ? 'Answers to the most common green card questions'
    : lang === 'tw' ? '最常見的綠卡問題解答' : '最常见的绿卡问题解答';

  // Per-question icon — matches question topic order in each language array
  const FAQ_ICONS = [
    DollarSign,      // 1. cost
    RefreshCw,       // 2. job change effect on PD
    Users,           // 3. spouse & kids
    Globe,           // 4. HK/TW/Macao = China?
    Scale,           // 5. EB-2 vs EB-3 simultaneously
    ClipboardList,   // 6. I-140 approved but PD not current
    AlertTriangle,   // 7. retrogression
    Clock,           // 8. how long after I-485 filing
    Plane,           // 9. travel after I-485
    Briefcase,       // 10. change jobs after I-485
    Users,           // 11. family F-category relationship
    Target,          // 12. F2B opt-out
    Shield,          // 13. F2A/F2B naturalization mid-stream
  ];

  return (
    <div style={{
      background: 'var(--gc-surface)',
      border: '1px solid var(--gc-rule)',
      borderRadius: 'var(--gc-radius-lg)',
      padding: '14px',
    }}>
      {/* Masthead */}
      <div style={{ marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid var(--gc-rule-soft)' }}>
        <div className="gc-eyebrow" style={{ marginBottom: '3px' }}>
          {lang === 'en' ? 'Reference' : lang === 'tw' ? '參考資料' : '参考资料'}
        </div>
        <h2 className="gc-serif" style={{ fontSize: '18px', fontWeight: 600, color: 'var(--gc-ink)', letterSpacing: '-0.01em', lineHeight: 1.2 }}>
          {title}
        </h2>
        <p style={{ fontSize: '11px', color: 'var(--gc-muted)', marginTop: '2px' }}>{subtitle}</p>
      </div>

      <div>
        {activeList.map((item, idx) => {
          const isOpen = openIdx === idx;
          const Icon = FAQ_ICONS[idx] || Info;
          const num = String(idx + 1).padStart(2, '0');
          return (
            <div key={idx} style={{
              borderTop: idx === 0 ? '1px solid var(--gc-rule-soft)' : 'none',
              borderBottom: '1px solid var(--gc-rule-soft)',
              background: isOpen ? 'var(--gc-paper-soft)' : 'transparent',
              transition: 'background 120ms',
            }}>
              <button
                onClick={() => setOpenIdx(isOpen ? -1 : idx)}
                className="w-full text-left flex items-start gap-2.5"
                style={{ padding: '10px 4px', boxSizing: 'border-box' }}>
                {/* Number marker — editorial/legal clause style */}
                <span className="gc-mono flex-shrink-0" style={{
                  fontSize: '10px',
                  color: 'var(--gc-muted)',
                  fontWeight: 600,
                  width: '18px',
                  textAlign: 'right',
                  marginTop: '2px',
                  letterSpacing: '0.02em',
                }}>{num}</span>
                {/* Topic icon — subtle */}
                <Icon size={13} strokeWidth={2} className="flex-shrink-0" style={{
                  color: isOpen ? 'var(--gc-green)' : 'var(--gc-muted)',
                  marginTop: '2px',
                  transition: 'color 120ms',
                }} />
                {/* Question text */}
                <span className="flex-1 min-w-0" style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: isOpen ? 'var(--gc-ink)' : 'var(--gc-ink-soft)',
                  lineHeight: 1.45,
                }}>
                  {item.q}
                </span>
                {/* Chevron — typographic */}
                <span className="flex-shrink-0" style={{
                  fontSize: '10px',
                  color: 'var(--gc-muted-soft)',
                  marginTop: '4px',
                  transition: 'transform 120ms',
                  transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  display: 'inline-block',
                }}>▼</span>
              </button>
              {isOpen && (
                <div style={{
                  padding: '0 4px 12px 36px',
                  fontSize: '12px',
                  color: 'var(--gc-ink-soft)',
                  lineHeight: 1.55,
                }}>
                  {item.a}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Attorney disclaimer */}
      <div style={{
        marginTop: '12px',
        padding: '8px 10px',
        background: 'var(--gc-amber-soft)',
        border: '1px solid var(--gc-amber-border)',
        borderRadius: 'var(--gc-radius-sm)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '6px',
      }}>
        <AlertTriangle size={11} style={{ color: 'var(--gc-amber)', flexShrink: 0, marginTop: '2px' }} />
        <p style={{ fontSize: '10px', color: 'var(--gc-amber-ink)', lineHeight: 1.5, margin: 0 }}>
          {lang === 'en'
            ? 'This information is for reference only. For your specific case, consult a licensed immigration attorney.'
            : lang === 'tw'
            ? '以上資訊僅供參考。個案情況請諮詢持照移民律師。'
            : '以上信息仅供参考。个案情况请咨询持照移民律师。'}
        </p>
      </div>
    </div>
  );
};

// ============================================================
// Glossary
// ============================================================
const Glossary = () => {
  const { t, lang } = useLang();
  // Grouped by category for easier scanning
  const groups = [
    {
      title: lang === 'en' ? 'Dates & Status' : lang === 'tw' ? '日期與狀態' : '日期与状态',
      terms: [
        { term: t.termPD, desc: t.termPDDesc, icon: Calendar },
        { term: t.termFAD, desc: t.termFADDesc, icon: Target },
        { term: t.termDFF, desc: t.termDFFDesc, icon: FileText },
        { term: t.termCurrent, desc: t.termCurrentDesc, icon: CheckCircle2 },
        { term: t.termRetrogression, desc: t.termRetrogressionDesc, icon: TrendingDown },
        { term: t.termVisaBulletin, desc: t.termVisaBulletinDesc, icon: BarChart3 },
      ],
    },
    {
      title: lang === 'en' ? 'Forms & Applications' : lang === 'tw' ? '表格與申請' : '表格与申请',
      terms: [
        { term: t.termI140, desc: t.termI140Desc, icon: FileText },
        { term: t.termI485, desc: t.termI485Desc, icon: FileText },
        { term: t.termPERM, desc: t.termPERMDesc, icon: Briefcase },
        { term: t.termEAD, desc: t.termEADDesc, icon: Shield },
        { term: t.termAP, desc: t.termAPDesc, icon: Globe },
        { term: t.termRFE, desc: t.termRFEDesc, icon: AlertCircle },
        { term: t.termPremium, desc: t.termPremiumDesc, icon: Zap },
      ],
    },
    {
      title: lang === 'en' ? 'Paths & Rules' : lang === 'tw' ? '途徑與規則' : '途径与规则',
      terms: [
        { term: t.termAOS, desc: t.termAOSDesc, icon: RefreshCw },
        { term: t.termCP, desc: t.termCPDesc, icon: Mail },
        { term: t.termCrossCharge, desc: t.termCrossChargeDesc, icon: Users },
        { term: t.termPerCountryCap, desc: t.termPerCountryCapDesc, icon: Target },
        { term: t.termDerivative, desc: t.termDerivativeDesc, icon: Users },
        { term: t.termNIW, desc: t.termNIWDesc, icon: Sparkles },
        { term: t.termUSCIS, desc: t.termUSCISDesc, icon: Database },
      ],
    },
  ];
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-sm">
      <div className="mb-3">
        <h2 className="text-base font-bold text-slate-900">{t.glossaryTitle}</h2>
        <p className="text-[11px] text-slate-500 mt-0.5">
          {lang === 'en'
            ? '20 key green card terms organized by theme'
            : lang === 'tw' ? '分類整理的 20 個綠卡關鍵名詞' : '分类整理的 20 个绿卡关键名词'}
        </p>
      </div>
      <div className="space-y-3">
        {groups.map((g, gi) => (
          <div key={gi}>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 px-1">
              {g.title}
            </div>
            <div className="space-y-1.5">
              {g.terms.map((item, i) => (
                <div key={i} className="p-2.5 bg-slate-50 rounded-lg">
                  <div className="flex items-start gap-2">
                    <div className="w-7 h-7 rounded-md bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <item.icon size={13} className="text-slate-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[12px] font-bold text-slate-900 mb-0.5 leading-tight">{item.term}</div>
                      <div className="text-[11px] text-slate-600 leading-relaxed">{item.desc}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

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
          {lang === 'en' ? 'THE INDEX' : '身份索引'}
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
              <div className="gc-eyebrow" style={{ color: 'var(--gc-muted)', marginBottom: '6px', fontSize: '9px' }}>
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
                        fontSize: '9px',
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
                      <div className="gc-eyebrow" style={{ fontSize: '8px' }}>{lang === 'en' ? 'WAIT' : '排期'}</div>
                      <div style={{ color: wl.color, fontWeight: 700 }}>{wl[lang]}</div>
                    </div>
                    <div>
                      <div className="gc-eyebrow" style={{ fontSize: '8px' }}>{lang === 'en' ? 'TIMELINE' : '时间线'}</div>
                      <div className="gc-mono" style={{ color: 'var(--gc-ink)', fontWeight: 600 }}>{info.timeline}</div>
                    </div>
                  </div>
                  <div className="gc-eyebrow" style={{ color: 'var(--gc-muted)', marginBottom: '6px', fontSize: '9px' }}>
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
                <div style={{ marginTop: '14px', padding: '10px 12px', fontSize: '10px', color: 'var(--gc-muted)', background: 'var(--gc-paper-soft)', border: '1px solid var(--gc-rule-soft)', borderRadius: 'var(--gc-radius-sm)', lineHeight: 1.5 }}>
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
                      <div className="gc-mono" style={{ fontSize: '10px', color: 'var(--gc-muted)', fontWeight: 700, letterSpacing: '0.08em' }}>
                        {p.category}
                      </div>
                      <div className="gc-serif" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--gc-ink)', lineHeight: 1.3, marginTop: '2px' }}>
                        {info.name}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--gc-muted)', marginTop: '3px', lineHeight: 1.4 }}>
                        {info.summary}
                      </div>
                    </div>
                    <span style={{ fontSize: '9px', fontWeight: 700, color: wl.color, whiteSpace: 'nowrap', marginTop: '2px' }}>
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
                            fontSize: '8.5px',
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
                      <div className="gc-eyebrow" style={{ fontSize: '8px', color: 'var(--gc-muted)', marginBottom: '4px' }}>
                        {lang === 'en' ? 'TIMELINE' : '时间线'}
                      </div>
                      <div className="gc-mono" style={{ fontSize: '11px', color: 'var(--gc-ink)', marginBottom: '8px' }}>{info.timeline}</div>
                      <div className="gc-eyebrow" style={{ fontSize: '8px', color: 'var(--gc-muted)', marginBottom: '4px' }}>
                        {lang === 'en' ? 'STEPS' : '步骤'}
                      </div>
                      <ol style={{ paddingLeft: '16px', fontSize: '11px', color: 'var(--gc-ink-soft)', lineHeight: 1.55, margin: '0 0 8px' }}>
                        {info.steps.map((s, i) => <li key={i} style={{ marginBottom: '2px' }}>{s}</li>)}
                      </ol>
                      <div style={{ padding: '7px 9px', background: 'var(--gc-amber-soft)', border: '1px solid var(--gc-amber-border)', borderRadius: 'var(--gc-radius-sm)', fontSize: '10.5px', color: 'var(--gc-amber-ink)', lineHeight: 1.5 }}>
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
          <div style={{ marginTop: '14px', padding: '10px 12px', fontSize: '10px', color: 'var(--gc-muted)', background: 'var(--gc-paper-soft)', border: '1px solid var(--gc-rule-soft)', borderRadius: 'var(--gc-radius-sm)', lineHeight: 1.5 }}>
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

// ============================================================
// Help Center - combines FAQ + Glossary + Data Source
// ============================================================
const HelpCenter = ({ initialSection = 'faq' }) => {
  const { t, lang } = useLang();
  const [section, setSection] = useState(initialSection);

  const sections = [
    { id: 'faq', label: t.navFAQ, icon: Info },
    { id: 'glossary', label: t.navGlossary, icon: Info },
    { id: 'data', label: t.navData, icon: Database },
  ];

  return (
    <div className="space-y-2">
      {/* Sub-tab selector */}
      <div className="bg-white rounded-2xl border border-slate-200 p-1 shadow-sm">
        <div className="flex gap-1" style={{ width: '100%' }}>
          {sections.map((s) => {
            const Icon = s.icon;
            const active = section === s.id;
            return (
              <button key={s.id} onClick={() => setSection(s.id)}
                style={{ flex: '1 1 0%', minWidth: 0, boxSizing: 'border-box' }}
                className={`flex items-center justify-center gap-1 px-2 py-2 text-[11px] font-semibold rounded-lg transition-all truncate ${
                  active
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}>
                <Icon size={12} className="flex-shrink-0" />
                <span className="truncate">{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Section content */}
      {section === 'faq' && <FAQ />}
      {section === 'glossary' && <Glossary />}
      {section === 'data' && <DataSource />}
    </div>
  );
};

// ============================================================
// LanguageGateModal — the very first screen on a truly fresh visit: pick a
// language before anything else renders. Same card geometry as OnboardingModal
// (380px, green top border, backdrop blur, fade+lift-in) so picking a language
// and landing on OnboardingModal reads as one continuous surface rather than
// a second, different-looking dialog.
// ============================================================
const LanguageGateModal = ({ theme = 'passport', onPick }) => {
  const opts = [
    { v: 'zh', label: '简体中文' },
    { v: 'tw', label: '繁體中文' },
    { v: 'en', label: 'English' },
  ];
  return (
    <div className="visa-root" data-theme={theme} style={{
      position: 'fixed', inset: 0, zIndex: 1001,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px',
    }}>
      <style>{`
        @keyframes langGateBackdropIn {
          from { opacity: 0; backdrop-filter: blur(0px); -webkit-backdrop-filter: blur(0px); }
          to   { opacity: 1; backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); }
        }
        @keyframes langGateCardIn {
          from { opacity: 0; transform: translateY(8px) scale(0.985); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .gc-langgate-backdrop, .gc-langgate-card { animation: none !important; }
        }
      `}</style>

      {/* Backdrop — solid opaque dim + blur, fade-in (matches OnboardingModal) */}
      <div className="gc-langgate-backdrop" style={{
        position: 'absolute', inset: 0,
        background: 'rgba(15, 20, 25, 0.55)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        animation: 'langGateBackdropIn 240ms ease-out both',
      }} />

      {/* Card — identical width/radius/shadow/animation to OnboardingModal's card,
          so the swap between the two feels seamless rather than like a new window. */}
      <div className="gc-langgate-card" style={{
        position: 'relative',
        background: 'var(--gc-surface)',
        border: '1px solid var(--gc-rule)',
        borderTop: '3px solid var(--gc-green)',
        borderRadius: 'var(--gc-radius)',
        width: '100%',
        maxWidth: '380px',
        maxHeight: '92vh',
        overflowY: 'auto',
        padding: '20px 18px 16px',
        animation: 'langGateCardIn 260ms cubic-bezier(0.16, 1, 0.3, 1) both',
        animationDelay: '60ms',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.25), 0 2px 8px rgba(0, 0, 0, 0.12)',
        zIndex: 1,
      }}>
        {/* Header — no language picked yet, so every string is shown trilingually */}
        <div style={{ textAlign: 'center', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid var(--gc-rule-soft)' }}>
          <Globe size={20} style={{ color: 'var(--gc-green)', marginBottom: '6px' }} strokeWidth={1.6} />
          <div className="gc-eyebrow" style={{ color: 'var(--gc-green)', marginBottom: '4px' }}>
            GREEN CARD TRACKER
          </div>
          <h2 className="gc-serif" style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--gc-ink)', letterSpacing: '-0.01em', margin: 0, lineHeight: 1.3, whiteSpace: 'nowrap' }}>
            选择语言 · 選擇語言 · Choose a language
          </h2>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {opts.map((o) => (
            <button
              key={o.v}
              onClick={() => onPick(o.v)}
              style={{
                width: '100%',
                textAlign: 'center',
                padding: '16px 14px',
                background: 'var(--gc-surface)',
                border: '1px solid var(--gc-rule)',
                borderLeft: '2px solid var(--gc-green)',
                borderRadius: 'var(--gc-radius-sm)',
                cursor: 'pointer',
                transition: 'all 140ms',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--gc-paper-soft)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--gc-surface)'; }}
            >
              <span className="gc-serif" style={{ fontSize: '16px', fontWeight: 600, color: 'var(--gc-ink)' }}>
                {o.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// OnboardingModal — first-time setup (choose: I have a case, or I'm exploring)
// ============================================================
const OnboardingModal = ({ lang, theme = 'passport', initialMode = 'choose', initialForm = null, onComplete, onThemeChange, onClose }) => {
  // Local state for the form (only used when user clicks "I have a case")
  const [mode, setMode] = useState(initialMode); // 'choose' | 'form'
  const [subtypeAttempted, setSubtypeAttempted] = useState(false);
  const [categoryAttempted, setCategoryAttempted] = useState(false);
  const [pdAttempted, setPdAttempted] = useState(false);
  const [inUSAttempted, setInUSAttempted] = useState(false);
  const [roleAttempted, setRoleAttempted] = useState(false);
  const [dobAttempted, setDobAttempted] = useState(false);
  const [form, setForm] = useState(initialForm || {
    country: 'Taiwan',
    category: null, // must be explicitly chosen — no default, see onboarding required-field check on Start
    priorityDate: '', // must be explicitly chosen — no default, see onboarding required-field check on Start
    birthYearMonth: '', // 'YYYY-MM' — must be explicitly chosen, no default, see Start button check
    inUS: null, // must be explicitly chosen — no default, see onboarding required-field check on Start
    role: null, // 'petitioner' | 'beneficiary' — must be explicitly chosen, same as inUS
    petitionerStatus: 'USC',
    subtype: null,
    name: '', // optional, never blocks Start — stripped out of the object handed to onComplete,
              // saved straight to gc_nickname instead (same store SubscribeModal's nickname field
              // and the SubtypeUpdateModal backfill use), so it's never part of userCase itself.
  });

  const countries = [
    { v: 'Taiwan',      en: 'TWN / HK / ROW', zh: '台湾/港澳/全球', tw: '台灣/港澳/全球', code: { en: 'ROW', zh: '全球',  tw: '全球'  } },
    { v: 'China',       en: 'China',          zh: '中国大陆',       tw: '中國大陸', code: { en: 'CHN', zh: '中国',  tw: '中國'  } },
    { v: 'India',       en: 'India',          zh: '印度',          tw: '印度',    code: { en: 'IND', zh: '印度',  tw: '印度'  } },
    { v: 'Mexico',      en: 'Mexico',         zh: '墨西哥',         tw: '墨西哥',  code: { en: 'MEX', zh: '墨西哥', tw: '墨西哥' } },
    { v: 'Philippines', en: 'Philippines',    zh: '菲律宾',         tw: '菲律賓',  code: { en: 'PHL', zh: '菲律宾', tw: '菲律賓' } },
  ];

  const t = {
    en: {
      title: 'Green Card Tracker',
      subtitle: 'Let\'s set up your situation first',
      haveCase: 'I have a case',
      haveCaseDesc: 'Enter my category, country, and priority date',
      exploring: 'I\'m exploring',
      exploringDesc: 'Not sure which category I\'m in — help me find out',
      country: 'Country of chargeability',
      category: 'Category',
      categoryPlaceholder: 'Select category',
      yourName: 'Your name',
      yourNamePlaceholder: 'Optional',
      pd: 'Priority Date',
      dob: 'Your Date of Birth',
      inUS: 'Are you currently in the US?',
      inUSYes: 'In the US',
      inUSNo: 'Outside the US',
      role: 'Are you the petitioner or the beneficiary?',
      rolePetitioner: 'Petitioner',
      roleBeneficiary: 'Beneficiary',
      petitioner: 'Petitioner',
      start: 'Start →',
      back: '← Back',
      theme: 'Pick a style',
      themeHint: 'You can change this anytime from the top right',
    },
    zh: {
      title: '绿卡晴雨表',
      subtitle: '简单告诉我你的情况',
      haveCase: '我已在排期中',
      haveCaseDesc: '填写我的类别、国家、优先日',
      exploring: '我在探索',
      exploringDesc: '还不确定自己属于哪个类别 — 帮我找找',
      country: '国籍类别',
      category: '绿卡类别',
      categoryPlaceholder: '选择类别',
      yourName: '你的名字',
      yourNamePlaceholder: '可选',
      pd: '优先日',
      dob: '你的出生年月',
      inUS: '你目前在美国境内吗？',
      inUSYes: '在美国境内',
      inUSNo: '不在美国境内',
      role: '你是申请人还是被申请人？',
      rolePetitioner: '申请人',
      roleBeneficiary: '被申请人',
      petitioner: '担保人身份',
      start: '开始使用 →',
      back: '← 返回',
      theme: '选择风格',
      themeHint: '之后可在右上角随时切换',
    },
    tw: {
      title: '綠卡晴雨表',
      subtitle: '簡單告訴我你的情況',
      haveCase: '我已在排期中',
      haveCaseDesc: '填寫我的類別、國家、優先日',
      exploring: '我在探索',
      exploringDesc: '還不確定自己屬於哪個類別 — 幫我找找',
      country: '國籍類別',
      category: '綠卡類別',
      categoryPlaceholder: '選擇類別',
      yourName: '你的名字',
      yourNamePlaceholder: '可選',
      pd: '優先日',
      dob: '你的出生年月',
      inUS: '你目前在美國境內嗎？',
      inUSYes: '在美國境內',
      inUSNo: '不在美國境內',
      role: '你是申請人還是被申請人？',
      rolePetitioner: '申請人',
      roleBeneficiary: '被申請人',
      petitioner: '擔保人身份',
      start: '開始使用 →',
      back: '← 返回',
      theme: '選擇風格',
      themeHint: '之後可在右上角隨時切換',
    },
  }[lang] || t?.en || { title: 'Green Card Tracker' };

  const isF = !!form.category && form.category.startsWith('F');
  const isF2 = form.category === 'F2A' || form.category === 'F2B';

  return (
    <div className="visa-root" data-theme={theme} style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px',
    }}>
      <style>{`
        @keyframes onboardBackdropIn {
          from { opacity: 0; backdrop-filter: blur(0px); -webkit-backdrop-filter: blur(0px); }
          to   { opacity: 1; backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px); }
        }
        @keyframes onboardCardIn {
          from { opacity: 0; transform: translateY(8px) scale(0.985); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .gc-onboard-backdrop, .gc-onboard-card { animation: none !important; }
        }
      `}</style>

      {/* Backdrop — solid opaque dim + blur, fade-in */}
      <div className="gc-onboard-backdrop" style={{
        position: 'absolute', inset: 0,
        background: 'rgba(15, 20, 25, 0.55)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        animation: 'onboardBackdropIn 240ms ease-out both',
      }} />

      {/* Modal card — clean fade + tiny lift, no bounce */}
      <div className="gc-onboard-card" style={{
        position: 'relative',
        background: 'var(--gc-surface)',
        border: '1px solid var(--gc-rule)',
        borderTop: '3px solid var(--gc-green)',
        borderRadius: 'var(--gc-radius)',
        width: '100%',
        maxWidth: mode === 'explore' ? '460px' : '380px',
        maxHeight: '92vh',
        overflowY: 'auto',
        padding: '20px 18px 16px',
        animation: 'onboardCardIn 260ms cubic-bezier(0.16, 1, 0.3, 1) both',
        animationDelay: '60ms',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.25), 0 2px 8px rgba(0, 0, 0, 0.12)',
        zIndex: 1,
      }}>
        {/* Language switcher — absolute top-right, so non-Chinese users can switch on first open */}
        <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 2 }}>
          <LangSwitcher />
        </div>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '20px', paddingBottom: '14px', borderBottom: '1px solid var(--gc-rule-soft)' }}>
          <div className="gc-eyebrow" style={{ color: 'var(--gc-green)', marginBottom: '4px' }}>
            {t.title.toUpperCase()}
          </div>
          <h2 className="gc-serif" style={{ fontSize: '22px', fontWeight: 700, color: 'var(--gc-ink)', letterSpacing: '-0.01em', margin: '0 0 3px', lineHeight: 1.15 }}>
            {t.subtitle}
          </h2>
        </div>

        {mode === 'choose' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* I have a case */}
            <button
              onClick={() => setMode('form')}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '14px 14px',
                background: 'var(--gc-surface)',
                border: '1px solid var(--gc-rule)',
                borderLeft: '2px solid var(--gc-green)',
                borderRadius: 'var(--gc-radius-sm)',
                cursor: 'pointer',
                transition: 'all 140ms',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--gc-paper-soft)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--gc-surface)'; }}
            >
              <FileText size={18} style={{ color: 'var(--gc-green)', flexShrink: 0, marginTop: '2px' }} strokeWidth={1.6} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="gc-serif" style={{ fontSize: '15px', fontWeight: 600, color: 'var(--gc-ink)', lineHeight: 1.25, marginBottom: '2px' }}>
                  {t.haveCase}
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--gc-muted)', lineHeight: 1.4 }}>
                  {t.haveCaseDesc}
                </div>
              </div>
              <span style={{ color: 'var(--gc-muted)', fontSize: '18px', lineHeight: 1, flexShrink: 0 }}>›</span>
            </button>

            {/* I'm exploring */}
            <button
              onClick={() => setMode('explore')}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '14px 14px',
                background: 'var(--gc-surface)',
                border: '1px solid var(--gc-rule)',
                borderLeft: '2px solid var(--gc-muted)',
                borderRadius: 'var(--gc-radius-sm)',
                cursor: 'pointer',
                transition: 'all 140ms',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--gc-paper-soft)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--gc-surface)'; }}
            >
              <ClipboardList size={18} style={{ color: 'var(--gc-muted)', flexShrink: 0, marginTop: '2px' }} strokeWidth={1.6} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="gc-serif" style={{ fontSize: '15px', fontWeight: 600, color: 'var(--gc-ink)', lineHeight: 1.25, marginBottom: '2px' }}>
                  {t.exploring}
                </div>
                <div style={{ fontSize: '11.5px', color: 'var(--gc-muted)', lineHeight: 1.4 }}>
                  {t.exploringDesc}
                </div>
              </div>
              <span style={{ color: 'var(--gc-muted)', fontSize: '18px', lineHeight: 1, flexShrink: 0 }}>›</span>
            </button>

            {/* Theme picker — tiny inline swatches, low-key so it doesn't compete with main CTAs.
                Users will also find a full picker in the footer once they're inside the app. */}
            {onThemeChange && (
              <div style={{
                marginTop: '6px',
                paddingTop: '10px',
                borderTop: '1px solid var(--gc-rule-soft)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                flexWrap: 'wrap',
              }}>
                <span className="gc-eyebrow" style={{
                  fontSize: '9px',
                  color: 'var(--gc-muted)',
                  letterSpacing: '0.14em',
                }}>
                  {lang === 'en' ? 'STYLE' : lang === 'tw' ? '版面' : '版面'}
                </span>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  {[
                    { id: 'passport',  name: lang === 'en' ? 'Gazette'   : '晨间', swatch: ['#f6f2e8', '#0e4d2e'] },
                    { id: 'consulate', name: lang === 'en' ? 'Archive'   : '典章', swatch: ['#ffffff', '#0b3d70'] },
                    { id: 'redseal',   name: lang === 'en' ? 'Vermilion' : '朱批', swatch: ['#f3e9d2', '#8a1818'] },
                    { id: 'monocle',   name: lang === 'en' ? 'Editorial' : '刊',   swatch: ['#f4efe4', '#1f4d3a'] },
                  ].map(th => {
                    const isActive = theme === th.id;
                    return (
                      <button key={th.id}
                        type="button"
                        onClick={() => onThemeChange(th.id)}
                        title={th.name}
                        aria-label={th.name}
                        style={{
                          width: '16px',
                          height: '16px',
                          padding: 0,
                          background: th.swatch[0],
                          border: `1.5px solid ${isActive ? th.swatch[1] : 'var(--gc-rule)'}`,
                          borderRadius: '50%',
                          cursor: 'pointer',
                          position: 'relative',
                          overflow: 'hidden',
                          transition: 'all 120ms',
                          boxShadow: isActive ? `0 0 0 2px var(--gc-surface), 0 0 0 3px ${th.swatch[1]}` : 'none',
                        }}>
                        {/* Right half = accent color (two-tone dot) */}
                        <span style={{
                          position: 'absolute',
                          top: 0, right: 0, bottom: 0,
                          width: '50%',
                          background: th.swatch[1],
                        }}></span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {mode === 'explore' && (
          <div>
            <button
              onClick={() => setMode('choose')}
              style={{
                marginBottom: '12px',
                padding: '6px 0',
                fontSize: '12px', fontWeight: 600,
                background: 'transparent', color: 'var(--gc-muted)',
                border: 'none', cursor: 'pointer',
              }}>
              {t.back}
            </button>
            <TheIndex
              userCase={form}
              onCategoryPicked={(category) => { setForm({ ...form, category }); setMode('form'); }}
            />
          </div>
        )}

        {mode === 'form' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Country */}
            <div>
              <div className="gc-eyebrow" style={{ marginBottom: '6px' }}>{t.country}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 0, border: '1px solid var(--gc-rule)', borderRadius: 'var(--gc-radius-sm)', overflow: 'hidden' }}>
                {countries.map((c, i) => {
                  const active = form.country === c.v;
                  return (
                    <button key={c.v}
                      onClick={() => setForm({ ...form, country: c.v })}
                      style={{
                        padding: '5px 4px',
                        fontSize: '10px', fontWeight: 600,
                        background: active ? 'var(--gc-ink)' : 'transparent',
                        color: active ? 'var(--gc-paper)' : 'var(--gc-muted)',
                        borderLeft: i > 0 ? '1px solid var(--gc-rule)' : 'none',
                        cursor: 'pointer', transition: 'all 120ms',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px',
                        minWidth: 0,
                      }}>
                      <CountryFlag country={c.v} size={12} />
                      <span style={{ fontSize: '9px', letterSpacing: '0.04em' }}>
                        {c.code[lang] || c.code.en}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Name (optional) + Date of Birth — side by side. Category moves to its own
                full-width row below so its subtype chips (up to 3, some with long CJK
                labels like "雇主担保 PERM") get the full row width instead of wrapping
                to 3 lines in a half-width column. */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div style={{ minWidth: 0 }}>
                <div className="gc-eyebrow" style={{ marginBottom: '6px' }}>{t.yourName}</div>
                <input type="text" value={form.name || ''}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder={t.yourNamePlaceholder}
                  style={{
                    width: '100%', boxSizing: 'border-box', padding: '9px 9px', fontSize: '13px',
                    background: 'var(--gc-paper-soft)', border: '1px solid var(--gc-rule)',
                    borderRadius: 'var(--gc-radius-sm)', color: 'var(--gc-ink)',
                  }} />
              </div>
              <div style={{ minWidth: 0 }}>
                <div className="gc-eyebrow" style={{ marginBottom: '6px' }}>{t.dob}</div>
                <YearMonthDropdown value={form.birthYearMonth}
                  triggerStyle={{
                    padding: '8px 10px', fontSize: '13px', background: 'var(--gc-paper-soft)',
                    ...(dobAttempted && !form.birthYearMonth ? { border: '1px solid var(--gc-red)' } : {}),
                  }}
                  onChange={(ym) => { setForm({ ...form, birthYearMonth: ym }); setDobAttempted(false); }} />
              </div>
            </div>

            {/* Category — full width now, so SubtypeChips lay out on one row */}
            <div>
              <div className="gc-eyebrow" style={{ marginBottom: '6px' }}>{t.category}</div>
              <CategoryDropdown value={form.category}
                placeholder={t.categoryPlaceholder}
                triggerStyle={{
                  padding: '9px 9px', background: 'var(--gc-paper-soft)',
                  ...(categoryAttempted && !form.category ? { border: '1px solid var(--gc-red)' } : {}),
                }}
                onChange={(newCat) => {
                  if (newCat === form.category) return;
                  const isF2C = newCat === 'F2A' || newCat === 'F2B';
                  const newPetitioner = isF2C ? 'LPR' : 'USC';
                  setForm({ ...form, category: newCat, petitionerStatus: newCat.startsWith('F') ? newPetitioner : form.petitionerStatus, subtype: defaultSubtype(newCat) });
                  setSubtypeAttempted(false);
                  setCategoryAttempted(false);
                }} />
              <SubtypeChips userCase={form} setUserCase={setForm}
                required={!!CATEGORY_SUBTYPES[form.category]}
                error={subtypeAttempted && !!CATEGORY_SUBTYPES[form.category] && !form.subtype} />
            </div>

            {/* Priority Date — full width, alone now that DOB moved up next to name */}
            <div>
              <div className="gc-eyebrow" style={{ marginBottom: '6px' }}>{t.pd}</div>
              <DateDropdown value={form.priorityDate} allowEmpty minYear={2010} newestYearFirst
                triggerStyle={{
                  padding: '8px 10px', fontSize: '13px', background: 'var(--gc-paper-soft)',
                  ...(pdAttempted && !form.priorityDate ? { border: '1px solid var(--gc-red)' } : {}),
                }}
                onChange={(pd) => { setForm({ ...form, priorityDate: pd }); setPdAttempted(false); }} />
            </div>

            {/* Role — required, no default; both options start unselected */}
            <div>
              <div style={{ marginBottom: '6px', fontSize: '13px', fontWeight: 700, color: 'var(--gc-ink)' }}>{t.role}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                {[{ v: 'petitioner', label: t.rolePetitioner }, { v: 'beneficiary', label: t.roleBeneficiary }].map((o) => {
                  const active = form.role === o.v;
                  const showError = roleAttempted && form.role === null;
                  return (
                    <button key={o.v} type="button"
                      onClick={() => { setForm({ ...form, role: o.v }); setRoleAttempted(false); }}
                      style={{
                        padding: '9px 8px', fontSize: '12px', fontWeight: active ? 700 : 500,
                        background: active ? 'var(--gc-green)' : 'var(--gc-paper-soft)',
                        color: active ? 'var(--gc-paper)' : 'var(--gc-ink)',
                        border: `1px solid ${active ? 'var(--gc-green)' : showError ? 'var(--gc-red)' : 'var(--gc-rule)'}`,
                        borderRadius: 'var(--gc-radius-sm)',
                        cursor: 'pointer', transition: 'all 120ms',
                      }}>
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* In US — required, no default; both options start unselected */}
            <div>
              <div style={{ marginBottom: '6px', fontSize: '13px', fontWeight: 700, color: 'var(--gc-ink)' }}>{t.inUS}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                {[{ v: true, label: t.inUSYes }, { v: false, label: t.inUSNo }].map((o) => {
                  const active = form.inUS === o.v;
                  const showError = inUSAttempted && form.inUS === null;
                  return (
                    <button key={String(o.v)} type="button"
                      onClick={() => { setForm({ ...form, inUS: o.v }); setInUSAttempted(false); }}
                      style={{
                        padding: '9px 8px', fontSize: '12px', fontWeight: active ? 700 : 500,
                        background: active ? 'var(--gc-green)' : 'var(--gc-paper-soft)',
                        color: active ? 'var(--gc-paper)' : 'var(--gc-ink)',
                        border: `1px solid ${active ? 'var(--gc-green)' : showError ? 'var(--gc-red)' : 'var(--gc-rule)'}`,
                        borderRadius: 'var(--gc-radius-sm)',
                        cursor: 'pointer', transition: 'all 120ms',
                      }}>
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Petitioner — only for F categories */}
            {isF && (
              <div>
                <div className="gc-eyebrow" style={{ marginBottom: '6px' }}>{t.petitioner}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                  {['USC', 'LPR'].map(p => {
                    const active = form.petitionerStatus === p;
                    return (
                      <button key={p}
                        onClick={() => setForm({ ...form, petitionerStatus: p })}
                        style={{
                          padding: '8px', fontSize: '11px', fontWeight: 700,
                          background: active ? 'var(--gc-ink)' : 'var(--gc-paper-soft)',
                          color: active ? 'var(--gc-paper)' : 'var(--gc-ink)',
                          border: active ? 'none' : '1px solid var(--gc-rule)',
                          borderRadius: 'var(--gc-radius-sm)',
                          cursor: 'pointer', transition: 'all 120ms',
                        }}>
                        {p === 'USC' ? (lang === 'en' ? 'US Citizen' : '美国公民') : (lang === 'en' ? 'Green card' : '绿卡持有人')}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button
                onClick={() => setMode('choose')}
                style={{
                  padding: '10px 14px', fontSize: '12px', fontWeight: 600,
                  background: 'transparent', color: 'var(--gc-muted)',
                  border: '1px solid var(--gc-rule)', borderRadius: 'var(--gc-radius-sm)',
                  cursor: 'pointer',
                }}>
                {t.back}
              </button>
              <button
                onClick={() => {
                  if (!form.category) {
                    setCategoryAttempted(true);
                    return;
                  }
                  if (CATEGORY_SUBTYPES[form.category] && !form.subtype) {
                    setSubtypeAttempted(true);
                    return;
                  }
                  if (!form.priorityDate) {
                    setPdAttempted(true);
                    return;
                  }
                  if (form.role === null) {
                    setRoleAttempted(true);
                    return;
                  }
                  if (form.inUS === null) {
                    setInUSAttempted(true);
                    return;
                  }
                  if (!form.birthYearMonth) {
                    setDobAttempted(true);
                    return;
                  }
                  // Name lives in gc_nickname (same store SubscribeModal's nickname field and
                  // the SubtypeUpdateModal backfill write to), not in userCase — it's identity,
                  // not case data, and userCase is what gets serialized into shareable URLs.
                  if (form.name && form.name.trim()) {
                    try { window.localStorage.setItem('gc_nickname', form.name.trim()); } catch { /* noop */ }
                    announceSubscribed(); // homepage greeting bar picks it up immediately
                  }
                  const { name: _formName, ...caseOnly } = form;
                  onComplete(caseOnly);
                }}
                style={{
                  flex: 1, padding: '10px 14px', fontSize: '13px', fontWeight: 700,
                  background: 'var(--gc-green)', color: 'var(--gc-paper)',
                  border: 'none', borderRadius: 'var(--gc-radius-sm)',
                  cursor: 'pointer', letterSpacing: '0.02em',
                }}>
                {t.start}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================
// Main App
// ============================================================
// Shared subscription state: true once this browser has subscribed (persisted flag),
// updating live via the 'gc-subscribed' event so every entry point hides the moment
// any one of them completes a subscribe.
const useSubscribed = () => {
  const [sub, setSub] = useState(() => {
    try { return !!window.localStorage.getItem('gc_subscribedEmail'); } catch { return false; }
  });
  useEffect(() => {
    const h = () => setSub(true);
    window.addEventListener('gc-subscribed', h);
    return () => window.removeEventListener('gc-subscribed', h);
  }, []);
  return sub;
};
const announceSubscribed = () => {
  try { window.dispatchEvent(new Event('gc-subscribed')); } catch { /* noop */ }
};
// Shared nickname state, mirrors useSubscribed — set once at signup, read by the
// homepage greeting bar.
const useNickname = () => {
  const [name, setName] = useState(() => {
    try { return window.localStorage.getItem('gc_nickname') || ''; } catch { return ''; }
  });
  useEffect(() => {
    const h = () => {
      try { setName(window.localStorage.getItem('gc_nickname') || ''); } catch { /* noop */ }
    };
    window.addEventListener('gc-subscribed', h);
    return () => window.removeEventListener('gc-subscribed', h);
  }, []);
  return name;
};

// ============================================================
// SubscribeModal — the entire subscribe flow in one dialog: email + email language
// + the four alert switches + the go-confirm-your-inbox close. Opened from the nav's
// 订阅 button and the case-card mail icon (via the 'gc-open-subscribe' event), so
// nobody has to navigate to a separate page just to subscribe.
// ============================================================
const SubscribeModal = ({ show, onClose, userCase, setUserCase, theme = 'passport', prefillEmail = '' }) => {
  const { lang } = useLang();
  const isSubscribed = useSubscribed();
  const knownName = useNickname();
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  // Same known-value + one-tap-edit pattern as subtype/birth below (see comment a few
  // lines down) — a name saved earlier (onboarding, or a prior visit here) used to show
  // as a blank input every time this modal reopened, so leaving it blank and resubmitting
  // silently wiped the name already on file (fixed on the backend too, see subscribe.js).
  const nameKnown = !!knownName;
  const [editName, setEditName] = useState(false);
  // The two inline entry points hand off to this modal when the case is missing
  // subtype/birth (see openSubscribeModal). Carry over whatever they already typed
  // so the handoff costs one tap, not a retype — only on open, never overwriting
  // an address the visitor is mid-edit in this modal.
  useEffect(() => {
    if (show && prefillEmail) setEmail(prefillEmail);
  }, [show, prefillEmail]);
  const [subLang, setSubLang] = useState(lang);
  const [alerts, setAlerts] = useState({ whenCurrent: true, whenEligible: true, monthlyUpdates: true, retrogression: true });
  const [status, setStatus] = useState(''); // '' | 'loading' | 'sent' | 'updated' | 'error' | 'invalid'
  // Ask for subtype/birth year-month once, at signup, so the monthly-update email
  // never has to chase a subscriber down for them later (see SubtypeUpdateModal).
  // Already-known fields (wizard fill or a prior visit) are shown as text with a
  // one-tap edit instead of re-asking — asking again after the visitor already has
  // their result on screen reads as pointless friction and risks the signup itself.
  const catHasSubtype = !!CATEGORY_SUBTYPES[userCase.category];
  const subtypeKnown = !catHasSubtype || !!userCase.subtype;
  const birthKnown = !!userCase.birthYearMonth;
  const [editSubtype, setEditSubtype] = useState(false);
  const [editBirth, setEditBirth] = useState(false);
  const [subtypePick, setSubtypePick] = useState(userCase.subtype || null);
  const [birthYM, setBirthYM] = useState(userCase.birthYearMonth || '');
  const [subtypeAttempted, setSubtypeAttempted] = useState(false);
  const [dobAttempted, setDobAttempted] = useState(false);
  // Same purpose as in SmartAlerts: a browser/device with no gc_subscribedEmail flag
  // (private window, different device) lands here as if it were a first-time visitor.
  // /api/subscribe already upserts by email, so re-submitting an existing address just
  // works — this only changes the copy so it doesn't look like a fresh, unconfirmed signup.
  const [updateMode, setUpdateMode] = useState(false);
  // Updating an already-active subscription needs no "click to confirm" step (unlike a
  // brand-new signup, which genuinely has one more step — check email). So this closes
  // itself, same as if the visitor had opened the modal already subscribed.
  useEffect(() => {
    if (status === 'updated') {
      const timer = setTimeout(() => onClose(), 1400);
      return () => clearTimeout(timer);
    }
  }, [status, onClose]);
  // Escape hatch out of the "already a subscriber" quick view below, into the full
  // form — the quick view used to be a dead end for renaming: its only button sent
  // you to the alerts tab, which has no name field at all (see SmartAlerts above,
  // it never sends `name`). Clicking "修改" there sets this + prefills email/edit
  // mode so changing just the name doesn't also demand retyping the address.
  const [forceForm, setForceForm] = useState(false);
  if (!show) return null;

  // Already a subscriber (and not mid-flow): no form — just say so and offer settings.
  if (isSubscribed && status !== 'sent' && status !== 'updated' && !forceForm) {
    let savedEmail = '';
    try { savedEmail = window.localStorage.getItem('gc_subscribedEmail') || ''; } catch { /* noop */ }
    return (
      <div className="visa-root" data-theme={theme}
        style={{ position: 'fixed', inset: 0, zIndex: 950, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'rgba(15,20,25,0.5)' }}
        onClick={onClose}>
        <div onClick={(e) => e.stopPropagation()} style={{
          position: 'relative', width: '100%', maxWidth: '360px',
          background: 'var(--gc-surface)', border: '1px solid var(--gc-rule)', borderTop: '3px solid var(--gc-green)',
          borderRadius: '6px', padding: '16px 18px 14px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        }}>
          <button type="button" aria-label="close" onClick={onClose}
            style={{ position: 'absolute', top: '4px', right: '4px', width: '36px', height: '36px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '18px', lineHeight: 1, color: 'var(--gc-muted)' }}>×</button>
          <div className="gc-serif" style={{ fontSize: '17px', fontWeight: 700, color: 'var(--gc-green-ink)', marginBottom: '6px', paddingRight: '28px' }}>
            {lang === 'en' ? 'You\'re subscribed' : lang === 'tw' ? '你已訂閱' : '你已订阅'}
          </div>
          <div style={{ fontSize: '12.5px', lineHeight: 1.7, color: 'var(--gc-ink-soft)' }}>
            {savedEmail
              ? (lang === 'en' ? <>Updates go to <b>{savedEmail}</b>.</> : <>更新会发到 <b>{savedEmail}</b>。</>)
              : (lang === 'en' ? 'Bulletin updates are on for this browser.' : lang === 'tw' ? '這個瀏覽器已開啟排期郵件更新。' : '这个浏览器已开启排期邮件更新。')}
          </div>
          <div className="flex items-center justify-between" style={{ marginTop: '6px', fontSize: '11.5px', color: 'var(--gc-ink-soft)' }}>
            <span>
              {lang === 'en' ? 'Call you: ' : lang === 'tw' ? '稱呼：' : '称呼：'}
              {knownName ? <b>{knownName}</b> : (lang === 'en' ? 'not set' : lang === 'tw' ? '未設定' : '未设置')}
            </span>
            <button type="button"
              onClick={() => { setEmail(savedEmail); setNickname(knownName || ''); setEditName(true); setForceForm(true); }}
              style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', fontSize: '11px', color: 'var(--gc-green-ink)', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
              {lang === 'en' ? 'Edit' : lang === 'tw' ? '修改' : '修改'}
            </button>
          </div>
          <div className="flex items-center justify-between" style={{ marginTop: '12px' }}>
            <button type="button" onClick={() => { onClose(); window.dispatchEvent(new Event('gc-goto-alerts')); }}
              style={{ border: '1px solid var(--gc-rule)', borderRadius: '4px', background: 'var(--gc-paper)', padding: '7px 12px', cursor: 'pointer', fontSize: '11.5px', color: 'var(--gc-ink-soft)' }}>
              {lang === 'en' ? 'Reminder settings' : lang === 'tw' ? '提醒設定' : '提醒设置'}
            </button>
            <button type="button" onClick={onClose}
              style={{ border: 'none', borderRadius: '4px', background: 'var(--gc-green)', color: 'var(--gc-paper)', padding: '8px 16px', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}>
              {lang === 'en' ? 'Close' : lang === 'tw' ? '關閉' : '关闭'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const toggle = (k) => setAlerts((prev) => ({ ...prev, [k]: !prev[k] }));

  const subscribe = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus('invalid');
      setTimeout(() => setStatus(''), 2500);
      return;
    }
    // Only blocks on fields that were never known; already-known fields
    // (wizard/URL) never re-prompt here (see catHasSubtype/birthKnown above).
    // Deliberately NOT skipped in updateMode: that toggle is plain UI state any
    // first-time visitor can flip, so gating on it left the whole check bypassable.
    if (!subtypeKnown && !subtypePick) { setSubtypeAttempted(true); return; }
    if (!birthKnown && !birthYM) { setDobAttempted(true); return; }
    const finalUserCase = {
      ...userCase,
      subtype: userCase.subtype || subtypePick,
      birthYearMonth: userCase.birthYearMonth || birthYM,
    };
    setUserCase(finalUserCase);
    const finalName = (nameKnown && !editName) ? knownName : nickname.trim();
    setStatus('loading');
    try {
      const resp = await fetch(`${API_BASE}/api/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          name: finalName,
          userCase: finalUserCase,
          alerts,
          language: subLang,
        }),
      });
      const result = await resp.json().catch(() => ({ success: false }));
      if (resp.ok && result.success) {
        try {
          window.localStorage.setItem('gc_subscribedEmail', email.trim().toLowerCase());
          window.sessionStorage.setItem('gc_subNudgeShown', '1');
          if (finalName) window.localStorage.setItem('gc_nickname', finalName);
        } catch { /* noop */ }
        announceSubscribed();
        // Updating an already-confirmed subscriber sends no confirmation mail — saying
        // "check your inbox" here would be wrong, so it gets its own status/copy.
        setStatus(result.confirmed ? 'updated' : 'sent');
      } else {
        setStatus('error');
        setTimeout(() => setStatus(''), 3000);
      }
    } catch {
      setStatus('error');
      setTimeout(() => setStatus(''), 3000);
    }
  };

  const alertRows = [
    { k: 'monthlyUpdates', zh: '每月公告更新', tw: '每月公告更新', en: 'Monthly bulletin updates' },
    { k: 'retrogression', zh: '倒退 / 无名额警报', tw: '倒退 / 無名額警報', en: 'Retrogression alerts' },
    { k: 'whenEligible', zh: '排到可递件时通知', tw: '排到可遞件時通知', en: 'When you can file' },
    { k: 'whenCurrent', zh: '排到可获批时通知', tw: '排到可獲批時通知', en: 'When you can be approved' },
  ];
  const pdLabel = lang === 'en' ? userCase.priorityDate
    : `${userCase.priorityDate.slice(0, 4)}年${parseInt(userCase.priorityDate.slice(5, 7), 10)}月`;

  return (
    <div className="visa-root" data-theme={theme}
      style={{ position: 'fixed', inset: 0, zIndex: 950, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'rgba(15,20,25,0.5)' }}
      onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        position: 'relative', width: '100%', maxWidth: '360px',
        background: 'var(--gc-surface)', border: '1px solid var(--gc-rule)', borderTop: '3px solid var(--gc-green)',
        borderRadius: '6px', padding: '16px 18px 14px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        maxHeight: 'calc(100vh - 80px)', overflowY: 'auto',
      }}>
        <button type="button" aria-label="close" onClick={onClose}
          style={{ position: 'absolute', top: '4px', right: '4px', width: '36px', height: '36px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '18px', lineHeight: 1, color: 'var(--gc-muted)' }}>×</button>
        {status === 'updated' ? (
          <div className="flex items-center gap-2" style={{
            fontSize: '12.5px', color: 'var(--gc-green-ink)', lineHeight: 1.5,
          }}>
            <CheckCircle2 size={16} className="flex-shrink-0" />
            <span>
              {lang === 'en'
                ? <>Done — future emails to <b>{email.trim()}</b> use this case.</>
                : lang === 'tw'
                  ? <>已更新 — 之後發到 <b>{email.trim()}</b> 的郵件會用這個案子。</>
                  : <>已更新 — 之后发到 <b>{email.trim()}</b> 的邮件会用这个案子。</>}
            </span>
          </div>
        ) : status === 'sent' ? (
          <>
            <div className="gc-serif" style={{ fontSize: '17px', fontWeight: 700, color: 'var(--gc-green-ink)', marginBottom: '8px', paddingRight: '28px' }}>
              {lang === 'en' ? 'One more step' : lang === 'tw' ? '還差一步' : '还差一步'}
            </div>
            <div style={{ fontSize: '12.5px', lineHeight: 1.7, color: 'var(--gc-ink-soft)' }}>
              {lang === 'en'
                ? <>We emailed a confirmation link to <b>{email.trim()}</b>. The subscription only starts after you click it.</>
                : lang === 'tw'
                  ? <>確認郵件已發到 <b>{email.trim()}</b>，<b>點擊裡面的連結後訂閱才生效</b>。</>
                  : <>确认邮件已发到 <b>{email.trim()}</b>，<b>点击里面的链接后订阅才生效</b>。</>}
            </div>
            <div style={{ fontSize: '11px', lineHeight: 1.65, color: 'var(--gc-muted)', marginTop: '8px', background: 'var(--gc-paper-soft)', border: '1px solid var(--gc-rule-soft)', borderRadius: '3px', padding: '7px 9px' }}>
              {lang === 'en'
                ? 'Not in your inbox? Check the spam/junk folder — and add the sender to contacts so future updates land properly.'
                : lang === 'tw'
                  ? '收件匣沒有？翻一下垃圾郵件匣，並把發件人加入通訊錄，之後的月度更新才不會被攔。'
                  : '收件箱没有？翻一下垃圾邮件，并把发件人加入通讯录，之后的月度更新才不会被拦。'}
            </div>
            <button type="button" onClick={onClose}
              style={{ width: '100%', marginTop: '12px', padding: '9px', fontSize: '12.5px', fontWeight: 700, background: 'var(--gc-green)', color: 'var(--gc-paper)', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              {lang === 'en' ? 'Got it' : lang === 'tw' ? '知道了，這就去點' : '知道了，这就去点'}
            </button>
          </>
        ) : (
          <>
            <div className="flex items-start justify-between" style={{ gap: '8px' }}>
              <div className="gc-serif" style={{ fontSize: '17px', fontWeight: 700, color: 'var(--gc-ink)', marginBottom: '2px', paddingRight: '20px' }}>
                {updateMode
                  ? (lang === 'en' ? 'Update your subscription' : lang === 'tw' ? '更改訂閱' : '更改订阅')
                  : (lang === 'en' ? 'Track this case by email' : lang === 'tw' ? '訂閱這個案子的排期' : '订阅这个案子的排期')}
              </div>
            </div>
            {!updateMode && (
              <div className="gc-eyebrow" style={{ fontSize: '9.5px', color: 'var(--gc-muted)', marginBottom: '6px' }}>
                {lang === 'en' ? 'NEW SIGNUP' : lang === 'tw' ? '新訂閱' : '新订阅'}
              </div>
            )}
            <button type="button" onClick={() => setUpdateMode((v) => !v)}
              style={{
                display: 'block', width: '100%', textAlign: 'left', boxSizing: 'border-box',
                fontSize: '11.5px', fontWeight: 700, letterSpacing: '0.01em',
                color: updateMode ? 'var(--gc-ink-soft)' : 'var(--gc-green-ink)',
                background: updateMode ? 'var(--gc-paper-soft)' : 'var(--gc-green-soft)',
                border: `1px solid ${updateMode ? 'var(--gc-rule-soft)' : 'var(--gc-green-border)'}`,
                borderRadius: '4px', padding: '7px 9px', cursor: 'pointer', marginBottom: '8px',
              }}>
              {updateMode
                ? (lang === 'en' ? '← New signup instead' : lang === 'tw' ? '← 改成新訂閱' : '← 改成新订阅')
                : (lang === 'en' ? 'Already subscribed? Update here →' : lang === 'tw' ? '已經訂閱過？點此更改 →' : '已经订阅过？点此更改 →')}
            </button>
            {updateMode ? (
              <>
                <CompactCaseBar userCase={userCase} setUserCase={setUserCase} defaultExpanded />
                <div style={{
                  fontSize: '10.5px', color: 'var(--gc-muted)', lineHeight: 1.5,
                  marginBottom: '8px', padding: '6px 8px', marginTop: '-2px',
                  background: 'var(--gc-paper-soft)', border: '1px solid var(--gc-rule-soft)', borderRadius: '3px',
                }}>
                  {lang === 'en'
                    ? 'Adjust the case above if needed, then submit with the email you subscribed with — it updates your existing subscription, no duplicate.'
                    : lang === 'tw'
                      ? '上面案子不對就先改好，再填你訂閱時用的郵箱提交——會更新你現有的訂閱，不會重複訂閱。'
                      : '上面案子不对就先改好，再填你订阅时用的邮箱提交——会更新你现有的订阅，不会重复订阅。'}
                </div>
              </>
            ) : (
              <div className="gc-mono" style={{ fontSize: '11px', color: 'var(--gc-muted)', marginBottom: '10px' }}>
                {userCase.category}{subtypeLabel(userCase.category, userCase.subtype, lang) ? ` (${subtypeLabel(userCase.category, userCase.subtype, lang)})` : ''} · {userCase.country} · {lang === 'en' ? 'PD ' : '优先日 '}{pdLabel}
              </div>
            )}
            <input
              type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') subscribe(); }}
              placeholder="you@example.com"
              style={{
                width: '100%', fontSize: '13px', padding: '9px 10px', boxSizing: 'border-box',
                border: status === 'invalid' || status === 'error' ? '1px solid var(--gc-red)' : '1px solid var(--gc-rule)',
                borderRadius: '4px', background: 'var(--gc-paper)', color: 'var(--gc-ink)',
              }} />
            {(status === 'invalid' || status === 'error') && (
              <div style={{ fontSize: '10.5px', color: 'var(--gc-red)', marginTop: '4px' }}>
                {status === 'invalid'
                  ? (lang === 'en' ? 'That email doesn\'t look right' : lang === 'tw' ? '郵箱格式不對' : '邮箱格式不对')
                  : (lang === 'en' ? 'Something went wrong — try again' : lang === 'tw' ? '出錯了，再試一次' : '出错了，再试一次')}
              </div>
            )}
            {nameKnown && !editName ? (
              <div className="flex items-center justify-between" style={{ fontSize: '11.5px', color: 'var(--gc-ink-soft)', marginTop: '6px' }}>
                <span>
                  {lang === 'en' ? 'Call you: ' : lang === 'tw' ? '稱呼：' : '称呼：'}
                  <b>{knownName}</b>
                </span>
                <button type="button" onClick={() => { setNickname(knownName); setEditName(true); }}
                  style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', fontSize: '11px', color: 'var(--gc-green-ink)', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
                  {lang === 'en' ? 'Edit' : lang === 'tw' ? '修改' : '修改'}
                </button>
              </div>
            ) : (
              <input
                type="text" value={nickname} onChange={(e) => setNickname(e.target.value)}
                placeholder={lang === 'en' ? 'What should we call you? (optional)' : lang === 'tw' ? '怎麼稱呼您（可選）' : '怎么称呼您（可选）'}
                style={{
                  width: '100%', fontSize: '13px', padding: '9px 10px', boxSizing: 'border-box',
                  border: '1px solid var(--gc-rule)', borderRadius: '4px',
                  background: 'var(--gc-paper)', color: 'var(--gc-ink)', marginTop: '6px',
                }} />
            )}
            {catHasSubtype && (
              <div style={{ marginTop: '8px' }}>
                {subtypeKnown && !editSubtype ? (
                  <div className="flex items-center justify-between" style={{ fontSize: '11.5px', color: 'var(--gc-ink-soft)' }}>
                    <span>
                      {lang === 'en' ? 'Subtype: ' : lang === 'tw' ? '簽證類型細分：' : '签证类型细分：'}
                      <b>{subtypeLabel(userCase.category, userCase.subtype || subtypePick, lang)}</b>
                    </span>
                    <button type="button" onClick={() => setEditSubtype(true)}
                      style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', fontSize: '11px', color: 'var(--gc-green-ink)', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
                      {lang === 'en' ? 'Edit' : lang === 'tw' ? '修改' : '修改'}
                    </button>
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: '10.5px', color: 'var(--gc-muted)', marginBottom: '3px' }}>
                      {lang === 'en' ? <>Which <b>{userCase.category}</b> subtype is your case?</>
                        : <>你的 <b>{userCase.category}</b> 属于哪个细分？</>}
                    </div>
                    <SubtypeChips userCase={{ ...userCase, subtype: subtypePick }} setUserCase={(uc) => { setSubtypePick(uc.subtype); setSubtypeAttempted(false); }} required />
                    {subtypeAttempted && !subtypePick && (
                      <div style={{ fontSize: '10.5px', color: 'var(--gc-red)', marginTop: '4px' }}>
                        {lang === 'en' ? 'Please pick a subtype' : lang === 'tw' ? '請選擇細分' : '请选择细分'}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
            {/* Rendered in updateMode too — the subscribe() gate now applies there,
                and known values show as one read-only line, not a re-prompt. */}
            {(
              <div style={{ marginTop: '8px' }}>
                {birthKnown && !editBirth ? (
                  <div className="flex items-center justify-between" style={{ fontSize: '11.5px', color: 'var(--gc-ink-soft)' }}>
                    <span>
                      {lang === 'en'
                        ? <>Born: <b>{new Date(parseInt(userCase.birthYearMonth.slice(0, 4), 10), parseInt(userCase.birthYearMonth.slice(5, 7), 10) - 1, 1).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}</b></>
                        : <>出生年月：<b>{userCase.birthYearMonth.slice(0, 4)}年{parseInt(userCase.birthYearMonth.slice(5, 7), 10)}月</b></>}
                    </span>
                    <button type="button" onClick={() => setEditBirth(true)}
                      style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', fontSize: '11px', color: 'var(--gc-green-ink)', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
                      {lang === 'en' ? 'Edit' : lang === 'tw' ? '修改' : '修改'}
                    </button>
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: '10.5px', color: 'var(--gc-muted)', marginBottom: '3px' }}>
                      {lang === 'en' ? 'Your date of birth' : '你的出生年月'}{' '}
                      <span style={{ color: 'var(--gc-ink-soft)' }}>
                        {lang === 'en' ? '(helps us predict your timeline more precisely)' : '(填了才能算准你的排期预测)'}
                      </span>
                    </div>
                    <YearMonthDropdown value={birthYM}
                      triggerStyle={dobAttempted && !birthYM ? { border: '1px solid var(--gc-red)' } : {}}
                      onChange={(ym) => { setBirthYM(ym); setDobAttempted(false); }} />
                    {dobAttempted && !birthYM && (
                      <div style={{ fontSize: '10.5px', color: 'var(--gc-red)', marginTop: '4px' }}>
                        {lang === 'en' ? 'Please pick your date of birth' : lang === 'tw' ? '請選擇出生年月' : '请选择出生年月'}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
            <div className="flex items-center" style={{ gap: '6px', margin: '10px 0 2px' }}>
              <span style={{ fontSize: '10.5px', color: 'var(--gc-muted)' }}>{lang === 'en' ? 'Email language' : lang === 'tw' ? '郵件語言' : '邮件语言'}</span>
              <span className="inline-flex" style={{ border: '1px solid var(--gc-rule)', borderRadius: '3px', overflow: 'hidden' }}>
                {[{ v: 'zh', label: '简体' }, { v: 'tw', label: '繁體' }, { v: 'en', label: 'EN' }].map((opt, oi) => (
                  <button key={opt.v} type="button" onClick={() => setSubLang(opt.v)}
                    style={{
                      fontSize: '10px', fontWeight: 700, padding: '3px 9px', border: 'none', cursor: 'pointer',
                      borderLeft: oi === 0 ? 'none' : '1px solid var(--gc-rule-soft)',
                      background: subLang === opt.v ? 'var(--gc-green)' : 'var(--gc-surface)',
                      color: subLang === opt.v ? 'var(--gc-paper)' : 'var(--gc-muted)',
                    }}>
                    {opt.label}
                  </button>
                ))}
              </span>
            </div>
            <div style={{ margin: '8px 0 2px' }}>
              {alertRows.map((row) => (
                <label key={row.k} className="flex items-center" style={{ gap: '8px', padding: '5px 0', cursor: 'pointer', fontSize: '12px', color: 'var(--gc-ink-soft)' }}>
                  <input type="checkbox" checked={!!alerts[row.k]} onChange={() => toggle(row.k)}
                    style={{ accentColor: 'var(--gc-green)', width: '15px', height: '15px', flexShrink: 0 }} />
                  {lang === 'en' ? row.en : lang === 'tw' ? row.tw : row.zh}
                </label>
              ))}
            </div>
            <button type="button" onClick={subscribe} disabled={status === 'loading'}
              style={{
                width: '100%', marginTop: '8px', padding: '10px', fontSize: '13px', fontWeight: 700,
                background: 'var(--gc-green)', color: 'var(--gc-paper)', border: 'none', borderRadius: '4px',
                cursor: 'pointer', opacity: status === 'loading' ? 0.6 : 1,
              }}>
              {status === 'loading' ? '…' : updateMode
                ? (lang === 'en' ? 'Update subscription' : lang === 'tw' ? '更新訂閱' : '更新订阅')
                : (lang === 'en' ? 'Subscribe' : lang === 'tw' ? '一鍵訂閱' : '一键订阅')}
            </button>
            <div className="flex items-center justify-between" style={{ marginTop: '8px' }}>
              <span style={{ fontSize: '10px', color: 'var(--gc-muted)' }}>
                {lang === 'en' ? 'Unsubscribe anytime.' : lang === 'tw' ? '隨時可退訂。' : '随时可退订。'}
              </span>
              <button type="button" onClick={() => { onClose(); window.dispatchEvent(new Event('gc-goto-alerts')); }}
                style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', fontSize: '10px', color: 'var(--gc-muted)', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
                {lang === 'en' ? 'More reminder settings →' : lang === 'tw' ? '更多提醒設定 →' : '更多提醒设置 →'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// SubtypeUpdateModal — one-time prompt for subscribers whose record is missing the
// subtype and/or birth year-month fields (added after they first subscribed). Only
// ever shown when the page was opened via the monthly-update email's special link
// (see buildCaseUrl/buildSubtypeToken) — App() gates on that, this component just
// renders whichever field(s) are actually missing and posts the answer. Dismissible:
// skipping costs nothing, the app works fine without these on file.
// ============================================================
const SubtypeUpdateModal = ({ userCase, email, token, currentName = '', theme = 'passport', onDone, onClose }) => {
  const { lang } = useLang();
  const [pick, setPick] = useState(userCase.subtype || null);
  const [birthYM, setBirthYM] = useState(userCase.birthYearMonth || '');
  const [name, setName] = useState('');
  const [status, setStatus] = useState(''); // '' | 'loading' | 'error'
  const [subtypeAttempted, setSubtypeAttempted] = useState(false);
  const [dobAttempted, setDobAttempted] = useState(false);

  const opts = CATEGORY_SUBTYPES[userCase.category];
  const needsSubtype = !!opts && !userCase.subtype;
  const needsBirth = !userCase.birthYearMonth;
  // Only ever offered opportunistically, alongside subtype/birth — not a trigger
  // on its own, since that would pop this modal for nearly every subscriber who
  // predates the name field (same population as needsBirth). Optional: never
  // blocks save the way needsSubtype/needsBirth do.
  const needsName = (needsSubtype || needsBirth) && !currentName;
  if (!needsSubtype && !needsBirth) return null;

  const save = async () => {
    if (needsSubtype && !pick) { setSubtypeAttempted(true); return; }
    if (needsBirth && !birthYM) { setDobAttempted(true); return; }
    setStatus('loading');
    try {
      // Two ways in. WITH a token: the deep link from the monthly-update email, which
      // only reaches subscribers whose category moved that month — so it can never
      // cover everyone signed up before these fields existed. WITHOUT one: this
      // browser already knows it's subscribed (gc_subscribedEmail), which is proof
      // enough to upsert that same address through the normal subscribe path — no
      // token to mint, and /api/subscribe preserves the alerts/language already on
      // file when the request omits them.
      const trimmedName = name.trim();
      const merged = {
        ...userCase,
        ...(needsSubtype ? { subtype: pick } : {}),
        ...(needsBirth ? { birthYearMonth: birthYM } : {}),
      };
      const body = token
        ? { email, token, ...(needsSubtype ? { subtype: pick } : {}), ...(needsBirth ? { birthYearMonth: birthYM } : {}), ...(needsName && trimmedName ? { name: trimmedName } : {}) }
        : { email, userCase: merged, ...(needsName && trimmedName ? { name: trimmedName } : {}) };
      const resp = await fetch(token ? `${API_BASE}/api/update-subtype` : `${API_BASE}/api/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await resp.json().catch(() => ({ success: false }));
      if (resp.ok && result.success) {
        if (needsName && trimmedName) {
          try { window.localStorage.setItem('gc_nickname', trimmedName); } catch { /* noop */ }
          announceSubscribed(); // refreshes the homepage greeting bar without a reload
        }
        onDone({ subtype: needsSubtype ? pick : userCase.subtype, birthYearMonth: needsBirth ? birthYM : userCase.birthYearMonth, name: needsName && trimmedName ? trimmedName : currentName });
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  const canSave = (!needsSubtype || !!pick) && (!needsBirth || !!birthYM);

  return (
    <div className="visa-root" data-theme={theme}
      style={{ position: 'fixed', inset: 0, zIndex: 950, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: 'rgba(15,20,25,0.5)' }}
      onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{
        position: 'relative', width: '100%', maxWidth: '360px',
        background: 'var(--gc-surface)', border: '1px solid var(--gc-rule)', borderTop: '3px solid var(--gc-green)',
        borderRadius: '6px', padding: '16px 18px 14px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        <div className="gc-serif" style={{ fontSize: '17px', fontWeight: 700, color: 'var(--gc-ink)', marginBottom: '6px' }}>
          {needsSubtype && needsBirth
            ? (lang === 'en' ? 'Two quick things' : lang === 'tw' ? '補充兩個小資訊' : '补充两个小信息')
            : (lang === 'en' ? 'One quick thing' : lang === 'tw' ? '補充一個小資訊' : '补充一个小信息')}
        </div>
        <div style={{ fontSize: '12.5px', lineHeight: 1.7, color: 'var(--gc-ink-soft)', marginBottom: '4px' }}>
          {lang === 'en'
            ? 'This helps us calculate your prediction more precisely.'
            : lang === 'tw'
              ? '這樣才能給你算準排期預測。'
              : '这样才能给你算准排期预测。'}
        </div>
        {needsSubtype && (
          <>
            <div style={{ fontSize: '11px', color: 'var(--gc-muted)', margin: '8px 0 3px' }}>
              {lang === 'en' ? <>Which <b>{userCase.category}</b> subtype is your case?</> : <>你的 <b>{userCase.category}</b> 属于哪个细分？</>}
            </div>
            <SubtypeChips userCase={{ ...userCase, subtype: pick }} setUserCase={(uc) => { setPick(uc.subtype); setSubtypeAttempted(false); }} required />
            {subtypeAttempted && !pick && (
              <div style={{ fontSize: '10.5px', color: 'var(--gc-red)', marginTop: '4px' }}>
                {lang === 'en' ? 'Please pick a subtype' : lang === 'tw' ? '請選擇細分' : '请选择细分'}
              </div>
            )}
          </>
        )}
        {needsBirth && (
          <div style={{ marginTop: needsSubtype ? '10px' : '4px' }}>
            <div style={{ fontSize: '11px', color: 'var(--gc-muted)', marginBottom: '3px' }}>
              {lang === 'en' ? 'Your date of birth?' : lang === 'tw' ? '你的出生年月？' : '你的出生年月？'}
            </div>
            <YearMonthDropdown value={birthYM}
              triggerStyle={dobAttempted && !birthYM ? { border: '1px solid var(--gc-red)' } : {}}
              onChange={(ym) => { setBirthYM(ym); setDobAttempted(false); }} />
            {dobAttempted && !birthYM && (
              <div style={{ fontSize: '10.5px', color: 'var(--gc-red)', marginTop: '4px' }}>
                {lang === 'en' ? 'Please pick your date of birth' : lang === 'tw' ? '請選擇出生年月' : '请选择出生年月'}
              </div>
            )}
          </div>
        )}
        {needsName && (
          <div style={{ marginTop: needsSubtype || needsBirth ? '10px' : '4px' }}>
            <div style={{ fontSize: '11px', color: 'var(--gc-muted)', marginBottom: '3px' }}>
              {lang === 'en' ? 'What should we call you? (optional)' : lang === 'tw' ? '怎麼稱呼您（可選）' : '怎么称呼您（可选）'}
            </div>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              placeholder={lang === 'en' ? 'e.g. Jack' : '比如 小明'}
              style={{
                width: '100%', fontSize: '13px', padding: '8px 10px', boxSizing: 'border-box',
                border: '1px solid var(--gc-rule)', borderRadius: '4px',
                background: 'var(--gc-paper)', color: 'var(--gc-ink)',
              }} />
          </div>
        )}
        {status === 'error' && (
          <div style={{ fontSize: '10.5px', color: 'var(--gc-red)', marginTop: '6px' }}>
            {lang === 'en' ? 'Something went wrong — try again.' : lang === 'tw' ? '出錯了，再試一次。' : '出错了，再试一次。'}
          </div>
        )}
        <div className="flex items-center justify-end" style={{ marginTop: '12px' }}>
          <button type="button" onClick={save} disabled={status === 'loading'}
            style={{
              border: 'none', borderRadius: '4px', background: 'var(--gc-green)', color: 'var(--gc-paper)',
              padding: '8px 16px', cursor: 'pointer', fontSize: '12px', fontWeight: 700,
              opacity: (!canSave && (subtypeAttempted || dobAttempted)) || status === 'loading' ? 0.5 : 1,
            }}>
            {status === 'loading' ? '…' : (lang === 'en' ? 'Save' : lang === 'tw' ? '儲存' : '保存')}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// InlineSubscribeCTA — one-row subscribe entry embedded where intent peaks (under
// the hero number, at the end of the monthly recap). Hidden entirely once the
// visitor subscribed; touching it marks the session so the timed popup stays quiet.
// ============================================================
const InlineSubscribeCTA = ({ userCase, label }) => {
  const { lang } = useLang();
  const isSubscribed = useSubscribed();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState(''); // '' | 'loading' | 'sent' | 'error' | 'invalid'
  // Hide everywhere once subscribed — except the instance that just completed the
  // flow, which keeps its go-confirm-your-inbox message on screen.
  if (isSubscribed && status !== 'sent') return null;

  const markTouched = () => {
    try { window.sessionStorage.setItem('gc_subNudgeShown', '1'); } catch { /* noop */ }
  };

  const subscribe = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus('invalid');
      setTimeout(() => setStatus(''), 2500);
      return;
    }
    // One-row widget with no room for the subtype/birth pickers — hand off to
    // SubscribeModal rather than POST an incomplete case (see caseIntakeGaps).
    if (caseNeedsIntake(userCase)) {
      markTouched();
      openSubscribeModal(email.trim().toLowerCase());
      return;
    }
    setStatus('loading');
    try {
      const resp = await fetch(`${API_BASE}/api/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          userCase,
          alerts: { whenCurrent: true, whenEligible: true, monthlyUpdates: true, retrogression: true },
          language: lang,
        }),
      });
      const result = await resp.json().catch(() => ({ success: false }));
      if (resp.ok && result.success) {
        setStatus('sent');
        markTouched();
        try { window.localStorage.setItem('gc_subscribedEmail', email.trim().toLowerCase()); } catch { /* noop */ }
        announceSubscribed();
      } else {
        setStatus('error');
        setTimeout(() => setStatus(''), 3000);
      }
    } catch {
      setStatus('error');
      setTimeout(() => setStatus(''), 3000);
    }
  };

  if (status === 'sent') {
    return (
      <div style={{ marginTop: '10px', padding: '8px 10px', background: 'var(--gc-green-soft)', borderRadius: '3px', fontSize: '11px', lineHeight: 1.6, color: 'var(--gc-green-ink)' }}>
        {lang === 'en'
          ? `Confirmation sent to ${email.trim()} — click it to activate. Not there? Check spam.`
          : lang === 'tw'
            ? `確認郵件已發到 ${email.trim()}，點一下才生效；收件匣沒有就翻垃圾郵件匣。`
            : `确认邮件已发到 ${email.trim()}，点一下才生效；收件箱没有就翻垃圾邮件。`}
      </div>
    );
  }

  return (
    <div style={{ marginTop: '10px', paddingTop: '9px', borderTop: '1px dashed var(--gc-rule)' }}>
      <div style={{ fontSize: '10.5px', fontWeight: 600, color: 'var(--gc-ink-soft)', marginBottom: '5px' }}>{label}</div>
      <div style={{ display: 'flex', gap: '6px' }}>
        <input
          type="email" value={email} onChange={(e) => setEmail(e.target.value)}
          onFocus={markTouched}
          onKeyDown={(e) => { if (e.key === 'Enter') subscribe(); }}
          placeholder="you@example.com"
          style={{
            flex: 1, minWidth: 0, fontSize: '12px', padding: '6px 9px',
            border: status === 'invalid' || status === 'error' ? '1px solid var(--gc-red)' : '1px solid var(--gc-rule)',
            borderRadius: '3px', background: 'var(--gc-paper)', color: 'var(--gc-ink)',
          }} />
        <button type="button" onClick={subscribe} disabled={status === 'loading'}
          style={{
            border: 'none', borderRadius: '3px', cursor: 'pointer', whiteSpace: 'nowrap',
            background: 'var(--gc-green)', color: 'var(--gc-paper)', fontSize: '11px', fontWeight: 700, padding: '6px 12px',
            opacity: status === 'loading' ? 0.6 : 1,
          }}>
          {lang === 'en' ? 'Subscribe' : lang === 'tw' ? '訂閱' : '订阅'}
        </button>
      </div>
      {(status === 'invalid' || status === 'error') && (
        <div style={{ fontSize: '10px', color: 'var(--gc-red)', marginTop: '3px' }}>
          {status === 'invalid'
            ? (lang === 'en' ? 'That email doesn\'t look right' : lang === 'tw' ? '郵箱格式不對' : '邮箱格式不对')
            : (lang === 'en' ? 'Something went wrong — try again' : lang === 'tw' ? '出錯了，再試一次' : '出错了，再试一次')}
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [lang, setLang] = useState(() => {
    if (typeof window === 'undefined') return 'zh';
    try {
      const raw = window.localStorage.getItem('gc_lang');
      if (['zh', 'tw', 'en'].includes(raw)) return raw;
    } catch (e) { /* noop */ }
    return 'zh';
  });
  useEffect(() => {
    try { window.localStorage.setItem('gc_lang', lang); }
    catch (e) { /* noop */ }
  }, [lang]);
  // Language gate: shown once, before OnboardingModal, on a truly fresh visit
  // only. Anyone who's already onboarded (or already made an explicit pick)
  // skips straight past it — this isn't meant to interrupt returning users.
  const [hasPickedLanguage, setHasPickedLanguage] = useState(() => {
    if (typeof window === 'undefined') return true;
    try {
      if (window.localStorage.getItem('gc_lang_picked') === 'true') return true;
      if (window.localStorage.getItem('gc_hasOnboarded') === 'true') return true;
    } catch (e) { /* noop */ }
    return false;
  });
  // ?tab= deep link (e.g. ?tab=alerts to land on the subscription page from an email).
  // Read-only: switching tabs afterwards doesn't write back to the URL.
  const [tab, setTab] = useState(() => {
    try {
      const p = new URLSearchParams(window.location.search).get('tab');
      if (['overview', 'trends', 'update', 'bulletin', 'compare', 'index', 'alerts', 'about'].includes(p)) return p;
    } catch (e) { /* noop */ }
    return 'overview';
  });
  // Track the tab the user came from, for the "← back" button in The Index
  const [previousTab, setPreviousTab] = useState('overview');

  // Time Machine: viewingMonth controls which month's bulletin we're "looking through".
  // Default: DEFAULT_VIEWING_MONTH ('2026-05'). Users can select past months from BULLETIN_ARCHIVE.
  const [viewingMonth, setViewingMonth] = useState(DEFAULT_VIEWING_MONTH);
  const isTimeMachineActive = viewingMonth !== DEFAULT_VIEWING_MONTH;
  VIEWING_MONTH_KEY = viewingMonth; // render-time mirror for the module-level helpers

  // Bulletin tick: bumping this forces consumers to re-render when bulletinCurrent/Previous
  // contents change via Object.assign (mutation doesn't trigger React updates on its own).
  const [_bulletinTick, setBulletinTick] = useState(0);

  // Apply viewingMonth changes: swap bulletinCurrent/bulletinPrevious contents in-place
  // so all the 30+ places reading from these references automatically see the new data.
  useEffect(() => {
    const snapshot = BULLETIN_ARCHIVE[viewingMonth];
    if (!snapshot) return;
    // Swap "current" — always available
    Object.keys(bulletinCurrent.finalAction).forEach((k) => delete bulletinCurrent.finalAction[k]);
    Object.keys(bulletinCurrent.filing).forEach((k) => delete bulletinCurrent.filing[k]);
    Object.assign(bulletinCurrent.finalAction, snapshot.data.finalAction);
    Object.assign(bulletinCurrent.filing, snapshot.data.filing);
    // Swap "previous" — may be null for earliest month in archive
    Object.keys(bulletinPrevious.finalAction).forEach((k) => delete bulletinPrevious.finalAction[k]);
    Object.keys(bulletinPrevious.filing).forEach((k) => delete bulletinPrevious.filing[k]);
    if (snapshot.previous) {
      Object.assign(bulletinPrevious.finalAction, snapshot.previous.finalAction);
      Object.assign(bulletinPrevious.filing, snapshot.previous.filing);
    }
    // else: bulletinPrevious stays empty {} — MonthlyUpdate detects this via hasPreviousData
    // Header label too
    BULLETIN_CURRENT_MONTH.en = snapshot.label.en;
    BULLETIN_CURRENT_MONTH.zh = snapshot.label.zh;
    BULLETIN_CURRENT_MONTH.tw = snapshot.label.tw;
    BULLETIN_CURRENT_KEY.value = viewingMonth;
    setBulletinTick((t) => t + 1); // force re-render
  }, [viewingMonth]);

  // Load the real month-by-month archive from /history.json (produced by
  // scripts/backfill-history.mjs). Before this, BULLETIN_ARCHIVE held three
  // hardcoded snapshots, so the month picker could only reach back to March 2026
  // and every "historical" trend was back-projected from a static rate table.
  // Rebuilt newest-first so the picker lists recent months at the top.
  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/notice-translations.json`, { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d2) => { if (d2?.months) { NOTICE_I18N = d2; setBulletinTick((t) => t + 1); } })
      .catch(() => {});
    fetch(`${API_BASE}/bulletin.json`, { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.current) {
          if (Array.isArray(data.current.notices)) {
            BULLETIN_NOTICES = data.current.notices;
            BULLETIN_NOTICES_MONTH = data.current.month || null;
          }
          BULLETIN_EXTRAS = {
            month: data.current.month || null,
            dv: data.current.dv || null,
            dvNext: data.current.dvNext || null,
            f2aExempt: data.current.f2aExempt || null,
            meta: data.current.meta || null,
          };
          setBulletinTick((t) => t + 1);
        }
      })
      .catch(() => {});
    fetch(`${API_BASE}/history.json`, { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('history-fetch-not-ok'))))
      .then((hist) => {
        if (cancelled || !hist || !Array.isArray(hist.months)) return;
        const cats = ['EB1', 'EB2', 'EB3', 'EW', 'EB4', 'SR', 'EB5', 'EB5R', 'EB5H', 'EB5I', 'F1', 'F2A', 'F2B', 'F3', 'F4'];
        const asc = hist.months
          .filter((m) => m && m.month && m.finalAction && cats.every((c) => m.finalAction[c]))
          .sort((a, b) => a.month.localeCompare(b.month));
        if (!asc.length) return;

        const EN_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'];
        const snapshotOf = (m) => ({ finalAction: m.finalAction, filing: m.filing || {} });
        const entryFor = (m, prev) => {
          const [yr, mo] = m.month.split('-');
          const moNum = parseInt(mo, 10);
          return {
            label: {
              en: `${EN_MONTHS[moNum - 1]} ${yr}`,
              zh: `${yr}年${moNum}月`,
              tw: `${yr}年${moNum}月`,
            },
            data: snapshotOf(m),
            previous: prev ? snapshotOf(prev) : null,
          };
        };

        // Replace wholesale: drop the hardcoded seed months so the picker doesn't
        // end up with a mix of real and stale entries in a jumbled order.
        Object.keys(BULLETIN_ARCHIVE).forEach((k) => delete BULLETIN_ARCHIVE[k]);
        for (let i = asc.length - 1; i >= 0; i--) {
          BULLETIN_ARCHIVE[asc[i].month] = entryFor(asc[i], i > 0 ? asc[i - 1] : null);
        }

        // Recompute the "recent" forecast anchor from real observed movement.
        // The hardcoded RATES_DB.recent values are 5-year averages captured during a
        // stagnant stretch — F4-China sat at 94 days/year while the last five months
        // actually averaged ~1,400 days/year. That stale anchor dragged every near-term
        // forecast far below what the bulletins were plainly doing.
        // Only `recent` is overridden; the 10y/21y anchors stay as the sanity bounds.
        const RECENT_WINDOW = 12;
        const win = asc.slice(-Math.min(RECENT_WINDOW + 1, asc.length));
        if (win.length >= 4) {
          const toTime = (v) => (v && v !== 'C' ? Date.parse(`${v}T00:00:00Z`) : null);
          const monthsSpan = win.length - 1;
          Object.keys(RATES_DB).forEach((key) => {
            const dash = key.indexOf('-');
            const cat = key.slice(0, dash);
            const country = key.slice(dash + 1);
            const first = toTime(win[0].finalAction?.[cat]?.[country]);
            const last = toTime(win[win.length - 1].finalAction?.[cat]?.[country]);
            // 'C' (current) and 'U' (unavailable → null) carry no usable cutoff date,
            // and a retrogression would invert the anchor — leave the static value.
            if (first === null || last === null) return;
            const days = (last - first) / 86400000;
            if (days < 0) return;
            RATES_DB[key] = { ...RATES_DB[key], recent: Math.round((days / monthsSpan) * 12) };
          });
        }

        const latest = asc[asc.length - 1].month;
        DEFAULT_VIEWING_MONTH = latest;
        // Always jump to the newest month. This effect runs once on mount, before the
        // user can have picked anything, and the seeded default ('2026-05') exists in
        // the real archive too — so a "keep it if it's valid" check would leave the app
        // sitting on May while DEFAULT_VIEWING_MONTH says August, which reads as the
        // Time Machine being active on a cold load.
        setViewingMonth(latest);
        setBulletinTick((t) => t + 1);
      })
      .catch(() => {
        // Keep the hardcoded three-month archive — the app still works, just with
        // a shorter picker and no real history.
      });
    return () => { cancelled = true; };
  }, []);

  // Override the hardcoded FILING_AUTHORIZED table with USCIS's actual monthly chart
  // designation (scraped to /uscis-charts.json by scripts/scrape-uscis-chart.mjs).
  // Same in-place-mutation pattern as RATES_DB; the tick forces a re-render. On any
  // failure the static table stays — it was correct as of its comment's month.
  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/uscis-charts.json`, { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('uscis-charts-not-ok'))))
      .then((data) => {
        if (cancelled || !data?.current?.family || !data?.current?.employment) return;
        const familyFiling = data.current.family === 'filing';
        const ebFiling = data.current.employment === 'filing';
        Object.keys(FILING_AUTHORIZED).forEach((cat) => {
          FILING_AUTHORIZED[cat] = cat.startsWith('EB') ? ebFiling : familyFiling;
        });
        setBulletinTick((t) => t + 1);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Auto-update bulletin data: fetch from /bulletin.json on mount; mutate the hardcoded
  // bulletinCurrent / bulletinPrevious objects in place if fresh data is available.
  // /bulletin.json is auto-generated by GitHub Actions monthly from travel.state.gov.
  // If fetch fails (404 = file not yet committed, network err), silently keep the
  // hardcoded fallback so the app never breaks.
  useEffect(() => {
    // Skip auto-fetch if user is viewing a past month (time machine active) —
    // we don't want to overwrite their chosen snapshot with latest data.
    if (isTimeMachineActive) return;
    let cancelled = false;
    fetch(`${API_BASE}/bulletin.json`, { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('fetch-not-ok'))))
      .then((data) => {
        if (cancelled || !data || !data.current || !data.current.finalAction) return;
        // Sanity check — must have all 8 categories in finalAction
        const cats = ['EB1', 'EB2', 'EB3', 'EW', 'EB4', 'SR', 'EB5', 'EB5R', 'EB5H', 'EB5I', 'F1', 'F2A', 'F2B', 'F3', 'F4'];
        const ok = cats.every((c) => data.current.finalAction[c]);
        if (!ok) {
          console.warn('[bulletin] Remote data missing categories, keeping hardcoded fallback');
          return;
        }
        // Mutate the existing module-level bulletinCurrent/bulletinPrevious objects in place.
        // Clear old keys first so stale categories don't linger.
        Object.keys(bulletinCurrent.finalAction).forEach((k) => delete bulletinCurrent.finalAction[k]);
        Object.keys(bulletinCurrent.filing).forEach((k) => delete bulletinCurrent.filing[k]);
        Object.assign(bulletinCurrent.finalAction, data.current.finalAction);
        Object.assign(bulletinCurrent.filing, data.current.filing || {});
        if (data.previous && data.previous.finalAction) {
          Object.keys(bulletinPrevious.finalAction).forEach((k) => delete bulletinPrevious.finalAction[k]);
          Object.keys(bulletinPrevious.filing).forEach((k) => delete bulletinPrevious.filing[k]);
          Object.assign(bulletinPrevious.finalAction, data.previous.finalAction);
          Object.assign(bulletinPrevious.filing, data.previous.filing || {});
        }
        // Update header label (e.g., "2026年6月")
        if (data.current.month && /^\d{4}-\d{2}$/.test(data.current.month)) {
          const [yr, mo] = data.current.month.split('-');
          const moNum = parseInt(mo, 10);
          const enMonths = ['January','February','March','April','May','June','July','August','September','October','November','December'];
          BULLETIN_CURRENT_MONTH.en = `${enMonths[moNum - 1]} ${yr}`;
          BULLETIN_CURRENT_MONTH.zh = `${yr}年${moNum}月`;
          BULLETIN_CURRENT_MONTH.tw = `${yr}年${moNum}月`;
        }
        console.log('[bulletin] Loaded fresh data:', data.current.month, 'source:', data.source);
        setBulletinTick((t) => t + 1); // force consumers to re-render
      })
      .catch((e) => {
        // Silent fallback to hardcoded data — this is expected before scraper is deployed
        console.log('[bulletin] Using hardcoded fallback:', e.message || 'no-remote-data');
      });
    return () => { cancelled = true; };
  }, [isTimeMachineActive]);

  // Wrapped setTab that also scrolls to top - approximates sticky header behavior in WebViews
  const handleTabChange = (newTab) => {
    // Remember where user came from — helps The Index show a "back" button
    if (newTab === 'index' && tab !== 'index') {
      setPreviousTab(tab);
    }
    setTab(newTab);
    // Scroll to top when switching tabs (works in all WebView contexts)
    if (typeof window !== 'undefined') {
      try {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        // Also try document.documentElement for WebView compatibility
        if (document.documentElement) {
          document.documentElement.scrollTop = 0;
        }
        if (document.body) {
          document.body.scrollTop = 0;
        }
      } catch (e) {}
    }
  };
  const [showHelp, setShowHelp] = useState(false);
  const [showTimeMachine, setShowTimeMachine] = useState(false);
  // Shows a mini green-card dashboard popover in the header.
  // Only actually rendered when greenCardInfo.approvalDate is set.
  // Which I-485 steps the user has marked complete. Persisted to localStorage so it
  // survives refresh. Critical: without persistence, stepActualDates (which IS persisted)
  // would desync — user would see receipt date but no step checkmark on reload, and
  // Forecast would show "not yet filed" despite entered dates.
  const [completedI485Steps, setCompletedI485Steps] = useState(() => {
    if (typeof window === 'undefined') return [];
    const valid = ['receipt', 'biometrics', 'ead', 'ap', 'interview', 'approval'];
    try {
      const raw = window.localStorage.getItem('gc_completedI485Steps');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const filtered = parsed.filter(s => valid.includes(s));
          if (filtered.length > 0) return filtered;
        }
      }
      // RECOVERY PATH: if completedI485Steps is missing/empty BUT stepActualDates
      // has entries, the user clearly has filed. Derive completion from dates
      // (cascading — if biometrics has a date, receipt is also done).
      // This covers the case where earlier versions of the app didn't persist
      // completedI485Steps and the user already has dates recorded.
      const datesRaw = window.localStorage.getItem('gc_stepActualDates');
      if (datesRaw) {
        const dates = JSON.parse(datesRaw);
        if (dates && typeof dates === 'object') {
          const doneSteps = valid.filter(s => dates[s]);
          if (doneSteps.length > 0) {
            const lastDoneIdx = Math.max(...doneSteps.map(s => valid.indexOf(s)));
            return valid.slice(0, lastDoneIdx + 1);
          }
        }
      }
      // Also handle old single-date migration
      const oldReceipt = window.localStorage.getItem('gc_receiptActualDate');
      if (oldReceipt && /^\d{4}-\d{2}-\d{2}$/.test(oldReceipt)) {
        return ['receipt'];
      }
    } catch (e) { /* noop */ }
    return [];
  });
  useEffect(() => {
    try {
      window.localStorage.setItem('gc_completedI485Steps', JSON.stringify(completedI485Steps));
    } catch (e) { /* noop */ }
  }, [completedI485Steps]);
  // Actual dates for each I-485 step — once user marks a step done, they can
  // input the real date (e.g. I-797 dated 2026-06-15). The LATEST done step
  // with an actual date becomes the "anchor" that re-calibrates all subsequent
  // step estimates. Stored as { stepId: 'YYYY-MM-DD', ... }.
  // Migration: if old `gc_receiptActualDate` string exists, lift it into map.
  const [stepActualDates, setStepActualDates] = useState(() => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = window.localStorage.getItem('gc_stepActualDates');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
      }
      // Migrate old single-date format
      const oldReceipt = window.localStorage.getItem('gc_receiptActualDate');
      if (oldReceipt && /^\d{4}-\d{2}-\d{2}$/.test(oldReceipt)) {
        return { receipt: oldReceipt };
      }
    } catch (e) { /* noop */ }
    return {};
  });
  useEffect(() => {
    try {
      window.localStorage.setItem('gc_stepActualDates', JSON.stringify(stepActualDates));
    } catch (e) { /* noop */ }
  }, [stepActualDates]);
  // I-485 service center speed — affects step duration estimates.
  // Lifted to App level so Overview AND Forecast both read/write the same value.
  // Persisted to localStorage to survive reload.
  const [i485ServiceCenter, setI485ServiceCenter] = useState(() => {
    if (typeof window === 'undefined') return 'average';
    try {
      const raw = window.localStorage.getItem('gc_i485ServiceCenter');
      if (raw === 'fast' || raw === 'average' || raw === 'slow') return raw;
    } catch (e) { /* noop */ }
    return 'average';
  });
  useEffect(() => {
    try { window.localStorage.setItem('gc_i485ServiceCenter', i485ServiceCenter); }
    catch (e) { /* noop */ }
  }, [i485ServiceCenter]);
  // Green card info — populated when user marks I-485 as fully complete.
  // Persisted to localStorage so it survives reload/cases.
  //   approvalDate   — ISO date string, defaults to today on first allDone transition
  //   isConditional  — true = CR-1 2-year card (requires I-751), false = IR-1/regular
  //   celebrated     — has the confetti animation been shown for this case?
  const [greenCardInfo, setGreenCardInfo] = useState(() => {
    if (typeof window === 'undefined') return { approvalDate: null, isConditional: false, celebrated: false };
    try {
      const raw = window.localStorage.getItem('gc_greenCardInfo');
      if (raw) return JSON.parse(raw);
    } catch (e) { /* noop */ }
    return { approvalDate: null, isConditional: false, celebrated: false };
  });
  useEffect(() => {
    try { window.localStorage.setItem('gc_greenCardInfo', JSON.stringify(greenCardInfo)); }
    catch (e) { /* noop */ }
  }, [greenCardInfo]);
  // Auto-set approvalDate to today when user first transitions to allDone (all 6 steps checked).
  // Don't overwrite if user has already set one manually.
  useEffect(() => {
    const allDone = completedI485Steps.length === 6;
    if (allDone && !greenCardInfo.approvalDate) {
      const todayISO = new Date().toISOString().split('T')[0];
      setGreenCardInfo(prev => ({ ...prev, approvalDate: todayISO }));
    }
  }, [completedI485Steps, greenCardInfo.approvalDate]);

  // Travel records — list of {from, to} ISO date ranges while outside the US.
  // Used for tracking "continuous residence" — any single trip >180 days may
  // break it, and long aggregate absences can delay N-400 eligibility.
  const [travelRecords, setTravelRecords] = useState(() => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem('gc_travelRecords');
      if (raw) return JSON.parse(raw);
    } catch (e) { /* noop */ }
    return [];
  });
  useEffect(() => {
    try { window.localStorage.setItem('gc_travelRecords', JSON.stringify(travelRecords)); }
    catch (e) { /* noop */ }
  }, [travelRecords]);

  // ── URL-sync helpers ────────────────────────────────────────
  // Encode/decode userCase to/from URL query string for shareable links.
  // Compact keys to keep URLs readable: c=category, ct=country, pd=priorityDate, in=inUS, ps=petitionerStatus
  const parseUserCaseFromURL = () => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const c = params.get('c'), ct = params.get('ct'), pd = params.get('pd');
    if (!c || !ct || !pd) return null; // require the core 3 fields
    return {
      category: c,
      country: ct,
      priorityDate: pd,
      inUS: params.get('in') !== '0',
      petitionerStatus: params.get('ps') || (c.startsWith('F') && (c === 'F2A' || c === 'F2B') ? 'LPR' : 'USC'),
      subtype: params.get('st') || null,
    };
  };
  // se/stk: the one-time email + signed token pair the monthly-update email attaches
  // to the case link ONLY when this subscriber's EB1-EB5 record predates the subtype
  // field (see buildCaseUrl in _emailTemplates.js). Kept separate from userCase — it's
  // link-auth, not case data.
  const parseSubtypePromptFromURL = () => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const se = params.get('se'), stk = params.get('stk');
    if (!se || !stk) return null;
    return { email: se, token: stk };
  };
  const writeUserCaseToURL = (uc) => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams();
    params.set('c', uc.category);
    params.set('ct', uc.country);
    params.set('pd', uc.priorityDate);
    if (!uc.inUS) params.set('in', '0');
    if (uc.petitionerStatus) params.set('ps', uc.petitionerStatus);
    // Was omitted, which is how this URL (rewritten on every case change, then winning
    // over localStorage on the next load) silently dropped subtype from your own case.
    if (uc.subtype) params.set('st', uc.subtype);
    // birthYearMonth and role stay OUT of the URL on purpose: this string is shareable
    // and crawlable, and a date of birth in it is a worse problem than the one being
    // fixed. They survive reloads via the same-case merge in the userCase initializer.
    const newURL = `${window.location.pathname}?${params.toString()}${window.location.hash}`;
    window.history.replaceState({}, '', newURL);
  };

  // Init userCase: priority is URL params > localStorage > default.
  // URL params win so shared links always load that case (not your own) — except for
  // the fields the URL cannot carry, which are merged back from localStorage when the
  // link turns out to describe this device's own case. See the initializer below.
  // localStorage means "your last session's case" survives refresh.
  const urlCase = parseUserCaseFromURL();
  const subtypePromptFromURL = parseSubtypePromptFromURL();
  // Backfill for everyone who subscribed before subtype/birth existed. The email deep
  // link (se/stk) only rides the monthly update, which only goes to subscribers whose
  // category actually moved — so on its own it would never reach a stagnant category.
  // This browser already knows which address it subscribed with, so a returning visitor
  // can be asked directly, no token and no email needed. Token stays null: the save path
  // in SubtypeUpdateModal branches on it. Dismissal is per-session, so declining costs
  // one tap and it doesn't turn into a permanent nag.
  const localIntakePrompt = (() => {
    if (typeof window === 'undefined') return null;
    try {
      if (window.sessionStorage.getItem('gc_intakeAsked') === '1') return null;
      const saved = window.localStorage.getItem('gc_subscribedEmail');
      if (!saved) return null;
      // Critical: the token-less save posts the whole userCase, so it must be certain
      // the case on screen is this visitor's own. Someone reading a case link shared by
      // a friend is subscribed here too, and asking them would overwrite their own
      // subscription with the friend's category/country/priority date. The token path
      // (from their own monthly email) is immune — it posts only the two fields — so
      // this guard applies to the local prompt alone.
      if (urlCase) {
        let ownCase = null;
        try { ownCase = JSON.parse(window.localStorage.getItem('gc_userCase') || 'null'); } catch { /* noop */ }
        const sameCase = ownCase
          && ownCase.category === urlCase.category
          && ownCase.country === urlCase.country
          && ownCase.priorityDate === urlCase.priorityDate;
        if (!sameCase) return null;
      }
      return { email: saved, token: null };
    } catch { return null; }
  })();
  const [subtypePrompt, setSubtypePrompt] = useState(subtypePromptFromURL || localIntakePrompt);
  useEffect(() => {
    if (!subtypePromptFromURL || typeof window === 'undefined') return;
    // Strip se/stk right after reading them — they're one-time link credentials,
    // no reason for them to linger visibly in the address bar/history.
    const params = new URLSearchParams(window.location.search);
    params.delete('se');
    params.delete('stk');
    const qs = params.toString();
    window.history.replaceState({}, '', `${window.location.pathname}${qs ? '?' + qs : ''}${window.location.hash}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [userCase, setUserCase] = useState(() => {
    let saved = null;
    if (typeof window !== 'undefined') {
      try {
        const raw = window.localStorage.getItem('gc_userCase');
        if (raw) {
          const parsed = JSON.parse(raw);
          // Sanity check — must have all required fields
          if (parsed && parsed.country && parsed.category && parsed.priorityDate
              && typeof parsed.inUS === 'boolean' && parsed.petitionerStatus) {
            saved = parsed;
          }
        }
      } catch (e) { /* noop */ }
    }
    if (urlCase) {
      // The URL can't express birthYearMonth/role, so taking it wholesale used to wipe
      // them off your own case every reload (writeUserCaseToURL rewrites this URL on
      // every change, and it wins here) — which is how signups landed with no birth
      // month even after the wizard made it required. Carry those two back over ONLY
      // when the link describes the case already saved on this device; a link shared by
      // someone else is a different person and must not inherit this device's DOB.
      const sameCase = saved
        && saved.category === urlCase.category
        && saved.country === urlCase.country
        && saved.priorityDate === urlCase.priorityDate;
      if (!sameCase) return urlCase;
      return {
        ...urlCase,
        subtype: urlCase.subtype || saved.subtype || null,
        ...(saved.birthYearMonth ? { birthYearMonth: saved.birthYearMonth } : {}),
        ...(saved.role ? { role: saved.role } : {}),
      };
    }
    if (saved) return saved;
    return {
      country: 'Taiwan', category: 'EB3',
      priorityDate: '2024-07-15', inUS: true,
      petitionerStatus: 'USC', // 'USC' (美国公民) or 'LPR' (绿卡持有人). Only used for F categories.
      birthYearMonth: '', // 'YYYY-MM', optional — powers the age line on the countdown card
    };
  });
  // Persist userCase changes to localStorage
  useEffect(() => {
    try { window.localStorage.setItem('gc_userCase', JSON.stringify(userCase)); }
    catch (e) { /* noop */ }
  }, [userCase]);

  // Onboarding: show modal if the user came in fresh. "Fresh" = no URL case AND
  // no saved localStorage case AND no onboarding flag. Once they've onboarded once,
  // remember that so we don't interrupt them on every reload.
  const [hasOnboarded, setHasOnboarded] = useState(() => {
    if (urlCase) return true;
    if (typeof window !== 'undefined') {
      try {
        if (window.localStorage.getItem('gc_hasOnboarded') === 'true') return true;
        // Also: if userCase exists in localStorage, they've been here before
        if (window.localStorage.getItem('gc_userCase')) return true;
      } catch (e) { /* noop */ }
    }
    return false;
  });
  useEffect(() => {
    if (hasOnboarded) {
      try { window.localStorage.setItem('gc_hasOnboarded', 'true'); }
      catch (e) { /* noop */ }
    }
  }, [hasOnboarded]);
  // Onboarding modal starting mode ('choose' default; 'form' when re-opened from Index "I know my category")
  const [onboardingInitialMode, setOnboardingInitialMode] = useState('choose');

  // Keep URL in sync with userCase changes (after onboarding)
  useEffect(() => {
    if (hasOnboarded) writeUserCaseToURL(userCase);
  }, [userCase, hasOnboarded]);
  // Theme system: 4 options, default 'passport'. Persisted so user's aesthetic survives reload.
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'passport';
    try {
      const raw = window.localStorage.getItem('gc_theme');
      if (['passport', 'consulate', 'redseal', 'monocle'].includes(raw)) return raw;
    } catch (e) { /* noop */ }
    return 'passport';
  });
  useEffect(() => {
    try { window.localStorage.setItem('gc_theme', theme); }
    catch (e) { /* noop */ }
  }, [theme]);
  // Monocle's display fonts, injected as an async <link> the first time that theme is
  // active. Deliberately NOT a CSS @import: fonts.googleapis.com is unreachable from
  // mainland China and a blocked import stalls first paint until timeout.
  useEffect(() => {
    if (theme !== 'monocle') return;
    if (document.getElementById('gc-monocle-fonts')) return;
    const link = document.createElement('link');
    link.id = 'gc-monocle-fonts';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT,WONK@9..144,400;9..144,500;9..144,600;9..144,700&family=Noto+Sans+SC:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap';
    document.head.appendChild(link);
  }, [theme]);
  // Subscribe modal — opened by the nav's 订阅 button and the case card's mail
  // icon (custom event, so deep components don't need a prop drill).
  const [showSubModal, setShowSubModal] = useState(false);
  // Set when an inline entry point hands off a half-finished signup (see openSubscribeModal).
  const [subModalPrefill, setSubModalPrefill] = useState('');
  useEffect(() => {
    const open = (e) => {
      setSubModalPrefill((e && e.detail && e.detail.email) || '');
      setShowSubModal(true);
    };
    const gotoAlerts = () => setTab('alerts');
    window.addEventListener('gc-open-subscribe', open);
    window.addEventListener('gc-goto-alerts', gotoAlerts);
    return () => {
      window.removeEventListener('gc-open-subscribe', open);
      window.removeEventListener('gc-goto-alerts', gotoAlerts);
    };
  }, []);
  // Footer theme dropdown open state
  const [showFooterThemePicker, setShowFooterThemePicker] = useState(false);
  const [showMonthBar, setShowMonthBar] = useState(false);
  // Reset button: two-stage confirmation. null = idle, number = timestamp of first click.
  // After second click within 5s, wipe all gc_* localStorage keys + reload.
  const [confirmReset, setConfirmReset] = useState(null);
  const nicknameGreeting = useNickname();

  const t = translations[lang];

  const tabs = [
    { id: 'overview', label: t.navOverview, icon: Eye },
    // 预测 tab 下架：总结页的估算+推导链已覆盖其价值（下月概率的增量不足以撑一个 tab）。
    // ForecastHub 代码保留，恢复时解开此行。
    // { id: 'trends', label: t.navTrends, icon: BarChart3 },
    // 动态在公告前：读者先看"变了什么"，原始公告表退居查阅位。
    { id: 'update', label: t.navUpdate, icon: TrendingUp },
    { id: 'compare', label: t.navCompare, icon: Users },
    { id: 'bulletin', label: lang === 'en' ? 'Bulletin' : '公告', icon: FileText },
    { id: 'index', label: t.navIndex, icon: ClipboardList },
    { id: 'about', label: lang === 'en' ? 'About' : lang === 'tw' ? '關於' : '关于', icon: Info },
  ];

  // Split tabs into two rows for better mobile layout
  const fontStack = lang === 'zh' ? '"PingFang SC", "Microsoft YaHei", "Noto Sans SC", system-ui, sans-serif'
    : lang === 'tw' ? '"PingFang TC", "Microsoft JhengHei", "Noto Sans TC", system-ui, sans-serif'
    : 'system-ui, -apple-system, sans-serif';

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {!hasPickedLanguage && (
        <LanguageGateModal
          theme={theme}
          onPick={(v) => {
            setLang(v);
            try { window.localStorage.setItem('gc_lang_picked', 'true'); } catch (e) { /* noop */ }
            setHasPickedLanguage(true);
          }}
        />
      )}
      {hasPickedLanguage && !hasOnboarded && (
        <OnboardingModal
          lang={lang}
          theme={theme}
          initialMode={onboardingInitialMode}
          initialForm={onboardingInitialMode === 'form' ? userCase : null}
          onComplete={(form) => { setUserCase(form); setTab('overview'); setHasOnboarded(true); setOnboardingInitialMode('choose'); }}
          onClose={() => { setHasOnboarded(true); setOnboardingInitialMode('choose'); }}
          onThemeChange={setTheme}
        />
      )}
      <SubscribeModal show={showSubModal} onClose={() => { setShowSubModal(false); setSubModalPrefill(''); }} userCase={userCase} setUserCase={setUserCase} theme={theme} prefillEmail={subModalPrefill} />
      {subtypePrompt && hasOnboarded
        && ((CATEGORY_SUBTYPES[userCase.category] && !userCase.subtype) || !userCase.birthYearMonth) && (
        <SubtypeUpdateModal
          userCase={userCase}
          email={subtypePrompt.email}
          token={subtypePrompt.token}
          currentName={nicknameGreeting}
          theme={theme}
          onDone={({ subtype, birthYearMonth }) => {
            setUserCase({ ...userCase, subtype, birthYearMonth });
            try { window.sessionStorage.setItem('gc_intakeAsked', '1'); } catch { /* noop */ }
            setSubtypePrompt(null);
          }}
          onClose={() => {
            try { window.sessionStorage.setItem('gc_intakeAsked', '1'); } catch { /* noop */ }
            setSubtypePrompt(null);
          }}
        />
      )}
      <style>{`
        /* Monocle theme fonts load ASYNCHRONOUSLY via a JS-injected <link> (see the
           theme effect) — never as a CSS @import. fonts.googleapis.com is blocked in
           mainland China, and a blocked @import stalls rendering until timeout: the
           site looked completely dead to mainland visitors. If the fonts fail to load,
           monocle just falls back to system fonts. */

        * { box-sizing: border-box; }
        html, body, #root { max-width: 100vw; margin: 0; }
        body { overflow-x: clip; }
        #root { overflow-x: clip; }
        svg { max-width: 100%; height: auto; }
        .visa-root * { max-width: 100%; box-sizing: border-box; }
        .visa-root input, .visa-root select, .visa-root button { max-width: 100%; }
        /* The blanket .visa-root * max-width:100% outranks Tailwind's .max-w-3xl
           (0,0,1,1 vs 0,0,1,0), which silently un-capped the desktop layout — every
           card stretched to the full 1280px viewport. Restore the container caps. */
        .visa-root .max-w-3xl { max-width: 48rem; }
        .visa-root .max-w-4xl { max-width: 56rem; }

        /* Legacy Tailwind palette → theme tokens. 动态/对比/下月预测 predate the token
           system (white cards, slate text, indigo/purple accents) and ignored the four
           themes entirely. Scoped overrides fold every remaining call site into the
           token system at once — redseal/monocle now restyle these pages too. */
        .visa-root .bg-white { background-color: var(--gc-surface) !important; }
        .visa-root .bg-slate-50 { background-color: var(--gc-paper-soft) !important; }
        .visa-root .bg-slate-100 { background-color: var(--gc-rule-soft) !important; }
        .visa-root .border-slate-100, .visa-root .border-slate-200 { border-color: var(--gc-rule) !important; }
        .visa-root .text-slate-800, .visa-root .text-slate-900 { color: var(--gc-ink) !important; }
        .visa-root .text-slate-600, .visa-root .text-slate-700 { color: var(--gc-ink-soft) !important; }
        .visa-root .text-slate-400, .visa-root .text-slate-500 { color: var(--gc-muted) !important; }
        .visa-root .rounded-xl, .visa-root .rounded-2xl { border-radius: var(--gc-radius) !important; }
        .visa-root .shadow-sm { box-shadow: none !important; }
        .visa-root .bg-emerald-50 { background-color: var(--gc-green-soft) !important; }
        .visa-root .border-emerald-200 { border-color: var(--gc-green-border) !important; }
        .visa-root .text-emerald-600, .visa-root .text-emerald-700 { color: var(--gc-green) !important; }
        .visa-root .text-emerald-900 { color: var(--gc-green-ink) !important; }
        .visa-root .bg-red-50 { background-color: var(--gc-red-soft) !important; }
        .visa-root .border-red-200 { border-color: var(--gc-red-border) !important; }
        .visa-root .text-red-600, .visa-root .text-red-700 { color: var(--gc-red) !important; }
        .visa-root .text-red-900 { color: var(--gc-red-ink) !important; }
        .visa-root .bg-amber-50 { background-color: var(--gc-amber-soft) !important; }
        .visa-root .border-amber-200 { border-color: var(--gc-amber-border) !important; }
        .visa-root .text-amber-600, .visa-root .text-amber-700 { color: var(--gc-amber) !important; }
        .visa-root .bg-blue-50, .visa-root .bg-indigo-50, .visa-root .bg-purple-50 { background-color: var(--gc-blue-soft) !important; }
        .visa-root .border-blue-200, .visa-root .border-indigo-200, .visa-root .border-purple-200 { border-color: var(--gc-blue-border) !important; }
        .visa-root .text-blue-600, .visa-root .text-blue-700, .visa-root .text-blue-800, .visa-root .text-blue-900,
        .visa-root .text-indigo-600, .visa-root .text-indigo-700,
        .visa-root .text-purple-600, .visa-root .text-purple-700 { color: var(--gc-blue) !important; }

        /* ========================================================
           THEME SYSTEM
           4 themes, all fully tokenized. Switch with data-theme="..."
           ======================================================== */

        /* THEME 1 · PASSPORT BUREAU (default) — warm cream + evergreen, editorial */
        .visa-root,
        .visa-root[data-theme="passport"] {
          --gc-paper: #f6f2e8;
          --gc-paper-soft: #f0ebdb;
          --gc-surface: #fdfcf7;
          --gc-ink: #111418;
          --gc-ink-soft: #3a3f45;
          --gc-muted: #6b6f75;
          --gc-muted-soft: #8a8f96;
          --gc-rule: #d6cfbb;
          --gc-rule-soft: #e5dfcc;
          --gc-subtle: #c5beaa;

          --gc-green: #0e4d2e;
          --gc-green-soft: #e4ece3;
          --gc-green-ink: #0a3a23;
          --gc-green-border: #93b7a0;
          --gc-green-fill: #c8dbc9;

          --gc-amber: #8a5a00;
          --gc-amber-soft: #f1e5c2;
          --gc-amber-ink: #4e3300;
          --gc-amber-border: #b89a55;
          --gc-amber-fill: #e9d79a;

          --gc-red: #8c1919;
          --gc-red-soft: #efd9d9;
          --gc-red-ink: #4e0e0e;
          --gc-red-border: #b88585;
          --gc-red-fill: #e1bebe;

          --gc-blue: #1e4b8c;
          --gc-blue-soft: #dee5f0;
          --gc-blue-ink: #163b6f;
          --gc-blue-border: #8aa4c6;
          --gc-blue-fill: #bfc9dc;

          --gc-radius-lg: 6px;
          --gc-radius: 4px;
          --gc-radius-sm: 3px;
          --gc-accent-h: 2px;
          --gc-font-display: ui-serif, "Iowan Old Style", Palatino, Georgia, "Times New Roman", serif;
        }

        /* THEME 2 · CONSULATE — cool institutional, navy primary, USCIS-modern */
        .visa-root[data-theme="consulate"] {
          --gc-paper: #f2f4f8;
          --gc-paper-soft: #e7ebf2;
          --gc-surface: #ffffff;
          --gc-ink: #0b1f3a;
          --gc-ink-soft: #2d3e5a;
          --gc-muted: #5a6477;
          --gc-muted-soft: #8791a0;
          --gc-rule: #c8ced9;
          --gc-rule-soft: #dfe3ec;
          --gc-subtle: #b3bac7;

          --gc-green: #0b3d70;             /* primary navy */
          --gc-green-soft: #dce4f0;
          --gc-green-ink: #051f3c;
          --gc-green-border: #8fa5c3;
          --gc-green-fill: #b4c4dc;

          --gc-amber: #8a4e00;
          --gc-amber-soft: #f4e4c7;
          --gc-amber-ink: #4e2a00;
          --gc-amber-border: #b89550;
          --gc-amber-fill: #e8d090;

          --gc-red: #a61c1c;
          --gc-red-soft: #f3d8d8;
          --gc-red-ink: #5e0e0e;
          --gc-red-border: #c58181;
          --gc-red-fill: #e4b3b3;

          --gc-blue: #0b3d70;              /* same as primary by design */
          --gc-blue-soft: #dce4f0;
          --gc-blue-ink: #051f3c;
          --gc-blue-border: #8fa5c3;
          --gc-blue-fill: #b4c4dc;

          --gc-radius-lg: 8px;
          --gc-radius: 6px;
          --gc-radius-sm: 4px;
          --gc-accent-h: 3px;
          --gc-font-display: "Helvetica Neue", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
        }

        /* THEME 3 · RED SEAL · 红印 — aged paper + seal red, traditional Chinese document */
        .visa-root[data-theme="redseal"] {
          --gc-paper: #f3e9d2;
          --gc-paper-soft: #e9ddbd;
          --gc-surface: #fbf5e4;
          --gc-ink: #1f140e;
          --gc-ink-soft: #40312a;
          --gc-muted: #6d5d50;
          --gc-muted-soft: #957f6e;
          --gc-rule: #c8b591;
          --gc-rule-soft: #ddcea5;
          --gc-subtle: #b39f7a;

          --gc-green: #8a1818;              /* primary = seal red */
          --gc-green-soft: #f3d9d9;
          --gc-green-ink: #5a0e0e;
          --gc-green-border: #c29090;
          --gc-green-fill: #e1b3b3;

          --gc-amber: #7a5200;
          --gc-amber-soft: #ecd9a8;
          --gc-amber-ink: #4a3200;
          --gc-amber-border: #b8914a;
          --gc-amber-fill: #d9b66a;

          --gc-red: #5a0e0e;                /* darker burgundy to differentiate from primary */
          --gc-red-soft: #e8c8c8;
          --gc-red-ink: #3a0505;
          --gc-red-border: #a06a6a;
          --gc-red-fill: #cf9898;

          --gc-blue: #1e4b8c;
          --gc-blue-soft: #d9e0ec;
          --gc-blue-ink: #0e2d5c;
          --gc-blue-border: #869dbf;
          --gc-blue-fill: #a9b7d0;

          --gc-radius-lg: 2px;
          --gc-radius: 2px;
          --gc-radius-sm: 2px;
          --gc-accent-h: 3px;
          --gc-font-display: ui-serif, "Songti SC", "Noto Serif SC", "STSong", Georgia, serif;
        }

        /* THEME 4 · MONOCLE · 财经刊物 — Bloomberg Terminal × Monocle magazine
           Warm cream paper + near-black ink + 1px hairlines + Fraunces serif numbers
           + Noto Sans SC body + JetBrains Mono for formulas. Muted accountant palette:
           ink-green (savings), rust-red (overpayment), whisky-gold (caution). */
        .visa-root[data-theme="monocle"] {
          --gc-paper: #f4efe4;            /* warm cream newsprint */
          --gc-paper-soft: #ece6d6;
          --gc-surface: #fbf8ef;           /* slightly lifted "page" */
          --gc-ink: #14110b;               /* near-black warm ink */
          --gc-ink-soft: #3a342a;
          --gc-muted: #6e665a;
          --gc-muted-soft: #958c7e;
          --gc-rule: #c5bba4;              /* 1px hairline rule */
          --gc-rule-soft: #dbd3bf;
          --gc-subtle: #b0a68e;

          --gc-green: #1f4d3a;              /* muted "accountant" ink-green */
          --gc-green-soft: #e3e8df;
          --gc-green-ink: #13382a;
          --gc-green-border: #8fa696;
          --gc-green-fill: #bfcbbf;

          --gc-amber: #8a6014;              /* whisky gold */
          --gc-amber-soft: #eee0be;
          --gc-amber-ink: #4e3707;
          --gc-amber-border: #b89547;
          --gc-amber-fill: #dcbc6e;

          --gc-red: #8a2a1c;                /* rust / oxblood */
          --gc-red-soft: #ead8d2;
          --gc-red-ink: #5a1810;
          --gc-red-border: #b5867b;
          --gc-red-fill: #d8a89b;

          --gc-blue: #1f3b5c;               /* indigo-slate */
          --gc-blue-soft: #dae0ea;
          --gc-blue-ink: #132642;
          --gc-blue-border: #8395ad;
          --gc-blue-fill: #b3bfd0;

          --gc-radius-lg: 1px;              /* nearly square — printed feel */
          --gc-radius: 1px;
          --gc-radius-sm: 1px;
          --gc-accent-h: 2px;
          --gc-font-display: "Fraunces", ui-serif, "Iowan Old Style", Georgia, serif;
        }

        /* Monocle-specific typography — apply Fraunces to serif role, Noto Sans SC to body,
           JetBrains Mono to numbers/formulas. Restrict to this theme so other themes keep
           their own font stack. */
        .visa-root[data-theme="monocle"] {
          font-family: "Noto Sans SC", -apple-system, BlinkMacSystemFont, "Segoe UI",
                       system-ui, sans-serif !important;
        }
        .visa-root[data-theme="monocle"] .gc-serif {
          font-family: "Fraunces", ui-serif, "Iowan Old Style", Georgia, serif !important;
          font-optical-sizing: auto;
          font-variation-settings: "SOFT" 50, "WONK" 0;
          letter-spacing: -0.015em;
        }
        .visa-root[data-theme="monocle"] .gc-mono {
          font-family: "JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace !important;
          font-variant-numeric: tabular-nums;
          font-feature-settings: "zero" 1, "ss01" 1;
        }
        /* Monocle: headings render with Fraunces — catch the common cases */
        .visa-root[data-theme="monocle"] h1,
        .visa-root[data-theme="monocle"] h2,
        .visa-root[data-theme="monocle"] h3 {
          font-family: "Fraunces", ui-serif, Georgia, serif;
          font-optical-sizing: auto;
          letter-spacing: -0.01em;
        }
        /* Monocle: remove soft drop shadows entirely — pure hairlines only */
        .visa-root[data-theme="monocle"] .shadow-md,
        .visa-root[data-theme="monocle"] .shadow-lg,
        .visa-root[data-theme="monocle"] .shadow-xl { box-shadow: none !important; }

        /* ========================================================
           TYPE HELPERS
           ======================================================== */
        .gc-serif { font-family: var(--gc-font-display); letter-spacing: -0.005em; }
        .gc-mono  { font-family: ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace; font-variant-numeric: tabular-nums; }
        .gc-label { font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; font-weight: 600; color: var(--gc-muted); }
        .gc-eyebrow { font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase; font-weight: 700; color: var(--gc-muted); }

        /* Range slider — ink-colored thumb, consistent with editorial ethos.
           Replaces default blue/platform-tinted thumb with a small solid ink pill. */
        .gc-slider { -webkit-appearance: none; appearance: none; outline: none; }
        .gc-slider::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          width: 16px; height: 16px; border-radius: 50%;
          background: var(--gc-surface);
          border: 2px solid var(--gc-ink);
          cursor: pointer;
          box-shadow: 0 1px 3px rgba(0,0,0,0.12);
          transition: transform 100ms;
        }
        .gc-slider::-webkit-slider-thumb:hover { transform: scale(1.1); }
        .gc-slider::-webkit-slider-thumb:active { transform: scale(1.15); background: var(--gc-ink); }
        .gc-slider::-moz-range-thumb {
          width: 16px; height: 16px; border-radius: 50%;
          background: var(--gc-surface);
          border: 2px solid var(--gc-ink);
          cursor: pointer;
          box-shadow: 0 1px 3px rgba(0,0,0,0.12);
          transition: transform 100ms;
        }
        .gc-slider::-moz-range-thumb:hover { transform: scale(1.1); }

        /* ========================================================
           TAILWIND REMAPS — fully token-driven so every theme works
           ======================================================== */

        /* Surfaces */
        .visa-root .bg-white    { background-color: var(--gc-surface) !important; }
        .visa-root .bg-slate-50 { background-color: var(--gc-paper-soft) !important; }
        .visa-root .bg-slate-100 { background-color: var(--gc-paper-soft) !important; }
        .visa-root .bg-slate-200 { background-color: var(--gc-rule) !important; }
        .visa-root .bg-slate-300 { background-color: var(--gc-subtle) !important; }
        .visa-root .bg-slate-400 { background-color: var(--gc-muted-soft) !important; }
        .visa-root .bg-slate-500 { background-color: var(--gc-muted) !important; }
        .visa-root .bg-slate-600 { background-color: var(--gc-ink-soft) !important; }
        .visa-root .bg-slate-800 { background-color: var(--gc-ink) !important; }
        .visa-root .bg-slate-900 { background-color: var(--gc-ink) !important; }

        /* Text — slate scale */
        .visa-root .text-slate-900 { color: var(--gc-ink) !important; }
        .visa-root .text-slate-800 { color: var(--gc-ink-soft) !important; }
        .visa-root .text-slate-700 { color: var(--gc-ink-soft) !important; }
        .visa-root .text-slate-600 { color: var(--gc-muted) !important; }
        .visa-root .text-slate-500 { color: var(--gc-muted) !important; }
        .visa-root .text-slate-400 { color: var(--gc-muted-soft) !important; }
        .visa-root .text-slate-300 { color: var(--gc-subtle) !important; }
        .visa-root .text-white { color: var(--gc-paper) !important; }

        /* Borders — slate scale */
        .visa-root .border-slate-100 { border-color: var(--gc-rule-soft) !important; }
        .visa-root .border-slate-200 { border-color: var(--gc-rule) !important; }
        .visa-root .border-slate-300 { border-color: var(--gc-subtle) !important; }

        /* Radii */
        .visa-root .rounded-2xl { border-radius: var(--gc-radius-lg) !important; }
        .visa-root .rounded-xl  { border-radius: var(--gc-radius) !important; }
        .visa-root .rounded-lg  { border-radius: var(--gc-radius-sm) !important; }
        .visa-root .rounded-md  { border-radius: var(--gc-radius-sm) !important; }

        /* Shadows flat */
        .visa-root .shadow-sm { box-shadow: none !important; }
        .visa-root .shadow-md { box-shadow: 0 1px 0 rgba(0,0,0,0.05) !important; }
        .visa-root .shadow-lg { box-shadow: 0 2px 16px rgba(0,0,0,0.08) !important; }
        .visa-root .shadow-xl { box-shadow: 0 4px 24px rgba(0,0,0,0.10) !important; }

        /* Neutralize ALL gradient chrome — map to palette tones */
        .visa-root .bg-gradient-to-r.from-purple-600.to-indigo-600,
        .visa-root .bg-gradient-to-r.from-indigo-600.to-purple-600,
        .visa-root .bg-gradient-to-br.from-purple-500.to-pink-500 {
          background-image: none !important; background-color: var(--gc-ink) !important;
        }
        .visa-root .bg-gradient-to-br.from-emerald-50.to-teal-50,
        .visa-root .bg-gradient-to-r.from-emerald-50.to-teal-50 {
          background-image: none !important; background-color: var(--gc-green-soft) !important;
        }
        .visa-root .bg-gradient-to-r.from-emerald-500.to-teal-500,
        .visa-root .bg-gradient-to-r.from-emerald-400.to-emerald-500 {
          background-image: none !important; background-color: var(--gc-green) !important;
        }
        .visa-root .bg-gradient-to-br.from-violet-50.to-purple-50,
        .visa-root .bg-gradient-to-r.from-indigo-50.to-purple-50,
        .visa-root .bg-gradient-to-b.from-indigo-50.to-purple-50 {
          background-image: none !important; background-color: var(--gc-paper-soft) !important;
        }
        .visa-root .bg-gradient-to-br.from-blue-50.to-indigo-50,
        .visa-root .bg-gradient-to-br.from-blue-50.to-sky-50 {
          background-image: none !important; background-color: var(--gc-blue-soft) !important;
        }
        .visa-root .bg-gradient-to-br.from-red-50.to-rose-50,
        .visa-root .bg-gradient-to-r.from-red-50.to-rose-50 {
          background-image: none !important; background-color: var(--gc-red-soft) !important;
        }
        .visa-root .bg-gradient-to-br.from-amber-50.to-orange-50,
        .visa-root .bg-gradient-to-r.from-amber-50.to-orange-50 {
          background-image: none !important; background-color: var(--gc-amber-soft) !important;
        }
        .visa-root .bg-gradient-to-r.from-slate-900.to-slate-700 {
          background-image: none !important; background-color: var(--gc-ink) !important;
        }
        .visa-root .bg-gradient-to-r.from-indigo-400.to-indigo-500,
        .visa-root .bg-gradient-to-r.from-indigo-500.to-purple-500 {
          background-image: none !important; background-color: var(--gc-green) !important;
        }
        .visa-root .bg-gradient-to-r.from-blue-400.to-blue-500 {
          background-image: none !important; background-color: var(--gc-blue) !important;
        }
        .visa-root .bg-gradient-to-r.from-red-400.to-red-500 {
          background-image: none !important; background-color: var(--gc-red) !important;
        }

        /* Indigo (old primary) → signature (token-driven) */
        .visa-root .bg-indigo-600 { background-color: var(--gc-ink) !important; border-color: var(--gc-ink) !important; }
        .visa-root .bg-indigo-500 { background-color: var(--gc-ink) !important; }
        .visa-root .bg-indigo-100 { background-color: var(--gc-green-soft) !important; }
        .visa-root .bg-indigo-50  { background-color: var(--gc-green-soft) !important; }
        .visa-root .border-indigo-200 { border-color: var(--gc-green-border) !important; }
        .visa-root .border-indigo-300 { border-color: var(--gc-green-border) !important; }
        .visa-root .border-indigo-400 { border-color: var(--gc-green) !important; }
        .visa-root .text-indigo-600 { color: var(--gc-green) !important; }
        .visa-root .text-indigo-700 { color: var(--gc-green-ink) !important; }
        .visa-root .text-indigo-900 { color: var(--gc-green-ink) !important; }
        .visa-root .ring-indigo-500 { --tw-ring-color: var(--gc-green) !important; }
        .visa-root .focus\\:ring-indigo-500:focus { --tw-ring-color: var(--gc-green) !important; }
        .visa-root .hover\\:bg-indigo-100:hover { background-color: var(--gc-green-soft) !important; }

        /* Purple — also primary-adjacent → ink */
        .visa-root .text-purple-600 { color: var(--gc-ink) !important; }
        .visa-root .text-purple-700 { color: var(--gc-ink) !important; }
        .visa-root .bg-purple-50    { background-color: var(--gc-paper-soft) !important; }

        /* Emerald → green family */
        .visa-root .text-emerald-600 { color: var(--gc-green) !important; }
        .visa-root .text-emerald-700 { color: var(--gc-green-ink) !important; }
        .visa-root .text-emerald-800 { color: var(--gc-green-ink) !important; }
        .visa-root .text-emerald-900 { color: var(--gc-green-ink) !important; }
        .visa-root .bg-emerald-50    { background-color: var(--gc-green-soft) !important; }
        .visa-root .bg-emerald-100   { background-color: var(--gc-green-fill) !important; }
        .visa-root .bg-emerald-200   { background-color: var(--gc-green-fill) !important; }
        .visa-root .bg-emerald-500   { background-color: var(--gc-green) !important; }
        .visa-root .bg-emerald-600   { background-color: var(--gc-green) !important; border-color: var(--gc-green) !important; }
        .visa-root .border-emerald-200 { border-color: var(--gc-green-border) !important; }
        .visa-root .border-emerald-300 { border-color: var(--gc-green-border) !important; }
        .visa-root .border-emerald-400 { border-color: var(--gc-green) !important; }
        .visa-root .ring-emerald-200 { --tw-ring-color: var(--gc-green-border) !important; }

        /* Teal → green family */
        .visa-root .bg-teal-100 { background-color: var(--gc-green-fill) !important; }
        .visa-root .bg-teal-500 { background-color: var(--gc-green) !important; }
        .visa-root .text-teal-600 { color: var(--gc-green) !important; }
        .visa-root .text-teal-700 { color: var(--gc-green-ink) !important; }

        /* Amber */
        .visa-root .bg-amber-50  { background-color: var(--gc-amber-soft) !important; }
        .visa-root .bg-amber-100 { background-color: var(--gc-amber-fill) !important; }
        .visa-root .bg-amber-300 { background-color: var(--gc-amber-border) !important; }
        .visa-root .bg-amber-500 { background-color: var(--gc-amber) !important; }
        .visa-root .bg-amber-600 { background-color: var(--gc-amber) !important; }
        .visa-root .hover\\:bg-amber-700:hover { background-color: var(--gc-amber-ink) !important; }
        .visa-root .border-amber-200 { border-color: var(--gc-amber-border) !important; }
        .visa-root .border-amber-300 { border-color: var(--gc-amber-border) !important; }
        .visa-root .border-amber-400 { border-color: var(--gc-amber) !important; }
        .visa-root .border-amber-600 { border-color: var(--gc-amber) !important; }
        .visa-root .text-amber-600 { color: var(--gc-amber) !important; }
        .visa-root .text-amber-700 { color: var(--gc-amber) !important; }
        .visa-root .text-amber-800 { color: var(--gc-amber-ink) !important; }
        .visa-root .text-amber-900 { color: var(--gc-amber-ink) !important; }
        .visa-root .ring-amber-200 { --tw-ring-color: var(--gc-amber-border) !important; }

        /* Orange → amber family */
        .visa-root .bg-orange-100 { background-color: var(--gc-amber-fill) !important; }
        .visa-root .bg-orange-500 { background-color: var(--gc-amber) !important; }

        /* Red */
        .visa-root .bg-red-50  { background-color: var(--gc-red-soft) !important; }
        .visa-root .bg-red-100 { background-color: var(--gc-red-fill) !important; }
        .visa-root .bg-red-500 { background-color: var(--gc-red) !important; }
        .visa-root .border-red-200 { border-color: var(--gc-red-border) !important; }
        .visa-root .border-red-300 { border-color: var(--gc-red-border) !important; }
        .visa-root .text-red-600 { color: var(--gc-red) !important; }
        .visa-root .text-red-700 { color: var(--gc-red) !important; }
        .visa-root .text-red-800 { color: var(--gc-red-ink) !important; }
        .visa-root .text-red-900 { color: var(--gc-red-ink) !important; }
        .visa-root .ring-red-200 { --tw-ring-color: var(--gc-red-border) !important; }

        /* Blue */
        .visa-root .bg-blue-50  { background-color: var(--gc-blue-soft) !important; }
        .visa-root .bg-blue-100 { background-color: var(--gc-blue-fill) !important; }
        .visa-root .bg-blue-500 { background-color: var(--gc-blue) !important; }
        .visa-root .bg-blue-600 { background-color: var(--gc-blue) !important; }
        .visa-root .bg-blue-700 { background-color: var(--gc-blue-ink) !important; }
        .visa-root .border-blue-100 { border-color: var(--gc-blue-border) !important; }
        .visa-root .border-blue-200 { border-color: var(--gc-blue-border) !important; }
        .visa-root .border-blue-300 { border-color: var(--gc-blue-border) !important; }
        .visa-root .border-blue-500 { border-color: var(--gc-blue) !important; }
        .visa-root .border-blue-600 { border-color: var(--gc-blue) !important; }
        .visa-root .text-blue-600 { color: var(--gc-blue) !important; }
        .visa-root .text-blue-700 { color: var(--gc-blue) !important; }
        .visa-root .text-blue-800 { color: var(--gc-blue-ink) !important; }
        .visa-root .text-blue-900 { color: var(--gc-blue-ink) !important; }
        .visa-root .ring-blue-200 { --tw-ring-color: var(--gc-blue-border) !important; }

        /* Animation tone-down */
        .visa-root .animate-pulse { animation-duration: 3s; }

        /* iOS Safari: date input normalization */
        .visa-root input[type="date"] {
          -webkit-appearance: none;
          appearance: none;
          -webkit-text-fill-color: inherit;
          min-width: 0; width: 100%; max-width: 100%;
          box-sizing: border-box; display: block;
          font-family: inherit;
          color-scheme: light;
          /* Containing block for the absolutely-positioned picker indicator below.
             Without this it anchors to the nearest positioned ancestor (the modal),
             and the calendar icon escapes the input's right edge. */
          position: relative;
          padding-right: 34px;
        }
        .visa-root input[type="date"]::-webkit-calendar-picker-indicator {
          position: absolute; right: 10px; opacity: 0.5; cursor: pointer;
        }
        .visa-root input[type="date"]::-webkit-date-and-time-value { text-align: left; }
        .visa-root input[type="date"]::-webkit-inner-spin-button,
        .visa-root input[type="date"]::-webkit-clear-button { display: none; }
        .visa-root select { -webkit-appearance: none; appearance: none; }

        /* Focus rings */
        .visa-root input:focus, .visa-root select:focus, .visa-root button:focus-visible { outline: none; }
        .visa-root .focus\\:ring-2:focus { box-shadow: 0 0 0 2px var(--gc-green) !important; }
        .visa-root .focus\\:ring-slate-900:focus { box-shadow: 0 0 0 2px var(--gc-ink) !important; }

        /* Hover hardcoded white → surface (dark theme safety) */
        .visa-root .hover\\:bg-slate-50:hover { background-color: var(--gc-paper-soft) !important; }
      `}</style>
      <div className="min-h-screen visa-root" data-theme={theme}
           style={{
             fontFamily: fontStack,
             width: '100%',
             maxWidth: '100vw',
             overflowX: 'clip',
             boxSizing: 'border-box',
             position: 'relative',
             backgroundColor: 'var(--gc-paper)',
             color: 'var(--gc-ink)'
           }}>
        {/* Sticky header with WebView-compatible enhancements */}
        <div style={{
               position: 'sticky',
               top: 0,
               zIndex: 50,
               backgroundColor: 'var(--gc-surface)',
               width: '100%',
               WebkitPosition: '-webkit-sticky',
               borderBottom: '1px solid var(--gc-rule)',
               transform: 'translateZ(0)',
               WebkitTransform: 'translateZ(0)',
               willChange: 'transform'
             }}>
          {/* Thin evergreen accent bar — the "document" signature (height varies by theme) */}
          <div style={{ height: 'var(--gc-accent-h)', background: 'var(--gc-green)', width: '100%' }}></div>

          {/* Header — editorial masthead */}
          <header style={{ width: '100%', maxWidth: '100vw', boxSizing: 'border-box', background: 'var(--gc-surface)' }}>
            <div className="max-w-3xl mx-auto flex items-center gap-2"
                 style={{ padding: '9px 12px', boxSizing: 'border-box', width: '100%' }}>

              {/* Wordmark: Green Card miniature + serif title.
                  Static design — no animation. Captures the "in-flight" moment:
                  the card sits with a tiny forward lean, three soft speed lines
                  trailing behind it on the left. Reads as "delivery in motion"
                  without any movement being required. */}
              <div className="flex items-center gap-2 min-w-0" style={{ flex: '1 1 0%', minWidth: 0 }}>
                {/* Outer wrapper holds both the card and the trailing speed lines. */}
                <div className="flex-shrink-0" style={{ position: 'relative', width: '28px', height: '28px' }}>
                  {/* Speed lines — permanently visible, sitting to the left of the card.
                      They imply the card has just come in from off-screen. */}
                  <svg
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      top: 0, left: '-12px',
                      width: '12px', height: '28px',
                      pointerEvents: 'none',
                      overflow: 'visible',
                    }}
                    viewBox="0 0 12 28"
                    fill="none"
                  >
                    {/* Three lines: outer two shorter + lower opacity, middle one longer.
                        Together they suggest the trail of a moving object. */}
                    <line x1="3"  y1="9"  x2="10" y2="9"
                          stroke="var(--gc-green)" strokeWidth="1.2" strokeLinecap="round" opacity="0.35" />
                    <line x1="0"  y1="14" x2="11" y2="14"
                          stroke="var(--gc-green)" strokeWidth="1.3" strokeLinecap="round" opacity="0.55" />
                    <line x1="3"  y1="19" x2="10" y2="19"
                          stroke="var(--gc-green)" strokeWidth="1.2" strokeLinecap="round" opacity="0.35" />
                  </svg>
                  {/* The card itself — tilted ever so slightly to imply forward motion */}
                  <div className="flex items-center justify-center"
                       style={{
                         width: '28px', height: '28px',
                         border: '1.5px solid var(--gc-green)',
                         borderRadius: '3px',
                         background: 'var(--gc-surface)',
                         position: 'relative',
                         transform: 'rotate(-2deg)',
                         transformOrigin: 'center center',
                       }}>
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" style={{ display: 'block', overflow: 'visible' }}>
                      {/* Card outline — wider-than-tall rectangle (ID card proportion) */}
                      <rect x="2.5" y="6" width="19" height="12" rx="1.2"
                            stroke="var(--gc-green)" strokeWidth="1.5" fill="var(--gc-green-soft)" />
                      {/* Top banner stripe — hints at "PERMANENT RESIDENT" header */}
                      <rect x="2.5" y="6" width="19" height="2.2" rx="1.2"
                            fill="var(--gc-green)" />
                      {/* Photo slot — top-left square */}
                      <rect x="4" y="9.5" width="5" height="6.5" rx="0.4"
                            fill="var(--gc-green)" opacity="0.85" />
                      {/* Info lines — right side */}
                      <line x1="10.5" y1="11" x2="19" y2="11"
                            stroke="var(--gc-green)" strokeWidth="0.9" strokeLinecap="round" opacity="0.7" />
                      <line x1="10.5" y1="13.3" x2="17" y2="13.3"
                            stroke="var(--gc-green)" strokeWidth="0.9" strokeLinecap="round" opacity="0.55" />
                      <line x1="10.5" y1="15.6" x2="18" y2="15.6"
                            stroke="var(--gc-green)" strokeWidth="0.9" strokeLinecap="round" opacity="0.55" />
                      {/* "Delivered" check mark — bottom-right corner, always visible */}
                      <circle cx="19.2" cy="16.5" r="3.2" fill="var(--gc-green)" stroke="var(--gc-surface)" strokeWidth="1" />
                      <path d="M 17.7 16.5 L 18.8 17.6 L 20.6 15.5"
                            stroke="var(--gc-surface)" strokeWidth="1.2"
                            strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    </svg>
                  </div>
                </div>
                <div style={{ minWidth: 0, flex: '1 1 0%', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h1 className="gc-serif truncate" style={{ fontSize: '15px', fontWeight: 600, color: 'var(--gc-ink)', lineHeight: 1.15, letterSpacing: '-0.01em', flexShrink: 1, minWidth: 0 }}>
                    {t.appTitle}
                  </h1>
                  {/* Time Machine — inline beside the brand (was stacked below it) */}
                  <div className="relative inline-block" style={{ flexShrink: 0 }}>
                    <button
                      onClick={() => setShowTimeMachine((v) => !v)}
                      className="flex items-center gap-1 active:opacity-70"
                      style={{
                        fontSize: '9px',
                        fontWeight: 700,
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        padding: '2px 6px',
                        border: isTimeMachineActive ? '1px solid var(--gc-amber)' : '1px solid var(--gc-rule)',
                        borderRadius: '2px',
                        background: isTimeMachineActive ? 'var(--gc-amber-soft)' : 'transparent',
                        color: isTimeMachineActive ? 'var(--gc-amber-ink)' : 'var(--gc-muted)',
                        lineHeight: 1.2,
                        transition: 'all 120ms',
                      }}
                    >
                      <span className="gc-mono" style={{ letterSpacing: '0.02em', textTransform: 'none' }}>
                        {BULLETIN_CURRENT_MONTH[lang]}
                      </span>
                      <span style={{ opacity: 0.5, fontSize: '8px' }}>▾</span>
                    </button>
                    {showTimeMachine && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowTimeMachine(false)} />
                        <div className="absolute top-full left-0 z-50"
                             style={{
                               marginTop: '4px',
                               background: 'var(--gc-surface)',
                               border: '1px solid var(--gc-rule)',
                               borderRadius: '3px',
                               minWidth: '200px',
                               boxShadow: '0 4px 24px rgba(17,20,24,0.12)',
                               padding: '4px 0',
                               // The archive grew from 3 hardcoded months to the full
                               // real history, so this has to scroll.
                               maxHeight: '320px',
                               overflowY: 'auto',
                             }}>
                          <div className="gc-eyebrow" style={{ padding: '6px 12px 4px', borderBottom: '1px solid var(--gc-rule-soft)', marginBottom: '4px' }}>
                            {lang === 'en' ? 'Archive' : lang === 'tw' ? '歷史存檔' : '历史存档'}
                          </div>
                          {Object.entries(BULLETIN_ARCHIVE).map(([monthKey, snap]) => {
                            const isActive = viewingMonth === monthKey;
                            const isDefault = monthKey === DEFAULT_VIEWING_MONTH;
                            return (
                              <button
                                key={monthKey}
                                onClick={() => { setViewingMonth(monthKey); setShowTimeMachine(false); }}
                                className="w-full text-left flex items-center justify-between"
                                style={{
                                  padding: '7px 12px',
                                  fontSize: '12px',
                                  background: isActive ? 'var(--gc-green-soft)' : 'transparent',
                                  color: isActive ? 'var(--gc-green-ink)' : 'var(--gc-ink-soft)',
                                  fontWeight: isActive ? 700 : 500,
                                }}>
                                <span className="flex items-center gap-2">
                                  <span className="gc-mono" style={{ fontSize: '11px' }}>{snap.label[lang]}</span>
                                  {isDefault && (
                                    <span className="gc-eyebrow" style={{ fontSize: '8px', color: 'var(--gc-green)', letterSpacing: '0.14em' }}>
                                      {lang === 'en' ? 'LATEST' : '最新'}
                                    </span>
                                  )}
                                </span>
                                {isActive && <span style={{ color: 'var(--gc-green)' }}>✓</span>}
                              </button>
                            );
                          })}
                          <div style={{ borderTop: '1px solid var(--gc-rule-soft)', marginTop: '4px', padding: '6px 12px' }}>
                            <p style={{ fontSize: '10px', color: 'var(--gc-muted)', lineHeight: 1.5 }}>
                              {lang === 'en' ? 'View the app as it looked in a past month.'
                               : lang === 'tw' ? '用過去某個月份的視角查看應用。'
                               : '用过去某个月份的视角查看应用。'}
                            </p>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Help + LangSwitcher + Subscribe */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {/* Help — icon-led pill, sharp and balanced with the other header chips */}
                <button onClick={() => setShowHelp(true)}
                  aria-label={lang === 'en' ? 'Help' : '帮助'}
                  title={lang === 'en' ? 'Help' : lang === 'tw' ? '幫助' : '帮助'}
                  className="flex items-center justify-center active:opacity-80"
                  style={{
                    width: '26px',
                    height: '26px',
                    background: 'var(--gc-surface)',
                    color: 'var(--gc-ink)',
                    border: '1px solid var(--gc-rule)',
                    borderRadius: '50%',
                    cursor: 'pointer',
                    transition: 'all 140ms ease',
                    flexShrink: 0,
                    lineHeight: 1,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'var(--gc-green)';
                    e.currentTarget.style.color = 'var(--gc-paper)';
                    e.currentTarget.style.borderColor = 'var(--gc-green)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'var(--gc-surface)';
                    e.currentTarget.style.color = 'var(--gc-ink)';
                    e.currentTarget.style.borderColor = 'var(--gc-rule)';
                  }}>
                  <HelpCircle size={14} strokeWidth={2} style={{ flexShrink: 0 }} />
                </button>

                <LangSwitcher />
                {/* Subscribe lives in the header now — promoted out of the nav so the
                    nav slot can become the partners/about page. */}
                <button onClick={() => setShowSubModal(true)}
                  aria-label={lang === 'en' ? 'Subscribe' : '订阅'}
                  className="flex items-center active:opacity-80"
                  style={{
                    gap: '4px',
                    padding: '0 10px',
                    height: '26px',
                    background: 'var(--gc-green)',
                    color: 'var(--gc-paper)',
                    border: '1px solid var(--gc-green)',
                    borderRadius: '13px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    flexShrink: 0,
                    lineHeight: 1,
                    whiteSpace: 'nowrap',
                    letterSpacing: '0.01em',
                  }}>
                  <Mail size={12} strokeWidth={2.2} style={{ flexShrink: 0 }} />
                  <span>{lang === 'en' ? 'Subscribe' : lang === 'tw' ? '訂閱' : '订阅'}</span>
                </button>
              </div>
            </div>
          </header>

          {/* Time Machine banner — only shown when viewing a non-default month */}
          {isTimeMachineActive && (
            <div style={{ width: '100%', background: 'var(--gc-amber-soft)', borderTop: '1px solid var(--gc-amber-border)', borderBottom: '1px solid var(--gc-amber-border)' }}>
              <div className="max-w-3xl mx-auto flex items-center gap-2" style={{ padding: '6px 12px' }}>
                <Clock size={11} style={{ color: 'var(--gc-amber)' }} strokeWidth={2.2} />
                <p style={{ fontSize: '11px', color: 'var(--gc-amber-ink)', flex: 1, minWidth: 0, lineHeight: 1.3 }}>
                  {lang === 'en'
                    ? <>Viewing <span className="gc-mono" style={{ fontWeight: 700 }}>{BULLETIN_ARCHIVE[viewingMonth]?.label.en}</span> · historical perspective</>
                    : lang === 'tw'
                      ? <>正以 <span className="gc-mono" style={{ fontWeight: 700 }}>{BULLETIN_ARCHIVE[viewingMonth]?.label.tw}</span> 的視角查看</>
                      : <>正以 <span className="gc-mono" style={{ fontWeight: 700 }}>{BULLETIN_ARCHIVE[viewingMonth]?.label.zh}</span> 的视角查看</>}
                </p>
                <button
                  onClick={() => setViewingMonth(DEFAULT_VIEWING_MONTH)}
                  className="flex-shrink-0"
                  style={{
                    padding: '3px 8px',
                    background: 'var(--gc-amber)',
                    color: 'var(--gc-paper)',
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    borderRadius: '2px',
                    whiteSpace: 'nowrap',
                  }}>
                  {lang === 'en' ? 'Latest' : lang === 'tw' ? '回到最新' : '回到当前'}
                </button>
              </div>
            </div>
          )}

          {/* Navigation — single-row document tabs with hairline active indicator */}
          <nav style={{ width: '100%', maxWidth: '100vw', boxSizing: 'border-box', background: 'var(--gc-surface)' }}>
            <div className="max-w-3xl mx-auto" style={{ width: '100%', boxSizing: 'border-box' }}>
              <div className="flex" style={{ width: '100%' }}>
                {tabs.map(tb => {
                  const Icon = tb.icon;
                  const active = tab === tb.id;
                  const isAIHighlighted = tb.id === 'trends' && !active;

                  // In English mode, stack icon above label (vertical) — English labels
                  // ("Overview", "Compare", "Forecast") are wider than 2-char Chinese
                  // labels and would truncate in horizontal layout at mobile widths.
                  // Stacking frees the full tab width for the label.
                  const stackVertical = lang === 'en';
                  return (
                    <button key={tb.id} onClick={() => handleTabChange(tb.id)}
                      style={{
                        flex: '1 1 0%', minWidth: 0, boxSizing: 'border-box',
                        position: 'relative',
                        padding: stackVertical ? '6px 3px 5px' : '10px 4px 9px',
                        fontSize: '11px',
                        fontWeight: active ? 700 : 500,
                        letterSpacing: '0.02em',
                        color: active ? 'var(--gc-ink)' : 'var(--gc-muted)',
                        background: active ? 'var(--gc-paper-soft)' : 'transparent',
                        borderBottom: active ? '2px solid var(--gc-green)' : '2px solid transparent',
                        transition: 'all 120ms',
                      }}
                      className={stackVertical
                        ? "flex flex-col items-center justify-center gap-0.5"
                        : "flex items-center justify-center gap-1"}>
                      <Icon size={stackVertical ? 13 : 12} strokeWidth={2.2} className="flex-shrink-0" />
                      <span className="truncate" style={stackVertical ? { maxWidth: '100%' } : {}}>{tb.label}</span>
                      {isAIHighlighted && (
                        <span style={{
                          position: 'absolute', top: '2px', right: '4px',
                          fontSize: '7px', fontWeight: 700, letterSpacing: '0.1em',
                          color: 'var(--gc-green)',
                          lineHeight: 1,
                        }}>
                          AI
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </nav>
        </div>
        {/* End fixed header wrapper */}

        {/* max-w-3xl (768px), and no inline maxWidth — an inline maxWidth:'100%' was
            overriding the Tailwind cap entirely, so desktop rendered every card at full
            viewport width (60+ CJK chars per line at 1280px). */}
        <main className="max-w-3xl mx-auto"
              style={{
                padding: '12px',
                boxSizing: 'border-box',
                width: '100%',
              }}>
          {(() => {
            // Overview now uses the same CompactCaseBar as other tabs (no more full sidebar).
            // This keeps the page narrow and matches user expectation from every other tab.
            const tabsWithFullPanel = [];
            // Tabs that skip the case input entirely (have their own selectors or are pure info)
            const tabsWithoutCase = ['compare', 'scenarios', 'index', 'help'];
            const showFullPanel = tabsWithFullPanel.includes(tab);
            const showCompactBar = !tabsWithFullPanel.includes(tab) && !tabsWithoutCase.includes(tab);
            return (
          <div className={showFullPanel ? "grid grid-cols-1 md:grid-cols-[260px_1fr] gap-3" : "grid grid-cols-1 gap-3"}
               style={{ width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
            {showFullPanel && (
            <div className="md:sticky md:top-[90px] md:self-start"
                 style={{ width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box' }}>
              <InputPanel userCase={userCase} setUserCase={setUserCase} />
            </div>
            )}
            <div style={{ width: '100%', maxWidth: '100%', minWidth: 0, boxSizing: 'border-box', overflow: 'hidden' }}>
              {showCompactBar && <CompactCaseBar userCase={userCase} setUserCase={setUserCase} />}
              {tab === 'overview' && <Overview userCase={userCase} setTab={handleTabChange} completedI485Steps={completedI485Steps} setCompletedI485Steps={setCompletedI485Steps} greenCardInfo={greenCardInfo} setGreenCardInfo={setGreenCardInfo} travelRecords={travelRecords} setTravelRecords={setTravelRecords} i485ServiceCenter={i485ServiceCenter} setI485ServiceCenter={setI485ServiceCenter} stepActualDates={stepActualDates} setStepActualDates={setStepActualDates} />}
              {tab === 'dashboard' && <Overview userCase={userCase} setTab={handleTabChange} completedI485Steps={completedI485Steps} setCompletedI485Steps={setCompletedI485Steps} />}
              {/* 预测 tab — id is 'trends' per navigation config (line 11527).
                  MUST pass i485ServiceCenter + completedI485Steps so TrendChart's
                  approval forecast syncs with Overview. The 'forecast' branch
                  below is dead code kept for backward compat. */}
              {tab === 'trends' && <ForecastHub userCase={userCase} i485ServiceCenter={i485ServiceCenter} completedI485Steps={completedI485Steps} stepActualDates={stepActualDates} />}
              {tab === 'update' && <MonthlyUpdate userCase={userCase} />}
              {tab === 'forecast' && <ForecastHub userCase={userCase} i485ServiceCenter={i485ServiceCenter} completedI485Steps={completedI485Steps} stepActualDates={stepActualDates} />}
              {tab === 'i485' && <Overview userCase={userCase} setTab={handleTabChange} completedI485Steps={completedI485Steps} setCompletedI485Steps={setCompletedI485Steps} />}
              {tab === 'alerts' && <SmartAlerts userCase={userCase} setUserCase={setUserCase} setTab={handleTabChange} greenCardInfo={greenCardInfo} />}
              {tab === 'bulletin' && <BulletinTab userCase={userCase} />}
              {tab === 'about' && <AboutTab />}
              {/* 原「如果」（What-if）tab 让位给「社区」：案件进度墙 + 同路人互动挪进来，
                  CompareHub 没删，收进页面底部的 <details> 里，默认收起。 */}
              {tab === 'compare' && <CommunityPage userCase={userCase} />}
              {tab === 'index' && <TheIndex userCase={userCase} setTab={handleTabChange} setUserCase={setUserCase} previousTab={previousTab} onSetupCase={() => { setOnboardingInitialMode('form'); setHasOnboarded(false); }} />}
              {tab === 'help' && <HelpCenter />}
            </div>
          </div>
            );
          })()}
          <div className="mt-3" style={{ padding: '6px 12px 16px' }}>
            {/* ONE compact fine-print line: source + month + disclaimer + copyright +
                theme picker. Vol/No dropped — it forced a second wrapped line. */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexWrap: 'wrap',
              gap: '6px 8px',
              fontSize: '10px',
              color: 'var(--gc-muted-soft, var(--gc-muted))',
            }}>
              {/* Small theme dropdown — low-key, sits inline with copyright */}
              {(() => {
                const themes = [
                  { id: 'passport',  name: lang==='en'?'Gazette':'晨间',     swatch: ['#f6f2e8','#0e4d2e'] },
                  { id: 'consulate', name: lang==='en'?'Archive':'典章',     swatch: ['#ffffff','#0b3d70'] },
                  { id: 'redseal',   name: lang==='en'?'Vermilion':'朱批',   swatch: ['#f3e9d2','#8a1818'] },
                  { id: 'monocle',   name: lang==='en'?'Editorial':'刊',     swatch: ['#f4efe4','#1f4d3a'] },
                ];
                const current = themes.find(th => th.id === theme) || themes[0];
                return (
                  <div className="relative inline-block">
                    <button
                      onClick={() => setShowFooterThemePicker(v => !v)}
                      title={lang === 'en' ? 'Change style' : '切换版面'}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '5px 9px 5px 8px',
                        border: '1px solid var(--gc-rule)',
                        borderRadius: '3px',
                        background: 'transparent',
                        cursor: 'pointer',
                        fontSize: '10px',
                        color: 'var(--gc-muted)',
                        lineHeight: 1,
                        letterSpacing: '0.02em',
                      }}>
                      {/* tiny swatch */}
                      <span style={{
                        width: '10px', height: '10px',
                        border: '1px solid var(--gc-rule-soft)',
                        borderRadius: '1px',
                        background: current.swatch[0],
                        position: 'relative',
                        overflow: 'hidden',
                        flexShrink: 0,
                      }}>
                        <span style={{
                          position: 'absolute',
                          top: 0, right: 0, bottom: 0,
                          width: '50%',
                          background: current.swatch[1],
                        }}></span>
                      </span>
                      <span className="gc-serif" style={{ fontSize: '11px' }}>{current.name}</span>
                      <svg width="7" height="4" viewBox="0 0 8 5" style={{ opacity: 0.5 }}>
                        <path d="M0 0 L4 4 L8 0" stroke="currentColor" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                    {showFooterThemePicker && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setShowFooterThemePicker(false)} />
                        <div className="absolute z-50"
                             style={{
                               bottom: '100%', left: '50%', transform: 'translateX(-50%)',
                               marginBottom: '4px',
                               background: 'var(--gc-surface)',
                               border: '1px solid var(--gc-rule)',
                               borderBottom: '2px solid var(--gc-green)',
                               borderRadius: 'var(--gc-radius-sm)',
                               minWidth: '160px',
                               boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
                               padding: '4px 0',
                             }}>
                          <div className="gc-eyebrow" style={{
                            padding: '6px 10px 4px',
                            borderBottom: '1px solid var(--gc-rule-soft)',
                            marginBottom: '2px',
                            color: 'var(--gc-muted)',
                            fontSize: '9px',
                          }}>
                            {lang === 'en' ? 'Visual Style' : lang === 'tw' ? '版面風格' : '版面风格'}
                          </div>
                          {themes.map(th => {
                            const active = th.id === theme;
                            return (
                              <button
                                key={th.id}
                                onClick={() => { setTheme(th.id); setShowFooterThemePicker(false); }}
                                className="w-full text-left flex items-center gap-2"
                                style={{
                                  padding: '6px 10px',
                                  fontSize: '11px',
                                  fontWeight: active ? 700 : 500,
                                  color: active ? 'var(--gc-green-ink)' : 'var(--gc-ink-soft)',
                                  background: active ? 'var(--gc-green-soft)' : 'transparent',
                                }}>
                                <span style={{
                                  width: '16px', height: '16px',
                                  border: '1px solid var(--gc-rule)',
                                  borderRadius: '2px',
                                  background: th.swatch[0],
                                  position: 'relative',
                                  overflow: 'hidden',
                                  flexShrink: 0,
                                }}>
                                  <span style={{
                                    position: 'absolute',
                                    top: 0, right: 0, bottom: 0,
                                    width: '50%',
                                    background: th.swatch[1],
                                  }}></span>
                                </span>
                                <span className="gc-serif flex-1" style={{ letterSpacing: '0.005em' }}>{th.name}</span>
                                {active && <span style={{ color: 'var(--gc-green)', fontSize: '10px' }}>✓</span>}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}
              {/* Reset all data — destructive, two-stage confirmation.
                  First click: button turns amber, shows "确认?" + "取消".
                  Second click within 5s: wipes all gc_* localStorage, reloads app.
                  After 5s idle, reverts to neutral. Sits beside the theme picker
                  on row 1; the fine-print data line moves to its own row below. */}
              {confirmReset === null ? (
                <button
                  onClick={() => {
                    setConfirmReset(Date.now());
                    // Auto-revert after 5 seconds if no second click
                    setTimeout(() => {
                      setConfirmReset(prev => (prev && Date.now() - prev >= 5000 ? null : prev));
                    }, 5100);
                  }}
                  title={lang === 'en' ? 'Reset all saved data' : '清除所有本地数据'}
                  style={{
                    padding: '5px 10px',
                    border: '1px solid var(--gc-rule)',
                    borderRadius: '3px',
                    background: 'transparent',
                    cursor: 'pointer',
                    fontSize: '11px',
                    color: 'var(--gc-muted)',
                    lineHeight: 1,
                    letterSpacing: '0.02em',
                    fontFamily: 'inherit',
                  }}>
                  ↻ {lang === 'en' ? 'Reset' : lang === 'tw' ? '重置' : '重置'}
                </button>
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '10px', color: 'var(--gc-amber, #b45309)', fontWeight: 600 }}>
                    {lang === 'en' ? 'Clear everything?' : lang === 'tw' ? '確定清除全部?' : '确定清除全部?'}
                  </span>
                  <button
                    onClick={() => {
                      try {
                        // Wipe all gc_* keys (don't touch user's other localStorage)
                        const keys = [];
                        for (let i = 0; i < window.localStorage.length; i++) {
                          const k = window.localStorage.key(i);
                          if (k && k.startsWith('gc_')) keys.push(k);
                        }
                        keys.forEach(k => window.localStorage.removeItem(k));
                      } catch (e) { /* noop */ }
                      // Clear URL params too so we truly start fresh
                      try { window.history.replaceState({}, '', window.location.pathname); }
                      catch (e) { /* noop */ }
                      window.location.reload();
                    }}
                    style={{
                      padding: '3px 8px',
                      border: '1px solid var(--gc-amber, #b45309)',
                      borderRadius: '2px',
                      background: 'var(--gc-amber, #b45309)',
                      color: '#fff',
                      cursor: 'pointer',
                      fontSize: '10px',
                      fontWeight: 600,
                      lineHeight: 1,
                      fontFamily: 'inherit',
                    }}>
                    {lang === 'en' ? 'Yes, clear' : '是,清除'}
                  </button>
                  <button
                    onClick={() => setConfirmReset(null)}
                    style={{
                      padding: '3px 6px',
                      border: '1px solid var(--gc-rule)',
                      borderRadius: '2px',
                      background: 'transparent',
                      cursor: 'pointer',
                      fontSize: '10px',
                      color: 'var(--gc-muted)',
                      lineHeight: 1,
                      fontFamily: 'inherit',
                    }}>
                    {lang === 'en' ? 'Cancel' : '取消'}
                  </button>
                </span>
              )}
              <span style={{ flexBasis: '100%', height: 0 }} aria-hidden="true" />
              <span className="gc-mono" style={{ letterSpacing: '0.02em', color: 'var(--gc-muted)', whiteSpace: 'nowrap' }}>
                {lang === 'zh' ? `数据 travel.state.gov · ${BULLETIN_CURRENT_MONTH.zh} · 仅供参考 · © 2026 JMJ`
                  : lang === 'tw' ? `資料 travel.state.gov · ${BULLETIN_CURRENT_MONTH.tw} · 僅供參考 · © 2026 JMJ`
                  : `Data: travel.state.gov · ${BULLETIN_CURRENT_MONTH.en} · Not legal advice · © 2026 JMJ`}
              </span>
            </div>
          </div>
        </main>

        {/* Help Modal — full-height sheet wrapping HelpCenter */}
        {showHelp && (
          <div className="visa-root" data-theme={theme} style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
            padding: '16px 12px',
          }}>
            <style>{`
              @keyframes helpBackdropIn {
                from { opacity: 0; }
                to   { opacity: 1; }
              }
              @keyframes helpSheetIn {
                from { opacity: 0; transform: translateY(14px); }
                to   { opacity: 1; transform: translateY(0); }
              }
            `}</style>
            {/* Backdrop */}
            <div
              onClick={() => setShowHelp(false)}
              style={{
                position: 'absolute', inset: 0,
                background: 'rgba(15, 20, 25, 0.55)',
                backdropFilter: 'blur(6px)',
                WebkitBackdropFilter: 'blur(6px)',
                animation: 'helpBackdropIn 220ms ease-out',
              }}
            />
            {/* Sheet */}
            <div style={{
              position: 'relative',
              background: 'var(--gc-surface)',
              border: '1px solid var(--gc-rule)',
              borderTop: '3px solid var(--gc-green)',
              borderRadius: 'var(--gc-radius)',
              width: '100%',
              maxWidth: '560px',
              maxHeight: 'calc(100vh - 32px)',
              overflowY: 'auto',
              animation: 'helpSheetIn 340ms cubic-bezier(0.2, 0.8, 0.2, 1)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.25), 0 2px 8px rgba(0, 0, 0, 0.12)',
              zIndex: 1,
            }}>
              {/* Close button — absolute top-right of the sheet, generously padded from edge */}
              <button
                onClick={() => setShowHelp(false)}
                aria-label={lang === 'en' ? 'Close' : '关闭'}
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  width: '32px', height: '32px',
                  background: 'var(--gc-surface)',
                  border: '1px solid var(--gc-rule)',
                  borderRadius: '50%',
                  color: 'var(--gc-muted)',
                  fontSize: '15px', fontWeight: 500,
                  cursor: 'pointer',
                  zIndex: 20,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  lineHeight: 1,
                  transition: 'all 120ms',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--gc-ink)';
                  e.currentTarget.style.color = 'var(--gc-paper)';
                  e.currentTarget.style.borderColor = 'var(--gc-ink)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--gc-surface)';
                  e.currentTarget.style.color = 'var(--gc-muted)';
                  e.currentTarget.style.borderColor = 'var(--gc-rule)';
                }}>
                ✕
              </button>
              {/* Top padding so HelpCenter tabs don't tuck under the × button */}
              <div style={{ paddingTop: '48px' }}>
                <HelpCenter />
              </div>
            </div>
          </div>
        )}
      </div>
    </LanguageContext.Provider>
  );
}
