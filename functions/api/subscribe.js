// Cloudflare Pages Function: POST/DELETE /api/subscribe
// Handles email subscriptions for the green card bulletin assistant.
//
// Required bindings (Cloudflare Pages → Settings → Variables and Secrets):
//   - SUBSCRIBERS         (KV namespace binding)
//   - RESEND_API_KEY      (encrypted secret — Resend API key, format: re_xxx)
//   - RESEND_FROM         (plain text — sender, e.g. "Green Card Tracker <bulletin@mail.jmjvc.us>")
//   - SITE_URL            (plain text — e.g. "https://gc.jmjvc.us") — used in email links
//
// Optional:
//   - ADMIN_TOKEN         (used by /api/admin/subscribers.js)
//   - UNSUBSCRIBE_SECRET  (plain text — any random string, used to sign unsubscribe tokens)
//
// Behavior:
//   - POST: store/update subscriber in KV, then send welcome email via Resend.
//     Email failure does NOT fail the subscription (email is best-effort).
//   - DELETE: remove subscriber from KV.

import { renderWelcomeEmail, renderConfirmEmail } from './_emailTemplates.js';

// Locked to this site's own origin. The frontend calls /api/subscribe same-origin, so
// this changes nothing for real users, but it stops the endpoint being driven from
// someone else's page. SITE_URL isn't available at module scope, hence the literal.
const ALLOWED_ORIGIN = 'https://gc.jmjvc.us';

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
  'Vary': 'Origin',
};

// ---- Rate limiting ----
// Per-IP cap on subscribe attempts. Without it a script can burn the daily Resend
// quota and the KV write allowance in seconds. Counters live in the same KV namespace
// under an `rl:` prefix with a TTL, so they expire on their own and never need sweeping.
// KV is eventually consistent, so a determined attacker can exceed this slightly under
// heavy concurrency — it's a spend cap, not a security boundary.
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_S = 3600;

async function checkRateLimit(env, ip) {
  if (!ip || ip === 'unknown') return { ok: true };
  const key = `rl:${ip}`;
  let count = 0;
  try {
    const raw = await env.SUBSCRIBERS.get(key);
    count = raw ? parseInt(raw, 10) || 0 : 0;
  } catch {
    return { ok: true }; // never let the limiter itself break subscribing
  }
  if (count >= RATE_LIMIT_MAX) return { ok: false, count };
  try {
    await env.SUBSCRIBERS.put(key, String(count + 1), { expirationTtl: RATE_LIMIT_WINDOW_S });
  } catch {}
  return { ok: true, count: count + 1 };
}

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });

const isValidEmail = (email) =>
  typeof email === 'string' && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// ---- Unsubscribe token ----
// Lightweight HMAC so the unsubscribe link can't be guessed/forged for arbitrary emails.
// If UNSUBSCRIBE_SECRET is not set, falls back to a (still hard-to-guess) hash of the email
// + a static fallback. The fallback is fine for an MVP but you should set the secret in prod.

async function signEmail(email, secret) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret || 'gctracker-default-fallback-please-set-secret'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(email));
  // Convert to URL-safe base64 (truncated to 16 chars; collision-resistant enough for unsub links)
  const b64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return b64.slice(0, 16);
}

// Separate purpose string so a confirm token can never be replayed as an unsubscribe
// token (or the reverse) — they are derived from the same secret.
export async function buildConfirmToken(email, env) {
  return signEmail(`confirm:${email}`, env.UNSUBSCRIBE_SECRET);
}

async function buildConfirmUrl(email, env) {
  const siteUrl = (env.SITE_URL || 'https://gc.jmjvc.us').replace(/\/+$/, '');
  const token = await buildConfirmToken(email, env);
  return `${siteUrl}/api/confirm?email=${encodeURIComponent(email)}&token=${token}`;
}

// Exported for admin/send-monthly.js — the monthly update mail carries the same
// signed unsubscribe link as the welcome mail.
export async function buildUnsubscribeUrl(email, env) {
  const siteUrl = env.SITE_URL || 'https://gc.jmjvc.us';
  const token = await signEmail(email, env.UNSUBSCRIBE_SECRET);
  return `${siteUrl}/api/unsubscribe?email=${encodeURIComponent(email)}&token=${token}`;
}

// ---- Resend ----

// Sent by /api/confirm once the recipient has proved they own the address.
export async function sendWelcomeEmail({ env, email, userCase, alerts, language }) {
  if (!env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set, skipping welcome email');
    return { skipped: true };
  }
  if (!env.RESEND_FROM) {
    console.warn('RESEND_FROM not set, skipping welcome email');
    return { skipped: true };
  }

  const siteUrl = env.SITE_URL || 'https://gc.jmjvc.us';
  const unsubscribeUrl = await buildUnsubscribeUrl(email, env);

  const { subject, html, text } = renderWelcomeEmail({
    email,
    userCase,
    alerts,
    language,
    siteUrl,
    unsubscribeUrl,
  });

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.RESEND_FROM,
      to: [email],
      subject,
      html,
      text,
      // RFC 8058 one-click unsubscribe header — Gmail/Yahoo require this for bulk senders.
      // Resend will pass these through.
      headers: {
        'List-Unsubscribe': `<${unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    }),
  });

  if (!resp.ok) {
    const errBody = await resp.text();
    console.error('Resend send failed:', resp.status, errBody);
    return { ok: false, status: resp.status, error: errBody };
  }
  const data = await resp.json();
  return { ok: true, id: data.id };
}

async function sendConfirmEmail({ env, email, language }) {
  if (!env.RESEND_API_KEY || !env.RESEND_FROM) {
    console.warn('Resend not configured, skipping confirmation email');
    return { skipped: true };
  }
  const siteUrl = (env.SITE_URL || 'https://gc.jmjvc.us').replace(/\/+$/, '');
  const confirmUrl = await buildConfirmUrl(email, env);
  const { subject, html, text } = renderConfirmEmail({ email, language, siteUrl, confirmUrl });

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from: env.RESEND_FROM, to: [email], subject, html, text }),
  });

  if (!resp.ok) {
    const errBody = await resp.text();
    console.error('Resend confirm send failed:', resp.status, errBody);
    return { ok: false, status: resp.status, error: errBody };
  }
  return { ok: true, id: (await resp.json()).id };
}

// ---- Handlers ----

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

// POST /api/subscribe - create or update a subscription, send welcome email
export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.SUBSCRIBERS) {
    return json({ success: false, error: 'KV namespace SUBSCRIBERS not bound' }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ success: false, error: 'Invalid JSON' }, 400);
  }

  const { email, name, userCase, alerts, language } = body || {};

  if (!isValidEmail(email)) {
    return json({ success: false, error: 'Invalid email' }, 400);
  }

  const emailKey = email.trim().toLowerCase();

  const rate = await checkRateLimit(env, request.headers.get('cf-connecting-ip'));
  if (!rate.ok) {
    return json({ success: false, error: 'Too many attempts, try again later' }, 429);
  }

  // Preserve original subscribedAt timestamp if updating an existing record
  let subscribedAt = new Date().toISOString();
  const existingRaw = await env.SUBSCRIBERS.get(emailKey);
  const isUpdate = existingRaw !== null;
  let wasConfirmed = false;
  let confirmedAt = null;
  if (isUpdate) {
    try {
      const existing = JSON.parse(existingRaw);
      if (existing.subscribedAt) subscribedAt = existing.subscribedAt;
      wasConfirmed = existing.confirmed === true;
      confirmedAt = existing.confirmedAt || null;
    } catch {}
  }

  const record = {
    // Double opt-in: a record only counts as a subscriber once the recipient clicks
    // the link in the confirmation email. Until then nothing is sent to them beyond
    // that one email, so a third party cannot sign someone else up — which is what
    // protects this domain's sending reputation (and the Resend account) from
    // spam complaints over mail the recipient never asked for.
    confirmed: wasConfirmed,
    confirmedAt,
    email: emailKey,
    name: (typeof name === 'string' ? name.trim().slice(0, 50) : ''),
    userCase: userCase || null,
    alerts: alerts || {},
    language: language || 'zh',
    subscribedAt,
    lastUpdated: new Date().toISOString(),
    userAgent: (request.headers.get('user-agent') || '').slice(0, 200),
    ip: request.headers.get('cf-connecting-ip') || 'unknown',
    country: request.cf?.country || 'unknown',
  };

  try {
    await env.SUBSCRIBERS.put(emailKey, JSON.stringify(record));
  } catch (err) {
    console.error('KV put failed:', err);
    return json({ success: false, error: 'Storage failed' }, 500);
  }

  // Already-confirmed subscriber changing their preferences: nothing to re-confirm,
  // and deliberately no email — otherwise every preference tweak spams them.
  if (wasConfirmed) {
    return json({ success: true, isUpdate: true, confirmed: true, message: 'Subscription updated' });
  }

  // Not yet confirmed (new address, or a repeat request for one that never confirmed):
  // send the confirmation link. Repeat requests re-send it rather than erroring, since
  // the usual reason someone subscribes twice is that the first mail went missing.
  // Failures are logged but do not fail the call — the record is already stored.
  let emailResult = null;
  try {
    emailResult = await sendConfirmEmail({
      env,
      email: emailKey,
      language: record.language,
    });
  } catch (err) {
    console.error('Confirmation email error:', err);
    emailResult = { ok: false, error: String(err) };
  }

  return json({
    success: true,
    isUpdate,
    confirmed: false,
    pending: true,
    message: 'Confirmation email sent — check your inbox to activate the subscription',
    emailSent: emailResult?.ok || false,
  });
}

// DELETE /api/subscribe?email=xxx - unsubscribe (called from product UI)
export async function onRequestDelete(context) {
  const { request, env } = context;

  if (!env.SUBSCRIBERS) {
    return json({ success: false, error: 'KV namespace SUBSCRIBERS not bound' }, 500);
  }

  const url = new URL(request.url);
  const email = url.searchParams.get('email');

  if (!isValidEmail(email)) {
    return json({ success: false, error: 'Invalid email' }, 400);
  }

  try {
    await env.SUBSCRIBERS.delete(email.trim().toLowerCase());
  } catch (err) {
    console.error('KV delete failed:', err);
    return json({ success: false, error: 'Delete failed' }, 500);
  }

  return json({ success: true, message: 'Unsubscribed' });
}
