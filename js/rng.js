// Générateur pseudo-aléatoire à graine, reproductible.
// Hachage de chaîne : cyrb53 réduit à 32 bits ; générateur : mulberry32.

export const CATEGORY_CODES = {
  matrices: 'MAT',
  sequences: 'SEQ',
  spatial: 'SPA',
  logic: 'LOG',
  verbal: 'VER',
  memory: 'MEM',
};

const CODE_TO_CATEGORY = Object.fromEntries(
  Object.entries(CATEGORY_CODES).map(([k, v]) => [v, k]),
);

export function hashString(str) {
  let h1 = 0xdeadbeef ^ str.length;
  let h2 = 0x41c6ce57 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h1 ^ h2) >>> 0;
}

export class Rng {
  constructor(seed) {
    this.state = typeof seed === 'number' ? seed >>> 0 : hashString(String(seed));
  }

  // Flottant uniforme dans [0, 1).
  next() {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // Entier uniforme dans [min, max] (bornes incluses).
  int(min, max) {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  chance(p) {
    return this.next() < p;
  }

  pick(arr) {
    if (!arr.length) throw new Error('pick: tableau vide');
    return arr[Math.floor(this.next() * arr.length)];
  }

  shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  sample(arr, k) {
    return this.shuffle(arr).slice(0, k);
  }

  // Choix pondéré : items = [[valeur, poids], ...]
  weighted(items) {
    const total = items.reduce((s, [, w]) => s + w, 0);
    let r = this.next() * total;
    for (const [v, w] of items) {
      r -= w;
      if (r < 0) return v;
    }
    return items[items.length - 1][0];
  }
}

export function randomHex() {
  const buf = new Uint32Array(1);
  try {
    globalThis.crypto.getRandomValues(buf);
  } catch {
    buf[0] = Math.floor(Math.random() * 4294967296);
  }
  return buf[0].toString(16).padStart(8, '0');
}

export function formatSeed(category, level, hex) {
  const code = CATEGORY_CODES[category];
  if (!code) throw new Error(`Catégorie inconnue : ${category}`);
  return `${code}-${String(level).padStart(2, '0')}-${hex.toLowerCase()}`;
}

// Accepte « MAT-07-3fa9c21b » (casse et espaces indifférents).
export function parseSeed(str) {
  const m = String(str).trim().toUpperCase().match(/^([A-Z]{3})-(\d{1,2})-([0-9A-F]{1,8})$/);
  if (!m) return null;
  const category = CODE_TO_CATEGORY[m[1]];
  const level = Number(m[2]);
  if (!category || level < 1 || level > 10) return null;
  return { category, level, hex: m[3].toLowerCase().padStart(8, '0') };
}
