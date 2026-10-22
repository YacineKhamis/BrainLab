// Validation des Cubes : taille et nombre de diagonales conformes au niveau,
// faces valides, motif non uniforme (au moins une zone rouge et une zone blanche),
// clé égale au motif, symétrie déclarée réellement présente.

import { LEVELS } from '../generators/cubes.js';

// Image d'une face par une transformation géométrique, recalculée à partir
// des sommets rouges de la face (0 haut-gauche, 1 haut-droit, 2 bas-droit, 3 bas-gauche).
const RED_CORNERS = [[], [0, 1, 2, 3], [0, 1, 3], [0, 1, 2], [1, 2, 3], [0, 2, 3]];
const CORNER_XY = [[0, 0], [1, 0], [1, 1], [0, 1]];
function mapFace(f, T) {
  if (f <= 1) return f;
  const img = RED_CORNERS[f].map((k) => T(...CORNER_XY[k])).map(([x, y]) => CORNER_XY.findIndex((p) => p[0] === x && p[1] === y)).sort().join();
  return RED_CORNERS.findIndex((cs) => cs.slice().sort().join() === img);
}
const TRANSFORMS = {
  lr: { cell: (r, c, n) => [r, n - 1 - c], face: (x, y) => [1 - x, y] },
  tb: { cell: (r, c, n) => [n - 1 - r, c], face: (x, y) => [x, 1 - y] },
  rot180: { cell: (r, c, n) => [n - 1 - r, n - 1 - c], face: (x, y) => [1 - x, 1 - y] },
  rot90: { cell: (r, c, n) => [c, n - 1 - r], face: (x, y) => [1 - y, x] },
};

export function solve(item) {
  const { n, pattern, symmetry } = item.data;
  const cfg = LEVELS[item.level];
  if (n !== cfg.n || pattern.length !== n * n) return { ok: false, reason: 'taille incorrecte' };
  if (pattern.some((f) => !Number.isInteger(f) || f < 0 || f > 5)) return { ok: false, reason: 'face invalide' };
  const diag = pattern.filter((f) => f >= 2).length;
  if (diag < cfg.diag[0] || diag > cfg.diag[1]) return { ok: false, reason: `nombre de diagonales hors limites (${diag})` };
  const red = pattern.some((f) => f !== 0), white = pattern.some((f) => f !== 1);
  if (!red || !white) return { ok: false, reason: 'motif uniforme' };
  if (new Set(pattern).size < 2) return { ok: false, reason: 'motif uniforme' };
  const T = TRANSFORMS[symmetry];
  if (T) {
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const [r2, c2] = T.cell(r, c, n);
        if (pattern[r2 * n + c2] !== mapFace(pattern[r * n + c], T.face)) return { ok: false, reason: 'symétrie déclarée absente' };
      }
    }
  }
  if (item.answer !== pattern.join('')) return { ok: false, reason: 'clé incorrecte' };
  return { ok: true, correct: [item.answer], notes: [] };
}

export default { solve };
