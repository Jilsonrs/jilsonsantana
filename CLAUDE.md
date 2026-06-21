# jilsonsantana.com — AI Learning Platform

## Project Overview

A subscription learning platform: a single accessible membership = **courses + JilsonAI + always-updated content**, organized into **trilhas** (curated learning tracks). Turns Jilson's YouTube/Udemy audience into recurring members. Built modular to grow (analytics, live cohorts, corporate) without rewrites. One operator, sustainable at 47.

**Guiding principle — AI in the DNA:** the school doesn't just *teach* AI, it *is* AI — discovering what to study, building the curriculum, answering doubts, and accompanying the student all happen through the JilsonAI. Decision filter for any feature: *"is this a living demo of well-used AI, or common mechanics?"* "Community" is NOT a peer forum — it's JilsonAI (support front door) + direct channel to Jilson + announcements.

See `docs/project-scope.md` for requirements, `docs/tech-stack.md` for stack rationale, `docs/implementation-plan.md` for the phased task breakdown, and `docs/jilsonai.md` for the JilsonAI internal roadmap (chat, escalation, trilhas, quotas).

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
/docs     - project-scope.md, tech-stack.md, implementation-plan.md
CLAUDE.md - this file (repo root — read every session)
```

## Working Method (read this every session)

- The single source of strategy/identity is the project's `PROJECT_DESCRIPTION` (Claude Project). This file is the single source of **engineering conventions**.
- Build **phase by phase** per `docs/implementation-plan.md`. Do one sliceable task at a time.
- **Never leave `main` broken.** Work on the `dev` branch; commit small functional steps; merge to `main` only when lint + typecheck + tests pass. `main` auto-deploys to Railway, so it is "sacred" — only tested code reaches it. Stopping mid-session is safe as long as the last commit builds. (PR + CI + automated review come in a later phase.)
- When unsure about a library's current API, fetch up-to-date docs before coding (don't guess versions).
- Prefer battle-tested libraries over custom code — this is a solo, burnout-conscious project.

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
