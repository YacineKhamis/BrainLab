// Validation des items de mémoire : la réponse attendue est recalculée
// indépendamment et comparée à la clé ; les séquences doivent respecter des
// contraintes perceptives (pas de répétition immédiate dans l'empan, pas de
// triple répétition, taux de cibles raisonnable dans le n-back).

function targets(stream, n) {
  const out = [];
  for (let i = n; i < stream.length; i++) if (stream[i] === stream[i - n]) out.push(i);
  return out;
}
const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);

function checkStream(stream, n, declared) {
  const t = targets(stream, n);
  if (!same(t, declared)) return 'cibles déclarées incorrectes';
  const rate = t.length / (stream.length - n);
  if (rate < 0.2 || rate > 0.42) return `taux de cibles hors limites (${Math.round(rate * 100)} %)`;
  for (let i = 2; i < stream.length; i++) if (stream[i] === stream[i - 1] && stream[i] === stream[i - 2]) return 'triple répétition';
  return null;
}

export function solve(item) {
  const d = item.data;
  if (d.kind === 'span') {
    for (let i = 1; i < d.digits.length; i++) if (d.digits[i] === d.digits[i - 1]) return { ok: false, reason: 'chiffre répété consécutivement' };
    const expected = [...d.digits].reverse().join('');
    if (expected !== item.answer) return { ok: false, reason: 'clé incorrecte' };
    return { ok: true, correct: [expected], notes: [] };
  }
  if (d.kind === 'nback') {
    const err = checkStream(d.positions, d.n, d.targets);
    if (err) return { ok: false, reason: err };
    if (!same(item.answer, d.targets)) return { ok: false, reason: 'clé incorrecte' };
    return { ok: true, correct: [d.targets], notes: [] };
  }
  if (d.positions.length !== d.letters.length) return { ok: false, reason: 'canaux de longueurs différentes' };
  const e1 = checkStream(d.positions, d.n, d.targetsPos);
  if (e1) return { ok: false, reason: `position : ${e1}` };
  const e2 = checkStream(d.letters, d.n, d.targetsLet);
  if (e2) return { ok: false, reason: `lettre : ${e2}` };
  return { ok: true, correct: [d.targetsPos, d.targetsLet], notes: [] };
}

export default { solve };
