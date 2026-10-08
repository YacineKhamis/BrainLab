// Visuo-spatial : rotation mentale 2D, rotation mentale 3D (cubes isométriques),
// patrons de cube à plier, symétries composées.

import { esc, svg, fmt } from '../util.js';

const TIME_LIMITS = [0, 40, 45, 50, 60, 70, 75, 90, 80, 70, 60];

// ---------------- Géométrie commune ----------------

const mul = (A, B) => {
  const C = Array(9).fill(0);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++) C[i * 3 + j] += A[i * 3 + k] * B[k * 3 + j];
  return C;
};
const apply = (M, v) => [
  M[0] * v[0] + M[1] * v[1] + M[2] * v[2],
  M[3] * v[0] + M[4] * v[1] + M[5] * v[2],
  M[6] * v[0] + M[7] * v[1] + M[8] * v[2],
];
const transposeM = (M) => [M[0], M[3], M[6], M[1], M[4], M[7], M[2], M[5], M[8]];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const vkey = (v) => v.join(',');
const neg = (v) => v.map((x) => -x || 0);

const ID = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const RX = [1, 0, 0, 0, 0, -1, 0, 1, 0];
const RY = [0, 0, 1, 0, 1, 0, -1, 0, 0];
const RZ = [0, -1, 0, 1, 0, 0, 0, 0, 1];
export const ROTATIONS = (() => {
  const seen = new Map([[ID.join(), ID]]);
  const queue = [ID];
  while (queue.length) {
    const M = queue.shift();
    for (const G of [RX, RY, RZ]) {
      const P = mul(G, M);
      if (!seen.has(P.join())) { seen.set(P.join(), P); queue.push(P); }
    }
  }
  return [...seen.values()];
})();

// Rotation de 90° autour d'un axe unitaire entier k : v' = (k·v)k + k×v.
function rot90About(k) {
  const cols = [[1, 0, 0], [0, 1, 0], [0, 0, 1]].map((e) => {
    const d = k[0] * e[0] + k[1] * e[1] + k[2] * e[2];
    const c = cross(k, e);
    return [d * k[0] + c[0], d * k[1] + c[1], d * k[2] + c[2]];
  });
  return [cols[0][0], cols[1][0], cols[2][0], cols[0][1], cols[1][1], cols[2][1], cols[0][2], cols[1][2], cols[2][2]];
}

// Projection isométrique orthographique, caméra en (+1, +1, +1) : l'axe x part à gauche,
// l'axe y à droite, z vers le haut (repère direct : l'image n'est pas un reflet).
const C30 = Math.cos(Math.PI / 6), S30 = 0.5;
const proj = (p, s) => [(p[1] - p[0]) * C30 * s, ((p[0] + p[1]) * S30 - p[2]) * s];

// ---------------- Rotation 2D (polyominos) ----------------

const norm2 = (cells) => {
  const mx = Math.min(...cells.map((c) => c[0]));
  const my = Math.min(...cells.map((c) => c[1]));
  return cells.map(([x, y]) => [x - mx, y - my]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
};
const rot2 = (cells) => norm2(cells.map(([x, y]) => [-y, x]));
const mir2 = (cells) => norm2(cells.map(([x, y]) => [-x, y]));
const k2 = (cells) => JSON.stringify(norm2(cells));
function canonRot2(cells) {
  let c = norm2(cells);
  const keys = [];
  for (let i = 0; i < 4; i++) { keys.push(k2(c)); c = rot2(c); }
  return keys.sort()[0];
}

function growPoly(rng, k) {
  const cells = [[0, 0]];
  const has = (x, y) => cells.some((c) => c[0] === x && c[1] === y);
  let guard = 0;
  while (cells.length < k && guard++ < 1000) {
    const [x, y] = rng.pick(cells);
    const [dx, dy] = rng.pick([[1, 0], [-1, 0], [0, 1], [0, -1]]);
    if (!has(x + dx, y + dy)) cells.push([x + dx, y + dy]);
  }
  return norm2(cells);
}

function connected2(cells) {
  const set = new Set(cells.map((c) => c.join()));
  const seen = new Set([cells[0].join()]);
  const stack = [cells[0]];
  while (stack.length) {
    const [x, y] = stack.pop();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const k = `${x + dx},${y + dy}`;
      if (set.has(k) && !seen.has(k)) { seen.add(k); stack.push([x + dx, y + dy]); }
    }
  }
  return seen.size === cells.length;
}

function modify2(rng, cells) {
  for (let t = 0; t < 60; t++) {
    const i = rng.int(0, cells.length - 1);
    const rest = cells.filter((_, j) => j !== i);
    if (!connected2(rest)) continue;
    const [x, y] = rng.pick(rest);
    const [dx, dy] = rng.pick([[1, 0], [-1, 0], [0, 1], [0, -1]]);
    const nc = [x + dx, y + dy];
    if (cells.some((c) => c[0] === nc[0] && c[1] === nc[1])) continue;
    const out = norm2([...rest, nc]);
    const cr = canonRot2(out);
    if (cr !== canonRot2(cells) && cr !== canonRot2(mir2(cells))) return out;
  }
  return null;
}

function genRot2d(rng, level) {
  const k = [0, 5, 5, 6, 6, 7, 8, 9, 10, 11, 12][level];
  const nOpts = [0, 4, 4, 4, 5, 6, 6, 6, 6, 6, 6][level];
  let model;
  for (let t = 0; t < 100; t++) {
    const p = growPoly(rng, k);
    const r = canonRot2(p);
    if (r === canonRot2(mir2(p))) continue; // doit être chiral
    let c = p, sym = false;
    for (let i = 1; i < 4; i++) { c = rot2(c); if (k2(c) === k2(p)) sym = true; }
    if (sym) continue;
    model = p;
    break;
  }
  if (!model) throw new Error('polyomino');
  const angleStep = level <= 3 ? 90 : level <= 6 ? 45 : 15;
  const randAngle = () => rng.int(0, Math.floor(359 / angleStep)) * angleStep;
  const modelAngle = level >= 8 ? randAngle() : 0;
  const options = [];
  const used = new Set();
  const addOpt = (cells, kind) => {
    for (let t = 0; t < 20; t++) {
      let c = cells;
      const turns = rng.int(0, 3);
      for (let i = 0; i < turns; i++) c = rot2(c);
      const extra = level <= 3 ? 0 : randAngle() % 90;
      const sig = `${canonRot2(c)}|${(turns * 90 + extra) % 360}`;
      if (kind === 'key' && (turns * 90 + extra) % 360 === modelAngle % 360) continue;
      if (used.has(sig)) continue;
      used.add(sig);
      options.push({ cells: c, angle: extra, kind });
      return true;
    }
    return false;
  };
  addOpt(model, 'key');
  const mirror = mir2(model);
  const useMod = level >= 5;
  let guard = 0;
  while (options.length < nOpts && guard++ < 50) {
    if (useMod && rng.chance(0.4)) {
      const base = rng.chance(0.5) ? model : mirror;
      const m = modify2(rng, base);
      if (m) addOpt(m, 'modified');
    } else addOpt(mirror, 'mirror');
  }
  if (options.length < nOpts) throw new Error('options rot2d');
  const shuffled = rng.shuffle(options);
  return {
    subtype: 'rotation 2D',
    prompt: 'Quelle figure est le modèle simplement tourné dans le plan (sans retournement) ?',
    data: { kind: 'rot2d', model, modelAngle },
    options: shuffled,
    answer: shuffled.findIndex((o) => o.kind === 'key'),
    rules: [
      { title: 'Rotation', text: 'Seule la bonne réponse peut être superposée au modèle par une rotation dans le plan.' },
      { title: 'Pièges', text: useMod ? 'Les autres figures sont des images miroir (il faudrait retourner la pièce) ou des figures dont une case a été déplacée.' : 'Les autres figures sont des images miroir : il faudrait retourner la pièce pour les obtenir.' },
    ],
  };
}

function polySvg(cells, angle, cls = '') {
  const s = 18;
  const w = Math.max(...cells.map((c) => c[0])) + 1;
  const h = Math.max(...cells.map((c) => c[1])) + 1;
  const cx = (w * s) / 2, cy = (h * s) / 2;
  const R = Math.ceil(Math.hypot(w * s, h * s) / 2) + 4;
  let body = `<g transform="translate(${R} ${R}) rotate(${angle}) translate(${fmt(-cx)} ${fmt(-cy)})">`;
  for (const [x, y] of cells) body += `<rect class="poly-cell" x="${x * s}" y="${y * s}" width="${s}" height="${s}"/>`;
  body += '</g>';
  return svg(2 * R, 2 * R, body, `poly ${cls}`, 'Figure');
}

// ---------------- Rotation 3D (polycubes) ----------------

const norm3 = (cubes) => {
  const m = [0, 1, 2].map((i) => Math.min(...cubes.map((c) => c[i])));
  return cubes.map((c) => c.map((v, i) => v - m[i])).sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
};
const k3 = (cubes) => JSON.stringify(norm3(cubes));
function canon3(cubes) {
  let best = null;
  for (const R of ROTATIONS) {
    const k = k3(cubes.map((c) => apply(R, c)));
    if (best === null || k < best) best = k;
  }
  return best;
}
const mir3 = (cubes) => norm3(cubes.map(([x, y, z]) => [-x, y, z]));

function growArms(rng, nSeg, minCubes, maxCubes) {
  for (let t = 0; t < 200; t++) {
    const cubes = [[0, 0, 0]];
    let cur = [0, 0, 0];
    let prevAxis = -1;
    let ok = true;
    const segs = [];
    for (let s = 0; s < nSeg && ok; s++) {
      const axis = rng.pick([0, 1, 2].filter((a) => a !== prevAxis));
      const dir = rng.pick([1, -1]);
      const len = rng.int(s === 0 ? 2 : 1, 3);
      for (let i = 0; i < len; i++) {
        const nx = cur.slice();
        nx[axis] += dir;
        if (cubes.some((c) => c[0] === nx[0] && c[1] === nx[1] && c[2] === nx[2])) { ok = false; break; }
        // pas de contact avec un cube non consécutif (forme lisible)
        const touching = cubes.filter((c) => Math.abs(c[0] - nx[0]) + Math.abs(c[1] - nx[1]) + Math.abs(c[2] - nx[2]) === 1);
        if (touching.length > 1) { ok = false; break; }
        cubes.push(nx);
        cur = nx;
      }
      segs.push({ axis, dir, len });
      prevAxis = axis;
    }
    if (!ok || cubes.length < minCubes || cubes.length > maxCubes) continue;
    // au moins trois directions utilisées → forme non plane
    if (new Set(segs.map((s) => s.axis)).size < 3) continue;
    return norm3(cubes);
  }
  return null;
}

function modify3(rng, cubes) {
  // Déplace le cube terminal d'un bras vers une autre position adjacente.
  for (let t = 0; t < 60; t++) {
    const ends = cubes.filter((c) => cubes.filter((d) => Math.abs(c[0] - d[0]) + Math.abs(c[1] - d[1]) + Math.abs(c[2] - d[2]) === 1).length === 1);
    const e = rng.pick(ends);
    const rest = cubes.filter((c) => c !== e);
    const anchor = rng.pick(rest);
    const dirs = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
    const d = rng.pick(dirs);
    const nc = [anchor[0] + d[0], anchor[1] + d[1], anchor[2] + d[2]];
    if (cubes.some((c) => c[0] === nc[0] && c[1] === nc[1] && c[2] === nc[2])) continue;
    const touching = rest.filter((c) => Math.abs(c[0] - nc[0]) + Math.abs(c[1] - nc[1]) + Math.abs(c[2] - nc[2]) === 1);
    if (touching.length !== 1) continue;
    const out = norm3([...rest, nc]);
    const c0 = canon3(out);
    if (c0 !== canon3(cubes) && c0 !== canon3(mir3(cubes))) return out;
  }
  return null;
}

// Visibilité par lancer de rayons vers la caméra (fraction d'échantillons visibles par cube).
function rayHitsBox(p, q) {
  // rayon p + t(1,1,1), boîte [q, q+1]^3
  let t0 = 1e-6, t1 = Infinity;
  for (let i = 0; i < 3; i++) {
    const a = (q[i] - p[i]), b = (q[i] + 1 - p[i]);
    t0 = Math.max(t0, Math.min(a, b));
    t1 = Math.min(t1, Math.max(a, b));
  }
  return t1 > t0 + 1e-6;
}
export function minVisibility(cubes) {
  let worst = 1;
  const samples = [0.2, 0.5, 0.8];
  for (const c of cubes) {
    let vis = 0, tot = 0;
    for (const face of [0, 1, 2]) {
      for (const u of samples) for (const v of samples) {
        const p = [c[0] + u, c[1] + v, c[2] + u];
        p[face] = c[face] + 1;
        if (face === 0) { p[1] = c[1] + u; p[2] = c[2] + v; }
        if (face === 1) { p[0] = c[0] + u; p[2] = c[2] + v; }
        if (face === 2) { p[0] = c[0] + u; p[1] = c[1] + v; }
        tot++;
        if (!cubes.some((d) => d !== c && rayHitsBox(p, d))) vis++;
      }
    }
    worst = Math.min(worst, vis / tot);
  }
  return worst;
}

function goodRotation(rng, cubes, exclude = []) {
  for (const R of rng.shuffle(ROTATIONS)) {
    if (exclude.includes(R.join())) continue;
    const c = norm3(cubes.map((v) => apply(R, v)));
    if (minVisibility(c) >= 0.2) return { cubes: c, R };
  }
  return null;
}

function genRot3d(rng, level) {
  const [minC, maxC, nSeg] = {
    3: [4, 5, 3], 4: [5, 6, 3], 5: [5, 7, 3], 6: [6, 7, 4], 7: [7, 8, 4], 8: [8, 9, 4], 9: [8, 10, 5], 10: [9, 11, 5],
  }[Math.max(3, level)];
  const nOpts = level <= 5 ? 4 : level <= 7 ? 5 : 6;
  let model = null;
  for (let t = 0; t < 30 && !model; t++) {
    const m = growArms(rng, nSeg, minC, maxC);
    if (!m) continue;
    if (canon3(m) === canon3(mir3(m))) continue;
    const g = goodRotation(rng, m);
    if (g) model = g.cubes;
  }
  if (!model) throw new Error('polycube');
  const options = [];
  const seen = new Set([k3(model)]);
  const add = (cubes, kind) => {
    const g = goodRotation(rng, cubes);
    if (!g || seen.has(k3(g.cubes))) return;
    seen.add(k3(g.cubes));
    options.push({ cubes: g.cubes, kind });
  };
  add(model, 'key');
  if (!options.length) throw new Error('rotation clé');
  const mirror = mir3(model);
  let guard = 0;
  while (options.length < nOpts && guard++ < 40) {
    if (level >= 5 && rng.chance(0.45)) {
      const m = modify3(rng, rng.chance(0.6) ? model : mirror);
      if (m) add(m, 'modified');
    } else add(mirror, 'mirror');
  }
  if (options.length < nOpts) throw new Error('options rot3d');
  const sh = rng.shuffle(options);
  return {
    subtype: 'rotation 3D',
    prompt: 'Quel assemblage de cubes est le modèle vu sous un autre angle (rotation dans l’espace, sans reflet) ?',
    data: { kind: 'rot3d', model },
    options: sh,
    answer: sh.findIndex((o) => o.kind === 'key'),
    rules: [
      { title: 'Rotation dans l’espace', text: 'La bonne réponse est le même objet tourné dans l’espace : suivez la succession des bras (longueur et sens de chaque coude).' },
      { title: 'Pièges', text: level >= 5 ? 'Les autres objets sont l’image miroir du modèle (les coudes tournent dans l’autre sens) ou un objet dont un cube a été déplacé.' : 'Les autres objets sont l’image miroir du modèle : les coudes tournent dans l’autre sens.' },
    ],
  };
}

export function cubesSvg(cubes, s = 22, cls = '') {
  const order = cubes.slice().sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]));
  let body = '';
  const pts = [];
  const faces = [];
  for (const [x, y, z] of order) {
    const F = [
      ['c-top', [[x, y, z + 1], [x + 1, y, z + 1], [x + 1, y + 1, z + 1], [x, y + 1, z + 1]]],
      ['c-x', [[x + 1, y, z], [x + 1, y + 1, z], [x + 1, y + 1, z + 1], [x + 1, y, z + 1]]],
      ['c-y', [[x, y + 1, z], [x + 1, y + 1, z], [x + 1, y + 1, z + 1], [x, y + 1, z + 1]]],
    ];
    for (const [c, poly] of F) {
      const pp = poly.map((p) => proj(p, s));
      pts.push(...pp);
      faces.push([c, pp]);
    }
  }
  const minX = Math.min(...pts.map((p) => p[0])) - 4, minY = Math.min(...pts.map((p) => p[1])) - 4;
  const maxX = Math.max(...pts.map((p) => p[0])) + 4, maxY = Math.max(...pts.map((p) => p[1])) + 4;
  for (const [c, pp] of faces) body += `<polygon class="${c}" points="${pp.map((p) => `${fmt(p[0] - minX)},${fmt(p[1] - minY)}`).join(' ')}"/>`;
  return svg(maxX - minX, maxY - minY, body, `cubes ${cls}`, 'Assemblage de cubes');
}

// ---------------- Patrons de cube ----------------

export const NETS = [
  [[0, 0], [0, 1], [1, 1], [2, 1], [3, 1], [0, 2]],
  [[0, 0], [0, 1], [1, 1], [2, 1], [3, 1], [1, 2]],
  [[0, 0], [0, 1], [1, 1], [2, 1], [3, 1], [2, 2]],
  [[0, 0], [0, 1], [1, 1], [2, 1], [3, 1], [3, 2]],
  [[1, 0], [0, 1], [1, 1], [2, 1], [3, 1], [1, 2]],
  [[1, 0], [0, 1], [1, 1], [2, 1], [3, 1], [2, 2]],
  [[0, 0], [1, 0], [1, 1], [2, 1], [3, 1], [1, 2]],
  [[0, 0], [1, 0], [1, 1], [2, 1], [3, 1], [2, 2]],
  [[0, 0], [1, 0], [1, 1], [2, 1], [3, 1], [3, 2]],
  [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2], [3, 2]],
  [[0, 0], [1, 0], [2, 0], [2, 1], [3, 1], [4, 1]],
];

// sym : 4 = invariant par quart de tour, 2 = par demi-tour, 1 = orienté
export const GLYPHS = {
  circle: { sym: 4, name: 'cercle' },
  dot: { sym: 4, name: 'disque' },
  plus: { sym: 4, name: 'croix' },
  square: { sym: 4, name: 'carré plein' },
  ring: { sym: 4, name: 'double cercle' },
  frame: { sym: 4, name: 'carré vide' },
  bar: { sym: 2, name: 'barre' },
  zed: { sym: 2, name: 'Z' },
  arrow: { sym: 1, name: 'flèche' },
  tri: { sym: 1, name: 'triangle' },
  ell: { sym: 1, name: 'L' },
  eff: { sym: 1, name: 'F' },
  half: { sym: 1, name: 'demi-carré' },
  tee: { sym: 1, name: 'T' },
};

export function glyphBody(g) {
  // Coordonnées locales dans [-1, 1], « haut » = y négatif.
  switch (g) {
    case 'circle': return '<circle class="gl-s" cx="0" cy="0" r="0.6"/>';
    case 'dot': return '<circle class="gl-f" cx="0" cy="0" r="0.5"/>';
    case 'plus': return '<path class="gl-s" d="M-0.65 0H0.65M0 -0.65V0.65"/>';
    case 'square': return '<rect class="gl-f" x="-0.45" y="-0.45" width="0.9" height="0.9"/>';
    case 'ring': return '<circle class="gl-s" cx="0" cy="0" r="0.65"/><circle class="gl-s" cx="0" cy="0" r="0.3"/>';
    case 'frame': return '<rect class="gl-s" x="-0.55" y="-0.55" width="1.1" height="1.1"/>';
    case 'bar': return '<rect class="gl-f" x="-0.7" y="-0.18" width="1.4" height="0.36"/>';
    case 'zed': return '<path class="gl-s" d="M-0.55 -0.55H0.55L-0.55 0.55H0.55"/>';
    case 'arrow': return '<path class="gl-s" d="M0 0.7V-0.6M-0.45 -0.15L0 -0.65L0.45 -0.15"/>';
    case 'tri': return '<polygon class="gl-f" points="0,-0.7 0.6,0.5 -0.6,0.5"/>';
    case 'ell': return '<path class="gl-s" d="M-0.35 -0.7V0.6H0.5"/>';
    case 'eff': return '<path class="gl-s" d="M-0.35 0.7V-0.6H0.5M-0.35 -0.05H0.3"/>';
    case 'half': return '<rect class="gl-s" x="-0.6" y="-0.6" width="1.2" height="1.2"/><rect class="gl-f" x="-0.6" y="-0.6" width="1.2" height="0.6"/>';
    case 'tee': return '<path class="gl-s" d="M-0.6 -0.6H0.6M0 -0.6V0.7"/>';
    default: return '';
  }
}

// Repliage par « roulement » du cube sur le patron.
export function foldNet(cells, rots) {
  const idx = new Map(cells.map((c, i) => [c.join(), i]));
  const result = Array(cells.length);
  const Rs = Array(cells.length);
  Rs[0] = ID;
  const queue = [0];
  const seen = new Set([0]);
  while (queue.length) {
    const i = queue.shift();
    const R = Rs[i];
    const Rt = transposeM(R);
    const th = (rots[i] * Math.PI) / 180;
    const upW = [Math.round(Math.sin(th)), Math.round(Math.cos(th)), 0];
    result[i] = { n: apply(Rt, [0, 0, 1]), up: apply(Rt, upW) };
    const [x, y] = cells[i];
    for (const [dx, dy, d] of [[1, 0, [1, 0, 0]], [-1, 0, [-1, 0, 0]], [0, 1, [0, -1, 0]], [0, -1, [0, 1, 0]]]) {
      const j = idx.get(`${x + dx},${y + dy}`);
      if (j === undefined || seen.has(j)) continue;
      seen.add(j);
      const S = rot90About(cross(d, [0, 0, 1]));
      Rs[j] = mul(S, R);
      queue.push(j);
    }
  }
  return result;
}

const VIEW_NORMALS = [[0, 0, 1], [0, 1, 0], [1, 0, 0]]; // dessus, face droite (+y), face gauche (+x)

function sameUp(glyph, a, b) {
  const s = GLYPHS[glyph].sym;
  if (s === 4) return true;
  if (s === 2) return vkey(a) === vkey(b) || vkey(a) === vkey(neg(b));
  return vkey(a) === vkey(b);
}

function viewFrom(folded, glyphs, Q) {
  return VIEW_NORMALS.map((N) => {
    const nLocal = apply(transposeM(Q), N);
    const f = folded.findIndex((F) => vkey(F.n) === vkey(nLocal));
    return { n: N, glyph: glyphs[f], up: apply(Q, folded[f].up) };
  });
}

function viewConsistent(folded, glyphs, faces) {
  return ROTATIONS.some((Q) => {
    const v = viewFrom(folded, glyphs, Q);
    return v.every((f, i) => f.glyph === faces[i].glyph && sameUp(f.glyph, f.up, faces[i].up));
  });
}

function viewKey(faces) {
  return faces.map((f) => {
    const s = GLYPHS[f.glyph].sym;
    let up = f.up;
    if (s === 4) up = [0, 0, 0];
    else if (s === 2 && vkey(up) < vkey(neg(up))) up = neg(up);
    return `${f.glyph}:${vkey(up)}`;
  }).join('|');
}

function inPlaneDirs(n) {
  return [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].filter((v) => v[0] * n[0] + v[1] * n[1] + v[2] * n[2] === 0);
}

function genNet(rng, level) {
  const nOpts = level <= 4 ? 4 : level <= 7 ? 5 : 6;
  const full = ['circle', 'dot', 'plus', 'square', 'ring', 'frame'];
  const oriented = ['arrow', 'tri', 'ell', 'eff', 'half', 'tee'];
  let glyphPool;
  if (level <= 4) glyphPool = rng.shuffle(full);
  else if (level <= 7) glyphPool = rng.shuffle([...rng.sample(full, 3), ...rng.sample([...oriented, 'bar', 'zed'], 3)]);
  else glyphPool = rng.shuffle(oriented);
  // Patron : choix, rotation et éventuel retournement de la mise en page.
  let cells = rng.pick(NETS).map((c) => c.slice());
  const turns = rng.int(0, 3);
  for (let t = 0; t < turns; t++) cells = norm2(cells.map(([x, y]) => [-y, x]));
  if (rng.chance(0.5)) cells = norm2(cells.map(([x, y]) => [-x, y]));
  cells = rng.shuffle(cells);
  const rots = cells.map((_, i) => (GLYPHS[glyphPool[i]].sym === 4 ? 0 : rng.pick([0, 90, 180, 270])));
  const folded = foldNet(cells, rots);
  if (new Set(folded.map((f) => vkey(f.n))).size !== 6) throw new Error('patron invalide');
  const glyphs = glyphPool;
  const Q0 = rng.pick(ROTATIONS);
  const keyFaces = viewFrom(folded, glyphs, Q0);
  const opposite = (g) => {
    const f = folded[glyphs.indexOf(g)];
    return glyphs[folded.findIndex((F) => vkey(F.n) === vkey(neg(f.n)))];
  };
  const seen = new Set([viewKey(keyFaces)]);
  const distractors = [];
  const candidates = [];
  const clone = (faces) => faces.map((f) => ({ n: f.n.slice(), glyph: f.glyph, up: f.up.slice() }));
  // 1) Faces gauche/droite échangées (agencement en miroir).
  {
    const c = clone(keyFaces);
    const Rz = [0, 1, 0, -1, 0, 0, 0, 0, 1]; // +y -> +x
    const RzInv = transposeM(Rz);
    const L = c[1], Rr = c[2];
    c[1] = { n: [0, 1, 0], glyph: Rr.glyph, up: apply(RzInv, Rr.up) };
    c[2] = { n: [1, 0, 0], glyph: L.glyph, up: apply(Rz, L.up) };
    candidates.push(['swap', c]);
  }
  // 2) Une face remplacée par la face opposée.
  for (let i = 0; i < 3; i++) {
    const c = clone(keyFaces);
    c[i].glyph = opposite(c[i].glyph);
    c[i].up = rng.pick(inPlaneDirs(c[i].n));
    candidates.push(['opposite', c]);
  }
  // 3) Un symbole orienté tourné d'un quart ou d'un demi-tour.
  for (let i = 0; i < 3; i++) {
    if (GLYPHS[keyFaces[i].glyph].sym === 4) continue;
    for (const dir of inPlaneDirs(keyFaces[i].n)) {
      if (sameUp(keyFaces[i].glyph, dir, keyFaces[i].up)) continue;
      const c = clone(keyFaces);
      c[i].up = dir;
      candidates.push(['orientation', c]);
    }
  }
  // 4) Chimères : une face d'une autre vue valide.
  for (let t = 0; t < 6; t++) {
    const other = viewFrom(folded, glyphs, rng.pick(ROTATIONS));
    const c = clone(keyFaces);
    const i = rng.int(0, 2);
    c[i] = { n: keyFaces[i].n.slice(), glyph: other[i].glyph, up: other[i].up };
    candidates.push(['chimère', c]);
  }
  const weight = (kind) => (level >= 8 && kind === 'orientation' ? 0 : level <= 4 && kind === 'orientation' ? 3 : 1);
  const ordered = rng.shuffle(candidates).sort((a, b) => weight(a[0]) - weight(b[0]));
  for (const [kind, faces] of ordered) {
    if (distractors.length >= nOpts - 1) break;
    if (faces.some((f, i) => faces.findIndex((g) => g.glyph === f.glyph) !== i)) continue;
    const k = viewKey(faces);
    if (seen.has(k)) continue;
    if (viewConsistent(folded, glyphs, faces)) continue;
    seen.add(k);
    distractors.push({ faces, kind });
  }
  if (distractors.length < nOpts - 1) throw new Error('distracteurs patron');
  const options = rng.shuffle([{ faces: keyFaces, kind: 'key' }, ...distractors]);
  const pairs = [];
  const done = new Set();
  for (const g of glyphs) {
    if (done.has(g)) continue;
    const o = opposite(g);
    done.add(g); done.add(o);
    pairs.push(`${GLYPHS[g].name} ↔ ${GLYPHS[o].name}`);
  }
  return {
    subtype: 'patron',
    prompt: 'Une fois plié (symboles à l’extérieur), quel cube peut-on obtenir avec ce patron ?',
    data: { kind: 'net', cells, rots, glyphs },
    options,
    answer: options.findIndex((o) => o.kind === 'key'),
    rules: [
      { title: 'Faces opposées', text: `Deux faces opposées ne sont jamais visibles ensemble. Paires opposées : ${pairs.join(' ; ')}.` },
      { title: 'Ordre autour d’un sommet', text: 'Les trois faces visibles se succèdent autour d’un sommet dans un ordre fixé par le patron : un cube qui montre cet ordre inversé est une image miroir.' },
      ...(glyphs.some((g) => GLYPHS[g].sym < 4) ? [{ title: 'Orientation', text: 'Les symboles orientés gardent leur orientation par rapport aux arêtes voisines : un symbole qui pointe vers la mauvaise arête rend le cube impossible.' }] : []),
    ],
  };
}

export function netSvg(cells, rots, glyphs, s = 44) {
  const w = Math.max(...cells.map((c) => c[0])) + 1;
  const h = Math.max(...cells.map((c) => c[1])) + 1;
  let body = '';
  cells.forEach(([x, y], i) => {
    body += `<rect class="net-cell" x="${x * s + 2}" y="${y * s + 2}" width="${s}" height="${s}"/>`;
    body += `<g transform="translate(${x * s + 2 + s / 2} ${y * s + 2 + s / 2}) rotate(${rots[i]}) scale(${s * 0.36})">${glyphBody(glyphs[i])}</g>`;
  });
  return svg(w * s + 4, h * s + 4, body, 'net', 'Patron de cube');
}

export function cubeViewSvg(faces, s = 70) {
  const P = (p) => proj(p, s);
  const faceDefs = {
    '0,0,1': { cls: 'c-top', poly: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], c: [0.5, 0.5, 1] },
    '1,0,0': { cls: 'c-x', poly: [[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]], c: [1, 0.5, 0.5] },
    '0,1,0': { cls: 'c-y', poly: [[0, 1, 0], [1, 1, 0], [1, 1, 1], [0, 1, 1]], c: [0.5, 1, 0.5] },
  };
  const all = Object.values(faceDefs).flatMap((d) => d.poly.map(P));
  const minX = Math.min(...all.map((p) => p[0])) - 3, minY = Math.min(...all.map((p) => p[1])) - 3;
  const maxX = Math.max(...all.map((p) => p[0])) + 3, maxY = Math.max(...all.map((p) => p[1])) + 3;
  let body = '';
  for (const f of faces) {
    const d = faceDefs[vkey(f.n)];
    body += `<polygon class="${d.cls}" points="${d.poly.map(P).map((p) => `${fmt(p[0] - minX)},${fmt(p[1] - minY)}`).join(' ')}"/>`;
    const a = cross(f.up, f.n);
    const A = proj(a, 1), B = proj(f.up, 1);
    const C = P(d.c);
    const k = s * 0.3;
    const m = [A[0] * k, A[1] * k, -B[0] * k, -B[1] * k, C[0] - minX, C[1] - minY].map(fmt).join(' ');
    body += `<g transform="matrix(${m})">${glyphBody(f.glyph).replace(/\/>/g, ' vector-effect="non-scaling-stroke"/>')}</g>`;
  }
  return svg(maxX - minX, maxY - minY, body, 'cubeview', 'Cube');
}

// ---------------- Symétries composées ----------------

export const OPS = {
  H: { name: 'symétrie d’axe horizontal (haut ↔ bas)', f: (r, c, N) => [N - 1 - r, c] },
  V: { name: 'symétrie d’axe vertical (gauche ↔ droite)', f: (r, c, N) => [r, N - 1 - c] },
  D: { name: 'symétrie par rapport à la diagonale ↘', f: (r, c) => [c, r] },
  A: { name: 'symétrie par rapport à la diagonale ↙', f: (r, c, N) => [N - 1 - c, N - 1 - r] },
  R90: { name: 'rotation de 90° dans le sens horaire', f: (r, c, N) => [c, N - 1 - r] },
  R180: { name: 'rotation de 180°', f: (r, c, N) => [N - 1 - r, N - 1 - c] },
  R270: { name: 'rotation de 90° dans le sens antihoraire', f: (r, c, N) => [N - 1 - c, r] },
};
const INVERSE = { H: 'H', V: 'V', D: 'D', A: 'A', R90: 'R270', R270: 'R90', R180: 'R180' };

function applyOpGrid(g, op) {
  const N = g.length;
  const out = g.map((row) => row.map(() => 0));
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    const [r2, c2] = OPS[op].f(r, c, N);
    out[r2][c2] = g[r][c];
  }
  return out;
}
const gk = (g) => g.map((r) => r.join('')).join('/');

function genSym(rng, level) {
  const N = [0, 4, 4, 5, 5, 5, 5, 6, 6, 6, 6][level];
  const nOps = [0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 6][level];
  const colors = level >= 5 ? 2 : 1;
  const nOpts = [0, 4, 4, 4, 5, 6, 6, 6, 6, 6, 6][level];
  let grid;
  for (let t = 0; t < 100; t++) {
    const g = Array.from({ length: N }, () => Array(N).fill(0));
    const k = Math.round(N * N * (0.3 + rng.next() * 0.15));
    const cells = rng.sample([...Array(N * N).keys()], k);
    cells.forEach((i, j) => { g[Math.floor(i / N)][i % N] = colors === 2 && j % 3 === 0 ? 2 : 1; });
    const imgs = new Set(Object.keys(OPS).map((op) => gk(applyOpGrid(g, op))));
    imgs.add(gk(g));
    if (imgs.size === 8) { grid = g; break; }
  }
  if (!grid) throw new Error('motif symétrique');
  const opNames = Object.keys(OPS);
  const ops = [];
  for (let i = 0; i < nOps; i++) {
    let op;
    do op = rng.pick(opNames); while (ops.length && op === ops[ops.length - 1]);
    ops.push(op);
  }
  const run = (list) => list.reduce((g, op) => applyOpGrid(g, op), grid);
  const result = run(ops);
  if (gk(result) === gk(grid) && level >= 3) throw new Error('composition triviale');
  const seen = new Set([gk(result)]);
  const distractors = [];
  const add = (g, kind) => {
    if (distractors.length >= nOpts - 1) return;
    const k = gk(g);
    if (seen.has(k)) return;
    seen.add(k);
    distractors.push({ grid: g, kind });
  };
  // Pièges plausibles : ordre inversé, étape oubliée, mauvais sens de rotation.
  add(run(ops.slice().reverse()), 'ordre inversé');
  for (let i = 0; i < ops.length; i++) add(run(ops.filter((_, j) => j !== i)), 'étape oubliée');
  for (let i = 0; i < ops.length; i++) add(run(ops.map((op, j) => (j === i ? INVERSE[op] : op))), 'sens inversé');
  if (level >= 7) {
    for (let t = 0; t < 3; t++) {
      const g = result.map((r) => r.slice());
      const r = rng.int(0, N - 1), c = rng.int(0, N - 1);
      g[r][c] = g[r][c] ? 0 : 1;
      add(g, 'case modifiée');
    }
  }
  for (const op of rng.shuffle(opNames)) add(applyOpGrid(grid, op), 'autre transformation');
  add(grid, 'figure non transformée');
  if (distractors.length < nOpts - 1) throw new Error('distracteurs symétrie');
  const options = rng.shuffle([{ grid: result, kind: 'key' }, ...rng.shuffle(distractors)]);
  const steps = [];
  ops.reduce((g, op) => { const n = applyOpGrid(g, op); steps.push(n); return n; }, grid);
  return {
    subtype: 'symétries composées',
    prompt: `On applique successivement à la figure : ${ops.map((op, i) => `(${i + 1}) ${OPS[op].name}`).join(', ')}. Quel est le résultat ?`,
    data: { kind: 'sym', grid, ops, steps },
    options,
    answer: options.findIndex((o) => o.kind === 'key'),
    rules: [
      { title: 'Transformations', text: ops.map((op, i) => `${i + 1}. ${OPS[op].name}`).join(' ; ') + '.' },
      { title: 'Méthode', text: 'Appliquez les transformations dans l’ordre en suivant une case repère (par exemple une case colorée dans un coin) ; les étapes intermédiaires sont montrées ci-dessus.' },
    ],
  };
}

export function gridSvg(g, s = 20, cls = '') {
  const N = g.length;
  let body = `<rect class="sg-bg" x="0" y="0" width="${N * s + 2}" height="${N * s + 2}"/>`;
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    body += `<rect class="${g[r][c] === 2 ? 'sg-on2' : g[r][c] ? 'sg-on' : 'sg-off'}" x="${c * s + 1}" y="${r * s + 1}" width="${s}" height="${s}"/>`;
  }
  return svg(N * s + 2, N * s + 2, body, `symgrid ${cls}`, 'Grille');
}

// ---------------- Assemblage ----------------

export function generate(rng, level) {
  const kinds = level === 1 ? ['rot2d', 'sym'] : level === 2 ? ['rot2d', 'sym', 'net'] : ['rot2d', 'sym', 'net', 'rot3d'];
  const kind = rng.pick(kinds);
  const fn = { rot2d: genRot2d, rot3d: genRot3d, net: genNet, sym: genSym }[kind];
  const r = fn(rng, level);
  return { category: 'spatial', level, timeLimit: TIME_LIMITS[level], ...r };
}

export function renderStimulus(item) {
  const d = item.data;
  if (d.kind === 'rot2d') return `<div class="stim-row"><div class="stim-label">Modèle</div>${polySvg(d.model, d.modelAngle, 'model')}</div>`;
  if (d.kind === 'rot3d') return `<div class="stim-row"><div class="stim-label">Modèle</div>${cubesSvg(d.model, 26, 'model')}</div>`;
  if (d.kind === 'net') return `<div class="stim-row">${netSvg(d.cells, d.rots, d.glyphs)}</div>`;
  return `<div class="stim-row"><div class="stim-label">Figure de départ</div>${gridSvg(d.grid, 26)}</div>`;
}

export function renderOption(item, i) {
  const d = item.data, o = item.options[i];
  if (d.kind === 'rot2d') return polySvg(o.cells, o.angle);
  if (d.kind === 'rot3d') return cubesSvg(o.cubes, 18);
  if (d.kind === 'net') return cubeViewSvg(o.faces, 52);
  return gridSvg(o.grid, 16);
}

export function renderExplanation(item) {
  const d = item.data;
  const key = item.options[item.answer];
  let vis = '';
  if (d.kind === 'rot2d') {
    let turns = 0, c = d.model;
    for (; turns < 4 && k2(c) !== k2(key.cells); turns++) c = rot2(c);
    const angle = (turns * 90 + key.angle - d.modelAngle + 720) % 360;
    vis = `<div class="exp-chain">${polySvg(d.model, d.modelAngle)}<span class="arrow">→ rotation de ${angle}° (sens horaire) →</span>${polySvg(key.cells, key.angle, 'hl')}</div>`;
  } else if (d.kind === 'rot3d') {
    vis = `<div class="exp-chain">${cubesSvg(d.model, 20)}<span class="arrow">→ même objet, tourné →</span>${cubesSvg(key.cubes, 20, 'hl')}</div>`;
  } else if (d.kind === 'net') {
    vis = `<div class="exp-chain">${netSvg(d.cells, d.rots, d.glyphs, 40)}<span class="arrow">→ pliage →</span>${cubeViewSvg(key.faces, 60)}</div>`;
  } else {
    vis = `<div class="exp-chain">${gridSvg(d.grid, 14)}${d.steps.map((g, i) => `<span class="arrow">→ ${i + 1}. ${esc(OPS[d.ops[i]].name)} →</span>${gridSvg(g, 14, i === d.steps.length - 1 ? 'hl' : '')}`).join('')}</div>`;
  }
  let html = `<div class="exp-visual">${vis}</div><ol class="rule-list">`;
  for (const r of item.rules) html += `<li><strong>${esc(r.title)}</strong> — ${esc(r.text)}</li>`;
  return html + '</ol>';
}

export default { id: 'spatial', generate, renderStimulus, renderOption, renderExplanation };
