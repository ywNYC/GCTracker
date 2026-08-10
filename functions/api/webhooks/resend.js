// Cloudflare Pages Function: POST /api/webhooks/resend
//
// Receives Resend delivery events (sent / delivered / opened / clicked / bounced /
// complained / delivery_delayed) so we can measure what actually happens to the
// monthly bulletin emails — subscriber count alone says nothing about whether the
// mail lands and gets read.
//
// Setup (Resend dashboard → Webhooks):
//   Endpoint: https://gc.jmjvc.us/api/webhooks/resend
//   Events:   all email.* events
//   Then put the signing secret (whsec_…) into Cloudflare Pages as
//   RESEND_WEBHOOK_SECRET and trigger a new deployment.
//   Open/click tracking must ALSO be switched on per-domain in Resend, otherwise
//   those two event types are never emitted.
//
// Storage (SUBSCRIBERS KV, prefixes that every subscriber-listing endpoint skips):
//   ev:<yyyy-mm-dd>:<id>  one raw event, TTL 180 days
//   es:<email>            per-address rollup (counts + last event), no TTL
//
// Signature verification is Svix-style: HMAC-SHA256 over "<id>.<timestamp>.<body>"
// keyed with the base64 body of the secret. Unsigned/unverifiable posts are still
// recorded but flagged `verified:false`, so data starts flowing the moment the
// endpoint is registered and the flag shows whether the secret is wired up yet.

const EVENT_TTL_S = 180 * 24 * 3600;
const TOLERANCE_S = 5 * 60;

const b64ToBytes = (b64) => {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
};
const bytesToB64 = (buf) => {
  const bytes = new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
};

async function verifySvix(secret, headers, body) {
  const id = headers.get('svix-id') || headers.get('webhook-id');
  const ts = headers.get('svix-timestamp') || headers.get('webhook-timestamp');
  const sigHeader = headers.get('svix-signature') || headers.get('webhook-signature');
  if (!secret || !id || !ts || !sigHeader) return false;

  // Replay guard: an old-but-valid signature must not be accepted forever.
  const age = Math.abs(Math.floor(Date.now() / 1000) - parseInt(ts, 10));
  if (!isFinite(age) || age > TOLERANCE_S) return false;

  const keyBytes = b64ToBytes(secret.replace(/^whsec_/, ''));
  const key = await crypto.subtle.importKey(
    'raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${id}.${ts}.${body}`));
  const expected = bytesToB64(mac);

  // The header carries one or more space-separated "v1,<sig>" pairs (key rotation).
  return sigHeader.split(' ').some((part) => {
    const [version, sig] = part.split(',');
    if (version !== 'v1' || !sig || sig.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
    return diff === 0;
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  let raw;
  try {
    raw = await request.text();
    if (raw.length > 64 * 1024) return new Response(null, { status: 413 });
  } catch {
    return new Response(null, { status: 400 });
  }

  const verified = await verifySvix(env.RESEND_WEBHOOK_SECRET, request.headers, raw);
  if (env.RESEND_WEBHOOK_SECRET && !verified) {
    // A secret IS configured, so a bad signature is a real rejection.
    return new Response(JSON.stringify({ error: 'invalid signature' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    });
  }

  let evt;
  try { evt = JSON.parse(raw); } catch { return new Response(null, { status: 400 }); }

  const type = String(evt?.type || '').replace(/^email\./, '');
  const data = evt?.data || {};
  const to = Array.isArray(data.to) ? data.to[0] : data.to;
  const email = typeof to === 'string' ? to.trim().toLowerCase() : '';
  const ts = evt?.created_at || data.created_at || new Date().toISOString();

  if (!type || !email) return new Response(null, { status: 204 });

  const day = String(ts).slice(0, 10);
  const id = (crypto.randomUUID && crypto.randomUUID()) || `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  try {
    await env.SUBSCRIBERS.put(
      `ev:${day}:${id}`,
      JSON.stringify({
        type, email, ts, verified,
        subject: data.subject || '',
        emailId: data.email_id || '',
        // Bounce/complaint detail is the actionable part — keep the reason text.
        reason: data.bounce?.message || data.reason || '',
        bounceType: data.bounce?.type || '',
        link: data.click?.link || '',
      }),
      { expirationTtl: EVENT_TTL_S }
    );

    // Per-address rollup: cheap to read when deciding who never opens anything.
    const key = `es:${email}`;
    let roll = {};
    try { roll = JSON.parse(await env.SUBSCRIBERS.get(key)) || {}; } catch { /* noop */ }
    roll[type] = (roll[type] || 0) + 1;
    roll.lastType = type;
    roll.lastAt = ts;
    await env.SUBSCRIBERS.put(key, JSON.stringify(roll));
  } catch (err) {
    console.error('resend webhook store failed:', err);
    // Still 200: Resend retries on failure and we would rather drop one event than
    // have it redelivered forever against a KV that is rejecting writes.
  }

  return new Response(JSON.stringify({ ok: true, type, verified }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
