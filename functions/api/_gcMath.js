// Shared visa-bulletin math for Node scripts (email sender, etc).
// Mirrors the pure logic in src/App.jsx (RATES_DB, computeStatus, computeMovement,
// computeHybridAdvance, estimateMonthsToReachPD, and the history.json "recent" rate
// override). Kept as a separate module — not imported by App.jsx — because App.jsx
// is a browser/React file; this is the Node-side copy for send-monthly.js and preview
// scripts. If you change the model in App.jsx, mirror the change here too.

// Which chart each category ADOPTS for filing this month's I-485 (mirror of App.jsx).
export const FILING_AUTHORIZED = {
  EB1: false, EB2: false, EB3: false, EW: false, EB4: false, SR: false, EB5: false, EB5R: false, EB5H: false, EB5I: false,
  F1: true, F2A: true, F2B: true, F3: true, F4: true,
};

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
  // EB4/SR/EB5 have no regression anchors yet — neutral 365 so the hybrid model
  // leans on the observed 12-month pace, which is what we actually trust here.
  'EB4-Other': {long: 365, mid: 365, recent: 365},
  'SR-Other': {long: 365, mid: 365, recent: 365},
  'EB5-Other': {long: 365, mid: 365, recent: 365},
  'EB5R-Other': {long: 365, mid: 365, recent: 365},
  'EB5H-Other': {long: 365, mid: 365, recent: 365},
  'EB5I-Other': {long: 365, mid: 365, recent: 365},
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
  // null/'U' = the bulletin printed no cutoff (no visas this month) — distinct from
  // "notCurrent" (a real cutoff exists, PD just hasn't reached it). Was wrongly
  // 'notCurrent' here, out of sync with the 'unavailable' src/App.jsx already used —
  // send-monthly's emails were mislabeling U months. Fixed to match (2026-08-12 dedup pass).
  if (!cutoff || cutoff === 'U') return { status: 'unavailable', days: null };
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
  // null/'U' = the bulletin printed no cutoff (U = no visas this month). Mirror of the
  // App-side semantics: "went unavailable" is a de-facto retrogression to zero, and
  // "resumed" means numbers came back — neither is "no change".
  const noCut = (v) => !v || v === 'U';
  if (noCut(current) && noCut(previous)) return { type: 'unavailable', days: null, still: true };
  if (noCut(current)) return { type: 'unavailable', days: null, became: true };
  if (noCut(previous)) return { type: 'resumed', days: null };
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
export function observedRates(historyMonths, cat, country, windowSize = 12, chart = 'finalAction') {
  const cats = ['EB1', 'EB2', 'EB3', 'F1', 'F2A', 'F2B', 'F3', 'F4'];
  const asc = (historyMonths || [])
    .filter((m) => m && m.month && m[chart] && cats.every((c) => m[chart][c]))
    .sort((a, b) => a.month.localeCompare(b.month));
  const toTime = (v) => (v && v !== 'C' && v !== 'U' ? Date.parse(`${v}T00:00:00Z`) : null);

  // CALENDAR-window semantics, mirroring the App's monthlyMovementFromArchive: the
  // window is the last N calendar months with a published bulletin, and months where
  // no delta is observable (U/C on either side) count as ZERO movement — the
  // subscriber still lived through them. The old version skipped those months and
  // averaged only observable deltas, which for U-heavy categories (EB4 in FY2025)
  // stretched the window years back and made the email's pace disagree with the site.
  const winMonths = asc.slice(-(windowSize + 1));
  if (winMonths.length < 2) return null;
  const series = [];
  for (let i = 1; i < winMonths.length; i++) {
    const a = toTime(winMonths[i - 1][chart]?.[cat]?.[country]);
    const b = toTime(winMonths[i][chart]?.[cat]?.[country]);
    series.push({ month: winMonths[i].month, days: (a === null || b === null) ? null : (b - a) / 86400000 });
  }
  const observed = series.filter((d) => d.days !== null);
  if (!observed.length) return null;

  return {
    latest: observed[observed.length - 1].days,
    windowMean: observed.reduce((s, d) => s + d.days, 0) / series.length,
    windowSize: series.length,
    // The month-by-month series behind the average — the email charts this so the
    // reader can see the stall-then-jump pattern that makes the range wide. Null
    // days = months with no observable delta (charted as zero).
    series,
  };
}

// Month-by-month cutoff VALUES (not deltas) over the trailing window — the email's
// trend chart plots these to show where the line actually sits, complementing the
// per-month bars. Returns [{month, cutoff: 'YYYY-MM-DD'}], skipping C/U months.
export function cutoffHistory(historyMonths, cat, country, windowSize = 24, chart = 'finalAction') {
  const cats = ['EB1', 'EB2', 'EB3', 'F1', 'F2A', 'F2B', 'F3', 'F4'];
  const asc = (historyMonths || [])
    .filter((m) => m && m.month && m[chart] && cats.every((c) => m[chart][c]))
    .sort((a, b) => a.month.localeCompare(b.month));
  const points = [];
  for (const m of asc.slice(-(windowSize + 1))) {
    const v = m[chart]?.[cat]?.[country];
    if (!v || v === 'C' || v === 'U') continue;
    points.push({ month: m.month, cutoff: v });
  }
  return points.length >= 2 ? points : null;
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
    // Chart window is wider than the model window on purpose: the forecast's slow end
    // is defined as the 12-month average (that's what the email copy promises), while
    // the charts show 24 months so the stall-then-move rhythm is visible.
    const obsChart = observedRates(historyMonths, cat, resolvedCountry, 24);
    // Which of the two estimators is the optimistic end isn't fixed — a month that
    // moved less than the trailing average flips them — so order by value, not by name.
    const fastRate = obs ? Math.max(singleMonthRate, obs.windowMean) : singleMonthRate;
    const slowRate = obs ? Math.min(singleMonthRate, obs.windowMean) : singleMonthRate;

    forecast = {
      singleMonthRate,
      windowMean: obs ? obs.windowMean : null,
      windowSize: obs ? obs.windowSize : null,
      series: obs ? obs.series : null,
      chartSeries: obsChart ? obsChart.series : (obs ? obs.series : null),
      fastRate,
      slowRate,
      fastMonths: monthsAt(fastRate),
      slowMonths: monthsAt(slowRate),
      // Kept so callers that only want one number still work; it is the optimistic end.
      monthsToCurrent: monthsAt(fastRate),
    };
  }

  // The ADOPTED chart's own numbers — hero of the email, computed with that chart's
  // own 12-month pace (a B gap divided by A's pace was a real logical hole).
  const adopted = (() => {
    const isB = !!FILING_AUTHORIZED[cat];
    const chartKey = isB ? 'filing' : 'finalAction';
    const st = isB ? filStatus : faStatus;
    const mv = isB ? filMovement : faMovement;
    const obs2 = historyMonths ? observedRates(historyMonths, cat, resolvedCountry, 12, chartKey) : null;
    const paceMo = obs2 && obs2.windowMean > 0 ? obs2.windowMean : null;
    // Only notCurrent has a forward gap; for eligible/current, status.days is the
    // margin PAST the cutoff, not distance remaining.
    const gapDays = st && st.status === 'notCurrent' && typeof st.days === 'number' ? st.days : null;
    const etaMonths = paceMo && gapDays ? gapDays / paceMo : null;
    return {
      chart: isB ? 'B' : 'A',
      gapDays, paceMo, etaMonths,
      movement: mv, status: st,
      series: obs2 ? obs2.series : null,
      cutoffHistory: historyMonths ? cutoffHistory(historyMonths, cat, resolvedCountry, 24, chartKey) : null,
    };
  })();

  // Per-chart ETAs for the two-station block.
  const stations = (() => {
    const mk = (chartKey, st, mv) => {
      const obs2 = historyMonths ? observedRates(historyMonths, cat, resolvedCountry, 12, chartKey) : null;
      const paceMo = obs2 && obs2.windowMean > 0 ? obs2.windowMean : null;
      const gapDays = st && st.status === 'notCurrent' && typeof st.days === 'number' ? st.days : null;
      return { gapDays, etaMonths: paceMo && gapDays ? gapDays / paceMo : null, movement: mv, status: st };
    };
    return {
      B: mk('filing', filStatus, filMovement),
      A: mk('finalAction', faStatus, faMovement),
    };
  })();

  // Ordering constraint between the two charts, resolved by WHICH CHART ACTUALLY
  // GATES FILING for this category:
  //
  // Family (filing runs on chart B): approval (A) can never precede filing (B), so
  // A's ETA is floored to B's. B's pace is a real, steadily-moving gate there, so
  // the floor imports a credible number (F4-China: 6.8y → 7.2y).
  //
  // Employment (filing runs on chart A): BOTH milestones are governed by A, and
  // chart B is a frozen intake lever that moves in rare jumps — extrapolating it
  // yields garbage (EB5-China: B said 11.8y while A moves 30 days/mo). Flooring A
  // by that number was wrong. Instead, the bulletin invariant (B always sits at or
  // ahead of A, so B crosses a PD no later than A) caps B's DISPLAYED ETA at A's.
  if (typeof stations.A.etaMonths === 'number' && typeof stations.B.etaMonths === 'number'
      && stations.A.etaMonths < stations.B.etaMonths) {
    if (FILING_AUTHORIZED[cat]) {
      stations.A.etaMonths = stations.B.etaMonths;
      stations.A.clampedToB = true;
      if (adopted.chart === 'A' && typeof adopted.etaMonths === 'number') {
        adopted.etaMonths = stations.B.etaMonths;
        adopted.clampedToB = true;
      }
    } else {
      stations.B.etaMonths = stations.A.etaMonths;
      stations.B.clampedToA = true;
    }
  }

  return {
    cat, country: resolvedCountry, priorityDate,
    finalAction: { current: faCurrent, previous: faPrevious, movement: faMovement, status: faStatus },
    filing: { current: filCurrent, previous: filPrevious, movement: filMovement, status: filStatus },
    forecast,
    cutoffHistory: historyMonths ? cutoffHistory(historyMonths, cat, resolvedCountry, 24) : null,
    adopted,
    stations,
  };
}
