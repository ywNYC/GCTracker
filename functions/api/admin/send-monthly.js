// Cloudflare Pages Function: POST /api/admin/send-monthly
// Sends the personalized monthly bulletin-update email to every confirmed subscriber
// whose own category/country actually moved this month. This is the missing link
// between "new bulletin scraped" and "subscribers hear about it".
//
// Usage (after a new bulletin has landed in public/history.json):
//   curl -X POST https://gc.jmjvc.us/api/admin/send-monthly \
//     -H "Authorization: Bearer $ADMIN_TOKEN"
//
// Query params:
//   ?dryRun=1  - compute and report who WOULD get mail, send nothing, mark nothing
//   ?force=1   - ignore lastNotifiedMonth (re-send for the current month)
//
// Idempotent by design: each successful send stamps lastNotifiedMonth on the KV
// record, and stamped subscribers are skipped on later runs. Running this twice
// after one bulletin does not double-send.

import { renderMonthlyUpdateEmail } from '../_emailTemplates.js';
import { buildUnsubscribeUrl, buildSubtypeToken } from '../subscribe.js';
import { applyRecentRateOverride, computeCaseUpdate } from '../_gcMath.js';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const monthLabel = (month, lang) => {
  const [y, m] = month.split('-');
  return lang === 'en' ? `${y}-${m}` : `${y}年${parseInt(m, 10)}月`;
};

// Which of the subscriber's alert toggles this update satisfies. Unset toggles
// default to on — an empty alerts object means "tell me what happens".
const shouldNotify = (update, alerts) => {
  const wants = (k) => (alerts?.[k] === undefined ? true : !!alerts[k]);
  const fa = update.finalAction, fil = update.filing;
  const becameCurrent = ['current', 'eligible', 'overdue'].includes(fa.status?.status);
  const retro = fa.movement.type === 'retrogressed' || fil.movement.type === 'retrogressed';
  const moved = fa.movement.type !== 'none' || fil.movement.type !== 'none';
  if (becameCurrent && wants('whenCurrent')) return 'becameCurrent';
  if (retro && (wants('retrogression') || wants('monthlyUpdates'))) return 'retrogression';
  if (moved && wants('monthlyUpdates')) return 'movement';
  return null;
};

export async function onRequestPost(context) {
  const { request, env } = context;

  const authHeader = request.headers.get('authorization') || '';
  if (!env.ADMIN_TOKEN || authHeader !== `Bearer ${env.ADMIN_TOKEN}`) {
    return json({ error: 'Unauthorized' }, 401);
  }
  if (!env.SUBSCRIBERS) return json({ error: 'KV namespace SUBSCRIBERS not bound' }, 500);
  if (!env.RESEND_API_KEY || !env.RESEND_FROM) {
    return json({ error: 'RESEND_API_KEY / RESEND_FROM not configured' }, 500);
  }

  const url = new URL(request.url);
  const dryRun = url.searchParams.get('dryRun') === '1';
  const force = url.searchParams.get('force') === '1';
  // Correction mode: only the emails listed in the POST body, subject prefixed, banner on top.
  const correction = url.searchParams.get('correction') === '1';
  let corrEmails = null;
  if (correction) {
    const b = await request.json().catch(() => ({}));
    corrEmails = new Set((Array.isArray(b.emails) ? b.emails : []).map((e) => String(e).trim().toLowerCase()).filter(Boolean));
    if (!corrEmails.size) return json({ error: 'correction mode needs a non-empty emails list' }, 400);
  }
  // Safety valve for template testing: process ONLY this subscriber, skip the rest.
  // Without it, a force-resend now reaches real strangers.
  const only = (url.searchParams.get('only') || '').trim().toLowerCase();
  const siteUrl = (env.SITE_URL || 'https://gc.jmjvc.us').replace(/\/+$/, '');

  // ---- Load bulletin data (same files the frontend reads) ----
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
  const current = months[months.length - 1];
  const previous = months[months.length - 2];

  // Same runtime override the frontend applies — without it the forecast in the
  // email and the one on the site drift apart.
  applyRecentRateOverride(history.months);

  // USCIS chart designation (produced by scripts/scrape-uscis-chart.mjs). Optional:
  // when present and matching the bulletin month, the email states the definitive
  // "which chart applies" answer instead of the generic note.
  let uscisChart = null;
  try {
    const r = await fetch(`${siteUrl}/uscis-charts.json`, { cf: { cacheTtl: 0 } });
    if (r.ok) {
      const data = await r.json();
      if (data?.current?.month === current.month) uscisChart = data.current;
    }
  } catch {}

  // Bulletin notice sections (D onward) — bulletin.json carries them, history.json
  // does not. The template filters to the subscriber's own category, so passing the
  // full list is fine. Optional: absence just means no warning block.
  let notices = null;
  let noticeI18n = null;
  try {
    const r = await fetch(`${siteUrl}/bulletin.json`, { cf: { cacheTtl: 0 } });
    if (r.ok) {
      const data = await r.json();
      if (data?.current?.month === current.month && Array.isArray(data.current.notices)) {
        notices = data.current.notices;
      }
    }
  } catch {}
  try {
    const r2 = await fetch(`${siteUrl}/notice-translations.json`, { cf: { cacheTtl: 0 } });
    if (r2.ok) {
      const d2 = await r2.json();
      noticeI18n = d2?.months?.[current.month] || null;
    }
  } catch {}

  // ---- Walk subscribers ----
  const report = {
    bulletinMonth: current.month,
    previousMonth: previous.month,
    dryRun,
    sent: [],
    skipped: { unconfirmed: 0, noCase: 0, alreadyNotified: 0, noChange: 0, optedOut: 0 },
    errors: [],
  };

  let cursor;
  do {
    const list = await env.SUBSCRIBERS.list({ cursor });
    for (const keyInfo of list.keys) {
      if (keyInfo.name.startsWith('rl:')) continue; // rate-limit counters, not subscribers
      if (keyInfo.name.startsWith('an:')) continue; // analytics beacons, not subscribers
      if (keyInfo.name.startsWith('ev:') || keyInfo.name.startsWith('es:')) continue; // email events
      if (keyInfo.name.startsWith('pr:') || keyInfo.name.startsWith('prl:')) continue; // progress reports
      if (keyInfo.name.startsWith('cd:') || keyInfo.name.startsWith('crl:')) continue; // community data
      if (only && keyInfo.name.toLowerCase().indexOf(only) === -1) continue; // test valve
      const raw = await env.SUBSCRIBERS.get(keyInfo.name);
      if (!raw) continue;
      let record;
      try { record = JSON.parse(raw); } catch { continue; }

      if (correction && !corrEmails.has(String(record.email || '').toLowerCase())) continue;
      if (record.confirmed !== true) { report.skipped.unconfirmed++; continue; }
      const uc = record.userCase;
      if (!uc?.category || !uc?.country || !uc?.priorityDate) { report.skipped.noCase++; continue; }
      if (correction) {
        if (record.correctedMonth === current.month) { report.skipped.alreadyNotified++; continue; }
      } else if (!force && record.lastNotifiedMonth === current.month) { report.skipped.alreadyNotified++; continue; }

      const update = computeCaseUpdate({
        cat: uc.category,
        country: uc.country,
        priorityDate: uc.priorityDate,
        current,
        previous,
        historyMonths: history.months,
      });

      const reason = correction ? 'correction' : shouldNotify(update, record.alerts);
      if (!reason) {
        const moved = update.finalAction.movement.type !== 'none' || update.filing.movement.type !== 'none';
        if (moved) report.skipped.optedOut++; else report.skipped.noChange++;
        continue;
      }

      if (dryRun) {
        report.sent.push({ email: record.email, reason, dryRun: true });
        continue;
      }

      try {
        const unsubscribeUrl = await buildUnsubscribeUrl(record.email, env);
        const subtypeToken = await buildSubtypeToken(record.email, env);
        let { subject, html, text } = renderMonthlyUpdateEmail({
          email: record.email,
          userCase: uc,
          update,
          uscisChart,
          notices,
          noticeI18n,
          bulletinMonthLabel: monthLabel(current.month, record.language === 'en' ? 'en' : 'zh'),
          language: record.language,
          siteUrl,
          unsubscribeUrl,
          subtypeToken,
          name: record.name,
        });

        if (correction) {
          const en = record.language === 'en';
          const tw = record.language === 'tw';
          const note = en
            ? 'Correction: the headline of our earlier email for this bulletin used only the Final Action chart (Chart A). If your priority date has not reached Chart A yet, follow the Dates for Filing chart (Chart B); if it already has, follow Chart A. The headline of this email uses the right chart for you.'
            : tw
              ? '更正：上一封郵件的標題只按出卡線（表A）來寫。如果你的優先日還沒排到出卡線，請以遞件表（表B）的變化為準；已經排到的，以表A為準。本封標題已按你的情況改正。'
              : '更正：上一封邮件的标题只按出卡线（表A）来写。如果你的优先日还没排到出卡线，请以递件表（表B）的变化为准；已经排到的，以表A为准。本封标题已按你的情况改正。';
          subject = (en ? '[Correction] ' : tw ? '【更正】' : '【更正】') + subject;
          html = html.replace(/<body[^>]*>/i, (m) => `${m}<div style="max-width:600px;margin:0 auto;padding:12px 16px;background:#fff4e5;border-left:3px solid #c1571f;font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#3a3a3a;">${note}</div>`);
          text = `${note}\n\n${text}`;
        }

        const resp = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: env.RESEND_FROM,
            to: [record.email],
            subject, html, text,
            headers: {
              'List-Unsubscribe': `<${unsubscribeUrl}>`,
              'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
            },
          }),
        });

        if (!resp.ok) {
          report.errors.push({ email: record.email, status: resp.status, body: (await resp.text()).slice(0, 200) });
          continue; // not stamped — next run retries this subscriber
        }

        // Stamp AFTER the send succeeds; a stamp with no mail behind it would
        // permanently silence this subscriber for the month.
        if (correction) record.correctedMonth = current.month; else record.lastNotifiedMonth = current.month;
        await env.SUBSCRIBERS.put(keyInfo.name, JSON.stringify(record));
        report.sent.push({ email: record.email, reason });
      } catch (e) {
        report.errors.push({ email: record.email, error: String(e).slice(0, 200) });
      }
    }
    cursor = list.list_complete ? null : list.cursor;
  } while (cursor);

  report.sentCount = report.sent.length;
  return json({ success: report.errors.length === 0, ...report });
}
