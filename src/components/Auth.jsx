'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('in');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setMsg('');
    const { data, error } = mode === 'in'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    setBusy(false);
    if (error) setMsg(error.message);
    else if (mode === 'up' && !data.session) setMsg('Conta criada. Confirme o e-mail (se a confirmação estiver ativa) e depois entre.');
  }

  return (
    <div className="mx-auto mt-16 max-w-sm px-4">
      <h1 className="font-head text-3xl font-bold"><span className="mark">Caderno</span> PAS</h1>
      <p className="mt-2 text-sm text-slate-600">Questões, simulados e caderno de erros. Seus dados ficam isolados na sua conta.</p>
      <form onSubmit={submit} className="card mt-6 space-y-3">
        <div><label className="label">E-mail</label><input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div><label className="label">Senha</label><input className="input" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        {msg && <p className="text-sm text-bad">{msg}</p>}
        <button className="btn btn-primary w-full" disabled={busy}>{mode === 'in' ? 'Entrar' : 'Criar conta'}</button>
        <button type="button" className="w-full text-sm text-slate-600 underline" onClick={() => setMode(mode === 'in' ? 'up' : 'in')}>
          {mode === 'in' ? 'Não tenho conta' : 'Já tenho conta'}
        </button>
      </form>
    </div>
  );
}
