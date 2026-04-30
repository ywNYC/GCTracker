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

import { renderWelcomeEmail } from './_emailTemplates.js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });

const isValidEmail = (email) =>
  typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

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

async function buildUnsubscribeUrl(email, env) {
  const siteUrl = env.SITE_URL || 'https://gc.jmjvc.us';
  const token = await signEmail(email, env.UNSUBSCRIBE_SECRET);
  return `${siteUrl}/api/unsubscribe?email=${encodeURIComponent(email)}&token=${token}`;
}

// ---- Resend ----

async function sendWelcomeEmail({ env, email, userCase, alerts, language }) {
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

  // Preserve original subscribedAt timestamp if updating an existing record
  let subscribedAt = new Date().toISOString();
  const existingRaw = await env.SUBSCRIBERS.get(emailKey);
  const isUpdate = existingRaw !== null;
  if (isUpdate) {
    try {
      const existing = JSON.parse(existingRaw);
      if (existing.subscribedAt) subscribedAt = existing.subscribedAt;
    } catch {}
  }

  const record = {
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

  // Send welcome email — only on first subscribe, not on updates.
  // Failures are logged but do NOT fail the API call (subscription itself succeeded).
  let emailResult = null;
  if (!isUpdate) {
    try {
      emailResult = await sendWelcomeEmail({
        env,
        email: emailKey,
        userCase: record.userCase,
        alerts: record.alerts,
        language: record.language,
      });
    } catch (err) {
      console.error('Welcome email error:', err);
      emailResult = { ok: false, error: String(err) };
    }
  }

  return json({
    success: true,
    isUpdate,
    message: isUpdate ? 'Subscription updated' : 'Subscribed',
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
