// Solveur des matrices : il ignore les règles déclarées par le générateur.
// Pour chaque attribut, il essaie une bibliothèque de règles candidates sur les
// cases visibles, garde celles qui sont cohérentes et en déduit l'ensemble des
// valeurs possibles pour la case manquante. Une option est admissible si chacun
// de ses attributs appartient à l'ensemble prédit. L'item est valide si et
// seulement si exactement une option est admissible et que c'est la réponse.

const META = {
  shape: { kind: 'ord', min: 3, max: 7, label: 'forme' },
  color: { kind: 'ord', min: 0, max: 4, label: 'remplissage' },
  size: { kind: 'ord', min: 0, max: 3, label: 'taille' },
  count: { kind: 'ord', min: 1, max: 9, label: 'nombre' },
  rot: { kind: 'cyc', mod: 8, label: 'orientation' },
  pos: { kind: 'cyc', mod: 8, label: 'position du point' },
  lines: { kind: 'mask', label: 'traits' },
};

function isArith(seq, kind, mod) {
  if (seq.length < 2) return { ok: true };
  const diff = (a, b) => (kind === 'cyc' ? (((b - a) % mod) + mod) % mod : b - a);
  const d = diff(seq[0], seq[1]);
  for (let i = 2; i < seq.length; i++) if (diff(seq[i - 1], seq[i]) !== d) return { ok: false };
  return { ok: true, d };
}

// lines : tableau de séquences complètes ; last : séquence incomplète (dernier terme manquant).
function predictLines(lines, last, meta) {
  const preds = new Map(); // valeur -> noms des règles
  const add = (v, name) => {
    if (meta.kind === 'ord' && (v < meta.min || v > meta.max)) return;
    if (!preds.has(v)) preds.set(v, []);
    preds.get(v).push(name);
  };
  const { kind } = meta;
  // Progression (pas propre à chaque ligne, y compris pas nul).
  if (kind !== 'mask') {
    if (lines.every((l) => isArith(l, kind, meta.mod).ok)) {
      const ar = isArith(last, kind, meta.mod);
      if (ar.ok && last.length >= 2) {
        const v = kind === 'cyc' ? (last[last.length - 1] + ar.d) % meta.mod : last[last.length - 1] + ar.d;
        add(v, 'progression');
      }
    }
  }
  // Distribution : chaque ligne est une permutation du même ensemble de valeurs distinctes.
  const sets = lines.map((l) => [...l].sort((a, b) => a - b).join(','));
  if (sets.every((s) => s === sets[0]) && new Set(lines[0]).size === lines[0].length) {
    const pool = lines[0].slice();
    if (new Set(last).size === last.length && last.every((v) => pool.includes(v))) {
      const rest = pool.filter((v) => !last.includes(v));
      if (rest.length === 1) add(rest[0], 'distribution');
    }
  }
  const head = (l) => l.slice(0, -1);
  const tail = (l) => l[l.length - 1];
  if (kind === 'ord') {
    const sum = (a) => a.reduce((x, y) => x + y, 0);
    if (lines.every((l) => tail(l) === sum(head(l)))) add(sum(last), 'addition');
    const dif = (a) => a.slice(1).reduce((x, y) => x - y, a[0]);
    if (lines.every((l) => tail(l) === dif(head(l)))) add(dif(last), 'soustraction');
  }
  if (kind === 'mask') {
    const ops = {
      'OU exclusif': (a) => a.reduce((x, y) => x ^ y, 0),
      'réunion': (a) => a.reduce((x, y) => x | y, 0),
      'intersection': (a) => a.reduce((x, y) => x & y, 0xff),
      'soustraction': (a) => a.slice(1).reduce((x, y) => x & ~y, a[0]),
    };
    for (const [name, f] of Object.entries(ops)) {
      if (lines.every((l) => tail(l) === f(head(l)))) add(f(last), name);
    }
  }
  // Constante globale.
  const all = [...lines.flat(), ...last];
  if (all.every((v) => v === all[0])) add(all[0], 'constante');
  return preds;
}

export function predictAttr(grid, n, attr) {
  const meta = META[attr];
  const val = (r, c) => grid[r][c][attr];
  const rows = [];
  for (let r = 0; r < n - 1; r++) rows.push(Array.from({ length: n }, (_, c) => val(r, c)));
  const lastRow = Array.from({ length: n - 1 }, (_, c) => val(n - 1, c));
  const cols = [];
  for (let c = 0; c < n - 1; c++) cols.push(Array.from({ length: n }, (_, r) => val(r, c)));
  const lastCol = Array.from({ length: n - 1 }, (_, r) => val(r, n - 1));
  const byRow = predictLines(rows, lastRow, meta);
  const byCol = predictLines(cols, lastCol, meta);
  const merged = new Map();
  for (const [v, names] of byRow) merged.set(v, names.map((x) => `${x} (lignes)`));
  for (const [v, names] of byCol) merged.set(v, [...(merged.get(v) || []), ...names.map((x) => `${x} (colonnes)`)]);
  return merged;
}

export function solve(item) {
  const { n, grid } = item.data;
  const opts = item.options.map((o) => o.cell);
  if (grid[n - 1][n - 1] !== null) return { ok: false, reason: 'case manquante absente' };
  const preds = {};
  for (const attr of Object.keys(META)) {
    preds[attr] = predictAttr(grid, n, attr);
    if (preds[attr].size === 0) return { ok: false, reason: `aucune règle n'explique l'attribut ${attr}` };
  }
  // Options distinctes.
  const keys = opts.map((o) => Object.keys(META).map((a) => o[a]).join(','));
  if (new Set(keys).size !== keys.length) return { ok: false, reason: 'options identiques' };
  const notes = [];
  const admissible = [];
  opts.forEach((o, i) => {
    const violations = [];
    for (const attr of Object.keys(META)) {
      if (!preds[attr].has(o[attr])) violations.push(attr);
    }
    if (!violations.length) admissible.push(i);
    notes.push(violations.length
      ? `Viole la règle de ${violations.map((a) => META[a].label).join(', de ')}.`
      : 'Respecte toutes les règles détectées.');
  });
  if (admissible.length !== 1) return { ok: false, reason: `${admissible.length} options admissibles`, admissible };
  if (admissible[0] !== item.answer) return { ok: false, reason: 'la réponse admissible ne correspond pas à la clé' };
  // Ambiguïté interne : un attribut pour lequel plusieurs valeurs sont prédites
  // ne doit pas permettre deux options différentes (déjà garanti) ; on signale tout de même.
  return { ok: true, correct: admissible, notes };
}

export default { solve };
