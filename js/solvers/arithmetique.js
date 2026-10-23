// Validation de l'Arithmétique : l'arbre de calcul est réévalué en rationnels
// exacts (numérateur, dénominateur) ; le résultat doit être un entier positif
// égal à la clé, chaque division intermédiaire doit tomber juste (calcul de
// tête), et chaque donnée du calcul doit figurer dans l'énoncé.

import { IMPLICIT } from '../generators/arithmetique.js';

const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
const mk = (n, d) => { const g = gcd(n, d) || 1; return d < 0 ? [-n / g, -d / g] : [n / g, d / g]; };

function ev(e, leaves) {
  if (typeof e === 'number') { leaves.push(e); return [e, 1]; }
  const [op, a, b] = e;
  const [p, q] = ev(a, leaves), [r, s] = ev(b, leaves);
  if (op === '+') return mk(p * s + r * q, q * s);
  if (op === '-') return mk(p * s - r * q, q * s);
  if (op === '*') return mk(p * r, q * s);
  if (op === '/') {
    if (r === 0) throw new Error('division par zéro');
    const out = mk(p * s, q * r);
    if (out[1] !== 1) throw new Error('division non entière');
    return out;
  }
  throw new Error('opérateur inconnu');
}

export function solve(item) {
  const leaves = [];
  let v;
  try { v = ev(item.data.expr, leaves); } catch (e) { return { ok: false, reason: e.message }; }
  if (v[1] !== 1) return { ok: false, reason: 'résultat non entier' };
  if (v[0] <= 0) return { ok: false, reason: 'résultat non positif' };
  if (String(v[0]) !== item.answer) return { ok: false, reason: 'clé incorrecte' };
  const inText = new Set((item.prompt.match(/\d+/g) || []).map(Number));
  const missing = leaves.filter((x) => !inText.has(x) && !IMPLICIT.includes(x));
  if (missing.length) return { ok: false, reason: 'donnée absente de l’énoncé' };
  return { ok: true, correct: [item.answer], notes: [] };
}

export default { solve };
