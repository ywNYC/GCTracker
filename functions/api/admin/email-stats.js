// Cloudflare Pages Function: GET /api/admin/email-stats
// Aggregates the Resend webhook events (ev: rows + es: rollups) into the numbers
// that actually judge the mailing: delivery rate, open rate, click rate, and the
// two lists worth acting on — hard bounces (dead addresses) and complaints
// (people who hit "spam", who must never be mailed again).
//
// Auth: Bearer ADMIN_TOKEN, same as the other admin endpoints.
// Optional: ?days=30 to limit the event window (default: everything retained).

export async function onRequestGet(context) {
  const { request, env } = context;

  const auth = request.headers.get('Authorization') || '';
  if (!env.ADMIN_TOKEN || auth !== `Bearer ${env.ADMIN_TOKEN}`) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(request.url);
  const days = parseInt(url.searchParams.get('days') || '0', 10);
  const since = days > 0
    ? new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)
    : '0000-00-00';

  const events = [];
  let cursor;
  do {
    const list = await env.SUBSCRIBERS.list({ prefix: 'ev:', cursor });
    for (const k of list.keys) {
      const day = k.name.split(':')[1] || '';
      if (day < since) continue;
      try {
        const rec = JSON.parse(await env.SUBSCRIBERS.get(k.name));
        if (rec) events.push(rec);
      } catch { /* skip malformed */ }
    }
    cursor = list.list_complete ? null : list.cursor;
  } while (cursor);

  const byType = {};
  const byDay = {};
  const perEmail = {};
  let unverified = 0;
  for (const e of events) {
    byType[e.type] = (byType[e.type] || 0) + 1;
    const d = (byDay[String(e.ts).slice(0, 10)] ||= {});
    d[e.type] = (d[e.type] || 0) + 1;
    const pe = (perEmail[e.email] ||= {});
    pe[e.type] = (pe[e.type] || 0) + 1;
    if (!e.verified) unverified += 1;
  }

  // Rates are per-ADDRESS, not per-event: one reader opening the same mail six
  // times is one open. Denominator is delivered where we have it, else sent.
  const addrs = Object.keys(perEmail);
  const countAddrs = (t) => addrs.filter((a) => perEmail[a][t]).length;
  const delivered = countAddrs('delivered');
  const sent = countAddrs('sent');
  const base = delivered || sent;
  const opened = countAddrs('opened');
  const clicked = countAddrs('clicked');
  const pct = (a, b) => (b > 0 ? Math.round((a / b) * 1000) / 10 : null);

  const bounced = events
    .filter((e) => e.type === 'bounced')
    .map((e) => ({ email: e.email, ts: e.ts, bounceType: e.bounceType, reason: e.reason }));
  const complained = events
    .filter((e) => e.type === 'complained')
    .map((e) => ({ email: e.email, ts: e.ts }));
  // Reached the inbox but never opened anything — the retention risk list.
  const neverOpened = addrs.filter((a) => (perEmail[a].delivered || perEmail[a].sent) && !perEmail[a].opened);

  return new Response(JSON.stringify({
    windowDays: days > 0 ? days : null,
    totals: {
      events: events.length,
      addresses: addrs.length,
      sent, delivered, opened, clicked,
      deliveryRatePct: pct(delivered, sent),
      openRatePct: pct(opened, base),
      clickRatePct: pct(clicked, base),
      unverifiedEvents: unverified,
    },
    byType,
    byDay,
    actionable: { bounced, complained, neverOpened },
  }, null, 2), { headers: { 'Content-Type': 'application/json' } });
}
