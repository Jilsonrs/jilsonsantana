# jilsonsantana.com — Implementation Plan

> Phases are ordered by dependency. Each phase is sliced into **session-sized tasks**
> (each checkbox ≈ one focused working block, safe to stop after a commit).
> Rule: never end a session with broken code on `main`. Work on a feature branch,
> commit small functional steps, merge when green.
> **HIGH-RISK phases are marked** — give them their own sessions, don't rush.

---

## Phase 0 — Foundation & Deploy Pipeline  *(low–medium risk)*

- [ ] Initialize npm-workspace monorepo: `/core`, `/client`, `/server`, `/e2e`
- [ ] `/client`: React + TypeScript + Vite + Tailwind + shadcn/ui init; `@/` path alias
- [ ] `/server`: Express + TypeScript; `/api/health` endpoint
- [ ] `/core`: workspace package for Zod schemas + constants; importable from client and server
- [ ] Connect Prisma to Supabase (`DATABASE_URL`); `prisma db pull` baseline
- [ ] Dockerfile (multi-stage: build client → serve via server) + `.dockerignore`
- [ ] `railway.toml` (healthcheck `/api/health`) ; confirm Railway auto-deploy on push
- [ ] GitHub Actions: lint + typecheck + build on push
- [ ] CLAUDE.md committed at repo root
- **Done when:** push to `main` → Railway serves the app + `/api/health` returns OK.

## Phase 1 — Authentication & App Shell  *(low risk)*

- [ ] Better Auth server config (Prisma adapter); mount before `express.json()`
- [ ] Better Auth migration → creates `user`, `session`, `account`, `verification` tables; **add RLS ENABLE for each**
- [ ] Run `get_advisors(security)` → 0 `rls_disabled_in_public`
- [ ] `requireAuth` + `requireAdmin` middleware (sets `req.user`)
- [ ] Client: auth-client, `LoginPage`, `ProtectedRoute`, `AdminRoute`, `Layout`
- [ ] Seed admin user (Jilson); sign-up creates `member`
- [ ] Account page (log out; profile)
- **Done when:** members log in, protected routes redirect, admin gate works.

## Phase 2 — Content Model (Courses / Modules / Lessons)  *(low–medium risk)*

- [ ] Prisma models: `Course`, `Module`, `Lesson` (+ RLS on each) ; migration
- [ ] `core/schemas/` for course/module/lesson + `core/constants/`
- [ ] Server routes: CRUD under `/api/courses`, `/api/modules`, `/api/lessons` (admin-protected for writes)
- [ ] Client: catalog page, course page, lesson list (no video yet)
- [ ] Admin: manage courses/modules/lessons
- [ ] Seed the Excel + IA course structure
- **Done when:** Excel + IA course visible with its lessons; admin can edit.

## Phase 3 — Video Playback (Bunny Stream)  *(HIGH RISK — own sessions)*

- [ ] Bunny account + library; store video IDs on `Lesson`
- [ ] Server: issue short-lived **signed URLs**, member-only
- [ ] Server: admin upload flow (or direct-to-Bunny + store reference)
- [ ] Client: gated player on the lesson page
- [ ] E2E: non-member cannot get a playable URL
- **Done when:** a member plays a lesson; a non-member is blocked. *Test the gate hard.*

## Phase 4 — Billing & Membership Gate (Stripe)  *(HIGH RISK — own sessions)*

- [ ] Stripe products/prices (monthly + annual R$99,90 base)
- [ ] Checkout session endpoint; Customer Portal endpoint
- [ ] **Webhook handler** (subscription created/updated/canceled) → sync status to DB (via pg-boss for reliability)
- [ ] `requireActiveMembership` middleware gating content + video URLs
- [ ] Client: pricing page, subscribe flow, manage-subscription (portal)
- [ ] E2E: subscribe → access granted; cancel → access revoked at period end
- **Done when:** paying members get access, status survives reload, webhooks reconcile truth.

## Phase 5 — Lesson Progress + Event Capture Foundation  *(low–medium risk)*

- [ ] `LessonProgress` (user×lesson, `completed`, `completedAt`) + RLS ; migration
- [ ] Endpoint: mark lesson watched; lesson list shows completion
- [ ] `LessonEvent` table (event-sourced: type, position, ts) + RLS — **capture only, no analytics yet**
- [ ] Client: fire PLAY/PAUSE/ENDED events from the player (cheap writes)
- **Done when:** "marquei como vista" works AND events are being captured for future analytics.

## Phase 6 — JilsonAI (lean v1)  *(medium risk)*

- [ ] Anthropic SDK on server (key server-side only)
- [ ] System prompt encoding Jilson's voice/method + course context
- [ ] Endpoint: ask JilsonAI (rate-limited per member)
- [ ] Client: chat panel inside the member area
- **Done when:** members ask questions and get answers in Jilson's voice. (Deeper context/RAG = later.)

## Phase 7 — Launch Prep  *(medium risk)*

- [ ] Transactional emails (Resend): welcome, receipt, password reset
- [ ] LGPD: privacy policy, terms, consent, data export/delete path
- [ ] Error/loading states everywhere; security review (subagent) on auth/billing/video
- [ ] Performance pass (< 3s load); mobile responsive
- [ ] Founding-member offer wiring (scarcity for Udemy students)
- **Done when:** the Excel + IA course is buyable and watchable end to end. **→ LAUNCH**

---

## Post-MVP (additive modules — no rewrite)

- **Phase 8 — Analytics (read-side):** SQL functions + `/stats/*` endpoints derived from `LessonEvent` (watch time, drop-off, re-watch, engagement). Admin dashboard.
- **Phase 9 — Community** (simple member space)
- **Phase 10 — Certificates** (server-side PDF on completion)
- **Phase 11 — Live cohorts** (tier 2, Zoom)
- **Phase 12 — Corporate/B2B** (tier 3)
- **Phase 13 — EN phase** (2027+)

---

## Critical-path note for the 2–3 month launch

MVP = **Phases 0 → 7**. The two HIGH-RISK phases (3 Bunny, 4 Stripe) hold ~70% of the risk — schedule them as dedicated sessions and test the access gates aggressively (member can, non-member cannot, status survives reload). Community, certificates, and analytics are intentionally post-launch so the school goes live faster.
