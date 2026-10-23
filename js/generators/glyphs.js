// Glyphes abstraits pour les épreuves de vitesse (Symboles, Code) : 3 ou 4 traits
// reliant des points voisins d'une grille 3 × 3. Une rotation ou un reflet d'un
// glyphe donne un glyphe différent (piège visuel) sauf s'il est symétrique.

import { svg } from '../util.js';

const SEGMENTS = [];
for (let a = 0; a < 9; a++) {
  for (let b = a + 1; b < 9; b++) {
    if (Math.abs((a % 3) - (b % 3)) <= 1 && Math.abs(Math.floor(a / 3) - Math.floor(b / 3)) <= 1) SEGMENTS.push([a, b]);
  }
}

export const glyphKey = (g) => g.map(([a, b]) => (a < b ? `${a}-${b}` : `${b}-${a}`)).sort().join(' ');

const mapPoint = (p, f) => { const [x, y] = f(p % 3, Math.floor(p / 3)); return y * 3 + x; };
const mapGlyph = (g, f) => g.map(([a, b]) => [mapPoint(a, f), mapPoint(b, f)].sort((u, v) => u - v)).sort((u, v) => u[0] - v[0] || u[1] - v[1]);
export const rot90 = (g) => mapGlyph(g, (x, y) => [2 - y, x]);
export const mirrorG = (g) => mapGlyph(g, (x, y) => [2 - x, y]);

function connectedG(g) {
  const pts = new Set(g.flat());
  const seen = new Set([g[0][0]]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const [a, b] of g) {
      if (seen.has(a) !== seen.has(b)) { seen.add(a); seen.add(b); grew = true; }
    }
  }
  return seen.size === pts.size;
}

export function randomGlyph(rng) {
  for (;;) {
    const n = rng.int(3, 4);
    const g = rng.sample(SEGMENTS, n).map((s) => s.slice()).sort((u, v) => u[0] - v[0] || u[1] - v[1]);
    // Glyphes compacts et lisibles : traits reliés, au moins 4 points distincts.
    if (connectedG(g) && new Set(g.flat()).size >= 4) return g;
  }
}

// Variantes trompeuses : rotation d'un quart ou d'un demi-tour, reflet.
export function lureOf(rng, g) {
  const t = rng.int(0, 3);
  if (t === 0) return rot90(g);
  if (t === 1) return rot90(rot90(g));
  if (t === 2) return mirrorG(g);
  return rot90(rot90(rot90(g)));
}

// Ensemble de glyphes deux à deux distincts.
export function glyphSet(rng, n, exclude = new Set()) {
  const out = [];
  const keys = new Set(exclude);
  while (out.length < n) {
    const g = randomGlyph(rng);
    const k = glyphKey(g);
    if (keys.has(k)) continue;
    keys.add(k);
    out.push(g);
  }
  return out;
}

export function glyphSvg(g, size = 34, cls = '') {
  const s = (size - 8) / 2;
  const P = (p) => [4 + (p % 3) * s, 4 + Math.floor(p / 3) * s];
  const d = g.map(([a, b]) => { const [x1, y1] = P(a), [x2, y2] = P(b); return `M${x1} ${y1}L${x2} ${y2}`; }).join('');
  return svg(size, size, `<path class="sy-g" d="${d}"/>`, `glyph ${cls}`);
}
