// Email HTML templates for GCTracker
// All templates use inline styles + table layout for email-client compatibility
// (Gmail/Outlook strip <style> blocks and don't support flexbox/grid).
//
// Imported by subscribe.js. Keep this file pure (no side effects).

// ---- Helpers ----

const escapeHtml = (str) => {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

// Map category/country codes to display labels
const formatCategory = (cat) => {
  if (!cat) return '—';
  const map = {
    'EB1': 'EB-1',
    'EB2': 'EB-2',
    'EB3': 'EB-3',
    'EB4': 'EB-4',
    'EB5': 'EB-5',
    'F1': 'F1',
    'F2A': 'F2A',
    'F2B': 'F2B',
    'F3': 'F3',
    'F4': 'F4',
  };
  return map[cat] || cat;
};

const formatCountry = (country) => {
  if (!country) return '—';
  const map = {
    'CHN': 'China · 中国',
    'IND': 'India · 印度',
    'MEX': 'Mexico · 墨西哥',
    'PHL': 'Philippines · 菲律宾',
    'ROW': 'Rest of World · 其他',
  };
  return map[country] || country;
};

const formatAlerts = (alerts, lang) => {
  if (!alerts || typeof alerts !== 'object') return lang === 'en' ? 'Monthly updates' : '月度更新';
  const labels = lang === 'en'
    ? { whenCurrent: 'When current', whenEligible: 'When eligible to file', monthlyUpdates: 'Monthly updates', retrogression: 'Retrogression alerts' }
    : { whenCurrent: '当前', whenEligible: '可递件', monthlyUpdates: '月度更新', retrogression: '倒退提醒' };
  const enabled = Object.keys(alerts).filter((k) => alerts[k]).map((k) => labels[k]).filter(Boolean);
  if (enabled.length === 0) return lang === 'en' ? 'Monthly updates' : '月度更新';
  return enabled.join(' · ');
};

// Get translated copy for a given language
const getCopy = (lang) => {
  if (lang === 'en') {
    return {
      preheader: 'Your subscription is confirmed. We\'ll watch the bulletin so you don\'t have to.',
      volTag: 'Vol. I · Bulletin',
      brandLineEn: 'Green Card Tracker · Subscriber Confirmation',
      brandTitle: 'Green Card Tracker',
      eyebrow: '— Subscription Confirmed —',
      headline: 'Your priority date is being watched',
      lede: 'Thanks for subscribing. We\'ll email you the moment the State Department releases a new Visa Bulletin and your category moves — so you won\'t miss it.',
      caseHeader: 'Your Case',
      labelCategory: 'Category',
      labelCountry: 'Country of Birth',
      labelPriorityDate: 'Priority Date',
      labelAlerts: 'Alerts',
      stepsHeader: 'What happens next',
      step1: 'Each month between the 8th and 15th, the State Department releases the new Visa Bulletin.',
      step2: 'We scrape it and compare against last month for your specific category.',
      step3: 'If your category moves → we email you with the change and what it means.',
      step4: 'If nothing moves → we stay quiet. You can change settings anytime.',
      ctaButton: 'Open Green Card Tracker →',
      footerWhy: 'You received this because you subscribed at',
      footerUnsub: 'Unsubscribe',
      footerSettings: 'Edit preferences',
      footerSource: 'Data: travel.state.gov',
      footerBrand: 'Green Card Tracker · JMJ · 2026',
    };
  }
  // default zh
  return {
    preheader: '订阅成功。每月排期变化我们会第一时间通知你。',
    volTag: 'Vol. I · Bulletin',
    brandLineEn: 'Green Card Tracker · Subscriber Confirmation',
    brandTitle: '绿卡晴雨表',
    eyebrow: '— 订阅成功 —',
    headline: '你的排期，正在被守望',
    lede: '感谢订阅。我们会在每月 Visa Bulletin 发布、且<em>你的类别</em>出现变化时，第一时间发邮件提醒你 — 不刷小红书也不会错过排期前进或倒退。',
    caseHeader: '你的案子 · Your Case',
    labelCategory: '类别',
    labelCountry: '出生国',
    labelPriorityDate: '优先日',
    labelAlerts: '提醒类型',
    stepsHeader: '接下来 · What happens next',
    step1: '每月 8–15 号，国务院发布最新 Visa Bulletin。',
    step2: '我们抓取数据，对比上月你类别的排期变化。',
    step3: '有变化 → 给你发邮件，内含变化幅度 + 影响分析。',
    step4: '无变化 → 我们不打扰你（你可以在产品里改设置）。',
    ctaButton: '打开绿卡晴雨表 →',
    footerWhy: '你收到这封邮件是因为在',
    footerUnsub: '取消订阅',
    footerSettings: '修改设置',
    footerSource: '数据来源：travel.state.gov',
    footerBrand: 'Green Card Tracker · JMJ · 2026',
  };
};

// ---- Welcome Email Template ----

export const renderWelcomeEmail = ({ email, userCase, alerts, language, siteUrl, unsubscribeUrl }) => {
  const lang = language === 'en' ? 'en' : 'zh';
  const t = getCopy(lang);

  const category = formatCategory(userCase?.category);
  const country = formatCountry(userCase?.country);
  const priorityDate = escapeHtml(userCase?.priorityDate) || '—';
  const alertsLine = formatAlerts(alerts, lang);

  const subject = lang === 'en'
    ? 'Welcome to Green Card Tracker — your priority date is being watched'
    : '欢迎订阅绿卡晴雨表 — 你的排期正在被守望';

  // Plain text version (for clients that don't render HTML, and better deliverability)
  const text = lang === 'en'
    ? `${t.headline}

${t.lede.replace(/<[^>]+>/g, '')}

YOUR CASE
Category: ${category}
Country: ${country}
Priority Date: ${priorityDate}
Alerts: ${alertsLine}

WHAT HAPPENS NEXT
1. Each month (8th–15th), State Department releases the new Visa Bulletin.
2. We scrape it and compare against last month for your category.
3. If your category moves, we email you.
4. If nothing moves, we stay quiet.

Open the app: ${siteUrl}
Unsubscribe: ${unsubscribeUrl}

Green Card Tracker · JMJ · 2026
Data source: travel.state.gov`
    : `${t.headline}

感谢订阅。我们会在每月 Visa Bulletin 发布、且你的类别出现变化时，第一时间发邮件提醒你。

你的案子
类别: ${category}
出生国: ${country}
优先日: ${priorityDate}
提醒: ${alertsLine}

接下来
1. 每月 8–15 号，国务院发布最新 Visa Bulletin。
2. 我们抓取数据，对比上月你类别的排期变化。
3. 有变化 → 给你发邮件。
4. 无变化 → 我们不打扰你。

打开应用: ${siteUrl}
取消订阅: ${unsubscribeUrl}

绿卡晴雨表 · JMJ · 2026
数据来源：travel.state.gov`;

  // HTML version - table-based layout for email client compatibility
  const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>${escapeHtml(subject)}</title>
<style>
  /* Email client resets */
  body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table { border-collapse: collapse; }
  img { border: 0; line-height: 100%; outline: none; text-decoration: none; }
  a { text-decoration: none; }
  /* Dark mode hint - emails respect this */
  @media (prefers-color-scheme: dark) {
    .email-bg { background: #f4f3ee !important; }
  }
  /* Mobile */
  @media only screen and (max-width: 600px) {
    .container { width: 100% !important; }
    .px { padding-left: 24px !important; padding-right: 24px !important; }
    .headline { font-size: 22px !important; }
  }
</style>
</head>
<body class="email-bg" style="margin:0; padding:0; background:#f4f3ee; font-family: Georgia, 'Times New Roman', serif; color:#1a1a1a;">

<!-- Preheader (hidden, shows in inbox preview) -->
<div style="display:none; max-height:0; overflow:hidden; mso-hide:all;">${escapeHtml(t.preheader)}</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f3ee;">
  <tr>
    <td align="center" style="padding:32px 16px;">

      <table role="presentation" class="container" width="560" cellpadding="0" cellspacing="0" border="0" style="width:560px; max-width:560px; background:#fdfcf8; border:1px solid #d4d2c8;">

        <!-- Masthead -->
        <tr>
          <td class="px" style="padding:32px 40px 20px; border-bottom:1px solid #1a1a1a;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-family:Georgia,serif; font-size:22px; font-weight:500; letter-spacing:-0.01em; color:#1a1a1a;">${escapeHtml(t.brandTitle)}</td>
                <td align="right" style="font-family:'Courier New',monospace; font-size:10px; letter-spacing:0.1em; color:#6b6a64; text-transform:uppercase;">${t.volTag}</td>
              </tr>
            </table>
            <div style="font-family:'Courier New',monospace; font-size:10px; letter-spacing:0.1em; color:#6b6a64; text-transform:uppercase; margin-top:4px;">${t.brandLineEn}</div>
          </td>
        </tr>

        <!-- Eyebrow + headline + lede -->
        <tr>
          <td class="px" style="padding:28px 40px 8px;">
            <div style="font-family:'Courier New',monospace; font-size:10px; letter-spacing:0.15em; color:#8b3a3a; text-transform:uppercase; margin-bottom:8px;">${t.eyebrow}</div>
            <div class="headline" style="font-family:Georgia,serif; font-size:26px; line-height:1.25; font-weight:400; letter-spacing:-0.01em; margin-bottom:16px; color:#1a1a1a;">${escapeHtml(t.headline)}</div>
            <div style="font-size:14px; line-height:1.7; color:#2a2a2a;">${t.lede}</div>
          </td>
        </tr>

        <!-- Your case block -->
        <tr>
          <td class="px" style="padding:24px 40px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f3ee; border-left:2px solid #1a1a1a;">
              <tr>
                <td style="padding:16px 18px;">
                  <div style="font-family:'Courier New',monospace; font-size:9px; letter-spacing:0.15em; color:#6b6a64; text-transform:uppercase; margin-bottom:10px;">${escapeHtml(t.caseHeader)}</div>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:13px;">
                    <tr>
                      <td style="padding:3px 0; color:#6b6a64;">${escapeHtml(t.labelCategory)}</td>
                      <td align="right" style="padding:3px 0; font-family:'Courier New',monospace; color:#1a1a1a;">${escapeHtml(category)}</td>
                    </tr>
                    <tr>
                      <td style="padding:3px 0; color:#6b6a64;">${escapeHtml(t.labelCountry)}</td>
                      <td align="right" style="padding:3px 0; font-family:'Courier New',monospace; color:#1a1a1a;">${escapeHtml(country)}</td>
                    </tr>
                    <tr>
                      <td style="padding:3px 0; color:#6b6a64;">${escapeHtml(t.labelPriorityDate)}</td>
                      <td align="right" style="padding:3px 0; font-family:'Courier New',monospace; color:#1a1a1a;">${priorityDate}</td>
                    </tr>
                    <tr>
                      <td style="padding:3px 0; color:#6b6a64;">${escapeHtml(t.labelAlerts)}</td>
                      <td align="right" style="padding:3px 0; font-size:12px; color:#1a1a1a;">${escapeHtml(alertsLine)}</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- What happens next -->
        <tr>
          <td class="px" style="padding:0 40px 8px;">
            <div style="border-top:1px solid #d4d2c8; padding-top:18px;">
              <div style="font-family:'Courier New',monospace; font-size:10px; letter-spacing:0.15em; color:#6b6a64; text-transform:uppercase; margin-bottom:12px;">${escapeHtml(t.stepsHeader)}</div>
              <div style="font-size:13px; line-height:1.75; color:#2a2a2a;">
                <p style="margin:0 0 10px;"><span style="font-family:'Courier New',monospace; font-size:11px; font-weight:500;">01.</span>&nbsp;&nbsp;${escapeHtml(t.step1)}</p>
                <p style="margin:0 0 10px;"><span style="font-family:'Courier New',monospace; font-size:11px; font-weight:500;">02.</span>&nbsp;&nbsp;${escapeHtml(t.step2)}</p>
                <p style="margin:0 0 10px;"><span style="font-family:'Courier New',monospace; font-size:11px; font-weight:500;">03.</span>&nbsp;&nbsp;${escapeHtml(t.step3)}</p>
                <p style="margin:0;"><span style="font-family:'Courier New',monospace; font-size:11px; font-weight:500;">04.</span>&nbsp;&nbsp;${escapeHtml(t.step4)}</p>
              </div>
            </div>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td align="center" class="px" style="padding:24px 40px;">
            <a href="${escapeHtml(siteUrl)}" style="display:inline-block; background:#1a1a1a; color:#fdfcf8; padding:11px 28px; text-decoration:none; font-size:12px; letter-spacing:0.1em; text-transform:uppercase; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${escapeHtml(t.ctaButton)}</a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td align="center" class="px" style="padding:16px 40px 24px; border-top:1px solid #d4d2c8;">
            <div style="font-size:10px; color:#8a8980; line-height:1.7;">
              ${escapeHtml(t.footerWhy)} <a href="${escapeHtml(siteUrl)}" style="color:#6b6a64;">gc.jmjvc.us</a>.<br>
              <a href="${escapeHtml(unsubscribeUrl)}" style="color:#6b6a64;">${escapeHtml(t.footerUnsub)}</a>
              &nbsp;·&nbsp;
              <a href="${escapeHtml(siteUrl)}" style="color:#6b6a64;">${escapeHtml(t.footerSettings)}</a>
              &nbsp;·&nbsp;
              ${escapeHtml(t.footerSource)}
            </div>
            <div style="font-family:'Courier New',monospace; font-size:9px; letter-spacing:0.15em; color:#b0afa6; text-transform:uppercase; margin-top:14px;">${escapeHtml(t.footerBrand)}</div>
          </td>
        </tr>

      </table>

    </td>
  </tr>
</table>

</body>
</html>`;

  return { subject, html, text };
};

// ---- Unsubscribe Confirmation Page (HTML, served by /api/unsubscribe) ----

export const renderUnsubscribePage = ({ email, success, language }) => {
  const lang = language === 'en' ? 'en' : 'zh';

  const titles = {
    zh: { ok: '已取消订阅', fail: '取消订阅失败' },
    en: { ok: 'Unsubscribed', fail: 'Unsubscribe failed' },
  };
  const messages = {
    zh: {
      ok: `${escapeHtml(email)} 已从订阅列表中移除。你不会再收到来自绿卡晴雨表的邮件。`,
      fail: '我们没能完成你的取消订阅请求。请重试，或在产品里手动取消。',
    },
    en: {
      ok: `${escapeHtml(email)} has been removed from our list. You will not receive further emails from Green Card Tracker.`,
      fail: 'We could not complete your unsubscribe request. Please try again or unsubscribe from inside the app.',
    },
  };
  const buttonLabels = { zh: '返回绿卡晴雨表', en: 'Back to Green Card Tracker' };

  const title = success ? titles[lang].ok : titles[lang].fail;
  const message = success ? messages[lang].ok : messages[lang].fail;

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)} · Green Card Tracker</title>
<style>
  body { margin:0; padding:0; background:#f4f3ee; font-family: Georgia, 'Times New Roman', serif; color:#1a1a1a; min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px; }
  .card { background:#fdfcf8; border:1px solid #d4d2c8; max-width:480px; width:100%; padding:40px; }
  .eyebrow { font-family:'Courier New',monospace; font-size:10px; letter-spacing:0.15em; color:${success ? '#6b6a64' : '#8b3a3a'}; text-transform:uppercase; margin-bottom:12px; }
  h1 { font-family:Georgia,serif; font-size:24px; font-weight:400; letter-spacing:-0.01em; margin:0 0 16px; }
  p { font-size:14px; line-height:1.7; color:#2a2a2a; margin:0 0 24px; }
  a.btn { display:inline-block; background:#1a1a1a; color:#fdfcf8; padding:11px 24px; text-decoration:none; font-size:12px; letter-spacing:0.1em; text-transform:uppercase; font-family:-apple-system,sans-serif; }
  .brand { font-family:'Courier New',monospace; font-size:9px; letter-spacing:0.15em; color:#b0afa6; text-transform:uppercase; margin-top:32px; padding-top:16px; border-top:1px solid #d4d2c8; }
</style>
</head>
<body>
<div class="card">
  <div class="eyebrow">— ${success ? (lang === 'en' ? 'Confirmed' : '已确认') : (lang === 'en' ? 'Error' : '出错了')} —</div>
  <h1>${escapeHtml(title)}</h1>
  <p>${message}</p>
  <a class="btn" href="https://gc.jmjvc.us">${escapeHtml(buttonLabels[lang])} →</a>
  <div class="brand">Green Card Tracker · JMJ · 2026</div>
</div>
</body>
</html>`;
};

// ---- Monthly Bulletin Update Email ----
// Sent when a new Visa Bulletin is scraped and a confirmed subscriber's own
// category/country moved (advanced, retrogressed, or became current). Personalized
// per-case: shows this month's Final Action + Filing Date movement for the subscriber's
// exact case, and (when still not current) a hybrid-model ETA to their priority date.
// `update` is the shape returned by computeCaseUpdate() in scripts/lib/gcMath.mjs.

// Cutoff dates render as raw YYYY-MM-DD in monospace — short, alignment-stable,
// and consistent with how the priority date is shown. Only C/U get words.
const formatDateForLang = (s, lang) => {
  if (!s || s === 'U') return lang === 'en' ? 'N/A' : '无';
  if (s === 'C') return lang === 'en' ? 'Current' : '无排期';
  return s;
};

const formatMonthsForLang = (months, lang) => {
  if (months === null || months === undefined) return lang === 'en' ? 'beyond our forecast horizon' : '超出预测范围';
  if (months <= 0) return lang === 'en' ? 'already current' : '已经排到';
  const years = months / 12;
  if (lang === 'en') {
    return years >= 1.5
      ? `about ${years.toFixed(1)} years (${Math.round(months)} months)`
      : `about ${Math.round(months)} months`;
  }
  return years >= 1.5
    ? `约 ${years.toFixed(1)} 年（${Math.round(months)} 个月）`
    : `约 ${Math.round(months)} 个月`;
};

// Bare form for the two ends of a range, where a repeated "about" reads as noise.
const formatMonthsCompact = (months, lang) => {
  if (months === null || months === undefined) return lang === 'en' ? '10+ yrs' : '10 年以上';
  if (months <= 0) return lang === 'en' ? 'now' : '已排到';
  const years = months / 12;
  if (years >= 1.5) return lang === 'en' ? `${years.toFixed(1)} yrs` : `${years.toFixed(1)} 年`;
  return lang === 'en' ? `${Math.round(months)} mo` : `${Math.round(months)} 个月`;
};

const movementCopy = (movement, lang) => {
  const t = {
    zh: { advanced: '前进', retrogressed: '倒退', current: '变为无排期（Current）', none: '无变化' },
    en: { advanced: 'advanced', retrogressed: 'retrogressed', current: 'became Current', none: 'no change' },
  }[lang];
  if (movement.type === 'advanced') return lang === 'en' ? `advanced ${movement.days} days` : `前进 ${movement.days} 天`;
  if (movement.type === 'retrogressed') return lang === 'en' ? `retrogressed ${movement.days ?? ''} days`.trim() : `倒退 ${movement.days ?? ''} 天`.trim();
  if (movement.type === 'current') return t.current;
  return t.none;
};

// Monthly-movement column chart, drawn with table cells and background colors.
// Deliberately not SVG or a hosted PNG: Gmail strips inline <svg>, Outlook's Word
// renderer never supported it, and remote images are blocked by default in several
// clients — a background-color <div> inside a <td> is the one thing that renders
// everywhere. No hover layer exists because email has no JS, so every fact the
// tooltip would carry is either direct-labeled or stated in the caption below.
//
// Colors are the CVD-validated pair (#0d7cb5 / #c1571f, ΔE 20.8 under protanopia);
// a red/green pair fails at ΔE 2.0. Bar direction and the signed label carry the
// same distinction, so color is never the sole encoder.
const ADVANCE_COLOR = '#0d7cb5';
const RETROGRESS_COLOR = '#c1571f';
const ZERO_COLOR = '#d4d2c8';

const renderMovementChart = (series, lang) => {
  if (!Array.isArray(series) || series.length < 2) return '';

  const CHART_PX = 44;
  const maxAbs = Math.max(...series.map((s) => Math.abs(s.days)), 1);
  const peakIdx = series.reduce((best, s, i) => (Math.abs(s.days) > Math.abs(series[best].days) ? i : best), 0);

  // Year included: the window spans a year boundary, so a bare "9月 … 8月" reads as
  // though both ticks sit in the same year.
  const shortMonth = (m) => {
    const [y, mo] = m.split('-');
    return lang === 'en' ? `${mo}/${y.slice(2)}` : `${y.slice(2)}年${parseInt(mo, 10)}月`;
  };

  // Only the peak is direct-labeled — a number over every column is noise.
  const labelRow = series.map((s, i) => {
    const txt = i === peakIdx ? `${s.days > 0 ? '+' : ''}${Math.round(s.days)}` : '';
    return `<td align="center" style="padding:0 1px; font-family:'Courier New',monospace; font-size:9px; color:#6b6a64; white-space:nowrap;">${txt}</td>`;
  }).join('');

  const barRow = series.map((s) => {
    const zero = Math.round(s.days) === 0;
    const h = zero ? 2 : Math.max(3, Math.round((Math.abs(s.days) / maxAbs) * CHART_PX));
    const color = zero ? ZERO_COLOR : (s.days > 0 ? ADVANCE_COLOR : RETROGRESS_COLOR);
    return `<td valign="bottom" height="${CHART_PX}" style="padding:0 1px; height:${CHART_PX}px;"><div style="height:${h}px; line-height:${h}px; font-size:0; background:${color};">&nbsp;</div></td>`;
  }).join('');

  const tickRow = series.map((s, i) => {
    const show = i === 0 || i === series.length - 1;
    return `<td align="center" style="padding:4px 1px 0; border-top:1px solid #d4d2c8; font-family:'Courier New',monospace; font-size:9px; color:#8a8980; white-space:nowrap;">${show ? shortMonth(s.month) : ''}</td>`;
  }).join('');

  const stalled = series.filter((s) => Math.round(s.days) === 0).length;
  const caption = lang === 'en'
    ? `Monthly advance over the last ${series.length} months — ${stalled} of them moved 0 days.`
    : `过去 ${series.length} 个月每月推进天数——其中 ${stalled} 个月是 0 天。`;

  return `
    <div style="font-family:'Courier New',monospace; font-size:10px; letter-spacing:0.15em; color:#6b6a64; text-transform:uppercase; margin-bottom:10px;">${lang === 'en' ? 'Pace, month by month' : '逐月推进'}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="table-layout:fixed;">
      <tr>${labelRow}</tr>
      <tr>${barRow}</tr>
      <tr>${tickRow}</tr>
    </table>
    <div style="font-size:11px; line-height:1.6; color:#8a8980; margin-top:8px;">${escapeHtml(caption)}</div>`;
};

// App.jsx reads the case off the query string (c/ct/pd/in/ps) and — importantly —
// treats a URL case as "already onboarded", so this link lands the subscriber on their
// own numbers instead of the first-run category picker.
const buildCaseUrl = (siteUrl, userCase) => {
  const base = String(siteUrl || '').replace(/\/+$/, '');
  if (!userCase?.category || !userCase?.country || !userCase?.priorityDate) return base;
  const p = new URLSearchParams();
  p.set('c', userCase.category);
  p.set('ct', userCase.country);
  p.set('pd', userCase.priorityDate);
  if (userCase.inUS === false) p.set('in', '0');
  if (userCase.petitionerStatus) p.set('ps', userCase.petitionerStatus);
  return `${base}/?${p.toString()}`;
};

export const renderMonthlyUpdateEmail = ({ email, userCase, update, uscisChart, bulletinMonthLabel, language, siteUrl, unsubscribeUrl }) => {
  const lang = language === 'en' ? 'en' : 'zh';
  const caseUrl = buildCaseUrl(siteUrl, userCase);

  const category = formatCategory(userCase?.category);
  const country = formatCountry(userCase?.country);
  const priorityDate = escapeHtml(userCase?.priorityDate) || '—';

  const fa = update.finalAction;
  const fil = update.filing;
  const isNowCurrent = fa.status?.status === 'current' || fa.status?.status === 'eligible' || fa.status?.status === 'overdue';

  const headline = isNowCurrent
    ? (lang === 'en' ? 'Your priority date is current' : '你的优先日已经排到了')
    : fa.movement.type === 'advanced'
      ? (lang === 'en'
          ? `Your category advanced ${fa.movement.days} days this month`
          : `本月你的类别前进了 ${fa.movement.days} 天`)
      : fa.movement.type === 'retrogressed'
        ? (lang === 'en' ? 'Your category retrogressed this month' : '本月你的类别出现倒退')
        : (lang === 'en' ? 'No movement in your category this month' : '本月你的类别没有变化');

  const subject = lang === 'en'
    ? `Visa Bulletin ${bulletinMonthLabel}: ${headline}`
    : `Visa Bulletin ${bulletinMonthLabel} 更新：${headline}`;

  // A range, not a point estimate. The two ends are both computed straight from real
  // movement — "this month's pace" and "the trailing 12-month average pace" — because
  // for slow categories a single fast month makes a point estimate wildly optimistic.
  const fc = !isNowCurrent && update.forecast ? update.forecast : null;
  const hasRange = fc && fc.windowMean !== null && Math.round(fc.fastRate) !== Math.round(fc.slowRate);

  const rangeHeadline = fc
    ? (hasRange
        ? `${formatMonthsCompact(fc.fastMonths, lang)} – ${formatMonthsCompact(fc.slowMonths, lang)}`
        : formatMonthsCompact(fc.fastMonths, lang))
    : '';

  const rangeDetail = !fc ? '' : hasRange
    ? (lang === 'en'
        ? `The fast end assumes this month's pace holds (${Math.round(fc.fastRate)} days/month). The slow end uses the average pace actually delivered over the last ${fc.windowSize} months (${Math.round(fc.slowRate)} days/month).`
        : `快的一端假设本月这个速度能保持（${Math.round(fc.fastRate)} 天/月），慢的一端用的是过去 ${fc.windowSize} 个月实际平均速度（${Math.round(fc.slowRate)} 天/月）。`)
    : (lang === 'en'
        ? `Based on a pace of ${Math.round(fc.fastRate)} days/month.`
        : `按每月推进 ${Math.round(fc.fastRate)} 天估算。`);

  const etaLine = rangeDetail;
  const chartHtml = renderMovementChart(fc?.series, lang);

  // "表 A / 表 B" mirrors the bulletin's own section lettering (A. FINAL ACTION DATES,
  // B. DATES FOR FILING) and is what Chinese-language immigration discussion uses.
  // The English chart names stay in place per the repo convention of keeping domain
  // terms in the original.
  const rows = [
    {
      label: lang === 'en' ? 'Chart A · Final Action Dates' : '表 A · Final Action Dates',
      prev: formatDateForLang(fa.previous, lang),
      cur: formatDateForLang(fa.current, lang),
      move: movementCopy(fa.movement, lang),
    },
    {
      label: lang === 'en' ? 'Chart B · Dates for Filing' : '表 B · Dates for Filing',
      prev: formatDateForLang(fil.previous, lang),
      cur: formatDateForLang(fil.current, lang),
      move: movementCopy(fil.movement, lang),
    },
  ];

  // Deliberately one short line: the chart names already appear in the row labels
  // directly above, so repeating them here only pushed the note into a wrapped block.
  // When the scraped USCIS designation covers this bulletin month, the note upgrades
  // from the generic explainer to the definitive answer for this subscriber's category.
  let chartNote = lang === 'en'
    ? 'Chart A decides approval · Chart B decides filing'
    : '表 A 决定能否获批，表 B 决定能否递件';
  const chartKindForCase = userCase?.category?.startsWith('EB') ? uscisChart?.employment : uscisChart?.family;
  if (chartKindForCase === 'filing' || chartKindForCase === 'finalAction') {
    const chartName = chartKindForCase === 'filing' ? (lang === 'en' ? 'Chart B' : '表 B') : (lang === 'en' ? 'Chart A' : '表 A');
    chartNote = lang === 'en'
      ? `USCIS: file I-485 this month using ${chartName}`
      : `本月递交 I-485 用${chartName}（USCIS 判定）`;
  }

  const text = [
    headline,
    '',
    lang === 'en' ? 'YOUR CASE' : '你的案子',
    `${lang === 'en' ? 'Category' : '类别'}: ${category}`,
    `${lang === 'en' ? 'Country' : '出生国'}: ${country}`,
    `${lang === 'en' ? 'Priority Date' : '优先日'}: ${priorityDate}`,
    '',
    lang === 'en' ? 'THIS MONTH' : '本月变化',
    ...rows.map((r) => `${r.label}: ${r.prev} -> ${r.cur} (${r.move})`),
    '',
    chartNote,
    '',
    rangeHeadline ? `${lang === 'en' ? 'ESTIMATED WAIT' : '预计还要等'}: ${rangeHeadline}` : '',
    etaLine,
    '',
    `${lang === 'en' ? 'Open the app' : '打开应用'}: ${siteUrl}`,
    `${lang === 'en' ? 'Unsubscribe' : '取消订阅'}: ${unsubscribeUrl}`,
  ].filter((l) => l !== '' || true).join('\n');

  // Each table gets a stacked two-line block instead of four squeezed columns:
  // line 1 = table name (left) + movement (right), line 2 = old → new in monospace.
  // Dates never wrap this way, regardless of client width.
  const rowsHtml = rows.map((r) => `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #e4e1d6;">
      <tr>
        <td colspan="2" style="padding:10px 0 2px; font-family:'Courier New',monospace; font-size:10px; letter-spacing:0.1em; color:#6b6a64; text-transform:uppercase;">${escapeHtml(r.label)}</td>
      </tr>
      <tr>
        <td style="padding:0 0 10px; font-family:'Courier New',monospace; font-size:13px; color:#1a1a1a; white-space:nowrap;">${
          r.prev === r.cur
            ? `<b>${r.cur}</b>`
            : `<span style="color:#8a8980; text-decoration:line-through;">${r.prev}</span><span style="color:#8a8980;">&nbsp;→&nbsp;</span><b>${r.cur}</b>`
        }</td>
        <td align="right" style="padding:0 0 10px 16px; font-size:12px; color:#0e4d2e; white-space:nowrap;">${escapeHtml(r.move)}</td>
      </tr>
    </table>`).join('');

  const html = `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>${escapeHtml(subject)}</title>
<style>
  body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table { border-collapse: collapse; }
  a { text-decoration: none; }
  @media only screen and (max-width: 600px) {
    .container { width: 100% !important; }
    .px { padding-left: 24px !important; padding-right: 24px !important; }
    .headline { font-size: 22px !important; }
  }
</style>
</head>
<body style="margin:0; padding:0; background:#f4f3ee; font-family: Georgia, 'Times New Roman', serif; color:#1a1a1a;">

<div style="display:none; max-height:0; overflow:hidden; mso-hide:all;">${escapeHtml(headline)}</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f3ee;">
  <tr>
    <td align="center" style="padding:32px 16px;">

      <table role="presentation" class="container" width="560" cellpadding="0" cellspacing="0" border="0" style="width:560px; max-width:560px; background:#fdfcf8; border:1px solid #d4d2c8;">

        <tr>
          <td class="px" style="padding:32px 40px 20px; border-bottom:1px solid #1a1a1a;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="font-family:Georgia,serif; font-size:22px; font-weight:500; letter-spacing:-0.01em; color:#1a1a1a;">${lang === 'en' ? 'Green Card Tracker' : '绿卡晴雨表'}</td>
                <td align="right" style="font-family:'Courier New',monospace; font-size:10px; letter-spacing:0.1em; color:#6b6a64; text-transform:uppercase;">${escapeHtml(bulletinMonthLabel)}</td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td class="px" style="padding:28px 40px 8px;">
            <div style="font-family:'Courier New',monospace; font-size:10px; letter-spacing:0.15em; color:#8b3a3a; text-transform:uppercase; margin-bottom:8px;">${lang === 'en' ? '— Bulletin Update —' : '— 排期更新 —'}</div>
            <div class="headline" style="font-family:Georgia,serif; font-size:26px; line-height:1.3; font-weight:400; letter-spacing:-0.01em; margin-bottom:6px; color:#1a1a1a;">${escapeHtml(headline)}</div>
          </td>
        </tr>

        <tr>
          <td class="px" style="padding:12px 40px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f3ee; border-left:2px solid #1a1a1a;">
              <tr>
                <td style="padding:16px 18px;">
                  <div style="font-family:'Courier New',monospace; font-size:9px; letter-spacing:0.15em; color:#6b6a64; text-transform:uppercase; margin-bottom:10px;">${lang === 'en' ? 'Your Case' : '你的案子'}</div>
                  <div style="font-family:'Courier New',monospace; font-size:16px; font-weight:700; color:#1a1a1a; letter-spacing:0.02em;">${escapeHtml(category)} · ${escapeHtml(country)}</div>
                  <div style="font-size:12px; color:#6b6a64; margin:3px 0 14px;">${lang === 'en' ? 'Priority Date' : '优先日'}&nbsp;&nbsp;<span style="font-family:'Courier New',monospace; font-size:13px; color:#1a1a1a;">${priorityDate}</span></div>
                  ${rowsHtml}
                  <div style="border-top:1px solid #e4e1d6; padding-top:9px; font-size:11px; line-height:1.5; color:#8a8980;">${escapeHtml(chartNote)}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        ${etaLine ? `
        <tr>
          <td class="px" style="padding:20px 40px 8px;">
            <div style="border-top:1px solid #d4d2c8; padding-top:16px;">
              <div style="font-family:'Courier New',monospace; font-size:10px; letter-spacing:0.15em; color:#6b6a64; text-transform:uppercase; margin-bottom:8px;">${lang === 'en' ? 'Estimated Wait' : '预计还要等'}</div>
              <div style="font-family:Georgia,serif; font-size:24px; line-height:1.2; color:#1a1a1a; margin-bottom:8px;">${escapeHtml(rangeHeadline)}</div>
              <div style="font-size:12px; line-height:1.7; color:#2a2a2a;">${escapeHtml(etaLine)}</div>
              <div style="font-size:11px; line-height:1.6; color:#8a8980; margin-top:8px;">${lang === 'en'
                ? 'A model estimate from historical pace, not a guarantee — the bulletin can speed up, slow down, or retrogress.'
                : '基于历史速度的模型估算，不是承诺——排期可能加速、放缓，也可能倒退。'}</div>
            </div>
          </td>
        </tr>` : ''}

        ${chartHtml ? `
        <tr>
          <td class="px" style="padding:16px 40px 8px;">
            <div style="border-top:1px solid #d4d2c8; padding-top:16px;">${chartHtml}</div>
          </td>
        </tr>` : ''}

        <tr>
          <td align="center" class="px" style="padding:24px 40px;">
            <a href="${escapeHtml(caseUrl)}" style="display:inline-block; background:#1a1a1a; color:#fdfcf8; padding:11px 28px; text-decoration:none; font-size:12px; letter-spacing:0.1em; text-transform:uppercase; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${lang === 'en' ? 'Open Green Card Tracker →' : '打开绿卡晴雨表 →'}</a>
          </td>
        </tr>

        <tr>
          <td align="center" class="px" style="padding:16px 40px 24px; border-top:1px solid #d4d2c8;">
            <div style="font-size:10px; color:#8a8980; line-height:1.7;">
              <a href="${escapeHtml(unsubscribeUrl)}" style="color:#6b6a64;">${lang === 'en' ? 'Unsubscribe' : '取消订阅'}</a>
              &nbsp;·&nbsp;
              <a href="${escapeHtml(caseUrl)}" style="color:#6b6a64;">${lang === 'en' ? 'Edit case / preferences' : '修改优先日或设置'}</a>
              &nbsp;·&nbsp;
              ${lang === 'en' ? 'Data: travel.state.gov' : '数据来源：travel.state.gov'}
            </div>
            <div style="font-family:'Courier New',monospace; font-size:9px; letter-spacing:0.15em; color:#b0afa6; text-transform:uppercase; margin-top:14px;">Green Card Tracker · JMJ · 2026</div>
          </td>
        </tr>

      </table>

    </td>
  </tr>
</table>

</body>
</html>`;

  return { subject, html, text };
};

// ---- Confirmation Email (double opt-in) ----
// Sent on the FIRST subscribe request. Nothing is treated as an active subscription
// until the recipient clicks through, so a third party cannot sign someone else up
// and cannot make this domain send unsolicited mail on their behalf.
// Deliberately self-contained: it must render even if getCopy() changes shape.

export const renderConfirmEmail = ({ email, language, siteUrl, confirmUrl }) => {
  const lang = language === 'en' ? 'en' : language === 'tw' ? 'tw' : 'zh';

  const c = {
    en: {
      subject: 'Confirm your Green Card Tracker subscription',
      preheader: 'One click and you are set — we will watch the bulletin for you.',
      eyebrow: '— Confirm Subscription —',
      title: 'Almost there',
      body: 'Someone (hopefully you) asked to receive visa bulletin updates at this address. Click below to confirm and start receiving them.',
      cta: 'Confirm subscription',
      ignore: 'If this was not you, simply ignore this email. Nothing was subscribed and you will not hear from us again.',
      fallback: 'Button not working? Paste this link into your browser:',
      brand: 'Green Card Tracker',
    },
    zh: {
      subject: '确认订阅绿卡排期追踪',
      preheader: '点一下就好——之后排期更新我们替你盯着。',
      eyebrow: '— 确认订阅 —',
      title: '还差一步',
      body: '有人（希望是你本人）用这个邮箱申请订阅签证公告排期更新。点击下面的按钮确认，之后就会开始收到更新。',
      cta: '确认订阅',
      ignore: '如果这不是你本人操作，直接忽略这封邮件即可。订阅不会生效，我们也不会再打扰你。',
      fallback: '按钮点不动？把这个链接粘到浏览器里：',
      brand: '绿卡晴雨表',
    },
    tw: {
      subject: '確認訂閱綠卡排期追蹤',
      preheader: '點一下就好——之後排期更新我們替你盯著。',
      eyebrow: '— 確認訂閱 —',
      title: '還差一步',
      body: '有人（希望是你本人）用這個信箱申請訂閱簽證公告排期更新。點擊下面的按鈕確認，之後就會開始收到更新。',
      cta: '確認訂閱',
      ignore: '如果這不是你本人操作，直接忽略這封郵件即可。訂閱不會生效，我們也不會再打擾你。',
      fallback: '按鈕點不動？把這個連結貼到瀏覽器裡：',
      brand: '綠卡晴雨表',
    },
  }[lang];

  const safeUrl = escapeHtml(confirmUrl);

  const html = `<!DOCTYPE html>
<html lang="${lang === 'en' ? 'en' : 'zh'}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f1ea;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(c.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ea;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #e4dfd3;border-radius:10px;">
        <tr><td style="padding:32px 32px 8px;text-align:center;font-family:Georgia,'Times New Roman',serif;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#0e4d2e;">
          ${escapeHtml(c.eyebrow)}
        </td></tr>
        <tr><td style="padding:4px 32px 0;text-align:center;font-family:Georgia,'Times New Roman',serif;font-size:26px;color:#111418;">
          ${escapeHtml(c.title)}
        </td></tr>
        <tr><td style="padding:16px 32px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.7;color:#414852;">
          ${escapeHtml(c.body)}
        </td></tr>
        <tr><td align="center" style="padding:26px 32px 6px;">
          <a href="${safeUrl}" style="display:inline-block;background:#0e4d2e;color:#ffffff;text-decoration:none;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;font-weight:600;padding:13px 30px;border-radius:6px;">${escapeHtml(c.cta)}</a>
        </td></tr>
        <tr><td style="padding:18px 32px 0;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:11px;line-height:1.6;color:#8a9099;">
          ${escapeHtml(c.fallback)}<br>
          <span style="word-break:break-all;color:#0e4d2e;">${safeUrl}</span>
        </td></tr>
        <tr><td style="padding:18px 32px 30px;border-top:1px solid #efeae0;margin-top:12px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:11px;line-height:1.6;color:#8a9099;">
          ${escapeHtml(c.ignore)}
        </td></tr>
      </table>
      <div style="padding:14px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:11px;color:#8a9099;">
        ${escapeHtml(c.brand)} · <a href="${escapeHtml(siteUrl)}" style="color:#8a9099;">${escapeHtml(siteUrl)}</a>
      </div>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    c.title,
    '',
    c.body,
    '',
    `${c.cta}: ${confirmUrl}`,
    '',
    c.ignore,
    '',
    `${c.brand} · ${siteUrl}`,
  ].join('\n');

  return { subject: c.subject, html, text };
};
