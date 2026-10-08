// Solveur des suites : pour chaque option, on insère la valeur dans la suite et
// on cherche un modèle (bibliothèque indépendante du générateur) qui explique
// TOUTE la suite avec au moins deux contraintes vérifiées en plus de ses
// paramètres libres. L'item est valide si une seule option est expliquée.

const EPS = 1e-9;
const eq = (a, b) => Math.abs(a - b) < EPS * Math.max(1, Math.abs(a), Math.abs(b));

function diffs(s) {
  return s.slice(1).map((v, i) => v - s[i]);
}

// Polynôme de degré k : différences d'ordre k constantes.
function polyFit(s, k) {
  let d = s;
  for (let i = 0; i < k; i++) d = diffs(d);
  if (!d.length) return null;
  return d.every((v) => v === d[0]) ? { params: k + 1, name: `polynôme de degré ${k}` } : null;
}

function geomFit(s) {
  if (s.length < 3 || s[0] === 0) return null;
  for (let i = 1; i < s.length; i++) if (s[i] * s[0] !== s[i - 1] * s[1] || s[i - 1] === 0) return null;
  return { params: 2, name: 'géométrique' };
}

function affineFit(s) {
  if (s.length < 4) return null;
  if (s[1] === s[0]) return s.every((v) => v === s[0]) ? { params: 1, name: 'constante' } : null;
  const r = (s[2] - s[1]) / (s[1] - s[0]);
  const c = s[1] - r * s[0];
  for (let i = 1; i < s.length; i++) if (!eq(s[i], r * s[i - 1] + c)) return null;
  return { params: 3, name: 'récurrence affine' };
}

function solve3(m, v) {
  // Élimination de Gauss sur un système 3×3.
  const a = m.map((row, i) => [...row, v[i]]);
  for (let col = 0; col < 3; col++) {
    let piv = col;
    for (let r = col + 1; r < 3; r++) if (Math.abs(a[r][col]) > Math.abs(a[piv][col])) piv = r;
    if (Math.abs(a[piv][col]) < 1e-12) return null;
    [a[col], a[piv]] = [a[piv], a[col]];
    for (let r = 0; r < 3; r++) {
      if (r === col) continue;
      const f = a[r][col] / a[col][col];
      for (let k = col; k < 4; k++) a[r][k] -= f * a[col][k];
    }
  }
  return [a[0][3] / a[0][0], a[1][3] / a[1][1], a[2][3] / a[2][2]];
}

function order2Fit(s) {
  if (s.length < 7) return null;
  const sol = solve3(
    [[s[1], s[0], 1], [s[2], s[1], 1], [s[3], s[2], 1]],
    [s[2], s[3], s[4]],
  );
  if (!sol) return null;
  const [p, q, c] = sol;
  for (let i = 2; i < s.length; i++) if (!eq(s[i], p * s[i - 1] + q * s[i - 2] + c)) return null;
  return { params: 5, name: "récurrence d'ordre 2" };
}

function indexAffineFit(s) {
  if (s.length < 6) return null;
  const sol = solve3(
    [[s[0], 1, 1], [s[1], 1, 2], [s[2], 1, 3]],
    [s[1], s[2], s[3]],
  );
  if (!sol) return null;
  const [r, c, e] = sol;
  for (let i = 0; i < s.length - 1; i++) if (!eq(s[i + 1], r * s[i] + c + e * (i + 1))) return null;
  return { params: 4, name: 'récurrence dépendant du rang' };
}

function periodicOpsFit(s, p) {
  const trans = diffs(s).length;
  for (let ph = 0; ph < p; ph++) {
    const idx = [];
    for (let i = ph; i < trans; i++) if ((i - ph) % p === 0) idx.push(i);
    if (idx.length < 2) return null;
    const add = idx.every((i) => s[i + 1] - s[i] === s[idx[0] + 1] - s[idx[0]]);
    let mul = false;
    if (s[idx[0]] !== 0) {
      const m = s[idx[0] + 1] / s[idx[0]];
      mul = Number.isInteger(m) && idx.every((i) => s[i + 1] === s[i] * m);
    }
    if (!add && !mul) return null;
  }
  return { params: 1 + p, name: `opérations en cycle de ${p}` };
}

function nestedDiffFit(s) {
  const d = diffs(s);
  const g = geomFit(d);
  if (g) return { params: 1 + g.params, name: 'différences géométriques' };
  const a = affineFit(d);
  if (a && a.params === 3) return { params: 4, name: 'différences en récurrence affine' };
  return null;
}

const SIMPLE_FITS = [
  (s) => polyFit(s, 1),
  (s) => polyFit(s, 2),
  geomFit,
  affineFit,
];

function interleaveFit(s, k) {
  let total = 0;
  for (let j = 0; j < k; j++) {
    const sub = s.filter((_, i) => i % k === j);
    let best = null;
    for (const f of SIMPLE_FITS) {
      const r = f(sub);
      if (r && sub.length - r.params >= 1 && (!best || r.params < best.params)) best = r;
    }
    if (!best) return null;
    total += best.params;
  }
  return { params: total, name: `${k} suites entrelacées` };
}

export function explain(s) {
  const L = s.length;
  const models = [
    () => polyFit(s, 1), () => polyFit(s, 2), () => polyFit(s, 3),
    () => geomFit(s), () => affineFit(s), () => order2Fit(s), () => indexAffineFit(s),
    () => periodicOpsFit(s, 2), () => periodicOpsFit(s, 3), () => nestedDiffFit(s),
    () => interleaveFit(s, 2), () => interleaveFit(s, 3),
  ];
  const found = [];
  for (const m of models) {
    const r = m();
    if (r && L - r.params >= 2) found.push(r.name);
  }
  return found;
}

export function solve(item) {
  const { terms, missing } = item.data;
  if (terms[missing] !== null) return { ok: false, reason: 'terme manquant absent' };
  const values = item.options.map((o) => o.value);
  if (new Set(values).size !== values.length) return { ok: false, reason: 'options identiques' };
  const admissible = [];
  const notes = [];
  values.forEach((v, i) => {
    const s = terms.slice();
    s[missing] = v;
    const models = explain(s);
    if (models.length) admissible.push(i);
    notes.push(models.length
      ? `Explicable par : ${models.join(', ')}.`
      : 'Avec cette valeur, aucune règle cohérente n’explique toute la suite.');
  });
  if (admissible.length !== 1) return { ok: false, reason: `${admissible.length} options admissibles` };
  if (admissible[0] !== item.answer) return { ok: false, reason: 'clé non reconnue par le solveur' };
  return { ok: true, correct: admissible, notes };
}

export default { solve };
