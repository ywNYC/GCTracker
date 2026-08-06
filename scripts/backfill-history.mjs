#!/usr/bin/env node
// scripts/backfill-history.mjs
//
// Builds public/history.json — a real, month-by-month archive of past visa bulletins.
//
// Why this exists: before it, the app had no historical data at all. The trend chart
// back-projected a straight line from a hardcoded days/month table, and the forecast
// derived its "observed" rate from a single month-over-month delta. Both are replaced
// by the real series this produces.
//
// Reuses the parser from scrape-bulletin.mjs so there is exactly one implementation.
//
// Usage:
//   node scripts/backfill-history.mjs --months=24          # write public/history.json
//   node scripts/backfill-history.mjs --months=24 --dry    # fetch + validate only
//
// Exit codes: 0 = ok, 1 = nothing usable fetched.

import fs from 'node:fs';
import {
  fetchBulletinHTML,
  parseVisaBulletinHTML,
  validateParsedBulletin,
  monthTargetFromKey,
} from './scrape-bulletin.mjs';

const OUT_PATH = 'public/history.json';
const DELAY_MS = 400; // be polite to the origin

const args = process.argv.slice(2);
const dryRun = args.includes('--dry');
const monthsArg = args.find((a) => a.startsWith('--months='));
const MONTHS = monthsArg ? Number(monthsArg.slice('--months='.length)) : 24;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Walk backwards from the current month.
function monthKeysBack(count) {
  const keys = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return keys;
}

async function main() {
  const keys = monthKeysBack(MONTHS);
  console.log(`Backfilling ${keys.length} months: ${keys[keys.length - 1]} … ${keys[0]}\n`);

  const months = [];
  const failures = [];

  for (const key of keys) {
    const target = monthTargetFromKey(key);
    let res;
    try {
      res = await fetchBulletinHTML(target.year, target.monthName);
    } catch (e) {
      console.log(`${key}  ✗ fetch: ${e.message}`);
      failures.push([key, `fetch: ${e.message}`]);
      await sleep(DELAY_MS);
      continue;
    }

    if (res.status === 404 || !res.html) {
      console.log(`${key}  ✗ 404`);
      failures.push([key, '404']);
      await sleep(DELAY_MS);
      continue;
    }

    const parsed = parseVisaBulletinHTML(res.html, key);
    const { valid, errors } = validateParsedBulletin(parsed);

    // The page title is authoritative for which month this actually is; if it
    // disagrees with the URL we requested, the origin served something else.
    if (parsed.month !== key) {
      console.log(`${key}  ✗ 页面月份是 ${parsed.month}，与请求不符`);
      failures.push([key, `month mismatch: ${parsed.month}`]);
      await sleep(DELAY_MS);
      continue;
    }

    if (!valid) {
      console.log(`${key}  ✗ 解析不完整 (${errors.length} 项): ${errors.slice(0, 3).join(', ')}`);
      failures.push([key, `invalid: ${errors.length} errors`]);
      await sleep(DELAY_MS);
      continue;
    }

    months.push({
      month: key,
      sourceUrl: res.url,
      finalAction: parsed.finalAction,
      filing: parsed.filing,
    });
    const eb3 = parsed.finalAction.EB3 || {};
    const f4 = parsed.finalAction.F4 || {};
    console.log(`${key}  ✓  EB3-CN=${eb3.China}  F4-CN=${f4.China}`);
    await sleep(DELAY_MS);
  }

  months.sort((a, b) => a.month.localeCompare(b.month)); // oldest → newest

  console.log(`\n成功 ${months.length} / ${keys.length}`);
  if (failures.length) {
    console.log('失败:');
    for (const [k, why] of failures) console.log(`  ${k}  ${why}`);
  }

  if (!months.length) {
    console.error('\n一个月份都没抓到，不写文件。');
    process.exit(1);
  }

  if (dryRun) {
    console.log('\n--dry: 未写入文件。');
    process.exit(0);
  }

  const out = {
    generatedAt: new Date().toISOString(),
    monthCount: months.length,
    earliest: months[0].month,
    latest: months[months.length - 1].month,
    months,
  };
  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + '\n', 'utf8');
  console.log(`\n✅ 写入 ${OUT_PATH} — ${months[0].month} … ${months[months.length - 1].month}`);
}

main().catch((err) => {
  console.error('💥', err.message);
  process.exit(1);
});
