// Symboles (type WAIS-IV, vitesse de traitement) : pour chaque ligne, dire le
// plus vite possible si l'un des symboles cibles figure dans le groupe de
// recherche. Épreuve de 120 secondes ; note = bonnes réponses − erreurs.
// Aux niveaux élevés, le groupe contient des rotations et reflets des cibles.

import { esc } from '../util.js';
import { glyphSet, glyphKey, lureOf, glyphSvg } from './glyphs.js';

export const DURATION = 120;
export const ROWS = 90;
export const TARGETS = [0, 1, 1, 2, 2, 2, 2, 2, 3, 3, 3];
export const SEARCH = [0, 3, 3, 4, 4, 5, 5, 5, 5, 6, 6];
const LURE = [0, 0, 0, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
export const GOAL = [0, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34];

export function generate(rng, level) {
  const nt = TARGETS[level], ns = SEARCH[level];
  const pool = glyphSet(rng, 16);
  const rows = [];
  for (let i = 0; i < ROWS; i++) {
    const targets = rng.sample(pool, nt);
    const tk = new Set(targets.map(glyphKey));
    const yes = rng.chance(0.5);
    const search = [];
    const used = new Set();
    const push = (g) => { const k = glyphKey(g); if (used.has(k)) return false; used.add(k); search.push(g); return true; };
    if (yes) push(rng.pick(targets));
    for (let guard = 0; search.length < ns && guard < 200; guard++) {
      let g;
      if (rng.chance(LURE[level])) {
        g = lureOf(rng, rng.pick(targets));
        if (tk.has(glyphKey(g))) continue; // glyphe symétrique : la « variante » est la cible elle-même
      } else {
        g = rng.pick(pool);
        if (tk.has(glyphKey(g))) continue;
      }
      push(g);
    }
    if (search.length < ns) throw new Error('groupe de recherche');
    rows.push({ targets, search: rng.shuffle(search), yes });
  }
  return {
    category: 'symboles', level, subtype: `${nt} cible${nt > 1 ? 's' : ''}, ${ns} symboles`, interactive: true,
    prompt: `Pour chaque ligne, indiquez si l’un des symboles de gauche (cible${nt > 1 ? 's' : ''}) apparaît à l’identique dans le groupe de droite. Touche O = oui, N = non. Durée : ${DURATION} s ; note = bonnes réponses − erreurs ; objectif : ${GOAL[level]}.${LURE[level] ? ' Attention : des symboles tournés ou en miroir ne comptent pas.' : ''}`,
    data: { rows, duration: DURATION, goal: GOAL[level] },
    options: null,
    answer: rows.map((r) => r.yes),
    rules: [{ title: 'Règle', text: 'Un symbole tourné ou retourné n’est pas identique : seule une copie exacte d’une cible justifie « oui ».' }],
    timeLimit: DURATION + 5,
  };
}

function rowHtml(row, size = 34) {
  return `<div class="sy-row"><div class="sy-targets">${row.targets.map((g) => glyphSvg(g, size)).join('')}</div><div class="sy-search">${row.search.map((g) => glyphSvg(g, size)).join('')}</div></div>`;
}

export function mount(stage, item, ctx) {
  const { rows } = item.data;
  const answers = [];
  const t0 = Date.now();
  stage.innerHTML = `<div class="ia-bar"><span class="timer" data-timer></span><span data-count></span></div>
    <div class="sy-stage" data-row></div>
    <div class="nb-buttons"><button class="btn" type="button" data-a="1">Oui (O)</button><button class="btn" type="button" data-a="0">Non (N)</button></div>`;
  const rowEl = stage.querySelector('[data-row]');
  const countEl = stage.querySelector('[data-count]');
  const show = () => {
    if (answers.length >= rows.length) { ctx.finish(answers.slice()); return; }
    rowEl.innerHTML = rowHtml(rows[answers.length], 44);
    countEl.textContent = `Ligne ${answers.length + 1}`;
  };
  const answer = (v) => { answers.push(v); show(); };
  stage.querySelectorAll('[data-a]').forEach((b) => b.addEventListener('click', () => answer(b.dataset.a === '1')));
  ctx.setKeys((e) => {
    const k = e.key.toLowerCase();
    if (k === 'o') answer(true);
    if (k === 'n') answer(false);
  });
  const timerEl = stage.querySelector('[data-timer]');
  const tick = () => {
    const left = item.data.duration - (Date.now() - t0) / 1000;
    timerEl.textContent = `⏱ ${Math.max(0, Math.ceil(left))} s`;
    timerEl.classList.toggle('urgent', left < 15);
    if (left <= 0) ctx.finish(answers.slice());
  };
  ctx.interval(tick, 250);
  tick();
  show();
  return { collect: () => answers.slice() };
}

export function tally(item, response) {
  const r = Array.isArray(response) ? response : [];
  let ok = 0, bad = 0;
  r.forEach((v, i) => { if (v === item.data.rows[i].yes) ok++; else bad++; });
  return { ok, bad, net: ok - bad };
}

export function score(item, response) {
  const t = tally(item, response);
  return { correct: t.net >= item.data.goal, detail: `${t.ok} bonne${t.ok > 1 ? 's' : ''} réponse${t.ok > 1 ? 's' : ''}, ${t.bad} erreur${t.bad > 1 ? 's' : ''} : note nette ${t.net} (objectif ${item.data.goal}).`, points: Math.max(0, t.net), maxPoints: item.data.goal };
}

export function renderStimulus(item) {
  return `<p class="mem-intro">${esc(item.prompt)}</p>`;
}

export function renderOption() {
  return '';
}

export function renderExplanation(item) {
  const r = Array.isArray(item.response) ? item.response : [];
  const shown = item.data.rows.slice(0, Math.max(3, Math.min(r.length, 12)));
  let vis = shown.map((row, i) => {
    const mark = i < r.length ? (r[i] === row.yes ? '<span class="mem-cell hit">✓</span>' : '<span class="mem-cell fa">×</span>') : '<span class="mem-cell">·</span>';
    return `<div class="sy-exp">${mark}${rowHtml(row, 28)}<span class="small">${row.yes ? 'oui' : 'non'}</span></div>`;
  }).join('');
  if (r.length > shown.length) vis += `<p class="muted small">… et ${r.length - shown.length} autres lignes traitées.</p>`;
  let html = `<div class="exp-visual">${vis}</div><ol class="rule-list">`;
  for (const ru of item.rules) html += `<li><strong>${esc(ru.title)}</strong> — ${esc(ru.text)}</li>`;
  return `${html}</ol>`;
}

export default { id: 'symboles', generate, mount, score, renderStimulus, renderOption, renderExplanation };
