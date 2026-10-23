// Cubes (type WAIS-IV, raisonnement perceptif) : reproduire un modèle avec des
// blocs dont chaque face visible est blanche, rouge ou coupée en diagonale
// (moitié rouge, moitié blanche). Item interactif et chronométré : on choisit
// une face dans la palette puis on clique les cases de sa construction.

import { esc, svg } from '../util.js';

// Faces : 0 blanche, 1 rouge, 2-5 moitié rouge dans le coin haut-gauche,
// haut-droit, bas-droit, bas-gauche.
export const FACES = [0, 1, 2, 3, 4, 5];
export const FACE_NAMES = ['blanche', 'rouge', 'rouge en haut à gauche', 'rouge en haut à droite', 'rouge en bas à droite', 'rouge en bas à gauche'];
export const isDiag = (f) => f >= 2;
const MIRROR_LR = [0, 1, 3, 2, 5, 4];
const MIRROR_TB = [0, 1, 5, 4, 3, 2];
const ROT90 = [0, 1, 3, 4, 5, 2];

export const LEVELS = [null,
  { n: 2, diag: [0, 1], grid: true, time: 60 },
  { n: 2, diag: [1, 2], grid: true, time: 60 },
  { n: 2, diag: [2, 4], grid: true, time: 75 },
  { n: 3, diag: [2, 4], grid: true, time: 90 },
  { n: 3, diag: [3, 6], grid: true, time: 120 },
  { n: 3, diag: [4, 7], grid: false, time: 120 },
  { n: 3, diag: [5, 9], grid: false, time: 120 },
  { n: 4, diag: [6, 10], grid: false, time: 150 },
  { n: 4, diag: [8, 13], grid: false, time: 180 },
  { n: 4, diag: [10, 16], grid: false, time: 180 },
];

// Transformations du motif : [image d'une case (r, c), image d'une face].
function symmetry(kind, n) {
  if (kind === 'lr') return [(r, c) => [r, n - 1 - c], MIRROR_LR];
  if (kind === 'tb') return [(r, c) => [n - 1 - r, c], MIRROR_TB];
  if (kind === 'rot180') return [(r, c) => [n - 1 - r, n - 1 - c], ROT90.map((f) => ROT90[f])];
  if (kind === 'rot90') return [(r, c) => [c, n - 1 - r], ROT90];
  return null;
}

function buildPattern(rng, n, kind, pDiag) {
  const g = Array(n * n).fill(-1);
  const sym = symmetry(kind, n);
  const face = () => (rng.chance(pDiag) ? rng.int(2, 5) : rng.int(0, 1));
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (g[r * n + c] >= 0) continue;
      if (!sym) { g[r * n + c] = face(); continue; }
      // Orbite de la case sous la symétrie : une case fixe exige une face invariante.
      const orbit = [[r, c]];
      for (;;) {
        const [pr, pc] = orbit[orbit.length - 1];
        const nx = sym[0](pr, pc);
        if (nx[0] === r && nx[1] === c) break;
        orbit.push(nx);
      }
      let f = face();
      if (orbit.length === 1 && sym[1][f] !== f) f = rng.int(0, 1);
      orbit.forEach(([pr, pc], k) => {
        let v = f;
        for (let t = 0; t < k; t++) v = sym[1][v];
        g[pr * n + pc] = v;
      });
    }
  }
  return g;
}

export function generate(rng, level) {
  const cfg = LEVELS[level];
  const kinds = level <= 7 ? ['lr', 'tb', 'rot180', 'rot90'] : ['rot90', 'rot180', 'none', 'none'];
  const kind = rng.pick(kinds);
  const pDiag = (cfg.diag[0] + cfg.diag[1]) / 2 / (cfg.n * cfg.n);
  const pattern = buildPattern(rng, cfg.n, kind, Math.min(0.95, pDiag + 0.1));
  return {
    category: 'cubes', level, subtype: `${cfg.n}×${cfg.n} blocs`, interactive: true,
    prompt: `Reproduisez le modèle avec ${cfg.n * cfg.n} blocs (${cfg.n}×${cfg.n}). Choisissez une face dans la palette (touches 1 à 6), puis cliquez les cases de votre construction. Temps limite : ${cfg.time} s.${cfg.grid ? '' : ' Le modèle n’affiche pas la séparation entre les blocs.'}`,
    data: { n: cfg.n, pattern, grid: cfg.grid, symmetry: kind },
    options: null,
    answer: pattern.join(''),
    rules: [
      { title: 'Décomposition', text: `Le modèle se découpe en ${cfg.n}×${cfg.n} carrés, un par bloc ; chaque carré est soit uni (blanc ou rouge), soit coupé en diagonale. ${pattern.filter(isDiag).length} bloc(s) montrent une diagonale.` },
      { title: 'Stratégie', text: kind === 'none' ? 'Le motif n’a pas de symétrie : procédez ligne par ligne en repérant les grands triangles formés par deux demi-faces voisines.' : `Le motif est symétrique (${{ lr: 'symétrie gauche-droite', tb: 'symétrie haut-bas', rot180: 'invariant par demi-tour', rot90: 'invariant par quart de tour' }[kind]}) : construire une partie donne le reste.` },
    ],
    timeLimit: cfg.time,
  };
}

// ---------------------------------------------------------------- Rendu

export function faceBody(f, x, y, s) {
  const P = {
    2: [[x, y], [x + s, y], [x, y + s]],
    3: [[x, y], [x + s, y], [x + s, y + s]],
    4: [[x + s, y], [x + s, y + s], [x, y + s]],
    5: [[x, y], [x + s, y + s], [x, y + s]],
  };
  let b = `<rect class="blk-w" x="${x}" y="${y}" width="${s}" height="${s}"/>`;
  if (f === 1) b = `<rect class="blk-r" x="${x}" y="${y}" width="${s}" height="${s}"/>`;
  else if (P[f]) b += `<polygon class="blk-r" points="${P[f].map((p) => p.join(',')).join(' ')}"/>`;
  return b;
}

export function patternSvg(pattern, n, { grid = true, s = 44, marks = null, label = 'Modèle' } = {}) {
  let body = '';
  pattern.forEach((f, i) => {
    const x = (i % n) * s, y = Math.floor(i / n) * s;
    body += f === null || f === undefined ? `<rect class="blk-empty" x="${x}" y="${y}" width="${s}" height="${s}"/>` : faceBody(f, x, y, s);
  });
  if (grid) for (let k = 1; k < n; k++) body += `<line class="blk-grid" x1="${k * s}" x2="${k * s}" y1="0" y2="${n * s}"/><line class="blk-grid" y1="${k * s}" y2="${k * s}" x1="0" x2="${n * s}"/>`;
  if (marks) marks.forEach((bad, i) => { if (bad) body += `<rect class="blk-bad" x="${(i % n) * s + 2}" y="${Math.floor(i / n) * s + 2}" width="${s - 4}" height="${s - 4}"/>`; });
  body += `<rect class="blk-frame" x="0" y="0" width="${n * s}" height="${n * s}"/>`;
  return svg(n * s, n * s, body, 'blocks', label);
}

export function renderStimulus(item) {
  const { n, pattern, grid } = item.data;
  return `<div class="stim-row"><span class="stim-label">Modèle</span>${patternSvg(pattern, n, { grid, s: n === 4 ? 40 : 48 })}</div>`;
}

export function renderOption() {
  return '';
}

// ---------------------------------------------------------------- Interaction

export function mount(stage, item, ctx) {
  const { n, pattern } = item.data;
  const s = n === 4 ? 40 : 48;
  const built = Array(n * n).fill(null);
  let sel = 1;
  const t0 = Date.now();
  stage.innerHTML = `<div class="blk-wrap">
    ${renderStimulus(item)}
    <div class="stim-row"><span class="stim-label">Votre construction</span><div class="blk-build">${built.map((_, i) => `<button type="button" class="blk-cell" data-i="${i}" aria-label="Case ${Math.floor(i / n) + 1}, ${(i % n) + 1}">${svg(s, s, `<rect class="blk-empty" x="0" y="0" width="${s}" height="${s}"/>`)}</button>`).join('')}</div></div>
  </div>
  <div class="blk-palette" role="group" aria-label="Palette de faces">${FACES.map((f) => `<button type="button" class="blk-face${f === sel ? ' sel' : ''}" data-f="${f}" aria-label="Face ${esc(FACE_NAMES[f])} (touche ${f + 1})"><span class="opt-num">${f + 1}</span>${svg(34, 34, faceBody(f, 1, 1, 32) + '<rect class="blk-frame" x="1" y="1" width="32" height="32"/>')}</button>`).join('')}</div>
  <div class="ia-bar"><span class="timer" data-timer></span><button class="btn primary" type="button" data-done>J’ai terminé</button></div>`;
  // Pas d'attribut style en HTML (CSP) : la grille est dimensionnée par le CSSOM.
  stage.querySelector('.blk-build').style.gridTemplateColumns = `repeat(${n}, ${s}px)`;
  const timerEl = stage.querySelector('[data-timer]');
  const select = (f) => {
    sel = f;
    stage.querySelectorAll('.blk-face').forEach((b) => b.classList.toggle('sel', Number(b.dataset.f) === f));
  };
  const paint = (i) => {
    built[i] = sel;
    stage.querySelector(`.blk-cell[data-i="${i}"]`).innerHTML = svg(s, s, faceBody(sel, 0, 0, s));
    // Le modèle est reproduit : on arrête le chrono, comme l'examinateur.
    if (built.every((f, k) => f === pattern[k])) ctx.later(() => ctx.finish(built.slice()), 250);
  };
  stage.querySelectorAll('.blk-face').forEach((b) => b.addEventListener('click', () => select(Number(b.dataset.f))));
  stage.querySelectorAll('.blk-cell').forEach((b) => b.addEventListener('click', () => paint(Number(b.dataset.i))));
  stage.querySelector('[data-done]').addEventListener('click', () => ctx.finish(built.slice()));
  ctx.setKeys((e) => {
    const k = Number(e.key);
    if (k >= 1 && k <= 6) select(k - 1);
  });
  const tick = () => {
    const left = item.timeLimit - (Date.now() - t0) / 1000;
    timerEl.textContent = `⏱ ${Math.max(0, Math.ceil(left))} s`;
    timerEl.classList.toggle('urgent', left < 15);
    if (left <= 0) ctx.finish(built.slice());
  };
  ctx.interval(tick, 250);
  tick();
  return { collect: () => built.slice() };
}

export function score(item, response) {
  const r = Array.isArray(response) ? response : [];
  const ok = item.data.pattern.filter((f, i) => r[i] === f).length;
  const total = item.data.pattern.length;
  return { correct: ok === total, detail: `${ok} bloc${ok > 1 ? 's' : ''} correct${ok > 1 ? 's' : ''} sur ${total}.` };
}

export function renderExplanation(item) {
  const { n, pattern } = item.data;
  const r = Array.isArray(item.response) ? item.response : null;
  let vis = `<div class="exp-chain"><div class="stim-row"><span class="stim-label">Modèle découpé en blocs</span>${patternSvg(pattern, n, { grid: true, s: 40 })}</div>`;
  if (r) vis += `<div class="stim-row"><span class="stim-label">Votre construction</span>${patternSvg(r, n, { grid: true, s: 40, marks: pattern.map((f, i) => r[i] !== f), label: 'Votre construction' })}</div>`;
  vis += '</div>';
  let html = `<div class="exp-visual">${vis}</div><ol class="rule-list">`;
  for (const ru of item.rules) html += `<li><strong>${esc(ru.title)}</strong> — ${esc(ru.text)}</li>`;
  return `${html}</ol>`;
}

export default { id: 'cubes', generate, mount, score, renderStimulus, renderOption, renderExplanation };
