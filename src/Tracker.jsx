// ============================================================
// TrackerPage — 众案件进度墙（挂在「动态」tab 内）
//
// 后端：functions/api/tracker.js + D1 表 cases（见 d1/tracker-schema.sql）。
// K_MIN、日期粗化、中位数全部在后端算好才发回来——这里只负责渲染，
// 不会拿到任何人的原始逐条记录（自己的记录除外）。
//
// 设计主轴：**所有互动发生在「批次」上，不发生在「个人」上。**
// 社区感和不泄漏个人信息走的是同一条路——参考 Trackitt 按 receipt 月份分串、
// Levels.fyi 的 give-to-get、Glassdoor 的样本门槛。
// TRACKER-PLAN.md 末尾那十条建议，编号与本文件的 ① ~ ⑩ 注释一一对应。
//
// 配色刻意写死不跟主题变量走：站上有报纸米色和领事馆藏青两套主题，
// 分享卡跟着主题变会让同一张卡在两个人手机上长得不一样。
// ============================================================
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Download, Users, ChevronLeft, CheckCircle2, PartyPopper, Lock, Mail, RefreshCw } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || '';

// 与 functions/api/tracker.js 的枚举保持一致——改一处记得改另一处
const CATS = ['EB1', 'EB2', 'EB3', 'EW', 'EB4', 'EB5', 'F1', 'F2A', 'F2B', 'F3', 'F4'];
const COUNTRIES = ['China', 'India', 'Taiwan', 'Mexico', 'Philippines', 'Other'];
const CENTERS = ['NSC', 'TSC', 'Potomac', 'MSC', 'other-center', 'guangzhou', 'other-consulate', 'unknown'];

const CAT_LABEL = {
  EB1: 'EB-1 杰出人才', EB2: 'EB-2 高学历', EB3: 'EB-3 技术工', EW: 'EB-3 其他工人',
  EB4: 'EB-4 特殊移民', EB5: 'EB-5 投资移民',
  F1: 'F1 公民成年子女', F2A: 'F2A 绿卡配偶子女', F2B: 'F2B 绿卡成年子女',
  F3: 'F3 公民已婚子女', F4: 'F4 公民兄弟姐妹',
};
const COUNTRY_LABEL = {
  China: '中国大陆', India: '印度', Taiwan: '台湾', Mexico: '墨西哥',
  Philippines: '菲律宾', Other: '其他/全球',
};
const CENTER_LABEL = {
  NSC: 'NSC 内布拉斯加', TSC: 'TSC 德州', Potomac: 'Potomac', MSC: 'MSC 密苏里',
  'other-center': '其他中心', guangzhou: '广州领事馆', 'other-consulate': '其他领事馆',
  unknown: '不确定',
};

const STEPS = [
  { key: 'filed', label: '递交' },
  { key: 'receipt', label: '收件' },
  { key: 'bio', label: '指纹' },
  { key: 'intSched', label: '面试排期' },
  { key: 'interview', label: '面试' },
  { key: 'approved', label: '批准' },
];

const MIN_PD = '2005-01-01';
const TODAY = new Date().toISOString().slice(0, 10);
const K_MIN = 5;   // ③ 只用于文案措辞；真正的门槛判断（enough/needMore）来自后端

const OWNER_KEY = 'gc_tracker_owner_id';
const getOrCreateOwnerId = () => {
  try {
    let id = window.localStorage.getItem(OWNER_KEY);
    if (!id) {
      id = (crypto.randomUUID && crypto.randomUUID()) || `o${Date.now()}${Math.random().toString(36).slice(2)}`;
      window.localStorage.setItem(OWNER_KEY, id);
    }
    return id;
  } catch {
    return `o${Date.now()}${Math.random().toString(36).slice(2)}`;
  }
};

// ============================================================
// ① 批次标签：优先日所在季度 + 类别 + 出生地。只用于展示"我自己"会落进哪一批，
//    不涉及任何他人数据，所以留在前端算没问题。
// ============================================================
const quarterOf = (d) => `${d.slice(0, 4)}Q${Math.floor((+d.slice(5, 7) - 1) / 3) + 1}`;
const batchName = (pd) => `${pd.slice(0, 4)} 年 Q${quarterOf(pd).slice(-1)}`;
const batchFull = (f) => `${batchName(f.priorityDate)} · ${CAT_LABEL[f.cat] || f.cat} · ${COUNTRY_LABEL[f.country] || f.country}`;

// 自己当前走到哪一步——只读自己的 dates，不是聚合，前端算没问题
const myStageIdx = (dates) => {
  let k = -1;
  STEPS.forEach((s, i) => { if (dates?.[s.key]) k = i; });
  return k;
};

// 卡面配色（写死）
const C = {
  paper: '#f6f2e8', surface: '#fdfcf7', ink: '#111418', inkSoft: '#3a3f45',
  muted: '#6b6f75', rule: '#d6cfbb', green: '#0e4d2e', greenInk: '#0a3a23',
  greenFill: '#c8dbc9', amber: '#8a5a00', amberFill: '#e9d79a',
};
const CARD_FONT = '"PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans SC",system-ui,sans-serif';
const CARD_SERIF = '"Songti SC","Iowan Old Style",Palatino,Georgia,serif';

const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
const monthsSince = (d) => Math.max(0, Math.round(daysBetween(d, TODAY) / 30.44));

// ============================================================
// ⑧ 进度卡 —— 1080×1440（3:4 小红书竖版），主角是批次不是我自己
//
// 坑（照抄 App.jsx 里 ShareCardModal 已验证过的做法）：
// SVG 序列化后喂给 new Image() 时外部字体和 CSS 全部失效，所以这里
// 只能用 <text> + 系统字体族，不能用 foreignObject、不能用 Tailwind class。
// ============================================================
const W = 1080, H = 1440;

const ProgressCardSVG = React.forwardRef(({ me, b }, ref) => {
  const rows = STEPS.map((s) => ({ ...s, date: me.dates?.[s.key] || null }));
  const curIdx = rows.reduce((acc, r, i) => (r.date ? i : acc), -1);
  const tl = { top: 706, gap: 96 };

  // 数字用 86px 大字号，基线定太靠上会让字顶穿掉上面那条格子边框——86px 字体
  // 的上伸部分大概有 65px，基线必须比框顶（468）再往下至少 65+padding 才够。
  const bigNum = (x, val, unit, label, sub) => (
    <g key={label}>
      <text x={x} y={548} textAnchor="middle" fontFamily={CARD_SERIF} fontSize="86" fontWeight="700" fill={C.greenInk}>
        {val}<tspan fontSize="34" fontFamily={CARD_FONT} fontWeight="600" dx="4">{unit}</tspan>
      </text>
      <text x={x} y={594} textAnchor="middle" fontFamily={CARD_FONT} fontSize="27" fontWeight="600" fill={C.inkSoft}>{label}</text>
      <text x={x} y={624} textAnchor="middle" fontFamily={CARD_FONT} fontSize="21" fill={C.muted}>{sub}</text>
    </g>
  );

  return (
    <svg ref={ref} xmlns="http://www.w3.org/2000/svg" width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <rect width={W} height={H} fill={C.paper} />
      <rect x="40" y="40" width={W - 80} height={H - 80} fill={C.surface} stroke={C.rule} strokeWidth="2" />

      <rect x="40" y="40" width={W - 80} height="112" fill={C.green} />
      <text x="80" y="112" fontFamily={CARD_SERIF} fontSize="44" fontWeight="700" fill={C.paper}>绿卡晴雨表 · 进度墙</text>
      <text x={W - 80} y="110" textAnchor="end" fontFamily={CARD_FONT} fontSize="24" fill={C.greenFill}>gc.jmjvc.us</text>

      {/* 主角是批次 */}
      <text x="80" y="238" fontFamily={CARD_SERIF} fontSize="62" fontWeight="700" fill={C.ink}>{b.short} 这一批</text>
      <text x="80" y="296" fontFamily={CARD_FONT} fontSize="30" fill={C.inkSoft}>
        {CAT_LABEL[me.cat] || me.cat} · {COUNTRY_LABEL[me.country] || me.country} · 共 {b.total} 人在墙上
      </text>
      <line x1="80" y1="336" x2={W - 80} y2="336" stroke={C.rule} strokeWidth="2" />

      <text x="80" y="392" fontFamily={CARD_FONT} fontSize="27" fill={C.muted}>我在这一批里</text>
      <text x="80" y="446" fontFamily={CARD_SERIF} fontSize="52" fontWeight="700" fill={C.greenInk}>
        排第 {b.rank} 位
      </text>
      <text x={W - 80} y="446" textAnchor="end" fontFamily={CARD_FONT} fontSize="30" fill={C.inkSoft}>
        已等 {monthsSince(me.priorityDate)} 个月
      </text>

      <rect x="80" y="468" width={W - 160} height="176" fill={C.paper} stroke={C.rule} strokeWidth="1.5" />
      {b.enough ? (
        <>
          {bigNum(255, b.total, '人', '同批人数', `${b.short} 优先日`)}
          {bigNum(540, b.medianWait ?? '—', '月', '这批中位等待', '不是平均数')}
          {/* 批准写人数不写百分比：一个都没批时 0% 太难看，人数是 0 人反而正常 */}
          {bigNum(825, b.approvedN, '人', '这批已批准', `${b.total} 人里`)}
          <line x1="397" y1="526" x2="397" y2="620" stroke={C.rule} strokeWidth="1.5" />
          <line x1="683" y1="526" x2="683" y2="620" stroke={C.rule} strokeWidth="1.5" />
        </>
      ) : (
        <>
          {bigNum(330, b.total, '人', '同批人数', `${b.short} 优先日`)}
          <line x1="540" y1="526" x2="540" y2="620" stroke={C.rule} strokeWidth="1.5" />
          <text x="760" y="544" textAnchor="middle" fontFamily={CARD_SERIF} fontSize="44" fontWeight="700" fill={C.amber}>
            还差 {b.needMore} 人
          </text>
          <text x="760" y="594" textAnchor="middle" fontFamily={CARD_FONT} fontSize="26" fontWeight="600" fill={C.inkSoft}>这批就凑齐了</text>
          <text x="760" y="624" textAnchor="middle" fontFamily={CARD_FONT} fontSize="21" fill={C.muted}>把这张卡发给同批的人</text>
        </>
      )}

      <text x="80" y={tl.top - 34} fontFamily={CARD_FONT} fontSize="27" fontWeight="600" fill={C.inkSoft}>我的时间轴</text>
      <line x1="112" y1={tl.top} x2="112" y2={tl.top + tl.gap * (STEPS.length - 1)} stroke={C.rule} strokeWidth="4" />
      {curIdx > 0 && <line x1="112" y1={tl.top} x2="112" y2={tl.top + tl.gap * curIdx} stroke={C.green} strokeWidth="4" />}
      {rows.map((r, i) => {
        const y = tl.top + tl.gap * i;
        const done = !!r.date;
        return (
          <g key={r.key}>
            <circle cx="112" cy={y} r={done ? 17 : 12} fill={done ? C.green : C.surface} stroke={done ? C.green : C.rule} strokeWidth="4" />
            <text x="168" y={y + 13} fontFamily={CARD_FONT} fontSize="34" fontWeight={done ? 700 : 500} fill={done ? C.ink : C.muted}>{r.label}</text>
            <text x={W - 80} y={y + 13} textAnchor="end" fontFamily={CARD_SERIF} fontSize="34" fontWeight={done ? 700 : 400} fill={done ? C.greenInk : C.muted}>
              {r.date || '待走'}
            </text>
            {done && i > 0 && rows[0].date && (
              <text x={W - 80} y={y + 46} textAnchor="end" fontFamily={CARD_FONT} fontSize="20" fill={C.muted}>
                递交后 {daysBetween(rows[0].date, r.date)} 天
              </text>
            )}
          </g>
        );
      })}

      <line x1="80" y1={H - 148} x2={W - 80} y2={H - 148} stroke={C.rule} strokeWidth="2" />
      <text x="80" y={H - 100} fontFamily={CARD_FONT} fontSize="23" fill={C.muted}>
        用户自报数据，非官方统计{b.fresh !== null ? ` · 这批${b.fresh === 0 ? '今天' : ` ${b.fresh} 天前`}刚有人更新` : ''}
      </text>
      <text x="80" y={H - 64} fontFamily={CARD_FONT} fontSize="23" fontWeight="600" fill={C.green}>
        gc.jmjvc.us · 填一张表，加入你自己那一批
      </text>
    </svg>
  );
});

// ============================================================
// ⑦ 匿名喜报广播 —— 排队的人需要看见队伍在动。
//    直接吃后端算好的 ticker，只到批次粒度，别的字段一个都不带。
// ============================================================
const ApprovalTicker = ({ ticker }) => {
  if (!ticker || !ticker.length) return null;
  return (
    <div style={{ background: 'var(--gc-green-soft)', border: '1px solid var(--gc-green-border)', borderRadius: '4px', padding: '12px 14px', marginBottom: '10px' }}>
      <p className="flex items-center gap-1.5" style={{ fontSize: '12px', fontWeight: 700, color: 'var(--gc-green-ink)', marginBottom: '7px' }}>
        <PartyPopper size={13} /> 最近的好消息
      </p>
      {ticker.map((t, i) => (
        <p key={i} style={{ fontSize: '13px', color: 'var(--gc-ink-soft)', lineHeight: 1.7 }}>
          <b className="gc-mono">{t.batchShort}</b> 的 {CAT_LABEL[t.cat]?.split(' ')[0]} · {COUNTRY_LABEL[t.country]} 有人批了
          <span style={{ color: 'var(--gc-muted)' }}> · {t.daysAgo} 天前</span>
        </p>
      ))}
    </div>
  );
};

// ============================================================
// ⑥ 月度一题 —— 按批次问，只公布比例
// 【草稿】投票本身还没接后端，百分比是占位数字——不在本轮"接数据"范围内。
// ============================================================
const BatchPoll = ({ b }) => {
  const [voted, setVoted] = useState(null);
  const opts = [
    { id: 'moved', label: '动了', pct: 46 },
    { id: 'same', label: '没动', pct: 41 },
    { id: 'back', label: '倒退了', pct: 13 },
  ];
  return (
    <div style={{ background: 'var(--gc-surface)', border: '1px solid var(--gc-rule)', borderRadius: '4px', padding: '18px', marginBottom: '10px' }}>
      <p className="gc-serif" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--gc-ink)' }}>这个月一题</p>
      <p style={{ fontSize: '13px', color: 'var(--gc-ink-soft)', margin: '4px 0 12px', lineHeight: 1.6 }}>
        <b>{b.short}</b> 这一批，你的案子这个月动了吗？
      </p>
      {!voted ? (
        <div className="flex gap-2">
          {opts.map((o) => (
            <button key={o.id} onClick={() => setVoted(o.id)}
              style={{ flex: 1, padding: '9px', fontSize: '13px', fontWeight: 600, borderRadius: '3px', border: '1px solid var(--gc-rule)', background: 'var(--gc-paper-soft)', color: 'var(--gc-ink)' }}>
              {o.label}
            </button>
          ))}
        </div>
      ) : (
        <>
          {opts.map((o) => (
            <div key={o.id} className="flex items-center gap-2" style={{ marginBottom: '6px' }}>
              <span style={{ width: '48px', flexShrink: 0, fontSize: '12.5px', fontWeight: voted === o.id ? 700 : 500, color: voted === o.id ? 'var(--gc-green-ink)' : 'var(--gc-ink-soft)' }}>{o.label}</span>
              <div style={{ flex: 1, height: '14px', background: 'var(--gc-paper-soft)', borderRadius: '2px', overflow: 'hidden' }}>
                <div style={{ width: `${o.pct}%`, height: '100%', background: voted === o.id ? 'var(--gc-green-fill)' : 'var(--gc-rule-soft)', borderRight: `2px solid ${voted === o.id ? 'var(--gc-green)' : 'var(--gc-subtle)'}` }} />
              </div>
              <span className="gc-mono" style={{ width: '32px', flexShrink: 0, textAlign: 'right', fontSize: '12px', color: 'var(--gc-ink-soft)' }}>{o.pct}%</span>
            </div>
          ))}
          <p style={{ fontSize: '11.5px', color: 'var(--gc-muted)', marginTop: '8px' }}>只公布比例，不显示谁投了什么。</p>
        </>
      )}
    </div>
  );
};

// ============================================================
// "你在哪个位置"——分段条形图 + 阶段直方图。前一版的刻度尺/点阵两个方案
// 业主反馈都不够好，换成真正的 bar chart。分段条只用 rank/total，直方图
// 直接吃 b.stageDist（后端已经算好，CardView 本来就有），都不需要新数据。
// ============================================================

// 分段条形图：整条按"前面人数 : 你 : 后面人数"分三段，你那一段用琥珀色、
// 宽度固定给最小可视宽度（人数太多时你那一段不能细成一条线）。
const RankBar = ({ rank, total }) => {
  const before = rank - 1, after = total - rank;
  const pctBefore = (before / total) * 100;
  const pctAfter = (after / total) * 100;
  return (
    <div>
      <div className="flex" style={{ height: '30px', borderRadius: '5px', overflow: 'hidden', border: `1px solid ${C.rule}` }}>
        {before > 0 && <div style={{ width: `${pctBefore}%`, background: C.greenFill }} />}
        <div style={{
          width: `${Math.max((100 / total), 8)}%`, minWidth: '26px', background: C.amber,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <span style={{ fontSize: '10.5px', fontWeight: 700, color: C.paper }}>你</span>
        </div>
        {after > 0 && <div style={{ width: `${pctAfter}%`, background: 'var(--gc-paper-soft)' }} />}
      </div>
      <div className="flex items-center justify-between" style={{ marginTop: '6px' }}>
        <span style={{ fontSize: '11.5px', color: 'var(--gc-ink-soft)' }}>前面 <b className="gc-mono">{before}</b> 人</span>
        <span style={{ fontSize: '11.5px', fontWeight: 700, color: C.amber }}>第 {rank} 位 / 共 {total} 人</span>
        <span style={{ fontSize: '11.5px', color: 'var(--gc-ink-soft)' }}>后面 <b className="gc-mono">{after}</b> 人</span>
      </div>
    </div>
  );
};

// 阶段直方图：b.stageDist 后端已经按"每人只算最靠后一步"分好桶了，这里只是
// 画出来——柱子高度是人数，你自己在的那根柱子用琥珀色。
const StageHistogram = ({ stageDist }) => {
  const { counts, max } = stageDist;
  return (
    <div>
      <div className="flex items-end" style={{ gap: '7px', height: '72px' }}>
        {counts.map((c) => (
          <div key={c.key} className="flex flex-col items-center" style={{ flex: 1, height: '100%', justifyContent: 'flex-end' }}>
            <span className="gc-mono" style={{ fontSize: '10px', fontWeight: c.mine ? 700 : 500, color: c.mine ? C.amber : 'var(--gc-ink-soft)', marginBottom: '3px' }}>{c.count}</span>
            <div style={{
              width: '100%', maxWidth: '32px',
              height: `${Math.max(4, (c.count / (max || 1)) * 46)}px`,
              background: c.mine ? C.amber : C.greenFill,
              border: `1px solid ${c.mine ? C.amber : C.green}`,
              borderRadius: '3px 3px 0 0',
            }} />
          </div>
        ))}
      </div>
      <div className="flex items-start" style={{ gap: '7px', marginTop: '4px' }}>
        {counts.map((c) => (
          <div key={c.key} style={{ flex: 1, textAlign: 'center', fontSize: '9.5px', fontWeight: c.mine ? 700 : 500, color: c.mine ? C.amber : 'var(--gc-muted)' }}>{c.label}</div>
        ))}
      </div>
    </div>
  );
};

// ============================================================
// 卡片页
// ============================================================
const CardView = ({ me, b, onBack, onBatch }) => {
  const svgRef = useRef(null);
  const [pngUrl, setPngUrl] = useState(null);
  const stage = myStageIdx(me.dates);

  const makePng = (thenDownload) => {
    const svg = svgRef.current;
    if (!svg) return;
    const data = new XMLSerializer().serializeToString(svg);
    const url = URL.createObjectURL(new Blob([data], { type: 'image/svg+xml;charset=utf-8' }));
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      canvas.getContext('2d').drawImage(img, 0, 0, W, H);
      canvas.toBlob((blob) => {
        if (!blob) return;
        const href = URL.createObjectURL(blob);
        setPngUrl(href);
        if (thenDownload) {
          const a = document.createElement('a');
          a.href = href; a.download = `gc-${me.cat}-${b.short.replace(/[^0-9A-Za-z]/g, '')}.png`; a.click();
        }
        URL.revokeObjectURL(url);
      }, 'image/png');
    };
    img.onerror = () => URL.revokeObjectURL(url);
    img.src = url;
  };

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1" style={{ fontSize: '13px', color: 'var(--gc-muted)', marginBottom: '10px' }}>
        <ChevronLeft size={14} /> 改一下我填的
      </button>

      {/* ⑤ 即时共鸣：填完那一秒就告诉你有多少人跟你一样 */}
      <div style={{ background: 'var(--gc-amber-soft)', border: '1px solid var(--gc-amber-border)', borderRadius: '4px', padding: '14px', marginBottom: '10px' }}>
        <p style={{ fontSize: '14.5px', color: 'var(--gc-amber-ink)', lineHeight: 1.7, fontWeight: 600 }}>
          {b.sameStep > 0
            ? <>你不是一个人——<b>{b.short}</b> 这一批还有 <b>{b.sameStep}</b> 个人，也卡在「{STEPS[stage]?.label || '还没递交'}」这一步。</>
            : <>你是 <b>{b.short}</b> 这一批里第一个走到「{STEPS[stage]?.label || '登记'}」的人。</>}
        </p>
      </div>

      {/* "你在哪个位置"：分段条形图（前面/你/后面）+ 阶段直方图（大家走到哪一步了） */}
      {b.total > 1 && (
        <div style={{ background: 'var(--gc-surface)', border: '1px solid var(--gc-rule)', borderRadius: '4px', padding: '16px 18px', marginBottom: '10px' }}>
          <p className="gc-serif" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--gc-ink)', marginBottom: '8px' }}>你在这一批里的位置</p>
          <RankBar rank={b.rank} total={b.total} />
          <p style={{ fontSize: '11px', color: 'var(--gc-muted)', marginTop: '8px', marginBottom: '14px' }}>
            位置按优先日先后排，不是案子的等待进度。
          </p>
          <p className="gc-serif" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--gc-ink)', marginBottom: '8px' }}>大家走到哪一步了</p>
          <StageHistogram stageDist={b.stageDist} />
        </div>
      )}

      <div style={{ background: 'var(--gc-surface)', border: '1px solid var(--gc-rule)', borderRadius: '4px', padding: '18px' }}>
        <p className="gc-serif" style={{ fontSize: '17px', fontWeight: 700, color: 'var(--gc-ink)', marginBottom: '4px' }}>你的进度卡</p>
        <p style={{ fontSize: '12px', color: 'var(--gc-muted)', marginBottom: '12px', lineHeight: 1.6 }}>
          卡上主角是批次不是你个人——发出去只暴露「这一批多少人、走到哪」，不暴露别人的案子。
        </p>

        <div style={{ border: '1px solid var(--gc-rule)', lineHeight: 0, maxWidth: '360px', margin: '0 auto' }}>
          <ProgressCardSVG ref={svgRef} me={me} b={b} />
        </div>

        <div className="flex gap-2" style={{ marginTop: '12px' }}>
          <button onClick={() => makePng(true)} className="flex items-center justify-center gap-1.5"
            style={{ flex: 1, padding: '10px', background: 'var(--gc-green)', color: 'var(--gc-paper)', fontSize: '14px', fontWeight: 700, borderRadius: '3px' }}>
            <Download size={15} /> 下载 PNG
          </button>
          <button onClick={() => makePng(false)}
            style={{ flex: 1, padding: '10px', background: 'var(--gc-surface)', color: 'var(--gc-green)', border: '1px solid var(--gc-green-border)', fontSize: '14px', fontWeight: 700, borderRadius: '3px' }}>
            手机长按存图
          </button>
        </div>

        {/* 微信/小红书内置浏览器和 iOS Safari 对 link.click() 下载支持很差，
            所以另给一条「把 PNG 显示出来长按保存」的路——手机上真正走得通的是这条 */}
        {pngUrl && (
          <div style={{ marginTop: '12px', padding: '12px', background: 'var(--gc-amber-soft)', border: '1px solid var(--gc-amber-border)', borderRadius: '3px' }}>
            <p style={{ fontSize: '12px', color: 'var(--gc-amber-ink)', marginBottom: '8px', fontWeight: 600 }}>
              下面这张长按就能存到相册（微信、小红书里用这个）
            </p>
            <img src={pngUrl} alt="进度卡" style={{ width: '100%', maxWidth: '360px', display: 'block', margin: '0 auto', border: '1px solid var(--gc-rule)' }} />
          </div>
        )}
      </div>

      <button onClick={onBatch} className="flex items-center justify-center gap-1.5"
        style={{ width: '100%', marginTop: '10px', padding: '11px', background: 'var(--gc-surface)', border: '1px solid var(--gc-rule)', fontSize: '14px', fontWeight: 600, color: 'var(--gc-ink)', borderRadius: '4px' }}>
        <Users size={15} /> 看看 {b.short} 这一批走到哪了
      </button>
    </div>
  );
};

// ============================================================
// 填表页
// ============================================================
const FormView = ({ initial, onSubmit, submitting, submitError }) => {
  const [f, setF] = useState(initial);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const setDate = (k, v) => setF((p) => ({ ...p, dates: { ...p.dates, [k]: v } }));

  const err = (() => {
    if (!f.priorityDate) return '填一下优先日';
    if (f.priorityDate < MIN_PD) return `优先日不能早于 ${MIN_PD}`;
    if (f.priorityDate > TODAY) return '优先日不能晚于今天';
    let last = f.priorityDate;
    for (const s of STEPS) {
      const d = f.dates[s.key];
      if (!d) continue;
      if (d > TODAY) return `${s.label}的日期晚于今天`;
      if (d < last) return `${s.label}早于前一步，日期顺序对不上`;
      last = d;
    }
    return null;
  })();

  const label = { fontSize: '12px', fontWeight: 600, color: 'var(--gc-ink-soft)', display: 'block', marginBottom: '4px' };
  const field = { width: '100%', padding: '8px 10px', fontSize: '14px', color: 'var(--gc-ink)', background: 'var(--gc-surface)', border: '1px solid var(--gc-rule)', borderRadius: '3px' };
  const card = { background: 'var(--gc-surface)', border: '1px solid var(--gc-rule)', borderRadius: '4px', padding: '18px', marginBottom: '10px' };

  const myBatch = f.priorityDate && f.priorityDate >= MIN_PD && f.priorityDate <= TODAY ? batchFull(f) : null;

  return (
    <div>
      <div style={card}>
        <p className="gc-serif" style={{ fontSize: '17px', fontWeight: 700, color: 'var(--gc-ink)' }}>第 1 步 · 你的案子</p>
        <p style={{ fontSize: '12px', color: 'var(--gc-muted)', margin: '3px 0 12px', lineHeight: 1.6 }}>
          不收姓名、不收 A 号、不收护照号。填完立刻出卡。
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <span style={label}>绿卡类别</span>
            <select style={field} value={f.cat} onChange={(e) => set('cat', e.target.value)}>
              {CATS.map((c) => <option key={c} value={c}>{CAT_LABEL[c]}</option>)}
            </select>
          </div>
          <div>
            <span style={label}>出生地</span>
            <select style={field} value={f.country} onChange={(e) => set('country', e.target.value)}>
              {COUNTRIES.map((c) => <option key={c} value={c}>{COUNTRY_LABEL[c]}</option>)}
            </select>
          </div>
          <div>
            <span style={label}>优先日</span>
            <input type="date" style={field} value={f.priorityDate} min={MIN_PD} max={TODAY} onChange={(e) => set('priorityDate', e.target.value)} />
          </div>
          <div>
            <span style={label}>服务中心 / 领事馆</span>
            <select style={field} value={f.center} onChange={(e) => set('center', e.target.value)}>
              {CENTERS.map((c) => <option key={c} value={c}>{CENTER_LABEL[c]}</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginTop: '10px' }}>
          <span style={label}>走哪条路</span>
          <div className="flex gap-2">
            {[['aos', '境内 I-485（AOS）'], ['cp', '境外领事馆（CP）']].map(([v, l]) => (
              <button key={v} onClick={() => set('path', v)}
                style={{
                  flex: 1, padding: '8px', fontSize: '13px', fontWeight: 600, borderRadius: '3px',
                  border: `1px solid ${f.path === v ? 'var(--gc-green)' : 'var(--gc-rule)'}`,
                  background: f.path === v ? 'var(--gc-green-soft)' : 'var(--gc-surface)',
                  color: f.path === v ? 'var(--gc-green-ink)' : 'var(--gc-muted)',
                }}>{l}</button>
            ))}
          </div>
        </div>
        {/* ① 一填优先日就告诉你会被归进哪一批，「批次」这个概念从第一屏就立住 */}
        {myBatch && (
          <p style={{ fontSize: '12.5px', color: 'var(--gc-green-ink)', marginTop: '11px', padding: '7px 10px', background: 'var(--gc-green-soft)', border: '1px solid var(--gc-green-border)', borderRadius: '3px', lineHeight: 1.5 }}>
            你会被归进 <b>{myBatch}</b> 这一批
          </p>
        )}
      </div>

      <div style={card}>
        <p className="gc-serif" style={{ fontSize: '17px', fontWeight: 700, color: 'var(--gc-ink)' }}>第 2 步 · 走到哪一步了</p>
        <p style={{ fontSize: '12px', color: 'var(--gc-muted)', margin: '3px 0 12px', lineHeight: 1.6 }}>
          只填已经发生的，没到的留空。别人只看得到月份，看不到具体哪一天。
        </p>
        {STEPS.map((s) => (
          <div key={s.key} className="flex items-center gap-2" style={{ marginBottom: '7px' }}>
            <span style={{ width: '68px', flexShrink: 0, fontSize: '13px', fontWeight: 600, color: f.dates[s.key] ? 'var(--gc-ink)' : 'var(--gc-muted)' }}>{s.label}</span>
            <input type="date" style={{ ...field, flex: 1 }} max={TODAY} value={f.dates[s.key] || ''} onChange={(e) => setDate(s.key, e.target.value)} />
            {f.dates[s.key] && <CheckCircle2 size={15} style={{ color: 'var(--gc-green)', flexShrink: 0 }} />}
          </div>
        ))}
      </div>

      {err && <p style={{ fontSize: '12px', color: 'var(--gc-red)', marginBottom: '8px', fontWeight: 600 }}>{err}</p>}
      {submitError && <p style={{ fontSize: '12px', color: 'var(--gc-red)', marginBottom: '8px', fontWeight: 600 }}>{submitError}</p>}
      <button disabled={!!err || submitting} onClick={() => onSubmit(f)}
        style={{
          width: '100%', padding: '13px', fontSize: '15px', fontWeight: 700, borderRadius: '4px',
          background: (err || submitting) ? 'var(--gc-subtle)' : 'var(--gc-green)', color: 'var(--gc-paper)', cursor: (err || submitting) ? 'not-allowed' : 'pointer',
        }}>
        {submitting ? '提交中…' : '加入我这一批'}
      </button>
      <p style={{ fontSize: '11px', color: 'var(--gc-muted)', textAlign: 'center', marginTop: '8px', lineHeight: 1.6 }}>
        本页数据全部由用户自报，不是官方统计。同一网络每天最多提交 3 次。
      </p>
    </div>
  );
};

// ============================================================
// ② give-to-get：没填表的人只看得到全站粗汇总，填完才解锁自己那批的细分
// ============================================================
const LockedTeaser = ({ summary, onFill }) => {
  return (
    <div style={{ background: 'var(--gc-surface)', border: '1px solid var(--gc-rule)', borderRadius: '4px', padding: '18px' }}>
      <p className="flex items-center gap-1.5 gc-serif" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--gc-ink)', marginBottom: '8px' }}>
        <Lock size={14} /> 你那一批的数据还锁着
      </p>
      <p style={{ fontSize: '13px', color: 'var(--gc-ink-soft)', lineHeight: 1.75, marginBottom: '12px' }}>
        全站现在有 <b>{summary?.totalCases ?? 0}</b> 个案子，分成 <b>{summary?.totalBatches ?? 0}</b> 批，其中 <b>{summary?.approvedCount ?? 0}</b> 个已经批准。
        填完你自己那一条，就能看到你这一批的等待中位数、阶段分布和季度走势。
      </p>
      <button onClick={onFill}
        style={{ width: '100%', padding: '11px', background: 'var(--gc-green)', color: 'var(--gc-paper)', fontSize: '14px', fontWeight: 700, borderRadius: '3px' }}>
        填一条解锁
      </button>
      <p style={{ fontSize: '11.5px', color: 'var(--gc-muted)', marginTop: '9px', lineHeight: 1.6 }}>
        大家都填才有数——只看不填的话，这堵墙迟早会空。
      </p>
    </div>
  );
};

// ============================================================
// 我这一批 —— 图表 + 统计，永远不出现个案明细
// b = 批次口径（后端算好），catData = 整类别口径（后端算好）
// ============================================================
const BatchView = ({ me, b, catData, summary, onBack, onFill }) => {
  const [scope, setScope] = useState('mine');   // mine = 只看我这批，cat = 看整个类别
  if (!me || !b || !catData) {
    return (
      <div>
        <button onClick={onBack} className="flex items-center gap-1" style={{ fontSize: '13px', color: 'var(--gc-muted)', marginBottom: '10px' }}>
          <ChevronLeft size={14} /> 返回
        </button>
        <LockedTeaser summary={summary} onFill={onFill} />
      </div>
    );
  }

  const data = scope === 'mine' ? b : catData;
  const chart = catData.chart;   // 图表永远是整类别粒度，只是把「我这批」那根高亮

  const cardBox = { background: 'var(--gc-surface)', border: '1px solid var(--gc-rule)', borderRadius: '4px', padding: '18px', marginBottom: '10px' };
  const CW = 320, CH = 132, PAD_L = 8, PAD_R = 8, PAD_T = 16, PAD_B = 26;
  const plotW = CW - PAD_L - PAD_R, plotH = CH - PAD_T - PAD_B;
  const buckets = chart?.buckets || [];
  const pts = buckets.map((x, i) => ({
    x: buckets.length === 1 ? PAD_L + plotW / 2 : PAD_L + (plotW * i) / (buckets.length - 1),
    y: PAD_T + plotH - (plotH * x.count) / (chart.max || 1),
    b: x,
  }));
  const areaPath = pts.length ? `M ${pts[0].x} ${PAD_T + plotH} ` + pts.map((p) => `L ${p.x} ${p.y}`).join(' ') + ` L ${pts[pts.length - 1].x} ${PAD_T + plotH} Z` : '';
  const linePath = pts.length ? `M ${pts[0].x} ${pts[0].y} ` + pts.slice(1).map((p) => `L ${p.x} ${p.y}`).join(' ') : '';
  const minePt = pts.find((p) => p.b.mine);

  // ③ 样本门槛：不够 5 人，细分一律不出数（enough/needMore 是后端算的）
  const locked = scope === 'mine' && !b.enough;

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1" style={{ fontSize: '13px', color: 'var(--gc-muted)', marginBottom: '10px' }}>
        <ChevronLeft size={14} /> 回我的卡
      </button>

      <div style={cardBox}>
        <p className="gc-serif" style={{ fontSize: '17px', fontWeight: 700, color: 'var(--gc-ink)' }}>{b.label}</p>
        {/* ⑨ 数据新鲜度：让人知道这堆数字值多少 */}
        <p className="flex items-center gap-1.5" style={{ fontSize: '12px', color: 'var(--gc-muted)', margin: '5px 0 12px' }}>
          <RefreshCw size={11} /> {b.fresh === null ? '还没有别人更新过这一批' : `这批数据${b.fresh === 0 ? '今天' : ` ${b.fresh} 天前`}刚有人更新过`}，来自 {b.total} 个人
        </p>
        <div className="flex gap-2">
          {[['mine', `只看我这批（${b.total}）`], ['cat', `整个 ${me.cat}·${COUNTRY_LABEL[me.country]}（${catData.total}）`]].map(([v, l]) => (
            <button key={v} onClick={() => setScope(v)}
              style={{
                flex: 1, padding: '8px', fontSize: '12.5px', fontWeight: 600, borderRadius: '3px',
                border: `1px solid ${scope === v ? 'var(--gc-green)' : 'var(--gc-rule)'}`,
                background: scope === v ? 'var(--gc-green-soft)' : 'var(--gc-surface)',
                color: scope === v ? 'var(--gc-green-ink)' : 'var(--gc-muted)',
              }}>{l}</button>
          ))}
        </div>
      </div>

      {locked ? (
        <div style={{ ...cardBox, background: 'var(--gc-amber-soft)', borderColor: 'var(--gc-amber-border)' }}>
          <p className="flex items-center gap-1.5" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--gc-amber-ink)', marginBottom: '6px' }}>
            <Lock size={13} /> 这一批还差 {b.needMore} 个人
          </p>
          <p style={{ fontSize: '13px', color: 'var(--gc-amber-ink)', lineHeight: 1.75 }}>
            不到 {K_MIN} 个人的批次一律不出数——人太少的话，光看类别加日期就能猜到是谁。
            先看右边那个整类别的口径，或者把卡发给同批的人。
          </p>
        </div>
      ) : (
        <>
          <div style={{ ...cardBox, background: 'var(--gc-paper-soft)' }}>
            <p style={{ fontSize: '14px', color: 'var(--gc-ink)', lineHeight: 1.8 }}>
              这{scope === 'mine' ? '一批' : '个类别'}一共 <b>{data.total}</b> 个人，
              中位已等 <b>{data.medianWait}</b> 个月，
              已经批准 <b>{data.approvedN}</b> 个。
              {scope === 'mine' && <> 你在这批里排第 <b>{b.rank}</b> 位。</>}
            </p>
          </div>

          <div style={cardBox}>
            <p className="gc-serif" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--gc-ink)' }}>各批次的人都堆在哪几季</p>
            <p style={{ fontSize: '12px', color: 'var(--gc-muted)', margin: '3px 0 10px', lineHeight: 1.6 }}>
              横轴是优先日所在季度，纵向是人数。{minePt ? '琥珀色那条是你这一批。' : ''}
            </p>
            <svg viewBox={`0 0 ${CW} ${CH}`} style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}>
              <line x1={PAD_L} y1={PAD_T + plotH} x2={CW - PAD_R} y2={PAD_T + plotH} stroke="var(--gc-rule)" strokeWidth="1" />
              <path d={areaPath} fill="var(--gc-green-fill)" opacity="0.55" />
              <path d={linePath} fill="none" stroke="var(--gc-green)" strokeWidth="2" strokeLinejoin="round" />
              {minePt && (
                <>
                  <line x1={minePt.x} y1={PAD_T - 6} x2={minePt.x} y2={PAD_T + plotH} stroke="var(--gc-amber)" strokeWidth="1.5" strokeDasharray="3 2" />
                  <circle cx={minePt.x} cy={minePt.y} r="4" fill="var(--gc-amber)" stroke="var(--gc-surface)" strokeWidth="1.5" />
                  <text x={Math.min(Math.max(minePt.x, 24), CW - 24)} y={PAD_T - 9} textAnchor="middle" fontSize="9.5" fontWeight="700" fill="var(--gc-amber-ink)">你这批</text>
                </>
              )}
              {pts.map((p) => (
                <g key={p.b.q}>
                  {!p.b.mine && <circle cx={p.x} cy={p.y} r="2.5" fill="var(--gc-green)" />}
                  <text x={p.b.mine ? p.x + 11 : p.x} y={p.b.mine ? p.y + 3 : p.y - 6}
                    textAnchor={p.b.mine ? 'start' : 'middle'} fontSize="9" fontWeight={p.b.mine ? 700 : 400}
                    fill={p.b.mine ? 'var(--gc-amber-ink)' : 'var(--gc-ink-soft)'}>{p.b.count}</text>
                  <text x={p.x} y={PAD_T + plotH + 14} textAnchor="middle" fontSize="8.5" fill="var(--gc-muted)">
                    {p.b.q.slice(2)}
                  </text>
                </g>
              ))}
            </svg>
          </div>

          <div style={cardBox}>
            <p className="gc-serif" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--gc-ink)' }}>大家走到哪一步了</p>
            <p style={{ fontSize: '12px', color: 'var(--gc-muted)', margin: '3px 0 12px', lineHeight: 1.6 }}>
              每人只算最靠后的那一步。{data.stageDist.notFiled > 0 && `另有 ${data.stageDist.notFiled} 人还没递交。`}
            </p>
            {data.stageDist.counts.map((c) => (
              <div key={c.key} className="flex items-center gap-2" style={{ marginBottom: '7px' }}>
                <span style={{ width: '54px', flexShrink: 0, fontSize: '12.5px', fontWeight: c.mine ? 700 : 500, color: c.mine ? 'var(--gc-amber-ink)' : 'var(--gc-ink-soft)' }}>{c.label}</span>
                <div style={{ flex: 1, height: '15px', background: 'var(--gc-paper-soft)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{
                    width: `${(c.count / data.stageDist.max) * 100}%`, height: '100%',
                    background: c.mine ? 'var(--gc-amber-fill)' : 'var(--gc-green-fill)',
                    borderRight: c.count ? `2px solid ${c.mine ? 'var(--gc-amber)' : 'var(--gc-green)'}` : 'none',
                  }} />
                </div>
                <span className="gc-mono" style={{ width: '36px', flexShrink: 0, textAlign: 'right', fontSize: '12px', color: 'var(--gc-ink-soft)' }}>{c.count} 人</span>
              </div>
            ))}
          </div>

          {/* ④ 只到月，不到日——后端已经粗化过了 */}
          <div style={cardBox}>
            <p className="gc-serif" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--gc-ink)' }}>这{scope === 'mine' ? '批' : '类'}人各步都在什么时候走过</p>
            <p style={{ fontSize: '12px', color: 'var(--gc-muted)', margin: '3px 0 10px', lineHeight: 1.6 }}>
              「走过这一步的人」不是「停在这一步的人」，所以人数会比上面那张图多。只到月份，不显示具体哪一天，也不显示是谁。
            </p>
            {STEPS.slice().reverse().map((s) => {
              const w = data.walked[s.key];
              if (!w) return null;
              return (
                <p key={s.key} style={{ fontSize: '13px', color: 'var(--gc-ink-soft)', lineHeight: 1.9 }}>
                  <b>{s.label}</b>：{w.count} 人走过，最早 <span className="gc-mono">{w.first}</span>，最近 <span className="gc-mono">{w.last}</span>
                </p>
              );
            })}
          </div>

          <BatchPoll b={b} />

          {/* ⑩ 月度邮件从排期播报变成社区播报 */}
          <div style={{ ...cardBox, background: 'var(--gc-paper-soft)' }}>
            <p className="flex items-center gap-1.5 gc-serif" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--gc-ink)', marginBottom: '6px' }}>
              <Mail size={14} /> 下个月的邮件里会多这么一行
            </p>
            <p style={{ fontSize: '13px', color: 'var(--gc-ink-soft)', lineHeight: 1.75, padding: '10px 12px', background: 'var(--gc-surface)', border: '1px dashed var(--gc-rule)', borderRadius: '3px' }}>
              「你这批（{b.short}）本月有 {Math.max(1, Math.round(b.total / 4))} 个人往前走了一步，
              {b.approvedN} 个已经批准。」
            </p>
            <p style={{ fontSize: '11.5px', color: 'var(--gc-muted)', marginTop: '8px', lineHeight: 1.6 }}>
              不带任何个人字段。把一次性填表的人拉回来第二次、第三次靠的就是这行。
            </p>
          </div>
        </>
      )}

      <p style={{ fontSize: '11px', color: 'var(--gc-muted)', lineHeight: 1.6, padding: '0 2px' }}>
        全部为用户自报，非官方数据。统计一律取中位数，不显示任何个案明细。
      </p>
    </div>
  );
};

// ============================================================
// 页面壳 —— 管 ownerId、拉后端数据、切视图
// ============================================================
const TrackerPage = ({ userCase }) => {
  const ownerId = useMemo(getOrCreateOwnerId, []);
  const [view, setView] = useState('form');
  const [hydrated, setHydrated] = useState(null);   // {record, batch, cat, ticker} | null
  const [summary, setSummary] = useState(null);      // {totalCases, totalBatches, approvedCount, ticker}
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [summaryRes, ownerRes] = await Promise.all([
          fetch(`${API_BASE}/api/tracker?summary=1`).then((r) => r.ok ? r.json() : null).catch(() => null),
          fetch(`${API_BASE}/api/tracker?owner=${encodeURIComponent(ownerId)}`).then((r) => r.ok ? r.json() : null).catch(() => null),
        ]);
        if (cancelled) return;
        if (summaryRes) setSummary(summaryRes);
        if (ownerRes?.record) { setHydrated(ownerRes); setView('card'); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [ownerId]);

  const initial = useMemo(() => (hydrated?.record ? { ...hydrated.record, dates: { ...hydrated.record.dates } } : {
    cat: CATS.includes(userCase?.category) ? userCase.category : 'EB2',
    country: COUNTRIES.includes(userCase?.country) ? userCase.country : 'China',
    priorityDate: userCase?.priorityDate || '',
    center: 'unknown',
    path: 'aos',
    dates: {},
  }), [hydrated, userCase]);

  const submit = async (f) => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const r = await fetch(`${API_BASE}/api/tracker`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ownerId, cat: f.cat, country: f.country, priorityDate: f.priorityDate, path: f.path, center: f.center, dates: f.dates }),
      });
      const data = await r.json().catch(() => null);
      if (!r.ok || !data?.ok) {
        const code = data?.error;
        throw new Error(
          code === 'rate limited' ? '同一网络今天提交次数用完了，明天再试'
            : code === 'too large' ? '提交内容太大了'
              : code || '提交失败，稍后再试'
        );
      }
      setHydrated(data);
      setView('card');
    } catch (e) {
      setSubmitError(e.message === 'Failed to fetch' ? '连不上服务器，等会儿再试' : e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const ticker = hydrated?.ticker || summary?.ticker || [];

  return (
    <div style={{ padding: '4px 2px 20px' }}>
      <div style={{ marginBottom: '12px' }}>
        <h2 className="gc-serif" style={{ fontSize: '22px', fontWeight: 700, color: 'var(--gc-ink)', letterSpacing: '-0.01em' }}>
          案件进度墙
        </h2>
        <p style={{ fontSize: '13px', color: 'var(--gc-muted)', marginTop: '3px', lineHeight: 1.6 }}>
          按「批次」看——跟你同一个季度优先日、同类别同出生地的人，走到哪一步了。页面上只出现批次，不出现个人。
        </p>
      </div>

      <ApprovalTicker ticker={ticker} />

      {loading ? (
        <p style={{ fontSize: '13px', color: 'var(--gc-muted)', padding: '18px 0', textAlign: 'center' }}>读取中…</p>
      ) : (
        <>
          {view === 'form' && <FormView initial={initial} onSubmit={submit} submitting={submitting} submitError={submitError} />}
          {view === 'card' && hydrated?.record && <CardView me={hydrated.record} b={hydrated.batch} onBack={() => setView('form')} onBatch={() => setView('batch')} />}
          {view === 'batch' && <BatchView me={hydrated?.record} b={hydrated?.batch} catData={hydrated?.cat} summary={summary} onBack={() => setView(hydrated?.record ? 'card' : 'form')} onFill={() => setView('form')} />}
        </>
      )}
    </div>
  );
};

export default TrackerPage;
