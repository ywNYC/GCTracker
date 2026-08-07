// Shared visa-bulletin math for Node scripts (email sender, etc).
// Mirrors the pure logic in src/App.jsx (RATES_DB, computeStatus, computeMovement,
// computeHybridAdvance, estimateMonthsToReachPD, and the history.json "recent" rate
// override). Kept as a separate module — not imported by App.jsx — because App.jsx
// is a browser/React file; this is the Node-side copy for send-monthly.js and preview
// scripts. If you change the model in App.jsx, mirror the change here too.

export const resolveCountry = (country) => {
  if (['Taiwan', 'Mexico', 'Philippines'].includes(country)) return 'Other';
  return country;
};

// RATES_DB - Derived from 6-anchor HISTORICAL_DATA regression (26 years: 2000-2026)
// Three-layer rates: {long: 26yr, mid: 11yr from 2015, recent: 6yr from 2020} - days/year
export const RATES_DB = {
  'F1-Other': {long: 258, mid: 316, recent: 219},
  'F1-China': {long: 258, mid: 316, recent: 219},
  'F1-India': {long: 258, mid: 316, recent: 219},
  'F1-Mexico': {long: 201, mid: 438, recent: 617},
  'F1-Philippines': {long: 348, mid: 269, recent: 248},
  'F2A-Other': {long: 428, mid: 428, recent: 428},
  'F2A-China': {long: 428, mid: 428, recent: 428},
  'F2A-India': {long: 428, mid: 428, recent: 428},
  'F2A-Mexico': {long: 455, mid: 455, recent: 455},
  'F2A-Philippines': {long: 428, mid: 428, recent: 428},
  'F2B-Other': {long: 343, mid: 302, recent: 173},
  'F2B-China': {long: 343, mid: 302, recent: 173},
  'F2B-India': {long: 343, mid: 302, recent: 173},
  'F2B-Mexico': {long: 199, mid: 360, recent: 425},
  'F2B-Philippines': {long: 287, mid: 306, recent: 259},
  'F3-Other': {long: 225, mid: 258, recent: 237},
  'F3-China': {long: 225, mid: 258, recent: 237},
  'F3-India': {long: 225, mid: 258, recent: 237},
  'F3-Mexico': {long: 132, mid: 227, recent: 279},
  'F3-Philippines': {long: 245, mid: 387, recent: 377},
  'F4-Other': {long: 277, mid: 209, recent: 94},
  'F4-China': {long: 277, mid: 209, recent: 94},
  'F4-India': {long: 272, mid: 149, recent: 114},
  'F4-Mexico': {long: 172, mid: 127, recent: 181},
  'F4-Philippines': {long: 382, mid: 501, recent: 457},
  'EB1-Other': {long: 365, mid: 365, recent: 365},
  'EB1-China': {long: 338, mid: 338, recent: 338},
  'EB1-India': {long: 300, mid: 300, recent: 300},
  'EB1-Mexico': {long: 365, mid: 365, recent: 365},
  'EB1-Philippines': {long: 365, mid: 365, recent: 365},
  'EB2-Other': {long: 365, mid: 365, recent: 365},
  'EB2-China': {long: 365, mid: 373, recent: 356},
  'EB2-India': {long: 212, mid: 303, recent: 298},
  'EB2-Mexico': {long: 365, mid: 365, recent: 365},
  'EB2-Philippines': {long: 365, mid: 365, recent: 365},
  'EB3-Other': {long: 400, mid: 324, recent: 250},
  'EB3-China': {long: 333, mid: 332, recent: 320},
  'EB3-India': {long: 203, mid: 320, recent: 281},
  'EB3-Mexico': {long: 400, mid: 324, recent: 250},
  'EB3-Philippines': {long: 370, mid: 328, recent: 310},
};

export const getRates = (cat, country) => {
  const key = `${cat}-${country}`;
  return RATES_DB[key] || RATES_DB[`${cat}-Other`] || {long: 200, mid: 200, recent: 200};
};
export const getLongTermRate = (cat, country) => getRates(cat, country).long;

export const parseDate = (s) => {
  if (!s || s === 'C' || s === 'U') return null;
  return new Date(s + 'T00:00:00');
};
export const daysBetween = (a, b) => Math.round((a - b) / (1000 * 60 * 60 * 24));

export const computeStatus = (priorityDate, cutoff) => {
  if (cutoff === 'C') return { status: 'current', days: 0 };
  if (!cutoff || cutoff === 'U') return { status: 'notCurrent', days: null };
  const pd = parseDate(priorityDate);
  const co = parseDate(cutoff);
  if (!pd) return { status: 'notCurrent', days: null };
  const diff = daysBetween(co, pd);
  if (diff > 3650) return { status: 'suspicious', days: diff };
  if (diff > 730) return { status: 'overdue', days: diff };
  if (diff > 0) return { status: 'eligible', days: diff };
  if (diff === 0) return { status: 'eligible', days: 0 };
  if (Math.abs(diff) > 18250) return { status: 'suspicious', days: Math.abs(diff) };
  return { status: 'notCurrent', days: Math.abs(diff) };
};

export const computeMovement = (current, previous) => {
  if (current === 'C' && previous === 'C') return { type: 'none', days: 0, wasCurrent: true };
  if (current === 'C' && previous !== 'C') return { type: 'current', days: null };
  if (current !== 'C' && previous === 'C') return { type: 'retrogressed', days: null, fromCurrent: true };
  if (!current || !previous || current === 'U' || previous === 'U') return { type: 'none', days: 0 };
  const d = daysBetween(parseDate(current), parseDate(previous));
  if (d > 0) return { type: 'advanced', days: d };
  if (d < 0) return { type: 'retrogressed', days: Math.abs(d) };
  return { type: 'none', days: 0 };
};

// Blends 4 time horizons — see App.jsx for the rationale comment.
export const computeHybridAdvance = (recentDaysPerMonth, longTermDaysPerYear, monthsAhead, catCountryKey) => {
  if (monthsAhead <= 0) return 0;

  let midRate = longTermDaysPerYear;
  let longRate = longTermDaysPerYear;
  let recentRate = longTermDaysPerYear;
  if (catCountryKey && RATES_DB[catCountryKey]) {
    midRate = RATES_DB[catCountryKey].mid;
    longRate = RATES_DB[catCountryKey].long;
    recentRate = RATES_DB[catCountryKey].recent;
  }

  const recentDpm = recentDaysPerMonth;
  const midDpm = midRate / 12;
  const longDpm = longRate / 12;
  const policyDpm = recentRate / 12;

  const rateForMonth = (m) => {
    if (m <= 12) {
      return 0.55 * recentDpm + 0.20 * policyDpm + 0.25 * longDpm;
    } else if (m <= 36) {
      const w = (m - 12) / 24;
      const nearBlend = 0.55 * recentDpm + 0.20 * policyDpm + 0.25 * longDpm;
      return (1 - w) * nearBlend + w * midDpm;
    } else if (m <= 120) {
      const w = (m - 36) / 84;
      return (1 - w) * midDpm + w * (0.6 * longDpm + 0.4 * midDpm);
    } else {
      return 0.6 * longDpm + 0.4 * midDpm;
    }
  };

  let totalDays = 0;
  const wholeMonths = Math.floor(monthsAhead);
  for (let m = 1; m <= wholeMonths; m++) {
    totalDays += rateForMonth(m);
  }
  const fractional = monthsAhead - wholeMonths;
  if (fractional > 0) {
    totalDays += rateForMonth(wholeMonths + 1) * fractional;
  }
  return totalDays;
};

export const estimateMonthsToReachPD = (currentCutoff, targetPD, recentDaysPerMonth, longTermRate, cat, country) => {
  if (!currentCutoff || !targetPD) return null;
  if (currentCutoff === 'C') return 0;
  const co = new Date(currentCutoff + 'T00:00:00');
  const pd = new Date(targetPD + 'T00:00:00');
  if (isNaN(co.getTime()) || isNaN(pd.getTime())) return null;

  const gapDays = (pd.getTime() - co.getTime()) / (24 * 60 * 60 * 1000);
  if (gapDays <= 0) return 0;

  const catCountryKey = (cat && country) ? `${cat}-${country}` : null;

  let lo = 0, hi = 720;
  const maxAdvance = computeHybridAdvance(recentDaysPerMonth, longTermRate, 720, catCountryKey);
  if (maxAdvance < gapDays) return null;

  for (let iter = 0; iter < 40; iter++) {
    const mid = (lo + hi) / 2;
    const advance = computeHybridAdvance(recentDaysPerMonth, longTermRate, mid, catCountryKey);
    if (advance < gapDays) lo = mid;
    else hi = mid;
    if (hi - lo < 0.5) break;
  }
  return (lo + hi) / 2;
};

// Recompute RATES_DB[key].recent from real observed movement over the trailing N months
// of history.json, same as App.jsx's history-load effect. Mutates RATES_DB in place.
// Call this once after loading history.json, before using computeHybridAdvance/estimateMonthsToReachPD.
export function applyRecentRateOverride(historyMonths, windowSize = 12) {
  const cats = ['EB1', 'EB2', 'EB3', 'F1', 'F2A', 'F2B', 'F3', 'F4'];
  const asc = historyMonths
    .filter((m) => m && m.month && m.finalAction && cats.every((c) => m.finalAction[c]))
    .sort((a, b) => a.month.localeCompare(b.month));
  if (!asc.length) return;

  const win = asc.slice(-Math.min(windowSize + 1, asc.length));
  if (win.length < 4) return;

  const toTime = (v) => (v && v !== 'C' && v !== 'U' ? Date.parse(`${v}T00:00:00Z`) : null);
  const monthsSpan = win.length - 1;
  Object.keys(RATES_DB).forEach((key) => {
    const dash = key.indexOf('-');
    const cat = key.slice(0, dash);
    const country = key.slice(dash + 1);
    const first = toTime(win[0].finalAction?.[cat]?.[country]);
    const last = toTime(win[win.length - 1].finalAction?.[cat]?.[country]);
    if (first === null || last === null) return;
    const days = (last - first) / 86400000;
    if (days < 0) return;
    RATES_DB[key] = { ...RATES_DB[key], recent: Math.round((days / monthsSpan) * 12) };
  });
}

// Observed month-over-month movement for one category/country, straight off history.json.
// Returns both the single latest month and the trailing-window mean, because for a
// category like F4-China — where 6 of the last 12 months moved 0 days — one 243-day jump
// swings the estimate from ~1 year to ~7. Reporting a range beats false precision.
export function observedRates(historyMonths, cat, country, windowSize = 12) {
  const cats = ['EB1', 'EB2', 'EB3', 'F1', 'F2A', 'F2B', 'F3', 'F4'];
  const asc = (historyMonths || [])
    .filter((m) => m && m.month && m.finalAction && cats.every((c) => m.finalAction[c]))
    .sort((a, b) => a.month.localeCompare(b.month));
  const toTime = (v) => (v && v !== 'C' && v !== 'U' ? Date.parse(`${v}T00:00:00Z`) : null);

  const deltas = [];
  for (let i = 1; i < asc.length; i++) {
    const a = toTime(asc[i - 1].finalAction?.[cat]?.[country]);
    const b = toTime(asc[i].finalAction?.[cat]?.[country]);
    if (a === null || b === null) continue;
    deltas.push({ month: asc[i].month, days: (b - a) / 86400000 });
  }
  if (!deltas.length) return null;

  const win = deltas.slice(-windowSize);
  return {
    latest: deltas[deltas.length - 1].days,
    windowMean: win.reduce((s, d) => s + d.days, 0) / win.length,
    windowSize: win.length,
    // The month-by-month series behind the average — the email charts this so the
    // reader can see the stall-then-jump pattern that makes the range wide.
    series: win,
  };
}

// Per-case "what changed and what's next" summary for one visa category/country,
// comparing the two most recent months in history.json. Used by the monthly update email.
// `historyMonths` (optional) enables the two-ended forecast range; without it the
// forecast falls back to the single-month pace the site has always used.
export function computeCaseUpdate({ cat, country, priorityDate, current, previous, historyMonths }) {
  const resolvedCountry = resolveCountry(country);
  const faCurrent = current.finalAction?.[cat]?.[resolvedCountry];
  const faPrevious = previous.finalAction?.[cat]?.[resolvedCountry];
  const filCurrent = current.filing?.[cat]?.[resolvedCountry];
  const filPrevious = previous.filing?.[cat]?.[resolvedCountry];

  const faMovement = computeMovement(faCurrent, faPrevious);
  const filMovement = computeMovement(filCurrent, filPrevious);
  const faStatus = computeStatus(priorityDate, faCurrent);
  const filStatus = computeStatus(priorityDate, filCurrent);

  let forecast = null;
  if (faStatus.status === 'notCurrent' && faCurrent && faCurrent !== 'C' && faCurrent !== 'U') {
    const longTermRate = getLongTermRate(cat, resolvedCountry);
    const thisMonthDays = faMovement.type === 'advanced' ? faMovement.days
      : faMovement.type === 'retrogressed' ? -faMovement.days : 0;
    const singleMonthRate = thisMonthDays > 0 ? thisMonthDays : longTermRate / 12;

    const monthsAt = (rate) => (rate > 0
      ? estimateMonthsToReachPD(faCurrent, priorityDate, rate, longTermRate, cat, resolvedCountry)
      : null);

    const obs = observedRates(historyMonths, cat, resolvedCountry);
    // Which of the two estimators is the optimistic end isn't fixed — a month that
    // moved less than the trailing average flips them — so order by value, not by name.
    const fastRate = obs ? Math.max(singleMonthRate, obs.windowMean) : singleMonthRate;
    const slowRate = obs ? Math.min(singleMonthRate, obs.windowMean) : singleMonthRate;

    forecast = {
      singleMonthRate,
      windowMean: obs ? obs.windowMean : null,
      windowSize: obs ? obs.windowSize : null,
      series: obs ? obs.series : null,
      fastRate,
      slowRate,
      fastMonths: monthsAt(fastRate),
      slowMonths: monthsAt(slowRate),
      // Kept so callers that only want one number still work; it is the optimistic end.
      monthsToCurrent: monthsAt(fastRate),
    };
  }

  return {
    cat, country: resolvedCountry, priorityDate,
    finalAction: { current: faCurrent, previous: faPrevious, movement: faMovement, status: faStatus },
    filing: { current: filCurrent, previous: filPrevious, movement: filMovement, status: filStatus },
    forecast,
  };
}
