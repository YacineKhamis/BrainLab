// Mémoire des chiffres (type WAIS-IV, mémoire de travail) : trois épreuves,
// ordre direct, ordre inverse et ordre croissant. Les chiffres (1 à 9) sont
// présentés un par seconde, puis la réponse est saisie au clavier.

import { esc } from '../util.js';
import { presentThenAsk } from './present.js';

export const MODES = {
  direct: { name: 'ordre direct', len: [0, 3, 4, 5, 6, 6, 7, 8, 8, 9, 10], ask: 'dans le MÊME ordre', label: 'Chiffres dans l’ordre présenté :' },
  inverse: { name: 'ordre inverse', len: [0, 2, 3, 3, 4, 5, 5, 6, 7, 8, 9], ask: 'dans l’ordre INVERSE', label: 'Chiffres dans l’ordre inverse :' },
  croissant: { name: 'ordre croissant', len: [0, 3, 3, 4, 5, 5, 6, 7, 7, 8, 9], ask: 'du plus PETIT au plus GRAND', label: 'Chiffres du plus petit au plus grand :' },
};
const INTERVAL = 1000;

export function expected(mode, digits) {
  if (mode === 'direct') return digits.join('');
  if (mode === 'inverse') return digits.slice().reverse().join('');
  return digits.slice().sort((a, b) => a - b).join('');
}

export function generate(rng, level) {
  const mode = rng.pick(Object.keys(MODES));
  const M = MODES[mode];
  const len = M.len[level];
  // Pas de répétition immédiate ; un chiffre peut revenir (au plus deux fois) en
  // ordre croissant à partir du niveau 4, comme dans l'épreuve originale, et dès
  // que la suite dépasse neuf chiffres.
  const maxRep = (mode === 'croissant' && level >= 4) || len > 9 ? 2 : 1;
  const digits = [];
  while (digits.length < len) {
    const d = rng.int(1, 9);
    if (digits.length && d === digits[digits.length - 1]) continue;
    if (digits.filter((x) => x === d).length >= maxRep) continue;
    digits.push(d);
  }
  const ans = expected(mode, digits);
  return {
    category: 'chiffres', level, subtype: M.name, interactive: true,
    prompt: `${len} chiffres vont s’afficher un par un (un par seconde). Restituez-les ${M.ask}.`,
    data: { mode, digits, interval: INTERVAL },
    options: null,
    answer: ans,
    rules: [{ title: M.name.charAt(0).toUpperCase() + M.name.slice(1), text: `Séquence présentée : ${digits.join(' ')} → réponse attendue : ${ans.split('').join(' ')}.` }],
    timeLimit: len + 30,
  };
}

export function mount(stage, item, ctx) {
  return presentThenAsk(stage, ctx, item.data.digits, item.data.interval, { label: MODES[item.data.mode].label, inputmode: 'numeric' });
}

export function score(item, response) {
  const clean = String(response ?? '').replace(/\D/g, '');
  return { correct: clean === item.answer, detail: `Votre réponse : ${clean || '(vide)'} ; attendu : ${item.answer}.` };
}

export function renderStimulus(item) {
  return `<p class="mem-intro">${esc(item.prompt)}</p>`;
}

export function renderOption() {
  return '';
}

export function renderExplanation(item) {
  const vis = `<div class="mem-row"><span class="mem-lab">Présenté</span>${item.data.digits.map((x) => `<span class="mem-cell">${x}</span>`).join('')}</div><div class="mem-row"><span class="mem-lab">Attendu</span>${item.answer.split('').map((x) => `<span class="mem-cell hit">${x}</span>`).join('')}</div>`;
  let html = `<div class="exp-visual">${vis}</div><ol class="rule-list">`;
  for (const r of item.rules) html += `<li><strong>${esc(r.title)}</strong> — ${esc(r.text)}</li>`;
  return `${html}</ol>`;
}

export default { id: 'chiffres', generate, mount, score, renderStimulus, renderOption, renderExplanation };
