'use client';
import { useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { allTags, hasTag, normTag } from '@/lib/tags';
import { qStats, TYPE_LABEL } from '@/lib/quiz';
import { plain } from '@/lib/data';
import Md from './Md';
import Editor from './Editor';

export default function Bank({ questions, attempts, reload }) {
  const [search, setSearch] = useState('');
  const [tag, setTag] = useState('');
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [limit, setLimit] = useState(30);
  const [editing, setEditing] = useState(null); // null | 'new' | question
  const [showTags, setShowTags] = useState(false);
  const [open, setOpen] = useState(null);

  const stats = useMemo(() => qStats(attempts), [attempts]);
  const tags = useMemo(() => allTags(questions), [questions]);
  const list = useMemo(() => {
    const t = search.trim().toLowerCase();
    return questions.filter((q) => {
      if (tag && !hasTag(q, tag)) return false;
      if (type && q.type !== type) return false;
      const s = stats.get(q.id);
      if (status === 'new' && s) return false;
      if (status === 'wrong' && !(s?.w > 0)) return false;
      if (status === 'annulled' && !q.annulled) return false;
      if (t && !(`${q.statement} ${q.support} ${q.source} ${q.tags.join(' ')}`.toLowerCase().includes(t))) return false;
      return true;
    });
  }, [questions, search, tag, type, status, stats]);

  async function remove(q) {
    if (!confirm('Excluir esta questão e o histórico dela?')) return;
    const { error } = await supabase.from('questions').delete().eq('id', q.id);
    if (error) alert(error.message); else reload();
  }

  async function retag(old, fn) {
    const affected = questions.filter((q) => hasTag(q, old));
    for (const q of affected) {
      const tags2 = [...new Set(fn(q.tags))];
      const { error } = await supabase.from('questions').update({ tags: tags2, updated_at: new Date().toISOString() }).eq('id', q.id);
      if (error) { alert(error.message); break; }
    }
    reload();
  }
  const renameTag = (old) => {
    const n = normTag(prompt(`Renomear "${old}" (e subtags) para:`, old) || '');
    if (n && n !== old) retag(old, (ts) => ts.map((t) => (t === old ? n : t.startsWith(old + '/') ? n + t.slice(old.length) : t)));
  };
  const deleteTag = (old) => {
    if (confirm(`Remover a tag "${old}" (e subtags) de todas as questões?`)) retag(old, (ts) => ts.filter((t) => !(t === old || t.startsWith(old + '/'))));
  };

  if (editing) return <Editor q={editing === 'new' ? null : editing} questions={questions} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />;

  return (
    <div className="space-y-3">
      <div className="card grid gap-2 sm:grid-cols-5">
        <input className="input sm:col-span-2" placeholder="Buscar texto, fonte ou tag…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="input" value={tag} onChange={(e) => setTag(e.target.value)}>
          <option value="">Todas as tags</option>{tags.map(([t, n]) => <option key={t} value={t}>#{t} ({n})</option>)}
        </select>
        <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">Todos os tipos</option>{Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Qualquer status</option><option value="new">Nunca feitas</option><option value="wrong">Já errei</option><option value="annulled">Anuladas</option>
        </select>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-600">{list.length} questões</span>
        <div className="flex gap-2"><button className="btn" onClick={() => setShowTags((s) => !s)}>Gerenciar tags</button><button className="btn btn-primary" onClick={() => setEditing('new')}>+ Nova questão</button></div>
      </div>

      {showTags && (
        <div className="card">
          <h3 className="mb-2 font-head font-bold">Tags</h3>
          <ul className="grid gap-1 sm:grid-cols-2">
            {tags.map(([t, n]) => (
              <li key={t} className="flex items-center justify-between gap-2 text-sm" style={{ paddingLeft: (t.split('/').length - 1) * 14 }}>
                <span>#{t} <span className="text-slate-500">({n})</span></span>
                <span className="flex gap-2 text-xs"><button className="underline" onClick={() => renameTag(t)}>renomear</button><button className="text-bad underline" onClick={() => deleteTag(t)}>remover</button></span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {list.slice(0, limit).map((q) => {
        const s = stats.get(q.id);
        const isOpen = open === q.id;
        return (
          <article key={q.id} className="card">
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {q.source && <span className="chip bg-hl/50 font-semibold">{q.source}</span>}
              <span className="chip">{TYPE_LABEL[q.type]}</span>
              {q.annulled && <span className="chip bg-slate-300">anulada</span>}
              {s && <span className="chip">✔ {s.r} · ✖ {s.w}</span>}
              {q.tags.map((t) => <span key={t} className="chip">#{t}</span>)}
            </div>
            <button className="mt-2 block w-full text-left text-sm" onClick={() => setOpen(isOpen ? null : q.id)}>
              {isOpen ? <div><Md>{q.support}</Md><Md serif>{q.statement}</Md>
                {q.options.map((o) => <p key={o.label} className={`text-sm ${o.correct ? 'font-semibold text-ok' : ''}`}>{o.label}) {o.text}</p>)}
                {(q.type === 'ce' || q.type === 'num') && <p className="text-sm font-semibold text-ok">Gabarito: {q.answer}</p>}
                {q.explanation && <div className="mt-2 rounded bg-slate-50 p-2"><Md>{q.explanation}</Md></div>}
                {q.notes && <div className="mt-2 rounded bg-hl/20 p-2"><b>Anotações:</b><Md>{q.notes}</Md></div>}
              </div> : <span className="line-clamp-2 text-slate-700">{plain(q.statement)}</span>}
            </button>
            <div className="mt-2 flex gap-2"><button className="btn" onClick={() => setEditing(q)}>Editar</button><button className="btn btn-danger" onClick={() => remove(q)}>Excluir</button></div>
          </article>
        );
      })}
      {list.length > limit && <button className="btn w-full" onClick={() => setLimit((l) => l + 30)}>Mostrar mais</button>}
    </div>
  );
}
