// Solveur visuo-spatial, écrit indépendamment du générateur :
// - rotation 2D : forme canonique sous les 4 rotations du plan ;
// - rotation 3D : forme canonique sous les 24 rotations propres + contrôle de
//   visibilité par rastérisation de la projection isométrique ;
// - patrons : repliage par repères (normale, axe x, axe y) et test des 24 vues ;
// - symétries : application directe des transformations à la grille.

// ---------- Outils ----------
function permutations(a) {
  if (a.length <= 1) return [a];
  return a.flatMap((x, i) => permutations([...a.slice(0, i), ...a.slice(i + 1)]).map((p) => [x, ...p]));
}
function det3(m) {
  return m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
}
// Les 24 rotations propres = matrices de permutation signées de déterminant +1.
const ROTS = [];
for (const p of permutations([0, 1, 2])) {
  for (let signs = 0; signs < 8; signs++) {
    const m = [0, 1, 2].map((i) => [0, 1, 2].map((j) => (j === p[i] ? ((signs >> i) & 1 ? -1 : 1) : 0)));
    if (det3(m) === 1) ROTS.push(m);
  }
}
const mv = (m, v) => m.map((row) => row[0] * v[0] + row[1] * v[1] + row[2] * v[2]);
const mtv = (m, v) => [0, 1, 2].map((j) => m[0][j] * v[0] + m[1][j] * v[1] + m[2][j] * v[2]);
const vk = (v) => v.map((x) => x || 0).join(',');

// ---------- 2D ----------
function shape2(cells) {
  const xs = cells.map((c) => c[0]), ys = cells.map((c) => c[1]);
  const mx = Math.min(...xs), my = Math.min(...ys);
  return cells.map(([x, y]) => `${x - mx}:${y - my}`).sort().join(' ');
}
function rotClass2(cells) {
  const out = [];
  let c = cells;
  for (let i = 0; i < 4; i++) { out.push(shape2(c)); c = c.map(([x, y]) => [y, -x]); }
  return out.sort()[0];
}
function solveRot2d(item) {
  const ref = rotClass2(item.data.model);
  const mirror = rotClass2(item.data.model.map(([x, y]) => [x, -y]));
  if (ref === mirror) return { ok: false, reason: 'modèle symétrique' };
  const correct = [];
  const notes = item.options.map((o, i) => {
    const c = rotClass2(o.cells);
    if (c === ref) { correct.push(i); return 'Rotation du modèle.'; }
    if (c === mirror) return 'Image miroir du modèle : il faudrait la retourner.';
    return 'Forme différente : une case a été déplacée.';
  });
  return { correct, notes };
}

// ---------- 3D ----------
function shape3(cubes) {
  const m = [0, 1, 2].map((i) => Math.min(...cubes.map((c) => c[i])));
  return cubes.map((c) => c.map((v, i) => v - m[i]).join(':')).sort().join(' ');
}
function rotClass3(cubes) {
  let best = null;
  for (const R of ROTS) {
    const k = shape3(cubes.map((c) => mv(R, c)));
    if (best === null || k < best) best = k;
  }
  return best;
}
const ISO = (x, y, z) => [(y - x) * 0.8660254, (x + y) * 0.5 - z];
function inQuad(px, py, q) {
  // quadrilatère convexe : même signe pour tous les produits vectoriels
  let sign = 0;
  for (let i = 0; i < 4; i++) {
    const [ax, ay] = q[i], [bx, by] = q[(i + 1) % 4];
    const cr = (bx - ax) * (py - ay) - (by - ay) * (px - ax);
    if (Math.abs(cr) < 1e-12) continue;
    const s = cr > 0 ? 1 : -1;
    if (sign && s !== sign) return false;
    sign = s;
  }
  return true;
}
export function visibleFractions(cubes, res = 10) {
  const quads = cubes.map(([x, y, z]) => [
    [ISO(x, y, z + 1), ISO(x + 1, y, z + 1), ISO(x + 1, y + 1, z + 1), ISO(x, y + 1, z + 1)],
    [ISO(x + 1, y, z), ISO(x + 1, y + 1, z), ISO(x + 1, y + 1, z + 1), ISO(x + 1, y, z + 1)],
    [ISO(x, y + 1, z), ISO(x + 1, y + 1, z), ISO(x + 1, y + 1, z + 1), ISO(x, y + 1, z + 1)],
  ]);
  const pts = quads.flat(2);
  const minX = Math.min(...pts.map((p) => p[0])), maxX = Math.max(...pts.map((p) => p[0]));
  const minY = Math.min(...pts.map((p) => p[1])), maxY = Math.max(...pts.map((p) => p[1]));
  const total = Array(cubes.length).fill(0), seen = Array(cubes.length).fill(0);
  const depth = cubes.map((c) => c[0] + c[1] + c[2]);
  for (let py = minY + 0.5 / res; py < maxY; py += 1 / res) {
    for (let px = minX + 0.5 / res; px < maxX; px += 1 / res) {
      let owner = -1;
      for (let i = 0; i < cubes.length; i++) {
        if (quads[i].some((q) => inQuad(px, py, q))) {
          total[i]++;
          if (owner < 0 || depth[i] > depth[owner]) owner = i;
        }
      }
      if (owner >= 0) seen[owner]++;
    }
  }
  return total.map((t, i) => (t ? seen[i] / t : 0));
}
function solveRot3d(item) {
  const ref = rotClass3(item.data.model);
  const mirror = rotClass3(item.data.model.map(([x, y, z]) => [-x, y, z]));
  if (ref === mirror) return { ok: false, reason: 'modèle achiral' };
  for (const obj of [item.data.model, ...item.options.map((o) => o.cubes)]) {
    if (Math.min(...visibleFractions(obj)) < 0.15) return { ok: false, reason: 'cube masqué' };
  }
  const keys = item.options.map((o) => shape3(o.cubes));
  if (new Set(keys).size !== keys.length) return { ok: false, reason: 'options identiques' };
  const correct = [];
  const notes = item.options.map((o, i) => {
    const c = rotClass3(o.cubes);
    if (c === ref) { correct.push(i); return 'Même objet, tourné dans l’espace.'; }
    if (c === mirror) return 'Image miroir du modèle : aucune rotation ne permet de l’obtenir.';
    return 'Objet différent : un cube a été déplacé.';
  });
  return { correct, notes };
}

// ---------- Patrons ----------
const SYM = { circle: 4, dot: 4, plus: 4, square: 4, ring: 4, frame: 4, bar: 2, zed: 2, arrow: 1, tri: 1, ell: 1, eff: 1, half: 1, tee: 1 };
function fold(cells, rots) {
  const at = new Map(cells.map((c, i) => [`${c[0]},${c[1]}`, i]));
  const frames = Array(cells.length).fill(null);
  frames[0] = { n: [0, 0, 1], ex: [1, 0, 0], ey: [0, -1, 0] };
  const stack = [0];
  while (stack.length) {
    const i = stack.pop();
    const { n, ex, ey } = frames[i];
    const [x, y] = cells[i];
    const nb = [
      [x + 1, y, () => ({ n: ex, ex: n.map((v) => -v), ey })],
      [x - 1, y, () => ({ n: ex.map((v) => -v), ex: n, ey })],
      [x, y + 1, () => ({ n: ey, ex, ey: n.map((v) => -v) })],
      [x, y - 1, () => ({ n: ey.map((v) => -v), ex, ey: n })],
    ];
    for (const [nx, ny, make] of nb) {
      const j = at.get(`${nx},${ny}`);
      if (j === undefined || frames[j]) continue;
      frames[j] = make();
      stack.push(j);
    }
  }
  return frames.map((f, i) => {
    const t = (rots[i] * Math.PI) / 180;
    const s = Math.round(Math.sin(t)), c = Math.round(Math.cos(t));
    return { n: f.n, up: [0, 1, 2].map((k) => s * f.ex[k] - c * f.ey[k]) };
  });
}
function upMatches(glyph, a, b) {
  const s = SYM[glyph];
  if (s === 4) return true;
  if (vk(a) === vk(b)) return true;
  return s === 2 && vk(a) === vk(b.map((v) => -v));
}
function solveNet(item) {
  const { cells, rots, glyphs } = item.data;
  const faces = fold(cells, rots);
  if (new Set(faces.map((f) => vk(f.n))).size !== 6) return { ok: false, reason: 'patron non pliable' };
  const opp = (g) => glyphs[faces.findIndex((f) => vk(f.n) === vk(faces[glyphs.indexOf(g)].n.map((v) => -v)))];
  const check = (view, withOrientation) => ROTS.some((Q) => view.every((vf) => {
    const local = mtv(Q, vf.n);
    const idx = faces.findIndex((f) => vk(f.n) === vk(local));
    if (glyphs[idx] !== vf.glyph) return false;
    return !withOrientation || upMatches(vf.glyph, mv(Q, faces[idx].up), vf.up);
  }));
  const correct = [];
  const notes = item.options.map((o, i) => {
    const v = o.faces;
    if (check(v, true)) { correct.push(i); return 'Cube réalisable avec ce patron.'; }
    for (let a = 0; a < 3; a++) for (let b = a + 1; b < 3; b++) {
      if (opp(v[a].glyph) === v[b].glyph) return `Impossible : ${'les faces opposées'} sont visibles ensemble.`;
    }
    if (check(v, false)) return 'Impossible : un symbole n’a pas la bonne orientation.';
    return 'Impossible : l’ordre des trois faces autour du sommet est inversé (image miroir).';
  });
  return { correct, notes };
}

// ---------- Symétries ----------
const TRANSFORMS = {
  // out[r][c] = in[...] (forme « tirée », indépendante du générateur)
  H: (g, N, r, c) => g[N - 1 - r][c],
  V: (g, N, r, c) => g[r][N - 1 - c],
  D: (g, N, r, c) => g[c][r],
  A: (g, N, r, c) => g[N - 1 - c][N - 1 - r],
  R90: (g, N, r, c) => g[N - 1 - c][r],
  R180: (g, N, r, c) => g[N - 1 - r][N - 1 - c],
  R270: (g, N, r, c) => g[c][N - 1 - r],
};
function solveSym(item) {
  const { grid, ops } = item.data;
  const N = grid.length;
  let g = grid;
  for (const op of ops) {
    const src = g;
    g = Array.from({ length: N }, (_, r) => Array.from({ length: N }, (_, c) => TRANSFORMS[op](src, N, r, c)));
  }
  const target = g.map((r) => r.join('')).join('/');
  const keys = item.options.map((o) => o.grid.map((r) => r.join('')).join('/'));
  if (new Set(keys).size !== keys.length) return { ok: false, reason: 'options identiques' };
  const correct = [];
  const notes = item.options.map((o, i) => {
    if (keys[i] === target) { correct.push(i); return 'Résultat exact des transformations.'; }
    let diff = 0;
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (o.grid[r][c] !== g[r][c]) diff++;
    return `Ne correspond pas au résultat (${diff} case${diff > 1 ? 's' : ''} différente${diff > 1 ? 's' : ''}).`;
  });
  return { correct, notes };
}

export function solve(item) {
  const fn = { rot2d: solveRot2d, rot3d: solveRot3d, net: solveNet, sym: solveSym }[item.data.kind];
  if (!fn) return { ok: false, reason: 'type inconnu' };
  const r = fn(item);
  if (r.ok === false) return r;
  if (r.correct.length !== 1) return { ok: false, reason: `${r.correct.length} options correctes` };
  if (r.correct[0] !== item.answer) return { ok: false, reason: 'clé incorrecte' };
  return { ok: true, correct: r.correct, notes: r.notes };
}

export default { solve };
