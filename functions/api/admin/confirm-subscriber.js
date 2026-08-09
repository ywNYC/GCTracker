// Cloudflare Pages Function: POST /api/admin/confirm-subscriber?email=<addr>
//
// Manually completes double opt-in for a subscriber whose confirmation email got
// buried in spam. Same effect as the user clicking the confirm link (confirmed:true
// + welcome email), plus an `adminConfirmed` marker so we can always tell which
// confirmations were operator overrides.
//
// Use ONLY for addresses that clearly subscribed themselves (a real case attached,
// plausible address) — the double opt-in exists to protect the sender reputation of
// jmjvc.us, and mailing someone who never asked is how that reputation dies.
//
// Usage:
//   curl -X POST "https://gc.jmjvc.us/api/admin/confirm-subscriber?email=x@y.com" \
//     -H "Authorization: Bearer $ADMIN_TOKEN"
// Add &welcome=0 to skip the welcome email (silent flip only).

import { sendWelcomeEmail } from '../subscribe.js';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data, null, 2), {
    status, headers: { 'Content-Type': 'application/json' },
  });

export async function onRequestPost(context) {
  const { request, env } = context;

  const auth = request.headers.get('Authorization') || '';
  if (!env.ADMIN_TOKEN || auth !== `Bearer ${env.ADMIN_TOKEN}`) {
    return json({ error: 'unauthorized' }, 401);
  }

  const url = new URL(request.url);
  const email = (url.searchParams.get('email') || '').trim().toLowerCase();
  const sendWelcome = url.searchParams.get('welcome') !== '0';
  if (!email) return json({ error: 'email query param required' }, 400);

  const raw = await env.SUBSCRIBERS.get(email);
  if (!raw) return json({ error: 'subscriber not found', email }, 404);

  let record;
  try { record = JSON.parse(raw); } catch { return json({ error: 'corrupt record', email }, 500); }

  if (record.confirmed === true) {
    return json({ ok: true, email, alreadyConfirmed: true });
  }

  record.confirmed = true;
  record.confirmedAt = new Date().toISOString();
  record.adminConfirmed = true;
  record.lastUpdated = record.confirmedAt;

  await env.SUBSCRIBERS.put(email, JSON.stringify(record));

  let welcomed = false;
  if (sendWelcome) {
    try {
      await sendWelcomeEmail({
        env, email,
        userCase: record.userCase,
        alerts: record.alerts,
        language: record.language,
      });
      welcomed = true;
    } catch (err) {
      console.error('Welcome email error after admin confirm:', err);
    }
  }

  return json({ ok: true, email, confirmed: true, adminConfirmed: true, welcomeEmailSent: welcomed });
}
