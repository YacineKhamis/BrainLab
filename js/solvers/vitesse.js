// Validation des épreuves de vitesse (Symboles, Code) : la clé est recalculée
// indépendamment par comparaison exacte des glyphes ; contraintes de
// présentation (symboles distincts, proportion de « oui » équilibrée…).

import { glyphKey } from '../generators/glyphs.js';
import { TARGETS, SEARCH } from '../generators/symboles.js';
import { PAIRS, LENGTH } from '../generators/code.js';

export const symboles = {
  solve(item) {
    const { rows } = item.data;
    let yes = 0;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (r.targets.length !== TARGETS[item.level] || r.search.length !== SEARCH[item.level]) return { ok: false, reason: 'taille de ligne' };
      const tk = r.targets.map(glyphKey), sk = r.search.map(glyphKey);
      if (new Set(tk).size !== tk.length || new Set(sk).size !== sk.length) return { ok: false, reason: 'symbole répété dans une ligne' };
      const hits = sk.filter((k) => tk.includes(k)).length;
      if (hits > 1) return { ok: false, reason: 'plusieurs cibles dans un groupe' };
      if ((hits === 1) !== item.answer[i]) return { ok: false, reason: 'clé incorrecte' };
      yes += hits;
    }
    const rate = yes / rows.length;
    if (rate < 0.35 || rate > 0.65) return { ok: false, reason: 'proportion de « oui » déséquilibrée' };
    return { ok: true, correct: [item.answer], notes: [] };
  },
};

export const code = {
  solve(item) {
    const { key, digits, palettes, every } = item.data;
    const n = PAIRS[item.level];
    if (key.length !== n || digits.length !== LENGTH) return { ok: false, reason: 'taille incorrecte' };
    if (new Set(key.map(glyphKey)).size !== n) return { ok: false, reason: 'symboles de la clé non distincts' };
    if (digits.some((d) => d < 1 || d > n)) return { ok: false, reason: 'chiffre hors clé' };
    for (let i = 1; i < digits.length; i++) if (digits[i] === digits[i - 1]) return { ok: false, reason: 'chiffre répété consécutivement' };
    if (palettes.length !== Math.ceil(LENGTH / every) || palettes.some((p) => p.slice().sort((a, b) => a - b).join() !== [...Array(n).keys()].join())) return { ok: false, reason: 'palette invalide' };
    if (item.answer.some((g, i) => glyphKey(key[g]) !== glyphKey(key[digits[i] - 1]))) return { ok: false, reason: 'clé incorrecte' };
    return { ok: true, correct: [item.answer], notes: [] };
  },
};
