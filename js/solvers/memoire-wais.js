// Validation des épreuves de mémoire de type WAIS-IV (Mémoire des chiffres,
// Séquence lettres-chiffres) : la réponse attendue est recalculée
// indépendamment ; contraintes perceptives sur la séquence présentée.

import { MODES } from '../generators/chiffres.js';
import { LEN, LETTERS } from '../generators/lettres-chiffres.js';

export const chiffres = {
  solve(item) {
    const { mode, digits } = item.data;
    const M = MODES[mode];
    if (!M) return { ok: false, reason: 'mode inconnu' };
    if (digits.length !== M.len[item.level]) return { ok: false, reason: 'longueur incorrecte' };
    if (digits.some((d) => !Number.isInteger(d) || d < 1 || d > 9)) return { ok: false, reason: 'chiffre invalide' };
    for (let i = 1; i < digits.length; i++) if (digits[i] === digits[i - 1]) return { ok: false, reason: 'chiffre répété consécutivement' };
    let exp;
    if (mode === 'direct') exp = digits.join('');
    else if (mode === 'inverse') exp = [...digits].reverse().join('');
    else {
      const counts = Array(10).fill(0);
      digits.forEach((d) => counts[d]++);
      exp = counts.map((c, d) => String(d).repeat(c)).join('');
    }
    if (exp !== item.answer) return { ok: false, reason: 'clé incorrecte' };
    return { ok: true, correct: [exp], notes: [] };
  },
};

export const lettresChiffres = {
  solve(item) {
    const { seq } = item.data;
    if (seq.length !== LEN[item.level]) return { ok: false, reason: 'longueur incorrecte' };
    if (new Set(seq).size !== seq.length) return { ok: false, reason: 'élément répété' };
    const ds = seq.filter((s) => '123456789'.includes(s) && s.length === 1);
    const ls = seq.filter((s) => LETTERS.includes(s));
    if (ds.length + ls.length !== seq.length) return { ok: false, reason: 'élément invalide' };
    if (!ds.length || !ls.length) return { ok: false, reason: 'il faut au moins un chiffre et une lettre' };
    const exp = '123456789'.split('').filter((d) => ds.includes(d)).join('') + LETTERS.filter((l) => ls.includes(l)).join('');
    if (exp !== item.answer) return { ok: false, reason: 'clé incorrecte' };
    if (item.level >= 3 && seq.join('') === exp) return { ok: false, reason: 'séquence déjà ordonnée' };
    return { ok: true, correct: [exp], notes: [] };
  },
};
