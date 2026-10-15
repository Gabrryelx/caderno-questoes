'use client';
import { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';
import { tagStats, fmt, MODE_LABEL, SCORING_LABEL } from '@/lib/quiz';
import { plain } from '@/lib/data';

const Stat = ({ label, value, tone }) => (
  <div className="card">
    <div className="text-xs font-semibold text-slate-500">{label}</div>
    <div className={`font-head text-2xl font-bold ${tone || ''}`}>{value}</div>
  </div>
);

export default function Dashboard({ questions, attempts, sessions }) {
  const qById = useMemo(() => new Map(questions.map((q) => [q.id, q])), [questions]);
  const tot = useMemo(() => {
    let h = 0, e = 0, b = 0, t = 0;
    for (const a of attempts) { if (a.is_blank) b++; else if (a.is_correct) h++; else e++; t += a.time_spent_s || 0; }
    const n = attempts.length;
    return { n, h, e, b, pct: n ? (h / n) * 100 : 0, avg: n ? t / n : 0 };
  }, [attempts]);
  const ts = useMemo(() => tagStats(attempts, qById), [attempts, qById]);
  const disc = useMemo(() => ts.filter((s) => !s.tag.includes('/')).sort((a, b) => a.tag.localeCompare(b.tag)).map((s) => ({ ...s, pct: Math.round(s.pct) })), [ts]);
  const weak = useMemo(() => [...ts].filter((s) => s.n >= 2).sort((a, b) => a.pct - b.pct || b.n - a.n).slice(0, 12), [ts]);
  const lastSessions = useMemo(() => [...sessions].filter((s) => s.finished_at).sort((a, b) => new Date(b.started_at) - new Date(a.started_at)).slice(0, 10), [sessions]);
  const lastAttempts = useMemo(() => [...attempts].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 15), [attempts]);

  if (!questions.length) return <div className="card text-sm">Nenhuma questão ainda. Vá em <b>Importar</b> e carregue as questões iniciais do PAS 3 2024.</div>;

  const color = (p) => (p < 50 ? '#c8372d' : p < 70 ? '#e0a100' : '#1b8a5a');

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Questões no banco" value={questions.length} />
        <Stat label="Resoluções" value={tot.n} />
        <Stat label="Acerto geral" value={`${tot.pct.toFixed(0)}%`} />
        <Stat label="Tempo médio / questão" value={fmt(tot.avg)} />
        <Stat label="Certas" value={tot.h} tone="text-ok" />
        <Stat label="Erradas" value={tot.e} tone="text-bad" />
        <Stat label="Em branco" value={tot.b} />
      </div>

      {disc.length > 0 && (
        <section className="card">
          <h2 className="mb-2 font-head text-lg font-bold">Acerto por disciplina (%)</h2>
          <div style={{ height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={disc} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e8ef" />
                <XAxis dataKey="tag" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v, _n, p) => [`${v}% (${p.payload.hits}/${p.payload.n})`, 'Acerto']} />
                <Bar dataKey="pct">{disc.map((d) => <Cell key={d.tag} fill={color(d.pct)} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      <section className="card">
        <h2 className="mb-2 font-head text-lg font-bold">Tags com menor rendimento <span className="text-xs font-normal text-slate-500">(mín. 2 resoluções)</span></h2>
        {weak.length === 0 ? <p className="text-sm text-slate-500">Resolva mais questões para ver as tags prioritárias.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead><tr className="text-xs text-slate-500"><th className="py-1">Tag</th><th>Feitas</th><th>Certas</th><th>Erradas</th><th>Branco</th><th>Acerto</th></tr></thead>
              <tbody>{weak.map((s) => (
                <tr key={s.tag} className="border-t border-line">
                  <td className="py-1.5 font-semibold">#{s.tag}</td><td>{s.n}</td><td>{s.hits}</td><td>{s.errors}</td><td>{s.blanks}</td>
                  <td className="font-semibold" style={{ color: color(s.pct) }}>{s.pct.toFixed(0)}%</td>
                </tr>))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <h2 className="mb-2 font-head text-lg font-bold">Histórico de sessões</h2>
        {lastSessions.length === 0 ? <p className="text-sm text-slate-500">Nenhuma sessão finalizada.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead><tr className="text-xs text-slate-500"><th className="py-1">Data</th><th>Modo</th><th>Regra</th><th>Resultado</th><th>Tempo</th></tr></thead>
              <tbody>{lastSessions.map((s) => (
                <tr key={s.id} className="border-t border-line">
                  <td className="py-1.5">{new Date(s.started_at).toLocaleString('pt-BR')}</td>
                  <td>{MODE_LABEL[s.mode]}</td><td>{SCORING_LABEL[s.scoring]}</td>
                  <td>{s.scoring === 'cebraspe' ? `líquida ${s.score_net} (bruta ${s.score_raw})` : s.scoring === 'enem' ? `${s.score_raw}/${s.counts?.total}` : `${Number(s.pct).toFixed(0)}%`} · {Number(s.pct).toFixed(0)}%</td>
                  <td>{fmt(s.duration_s)}</td>
                </tr>))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card">
        <h2 className="mb-2 font-head text-lg font-bold">Últimas resoluções</h2>
        <ul className="divide-y divide-line text-sm">
          {lastAttempts.map((a) => {
            const q = qById.get(a.question_id);
            return (
              <li key={a.id} className="flex items-center gap-3 py-1.5">
                <span className={`w-14 shrink-0 font-semibold ${a.is_blank ? 'text-slate-500' : a.is_correct ? 'text-ok' : 'text-bad'}`}>{a.is_blank ? 'branco' : a.is_correct ? 'certa' : 'errada'}</span>
                <span className="min-w-0 flex-1 truncate">{q ? `${q.source ? q.source + ' — ' : ''}${plain(q.statement)}` : '(questão removida)'}</span>
                <span className="shrink-0 text-xs text-slate-500">{fmt(a.time_spent_s)} · {new Date(a.created_at).toLocaleDateString('pt-BR')}</span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
