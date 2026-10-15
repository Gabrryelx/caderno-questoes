-- Caderno PAS — esquema do banco (Supabase / PostgreSQL)
-- Rode inteiro em: Supabase > SQL Editor > New query > Run

create extension if not exists pgcrypto;

-- ───────── Questões ─────────
create table if not exists public.questions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  type         text not null check (type in ('abcde','abcd','ce','num')),
  support      text not null default '',          -- texto-base compartilhado (Markdown/LaTeX)
  statement    text not null,                     -- enunciado (Markdown/LaTeX/imagens)
  options      jsonb not null default '[]',       -- [{label:'A', text:'...', correct:true}] (vazio em ce/num)
  answer       text not null,                     -- 'A'..'E' | 'C'/'E' | número | 'X' (anulada)
  annulled     boolean not null default false,
  explanation  text not null default '',          -- resolução comentada
  notes        text not null default '',          -- caderno de erros: anotações/macetes
  error_reasons text[] not null default '{}',     -- caderno de erros: motivos
  tags         text[] not null default '{}',      -- hierárquicas: 'fisica/eletrodinamica'
  source       text not null default '',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists questions_user_idx on public.questions(user_id);
create index if not exists questions_tags_gin on public.questions using gin(tags);

-- ───────── Sessões (estudo / simulado / revisão) ─────────
create table if not exists public.sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  mode        text not null check (mode in ('study','sim','review')),
  scoring     text not null check (scoring in ('cebraspe','enem','pct')),
  config      jsonb not null default '{}',
  created_at  timestamptz not null default now(),
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  duration_s  integer,
  score_raw   numeric,
  score_net   numeric,
  pct         numeric,
  counts      jsonb
);

-- ───────── Resoluções (uma linha por questão respondida) ─────────
create table if not exists public.attempts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  question_id  uuid not null references public.questions(id) on delete cascade,
  session_id   uuid references public.sessions(id) on delete set null,
  chosen       text,                    -- null = em branco
  is_correct   boolean not null default false,
  is_blank     boolean not null default false,
  flagged      boolean not null default false,
  time_spent_s integer not null default 0,
  mode         text,
  created_at   timestamptz not null default now()
);
create index if not exists attempts_q_idx on public.attempts(question_id);
create index if not exists attempts_user_time_idx on public.attempts(user_id, created_at);

-- ───────── Segurança: cada usuário só enxerga o que é seu ─────────
alter table public.questions enable row level security;
alter table public.sessions  enable row level security;
alter table public.attempts  enable row level security;

drop policy if exists "own questions" on public.questions;
drop policy if exists "own sessions"  on public.sessions;
drop policy if exists "own attempts"  on public.attempts;
create policy "own questions" on public.questions for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own sessions"  on public.sessions  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own attempts"  on public.attempts  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ───────── Imagens (bucket público de leitura; só o dono envia/apaga na própria pasta) ─────────
insert into storage.buckets (id, name, public) values ('imagens', 'imagens', true) on conflict (id) do nothing;

drop policy if exists "imagens leitura"  on storage.objects;
drop policy if exists "imagens upload"   on storage.objects;
drop policy if exists "imagens delete"   on storage.objects;
create policy "imagens leitura" on storage.objects for select using (bucket_id = 'imagens');
create policy "imagens upload"  on storage.objects for insert to authenticated
  with check (bucket_id = 'imagens' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "imagens delete"  on storage.objects for delete to authenticated
  using (bucket_id = 'imagens' and (storage.foldername(name))[1] = auth.uid()::text);
