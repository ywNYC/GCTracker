// Cloudflare Pages Function: GET /api/admin/analytics?days=30
// Aggregates the an:<day>:<sid> beacon records into per-day visit stats:
// sessions, unique visitors, dwell-time distribution, language / case-configured /
// subscribed splits. Same Bearer ADMIN_TOKEN auth as the other admin endpoints.
//
// Reads straight off list()'s metadata field instead of get()-ing each key.
// A prior version did one get() per key (either serially, or later batched
// with Promise.all) — both blew past Workers' per-request subrequest cap once
// beacon volume grew, either as a 524 (serial, too slow) or a thrown exception
// (batched, too many subrequests). list() metadata costs nothing extra: it's
// populated by beacon.js's put() and comes back inline with the key listing,
// so the whole scan is just a handful of paginated list() calls. Records
// written before this metadata change won't carry it and are skipped.

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
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - windowDays);
  const cutoffDay = cutoff.toISOString().slice(0, 10);

  const bySid = [];
  let cursor;
  do {
    const list = await env.SUBSCRIBERS.list({ prefix: 'an:', cursor });
    for (const k of list.keys) {
      const [, day, sid] = k.name.split(':');
      if (day < cutoffDay || !k.metadata) continue;
      bySid.push({ day, sid, ...k.metadata });
    }
    cursor = list.list_complete ? null : list.cursor;
  } while (cursor);

  const days = {};
  // One entry per vid (not per session) — a visitor pinging three times in a day with
  // the same case shouldn't triple-count in the breakdown. Last-write-wins per vid
  // per day, same as how beacon.js overwrites dwell time.
  const caseByVidDay = new Map();
  for (const r of bySid) {
    const d = (days[r.day] ||= { sessions: 0, vids: new Set(), dwells: [], langs: {}, withCase: 0, subscribed: 0, tabs: {}, events: {} });
    d.sessions += 1;
    d.vids.add(r.vid);
    d.dwells.push(r.dwellMs || 0);
    if (r.lang) d.langs[r.lang] = (d.langs[r.lang] || 0) + 1;
    if (r.hasCase) d.withCase += 1;
    if (r.subscribed) d.subscribed += 1;
    // UI-14: tab = the page this session was on at its last flush (records written
    // before UI-14 have no tab and simply don't appear in the split). events =
    // cumulative per-session funnel counters, summed across the day's sessions —
    // one session contributes its totals exactly once because beacon.js overwrites
    // a single record per session.
    if (r.tab) d.tabs[r.tab] = (d.tabs[r.tab] || 0) + 1;
    if (r.events && typeof r.events === 'object') {
      for (const [k, v] of Object.entries(r.events)) {
        if (typeof v === 'number' && v > 0) d.events[k] = (d.events[k] || 0) + v;
      }
    }
    if (r.category && r.country) {
      caseByVidDay.set(`${r.day}:${r.vid}`, { day: r.day, category: r.category, country: r.country });
    }
  }

  // Category+country distribution across ALL visitors who configured a case, whether
  // or not they ever subscribed — the whole point of carrying these fields on the
  // beacon instead of only ever seeing this breakdown for the subset who signed up.
  const caseBreakdown = {};
  for (const { category, country } of caseByVidDay.values()) {
    const key = `${category}-${country}`;
    caseBreakdown[key] = (caseBreakdown[key] || 0) + 1;
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
      tabs: d.tabs,
      events: d.events,
    };
  });

  const allDwells = bySid.map((r) => r.dwellMs || 0);
  // UI-14: window-wide funnel totals (same per-session summing as the per-day rows).
  const totalEvents = {};
  for (const r of bySid) {
    if (r.events && typeof r.events === 'object') {
      for (const [k, v] of Object.entries(r.events)) {
        if (typeof v === 'number' && v > 0) totalEvents[k] = (totalEvents[k] || 0) + v;
      }
    }
  }
  const totals = {
    sessions: bySid.length,
    uniqueVisitors: new Set(bySid.map((r) => r.vid)).size,
    avgDwellSec: allDwells.length ? Math.round(allDwells.reduce((s, x) => s + x, 0) / allDwells.length / 1000) : 0,
    medianDwellSec: Math.round(median(allDwells) / 1000),
    events: totalEvents,
  };

  return new Response(JSON.stringify({ totals, caseBreakdown, days: out }, null, 2), {
    headers: { 'Content-Type': 'application/json' },
  });
}
