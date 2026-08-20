// Cloudflare Pages Function: GET /api/admin/subscribers
// Returns all subscribers. Requires ADMIN_TOKEN env var for auth.
//
// Usage:
//   curl https://your-site.pages.dev/api/admin/subscribers \
//     -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
//
// Optional query params:
//   ?format=csv  - returns CSV instead of JSON (easier to bulk-process)
//   ?lang=zh     - filter by language
//   ?category=EB3 - filter by user case category

export async function onRequestGet(context) {
  const { request, env } = context;

  // Auth check
  const authHeader = request.headers.get('authorization') || '';
  const expectedAuth = `Bearer ${env.ADMIN_TOKEN || ''}`;
  if (!env.ADMIN_TOKEN || authHeader !== expectedAuth) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!env.SUBSCRIBERS) {
    return new Response(JSON.stringify({ error: 'KV namespace SUBSCRIBERS not bound' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(request.url);
  const format = url.searchParams.get('format') || 'json';
  const langFilter = url.searchParams.get('lang');
  const categoryFilter = url.searchParams.get('category');
  const confirmedFilter = url.searchParams.get('confirmed');

  try {
    // List all keys (KV supports cursor-based pagination; for MVP scale we assume < 1000)
    const subscribers = [];
    let cursor;
    do {
      const list = await env.SUBSCRIBERS.list({ cursor });
      for (const keyInfo of list.keys) {
        // Rate-limit counters share this namespace under an `rl:` prefix and hold a
        // bare number, not a subscriber record. Skip them by key rather than relying
        // on JSON.parse happening to throw.
        if (keyInfo.name.startsWith('rl:')) continue;
        if (keyInfo.name.startsWith('an:')) continue; // analytics beacons
        if (keyInfo.name.startsWith('ev:') || keyInfo.name.startsWith('es:')) continue; // email events
        if (keyInfo.name.startsWith('pr:') || keyInfo.name.startsWith('prl:')) continue; // progress reports
        if (keyInfo.name.startsWith('cd:') || keyInfo.name.startsWith('crl:')) continue; // community data
        if (keyInfo.name.startsWith('trkl:')) continue; // tracker page rate-limit counters
        const raw = await env.SUBSCRIBERS.get(keyInfo.name);
        if (!raw) continue;
        try {
          const record = JSON.parse(raw);
          // Apply filters
          if (langFilter && record.language !== langFilter) continue;
          if (categoryFilter && record.userCase?.category !== categoryFilter) continue;
          // ?confirmed=true → only double-opt-in-completed subscribers (what you'd
          // actually mail); ?confirmed=false → only those who never clicked through.
          if (confirmedFilter === 'true' && record.confirmed !== true) continue;
          if (confirmedFilter === 'false' && record.confirmed === true) continue;
          subscribers.push(record);
        } catch {}
      }
      cursor = list.list_complete ? null : list.cursor;
    } while (cursor);

    if (format === 'csv') {
      const csv = toCSV(subscribers);
      return new Response(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="subscribers.csv"',
        },
      });
    }

    return new Response(
      JSON.stringify({ success: true, count: subscribers.length, subscribers }, null, 2),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('List failed:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

function toCSV(records) {
  const headers = [
    'email', 'name', 'country', 'category', 'subtype', 'priorityDate', 'inUS', 'petitionerStatus',
    'language', 'whenCurrent', 'whenEligible', 'monthlyUpdates', 'retrogression',
    'subscribedAt', 'lastUpdated', 'subscriberCountry',
  ];
  const escape = (v) => {
    if (v === null || v === undefined) return '';
    const s = String(v);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const rows = records.map((r) => [
    escape(r.email),
    escape(r.name),
    escape(r.userCase?.country),
    escape(r.userCase?.category),
    escape(r.userCase?.subtype),
    escape(r.userCase?.priorityDate),
    escape(r.userCase?.inUS),
    escape(r.userCase?.petitionerStatus),
    escape(r.language),
    escape(r.alerts?.whenCurrent),
    escape(r.alerts?.whenEligible),
    escape(r.alerts?.monthlyUpdates),
    escape(r.alerts?.retrogression),
    escape(r.subscribedAt),
    escape(r.lastUpdated),
    escape(r.country),
  ].join(','));
  return [headers.join(','), ...rows].join('\n');
}
