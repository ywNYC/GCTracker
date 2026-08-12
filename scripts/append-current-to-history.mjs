#!/usr/bin/env node
// scripts/append-current-to-history.mjs
//
// Upserts the just-scraped public/bulletin.json's `current` snapshot into
// public/history.json, keyed by month. Unlike backfill-history.mjs (which
// refetches N months from the origin), this reuses data scrape-bulletin.mjs
// already wrote — no network calls, safe to run on every scrape.
//
// Only writes history.json when the entry actually changed. This matters
// because the workflow's "commit if changed" step git-diffs history.json
// alongside bulletin.json — an unconditional rewrite (e.g. touching
// generatedAt every run) would trigger a spurious commit, and downstream
// of that, a spurious send-monthly call, on every no-op scrape.
//
// Usage: node scripts/append-current-to-history.mjs
// Exit codes: 0 = ok (written or already up to date), 1 = bulletin.json unusable.

import fs from 'node:fs';

const BULLETIN_PATH = 'public/bulletin.json';
const HISTORY_PATH = 'public/history.json';

const bulletin = JSON.parse(fs.readFileSync(BULLETIN_PATH, 'utf8'));
const history = JSON.parse(fs.readFileSync(HISTORY_PATH, 'utf8'));

const { month, finalAction, filing } = bulletin.current || {};
if (!month || !finalAction || !filing) {
  console.error('bulletin.json current is missing month/finalAction/filing — nothing to append.');
  process.exit(1);
}

const entry = {
  month,
  sourceUrl: bulletin.sourceUrl || bulletin.source || '',
  finalAction,
  filing,
};

const idx = history.months.findIndex((m) => m.month === month);
const unchanged = idx !== -1 && JSON.stringify(history.months[idx]) === JSON.stringify(entry);

if (unchanged) {
  console.log(`history.json: ${month} already up to date, skipping write.`);
  process.exit(0);
}

if (idx === -1) {
  history.months.push(entry);
} else {
  history.months[idx] = entry;
}
history.months.sort((a, b) => a.month.localeCompare(b.month));
history.generatedAt = new Date().toISOString();
history.monthCount = history.months.length;
history.earliest = history.months[0].month;
history.latest = history.months[history.months.length - 1].month;

fs.writeFileSync(HISTORY_PATH, JSON.stringify(history, null, 2) + '\n', 'utf8');
console.log(`history.json: upserted ${month} — now ${history.monthCount} months, ${history.earliest} … ${history.latest}`);
