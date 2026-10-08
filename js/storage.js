// Persistance locale : tout est stocké dans le localStorage du navigateur.
// Toutes les lectures/écritures sont protégées par try/catch (navigation privée,
// stockage désactivé, quota dépassé…) : l'application fonctionne alors en mémoire.

const KEY = 'brainlab.v1';
const VERSION = 1;

function blank() {
  return {
    version: VERSION,
    history: [], // { ts, seed, category, level, correct, timeMs, mode }
    levels: { matrices: 1, sequences: 1, spatial: 1, logic: 1, verbal: 1, memory: 1 },
    settings: { lockLevel: false, examSize: 36, lastCategory: 'matrices' },
  };
}

let memory = null;
let available = true;

export function load() {
  if (memory) return memory;
  memory = blank();
  try {
    const raw = globalThis.localStorage.getItem(KEY);
    if (raw) memory = sanitize(JSON.parse(raw));
  } catch {
    available = false;
  }
  return memory;
}

export function save() {
  try {
    globalThis.localStorage.setItem(KEY, JSON.stringify(memory));
    available = true;
    return true;
  } catch {
    available = false;
    return false;
  }
}

export function isAvailable() {
  return available;
}

export function sanitize(obj) {
  const base = blank();
  if (!obj || typeof obj !== 'object') throw new Error('Format invalide');
  const out = { ...base };
  if (Array.isArray(obj.history)) {
    out.history = obj.history
      .filter((h) => h && typeof h.category === 'string' && Number.isFinite(h.level) && typeof h.correct === 'boolean')
      .map((h) => ({
        ts: Number(h.ts) || 0,
        seed: String(h.seed || ''),
        category: h.category,
        level: Math.min(10, Math.max(1, Math.round(h.level))),
        correct: h.correct,
        timeMs: Math.max(0, Number(h.timeMs) || 0),
        mode: ['training', 'exam', 'replay'].includes(h.mode) ? h.mode : 'training',
      }));
  }
  if (obj.levels && typeof obj.levels === 'object') {
    for (const k of Object.keys(base.levels)) {
      const v = Number(obj.levels[k]);
      if (v >= 1 && v <= 10) out.levels[k] = Math.round(v);
    }
  }
  if (obj.settings && typeof obj.settings === 'object') {
    out.settings = { ...base.settings, ...obj.settings };
    out.settings.lockLevel = Boolean(out.settings.lockLevel);
    if (![30, 36, 40].includes(Number(out.settings.examSize))) out.settings.examSize = 36;
  }
  return out;
}

export function addResult(entry) {
  load().history.push({ ts: Date.now(), ...entry });
  save();
}

export function getLevel(category) {
  return load().levels[category] || 1;
}

export function setLevel(category, level) {
  load().levels[category] = Math.min(10, Math.max(1, level));
  save();
}

export function getSettings() {
  return load().settings;
}

export function setSetting(key, value) {
  load().settings[key] = value;
  save();
}

export function exportJSON() {
  return JSON.stringify({ app: 'BrainLab', exportedAt: new Date().toISOString(), ...load() }, null, 2);
}

export function importJSON(text) {
  const parsed = sanitize(JSON.parse(text));
  memory = parsed;
  save();
  return parsed.history.length;
}

export function clearAll() {
  memory = blank();
  try {
    globalThis.localStorage.removeItem(KEY);
  } catch {
    available = false;
  }
}
