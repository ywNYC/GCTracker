// UI-23 code split: Forecast + TrendChart + ForecastHub, lazy chunk for the trends tab.
// Extracted verbatim from App.jsx; shared helpers stay in App.jsx (imported
// below) or in functions/api/_gcMath.js. Loaded lazily by App.jsx per tab.
import React, { useState, useEffect } from 'react';
import { TrendingUp, CheckCircle2, Info, Zap, Sparkles, History, HelpCircle, Activity } from 'lucide-react';
import { resolveCountry, RATES_DB, getLongTermRate, computeHybridAdvance, estimateMonthsToReachPD } from '../functions/api/_gcMath.js';
import { useLang, bulletinAnchorDate, countryShortLabel, BULLETIN_ARCHIVE, HISTORICAL_DATA, observedPaceFromArchive, bulletinCurrent, parseDate, computeForecast } from './App.jsx';
// ============================================================
// Forecast (Probability)
// ============================================================
const Forecast = ({ userCase }) => {
  const { t, lang } = useLang();
  // Defaults to the cautious end. The user can switch, but they have to choose to.
  const [paceBasis, setPaceBasis] = useState('conservative');
  // Not memoized: computeForecast reads the mutated-in-place BULLETIN_ARCHIVE, so a
  // memo keyed on props serves pre-history.json seed numbers forever (same trap as
  // MonthlyUpdate's changes). The hybrid simulation is a few hundred iterations — cheap.
  const forecast = computeForecast(userCase, paceBasis);
  // Switch to years past two years. The conservative basis routinely lands past the old
  // "> 60 months" ceiling, and "60+" tells the reader almost nothing.
  // Threshold matches formatMonthsCompact() in functions/api/_emailTemplates.js — the
  // monthly email renders the same figures, so the switch to years has to happen at the
  // same point or the two disagree on cases landing between 18 and 24 months.
  const durationParts = (m) => {
    if (m === null || m === undefined) return { value: '—', unit: '' };
    return m / 12 >= 1.5
      ? { value: (m / 12).toFixed(1), unit: lang === 'en' ? 'years' : '年' }
      : { value: String(Math.round(m)), unit: t.months };
  };
  const fmtDuration = (m) => {
    const p = durationParts(m);
    return p.unit ? `${p.value} ${p.unit}` : p.value;
  };
  const confLabel = { low: t.confLow, medium: t.confMed, high: t.confHigh }[forecast.confidence];
  const confTone = {
    low: 'bg-red-50 text-red-700 ring-red-200',
    medium: 'bg-amber-50 text-amber-700 ring-amber-200',
    high: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  }[forecast.confidence];

  // Token-colored meter: fill carries the outcome's color, track is a light step of
  // the same surface. Gradients were Tailwind blues/greens outside the theme system.
  const ProbBar = ({ label, value, tone }) => {
    const pct = Math.round(value * 100);
    const fill = { good: 'var(--gc-green)', neutral: 'var(--gc-blue)', bad: 'var(--gc-red)' }[tone] || 'var(--gc-muted)';
    return (
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold" style={{ color: 'var(--gc-ink-soft)' }}>{label}</span>
          <span className="text-sm font-bold gc-mono" style={{ color: fill }}>{pct}%</span>
        </div>
        <div style={{ height: '8px', background: 'var(--gc-rule-soft)', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: fill, borderRadius: '4px', transition: 'width 200ms' }}></div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-2">
      <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-sm">
        <div className="flex items-start justify-between mb-2 gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Activity size={14} className="flex-shrink-0" style={{ color: 'var(--gc-green)' }} strokeWidth={2.2} />
              <h2 className="text-base font-bold text-slate-900">{t.forecastTitle}</h2>
            </div>
            <p className="text-xs text-slate-500">{t.forecastSubtitle}</p>
          </div>
          <span className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ring-1 ${confTone}`}>
            {t.forecastConfidence}: {confLabel}
          </span>
        </div>

        {forecast.alreadyCurrent ? (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-600" />
              <span className="text-sm font-bold text-emerald-900">{t.currentlyCurrent}</span>
            </div>
          </div>
        ) : forecast.eligible ? (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Zap size={18} className="text-blue-600" />
              <span className="text-sm font-bold text-blue-900">{t.eligibleNow}</span>
            </div>
            <div className="text-xs text-blue-800">
              {t.avgMovement}: <span className="font-bold">+{forecast.avgMovement} {t.days}/{lang === 'en' ? 'mo' : t.months}</span>
            </div>
          </div>
        ) : (
          <>
            {/* This sub-tab is called 下月预测 — so NEXT MONTH's probabilities lead.
                The long-term ETA used to sit on top in a violet hero card, which made
                the page answer a question nobody asked it. */}
            <div className="space-y-3 mb-4">
              <ProbBar label={t.probBecomeCurrent} value={forecast.probCurrentNext} tone="good" />
              <ProbBar label={t.probAdvance} value={forecast.probAdvance} tone="neutral" />
              <ProbBar label={t.probRetrogress} value={forecast.probRetrogress} tone="bad" />
            </div>

            {/* Long-term ETA, demoted to a reference card and tokenized (was violet). */}
            <div style={{ background: 'var(--gc-paper-soft)', border: '1px solid var(--gc-rule)', borderRadius: 'var(--gc-radius)', padding: '14px' }}>
              <div className="gc-eyebrow" style={{ color: 'var(--gc-muted)', marginBottom: '4px' }}>{t.probMonths}</div>
              {/* ONE range, not a bare conservative point — a lone "9.4 年" next to the
                  summary card's linear "3.9 年" read as the site contradicting itself. */}
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black" style={{ color: 'var(--gc-ink)' }}>
                  {forecast.hasRange
                    ? `${fmtDuration(forecast.monthsFast)} – ${fmtDuration(forecast.monthsSlow)}`
                    : fmtDuration(forecast.monthsToCurrent)}
                </span>
              </div>
              <div className="mt-2 text-[11px]" style={{ color: 'var(--gc-ink-soft)' }}>
                {t.avgMovement}: <span className="font-bold">+{forecast.avgMovement} {t.days}/{lang === 'en' ? 'mo' : t.months}</span>
              </div>

              {forecast.hasRange && (
                <>
                  {/* The basis switch. Conservative is preselected; picking the optimistic
                      end is a deliberate act, and the copy under it says what that costs. */}
                  <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--gc-rule-soft)' }}>
                    <div className="gc-eyebrow" style={{ color: 'var(--gc-muted)', marginBottom: '6px' }}>{t.paceBasisLabel}</div>
                    <div className="inline-flex" style={{ border: '1px solid var(--gc-rule)', borderRadius: '3px', overflow: 'hidden' }}>
                      {[
                        { key: 'conservative', label: t.paceBasisConservative, pace: forecast.paceSlow, months: forecast.monthsSlow },
                        { key: 'recent', label: t.paceBasisRecent, pace: forecast.paceFast, months: forecast.monthsFast },
                      ].map((opt, i) => (
                        <button
                          key={opt.key}
                          onClick={() => setPaceBasis(opt.key)}
                          aria-pressed={paceBasis === opt.key}
                          className="px-2.5 py-1.5 text-[11px] font-semibold transition-colors"
                          style={{
                            border: 'none', cursor: 'pointer',
                            borderLeft: i === 0 ? 'none' : '1px solid var(--gc-rule-soft)',
                            background: paceBasis === opt.key ? 'var(--gc-ink)' : 'var(--gc-surface)',
                            color: paceBasis === opt.key ? 'var(--gc-paper)' : 'var(--gc-ink-soft)',
                          }}
                        >
                          {opt.label}
                          <span className="ml-1 gc-mono" style={{ opacity: 0.8 }}>+{opt.pace}{lang === 'en' ? 'd' : '天'}</span>
                        </button>
                      ))}
                    </div>
                    <div className="mt-2 text-[11px] leading-relaxed" style={{ color: 'var(--gc-ink-soft)' }}>
                      {paceBasis === 'recent' ? t.paceExplainRecent : t.paceExplainConservative}
                    </div>
                    <div className="mt-1 text-[10px] leading-relaxed" style={{ color: 'var(--gc-muted)' }}>{t.paceRangeNote}</div>
                  </div>
                </>
              )}

              {/* Why this number differs from the long-term chart and the summary card —
                  three estimators with different assumptions, stated once, here. */}
              <div className="mt-3 pt-2 text-[10px] leading-relaxed" style={{ borderTop: '1px solid var(--gc-rule-soft)', color: 'var(--gc-muted)' }}>
                {lang === 'en'
                  ? 'This figure blends the current month with the 21-year long-term average. The Long-term chart and the Overview summary extrapolate observed pace directly, so their numbers differ — different assumptions, same data.'
                  : lang === 'tw'
                    ? '口徑說明：此處為混合模型（當月速度＋21 年長期均值）。「長期走勢」圖與總結頁按觀測均速直線外推，數字會不同——是假設不同，不是資料錯了。'
                    : '口径说明：此处为混合模型（当月速度＋21 年长期均值）。「长期走势」图与总结页按观测均速直线外推，数字会不同——是假设不同，不是数据错了。'}
              </div>
            </div>
          </>
        )}

        {/* UI-22: the amber methodology box that used to close this card has
            moved to the top of ForecastHub's content (same box, same copy),
            so the uncertainty note now precedes the probability figures. */}
      </div>
    </div>
  );
};


// ============================================================
// Trend Chart Component (mimicking the professional chart style)
// ============================================================
const TrendChart = ({ userCase, i485ServiceCenter = 'average', completedI485Steps = [], stepActualDates = {} }) => {
  const { t, lang } = useLang();
  const [hoveredMonthIndex, setHoveredMonthIndex] = useState(null);
  const [hoveredForecast, setHoveredForecast] = useState(null); // For forecast zone hover
  // Default to showing JUST the user's own category — their personal line is
  // what they care about most. Other categories are one tap away via the filter.
  const [selectedCategory, setSelectedCategory] = useState('mine');
  const [showCrossoverInfo, setShowCrossoverInfo] = useState(false);
  const [showHelp, setShowHelp] = useState(false); // 说明默认折叠
  const [showScenario, setShowScenario] = useState(false); // UI-22 freeze: 高级情景（五档倍率）默认收起
  // Forecast extension: how many MONTHS of forecast to show (8 months default, up to 600 = 50 years)
  const [forecastMonths, setForecastMonths] = useState(8);
  // Tracks whether the user has manually touched EITHER range slider — if so,
  // we stop auto-fitting to respect their choice. Reset on case change.
  const [rangeUserAdjusted, setRangeUserAdjusted] = useState(false);
  // Past extension: how many MONTHS of historical data to show (12 default, up to 312 = 26 years)
  // Using real anchor data from HISTORICAL_DATA constant (2005-2026)
  const [pastMonths, setPastMonths] = useState(12);
  // Forecast scenario: 5 levels - optimistic(1.5×) | somewhatOptimistic(1.25×) | expected(1.0×, default) | somewhatPessimistic(0.75×) | pessimistic(0.5×)
  const [scenario, setScenario] = useState('expected');
  // Terminal mode REMOVED — the Bloomberg-style dark skin didn't fit the editorial aesthetic.
  // Keeping the variable (hardcoded false) so the ~90 conditional references still work
  // and always take the "standard" (document-style) branch.
  const terminalMode = false;
  // Tracks whether the last range change was auto-fit (for UI hint)
  const [autoFitted, setAutoFitted] = useState(false);
  // When user is already eligible (PD ≥ cutoff), we default to showing a big
  // "can file now" banner instead of the chart. User can opt-in to view the
  // chart via a small "查看图表" link. Reset if case changes.
  const [showChartAnyway, setShowChartAnyway] = useState(false);

  // Chart color tokens — two skins: standard (document) and terminal (Bloomberg-at-night).
  // NOTE: `crossover` used to be red (warning semantics) but that's wrong — the crossover
  // marks the eligibility milestone (good news). In Standard mode we use the app theme's
  // primary accent (via CSS var); in Terminal mode we use a distinct phosphor-gold so it
  // stands apart from the NOW amber line.
  const C = terminalMode ? {
    bg: '#0b0f14',          // deep terminal background
    panel: '#0b0f14',
    gridMajor: '#1d2430',   // stronger grid
    gridMinor: '#141a23',   // faint grid
    frame: '#2a323f',
    axis: '#5a6472',
    axisMuted: '#3a424e',
    text: '#d9d2b8',        // warm ink on black (Bloomberg cream-ish)
    textMuted: '#8a8472',
    nowLine: '#ffb74d',     // Bloomberg amber for "now"
    nowText: '#ffb74d',
    forecastZone: '#1a2420', // very faint green tint on forecast area
    pdLine: '#d9d2b8',       // user PD line = cream
    pdBadge: '#3a424e',
    crossover: '#7ad9a0',    // mint phosphor — distinct from amber NOW, reads as "good milestone"
    crossoverBadge: '#7ad9a0',
    crossoverText: '#0b0f14', // dark text on mint bg
    crossoverSoft: '#17291f', // dim mint for hint text
    cardBg: '#12171f',
    cardBorder: '#2a323f',
    hoverLine: '#ffb74d',
  } : {
    bg: '#fafafa',
    panel: '#fafafa',
    gridMajor: '#e2e8f0',
    gridMinor: '#eef2f6',
    frame: '#e2e8f0',
    axis: '#475569',
    axisMuted: '#94a3b8',
    text: '#1f2937',
    textMuted: '#64748b',
    nowLine: '#10b981',
    nowText: '#059669',
    forecastZone: '#dcfce7',
    pdLine: '#475569',
    pdBadge: '#475569',
    crossover: 'var(--gc-green)',        // theme's primary accent (ink-green, navy, seal-red, or muted-green per theme)
    crossoverBadge: 'var(--gc-green)',
    crossoverText: 'var(--gc-paper)',    // paper color text on accent bg
    crossoverSoft: 'var(--gc-green-ink)',// for small hint text under the pill
    cardBg: '#ffffff',
    cardBorder: '#e2e8f0',
    hoverLine: '#475569',
  };
  
  // CRITICAL: Auto-switch chart filter when user's category changes
  // When user's case fundamentally changes, reset state so auto-fit can re-run
  // and give them a fresh optimal view. We DON'T override selectedCategory here —
  // the default 'mine' mode (only user's own category) stays consistent.
  useEffect(() => {
    setSelectedCategory('mine');
    setRangeUserAdjusted(false);
  }, [userCase.category, userCase.country, userCase.priorityDate]);

  // When the category FILTER changes (user switches tabs between "only me" / EB / F / all),
  // re-run auto-fit so the chart doesn't stay stuck on stale range settings.
  // Example: user manually set forecast=8y while viewing "only me", then switches to
  // "Employment" — without this, the 8y stays and the crossover gets squished to the left.
  useEffect(() => {
    setRangeUserAdjusted(false);
  }, [selectedCategory]);

  // AUTO-FIT dual ranges (history + forecast):
  // Position the crossover (where user's PD line meets forecast curve) at ~66% of total x-axis,
  // with history showing enough context on the left. This simultaneously teaches users that
  // BOTH sliders can move — the chart "breathes" in response to their case.
  //
  // Skipped if the user has manually moved either slider (respect their choice).
  useEffect(() => {
    if (rangeUserAdjusted) return;
    const country = resolveCountry(userCase.country);
    const cat = userCase.category;
    const currentCutoff = bulletinCurrent.finalAction[cat]?.[country];
    if (!currentCutoff || currentCutoff === 'C') {
      setAutoFitted(false);
      return;
    }
    const pd = parseDate(userCase.priorityDate);
    const co = parseDate(currentCutoff);
    if (!pd || !co || pd <= co) {
      setAutoFitted(false);
      return;
    }
    // Same Hybrid model — and the same observed pace — the chart's own curve uses.
    const longTermRate = getLongTermRate(cat, country);
    const recentDpm = observedPaceFromArchive(cat, country) ?? (longTermRate / 12);

    const estMonths = estimateMonthsToReachPD(
      currentCutoff, userCase.priorityDate, recentDpm, longTermRate, cat, country
    );
    if (!estMonths) return;

    // Apply scenario multiplier (same as chart's forecast curve)
    const scenarioMult = { optimistic: 1.5, somewhatOptimistic: 1.25, expected: 1.0, somewhatPessimistic: 0.75, pessimistic: 0.5 }[scenario] || 1.0;
    const scenarioAdjustedMonths = estMonths / scenarioMult;

    // ===== DUAL AUTO-FIT LOGIC =====
    // Goal: crossover lands at ~66% of total x-axis.
    // Formula: pastM / (pastM + forecastM + scenarioAdjustedMonths - scenarioAdjustedMonths) = 0.34
    //          scenarioAdjustedMonths / (pastM + forecastM) = distance past the NOW line
    // We target: past is ~half the width of future, so crossover sits right of center.
    //   → forecastM = scenarioAdjustedMonths / 0.66 (same as before)
    //   → pastM = forecastM * 0.5 (half as much history as forecast)
    //
    // But we snap both to clean waypoint values for nice axis ticks.

    // STEP 1: compute target forecast range
    const targetForecastRaw = Math.ceil(scenarioAdjustedMonths / 0.66);
    // STEP 2: compute target history range (half the forecast, but at least 12 months of context)
    const targetPastRaw = Math.max(12, Math.ceil(targetForecastRaw * 0.5));

    // Waypoint snap — align with slider shortcut values for visual cleanliness
    const forecastWaypoints = [8, 12, 18, 24, 36, 60, 96, 120, 180, 240, 360, 480, 600];
    const pastWaypoints = [6, 12, 24, 36, 60, 96, 120, 180, 240, 312];
    const snapUp = (v, waypoints) => {
      for (const w of waypoints) if (w >= v) return w;
      return waypoints[waypoints.length - 1];
    };

    const snappedForecast = Math.max(6, Math.min(600, snapUp(targetForecastRaw, forecastWaypoints)));
    const snappedPast = Math.max(6, Math.min(312, snapUp(targetPastRaw, pastWaypoints)));

    // Apply auto-fit for both directions (expand OR shrink). Previously only
    // allowed expansion — but that caused issues when switching tabs/scenarios
    // where the optimal range became much smaller, leaving the chart stuck on
    // a now-oversized view (crossover squished to the left).
    let didChange = false;
    if (snappedForecast !== forecastMonths) {
      setForecastMonths(snappedForecast);
      didChange = true;
    }
    if (snappedPast !== pastMonths) {
      setPastMonths(snappedPast);
      didChange = true;
    }
    setAutoFitted(didChange);
  }, [userCase.category, userCase.country, userCase.priorityDate, scenario, rangeUserAdjusted]);
  
  // When historical/forecast range changes, clear any stale hover state
  // (a hover on month 200 in 360-month view becomes invalid when user drags to 12-month view)
  useEffect(() => {
    setHoveredMonthIndex(null);
    setHoveredForecast(null);
  }, [pastMonths, forecastMonths]);

  // Helper to safely add months and return ISO date string
  const addMonths = (year, month, monthsToAdd) => {
    const date = new Date(year, month - 1, 1);
    date.setMonth(date.getMonth() + monthsToAdd);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}-15`;
  };

  // For 'Current' display, use a date ~2 years in the future (visual position above all data)
  const CURRENT_DATE = addMonths(2028, 1, 0);

  // Interpolate cutoff date at a given bulletin date by finding the two surrounding anchors
  // Returns ISO date string or 'C' if both surrounding anchors are Current
  const interpolateCutoff = (cat, country, targetYear, targetMonth) => {
    // Use anchor points from HISTORICAL_DATA (defined globally)
    const anchors = ['2000-01', '2005-01', '2010-01', '2015-01', '2020-01', '2026-05'];
    const getAnchorDate = (k) => {
      const [y, m] = k.split('-').map(Number);
      return new Date(y, m - 1, 15);
    };
    const getAnchorValue = (k) => {
      if (!HISTORICAL_DATA[k]) return null;
      const catData = HISTORICAL_DATA[k][cat];
      if (!catData) return null;
      // Try specific country, else fall back to 'Other' (Taiwan/Mexico/Philippines use Other pool sometimes)
      return catData[country] !== undefined ? catData[country] : catData.Other;
    };
    
    const target = new Date(targetYear, targetMonth - 1, 15);
    
    // If target is before first anchor, extrapolate backwards using first two anchors
    if (target < getAnchorDate(anchors[0])) {
      const v0 = getAnchorValue(anchors[0]);
      const v1 = getAnchorValue(anchors[1]);
      if (v0 === 'C' && v1 === 'C') return 'C';
      if (!v0 || !v1 || v0 === 'C' || v1 === 'C') return null;
      const d0 = new Date(v0), d1 = new Date(v1);
      const t0 = getAnchorDate(anchors[0]), t1 = getAnchorDate(anchors[1]);
      const ratio = (target - t0) / (t1 - t0);
      const cutoffMs = d0.getTime() + ratio * (d1.getTime() - d0.getTime());
      const cd = new Date(cutoffMs);
      return `${cd.getFullYear()}-${String(cd.getMonth()+1).padStart(2,'0')}-${String(cd.getDate()).padStart(2,'0')}`;
    }
    
    // If target is after last anchor, return null (should use current data instead)
    if (target > getAnchorDate(anchors[anchors.length-1])) return null;
    
    // Find surrounding anchors
    for (let i = 0; i < anchors.length - 1; i++) {
      const t0 = getAnchorDate(anchors[i]);
      const t1 = getAnchorDate(anchors[i+1]);
      if (target >= t0 && target <= t1) {
        const v0 = getAnchorValue(anchors[i]);
        const v1 = getAnchorValue(anchors[i+1]);
        if (v0 === 'C' && v1 === 'C') return 'C';
        if (!v0 || !v1) return null;
        // Edge case: one end Current, other end has date
        // Real behavior: category transitions to Current at some point in the interval
        // We approximate: linearly advance from v0 until hitting target date, or jump to Current
        // near the end of the interval if v1 === 'C'
        if (v0 === 'C' && v1 !== 'C') {
          // Going from Current to non-Current (retrogression) - rare
          // First half shows Current, then jumps to v1 date
          const ratio = (target - t0) / (t1 - t0);
          return ratio < 0.5 ? 'C' : v1;
        }
        if (v0 !== 'C' && v1 === 'C') {
          // Common case: category becomes Current during this interval (e.g. F2A 2015→2020)
          // First 80% of interval: linearly advance v0 toward what a "becomes current" date would be
          // Last 20%: show Current
          const ratio = (target - t0) / (t1 - t0);
          if (ratio >= 0.8) return 'C';
          // Extrapolate v0 forward at 400 d/y rate (typical catch-up rate)
          const d0 = new Date(v0);
          const yearsElapsed = ratio * (t1 - t0) / (365.25 * 24 * 60 * 60 * 1000);
          const advancedMs = d0.getTime() + yearsElapsed * 400 * 24 * 60 * 60 * 1000;
          const cd = new Date(advancedMs);
          return `${cd.getFullYear()}-${String(cd.getMonth()+1).padStart(2,'0')}-${String(cd.getDate()).padStart(2,'0')}`;
        }
        const d0 = new Date(v0), d1 = new Date(v1);
        const ratio = (target - t0) / (t1 - t0);
        const cutoffMs = d0.getTime() + ratio * (d1.getTime() - d0.getTime());
        const cd = new Date(cutoffMs);
        return `${cd.getFullYear()}-${String(cd.getMonth()+1).padStart(2,'0')}-${String(cd.getDate()).padStart(2,'0')}`;
      }
    }
    return null;
  };

  // Generate historical data covering `pastMonths` months ending at the loaded bulletin.
  // Every month inside BULLETIN_ARCHIVE (26 real bulletins from history.json) is read
  // straight out of it; only months older than the archive fall back to interpolation
  // between the real HISTORICAL_DATA anchor points.
  //
  // This used to anchor on the hardcoded `bulletinMay2026` seed and back-extrapolate the
  // "recent 12 months" with an invented rate table (F4-China: 8 days/month). That made
  // the chart's observed pace exactly that invented constant, and pinned its starting
  // cutoff three bulletins in the past — the two errors compounded and pushed F4-China's
  // crossover out to 2037 while the real data implied a fraction of that.
  const generateHistoricalData = () => {
    const months = [];
    const now = bulletinAnchorDate(1);

    // Fallback anchor for months the archive doesn't cover — bulletinCurrent tracks the
    // month actually on screen, unlike the frozen May seed this used to read.
    const fa = bulletinCurrent.finalAction;
    const currentData = {
      'EB1-China': fa.EB1.China, 'EB1-Other': fa.EB1.Other, 'EB1-India': fa.EB1.India,
      'EB1-Mexico': fa.EB1.Other, 'EB1-Philippines': fa.EB1.Other,
      'EB2-China': fa.EB2.China, 'EB2-Other': fa.EB2.Other, 'EB2-India': fa.EB2.India,
      'EB2-Mexico': fa.EB2.Other, 'EB2-Philippines': fa.EB2.Other,
      'EB3-China': fa.EB3.China, 'EB3-Other': fa.EB3.Other, 'EB3-India': fa.EB3.India,
      'EB3-Mexico': fa.EB3.Other, 'EB3-Philippines': fa.EB3.Other,
      'F1-China': fa.F1.China, 'F1-Other': fa.F1.Other, 'F1-India': fa.F1.India,
      'F1-Mexico': fa.F1.Other, 'F1-Philippines': fa.F1.Other,
      'F2A-China': fa.F2A.China, 'F2A-Other': fa.F2A.Other, 'F2A-India': fa.F2A.India,
      'F2A-Mexico': fa.F2A.Other, 'F2A-Philippines': fa.F2A.Other,
      'F3-China': fa.F3.China, 'F3-Other': fa.F3.Other, 'F3-India': fa.F3.India,
      'F3-Mexico': fa.F3.Other, 'F3-Philippines': fa.F3.Other,
      'F4-China': fa.F4.China, 'F4-Other': fa.F4.Other, 'F4-India': fa.F4.India,
      'F4-Mexico': fa.F4.Other, 'F4-Philippines': fa.F4.Other,
    };

    // Mexico and Philippines are charged to the "Other" pool in this app's model
    // (see resolveCountry), so their series read from the Other column.
    const archiveCountry = (ctry) => (ctry === 'Mexico' || ctry === 'Philippines' ? 'Other' : ctry);

    // Build pastMonths months; i=0 is latest, i=pastMonths-1 is earliest.
    // Real bulletin first, interpolated anchors for anything older than the archive.
    for (let i = pastMonths - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const targetYear = date.getFullYear();
      const targetMonth = date.getMonth() + 1;
      const archiveKey = `${targetYear}-${String(targetMonth).padStart(2, '0')}`;
      const archived = BULLETIN_ARCHIVE[archiveKey]?.data?.finalAction || null;

      const monthData = {};
      Object.keys(currentData).forEach(key => {
        const [cat, ctry] = key.split('-');
        const fromArchive = archived?.[cat]?.[archiveCountry(ctry)];
        if (fromArchive) {
          monthData[key] = fromArchive;
          return;
        }
        // Older than the archive — interpolate between real anchor points.
        const interpolated = interpolateCutoff(cat, ctry, targetYear, targetMonth);
        // Last resort (no anchor coverage either): hold the current value flat rather
        // than inventing movement, so a data gap can never masquerade as a trend.
        monthData[key] = interpolated !== null ? interpolated : currentData[key];
      });

      months.push({
        month: `${date.getFullYear()}年${date.getMonth() + 1}月`,
        shortMonth: `${String(date.getFullYear()).slice(-2)}/${date.getMonth() + 1}`,
        date: date,
        data: monthData
      });
    }
    return months;
  };

  const historicalData = generateHistoricalData();
  const country = resolveCountry(userCase.country);

  // Category configuration
  const ebCategories = ['EB1', 'EB2', 'EB3', 'EW'];
  const fCategories = ['F1', 'F2A', 'F3', 'F4'];
  const allCategories = [...ebCategories, ...fCategories];

  const colors = {
    'EB1': '#3b82f6', 'EB2': '#ef4444', 'EB3': '#8b5cf6',
    'F1': '#f59e0b', 'F2A': '#10b981', 'F3': '#f97316', 'F4': '#6366f1',
  };

  // Smart filtering: identify categories that are ALWAYS Current for this country
  // (no meaningful data to plot - they'd be flat lines at top)
  const isAlwaysCurrent = (cat) => {
    return historicalData.every(m => m.data[`${cat}-${country}`] === 'C');
  };
  
  // Categories that have meaningful (non-Current) data to plot
  const plottableCategories = allCategories.filter(cat => !isAlwaysCurrent(cat));
  // Categories that are always Current (shown as a summary info, not plotted)
  const alwaysCurrentCategories = allCategories.filter(cat => isAlwaysCurrent(cat));
  
  // Apply user's filter selection AFTER smart filtering
  // But always include user's own category (even if Current) for context
  const userCat = userCase.category;
  const baseCategories = selectedCategory === 'mine'
    ? (plottableCategories.includes(userCat) ? [userCat] : [])
    : selectedCategory === 'EB' 
    ? plottableCategories.filter(c => ebCategories.includes(c))
    : selectedCategory === 'F' 
    ? plottableCategories.filter(c => fCategories.includes(c))
    : plottableCategories;
  
  // Ensure user's own category is in displayCategories (for context), even if Current.
  // Exception: 'mine' mode is explicitly just the user's category — don't expand it.
  const displayCategories = selectedCategory === 'mine'
    ? baseCategories
    : (baseCategories.includes(userCat) 
      ? baseCategories 
      : (plottableCategories.includes(userCat) ? [...baseCategories, userCat] : baseCategories));
  
  // Filter alwaysCurrent by selectedCategory (for the info message)
  const filteredAlwaysCurrent = selectedCategory === 'mine'
    ? []
    : selectedCategory === 'EB'
    ? alwaysCurrentCategories.filter(c => ebCategories.includes(c))
    : selectedCategory === 'F'
    ? alwaysCurrentCategories.filter(c => fCategories.includes(c))
    : alwaysCurrentCategories;

  const dualAxis = selectedCategory === 'all';

  // Safe date parse - 'C' returns special marker, NOT a fake future date
  const safeParseDate = (dateStr) => {
    if (!dateStr) return null;
    if (dateStr === 'C') return 'CURRENT'; // Special marker
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d;
  };

  // Get date range for a set of categories.
  // Y-axis strategy: CENTER on the user's own category + PD so the user's
  // personal story fits the chart. Other categories can extend slightly but
  // won't stretch the scale so much that the user's line squishes to an edge.
  // This matters for cases like India EB3 where EB1 sits near 2024 but EB3
  // sits at 2013 — without scoping, EB3 would be pinned to the bottom edge.
  const getDateRangeFor = (cats) => {
    const userCat = userCase.category;
    const userCatInCats = cats.includes(userCat);

    // Collect dates from USER'S category first (they drive the scale)
    const primaryDates = [];
    // Collect dates from OTHER categories (they're context, get clipped)
    const secondaryDates = [];

    historicalData.forEach(month => {
      cats.forEach(cat => {
        const d = safeParseDate(month.data[`${cat}-${country}`]);
        if (d && d !== 'CURRENT') {
          if (cat === userCat) primaryDates.push(d.getTime());
          else secondaryDates.push(d.getTime());
        }
      });
    });

    // User's PD always drives the scale — always in primary
    const pdDate = safeParseDate(userCase.priorityDate);
    if (pdDate && pdDate !== 'CURRENT') {
      primaryDates.push(pdDate.getTime());
    }

    // Forecast expected values — primary for user's cat, secondary otherwise
    cats.forEach(cat => {
      const categoryKey = `${cat}-${country}`;
      const latestData = historicalData[historicalData.length - 1].data[categoryKey];
      if (latestData === 'C') return;
      const latestDate = safeParseDate(latestData);
      const earliestDate = safeParseDate(historicalData[0].data[categoryKey]);
      if (!latestDate || latestDate === 'CURRENT') return;

      let actualEarliestDate = earliestDate;
      if (!actualEarliestDate || actualEarliestDate === 'CURRENT') {
        for (const m of historicalData) {
          const d = safeParseDate(m.data[categoryKey]);
          if (d && d !== 'CURRENT') { actualEarliestDate = d; break; }
        }
      }
      if (!actualEarliestDate || actualEarliestDate === 'CURRENT') return;

      const monthsElapsed = historicalData.length - 1;
      const totalProgress = latestDate.getTime() - actualEarliestDate.getTime();
      const avgProgressPerMonth = totalProgress / monthsElapsed;
      const bulletinMonth = bulletinAnchorDate(15).getTime();
      const maxForecastDate = bulletinMonth + forecastMonths * 30.44 * 24 * 60 * 60 * 1000;
      const expectedFuture = Math.min(
        latestDate.getTime() + avgProgressPerMonth * forecastMonths,
        maxForecastDate
      );
      if (!isNaN(expectedFuture) && isFinite(expectedFuture)) {
        if (cat === userCat) primaryDates.push(expectedFuture);
        else secondaryDates.push(expectedFuture);
      }
    });

    // If user's category is NOT in this set (e.g., showing EB for an F user),
    // fall back to using ALL dates — no user-centric scoping to apply.
    let dates;
    if (!userCatInCats || primaryDates.length === 0) {
      dates = [...primaryDates, ...secondaryDates];
    } else {
      // PRIMARY range drives the axis. SECONDARY dates expand the range only
      // up to a bounded amount (2x primary span in each direction) — enough
      // to show sibling category context but not so much they squish user's line.
      const pMin = Math.min(...primaryDates);
      const pMax = Math.max(...primaryDates);
      const pSpan = Math.max(pMax - pMin, 365 * 24 * 60 * 60 * 1000); // min 1y
      const secLimit = pSpan * 1.0; // let secondary expand range by at most pSpan on either side
      const allowedMin = pMin - secLimit;
      const allowedMax = pMax + secLimit;
      const clampedSecondary = secondaryDates.filter(d => d >= allowedMin && d <= allowedMax);
      dates = [...primaryDates, ...clampedSecondary];
    }

    if (dates.length === 0) {
      const today = new Date().getTime();
      return { min: today - 365 * 24 * 60 * 60 * 1000, max: today };
    }

    const min = Math.min(...dates);
    const max = Math.max(...dates);
    const span = max - min;

    const MS_PER_YEAR = 365 * 24 * 60 * 60 * 1000;
    const paddingMs = Math.max(span * 0.1, MS_PER_YEAR * 0.15);

    const rawMin = min - paddingMs;
    const rawMax = max + paddingMs;

    const minDate = new Date(rawMin);
    const maxDate = new Date(rawMax);

    const minQuarter = Math.floor(minDate.getMonth() / 3) * 3;
    const snappedMin = new Date(minDate.getFullYear(), minQuarter, 1).getTime();

    const maxQuarter = Math.floor(maxDate.getMonth() / 3) * 3 + 3;
    const snappedMax = new Date(maxDate.getFullYear(), maxQuarter, 1).getTime();

    return { min: snappedMin, max: snappedMax };
  };

  const ebRange = getDateRangeFor(ebCategories);
  const fRange = getDateRangeFor(fCategories);
  const singleRange = getDateRangeFor(displayCategories);

  // Chart dimensions - extended width for forecast zone
  const chartWidth = 600;
  const chartHeight = 384; // Bumped +34 to keep plot area unchanged after pad.bottom grew for 2nd pill
  const pad = { top: 30, right: dualAxis ? 50 : 20, bottom: 130, left: 32 }; // Bottom expanded to fit 2 pills (filing + approval) + hint

  // ==============================================
  // UNIFIED X-AXIS: treat ALL months (history + forecast) as one continuous timeline
  // No distinction between "history" and "forecast" in spacing logic
  // forecastMonths is dynamic (user-controlled via slider, 8-120 months)
  // ==============================================
  const TOTAL_MONTHS = historicalData.length + forecastMonths; // 12 + N months total
  const totalDrawWidth = chartWidth - pad.left - pad.right;
  const monthWidth = totalDrawWidth / (TOTAL_MONTHS - 1); // Distance between adjacent month centers
  
  // Universal X-scale: given a month slot index, return X coordinate
  const xScale = (monthSlot) => pad.left + monthSlot * monthWidth;
  
  // History zone: slots 0..(historicalData.length-1)
  const historyEndSlot = historicalData.length - 1; // 11 (= 26/5 bulletin month)
  const historyEndX = xScale(historyEndSlot);
  
  // Forecast zone: from historyEndSlot (line start) to historyEndSlot + forecastMonths
  const forecastStartSlot = historyEndSlot; // Line visually starts here
  const forecastStartX = xScale(forecastStartSlot);
  const forecastEndSlot = historyEndSlot + forecastMonths;
  const forecastEndX = xScale(forecastEndSlot);
  
  // Widths
  const historyWidth = monthWidth * historyEndSlot;
  const forecastWidth = monthWidth * forecastMonths;
  
  // "NOW" line: position at the LATEST bulletin month (slot 11 = May 2026).
  // This is the month reflected in the chart's most recent data.
  // Everything after this slot is forecast (future/projected).
  const nowX = xScale(historyEndSlot);
  const nowDate = new Date(2026, 4, 15); // May 2026 bulletin month

  // Y scale factory - CURRENT maps to top of chart (special zone)
  const CURRENT_Y_OFFSET = 10; // 距离顶部的像素
  const DATA_Y_MIN = 22; // 数据区最高点（留出Current zone条16px + 6px padding）

  // Pure y-scale (no clamp) - used for axis labels to ensure equal spacing
  const makeYScaleRaw = (range) => (dateStr) => {
    const d = safeParseDate(dateStr);
    if (!d) return null;
    if (d === 'CURRENT') return pad.top + CURRENT_Y_OFFSET;
    const normalized = (d.getTime() - range.min) / (range.max - range.min);
    return chartHeight - pad.bottom - normalized * (chartHeight - pad.top - pad.bottom);
  };

  // Clamped y-scale - used for drawing data points (prevents overflow)
  const makeYScale = (range) => (dateStr) => {
    const rawY = makeYScaleRaw(range)(dateStr);
    if (rawY === null) return null;
    const d = safeParseDate(dateStr);
    if (d === 'CURRENT') return rawY; // Current already at safe position
    return Math.max(pad.top + DATA_Y_MIN, Math.min(chartHeight - pad.bottom, rawY));
  };

  const yScaleEB = makeYScale(ebRange);
  const yScaleF = makeYScale(fRange);
  const yScaleSingle = makeYScale(singleRange);

  const getYScale = (category) => {
    if (!dualAxis) return yScaleSingle;
    return ebCategories.includes(category) ? yScaleEB : yScaleF;
  };

  // Y-axis labels generator - show every year with equal spacing
  const makeYAxisLabels = (range, yScale) => {
    const labels = [];
    const topReserved = pad.top + 22;
    const bottomLimit = chartHeight - pad.bottom;

    // Determine grain based on range span
    const spanMs = range.max - range.min;
    const spanMonths = spanMs / (30 * 24 * 60 * 60 * 1000);
    
    // Grain logic: 
    // ≤12 months → every month
    // ≤24 months → every 2 months (bi-monthly)
    // ≤60 months → every quarter (3 months)
    // ≤120 months → every half year (6 months)
    // ≤360 months (30y) → every year
    // ≤720 months (60y) → every 2 years
    // ≤1200 months (100y) → every 5 years
    // >1200 months → every 10 years
    let stepMonths;
    if (spanMonths <= 12) stepMonths = 1;
    else if (spanMonths <= 24) stepMonths = 2;
    else if (spanMonths <= 60) stepMonths = 3;
    else if (spanMonths <= 120) stepMonths = 6;
    else if (spanMonths <= 360) stepMonths = 12;
    else if (spanMonths <= 720) stepMonths = 24;
    else if (spanMonths <= 1200) stepMonths = 60;
    else stepMonths = 120;
    
    // Start from range.min's month, snap to step boundary
    const minDate = new Date(range.min);
    const startYear = minDate.getFullYear();
    const startMonth = minDate.getMonth();
    // Snap to step boundary (e.g. if step=3, snap to 0, 3, 6, 9)
    const snappedStartMonth = Math.floor(startMonth / stepMonths) * stepMonths;
    
    // Iterate through each step until we exceed range.max
    let curYear = startYear;
    let curMonth = snappedStartMonth;
    while (true) {
      const d = new Date(curYear, curMonth, 1);
      if (d.getTime() > range.max) break;
      
      const dateStr = `${curYear}-${String(curMonth + 1).padStart(2, '0')}-01`;
      const y = yScale(dateStr);
      if (y !== null && y >= topReserved && y <= bottomLimit) {
        // Label format: year for Jan, just month for others
        let labelText;
        if (curMonth === 0 || stepMonths >= 12) {
          labelText = `'${String(curYear).slice(-2)}`;
        } else {
          labelText = `${curMonth + 1}月`;
        }
        labels.push({ 
          year: curYear, 
          month: curMonth, 
          y, 
          label: labelText, 
          isYearStart: curMonth === 0 
        });
      }
      
      curMonth += stepMonths;
      while (curMonth >= 12) {
        curMonth -= 12;
        curYear += 1;
      }
      
      if (labels.length > 50) break; // safety - increased to allow more labels for wide ranges
    }
    
    // Filter out labels that are too close together (< 14px apart vertically)
    // Keep year-start labels preferentially when there's a conflict
    const MIN_Y_GAP = 14;
    const filtered = [];
    // Sort labels by y (top to bottom)
    labels.sort((a, b) => a.y - b.y);
    for (const lbl of labels) {
      if (filtered.length === 0) {
        filtered.push(lbl);
      } else {
        const last = filtered[filtered.length - 1];
        if (Math.abs(lbl.y - last.y) >= MIN_Y_GAP) {
          filtered.push(lbl);
        } else {
          // Conflict - prefer year-start labels
          if (lbl.isYearStart && !last.isYearStart) {
            filtered[filtered.length - 1] = lbl;
          }
        }
      }
    }
    return filtered;
  };

  const yScaleEBRaw = makeYScaleRaw(ebRange);
  const yScaleFRaw = makeYScaleRaw(fRange);
  const yScaleSingleRaw = makeYScaleRaw(singleRange);

  const yAxisLabelsLeft = dualAxis ? makeYAxisLabels(ebRange, yScaleEBRaw) : makeYAxisLabels(singleRange, yScaleSingleRaw);
  const yAxisLabelsRight = dualAxis ? makeYAxisLabels(fRange, yScaleFRaw) : [];

  // Compute forecast using HYBRID model (uses global LONG_TERM_RATES):
  // - First 12 months: use recent trend (responsive to current conditions)
  // - Beyond 12 months: gradually blend with historical long-term average
  const computeForecastForCategory = (cat) => {
    const categoryKey = `${cat}-${country}`;
    const latestData = historicalData[historicalData.length - 1].data[categoryKey];
    const earliestData = historicalData[0].data[categoryKey];

    // If latest is Current, just keep it current
    if (latestData === 'C') {
      return { isCurrent: true };
    }

    const latestDate = safeParseDate(latestData);
    const earliestDate = safeParseDate(earliestData);

    if (!latestDate || latestDate === 'CURRENT') return null;

    // Use first non-CURRENT date as earliest
    let actualEarliestDate = earliestDate;
    if (!actualEarliestDate || actualEarliestDate === 'CURRENT') {
      for (const m of historicalData) {
        const d = safeParseDate(m.data[categoryKey]);
        if (d && d !== 'CURRENT') {
          actualEarliestDate = d;
          break;
        }
      }
    }

    if (!actualEarliestDate || actualEarliestDate === 'CURRENT') return null;

    const MS_PER_DAY = 24 * 60 * 60 * 1000;
    const MS_PER_MONTH = 30.44 * MS_PER_DAY;
    
    // RECENT TREND: shared estimator, so this curve and the axis autofit agree.
    // Falls back to the span of whatever history is on screen when the archive can't
    // answer (e.g. a window reaching back past the 26 real bulletins).
    const monthsElapsed = historicalData.length - 1;
    const totalRecentProgress = latestDate.getTime() - actualEarliestDate.getTime();
    const recentDaysPerMonth = observedPaceFromArchive(cat, country)
      ?? ((totalRecentProgress / MS_PER_DAY) / monthsElapsed);
    
    // LONG-TERM RATE: historical average days per year (from 21-year AI model)
    const longTermDaysPerYear = getLongTermRate(cat, country);
    const catCountryKey = `${cat}-${country}`;
    
    // Use the global hybrid advance function (uses 3-layer rates from RATES_DB)
    // Multiplier depends on user-selected scenario (5 levels: lower pessimistic means less extreme stall)
    const SCENARIO_MULT = {
      optimistic: 1.5,
      somewhatOptimistic: 1.25,
      expected: 1.0,
      somewhatPessimistic: 0.75,
      pessimistic: 0.5,
    };
    const scenarioMultiplier = SCENARIO_MULT[scenario] || 1.0;
    
    const computeCumulativeAdvance = (monthN) => {
      const baseDays = computeHybridAdvance(recentDaysPerMonth, longTermDaysPerYear, monthN, catCountryKey);
      return baseDays * scenarioMultiplier * MS_PER_DAY;
    };
    
    // Use user-selected forecast range (from slider)
    const projectionMonths = forecastMonths;
    const expectedAdvance = computeCumulativeAdvance(projectionMonths);

    return {
      optimistic: latestDate.getTime() + expectedAdvance * (1.5 / scenarioMultiplier),
      somewhatOptimistic: latestDate.getTime() + expectedAdvance * (1.25 / scenarioMultiplier),
      expected: latestDate.getTime() + expectedAdvance * (1.0 / scenarioMultiplier),
      somewhatPessimistic: latestDate.getTime() + expectedAdvance * (0.75 / scenarioMultiplier),
      pessimistic: latestDate.getTime() + expectedAdvance * (0.5 / scenarioMultiplier),
      selected: latestDate.getTime() + expectedAdvance, // The line that will be drawn (per scenario)
      scenario,
      isCurrent: false,
      monthsProjected: projectionMonths,
      // Store the curve function for use when drawing the line
      computeAdvanceAt: computeCumulativeAdvance,
      // Raw formula inputs — exposed so popups can show the actual math
      recentDaysPerMonth,
      longTermDaysPerYear,
      scenarioMultiplier,
    };
  };

  // Forecast X positions (3 points in the forecast zone, starting from end of historical data)
  const forecastPoints = [
    forecastStartX + forecastWidth * 0.33,
    forecastStartX + forecastWidth * 0.66,
    forecastStartX + forecastWidth * 1.0
  ];

  const handlePointHover = (monthIndex, category) => {
    const month = historicalData[monthIndex];
    const dateStr = month.data[`${category}-${country}`];
    const d = safeParseDate(dateStr);
    setHoveredPoint({
      monthIndex, category,
      month: month.month,
      date: dateStr === 'C' ? (lang === 'en' ? 'Current' : '无排期') :
            (d && d !== 'CURRENT') ? d.toLocaleDateString(lang === 'en' ? 'en-US' : 'zh-CN', { year: 'numeric', month: 'short' }) : 'N/A',
      color: colors[category]
    });
  };

  const countryDisplay = userCase.country === 'China' ? (lang === 'tw' ? '中國大陸' : '中国大陆') :
                        userCase.country === 'Taiwan' ? '全球/港澳台' :
                        userCase.country === 'India' ? '印度' :
                        userCase.country === 'Mexico' ? '墨西哥' :
                        userCase.country === 'Philippines' ? (lang === 'tw' ? '菲律賓' : '菲律宾') :
                        userCase.country;

  // Detect if user's PD has already passed current cutoff — if so, the forecast
  // chart's main purpose (showing WHEN they'll be eligible) is moot. We show a
  // big banner instead; user can opt into the chart for historical context.
  const isAlreadyEligible = (() => {
    const pd = safeParseDate(userCase.priorityDate);
    if (!pd || pd === 'CURRENT') return false;
    const latestRaw = historicalData[historicalData.length - 1].data[`${userCase.category}-${country}`];
    if (latestRaw === 'C') return true;
    const ld = safeParseDate(latestRaw);
    if (!ld || ld === 'CURRENT') return false;
    return ld >= pd;
  })();

  // Reset "show chart anyway" when user's case changes (so a freshly-eligible
  // case gets the banner on first view rather than carrying over an old pref).
  useEffect(() => {
    setShowChartAnyway(false);
  }, [userCase.category, userCase.country, userCase.priorityDate]);

  return (
    <div style={{
      boxSizing: 'border-box',
      width: '100%',
      maxWidth: '100%',
      overflow: 'hidden',
      padding: '10px',
      background: terminalMode ? C.bg : 'var(--gc-surface)',
      border: terminalMode ? `1px solid ${C.frame}` : '1px solid var(--gc-rule)',
      borderRadius: terminalMode ? '2px' : 'var(--gc-radius-lg)',
      color: terminalMode ? C.text : 'inherit',
      transition: 'background 200ms, border-color 200ms',
    }}>
      {/* Title + terminal toggle row */}
      <div className="mb-2 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <h2 className="text-sm font-bold flex items-center gap-1.5"
              style={{ color: terminalMode ? C.text : 'var(--gc-ink)',
                       fontFamily: terminalMode ? 'ui-monospace, monospace' : 'inherit',
                       letterSpacing: terminalMode ? '0.04em' : 'normal' }}>
            <span>{terminalMode ? (lang === 'en' ? 'FORECAST' : '预测') : t.trendChart}</span>
          </h2>
          {/* Clean mono [AI] tag — replaces the animated purple/pink gradient */}
          <span style={{
            fontSize: '9px',
            fontWeight: 700,
            letterSpacing: '0.12em',
            padding: '2px 5px',
            border: `1px solid ${terminalMode ? C.axis : 'var(--gc-green)'}`,
            color: terminalMode ? C.nowText : 'var(--gc-green)',
            borderRadius: '2px',
            fontFamily: 'ui-monospace, monospace',
            lineHeight: 1,
          }}>
            AI
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] truncate"
                style={{ color: terminalMode ? C.textMuted : 'var(--gc-muted)',
                         fontFamily: terminalMode ? 'ui-monospace, monospace' : 'inherit' }}>
            <span className="gc-mono" style={{ fontWeight: 700 }}>
              {countryShortLabel(userCase.country, lang)}
            </span>
            {' · '}
            {lang === 'en' ? '12mo + forecast' : '12个月 + 预测'}
          </span>
        </div>
      </div>

      {/* When user is already eligible, the forecast chart's main message
          ("when will you be eligible") is moot. Show a bold banner by default
          and let the user opt into the historical chart if they want context. */}
      {isAlreadyEligible && !showChartAnyway && (
        <div style={{
          position: 'relative',
          padding: '40px 20px 36px',
          background: 'var(--gc-green-soft)',
          border: `1px solid var(--gc-green-border)`,
          borderRadius: 'var(--gc-radius-sm)',
          textAlign: 'center',
        }}>
          {/* Opt-in link — view the chart anyway (small, top-right) */}
          <button
            onClick={() => setShowChartAnyway(true)}
            style={{
              position: 'absolute', top: '10px', right: '10px',
              padding: '4px 8px',
              background: 'transparent',
              border: '1px solid var(--gc-green-border)',
              borderRadius: '2px',
              fontSize: '10px',
              fontWeight: 600,
              color: 'var(--gc-green-ink)',
              cursor: 'pointer',
              letterSpacing: '0.04em',
              transition: 'all 120ms',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--gc-green)';
              e.currentTarget.style.color = 'var(--gc-paper)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--gc-green-ink)';
            }}>
            {lang === 'en' ? 'View chart →' : lang === 'tw' ? '查看圖表 →' : '查看图表 →'}
          </button>
          {/* Big check-circle icon */}
          <div style={{
            width: '56px', height: '56px',
            margin: '0 auto 14px',
            borderRadius: '50%',
            background: 'var(--gc-green)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <CheckCircle2 size={32} strokeWidth={2.2} style={{ color: 'var(--gc-paper)' }} />
          </div>
          {/* Headline */}
          <h3 className="gc-serif" style={{
            fontSize: '24px',
            fontWeight: 700,
            color: 'var(--gc-green-ink)',
            margin: '0 0 6px',
            letterSpacing: '-0.01em',
            lineHeight: 1.15,
          }}>
            {lang === 'en' ? 'You can file now' : lang === 'tw' ? '排期已到' : '排期已到'}
          </h3>
          {/* Subtitle */}
          <p style={{
            fontSize: '12px',
            color: 'var(--gc-green-ink)',
            opacity: 0.85,
            margin: '0 auto',
            maxWidth: '280px',
            lineHeight: 1.5,
          }}>
            {lang === 'en'
              ? 'Your priority date has passed the current cutoff. Head to the I-485 timeline to start your filing.'
              : lang === 'tw'
              ? '你的優先日已過當前截止日,可以去 I-485 流程開始遞件。'
              : '你的优先日已过当前截止日,可以去 I-485 流程开始递件。'}
          </p>
        </div>
      )}

      {/* Chart content — hidden by default when user is already eligible */}
      {(!isAlreadyEligible || showChartAnyway) && (<>
      {/* Category Filter — terminal-aware */}
      <div className="flex items-center gap-1 mb-2 p-0.5 rounded-lg" style={{
        width: '100%',
        boxSizing: 'border-box',
        background: terminalMode ? C.cardBg : 'var(--gc-paper-soft)',
        border: terminalMode ? `1px solid ${C.frame}` : 'none',
        borderRadius: terminalMode ? '2px' : 'var(--gc-radius-sm)',
      }}>
        {['mine', 'EB', 'F', 'all'].map(key => {
          const active = selectedCategory === key;
          const label = key === 'mine' ? (lang === 'en' ? `Only ${userCat}` : lang === 'tw' ? `只看 ${userCat}` : `只看 ${userCat}`)
                      : key === 'EB' ? (lang === 'en' ? 'Employment' : '职业移民')
                      : key === 'F'  ? (lang === 'en' ? 'Family' : '亲属移民')
                      :                 (lang === 'en' ? 'All' : '全部');
          return (
            <button key={key} onClick={() => setSelectedCategory(key)}
              style={{
                flex: '1 1 0%', minWidth: 0, boxSizing: 'border-box',
                padding: '5px 4px',
                fontSize: '11px',
                fontWeight: active ? 700 : 600,
                borderRadius: terminalMode ? '2px' : 'var(--gc-radius-sm)',
                background: active
                  ? (terminalMode ? C.nowLine : 'var(--gc-surface)')
                  : 'transparent',
                color: active
                  ? (terminalMode ? C.bg : 'var(--gc-ink)')
                  : (terminalMode ? C.textMuted : 'var(--gc-muted)'),
                border: active && !terminalMode ? '1px solid var(--gc-rule)' : '1px solid transparent',
                boxShadow: active && !terminalMode ? '0 1px 2px rgba(0,0,0,0.04)' : 'none',
                fontFamily: terminalMode ? 'ui-monospace, monospace' : 'inherit',
                letterSpacing: terminalMode ? '0.04em' : 'normal',
                transition: 'all 120ms',
              }}
              className="truncate">
              {terminalMode ? label.toUpperCase() : label}
            </button>
          );
        })}
      </div>

      {/* Combined: Chart title + Legend — terminal-aware text colors */}
      <div className="mb-0.5 px-0.5 flex items-center gap-2 flex-wrap">
        <span className="text-[10px] font-semibold flex-shrink-0"
              style={{ color: terminalMode ? C.nowText : 'var(--gc-blue)',
                       fontFamily: terminalMode ? 'ui-monospace, monospace' : 'inherit',
                       letterSpacing: terminalMode ? '0.08em' : 'normal' }}>
          {terminalMode ? (lang === 'en' ? 'TABLE·A' : 'A表') : (lang === 'en' ? 'Table A' : '表A')}
        </span>
        <span className="text-[10px] flex-shrink-0" style={{ color: terminalMode ? C.axis : 'var(--gc-muted-soft)' }}>·</span>
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          {displayCategories.map((cat) => (
            <span key={cat} className="flex items-center gap-0.5 flex-shrink-0">
              <span style={{
                display: 'inline-block',
                width: 10, height: 2,
                backgroundColor: colors[cat],
                borderRadius: 1
              }}></span>
              <span className="text-[10px] font-semibold"
                    style={{ color: colors[cat],
                             fontFamily: terminalMode ? 'ui-monospace, monospace' : 'inherit' }}>{cat}</span>
            </span>
          ))}
        </div>
        <span className="text-[9px] flex-shrink-0 ml-auto"
              style={{ color: terminalMode ? C.textMuted : 'var(--gc-muted)',
                       fontFamily: terminalMode ? 'ui-monospace, monospace' : 'inherit' }}>
          {terminalMode
            ? (countryShortLabel(userCase.country, lang))
            : (country === 'China' ? '中国大陆' :
               country === 'India' ? '印度' :
               country === 'Other' ? (lang === 'en' ? 'Others' : '全球/其他') :
               country)}
        </span>
      </div>

      {/* Line-style legend: solid vs dotted */}
      <div className="mb-1.5 px-0.5 flex items-center gap-3 text-[9px]"
           style={{ color: terminalMode ? C.textMuted : 'var(--gc-muted)' }}>
        <span className="flex items-center gap-1">
          <svg width="16" height="4"><line x1="0" y1="2" x2="16" y2="2" stroke={terminalMode ? C.text : "#475569"} strokeWidth="2" strokeLinecap="round" /></svg>
          <span style={{ fontFamily: terminalMode ? 'ui-monospace, monospace' : 'inherit' }}>
            {lang === 'en' ? 'backlog progress' : '有排期推进'}
          </span>
        </span>
        <span className="flex items-center gap-1">
          <svg width="16" height="4"><line x1="0" y1="2" x2="16" y2="2" stroke={terminalMode ? C.axisMuted : "#cbd5e1"} strokeWidth="1" strokeDasharray="1,3" strokeLinecap="round" /></svg>
          <span style={{ color: terminalMode ? C.textMuted : 'var(--gc-muted-soft)',
                         fontFamily: terminalMode ? 'ui-monospace, monospace' : 'inherit' }}>
            {lang === 'en' ? 'current (no wait)' : '无排期期间'}
          </span>
        </span>
      </div>

      {/* Dual-axis indicator */}
      {dualAxis && (
        <div className="flex items-center justify-between mb-1 text-[10px] px-2">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm" style={{ background: terminalMode ? C.nowLine : '#3b82f6' }}></span>
            <span style={{ color: terminalMode ? C.textMuted : 'var(--gc-muted)',
                           fontFamily: terminalMode ? 'ui-monospace, monospace' : 'inherit' }}>
              {lang === 'en' ? 'EB (left)' : 'EB (左轴)'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span style={{ color: terminalMode ? C.textMuted : 'var(--gc-muted)',
                           fontFamily: terminalMode ? 'ui-monospace, monospace' : 'inherit' }}>
              {lang === 'en' ? 'F (right)' : 'F (右轴)'}
            </span>
            <span className="w-2 h-2 rounded-sm" style={{ background: terminalMode ? C.nowText : '#f59e0b' }}></span>
          </div>
        </div>
      )}
      
      {/* Always-Current categories info (shown when some categories are hidden from chart) */}
      {filteredAlwaysCurrent.length > 0 && (
        <div className="mb-2 mx-2 px-2.5 py-1.5 bg-emerald-50 border border-emerald-200 rounded-md flex items-center gap-1.5 flex-wrap">
          <CheckCircle2 size={11} className="text-emerald-600 flex-shrink-0" />
          <span className="text-[10px] text-emerald-700 font-semibold">
            {lang === 'en' ? 'Always Current:' : '一直无排期:'}
          </span>
          {filteredAlwaysCurrent.map((cat, idx) => (
            <React.Fragment key={cat}>
              <span className="text-[10px] font-bold" style={{ color: colors[cat] }}>{cat}</span>
              {idx < filteredAlwaysCurrent.length - 1 && <span className="text-emerald-400">·</span>}
            </React.Fragment>
          ))}
          <span className="text-[9px] text-emerald-600 ml-1">
            ({lang === 'en' ? 'no wait for your country' : '你的出生国无需等待'})
          </span>
        </div>
      )}

      {/* SVG Chart with forecast zone (only render if there are categories to plot) */}
      {displayCategories.length === 0 ? (
        <div className="p-8 text-center bg-emerald-50 border-2 border-dashed border-emerald-200 rounded-xl">
          <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2" />
          <div className="text-sm font-bold text-emerald-900 mb-1">
            {lang === 'en' ? 'All Current for your country!' : '你的出生国所有类别都无排期！'}
          </div>
          <p className="text-xs text-emerald-700">
            {lang === 'en' 
              ? 'No wait times to display for the selected filter.' 
              : '当前筛选下没有需要等待的类别。'}
          </p>
        </div>
      ) : (
      <div className="relative" style={{ width: '100%', overflow: 'hidden' }}>
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`}
             preserveAspectRatio="xMidYMid meet"
             style={{ 
               width: '100%',
               height: 'auto',
               maxWidth: '100%',
               display: 'block',
               touchAction: 'pan-y' 
             }}
             onTouchStart={(e) => {
               e.preventDefault();
               // If the crossover popup is currently open, treat any tap on the chart as "dismiss"
               // rather than registering a new hover. This keeps popups mutually exclusive.
               if (showCrossoverInfo) {
                 setShowCrossoverInfo(false);
                 return;
               }
               const svgEl = e.currentTarget;
               const rect = svgEl.getBoundingClientRect();
               const touch = e.touches[0];
               // Convert touch position to SVG viewBox coordinates
               const svgX = ((touch.clientX - rect.left) / rect.width) * chartWidth;

               // Determine if touch is in historical zone or forecast zone
               if (svgX >= pad.left && svgX < forecastStartX) {
                 // Historical zone - find closest month index
                 const relativeX = svgX - pad.left;
                 const monthIdx = Math.round((relativeX / historyWidth) * (historicalData.length - 1));
                 const clampedIdx = Math.max(0, Math.min(historicalData.length - 1, monthIdx));
                 setHoveredMonthIndex(clampedIdx);
                 setHoveredForecast(null);
               } else if (svgX >= forecastStartX && svgX <= forecastStartX + forecastWidth) {
                 // Forecast zone - find month offset (1-8)
                 const relativeX = svgX - forecastStartX;
                 // Use actual forecastMonths (dynamic via slider) instead of hardcoded 8
                 const monthOffset = Math.max(1, Math.min(forecastMonths, Math.ceil((relativeX / forecastWidth) * forecastMonths)));
                 const xCenter = xScale(historyEndSlot + monthOffset);
                 setHoveredForecast({ x: xCenter, monthOffset });
                 setHoveredMonthIndex(null);
               }
             }}
             onTouchMove={(e) => {
               e.preventDefault();
               if (showCrossoverInfo) return; // Crossover popup open — don't track hover
               const svgEl = e.currentTarget;
               const rect = svgEl.getBoundingClientRect();
               const touch = e.touches[0];
               const svgX = ((touch.clientX - rect.left) / rect.width) * chartWidth;

               if (svgX >= pad.left && svgX < forecastStartX) {
                 const relativeX = svgX - pad.left;
                 const monthIdx = Math.round((relativeX / historyWidth) * (historicalData.length - 1));
                 const clampedIdx = Math.max(0, Math.min(historicalData.length - 1, monthIdx));
                 setHoveredMonthIndex(clampedIdx);
                 setHoveredForecast(null);
               } else if (svgX >= forecastStartX && svgX <= forecastStartX + forecastWidth) {
                 const relativeX = svgX - forecastStartX;
                 // Use actual forecastMonths (dynamic via slider) instead of hardcoded 8
                 const monthOffset = Math.max(1, Math.min(forecastMonths, Math.ceil((relativeX / forecastWidth) * forecastMonths)));
                 const xCenter = xScale(historyEndSlot + monthOffset);
                 setHoveredForecast({ x: xCenter, monthOffset });
                 setHoveredMonthIndex(null);
               }
             }}
             onTouchEnd={() => {
               // Keep the highlight visible - don't clear on touchEnd
               // User can tap elsewhere to change it
             }}
             onMouseMove={(e) => {
               // Desktop: also support mouse drag/hover
               if (showCrossoverInfo) return; // Crossover popup open — don't track hover
               const svgEl = e.currentTarget;
               const rect = svgEl.getBoundingClientRect();
               const svgX = ((e.clientX - rect.left) / rect.width) * chartWidth;

               if (svgX >= pad.left && svgX < forecastStartX) {
                 const relativeX = svgX - pad.left;
                 const monthIdx = Math.round((relativeX / historyWidth) * (historicalData.length - 1));
                 const clampedIdx = Math.max(0, Math.min(historicalData.length - 1, monthIdx));
                 setHoveredMonthIndex(clampedIdx);
                 setHoveredForecast(null);
               } else if (svgX >= forecastStartX && svgX <= forecastStartX + forecastWidth) {
                 const relativeX = svgX - forecastStartX;
                 // Use actual forecastMonths (dynamic via slider) instead of hardcoded 8
                 const monthOffset = Math.max(1, Math.min(forecastMonths, Math.ceil((relativeX / forecastWidth) * forecastMonths)));
                 const xCenter = xScale(historyEndSlot + monthOffset);
                 setHoveredForecast({ x: xCenter, monthOffset });
                 setHoveredMonthIndex(null);
               }
             }}
             onMouseLeave={() => {
               setHoveredMonthIndex(null);
               setHoveredForecast(null);
             }}>

          {/* Unified background - one single plotting area */}
          <rect x={pad.left} y={pad.top}
            width={chartWidth - pad.left - pad.right}
            height={chartHeight - pad.top - pad.bottom}
            fill={C.bg} stroke={C.frame} strokeWidth="1" />

          {/* Forecast zone - subtle green tint overlay. 
              Starts at slot 12 (26/6) since slot 11 (26/5) is still real historical data */}
          <rect x={xScale(historyEndSlot + 1)} y={pad.top}
            width={xScale(forecastEndSlot) - xScale(historyEndSlot + 1)}
            height={chartHeight - pad.top - pad.bottom}
            fill={C.forecastZone} fillOpacity={terminalMode ? "1" : "0.4"} />

          {/* Forecast zone label */}
          <text x={xScale(forecastEndSlot) - 6} y={pad.top + 11}
            textAnchor="end" fontSize="8" fill={C.nowText} fontWeight="600"
            fontFamily={terminalMode ? "ui-monospace, monospace" : "inherit"}
            letterSpacing={terminalMode ? "0.1em" : "normal"}>
            {terminalMode ? (lang === 'en' ? 'FORECAST' : '预测区') : (lang === 'en' ? 'Forecast' : '预测区')}
          </text>

          {/* Y-axis grid lines */}
          {yAxisLabelsLeft.map(label => (
            <g key={`left-${label.year}-${label.month || 0}`}>
              <line x1={pad.left} y1={label.y} x2={chartWidth - pad.right} y2={label.y}
                stroke={label.isYearStart ? C.gridMajor : C.gridMinor} strokeWidth="1" 
                strokeDasharray={label.isYearStart ? "3,2" : "1,3"} 
                opacity={label.isYearStart ? "0.8" : "0.5"} />
              <text x={pad.left - 5} y={label.y + 3} textAnchor="end" fontSize="9"
                    fill={dualAxis ? "#3b82f6" : (label.isYearStart ? C.text : C.textMuted)} 
                    fontWeight={label.isYearStart ? "700" : "400"}
                    fontFamily={terminalMode ? "ui-monospace, monospace" : "inherit"}>
                {label.label}
              </text>
            </g>
          ))}

          {dualAxis && yAxisLabelsRight.map(label => (
            <g key={`right-${label.year}-${label.month || 0}`}>
              <text x={chartWidth - pad.right + 5} y={label.y + 3} textAnchor="start" fontSize="9"
                    fill="#f59e0b" fontWeight={label.isYearStart ? "700" : "400"}
                    fontFamily={terminalMode ? "ui-monospace, monospace" : "inherit"}>
                {label.label}
              </text>
            </g>
          ))}

          {/* NOW vertical line at today's position */}
          <line x1={nowX} y1={pad.top} x2={nowX} y2={chartHeight - pad.bottom}
            stroke={C.nowLine} strokeWidth={terminalMode ? "1.5" : "2.5"} strokeDasharray="5,3" opacity="0.95" />
          <text x={nowX} y={pad.top - 4}
            textAnchor="middle" fontSize="10" fill={C.nowText} fontWeight="700"
            fontFamily={terminalMode ? "ui-monospace, monospace" : "inherit"}
            letterSpacing={terminalMode ? "0.12em" : "normal"}>
            {terminalMode ? (lang === 'en' ? 'NOW' : 'NOW') : (lang === 'en' ? 'NOW' : '现在')}
          </text>

          {/* User's Priority Date horizontal line - shows how far user needs to go */}
          {(() => {
            const pdDateStr = userCase.priorityDate;
            if (!pdDateStr) return null;
            
            // Use the yScale of user's own category (or default if not in display)
            const userCatYScale = getYScale(userCase.category);
            const userPdY = userCatYScale(pdDateStr);
            
            if (userPdY === null || userPdY === undefined) return null;
            // Only draw if within visible range
            if (userPdY < pad.top || userPdY > chartHeight - pad.bottom) return null;

            // Try to compute where this user's crossover X sits.
            // If computable, the "Your PD" label will attach there instead of floating
            // at the far right edge — the label follows the crossover point.
            let crossoverX = null;
            try {
              const pdDate = safeParseDate(pdDateStr);
              const latestRaw = historicalData[historicalData.length - 1].data[`${userCase.category}-${country}`];
              const latestDate = safeParseDate(latestRaw);
              if (pdDate && pdDate !== 'CURRENT' && latestDate && latestDate !== 'CURRENT' && latestDate < pdDate) {
                const fc = computeForecastForCategory(userCase.category);
                if (fc && !fc.isCurrent && fc.computeAdvanceAt) {
                  const targetMs = pdDate.getTime() - latestDate.getTime();
                  const maxAdv = fc.computeAdvanceAt(forecastMonths);
                  if (maxAdv >= targetMs) {
                    let lo = 0, hi = forecastMonths;
                    for (let iter = 0; iter < 30; iter++) {
                      const mid = (lo + hi) / 2;
                      if (fc.computeAdvanceAt(mid) < targetMs) lo = mid;
                      else hi = mid;
                      if (hi - lo < 0.01) break;
                    }
                    const monthsToReach = (lo + hi) / 2;
                    crossoverX = xScale(historyEndSlot + monthsToReach);
                  }
                }
              }
            } catch (e) { /* noop */ }

            return (
              <g>
                {/* Horizontal dashed line at user's PD level.
                    Trims at crossoverX if known — past the crossover point, the line
                    has no informational value (the forecast has already reached PD).
                    Extending further is just visual noise. */}
                <line x1={pad.left} y1={userPdY} 
                  x2={crossoverX !== null ? crossoverX : chartWidth - pad.right} y2={userPdY}
                  stroke={C.pdLine} strokeWidth="1.5" strokeDasharray="4,3" opacity={terminalMode ? "0.85" : "0.7"} />
                {/* Label — larger, theme-green, attached to crossover point if we know where it is.
                    Falls back to right edge if no crossover (e.g. PD already reached, or never). */}
                {(() => {
                  const labelText = lang === 'en' ? 'Your PD' : '你的优先日';
                  // Approximate width needed for the text (at 11px font, Chinese avg ~11.5px/char, English ~6.5)
                  const approxTextWidth = lang === 'en'
                    ? labelText.length * 6.5 + 14
                    : labelText.length * 11.5 + 14;
                  const badgeW = Math.max(70, approxTextWidth);
                  const badgeH = 18;
                  // Vertical placement: badge sits ABOVE PD line by default to avoid
                  // overlapping with both the dashed PD line AND the forecast curve
                  // (which converges on PD from below-left). Connector line links
                  // the badge down to the crossover marker.
                  // Edge cases:
                  //   - If PD is near chart top → place below (would clip otherwise)
                  //   - If PD is near chart bottom → place above (might overlap with
                  //     historical data but cleaner than clipping)
                  const GAP = 6;
                  const tooCloseToTop = userPdY < pad.top + badgeH + GAP + 2;
                  const placeAbove = !tooCloseToTop;
                  const badgeY = placeAbove
                    ? userPdY - badgeH - GAP   // badge above PD line (with gap)
                    : userPdY + GAP;            // badge below PD line (fallback)
                  const textY = badgeY + badgeH / 2 + 4;
                  // Horizontal: attach to crossover if known, otherwise right edge.
                  // When placed ABOVE and crossover exists, center the badge on the
                  // crossover X (with a connector line); otherwise fall back to side-placement.
                  let badgeX;
                  let connectorX = null; // x-coord of vertical connector line, null if no connector
                  if (crossoverX !== null) {
                    // Center above crossover for cleanest visual flag pattern
                    const centeredX = crossoverX - badgeW / 2;
                    if (centeredX >= pad.left && centeredX + badgeW <= chartWidth - pad.right) {
                      badgeX = centeredX;
                      connectorX = crossoverX;
                    } else if (centeredX + badgeW > chartWidth - pad.right) {
                      // Would clip right edge — anchor to right, connect from nearest edge
                      badgeX = chartWidth - pad.right - badgeW;
                      connectorX = Math.min(crossoverX, badgeX + badgeW - 6);
                    } else {
                      badgeX = pad.left;
                      connectorX = Math.max(crossoverX, badgeX + 6);
                    }
                  } else {
                    badgeX = chartWidth - pad.right - badgeW;
                  }
                  return (
                    <g>
                      {/* Vertical connector line from badge to PD line (if we have a crossover).
                          Only drawn when badge is NOT overlapping with PD line already. */}
                      {connectorX !== null && placeAbove && (
                        <line
                          x1={connectorX} y1={badgeY + badgeH}
                          x2={connectorX} y2={userPdY}
                          stroke={terminalMode ? C.pdBadge : 'var(--gc-green)'}
                          strokeWidth="1.5"
                          opacity="0.6" />
                      )}
                      {connectorX !== null && !placeAbove && (
                        <line
                          x1={connectorX} y1={userPdY}
                          x2={connectorX} y2={badgeY}
                          stroke={terminalMode ? C.pdBadge : 'var(--gc-green)'}
                          strokeWidth="1.5"
                          opacity="0.6" />
                      )}
                      {/* Badge background — theme green */}
                      <rect x={badgeX} y={badgeY}
                        width={badgeW} height={badgeH} rx={terminalMode ? "0" : "3"}
                        fill={terminalMode ? C.pdBadge : 'var(--gc-green)'}
                        stroke={terminalMode ? "none" : 'var(--gc-green-ink)'}
                        strokeWidth="0.5"
                        opacity="0.98" />
                      <text x={badgeX + badgeW / 2} y={textY}
                        textAnchor="middle" fontSize="11"
                        fill={terminalMode ? C.bg : 'var(--gc-paper)'}
                        fontWeight="700"
                        fontFamily={terminalMode ? "ui-monospace, monospace" : "inherit"}
                        letterSpacing={terminalMode ? "0.06em" : "0.02em"}>
                        {terminalMode ? (lang === 'en' ? 'YOUR PD' : 'YOUR PD') : labelText}
                      </text>
                    </g>
                  );
                })()}
              </g>
            );
          })()}

          {/* Estimated "eligible to file" date - where user's category forecast crosses PD line */}
          {(() => {
            const pdDateStr = userCase.priorityDate;
            if (!pdDateStr) return null;
            const pdDate = safeParseDate(pdDateStr);
            if (!pdDate || pdDate === 'CURRENT') return null;
            
            const userCat = userCase.category;
            const categoryKey = `${userCat}-${country}`;
            const latestData = historicalData[historicalData.length - 1].data[categoryKey];
            
            // If user's category is already Current or PD already reached, no need for crossover line
            if (latestData === 'C') return null;
            const latestDate = safeParseDate(latestData);
            if (!latestDate || latestDate === 'CURRENT') return null;
            if (latestDate >= pdDate) return null; // PD already reached
            
            // Compute forecast for user's category
            const forecast = computeForecastForCategory(userCat);
            if (!forecast || forecast.isCurrent) return null;
            
            // NEW: Find crossover by searching the NON-LINEAR forecast curve
            // Binary search for the month where projected date === pd
            const computeAdvanceAt = forecast.computeAdvanceAt;
            if (!computeAdvanceAt) return null;
            
            const targetAdvanceMs = pdDate.getTime() - latestDate.getTime();
            if (targetAdvanceMs <= 0) return null;
            
            // Binary search: find month M such that computeAdvanceAt(M) == targetAdvanceMs
            let lo = 0, hi = forecastMonths;
            // First, check if the target is reachable within forecast range
            const maxAdvance = computeAdvanceAt(forecastMonths);
            if (maxAdvance < targetAdvanceMs) return null; // Never reaches PD in this range
            
            for (let iter = 0; iter < 30; iter++) {
              const mid = (lo + hi) / 2;
              const advance = computeAdvanceAt(mid);
              if (advance < targetAdvanceMs) lo = mid;
              else hi = mid;
              if (hi - lo < 0.01) break;
            }
            const monthsToReach = (lo + hi) / 2;
            
            if (monthsToReach <= 0 || monthsToReach > forecastMonths) return null;
            
            // Position X at this month slot
            const crossoverSlot = historyEndSlot + monthsToReach;
            const crossoverX = xScale(crossoverSlot);
            
            // Calculate the estimated calendar date
            const bulletinMonth = bulletinAnchorDate(15);
            const crossoverCalDate = new Date(bulletinMonth);
            const wholeMonths = Math.floor(monthsToReach);
            const fractionalDays = (monthsToReach - wholeMonths) * 30;
            crossoverCalDate.setMonth(crossoverCalDate.getMonth() + wholeMonths);
            crossoverCalDate.setDate(crossoverCalDate.getDate() + Math.round(fractionalDays));
            // Readable "41年10月" / "Oct '41", not the cryptic "41/10" two-digit slash form.
            const crossoverLabel = lang === 'en'
              ? `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][crossoverCalDate.getMonth()]} '${String(crossoverCalDate.getFullYear()).slice(-2)}`
              : `${String(crossoverCalDate.getFullYear()).slice(-2)}年${crossoverCalDate.getMonth() + 1}月`;

            // APPROVAL DATE ESTIMATE — mirrors Overview's I-485 card approval logic EXACTLY
            // so both views show the same range. The Overview calc is:
            //   1. Find anchor: latest done step with stepActualDates entry
            //   2. effectiveBaseline = anchor.date - anchor.estimatedDays
            //      (or filingBaseline if no anchor)
            //   3. Range from baseline: estMin..estMax * speedMult
            //   4. A-gate floor: aCurrentDate + progressBuffer * speedMult
            //   5. Take max of (baseline-based, A-gate-based)
            const speedMult = { fast: 0.75, average: 1.0, slow: 1.35 }[i485ServiceCenter] || 1.0;
            const stepsDone = completedI485Steps.length;

            // Step metadata — duplicated from Overview; if changed, update both
            const I485_STEP_IDS = ['receipt', 'biometrics', 'ead', 'ap', 'interview', 'approval'];
            const STEP_ESTIMATED_DAYS = { receipt: 14, biometrics: 60, ead: 120, ap: 150, interview: 365, approval: 330 };
            const APPROVAL_EST_MIN = 180;
            const APPROVAL_EST_MAX = 450;

            // Find anchor (latest done step with actual date entered)
            let effectiveBaseline = null;
            for (let i = I485_STEP_IDS.length - 1; i >= 0; i--) {
              const id = I485_STEP_IDS[i];
              if (completedI485Steps.includes(id) && stepActualDates[id]) {
                const anchorDate = new Date(stepActualDates[id]);
                effectiveBaseline = new Date(anchorDate.getTime() - STEP_ESTIMATED_DAYS[id] * 86400000);
                break;
              }
            }
            // If no anchor, use today as filing proxy (user can file soon when B current)
            if (!effectiveBaseline) effectiveBaseline = new Date();

            // Base range from effectiveBaseline + approval estimates
            let earliestApproval = new Date(effectiveBaseline.getTime() + Math.round(APPROVAL_EST_MIN * speedMult) * 86400000);
            let latestApproval   = new Date(effectiveBaseline.getTime() + Math.round(APPROVAL_EST_MAX * speedMult) * 86400000);

            // A-gate: approval can't happen until A is current (= crossoverCalDate) + progress buffer
            // Progress-scaled: further along in I-485 → shorter post-A buffer
            const progressBufferMin = [180, 150, 120, 80, 50, 20][stepsDone] || 180;
            const progressBufferMax = [330, 280, 220, 160, 100, 60][stepsDone] || 330;
            const postAMin = new Date(crossoverCalDate.getTime() + Math.round(progressBufferMin * speedMult) * 86400000);
            const postAMax = new Date(crossoverCalDate.getTime() + Math.round(progressBufferMax * speedMult) * 86400000);
            if (postAMin.getTime() > earliestApproval.getTime()) earliestApproval = postAMin;
            if (postAMax.getTime() > latestApproval.getTime())   latestApproval = postAMax;

            // If user entered actual approval date, collapse to that single point
            if (stepActualDates.approval) {
              const actual = new Date(stepActualDates.approval);
              earliestApproval = actual;
              latestApproval = actual;
            }

            // For the small chart pill, show a RANGE directly ("27年3–5月"), readable
            // year-month words instead of the cryptic YY/M slash form. Same-year ranges
            // collapse the year so the text still fits the 144px pill.
            const enMon = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
            const fmtYM = (d) => lang === 'en'
              ? `${enMon[d.getMonth()]} '${String(d.getFullYear()).slice(-2)}`
              : `${String(d.getFullYear()).slice(-2)}年${d.getMonth() + 1}月`;
            const approvalLabel = (() => {
              const a = earliestApproval, b = latestApproval;
              if (a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()) return fmtYM(a);
              if (a.getFullYear() === b.getFullYear()) {
                return lang === 'en'
                  ? `${enMon[a.getMonth()]}–${enMon[b.getMonth()]} '${String(a.getFullYear()).slice(-2)}`
                  : `${String(a.getFullYear()).slice(-2)}年${a.getMonth() + 1}–${b.getMonth() + 1}月`;
              }
              return `${fmtYM(a)}–${fmtYM(b)}`;
            })();
            // If the user has already completed the approval step in Overview,
            // celebrate that instead of showing a forecast.
            const alreadyApproved = completedI485Steps.includes('approval');
            const speedSuffix = i485ServiceCenter === 'fast'
              ? (lang === 'en' ? ' (fast SC)' : '(快)')
              : i485ServiceCenter === 'slow'
              ? (lang === 'en' ? ' (slow SC)' : '(慢)')
              : '';
            
            return (
              <g>
                {/* Vertical crossover line — only the LOWER half (below PD level).
                    The upper half is redundant now: badge + connector + dot already
                    triple-mark the crossover point above. Keeping the lower half
                    visually tethers the crossover dot to the pill below the chart. */}
                <line x1={crossoverX} y1={getYScale(userCat)(userCase.priorityDate)} 
                  x2={crossoverX} y2={chartHeight - pad.bottom}
                  stroke={C.crossover} strokeWidth="2" strokeDasharray="4,3" opacity="0.9" 
                  style={{ pointerEvents: 'none' }} />
                {/* Crossover point marker - not clickable */}
                <circle cx={crossoverX} cy={getYScale(userCat)(userCase.priorityDate)}
                  r="5" fill={C.crossover} stroke={terminalMode ? C.bg : "white"} strokeWidth="2" 
                  style={{ pointerEvents: 'none' }} />
                {/* Clickable pill — editorial design, theme-aware color (achievement, not warning) */}
                <g 
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setShowCrossoverInfo(!showCrossoverInfo);
                    setHoveredMonthIndex(null);
                    setHoveredForecast(null);
                  }}
                  onTouchStart={(e) => { 
                    e.stopPropagation(); 
                    e.preventDefault();
                    setShowCrossoverInfo(!showCrossoverInfo);
                    setHoveredMonthIndex(null);
                    setHoveredForecast(null);
                  }}>
                  {/* Invisible hit area — big for thumb, covers BOTH pills now */}
                  <rect x={crossoverX - 100} y={chartHeight - pad.bottom + 34} 
                    width="200" height="82" rx="4"
                    fill="transparent" />
                  {/* Thin "flagpole" line from crossover point down to the first pill — visual tether */}
                  <line x1={crossoverX} y1={getYScale(userCat)(userCase.priorityDate)}
                        x2={crossoverX} y2={chartHeight - pad.bottom + 42}
                        stroke={C.crossover} strokeWidth="1" strokeDasharray="1,2" opacity="0.4"
                        style={{ pointerEvents: 'none' }} />
                  {/* PILL 1 — Filing / 可递件 */}
                  <rect x={crossoverX - 72} y={chartHeight - pad.bottom + 46} 
                    width="144" height="26" 
                    rx={terminalMode ? "1" : "3"}
                    fill={C.crossoverBadge}
                    stroke={terminalMode ? C.bg : C.crossoverBadge}
                    strokeWidth="1" />
                  {/* Tiny dot — echoes the crossover point on the chart */}
                  <circle cx={crossoverX - 58} cy={chartHeight - pad.bottom + 59}
                          r="3" fill={C.crossoverText}
                          style={{ pointerEvents: 'none' }} />
                  <text x={crossoverX - 4} y={chartHeight - pad.bottom + 63}
                    textAnchor="middle" fontSize="11.5"
                    fill={C.crossoverText} fontWeight="700"
                    fontFamily={terminalMode ? "ui-monospace, monospace" : "inherit"}
                    letterSpacing={terminalMode ? "0.04em" : "0.005em"}
                    style={{ pointerEvents: 'none' }}>
                    {lang === 'en' ? `Eligible ~${crossoverLabel}` : `预计 ${crossoverLabel} 可递`}
                  </text>
                  <g transform={`translate(${crossoverX + 60}, ${chartHeight - pad.bottom + 59})`}
                     style={{ pointerEvents: 'none' }}>
                    <path d="M -2.5 -3.5 L 1.5 0 L -2.5 3.5"
                          stroke={C.crossoverText} strokeWidth="1.6" fill="none"
                          strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
                  </g>

                  {/* PILL 2 — Final GC approval / 拿到绿卡 — OUTLINED variant to differentiate.
                      Same width + position, 6px below the filing pill. */}
                  <rect x={crossoverX - 72} y={chartHeight - pad.bottom + 78} 
                    width="144" height="26" 
                    rx={terminalMode ? "1" : "3"}
                    fill={terminalMode ? C.bg : 'var(--gc-paper)'}
                    stroke={C.crossoverBadge}
                    strokeWidth="1.25" />
                  {/* Tiny hollow circle marker */}
                  <circle cx={crossoverX - 58} cy={chartHeight - pad.bottom + 91}
                          r="3" fill={terminalMode ? C.bg : 'var(--gc-paper)'}
                          stroke={C.crossoverBadge} strokeWidth="1.5"
                          style={{ pointerEvents: 'none' }} />
                  <text x={crossoverX - 4} y={chartHeight - pad.bottom + 95}
                    textAnchor="middle" fontSize="11.5"
                    fill={C.crossoverBadge} fontWeight="700"
                    fontFamily={terminalMode ? "ui-monospace, monospace" : "inherit"}
                    letterSpacing={terminalMode ? "0.04em" : "0.005em"}
                    style={{ pointerEvents: 'none' }}>
                    {alreadyApproved
                      ? (lang === 'en' ? '✓ Approved' : '✓ 已获批')
                      : (lang === 'en' ? `GC ${approvalLabel}` : `预计 ${approvalLabel} 获批`)}
                  </text>

                  {/* Hint — editorial small-caps, theme-aware — moved down for 2nd pill */}
                  <text x={crossoverX} y={chartHeight - pad.bottom + 118}
                    textAnchor="middle" fontSize="8.5"
                    fill={terminalMode ? C.crossover : 'var(--gc-muted)'}
                    fontWeight="600"
                    fontFamily={terminalMode ? "ui-monospace, monospace" : "inherit"}
                    letterSpacing="0.14em"
                    style={{ pointerEvents: 'none' }}>
                    {lang === 'en' ? `FILING + I-485${speedSuffix} · TAP` : `递件 + I-485${speedSuffix} · 点击查看`}
                  </text>
                </g>
              </g>
            );
          })()}

          {/* "Already eligible" badge — shown when PD has already passed cutoff.
              Replaces the crossover pill which doesn't apply in this case. */}
          {(() => {
            const pdDateStr = userCase.priorityDate;
            if (!pdDateStr) return null;
            const pdDate = safeParseDate(pdDateStr);
            if (!pdDate || pdDate === 'CURRENT') return null;
            const latestData = historicalData[historicalData.length - 1].data[`${userCase.category}-${country}`];
            // Only render when already current or PD has surpassed cutoff
            const isAlreadyEligible = latestData === 'C' || (() => {
              const ld = safeParseDate(latestData);
              return ld && ld !== 'CURRENT' && ld >= pdDate;
            })();
            if (!isAlreadyEligible) return null;

            const badgeW = lang === 'en' ? 132 : 124;
            const badgeH = 26;
            const badgeX = chartWidth / 2 - badgeW / 2;
            const badgeY = chartHeight - pad.bottom + 46;
            return (
              <g style={{ pointerEvents: 'none' }}>
                {/* Pill — same vertical position as the crossover pill, so the layout feels consistent.
                    Green fill with check icon on the left. */}
                <rect x={badgeX} y={badgeY}
                  width={badgeW} height={badgeH}
                  rx={terminalMode ? "1" : "3"}
                  fill={C.crossoverBadge}
                  stroke={terminalMode ? C.bg : C.crossoverBadge}
                  strokeWidth="1" />
                {/* Check-circle glyph at left */}
                <circle cx={badgeX + 14} cy={badgeY + 13} r="6.5"
                  fill="none" stroke={C.crossoverText} strokeWidth="1.3" />
                <path d={`M ${badgeX + 11} ${badgeY + 13} L ${badgeX + 13.5} ${badgeY + 15.5} L ${badgeX + 17.5} ${badgeY + 11}`}
                  stroke={C.crossoverText} strokeWidth="1.5"
                  strokeLinecap="round" strokeLinejoin="round" fill="none" />
                {/* Main label */}
                <text x={badgeX + badgeW / 2 + 6} y={badgeY + 17}
                  textAnchor="middle" fontSize="11.5"
                  fill={C.crossoverText} fontWeight="700"
                  fontFamily={terminalMode ? "ui-monospace, monospace" : "inherit"}
                  letterSpacing={terminalMode ? "0.04em" : "0.005em"}>
                  {lang === 'en' ? 'Eligible to file now' : lang === 'tw' ? '現在可遞件' : '现在可递件'}
                </text>
                {/* Small hint below — encourages action */}
                <text x={chartWidth / 2} y={badgeY + 38}
                  textAnchor="middle" fontSize="8.5"
                  fill="var(--gc-muted)"
                  fontWeight="600"
                  letterSpacing="0.14em">
                  {lang === 'en' ? 'PD HAS PASSED THE CUTOFF' : '你的优先日已过截止日'}
                </text>
              </g>
            );
          })()}

          {/* Hover vertical line (when hovering) — hidden when crossover popup open */}
          {hoveredMonthIndex !== null && !showCrossoverInfo && (
            <line x1={xScale(hoveredMonthIndex)} y1={pad.top}
              x2={xScale(hoveredMonthIndex)} y2={chartHeight - pad.bottom}
              stroke={C.hoverLine} strokeWidth="1" strokeDasharray="2,2" opacity="0.7" />
          )}
          {hoveredForecast !== null && !showCrossoverInfo && (
            <line x1={hoveredForecast.x} y1={pad.top}
              x2={hoveredForecast.x} y2={chartHeight - pad.bottom}
              stroke={C.nowLine} strokeWidth="1" strokeDasharray="2,2" opacity="0.7" />
          )}

          {/* RATE PHASE BACKGROUND BANDS - only for user's category when past range >= 24 months
              Identifies "fast" vs "slow" periods in user's category history by analyzing 
              month-to-month advancement from historicalData. Colored bands overlay the chart. */}
          {pastMonths >= 24 && (() => {
            const userKey = `${userCase.category}-${country}`;
            // Compute advancement rate between consecutive months (days/month)
            const rates = [];
            for (let i = 1; i < historicalData.length; i++) {
              const prev = historicalData[i-1].data[userKey];
              const curr = historicalData[i].data[userKey];
              if (prev === 'C' || curr === 'C' || !prev || !curr) {
                rates.push(null);
                continue;
              }
              const p = new Date(prev), c = new Date(curr);
              if (isNaN(p.getTime()) || isNaN(c.getTime())) { rates.push(null); continue; }
              const daysAdvanced = (c - p) / (24 * 60 * 60 * 1000);
              rates.push(daysAdvanced);
            }
            // Classify into phases: fast (>40 d/mo), normal (10-40), slow (<10)
            // Group consecutive similar rates into bands
            const classify = (r) => {
              if (r === null) return 'unknown';
              if (r >= 40) return 'fast';
              if (r >= 10) return 'normal';
              return 'slow';
            };
            // Smooth by averaging 3-month windows to avoid noise
            const smoothRates = rates.map((_, i) => {
              const window = [];
              for (let j = Math.max(0, i-1); j <= Math.min(rates.length-1, i+1); j++) {
                if (rates[j] !== null) window.push(rates[j]);
              }
              return window.length ? window.reduce((a,b)=>a+b,0) / window.length : null;
            });
            
            // Build bands: consecutive months with same classification
            const bands = [];
            let currentBand = null;
            smoothRates.forEach((r, i) => {
              const cls = classify(r);
              if (!currentBand || currentBand.type !== cls) {
                if (currentBand) bands.push(currentBand);
                currentBand = { type: cls, startSlot: i, endSlot: i+1, avgRate: r };
              } else {
                currentBand.endSlot = i+1;
                currentBand.avgRate = (currentBand.avgRate + r) / 2;
              }
            });
            if (currentBand) bands.push(currentBand);
            
            // Only show bands that are at least 6 months wide for clarity
            const visibleBands = bands.filter(b => (b.endSlot - b.startSlot) >= 6 && b.type !== 'unknown');
            
            const bandColors = {
              fast: '#10b9811f',   // green tint - fast
              normal: '#f59e0b1f', // amber tint - normal
              slow: '#ef44441f',   // red tint - slow
            };
            const strokeColors = {
              fast: '#10b98170',
              normal: '#f59e0b50', 
              slow: '#ef444470',
            };
            const bandLabels = lang === 'en' ? {
              fast: 'Fast', normal: 'Normal', slow: 'Slow'
            } : lang === 'tw' ? {
              fast: '推進快', normal: '正常', slow: '推進慢'
            } : {
              fast: '推进快', normal: '正常', slow: '推进慢'
            };
            
            return visibleBands.map((b, idx) => {
              const x0 = xScale(b.startSlot);
              const x1 = xScale(b.endSlot);
              const w = x1 - x0;
              if (w < 20) return null;
              const rateDisplay = b.avgRate !== null ? `${Math.round(b.avgRate)}${lang === 'en' ? 'd/mo' : '天/月'}` : '';
              return (
                <g key={`band-${idx}`}>
                  <rect x={x0} y={pad.top} width={w} height={chartHeight - pad.top - pad.bottom}
                    fill={bandColors[b.type]} stroke={strokeColors[b.type]} strokeWidth="0.5" strokeDasharray="3,3" />
                  {w > 60 && (
                    <text x={x0 + w/2} y={pad.top + 12} textAnchor="middle" fontSize="8.5" 
                      fill={b.type === 'fast' ? '#047857' : b.type === 'slow' ? '#b91c1c' : '#92400e'} 
                      fontWeight="600">
                      {bandLabels[b.type]} {rateDisplay && `· ${rateDisplay}`}
                    </text>
                  )}
                </g>
              );
            }).filter(b => b !== null);
          })()}
          
          {/* Historical trend lines + Forecast lines */}
          {(() => {
            // Pre-compute the user's crossover month (where user's projection meets their PD).
            // Used below to trim the forecast for ALL categories at this x-position:
            // everything to the right of it is irrelevant for this user.
            let sharedTrimMonth = null;
            try {
              const userCatEarly = userCase.category;
              const pdDateEarly = safeParseDate(userCase.priorityDate);
              if (pdDateEarly && pdDateEarly !== 'CURRENT') {
                const latestRawEarly = historicalData[historicalData.length - 1].data[`${userCatEarly}-${country}`];
                const latestDEarly = safeParseDate(latestRawEarly);
                if (latestDEarly && latestDEarly !== 'CURRENT') {
                  const userForecast = computeForecastForCategory(userCatEarly);
                  if (userForecast && !userForecast.isCurrent && userForecast.computeAdvanceAt) {
                    const targetMs = pdDateEarly.getTime() - latestDEarly.getTime();
                    if (targetMs > 0) {
                      const maxAdv = userForecast.computeAdvanceAt(forecastMonths);
                      if (maxAdv >= targetMs) {
                        let lo = 0, hi = forecastMonths;
                        for (let iter = 0; iter < 30; iter++) {
                          const mid = (lo + hi) / 2;
                          if (userForecast.computeAdvanceAt(mid) < targetMs) lo = mid;
                          else hi = mid;
                          if (hi - lo < 0.01) break;
                        }
                        sharedTrimMonth = (lo + hi) / 2;
                      }
                    }
                  }
                }
              }
            } catch (e) { /* noop */ }
            return displayCategories.map(cat => {
            const yScale = getYScale(cat);
            const isCurrentOnly = historicalData.every(m => m.data[`${cat}-${country}`] === 'C');

            // Skip drawing line for categories that are Current the whole time
            // (they'll still appear in tooltips and summary)
            if (isCurrentOnly) return null;

            const currentY = pad.top + CURRENT_Y_OFFSET;

            // Historical points - ensure ALL months are drawn at equal x-spacing
            const historyPoints = historicalData.map((month, i) => {
              const y = yScale(month.data[`${cat}-${country}`]);
              const raw = month.data[`${cat}-${country}`];
              if (y === null) return null;
              return { x: xScale(i), y, raw, isCurrent: raw === 'C', monthIdx: i };
            }).filter(p => p !== null);

            if (historyPoints.length === 0) return null;

            const historyPath = historyPoints.map(p => `${p.x},${p.y}`).join(' ');

            // Compute forecast
            const forecast = computeForecastForCategory(cat);
            const lastPoint = historyPoints[historyPoints.length - 1];
            
            // Highlight user's own category; fade others much more
            const isUserCat = cat === userCase.category;
            const lineOpacity = isUserCat ? 1.0 : 0.3;   // 其他淡化到30%
            const lineWidth = isUserCat ? 3.5 : 1.5;      // 用户线更粗
            const pointRadius = isUserCat ? 3 : 1.5;

            return (
              <g key={cat} style={{ opacity: lineOpacity }}>
                {/* Historical line - rendered as SEGMENTS so Current periods and
                    Current↔Backlog transitions can be visually distinguished from
                    normal backlog movement. Rules:
                    - Backlog→Backlog: SOLID (user) or short-dashed (others) — real progression, full visual weight
                    - Current→Current: GHOST line — super-thin, grayish, low opacity, barely visible
                    - Transition: GHOST line — same treatment, fades the jump
                */}
                {(() => {
                  const segs = [];
                  for (let i = 0; i < historyPoints.length - 1; i++) {
                    const a = historyPoints[i], b = historyPoints[i + 1];
                    const bothCurrent = a.isCurrent && b.isCurrent;
                    const isTransition = a.isCurrent !== b.isCurrent;
                    const isGhost = bothCurrent || isTransition;
                    if (isGhost) {
                      // Barely-visible ghost line for Current periods and transitions
                      segs.push(
                        <line key={i}
                          x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                          stroke="#cbd5e1"                        // slate-300 (gray, not category color)
                          strokeWidth={Math.max(0.6, lineWidth * 0.3)}  // much thinner
                          strokeLinecap="round"
                          strokeDasharray="1,3"                   // dotted, not dashed
                          opacity={0.35}                          // very faded
                        />
                      );
                    } else {
                      // Normal backlog-progression segment: full visual weight
                      segs.push(
                        <line key={i}
                          x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                          stroke={colors[cat]} strokeWidth={lineWidth}
                          strokeLinecap="round"
                          strokeDasharray={isUserCat ? undefined : '3,3'}
                        />
                      );
                    }
                  }
                  return segs;
                })()}

                {/* Historical data points - only show when data isn't too dense */}
                {historyPoints.length <= 30 && historyPoints.map((p, i) => (
                  <circle key={i}
                    cx={p.x} cy={p.y}
                    r={hoveredMonthIndex === i ? (isUserCat ? 5 : 4) : pointRadius}
                    fill={p.isCurrent ? 'white' : colors[cat]}
                    stroke={colors[cat]} strokeWidth={p.isCurrent ? 1.5 : 1.5}
                    style={{ transition: 'r 0.15s' }}
                  />
                ))}
                {/* For long ranges, show enlarged point only when hovered */}
                {historyPoints.length > 30 && hoveredMonthIndex !== null && historyPoints[hoveredMonthIndex] && (
                  <circle
                    cx={historyPoints[hoveredMonthIndex].x} cy={historyPoints[hoveredMonthIndex].y}
                    r={isUserCat ? 5 : 4}
                    fill={colors[cat]} stroke={terminalMode ? C.bg : "white"} strokeWidth="1.5"
                  />
                )}

                {/* Forecast line - CURVED/non-linear based on hybrid model.
                    For user's category specifically: trim at crossover point (beyond it
                    the projection is no longer relevant to THIS user) and add a filled
                    area underneath to give the user's line visual weight vs. references. */}
                {forecast && !forecast.isCurrent && (() => {
                  const latestRaw = historicalData[historicalData.length - 1].data[`${cat}-${country}`];
                  const latestD = safeParseDate(latestRaw);
                  if (!latestD || latestD === 'CURRENT') return null;
                  
                  const computeAdvanceAt = forecast.computeAdvanceAt;
                  if (!computeAdvanceAt) return null;

                  // Trim logic: for ALL categories, stop the forecast at the user's crossover X.
                  // Beyond that point, "how fast other categories would advance" is irrelevant to this user.
                  let trimAtMonth = sharedTrimMonth;
                  let crossoverPoint = null;
                  if (isUserCat && sharedTrimMonth !== null) {
                    // User cat's crossover point is where user's projection meets user's PD
                    const cxSlot = historyEndSlot + sharedTrimMonth;
                    crossoverPoint = {
                      x: xScale(cxSlot),
                      y: yScale(userCase.priorityDate),
                    };
                  }
                  
                  // Sample forecast curve every month (consistent density regardless of range)
                  // Use 0.5-month step to ensure line is smooth and crossover alignment is precise
                  const sampleStep = forecastMonths > 240 ? 2 : forecastMonths > 60 ? 1 : 0.5;
                  
                  const currentZoneThreshold = pad.top + 25;
                  const clamp = (y) => Math.max(pad.top + CURRENT_Y_OFFSET, Math.min(chartHeight - pad.bottom, y));
                  
                  // Build polyline points — stop at trimAtMonth if user's line and crossover exists
                  const points = [];
                  let hitCurrentZone = false;
                  const stopAt = trimAtMonth !== null ? trimAtMonth : forecastMonths;
                  
                  for (let m = 0; m <= stopAt; m += sampleStep) {
                    const monthSlot = historyEndSlot + m;
                    const x = xScale(monthSlot);
                    const advanceMs = computeAdvanceAt(m);
                    const projectedDate = new Date(latestD.getTime() + advanceMs);
                    const dateStr = projectedDate.toISOString().split('T')[0];
                    const rawY = yScale(dateStr);
                    if (rawY === null) continue;
                    const y = clamp(rawY);
                    
                    // If hit current zone, add turn point then cap horizontally
                    if (rawY < currentZoneThreshold && !hitCurrentZone) {
                      // Linearly find where line crossed the threshold
                      if (points.length > 0) {
                        const prev = points[points.length - 1];
                        const t = (prev.y - currentZoneThreshold) / (prev.y - y);
                        const turnX = prev.x + (x - prev.x) * t;
                        points.push({ x: turnX, y: currentZoneThreshold });
                      }
                      points.push({ x, y: currentZoneThreshold });
                      hitCurrentZone = true;
                    } else if (hitCurrentZone) {
                      // Stay at threshold
                      points.push({ x, y: currentZoneThreshold });
                    } else {
                      points.push({ x, y });
                    }
                  }
                  
                  // Ensure final point at endX. If the user has a crossover, ALL categories
                  // truncate at that X — info past that point is irrelevant (user already eligible).
                  if (points.length > 0) {
                    const lastSampled = points[points.length - 1];
                    let endX, endY;
                    if (crossoverPoint) {
                      // User's own cat: land exactly on PD y-level
                      endX = crossoverPoint.x;
                      endY = crossoverPoint.y;
                    } else if (sharedTrimMonth !== null) {
                      // Other cat + user has crossover: truncate at same X, keep this line's own y
                      endX = xScale(historyEndSlot + sharedTrimMonth);
                      endY = lastSampled.y;
                    } else {
                      // No crossover at all: full forecast range
                      endX = xScale(historyEndSlot + forecastMonths);
                      endY = lastSampled.y;
                    }
                    if (Math.abs(lastSampled.x - endX) > 1) {
                      points.push({ x: endX, y: endY });
                    }
                  }
                  
                  if (points.length === 0) return null;
                  const pathStr = points.map(p => `${p.x},${p.y}`).join(' ');
                  const endPoint = points[points.length - 1];
                  
                  // For user cat: build area fill polygon that covers history + forecast
                  // closed down to the chart baseline. This gives the user's line visual weight.
                  let areaPath = null;
                  if (isUserCat) {
                    const baselineY = chartHeight - pad.bottom;
                    // Combine history points + forecast points
                    const allPoints = [...historyPoints.map(p => ({ x: p.x, y: p.y })), ...points];
                    if (allPoints.length > 1) {
                      const first = allPoints[0];
                      const last = allPoints[allPoints.length - 1];
                      const coords = allPoints.map(p => `${p.x},${p.y}`).join(' ');
                      // Close polygon: go to baseline below last, then baseline below first, back to start
                      areaPath = `${coords} ${last.x},${baselineY} ${first.x},${baselineY}`;
                    }
                  }
                  
                  return (
                    <g>
                      {/* User cat only: soft area fill under the line — 等待的"体量感" */}
                      {isUserCat && areaPath && (
                        <polygon
                          points={areaPath}
                          fill={colors[cat]}
                          opacity="0.08"
                          style={{ pointerEvents: 'none' }}
                        />
                      )}
                      {/* Single expected forecast curve (non-linear) - much bolder for user cat */}
                      <polyline 
                        points={pathStr} 
                        fill="none" 
                        stroke={colors[cat]} 
                        strokeWidth={isUserCat ? 3 : 1.2} 
                        strokeDasharray={isUserCat ? '6,4' : '3,3'} 
                        opacity={isUserCat ? 1 : 0.85}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {/* End point — for user cat with crossover, give it a pulsing halo to emphasize the milestone.
                          Two outer rings breathe outward (scale + opacity) in an endless loop,
                          while the inner solid dot stays stable for precise reading. */}
                      {isUserCat && crossoverPoint ? (
                        <g style={{ pointerEvents: 'none' }}>
                          <style>{`
                            @keyframes gcPulseRing {
                              0%   { transform: scale(1);    opacity: 0.5; }
                              70%  { transform: scale(3.2);  opacity: 0; }
                              100% { transform: scale(3.2);  opacity: 0; }
                            }
                            .gc-crossover-pulse-outer,
                            .gc-crossover-pulse-middle {
                              animation: gcPulseRing 2000ms cubic-bezier(0.2, 0.6, 0.3, 1) infinite;
                              transform-origin: center;
                              transform-box: fill-box;
                            }
                            .gc-crossover-pulse-middle {
                              animation-delay: 700ms;
                              opacity: 0;
                            }
                            @media (prefers-reduced-motion: reduce) {
                              .gc-crossover-pulse-outer,
                              .gc-crossover-pulse-middle { animation: none; opacity: 0.15; transform: scale(2); }
                            }
                          `}</style>
                          {/* First ripple */}
                          <circle className="gc-crossover-pulse-outer"
                                  cx={endPoint.x} cy={endPoint.y}
                                  r="4" fill={C.crossover} />
                          {/* Second ripple — staggered for continuous breathing feel */}
                          <circle className="gc-crossover-pulse-middle"
                                  cx={endPoint.x} cy={endPoint.y}
                                  r="4" fill={C.crossover} />
                          {/* Inner solid dot — always stable, the actual milestone marker */}
                          <circle cx={endPoint.x} cy={endPoint.y}
                            r="4" fill={C.crossover} stroke={terminalMode ? C.bg : "white"} strokeWidth="1.5" />
                        </g>
                      ) : (
                        <circle cx={endPoint.x} cy={endPoint.y}
                          r={isUserCat ? 3.5 : 2.5} fill={colors[cat]} stroke={terminalMode ? C.bg : "white"} strokeWidth="1.5" />
                      )}
                    </g>
                  );
                })()}

                {/* For Current ('C') at end - extend horizontal line */}
                {forecast && forecast.isCurrent && (
                  <line x1={lastPoint.x} y1={lastPoint.y}
                    x2={forecastStartX + forecastWidth} y2={lastPoint.y}
                    stroke={colors[cat]} strokeWidth="2" strokeDasharray="4,2" opacity="0.6" />
                )}
              </g>
            );
            });
          })()}

          {/* "Current" zone indicator - shows which categories are Current */}
          {(() => {
            const currentCats = displayCategories.filter(cat =>
              historicalData[historicalData.length - 1].data[`${cat}-${country}`] === 'C'
            );
            if (currentCats.length === 0) return null;
            return (
              <g>
                <rect x={pad.left} y={pad.top}
                  width={chartWidth - pad.left - pad.right} height={16}
                  fill={terminalMode ? C.forecastZone : "#ecfdf5"} opacity="0.85" />
                <text x={pad.left + 6} y={pad.top + 11}
                  textAnchor="start" fontSize="8" fill={C.nowText} fontWeight="700"
                  fontFamily={terminalMode ? "ui-monospace, monospace" : "inherit"}
                  letterSpacing={terminalMode ? "0.06em" : "normal"}>
                  ✓ {currentCats.join(', ')} {lang === 'en' ? 'Current (no wait)' : '无排期'}
                </text>
              </g>
            );
          })()}

          {/* Invisible hover zones for each month (historical) - simplified, main handler on SVG */}
          {historicalData.map((month, i) => (
            <rect key={`hover-${i}`}
              x={xScale(i) - (historyWidth / historicalData.length) / 2}
              y={pad.top}
              width={historyWidth / historicalData.length}
              height={chartHeight - pad.top - pad.bottom}
              fill="transparent"
              style={{ cursor: 'pointer', pointerEvents: 'none' }}
            />
          ))}

          {/* Invisible hover zones for forecast (one per month, 8 months) - simplified */}
          {Array.from({ length: 8 }, (_, idx) => {
            const monthOffset = idx + 1;
            const fracEnd = monthOffset / 8;
            const fracStart = idx / 8;
            const xStart = forecastStartX + forecastWidth * fracStart;
            const xEnd = forecastStartX + forecastWidth * fracEnd;
            return (
              <rect key={`hover-fc-${idx}`}
                x={xStart}
                y={pad.top}
                width={xEnd - xStart}
                height={chartHeight - pad.top - pad.bottom}
                fill="transparent"
                style={{ cursor: 'pointer', pointerEvents: 'none' }}
              />
            );
          })}

          {/* UNIFIED X-axis labels - same format for history and forecast
              Step depends on total span to avoid overlap (~20 labels max on screen):
              - ≤24 months: every month
              - ≤48 months: every 2 months
              - ≤96 months: every 3 months (quarterly)
              - ≤144 months: every 6 months (semi-annual)
              - ≤240 months (20y): every 12 months (yearly)
              - ≤480 months (40y): every 24 months (every 2 years)
              - otherwise: every 60 months (every 5 years)
          */}
          {(() => {
            let stepMonths;
            if (TOTAL_MONTHS <= 24) stepMonths = 1;
            else if (TOTAL_MONTHS <= 48) stepMonths = 2;
            else if (TOTAL_MONTHS <= 96) stepMonths = 3;
            else if (TOTAL_MONTHS <= 144) stepMonths = 6;
            else if (TOTAL_MONTHS <= 240) stepMonths = 12;
            else if (TOTAL_MONTHS <= 480) stepMonths = 24;
            else stepMonths = 60;
            
            const labels = [];
            // Start from slot 0 (earliest historical month)
            // baseDate = first month in historicalData (dynamic based on pastMonths)
            const baseDate = historicalData[0].date;
            for (let slot = 0; slot < TOTAL_MONTHS; slot += stepMonths) {
              const x = xScale(slot);
              const d = new Date(baseDate.getFullYear(), baseDate.getMonth() + slot, 1);
              const year = d.getFullYear();
              const month = d.getMonth() + 1;
              // Different label format for different step sizes
              let label;
              if (stepMonths >= 12) {
                // Year-level - just show 4-digit year
                label = String(year);
              } else {
                // Month-level - show YY/M
                label = `${String(year).slice(-2)}/${month}`;
              }
              
              // Color: forecast zone = accent, historical = axis
              const isForecast = slot > historyEndSlot;
              const fill = isForecast ? C.nowText : C.axis;
              const isEven = slot % 2 === 0;
              // For year-level labels with wide step, no need to alternate (more space)
              const yOffset = stepMonths >= 12 ? 16 : (isEven ? 14 : 26);
              
              labels.push(
                <text key={`x-${slot}`} x={x} y={chartHeight - pad.bottom + yOffset}
                  textAnchor="middle" fontSize="8.5" fill={fill} fontWeight={isForecast ? "600" : "500"}
                  fontFamily={terminalMode ? "ui-monospace, monospace" : "inherit"}>
                  {label}
                </text>
              );
            }
            return labels;
          })()}

        </svg>

        {/* Dual-range slider: past (left) + forecast (right) */}
        <div className="mt-2 px-2 pb-1 space-y-2">
          {/* PAST range */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-semibold flex items-center gap-1" style={{ color: 'var(--gc-ink-soft)' }}>
                <History size={11} strokeWidth={2.2} className="flex-shrink-0" style={{ color: 'var(--gc-muted)' }} />
                {lang === 'en' ? 'Historical Range' : '历史范围'}
                {autoFitted && (
                  <span className="gc-eyebrow flex-shrink-0"
                        style={{ fontSize: '8px', color: 'var(--gc-muted)', letterSpacing: '0.1em', marginLeft: '4px' }}
                        title={lang === 'en' ? 'Auto-adjusted to frame your crossover' : '已自动调整以框住你的交叉点'}>
                    {lang === 'en' ? 'AUTO' : '自动'}
                  </span>
                )}
              </label>
              <span className="gc-mono" style={{
                fontSize: '10px',
                fontWeight: 700,
                color: 'var(--gc-ink)',
                padding: '2px 6px',
                background: 'var(--gc-paper-soft)',
                border: '1px solid var(--gc-rule)',
                borderRadius: '2px',
                letterSpacing: '0.02em',
              }}>
                {pastMonths < 12
                  ? (lang === 'en' ? `${pastMonths}mo` : `${pastMonths}个月`)
                  : pastMonths === 12
                  ? (lang === 'en' ? '1 year' : '1年')
                  : (lang === 'en'
                    ? `${Math.floor(pastMonths / 12)}y ${pastMonths % 12}mo`
                    : `${Math.floor(pastMonths / 12)}年${pastMonths % 12 > 0 ? pastMonths % 12 + '个月' : ''}`)}
              </span>
            </div>
            <input
              type="range"
              min="6"
              max="312"
              step="1"
              value={pastMonths}
              onChange={(e) => {
                setPastMonths(parseInt(e.target.value));
                setRangeUserAdjusted(true);
                setAutoFitted(false);
              }}
              className="gc-slider w-full h-1.5 appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, var(--gc-ink) 0%, var(--gc-ink) ${(pastMonths - 6) / (312 - 6) * 100}%, var(--gc-rule) ${(pastMonths - 6) / (312 - 6) * 100}%, var(--gc-rule) 100%)`,
                borderRadius: '2px',
              }}
            />
            <div className="flex justify-between mt-1 text-[9px]" style={{ color: 'var(--gc-muted)' }}>
              <span>6{lang === 'en' ? 'mo' : '个月'}</span>
              <button
                onClick={() => { setPastMonths(12); setRangeUserAdjusted(true); setAutoFitted(false); }}
                className="font-medium"
                style={{ color: 'var(--gc-muted)', transition: 'color 120ms' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--gc-ink)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--gc-muted)'; }}>
                1{lang === 'en' ? 'y' : '年'}
              </button>
              <button
                onClick={() => { setPastMonths(60); setRangeUserAdjusted(true); setAutoFitted(false); }}
                className="font-medium"
                style={{ color: 'var(--gc-muted)', transition: 'color 120ms' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--gc-ink)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--gc-muted)'; }}>
                5{lang === 'en' ? 'y' : '年'}
              </button>
              <button
                onClick={() => { setPastMonths(120); setRangeUserAdjusted(true); setAutoFitted(false); }}
                className="font-medium"
                style={{ color: 'var(--gc-muted)', transition: 'color 120ms' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--gc-ink)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--gc-muted)'; }}>
                10{lang === 'en' ? 'y' : '年'}
              </button>
              <button
                onClick={() => { setPastMonths(252); setRangeUserAdjusted(true); setAutoFitted(false); }}
                className="font-medium"
                style={{ color: 'var(--gc-muted)', transition: 'color 120ms' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--gc-ink)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--gc-muted)'; }}>
                21{lang === 'en' ? 'y' : '年'}
              </button>
              <span>26{lang === 'en' ? 'y' : '年'}</span>
            </div>
          </div>

          {/* FUTURE range */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] font-semibold flex items-center gap-1" style={{ color: 'var(--gc-ink-soft)' }}>
                <TrendingUp size={11} strokeWidth={2.2} className="flex-shrink-0" style={{ color: 'var(--gc-muted)' }} />
                {lang === 'en' ? 'Forecast Range' : '预测范围'}
                {autoFitted && (
                  <span className="gc-eyebrow flex-shrink-0"
                        style={{ fontSize: '8px', color: 'var(--gc-muted)', letterSpacing: '0.1em', marginLeft: '4px' }}
                        title={lang === 'en' ? 'Auto-extended to show your crossover' : '已自动延长以显示你的交叉点'}>
                    {lang === 'en' ? 'AUTO' : '自动'}
                  </span>
                )}
              </label>
              <span className="gc-mono" style={{
                fontSize: '10px',
                fontWeight: 700,
                color: 'var(--gc-ink)',
                padding: '2px 6px',
                background: 'var(--gc-paper-soft)',
                border: '1px solid var(--gc-rule)',
                borderRadius: '2px',
                letterSpacing: '0.02em',
              }}>
                {forecastMonths < 12
                  ? (lang === 'en' ? `${forecastMonths}mo` : `${forecastMonths}个月`)
                  : forecastMonths === 12
                  ? (lang === 'en' ? '1 year' : '1年')
                  : (lang === 'en'
                    ? `${Math.floor(forecastMonths / 12)}y ${forecastMonths % 12}mo`
                    : `${Math.floor(forecastMonths / 12)}年${forecastMonths % 12 > 0 ? forecastMonths % 12 + '个月' : ''}`)}
              </span>
            </div>
            <input
              type="range"
              min="6"
              max="600"
              step="1"
              value={forecastMonths}
              onChange={(e) => {
                setForecastMonths(parseInt(e.target.value));
                setRangeUserAdjusted(true);
                setAutoFitted(false);
              }}
              className="gc-slider w-full h-1.5 appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, var(--gc-ink) 0%, var(--gc-ink) ${(forecastMonths - 6) / (600 - 6) * 100}%, var(--gc-rule) ${(forecastMonths - 6) / (600 - 6) * 100}%, var(--gc-rule) 100%)`,
                borderRadius: '2px',
              }}
            />
            <div className="flex justify-between mt-1 text-[9px]" style={{ color: 'var(--gc-muted)' }}>
              <span>6{lang === 'en' ? 'mo' : '个月'}</span>
              <button
                onClick={() => { setForecastMonths(12); setRangeUserAdjusted(true); setAutoFitted(false); }}
                className="font-medium"
                style={{ color: 'var(--gc-muted)', transition: 'color 120ms' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--gc-ink)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--gc-muted)'; }}>
                1{lang === 'en' ? 'y' : '年'}
              </button>
              <button
                onClick={() => { setForecastMonths(60); setRangeUserAdjusted(true); setAutoFitted(false); }}
                className="font-medium"
                style={{ color: 'var(--gc-muted)', transition: 'color 120ms' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--gc-ink)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--gc-muted)'; }}>
                5{lang === 'en' ? 'y' : '年'}
              </button>
              <button
                onClick={() => { setForecastMonths(120); setRangeUserAdjusted(true); setAutoFitted(false); }}
                className="font-medium"
                style={{ color: 'var(--gc-muted)', transition: 'color 120ms' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--gc-ink)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--gc-muted)'; }}>
                10{lang === 'en' ? 'y' : '年'}
              </button>
              <button
                onClick={() => { setForecastMonths(240); setRangeUserAdjusted(true); setAutoFitted(false); }}
                className="font-medium"
                style={{ color: 'var(--gc-muted)', transition: 'color 120ms' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--gc-ink)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--gc-muted)'; }}>
                20{lang === 'en' ? 'y' : '年'}
              </button>
              <span>50{lang === 'en' ? 'y' : '年'}</span>
            </div>
          </div>

        </div>

        {/* Collapsible help section - moved BELOW chart for less clutter */}
        <div className="mt-2 mx-2">
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="w-full flex items-center justify-between transition-colors"
            style={{
              padding: '6px 10px',
              background: showHelp ? 'var(--gc-paper-soft)' : 'var(--gc-surface)',
              border: '1px solid var(--gc-rule)',
              borderRadius: '3px',
              color: 'var(--gc-ink-soft)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--gc-paper-soft)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = showHelp ? 'var(--gc-paper-soft)' : 'var(--gc-surface)'; }}>
            <span className="text-[11px] font-semibold flex items-center gap-1" style={{ color: 'var(--gc-ink-soft)' }}>
              <HelpCircle size={12} strokeWidth={2} className="flex-shrink-0" style={{ color: 'var(--gc-muted)' }} />
              {lang === 'en' ? 'How to read this chart & AI model' : '怎么看这个图 & AI模型'}
            </span>
            <span style={{ color: 'var(--gc-muted)', fontSize: '10px' }}>{showHelp ? '▲' : '▼'}</span>
          </button>
          {showHelp && (
            <div className="mt-1" style={{
              padding: '10px 12px',
              background: 'var(--gc-paper-soft)',
              border: '1px solid var(--gc-rule)',
              borderRadius: '3px',
            }}>
              <div className="space-y-1.5 text-[10px] leading-relaxed" style={{ color: 'var(--gc-ink-soft)' }}>
                <div className="flex items-start gap-1.5">
                  <span className="flex-shrink-0" style={{ color: "var(--gc-muted-soft)", fontSize: "9px", marginTop: "2px" }}>▸</span>
                  <span>{lang === 'en'
                    ? 'Each line = one category\'s cutoff over time. Line going UP = PD moving forward (good!).'
                    : lang === 'tw'
                    ? '每條線代表一個類別的cutoff隨時間變化。線向上走 = 排期前進（好事！）'
                    : '每条线代表一个类别的cutoff随时间变化。线向上走 = 排期前进（好事！）'}</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="flex-shrink-0" style={{ color: "var(--gc-muted-soft)", fontSize: "9px", marginTop: "2px" }}>▸</span>
                  <span>{lang === 'en'
                    ? 'Gray dashed line = YOUR PD. When a category line crosses above it, you can file!'
                    : lang === 'tw'
                    ? '灰色橫虛線 = 你的優先日。哪條類別線漲到這條虛線之上，你就能遞件了！'
                    : '灰色横虚线 = 你的优先日。哪条类别线涨到这条虚线之上，你就能递件了！'}</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="flex-shrink-0" style={{ color: "var(--gc-muted-soft)", fontSize: "9px", marginTop: "2px" }}>▸</span>
                  <span>{lang === 'en'
                    ? 'Green line = latest bulletin month ("now"). Light green area to the right = forecast zone (dashed lines).'
                    : lang === 'tw'
                    ? '綠色豎虛線 = 最新排期月份（"現在"）。右側淡綠色區 = 預測區域（虛線）。'
                    : '绿色竖虚线 = 最新排期月份（"现在"）。右侧淡绿色区 = 预测区域（虚线）。'}</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="flex-shrink-0" style={{ color: "var(--gc-muted-soft)", fontSize: "9px", marginTop: "2px" }}>▸</span>
                  <span>{lang === 'en'
                    ? 'Red line + tag below X-axis = forecasted date your PD might become current. Tap tag for details.'
                    : lang === 'tw'
                    ? '紅色豎虛線 + 膠囊 = 預計你的優先日可能到期的月份。點擊膠囊看詳情。'
                    : '红色竖虚线 + 胶囊 = 预计你的优先日可能到期的月份。点击胶囊看详情。'}</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="flex-shrink-0" style={{ color: "var(--gc-muted-soft)", fontSize: "9px", marginTop: "2px" }}>▸</span>
                  <span>{lang === 'en'
                    ? 'Two sliders above: extend history back (up to 26yr), extend forecast further (up to 50yr).'
                    : lang === 'tw'
                    ? '上方兩個滑塊：擴展歷史範圍（最多26年），擴展預測範圍（最多50年）。'
                    : '上方两个滑块：扩展历史范围（最多26年），扩展预测范围（最多50年）。'}</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="flex-shrink-0" style={{ color: "var(--gc-muted-soft)", fontSize: "9px", marginTop: "2px" }}>▸</span>
                  <span>{lang === 'en'
                    ? 'The Advanced settings below hold the forecast scenario (Optimistic / Expected / Pessimistic) - the dashed line redraws based on your choice.'
                    : lang === 'tw'
                    ? '下方「高級設置」裡可切換預測情景（樂觀/預期/悲觀）- 虛線會根據你的選擇重新繪製。'
                    : '下方「高级设置」里可切换预测情景（乐观/预期/悲观）- 虚线会根据你的选择重新绘制。'}</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="flex-shrink-0" style={{ color: "var(--gc-muted-soft)", fontSize: "9px", marginTop: "2px" }}>▸</span>
                  <span>{lang === 'en'
                    ? 'Tap any month on the chart for exact dates. Tap category chips below to filter.'
                    : lang === 'tw'
                    ? '點擊圖上任意月份看具體日期。點擊下方類別卡片可篩選。'
                    : '点击图上任意月份看具体日期。点击下方类别卡片可筛选。'}</span>
                </div>
              </div>
              
              {/* Calculation formula - helps technical users understand */}
              <div className="mt-2 pt-2 border-t border-blue-300">
                <div className="text-[10px] font-bold text-blue-900 mb-1 flex items-center gap-1">
                  {lang === 'en' ? 'Calculation formula' : lang === 'tw' ? '計算公式' : '计算公式'}
                </div>
                <div className="bg-white/60 rounded p-1.5 text-[9px] font-mono text-blue-900 leading-relaxed mb-1">
                  {lang === 'en' ? '// Time-horizon blended rate' : '// 时间段混合速率'}<br/>
                  {lang === 'en' ? 'if months ≤ 12:' : '若 月份 ≤ 12:'}<br/>
                  &nbsp;&nbsp;rate = 0.7 × recent12mo + 0.3 × recent5yr<br/>
                  {lang === 'en' ? 'elif months ≤ 36:' : '若 月份 ≤ 36:'}<br/>
                  &nbsp;&nbsp;rate = blend(recent, 10yrAvg)<br/>
                  {lang === 'en' ? 'elif months ≤ 120:' : '若 月份 ≤ 120:'}<br/>
                  &nbsp;&nbsp;rate = blend(10yrAvg, 21yrAvg)<br/>
                  {lang === 'en' ? 'else:' : '否则:'}<br/>
                  &nbsp;&nbsp;rate = 0.6 × 21yrAvg + 0.4 × 10yrAvg<br/>
                  <br/>
                  {lang === 'en' ? 'forecast =' : '预测值 ='}<br/>
                  &nbsp;&nbsp;latest + Σ(rate × scenarioMult)
                </div>
                <div className="text-[9px] text-blue-700 leading-snug">
                  {lang === 'en'
                    ? 'Scenario multiplier: Optimistic=1.5, Expected=1.0, Pessimistic=0.5. Near-term forecasts prioritize recent observed trends; long-term forecasts gradually anchor to 21yr historical averages for stability.'
                    : lang === 'tw'
                    ? '情景乘數：樂觀=1.5、預期=1.0、悲觀=0.5。近期預測優先近期觀察到的趨勢；長期預測逐漸錨定到21年歷史均值以保持穩定。'
                    : '情景乘数：乐观=1.5、预期=1.0、悲观=0.5。近期预测优先近期观察到的趋势；长期预测逐渐锚定到21年历史均值以保持稳定。'}
                </div>
                <div className="mt-1.5 pt-1.5 border-t border-blue-200 text-[9px] text-blue-600 italic leading-snug">
                  {lang === 'en'
                    ? 'Historical data: 6 real anchors (Jan 2000/2005/2010/2015/2020, May 2026) interpolated across 26 years.'
                    : lang === 'tw'
                    ? '歷史數據：6個真實錨點（2000/1、2005/1、2010/1、2015/1、2020/1、2026/5）插值覆蓋26年。'
                    : '历史数据：6个真实锚点（2000/1、2005/1、2010/1、2015/1、2020/1、2026/5）插值覆盖26年。'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Crossover info tooltip - shows when user taps the crossover label */}
        {showCrossoverInfo && (() => {
          const pdDateStr = userCase.priorityDate;
          if (!pdDateStr) return null;
          const pdDate = safeParseDate(pdDateStr);
          if (!pdDate || pdDate === 'CURRENT') return null;
          
          const userCat = userCase.category;
          const categoryKey = `${userCat}-${country}`;
          const latestData = historicalData[historicalData.length - 1].data[categoryKey];
          if (latestData === 'C') return null;
          const latestDate = safeParseDate(latestData);
          if (!latestDate || latestDate === 'CURRENT') return null;
          if (latestDate >= pdDate) return null;
          
          const forecast = computeForecastForCategory(userCat);
          if (!forecast || forecast.isCurrent) return null;
          
          // NEW: Use the SAME non-linear binary search as the red crossover line
          // This ensures the popup date matches the red pill date and responds to scenario changes
          const computeAdvanceAt = forecast.computeAdvanceAt;
          if (!computeAdvanceAt) return null;
          
          const targetAdvanceMs = pdDate.getTime() - latestDate.getTime();
          if (targetAdvanceMs <= 0) return null;
          
          // Check if reachable within forecast range
          const maxAdvance = computeAdvanceAt(forecastMonths);
          if (maxAdvance < targetAdvanceMs) return null;
          
          // Binary search for month where advance == target
          let lo = 0, hi = forecastMonths;
          for (let iter = 0; iter < 30; iter++) {
            const mid = (lo + hi) / 2;
            const advance = computeAdvanceAt(mid);
            if (advance < targetAdvanceMs) lo = mid;
            else hi = mid;
            if (hi - lo < 0.01) break;
          }
          const monthsToReach = (lo + hi) / 2;
          if (monthsToReach <= 0 || monthsToReach > forecastMonths) return null;
          
          // Calendar date: current bulletin month + monthsToReach months
          const bulletinMonth = bulletinAnchorDate(15);
          const crossoverCalDate = new Date(bulletinMonth);
          const wholeMonths = Math.floor(monthsToReach);
          const fractionalDays = (monthsToReach - wholeMonths) * 30;
          crossoverCalDate.setMonth(crossoverCalDate.getMonth() + wholeMonths);
          crossoverCalDate.setDate(crossoverCalDate.getDate() + Math.round(fractionalDays));
          const fullDate = crossoverCalDate.toLocaleDateString(lang === 'en' ? 'en-US' : 'zh-CN', { year: 'numeric', month: 'long' });

          // ===== Raw formula inputs for transparent display =====
          const gapDays = Math.round(targetAdvanceMs / (24 * 60 * 60 * 1000));
          // Recent observed rate: how fast the line has been moving over the last 12 months
          const recentRateDpm = forecast.recentDaysPerMonth != null
            ? Math.round(forecast.recentDaysPerMonth)
            : null;
          // Long-term 21y rate from RATES_DB
          const longRateDpy = getLongTermRate(userCat, country);
          const scenarioMultDisplay = { optimistic: 1.5, somewhatOptimistic: 1.25, expected: 1.0, somewhatPessimistic: 0.75, pessimistic: 0.5 }[scenario] || 1.0;
          // Effective rate = gap / monthsToReach — this is the de-facto blended rate the model used
          const effectiveRateDpm = monthsToReach > 0 ? Math.round(gapDays / monthsToReach) : null;
          
          return (
            <div className="absolute z-40 cursor-pointer gc-serif"
              style={{
                left: '50%',
                top: '20px',
                transform: 'translateX(-50%)',
                minWidth: '210px',
                maxWidth: '78%',
                background: 'var(--gc-surface)',
                border: '1px solid var(--gc-rule)',
                borderTop: '2px solid var(--gc-green)',   // theme accent as masthead rule
                borderRadius: 'var(--gc-radius)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
                padding: '10px 12px 9px 12px',
              }}
              onClick={(e) => { e.stopPropagation(); setShowCrossoverInfo(false); }}
              onTouchEnd={(e) => { e.stopPropagation(); e.preventDefault(); setShowCrossoverInfo(false); }}>
              {/* Close indicator — subtle */}
              <div className="absolute flex items-center justify-center pointer-events-none"
                style={{
                  top: '8px', right: '8px',
                  width: '20px', height: '20px',
                  color: 'var(--gc-muted)',
                  fontSize: '14px',
                  lineHeight: 1,
                }}>
                ×
              </div>

              {/* Eyebrow */}
              <div className="gc-eyebrow mb-1 pr-6" style={{ color: 'var(--gc-green)', fontSize: '9px' }}>
                {lang === 'en' ? 'Estimated Eligibility' : '预计可递件日期'}
              </div>

              {/* Headline date — serif display */}
              <div className="gc-serif mb-0.5" style={{
                fontSize: '18px',
                fontWeight: 700,
                color: 'var(--gc-ink)',
                lineHeight: 1.1,
                letterSpacing: '-0.01em',
              }}>
                {fullDate}
              </div>

              {/* Relative time — neutral muted */}
              <div className="gc-mono" style={{ fontSize: '10.5px', color: 'var(--gc-muted)', marginBottom: '7px' }}>
                {lang === 'en'
                  ? `≈ ${Math.ceil(monthsToReach)} mo`
                  : `≈ ${Math.ceil(monthsToReach)} 个月`}
                <span style={{ margin: '0 5px', color: 'var(--gc-rule)' }}>·</span>
                <span style={{ color: 'var(--gc-ink-soft)' }}>
                  {scenario === 'optimistic' && (lang === 'en' ? '↑↑ opt' : '↑↑ 乐观')}
                  {scenario === 'somewhatOptimistic' && (lang === 'en' ? '↑ above' : '↑ 偏乐观')}
                  {scenario === 'expected' && (lang === 'en' ? '→ expected' : '→ 预期')}
                  {scenario === 'somewhatPessimistic' && (lang === 'en' ? '↓ below' : '↓ 偏悲观')}
                  {scenario === 'pessimistic' && (lang === 'en' ? '↓↓ pess' : '↓↓ 悲观')}
                </span>
              </div>

              {/* ===== Live formula breakdown — real numbers, no filler ===== */}
              <div className="gc-mono" style={{
                fontSize: '10px',
                color: 'var(--gc-ink-soft)',
                lineHeight: 1.55,
                borderTop: '1px solid var(--gc-rule)',
                paddingTop: '6px',
              }}>
                <div className="gc-eyebrow mb-1" style={{ fontSize: '8.5px', color: 'var(--gc-muted)', letterSpacing: '0.16em' }}>
                  {lang === 'en' ? 'CALCULATION' : '计算'}
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span style={{ color: 'var(--gc-muted)' }}>{lang === 'en' ? 'Gap' : '缺口'}</span>
                  <span style={{ color: 'var(--gc-ink)' }}><b>{gapDays.toLocaleString()}</b> {lang === 'en' ? 'd' : '天'}</span>
                </div>
                {recentRateDpm != null && (
                  <div className="flex items-baseline justify-between gap-2">
                    <span style={{ color: 'var(--gc-muted)' }}>
                      {lang === 'en' ? 'Recent 12mo' : '近 12 月'}
                      <span style={{ color: 'var(--gc-muted-soft)', marginLeft: '4px', fontSize: '9px' }}>· 55%</span>
                    </span>
                    <span style={{ color: 'var(--gc-ink)' }}><b>{recentRateDpm}</b> {lang === 'en' ? 'd/mo' : '天/月'}</span>
                  </div>
                )}
                <div className="flex items-baseline justify-between gap-2">
                  <span style={{ color: 'var(--gc-muted)' }}>
                    {lang === 'en' ? '5y policy' : '5 年政策'}
                    <span style={{ color: 'var(--gc-muted-soft)', marginLeft: '4px', fontSize: '9px' }}>· 20%</span>
                  </span>
                  <span style={{ color: 'var(--gc-ink)' }}><b>{Math.round((RATES_DB[`${userCat}-${country}`]?.recent || longRateDpy) / 12)}</b> {lang === 'en' ? 'd/mo' : '天/月'}</span>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span style={{ color: 'var(--gc-muted)' }}>
                    {lang === 'en' ? '21y avg' : '21 年均值'}
                    <span style={{ color: 'var(--gc-muted-soft)', marginLeft: '4px', fontSize: '9px' }}>· 25%</span>
                  </span>
                  <span style={{ color: 'var(--gc-ink)' }}><b>{Math.round(longRateDpy / 12)}</b> {lang === 'en' ? 'd/mo' : '天/月'}</span>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span style={{ color: 'var(--gc-muted)' }}>{lang === 'en' ? 'Scenario' : '情景'}</span>
                  <span style={{ color: 'var(--gc-ink)' }}><b>×{scenarioMultDisplay}</b></span>
                </div>
                {effectiveRateDpm != null && (
                  <div className="flex items-baseline justify-between gap-2" style={{ marginTop: '3px', paddingTop: '3px', borderTop: '1px dashed var(--gc-rule-soft)' }}>
                    <span style={{ color: 'var(--gc-muted)' }}>{lang === 'en' ? 'Blended' : '混合速率'}</span>
                    <span style={{ color: 'var(--gc-green)', fontWeight: 700 }}>{effectiveRateDpm} {lang === 'en' ? 'd/mo' : '天/月'}</span>
                  </div>
                )}
                {/* Final formula on its own row, accented */}
                <div style={{
                  marginTop: '6px',
                  paddingTop: '6px',
                  borderTop: '1px solid var(--gc-rule)',
                  fontSize: '10.5px',
                  color: 'var(--gc-ink)',
                  letterSpacing: '0.01em',
                  textAlign: 'right',
                }}>
                  {gapDays.toLocaleString()} ÷ {effectiveRateDpm} = <b style={{ color: 'var(--gc-green)' }}>{Math.ceil(monthsToReach)}</b> {lang === 'en' ? 'mo' : '月'}
                </div>
              </div>

              {/* ===== I-485 approval forecast — second milestone ===== */}
              {(() => {
                // Re-derive the SAME approval range that the chart pill used above
                // (duplicate logic is intentional — this IIFE is isolated from the outer
                //  scope's locals, and replicating is simpler than refactoring). If the
                //  Overview formula changes, update BOTH places + the chart-pill block.
                const speedMult = { fast: 0.75, average: 1.0, slow: 1.35 }[i485ServiceCenter] || 1.0;
                const stepsDone = completedI485Steps.length;
                const I485_STEP_IDS = ['receipt', 'biometrics', 'ead', 'ap', 'interview', 'approval'];
                const STEP_ESTIMATED_DAYS = { receipt: 14, biometrics: 60, ead: 120, ap: 150, interview: 365, approval: 330 };
                const APPROVAL_EST_MIN = 180;
                const APPROVAL_EST_MAX = 450;

                let baseline = null;
                for (let i = I485_STEP_IDS.length - 1; i >= 0; i--) {
                  const id = I485_STEP_IDS[i];
                  if (completedI485Steps.includes(id) && stepActualDates[id]) {
                    baseline = new Date(new Date(stepActualDates[id]).getTime() - STEP_ESTIMATED_DAYS[id] * 86400000);
                    break;
                  }
                }
                if (!baseline) baseline = new Date();
                let earliest = new Date(baseline.getTime() + Math.round(APPROVAL_EST_MIN * speedMult) * 86400000);
                let latest   = new Date(baseline.getTime() + Math.round(APPROVAL_EST_MAX * speedMult) * 86400000);

                const pbMin = [180, 150, 120, 80, 50, 20][stepsDone] || 180;
                const pbMax = [330, 280, 220, 160, 100, 60][stepsDone] || 330;
                const pAMin = new Date(crossoverCalDate.getTime() + Math.round(pbMin * speedMult) * 86400000);
                const pAMax = new Date(crossoverCalDate.getTime() + Math.round(pbMax * speedMult) * 86400000);
                if (pAMin.getTime() > earliest.getTime()) earliest = pAMin;
                if (pAMax.getTime() > latest.getTime())   latest = pAMax;

                if (stepActualDates.approval) {
                  const actual = new Date(stepActualDates.approval);
                  earliest = actual;
                  latest = actual;
                }

                // Format each end as "YY年M月" (match Overview's format)
                const fmt = (d) => {
                  if (lang === 'en') return d.toLocaleDateString('en-US', { year: '2-digit', month: 'short' });
                  return `${String(d.getFullYear()).slice(2)}年${d.getMonth()+1}月`;
                };
                const sameMonth = earliest.getFullYear() === latest.getFullYear() && earliest.getMonth() === latest.getMonth();
                const rangeLabel = sameMonth ? fmt(earliest) : `${fmt(earliest)} – ${fmt(latest)}`;

                // Roughly how wide is the window, in months
                const spanMonths = Math.max(1, Math.round((latest.getTime() - earliest.getTime()) / (1000 * 60 * 60 * 24 * 30.44)));

                const progressDesc = [
                  lang === 'en' ? 'not yet filed' : '还没递件',
                  lang === 'en' ? 'receipt done' : '已收到 I-797',
                  lang === 'en' ? 'biometrics done' : '已做指纹',
                  lang === 'en' ? 'EAD approved' : '工卡已批',
                  lang === 'en' ? 'AP approved' : '旅行证已批',
                  lang === 'en' ? 'interview done — nearly there' : '面试已做 · 即将获批',
                ][stepsDone] || (lang === 'en' ? 'not yet filed' : '还没递件');
                const scLabel = i485ServiceCenter === 'fast'
                  ? (lang === 'en' ? 'fast (0.75×)' : '快 (0.75×)')
                  : i485ServiceCenter === 'slow'
                  ? (lang === 'en' ? 'slow (1.35×)' : '慢 (1.35×)')
                  : (lang === 'en' ? 'average (1.0×)' : '平均 (1.0×)');
                const isApproved = completedI485Steps.includes('approval');
                return (
                  <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--gc-rule)' }}>
                    <div className="gc-eyebrow" style={{ fontSize: '9px', color: 'var(--gc-green)', marginBottom: '3px' }}>
                      {lang === 'en' ? 'Then · GC Approval' : '然后 · 拿到绿卡'}
                    </div>
                    <div className="gc-serif" style={{
                      fontSize: '18px',
                      fontWeight: 700,
                      color: isApproved ? 'var(--gc-green)' : 'var(--gc-ink)',
                      lineHeight: 1.1,
                      letterSpacing: '-0.01em',
                      marginBottom: '4px',
                    }}>
                      {isApproved
                        ? (lang === 'en' ? '✓ Already approved' : '✓ 已获批')
                        : rangeLabel}
                    </div>
                    {!isApproved && (
                      <>
                        <div className="gc-mono" style={{ fontSize: '10.5px', color: 'var(--gc-muted)' }}>
                          {sameMonth
                            ? scLabel
                            : <><span>~{spanMonths} {lang === 'en' ? 'mo window' : '个月区间'}</span>
                                <span style={{ margin: '0 5px', color: 'var(--gc-rule)' }}>·</span>
                                <span style={{ color: 'var(--gc-ink-soft)' }}>{scLabel}</span></>}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--gc-muted)', marginTop: '3px' }}>
                          <span style={{ color: 'var(--gc-ink-soft)', fontWeight: 600 }}>{lang === 'en' ? 'Your progress: ' : '你的进度: '}</span>
                          {progressDesc}
                        </div>
                        <div style={{ fontSize: '9.5px', color: 'var(--gc-muted)', marginTop: '4px', lineHeight: 1.45, fontStyle: 'italic' }}>
                          {lang === 'en'
                            ? 'Matches the range shown on the Overview I-485 card (approval step).'
                            : lang === 'tw'
                            ? '與「總結」頁 I-485 卡最終批准區間一致。'
                            : '与「总结」页 I-485 卡最终批准区间一致。'}
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}
            </div>
          );
        })()}

        {/* Tooltip for historical data - shows ALL categories at that month.
            Suppressed when crossover detail popup is open (only one popup at a time). */}
        {hoveredMonthIndex !== null && !showCrossoverInfo && (() => {
          const month = historicalData[hoveredMonthIndex];
          // Defensive: historicalData may have fewer entries after pastMonths slider change
          // If hovered index is now out of bounds, just skip rendering
          if (!month || !month.month) return null;
          const xPos = (xScale(hoveredMonthIndex) / chartWidth) * 100;
          const isRightSide = xPos > 50;
          return (
            <div className="absolute bg-white border border-slate-200 rounded-lg shadow-xl p-2.5 z-30 cursor-pointer"
              style={{
                left: isRightSide ? 'auto' : `${xPos}%`,
                right: isRightSide ? `${100 - xPos}%` : 'auto',
                top: '40px',
                marginLeft: isRightSide ? 0 : '8px',
                marginRight: isRightSide ? '8px' : 0,
                minWidth: '140px'
              }}
              onClick={(e) => {
                e.stopPropagation();
                setHoveredMonthIndex(null);
              }}
              onTouchEnd={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setHoveredMonthIndex(null);
              }}>
              {/* Close button visible indicator */}
              <div className="absolute top-1 right-1 w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 z-10 pointer-events-none"
                style={{ fontSize: '12px' }}>
                ✕
              </div>
              <div className="text-[11px] font-bold text-slate-900 mb-1 pb-1 border-b border-slate-100 pr-5">
                {month.month}
              </div>
              <div className="space-y-0.5">
                {displayCategories.map(cat => {
                  const raw = month.data[`${cat}-${country}`];
                  const d = safeParseDate(raw);
                  const dateText = raw === 'C' ? (lang === 'en' ? 'Current ✓' : '无排期 ✓') :
                                  (d && d !== 'CURRENT') ? d.toLocaleDateString(lang === 'en' ? 'en-US' : 'zh-CN', { year: 'numeric', month: 'short' }) : 'N/A';
                  return (
                    <div key={cat} className="text-[10px] flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: colors[cat] }}></div>
                      <span className="font-semibold" style={{ color: colors[cat] }}>{cat}:</span>
                      <span className="text-slate-700">{dateText}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Tooltip for forecast hover.
            Suppressed when crossover detail popup is open. */}
        {hoveredForecast !== null && !showCrossoverInfo && (() => {
          // Forecast months extend from whichever bulletin month is currently loaded.
          const bulletinMonth = bulletinAnchorDate(1);
          const future = new Date(bulletinMonth.getFullYear(), bulletinMonth.getMonth() + hoveredForecast.monthOffset, 1);
          const futureLabel = lang === 'en' 
            ? future.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })
            : `${future.getFullYear()}年${future.getMonth() + 1}月`;
          const xPos = (hoveredForecast.x / chartWidth) * 100;
          const isRightSide = xPos > 50;
          return (
            <div className="absolute cursor-pointer z-30"
              style={{
                left: isRightSide ? 'auto' : `${xPos}%`,
                right: isRightSide ? `${100 - xPos}%` : 'auto',
                top: '40px',
                marginLeft: isRightSide ? 0 : '8px',
                marginRight: isRightSide ? '8px' : 0,
                minWidth: '180px',
                background: 'var(--gc-surface)',
                border: '1px solid var(--gc-rule)',
                borderRadius: '3px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                padding: '10px',
              }}
              onClick={(e) => {
                e.stopPropagation();
                setHoveredForecast(null);
              }}
              onTouchEnd={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setHoveredForecast(null);
              }}>
              {/* Close button visible indicator */}
              <div className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center pointer-events-none"
                style={{ fontSize: '11px', color: 'var(--gc-muted)' }}>
                ✕
              </div>
              {/* Title: show actual calendar month + "forecast" label */}
              <div className="text-[11px] font-bold mb-0.5 pr-5 flex items-center gap-1" style={{ color: 'var(--gc-ink)' }}>
                <Activity size={10} style={{ color: 'var(--gc-muted)' }} />
                {futureLabel}
              </div>
              <div className="text-[9px] mb-1.5 pb-1" style={{ color: 'var(--gc-muted)', borderBottom: '1px solid var(--gc-rule-soft)' }}>
                {lang === 'en'
                  ? `Forecast (+${hoveredForecast.monthOffset}mo from now)`
                  : `预测中 (距现在+${hoveredForecast.monthOffset}个月)`}
              </div>
              <div className="space-y-0.5">
                {displayCategories.map(cat => {
                  const forecast = computeForecastForCategory(cat);
                  if (!forecast) return null;

                  if (forecast.isCurrent) {
                    return (
                      <div key={cat} className="text-[10px] flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: colors[cat] }}></div>
                        <span className="font-semibold" style={{ color: colors[cat] }}>{cat}:</span>
                        <span className="text-slate-700">{lang === 'en' ? 'Current ✓' : '无排期 ✓'}</span>
                      </div>
                    );
                  }

                  // Use the non-linear forecast curve for accurate date at this month
                  const latestRaw = historicalData[historicalData.length - 1].data[`${cat}-${country}`];
                  const latestD = safeParseDate(latestRaw);
                  if (!latestD || latestD === 'CURRENT') return null;

                  const advanceMs = forecast.computeAdvanceAt 
                    ? forecast.computeAdvanceAt(hoveredForecast.monthOffset)
                    : (forecast.expected - latestD.getTime()) * (hoveredForecast.monthOffset / forecastMonths);
                  const expectedDate = new Date(latestD.getTime() + advanceMs);
                  const fmt = (d) => d.toLocaleDateString(lang === 'en' ? 'en-US' : 'zh-CN', { year: '2-digit', month: 'short' });

                  return (
                    <div key={cat} className="text-[10px] flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: colors[cat] }}></div>
                      <span className="font-semibold" style={{ color: colors[cat] }}>{cat}:</span>
                      <span className="text-slate-700 font-medium">{fmt(expectedDate)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-1.5 pt-1.5 text-[8px] italic" style={{ color: 'var(--gc-muted)', borderTop: '1px solid var(--gc-rule-soft)' }}>
                {lang === 'en'
                  ? '* Based on avg monthly progress over past 12 months'
                  : '* 基于过去12个月的平均推进速度估算'}
              </div>
            </div>
          );
        })()}
      </div>
      )}

      {/* UI-22 freeze: the five-tier scenario dial is now an advanced
          setting — collapsed by default behind this toggle and labelled as
          such. The dial block below is byte-identical to before (freeze is
          not deletion); the default scenario stays 'expected', so the main
          view and its numbers are untouched until a user opens this. */}
      <button type="button" onClick={() => setShowScenario((v) => !v)}
        style={{ width: '100%', marginTop: '8px', padding: '9px 12px', background: 'var(--gc-surface)', border: '1px solid var(--gc-rule)', borderRadius: 'var(--gc-radius-sm)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gc-ink-soft)' }}>
          {lang === 'en' ? 'Advanced · forecast scenarios (5-tier)' : lang === 'tw' ? '高級設置 · 預測情景（五檔倍率）' : '高级设置 · 预测情景（五档倍率）'}
        </span>
        <span style={{ fontSize: '10px', color: 'var(--gc-muted)' }}>{showScenario ? '▲' : '▼'}</span>
      </button>
      {showScenario && (<>
      {/* Forecast Scenario Selector — editorial dial.
          Reads as a spectrum from optimistic to pessimistic. Selection marked by
          a solid underline beneath the active cell (like newspaper section tabs)
          plus typographic emphasis. No color fills, no box highlight. */}
      <div className="mt-2" style={{
        padding: '10px 12px 8px',
        background: 'var(--gc-surface)',
        border: '1px solid var(--gc-rule)',
        borderRadius: 'var(--gc-radius-sm)',
      }}>
        <div className="flex items-baseline justify-between mb-2">
          <div className="gc-eyebrow" style={{ fontSize: '9px', color: 'var(--gc-muted)', letterSpacing: '0.14em' }}>
            {lang === 'en'
              ? 'FORECAST · SCENARIO'
              : lang === 'tw'
              ? '預測 · 情景'
              : '预测 · 情景'}
          </div>
          <span style={{ fontSize: '9px', color: 'var(--gc-muted-soft)' }}>
            {lang === 'en' ? 'tap to switch' : lang === 'tw' ? '點擊切換' : '点击切换'}
          </span>
        </div>
        {/* Rail container — 5 cells, each with its own tick & label; active cell gets an underline accent */}
        <div style={{ position: 'relative' }}>
          {/* Thin horizontal rule running through all cells — the "spectrum" */}
          <div style={{
            position: 'absolute',
            left: '2%', right: '2%',
            top: 'calc(50% - 0.5px)',
            height: '1px',
            background: 'var(--gc-rule-soft)',
            pointerEvents: 'none',
          }} />
          <div className="grid grid-cols-5" style={{ position: 'relative' }}>
            {[
              { id: 'optimistic',          arrow: '↑↑', labelEn: 'Opt',   labelZh: '乐观',   labelTw: '樂觀',   mult: '1.5'  },
              { id: 'somewhatOptimistic',  arrow: '↑',  labelEn: 'Above', labelZh: '偏乐观', labelTw: '偏樂觀', mult: '1.25' },
              { id: 'expected',            arrow: '→',  labelEn: 'Avg',   labelZh: '预期',   labelTw: '預期',   mult: '1.0'  },
              { id: 'somewhatPessimistic', arrow: '↓',  labelEn: 'Below', labelZh: '偏悲观', labelTw: '偏悲觀', mult: '0.75' },
              { id: 'pessimistic',         arrow: '↓↓', labelEn: 'Pes',   labelZh: '悲观',   labelTw: '悲觀',   mult: '0.5'  },
            ].map(s => {
              const active = scenario === s.id;
              const label = lang === 'en' ? s.labelEn : lang === 'tw' ? s.labelTw : s.labelZh;
              return (
                <button key={s.id}
                  onClick={() => setScenario(s.id)}
                  style={{
                    padding: '4px 2px 6px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '2px',
                    position: 'relative',
                    transition: 'all 120ms',
                  }}>
                  {/* Arrow + label — top row */}
                  <div style={{
                    fontSize: '10.5px',
                    fontWeight: active ? 700 : 500,
                    color: active ? 'var(--gc-ink)' : 'var(--gc-muted)',
                    letterSpacing: '0.01em',
                    lineHeight: 1.15,
                    transition: 'all 120ms',
                  }}>
                    <span style={{ marginRight: '2px' }}>{s.arrow}</span>{label}
                  </div>
                  {/* Multiplier — bottom row, smaller + monospace for tabular alignment */}
                  <div className="gc-mono" style={{
                    fontSize: '8.5px',
                    fontWeight: active ? 600 : 400,
                    color: active ? 'var(--gc-ink-soft)' : 'var(--gc-muted-soft)',
                    letterSpacing: '0.02em',
                    lineHeight: 1,
                    transition: 'all 120ms',
                  }}>
                    ×{s.mult}
                  </div>
                  {/* Active underline — 2px ink bar, full width of the cell */}
                  {active && (
                    <div style={{
                      position: 'absolute',
                      bottom: '-1px',
                      left: '10%', right: '10%',
                      height: '2px',
                      background: 'var(--gc-ink)',
                      borderRadius: '1px',
                    }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
        <div className="mt-2 flex items-start gap-2" style={{ padding: '6px 8px', background: 'var(--gc-paper-soft)', border: '1px solid var(--gc-rule-soft)', borderRadius: 'var(--gc-radius-sm)' }}>
          <Activity size={11} strokeWidth={2.2} className="flex-shrink-0" style={{ color: 'var(--gc-muted)', marginTop: '2px' }} />
          <div className="flex-1 min-w-0">
            <span className="gc-eyebrow" style={{ fontSize: '8px', marginRight: '6px' }}>
              {lang === 'en' ? 'MODEL' : lang === 'tw' ? '模型' : '模型'}
            </span>
            <span style={{ fontSize: '10px', color: 'var(--gc-ink-soft)', lineHeight: 1.5 }}>
          {scenario === 'optimistic' && (lang === 'en'
            ? 'Fast-track: current pace + strong policy / visa pool recovery boost.'
            : lang === 'tw'
            ? '快速推進：當前速度 + 政策/簽證池恢復強力加速。'
            : '快速推进：当前速度 + 政策/签证池恢复强力加速。')}
          {scenario === 'somewhatOptimistic' && (lang === 'en'
            ? 'Above average: mild tailwinds, slightly better than baseline.'
            : lang === 'tw'
            ? '偏樂觀：略有利環境,比基線稍快。'
            : '偏乐观：略有利环境，比基线稍快。')}
          {scenario === 'expected' && (lang === 'en'
            ? 'Recent 12mo trend + 21yr long-term average (baseline).'
            : lang === 'tw'
            ? '近12個月趨勢 + 21年長期均值（基線）。'
            : '近12个月趋势 + 21年长期均值（基线）。')}
          {scenario === 'somewhatPessimistic' && (lang === 'en'
            ? 'Below average: mild headwinds, demand uptick or slight drag.'
            : lang === 'tw'
            ? '偏悲觀：略有阻力,需求略增或輕微拖累。'
            : '偏悲观：略有阻力，需求略增或轻微拖累。')}
          {scenario === 'pessimistic' && (lang === 'en'
            ? 'Slow: demand surge, minor retrogression, or visa pool shortage.'
            : lang === 'tw'
            ? '緩慢：需求激增、輕度倒退或簽證池短缺。'
            : '缓慢：需求激增、轻度倒退或签证池短缺。')}
            </span>
          </div>
        </div>
      </div>
      </>)}

      {/* Chart Summary - compact cards (4 columns fits all F or EB categories on one row) */}
      <div className="mt-2 grid grid-cols-4 gap-1" style={{ width: '100%' }}>
        {displayCategories.slice(0, 6).map(cat => {
          const latestData = historicalData[historicalData.length - 1].data[`${cat}-${country}`];
          const previousData = historicalData[historicalData.length - 2].data[`${cat}-${country}`];

          if (!latestData) return null;

          const latestDate = safeParseDate(latestData);
          const prevDate = safeParseDate(previousData);

          let movementDays = 0;
          let isAdvanced = false;
          if (latestDate && prevDate && latestDate !== 'CURRENT' && prevDate !== 'CURRENT' && latestData !== 'C' && previousData !== 'C') {
            movementDays = Math.round((latestDate - prevDate) / (1000 * 60 * 60 * 24));
            isAdvanced = movementDays > 0;
          }

          const displayDate = latestData === 'C' ? (lang === 'en' ? 'Current' : '无排期') :
                              (latestDate && latestDate !== 'CURRENT') ?
                              latestDate.toLocaleDateString(lang === 'en' ? 'en-US' : 'zh-CN', { year: '2-digit', month: 'short' }) :
                              'N/A';

          return (
            <div key={cat} className="px-1.5 py-1 bg-slate-50 rounded-md" style={{ minWidth: 0 }}>
              <div className="flex items-center gap-1 mb-0">
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: colors[cat] }}></div>
                <span className="text-[10px] font-bold text-slate-700 truncate">{cat}</span>
                {Math.abs(movementDays) > 0 && (
                  <span className={`text-[9px] font-medium flex-shrink-0 ml-auto ${isAdvanced ? 'text-emerald-600' : 'text-red-600'}`}>
                    {isAdvanced ? '+' : ''}{movementDays}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-slate-600 truncate">
                {displayDate}
              </div>
            </div>
          );
        })}
      </div>
      </>)}
    </div>
  );
};


// ============================================================
// ForecastHub — wraps TrendChart + Forecast as sub-tabs
// ============================================================
const ForecastHub = ({ userCase, i485ServiceCenter = 'average', completedI485Steps = [], stepActualDates = {} }) => {
  const { t, lang } = useLang();
  const [view, setView] = useState('next'); // 'chart' | 'next'（chart 暂下架）

  const subTabs = [
    // 「长期走势」暂时下架：它与总结卡/下月预测的口径不一致（hybrid 模型 vs 直线外推），
    // 统一口径前先只保留下月预测。TrendChart 组件代码保留，恢复时把这段解开即可。
    // {
    //   id: 'chart',
    //   icon: BarChart3,
    //   en: { label: 'Long-term chart', desc: 'Historical movement + forecast to eligibility' },
    //   zh: { label: '长期走势', desc: '历史排期 + 预测到符合条件的时间' },
    //   tw: { label: '長期走勢', desc: '歷史排期 + 預測到符合條件的時間' },
    // },
    {
      id: 'next',
      icon: Sparkles,
      en: { label: 'Next month', desc: 'AI estimate for next month\'s bulletin' },
      zh: { label: '下月预测', desc: 'AI 预估下月公告的移动' },
      tw: { label: '下月預測', desc: 'AI 預估下月公告的移動' },
    },
  ];

  const active = subTabs.find(s => s.id === view);
  const activeI18n = active[lang] || active.en;

  return (
    <div>
      {/* Header */}
      <div style={{ padding: '14px 12px 10px', borderBottom: '1px solid var(--gc-rule)' }}>
        <div className="gc-eyebrow" style={{ color: 'var(--gc-green)' }}>
          {lang === 'en' ? 'FORECAST' : lang === 'tw' ? '預測' : '预测'}
        </div>
        <h2 className="gc-serif" style={{
          fontSize: '20px', fontWeight: 700, color: 'var(--gc-ink)',
          margin: '2px 0 4px', letterSpacing: '-0.01em'
        }}>
          {lang === 'en' ? 'When will your date be current?' : lang === 'tw' ? '排期什麼時候到?' : '排期什么时候到?'}
        </h2>
        <p style={{ fontSize: '12px', color: 'var(--gc-muted)', margin: 0, lineHeight: 1.4 }}>
          {activeI18n.desc}
        </p>
      </div>

      {/* Sub-tab toggle — hidden entirely while only one view is available */}
      <div style={{ padding: '0 12px', display: subTabs.length > 1 ? 'block' : 'none' }}>
        <div style={{
          display: 'flex', gap: 0, margin: '12px 0',
          border: '1px solid var(--gc-rule)', borderRadius: '3px', overflow: 'hidden'
        }}>
          {subTabs.map((s, i) => {
            const isActive = view === s.id;
            const Icon = s.icon;
            const i18n = s[lang] || s.en;
            return (
              <button key={s.id}
                onClick={() => setView(s.id)}
                style={{
                  flex: 1, padding: '10px 12px', fontSize: '12px', fontWeight: 600,
                  background: isActive ? 'var(--gc-green)' : 'var(--gc-surface)',
                  color: isActive ? 'var(--gc-paper)' : 'var(--gc-muted)',
                  borderLeft: i > 0 ? '1px solid var(--gc-rule)' : 'none',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  gap: '6px', transition: 'all 120ms', cursor: 'pointer',
                }}>
                <Icon size={12} strokeWidth={2} />
                <span>{i18n.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* UI-22: uncertainty first. The amber methodology box (the site's
          reference pattern, formerly at the bottom of the next-month view)
          now opens the hub's content — same copy via t.forecastMethodology*,
          moved not rewritten — ahead of every probability figure in
          whichever sub-view is active. */}
      <div style={{ padding: '12px 12px 0' }}>
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-start gap-2">
            <Info size={13} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-[11px] font-bold text-amber-900 mb-1">{t.forecastMethodology}</div>
              <p className="text-[11px] text-amber-800 leading-relaxed">{t.forecastMethodologyDesc}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {view === 'chart' && <TrendChart userCase={userCase} i485ServiceCenter={i485ServiceCenter} completedI485Steps={completedI485Steps} stepActualDates={stepActualDates} />}
      {view === 'next'  && <Forecast userCase={userCase} />}
    </div>
  );
};


export default ForecastHub;
