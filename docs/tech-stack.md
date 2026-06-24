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

- **Supabase (PostgreSQL)** — DB host + Storage. Free tier now → Pro ($25/mo) when students arrive.
- Accessed **only via Prisma** through `DATABASE_URL`.
- **RLS convention:** every `public` table has Row Level Security ENABLED (without policies) in the same migration that creates it. Prisma uses a `BYPASSRLS` role; RLS blocks the Supabase Data API (`anon`/`authenticated`). Run `get_advisors(type='security')` after every DDL migration. NOT used: Supabase Auth, JS Client, Realtime, Data API.

## Authentication

- **Better Auth** — email/password, **database sessions**, Prisma adapter on the Supabase Postgres.
- This is NOT Supabase Auth. Sessions live in our Postgres, accessed via Prisma — consistent with the "database sessions via Prisma, not Supabase Auth" decision, but using a maintained library instead of hand-rolled code.
- Sign-up creates a `member`. `admin` (Jilson) is seeded.

## Billing

- **Stripe — Plano Padrão** (pay-as-you-go: **3,99% + R$ 0,39** por transação, cartão nacional; sem mensalidade/setup/taxa oculta). Conta criada como **MEI (CNPJ)**; payout para **Banco do Brasil**.
- **NÃO usamos Stripe Billing.** A camada de assinatura recorrente é **construída in-house** (Express + Prisma + Stripe API nos primitivos de pagamento: `Customer`, `SetupIntent`/`PaymentMethod`, `PaymentIntent`) para evitar a taxa adicional do Billing sobre receita recorrente. *(Confirmar o % exato do Billing na Stripe Brasil antes de fechar a economia unitária — é o único número que muda o líquido por assinante.)*
- **NÃO usamos Customer Portal** (página hospedada da Stripe). **Princípio de UX central: o aluno nunca sai de jilsonsantana.com pra nada** — checkout, gestão de cartão, troca de plano e cancelamento vivem dentro da escola, com a marca. Reforça o membership all-in-one (cursos + comunidade + JilsonAI sob um teto só).
- **Captura de cartão embutida via Stripe Payment Element (Elements):** o formulário roda na própria página; o dado do cartão vai direto pro Stripe — **nunca toca nosso servidor** (PCI no escopo mais leve).
- **Preços (lógica nossa, não objetos `Price` do Billing):** Mensal **R$99,90 (sem fidelidade)** + Anual **~R$995 (~17% off)**. **Sem free trial, sem conteúdo grátis, sem trava de preço vitalícia.**
- **Cobrança recorrente própria:** no `currentPeriodEnd`, **pg-boss** dispara `PaymentIntent` off-session no `PaymentMethod` salvo; `status` + `currentPeriodEnd` na nossa tabela `Subscription` são a fonte única de acesso.
- **A parte difícil (e onde mora o risco):** dunning (retry de cartão recusado na renovação), **3DS/SCA off-session** (`requires_action`), reembolso/chargeback, proration mensal↔anual — tudo passa a ser código nosso. Por isso billing é um **bloco MAX/Ultracode** (irreversível-financeiro): "Ask before edits" ON + revisão humana.
- **Force-sync fallback** (reconsulta status do `PaymentIntent`/`Customer`, admin/server-only) reconcilia acesso se um webhook falhar.

## Video

- **Bunny Stream** — video hosting + DRM + signed URLs. Playback gated to active members via short-lived signed URLs issued by the server, with an **elastic window (~6–12h) and no IP-lock** (don't break playback on Wi-Fi↔4G switches). (Panda Video = fallback.)

## AI (JilsonAI)

- **Claude API (Anthropic)** via `@anthropic-ai/sdk` — teaching assistant in Jilson's voice/method. Server-side only; the key never touches the frontend. One gateway (`askJilsonAI()`); model behind an abstraction with **default = top model (Sonnet)** (cheap model for trivial only). Generous monthly **quota + visible calm "usage" meter**; rate-limit per member; usage tiers as post-launch seams. Pricing confirmed (Jun 2026): Haiku 4.5 $1/$5, Sonnet 4.6 $3/$15, Opus 4.8 $5/$25 per Mtok; prompt caching −90% on cached input. See `docs/jilsonai.md`.

## Background Jobs

- **pg-boss** — PostgreSQL-backed job queue (no extra infra). For: sending emails, processing Stripe/Bunny webhooks asynchronously, JilsonAI async tasks, certificate generation. Auto-creates its own `pgboss` schema (no Prisma migration needed).

## Email

- **Resend** — transactional (welcome, receipts, password reset) + educational emails.

## Certificates

- **Server-side PDF** generation on trilha/course completion (100%) — **MVP (Fase 6.5)**, "a escola nasce completa". Certificate carries the trilha name + `skillsCovered` (competencies), valuable for students targeting employers.

## Testing

- **Vitest + React Testing Library** — component tests (the majority of coverage)
- **Playwright** — E2E only for what needs a real browser + server (auth redirects, navigation, full-stack flows like webhook → DB → UI)

## Deployment & CI

- **Docker** — multi-stage build (client + server)
- **Railway** — hosting; auto-deploy on push to `main` (railway.toml + Dockerfile). Health check at `/api/health`.
- **GitHub Actions** — lint + test + build on push; Claude code review on PRs.

## AI-Assisted Dev (quality gates)

- **Claude subagents** (`.claude/agents/`): `security-vulnerability-reviewer`, `e2e-test-writer` (adapted from the Mosh reference).
- **Skills** (`.agents/skills/`): `frontend-design`, `better-auth-best-practices`, pinned via `skills-lock.json`.

## Server library (decision needed before Phase 6)

- **Claude API SDK**: use Anthropic's official TypeScript SDK (`@anthropic-ai/sdk`) for JilsonAI. (The Mosh reference used the Vercel AI SDK with OpenAI; we use Anthropic directly.)

## What We Do NOT Use (and why)

- **Supabase Auth / JS Client / Realtime / Data API** — auth is Better Auth via Prisma; all DB access via Prisma.
- **Stripe Billing + Customer Portal** — recorrência construída in-house (evita a taxa do Billing); gestão de assinatura embutida na escola (aluno nunca sai do site). Captura de cartão via Payment Element. `stripeSubscriptionId` fica reservado/nullable como seam, caso um dia migremos pro Billing.
- **Bun** — Node is the existing environment; less novelty to manage.
- **Teachable / course platforms** — building an owned asset.
- **Next.js** — audience comes from YouTube, not Google search; SPA is sufficient.
- **Gamification** — deliberately excluded (solo maintainability).
