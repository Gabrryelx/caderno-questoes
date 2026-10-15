// Importador: JSON estruturado OU texto com delimitadores. Funções puras.
import { cleanTags } from './tags.js';

const TYPE_ALIASES = {
  abcde: 'abcde', 'a-e': 'abcde', classica: 'abcde', 'clássica': 'abcde',
  abcd: 'abcd', 'a-d': 'abcd', padrao: 'abcd', 'padrão': 'abcd',
  ce: 'ce', cebraspe: 'ce', 'certo-errado': 'ce', certoerrado: 'ce',
  num: 'num', numerica: 'num', 'numérica': 'num',
};
const s = (v) => String(v ?? '').trim();

export function normalizeQuestion(raw, ctx = {}, idx = 0) {
  const fail = (message) => ({ error: { index: idx + 1, message: `Questão ${idx + 1}${raw.n ? ` (item ${raw.n})` : ''}: ${message}` } });
  const statement = s(raw.statement ?? raw.enunciado);
  if (!statement) return fail('enunciado vazio');

  let options = (raw.options ?? raw.alternativas ?? []).map((o) => s(typeof o === 'string' ? o : o.text ?? o.texto).replace(/^[A-Ea-e][).]\s+/, ''));
  let answer = s(raw.answer ?? raw.gabarito).toUpperCase();
  const annulled = raw.annulled === true || /^(true|sim|x)$/i.test(s(raw.annulled ?? raw.anulada)) || answer === 'X';
  let type = TYPE_ALIASES[s(raw.type ?? raw.tipo).toLowerCase()];

  if (!type) {
    if (options.length === 5) type = 'abcde';
    else if (options.length === 4) type = 'abcd';
    else if (['C', 'E', 'CERTO', 'ERRADO'].includes(answer)) type = 'ce';
    else if (/^-?\d+([.,]\d+)?$/.test(answer)) type = 'num';
    else if (annulled) type = 'ce';
    else return fail('não foi possível identificar o tipo (informe "type")');
  }

  if (type === 'ce') {
    options = [];
    if (answer === 'CERTO') answer = 'C';
    if (answer === 'ERRADO') answer = 'E';
    if (!annulled && !['C', 'E'].includes(answer)) return fail('gabarito deve ser C ou E');
  } else if (type === 'num') {
    options = [];
    if (!annulled) {
      const n = Number(answer.replace(',', '.'));
      if (answer === '' || !Number.isFinite(n)) return fail('gabarito numérico inválido');
      answer = String(n);
    }
  } else {
    const letters = 'ABCDE'.slice(0, type === 'abcde' ? 5 : 4);
    if (options.length !== letters.length) return fail(`tipo ${type} exige ${letters.length} alternativas (encontradas ${options.length})`);
    if (options.some((o) => !o)) return fail('há alternativa vazia');
    if (!annulled && !letters.includes(answer)) return fail(`gabarito deve ser uma letra entre ${letters[0]} e ${letters[letters.length - 1]}`);
    options = options.map((text, i) => ({ label: letters[i], text, correct: letters[i] === answer }));
  }
  if (annulled) answer = answer || 'X';

  let source = s(raw.source ?? raw.fonte ?? ctx.source);
  if (raw.n != null && s(raw.n) !== '') source = source ? `${source} · Item ${s(raw.n)}` : `Item ${s(raw.n)}`;

  return {
    question: {
      type, statement, support: s(raw.support ?? raw.contexto ?? ctx.support),
      options, answer, annulled,
      explanation: s(raw.explanation ?? raw.resolucao ?? raw.resolução),
      notes: s(raw.notes),
      tags: cleanTags([...cleanTags(ctx.tags), ...cleanTags(raw.tags)]),
      source,
    },
  };
}

function parseJSON(text) {
  const t = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  let data;
  try { data = JSON.parse(t); } catch (e) { return { questions: [], errors: [{ index: 0, message: 'JSON inválido: ' + e.message }] }; }
  const list = [];
  if (Array.isArray(data)) data.forEach((q) => list.push([q, {}]));
  else {
    (data.questions || []).forEach((q) => list.push([q, { tags: data.tags, source: data.source, support: data.support }]));
    (data.groups || []).forEach((g) => (g.questions || []).forEach((q) =>
      list.push([q, { tags: [...cleanTags(data.tags), ...cleanTags(g.tags)], source: g.source ?? data.source, support: g.support ?? data.support }])));
  }
  return collect(list);
}

function collect(list) {
  const questions = [], errors = [];
  list.forEach(([raw, ctx], i) => {
    const r = normalizeQuestion(raw, ctx, i);
    if (r.error) errors.push(r.error); else questions.push(r.question);
  });
  if (!list.length) errors.push({ index: 0, message: 'nenhuma questão encontrada' });
  return { questions, errors };
}

// ---- Formato texto ----
const FIELD = /^(tipo|fonte|item|tags|texto|enunciado|alternativas|gabarito|resolucao|resolução|anulada):[ \t]*(.*)$/i;

function readFields(lines) {
  const f = {}; let cur = null;
  for (const ln of lines) {
    const m = ln.match(FIELD);
    if (m) { cur = m[1].toLowerCase().replace('ç', 'c').replace('ã', 'a'); f[cur] = m[2]; }
    else if (cur) f[cur] += '\n' + ln;
  }
  for (const k of Object.keys(f)) f[k] = f[k].trim();
  return f;
}

function parseAlts(str) {
  if (!str) return [];
  const out = [];
  for (const ln of str.split('\n')) {
    const m = ln.match(/^\s*([A-Ea-e])[).\]:]\s*(.*)$/);
    if (m) out.push(m[2]); else if (out.length) out[out.length - 1] += '\n' + ln;
  }
  return out.map((x) => x.trim());
}

function parseText(text) {
  const blocks = []; let cur = null;
  for (const ln of text.replace(/\r/g, '').split('\n')) {
    const m = ln.match(/^===\s*(FIM CONTEXTO|CONTEXTO|QUEST[AÃ]O|Q|FIM)\s*===\s*$/i);
    if (m) { if (cur) blocks.push(cur); cur = { kind: m[1].toUpperCase().replace('Ã', 'A'), lines: [] }; }
    else if (cur) cur.lines.push(ln);
  }
  if (cur) blocks.push(cur);

  let ctx = {}; const list = [];
  for (const b of blocks) {
    if (b.kind === 'FIM CONTEXTO') { ctx = {}; continue; }
    if (b.kind === 'FIM') continue;
    const f = readFields(b.lines);
    if (b.kind === 'CONTEXTO') { ctx = { support: f.texto || '', tags: f.tags, source: f.fonte }; continue; }
    list.push([
      { type: f.tipo, statement: f.enunciado, options: parseAlts(f.alternativas), answer: f.gabarito, explanation: f.resolucao, tags: f.tags, source: f.fonte, n: f.item, annulled: f.anulada },
      { ...ctx, source: f.fonte || ctx.source },
    ]);
  }
  if (!list.length) return { questions: [], errors: [{ index: 0, message: 'nenhum bloco "=== Q ===" encontrado' }] };
  return collect(list);
}

export function parseImport(text) {
  const t = String(text || '').trim();
  if (!t) return { questions: [], errors: [{ index: 0, message: 'texto vazio' }] };
  return /^[{[]|^```/.test(t) ? parseJSON(t) : parseText(t);
}
