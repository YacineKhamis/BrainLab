// Balances (type WAIS-IV, raisonnement perceptif / quantitatif) : des balances
// en équilibre indiquent des équivalences de poids entre formes ; il faut choisir
// ce qui équilibre la dernière balance. Les poids sont déterminés (à un facteur
// près) par les balances affichées ; les distracteurs pèsent tous un autre poids.

import { esc, svg, fmt } from '../util.js';

export const SHAPES = ['cercle', 'carré', 'triangle', 'étoile', 'losange'];
export const LEVELS = [null,
  { k: 2, side: 3, mixed: false, time: 30 },
  { k: 2, side: 4, mixed: false, time: 30 },
  { k: 3, side: 3, mixed: false, time: 30 },
  { k: 3, side: 4, mixed: false, time: 40 },
  { k: 3, side: 4, mixed: true, time: 40 },
  { k: 4, side: 4, mixed: false, time: 45 },
  { k: 4, side: 4, mixed: true, time: 45 },
  { k: 4, side: 5, mixed: true, time: 50 },
  { k: 5, side: 5, mixed: true, time: 60 },
  { k: 5, side: 6, mixed: true, time: 60 },
];

const fr = (x) => fmt(x).replace('.', ',');
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
const total = (v) => v.reduce((s, x) => s + x, 0);

// Rang d'une matrice entière (élimination en rationnels exacts via produits croisés).
export function rank(rows) {
  const M = rows.map((r) => r.slice());
  let rk = 0;
  const cols = M.length ? M[0].length : 0;
  for (let c = 0; c < cols && rk < M.length; c++) {
    const p = M.findIndex((r, i) => i >= rk && r[c] !== 0);
    if (p < 0) continue;
    [M[rk], M[p]] = [M[p], M[rk]];
    for (let i = 0; i < M.length; i++) {
      if (i === rk || M[i][c] === 0) continue;
      const a = M[rk][c], b = M[i][c];
      M[i] = M[i].map((x, j) => x * a - M[rk][j] * b);
      const g = M[i].reduce((s, x) => gcd(s, Math.abs(x)), 0) || 1;
      M[i] = M[i].map((x) => x / g);
    }
    rk++;
  }
  return rk;
}
function gcd(a, b) { return b ? gcd(b, a % b) : a; }

// Tous les vecteurs de comptes sur les formes « allowed » de poids w, avec au plus maxN objets.
function combos(w, allowed, target, maxN) {
  const out = [];
  const rec = (i, cur, wt, n) => {
    if (wt === target && n > 0) { out.push(cur.slice()); return; }
    if (i >= allowed.length || wt >= target || n >= maxN) return;
    const s = allowed[i];
    for (let c = 0; n + c <= maxN && wt + c * w[s] <= target; c++) {
      cur[s] = c;
      rec(i + 1, cur, wt + c * w[s], n + c);
    }
    cur[s] = 0;
  };
  rec(0, Array(w.length).fill(0), 0, 0);
  return out;
}

export function generate(rng, level) {
  const cfg = LEVELS[level];
  const { k } = cfg;
  // Poids distincts, la forme 0 étant la plus lourde. Sans plateaux mixtes, chaque
  // poids est un multiple du suivant (chaîne de substitutions simples).
  let w;
  if (cfg.mixed) w = rng.sample([1, 2, 3, 4, 5, 6, 8, 9, 10, 12], k).sort((a, b) => b - a);
  else {
    w = [rng.int(1, 2)];
    while (w.length < k) w.unshift(w[0] * rng.int(2, 3));
  }
  const shapes = rng.sample([0, 1, 2, 3, 4], k);
  const eqs = [];
  for (let guard = 0; eqs.length < k - 1 && guard < 200; guard++) {
    const nl = cfg.mixed && rng.chance(0.5) ? 2 : 1;
    const left = Array(k).fill(0);
    const lshapes = rng.sample([...Array(k).keys()], nl);
    for (const s of lshapes) left[s] = rng.int(1, nl === 1 ? 2 : 1);
    const others = [...Array(k).keys()].filter((s) => !lshapes.includes(s));
    let rights = combos(w, others, dot(left, w), cfg.side);
    if (!cfg.mixed) rights = rights.filter((r) => r.filter((x) => x).length === 1);
    if (!rights.length) continue;
    const right = rng.pick(rights);
    const row = left.map((x, i) => x - right[i]);
    if (rank(eqs.map((e) => e.row).concat([row])) !== eqs.length + 1) continue;
    eqs.push({ left, right, row });
  }
  if (eqs.length !== k - 1) throw new Error('équations');
  // Balance à compléter.
  const ql = Array(k).fill(0);
  const qshapes = cfg.mixed ? rng.sample([...Array(k).keys()], rng.chance(0.6) ? 2 : 1) : [rng.int(0, k - 2)];
  for (const s of qshapes) ql[s] = k === 2 ? rng.int(2, 3) : rng.int(1, 2);
  const others = [...Array(k).keys()].filter((s) => !qshapes.includes(s));
  const maxAns = cfg.side + (k === 2 ? 4 : 1);
  let answers = combos(w, others, dot(ql, w), maxAns);
  if (!cfg.mixed) answers = answers.filter((r) => r.filter((x) => x).length === 1);
  // La réponse ne doit pas se lire directement sur une balance affichée.
  answers = answers.filter((a) => !eqs.some((e) => (e.left.join() === ql.join() && e.right.join() === a.join()) || (e.right.join() === ql.join() && e.left.join() === a.join())));
  if (!answers.length) throw new Error('réponse');
  const answerVec = rng.pick(answers);
  const target = dot(ql, w);
  // Distracteurs : une unité de plus ou de moins, une forme remplacée, ou la bonne
  // quantité d'une autre forme — tous d'un poids différent.
  const lures = [];
  const seen = new Set([answerVec.join()]);
  const tryAdd = (v) => {
    if (v.some((x) => x < 0) || total(v) === 0 || total(v) > maxAns + 1) return;
    if (dot(v, w) === target || seen.has(v.join())) return;
    if (v.some((x, i) => x && qshapes.includes(i)) && rng.chance(0.7)) return;
    seen.add(v.join());
    lures.push(v);
  };
  for (let guard = 0; lures.length < 4 && guard < 300; guard++) {
    const v = answerVec.slice();
    const nz = v.map((x, i) => (x ? i : -1)).filter((i) => i >= 0);
    const t = rng.int(0, 5);
    const i = rng.pick(nz);
    if (t === 0 || t === 4) v[i] += t === 0 ? 1 : 2;
    else if (t === 1 || t === 5) v[i] -= t === 1 ? 1 : 2;
    else if (t === 2) { const j = rng.pick(others); v[j] += v[i]; v[i] = 0; } else { const j = rng.int(0, k - 1); v[j] += 1; v[i] -= 1; }
    tryAdd(v);
  }
  if (lures.length < 4) throw new Error('distracteurs');
  const answer = rng.int(0, 4);
  const opts = rng.shuffle(lures);
  opts.splice(answer, 0, answerVec);
  const name = (v) => v.map((x, i) => (x ? `${x} ${SHAPES[shapes[i]]}${x > 1 ? 's' : ''}` : '')).filter(Boolean).join(' + ');
  const unit = w[k - 1];
  return {
    category: 'balances', level, subtype: `${k} formes, ${k - 1} balance${k > 2 ? 's' : ''}`,
    prompt: 'Les balances du haut sont en équilibre. Que faut-il placer sur le plateau vide pour équilibrer la dernière balance ?',
    data: { shapes, eqs: eqs.map((e) => ({ left: e.left, right: e.right })), query: ql, weights: w },
    options: opts.map((v) => ({ counts: v })),
    answer,
    rules: [
      { title: 'Poids relatifs', text: `En prenant ${SHAPES[shapes[k - 1]]} = 1 : ${w.map((x, i) => `${SHAPES[shapes[i]]} = ${fr(x / unit)}`).join(' ; ')}.` },
      { title: 'Calcul', text: `${name(ql)} pèse ${fr(target / unit)} ; ${name(answerVec)} pèse aussi ${fr(dot(answerVec, w) / unit)}.` },
    ],
    timeLimit: cfg.time,
  };
}

// ---------------- Rendu

function shapeBody(kind, cx, cy, r) {
  const cls = `bl-s bl-${kind}`;
  if (kind === 0) return `<circle class="${cls}" cx="${cx}" cy="${cy}" r="${r}"/>`;
  if (kind === 1) return `<rect class="${cls}" x="${cx - r * 0.88}" y="${cy - r * 0.88}" width="${r * 1.76}" height="${r * 1.76}"/>`;
  if (kind === 2) return `<polygon class="${cls}" points="${cx},${cy - r} ${cx + r},${cy + r * 0.8} ${cx - r},${cy + r * 0.8}"/>`;
  if (kind === 3) {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r;
      pts.push(`${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`);
    }
    return `<polygon class="${cls}" points="${pts.join(' ')}"/>`;
  }
  return `<polygon class="${cls}" points="${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}"/>`;
}

// Objets d'un plateau, disposés en rangées de 3 au-dessus de la ligne y0.
function pile(counts, shapes, cx, y0, r) {
  const list = [];
  counts.forEach((c, i) => { for (let t = 0; t < c; t++) list.push(shapes[i]); });
  let b = '';
  const per = 3, step = r * 2.3;
  list.forEach((kind, j) => {
    const row = Math.floor(j / per), col = j % per;
    const inRow = Math.min(per, list.length - row * per);
    b += shapeBody(kind, cx + (col - (inRow - 1) / 2) * step, y0 - r - 2 - row * step, r);
  });
  return b;
}

function balanceSvg(left, right, shapes, label, unknown = false) {
  const W = 260, H = 130, r = 10;
  let b = `<polygon class="bl-stand" points="${W / 2},62 ${W / 2 - 14},${H - 8} ${W / 2 + 14},${H - 8}"/>`;
  b += `<line class="bl-beam" x1="30" y1="62" x2="${W - 30}" y2="62"/><line class="bl-plate" x1="10" y1="62" x2="110" y2="62"/><line class="bl-plate" x1="${W - 110}" y1="62" x2="${W - 10}" y2="62"/>`;
  b += pile(left, shapes, 60, 60, r);
  b += unknown ? `<text class="bl-q" x="${W - 60}" y="52" text-anchor="middle">?</text>` : pile(right, shapes, W - 60, 60, r);
  return svg(W, H, b, 'balance', label);
}

export function renderStimulus(item) {
  const { eqs, shapes, query } = item.data;
  return `<div class="bl-grid">${eqs.map((e, i) => balanceSvg(e.left, e.right, shapes, `Balance ${i + 1}`)).join('')}<div class="bl-query">${balanceSvg(query, null, shapes, 'Balance à équilibrer', true)}</div></div>`;
}

export function renderOption(item, i) {
  const counts = item.options[i].counts;
  const n = total(counts);
  const r = 11, step = r * 2.4, per = 4;
  let b = '';
  let j = 0;
  counts.forEach((c, s) => {
    for (let t = 0; t < c; t++, j++) b += shapeBody(item.data.shapes[s], r + 2 + (j % per) * step, r + 2 + Math.floor(j / per) * step, r);
  });
  const cols = Math.min(per, n), rows = Math.ceil(n / per);
  return svg(cols * step + 4, rows * step + 4, b, 'bl-opt', `Option ${i + 1}`);
}

export function renderExplanation(item) {
  let html = `<div class="exp-visual">${renderStimulus(item)}</div><ol class="rule-list">`;
  for (const r of item.rules) html += `<li><strong>${esc(r.title)}</strong> — ${esc(r.text)}</li>`;
  return `${html}</ol>`;
}

export default { id: 'balances', generate, renderStimulus, renderOption, renderExplanation };
