// Cloudflare Pages Function: /api/community
//
// One anonymous data-collection endpoint for every community feature: filing
// timelines, RFE reports, downgrade/switch outcomes, cost brackets, monthly
// polls, the milestone wall, open questions, and post-green-card plans.
// No email, no receipt numbers, no identity — every record is aggregate fodder.
//
//   POST {type, ...fields}         → stored as cd:<type>:<uuid>, TTL 2 years
//   GET  ?type=X[&cat=][&pollId=]  → per-type aggregates (wall returns latest 20)
//   GET  ?type=question + Bearer ADMIN_TOKEN → raw questions (owner only)
//
// Shares the SUBSCRIBERS namespace under cd:/crl: — subscriber-listing consumers
// must skip both prefixes.

const CATS = ['EB1', 'EB2', 'EB3', 'EW', 'EB4', 'SR', 'EB5', 'EB5R', 'EB5H', 'EB5I',
  'F1', 'F2A', 'F2B', 'F3', 'F4'];
const COUNTRIES = ['China', 'India', 'Taiwan', 'Mexico', 'Philippines', 'Other'];
const CENTERS = ['NSC', 'TSC', 'Potomac', 'MSC', 'other-center', 'guangzhou', 'other-consulate', 'unknown'];
const TIMELINE_KEYS = ['filed', 'receipt', 'biometrics', 'ead', 'interview', 'approved'];
const RFE_TYPES = ['medical', 'financial', 'relationship', 'other'];
const SWITCH_ACTIONS = ['downgrade', 'porting', 'premium', 'none'];
const SWITCH_OUTCOMES = ['faster', 'same', 'regret', 'pending'];
const COST_BRACKETS = ['lt5k', 'b5to10k', 'b10to15k', 'gt15k'];
const POSTGC_PLANS = ['buy-home', 'change-job', 'move-state', 'naturalize', 'none'];
const TTL_S = 730 * 24 * 3600;
const IP_DAILY_CAP = 20;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

const isDate = (v) => typeof v === 'string' && /^20\d{2}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v));

// Wall messages: no links, no phone-ish digit runs, hard length cap. Conservative
// on purpose — a public wall with zero moderation must fail closed.
const sanitizeWallMsg = (msg) => {
  if (typeof msg !== 'string') return '';
  const t = msg.trim().slice(0, 60);
  if (/https?:|www\.|\.com|\.cn|\d{6,}|微信|weixin|wx|vx|qq/i.test(t)) return '';
  return t;
};

export async function onRequestPost(context) {
  const { request, env } = context;

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  try {
    const rlKey = `crl:${ip}:${new Date().toISOString().slice(0, 10)}`;
    const n = parseInt((await env.SUBSCRIBERS.get(rlKey)) || '0', 10);
    if (n >= IP_DAILY_CAP) return json({ error: 'rate limited' }, 429);
    await env.SUBSCRIBERS.put(rlKey, String(n + 1), { expirationTtl: 86400 });
  } catch { /* limiter must never block reporting */ }

  let body;
  try {
    const raw = await request.text();
    if (raw.length > 2048) return json({ error: 'too large' }, 413);
    body = JSON.parse(raw);
  } catch { return json({ error: 'bad json' }, 400); }

  const type = body.type;
  const cat = CATS.includes(body.cat) ? body.cat : null;
  const country = COUNTRIES.includes(body.country) ? body.country : 'Other';
  let rec = null;

  if (type === 'timeline') {
    if (!cat) return json({ error: 'cat required' }, 400);
    const dates = {};
    for (const k of TIMELINE_KEYS) {
      if (isDate(body.dates?.[k])) dates[k] = body.dates[k];
    }
    if (!dates.filed) return json({ error: 'filed date required' }, 400);
    // Chronology sanity: every later milestone must not precede filing.
    for (const k of Object.keys(dates)) {
      if (dates[k] < dates.filed && k !== 'filed') return json({ error: 'dates out of order' }, 400);
    }
    const center = CENTERS.includes(body.center) ? body.center : 'unknown';
    const path = body.path === 'cp' ? 'cp' : 'aos';
    rec = { cat, country, path, center, dates };
  } else if (type === 'rfe') {
    if (!cat) return json({ error: 'cat required' }, 400);
    const got = body.got === true;
    const rfeType = got && RFE_TYPES.includes(body.rfeType) ? body.rfeType : null;
    if (got && !rfeType) return json({ error: 'rfeType required' }, 400);
    rec = { cat, country, got, rfeType };
  } else if (type === 'switch') {
    if (!cat) return json({ error: 'cat required' }, 400);
    const action = SWITCH_ACTIONS.includes(body.action) ? body.action : null;
    const outcome = action && action !== 'none' && SWITCH_OUTCOMES.includes(body.outcome) ? body.outcome : null;
    if (!action) return json({ error: 'action required' }, 400);
    rec = { cat, country, action, outcome };
  } else if (type === 'cost') {
    if (!cat) return json({ error: 'cat required' }, 400);
    if (!COST_BRACKETS.includes(body.bracket)) return json({ error: 'bracket required' }, 400);
    rec = { cat, country, bracket: body.bracket };
  } else if (type === 'poll') {
    const pollId = typeof body.pollId === 'string' && /^[a-z0-9-]{4,40}$/.test(body.pollId) ? body.pollId : null;
    const choice = typeof body.choice === 'string' && /^[a-z0-9-]{1,24}$/.test(body.choice) ? body.choice : null;
    if (!pollId || !choice) return json({ error: 'pollId/choice required' }, 400);
    rec = { pollId, choice, cat, country };
  } else if (type === 'wall') {
    const days = Number(body.days);
    if (!Number.isFinite(days) || days < 0 || days > 15000) return json({ error: 'days required' }, 400);
    rec = { cat, country, days: Math.round(days), message: sanitizeWallMsg(body.message) };
  } else if (type === 'question') {
    const text = typeof body.text === 'string' ? body.text.trim().slice(0, 200) : '';
    if (text.length < 4) return json({ error: 'text required' }, 400);
    rec = { cat, country, text };
  } else if (type === 'postgc') {
    if (!POSTGC_PLANS.includes(body.plan)) return json({ error: 'plan required' }, 400);
    rec = { cat, country, plan: body.plan };
  } else {
    return json({ error: 'unknown type' }, 400);
  }

  rec.ts = new Date().toISOString();
  const id = (crypto.randomUUID && crypto.randomUUID()) || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await env.SUBSCRIBERS.put(`cd:${type}:${id}`, JSON.stringify(rec), { expirationTtl: TTL_S });
  return json({ ok: true });
}

async function listType(env, type) {
  const out = [];
  let cursor;
  do {
    const list = await env.SUBSCRIBERS.list({ prefix: `cd:${type}:`, cursor });
    for (const k of list.keys) {
      try {
        const rec = JSON.parse(await env.SUBSCRIBERS.get(k.name));
        if (rec) out.push(rec);
      } catch { /* skip */ }
    }
    cursor = list.list_complete ? null : list.cursor;
  } while (cursor);
  return out;
}

const median = (arr) => {
  if (!arr.length) return null;
  const s = arr.slice().sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};
const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const type = url.searchParams.get('type');
  const cat = url.searchParams.get('cat');

  if (type === 'question') {
    // Raw text only for the owner — public exposure of free text is an abuse vector.
    const auth = request.headers.get('Authorization') || '';
    if (!env.ADMIN_TOKEN || auth !== `Bearer ${env.ADMIN_TOKEN}`) return json({ error: 'unauthorized' }, 401);
    const rows = await listType(env, 'question');
    return json({ total: rows.length, questions: rows.sort((a, b) => (b.ts || '').localeCompare(a.ts || '')) });
  }

  if (type === 'timeline') {
    const rows = (await listType(env, 'timeline')).filter((r) => !cat || r.cat === cat);
    const durTo = (k) => rows.filter((r) => r.dates.filed && r.dates[k])
      .map((r) => daysBetween(r.dates.filed, r.dates[k])).filter((d) => d >= 0 && d < 4000);
    const byCenter = {};
    for (const r of rows) byCenter[r.center] = (byCenter[r.center] || 0) + 1;
    return json({
      total: rows.length,
      medians: { receipt: median(durTo('receipt')), ead: median(durTo('ead')), interview: median(durTo('interview')), approved: median(durTo('approved')) },
      counts: { receipt: durTo('receipt').length, ead: durTo('ead').length, interview: durTo('interview').length, approved: durTo('approved').length },
      byCenter,
    });
  }

  if (type === 'rfe') {
    const rows = (await listType(env, 'rfe')).filter((r) => !cat || r.cat === cat);
    const types = {};
    for (const r of rows) if (r.got && r.rfeType) types[r.rfeType] = (types[r.rfeType] || 0) + 1;
    return json({ total: rows.length, gotRfe: rows.filter((r) => r.got).length, types });
  }

  if (type === 'switch') {
    const rows = (await listType(env, 'switch')).filter((r) => !cat || r.cat === cat);
    const actions = {}, outcomes = {};
    for (const r of rows) {
      actions[r.action] = (actions[r.action] || 0) + 1;
      if (r.outcome) outcomes[r.outcome] = (outcomes[r.outcome] || 0) + 1;
    }
    return json({ total: rows.length, actions, outcomes });
  }

  if (type === 'cost') {
    const rows = (await listType(env, 'cost')).filter((r) => !cat || r.cat === cat);
    const brackets = {};
    for (const r of rows) brackets[r.bracket] = (brackets[r.bracket] || 0) + 1;
    return json({ total: rows.length, brackets });
  }

  if (type === 'poll') {
    const pollId = url.searchParams.get('pollId') || '';
    const rows = (await listType(env, 'poll')).filter((r) => r.pollId === pollId);
    const choices = {};
    for (const r of rows) choices[r.choice] = (choices[r.choice] || 0) + 1;
    return json({ total: rows.length, choices });
  }

  if (type === 'wall') {
    const rows = await listType(env, 'wall');
    rows.sort((a, b) => (b.ts || '').localeCompare(a.ts || ''));
    return json({ total: rows.length, entries: rows.slice(0, 20).map((r) => ({ days: r.days, message: r.message || '', cat: r.cat || '', ts: r.ts })) });
  }

  if (type === 'postgc') {
    const rows = await listType(env, 'postgc');
    const plans = {};
    for (const r of rows) plans[r.plan] = (plans[r.plan] || 0) + 1;
    return json({ total: rows.length, plans });
  }

  return json({ error: 'unknown type' }, 400);
}
