# jilsonsantana.com — AI Learning Platform

## Project Overview

A subscription learning platform: a single accessible membership = **courses + JilsonAI + always-updated content**, organized into **trilhas** (curated learning tracks). Turns Jilson's YouTube/Udemy audience into recurring members. Built modular to grow (analytics, live cohorts, corporate) without rewrites. One operator, sustainable at 47.

**Guiding principle — AI in the DNA:** the school doesn't just *teach* AI, it *is* AI — discovering what to study, building the curriculum, answering doubts, and accompanying the student all happen through the JilsonAI. Decision filter for any feature: *"is this a living demo of well-used AI, or common mechanics?"* "Community" is NOT a peer forum — it's JilsonAI (support front door) + direct channel to Jilson + announcements.

See the **Document Map** below for every doc, what it holds, and where it is edited.

## Document Map (governance — git is the source of truth)

**Governance rule (updated Jun 2026 — replaces the old `Edit=repo` / `Edit=Project` split):**
**Any author may edit any doc when relevant — the operator, this agent (chat), or the build agent (Code). There is ONE non-negotiable rule: the repo (git) is the single source of truth. In any divergence, git wins.**

Why this exists (read before editing): the docs live in two places — the **repo** (git) and the **Claude Project** (chat context). The risk is not "who is allowed to edit"; it is **two copies disagreeing**. The rule that prevents that is git-wins + bidirectional sync, not edit-ownership.

Sync discipline (cheap, non-optional):
- Anything edited in **chat** (by the agent or operator) → the operator uploads it to the repo. Git now holds the truth.
- Anything edited in the **repo** (by Code, in the same commit as the work) → the operator pulls it back into the Project so the chat context stays current.
- **Diverged? Git wins.** Never trust the Project copy over git; re-sync from git.

Special caution — `CLAUDE.md`: this is the build law the Code agent reads **every session**. If it diverges between chat and repo, the build runs on a stale rule. So `CLAUDE.md` needs the git-wins discipline **most**, not least. Edit it deliberately; sync it immediately.

The docs and what they hold (no edit-owner anymore — all follow git-wins):
- **`CLAUDE.md`** *(repo ROOT, not `docs/`)* — engineering conventions + Block Execution Protocol. The build law, read every session.
- **`docs/implementation-plan.md`** — phased task breakdown with checkboxes. Code flips `[ ]→[x]` in the SAME commit as the work; the agent may draft amendments ahead of a phase.
- **`docs/tech-stack.md`** — the actual stack + versions + rationale.
- **`docs/project-description.md`** — identity, vision, the "AI-in-the-DNA" north star (strategy source of truth).
- **`docs/project-scope.md`** — product requirements; in/out of the MVP.
- **`docs/strategy.md`** — positioning, pricing rationale, churn/KPIs, funnel.
- **`docs/jilsonai.md`** — JilsonAI internal roadmap (chat, escalation, trilhas, quotas).
- **`docs/design.md`** — design system / tokens / aesthetic direction (Apple-clean, `#238FE8`).
- **`docs/content.md`** — landing copy + course-page copy / message direction.
- **`docs/courses.md`** — course engineering, slate, content map (3-camadas methodology, Udemy×Escola).

> When a planning doc's phase is actually built, the build agent reconciles build-specific details (a final token value, a tool signature, a field name) into the doc in the same commit — and flags it so the operator re-syncs the Project. This is reconciliation of build facts, not redeciding strategy: a strategy change is still the operator's call.

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind + shadcn/ui (port 5173)
- **Backend**: Express + TypeScript + Node (port 3000), npm workspaces
- **Shared**: `core/` workspace package — Zod schemas + constants used by client AND server
- **Database**: Supabase PostgreSQL via Prisma ORM (Prisma is the SOLE accessor)
- **Auth**: Better Auth (email/password, database sessions, Prisma adapter) — NOT Supabase Auth
- **Billing**: Stripe (recurring subscription + Customer Portal + webhooks)
- **Video**: Bunny Stream (signed URLs, member-gated)
- **AI (JilsonAI)**: Claude API via `@anthropic-ai/sdk` (server-side only)
- **Jobs**: pg-boss (PostgreSQL-backed queue, `pgboss` schema)
- **Email**: Resend
- **Deploy**: Docker + Railway (auto-deploy on push); GitHub Actions CI

## Project Structure

```
/core     - Shared Zod schemas + constants (npm workspace package)
/client   - React frontend (Vite)
/server   - Express backend
/e2e      - Playwright E2E tests
/docs     - planning + execution docs (see Document Map for the full list + edit owner)
CLAUDE.md - this file (repo root — read every session)
```

## Working Method (read this every session)

- The single source of strategy/identity is the project's `project-description` (Claude Project). This file is the single source of **engineering conventions**.
- Build **phase by phase** per `docs/implementation-plan.md`. Do one sliceable task at a time.
- **Never leave `main` broken.** Work on the `dev` branch; commit small functional steps. `main` auto-deploys to Railway, so it is "sacred" — only tested code reaches it. Stopping mid-session is safe as long as the last commit builds. **Merging `dev → main` is the operator's explicit decision, taken at the end of a phase once that phase's `Done when` is met — NOT the agent's call, and NOT triggered by green CI alone.** Green lint/typecheck/tests is the *floor* that makes a merge eligible, not the trigger: the agent commits to `dev` and stops, and asks for an explicit go before any merge. The agent never merges to `main` on its own initiative. (Automated PR + CI-gated merge replaces this only in the later phase that introduces it.)
- When unsure about a library's current API, fetch up-to-date docs before coding (don't guess versions).
- Prefer battle-tested libraries over custom code — this is a solo, burnout-conscious project.
- **Keep docs honest (do this in the SAME session, never "depois").** A doc that lies is worse than no doc. When a phase (or a sliceable task) is done, before the final merge:
  1. **Mark it** — flip the `- [ ]` to `- [x]` in `docs/implementation-plan.md` (and `✅ DONE` on the phase heading when the whole phase closes).
  2. **Reconcile any contradiction** — if a build decision diverged from what a living doc says (`CLAUDE.md`, `project-description`, `JILSONAI.md`, `DESIGN.md`, `TECH-STACK.md`), update that doc now. A doc must never disagree with `main` for more than one session — same discipline as the sacred `main`.
  3. **Log it if it's a decision, not just a task** — if the work resolved an open question or changed an approach, add a one-line note to the affected doc's footer decision log. Routine task completion needs no log entry (don't inflate).
  > Scope guard: this is reconciliation, not a rewrite. If a "doc update" starts feeling like a big writing session, stop — that's a signal the build diverged structurally and the divergence itself needs a decision, not prose.

## Block Execution Protocol (agent self-discipline)

How each sliceable task ("block") is executed. This encodes the review discipline so it runs WITHOUT a human babysitting every step — the operator approves the plan and the merge, not each keystroke.

- **Plan before writing code.** Read `docs/implementation-plan.md` + this file, then produce a short plan (plan mode) and get the operator's OK before editing anything. The plan states: files touched, the migration (if any), the acceptance gates, and what is explicitly OUT of scope for this block. The plan comes from the docs — do not invent scope the plan doesn't have, and do not silently drop scope the plan requires (e.g. a `User` field the plan lists for this phase).
- **Pre-flight on any migration or risky change ("Passo 0").** Capture the current state FIRST (seeded rows present, admin/member still sign in). Make the change. Then re-verify the SAME state survived. A change that silently breaks seeded data or login STOPS the block — report it, don't proceed.
- **Prove gates in runtime, not by reasoning.** "It typechecks" is necessary, never sufficient. Close each gate with empirical proof: a curl status matrix (e.g. 401/403/200), a real INSERT that persists, a real sign-in that returns a session, `get_advisors` output. If a claim is testable ("RLS bypasses", "the body arrives intact", "the admin can log in"), TEST it before asserting it. A row existing is not proof the account can log in; a 200 on a disabled path is not proof the body parsed.
- **End-of-block gate checklist.** Finish with an explicit pass/fail gate: the runtime proofs above + typecheck + lint + "scope held — nothing out-of-scope crept in." Show the checklist. Do not commit until every gate is green.
- **Stop and surface, don't paper over.** If something architectural is surprising — a migration fails on permissions, an API doesn't behave as its own docs imply — STOP and report it as a decision for the operator. Do NOT invent a workaround that masks the surprise (e.g. adding an RLS policy just to force an INSERT through, when the real question is which DB role is connecting).
- **Commit per block on `dev`, checkbox in the same commit.** Conventional-commit message; the body lists what landed AND any item deliberately left pending validation (so the next block picks it up). Flip the matching `docs/implementation-plan.md` checkbox in the SAME commit (see Working Method doc-sync). Then stop — merge to `main` is the operator's call (see Working Method).
- **Risk tiering.** Low-risk phases (1, 2, 5, 6.5): the agent's own gate checklist is enough. HIGH-RISK phases (3 Bunny, 4 Stripe — ~70% of project risk): additionally run the `security-vulnerability-reviewer` agent on auth/billing/video-gating code, and expect a separate human review pass before the operator authorizes the merge. Don't rush a high-risk phase to "green" — green is the floor, the gate is "the access boundary actually holds (member can, non-member cannot, status survives reload)."

## Key Conventions

### General
- Node + npm (npm workspaces). TypeScript everywhere.
- Use shadcn/ui for all UI (`@/components/ui/*`); use semantic tokens (`bg-background`, `text-muted-foreground`, `text-destructive`), never hardcoded Tailwind colors.
- Use the `@/` path alias (maps to `./src/`) in the client.

### Shared `core/` package
- Define shared Zod schemas in `core/schemas/` (e.g. `core/schemas/lessons.ts`) and import in BOTH client and server.
- Define shared constants/domain types in `core/constants/` as `as const` objects (runtime access, e.g. `Role`) or plain union types (type-only). Avoid TS `enum`.
- Validate request bodies with the shared `validate` helper (Zod schema + body + `res` → parsed data or `null` after sending 400).
- Parse numeric route IDs with the shared `parseId` helper.

### Server
- Organize endpoints as Express `Router` modules under `server/src/routes/` (one per domain, e.g. `routes/courses.ts`), mounted in `index.ts`.
- Express 5 catches rejected promises in normal route handlers — **do NOT wrap async handlers in try/catch.** Exception: handlers mounted via an adapter that returns a promise (e.g. Better Auth's `toNodeHandler`) are NOT auto-caught — chain `.catch(next)` there. (This was the Phase 0 boot bug: `toNodeHandler(auth)(req, res).catch(next)`.)
- Secrets (Stripe, Bunny, Claude API, Resend, DB) live in server env vars ONLY — never sent to the frontend.
- The server is the **sole gateway** to Supabase, Stripe, Bunny, Resend, and the Claude API.
- Use the shared `Role` constant, never hardcoded `"admin"`/`"member"` strings.

### Client
- TanStack React Query (`useQuery`/`useMutation`) for server state — not `useEffect` + `useState`.
- Axios for HTTP (not `fetch`).
- React Hook Form + `zodResolver` for forms.
- Reuse the shared error components for error/field messages.

### Database & Migrations
- One migration per feature (incremental, named in snake_case). Keep `schema.prisma` as the source of truth; `prisma db pull` to reconcile when tables are created via Supabase MCP.
- **RLS convention (non-negotiable):** every table created in the `public` schema MUST get `ALTER TABLE public.<t> ENABLE ROW LEVEL SECURITY;` in the SAME migration. No policies needed — Prisma connects via a `BYPASSRLS` role and is the sole accessor; RLS blocks the Supabase Data API (`anon`/`authenticated`).
- After every DDL migration, run `Supabase get_advisors(type='security')`. Expected: 0 `rls_disabled_in_public` errors; INFO `rls_enabled_no_policy` notices are the desired state.

## Content Model & Trilhas (the curriculum seam)

- **Course → Module → Lesson**, but the **`Lesson` is first-class and searchable** (own title + tags). A lesson can appear in search results and inside a trilha on its own — not only nested in a course. The lesson is the minimum unit (progress counts per lesson).
- **Trilhas** (learning tracks / "Career Plan" of the AI era — see `docs/jilsonai.md → Trilhas`):
  - `LearningPlan` — `ownerUserId?` (null = curated template), `isTemplate`, `skillsCovered[]` (snapshot for the certificate).
  - `PlanModule` — grouping by competency (`title`, `order`).
  - `PlanItem` — `itemType[COURSE|LESSON]` + `courseId?`/`lessonId?`. This is what gives the **free mix** of whole courses + standalone lessons (only lessons, only courses, or any combination).
- **Curated and personalized trilhas are the SAME entity** — only `ownerUserId`/`isTemplate` differ. Launch ships **curated** trilhas (Jilson hand-builds them; he is the "AI v0"). AI-assembled personalized plans (`buildLearningPlan`) land in JilsonAI Fase 4–5 — no rewrite.
- A member can **save/clone** a curated trilha (becomes theirs, own progress), **edit** it (add/remove courses, lessons, modules), and earns a **certificate at 100%** (name = trilha name; lists `skillsCovered`). The certificate has an **opt-in public verifiable URL** (`/certificado/[id]`, `isPublic` default false, OG-optimized for LinkedIn) — public only if the student allows it (LGPD).
- **Onboarding is open and free:** trilhas + courses are browsable; the student clicks and watches whatever they want. `recommendTrilha` is **optional help, never a gate.** (Home section order = a build-time decision.)

### Course page fields (Phase 2 — the course-detail page, mapped from competitor analysis)

The course-detail page is **light by design** (this is a membership — the landing sells the subscription; the course page is catalog, not a heavy sales page). Fields split into **derived** (computed, never typed) and **manual** (operator fills per course). Keep manual fields few — solo sustainability.

`Course` carries:
- `title`, `subtitle?` (one result-framed sentence), `description?` (long), `level?` (`INICIANTE|INTERMEDIARIO|AVANCADO` — `as const` in `core/`, not a TS enum).
- `learnTags[]` — "o que você vai aprender", rendered as **clickable tag pills** (Hashtag-style). `requirements[]` — pré-requisitos **shown openly** (vantagem: competitors hide them; in a membership, showing them costs no sale and cuts refunds/support). `personas[]` — "pra quem é".
- `faq[]?` of `{ pergunta, resposta }` — **per-course FAQ, OPTIONAL**. Renders only if filled; most courses leave it empty. The landing already has a global FAQ (assinatura-level: fidelity, certificate, JilsonAI). Per-course FAQ is for content-specific doubts only — and **JilsonAI is the living FAQ** (a course-specific question goes to JilsonAI in that course's context). So: fill 2–3 entries only where a recurring real doubt exists; don't write a full FAQ per course (burnout — the catalog is broad). Same pattern as `camadas`/`highlights`: optional, exception-filled, AI covers the general case.
- `highlights[]` of `{ icon, title, text }` — "diferenciais do curso" as **icon cards** (Xperiun-style). 3–4 per course. Icons from a fixed Lucide set (avoid bespoke art per course = burnout).
- `thumbnailUrl?` — **course image shown in the catalog/list**. `introVideoId?` — **presentation video shown on the detail page** (Bunny). **TRAVA:** the intro video is a *sales* asset — it must play for **non-members** (NOT gated by `temAcessoAtivo()`); wired in Phase 3. Both are **optional** (don't force a bespoke thumbnail + intro video per course at launch).
- `displayOrder` (manual ordering — NOT automatic/popularity ranking, which is post-launch read-side). `status` (`DRAFT|PUBLISHED|ARCHIVED`).
- **Derived, never a column:** carga horária and lesson count (Σ from lessons); the 3-camadas grouping (from the marked layers); metadata strip.

`Module` carries: `layer?` (optional — see below), `displayOrder`, `status`. `Lesson` carries: `displayOrder`, `status`.

### Metodologia 3 Camadas (the differentiator — selo opcional, per course)

A pedagogical methodology shown as a **selo (seal)** on the course page, the equivalent of competitors' "4 pilares". **Not every course has all three layers** (N8N may have only some) — so it is **not a boolean**; it is a selection.

- **The three layers (internal enum, agnostic of tool):** `UNIVERSAL` · `MODERNO` · `IA`. ("Excel 365" is the *example* of `MODERNO` in the Excel context only — never put "Excel 365" in the global layer text; it breaks for SQL/Python/N8N.)
- `Course.camadas[]` — array of the layers **this** course shows (`[]` = no selo; `[UNIVERSAL,IA]` = shows only two). This is what handles "nem todo curso tem as 3 camadas".
- **Layer texts (name + blurb + icon) are GLOBAL — written once**, in `core/` constants. Per course the operator only **picks which layers**. This is what keeps it premium WITHOUT recurring per-course copy work (the Xperiun trap).
- `Course.camadaOverride?` (jsonb, null) — optional per-course text override for a layer, for courses whose story the global text doesn't fit (e.g. N8N). **Exception, not routine:** if you override on *every* course, the global text is wrong — fix the global, don't write one per course.
- **Global defaults (approved Jun 2026):**
  - `UNIVERSAL` — icon `stack-2` · "Fundamentos sólidos" · "A base que funciona em qualquer versão — você aplica com o que já tem."
  - `MODERNO` — icon `bolt` · "Recursos modernos" · "Os recursos mais atuais que aceleram seu trabalho e poucos dominam."
  - `IA` — icon `sparkles` (**azul `--primary` #238FE8 — the only colored one**) · "Com IA do seu lado" · "A IA como copiloto pra gerar lógica, destravar erros e ganhar tempo."
- **Icons:** Lucide, fine-stroke, monochrome (inherit `currentColor`); only the `IA` layer gets the blue (the "brilho do JilsonAI"). `MODERNO`=`bolt` is "energy/speed", not hype — no rocket/wand.
- **Reveal vs internal:** the *promise* of the layers is shown to the student; the production economics (~75/15/10 %, "reaproveitado", the word "3 camadas" as jargon) stay **internal** — never in the student UI. The "precisa do Excel 365 pra praticar" note is **spoken in the lesson**, not a field.
- **Not built at launch:** grouping the accordion sections by layer (refinement), and the per-layer filter ("só o que roda no meu Excel 2016" = post-launch read-side). Launch = the selo only.

- Email/password, database sessions, Prisma adapter on Supabase Postgres. Mounted at `/api/auth/{*any}` (before `express.json()`).
- Server middleware: `requireAuth` (sets `req.user`/`req.session`), `requireAdmin`.
- Client: `ProtectedRoute` (redirect to `/login` if unauthenticated), `AdminRoute` (redirect non-admins).
- **Sign-up is gated, never open self-registration:** `disableSignUp: true`. A user is created by a **trusted trigger** — Phase 1: a seeded test member (and admin Jilson); Phase 4: the Stripe webhook creates the user after payment. Registration is **open to all countries** (global lusophone audience).
- Rate-limit auth routes in production.
- **`User` fields — keep identity lean, extras optional (Phase 1):**
  - `email` required (unique). `name` **optional** (a future corporate manager may invite with email only). `image` (avatar — free in Better Auth).
  - `role` (`member` default; `admin` seeded).
  - `birthday` **optional**, day+month only (e.g. `"06-15"`) — never the year (LGPD / sensitive-data minimization).
  - `preferredLanguage` default `"pt"` — **dormant seam.** Everything is PT today; the column exists so EN is never walled off. Do NOT build any multi-language UI now.
  - `marketingConsent` default `false` (LGPD) — gates promotional email only; transactional email (receipt, password reset) ignores it.
  - `acquisitionSource` / `acquisitionCampaign` **optional** — UTM capture. Read on first visit (cookie/localStorage), persisted at user creation (seed in P1, Stripe webhook in P4). Lets the YouTube→site funnel be measured (which video converts). Must be live before the channel sends traffic.
  - `deletedAt` (soft-delete). `requireAuth` rejects soft-deleted users.
- These extras are Better Auth `additionalFields` (mark `input: false` where users shouldn't set them directly, e.g. `role`). Re-run the Better Auth migration after adding fields.

## Access Architecture (the seam — read before any access code)

**Separate WHO the person is from WHAT grants them access.** Access never lives on `User`. It comes from a separate `Subscription`, which may belong to a person (individual) or — post-MVP — an organization (corporate). This single rule is what lets corporate, anti-sharing, and seats land later as ADDITIONS, never rewrites.

- `User` stays lean: identity only. Progress, certificates, sessions, anti-sharing all hang off `User` and are IDENTICAL for individual and (future) corporate students. The only thing that differs is the **source** of access.
- **Single source of truth for access = `temAcessoAtivo(userId)`** (server lib). Course/video gating calls ONLY this function — never inline subscription checks.
  - MVP: `return assinaturaIndividualAtiva(userId)`.
  - Post-MVP corporate: add `|| membroDeOrgComLugarLivre(userId)` — gating code untouched.
- `requireActiveMembership` (the Stripe-gating middleware) is the HTTP wrapper around `temAcessoAtivo`. Compose it after `requireAuth`, like `requireAdmin`.
- **`Subscription` model carries the growth seams from the day it is born (Phase 4):** `ownerUserId?`, `organizationId?` (nullable — always null pre-corporate), `seats` (default 1), `status`. Stripe-specific columns are added in the same phase.
- On access loss (sub canceled, seat removed): `session.deleteMany({ userId })` to force logout — same pattern as soft-delete in `requireAuth`.

## Membership Gating (Stripe)

- **Pricing = 2 prices on ONE "Membership" product:** Monthly **R$99,90 (no fidelity/lock-in, default)** + Annual **~R$995 (~17% off, single recurring annual charge)**. **No free trial. No free content inside the school** (free lives on YouTube). Monthly→annual upgrade uses Stripe's native proration. `temAcessoAtivo()` ignores which price the member holds. **No lifetime price lock** for founders (founding = temporary bonus/condition only).
- Source of truth for access = subscription status synced from Stripe webhooks into our DB.
- `requireActiveMembership` middleware gates member content AND video signed-URL issuance. It is the HTTP wrapper around `temAcessoAtivo(userId)` (see Access Architecture). Corporate students (post-MVP) pass the same gate via their org's subscription — the gate never needs to know which path granted access.
- `Subscription` includes `ownerUserId?`, `organizationId?` (nullable), `seats` (default 1) from the start, so corporate (Phase 12) is additive, not a rewrite.
- Process webhooks via pg-boss for reliability (retry on failure). Verify Stripe signature. Webhook responds fast (200) then enqueues work (user/subscription sync, welcome email) — never blocks on the response.
- **Force-sync fallback:** a `subscriptions.retrieve` reconciliation path exists for when a webhook fails (paying member locked out). **Admin-only or secure server scope — NEVER an unauthenticated GET that unlocks access** (that would be a billing bypass).
- **Offboarding:** the cancel flow goes through a native screen (collect reason → forward to Customer Portal). Anti roach-motel: a clear 1-click "cancelar mesmo assim" always visible (Procon/CDC). Reason capture = launch; "pausar 1 mês" (`pause_collection`) = fast-follow.

## Video (Bunny Stream)

- Never expose raw Bunny URLs. The server issues short-lived signed URLs, only to members with an active subscription. **Elastic window (~6–12h) and NO IP-lock** — don't break playback when a student switches Wi-Fi↔4G mid-lesson. Trade-off accepted: short window + DRM + per-user signing over marginal anti-piracy (solo-operator UX call).
- Store Bunny video IDs on the `Lesson` model.

## Analytics Convention (modular growth)

- **Separate write from read.** Capture events cheaply NOW; build analytics LATER as additive read-side modules.
- `LessonProgress` = simple state (`completed`, `completedAt`) — the MVP "mark as watched".
- `LessonEvent` = event-sourced rows (type: PLAY/PAUSE/SEEK/ENDED, position, timestamp) — capture from day one, analyze later.
- Analytics endpoints (`/stats/*`) and SQL aggregate functions are added as their OWN migrations/routes — they never modify the core feature. This is how the platform grows like Udemy/YouTube did: simple first, analytics layered on top.

## Profile & Community Data (modular — NOT on User)

- **"Community" is NOT a peer forum** (removed — it doesn't work even on Udemy and adds moderation load). Community = **JilsonAI** (support front door + escalation to Jilson) + **announcements/broadcasts**. There is no forum to build.
- Social/profile fields (LinkedIn, bio, "about me") do NOT go on `User`. They live in a separate `Profile` table ONLY IF a future social feature ever justifies one — deciding now would be guessing a shape that doesn't exist. Keep `User` to identity.

## Background Jobs (pg-boss)

- Config in `server/src/lib/queue.ts` (uses `DATABASE_URL`). Started before `app.listen()`; stopped on SIGTERM/SIGINT.
- New job = create queue + register worker in `startQueue()` + export a `send*Job()` function.
- Use for: emails (Resend), Stripe/Bunny webhook processing, JilsonAI async, certificate generation.

## JilsonAI

- Claude API via `@anthropic-ai/sdk`, **server-side only**. See `docs/jilsonai.md` for the full modular roadmap; key conventions for the build:
  - **One gateway, never bypassed:** all AI calls go through `askJilsonAI()`. Nothing calls the SDK directly (same role `temAcessoAtivo()` plays for access).
  - **Two registries:** `contextProviders[]` (build the prompt context) + `tools[]` (scoped server-side — `userId` ALWAYS injected by the server, never from the model). Each phase registers a new provider/tool; never edit old ones.
  - **Model behind an abstraction** (`llm.complete()`): **default = a top model (Sonnet)** — the AI is always smart (product decision). Cheap model (Haiku) only for trivial/routing; Opus rare. Switching is config, not a rewrite. Prompt caching on persona + repeated context.
  - **Quota + visible meter:** the plan includes a generous monthly quota of JilsonAI interactions; the chat UI shows a **calm "usage this month" meter** (Apple vibe, never an anxious countdown). Rate-limit per member caps tail-risk. Usage tiers (one-time top-up + JilsonAI+) are **post-launch seams**, switched on when real `AiEvent` data justifies. Quota value is set FROM data, not guessed.
  - Persona (voice/method) lives in a versioned `persona/jilson.md`, not in code. **Anti-hallucination rule in the persona:** when giving DAX/SQL/Python, always state the assumed table structure (column names/types, relationships, granularity) and recommend isolated testing — never present code as absolute truth about a schema it hasn't seen.
  - Trilha tools: `recommendTrilha` (launch — suggests a curated trilha by goal) and `buildLearningPlan` (Fase 4–5 — assembles a personalized plan).

## Testing

- **Prefer component tests** (Vitest + React Testing Library) for most coverage — rendering, states, data display, error handling. Place next to component as `Name.test.tsx`.
- **E2E (Playwright)** only for things needing a real browser + server: auth redirects, navigation, full-stack flows (webhook → DB → UI), and the **access gates** (member can / non-member cannot). Use the `e2e-test-writer` agent.
- Run the `security-vulnerability-reviewer` agent on auth, billing, and video-gating code before merging those phases.

## Quality Gates

- GitHub Actions: lint + typecheck + tests on push; Claude code review on PRs.
- Subagents in `.claude/agents/`; skills pinned in `skills-lock.json`.

## Costs

- Launch infra < ~$30/month. Supabase Free → Pro ($25/mo) when students arrive. Railway Hobby ($5/mo).
- The Claude API for JilsonAI is billed per-token, separately from any Claude subscription — budget it as a usage cost that scales with member chat volume (cache / rate-limit to keep it sustainable).

---
*Atualizado Jun 2026: trilhas (LearningPlan/PlanItem) + aula first-class; pricing 2-prices sem fidelidade/trial/lock; JilsonAI default modelo de ponta + quota + medidor visível; certificados no MVP; comunidade = JilsonAI (fórum removido); AI no DNA; design Apple-claro + #238FE8.*
*Atualizado Jun 2026 (rev. externa Gemini): UTM capture nos campos do User (P1); Bunny signed URL elástico sem IP-lock; Stripe force-sync (admin/server-only, nunca GET destravante) + offboarding anti roach-motel; certificado com URL pública opt-in (LGPD); regra anti-alucinação na persona do JilsonAI.*
*Atualizado Jun 2026: adicionada ao Working Method a regra de doc-sync ao fim de cada fase/task (marcar [x], reconciliar contradição no mesmo session, logar só se for decisão) — mantém os docs honestos vs `main`.*
*Atualizado Jun 2026: adicionado **Document Map** no topo — os 9 docs espelhados em repo + Claude Project, cada um com dono de edição (Edit=repo: CLAUDE, implementation-plan, tech-stack; Edit=Project: project-description, project-scope, strategy, jilsonai, design, content). Regra: divergência → o repo (git) ganha; agente não edita docs de planejamento, só consulta.*
*Atualizado Jun 2026 — **GOVERNANÇA SIMPLIFICADA (decisão do operador):** removida a separação Edit=repo / Edit=Project. Agora **qualquer autor (operador, agente do chat, agente Code) pode editar qualquer doc quando relevante**; a única regra é **git = fonte única da verdade** (divergiu → git ganha, sincroniza nos dois sentidos). `CLAUDE.md` exige a disciplina git-wins ao máximo (é lido todo session pelo Code). `courses.md` adicionado ao mapa.*
*Atualizado Jun 2026 — **Página de curso + Metodologia 3 Camadas (Fase 2):** campos do `Course` (subtitle, level, learnTags[], requirements[] mostrados, personas[], highlights[] com ícone, thumbnailUrl=lista, introVideoId=detalhe/não-gated, displayOrder, status) + `Module`/`Lesson` (displayOrder, status). Selo 3 camadas = `Course.camadas[]` (não-boolean — curso pode ter 1, 2 ou 3) + textos globais em `core/` + `camadaOverride?` (exceção, ex. N8N). Enum `UNIVERSAL/MODERNO/IA` (agnóstico; "Excel 365" = exemplo só no Excel). Ícones `stack-2`·`bolt`·`sparkles`, azul só na IA. Revelar a promessa, esconder a economia (%/reaproveitado). Filtro por camada + agrupamento do accordion = pós-launch. FAQ por curso = `Course.faq[]` opcional (JilsonAI é a FAQ viva).*
