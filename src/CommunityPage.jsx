// UI-23 code split: CommunityHub + BulletinTalk + CompareHub + CommunityPage, lazy chunk for the community tab.
// Extracted verbatim from App.jsx; shared helpers stay in App.jsx (imported
// below) or in functions/api/_gcMath.js. Loaded lazily by App.jsx per tab.
import React, { lazy, Suspense, useState, useEffect } from 'react';
import { CheckCircle2, Users, RefreshCw, Lock } from 'lucide-react';
import { FILING_AUTHORIZED, resolveCountry, computeStatus } from '../functions/api/_gcMath.js';
import { API_BASE, CrowdReportForms, formatDate, useLang, bulletinCurrent, paceDaysToCalendar, InlineSubscribeCTA } from './App.jsx';
const TrackerPage = lazy(() => import('./Tracker.jsx'));
const ChunkFallback = () => (
  <div style={{ padding: '20px 12px', textAlign: 'center', color: 'var(--gc-muted)', fontSize: '13px', letterSpacing: '0.3em' }}>···</div>
);
// (see /api/community); localStorage only guards against double-submits.
// ============================================================
// 每月一题按「下个月的公告」自动滚动：原来写死「9 月排期」，9 月公告出来之后还挂着，
// 问的是已经知道答案的事。id 带月份，每个月的票数自然分开。
const CURRENT_POLL = (() => {
  const d = new Date();
  const nx = new Date(d.getFullYear(), d.getMonth() + 1, 1);
  const ym = `${nx.getFullYear()}-${String(nx.getMonth() + 1).padStart(2, '0')}`;
  const m = nx.getMonth() + 1;
  const enMonth = nx.toLocaleString('en-US', { month: 'long' });
  return {
    id: `poll-${ym}-bulletin`,
    q: { zh: `${m} 月排期，你觉得你的类别会怎么走？`, tw: `${m} 月排期，你覺得你的類別會怎麼走？`, en: `Your call for the ${enMonth} bulletin:` },
    options: [
      { id: 'advance', zh: '会前进', tw: '會前進', en: 'Advances' },
      { id: 'flat', zh: '原地不动', tw: '原地不動', en: 'Flat' },
      { id: 'retro', zh: '会回调', tw: '會回調', en: 'Retrogresses' },
    ],
  };
})();

// ============================================================
// UI-16: 社区页「一门三段」。原 CommunityHub（一卡三子标签：poll/wall/
// survey）按三段拆开，与 Tracker、BulletinTalk 一起由 CommunityPage
// 组装：
//   段1 同路人进度 — Tracker 置顶 + 「报一条你的数据」卡组
//      （CrowdReportForms=时间线/RFE，从个人页迁入，定义在 App.jsx；
//       ReportSurveys=换类别/费用调查）
//   段2 聊聊 — BulletinTalk 评论 + 打卡墙 WallBlock，两块分开、不并流
//   段3 每月一题 — PollBlock（poll + 选题箱）
// 拆分纪律：post() 的端点与 body（自动带 cat/country）、localStorage
// 已报键（gc_cd_<key>）、poll 的乐观更新、wall 的首 5 条+展开、switch
// 的 <details> 默认收起（UI-07）、poll 的折叠标题行（UI-08）全部与
// 拆分前逐项一致，只变入口位置。useCommunityPost 把原 hub 内共享的
// post/done/busy 原样抽成 hook 供三块共用。
// ============================================================
const useCommunityPost = (userCase, sample, onNeedCase) => {
  const [busy, setBusy] = useState('');
  const post = async (payload, doneKey) => {
    // 示例模式下不投票不发帖（否则会带着示例的类别写进真实数据），改成引导去填案子
    if (sample) { onNeedCase?.(); return false; }
    setBusy(doneKey);
    try {
      const r = await fetch(`${API_BASE}/api/community`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, cat: userCase.category, country: userCase.country }),
      });
      if (!r.ok) throw new Error();
      try { window.localStorage.setItem(`gc_cd_${doneKey}`, '1'); } catch { /* noop */ }
      setBusy('');
      return true;
    } catch { setBusy(''); return false; }
  };
  const done = (k) => { try { return !!window.localStorage.getItem(`gc_cd_${k}`); } catch { return false; } };
  return { post, done, busy };
};
const chipStyle = (active) => ({
  fontSize: '12px', fontWeight: 700, padding: '8px 12px', border: `1px solid ${active ? 'var(--gc-green)' : 'var(--gc-rule)'}`,
  borderRadius: '3px', cursor: 'pointer', background: active ? 'var(--gc-green)' : 'var(--gc-surface)',
  color: active ? 'var(--gc-paper)' : 'var(--gc-ink-soft)',
});
const submitBtnStyle = { fontSize: '12.5px', fontWeight: 700, padding: '6px 14px', border: 'none', borderRadius: '3px', cursor: 'pointer', background: 'var(--gc-green)', color: 'var(--gc-paper)' };
const DoneNote = ({ children }) => (
  <div style={{ fontSize: '12.5px', color: 'var(--gc-green-ink)', fontWeight: 600 }}>{children}</div>
);
const SUBSCRIBE_LABEL = {
  zh: '这批社区数据的完整分析，每月随排期邮件发出',
  tw: '這批社區數據的完整分析，每月隨排期郵件發出',
  en: 'Full analysis of this data ships with the monthly email',
};

// Segment header for the three-part 社区 page.
const SectionHead = ({ zh, tw, en }) => {
  const { lang } = useLang();
  return (
    <div style={{ margin: '10px 0 2px' }}>
      <div className="gc-eyebrow" style={{ color: 'var(--gc-green)', fontSize: '11px' }}>
        {lang === 'en' ? en : lang === 'tw' ? tw : zh}
      </div>
    </div>
  );
};

// —— 段1 卡组（社区侧）：换类别调查 + 费用调查（拆分前在 hub 的
// survey 子标签内）。提交与聚合公式逐字保留。——
const ReportSurveys = ({ userCase, sample = false, onNeedCase }) => {
  const { lang } = useLang();
  const L = (zh, tw, en) => (lang === 'en' ? en : lang === 'tw' ? tw : zh);
  const isEB = !userCase.category?.startsWith('F');
  const { post, done, busy } = useCommunityPost(userCase, sample, onNeedCase);

  // surveys
  const [swAction, setSwAction] = useState(null);
  const [swAgg, setSwAgg] = useState(null);
  const [swOutcome, setSwOutcome] = useState(null);
  const [swDone, setSwDone] = useState(() => done('switch'));
  useEffect(() => {
    if (swDone && !swAgg) {
      fetch(`${API_BASE}/api/community?type=switch&cat=${userCase.category}`).then((r) => r.json()).then(setSwAgg).catch(() => {});
    }
  }, [swDone]); // eslint-disable-line react-hooks/exhaustive-deps
  const [costDone, setCostDone] = useState(() => done('cost'));
  const [costAgg, setCostAgg] = useState(null);
  useEffect(() => {
    if (costDone && !costAgg) {
      fetch(`${API_BASE}/api/community?type=cost&cat=${userCase.category}`).then((r) => r.json()).then(setCostAgg).catch(() => {});
    }
  }, [costDone]); // eslint-disable-line react-hooks/exhaustive-deps

  // The "switched category" option only makes sense worded toward whatever direction
  // is actually reachable from THIS user's category (EB2 goes down to EB-3, EB3 goes
  // up to EB-2) — a fixed "降级 EB-3" label was nonsensical for an EB-2 or EB-1 reader.
  const switchOpt = {
    EB2: { id: 'downgrade', label: L('降级到 EB-3', '降級到 EB-3', 'Downgraded to EB-3') },
    EB3: { id: 'upgrade', label: L('升级到 EB-2', '升級到 EB-2', 'Upgraded to EB-2') },
  }[userCase.category] || { id: 'switched', label: L('换过类别', '換過類別', 'Switched category') };

  const surveyCard = { background: 'var(--gc-surface)', border: '1px solid var(--gc-rule)', borderRadius: '4px', padding: '12px 14px', marginBottom: '8px' };

  return (
    <div>
      {isEB && (
        <details style={surveyCard}>
          {/* UI-07：switch 调查三个月仅 1 条，入口默认收起（数据与端点保留，
              展开即恢复原表单/结果）。UI-16 后此 <details> 成为段1 卡组
              的一张子卡，收起行为不变。 */}
          <summary style={{ cursor: 'pointer', fontSize: '13px', fontWeight: 700, color: 'var(--gc-ink)', listStyle: 'revert' }}>
            {L('你为缩短等待做过什么？', '你為縮短等待做過什麼？', 'Have you tried to shorten the wait?')}
            <span style={{ fontWeight: 400, color: 'var(--gc-muted)', fontSize: '12px' }}>
              {swDone
                ? L(' · 已提交，展开看结果', ' · 已提交，展開看結果', ' · submitted — tap for results')
                : L(' · 展开填（换类别/换雇主/加急）', ' · 展開填（換類別/換雇主/加急）', ' · tap to answer')}
            </span>
          </summary>
          <div style={{ marginTop: '5px' }}>
          {!swDone ? (
            <>
              <div className="flex" style={{ gap: '6px', flexWrap: 'wrap', marginBottom: '5px' }}>
                {[[switchOpt.id, switchOpt.label], ['porting', L('换雇主', '換雇主', 'Changed employer')], ['premium', L('用过加急', '用過加急', 'Premium processing')], ['none', L('都没有', '都沒有', 'None')]].map(([id, label]) => (
                  <button key={id} type="button" onClick={() => { setSwAction(id); if (id === 'none') setSwOutcome(null); }} style={chipStyle(swAction === id)}>{label}</button>
                ))}
              </div>
              {swAction && swAction !== 'none' && (
                <div className="flex" style={{ gap: '6px', flexWrap: 'wrap', marginBottom: '5px' }}>
                  {[['faster', L('确实快了', '確實快了', 'Faster')], ['same', L('差不多', '差不多', 'Same')], ['regret', L('后悔了', '後悔了', 'Regret it')], ['pending', L('还在等结果', '還在等結果', 'Pending')]].map(([id, label]) => (
                    <button key={id} type="button" onClick={() => setSwOutcome(id)} style={chipStyle(swOutcome === id)}>{label}</button>
                  ))}
                </div>
              )}
              {swAction && (swAction === 'none' || swOutcome) && (
                <button type="button" style={submitBtnStyle} disabled={busy === 'switch'}
                  onClick={async () => {
                    if (await post({ type: 'switch', action: swAction, outcome: swOutcome }, 'switch')) {
                      setSwDone(true);
                      setSwAgg((prev) => {
                        const base = prev || { total: 0, actions: {} };
                        return { total: base.total + 1, actions: { ...base.actions, [swAction]: (base.actions[swAction] || 0) + 1 } };
                      });
                      fetch(`${API_BASE}/api/community?type=switch&cat=${userCase.category}`).then((r) => r.json())
                        .then((data) => setSwAgg((prev) => (data && data.total >= (prev?.total || 0) ? data : prev)))
                        .catch(() => {});
                    }
                  }}>
                  {L('匿名提交', '匿名提交', 'Submit')}
                </button>
              )}
            </>
          ) : (
            <div>
              <DoneNote>{L('已提交 ✓', '已提交 ✓', 'Submitted ✓')}</DoneNote>
              {swAgg && swAgg.total > 0 && (
                <div style={{ marginTop: '5px' }}>
                  {[[switchOpt.id, switchOpt.label], ['porting', L('换雇主', '換雇主', 'Port')], ['premium', L('加急', '加急', 'Premium')], ['none', L('都没有', '都沒有', 'None')]].map(([id, label]) => {
                    const n = swAgg.actions?.[id] || 0;
                    const pct = swAgg.total ? Math.round((n / swAgg.total) * 100) : 0;
                    return (
                      <div key={id} className="flex items-center" style={{ gap: '8px', padding: '2px 0' }}>
                        <span style={{ fontSize: '12px', color: 'var(--gc-ink-soft)', width: '70px', flexShrink: 0 }}>{label}</span>
                        <span style={{ flex: 1, height: '7px', background: 'var(--gc-rule-soft)', borderRadius: '3px', overflow: 'hidden' }}>
                          <span style={{ display: 'block', height: '100%', width: `${pct}%`, background: 'var(--gc-green)' }} />
                        </span>
                        <span className="gc-mono" style={{ fontSize: '12px', color: 'var(--gc-muted)', width: '38px', textAlign: 'right' }}>{pct}%</span>
                      </div>
                    );
                  })}
                  <div style={{ fontSize: '11px', color: 'var(--gc-muted)', marginTop: '3px' }}>
                    {L(`${swAgg.total} 份 · 匿名`, `${swAgg.total} 份 · 匿名`, `${swAgg.total} responses`)}
                  </div>
                </div>
              )}
            </div>
          )}
          </div>
        </details>
      )}

      <div style={surveyCard}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gc-ink)', marginBottom: '5px' }}>
          {L('整个流程的律师费＋官费，大概花了多少？', '整個流程的律師費＋官費，大概花了多少？', 'Total attorney + filing fees so far?')}
        </div>
        {!costDone ? (
          <div className="flex" style={{ gap: '6px', flexWrap: 'wrap' }}>
            {[['lt5k', '< $5k'], ['b5to10k', '$5-10k'], ['b10to15k', '$10-15k'], ['gt15k', '> $15k']].map(([id, label]) => (
              <button key={id} type="button" disabled={busy === 'cost'} style={chipStyle(false)}
                onClick={async () => {
                  if (await post({ type: 'cost', bracket: id }, 'cost')) {
                    setCostDone(true);
                    setCostAgg((prev) => {
                      const base = prev || { total: 0, brackets: {} };
                      return { total: base.total + 1, brackets: { ...base.brackets, [id]: (base.brackets[id] || 0) + 1 } };
                    });
                    fetch(`${API_BASE}/api/community?type=cost&cat=${userCase.category}`).then((r) => r.json())
                      .then((data) => setCostAgg((prev) => (data && data.total >= (prev?.total || 0) ? data : prev)))
                      .catch(() => {});
                  }
                }}>{label}</button>
            ))}
          </div>
        ) : (
          <div>
            <DoneNote>{L('已提交 ✓ 谢谢', '已提交 ✓ 謝謝', 'Submitted ✓')}</DoneNote>
            {costAgg && costAgg.total > 0 && (
              <div style={{ marginTop: '5px' }}>
                {[['lt5k', '< $5k'], ['b5to10k', '$5-10k'], ['b10to15k', '$10-15k'], ['gt15k', '> $15k']].map(([id, label]) => {
                  const n = costAgg.brackets?.[id] || 0;
                  const pct = costAgg.total ? Math.round((n / costAgg.total) * 100) : 0;
                  return (
                    <div key={id} className="flex items-center" style={{ gap: '8px', padding: '2px 0' }}>
                      <span style={{ fontSize: '12px', color: 'var(--gc-ink-soft)', width: '70px', flexShrink: 0 }}>{label}</span>
                      <span style={{ flex: 1, height: '7px', background: 'var(--gc-rule-soft)', borderRadius: '3px', overflow: 'hidden' }}>
                        <span style={{ display: 'block', height: '100%', width: `${pct}%`, background: 'var(--gc-green)' }} />
                      </span>
                      <span className="gc-mono" style={{ fontSize: '12px', color: 'var(--gc-muted)', width: '38px', textAlign: 'right' }}>{pct}%</span>
                    </div>
                  );
                })}
                <div style={{ fontSize: '11px', color: 'var(--gc-muted)', marginTop: '3px' }}>
                  {L(`${costAgg.total} 份 · 匿名`, `${costAgg.total} 份 · 匿名`, `${costAgg.total} responses`)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {(swDone || costDone) && (
        <InlineSubscribeCTA userCase={userCase} label={SUBSCRIBE_LABEL[lang] || SUBSCRIBE_LABEL.zh} />
      )}
    </div>
  );
};

// —— 段2：打卡墙（拆分前在 hub 的 wall 子标签内，现为独立块，与
// BulletinTalk 评论分开呈现、不并流）。条目列表、首 5 条+展开、
// 个资规则条（UI-10）逐项保留；唯一的挂载变化：本块一出现就拉条目
// （拆分前要先点开 wall 子标签才拉）。——
const WallBlock = ({ userCase, sample = false, onNeedCase }) => {
  const { lang } = useLang();
  const L = (zh, tw, en) => (lang === 'en' ? en : lang === 'tw' ? tw : zh);
  const { post, done, busy } = useCommunityPost(userCase, sample, onNeedCase);
  const pdD2 = userCase.priorityDate ? new Date(userCase.priorityDate + 'T00:00:00') : null;
  const myDays = pdD2 ? Math.max(0, Math.round((Date.now() - pdD2.getTime()) / 86400000)) : null;
  const [wallMsg, setWallMsg] = useState('');
  const [wall, setWall] = useState(null);
  const [walled, setWalled] = useState(() => done('wall'));
  const [wallExpanded, setWallExpanded] = useState(false); // 默认只显示前 5 条，别把页面撑太长
  useEffect(() => {
    fetch(`${API_BASE}/api/community?type=wall`).then((r) => r.json()).then(setWall).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const checkIn = async () => {
    if (myDays === null) return;
    if (await post({ type: 'wall', days: myDays, message: wallMsg }, 'wall')) {
      setWalled(true);
      setWall(null);
      fetch(`${API_BASE}/api/community?type=wall`).then((r) => r.json()).then(setWall).catch(() => {});
    }
  };
  return (
    <div style={{ background: 'var(--gc-surface)', border: '1px solid var(--gc-rule)', borderRadius: '4px', padding: '12px 14px' }}>
      <div className="gc-eyebrow" style={{ fontSize: '11px', letterSpacing: '0.12em', fontWeight: 700, color: 'var(--gc-muted)', marginBottom: '7px' }}>
        {L('打卡墙', '打卡牆', 'CHECK-IN WALL')}
      </div>
      {myDays !== null && (
        <div style={{ fontSize: '13px', color: 'var(--gc-ink-soft)', marginBottom: '7px' }}>
          {L(`你已等待 `, `你已等待 `, `You've waited `)}
          <b className="gc-mono" style={{ color: 'var(--gc-green-ink)' }}>{myDays.toLocaleString('en-US')}</b>
          {L(' 天', ' 天', ' days')}
        </div>
      )}
      {!walled ? (
        <div className="flex" style={{ gap: '6px', flexWrap: 'wrap' }}>
          <input value={wallMsg} onChange={(e) => setWallMsg(e.target.value.slice(0, 40))}
            placeholder={L('说一句（可留空，40 字内）', '說一句（可留空）', 'One line (optional)')}
            style={{ flex: '1 1 180px', minWidth: 0, fontSize: '13px', padding: '6px 9px', border: '1px solid var(--gc-rule)', borderRadius: '3px', background: 'var(--gc-paper)', color: 'var(--gc-ink)' }} />
          <button type="button" onClick={checkIn} disabled={busy === 'wall' || myDays === null} style={submitBtnStyle}>
            {L('打卡', '打卡', 'Check in')}
          </button>
        </div>
      ) : <DoneNote>{L('已打卡 ✓', '已打卡 ✓', 'Checked in ✓')}</DoneNote>}
      {/* 规则条（UI-10 补齐）：打卡墙与讨论区同后端同为公开自由文本，
          与拆分前同一行，位置随本块走。 */}
      <div style={{
        fontSize: '11px', lineHeight: 1.5, color: '#92400e',
        background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 'var(--gc-radius-sm)',
        padding: '5px 8px', marginTop: '7px',
      }}>
        {L('请勿发布案号、收据号、全名、电话等个人信息；他人经验不构成个案建议。',
          '請勿發布案號、收據號、全名、電話等個資；他人經驗不構成個案建議。',
          "Please don't post case or receipt numbers, full names, or phone numbers. Others' experiences are not advice for your case.")}
      </div>
      <div style={{ marginTop: '9px', paddingTop: '8px', borderTop: '1px solid var(--gc-rule-soft)' }}>
        {wall === null ? (
          <div style={{ fontSize: '12px', color: 'var(--gc-muted)' }}>…</div>
        ) : wall.entries?.length ? (
          <>
            {(wallExpanded ? wall.entries : wall.entries.slice(0, 5)).map((e, i, arr) => (
              <div key={i} className="flex items-baseline" style={{ gap: '8px', padding: '3px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--gc-rule-soft)' : 'none' }}>
                <span className="gc-mono" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gc-green-ink)', flexShrink: 0 }}>
                  {Number(e.days).toLocaleString('en-US')}{L('天', '天', 'd')}
                </span>
                {e.cat && <span className="gc-mono" style={{ fontSize: '11px', color: 'var(--gc-muted)', flexShrink: 0 }}>{e.cat}</span>}
                <span style={{ fontSize: '12.5px', color: 'var(--gc-ink-soft)', minWidth: 0 }}>{e.message || <span style={{ color: 'var(--gc-muted)' }}>{L('打了卡', '打了卡', 'checked in')}</span>}</span>
              </div>
            ))}
            {wall.entries.length > 5 && (
              <button type="button" onClick={() => setWallExpanded((v) => !v)}
                style={{ border: 'none', background: 'transparent', padding: '6px 0 0', cursor: 'pointer', fontSize: '12px', color: 'var(--gc-green)', fontWeight: 700 }}>
                {wallExpanded ? L('收起', '收起', 'Collapse') : L(`展开全部 ${wall.entries.length} 条`, `展開全部 ${wall.entries.length} 條`, `Show all ${wall.entries.length}`)}
              </button>
            )}
          </>
        ) : (
          <div style={{ fontSize: '12px', color: 'var(--gc-muted)' }}>
            {L('还没有人打卡——做第一个。', '還沒有人打卡——做第一個。', 'No check-ins yet — be the first.')}
          </div>
        )}
      </div>
      {walled && (
        <div style={{ marginTop: '8px' }}>
          <InlineSubscribeCTA userCase={userCase} label={SUBSCRIBE_LABEL[lang] || SUBSCRIBE_LABEL.zh} />
        </div>
      )}
    </div>
  );
};

// —— 段3：每月一题（poll）+ 选题箱。poll 的折叠标题行（UI-08）就是
// 本块的默认态：题面一行 + 总票数 + 投票状态，点开才出选项；投票的
// 乐观更新与防旧数据覆盖与拆分前逐字一致。——
const PollBlock = ({ userCase, sample = false, onNeedCase }) => {
  const { lang } = useLang();
  const L = (zh, tw, en) => (lang === 'en' ? en : lang === 'tw' ? tw : zh);
  const { post, done, busy } = useCommunityPost(userCase, sample, onNeedCase);
  const [open, setOpen] = useState(false);
  const pollKey = CURRENT_POLL.id;
  const [pollAgg, setPollAgg] = useState(null);
  const [voted, setVoted] = useState(() => done(pollKey));
  useEffect(() => {
    if (voted && !pollAgg) {
      fetch(`${API_BASE}/api/community?type=poll&pollId=${pollKey}`).then((r) => r.json()).then(setPollAgg).catch(() => {});
    }
  }, [voted]); // eslint-disable-line react-hooks/exhaustive-deps
  // UI-08：折叠态标题行要显示本题总票数，挂载时先把聚合拉回来（只读，不代表已投票）
  useEffect(() => {
    if (!pollAgg) {
      fetch(`${API_BASE}/api/community?type=poll&pollId=${pollKey}`).then((r) => r.json()).then(setPollAgg).catch(() => {});
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const vote = async (choice) => {
    if (await post({ type: 'poll', pollId: pollKey, choice }, pollKey)) {
      setVoted(true);
      // Optimistic: KV's list index lags writes by up to a minute — the voter must
      // still see their own vote in the bars immediately.
      setPollAgg((prev) => {
        const base = prev || { total: 0, choices: {} };
        return { total: base.total + 1, choices: { ...base.choices, [choice]: (base.choices[choice] || 0) + 1 } };
      });
      fetch(`${API_BASE}/api/community?type=poll&pollId=${pollKey}`).then((r) => r.json())
        .then((data) => setPollAgg((prev) => (data && data.total >= (prev?.total || 0) ? data : prev)))
        .catch(() => {});
    }
  };

  // ---- question of the month ----
  const [qText, setQText] = useState('');
  const [qDone, setQDone] = useState(() => done('question'));

  const card = { background: 'var(--gc-surface)', border: '1px solid var(--gc-rule)', borderRadius: '4px', overflow: 'hidden' };
  return (
    <div>
      <div style={{ ...card, marginBottom: '8px' }}>
        {!open ? (
          <button type="button" onClick={() => setOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '8px', width: '100%', textAlign: 'left',
              background: 'transparent', border: 'none', cursor: 'pointer', padding: '11px 14px',
            }}>
            <span style={{
              fontSize: '13px', fontWeight: 700, color: 'var(--gc-ink)', flex: 1, minWidth: 0,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {CURRENT_POLL.q[lang] || CURRENT_POLL.q.zh}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--gc-muted)', flexShrink: 0 }}>
              {pollAgg ? L(`已投 ${pollAgg.total} 票`, `已投 ${pollAgg.total} 票`, `${pollAgg.total} votes`) : ''}
              {voted
                ? L(' · 已投票，看结果 →', ' · 已投票，看結果 →', ' · voted — results →')
                : L(' · 点开投票 →', ' · 點開投票 →', ' · tap to vote →')}
            </span>
          </button>
        ) : (
          <div style={{ padding: '12px 14px' }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--gc-ink)', marginBottom: '8px' }}>
              {CURRENT_POLL.q[lang] || CURRENT_POLL.q.zh}
            </div>
            {!voted ? (
              <div className="flex" style={{ gap: '8px', flexWrap: 'wrap' }}>
                {CURRENT_POLL.options.map((o) => (
                  <button key={o.id} type="button" disabled={busy === pollKey} onClick={() => vote(o.id)} style={chipStyle(false)}>
                    {o[lang] || o.zh}
                  </button>
                ))}
              </div>
            ) : pollAgg ? (
              <div>
                {CURRENT_POLL.options.map((o) => {
                  const n = pollAgg.choices?.[o.id] || 0;
                  const pct = pollAgg.total ? Math.round((n / pollAgg.total) * 100) : 0;
                  return (
                    <div key={o.id} className="flex items-center" style={{ gap: '8px', padding: '2px 0' }}>
                      <span style={{ fontSize: '12.5px', color: 'var(--gc-ink-soft)', width: '72px', flexShrink: 0 }}>{o[lang] || o.zh}</span>
                      <span style={{ flex: 1, height: '8px', background: 'var(--gc-rule-soft)', borderRadius: '4px', overflow: 'hidden' }}>
                        <span style={{ display: 'block', height: '100%', width: `${pct}%`, background: 'var(--gc-green)' }} />
                      </span>
                      <span className="gc-mono" style={{ fontSize: '12px', color: 'var(--gc-muted)', width: '42px', textAlign: 'right' }}>{pct}%</span>
                    </div>
                  );
                })}
                <div style={{ fontSize: '12px', color: 'var(--gc-muted)', marginTop: '5px' }}>
                  {L(`已投 ${pollAgg.total} 票 · 匿名`, `已投 ${pollAgg.total} 票 · 匿名`, `${pollAgg.total} votes · anonymous`)}
                </div>
              </div>
            ) : <DoneNote>{L('已投票 ✓', '已投票 ✓', 'Voted ✓')}</DoneNote>}
          </div>
        )}
      </div>

      {/* 选题箱（UI-26 定名与预期说明，原文逐字保留） */}
      <div style={{ ...card, padding: '12px 14px', marginBottom: '8px' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gc-ink)', marginBottom: '3px' }}>
          {L('给站长的选题箱', '給站長的選題箱', 'Topic box for the site owner')}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--gc-muted)', lineHeight: 1.55, marginBottom: '6px' }}>
          {L('仅站主可见；好问题会做成内容，不承诺逐条回复。', '僅站主可見；好問題會做成內容，不承諾逐條回覆。', "Only the site owner sees these. Good questions become content — we can't promise a reply to each one.")}
        </div>
        {!qDone ? (
          <div className="flex" style={{ gap: '6px', flexWrap: 'wrap' }}>
            <input value={qText} onChange={(e) => setQText(e.target.value.slice(0, 200))}
              placeholder={L('写一句，会变成后续内容选题', '寫一句，會變成後續內容選題', 'One line — it shapes what we write next')}
              style={{ flex: '1 1 200px', minWidth: 0, fontSize: '13px', padding: '6px 9px', border: '1px solid var(--gc-rule)', borderRadius: '3px', background: 'var(--gc-paper)', color: 'var(--gc-ink)' }} />
            <button type="button" style={submitBtnStyle} disabled={busy === 'question' || qText.trim().length < 4}
              onClick={async () => { if (await post({ type: 'question', text: qText }, 'question')) setQDone(true); }}>
              {L('提交', '提交', 'Send')}
            </button>
          </div>
        ) : <DoneNote>{L('已收到 ✓ 谢谢', '已收到 ✓ 謝謝', 'Received ✓')}</DoneNote>}
      </div>

      {(voted || qDone) && (
        <InlineSubscribeCTA userCase={userCase} label={SUBSCRIBE_LABEL[lang] || SUBSCRIBE_LABEL.zh} />
      )}
    </div>
  );
};

// ============================================================
// Overview - Summary page showing user's status at a glance
// ============================================================
// While the case is still queued, the I-485 card has nothing procedural to show — so it
// shows the thing the subscriber actually watches: how the bulletin moved. Monthly
// signed columns (advance up in blue, retrogression down in red — polarity is carried
// by POSITION relative to the baseline, color is reinforcement) plus one separated,
// direct-labeled cumulative column in green. All marks use theme tokens; identity never
// rides on color alone (the consulate theme's blue and green are the same navy by
// design, so the divider + 「累计」 label do that work there).

// ============================================================
// BulletinTalk — 排期讨论（仿 careerengine 讨论圈）：匿名发帖 + 点赞，
// 最新/最热两个排序。走 /api/community 的 comment/commentLike 类型。
// ============================================================
const BulletinTalk = ({ lang }) => {
  const [sortTab, setSortTab] = useState('new'); // 'new' | 'hot'
  const [talkExpanded, setTalkExpanded] = useState(false); // UI-29：默认折叠，只亮精选一条
  const [data, setData] = useState(null);
  const [msg, setMsg] = useState('');
  const [posting, setPosting] = useState(false);
  // Visible rejection feedback (UI-10): a refused post used to fail silently —
  // the text just sat in the box and the user couldn't tell whether it went up.
  const [postError, setPostError] = useState('');
  const postFailMsg = (status) => {
    if (status === 429) return lang === 'en'
      ? 'Too many posts in a short time — please wait a bit and try again.'
      : lang === 'tw' ? '發布太頻繁——請稍等一會兒再試。' : '发布太频繁——请稍等一会儿再试。';
    if (status === 0) return lang === 'en'
      ? 'Post failed — network error. Please try again.'
      : lang === 'tw' ? '發布失敗——網絡異常，請稍後重試。' : '发布失败——网络异常，请稍后重试。';
    return lang === 'en'
      ? 'Post rejected — it may contain a link, contact details, or a long number. Please edit and try again.'
      : lang === 'tw' ? '發布被拒收——內容可能含連結、聯繫方式或長數字，請修改後重試。' : '发布被拒收——内容可能包含链接、联系方式或长数字，请修改后重试。';
  };
  const [liked, setLiked] = useState(() => {
    try { return new Set(JSON.parse(window.localStorage.getItem('gc_talk_liked') || '[]')); } catch { return new Set(); }
  });
  // 昵称优先级：自己改过的 > 订阅时填的 > 自动生成的游客号。
  // 自动游客号首位只取 1-7 —— 8/9 开头保留给站主的暖场/机器内容（内部约定，
  // 让站主一眼分得清真人和撑场帖）。
  const [guestName, setGuestName] = useState(() => {
    try {
      const own = window.localStorage.getItem('gc_talk_name');
      if (own) return own;
      const nick = window.localStorage.getItem('gc_nickname');
      if (nick) return nick;
      let g = window.localStorage.getItem('gc_talk_guest');
      if (!g) {
        const num = (1 + Math.floor(Math.random() * 7)) * 1000 + Math.floor(Math.random() * 1000);
        g = `${lang === 'en' ? 'Guest' : '游客'}${num}`;
        window.localStorage.setItem('gc_talk_guest', g);
      }
      return g;
    } catch { return lang === 'en' ? 'Guest' : '游客'; }
  });
  const renameGuest = (v) => {
    const clean = v.slice(0, 16);
    setGuestName(clean);
    try { window.localStorage.setItem('gc_talk_name', clean); } catch { /* noop */ }
  };
  const load = () => {
    fetch(`${API_BASE}/api/community?type=comment`).then((r) => r.json()).then(setData).catch(() => {});
  };
  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async () => {
    const text = msg.trim();
    if (text.length < 2 || posting) return;
    setPosting(true);
    try {
      const r = await fetch(`${API_BASE}/api/community`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'comment', message: text, name: guestName.trim() || (lang === 'en' ? 'Guest' : '游客') }),
      });
      if (r.ok) { setMsg(''); setPostError(''); load(); }
      else setPostError(postFailMsg(r.status));
    } catch { setPostError(postFailMsg(0)); }
    setPosting(false);
  };
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyMsg, setReplyMsg] = useState('');
  const submitReply = async (parentId) => {
    const text = replyMsg.trim();
    if (text.length < 2 || posting) return;
    setPosting(true);
    try {
      const r = await fetch(`${API_BASE}/api/community`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'comment', message: text, parentId, name: guestName.trim() || (lang === 'en' ? 'Guest' : '游客') }),
      });
      if (r.ok) { setReplyMsg(''); setReplyingTo(null); setPostError(''); load(); }
      else setPostError(postFailMsg(r.status));
    } catch { setPostError(postFailMsg(0)); }
    setPosting(false);
  };
  const like = async (id) => {
    if (liked.has(id)) return;
    const next = new Set(liked); next.add(id);
    setLiked(next);
    try { window.localStorage.setItem('gc_talk_liked', JSON.stringify([...next])); } catch { /* noop */ }
    // 乐观 +1
    setData((d) => d && { ...d, comments: d.comments.map((c) => (c.id === id ? { ...c, likes: (c.likes || 0) + 1 } : c)) });
    try {
      await fetch(`${API_BASE}/api/community`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'commentLike', id }),
      });
    } catch { /* noop */ }
  };

  const rel = (ts) => {
    const s = Math.max(0, (Date.now() - Date.parse(ts)) / 1000);
    if (s < 3600) return lang === 'en' ? `${Math.max(1, Math.floor(s / 60))}m ago` : `${Math.max(1, Math.floor(s / 60))} 分钟前`;
    if (s < 86400) return lang === 'en' ? `${Math.floor(s / 3600)}h ago` : `${Math.floor(s / 3600)} 小时前`;
    return lang === 'en' ? `${Math.floor(s / 86400)}d ago` : `${Math.floor(s / 86400)} 天前`;
  };
  const avatarColor = (name) => {
    const palette = ['#0e4d2e', '#7a5c2e', '#274060', '#6b3030', '#3d5a4c', '#5c4a72'];
    let h = 0;
    for (const ch of String(name || '?')) h = (h * 31 + ch.charCodeAt(0)) % 997;
    return palette[h % palette.length];
  };

  const allComments = data?.comments || [];
  const repliesOf = {};
  allComments.filter((c) => c.parentId).forEach((c) => { (repliesOf[c.parentId] = repliesOf[c.parentId] || []).push(c); });
  Object.values(repliesOf).forEach((a) => a.sort((x, y) => (x.ts || '').localeCompare(y.ts || '')));
  const items = allComments.filter((c) => !c.parentId);
  if (sortTab === 'hot') items.sort((a, b) => (b.likes || 0) - (a.likes || 0) || (b.ts || '').localeCompare(a.ts || ''));

  // UI-29 精选一条：点赞最高，并列取最新；全无赞时排序自然落到最新一条。
  // 折叠态只把这一条喂给原有渲染（过滤在 map 之前，未选中的根本不进 DOM）。
  const featured = items.length
    ? items.slice().sort((a, b) => (b.likes || 0) - (a.likes || 0) || (b.ts || '').localeCompare(a.ts || ''))[0]
    : null;
  const visibleItems = talkExpanded || !featured ? items : items.filter((c) => c.id === featured.id);

  const replyBox = (targetId, targetName) => (
    <div style={{ marginTop: '5px' }}>
      <textarea value={replyMsg} maxLength={300} rows={2} autoFocus
        placeholder={(lang === 'en' ? 'Reply to ' : '回复 ') + (targetName || (lang === 'en' ? 'Guest' : '游客')) + '…'}
        onChange={(e) => { setReplyMsg(e.target.value); if (postError) setPostError(''); }}
        style={{
          width: '100%', boxSizing: 'border-box', resize: 'vertical', minHeight: '40px',
          padding: '6px 8px', fontSize: '12px', lineHeight: 1.5, color: 'var(--gc-ink)',
          background: 'var(--gc-surface)', border: '1px solid var(--gc-rule)', borderRadius: 'var(--gc-radius-sm)',
        }} />
      <div className="flex items-center justify-end gap-2 mt-1">
        <button type="button" onClick={() => { setReplyingTo(null); setReplyMsg(''); }}
          style={{ padding: '4px 10px', fontSize: '11px', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--gc-muted)' }}>
          {lang === 'en' ? 'Cancel' : '取消'}
        </button>
        <button type="button" onClick={() => submitReply(targetId)} disabled={posting || replyMsg.trim().length < 2}
          style={{
            padding: '4px 14px', fontSize: '11px', fontWeight: 700, border: 'none', borderRadius: '999px', cursor: 'pointer',
            background: replyMsg.trim().length < 2 ? 'var(--gc-rule)' : 'var(--gc-green)', color: 'var(--gc-paper)', opacity: posting ? 0.6 : 1,
          }}>{lang === 'en' ? 'Reply' : '回复'}</button>
      </div>
      {postError && (
        <div role="alert" style={{ fontSize: '11px', lineHeight: 1.5, color: 'var(--gc-red-ink)', marginTop: '4px' }}>
          {postError}
        </div>
      )}
    </div>
  );

  return (
    <div className="mt-2.5 p-2.5 rounded-xl" style={{ border: '1px solid var(--gc-rule-soft)', background: 'var(--gc-surface)' }}>
      <div className="flex items-center justify-between flex-wrap gap-1.5 mb-2">
        <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--gc-ink)' }}>
          {lang === 'en' ? 'Bulletin talk' : lang === 'tw' ? '排期討論' : '排期讨论'}
          {data && (
            <span style={{ fontWeight: 500, color: 'var(--gc-muted)', fontSize: '11px', marginLeft: '6px' }}>
              {lang === 'en' ? `${data.total} posts` : `${data.total} 条`}
            </span>
          )}
        </span>
        {talkExpanded && items.length > 0 && (
          <button type="button" onClick={() => setTalkExpanded(false)}
            style={{ fontSize: '11px', fontWeight: 700, padding: '3px 10px', border: '1px solid var(--gc-rule)', borderRadius: '999px', background: 'var(--gc-surface)', color: 'var(--gc-muted)', cursor: 'pointer' }}>
            {lang === 'en' ? 'Collapse ▴' : '收起 ▴'}
          </button>
        )}
        {talkExpanded && (
        <span className="inline-flex" style={{ border: '1px solid var(--gc-rule)', borderRadius: '999px', overflow: 'hidden' }}>
          {[['new', lang === 'en' ? 'Latest' : '最新'], ['hot', lang === 'en' ? 'Top' : '最热']].map(([id, label], i) => (
            <button key={id} type="button" onClick={() => setSortTab(id)}
              style={{
                fontSize: '11px', fontWeight: 700, padding: '3px 11px', border: 'none', cursor: 'pointer',
                borderLeft: i === 0 ? 'none' : '1px solid var(--gc-rule-soft)',
                background: sortTab === id ? 'var(--gc-green)' : 'var(--gc-surface)',
                color: sortTab === id ? 'var(--gc-paper)' : 'var(--gc-muted)',
              }}>{label}</button>
          ))}
        </span>
        )}
      </div>

      {/* 发帖框 — 只在展开态出现（还没有评论时也出现，让第一条能发）；
          规则条与拒收报错都在框内，折叠不影响 UI-10 的成果 */}
      {(talkExpanded || items.length === 0) && (
      <>
      <div style={{ border: '1px solid var(--gc-rule)', borderRadius: 'var(--gc-radius-sm)', background: 'var(--gc-paper-soft)', padding: '8px' }}>
        <div className="flex items-center gap-2 mb-1.5">
          <span style={{
            width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
            background: avatarColor(guestName), color: '#fff', fontSize: '11px', fontWeight: 700,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>{String(guestName || '?').slice(0, 1).toUpperCase()}</span>
          <input type="text" value={guestName} maxLength={16}
            onChange={(e) => renameGuest(e.target.value)}
            aria-label={lang === 'en' ? 'nickname' : '称呼'}
            style={{
              fontSize: '11.5px', fontWeight: 700, color: 'var(--gc-ink-soft)',
              background: 'transparent', border: 'none', borderBottom: '1px dashed var(--gc-rule)',
              padding: '1px 2px', minWidth: 0, width: '120px', outline: 'none',
            }} />
          <span style={{ fontSize: '11px', color: 'var(--gc-muted)' }}>
            {lang === 'en' ? '(tap to edit)' : '（可改）'}
          </span>
        </div>
        {/* Rules bar (UI-10): the old hint only warned about ads/links — nothing
            told users not to post the case/receipt numbers that identify them,
            and there is no self-serve delete once a post is up. */}
        <div style={{
          fontSize: '11px', lineHeight: 1.5, color: '#92400e',
          background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 'var(--gc-radius-sm)',
          padding: '5px 8px', marginBottom: '6px',
        }}>
          {lang === 'en'
            ? "Please don't post case or receipt numbers, full names, or phone numbers. Others' experiences are not advice for your case."
            : lang === 'tw'
              ? '請勿發布案號、收據號、全名、電話等個資；他人經驗不構成個案建議。'
              : '请勿发布案号、收据号、全名、电话等个人信息；他人经验不构成个案建议。'}
        </div>
        <textarea value={msg} maxLength={300} rows={2}
          placeholder={lang === 'en' ? 'Say something about this bulletin… (no links)' : '聊聊这期排期…（不能带链接/联系方式）'}
          onChange={(e) => { setMsg(e.target.value); if (postError) setPostError(''); }}
          style={{
            width: '100%', boxSizing: 'border-box', resize: 'vertical', minHeight: '48px',
            padding: '7px 9px', fontSize: '12px', lineHeight: 1.5, color: 'var(--gc-ink)',
            background: 'var(--gc-surface)', border: '1px solid var(--gc-rule)', borderRadius: 'var(--gc-radius-sm)',
          }} />
        <div className="flex items-center justify-between mt-1.5">
          <span style={{ fontSize: '11px', color: 'var(--gc-muted)' }}>
            {lang === 'en' ? 'Anonymous · be kind' : '匿名发布 · 文明发言，含链接/联系方式会被拒收'}
          </span>
          <button type="button" onClick={submit} disabled={posting || msg.trim().length < 2}
            style={{
              padding: '5px 16px', fontSize: '11.5px', fontWeight: 700, border: 'none',
              borderRadius: '999px', cursor: 'pointer',
              background: msg.trim().length < 2 ? 'var(--gc-rule)' : 'var(--gc-green)',
              color: 'var(--gc-paper)', opacity: posting ? 0.6 : 1,
            }}>{lang === 'en' ? 'Post' : '发布'}</button>
        </div>
        {postError && (
          <div role="alert" style={{ fontSize: '11px', lineHeight: 1.5, color: 'var(--gc-red-ink)', marginTop: '6px' }}>
            {postError}
          </div>
        )}
      </div>
      </>
      )}

      {/* 评论列表 */}
      {items.length === 0 ? (
        <div style={{ fontSize: '11.5px', color: 'var(--gc-muted)', textAlign: 'center', padding: '14px 0 6px' }}>
          {data === null
            ? (lang === 'en' ? 'Loading…' : '加载中…')
            : (lang === 'en' ? 'No posts yet — be the first.' : '还没有评论——来抢个沙发')}
        </div>
      ) : visibleItems.map((c) => (
        <div key={c.id} className="flex gap-2" style={{ padding: '10px 2px 8px', borderBottom: '1px solid var(--gc-rule-soft)' }}>
          <span style={{
            width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0, marginTop: '1px',
            background: avatarColor(c.name), color: '#fff', fontSize: '12px', fontWeight: 700,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>{String(c.name || '?').slice(0, 1).toUpperCase()}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--gc-ink)' }}>{c.name || (lang === 'en' ? 'Guest' : '游客')}</span>
              {c.cat && <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gc-green-ink)', background: 'var(--gc-green-soft)', borderRadius: '999px', padding: '1px 6px' }}>{c.cat}</span>}
              <span style={{ fontSize: '11px', color: 'var(--gc-muted)' }}>{rel(c.ts)}</span>
            </div>
            <div style={{ fontSize: '12.5px', color: 'var(--gc-ink-soft)', lineHeight: 1.55, marginTop: '2px', wordBreak: 'break-word' }}>{c.message}</div>
            <button type="button" onClick={() => { setReplyingTo(replyingTo === c.id ? null : c.id); setReplyMsg(''); }}
              style={{ marginTop: '3px', padding: 0, border: 'none', background: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 700, color: 'var(--gc-muted)' }}>
              {lang === 'en' ? 'Reply' : lang === 'tw' ? '回覆' : '回复'}{(repliesOf[c.id] || []).length > 0 ? ` · ${(repliesOf[c.id] || []).length}` : ''}
            </button>
            {(repliesOf[c.id] || []).length > 0 && (
              <div style={{ marginTop: '6px', padding: '2px 0 0 9px', borderLeft: '2px solid var(--gc-rule-soft)' }}>
                {(repliesOf[c.id] || []).map((r) => (
                  <div key={r.id} className="flex gap-2" style={{ padding: '5px 0' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gc-ink)' }}>{r.name || (lang === 'en' ? 'Guest' : '游客')}</span>
                        <span style={{ fontSize: '11px', color: 'var(--gc-muted)' }}>{rel(r.ts)}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--gc-ink-soft)', lineHeight: 1.5, marginTop: '1px', wordBreak: 'break-word' }}>
                        {r.replyTo && r.replyTo !== c.name && <span style={{ color: 'var(--gc-green-ink)', fontWeight: 700 }}>@{r.replyTo} </span>}{r.message}
                      </div>
                      <button type="button" onClick={() => { setReplyingTo(r.id); setReplyMsg(''); }}
                        style={{ marginTop: '2px', padding: 0, border: 'none', background: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 700, color: 'var(--gc-muted)' }}>
                        {lang === 'en' ? 'Reply' : lang === 'tw' ? '回覆' : '回复'}
                      </button>
                      {replyingTo === r.id && replyBox(r.id, r.name)}
                    </div>
                    <button type="button" onClick={() => like(r.id)}
                      style={{
                        alignSelf: 'flex-start', flexShrink: 0, padding: '2px 7px', fontSize: '11px', fontWeight: 700,
                        border: `1px solid ${liked.has(r.id) ? 'var(--gc-green)' : 'var(--gc-rule)'}`, borderRadius: '999px',
                        background: liked.has(r.id) ? 'var(--gc-green-soft)' : 'var(--gc-surface)',
                        color: liked.has(r.id) ? 'var(--gc-green-ink)' : 'var(--gc-muted)',
                        cursor: liked.has(r.id) ? 'default' : 'pointer',
                      }}>👍 {r.likes || 0}</button>
                  </div>
                ))}
              </div>
            )}
            {replyingTo === c.id && replyBox(c.id, c.name)}
          </div>
          <button type="button" onClick={() => like(c.id)}
            style={{
              alignSelf: 'flex-start', flexShrink: 0, padding: '3px 8px', fontSize: '11px', fontWeight: 700,
              border: `1px solid ${liked.has(c.id) ? 'var(--gc-green)' : 'var(--gc-rule)'}`, borderRadius: '999px',
              background: liked.has(c.id) ? 'var(--gc-green-soft)' : 'var(--gc-surface)',
              color: liked.has(c.id) ? 'var(--gc-green-ink)' : 'var(--gc-muted)',
              cursor: liked.has(c.id) ? 'default' : 'pointer',
            }}>👍 {c.likes || 0}</button>
        </div>
      ))}

      {/* UI-29 展开/收起行：N = 顶层评论数 */}
      {!talkExpanded && items.length > 0 && (
        <button type="button" onClick={() => setTalkExpanded(true)}
          style={{
            width: '100%', marginTop: '8px', padding: '8px', fontSize: '11.5px', fontWeight: 700,
            color: 'var(--gc-green-ink)', background: 'var(--gc-paper-soft)',
            border: '1px solid var(--gc-rule-soft)', borderRadius: 'var(--gc-radius-sm)', cursor: 'pointer',
          }}>
          {lang === 'en' ? `${items.length} comments in total · Show all` : lang === 'tw' ? `共 ${items.length} 條評論 · 展開全部` : `共 ${items.length} 条评论 · 展开全部`} ▾
        </button>
      )}
      {talkExpanded && items.length > 1 && (
        <button type="button" onClick={() => setTalkExpanded(false)}
          style={{
            width: '100%', marginTop: '8px', padding: '8px', fontSize: '11.5px', fontWeight: 700,
            color: 'var(--gc-muted)', background: 'transparent',
            border: '1px solid var(--gc-rule-soft)', borderRadius: 'var(--gc-radius-sm)', cursor: 'pointer',
          }}>
          {lang === 'en' ? 'Collapse ▴' : '收起 ▴'}
        </button>
      )}
    </div>
  );
};

// ============================================================
// CommunityTeaser — 最新页底部的社区摘要入口（UI-04）。
// BulletinTalk / CommunityHub / CompareHub 此前在最新页与社区页各挂一份，
// 同一评论流与发帖框全站出现两遍。现在社区页是唯一挂载点，最新页只留
// 这一行摘要：讨论条数 + 最近一条动态的开头，点整行去社区页。
// ============================================================

// timelines as evidence — same language as the Overview card.
// ============================================================
// Tone → chip/fill colors. Kept to 3 tones (matches the rest of the app's
// status vocabulary): green = better, red = worse, ink = wash (neutral/minor).
const CH_TONE = {
  'var(--gc-green)': { soft: 'var(--gc-green-soft)', border: 'var(--gc-green-border)' },
  'var(--gc-red)': { soft: 'var(--gc-red-soft)', border: 'var(--gc-red-border)' },
  'var(--gc-ink)': { soft: 'var(--gc-paper-soft)', border: 'var(--gc-rule)' },
};

// One row of the two-row compare: a real duration is a proportional bar; an
// already-current state isn't a point on that duration scale at all (it's a
// categorical "done"), so it gets a solid filled bar with a checkmark instead
// of being squashed into a barely-visible sliver at the "now" end.
const CompareBarRow = ({ label, r, color, zMin, zMax, lang }) => {
  if (r.now) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ fontSize: '11px', color: 'var(--gc-muted)', width: '68px', flexShrink: 0, textAlign: 'right', lineHeight: 1.3 }}>{label}</div>
        <div style={{ flex: 1, height: '16px', borderRadius: '0 4px 4px 0', background: color, display: 'flex', alignItems: 'center', gap: '5px', paddingLeft: '8px' }}>
          <CheckCircle2 size={11} style={{ color: '#fff' }} strokeWidth={2.2} />
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#fff', letterSpacing: '0.01em' }}>
            {lang === 'en' ? 'Available now' : '现在就可推进'}
          </span>
        </div>
      </div>
    );
  }
  if (r.unavailable || r.months == null) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div style={{ fontSize: '11px', color: 'var(--gc-muted)', width: '68px', flexShrink: 0, textAlign: 'right' }}>{label}</div>
        <div style={{ fontSize: '11px', color: 'var(--gc-muted)' }}>{lang === 'en' ? 'No visas this month (U)' : '本月无名额（U）'}</div>
      </div>
    );
  }
  const pct = Math.max(((r.months - zMin) / (zMax - zMin || 1)) * 100, 3);
  const fmtEta = r.months / 12 >= 1.5 ? (lang === 'en' ? `~${(r.months / 12).toFixed(1)} yrs` : `约 ${(r.months / 12).toFixed(1)} 年`)
    : (lang === 'en' ? `~${Math.max(Math.round(r.months), 1)} mo` : `约 ${Math.max(Math.round(r.months), 1)} 个月`);
  const fmtYM2 = r.eta ? (lang === 'en' ? r.eta.toLocaleDateString('en-US', { year: 'numeric', month: 'short' }) : `${r.eta.getFullYear()}年${r.eta.getMonth() + 1}月`) : '';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ fontSize: '11px', color: 'var(--gc-muted)', width: '68px', flexShrink: 0, textAlign: 'right', lineHeight: 1.3 }}>{label}</div>
      <div style={{ flex: 1, height: '16px', background: 'var(--gc-paper-soft)', borderRadius: '0 4px 4px 0', position: 'relative', overflow: 'hidden' }}>
        {zMin > 0 && (
          <span style={{ position: 'absolute', left: '2px', top: 0, bottom: 0, width: '4px', zIndex: 2,
            background: 'repeating-linear-gradient(-55deg, var(--gc-paper-soft), var(--gc-paper-soft) 1.5px, var(--gc-muted-soft) 1.5px, var(--gc-muted-soft) 3px)' }} />
        )}
        <div style={{ position: 'relative', height: '100%', width: `${pct}%`, background: color, borderRadius: '0 4px 4px 0' }} />
      </div>
      <div className="gc-mono" style={{ fontSize: '11px', fontWeight: 700, color, whiteSpace: 'nowrap', flexShrink: 0 }}>
        {fmtEta}{fmtYM2 ? ` · ${fmtYM2}` : ''}
      </div>
    </div>
  );
};

// Two aligned bars sharing one baseline/scale — the length gap IS the point for
// a big difference. For a genuinely close pair (< 20% apart), 0..max makes the
// real gap disappear visually, so the track zooms to just the gap between them
// instead; the diagonal break mark is the standard "axis doesn't start at zero"
// tell, and the delta line below still states the honest number either way.
const CompareRows = ({ rowA, rowB, lang }) => {
  const aM = rowA.r.now ? 0 : (rowA.r.months ?? null);
  const bM = rowB.r.now ? 0 : (rowB.r.months ?? null);
  if (aM == null || bM == null) {
    return (
      <div style={{ marginTop: '9px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
        <CompareBarRow label={rowA.label} r={rowA.r} color={rowA.color} zMin={0} zMax={1} lang={lang} />
        <CompareBarRow label={rowB.label} r={rowB.r} color={rowB.color} zMin={0} zMax={1} lang={lang} />
      </div>
    );
  }
  const maxM = Math.max(aM, bM, 1);
  const bothReal = !rowA.r.now && !rowB.r.now;
  const relDelta = Math.abs(aM - bM) / maxM;
  const zoom = bothReal && relDelta > 0 && relDelta < 0.2;
  const zMin = zoom ? Math.min(aM, bM) * 0.85 : 0;
  const zMax = zoom ? Math.max(aM, bM) * 1.15 : maxM;

  const dm = aM - bM; // positive = row B is faster
  const dAbs = Math.abs(dm);
  const deltaTxt = dAbs < 1
    ? (lang === 'en' ? 'Almost no difference (< 1 mo)' : '几乎没有差异（< 1 个月）')
    : (() => {
        const pct = Math.round(dAbs / maxM * 100);
        const mTxt = dAbs >= 18 ? (lang === 'en' ? `~${(dAbs / 12).toFixed(1)} yrs` : `约 ${(dAbs / 12).toFixed(1)} 年`) : (lang === 'en' ? `~${Math.round(dAbs)} mo` : `约 ${Math.round(dAbs)} 个月`);
        return dm > 0
          ? (lang === 'en' ? `${pct}% apart · faster by ${mTxt}` : `相差 ${pct}% · 快 ${mTxt}`)
          : (lang === 'en' ? `${pct}% apart · slower by ${mTxt}` : `相差 ${pct}% · 慢 ${mTxt}`);
      })();
  const deltaColor = dAbs < 1 ? 'var(--gc-muted)' : dm > 0 ? 'var(--gc-green)' : 'var(--gc-red)';

  return (
    <div style={{ marginTop: '9px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        <CompareBarRow label={rowA.label} r={rowA.r} color={rowA.color} zMin={zMin} zMax={zMax} lang={lang} />
        <CompareBarRow label={rowB.label} r={rowB.r} color={rowB.color} zMin={zMin} zMax={zMax} lang={lang} />
      </div>
      <div style={{ fontSize: '11px', fontWeight: 700, color: deltaColor, margin: '5px 0 0 76px' }}>
        {deltaTxt}
        {zoom && <span style={{ fontWeight: 600, color: 'var(--gc-muted)' }}>{lang === 'en' ? ' · bars zoomed to show the gap' : ' · 条形已局部放大，便于看清差距'}</span>}
      </div>
      <div className="flex items-center justify-between" style={{ fontSize: '11px', color: 'var(--gc-muted-soft)', marginTop: '2px', marginLeft: '76px' }}>
        <span>{zoom ? (lang === 'en' ? 'zoomed' : '局部放大') : (lang === 'en' ? 'today' : '今天')}</span>
        <span>{lang === 'en' ? `~${(maxM / 12).toFixed(1)} yrs out` : `约 ${(maxM / 12).toFixed(1)} 年后`}</span>
      </div>
    </div>
  );
};

const CompareHub = ({ userCase }) => {
  const { lang, t } = useLang();
  const [openRule, setOpenRule] = useState(null); // index of the card whose rule is open

  // Zero choices: everything below is auto-computed from the user's own case, on the
  // adopted chart. The three-scenario picker version confused its one real user —
  // an answer page beats a tool page here. (The old Comparison/CompareByCountry
  // shell was unreachable and was removed in UI-05.)
  const chartSel = FILING_AUTHORIZED[userCase.category] ? 'B' : 'A';
  const chartKey = chartSel === 'B' ? 'filing' : 'finalAction';

  const etaFor = (cat, country) => {
    const rc = resolveCountry(country);
    const cutoff = bulletinCurrent[chartKey]?.[cat]?.[rc];
    const st = computeStatus(userCase.priorityDate, cutoff);
    if (cutoff === 'C' || ['current', 'eligible', 'overdue'].includes(st.status)) return { now: true, months: 0 };
    if (st.days === null) return { unavailable: true, months: null };
    const cal = paceDaysToCalendar(cat, rc, st.days, chartKey);
    return { months: cal / 30.44, eta: new Date(Date.now() + cal * 86400000) };
  };
  const diffText = (m) => Math.abs(m) / 12 >= 1
    ? `${(Math.abs(m) / 12).toFixed(1)} ${lang === 'en' ? 'yrs' : '年'}`
    : `${Math.round(Math.abs(m))} ${lang === 'en' ? 'mo' : '个月'}`;
  const catLabel = t?.[userCase.category.toLowerCase()] || userCase.category;

  // Ordered slots: [cross-chargeability OR pool] then [category move OR "not applicable"].
  // A slot that doesn't apply renders as a slim ghost row instead of vanishing —
  // the page should look like it checked everything, not like it ran out of content.
  const cards = [];
  let catMoveGhost = null; // set below if there's no adjacent-category move for this case

  if (userCase.country !== 'Taiwan') {
    const mine = etaFor(userCase.category, userCase.country);
    const row = etaFor(userCase.category, 'Taiwan');
    const d = (mine.months ?? 0) - (row.months ?? 0);
    const big = (row.now && !mine.now) || d > 1;
    cards.push({
      icon: Users,
      title: lang === 'en' ? "Spouse's birth country" : '配偶出生地',
      badge: row.now && !mine.now ? (lang === 'en' ? 'now' : '现在就可') : d > 1 ? (lang === 'en' ? 'faster' : '可提前') : (lang === 'en' ? 'minor' : '影响不大'),
      verdict: row.now && !mine.now
        ? (lang === 'en' ? 'Charged to a ROW-born spouse, you could proceed NOW.' : '按配偶的出生国（非积压国）计，你现在就可推进。')
        : d > 1
          ? (lang === 'en' ? `Marrying/married to someone born outside China·India etc. saves about ${diffText(d)}.` : `按配偶的出生国计，约可提前 ${diffText(d)}。`)
          : (lang === 'en' ? 'Right now this would not change your wait much.' : '目前这样做对你的等待影响不大。'),
      tone: big ? 'var(--gc-green)' : 'var(--gc-ink)',
      rows: [
        { label: lang === 'en' ? 'As is' : '现状', r: mine, color: 'var(--gc-blue)' },
        { label: lang === 'en' ? 'Via spouse' : '按配偶出生国', r: row, color: big ? 'var(--gc-green)' : 'var(--gc-muted)' },
      ],
      rule: lang === 'en'
        ? "Cross-chargeability, INA §202(b)(2): when spouses immigrate together, the case may be charged to either spouse's country of birth. Consult a lawyer for specifics."
        : '交叉归属（INA §202(b)(2)）：夫妻一同移民时，案件可计入任一方的出生国配额，两人都按更快的那国排期。细节请咨询律师。',
    });
  } else {
    cards.push({
      icon: CheckCircle2,
      title: lang === 'en' ? 'Your quota pool' : '你的配额池',
      badge: lang === 'en' ? 'optimal' : '无需操作',
      verdict: lang === 'en' ? 'You are already in the fastest (ROW) pool — a spouse\'s birth country cannot speed this up.' : '你已在最快的全球配额池——配偶出生地无法再加速。',
      tone: 'var(--gc-green)', rows: null, rule: null,
    });
  }

  const catMove = {
    F2A: { to: 'IR', title: lang === 'en' ? 'Spouse naturalizes' : '配偶入籍',
      rule: lang === 'en' ? 'Spouses of U.S. citizens are Immediate Relatives: no quota, no bulletin. The upgrade is automatic on naturalization.' : '公民配偶属直系亲属（IR）：不占配额、不用等公告。担保人入籍后自动升级，通知 USCIS 即可。' },
    F2B: { to: 'F1', title: lang === 'en' ? 'Parent naturalizes' : '父母入籍',
      rule: lang === 'en' ? 'F2B auto-converts to F1 on naturalization. If F1 is SLOWER for your country, CSPA §6 lets you opt out in writing and stay in F2B.' : 'F2B 在父母入籍后自动转 F1。若你的国家 F1 反而更慢，CSPA 第 6 条允许书面 opt-out 留在 F2B。' },
    EB2: { to: 'EB3', title: lang === 'en' ? 'Downgrade to EB-3' : '降级到 EB-3',
      rule: lang === 'en' ? 'File a new I-140 under EB-3 with the same PERM and keep your original priority date (8 CFR 204.5(e)).' : '用同一份 PERM 重递 EB-3 的 I-140，原优先日保留（8 CFR 204.5(e)）。' },
    EB3: { to: 'EB2', title: lang === 'en' ? 'Upgrade to EB-2' : '升级到 EB-2',
      rule: lang === 'en' ? 'Same mechanism in reverse; priority date retention applies if the original I-140 was approved.' : '同一机制反向操作；只要原 I-140 获批过，优先日同样保留。' },
  }[userCase.category];

  if (catMove) {
    const from = etaFor(userCase.category, userCase.country);
    const to = catMove.to === 'IR' ? { now: true, months: 0 } : etaFor(catMove.to, userCase.country);
    const d = (from.months ?? 0) - (to.months ?? 0);
    const good = catMove.to === 'IR' || d > 1;
    const bad = d < -1;
    cards.push({
      icon: RefreshCw,
      title: catMove.title,
      badge: catMove.to === 'IR' ? (lang === 'en' ? 'now' : '现在就可') : good ? (lang === 'en' ? 'faster' : '可提前') : bad ? (lang === 'en' ? 'slower' : '会变慢') : (lang === 'en' ? 'minor' : '影响不大'),
      verdict: catMove.to === 'IR'
        ? (lang === 'en' ? 'You would become an Immediate Relative — no bulletin wait at all.' : '你将升级为直系亲属——完全不用再等公告。')
        : d > 1
          ? (lang === 'en' ? `The switch saves about ${diffText(d)}.` : `转换后约可提前 ${diffText(d)}。`)
          : d < -1
            ? (lang === 'en' ? `Careful — the new category is slower by ~${diffText(d)}. Consider opting out.` : `注意：新类别反而慢约 ${diffText(d)}——可考虑 opt-out 留在原类别。`)
            : (lang === 'en' ? 'Both categories are about the same right now.' : '两个类别目前差别不大。'),
      tone: good ? 'var(--gc-green)' : bad ? 'var(--gc-red)' : 'var(--gc-ink)',
      rows: [
        { label: userCase.category, r: from, color: 'var(--gc-blue)' },
        { label: catMove.to === 'IR' ? (lang === 'en' ? 'IR' : '直系亲属') : catMove.to, r: to, color: good ? 'var(--gc-green)' : bad ? 'var(--gc-red)' : 'var(--gc-muted)' },
      ],
      rule: catMove.rule,
    });
  } else {
    catMoveGhost = lang === 'en'
      ? `${catLabel} has no adjacent category with an automatic conversion or speed-up.`
      : `${catLabel} 没有可自动转换或提速的邻近类别。`;
  }

  return (
    <div className="space-y-2">
      <div style={{ padding: '4px 0 0' }}>
        <div className="gc-eyebrow" style={{ color: 'var(--gc-green)' }}>{lang === 'en' ? 'WHAT IF' : '如果'}</div>
        <h2 className="gc-serif" style={{ fontSize: '20px', fontWeight: 700, color: 'var(--gc-ink)', margin: '2px 0 2px' }}>
          {lang === 'en' ? 'Would this make you faster' : '这样做会不会更快'}
        </h2>
        <p style={{ fontSize: '12px', color: 'var(--gc-muted)', margin: 0 }}>
          {lang === 'en'
            ? `Auto-computed from your case (${userCase.category} · PD ${formatDate(userCase.priorityDate, lang)}). Nothing to configure.`
            : `已根据你的案子（${userCase.category} · 优先日 ${formatDate(userCase.priorityDate, lang)}）自动算好，无需任何设置。`}
        </p>
      </div>
      {cards.map((c, i) => {
        const t = CH_TONE[c.tone];
        const Icon = c.icon;
        return (
          <React.Fragment key={i}>
            <div style={{ background: 'var(--gc-surface)', border: '1px solid var(--gc-rule)', borderLeft: `2px solid ${c.tone}`, borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ padding: '11px 14px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0 }}>
                  <Icon size={15} style={{ color: c.tone, flexShrink: 0 }} strokeWidth={1.8} />
                  <span className="gc-serif" style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gc-ink)' }}>{c.title}</span>
                </div>
                <span className="gc-eyebrow" style={{ fontSize: '11px', fontWeight: 700, color: c.tone, border: `1px solid ${t.border}`, background: t.soft, borderRadius: '2px', padding: '2px 6px', letterSpacing: '0.08em', flexShrink: 0 }}>
                  {c.badge}
                </span>
              </div>
              <div style={{ padding: '8px 14px 12px' }}>
                <div className="gc-serif" style={{ fontSize: '16px', fontWeight: 700, lineHeight: 1.35, color: c.tone }}>{c.verdict}</div>
                {c.rows && <CompareRows rowA={c.rows[0]} rowB={c.rows[1]} lang={lang} />}
                {c.rule && (
                  <>
                    <button type="button" onClick={() => setOpenRule(openRule === i ? null : i)}
                      style={{ border: 'none', background: 'transparent', padding: 0, cursor: 'pointer', fontSize: '11px', color: 'var(--gc-green)', textDecoration: 'underline', textUnderlineOffset: '2px', fontWeight: 600, marginTop: '8px' }}>
                      {openRule === i ? (lang === 'en' ? 'hide the rule' : '收起规则') : (lang === 'en' ? 'which rule allows this?' : '依据什么规则？')}
                    </button>
                    {openRule === i && (
                      <div style={{ fontSize: '11px', lineHeight: 1.7, color: 'var(--gc-ink-soft)', background: 'var(--gc-paper-soft)', border: '1px solid var(--gc-rule-soft)', borderRadius: '3px', padding: '8px 10px', marginTop: '6px' }}>
                        {c.rule}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </React.Fragment>
        );
      })}
      {catMoveGhost && (
        <div style={{ padding: '10px 12px', background: 'transparent', border: '1px dashed var(--gc-rule-soft)', borderRadius: '3px', display: 'flex', alignItems: 'center', gap: '10px', opacity: 0.8 }}>
          <Lock size={15} style={{ color: 'var(--gc-muted-soft)', flexShrink: 0 }} strokeWidth={1.8} />
          <div style={{ fontSize: '12px', color: 'var(--gc-muted)', lineHeight: 1.4 }}>{catMoveGhost}</div>
        </div>
      )}
      <p style={{ fontSize: '11px', color: 'var(--gc-muted)', lineHeight: 1.6, margin: '4px 2px 0' }}>
        {lang === 'en'
          ? 'Estimates use the same 12-month real pace as the Overview. Individual cases vary — talk to a lawyer before acting.'
          : '估算与总结页同口径（近 12 个月实速）。个案有差异，行动前请咨询律师。'}
      </p>
    </div>
  );
};

// ============================================================
// CommunityPage — 「社区」tab。
// UI-16「一门三段」（取代 2026-09-23 的先人后表排序中 ③④ 两段的组织）：
//   段1 同路人进度 — Tracker 置顶，其下「报一条你的数据」卡组：
//      时间线/RFE（CrowdReportForms，自个人页迁入）+ 换类别/费用调查
//   段2 聊聊 — BulletinTalk 评论 + 打卡墙，两块分开、不并流
//   段3 每月一题 — PollBlock（poll + 选题箱）
// CompareHub「如果」仍收在页底默认收起的 <details> 里，未动。
// ============================================================
const CommunityPage = ({ userCase, sample = false, onNeedCase }) => {
  const { lang } = useLang();
  const [summary, setSummary] = useState(null);
  return (
    <div className="space-y-3">
      <div style={{ padding: '4px 0 0' }}>
        <div className="gc-eyebrow" style={{ color: 'var(--gc-green)' }}>{lang === 'en' ? 'COMMUNITY' : lang === 'tw' ? '社區' : '社区'}</div>
        <h2 className="gc-serif" style={{ fontSize: '22px', fontWeight: 700, color: 'var(--gc-ink)', margin: '2px 0 4px' }}>
          {lang === 'en' ? "You're not doing this alone" : lang === 'tw' ? '你不是一個人在等' : '你不是一个人在等'}
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--gc-muted)', margin: 0 }}>
          {summary?.totalCases
            ? (lang === 'en' ? `${summary.totalCases} people have logged their case here · anonymous, no email or case number`
              : lang === 'tw' ? `${summary.totalCases} 個人在這裡登記了案子 · 全部匿名，不收郵箱和案號`
              : `${summary.totalCases} 个人在这里登记了案子 · 全部匿名，不收邮箱和案号`)
            : (lang === 'en' ? 'Anonymous and crowd-sourced — no email, no case number.' : lang === 'tw' ? '全部匿名眾包——不收郵箱，不收案號。' : '全部匿名众包——不收邮箱，不收案号。')}
        </p>
      </div>

      {/* ——— 段1 同路人进度 ——— */}
      <SectionHead zh="同路人进度" tw="同路人進度" en="FELLOW APPLICANTS' PROGRESS" />
      <Suspense fallback={<ChunkFallback />}><TrackerPage userCase={userCase} sample={sample} onNeedCase={onNeedCase} onSummary={setSummary} /></Suspense>
      <div style={{ margin: '2px 0 0' }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--gc-ink)' }}>
          {lang === 'en' ? 'Report your data' : lang === 'tw' ? '報一條你的數據' : '报一条你的数据'}
        </span>
        <span style={{ fontSize: '11.5px', color: 'var(--gc-muted)', marginLeft: '8px' }}>
          {lang === 'en' ? 'the wall and the medians above exist because people report theirs' : lang === 'tw' ? '上面的牆和中位數，就靠大家一條條報出來' : '上面的墙和中位数，就靠大家一条条报出来'}
        </span>
      </div>
      <CrowdReportForms userCase={userCase} sample={sample} onNeedCase={onNeedCase} />
      <ReportSurveys userCase={userCase} sample={sample} onNeedCase={onNeedCase} />

      {/* ——— 段2 聊聊 ——— */}
      <SectionHead zh="聊聊" tw="聊聊" en="TALK IT OUT" />
      <BulletinTalk lang={lang} />
      <WallBlock userCase={userCase} sample={sample} onNeedCase={onNeedCase} />

      {/* ——— 段3 每月一题 ——— */}
      <SectionHead zh="每月一题" tw="每月一題" en="ONE QUESTION A MONTH" />
      <PollBlock userCase={userCase} sample={sample} onNeedCase={onNeedCase} />

      <details style={{ border: '1px solid var(--gc-rule)', borderRadius: '4px', background: 'var(--gc-surface)', padding: '10px 12px' }}>
        <summary style={{ cursor: 'pointer', fontSize: '13px', fontWeight: 700, color: 'var(--gc-ink-soft)', listStyle: 'revert' }}>
          {lang === 'en' ? 'What if I switch category or status?' : lang === 'tw' ? '如果換類別、換身份會更快嗎' : '如果换类别、换身份会更快吗'}
          <span style={{ fontWeight: 400, color: 'var(--gc-muted)' }}>{lang === 'en' ? ' · auto-computed comparison' : lang === 'tw' ? ' · 展開看自動算好的對比' : ' · 展开看自动算好的对比'}</span>
        </summary>
        <div style={{ height: '8px' }} />
        <CompareHub userCase={userCase} />
      </details>
    </div>
  );
};


export default CommunityPage;
