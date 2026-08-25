# jilsonsantana.com — Tech Stack

> Decided. Adapted from the production patterns in Mosh's Claude Code course
> (helpdesk reference project), reconciled with Jilson's prior decisions.

## Frontend

- **React + TypeScript + Vite** — SPA
- **Tailwind CSS + shadcn/ui** — UI; use shadcn semantic tokens (`bg-background`, `text-muted-foreground`), not hardcoded colors. **Aesthetic: Apple — light, airy, creative, beautiful imagery, light transitions.** Brand accent = blue **#238FE8** (`--primary`), with black text + gray #838383 secondary; **MuseoModerno SemiBold** for display/brand, neutral sans for body. See DESIGN.md.
- **React Router** — routing
- **TanStack React Query** — server state (`useQuery` / `useMutation`), not `useEffect` + `useState`
- **Axios** — HTTP client (not `fetch`)
- **React Hook Form + Zod resolver** — form validation

## Backend

- **Node.js + Express + TypeScript** — runtime is Node (not Bun), npm workspaces
- **Prisma** — ORM, type-safe queries, schema as code
- **Express 5** — async errors caught automatically (no try/catch in route handlers)

## Shared

- **`core/` package** (npm workspace) — Zod schemas + domain constants shared by client and server. Single source of truth for shapes and types end to end.

## Database

- **Supabase (PostgreSQL)** — DB host + Storage. Free tier now → Pro when students arrive: **US$ 35/mo**, não 25 — o plano é por **organização** e a org `hdmecfinlnocurhcxrdb` tem **dois** projetos (US$ 25 da org + US$ 10 do 2º projeto). Detalhe e a decisão de manter os dois na mesma org: `implementation-plan.md` → Fase 7.
- **Dois projetos, papéis distintos:** `gaxmbnhwltljlkukdwba` ("Jilson Santana Website", **us-east-2**) = **produção**, alcançável só pelo Railway · `mvaobzypsiuhqzipcelw` ("Jilson Santana Test", **us-east-1**) = **dev E teste**. Postgres `17.6.1.155` nos dois (canal `ga`).
- **REGIÕES DIFERENTES DE PROPÓSITO — não recriar projeto por causa disso.** A latência extra pro Brasil (~150 ms por query) **não é o gargalo**: o **vídeo** domina o tempo do aluno e vem do **Bunny com PoP local**, e a meta de carregamento é **< 3 s** — 0,15 s é **5%** desse orçamento. Consultas em **paralelo** não somam latência; o que custa é consulta em **cascata**, e isso é **decisão de código, não de região**. *Gatilho de reabertura: reclamação real de lentidão de aluno, **OU** outro motivo que exija recriar o projeto — nesse caso escolher `sa-east-1`.*
- Accessed **only via Prisma** through `DATABASE_URL`.
- **RLS convention:** every `public` table has Row Level Security ENABLED (without policies) in the same migration that creates it. Prisma uses a `BYPASSRLS` role; RLS blocks the Supabase Data API (`anon`/`authenticated`). Run `get_advisors(type='security')` after every DDL migration. NOT used: Supabase Auth, JS Client, Realtime, Data API.

## Authentication

- **Better Auth** — email/password, **database sessions**, Prisma adapter on the Supabase Postgres.
- This is NOT Supabase Auth. Sessions live in our Postgres, accessed via Prisma — consistent with the "database sessions via Prisma, not Supabase Auth" decision, but using a maintained library instead of hand-rolled code.
- Sign-up creates a `member`. `admin` (Jilson) is seeded.

## Billing

- **Stripe — Payments (Plano Padrão) + Stripe Billing**, com **Payment Element embutido**. Conta criada como **MEI (CNPJ)**; payout para **Banco do Brasil**.
- **Custos (verificados em `stripe.com/en-br/billing/pricing`, ago 2026):** Payments **3,99% + R$ 0,50** por cobrança de cartão bem-sucedida · Billing **0,7% do volume de Billing** (pay-as-you-go, sem mensalidade). Em R$99,90/mês: ~R$ 4,49 + R$ 0,70 = **~R$ 5,19 por assinante/mês**.
- **Por que Billing (decisão REVISTA em Ago 2026):** a decisão anterior ("recorrência in-house pra evitar a taxa") empacotava duas escolhas independentes — *checkout na nossa página* e *quem opera a recorrência*. Só a primeira é requisito de UX, e ela **não** exige abrir mão do Billing. Billing entrega, incluído: renovação agendada, **Smart Retries**, lembretes automáticos de pagamento em atraso, automações de recuperação/retenção, proração, faturas, e atualização de cartão vencido junto às bandeiras. Construir isso in-house era o maior bloco de código financeiro irreversível do projeto — e o maior passivo de manutenção permanente pra operador solo. Aplica a regra do CLAUDE.md: *prefer battle-tested libraries over custom code*.
- **NÃO usamos Customer Portal** (página hospedada da Stripe), embora venha incluído no Billing. **Princípio de UX central: o aluno nunca sai de jilsonsantana.com** — assinar, trocar cartão, mudar de plano e cancelar vivem em telas nossas, chamando a Subscriptions API. A doc da Stripe trata a API como caminho principal e o portal como opcional, então isso não é contramão.
- **Captura de cartão embutida via Stripe Payment Element (Elements):** o formulário roda na própria página; o dado do cartão vai direto pro Stripe — **nunca toca nosso servidor** (PCI no escopo mais leve).
- **Preços = objetos `Price` da Stripe** (um produto "Assinatura", dois prices): Mensal **R$99,90 (sem fidelidade)** + Anual **~R$995 (~17% off)**. **Sem free trial, sem conteúdo grátis, sem trava de preço vitalícia.** Troca mensal↔anual = `subscriptions.update` com proração da Stripe (previsualizável antes de mostrar ao aluno).
- **Fonte da verdade do acesso:** a `Subscription` **da Stripe é canônica**; a nossa tabela `Subscription` é o **espelho local** (status + `currentPeriodEnd`) que o gate lê, sincronizado por webhooks de assinatura. Em qualquer dúvida, re-buscar `subscriptions.retrieve` e recomputar o espelho — nunca confiar no snapshot do evento.
- **Dunning = configuração, não código.** A régua (D0 → retries → corte) continua sendo **decisão de produto nossa** — em especial **acesso MANTIDO durante a janela** (status `past_due`), porque churn involuntário é a maior alavanca (strategy.md §6). O que muda é *quem executa*: Smart Retries + automações de recuperação da Stripe, não um agendador nosso.
- **O que continua sendo código nosso — e onde mora o risco restante:** o **gate de acesso** (`temAcessoAtivo` + `requireActiveMembership`), webhooks **idempotentes e à prova de ordem**, o **force-sync** de reconciliação, e as telas de assinatura/cancelamento. O Billing removeu a *mecânica do dinheiro*, não a *fronteira de acesso*. A Fase 4 segue HIGH RISK com "Ask before edits" ON + revisão humana; o que encolheu foi a **superfície**. Se mantém nível MAX/Ultracode é decisão do operador na abertura da fase.

## Video

- **Bunny Stream** — video hosting + DRM + signed URLs. Playback gated to active members via short-lived signed URLs issued by the server, with an **elastic window (~6–12h) and no IP-lock** (don't break playback on Wi-Fi↔4G switches). (Panda Video = fallback.)

## AI (JilsonAI)

- **Claude API (Anthropic)** via `@anthropic-ai/sdk` — teaching assistant in Jilson's voice/method. Server-side only; the key never touches the frontend. One gateway (`askJilsonAI()`); model behind an abstraction with **default = top model (Sonnet)** (cheap model for trivial only). Generous monthly **quota + visible calm "usage" meter**; rate-limit per member; usage tiers as post-launch seams. Pricing confirmed (Jun 2026): Haiku 4.5 $1/$5, Sonnet 4.6 $3/$15, Opus 4.8 $5/$25 per Mtok; prompt caching −90% on cached input. See `docs/jilsonai.md`.

## Background Jobs

- **Nenhuma fila no MVP** (pg-boss removido em Ago 2026 — o porquê e o gatilho de volta estão em *What We Do NOT Use*, e a convenção de execução em `CLAUDE.md` → Background Jobs). Webhook, e-mail e afins rodam **inline na request**.

## Email

- **Resend** — transactional (welcome, receipts, password reset) + educational emails.

## Certificates

- **Server-side PDF** generation on trilha/course completion (100%) — **MVP (Fase 6.5)**, "a escola nasce completa". Certificate carries the trilha name + `skillsCovered` (competencies), valuable for students targeting employers.

## Testing

- **Vitest + React Testing Library** — component tests (the majority of coverage)
- **Vitest + supertest** — **testes de servidor, sem browser** (o único lugar onde mora o risco catastrófico: assinante pagante trancado fora / acesso liberado sem pagar). Nascem **dentro da Fase 4**, colados ao handler de webhook. Lista dos casos: `implementation-plan.md` → Fase 4.
- **Playwright** — E2E only for what needs a real browser + server (auth redirects, navigation, full-stack flows like webhook → DB → UI). **Permanece na stack:** o E2E de hoje só assere redirect do React Router porque falta o `globalSetup` com banco de teste — não é escolha errada de ferramenta. Alvo: 6–8 testes full-stack, **depois** dos testes de servidor.
- **Banco de teste = um SEGUNDO projeto Supabase** (não Postgres local em Docker — menos infra pro operador solo). **CRIADO em Ago 2026:** ref `mvaobzypsiuhqzipcelw` ("Jilson Santana Test", us-east-1) — o antigo `[PENDENTE]` sobre o tier grátis está **resolvido** (o Free permite 2 projetos ativos). Serve **dev E teste**; produção fica sozinha, alcançável só pelo Railway. A trava obrigatória do setup compara contra o **project REF**, não contra a substring `_test` — que **nunca dispararia**, porque o host do Supabase é montado do ref opaco e não do nome do projeto. Convenção, código da trava e o porquê: `CLAUDE.md` → Database & Migrations.

## Deployment & CI

- **Docker** — multi-stage build (client + server)
- **Railway** — hosting; auto-deploy on push to `main` (railway.toml + Dockerfile). Health check at `/api/health`.
- **GitHub Actions** — hoje: `npm ci` + build do core + typecheck + build. **Não roda teste e não roda lint** [FATO, `.github/workflows/ci.yml`]. Conserto = bloco **Gates** no topo da Fase 3 (`implementation-plan.md`). Claude code review on PRs.
- **Monitor de erro em produção** — **decisão PENDENTE** (gerenciado, tier grátis, tipo Sentry; fornecedor não escolhido). Não é opcional: é pré-requisito do primeiro aluno pagante (`implementation-plan.md` → Fase 7).

## AI-Assisted Dev (quality gates)

- **Claude subagents** (`.claude/agents/` — versionado; ver a exceção de ignore no `CLAUDE.md`): `security-vulnerability-reviewer` (existe; tools read-only, sem Edit/Write — reporta, nunca corrige). `e2e-test-writer` — **PENDENTE e ADIADO** (não existe; adapted from the Mosh reference): gerar teste numa camada que hoje nem roda no CI é dívida, não cobertura — só faz sentido depois do bloco Gates. Duas restrições já decididas pra quando nascer: Write/Edit **restrito a `e2e/**`** (sem acesso a `server/src`/`client/src`) e **só a mecânica** vai pro arquivo do agente. Detalhe em `CLAUDE.md` → Testing.
- **Skills** (`.agents/skills/`): `frontend-design`, `better-auth-best-practices`, pinned via `skills-lock.json`.

## Server library (decision needed before Phase 6)

- **Claude API SDK**: use Anthropic's official TypeScript SDK (`@anthropic-ai/sdk`) for JilsonAI. (The Mosh reference used the Vercel AI SDK with OpenAI; we use Anthropic directly.)

## What We Do NOT Use (and why)

- **Supabase Auth / JS Client / Realtime / Data API** — auth is Better Auth via Prisma; all DB access via Prisma.
- **Stripe Customer Portal** — vem incluído no Billing, mas não usamos: a gestão de assinatura fica embutida na escola (aluno nunca sai do site), via Subscriptions API em telas nossas. *(Stripe Billing SIM — decisão revista em Ago 2026; ver a seção Billing.)*
- **pg-boss (fila de jobs)** — **removido do MVP em Ago 2026.** Aplicação direta do critério de decisão de stack (`CLAUDE.md` → Working Method: *toda peça precisa impedir uma falha descritível em uma frase*). A falha que a fila evitaria é "o webhook falhou e ninguém retentou" — mas **a Stripe já reentrega quando devolvemos 5xx**, então mantínhamos worker + schema `pgboss` + um modo de falha próprio só pra duplicar o fornecedor. Agravante: o **alerta** de falha era ele mesmo uma fila do pg-boss — a detecção dependia da coisa que deveria detectar (a detecção agora é o monitor externo, acima). O webhook passa a ser **inline**: assinatura → `event.id` → espelho local → 200. **GATILHO DE VOLTA:** a fila retorna nas **Fases 4–5 do JilsonAI** (embeddings da KB; pipeline transcrição→chunk→embedding) — lote, demorado, retentável — e é código que ainda não existe, então entrar depois não refatora nada. No MVP do JilsonAI (Fases 0–3) o chat é síncrono com streaming: fila ali pioraria o produto. A razão do Mosh pra adotá-la é **DESCONHECIDA** [FATO — sem evidência nas transcrições]; não foi refutada, foi julgada não-aplicável ao nosso lançamento.
- **Bun** — Node is the existing environment; less novelty to manage.
- **Teachable / course platforms** — building an owned asset.
- **Next.js** — audience comes from YouTube, not Google search; SPA is sufficient.
- **Gamification** — deliberately excluded (solo maintainability).
