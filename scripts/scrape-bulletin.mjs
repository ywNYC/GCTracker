#!/usr/bin/env node
// scripts/scrape-bulletin.mjs
//
// Scrapes the latest Visa Bulletin from travel.state.gov and writes it to ./bulletin.json.
// Designed to run in GitHub Actions on a monthly cron schedule.
//
// Zero dependencies: uses built-in fetch (Node 20+) and fs.
//
// Exit codes:
//   0 — Success (either new data written, or nothing to update). Check bulletin.json diff.
//   1 — Transient error (network, etc). Workflow can retry next day.
//   2 — Validation failure (parser broke). Needs human attention.
//
// Usage:
//   node scripts/scrape-bulletin.mjs            # Normal mode (for cron)
//   node scripts/scrape-bulletin.mjs --seed     # Force seed current month (first run)

import fs from 'node:fs';
import path from 'node:path';

// ============================================================
// CONFIG
// ============================================================

const BULLETIN_JSON_PATH = 'bulletin.json'; // at repo root -> served at /bulletin.json
const USER_AGENT = 'VisaBulletinAutoScraper/1.0 (GitHub Action; informational tool)';

// ============================================================
// PARSER (inlined, no external deps)
// ============================================================

const MONTH_ABBR = {
  JAN: '01', FEB: '02', MAR: '03', APR: '04', MAY: '05', JUN: '06',
  JUL: '07', AUG: '08', SEP: '09', OCT: '10', NOV: '11', DEC: '12',
};
const MONTH_FULL = {
  january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
  july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
};
const MONTH_NAMES_LOWER = Object.keys(MONTH_FULL);

function parseDate(str) {
  if (!str) return null;
  const trimmed = str.trim().toUpperCase();
  if (trimmed === '' || trimmed === '-' || trimmed === 'U' || trimmed === 'N/A') return null;
  if (trimmed === 'C' || trimmed === 'CURRENT') return 'C';
  const m = trimmed.replace(/\s+/g, '').match(/^(\d{1,2})([A-Z]{3})(\d{2,4})$/);
  if (!m) return null;
  const day = m[1].padStart(2, '0');
  const month = MONTH_ABBR[m[2]];
  if (!month) return null;
  let year = m[3];
  if (year.length === 2) year = '20' + year;
  return `${year}-${month}-${day}`;
}

function classifyColumn(headerText) {
  const t = headerText.toUpperCase();
  if (t.includes('CHINA') || t.includes('MAINLAND')) return 'China';
  if (t.includes('INDIA')) return 'India';
  if (t.includes('MEXICO')) return 'Mexico';
  if (t.includes('PHILIPPINES')) return 'Philippines';
  if (t.includes('ALL') || t.includes('CHARGEABILITY') || t.includes('AREAS') ||
      t.includes('OTHER') || t.includes('ROW')) return 'Other';
  return null;
}

function classifyRow(rowLabel, section) {
  const t = rowLabel.trim().toUpperCase().replace(/\s+/g, ' ');
  if (section === 'employment') {
    if (/^1ST\b/.test(t) || t === '1ST' || t.startsWith('FIRST')) return 'EB1';
    if (/^2ND\b/.test(t) || t === '2ND' || t.startsWith('SECOND')) return 'EB2';
    if (/^3RD\b/.test(t) || t === '3RD' || t.startsWith('THIRD')) return 'EB3';
    return null;
  } else {
    if (t === 'F1' || t.startsWith('F1 ')) return 'F1';
    if (t === 'F2A' || t.startsWith('F2A ')) return 'F2A';
    if (t === 'F2B' || t.startsWith('F2B ')) return 'F2B';
    if (t === 'F3' || t.startsWith('F3 ')) return 'F3';
    if (t === 'F4' || t.startsWith('F4 ')) return 'F4';
    return null;
  }
}

function stripHtml(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function parseTable(tableHtml, section) {
  const result = {};
  const rowMatches = [...tableHtml.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  if (rowMatches.length < 2) return null;

  // Find the header row (has >= 4 cells and at least 3 country classifications)
  let headers = [];
  let headerRowIdx = -1;
  for (let i = 0; i < rowMatches.length && i < 3; i++) {
    const cells = [...rowMatches[i][1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)];
    if (cells.length >= 4) {
      headers = cells.map((c) => classifyColumn(stripHtml(c[1])));
      if (headers.filter((h) => h !== null).length >= 3) {
        headerRowIdx = i;
        break;
      }
    }
  }
  if (headerRowIdx === -1) return null;

  for (let i = headerRowIdx + 1; i < rowMatches.length; i++) {
    const cells = [...rowMatches[i][1].matchAll(/<t[hd][^>]*>([\s\S]*?)<\/t[hd]>/gi)];
    if (cells.length < 2) continue;
    const rowLabel = stripHtml(cells[0][1]);
    const categoryKey = classifyRow(rowLabel, section);
    if (!categoryKey) continue;
    result[categoryKey] = {};
    for (let j = 1; j < cells.length && j < headers.length; j++) {
      const countryKey = headers[j];
      if (!countryKey) continue;
      result[categoryKey][countryKey] = parseDate(stripHtml(cells[j][1]));
    }
  }
  return Object.keys(result).length > 0 ? result : null;
}

function findNextTable(html, startOffset) {
  const slice = html.slice(startOffset);
  const match = slice.match(/<table[^>]*>([\s\S]*?)<\/table>/i);
  if (!match) return null;
  return { html: match[0], endOffset: startOffset + match.index + match[0].length };
}

function findHeading(html, markerRegex, startOffset = 0) {
  const slice = html.slice(startOffset);
  const match = slice.match(markerRegex);
  if (!match) return -1;
  return startOffset + match.index;
}

function parseVisaBulletinHTML(html, targetMonth) {
  const result = {
    month: targetMonth || '',
    scrapedAt: new Date().toISOString(),
    finalAction: {},
    filing: {},
  };

  const titleMatch = html.match(/visa\s+bulletin\s+for\s+(\w+)\s+(\d{4})/i) ||
                     html.match(/visa-bulletin-for-(\w+)-(\d{4})/i);
  if (titleMatch) {
    const monthName = titleMatch[1].toLowerCase();
    const year = titleMatch[2];
    const monthNum = MONTH_FULL[monthName];
    if (monthNum) result.month = `${year}-${monthNum}`;
  }

  const sections = [
    { marker: /a\.?\s*final\s+action\s+dates?\s+for\s+employment/i, kind: 'employment', target: 'finalAction' },
    { marker: /b\.?\s*dates?\s+for\s+filing\s+of\s+employment/i,    kind: 'employment', target: 'filing' },
    { marker: /a\.?\s*final\s+action\s+dates?\s+for\s+family/i,      kind: 'family',     target: 'finalAction' },
    { marker: /b\.?\s*dates?\s+for\s+filing\s+(?:applications\s+)?(?:for\s+)?family/i, kind: 'family', target: 'filing' },
  ];

  let cursor = 0;
  for (const sec of sections) {
    const headingIdx = findHeading(html, sec.marker, cursor);
    if (headingIdx === -1) continue;
    const tableInfo = findNextTable(html, headingIdx);
    if (!tableInfo) continue;
    const parsed = parseTable(tableInfo.html, sec.kind);
    if (parsed) result[sec.target] = { ...result[sec.target], ...parsed };
    cursor = tableInfo.endOffset;
  }

  return result;
}

function validateParsedBulletin(data) {
  const errors = [];
  if (!data.month || !/^\d{4}-\d{2}$/.test(data.month)) errors.push(`Invalid month: ${data.month}`);
  const expectedCats = ['EB1', 'EB2', 'EB3', 'F1', 'F2A', 'F2B', 'F3', 'F4'];
  const expectedCountries = ['Other', 'China', 'India', 'Mexico', 'Philippines'];
  for (const section of ['finalAction', 'filing']) {
    for (const cat of expectedCats) {
      if (!data[section][cat]) { errors.push(`Missing ${section}.${cat}`); continue; }
      for (const country of expectedCountries) {
        if (!(country in data[section][cat])) errors.push(`Missing ${section}.${cat}.${country}`);
      }
    }
  }
  return { valid: errors.length === 0, errors };
}

// ============================================================
// FETCH LOGIC
// ============================================================

function monthTargetFromOffset(offsetMonths) {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth() + offsetMonths, 1);
  const year = target.getFullYear();
  const monthIdx = target.getMonth();
  const monthName = MONTH_NAMES_LOWER[monthIdx];
  const monthStr = String(monthIdx + 1).padStart(2, '0');
  return {
    year, monthIdx, monthName,
    monthKey: `${year}-${monthStr}`,
    monthLabel: `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`,
  };
}

const nextMonthTarget = () => monthTargetFromOffset(1);
const currentMonthTarget = () => monthTargetFromOffset(0);

function buildBulletinUrl(year, monthName) {
  return `https://travel.state.gov/content/travel/en/legal/visa-law0/visa-bulletin/${year}/visa-bulletin-for-${monthName}-${year}.html`;
}

async function fetchBulletinHTML(year, monthName) {
  const url = buildBulletinUrl(year, monthName);
  console.log(`→ Fetching: ${url}`);
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT, 'Accept': 'text/html' } });
  if (response.status === 404) return { html: null, status: 404, url };
  if (!response.ok) throw new Error(`Fetch failed ${response.status}: ${response.statusText}`);
  const html = await response.text();
  return { html, status: 200, url };
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  const args = process.argv.slice(2);
  const seedMode = args.includes('--seed');

  // Read existing bulletin.json if any
  let existing = null;
  if (fs.existsSync(BULLETIN_JSON_PATH)) {
    try {
      existing = JSON.parse(fs.readFileSync(BULLETIN_JSON_PATH, 'utf8'));
      console.log(`Existing bulletin.json: current=${existing.current?.month}, previous=${existing.previous?.month || 'none'}`);
    } catch (e) {
      console.warn(`Existing bulletin.json is corrupt: ${e.message}`);
      existing = null;
    }
  } else {
    console.log('No existing bulletin.json — first run (seeding mode)');
  }

  const isFirstRun = existing === null || seedMode;
  const storedCurrentMonth = existing?.current?.month;

  // Decide what to fetch:
  //   - First run: fetch CURRENT month first (to seed data quickly)
  //   - Normal: fetch NEXT month (bulletin for next month is published in current month)
  const target = isFirstRun ? currentMonthTarget() : nextMonthTarget();
  console.log(`Target: ${target.monthKey} (${target.monthLabel}) — mode: ${isFirstRun ? 'seed' : 'next-month'}`);

  // Skip if we already have target
  if (storedCurrentMonth === target.monthKey) {
    console.log(`✓ Already have ${target.monthKey}, nothing to do.`);
    process.exit(0);
  }

  // Fetch
  let { html, status, url } = await fetchBulletinHTML(target.year, target.monthName);

  // If NEXT month isn't published yet and this is first run, fall back to CURRENT month
  if (status === 404 && isFirstRun === false) {
    console.log(`${target.monthKey} not yet published (404). Nothing to do this run.`);
    process.exit(0);
  }
  if (status === 404 && isFirstRun === true) {
    console.log(`${target.monthKey} not available. Trying current month as seed fallback...`);
    const fallback = currentMonthTarget();
    const r2 = await fetchBulletinHTML(fallback.year, fallback.monthName);
    if (r2.status !== 200) {
      console.error(`Seed fallback also failed: ${r2.status}`);
      process.exit(1);
    }
    html = r2.html; url = r2.url;
    target.monthKey = fallback.monthKey;
    target.monthLabel = fallback.monthLabel;
  }

  // Parse
  const parsed = parseVisaBulletinHTML(html, target.monthKey);
  console.log(`Parsed: finalAction=${Object.keys(parsed.finalAction).length} cats, filing=${Object.keys(parsed.filing).length} cats`);

  // Validate
  const validation = validateParsedBulletin(parsed);
  if (!validation.valid) {
    console.error('❌ VALIDATION FAILED:');
    validation.errors.forEach((e) => console.error(`  - ${e}`));
    console.error('\nThis usually means travel.state.gov changed their HTML structure.');
    console.error(`Verify manually at: ${url}`);
    console.error('Partial parsed data:', JSON.stringify(parsed, null, 2));
    process.exit(2); // Exit code 2 = needs human attention
  }

  // Write
  const newData = {
    lastUpdated: new Date().toISOString(),
    source: 'github-actions-auto',
    sourceUrl: url,
    current: parsed,
    previous: existing?.current || null, // Rotate: old current → previous
  };
  fs.writeFileSync(BULLETIN_JSON_PATH, JSON.stringify(newData, null, 2) + '\n', 'utf8');
  console.log(`✅ Wrote ${BULLETIN_JSON_PATH} — new month: ${target.monthKey}`);

  // Print summary for GitHub Actions log
  console.log('\n--- Summary ---');
  for (const cat of ['EB1', 'EB2', 'EB3', 'F1', 'F2A', 'F2B', 'F3', 'F4']) {
    const fa = parsed.finalAction[cat] || {};
    console.log(`${cat} Final Action: ROW=${fa.Other}  CN=${fa.China}  IN=${fa.India}  MX=${fa.Mexico}  PH=${fa.Philippines}`);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error('💥 Unexpected error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
