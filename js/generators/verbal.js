// Analogies verbales en français : « A est à B ce que C est à ? ».
// Du vocabulaire courant (niveaux 1-3) au vocabulaire érudit (niveaux 8-10).

import { esc } from '../util.js';
import { RELATIONS } from '../data/lexique.js';

const TIME_LIMITS = [0, 25, 30, 30, 35, 40, 40, 45, 40, 35, 30];

function fill(tpl, a, b) {
  return tpl.replace('{a}', a).replace('{b}', b);
}

// Index des liens connus : mot -> [{ rel, autre }]
const LINKS = new Map();
for (const R of RELATIONS) {
  const add = (x, y) => {
    if (!LINKS.has(x)) LINKS.set(x, []);
    LINKS.get(x).push({ rel: R.id, other: y });
  };
  for (const [a, b] of [...R.paires, ...(R.aussi || [])]) {
    add(a, b);
    add(b, a);
  }
}
const isLinked = (x, y) => (LINKS.get(x) || []).some((l) => l.other === y);

export function generate(rng, level) {
  const nOpts = level <= 4 ? 5 : 6;
  const lo = Math.max(1, level - 1), hi = Math.min(10, level + 1);
  const eligible = RELATIONS.filter((R) => R.paires.length >= 6 && R.paires.some((p) => p[2] >= lo && p[2] <= hi));
  const R = rng.pick(eligible);
  const keyPairs = R.paires.filter((p) => p[2] >= lo && p[2] <= hi);
  let [C, D, , field] = rng.pick(keyPairs);
  if (R.sym && rng.chance(0.5)) [C, D] = [D, C];
  const exPairs = R.paires.filter((p) => p[0] !== C && p[1] !== C && p[0] !== D && p[1] !== D && p[2] <= Math.max(level, 3) && (!R.sym || p[3] !== field));
  if (!exPairs.length) throw new Error('exemple');
  let [A, B] = rng.pick(exPairs);
  if (R.sym && rng.chance(0.5)) [A, B] = [B, A];
  // Variante des niveaux élevés : on cherche le 3e terme (A : B :: ? : D).
  const askFirst = level >= 7 && !R.sym && rng.chance(0.4);
  const key = askFirst ? C : D;
  const anchor = askFirst ? D : C; // terme connu de la seconde paire
  const pos = askFirst ? 0 : 1;
  const forbidden = new Set([A, B, C, D]);
  const cands = [];
  // 1) mêmes catégories : éléments de même position dans d'autres paires de la relation
  for (const p of rng.shuffle(R.paires)) {
    if (R.sym && p[3] === field) continue;
    const w = R.sym ? p[rng.int(0, 1)] : p[pos];
    cands.push([w, 1]);
  }
  // 2) mots liés au terme connu par une AUTRE relation (pièges sémantiques)
  for (const l of LINKS.get(anchor) || []) if (l.rel !== R.id) cands.push([l.other, 0]);
  // 3) le terme de l'exemple (piège classique)
  if (!askFirst && rng.chance(0.4)) cands.push([B, 0.5]);
  const ordered = rng.shuffle(cands).sort((x, y) => x[1] - y[1]).map((c) => c[0]);
  const chosen = [];
  for (const w of ordered) {
    if (chosen.length >= nOpts - 1) break;
    if (w === key || chosen.includes(w) || (forbidden.has(w) && w !== B)) continue;
    if (w === anchor) continue;
    // jamais un mot réellement lié au terme connu par la même relation
    const sameRel = [...R.paires, ...(R.aussi || [])].some((p) => (askFirst ? p[0] === w && p[1] === D : p[0] === C && p[1] === w) || (R.sym && ((p[0] === C && p[1] === w) || (p[1] === C && p[0] === w))));
    if (sameRel) continue;
    if (R.sym && isLinked(C, w) && LINKS.get(C).some((l) => l.other === w && l.rel === R.id)) continue;
    chosen.push(w);
  }
  if (chosen.length < nOpts - 1) throw new Error('distracteurs');
  const answer = rng.int(0, nOpts - 1);
  const words = chosen.slice();
  words.splice(answer, 0, key);
  const promptParts = askFirst ? [A, B, '?', D] : [A, B, C, '?'];
  return {
    category: 'verbal',
    level,
    subtype: R.nom,
    prompt: askFirst ? `« ${A} » est à « ${B} » ce que « ? » est à « ${D} ».` : `« ${A} » est à « ${B} » ce que « ${C} » est à « ? ».`,
    data: { A, B, C, D, rel: R.id, askFirst, parts: promptParts },
    options: words.map((w) => ({ word: w })),
    answer,
    rules: [
      { title: 'Relation', text: `${R.nom.charAt(0).toUpperCase() + R.nom.slice(1)} : ${fill(R.phrase, A, B)}.` },
      { title: 'Application', text: `De même, ${fill(R.phrase, C, D)}.` },
    ],
    timeLimit: TIME_LIMITS[level],
  };
}

export function renderStimulus(item) {
  const [a, b, c, d] = item.data.parts.map((w) => (w === '?' ? '<span class="an-q">?</span>' : `<span class="an-w">${esc(w)}</span>`));
  return `<div class="analogy">${a}<span class="an-op">est à</span>${b}<span class="an-op">ce que</span>${c}<span class="an-op">est à</span>${d}</div>`;
}

export function renderOption(item, i) {
  return `<span class="opt-text">${esc(item.options[i].word)}</span>`;
}

export function renderExplanation(item) {
  const { A, B, C, D } = item.data;
  const vis = `<div class="analogy small"><span class="an-w">${esc(A)}</span><span class="an-op">→</span><span class="an-w">${esc(B)}</span><span class="an-op">::</span><span class="an-w${item.data.askFirst ? ' hl' : ''}">${esc(C)}</span><span class="an-op">→</span><span class="an-w${item.data.askFirst ? '' : ' hl'}">${esc(D)}</span></div>`;
  let html = `<div class="exp-visual">${vis}</div><ol class="rule-list">`;
  for (const r of item.rules) html += `<li><strong>${esc(r.title)}</strong> — ${esc(r.text)}</li>`;
  return html + '</ol>';
}

export default { id: 'verbal', generate, renderStimulus, renderOption, renderExplanation };
