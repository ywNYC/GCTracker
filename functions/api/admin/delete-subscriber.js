// Cloudflare Pages Function: POST /api/admin/delete-subscriber?email=<addr>
//
// Hard-deletes ONE subscriber record from KV. Exists for list hygiene the
// public unsubscribe flow can't reach: dead domains (typo'd addresses whose
// confirmation/unsubscribe links can never be clicked) and duplicates.
//
//   curl -X POST "https://gc.jmjvc.us/api/admin/delete-subscriber?email=x@y.con" \
//     -H "Authorization: Bearer $ADMIN_TOKEN"
//
// Deliberately one email per call, no bulk mode — a fat-fingered bulk pattern
// against a KV namespace with no backups would be unrecoverable.

const json = (data, status = 200) =>
  new Response(JSON.stringify(data, null, 2), {
    status, headers: { 'Content-Type': 'application/json' },
  });

export async function onRequestPost(context) {
  const { request, env } = context;

  const authHeader = request.headers.get('authorization') || '';
  if (!env.ADMIN_TOKEN || authHeader !== `Bearer ${env.ADMIN_TOKEN}`) {
    return json({ error: 'Unauthorized' }, 401);
  }
  if (!env.SUBSCRIBERS) return json({ error: 'KV namespace SUBSCRIBERS not bound' }, 500);

  const url = new URL(request.url);
  const email = (url.searchParams.get('email') || '').trim().toLowerCase();
  if (!email || !email.includes('@')) return json({ error: 'email= required' }, 400);

  const raw = await env.SUBSCRIBERS.get(email);
  if (!raw) return json({ error: 'not found', email }, 404);

  // Echo the record back in the response — the only copy that survives deletion.
  let record = null;
  try { record = JSON.parse(raw); } catch { record = raw; }

  await env.SUBSCRIBERS.delete(email);
  return json({ ok: true, deleted: email, record });
}
