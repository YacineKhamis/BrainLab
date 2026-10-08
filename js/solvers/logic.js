// Solveur logique indépendant :
// - syllogismes : énumération exhaustive de tous les « mondes » (ensembles de
//   régions de Venn non vides), en bitmasks ;
// - propositions : table de vérité complète ;
// - grilles : énumération de toutes les répartitions compatibles.

// ---------- Syllogismes ----------
function regionMask(st, k) {
  let m = 0;
  for (let r = 0; r < 1 << k; r++) {
    const inS = Boolean(r & (1 << st.s)) !== Boolean(st.sNeg);
    const inP = Boolean(r & (1 << st.p)) !== Boolean(st.pNeg);
    const hit = st.form === 'A' || st.form === 'O' ? inS && !inP : inS && inP;
    if (hit) m |= 1 << r;
  }
  return m;
}
function syllTruth(st, k, W) {
  const m = regionMask(st, k);
  let v = st.form === 'A' || st.form === 'E' ? (W & m) === 0 : (W & m) !== 0;
  if (st.neg % 2) v = !v;
  return v;
}
function describeWorld(W, k, terms) {
  const parts = [];
  for (let r = 0; r < 1 << k; r++) {
    if (!(W & (1 << r))) continue;
    const yes = [], no = [];
    for (let t = 0; t < k; t++) (r & (1 << t) ? yes : no).push(terms[t]);
    parts.push(yes.length ? `un élément ${yes.join(' + ')}${no.length ? ` (non ${no.join(', non ')})` : ''}` : `un élément hors de toutes les catégories`);
  }
  return parts.join(' ; ');
}
function solveSyllo(item) {
  const { k, terms, premises } = item.data;
  const R = 1 << k;
  const termMasks = [];
  for (let t = 0; t < k; t++) {
    let m = 0;
    for (let r = 0; r < R; r++) if (r & (1 << t)) m |= 1 << r;
    termMasks.push(m);
  }
  const worlds = [];
  for (let W = 1; W < 1 << R; W++) {
    if (!termMasks.every((m) => W & m)) continue;
    if (premises.every((p) => syllTruth(p, k, W))) worlds.push(W);
  }
  if (!worlds.length) return { ok: false, reason: 'prémisses contradictoires' };
  const correct = [];
  const notes = item.options.map((o, i) => {
    let counter = null;
    for (const W of worlds) if (!syllTruth(o.st, k, W)) {
      if (counter === null || popcount(W) < popcount(counter)) counter = W;
    }
    if (counter === null) { correct.push(i); return 'Vraie dans toutes les situations compatibles avec les prémisses.'; }
    const always = worlds.every((W) => !syllTruth(o.st, k, W));
    return always
      ? 'Toujours fausse : elle contredit les prémisses.'
      : `Pas nécessaire. Contre-exemple : ${describeWorld(counter, k, terms)}.`;
  });
  return { correct, notes };
}
function popcount(x) {
  let c = 0;
  while (x) { c += x & 1; x >>>= 1; }
  return c;
}

// ---------- Propositions ----------
function ev(f, v) {
  if (f.op === 'lit') return f.neg ? !v[f.i] : v[f.i];
  if (f.op === 'not') return !ev(f.a, v);
  const a = ev(f.a, v), b = ev(f.b, v);
  return { and: a && b, or: a || b, xor: a !== b, imp: !a || b, iff: a === b }[f.op];
}
function solveProp(item) {
  const { m, premises, atoms } = item.data;
  const rows = [];
  for (let mask = 0; mask < 1 << m; mask++) {
    const v = [...Array(m).keys()].map((i) => Boolean(mask & (1 << i)));
    if (premises.every((p) => ev(p, v))) rows.push(v);
  }
  if (!rows.length) return { ok: false, reason: 'prémisses contradictoires' };
  const correct = [];
  const notes = item.options.map((o, i) => {
    const bad = rows.find((v) => !ev(o.f, v));
    if (!bad) { correct.push(i); return 'Vraie dans toutes les situations compatibles.'; }
    if (rows.every((v) => !ev(o.f, v))) return 'Fausse dans toutes les situations compatibles : elle contredit les prémisses.';
    return `Pas certaine. Contre-exemple : ${bad.map((b, j) => (b ? atoms[j].p : atoms[j].n)).join(', ')}.`;
  });
  return { correct, notes };
}

// ---------- Grilles ----------
function holds(c, sol, n) {
  const pos = (a, v) => sol[a].indexOf(v);
  const p1 = pos(c.a1, c.v1);
  const p2 = c.a2 ? pos(c.a2, c.v2) : null;
  const base = {
    same: () => p1 === p2,
    at: () => p1 === c.pos,
    leftAdj: () => p2 - p1 === 1,
    left: () => p1 < p2,
    next: () => p1 - p2 === 1 || p2 - p1 === 1,
    edge: () => p1 === 0 || p1 === n - 1,
  }[c.type]();
  return c.neg % 2 === 1 ? !base : base;
}
function allPerms(n) {
  const res = [];
  const a = [...Array(n).keys()];
  const heap = (k) => {
    if (k === 1) { res.push(a.slice()); return; }
    for (let i = 0; i < k; i++) {
      heap(k - 1);
      const j = k % 2 ? 0 : i;
      [a[j], a[k - 1]] = [a[k - 1], a[j]];
    }
  };
  heap(n);
  return res;
}
function solveGrid(item) {
  const { n, clues, qAttr, byAttr, byVal } = item.data;
  const perms = allPerms(n);
  // attributs les plus cités en premier (élagage plus précoce)
  const cited = (a) => clues.reduce((s, c) => s + (c.a1 === a) + (c.a2 === a), 0);
  const attrs = item.data.attrs.slice().sort((x, y) => cited(y) - cited(x));
  const answers = new Map();
  const sol = {};
  let count = 0;
  const ready = (c, i) => [c.a1, c.a2].filter(Boolean).every((a) => attrs.indexOf(a) <= i);
  const stageClues = attrs.map((_, i) => clues.filter((c) => ready(c, i) && !(i > 0 && ready(c, i - 1))));
  const rec = (i) => {
    if (count > 20000) return;
    if (i === attrs.length) {
      count++;
      const v = sol[qAttr][sol[byAttr].indexOf(byVal)];
      answers.set(v, (answers.get(v) || 0) + 1);
      return;
    }
    for (const p of perms) {
      sol[attrs[i]] = p;
      if (stageClues[i].every((c) => holds(c, sol, n))) rec(i + 1);
    }
    delete sol[attrs[i]];
  };
  rec(0);
  if (!count) return { ok: false, reason: 'aucune solution' };
  const correct = [];
  const notes = item.options.map((o, i) => {
    if (answers.has(o.value)) { correct.push(i); return `Seule valeur compatible avec les ${clues.length} indices.`; }
    return 'Aucune répartition respectant tous les indices ne donne cette réponse.';
  });
  return { correct, notes };
}

export function solve(item) {
  const fn = { syllo: solveSyllo, prop: solveProp, grid: solveGrid }[item.data.kind];
  const r = fn(item);
  if (r.ok === false) return r;
  const texts = item.options.map((o) => o.text);
  if (new Set(texts).size !== texts.length) return { ok: false, reason: 'options identiques' };
  if (r.correct.length !== 1) return { ok: false, reason: `${r.correct.length} options correctes` };
  if (r.correct[0] !== item.answer) return { ok: false, reason: 'clé incorrecte' };
  return { ok: true, correct: r.correct, notes: r.notes };
}

export default { solve };
