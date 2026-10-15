'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { parseImport } from '@/lib/parser';
import { METAPROMPT } from '@/lib/metaprompt';

const key = (q) => `${q.source}|${q.statement}`.trim().toLowerCase();
const EXEMPLO_TEXTO = `=== CONTEXTO ===
fonte: PAS 3 2024
tags: #prova/pas3-2024, #fisica/eletrodinamica
texto: Um circuito tem bateria de 10 V e resistor de 40 Ω em série com um capacitor.
=== Q ===
item: 102
tipo: num
enunciado: Calcule a corrente máxima, em mA.
gabarito: 250
resolucao: $I = V/R = 10/40 = 0{,}25\\,A$
=== Q ===
item: 101
tipo: ce
enunciado: No equilíbrio, o capacitor fica com 10 V.
gabarito: C
=== FIM CONTEXTO ===`;

export default function Importer({ questions, onImported }) {
  const [text, setText] = useState('');
  const [res, setRes] = useState(null);
  const [skipDup, setSkipDup] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function loadSeed() {
    const r = await fetch('/seed/pas3-2024.json');
    setText(await r.text()); setRes(null); setMsg('Questões iniciais carregadas. Clique em Validar e depois em Importar.');
  }

  async function run() {
    const r = parseImport(text);
    setRes(r);
    if (!r.questions.length) return;
    const seen = new Set(questions.map(key));
    const list = skipDup ? r.questions.filter((q) => !seen.has(key(q))) : r.questions;
    setBusy(true);
    try {
      for (let i = 0; i < list.length; i += 100) {
        const { error } = await supabase.from('questions').insert(list.slice(i, i + 100));
        if (error) throw error;
      }
      setMsg(`${list.length} questões importadas (${r.questions.length - list.length} duplicadas ignoradas; ${r.errors.length} com erro).`);
      if (!r.errors.length) { setText(''); setRes(null); }
      onImported();
    } catch (e) { setMsg('Erro ao importar: ' + e.message); }
    setBusy(false);
  }

  return (
    <div className="space-y-3">
      <div className="card space-y-2">
        <h2 className="font-head text-lg font-bold">Importação em massa</h2>
        <p className="text-sm text-slate-600">Cole JSON estruturado ou o formato de texto com <code>=== Q ===</code>. Use o metaprompt abaixo para que uma IA converta qualquer prova para o formato certo.</p>
        <div className="flex flex-wrap gap-2">
          <button className="btn" onClick={loadSeed}>Carregar questões iniciais (PAS 3 2024)</button>
          <button className="btn" onClick={() => { setText(EXEMPLO_TEXTO); setRes(null); }}>Exemplo em texto</button>
        </div>
        <textarea className="input h-72 font-mono text-xs" value={text} onChange={(e) => { setText(e.target.value); setRes(null); }} placeholder='{"groups":[{"source":"PAS 3 2024","tags":["prova/pas3-2024"],"support":"","questions":[ ... ]}]}' />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={skipDup} onChange={(e) => setSkipDup(e.target.checked)} /> Ignorar questões já existentes (mesma fonte + enunciado)</label>
        <div className="flex gap-2">
          <button className="btn" onClick={() => setRes(parseImport(text))}>Validar</button>
          <button className="btn btn-primary" onClick={run} disabled={busy || !text.trim()}>{busy ? 'Importando…' : 'Importar'}</button>
        </div>
        {msg && <p className="text-sm font-semibold">{msg}</p>}
        {res && (
          <div className="text-sm">
            <p className="font-semibold text-ok">{res.questions.length} questões válidas</p>
            {res.errors.length > 0 && <ul className="mt-1 list-disc pl-5 text-bad">{res.errors.slice(0, 30).map((e, i) => <li key={i}>{e.message}</li>)}</ul>}
          </div>
        )}
      </div>
      <details className="card">
        <summary className="cursor-pointer font-semibold">Metaprompt para a IA (copiar e colar junto com a prova)</summary>
        <button className="btn my-2" onClick={() => navigator.clipboard.writeText(METAPROMPT)}>Copiar metaprompt</button>
        <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded bg-slate-50 p-3 text-xs">{METAPROMPT}</pre>
      </details>
    </div>
  );
}
