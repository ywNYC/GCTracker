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
