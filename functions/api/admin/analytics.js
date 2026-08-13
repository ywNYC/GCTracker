// Cloudflare Pages Function: GET /api/admin/analytics?days=30
// Aggregates the an:<day>:<sid> beacon records into per-day visit stats:
// sessions, unique visitors, dwell-time distribution, language / case-configured /
// subscribed splits. Same Bearer ADMIN_TOKEN auth as the other admin endpoints.
//
// Scans only the trailing `days` window (default 30, max 90 = full retention),
// one list() per day, with gets inside each day batched via Promise.all. A prior
// version listed the whole `an:` prefix and awaited get() one key at a time,
// which was fine at "a few hundred keys" but started 524-ing on Cloudflare Pages
// once accumulated beacon records passed roughly a thousand.

export async function onRequestGet(context) {
  const { request, env } = context;

  const auth = request.headers.get('Authorization') || '';
  if (!env.ADMIN_TOKEN || auth !== `Bearer ${env.ADMIN_TOKEN}`) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(request.url);
  const windowDays = Math.min(Math.max(parseInt(url.searchParams.get('days'), 10) || 30, 1), 90);

  const dayList = [];
  const today = new Date();
  for (let i = 0; i < windowDays; i++) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    dayList.push(d.toISOString().slice(0, 10));
  }

  const GET_BATCH = 50;
  const bySid = [];
  for (const day of dayList) {
    let cursor;
    do {
      const list = await env.SUBSCRIBERS.list({ prefix: `an:${day}:`, cursor });
      for (let i = 0; i < list.keys.length; i += GET_BATCH) {
        const batch = list.keys.slice(i, i + GET_BATCH);
        const vals = await Promise.all(batch.map((k) => env.SUBSCRIBERS.get(k.name)));
        batch.forEach((k, idx) => {
          let rec = null;
          try { rec = JSON.parse(vals[idx]); } catch {}
          if (rec) bySid.push({ day, sid: k.name.split(':')[2], ...rec });
        });
      }
      cursor = list.list_complete ? null : list.cursor;
    } while (cursor);
  }

  const days = {};
  for (const r of bySid) {
    const d = (days[r.day] ||= { sessions: 0, vids: new Set(), dwells: [], langs: {}, withCase: 0, subscribed: 0 });
    d.sessions += 1;
    d.vids.add(r.vid);
    d.dwells.push(r.dwellMs || 0);
    if (r.lang) d.langs[r.lang] = (d.langs[r.lang] || 0) + 1;
    if (r.hasCase) d.withCase += 1;
    if (r.subscribed) d.subscribed += 1;
  }

  const median = (a) => {
    if (!a.length) return 0;
    const s = a.slice().sort((x, y) => x - y);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };

  const out = Object.keys(days).sort().map((day) => {
    const d = days[day];
    return {
      day,
      sessions: d.sessions,
      uniqueVisitors: d.vids.size,
      avgDwellSec: Math.round(d.dwells.reduce((s, x) => s + x, 0) / d.dwells.length / 1000),
      medianDwellSec: Math.round(median(d.dwells) / 1000),
      maxDwellSec: Math.round(Math.max(0, ...d.dwells) / 1000),
      withCase: d.withCase,
      subscribed: d.subscribed,
      langs: d.langs,
    };
  });

  const allDwells = bySid.map((r) => r.dwellMs || 0);
  const totals = {
    sessions: bySid.length,
    uniqueVisitors: new Set(bySid.map((r) => r.vid)).size,
    avgDwellSec: allDwells.length ? Math.round(allDwells.reduce((s, x) => s + x, 0) / allDwells.length / 1000) : 0,
    medianDwellSec: Math.round(median(allDwells) / 1000),
  };

  return new Response(JSON.stringify({ totals, days: out }, null, 2), {
    headers: { 'Content-Type': 'application/json' },
  });
}
