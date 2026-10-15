'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export const REASONS = ['falta de atenção', 'conteúdo novo', 'erro de cálculo', 'interpretação', 'chute', 'esqueci a fórmula/macete', 'tempo'];

// Caderno de erros: motivos + anotação livre (macetes), editável a qualquer momento.
export default function NoteEditor({ q, onSaved }) {
  const [notes, setNotes] = useState(q.notes || '');
  const [rs, setRs] = useState(q.error_reasons || []);
  const [state, setState] = useState('');
  const toggle = (r) => setRs((x) => (x.includes(r) ? x.filter((y) => y !== r) : [...x, r]));

  async function save() {
    setState('salvando…');
    const { error } = await supabase.from('questions').update({ notes, error_reasons: rs, updated_at: new Date().toISOString() }).eq('id', q.id);
    setState(error ? 'erro: ' + error.message : 'salvo ✓');
    if (!error) onSaved?.();
  }

  return (
    <div className="mt-2 space-y-2 rounded-lg bg-slate-50 p-3">
      <div className="flex flex-wrap gap-1.5">
        {REASONS.map((r) => (
          <button key={r} type="button" onClick={() => toggle(r)}
            className={`chip border ${rs.includes(r) ? 'border-ink bg-hl/50 font-semibold' : 'border-transparent'}`}>{r}</button>
        ))}
      </div>
      <textarea className="input" rows={3} placeholder="Anotações, macetes, por que errei…" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <div className="flex items-center gap-3">
        <button type="button" className="btn" onClick={save}>Salvar anotação</button>
        <span className="text-xs text-slate-500">{state}</span>
      </div>
    </div>
  );
}
