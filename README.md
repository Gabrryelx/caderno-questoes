# Caderno PAS — questões, simulados e caderno de erros

Next.js 14 (App Router) + Tailwind + Supabase (Postgres, Auth, Storage). Markdown + LaTeX (KaTeX).

## Rodar localmente
1. Crie um projeto grátis em https://supabase.com (região São Paulo).
2. Supabase → **SQL Editor** → cole `supabase/schema.sql` → **Run** (cria tabelas, segurança por usuário e o bucket `imagens`).
3. Supabase → **Authentication → Providers → Email**: para testar rápido, desative "Confirm email".
4. Supabase → **Project Settings → API**: copie *Project URL* e *anon public key*.
5. No terminal:
   ```bash
   cp .env.local.example .env.local   # preencha as duas variáveis
   npm install
   npm run dev                        # http://localhost:3000
   ```
6. Crie sua conta na tela inicial → aba **Importar** → **Carregar questões iniciais** → **Validar** → **Importar**.

## Deploy grátis (Vercel + Supabase)
1. Suba a pasta para um repositório no GitHub (`.env.local` já está no `.gitignore`).
2. https://vercel.com → **Add New → Project** → importe o repositório.
3. Em **Environment Variables** adicione `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` → **Deploy**.
4. Supabase → **Authentication → URL Configuration**: coloque a URL da Vercel em *Site URL*.
Pronto: o mesmo login funciona no celular e no computador.

## Formatos de importação
**JSON** (veja `public/seed/pas3-2024.json`) — use o metaprompt da aba Importar para gerar.

**Texto**
```
=== CONTEXTO ===        (opcional; vale até "=== FIM CONTEXTO ===")
fonte: PAS 3 2024
tags: #fisica/eletrodinamica
texto: texto-base compartilhado
=== Q ===
item: 41
tipo: ce | abcd | abcde | num   (opcional: é deduzido)
enunciado: ...
alternativas:
A) ...
B) ...
gabarito: C
resolucao: ...
tags: #outra/tag
=== FIM CONTEXTO ===
```

## Regras
- Cebraspe: certa +1, errada −1 (só itens Certo/Errado), branco 0 → bruta e líquida. ENEM: acertos. Percentual: %.
- Revisão de erros: prioridade = erros×2 − acertos×0,5 − acertos seguidos×1,5 + dias sem ver/10 (+3 se a última foi erro).
- Tags: filtrar por `fisica` inclui `fisica/eletrodinamica`. Renomear/remover em *Questões → Gerenciar tags*.
