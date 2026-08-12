// Cloudflare Pages Function: POST /api/update-subtype
//
// Lets a subscriber fill in a missing case subtype (EB1-EB5 only — see
// CATEGORY_SUBTYPES in src/App.jsx) from the deep link the monthly-update email
// carries for exactly this purpose (see buildCaseUrl in _emailTemplates.js and
// buildSubtypeToken in subscribe.js). No login: the HMAC token in the link IS the
// authorization, scoped to this one email and domain-separated from the
// confirm/unsubscribe tokens so it can't be replayed as either.
//
// Required bindings: SUBSCRIBERS (KV), UNSUBSCRIBE_SECRET (same secret confirm/
// unsubscribe tokens use).

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

// Same ids App.jsx's CATEGORY_SUBTYPES defines — kept minimal (ids only, not the
// bilingual labels) so a request can't write an arbitrary string into the record.
const VALID_SUBTYPES = {
  EB1: ['eb1a', 'eb1b', 'eb1c'],
  EB2: ['perm', 'niw', 'scha'],
  EB3: ['prof', 'skilled'],
  EB4: ['sijs', 'un', 'other4'],
  EB5: ['direct', 'rc'],
};

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.SUBSCRIBERS) return json({ error: 'KV namespace SUBSCRIBERS not bound' }, 500);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const email = String(body.email || '').trim().toLowerCase();
  const token = String(body.token || '');
  const subtype = String(body.subtype || '').trim();
  if (!email || !token || !subtype) return json({ error: 'Missing email, token, or subtype' }, 400);

  const expected = await buildSubtypeToken(email, env);
  if (!safeEqual(token, expected)) return json({ error: 'Invalid or expired link' }, 403);

  const raw = await env.SUBSCRIBERS.get(email);
  if (!raw) return json({ error: 'Subscriber not found' }, 404);

  let record;
  try {
    record = JSON.parse(raw);
  } catch {
    return json({ error: 'Corrupt subscriber record' }, 500);
  }

  const category = record.userCase?.category;
  const validIds = VALID_SUBTYPES[category];
  if (!validIds) return json({ error: 'This case category does not take a subtype' }, 400);
  if (!validIds.includes(subtype)) return json({ error: 'Unknown subtype for this category' }, 400);

  record.userCase.subtype = subtype;
  record.lastUpdated = new Date().toISOString();

  try {
    await env.SUBSCRIBERS.put(email, JSON.stringify(record));
  } catch (err) {
    console.error('KV put failed on update-subtype:', err);
    return json({ error: 'Save failed, try again' }, 500);
  }

  return json({ success: true, subtype });
}
