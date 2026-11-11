// UI-23 code split: DataStatusChecker + DataSource + FAQ + Glossary + HelpCenter, lazy chunk for the help tab.
// Extracted verbatim from App.jsx; shared helpers stay in App.jsx (imported
// below) or in functions/api/_gcMath.js. Loaded lazily by App.jsx per tab.
import React, { useState } from 'react';
import { Globe, Calendar, Briefcase, TrendingDown, AlertCircle, AlertTriangle, CheckCircle2, Clock, Info, FileText, Zap, Shield, Users, Target, Database, RefreshCw, ExternalLink, Sparkles, BarChart3, Mail, DollarSign, Scale, Plane, ClipboardList } from 'lucide-react';
import { useLang, BULLETIN_CURRENT_MONTH } from './App.jsx';
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
// Which signup-time fields this case is still missing. There are three subscribe
// entry points (SmartAlerts, InlineSubscribeCTA, SubscribeModal) and only the modal
// ever asked for these — the other two POSTed userCase raw, so anyone arriving on a
// ?c=&ct=&pd= link (which skips onboarding entirely, see parseUserCaseFromURL) could
// subscribe with no birth month at all. 2026-08-15: 1 of 82 records had one.
// Single source of truth so the three paths can't drift apart again.
// ============================================================

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
// 被污染存储的自愈：此前 userCase 持久化不看 hasOnboarded，把内置默认种子
// （Taiwan EB3 2024-07-15，无生日无身份）写进了访客的 localStorage，刷新后访客
// 被当成老用户直接放进个人页。启动时发现是种子就整套清掉，当没填过。
// 注意（UI-28 后）：快速开始的真案子同样可以无生日无身份，判定种子必须再加
// 「没有 subtype/proxy 键」——向导落盘的案子恒带这两键，种子对象没有。
if (typeof window !== 'undefined') {
  try {
    const _raw = window.localStorage.getItem('gc_userCase');
    if (_raw) {
      const _c = JSON.parse(_raw);
      if (_c && _c.country === 'Taiwan' && _c.category === 'EB3' && _c.priorityDate === '2024-07-15'
          && !_c.birthYearMonth && !_c.role
          // UI-28 后「无生日无身份」不再等于种子：快速开始的真案子也长这样。
          // 区分靠键的存在——向导落盘的案子恒带 subtype/proxy 键（可为 null），
          // 当年被无条件持久化写下的种子对象没有这两个键。
          && _c.subtype === undefined && _c.proxy === undefined) {
        window.localStorage.removeItem('gc_userCase');
        window.localStorage.removeItem('gc_hasOnboarded');
      }
    }
  } catch (e) { /* noop */ }
}


export default HelpCenter;
