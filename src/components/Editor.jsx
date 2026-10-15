'use client';
import { useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { TYPE_LABEL } from '@/lib/quiz';
import { allTags } from '@/lib/tags';
import MdField from './MdField';
import TagInput from './TagInput';
import { REASONS } from './NoteEditor';

const nOpts = (type) => (type === 'abcde' ? 5 : type === 'abcd' ? 4 : 0);
const blank = () => ({ type: 'abcde', support: '', statement: '', options: Array(5).fill(''), answer: '', annulled: false, explanation: '', notes: '', error_reasons: [], tags: [], source: '' });

export default function Editor({ q, questions, onClose, onSaved }) {
  const [f, setF] = useState(() => (q ? { ...blank(), ...q, options: (q.options || []).map((o) => o.text) } : blank()));
  const [busy, setBusy] = useState(false);
  const suggestions = useMemo(() => allTags(questions).map(([t]) => t), [questions]);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));

  function setType(type) {
    const n = nOpts(type);
    setF((x) => ({ ...x, type, answer: '', options: Array.from({ length: n }, (_, i) => x.options[i] || '') }));
  }

  async function save() {
    const letters = 'ABCDE';
    if (!f.statement.trim()) return alert('Escreva o enunciado.');
    if (!f.annulled && !f.answer.toString().trim()) return alert('Defina o gabarito.');
    if (nOpts(f.type) && f.options.some((o) => !o.trim())) return alert('Preencha todas as alternativas.');
    if (f.type === 'num' && !f.annulled && !Number.isFinite(Number(String(f.answer).replace(',', '.')))) return alert('Gabarito numérico inválido.');
    const answer = f.type === 'num' ? String(Number(String(f.answer).replace(',', '.'))) : f.answer;
    const options = f.options.map((text, i) => ({ label: letters[i], text, correct: letters[i] === answer }));
    const payload = {
      type: f.type, support: f.support, statement: f.statement.trim(), options, answer: f.annulled && !answer ? 'X' : answer,
      annulled: f.annulled, explanation: f.explanation, notes: f.notes, error_reasons: f.error_reasons, tags: f.tags, source: f.source,
      updated_at: new Date().toISOString(),
    };
    setBusy(true);
    const { error } = q?.id ? await supabase.from('questions').update(payload).eq('id', q.id) : await supabase.from('questions').insert(payload);
    setBusy(false);
    if (error) return alert(error.message);
    onSaved();
  }

  const letters = 'ABCDE';
  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-head text-lg font-bold">{q?.id ? 'Editar questão' : 'Nova questão'}</h2>
        <button className="btn" onClick={onClose}>Fechar</button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="label">Tipo</label>
          <select className="input" value={f.type} onChange={(e) => setType(e.target.value)}>
            {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select></div>
        <div><label className="label">Fonte</label><input className="input" value={f.source} onChange={(e) => set('source', e.target.value)} placeholder="PAS 3 2024 · Item 41" /></div>
      </div>
      <MdField label="Texto-base / contexto (opcional)" value={f.support} onChange={(v) => set('support', v)} rows={4} />
      <MdField label="Enunciado" value={f.statement} onChange={(v) => set('statement', v)} rows={5} />

      {nOpts(f.type) > 0 && (
        <div className="space-y-2">
          <label className="label">Alternativas (marque a correta)</label>
          {f.options.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <input type="radio" name="correct" checked={f.answer === letters[i]} onChange={() => set('answer', letters[i])} aria-label={`correta ${letters[i]}`} />
              <span className="w-5 font-semibold">{letters[i]}</span>
              <input className="input" value={o} onChange={(e) => set('options', f.options.map((x, j) => (j === i ? e.target.value : x)))} />
            </div>
          ))}
        </div>
      )}
      {f.type === 'ce' && (
        <div className="flex gap-4 text-sm">
          {[['C', 'Certo'], ['E', 'Errado']].map(([k, v]) => (
            <label key={k} className="flex items-center gap-1.5"><input type="radio" name="ce" checked={f.answer === k} onChange={() => set('answer', k)} />{v}</label>
          ))}
        </div>
      )}
      {f.type === 'num' && (
        <div className="max-w-xs"><label className="label">Resposta numérica correta</label><input className="input" value={f.answer} onChange={(e) => set('answer', e.target.value)} /></div>
      )}
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.annulled} onChange={(e) => set('annulled', e.target.checked)} /> Item anulado (fica fora de simulados e estatísticas)</label>

      <MdField label="Gabarito comentado / resolução" value={f.explanation} onChange={(v) => set('explanation', v)} rows={4} />
      <div><label className="label">Tags</label><TagInput value={f.tags} onChange={(v) => set('tags', v)} suggestions={suggestions} /></div>

      <div className="space-y-2 rounded-lg bg-slate-50 p-3">
        <label className="label !mb-0">Caderno de erros</label>
        <div className="flex flex-wrap gap-1.5">
          {REASONS.map((r) => (
            <button key={r} type="button" className={`chip border ${f.error_reasons.includes(r) ? 'border-ink bg-hl/50 font-semibold' : 'border-transparent'}`}
              onClick={() => set('error_reasons', f.error_reasons.includes(r) ? f.error_reasons.filter((x) => x !== r) : [...f.error_reasons, r])}>{r}</button>
          ))}
        </div>
        <MdField label="Anotações pessoais / macetes" value={f.notes} onChange={(v) => set('notes', v)} rows={3} />
      </div>
      <div className="flex gap-2"><button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? 'Salvando…' : 'Salvar'}</button><button className="btn" onClick={onClose}>Cancelar</button></div>
    </div>
  );
}
