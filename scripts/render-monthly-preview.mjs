// One-off: render the monthly bulletin update email for a single real case and send it
// to a review inbox via Resend, so the content/design direction can be signed off before
// scripts/send-monthly.js (the real per-subscriber batch sender) gets built.
//
// Usage:
//   RESEND_API_KEY=re_xxx RESEND_FROM="Green Card Tracker <bulletin@mail.jmjvc.us>" \
//     node scripts/render-monthly-preview.mjs
//
// Not wired into package.json — this is a throwaway preview script, not a repeatable task.

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { applyRecentRateOverride, computeCaseUpdate } from './lib/gcMath.mjs';
import { renderMonthlyUpdateEmail } from '../functions/api/_emailTemplates.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

// Recipient and case come from the environment — this repo is public, so a real
// address or a real priority date must never be committed here.
//   PREVIEW_TO=you@example.com PREVIEW_CAT=F4 PREVIEW_COUNTRY=China PREVIEW_PD=2015-06-01
const PREVIEW_TO = process.env.PREVIEW_TO;
const SITE_URL = process.env.SITE_URL || 'https://gc.jmjvc.us';
const USER_CASE = {
  category: process.env.PREVIEW_CAT || 'F4',
  country: process.env.PREVIEW_COUNTRY || 'China',
  priorityDate: process.env.PREVIEW_PD || '2015-06-01',
};
const LANGUAGE = process.env.PREVIEW_LANG || 'zh';

const monthLabel = (month, lang) => {
  const [y, m] = month.split('-');
  return lang === 'en' ? `${y}-${m}` : `${y}年${parseInt(m, 10)}月`;
};

async function main() {
  const historyRaw = await readFile(path.join(REPO_ROOT, 'public/history.json'), 'utf-8');
  const history = JSON.parse(historyRaw);
  const months = history.months.slice().sort((a, b) => a.month.localeCompare(b.month));

  applyRecentRateOverride(history.months);

  const current = months[months.length - 1];
  const previous = months[months.length - 2];
  console.log(`Comparing ${previous.month} -> ${current.month}`);

  const update = computeCaseUpdate({
    cat: USER_CASE.category,
    country: USER_CASE.country,
    priorityDate: USER_CASE.priorityDate,
    current,
    previous,
    historyMonths: history.months,
  });

  console.log('Final Action:', update.finalAction.previous, '->', update.finalAction.current, update.finalAction.movement);
  console.log('Filing:', update.filing.previous, '->', update.filing.current, update.filing.movement);
  console.log('Forecast:', update.forecast);

  // No live UNSUBSCRIBE_SECRET available to this script — this is a one-off preview,
  // not a real subscriber send, so the unsubscribe link is a labeled placeholder.
  const unsubscribeUrl = `${SITE_URL}/api/unsubscribe?email=${encodeURIComponent(PREVIEW_TO)}&token=preview-not-functional`;

  // bulletin.json carries the notice sections and USCIS designation that history.json
  // lacks — same two extra sources the production sender fetches over HTTP.
  let notices = null, uscisChart = null, noticeI18n = null;
  try {
    const bulletin = JSON.parse(await readFile(path.join(REPO_ROOT, 'public/bulletin.json'), 'utf-8'));
    if (Array.isArray(bulletin?.current?.notices)) notices = bulletin.current.notices;
    try {
      const trs = JSON.parse(await readFile(path.join(REPO_ROOT, 'public/notice-translations.json'), 'utf-8'));
      noticeI18n = trs?.months?.[bulletin?.current?.month] || null;
    } catch {}
    const uscis = JSON.parse(await readFile(path.join(REPO_ROOT, 'public/uscis-charts.json'), 'utf-8'));
    if (uscis?.current?.month === current.month) uscisChart = uscis.current;
  } catch {}

  const { subject, html, text } = renderMonthlyUpdateEmail({
    email: PREVIEW_TO,
    userCase: USER_CASE,
    update,
    notices,
    noticeI18n,
    uscisChart,
    bulletinMonthLabel: monthLabel(current.month, LANGUAGE),
    language: LANGUAGE,
    siteUrl: SITE_URL,
    unsubscribeUrl,
  });

  console.log('Subject:', subject);

  // Written out so the layout can be eyeballed in a browser without burning a send.
  const outPath = '/tmp/gc-monthly-preview.html';
  await writeFile(outPath, html, 'utf-8');
  console.log('HTML written to', outPath);

  if (update.forecast?.series) {
    console.log('Chart series (month, days):');
    console.log('  ' + update.forecast.series.map((s) => `${s.month}:${s.days}`).join('  '));
  }

  if (process.argv.includes('--dry-run')) {
    console.log('--dry-run: not sending.');
    return;
  }

  if (!PREVIEW_TO) {
    console.error('PREVIEW_TO not set — refusing to send. Pass the recipient via env.');
    process.exit(1);
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!apiKey || !from) {
    console.error('RESEND_API_KEY / RESEND_FROM not set in env — not sending. Set both to actually send the preview.');
    process.exit(1);
  }

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: [PREVIEW_TO], subject, html, text }),
  });

  if (!resp.ok) {
    console.error('Resend send failed:', resp.status, await resp.text());
    process.exit(1);
  }
  const data = await resp.json();
  console.log('Sent. Resend id:', data.id);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
