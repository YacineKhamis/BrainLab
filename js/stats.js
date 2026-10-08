// Statistiques : taux de réussite par catégorie et par niveau, temps moyen,
// niveau maximal stable, courbes de progression en SVG.

import { esc, svg, fmt } from './util.js';

export const STABLE_WINDOW = 20;
export const STABLE_RATE = 0.7;

const scored = (history) => history.filter((h) => h.mode !== 'replay');

export function table(history) {
  const out = {};
  for (const h of scored(history)) {
    const c = (out[h.category] ||= { n: 0, ok: 0, time: 0, levels: {} });
    c.n++;
    c.ok += h.correct ? 1 : 0;
    c.time += h.timeMs;
    const l = (c.levels[h.level] ||= { n: 0, ok: 0, time: 0 });
    l.n++;
    l.ok += h.correct ? 1 : 0;
    l.time += h.timeMs;
  }
  return out;
}

// Niveau le plus élevé pour lequel les 20 derniers items de ce niveau
// comptent au moins 70 % de réussites.
export function maxStableLevel(history, category) {
  const items = scored(history).filter((h) => h.category === category);
  for (let L = 10; L >= 1; L--) {
    const atL = items.filter((h) => h.level === L);
    if (atL.length < STABLE_WINDOW) continue;
    const last = atL.slice(-STABLE_WINDOW);
    if (last.filter((h) => h.correct).length / STABLE_WINDOW >= STABLE_RATE) return L;
  }
  return null;
}

function seriesFor(history, category) {
  return scored(history).filter((h) => h.category === category);
}

// Graphique en lignes multi-séries ; series = [{ id, label, cls, points: [[x, y, tip]] }]
export function lineChart(series, { yMin, yMax, yTicks, yFmt = (v) => String(v), xLabel, title }) {
  const W = 640, H = 260, L = 44, R = 12, T = 12, B = 34;
  const maxX = Math.max(2, ...series.flatMap((s) => s.points.map((p) => p[0])));
  const sx = (x) => L + ((x - 1) / (maxX - 1)) * (W - L - R);
  const sy = (y) => T + (1 - (y - yMin) / (yMax - yMin)) * (H - T - B);
  let body = '';
  for (const t of yTicks) {
    body += `<line class="grid" x1="${L}" x2="${W - R}" y1="${fmt(sy(t))}" y2="${fmt(sy(t))}"/>`;
    body += `<text class="axis" x="${L - 6}" y="${fmt(sy(t) + 4)}" text-anchor="end">${esc(yFmt(t))}</text>`;
  }
  const xt = [1, Math.round(maxX / 2), maxX].filter((v, i, a) => a.indexOf(v) === i);
  for (const t of xt) body += `<text class="axis" x="${fmt(sx(t))}" y="${H - 14}" text-anchor="middle">${t}</text>`;
  body += `<text class="axis" x="${(L + W - R) / 2}" y="${H - 1}" text-anchor="middle">${esc(xLabel)}</text>`;
  for (const s of series) {
    if (!s.points.length) continue;
    const d = s.points.map((p, i) => `${i ? 'L' : 'M'}${fmt(sx(p[0]))} ${fmt(sy(p[1]))}`).join('');
    body += `<path class="series ${s.cls}" d="${d}"/>`;
    const last = s.points[s.points.length - 1];
    body += `<circle class="series-dot ${s.cls}" cx="${fmt(sx(last[0]))}" cy="${fmt(sy(last[1]))}" r="4"/>`;
    for (const p of s.points) {
      body += `<circle class="hit" cx="${fmt(sx(p[0]))}" cy="${fmt(sy(p[1]))}" r="7"><title>${esc(`${s.label} — ${p[2]}`)}</title></circle>`;
    }
  }
  return svg(W, H, body, 'chart', title);
}

export function progressionCharts(history, categories) {
  const levelSeries = categories.map((c, i) => ({
    id: c.id, label: c.short, cls: `s${i + 1}`,
    points: seriesFor(history, c.id).map((h, k) => [k + 1, h.level, `item ${k + 1} : niveau ${h.level}, ${h.correct ? 'réussi' : 'échoué'}`]),
  }));
  const rateSeries = categories.map((c, i) => {
    const items = seriesFor(history, c.id);
    const pts = [];
    items.forEach((_, k) => {
      if (k + 1 < 5) return;
      const win = items.slice(Math.max(0, k + 1 - STABLE_WINDOW), k + 1);
      const rate = win.filter((h) => h.correct).length / win.length;
      pts.push([k + 1, rate * 100, `item ${k + 1} : ${Math.round(rate * 100)} % sur les ${win.length} derniers`]);
    });
    return { id: c.id, label: c.short, cls: `s${i + 1}`, points: pts };
  });
  const legend = `<div class="legend">${categories.map((c, i) => `<span class="lg"><span class="sw s${i + 1}"></span>${esc(c.short)}</span>`).join('')}</div>`;
  return {
    legend,
    levels: lineChart(levelSeries, { yMin: 1, yMax: 10, yTicks: [1, 4, 7, 10], xLabel: 'items joués (par catégorie)', title: 'Niveau joué au fil des items' }),
    rates: lineChart(rateSeries, { yMin: 0, yMax: 100, yTicks: [0, 50, 70, 100], yFmt: (v) => `${v} %`, xLabel: 'items joués (par catégorie)', title: 'Taux de réussite glissant sur 20 items' }),
  };
}
