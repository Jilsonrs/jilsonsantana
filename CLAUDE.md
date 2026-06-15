# jilsonsantana.com — AI Learning Platform
2
## Project Overview

A subscription learning platform: a single accessible membership = **courses + community + JilsonAI**. Turns Jilson's YouTube/Udemy audience into recurring members. Built modular to grow (analytics, live cohorts, corporate) without rewrites. One operator, sustainable at 47. See `docs/project-scope.md` for requirements, `docs/tech-stack.md` for stack rationale, `docs/implementation-plan.md` for the phased task breakdown.

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
- **Never leave `main` broken.** Work on a feature branch; commit small functional steps; merge only when lint + typecheck + tests pass. Stopping mid-session is safe as long as the last commit builds.
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
- Express 5 catches rejected promises — **do NOT wrap async handlers in try/catch**.
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

## Auth (Better Auth)

- Email/password, database sessions, Prisma adapter on Supabase Postgres. Mounted at `/api/auth/{*any}` (before `express.json()`).
- Server middleware: `requireAuth` (sets `req.user`/`req.session`), `requireAdmin`.
- Client: `ProtectedRoute` (redirect to `/login` if unauthenticated), `AdminRoute` (redirect non-admins).
- Sign-up creates a `member`. Admin (Jilson) is seeded, not self-registered.
- Rate-limit auth routes in production.

## Membership Gating (Stripe)

- Source of truth for access = subscription status synced from Stripe webhooks into our DB.
- `requireActiveMembership` middleware gates member content AND video signed-URL issuance.
- Process webhooks via pg-boss for reliability (retry on failure). Verify Stripe signature.

## Video (Bunny Stream)

- Never expose raw Bunny URLs. The server issues short-lived signed URLs, only to members with an active subscription.
- Store Bunny video IDs on the `Lesson` model.

## Analytics Convention (modular growth)

- **Separate write from read.** Capture events cheaply NOW; build analytics LATER as additive read-side modules.
- `LessonProgress` = simple state (`completed`, `completedAt`) — the MVP "mark as watched".
- `LessonEvent` = event-sourced rows (type: PLAY/PAUSE/SEEK/ENDED, position, timestamp) — capture from day one, analyze later.
- Analytics endpoints (`/stats/*`) and SQL aggregate functions are added as their OWN migrations/routes — they never modify the core feature. This is how the platform grows like Udemy/YouTube did: simple first, analytics layered on top.

## Background Jobs (pg-boss)

- Config in `server/src/lib/queue.ts` (uses `DATABASE_URL`). Started before `app.listen()`; stopped on SIGTERM/SIGINT.
- New job = create queue + register worker in `startQueue()` + export a `send*Job()` function.
- Use for: emails (Resend), Stripe/Bunny webhook processing, JilsonAI async, certificate generation.

## JilsonAI

- Claude API via `@anthropic-ai/sdk`, server-side only. System prompt encodes Jilson's voice/method + relevant course context. Rate-limit per member.

## Testing

- **Prefer component tests** (Vitest + React Testing Library) for most coverage — rendering, states, data display, error handling. Place next to component as `Name.test.tsx`.
- **E2E (Playwright)** only for things needing a real browser + server: auth redirects, navigation, full-stack flows (webhook → DB → UI), and the **access gates** (member can / non-member cannot). Use the `e2e-test-writer` agent.
- Run the `security-vulnerability-reviewer` agent on auth, billing, and video-gating code before merging those phases.

## Quality Gates

- GitHub Actions: lint + typecheck + tests on push; Claude code review on PRs.
- Subagents in `.claude/agents/`; skills pinned in `skills-lock.json`.

## Costs

- Launch infra < ~$30/month. Supabase Free → Pro ($25/mo) when students arrive. Railway Hobby ($5/mo).
