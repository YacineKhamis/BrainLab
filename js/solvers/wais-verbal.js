// Validation des subtests verbaux : l'item est recoupé avec sa banque
// (réponse attendue présente une seule fois, chaque option issue de la banque,
// distracteurs distincts de la bonne réponse et sans synonyme de celle-ci).

import { SIMILITUDES, VOCABULAIRE, INFORMATION } from '../data/wais.js';

const byId = (bank) => new Map(bank.map((e) => [e.id, e]));
const SIM = byId(SIMILITUDES), VOC = byId(VOCABULAIRE), INF = byId(INFORMATION);

function check(item, correctText, allowed, describe) {
  const texts = item.options.map((o) => o.text);
  if (new Set(texts).size !== texts.length) return { ok: false, reason: 'options identiques' };
  const correct = [];
  const notes = texts.map((t, i) => {
    if (t === correctText) { correct.push(i); return 'Bonne réponse.'; }
    if (!allowed.has(t)) return null;
    return describe(t);
  });
  if (notes.includes(null)) return { ok: false, reason: 'option hors banque' };
  if (correct.length !== 1) return { ok: false, reason: `${correct.length} options valides` };
  if (correct[0] !== item.answer) return { ok: false, reason: 'clé incorrecte' };
  return { ok: true, correct, notes };
}

export const similitudes = {
  solve(item) {
    const e = SIM.get(item.data.id);
    if (!e) return { ok: false, reason: 'entrée inconnue' };
    if (new Set([item.data.A, item.data.B]).size !== 2 || ![e.a, e.b].includes(item.data.A) || ![e.a, e.b].includes(item.data.B)) return { ok: false, reason: 'paire incohérente' };
    if (e.ko.includes(e.ok)) return { ok: false, reason: 'distracteur identique à la réponse' };
    return check(item, e.ok, new Set(e.ko), () => 'Ne décrit pas ce que les deux ont en commun (vrai pour un seul, ou faux).');
  },
};

export const vocabulaire = {
  solve(item) {
    const e = VOC.get(item.data.id);
    if (!e) return { ok: false, reason: 'entrée inconnue' };
    const defs = new Map();
    for (const o of VOCABULAIRE) {
      if (o.id === e.id) continue;
      if (o.def === e.def) return { ok: false, reason: 'définition en double dans la banque' };
      if (o.pos === e.pos) defs.set(o.def, o.mot);
    }
    return check(item, e.def, new Set(defs.keys()), (t) => `Définition de « ${defs.get(t)} ».`);
  },
};

export const information = {
  solve(item) {
    const e = INF.get(item.data.id);
    if (!e) return { ok: false, reason: 'entrée inconnue' };
    if (item.prompt !== e.q) return { ok: false, reason: 'question incohérente' };
    return check(item, e.ok, new Set(e.ko.filter((k) => k !== e.ok)), () => 'Réponse incorrecte.');
  },
};
