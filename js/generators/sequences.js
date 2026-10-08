// Suites numériques et alphabétiques : règles simples, alternées, imbriquées,
// récursives et multi-suites entrelacées.

import { esc, svg, signed } from '../util.js';

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const toLetter = (v) => LETTERS[v - 1] || '?';
export function showValue(v, type) {
  return type === 'a' ? toLetter(v) : String(v).replace('-', '−');
}
const LIMIT = 99999;
const TIME_LIMITS = [0, 40, 45, 50, 60, 70, 75, 90, 80, 70, 60];

function opLabel(op) {
  if (op.t === '+') return signed(op.v);
  return `×${op.v < 0 ? `(−${-op.v})` : op.v}`;
}
function applyOp(op, x) {
  return op.t === '+' ? x + op.v : x * op.v;
}

// ---- Familles élémentaires : renvoient { seq, text, arcs, notes } sur `len` termes ----

function arith(rng, len, { alpha = false, maxD = 9, neg = true } = {}) {
  for (let t = 0; t < 50; t++) {
    let d = rng.int(1, maxD) * (neg && rng.chance(0.4) ? -1 : 1);
    if (alpha) d = rng.int(1, Math.min(maxD, 4)) * (neg && rng.chance(0.3) ? -1 : 1);
    const span = d * (len - 1);
    const a = alpha ? rng.int(Math.max(1, 1 - span), Math.min(26, 26 - span)) : rng.int(d < 0 ? -span + 1 : 1, d < 0 ? -span + 40 : 40);
    const seq = Array.from({ length: len }, (_, i) => a + d * i);
    if (alpha && seq.some((v) => v < 1 || v > 26)) continue;
    return { seq, text: `progression arithmétique : ${signed(d)} à chaque terme`, arcs: seq.slice(1).map((_, i) => [i, i + 1, signed(d)]) };
  }
  throw new Error('arith');
}

function geom(rng, len, { ratios = [2, 3] } = {}) {
  const r = rng.pick(ratios);
  const a = rng.int(1, r === 2 ? 6 : 3) * (rng.chance(0.2) ? -1 : 1);
  const seq = Array.from({ length: len }, (_, i) => a * r ** i);
  if (seq.some((v) => Math.abs(v) > LIMIT)) throw new Error('geom');
  return { seq, text: `progression géométrique : ×${r} à chaque terme`, arcs: seq.slice(1).map((_, i) => [i, i + 1, `×${r}`]) };
}

function poly2(rng, len, { alpha = false, big = false } = {}) {
  for (let t = 0; t < 80; t++) {
    const k = rng.pick(big ? [2, 3, 4, -2, -3] : [1, 2, -1]);
    const d0 = rng.int(alpha ? -2 : -5, alpha ? 3 : 8);
    const a = alpha ? rng.int(1, 10) : rng.int(-10, 30);
    const seq = [a];
    const diffs = [];
    for (let i = 1; i < len; i++) {
      const d = d0 + k * (i - 1);
      diffs.push(d);
      seq.push(seq[i - 1] + d);
    }
    if (alpha && seq.some((v) => v < 1 || v > 26)) continue;
    if (new Set(diffs).size < 2) continue;
    return {
      seq,
      text: `différences successives ${diffs.slice(0, 3).map(signed).join(', ')}… qui varient elles-mêmes de ${signed(k)} (suite du second ordre)`,
      arcs: diffs.map((d, i) => [i, i + 1, signed(d)]),
    };
  }
  throw new Error('poly2');
}

function poly3(rng, len) {
  const shift = rng.int(0, 3);
  const c = rng.int(-5, 5);
  const seq = Array.from({ length: len }, (_, i) => (i + shift) ** 3 + c);
  return {
    seq,
    text: `cubes successifs ${c ? `${signed(c)} ` : ''}: ${shift}³${c ? signed(c) : ''}, ${shift + 1}³${c ? signed(c) : ''}, ${shift + 2}³${c ? signed(c) : ''}…`,
    arcs: seq.slice(1).map((v, i) => [i, i + 1, signed(v - seq[i])]),
  };
}

function squares(rng, len) {
  const shift = rng.int(1, 6);
  const c = rng.int(-4, 4);
  const seq = Array.from({ length: len }, (_, i) => (i + shift) ** 2 + c);
  return {
    seq,
    text: `carrés successifs${c ? ` ${signed(c)}` : ''} : ${shift}²${c ? signed(c) : ''}, ${shift + 1}²${c ? signed(c) : ''}, ${shift + 2}²${c ? signed(c) : ''}…`,
    arcs: seq.slice(1).map((v, i) => [i, i + 1, signed(v - seq[i])]),
  };
}

function affine(rng, len, { rs = [2, 3], cs = [-3, -2, -1, 1, 2, 3] } = {}) {
  for (let t = 0; t < 60; t++) {
    const r = rng.pick(rs);
    const c = rng.pick(cs);
    const a = rng.int(1, 6) * (rng.chance(0.15) ? -1 : 1);
    const seq = [a];
    for (let i = 1; i < len; i++) seq.push(seq[i - 1] * r + c);
    if (seq.some((v) => Math.abs(v) > LIMIT)) continue;
    if (new Set(seq).size < len) continue;
    const lab = `×${r < 0 ? `(−${-r})` : r} ${signed(c)}`;
    return { seq, text: `récurrence : chaque terme = précédent ×${r < 0 ? `(−${-r})` : r} ${signed(c)}`, arcs: seq.slice(1).map((_, i) => [i, i + 1, lab]) };
  }
  throw new Error('affine');
}

function alternOps(rng, len, { period = 2, mult = false, alpha = false } = {}) {
  for (let t = 0; t < 80; t++) {
    const ops = [];
    for (let p = 0; p < period; p++) {
      if (mult && rng.chance(0.5)) ops.push({ t: '×', v: rng.pick([2, 3]) });
      else ops.push({ t: '+', v: rng.int(alpha ? 1 : 1, alpha ? 4 : 12) * (rng.chance(0.45) ? -1 : 1) });
    }
    if (ops.every((o) => o.t === ops[0].t && o.v === ops[0].v)) continue;
    if (mult && !ops.some((o) => o.t === '×')) continue;
    const a = alpha ? rng.int(1, 26) : rng.int(1, 20);
    const seq = [a];
    for (let i = 1; i < len; i++) seq.push(applyOp(ops[(i - 1) % period], seq[i - 1]));
    if (alpha && seq.some((v) => v < 1 || v > 26)) continue;
    if (seq.some((v) => Math.abs(v) > LIMIT)) continue;
    if (new Set(seq).size < len - 2) continue;
    return {
      seq,
      text: `opérations alternées en cycle de ${period} : ${ops.map(opLabel).join(', puis ')}, puis on recommence`,
      arcs: seq.slice(1).map((_, i) => [i, i + 1, opLabel(ops[i % period])]),
    };
  }
  throw new Error('alternOps');
}

function diffGeom(rng, len, { rs = [2, 3] } = {}) {
  for (let t = 0; t < 40; t++) {
    const r = rng.pick(rs);
    const d0 = rng.int(1, 3) * (rng.chance(0.2) ? -1 : 1);
    const a = rng.int(-5, 20);
    const seq = [a];
    let d = d0;
    for (let i = 1; i < len; i++) { seq.push(seq[i - 1] + d); d *= r; }
    if (seq.some((v) => Math.abs(v) > LIMIT)) continue;
    return {
      seq,
      text: `différences successives multipliées par ${r} à chaque pas (${[d0, d0 * r, d0 * r * r].map(signed).join(', ')}…)`,
      arcs: seq.slice(1).map((v, i) => [i, i + 1, signed(v - seq[i])]),
    };
  }
  throw new Error('diffGeom');
}

function diffAffine(rng, len) {
  for (let t = 0; t < 60; t++) {
    const r = 2;
    const c = rng.pick([-1, 1, 2]);
    const d0 = rng.int(1, 3);
    const a = rng.int(0, 15);
    const seq = [a];
    let d = d0;
    const diffs = [];
    for (let i = 1; i < len; i++) { seq.push(seq[i - 1] + d); diffs.push(d); d = d * r + c; }
    if (seq.some((v) => Math.abs(v) > LIMIT)) continue;
    return {
      seq,
      text: `les différences (${diffs.slice(0, 4).map(signed).join(', ')}…) suivent elles-mêmes la récurrence « ×${r} ${signed(c)} » (règle imbriquée)`,
      arcs: diffs.map((dd, i) => [i, i + 1, signed(dd)]),
    };
  }
  throw new Error('diffAffine');
}

function order2(rng, len, { general = false } = {}) {
  for (let t = 0; t < 80; t++) {
    const p = general ? rng.pick([1, 2, -1]) : 1;
    const q = general ? rng.pick([1, 2, -1, 3]) : rng.pick([1, 1, 2]);
    const c = rng.pick(general ? [-2, -1, 0, 1, 2, 3] : [0, 0, 1, -1, 2]);
    const seq = [rng.int(0, 6), rng.int(1, 7)];
    for (let i = 2; i < len; i++) seq.push(p * seq[i - 1] + q * seq[i - 2] + c);
    if (seq.some((v) => Math.abs(v) > LIMIT)) continue;
    if (new Set(seq).size < len - 1) continue;
    const parts = [];
    parts.push(p === 1 ? 'le terme précédent' : p === -1 ? 'moins le terme précédent' : `${p} × le terme précédent`);
    parts.push(q === 1 ? 'le terme d’avant' : q === -1 ? 'moins le terme d’avant' : `${q} × le terme d’avant`);
    const formula = `${p === 1 ? '' : p === -1 ? '−' : `${p}×`}a(n−1) ${q < 0 ? '−' : '+'} ${Math.abs(q) === 1 ? '' : `${Math.abs(q)}×`}a(n−2)${c ? ` ${signed(c)}` : ''}`;
    return {
      seq,
      text: `récurrence d'ordre 2 : chaque terme = ${parts.join(' + ')}${c ? ` ${signed(c)}` : ''} (a(n) = ${formula})`,
      notes: seq.map((v, i) => (i >= 2 ? [i, `${p === 1 ? '' : p === -1 ? '−' : p + '×'}${seq[i - 1]}${q < 0 ? '−' : '+'}${Math.abs(q) === 1 ? '' : Math.abs(q) + '×'}${Math.abs(seq[i - 2]) === seq[i - 2] ? seq[i - 2] : '(' + seq[i - 2] + ')'}${c ? signed(c) : ''}`] : null)).filter(Boolean),
      arcs: [],
    };
  }
  throw new Error('order2');
}

function indexAffine(rng, len) {
  for (let t = 0; t < 80; t++) {
    const r = rng.pick([2, 3, -2]);
    const c = rng.int(-3, 3);
    const e = rng.pick([1, 2, -1, 3]);
    const seq = [rng.int(1, 5)];
    for (let i = 0; i < len - 1; i++) seq.push(r * seq[i] + c + e * (i + 1));
    if (seq.some((v) => Math.abs(v) > LIMIT)) continue;
    if (new Set(seq).size < len) continue;
    return {
      seq,
      text: `récurrence dépendant du rang : a(n) = ${r}×a(n−1) ${c ? signed(c) + ' ' : ''}${e === 1 ? '+ n' : e === -1 ? '− n' : `${signed(e)}n`} (n = rang du terme, à partir de 1)`,
      arcs: seq.slice(1).map((_, i) => [i, i + 1, `×${r < 0 ? `(−${-r})` : r}${c + e * (i + 1) ? signed(c + e * (i + 1)) : ''}`]),
    };
  }
  throw new Error('indexAffine');
}

const SIMPLE = {
  arith: (rng, len, alpha) => arith(rng, len, { alpha, maxD: alpha ? 4 : 9 }),
  geom: (rng, len) => geom(rng, len),
  poly2: (rng, len, alpha) => poly2(rng, len, { alpha }),
  affine: (rng, len) => affine(rng, len),
};

function interleave(rng, len, k, kinds, alphaSeries = []) {
  const subs = [];
  const parts = [];
  for (let j = 0; j < k; j++) {
    const subLen = Math.ceil((len - j) / k);
    const kind = kinds[j];
    const alpha = alphaSeries.includes(j);
    const res = SIMPLE[kind](rng, subLen, alpha);
    subs.push(res);
    parts.push(`série ${j + 1} (positions ${j + 1}, ${j + 1 + k}, ${j + 1 + 2 * k}…) : ${res.text}`);
  }
  const seq = [];
  const arcs = [];
  for (let i = 0; i < len; i++) seq.push(subs[i % k].seq[Math.floor(i / k)]);
  subs.forEach((s, j) => {
    for (const [a, b, lab] of s.arcs) arcs.push([j + a * k, j + b * k, lab, j]);
  });
  return { seq, text: `${k} suites entrelacées — ${parts.join(' ; ')}`, arcs, series: k };
}

// ---- Choix de la famille selon le niveau ----

function pickFamily(rng, level) {
  const len = [0, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10][level];
  const a = (p) => rng.chance(p);
  let r;
  let display = 'n';
  let alphaSeries = [];
  switch (level) {
    case 1:
      if (a(0.35)) { display = 'a'; r = arith(rng, len, { alpha: true, maxD: 2, neg: false }); } else r = arith(rng, len, { maxD: 9, neg: false });
      break;
    case 2:
      r = rng.pick([
        () => arith(rng, len, { maxD: 12 }),
        () => geom(rng, len),
        () => { display = 'a'; return arith(rng, len, { alpha: true, maxD: 4 }); },
      ])();
      break;
    case 3:
      r = rng.pick([
        () => poly2(rng, len),
        () => alternOps(rng, len, { period: 2 }),
        () => { display = 'a'; return alternOps(rng, len, { period: 2, alpha: true }); },
        () => geom(rng, len),
      ])();
      break;
    case 4:
      r = rng.pick([
        () => interleave(rng, len, 2, ['arith', 'arith']),
        () => affine(rng, len, { rs: [2], cs: [-1, 1, 2, 3] }),
        () => { display = 'a'; return interleave(rng, len, 2, ['arith', 'arith'], [0, 1]); },
        () => poly2(rng, len, { big: true }),
      ])();
      break;
    case 5:
      r = rng.pick([
        () => alternOps(rng, len, { period: 2, mult: true }),
        () => diffGeom(rng, len, { rs: [2] }),
        () => interleave(rng, len, 2, rng.shuffle(['arith', 'geom'])),
        () => squares(rng, len),
        () => { display = 'mix'; alphaSeries = [0]; return interleave(rng, len, 2, ['arith', 'arith'], [0]); },
      ])();
      break;
    case 6:
      r = rng.pick([
        () => affine(rng, len, { rs: [2, 3, -2], cs: [-4, -3, -2, 2, 3, 5] }),
        () => alternOps(rng, len, { period: 3 }),
        () => poly2(rng, len, { big: true }),
        () => { display = 'mix'; alphaSeries = [1]; return interleave(rng, len, 2, ['poly2', 'arith'], [1]); },
        () => diffGeom(rng, len, { rs: [2, 3] }),
      ])();
      break;
    case 7:
      r = rng.pick([
        () => order2(rng, len),
        () => poly3(rng, len),
        () => interleave(rng, len, 3, ['arith', 'arith', 'arith']),
        () => diffGeom(rng, len, { rs: [3] }),
        () => alternOps(rng, len, { period: 3, mult: true }),
      ])();
      break;
    case 8:
      r = rng.pick([
        () => interleave(rng, len, 2, rng.shuffle(['affine', 'poly2'])),
        () => indexAffine(rng, len),
        () => alternOps(rng, len, { period: 3, mult: true }),
        () => diffAffine(rng, len),
        () => order2(rng, len, { general: true }),
      ])();
      break;
    case 9:
      r = rng.pick([
        () => order2(rng, len, { general: true }),
        () => interleave(rng, len, 3, rng.shuffle(['arith', 'geom', 'poly2'])),
        () => alternOps(rng, len, { period: 3, mult: true }),
        () => diffAffine(rng, len),
        () => { display = 'mix'; alphaSeries = [1]; return interleave(rng, len, 3, ['geom', 'arith', 'arith'], [1]); },
      ])();
      break;
    default:
      r = rng.pick([
        () => order2(rng, len, { general: true }),
        () => interleave(rng, len, 3, rng.shuffle(['affine', 'geom', 'poly2'])),
        () => indexAffine(rng, len),
        () => diffAffine(rng, len),
        () => interleave(rng, len, 2, ['affine', 'affine']),
      ])();
  }
  const types = r.seq.map((_, i) => {
    if (display === 'a') return 'a';
    if (display === 'mix') return alphaSeries.includes(i % (r.series || 1)) ? 'a' : 'n';
    return 'n';
  });
  return { ...r, types, len };
}

function digitSwap(v) {
  const s = String(Math.abs(v));
  if (s.length < 2) return null;
  const sw = s.slice(0, -2) + s[s.length - 1] + s[s.length - 2];
  const out = Number(sw) * Math.sign(v);
  return out !== v ? out : null;
}

export function generate(rng, level) {
  const fam = pickFamily(rng, level);
  const { seq, types } = fam;
  const len = seq.length;
  // Terme manquant : le dernier, ou un terme intérieur aux niveaux élevés.
  let missing = len - 1;
  if (level >= 6 && rng.chance(level >= 9 ? 0.45 : 0.3)) missing = rng.int(Math.max(3, len - 4), len - 2);
  const key = seq[missing];
  const type = types[missing];
  const nOpts = level <= 2 ? 5 : 6;
  // Distracteurs plausibles : erreurs de modèle (continuation linéaire naïve,
  // mauvaise différence, mauvaise série…) et au plus deux valeurs proches, placées
  // du même côté de la clé pour que la bonne réponse ne soit pas « la médiane ».
  const valid = (v) => Number.isInteger(v) && v !== key && (type !== 'a' || (v >= 1 && v <= 26)) && Math.abs(v) <= LIMIT * 2;
  const prev = seq[missing - 1], prev2 = seq[missing - 2];
  const modelCands = [prev + (prev - prev2), key + (key - prev), prev * 2, prev + prev2, key * 2, key - (key - prev) * 2];
  if (missing >= 3) modelCands.push(prev + (seq[missing - 2] - seq[missing - 3]));
  if (missing + 1 < len) modelCands.push(seq[missing + 1] + (seq[missing + 1] - key) * -1, Math.round((prev + seq[missing + 1]) / 2));
  const ds = digitSwap(key);
  if (ds !== null) modelCands.push(ds);
  if (fam.series) modelCands.push(seq[missing - 1], seq[missing - 2] + (seq[missing - 2] - (seq[missing - 2 - fam.series] ?? seq[missing - 2])));
  const pool = [];
  const push = (v) => { if (valid(v) && !pool.includes(v)) pool.push(v); };
  const d1 = rng.pick([1, -1, 2, -2]);
  push(key + d1);
  if (rng.chance(0.6)) push(key + d1 + Math.sign(d1));
  for (const v of rng.shuffle(modelCands)) if (pool.length < nOpts - 1) push(v);
  let spread = 3;
  while (pool.length < nOpts - 1 && spread < 60) {
    push(key + rng.int(-spread, spread) * (Math.abs(key) > 200 ? 10 : 1));
    spread++;
  }
  if (pool.length < nOpts - 1) throw new Error('distracteurs');
  const answer = rng.int(0, nOpts - 1);
  const values = pool.slice();
  values.splice(answer, 0, key);
  const terms = seq.map((v, i) => (i === missing ? null : v));
  const rules = [{ title: 'Règle', text: fam.text.charAt(0).toUpperCase() + fam.text.slice(1) + '.' }];
  if (types.includes('a')) rules.push({ title: 'Lettres', text: 'Les lettres sont lues par leur rang dans l’alphabet (A = 1, B = 2, … Z = 26).' });
  rules.push({ title: 'Terme manquant', text: `Position ${missing + 1} : ${showValue(key, type)}${type === 'a' ? ` (rang ${key})` : ''}.` });
  return {
    category: 'sequences',
    level,
    subtype: types.includes('a') ? (types.includes('n') ? 'mixte' : 'alphabétique') : 'numérique',
    prompt: missing === len - 1 ? 'Quel terme vient ensuite ?' : `Quel terme remplace le point d’interrogation (position ${missing + 1}) ?`,
    data: { terms, types, missing, full: seq, arcs: fam.arcs || [], notes: fam.notes || [], series: fam.series || 1 },
    options: values.map((v) => ({ value: v, type })),
    answer,
    rules,
    timeLimit: TIME_LIMITS[level],
  };
}

// ---------- Rendu ----------

const BOX = 62, GAP = 10;

export function renderStimulus(item) {
  const { terms, types } = item.data;
  const W = terms.length * (BOX + GAP) + GAP;
  let body = '';
  terms.forEach((v, i) => {
    const x = GAP + i * (BOX + GAP);
    body += `<rect class="${v === null ? 'sq-box missing' : 'sq-box'}" x="${x}" y="10" width="${BOX}" height="${BOX}" rx="8"/>`;
    const txt = v === null ? '?' : showValue(v, types[i]);
    const fs = txt.length > 5 ? 15 : txt.length > 3 ? 19 : 26;
    body += `<text class="sq-text" x="${x + BOX / 2}" y="${10 + BOX / 2 + fs / 3}" text-anchor="middle" font-size="${fs}">${esc(txt)}</text>`;
  });
  return svg(W, BOX + 20, body, 'stim seq', `Suite : ${terms.map((v, i) => (v === null ? '?' : showValue(v, types[i]))).join(', ')}`);
}

export function renderOption(item, i) {
  const o = item.options[i];
  return `<span class="opt-text">${esc(showValue(o.value, o.type))}</span>`;
}

export function renderExplanation(item) {
  const { full, types, arcs, notes, missing, series } = item.data;
  const n = full.length;
  const top = 70, W = n * (BOX + GAP) + GAP, H = top + BOX + (series > 1 ? 70 : 40) + (notes.length ? 26 : 0);
  let body = '';
  const cx = (i) => GAP + i * (BOX + GAP) + BOX / 2;
  arcs.forEach(([a, b, lab, s = 0]) => {
    const below = s === 1;
    const lift = s === 2 ? 58 : 38;
    const x1 = cx(a), x2 = cx(b);
    const y = below ? top + BOX : top;
    const yc = below ? y + lift : y - lift;
    body += `<path class="sq-arc s${s}" d="M${x1} ${y} Q${(x1 + x2) / 2} ${yc} ${x2} ${y}"/>`;
    body += `<text class="sq-lab s${s}" x="${(x1 + x2) / 2}" y="${below ? yc + 2 : yc + 14}" text-anchor="middle">${esc(lab)}</text>`;
  });
  full.forEach((v, i) => {
    const x = GAP + i * (BOX + GAP);
    body += `<rect class="${i === missing ? 'sq-box answer' : 'sq-box'}" x="${x}" y="${top}" width="${BOX}" height="${BOX}" rx="8"/>`;
    const txt = showValue(v, types[i]);
    const fs = txt.length > 5 ? 15 : txt.length > 3 ? 19 : 26;
    body += `<text class="sq-text" x="${x + BOX / 2}" y="${top + BOX / 2 + fs / 3}" text-anchor="middle" font-size="${fs}">${esc(txt)}</text>`;
    if (types[i] === 'a') body += `<text class="sq-sub" x="${x + BOX / 2}" y="${top + BOX - 5}" text-anchor="middle">${v}</text>`;
  });
  notes.forEach(([i, lab]) => {
    body += `<text class="sq-note" x="${cx(i)}" y="${H - 8}" text-anchor="middle">${esc(lab)}</text>`;
  });
  let html = `<div class="exp-visual">${svg(W, H, body, 'stim seq', 'Suite complétée avec ses opérations')}</div><ol class="rule-list">`;
  for (const r of item.rules) html += `<li><strong>${esc(r.title)}</strong> — ${esc(r.text)}</li>`;
  return html + '</ol>';
}

export default { id: 'sequences', generate, renderStimulus, renderOption, renderExplanation };
