// Petits utilitaires partagés (échappement HTML, SVG).

export function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function fmt(n) {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 1000) / 1000);
}

export function svg(w, h, body, cls = '', label = '') {
  const aria = label ? ` role="img" aria-label="${esc(label)}"` : ' aria-hidden="true"';
  return `<svg class="${cls}" viewBox="0 0 ${fmt(w)} ${fmt(h)}" width="${fmt(w)}" height="${fmt(h)}"${aria} xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
}

export function polygonPoints(cx, cy, r, sides, startAngleDeg = -90) {
  const pts = [];
  for (let i = 0; i < sides; i++) {
    const a = ((startAngleDeg + (360 * i) / sides) * Math.PI) / 180;
    pts.push(`${fmt(cx + r * Math.cos(a))},${fmt(cy + r * Math.sin(a))}`);
  }
  return pts.join(' ');
}

export function signed(n) {
  return n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '0';
}

export function plural(n, word, pluralWord = `${word}s`) {
  return Math.abs(n) > 1 ? pluralWord : word;
}

// Clé canonique pour comparer des objets simples.
export function keyOf(obj) {
  return JSON.stringify(obj);
}
