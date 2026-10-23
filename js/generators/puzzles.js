// Puzzles visuels (type WAIS-IV, raisonnement perceptif) : parmi six pièces,
// trouver les trois qui, assemblées, reconstituent exactement la figure.
// Les pièces peuvent être tournées mais pas retournées. Les distracteurs sont
// des pièces presque justes (une case en plus, en moins, déplacée, ou reflet).

import { esc, svg } from '../util.js';

export const LEVELS = [null,
  { shape: [2, 4], minPiece: 2, rotate: 0, mirror: false, time: 45 },
  { shape: [3, 3], minPiece: 2, rotate: 0.3, mirror: false, time: 45 },
  { shape: [3, 4], minPiece: 3, rotate: 0.5, mirror: false, time: 45 },
  { area: 9, minPiece: 2, rotate: 0.7, mirror: true, time: 60 },
  { area: 10, minPiece: 3, rotate: 0.8, mirror: true, time: 60 },
  { area: 11, minPiece: 3, rotate: 1, mirror: true, time: 60 },
  { area: 12, minPiece: 3, rotate: 1, mirror: true, time: 75 },
  { area: 13, minPiece: 3, rotate: 1, mirror: true, time: 75 },
  { area: 14, minPiece: 4, rotate: 1, mirror: true, time: 90 },
  { area: 16, minPiece: 4, rotate: 1, mirror: true, time: 90 },
];

// ---------------- Polyominos

export const norm = (cells) => {
  const mr = Math.min(...cells.map((c) => c[0])), mc = Math.min(...cells.map((c) => c[1]));
  return cells.map(([r, c]) => [r - mr, c - mc]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
};
export const key = (cells) => norm(cells).map((c) => c.join(',')).join(';');
export const rot = (cells) => norm(cells.map(([r, c]) => [c, -r]));
export const mirror = (cells) => norm(cells.map(([r, c]) => [r, -c]));
export function rotations(cells) {
  const out = [norm(cells)];
  for (let k = 1; k < 4; k++) out.push(rot(out[k - 1]));
  return out;
}
export const canon = (cells) => rotations(cells).map(key).sort()[0];
const NB = [[1, 0], [-1, 0], [0, 1], [0, -1]];
export function connected(cells) {
  if (!cells.length) return false;
  const set = new Set(cells.map((c) => c.join(',')));
  const seen = new Set([cells[0].join(',')]);
  const stack = [cells[0]];
  while (stack.length) {
    const [r, c] = stack.pop();
    for (const [dr, dc] of NB) {
      const k = `${r + dr},${c + dc}`;
      if (set.has(k) && !seen.has(k)) { seen.add(k); stack.push([r + dr, c + dc]); }
    }
  }
  return seen.size === cells.length;
}

function growShape(rng, area) {
  const cells = [[0, 0]];
  const set = new Set(['0,0']);
  while (cells.length < area) {
    const [r, c] = rng.pick(cells);
    const [dr, dc] = rng.pick(NB);
    const k = `${r + dr},${c + dc}`;
    if (set.has(k)) continue;
    // Figures compactes : boîte englobante limitée.
    const nc = cells.concat([[r + dr, c + dc]]);
    const h = Math.max(...nc.map((x) => x[0])) - Math.min(...nc.map((x) => x[0]));
    const w = Math.max(...nc.map((x) => x[1])) - Math.min(...nc.map((x) => x[1]));
    if (h > 4 || w > 4) continue;
    set.add(k);
    cells.push([r + dr, c + dc]);
  }
  return norm(cells);
}

// Découpe la figure en trois pièces connexes par croissance simultanée.
function partition(rng, cells, minPiece) {
  const idx = new Map(cells.map((c, i) => [c.join(','), i]));
  const owner = Array(cells.length).fill(-1);
  rng.sample(cells.map((_, i) => i), 3).forEach((s, p) => { owner[s] = p; });
  let guard = 0;
  while (owner.includes(-1) && guard++ < 2000) {
    const p = rng.int(0, 2);
    const frontier = [];
    cells.forEach(([r, c], i) => {
      if (owner[i] !== p) return;
      for (const [dr, dc] of NB) {
        const j = idx.get(`${r + dr},${c + dc}`);
        if (j !== undefined && owner[j] === -1) frontier.push(j);
      }
    });
    if (frontier.length) owner[rng.pick(frontier)] = p;
  }
  if (owner.includes(-1)) return null;
  const pieces = [0, 1, 2].map((p) => cells.filter((_, i) => owner[i] === p));
  if (pieces.some((pc) => pc.length < minPiece)) return null;
  return { pieces, owner };
}

function mutate(rng, cells, allowMirror) {
  const kind = rng.pick(allowMirror ? ['add', 'remove', 'move', 'mirror', 'mirror'] : ['add', 'remove', 'move']);
  const set = new Set(cells.map((c) => c.join(',')));
  const adj = [];
  cells.forEach(([r, c]) => NB.forEach(([dr, dc]) => { if (!set.has(`${r + dr},${c + dc}`)) adj.push([r + dr, c + dc]); }));
  if (kind === 'mirror') return mirror(cells);
  if (kind === 'add') return norm(cells.concat([rng.pick(adj)]));
  const removable = cells.filter((x) => connected(cells.filter((y) => y !== x)));
  const gone = rng.pick(removable);
  const out = cells.filter((x) => x !== gone);
  if (kind === 'remove') return out.length >= 2 ? norm(out) : null;
  const set2 = new Set(out.map((c) => c.join(',')));
  const adj2 = [];
  out.forEach(([r, c]) => NB.forEach(([dr, dc]) => { if (!set2.has(`${r + dr},${c + dc}`)) adj2.push([r + dr, c + dc]); }));
  return norm(out.concat([rng.pick(adj2)]));
}

export function generate(rng, level) {
  const cfg = LEVELS[level];
  let target;
  if (cfg.shape) {
    const [h, w] = cfg.shape;
    target = [];
    for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) target.push([r, c]);
  } else target = growShape(rng, cfg.area);
  let part = null;
  for (let t = 0; t < 30 && !part; t++) part = partition(rng, target, cfg.minPiece);
  if (!part) throw new Error('découpe');
  const truth = part.pieces.map(norm);
  const used = new Set(truth.map(canon));
  const lures = [];
  for (let guard = 0; lures.length < 3 && guard < 60; guard++) {
    const m = mutate(rng, rng.pick(truth), cfg.mirror);
    if (!m || !connected(m) || m.length < 2) continue;
    const k = canon(m);
    if (used.has(k)) continue;
    used.add(k);
    lures.push(m);
  }
  if (lures.length < 3) throw new Error('distracteurs');
  // Affichage : chaque pièce est tournée d'un quart de tour aléatoire.
  const order = rng.shuffle([0, 1, 2, 3, 4, 5]);
  const all = truth.concat(lures);
  const pieces = order.map((k) => {
    let p = all[k];
    if (rng.chance(cfg.rotate)) for (let t = rng.int(1, 3); t > 0; t--) p = rot(p);
    return p;
  });
  const answer = [0, 1, 2].map((k) => order.indexOf(k)).sort((a, b) => a - b);
  return {
    category: 'puzzles', level, subtype: `figure de ${target.length} cases`, interactive: true,
    prompt: `Sélectionnez les 3 pièces qui, assemblées, reconstituent exactement la figure (les pièces peuvent être tournées, pas retournées). Touches 1 à 6, puis Entrée. Temps limite : ${cfg.time} s.`,
    data: { target, pieces, owner: part.owner.map((p) => order.indexOf(p)) },
    options: null,
    answer,
    rules: [
      { title: 'Solution', text: `Les pièces ${answer.map((i) => i + 1).join(', ')} couvrent les ${target.length} cases sans chevauchement (${truth.map((t) => t.length).join(' + ')} = ${target.length}).` },
      { title: 'Méthode', text: 'Commencez par compter les cases : l’aire des trois pièces doit égaler celle de la figure. Placez ensuite la pièce la plus grande ou la plus irrégulière, puis vérifiez que le reste se remplit.' },
    ],
    timeLimit: cfg.time,
  };
}

// ---------------- Rendu

export function polySvg(cells, s, { cls = 'pz-cell', label = '', colors = null } = {}) {
  const h = Math.max(...cells.map((c) => c[0])) + 1, w = Math.max(...cells.map((c) => c[1])) + 1;
  const set = new Set(cells.map((c) => c.join(',')));
  let body = '';
  cells.forEach(([r, c], i) => { body += `<rect class="${colors ? `pz-c${colors[i]}` : cls}" x="${c * s}" y="${r * s}" width="${s}" height="${s}"/>`; });
  // Contour extérieur seulement (la figure cible ne montre pas les découpes).
  cells.forEach(([r, c], i) => {
    const edges = [[-1, 0, c * s, r * s, (c + 1) * s, r * s], [1, 0, c * s, (r + 1) * s, (c + 1) * s, (r + 1) * s], [0, -1, c * s, r * s, c * s, (r + 1) * s], [0, 1, (c + 1) * s, r * s, (c + 1) * s, (r + 1) * s]];
    for (const [dr, dc, x1, y1, x2, y2] of edges) {
      const nk = `${r + dr},${c + dc}`;
      const inner = set.has(nk) && (!colors || colors[cells.findIndex((x) => x.join(',') === nk)] === colors[i]);
      if (!inner) body += `<line class="pz-edge" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
    }
  });
  return svg(w * s + 4, h * s + 4, `<g transform="translate(2 2)">${body}</g>`, 'puzzle', label);
}

export function renderStimulus(item) {
  return `<div class="stim-row"><span class="stim-label">Figure à reconstituer</span>${polySvg(item.data.target, 36, { cls: 'pz-target', label: 'Figure à reconstituer' })}</div>`;
}

export function renderOption() {
  return '';
}

export function mount(stage, item, ctx) {
  const chosen = new Set();
  const t0 = Date.now();
  stage.innerHTML = `${renderStimulus(item)}
    <div class="options visual pz-options" role="group" aria-label="Pièces">${item.data.pieces.map((p, i) => `<button class="opt" type="button" data-i="${i}" aria-pressed="false"><span class="opt-num">${i + 1}</span>${polySvg(p, 26, { label: `Pièce ${i + 1}` })}</button>`).join('')}</div>
    <div class="ia-bar"><span class="timer" data-timer></span><span data-count>Sélection : 0 / 3</span><button class="btn primary" type="button" data-done disabled>Valider</button></div>`;
  const btnDone = stage.querySelector('[data-done]');
  const toggle = (i) => {
    if (chosen.has(i)) chosen.delete(i);
    else if (chosen.size < 3) chosen.add(i);
    stage.querySelectorAll('.opt').forEach((b) => {
      const on = chosen.has(Number(b.dataset.i));
      b.classList.toggle('picked', on);
      b.setAttribute('aria-pressed', String(on));
    });
    stage.querySelector('[data-count]').textContent = `Sélection : ${chosen.size} / 3`;
    btnDone.disabled = chosen.size !== 3;
  };
  const collect = () => [...chosen].sort((a, b) => a - b);
  stage.querySelectorAll('.opt').forEach((b) => b.addEventListener('click', () => toggle(Number(b.dataset.i))));
  btnDone.addEventListener('click', () => ctx.finish(collect()));
  ctx.setKeys((e) => {
    const k = Number(e.key);
    if (k >= 1 && k <= 6) toggle(k - 1);
    if (e.key === 'Enter' && chosen.size === 3) ctx.finish(collect());
  });
  const timerEl = stage.querySelector('[data-timer]');
  const tick = () => {
    const left = item.timeLimit - (Date.now() - t0) / 1000;
    timerEl.textContent = `⏱ ${Math.max(0, Math.ceil(left))} s`;
    timerEl.classList.toggle('urgent', left < 10);
    if (left <= 0) ctx.finish(collect());
  };
  ctx.interval(tick, 250);
  tick();
  return { collect };
}

export function score(item, response) {
  const r = Array.isArray(response) ? response.slice().sort((a, b) => a - b) : [];
  const ok = r.length === 3 && r.every((v, i) => v === item.answer[i]);
  return { correct: ok, detail: `Votre sélection : ${r.length ? r.map((i) => i + 1).join(', ') : '(aucune)'} ; attendu : ${item.answer.map((i) => i + 1).join(', ')}.` };
}

export function renderExplanation(item) {
  const { target, owner, pieces } = item.data;
  const colorOf = new Map(item.answer.map((p, k) => [p, k]));
  let vis = `<div class="exp-chain"><div class="stim-row"><span class="stim-label">Assemblage</span>${polySvg(target, 32, { colors: owner.map((p) => colorOf.get(p)), label: 'Assemblage des trois pièces' })}</div>`;
  vis += item.answer.map((p, k) => `<div class="stim-row"><span class="stim-label">Pièce ${p + 1}</span>${polySvg(pieces[p], 22, { colors: pieces[p].map(() => k) })}</div>`).join('');
  vis += '</div>';
  let html = `<div class="exp-visual">${vis}</div><ol class="rule-list">`;
  for (const r of item.rules) html += `<li><strong>${esc(r.title)}</strong> — ${esc(r.text)}</li>`;
  return `${html}</ol>`;
}

export default { id: 'puzzles', generate, mount, score, renderStimulus, renderOption, renderExplanation };
