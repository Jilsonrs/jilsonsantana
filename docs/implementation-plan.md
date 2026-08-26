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

## Estado atual  *(atualizar ao fechar cada bloco)*

> **Fases fechadas:** 0 (fundação/deploy) · 1 (auth/shell) — checkboxes completos em
> [`build-history.md`](build-history.md). **Fase 2** (conteúdo/trilhas) segue **aberta**: ver
> "Estado real da Fase 2" abaixo.
>
> **⚠️ O QUE ESTÁ NO AR ≠ O QUE ESTÁ CODADO.** `main` está parada em `431e989` (23/jun) e é ela que
> o Railway serve. **Toda a Fase 2 vive só em `dev`** e nunca rodou em produção. O público vê a
> coming-soon (`COMING_SOON=true`); o operador entra via `/__preview?token=`. Consequência a não
> esquecer: a dívida de integração da Fase 2 (env vars, migrations em prod, build do Docker com os
> models novos) **ainda não foi paga** e aparece de uma vez no primeiro merge.
>
> **Infra de banco (Ago 2026):** **dois** projetos Supabase na org `hdmecfinlnocurhcxrdb` —
> `gaxmbnhwltljlkukdwba` (us-east-2) = **produção**, e `mvaobzypsiuhqzipcelw` (us-east-1) =
> **dev + teste**, criado e ainda **vazio**. Os dois em Postgres `17.6.1.155`. Detalhes em
> [`build-history.md`](build-history.md) → *Infraestrutura*.
> **⚠️ ATÉ o `server/.env.test` ser preenchido, o ambiente LOCAL ainda aponta para PRODUÇÃO** —
> é o pré-requisito de separação de ambientes da Fase 4, e ele é o que impede um `migrate reset`
> local de acertar o banco que o Railway serve.
>
> **Próximo bloqueio:** rate-limit de login — único item que segura o `Done when` do Bloco 0
> (Fase 3). Toca auth ⇒ dispara o gate obrigatório do context7.

---

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

**Rotating catalog — `ARCHIVED` read semantics (Ago 2026 · `courses.md` D9 / §1.3):**

The school runs a **rotating catalog capped at 20 courses**: a new course enters when another
leaves. `Course.status` already carries `ARCHIVED` — the enum exists, **the read semantics do not**.
No new model, no entitlement table: the operator chose the simple rule (access while the
subscription is active), which the existing enum covers.

- [ ] **Split the read paths.** Today "public reads return only `PUBLISHED`" is a single rule; it
      has to become two. **Catalog/search/sitemap:** `PUBLISHED` only — `ARCHIVED` disappears for
      new students. **Direct access by an active member** (course page, lesson, saved trilha):
      `PUBLISHED` **or** `ARCHIVED` behind `temAcessoAtivo()`. ⚠️ Without this split, archiving a
      course silently revokes it from paying members who were mid-course — the exact opposite of
      the decision. `DRAFT` stays invisible to everyone but admin, unchanged.
- [ ] **A saved trilha containing an archived course keeps resolving** (Bloco 5/6b path). The
      transitive predicate must treat `ARCHIVED` as reachable-for-members, not as `DRAFT`.
- [ ] **Certificates are NOT affected by archiving** — `[FATO, operator decision]` `Certificate`
      carries `nameSnapshot` + `skillsCovered[]` as a **snapshot**, so it never depends on the
      course still existing. See also Phase 6.5. **Archiving only frees the slot.**
- [ ] **Do NOT build video deletion.** `[FATO, decision — rejected under the stack-decision
      criterion]` Bunny bills bandwidth, not shelf space; an archived course with no viewers costs
      ≈ zero. Manual deletion in the vendor panel takes 5 minutes. Naming this here so nobody
      re-proposes it as a gap in six months.

**Shared setup module (Ago 2026 · `courses.md` D8):** SQL and Python share the same practice
environment, so a ~15–20 min "create your account + first query" module is meant to be **recorded
once and reused in N courses**.

- [ ] `[VERIFICAR]` **Can a `Lesson` be referenced by more than one course?** Current shape is
      `Course → Module → Lesson`, so a lesson belongs to exactly one module — meaning the shared
      setup would be **recorded once but registered twice**, and maintained in both places forever.
      Decide before Phase 2 closes: (a) accept the duplication (cheapest, honest), or (b) let a
      trilha carry the setup as a standalone `PlanItem` of `itemType=LESSON` (the free-mix seam
      already exists and may cover this without any schema change). **Do not add a many-to-many
      until (b) is proven insufficient.**

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

### Bloco 0 — GATES  *(promovido da Fase 7 em Ago 2026 — fazer ANTES de qualquer código de vídeo)*

> **Por que isto vem na frente de tudo:** **gate não é feature.** Sem CI que execute a suíte,
> qualquer teste escrito depois vale **zero** — o operador trabalha em sessões separadas por
> semanas, ninguém roda a suíte na mão, e um gate que mente é pior que gate nenhum (dá a sensação
> de cobertura sem a cobertura). Estes três itens estavam na Fase 7 (ou seja, **depois** do Stripe)
> e foram promovidos pro topo da primeira fase ainda não aberta.

- [x] **CI passa a rodar teste.** ✅ *(Ago 2026 — script `test` na raiz + step `Test client` no
      `ci.yml`, **depois do build do core**, porque as suítes importam `@jilson/core` → `core/dist`.
      Provado por **mutação**: apagar a checagem de `Role.ADMIN` em `AdminRoute.tsx` reprova o CI.
      O script cobre só o `client` — é o único workspace com runner; o `server` entra na Fase 4.
      **E2E ficou de fora explicitamente**, como o próprio item pedia: precisa de banco de teste.)*
      [FATO histórico] Não existia script `test` no `package.json` **raiz**; o
      `.github/workflows/ci.yml` faz `npm ci` + build do core + typecheck (client/server) + build
      (client/server) — e **não tem step de lint nenhum**, apesar de o job se chamar
      "Lint, typecheck & build". Consequência hoje: `AdminRoute.test.tsx`, `ProtectedRoute.test.tsx`
      e o E2E de auth **nunca executam** em push nem em PR — dá pra remover a checagem de
      `Role.ADMIN` e o CI fica verde. Contradiz CLAUDE.md → Quality Gates e a seção Commands (já
      reconciliadas na mesma passada). Fix: script `test` na raiz agregando os workspaces que têm
      suíte + step no `ci.yml`. **E2E entra como job separado**, só quando houver banco de teste no
      CI — declarar no plano do bloco, não deixar implícito.
- [x] **`lint` para de mentir.** ✅ *(Ago 2026 — resolvido pela **terceira** saída, decidida no plano
      do bloco: **apagar** o script (raiz + `client` + `server`), não renomear. Motivo: ele executava
      `tsc --noEmit`, comando que **já tem nome aqui — `typecheck`**; renomear "pro que faz" criaria
      colisão, porque a mentira era a **duplicata**, não o nome. Job do CI renomeado para
      "Typecheck, test & build". **ESLint NÃO entrou** — continua sendo decisão própria, e o nome
      `lint` fica livre pra ela. **Custo aceito e registrado no checkbox abaixo.**)*
      [FATO histórico] `client/package.json:11` e `server/package.json:11` definiam
      `"lint": "tsc --noEmit"` — idêntico ao `typecheck`; **não existe ESLint no repo**. Logo a
      regra "no `any`" do CLAUDE.md **não tem enforcement automático** (o código de auth está limpo
      hoje; nada impede a regressão). Duas saídas aceitas: instalar `typescript-eslint` com
      `no-explicit-any: error`, **ou** renomear o script e ajustar CLAUDE.md/CI. O que não pode é o
      gate continuar dizendo que faz uma coisa e fazendo outra. *(Dependência de runtime nova =
      decisão de plano, com OK do operador — CLAUDE.md → Working Method.)*
- [x] **Consequência aceita da remoção do `lint`: "sem `any`" fica SEM enforcement automático.** ✅
      *(Ago 2026 — registrado como item explícito, não como nota de rodapé, porque é uma convenção
      do `CLAUDE.md` (Key Conventions → General) que passa a valer **só por revisão de diff**. Nada
      no CI barra um `any` novo. Preferível a fingir que um gate cobre isso: o `lint` anterior
      **também** não cobria — ele rodava `tsc --noEmit`, que aceita `any` sem reclamar. Ou seja, a
      remoção não perdeu cobertura nenhuma; só parou de simular que havia. Fecha de vez quando
      ESLint + `typescript-eslint` com `no-explicit-any: error` entrarem em bloco próprio.)*
- [ ] **Rate-limit de login — VERIFICAR a borda ANTES de escrever código** (achado do
      `security-vulnerability-reviewer`, Ago 2026). `rateLimit` está ligado em produção
      (`server/src/lib/auth.ts:72`), mas sem `advanced.ipAddress` o Better Auth lê
      `x-forwarded-for` e usa o **primeiro** elemento — o que o cliente controla quando a borda
      **anexa** em vez de sobrescrever. Nesse caso o atacante varia o header e faz brute-force
      ilimitado contra o e-mail do admin em `/api/auth/sign-in/email` — **a única porta de entrada**
      (`disableSignUp: true`), e ela dá no admin. A convenção "rate-limit auth routes in production"
      fica satisfeita **na letra** e **vazia no efeito**. **Passo 1 (não pular, não codar antes):**
      confirmar qual header a Railway **garante sobrescrever** — não presumir. Se houver, fixar em
      `advanced: { ipAddress: { ipAddressHeaders: [...] } }`; se não houver, `express-rate-limit` à
      frente de `app.all("/api/auth/{*any}")` com `app.set('trust proxy', <hops>)`.
- [x] **(NÃO-BLOQUEANTE — adicionado Ago 2026, não veio da Fase 7) `npm audit --audit-level=high`
      no `ci.yml`.** ✅ *(Ago 2026 — step com `continue-on-error: true`. **Nasce falho-porém-tolerado
      e isso é o esperado, não regressão:** medido na hora da implementação, o comando já sai com
      exit 1 — `{low:2, moderate:6, high:5, critical:1}`, puxados por advisory transitivo do
      `react-router`. O job fica **verde**; o step aparece marcado. Registrado antes do push pra não
      virar susto no primeiro PR.)* Entra como step **informativo**: **não trava o gate no primeiro dia.** Se
      produzir ruído de dependência transitiva (vulnerabilidade em pacote fora do caminho de
      execução, ou sem fix publicado), **degrada para conferência mensal manual** — não vira alarme
      permanente. *Um gate que grita sempre é um gate que ninguém lê*, e o custo disso é maior que o
      benefício de bloquear cedo demais. (É step de CI, não dependência de runtime — não cai na
      regra de "dependência nova = decisão de plano".)
- [ ] **(BACKLOG, não executar agora) Divergência de runtime Node — TRÊS fontes, três histórias.**
      Não é só o warning de depreciação; o warning é o **sintoma**. O que o log do run `32743912121`
      revela (texto literal: *"Node 20 is being deprecated. This workflow is running with **Node 24
      by default**"*):
      - `ci.yml` pede **`node-version: "20"`**
      - o workflow **executa em Node 24 na prática** (as actions forçam)
      - o `Dockerfile` publica em **`node:20-alpine`**
      - a raiz declara **`engines.node: ">=20"`** — permissivo demais pra arbitrar entre os dois
      **Consequência, que é o motivo de isto ser um item e não uma nota:** **validamos num runtime e
      publicamos em outro.** Um teste que passa no CI (Node 24) não prova nada sobre o Node 20 que
      serve o aluno em produção — e o inverso também vale. É a **MESMA FAMÍLIA** da divergência
      Docker↔CI que causou o bug do Prisma (`d3d2135` corrigiu o Dockerfile e o `ci.yml` ficou pra
      trás): duas definições do mesmo ambiente evoluindo separadas, sem nada que force a igualdade.
      O do Prisma custou dois meses de CI vermelho; este ainda não custou nada — por enquanto.
      **Escopo do bloco futuro:** escolher UMA versão, alinhar as quatro fontes acima (incluindo
      apertar o `engines.node`) e subir as actions pra `@v5`. **Bloco próprio, não conserto
      oportunista:** mexer em runtime de CI de carona em outra coisa é exatamente como um gate
      quebra sem ninguém entender por quê.
- [ ] **Revisar UMA vez o advisory `critical` puxado pelo `react-router`** (acréscimo do operador,
      Ago 2026 — **fora do escopo do bloco que ligou o audit**, registrado aqui pra não sumir).
      Decidir se **alcança o nosso uso** — é dev-only? é caminho não exercido pela app? (o advisory
      visto na implementação é de **hidratação SSR**, e este cliente é **SPA Vite sem SSR**, o que
      *sugere* não-alcance — **verificar, não presumir**) — e **registrar a conclusão** aqui.
      Razão de ser um item próprio: ruído transitivo é a regra e por isso o step é não-bloqueante,
      mas **`critical: 1` não é ruído por padrão** — exige um olhar, não zero. Sem este checkbox, a
      tolerância vira permanente sem ninguém nunca ter lido o que está sendo tolerado.
- **Done when (Bloco 0):** um push com teste quebrado **reprova** o CI; o script `lint` faz o que o
      nome diz (ou não se chama mais `lint`); e o brute-force contra `/api/auth/sign-in/email` é
      barrado por um limite que **não** depende de header controlado pelo cliente. *(O `npm audit`
      é informativo — não entra neste "Done when".)*
      > **⚠️ ACHADO DE EXECUÇÃO (Ago 2026) — a premissa do bloco estava ERRADA: o CI não estava
      > verde-mas-vazio, estava VERMELHO por DOIS MESES e ninguém viu.** Descoberto só ao dar o
      > primeiro push com o step de teste. **CORREÇÃO (registrada ao ler o histórico completo via
      > `gh run list`, depois de instalar o GitHub CLI):** a primeira redação deste achado dizia
      > "5 commits" — era o que a API pública mostrava na primeira página. A janela real é
      > **24/jun/2026 → 24/ago/2026**, de `ca1d02a` (o push que carregou a **Fase 2 Blocos 1 e 2**)
      > até o commit deste bloco, passando por `ec044e7`, `a91588d` e `8360ad3`. Último verde:
      > `18d963a`. Sempre a MESMA falha: `Typecheck server`.
      > **Por que dois meses passaram em branco — e este é o ponto que importa mais que a duração:**
      > quase todos os pushes do período eram de **documentação** ("Documentos atualizados…",
      > "docs(plan): …"). **Commit de doc não faz ninguém abrir o Actions** — a expectativa mental é
      > "não mexi em código, não tem o que quebrar". Só que o CI roda em `branches: ["**"]` e falhava
      > igual. A cegueira não foi descuido pontual: foi **estrutural**, e maior do que o bloco supôs
      > quando foi planejado.
      > **Causa:** o `ci.yml` **nunca rodou `prisma generate`**. O código do server importa tipos do
      > `@prisma/client`; a Fase 2 introduziu os models; num runner limpo esses tipos não existem e
      > o `tsc` quebra. Local passava porque `node_modules/.prisma` já estava gerado. O
      > **`Dockerfile` ganhou esse fix em `d3d2135`** ("generate Prisma client before build") e o
      > **`ci.yml` ficou para trás** — deploy e CI divergiram sem ninguém notar. Corrigido em commit
      > separado (`ci: gera Prisma client antes do typecheck`), espelhando `Dockerfile:60-63`; o
      > `generate` **não precisa de `DATABASE_URL`** (só lê o schema e escreve em `node_modules`),
      > verificado antes do push.
      > **Os 10 erros do log eram UMA causa raiz, não dez problemas** — e isto fica registrado
      > explicitamente para ninguém, daqui a seis meses, ler o histórico e concluir que havia dívida
      > de tipagem no server: os 2 primeiros eram `Namespace '...prisma/client/default'.Prisma has
      > no exported member 'InputJsonValue'`, e os outros 8 (`Parameter 'm' implicitly has an 'any'
      > type`, `Binding element 'modules'…`) eram **SINTOMA da ausência dos tipos gerados** — sem
      > eles o `tsc` não infere nada das queries. **Não eram violações da convenção "sem `any`"**
      > (CLAUDE.md → Key Conventions). O `prisma generate` zera a lista inteira.
      > **A lição, que é a do próprio bloco um nível abaixo:** *gate que grita sem ninguém escutar*
      > é o mesmo defeito de *gate que mente*. O Bloco 0 nasceu para consertar o segundo e
      > tropeçou no primeiro. Notificação de falha de CI = candidato a item futuro.
      >
      > **✅ CONFIRMADO POR LOG (run `32743912121`, lido via `gh run view --log` — não inferido da
      > API).** Duas coisas que antes eram só dedução ficaram provadas textualmente:
      > 1. **`Test client` executou de verdade: `Test Files 9 passed (9)` · `Tests 23 passed (23)`.**
      >    O step tinha ficado `skipped` no run anterior (o `Typecheck server` morria antes), então
      >    esta é a primeira execução real da suíte em CI na história do repo.
      > 2. **O step de audit tem `outcome=failure` / `conclusion=success`** — falhou de fato
      >    (`14 vulnerabilities (2 low, 6 moderate, 5 high, 1 critical)` + `##[error]Process
      >    completed with exit code 1`) e foi **tolerado por desenho** pelo `continue-on-error: true`.
      >    A API REST expõe só `conclusion`, que mascara isso; o `outcome` só aparece no log ou em
      >    expressão de workflow. **Registrado porque a leitura ingênua ("audit: success") diria o
      >    oposto da verdade** — e porque confirma que o **advisory `critical` segue EM ABERTO**,
      >    aguardando o checkbox de revisão acima. Nada foi silenciosamente consertado.
      >
      > **STATUS (Ago 2026): PARCIAL — 2 de 3 critérios verdes, bloco NÃO fechado.** ✅ push com
      > teste quebrado reprova o CI (provado por mutação) · ✅ o `lint` parou de mentir (apagado) ·
      > ❌ **rate-limit de login pendente** — é bloco próprio: toca `server/src/lib/auth.ts`, o que
      > dispara o gate obrigatório de context7 (`/better-auth/better-auth`), e o **passo 1 continua
      > sendo VERIFICAR** qual header a Railway garante sobrescrever, nunca codar antes.

### Vídeo (o corpo da fase)

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
      a rota pública continua servindo o id sem nenhum erro aparecer.
- [ ] **PRÉ-REQUISITO desta fase — `include` → `select` nas rotas públicas de detalhe** (movido do
      backlog P2 da Fase 7; achado do `security-vulnerability-reviewer`, Ago 2026). `GET
      /api/courses/:slug` (`server/src/routes/courses.ts:54`) e `GET /api/trilhas/:slug`
      (`server/src/routes/trilhas.ts:126`) usam `include:`, então devolvem **todas** as colunas
      escalares — e qualquer coluna futura entra na resposta pública **automaticamente**, sem
      ninguém decidir isso. Esta fase adiciona exatamente o tipo de coluna que não pode vazar, e a
      migration vem **antes** da revisão da rota na ordem natural do trabalho — ou seja, o furo se
      abre sozinho se este item não vier primeiro. **Fazer ANTES de qualquer coluna de vídeo entrar
      no modelo.** Fix: `select` explícito listando só os campos que `CourseDetail`/`TrilhaDetail`
      (`client/src/lib/api.ts:51,107`) consomem. As rotas irmãs já fazem certo
      (`courses.ts:25`, `lessons.ts:19`) — copiar o padrão.
- [ ] Server: issue short-lived **signed URLs**, member-only. **Elastic window (~6–12h) and NO
      IP-lock** — so the video doesn't break when the student switches Wi-Fi↔4G mid-lesson (classic
      mobile support ticket). *Inferência:* exact controls (path-token + expiry, optional IP) are
      Bunny's API — confirm flags at build. Trade-off accepted: no IP-lock slightly raises URL-share
      risk, mitigated by the short window + DRM + per-user signing. UX > marginal anti-piracy for a
      solo operator.
      **Decisão do operador, Ago 2026 — a janela FICA como está, e NÃO se constrói renovação de
      token durante a reprodução.** A proposta de TTL curto (minutos) foi avaliada e recusada por
      três razões: (a) TTL curto protege contra **link vazando passivamente**, não contra o vetor
      real de uma escola — **baixar e re-subir** —, que acontece dentro de qualquer janela, de 5
      minutos ou de 12 horas; (b) renovação de token no player é **código que falha em silêncio**,
      na conexão específica de um aluno específico, e depurado por um operador **sozinho** — custo
      alto por proteção quase nula; (c) a justificativa original (não quebrar o playback na troca
      Wi-Fi↔4G) **continua válida**. As linhas de `CLAUDE.md` → Video e `tech-stack.md` → Video
      seguem valendo sem alteração — a razão mora **aqui**, não duplicar lá.
- [ ] **Restrição de domínio/referrer no Bunny** — vídeo servido **apenas** para requisições vindas
      do domínio da plataforma. [PENDENTE DE VERIFICAÇÃO: se o Bunny Stream oferece essa restrição
      e sob qual nome — conferir no painel ou via context7 (`/bunnyway/documentation`, query
      dizendo "Stream") **antes de tratar como fato**.] **Razão:** é a alavanca **certa** para o
      mesmo risco que o TTL curto tentava cobrir — **mata o compartilhamento casual de URL** (link
      colado num grupo e aberto fora do site) **sem tocar no playback e sem escrever código nosso**:
      é configuração no fornecedor, não mecanismo que a gente passa a manter e depurar.
      *Registrado como decisão de produto, fora do MVP:* **marca d'água com identificação do aluno é
      a única defesa real contra re-upload** — entra **quando houver receita**, não antes (critério
      de decisão de stack, CLAUDE.md → Working Method).
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

- [ ] **PRÉ-REQUISITO DA FASE — separar o banco de DEV do banco de PRODUÇÃO.**
      **[FATO, Ago 2026] O ambiente local aponta hoje para o MESMO projeto que o Railway serve.**
      Evidência: os usuários semeados na Fase 1 (admin + member) e as **39 sessões de
      desenvolvimento** deles vivem no banco de produção `gaxmbnhwltljlkukdwba`. *As sessões em si
      são normais — o achado é a **LOCALIZAÇÃO** delas.*
      **Por que isto vira bloqueio agora e não antes:** a partir desta fase o banco passa a ter o
      **espelho de `Subscription`**. Um `migrate reset` com o `.env` errado deixa de ser "perdi meu
      seed" e passa a ser **apagar o estado de acesso de quem paga**.
      **Resolução:** o projeto **`mvaobzypsiuhqzipcelw`** ("Jilson Santana Test") serve **dev E
      teste**; produção fica sozinha no `gaxmbnhwltljlkukdwba`, alcançável só pelo Railway.
      **REGISTRAR (é o ponto que a trava não cobre): existem TRÊS caminhos até o banco — (1) Vitest
      via `globalSetup`, (2) chamada de MCP, (3) comando digitado à mão — e SÓ O PRIMEIRO tem trava
      automática** (a checagem do `TEST_DB_REF`, CLAUDE.md → Database & Migrations). MCP recebe o
      `project_id` como argumento e comando manual lê o `.env` que estiver lá: nos dois, a única
      proteção é **declarar contra qual ref se está apontando antes de rodar**. Não inventar trava
      para (2) e (3) — inventar guarda que não segura é o defeito do `lint` que mentia; o que vale
      aqui é a disciplina explícita.
      **Preparo do banco de teste — estado em Ago 2026:**
      - [x] Projeto criado (`mvaobzypsiuhqzipcelw`, us-east-1, Postgres 17.6.1.155). **Data API
            DESLIGADA** (PostgREST não participa da arquitetura — o acesso é Prisma via
            `DATABASE_URL`) e **"Automatic RLS" também desligado de propósito**, pra que o RLS entre
            por **migration versionada** igual em produção: trigger fazendo isso por fora criaria
            divergência entre teste e produção.
      - [x] `server/.env.test` criado (**esqueleto, valores em branco**) + cobertura no
            `.gitignore` — o padrão era só `.env`, que **não** casa com `.env.test`; agora é
            `.env` + `.env.*` + `!.env.example`. Verificado com `git check-ignore`.
      - [x] `server/.env.test` preenchido e **conectando pelo POOLER** (`postgres.<ref>@aws-0-us-east-1.pooler.supabase.com`, 6543/5432), igual a produção. **Não usar o host da aba "Direct" do painel** — ver `CLAUDE.md` → Database & Migrations; foi o que travou esta fatia por horas.
      - [x] ⚠️ **INCIDENTE DE CREDENCIAL (Ago 2026) — RESOLVIDO.** As `SEED_*` foram **copiadas de
            `server/.env`** para o `.env.test`, então a senha do admin de teste **era a mesma de
            produção**: o vazamento não ficou contido no ambiente barato. Ele aconteceu porque o
            arquivo estava **ABERTO no editor** — a notificação de mudança do IDE despeja o
            **conteúdo** no contexto do agente, sem ninguém colar nada no chat. **Rotação concluída
            nos DOIS ambientes** com senhas novas, independentes (conferido por hash: diferentes),
            sign-in provado em cada usuário e **0 sessões ativas** nos dois bancos. Também
            rotacionada a senha do Postgres do projeto de teste. As duas convenções que saíram
            disto estão no `CLAUDE.md` → *Secrets in agent sessions*: **cada ambiente nasce com
            credencial própria** e **arquivo de segredo aberto no editor entra no contexto do
            agente**. Ferramenta: `server/src/rotate-credentials.ts` (o `seed.ts` é create-only
            para senha — não serve para rotacionar).
      - [x] Migrations aplicadas no banco de teste com **`prisma migrate deploy`** (NÃO
            `migrate dev` — o histórico já está definido). **Receita sem dependência nova** (o
            `dotenv/config` do server só lê `.env`, e o Prisma CLI não sobrescreve variável já
            exportada):
            ```bash
            cd server
            set -a && . ./.env.test && set +a     # exporta o ambiente de TESTE
            npx prisma migrate deploy
            npx tsx src/seed.ts
            ```
            **PEGADINHA verificada na execução:** o Prisma imprime *"Environment variables loaded
            from .env"* **mesmo quando as variáveis exportadas do `.env.test` é que estão valendo**
            (ele carrega o `.env`, mas `dotenv` não sobrescreve variável já presente no ambiente). A
            linha que diz a verdade é a do **`Datasource`**, que mostra o host real — foi ela que
            confirmou `db.mvaobzypsiuhqzipcelw.supabase.co`. **Não ler a primeira linha como se
            fosse a resposta.** Some daí a guarda explícita de ref antes de cada `deploy`.
            **Nota sobre o `.env` de PRODUÇÃO: ele NÃO pode ser lido com `. ./.env`** — a
            `DATABASE_URL` do pooler tem `?pgbouncer=true&connection_limit=1`, e o `&` quebra o
            shell (`parse error near '&'`). Para produção, deixe o **próprio Prisma** carregar o
            `.env` e faça a guarda por `grep -c "<ref>" .env` (conta ocorrências sem imprimir
            segredo; lembre que `grep -c` sai com código 1 quando o resultado é zero).
            **O `cd server` não é estilo, é obrigatório — MEDIDO em Ago 2026, não inferido:** da
            raiz do monorepo, `npx prisma <cmd>` falha com *"Could not find Prisma Schema"*.
            **A correção óbvia NÃO resolve:** declarar `"prisma": {"schema": ...}` no
            `server/package.json` **não muda nada da raiz**, porque o CLI lê o `package.json` mais
            próximo do **CWD** — da raiz, esse é o `package.json` da raiz. E declarar no
            `package.json` **da raiz** resolve o schema mas **para no passo seguinte**:
            `Environment variable not found: DIRECT_URL`, porque o Prisma carrega `.env` relativo ao
            CWD e o nosso `.env` mora em `server/`. *(A chave **foi** adicionada ao
            `server/package.json` — ela deixa o caminho do schema **explícito**, o que vale por si;
            só não é o conserto do comando da raiz, e este parágrafo existe pra ninguém tentar de
            novo achando que é.)*
            **Consequência que vale manter:** rodar Prisma da raiz **não funciona**, e isso é um
            freio acidental útil — o caminho (3), "comando digitado à mão", é o único sem trava
            automática, e hoje ele **obriga** a passar por `server/`, onde o `.env` escolhe o banco.
            Se um dia virar script de conveniência, o script tem que fixar o ambiente
            (`--env-file=.env.test`), nunca herdar o que estiver no `.env`.
      - [x] **Paridade verificada — e foi ela que pegou o furo do RLS.** Estado final **idêntico nos
            dois bancos**: 11 tabelas em `public`, **0 sem RLS**, 4 migrations aplicadas, 0
            rollbacks, advisors só INFO `rls_enabled_no_policy`. A divergência encontrada no caminho
            (`_prisma_migrations` com RLS em produção e sem no teste) virou o backlog P2 nº (5)
            reaberto e a migration `20260824214838_rls_prisma_migrations_table` — ver Fase 7.
            Confirmado o que o item já mandava: divergência se corrige **por MIGRATION**, nunca por
            comando avulso no painel, senão não viaja pro git.
      - [x] **Usuários semeados presentes no banco de teste** — admin + member (2 users, 2 contas
            `credential`), com as credenciais **já rotacionadas** e sign-in provado. Não foi preciso
            re-rodar o seed: ele havia rodado antes, e de todo modo `seed.ts` é **create-only para
            senha** (retorna cedo se o usuário existe), então quem troca credencial é o
            `rotate-credentials.ts`, não ele.
      - [ ] **(follow-up, decisão do operador) O "Automatic RLS" está LIGADO em produção e DESLIGADO
            no teste — isso é divergência viva, não histórica.** Ela não afeta tabela nossa (toda
            migration nossa liga o RLS explicitamente), mas afeta qualquer tabela criada **fora** das
            migrations — que foi exatamente o caso da `_prisma_migrations`. Enquanto os dois projetos
            divergirem nessa chave, produção continua "se consertando sozinha" em silêncio e o teste
            não, o que é justamente o que esconde o próximo furo. Opções: desligar em produção (os
            dois passam a depender só do versionamento, que é a convenção) ou ligar no teste (os dois
            mentem juntos). **Recomendo desligar em produção**; é mudança de configuração no
            fornecedor, então é chamada do operador.
- [ ] **DECISÃO REGISTRADA — usuários semeados (admin + member de teste) são PERMANENTES e existem
      em TODOS os ambientes, produção inclusive.** O **admin é obrigatório** (`disableSignUp: true`
      — não há outro caminho para criar o primeiro usuário). O **member de teste em produção recebe
      acesso via assinatura REAL na Stripe com cupom de 100%** — **NUNCA** via bypass no
      `temAcessoAtivo()`, flag de "usuário de teste" no `User`, ou exceção por e-mail.
      **Razão:** o gate tem **fonte única e caminho único**. Um segundo caminho "só para teste" é
      **porta sem revisão que sobrevive ao motivo que a criou** — e é a única classe de bug que
      libera acesso sem pagamento sem nenhum erro aparecer.
      **Efeito colateral desejável:** o mesmo mecanismo (cupom de 100% na Stripe) já serve para
      **assinaturas cortesia** e para **promoções** (Black Friday, founding member) — não é
      concessão, é o caminho normal.
      *Sem gatilho de reabertura — arquitetural.*
- [ ] **Setup no dashboard (sem código):** Payments Plano Padrão (conta MEI/CNPJ, payout Banco do Brasil) + **Stripe Billing ativado**. Produto **"Assinatura"** com **2 `Price`**: Mensal R$99,90 (sem fidelidade) / Anual ~R$995 (~17% off). Sem free trial, sem conteúdo grátis. **Sem Customer Portal.**
- [ ] **Configurar Smart Retries + automações de recuperação** conforme a política de produto abaixo. Isto é **configuração, não código**.
- [ ] **Política de dunning (decisão NOSSA, executada pela Stripe):** falha na renovação → retries automáticos → corte. **Acesso MANTIDO durante toda a janela de retry** (`past_due`) — churn involuntário é a maior alavanca (strategy.md §6). Corte no fim da janela → `unpaid`/`canceled` + `session.deleteMany`. Ajustar a janela é mudança de configuração. *Confirmar os intervalos exatos que a Stripe expõe na abertura da fase, via context7.*
- [ ] **Checkout embutido (Payment Element).** Cria `Customer` + `Subscription` na Stripe e confirma o primeiro pagamento na própria página. O dado do cartão vai direto pro Stripe (não toca nosso servidor). **`requires_action`/3DS é tratado pelo Element no fluxo de assinatura.**
- [ ] `Subscription` model = **espelho local** (o gate lê daqui) com growth seams: `ownerUserId?`, `organizationId?` (nullable), `seats` (default 1), `status`, `currentPeriodEnd`, `stripeCustomerId`, **`stripeSubscriptionId` (obrigatório — é a chave do objeto canônico)** (+ RLS); migration
- [ ] `temAcessoAtivo(userId)` lib — caminho individual (`assinaturaIndividualAtiva`); **fonte única de verdade do acesso para a aplicação**, lida do espelho local. *(A verdade canônica é a `Subscription` da Stripe; o espelho é o que o gate consulta em tempo de request.)*
- [ ] **Webhook handler** dos eventos de assinatura (`customer.subscription.created/updated/deleted`, `invoice.paid`, `invoice.payment_failed`) — **TUDO INLINE, SEM FILA** (pg-boss removido do MVP em Ago 2026; ver CLAUDE.md → Background Jobs). A ordem é: **verifica assinatura do Stripe → grava o `event.id` → atualiza o espelho local → responde 200**, tudo na mesma request (milissegundos). CRIA user+subscription no primeiro pagamento (substitui o seed). **A confiabilidade vem da Stripe:** devolvemos 5xx e ela reentrega — era isso que a fila duplicava. E-mail (Resend) sai na mesma request, dentro de `try/catch`: falha de e-mail **nunca** derruba o 200 de um evento já processado.
- [ ] **TRAVA de montagem (achado do `security-vulnerability-reviewer`, Ago 2026):** a rota do
      webhook Stripe é montada **ACIMA** de `express.json()` (`server/src/index.ts:38`) — junto do
      handler do Better Auth, que já vive lá por essa mesma razão — ou com `express.raw`. Se o body
      chegar já parseado, a verificação de assinatura (`constructEvent`) falha **em silêncio**: o
      raw body não é mais recuperável e a checagem passa a validar algo que não é o payload
      original. Hoje os routers de API são montados depois da linha 38 (`:41-50`), então o padrão
      default do repo é o errado para esta rota.
- [ ] **Idempotência + order-safety (TRAVA):** registrar `event.id` processados (repetido = no-op); eventos podem chegar fora de ordem → em qualquer dúvida, `subscriptions.retrieve` e **recomputar** o espelho, nunca confiar no snapshot do payload.
- [ ] **"Force sync" fallback.** `subscriptions.retrieve` + recomputa o espelho, caso um webhook falhe até esgotar as reentregas da Stripe — evita o pior caso de suporte: assinante pagante trancado pra fora. **TRAVA:** admin-only OU escopo de servidor seguro. NUNCA um GET não autenticado que libere acesso — seria bypass de billing.
- [ ] **Detecção de falha = monitor de erro externo, NÃO uma fila nossa.** O desenho antigo
      (alerta via fila `admin-alerts` do pg-boss) tinha um defeito de raiz: **a detecção dependia
      exatamente da coisa que deveria detectar.** Com a fila fora, o webhook que estourar cai no
      **monitor externo gerenciado** — item de pré-requisito do primeiro aluno pagante na Fase 7
      (fornecedor ainda **PENDENTE**). O force-sync continua sendo a *recuperação*; o monitor é a
      *detecção*. (Convenção no CLAUDE.md → Background Jobs.)
- [x] **INFRAESTRUTURA da suíte de servidor — PRONTA (Ago 2026).** Entrega o encanamento, não os
      testes de negócio. **`app.ts` novo**: monta e exporta o app **sem** `listen()`, que ficou em
      `index.ts` — enquanto `index.ts` escutava porta no import, supertest não tinha o que importar.
      Entrada de produção segue `dist/index.js`; Dockerfile e Railway intocados. **`vitest.config.ts`**
      (`environment: node`, `fileParallelism: false` — workers em paralelo disputariam o mesmo banco e
      gerariam falha intermitente, que é a pior classe de teste). **`src/test/`**: `test-env.ts` (trava
      por REF + `loadEnv` com `override: true`, para a suíte não depender de o operador ter feito
      `set -a`), `global-setup.ts` (trava → `migrate reset --force --skip-seed` → seed, com env
      **passado explicitamente** ao filho, nunca herdado do `.env`), `setup.ts` (roda em cada worker,
      porque o globalSetup roda em outro contexto e `process.env` não atravessa). **3 testes de
      fumaça**: `/api/health` 200 · `/api/me` sem sessão 401 · admin semeado autentica e `/api/me`
      devolve `role=admin`. **`tsconfig.build.json`** exclui `src/test/` do build — código de teste
      não vai para a imagem de produção; o `typecheck` continua cobrindo os testes.
      **Provado por MUTAÇÃO, não presumido:** (a) com o `.env.test` apontando para o ref de
      **produção**, o setup **aborta** — `[test-setup] migrate reset` executou **0 vezes**, `Seed
      complete` **0 vezes**, exit code **1**; *(a primeira tentativa de mutação, passando
      `DATABASE_URL` pelo shell, NÃO disparou a trava — o `override: true` sobrescreve o shell com o
      arquivo. Isso é o requisito, não um furo: o vetor real é o **arquivo** apontar errado, que é o
      erro que de fato aconteceu esta semana. Registrado porque a mutação ingênua dá falso conforto.)*
      (b) removendo `requireAuth` de `me.ts`, **2 dos 3 testes reprovam** — a suíte pode falhar, logo
      é teste. **CI:** step `Test server` novo; exige os secrets `TEST_DATABASE_URL` e
      `TEST_DIRECT_URL`, com o resto gerado no run.
      **Achado colateral corrigido:** o `.dockerignore` tinha `**/.env`, que **não** cobre
      `.env.test` — o `COPY server/ ./server/` levaria o arquivo de segredo para uma camada do
      builder. **Mesmo defeito que o `.gitignore` tinha**, no mesmo padrão, em outro arquivo.
- [ ] **(decisão adiada, com GATILHO — escolha do operador, Ago 2026) Rodar a suíte APAGA o banco de
      desenvolvimento**, porque `mvaobzypsiuhqzipcelw` serve dev **e** teste e o `globalSetup` dá
      `migrate reset --force`. Hoje o custo é **zero** (0 cursos, 0 módulos, 0 aulas, 0 trilhas lá).
      **Gatilho de reabertura:** quando o operador começar a **autorar conteúdo de verdade em dev**
      nesse banco — a Trilha 1 pela UI admin, por exemplo. Aí escolher entre (a) aceitar e recriar com
      `db:seed:content` depois de cada suíte, ou (b) um **terceiro** projeto Supabase só para dev
      (+US$ 10/mês no Pro, teto ~35 → ~45, e reabre a decisão dos 2 projetos). **Não decidir antes do
      gatilho:** hoje seria escolher com base em conteúdo que não existe.
- [ ] **TESTES DE SERVIDOR (~15, supertest, sem browser) — escritos JUNTO com o handler acima, não
      depois.** Este é o item que fecha a fase; não é polish de fim de ciclo. **Justificativa
      (Ago 2026):** 100% do risco catastrófico do projeto é servidor — *assinante pagante trancado
      pra fora* e *acesso liberado sem pagar* — e **nada disso é observável por browser: webhook não
      tem tela.** Casos mínimos:
      **Webhook** — (1) assinatura inválida → **400**; (2) `event.id` repetido → **no-op** (espelho
      inalterado, sem efeito colateral duplicado); (3) evento fora de ordem → **recomputa via
      `subscriptions.retrieve`**, nunca confia no snapshot do payload.
      **Gate de acesso** — (4) `PAST_DUE` **mantém** acesso dentro da janela; (5) `CANCELED` **não**;
      (6) sem `Subscription` → não.
      **Matriz HTTP** — (7–10) **401/403/200** em `/api/me` e `/api/admin/ping` (anônimo /
      member / admin).
      **Vazamento de conteúdo** — (11–12) rotas públicas **não devolvem `DRAFT`** — *fecha por teste
      os dois achados P1 já abertos na Fase 2 (`GET /api/trilhas/:slug` e `POST
      /api/trilhas/:id/save`); referência, não duplicação: o fix e o diagnóstico moram lá.*
      **Billing bypass** — (13) force-sync **sem auth → 401**; (14) force-sync como member comum →
      403.
      **Rate limit** — (15) o limite do Bloco 0 (Fase 3) **liga e bloqueia** de verdade.
      *Requer o banco de teste (projeto `mvaobzypsiuhqzipcelw` + trava por **REF** no `globalSetup`)
      — CLAUDE.md → Database & Migrations.*
- [ ] `requireActiveMembership` middleware (wraps `temAcessoAtivo`) gating content + video URLs
- [ ] On access loss: `session.deleteMany({ userId })` to force logout
- [ ] Client: pricing page + **checkout embutido (Payment Element)** + **tela de gestão de assinatura DENTRO da escola** (trocar cartão, ver próxima cobrança, mudar mensal↔anual, cancelar) — substitui o Customer Portal, chamando a Subscriptions API. *Mostrar a proração da Stripe **previsualizada** antes de confirmar a troca de plano.*
- [ ] **Tela de offboarding antes do cancelamento (seam).** Intercepta "cancelar", coleta o motivo, depois executa `cancel_at_period_end` (não recobra; acesso segue até o fim do período pago). **TRAVA (anti roach-motel — sensibilidade Procon/CDC já levantada no pricing):** "cancelar mesmo assim" sempre visível, 1 clique; tom calmo, não retentivo. **Faseamento:** captura de motivo = **launch**; **"pausar 1 mês" (pause collection da Stripe) = fast-follow.** Não construir a pausa no launch.
- [ ] E2E: assinar → acesso liberado; renovação → período estende; cancelar → acesso revogado no fim do período; **pagamento falhado → `past_due` com acesso MANTIDO → corte no fim da janela**. *(Os três casos de webhook — duplicado, fora de ordem, assinatura inválida — saem daqui e viram **teste de servidor** no item acima: são mais baratos, mais rápidos e não precisam de browser.)*
- [ ] **E2E full-stack habilitado (6–8 testes) — DEPOIS dos testes de servidor.** **Correção de
      diagnóstico (Ago 2026):** o E2E atual só assere redirect do React Router **porque falta o
      `globalSetup` com banco de teste** — não porque Playwright seja a ferramenta errada;
      **Playwright fica na stack**. Primeiro o `globalSetup` (banco de teste travado por **REF**,
      seed determinístico),
      depois o escopo alvo: login válido / senha errada; rota protegida sem auth; rota admin sem
      auth; gate de vídeo membro **vs** não-membro (Fase 3); checkout com cartão de teste;
      cancelamento. *O `e2e-test-writer` continua **ADIADO** — CLAUDE.md → Testing.*
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
- [ ] **Archiving a course does NOT affect issued certificates.** `[FATO, operator decision — Ago
      2026]` The snapshot design (`nameSnapshot`, `skillsCovered[]`) already guarantees this: the
      certificate never reads the live course. Two consequences to honor explicitly: the public
      `/certificado/[id]` route **stays live** for archived-course certificates (a 404 in 2030
      breaks the CAC-zero acquisition channel this phase exists to create), and certificate
      eligibility is evaluated **at completion time**, never re-derived from current catalog state.
      Rotation frees a catalog slot — nothing else. See `courses.md` D9 / §1.3.
- **Done when:** completing a curated trilha issues a certificate PDF with name + competencies.

## Phase 7 — Launch Prep  *(medium risk)*

- [ ] Transactional emails (Resend): welcome, receipt, password reset (transactional ignores `marketingConsent`)
- [ ] LGPD: privacy policy, terms, consent, data export/delete path
- [ ] Error/loading states everywhere; security review (subagent) on auth/billing/video
- **→ MOVIDOS para a Fase 3, bloco "Gates" (Ago 2026):** *rate-limit de auth* e *CI não roda
      testes*. Razão: **gate não é feature** — sem CI, teste escrito depois vale zero. O texto
      completo dos dois (com os `[FATO]` e o "passo 1 = verificar a borda") mora agora no **Bloco 0
      da Fase 3**; não duplicar aqui.
- [ ] **Monitor de erro externo gerenciado — PRÉ-REQUISITO DO PRIMEIRO ALUNO PAGANTE.** Hoje a
      única forma de descobrir um erro em produção é **o aluno reclamar**: não há captura de
      exceção, nem alerta, nem histórico (o log do Railway não é ferramenta de detecção). Serviço
      gerenciado, **tier grátis**, tipo Sentry — client + server. **Fornecedor NÃO escolhido:
      decisão PENDENTE**, resolver na abertura do item. Substitui o antigo alerta por fila
      `admin-alerts` do pg-boss, cujo defeito era a detecção depender da própria coisa que deveria
      detectar (ver Fase 4 e CLAUDE.md → Background Jobs).
- [ ] **Backlog P2 do `security-vulnerability-reviewer` (7 no relatório; os nº 1, 2 e 6 foram
      movidos e o nº 5 foi **fechado por migration versionada** → **3 pendentes aqui**. Nenhum
      bloqueia merge; todos antes do primeiro aluno pagante.)** A numeração original do relatório é
      preservada para o mapeamento não quebrar.
      > **Nota de processo — o nº 5 foi fechado errado, reaberto e fechado de novo no mesmo dia.**
      > Fica registrado porque a contagem "3 pendentes" já esteve certa pelo **motivo errado**: o
      > primeiro fechamento verificou **um** ambiente e concluiu "suspeita falsa". Contagem de
      > backlog é resultado, não prova — ler a razão do fechamento antes de confiar no número.
      (1) **→ MOVIDO para a Fase 4** (testes de servidor, supertest). Era "sem teste de fronteira
      no servidor": não há suíte no workspace `server`, e o E2E só assere redirect do React Router,
      que é guarda cosmético do client. A matriz 401/403/200 (`/api/me`, `/api/admin/ping`) e o
      "público não vaza `DRAFT`" agora são checkboxes **colados ao handler de webhook** na Fase 4 —
      escrever junto, não depois. Não contar neste backlog.
      (2) **→ MOVIDO para a Fase 3** (`include` → `select` nas rotas públicas de detalhe). Virou
      pré-requisito de escopo lá, não backlog daqui: tem que estar feito **antes** de qualquer
      coluna de vídeo entrar no modelo. Não contar neste backlog.
      (3) **`PREVIEW_TOKEN` em query string** (`index.ts:80-92`) — aparece em log de proxy,
      histórico e `Referer`; comparação não é de tempo constante; `PREVIEW_TOKEN` e `COMING_SOON`
      não constam no `server/.env.example`.
      (4) **escritas admin fora do prefixo `/api/admin/*`** (`courses.ts:138,150,171`,
      `modules.ts:14,25,39`, `lessons.ts:44,55,69`, `trilhas.ts:139`) — todas corretamente atrás de
      `requireAdmin`, custo é de auditabilidade: "essa rota é admin?" deixa de ser respondível pelo
      path. Mover ou registrar a exceção como decisão do operador — não deixar leitura em
      `/admin/courses` e escrita em `/courses` no mesmo router.
      (5) **✅ FECHADO DE VERDADE (Ago 2026) por migration versionada — depois de ter sido fechado
      ERRADO e REABERTO no mesmo dia.** A suspeita original do relatório era **VERDADEIRA**: a
      tabela `_prisma_migrations` é criada pelo Prisma **fora** das migrations versionadas, então
      nenhum `ENABLE ROW LEVEL SECURITY` nosso jamais passou por ela.
      **Por que o primeiro fechamento errou:** foi verificado **só produção**
      (`gaxmbnhwltljlkukdwba`), onde `pg_class.relrowsecurity` já era `true` — e daí se concluiu
      "suspeita falsa, nenhuma migration necessária". **O dado que derrubou isso:** o banco de teste
      `mvaobzypsiuhqzipcelw` recebeu **as MESMAS 3 migrations** por `prisma migrate deploy` e lá a
      mesma tabela veio com **`relrowsecurity = false`**. As 10 tabelas de domínio vieram `true` nos
      dois. Logo o RLS de produção **não vinha do versionamento** — vinha de um ajuste **de fora**.
      *(Causa mais provável, não distinguida pela evidência: o **"Automatic RLS"** do projeto de
      produção, que estava ligado — no projeto de teste ele foi **desligado de propósito** na
      criação. O que a evidência prova é o que importa: **não veio das migrations**. Se foi um
      humano no painel ou um ajuste de projeto não muda nem o conserto nem a lição.)*
      **Conserto aplicado:** migration `20260824214838_rls_prisma_migrations_table` com o
      `ALTER TABLE "public"."_prisma_migrations" ENABLE ROW LEVEL SECURITY;`, aplicada **nos dois
      bancos por `prisma migrate deploy`** — nunca por painel, nunca por MCP, porque o objetivo é o
      estado ser **REPRODUZÍVEL em qualquer banco futuro**. Idempotência confirmada **antes** de
      escrever a migration (três `ALTER` consecutivos numa tabela de sondagem descartável, sem
      erro), e é por isso que ela roda limpa em produção, onde o estado já era o desejado.
      **Prova final, nos DOIS bancos:** 11 tabelas em `public`, **0 sem RLS**,
      `_prisma_migrations.relrowsecurity = true`, 4 migrations aplicadas, 0 rollbacks; advisors só
      INFO `rls_enabled_no_policy`. Produção reconferida após a aplicação: **2 users e 39 sessions,
      idênticos ao pré-voo**.
      > **LIÇÃO (o motivo de este item valer mais reaberto que fechado): estado verificado em UM
      > ambiente não prova estado REPRODUZÍVEL.** Produção carregava um ajuste manual invisível e,
      > por isso, *parecia* correta — a verificação confirmou o **sintoma certo pelo motivo errado**.
      > Só a criação de um **segundo** banco a partir das mesmas migrations revelou o furo. É a mesma
      > família de *"gate que mente"* (o `lint` que rodava `tsc`) e de *"backup nunca testado é fé,
      > não é plano"*: **a coisa só é verdade quando é reproduzida, não quando é observada uma vez.**
      > Corolário operacional: `get_advisors` num banco só responde *"este banco está ok"*, nunca
      > *"o repo produz um banco ok"*.
      **Não contar neste backlog.**
      (6) **✅ FECHADO no Bloco 0 da Fase 3 (Ago 2026)** — pela via da **remoção** do script, não da
      renomeação; a consequência ("sem `any`" sem enforcement automático) ficou registrada como
      checkbox próprio lá. Detalhes nos itens do Bloco 0 — **não duplicar aqui**. Não contar neste
      backlog.
      (7) **`server/src/seed.ts:101`** — `console.error("Seed failed:", err)` despeja o erro
      inteiro de um caminho que passa por `signUpEmail({ body: { email, password, name } })`; se o
      `APIError` do Better Auth carregar o body, a senha vai em claro pro stdout. *Suspeita, não
      confirmada por leitura estática.*
- [ ] Performance pass (< 3s load); mobile responsive
- [ ] Founding-member offer wiring (scarcity for Udemy students)
- [ ] **Cancellation-reason capture wired.** The offboarding screen (P4) collects the reason on exit — cheap data, gold for churn. Connects to STRATEGY.md churn KPIs (winback, MRR-perdido). (Storage = a small `CancellationReason` row or a field on `Subscription`; reason capture ships at launch, the "pausar 1 mês" path stays fast-follow.)
- [ ] **Upgrade Supabase Free → Pro ANTES do primeiro aluno pagante** (backups diários; o Free
      não garante backup automático — confirmar a política vigente no dia). Dado real de aluno
      nunca fica em banco sem backup.
      **Custo REVISADO (Ago 2026), depois que o 2º projeto passou a existir: US$ 35/mês, não 25.**
      O plano Supabase é por **ORGANIZAÇÃO**, não por projeto: ao virar Pro, os **dois** projetos da
      org `hdmecfinlnocurhcxrdb` viram Pro juntos. Conta = **US$ 25 (org) + US$ 10 (2º projeto) =
      US$ 35/mês**. Cotas (MAU, egress, storage) são **partilhadas pela org**, e o consumo do banco
      de teste é desprezível — o que ele custa é **compute**, daí os US$ 10 fixos.
      **DECISÃO DO OPERADOR: manter os dois projetos na MESMA org e pagar os US$ 10**, em vez de
      mover o teste pra uma org Free separada. Razão: no Free o projeto **pausa após 7 dias de
      inatividade**, e banco de teste é inativo **por definição** — despausar toda semana é atrito
      recorrente, e em operador solo atrito recorrente custa mais que US$ 10.
      **Teto de infra sobe de ~US$ 30 para ~US$ 35/mês.** *Sem gatilho de reabertura — decisão de
      conforto operacional, deliberada.*
- [ ] **🚀 GO-LIVE — desligar o gate "Em breve" (ÚLTIMA AÇÃO, sem deploy de código).** O site ao vivo está atrás de um gate pré-lançamento (público vê "Em breve"; operador acessa via `/__preview?token=<PREVIEW_TOKEN>`). Para abrir ao público: no Railway (projeto `jilsonsantana` → env `production` → service `jilsonsantana`), setar **`COMING_SOON=false`** (ou apagar a variável) → o serviço reinicia → público passa a ver o app real. Nenhum merge/código necessário. *(Mecanismo em [server/src/index.ts](../server/src/index.ts) + [client/public/coming-soon.html](../client/public/coming-soon.html); detalhe operacional na memória `coming-soon-gate`.)* **Fazer só quando o "Done when" abaixo estiver verde.**
### Continuidade do operador (pré-primeiro aluno pagante)

> **Por que esta seção existe — e por que ela não aparece em curso nenhum:** curso pressupõe
> **equipe**. Aqui não há. **Sou operador único:** não existe colega com acesso, não existe conta de
> equipe, não existe quem note que algo quebrou enquanto eu não estou olhando. Nesse arranjo,
> **invasão ou perda de acesso a uma conta de fornecedor causa mais dano em minutos do que qualquer
> falha de aplicação.** A camada de aplicação já está coberta (RLS, segredo só no servidor, webhook
> com assinatura + idempotência, leitura pública só `PUBLISHED`, rate-limit no Bloco 0,
> `security-vulnerability-reviewer` obrigatório nas Fases 3 e 4). O elo fraco que sobra **não é o
> código: é a conta.** **Tudo abaixo fica pronto ANTES do GO-LIVE.**

- [ ] **2FA por app autenticador (NÃO SMS)** em: **Supabase, Railway, Stripe, GitHub, Bunny,
      registrador do domínio** e **no e-mail do admin da plataforma**. SMS fica de fora por
      SIM-swap. O e-mail entra na lista porque é o **caminho de reset de todos os outros** —
      blindar os seis e deixar o e-mail aberto é não blindar nada.
- [ ] **Códigos de recuperação guardados FORA do Mac** — impressos ou em gerenciador de senhas.
      Guardados apenas na máquina que autentica, eles somem exatamente no cenário em que serviriam
      (perda, roubo ou pane do Mac).
- [ ] **Senha única por serviço, em gerenciador.** Senha repetida transforma vazamento de terceiro
      em invasão nossa — e um operador só não tem quem perceba o acesso estranho.
- [ ] **Backup: política CONFIRMADA + RESTORE DE TESTE executado uma vez.** A confirmação da
      política do tier vive no checkbox *"Upgrade Supabase Free → Pro"* acima — não duplicar aqui
      [PENDENTE DE VERIFICAÇÃO]. **O que é novo é o restore:** executar um restore de teste **uma
      vez**, contra o **2º projeto Supabase** (`mvaobzypsiuhqzipcelw`, o de teste), e registrar que
      funcionou. Porquê: **backup nunca testado é fé, não é plano.** E o cenário realista não é
      invasão — é **migration ruim ou reset apontado pro lugar errado** (a trava por REF do
      CLAUDE.md nasceu desse mesmo risco). *A dependência "o 2º projeto precisa existir" está
      **satisfeita** desde Ago 2026 — o [PENDENTE] do tier grátis foi resolvido.*
- [ ] **LGPD mínimo: política de privacidade publicada + caminho de exclusão de conta.** É
      **pendência de lançamento, não item de engenharia** — não vira bloco de código. O checkbox
      amplo de LGPD no topo desta fase cobre o resto (termos, consentimento, export); aqui fica só
      o mínimo que não pode faltar no dia do GO-LIVE.

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
*Atualizado: Ago 2026 (7) — **Bloco 0 (Fase 3) executado PARCIALMENTE: 3 dos 4 checkboxes fechados, o bloco NÃO.** O raciocínio completo está no changelog do `CLAUDE.md`, entrada **Ago 2026 (8)** — **não duplicado aqui**. O que mudou neste plano: (1) `[x]` em **CI roda teste** (script `test` na raiz + step `Test client` **depois do build do core**; gate provado por **mutação** — apagar `Role.ADMIN` de `AdminRoute.tsx` reprova o CI, e antes passava verde) e em **`lint` para de mentir** (resolvido por uma **terceira** saída que o item não previa: **apagar**, porque `tsc --noEmit` já se chama `typecheck` neste repo e renomear colidiria — a mentira era a duplicata, não o nome). (2) **Checkbox novo registrando o custo**: "sem `any`" fica **sem enforcement automático** até ESLint entrar — com a observação de que o `lint` anterior **também não cobria** isso (`tsc --noEmit` aceita `any`), então a remoção não perdeu cobertura, só parou de simular. (3) `[x]` no **`npm audit`**, com o resultado medido antes do push (`high:5, critical:1`, transitivo do `react-router`) e o comportamento esperado registrado: step falho-porém-tolerado, job verde. (4) **Checkbox novo do operador**: revisar **UMA vez** o advisory `critical` e registrar a conclusão — ruído transitivo justifica o step não-bloqueante, mas `critical` não é ruído por padrão, e sem este item a tolerância viraria permanente sem ninguém ter lido. (5) **"Done when" marcado como PARCIAL**: falta o **rate-limit de login**, que é bloco próprio por tocar auth (gate obrigatório de context7) e por ter o "passo 1 = verificar a borda da Railway" preservado. (6) Backlog P2, item **(6) fechado** por referência. Convenção nova correspondente no `CLAUDE.md`: **"Definição de pronto por fatia"** (teto-não-piso; vale daqui pra frente; fronteira transversal é fatia própria sem teste de componente).*
*Atualizado: Ago 2026 (8) — **separação de ambientes de banco vira PRÉ-REQUISITO da Fase 4, e a trava do banco de teste é CORRIGIDA porque não funcionava.** (1) **[FATO] o ambiente local aponta para o mesmo projeto que o Railway serve** — os usuários semeados na Fase 1 e as 39 sessões de desenvolvimento deles vivem em produção; *as sessões são normais, o achado é a **localização** delas*. Vira bloqueio agora porque esta fase traz o espelho de `Subscription`: um `migrate reset` com o `.env` errado deixa de ser "perdi meu seed" e passa a apagar o estado de acesso de quem paga. Resolução: `mvaobzypsiuhqzipcelw` serve **dev E teste**. Registrado junto o que a trava **não** cobre: existem **três** caminhos até o banco (Vitest, MCP, comando manual) e **só o primeiro tem trava automática** — nos outros dois vale declarar o ref antes de rodar, e **não** inventar guarda que não segura. (2) **Trava `_test` → trava por REF** (`CLAUDE.md` → Database & Migrations): no Supabase o host vem do **project ref opaco**, não do nome do projeto — "Jilson Santana Website" atende em `db.gaxmbnhwltljlkukdwba.supabase.co` —, então a checagem antiga **nunca dispararia**, que é o mesmo defeito do `lint` apagado no Bloco 0. O REF é único globalmente: a trava passa a verificar **identidade**, não semelhança de texto. `[PENDENTE]` do tier grátis **resolvido** (o Free permite 2 projetos ativos). (3) **Decisão registrada, sem gatilho (arquitetural): admin + member de teste são PERMANENTES em todos os ambientes**, e o member em produção recebe acesso por **assinatura real com cupom de 100%** — nunca bypass no `temAcessoAtivo()`, flag de teste ou exceção por e-mail; um segundo caminho "só para teste" é porta sem revisão que sobrevive ao motivo que a criou. Efeito colateral desejável: o mesmo mecanismo serve cortesia e promoções. (4) **Backlog P2 nº (5) FECHADO por verificação — a suspeita era falsa**: `_prisma_migrations` **já tem** RLS (`pg_class.relrowsecurity = true` nas 11 tabelas de `public`), nenhuma migration necessária; **restam 3** no backlog. (5) **Custo do upgrade Supabase Pro corrigido: US$ 35/mês, não 25** — o plano é por **organização** e a nossa tem dois projetos (US$ 25 + US$ 10). Decisão do operador: manter os dois na mesma org, porque no Free o projeto **pausa após 7 dias** e banco de teste é inativo por definição — despausar toda semana custa mais que US$ 10. Teto de infra ~US$ 30 → **~US$ 35**. (6) **Medido, não inferido:** `npx prisma` **da raiz** do monorepo não acha o schema, e **nem a chave `prisma.schema` conserta** (o CLI lê o `package.json` mais próximo do CWD; declarada na raiz, ela acha o schema mas morre em `Environment variable not found: DIRECT_URL`, porque o `.env` mora em `server/`). A chave foi adicionada ao `server/package.json` por ser declaração explícita, **não** por consertar o comando da raiz — registrado pra ninguém tentar de novo. Consequência útil: todo comando de migration passa obrigatoriamente por `server/`, onde o `.env` escolhe o banco.*
*Atualizado: Ago 2026 (9) — **CORREÇÃO da entrada (8): o backlog P2 nº (5) foi fechado ERRADO ali e está reaberto e refechado aqui, agora por migration versionada.** A entrada (8) afirma *"nº (5) FECHADO por verificação — a suspeita era falsa"*; **isso está incorreto** e fica registrado como entrada nova, sem editar a anterior (regra de rotação: histórico não se edita). **O dado que derrubou:** o fechamento anterior verificou **só produção**, onde `_prisma_migrations` já tinha `relrowsecurity = true`. Depois disso o banco de teste `mvaobzypsiuhqzipcelw` recebeu as **MESMAS 3 migrations** por `prisma migrate deploy` e a mesma tabela nasceu **`false`** — as 10 de domínio vieram `true` nos dois. Logo o RLS de produção **não vinha do versionamento**; vinha de fora (causa provável: o *Automatic RLS* do projeto de produção, ligado — no de teste foi desligado de propósito; a evidência não distingue "humano clicou" de "ajuste de projeto", e não precisa: o que ela prova é que **não veio das migrations**). **A suspeita original do `security-vulnerability-reviewer` era VERDADEIRA.** **Conserto:** migration `20260824214838_rls_prisma_migrations_table` (`ALTER TABLE "public"."_prisma_migrations" ENABLE ROW LEVEL SECURITY;`), aplicada **nos dois bancos por `migrate deploy`** — nunca painel, nunca MCP —, porque o alvo é estado **reproduzível em qualquer banco futuro**, não estado correto num banco. Idempotência confirmada **antes** de escrever (três `ALTER` seguidos numa tabela de sondagem descartável, sem erro), o que a faz rodar limpa em produção. Estado final idêntico nos dois: 11 tabelas, **0 sem RLS**, 4 migrations, 0 rollbacks, advisors só INFO; produção reconferida pós-aplicação com **2 users e 39 sessions**, iguais ao pré-voo. **LIÇÃO, promovida a convenção no `CLAUDE.md` → Database & Migrations: estado verificado em UM ambiente não prova estado REPRODUZÍVEL** — `get_advisors` responde *"este banco está ok"*, nunca *"o repo produz um banco ok"*. Mesma família de *gate que mente* e de *backup nunca testado é fé*: a coisa só é verdade quando é **reproduzida**, não quando é **observada uma vez**. Corolário de processo, também registrado: **contagem de backlog é resultado, não prova** — "3 pendentes" já esteve certo pelo motivo errado. **Aberto no caminho:** o *Automatic RLS* está **ligado em produção e desligado no teste**, divergência **viva** que não afeta tabela nossa (nossas migrations ligam RLS explicitamente) mas afeta qualquer tabela criada fora delas — recomendação: desligar em produção; é config no fornecedor, decisão do operador.*

*Atualizado: Ago 2026 — **catálogo rotativo + ambiente único (decisões de `courses.md` D8/D9 que tocam o build).** Fase 2 ganha o bloco **`ARCHIVED` read semantics**: o enum já existia em `Course.status`, mas a semântica de leitura não — a regra "leitura pública só `PUBLISHED`" precisa virar **duas** regras (catálogo/busca = só `PUBLISHED`; acesso direto de membro ativo = `PUBLISHED` **ou** `ARCHIVED` atrás de `temAcessoAtivo()`), senão arquivar um curso **revoga em silêncio** de quem estava no meio dele — o oposto da decisão. Sem model novo e **sem tabela de entitlement**: o operador escolheu a regra simples (acesso enquanto a assinatura estiver ativa), que o enum existente cobre. Junto: trilha salva com curso arquivado continua resolvendo; **deleção de vídeo NÃO se constrói** (reprovada no critério de decisão de stack — o Bunny cobra banda, não prateleira; deletar no painel leva 5 min), registrado aqui pra ninguém repropor como lacuna. Novo `[VERIFICAR]` do **módulo de setup compartilhado**: SQL e Python usam o mesmo ambiente, então as ~15–20 min de "criar conta + primeira query" são gravadas uma vez e reusadas em N cursos — mas `Course → Module → Lesson` prende a aula a um módulo só; decidir antes de fechar a Fase 2 entre aceitar a duplicação de cadastro ou usar o seam de `PlanItem itemType=LESSON` que já existe (**não** adicionar many-to-many antes de provar que o seam não cobre). Fase 6.5 ganha o checkbox de que **arquivamento não afeta certificado emitido** — o desenho de snapshot (`nameSnapshot`/`skillsCovered[]`) já garante, mas as duas consequências viram explícitas: a rota pública `/certificado/[id]` **permanece no ar** e a elegibilidade é avaliada **no momento da conclusão**, nunca re-derivada do catálogo atual. Racional completo e gatilhos de reabertura em `decisions-archive.md` → Ago 2026 (8).*
