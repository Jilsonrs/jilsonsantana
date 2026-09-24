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
> **🟢 NO AR EM PRODUÇÃO (23/09/2026, `main` = `b38b0f5`) — atrás do portão "Em breve":**
> home pública `/` e `/en` em HTML de servidor, bilíngue, com depoimentos (**4 sorteados por
> visita**) e perguntas frequentes vindos do banco · admin **Site** com 2º nível: **Textos** (uma
> aba por página, texto editável sem deploy), **Depoimentos** e **Perguntas frequentes** · login com
> **limite de tentativas por pessoa** (Better Auth 1.7.5 lendo o IP do `x-real-ip`; provado em
> produção pelo operador em duas redes) · CI verde nos dois jobs (testes e E2E).
> **O público segue vendo a coming-soon** (`COMING_SOON=true`).
>
> **🌍 ESCOLA BILÍNGUE (PT + EN) — decisão do operador em 14/09/2026, PARCIALMENTE construída.** A
> escola nasce em português e inglês, com o inglês ligado no lançamento mesmo sem curso em inglês
> (spec: [`idiomas.md`](idiomas.md); travas: `CLAUDE.md` → *Idiomas*). **Já existe:** a home nos
> dois idiomas, o dicionário tipado em `core/src/i18n/` (inglês escrito e revisado em 22/09), o
> enum `Language` no banco (nasceu com `SiteText`) e depoimentos/FAQ por idioma. **Falta (Bloco I):**
> `Course.language` e `LearningPlan.language`, o filtro por idioma nas leituras de catálogo, e as
> telas React no dicionário. Preço em dólar e **decisão de imposto internacional** na Fase 4.
>
> **Infra de banco (atualizado Set 2026 — MIGRADA DO SUPABASE PARA O NEON) — TRÊS ambientes, um por
> papel, agora com DOIS deles no MESMO projeto:**
> Neon `falling-snow-79489296` (aws-us-east-2, **PG18.6**), branch **`production`**
> (`ep-still-breeze-aebrui0f`) = **produção**, só o Railway · branch **`dev`**
> (`ep-lingering-morning-aehqd81z`) = **dev / a escola**, **nunca apagado** ·
> **`localhost:5432/jilsonsantana_test`** (PostgreSQL 17.11 local) = **teste**, apagado a cada
> execução da suíte. Plano **Free**, US$ 0 — o 2º ambiente virou **branch**, não um 2º projeto, e é
> isso que zerou os US$ 10/mês que o Supabase cobraria.
> ✅ **Migração verificada, não presumida:** 11 tabelas / 19 linhas conferidas uma a uma, diff de
> schema completo (colunas, tipos, defaults, constraints, índices, enums, RLS) idêntico, `last_value`
> das 6 sequences preservado, `migrate deploy` no pre-deploy do Railway = *"No pending migrations"*,
> e **login real em produção gravando sessão no Neon enquanto o Supabase permaneceu inalterado**.
> ✅ **A separação de ambientes se manteve na troca:** `server/.env` → branch `dev`, `server/.env.test`
> → Postgres local (a trava de hostname disparou e confirmou `localhost`). As senhas das contas
> semeadas foram **rotacionadas no branch `dev`**, e provado por sign-in que a credencial de dev é
> **rejeitada em produção**.
> ✅ **Supabase APAGADO pelo operador em Set 2026, na mesma sessão da migração.** Ele foi mantido
> intocado e somente-leitura durante toda a troca, serviu de rollback até a validação fechar, e então
> saiu. **Não há mais rollback para o Supabase** — o caminho de recuperação hoje é o PITR do Neon
> (janela do plano Free, curta) mais o `pg_dump` frio, que é o checkbox de backup da Fase 7 e segue
> **em aberto**. Enquanto ele estiver aberto, a rede de segurança do banco é **só** a janela do Free.
>
> **Cobertura de teste — o que EXISTE hoje (medido em 23/09/2026, não estimado):** cliente **20
> arquivos / 143 testes** (Vitest + RTL) ✅ no CI · servidor **10 arquivos / 70 testes**
> (supertest, Postgres local) ✅ no CI — fumaça, login, leituras públicas, home, texto do site,
> depoimentos/FAQ (acesso 401/403 incluído), i18n e a trava do IP · E2E **1 arquivo / 7 testes** ✅
> **no CI, em job próprio**. As três camadas rodam e podem falhar. *(O E2E ficou vermelho de 23/09
> manhã até a correção do mesmo dia: o Playwright conferia o Vite na raiz, que virou home de
> servidor — hoje confere em `/login`.)*
> Não há teste de servidor
> de **negócio** (a matriz de acesso e os casos de webhook são a Fase 4) e não há suíte nenhuma de
> Bunny ou Stripe, porque esse código não existe. Plano de cobertura: **Fase 3 → Bloco T**.
>
> **⚠️ GATILHO DISPARADO (registrado, não resolvido) — `CLAUDE.md` passou de ~85 KB.** A entrada
> (11c) do próprio changelog escreveu: *"se o arquivo passar de ~85 KB com o critério em vigor, o
> problema é ESCOPO, não redação."* Medido em Ago 2026: **já estava em 91,8 KB antes desta sessão**
> e foi a **101,1 KB** depois (+9,3 KB de convenções de teste/XSS/segurança). **Em 23/09/2026:
> 124,9 KB.** O gatilho não pede
> reescrita — pede **decisão do operador sobre escopo**: quais seções ainda passam no critério de
> entrada (*"um agente prestes a escrever código produziria um diff ERRADO sem esta linha?"*).
> **Não tratar como tarefa de redação**, que é exatamente o erro que o gatilho existe para evitar.
>
> **Rate-limit de login: RESOLVIDO em 23/09** (era o "próximo bloqueio" e o bloqueio do go-live).
>
> **Formatação do Antigravity publicada (23/09):** layout padrão (`PageLayout`) em 13 telas do app
> e do admin, revisado antes do merge (duas frases falsas corrigidas, 4 testes atualizados para os
> textos que o operador aprovou). A tela de Textos passou a se chamar **"Textos do Site"**.
> **Ajustes finos em 24/09:** as seções passaram a ser **empilhadas** (`PageSection`: título em
> cima, conteúdo embaixo, no lugar do painel dividido). **É a base de toda tela nova do app** —
> regra no `CLAUDE.md` → Client, em `design.md` §6 e em `.agents/rules/page_layout.md`.
> **Rodapé do app (24/09, publicado):** toda tela depois do login ganhou rodapé, com os mesmos
> textos editáveis do rodapé da home, e o seletor PT | EN (provisório). Ver Bloco S.
> **Próximo, decidido pelo operador em 24/09: o bloco "app do aluno em inglês", ANTES do C4.** Em 5
> etapas (Bloco I). **Etapas 1, 2 e 3 feitas (24/09, no `dev`):** o seletor do rodapé troca o
> idioma do app e grava na conta; menu, login, início, minha conta e minhas trilhas existem em
> inglês; cursos e trilhas têm idioma (migration aplicada no dev, produção aplica no próximo
> publish) e o campo Idioma está no admin. Falta: catálogo e cursos no idioma do app (4) e revisão
> do inglês (5).
>
> **Próximo passo — decidido pelo operador em 23/09: o C4, em 5 etapas, uma por vez.** A **etapa 1**
> (campo de imagem aceitar `/img/curso.jpg`) tem plano aprovado. Detalhe no bloco C4. Continuam na
> fila, sem ordem: o resto do **Bloco I** (agora menor — ver as decisões de 23/09 no bloco) · **C5**
> (vitrine fora do React — **bloqueado** até o operador definir o conteúdo das telas) · **o corpo
> da Fase 3** (Bunny, HIGH RISK) · os itens de **continuidade do operador** antes do go-live (2FA,
> backup frio).
> **Pendências do operador, abertas:** revisar as 15 perguntas da FAQ (agora no admin) · o conteúdo
> do 2º nível das seções planejadas do menu · confirmar os slugs em inglês · mover `/inicio`,
> `/conta`, `/minhas-trilhas` para `/aluno/*` · cadastrar os 5 cursos da home (C4).

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

The school runs a **rotating catalog capped at 15 courses per language, 2 languages max** *(was
"20" here — stale since `courses.md` Set 2026 (13) lowered it to 15; per-language cap is the
operator's decision of 14/09/2026, see `idiomas.md`)*: a new course enters when another
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
> ~~Language seam: content is modeled so language can become a LAYER later (a course can have content in N languages) — but build PT-only now. Do not build any multi-language content system yet.~~ **Superseded Sep 2026 (operator decision, 14/09):** the school is bilingual from launch, and each course/trilha is created **in one language** (an English course is a separate course, not a language layer on the same one). Built in **Phase 3 → Bloco I** — see `idiomas.md`.
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
- [x] Sem tela "Minhas trilhas" — a leitura já existe (`GET /trilhas/mine`, `GET
      /trilhas/mine/:id`, Bloco 3b), só falta a UI. Sem ela, salvar uma trilha é um beco sem
      saída (o membro não acha de novo). Precisa: `getMyTrilhas()`/`getMyTrilha(id)` em
      `client/src/lib/api.ts`; `client/src/pages/MyTrilhasPage.tsx` (`/minhas-trilhas`, dentro de
      `ProtectedRoute`) + `MyTrilhaDetailPage.tsx` (`/minhas-trilhas/:id`); extrair o accordion
      PlanModule→PlanItem de `TrilhaDetailPage.tsx` pra um componente compartilhado (reusado pela
      trilha curada e pela trilha própria); link "Minhas trilhas" no `Layout.tsx` (qualquer
      logado, não só admin).
      ✅ **Set 2026.** Entregue como especificado. Dois detalhes que o texto acima não previa e
      ficam registrados porque mudam código vizinho: o accordion compartilhado é
      `client/src/components/content/PlanModuleAccordion.tsx` e **ganhou estado VAZIO** (módulo
      cujos itens todos apontam para curso não publicado chega vazio pelo filtro
      `publicadoNaCadeia`); e `TrilhaCard` ganhou um `to?` opcional — a trilha salva não tem slug,
      então o card não conseguia derivar o link e virava `<div>` sem destino.
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

**PENDENTE DO OPERADOR — o que cada seção PLANEJADA vai ter dentro** *(23/09/2026: "coloca como
pendência definir o que vai ter porque não tive tempo de pensar em tudo ainda")*

O rail já mostra ao admin as seções que faltam construir, em cinza. **Mas o segundo nível delas
está quase todo vazio:** das cinco planejadas, só **JilsonAI Admin** tem subitens declarados
(Escalações · Persona · Modelo · Quotas). Por isso "ligar o segundo nível" hoje mostraria quatro
linhas e nada mais — não responde *"o que falta no admin"*, porque o que falta ainda não foi
escrito em lugar nenhum.

- [ ] **Operador define, uma frase por seção:** o que tem dentro de **Alunos**, de **Dados** (o
      painel é uma tela só ou tem partes?), de **Trilhas Admin** e de **Certificados**.
- [ ] Declarar no `client/src/lib/navigation.ts` (é dado, não código — cada seção declara os
      níveis que usa), e só então ligar a exibição do 2º nível para seção planejada.
- **Por que nesta ordem:** declarar primeiro é o que faz a visão "o sistema inteiro de uma olhada"
  existir de verdade. Ligar antes entrega a moldura vazia.

**Backlog de polish (sem dono de bloco ainda — não bloqueia o fechamento da Fase 2, mas precisa
de uma sessão própria antes do launch):**
- [ ] Fotos/imagens reais (thumbnails de curso, qualquer asset de marca) — hoje tudo usa
      placeholder (`BookOpen` icon quando `thumbnailUrl` é nulo).
- [ ] A direção visual completa de `docs/design.md` (paleta off-white `--surface-alt`, fontes
      MuseoModerno (marca)/Outfit/Hanken Grotesk, o hero animado "trilha que se monta sozinha") ainda não foi
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
  - [x] ~~**PASSO 1 — rota temporária `/api/__whoami`**~~ **DISPENSADO pela atualização para a
        1.7.5** (Set 2026). A versão nova **avisa no log**, uma vez, quando não consegue resolver o
        IP: *"Rate limiting could not determine a client IP and is falling back to a single shared
        per-path bucket"*. A presença ou ausência dessa linha nos logs da Railway responde a mesma
        pergunta, **sem rota nova, sem deploy de diagnóstico e sem nada para remover depois**.
  - [x] **PASSO 1 (novo) — o operador procura essa linha nos logs da Railway** ✅ *(23/09: a linha
        APARECEU às 11:41 — balde compartilhado confirmado)* depois do primeiro
        deploy com a 1.7.5, tendo feito ao menos um login. **Aparece** ⇒ a borda anexa ao
        `x-forwarded-for`, o balde está compartilhado, e é preciso `advanced.ipAddress.trustedProxies`
        com as faixas da Railway (ou um header que ela garanta). **Não aparece** ⇒ o IP resolve, e
        só falta apertar `/sign-in/email`.
  - [x] **Diagnóstico feito com rota temporária (23/09), já removida.** `x-real-ip` é sobrescrito
        pela Railway e é o IP real (conferido contra serviço externo); `x-forwarded-for` chega com 2
        elementos; nenhum IP é da Fastly (o alerta antigo do suporte não vale mais). **Correção:**
        `ipAddressHeaders: ["x-real-ip"]`.
  - [x] ~~Três provas com header forjado~~ — **não são mais necessárias para saber se dá para
        forjar**: medido na 1.7.5 que cadeia com mais de um elemento devolve `null`, então o
        atacante não escolhe mais o próprio balde. O que resta descobrir é outra coisa: **quais são
        as faixas de IP dos proxies da Railway**, para preencher `trustedProxies`. Isso se pergunta
        ao suporte deles ou se lê do próprio `x-forwarded-for` de um acesso conhecido.
  - [ ] **Critério de aprovação (depende do deploy):** o aviso do balde compartilhado **some** dos logs, e um login
        continua funcionando. Só então apertar `/sign-in/email` com `customRules` (ex.: 3 em 10 s).
        **Nessa ordem, e a ordem inverteu com a 1.7.5:** apertar antes de o IP resolver transforma o
        limite na própria negação de serviço — três erros de qualquer pessoa trancariam o login de
        todos, inclusive o do único admin.
  - [x] ~~**Remover a rota `/api/__whoami`**~~ — não existe mais rota para remover, porque a
        1.7.5 dispensou a rota. *(A regra que a motivava continua valendo: rota de diagnóstico que
        sobrevive ao diagnóstico é superfície que ninguém revisa depois.)*
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
- [x] Barra lateral (ícone + rótulo, agrupada), substituindo o link provisório do cabeçalho.
      **ESCOPO — a MESMA barra serve os DOIS ambientes** *(operador, Ago 2026)*: área do aluno **e**
      área administrativa inteira. Não são dois componentes; é um, com itens diferentes por papel —
      dois componentes divergem em espaçamento, comportamento e estados de foco, e a divergência
      aparece como "o admin parece outro site".
      ✅ **Set 2026.** `AppSidebar.tsx`, um componente, itens por papel. O `Layout` escolhe pela
      sessão: sem sessão o cabeçalho público de hoje, com sessão a barra — **o cromo segue a
      pessoa, não a rota**, então o aluno logado mantém a barra no catálogo, que é rota pública.
- [x] **Retraída ↔ expandida, como na Udemy** — recolhida mostra só ícone, expande ao passar o
      mouse; e o estado escolhido **persiste** (quem recolheu não quer recolher de novo a cada
      visita). **Trava de acessibilidade:** expandir só por mouse exclui quem navega por teclado —
      o rótulo tem que estar sempre disponível para leitor de tela (via `aria-label` ou texto
      visualmente oculto), mesmo com a barra recolhida. Mesma regra do destaque de erro do login:
      **a informação nunca pode existir só no visual.**
      ✅ **Set 2026, com DOIS achados que o texto acima não previa:**
      **(a) A persistência NÃO vinha de graça** — a peça do shadcn *escreve* o cookie e nunca o
      lê; quem lê, no desenho dela, é um servidor que renderiza a página, e num app Vite ele não
      existe. A barra voltaria aberta **sempre**, sem erro e sem log. O `Layout` passou a ler o
      cookie (`barraComecaAberta()`), e o `SIDEBAR_COOKIE_NAME` virou export para não haver um
      literal repetido que divergisse em silêncio. Tem teste nos três casos.
      **(b) A trava de acessibilidade já estava satisfeita — mas por acidente, e agora tem
      guarda.** O shadcn recorta o rótulo com `overflow`, não com `display:none`, então ele
      permanece na árvore de acessibilidade. Isso é fácil de "otimizar" para `display:none` sem
      ninguém notar, porque a tela fica idêntica; o teste da barra recolhida existe para reprovar
      quem tentar.
- [ ] **Painel do aluno** como destino pós-login: progresso, próxima aula, trilhas em andamento.
      **Depende da Fase 5** (captura de progresso) — sem `LessonProgress` não há o que mostrar, e
      construir a casca antes deixa uma tela vazia que ninguém sabe se está quebrada.
      **NOTA (Set 2026): a dependência encolheu.** "Trilhas em andamento" já tem dado real desde
      `GET /api/trilhas/mine` (Bloco 5) — só as barras de **progresso** ainda dependem da Fase 5.
      A home pode ganhar a seção de trilhas antes, e isso é fatia própria, não este bloco.
- [x] Navegação mobile — o menu lateral obriga a decidir isto, que o cabeçalho atual adiava.
      ✅ **Set 2026:** gaveta (`Sheet`) abaixo de 768px, aberta pelo mesmo botão do cabeçalho.
      **A gaveta e a barra desktop NUNCA renderizam juntas** (o componente ramifica em
      `useIsMobile`) — verificado porque o risco previsto era nome duplicado no DOM, e ele não se
      materializou por aqui. Materializou-se **em outro lugar**: ver o achado do E2E abaixo.
- **Done when:** o aluno entra e vê para onde ir sem digitar URL; a conta é alcançável em 1 clique
  de qualquer tela. ✅ **CUMPRIDO (Set 2026)** para a navegação; o painel de progresso segue aberto
  acima, e é fatia da Fase 5.

#### Bloco S2 — NAVEGAÇÃO EM TRÊS NÍVEIS  *(direção do operador, Set 2026 — SUCEDE o Bloco S)*

> **O Bloco S entregou uma barra; este entrega um SISTEMA.** Registrado como bloco novo, e não
> como correção do anterior, porque o anterior **não estava errado** — o escopo é que mudou, e
> apagar aquele histórico esconderia que a barra simples existiu e funcionou.

**O que muda em relação ao que foi entregue** (referência: painel de instrutor da Udemy, capturas
do operador; especificação visual em `design.md` §13, que foi reescrito na mesma sessão):
- Rail **escuro** e **recolhido por padrão** — hoje é claro e nasce aberto.
- Expande **ao passar o mouse**, **sobrepondo** o conteúdo — hoje é botão de clique, e empurra.
- **Nível 2** (coluna secundária, com grupos retráteis) e **nível 3** (abas no topo) passam a
  existir, ligados por tela.
- Mobile vira **gaveta com navegação em profundidade** (`Comunicação ›` … `‹ Menu`) — hoje é
  gaveta de um nível só.

**O QUE DÁ VALOR AO BLOCO, e por que não é over-engineering:** a navegação inteira vira **dado**,
num mapa único; cada tela **declara** seus níveis e o cromo se monta sozinho. Passa no critério de
decisão de stack porque o dia ruim é nomeável: *"a cada tela nova eu reinvento a navegação"* — e o
sistema administrativo inteiro ainda está por construir (Bloco 6b, Fase 4, Fase 5, Fase 6).

- [ ] **Mapa de navegação** (`client/src/lib/navigation.ts`): níveis, subníveis, abas, visibilidade
      por papel. **Nasce como RASCUNHO do sistema inteiro** — decisão do operador: *"cada página
      será única, mas o sistema de navegação é para todo o sistema"* — e é editado conforme as
      telas nascem, sem tocar nos componentes.
- [ ] **Nível 1** — rail escuro, recolhido, hover expande sobrepondo. **Foco de teclado expande
      também** (`design.md` §6 — norma de acessibilidade, WCAG 2.1.1).
- [ ] **Nível 2** — coluna secundária, grupos retráteis, só quando a seção tem subitens.
- [ ] **Nível 3** — abas horizontais, só quando a tela tem abas.
- [ ] **Mobile** — gaveta com navegação em profundidade (ida e volta entre níveis).
- [x] **Rodapé do app** *(decisão do operador, 24/09/2026 — comparou com o LinkedIn Learning)*:
      em **toda tela depois do login, do aluno e do admin**; o visitante sem login não o vê.
      Itens: marca + © · FAQ · Quem somos · Contato · YouTube · Termos · Privacidade (os mesmos da
      home, menos Cursos/Trilhas/Assine, que o menu lateral já cobre). **Os textos são os MESMOS do
      rodapé da home** (`common.footer`), lidos por `GET /api/site-text/common/:lang` com as
      edições do operador: editou em *Admin → Textos*, muda nos dois. Salvar em Textos atualiza o
      rodapé na hora. **Links sem página entram assim mesmo** (Quem somos, Contato, Termos,
      Privacidade dão tela vazia até existirem) — decisão dele. Estrutura em
      `components/layout/AppFooter.tsx` + `lib/footer.ts` (dado); acabamento com o Antigravity.
      **Acabamento do Antigravity (24/09), aprovado pelo operador:** barra no tom do menu da home
      (token `--surface-vitrine`), a frase `common.footer.tagline` e o **seletor PT | EN** —
      provisório, leva à home pública até o bloco "app do aluno em inglês" (ver Bloco I).
      Testes: 5 de servidor, 7 do rodapé, 3 no shell, 1 na tela de Textos. **Mutação:** rota
      ignorando as edições, rodapé ignorando o servidor, rodapé fora do shell e salvar sem avisar o
      rodapé → reprovam. Revertido.
- **Done when:** uma tela nova entra no sistema **declarando** seus níveis no mapa, sem escrever
  componente de navegação nenhum — e os três níveis somem sozinhos onde não há dado.

**ACHADO DO E2E — duplicidade de nome, e por que o conserto NÃO foi `.first()`** *(Set 2026)*.
`admin reaches /admin` quebrou: a barra ganhou um item "Cursos" e a página `/admin` já tinha um
link "Cursos", então o seletor por nome achou dois. **Não é ambiguidade para o aluno** — os dois
levam ao mesmo lugar — só para o seletor. O conserto foi **escopar ao `main`**, o que devolve a
intenção original daquela linha (provar que a PÁGINA tem o link, não que a navegação tem);
`.first()` faria passar escondendo qual dos dois foi encontrado, que é a família de gate-que-mente
já nomeada em *Test quality*. **Segundo achado na mesma investigação:** `SidebarInset` já É um
`<main>`, e o `Layout` estava aninhando outro dentro — HTML inválido e landmark dentro de
landmark. Corrigido junto.

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

### Bloco I — Escola bilíngue: idioma no conteúdo + dicionário de textos  *(Set 2026 · decisão do operador · spec em `idiomas.md`)*

> **ESTADO EM 23/09/2026 — parte adiantada por outros blocos, checkboxes abaixo seguem valendo:**
> o enum `Language` **já existe** no banco (nasceu com `SiteText`, C2), e o dicionário **já serve os
> templates do servidor** (`core/src/i18n/`, tipado, com o teste de chave vazia/idêntica). **Ainda
> falta tudo o que é deste bloco de fato:** `Course.language` e `LearningPlan.language`, o filtro por
> idioma nas leituras de catálogo/busca/trilha, a recusa de item de outro idioma, as telas React no
> dicionário e o seletor para quem está logado. O seletor PT | EN da vitrine **já existe** (dois
> links, um por endereço) — o "Passo 0" abaixo passa a ser só o do app logado.

> **DECISÕES DO OPERADOR EM 23/09/2026 (mudam o tamanho deste bloco):**
> - O **admin fica em português** — não ganha versão em inglês.
> - Os textos do app do aluno **não** entram em *Admin → Site → Textos*: lá ficam só as páginas
>   públicas. (Quando o React usar o dicionário, a tela de Textos filtra — ver C2, Passo 0.)
>   **Exceção, 24/09:** o rodapé do app usa os textos do rodapé da home (`common.footer`), então
>   ele se edita em Textos junto com a home — ver Bloco S → *Rodapé do app*.
> - **O seletor PT | EN da home basta por agora.** Traduzir o app do aluno (dicionário no React,
>   seletor dentro do app, `User.preferredLanguage`) vira **bloco próprio, depois** — os itens
>   *Dicionário*, *Migrar os textos* e *Seletor* abaixo, e os itens 3 e 4 do *Done when*, esperam
>   esse bloco. O Passo 0 (posição do seletor) fica resolvido por isso.
>   **ATUALIZADO em 24/09 (operador):** *"toda [tela] depois do login vai precisar ficar em inglês
>   também, por causa dos alunos internacionais"* — o seletor vai trocar o sistema todo, catálogo
>   incluído. O bloco **"app do aluno em inglês" vem ANTES do C4**. O seletor já existe, no
>   **rodapé do app** (desenho do Antigravity), hoje provisório: leva à home pública PT/EN até o
>   bloco fazê-lo trocar o idioma do próprio app. **O Admin continua em português** (os alunos
>   internacionais não o usam).
> - As páginas provisórias (`/cursos`, `/trilhas`, `/curso/…`, `/trilha/…`): **não mexer** — ele
>   ainda vai pensar nelas; foco na home.
> - `Course.language` entra pela **etapa 2 do C4**, que precisa dele. O resto da parte de dados
>   (`LearningPlan.language`, filtro nas listas e na busca, recusa de item de outro idioma na
>   trilha, clone herdando) continua neste bloco. O campo Idioma no formulário de **trilha** espera
>   o Bloco 6b, porque esse formulário ainda não existe.

> **APP DO ALUNO EM INGLÊS — 5 ETAPAS, uma por vez** *(plano aprovado pelo operador em 24/09/2026;
> vem ANTES do C4)*. Cada etapa é discutida, aprovada e vira um commit. Decisões dele que o bloco
> segue: Admin em português · o estrangeiro escolhe o idioma na home e **entra já em inglês** ·
> **um canal do YouTube por idioma** (`@jilsonen` para o inglês) · catálogo e páginas de curso e
> trilha entram, mesmo provisórias · textos do app fora de *Admin → Textos* (o rodapé é a exceção).
>
> - [x] **Etapa 1 — o seletor funciona** *(24/09)*. `PATCH /api/me/language` grava
>       `User.preferredLanguage` na conta **da sessão** (só `pt`/`en`); o React lê o idioma da
>       sessão (`client/src/lib/language.ts`, `useAppLanguage`) e, ao trocar, espera o `refetch()`
>       da sessão — tudo muda junto, sem recarregar. O seletor do rodapé virou **botão**
>       (`aria-pressed`), e o rodapé segue o idioma: textos, destinos em inglês e canal do YouTube.
>       Os endereços públicos e os dois canais moram em `core/src/constants/site.ts`
>       (`ROTAS_PUBLICAS`), usados pela home e pelo rodapé — a home `/en` passou a levar ao canal
>       em inglês. Testes: 5 de servidor + 1 na home; 9 no rodapé. **Mutação:** rota sem gravar,
>       home com o canal fixo, idioma fixo em PT e troca sem atualizar a sessão → 6 reprovaram.
>       *Pendente para a etapa 2:* aviso na tela se a troca falhar (é texto novo, entra com o
>       dicionário do app); hoje o idioma simplesmente não muda.
> - [x] **Etapa 2 — telas do aluno em inglês:** parte `app` no dicionário (fora de Textos), menu,
>       início, conta, minhas trilhas e login (quem vem de `/en` vê o login em inglês e a conta
>       passa a ser inglês). Em dois commits:
>   - [x] **2a — a base, o menu e o login** *(24/09)*. Parte `app` em `core/src/i18n/` (tipada:
>         frase faltando no inglês quebra a compilação); `ehTextoEditavel()` tira `app.*` da tela
>         de Textos **e** da gravação (`DICT_KEYS`). O idioma é decidido UMA vez, no shell
>         (`useIdiomaDoShell`: logado → conta; sem login → `?lang=`), e desce por contexto
>         (`useIdioma`, `useT` em `client/src/lib/language.tsx`). Menu: `navegacao(t)` — rótulo do
>         aluno do dicionário, de admin escrito em português. Login em inglês; o "Entrar" de `/en`
>         leva a `/login?lang=en`, e entrar por ali grava o idioma na conta **antes** de abrir o
>         app (falhar não barra o login). Aviso no rodapé se a troca falhar. Testes: 3 de
>         servidor novos/ajustados, 7 no login, 3 no shell, 1 no mapa, 1 no rodapé. **Mutação:**
>         trava de `app.*` aberta, idioma fixo em PT e login sem gravar → 7 reprovaram. Revertido.
>   - [x] **2b — início, minha conta e minhas trilhas** *(24/09)*, e a regra no `CLAUDE.md` →
>         Client (*texto de tela do aluno sai de `useT()`*). Início, Minha conta, Minhas trilhas
>         (lista e detalhe) e o vazio da árvore de trilha nos dois idiomas; o português ficou
>         idêntico (os testes antigos passaram sem mexer). Minha conta ganhou o primeiro arquivo
>         de teste dela. **Mutação:** textos fixos em português → 11 reprovaram; um rótulo escrito
>         à mão → 1 reprovou. Revertido.
> - [x] **Etapa 3 — cursos e trilhas ganham idioma:** a antiga etapa 2 do C4 + a parte de dados
>       deste bloco (migration, campo Idioma e etiqueta "EN" no admin, filtro nas listas, recusa
>       de item de outro idioma na trilha). Antes: dividir o formulário de curso.
>       **Decisões do operador (24/09, ao aprovar):** idioma trocável **enquanto rascunho**, trava
>       depois de publicado · **idioma é filtro, não portão** — só as listas de descoberta filtram;
>       o que é do aluno (trilhas salvas, cursos iniciados) aparece nos dois idiomas.
>   - [x] **3a — formulário de curso dividido** *(24/09)*: 375 → 129 linhas. Lógica em
>         `client/src/lib/course-form.ts`; seções em `client/src/components/admin/course-form/`.
>         Mesmas classes, mesma tela: os testes passaram sem mexer.
>   - [x] **3b — banco e servidor** *(24/09)*. Migration `20260924150000_course_and_plan_language`
>         (as linhas existentes viram PT e o DEFAULT sai: o banco recusa curso ou trilha sem
>         idioma). Passo 0 no dev antes/depois: 2 cursos, 1 trilha, 2 módulos, 3 aulas, 2 usuários,
>         logins de admin e membro OK nas duas vezes; `migrate diff` *No difference*; zero tabela
>         sem RLS. **Aplicada no dev; em produção roda no pre-deploy do próximo publish.**
>         `?lang=pt|en` em catálogo, trilhas e busca (`idiomaDaLista`); link direto e "minhas
>         trilhas" não filtram; `LanguageMismatch` na trilha; `LanguageLocked`/`LanguageInUse` na
>         troca; a cópia herda o idioma da trilha. A API fala `pt`/`en` (`comIdioma`). 14 testes
>         novos (`content-language.test.ts`). **Mutação:** sem filtro, sem trava, sem recusa e
>         "minhas trilhas" filtrando → 4 reprovaram. Revertido.
>   - [x] **3c — campo Idioma e etiqueta "EN" no admin** *(24/09)*. Campo **Idioma** (Português /
>         English) na seção Organização; curso novo nasce Português. Curso GRAVADO fora de rascunho
>         mostra o idioma como texto, com "O idioma trava depois que o curso é publicado." (texto
>         aprovado pelo operador no plano) — texto e não campo desabilitado, porque campo
>         desabilitado sai do envio do formulário. Etiqueta "EN" na lista. **Mutação:** trava
>         desligada, idioma fixo no envio e etiqueta removida → 4 reprovaram. Revertido.
> - [ ] **Etapa 4 — catálogo e cursos no idioma escolhido:** catálogo, busca, páginas de curso e
>       trilha; nível e textos das 3 camadas nos dois idiomas; catálogo EN vazio; curso com 0 aulas.
>       **Decisões do operador (24/09):** o nível aparece pelo NOME ("Intermediário" /
>       "Intermediate"), não pelo valor cru — o Admin segue com o cru · os textos das 3 camadas
>       ficam **editáveis em Textos** · junto, o conserto do achado da 3c (formulário de curso sem
>       aviso quando o salvamento falha).
>   - [x] **4a — catálogo e busca** *(24/09)*. `/cursos`, `/trilhas` e a busca pedem a lista no
>         idioma do app (`?lang=`); o idioma está na chave da consulta, então trocar no rodapé refaz
>         a lista. Textos da tela, da busca e do cartão (contagem e nível) no dicionário. Vazio em
>         inglês próprio; curso com 0 aulas mostra "0 aulas". **Mutação:** lista ignorando o idioma
>         e nível cru → 4 reprovaram. Revertido.
>         *Para a revisão do inglês (etapa 5):* a contagem não tem singular — "1 módulos" em PT
>         (já era assim) e "1 modules" em EN.
>   - [x] **4b — páginas de curso e trilha** *(24/09)*, com as 3 camadas editáveis em Textos. Texto da
>         tela no idioma do app; o conteúdo do curso (título, aulas, FAQ) fica como foi escrito.
>         Nome e frase das camadas saíram de `LAYER_CONFIG` (que ficou só com ícone e cor) para
>         `common.camadas`, lidos já com as edições por `useTextosComuns()` — o mesmo hook do rodapé.
>         Em Textos: aba "Toda página", seção "3 camadas". "Entrar para salvar" leva ao login no
>         idioma da tela. `CLAUDE.md`, `courses.md` e `idiomas.md` reconciliados. **Mutação:** selo
>         ignorando as edições e título escrito à mão → 2 reprovaram. Revertido.
>   - [ ] **4c — aviso de erro ao salvar o curso** no admin.
> - [ ] **Etapa 5 — revisão do inglês** pelo operador com o Antigravity, e publicação.

> **SEQUENCIAMENTO:** fecha **antes** do bloco *Superfície pública indexável*. Se as páginas
> públicas forem montadas antes, nascem só em português e são refeitas. Não depende do Bunny;
> **a posição exata dentro da Fase 3 é decisão do operador.** Risco baixo–médio (uma migration +
> os textos de todas as telas), **não** é HIGH RISK.
> **FORA deste bloco, de propósito:** os endereços `/en`, o redirecionamento pelo navegador e o
> `hreflang` (nascem com as páginas públicas no servidor, no bloco seguinte, para não serem
> construídos no React e jogados fora); curso em inglês (é produção de conteúdo, não build); preço
> em dólar (Fase 4); e-mail e páginas legais em inglês (Fase 7); ligação entre a versão PT e a EN
> do mesmo curso (entra quando existir o primeiro par).

- [ ] **Passo 0 — a pendência de produto que muda o diff** (operador): **a posição do seletor
      PT | EN** na tela, com o parceiro de design (`design-lab/GEMINI.md`). Sem ela, o bloco não
      começa.
- [ ] **Migration:** enum `Language` + `Course.language` + `LearningPlan.language`, **obrigatórios**;
      linhas existentes = português. `Module` e `Lesson` **herdam** do curso, sem coluna. Sem tabela
      nova ⇒ sem RLS nova, mas a **consulta de RLS roda mesmo assim** (`CLAUDE.md` → Database &
      Migrations). **Passo 0 da migration:** contar cursos/trilhas e provar login de admin e membro
      antes; conferir o mesmo depois.
- [ ] **`core/`:** constante `Language` + schemas Zod exigindo `language` na criação de curso e trilha.
- [ ] **Admin: campo "Idioma" no formulário de curso e de trilha** *(operador, 14/09 — como o da
      Udemy)*. Na trilha, a busca de itens só oferece conteúdo do idioma dela — **e o servidor recusa
      mesmo assim** (próximo item).
- [ ] **Servidor — idioma nas leituras e na escrita.** Leitura pública (catálogo, busca, lista e
      detalhe de trilha) **filtra por idioma do mesmo jeito que filtra por status**; escrita de trilha
      **recusa item de outro idioma**; clonar trilha **herda** o idioma. **Testes de servidor**
      (supertest): curso EN fora da listagem PT e vice-versa · busca respeita idioma · curso EN numa
      trilha PT → 4xx · clone herda. *Não é rota de acesso nem de dinheiro, mas é escrita que confere
      o registro que referencia — mesma família do "oráculo de enumeração"; por isso entra teste.*
- [ ] **Dicionário de textos — UM para servidor e React**, com a garantia de que **chave faltando no
      inglês quebra o typecheck**. **Biblioteca de i18n, se houver, é dependência nova:** entra no
      plano do bloco com o problema que resolve e o OK do operador. `react-i18next` sozinho não serve
      (não cobre os templates do servidor).
- [ ] **Migrar os textos das telas existentes** (24 arquivos com texto em português hoje, medido em
      14/09) para o dicionário, incluindo os rótulos de enum (`Level`, `Layer`) e os textos globais
      das 3 camadas. **O agente traduz para o inglês; o operador revisa antes de publicar** (texto de
      interface é dele — *DE QUEM É A DECISÃO*).
- [ ] **Seletor PT | EN** grava a escolha (cookie para visitante; `User.preferredLanguage` para quem
      está logado), e a interface lê dali até o bloco seguinte trocar o visitante para o endereço.
      Estados de loading/erro + **teste de componente**.
- [ ] **Curso publicado com ZERO aulas** *(operador, 14/09: os primeiros cursos em inglês nascem
      cadastrados e sem aulas, sem mock)*. **A página mostra "0 aulas" normalmente**, sem estado
      especial (decisão do operador). O que o bloco garante: catálogo e página de curso renderizam com
      a lista de aulas vazia **sem quebrar**. Catálogo em inglês vazio tem estado próprio (Definição de
      pronto). **Teste de componente:** curso com zero módulos renderiza e mostra "0 aulas"; catálogo
      vazio mostra o estado vazio.
- [ ] **Passo 8 — mutação:** remover o filtro de idioma da leitura pública e remover a recusa de item
      de outro idioma na trilha → a suíte de servidor **tem que reprovar** nos dois casos; reverter.
- **Done when:**
  1. Curso criado no admin com Idioma = English aparece **só** na listagem em inglês; a listagem em
     português não muda.
  2. Trilha em português **recusa** um curso em inglês **pela API**, não só pela tela.
  3. Toda tela existente renderiza nos dois idiomas, e apagar uma chave do inglês **quebra o
     typecheck**.
  4. A escolha feita no seletor sobrevive a reload, logado e deslogado.

### Bloco — Superfície pública indexável  *(Ago 2026 · política em `CLAUDE.md` → Rendering Boundary)*

> **PARCIALMENTE CONSTRUÍDO FORA DE ORDEM (set/2026, decisão do operador).** A **home** (`/` e
> `/en`) já está no ar em HTML montado no servidor, junto com `escapeHtml`/`jsonLd` e o dicionário
> bilíngue do `core`. Foi feita antes do Bunny porque a home não usa `introVideoId` — a
> dependência que justificava a ordem é da **página de curso**, que continua depois do Bunny.
> **O que ficou pendente dentro deste bloco:** os 5 cursos da home vêm de uma constante em
> `server/src/routes/home.ts` (falta a migration de `language` e o cadastro) e
> `robots.txt`/`sitemap.xml`/`noindex` continuam por fazer. *(O `en.ts` foi escrito e revisado em
> 22/09; depoimentos e FAQ saíram do dicionário para o banco no C3.)*
> **Desdobrado em 22/09/2026** nos quatro blocos de conteúdo logo abaixo (fiação → admin de texto
> → depoimentos e FAQ → cursos do banco), na ordem decidida pelo operador.

#### Bloco C1 — Fiação: nenhum texto visível literal no template ✅ DONE *(22/09/2026)*

> **Por que este bloco vem ANTES do admin de texto, e não depois:** com texto cravado no HTML, o
> operador abriria a tela, editaria um campo, salvaria — e o site não mudaria. Falha silenciosa.
> Fiando primeiro, no dia em que a tela existe **todo campo dela funciona**.

- [x] **Medir antes de mexer** — script que achata o dicionário e confere chave a chave contra o
      template. Resultado: **55 de 145 chaves não eram usadas** (texto literal no HTML) e o `/en`
      era uma mistura de campo vazio com português.
- [x] Fiar as 12 seções da home. Listas (`ai.features`, `testimonials.list`, `faq.list`) passam a
      renderizar por `.map()` — acrescentar item vira mudança de dado, não de marcação.
- [x] **`aria-label`, `alt` e `title` também** — seção `a11y` nova no dicionário. Eram português
      puro no `/en`, e leitor de tela lê.
- [x] **Negrito vira dois campos** (`ai.features[i].label` + `.text`): o `<strong>` sai da string
      para o operador nunca digitar HTML no admin.
- [x] **Defeito corrigido junto** (mesma família, mesmo arquivo): `src="/img/${dict...title}.png"`
      usava texto de dicionário como caminho de arquivo — a imagem sumiria na primeira edição.
- [x] **Teste:** um trecho em português por seção tem que aparecer em `/` e **não** em `/en`.
- [x] **Passo 8 — mutação:** literal cravado de volta → a suíte **reprovou** (`vazou em /en`).
      Revertido.
- **Done when:** medição acusa **0** chaves não usadas. *Restaram 3 de propósito — `pricePtAnnual`,
  `priceEn`, `priceEnAnnual` não têm elemento na página; é a questão preço mostrado × cobrado, que
  é decisão da Fase 4.* Os rótulos das 3 camadas continuam literais e entram com o selo.

#### Bloco C2 — Texto de página editável no admin  *(decisão do operador, 22/09/2026)*

> **O desenho:** `texto exibido = sobrescrita do banco ?? valor de fábrica do dicionário`.
> Racional, alternativas pesadas e gatilho de reabertura em [`content.md`](content.md) § 16.
> **O mecanismo não conhece a home** — ele conhece chaves. Página nova nasce com chaves no
> dicionário e **já aparece no admin**, sem tabela nem tela nova. É isso que faz a coisa crescer
> sem refazer.

- [x] **Passo 0 — resolvido sem pergunta:** o dicionário hoje contém **só** copy de página pública
      (`common.*` + `home.*`), então tudo nele é editável e nada de rótulo do app logado entrou.
      Quando o React passar a usar o dicionário, a tela precisa filtrar — fica anotado aqui.
      **Pré-flight feito:** banco `dev` (`ep-lingering-morning`), 2 usuários, login de admin e de
      membro OK antes E depois da migration; contagens idênticas; zero drift.
- [x] **Migration** `20260922235628_site_text_and_language_enum`: enum `Language { PT EN }` + tabela
      `site_text` (único por chave+idioma) + **RLS na mesma migration**. Consulta de verificação
      rodada: **zero tabelas em `public` sem RLS**.
      **ESCRITA À MÃO porque o `prisma migrate dev` estava quebrado** (P1014: valida o histórico
      num shadow database onde `_prisma_migrations` não existe, e a migration de RLS de Ago 2026
      fazia `ALTER TABLE` nela). **CONSERTADO na mesma sessão, a pedido do operador:** aquela
      migration virou condicional (`IF EXISTS` num bloco `DO $$`). Provas: A/B no mesmo shell
      (incondicional → P1014, condicional → passa) · banco limpo pelo `migrate reset` continua com
      RLS em `_prisma_migrations` e **zero** tabelas sem RLS · `migrate status`, `migrate deploy` e
      o diff de drift passam nos dois bancos **sem** `migrate resolve`, porque o Prisma 5.22 não
      reprova checksum de migration já aplicada (medido). Regra nova no `CLAUDE.md` → Commands.
- [x] **Servidor:** `server/src/lib/dict.ts` é a **única porta** para o texto — template nenhum
      importa `pt`/`en` direto, senão a edição do operador não aparece naquela tela. Cache em
      memória limpo ao salvar. *(Limite registrado no próprio arquivo: o cache é por instância.)*
      A lista branca de chaves (`DICT_KEYS`) vive no `core` e é usada pelo schema Zod.
- [x] **Rotas** `GET /api/admin/site-text` e `PUT /api/admin/site-text`, atrás de `requireAdmin`.
      A lista sai do **dicionário**, não do banco: campo nunca editado também aparece, senão a tela
      só mostraria o que já foi mexido. **Valor vazio APAGA a sobrescrita** e volta ao valor de
      fábrica — sem isso, desfazer exigiria o operador redigitar o texto original.
- [x] **Tela** (`/admin/site`, item de menu **"Site"** — nome decidido pelo operador; posicionado
      depois de Cursos e Trilhas para manter as seções de conteúdo juntas): lista agrupada por
      seção com busca **por texto ou por chave** (com 155 campos, rolar não é navegação), PT e EN
      lado a lado, valor de fábrica visível **só quando há sobrescrita** — é quando a diferença
      importa, porque é o que volta se o campo for limpo. **Cada campo salva sozinho.**
      Loading / erro / vazio + **12 testes de componente**.
      **Dependência nova NÃO adicionada:** `@testing-library/jest-dom` não existe no repo, e isso é
      decisão de plano — as asserções seguem o estilo dos testes atuais (`toBeTruthy`, `toBeNull`,
      `textContent`).
- [x] **Testes de servidor (10):** os seis previstos + idioma inválido recusado + a lista de admin
      trazendo fábrica e sobrescrita separadas. **Quase todos terminam lendo a HOME de verdade** —
      gravar a linha não prova nada se ela não chegar na página.
- [x] **Passo 8 — mutação, nos dois lados.** Servidor: ignorar a sobrescrita no `getDict` **e**
      remover a lista branca de chaves → **3 testes reprovaram**. Tela: apagar o aviso de falha ao
      salvar e fazer "Voltar ao padrão" mandar o valor de fábrica em vez de vazio → **2 testes
      reprovaram**. Revertido nos dois.
- **Done when:** ✅ o operador troca um texto no admin e ele muda no ar, nos dois idiomas, sem
  deploy. *Provado pelos testes de servidor (que terminam lendo a home de verdade) **e pelo
  operador na tela**, em 23/09: ele editou `home.hero.featuredBadge` pelo `/admin/site` e a linha
  está no banco de desenvolvimento. Caminho inteiro exercitado com banco real.*

#### Bloco C5 — A vitrine sai do React  *(decisão do operador, set/2026)*

> **Por que existe:** `/cursos` e `/trilhas` são hoje páginas React que fazem dois papéis mal — o
> visitante vê cromo de app, o aluno não vê progresso. O operador separou as duas superfícies
> (`CLAUDE.md` → *DUAS SUPERFÍCIES*) e pediu que o que for construído agora **seja a versão
> final**: *"eu quero que seja a versão final que vamos utilizar"*. Sem construir duas vezes.
>
> **BLOQUEADO — e o bloqueio é do operador, não técnico.** O passo 1 do fluxo com o parceiro de
> design é *"o operador e o Claude definem o que vai ter na tela"*, e ele adiou: *"depois
> analisamos minuciosamente o que vai ter em cada página"*. Sem isso não há mock, e sem mock não há
> transposição.

- [ ] **Passo 0 (operador):** o que a vitrine mostra, e o que a tela do aluno mostra **a mais**.
      Direção já dada por ele, a detalhar: progresso por curso · "continue de onde parou" no topo ·
      o botão sendo **Continuar** em vez de **Assinar**.
- [ ] **Mock na `design-lab/`** (parceiro de design) → **transposição** para template de servidor
      (mesma marcação, mesmas classes) → **formatação** pelo parceiro. É o caminho que a home já
      percorreu inteiro.
- [ ] `/cursos` e `/trilhas` viram template de servidor, com o payload de indexação que a home já
      tem (title, description, canonical, OG, `hreflang`, JSON-LD) e **os dois idiomas**.
- [ ] Catálogo do aluno nasce em **`/aluno/cursos`** e **`/aluno/trilhas`** (React, dentro do
      shell). `CatalogPage.tsx` é a base — o que muda é o que ele mostra a mais.
- [ ] O rail do aluno passa a apontar para `/aluno/*`; a vitrine fica com o endereço curto.
- [ ] Testes: servidor para a vitrine (responde, indexa, filtra por idioma e status) + componente
      para a do aluno (os estados + o que ela tem a mais).
- [ ] **Passo 8 — mutação:** remover o filtro de status da vitrine → a suíte de servidor reprova.
- **Done when:** o visitante e o Google veem a mesma vitrine, sem barra; o aluno logado tem a
  dele, com barra e progresso.
- **DEPOIS deste bloco:** `/curso/:slug` e `/trilha/:slug` seguem o mesmo caminho. A página de
  curso espera o **Bunny** (o `introVideoId` toca para não-membro nela) — é a dependência que já
  justificava a ordem original.

#### Bloco C3 — Depoimentos e FAQ viram tabela ✅ DONE *(23/09/2026, no ar em produção)*

> São as duas únicas listas da home que **crescem**. O resto tem tamanho fixo preso ao layout.
> Depoimento tem obrigação própria já escrita (`content.md`: *sai na hora se a pessoa pedir*) —
> isso não pode depender de deploy.

> **Decisões do operador (23/09, ao aprovar):** telas **dentro de "Site"** (2º nível: Textos ·
> Depoimentos · Perguntas frequentes) · **lista vazia esconde a seção inteira** · **status para
> esconder + Excluir que apaga de vez** (LGPD) · **conteúdo atual migra sozinho** na publicação.
> Registradas em `content.md` § 16.

- [x] Models `Testimonial` e `FaqItem` (`language`, `displayOrder`, `status`) + RLS, migration
      única `20260923153515_testimonials_and_faq`. **As iniciais não são coluna** — saem do nome
      na hora de desenhar. **A migration também semeia o que estava no ar** (4 depoimentos + 15
      perguntas, PT e EN, publicados), com os INSERTs **gerados do dicionário** para o texto ficar
      idêntico. Aplicada no dev: Passo 0 antes/depois (mesmos 2 usuários entrando, mesmo texto
      editado, 2 cursos), zero tabela sem RLS, diff de drift *No difference detected*.
- [x] Leitura pública (a própria rota da home, que é SSR — nenhuma API pública nova) filtra
      `PUBLISHED` + idioma e ordena por `displayOrder`. As listas **saíram do dicionário**; ficam só
      título e etiqueta das seções. `renderHome` passou a receber **um objeto** (seriam 9
      parâmetros posicionais).
- [x] **FAQ ganha JSON-LD `FAQPage`**, só quando há pergunta publicada.
- [x] **Testes de servidor (8)** em `server/src/test/home-lists.test.ts`: status e idioma (nas duas
      listas), ordem, iniciais, seção some inteira quando vazia, `FAQPage` com exatamente as
      perguntas da página, e o que vem do banco nunca vira HTML (`<img onerror>` escapado,
      `</script>` não fecha o JSON-LD). **Mutação:** sem o filtro de publicado → 3 reprovam; seção
      sempre desenhada → 1 reprova. Revertido.
- [x] **CRUD no admin** — `GET/POST /api/admin/testimonials`, `PATCH/DELETE …/:id` (idem
      `/api/admin/faq`), todas atrás de `requireAdmin`. A API fala `pt`/`en` como o resto; o banco,
      `PT`/`EN` (conversão única em `server/src/lib/language.ts`). Schemas compartilhados em
      `core/src/schemas/home-lists.ts` (`homeFaq*`, porque `faqItemSchema` já é a FAQ de cada
      curso). **DELETE apaga a linha**; esconder é o `status`.
      **Testes de servidor (12)** em `admin-home-lists.test.ts`: 401/403 nos quatro métodos das
      duas rotas (e nada gravado pelo aluno), publicar aparece na home do idioma certo, rascunho só
      no admin, arquivar tira da home sem apagar, **Excluir some com o nome do banco**, corpo
      inválido = 400 (inclusive nome só de espaços e terceiro idioma), 404/400 de id, e o ciclo
      criar → editar → excluir de uma pergunta conferido na home a cada passo.
      **Mutação:** sem `requireAdmin` no POST + Excluir virando arquivar → 3 reprovam. Revertido.
- [x] **Telas** em `/admin/site/depoimentos` e `/admin/site/faq`; **Textos mudou para
      `/admin/site/textos`** (e `/admin/site` redireciona para lá), porque a coluna secundária acende
      um item também nas sub-rotas dele — em `/admin/site` ele ficaria aceso junto com os outros.
      As duas telas são **um editor só** (`HomeListEditor` + `HomeListItem` + `HomeListItemForm`),
      configurado por página. Abas de idioma, item novo **nasce Rascunho** e no **fim** da lista
      (maior ordem + 10), **Excluir em dois cliques**, status em palavras (Rascunho/Publicado/
      Arquivado). **17 testes de componente** (estados carregando/erro/vazio, lista por idioma,
      criar no idioma da aba, validação, editar, excluir com confirmação, falhas visíveis) + **2**
      no mapa de navegação (o 2º nível de Site; nenhum filho prefixo de outro).
      **Mutação:** Excluir sem confirmação + fiação da FAQ trocada + item novo nascendo publicado +
      Textos de volta em `/admin/site` → **6 reprovam**. Revertido.
- [x] **Depoimentos: 4 SORTEADOS por visita, sem ordem** *(depois do teste do operador, 23/09 —
      "com milhares de depoimentos nunca vão ver igual")*. A home usa `ORDER BY random() LIMIT 4`
      (SQL parametrizado do Prisma); sem carrossel e sem script, porque quase ninguém passa do 1º
      quadro (pesquisa em `content.md` § 16). O admin de depoimentos perdeu o campo Ordem
      (`comOrdem` no editor comum) e lista do mais novo; a FAQ mantém a ordem. Testes que esperam
      um depoimento específico isolam o sorteio (`server/src/test/testimonial-pool.ts`); novo teste
      "no máximo 4, sorteados" (6 no pool → 4 na página; 15 visitas → mais de 4 nomes).
      **Mutação:** sempre os 4 primeiros → 1 reprova; Ordem de volta nos depoimentos → 2 reprovam.
- [x] **Textos com uma aba por página** *(operador, 23/09)*: "Toda página" e "Home" (a página é o
      1º pedaço da chave — página nova ganha aba sozinha), seções na ordem do dicionário com
      **"Leitor de tela" por último**, nome curto dentro da aba. **A busca atravessa as abas** (com
      termo, as abas somem e vêm resultados de todas as páginas, com o nome completo). **4 testes
      novos** + 2 ajustados. **Mutação:** sem "Leitor de tela por último" e busca presa à aba →
      2 reprovam. Revertido.
- **Done when:** ✅ o operador publica um depoimento novo e remove outro pelo admin, sem deploy.
  *Provado pelo operador no dev em 23/09 (publicou um depoimento pelo admin e ele apareceu na home —
  "Funcionou") e pelos testes de servidor, que publicam, arquivam e excluem terminando na home.*

#### Bloco C4 — Os 5 cursos da home vêm do banco

> **EM 5 ETAPAS, uma por vez** *(operador, 23/09/2026: "divida em etapas, discutimos cada etapa e
> implementamos 1 a 1")*. Cada etapa é discutida antes, aprovada por ele, e vira **um commit**.
> A etapa 1 vem primeiro porque é pequena e destrava o cadastro: com ela pronta, o operador já
> cadastra os cursos, e a etapa 2 marca como PT tudo o que existir.

- [ ] **Etapa 1 — campo de imagem aceita `/img/curso.jpg`** *(plano aprovado em 23/09)*.
      `thumbnailUrl` usa `z.string().url()`, que **recusa** caminho relativo (as imagens atuais não
      salvam pelo admin) e **aceita** `javascript:`. Trocar pela checagem explícita de esquema que
      o `CLAUDE.md` já exige (`core/` → a regra do `.url()`): aceita `https?://…` ou caminho do
      próprio site começando com `/`; recusa `javascript:`, `data:` e `//outro-site`. Teste de
      servidor + de componente + mutação.
- [x] **Etapa 2 — idioma no curso** (a parte de dados do Bloco I que o C4 exige). *Feita em 24/09
      como etapa 3 do "app do aluno em inglês" (Bloco I).* *MOVIDA em
      24/09 para a etapa 3 do "app do aluno em inglês" (Bloco I), que vem antes do C4 — quando ela
      fechar, esta fecha junto:*
      `Course.language` obrigatório + campo **Idioma** no formulário de curso + etiqueta "EN" na
      lista do admin; os cursos que já existem viram PT. *A confirmar na discussão da etapa:* o
      idioma fica travado depois de criado (como o slug). **Antes desta etapa:** dividir o
      `AdminCourseFormPage.tsx`, que passou de ~280 para ~370 linhas na formatação de 23/09 (teto
      ~200) — é nele que o campo entra.
- [ ] *(operador)* **Cadastrar os 5 cursos da home** no admin.
- [ ] **Etapa 3 — a home lê os cursos do banco** (`server/src/routes/home.ts`, que hoje usa uma
      constante): `PUBLISHED` + idioma da página + `displayOrder`. O botão de assinar das páginas
      em inglês passa a ser **derivado do banco** (≥ 1 aula publicada em inglês, pela cadeia
      inteira — `CLAUDE.md` → *Idiomas*). *A decidir na etapa:* **qual curso é o destaque** (o
      primeiro da ordem, ou o que tiver a etiqueta Destaque — nesse caso a etapa 4 vem antes) e o
      que fazer com os 2 cursos `exemplo-*`, que estão **publicados em produção** e apareceriam na
      home.
- [ ] **Etapa 4 — etiqueta do curso** *(decidida em 22/09 — spec em `courses.md` → "Etiqueta do
      curso")*: enum `CourseBadge { NOVO DESTAQUE MAIS_VENDIDO }` + `Course.badge?` + a data que
      faz `NOVO` **expirar em 120 dias** · campo de seleção no formulário de curso · rótulos em
      `common.badges.*` no dicionário (editáveis no `/admin/site`) · a home usa a etiqueta do curso
      no lugar do texto fixo "CURSO EM DESTAQUE". **Trava:** é campo SEPARADO do `status` — pôr
      "NOVO" naquele enum sumiria com o curso do site inteiro, sem erro.
- [ ] **Etapa 5 — ordem por ARRASTAR** *(operador, 23/09)*: nos cursos, e **o mesmo componente**
      passa a ordenar as perguntas frequentes (hoje, número de Ordem). A biblioteca de arrastar é
      **dependência nova** — nomeá-la no plano da etapa, com o ok do operador.
- **Done when:** o operador troca o curso em destaque pelo admin e a home muda.

> **SEQUENCIAMENTO DECIDIDO: este bloco vem DEPOIS do Bunny.** O `introVideoId` é ativo do Bunny
> numa rota **pública** (o vídeo de apresentação toca para não-membro), e é o único ponto onde as
> duas frentes se tocam. Construir a página pública antes de saber como o Bunny assina e embeda
> significa construí-la duas vezes. A **fronteira** já está decidida, então o player nasce do lado
> privado desde o dia um — só o payload de SEO espera.

- [x] **PRIMEIRO ITEM DO BLOCO — `server/src/lib/html.ts`: `escapeHtml()` + `jsonLd()`.** Vem antes
      do primeiro template, não depois: escape retrofitado é escape com furo, porque ninguém
      relê 6 arquivos procurando a interpolação que escapou. **São DUAS funções porque são dois
      problemas diferentes:** `escapeHtml` cobre texto e atributo (`&`, `<`, `>`, `"`, `'`);
      `jsonLd` serializa o bloco `<script type="application/ld+json">`, onde escapar HTML
      produziria `&amp;` **visível para o crawler** (quebrando o dado estruturado que o bloco
      inteiro existe para emitir) e o risco real é outro — fechar o `</script>` de dentro da
      string, o que se resolve com `JSON.stringify` + `<` → `<`. Usar um no lugar do outro
      falha nas duas direções.
- [x] **Teste unitário do helper** — é a **única unidade genuína de todo o plano**, e cabe aqui
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
- [ ] **A IMAGEM de OG em si** (o arquivo, não a meta tag). Arte conforme `design.md` §12; mora em
      `client/public/img/`, que é servida na raiz (`/img/og-…`).
      **Duas travas que fazem o card sair sem imagem, as duas silenciosas:**
      **(a)** `og:image` exige **URL ABSOLUTA** (`https://…`) — caminho relativo é ignorado pelo
      crawler, e no nosso HTML ele passa por `escapeHtml()` como todo atributo.
      **(b)** a imagem precisa ser alcançável **sem sessão**. Nada de OG apontando para arquivo
      atrás do gate — o robô não faz login.
      ⚠️ `[MEDIR antes de fechar, nunca supor]` **o formato.** A `design.md` §12 manda PNG/JPG
      1200×630 e trata WebP como risco — postura **conservadora, não medida**, e o gatilho de
      reabertura dela é exatamente este item. Meça com as ferramentas das próprias plataformas:
      **Post Inspector** (LinkedIn) e **Sharing Debugger** (Facebook) renderizam o card e forçam
      limpeza de cache; no WhatsApp, mande o link para você mesmo.
      **Se as três aceitarem WebP, a exceção morreu** — atualize a §12 e registre; se qualquer uma
      falhar, a §12 está certa e o motivo passa a ser medido em vez de suposto.
      **Por que MEDIR e não confiar no verde:** card sem imagem não gera erro, não reprova teste e
      **não aparece para quem compartilha** (o cache local já tem o card). O sintoma é queda de
      clique que ninguém liga à causa — e o link do certificado é canal de aquisição por decisão de
      produto (`courses.md`).
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
- [ ] **Os dois idiomas na superfície pública** *(Set 2026 — depende do Bloco I; spec em
      `idiomas.md` §2, trava em `CLAUDE.md` → Idiomas)*. Caminhos em inglês **decididos** (operador, 14/09):
      `/en/courses`, `/en/course/:slug`, `/en/learning-path/:slug`, `/en/certificate/:publicId`.
      Então: cada rota pública também sob `/en`
      · redirecionamento **só na primeira visita à raiz**, pelo navegador (`pt*` fica, qualquer
      outro vai para `/en`), **nunca** em link direto nem sem `Accept-Language` · `<html lang>`,
      `og:locale` e `hreflang` recíproco quando houver par · `sitemap.xml` com os dois idiomas.
      **Teste de servidor dos quatro casos do redirecionamento** (pt-BR na raiz fica · en-US na raiz
      vai para `/en` · en-US em link direto fica · sem cabeçalho fica) e o teste de aceitação do
      `curl` abaixo repetido numa URL `/en`.
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
- [ ] **Setup no dashboard (sem código):** Payments Plano Padrão (conta MEI/CNPJ, payout Banco do Brasil) + **Stripe Billing ativado**. Produto **"Assinatura"** com **2 `Price`**: Mensal R$99,90 (sem fidelidade) / Anual ~R$995 (~17% off). Sem free trial, sem conteúdo grátis. **Sem Customer Portal.** *(Versão em dólar: próximo item.)*
- [ ] **Preços em dólar, pelo país do CARTÃO** *(decisão do operador, 14/09/2026 — `billing.md`)*:
      **US$ 30/mês** + **US$ 299/ano** (confirmado pelo operador em 14/09). **context7 `/websites/stripe` primeiro:** moedas no mesmo
      `Price` ou `Price`s separados, e como saber o país do cartão **antes** de confirmar a cobrança.
      **Trava:** a moeda nunca sai do idioma nem do prefixo `/en` (`CLAUDE.md` → Membership Gating).
      **Teste de servidor:** cartão do Brasil → preço em real; cartão estrangeiro → preço em dólar
      (usar cartões de teste por país, se a Stripe oferecer — verificar).
- [ ] **Preço mostrado × cobrado:** quando o cartão levar a uma moeda diferente da que a página
      mostrou, **a tela de pagamento mostra o valor final antes da confirmação**. O desenho da tela
      é do operador.
- [ ] **DECISÃO DE IMPOSTO INTERNACIONAL — recomendado fechar ANTES da primeira venda para cartão
      estrangeiro** (`idiomas.md` §5). **Stripe Tax** + registro e declaração com o contador **×**
      **Stripe Managed Payments** (a Stripe vira a vendedora; exige a página de pagamento dela e
      reabre a decisão do Payment Element embutido — *dado novo* legítimo). Levar ao contador: conta
      MEI, faturamento já em território EPP, e **IVA europeu desde a 1ª venda, que já pega aluno de
      Portugal**. `[FATO — context7, 14/09/2026]` · aceite de empresa brasileira no Managed Payments:
      **não verificado**.
- [ ] **IDIOMA É FILTRO, NÃO PORTÃO** *(decisão do operador, 14/09/2026 — modelo LinkedIn Learning,
      `idiomas.md` §3)*: uma assinatura dá acesso aos cursos **dos dois idiomas**. `temAcessoAtivo()`
      **não lê idioma**; `Subscription` **não tem** idioma. Caso 16 da matriz abaixo prova isso.
- [ ] **Botão de assinar nas páginas em inglês só liga com ≥ 1 aula publicada em inglês**
      *(operador, 14/09)*. Condição **derivada do banco pela cadeia inteira** (aula publicada → módulo
      publicado → curso em inglês publicado), **nunca** interruptor manual. **Regra de exibição, não
      de acesso:** o checkout não recusa ninguém por ela (a assinatura não tem idioma). **Antes de
      codar, o operador fecha** a aparência do botão desligado. **Teste de servidor:** página em
      inglês sem aula em inglês → sem botão ativo; publicar uma aula → botão ativo; aula publicada
      dentro de **curso em rascunho** → continua sem botão (a cadeia).
- [ ] **Conta de receita em dólar** em `strategy.md` §6 (é doc, não código): taxa da Stripe para
      cartão estrangeiro (verificar no painel) e como o assinante em dólar entra na meta, que hoje
      está só em reais.
- [ ] **Configurar Smart Retries + automações de recuperação** conforme a política de produto abaixo. Isto é **configuração, não código**.
- [ ] **Política de dunning (decisão NOSSA, executada pela Stripe):** falha na renovação → retries automáticos → corte. **Acesso MANTIDO durante toda a janela de retry** (`past_due`) — churn involuntário é a maior alavanca (strategy.md §6). Corte no fim da janela → `unpaid`/`canceled` + `session.deleteMany`. Ajustar a janela é mudança de configuração. *Confirmar os intervalos exatos que a Stripe expõe na abertura da fase, via context7.*
- [ ] **Checkout embutido (Payment Element).** Cria `Customer` + `Subscription` na Stripe e confirma o primeiro pagamento na própria página. O dado do cartão vai direto pro Stripe (não toca nosso servidor). **`requires_action`/3DS é tratado pelo Element no fluxo de assinatura.**
- [ ] `Subscription` model = **espelho local** (o gate lê daqui) com growth seams: `ownerUserId?`, `organizationId?` (nullable), `seats` (default 1), `status`, `currentPeriodEnd`, `stripeCustomerId`, **`stripeSubscriptionId` (obrigatório — é a chave do objeto canônico)** (+ RLS); migration — **sem coluna de idioma** (idioma é filtro, não acesso — Set 2026)
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
- [ ] **TESTES DE SERVIDOR (~16, supertest, sem browser) — escritos JUNTO com o handler acima, não
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
      **Idioma** *(Set 2026)* — (16) assinatura feita em português → curso em **inglês liberado**,
      inclusive a URL assinada de vídeo. Existe para ninguém "proteger" o acesso por idioma no futuro
      e trancar quem pagou (idioma é filtro — `CLAUDE.md` → Idiomas).
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
- [ ] **Depoimento pedido ao aluno quando ele conclui um curso — UMA VEZ por aluno, nunca por
      curso** *(decisão do operador, 23/09/2026: "não preciso de prova social por curso… pensei
      num depoimento geral"; o oposto da disputa por estrelas da Udemy)*. Depende deste bloco:
      "concluiu um curso" só existe com o `LessonProgress`.
      - **O pedido:** nota de **1 a 5 estrelas** + **uma pergunta aberta, geral** — curso, escola,
        experiência de ensino, o que o aluno quiser. **Sem escolha de tema** (proposta do agente
        aceita pelo operador: separar por tema acrescenta uma escolha e um filtro que ninguém usa).
        O texto exato da pergunta é do operador, na hora de construir.
      - **As estrelas são só do operador:** nunca aparecem no site, em nenhum idioma. Teste de
        servidor garante que a nota não sai na home.
      - **Um por aluno, garantido pelo BANCO:** `Testimonial` ganha o aluno ligado a ele, **único**
        e opcional (os depoimentos cadastrados à mão, como os 4 vindos da Udemy, não têm conta
        aqui). O segundo envio do mesmo aluno é recusado pelo banco, não só pela tela.
      - **Se o aluno pular:** o pedido volta no **próximo curso concluído**, até ele responder ou
        clicar em **"Não, obrigado"**, que encerra de vez. Quem respondeu nunca mais é perguntado.
        A recusa definitiva precisa ficar gravada — **sem** coluna nova no `User` (identidade enxuta).
      - **Chega como Rascunho**, e o operador escolhe o que publicar no `/admin/site/depoimentos`.
        O aluno marca se **autoriza aparecer com o nome completo**; **sem essa marcação o texto fica
        só para o operador**, e o servidor recusa publicá-lo (LGPD — a tela esconder o botão não é
        defesa).
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
- [ ] **O JilsonAI responde no idioma do aluno** (escola bilíngue, Set 2026 — `idiomas.md` §6):
      persona e prompt preparados para PT e EN; o contexto de curso vem do idioma do curso. O
      desenho (uma persona com instrução de idioma × duas personas) se decide na abertura da fase.
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
- [ ] **Certificate in the trilha/course language** (bilingual school, Sep 2026 — `idiomas.md`): fixed PDF/page text comes from the shared dictionary; `/certificado/:publicId` gets its `/en` counterpart like every public route.
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
      — **in the student's language** (`preferredLanguage`; bilingual school, Sep 2026)
- [ ] LGPD: privacy policy, terms, consent, data export/delete path — **plus English versions of
      the legal pages** (the English side is live from launch — `idiomas.md`)
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
- [ ] **Upgrade do plano Neon ANTES do primeiro aluno pagante.** Dado real de aluno nunca fica em
      banco sem backup. *(Reescrito em Set 2026 — o checkbox dizia "Supabase Free → Pro"; a métrica
      de decisão mudou junto com o fornecedor.)*
      **O que decide o upgrade é a JANELA DE RETENÇÃO DO PITR, não CPU nem storage.** O *Point-in-Time
      Restore* do Neon é a recuperação de erro dentro de uma janela; no Free a janela é curta, e
      cresce nos planos pagos. **Confirmar a janela vigente no painel no dia** — preço e política de
      fornecedor envelhecem, e por isso o número **não** está fixado nos docs.
      **PITR NÃO É BACKUP, e confundir os dois é o modo de falha aqui.** O PITR protege de erro
      **seu** dentro da janela (apaguei a tabela errada, rodei o `UPDATE` sem `WHERE`). Ele **não**
      protege de perder a conta — suspensão, cobrança falhada, comprometimento do login. São dois
      riscos, e exigem duas coisas: **janela de PITR adequada** *mais* **`pg_dump` periódico guardado
      fora do fornecedor**. O segundo é o checkbox de restauração logo abaixo.
      **O custo de US$ 35/mês do desenho antigo NÃO se transporta:** ele vinha do plano Supabase ser
      por **organização** com 2 projetos (US$ 25 + US$ 10). No Neon o 2º ambiente é um **branch** do
      mesmo projeto, então aquele item de US$ 10 simplesmente deixou de existir.
      **Teto de infra sobe de ~US$ 30 para ~US$ 35/mês.** *Sem gatilho de reabertura — decisão de
      conforto operacional, deliberada.*
- [x] **🔒 BLOQUEIO DO GO-LIVE — o login não pode travar a escola inteira** *(operador, 23/09/2026:
      "não podemos depender de um aluno burro tentando entrar e travar a escola toda")*.
      **O risco, medido na 1.7.5:** o login tem regra padrão de **3 tentativas a cada 10 segundos**
      (`dist/api/rate-limiter/index.mjs:302-308`), e ela conta **toda** tentativa, certa ou errada.
      Se o IP do visitante não resolver, todo mundo cai no **mesmo balde** — então a 4ª pessoa a
      tentar entrar em 10 segundos, qualquer uma, espera; e um atacante segura o balde cheio para
      sempre com uma requisição a cada 3 segundos, trancando o admin junto.
      **Hoje o impacto é zero** (nenhum aluno, gate "Em breve" no ar), e é por isso que dá para
      fazer direito em vez de às pressas. **Mas o gate NÃO desce antes disto:**
      - [x] Confirmar pelo log da Railway se o IP resolve — **não resolvia** (23/09, 11:41).
      - [x] **Corrigido com o cabeçalho que a Railway garante:** `ipAddressHeaders: ["x-real-ip"]`,
            escolhido por medição (forjado ignorado, igual ao IP real). `trustedProxies` não foi
            preciso — o proxy interno muda de IP a cada requisição, o que o tornaria frágil.
      - [x] **Prova antes de descer o gate:** dois logins de redes diferentes em sequência não
            compartilham limite — errar a senha 3 vezes numa rede não impede o login na outra.
            **Provado em produção pelo operador (23/09, 14:55):** 4 tentativas no Mac → a 4ª
            bloqueada, inclusive com a senha certa; no mesmo intervalo o celular no 4G entrou
            normalmente; o Mac voltou a entrar sozinho depois de ~15 s. O log da implantação
            nova mostra só os `Invalid password` — a linha do balde compartilhado não voltou.

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

- [ ] **2FA por app autenticador (NÃO SMS)** em: **Neon, Railway, Stripe, GitHub, Bunny,
      registrador do domínio** e **no e-mail do admin da plataforma**. SMS fica de fora por
      SIM-swap. O e-mail entra na lista porque é o **caminho de reset de todos os outros** —
      blindar os seis e deixar o e-mail aberto é não blindar nada.
- [ ] **Códigos de recuperação guardados FORA do Mac** — impressos ou em gerenciador de senhas.
      Guardados apenas na máquina que autentica, eles somem exatamente no cenário em que serviriam
      (perda, roubo ou pane do Mac).
- [ ] **Senha única por serviço, em gerenciador.** Senha repetida transforma vazamento de terceiro
      em invasão nossa — e um operador só não tem quem perceba o acesso estranho.
- [ ] **Backup: política CONFIRMADA + RESTORE DE TESTE executado uma vez.** A confirmação da janela
      de PITR vive no checkbox *"Upgrade do plano Neon"* acima — não duplicar aqui. **O que é novo é
      o restore:** executar um restore de teste **uma vez** e registrar que funcionou. Porquê:
      **backup nunca testado é fé, não é plano.** E o cenário realista não é invasão — é **migration
      ruim ou reset apontado pro lugar errado** (a trava de hostname do CLAUDE.md nasceu desse mesmo
      risco).
      **O alvo do teste ficou MAIS BARATO com o Neon, e são DOIS testes, não um:**
      **(1) PITR** — criar um branch a partir de um ponto no tempo anterior a um estrago proposital,
      e conferir que o dado voltou. Custa um branch descartável, não um projeto.
      **(2) `pg_dump` frio** — restaurar um dump guardado fora do fornecedor num Postgres limpo
      (o local serve) e comparar contagem **e schema**. Este é o único que cobre "perdi a conta".
      *A receita já foi exercitada em Set 2026, na própria migração Supabase → Neon: `pg_dump
      --schema=public --no-owner --no-privileges` + `psql --single-transaction -v ON_ERROR_STOP=1`,
      com diff de linhas, de catálogo e de `last_value` das sequences.*
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
> - ~~*EN phase / canal YouTube EN* — **removido.** Escola e YouTube ficam PT; inglês só via tentativa LinkedIn Learning (quando C1). O seam `User.preferredLanguage="pt"` fica dormente (custo zero), mas não há expansão EN planejada para a escola.~~ **REVERTIDO em 14/09/2026 (decisão do operador):** a escola é bilíngue desde o lançamento (Fase 3 → Bloco I) e o canal do YouTube em inglês volta, separado do PT. Ver `idiomas.md`.

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

*Atualizado: Set 2026 (10) — **banco migrado do Supabase para o Neon: produção e dev, com o teste deliberadamente INALTERADO.** **(1) O que a migração exigiu, e o que ela não exigiu.** Foi Postgres→Postgres puro — `pg_dump --schema=public --no-owner --no-privileges` + `psql --single-transaction -v ON_ERROR_STOP=1` — porque a autenticação **já era nossa**: Better Auth guarda `user`/`session`/`account` no schema `public` via Prisma, então elas migraram como dados comuns e **zero linha de código de auth foi tocada**. Registrado porque é o argumento que torna a troca barata, e ele não existiria se o projeto usasse o auth do fornecedor. **(2) A verificação foi de SCHEMA, não só de contagem — e a distinção pagou.** As 11 tabelas / 19 linhas bateram, mas o diff de catálogo acusou **61 diferenças**, todas `NOT NULL` materializado em `pg_constraint`: **mudança do PG18** (o 17 guardava só em `pg_attribute.attnotnull`). Semântica idêntica, provado pelo `is_nullable` do `information_schema` batendo coluna a coluna. Conferidas à parte as **`last_value` das 6 sequences** (10, 8, 11, 13, 9, 9) — contagem de linhas não pega sequence dessincronizada, que é o erro clássico deste tipo de migração. **(3) [FATO que derruba a entrada (10) do changelog do `CLAUDE.md`] Prisma 5.22 funciona com PG18.** A premissa registrada era *"o 5.22 é anterior ao 18"*; medido contra o Neon 18.6, `migrate deploy`, `migrate status`, client gerado, transação e rollback passam. O banco de teste segue no 17 por o CI usar `postgres:17`, **não** mais por esse motivo — e a divergência prod-PG18 / teste-PG17 fica **registrada como aceita**, com gatilho. **(4) INCIDENTE DE CREDENCIAL.** `neon branches create` imprime a connection URI **com senha** por padrão, e **branch do Neon herda a senha da role do pai** — as duas juntas fizeram o vazamento de uma credencial de *dev* ser um vazamento de **produção**. Rotacionadas as duas e **verificado por teste** que a senha antiga falha em ambas. Virou regra no `CLAUDE.md`: rotacionar branch novo antes de usar, e redirecionar a saída de comando que possa emitir connection string. **(5) `DATABASE_URL` e `DIRECT_URL` mudam JUNTAS.** Trocada só a primeira, o app lê um banco e o `migrate deploy` do pre-deploy migra **outro** — e o deploy fica **verde**. Aconteceu aqui; dano zero só porque não havia migration pendente. **(6) O 2º ambiente virou BRANCH, não 2º projeto** — o que **derruba** o teto de US$ 35/mês da entrada (8) deste stream: aquele valor vinha do plano Supabase ser por organização com dois projetos (US$ 25 + US$ 10), e o item de US$ 10 deixou de existir. O checkbox de upgrade da Fase 7 foi reescrito: o que decide o plano passa a ser a **janela de retenção do PITR**, e ficou explícito que **PITR não é backup** (protege de erro seu na janela, não de perder a conta) — o checkbox de restore agora pede **dois** testes, PITR e `pg_dump` frio. **(7) Teste continua LOCAL, e isso é decisão reafirmada, não inércia.** Branch de nuvem é barato e instantâneo, o que torna tentador usá-lo como banco de teste — mas devolveria o `migrate reset --force` para um banco alcançável pela internet, exatamente o que a decisão de Ago 2026 evita. A trava de hostname disparou e confirmou `localhost` durante toda a sessão. **(8) Supabase intocado como rollback durante a migração e APAGADO pelo operador na mesma sessão**, depois de a validação fechar (somente leitura o tempo todo, verificado por comparação antes/depois). **Consequência que vira prioridade:** sem o Supabase de pé, a única rede de segurança do banco passa a ser a **janela curta de PITR do plano Free** — o que promove o checkbox de backup da Fase 7 de "antes do primeiro aluno pagante" para **o próximo item de infra a fechar**, já que o `pg_dump` frio é o que cobre "perdi a conta".*

*Atualizado: Set 2026 (11) — **escola bilíngue (PT + EN) entra no plano** (decisão do operador, 14/09/2026; raciocínio no changelog do `CLAUDE.md`, entrada **Set 2026 (16)** — não duplicado aqui). O que mudou neste plano: (1) **Fase 3 ganha o Bloco I** (idioma no conteúdo, dicionário único de textos, seletor), sequenciado **antes** da *Superfície pública*. A posição exata dentro da fase é do operador. (2) **O bloco Superfície pública ganha o item dos dois idiomas** (`/en`, redirecionamento só na raiz, `hreflang`, sitemap). Ele fica lá, e não no Bloco I, para os endereços nascerem nos templates do servidor em vez de no React. (3) **Fase 4 ganha preço em dólar pelo país do cartão, a questão preço mostrado × cobrado, a decisão de imposto internacional e a conta de receita em dólar.** (4) Fases 6, 6.5 e 7 ganham uma nota de idioma cada. (5) A costura de idioma da Fase 2 e a linha "EN removido" dos *Removidos do roadmap* foram riscadas, não apagadas. **Nada foi construído.** Pendências de produto marcadas no Passo 0 de cada bloco: o que o catálogo EN vazio mostra, onde fica o seletor, os caminhos sob `/en`, o valor do anual em dólar.*

*Atualizado: Set 2026 (12) — **respostas do operador às pendências (14/09, 2ª rodada).** Registro da decisão: `CLAUDE.md` Set 2026 (16), item (h). Neste plano: (1) **Fase 2**: o "catálogo rotativo de até 20" estava defasado desde o Set 2026 (13) do `courses.md`; passa a **15 por idioma, no máximo 2 idiomas**. (2) **Bloco I**: o catálogo EN vazio vira item próprio — **mock "Excel + AI" fora do banco**; o Passo 0 fica só com a posição do seletor. (3) **Superfície pública**: endereços com **segmentos em inglês** (`/en/courses`); falta o segmento de trilha e de certificado. (4) **Fase 4**: anual **US$ 299** confirmado; entra **ACESSO POR IDIOMA** (`Subscription.language` + checagem dentro de `temAcessoAtivo()` + casos 16–18 na matriz, que vai a ~18). Três perguntas ficam para o operador antes de codar a fase: trocar o idioma da assinatura; o que o assinante vê no catálogo do outro idioma; se assinar em inglês fica ligado sem curso em inglês.*

*Atualizado: Set 2026 (13) — **3ª rodada do operador, mesma data** (registro: `CLAUDE.md` Set 2026 (16), item (i)). **Idioma é filtro, não portão** (modelo LinkedIn Learning): a Fase 4 perde o item "acesso por idioma", a `Subscription` não ganha `language`, e os casos 16–18 viram **um** caso de acesso cruzado (matriz vai a ~16). Das três perguntas da entrada (12), sobra só a de assinar em inglês enquanto os cursos em inglês não têm aula. **Bloco I:** o mock "Excel + AI" sai. Entra o **curso publicado com zero aulas**, porque o operador cadastra um ou dois cursos em inglês ainda vazios.*

*Atualizado: Set 2026 (14) — **4ª rodada do operador, mesma data** (registro: `CLAUDE.md` Set 2026 (16), item (j)). Superfície pública: endereços **`/en/learning-path/:slug`** e **`/en/certificate/:publicId`** decididos. Bloco I: curso sem aulas mostra **"0 aulas"** normalmente, e o item garante só que a página não quebra. Fase 4: a pergunta da entrada (13) virou item — **o botão de assinar nas páginas em inglês liga com a 1ª aula publicada em inglês**, derivado do banco, regra de exibição e não de checkout, com teste de servidor pela cadeia de status.*
