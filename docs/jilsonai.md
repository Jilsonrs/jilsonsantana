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
4. **Modelo atrás de abstração.** `llm.complete()` encapsula o `@anthropic-ai/sdk`.
   Trocar/atualizar modelo (Haiku → Sonnet → futuro) é config, não reescrita. Seam de
   prompt caching reservado aqui.
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
- Painel de chat na área do membro (streaming).
- Providers: `PersonaProvider` + `CourseContextProvider` (título/descrição/lista de
  aulas do curso atual no prompt — **ainda não** a transcrição).
- Botão de feedback: *"resolveu? [sim] / [não]"* → grava `AiEvent`.
- Rate-limit ativo. **Depende de:** Fase 0 + conteúdo (Fase 2 do plano geral).
- **Done when:** membros conversam e recebem respostas na voz do Jilson com contexto do
  curso; feedback capturado.

### Fase 2 — Escalação humana (modelo "tickets do Mosh")  *(LANÇAMENTO)*
- `AiEscalation` ativado: feedback=não OU confiança baixa → cria item na fila do Jilson.
- Inbox admin: Jilson vê a conversa inteira, responde **uma vez**; resposta volta ao
  aluno (Resend via pg-boss).
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
- **Decisão de build:** vetor via **pgvector no Supabase** (sem infra nova, sustentável).
  Embeddings precisam de provider separado (Anthropic recomenda Voyage AI; alternativas:
  OpenAI/embeddings open-source) — **decisão da Fase 4, verificar no build**.
- **Done when:** perguntas repetidas são respondidas pela KB sem chegar ao Jilson.

### Fase 5 — RAG sobre transcrições (contexto profundo do curso)  *(pós-lançamento)*
- `LessonChunk` (transcrição em pedaços + embedding + `startSec`) (+ RLS) ; migration.
  Fonte: legendas do Bunny ou transcrição.
  - **Auto-ingestão = decisão de build da Fase 5, NÃO antes.** O pipeline "upload Bunny → webhook →
    transcrição (Whisper/Groq/outro) → chunk → embedding" é seam **parqueado**. Adiciona fornecedor
    novo e é o **maior risco de prazo** do projeto. No lançamento `LessonChunk` nem existe. Não
    puxar pra frente sob nenhuma justificativa de "já que estou no Bunny".
- `TranscriptProvider` registrado: recupera trechos relevantes → IA responde **fundada no
  conteúdo real**, citando "na aula X, min Y".
- **Depende de:** vídeo (Fase 3 do plano geral) + Fase 4 (infra de vetor).
- **Gatilho:** catálogo com profundidade suficiente pra justificar (vários cursos/aulas).
- **Done when:** JilsonAI responde a partir do vídeo, com citação/timestamp.

### Fase 6 — Memória + proatividade (camada de relação)  *(pós-lançamento)*
- `AiMemory` (resumo por aluno: onde travou, onde está) (+ RLS), atualizado async (pg-boss).
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

---

## Custo: escala com a receita (não à frente)

> Custo confirmado (jun/2026): Haiku 4.5 $1/$5 · Sonnet 4.6 $3/$15 · Opus 4.8 $5/$25 por Mtok;
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
