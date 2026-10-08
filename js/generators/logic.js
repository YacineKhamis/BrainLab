// Logique : syllogismes, logique propositionnelle avec négations multiples,
// grilles de contraintes (type « énigme d'Einstein »).

import { esc } from '../util.js';

const TIME_LIMITS = [0, 45, 50, 60, 70, 80, 90, 110, 100, 90, 80];

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const que = (s) => (/^[aeiouéèêhAEIOUÉ]/.test(s) ? `qu’${s}` : `que ${s}`);

// ======================= Syllogismes =======================

const TERMS = ['brac', 'dulpe', 'fimol', 'glart', 'kèbre', 'lumin', 'morvel', 'nastre', 'pirol', 'quabe', 'ruton', 'sibel', 'tarpe', 'vosk'];

export function syllText(st, terms) {
  const sg = (i, n) => (n ? `non-${terms[i]}` : terms[i]);
  const pl = (i, n) => `${sg(i, n)}s`;
  const S = st.s, P = st.p;
  const ind = {
    A: `tous les ${pl(S, st.sNeg)} sont des ${pl(P, st.pNeg)}`,
    E: `aucun ${sg(S, st.sNeg)} n’est un ${sg(P, st.pNeg)}`,
    I: `certains ${pl(S, st.sNeg)} sont des ${pl(P, st.pNeg)}`,
    O: `certains ${pl(S, st.sNeg)} ne sont pas des ${pl(P, st.pNeg)}`,
  }[st.form];
  const subj = {
    A: `tous les ${pl(S, st.sNeg)} soient des ${pl(P, st.pNeg)}`,
    E: `aucun ${sg(S, st.sNeg)} ne soit un ${sg(P, st.pNeg)}`,
    I: `certains ${pl(S, st.sNeg)} soient des ${pl(P, st.pNeg)}`,
    O: `certains ${pl(S, st.sNeg)} ne soient pas des ${pl(P, st.pNeg)}`,
  }[st.form];
  if (!st.neg) return `${cap(ind)}.`;
  const layers = st.layers || Array(st.neg).fill('faux');
  let txt = subj;
  for (let i = layers.length - 1; i >= 0; i--) {
    const outer = i === 0;
    const w = layers[i] === 'faux'
      ? (outer ? 'il est faux' : 'il soit faux')
      : (outer ? 'il n’est pas vrai' : 'il ne soit pas vrai');
    txt = `${w} ${que(txt)}`;
  }
  return `${cap(txt)}.`;
}

// Contrainte normalisée : { u: Set régions vides } ou { x: Set régions dont une non vide }
function syllConstraint(st, k) {
  const R = 1 << k;
  const set = [];
  for (let r = 0; r < R; r++) {
    const S = ((r >> st.s) & 1) !== (st.sNeg ? 1 : 0);
    const P = ((r >> st.p) & 1) !== (st.pNeg ? 1 : 0);
    if ((st.form === 'A' || st.form === 'O') ? S && !P : S && P) set.push(r);
  }
  let universal = st.form === 'A' || st.form === 'E';
  if (st.neg % 2) universal = !universal;
  return universal ? { u: set } : { x: set };
}

function syllSat(constraints, k) {
  const R = 1 << k;
  const forbidden = new Set();
  constraints.forEach((c) => c.u && c.u.forEach((r) => forbidden.add(r)));
  const ex = constraints.filter((c) => c.x).map((c) => c.x);
  for (let t = 0; t < k; t++) ex.push([...Array(R).keys()].filter((r) => (r >> t) & 1));
  return ex.every((xs) => xs.some((r) => !forbidden.has(r)));
}
const negateC = (c) => (c.u ? { x: c.u } : { u: c.x });
function syllEntails(prem, st, k) {
  return !syllSat([...prem.map((p) => syllConstraint(p, k)), negateC(syllConstraint(st, k))], k);
}

// Reformulations équivalentes (pour les niveaux élevés).
const CONTRA = { A: 'O', O: 'A', E: 'I', I: 'E' };
const OBVERT = { A: 'E', E: 'A', I: 'O', O: 'I' };
function rephrase(rng, st, depth, allowComplement) {
  let s = { ...st };
  for (let i = 0; i < depth; i++) {
    const r = rng.next();
    if (r < 0.45) s = { ...s, form: CONTRA[s.form], neg: s.neg + 1 };
    else if (r < 0.7 && allowComplement) s = { ...s, form: OBVERT[s.form], pNeg: !s.pNeg };
    else s = { ...s, neg: s.neg + 2 };
  }
  // la négation d'une phrase niée se lit « il est faux qu'il soit faux… » : on limite à 3 couches
  if (s.neg > 3) s = { ...s, neg: s.neg - 2 };
  s.layers = Array.from({ length: s.neg }, () => (rng.chance(0.5) ? 'faux' : 'vrai'));
  return s;
}

function genSyllogism(rng, level) {
  const k = level <= 3 ? 3 : 4;
  const nPrem = [0, 2, 2, 3, 3, 3, 3, 4, 4, 5, 5][level];
  const forms = level === 1 ? ['A', 'E'] : level <= 3 ? ['A', 'A', 'E', 'I'] : ['A', 'A', 'E', 'E', 'I', 'O'];
  const nOpts = level <= 4 ? 4 : 5;
  const terms = rng.sample(TERMS, k);
  for (let attempt = 0; attempt < 60; attempt++) {
    const order = rng.shuffle([...Array(k).keys()]);
    const pairs = [];
    for (let i = 0; i + 1 < k; i++) pairs.push([order[i], order[i + 1]]);
    while (pairs.length < nPrem) {
      const a = rng.int(0, k - 1);
      let b = rng.int(0, k - 1);
      if (a === b) b = (b + 1) % k;
      pairs.push([a, b]);
    }
    const prem = rng.shuffle(pairs.slice(0, nPrem)).map(([a, b]) => {
      const [s, p] = rng.chance(0.5) ? [a, b] : [b, a];
      return { form: rng.pick(forms), s, p, sNeg: false, pNeg: false, neg: 0 };
    });
    if (!syllSat(prem.map((p) => syllConstraint(p, k)), k)) continue;
    const all = [];
    for (let s = 0; s < k; s++) for (let p = 0; p < k; p++) {
      if (s === p) continue;
      for (const form of ['A', 'E', 'I', 'O']) all.push({ form, s, p, sNeg: false, pNeg: false, neg: 0 });
    }
    const entailed = all.filter((c) => syllEntails(prem, c, k));
    const nontrivial = entailed.filter((c) => prem.every((p) => !syllEntails([p], c, k)));
    if (!nontrivial.length) continue;
    const key = rng.pick(nontrivial);
    const consistent = all.filter((c) => !entailed.includes(c) && syllSat([...prem.map((p) => syllConstraint(p, k)), syllConstraint(c, k)], k));
    const contradicted = all.filter((c) => !entailed.includes(c) && !consistent.includes(c));
    // pièges : mêmes termes que la clé, conversions, puis le reste
    const trap = (c) => (c.s === key.p && c.p === key.s ? 0 : (c.s === key.s && c.p === key.p) ? 1 : 2);
    const pool = [...rng.shuffle(consistent).sort((a, b) => trap(a) - trap(b)), ...rng.shuffle(contradicted)];
    const chosen = [];
    for (const c of pool) {
      if (chosen.length >= nOpts - 1) break;
      if (level <= 4 && contradicted.includes(c) && chosen.length < nOpts - 2 && rng.chance(0.5)) continue;
      chosen.push(c);
    }
    if (chosen.length < nOpts - 1) continue;
    const negDepth = [0, 0, 0, 0, 0, 1, 1, 2, 2, 3, 3][level];
    const comp = level >= 6;
    const show = (st, d) => (d ? rephrase(rng, st, d, comp) : st);
    const premShown = prem.map((p) => show(p, negDepth && rng.chance(0.7) ? rng.int(1, negDepth) : 0));
    const optsShown = [key, ...chosen].map((c) => show(c, level >= 7 && rng.chance(0.5) ? rng.int(1, negDepth) : 0));
    const order2 = rng.shuffle([...optsShown.keys()]);
    const options = order2.map((i) => ({ st: optsShown[i], text: syllText(optsShown[i], terms) }));
    const answer = order2.indexOf(0);
    return {
      subtype: 'syllogisme',
      prompt: 'D’après les prémisses, quelle conclusion est NÉCESSAIREMENT vraie ?',
      data: { kind: 'syllo', k, terms, premises: premShown, premiseTexts: premShown.map((p) => syllText(p, terms)), canon: prem.map((p) => syllText(p, terms)) },
      options,
      answer,
      rules: [
        { title: 'Convention', text: 'Chaque catégorie contient au moins un élément ; « certains » signifie « au moins un ».' },
        { title: 'Prémisses sans négations', text: prem.map((p) => syllText(p, terms)).join(' ') },
        { title: 'Conclusion', text: `${syllText(key, terms)} Elle est vraie dans toutes les situations compatibles avec les prémisses ; chaque autre proposition admet un contre-exemple.` },
      ],
    };
  }
  throw new Error('syllogisme');
}

// ======================= Logique propositionnelle =======================

const ATOMS = [
  { p: 'il pleut', n: 'il ne pleut pas' },
  { p: 'Marc vient', n: 'Marc ne vient pas' },
  { p: 'le train est en retard', n: 'le train n’est pas en retard' },
  { p: 'la porte est ouverte', n: 'la porte n’est pas ouverte' },
  { p: 'Léa gagne', n: 'Léa ne gagne pas' },
  { p: 'le four est allumé', n: 'le four n’est pas allumé' },
  { p: 'Paul ment', n: 'Paul ne ment pas' },
  { p: 'la lampe brille', n: 'la lampe ne brille pas' },
  { p: 'le chien aboie', n: 'le chien n’aboie pas' },
  { p: 'Inès lit', n: 'Inès ne lit pas' },
];

const lit = (i, neg = false) => ({ op: 'lit', i, neg });
export function evalF(f, v) {
  switch (f.op) {
    case 'lit': return f.neg ? !v[f.i] : v[f.i];
    case 'not': return !evalF(f.a, v);
    case 'and': return evalF(f.a, v) && evalF(f.b, v);
    case 'or': return evalF(f.a, v) || evalF(f.b, v);
    case 'xor': return evalF(f.a, v) !== evalF(f.b, v);
    case 'imp': return !evalF(f.a, v) || evalF(f.b, v);
    case 'iff': return evalF(f.a, v) === evalF(f.b, v);
    default: throw new Error('op');
  }
}

export function propText(f, atoms, top = true) {
  const quote = (g) => `« ${cap(propText(g, atoms, false))} »`;
  const sub = (g) => (g.op === 'lit' ? propText(g, atoms, false) : quote(g));
  let s;
  switch (f.op) {
    case 'lit': s = f.neg ? atoms[f.i].n : atoms[f.i].p; break;
    case 'not': s = `l’affirmation ${quote(f.a)} est fausse`; break;
    case 'and': s = `${sub(f.a)} et ${sub(f.b)}`; break;
    case 'or': s = `${sub(f.a)} ou ${sub(f.b)} (ou les deux)`; break;
    case 'xor': s = `soit ${sub(f.a)}, soit ${sub(f.b)}, mais pas les deux`; break;
    case 'imp': s = `si ${sub(f.a)}, alors ${sub(f.b)}`; break;
    case 'iff': s = `${sub(f.a)} si et seulement si ${sub(f.b)}`; break;
    default: s = '?';
  }
  s = s.replace(/\b([Ss])i il/g, '$1’il');
  return top ? `${cap(s)}.` : s;
}

function models(fs, m) {
  const out = [];
  for (let mask = 0; mask < 1 << m; mask++) {
    const v = Array.from({ length: m }, (_, i) => Boolean((mask >> i) & 1));
    if (fs.every((f) => evalF(f, v))) out.push(v);
  }
  return out;
}

function randLit(rng, m, negP) {
  return lit(rng.int(0, m - 1), rng.chance(negP));
}

function randFormula(rng, m, level) {
  const ops = level <= 2 ? ['imp', 'or'] : level <= 4 ? ['imp', 'imp', 'or', 'and'] : level <= 6 ? ['imp', 'or', 'xor', 'and', 'iff'] : ['imp', 'or', 'xor', 'iff', 'and', 'nand', 'nor'];
  const negP = level <= 2 ? 0.25 : 0.4;
  for (;;) {
    const op = rng.pick(ops);
    const a = randLit(rng, m, negP), b = randLit(rng, m, negP);
    if (a.i === b.i) continue;
    if (op === 'nand') return { op: 'not', a: { op: 'and', a, b } };
    if (op === 'nor') return { op: 'not', a: { op: 'or', a, b } };
    let f = { op, a, b };
    if (level >= 8 && rng.chance(0.35)) {
      const c = randLit(rng, m, negP);
      if (c.i !== a.i && c.i !== b.i) f = rng.chance(0.5) ? { op: 'imp', a: c, b: f } : { op: 'imp', a: f, b: c };
    }
    if (level >= 9 && rng.chance(0.3)) f = { op: 'not', a: { op: 'not', a: f } };
    return f;
  }
}

// Habille un littéral de négations équivalentes (pour les options des niveaux élevés).
function dressLiteral(rng, l, depth) {
  let f = l;
  for (let d = 0; d < depth; d++) {
    if (f.op === 'lit' && rng.chance(0.5)) f = { op: 'not', a: lit(f.i, !f.neg) };
    else f = { op: 'not', a: { op: 'not', a: f } };
  }
  return f;
}

function genProp(rng, level) {
  const m = [0, 3, 3, 3, 4, 4, 4, 5, 5, 5, 5][level];
  const nPrem = [0, 2, 2, 3, 3, 4, 4, 4, 5, 5, 6][level];
  const nOpts = level <= 4 ? 4 : 5;
  const atoms = rng.sample(ATOMS, m);
  for (let attempt = 0; attempt < 200; attempt++) {
    const prem = [];
    for (let i = 0; i < nPrem - 1; i++) prem.push(randFormula(rng, m, level));
    prem.push(randLit(rng, m, 0.5)); // un fait
    const ms = models(prem, m);
    if (!ms.length || ms.length > (1 << m) / 2) continue;
    const literals = [];
    for (let i = 0; i < m; i++) literals.push(lit(i, false), lit(i, true));
    const entails = (f) => ms.every((v) => evalF(f, v));
    const factKey = (l) => prem.some((p) => p.op === 'lit' && p.i === l.i && p.neg === l.neg);
    const entailedLits = literals.filter((l) => entails(l) && !factKey(l));
    if (!entailedLits.length) continue;
    // chaque prémisse doit être utile : sinon on recommence
    let key = rng.pick(entailedLits);
    const nonEnt = literals.filter((l) => !entails(l));
    // pièges classiques : affirmation du conséquent, négation de l'antécédent
    const fallacies = [];
    for (const p of prem) {
      if (p.op === 'imp' && p.a.op === 'lit' && p.b.op === 'lit') {
        fallacies.push(lit(p.a.i, p.a.neg), lit(p.b.i, !p.b.neg), lit(p.a.i, !p.a.neg));
      }
    }
    const extra = [];
    if (level >= 5) {
      for (let t = 0; t < 10; t++) {
        const a = randLit(rng, m, 0.4), b = randLit(rng, m, 0.4);
        if (a.i === b.i) continue;
        extra.push({ op: rng.pick(['and', 'or', 'imp']), a, b });
      }
    }
    const pool = [];
    const sig = (f) => models([f], m).map((v) => v.join()).join('|');
    const seenSig = new Set([sig(key)]);
    for (const f of [...rng.shuffle(fallacies), ...rng.shuffle(nonEnt), ...rng.shuffle(extra)]) {
      if (pool.length >= nOpts - 1) break;
      if (entails(f)) continue;
      const s = sig(f);
      if (seenSig.has(s)) continue;
      seenSig.add(s);
      pool.push(f);
    }
    if (pool.length < nOpts - 1) continue;
    const depth = level >= 9 ? 2 : level >= 7 ? 1 : 0;
    if (depth) {
      key = dressLiteral(rng, key, rng.int(1, depth));
      for (let i = 0; i < pool.length; i++) if (pool[i].op === 'lit' && rng.chance(0.6)) pool[i] = dressLiteral(rng, pool[i], rng.int(1, depth));
    }
    const all = [key, ...pool];
    const order = rng.shuffle([...all.keys()]);
    const options = order.map((i) => ({ f: all[i], text: propText(all[i], atoms) }));
    return {
      subtype: 'déduction',
      prompt: 'Si toutes ces affirmations sont vraies, laquelle des propositions suivantes est CERTAINEMENT vraie ?',
      data: { kind: 'prop', m, atoms, premises: prem, premiseTexts: prem.map((p) => propText(p, atoms)) },
      options,
      answer: order.indexOf(0),
      rules: [
        { title: 'Méthode', text: 'On cherche toutes les situations (vrai/faux pour chaque fait) compatibles avec les prémisses : la bonne réponse est vraie dans toutes ces situations.' },
        { title: 'Rappels', text: '« Si A, alors B » n’est faux que si A est vrai et B faux ; « A ou B » inclut le cas où les deux sont vrais ; l’affirmation « X » est fausse = non X ; deux négations s’annulent.' },
      ],
    };
  }
  throw new Error('propositionnel');
}

// ======================= Grilles de contraintes =======================

const NAMES = ['Alice', 'Bruno', 'Chloé', 'David', 'Emma'];
const ATTRS = {
  name: { label: 'Prénom', vals: NAMES.map((n) => ({ short: n, subj: n, pos: `s’appelle ${n}`, neg: `ne s’appelle pas ${n}` })) },
  job: { label: 'Métier', vals: ['médecin', 'pilote', 'peintre', 'juge', 'chef'].map((j) => ({ short: cap(j), subj: `le ${j}`, pos: `est ${j}`, neg: `n’est pas ${j}` })) },
  pet: { label: 'Animal', vals: [['chat', 'un'], ['chien', 'un'], ['perroquet', 'un'], ['lapin', 'un'], ['tortue', 'une']].map(([a, art]) => ({ short: cap(a), subj: `la personne qui a ${art} ${a}`, pos: `a ${art} ${a}`, neg: `n’a pas de ${a}` })) },
  drink: { label: 'Boisson', vals: [['thé', 'du'], ['café', 'du'], ['lait', 'du'], ['jus', 'du'], ['eau', 'de l’']].map(([d, art]) => ({ short: cap(d), subj: `la personne qui boit ${art}${art.endsWith('’') ? '' : ' '}${d}`, pos: `boit ${art}${art.endsWith('’') ? '' : ' '}${d}`, neg: `ne boit pas ${d === 'eau' ? 'd’' : 'de '}${d}` })) },
};

export function gridClueHolds(c, sol) {
  // sol[a][pos] = indice de valeur
  const where = (a, v) => sol[a].indexOf(v);
  let r;
  switch (c.type) {
    case 'same': r = where(c.a1, c.v1) === where(c.a2, c.v2); break;
    case 'at': r = where(c.a1, c.v1) === c.pos; break;
    case 'leftAdj': r = where(c.a1, c.v1) + 1 === where(c.a2, c.v2); break;
    case 'left': r = where(c.a1, c.v1) < where(c.a2, c.v2); break;
    case 'next': r = Math.abs(where(c.a1, c.v1) - where(c.a2, c.v2)) === 1; break;
    case 'edge': r = where(c.a1, c.v1) === 0 || where(c.a1, c.v1) === sol[c.a1].length - 1; break;
    default: throw new Error('indice');
  }
  return c.neg % 2 ? !r : r;
}

function clueBody(c, n) {
  return clueBodyRaw(c, n).replace(/\bde le /g, 'du ');
}

function clueBodyRaw(c, n) {
  const A1 = ATTRS[c.a1].vals[c.v1];
  const A2 = c.a2 ? ATTRS[c.a2].vals[c.v2] : null;
  const pol = c.base; // true = forme affirmative
  switch (c.type) {
    case 'same': return `${cap(A1.subj)} ${pol ? A2.pos : A2.neg}`;
    case 'at': return `${cap(A1.subj)} ${pol ? '' : 'n’'}habite ${pol ? '' : 'pas '}la maison ${c.pos + 1}`;
    case 'leftAdj': return `${cap(A1.subj)} ${pol ? 'habite' : 'n’habite pas'} juste à gauche de ${A2.subj}`;
    case 'left': return `${cap(A1.subj)} ${pol ? 'habite' : 'n’habite pas'} quelque part à gauche de ${A2.subj}`;
    case 'next': return `${cap(A1.subj)} et ${A2.subj} ${pol ? 'sont' : 'ne sont pas'} voisins`;
    case 'edge': return `${cap(A1.subj)} ${pol ? 'habite' : 'n’habite pas'} à une extrémité de la rue (maison 1 ou ${n})`;
    default: return '';
  }
}

export function clueText(c, n) {
  // c.base : polarité de la phrase de base ; c.wrap : nombre d'enveloppes « est fausse »
  let s = clueBody(c, n);
  for (let i = 0; i < c.wrap; i++) s = `L’affirmation « ${s} » est fausse`;
  return `${s}.`;
}

function randPerm(rng, n) {
  return rng.shuffle([...Array(n).keys()]);
}

// Recherche en profondeur : existe-t-il une solution vérifiant les indices et `extra` ?
function gridSearch(attrsIn, n, clues, extra, limit = 1) {
  const sol = {};
  const all = permsOf(n);
  // Ordre de recherche : attributs les plus contraints d'abord.
  const weight = (a) => clues.filter((c) => c.a1 === a || c.a2 === a).length;
  const attrs = attrsIn.slice().sort((x, y) => weight(y) - weight(x));
  // Filtrage préalable par les indices ne portant que sur un attribut.
  const unary = (a) => clues.filter((c) => c.a1 === a && (!c.a2 || c.a2 === a));
  const permsFor = Object.fromEntries(attrs.map((a) => {
    const u = unary(a);
    return [a, all.filter((p) => u.every((c) => gridClueHolds(c, { [a]: p })))];
  }));
  let found = 0;
  const byStage = attrs.map((_, i) => clues.filter((c) => {
    const used = [c.a1, c.a2].filter(Boolean);
    return used.every((a) => attrs.indexOf(a) <= i) && used.some((a) => attrs.indexOf(a) === i);
  }));
  const rec = (i) => {
    if (i === attrs.length) {
      if (!extra || extra(sol)) found++;
      return found >= limit;
    }
    for (const p of permsFor[attrs[i]]) {
      sol[attrs[i]] = p;
      if (byStage[i].every((c) => gridClueHolds(c, sol))) {
        if (rec(i + 1)) return true;
      }
    }
    delete sol[attrs[i]];
    return false;
  };
  rec(0);
  return found;
}
const PERM_CACHE = {};
function permsOf(n) {
  if (PERM_CACHE[n]) return PERM_CACHE[n];
  const out = [];
  const rec = (pre, rest) => {
    if (!rest.length) { out.push(pre); return; }
    rest.forEach((x, i) => rec([...pre, x], [...rest.slice(0, i), ...rest.slice(i + 1)]));
  };
  rec([], [...Array(n).keys()]);
  PERM_CACHE[n] = out;
  return out;
}

function genGrid(rng, level) {
  const [n, nAttr] = { 2: [3, 2], 3: [3, 3], 4: [4, 3], 5: [4, 3], 6: [4, 3], 7: [4, 4], 8: [5, 3], 9: [5, 3], 10: [5, 3] }[Math.max(2, level)];
  const attrs = ['name', ...rng.sample(['job', 'pet', 'drink'], nAttr - 1)];
  const sol = Object.fromEntries(attrs.map((a) => [a, randPerm(rng, n)]));
  // Question : attribut cible d'une entité désignée par un autre attribut.
  const qAttr = rng.pick(attrs);
  const byAttr = rng.pick(attrs.filter((a) => a !== qAttr));
  const byVal = rng.int(0, n - 1);
  const truth = sol[qAttr][sol[byAttr].indexOf(byVal)];
  const negTypes = level >= 5;
  const wraps = level >= 8;
  const types = ['same', 'same', 'at', 'leftAdj', 'next', ...(level >= 4 ? ['left', 'edge'] : [])];
  const pool = [];
  for (let t = 0; t < 140; t++) {
    const type = rng.pick(types);
    const a1 = rng.pick(attrs);
    const v1 = rng.int(0, n - 1);
    let a2 = null, v2 = null, pos = null;
    if (type !== 'at' && type !== 'edge') {
      a2 = rng.pick(type === 'same' ? attrs.filter((a) => a !== a1) : attrs);
      v2 = rng.int(0, n - 1);
      if (a2 === a1 && v2 === v1) continue;
    }
    if (type === 'at') pos = rng.int(0, n - 1);
    const c = { type, a1, v1, a2, v2, pos, neg: 0 };
    const truthVal = gridClueHolds(c, sol);
    // forme de base : affirmative si vraie, sinon négative (si autorisé)
    if (!truthVal && !negTypes && !wraps) continue;
    let base = truthVal;
    let wrap = 0;
    if (wraps && rng.chance(0.45)) { wrap = 1; base = !truthVal; if (rng.chance(0.3)) { wrap = 2; base = truthVal; } }
    if (!base && !negTypes && !wraps) continue;
    // sémantique : vraie si (base XOR wrap impair) correspond ; on stocke neg pour l'évaluation
    const cl = { type, a1, v1, a2, v2, pos, base, wrap, neg: (base ? 0 : 1) + wrap };
    if (!gridClueHolds(cl, sol)) continue;
    pool.push(cl);
  }
  const differs = (s) => s[qAttr][s[byAttr].indexOf(byVal)] !== truth;
  const determined = (cl) => gridSearch(attrs, n, cl, differs, 1) === 0;
  const clues = [];
  for (const c of pool) {
    clues.push(c);
    if (determined(clues)) break;
  }
  if (!determined(clues)) throw new Error('grille indéterminée');
  // Minimisation : on retire les indices superflus.
  for (const c of rng.shuffle(clues.slice())) {
    const without = clues.filter((x) => x !== c);
    if (determined(without)) clues.splice(clues.indexOf(c), 1);
  }
  if (clues.length < (level <= 3 ? 2 : 4)) throw new Error('grille trop simple');
  const target = ATTRS[byAttr].vals[byVal];
  const q = ATTRS[qAttr];
  const qWord = { name: 'Comment s’appelle', job: 'Quel est le métier de', pet: 'Quel animal a', drink: 'Que boit' }[qAttr];
  const prompt = `${n} personnes habitent ${n} maisons alignées, numérotées de 1 à ${n} de gauche à droite. Chaque personne a ${attrs.length - 1 === 1 ? 'un attribut' : 'des attributs'} différent${attrs.length > 2 ? 's' : ''} des autres. ${qWord} ${target.subj} ?`;
  const options = [...Array(n).keys()].map((v) => ({ value: v, text: q.vals[v].short }));
  return {
    subtype: 'grille',
    prompt,
    data: { kind: 'grid', n, attrs, clues, clueTexts: clues.map((c) => clueText(c, n)), qAttr, byAttr, byVal, solution: sol },
    options,
    answer: truth,
    rules: [
      { title: 'Méthode', text: 'Croisez les indices pour éliminer les possibilités : une seule répartition (ou plusieurs, mais toutes d’accord sur la réponse demandée) respecte tous les indices.' },
      { title: 'Réponse', text: `${cap(target.subj)} → ${q.vals[truth].short}.` },
    ],
  };
}

export function generate(rng, level) {
  const kinds = level === 1 ? ['syllo', 'prop'] : ['syllo', 'prop', 'grid'];
  const kind = rng.pick(kinds);
  const r = kind === 'syllo' ? genSyllogism(rng, level) : kind === 'prop' ? genProp(rng, level) : genGrid(rng, level);
  return { category: 'logic', level, timeLimit: TIME_LIMITS[level] + (kind === 'grid' ? 30 : 0), ...r };
}

// ======================= Rendu =======================

export function renderStimulus(item) {
  const d = item.data;
  if (d.kind === 'grid') {
    return `<ol class="clues">${d.clueTexts.map((t) => `<li>${esc(t)}</li>`).join('')}</ol>`;
  }
  return `<div class="premises"><div class="stim-label">Prémisses</div><ol>${d.premiseTexts.map((t) => `<li>${esc(t)}</li>`).join('')}</ol>${d.kind === 'syllo' ? '<p class="muted small">Chaque catégorie contient au moins un élément.</p>' : ''}</div>`;
}

export function renderOption(item, i) {
  return `<span class="opt-text left">${esc(item.options[i].text)}</span>`;
}

export function renderExplanation(item) {
  const d = item.data;
  let vis = '';
  if (d.kind === 'grid') {
    const target = d.solution[d.byAttr].indexOf(d.byVal);
    vis = '<table class="sol-table"><thead><tr><th>Maison</th>';
    for (let p = 0; p < d.n; p++) vis += `<th>${p + 1}</th>`;
    vis += '</tr></thead><tbody>';
    for (const a of d.attrs) {
      vis += `<tr><th>${esc(ATTRS[a].label)}</th>`;
      for (let p = 0; p < d.n; p++) vis += `<td class="${p === target && (a === d.qAttr || a === d.byAttr) ? 'hl' : ''}">${esc(ATTRS[a].vals[d.solution[a][p]].short)}</td>`;
      vis += '</tr>';
    }
    vis += '</tbody></table>';
  } else if (d.kind === 'prop') {
    const ms = models(d.premises, d.m);
    vis = `<p class="muted">Situations compatibles avec les prémisses (${ms.length}) :</p><table class="sol-table"><thead><tr>${d.atoms.map((a) => `<th>${esc(a.p)}</th>`).join('')}</tr></thead><tbody>`;
    for (const v of ms) vis += `<tr>${v.map((b) => `<td class="${b ? 'tv' : 'fv'}">${b ? 'vrai' : 'faux'}</td>`).join('')}</tr>`;
    vis += '</tbody></table>';
  } else {
    vis = `<p class="muted">Prémisses reformulées sans négation :</p><ul>${d.canon.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>`;
  }
  let html = `<div class="exp-visual">${vis}</div><ol class="rule-list">`;
  for (const r of item.rules) html += `<li><strong>${esc(r.title)}</strong> — ${esc(r.text)}</li>`;
  return html + '</ol>';
}

export default { id: 'logic', generate, renderStimulus, renderOption, renderExplanation };
