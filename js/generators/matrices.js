// Matrices visuelles (type Raven / BOMAT) générées de façon procédurale.
// Chaque case est décrite par des attributs ; chaque attribut suit sa propre règle.

import { esc, svg, polygonPoints, signed, fmt } from '../util.js';

export const ATTRS = {
  shape: { kind: 'ord', min: 3, max: 7, label: 'Forme' },
  color: { kind: 'ord', min: 0, max: 4, label: 'Remplissage' },
  size: { kind: 'ord', min: 0, max: 3, label: 'Taille' },
  count: { kind: 'ord', min: 1, max: 9, label: 'Nombre' },
  rot: { kind: 'cyc', mod: 8, label: "Orientation de l'aiguille" },
  pos: { kind: 'cyc', mod: 8, label: 'Position du point' },
  lines: { kind: 'mask', bits: 8, label: 'Traits' },
};
export const ATTR_ORDER = ['shape', 'color', 'size', 'count', 'rot', 'pos', 'lines'];

const SHAPE_NAMES = { 3: 'triangle', 4: 'carré', 5: 'pentagone', 6: 'hexagone', 7: 'heptagone' };
const COLOR_NAMES = ['vide', 'clair', 'moyen', 'foncé', 'plein'];
const SIZE_NAMES = ['très petit', 'petit', 'grand', 'très grand'];
const POS_NAMES = ['haut-gauche', 'haut', 'haut-droite', 'droite', 'bas-droite', 'bas', 'bas-gauche', 'gauche'];
const POS_ARROWS = ['↖', '↑', '↗', '→', '↘', '↓', '↙', '←'];
const LINE_NAMES = ['bord haut', 'bord droit', 'bord bas', 'bord gauche', 'coin ↖', 'coin ↗', 'coin ↘', 'coin ↙'];

export function valueName(attr, v) {
  switch (attr) {
    case 'shape': return SHAPE_NAMES[v];
    case 'color': return COLOR_NAMES[v];
    case 'size': return SIZE_NAMES[v];
    case 'count': return String(v);
    case 'rot': return `${v * 45}°`;
    case 'pos': return POS_NAMES[v];
    case 'lines': {
      const names = LINE_NAMES.filter((_, i) => v & (1 << i));
      return names.length ? names.join(', ') : 'aucun trait';
    }
    default: return String(v);
  }
}

function shortName(attr, v) {
  switch (attr) {
    case 'shape': return `${v} c.`;
    case 'color': return COLOR_NAMES[v];
    case 'size': return `T${v + 1}`;
    case 'count': return String(v);
    case 'rot': return `${v * 45}°`;
    case 'pos': return POS_ARROWS[v];
    default: return String(v);
  }
}

// Paramètres par niveau.
const LEVELS = {
  1: { n: 3, rules: 1, options: 4, noise: 0, attrs: ['shape', 'color', 'size', 'count'], types: ['prog', 'dist'], cols: false, steps: 1 },
  2: { n: 3, rules: 1, options: 4, noise: 0, attrs: ['shape', 'color', 'size', 'count', 'rot'], types: ['prog', 'dist'], cols: true, steps: 2 },
  3: { n: 3, rules: 2, options: 6, noise: 0, attrs: ['shape', 'color', 'size', 'count', 'rot', 'pos'], types: ['prog', 'dist'], cols: true, steps: 2 },
  4: { n: 3, rules: 2, options: 6, noise: 0, attrs: ['shape', 'color', 'size', 'count', 'rot', 'pos', 'lines'], types: ['prog', 'dist', 'arith', 'logic'], cols: true, steps: 2 },
  5: { n: 3, rules: 3, options: 8, noise: 0, attrs: ATTR_ORDER, types: ['prog', 'dist', 'arith', 'logic'], cols: true, steps: 3, single: true },
  6: { n: 3, rules: 3, options: 8, noise: 0, attrs: ATTR_ORDER, types: ['prog', 'dist', 'arith', 'logic'], cols: true, steps: 3, single: true, showAll: true },
  7: { n: 3, rules: 4, options: 8, noise: 0, attrs: ATTR_ORDER, types: ['prog', 'dist', 'arith', 'logic', 'var'], cols: true, steps: 3, single: true, showAll: true },
  8: { n: 4, rules: 4, options: 8, noise: 4, attrs: ATTR_ORDER, types: ['prog', 'dist', 'arith', 'logic', 'var'], cols: true, steps: 3, tree: true, showAll: true },
  9: { n: 4, rules: 5, options: 8, noise: 7, attrs: ATTR_ORDER, types: ['prog', 'dist', 'arith', 'logic', 'var'], cols: true, steps: 3, tree: true, showAll: true },
  10: { n: 4, rules: 6, options: 8, noise: 10, attrs: ATTR_ORDER, types: ['prog', 'dist', 'arith', 'logic', 'var'], cols: true, steps: 3, tree: true, showAll: true },
};
const TIME_LIMITS = [0, 45, 50, 60, 60, 75, 75, 90, 80, 70, 60];

function emptyGrid(n) {
  return Array.from({ length: n }, () => Array(n).fill(0));
}
function transpose(g) {
  return g[0].map((_, c) => g.map((row) => row[c]));
}

function typesFor(attr, allowed) {
  const kind = ATTRS[attr].kind;
  const t = [];
  if (allowed.includes('prog') && kind !== 'mask') t.push('prog');
  if (allowed.includes('dist')) t.push('dist');
  if (allowed.includes('arith') && attr === 'count') t.push('sum', 'diff');
  if (allowed.includes('logic') && kind === 'mask') t.push('xor', 'or', 'andnot');
  if (allowed.includes('var') && kind !== 'mask') t.push('var');
  return t;
}

function randMask(rng, minBits, maxBits, within = 0xff) {
  const bits = [];
  for (let i = 0; i < 8; i++) if (within & (1 << i)) bits.push(i);
  const k = Math.min(bits.length, rng.int(minBits, maxBits));
  return rng.sample(bits, k).reduce((m, b) => m | (1 << b), 0);
}

// Construit la grille complète d'un attribut selon une règle (orientation ligne).
function buildRowGrid(rng, attr, type, n, cfg) {
  const A = ATTRS[attr];
  const g = emptyGrid(n);
  const rule = { attr, type };
  if (A.kind === 'ord') {
    const span = A.max - A.min;
    if (type === 'prog' || type === 'var') {
      const maxStep = Math.min(cfg.steps, Math.floor(span / (n - 1)));
      if (maxStep < 1) return null;
      const stepChoices = [];
      for (let d = 1; d <= maxStep; d++) stepChoices.push(d, -d);
      let steps;
      if (type === 'prog') {
        const d = rng.pick(stepChoices);
        steps = Array(n).fill(d);
      } else {
        steps = Array.from({ length: n }, () => rng.pick(stepChoices));
        if (steps.every((s) => s === steps[0])) steps[n - 1] = -steps[0];
      }
      for (let r = 0; r < n; r++) {
        const d = steps[r];
        const lo = d > 0 ? A.min : A.min - d * (n - 1);
        const hi = d > 0 ? A.max - d * (n - 1) : A.max;
        const a = rng.int(lo, hi);
        for (let c = 0; c < n; c++) g[r][c] = a + d * c;
      }
      rule.steps = steps;
    } else if (type === 'dist') {
      const values = [];
      for (let v = A.min; v <= A.max; v++) values.push(v);
      if (values.length < n) return null;
      const vals = rng.sample(values, n);
      const p = rng.shuffle([...Array(n).keys()]);
      const q = rng.shuffle([...Array(n).keys()]);
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) g[r][c] = vals[(p[r] + q[c]) % n];
      rule.values = vals.slice().sort((x, y) => x - y);
    } else if (type === 'sum' || type === 'diff') {
      for (let r = 0; r < n; r++) {
        let row;
        for (let tries = 0; tries < 100; tries++) {
          const parts = Array.from({ length: n - 1 }, () => rng.int(1, 5));
          if (type === 'sum') {
            const s = parts.reduce((x, y) => x + y, 0);
            if (s <= A.max) { row = [...parts, s]; break; }
          } else {
            const rest = parts.slice(1).reduce((x, y) => x + y, 0);
            const first = rest + rng.int(1, 4);
            if (first <= A.max) { row = [first, ...parts.slice(1), first - rest]; break; }
          }
        }
        if (!row) return null;
        g[r] = row;
      }
    }
  } else if (A.kind === 'cyc') {
    if (type === 'prog' || type === 'var') {
      const stepChoices = [1, 2, 3, 5, 6, 7];
      let steps;
      if (type === 'prog') steps = Array(n).fill(rng.pick(stepChoices));
      else {
        steps = Array.from({ length: n }, () => rng.pick(stepChoices));
        if (steps.every((s) => s === steps[0])) steps[n - 1] = (8 - steps[0]) % 8;
      }
      for (let r = 0; r < n; r++) {
        const a = rng.int(0, 7);
        for (let c = 0; c < n; c++) g[r][c] = (a + steps[r] * c) % 8;
      }
      rule.steps = steps.map((s) => (s > 4 ? s - 8 : s));
    } else if (type === 'dist') {
      const vals = rng.sample([0, 1, 2, 3, 4, 5, 6, 7], n);
      const p = rng.shuffle([...Array(n).keys()]);
      const q = rng.shuffle([...Array(n).keys()]);
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) g[r][c] = vals[(p[r] + q[c]) % n];
      rule.values = vals.slice().sort((x, y) => x - y);
    }
  } else {
    // Masques de traits.
    for (let r = 0; r < n; r++) {
      let row = null;
      for (let tries = 0; tries < 200 && !row; tries++) {
        if (type === 'xor') {
          const parts = Array.from({ length: n - 1 }, () => randMask(rng, 2, 4));
          const res = parts.reduce((x, y) => x ^ y, 0);
          if (res && new Set([...parts, res]).size === n) row = [...parts, res];
        } else if (type === 'or') {
          const parts = Array.from({ length: n - 1 }, () => randMask(rng, 1, 3));
          const res = parts.reduce((x, y) => x | y, 0);
          if (new Set([...parts, res]).size === n) row = [...parts, res];
        } else if (type === 'andnot') {
          const first = randMask(rng, 4, 6);
          const rest = Array.from({ length: n - 2 }, () => randMask(rng, 1, 2, first) | (rng.chance(0.3) ? randMask(rng, 1, 1, ~first & 0xff) : 0));
          const res = rest.reduce((x, y) => x & ~y, first);
          if (res && new Set([first, ...rest, res]).size === n) row = [first, ...rest, res];
        } else if (type === 'dist') {
          break;
        }
      }
      if (type === 'dist') break;
      if (!row) return null;
      g[r] = row;
    }
    if (type === 'dist') {
      const vals = [];
      while (vals.length < n) {
        const m = randMask(rng, 2, 4);
        if (!vals.includes(m)) vals.push(m);
      }
      const p = rng.shuffle([...Array(n).keys()]);
      const q = rng.shuffle([...Array(n).keys()]);
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) g[r][c] = vals[(p[r] + q[c]) % n];
      rule.values = vals;
    }
  }
  return { grid: g, rule };
}

function ruleText(rule, n) {
  const { attr, type, dir } = rule;
  const label = ATTRS[attr].label;
  const along = dir === 'col' ? 'de haut en bas, dans chaque colonne' : 'de gauche à droite, dans chaque ligne';
  const lineWord = dir === 'col' ? 'colonne' : 'ligne';
  const stepText = (d) => {
    switch (attr) {
      case 'shape': return `${signed(d)} côté${Math.abs(d) > 1 ? 's' : ''}`;
      case 'color': return d > 0 ? `${d} cran${d > 1 ? 's' : ''} plus foncé` : `${-d} cran${d < -1 ? 's' : ''} plus clair`;
      case 'size': return d > 0 ? `${d} taille${d > 1 ? 's' : ''} au-dessus` : `${-d} taille${d < -1 ? 's' : ''} en dessous`;
      case 'count': return `${signed(d)} élément${Math.abs(d) > 1 ? 's' : ''}`;
      case 'rot': return `rotation de ${Math.abs(d) * 45}° ${d > 0 ? 'horaire' : 'antihoraire'}`;
      case 'pos': return `${Math.abs(d)} cran${Math.abs(d) > 1 ? 's' : ''} ${d > 0 ? 'horaire' : 'antihoraire'}`;
      default: return signed(d);
    }
  };
  switch (type) {
    case 'const': return `${label} : identique dans toutes les cases (${valueName(attr, rule.value)}).`;
    case 'prog': return `${label} : progression constante, ${stepText(rule.steps[0])} d'une case à la suivante, ${along}.`;
    case 'var': return `${label} : progression dont le pas change selon la ${lineWord} (${rule.steps.map((d, i) => `${lineWord} ${i + 1} : ${stepText(d)}`).join(' ; ')}).`;
    case 'dist': return `${label} : distribution de ${n} valeurs — chaque ligne et chaque colonne contient une fois chacune des valeurs ${rule.values.map((v) => `« ${valueName(attr, v)} »`).join(', ')}.`;
    case 'sum': return `${label} : addition — dans chaque ${lineWord}, la dernière case contient la somme des éléments des cases précédentes.`;
    case 'diff': return `${label} : soustraction — dans chaque ${lineWord}, la dernière case = la première moins ${n > 3 ? 'les cases intermédiaires' : 'la deuxième'}.`;
    case 'xor': return `${label} : OU exclusif — dans chaque ${lineWord}, la dernière case garde les traits présents dans un nombre impair des cases précédentes (les traits communs s'annulent).`;
    case 'or': return `${label} : addition (réunion) — dans chaque ${lineWord}, la dernière case réunit tous les traits des cases précédentes.`;
    case 'andnot': return `${label} : soustraction — dans chaque ${lineWord}, la dernière case garde les traits de la première case qui n'apparaissent dans aucune des cases suivantes.`;
    default: return label;
  }
}

function cellKey(cell) {
  return ATTR_ORDER.map((a) => cell[a]).join(',');
}

function makeNoise(rng, amount) {
  if (!amount) return [];
  const k = rng.int(Math.max(1, amount - 2), amount + 2);
  return Array.from({ length: k }, () => ({ x: rng.int(10, 110), y: rng.int(10, 110), t: rng.int(0, 2) }));
}

// Valeurs fausses plausibles pour un attribut.
function wrongValues(rng, attr, ans, full, n) {
  const A = ATTRS[attr];
  const out = new Set();
  const a = ans[attr];
  if (A.kind === 'ord') {
    for (const d of [1, -1, 2, -2]) {
      const v = a + d;
      if (v >= A.min && v <= A.max) out.add(v);
    }
    for (let c = 0; c < n - 1; c++) out.add(full[n - 1][c][attr]);
    for (let r = 0; r < n - 1; r++) out.add(full[r][n - 1][attr]);
  } else if (A.kind === 'cyc') {
    for (const d of [1, 7, 2, 6, 4]) out.add((a + d) % 8);
  } else {
    for (let b = 0; b < 8; b++) out.add(a ^ (1 << b));
    const row = full[n - 1].slice(0, n - 1).map((c) => c[attr]);
    out.add(row.reduce((x, y) => x | y, 0));
    out.add(row.reduce((x, y) => x ^ y, 0));
    out.add(row.reduce((x, y) => x & y, 0xff));
    out.add(row.slice(1).reduce((x, y) => x & ~y, row[0]));
  }
  out.delete(a);
  return rng.shuffle([...out]);
}

export function generate(rng, level) {
  const cfg = LEVELS[level];
  const n = cfg.n;
  const nRules = cfg.rules;
  // Choix des attributs régis par une règle non triviale.
  let candidates = cfg.attrs.slice();
  const active = [];
  const rules = {};
  const grids = {};
  candidates = rng.shuffle(candidates);
  for (const attr of candidates) {
    if (active.length >= nRules) break;
    const types = typesFor(attr, cfg.types);
    if (!types.length) continue;
    let type = rng.pick(types);
    // Les règles « var » sont réservées aux niveaux élevés et favorisées.
    if (cfg.types.includes('var') && level >= 8 && ATTRS[attr].kind !== 'mask' && rng.chance(0.4)) type = 'var';
    const built = buildRowGrid(rng, attr, type, n, cfg);
    if (!built) continue;
    let dir = 'row';
    let grid = built.grid;
    if (cfg.cols && rng.chance(level >= 6 ? 0.4 : 0.25) && type !== 'dist') {
      dir = 'col';
      grid = transpose(grid);
    }
    built.rule.dir = dir;
    rules[attr] = built.rule;
    grids[attr] = grid;
    active.push(attr);
  }
  if (active.length < nRules) throw new Error('règles insuffisantes');

  // Visibilité des attributs facultatifs.
  const show = {
    rot: active.includes('rot') || (cfg.showAll && rng.chance(0.6)),
    pos: active.includes('pos') || (cfg.showAll && rng.chance(0.6)),
    lines: active.includes('lines') || (cfg.showAll && rng.chance(0.5)),
  };
  // Attributs constants.
  for (const attr of ATTR_ORDER) {
    if (grids[attr]) continue;
    const A = ATTRS[attr];
    let value;
    if (attr === 'rot' || attr === 'pos') value = show[attr] ? rng.int(0, 7) : 0;
    else if (attr === 'lines') value = show.lines ? randMask(rng, 1, 3) : 0;
    else if (attr === 'count') value = rng.int(1, 4);
    else value = rng.int(A.min, A.max);
    if (attr === 'size' && level <= 4) value = rng.int(1, 3);
    grids[attr] = emptyGrid(n).map((row) => row.map(() => value));
    rules[attr] = { attr, type: 'const', value, dir: 'row' };
  }
  // Lisibilité : la forme doit rester reconnaissable si elle varie.
  const full = emptyGrid(n).map((row, r) => row.map((_, c) => {
    const cell = {};
    for (const attr of ATTR_ORDER) cell[attr] = grids[attr][r][c];
    return cell;
  }));
  const answerCell = { ...full[n - 1][n - 1] };

  // Distracteurs.
  const nOpts = cfg.options;
  const mutable = ATTR_ORDER.filter((a) => (a === 'rot' || a === 'pos' || a === 'lines' ? show[a] : true));
  const activeMut = active.filter((a) => mutable.includes(a));
  const seen = new Set([cellKey(answerCell)]);
  const distractors = [];
  const pushD = (cell) => {
    const k = cellKey(cell);
    if (seen.has(k)) return false;
    seen.add(k);
    distractors.push(cell);
    return true;
  };
  if (cfg.tree) {
    // Arbre équilibré (type I-RAVEN) : 3 attributs, toutes les combinaisons de modifications.
    const others = mutable.filter((a) => !activeMut.includes(a));
    const attrs3 = [...rng.shuffle(activeMut), ...rng.shuffle(others)].slice(0, 3);
    const alt = attrs3.map((a) => wrongValues(rng, a, answerCell, full, n)[0]);
    for (let mask = 1; mask < 8; mask++) {
      const cell = { ...answerCell };
      attrs3.forEach((a, i) => { if (mask & (1 << i)) cell[a] = alt[i]; });
      pushD(cell);
    }
  } else {
    const order = [];
    // Priorité aux attributs régis par une règle : distracteurs plausibles.
    const pool = cfg.single ? [...activeMut, ...activeMut, ...mutable] : [...activeMut, ...mutable];
    for (const a of pool) order.push(a);
    let guard = 0;
    while (distractors.length < nOpts - 1 && guard++ < 200) {
      const attr = order[guard % order.length];
      const cell = { ...answerCell };
      const wv = wrongValues(rng, attr, answerCell, full, n);
      if (!wv.length) continue;
      cell[attr] = wv[0];
      if (!cfg.single && rng.chance(0.3)) {
        const other = rng.pick(mutable.filter((x) => x !== attr));
        const wv2 = wrongValues(rng, other, answerCell, full, n);
        if (wv2.length) cell[other] = wv2[0];
      }
      pushD(cell);
    }
  }
  if (distractors.length < nOpts - 1) throw new Error('distracteurs insuffisants');
  const chosen = distractors.slice(0, nOpts - 1);
  const answer = rng.int(0, nOpts - 1);
  const optionCells = chosen.slice();
  optionCells.splice(answer, 0, answerCell);
  const options = optionCells.map((cell) => ({ cell, noise: makeNoise(rng, cfg.noise) }));

  const grid = full.map((row, r) => row.map((cell, c) => (r === n - 1 && c === n - 1 ? null : cell)));
  const noise = full.map((row) => row.map(() => makeNoise(rng, cfg.noise)));

  const ruleList = ATTR_ORDER.filter((a) => active.includes(a)).map((a) => ({
    attr: a,
    title: ATTRS[a].label,
    text: ruleText(rules[a], n),
  }));
  const constList = ATTR_ORDER.filter((a) => !active.includes(a) && (a === 'rot' || a === 'pos' || a === 'lines' ? show[a] : true));
  if (constList.length) {
    ruleList.push({
      attr: null,
      title: 'Attributs constants',
      text: constList.map((a) => `${ATTRS[a].label} : ${valueName(a, rules[a].value)}`).join(' ; ') + '.',
    });
  }
  if (cfg.noise) {
    ruleList.push({ attr: null, title: 'Bruit visuel', text: 'Les petites marques grises sont placées au hasard dans chaque case : elles ne suivent aucune règle et doivent être ignorées.' });
  }

  return {
    category: 'matrices',
    level,
    subtype: `${n}x${n}`,
    prompt: `Quelle figure complète la matrice ${n}×${n} ? Chaque attribut suit sa propre règle.`,
    data: { n, show, grid, noise, solved: full, rules, active },
    options,
    answer,
    rules: ruleList,
    timeLimit: TIME_LIMITS[level],
  };
}

// ---------- Rendu ----------

const SIZES = [5.5, 7.5, 9.5, 11.5];
const SLOTS = [34, 60, 86];
const LAYOUTS = {
  1: [4], 2: [3, 5], 3: [3, 4, 5], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8],
  6: [0, 1, 2, 6, 7, 8], 7: [0, 1, 2, 4, 6, 7, 8], 8: [0, 1, 2, 3, 5, 6, 7, 8], 9: [0, 1, 2, 3, 4, 5, 6, 7, 8],
};
const OPACITY = [0, 0.25, 0.5, 0.75, 1];
const POS_XY = [[7, 7], [60, 7], [113, 7], [113, 60], [113, 113], [60, 113], [7, 113], [7, 60]];
const LINE_SEGS = [
  [14, 14, 106, 14], [106, 14, 106, 106], [14, 106, 106, 106], [14, 14, 14, 106],
  [14, 14, 23, 23], [106, 14, 97, 23], [106, 106, 97, 97], [14, 106, 23, 97],
];

export function cellBody(cell, show, noise, ox = 0, oy = 0) {
  let s = '';
  if (noise && noise.length) {
    for (const m of noise) {
      const x = ox + m.x, y = oy + m.y;
      if (m.t === 0) s += `<path class="noise" d="M${x - 2.5} ${y - 2.5}L${x + 2.5} ${y + 2.5}M${x + 2.5} ${y - 2.5}L${x - 2.5} ${y + 2.5}"/>`;
      else if (m.t === 1) s += `<circle class="noise-dot" cx="${x}" cy="${y}" r="1.6"/>`;
      else s += `<path class="noise" d="M${x - 3} ${y}L${x + 3} ${y}"/>`;
    }
  }
  if (show.lines) {
    LINE_SEGS.forEach((seg, i) => {
      if (cell.lines & (1 << i)) s += `<line class="mline" x1="${ox + seg[0]}" y1="${oy + seg[1]}" x2="${ox + seg[2]}" y2="${oy + seg[3]}"/>`;
    });
  }
  if (show.pos) {
    const [px, py] = POS_XY[cell.pos];
    s += `<circle class="mpos" cx="${ox + px}" cy="${oy + py}" r="4.2"/>`;
  }
  const r = SIZES[cell.size];
  for (const slot of LAYOUTS[cell.count]) {
    const cx = ox + SLOTS[slot % 3];
    const cy = oy + SLOTS[Math.floor(slot / 3)];
    s += `<polygon class="ment" points="${polygonPoints(cx, cy, r, cell.shape)}" fill-opacity="${OPACITY[cell.color]}"/>`;
    if (show.rot) {
      const a = ((cell.rot * 45 - 90) * Math.PI) / 180;
      s += `<line class="mneedle" x1="${fmt(cx)}" y1="${fmt(cy)}" x2="${fmt(cx + (r + 3.5) * Math.cos(a))}" y2="${fmt(cy + (r + 3.5) * Math.sin(a))}"/>`;
    }
  }
  return s;
}

export function renderStimulus(item) {
  const { n, show, grid, noise } = item.data;
  const gap = 6;
  const W = n * 120 + (n + 1) * gap;
  let body = `<rect class="mbg" x="0" y="0" width="${W}" height="${W}" rx="8"/>`;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const ox = gap + c * (120 + gap), oy = gap + r * (120 + gap);
      body += `<rect class="mcell" x="${ox}" y="${oy}" width="120" height="120" rx="4"/>`;
      if (grid[r][c]) body += cellBody(grid[r][c], show, noise[r][c], ox, oy);
      else body += `<rect class="mcell missing" x="${ox}" y="${oy}" width="120" height="120" rx="4"/><text class="mq" x="${ox + 60}" y="${oy + 74}" text-anchor="middle">?</text>`;
    }
  }
  return svg(W, W, body, 'stim matrix', `Matrice ${n} par ${n} avec une case manquante`);
}

export function renderOption(item, i) {
  const o = item.options[i];
  return svg(120, 120, `<rect class="mcell" x="0" y="0" width="120" height="120" rx="4"/>${cellBody(o.cell, item.data.show, o.noise)}`, 'opt-svg', `Option ${i + 1}`);
}

function lineIcon(mask) {
  let s = '<rect class="mcell" x="0" y="0" width="120" height="120" rx="6"/>';
  LINE_SEGS.forEach((seg, i) => {
    if (mask & (1 << i)) s += `<line class="mline" x1="${seg[0]}" y1="${seg[1]}" x2="${seg[2]}" y2="${seg[3]}"/>`;
  });
  return s;
}

// Tableau des valeurs d'un attribut : met en évidence la case réponse.
function valueTable(item, attr) {
  const { n, solved } = item.data;
  const cs = 46, gap = 3;
  const W = n * cs + (n + 1) * gap;
  let body = '';
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const x = gap + c * (cs + gap), y = gap + r * (cs + gap);
      const isAns = r === n - 1 && c === n - 1;
      body += `<rect class="${isAns ? 'vt-ans' : 'vt-cell'}" x="${x}" y="${y}" width="${cs}" height="${cs}" rx="4"/>`;
      const v = solved[r][c][attr];
      if (attr === 'lines') {
        body += `<g transform="translate(${x + 5} ${y + 5}) scale(${(cs - 10) / 120})">${lineIcon(v)}</g>`;
      } else {
        body += `<text class="vt-text" x="${x + cs / 2}" y="${y + cs / 2 + 5}" text-anchor="middle">${esc(shortName(attr, v))}</text>`;
      }
    }
  }
  return svg(W, W, body, 'vtable', `Valeurs de l'attribut ${ATTRS[attr].label}`);
}

export function renderExplanation(item) {
  const { n, show, solved } = item.data;
  const gap = 6;
  const W = n * 120 + (n + 1) * gap;
  let body = `<rect class="mbg" x="0" y="0" width="${W}" height="${W}" rx="8"/>`;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const ox = gap + c * (120 + gap), oy = gap + r * (120 + gap);
      const isAns = r === n - 1 && c === n - 1;
      body += `<rect class="mcell${isAns ? ' answer' : ''}" x="${ox}" y="${oy}" width="120" height="120" rx="4"/>`;
      body += cellBody(solved[r][c], show, null, ox, oy);
    }
  }
  let html = `<div class="exp-visual">${svg(W, W, body, 'stim matrix small', 'Matrice complétée')}<p class="muted">Matrice complétée (bruit retiré), case réponse encadrée.</p></div>`;
  html += '<ol class="rule-list">';
  for (const r of item.rules) {
    html += `<li><strong>${esc(r.title)}</strong> — ${esc(r.text.startsWith(`${r.title} : `) ? r.text.slice(r.title.length + 3) : r.text)}`;
    if (r.attr) html += `<div class="vt-wrap">${valueTable(item, r.attr)}</div>`;
    html += '</li>';
  }
  html += '</ol>';
  return html;
}

export default { id: 'matrices', generate, renderStimulus, renderOption, renderExplanation };
