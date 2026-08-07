// Scrapes USCIS's monthly "which chart applies to I-485 filings" determination.
//
// The visa bulletin itself never contains this answer — it only says "check
// uscis.gov/visabulletininfo". USCIS designates one of the two charts (Final Action
// Dates / Dates for Filing) separately for family and employment categories, usually
// within a week of the DOS bulletin. This writes public/uscis-charts.json, which:
//   - functions/api/admin/send-monthly.js reads to put the definitive answer in email
//   - src/App.jsx reads to override the hardcoded FILING_AUTHORIZED table
//
// Usage:  node scripts/scrape-uscis-chart.mjs
//
// Exit codes (same contract as scrape-bulletin.mjs):
//   0 = ok (written, or nothing new)   1 = network failure   2 = parse failure

import fs from 'node:fs';

const OUT_PATH = 'public/uscis-charts.json';
const SOURCE_URL = 'https://www.uscis.gov/visabulletininfo';
// uscis.gov serves fine to a browser UA; the bare default UA is the risky one.
const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

const MONTHS = {
  january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
  july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
};

const stripToText = (html) => html
  .replace(/&nbsp;|&#160;|&#xa0;/gi, ' ')
  .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/g, '&').replace(/&#39;|&rsquo;|’/g, "'")
  .replace(/\s+/g, ' ');

// One designation sentence, e.g.:
//   "For all family-sponsored preference categories, you must use the Dates for
//    Filing chart in the Department of State Visa Bulletin for August 2026."
const SENTENCE = /for all (family-sponsored|employment-based) preference categories,? you must use the (dates for filing|final action dates) chart[^.]*?visa bulletin for (\w+) (\d{4})/gi;

export function parseUscisCharts(html) {
  const text = stripToText(html);

  // Section boundaries keep a leftover "next month" sentence from overwriting the
  // current month's designation (both use identical wording).
  const curIdx = text.search(/Current Month'?s Adjustment of Status Filing Charts/i);
  const nextIdx = text.search(/Next Month'?s Adjustment of Status Filing Charts/i);
  const prevIdx = text.search(/Previous Adjustment of Status Filing Charts/i);
  if (curIdx === -1) return null;

  const sectionOf = (idx) => {
    if (nextIdx !== -1 && idx > nextIdx && (prevIdx === -1 || idx < prevIdx)) return 'next';
    if (idx > curIdx && (nextIdx === -1 || idx < nextIdx)) return 'current';
    return null;
  };

  const result = { current: null, next: null };
  for (const m of text.matchAll(SENTENCE)) {
    const section = sectionOf(m.index);
    if (!section) continue;
    const kind = m[1].toLowerCase().startsWith('family') ? 'family' : 'employment';
    const chart = m[2].toLowerCase() === 'dates for filing' ? 'filing' : 'finalAction';
    const monthNum = MONTHS[m[3].toLowerCase()];
    if (!monthNum) continue;
    const month = `${m[4]}-${monthNum}`;
    result[section] = result[section] || { month, family: null, employment: null };
    result[section][kind] = chart;
    // Guard against a section mixing months (would mean the page changed shape)
    if (result[section].month !== month) return null;
  }

  // Current month must be fully designated; "next" is legitimately absent most of
  // the month (USCIS posts it about a week after the DOS bulletin).
  if (!result.current || !result.current.family || !result.current.employment) return null;
  if (result.next && (!result.next.family || !result.next.employment)) result.next = null;
  return result;
}

async function main() {
  let resp;
  try {
    resp = await fetch(SOURCE_URL, {
      headers: { 'User-Agent': USER_AGENT, 'Accept': 'text/html' },
      redirect: 'follow',
    });
  } catch (e) {
    console.error(`Network error: ${e.message}`);
    process.exit(1);
  }
  if (!resp.ok) {
    console.error(`Fetch failed: ${resp.status} ${resp.statusText}`);
    process.exit(1);
  }
  const html = await resp.text();
  console.log(`Fetched ${html.length} bytes from ${resp.url}`);

  const parsed = parseUscisCharts(html);
  if (!parsed) {
    console.error('Parse failed — USCIS changed the page structure. Verify manually at:');
    console.error(`  ${SOURCE_URL}`);
    process.exit(2);
  }

  let existing = null;
  if (fs.existsSync(OUT_PATH)) {
    try { existing = JSON.parse(fs.readFileSync(OUT_PATH, 'utf8')); } catch {}
  }
  const unchanged = existing
    && JSON.stringify(existing.current) === JSON.stringify(parsed.current)
    && JSON.stringify(existing.next) === JSON.stringify(parsed.next);
  if (unchanged) {
    console.log(`✓ No change (current=${parsed.current.month}), nothing to write.`);
    process.exit(0);
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify({
    scrapedAt: new Date().toISOString(),
    sourceUrl: SOURCE_URL,
    ...parsed,
  }, null, 2) + '\n', 'utf8');
  console.log(`✅ Wrote ${OUT_PATH}`);
  console.log(`   current ${parsed.current.month}: family=${parsed.current.family} employment=${parsed.current.employment}`);
  if (parsed.next) console.log(`   next ${parsed.next.month}: family=${parsed.next.family} employment=${parsed.next.employment}`);
  process.exit(0);
}

const isDirectRun = process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop());
if (isDirectRun) main();
