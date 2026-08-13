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

  const day = new Date().toISOString().slice(0, 10);
  const rec = { vid, dwellMs, lang, hasCase, subscribed, ts: Date.now() };
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
