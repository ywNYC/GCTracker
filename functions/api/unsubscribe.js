// Cloudflare Pages Function: GET /api/unsubscribe?email=xxx&token=xxx
// Handles unsubscribe link clicks from emails (must be GET because it's a link).
// Also handles RFC 8058 one-click POST (Gmail/Yahoo "Unsubscribe" button).
//
// Token verification:
//   The unsubscribe URL contains an HMAC token. Without the token, anyone
//   could unsub anyone else by guessing the email. The token is generated
//   in subscribe.js using UNSUBSCRIBE_SECRET.

import { renderUnsubscribePage } from './_emailTemplates.js';

const isValidEmail = (email) =>
  typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

async function signEmail(email, secret) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret || 'gctracker-default-fallback-please-set-secret'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(email));
  const b64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return b64.slice(0, 16);
}

async function tokenIsValid(email, token, env) {
  if (!email || !token) return false;
  const expected = await signEmail(email, env.UNSUBSCRIBE_SECRET);
  // Constant-time-ish comparison (good enough for a 16-char token)
  if (expected.length !== token.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  }
  return diff === 0;
}

async function processUnsubscribe(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const email = url.searchParams.get('email');
  const token = url.searchParams.get('token');
  const lang = url.searchParams.get('lang') || 'zh';

  if (!isValidEmail(email)) {
    return { success: false, email: '', lang };
  }

  if (!(await tokenIsValid(email, token, env))) {
    return { success: false, email, lang };
  }

  if (!env.SUBSCRIBERS) {
    console.error('SUBSCRIBERS KV not bound');
    return { success: false, email, lang };
  }

  try {
    await env.SUBSCRIBERS.delete(email.trim().toLowerCase());
    return { success: true, email, lang };
  } catch (err) {
    console.error('KV delete failed:', err);
    return { success: false, email, lang };
  }
}

// GET — user clicks unsubscribe link in email, returns an HTML confirmation page
export async function onRequestGet(context) {
  const result = await processUnsubscribe(context);
  const html = renderUnsubscribePage({
    email: result.email,
    success: result.success,
    language: result.lang,
  });
  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

// POST — RFC 8058 one-click unsubscribe (Gmail / Yahoo bulk-sender requirement).
// These clients send a POST to the List-Unsubscribe URL with no body when the user
// clicks the inbox-level "Unsubscribe" button. Must respond 200 quickly.
export async function onRequestPost(context) {
  const result = await processUnsubscribe(context);
  return new Response(
    JSON.stringify({ success: result.success }),
    {
      status: result.success ? 200 : 400,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
