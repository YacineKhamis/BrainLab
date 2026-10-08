// Mémoire de travail : empan de chiffres à l'envers, n-back, dual n-back.
// Ces items sont interactifs : la présentation est gérée par l'interface (app.js),
// le générateur fournit la séquence et la fonction de notation.

import { esc } from '../util.js';

const SPAN = [0, 3, 4, 5, 6, 7, 7, 8, 9, 10, 12];
const SPAN_MS = [0, 1000, 1000, 1000, 900, 900, 700, 700, 600, 550, 500];
const NBACK = [0, 1, 2, 2, 3, 3, 4, 4, 5, 6, 7];
const NBACK_MS = [0, 2500, 2500, 2200, 2200, 2000, 2000, 1800, 1600, 1500, 1400];
const DUAL = [0, 0, 1, 1, 2, 2, 3, 3, 4, 5, 6];
const DUAL_MS = [0, 0, 3000, 3000, 2800, 2800, 2600, 2500, 2300, 2000, 1800];
const LETTERS = ['B', 'C', 'D', 'F', 'H', 'K', 'L', 'M', 'P', 'R', 'S', 'T'];

export const ERROR_RATE = 0.15; // erreurs tolérées pour réussir un bloc n-back

function nbackStream(rng, T, n, alphabet, targetRate, lureRate) {
  const s = [];
  for (let i = 0; i < T; i++) {
    let v;
    if (i >= n && rng.chance(targetRate)) v = s[i - n];
    else if (i >= n + 1 && rng.chance(lureRate)) v = rng.chance(0.5) ? s[i - n + 1] : s[i - n - 1];
    else v = rng.pick(alphabet);
    // pas trois stimuli identiques d'affilée
    if (i >= 2 && v === s[i - 1] && v === s[i - 2]) v = rng.pick(alphabet.filter((x) => x !== v));
    s.push(v);
  }
  return s;
}
const targetsOf = (s, n) => s.map((v, i) => (i >= n && v === s[i - n] ? i : -1)).filter((i) => i >= 0);

function okRate(s, n) {
  const t = targetsOf(s, n).length / (s.length - n);
  return t >= 0.22 && t <= 0.4;
}

export function generate(rng, level) {
  const kinds = DUAL[level] ? ['span', 'nback', 'dual'] : ['span', 'nback'];
  const kind = rng.pick(kinds);
  if (kind === 'span') {
    const len = SPAN[level];
    const digits = [];
    while (digits.length < len) {
      const d = rng.int(0, 9);
      if (digits.length && d === digits[digits.length - 1]) continue;
      if (digits.filter((x) => x === d).length >= 2) continue;
      digits.push(d);
    }
    const ms = SPAN_MS[level];
    return {
      category: 'memory', level, subtype: 'empan à l’envers', interactive: true,
      prompt: `Mémorisez ${len} chiffres présentés un par un (${ms} ms chacun), puis saisissez-les dans l’ordre INVERSE.`,
      data: { kind: 'span', digits, interval: ms },
      options: null,
      answer: digits.slice().reverse().join(''),
      rules: [{ title: 'Empan inversé', text: `Séquence présentée : ${digits.join(' ')} → réponse attendue : ${digits.slice().reverse().join(' ')}.` }],
      timeLimit: Math.ceil((len * ms) / 1000) + 15 + len * 2,
    };
  }
  if (kind === 'nback') {
    const n = NBACK[level];
    const T = 20 + 2 * n;
    const lure = level >= 5 ? 0.15 : 0.05;
    let s;
    for (let t = 0; t < 100; t++) {
      s = nbackStream(rng, T, n, [0, 1, 2, 3, 4, 5, 6, 7, 8], 0.3, lure);
      if (okRate(s, n)) break;
    }
    const ms = NBACK_MS[level];
    return {
      category: 'memory', level, subtype: `${n}-back`, interactive: true,
      prompt: `${n}-back spatial : une case s’allume toutes les ${ms / 1000} s. Appuyez sur « Correspondance » (touche Espace) quand la position est la même qu’il y a ${n} étape${n > 1 ? 's' : ''}.`,
      data: { kind: 'nback', n, positions: s, interval: ms, targets: targetsOf(s, n) },
      options: null,
      answer: targetsOf(s, n),
      rules: [{ title: `${n}-back`, text: `Il fallait répondre aux étapes ${targetsOf(s, n).map((i) => i + 1).join(', ')} (${targetsOf(s, n).length} correspondances sur ${T - n} étapes notées). Réussite : au plus ${Math.round(ERROR_RATE * 100)} % d’erreurs (oublis + fausses alarmes).` }],
      timeLimit: Math.ceil((T * ms) / 1000) + 10,
    };
  }
  const n = DUAL[level];
  const T = 20 + 2 * n;
  const alphabet = rng.sample(LETTERS, 8);
  let pos, let_;
  for (let t = 0; t < 100; t++) {
    pos = nbackStream(rng, T, n, [0, 1, 2, 3, 4, 5, 6, 7, 8], 0.3, level >= 6 ? 0.12 : 0.05);
    if (okRate(pos, n)) break;
  }
  for (let t = 0; t < 100; t++) {
    let_ = nbackStream(rng, T, n, alphabet, 0.3, level >= 6 ? 0.12 : 0.05);
    if (okRate(let_, n)) break;
  }
  const ms = DUAL_MS[level];
  const tp = targetsOf(pos, n), tl = targetsOf(let_, n);
  return {
    category: 'memory', level, subtype: `dual ${n}-back`, interactive: true,
    prompt: `Dual ${n}-back : une lettre apparaît dans une case toutes les ${ms / 1000} s. Touche A = même POSITION qu’il y a ${n} étape${n > 1 ? 's' : ''} ; touche L = même LETTRE qu’il y a ${n} étape${n > 1 ? 's' : ''}.`,
    data: { kind: 'dual', n, positions: pos, letters: let_, interval: ms, targetsPos: tp, targetsLet: tl },
    options: null,
    answer: { pos: tp, let: tl },
    rules: [{ title: `Dual ${n}-back`, text: `Positions cibles : étapes ${tp.map((i) => i + 1).join(', ')}. Lettres cibles : étapes ${tl.map((i) => i + 1).join(', ')}. Réussite : au plus ${Math.round(ERROR_RATE * 100)} % d’erreurs sur l’ensemble des deux canaux.` }],
    timeLimit: Math.ceil((T * ms) / 1000) + 10,
  };
}

function channelScore(responses, targets, n, T) {
  const r = new Set(responses), t = new Set(targets);
  let hits = 0, misses = 0, fa = 0;
  for (let i = n; i < T; i++) {
    if (t.has(i) && r.has(i)) hits++;
    else if (t.has(i)) misses++;
    else if (r.has(i)) fa++;
  }
  return { hits, misses, fa };
}

// response : span → chaîne ; nback → indices pressés ; dual → { pos: [], let: [] }
export function score(item, response) {
  const d = item.data;
  if (d.kind === 'span') {
    const clean = String(response ?? '').replace(/\D/g, '');
    return { correct: clean === item.answer, detail: `Votre réponse : ${clean || '(vide)'} ; attendu : ${item.answer}.` };
  }
  const T = d.positions.length;
  if (d.kind === 'nback') {
    const s = channelScore(response || [], d.targets, d.n, T);
    const errors = s.misses + s.fa;
    return { correct: errors <= Math.floor(ERROR_RATE * (T - d.n)), detail: `${s.hits} détections, ${s.misses} oublis, ${s.fa} fausses alarmes.`, ...s };
  }
  const a = channelScore((response && response.pos) || [], d.targetsPos, d.n, T);
  const b = channelScore((response && response.let) || [], d.targetsLet, d.n, T);
  const errors = a.misses + a.fa + b.misses + b.fa;
  return { correct: errors <= Math.floor(ERROR_RATE * 2 * (T - d.n)), detail: `Position : ${a.hits} détections, ${a.misses} oublis, ${a.fa} fausses alarmes. Lettre : ${b.hits} détections, ${b.misses} oublis, ${b.fa} fausses alarmes.` };
}

export function renderStimulus(item) {
  return `<p class="mem-intro">${esc(item.prompt)}</p>`;
}

export function renderOption() {
  return '';
}

function streamRow(values, targets, responses, n, label) {
  const t = new Set(targets), r = new Set(responses || []);
  let html = `<div class="mem-row"><span class="mem-lab">${esc(label)}</span>`;
  values.forEach((v, i) => {
    const cls = ['mem-cell'];
    if (t.has(i) && r.has(i)) cls.push('hit');
    else if (t.has(i)) cls.push('miss');
    else if (r.has(i)) cls.push('fa');
    if (i < n) cls.push('warm');
    html += `<span class="${cls.join(' ')}" title="étape ${i + 1}">${esc(v)}</span>`;
  });
  return html + '</div>';
}

export function renderExplanation(item) {
  const d = item.data;
  let vis = '';
  if (d.kind === 'span') {
    vis = `<div class="mem-row"><span class="mem-lab">Présenté</span>${d.digits.map((x) => `<span class="mem-cell">${x}</span>`).join('')}</div><div class="mem-row"><span class="mem-lab">Attendu</span>${item.answer.split('').map((x) => `<span class="mem-cell hit">${x}</span>`).join('')}</div>`;
  } else {
    const POS = ['↖', '↑', '↗', '←', '•', '→', '↙', '↓', '↘'];
    const resp = item.response || (d.kind === 'dual' ? { pos: [], let: [] } : []);
    if (d.kind === 'nback') vis = streamRow(d.positions.map((p) => POS[p]), d.targets, resp, d.n, 'Position');
    else {
      vis = streamRow(d.positions.map((p) => POS[p]), d.targetsPos, resp.pos, d.n, 'Position');
      vis += streamRow(d.letters, d.targetsLet, resp.let, d.n, 'Lettre');
    }
    vis += '<p class="muted small"><span class="mem-cell hit">✓</span> cible détectée · <span class="mem-cell miss">!</span> cible oubliée · <span class="mem-cell fa">×</span> fausse alarme</p>';
  }
  let html = `<div class="exp-visual">${vis}</div><ol class="rule-list">`;
  for (const r of item.rules) html += `<li><strong>${esc(r.title)}</strong> — ${esc(r.text)}</li>`;
  return html + '</ol>';
}

export default { id: 'memory', generate, score, renderStimulus, renderOption, renderExplanation };
