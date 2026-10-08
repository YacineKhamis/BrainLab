// Moteur : génère un item à partir d'une graine, le fait valider par le solveur
// de sa catégorie et le régénère (tentative suivante, dérivée de la même graine)
// tant qu'il est ambigu. Une même graine redonne donc toujours le même item.

import { Rng, formatSeed, parseSeed, randomHex } from './rng.js';
import { GENERATORS } from './generators/index.js';
import { SOLVERS } from './solvers/index.js';

export const CATEGORIES = [
  { id: 'matrices', name: 'Matrices visuelles', short: 'Matrices' },
  { id: 'sequences', name: 'Suites numériques et alphabétiques', short: 'Suites' },
  { id: 'spatial', name: 'Visuo-spatial', short: 'Spatial' },
  { id: 'logic', name: 'Logique', short: 'Logique' },
  { id: 'verbal', name: 'Analogies verbales', short: 'Analogies' },
  { id: 'memory', name: 'Mémoire de travail', short: 'Mémoire' },
];

export const MAX_ATTEMPTS = 400;

export function generateFromSeed(seedStr, stats = null) {
  const parsed = parseSeed(seedStr);
  if (!parsed) throw new Error(`Graine invalide : ${seedStr}`);
  const { category, level, hex } = parsed;
  const seed = formatSeed(category, level, hex);
  const gen = GENERATORS[category];
  const solver = SOLVERS[category];
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const rng = new Rng(`${seed}#${attempt}`);
    let item;
    try {
      item = gen.generate(rng, level);
    } catch (e) {
      if (stats) {
        stats.rejected++;
        stats.reasons[`génération : ${e.message}`] = (stats.reasons[`génération : ${e.message}`] || 0) + 1;
      }
      continue;
    }
    const res = solver.solve(item);
    if (res.ok) {
      item.seed = seed;
      item.attempt = attempt;
      item.validation = res;
      if (stats) stats.accepted++;
      return item;
    }
    if (stats) {
      stats.rejected++;
      const r = String(res.reason).replace(/\d+/g, 'n');
      stats.reasons[r] = (stats.reasons[r] || 0) + 1;
    }
  }
  throw new Error(`Aucun item valide après ${MAX_ATTEMPTS} tentatives (${seed})`);
}

export function generateItem(category, level, hex = randomHex(), stats = null) {
  return generateFromSeed(formatSeed(category, level, hex), stats);
}
