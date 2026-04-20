// Cloudflare Pages Function: POST/DELETE /api/subscribe
// Handles email subscriptions for the green card bulletin assistant.
//
// Required bindings (set in Cloudflare Pages → Settings → Functions):
//   - KV namespace binding named SUBSCRIBERS
//
// Optional:
//   - ADMIN_TOKEN env var (used by /api/admin/subscribers.js)

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

// Handle CORS preflight
export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

// POST /api/subscribe - create or update a subscription
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

  return json({
    success: true,
    isUpdate,
    message: isUpdate ? 'Subscription updated' : 'Subscribed',
  });
}

// DELETE /api/subscribe?email=xxx - unsubscribe
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
