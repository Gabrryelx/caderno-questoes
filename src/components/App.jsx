'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { fetchAll } from '@/lib/data';
import Auth from './Auth';
import Dashboard from './Dashboard';
import Bank from './Bank';
import Practice from './Practice';
import Notebook from './Notebook';
import Importer from './Importer';

const TABS = [['dash', 'Painel'], ['bank', 'Questões'], ['practice', 'Praticar'], ['notebook', 'Caderno de erros'], ['import', 'Importar']];

export default function App() {
  const [session, setSession] = useState(undefined);
  const [view, setView] = useState('dash');
  const [preset, setPreset] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [q, a, s] = await Promise.all([fetchAll('questions'), fetchAll('attempts'), fetchAll('sessions')]);
      setQuestions(q); setAttempts(a); setSessions(s);
    } catch (e) { alert('Erro ao carregar dados: ' + e.message); }
    setLoading(false);
  }, []);

  useEffect(() => { if (session) reload(); }, [session, reload]);

  if (session === undefined) return <div className="p-8 text-sm text-slate-500">Carregando…</div>;
  if (!session) return <Auth />;

  const go = (v, p = null) => { setPreset(p); setView(v); };

  return (
    <div className="mx-auto max-w-5xl px-3 pb-24 pt-3 sm:px-6">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line pb-2">
        <h1 className="font-head text-xl font-bold"><span className="mark">Caderno</span> PAS</h1>
        <nav className="flex flex-1 gap-1 overflow-x-auto">
          {TABS.map(([id, label]) => (
            <button key={id} onClick={() => go(id)}
              className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-semibold ${view === id ? 'bg-ink text-white' : 'text-slate-600 hover:bg-white'}`}>
              {label}
            </button>
          ))}
        </nav>
        {loading && <span className="text-xs text-slate-500">atualizando…</span>}
        <button className="btn" onClick={() => supabase.auth.signOut()}>Sair</button>
      </header>
      <main className="pt-4">
        {view === 'dash' && <Dashboard questions={questions} attempts={attempts} sessions={sessions} />}
        {view === 'bank' && <Bank questions={questions} attempts={attempts} reload={reload} />}
        {view === 'practice' && <Practice questions={questions} attempts={attempts} preset={preset} onFinished={reload} />}
        {view === 'notebook' && <Notebook questions={questions} attempts={attempts} reload={reload} onReview={() => go('practice', { mode: 'review' })} />}
        {view === 'import' && <Importer questions={questions} onImported={reload} />}
      </main>
    </div>
  );
}
