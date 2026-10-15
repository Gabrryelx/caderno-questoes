// Pontuação, estatísticas e prioridade de revisão. Funções puras.
import { expandTag } from './tags.js';

export const MODE_LABEL = { study: 'Estudo', sim: 'Simulado', review: 'Revisão de erros' };
export const SCORING_LABEL = { cebraspe: 'Cebraspe (C/E)', enem: 'ENEM (acertos)', pct: 'Percentual' };
export const TYPE_LABEL = { abcde: 'Múltipla escolha A–E', abcd: 'Múltipla escolha A–D', ce: 'Certo/Errado', num: 'Resposta numérica' };

export function fmt(s) {
  s = Math.max(0, Math.round(s || 0));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(x).padStart(2, '0');
}

export function isCorrect(q, chosen) {
  if (chosen == null || chosen === '') return false;
  if (q.type === 'num') {
    const a = Number(String(chosen).replace(',', '.'));
    return Number.isFinite(a) && Math.abs(a - Number(q.answer)) < 1e-9;
  }
  return chosen === q.answer;
}

// items: [{type, chosen, correct}]
// Cebraspe: certa +1, errada -1 (só em itens Certo/Errado), branco 0.
// ENEM/percentual: líquida = acertos.
export function scoreSession(items, scoring) {
  let hits = 0, errors = 0, blanks = 0, penalty = 0;
  for (const it of items) {
    if (it.chosen == null || it.chosen === '') { blanks++; continue; }
    if (it.correct) hits++;
    else { errors++; if (it.type === 'ce') penalty++; }
  }
  const total = items.length;
  return { hits, errors, blanks, total, raw: hits, net: scoring === 'cebraspe' ? hits - penalty : hits, pct: total ? (hits / total) * 100 : 0 };
}

// attempts -> estatística por questão (em ordem cronológica)
export function qStats(attempts) {
  const m = new Map();
  const sorted = [...attempts].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  for (const a of sorted) {
    let s = m.get(a.question_id);
    if (!s) { s = { n: 0, w: 0, r: 0, b: 0, streak: 0, last: 0 }; m.set(a.question_id, s); }
    s.n++; s.last = new Date(a.created_at).getTime();
    if (a.is_blank) { s.b++; s.streak = 0; }
    else if (a.is_correct) { s.r++; s.streak++; }
    else { s.w++; s.streak = 0; }
  }
  return m;
}

// Quanto maior, mais urgente revisar: mais erros, menos acertos seguidos, mais tempo sem ver.
export function priority(s) {
  if (!s) return 0;
  const days = Math.min((Date.now() - s.last) / 864e5, 30);
  return s.w * 2 - s.r * 0.5 - s.streak * 1.5 + days / 10 + (s.streak === 0 ? 3 : 0);
}

export function tagStats(attempts, qById) {
  const m = new Map();
  for (const a of attempts) {
    const q = qById.get(a.question_id);
    if (!q) continue;
    for (const t of new Set((q.tags || []).flatMap(expandTag))) {
      const s = m.get(t) || { tag: t, n: 0, hits: 0, errors: 0, blanks: 0 };
      s.n++;
      if (a.is_blank) s.blanks++; else if (a.is_correct) s.hits++; else s.errors++;
      m.set(t, s);
    }
  }
  return [...m.values()].map((s) => ({ ...s, pct: s.n ? (s.hits / s.n) * 100 : 0 }));
}
