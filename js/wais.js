// Batterie de type WAIS-IV : quatre indices (ICV, IRP, IMT, IVT), subtests
// principaux et supplémentaires, quatre niveaux de difficulté. La construction
// des séries et le calcul des scores sont ici ; l'interface est dans app.js.
// Pas de normes : les résultats sont des taux de réussite, jamais un QI.

import { generateItem } from './engine.js';

export const INDICES = [
  { id: 'ICV', name: 'Compréhension verbale', desc: 'Raisonnement sur des concepts verbaux, connaissances acquises, vocabulaire.' },
  { id: 'IRP', name: 'Raisonnement perceptif', desc: 'Raisonnement fluide non verbal, analyse visuo-spatiale, construction.' },
  { id: 'IMT', name: 'Mémoire de travail', desc: 'Maintenir et manipuler mentalement des informations (chiffres, calculs, séquences).' },
  { id: 'IVT', name: 'Vitesse de traitement', desc: 'Rapidité et précision du traitement visuel simple sous contrainte de temps.' },
];

// Ordre d'administration de l'échelle originale.
export const SUBTESTS = [
  { id: 'cubes', name: 'Cubes', index: 'IRP', core: true, count: 4, stop: 2, desc: 'Reproduire un modèle rouge et blanc avec des blocs bicolores, en temps limité.' },
  { id: 'similitudes', name: 'Similitudes', index: 'ICV', core: true, count: 6, stop: 3, desc: 'Trouver ce que deux mots ou notions ont en commun.' },
  { id: 'chiffres', name: 'Mémoire des chiffres', index: 'IMT', core: true, count: 6, stop: null, modes: ['direct', 'direct', 'inverse', 'inverse', 'croissant', 'croissant'], desc: 'Répéter des suites de chiffres dans l’ordre direct, inverse, puis croissant.' },
  { id: 'matrices', name: 'Matrices', index: 'IRP', core: true, count: 6, stop: 3, timed: true, desc: 'Compléter une matrice de figures en trouvant les règles qui l’organisent.' },
  { id: 'vocabulaire', name: 'Vocabulaire', index: 'ICV', core: true, count: 6, stop: 3, desc: 'Retrouver la définition d’un mot.' },
  { id: 'arithmetique', name: 'Arithmétique', index: 'IMT', core: true, count: 6, stop: 3, desc: 'Résoudre de tête des problèmes, en temps limité.' },
  { id: 'symboles', name: 'Symboles', index: 'IVT', core: true, count: 1, stop: null, speed: true, desc: 'Dire le plus vite possible si un symbole cible figure dans un groupe (2 minutes).' },
  { id: 'puzzles', name: 'Puzzles visuels', index: 'IRP', core: true, count: 5, stop: 3, desc: 'Choisir les trois pièces qui reconstituent une figure, en temps limité.' },
  { id: 'information', name: 'Information', index: 'ICV', core: true, count: 6, stop: 3, desc: 'Répondre à des questions de culture générale.' },
  { id: 'code', name: 'Code', index: 'IVT', core: true, count: 1, stop: null, speed: true, desc: 'Associer chiffres et symboles selon une clé, le plus vite possible (2 minutes).' },
  { id: 'lettresChiffres', name: 'Séquence lettres-chiffres', index: 'IMT', core: false, count: 4, stop: 3, desc: 'Réordonner une suite mêlée : chiffres croissants puis lettres alphabétiques.' },
  { id: 'balances', name: 'Balances', index: 'IRP', core: false, count: 5, stop: 3, timed: true, desc: 'Trouver ce qui équilibre une balance à partir d’autres balances.' },
];
export const subtestById = Object.fromEntries(SUBTESTS.map((s) => [s.id, s]));

export const DIFFICULTIES = [
  { id: 'facile', name: 'Facile', range: [1, 3], desc: 'Niveaux 1 à 3 : items courants, peu d’éléments, temps confortable.' },
  { id: 'moyen', name: 'Moyen', range: [3, 6], desc: 'Niveaux 3 à 6 : comparable à l’essentiel de l’échelle adulte.' },
  { id: 'difficile', name: 'Difficile', range: [5, 8], desc: 'Niveaux 5 à 8 : derniers items de l’échelle et au-delà.' },
  { id: 'extreme', name: 'Extrême', range: [8, 10], desc: 'Niveaux 8 à 10 : volontairement au-delà du plafond de l’échelle.' },
];
export const difficultyById = Object.fromEntries(DIFFICULTIES.map((d) => [d.id, d]));

// Niveaux croissants répartis sur l'intervalle de la difficulté.
export function levelRamp([lo, hi], n) {
  if (n <= 1) return [Math.round((lo + hi) / 2)];
  return Array.from({ length: n }, (_, i) => lo + Math.round((i * (hi - lo)) / (n - 1)));
}

export function buildSubtest(id, difficultyId) {
  const st = subtestById[id];
  const range = difficultyById[difficultyId].range;
  if (st.modes) {
    // Mémoire des chiffres : deux essais par épreuve, de difficulté croissante.
    const out = [];
    const per = {};
    st.modes.forEach((m) => { per[m] = (per[m] || 0) + 1; });
    const seen = {};
    for (const mode of st.modes) {
      const k = (seen[mode] = (seen[mode] || 0) + 1) - 1;
      const level = levelRamp(range, per[mode])[k];
      let item = null;
      for (let t = 0; t < 80 && !item; t++) {
        const it = generateItem(id, level);
        if (it.data.mode === mode) item = it;
      }
      if (!item) throw new Error('Mémoire des chiffres : épreuve introuvable');
      out.push(item);
    }
    return out;
  }
  return levelRamp(range, st.count).map((level) => generateItem(id, level));
}

// Score d'un subtest à partir des résultats { correct, points?, maxPoints? }.
export function subtestScore(st, results) {
  if (st.speed) {
    const r = results[0] || {};
    const points = r.points || 0, max = r.maxPoints || 1;
    return { points, max, pct: Math.min(1, points / max), label: `${points} (objectif ${max})` };
  }
  const ok = results.filter((r) => r.correct).length;
  return { points: ok, max: results.length, pct: results.length ? ok / results.length : 0, label: `${ok} / ${results.length}` };
}

const mean = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : null);

// Indices = moyenne des taux des subtests passés ; indices composites comme
// dans l'échelle : IAG (ICV + IRP) et ICC (IMT + IVT).
export function indexScores(scores) {
  const out = {};
  for (const ix of INDICES) out[ix.id] = mean(Object.entries(scores).filter(([id]) => subtestById[id].index === ix.id).map(([, s]) => s.pct));
  const present = (ids) => ids.map((i) => out[i]).filter((v) => v !== null);
  out.IAG = mean(present(['ICV', 'IRP']));
  out.ICC = mean(present(['IMT', 'IVT']));
  out.global = mean(present(['ICV', 'IRP', 'IMT', 'IVT']));
  return out;
}

// Lecture du profil : points forts et faibles relatifs à la moyenne personnelle
// (écart d'au moins 15 points), profil homogène ou hétérogène (écart max ≥ 25).
export function profile(ix) {
  const vals = INDICES.map((i) => [i, ix[i.id]]).filter(([, v]) => v !== null);
  if (vals.length < 2) return { strengths: [], weaknesses: [], spread: 0, heterogeneous: false };
  const m = mean(vals.map(([, v]) => v));
  const spread = Math.max(...vals.map(([, v]) => v)) - Math.min(...vals.map(([, v]) => v));
  return {
    mean: m,
    spread,
    heterogeneous: spread >= 0.25,
    strengths: vals.filter(([, v]) => v - m >= 0.15).map(([i]) => i),
    weaknesses: vals.filter(([, v]) => m - v >= 0.15).map(([i]) => i),
  };
}
