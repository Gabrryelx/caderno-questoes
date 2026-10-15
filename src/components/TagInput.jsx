'use client';
import { useState } from 'react';
import { normTag } from '@/lib/tags';

export default function TagInput({ value, onChange, suggestions = [] }) {
  const [txt, setTxt] = useState('');
  const add = () => {
    const t = normTag(txt);
    if (t && !value.includes(t)) onChange([...value, t]);
    setTxt('');
  };
  return (
    <div>
      <div className="mb-1.5 flex flex-wrap gap-1.5">
        {value.map((t) => (
          <span key={t} className="chip">#{t}
            <button type="button" aria-label={`remover ${t}`} onClick={() => onChange(value.filter((x) => x !== t))}>×</button>
          </span>
        ))}
      </div>
      <input className="input" list="tag-suggestions" placeholder="#disciplina/assunto  (Enter para adicionar)" value={txt}
        onChange={(e) => setTxt(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); } }}
        onBlur={add} />
      <datalist id="tag-suggestions">{suggestions.map((t) => <option key={t} value={t} />)}</datalist>
    </div>
  );
}
