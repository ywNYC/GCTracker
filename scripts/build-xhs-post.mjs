#!/usr/bin/env node
// scripts/build-xhs-post.mjs
//
// 从 public/bulletin.json 生成一段可直接粘贴的小红书文案（中国大陆申请人视角）。
// 纯读取 + 字符串拼接，无依赖、不联网，供 scrape-bulletin workflow 抓到新公告后
// 塞进通知 issue 的正文里 —— 业主打开邮件就能复制，不需要再等人工写。
//
// 用法：node scripts/build-xhs-post.mjs [> post.txt]

import fs from 'node:fs';

const BULLETIN_JSON_PATH = 'public/bulletin.json';

// 只放小红书读者真正会看的类别，顺序即文案里的顺序。
// EB5R/EB5H/EB5I 三个预留类平时全是 C，逐条列出来只会稀释重点，所以合并成一行处理。
const EB_CATS = [
  ['EB1', 'EB-1 杰出人才'],
  ['EB2', 'EB-2 高学历'],
  ['EB3', 'EB-3 技术劳工'],
  ['EW', 'EB-3 非技术劳工'],
  ['EB5', 'EB-5 投资移民（无预留）'],
];
const FAM_CATS = [
  ['F1', 'F1 公民成年未婚子女'],
  ['F2A', 'F2A 绿卡配偶及未成年子女'],
  ['F2B', 'F2B 绿卡成年未婚子女'],
  ['F3', 'F3 公民已婚子女'],
  ['F4', 'F4 公民兄弟姐妹'],
];
const RESERVED_EB5 = [
  ['EB5R', '乡村'],
  ['EB5H', '高失业区'],
  ['EB5I', '基建'],
];

const COUNTRY = 'China'; // 小红书读者绝大多数是中国大陆出生

function monthLabel(monthKey) {
  const [y, m] = monthKey.split('-');
  return `${y} 年 ${Number(m)} 月`;
}

// 排期值有三种：'C'（无需排期）、日期字符串、null（U，本月无名额）。
function fmtValue(v) {
  if (v === 'C') return '无需排期';
  if (v === null || v === undefined) return '本月无名额';
  return v;
}

function daysBetween(a, b) {
  return Math.round((Date.parse(a) - Date.parse(b)) / 86400000);
}

// 返回一句人话的变化描述，没有可比性时返回 null（文案里就只报当前值）。
function describeMove(now, prev) {
  if (now === prev) return '没动';
  if (now === 'C') return '变成无需排期';
  if (prev === 'C') return '开始排队';
  if (now === null) return '本月停发';
  if (prev === null) return '恢复发放';
  const d = daysBetween(now, prev);
  if (d === 0) return '没动';
  return d > 0 ? `前进 ${d} 天` : `倒退 ${Math.abs(d)} 天`;
}

function line(label, nowVal, prevVal) {
  const move = describeMove(nowVal, prevVal);
  const moveText = move && move !== '没动' ? `（${move}）` : '（没动）';
  return `· ${label}：${fmtValue(nowVal)}${moveText}`;
}

function section(title, cats, nowTable, prevTable) {
  const rows = cats
    .filter(([key]) => nowTable && key in nowTable)
    .map(([key, label]) => line(label, nowTable[key]?.[COUNTRY], prevTable?.[key]?.[COUNTRY]));
  if (!rows.length) return null;
  return `${title}\n${rows.join('\n')}`;
}

// EB-5 三个预留类全是 C 时压成一行，否则逐条列。
function reservedEb5Line(nowTable, prevTable) {
  const present = RESERVED_EB5.filter(([key]) => nowTable && key in nowTable);
  if (!present.length) return null;
  const allCurrent = present.every(([key]) => nowTable[key]?.[COUNTRY] === 'C');
  if (allCurrent) return '· EB-5 乡村／高失业区／基建：均无需排期';
  return present
    .map(([key, label]) => line(`EB-5 ${label}`, nowTable[key]?.[COUNTRY], prevTable?.[key]?.[COUNTRY]))
    .join('\n');
}

// 标题只能挑一个重点：先看职业类表A谁前进最多，职业类全没动再退回亲属类，
// 两边都没动才用「原地不动」的标题。9 月这种财年末的月份，亲属类经常是唯一在动的。
function biggestMover(cats, nowTable, prevTable) {
  let best = null;
  for (const [key, name] of cats) {
    const now = nowTable?.[key]?.[COUNTRY];
    const prev = prevTable?.[key]?.[COUNTRY];
    if (typeof now !== 'string' || typeof prev !== 'string' || now === 'C' || prev === 'C') continue;
    const d = daysBetween(now, prev);
    if (d > 0 && (!best || d > best.days)) best = { name, days: d };
  }
  return best;
}

function headline(current, previous, label) {
  const eb = biggestMover(EB_CATS, current.finalAction, previous?.finalAction);
  if (eb) return `${label}排期出炉：${eb.name}前进 ${eb.days} 天`;
  const fam = biggestMover(FAM_CATS, current.finalAction, previous?.finalAction);
  if (fam) return `${label}排期出炉：职业类原地不动，${fam.name}前进 ${fam.days} 天`;
  return `${label}排期出炉：中国申请人这期基本原地不动`;
}

function build(data) {
  const { current, previous } = data;
  const label = monthLabel(current.month);
  const out = [];

  out.push(`【标题】`);
  out.push(headline(current, previous, label));
  out.push('');
  out.push('【正文】');
  out.push(`${label}签证公告（Visa Bulletin）已经发布，下面只看中国大陆出生的申请人。`);
  out.push('');

  const fa = section('表A 最终裁定日（排到你就能拿绿卡）', EB_CATS, current.finalAction, previous?.finalAction);
  if (fa) {
    const reserved = reservedEb5Line(current.finalAction, previous?.finalAction);
    out.push(reserved ? `${fa}\n${reserved}` : fa);
    out.push('');
  }

  const df = section('表B 递交日（排到你就能交 I-485）', EB_CATS, current.filing, previous?.filing);
  if (df) { out.push(df); out.push(''); }

  const fam = section('亲属类 表A', FAM_CATS, current.finalAction, previous?.finalAction);
  if (fam) { out.push(fam); out.push(''); }

  if (current.f2aExempt) {
    out.push(`F2A 豁免日期：${current.f2aExempt}（这个日期之前的 F2A 不受名额限制）`);
    out.push('');
  }

  if (Array.isArray(current.notices) && current.notices.length) {
    out.push(`本期公告还带了 ${current.notices.length} 条说明（${current.notices.map(n => n.letter).filter(Boolean).join('/')} 节），细节在官网原文和站里。`);
    out.push('');
  }

  out.push('完整表格、其他国家、还有按自己优先日算的排队进度，可以到 gc.jmjvc.us 查（免费，可订阅每月提醒）。');
  out.push('数据来源：美国国务院官方 Visa Bulletin。');
  out.push('');
  out.push('#绿卡排期 #签证公告 #移民美国 #EB2 #EB3 #EB5 #I485');

  return out.join('\n');
}

const data = JSON.parse(fs.readFileSync(BULLETIN_JSON_PATH, 'utf8'));
process.stdout.write(build(data) + '\n');
