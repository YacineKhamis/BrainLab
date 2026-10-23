// Validation des Puzzles visuels : pour chacun des 20 triplets de pièces, on
// cherche un pavage exact de la figure (rotations permises, pas de reflet) par
// recherche exhaustive. Exactement un triplet doit fonctionner, et ce doit être la clé.

import { rotations, connected, norm } from '../generators/puzzles.js';

function tiles(target, pieces) {
  const cells = norm(target);
  const keyOf = (r, c) => `${r},${c}`;
  const inTarget = new Set(cells.map(([r, c]) => keyOf(r, c)));
  if (pieces.reduce((s, p) => s + p.length, 0) !== cells.length) return false;
  const filled = new Set();
  const variants = pieces.map((p) => rotations(p).filter((v, i, a) => a.findIndex((w) => w.join() === v.join()) === i));
  const used = pieces.map(() => false);
  const rec = () => {
    const first = cells.find(([r, c]) => !filled.has(keyOf(r, c)));
    if (!first) return true;
    for (let p = 0; p < pieces.length; p++) {
      if (used[p]) continue;
      for (const v of variants[p]) {
        // La première case (ordre ligne puis colonne) de la pièce couvre la première case libre.
        const dr = first[0] - v[0][0], dc = first[1] - v[0][1];
        const placed = v.map(([r, c]) => keyOf(r + dr, c + dc));
        if (!placed.every((k) => inTarget.has(k) && !filled.has(k))) continue;
        placed.forEach((k) => filled.add(k));
        used[p] = true;
        if (rec()) return true;
        used[p] = false;
        placed.forEach((k) => filled.delete(k));
      }
    }
    return false;
  };
  return rec();
}

export function solve(item) {
  const { target, pieces } = item.data;
  if (pieces.length !== 6) return { ok: false, reason: 'nombre de pièces' };
  if (!connected(target) || pieces.some((p) => !connected(p))) return { ok: false, reason: 'pièce non connexe' };
  const solutions = [];
  for (let a = 0; a < 6; a++) for (let b = a + 1; b < 6; b++) for (let c = b + 1; c < 6; c++) {
    if (tiles(target, [pieces[a], pieces[b], pieces[c]])) solutions.push([a, b, c]);
  }
  if (solutions.length !== 1) return { ok: false, reason: `${solutions.length} assemblages possibles` };
  if (solutions[0].join() !== item.answer.join()) return { ok: false, reason: 'clé incorrecte' };
  return { ok: true, correct: [solutions[0]], notes: [] };
}

export default { solve };
