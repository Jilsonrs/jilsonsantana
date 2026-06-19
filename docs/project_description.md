# jilsonsantana.com — Claude Project Description (fonte única da verdade)

## Princípio-estrela: AI no DNA

> **A escola não ensina IA. A escola É IA.**
> O aluno não aprende sobre IA só assistindo a um vídeo — ele aprende **vivendo** uma experiência
> onde a IA está em cada ponto: descobre o que estudar conversando, monta o currículo com a IA,
> tira dúvida com a IA, é acompanhado pela IA. A forma de aprender *é* a aula de como a IA muda o
> trabalho. Quem termina sai sabendo usar IA porque **passou semanas usando uma**.

Isto é o diferencial que ninguém copia barato: o **JilsonAI** não é um chatbot colado na lateral —
é o tecido da escola. Concorrentes "ensinam IA" rodando vídeos numa plataforma comum; aqui a
própria experiência de estudar é um caso de uso de IA bem-feito.

**Filtro de decisão (aplicar a cada feature, como o Copy Filter faz com a copy):**
> *"Essa parte da escola é uma demonstração viva de IA bem-usada, ou é mecânica comum?"*
> A busca não é caixa+filtros → é o JilsonAI entendendo o objetivo. O onboarding não é formulário →
> é navegar livre com a IA por perto. O suporte não é fórum → é IA que resolve e escala.

---

## Visão geral

**jilsonsantana.com** é um negócio de educação **de uma pessoa só**, escalável e **sustentável**,
centrado em **habilidades de dados práticas, ensinadas de forma simples, acessíveis a todos** — na
era da IA.

Jilson é **instrutor e analista de dados sênior** que já ajudou **+100.000 alunos** no mundo a
aprender dados de forma prática e aplicada. Tem 47 anos, é consciente de burnout e **não está
construindo um império**. Sustentabilidade é restrição de design, não meta secundária. Todo o
modelo é desenhado pra que **uma pessoa atenda muitos sem se esgotar** — por isso o **JilsonAI**
(assistente de ensino na voz e método dele) é **prioridade de produto, não acessório**.

**O modelo é uma assinatura única**, deliberadamente simples:

> **Assinatura = cursos + JilsonAI + sempre atualizado.** Sem gamificação (decisão do Jilson —
> evita overhead de gestão). Sem fórum de pares (não funciona nem na Udemy).

**Não é portfólio de freelancer nem site de consultoria.** É um produto de assinatura. O conteúdo
já existe (catálogo Udemy do Jilson), então **amplitude não custa produção extra**. O site converte
a audiência do YouTube em membros e entrega valor recorrente que a Udemy não dá: conteúdo
continuamente atualizado, JilsonAI, suporte direto, trilhas e certificados.

**Ativo de longo prazo.** Horizonte 5–10+ anos. Decisões favorecem uma fundação sólida e simples
sobre crescimento rápido.

---

## Identidade & posicionamento

- **Tagline oficial (guiada por identidade, não por preço):**
  - PT (primária): *"Torne-se um especialista em dados na era da IA."*
- **Coerência de marca (ativo existente):** os cursos do Jilson na Udemy já são "**Formação
  Especialista**". A tagline nomeia e amplifica uma promessa que já existe no catálogo — Udemy,
  YouTube e site agora apontam pra mesma palavra: *especialista*. Reduz atrito no funil
  (Udemy → YouTube → site).
- **Foco:** **Data Skills** na prática — Excel, Power BI, SQL, Python, IA aplicada. Amplitude (como
  a Hashtag), mas sem custo de produção extra porque o conteúdo já existe.
- **Diferencial =** autoridade pessoal + simplicidade + ângulo de IA aplicada ("**X + Claude**") +
  **JilsonAI** + **acessibilidade**.
- **Missão:** dados acessíveis a todos, sem complexidade.
- **Voz da marca:** tornar o complexo simples; curto, direto, focado no que importa; aprender rápido
  e aplicar já.
- **Filosofia de produto:** simples como a **Apple** (uma oferta clara; o JilsonAI é o toque mágico),
  com autoridade pessoal como o **Mosh** (premium, solo).

---

## Âncoras de credibilidade

- +100.000 alunos formados, dezenas de países
- Udemy Business: milhares de alunos corporativos
- 12+ anos como analista de dados e desenvolvedor full-stack
- YouTube @JilsonUS — conteúdo de dados + IA aplicada, audiência grande (~177K)
- Catálogo "Formação Especialista" na Udemy (marca estabelecida)
- Certificação PL-300

---

## Modelo, preço & esteira de valor

> A base fica **acessível**; os tiers de cima carregam o ticket alto.
> Resolve "acessibilidade + sem teto de receita" sem precificar a base alto.

| Tier | O quê | Preço | Papel |
|------|-------|-------|-------|
| 1 — Assinatura (base) | Cursos + JilsonAI + sempre atualizado | **R$99,90/mês** ou **~R$995/ano** | Base & missão — acessível a todos |
| 2 — Cohorts ao vivo ("escola") | Aulas ao vivo (Zoom) p/ quem não quer gravado | Ticket maior (TBD) | Pós-MVP |
| 3 — Corporativo (B2B) | Treinamento de equipes | Ticket alto | **Horizonte** (ver abaixo) |

### Pricing da assinatura (TRAVADO)
- **Mensal R$99,90/mês — sem fidelidade** (padrão, motor de aquisição).
- **Anual ~R$995/ano** (~17% de desconto, cobrança única recorrente anual). Upgrade mensal→anual
  usa proration nativo do Stripe.
- **Sem free trial. Sem conteúdo grátis dentro da escola** (o grátis vive no YouTube).
- **Sem lock de preço vitalício** pra fundadores. Founding member, se houver, é por bônus/condição
  temporária — nunca preço travado pra sempre.
- Build = **2 prices num produto "Assinatura"**; `temAcessoAtivo()` ignora qual price o aluno tem.
- *Validação (Gemini, convergência ~95%):* mensal-sem-fidelidade ganha de anual-12x-travado em
  conversão × LTV; fidelidade 12x carrega risco de Procon/CDC/chargeback pra operador solo.
- *KPIs a observar:* churn <8% (saudável BR 6–10%), conversão 3–5%, winback 15–25%,
  MRR-novo ≥20%>MRR-perdido, mix de plano 20–30% anual.

### Valor recorrente (o que a Udemy não dá)
Conteúdo continuamente atualizado, JilsonAI 24/7, suporte direto, trilhas e certificados.
> Muda o negócio de "venda de informação" para "**venda de acesso a um ecossistema**".

---

## JilsonAI — o diferencial

Assistente de ensino na **voz e método do Jilson**, 24/7. É o que **permite uma pessoa atender
muitos sem burnout** — suporte não escala com as horas do Jilson, mas o JilsonAI escala. Construído
sobre a Claude API. **Prioridade de produto, não add-on.** Detalhe técnico/roadmap em **JILSONAI.md**.

### Custo & quota (resolvido)
- **Custo não é risco existencial.** Estimativa: aluno médio gasta poucos reais/mês de API; mesmo um
  heavy user fica confortável dentro de R$99,90. O risco é a **cauda** (heavy/abusivo), limitada por
  **quota + rate-limit**.
- **Modelo de ponta como default** (a IA é sempre inteligente — decisão de produto). Modelo barato só
  pra trivial; topo só pra caso raro. Aluno nunca vê nome de modelo — vê "quantidade de uso".
- **Medidor de consumo visível** na UI do chat (clima Apple: calmo, "uso do mês" — nunca countdown
  ansioso). Ancora que o JilsonAI é premium com custo real — **não um ChatGPT/Gemini/Claude grátis**.
- **Tiers de uso** (pacote avulso + JilsonAI+) = **seams pós-lançamento**, ligados quando o dado real
  (`AiEvent`) justificar. Lançamento = 1 plano + 1 quota generosa.

---

## Trilhas — o currículo da era da IA

O melhor mecanismo de mercado (validado na referência "Career Plan" da LinkedIn), levado além:
- Aluno declara o objetivo → a IA monta um **plano nomeado** agrupado por competência → o aluno
  **salva** (vira a trilha dele) → **edita** (add/remove) → conclui → **certifica** (a 100%).
- **Itens = combinação livre** de cursos inteiros + aulas avulsas (só aulas, só cursos, ou mix; a
  unidade mínima é a aula).
- **2 tipos:** **curadas** (Jilson cria à mão — lançamento; o Jilson é a "IA v0") e **personalizadas**
  (JilsonAI monta sob medida — Fase 4–5). São a mesma entidade; só muda quem criou.
- **3 saltos sobre a LinkedIn:** granularidade de aula · adapta ao nível do aluno · **certificado por
  competências** (lista as skills cobertas — forte pra quem mira emprego em empresa).
- Detalhe em **JILSONAI.md → Trilhas**.

**Onboarding aberto e livre:** trilhas e cursos à mostra, o aluno clica e assiste o que quiser. O
`recommendTrilha` é **ajuda opcional**, nunca um portão. (Ordem das seções na home = decisão de
construção.)

---

## Comunidade = JilsonAI (não fórum)

"Comunidade" **não** é fórum de pares (não funciona nem na Udemy e gera moderação). É:
**JilsonAI (porta de entrada do suporte) + canal direto com o Jilson (escalação rara) + anúncios/
avisos.** O conhecimento compõe: resposta do Jilson → vira base → vira resposta automática da IA.

---

## Certificados (no MVP — "a escola nasce completa")

PDF gerado no servidor ao concluir 100% de uma trilha (ou curso). Nome = nome da trilha; lista as
**competências cobertas**. É também a matéria-prima de valor pro mundo corporativo (ROI medível).

---

## Conteúdo (slate)

Primeiro curso no lançamento: **Excel + IA**, dentro da **Trilha 1 — Comece por aqui (Fundamentos)**.
Depois: PL-300, Google Antigravity, SQL + Claude, AI + Claude, Data Modeling, Python + Claude, N8N —
organizados em poucas **trilhas curadas** (Fundamentos · Business Intelligence · Dados + Código ·
Automação & IA). Fio condutor: **dados na era da IA** ("X + Claude").

---

## Canais

- **YouTube @JilsonUS — funil primário de aquisição + AdSense bônus.** 1 vídeo/semana, PT.
  AdSense é **bônus real**, não a renda principal (assinatura + tiers de cima são). RPM PT/BR é baixo
  — é compounding de longo prazo, não atalho.
- **Udemy — descoberta / prova social + âncora de credibilidade** ("+100 mil alunos"). **Fora do
  escopo deste projeto** — tratada em projeto Claude separado. Não há UDEMY.md aqui.
- **Táticas de captura aprovadas:** lição "Próximos passos" no fim dos cursos; 1–2 e-mails
  educativos/mês; trailer do canal; CTA guiada por identidade (tagline oficial); escassez de
  founding member (sem lock vitalício) pros alunos Udemy.

---

## Idioma & foco

- **PT primeiro** — maior mercado pro tema. A Hashtag expandiu pra espanhol, não inglês → a faixa
  EN-tech fica aberta, mas **não é deste ciclo**.
- **EN removido da escola.** Escola e YouTube ficam **PT pra sempre**. Inglês só via tentativa única
  no LinkedIn Learning quando o Jilson chegar a C1 (sem data fixa; projeto à parte). O seam
  `User.preferredLanguage="pt"` fica dormente (custo zero), sem expansão EN planejada pra escola.
- LinkedIn (rede) deprioritizado.

---

## B2B / Corporativo — o HORIZONTE (Tier 3)

O ângulo corporativo **se alinha**, não conflita — e o "AI no DNA" ataca exatamente as dores de RH/T&D:

| Dor do RH | Plataforma tradicional | Solução da escola (AI no DNA) |
|-----------|------------------------|-------------------------------|
| Baixo engajamento | Cursos longos, genéricos | IA monta currículo cirúrgico pelo objetivo real |
| Baixa aplicação prática | Funcionário trava e desiste | JilsonAI 24/7 destrava na hora |
| Difícil medir ROI | Certificado genérico "por assistir" | Certificado por competências, pronto pro RH |

**Regras de ouro (anti-burnout):**
- **Não vender B2B no Dia 1.** Ciclo de venda corporativa é longo (3–6 meses) e exige NF, relatórios
  gerenciais e SLAs — destruiria o foco de operador solo no curto prazo.
- **Sequência:** lançar focado em B2C (motor YouTube) → primeiros milhares de alunos "treinam" a base
  do JilsonAI (Fase 4) → quando `buildLearningPlan` estiver no ar, o produto está maduro pra ser
  vendido caro pra times corporativos.
- **Seams já prontos:** `Subscription.organizationId`, `temAcessoAtivo` aceitando acesso via org,
  captura `LessonEvent` + certificado-por-competências (matéria-prima dos relatórios). Entra como
  **Fase 12**, sem reescrever.
- **Tensão de marca a gerir:** tagline "pra você, não pra um RH" vs. vender pro RH. Resolver estilo
  Apple — servir os dois sem diluir. (A decidir no content/design quando o B2B chegar.)

---

## Design — direção visual (TRAVADO)

**Apple puro: claro, leve, acessível, com criatividade** — branco, respiro, tipografia grande,
sombras suaves, transições leves, imagens bonitas, ícones limpos. **Com a cor do Jilson:**

- **Azul #238FE8** (R35 G143 B232) — **único acento** (botões, links, brilho do JilsonAI).
- **Preto** (texto/marca) · **cinza #838383** (RGB 131) (texto secundário).
- **Fonte MuseoModerno SemiBold** pra títulos/marca; sans neutra pro corpo.
- Tokens semânticos do shadcn (`--primary` = o azul; resto neutro) — sem cores hardcoded.
- Referência de UI pro medidor de consumo: a própria tela de "Usage" da Anthropic (barras calmas de
  %, créditos opt-in, teto ajustável). Detalhe completo em **DESIGN.md** (a reescrever).

---

## Stack técnica (decidida)

Custom-built (não Teachable), como ativo transferível e independente:

**React + TypeScript + Vite + Tailwind + shadcn/ui + Express + TypeScript + Prisma +
Supabase (PostgreSQL) + Better Auth (sessões em DB) + Bunny Stream (vídeo + DRM) +
Stripe (recorrência) + Claude API @anthropic-ai/sdk (JilsonAI) + pg-boss + Railway + Resend +
GitHub Actions.**

| Camada | Ferramenta | Papel |
|--------|-----------|-------|
| Frontend | React + TS + Vite + Tailwind + shadcn | UI, SPA |
| Backend | Express + TS + Prisma | API, lógica, DB type-safe |
| DB | Supabase (PostgreSQL) | Armazenamento (auth data hospedada aqui) |
| Auth | **Better Auth** (adapter Prisma, sessões em DB) | **NÃO** Supabase Auth |
| Vídeo | Bunny Stream (DRM) | Vídeo de curso gated |
| Billing | Stripe (recorrente + Customer Portal) | Assinatura |
| IA | Claude API (`@anthropic-ai/sdk`) | JilsonAI |
| Fila | pg-boss (Postgres-native) | Jobs async (e-mail, etc.) |
| E-mail | Resend | Transacional + educativo |
| Deploy/CI | Railway + GitHub Actions | Hosting, lint/test/build |
| Certificado | PDF server-side | Conclusão de trilha/curso |

- **Custo de infra no lançamento:** baixo (Supabase free → Pro $25 quando alunos chegarem).
- **Construído via Claude Code.** UX: simplicidade Apple.

> **Auth:** "Supabase (PostgreSQL)" significa que o Supabase **hospeda** os dados de auth — **não** é
> o produto Supabase Auth. Autenticação = **sessões em banco via Better Auth + Prisma + Express**
> (cookies HTTP-only). Supabase Auth, JS Client, Realtime e Data API **não** são usados.
>
> **RLS (mantido):** toda tabela do schema `public` DEVE ter Row Level Security habilitada (sem
> policies) no mesmo migration que a cria. O Prisma conecta via `DATABASE_URL` (role `BYPASSRLS`) e
> é o único acessor; o RLS bloqueia o Data API (`anon`/`authenticated`). Verificar com
> `Supabase:get_advisors(type='security')` após cada migration de DDL.

---

## Roadmap de build (fases) — ver IMPLEMENTATION-PLAN.md

| Fase | Escopo | Risco |
|------|--------|-------|
| 0 — Deploy/SSL/site no ar + MCPs | **✅ concluída** | — |
| 1 — Auth (Better Auth) | login, rotas protegidas, admin gate | baixo |
| 2 — Conteúdo + **Trilhas** | curso/módulo/aula (aula first-class) + LearningPlan/PlanItem + busca | baixo–médio |
| 3 — Vídeo (Bunny) | upload, signed URL, gate de acesso | **ALTO** |
| 4 — Billing (Stripe) | 2 prices, webhooks, portal, `temAcessoAtivo` | **ALTO** |
| 5 — Progresso + captura de evento | LessonProgress + conclusão de trilha + LessonEvent | baixo–médio |
| 6 — JilsonAI (v1 + suporte) | ver JILSONAI.md (Fases 0–3) + `recommendTrilha` | médio |
| 6.5 — Certificados | PDF a 100% (nome + competências) | baixo–médio |
| 7 — Launch | e-mails, LGPD, segurança, performance, founding-member | médio |

- **MVP = Fases 0 → 7.** **~70% do risco está nas Fases 3 (Bunny) e 4 (Stripe).**
- **Pós-MVP:** Analytics · JilsonAI Fase 4–6 (RAG + `buildLearningPlan` + memória) · cohorts ao
  vivo · **corporativo (Fase 12)**. **Removidos:** fórum de pares (JilsonAI absorve) e fase EN.

---

## Princípios de desenvolvimento

- **Modelo mais simples possível:** assinatura = cursos + JilsonAI + sempre atualizado. Sem
  gamificação, sem fórum.
- **Uma oferta clara.** Resistir a feature creep — simplicidade Apple.
- **AI no DNA** como filtro de decisão em cada feature.
- **Servidor é o único gateway** pra Supabase, Stripe, Bunny, Resend e Claude API. Nada de segredo no
  frontend.
- **Type-safe**, conteúdo gerido por admin onde possível.
- **Construído pra durar e pra um operador** — limpo, documentado, sustentável de rodar solo aos 47.
- **Acessibilidade é valor, não compromisso.** A base fica acessível; a receita escala pela esteira,
  nunca por subir a base.

---

## Princípio-guia

> Simples como a Apple, autoridade como o Mosh, **AI no DNA** como assinatura única —
> base acessível, ticket alto nos tiers de cima, AdSense de bônus, escalável pelo JilsonAI,
> sustentável aos 47. **A escola não ensina IA: a escola É IA.**

---

## Mapa de documentos (fonte da verdade)

- **PROJECT_DESCRIPTION.md** (este) — identidade, modelo, preço, estratégia, AI-no-DNA, roadmap.
- **JILSONAI.md** — arquitetura/roadmap do JilsonAI + Trilhas + Quotas & medidor.
- **IMPLEMENTATION-PLAN.md** — fases de build detalhadas (engenharia).
- **PROJECT-SCOPE.md** — escopo MVP vs pós-MVP.
- **CLAUDE.md / TECH-STACK.md** — convenções de repo + stack (engenharia).
- **DESIGN.md** — direção visual & design system (a reescrever: Apple-claro + #238FE8).
- **CONTENT.md** — copy da landing (PT-BR).
- **STRATEGY.md** (a criar) — concorrentes BR, voz, evergreen, ângulo corporativo. Depois disso,
  depreciar positioning.md / service_analysis.md / roadmap.md (antigos, modelo consultoria).

---

*Última atualização: Jun 2026 — REVISÃO MAIOR. Adicionado princípio-estrela "AI no DNA" + filtro de
decisão. Pricing travado (mensal R$99,90 sem fidelidade + anual ~R$995, sem trial, sem conteúdo
grátis, sem lock vitalício). Trilhas (curadas + personalizadas, combinação livre aula/curso,
certificado por competências). Comunidade = JilsonAI (fórum removido). Certificados no MVP.
JilsonAI: default modelo de ponta + quota + medidor de consumo visível + tiers como seams. EN
removido da escola. Udemy fora do escopo (projeto à parte). B2B/corporativo como horizonte (Tier 3,
Fase 12, seams prontos). Design travado (Apple-claro + azul #238FE8 da logomarca). Stack atualizada
(Vite, shadcn, Better Auth, pg-boss). Fase 0 concluída.*
