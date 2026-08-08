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

// Shared <head> for every outgoing email. One copy so client fixes (color-scheme
// pinning, mobile padding, headline scaling) land in all templates at once — the
// per-template copies had already drifted (color-scheme existed in only one).
const emailHead = (subject) => `<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(subject)}</title>
<style>
  :root { color-scheme: light; supported-color-schemes: light; }
  body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table { border-collapse: collapse; }
  img { border: 0; line-height: 100%; outline: none; text-decoration: none; }
  a { text-decoration: none; }
  @media only screen and (max-width: 600px) {
    .container { width: 100% !important; }
    .px { padding-left: 24px !important; padding-right: 24px !important; }
    .headline { font-size: 22px !important; }
  }
</style>
</head>`;

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
  // Subscriber records store the App's own country strings ('China', 'Taiwan', …) —
  // 'Taiwan' is the App's key for the ROW/HK/TW/Macao pool, so it must NOT display as
  // bare "Taiwan". The 3-letter codes are kept as aliases for any legacy record.
  const map = {
    'China': 'China · 中国', 'CHN': 'China · 中国',
    'India': 'India · 印度', 'IND': 'India · 印度',
    'Mexico': 'Mexico · 墨西哥', 'MEX': 'Mexico · 墨西哥',
    'Philippines': 'Philippines · 菲律宾', 'PHL': 'Philippines · 菲律宾',
    'Taiwan': 'ROW · 全球/港澳台', 'ROW': 'ROW · 全球/港澳台',
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
      // Mid-month, not "8th–15th": Wayback snapshots of every recent bulletin put the
      // real release days at the 12th–22nd (that's also why the scraper watches 10–23).
      step1: 'Each month around mid-month (roughly the 12th–22nd), the State Department releases the new Visa Bulletin.',
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
    lede: '感谢订阅。我们会在每月 Visa Bulletin 发布、且<b>你的类别</b>出现变化时，第一时间发邮件提醒你 — 不刷小红书也不会错过排期前进或倒退。',
    caseHeader: '你的案子 · Your Case',
    labelCategory: '类别',
    labelCountry: '出生国',
    labelPriorityDate: '优先日',
    labelAlerts: '提醒类型',
    stepsHeader: '接下来 · What happens next',
    step1: '每月中旬（约 12–22 号），国务院发布最新 Visa Bulletin。',
    step2: '我们抓取数据，对比上月你类别的排期变化。',
    step3: '有变化 → 给你发邮件，内含变化幅度 + 影响分析。',
    step4: '无变化 → 我们不打扰你（你可以在产品里改设置）。',
    ctaButton: '打开绿卡晴雨表 →',
    footerWhy: '你收到这封邮件，是因为你订阅了排期提醒，订阅地址：',
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
  // Same deep link the monthly email uses — lands the subscriber on their own case,
  // not the first-run picker.
  const caseUrl = buildCaseUrl(siteUrl, userCase);

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
1. Each month around mid-month (roughly the 12th-22nd), State Department releases the new Visa Bulletin.
2. We scrape it and compare against last month for your category.
3. If your category moves, we email you.
4. If nothing moves, we stay quiet.

Open the app: ${caseUrl}
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
1. 每月中旬（约 12–22 号），国务院发布最新 Visa Bulletin。
2. 我们抓取数据，对比上月你类别的排期变化。
3. 有变化 → 给你发邮件。
4. 无变化 → 我们不打扰你。

打开应用: ${caseUrl}
取消订阅: ${unsubscribeUrl}

绿卡晴雨表 · JMJ · 2026
数据来源：travel.state.gov`;

  // HTML version - table-based layout for email client compatibility
  const html = `<!DOCTYPE html>
<html lang="${lang}">
${emailHead(subject)}
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
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PANEL_BG}; border:1px solid ${PANEL_BORDER}; border-left:2px solid #1a1a1a;">
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
                      <td align="right" style="padding:3px 0; font-family:'Courier New',monospace; color:#1a1a1a;">${escapeHtml(country)}${countryFlagHtml(userCase?.country)}</td>
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
            <a href="${escapeHtml(caseUrl)}" style="display:inline-block; background:#1a1a1a; color:#fdfcf8; padding:11px 28px; text-decoration:none; font-size:12px; letter-spacing:0.1em; text-transform:uppercase; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${escapeHtml(t.ctaButton)}</a>
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
const TREND_FILL = '#cfe3ef'; // light tint of ADVANCE_COLOR for the trend chart's area
// Cumulative-total green. Validated with the pair above in true adjacency order
// (rust↔blue↔green): worst pair ΔE 17.4 under deutan. Rust and green never touch —
// retrogression hangs below the baseline, the cumulative column sits behind a divider.
const CUMULATIVE_COLOR = '#0e6b3e';
// Chart panel surface — the tinted card the charts sit on. Stacked-segment gaps and
// mark spacers must use this, not the page background, or gaps read as stray lines.
const PANEL_BG = '#f7f5ee';
const PANEL_BORDER = '#e4e1d6';

// Flat rectangular flags mirroring the site's CountryFlag SVGs — NOT emoji (the user
// wants the site's crisp non-waving flags, and emoji flags render as waving art on iOS
// and as bare letter pairs on Windows). SVG dies in Gmail, so these are the same
// background-color-block technique as the charts: stacked/joined divs, 21×14px, 1px
// outline so white stripes survive the cream surface. Outlook's Word engine can't do
// inline-block, so the whole flag is wrapped in a non-mso conditional — Outlook simply
// shows no flag rather than a broken one.
const countryFlagHtml = (country) => {
  const W = 21, H = 14;
  const box = (inner, w = W, h = H, extra = '') =>
    `<div style="display:inline-block; vertical-align:-2px; width:${w}px; height:${h}px; font-size:0; line-height:0; border:1px solid rgba(26,26,26,0.25); overflow:hidden;${extra}">${inner}</div>`;
  const hStripes = (colors, hs) => colors.map((c, i) =>
    `<div style="width:${W}px; height:${hs[i]}px; font-size:0; line-height:0; background:${c};"></div>`).join('');
  const vStripes = (colors, ws) => colors.map((c, i) =>
    `<div style="display:inline-block; width:${ws[i]}px; height:${H}px; font-size:0; line-height:0; background:${c};"></div>`).join('');
  const flags = {
    China: box(`<div style="width:${W}px; height:${H}px; background:#DE2910; text-align:left;"><span style="display:inline-block; margin:0 0 0 2px; font-size:9px; line-height:${H}px; color:#FFDE00;">★</span></div>`),
    India: box(hStripes(['#FF9933', '#ffffff', '#138808'], [5, 4, 5])),
    Mexico: box(vStripes(['#006847', '#ffffff', '#CE1126'], [7, 7, 7])),
    Philippines: box(
      `<div style="display:inline-block; width:6px; height:${H}px; font-size:0; line-height:0; background:#ffffff;"></div>`
      + `<div style="display:inline-block; width:${W - 6}px; height:${H}px; font-size:0; line-height:0; vertical-align:top;">${hStripes(['#0038A8', '#CE1126'], [7, 7]).replace(new RegExp(`width:${W}px`, 'g'), `width:${W - 6}px`)}</div>`),
    // The site shows its blue globe for the ROW pool; a bordered blue disc is the
    // closest email-safe stand-in.
    Taiwan: `<div style="display:inline-block; vertical-align:-2px; width:12px; height:12px; font-size:0; line-height:0; background:#3b82f6; border:1px solid #1e40af; border-radius:50%;"></div>`,
  };
  const f = flags[country];
  return f ? `<!--[if !mso]><!-->&nbsp;${f}<!--<![endif]-->` : '';
};

// Monthly columns + one separated cumulative column, mirroring the site's in-app
// chart. Fed the 12-month series (not 24) so every column is wide enough to carry its
// value on ONE aligned row — no staggering. The monthly side and the total column are
// scaled INDEPENDENTLY (the total would otherwise flatten every monthly bar to a
// sliver); the divider, the distinct zone tint, and the per-mark numbers make the two
// scales explicit. Below the axis, a bracket annotates the window's dominant streak
// ("6 months in a row at 0 days") so the rhythm is readable at a glance.
const renderMovementChart = (series, lang) => {
  if (!Array.isArray(series) || series.length < 2) return '';

  const UP_PX = 64;
  const days = (s) => (typeof s.days === 'number' ? Math.round(s.days) : 0);
  const total = series.reduce((sum, s) => sum + days(s), 0);
  const maxUp = Math.max(...series.map((s) => Math.max(days(s), 0)), 0);
  const maxDown = Math.max(...series.map((s) => Math.max(-days(s), 0)), 0);
  const hasNeg = maxDown > 0;
  const perDay = UP_PX / Math.max(maxUp, maxDown, 1);
  const DOWN_PX = hasNeg ? Math.max(Math.ceil(maxDown * perDay), 4) : 0;

  const shortMonth = (m) => {
    const [y, mo] = m.split('-');
    return lang === 'en' ? `${mo}/${y.slice(2)}` : `${y.slice(2)}年${parseInt(mo, 10)}月`;
  };

  const labelStyle = "font-family:'Courier New',monospace; font-size:9px; color:#6b6a64; white-space:nowrap;";
  const CUM_BG = '#eceadf'; // the total column's zone — a step off the panel, marking its own scale
  const dividerTd = (extra = '') => `<td width="10" style="width:10px; border-right:1px solid #d4d2c8;${extra}">&nbsp;</td>`;
  const cumTd = (inner, extra = '') => `<td width="34" align="center" style="width:34px; background:${CUM_BG};${extra}">${inner}</td>`;

  // Row 1 — every non-zero value on one row, centered over its column. Twelve columns
  // at ~34px each fit three digits with air; no staggering, nothing to misalign.
  const topLabelRow = series.map((s) => {
    const d = days(s);
    return `<td align="center" valign="bottom" style="padding:0 1px 2px; ${labelStyle}">${d > 0 ? d : ''}</td>`;
  }).join('')
    + dividerTd()
    + cumTd(`<span style="font-family:'Courier New',monospace; font-size:9px; font-weight:bold; color:${CUMULATIVE_COLOR}; white-space:nowrap;">${total >= 0 ? '+' : '−'}${Math.abs(total)}</span>`, ' vertical-align:bottom; padding:0 1px 2px;');

  // Total column: the window's months stacked chronologically from the baseline, on its
  // OWN scale (the full chart height). Divs render top-down, so segments are emitted
  // newest-first; 1px zone-color gaps separate them; sub-3px months merge forward.
  const cumSegments = [];
  const gross = series.reduce((sum, s) => sum + Math.max(days(s), 0), 0);
  if (total > 0 && gross > 0) {
    const perDayCum = UP_PX / gross;
    let carry = 0;
    for (const s of series) {
      carry += Math.max(days(s), 0) * perDayCum;
      if (carry >= 3) { cumSegments.push(Math.round(carry)); carry = 0; }
    }
    if (carry > 0) {
      if (cumSegments.length) cumSegments[cumSegments.length - 1] += Math.round(carry);
      else cumSegments.push(Math.max(Math.round(carry), 2));
    }
  }
  const cumHtml = cumSegments.length
    ? `<div style="width:20px; margin:0 auto;">${cumSegments.slice().reverse().map((h, i) =>
        `<div style="height:${Math.max(h - 1, 2)}px; font-size:0; background:${CUMULATIVE_COLOR};${i > 0 ? ' margin-top:1px;' : ''}">&nbsp;</div>`
      ).join('')}</div>`
    : `<div style="width:20px; margin:0 auto; height:2px; font-size:0; background:${ZERO_COLOR};">&nbsp;</div>`;

  // Row 2 — the up side of the baseline, scaled to the biggest single month.
  const upBarRow = series.map((s) => {
    const d = days(s);
    const inner = d > 0
      ? `<div style="width:20px; margin:0 auto; height:${Math.max(Math.round(d * perDay), 2)}px; font-size:0; background:${ADVANCE_COLOR};">&nbsp;</div>`
      : d === 0
        // Narrower than a data bar on purpose — a zero is a marker, not a magnitude,
        // and matching widths made the flat months scan like real columns.
        ? `<div style="width:12px; margin:0 auto; height:2px; font-size:0; background:${ZERO_COLOR};">&nbsp;</div>`
        : '';
    return `<td valign="bottom" height="${UP_PX}" style="padding:0 1px; height:${UP_PX}px;">${inner}</td>`;
  }).join('')
    + dividerTd()
    + cumTd(cumHtml, ` vertical-align:bottom; height:${UP_PX}px; padding:0 1px;`);

  // Rows 3+4 — the down side, only when the window contains a retrogression.
  const downBarRow = hasNeg
    ? series.map((s) => {
        const d = days(s);
        const inner = d < 0
          ? `<div style="width:20px; margin:0 auto; height:${Math.max(Math.round(-d * perDay), 2)}px; font-size:0; background:${RETROGRESS_COLOR};">&nbsp;</div>`
          : '';
        return `<td valign="top" height="${DOWN_PX}" style="padding:0 1px; height:${DOWN_PX}px; border-top:1px solid #b8b6ac;">${inner}</td>`;
      }).join('')
      + dividerTd(' border-top:1px solid #b8b6ac;')
      + cumTd('&nbsp;', ` height:${DOWN_PX}px; border-top:1px solid #b8b6ac;`)
    : '';
  const downLabelRow = hasNeg
    ? series.map((s) => {
        const d = days(s);
        return `<td align="center" valign="top" style="padding:2px 1px 0; ${labelStyle}">${d < 0 ? `−${Math.abs(d)}` : ''}</td>`;
      }).join('') + dividerTd() + cumTd('&nbsp;')
    : '';

  // Tick row — the baseline doubles as the axis when there is no down side.
  const tickBorder = hasNeg ? '' : ' border-top:1px solid #b8b6ac;';
  const tickRow = series.map((s, i) => {
    const show = i === 0 || i === series.length - 1;
    const align = i === 0 ? 'left' : 'right';
    return `<td align="${show ? align : 'center'}" style="padding:4px 1px 0;${tickBorder} font-family:'Courier New',monospace; font-size:9px; color:#8a8980; white-space:nowrap;">${show ? shortMonth(s.month) : ''}</td>`;
  }).join('')
    + dividerTd(tickBorder)
    + cumTd(`<span style="font-family:'Courier New',monospace; font-size:9px; color:#8a8980; white-space:nowrap;">${lang === 'en' ? 'total' : '累计'}</span>`, `${tickBorder} padding:4px 1px 0;`);

  // Streak bracket — the dominant run in the window, drawn under exactly the months it
  // covers (a colspan cell with a top rule). Zero-streaks outrank advance-streaks:
  // "nothing moved for 6 months" is the fact a reader most needs called out.
  const runs = [];
  let runStart = 0;
  const kind = (d) => (d > 0 ? 'adv' : d < 0 ? 'ret' : 'zero');
  for (let i = 1; i <= series.length; i++) {
    if (i === series.length || kind(days(series[i])) !== kind(days(series[runStart]))) {
      runs.push({ kind: kind(days(series[runStart])), start: runStart, len: i - runStart });
      runStart = i;
    }
  }
  const best = (k) => runs.filter((r) => r.kind === k && r.len >= 3).sort((a, b) => b.len - a.len)[0] || null;
  const streak = best('zero') || best('ret') || best('adv');
  let streakRow = '';
  if (streak) {
    const text = streak.kind === 'zero'
      ? (lang === 'en' ? `flat ${streak.len} months straight` : `连续 ${streak.len} 个月没动`)
      : streak.kind === 'ret'
        ? (lang === 'en' ? `${streak.len} straight months of retrogression` : `连续 ${streak.len} 个月倒退`)
        : (lang === 'en' ? `${streak.len} straight months advancing` : `连续 ${streak.len} 个月前进`);
    const before = streak.start > 0 ? `<td colspan="${streak.start}">&nbsp;</td>` : '';
    const after = series.length - streak.start - streak.len > 0 ? `<td colspan="${series.length - streak.start - streak.len}">&nbsp;</td>` : '';
    streakRow = `
      <tr>
        ${before}
        <td colspan="${streak.len}" align="center" style="padding:3px 2px 0;"><div style="border-top:2px solid #b8b6ac; padding-top:2px; font-family:'Courier New',monospace; font-size:9px; color:#8a8980; white-space:nowrap;">${escapeHtml(text)}</div></td>
        ${after}
        ${dividerTd()}
        ${cumTd('&nbsp;')}
      </tr>`;
  }

  const caption = lang === 'en'
    ? `Monthly movement, last ${series.length} months. The total column has its own scale — read its number.`
    : `近 ${series.length} 个月逐月变化。累计柱按独立比例绘制，以顶部数字为准。`;

  const legendKey = (color, text) =>
    `<span style="white-space:nowrap;"><span style="display:inline-block; width:8px; height:8px; background:${color}; vertical-align:middle;">&nbsp;</span><span style="font-size:10px; color:#6b6a64; vertical-align:middle;">&nbsp;${escapeHtml(text)}</span></span>`;
  const legend = `
    <div style="margin-top:8px; line-height:1.6;">
      ${legendKey(ADVANCE_COLOR, lang === 'en' ? 'Monthly advance' : '单月前进')}&nbsp;&nbsp;&nbsp;
      ${hasNeg ? legendKey(RETROGRESS_COLOR, lang === 'en' ? 'Retrogression' : '倒退') + '&nbsp;&nbsp;&nbsp;' : ''}
      ${legendKey(CUMULATIVE_COLOR, lang === 'en' ? `${series.length}-month total` : `${series.length}个月累计`)}
    </div>`;

  return `
    <div style="font-family:'Courier New',monospace; font-size:10px; letter-spacing:0.15em; color:#6b6a64; text-transform:uppercase; margin-bottom:10px;">${lang === 'en' ? 'Pace, month by month' : '逐月推进'}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="table-layout:fixed;">
      <tr>${topLabelRow}</tr>
      <tr>${upBarRow}</tr>
      ${hasNeg ? `<tr>${downBarRow}</tr><tr>${downLabelRow}</tr>` : ''}
      <tr>${tickRow}</tr>${streakRow}
    </table>
    <div style="font-size:11px; line-height:1.6; color:#8a8980; margin-top:8px;">${escapeHtml(caption)}</div>${legend}`;
};

// Cutoff trend over the window — the "line chart". A true polyline is impossible in
// email (no SVG in Gmail, no JS anywhere), so each month is a column whose colored
// 3px cap sits at the cutoff's normalized height, with a light area fill below.
// Twenty-five caps in a row read as a stepped line.
const renderCutoffTrendChart = (points, lang) => {
  if (!Array.isArray(points) || points.length < 2) return '';

  const CHART_PX = 56;
  const toT = (p) => Date.parse(`${p.cutoff}T00:00:00Z`);
  const min = Math.min(...points.map(toT));
  const max = Math.max(...points.map(toT));
  const span = Math.max(max - min, 1);

  // Start and end cutoff dates ride above the chart's left/right edges, prefixed
  // 起/现 so it's clear WHICH values they are — the start cap sits at the bottom left,
  // far from its own label, and a bare date up there would leave the reader guessing.
  const endLabelRow = `
      <tr>
        <td colspan="${Math.ceil(points.length / 2)}" align="left" style="padding:0 0 3px; font-family:'Courier New',monospace; font-size:8px; color:#6b6a64; white-space:nowrap;">${lang === 'en' ? 'from' : '起'}&nbsp;${points[0].cutoff}</td>
        <td colspan="${Math.floor(points.length / 2)}" align="right" style="padding:0 0 3px; font-family:'Courier New',monospace; font-size:8px; color:#6b6a64; white-space:nowrap;">${lang === 'en' ? 'now' : '现'}&nbsp;${points[points.length - 1].cutoff}</td>
      </tr>`;

  // No inter-column padding: the columns fuse into one stepped area so the 3px caps
  // read as a continuous line, not a row of bars — this chart is the email's polyline.
  const barRow = points.map((p) => {
    const h = 5 + Math.round(((toT(p) - min) / span) * (CHART_PX - 8));
    return `<td valign="bottom" height="${CHART_PX}" style="padding:0; height:${CHART_PX}px;"><div style="height:${h}px; font-size:0; background:${TREND_FILL}; border-top:3px solid ${ADVANCE_COLOR};">&nbsp;</div></td>`;
  }).join('');

  const shortMonth = (m) => {
    const [y, mo] = m.split('-');
    return lang === 'en' ? `${mo}/${y.slice(2)}` : `${y.slice(2)}年${parseInt(mo, 10)}月`;
  };
  const tickRow = points.map((p, i) => {
    const show = i === 0 || i === points.length - 1;
    return `<td align="center" style="padding:4px 1px 0; border-top:1px solid #d4d2c8; font-family:'Courier New',monospace; font-size:9px; color:#8a8980; white-space:nowrap;">${show ? shortMonth(p.month) : ''}</td>`;
  }).join('');

  const first = points[0], last = points[points.length - 1];
  const totalDays = Math.round((toT(last) - toT(first)) / 86400000);
  const caption = lang === 'en'
    ? `Final Action Date went from ${first.cutoff} to ${last.cutoff} over ${points.length - 1} months — ${totalDays >= 0 ? '+' : ''}${totalDays} days total.`
    : `${points.length - 1} 个月里 Final Action Date 从 ${first.cutoff} 走到 ${last.cutoff}，共${totalDays >= 0 ? '前进' : '倒退'} ${Math.abs(totalDays)} 天。`;

  return `
    <div style="font-family:'Courier New',monospace; font-size:10px; letter-spacing:0.15em; color:#6b6a64; text-transform:uppercase; margin-bottom:10px;">${lang === 'en' ? 'Cutoff trend' : '排期走势'}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="table-layout:fixed;">${endLabelRow}
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

export const renderMonthlyUpdateEmail = ({ email, userCase, update, uscisChart, notices, bulletinMonthLabel, language, siteUrl, unsubscribeUrl }) => {
  const lang = language === 'en' ? 'en' : 'zh';
  const caseUrl = buildCaseUrl(siteUrl, userCase);

  const category = formatCategory(userCase?.category);
  const country = formatCountry(userCase?.country);
  const priorityDate = escapeHtml(userCase?.priorityDate) || '—';

  const fa = update.finalAction;
  const fil = update.filing;
  const isNowCurrent = fa.status?.status === 'current' || fa.status?.status === 'eligible' || fa.status?.status === 'overdue';

  // Headline split into pre/accent/post so the HTML version can color just the verdict
  // phrase ("advanced 243 days") while subject and plain-text reuse the same words.
  const GOOD_COLOR = '#0e6b3e';
  const hp = isNowCurrent
    ? (lang === 'en'
        ? { pre: 'Your priority date ', accent: 'is current', post: '', color: GOOD_COLOR }
        : { pre: '你的优先日', accent: '已经排到了', post: '', color: GOOD_COLOR })
    : fa.movement.type === 'advanced'
      ? (lang === 'en'
          ? { pre: 'Your category ', accent: `advanced ${fa.movement.days} days`, post: ' this month', color: ADVANCE_COLOR }
          : { pre: '本月你的类别', accent: `前进了 ${fa.movement.days} 天`, post: '', color: ADVANCE_COLOR })
      : fa.movement.type === 'retrogressed'
        ? (lang === 'en'
            ? { pre: 'Your category ', accent: 'retrogressed', post: ' this month', color: RETROGRESS_COLOR }
            : { pre: '本月你的类别', accent: '出现倒退', post: '', color: RETROGRESS_COLOR })
        : (lang === 'en'
            ? { pre: 'No movement in your category this month', accent: '', post: '', color: '#6b6a64' }
            : { pre: '本月你的类别没有变化', accent: '', post: '', color: '#6b6a64' });
  const headline = hp.pre + hp.accent + hp.post;
  const headlineHtml = `${escapeHtml(hp.pre)}<span style="color:${hp.color}; font-weight:600;">${escapeHtml(hp.accent)}</span>${escapeHtml(hp.post)}`;
  const eyebrowColor = hp.accent ? hp.color : '#8b3a3a';

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

  // "乐观端 / 保守端" matches the pace-basis vocabulary the site's summary card and
  // Forecast tab now use, so email and app describe the same range in the same words.
  const rangeDetail = !fc ? '' : hasRange
    ? (lang === 'en'
        ? `The optimistic end assumes this month's pace holds (${Math.round(fc.fastRate)} days/month). The conservative end uses the average pace actually delivered over the last ${fc.windowSize} months (${Math.round(fc.slowRate)} days/month).`
        : `乐观端假设本月这个速度能保持（${Math.round(fc.fastRate)} 天/月），保守端用的是过去 ${fc.windowSize} 个月实际平均速度（${Math.round(fc.slowRate)} 天/月）。`)
    : (lang === 'en'
        ? `Based on a pace of ${Math.round(fc.fastRate)} days/month.`
        : `按每月推进 ${Math.round(fc.fastRate)} 天估算。`);

  const etaLine = rangeDetail;

  // The months-range translated onto the calendar — "6.9 years" forces the reader to
  // do arithmetic; "around 2033年5月" doesn't.
  const monthToCal = (months) => {
    if (!isFinite(months) || months === null) return null;
    const d = new Date();
    d.setDate(d.getDate() + Math.round(months * 30.44));
    return lang === 'en'
      ? d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
      : `${d.getFullYear()}年${d.getMonth() + 1}月`;
  };
  const calFast = fc ? monthToCal(fc.fastMonths) : null;
  const calSlow = fc && hasRange ? monthToCal(fc.slowMonths) : null;
  const calLine = calFast
    ? (calSlow
        ? (lang === 'en'
            ? `On the calendar: around ${calFast} at the optimistic end, around ${calSlow} at the conservative end.`
            : `换算到日历上：乐观约 ${calFast}，保守约 ${calSlow}。`)
        : (lang === 'en' ? `On the calendar: around ${calFast}.` : `换算到日历上：约 ${calFast}。`))
    : '';

  // Inbox preview line. The subject already carries the headline, so the preheader
  // adds the NEXT facts a subscriber wants — repeating the headline wastes the slot.
  const preheaderGap = !isNowCurrent && fa.status?.days ? fa.status.days : null;
  const preheader = [
    `${lang === 'en' ? 'Chart A' : '表A'} ${formatDateForLang(fa.current, lang)}`,
    preheaderGap ? (lang === 'en' ? `${preheaderGap.toLocaleString('en-US')} days to your PD` : `距优先日 ${preheaderGap.toLocaleString('en-US')} 天`) : '',
    calFast ? (lang === 'en' ? `optimistic ~${calFast}` : `乐观约 ${calFast}`) : '',
  ].filter(Boolean).join(' · ') || headline;
  // 12-month series on purpose: twelve ~34px columns carry one aligned row of value
  // labels; the 24-month rhythm lives in the cutoff trend chart above.
  const chartHtml = renderMovementChart(fc?.series, lang);
  const trendHtml = renderCutoffTrendChart(update.cutoffHistory, lang);

  // How far the cutoff still has to travel to reach this subscriber's priority date.
  const gapDays = !isNowCurrent && fa.status?.days ? fa.status.days : null;
  const gapLine = gapDays
    ? (lang === 'en'
        ? `The current cutoff is ${gapDays.toLocaleString('en-US')} days short of your priority date.`
        : `当前 cutoff 距你的优先日还差 ${gapDays.toLocaleString('en-US')} 天。`)
    : '';

  // Bulletin notices that mention this subscriber's exact category token (e.g. "EB-2",
  // "F4"). The State Department's own retrogression warnings live here; only the ones
  // aimed at this category are shown, so most months this block simply doesn't render.
  const catToken = userCase?.category || '';
  const catRe = catToken.startsWith('EB')
    ? new RegExp(`EB-?${catToken.slice(2)}\\b`, 'i')
    : new RegExp(`\\b${catToken}\\b`, 'i');
  const relevantNotices = (Array.isArray(notices) ? notices : [])
    .filter((n) => n && (catRe.test(n.title || '') || catRe.test(n.text || '')))
    .slice(0, 2);
  const noticesHtml = relevantNotices.map((n) => `
    <div style="border-left:2px solid ${RETROGRESS_COLOR}; padding:10px 14px; background:#f9f1ec; margin-top:10px;">
      <div style="font-family:'Courier New',monospace; font-size:9px; letter-spacing:0.12em; color:${RETROGRESS_COLOR}; text-transform:uppercase; margin-bottom:6px;">${lang === 'en' ? 'From the bulletin' : '公告原文提醒'} · ${escapeHtml(n.letter || '')}</div>
      <div style="font-size:12px; font-weight:600; color:#1a1a1a; margin-bottom:4px;">${escapeHtml(n.title || '')}</div>
      <div style="font-size:12px; line-height:1.65; color:#4a4a45;">${escapeHtml((n.text || '').slice(0, 320))}${(n.text || '').length > 320 ? '…' : ''}</div>
    </div>`).join('');

  // "表 A / 表 B" mirrors the bulletin's own section lettering (A. FINAL ACTION DATES,
  // B. DATES FOR FILING) and is what Chinese-language immigration discussion uses.
  // The English chart names stay in place per the repo convention of keeping domain
  // terms in the original.
  // Movement text carries the same advance/retrogress colors as the charts, so the
  // whole email speaks one color language (blue = forward, rust = backward).
  const moveColor = (movement) => movement.type === 'retrogressed' ? RETROGRESS_COLOR
    : movement.type === 'none' ? '#8a8980' : ADVANCE_COLOR;
  const rows = [
    {
      label: lang === 'en' ? 'Chart A · Final Action Dates' : '表 A · Final Action Dates',
      prev: formatDateForLang(fa.previous, lang),
      cur: formatDateForLang(fa.current, lang),
      move: movementCopy(fa.movement, lang),
      moveColor: moveColor(fa.movement),
    },
    {
      label: lang === 'en' ? 'Chart B · Dates for Filing' : '表 B · Dates for Filing',
      prev: formatDateForLang(fil.previous, lang),
      cur: formatDateForLang(fil.current, lang),
      move: movementCopy(fil.movement, lang),
      moveColor: moveColor(fil.movement),
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
    calLine,
    gapLine,
    (() => {
      // Same 12-month net the chart's cumulative column shows, for text-only clients.
      const s = Array.isArray(fc?.series) ? fc.series : null;
      if (!s) return '';
      const t12 = s.reduce((sum, p) => sum + (typeof p.days === 'number' ? Math.round(p.days) : 0), 0);
      return lang === 'en'
        ? `Chart A moved ${t12 >= 0 ? '+' : '−'}${Math.abs(t12)} days net over the last ${s.length} months.`
        : `近 ${s.length} 个月表A累计${t12 >= 0 ? '前进' : '倒退'} ${Math.abs(t12)} 天。`;
    })(),
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
        <td align="right" style="padding:0 0 10px 16px; font-size:12px; color:${r.moveColor}; white-space:nowrap;">${escapeHtml(r.move)}</td>
      </tr>
    </table>`).join('');

  const html = `<!DOCTYPE html>
<html lang="${lang}">
${emailHead(subject)}
<body style="margin:0; padding:0; background:#f4f3ee; font-family: Georgia, 'Times New Roman', serif; color:#1a1a1a;">

<div style="display:none; max-height:0; overflow:hidden; mso-hide:all;">${escapeHtml(preheader)}</div>

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
            <div style="font-family:'Courier New',monospace; font-size:10px; letter-spacing:0.15em; color:${eyebrowColor}; text-transform:uppercase; margin-bottom:8px;">${lang === 'en' ? '— Bulletin Update —' : '— 排期更新 —'}</div>
            <div class="headline" style="font-family:Georgia,serif; font-size:26px; line-height:1.3; font-weight:400; letter-spacing:-0.01em; margin-bottom:6px; color:#1a1a1a;">${headlineHtml}</div>
          </td>
        </tr>

        <tr>
          <td class="px" style="padding:12px 40px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PANEL_BG}; border:1px solid ${PANEL_BORDER}; border-left:2px solid #1a1a1a;">
              <tr>
                <td style="padding:16px 18px;">
                  <div style="font-family:'Courier New',monospace; font-size:9px; letter-spacing:0.15em; color:#6b6a64; text-transform:uppercase; margin-bottom:10px;">${lang === 'en' ? 'Your Case' : '你的案子'}</div>
                  <div style="font-family:'Courier New',monospace; font-size:16px; font-weight:700; color:#1a1a1a; letter-spacing:0.02em;">${escapeHtml(category)} · ${escapeHtml(country)}${countryFlagHtml(userCase?.country)}</div>
                  <div style="font-size:12px; color:#6b6a64; margin:3px 0 14px;">${lang === 'en' ? 'Priority Date' : '优先日'}&nbsp;&nbsp;<span style="font-family:'Courier New',monospace; font-size:13px; color:#1a1a1a;">${priorityDate}</span></div>
                  ${rowsHtml}
                  <div style="border-top:1px solid #e4e1d6; padding-top:9px; font-size:11px; line-height:1.5; color:#8a8980;">${escapeHtml(chartNote)}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        ${noticesHtml ? `
        <tr>
          <td class="px" style="padding:14px 40px 0;">${noticesHtml}</td>
        </tr>` : ''}

        ${etaLine ? `
        <tr>
          <td class="px" style="padding:16px 40px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#e9efe6; border-left:2px solid ${CUMULATIVE_COLOR};">
              <tr>
                <td style="padding:16px 18px;">
                  <div style="font-family:'Courier New',monospace; font-size:10px; letter-spacing:0.15em; color:#4e6b58; text-transform:uppercase; margin-bottom:8px;">${lang === 'en' ? 'Estimated Wait' : '预计还要等'}</div>
                  <div style="font-family:Georgia,serif; font-size:24px; line-height:1.2; color:#1a1a1a; margin-bottom:8px;">${escapeHtml(rangeHeadline)}</div>
                  <div style="font-size:12px; line-height:1.7; color:#2a2a2a;">${escapeHtml(etaLine)}</div>
                  ${calLine ? `<div style="font-size:12px; line-height:1.7; color:#2a2a2a; margin-top:4px; font-weight:600;">${escapeHtml(calLine)}</div>` : ''}
                  ${gapLine ? `<div style="font-size:12px; line-height:1.7; color:#2a2a2a; margin-top:4px;">${escapeHtml(gapLine)}</div>` : ''}
                  <div style="font-size:11px; line-height:1.6; color:#8a8980; margin-top:8px;">${lang === 'en'
                    ? 'A model estimate from historical pace, not a guarantee — the bulletin can speed up, slow down, or retrogress.'
                    : '基于历史速度的模型估算，不是承诺——排期可能加速、放缓，也可能倒退。'}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>` : ''}

        ${trendHtml ? `
        <tr>
          <td class="px" style="padding:16px 40px 0;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PANEL_BG}; border:1px solid ${PANEL_BORDER};">
              <tr><td style="padding:14px 14px 12px;">${trendHtml}</td></tr>
            </table>
          </td>
        </tr>` : ''}

        ${chartHtml ? `
        <tr>
          <td class="px" style="padding:16px 40px 8px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PANEL_BG}; border:1px solid ${PANEL_BORDER};">
              <tr><td style="padding:14px 14px 12px;">${chartHtml}</td></tr>
            </table>
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
${emailHead(c.subject)}
<body style="margin:0; padding:0; background:#f4f3ee; font-family: Georgia, 'Times New Roman', serif; color:#1a1a1a;">
  <div style="display:none; max-height:0; overflow:hidden; mso-hide:all;">${escapeHtml(c.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f3ee;">
    <tr>
      <td align="center" style="padding:32px 16px;">

        <table role="presentation" class="container" width="560" cellpadding="0" cellspacing="0" border="0" style="width:560px; max-width:560px; background:#fdfcf8; border:1px solid #d4d2c8;">

          <tr>
            <td class="px" style="padding:32px 40px 20px; border-bottom:1px solid #1a1a1a;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="font-family:Georgia,serif; font-size:22px; font-weight:500; letter-spacing:-0.01em; color:#1a1a1a;">${escapeHtml(c.brand)}</td>
                  <td align="right" style="font-family:'Courier New',monospace; font-size:10px; letter-spacing:0.1em; color:#6b6a64; text-transform:uppercase;">${lang === 'en' ? 'Double opt-in' : '双重确认'}</td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td class="px" style="padding:28px 40px 8px;">
              <div style="font-family:'Courier New',monospace; font-size:10px; letter-spacing:0.15em; color:#8b3a3a; text-transform:uppercase; margin-bottom:8px;">${escapeHtml(c.eyebrow)}</div>
              <div class="headline" style="font-family:Georgia,serif; font-size:26px; line-height:1.25; font-weight:400; letter-spacing:-0.01em; margin-bottom:16px; color:#1a1a1a;">${escapeHtml(c.title)}</div>
              <div style="font-size:14px; line-height:1.7; color:#2a2a2a;">${escapeHtml(c.body)}</div>
            </td>
          </tr>

          <tr>
            <td align="center" class="px" style="padding:26px 40px 8px;">
              <a href="${safeUrl}" style="display:inline-block; background:#1a1a1a; color:#fdfcf8; padding:11px 28px; text-decoration:none; font-size:12px; letter-spacing:0.1em; text-transform:uppercase; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">${escapeHtml(c.cta)}</a>
            </td>
          </tr>

          <tr>
            <td class="px" style="padding:14px 40px 20px;">
              <div style="font-size:11px; line-height:1.7; color:#8a8980;">
                ${escapeHtml(c.fallback)}<br>
                <span style="font-family:'Courier New',monospace; font-size:10px; word-break:break-all; color:#6b6a64;">${safeUrl}</span>
              </div>
            </td>
          </tr>

          <tr>
            <td class="px" style="padding:16px 40px 24px; border-top:1px solid #d4d2c8;">
              <div style="font-size:10px; color:#8a8980; line-height:1.7;">${escapeHtml(c.ignore)}</div>
              <div align="center" style="font-family:'Courier New',monospace; font-size:9px; letter-spacing:0.15em; color:#b0afa6; text-transform:uppercase; margin-top:14px; text-align:center;">Green Card Tracker · JMJ · 2026 · travel.state.gov</div>
            </td>
          </tr>

        </table>

      </td>
    </tr>
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
