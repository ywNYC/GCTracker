// Cloudflare Pages Function: GET /api/confirm
//
// Second half of double opt-in. The subscribe endpoint stores a record with
// `confirmed: false` and emails a signed link here; only clicking it marks the address
// as a real subscriber and triggers the welcome email.
//
// Why it matters: without this step anyone can enter a stranger's address and make this
// domain send them mail they never asked for. That earns spam complaints, which get the
// Resend account suspended and damage the sending reputation of jmjvc.us — damage that
// is slow and painful to undo.
//
// The token is an HMAC over `confirm:<email>` keyed with UNSUBSCRIBE_SECRET, so it
// cannot be forged for an arbitrary address, and it is domain-separated from the
// unsubscribe token so neither can be replayed as the other.

import { buildConfirmToken, sendWelcomeEmail } from './subscribe.js';
import { renderUnsubscribePage } from './_emailTemplates.js';

const html = (body, status = 200) =>
  new Response(body, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  });

// Constant-time-ish compare so a wrong token can't be narrowed down by timing.
function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const email = (url.searchParams.get('email') || '').trim().toLowerCase();
  const token = url.searchParams.get('token') || '';
  const langParam = url.searchParams.get('lang');

  const fail = (lang) =>
    html(renderUnsubscribePage({ email, success: false, language: lang || 'zh' }), 400);

  if (!env.SUBSCRIBERS) {
    console.error('SUBSCRIBERS KV not bound');
    return fail(langParam);
  }
  if (!email || !token) return fail(langParam);

  const expected = await buildConfirmToken(email, env);
  if (!safeEqual(token, expected)) return fail(langParam);

  const raw = await env.SUBSCRIBERS.get(email);
  if (!raw) return fail(langParam);

  let record;
  try {
    record = JSON.parse(raw);
  } catch {
    return fail(langParam);
  }

  const lang = langParam || record.language || 'zh';

  // Idempotent: clicking the link twice must not re-send the welcome email, but it
  // should still land on a success page rather than look like a failure.
  if (record.confirmed === true) {
    return html(renderConfirmedPage({ email, lang, siteUrl: env.SITE_URL }));
  }

  record.confirmed = true;
  record.confirmedAt = new Date().toISOString();
  record.lastUpdated = record.confirmedAt;

  try {
    await env.SUBSCRIBERS.put(email, JSON.stringify(record));
  } catch (err) {
    console.error('KV put failed on confirm:', err);
    return fail(lang);
  }

  // Welcome mail is best-effort: the subscription is already active either way.
  try {
    await sendWelcomeEmail({
      env,
      email,
      userCase: record.userCase,
      alerts: record.alerts,
      language: record.language,
    });
  } catch (err) {
    console.error('Welcome email error after confirm:', err);
  }

  return html(renderConfirmedPage({ email, lang, siteUrl: env.SITE_URL }));
}

function renderConfirmedPage({ email, lang, siteUrl }) {
  const site = (siteUrl || 'https://gc.jmjvc.us').replace(/\/+$/, '');
  const c = {
    en: {
      title: 'Subscription confirmed',
      body: 'You are all set. We will email you when the visa bulletin moves.',
      back: 'Back to Green Card Tracker',
    },
    zh: {
      title: '订阅已确认',
      body: '搞定了。签证公告有变动时我们会发邮件通知你。',
      back: '返回绿卡晴雨表',
    },
    tw: {
      title: '訂閱已確認',
      body: '搞定了。簽證公告有變動時我們會寄信通知你。',
      back: '返回綠卡晴雨表',
    },
  }[lang === 'en' ? 'en' : lang === 'tw' ? 'tw' : 'zh'];

  const safeEmail = String(email).replace(/[<>&"']/g, '');

  return `<!DOCTYPE html>
<html lang="${lang === 'en' ? 'en' : 'zh'}">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${c.title}</title>
</head>
<body style="margin:0;background:#f4f1ea;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:460px;margin:80px auto;background:#fff;border:1px solid #e4dfd3;border-radius:10px;padding:40px 32px;text-align:center;">
    <div style="font-family:Georgia,serif;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#0e4d2e;">— ${c.title} —</div>
    <h1 style="font-family:Georgia,serif;font-size:26px;color:#111418;margin:14px 0 12px;">${c.title}</h1>
    <p style="font-size:14px;line-height:1.7;color:#414852;margin:0 0 6px;">${c.body}</p>
    <p style="font-size:12px;color:#8a9099;margin:0 0 26px;">${safeEmail}</p>
    <a href="${site}" style="display:inline-block;background:#0e4d2e;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 28px;border-radius:6px;">${c.back}</a>
  </div>
</body>
</html>`;
}
