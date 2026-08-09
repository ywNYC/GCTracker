// Cloudflare Pages Function: GET /api/admin/analytics
// Aggregates the an:<day>:<sid> beacon records into per-day visit stats:
// sessions, unique visitors, dwell-time distribution, language / case-configured /
// subscribed splits. Same Bearer ADMIN_TOKEN auth as the other admin endpoints.

export async function onRequestGet(context) {
  const { request, env } = context;

  const auth = request.headers.get('Authorization') || '';
  if (!env.ADMIN_TOKEN || auth !== `Bearer ${env.ADMIN_TOKEN}`) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    });
  }

  // Collect all an: records (small site — a few hundred keys at most).
  const bySid = [];
  let cursor;
  do {
    const list = await env.SUBSCRIBERS.list({ prefix: 'an:', cursor });
    for (const k of list.keys) {
      const [, day, sid] = k.name.split(':');
      let rec = null;
      try { rec = JSON.parse(await env.SUBSCRIBERS.get(k.name)); } catch {}
      if (rec) bySid.push({ day, sid, ...rec });
    }
    cursor = list.list_complete ? null : list.cursor;
  } while (cursor);

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
