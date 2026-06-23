# jilsonsantana.com — Implementation Plan

> Phases are ordered by dependency. Each phase is sliced into **session-sized tasks**
> (each checkbox ≈ one focused working block, safe to stop after a commit).
> Rule: never end a session with broken code on `main`. Work on the `dev` branch,
> commit small functional steps, merge to `main` when green (`main` auto-deploys).
> **HIGH-RISK phases are marked** — give them their own sessions, don't rush.

---

## Phase 0 — Foundation & Deploy Pipeline  *(low–medium risk)*  ✅ DONE

- [x] Initialize npm-workspace monorepo: `/core`, `/client`, `/server`, `/e2e`
- [x] `/client`: React + TypeScript + Vite + Tailwind + shadcn/ui init; `@/` path alias
- [x] `/server`: Express + TypeScript; `/api/health` endpoint
- [x] `/core`: workspace package for Zod schemas + constants; importable from client and server
- [x] Connect Prisma to Supabase (`DATABASE_URL`); `prisma db pull` baseline
- [x] Dockerfile (multi-stage: build client → serve via server) + `.dockerignore`
- [x] `railway.json` (startCommand + healthcheck `/api/health`); Railway auto-deploy on push confirmed
- [x] GitHub Actions: lint + typecheck + build on push
- [x] CLAUDE.md committed at repo root
- [x] Custom domain `www.jilsonsantana.com` live with SSL
- **Done when:** push to `main` → Railway serves the app + `/api/health` returns OK. ✅

## Phase 1 — Authentication & App Shell  *(low risk)*  ✅ DONE

- [x] Better Auth server config (Prisma adapter); mount at `/api/auth/{*any}` before `express.json()`
- [x] `User` additionalFields: `name` optional, `image`, `role` (default `member`), `birthday` (day+month, optional), `preferredLanguage` (default `"pt"`, dormant seam), `marketingConsent` (default `false`), **`acquisitionSource` + `acquisitionCampaign` (optional — UTM capture)**, `deletedAt`
- [x] Drop legacy `public.users` + `public.sessions` (0 rows — safe); also dropped orphaned `"Role"` enum type
- [x] Better Auth migration → creates `user`, `session`, `account`, `verification` tables; **add RLS ENABLE for each in the same migration**
- [x] Run `get_advisors(security)` → 0 `rls_disabled_in_public`
- [x] `requireAuth` (rejects soft-deleted users) + `requireAdmin` middleware (sets `req.user`)
- [x] Client: auth-client, `LoginPage`, `ProtectedRoute`, `AdminRoute`, `Layout`
- [x] `disableSignUp: true`; seed admin (Jilson) + a seeded **test member** (lets login be tested before billing exists); registration open to all countries
- [x] Account page (log out; profile)
- [x] **Attribution capture (UTM).** Client reads `utm_source`/`utm_campaign`/`utm_*` on first visit and stores in cookie/localStorage; on user creation (here in P1 for the seed/test member, and at the Stripe webhook in P4) persist into `User.acquisitionSource`/`acquisitionCampaign`. *(P1 = client first-touch capture in `attribution.ts`; server-side persistence lands with the Stripe webhook in P4.)* ~Zero build cost, high value: without it the YouTube→site funnel runs blind (can't tell which video converts a subscriber). Must exist **before** the channel starts sending traffic. (Not "Priority Zero" over auth/billing — it's a cheap seam that just needs to be live by funnel go-live.)
- **Done when:** members log in, protected routes redirect, admin gate works, soft-deleted users are blocked.

> Note: `Subscription` and `temAcessoAtivo()` are NOT built here — they are born with Stripe in Phase 4. Phase 1 stays lean (identity + shell). The `User` already carries its optional fields so it never needs reshaping later.

## Phase 2 — Content Model (Courses / Modules / Lessons) + Trilhas  *(low–medium risk)*

- [x] Prisma models: `Course`, `Module`, `Lesson` (+ RLS on each) ; migration
- [ ] **`Lesson` is first-class & searchable** (own title + tags) — a lesson can appear in
      results and inside a trilha on its own, not only nested in a course.
- [x] **Trilha entities** (the "currículo" — see JILSONAI.md → Trilhas): `LearningPlan`
      (`ownerUserId?` null = curated template, `isTemplate`, `skillsCovered[]`),
      `PlanModule` (grouping by competency), `PlanItem` (`itemType[COURSE|LESSON]`,
      `courseId?`/`lessonId?` — **free mix of whole courses + standalone lessons**) (+ RLS) ; migration
- [x] `core/schemas/` for course/module/lesson + **plan/planItem** + `core/constants/`
- [ ] Server routes: CRUD under `/api/courses`, `/api/modules`, `/api/lessons`,
      **`/api/trilhas`** (admin-protected for writes; a member can save/clone a curated trilha)
- [ ] **Keyword search** endpoint over trilhas/courses/lessons (semantic/IA search = JILSONAI Fase 4–5)
- [ ] Client: catalog page (trilhas + courses), course page, lesson list (no video yet)
- [ ] Admin: manage courses/modules/lessons **+ build curated trilhas** (Jilson = "IA v0")
- [ ] Seed the **Trilha 1 — Fundamentos (Excel + IA)** + its course structure

**Course-page fields + Metodologia 3 Camadas (mapped from competitor analysis Jun 2026 — see CLAUDE.md → Course page fields):**
- [x] `Course` fields: `subtitle?`, `description?`, `level?` (`INICIANTE|INTERMEDIARIO|AVANCADO`, `as const` in `core/`), `learnTags[]`, `requirements[]`, `personas[]`, `highlights[]` (`{icon,title,text}`), `faq[]?` (`{pergunta,resposta}` — optional per-course FAQ, renders only if filled), `thumbnailUrl?` (catalog image), `introVideoId?` (detail-page presentation video), `displayOrder`, `status` (`DRAFT|PUBLISHED|ARCHIVED`)
- [x] `Module`: `layer?` (`UNIVERSAL|MODERNO|IA`, optional), `displayOrder`, `status` ; `Lesson`: `displayOrder`, `status`
- [x] **3-camadas as `Course.camadas[]`** (array, NOT boolean — a course may have 1, 2 or 3 layers) + `camadaOverride?` (jsonb, per-course text exception) ; migration (+ RLS on new tables)
- [x] **Global layer config** in `core/` (icon `stack-2`/`bolt`/`sparkles` + name + blurb per layer) — written once, not per course. Blue `--primary` only on the `IA` layer.
- [ ] Client course-detail page: hero (title/subtitle/metadata strip — carga & lesson count **derived**), `highlights[]` icon cards, **3-camadas selo** (renders only the layers in `camadas[]`), `learnTags[]` as tag pills, `requirements[]` shown openly, `personas[]`, accordion (Module→Lesson), `faq[]` accordion (renders only if filled)
- [ ] Catalog/list shows `thumbnailUrl`; admin can set all the above per course
- **Done when:** the Excel + IA course AND a curated trilha are visible; a member can save a
      trilha; admin can edit; lessons are searchable on their own; the course-detail page renders
      highlights + the 3-camadas selo (only the marked layers) + pré-requisitos.

> Course-page seams (do NOT build at launch): `introVideoId` must play for **non-members** (sales asset, NOT gated by `temAcessoAtivo()`) — that wiring lands in **Phase 3** (Bunny); here `introVideoId` is just an optional string column. Per-layer **filter** ("só o que roda no meu Excel 2016") and **grouping the accordion by layer** = post-launch read-side. "Pergunte ao JilsonAI sobre este curso" on the course page = **post-launch** (JilsonAI is born in Phase 6); Phase 2 leaves only the conceptual space. Heavy social proof (vídeo-depoimento, mural de logos) = post-launch.
> Effort (per operator convention): schema/migration = **Extra high (Opus)**, low-risk (NOT a MAX moment like Stripe/Bunny); pure UI/React (course page, cards, pills, selo) = **AUTO** (saves quota).
> Language seam: content is modeled so language can become a LAYER later (a course can have content in N languages) — but build PT-only now. Do not build any multi-language content system yet.
> Trilha seam: curated and (future) AI-assembled plans are the SAME `LearningPlan` entity — only `ownerUserId`/`isTemplate` differ. AI-assembled plans (member describes a goal → JilsonAI builds a custom plan) land in JILSONAI Fase 4–5, no rewrite. Progress counts per `Lesson`.

## Phase 3 — Video Playback (Bunny Stream)  *(HIGH RISK — own sessions)*

- [ ] Bunny account + library; store video IDs on `Lesson`
- [ ] Server: issue short-lived **signed URLs**, member-only. **Elastic window (~6–12h) and NO
      IP-lock** — so the video doesn't break when the student switches Wi-Fi↔4G mid-lesson (classic
      mobile support ticket). *Inferência:* exact controls (path-token + expiry, optional IP) are
      Bunny's API — confirm flags at build. Trade-off accepted: no IP-lock slightly raises URL-share
      risk, mitigated by the short window + DRM + per-user signing. UX > marginal anti-piracy for a
      solo operator.
- [ ] Server: admin upload flow (or direct-to-Bunny + store reference)
- [ ] Client: gated player on the lesson page
- [ ] E2E: non-member cannot get a playable URL
- **Done when:** a member plays a lesson; a non-member is blocked. *Test the gate hard.*

## Phase 4 — Billing & Membership Gate (Stripe)  *(HIGH RISK — own sessions)*

- [ ] Stripe products/prices: **2 prices on one "Membership" product** — Mensal R$99,90 (sem
      fidelidade, padrão) + Anual ~R$995 (~17% off, cobrança única recorrente anual). **Sem free
      trial. Sem conteúdo grátis na escola.** Upgrade mensal→anual usa proration nativo do Stripe.
- [ ] `Subscription` model with growth seams: `ownerUserId?`, `organizationId?` (nullable), `seats` (default 1), `status` + Stripe columns (`stripeSubscriptionId`, `stripeCustomerId`, `currentPeriodEnd`) (+ RLS) ; migration
- [ ] `temAcessoAtivo(userId)` lib — individual path only (`assinaturaIndividualAtiva`); the single source of truth for access
- [ ] Checkout session endpoint; Customer Portal endpoint
- [ ] **Webhook handler** (subscription created/updated/canceled) → responds fast (200) then enqueues via pg-boss → CREATES user+subscription on first payment (replaces seed as the trigger) and syncs status; verify Stripe signature
- [ ] **"Force sync" fallback.** Function that re-queries the Stripe API (`subscriptions.retrieve`) and reconciles access, in case a webhook (pg-boss) ever fails — prevents the worst support case: a paying member locked out. **TRAVA:** admin-only OR a secure server scope (authenticated session). NEVER an unauthenticated GET that unlocks access — that would be a billing bypass.
- [ ] `requireActiveMembership` middleware (wraps `temAcessoAtivo`) gating content + video URLs
- [ ] On access loss: `session.deleteMany({ userId })` to force logout
- [ ] Client: pricing page, subscribe flow, manage-subscription (portal)
- [ ] **Offboarding screen before the Stripe Customer Portal (seam).** Intercepts "cancelar", collects the reason, then forwards to the Portal. **TRAVA (anti roach-motel — Procon/CDC sensibility already raised in pricing):** a clear **"cancelar mesmo assim"** is always visible, 1 click; calm tone, not retentive. **Phasing:** reason capture = **launch (lands with this screen in P4 / wired in P7)**; **"pausar 1 mês" = fast-follow post-launch** (*inferência:* uses Stripe native `pause_collection` — confirm at build). Do NOT build the pause for launch.
- [ ] E2E: subscribe → access granted; cancel → access revoked at period end
- **Done when:** paying members get access, status survives reload, webhooks reconcile truth.

## Phase 5 — Lesson Progress + Event Capture Foundation  *(low–medium risk)*

- [ ] `LessonProgress` (user×lesson, `completed`, `completedAt`) + RLS ; migration
- [ ] Endpoint: mark lesson watched; lesson list shows completion
- [ ] **Trilha completion:** a saved trilha is "complete" when all its `PlanItem` lessons are
      done (course-item = its lessons). Drives certificate eligibility (Phase 6.5).
- [ ] `LessonEvent` table (event-sourced: type, position, ts) + RLS — **capture only, no analytics yet**
- [ ] Client: fire PLAY/PAUSE/ENDED events from the player (cheap writes)
- **Done when:** "marquei como vista" works, trilha % completion shows, AND events are captured for future analytics.

## Phase 6 — JilsonAI (lean v1 + suporte)  *(medium risk)*  → ver **JILSONAI.md** (roadmap interno)

- [ ] JilsonAI Fases 0–3 (gateway, chat com contexto do curso, escalação humana, tools com
      escopo + msg privada). Inclui tool `recommendTrilha` (sugere trilha curada pelo objetivo).
- [ ] Anthropic SDK server-side only; rate-limited per member; chat panel in member area.
- **Done when:** members ask and get answers in Jilson's voice; unresolved → escalation; JilsonAI
      suggests a curated trilha by goal. (RAG, KB, montagem de plano por IA = JILSONAI Fase 4–5, pós-launch.)

## Phase 6.5 — Certificates (trilha + course completion)  *(low–medium risk — MVP: "escola nasce completa")*

- [ ] `Certificate` (user, planId/courseId, issuedAt, `nameSnapshot`, `skillsCovered[]`, **`isPublic` default false**) + RLS ; migration
- [ ] Server-side PDF on 100% completion of a trilha (or course). Name = trilha name; lists skills covered.
- [ ] If `User.name` missing at issue time, prompt the student for the name to print.
- [ ] **Public verifiable URL.** Route `/certificado/[id]` listing the `skillsCovered`, with Open Graph optimized for LinkedIn sharing → each graduate becomes an organic marketing vector and feeds the "emprego em empresa" angle (cert by competencies). **TRAVA:** student opt-in (`isPublic`, default false). The cert always exists; the public route is private/404 unless the student allows it (LGPD).
- **Done when:** completing a curated trilha issues a certificate PDF with name + competencies.

## Phase 7 — Launch Prep  *(medium risk)*

- [ ] Transactional emails (Resend): welcome, receipt, password reset (transactional ignores `marketingConsent`)
- [ ] LGPD: privacy policy, terms, consent, data export/delete path
- [ ] Error/loading states everywhere; security review (subagent) on auth/billing/video
- [ ] Performance pass (< 3s load); mobile responsive
- [ ] Founding-member offer wiring (scarcity for Udemy students)
- [ ] **Cancellation-reason capture wired.** The offboarding screen (P4) collects the reason on exit — cheap data, gold for churn. Connects to STRATEGY.md churn KPIs (winback, MRR-perdido). (Storage = a small `CancellationReason` row or a field on `Subscription`; reason capture ships at launch, the "pausar 1 mês" path stays fast-follow.)
- [ ] **🚀 GO-LIVE — desligar o gate "Em breve" (ÚLTIMA AÇÃO, sem deploy de código).** O site ao vivo está atrás de um gate pré-lançamento (público vê "Em breve"; operador acessa via `/__preview?token=<PREVIEW_TOKEN>`). Para abrir ao público: no Railway (projeto `jilsonsantana` → env `production` → service `jilsonsantana`), setar **`COMING_SOON=false`** (ou apagar a variável) → o serviço reinicia → público passa a ver o app real. Nenhum merge/código necessário. *(Mecanismo em [server/src/index.ts](../server/src/index.ts) + [client/public/coming-soon.html](../client/public/coming-soon.html); detalhe operacional na memória `coming-soon-gate`.)* **Fazer só quando o "Done when" abaixo estiver verde.**
- **Done when:** the Excel + IA course is buyable and watchable end to end. **→ LAUNCH**

---

## Post-MVP (additive modules — no rewrite)

- **Phase 8 — Analytics (read-side):** SQL functions + `/stats/*` endpoints derived from `LessonEvent` (watch time, drop-off, re-watch, engagement). Admin dashboard.
- **JilsonAI Fase 4–5 (RAG + montagem de plano por IA):** living KB (`promotedToKb` → `KbArticle`), RAG over transcripts, and **`buildLearningPlan`** (member describes a goal → JilsonAI assembles a custom trilha with free mix of courses+lessons, adapts to level, cert by competencies). See JILSONAI.md.
- **JilsonAI Fase 6 — Memory + proatividade** (winback engine). See JILSONAI.md.
- **Phase 11 — Live cohorts** (tier 2, Zoom)
- **Phase 12 — Corporate/B2B** (tier 3) — `organization` plugin + Stripe quantity-based (per-seat) subscriptions + self-service packages (10, 30, configurable). A corporate student is a NORMAL student (own login, progress, certificate); only the access source (org subscription) and who paid/configured differ. Anti-sharing (emailOtp + session limit) also lands around here.

> **Removidos do roadmap (decisões deste ciclo):**
> - *Community como fórum de pares* — **dissolvido no JilsonAI** (suporte inteligente + escalação) + anúncios. Não há fórum a construir. (Um `Profile` social só nasce se/quando houver feature social futura.)
> - *Certificados* — **puxados pro MVP** (Phase 6.5), a escola nasce completa.
> - *EN phase / canal YouTube EN* — **removido.** Escola e YouTube ficam PT; inglês só via tentativa LinkedIn Learning (quando C1). O seam `User.preferredLanguage="pt"` fica dormente (custo zero), mas não há expansão EN planejada para a escola.

---

## Branching workflow (all phases)

- Work on `dev`. Test locally: build + server boot + `/api/health` + the phase's key flow.
- Merge to `main` only when green. `main` auto-deploys to Railway, so it is "sacred."
- PR + CI gate + automated Claude review: adopted in a later phase (when there are tests to gate on); until then, `dev → main` after local testing.

## Critical-path note for the 2–3 month launch

MVP = **Phases 0 → 7** (incl. trilhas curadas na Phase 2, certificados na Phase 6.5). The two HIGH-RISK phases (3 Bunny, 4 Stripe) hold ~70% of the risk — schedule them as dedicated sessions and test the access gates aggressively (member can, non-member cannot, status survives reload). Analytics, live cohorts, corporate, and JilsonAI RAG/plan-builder are intentionally post-launch so the school goes live faster. **Community as a forum was removed (JilsonAI absorbs it), not deferred.**


---
*Atualizado: Jun 2026 — trilhas (LearningPlan/PlanModule/PlanItem) entram na Fase 2; aula vira first-class pesquisável; certificados puxados pro MVP (Fase 6.5); pricing mensal-sem-fidelidade + anual + 2 prices Stripe (Fase 4); comunidade-fórum removida (JilsonAI absorve); EN/Phase 13 removida. Ver JILSONAI.md p/ trilhas curadas vs montagem por IA.*
*Atualizado: Jun 2026 (rev. externa Gemini) — seams de engenharia distribuídos por fase, sem inflar o MVP (0–7): UTM capture (P1), signed URL elástico sem IP-lock (P3), force-sync Stripe + offboarding screen anti roach-motel (P4), certificado público opt-in (P6.5), captura de motivo de cancelamento no launch + "pausar 1 mês" como fast-follow (P7). Auto-ingestão de LessonChunks fica PARQUEADA na Fase 5 (RAG, pós-MVP) — não construir, não puxar pra frente.*
*Atualizado: Jun 2026 — **Fase 2 ganhou a página de curso** (mapeada da análise Mosh/Xperiun/Hashtag): campos do Course (subtitle, level, learnTags, requirements mostrados, personas, highlights c/ ícone, thumbnailUrl=lista, introVideoId=detalhe, displayOrder, status) + Module/Lesson (displayOrder, status). **Metodologia 3 Camadas** = selo opcional via `Course.camadas[]` (não-boolean; curso pode ter 1–3 camadas) + textos globais em core/ + `camadaOverride?` (exceção, ex. N8N). Enum UNIVERSAL/MODERNO/IA, ícones stack-2·bolt·sparkles (azul só na IA). Seams pós-launch: introVideoId não-gated (wiring P3), filtro/agrupamento por camada, "pergunte ao JilsonAI" na página de curso (P6), prova social pesada.*
*Atualizado: Jun 2026 — FAQ por curso adicionada como `Course.faq[]` **opcional** (renderiza só se preenchida; JilsonAI é a FAQ viva; preencher por exceção, não obrigatório — evita burnout no catálogo amplo).*
