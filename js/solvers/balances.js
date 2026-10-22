// Validation des Balances : les équilibres affichés doivent fixer les poids à un
// facteur près (noyau de dimension 1, poids tous strictement positifs). On
// calcule ce vecteur de poids en rationnels exacts puis on pèse chaque option :
// exactement une doit égaler le plateau à compléter.

const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));

// Noyau d'une matrice entière m × k de rang k − 1 : vecteur entier primitif.
function kernel(rows, k) {
  const M = rows.map((r) => r.slice());
  const pivots = [];
  let rk = 0;
  for (let c = 0; c < k && rk < M.length; c++) {
    const p = M.findIndex((r, i) => i >= rk && r[c] !== 0);
    if (p < 0) continue;
    [M[rk], M[p]] = [M[p], M[rk]];
    for (let i = 0; i < M.length; i++) {
      if (i === rk || M[i][c] === 0) continue;
      const a = M[rk][c], b = M[i][c];
      M[i] = M[i].map((x, j) => x * a - M[rk][j] * b);
    }
    pivots.push(c);
    rk++;
  }
  if (rk !== k - 1) return null;
  const free = [...Array(k).keys()].find((c) => !pivots.includes(c));
  // x_free = L (produit des pivots), puis x_pivot = −M[i][free] · L / M[i][pivot].
  const L = pivots.reduce((s, c, i) => s * Math.abs(M[i][c]) / gcd(s, Math.abs(M[i][c])), 1);
  const v = Array(k).fill(0);
  v[free] = L;
  pivots.forEach((c, i) => { v[c] = (-M[i][free] * L) / M[i][c]; });
  const g = v.reduce((s, x) => gcd(s, x), 0) || 1;
  return v.map((x) => x / g);
}

export function solve(item) {
  const { eqs, query } = item.data;
  const k = query.length;
  const rows = eqs.map((e) => e.left.map((x, i) => x - e.right[i]));
  const v = kernel(rows, k);
  if (!v) return { ok: false, reason: 'poids non déterminés par les balances' };
  const w = v[0] < 0 ? v.map((x) => -x) : v;
  if (w.some((x) => x <= 0)) return { ok: false, reason: 'poids non positifs' };
  for (const e of eqs) if (e.left.every((x) => !x) || e.right.every((x) => !x)) return { ok: false, reason: 'plateau vide' };
  const target = query.reduce((s, x, i) => s + x * w[i], 0);
  const keys = item.options.map((o) => o.counts.join());
  if (new Set(keys).size !== keys.length) return { ok: false, reason: 'options identiques' };
  const correct = [];
  const notes = item.options.map((o, i) => {
    const wt = o.counts.reduce((s, x, j) => s + x * w[j], 0);
    if (wt === target) { correct.push(i); return `Pèse exactement autant (${wt} unités pour ${target}).`; }
    return wt > target ? `Trop lourd : ${wt} unités au lieu de ${target}.` : `Trop léger : ${wt} unités au lieu de ${target}.`;
  });
  if (correct.length !== 1) return { ok: false, reason: `${correct.length} options valides` };
  if (correct[0] !== item.answer) return { ok: false, reason: 'clé incorrecte' };
  return { ok: true, correct, notes };
}

export default { solve };
