// Cloudflare Pages Function: POST /api/beacon
// Privacy-light visit telemetry: one KV record per session, overwritten as the
// client's cumulative visible-time grows, so the last write carries the session's
// total dwell. No cookies, no IP stored, no email — vid/sid are random ids the
// client mints itself (localStorage / sessionStorage).
//
// Records live in the SUBSCRIBERS namespace under an `an:` prefix (same pattern as
// the `rl:` rate-limit counters) because Pages KV bindings are dashboard-managed and
// this avoids needing a second namespace. Every consumer that lists subscriber keys
// must skip `an:` and `rl:`.
//
// Key: an:<yyyy-mm-dd>:<sid>   TTL 90 days.

const ALLOWED_ORIGIN = 'https://gc.jmjvc.us';

const ID_RE = /^[a-zA-Z0-9-]{8,40}$/;

// Mirrors the category/country lists in src/App.jsx. Anything else is dropped rather
// than stored — this is public-write telemetry with no auth, so free-text fields here
// would let anyone inject arbitrary strings into the aggregate stats.
const VALID_CATEGORIES = new Set(['EB1', 'EB2', 'EB3', 'EW', 'EB4', 'SR', 'EB5', 'EB5R', 'EB5H', 'EB5I', 'F1', 'F2A', 'F2B', 'F3', 'F4']);
const VALID_COUNTRIES = new Set(['Taiwan', 'China', 'India', 'Mexico', 'Philippines', 'Other']);
const PD_RE = /^\d{4}-\d{2}-\d{2}$/;

// UI-14: page + funnel telemetry. Tab ids mirror the App.jsx tab state (nav tabs
// plus the alias ids that also render pages: dashboard/i485 render Overview,
// compare renders the community page). Event names are the funnel steps the
// client counts in gcEv — anything off-whitelist is dropped, same as above,
// so this public endpoint can't be used to stuff arbitrary keys into the stats.
const VALID_TABS = new Set(['update', 'overview', 'dashboard', 'trends', 'compare', 'bulletin', 'index', 'alerts', 'about', 'i485', 'help']);
const VALID_EVENTS = new Set(['share_card', 'copy_link', 'subscribe_click', 'subscribe_done']);

export async function onRequestPost(context) {
  const { request, env } = context;

  // sendBeacon can't set custom headers, so no CORS preflight happens; still reject
  // cross-origin browsers that do send Origin.
  const origin = request.headers.get('Origin');
  if (origin && origin !== ALLOWED_ORIGIN && !origin.startsWith('http://localhost')) {
    return new Response(null, { status: 403 });
  }

  let body;
  try {
    const raw = await request.text();
    if (raw.length > 1024) return new Response(null, { status: 413 });
    body = JSON.parse(raw);
  } catch {
    return new Response(null, { status: 400 });
  }

  const vid = typeof body.vid === 'string' && ID_RE.test(body.vid) ? body.vid : null;
  const sid = typeof body.sid === 'string' && ID_RE.test(body.sid) ? body.sid : null;
  if (!vid || !sid) return new Response(null, { status: 400 });

  // Dwell is capped: a tab left open overnight is not a 14-hour visit.
  const dwellMs = Math.max(0, Math.min(Number(body.dwellMs) || 0, 4 * 3600 * 1000));
  const lang = ['zh', 'tw', 'en'].includes(body.lang) ? body.lang : '';
  const hasCase = body.hasCase === true;
  const subscribed = body.subscribed === true;
  const category = VALID_CATEGORIES.has(body.category) ? body.category : '';
  const country = VALID_COUNTRIES.has(body.country) ? body.country : '';
  const priorityDate = typeof body.priorityDate === 'string' && PD_RE.test(body.priorityDate) ? body.priorityDate : '';
  const subtype = typeof body.subtype === 'string' && /^[a-z0-9]{1,20}$/.test(body.subtype) ? body.subtype : '';
  // UI-14 additions — purely additive; every pre-existing field keeps its meaning.
  // tab = the page the session was on at last flush; events = cumulative per-session
  // funnel counters (the client overwrites the same record as they grow, so the
  // stored values are the session's totals, never a per-ping increment).
  const tab = VALID_TABS.has(body.tab) ? body.tab : '';
  const events = {};
  if (body.events && typeof body.events === 'object' && !Array.isArray(body.events)) {
    for (const [k, v] of Object.entries(body.events)) {
      if (!VALID_EVENTS.has(k)) continue;
      const n = Math.floor(Number(v));
      if (isFinite(n) && n > 0) events[k] = Math.min(n, 10000);
    }
  }

  const day = new Date().toISOString().slice(0, 10);
  const rec = { vid, dwellMs, lang, hasCase, subscribed, category, country, priorityDate, subtype, tab, events, ts: Date.now() };
  try {
    // Mirrored into KV metadata too: list() returns metadata inline, so the
    // admin analytics endpoint can read it straight off list() without an
    // extra get() per key (that per-key get() was blowing Workers' subrequest
    // cap once traffic grew).
    await env.SUBSCRIBERS.put(
      `an:${day}:${sid}`,
      JSON.stringify(rec),
      { expirationTtl: 90 * 24 * 3600, metadata: rec }
    );
  } catch {
    // Telemetry must never surface an error to the page.
  }
  return new Response(null, { status: 204 });
}
