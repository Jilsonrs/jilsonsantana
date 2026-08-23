# jilsonsantana.com — Implementation Plan

> Phases are ordered by dependency. Each phase is sliced into **session-sized tasks**
> (each checkbox ≈ one focused working block, safe to stop after a commit).
> Rule: never end a session with broken code on `main`. Work on the `dev` branch,
> commit small functional steps to `dev`; merging `dev → main` is the operator's
> explicit decision at the end of a phase — green CI is the floor that makes a merge
> eligible, never the trigger (see CLAUDE.md).
> **HIGH-RISK phases are marked** — give them their own sessions, don't rush.
>
> **Every block plan states, before any code is written:** the sliceable
> task, the files it will touch, new runtime dependencies (if any), and
> `Docs check (context7): <surface> → <pinned ID> → <what was verified>`
> — or `Docs check (context7): not triggered`. See the Context7 block in
> CLAUDE.md for the trigger surfaces.

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
- [x] **`Lesson` is first-class & searchable** (own title + tags) — a lesson can appear in
      results and inside a trilha on its own, not only nested in a course.
- [x] **Trilha entities** (the "currículo" — see JILSONAI.md → Trilhas): `LearningPlan`
      (`ownerUserId?` null = curated template, `isTemplate`, `skillsCovered[]`),
      `PlanModule` (grouping by competency), `PlanItem` (`itemType[COURSE|LESSON]`,
      `courseId?`/`lessonId?` — **free mix of whole courses + standalone lessons**) (+ RLS) ; migration
- [x] `core/schemas/` for course/module/lesson + **plan/planItem** + `core/constants/`
- [x] Server routes: CRUD under `/api/courses`, `/api/modules`, `/api/lessons`,
      **`/api/trilhas`** (admin-protected for writes; a member can save/clone a curated trilha)
- [x] **Keyword search** endpoint over trilhas/courses/lessons (semantic/IA search = JILSONAI Fase 4–5)
- [x] Client: catalog page (trilhas + courses), course page, lesson list (no video yet)
- [x] Admin: manage courses/modules/lessons (Bloco 6a)
- [ ] Admin: **build curated trilhas** (Bloco 6b, Jilson = "IA v0")
- [ ] Seed the **Trilha 1 — Fundamentos (Excel + IA)** + its course structure

**Course-page fields + Metodologia 3 Camadas (mapped from competitor analysis Jun 2026 — see CLAUDE.md → Course page fields):**
- [x] `Course` fields: `subtitle?`, `description?`, `level?` (`INICIANTE|INTERMEDIARIO|AVANCADO`, `as const` in `core/`), `learnTags[]`, `requirements[]`, `personas[]`, `highlights[]` (`{icon,title,text}`), `faq[]?` (`{pergunta,resposta}` — optional per-course FAQ, renders only if filled), `thumbnailUrl?` (catalog image), `introVideoId?` (detail-page presentation video), `displayOrder`, `status` (`DRAFT|PUBLISHED|ARCHIVED`)
- [x] `Module`: `layer?` (`UNIVERSAL|MODERNO|IA`, optional), `displayOrder`, `status` ; `Lesson`: `displayOrder`, `status`
- [x] **3-camadas as `Course.camadas[]`** (array, NOT boolean — a course may have 1, 2 or 3 layers) + `camadaOverride?` (jsonb, per-course text exception) ; migration (+ RLS on new tables)
- [x] **Global layer config** in `core/` (icon `stack-2`/`bolt`/`sparkles` + name + blurb per layer) — written once, not per course. Blue `--primary` only on the `IA` layer.
- [x] Client course-detail page: hero (title/subtitle/metadata strip — carga & lesson count **derived**), `highlights[]` icon cards, **3-camadas selo** (renders only the layers in `camadas[]`), `learnTags[]` as tag pills, `requirements[]` shown openly, `personas[]`, accordion (Module→Lesson), `faq[]` accordion (renders only if filled)
- [x] Catalog/list shows `thumbnailUrl`; admin can set all the above per course
- **Done when:** the Excel + IA course AND a curated trilha are visible; a member can save a
      trilha; admin can edit; lessons are searchable on their own; the course-detail page renders
      highlights + the 3-camadas selo (only the marked layers) + pré-requisitos.

> Course-page seams (do NOT build at launch): `introVideoId` must play for **non-members** (sales asset, NOT gated by `temAcessoAtivo()`) — that wiring lands in **Phase 3** (Bunny); here `introVideoId` is just an optional string column. Per-layer **filter** ("só o que roda no meu Excel 2016") and **grouping the accordion by layer** = post-launch read-side. "Pergunte ao JilsonAI sobre este curso" on the course page = **post-launch** (JilsonAI is born in Phase 6); Phase 2 leaves only the conceptual space. Heavy social proof (vídeo-depoimento, mural de logos) = post-launch.
> Effort (per operator convention): schema/migration = **Extra high (Opus)**, low-risk (NOT a MAX moment like Stripe/Bunny); pure UI/React (course page, cards, pills, selo) = **AUTO** (saves quota).
> Language seam: content is modeled so language can become a LAYER later (a course can have content in N languages) — but build PT-only now. Do not build any multi-language content system yet.
> Trilha seam: curated and (future) AI-assembled plans are the SAME `LearningPlan` entity — only `ownerUserId`/`isTemplate` differ. AI-assembled plans (member describes a goal → JilsonAI builds a custom plan) land in JILSONAI Fase 4–5, no rewrite. Progress counts per `Lesson`.

### Estado real da Fase 2 (Jun 2026) + checklist de continuidade

> Esta seção existe pra qualquer chat/agente novo retomar o trabalho **só lendo este doc**, sem
> precisar do histórico da conversa que a gerou. Atualize-a conforme for fechando os itens.

**Confirmado funcionando (commitado em `dev`, testado em browser real, typecheck/lint/test
verdes):** Blocos 1–4 (modelo de dados, read API, CRUD admin via API, autoria de trilha via API,
busca por keyword); Bloco 5 (catálogo `/cursos`, página de curso `/curso/:slug`, página de trilha
`/trilha/:slug`, busca embutida, botão salvar-trilha); Bloco 6a (admin de curso/módulo/aula em
`/admin/cursos`).

**Checklist — fechar o Bloco 5 100% (achados de auditoria Jun 2026, ainda NÃO corrigidos):**
cada item abaixo já tem o arquivo e o fix apontados — quem for implementar não precisa reabrir a
investigação.
- [ ] `SaveTrilhaButton` não reflete uma trilha já salva em sessão anterior — só usa o estado local
      da mutation (`mutation.isSuccess`), nunca consulta `GET /api/trilhas/mine` (existe desde o
      Bloco 3b). Ao recarregar a página, um membro que já salvou volta a ver "Salvar trilha".
      Arquivo: `client/src/components/content/SaveTrilhaButton.tsx`.
- [ ] Aula isolada (`PlanItem` tipo `LESSON`) dentro de uma trilha não mostra contexto nenhum —
      vira texto solto sem curso/módulo. Falta `module: { select: { title, course: { select:
      { slug, title } } } }` no `select` de `lesson` dentro de `itemInclude`, em
      `server/src/routes/trilhas.ts` (usado por TODAS as leituras de trilha — curada e mine).
      Depois, `PlanItemRow` em `client/src/pages/TrilhaDetailPage.tsx` passa a linkar a aula
      isolada pro curso-pai (mesmo padrão que a busca já usa: aula → curso, não aula → aula,
      que ainda não tem página própria, Fase 3).
- [ ] Sem tela "Minhas trilhas" — a leitura já existe (`GET /trilhas/mine`, `GET
      /trilhas/mine/:id`, Bloco 3b), só falta a UI. Sem ela, salvar uma trilha é um beco sem
      saída (o membro não acha de novo). Precisa: `getMyTrilhas()`/`getMyTrilha(id)` em
      `client/src/lib/api.ts`; `client/src/pages/MyTrilhasPage.tsx` (`/minhas-trilhas`, dentro de
      `ProtectedRoute`) + `MyTrilhaDetailPage.tsx` (`/minhas-trilhas/:id`); extrair o accordion
      PlanModule→PlanItem de `TrilhaDetailPage.tsx` pra um componente compartilhado (reusado pela
      trilha curada e pela trilha própria); link "Minhas trilhas" no `Layout.tsx` (qualquer
      logado, não só admin).
- [ ] Selo 3-camadas e "Diferenciais" (highlights) sem heading de seção em
      `client/src/pages/CourseDetailPage.tsx` — os dois blocos de cards (ícone+título+texto) ficam
      empilhados sem título, parecem duplicados (achado nas capturas desktop/mobile).
- [ ] (bônus, baixa prioridade) sem link "← Catálogo" no topo de `CourseDetailPage`/
      `TrilhaDetailPage` — hoje só dá pra voltar pelo nav ("Catálogo") ou botão do browser.

**Achados P1 do `security-vulnerability-reviewer` (Ago 2026, HEAD `a5f7d77`) — código DESTA fase,
fecham com ela.** Os dois furam a mesma convenção (CLAUDE.md → Server: "public reads return
`PUBLISHED` content only"). Nenhum está *ativo* com o seed atual — os caminhos de código estão.
- [ ] `GET /api/trilhas/:slug` (`server/src/routes/trilhas.ts:26`, usado em `:122`) — `itemInclude`
      resolve `course`/`lesson` de cada `PlanItem` **sem filtro de status**, em rota pública sem
      auth. Cenário: a trilha é montada antes do curso ir ao ar (fluxo normal) → visitante anônimo
      recebe `id`, `slug`, `title`, `subtitle`, `level`, `thumbnailUrl`, `camadas` de curso
      `DRAFT`/`ARCHIVED`. O predicado transitivo correto já existe em
      `server/src/routes/search.ts:61` — espelhar. Filtrar no nível do `PlanItem` (relação to-one
      no Prisma não aceita `where`), mantendo a variante sem filtro só para leitura admin/owner.
- [ ] `POST /api/trilhas/:id/save` (`server/src/routes/trilhas.ts:211`) — rejeita só
      `!template.isTemplate`, **não checa `status`**. Qualquer usuário autenticado (não precisa ser
      admin) itera ids e clona trilha curada ainda em `DRAFT`; o clone nasce `PUBLISHED` (`:233`) e
      a árvore inteira fica legível em `GET /api/trilhas/mine/:id` (`:110`), que também não filtra.
      Regra "só PUBLISHED" contornada por um endpoint de **escrita**. Fix: `status: PUBLISHED` no
      `where` do template (ou `findFirst`), 404 caso contrário.

**O que falta na Fase 2 depois do Bloco 5 fechado:**
- [ ] Bloco 6b — UI de montagem de trilha curada (admin): `GET /api/admin/trilhas` +
      `GET /api/admin/trilhas/:id` novos (espelho admin, qualquer status, mesmo padrão do Bloco
      6a); `/admin/trilhas`, `/admin/trilhas/novo`, `/admin/trilhas/:id`; árvore inline
      PlanModule→PlanItem com reordenar ↑/↓; ao adicionar um PlanItem tipo LESSON, dois selects
      dependentes (curso → aula daquele curso).
- [ ] Autoria real da **Trilha 1 — Fundamentos (Excel + IA)** pelo admin, pela UI (não é bloco de
      código — é o operador usando o Bloco 6a/6b prontos; o seed atual é só smoke descartável).

**Backlog de polish (sem dono de bloco ainda — não bloqueia o fechamento da Fase 2, mas precisa
de uma sessão própria antes do launch):**
- [ ] Fotos/imagens reais (thumbnails de curso, qualquer asset de marca) — hoje tudo usa
      placeholder (`BookOpen` icon quando `thumbnailUrl` é nulo).
- [ ] A direção visual completa de `docs/design.md` (paleta off-white `--surface-alt`, fontes
      MuseoModerno/Hanken Grotesk, o hero animado "trilha que se monta sozinha") ainda não foi
      implementada — o client hoje usa os tokens default do shadcn (`zinc`) só com `--primary`
      trocado pro azul da marca. Isto já está anotado no código
      (`client/src/index.css`: "the full design.md palette/fonts land in the later design pass") —
      não é uma divergência nova, é um adiamento já decidido.
- [ ] Navegação mobile mais elaborada se o menu crescer (hoje é só uma lista horizontal de
      botões no header — funciona bem nas larguras testadas, mas não tem um padrão de menu
      hambúrguer se mais itens entrarem).
- [ ] Qualquer ajuste visual que só aparece usando o produto de verdade com conteúdo real (não o
      smoke seed) — preencher conforme for revisando.

## Phase 3 — Video Playback (Bunny Stream)  *(HIGH RISK — own sessions)*

- [ ] **Infra (pré-requisito da fase): migrations em prod via pre-deploy.** Configurar
      `npx prisma migrate deploy` como **pre-deploy command** do Railway (railway.json /
      service settings) — roda 1× por deploy, antes da instância nova subir. NUNCA no
      entrypoint do Docker (re-executaria a cada restart) e nunca `migrate dev` contra prod.
      Validar com a primeira migration desta fase. (Convenção no CLAUDE.md → Database & Migrations.)
- [ ] Bunny account + library; store video IDs on `Lesson`
- [ ] **TRAVA (achado do `security-vulnerability-reviewer`, Ago 2026):** o campo de vídeo de
      **membro** nasce em **coluna PRÓPRIA** — **nunca** reaproveitar `Course.introVideoId`.
      `introVideoId` sai hoje na resposta pública de `GET /api/courses/:slug`, e isso está
      **correto** (vídeo de intro é ativo de venda, não-gated — TRAVA do CLAUDE.md → Course page
      fields). Justamente por isso, pendurar vídeo gated na mesma coluna = vazamento silencioso:
      a rota pública continua servindo o id sem nenhum erro aparecer. Relacionado: trocar o
      `include` por `select` explícito nessa rota **antes** de adicionar colunas de vídeo
      (ver backlog P2 na Fase 7) — com `include`, qualquer coluna nova entra na resposta pública
      automaticamente.
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

## Phase 4 — Billing & Membership Gate (Stripe Payments + Stripe Billing)  *(HIGH RISK — own sessions)*

> **Decisão revista Ago 2026:** usamos **Stripe Billing** para operar a recorrência, mantendo
> **Payment Element embutido** e **sem Customer Portal**. O aluno continua sem sair do site.
> Ver `tech-stack.md` → Billing. O risco desta fase mudou de lugar: saiu da *mecânica de
> cobrança* (agora é da Stripe) e concentrou-se na **fronteira de acesso** — é lá que o teste
> tem que ser duro.

`Docs check (context7)`: **obrigatório** nesta fase — Stripe → `/websites/stripe`. Preencher no
plano de cada bloco antes de escrever código (CLAUDE.md → Context7).

- [ ] **Setup no dashboard (sem código):** Payments Plano Padrão (conta MEI/CNPJ, payout Banco do Brasil) + **Stripe Billing ativado**. Produto **"Assinatura"** com **2 `Price`**: Mensal R$99,90 (sem fidelidade) / Anual ~R$995 (~17% off). Sem free trial, sem conteúdo grátis. **Sem Customer Portal.**
- [ ] **Configurar Smart Retries + automações de recuperação** conforme a política de produto abaixo. Isto é **configuração, não código**.
- [ ] **Política de dunning (decisão NOSSA, executada pela Stripe):** falha na renovação → retries automáticos → corte. **Acesso MANTIDO durante toda a janela de retry** (`past_due`) — churn involuntário é a maior alavanca (strategy.md §6). Corte no fim da janela → `unpaid`/`canceled` + `session.deleteMany`. Ajustar a janela é mudança de configuração. *Confirmar os intervalos exatos que a Stripe expõe na abertura da fase, via context7.*
- [ ] **Checkout embutido (Payment Element).** Cria `Customer` + `Subscription` na Stripe e confirma o primeiro pagamento na própria página. O dado do cartão vai direto pro Stripe (não toca nosso servidor). **`requires_action`/3DS é tratado pelo Element no fluxo de assinatura.**
- [ ] `Subscription` model = **espelho local** (o gate lê daqui) com growth seams: `ownerUserId?`, `organizationId?` (nullable), `seats` (default 1), `status`, `currentPeriodEnd`, `stripeCustomerId`, **`stripeSubscriptionId` (obrigatório — é a chave do objeto canônico)** (+ RLS); migration
- [ ] `temAcessoAtivo(userId)` lib — caminho individual (`assinaturaIndividualAtiva`); **fonte única de verdade do acesso para a aplicação**, lida do espelho local. *(A verdade canônica é a `Subscription` da Stripe; o espelho é o que o gate consulta em tempo de request.)*
- [ ] **Webhook handler** dos eventos de assinatura (`customer.subscription.created/updated/deleted`, `invoice.paid`, `invoice.payment_failed`) → responde rápido (200) → enfileira via pg-boss → CRIA user+subscription no primeiro pagamento (substitui o seed) e sincroniza o espelho; **verifica assinatura do Stripe**
- [ ] **TRAVA de montagem (achado do `security-vulnerability-reviewer`, Ago 2026):** a rota do
      webhook Stripe é montada **ACIMA** de `express.json()` (`server/src/index.ts:38`) — junto do
      handler do Better Auth, que já vive lá por essa mesma razão — ou com `express.raw`. Se o body
      chegar já parseado, a verificação de assinatura (`constructEvent`) falha **em silêncio**: o
      raw body não é mais recuperável e a checagem passa a validar algo que não é o payload
      original. Hoje os routers de API são montados depois da linha 38 (`:41-50`), então o padrão
      default do repo é o errado para esta rota.
- [ ] **Idempotência + order-safety (TRAVA):** registrar `event.id` processados (repetido = no-op); eventos podem chegar fora de ordem → em qualquer dúvida, `subscriptions.retrieve` e **recomputar** o espelho, nunca confiar no snapshot do payload.
- [ ] **"Force sync" fallback.** `subscriptions.retrieve` + recomputa o espelho, caso um webhook (pg-boss) falhe — evita o pior caso de suporte: assinante pagante trancado pra fora. **TRAVA:** admin-only OU escopo de servidor seguro. NUNCA um GET não autenticado que libere acesso — seria bypass de billing.
- [ ] **Alerta de falha (detecção, não só retry):** qualquer job que esgote os retries do
      pg-boss nas filas de billing/webhook → e-mail imediato pro admin via Resend
      (fila `admin-alerts`). O force-sync é a *recuperação*; este alerta é como o operador
      fica sabendo que precisa dela — assinante pagante trancado é descoberto por nós,
      nunca pelo aluno. (Convenção no CLAUDE.md → Background Jobs.)
- [ ] `requireActiveMembership` middleware (wraps `temAcessoAtivo`) gating content + video URLs
- [ ] On access loss: `session.deleteMany({ userId })` to force logout
- [ ] Client: pricing page + **checkout embutido (Payment Element)** + **tela de gestão de assinatura DENTRO da escola** (trocar cartão, ver próxima cobrança, mudar mensal↔anual, cancelar) — substitui o Customer Portal, chamando a Subscriptions API. *Mostrar a proração da Stripe **previsualizada** antes de confirmar a troca de plano.*
- [ ] **Tela de offboarding antes do cancelamento (seam).** Intercepta "cancelar", coleta o motivo, depois executa `cancel_at_period_end` (não recobra; acesso segue até o fim do período pago). **TRAVA (anti roach-motel — sensibilidade Procon/CDC já levantada no pricing):** "cancelar mesmo assim" sempre visível, 1 clique; tom calmo, não retentivo. **Faseamento:** captura de motivo = **launch**; **"pausar 1 mês" (pause collection da Stripe) = fast-follow.** Não construir a pausa no launch.
- [ ] E2E: assinar → acesso liberado; renovação → período estende; cancelar → acesso revogado no fim do período; **pagamento falhado → `past_due` com acesso MANTIDO → corte no fim da janela**; webhook duplicado → no-op; webhook fora de ordem → espelho correto após `subscriptions.retrieve`; assinatura inválida de webhook → 400
- **Done when:** paying members get access, status survives reload, webhooks reconcile truth, **and a non-member cannot reach gated content by any path.**

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
- [ ] **Certificate-as-media upgrade (same phase, small):** dedicated **OG image** rendered
      server-side alongside the PDF (wordmark + student name + trilha + skills — Apple-clean, spec
      in DESIGN.md §6); **"Add to LinkedIn"** button (Add-to-Profile deep-link, pre-filled); every
      link back to the site carries **`utm_source=certificate`** → closes the loop with P1
      attribution capture and makes each graduate a *measurable*, CAC-zero acquisition channel.
      Opt-in gate (`isPublic`) unchanged.
- **Done when:** completing a curated trilha issues a certificate PDF with name + competencies.

## Phase 7 — Launch Prep  *(medium risk)*

- [ ] Transactional emails (Resend): welcome, receipt, password reset (transactional ignores `marketingConsent`)
- [ ] LGPD: privacy policy, terms, consent, data export/delete path
- [ ] Error/loading states everywhere; security review (subagent) on auth/billing/video
- [ ] **Rate-limit de auth — VERIFICAR a borda ANTES de escrever código** (achado do
      `security-vulnerability-reviewer`, Ago 2026). `rateLimit` está ligado em produção
      (`server/src/lib/auth.ts:72`), mas sem `advanced.ipAddress` o Better Auth lê
      `x-forwarded-for` e usa o **primeiro** elemento — o que o cliente controla quando a borda
      **anexa** em vez de sobrescrever. Nesse caso o atacante varia o header e faz brute-force
      ilimitado contra o e-mail do admin em `/api/auth/sign-in/email`, o único caminho de entrada
      (`disableSignUp: true`). A convenção "rate-limit auth routes in production" fica satisfeita
      na letra e **vazia no efeito**. Passo 1: confirmar qual header a Railway garante sobrescrever
      (não presumir). Se houver, fixar em `advanced: { ipAddress: { ipAddressHeaders: [...] } }`;
      se não houver, `express-rate-limit` à frente de `app.all("/api/auth/{*any}")` com
      `app.set('trust proxy', <hops>)`.
- [ ] **CI não roda testes** (`.github/workflows/ci.yml:20-42`; não existe script `test` no
      `package.json` raiz). Hoje o workflow faz `npm ci` + build do core + typecheck + build. As
      suítes que cobrem a fronteira (`AdminRoute.test.tsx`, `ProtectedRoute.test.tsx`) e o E2E de
      auth **nunca executam** em push nem PR — dá pra remover a checagem de `Role.ADMIN` e o CI
      fica verde. Contradiz CLAUDE.md → Quality Gates ("lint + typecheck + tests on push") e a
      seção Commands, que lista `npm run test` como gate local igual ao CI. Fix: script `test` na
      raiz + step no `ci.yml`; E2E como job separado quando houver banco no CI (declarar no plano
      do bloco, não deixar implícito).
- [ ] **Backlog P2 do `security-vulnerability-reviewer` (7 itens — nenhum bloqueia merge, todos
      antes do primeiro aluno pagante):**
      (1) **sem teste de fronteira no servidor** — não há suíte no workspace `server`; o E2E só
      assere redirect do React Router, que é guarda cosmético do client. Falta a matriz
      401/403/200 em `/api/me`, `/api/admin/ping`, writes de curso, e `/api/courses` excluindo o
      curso `DRAFT` semeado (CLAUDE.md → Testing: happy-path-only num gate não conta).
      (2) **`include` em vez de `select`** nas rotas públicas de detalhe (`courses.ts:54`,
      `trilhas.ts:126`) — devolve todas as escalares (`status`, `createdAt`, `ownerUserId`,
      `sourcePlanId`) e qualquer coluna futura entra sozinha. Pré-requisito da Fase 3.
      (3) **`PREVIEW_TOKEN` em query string** (`index.ts:80-92`) — aparece em log de proxy,
      histórico e `Referer`; comparação não é de tempo constante; `PREVIEW_TOKEN` e `COMING_SOON`
      não constam no `server/.env.example`.
      (4) **escritas admin fora do prefixo `/api/admin/*`** (`courses.ts:138,150,171`,
      `modules.ts:14,25,39`, `lessons.ts:44,55,69`, `trilhas.ts:139`) — todas corretamente atrás de
      `requireAdmin`, custo é de auditabilidade: "essa rota é admin?" deixa de ser respondível pelo
      path. Mover ou registrar a exceção como decisão do operador — não deixar leitura em
      `/admin/courses` e escrita em `/courses` no mesmo router.
      (5) **`_prisma_migrations` provavelmente sem RLS** — criada pelo Prisma fora das migrations
      versionadas. As 10 tabelas de domínio estão cobertas. Confirmar com
      `get_advisors(type='security')`; se aparecer, migration só com o `ENABLE ROW LEVEL SECURITY`.
      (6) **`lint` é alias de `tsc --noEmit`** (`client/package.json:11`, `server/package.json:11`)
      — não existe ESLint no repo, então "no `any`" do CLAUDE.md não tem enforcement automático
      (hoje o código de auth está limpo; nada impede a regressão). Ou instalar
      `typescript-eslint` com `no-explicit-any: error`, ou renomear o script e ajustar
      CLAUDE.md/CI — o gate não pode mentir sobre o que executa.
      (7) **`server/src/seed.ts:101`** — `console.error("Seed failed:", err)` despeja o erro
      inteiro de um caminho que passa por `signUpEmail({ body: { email, password, name } })`; se o
      `APIError` do Better Auth carregar o body, a senha vai em claro pro stdout. *Suspeita, não
      confirmada por leitura estática.*
- [ ] Performance pass (< 3s load); mobile responsive
- [ ] Founding-member offer wiring (scarcity for Udemy students)
- [ ] **Cancellation-reason capture wired.** The offboarding screen (P4) collects the reason on exit — cheap data, gold for churn. Connects to STRATEGY.md churn KPIs (winback, MRR-perdido). (Storage = a small `CancellationReason` row or a field on `Subscription`; reason capture ships at launch, the "pausar 1 mês" path stays fast-follow.)
- [ ] **Upgrade Supabase Free → Pro ANTES do primeiro aluno pagante** (backups diários; o Free
      não garante backup automático — confirmar a política vigente no dia). Dado real de aluno
      nunca fica em banco sem backup. Custo já previsto (~$25/mo, dentro do teto de infra).
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
- `main` auto-deploys to Railway, so it is "sacred" — only tested code reaches it. Green lint/typecheck/tests is the floor that makes a merge *eligible*, never the trigger: merging `dev → main` is the operator's explicit decision at the end of a phase (see CLAUDE.md → Working Method).
- PR + CI gate + automated Claude review: adopted in a later phase (when there are tests to gate on); until then, `dev → main` is a manual merge the operator authorizes after local testing.

## Critical-path note for the 2–3 month launch

MVP = **Phases 0 → 7** (incl. trilhas curadas na Phase 2, certificados na Phase 6.5). The two HIGH-RISK phases (3 Bunny, 4 Stripe) hold ~70% of the risk — schedule them as dedicated sessions and test the access gates aggressively (member can, non-member cannot, status survives reload). Analytics, live cohorts, corporate, and JilsonAI RAG/plan-builder are intentionally post-launch so the school goes live faster. **Community as a forum was removed (JilsonAI absorbs it), not deferred.**


---
*Atualizado: Jun 2026 — trilhas (LearningPlan/PlanModule/PlanItem) entram na Fase 2; aula vira first-class pesquisável; certificados puxados pro MVP (Fase 6.5); pricing mensal-sem-fidelidade + anual + 2 prices Stripe (Fase 4); comunidade-fórum removida (JilsonAI absorve); EN/Phase 13 removida. Ver JILSONAI.md p/ trilhas curadas vs montagem por IA.*
*Atualizado: Jun 2026 (rev. externa Gemini) — seams de engenharia distribuídos por fase, sem inflar o MVP (0–7): UTM capture (P1), signed URL elástico sem IP-lock (P3), force-sync Stripe + offboarding screen anti roach-motel (P4), certificado público opt-in (P6.5), captura de motivo de cancelamento no launch + "pausar 1 mês" como fast-follow (P7). Auto-ingestão de LessonChunks fica PARQUEADA na Fase 5 (RAG, pós-MVP) — não construir, não puxar pra frente.*
*Atualizado: Jul 2026 — P6.5 ganha o upgrade "certificate-as-media" (OG image server-side, botão
LinkedIn Add-to-Profile, `utm_source=certificate` fechando o loop com a UTM capture da P1).
Racional: playbook big-tech→solo em STRATEGY.md. Escopo pequeno, mesma fase, opt-in/LGPD
inalterados. Nada muda no roadmap de fases.*
*Atualizado: Jun 2026 — **Fase 2 ganhou a página de curso** (mapeada da análise Mosh/Xperiun/Hashtag): campos do Course (subtitle, level, learnTags, requirements mostrados, personas, highlights c/ ícone, thumbnailUrl=lista, introVideoId=detalhe, displayOrder, status) + Module/Lesson (displayOrder, status). **Metodologia 3 Camadas** = selo opcional via `Course.camadas[]` (não-boolean; curso pode ter 1–3 camadas) + textos globais em core/ + `camadaOverride?` (exceção, ex. N8N). Enum UNIVERSAL/MODERNO/IA, ícones stack-2·bolt·sparkles (azul só na IA). Seams pós-launch: introVideoId não-gated (wiring P3), filtro/agrupamento por camada, "pergunte ao JilsonAI" na página de curso (P6), prova social pesada.*
*Atualizado: Jun 2026 — FAQ por curso adicionada como `Course.faq[]` **opcional** (renderiza só se preenchida; JilsonAI é a FAQ viva; preencher por exceção, não obrigatório — evita burnout no catálogo amplo).*
*Atualizado: Jun 2026 — **Fase 4 reescrita: Stripe Plano Padrão + recorrência IN-HOUSE.** Conta MEI/CNPJ, payout Banco do Brasil (substitui C6). NÃO usar Stripe Billing nem Customer Portal — assinatura recorrente construída nos primitivos (Customer/SetupIntent/PaymentMethod/PaymentIntent), agendada via pg-boss; captura de cartão via Payment Element embutido (aluno nunca sai da escola); gestão/cancelamento dentro do site. Custo da decisão = dunning + 3DS/SCA off-session + proration mensal↔anual viram código nosso (por isso é bloco MAX/Ultracode). Confirmar o % do Stripe Billing antes de fechar a economia unitária.*
*Atualizado: Jun 2026 — **Fase 2 Bloco 5 (UI do aluno):** catálogo (`/cursos`, trilhas+cursos, busca embutida via `/api/search`), página de curso (`/curso/:slug` — hero, selo 3-camadas, highlights, learnTags, requirements, personas, accordion módulo→aula, FAQ condicional) e página de trilha (`/trilha/:slug` — árvore módulo→item, botão salvar/clonar). Reconciliação de doc-sync: os checkboxes de schema/campos do Course/Module/Lesson e do `LAYER_CONFIG` global (linhas acima) já estavam implementados desde o Bloco 1 mas ficaram sem marcar — corrigido agora, sem trabalho novo nessas linhas. `QueryClient` global ganhou uma política de retry que não reten­ta em 4xx (achado em teste manual: sem isso, toda página "não encontrado" ficava ~10s em "Carregando…" por causa dos 3 retries padrão do React Query num 404 que nunca teria sucesso).*
*Atualizado: Jun 2026 — reconciliação de doc-sync adicional: os 4 checkboxes de fundação da Fase 2 (modelos Prisma `Course`/`Module`/`Lesson`+RLS, entidades de trilha `LearningPlan`/`PlanModule`/`PlanItem`, `core/schemas/`, rotas CRUD `/api/courses`/`/api/modules`/`/api/lessons`/`/api/trilhas`) estavam implementados desde os Blocos 1/2/3a/3b mas ficaram sem marcar — corrigido agora, sem trabalho novo.*
*Atualizado: Jun 2026 — **Fase 2 Bloco 6a (UI admin de curso/módulo/aula):** `GET /api/admin/courses` + `GET /api/admin/courses/:id` novos (qualquer status, só admin — as leituras públicas só devolvem PUBLISHED). Cliente: `/admin/cursos` (lista, qualquer status), `/admin/cursos/novo` e `/admin/cursos/:id` (form completo — todos os campos do curso + seletor de camadas + `useFieldArray` pra highlights/faq + árvore inline de módulos/aulas com reordenar ↑/↓). Link "Admin" na nav só pra `role===ADMIN`. O item "Admin: build curated trilhas" do checklist abaixo fica pro Bloco 6b. Achado em teste manual (corrigido): módulo/aula novos nasciam todos com `displayOrder:0` (sem incrementar), o que tornava o reordenar ↑/↓ um no-op pra itens recém-criados — `createModule`/`createLesson` agora calculam `max(displayOrder existente)+1`. Confirmado também: mutations de escrita contra o Supabase remoto levam ~4–8s (mesma latência já vista no Bloco 5) — não é regressão, é a infra de dev.*
*Atualizado: Jun 2026 — **Auditoria do Bloco 5** (leitura de código + browser real desktop/mobile, sem erros de console): achados registrados como checklist na nova seção "Estado real da Fase 2 + checklist de continuidade" (logo abaixo do "Done when" da Fase 2) — `SaveTrilhaButton` não reflete trilha já salva entre sessões, aula isolada numa trilha sem contexto de curso, sem tela "Minhas trilhas", selo 3-camadas/highlights sem heading de seção. Nenhum desses itens foi corrigido nesta passada — é só o registro pra continuidade entre chats, por pedido explícito do operador (revisão manual item a item, possivelmente em sessão nova). Backlog de polish (fotos/imagens, direção visual completa do `design.md`, navegação mobile) também registrado, sem dono de bloco ainda.*
*Atualizado: Jul 2026 — **fechamento das 3 lacunas de produção** (auditoria pré-Fase 3/4): (P3) migrations em prod = `npx prisma migrate deploy` como **pre-deploy command** do Railway (nunca no entrypoint, nunca `migrate dev` em prod) — novo 1º checkbox da fase; (P4) **régua de dunning v1** especificada (D0 → retries D+2 e D+5 → corte D+7; acesso mantido na janela via `PAST_DUE`; retry-on-update; `requires_action` → tela logada "Resolver pagamento"; e-mails por tentativa + aviso D+6 + corte com winback) + novo checkbox **alerta de falha** (fila `admin-alerts`: job de billing/webhook/dunning que esgota retries → e-mail admin; force-sync é a recuperação, o alerta é a detecção) + E2E ampliado com retry-on-update e `requires_action`; (P7) upgrade Supabase Free→Pro vira item pré-launch, antes do primeiro aluno pagante. Convenções permanentes correspondentes já no CLAUDE.md (Database & Migrations + Background Jobs).*
*Atualizado: Ago 2026 — **plano de bloco ganha lar + governança de merge alinhada ao CLAUDE.md:** (1) o blockquote de regras do topo passa a exigir que **todo plano de bloco declare, antes de qualquer código**, quatro coisas — a task sliceável, os arquivos que vai tocar, dependências de runtime novas (se houver) e a linha `Docs check (context7): <superfície> → <ID pinado> → <o que foi verificado>` (ou `not triggered` explícito). O CLAUDE.md exigia essa linha mas não havia template de plano no repo pra abrigá-la; em vez de criar um arquivo novo, a exigência mora na regra que já é lida no topo deste plano. (2) Corrigida a contradição de merge: o topo dizia "merge to `main` when green (`main` auto-deploys)", o que conflita com o Working Method do CLAUDE.md — **CI verde é o piso que torna o merge elegível, nunca o gatilho**; o merge `dev → main` é decisão explícita do operador ao fim de uma fase. CLAUDE.md é a fonte única de convenções de engenharia e vence. Pendência sinalizada, não alterada nesta passada: a linha "Merge to `main` only when green" na seção de git mais abaixo repete a formulação antiga — reconciliar quando o operador decidir.*
*Atualizado: Ago 2026 (2) — **varredura fecha a pendência da entrada acima:** `git grep` por "when green" / "sacred" / "auto-deploy" / "merge" em `docs/` + `CLAUDE.md` achou a formulação de gatilho em exatamente dois lugares, ambos na seção "Branching workflow (all phases)". Corrigidos: (1) "Merge to `main` only when green" → **verde é o piso que torna o merge elegível, nunca o gatilho**; o merge `dev → main` é decisão explícita do operador ao fim de uma fase. A parte verdadeira — `main` faz auto-deploy pro Railway, logo é "sacred", só código testado chega lá — foi **preservada**, era só o gatilho que estava errado. (2) "até lá, `dev → main` after local testing" virou "**merge manual que o operador autoriza** after local testing" (mesma forma de gatilho implícito, escala menor). Não alteradas por serem factuais, não regras de merge: `railway.json`/Railway auto-deploy on push (Fase 0), `tech-stack.md` (Railway auto-deploy on push to `main`), CLAUDE.md linhas 51/76/82/96 (já são a fonte correta). Nenhuma outra ocorrência no repo.*
*Atualizado: Ago 2026 — **Fase 4 reescrita de novo: Stripe Payments + STRIPE BILLING** (Payment Element embutido mantido, Customer Portal segue fora). Reverte a decisão de recorrência in-house de Jun 2026: ela empacotava *checkout na nossa página* (requisito de UX) com *quem opera a recorrência* (era in-house pra evitar a taxa) — só a primeira é requisito. Custo verificado: Billing 0,7% do volume + Payments BR 3,99% + R$ 0,50 → ~R$ 5,19/assinante/mês. **Saem da fase:** agendador pg-boss de renovação, régua de dunning D0/D+2/D+5/D+7 como código, `PaymentIntent` off-session, tela "Resolver pagamento" para `requires_action`, cálculo de proração. **Entram/permanecem:** espelho local `Subscription` (`stripeSubscriptionId` agora obrigatório), webhooks de assinatura idempotentes e order-safe, force-sync via `subscriptions.retrieve`, gate de acesso, telas de assinatura/offboarding. A política de dunning continua **decisão nossa** (acesso mantido na janela, `past_due`) — vira configuração de Smart Retries. A fase **continua HIGH RISK**: o Billing removeu a mecânica do dinheiro, não a fronteira de acesso. E2E ampliado com webhook duplicado / fora de ordem / assinatura inválida.*
