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
- Single membership subscription (monthly + annual) via Stripe; access gated by active subscription
- Course catalog → course → module → lesson structure
- Gated video playback (member-only, protected URLs)
- "Mark lesson as watched" + progress shown in the lesson list
- JilsonAI — teaching assistant in Jilson's voice (lean v1 at launch)
- Admin: manage courses/modules/lessons, upload video, list members
- Account page: manage subscription (Stripe Customer Portal), log out
- Transactional emails (welcome, receipts, password reset)

## Post-MVP (modular additions, no rewrite)

- **Analytics** — watch time, drop-off, re-watch, engagement (built on captured lesson events)
- **Community** — simple member space
- **Certificates** — server-side PDF on course completion
- **Value ladder tier 2** — live cohorts (Zoom), higher price
- **Value ladder tier 3** — corporate/B2B
- **EN phase** (2027+)

## Membership Tiers (value ladder)

- **Tier 1 — Membership (base):** R$99,90/month (annual 12x + monthly). Courses + community + JilsonAI. Accessible to everyone — this is the mission.
- **Tier 2 — Live cohorts:** higher price, live classes (post-MVP).
- **Tier 3 — Corporate (B2B):** high ticket (post-MVP).

Base stays accessible; upper tiers carry the high ticket.

## Content Slate (first courses)

First course at launch: **Excel + IA**. Then: PL-300, Google Antigravity, SQL + Claude, AI + Claude, Data Modeling, Python + Claude, N8N. Through-line: *data in the AI era* ("X + Claude").

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
