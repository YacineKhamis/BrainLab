// Code (type WAIS-IV, vitesse de traitement) : une clé associe chaque chiffre à
// un symbole ; pour chaque chiffre de la suite, cliquer le symbole correspondant
// dans la palette (ou sa touche A, S, D, F…). Épreuve de 120 secondes ;
// note = nombre de symboles corrects. Aux niveaux élevés, la clé contient des
// symboles qui sont des rotations l'un de l'autre et la palette est remélangée.

import { esc } from '../util.js';
import { glyphSet, glyphKey, lureOf, glyphSvg } from './glyphs.js';

export const DURATION = 120;
export const LENGTH = 160;
export const PAIRS = [0, 5, 6, 6, 7, 8, 9, 9, 9, 9, 9];
const SIMILAR = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4];
const RESHUFFLE = [0, 0, 0, 0, 0, 0, 0, 0, 20, 15, 10];
export const GOAL = [0, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48];
export const KEYS = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'];

export function generate(rng, level) {
  const n = PAIRS[level];
  // Symboles de la clé : quelques paires « jumelles » (rotation ou reflet l'un de l'autre).
  const base = glyphSet(rng, n - SIMILAR[level]);
  const keys = new Set(base.map(glyphKey));
  const glyphs = base.slice();
  for (let guard = 0; glyphs.length < n && guard < 200; guard++) {
    const g = lureOf(rng, rng.pick(base));
    const k = glyphKey(g);
    if (keys.has(k)) continue;
    keys.add(k);
    glyphs.push(g);
  }
  if (glyphs.length < n) throw new Error('symboles');
  const key = rng.shuffle(glyphs); // key[d − 1] = symbole du chiffre d
  const digits = [];
  while (digits.length < LENGTH) {
    const d = rng.int(1, n);
    if (digits.length && digits[digits.length - 1] === d) continue;
    digits.push(d);
  }
  // Ordres de la palette (indices de symboles), remélangée tous les RESHUFFLE items.
  const every = RESHUFFLE[level] || LENGTH;
  const palettes = [];
  for (let i = 0; i < LENGTH; i += every) palettes.push(rng.shuffle([...Array(n).keys()]));
  return {
    category: 'code', level, subtype: `${n} symboles`, interactive: true,
    prompt: `Pour chaque chiffre, cliquez le symbole que la clé lui associe (ou sa touche ${KEYS.slice(0, n).join(', ').toUpperCase()}). Durée : ${DURATION} s ; objectif : ${GOAL[level]} symboles corrects.${RESHUFFLE[level] ? ` La palette est remélangée tous les ${RESHUFFLE[level]} chiffres.` : ''}`,
    data: { key, digits, palettes, every, duration: DURATION, goal: GOAL[level] },
    options: null,
    answer: digits.map((d) => d - 1),
    rules: [{ title: 'Clé', text: `Chaque chiffre de 1 à ${n} correspond à un seul symbole ; ${SIMILAR[level] ? 'certains symboles se ressemblent (rotation ou reflet) : vérifiez l’orientation.' : 'les symboles sont tous nettement différents.'}` }],
    timeLimit: DURATION + 5,
  };
}

function keyHtml(item) {
  return `<div class="cd-key">${item.data.key.map((g, i) => `<div class="cd-pair"><span class="cd-digit">${i + 1}</span>${glyphSvg(g, 34)}</div>`).join('')}</div>`;
}

export function mount(stage, item, ctx) {
  const { key, digits, palettes, every } = item.data;
  const resp = [];
  const t0 = Date.now();
  stage.innerHTML = `<div class="ia-bar"><span class="timer" data-timer></span><span data-count></span></div>
    ${keyHtml(item)}
    <div class="cd-strip" data-strip></div>
    <div class="cd-palette" data-pal role="group" aria-label="Symboles"></div>`;
  const strip = stage.querySelector('[data-strip]');
  const pal = stage.querySelector('[data-pal]');
  let palIdx = -1;
  const order = () => palettes[Math.floor(resp.length / every)];
  const render = () => {
    if (resp.length >= digits.length) { ctx.finish(resp.slice()); return; }
    const from = Math.max(0, resp.length - 3);
    strip.innerHTML = digits.slice(from, from + 12).map((d, j) => {
      const i = from + j;
      const cur = i === resp.length;
      const done = i < resp.length ? glyphSvg(key[resp[i]], 22) : '';
      return `<div class="cd-cell${cur ? ' cur' : ''}${i < resp.length ? (resp[i] === d - 1 ? ' ok' : ' ko') : ''}"><span>${d}</span>${done}</div>`;
    }).join('');
    stage.querySelector('[data-count]').textContent = `${resp.length} traité${resp.length > 1 ? 's' : ''}`;
    const p = Math.floor(resp.length / every);
    if (p !== palIdx) {
      palIdx = p;
      pal.innerHTML = order().map((g, j) => `<button class="opt cd-btn" type="button" data-g="${g}"><span class="opt-num">${KEYS[j].toUpperCase()}</span>${glyphSvg(key[g], 34)}</button>`).join('');
      pal.querySelectorAll('[data-g]').forEach((b) => b.addEventListener('click', () => pick(Number(b.dataset.g))));
    }
  };
  const pick = (g) => { resp.push(g); render(); };
  ctx.setKeys((e) => {
    const j = KEYS.indexOf(e.key.toLowerCase());
    if (j >= 0 && j < key.length) pick(order()[j]);
  });
  const timerEl = stage.querySelector('[data-timer]');
  const tick = () => {
    const left = item.data.duration - (Date.now() - t0) / 1000;
    timerEl.textContent = `⏱ ${Math.max(0, Math.ceil(left))} s`;
    timerEl.classList.toggle('urgent', left < 15);
    if (left <= 0) ctx.finish(resp.slice());
  };
  ctx.interval(tick, 250);
  tick();
  render();
  return { collect: () => resp.slice() };
}

export function tally(item, response) {
  const r = Array.isArray(response) ? response : [];
  let ok = 0;
  r.forEach((g, i) => { if (g === item.data.digits[i] - 1) ok++; });
  return { ok, bad: r.length - ok };
}

export function score(item, response) {
  const t = tally(item, response);
  return { correct: t.ok >= item.data.goal, detail: `${t.ok} symbole${t.ok > 1 ? 's' : ''} correct${t.ok > 1 ? 's' : ''}, ${t.bad} erreur${t.bad > 1 ? 's' : ''} (objectif ${item.data.goal}).`, points: t.ok, maxPoints: item.data.goal };
}

export function renderStimulus(item) {
  return `<p class="mem-intro">${esc(item.prompt)}</p>`;
}

export function renderOption() {
  return '';
}

export function renderExplanation(item) {
  const r = Array.isArray(item.response) ? item.response : [];
  const { key, digits } = item.data;
  const n = Math.max(10, Math.min(r.length, 40));
  const strip = digits.slice(0, n).map((d, i) => `<div class="cd-cell${i < r.length ? (r[i] === d - 1 ? ' ok' : ' ko') : ''}"><span>${d}</span>${glyphSvg(key[d - 1], 22)}</div>`).join('');
  let html = `<div class="exp-visual">${keyHtml(item)}<div class="cd-strip wrap">${strip}</div><p class="muted small">Sous chaque chiffre : le symbole attendu (vert = réussi, rouge = erreur).</p></div><ol class="rule-list">`;
  for (const ru of item.rules) html += `<li><strong>${esc(ru.title)}</strong> — ${esc(ru.text)}</li>`;
  return `${html}</ol>`;
}

export default { id: 'code', generate, mount, score, renderStimulus, renderOption, renderExplanation };
