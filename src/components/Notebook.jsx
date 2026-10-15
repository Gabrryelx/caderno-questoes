'use client';
import { useMemo, useState } from 'react';
import { qStats, priority } from '@/lib/quiz';
import { allTags, hasTag } from '@/lib/tags';
import Md from './Md';
import NoteEditor, { REASONS } from './NoteEditor';

export default function Notebook({ questions, attempts, reload, onReview }) {
  const [tag, setTag] = useState('');
  const [reason, setReason] = useState('');
  const stats = useMemo(() => qStats(attempts), [attempts]);
  const tags = useMemo(() => allTags(questions), [questions]);

  const list = useMemo(() => questions
    .filter((q) => (stats.get(q.id)?.w > 0 || q.notes || q.error_reasons?.length) && !q.annulled)
    .filter((q) => !tag || hasTag(q, tag))
    .filter((q) => !reason || q.error_reasons?.includes(reason))
    .sort((a, b) => priority(stats.get(b.id)) - priority(stats.get(a.id))),
  [questions, stats, tag, reason]);

  return (
    <div className="space-y-3">
      <div className="card flex flex-wrap items-center gap-2">
        <select className="input !w-auto" value={tag} onChange={(e) => setTag(e.target.value)}><option value="">Todas as tags</option>{tags.map(([t]) => <option key={t} value={t}>#{t}</option>)}</select>
        <select className="input !w-auto" value={reason} onChange={(e) => setReason(e.target.value)}><option value="">Qualquer motivo</option>{REASONS.map((r) => <option key={r}>{r}</option>)}</select>
        <span className="flex-1 text-sm text-slate-600">{list.length} no caderno · ordenado por prioridade de revisão</span>
        <button className="btn btn-primary" onClick={onReview}>Revisar meus erros</button>
      </div>
      {list.length === 0 && <div className="card text-sm">Nada aqui ainda. Questões erradas e as que você anotar aparecem neste caderno.</div>}
      {list.map((q) => {
        const s = stats.get(q.id);
        return (
          <details key={q.id} className="card">
            <summary className="cursor-pointer text-sm">
              <span className="chip mr-2 bg-hl/50 font-semibold">{q.source || 'sem fonte'}</span>
              {s ? <span className="chip mr-2">✖ {s.w} · ✔ {s.r}{s.streak ? ` · ${s.streak} seguidas` : ''}</span> : null}
              {q.error_reasons?.map((r) => <span key={r} className="chip mr-1">{r}</span>)}
              {q.tags.map((t) => <span key={t} className="chip mr-1">#{t}</span>)}
            </summary>
            <div className="mt-3">
              <Md>{q.support}</Md><Md serif>{q.statement}</Md>
              {q.options.map((o) => <p key={o.label} className={`text-sm ${o.correct ? 'font-semibold text-ok' : ''}`}>{o.label}) {o.text}</p>)}
              {(q.type === 'ce' || q.type === 'num') && <p className="text-sm font-semibold text-ok">Gabarito: {q.answer}</p>}
              {q.explanation && <div className="mt-2 rounded bg-slate-50 p-2"><Md>{q.explanation}</Md></div>}
              <NoteEditor q={q} onSaved={reload} />
            </div>
          </details>
        );
      })}
    </div>
  );
}
