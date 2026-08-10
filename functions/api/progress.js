// Cloudflare Pages Function: /api/progress
//
// Anonymous, crowd-sourced filing-progress reports — the "people who filed the
// same month as you" dataset. No email, no receipt number, no identity: one row
// is just {category, country, filedMonth, milestone, ts}.
//
//   POST {cat, country, filedMonth: "YYYY-MM", milestone}
//     → stored as pr:<cat>:<uuid>, TTL 2 years
//   GET  ?cat=EB2
//     → { total, byMilestone, byFiledMonth } aggregates
//
// Storage shares the SUBSCRIBERS namespace under pr:/prl: prefixes — every
// subscriber-listing consumer must skip them (send-monthly, subscribers).

const CATS = ['EB1', 'EB2', 'EB3', 'EW', 'EB4', 'SR', 'EB5', 'EB5R', 'EB5H', 'EB5I',
  'F1', 'F2A', 'F2B', 'F3', 'F4'];
const MILESTONES = ['filed', 'receipt', 'ead', 'interview', 'approved'];
const COUNTRIES = ['China', 'India', 'Taiwan', 'Mexico', 'Philippines', 'Other'];
const TTL_S = 730 * 24 * 3600;
const RL_MAX_PER_DAY = 5;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

export async function onRequestPost(context) {
  const { request, env } = context;

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  // Light per-IP daily cap: this is a write-once-a-milestone endpoint, not a feed.
  try {
    const rlKey = `prl:${ip}:${new Date().toISOString().slice(0, 10)}`;
    const n = parseInt((await env.SUBSCRIBERS.get(rlKey)) || '0', 10);
    if (n >= RL_MAX_PER_DAY) return json({ error: 'rate limited' }, 429);
    await env.SUBSCRIBERS.put(rlKey, String(n + 1), { expirationTtl: 86400 });
  } catch { /* limiter must never break reporting */ }

  let body;
  try {
    const raw = await request.text();
    if (raw.length > 512) return json({ error: 'too large' }, 413);
    body = JSON.parse(raw);
  } catch {
    return json({ error: 'bad json' }, 400);
  }

  const cat = CATS.includes(body.cat) ? body.cat : null;
  const milestone = MILESTONES.includes(body.milestone) ? body.milestone : null;
  const country = COUNTRIES.includes(body.country) ? body.country : 'Other';
  const fm = typeof body.filedMonth === 'string' && /^20\d{2}-(0[1-9]|1[0-2])$/.test(body.filedMonth)
    ? body.filedMonth : null;
  const nowMonth = new Date().toISOString().slice(0, 7);
  if (!cat || !milestone || !fm || fm < '2020-01' || fm > nowMonth) {
    return json({ error: 'invalid fields' }, 400);
  }

  const id = (crypto.randomUUID && crypto.randomUUID()) || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await env.SUBSCRIBERS.put(
    `pr:${cat}:${id}`,
    JSON.stringify({ cat, country, filedMonth: fm, milestone, ts: new Date().toISOString() }),
    { expirationTtl: TTL_S }
  );
  return json({ ok: true });
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const cat = url.searchParams.get('cat');
  if (!CATS.includes(cat)) return json({ error: 'invalid cat' }, 400);

  const byMilestone = {};
  const byFiledMonth = {};
  let total = 0;
  let cursor;
  do {
    const list = await env.SUBSCRIBERS.list({ prefix: `pr:${cat}:`, cursor });
    for (const k of list.keys) {
      try {
        const rec = JSON.parse(await env.SUBSCRIBERS.get(k.name));
        if (!rec) continue;
        total += 1;
        byMilestone[rec.milestone] = (byMilestone[rec.milestone] || 0) + 1;
        byFiledMonth[rec.filedMonth] = (byFiledMonth[rec.filedMonth] || 0) + 1;
      } catch { /* skip malformed */ }
    }
    cursor = list.list_complete ? null : list.cursor;
  } while (cursor);

  return json({ cat, total, byMilestone, byFiledMonth });
}
