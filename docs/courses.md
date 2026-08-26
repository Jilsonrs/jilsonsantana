# COURSES.md — Engenharia de Cursos, Slate & Mapa de Conteúdo

> **Doc mestre único** (consolida o antigo `courses.md` + `mapeamento-cursos.md`). É a fonte de
> *quais* cursos existem, *de onde* sai cada aula e *o que* se grava de novo. Quando um curso entra em
> produção, ele ganha o **seu próprio `.md`** (`curso-excel-ia.md`, etc.) com a lista de aulas final +
> achados de vidIQ + roteiro. Este doc nunca vira roteiro de aula — ele decide e prioriza.
>
> **Fonte de estratégia:** `project-description.md` · **Voz/concorrência:** `strategy.md` · **Copy:**
> `content.md` · **Build do catálogo:** `implementation-plan.md` (Fase 2). **Edit owner:** Project.
> **Idioma:** PT-BR.
>
> Disciplina de fonte: `[FATO]` documentado (docs / anexo Udemy / sua decisão) · `[INFER]` dedução minha
> · `[ESPEC]` palpite a validar (quase sempre demanda — só o vidIQ confirma).

---

## 0. Como usar este doc (3 princípios que regem tudo)

1. **O catálogo tem TETO de 20 cursos, de 2h a 5h cada.** `[FATO, decisão do operador — Ago 2026]`
   Substitui o princípio anterior ("número aberto"). É **teto, não meta** — existe pra dizer quando
   **PARAR**, porque catálogo sem limite escrito vira esteira de manutenção que operador solo não
   sustenta. Entrar exige **relevância estratégica + demanda real (vidIQ)** — nunca "porque está
   gravado". Ver **D9 (catálogo rotativo)** em §1: com o teto cheio, um curso novo só entra quando
   outro sai.
   > **Validação externa `[FATO]`:** o `analystbuilder.com` (Alex The Analyst, 1,42M inscritos no
   > YouTube) opera exatamente **20 cursos** de 1h a 12h. O número não é palpite — é o ponto de
   > equilíbrio a que o principal player global do nicho chegou de forma independente. Ver §4.1.
2. **Só se grava o que for relevante.** Cada aula nova (🎬) passa pelo filtro: *tem demanda (vidIQ) E/OU
   é estrategicamente necessária?* Se não tem nenhum dos dois → **não grava**. Isso protege seu tempo de
   operador solo: o ativo já gravado é reaproveitado de graça; o esforço novo só vai onde paga.
3. **A REGRA DO SATÉLITE — a cerca do catálogo.** `[FATO, decisão — Ago 2026]` Dados é o pilar
   central; satélites são bem-vindos. Um satélite entra **se o título aceitar naturalmente o sufixo
   "…para quem trabalha com dados"**. Se o sufixo soar forçado, não é satélite — é outra escola.
   - ✅ "Git **para quem trabalha com dados**" · "Chat de atendimento sobre **os dados da empresa**"
     · "N8N **para automatizar rotinas de dados**" · "Estatística **para quem trabalha com dados**"
   - ❌ "Monte sua agência de chatbots" · "Automação de marketing" · "Prompt engineering genérico"
   > **O eixo que se abre é o COMPRADOR, não o tema.** O teste operacional: *"esse curso faz sentido
   > pro mesmo assinante que comprou Excel + IA?"* Se sim, entra — mesmo sem número na tela. Se
   > precisa de um público novo, fica fora. `[INFER]` Confirmado pelo padrão do concorrente: os 20
   > cursos do analystbuilder carregam o sufixo *for Data Professionals / for Data Analysis* no
   > título — o sufixo **é** a cerca.

**Fluxo de cada curso:** régua (§3) → mapa de conteúdo (§7) → **vidIQ valida demanda e aulas** (§4) →
abre o `.md` do curso → grava só o relevante.

---

## 1. Decisões estratégicas travadas

| # | Decisão | Implicação |
|---|---------|------------|
| D1 | **Não fazer rebuild do carro-chefe na Udemy.** `[FATO]` | Zero re-gravação do ativo de 499 aulas para a Udemy. |
| D2 | **Atualizar o carro-chefe com Quiz** (ativa o algoritmo sem entregar conteúdo novo). `[FATO]` | Defesa de ranking + **anti-canibalização**. |
| D3 | **Conteúdo 3 camadas é gravado SÓ para a escola.** `[FATO]` | Material novo (Excel 365 + IA) é exclusivo. |
| D4 | **Reaproveitar o ativo legado** como Camada Universal. `[FATO]` | ~75–85% de cada curso já existe → custo marginal baixo. |
| D5 | **Pílulas B2B de 2,5h–4h**, não o monolito de 53h. `[FATO]` | Cursos digeríveis, vendáveis por competência. |
| D6 | **Anti-defasagem da Camada IA:** ensinar **padrão de pensamento**, não a interface. `[FATO]` | A camada que envelhece rápido dura mais. |
| D7 | A **Camada IA é o fosso** e **nunca** vai pra Udemy. `[INFER]` | O diferencial fica trancado na escola. |
| D8 | **Ambiente prático padrão da escola = Databricks Free Edition.** `[FATO, Ago 2026]` | Um ambiente só pra SQL/Python/ETL, no lugar de Fabric + Azure + MySQL + Postgres. Ver §1.2. |
| D9 | **Catálogo rotativo com teto de 20.** `[FATO, Ago 2026]` | Tecnologia menos relevante sai, outra entra. A escola se renova pra sempre; o assinante paga por 20 cursos focados + JilsonAI. Ver §1.3. |
| D10 | **Camada IA existe em DOIS MODOS: Pessoal e Empresa.** `[FATO, Ago 2026]` | Aluno cuja empresa bloqueia IA externa não perde o curso. Ver §1.4. |
| D11 | **Lei anti-defasagem da Camada IA** (operacionaliza D6). `[FATO, Ago 2026]` | Grava-se o padrão, nunca a integração do momento. Ver §1.5. |
| D12 | **Runtime nunca vira título nem SEO.** `[FATO, Ago 2026]` | O curso chama "SQL", não "Databricks". Ver §1.2. |

### Modelo Udemy × Escola (por curso) `[FATO, sua decisão]`

A regra: **Udemy fica com a base; escola fica com base + Camada IA + extras; a Camada IA é sempre exclusiva.**

| # | Curso | Na Udemy | Na Escola | Exclusivo da escola |
|---|-------|----------|-----------|----------------------|
| 1 | **Excel + IA** | Carro-chefe **congelado + Quiz**. | **Remontado em minicursos** 3 camadas — entrega diferente. | Remontagem + 365 + IA |
| 2 | **Power BI + IA** | Base igual no início. | Base + **Camada IA** ("se explica sozinho"). | A parte de IA |
| 3 | **PL-300** | Igual. | Igual + **aulas adicionais**. | Aulas adicionais (tutor/simulados) |
| 4 | **SQL + Claude** | Base. | Base + **aulas adicionais**. | Aulas adicionais (Claude) — *fonte a definir, §7.4* |

---

### 1.1 Os 5 pilares da escola `[FATO, decisão — Ago 2026]`

O catálogo de 20 se organiza em **5 pilares**. Dados é o centro; tudo o mais é satélite (§0.3).

| Pilar | Slots | Racional da alocação |
|-------|:-----:|----------------------|
| **1 · Excel** | 5–6 | Maior ativo já gravado, maior topo de funil, maior demanda BR. Merece mais que 1/5. |
| **2 · Power BI** | 4–5 | Núcleo BI. Absorve PL-300, Data Modeling, dashboards/storytelling. |
| **3 · SQL** *(runtime: Databricks)* | 3 | Evergreen. `sql` = 42.436 buscas/mês BR (vidIQ, ago/26) — o maior motor de aquisição fora do Excel. |
| **4 · Python** *(runtime: Databricks)* | 3 | Evergreen, dá teto de senioridade. |
| **5 · IA aplicada a dados** | 3–4 | **Deliberadamente o MENOR.** Maior defasagem, menor durabilidade. É onde a rotação (D9) mais trabalha. |

> ⚠️ **Por que o pilar de IA é o menor e não o maior:** é o que mais dá vontade de inflar e o que
> menos deveria. Ele carrega 100% do risco de regravação (D11) e ~0% do ativo já gravado. O teto
> por pilar protege o operador dele mesmo.
>
> **Resolve a T-antiga sobre dashboards/modelagem `[FATO]`:** dashboards executivos, storytelling e
> Data Modeling moram no **pilar 2 (Power BI)**. **Não existe 6º pilar.**

### 1.2 D8/D12 — Databricks como ambiente, não como assunto `[FATO]`

**O que foi decidido:** a escola adota **um ambiente prático único** — Databricks Free Edition —
para os pilares SQL e Python (e o que vier de ETL).

**Por que (o argumento correto, registrado pra não ser trocado depois):**
- **Zero instalação.** O maior ponto de abandono em curso de SQL pra iniciante não é o `JOIN` — é
  instalar Postgres/MySQL numa máquina corporativa travada. Roda no navegador. `[INFER]`
- **Grátis pra sempre** (Free Edition), enquanto o Fabric **não tem tier grátis permanente** — só
  trial de 60 dias. `[FATO]` Esse é o motivo real da escolha.
- **Setup gravado UMA vez, reusado em N cursos.** Com Fabric + Azure + MySQL + Postgres seriam
  quatro setups gravados, quatro mantidos, quatro gerando suporte.
- Cobre as 3 camadas num lugar só: SQL Editor (Universal) · notebooks/ETL (Moderno) · Genie +
  `ai_query` (IA).

> ⚠️ **CORREÇÃO DE PREMISSA `[FATO]`:** Databricks **NÃO é Microsoft**. É empresa independente,
> concorrente da Microsoft nesse mercado. "Azure Databricks" é o produto rodando *dentro* da Azure.
> A plataforma equivalente **da** Microsoft é o **Fabric**. Portanto o argumento "coerência
> Microsoft" **não vale** e não deve ser usado em copy nem em decisão futura. O argumento válido é
> o de cima: grátis + zero instalação + setup único.

**D12 — a regra que protege o SEO e o funil:** Databricks **nunca** aparece em título de curso nem
em SEO. Os títulos são "SQL", "Python" — é lá que estão as buscas (`sql` 42.436/mês BR vs
`databricks` 2.975/mês BR). Databricks é **como o aluno pratica**, não o que ele compra.
`[FATO — vidIQ, ago/2026]`

**Query que só roda no Databricks está mal desenhada.** O SQL ensinado precisa rodar em qualquer
lugar; uma aula de ~10 min cobre as diferenças de dialeto (Spark SQL × T-SQL/PostgreSQL) pra quem
chega na empresa. Isso é a mitigação do risco de fornecedor único.

**Custo `[FATO/INFER]`:** não é assinatura fixa como o Microsoft 365 — é **medidor**. Serverless SQL
= US$0,70/DBU (tarifa oficial); `[INFER]` warehouse `2X-Small` ≈ 4 DBU/h → ~US$2,80/hora ativa.
Faixa realista: **US$40–200/mês**, oscilando com o ritmo de gravação. **Disciplinas obrigatórias no
dia 1:** auto-stop em 5 min · alerta de orçamento · conferir consumo toda sexta no primeiro mês.
**Antes de pagar:** tentar o **Databricks University Alliance** (programa pra educadores) — pode
zerar o custo E resolver a cláusula de uso não-comercial de uma vez.

**Pendências de verificação (não bloqueiam o doc, bloqueiam a gravação):**
- `[VERIFICAR]` `ai_query` com Claude funciona no Free Edition? A doc lista Model Serving como
  disponível, mas com *"certos modelos não disponíveis"* e *"sem batch inference"* — e `ai_query`
  sobre tabela **é** batch. Teste de 10 min: `SELECT ai_query('databricks-claude-sonnet-4-5',
  'Responda apenas: ok');` e depois o mesmo sobre uma tabela pequena.
- `[FATO — restritivo]` A doc afirma duas vezes que contas Free Edition **não podem ser usadas para
  fins comerciais**. Aluno aprendendo = ok (é o público-alvo do produto). **Operador gravando curso
  pago = comercial.** Saídas, nesta ordem: University Alliance → free trial (14d) → tier pago.
- `[FATO]` Acesso de saída à internet no Free Edition é **restrito a domínios confiáveis** →
  aula de "puxar dados de API" não roda sem verificação por LinkedIn (que libera saída + GPU).

### 1.3 D9 — Catálogo rotativo e política de arquivamento `[FATO]`

Com o teto de 20 cheio, curso novo entra quando outro sai. A escola se renova permanentemente; o
assinante paga por **20 cursos focados + JilsonAI**, não por um depósito que só cresce.

**Política de saída (decidida — não reabrir):**
- Aviso ao aluno, **arquivamento 1 ano depois**.
- Arquivado = **invisível na vitrine e na busca para novos**; **assinante ativo continua acessando
  enquanto a assinatura estiver ativa**.
- Sem alunos ativos no curso, o **vídeo** pode ser deletado. **Histórico, aulas e certificado
  permanecem.**
- **Arquivamento NÃO interfere em certificado.** `[FATO, decisão do operador]` O `Certificate`
  carrega `nameSnapshot` + `skillsCovered[]` como **snapshot** — não depende do curso continuar
  existindo. A página pública `/certificado/[id]` **permanece no ar** (se um recrutador clicar em
  2030 e der 404, o canal de aquisição CAC-zero se quebra sozinho). **O arquivamento só libera o
  slot.**
- **Gatilho objetivo de aposentadoria** escrito antes: matrículas nos últimos 6 meses abaixo do
  limiar **OU** a tecnologia saiu do mercado.

> **NÃO construir funcionalidade de deleção de vídeo.** `[FATO, decisão]` A motivação ("ocupar
> espaço") não se sustenta: no Bunny Stream o caro é **banda**, e curso arquivado sem espectador
> consome banda ≈ zero. Deletar manualmente no painel leva 5 min. Critério de decisão de stack do
> `CLAUDE.md`: não dá pra nomear o dia ruim que essa feature evita.

### 1.4 D10 — A Camada IA em dois modos `[FATO]`

**Toda aula da Camada IA declara em qual modo está.** Assim o aluno cuja empresa bloqueia IA externa
não perde o curso — aprende o mesmo raciocínio no modo que a empresa dele aceita.

| | **Modo Pessoal** | **Modo Empresa** |
|---|---|---|
| Onde o modelo roda | Servidor do fornecedor de IA | Dentro do workspace da empresa |
| O dado sai da empresa? | **Sim** | **Não** |
| Governado por | Plano de IA da empresa | Unity Catalog / AI Gateway |
| Exemplos | Excel + Claude · **Power BI + Claude via MCP** | SQL/Python no Databricks (`ai_query`) |

> ⚠️ **A distinção autoral que quase ninguém faz `[FATO/INFER]`:** "MCP local" **não** significa "o
> dado não sai". A topologia é local; o fluxo não é. O Claude Desktop é cliente de nuvem — metadados
> do modelo semântico e **resultados das queries DAX viajam até o fornecedor**. Já o `ai_query` do
> Databricks roda o modelo **dentro** do workspace. Isso rende a aula *"Sua empresa aprovou a IA —
> mas você sabe o que está saindo?"*, que é conteúdo que só quem entende de dado **e** de IA escreve,
> e que abre conversa B2B sozinha.

**Base factual do Modo Empresa `[FATO]`:** parceria Databricks–Anthropic de 5 anos; modelos Claude
nativamente disponíveis na plataforma em AWS/Azure/GCP, chamáveis **direto em SQL** (`ai_query`) e em
Notebooks, governados por Unity Catalog / AI Gateway. **Base do Modo Pessoal `[FATO]`:** Microsoft
publica o **Power BI Modeling MCP Server** (local, preview) e um **Remote MCP Server** (Fabric),
ambos conectáveis ao Claude — os casos de uso documentados são **otimizar medidas DAX, auditar
relacionamentos/cardinalidades e documentar o modelo**, ou seja, auditoria, não geração.

**Giro de foco da Camada IA:** de **gerar** para **auditar e diagnosticar**. Gerar SQL não é a
habilidade escassa (o Genie faz de graça no botão ao lado) — **verificar** é. O erro caro em dados
não é a query que quebra; é a que roda, devolve um número e ninguém percebe que o `JOIN` duplicou
linhas. Conteúdo-alvo: auditar SQL/DAX gerado por IA · descrever o problema de negócio pra IA
acertar · diagnosticar resultado errado · Genie × Claude (quando o nativo basta).

### 1.5 D11 — Lei anti-defasagem da Camada IA `[FATO]`

Operacionaliza D6 com um teste mecânico, porque a Camada IA da escola **apoia-se em integrações de
terceiros instáveis** (Power BI MCP em *public preview*; parceria Databricks–Anthropic). Relógio de
defasagem **medido, não estimado**: o anúncio oficial dos modelos na plataforma é de mai/2025, já
está marcado como *arquivado* pelo próprio fornecedor, e falava de uma geração de modelo que já foi
substituída duas vezes.

| GRAVAR (dura anos) | NÃO GRAVAR (dura meses) |
|---|---|
| "A IA vai até o dado, não o contrário" | O nome do modelo do momento |
| "Como auditar o que a IA escreveu" | A tela do playground de hoje |
| "O que sai da empresa e o que não sai" | Passo-a-passo de configuração de MCP |
| A forma `ai_query(modelo, prompt)` | Qual modelo específico usar |

**Teste obrigatório antes de gravar cada aula da Camada IA:** *"esta aula continua verdadeira se o
modelo mudar de nome?"* Se não → ou reescreve, ou vira **material escrito** (PDF/link) que se
atualiza em 5 minutos em vez de regravar.

---

## 2. Metodologia 3 Camadas (padrão arquitetural — estudo Gemini, PDF) `[FATO]`

Template de todo curso reaproveitado **que tiver as três camadas** (nem todo tem — N8N pode ter só a IA;
ver §2.1). Maximiza reaproveitamento; atende empresa engessada (TI/versão antiga) e profissional na vanguarda.

| Camada (produção) | Enum schema/UI | O que é | % médio | Produção |
|--------|--------|---------|---------|----------|
| **1. Universal** | `UNIVERSAL` | Fundações que rodam em Excel 2016+ (SE, PROCV, dinâmicas clássicas). | 75–80% | **Reaproveitado** |
| **2. Excel 365 / Moderno** | `MODERNO` | Produtividade extrema (PROCX, matrizes dinâmicas, coautoria, nuvem). | 15–20% | **Gravação nova** |
| **3. Acelerador IA** | `IA` | JilsonAI + Claude como copilotos (gerar lógica, diagnosticar erro, planejar dado). | 5–10% | **Gravação nova** |

**Regra de longevidade (D6):** a Camada 3 ensina *como estruturar o prompt / como diagnosticar*, não
"clique aqui nesta versão" → o material vive sem regravação constante. `[INFER]` A estrutura se aplica a
Power BI, SQL, Python etc. — muda só o que é "Universal" e o que é "moderno + IA".

### 2.1 Reconciliação produção ↔ schema/UI (Jun 2026) `[FATO, decisão]`

Esta tabela é **interna de produção** (quanto reaproveita, % por camada). Na **plataforma** (schema + UI)
as camadas viram um **selo na página de curso** com regras próprias:
- **Enum agnóstico de ferramenta:** `UNIVERSAL` · `MODERNO` · `IA`. "Excel 365" é só o **exemplo** de
  `MODERNO` no contexto Excel — em SQL/Python/N8N não existe "365". O texto **global** do selo nunca cita
  "Excel 365" (quebraria fora do Excel).
- **Selo opcional, por curso:** `Course.camadas[]` marca **quais** camadas o curso tem (1, 2 ou 3). Nem
  todo curso usa as três.
- **Internos (NÃO vão pra UI do aluno):** os **percentuais** (75/15/10), a palavra **"reaproveitado"** e o
  jargão "3 camadas". O aluno vê a *promessa* (Fundamentos sólidos · Recursos modernos · Com IA do seu lado),
  não a economia de bastidor. O "precisa do Excel 365 pra praticar" o Jilson **fala na aula**, não é texto.
- **Textos + ícones globais** (escritos 1 vez): `stack-2` Fundamentos sólidos · `bolt` Recursos modernos ·
  `sparkles` (azul) Com IA do seu lado. Override por curso (`camadaOverride`) é exceção (ex. N8N).
- Detalhe de build em **CLAUDE.md → Metodologia 3 Camadas** e na cópia da landing em **content.md §15**.

---

## 3. A régua: critérios de avaliação de cada curso

Cada curso pontua **1–5** por eixo. Objetivo: **fazer os cursos certos** — máximo de alunos, mínimo de
esforço solo, alinhado a DNA e B2B.

| Eixo | Pergunta | Quem responde |
|------|----------|---------------|
| **Demanda** | Tem volume de busca / audiência puxando? | **vidIQ** (§4) — hoje `[ESPEC]` |
| **Evergreen** | Dura anos ou defasa rápido? | `strategy.md §4` + `[INFER]` |
| **B2B fit** | Empresa paga por treinar o time nisso? | `[INFER]` |
| **DNA "AI no DNA"** | É demo viva de IA bem-usada? | `[FATO]`/`[INFER]` |
| **Autoridade Jilson** | Está no seu núcleo de marca/conhecimento? | `[FATO]` |
| **Contribuição marginal** | Quanto **adiciona** vs. o que já tem? (reaproveitamento = custo baixo) | `[FATO]` (D4) |
| **Diferenciação** | Concorrentes (Hashtag/Xperiun/DataTraining) já fazem? | `strategy.md §3` |
| **Esforço de produção** | Quanto preciso gravar do zero? (sustentabilidade) | `[INFER]` |

**Leitura:** melhor candidato = **demanda alta + reaproveitamento alto + DNA alto + esforço baixo**.
Demanda alta com esforço altíssimo (gravar tudo do zero) = risco de burnout → entra depois, ou não entra.

---

## 4. Workflow vidIQ (o parceiro que decide o que é relevante)

O vidIQ valida **antes de gravar** — e decide tanto *se um curso/minicurso existe* quanto *quais aulas
novas valem a pena*. Aplicado **um curso por vez** (quota + energia).

**Por curso, a sequência:**
1. `vidiq_keyword_research` — volume + competição das palavras-chave (PT-BR) → *tem demanda? saturado?*
2. `vidiq_youtube_search` + `vidiq_outliers` — que vídeos do tema explodem → *qual ângulo prova que puxa?* + **lacunas não mapeadas**.
3. `vidiq_trending_videos` / `vidiq_trend_categories` — o tema sobe ou está estável?
4. `vidiq_channel_videos` (seu canal) + `vidiq_video_stats` — o que **já funcionou pra você** (sinal mais forte que a média de mercado).
5. `vidiq_similar_channels` — o que o concorrente cobre e **deixa de fora**.

**O que isso decide:** palavra-chave campeã (→ nome do curso + vídeo de funil), ângulo (→ posicionamento),
lacuna (→ módulo exclusivo), e — crucial — **quais aulas 🎬 valem gravar** e **se um bloco órfão vira
curso novo** (§7.3). Aula nova sem demanda e sem necessidade estratégica = não grava.

> **Sustentabilidade:** rodar 5 passos × N cursos de uma vez = exaustão de quota e energia. Roda só o
> **próximo da fila**. Bônus: a validação serve ao curso **e** ao vídeo de YouTube que aponta pra ele.

### 4.1 Benchmark de engenharia de catálogo — analystbuilder.com `[FATO — inspeção direta, ago/2026]`

**Alex Freberg / "Alex The Analyst"** · YouTube 1,42M inscritos · 465 vídeos · ~2 uploads/semana ·
~US$7,4K/mês estimados só de YouTube · site `analystbuilder.com`. Referência **de catálogo**
(a de voz/posicionamento continua em `strategy.md §3`).

**O que a inspeção confirma das nossas decisões:**

| Nossa decisão | Confirmação observada |
|---|---|
| Teto de 20 (§0.1) | **20 cursos exatos** (19 publicados + 1 "coming soon"), 1h–12h |
| D12 — runtime ≠ título | O curso chama **"Modern Data Workflows with Databricks"**, não "Curso de Databricks" — o assunto é o *workflow* |
| Regra do satélite (§0.3) | Todos os títulos carregam *for Data Professionals / for Data Analysis* — **o sufixo é a cerca** |
| Certificado | "Earn the course certificate" — **padrão da categoria, não diferencial**. Nosso diferencial é o certificado **por competências** (`skillsCovered`), que é o que RH lê |
| D10 — Camada IA governada | Seção do curso dele = *Intelligent Document Processing* (`ai_parse_document`, `ai_extract`, `ai_classify`) + *Genie Spaces* + *AI Agents with Dashboards*. **Prova que "IA vai até o dado" funciona como aula gravada** |
| Risco de fornecedor único mitigado | Ele mantém **"Modern Data Workflows with Snowflake"** com estrutura idêntica → a plataforma é **intercambiável de propósito**. Se o Databricks decepcionar, troca o runtime sem trocar o currículo |

**Candidatos novos que essa inspeção revelou** (entram na fila de §6/§8, não no lançamento):

| Candidato | Pilar | Por quê `[INFER]` |
|---|---|---|
| **Git/GitHub para quem trabalha com dados** (~3h) | 5 (satélite) | O curso **mais barato de produzir** do catálogo: o operador usa Git todo dia construindo a plataforma. Não defasa. Diferenciador real — analista BR típico não versiona nada |
| **Carreira: como conseguir vaga em dados** (~3h) | 5 (satélite) | Zero software, zero defasagem. Em PT-BR é **aquisição pura** — traz assinante novo, que é o gargalo atual |
| **Crash courses de entrevista** (SQL / Excel) | 3 / 1 | Mesmo conteúdo, **momento de compra diferente**. Quem tem entrevista semana que vem não quer 10h. É **reempacotamento**, não gravação nova — e há 53h de ativo pra reempacotar |
| **Banco de questões** (não é curso) | transversal | O site dele tem *Questions* e *Projects* como seções próprias. Retenção a custo muito menor que vídeo. **Fonte pronta:** o Q&A real da Udemy, que já alimenta o golden set do JilsonAI |

**O que NÃO copiar:** R e Tableau (fora do DNA e do mercado atendido) · gamificação (o "🔥 500" é XP —
já decidido que não) · **duas plataformas de nuvem** (ele sustenta Databricks *e* Snowflake porque tem
escala; aqui é **um runtime só**) · cursos de 12h (quebram o teto de 2–5h, que existe por um motivo).

> ⚠️ **A assimetria que o benchmark também revela `[FATO]`:** 1,42M inscritos e 465 vídeos ≈ 4,5 anos
> de cadência ininterrupta. O canal PT daqui tem ~1.580 inscritos e ~13 vídeos. **O catálogo de 20
> dele é CONSEQUÊNCIA do funil, não causa.** Ele pôde lançar 20 cursos porque tinha um milhão de
> pessoas assistindo; não conseguiu o milhão porque tinha 20 cursos. Reforça o diagnóstico já
> registrado: **distribuição é o gargalo, não produto.** O catálogo pode ser projetado hoje — ele só
> se paga com público.

---

## 5. O ativo real (carro-chefe — o que existe de verdade) `[FATO]`

**"Excel + Power BI + DAX — 7 Cursos em 1"** · 30 seções · 499 aulas · 53h42 · 4,8★ · 100k+ alunos.
Referência abreviada `S#` usada no mapa (§7):

- **Excel — Fórmulas (~7h):** `S1` Fórmulas/Funções · `S2` Recursos Adicionais · `S3` Avançadas I · `S4` Avançadas II · `S5` Avançadas III · `S6` **PROCX** (365, já existe)
- **Excel — Dados/Gráficos/Dinâmicas (~9h):** `S7` Gerenciamento/Análise · `S8` Impressão · `S9` Gráficos (cascata, combinação, mapa, pareto…) · `S10` TD I · `S11` TD II (segmentação, linha do tempo) · `S12` TD III (**Relacionamentos + Power Pivot** + Macros)
- **Excel — Dashboards (~5,5h):** `S13` Dashboards I · `S14` Dashboards II
- **Excel — ETL (~5h):** `S15` Power Query (38a — importar, limpar, **Left Join**, acrescentar)
- **Excel — Automação (~7h):** `S16` Macros · `S17` VBA
- **Excel — Análise/Entrega (~6h):** `S18` Cenários · `S19` Atingir Metas/Solver · `S20` Segurança (proteger/ocultar) · `S21` Projeto Final
- **Excel — Básico/Extras (~3h):** `S22` Primeiros Passos (43a) · `S23` Dicas
- **Power BI + DAX (~11,5h):** `S24` Intro · `S25` Import/Transform · `S26` **Modelo de Dados** · `S27` **DAX** (CALCULATE, time intelligence) · `S28` Dashboard · `S29` Publicação · `S30` Conclusão

> **Achado-chave `[FATO]`:** o carro-chefe **não tem SQL, Python nem IA standalone.** É Excel (esmagador)
> + Power BI + DAX. Cursos **4 (SQL)** e **8 (Python)** não saem daqui (§7.4). Você tem 5 cursos na Udemy —
> SQL/Python provavelmente estão nos outros 4.

---

## 6. O Slate — fichas dos cursos (teto de 20, ver §0.1 · pilares em §1.1)

> 🟢 reaproveitamento alto/esforço baixo · 🟡 misto · 🔴 do zero/risco de defasagem.
> **P#** = pilar (§1.1). Os 10 abaixo ocupam metade do teto; os candidatos de §4.1 e §7.3 disputam o resto.

| # | Curso | Tipo | Resumo estratégico | Mapa de conteúdo |
|---|-------|------|--------------------|------------------|
| 1 | **Excel + IA** 🟢 | U+E | Launch. Base perene, maior topo de funil, B2B 5/5, DNA 5/5. Quase tudo reaproveitado. | §7.1 (definitivo) |
| 2 | **Power BI + IA** 🟡 | U+E | "Relatórios que se explicam sozinhos". Núcleo BI, B2B 5/5. Lacuna que a DataTraining deixa (sem IA). | §7.2 |
| 3 | **PL-300** 🟡 | U+E | Certificação (intenção de compra alta, demanda estável). Fosso = JilsonAI tutor + simulados. Data: **15/ago**. | §7.2 |
| 4 | **SQL + Claude** 🟡 | U+E | "Análise Direta". SQL evergreen, B2B 4/5. **Fonte fora do carro-chefe** (§7.4). | §7.4 |
| 5 | **Eng. de Prompts p/ Dados** 🟡 | E | Meta-skill, DNA puro. `[INFER]` talvez **módulo transversal** > curso longo. Defasa rápido → padrão de pensamento (D6). | vidIQ define |
| 6 | **AI + Claude (Negócios)** 🔴 | E | B2B 5/5 (abre conversa corporativa). Do zero + escopo largo → precisa recorte afiado (vidIQ acha). | vidIQ define |
| 7 | **N8N + Claude** 🔴 | E | Automação quente, diferenciação alta. Risco duplo: nicho menor + n8n muda rápido (manutenção). Validar demanda PT antes. | vidIQ define |
| 8 | **Python + Claude** 🟡 | E | Pandas + automação. Evergreen, dá teto de senioridade. **Fonte fora do carro-chefe** (§7.4). Tema concorrido → recorte "+Claude". | §7.4 |
| 9 | **Data Modeling (Star Schema)** 🟡 | E | **Ativo mais durável** (método > ferramenta). B2B 5/5, diferenciação muito alta. **Tem semente real** em `S26`/`S12`/`S27` — não é do zero. | §7.2 |
| 10 | **Google Antigravity** 🔴 | E | **Selo de vanguarda**, não receita. Defasagem altíssima → tratar como conteúdo curto (30–60 min), atualizável/aposentável. ⚠️ armadilha de burnout se virar curso completo mantido. | manter mínimo |

---

## 7. Mapa de conteúdo: carro-chefe → escola

Legenda de camada: 🟦 Universal (reaproveita) · 🟩 Excel 365 (moderno) · 🟧 IA (exclusiva escola).
"Gravar?": ✅ já existe (cortar/recurar) · 🎬 gravar novo *(passa pelo filtro de relevância §0/§4)*.

### 7.1 Excel + IA — mapa DEFINITIVO (launch · 4 minicursos confirmados + candidatos)

#### Minicurso 1 — Lógica de Negócios & Fórmulas Dinâmicas (~3h)
| Módulo | Conteúdo | Fonte | Camada | Gravar? |
|--------|----------|-------|--------|---------|
| 1. Base Lógica Inquebrável | Ordem de execução, SE, E/OU, SE 3 args, SEERRO | `S1`+`S3` | 🟦 | ✅ |
| 2. O Motor de Análise | SOMASE/CONT.SE, família SES, PROCV, ÍNDICE+CORRESP | `S3`+`S4` | 🟦 | ✅ |
| 3. O Novo Padrão | PROCX, PROCV vs PROCX | `S6` (existe!) | 🟩 | ✅ +1🎬 |
| 4. Matrizes Dinâmicas | FILTRO, ÚNICO, CLASSIFICAR/CLASSIFICARPOR | — | 🟩 | 🎬 |
| 5. Copiloto de Fórmulas | Prompt p/ Excel, diagnosticar #N/D/#VALOR!, lógica corporativa via IA | — | 🟧 | 🎬 |

#### Minicurso 2 — Excel ETL: Power Query (~3,5h) — *curadoria do `S15` (5h11)*
| Módulo | Conteúdo | Fonte | Camada | Gravar? |
|--------|----------|-------|--------|---------|
| 1. Fim do Trabalho Manual | Sobre PQ, importar Excel, pasta de arquivos | `S15` | 🟦 | ✅ |
| 2. Lavanderia de Dados | Limpeza, tipo de dados, dividir colunas | `S15` | 🟦 | ✅ |
| 3. Modelagem B2B | Mesclar (Left Join), Acrescentar | `S15` | 🟦 | ✅ |
| 4. Automação em Nuvem | SharePoint/OneDrive, atualização 2º plano, tipos nativos | — | 🟩 | 🎬 `[ESPEC]` |
| 5. IA p/ Engenharia de Dados | Mascarar CPF, scripts M via IA, RegEx via IA | — | 🟧 | 🎬 |

#### Minicurso 3 — Analytics & Tabelas Dinâmicas (~2,5h)
| Módulo | Conteúdo | Fonte | Camada | Gravar? |
|--------|----------|-------|--------|---------|
| 1. Padrão Ouro | Preparar dados, criar TD, modificar visualização | `S10` | 🟦 | ✅ |
| 2. Manipulação e Cálculos | Operação de campo, resumir campos, campo calculado | `S10`/`S11` | 🟦 | ✅ |
| 3. Interatividade | Segmentação, formatar, linha do tempo | `S11` | 🟦 | ✅ |
| 4. Escalabilidade | Relacionamentos, Power Pivot | `S12` (existe!) | 🟩 | ✅ |
| 5. Analista Aumentado | CSV no Claude, perguntas de negócio, interpretar variações | — | 🟧 | 🎬 |

#### Minicurso 4 — Dashboards Executivos & Storytelling (~3h) — *abre pela IA*
| Módulo | Conteúdo | Fonte | Camada | Gravar? |
|--------|----------|-------|--------|---------|
| 1. Storytelling com IA | KPIs com JilsonAI, paletas HEX via prompt, wireframe | — | 🟧 | 🎬 |
| 2. Arquitetura de Dashboards | Layout, planilha auxiliar, controles | `S13`/`S14` | 🟦 | ✅ |
| 3. Visualização Essencial | Formatar gráficos, barras/linhas/colunas, formatação condicional | `S9` | 🟦 | ✅ |
| 4. Visuais Modernos | Cascata/mapa/combinação (**existem `S9`!**), ícones SVG | `S9`+parcial | 🟩 | ✅ +🎬 |
| 5. Entrega B2B | Proteger/ocultar (`S20`), coautoria OneDrive | `S20`+parcial | 🟩 | ✅ +🎬 |

**Ganho de sustentabilidade `[INFER]`:** o Gemini marcou como "novo" itens que **já existem** (PROCX `S6`,
Power Pivot `S12`, cascata/combinação/mapa `S9`, proteção `S20`). A gravação **genuinamente nova** encolhe para:
matrizes dinâmicas · PQ nuvem `[ESPEC]` · ícones SVG/coautoria · **toda a Camada IA**. O resto é curadoria,
não regravação. Bem menos esforço do que o rascunho sugeria.

### 7.2 Power BI / DAX / Data Modeling — mapa estrutural (refinar na vez de cada um)

| Curso | Base (reaproveita) | Camada nova (escola) |
|-------|--------------------|-----------------------|
| **2 · Power BI + IA** | `S24`–`S29` (import, modelo, DAX, dashboard, publish) | 🟧 Copilot no PBI, medida DAX via Claude, **narrativa de insight**, doc via IA |
| **3 · PL-300** | `S25`–`S29` cobrem boa parte do blueprint | extras: **simulados + JilsonAI tutor de questões** + enquadramento de exame |
| **9 · Data Modeling** | `S26` (relacionamentos) + `S12` (Power Pivot) + `S27` (DAX) | 🟧 modelo revisado por IA; aprofundar star schema/otimização |

> `[INFER]` **Data Modeling não é do zero** (atualiza a ficha §6). **DAX (`S27`, 3h12)** pode virar
> **curso/módulo próprio** se o vidIQ mostrar demanda — você já tem 3h gravadas.

### 7.3 A sobra do Excel — candidatos a mais cursos (número aberto §0) `[INFER]`

Os 4 minicursos não cobrem ~16h. Cada bloco órfão é um **candidato** — o vidIQ decide se vira curso:

| Bloco órfão | Tempo | Candidato a… | Recomendação |
|-------------|-------|--------------|--------------|
| **Macros + VBA** (`S16`+`S17`) | ~7h | **5º minicurso "Automação: Macros/VBA + Claude"** | **Forte:** já gravado + Camada IA (Claude escreve/explica VBA) + B2B. Validar demanda "vba" no vidIQ. |
| **Excel Básico** (`S22`+) | ~3h | **"Excel do Zero"** — isca grátis de funil OU módulo 0 | Decidir papel (grátis vs incluso). Ótimo topo de funil YouTube. |
| **Cenários/Solver** (`S18`/`S19`) | ~1,5h | Módulo opcional OU parquear | Nicho. Só se vidIQ mostrar busca. |
| **Projeto Final** (`S21`) | ~4h | **Capstone** de trilha | Reaproveitar como projeto-âncora. |
| Impressão/Dicas (`S8`/`S23`) | ~0,5h | Aulas avulsas pesquisáveis | Não viram curso. |

### 7.4 Lacuna: SQL e Python (não estão no carro-chefe) `[FATO]`

Nenhuma aula de SQL/Python no ativo. Para mapear os cursos **4** e **8**, preciso saber:
- **Você tem SQL e/ou Python já gravados em outros cursos seus?** Se **sim** → me mande os índices (como
  fez com este) e eu mapeio base + Camada Claude. Se **não** → são gravação nova (esforço sobe → reavaliar
  prioridade). Até a resposta, o esforço de 4 e 8 fica `[ESPEC]` e a fila de gravação deles não fecha.

---

## 8. Matriz comparativa (priorização) `[INFER]/[ESPEC]`

Notas 1–5; **Demanda = `[ESPEC]` até o vidIQ**, salvo onde já medida. Esforço: 5 = fácil (reaproveita).

### 8.0 Demanda medida — vidIQ, ago/2026 `[FATO]`

| Keyword | Volume BR/mês | Leitura |
|---|---:|---|
| `sql` | 42.436 | **Maior motor de aquisição fora do Excel** |
| `curso de sql` | 14.069 | Intenção de compra explícita |
| `curso sql` | 5.573 | — |
| `databricks` | 2.975 | ~14x menor que `sql`. **Brasil nem aparece no top-5 de mercados** (Índia 42%, EUA 19%) |

**Busca por outliers PT-BR em `databricks` (long-form, 6 meses): ZERO resultado relevante** — o
buscador semântico caiu em conteúdo não relacionado, sinal de que **não existe corpus PT-BR do tema
com performance**. Lacuna sem tráfego não é oportunidade. **Isso é a prova que sustenta D12:** o
título vende SQL; o Databricks é o ambiente por trás.

`[ESPEC]` A curva de views/hora de `databricks` caiu ao longo de ago/26 — janela curta demais pra
concluir tendência, pode ser sazonalidade. **Não usar esse número em conteúdo público.**

### 8.1 A matriz

| # | Curso | Demanda | Evergreen | B2B | DNA | Reaproveit. | Diferenc. | Esforço | **Prioridade** |
|---|-------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| 1 | Excel + IA | 5? | 5 | 5 | 5 | 5 | 4 | 5 | **#1 launch** |
| 2 | Power BI + IA | 5? | 4 | 5 | 5 | 4 | 5 | 3 | **#2** |
| 3 | PL-300 | 4? | 4 | 4 | 3 | 3 | 3 | 2 | **#3 (15/ago)** |
| 9 | Data Modeling | 3? | 5 | 5 | 3 | 4 | 5 | 3 | **#4** ⬆ |
| 5 | Eng. de Prompts | 3? | 3 | 4 | 5 | 1 | 5 | 3 | **#5** |
| 4 | SQL + Claude | 4? | 5 | 4 | 5 | 2? | 4 | 2? | **#6** |
| 8 | Python + Claude | 4? | 5 | 4 | 5 | 2? | 3 | 2? | **#7** |
| 6 | AI + Claude (Negócios) | 4? | 3 | 5 | 5 | 1 | 4 | 2 | **#8** |
| 7 | N8N + Claude | 2? | 3 | 4 | 5 | 1 | 5 | 2 | **#9** |
| 10 | Google Antigravity | 1? | 1 | 2 | 5 | 1 | 5 | 2 | **#10 (selo)** |

> A coluna **Demanda** (com `?`) é a que mais move a ordem — o vidIQ a preenche. Hoje a matriz diz:
> comece pelos reaproveitáveis de alto B2B (1→2→3), intercale o durável-diferenciador (9, 5), deixe os
> "do zero" (6, 7, 10) por último. Data Modeling subiu (#4) por ter semente real (§7.2).

**Ajustes pós-medição (ago/2026) `[FATO]`:**
- **SQL (#4) sobe de `4?` para `5` em Demanda** — 42.436 buscas/mês BR, medido. É o maior motor de
  aquisição fora do Excel. A posição na fila continua atrás dos reaproveitáveis por causa do
  **esforço** (gravação nova), não da demanda.
- **Novo curso — Databricks conceitual.** `[FATO, decisão]` Entra como curso próprio ("no que a
  plataforma se propõe": lakehouse, por que separar armazenamento de processamento, o que Delta Lake
  resolve, o que Unity Catalog governa). **É conceitual, e conceito não defasa** — é D6/D11 aplicado
  à letra, o oposto de um tutorial de UI. **Demanda `2` (medida), Evergreen `5`, Diferenciação `5`.**
  ⚠️ **Não é pré-requisito de nada:** o aluno de SQL entra pelo módulo 0 de setup (15–20 min) sem
  passar por ele. Posição na fila: **depois de SQL** — não faz sentido um curso sobre a plataforma
  onde o SQL roda antes de existir o curso de SQL.
- **ORDEM DE GRAVAÇÃO — não começar pelo Databricks.** `[FATO, decisão]` A ordem continua
  **Excel + IA primeiro** (máximo reaproveitamento, mínimo risco, maior funil). Registrado
  explicitamente porque a sessão que produziu estas decisões criou *momentum* em cima de Databricks,
  e momentum é como operador solo constrói a coisa certa **na ordem errada**.

**Reconciliação com o teto de 20 `[INFER]`:** os 10 do slate + Databricks conceitual = 11. Sobram
~9 slots para: 5º minicurso Macros/VBA · Excel do Zero · DAX · e os 4 candidatos de §4.1
(Git · Carreira · crash courses de entrevista · banco de questões). **O teto fecha com folga
pequena** — cada entrada nova a partir daqui deve nomear qual candidato ela desloca.

---

## 9. Mapa curso → trilha (encaixe no catálogo) `[INFER]`

⚠️ **Pilar ≠ trilha.** O **pilar** (§1.1) é eixo de *catálogo* — controla quantos slots cada
tecnologia ocupa dentro do teto de 20. A **trilha** é eixo de *jornada do aluno* — atravessa
pilares. Um curso tem **exatamente um pilar** e pode estar em **várias trilhas**. Não fundir os dois.

| Trilha (`content.md` §4) | Cursos | Pilares atravessados |
|--------------------------|--------|----------------------|
| **1 · Comece por aqui (Fundamentos)** | Excel + IA (1) · *(candidato)* Excel do Zero · Eng. de Prompts (5) como intro | P1, P5 |
| **2 · Business Intelligence** | Power BI + IA (2) · PL-300 (3) · **Data Modeling (9)** *(pré-req)* | P2 |
| **3 · Dados + Código** | SQL + Claude (4) · Python + Claude (8) · *(novo)* Databricks conceitual | P3, P4 |
| **4 · Automação & IA Aplicada** | AI + Claude (6) · N8N (7) · *(candidato)* Macros/VBA + Claude · Antigravity (10, vitrine) | P5, P1 |
| **Transversal** | Eng. de Prompts p/ Dados (5) · *(candidatos §4.1)* Git · Carreira | P5 |

---

## 10. Tensões & decisões em aberto

- **T1 — Modelo Udemy×Escola:** ✅ **RESOLVIDO** (§1).
- **T2 — Reaproveitamento dos não-Excel:** ✅ **RESOLVIDO na parte que travava** (Ago 2026). O
  **ambiente** de SQL/Python deixou de ser pergunta aberta (D8: Databricks Free Edition, §1.2). A
  **fonte de conteúdo** continua sendo gravação nova — mas isso é esforço conhecido, não incógnita.
  Escopo confirmado pelo operador: **SQL e Python básicos, Camada Universal + dados e IA.**
- **T3 — Cursos "do zero" = risco de burnout:** 6, 7, 10 têm reaproveitamento ~zero + defasagem alta.
  **Máx. 1 curso "do zero" por ciclo**, intercalado com reaproveitáveis. ⚠️ **Continua válido e
  ganhou reforço:** o teto por pilar (§1.1) limita o pilar 5 (o de maior defasagem) a 3–4 slots.
  O Databricks conceitual **não aumenta** a conta de "do zero" do ciclo — ele substitui, na fila, um
  dos candidatos 🔴 já previstos.
- **T4 — Antigravity é selo, não curso** (manter 30–60 min, atualizável).
- **T5 — Sobra do Excel (§7.3):** incluir 5º minicurso Macros/VBA? Papel do "Excel do Zero"? → decisão sua.
- **T6 — Demanda ainda `[ESPEC]`:** parcialmente resolvida — SQL e Databricks agora têm número
  medido (§8.0). O resto do catálogo continua aguardando vidIQ curso a curso.
- **T7 — ROI de curso amplo × curso buscado** ⚠️ `[INFER]` **NOVA.** A receita é
  `assinantes × R$99,90`: o curso nº 17 **não aumenta nada** que já se recebe de quem assina. Logo o
  ROI de um curso novo = **(assinantes novos que traz) + (cancelamentos que evita)**. Consequência:
  curso **amplo mas não buscado** é alavanca de **retenção**, não de aquisição — vale fazer, mas
  **não resolve caixa de curto prazo**. Curso de nome buscado (`curso de sql`) **traz assinante**.
  **Ordem importa mais que amplitude.**
- **T8 — Concentração de fornecedor no ambiente** ⚠️ `[INFER]` **NOVA.** Com D8, vários cursos
  dependem do mesmo tier grátis de um terceiro. Mesma forma do risco de 79% de receita no
  carro-chefe. **Mitigação já embutida:** ensinar SQL que roda em qualquer lugar (§1.2) + o
  precedente do concorrente, que mantém o mesmo currículo em dois runtimes (§4.1). **Gatilho de
  reabertura:** ver `decisions-archive.md`, entrada Ago 2026 (8).

---

## 11. Próximos passos (um de cada vez)

**Verificações de ambiente (10–20 min cada, bloqueiam gravação — não bloqueiam o build):**
1. **Teste do Free Edition:** criar conta (confirmar que não pede cartão) e rodar
   `SELECT ai_query('databricks-claude-sonnet-4-5', 'Responda apenas: ok');` — depois o mesmo sobre
   uma tabela pequena. Resolve `[VERIFICAR]` de §1.2.
2. **Databricks University Alliance:** verificar elegibilidade. Pode zerar custo **e** resolver a
   cláusula de uso não-comercial.

**Catálogo:**
3. **Decidir a sobra do Excel** (T5): 5º minicurso Macros/VBA + Claude? "Excel do Zero" grátis ou incluso?
4. **Rodar vidIQ no Excel + IA** (§4) — validar keywords/ângulo e **quais aulas 🎬 valem** antes de gravar.
5. Abrir o **`curso-excel-ia.md`** (o primeiro `.md` de curso) com a lista de aulas final + achados vidIQ + roteiro.
6. Repetir o ciclo curso a curso, na ordem da matriz (§8), reordenando conforme o vidIQ chega.

> ⚠️ **Precedência sobre tudo acima:** este doc projeta o catálogo; **catálogo não gera assinante,
> distribuição gera** (§4.1). Enquanto `main` estiver parada e o LinkedIn sem o primeiro post,
> nenhuma linha deste arquivo produz receita. **Nada aqui deve virar câmera antes do build andar.**
> Virar doc, sim. Gravar, ainda não.

---

*Consolidado: Jun 2026 — fusão de `courses.md` + `mapeamento-cursos.md` em doc mestre único. Princípios
novos: número de cursos ABERTO (4 do Gemini = ponto de partida, não teto) + só gravar o relevante (filtro
vidIQ). Modelo Udemy×Escola resolvido. Excel + IA mapeado em definitivo (4 minicursos + candidatos da sobra:
Macros/VBA, Excel do Zero). Power BI/DAX/Data Modeling estruturais (Data Modeling tem semente → subiu na
matriz). Lacuna SQL/Python sinalizada. Cada curso terá seu próprio `.md` na produção. Aberto: T2 (SQL/Python),
T5 (sobra Excel), demanda via vidIQ.*

*Atualizado: Jun 2026 — adicionada §2.1 (reconciliação produção↔schema/UI): enum `UNIVERSAL/MODERNO/IA` (agnóstico; "Excel 365" = exemplo só no Excel), selo opcional via `Course.camadas[]` (curso pode ter 1–3 camadas), %/“reaproveitado”/jargão ficam internos (não vão pra UI), textos+ícones globais (stack-2·bolt·sparkles, azul só na IA), override por curso é exceção. Coluna "Enum schema/UI" na tabela da §2. Ver CLAUDE.md (build) + content.md §15 (copy).*

*Atualizado: Ago 2026 — **reestruturação estratégica do catálogo (5 pilares + teto de 20 + rotação).**
§0 princípio 1 reescrito: número aberto → **TETO de 20 cursos, 2–5h** (validado externamente contra o
analystbuilder, §4.1). §0 ganha o **princípio 3 — Regra do Satélite** ("…para quem trabalha com dados"),
que abre o catálogo pelo COMPRADOR, não pelo tema. §1 ganha **D8** (Databricks Free Edition como
ambiente único), **D9** (catálogo rotativo + política de arquivamento), **D10** (Camada IA em dois
modos: Pessoal/Empresa), **D11** (lei anti-defasagem com teste mecânico) e **D12** (runtime nunca vira
título nem SEO). Novas §1.1 (os 5 pilares com alocação de slots: Excel 5–6 · Power BI 4–5 · SQL 3 ·
Python 3 · IA 3–4 — IA deliberadamente o menor) e §1.2–1.5 detalhando D8/D9/D10/D11. **Correção de
premissa registrada:** Databricks NÃO é Microsoft — o argumento válido é grátis + zero instalação +
setup único, não "coerência Microsoft". Nova §4.1: benchmark de engenharia de catálogo contra o
analystbuilder (20 cursos exatos; runtime≠título; sufixo como cerca; certificado é padrão da categoria;
IA governada provada como aula gravável; ele mantém dois runtimes = plataforma intercambiável), + 4
candidatos novos (Git · Carreira · crash courses de entrevista · banco de questões) + o registro da
assimetria de funil (o catálogo dele é CONSEQUÊNCIA do público, não causa). Nova §8.0 com demanda
MEDIDA no vidIQ (`sql` 42.436/mês BR × `databricks` 2.975/mês BR; zero outlier PT-BR em Databricks) —
é o dado que sustenta D12. §8.1 ganha o **Databricks conceitual** como curso próprio (conceito não
defasa; NÃO é pré-requisito de nada; entra depois de SQL) e a trava explícita de **ordem de gravação**
(Excel + IA primeiro). §9 separa **pilar (catálogo) de trilha (jornada)** — um curso tem 1 pilar e
pode estar em N trilhas. §10: **T2 resolvida na parte que travava** (ambiente decidido; conteúdo é
gravação nova conhecida), T6 parcialmente resolvida, e **T7 (ROI: curso amplo retém, curso buscado
adquire)** e **T8 (concentração de fornecedor no ambiente)** adicionadas. §11 reordenada com as
verificações de ambiente na frente. Gatilhos de reabertura em `decisions-archive.md` → Ago 2026 (8).*
