// Arithmétique (type WAIS-IV, mémoire de travail) : problèmes à résoudre de tête,
// sans papier, en temps limité. Chaque énoncé est construit avec son arbre de
// calcul ; le solveur réévalue cet arbre et vérifie que chaque donnée utilisée
// figure bien dans l'énoncé.

import { esc } from '../util.js';

export const TIME = [0, 30, 30, 30, 30, 30, 30, 30, 45, 45, 60];
// Constantes implicites autorisées dans un calcul (heures/minutes, pourcentages, double).
export const IMPLICIT = [1, 2, 60, 100];
const NAMES = ['Léa', 'Tom', 'Inès', 'Hugo', 'Chloé', 'Nathan', 'Jade', 'Louis', 'Sarah', 'Malik'];

const T = {
  1: [
    (r) => { const a = r.int(2, 9), b = r.int(2, 9), n = r.pick(NAMES); return [`${n} a ${a} pommes. On lui en donne ${b}. Combien de pommes cela fait-il en tout ?`, ['+', a, b]]; },
    (r) => { const a = r.int(6, 15), b = r.int(2, a - 2); return [`Il y a ${a} oiseaux sur un fil. ${b} s’envolent. Combien en reste-t-il ?`, ['-', a, b]]; },
  ],
  2: [
    (r) => { const a = r.pick([6, 10, 12]), b = r.int(2, 5); return [`Une boîte contient ${a} œufs. Combien d’œufs y a-t-il dans ${b} boîtes ?`, ['*', a, b]]; },
    (r) => { const a = r.int(20, 50), b = r.int(5, a - 5), n = r.pick(NAMES); return [`${n} a ${a} € et achète un livre à ${b} €. Combien d’argent reste-t-il à ${n} ?`, ['-', a, b]]; },
    (r) => { const a = r.int(3, 6), b = r.int(3, 8); return [`${a} enfants se partagent ${a * b} bonbons à parts égales. Combien de bonbons chacun reçoit-il ?`, ['/', a * b, a]]; },
  ],
  3: [
    (r) => { const n = r.int(2, 5), p = r.int(2, 6), B = n * p < 18 ? 20 : 50; return [`On achète ${n} cahiers à ${p} € l’un et on paie avec un billet de ${B} €. Combien d’argent rend-on ?`, ['-', B, ['*', n, p]]]; },
    (r) => { const a = r.int(20, 40), b = r.int(3, 12), c = r.int(3, 12); return [`Un bus transporte ${a} passagers. À l’arrêt, ${b} descendent et ${c} montent. Combien y a-t-il de passagers maintenant ?`, ['+', ['-', a, b], c]]; },
  ],
  4: [
    (r) => { const v = r.pick([60, 80, 90, 120]), t = r.int(2, 4); return [`Un train roule à ${v} km/h. Quelle distance parcourt-il en ${t} heures ?`, ['*', v, t]]; },
    (r) => { const u = r.int(2, 4), n = r.pick([4, 5, 6]), m = r.int(7, 15); return [`${n} stylos coûtent ${u * n} €. Combien coûtent ${m} stylos ?`, ['*', ['/', u * n, n], m]]; },
    (r) => { const a = r.int(6, 12), s = r.int(8, 15), o = r.int(10, a * s - 10); return [`Une salle compte ${a} rangées de ${s} chaises. ${o} chaises sont occupées. Combien sont libres ?`, ['-', ['*', a, s], o]]; },
  ],
  5: [
    (r) => { const rr = r.pick([10, 20, 25, 50]), p = 20 * r.int(2, 10); return [`Un manteau coûte ${p} €. Il est soldé à −${rr} %. Quel est son nouveau prix, en euros ?`, ['-', p, ['/', ['*', p, rr], 100]]]; },
    (r) => { const d = r.int(4, 12), k = r.int(6, 15); return [`Un robinet débite ${d} litres par minute. Combien de minutes faut-il pour remplir une cuve de ${d * k} litres ?`, ['/', d * k, d]]; },
    (r) => { const a = r.int(2, 5), u = r.int(2, 4), b = r.int(6, 12); return [`${a} kg de pommes coûtent ${a * u} €. Combien coûtent ${b} kg ?`, ['*', ['/', a * u, a], b]]; },
  ],
  6: [
    (r) => {
      const a = r.int(2, 6), d = r.int(4, 12);
      const bs = [...Array(12).keys()].map((x) => x + 1).filter((b) => b !== a && b >= 2 && (a * d) % b === 0 && (a * d) / b !== d);
      if (!bs.length) throw new Error('ouvriers');
      const b = r.pick(bs);
      return [`${a} ouvriers construisent un mur en ${d} jours. Combien de jours faudrait-il à ${b} ouvriers travaillant au même rythme ?`, ['/', ['*', a, d], b]];
    },
    (r) => {
      const v = r.pick([12, 15, 18, 20, 24, 30]);
      const ms = [20, 30, 40, 45, 50].filter((m) => (v * m) % 60 === 0);
      const m = r.pick(ms);
      return [`Un cycliste parcourt ${(v * m) / 60} km en ${m} minutes. Quelle est sa vitesse moyenne, en km/h ?`, ['/', ['*', (v * m) / 60, 60], m]];
    },
  ],
  7: [
    (r) => {
      const c = r.int(5, 8), Ds = [150, 200, 250, 300, 350, 400, 450, 500].filter((D) => (c * D) % 100 === 0);
      const D = r.pick(Ds);
      return [`Une voiture consomme ${c} litres aux 100 km. Combien de litres lui faut-il pour parcourir ${D} km ?`, ['/', ['*', c, D], 100]];
    },
    (r) => { const rr = r.pick([10, 20, 25, 50]), p = 20 * r.int(2, 9), P = (p * (100 + rr)) / 100; return [`Après une hausse de ${rr} %, un article coûte ${P} €. Quel était son prix avant la hausse, en euros ?`, ['/', ['*', P, 100], ['+', 100, rr]]]; },
    (r) => { const n = r.pick([20, 25, 30, 40]), rs = [10, 20, 30, 40, 60, 75, 80].filter((x) => (n * x) % 100 === 0), rr = r.pick(rs); return [`Dans une classe de ${n} élèves, ${rr} % sont des filles. Combien y a-t-il de garçons ?`, ['-', n, ['/', ['*', n, rr], 100]]]; },
  ],
  8: [
    (r) => { const [a, b] = r.pick([[6, 3], [12, 6], [20, 30], [10, 15], [12, 24], [30, 60], [36, 12], [28, 21], [40, 10]]); return [`Un robinet remplit une baignoire en ${a} minutes, un autre en ${b} minutes. En combien de minutes la remplissent-ils s’ils coulent ensemble ?`, ['/', ['*', a, b], ['+', a, b]]]; },
    (r) => { const k = r.int(3, 6), f = r.int(5, 12); return [`Un père a ${k} fois l’âge de son fils. À eux deux, ils ont ${f * (k + 1)} ans. Quel âge a le fils ?`, ['/', f * (k + 1), ['+', k, 1]]]; },
  ],
  9: [
    (r) => { const y = r.int(3, 9), x = r.int(4, 12), n = r.pick(NAMES); return [`Dans ${y} ans, l’âge de ${n} sera le double de son âge d’il y a ${x} ans. Quel est l’âge de ${n} aujourd’hui ?`, ['+', y, ['*', 2, x]]]; },
    (r) => {
      const r1 = r.pick([10, 20, 25, 50]), r2 = r.pick([10, 20, 25, 50]);
      const ps = [80, 100, 120, 160, 200, 240, 400].filter((p) => (p * (100 + r1)) % 100 === 0 && (p * (100 + r1) * (100 - r2)) % 10000 === 0);
      const p = r.pick(ps);
      return [`Un prix de ${p} € augmente de ${r1} %, puis le nouveau prix baisse de ${r2} %. Quel est le prix final, en euros ?`, ['/', ['*', ['/', ['*', p, ['+', 100, r1]], 100], ['-', 100, r2]], 100]];
    },
  ],
  10: [
    (r) => {
      const v1 = r.pick([60, 70, 80, 90, 100]), v2 = r.pick([80, 90, 100, 110, 120, 140]);
      const Ds = [150, 180, 200, 210, 240, 280, 300, 360, 420].filter((D) => (D * 60) % (v1 + v2) === 0);
      if (!Ds.length) throw new Error('trains');
      const D = r.pick(Ds);
      return [`Deux villes sont distantes de ${D} km. Deux trains partent en même temps l’un vers l’autre, à ${v1} km/h et à ${v2} km/h. Au bout de combien de minutes se croisent-ils ?`, ['/', ['*', D, 60], ['+', v1, v2]]];
    },
    (r) => {
      const a = r.int(1, 5), b = r.int(1, 5), p = r.pick([5, 10, 15, 20]), q = r.pick([25, 30, 40, 50]);
      if ((a * p + b * q) % (a + b) !== 0 || a === b) throw new Error('mélange');
      return [`On mélange ${a} litres d’un jus contenant ${p} % de sucre avec ${b} litres d’un jus à ${q} %. Quel est le pourcentage de sucre du mélange ?`, ['/', ['+', ['*', a, p], ['*', b, q]], ['+', a, b]]];
    },
    (r) => {
      const v1 = r.pick([40, 50, 60]), v2 = r.pick([70, 80, 90, 100, 120]), t = r.int(1, 3);
      if ((t * v1) % (v2 - v1) !== 0) throw new Error('poursuite');
      return [`Une voiture part à ${v1} km/h. ${t} heure${t > 1 ? 's' : ''} plus tard, une moto part du même point, sur la même route, à ${v2} km/h. Combien d’heures après son départ la moto rattrape-t-elle la voiture ?`, ['/', ['*', t, v1], ['-', v2, v1]]];
    },
  ],
};

export function evaluate(e) {
  if (typeof e === 'number') return e;
  const [op, a, b] = e;
  const x = evaluate(a), y = evaluate(b);
  if (op === '+') return x + y;
  if (op === '-') return x - y;
  if (op === '*') return x * y;
  if (op === '/') return x / y;
  throw new Error(`opérateur ${op}`);
}

export function exprText(e) {
  if (typeof e === 'number') return String(e);
  const sym = { '+': '+', '-': '−', '*': '×', '/': '÷' }[e[0]];
  return `(${exprText(e[1])} ${sym} ${exprText(e[2])})`;
}

export function generate(rng, level) {
  const pool = T[level].concat(level > 1 && rng.chance(0.25) ? T[level - 1] : []);
  const [text, expr] = rng.pick(pool)(rng);
  const value = evaluate(expr);
  return {
    category: 'arithmetique', level, subtype: 'calcul mental', interactive: true,
    prompt: text,
    data: { expr },
    options: null,
    answer: String(value),
    rules: [{ title: 'Calcul', text: `${exprText(expr).replace(/^\((.*)\)$/, '$1')} = ${value}.` }],
    timeLimit: TIME[level],
  };
}

export function mount(stage, item, ctx) {
  let typed = '';
  const t0 = Date.now();
  stage.innerHTML = `<form class="span-form ari-form"><label>Réponse
      <input data-in inputmode="numeric" autocomplete="off" spellcheck="false"></label>
      <button class="btn primary" type="submit">Valider</button>
      <span class="timer" data-timer></span></form>
    <p class="muted small">Calcul de tête : pas de papier, pas de calculatrice.</p>`;
  const input = stage.querySelector('[data-in]');
  input.addEventListener('input', () => { typed = input.value; });
  input.focus();
  stage.querySelector('form').addEventListener('submit', (e) => { e.preventDefault(); ctx.finish(input.value); });
  const timerEl = stage.querySelector('[data-timer]');
  const tick = () => {
    const left = item.timeLimit - (Date.now() - t0) / 1000;
    timerEl.textContent = `⏱ ${Math.max(0, Math.ceil(left))} s`;
    timerEl.classList.toggle('urgent', left < 10);
    if (left <= 0) ctx.finish(typed);
  };
  ctx.interval(tick, 250);
  tick();
  return { collect: () => typed };
}

export function score(item, response) {
  const clean = String(response ?? '').replace(/\s/g, '').replace(',', '.').replace(/[^\d.-]/g, '');
  const ok = clean !== '' && Number(clean) === Number(item.answer);
  return { correct: ok, detail: `Votre réponse : ${clean || '(vide)'} ; attendu : ${item.answer}.` };
}

export function renderStimulus() {
  return '';
}

export function renderOption() {
  return '';
}

export function renderExplanation(item) {
  let html = '<ol class="rule-list">';
  for (const r of item.rules) html += `<li><strong>${esc(r.title)}</strong> — ${esc(r.text)}</li>`;
  return `${html}</ol>`;
}

export default { id: 'arithmetique', generate, mount, score, renderStimulus, renderOption, renderExplanation };
