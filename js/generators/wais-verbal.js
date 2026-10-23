// Subtests verbaux de type WAIS-IV (indice de compréhension verbale) :
// Similitudes, Vocabulaire, Information. Format à choix multiple ; les items
// sont tirés de banques originales (js/data/wais.js) par palier de difficulté.

import { esc } from '../util.js';
import { SIMILITUDES, VOCABULAIRE, INFORMATION, tierOf } from '../data/wais.js';

const POS = { n: 'nom', v: 'verbe', a: 'adjectif' };

// Banque restreinte au palier du niveau ; les niveaux impairs (bas de palier)
// piochent aussi dans le palier précédent.
function pool(bank, level) {
  const t = tierOf(level);
  return bank.filter((e) => e.t === t || (level % 2 === 1 && e.t === t - 1));
}

function withAnswer(rng, correct, wrong) {
  const answer = rng.int(0, wrong.length);
  const texts = rng.shuffle(wrong);
  texts.splice(answer, 0, correct);
  return { options: texts.map((text) => ({ text })), answer };
}

function textOption(item, i) {
  return `<span class="opt-text left">${esc(item.options[i].text)}</span>`;
}

function rulesHtml(item) {
  let html = '<ol class="rule-list">';
  for (const r of item.rules) html += `<li><strong>${esc(r.title)}</strong> — ${esc(r.text)}</li>`;
  return `${html}</ol>`;
}

// ---------------------------------------------------------------- Similitudes

export const similitudes = {
  id: 'similitudes',
  layout: 'list',
  generate(rng, level) {
    const e = rng.pick(pool(SIMILITUDES, level));
    const [A, B] = rng.chance(0.5) ? [e.a, e.b] : [e.b, e.a];
    return {
      category: 'similitudes', level, subtype: 'similitudes',
      prompt: `En quoi « ${A} » et « ${B} » se ressemblent-ils ? Choisissez la réponse qui décrit ce qu’ils ont réellement en commun.`,
      data: { id: e.id, A, B },
      ...withAnswer(rng, e.ok, e.ko),
      rules: [
        { title: 'Point commun', text: `${e.ok} C’est la catégorie (ou la fonction) la plus précise qui s’applique aux deux à la fois.` },
        { title: 'Pièges', text: 'Les autres réponses ne valent que pour l’un des deux, décrivent un détail faux ou un contresens.' },
      ],
      timeLimit: 40,
    };
  },
  renderStimulus(item) {
    return `<div class="analogy"><span class="an-w">${esc(item.data.A)}</span><span class="an-op">et</span><span class="an-w">${esc(item.data.B)}</span></div>`;
  },
  renderOption: textOption,
  renderExplanation(item) {
    return `<div class="exp-visual">${similitudes.renderStimulus(item)}</div>${rulesHtml(item)}`;
  },
};

// ---------------------------------------------------------------- Vocabulaire

export const vocabulaire = {
  id: 'vocabulaire',
  layout: 'list',
  generate(rng, level) {
    const e = rng.pick(pool(VOCABULAIRE, level));
    const n = level >= 7 ? 4 : 3;
    // Distracteurs : définitions d'autres mots de même nature, de palier voisin
    // (les plus proches d'abord, pour que les pièges aient le même registre).
    const others = rng.shuffle(VOCABULAIRE.filter((o) => o.id !== e.id && o.pos === e.pos && Math.abs(o.t - e.t) <= 1))
      .sort((x, y) => Math.abs(x.t - e.t) - Math.abs(y.t - e.t));
    if (others.length < n) throw new Error('distracteurs');
    const wrong = others.slice(0, n);
    const opt = withAnswer(rng, e.def, wrong.map((o) => o.def));
    return {
      category: 'vocabulaire', level, subtype: 'vocabulaire',
      prompt: `Que signifie le mot « ${e.mot} » (${POS[e.pos]}) ?`,
      data: { id: e.id, mot: e.mot, pos: e.pos, wrongIds: wrong.map((o) => o.id) },
      ...opt,
      rules: [{ title: e.mot, text: e.def }].concat(wrong.map((o) => ({ title: `Piège : ${o.mot}`, text: `« ${o.def} » est la définition de « ${o.mot} ».` }))),
      timeLimit: 40,
    };
  },
  renderStimulus(item) {
    return `<div class="analogy"><span class="an-w">${esc(item.data.mot)}</span></div>`;
  },
  renderOption: textOption,
  renderExplanation(item) {
    return rulesHtml(item);
  },
};

// ---------------------------------------------------------------- Information

export const information = {
  id: 'information',
  layout: 'textual',
  generate(rng, level) {
    const e = rng.pick(pool(INFORMATION, level));
    return {
      category: 'information', level, subtype: 'culture générale',
      prompt: e.q,
      data: { id: e.id },
      ...withAnswer(rng, e.ok, e.ko),
      rules: [{ title: 'Réponse', text: e.ok }],
      timeLimit: 30,
    };
  },
  renderStimulus() {
    return '';
  },
  renderOption: textOption,
  renderExplanation(item) {
    return rulesHtml(item);
  },
};
