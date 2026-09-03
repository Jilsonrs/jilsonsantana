# JILSONAI.md — Arquitetura & Roadmap (era da IA, modular)

> Como o JilsonAI é construído: um **contrato estável** no centro, **capacidades que
> encaixam** em volta. Cada fase é uma versão mais potente — adita, nunca reescreve.
> Cresce com a escola: cursos, alunos e receita.
> Fonte de estratégia/produto: **PROJECT_DESCRIPTION.md** · Stack: **tech-stack.md** ·
> Convenções: **CLAUDE.md** · Build geral: **implementation-plan.md** (JilsonAI = Fase 6 lá;
> este doc detalha o roadmap INTERNO do JilsonAI).

---

## Tese

Conteúdo da era da IA numa escola medieval não faz sentido. O JilsonAI **é** a escola
da era da IA: a porta de entrada do suporte, do tira-dúvidas e da relação com o aluno.
Substitui o "fórum de pares" (que nem na Udemy funciona) por **suporte inteligente +
base de conhecimento viva**, com o Jilson como escalação rara.

---

## 9 princípios de arquitetura (atravessam todas as fases)

1. **Um gateway, nunca burlado.** Todo o app fala com a IA por UMA função:
   `askJilsonAI()`. Nada no app chama o SDK da Claude direto. (Mesmo papel que o
   `temAcessoAtivo()` tem pra acesso: fonte única da verdade.)
2. **Capacidades = providers plugáveis.** O contexto do prompt é montado por um
   **registro de Context Providers**. Nova capacidade = registrar um provider novo,
   nunca editar os antigos.
3. **Ferramentas = registro com escopo injetado no servidor.** Tools (consultar
   progresso, dados do certificado, etc.) entram num **registro**. O `userId`/escopo é
   SEMPRE injetado pelo servidor — nunca vem do modelo. Segurança por desenho.
4. **Modelo atrás de abstração — e MULTI-PROVEDOR** *(revisto Set 2026)*. `llm.complete()`
   encapsula a **AI SDK** (`ai` + `@ai-sdk/anthropic` + `@ai-sdk/google`), não mais um SDK
   único. O modelo é uma **string** resolvida em runtime (`"anthropic:claude-sonnet-5"`,
   `"google:gemini-…"`) via `createProviderRegistry` — é isto que permite **escolher a IA
   no admin, sem deploy**. Default segue Claude; Gemini entra como segunda opção.
   Trocar/atualizar modelo é config, não reescrita. Seam de prompt caching reservado aqui.
   **A AI SDK é implementação, nunca substituta:** `generateText`/`streamText` não saem
   deste arquivo — a Vercel também é fornecedor, e sair dela tem que custar um arquivo.
   **Seletor sem eval não existe:** ver princípio 5 e a Fase 3.
5. **Separar escrita de leitura.** Captura toda interação/feedback barato AGORA
   (`AiEvent`, event-sourced como `LessonEvent`); analytics e evals vêm depois como
   módulos de leitura. Não modificam a feature.
6. **Persona como dado versionado, não código.** A voz/método do Jilson vive num
   arquivo/registro versionado (`persona/jilson.md`), editável sem deploy.
7. **Custo e segurança como guarda-corpos desde a Fase 0.** Rate limit por membro,
   cota, limiar de confiança, e um seam de triagem (classificador) que nasce no-op e
   vira real. **Custo de API escala com receita** (membros pagantes), não à frente.
8. **O conhecimento compõe.** Resposta humana → vira item de base de conhecimento →
   vira resposta automática da IA. Carga humana cai, ativo de IA sobe.
9. **Degradação graciosa.** A escalação humana existe em TODAS as fases. Falha da IA
   nunca deixa o aluno na mão.

---

## O contrato estável (nasce na Fase 0 — nunca quebra)

### O gateway
```ts
askJilsonAI({ userId, message, courseId?, lessonId?, conversationId? })
  → { reply, confidence, sources[], escalated, conversationId }
```
Internamente, sempre nesta ordem:
`montar contexto (providers) → llm.complete(system, msgs, tools) → triagem de segurança
→ persistir → capturar AiEvent`. O resto do app só conhece esta assinatura.

### Os dois registros (o coração modular)
- `contextProviders: ContextProvider[]` — cada um `provide(ctx) → bloco de contexto`.
  Compostos em ordem. **Cada fase registra um provider novo.**
- `tools: AiTool[]` — cada um `{ name, schema, execute(args, { userId }) }`.
  **Cada fase registra uma tool nova.** Escopo injetado no servidor.

### Modelo de dados (nasce enxuto, com seams; tudo `public` → **RLS ENABLE no mesmo migration**)
- `AiConversation` (id, userId, courseId?, createdAt)
- `AiMessage` (id, conversationId, role, content, model?, tokensIn?, tokensOut?, confidence?, createdAt)
- `AiEvent` (id, userId, conversationId?, type[ASKED|RESOLVED_YES|RESOLVED_NO|ESCALATED|TOOL_CALLED], meta jsonb, createdAt) — captura barata, event-sourced
- `AiEscalation` (id, userId, conversationId, status[OPEN|ANSWERED|CLOSED], isPrivate, jilsonReply?, answeredAt?, promotedToKb default false, createdAt)

> `KbArticle`, `LessonChunk`, `AiMemory` nascem nas fases que os usam (4/5/6) — mas o
> `AiEscalation.promotedToKb` já existe desde a Fase 2 pra alimentar a base depois.

---

## Fases

> Convenção: cada fase só **adiciona** providers/tools/tabelas. Marca **gatilho de
> ativação** (quando faz sentido pelo tamanho da escola) e **depende de** (pré-requisito
> de build).

### Fase 0 — Fundação / definições técnicas  *(sem feature visível)*
- Gateway `askJilsonAI()` + os 2 registros (vazios) + `llm.complete()` wrapper.
- Tabelas `AiConversation`, `AiMessage`, `AiEvent`, `AiEscalation` (+ RLS) ; migration.
- Persona v1 em `persona/jilson.md` (voz/método).
  - **Regra anti-alucinação (na persona):** ao entregar DAX/SQL/Python, SEMPRE declarar as
    premissas estruturais assumidas (nomes/tipos de coluna, relações entre tabelas, granularidade)
    e recomendar teste isolado antes de usar em produção. Nunca apresentar código como verdade
    absoluta sobre um schema que o JilsonAI não viu. Protege a credibilidade técnica — uma fórmula
    errada dada com confiança queima a confiança rápido. (Custo zero: é texto na persona.)
- Guarda-corpos: rate-limit por membro, cota, **modelo default de ponta (Sonnet)** — Haiku só
  pra trivial/roteamento, Opus raro; seam de triagem (no-op), limiar de confiança (constante).
- **Depende de:** Auth (Fase 1 do plano geral). **Done when:** o gateway responde um
  "olá" com a persona, persiste e captura evento. *Nenhum aluno vê ainda.*

### Fase 1 — JilsonAI v1: chat com contexto do curso  *(LANÇAMENTO)*
- Painel de chat na área do membro (streaming). **Renderiza Markdown**: fórmula/código em
  bloco com **botão copiar**, passo a passo numerado, mini-tabela simples — decisão de render
  + 1 parágrafo de formato na persona, custo ~zero. (Ver seção "Respostas estruturadas".)
- Providers: `PersonaProvider` + `CourseContextProvider` (título/descrição/lista de
  aulas do curso atual no prompt — **ainda não** a transcrição).
- Botão de feedback: *"resolveu? [sim] / [não]"* → grava `AiEvent`.
- Rate-limit ativo. **Depende de:** Fase 0 + conteúdo (Fase 2 do plano geral).
- **Done when:** membros conversam e recebem respostas na voz do Jilson com contexto do
  curso; feedback capturado.

### Fase 2 — Escalação humana (modelo "tickets do Mosh")  *(LANÇAMENTO)*
- `AiEscalation` ativado: feedback=não OU confiança baixa → cria item na fila do Jilson.
- Inbox admin: Jilson vê a conversa inteira, responde **uma vez**; resposta volta ao
  aluno (**Resend inline, dentro de `try/catch` — não há fila no MVP**; ver CLAUDE.md →
  Background Jobs).
- **Seam-chave:** a resposta do Jilson é marcada como candidata a base de conhecimento
  (`promotedToKb` capturado agora, mesmo sem KB construída — separar escrita de leitura).
- **Seam (fast-follow, NÃO bloqueia launch): rascunho de resposta no admin.** Ao escalar, o
  JilsonAI gera um *draft* de resposta (1 chamada LLM extra) que o Jilson aprova/edita em 1 clique.
  Anti-burnout direto: acelera o loop resposta→KB (princípio 8). **A escalação da Fase 2 funciona
  100% sem o draft** (Jilson responde do zero) — o draft entra logo depois, sem reescrever. Não
  inflar a Fase 2 de lançamento com ele.
- **Done when:** dúvida não resolvida chega ao Jilson, ele responde, aluno recebe.

### Fase 3 — Mensagem privada + perguntas operacionais (tools com escopo)  *(LANÇAMENTO ou logo após)*
- Registro de tools ativado. Primeiras tools, **escopo só do aluno que pergunta**:
  `getMyProgress`, `getMyCertificateInfo` (nome, datas, carga horária), `getMyAccount`.
  Resolve sozinho o "qual nome sai no meu certificado?" — nem chega ao Jilson.
- **Mensagem privada ao professor:** AI-fronted; escala pra caixa **privada** (reusa a
  escalação da Fase 2 com `isPrivate=true`). Continua invisível pros outros alunos.
- **Depende de:** revisão de segurança (isolamento de dados entre alunos — subagente
  `security-vulnerability-reviewer`). **Done when:** operacional vira self-service; canal
  privado funciona; isolamento provado.

> **Fronteira do MVP de lançamento = Fases 0–3.** Daqui pra frente é aditivo pós-lançamento.

### Fase 4 — Base de conhecimento viva (RAG light + auto-alimentada)  *(pós-lançamento)*
- `KbArticle` (+ RLS) ; migration. Curada a partir das respostas de escalação da Fase 2
  (`promotedToKb`) + FAQ.
- `KbProvider` registrado: busca semântica na KB → injeta no contexto.
- **O loop fecha:** Jilson responde escalação → vira KB → IA responde sozinha na próxima
  → escalações encolhem. O ativo que compõe.
- **Gatilho:** volume de escalações repetidas (ex: >X/semana de temas recorrentes).
- **Decisão de build:** vetor via **pgvector no Neon** (sem infra nova, sustentável). `[FATO — Set
  2026: `vector` **0.8.6** disponível no projeto, ainda não instalada. Instalar é `CREATE EXTENSION`
  dentro da migration da Fase 4, com o `ENABLE ROW LEVEL SECURITY` da tabela nova no mesmo arquivo.]`
  Embeddings precisam de provider separado (Anthropic recomenda Voyage AI; alternativas:
  OpenAI/embeddings open-source) — **decisão da Fase 4, verificar no build**.
- **TRAVA — o EMBEDDING é o único travamento real de fornecedor do JilsonAI, e a AI SDK NÃO o
  resolve** *(Set 2026, junto da decisão multi-provedor)*. Vetor gerado por um provedor **não é
  lido** por outro: trocar significa **re-embedar a base inteira**. Não é limitação de API — é
  como embedding funciona, e por isso não tem solução de biblioteca. **O que torna administrável
  é uma linha de schema: gravar o MODELO e a DIMENSÃO junto de cada vetor** (aqui e no
  `LessonChunk` da Fase 5). Com isso a troca vira migração roteirizável — "re-embedar tudo que
  está no modelo X" — em vez de arqueologia sobre linhas de origem desconhecida. **Custo hoje:
  zero**, porque o model ainda não existe; custo se esquecido: descobrir depois quais linhas
  vieram de onde, sem ter como saber. **Sem gatilho — é física do formato.**
- **GATILHO DE VOLTA DA FILA (registrado em Ago 2026, quando o pg-boss saiu do MVP):** é **aqui**
  que a fila volta a fazer sentido — gerar embeddings da KB é **lote, demorado e retentável**, o
  caso de uso legítimo. É código que **ainda não existe**, então adicionar a fila nesta fase
  **não refatora nada**. Ver `CLAUDE.md` → Background Jobs.
- **Done when:** perguntas repetidas são respondidas pela KB sem chegar ao Jilson.

### Fase 5 — RAG sobre transcrições (contexto profundo do curso)  *(pós-lançamento)*
- `LessonChunk` (transcrição em pedaços + embedding + `startSec`) (+ RLS) ; migration.
  Fonte: legendas do Bunny ou transcrição.
  - **Auto-ingestão = decisão de build da Fase 5, NÃO antes.** O pipeline "upload Bunny → webhook →
    transcrição (Whisper/Groq/outro) → chunk → embedding" é seam **parqueado**. Adiciona fornecedor
    novo e é o **maior risco de prazo** do projeto. No lançamento `LessonChunk` nem existe. Não
    puxar pra frente sob nenhuma justificativa de "já que estou no Bunny".
  - **Este pipeline é o segundo caso legítimo da fila** (o outro é a KB da Fase 4): lote, demorado,
    retentável. No MVP não há fila — o chat das Fases 0–3 é **síncrono com streaming**, e enfileirar
    ali **pioraria o produto**. Ver `CLAUDE.md` → Background Jobs.
- `TranscriptProvider` registrado: recupera trechos relevantes → IA responde **fundada no
  conteúdo real**, citando "na aula X, min Y". **A citação vira deep-link:** clique abre o
  player da aula no `startSec` do chunk — o `sources[]` do contrato já carrega isso. [FATO —
  docs Bunny (docs.bunny.net/stream/embedding), verificado jul/2026: embed/direct-play aceita
  start time via `?t=` (ex. `?t=30s`); Playback Control API (Player.js) tem `setCurrentTime()`
  pra seek na própria página. Confirmar sintaxe no build da Fase 5.]
- **Depende de:** vídeo (Fase 3 do plano geral) + Fase 4 (infra de vetor).
- **Gatilho:** catálogo com profundidade suficiente pra justificar (vários cursos/aulas).
- **Done when:** JilsonAI responde a partir do vídeo, com citação/timestamp.

### Fase 6 — Memória + proatividade (camada de relação)  *(pós-lançamento)*
- `AiMemory` (resumo por aluno: onde travou, onde está) (+ RLS), atualizado async **pela fila que
  nasce na Fase 4** (ver o gatilho de volta ali) — não presumir fila antes disso.
- Proativo: *"você travou em DAX semana passada — saiu aula nova sobre isso"* →
  **vira motor de winback/retenção** (conecta direto com a estratégia de churn).
- **Gatilho:** foco em retenção (quando aquisição estabiliza e LTV vira a alavanca).
- **Done when:** o JilsonAI lembra contexto entre sessões e reengaja proativamente.

### Fase 7 — Analytics + auto-melhoria (lado de leitura)  *(pós-lançamento)*
- Leitura sobre `AiEvent`: temas que mais geram escalação (**= lacunas de conteúdo =
  ideias de curso/vídeo**), confiança média, taxa de deflexão (resolvido sem humano),
  custo por membro.
- **Harness de eval:** reexecuta escalações antigas contra novo prompt/modelo pra validar
  melhoria **antes** de subir. Versionar persona/modelo com segurança.
- **Gatilho:** custo de API material OU necessidade de decidir conteúdo por dado.
- **Done when:** Jilson vê onde os alunos travam (alimenta conteúdo) e atualiza a IA com rede de segurança.

### Fase 8+ — Agentes especializados / escala  *(futuro distante)*
- Sub-agentes atrás do mesmo gateway ("tutor de DAX", "tutor de Python"): roteamento por
  tema, cada um com providers/tools próprios — sem tocar o gateway.
- Contexto corporativo (org-scoped) — casa com Corporate/B2B (Fase 12 do plano geral).
- Reservado: voz, EN (caminho LinkedIn). Tudo encaixa nos mesmos registros.

---

## Trilhas: currículo curado + personalizado (o "Career Plan" da era da IA)

### A tese
O melhor mecanismo do mercado é o "Career Plan" da LinkedIn: aluno declara o objetivo →
IA monta um plano nomeado → salva → edita → conclui → certifica. Adotamos o mecanismo, mas
a IA da LinkedIn é **bibliotecária** (empilha cursos inteiros, genéricos, sem voz, e abandona).
O JilsonAI é **mentor**: monta um currículo cirúrgico no método do Jilson, com granularidade
de aula, e acompanha o aluno até o certificado.

### Dois tipos de trilha (coexistem)
- **Curada** (Jilson cria à mão): poucas, prontas, ponto de partida pro aluno que ainda nem
  se matriculou. No lançamento, **o Jilson É a "IA v0"** — ele monta os planos-modelo.
- **Personalizada** (JilsonAI monta): aluno descreve o objetivo, o JilsonAI analisa o catálogo
  + o nível do aluno e monta um plano sob medida. Fase 4–5.

### O fluxo (validado na referência LinkedIn, indo além)
1. Aluno declara o objetivo em linguagem natural ("BI Analyst, empresa americana, part-time").
2. JilsonAI analisa: catálogo disponível + perfil/nível do aluno.
3. Gera um **plano nomeado**, agrupado por competência (Plano → Módulos → itens).
4. **Itens = qualquer combinação livre:** só aulas, só cursos, ou um mix — a unidade mínima é
   a **aula**. (Ex.: 2 cursos de Excel inteiros + 3 aulas de engenharia de prompt; ou só aulas;
   ou só cursos. Qualquer combinação.)
5. Aluno **salva** → vira a trilha dele (entidade persistida, com progresso próprio).
6. **Editável:** add/remove cursos, aulas, módulos.
7. Progresso conta **por aula**.
8. **Certificado só emite com 100% concluído.** Nome = nome do plano; lista as **competências
   cobertas**.

### 3 saltos sobre a LinkedIn (o "ir além")
1. **Granularidade de aula** — o plano mistura curso inteiro + aula avulsa, em qualquer
   combinação. Nada de "assista 2h pra pegar os 10 min que importam".
2. **Adapta ao nível** — pula o que o aluno já domina ("você já manda em Excel, começo seu
   plano no Power BI"). A LinkedIn lista tudo, mesmo o que você já sabe.
3. **Certificado por competências** — lista as skills cobertas, não só um nome. Vira documento
   pro RH (forte pro aluno que mira emprego em empresa americana).

### Implicações de dados (seams — aditivo, não reescreve)
- `LearningPlan` (trilha): `id`, `name`, `ownerUserId?` (null = template curado), `isTemplate`,
  `skillsCovered[]` (snapshot p/ certificado), `createdAt`. **Curada e personalizada são a MESMA
  entidade** — só muda quem criou.
- `PlanModule` (agrupamento por competência): `id`, `planId`, `title`, `order`.
- `PlanItem`: `id`, `moduleId`, `order`, `itemType[COURSE|LESSON]`, `courseId?`/`lessonId?` —
  é isto que dá a **combinação livre** (curso inteiro OU aula avulsa).
- Progresso: reaproveita `LessonProgress` (Fase 5 do plano geral) — a aula é a unidade;
  concluir um item-curso = concluir suas aulas.
- Certificado: emite quando todos os `PlanItem` (→ todas as aulas) estão completos; o PDF
  carrega `name` + `skillsCovered`.

### Fases (encaixa nos 2 registros, sem reescrever)
- **Lançamento:** trilhas **curadas** salváveis + editáveis + certificado por 100%. JilsonAI
  **sugere qual trilha curada** pelo objetivo (regra simples — tool `recommendTrilha`, Fase 3).
  Aula como first-class pesquisável.
- **Fase 4–5:** JilsonAI **monta plano personalizado** (precisa raciocinar sobre o catálogo =
  RAG/análise — tool `buildLearningPlan`). Granularidade de aula + adaptação de nível +
  certificado por competências amadurecem aqui.
- Cada salto vira **marco de marketing** ("agora a IA monta seu currículo único").

### Decisões de produto (resolvidas via referência LinkedIn)
- **Quem nomeia:** a IA sugere, o aluno aceita ao salvar. ✅
- **Editável:** sim (add/remove cursos, aulas, módulos). ✅
- **Mínimo pra certificar:** 100% dos itens concluídos. ✅
- **Em aberto:** como derivar as "competências" que entram no certificado (das tags das aulas?)
  — Fase 4–5.

---

## Mapa de seams (o que nasce dormente e quando acorda)

| Seam | Nasce | Acorda |
|------|-------|--------|
| `contextProviders[]` | Fase 0 (vazio) | 1 (curso), 4 (KB), 5 (transcrição), 6 (memória) |
| `tools[]` | Fase 0 (vazio) | 3 (operacional + `recommendTrilha`), 5 (`buildLearningPlan`), 8 (especializadas) |
| `LearningPlan` / `PlanItem` (trilhas) | Lançamento (curadas) | 4–5 (montagem por IA) |
| `AiEscalation.promotedToKb` | Fase 2 | 4 (vira KB) |
| Abstração de modelo + caching | Fase 0 | a cada upgrade (config) |
| Seam de triagem (classificador) | Fase 0 (no-op) | quando houver conteúdo público a triar |
| `AiEvent` (captura) | Fase 0 | 7 (analytics/eval) |
| Respostas estruturadas (answer components) | Fase 1 (render Markdown + persona) | v2 pós-launch (blocos tipados) · 5 (deep-link no player) |

---

## Custo: escala com a receita (não à frente)

> **Custo reconferido (set/2026) — o orçamento MELHOROU:** Haiku 4.5 $1/$5 · **Sonnet 5 $2/$10**
> · Opus 5 $5/$25 por Mtok. O número antigo aqui era Sonnet 4.6 a $3/$15; a geração nova é
> **~⅓ mais barata na entrada** e a estimativa abaixo passa a ser **conservadora**, não otimista.
> *(Preço de fornecedor envelhece sozinho — reconferir ao abrir a Fase 6, nunca copiar daqui.)*
> cache de prompt corta 90% da entrada cacheada. Estimativa por interação no Sonnet c/ cache:
> ~R$0,10–0,20. Por aluno/mês: ~R$5–9 (leve, 50 int) a ~R$25–45 (heavy, 250 int) — confortável
> dentro de R$99,90. **Custo não é risco existencial; o risco é a cauda (heavy/abusivo), que a
> quota + rate-limit limitam.**

- Default **modelo de ponta (Sonnet)** pra qualidade — decisão de produto: *a IA é sempre
  inteligente*. Haiku só pra trivial (saudação, operacional); Opus raro pra caso difícil. Modelo
  atrás de abstração → trocar é config.
- **Prompt caching** na persona + contexto repetido (seam na Fase 0) — derruba o custo da entrada.
- Rate-limit + cota por membro → teto de custo previsível por aluno; mata a cauda abusiva.
- RAG (Fase 4/5) reduz tokens enviados (recupera só o trecho certo, não o curso todo).
- Resultado: o gasto de API cresce junto com **membros pagantes** — sustentável pra solo.

---

## Quotas & tiers de uso (in-plan + upgrades) — o medidor visível

> Sua intuição "tipo game / in-app purchase": a assinatura inclui uma quota generosa de uso do
> JilsonAI; quem quer mais compra avulso ou sobe de tier. O JilsonAI **não pode virar um
> ChatGPT/Gemini/Claude grátis** — o medidor existe pra ancorar que é um produto premium com
> custo real, e tornar o upsell natural (não ganância).

**Lançamento (simples — 1 plano, 1 quota):**
- O plano R$99,90 inclui uma **quota generosa** de interações/mês (ex.: 100–150 ou "uso justo").
- **Medidor de consumo visível** na UI do chat — clima Apple: calmo e positivo ("uso do mês"),
  **nunca** countdown ansioso. O aluno vê que há limite e que dá pra ter mais.
- **Onboarding aberto e livre (TRAVA dura):** trilhas e cursos à mostra, o aluno clica e assiste o
  que quiser. Um **modal de boas-vindas** do JilsonAI pode perguntar o objetivo e acionar
  `recommendTrilha` — mas é **convite dispensável**: dismiss óbvio, fecha e a navegação livre está
  intacta por trás. Nunca é gate, nunca bloqueia, nunca é pré-requisito pra ver conteúdo.
  `recommendTrilha` é ajuda opcional. (O nome "Zero-UI" da revisão externa vende demais — na
  prática é um nudge de primeiro acesso, não um fluxo obrigatório.) Ordem das seções na home =
  decisão de construção.

**Pós-lançamento (seams — ligar quando o DADO justificar):**
- **Pacote avulso** (destrava +N interações no mês corrente) — Stripe one-time.
- **Tier JilsonAI+ / Mentor** (quota maior + prioridade na fila de escalação humana) — 2ª price
  no mesmo produto, ou produto add-on. Sem reescrever: modelo já atrás de abstração; quota já é
  guarda-corpo da Fase 0.

**Princípio-chave — quota definida por DADO, não por chute:** a tabela `AiEvent` (Fase 0) captura
cada interação exatamente pra isto. Lança folgado, observa o consumo real (p90 dos alunos) por
1–2 meses, e **só então** calibra a quota e desenha os tiers. (Separar escrita de leitura pagando
em dinheiro.)

---

## De tutor de curso a ferramenta de trabalho (posicionamento — pós-MVP)

[FATO] Slack e Notion venceram se instalando no **fluxo de trabalho** — produto de uso diário não
se cancela. [INFER] Curso tem churn estrutural porque curso **acaba**; ferramenta não acaba. No dia
em que o aluno cola a fórmula quebrada / o erro de DAX / o recorte da planilha **real do trabalho
dele** e o JilsonAI resolve, a assinatura muda de categoria mental: de "curso que estou fazendo"
pra "ferramenta que eu uso" — e o churn muda de natureza.

- **Nada de feature nova:** a mecânica básica (aluno cola o problema real no chat, como texto) já
  funciona desde a v1 (Fase 1). A regra anti-alucinação da persona (Fase 0 — declarar premissas do
  schema) protege exatamente este caso. RAG/transcrição (Fase 5) aprofunda depois.
- **O que muda é copy + medição:**
  - **Copy (ativar pós-launch, quando a v1 estiver estável):** convite explícito — *"traga a SUA
    planilha / o SEU erro"* — no painel do chat e no Pilar 2. Não prometer upload/análise de
    arquivo (não existe); é colar texto/fórmula/erro, que já funciona.
  - **Métrica (Fase 7, sobre `AiEvent`):** % de conversas sobre **problema real de trabalho** vs.
    conteúdo de aula (classificação via seam de triagem já previsto, ou análise offline — sem infra
    nova). Fração crescendo = LTV mudando de liga; e alimenta ideias de conteúdo (lacuna real dos
    alunos). KPI espelhado em STRATEGY.md §6.
- ⚠️ Anti-burnout / anti-escopo: isto é **posicionamento e uma métrica**, não fase nova. Nenhuma
  mudança no roadmap (MVP segue Fases 0–3). Não puxar upload de arquivo/parsing pra frente por
  causa disso.

---

## Respostas estruturadas ("answer components") — render no lançamento, componentes na v2

> Gatilho (jul/2026): lançamento do Monogram (Eren Bali, ex-Udemy; seed US$40M, DST+Lux)
> cristalizou a tese "IA merece interface melhor que parede de texto". [INFER] Num app
> horizontal isso exige gerar UI na hora; num tutor vertical, o mesmo princípio vira
> **templates de resposta** — barato, e exatamente o que operador solo constrói. Não muda o
> fosso (contexto + voz + método — STRATEGY.md); é polimento de experiência sobre o que já existe.

**Lançamento (custo ~zero — decisão de render, não feature):**
- O painel de chat (Fase 1) **renderiza Markdown**: fórmula/código em **bloco com botão
  copiar**, **passo a passo numerado** como lista (não texto corrido), **mini-tabela** com os
  dados do exemplo quando ajudar (grounding visual).
- A persona (Fase 0) ganha **1 parágrafo de formato**: resposta técnica estruturada assim,
  casando com a regra anti-alucinação — premissas declaradas junto do bloco de fórmula.

**v2 (pós-launch, v1 estável — junto/depois da Fase 4):**
- Blocos **tipados** além do Markdown: `formula` / `table` / `steps` via saída estruturada da
  API → componentes React. [INFER] Aditivo no contrato: `reply` continua string; blocos entram
  como campo opcional (`blocks?`) — o gateway não quebra.
- **Deep-link pro minuto da aula (o mais diferenciador):** a citação da Fase 5 vira link
  clicável que abre o player no `startSec` do chunk (detalhe e verificação do Bunny na própria
  Fase 5). Nenhum assistente genérico tem isso — é o conteúdo do Jilson virando **navegação**.

⚠️ Anti-burnout / anti-escopo: **nenhuma fase nova; roadmap inalterado (MVP = Fases 0–3).** No
lançamento entra só o render de Markdown + parágrafo na persona. Blocos tipados e deep-link são
seams v2 — construir quando houver aluno usando, não antes.

---

## Marca & propriedade intelectual (INPI + dados de alunos)

> O que proteger, como registrar sem risco de indeferimento, e por que a evolução do
> JilsonAI (trocar modelo, absorver padrões do mercado) **não depende de nada disso**.
> Nada aqui é aconselhamento jurídico; itens [CONTADOR]/[ADVOGADO] exigem confirmação
> profissional — o resto é executável DIY pelo e-INPI.
> Referência canônica de procedimento: **Manual de Marcas do INPI** (ed. atualizada em
> 23/jun/2026, verificada) — consultar a versão vigente no portal do INPI antes de
> protocolar; este resumo não substitui o manual.

### Modelo mental — o que cada camada protege

| Camada | Protege | Instrumento | Custo |
|---|---|---|---|
| **Nome** ("Jilson Santana", "JilsonAI") | O identificador no mercado | Registro de **marca** no INPI | R$440/classe (único, cobre 10 anos) |
| **Código** | O código-fonte | Direito autoral (automático); registro de programa no INPI é opcional | R$0 |
| **Persona / prompts / método** | `persona/jilson.md`, calibração, golden set | **Segredo de negócio** — manter fora de repo público | R$0 |
| **Conteúdo** (aulas, vídeos, materiais) | As obras em si | Direito autoral (automático) | R$0 |
| **A "ideia"** (tutor IA do professor) | **Nada.** Ideia não é registrável — nem por Jilson, nem contra Jilson | — | — |

[FATO] Consequências práticas:
- Ninguém pode "registrar a ideia" do JilsonAI e bloquear o produto. Ideias não têm
  proteção (Lei 9.610/98, art. 8º); software **em si** não é patenteável no Brasil
  (Lei 9.279/96 — LPI, art. 10, V).
- A marca protege o **nome**, não a tecnologia. Trocar Claude por outro modelo, adotar
  padrões do mercado (RAG, tiers, medidor) ou ser copiado em features: **irrelevante
  para a marca**. Ela continua válida e ninguém a usa contra a evolução do produto.
- O pedido de marca **não descreve o produto**. Só contém: nome + classe + itens de uma
  lista pré-aprovada do INPI. Não existe campo pra "explicar a ideia" — logo não há o
  que copiarem do pedido.
- O risco real é outro: Brasil é **first-to-file** (em regra, quem registra primeiro
  leva). Site + YouTube PT tornando os nomes públicos = registrar **antes/junto** do
  lançamento.

### Decisões de registro

| Marca | Apresentação | Classe | Quando |
|---|---|---|---|
| JILSONAI | Nominativa | 41 (educação) | Agora (pré-lançamento) |
| JILSON SANTANA com "#" | Mista, **em P&B** | 41 | Agora, junto do JILSONAI (arte definitiva confirmada 08/jul) |
| JILSONAI | Nominativa | 42 (SaaS / software não baixável) | Na migração MEI→ME [CONTADOR] |

[INFER] Racional:
- [DECIDIDO jul/2026, rev. 2] **JILSON SANTANA fica só na mista** — a nominativa limpa
  saiu do plano. O que segura o nome: o elemento nominativo da mista pesa no exame de
  colidência (protocolada, bloqueia "JILSON SANTANA" e variações confundíveis na 41) +
  nome civil contra não-homônimos (art. 124, XV). Trade-off consciente: (a) **janela
  sem registro do nome** até o protocolo da mista — ver Decisão em aberto 7; (b) **o
  "#" vira permanente**: a prova de uso da mista exige o conjunto sem alteração
  essencial do elemento figurativo — se um dia o visual for abandonado, registrar o
  substituto ANTES de trocar o uso, nunca depois.
- [FATO — Manual] **Protocolar a mista em preto e branco (sem reivindicar cores):**
  imagem colorida no depósito = reivindicação de cores incorporada ao registro, e a
  prova de uso passa a exigir a marca NAS cores registradas (só variação de saturação
  é tolerada). Marca em P&B/escala de cinza comprova uso **em quaisquer cores**. P&B
  congela a forma (# + fonte + arranjo) e libera a paleta — cobre o # azul de hoje e
  recolors futuras. Limite: mista de um nome NÃO cobre o outro ("#Jilson Santana" ≠
  "#JilsonAI"); o design system é reaproveitável, o registro não.
- [FATO — Manual] **Specs da imagem no e-Marcas:** arquivo **JPG**, mínimo
  **945×945 px** (8×8 cm), máximo 2 MB, padrão RGB, imagem única (sem variações da
  marca no mesmo arquivo), nítida o bastante pra identificar figura e texto. ⚠️ Print
  do site (436×152 px) NÃO serve — **exportar da arte original** do logo, em escala de
  cinza, fundo branco, salva como JPG. Elemento nominativo no formulário: espelhar o
  que se lê na imagem (divergências o exame formal corrige de ofício com base na
  imagem).
- **Disciplina de uso (consequência de ficar só na mista):** site escrito em texto
  HTML não é uso da marca registrada — a prova de uso é do **conjunto estilizado**.
  Regra prática: o logo real aparece visível e continuamente (header/footer do site
  como imagem, banner do YouTube, thumbnails, certificados, materiais) e prints
  datados disso entram no dossiê de provas de uso.
- [ATUALIZADO 08/jul/2026] **JilsonAI tem logo definido** ("Jilson" estilizado preto +
  "AI" azul, **sem "#"**) — substitui a direção anterior "sem logo/estilo iCloud". O
  logo é MISTA por definição (letras fantasiosas + cor), mas **não muda o plano**: a
  nominativa JILSONAI (protocolo agora) protege a palavra em qualquer visual → logo em
  uso no dia 1 sem registro próprio (arte com direito autoral automático). Mista
  JilsonAI = reforço **opcional**, avaliar junto do protocolo da classe 42 (pós-ME),
  em P&B. Por que a nominativa é a âncora aqui (diferente do caso Jilson Santana):
  produto vive como TEXTO em todo lugar (chat, docs, marketing, futuro SaaS), a classe
  42 será nominativa, "AI" é elemento fraco — o ativo é a palavra inteira — e não há a
  camada plena do nome civil. Arte original em alta (2000×577) recebida; base pronta
  pro JPG 945×945 se/quando registrar.
- [FATO — Manual] **Por que o "#" não entra como texto puro:** o wordmark
  "#Jilson Santana" (símbolo com tratamento gráfico) é, por definição do Manual, marca
  **mista** — nominativa não carrega cor nem forma, e havendo divergência "sempre
  prevalece o que consta na imagem". "#" como caractere de texto não agregaria nada:
  símbolo de uso comum, inapropriável, sem previsão expressa sobre hashtag no manual
  (risco formal desnecessário). Terceiros usando "#" + nome confundível colidem com a
  mista do mesmo jeito (art. 124, XIX).
- **Titular = o CNPJ** (mantido na migração MEI→ME; sem transferência depois).
- **Classe 42 espera o desenquadramento**: [FATO] o exame substantivo verifica se os
  serviços reivindicados são compatíveis com a atividade **declarada no depósito** (LPI,
  art. 128, §1º) — incompatibilidade gera exigência/indeferimento, e declaração falsa é
  causa de **nulidade** do registro (Manual, seção 5.5.1). [INFER] CNAE típico de
  MEI-instrutor não cobre SaaS/licenciamento de software — confirmar CNAE atual com o
  contador, junto do item Anexo III vs V. Proteção interina do JILSONAI: registro na
  41 + afinidade de segmento + uso anterior comprovado + nome civil no composto.
- Nome civil (Manual de Marcas/INPI, ed. jun/2026, seção 5.11.14):
  - [FATO] **MEI dispensa autorização** para registrar o próprio nome como marca — o
    INPI equipara MEI/empresário individual ao titular do direito de personalidade.
    Registrar agora, como MEI, = zero papelada extra.
  - [FATO] ⚠️ **Armadilha pós-migração:** se o ME virar **SLU** (sociedade limitada
    unipessoal, sucessora natural do MEI), o INPI **exige autorização expressa** do
    detentor do nome **mesmo sendo o próprio dono** — anexar declaração assinada
    autorizando o *registro* (não só o "uso") em todo pedido novo contendo
    "Jilson"/"Santana" (inclui o JILSONAI classe 42). Esquecer = exigência de 60 dias.
  - [FATO] Contra terceiros não homônimos, art. 124, XV protege o nome. **Mas entre
    homônimos vale first-to-file**: outro Jilson Santana real que deposite primeiro
    leva, e pedidos posteriores com nome idêntico/semelhante são indeferidos (art. 124,
    XIX). Mais um motivo pra registrar antes do lançamento.
- [FATO] Exclusividade é sobre o **conjunto**: elementos individualmente fracos
  ("AI", "Santana") compõem marca registrável quando o todo é distintivo — e ninguém
  (nem Jilson, nem terceiros) monopoliza "AI" isolado. Outras marcas "-AI" não bloqueiam
  o JILSONAI, e vice-versa.

### Como protocolar (anti-indeferimento, DIY)

1. **Busca prévia** (grátis, busca.inpi.gov.br): "Jilson Santana", "JilsonAI", "Jilson"
   nas classes 9/41/42, incluindo grafias e fonéticas próximas. Só se aparecer colisão
   séria vale considerar assessoria.
2. **Cadastro e-INPI** (login gov.br) com o CNPJ — o sistema puxa porte/CNAE da Receita
   e aplica o desconto de 50% automaticamente. Conferir o enquadramento ANTES de emitir
   a GRU: pago errado, não reembolsa.
3. **Emitir e pagar a GRU**: pedido com **especificação pré-aprovada** (cód. 389).
4. **Protocolar no e-Marcas**:
   - Apresentação: **nominativa** (JILSONAI); **mista** pro wordmark "#Jilson Santana"
     — anexar a imagem **em P&B** (imagem colorida = cores incorporadas ao registro).
   - Especificação: **sempre pré-aprovada** (checkboxes da lista do INPI) — metade do
     preço e menos exigência. **Nunca** livre preenchimento (custa o dobro e aumenta
     risco de exigência).
   - Classe 41: itens do tipo "educação", "ensino", "cursos on-line", "treinamento em
     informática".
   - Classe 42 (futuro): "software como serviço (SaaS)", "fornecimento de software não
     baixável".
   - **Não inventar descrição de funcionamento** — não existe campo pra isso; é assim
     que se evita tanto o indeferimento quanto o medo de "copiarem do pedido".
5. **Acompanhar a RPI** (sai às terças): lembrete **quinzenal** no calendário. Prazos de
   exigência e oposição = 60 dias; perder prazo = arquivamento, sem reembolso.

### Custos e prazos (tabela vigente desde set/2025 — conferir GRU na hora)
- Pedido pré-aprovada com desconto (MEI/ME/EPP/PF): **R$440/classe, pagamento único** —
  já inclui concessão + primeiros 10 anos (a taxa de concessão separada foi zerada na
  reforma de 2025).
- Plano revisto: JILSONAI nominativa agora = **R$440**; mista "#Jilson Santana" =
  +R$440 (timing: Decisão 7); classe 42 depois = +R$440. Total: **R$1.320**.
- Tramitação típica: ~12–24 meses sem oposição. **Uso do nome segue livre durante o
  trâmite** — nada trava o lançamento.
- Validade: 10 anos, prorrogável indefinidamente (prorrogação ~R$500 com desconto na
  tabela atual — conferir na época). [FATO] Pedido de prorrogação: **durante o último
  ano de vigência** (janela extraordinária de 6 meses depois, com taxa maior). Ao
  receber a concessão: **criar lembrete de calendário pro 9º ano** na hora.
- **Uso obrigatório**: [FATO] o uso deve **iniciar em até 5 anos da concessão** e não
  pode ficar interrompido por 5 anos consecutivos, senão terceiro com legítimo
  interesse pode pedir caducidade (LPI, art. 143). JILSONAI/42 ok se o ângulo
  "ferramenta" existir dentro da janela — mais um motivo pra não registrar classes
  especulativas demais.

### Se alguém registrar antes (defesas — improvável registrando já)
- [FATO] Direito de precedência (LPI, art. 129, §1º), como o INPI de fato aplica
  (Manual, seção sobre pré-uso): exige **(a)** oposição dentro dos 60 dias da RPI,
  **(b)** prova de uso **contínuo** há 6+ meses antes do depósito alheio, com
  **documentos emitidos/publicados nos 5 anos anteriores** àquele depósito, e **(c)**
  ter protocolado o **próprio pedido** de registro. Detalhe duro: se os dois lados
  provarem pré-uso, **ganha quem depositou primeiro**, não quem usa há mais tempo.
  Conclusão: precedência é rede de segurança cara e frágil — registrar é mais barato
  que litigar.
- Guardar **provas de uso datadas**: prints do site, vídeos publicados, notas, commits.
  (O repo Git já é carimbo de data natural do "JilsonAI".)

### Branding × Claude/Anthropic
- Pode dizer "powered by Claude" de forma descritiva; **não** usar "Claude" no nome de
  produto/marca nem sugerir endosso da Anthropic. "JilsonAI" está limpo nesse aspecto.

### Dados de alunos → evolução estilo vidIQ [ESPECULAÇÃO — fora de escopo]
- [ESPECULAÇÃO] Se um dia o JilsonAI virar produto standalone alimentado por dados do
  usuário (como o vidIQ ingere dados de canal), vira tema LGPD sério: consentimento
  específico, finalidade declarada, retenção/exclusão, anonimização antes de qualquer
  uso pra melhoria. [ADVOGADO antes de lançar esse modo]
- **Semente barata AGORA (única ação):** Termos de Uso + Política de Privacidade do
  lançamento já prevendo, em linguagem clara, uso de interações com o JilsonAI de forma
  **anonimizada/agregada** para melhorar o serviço. Legitima o pipeline `AiEvent` → KB
  (Fase 4) e evita retrofit jurídico.
- ⚠️ Anti-escopo: nenhuma decisão de arquitetura muda por causa disso. `AiEvent` já
  captura o necessário; o resto espera dado + receita.

---

## Decisões em aberto (resolver no build de cada fase)

1. **Provider de embeddings** (Fase 4): Voyage AI (recomendado pela Anthropic) vs OpenAI
   vs open-source. Verificar no build.
2. **Quanto entra no lançamento:** proposta = Fases 0–3. Puxar RAG (4/5) pro MVP é o
   principal risco de prazo/energia (rouba das fases Bunny/Stripe que não podem falhar).
3. **Pilar na landing (RESOLVIDO):** "Comunidade" como fórum de pares **saiu**. O JilsonAI
   absorve suporte + base viva; anúncios cobrem o "um-pra-todos". Os 3 pilares são **Cursos ·
   JilsonAI · Sempre à frente da curva**. (Ver content.md.)
4. **Limiar de confiança** pra auto-escalar: começar conservador (escala mais), afrouxar
   conforme a KB amadurece.
5. **Valor exato da quota inicial + preço dos tiers:** definir por dado real de `AiEvent`
   pós-lançamento, não no papel. Founding member **sem lock de preço vitalício**.
6. **Timing da classe 42 (JILSONAI):** registrar já como MEI (CNAE provavelmente não
   bate — frágil) vs. na migração pra ME (recomendado). Confirmar com o contador junto
   do item Anexo III vs V. (Ver seção "Marca & propriedade intelectual".)
7. **Timing da mista "#Jilson Santana" (RESOLVIDO 08/jul/2026):** protocolar JÁ, junto
   do JILSONAI — arte definitiva confirmada (logo estilizado empilhado "#Jilson" +
   "Santana"; o texto do site era só HTML, não a marca). Janela sem registro do nome:
   fechada. R$880 na mesma sessão de protocolo.

---

*Criado: Jun 2026 — roadmap interno do JilsonAI. Modular, aditivo, não-quebra. MVP de
lançamento = Fases 0–3 (chat + escalação + operacional/privado). Fases 4+ pós-lançamento,
todas encaixando nos mesmos 2 registros (context providers + tools) sem reescrita.*
*Atualizado: Jun 2026 — adicionada seção "Trilhas: currículo curado + personalizado" (Career
Plan da era da IA): curadas no lançamento, montagem por IA na Fase 4–5, itens em combinação
livre (aulas/cursos/mix), certificado por competências, plano salvável/editável/100% pra
certificar. Comunidade-como-fórum removida (JilsonAI + anúncios absorvem) — pilares = Cursos ·
JilsonAI · Sempre à frente.*
*Atualizado: Jun 2026 (2) — default = modelo de ponta (Sonnet), não Haiku (a IA é sempre
inteligente; Haiku só trivial, Opus raro). Preços de API confirmados + estimativa de custo por
aluno. Nova seção "Quotas & tiers de uso": medidor de consumo visível (clima Apple, calmo),
onboarding aberto/livre (recommendTrilha = ajuda opcional, não portão), quota generosa calibrada
por dado (AiEvent), tiers (avulso + JilsonAI+) como seams pós-launch. Founding member sem lock
de preço vitalício.*
*Atualizado: Jun 2026 (rev. externa Gemini) — (Fase 0) regra anti-alucinação na persona ao
entregar código; (Fase 2) draft de resposta no admin como seam fast-follow que não bloqueia
launch; (onboarding) trava dura reforçada — modal dispensável, nunca portão; (Fase 5) auto-ingestão
de LessonChunks anotada como seam parqueado (não construir; não puxar RAG pra frente).*
*Atualizado: Jul 2026 — nova seção "De tutor de curso a ferramenta de trabalho" (playbook
big-tech→solo, ver STRATEGY.md): posicionamento pós-MVP (convite "traga a sua planilha" na copy
quando a v1 estabilizar; sem prometer upload) + métrica na Fase 7 (% conversas problema-real vs.
aula, via seam de triagem/offline). Zero feature nova; roadmap inalterado (MVP = Fases 0–3).*
*Atualizado: Jul 2026 (2) — nova seção "Marca & propriedade intelectual": registrar JILSON
SANTANA (41) + JILSONAI (41) agora, nominativas com especificação pré-aprovada (R$440/classe,
pagamento único pós-reforma set/2025); JILSONAI na 42 espera migração MEI→ME (e-Marcas cruza
CNPJ×classe — checkpoint contador). Chave conceitual: marca protege NOME, não ideia/tecnologia —
evolução do JilsonAI (trocar modelo, absorver padrões) segue 100% livre; pedido de marca não
descreve o produto, logo nada a "copiar do pedido". Persona/prompts = segredo de negócio (fora de
repo público). Semente LGPD: ToS do lançamento já prevê uso anonimizado/agregado de interações
pra melhorar o serviço (visão vidIQ = especulação, fora de escopo).*
*Atualizado: Jul 2026 (3) — seção de marca verificada contra o Manual de Marcas do INPI (ed.
23/jun/2026): (1) MEI dispensa autorização pro próprio nome — registrar agora = zero papelada;
(2) armadilha SLU pós-migração: autorização expressa do próprio dono obrigatória em pedidos com
"Jilson"/"Santana" (vale pro JILSONAI/42); (3) entre homônimos vale first-to-file (art. 124, XIX);
(4) precedência operacionalizada: oposição em 60d + uso contínuo 6m + provas dos últimos 5 anos +
pedido próprio protocolado — empate de pré-uso favorece quem depositou primeiro; (5) caducidade:
uso deve iniciar em até 5 anos da concessão; (6) prorrogação no último ano de vigência (lembrete
no 9º ano); (7) exclusividade é sobre o conjunto — "AI" isolado livre pra todos. Tema FECHADO:
próxima ação = busca prévia + 2 protocolos (R$880).*
*Atualizado: Jul 2026 (4) — [DECIDIDO] logo do JilsonAI: não existe e não bloqueia nada. Só
nominativas agora; registro misto (logo) avaliado apenas junto do protocolo da classe 42
(pós-ME), e só se o logo estiver estável. Nominativa já cobre o nome em qualquer forma visual;
arte tem direito autoral automático; mista de logo instável = retrabalho pago.*
*Atualizado: Jul 2026 (5) — mista "#Jilson Santana" ENTRA no plano, desacoplada da classe 42:
protocolar no congelamento do wordmark (DESIGN.md fechado/lançamento), sempre JUNTO das
nominativas (âncora), nunca no lugar. [FATO/Manual] mista em P&B: imagem colorida = reivindicação
de cores incorporada (uso preso às cores registradas, só saturação varia); P&B comprova uso em
quaisquer cores — cobre o # azul e recolors futuras. Mista de um nome não cobre outro
("#Jilson Santana" ≠ "#JilsonAI"). JilsonAI: direção default = sem logo, modelo iCloud
(nominativa basta, R$0); mista #JilsonAI só se o sistema "#" estabilizar. Total revisto:
R$880 agora + R$440 no congelamento do wordmark = R$1.320.*
*Atualizado: Jul 2026 (6) — [DECIDIDO] nominativa limpa "JILSON SANTANA" SAI do plano: o nome fica
ancorado na mista "#Jilson Santana" (P&B) + elemento nominativo no exame de colidência + nome
civil (art. 124, XV). Trade-off consciente: (a) janela sem registro do nome até o protocolo da
mista → nova Decisão em aberto 7 (protocolar já × congelamento do wordmark); (b) disciplina de
caducidade: o "#" vira permanente — abandonar o visual exige registrar substituto ANTES. Custos:
R$440 agora (JILSONAI/41) + R$440 mista + R$440 classe 42 = R$1.320 total.*
*Atualizado: Jul 2026 (7) — Decisão 7 RESOLVIDA: arte definitiva confirmada (logo estilizado
"#Jilson / Santana"; texto do site era só HTML) → mista protocolada JÁ, junto do JILSONAI = R$880
na mesma sessão; janela sem registro fechada. [FATO/Manual] specs da imagem: JPG, 945×945 px
(8×8 cm), ≤2 MB, RGB — print de tela não serve; exportar da arte original em escala de cinza.
Nova disciplina de uso: texto HTML ≠ uso da mista; o logo real deve aparecer continuamente (site
como imagem, YouTube, materiais) com prints datados no dossiê de provas.*
*Atualizado: Jul 2026 (8) — JilsonAI ganhou logo definitivo ("Jilson" estilizado + "AI" azul, sem
"#") → direção "sem logo/iCloud" substituída. Classificação: o logo é MISTA (letras fantasiosas +
cor); a nominativa JILSONAI segue como âncora e protocolo imediato — protege a palavra em
qualquer visual, logo em uso no dia 1 sem registro próprio. Mista JilsonAI = reforço opcional,
avaliar junto da classe 42 (pós-ME), em P&B. Arte original em alta (2000×577) recebida — base pro
JPG 945×945 se/quando registrar.*
*Atualizado: Jul 2026 (9) — nova seção "Respostas estruturadas (answer components)" (gatilho:
Monogram/Eren Bali — princípio "melhor que parede de texto" aplicado em escala solo): lançamento =
painel da Fase 1 renderiza Markdown (fórmula em bloco com botão copiar, passos numerados,
mini-tabela) + parágrafo de formato na persona, custo ~zero; v2 = blocos tipados
(formula/table/steps) como campo aditivo (`blocks?`) no gateway, sem quebra; Fase 5 = citação de
transcrição vira deep-link pro minuto da aula via `startSec` ([FATO/docs Bunny: `?t=` no
embed/direct-play + `setCurrentTime()` na Playback Control API — sintaxe a confirmar no build]).
Seam novo na tabela. Roadmap inalterado (MVP = Fases 0–3).*
*Atualizado: Ago 2026 — **pg-boss saiu do MVP** (auditoria de stack; razão completa em `CLAUDE.md` →
Background Jobs e `tech-stack.md` → What We Do NOT Use). Impacto aqui: a Fase 2 manda a resposta da
escalação por **Resend inline em `try/catch`**, não por fila; a Fase 6 (`AiMemory` async) passa a
depender da fila que **nasce na Fase 4**. **Gatilho de volta registrado nas Fases 4 e 5** — embeddings
da KB e o pipeline transcrição→chunk→embedding são o caso de uso legítimo (lote, demorado,
retentável) e são código que ainda não existe, logo adicionar a fila lá não refatora nada. No MVP
(Fases 0–3) o chat é **síncrono com streaming**: fila pioraria o produto. Roadmap inalterado.*
