// Cloudflare Pages Function: POST /api/restore-link
// "找回我的案子" — a subscriber types the email they subscribed with, and we mail
// them their own case deep-link (the same ?c=&ct=&pd= link the monthly email
// carries). No accounts, no passwords: proving you can read the inbox IS the login.
//
// Anti-abuse:
//   - per-IP counter (rlr:) — same KV-with-TTL pattern as subscribe.js
//   - per-target-email counter (rlre:) so one address can't be mail-bombed
//   - the response NEVER reveals whether the email exists (always {success:true})
//
// Bindings: same as subscribe.js (SUBSCRIBERS, RESEND_API_KEY, RESEND_FROM,
// SITE_URL, UNSUBSCRIBE_SECRET).

import { buildSubtypeToken } from './subscribe.js';

const ALLOWED_ORIGIN = 'https://gc.jmjvc.us';
const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
  'Vary': 'Origin',
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });

const isValidEmail = (email) =>
  typeof email === 'string' && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// Deliberately tighter than subscribe's 5/hour: this endpoint sends mail to an
// address the caller merely CLAIMS to own.
const IP_MAX = 5;               // per IP per hour
const EMAIL_MAX = 3;            // per target email per day
const IP_WINDOW_S = 3600;
const EMAIL_WINDOW_S = 86400;

async function bumpCounter(env, key, max, ttl) {
  let count = 0;
  try {
    const raw = await env.SUBSCRIBERS.get(key);
    count = raw ? parseInt(raw, 10) || 0 : 0;
  } catch {
    return true; // limiter failure must never break the endpoint
  }
  if (count >= max) return false;
  try { await env.SUBSCRIBERS.put(key, String(count + 1), { expirationTtl: ttl }); } catch {}
  return true;
}

// Same compact-key link the monthly email builds (see buildCaseUrl in
// _emailTemplates.js — not exported, and this link ALWAYS carries se/stk so the
// device can pull back subtype/birth via SubtypeUpdateModal after restoring).
const buildRestoreUrl = (siteUrl, userCase, email, token) => {
  const base = String(siteUrl || 'https://gc.jmjvc.us').replace(/\/+$/, '');
  const p = new URLSearchParams();
  p.set('c', userCase.category);
  p.set('ct', userCase.country);
  p.set('pd', userCase.priorityDate);
  if (userCase.inUS === false) p.set('in', '0');
  if (userCase.petitionerStatus) p.set('ps', userCase.petitionerStatus);
  if (userCase.subtype) p.set('st', userCase.subtype);
  if (!userCase.subtype || !userCase.birthYearMonth) {
    p.set('se', email);
    p.set('stk', token);
  }
  return `${base}/?${p.toString()}`;
};

const renderRestoreEmail = ({ language, name, url }) => {
  const en = language === 'en';
  const hi = (name || '').trim();
  const subject = en ? 'Your Green Card Tracker case link' : '你的绿卡晴雨表案子恢复链接';
  const greeting = hi ? (en ? `Hi ${hi},` : `${hi}，你好：`) : (en ? 'Hi,' : '你好：');
  const body = en
    ? 'Tap the button below on the device you want to use — your saved case (category, country, priority date) will be restored instantly. No password needed.'
    : '在你想使用的设备上点下面的按钮，你保存过的案子（类别、国家、优先日）会立刻恢复，不需要密码。';
  const ignore = en
    ? "Didn't request this? You can safely ignore this email."
    : '不是你操作的？忽略这封邮件即可，什么都不会发生。';
  const btn = en ? 'Restore my case →' : '恢复我的案子 →';
  const html = `<!doctype html><html><body style="margin:0;background:#f4f3ee;font-family:-apple-system,'PingFang SC','Microsoft YaHei',sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f3ee;"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:560px;max-width:560px;background:#fdfcf8;border:1px solid #d4d2c8;">
<tr><td style="padding:24px 28px;border-bottom:2px solid #1a1a1a;font-size:17px;font-weight:700;color:#1a1a1a;">${en ? 'Green Card Tracker' : '绿卡晴雨表'}</td></tr>
<tr><td style="padding:28px;">
<p style="margin:0 0 12px;font-size:14px;color:#1a1a1a;">${greeting}</p>
<p style="margin:0 0 20px;font-size:14px;line-height:1.7;color:#3a3a3a;">${body}</p>
<p style="margin:0 0 24px;"><a href="${url}" style="display:inline-block;background:#1a1a1a;color:#fdfcf8;font-size:14px;font-weight:700;padding:12px 22px;text-decoration:none;">${btn}</a></p>
<p style="margin:0;font-size:12px;color:#8a887e;">${ignore}</p>
</td></tr>
<tr><td style="padding:16px 28px;border-top:1px solid #e4e1d6;font-size:11px;color:#8a887e;">GREEN CARD TRACKER · JMJ</td></tr>
</table></td></tr></table></body></html>`;
  const text = `${greeting}\n\n${body}\n\n${url}\n\n${ignore}`;
  return { subject, html, text };
};

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function onRequestPost({ request, env }) {
  let body;
  try { body = await request.json(); } catch { return json({ success: false, error: 'Bad request' }, 400); }
  const email = (body?.email || '').trim().toLowerCase();
  if (!isValidEmail(email)) return json({ success: false, error: 'Invalid email' }, 400);

  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  if (ip !== 'unknown' && !(await bumpCounter(env, `rlr:${ip}`, IP_MAX, IP_WINDOW_S))) {
    return json({ success: false, error: 'Too many attempts, try again later' }, 429);
  }
  if (!(await bumpCounter(env, `rlre:${email}`, EMAIL_MAX, EMAIL_WINDOW_S))) {
    // Cap reached for this address — still claim success so callers can't probe.
    return json({ success: true });
  }

  let record = null;
  try {
    const raw = await env.SUBSCRIBERS.get(email);
    if (raw) record = JSON.parse(raw);
  } catch {}

  const uc = record?.userCase;
  const restorable = record && record.confirmed === true
    && uc && uc.category && uc.country && uc.priorityDate;
  if (!restorable || !env.RESEND_API_KEY || !env.RESEND_FROM) {
    // Unknown/unconfirmed email, or mail not configured: same opaque answer.
    return json({ success: true });
  }

  const token = await buildSubtypeToken(email, env);
  const url = buildRestoreUrl(env.SITE_URL, uc, email, token);
  const { subject, html, text } = renderRestoreEmail({
    language: record.language || 'zh',
    name: record.name || '',
    url,
  });

  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: env.RESEND_FROM, to: [email], subject, html, text }),
    });
  } catch (err) {
    console.error('restore-link send failed:', err);
  }
  return json({ success: true });
}
