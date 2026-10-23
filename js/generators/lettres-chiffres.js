// Séquence lettres-chiffres (type WAIS-IV, mémoire de travail) : une suite
// mêlant chiffres et lettres est présentée ; il faut restituer d'abord les
// chiffres dans l'ordre croissant, puis les lettres dans l'ordre alphabétique.

import { esc } from '../util.js';
import { presentThenAsk } from './present.js';

export const LEN = [0, 2, 3, 3, 4, 5, 5, 6, 7, 8, 9];
// Lettres sans ambiguïté visuelle avec un chiffre (pas de I, O, S, Z, B, G).
export const LETTERS = ['A', 'C', 'D', 'E', 'F', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'R', 'T', 'U', 'V', 'X', 'Y'];
const INTERVAL = 1000;

export const expected = (seq) => seq.filter((s) => /\d/.test(s)).sort().join('') + seq.filter((s) => /[A-Z]/.test(s)).sort().join('');

export function generate(rng, level) {
  const len = LEN[level];
  const nDigits = rng.int(1, len - 1);
  const digits = rng.sample(['1', '2', '3', '4', '5', '6', '7', '8', '9'], nDigits);
  const letters = rng.sample(LETTERS, len - nDigits);
  // Mélange en évitant (dès le niveau 3) que la suite soit déjà dans l'ordre attendu.
  let seq = rng.shuffle(digits.concat(letters));
  if (level >= 3 && seq.join('') === expected(seq)) seq = seq.reverse();
  const ans = expected(seq);
  return {
    category: 'lettresChiffres', level, subtype: `${len} éléments`, interactive: true,
    prompt: `${len} chiffres et lettres vont s’afficher un par un. Restituez d’abord les CHIFFRES du plus petit au plus grand, puis les LETTRES dans l’ordre alphabétique.`,
    data: { seq, interval: INTERVAL },
    options: null,
    answer: ans,
    rules: [{ title: 'Réorganisation', text: `Présenté : ${seq.join(' ')} → chiffres triés ${ans.replace(/[A-Z]/g, '').split('').join(' ') || '—'}, puis lettres triées ${ans.replace(/\d/g, '').split('').join(' ') || '—'}.` }],
    timeLimit: len + 40,
  };
}

export function mount(stage, item, ctx) {
  return presentThenAsk(stage, ctx, item.data.seq, item.data.interval, { label: 'Chiffres croissants puis lettres alphabétiques :' });
}

export function score(item, response) {
  const clean = String(response ?? '').toUpperCase().replace(/[^0-9A-Z]/g, '');
  return { correct: clean === item.answer, detail: `Votre réponse : ${clean || '(vide)'} ; attendu : ${item.answer}.` };
}

export function renderStimulus(item) {
  return `<p class="mem-intro">${esc(item.prompt)}</p>`;
}

export function renderOption() {
  return '';
}

export function renderExplanation(item) {
  const vis = `<div class="mem-row"><span class="mem-lab">Présenté</span>${item.data.seq.map((x) => `<span class="mem-cell">${x}</span>`).join('')}</div><div class="mem-row"><span class="mem-lab">Attendu</span>${item.answer.split('').map((x) => `<span class="mem-cell hit">${x}</span>`).join('')}</div>`;
  let html = `<div class="exp-visual">${vis}</div><ol class="rule-list">`;
  for (const r of item.rules) html += `<li><strong>${esc(r.title)}</strong> — ${esc(r.text)}</li>`;
  return `${html}</ol>`;
}

export default { id: 'lettresChiffres', generate, mount, score, renderStimulus, renderOption, renderExplanation };
