// Cloudflare Pages Function: /api/tracker
//
// Backend for the batch-based case-progress wall (TRACKER-PLAN.md). Mirrors the
// client-side logic that used to live in src/Tracker.jsx's MOCK_CASES draft
// (computeBatch / chart buckets / stage distribution / walked-through dates),
// but moved server-side on purpose: K_MIN, coarse() and median-only are
// enforced HERE, not in the browser. A client that reads the network response
// directly must never see another person's exact record — only aggregates.
//
//   POST body {ownerId, cat, country, priorityDate, path, center, dates}
//     → upsert into D1 `cases` (one row per owner_id), rate-limited by IP.
//     → returns the same hydrate payload as GET ?owner=, so the frontend
//       never needs a second round trip right after submitting.
//   GET  ?owner=<ownerId>   → hydrate payload for a returning visitor.
//   GET  ?summary=1         → site-wide counts, no ownerId needed (LockedTeaser).
//
// D1 table: see d1/tracker-schema.sql. Enums intentionally match src/Tracker.jsx
// (a SUBSET of community.js's — Tracker doesn't offer SR/EB5R/EB5H/EB5I yet).

const CATS = ['EB1', 'EB2', 'EB3', 'EW', 'EB4', 'EB5', 'F1', 'F2A', 'F2B', 'F3', 'F4'];
const COUNTRIES = ['China', 'India', 'Taiwan', 'Mexico', 'Philippines', 'Other'];
const CENTERS = ['NSC', 'TSC', 'Potomac', 'MSC', 'other-center', 'guangzhou', 'other-consulate', 'unknown'];
const STEPS = ['filed', 'receipt', 'bio', 'intSched', 'interview', 'approved'];
const STEP_LABEL = { filed: '递交', receipt: '收件', bio: '指纹', intSched: '面试排期', interview: '面试', approved: '批准' };
const STEP_COL = { filed: 'd_filed', receipt: 'd_receipt', bio: 'd_bio', intSched: 'd_int_sched', interview: 'd_interview', approved: 'd_approved' };
const MIN_PD = '2005-01-01';
const K_MIN = 5;
const IP_DAILY_CAP = 3;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

const today = () => new Date().toISOString().slice(0, 10);
const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v));
const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
const monthsBetween = (a, b) => Math.round(daysBetween(a, b) / 30.44);
const coarse = (d) => (d ? d.slice(0, 7) : null);
const quarterOf = (d) => `${d.slice(0, 4)}Q${Math.floor((+d.slice(5, 7) - 1) / 3) + 1}`;
const batchShort = (pd) => `${pd.slice(0, 4)} 年 Q${quarterOf(pd).slice(-1)}`;

const median = (arr) => {
  if (!arr.length) return null;
  const s = arr.slice().sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};

// Index of the furthest-along step this row has a date for, or -1 if none.
const stageIdxOf = (row) => {
  let k = -1;
  STEPS.forEach((s, i) => { if (row[STEP_COL[s]]) k = i; });
  return k;
};

const rowDates = (row) => {
  const d = {};
  for (const s of STEPS) if (row[STEP_COL[s]]) d[s] = row[STEP_COL[s]];
  return d;
};

// ============================================================
// Aggregation shared by both `batch` (exact quarter) and `cat` (whole
// cat+country, all quarters) scopes. `rows` must already be scoped.
// ============================================================
function aggregate(rows, myStageIdx) {
  const waits = rows.map((r) => monthsBetween(r.priority_date, r.d_approved || today()));
  const approvedN = rows.filter((r) => r.d_approved).length;

  const stageCounts = STEPS.map((s, i) => ({ key: s, label: STEP_LABEL[s], count: 0, mine: i === myStageIdx }));
  let notFiled = 0;
  for (const r of rows) {
    const idx = stageIdxOf(r);
    if (idx < 0) notFiled += 1; else stageCounts[idx].count += 1;
  }

  const walked = {};
  for (const s of STEPS) {
    const col = STEP_COL[s];
    const hits = rows.filter((r) => r[col]).map((r) => coarse(r[col])).sort();
    if (hits.length) walked[s] = { count: hits.length, first: hits[0], last: hits[hits.length - 1] };
  }

  return {
    total: rows.length,
    medianWait: median(waits),
    approvedN,
    stageDist: { counts: stageCounts, notFiled, max: Math.max(1, ...stageCounts.map((c) => c.count)) },
    walked,
  };
}

// ============================================================
// Subscriber population — the opt-in `cases` D1 table starts near-empty on
// launch day, so an early adopter sees "共 1 人" and every chart stays
// hidden, not because the site is dead but because nobody else has clicked
// "加入" yet. SUBSCRIBERS KV already holds every confirmed email
// subscriber's {category, country, priorityDate} from the signup form —
// same population asking the same question, just a different entry point —
// so total/median/mean/rank/the quarter histogram merge it in. Stage-by-
// stage progress (filed/receipt/bio/...) stays D1-only: subscribers never
// report those dates, so mixing them in would make it look like ~90 people
// "haven't filed" when we simply don't know.
// ============================================================
// v1 measured 12s on a cold cache (list() then a plain `for` loop awaiting one
// env.SUBSCRIBERS.get() at a time — ~100+ sequential round trips) — whichever
// visitor's request landed right after the 15min TTL expired paid that tax
// synchronously. v2: fetch in parallel chunks (cuts a cold rebuild to ~1-2s),
// AND never block a request on a stale cache — serve what's cached (however
// old) immediately and kick the rebuild off in the background via waitUntil.
// Only a true first-ever cold start (empty cache, nobody has visited yet since
// this code shipped) still blocks once.
const SUB_CACHE_KEY = 'cs:subpop:v2';
const SUB_STALE_MS = 15 * 60 * 1000;  // older than this → serve stale, refresh in background
const SUB_CACHE_TTL = 3600;           // KV expirationTtl safety net if nothing ever refreshes it
const SUB_FETCH_CHUNK = 20;           // parallel .get() batch size
const SUB_SKIP_PREFIXES = ['rl:', 'an:', 'ev:', 'es:', 'pr:', 'prl:', 'cd:', 'crl:', 'trkl:'];

async function rebuildSubscriberPopulation(env) {
  const rows = [];
  try {
    let cursor;
    do {
      const list = await env.SUBSCRIBERS.list({ cursor });
      const candidates = list.keys.filter((k) => !SUB_SKIP_PREFIXES.some((p) => k.name.startsWith(p)));
      for (let i = 0; i < candidates.length; i += SUB_FETCH_CHUNK) {
        const chunk = candidates.slice(i, i + SUB_FETCH_CHUNK);
        const vals = await Promise.all(chunk.map((k) => env.SUBSCRIBERS.get(k.name).catch(() => null)));
        for (const raw of vals) {
          if (!raw) continue;
          let rec;
          try { rec = JSON.parse(raw); } catch { continue; }
          if (!rec || rec.confirmed !== true) continue;
          const uc = rec.userCase;
          if (!uc || !CATS.includes(uc.category) || !COUNTRIES.includes(uc.country)) continue;
          if (!isDate(uc.priorityDate) || uc.priorityDate < MIN_PD || uc.priorityDate > today()) continue;
          rows.push({ cat: uc.category, country: uc.country, priority_date: uc.priorityDate });
        }
      }
      cursor = list.list_complete ? null : list.cursor;
    } while (cursor);
  } catch { /* partial listing still returns what we got so far */ }

  try {
    await env.SUBSCRIBERS.put(SUB_CACHE_KEY, JSON.stringify({ builtAt: Date.now(), rows }), { expirationTtl: SUB_CACHE_TTL });
  } catch {}
  return rows;
}

// waitUntil is optional (undefined in contexts that don't pass one through) —
// falls back to blocking on the rebuild rather than silently skipping it.
async function subscriberPopulation(env, waitUntil) {
  let cached = null;
  try {
    const raw = await env.SUBSCRIBERS.get(SUB_CACHE_KEY);
    if (raw) cached = JSON.parse(raw);
  } catch { /* fall through to a live rebuild */ }

  if (cached) {
    if (Date.now() - (cached.builtAt || 0) > SUB_STALE_MS) {
      const refresh = rebuildSubscriberPopulation(env).catch(() => {});
      if (waitUntil) waitUntil(refresh); else await refresh;
    }
    return cached.rows;
  }
  return rebuildSubscriberPopulation(env);
}

// total/medianWait/meanWait only — no stage fields, so this is the shape
// merged D1+subscriber rows can share (subscriber rows have no d_approved,
// which correctly falls back to "still waiting since priority_date").
function aggregatePop(rows) {
  const waits = rows.map((r) => monthsBetween(r.priority_date, r.d_approved || today()));
  return {
    total: rows.length,
    medianWait: median(waits),
    meanWait: waits.length ? Math.round(waits.reduce((a, b) => a + b, 0) / waits.length) : null,
  };
}

// How long people have actually waited (priority_date → approved, or → today if
// still waiting), bucketed — not what step they're on. Uses the same merged
// D1+subscriber population as popAgg, so it's populated even for visitors who
// never filled in stage dates (unlike the old stage-progress funnel).
const WAIT_BUCKETS = [
  { key: 'lt1', label: '不到1年', maxMonths: 12 },
  { key: '1to2', label: '1-2年', maxMonths: 24 },
  { key: '2to3', label: '2-3年', maxMonths: 36 },
  { key: '3to5', label: '3-5年', maxMonths: 60 },
  { key: 'gt5', label: '5年以上', maxMonths: Infinity },
];
const bucketIdxOf = (months) => {
  const i = WAIT_BUCKETS.findIndex((b) => months < b.maxMonths);
  return i < 0 ? WAIT_BUCKETS.length - 1 : i;
};
function waitHistogram(rows, myMonths) {
  const counts = WAIT_BUCKETS.map((b) => ({ key: b.key, label: b.label, count: 0, mine: false }));
  for (const r of rows) counts[bucketIdxOf(monthsBetween(r.priority_date, r.d_approved || today()))].count += 1;
  counts[bucketIdxOf(myMonths)].mine = true;
  return { counts, max: Math.max(1, ...counts.map((c) => c.count)) };
}

async function recentTicker(env) {
  const { results } = await env.DB.prepare(
    `SELECT cat, country, priority_date, updated_at FROM cases WHERE d_approved IS NOT NULL ORDER BY updated_at DESC LIMIT 20`
  ).all();
  const now = Date.now();
  return results
    .map((r) => ({
      batchShort: batchShort(r.priority_date),
      cat: r.cat,
      country: r.country,
      daysAgo: Math.max(0, Math.floor((now - Date.parse(r.updated_at)) / 86400000)),
    }))
    .sort((a, b) => a.daysAgo - b.daysAgo)
    .slice(0, 3);
}

async function hydrate(env, ownerId, waitUntil) {
  const me = await env.DB.prepare(`SELECT * FROM cases WHERE owner_id = ?`).bind(ownerId).first();
  if (!me) return null;

  const { results: catRows } = await env.DB.prepare(
    `SELECT * FROM cases WHERE cat = ? AND country = ?`
  ).bind(me.cat, me.country).all();
  const subPop = await subscriberPopulation(env, waitUntil);
  const subCatRows = subPop.filter((r) => r.cat === me.cat && r.country === me.country);

  const myQuarter = quarterOf(me.priority_date);
  // "batch" used to mean "same quarter" — narrow enough that most visitors' quarter
  // had nobody else in it, tripping the K_MIN gate even though the category as a
  // whole has plenty of people. It now means "same cat+country", same population as
  // `cat` below; only the label ("2024 年 Q3 这一批") still names your own quarter.
  // D1-only for stage funnel (subscribers never report stage dates).
  const mates = catRows;
  const subMates = subCatRows;
  const mergedBatchRows = [...mates, ...subMates];                                       // for total/median/mean/rank
  const myStageIdx = stageIdxOf(me);

  const stageAgg = aggregate(mates, myStageIdx);
  const popAgg = aggregatePop(mergedBatchRows);
  const rank = mergedBatchRows.filter((r) => r.priority_date < me.priority_date).length + 1;
  const others = mates.filter((r) => r.owner_id !== ownerId);
  const fresh = others.length ? Math.min(...others.map((r) => Math.max(0, Math.floor((Date.now() - Date.parse(r.updated_at)) / 86400000)))) : null;

  const mergedCatRows = [...catRows, ...subCatRows];
  const catPopAgg = aggregatePop(mergedCatRows);
  const catStageAgg = aggregate(catRows, myStageIdx);
  const chartMap = new Map();
  for (const r of mergedCatRows) {
    const q = quarterOf(r.priority_date);
    const cur = chartMap.get(q) || { q, count: 0, mine: q === myQuarter };
    cur.count += 1;
    chartMap.set(q, cur);
  }
  const buckets = [...chartMap.values()].sort((a, b) => a.q.localeCompare(b.q));
  const myMonths = monthsBetween(me.priority_date, me.d_approved || today());
  const waitHist = waitHistogram(mergedCatRows, myMonths);

  return {
    record: {
      cat: me.cat, country: me.country, priorityDate: me.priority_date,
      path: me.path, center: me.center, dates: rowDates(me),
    },
    batch: {
      label: `${batchShort(me.priority_date)} · ${me.cat} · ${me.country}`,
      short: batchShort(me.priority_date),
      rank, fresh,
      enough: popAgg.total >= K_MIN,
      needMore: Math.max(0, K_MIN - popAgg.total),
      sameStep: mates.filter((r) => r.owner_id !== ownerId && stageIdxOf(r) === myStageIdx).length,
      total: popAgg.total, medianWait: popAgg.medianWait, meanWait: popAgg.meanWait,
      approvedN: stageAgg.approvedN,
      stageDist: stageAgg.stageDist, stageN: mates.length, walked: stageAgg.walked,
      waitHist,
    },
    cat: {
      total: catPopAgg.total, medianWait: catPopAgg.medianWait, meanWait: catPopAgg.meanWait,
      approvedN: catStageAgg.approvedN, stageDist: catStageAgg.stageDist, stageN: catRows.length, walked: catStageAgg.walked,
      waitHist,
      chart: { buckets, max: Math.max(1, ...buckets.map((b) => b.count)) },
    },
    ticker: await recentTicker(env),
  };
}

export async function onRequestPost(context) {
  const { request, env, waitUntil } = context;
  if (!env.DB) return json({ error: 'D1 binding DB not configured' }, 500);

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  try {
    const rlKey = `trkl:${ip}:${today()}`;
    const n = parseInt((await env.SUBSCRIBERS.get(rlKey)) || '0', 10);
    if (n >= IP_DAILY_CAP) return json({ error: 'rate limited' }, 429);
    await env.SUBSCRIBERS.put(rlKey, String(n + 1), { expirationTtl: 86400 });
  } catch { /* limiter must never block submission */ }

  let body;
  try {
    const raw = await request.text();
    if (raw.length > 2048) return json({ error: 'too large' }, 413);
    body = JSON.parse(raw);
  } catch { return json({ error: 'bad json' }, 400); }

  const ownerId = typeof body.ownerId === 'string' && /^[a-zA-Z0-9-]{8,64}$/.test(body.ownerId) ? body.ownerId : null;
  const cat = CATS.includes(body.cat) ? body.cat : null;
  const country = COUNTRIES.includes(body.country) ? body.country : null;
  const center = CENTERS.includes(body.center) ? body.center : 'unknown';
  const path = body.path === 'cp' ? 'cp' : 'aos';
  const priorityDate = isDate(body.priorityDate) ? body.priorityDate : null;
  const t = today();

  if (!ownerId || !cat || !country) return json({ error: 'invalid fields' }, 400);
  if (!priorityDate || priorityDate < MIN_PD || priorityDate > t) return json({ error: 'invalid priorityDate' }, 400);

  const dates = {};
  let last = priorityDate;
  for (const s of STEPS) {
    const d = body.dates?.[s];
    if (d === undefined || d === null || d === '') continue;
    if (!isDate(d) || d < last || d > t) return json({ error: `invalid date for ${s}` }, 400);
    dates[s] = d;
    last = d;
  }

  const ipHash = Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`gctracker-ipsalt:${ip}`)))
  ).map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);

  const existing = await env.DB.prepare(`SELECT id, created_at FROM cases WHERE owner_id = ?`).bind(ownerId).first();
  const id = existing?.id || (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const createdAt = existing?.created_at || new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO cases (id, owner_id, cat, country, priority_date, path, center,
       d_filed, d_receipt, d_bio, d_int_sched, d_interview, d_approved,
       created_at, updated_at, ip_hash)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
     ON CONFLICT(owner_id) DO UPDATE SET
       cat=excluded.cat, country=excluded.country, priority_date=excluded.priority_date,
       path=excluded.path, center=excluded.center,
       d_filed=excluded.d_filed, d_receipt=excluded.d_receipt, d_bio=excluded.d_bio,
       d_int_sched=excluded.d_int_sched, d_interview=excluded.d_interview, d_approved=excluded.d_approved,
       updated_at=excluded.updated_at, ip_hash=excluded.ip_hash`
  ).bind(
    id, ownerId, cat, country, priorityDate, path, center,
    dates.filed || null, dates.receipt || null, dates.bio || null,
    dates.intSched || null, dates.interview || null, dates.approved || null,
    createdAt, new Date().toISOString(), ipHash
  ).run();

  const payload = await hydrate(env, ownerId, waitUntil);
  return json({ ok: true, ...payload });
}

export async function onRequestGet(context) {
  const { request, env, waitUntil } = context;
  if (!env.DB) return json({ error: 'D1 binding DB not configured' }, 500);

  const url = new URL(request.url);

  if (url.searchParams.get('summary') === '1') {
    const totalRow = await env.DB.prepare(`SELECT COUNT(*) AS n FROM cases`).first();
    const approvedRow = await env.DB.prepare(`SELECT COUNT(*) AS n FROM cases WHERE d_approved IS NOT NULL`).first();
    const { results: pdRows } = await env.DB.prepare(`SELECT cat, country, priority_date FROM cases`).all();
    const batches = new Set(pdRows.map((r) => `${r.cat}|${r.country}|${quarterOf(r.priority_date)}`));
    return json({
      ok: true, totalCases: totalRow?.n || 0, totalBatches: batches.size,
      approvedCount: approvedRow?.n || 0, ticker: await recentTicker(env),
    });
  }

  const owner = url.searchParams.get('owner');
  if (owner) {
    const payload = await hydrate(env, owner, waitUntil);
    if (!payload) return json({ ok: true, record: null });
    return json({ ok: true, ...payload });
  }

  return json({ error: 'missing owner or summary=1' }, 400);
}
