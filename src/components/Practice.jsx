'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { allTags, hasTag } from '@/lib/tags';
import { qStats, priority, isCorrect, scoreSession, fmt, MODE_LABEL, SCORING_LABEL, TYPE_LABEL } from '@/lib/quiz';
import Md from './Md';
import NoteEditor from './NoteEditor';

export default function Practice({ questions, attempts, preset, onFinished }) {
  const [run, setRun] = useState(null);
  if (run) return <Runner run={run} onExit={() => { setRun(null); onFinished(); }} />;
  return <Setup questions={questions} attempts={attempts} preset={preset} onStart={setRun} />;
}

/* ───────────── Configuração da sessão ───────────── */
const Field = ({ label, children }) => <div><label className="label">{label}</label>{children}</div>;

function Setup({ questions, attempts, preset, onStart }) {
  const [mode, setMode] = useState(preset?.mode || 'study');
  const [tags, setTags] = useState([]);
  const [type, setType] = useState('all');
  const [only, setOnly] = useState('all');
  const [count, setCount] = useState(10);
  const [scoring, setScoring] = useState('cebraspe');
  const [timerKind, setTimerKind] = useState('total');
  const [minutes, setMinutes] = useState(30);
  const [perq, setPerq] = useState(120);
  const [shuffle, setShuffle] = useState(true);
  const [busy, setBusy] = useState(false);

  const stats = useMemo(() => qStats(attempts), [attempts]);
  const tagList = useMemo(() => allTags(questions), [questions]);
  const pool = useMemo(() => {
    let p = questions.filter((q) => !q.annulled);
    if (tags.length) p = p.filter((q) => tags.some((t) => hasTag(q, t)));
    if (type !== 'all') p = p.filter((q) => q.type === type);
    if (mode === 'review' || only === 'wrong') p = p.filter((q) => stats.get(q.id)?.w > 0);
    else if (only === 'new') p = p.filter((q) => !stats.get(q.id));
    return p;
  }, [questions, tags, type, mode, only, stats]);

  async function start() {
    const keyed = pool.map((q) => ({ q, k: mode === 'review' ? priority(stats.get(q.id)) + Math.random() * 1.5 : Math.random() }));
    if (mode === 'review') keyed.sort((a, b) => b.k - a.k); else if (shuffle) keyed.sort((a, b) => a.k - b.k);
    const picked = keyed.slice(0, Math.max(1, Number(count) || 1)).map((x) => x.q);
    if (!picked.length) return;
    const timer = mode === 'sim' && timerKind !== 'none' ? { kind: timerKind, total: Number(minutes) * 60, perq: Number(perq) } : { kind: 'none' };
    setBusy(true);
    const { data, error } = await supabase.from('sessions').insert({ mode, scoring, config: { count: picked.length, tags, type, timer } }).select('id').single();
    setBusy(false);
    if (error) return alert(error.message);
    onStart({ sessionId: data.id, mode, scoring, questions: picked, timer });
  }

  return (
    <div className="card space-y-4">
      <h2 className="font-head text-lg font-bold">Nova sessão</h2>
      <div className="grid gap-2 sm:grid-cols-3">
        {Object.entries(MODE_LABEL).map(([k, v]) => (
          <button key={k} onClick={() => setMode(k)} className={`rounded-lg border p-3 text-left ${mode === k ? 'border-ink bg-hl/40' : 'border-line bg-white'}`}>
            <div className="font-semibold">{v}</div>
            <div className="text-xs text-slate-600">{k === 'study' ? 'Feedback imediato após responder.' : k === 'sim' ? 'Cronômetro, gabarito oculto até o envio, marcador de dúvida.' : 'Só questões que você já errou, as mais problemáticas primeiro.'}</div>
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Filtrar por tag (adicione uma ou mais)">
          <select className="input" value="" onChange={(e) => e.target.value && setTags((t) => [...new Set([...t, e.target.value])])}>
            <option value="">+ adicionar tag…</option>{tagList.map(([t, n]) => <option key={t} value={t}>#{t} ({n})</option>)}
          </select>
          <div className="mt-1.5 flex flex-wrap gap-1.5">{tags.map((t) => <span key={t} className="chip">#{t}<button aria-label="remover" onClick={() => setTags((x) => x.filter((y) => y !== t))}>×</button></span>)}</div>
        </Field>
        <Field label="Tipo"><select className="input" value={type} onChange={(e) => setType(e.target.value)}><option value="all">Todos</option>{Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        {mode !== 'review' && <Field label="Origem"><select className="input" value={only} onChange={(e) => setOnly(e.target.value)}><option value="all">Todas</option><option value="new">Nunca feitas</option><option value="wrong">Já errei</option></select></Field>}
        <Field label="Nº de questões"><input className="input" type="number" min={1} value={count} onChange={(e) => setCount(e.target.value)} /></Field>
        <Field label="Regra de pontuação">
          <select className="input" value={scoring} onChange={(e) => setScoring(e.target.value)}>{Object.entries(SCORING_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        </Field>
        {mode !== 'review' && <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" checked={shuffle} onChange={(e) => setShuffle(e.target.checked)} /> Embaralhar</label>}
      </div>

      {mode === 'sim' && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Temporizador"><select className="input" value={timerKind} onChange={(e) => setTimerKind(e.target.value)}><option value="total">Tempo total</option><option value="perq">Limite por questão</option><option value="none">Sem limite</option></select></Field>
          {timerKind === 'total' && <Field label="Minutos"><input className="input" type="number" min={1} value={minutes} onChange={(e) => setMinutes(e.target.value)} /></Field>}
          {timerKind === 'perq' && <Field label="Segundos por questão"><input className="input" type="number" min={10} value={perq} onChange={(e) => setPerq(e.target.value)} /></Field>}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button className="btn btn-primary" onClick={start} disabled={busy || !pool.length}>Começar</button>
        <span className="text-sm text-slate-600">{pool.length} questões disponíveis{mode === 'review' && !pool.length ? ' (você ainda não errou nenhuma 🎉)' : ''}</span>
      </div>
    </div>
  );
}

/* ───────────── Alternativas ───────────── */
function Options({ q, chosen, onChoose, reveal, disabled }) {
  const opts = q.type === 'ce' ? [{ label: 'C', text: 'Certo' }, { label: 'E', text: 'Errado' }] : q.options;
  return (
    <div className="grid gap-2">
      {opts.map((o) => {
        const sel = chosen === o.label;
        const ok = reveal && o.label === q.answer;
        const bad = reveal && sel && !ok;
        return (
          <button key={o.label} disabled={disabled} onClick={() => onChoose(o.label)}
            className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 text-left ${ok ? 'border-ok bg-ok/10' : bad ? 'border-bad bg-bad/10' : sel ? 'border-ink bg-hl/40' : 'border-line bg-white hover:border-ink/50'}`}>
            {q.type !== 'ce' && <span className="w-5 shrink-0 font-bold">{o.label}</span>}
            <span className="min-w-0 flex-1">{q.type === 'ce' ? <b>{o.text}</b> : <Md>{o.text}</Md>}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ───────────── Execução ───────────── */
function Runner({ run, onExit }) {
  const { questions, mode, scoring, timer, sessionId } = run;
  const live = mode !== 'sim';
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [draft, setDraft] = useState({});
  const [flags, setFlags] = useState({});
  const [locked, setLocked] = useState({});
  const [done, setDone] = useState(null);
  const [, setTick] = useState(0);
  const times = useRef({});
  const t0 = useRef(Date.now());
  const startAll = useRef(Date.now());
  const finishing = useRef(false);
  const q = questions[idx];

  const elapsed = () => (Date.now() - startAll.current) / 1000;
  const spentQ = () => (times.current[q.id] || 0) + (Date.now() - t0.current) / 1000;
  const leave = () => { times.current[q.id] = spentQ(); t0.current = Date.now(); };
  const go = (i) => { leave(); setIdx(i); };

  useEffect(() => {
    if (done) return undefined;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [done]);

  // limites de tempo (checados a cada render/segundo)
  useEffect(() => {
    if (done || finishing.current) return;
    if (timer.kind === 'total' && elapsed() >= timer.total) { finish(); return; }
    if (timer.kind === 'perq' && !locked[q.id] && spentQ() >= timer.perq) {
      leave();
      const nl = { ...locked, [q.id]: true };
      setLocked(nl);
      const order = questions.map((_, i) => (idx + 1 + i) % questions.length);
      const next = order.find((i) => !nl[questions[i].id]);
      if (next === undefined) finish(); else setIdx(next);
    }
  });

  async function choose(opt) {
    if (done || locked[q.id]) return;
    if (!live) { setAnswers((a) => ({ ...a, [q.id]: a[q.id] === opt ? null : opt })); return; }
    if (answers[q.id] != null) return;
    const spent = spentQ();
    setAnswers((a) => ({ ...a, [q.id]: opt }));
    setLocked((l) => ({ ...l, [q.id]: true }));
    const { error } = await supabase.from('attempts').insert({ question_id: q.id, session_id: sessionId, chosen: String(opt), is_correct: isCorrect(q, opt), is_blank: false, time_spent_s: Math.round(spent), mode });
    if (error) alert('Não consegui salvar a resposta: ' + error.message);
  }

  async function finish() {
    if (finishing.current) return;
    finishing.current = true;
    leave();
    const shown = live ? questions.filter((x) => answers[x.id] != null && answers[x.id] !== '') : questions;
    const items = shown.map((x) => ({ id: x.id, type: x.type, chosen: answers[x.id], correct: isCorrect(x, answers[x.id]) }));
    const sc = scoreSession(items, scoring);
    if (!live) {
      const rows = questions.map((x) => {
        const a = answers[x.id];
        const blank = a == null || a === '';
        return { question_id: x.id, session_id: sessionId, chosen: blank ? null : String(a), is_correct: !blank && isCorrect(x, a), is_blank: blank, time_spent_s: Math.round(times.current[x.id] || 0), flagged: !!flags[x.id], mode };
      });
      const { error } = await supabase.from('attempts').insert(rows);
      if (error) alert('Erro ao salvar o simulado: ' + error.message);
    }
    await supabase.from('sessions').update({ finished_at: new Date().toISOString(), duration_s: Math.round(elapsed()), score_raw: sc.raw, score_net: sc.net, pct: sc.pct, counts: { hits: sc.hits, errors: sc.errors, blanks: sc.blanks, total: sc.total } }).eq('id', sessionId);
    setDone({ sc, shown });
  }

  function askFinish() {
    const blanks = questions.filter((x) => answers[x.id] == null || answers[x.id] === '').length;
    const fl = Object.values(flags).filter(Boolean).length;
    const msg = live ? 'Encerrar a sessão agora?' : `Enviar o simulado? ${blanks} em branco${fl ? `, ${fl} marcadas para revisar` : ''}. Depois do envio não dá para alterar.`;
    if (confirm(msg)) finish();
  }

  if (done) return <Results {...done} run={run} answers={answers} flags={flags} times={times.current} elapsed={elapsed()} onExit={onExit} />;

  const chosen = answers[q.id];
  const answered = chosen != null && chosen !== '';
  const reveal = live && answered;
  const total = timer.kind === 'total' ? timer.total - elapsed() : null;
  const perqLeft = timer.kind === 'perq' ? timer.perq - spentQ() : null;

  return (
    <div className="space-y-3">
      <div className="card flex flex-wrap items-center gap-3">
        <b className="font-head">Questão {idx + 1}/{questions.length}</b>
        <span className="chip">{MODE_LABEL[mode]}</span>
        {total != null && <span className={`font-mono text-sm ${total < 60 ? 'font-bold text-bad' : ''}`}>⏱ {fmt(total)}</span>}
        {perqLeft != null && <span className={`font-mono text-sm ${perqLeft < 15 ? 'font-bold text-bad' : ''}`}>⏱ {fmt(perqLeft)} nesta questão</span>}
        {timer.kind === 'none' && <span className="font-mono text-sm text-slate-500">{fmt(elapsed())}</span>}
        <span className="flex-1" />
        <button className="btn" onClick={() => setFlags((f) => ({ ...f, [q.id]: !f[q.id] }))}>{flags[q.id] ? '🚩 Dúvida marcada' : '⚐ Marcar dúvida'}</button>
        <button className="btn" onClick={askFinish}>{live ? 'Encerrar' : 'Enviar simulado'}</button>
      </div>

      {!live && (
        <div className="card flex flex-wrap gap-1.5">
          {questions.map((x, i) => {
            const a = answers[x.id] != null && answers[x.id] !== '';
            return <button key={x.id} onClick={() => go(i)} aria-label={`ir para ${i + 1}`}
              className={`h-8 w-8 rounded-md border text-xs font-semibold ${i === idx ? 'ring-2 ring-ink' : ''} ${flags[x.id] ? 'border-hl bg-hl' : a ? 'border-ink bg-ink text-white' : 'border-line bg-white'}`}>{i + 1}</button>;
          })}
        </div>
      )}

      <article className="card space-y-3">
        {q.source && <span className="chip bg-hl/50 font-semibold">{q.source}</span>}
        {q.support && <div className="rounded-lg bg-slate-50 p-3 text-sm"><Md serif>{q.support}</Md></div>}
        <Md serif>{q.statement}</Md>

        {q.type === 'num' ? (
          <div className="flex max-w-sm items-center gap-2">
            <input className="input" inputMode="decimal" placeholder="Sua resposta" disabled={locked[q.id] || reveal}
              value={live ? (answered ? chosen : draft[q.id] ?? '') : chosen ?? ''}
              onChange={(e) => (live ? setDraft((d) => ({ ...d, [q.id]: e.target.value })) : setAnswers((a) => ({ ...a, [q.id]: e.target.value })))} />
            {live && !answered && <button className="btn btn-primary" onClick={() => (draft[q.id] ?? '').trim() && choose(draft[q.id].trim())}>Responder</button>}
          </div>
        ) : (
          <Options q={q} chosen={chosen} onChoose={choose} reveal={reveal} disabled={!!locked[q.id] || reveal} />
        )}
        {locked[q.id] && !live && <p className="text-xs text-bad">Tempo desta questão esgotado.</p>}

        {reveal && (
          <div className="space-y-2">
            <p className={`font-semibold ${isCorrect(q, chosen) ? 'text-ok' : 'text-bad'}`}>
              {isCorrect(q, chosen) ? '✔ Correto!' : `✖ Incorreto. Gabarito: ${q.type === 'ce' ? (q.answer === 'C' ? 'Certo' : 'Errado') : q.answer}`}
            </p>
            {q.explanation && <div className="rounded-lg bg-slate-50 p-3"><Md>{q.explanation}</Md></div>}
            <details open={!isCorrect(q, chosen)}><summary className="cursor-pointer text-sm font-semibold">Caderno de erros</summary><NoteEditor q={q} /></details>
          </div>
        )}
      </article>

      <div className="flex justify-between">
        <button className="btn" disabled={idx === 0} onClick={() => go(idx - 1)}>← Anterior</button>
        {idx < questions.length - 1
          ? <button className="btn btn-primary" onClick={() => go(idx + 1)}>Próxima →</button>
          : <button className="btn btn-primary" onClick={askFinish}>{live ? 'Finalizar' : 'Enviar simulado'}</button>}
      </div>
    </div>
  );
}

/* ───────────── Resultado ───────────── */
function Results({ sc, shown, run, answers, flags, times, elapsed, onExit }) {
  const { scoring, mode } = run;
  const Box = ({ l, v, tone }) => <div className="card"><div className="text-xs font-semibold text-slate-500">{l}</div><div className={`font-head text-2xl font-bold ${tone || ''}`}>{v}</div></div>;
  return (
    <div className="space-y-3">
      <div className="card">
        <h2 className="font-head text-xl font-bold">Resultado — {MODE_LABEL[mode]}</h2>
        <p className="text-sm text-slate-600">Regra: {SCORING_LABEL[scoring]} · tempo {fmt(elapsed)}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {scoring === 'cebraspe' && <><Box l="Pontuação líquida" v={sc.net} /><Box l="Pontuação bruta" v={sc.raw} /></>}
        {scoring === 'enem' && <Box l="Acertos" v={`${sc.raw}/${sc.total}`} />}
        {scoring === 'pct' && <Box l="Taxa de acerto" v={`${sc.pct.toFixed(1)}%`} />}
        <Box l="Certas" v={sc.hits} tone="text-ok" /><Box l="Erradas" v={sc.errors} tone="text-bad" /><Box l="Em branco" v={sc.blanks} />
        {scoring !== 'pct' && <Box l="Acerto" v={`${sc.pct.toFixed(0)}%`} />}
      </div>
      {scoring === 'cebraspe' && <p className="text-xs text-slate-500">Cebraspe: certa +1, errada −1 (somente itens Certo/Errado), em branco 0. Itens de múltipla escolha ou numéricos não têm desconto.</p>}
      <div className="space-y-2">
        {shown.map((x, i) => {
          const a = answers[x.id];
          const blank = a == null || a === '';
          const ok = isCorrect(x, a);
          return (
            <details key={x.id} className="card" open={!ok && !blank}>
              <summary className="cursor-pointer text-sm">
                <b className={blank ? 'text-slate-500' : ok ? 'text-ok' : 'text-bad'}>{blank ? '— branco' : ok ? '✔ certa' : '✖ errada'}</b>
                <span className="ml-2">{x.source || `Questão ${i + 1}`}</span>
                {flags[x.id] && <span className="ml-2">🚩</span>}
                <span className="ml-2 text-xs text-slate-500">{fmt(times[x.id])}</span>
              </summary>
              <div className="mt-3 space-y-2">
                {x.support && <div className="rounded-lg bg-slate-50 p-3 text-sm"><Md serif>{x.support}</Md></div>}
                <Md serif>{x.statement}</Md>
                {x.type === 'num' ? <p className="text-sm">Sua resposta: <b>{blank ? '—' : a}</b> · Gabarito: <b className="text-ok">{x.answer}</b></p>
                  : <Options q={x} chosen={a} reveal disabled onChoose={() => {}} />}
                {x.explanation && <div className="rounded-lg bg-slate-50 p-3"><Md>{x.explanation}</Md></div>}
                {!ok && <NoteEditor q={x} />}
              </div>
            </details>
          );
        })}
      </div>
      <button className="btn btn-primary" onClick={onExit}>Concluir</button>
    </div>
  );
}
