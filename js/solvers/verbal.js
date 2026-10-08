// Solveur des analogies : base de connaissances construite à partir du lexique
// (paires des relations + liens « aussi »). Une option est valide s'il existe une
// relation qui contient à la fois (A, B) et (C, option) — ou (option, D).

import { RELATIONS } from '../data/lexique.js';

const KB = RELATIONS.map((R) => {
  const set = new Set();
  for (const [a, b] of [...R.paires, ...(R.aussi || [])]) {
    set.add(`${a}|${b}`);
    if (R.sym) set.add(`${b}|${a}`);
  }
  return { R, set };
});
const relationsOf = (x, y) => KB.filter((k) => k.set.has(`${x}|${y}`));

export function solve(item) {
  const { A, B, C, D, askFirst } = item.data;
  const ab = relationsOf(A, B);
  if (!ab.length) return { ok: false, reason: 'exemple sans relation' };
  const words = item.options.map((o) => o.word);
  if (new Set(words).size !== words.length) return { ok: false, reason: 'options identiques' };
  const correct = [];
  const notes = words.map((w, i) => {
    const pair = askFirst ? [w, D] : [C, w];
    const common = relationsOf(...pair).filter((k) => ab.includes(k));
    if (common.length) { correct.push(i); return `Même relation : ${common.map((k) => k.R.nom).join(', ')}.`; }
    const other = relationsOf(...pair).concat(relationsOf(pair[1], pair[0]));
    if (other.length) return `Lien d’une autre nature (${other[0].R.nom}) : ce n’est pas la relation de l’exemple.`;
    const rel = ab[0];
    const partner = [...rel.set].map((s) => s.split('|')).find(([a, b]) => (askFirst ? a === w : b === w));
    if (partner) return askFirst ? `« ${w} » correspond à « ${partner[1]} », pas à « ${D} ».` : `« ${w} » correspond à « ${partner[0]} », pas à « ${C} ».`;
    return `Aucune relation de ce type avec « ${askFirst ? D : C} ».`;
  });
  if (correct.length !== 1) return { ok: false, reason: `${correct.length} options valides` };
  if (correct[0] !== item.answer) return { ok: false, reason: 'clé incorrecte' };
  return { ok: true, correct, notes };
}

export default { solve };
