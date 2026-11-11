// UI-23 code split: SmartAlerts, lazy chunk for the alerts tab.
// Extracted verbatim from App.jsx; shared helpers stay in App.jsx (imported
// below) or in functions/api/_gcMath.js. Loaded lazily by App.jsx per tab.
import React, { useState, useEffect, useRef } from 'react';
import { Calendar, TrendingDown, AlertCircle, CheckCircle2, FileText, Shield, Target, Bell, Mail } from 'lucide-react';
import { API_BASE, trackEv, useLang, formatDate, CATEGORY_SUBTYPES, CompactCaseBar, announceSubscribed, caseNeedsIntake, openSubscribeModal } from './App.jsx';
// ============================================================
// Smart Alerts Component
// ============================================================
const SmartAlerts = ({ userCase, setUserCase = () => {}, setTab = () => {}, greenCardInfo = { approvalDate: null, isConditional: false } }) => {
  const [showCaseEdit, setShowCaseEdit] = useState(false);
  const [showConfirmPrompt, setShowConfirmPrompt] = useState(false);
  const { t, lang } = useLang();
  const [alerts, setAlerts] = useState({
    whenCurrent: false,
    whenEligible: false,
    monthlyUpdates: true,
    retrogression: false,
    i751Window: true,        // remind when I-751 window is ~30 days away
    n400Eligible: true,      // remind when N-400 eligibility is ~30 days away
  });

  // Hydrate from the same persisted flag useSubscribed() reads elsewhere — otherwise a
  // returning subscriber (new session, isSubscribed reset to false) sees the signup form
  // again instead of their saved state, and the case/alert sync effect below never arms.
  const [email, setEmail] = useState(() => {
    try { return window.localStorage.getItem('gc_subscribedEmail') || ''; } catch { return ''; }
  });
  const [emailStatus, setEmailStatus] = useState(''); // 'success' | 'updated' | 'error' | 'invalid' | 'loading'
  const [isSubscribed, setIsSubscribed] = useState(() => {
    try { return !!window.localStorage.getItem('gc_subscribedEmail'); } catch { return false; }
  });
  // "Already a subscriber? Update here" — for a browser/device with no local
  // gc_subscribedEmail flag (private window, different device, cleared storage).
  // Doesn't change what gets submitted (same email+userCase POST works either way,
  // /api/subscribe already upserts by email) — purely changes the copy so someone
  // who IS already subscribed isn't afraid re-submitting will duplicate them.
  const [updateMode, setUpdateMode] = useState(false);

  const toggleAlert = (key) => {
    setAlerts(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // ---- Email subscription API endpoint ----
  // Default: /api/subscribe (Cloudflare Pages Function, same domain, no CORS).
  // If using a standalone Worker instead, replace with full URL:
  //   const SUBSCRIBE_API = 'https://greencard-api.YOUR_ACCOUNT.workers.dev/subscribe';
  const SUBSCRIBE_API = `${API_BASE}/api/subscribe`;

  const handleSubscribe = async () => {
    if (!validateEmail(email)) {
      setEmailStatus('invalid');
      setTimeout(() => setEmailStatus(''), 3000);
      return;
    }

    // This form has no subtype/birth pickers of its own. Rather than silently
    // writing a record missing them, hand the visitor to SubscribeModal, which does.
    // updateMode is no exception: an existing subscriber whose stored case predates
    // these fields is exactly who we need them from.
    if (caseNeedsIntake(userCase)) {
      openSubscribeModal(email.trim().toLowerCase());
      return;
    }

    setEmailStatus('loading');

    try {
      const response = await fetch(SUBSCRIBE_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          userCase: userCase,
          alerts: alerts,
          language: lang,
        }),
      });

      const result = await response.json().catch(() => ({ success: false }));

      if (response.ok && result.success) {
        setIsSubscribed(true);
        // Every other entry point keys off this to never bother an existing subscriber.
        // Also what makes this browser recognize itself as subscribed going forward —
        // the whole point of the "already a subscriber? update here" path below.
        try { window.localStorage.setItem('gc_subscribedEmail', email.trim().toLowerCase()); } catch {}
        announceSubscribed();
        trackEv('subscribe_done');
        if (result.confirmed) {
          // Re-submitting the email of an already-confirmed subscriber (the "update
          // my subscription" path, e.g. from a browser/device with no local flag) —
          // server upserted the record, no confirmation mail was sent because none
          // was needed. Showing the "check your inbox" prompt here would be a lie.
          setEmailStatus('updated');
          setTimeout(() => setEmailStatus(''), 3000);
        } else {
          setEmailStatus('success');
          setShowConfirmPrompt(true); // 双重确认漏斗的洞：明确告诉用户还差一步
          setTimeout(() => setEmailStatus(''), 3000);
        }
      } else {
        console.error('Subscription failed:', result.error || response.statusText);
        setEmailStatus('error');
        setTimeout(() => setEmailStatus(''), 3000);
      }
    } catch (error) {
      console.error('Subscription error:', error);
      setEmailStatus('error');
      setTimeout(() => setEmailStatus(''), 3000);
    }
  };

  // Persist alert toggles AND case edits (category/PD/country/subtype/...) made AFTER
  // subscribing. handleSubscribe is the only other place that POSTs and it fires solely
  // from the subscribe button, so before this every post-subscribe change to alerts or
  // to userCase only touched local state and was never sent — editing your case on the
  // case card silently drifted away from what the server had on file for your emails.
  // Debounced so several changes in a row are one request, which also keeps well clear
  // of the per-IP rate limit on /api/subscribe.
  const skipAlertSync = useRef(true);
  const [syncToast, setSyncToast] = useState(false);
  useEffect(() => {
    // Not subscribed (or no usable address) — nothing to sync. Re-arm the skip so the
    // first change after a future subscribe doesn't fire a redundant duplicate of the
    // POST that handleSubscribe just made.
    if (!isSubscribed || !validateEmail(email)) {
      skipAlertSync.current = true;
      return;
    }
    if (skipAlertSync.current) {
      skipAlertSync.current = false;
      return;
    }
    const timer = setTimeout(() => {
      fetch(SUBSCRIBE_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          userCase,
          alerts,
          language: lang,
        }),
      })
        .then((resp) => {
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          // Silent sync otherwise gives no sign the case edit actually reached the
          // subscription — a brief toast is the only feedback this flow gets.
          setSyncToast(true);
          setTimeout(() => setSyncToast(false), 3000);
        })
        .catch((err) => console.error('Case/alert preference sync failed:', err));
    }, 800);
    return () => clearTimeout(timer);
  }, [alerts, userCase, isSubscribed]);

  const handleUnsubscribe = async () => {
    // Fire-and-forget unsubscribe (user stays unsubscribed in UI regardless of API result)
    if (email) {
      try {
        await fetch(`${SUBSCRIBE_API}?email=${encodeURIComponent(email.trim().toLowerCase())}`, {
          method: 'DELETE',
        });
      } catch (e) {
        console.error('Unsubscribe error:', e);
      }
    }
    setIsSubscribed(false);
    setEmail('');
    setEmailStatus('');
  };

  const alertItems = [
    { key: 'whenCurrent', icon: Target, label: t.alertWhenCurrent },
    { key: 'whenEligible', icon: FileText, label: t.alertWhenEligible },
    { key: 'monthlyUpdates', icon: Calendar, label: t.alertMonthlyUpdates },
    { key: 'retrogression', icon: TrendingDown, label: t.alertRetrogression },
    // Green-card-holder reminders — only show if user has approvalDate set
    // (means they've completed I-485 and we're tracking their post-GC lifecycle)
    ...(greenCardInfo.approvalDate && greenCardInfo.isConditional ? [
      { key: 'i751Window', icon: Shield, label: lang === 'en'
          ? 'I-751 filing window opens (removes conditions)'
          : lang === 'tw' ? 'I-751 申請窗口開啟(解除條件)' : 'I-751 申请窗口开启(解除条件)'
      },
    ] : []),
    ...(greenCardInfo.approvalDate ? [
      { key: 'n400Eligible', icon: CheckCircle2, label: lang === 'en'
          ? 'N-400 citizenship eligibility'
          : lang === 'tw' ? 'N-400 入籍資格到期' : 'N-400 入籍资格到期'
      },
    ] : []),
  ];

  return (
    <div className="space-y-2">
      {/* Sync toast — the case/alert sync above is otherwise silent, so an edit made
          on the persistent case bar while already subscribed gives no sign it actually
          reached the subscription record. Auto-dismisses; doesn't block anything. */}
      {syncToast && (
        <div style={{
          position: 'fixed', left: '50%', bottom: '24px', transform: 'translateX(-50%)',
          zIndex: 1100, display: 'flex', alignItems: 'center', gap: '7px',
          background: 'var(--gc-green)', color: 'var(--gc-paper)',
          padding: '9px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
          boxShadow: '0 8px 24px rgba(0,0,0,0.25)', whiteSpace: 'nowrap',
        }}>
          <CheckCircle2 size={14} />
          {lang === 'en' ? 'Synced — your email updates now use this case'
            : lang === 'tw' ? '已同步 — 郵件更新已改用這個案子'
            : '已同步 — 邮件更新已改用这个案子'}
        </div>
      )}

      {/* Alert Preferences — ABOVE the subscribe form. When it sat below, an
          unsubscribed visitor had the whole form between them and the toggles,
          which read as "these appear only after you subscribe". */}
      <div style={{
        background: 'var(--gc-surface)',
        border: '1px solid var(--gc-rule)',
        borderRadius: '4px',
        padding: '12px 14px',
      }}>
        <div style={{ marginBottom: '12px' }}>
          <div className="flex items-center gap-2" style={{ marginBottom: '3px' }}>
            <Bell size={14} strokeWidth={2} style={{ color: 'var(--gc-ink-soft)' }} />
            <div className="gc-eyebrow" style={{ color: 'var(--gc-muted)' }}>
              {t.alerts}
            </div>
          </div>
          <h3 className="gc-serif" style={{
            fontSize: '16px', fontWeight: 700, color: 'var(--gc-ink)',
            margin: '0 0 3px', letterSpacing: '-0.005em',
          }}>
            {lang === 'en' ? 'Smart reminders' : lang === 'tw' ? '智能提醒' : '智能提醒'}
          </h3>
          <p style={{
            fontSize: '11px', color: 'var(--gc-muted)', margin: 0, lineHeight: 1.45,
          }}>
            {t.alertSubtitle}
          </p>
        </div>

        <div className="space-y-2">
          {alertItems.map(item => (
            <div key={item.key} className="flex items-center justify-between" style={{
              padding: '10px 12px',
              background: 'var(--gc-paper-soft)',
              border: '1px solid var(--gc-rule)',
              borderRadius: '3px',
            }}>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center flex-shrink-0" style={{
                  width: '28px', height: '28px',
                  background: 'var(--gc-surface)',
                  border: '1px solid var(--gc-rule)',
                  borderRadius: '3px',
                }}>
                  <item.icon size={13} strokeWidth={2} style={{ color: 'var(--gc-ink-soft)' }} />
                </div>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--gc-ink)' }}>{item.label}</span>
              </div>
              <button onClick={() => toggleAlert(item.key)}
                className="relative transition-all duration-200"
                style={{
                  width: '40px', height: '22px',
                  borderRadius: '11px',
                  background: alerts[item.key] ? 'var(--gc-green)' : 'var(--gc-rule)',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}>
                <div className="absolute transition-transform duration-200" style={{
                  width: '18px', height: '18px',
                  background: 'var(--gc-paper)',
                  borderRadius: '50%',
                  top: '2px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                  transform: alerts[item.key] ? 'translateX(20px)' : 'translateX(2px)',
                }}></div>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Email Subscription Section — editorial style (paper/ink/rule, no blue) */}
      <div style={{
        background: 'var(--gc-surface)',
        border: '1px solid var(--gc-rule)',
        borderLeft: '2px solid var(--gc-green)',
        borderRadius: '4px',
        padding: '12px 14px',
      }}>
        <div className="flex items-center gap-2" style={{ marginBottom: '8px' }}>
          <Mail size={14} strokeWidth={2} style={{ color: 'var(--gc-green)' }} />
          <div className="gc-eyebrow" style={{ color: 'var(--gc-green)' }}>
            {t.emailSubscription}
          </div>
        </div>

        <h3 className="gc-serif" style={{
          fontSize: '16px', fontWeight: 700, color: 'var(--gc-ink)',
          margin: '0 0 3px', letterSpacing: '-0.005em',
        }}>
          {t.emailTitle}
        </h3>
        <p style={{
          fontSize: '11px', color: 'var(--gc-muted)', margin: '0 0 10px', lineHeight: 1.45,
        }}>
          {t.emailSubtitle}
        </p>

        {!isSubscribed ? (
          <div className="space-y-2.5">
            {/* 案子摘要预览 */}
            <div style={{
              padding: '9px 11px',
              background: 'var(--gc-paper-soft)',
              border: '1px solid var(--gc-rule)',
              borderRadius: '3px',
            }}>
              <div className="flex items-center justify-between mb-1">
                <span className="gc-eyebrow" style={{
                  fontSize: '11px', color: 'var(--gc-muted)', letterSpacing: '0.14em',
                }}>
                  {lang === 'en' ? 'Subscription based on' : lang === 'tw' ? '訂閱將基於' : '订阅将基于'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowCaseEdit(true)}
                  className="flex items-center gap-0.5 flex-shrink-0"
                  style={{
                    fontSize: '11px', fontWeight: 700,
                    color: 'var(--gc-green-ink)',
                    background: 'transparent', border: 'none', padding: 0,
                    cursor: 'pointer', letterSpacing: '0.02em',
                  }}>
                  {lang === 'en' ? 'Edit →' : lang === 'tw' ? '修改 →' : '修改 →'}
                </button>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap leading-snug" style={{ fontSize: '11px', color: 'var(--gc-ink-soft)' }}>
                <span className="gc-mono" style={{ fontWeight: 700, color: 'var(--gc-ink)' }}>{userCase.category}</span>
                <span style={{ color: 'var(--gc-rule)' }}>·</span>
                <span>
                  {userCase.country === 'China' ? (lang === 'tw' ? '中國大陸' : '中国大陆') :
                   userCase.country === 'Taiwan' ? (lang === 'en' ? 'Global/Taiwan HK Macao' : '全球/港澳台') :
                   userCase.country === 'India' ? (lang === 'en' ? 'India' : '印度') :
                   userCase.country === 'Mexico' ? (lang === 'en' ? 'Mexico' : '墨西哥') :
                   userCase.country === 'Philippines' ? (lang === 'en' ? 'Philippines' : lang === 'tw' ? '菲律賓' : '菲律宾') :
                   userCase.country}
                </span>
                <span style={{ color: 'var(--gc-rule)' }}>·</span>
                <span className="gc-mono">{formatDate(userCase.priorityDate, lang)}</span>
                <span style={{ color: 'var(--gc-rule)' }}>·</span>
                <span style={{ color: 'var(--gc-muted)' }}>
                  {userCase.inUS == null
                    ? (lang === 'en' ? 'Location not set' : lang === 'tw' ? '未填在美與否' : '未填在美与否')
                    : userCase.inUS
                      ? (lang === 'en' ? 'In US' : lang === 'tw' ? '在美國' : '在美国')
                      : (lang === 'en' ? 'Abroad' : lang === 'tw' ? '境外' : '境外')}
                </span>
                {(userCase.category === 'F1' || userCase.category === 'F2A' || userCase.category === 'F2B' || userCase.category === 'F3' || userCase.category === 'F4') && userCase.petitionerStatus && (
                  <>
                    <span style={{ color: 'var(--gc-rule)' }}>·</span>
                    <span style={{ color: 'var(--gc-muted)' }}>
                      {userCase.petitionerStatus === 'USC'
                        ? (lang === 'en' ? 'USC petitioner' : lang === 'tw' ? '公民擔保' : '公民担保')
                        : (lang === 'en' ? 'LPR petitioner' : lang === 'tw' ? '綠卡擔保' : '绿卡担保')}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* 邮箱 + 订阅按钮 */}
            <div>
              <div className="flex items-center justify-between" style={{ marginBottom: '4px' }}>
                <label className="gc-eyebrow" style={{
                  fontSize: '11px', color: 'var(--gc-muted)', letterSpacing: '0.14em',
                }}>
                  {lang === 'en' ? 'Email' : lang === 'tw' ? '郵箱' : '邮箱'}
                </label>
                <button type="button" onClick={() => setUpdateMode((v) => !v)}
                  style={{
                    fontSize: '11px', color: 'var(--gc-green-ink)', fontWeight: 600,
                    background: 'transparent', border: 'none', padding: 0, cursor: 'pointer',
                  }}>
                  {updateMode
                    ? (lang === 'en' ? '← New signup instead' : lang === 'tw' ? '← 改成新訂閱' : '← 改成新订阅')
                    : (lang === 'en' ? 'Already subscribed? Update here' : lang === 'tw' ? '已經訂閱過？點此更改訂閱' : '已经订阅过？点此更改订阅')}
                </button>
              </div>
              {updateMode && (
                <div style={{
                  fontSize: '11px', color: 'var(--gc-muted)', lineHeight: 1.5,
                  marginBottom: '6px', padding: '6px 8px',
                  background: 'var(--gc-paper-soft)', border: '1px solid var(--gc-rule-soft)', borderRadius: '3px',
                }}>
                  {lang === 'en'
                    ? 'Enter the email you subscribed with. Submitting updates your existing subscription with the case above — it won\'t create a duplicate.'
                    : lang === 'tw'
                      ? '填你訂閱時用的郵箱。提交後會用上面這個案子更新你現有的訂閱，不會重複訂閱。'
                      : '填你订阅时用的邮箱。提交后会用上面这个案子更新你现有的订阅，不会重复订阅。'}
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t.emailPlaceholder}
                  className="flex-1 min-w-0"
                  style={{
                    padding: '8px 10px',
                    fontSize: '13px',
                    background: 'var(--gc-paper)',
                    border: '1px solid var(--gc-rule)',
                    borderRadius: '3px',
                    color: 'var(--gc-ink)',
                    outline: 'none',
                    transition: 'border-color 120ms',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--gc-green)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--gc-rule)'; }}
                  disabled={emailStatus === 'loading'}
                />
                <button
                  onClick={handleSubscribe}
                  disabled={emailStatus === 'loading' || !email}
                  className="flex-shrink-0"
                  style={{
                    padding: '8px 16px',
                    fontSize: '12px',
                    fontWeight: 700,
                    background: (emailStatus === 'loading' || !email) ? 'var(--gc-muted)' : 'var(--gc-green)',
                    color: 'var(--gc-paper)',
                    border: 'none',
                    borderRadius: '3px',
                    cursor: (emailStatus === 'loading' || !email) ? 'not-allowed' : 'pointer',
                    opacity: (emailStatus === 'loading' || !email) ? 0.5 : 1,
                    letterSpacing: '0.02em',
                    transition: 'all 120ms',
                  }}>
                  {emailStatus === 'loading' ? '...' : updateMode
                    ? (lang === 'en' ? 'Update' : lang === 'tw' ? '更新訂閱' : '更新订阅')
                    : t.emailSubscribe}
                </button>
              </div>
            </div>

            {emailStatus === 'updated' && (
              <div className="flex items-center gap-2" style={{
                fontSize: '12px', color: 'var(--gc-green-ink)',
                background: 'var(--gc-green-soft)',
                padding: '8px 12px', borderRadius: '3px',
                border: '1px solid var(--gc-green-border)',
              }}>
                <CheckCircle2 size={14} />
                {lang === 'en' ? 'Subscription updated — future emails use this case.'
                  : lang === 'tw' ? '訂閱已更新 — 之後的郵件會用這個案子。'
                  : '订阅已更新 — 之后的邮件会用这个案子。'}
              </div>
            )}

            {emailStatus === 'success' && (
              <div className="flex items-center gap-2" style={{
                fontSize: '12px', color: 'var(--gc-green-ink)',
                background: 'var(--gc-green-soft)',
                padding: '8px 12px', borderRadius: '3px',
                border: '1px solid var(--gc-green-border)',
              }}>
                <CheckCircle2 size={14} />
                {t.emailSuccess}
              </div>
            )}

            {emailStatus === 'error' && (
              <div className="flex items-center gap-2" style={{
                fontSize: '12px', color: '#991b1b',
                background: 'rgba(138,24,24,0.06)',
                padding: '8px 12px', borderRadius: '3px',
                border: '1px solid rgba(138,24,24,0.2)',
              }}>
                <AlertCircle size={14} />
                {t.emailError}
              </div>
            )}

            {emailStatus === 'invalid' && (
              <div className="flex items-center gap-2" style={{
                fontSize: '12px', color: 'var(--gc-amber-ink)',
                background: 'var(--gc-amber-soft)',
                padding: '8px 12px', borderRadius: '3px',
                border: '1px solid var(--gc-amber-border)',
              }}>
                <AlertCircle size={14} />
                {t.emailInvalid}
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between" style={{
              padding: '10px 12px',
              background: 'var(--gc-green-soft)',
              border: '1px solid var(--gc-green-border)',
              borderRadius: '3px',
            }}>
              <div className="flex items-center gap-2 min-w-0 flex-1" style={{ color: 'var(--gc-green-ink)' }}>
                <CheckCircle2 size={14} className="flex-shrink-0" />
                <span style={{ fontSize: '12px', fontWeight: 600 }} className="truncate">{email}</span>
              </div>
              <button
                onClick={handleUnsubscribe}
                className="flex-shrink-0"
                style={{
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 700,
                  color: 'var(--gc-green-ink)',
                  background: 'transparent',
                  border: '1px solid var(--gc-green-border)',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  letterSpacing: '0.04em',
                }}>
                {t.emailUnsubscribe}
              </button>
            </div>
          </div>
        )}

        <div style={{
          marginTop: '10px',
          fontSize: '11px',
          color: 'var(--gc-muted)',
          lineHeight: 1.45,
        }}>
          {t.emailPrivacy}
        </div>
      </div>

    
      {/* Post-subscribe prompt — subscription is NOT live until the confirmation
          link is clicked; two of the first four real signups stalled exactly here. */}
      {showConfirmPrompt && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'rgba(15,20,25,0.55)' }}
             onClick={() => setShowConfirmPrompt(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: 'var(--gc-surface)', border: '1px solid var(--gc-rule)', borderTop: '3px solid var(--gc-green)',
            borderRadius: '6px', maxWidth: '340px', width: '100%', padding: '20px 18px 16px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)', textAlign: 'center',
          }}>
            <Mail size={28} strokeWidth={1.8} style={{ color: 'var(--gc-green)', margin: '0 auto 10px' }} />
            <div className="gc-serif" style={{ fontSize: '18px', fontWeight: 700, color: 'var(--gc-ink)', marginBottom: '8px' }}>
              {lang === 'en' ? 'One more step' : lang === 'tw' ? '還差一步' : '还差一步'}
            </div>
            <div style={{ fontSize: '13px', lineHeight: 1.7, color: 'var(--gc-ink-soft)', textAlign: 'left' }}>
              {lang === 'en'
                ? <>A confirmation email was sent to <b>{email}</b>. Your subscription is NOT active until you click the link inside.</>
                : lang === 'tw'
                  ? <>確認郵件已發送到 <b>{email}</b>。<b>點擊郵件裡的確認連結後，訂閱才會生效。</b></>
                  : <>确认邮件已发送到 <b>{email}</b>。<b>点开邮件里的确认链接后，订阅才会生效。</b></>}
            </div>
            <div style={{ fontSize: '12px', lineHeight: 1.7, color: 'var(--gc-muted)', marginTop: '8px', textAlign: 'left', background: 'var(--gc-paper-soft)', border: '1px solid var(--gc-rule-soft)', borderRadius: '3px', padding: '8px 10px' }}>
              {lang === 'en'
                ? 'Can\'t find it? Check your spam/junk folder and add the sender to your contacts.'
                : lang === 'tw'
                  ? '沒看到？請檢查垃圾郵件匣，並把發件人加入通訊錄，以免之後的月度更新被攔截。'
                  : '没看到？请检查垃圾邮件，并把发件人加入通讯录，以免之后的月度更新被拦截。'}
            </div>
            <button type="button" onClick={() => setShowConfirmPrompt(false)}
              style={{
                width: '100%', marginTop: '12px', padding: '10px', fontSize: '13px', fontWeight: 700,
                background: 'var(--gc-green)', color: 'var(--gc-paper)', border: 'none',
                borderRadius: '4px', cursor: 'pointer',
              }}>
              {lang === 'en' ? 'Got it — off to my inbox' : lang === 'tw' ? '知道了，這就去點' : '知道了，这就去点'}
            </button>
          </div>
        </div>
      )}

      {/* Case-edit modal — the old Edit button dumped users back on the Overview tab;
          now the same segmented editor opens in place, pre-expanded. */}
      {showCaseEdit && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '48px 16px', background: 'rgba(15,20,25,0.55)' }}
             onClick={() => setShowCaseEdit(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '480px' }}>
            <CompactCaseBar userCase={userCase} setUserCase={setUserCase} defaultExpanded />
            <button type="button" onClick={() => setShowCaseEdit(false)}
              style={{
                width: '100%', marginTop: '8px', padding: '10px', fontSize: '13px', fontWeight: 700,
                background: 'var(--gc-green)', color: 'var(--gc-paper)', border: 'none',
                borderRadius: '4px', cursor: 'pointer',
              }}>
              {lang === 'en' ? 'Done' : lang === 'tw' ? '完成' : '完成'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// Comparison — By-country view (the "By Priority Date" variant was removed)
// ============================================================
// ============================================================
// CompareHub — the "What if" page. Three scenarios that answer real decisions:
// spouse's birth country (cross-chargeability), category change (naturalization /
// EB downgrade), and free comparison (the original tool). Verdict sentence first,

export default SmartAlerts;
