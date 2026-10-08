// Banc de validation partagé (navigateur et Node) : génère N items par catégorie
// et par niveau, revalide chaque item avec son solveur, vérifie la
// reproductibilité des graines et le rendu, et mesure les temps de génération.

import { generateFromSeed, CATEGORIES } from '../js/engine.js';
import { GENERATORS } from '../js/generators/index.js';
import { SOLVERS } from '../js/solvers/index.js';
import { formatSeed, hashString, parseSeed, Rng } from '../js/rng.js';

const now = () => (globalThis.performance ? performance.now() : Date.now());
const strip = (item) => JSON.stringify({ ...item, validation: undefined });

export function unitTests() {
  const results = [];
  const t = (name, fn) => {
    try { results.push({ name, ok: Boolean(fn()) }); } catch (e) { results.push({ name, ok: false, error: e.message }); }
  };
  t('RNG reproductible', () => {
    const a = new Rng('abc'), b = new Rng('abc');
    return Array.from({ length: 50 }, () => a.next()).join() === Array.from({ length: 50 }, () => b.next()).join();
  });
  t('RNG : graines différentes → suites différentes', () => new Rng('a').next() !== new Rng('b').next());
  t('RNG.int reste dans les bornes', () => {
    const r = new Rng(1);
    for (let i = 0; i < 5000; i++) { const v = r.int(3, 7); if (v < 3 || v > 7) return false; }
    return true;
  });
  t('Graine : format et lecture', () => {
    const s = formatSeed('logic', 7, '00ab12cd');
    const p = parseSeed(s);
    return s === 'LOG-07-00ab12cd' && p.category === 'logic' && p.level === 7 && p.hex === '00ab12cd';
  });
  t('Graine invalide refusée', () => parseSeed('XYZ-99-zz') === null && parseSeed('MAT-11-00000000') === null);
  t('Même graine → même item (toutes catégories)', () => CATEGORIES.every((c) => {
    const s = formatSeed(c.id, 6, 'deadbeef');
    return strip(generateFromSeed(s)) === strip(generateFromSeed(s));
  }));
  return results;
}

export async function runValidation({ n = 1000, categories = CATEGORIES.map((c) => c.id), levels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], onProgress = () => {}, onRow = () => {} } = {}) {
  const rows = [];
  const totalCells = categories.length * levels.length;
  let cell = 0;
  for (const cat of categories) {
    for (const level of levels) {
      const stats = { accepted: 0, rejected: 0, reasons: {} };
      let unique = 0, ambiguous = 0, failures = 0, renderErrors = 0, nondeterministic = 0;
      let totalMs = 0, maxMs = 0;
      const failMsgs = [];
      for (let i = 0; i < n; i++) {
        const hex = hashString(`${cat}|${level}|${i}`).toString(16).padStart(8, '0');
        const seed = formatSeed(cat, level, hex);
        const t0 = now();
        let item;
        try {
          item = generateFromSeed(seed, stats);
        } catch (e) {
          failures++;
          if (failMsgs.length < 3) failMsgs.push(e.message);
          continue;
        }
        const dt = now() - t0;
        totalMs += dt;
        maxMs = Math.max(maxMs, dt);
        // Revalidation indépendante de l'item affiché.
        const res = SOLVERS[cat].solve(item);
        const isUnique = res.ok && (item.options ? res.correct.length === 1 && res.correct[0] === item.answer : true);
        if (isUnique) unique++; else ambiguous++;
        if (i < 5 && strip(generateFromSeed(seed)) !== strip(item)) nondeterministic++;
        if (i < 3) {
          try {
            const g = GENERATORS[cat];
            g.renderStimulus(item);
            if (item.options) item.options.forEach((_, k) => g.renderOption(item, k));
            g.renderExplanation(item);
          } catch (e) {
            renderErrors++;
            if (failMsgs.length < 3) failMsgs.push(`rendu : ${e.message}`);
          }
        }
        if (i % 25 === 24) await new Promise((r) => setTimeout(r, 0));
      }
      const attempts = stats.accepted + stats.rejected;
      const row = {
        category: cat, level, n,
        generated: n - failures,
        attempts,
        rejected: stats.rejected,
        rejectionRate: attempts ? stats.rejected / attempts : 0,
        unique, ambiguous, failures, renderErrors, nondeterministic,
        avgMs: totalMs / Math.max(1, n - failures),
        maxMs,
        reasons: stats.reasons,
        messages: failMsgs,
      };
      rows.push(row);
      onRow(row);
      cell++;
      onProgress(cell / totalCells, row);
    }
  }
  return rows;
}
