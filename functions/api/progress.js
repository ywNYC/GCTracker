// Cloudflare Pages Function: /api/progress — RETIRED 2026-11-11 (UI-06).
//
// This used to be the anonymous, crowd-sourced filing-progress endpoint
// ("people who filed the same month as you"): POST {cat, country,
// filedMonth, milestone} stored one row as pr:<cat>:<uuid> in the
// SUBSCRIBERS KV namespace, GET ?cat= returned aggregates.
//
// Why retired: the frontend never called it (zero references in src/),
// and in three months the dataset collected exactly one record — a
// launch-day self-test (EB3 · Philippines · filed 2026-08 · approved).
// That record was exported to the ops archive (pr-export.json, kept with
// the GCTracker update project files) BEFORE this shutdown. The KV keys
// themselves are left untouched and expire on their original 2-year TTL;
// subscriber-listing consumers must keep skipping the pr:/prl: prefixes
// for as long as the keys live.
//
// Every method now answers 410 Gone. The previous implementation remains
// in git history if the feature is ever revived.

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

export async function onRequest() {
  return json(
    { error: 'retired', detail: 'The /api/progress milestone endpoint was retired on 2026-11-11.' },
    410
  );
}
