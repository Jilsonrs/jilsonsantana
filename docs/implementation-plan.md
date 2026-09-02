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
> **✅ `main` ATUALIZADA (Ago 2026) — a dívida de integração da Fase 2 foi paga.** O merge levou
> `main` de `431e989` (23/jun) para `cc2bde1`: 65 commits, a Fase 2 inteira, a infraestrutura de
> testes e o login fechado. **O público segue vendo a coming-soon** (`COMING_SOON=true`), então
> nada mudou para quem visita; o operador entra via `/__preview?token=`.
> Verificado antes do merge, não presumido: as **4 migrations já estavam aplicadas** em produção e
> as **7 variáveis do Railway cobrem** tudo que o servidor lê em runtime — por isso o merge não
> exigiu janela de manutenção.
> **Pendência de véspera de lançamento:** os dois cursos `exemplo-*` do seed estão **PUBLISHED em
> produção**. Invisíveis hoje; aparecem no dia em que a coming-soon for desligada.
>
> **Infra de banco (atualizado Ago 2026) — TRÊS ambientes, um por papel:**
> `gaxmbnhwltljlkukdwba` (Supabase, us-east-2) = **produção**, só o Railway ·
> `mvaobzypsiuhqzipcelw` (Supabase, us-east-1) = **dev / a escola**, **nunca apagado** ·
> **`localhost:5432/jilsonsantana_test`** (PostgreSQL 17.11 local) = **teste**, apagado a cada
> execução da suíte. Org no plano **Free** (2 projetos ativos, US$ 0).
> ✅ **RESOLVIDO — o ambiente local NÃO aponta mais para produção.** O `server/.env` foi apontado
> para o Supabase de dev e o `server/.env.test` para o Postgres local; provado em runtime
> (`GET /api/courses` devolveu o catálogo de dev, não o de produção) e por mutação (a trava
> bloqueia os dois refs do Supabase). **Rodar `npm test` já não apaga o banco de desenvolvimento** —
> verificado: depois de uma execução completa, o banco de dev seguia com 2 cursos, 2 módulos,
> 3 aulas e 1 trilha intactos.
>
> **Cobertura de teste — o que EXISTE hoje (medido em Ago 2026, não estimado):** cliente **9
> arquivos / 35 testes** (Vitest + RTL) ✅ no CI — a tela de **login** fechada pelos 8 critérios,
> com prova por mutação · servidor **1 arquivo / 3 testes de fumaça**
> (supertest, Postgres local) ✅ no CI · E2E **1 arquivo / 6 testes** ✅ **no CI, em job próprio,
> com trava de host local e prova por mutação** *(T1 fechado — antes rodava contra o banco de
> produção, sem `globalSetup`)*. As três camadas agora rodam e podem falhar.
> Não há teste de servidor
> de **negócio** (a matriz de acesso e os casos de webhook são a Fase 4) e não há suíte nenhuma de
> Bunny ou Stripe, porque esse código não existe. Plano de cobertura: **Fase 3 → Bloco T**.
>
> **⚠️ GATILHO DISPARADO (registrado, não resolvido) — `CLAUDE.md` passou de ~85 KB.** A entrada
> (11c) do próprio changelog escreveu: *"se o arquivo passar de ~85 KB com o critério em vigor, o
> problema é ESCOPO, não redação."* Medido em Ago 2026: **já estava em 91,8 KB antes desta sessão**
> e foi a **101,1 KB** depois (+9,3 KB de convenções de teste/XSS/segurança). O gatilho não pede
> reescrita — pede **decisão do operador sobre escopo**: quais seções ainda passam no critério de
> entrada (*"um agente prestes a escrever código produziria um diff ERRADO sem esta linha?"*).
> **Não tratar como tarefa de redação**, que é exatamente o erro que o gatilho existe para evitar.
>
> **Próximo bloqueio:** rate-limit de login — único item que segura o `Done when` do Bloco 0
> (Fase 3). Toca auth ⇒ dispara o gate obrigatório do context7. **Agora acompanhado**: o fix do
> `secure` do cookie (P1-d do Bloco T) toca o MESMO arquivo e pode sair na mesma chamada de
> context7 — o gate custa uma chamada, não duas.

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

**Course-page fields + Metodologia 3 Camadas** — spec de produto (catálogo de campos, textos e ícones globais das camadas) em **`courses.md` §2.2–2.3**; invariantes de build em **`CLAUDE.md` → Página de curso e selo 3 Camadas**:
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
- [ ] **Destaque VISUAL no campo com erro** (login e todo formulário) — hoje o erro é só texto
      abaixo do campo; a referência (Apple Store, ago/2026) pinta borda e fundo do campo errado.
      **Barato e sem retrabalho:** o estado de erro por campo já existe no formulário, só não é
      usado visualmente. **Fazer junto com `aria-invalid`**, não só cor: quem usa leitor de tela ou
      não distingue vermelho não recebe aviso nenhum hoje, e é a mesma linha de código. Cai na
      passada de direção visual (`design.md`), não abre bloco próprio.
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
      fica satisfeita **na letra** e **vazia no efeito**. Se houver header confiável, fixar em
      `advanced: { ipAddress: { ipAddressHeaders: [...] } }`; se não houver, `express-rate-limit` à
      frente de `app.all("/api/auth/{*any}")` com `app.set('trust proxy', <hops>)`.
      **As duas armadilhas** (`trust proxy` não configura o Better Auth; a premissa do XFF pode
      estar defasada) estão em `CLAUDE.md` → Quality Gates — **não duplicar aqui**.
  - [ ] **PASSO 1 — provar qual header é confiável. Não toca em auth, não escreve rate-limit.**
        Rota **temporária** `GET /api/__whoami` devolvendo **apenas os headers do próprio
        chamador**: `x-forwarded-for`, `x-real-ip`, `x-envoy-external-address` e
        `req.socket.remoteAddress`. Não vaza nada — o chamador já conhece o próprio IP.
  - [ ] Três provas, nesta ordem: **(1)** do celular no 4G, anotar os quatro valores;
        **(2)** `curl -H "X-Forwarded-For: 1.2.3.4" https://www.jilsonsantana.com/api/__whoami`
        — **é este teste que decide**: se `1.2.3.4` aparecer em **qualquer** posição, aquele header
        não serve para segurança; **(3)** do Mac, confirmar que o valor muda com a rede.
  - [ ] **Critério de aprovação:** o header escolhido contém o IP real **e** ignora o falso do
        teste 2. **Hipótese de partida** `[FATO — suporte Railway, mar/jun 2026]`: a aposta é
        **`x-forwarded-for[0]`, NÃO `x-real-ip`** (que está quebrado com a CDN ativa, devolvendo IP
        da Fastly) — contraintuitivo em relação ao conselho genérico de segurança, e é por isso que
        o teste 2 é obrigatório em vez de opcional.
  - [ ] **Remover a rota `/api/__whoami` no MESMO bloco.** Rota de diagnóstico que sobrevive ao
        diagnóstico é superfície que ninguém revisa depois.
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

### Bloco T — Cobertura: infra de teste, os P1 abertos e a fronteira de XSS  *(Ago 2026 · precede o corpo da fase)*

> **ABORDAGEM DECIDIDA — "infra uma vez, cobertura por fase".** Registrada porque as duas
> alternativas óbvias falham, cada uma do seu jeito. *Parar e retro-cobrir tudo antes de avançar*
> é a fase que não fecha: operador solo, telas que já funcionam há meses, e o repo **já decidiu**
> que Fases 0/1/2 não são retro-completadas (`CLAUDE.md` → Definição de pronto por fatia).
> *Deixar pra depois* é o modo de falha que este repo **já viveu**: a doutrina de teste sempre
> existiu e mesmo assim o CI não rodava suíte. O meio-termo é o único que sobrevive a sessões
> separadas por semanas: **paga-se AGORA só o que DESTRAVA** — a infra que falta e o que já é bug
> em código escrito — e **cada fase seguinte nasce com os testes dela**, nunca um "bloco de
> testes" no fim.
>
> **O que NÃO entra aqui, de propósito:** teste de componente em tela que já funciona · meta de
> cobertura · qualquer suíte de Bunny ou Stripe. Teste escrito antes do handler existir testa a
> imaginação de quem escreveu, não o código.

**T0 — o que NÃO precisa ser configurado (leia antes de configurar qualquer coisa).**
A pergunta natural é *"preciso configurar os testes para começar"*. Medido em Ago 2026, a resposta
é **não, em duas das três camadas** — e isso muda por onde se começa:

| Camada | Configuração | Para escrever um teste novo, hoje |
|---|---|---|
| **Componente** (Vitest + RTL) | ✅ **pronta** | criar `Name.test.tsx` ao lado do componente. Nada a montar. |
| **Servidor** (supertest) | ✅ **pronta** | criar `src/**/*.test.ts` e `import app`. Nada a montar. |
| **E2E** (Playwright) | ❌ **falta, e hoje é perigosa** | é o T1 abaixo — a única configuração real deste bloco. |

> **Registrado porque a intuição erra aqui:** "configurar os testes" soa como pré-requisito único e
> grande. Não é — o pré-requisito grande é só o E2E. **Teste de tela pode ser escrito hoje, sem
> nenhum setup**, e é isso que destrava começar pela tela de login sem esperar o resto.

**T1 — o E2E deixa de ser teatro.** Hoje [`e2e/tests/auth.spec.ts`](../e2e/tests/auth.spec.ts) tem
**6 testes que nunca rodam em CI**, e que quando rodam só provam redirect do React Router.

> **O QUE A PASTA `e2e/` JÁ TEM** *(inventariado em Ago 2026 — são 4 arquivos, nada mais)*:
> `playwright.config.ts` (55 linhas — `webServer` para 3000 e 5173 **já configurado**, `baseURL`,
> projeto chromium, `retries: 2` no CI) · `tests/auth.spec.ts` (6 testes: 2 redirects de anônimo,
> member entra em `/conta` e é barrado em `/admin`, admin entra em `/admin`, logout, senha errada) ·
> `package.json` (só `@playwright/test` + `typescript`) · `tsconfig.json`.
> **Não existe:** `global-setup.ts`, seed, job no CI, `.env` próprio. **O que falta é exatamente o
> que a lista abaixo cria** — a estrutura em si está de pé, e o `webServer` é reaproveitado.
>
> **ESTADO DO BANCO DE TESTE** `mvaobzypsiuhqzipcelw` *(medido via MCP, Ago 2026)*: 11 tabelas ·
> **4 migrations aplicadas** · `user` = **2**, `account` = **2**, `session` = 1 → **o seed de
> usuários JÁ RODOU** (admin + member existem, que é o que as 6 specs usam) · **`course`,
> `module`, `lesson`, `learning_plan`, `plan_module`, `plan_item` = 0** — conteúdo **vazio**.
> **Consequência prática para o T1:** as 6 specs de auth funcionam com o que já está lá; **qualquer
> spec futura que precise de um curso vai precisar de `db:seed:content` no `globalSetup`.**
> Melhor descobrir isso agora do que num teste vermelho sem causa aparente.
>
> **⚠️ ACHADO (Ago 2026, ao conferir o arquivo em vez de presumir): o E2E de hoje roda contra
> PRODUÇÃO.** [`e2e/playwright.config.ts:9`](../e2e/playwright.config.ts#L9) chama
> `loadServerEnv()`, que lê **`../server/.env`** — e o `webServer` (`:39-54`) sobe
> `npm run dev:server`, que carrega **esse mesmo `.env`**. Enquanto o `.env` local apontar para o
> banco que o Railway serve (o que o *Estado atual* deste plano registra que ainda é o caso),
> `npm --workspace e2e run test` **autentica com credencial semeada contra o banco de produção**.
> Hoje o dano é limitado porque as 6 specs só leem — mas a **primeira** spec que criar ou apagar
> algo grava lá, e nada no repo avisa. Isto é o mesmo defeito de família da trava por REF: falta de
> identidade verificada, não falta de cuidado. **É o item que justifica T1 vir antes de tudo.**

- [x] `e2e/global-setup.ts` com a **MESMA trava** de `server/src/test/test-env.ts` — **importada**,
      não copiada. *(Passou a ser a trava de host local, não mais por REF: o banco de teste virou
      Postgres local no commit anterior.)*
- [x] `loadServerEnv()` **removido**. Ele lia `../server/.env` num `try/catch` silencioso, e era
      isso que transformava "sem env de teste" em "roda contra o que estiver lá". O env agora vem do
      `globalSetup`, que aborta com a causa dita.
- [x] `webServer` sobe o server com **`--env-file=server/.env.test`**. Sem isso o
      `import "dotenv/config"` do `index.ts` carregaria o `.env` (dev) e o Playwright resetaria um
      banco para dirigir um servidor ligado a outro. `reuseExistingServer: false` no server pela
      mesma razão. **Custo operacional aceito: é preciso parar o `dev:server` antes de rodar E2E.**
- [x] `fullyParallel: false` + `workers: 1`.
- [x] Reset e seed são os **mesmos comandos** da suíte de servidor (executados como subprocesso —
      `seed.ts` não exporta função, e rodar o mesmo script torna a divergência impossível).
- [x] Job **separado** `e2e` no `ci.yml`, com service container `postgres:17`, browser só chromium
      e upload do report em falha. YAML validado.
- [x] **DESCOBERTO NO CAMINHO — o workspace `e2e` era o único em CommonJS.** `core`, `client` e
      `server` são `"type": "module"`. Isso quebrava `import.meta.url` e **impedia importar a trava
      do servidor**, que é ESM. Alinhado para ESM.
- [x] **`e2e` entrou no `npm run typecheck` da raiz.** Não estava no plano: virou necessário quando
      o workspace passou a ter código de verdade (`global-setup.ts`) — sem isso, um erro de tipo ali
      só apareceria no job lento, e o gate rápido mentiria por omissão.
- [x] **PROVA POR MUTAÇÃO — feita, e reprovou.** Removido o `<Route element={<ProtectedRoute />}>`
      que envolve `/conta` em `App.tsx:24-26`: **2 testes falharam**; revertido, 6/6 verdes.
      *(A primeira tentativa de mutação não casou o padrão — o guard é uma rota-PAI, não um wrapper
      inline —, e o script abortou sem escrever. Registrado porque o output "6 passed" daquela
      rodada era do código **não mutado**: mutação que não aplica dá falso conforto, exatamente como
      o teste que não pode falhar.)*
- [x] **ACHADO — a suíte estava STALE e ninguém sabia.** Ligado o E2E, `admin reaches /admin`
      falhou: esperava o texto *"Área administrativa"*, renomeado para *"Admin"* no commit `de17fe6`
      (Fase 2, Bloco 6a). **Quebrada desde então, em silêncio, porque o E2E não rodava.** É a
      demonstração exata da premissa do bloco. Reescrita com `getByRole` em vez de texto solto
      (sobrevive a mudança de copy) e com asserção de URL, que é o que o teste de fato quer provar:
      o admin **não** é redirecionado, ao contrário do member.

**T2 — fechar os P1 de vazamento, com o teste colado ao fix.** São os achados de segurança em
**código que já existe**; o resto do backlog é sobre código ainda não escrito.

> **Eram 2; a varredura do `security-vulnerability-reviewer` (Ago 2026) achou mais 2** — um deles
> na mesma família dos conhecidos, o outro numa família nova (cookie). **A informação central para
> este bloco:** nenhum dos quatro reprovaria o CI de hoje. São exatamente a classe de bug que
> **teste de servidor pega e typecheck nunca pega** — que é a justificativa do Bloco T inteiro.

- [x] **P1-a — `GET /api/lessons/:id` não checa a cadeia** (`server/src/routes/lessons.ts:17-19`).
      O `where` filtra só a própria aula. **Cenário:** o operador arquiva um curso; as aulas
      continuam `PUBLISHED`, e a rota segue devolvendo título, tags, título do módulo e **slug +
      título do curso retirado do ar** — idem curso `DRAFT` cujas aulas foram publicadas uma a uma
      durante a autoria. **A forma correta já existe no repo**: `search.ts:61` faz
      `lesson → module → course`. É inconsistência, não escolha de desenho.
- [x] **P1-b — `itemInclude` sem filtro de status** (`server/src/routes/trilhas.ts:24-29`, usado em
      `:113` e `:122`) — *conhecido, confirmado, e **pior** do que estava registrado.* O vazamento
      passivo (trilha `PUBLISHED` que referencia curso `DRAFT`) é o caso menor. O maior:
      `POST /api/plan-items` (`:328-336`) verifica só que o curso **existe**, nunca que está
      publicado ⇒ qualquer usuário logado adiciona um `courseId` chutado ao **próprio** plano e lê
      os metadados de volta por `GET /api/trilhas/mine/:id`. Vira **oráculo de enumeração** do
      catálogo não lançado, e passa por toda checagem de dono, porque o plano **é** dele.
      **⚠️ Nota de implementação que muda o fix:** o Prisma **não aceita `where` em include de
      relação to-one**, então o filtro sobe para `items` (to-many) em `planTreeInclude:31` — e
      `:329`/`:333` viram `findFirst` com `status: PUBLISHED`.
- [x] **P1-c — `POST /api/trilhas/:id/save` rejeita só parcialmente** (`:211`) — *conhecido,
      confirmado.* `if (!template || !template.isTemplate)` nunca checa `status`: membro salva uma
      trilha curada `DRAFT` ou `ARCHIVED`, o servidor clona a árvore inteira para a conta dele, e o
      `GET /api/trilhas/mine/:id` renderiza o material não lançado. `GET /api/trilhas/:slug` exige
      `PUBLISHED` corretamente — **o save/clone é o desvio em volta desse gate.**
- [x] **P1-d — `secure` do cookie de sessão não está fixado** (`server/src/lib/auth.ts:46-51`) —
      **família diferente das outras três, e a de maior impacto.** Hoje `secure` depende da
      **grafia** de `BETTER_AUTH_URL`; gravada sem esquema ou com `http://` no Railway, o cookie de
      sessão viaja em claro **sem erro e sem log**. Fix: `advanced: { useSecureCookies:
      process.env.NODE_ENV === "production" }`. **Toca `lib/auth.ts` ⇒ dispara o gate obrigatório
      do context7** (`/better-auth/better-auth`) — pode sair na MESMA chamada do rate-limit, que já
      é exigida pelo Bloco 0 e mexe no mesmo arquivo.
- [ ] **NÃO esperar a verificação do Railway para aplicar o fix — ele é INCONDICIONAL.** Registrado
      porque a pergunta *"a `BETTER_AUTH_URL` começa com `https://`?"* parecia bloqueante e **não
      é**: `useSecureCookies: NODE_ENV === "production"` é o valor correto **nos dois casos**. Se a
      URL já está certa, o fix não muda comportamento e **remove a dependência de uma grafia**; se
      está errada, o fix **conserta**. Não há resposta que mude o código.
      **PRÉ-REQUISITO VERIFICADO antes de recomendar** `[FATO — `Dockerfile:71`, estágio
      `production`, de onde sai o `CMD`]`: `ENV NODE_ENV=production` está fixado na imagem. **Sem
      isso o fix seria pior que o problema** — `secure` viraria `false` em produção sem ninguém
      notar. Não é detalhe: é a premissa inteira.
      **⚠️ DEPENDÊNCIA RESIDUAL, escrita porque é o jeito de furar este fix: NUNCA declarar
      `NODE_ENV` nas variáveis do Railway.** Variável de serviço **sobrepõe** o `ENV` do Dockerfile;
      declarada ali com qualquer outro valor, o cookie volta a ser inseguro em silêncio.
      **Por que o fix ainda assim é melhor que o estado atual:** a dependência sai de uma string de
      painel **não versionada, não revisada e com muitas grafias válidas** (`BETTER_AUTH_URL`) e
      passa para uma linha **versionada, revisada em diff e de valor canônico único** (o
      `Dockerfile`). Não é remover a dependência — é movê-la para onde o git enxerga.
- [x] **`PREVIEW_TOKEN` e `COMING_SOON` estão SET no Railway** *(Ago 2026, conferido pelo operador
      no painel — só a presença, nunca o valor)*. Fecha a verificação nº 3 da seção (C) do
      `security-vulnerability-reviewer`: `PREVIEW_TOKEN` vazio faria `hasPreviewCookie` devolver
      sempre `false` (`app.ts:60-61`) e trancaria o operador fora do próprio bypass da coming-soon.
      As 7 variáveis do serviço são `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `CLIENT_URL`,
      `COMING_SOON`, `DATABASE_URL`, `DIRECT_URL`, `PREVIEW_TOKEN` — **e `NODE_ENV` corretamente
      NÃO está entre elas** (ver a dependência residual acima).
- [x] **O espaço de falha é MENOR do que a análise supunha — resolvido por dedução, não por
      inspeção do painel** `[FATO — `better-auth/dist/utils/url.mjs:36` da 1.6.20 instalada]`: o
      Better Auth **lança** `Invalid base URL: … URL must include 'http://' or 'https://'` quando o
      protocolo não é um dos dois. **Logo `BETTER_AUTH_URL` não pode conter lixo:** se contivesse, o
      servidor **não subiria**, e ele está no ar servindo a coming-soon. A hipótese de "as duas
      variáveis foram trocadas na configuração" está **descartada por evidência**, sem precisar
      revelar valor nenhum.
      **O que sobra é binário — `http://` ou `https://`** —, e nenhum dos dois muda o fix. Registrado
      porque a análise original tratava "URL mal escrita" como espaço aberto de possibilidades; o
      fornecedor já fecha quase todo ele, e **saber onde o fornecedor já protege evita construir
      guarda em cima de guarda**.
- [ ] **A verificação continua valendo — mas mede URGÊNCIA, não decide o fix.** Ela responde *"o
      cookie está inseguro AGORA em produção?"*, o que muda se isto é conserto de rotina ou incidente.
      **Como olhar sem expor valor:** painel do Railway → o serviço → aba **Variables** → conferir
      só os **8 primeiros caracteres** de `BETTER_AUTH_URL`. *(Não há CLI do Railway instalada nesta
      máquina — verificado Ago 2026; via CLI o padrão seguro seria
      `railway variables --json | jq -r '.BETTER_AUTH_URL | startswith("https://")'`, que imprime
      **apenas `true`/`false`**.)*
      **Contexto que limita a urgência:** `main` está parada em `431e989` servindo a coming-soon, e
      existem **2 usuários** (admin + member). Mesmo no pior caso, a exposição hoje é a sessão do
      próprio operador — não há aluno com sessão em produção. **Isso muda no primeiro merge**, que
      é quando o fix precisa já estar dentro.
- [x] **Teste de servidor no MESMO commit dos quatro** — é fronteira, então a exceção da *fronteira
      transversal* se aplica: supertest, sem teste de componente. Os de vazamento viram os casos
      **(11–12)** da lista da Fase 4; quando a fase chegar, o checkbox de lá **aponta para cá** em
      vez de reescrever.
- [x] **`get_advisors(type='security')` nos DOIS projetos — ✅ VERDE, e fecha uma divergência
      aberta.** *(Ago 2026, via MCP.)* Produção (`gaxmbnhwltljlkukdwba`) e teste
      (`mvaobzypsiuhqzipcelw`) devolvem **exatamente o mesmo resultado**: **11 tabelas, 11 avisos
      `rls_enabled_no_policy` de nível INFO, ZERO erro `rls_disabled_in_public`** — que é o estado
      desejado descrito no `CLAUDE.md`, não uma lacuna.
      **O que isto prova além do óbvio:** o banco de teste foi construído **só a partir das
      migrations versionadas** (`_prisma_migrations` = 4 linhas) e chegou **idêntico** à produção.
      Era exatamente essa comparação que o `CLAUDE.md` pede quando diz que *`get_advisors` responde
      "ESTE banco está ok", nunca "o REPO produz um banco ok"* — agora responde as duas.
      **Não é fechamento novo, é RE-verificação independente:** o backlog P2 nº 5
      (`_prisma_migrations` sem RLS no teste) já havia sido fechado pela migration
      `20260824214838_rls_prisma_migrations_table`, e esta leitura confirma que o estado **se
      manteve** nos dois bancos. Registrado assim de propósito — dizer "eu resolvi" o que já estava
      resolvido é o tipo de crédito errado que faz a próxima pessoa procurar um conserto que nunca
      houve.
      **⚠️ E o que esta verificação NÃO cobre, porque advisor não enxerga:** o *Automatic RLS*
      segue **ligado em produção e desligado no teste** — divergência **viva** registrada no
      changelog (9) deste plano. Ela não afeta tabela nossa (nossas migrations ligam RLS
      explicitamente), mas afeta **qualquer tabela criada fora delas**. Continua sendo decisão do
      operador, no painel do fornecedor: recomendação é **desligar em produção**, para que os dois
      ambientes dependam só do versionamento.

**T3 — XSS: a convenção agora, o helper no bloco que o usa.** A defesa que o repo tem hoje é a
proibição de `dangerouslySetInnerHTML` — uma regra **do React**. A superfície pública decidida em
Ago 2026 **sai do React**, e a proteção não migra sozinha: template de string no Express não
escapa nada.

- [x] **Convenção escrita** em `CLAUDE.md` → Rendering Boundary (mesma passada que criou este
      bloco). É o item que tem custo zero e prazo curto: precisa existir **antes** de alguém
      escrever o primeiro template, não depois.
- [ ] O helper (`escapeHtml`/`jsonLd`) + teste unitário ficam **no bloco da superfície indexável**,
      não aqui. **Razão:** função escrita dois meses antes de ter uso é função que alguém esquece
      que existe e reimplementa — *na dúvida, remove* (critério de decisão de stack). A convenção
      é o que sobrevive à espera; o código, não.

**T4 — LOGIN: a primeira tela fechada de verdade, e o molde que se repete.**

> **⚠️ ACHADO (Ago 2026) — `LoginPage.test.tsx` EXISTE e não cobre nada.** São 12 linhas que
> renderizam e conferem que três nós existem, com `expect(...).toBeTruthy()` — **o anti-padrão
> nomeado com todas as letras em `CLAUDE.md` → Test quality**. **Provado por MUTAÇÃO, não por
> leitura:** removendo o tratamento de erro inteiro do `onSubmit` (o 401, o erro genérico, o
> `console.error`), a suíte deu **`Test Files 9 passed · Tests 23 passed`**. Ou seja: o login pode
> parar de reportar senha errada e **nada no repo avisa**.
> **Por que isto vale mais que a lacuna em si:** um arquivo `.test.tsx` presente e verde é *pior*
> que arquivo nenhum — ele responde "essa tela tem teste" para quem for procurar, e desliga a
> pergunta. É a mesma família do `lint` que rodava `tsc --noEmit` e da trava `_test` que nunca
> disparava: **parece proteção e não protege**. O `.test.tsx` é reescrito, não acrescentado.

- [ ] **GRUPO A — sete testes, um por ramo real de
      [`LoginPage.tsx`](../client/src/pages/LoginPage.tsx)** (a lista sai do código, não de um
      modelo genérico de formulário):
      **(1)** e-mail inválido → mensagem do `loginSchema`, e `signIn.email` **não** é chamado ·
      **(2)** campos vazios → idem · **(3)** erro **401** → *"E-mail ou senha incorretos."* ·
      **(4)** erro **não-401** (500) → *"Não foi possível entrar agora. Tente novamente."* ·
      **(5)** sucesso → navega para `/conta` com `replace` · **(6)** durante o envio → botão
      **desabilitado** e rótulo *"Entrando…"* · **(7)** sessão já ativa → redireciona sem
      renderizar o formulário.

- [ ] **GRUPO B — sete erros clássicos.** Os três primeiros **não são hipótese: foram medidos**
      contra o `loginSchema` real (`core/src/schemas/auth.ts`) em Ago 2026.
      **(8) e (9) — RESOLVIDOS JUNTOS por uma mudança no `loginSchema`, verificada antes de
      propor.** O impasse aparente era: senha só de espaços (`"   "`) **PASSA** `[MEDIDO]`, e-mail
      com espaço nas pontas é **REJEITADO** `[MEDIDO]` — mas `.trim()` na senha **não é opção**,
      porque alteraria os bytes enviados e trancaria para fora quem tem espaço na senha de verdade.
      **A saída é separar VALIDAR de TRANSFORMAR:**
      ```ts
      email:    z.string().trim().email("Informe um e-mail válido."),
      // .refine VALIDA sem TRANSFORMAR — a senha segue byte a byte a que foi digitada.
      password: z.string().min(1, "Informe sua senha.")
                 .refine((v) => v.trim().length > 0, "Informe sua senha."),
      ```
      **Comportamento medido com a proposta aplicada:** `" a@b.com "` → vira `"a@b.com"` e passa ·
      `"   "` na senha → **rejeitado com a mensagem certa**, em vez de virar um 401 que mente ·
      `"  senha com espaços  "` → **preservada byte a byte** · `A@B.COM` → segue passando no
      client, porque **quem decide caixa de e-mail é o servidor** (é o teste (10)).
      **Cobertura de teste que isto exige:** um teste para o e-mail trimado, um para a senha só de
      espaços, e — o que **trava a regra** — um afirmando que a senha com espaços nas pontas
      **chega intacta** ao `signIn.email`. Sem esse terceiro, um "simplifica isso aí" futuro põe
      `.trim()` na senha e ninguém percebe até o chamado de suporte.
      **Escopo:** mexe em `core/src/schemas/auth.ts`, que é do `core/` compartilhado — o login é o
      único consumidor hoje, então o raio é pequeno.
      **(10) E-mail em MAIÚSCULAS (`A@B.COM`) — `PASSA` o schema** `[MEDIDO]`, mas **quem decide é
      o servidor**: se o Better Auth casar e-mail com sensibilidade a caixa, este é o chamado
      clássico de *"não consigo entrar"*. **Não é respondível lendo o client** — vira **teste de
      servidor** (supertest: semear `admin@x.com`, autenticar com `ADMIN@X.COM`).
      **(11) Senha com espaço nas pontas (`"senha "`) NÃO pode ser trimada.** Teste que trava o
      comportamento: senha é bytes do usuário. Trimar senha **tranca gente para fora** e o suporte
      nunca descobre por quê — é o inverso exato do (9), e é por isso que os dois andam juntos.
      **(12) Duplo clique no botão** → `signIn.email` chamado **uma vez só**. O `disabled={isSubmitting}`
      (`:90`) deveria cobrir; o teste prova. Sem isso, duas requisições de login concorrentes.
      **(13) Erro anterior some no envio seguinte.** `setFormError(null)` (`:28`) deveria limpar;
      o clássico é o aluno corrigir a senha e continuar lendo o erro velho, achando que falhou de novo.
      **(14) `signIn.email` REJEITA (throw) em vez de devolver `{ error }`.** O `onSubmit`
      (`:27-45`) **não tem `try/catch`** — ele espera sempre a forma `{ error }`. Numa queda de rede,
      se a promise rejeitar, a rejeição escapa do handler. **Este teste é investigativo: ele revela
      o comportamento, e pode virar achado** — mesma família do `try/catch` sem `await` do webhook
      já registrado no `CLAUDE.md`. Se virar achado, o fix entra no mesmo bloco.
- [ ] **(3) e (4) são o par que carrega o valor do bloco** — o `onSubmit` distingue os dois de
      propósito (`LoginPage.tsx:36-41`), e o bug clássico é colapsar tudo em "senha incorreta",
      que faz o aluno tentar de novo para sempre enquanto o servidor está fora. **Um teste só, do
      caminho feliz, não pega isso.** Escrever os dois separados ou não escrever nenhum.
- [ ] **Mock em `@/lib/auth-client`** (a nossa fronteira), nunca no `better-auth/react` — o
      arquivo atual já acerta nisso; é a única coisa dele que se aproveita.
- [ ] **`renderWithProviders`** (`@/test-utils`) em vez do `MemoryRouter` montado à mão.
      **⚠️ Detalhe de implementação que vai aparecer no meio do caminho:** o helper monta **uma**
      rota só (`path`, default `"*"`), então o teste (5) não tem `/conta` onde aterrissar. Resolver
      **estendendo o helper** com uma rota extra opcional — não mockando `useNavigate`, que testaria
      implementação em vez de comportamento observável.
- [x] **Prova por mutação — feita, e o contraste é o resultado do bloco.** A MESMA mutação (apagar
      o tratamento de erro do `onSubmit`) que antes dava **23/23 verde** agora derruba **4 testes**;
      revertida, **35/35**. O arquivo antigo tinha 12 linhas e não podia falhar; o novo tem 13
      testes e falha quando deve.
- [x] **BUG REAL ENCONTRADO PELO TESTE (14), não por leitura.** `signIn.email` normalmente resolve
      com `{ error }`, mas numa **queda de rede ela REJEITA** — e o `onSubmit` não tinha `try/catch`.
      A rejeição escapava do handler: **nenhuma mensagem aparecia e o botão ficava preso em
      "Entrando…"**, sem a pessoa saber o que houve. O teste falhou de primeira, o `try/catch`
      entrou, e passou. *Registrado porque é o argumento inteiro do passo 8 em uma frase: o teste
      investigativo pagou por si mesmo na primeira execução.*
- [x] **`loginSchema` mudado** (`core/src/schemas/auth.ts`): `.trim()` no e-mail (transforma) e
      `.refine()` na senha (valida sem transformar). Consumidor único é o `LoginPage`.
- [x] **`renderWithProviders` ganhou `extraRoutes`** — sem uma rota de destino, o teste de "entrou
      e foi redirecionado" não tinha o que assertar. A alternativa era mockar `useNavigate`, que
      testaria implementação; um marcador na rota de destino testa comportamento observável.
- [x] **Sem dependência nova:** usado `fireEvent` + `waitFor`, o idioma que os testes existentes já
      usam. `@testing-library/user-event` não está instalado e não foi instalado — dependência é
      decisão de plano, não `npm install` no meio do bloco.
- [x] **SUÍTE DE SERVIDOR DO LOGIN — `server/src/test/login.test.ts`, 10 testes.** É o critério 4
      (*rota que toca acesso exige teste de servidor*), e faltava: os 13 testes de tela mockam a
      API, logo provam que o formulário se comporta — **nenhum prova que o servidor recusa quem
      deve recusar**. Cobre: credencial correta emite sessão UTILIZÁVEL (linha criada não prova
      sessão) · senha errada, e-mail inexistente, senha vazia e senha só de espaços → **401
      exato** · **cadastro público → 400 `EMAIL_PASSWORD_SIGN_UP_DISABLED`** · cookie com
      `httpOnly` e `sameSite`.
      **Achado que vale além do login — ENUMERAÇÃO DE USUÁRIO está fechada:** senha errada e e-mail
      inexistente devolvem status **e corpo idênticos** (`INVALID_EMAIL_OR_PASSWORD`), então
      ninguém descobre quais e-mails têm conta na escola sem ter a senha. Havia um teste para isso
      porque é propriedade de segurança de qualquer login, não porque suspeitávamos.
- [x] **Caso (10) RESOLVIDO por medição: e-mail em MAIÚSCULAS AUTENTICA** — o Better Auth normaliza
      a caixa. O chamado de suporte que se temia não existe. O teste fica no repo com falha
      explicativa, para que uma regressão futura apareça no CI em vez de na caixa de entrada.
- [x] **Asserções apertadas depois de MEDIR os status reais.** A primeira versão usava
      `not.toBe(200)` — que **um 500 satisfaz**: servidor quebrado seria lido como "acesso negado
      corretamente". Trocado por 401/400 exatos. *Mesmo defeito de família do `.toBeTruthy()` que
      condenou o teste antigo desta tela, agora encontrado no próprio código novo.*
- [x] **Dois últimos casos do login fechados.** **(a) E2E: a sessão sobrevive ao F5** — é o caso
      que só um browser prova (componente mockaria a sessão; servidor não guarda cookie). O sintoma
      que ele evita: o aluno entra, aperta F5, é deslogado e desiste antes de abrir chamado.
      **(b) Servidor: aluno excluído (LGPD) não obtém acesso** — o `deletedAt` marca sem apagar, e
      o teste prova que o cookie eventualmente emitido **não abre nada** (`/api/me` → 401). Mutado
      o `deletedAt` de `middleware/auth.ts:31`, a suíte **reprova**.
- [x] **ACHADO DE MÉTODO (registrado como convenção no `CLAUDE.md` → Testing): E2E não prova a
      fronteira do servidor.** Mutando `loadSession` para devolver `null` sempre — servidor
      recusando TODA sessão — os **7 testes de E2E passaram**. A tela resolve "estou logado?" pelo
      cliente do Better Auth; o middleware protege as rotas de **dados**, que a navegação não
      exerce. A mesma mutação reprova a suíte de servidor. **É fácil olhar "E2E verde" e concluir
      que o acesso está provado; não está, e a conclusão errada é indetectável.**
- [x] **Honestidade sobre o teste de F5:** ele passa, mas **não achei mutação que só ele pegue** —
      os testes existentes já fazem `page.goto()` depois do login, que é igualmente um carregamento
      de página completo. Valor único baixo; fica porque nomeia a intenção explicitamente e custa
      ~1s de CI. Registrado em vez de omitido, porque cobertura que não se sabe medir é a mesma
      família do teste que não pode falhar.
- [x] **Prova por mutação da suíte de servidor:** `disableSignUp: true → false` derruba o teste de
      cadastro (`expected 200 to be 400`); revertido, 13/13.
      **⚠️ LIÇÃO REGISTRADA — a mutação FALHOU EM APLICAR duas vezes nesta sessão, e nas duas o
      output verde parecia aprovação.** Na primeira, o padrão casou um **comentário** em vez da
      configuração; na segunda (bloco T1) o guard era rota-pai e o script abortou sem escrever.
      **Toda mutação passa a exigir verificação de que ela de fato entrou no arquivo** — imprimir a
      linha alterada antes de rodar a suíte. Mutação que não aplica é a mesma família do teste que
      não pode falhar: dá confiança sem dar informação.

**T5 — a cadência, escrita uma vez para não ser redecidida por tela.**

> **DECISÃO DO OPERADOR (Ago 2026): fase não fecha sem teste — e o gatilho é TOCAR a tela, não a
> data da fase.** Isto **refina, não reverte**, o *"vale daqui pra frente"* da *Definição de pronto
> por fatia*: não se volta para cobrir tela parada, mas **toda tela que entra em trabalho sai
> fechada**. **Razão do operador: evitar retrabalho** — descobrir o defeito na tela seguinte custa
> reabrir a anterior, e reabrir é o que consome a sessão de quem trabalha sozinho e em semanas
> alternadas. *Gatilho de reabertura: se a cadência começar a segurar entrega — duas telas seguidas
> em que o teste custou mais que a feature —, o problema é o tamanho da fatia, não a regra.*

Ao fechar **qualquer** tela, nesta ordem (é a *Definição de pronto por fatia* do `CLAUDE.md`,
tornada executável — não uma lista nova):
1. Caminho feliz funciona no browser.
2. **Loading, erro e vazio existem** na tela.
3. **Um teste de componente por estado acima** + um por ramo de decisão do arquivo.
4. **Teste de servidor SE a rota tocar acesso ou dinheiro** (aí é fatia própria: supertest, sem
   teste de componente — a fronteira não tem tela).
5. **Mutação:** quebrar de propósito o ramo mais importante e confirmar que a suíte **reprova**.
   *Sem este passo os 4 anteriores não provam nada — é o que este bloco acabou de demonstrar.*
6. CI verde · diff revisado · checkbox e doc no **MESMO** commit.

- **Done when (Bloco T):** existe job E2E no CI e ele **reprova por mutação** · os **quatro** P1
  fecham com teste de servidor no mesmo commit · a convenção de escape está no `CLAUDE.md` · **a
  tela de login fecha pelos 6 passos do T5, e a mutação do `onSubmit` reprova a suíte**.
  **Não** inclui escrever template público nenhum — isso é o bloco da superfície indexável, depois
  do Bunny.

#### Postura de segurança — o que JÁ está coberto  *(varredura completa do `security-vulnerability-reviewer`, Ago 2026, branch `dev` @ `d9b22ea`)*

> **Por que isto está escrito:** sem inventário, toda auditoria futura re-descobre o mesmo chão e
> "propõe" proteção que já existe — o mesmo desperdício que o `decisions-archive` evita do lado das
> decisões. **Cada linha tem o arquivo que a prova**; nenhuma é afirmação de memória.

- **Fronteira de acesso:** `requireAuth`/`requireAdmin` compartilham `loadSession()`
  (`middleware/auth.ts:27-35`), que rejeita `deletedAt` **antes** de qualquer uso — soft-delete vale
  para os dois guards · `requireAdmin` faz auth antes de papel (401 sem sessão, 403 não-admin,
  `:61-69`) e compara com `Role.ADMIN`, nunca literal · **`userId` nunca vem do client** — toda rota
  de dono lê `req.user.id` da sessão · `isTemplate`/`ownerUserId` são forçados no servidor e
  **ausentes do Zod**, então membro não fabrica template · `/trilhas/mine` registrada **antes** de
  `/trilhas/:slug`, então `:slug` não captura `mine`.
- **Leitura pública:** `/api/courses` e `/api/courses/:slug` filtram `PUBLISHED` em curso **e**
  módulo **e** aula · `/api/search` faz a cadeia completa — **é a referência correta do repo** ·
  leituras admin de qualquer status vivem sob `/api/admin/*`.
- **Validação:** **todas** as rotas que recebem body usam `validate()`; nenhuma escapou. Todo `:id`
  numérico passa por `parseId`.
- **Segredos:** zero segredo hardcoded no repo · **zero `VITE_*` e zero `import.meta.env`** no
  client, então nenhuma superfície de env chega ao bundle · `.gitignore` com o padrão correto
  (`.claude/*` + `!.claude/agents/`, `.env.*` + `!.env.example`) · **zero `console.*` em qualquer
  handler** · em produção o stack **não** vai no corpo da resposta (`NODE_ENV=production` fixado no
  Dockerfile).
- **Auth:** `disableSignUp: true` · `role`/`deletedAt`/`marketingConsent`/`acquisition*` todos com
  `input: false` · Better Auth montado **antes** do `express.json()` com `.catch(next)` ·
  `trustedOrigins` é allow-list que devolve `[]` em produção para origens de dev.
- **Client:** **zero `dangerouslySetInnerHTML`**, zero `innerHTML`, zero `eval` · o único sink de
  URL vinda do servidor é `<img src={course.thumbnailUrl}>` (`CourseCard.tsx:28`) — **não existe
  nenhum `<a href={dadoDoServidor}>`** · Axios com `baseURL` relativo, sem `cors` instalado,
  coerente com o desenho de mesma origem.
- **RLS: 11/11 tabelas**, cada uma na MESMA migration que a criou — as 4 do Better Auth, as 6 de
  conteúdo/trilhas, e `_prisma_migrations`. *(Prova estática; a confirmação no banco vivo é o
  checkbox de `get_advisors` acima.)*
- **Travas de banco de teste:** `TEST_DB_REF` verifica **identidade** do ref e roda antes de
  qualquer conexão; `childEnv()` passa o ambiente explicitamente para não herdar `server/.env`.

#### Backlog P2 — endurecimento (não bloqueia o Bloco T; ordenado por quando o risco aparece)

- [ ] **`app.ts` não tem handler de erro nenhum** — o único rastro de um 500 hoje é o `logerror`
      default do Express: `console.error(err.stack)`, cru e sem redação. **É pré-requisito da Fase
      4**, não polish: o checklist do webhook exige registrar "IDs + status", e não existe lugar que
      faça isso; um stack cru de cliente Stripe/Bunny/Resend é exatamente o que carrega chave ou
      payload inteiro para o log do Railway. Handler terminal logando
      `{ method, path, status, errorName, message }` — **nunca `err.stack` verbatim**.
- [ ] **`.max()` nos campos de texto autorados** (`core/src/schemas/content.ts:29-41,56-73`) e
      **trocar `z.string().url()` por checagem explícita de esquema** em `thumbnailUrl` — ver a
      convenção nova em `CLAUDE.md` → Shared `core/` package (o `.url()` aceita `javascript:` e
      `data:text/html`, **medido neste repo**, não suposto).
- [ ] **`introVideoId` sem formato** (`content.ts:70`) — hoje inerte, mas na Fase 3 esse valor vai
      ser interpolado numa URL/iframe do Bunny **numa rota de HTML de servidor sem escape
      automático**. Restringir ao GUID do Bunny Stream; **confirmar o formato exato via context7
      `/bunnyway/documentation`** (query dizendo "Stream") na MESMA chamada que a fase já exige.
      Custa zero agora, caro depois do template existir.
- [ ] **Escritas admin fora de `/api/admin/*`** (`courses.ts:138,150,171` · `modules.ts` ·
      `lessons.ts` · `trilhas.ts:139`). O `requireAdmin` **está presente em todas** — nada exposto
      hoje. O achado é que **o path deixou de codificar a fronteira**: `POST /api/courses` parece
      rota pública, e uma rota nova acrescentada ao lado herda o path público e **nenhum middleware
      por default**, com o erro invisível no diff. Alternativa mais barata que mover tudo:
      `router.use("/admin", requireAdmin)`, para prefixo e guard virarem o mesmo fato.
- [ ] **Token de preview no query string** comparado com `===` (`app.ts:80-92`). Impacto baixo (o
      ativo é o bypass da coming-soon), mas **contradiz "nunca logar segredo" por construção**:
      token em URL é gravado por proxy, histórico e `Referer` — o operador não tem como evitar o
      log. Receber por header/POST + `crypto.timingSafeEqual`.
- [ ] **`seed.ts:101` despeja o objeto de erro inteiro** (`console.error("Seed failed:", err)`), e o
      caminho passa por `signUpEmail({ body: { password } })` — o `APIError` do Better Auth
      serializa seu `body`. O padrão correto está no arquivo ao lado (`rotate-credentials.ts:157`,
      só `err.message`). Idem `seed-content.ts:165`.
- [ ] **Sem `helmet`** — nenhum header de segurança. Hoje o que expõe é estreito (app mesma-origem,
      sem `dangerouslySetInnerHTML`, sem sink de `href`): falta `nosniff`, falta
      `X-Frame-Options`/`frame-ancestors` (**a app pode ser enquadrada** → clickjacking em `/conta`
      e `/admin`), falta `Referrer-Policy` — que é justamente o que faz a URL `/__preview?token=`
      vazar. **Entra no MESMO bloco que introduzir o HTML público de servidor**, não antes: a CSP
      precisa conhecer a origem do Bunny (`frame-src`) e a da Stripe (`script-src`), e escrita antes
      é escrita duas vezes. Dependência de runtime nova ⇒ **decisão de nível de plano**.

### Bloco S — Shell do aluno: menu lateral e, depois, painel  *(Ago 2026 · direção do operador)*

> **DIREÇÃO DECIDIDA: o modelo é o LinkedIn Learning, não o Udemy nem o Mosh.**
> *(Operador, Ago 2026, comparando as três referências.)* Udemy usa barra de ícones sem rótulo —
> econômica em espaço, mas exige aprender os ícones. Mosh usa menu horizontal no topo — não cresce.
> **LinkedIn: barra lateral com ícone + rótulo, agrupada por seção** — é a que suporta o destino
> real desta tela.
>
> **O destino é um PAINEL DE ESTUDO**, não uma home institucional: progresso, o que falta concluir,
> o que estudar em seguida, trilhas em andamento. Isso é o que decide o formato — um painel tem
> muitas entradas e vai ganhar mais; menu de topo satura, barra lateral não.

- [x] **Já em vigor:** link "Minha conta" no cabeçalho, e **o login cai em `/inicio`** — a home do
      aluno. *Nem a conta (destino de TAREFA: mudar dados, assinatura) nem o catálogo (uma SEÇÃO da
      home, não o começo dela).* Destino declarado numa constante única (`POS_LOGIN` em
      `LoginPage.tsx`): quando a home virar painel, nada mais muda de lugar.
      **`StudentHomePage` nasce magra de propósito** — saudação, o vazio de "continue estudando" e
      a porta para o catálogo. **Não busca dados**, e por isso não tem estado de carregando nem de
      erro; quando passar a buscar, os três entram junto com os testes deles. O conteúdo real
      **depende da Fase 5** (progresso): sem `LessonProgress` não existe "o que você estava vendo",
      e encher a tela com dado de mentira esconderia a dependência.
- [x] **DOIS ACHADOS que só apareceram porque o E2E agora roda:**
      **(a)** `CardTitle` renderiza uma `div`, não um cabeçalho — a página da conta **não tinha
      título nenhum** para leitor de tela, que navega por títulos. Ganhou um `<h1>` de verdade
      (mesmo padrão do `AdminPage`).
      **(b)** O teste de logout ficou instável enquanto o destino pós-login era o **catálogo**, que
      busca dados; com a home, que não busca, estabilizou. *Registrado porque a causa provável —
      clicar durante uma busca em andamento — vai reaparecer quando a home passar a buscar, e aí a
      spec precisa esperar o dado, não o navegador.*
- [x] **Cabeçalho provisório completo:** Início · Catálogo · Minha conta · Sair (+ Admin por
      papel), e **a marca leva para `/inicio` quando há sessão** — logada, ela levava para a landing
      pública, ou seja, mandava quem já assina de volta para a página que tenta convencê-lo a
      assinar. **Lacuna fechada junto: o `Layout` nunca teve teste**, apesar de ser ele que decide o
      que cada papel enxerga. 6 testes (visitante / aluno / admin); o que mais importa é o aluno
      **não ver o item Admin** — não é sobre acesso (o servidor barra, e isso já é testado), é sobre
      não anunciar a existência de uma área que não é dele. Mutação derruba.
- [ ] Barra lateral (ícone + rótulo, agrupada), substituindo o link provisório do cabeçalho.
      **ESCOPO — a MESMA barra serve os DOIS ambientes** *(operador, Ago 2026)*: área do aluno **e**
      área administrativa inteira. Não são dois componentes; é um, com itens diferentes por papel —
      dois componentes divergem em espaçamento, comportamento e estados de foco, e a divergência
      aparece como "o admin parece outro site".
- [ ] **Retraída ↔ expandida, como na Udemy** — recolhida mostra só ícone, expande ao passar o
      mouse; e o estado escolhido **persiste** (quem recolheu não quer recolher de novo a cada
      visita). **Trava de acessibilidade:** expandir só por mouse exclui quem navega por teclado —
      o rótulo tem que estar sempre disponível para leitor de tela (via `aria-label` ou texto
      visualmente oculto), mesmo com a barra recolhida. Mesma regra do destaque de erro do login:
      **a informação nunca pode existir só no visual.**
- [ ] **Painel do aluno** como destino pós-login: progresso, próxima aula, trilhas em andamento.
      **Depende da Fase 5** (captura de progresso) — sem `LessonProgress` não há o que mostrar, e
      construir a casca antes deixa uma tela vazia que ninguém sabe se está quebrada.
- [ ] Navegação mobile — o menu lateral obriga a decidir isto, que o cabeçalho atual adiava.
- **Done when:** o aluno entra e vê para onde ir sem digitar URL; a conta é alcançável em 1 clique
  de qualquer tela.

### Vídeo (o corpo da fase)

- [x] **Infra: migrations em prod via pre-deploy — FEITO (Ago 2026), por CONFIG-AS-CODE.**
      `railway.json` na raiz com `deploy.preDeployCommand`, em vez de configurar no painel.
      **Por que arquivo e não painel:** é a mesma lição do `NODE_ENV` — configuração em painel não
      é versionada, não passa por revisão de diff e ninguém audita. No arquivo, ela viaja com o
      repo. **Garantia que a Railway dá** `[FATO — context7 `/railwayapp/docs`]`: *"if your command
      fails, the deployment will not proceed"* — migration quebrada **bloqueia** a publicação em
      vez de subir código novo contra banco velho, que é exatamente o modo de falha temido.
      **⚠️ ACHADO que teria quebrado a primeira publicação:** o `prisma` (a CLI que roda a migração)
      era **devDependency**, e o estágio de produção do Dockerfile instala com `--omit=dev` — o
      comando falharia em TODO deploy. Movido para `dependencies`. As migrations já eram copiadas
      para a imagem (`Dockerfile:91`), então só faltava a ferramenta.
      **Comando verificado rodando da RAIZ**, que é onde o container executa (`WORKDIR /app`), não
      de dentro de `server/` como fazemos aqui — daí o `--schema server/prisma/schema.prisma`
      explícito, sem o qual o Prisma não acha o schema (CLAUDE.md → Database & Migrations).
      *(Não substituído: o item original abaixo descrevia a configuração pelo painel.)*
- [ ] ~~Configurar~~ *(substituído pelo item acima — mantido o texto original por rastreabilidade)*
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
- [ ] **TESTES DE SERVIDOR do gate de vídeo — escritos JUNTO com a rota que assina a URL, não
      depois** (mesma disciplina da Fase 4; a rota é fronteira de acesso e **não tem tela**, então
      é fatia própria: supertest, sem teste de componente). Casos mínimos:
      **(a)** anônimo pede URL assinada → **401** · **(b)** membro autenticado **sem assinatura
      ativa** → **403** · **(c)** membro com acesso → **200 + URL assinada** · **(d)** a URL
      devolvida **não** é a URL crua do Bunny (assere a presença do token, não a ausência de erro)
      · **(e)** `introVideoId` responde para **não-membro** — é a TRAVA do vídeo de venda, e é o
      único caso em que "200 sem sessão" é o comportamento correto; sem teste, o próximo agente
      fechando buracos de gating **conserta** essa exceção e quebra a página de vendas.
- [ ] E2E: non-member cannot get a playable URL
- **Done when:** a member plays a lesson; a non-member is blocked. *Test the gate hard.*

### Bloco — Superfície pública indexável  *(Ago 2026 · política em `CLAUDE.md` → Rendering Boundary)*

> **SEQUENCIAMENTO DECIDIDO: este bloco vem DEPOIS do Bunny.** O `introVideoId` é ativo do Bunny
> numa rota **pública** (o vídeo de apresentação toca para não-membro), e é o único ponto onde as
> duas frentes se tocam. Construir a página pública antes de saber como o Bunny assina e embeda
> significa construí-la duas vezes. A **fronteira** já está decidida, então o player nasce do lado
> privado desde o dia um — só o payload de SEO espera.

- [ ] **PRIMEIRO ITEM DO BLOCO — `server/src/lib/html.ts`: `escapeHtml()` + `jsonLd()`.** Vem antes
      do primeiro template, não depois: escape retrofitado é escape com furo, porque ninguém
      relê 6 arquivos procurando a interpolação que escapou. **São DUAS funções porque são dois
      problemas diferentes:** `escapeHtml` cobre texto e atributo (`&`, `<`, `>`, `"`, `'`);
      `jsonLd` serializa o bloco `<script type="application/ld+json">`, onde escapar HTML
      produziria `&amp;` **visível para o crawler** (quebrando o dado estruturado que o bloco
      inteiro existe para emitir) e o risco real é outro — fechar o `</script>` de dentro da
      string, o que se resolve com `JSON.stringify` + `<` → `<`. Usar um no lugar do outro
      falha nas duas direções.
- [ ] **Teste unitário do helper** — é a **única unidade genuína de todo o plano**, e cabe aqui
      porque a função é pura: sem I/O, sem banco, sem tela. Casos: `<script>` em texto · `"` em
      atributo (o que quebra `content="…"` das metas OG) · `</script>` dentro do JSON-LD · e o que
      passa despercebido em revisão de diff — **string já escapada não pode ser escapada duas
      vezes** (`&amp;amp;` na página é o sintoma).
- [ ] **Template das rotas públicas** — Express + Tailwind, **sem React**: `/`, `/cursos`,
      `/curso/:slug`, `/trilha/:slug`, `/certificado/:publicId`, páginas legais.
      **TRAVA: todo valor vindo do banco passa por `escapeHtml()`** (`CLAUDE.md` → Rendering
      Boundary). Os campos que alimentam estas páginas — `subtitle`, `description`, `learnTags[]`,
      `requirements[]`, `personas[]`, `highlights[]`, `faq[]` — são **texto livre autorado no
      painel admin**, e o Zod do `validate()` confere **forma, não conteúdo**.
- [ ] **Teste de servidor de XSS na rota pública** (supertest, sem browser): semear um curso com
      `<script>alert(1)</script>` na `description` e no `faq[].resposta`, pedir `GET /curso/:slug`
      e assertar que o HTML de resposta contém `&lt;script&gt;` e **não** contém `<script>alert`.
      *É um teste que só existe porque a defesa saiu do React — enquanto era React, o framework
      garantia isso e testá-lo seria testar o React.*
- [ ] **Metas por rota, no HTML da primeira resposta:** `<title>` e `description` **próprios da
      página** (nunca o genérico do site), Open Graph completo (`og:title`, `og:description`,
      `og:image`, `og:url`, `og:type`, `og:site_name`) + `twitter:card=summary_large_image`, e
      `<link rel="canonical">` absoluto.
- [ ] **Três blocos `<script type="application/ld+json">`, separados** (receita verificada no fonte
      da página de compra do Mac mini, ago/2026):
      **`Course`** com `provider` (Organization), `offers` (a assinatura), `teaches`/`about` (de
      `learnTags[]`), `educationalLevel` (de `level`) · **`FAQPage`** com `Question`/`acceptedAnswer`
      alimentado por `faq[]`, que **já existe** no modelo — **é o mais valioso**, porque o texto fica
      duas vezes no HTML (visível + JSON) e é a forma que crawler de IA extrai melhor ·
      **`BreadcrumbList`** — Início → Cursos → [curso].
      ⚠️ `[VERIFICAR antes de codar]` campos obrigatórios de `Course` em schema.org e os requisitos
      do Google para resultado rico de curso — **a lista acima é proposta, não doc verificada.**
- [ ] **`sitemap.xml` gerado do banco** (rota do servidor, não arquivo estático): cursos e trilhas
      `PUBLISHED`, certificados com `isPublic=true`. `DRAFT`/`ARCHIVED` **nunca** entram — o sitemap
      respeita o mesmo filtro das leituras públicas.
- [ ] **`robots.txt`** conforme a política decidida (permite busca **e** treino) + **`noindex`** em
      `/aluno/*` e `/admin/*`, via meta **e** via `robots.txt`.
- [ ] **Botão de compartilhar** em curso, trilha e certificado — `navigator.share` quando existir,
      com fallback de copiar link + links diretos LinkedIn/WhatsApp. **ORDEM IMPORTA:** share **sem**
      as OG tags compartilha card genérico. As metas vêm primeiro.
- [ ] **Google Search Console — conectar AGORA** (a verificação demora e queremos histórico desde o
      dia um), sabendo que **só produz dado ~30–60 dias depois do catálogo ir ao ar**: hoje o que
      está no ar é a coming-soon e não há página indexável. GSC mede **o nosso** desempenho no que
      já existe; **não substitui** ferramenta de pesquisa de mercado (volume, dificuldade de termo,
      tráfego de concorrente), que responde perguntas de **antes** de existir site.
- **Done when (teste de aceitação — obrigatório antes de marcar os checkboxes):**
  1. `curl -s https://www.jilsonsantana.com/curso/<slug> | grep -c "<uma frase visível da página>"`
     → tem que ser **≥ 1**.
  2. No browser: `Cmd+U` (view-source) e `Cmd+F` numa frase que aparece na tela → **tem que achar**.
  3. ⚠️ **NUNCA usar o DevTools para este teste** — ele mostra o DOM já renderizado e mente sempre
     a favor do JavaScript. O único juiz é o fonte cru.
  4. Os três JSON-LD validam no Rich Results Test do Google.

## Phase 4 — Billing & Membership Gate (Stripe Payments + Stripe Billing)  *(HIGH RISK — own sessions)*

> **Decisão revista Ago 2026:** usamos **Stripe Billing** para operar a recorrência, mantendo
> **Payment Element embutido** e **sem Customer Portal**. O aluno continua sem sair do site.
> Ver `tech-stack.md` → Billing. O risco desta fase mudou de lugar: saiu da *mecânica de
> cobrança* (agora é da Stripe) e concentrou-se na **fronteira de acesso** — é lá que o teste
> tem que ser duro.

`Docs check (context7)`: **obrigatório** nesta fase — Stripe → `/websites/stripe`. Preencher no
plano de cada bloco antes de escrever código (CLAUDE.md → Context7).

- [ ] **ESLint entra AQUI** (gatilho registrado em `CLAUDE.md` → changelog Ago 2026 (11)):
      typescript-eslint, escopo inicial `server/src`, **bloqueante no CI**, 2–3 regras. A que se
      justifica sozinha é **`no-floating-promises`** — promise não aguardada escapa do `try/catch`,
      vira *unhandled rejection* e pode derrubar o Node **dentro do handler de webhook da Stripe**;
      typecheck passa, teste passa, cai em produção. O nome `lint` está livre desde o Bloco 0.
      **Por que não antes:** trazer o ESLint agora seria limpar avisos em código que já funciona,
      com zero aluno — não passa no critério de decisão de stack. Aqui ele entra junto do código
      que a regra protege.
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
- [x] **DECISÃO TOMADA (Ago 2026) — o gatilho disparou e a resposta é POSTGRES LOCAL SÓ PARA TESTE.
      Reverte a decisão de Ago 2026 que rejeitava banco local; a reversão traz DADO NOVO, como a
      regra exige.** O gatilho registrado era *"quando o operador começar a autorar conteúdo de
      verdade em dev"* — e ele disparou no dia em que o operador abriu o `/admin` local para
      trabalhar. **O dado novo é a colisão em si:** `mvaobzypsiuhqzipcelw` servia dev **e** teste, e
      `migrate reset --force` não distingue um do outro.
      **O desenho que fica — TRÊS ambientes, um por papel:**

      | Ambiente | Banco | Quem usa | Apagado? |
      |---|---|---|---|
      | Produção | Supabase `gaxmbnhwltljlkukdwba` | só o Railway | nunca |
      | Dev / escola | Supabase `mvaobzypsiuhqzipcelw` | `dev:server`, o operador no `/admin` | **nunca** |
      | Teste | **Postgres local** | `server run test` · `e2e run test` | a cada execução |

      **Por que local e não um terceiro projeto Supabase:** custo **US$ 0** contra US$ 10/mês, e
      `migrate reset` deixa de ser perigoso — martelo só é problema quando o que está embaixo tem
      valor. **Resolve por CONSTRUÇÃO, não por disciplina**, que é o que importa para quem trabalha
      sozinho em semanas alternadas: prefixo de fixture e limpeza seletiva (ambos considerados)
      dependem de lembrar, e lembrar decai com duas semanas fora.
      **A premissa de custo foi VERIFICADA, não suposta** `[FATO — MCP `get_organization`, Ago 2026:
      `"plan": "free"`]`: a organização está no **Free**, que permite 2 projetos ativos, então hoje
      os dois Supabase custam **US$ 0**. Os US$ 10 do segundo só existem depois do upgrade para Pro,
      que o `CLAUDE.md` já amarra à chegada de alunos pagantes — custo já orçado, não custo novo.
      **O que se temeu perder e NÃO se perde:** a comparação de paridade que pegou o furo do
      `_prisma_migrations` exige um banco construído **só a partir das migrations** para confrontar
      com produção — e o projeto de dev continua sendo exatamente isso, agora nesse papel. O
      `get_advisors` segue valendo nele.
      **Instalação: PostgreSQL 17.11 — NÃO o 18**, ainda que o instalador ofereça o 18.6. **Duas
      razões, e a primeira é a que decide:** *(i)* o Prisma deste repo é o **5.22.0**, pinado por
      decisão própria, e é **anterior** ao PostgreSQL 18 — usar o 18 é rodar uma combinação que o
      Prisma nunca viu, justamente em migration e introspecção; o risco não é "quebra", é
      **depurar na direção errada** quando quebrar. *(ii)* produção roda `17.6.1`, então a mesma
      major mantém a paridade — e o repo **já tem essa dor catalogada** no backlog de divergência
      de runtime do Node (*"testamos num runtime e publicamos em outro"*): abrir um segundo caso da
      mesma família, agora no banco, com o primeiro ainda aberto, não passa no critério de decisão
      de stack. O 18 não impede nenhuma falha descritível em uma frase.
      Marcar **Command Line Tools** (o `psql` é o que dá inspeção do banco local, já que não há MCP
      para ele); desmarcar **Stack Builder**; pgAdmin 4 é opcional. **Trava do Prisma:** sem pooler local,
      `DATABASE_URL` e `DIRECT_URL` recebem **o mesmo valor** — sem isso o Prisma reclama de
      variável ausente e a mensagem não deixa óbvio que é essa.
      **Gatilho de reabertura:** se a suíte passar a precisar de recurso que só o Supabase tem
      (Data API, extensão específica, comportamento de RLS sob o papel `anon`), o banco de teste
      volta para a nuvem — hoje nada disso é exercitado, porque o Prisma conecta com papel que
      ignora RLS.
      **✅ EXECUTADO (Ago 2026), com as provas:** PostgreSQL **17.11** instalado · banco
      `jilsonsantana_test` criado · **4 migrations aplicadas** · **11 tabelas, 0 sem RLS** — mesma
      contagem do Supabase, o que faz do banco local uma **terceira testemunha** de que o repo
      produz um banco protegido, agora em outra plataforma · seed com admin + member · suíte
      **3/3 verde** em 4s · trava reescrita e **provada nos 7 casos** (local ✓ · `127.0.0.1` ✓ ·
      `[::1]` ✓ · Supabase produção ✗ · Supabase dev ✗ · a armadilha `evil.com:5432/localhost` ✗ ·
      lixo não-parseável ✗). *A trava foi testada como **função isolada**, nunca pelo `globalSetup`
      inteiro: se tivesse bug, o `migrate reset` teria acertado a nuvem de verdade.*
      **A prova que fecha o item:** rodar `npm test` (que executa `migrate reset --force`) e
      confirmar em seguida, via MCP, que o banco de **dev** seguia com 2 cursos, 2 módulos, 3 aulas,
      1 trilha e 2 usuários — **intacto**. Era exatamente esse comando que destruía o trabalho.
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
- [ ] **INSTALAR a AI SDK — dependência nova JÁ APROVADA pelo operador (Set 2026), só executar:**
      `npm --workspace server i ai @ai-sdk/anthropic @ai-sdk/google`. Server-side only;
      rate-limited per member; chat panel in member area. **A aprovação é desta lista exata** —
      qualquer pacote além destes três volta a ser decisão de plano.
- [ ] **`llm.complete()` resolve o modelo por STRING** via `createProviderRegistry`
      (`"anthropic:claude-sonnet-5"` default, `"google:gemini-…"` como segunda opção).
      **`generateText`/`streamText` NÃO saem deste arquivo** — a Vercel é fornecedor como
      qualquer outro, e sair dela tem que custar um arquivo (ver `CLAUDE.md` → JilsonAI).
- [ ] **Catálogo de modelos permitidos em `core/src/constants/`**, e o valor que vem do admin é
      **validado contra ele** — nunca repassado cru ao registry. (String de modelo escolhida pelo
      usuário é entrada não confiável, como qualquer outra.)
- [ ] **`AiEvent` grava QUAL modelo atendeu.** Sem essa coluna não há como responder depois
      *"a qualidade caiu quando eu troquei?"* — e é a única evidência que sobra.
- [ ] **Seletor de modelo no admin — SÓ ENTRA JUNTO com o harness de eval** (JILSONAI.md Fase 3).
      **Não é preferência de sequência:** trocar de modelo sem reexecutar conversas antigas
      degrada o JilsonAI **sem erro, sem log e sem aviso** — descobre-se pelo aluno reclamando
      semanas depois. Seletor sozinho é um botão para piorar o produto às cegas.
- [ ] **Reconferir preço de API na abertura desta fase** — os números do `jilsonai.md` são de
      set/2026 e preço de fornecedor envelhece sozinho. Não copiar do doc; conferir.
- [ ] **DECISÃO PENDENTE — qual renderer de Markdown.** O `CLAUDE.md` já **proíbe**
      `dangerouslySetInnerHTML` e manda renderizar "com HTML bruto desabilitado ou sanitizado",
      mas **a biblioteca nunca foi escolhida nem instalada** (conferido em Ago 2026: não há
      `react-markdown`, `marked` nem `dompurify` em nenhum `package.json`). É dependência nova ⇒
      **decisão de nível de plano** (Working Method), não `npm install` no meio do bloco.
      **Requisito que decide:** desabilitar HTML bruto por **configuração**, não por sanitização
      posterior — desligar a porta é verificável em uma linha de config; sanitizar é confiar numa
      lista de bloqueio que envelhece.
- [ ] **Teste de componente do painel de chat cobrindo o caso adversário**, não só o feliz: uma
      resposta do modelo contendo `<img src=x onerror=alert(1)>` e uma contendo `[link](javascript:…)`
      renderizam como **texto**, nunca como nó ativo. **Por que este teste é obrigatório e o resto
      da tela não é:** este é o **único** ponto do produto onde conteúdo gerado por um modelo
      **alimentado com input de aluno** vira DOM — é o vetor nomeado no `CLAUDE.md` como o real,
      não hipotético.
- **Done when:** members ask and get answers in Jilson's voice; unresolved → escalation; JilsonAI
      suggests a curated trilha by goal. (RAG, KB, montagem de plano por IA = JILSONAI Fase 4–5, pós-launch.)

## Phase 6.5 — Certificates (trilha + course completion)  *(low–medium risk — MVP: "escola nasce completa")*

- [ ] `Certificate` (user, planId/courseId, issuedAt, `nameSnapshot`, `skillsCovered[]`, **`isPublic` default false**) + RLS ; migration
- [ ] Server-side PDF on 100% completion of a trilha (or course). Name = trilha name; lists skills covered.
- [ ] If `User.name` missing at issue time, prompt the student for the name to print.
- [ ] **Public verifiable URL.** Route **`/certificado/:publicId`** (`publicId` cuid — **nunca a PK sequencial**; ver `CLAUDE.md` → Database & Migrations) listing the `skillsCovered`, with Open Graph optimized for LinkedIn sharing → each graduate becomes an organic marketing vector and feeds the "emprego em empresa" angle (cert by competencies). **TRAVA:** student opt-in (`isPublic`, default false). The cert always exists; the public route is private/404 unless the student allows it (LGPD). ✅ **O requisito de OG passa a ser CUMPRÍVEL desde Ago 2026** — esta rota é pública e montada no servidor (`CLAUDE.md` → Rendering Boundary); enquanto o site era SPA puro, este checkbox pedia algo que a arquitetura não entregava, porque o crawler do LinkedIn lê HTML cru.
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
