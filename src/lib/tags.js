// Tags hierárquicas: "fisica/eletrodinamica". Funções puras.
export const normTag = (t) =>
  String(t ?? '').trim().replace(/^#+/, '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9/_-]+/g, '-')
    .replace(/-*\/-*/g, '/').replace(/\/+/g, '/').replace(/^[-/]+|[-/]+$/g, '');

export const splitTags = (v) => (Array.isArray(v) ? v : String(v || '').split(/[,;\n]+|\s+/));
export const cleanTags = (v) => [...new Set(splitTags(v).map(normTag).filter(Boolean))];

// "a/b/c" -> ["a","a/b","a/b/c"]
export const expandTag = (t) => { const p = t.split('/'); return p.map((_, i) => p.slice(0, i + 1).join('/')); };

// Filtrar por "fisica" inclui "fisica/eletrodinamica"
export const hasTag = (q, tag) => (q.tags || []).some((t) => t === tag || t.startsWith(tag + '/'));

export function allTags(questions) {
  const m = new Map();
  for (const q of questions) for (const t of new Set((q.tags || []).flatMap(expandTag))) m.set(t, (m.get(t) || 0) + 1);
  return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}
