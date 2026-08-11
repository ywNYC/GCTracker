// Cloudflare Pages Function: POST /api/admin/preview-monthly
//
// Renders the monthly bulletin email for ONE made-up case and sends it to ONE
// address, so the layout can be reviewed before a real bulletin lands. It never
// touches the subscriber list, never stamps lastNotifiedMonth, and never writes
// to KV — the only side effect is a single outbound email.
//
// Why it exists: send-monthly can only reproduce THIS month's numbers, and a
// layout review before the September bulletin needs September-shaped numbers.
// This endpoint synthesizes the next month by advancing the current cutoffs at
// each chart's own observed 12-month pace, then feeds that through the exact
// production template — same computeCaseUpdate, same renderMonthlyUpdateEmail.
//
//   curl -X POST "https://gc.jmjvc.us/api/admin/preview-monthly?to=you@example.com&cat=F4&country=China&pd=2015-06-01" \
//     -H "Authorization: Bearer $ADMIN_TOKEN"
//
// Query params:
//   to=          recipient (required)
//   cat=         category, default F4
//   country=     China | India | Mexico | Philippines | Taiwan | Other, default China
//   pd=          priority date YYYY-MM-DD, default 2015-06-01
//   lang=        zh | tw | en, default zh
//   month=       simulated month label, default = current + 1
//   advanceA=    override chart A advance in days (else observed 12-mo pace)
//   advanceB=    override chart B advance in days (else observed 12-mo pace)
//   label=       0 to drop the [DRY RUN] subject prefix (default 1 — keeps a
//                simulated send from being mistaken for the real thing)

import { renderMonthlyUpdateEmail } from '../_emailTemplates.js';
import { applyRecentRateOverride, computeCaseUpdate } from '../_gcMath.js';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data, null, 2), {
    status, headers: { 'Content-Type': 'application/json' },
  });

const monthLabel = (month, lang) => {
  const [y, m] = month.split('-');
  return lang === 'en' ? `${y}-${m}` : `${y}年${parseInt(m, 10)}月`;
};

const nextMonth = (month) => {
  const [y, m] = month.split('-').map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
};

const addDays = (iso, days) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

// Observed advance for one chart over the trailing 12 months, in days/month.
// C/U months carry no diff and are skipped — same rule the site uses.
const observedPace = (months, chart, cat, country) => {
  const win = months.slice(-13);
  const at = (m) => {
    const t = m[chart]?.[cat] || {};
    return t[country] || t.Other || null;
  };
  let total = 0, n = 0;
  for (let i = 1; i < win.length; i++) {
    const a = at(win[i - 1]), b = at(win[i]);
    if (!a || !b || a === 'C' || a === 'U' || b === 'C' || b === 'U') continue;
    total += Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
    n++;
  }
  return n ? Math.round(total / n) : 0;
};

export async function onRequestPost(context) {
  const { request, env } = context;

  const authHeader = request.headers.get('authorization') || '';
  if (!env.ADMIN_TOKEN || authHeader !== `Bearer ${env.ADMIN_TOKEN}`) {
    return json({ error: 'Unauthorized' }, 401);
  }
  if (!env.RESEND_API_KEY || !env.RESEND_FROM) {
    return json({ error: 'RESEND_API_KEY / RESEND_FROM not configured' }, 500);
  }

  const url = new URL(request.url);
  const to = (url.searchParams.get('to') || '').trim();
  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return json({ error: 'to= required (valid email)' }, 400);
  }
  const cat = (url.searchParams.get('cat') || 'F4').toUpperCase();
  const country = url.searchParams.get('country') || 'China';
  const priorityDate = url.searchParams.get('pd') || '2015-06-01';
  const language = url.searchParams.get('lang') || 'zh';
  const labelIt = url.searchParams.get('label') !== '0';
  const siteUrl = (env.SITE_URL || 'https://gc.jmjvc.us').replace(/\/+$/, '');

  let history;
  try {
    const r = await fetch(`${siteUrl}/history.json`, { cf: { cacheTtl: 0 } });
    if (!r.ok) return json({ error: `history.json fetch failed: ${r.status}` }, 502);
    history = await r.json();
  } catch (e) {
    return json({ error: `history.json fetch error: ${e.message}` }, 502);
  }
  const months = (history.months || []).slice().sort((a, b) => a.month.localeCompare(b.month));
  if (months.length < 2) return json({ error: 'history.json has fewer than 2 months' }, 500);

  const real = months[months.length - 1];
  const simMonth = url.searchParams.get('month') || nextMonth(real.month);

  const paceA = url.searchParams.has('advanceA')
    ? parseInt(url.searchParams.get('advanceA'), 10)
    : observedPace(months, 'finalAction', cat, country);
  const paceB = url.searchParams.has('advanceB')
    ? parseInt(url.searchParams.get('advanceB'), 10)
    : observedPace(months, 'filing', cat, country);

  // Deep-clone the newest real month, then push every dated cutoff forward by
  // that chart's own pace. C/U entries stay as they are — a category with no
  // queue does not "advance".
  const sim = JSON.parse(JSON.stringify(real));
  sim.month = simMonth;
  sim.simulated = true;
  for (const [chart, adv] of [['finalAction', paceA], ['filing', paceB]]) {
    const tbl = sim[chart] || {};
    for (const c of Object.keys(tbl)) {
      for (const k of Object.keys(tbl[c] || {})) {
        const v = tbl[c][k];
        if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && adv) {
          tbl[c][k] = addDays(v, adv);
        }
      }
    }
  }

  const historyMonths = [...months, sim];
  applyRecentRateOverride(historyMonths);

  const update = computeCaseUpdate({
    cat, country, priorityDate,
    current: sim,
    previous: real,
    historyMonths,
  });

  let uscisChart = null, notices = null, noticeI18n = null;
  try {
    const r = await fetch(`${siteUrl}/bulletin.json`, { cf: { cacheTtl: 0 } });
    if (r.ok) {
      const data = await r.json();
      if (Array.isArray(data?.current?.notices)) notices = data.current.notices;
      const r2 = await fetch(`${siteUrl}/notice-translations.json`, { cf: { cacheTtl: 0 } });
      if (r2.ok) noticeI18n = (await r2.json())?.months?.[data?.current?.month] || null;
    }
  } catch {}

  const { subject, html, text } = renderMonthlyUpdateEmail({
    email: to,
    userCase: { category: cat, country, priorityDate },
    update,
    notices,
    noticeI18n,
    uscisChart,
    bulletinMonthLabel: monthLabel(simMonth, language),
    language,
    siteUrl,
    // Not a real subscriber record, so there is no signed token to build from.
    unsubscribeUrl: `${siteUrl}/api/unsubscribe?email=${encodeURIComponent(to)}&token=preview-not-functional`,
  });

  const finalSubject = labelIt ? `[DRY RUN] ${subject}` : subject;

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env.RESEND_FROM, to: [to], subject: finalSubject, html, text }),
  });
  if (!resp.ok) {
    return json({ error: 'resend failed', status: resp.status, body: await resp.text() }, 502);
  }
  const data = await resp.json();

  return json({
    ok: true,
    sentTo: to,
    resendId: data.id,
    subject: finalSubject,
    realSubject: subject,
    simulated: {
      basedOnMonth: real.month,
      simulatedMonth: simMonth,
      advanceAppliedDays: { finalAction: paceA, filing: paceB },
      case: { cat, country, priorityDate },
      finalAction: `${update.finalAction.previous} → ${update.finalAction.current}`,
      filing: `${update.filing.previous} → ${update.filing.current}`,
      forecast: update.forecast?.etaLabel || null,
    },
    note: 'Synthetic月份，仅用于版面评审：数字由当前公告按各表近 12 个月实际速度外推，不是真实公告。未写入 KV，未影响任何订阅者。',
  });
}
