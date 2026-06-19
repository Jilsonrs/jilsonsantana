# jilsonsantana.com — Project Scope

## Problem

Jilson has 100,000+ students on Udemy, a growing YouTube audience, and the "Formação Especialista" brand — but no platform he owns. Udemy keeps 50–75% of revenue, controls pricing, owns the student relationship, and can't offer continuously updated content, community, direct support, or an AI assistant. He needs a platform he owns that turns his audience into recurring members, run sustainably by one person.

## Solution

A subscription learning platform — a single, accessible membership that bundles **courses + community + JilsonAI**. The site converts YouTube/Udemy audience into members and gives them recurring value Udemy can't match. Built modular so it can start simple and grow (analytics, live cohorts, corporate) without rewrites.

## Who It's For

- **Member** — pays the monthly/annual membership; watches courses, marks progress, asks JilsonAI, participates in community, earns certificates.
- **Admin (Jilson)** — manages courses/modules/lessons, uploads video, sees members and basic stats.
- **Visitor** — lands from YouTube/Udemy, sees the offer, signs up.

## Core Features (MVP — launch in 2–3 months)

- Sign up / log in (email + password)
- Single membership subscription via Stripe — **Mensal R$99,90 (sem fidelidade) + Anual ~R$995 (~17% off); sem free trial; sem conteúdo grátis na escola.** Access gated by active subscription.
- Course catalog → course → module → lesson structure; **lessons are first-class & searchable**
- **Trilhas (curadas):** Jilson curates a few guided tracks (a `LearningPlan` = ordered mix of courses + standalone lessons). A member can save a curated trilha as their own; it tracks progress and issues a certificate on completion. (AI-assembled personalized plans = post-MVP / JilsonAI Fase 4–5.)
- Gated video playback (member-only, protected URLs)
- "Mark lesson as watched" + progress shown in the lesson list and per trilha
- **Certificates** — server-side PDF on trilha/course completion (name + skills covered)
- JilsonAI — teaching assistant in Jilson's voice (lean v1) **+ support front door**: answers, escalates unresolved questions to Jilson, handles operational questions (certificate name/dates), and suggests a curated trilha by goal
- **"Comunidade" = JilsonAI support + direct channel to Jilson + announcements** (NOT a peer forum — deliberately, to stay sustainable solo)
- Admin: manage courses/modules/lessons, **build curated trilhas**, upload video, list members
- Account page: manage subscription (Stripe Customer Portal), log out
- Transactional emails (welcome, receipts, password reset)

## Post-MVP (modular additions, no rewrite)

- **Analytics** — watch time, drop-off, re-watch, engagement (built on captured lesson events)
- **JilsonAI Fase 4–6** — living knowledge base, RAG over transcripts, **AI-assembled personalized trilhas** (`buildLearningPlan`: free mix of courses+lessons, adapts to level, cert by competencies), memory + proactive winback. See JILSONAI.md.
- **Value ladder tier 2** — live cohorts (Zoom), higher price
- **Value ladder tier 3** — corporate/B2B

## Membership Tiers (value ladder)

- **Tier 1 — Membership (base):** R$99,90/month (annual 12x + monthly). Courses + community + JilsonAI. Accessible to everyone — this is the mission.
- **Tier 2 — Live cohorts:** higher price, live classes (post-MVP).
- **Tier 3 — Corporate (B2B):** high ticket (post-MVP).

Base stays accessible; upper tiers carry the high ticket.

## Content Slate (first courses)

First course at launch: **Excel + IA**, packaged inside **Trilha 1 — Comece por aqui (Fundamentos)**. Then: PL-300, Google Antigravity, SQL + Claude, AI + Claude, Data Modeling, Python + Claude, N8N — organized into a few curated **trilhas** (Fundamentos · Business Intelligence · Dados + Código · Automação & IA). Through-line: *data in the AI era* ("X + Claude").

## Roles

- **member** — default on signup. Access to content depends on active subscription.
- **admin** — Jilson. Full content management. Seeded, not self-registered.

## Non-Goals (deliberately out of scope)

- No gamification (kept simple to run solo).
- No consulting / freelancer / portfolio features.
- Not Teachable — custom-built as an owned, transferable asset.
- No Supabase Auth / Data API / Realtime (auth is Better Auth via Prisma).

## Guiding Constraints

- **One operator, sustainable at 47.** Every feature must be maintainable solo. Prefer battle-tested libraries over custom code.
- **Accessibility is a value.** Base price stays low; revenue scales via the value ladder, never by raising the base.
- **Modular growth.** Start simple; each new capability is an additive module, never a rewrite.
- **Launch infra cost < ~$30/month.**
