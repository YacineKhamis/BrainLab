// BrainLab — navigation, modes (entraînement, examen, rejouer), interface.

import { CATEGORIES, generateItem, generateFromSeed } from './engine.js';
import { GENERATORS } from './generators/index.js';
import { parseSeed } from './rng.js';
import * as store from './storage.js';
import { table, maxStableLevel, progressionCharts, STABLE_WINDOW } from './stats.js';
import { esc } from './util.js';

const $ = (sel, root = document) => root.querySelector(sel);
const main = $('#main');
const catById = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

// Tâche en cours (minuteries de mémoire, chrono d'examen) à annuler en changeant de page.
let cleanups = [];
function onLeave(fn) { cleanups.push(fn); }
function leave() { cleanups.forEach((f) => { try { f(); } catch { /* rien */ } }); cleanups = []; }

let keyHandler = null;
document.addEventListener('keydown', (e) => {
  if (keyHandler && !e.target.closest('input, select, textarea')) keyHandler(e);
});

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { t.hidden = true; }, 2600);
}

function fmtTime(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// ---------------------------------------------------------------- Rendu d'un item

function itemHeader(item, extra = '') {
  return `<div class="item-head">
    <span class="badge cat-${item.category}">${esc(catById[item.category].short)}</span>
    <span class="badge">${esc(item.subtype)}</span>
    <span class="badge level">Niveau ${item.level}</span>
    <button class="seed" type="button" data-seed="${esc(item.seed)}" title="Copier la graine pour rejouer cet item">graine : <code>${esc(item.seed)}</code></button>
    ${extra}
  </div>`;
}

function bindSeedCopy(root) {
  root.querySelectorAll('button.seed').forEach((b) => b.addEventListener('click', async () => {
    const seed = b.dataset.seed;
    try {
      await navigator.clipboard.writeText(seed);
      toast(`Graine ${seed} copiée`);
    } catch {
      toast(`Graine : ${seed}`);
    }
  }));
}

function optionsHtml(item) {
  const gen = GENERATORS[item.category];
  const cls = ['matrices', 'spatial'].includes(item.category) ? 'options visual' : item.category === 'logic' ? 'options list' : 'options textual';
  return `<div class="${cls}" role="group" aria-label="Réponses possibles">${item.options.map((_, i) => `
    <button class="opt" type="button" data-i="${i}"><span class="opt-num">${i + 1}</span>${gen.renderOption(item, i)}</button>`).join('')}</div>`;
}

function explanationHtml(item, chosen, scoreDetail = '') {
  const gen = GENERATORS[item.category];
  let html = '<section class="explain"><h3>Explication détaillée</h3>';
  if (scoreDetail) html += `<p class="score-detail">${esc(scoreDetail)}</p>`;
  html += gen.renderExplanation(item);
  const notes = item.validation && item.validation.notes;
  if (item.options && notes && notes.length) {
    html += '<h4>Analyse de chaque option</h4><ul class="opt-notes">';
    notes.forEach((n, i) => {
      const cls = i === item.answer ? 'good' : i === chosen ? 'bad' : '';
      html += `<li class="${cls}"><span class="opt-num">${i + 1}</span> ${i === item.answer ? '✓ ' : ''}${esc(n)}</li>`;
    });
    html += '</ul>';
  }
  html += `<p class="muted small">Item validé par le solveur (réponse unique)${item.attempt ? ` après ${item.attempt} régénération${item.attempt > 1 ? 's' : ''}` : ''}.</p>`;
  return `${html}</section>`;
}

// Affiche un item à choix multiple ; onAnswer(index | null, timeMs)
function mountChoice(root, item, onAnswer) {
  const gen = GENERATORS[item.category];
  root.innerHTML = `${itemHeader(item)}
    <p class="prompt">${esc(item.prompt)}</p>
    <div class="stimulus">${gen.renderStimulus(item)}</div>
    ${optionsHtml(item)}`;
  bindSeedCopy(root);
  const t0 = performance.now();
  let done = false;
  const answer = (i) => {
    if (done) return;
    done = true;
    keyHandler = null;
    onAnswer(i, performance.now() - t0);
  };
  root.querySelectorAll('.opt').forEach((b) => b.addEventListener('click', () => answer(Number(b.dataset.i))));
  keyHandler = (e) => {
    const n = Number(e.key);
    if (n >= 1 && n <= item.options.length) answer(n - 1);
  };
  return { answer, isDone: () => done };
}

function markOptions(root, item, chosen) {
  root.querySelectorAll('.opt').forEach((b) => {
    const i = Number(b.dataset.i);
    b.disabled = true;
    if (i === item.answer) b.classList.add('correct');
    else if (i === chosen) b.classList.add('wrong');
  });
}

// ---------------------------------------------------------------- Mémoire (interactif)

function mountMemory(root, item, onDone) {
  const gen = GENERATORS.memory;
  const d = item.data;
  root.innerHTML = `${itemHeader(item)}
    <p class="prompt">${esc(item.prompt)}</p>
    <div class="mem-stage"><button class="btn primary" type="button" id="mem-start">Commencer</button></div>`;
  bindSeedCopy(root);
  const stage = $('.mem-stage', root);
  const timers = [];
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  onLeave(() => timers.forEach(clearTimeout));
  let finished = false;
  const t0 = performance.now();
  const finish = (response) => {
    if (finished) return;
    finished = true;
    keyHandler = null;
    timers.forEach(clearTimeout);
    item.response = response;
    const sc = gen.score(item, response);
    onDone(sc, performance.now() - t0, response);
  };

  const start = () => {
    if (d.kind === 'span') {
      stage.innerHTML = '<div class="span-digit" aria-live="assertive"></div>';
      const box = $('.span-digit', stage);
      d.digits.forEach((dg, i) => {
        later(() => { box.textContent = dg; }, i * d.interval);
        later(() => { box.textContent = ''; }, i * d.interval + d.interval * 0.8);
      });
      later(() => {
        stage.innerHTML = `<form class="span-form"><label>Chiffres dans l’ordre inverse :
          <input id="span-in" inputmode="numeric" autocomplete="off" pattern="[0-9 ]*"></label>
          <button class="btn primary" type="submit">Valider</button></form>`;
        const input = $('#span-in', stage);
        input.focus();
        $('form', stage).addEventListener('submit', (e) => { e.preventDefault(); finish(input.value); });
      }, d.digits.length * d.interval + 300);
      return;
    }
    const dual = d.kind === 'dual';
    stage.innerHTML = `<div class="nb-wrap">
      <div class="nb-grid">${Array.from({ length: 9 }, (_, i) => `<div class="nb-cell" data-c="${i}"></div>`).join('')}</div>
      <div class="nb-info"><span class="nb-step">Étape 0 / ${d.positions.length}</span></div>
      <div class="nb-buttons">${dual
        ? '<button class="btn" type="button" data-ch="pos">Position (A)</button><button class="btn" type="button" data-ch="let">Lettre (L)</button>'
        : '<button class="btn" type="button" data-ch="pos">Correspondance (Espace)</button>'}</div>
    </div>`;
    const cells = [...stage.querySelectorAll('.nb-cell')];
    const stepEl = $('.nb-step', stage);
    const resp = { pos: [], let: [] };
    let step = -1;
    const press = (ch) => {
      if (step < 0 || resp[ch].includes(step)) return;
      resp[ch].push(step);
      const b = stage.querySelector(`[data-ch="${ch}"]`);
      b.classList.add('pressed');
      later(() => b.classList.remove('pressed'), 200);
    };
    stage.querySelectorAll('[data-ch]').forEach((b) => b.addEventListener('click', () => press(b.dataset.ch)));
    keyHandler = (e) => {
      const k = e.key.toLowerCase();
      if (!dual && (k === ' ' || k === 'j')) { e.preventDefault(); press('pos'); }
      if (dual && k === 'a') press('pos');
      if (dual && k === 'l') press('let');
    };
    d.positions.forEach((p, i) => {
      later(() => {
        step = i;
        stepEl.textContent = `Étape ${i + 1} / ${d.positions.length}`;
        cells.forEach((c) => { c.classList.remove('on'); c.textContent = ''; });
        cells[p].classList.add('on');
        if (dual) cells[p].textContent = d.letters[i];
      }, i * d.interval);
      later(() => { cells[p].classList.remove('on'); cells[p].textContent = ''; }, i * d.interval + d.interval * 0.55);
    });
    later(() => finish(dual ? resp : resp.pos), d.positions.length * d.interval + 200);
  };
  $('#mem-start', root).addEventListener('click', start);
  return { abort: () => finish(d.kind === 'span' ? '' : d.kind === 'dual' ? { pos: [], let: [] } : []) };
}

// ---------------------------------------------------------------- Accueil

function viewHome() {
  const s = store.load();
  main.innerHTML = `
  <section class="hero">
    <h1>BrainLab</h1>
    <p class="lead">Entraînement au raisonnement fluide, visuo-spatial, verbal et à la mémoire de travail. Tous les items sont générés à partir d’une graine, puis validés par un solveur qui garantit une réponse unique.</p>
    <div class="hero-actions">
      <a class="btn primary" href="#/train">S’entraîner</a>
      <a class="btn" href="#/exam">Passer un examen</a>
      <a class="btn" href="#/replay">Rejouer une graine</a>
    </div>
  </section>
  <section class="cards">
    ${CATEGORIES.map((c) => {
      const stable = maxStableLevel(s.history, c.id);
      return `<a class="card cat-${c.id}" href="#/train/${c.id}">
        <h2>${esc(c.name)}</h2>
        <p>Niveau actuel : <strong>${s.levels[c.id]}</strong> / 10</p>
        <p class="muted">Niveau stable : ${stable ?? '—'}</p>
      </a>`;
    }).join('')}
  </section>
  <section class="info">
    <h2>Échelle de difficulté</h2>
    <ul>
      <li><strong>Niveaux 1 à 4</strong> : comparables aux tests en ligne grand public.</li>
      <li><strong>Niveaux 5 à 7</strong> : au-delà du test en ligne de Mensa — trois règles combinées, distracteurs plausibles qui ne violent qu’une seule règle.</li>
      <li><strong>Niveaux 8 à 10</strong> : volontairement surhumains — 4 à 6 règles simultanées, règles qui changent selon la ligne ou la colonne, bruit visuel, matrices 4×4, n-back ≥ 5, chrono serré.</li>
    </ul>
    ${store.isAvailable() ? '' : '<p class="warn">Le stockage local est indisponible : vos résultats ne seront pas conservés après fermeture de la page.</p>'}
  </section>`;
}

// ---------------------------------------------------------------- Entraînement

function viewTrain(param) {
  const settings = store.getSettings();
  let category = param && (catById[param] || param === 'mixed') ? param : settings.lastCategory || 'matrices';
  main.innerHTML = `
  <section class="toolbar">
    <label>Catégorie
      <select id="t-cat">
        ${CATEGORIES.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}
        <option value="mixed">Mixte (toutes catégories)</option>
      </select>
    </label>
    <label>Niveau
      <select id="t-level">${Array.from({ length: 10 }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join('')}</select>
    </label>
    <label class="check"><input type="checkbox" id="t-lock"> Verrouiller le niveau</label>
    <span class="muted small">Sans chrono · succès → niveau +1, échec → niveau −1</span>
  </section>
  <article class="item" id="t-item"></article>
  <div id="t-after"></div>`;
  const selCat = $('#t-cat'), selLevel = $('#t-level'), lock = $('#t-lock');
  selCat.value = category;
  lock.checked = settings.lockLevel;
  const itemEl = $('#t-item'), after = $('#t-after');
  let current = null;

  const pickCat = () => (category === 'mixed' ? CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)].id : category);
  const syncLevel = () => {
    selLevel.value = String(store.getLevel(category === 'mixed' ? (current ? current.category : 'matrices') : category));
    selLevel.disabled = category === 'mixed';
  };

  const next = () => {
    leave();
    after.innerHTML = '';
    const cat = pickCat();
    const level = store.getLevel(cat);
    try {
      current = generateItem(cat, level);
    } catch (e) {
      itemEl.innerHTML = `<p class="warn">${esc(e.message)}</p>`;
      return;
    }
    syncLevel();
    if (current.interactive) {
      mountMemory(itemEl, current, (sc, ms) => finish(sc.correct, null, ms, sc.detail));
    } else {
      mountChoice(itemEl, current, (i, ms) => finish(i === current.answer, i, ms));
    }
  };

  const finish = (correct, chosen, ms, detail = '') => {
    const item = current;
    if (!item.interactive) markOptions(itemEl, item, chosen);
    store.addResult({ seed: item.seed, category: item.category, level: item.level, correct, timeMs: Math.round(ms), mode: 'training' });
    let msg;
    if (!store.getSettings().lockLevel) {
      const nl = Math.min(10, Math.max(1, item.level + (correct ? 1 : -1)));
      store.setLevel(item.category, nl);
      msg = nl === item.level ? `Niveau ${nl} conservé.` : `Niveau suivant : ${nl}.`;
    } else msg = `Niveau verrouillé à ${item.level}.`;
    after.innerHTML = `
      <div class="feedback ${correct ? 'ok' : 'ko'}" role="status">
        <strong>${correct ? 'Bonne réponse' : 'Réponse incorrecte'}</strong>
        <span>${esc(msg)} · ${fmtTime(ms)}</span>
        <button class="btn primary" type="button" id="t-next">Item suivant →</button>
      </div>
      ${explanationHtml(item, chosen, detail)}`;
    syncLevel();
    $('#t-next').addEventListener('click', next);
    keyHandler = (e) => { if (e.key === 'Enter' || e.key === 'n') next(); };
    $('#t-next').focus({ preventScroll: true });
  };

  selCat.addEventListener('change', () => {
    category = selCat.value;
    store.setSetting('lastCategory', category);
    current = null;
    next();
  });
  selLevel.addEventListener('change', () => {
    const cat = category === 'mixed' ? null : category;
    if (cat) store.setLevel(cat, Number(selLevel.value));
    next();
  });
  lock.addEventListener('change', () => store.setSetting('lockLevel', lock.checked));
  next();
}

// ---------------------------------------------------------------- Examen

function buildExam(size) {
  const items = [];
  let order = [];
  for (let i = 0; i < size; i++) {
    if (!order.length) order = CATEGORIES.map((c) => c.id).sort(() => Math.random() - 0.5);
    const cat = order.pop();
    const level = Math.min(10, 1 + Math.floor((i * 10) / size));
    items.push(generateItem(cat, level));
  }
  return items;
}

function viewExam() {
  const settings = store.getSettings();
  main.innerHTML = `
  <section class="panel">
    <h1>Examen</h1>
    <p>Une série d’items de difficulté croissante (du niveau 1 au niveau 10), toutes catégories confondues. Un chrono global tourne ; aucun retour n’est donné avant la fin, puis une correction complète est affichée.</p>
    <label>Nombre d’items
      <select id="x-size">${[30, 36, 40].map((n) => `<option value="${n}"${n === settings.examSize ? ' selected' : ''}>${n}</option>`).join('')}</select>
    </label>
    <p><button class="btn primary" type="button" id="x-start">Démarrer l’examen</button></p>
  </section>`;
  $('#x-start').addEventListener('click', () => {
    const size = Number($('#x-size').value);
    store.setSetting('examSize', size);
    main.innerHTML = '<p class="muted">Génération et validation des items…</p>';
    setTimeout(() => runExam(buildExam(size)), 20);
  });
}

function runExam(items) {
  const total = items.reduce((s, it) => s + it.timeLimit, 0) * 1000;
  const answers = items.map(() => ({ chosen: null, correct: false, timeMs: 0, detail: '', answered: false }));
  let idx = 0;
  const t0 = performance.now();
  main.innerHTML = `
  <section class="exam-bar">
    <span id="x-count"></span>
    <progress id="x-progress" max="${items.length}" value="0"></progress>
    <span class="timer" id="x-timer" aria-live="off"></span>
    <button class="btn small" type="button" id="x-skip">Passer</button>
    <button class="btn small" type="button" id="x-stop">Terminer</button>
  </section>
  <article class="item" id="x-item"></article>`;
  const itemEl = $('#x-item');
  let memCtl = null;
  let ended = false;
  const tick = () => {
    const left = total - (performance.now() - t0);
    $('#x-timer').textContent = `⏱ ${fmtTime(left)}`;
    $('#x-timer').classList.toggle('urgent', left < 60000);
    if (left <= 0) end();
  };
  const timer = setInterval(tick, 500);
  onLeave(() => clearInterval(timer));
  tick();

  const show = () => {
    if (idx >= items.length) { end(); return; }
    $('#x-count').textContent = `Item ${idx + 1} / ${items.length}`;
    $('#x-progress').value = idx;
    const item = items[idx];
    const record = (correct, chosen, ms, detail = '') => {
      answers[idx] = { chosen, correct, timeMs: ms, detail, answered: true };
      idx++;
      show();
    };
    if (item.interactive) memCtl = mountMemory(itemEl, item, (sc, ms) => record(sc.correct, null, ms, sc.detail));
    else { memCtl = null; mountChoice(itemEl, item, (i, ms) => record(i === item.answer, i, ms)); }
  };
  const end = () => {
    if (ended) return;
    ended = true;
    clearInterval(timer);
    keyHandler = null;
    leave();
    items.forEach((it, i) => {
      if (it.interactive && !answers[i].answered && it.response === undefined) it.response = it.data.kind === 'dual' ? { pos: [], let: [] } : [];
      store.addResult({ seed: it.seed, category: it.category, level: it.level, correct: answers[i].correct, timeMs: Math.round(answers[i].timeMs), mode: 'exam' });
    });
    showExamResults(items, answers, performance.now() - t0);
  };
  $('#x-skip').addEventListener('click', () => {
    if (memCtl) { memCtl.abort(); return; }
    answers[idx] = { chosen: null, correct: false, timeMs: 0, detail: 'Item passé.', answered: true };
    idx++;
    show();
  });
  $('#x-stop').addEventListener('click', () => { if (confirm('Terminer l’examen maintenant ? Les items restants seront comptés comme non réussis.')) end(); });
  show();
}

function showExamResults(items, answers, elapsed) {
  const ok = answers.filter((a) => a.correct).length;
  const perCat = CATEGORIES.map((c) => {
    const idxs = items.map((it, i) => (it.category === c.id ? i : -1)).filter((i) => i >= 0);
    return { c, n: idxs.length, ok: idxs.filter((i) => answers[i].correct).length };
  });
  const bands = [[1, 4], [5, 7], [8, 10]].map(([a, b]) => {
    const idxs = items.map((it, i) => (it.level >= a && it.level <= b ? i : -1)).filter((i) => i >= 0);
    return { a, b, n: idxs.length, ok: idxs.filter((i) => answers[i].correct).length };
  });
  main.innerHTML = `
  <section class="panel">
    <h1>Correction de l’examen</h1>
    <p class="big">${ok} / ${items.length} items réussis · durée ${fmtTime(elapsed)}</p>
    <div class="table-wrap"><table class="data">
      <thead><tr><th>Catégorie</th><th>Réussis</th></tr></thead>
      <tbody>${perCat.map((p) => `<tr><td>${esc(p.c.name)}</td><td>${p.ok} / ${p.n}</td></tr>`).join('')}</tbody>
    </table>
    <table class="data">
      <thead><tr><th>Niveaux</th><th>Réussis</th></tr></thead>
      <tbody>${bands.map((b) => `<tr><td>${b.a}–${b.b}</td><td>${b.ok} / ${b.n}</td></tr>`).join('')}</tbody>
    </table></div>
    <p><a class="btn" href="#/exam">Nouvel examen</a> <a class="btn" href="#/stats">Statistiques</a></p>
  </section>
  <section class="correction">${items.map((it, i) => {
    const a = answers[i];
    const gen = GENERATORS[it.category];
    return `<details class="corr ${a.correct ? 'ok' : 'ko'}">
      <summary><span class="mark">${a.correct ? '✓' : '✗'}</span> Item ${i + 1} — ${esc(catById[it.category].short)}, niveau ${it.level}${a.answered ? '' : ' (non traité)'}</summary>
      <div class="item">${itemHeader(it)}<p class="prompt">${esc(it.prompt)}</p>
        <div class="stimulus">${gen.renderStimulus(it)}</div>
        ${it.options ? optionsHtml(it) : ''}
        ${explanationHtml(it, a.chosen, a.detail)}
      </div>
    </details>`;
  }).join('')}</section>`;
  main.querySelectorAll('details.corr').forEach((det, i) => {
    const it = items[i];
    if (it.options) markOptions(det, it, answers[i].chosen);
  });
  bindSeedCopy(main);
}

// ---------------------------------------------------------------- Rejouer

function viewReplay(seedParam) {
  main.innerHTML = `
  <section class="panel">
    <h1>Rejouer une graine</h1>
    <p>Chaque item affiche sa graine (par exemple <code>MAT-07-3fa9c21b</code>). La saisir ici régénère exactement le même item.</p>
    <form id="r-form" class="inline-form">
      <input id="r-seed" placeholder="MAT-07-3fa9c21b" autocomplete="off" spellcheck="false" aria-label="Graine">
      <button class="btn primary" type="submit">Rejouer</button>
    </form>
    <p class="muted small">Codes : MAT (matrices), SEQ (suites), SPA (visuo-spatial), LOG (logique), VER (analogies), MEM (mémoire). Les items rejoués n’entrent pas dans les statistiques.</p>
  </section>
  <article class="item" id="r-item"></article>
  <div id="r-after"></div>`;
  const input = $('#r-seed');
  const play = (seed) => {
    leave();
    const p = parseSeed(seed);
    const itemEl = $('#r-item'), after = $('#r-after');
    after.innerHTML = '';
    if (!p) { itemEl.innerHTML = '<p class="warn">Graine invalide. Format attendu : CODE-NIVEAU-HEXADÉCIMAL, par exemple SEQ-05-0a1b2c3d.</p>'; return; }
    let item;
    try { item = generateFromSeed(seed); } catch (e) { itemEl.innerHTML = `<p class="warn">${esc(e.message)}</p>`; return; }
    const done = (correct, chosen, ms, detail = '') => {
      if (!item.interactive) markOptions(itemEl, item, chosen);
      store.addResult({ seed: item.seed, category: item.category, level: item.level, correct, timeMs: Math.round(ms), mode: 'replay' });
      after.innerHTML = `<div class="feedback ${correct ? 'ok' : 'ko'}" role="status"><strong>${correct ? 'Bonne réponse' : 'Réponse incorrecte'}</strong><span>${fmtTime(ms)}</span><button class="btn" type="button" id="r-again">Rejouer encore</button></div>${explanationHtml(item, chosen, detail)}`;
      $('#r-again').addEventListener('click', () => play(item.seed));
    };
    if (item.interactive) mountMemory(itemEl, item, (sc, ms) => done(sc.correct, null, ms, sc.detail));
    else mountChoice(itemEl, item, (i, ms) => done(i === item.answer, i, ms));
  };
  $('#r-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = input.value.trim();
    if (location.hash !== `#/replay/${encodeURIComponent(v)}`) history.replaceState(null, '', `#/replay/${encodeURIComponent(v)}`);
    play(v);
  });
  if (seedParam) { input.value = seedParam; play(seedParam); }
}

// ---------------------------------------------------------------- Statistiques et données

function viewStats() {
  const s = store.load();
  const tb = table(s.history);
  const played = s.history.filter((h) => h.mode !== 'replay').length;
  const pct = (o) => (o && o.n ? `${Math.round((100 * o.ok) / o.n)} %` : '—');
  const charts = progressionCharts(s.history, CATEGORIES);
  main.innerHTML = `
  <section class="panel">
    <h1>Statistiques</h1>
    <p>${played} item${played > 1 ? 's' : ''} joué${played > 1 ? 's' : ''} (entraînement et examen). Niveau maximal stable : niveau le plus élevé où au moins 70 % des ${STABLE_WINDOW} derniers items de ce niveau sont réussis.</p>
    <div class="table-wrap"><table class="data">
      <thead><tr><th>Catégorie</th><th>Items</th><th>Réussite</th><th>Temps moyen</th><th>Niveau actuel</th><th>Niveau stable</th></tr></thead>
      <tbody>${CATEGORIES.map((c) => {
        const o = tb[c.id];
        return `<tr><td>${esc(c.name)}</td><td>${o ? o.n : 0}</td><td>${pct(o)}</td><td>${o && o.n ? fmtTime(o.time / o.n) : '—'}</td><td>${s.levels[c.id]}</td><td>${maxStableLevel(s.history, c.id) ?? '—'}</td></tr>`;
      }).join('')}</tbody>
    </table></div>
    <h2>Réussite par catégorie et par niveau</h2>
    <div class="table-wrap"><table class="data levels">
      <thead><tr><th>Catégorie</th>${Array.from({ length: 10 }, (_, i) => `<th>N${i + 1}</th>`).join('')}</tr></thead>
      <tbody>${CATEGORIES.map((c) => `<tr><td>${esc(c.short)}</td>${Array.from({ length: 10 }, (_, i) => {
        const o = tb[c.id] && tb[c.id].levels[i + 1];
        const r = o && o.n ? o.ok / o.n : null;
        const band = r === null ? '' : r >= 0.7 ? 'r-hi' : r >= 0.4 ? 'r-mid' : 'r-lo';
        return `<td class="${band}" title="${o ? `${o.ok}/${o.n} réussis, temps moyen ${fmtTime(o.time / o.n)}` : 'aucun item'}">${o ? `${pct(o)}<small>${o.n}</small>` : '·'}</td>`;
      }).join('')}</tr>`).join('')}</tbody>
    </table></div>
    <h2>Progression</h2>
    ${played ? `${charts.legend}<figure><figcaption>Niveau joué au fil des items</figcaption>${charts.levels}</figure>
    <figure><figcaption>Taux de réussite glissant (20 derniers items)</figcaption>${charts.rates}</figure>` : '<p class="muted">Jouez quelques items pour voir vos courbes.</p>'}
  </section>
  <section class="panel">
    <h2>Données</h2>
    <p>Vos données (historique, niveaux, réglages) restent dans ce navigateur (localStorage). Aucune donnée n’est envoyée nulle part.</p>
    <div class="data-actions">
      <button class="btn" type="button" id="d-export">Exporter JSON</button>
      <label class="btn" for="d-import">Importer JSON</label>
      <input type="file" id="d-import" accept="application/json,.json" hidden>
      <button class="btn danger" type="button" id="d-clear">Tout effacer</button>
    </div>
  </section>`;
  $('#d-export').addEventListener('click', () => {
    const blob = new Blob([store.exportJSON()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `brainlab-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  $('#d-import').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        if (!confirm('Remplacer les données actuelles par celles du fichier ?')) return;
        const n = store.importJSON(String(reader.result));
        toast(`${n} résultats importés`);
        viewStats();
      } catch (err) {
        toast(`Import impossible : ${err.message}`);
      }
    };
    reader.readAsText(file);
  });
  $('#d-clear').addEventListener('click', () => {
    if (!confirm('Effacer définitivement tout l’historique, les niveaux et les réglages ?')) return;
    store.clearAll();
    toast('Toutes les données ont été effacées');
    viewStats();
  });
}

// ---------------------------------------------------------------- Routeur

function route() {
  leave();
  keyHandler = null;
  const parts = location.hash.replace(/^#\/?/, '').split('/');
  const page = parts[0] || '';
  const arg = parts[1] ? decodeURIComponent(parts[1]) : null;
  document.querySelectorAll('.nav a').forEach((a) => a.classList.toggle('active', a.dataset.page === (page || 'home')));
  window.scrollTo(0, 0);
  if (page === 'train') viewTrain(arg);
  else if (page === 'exam') viewExam();
  else if (page === 'replay') viewReplay(arg);
  else if (page === 'stats') viewStats();
  else viewHome();
  main.focus({ preventScroll: true });
}

window.addEventListener('hashchange', route);
store.load();
route();
