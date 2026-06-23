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

## 0. Como usar este doc (2 princípios que regem tudo)

1. **O número de cursos é ABERTO.** O Gemini mapeou 4 minicursos de Excel — isso foi o **ponto de
   partida, não o teto**. Se o restante do ativo (Macros/VBA, básico, Solver, DAX…) ainda for relevante,
   vira curso. Quem decide se vira é **relevância estratégica + demanda real (vidIQ)** — nunca "porque
   está gravado".
2. **Só se grava o que for relevante.** Cada aula nova (🎬) passa pelo filtro: *tem demanda (vidIQ) E/OU
   é estrategicamente necessária?* Se não tem nenhum dos dois → **não grava**. Isso protege seu tempo de
   operador solo: o ativo já gravado é reaproveitado de graça; o esforço novo só vai onde paga.

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

### Modelo Udemy × Escola (por curso) `[FATO, sua decisão]`

A regra: **Udemy fica com a base; escola fica com base + Camada IA + extras; a Camada IA é sempre exclusiva.**

| # | Curso | Na Udemy | Na Escola | Exclusivo da escola |
|---|-------|----------|-----------|----------------------|
| 1 | **Excel + IA** | Carro-chefe **congelado + Quiz**. | **Remontado em minicursos** 3 camadas — entrega diferente. | Remontagem + 365 + IA |
| 2 | **Power BI + IA** | Base igual no início. | Base + **Camada IA** ("se explica sozinho"). | A parte de IA |
| 3 | **PL-300** | Igual. | Igual + **aulas adicionais**. | Aulas adicionais (tutor/simulados) |
| 4 | **SQL + Claude** | Base. | Base + **aulas adicionais**. | Aulas adicionais (Claude) — *fonte a definir, §7.4* |

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

## 6. O Slate — fichas dos cursos (número aberto, ver §0)

> 🟢 reaproveitamento alto/esforço baixo · 🟡 misto · 🔴 do zero/risco de defasagem. Demanda hoje = `[ESPEC]`.

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

## 8. Matriz comparativa (priorização — preliminar, pré-vidIQ) `[INFER]/[ESPEC]`

Notas 1–5; **Demanda = `[ESPEC]` até o vidIQ.** Esforço: 5 = fácil (reaproveita).

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

---

## 9. Mapa curso → trilha (encaixe no catálogo) `[INFER]`

| Trilha (`content.md` §4) | Cursos |
|--------------------------|--------|
| **1 · Comece por aqui (Fundamentos)** | Excel + IA (1) · *(candidato)* Excel do Zero · Eng. de Prompts (5) como intro |
| **2 · Business Intelligence** | Power BI + IA (2) · PL-300 (3) · **Data Modeling (9)** *(pré-req)* |
| **3 · Dados + Código** | SQL + Claude (4) · Python + Claude (8) |
| **4 · Automação & IA Aplicada** | AI + Claude (6) · N8N (7) · *(candidato)* Macros/VBA + Claude · Antigravity (10, vitrine) |
| **Transversal** | Eng. de Prompts p/ Dados (5) |

---

## 10. Tensões & decisões em aberto

- **T1 — Modelo Udemy×Escola:** ✅ **RESOLVIDO** (§1).
- **T2 — Reaproveitamento dos não-Excel:** parcialmente resolvido. Excel/PBI/DAX/Data Modeling têm fonte
  no ativo. **SQL e Python NÃO** (§7.4) → aguarda sua resposta.
- **T3 — Cursos "do zero" = risco de burnout:** 6, 7, 10 têm reaproveitamento ~zero + defasagem alta.
  **Máx. 1 curso "do zero" por ciclo**, intercalado com reaproveitáveis. ⚠️
- **T4 — Antigravity é selo, não curso** (manter 30–60 min, atualizável).
- **T5 — Sobra do Excel (§7.3):** incluir 5º minicurso Macros/VBA? Papel do "Excel do Zero"? → decisão sua.
- **T6 — Demanda ainda `[ESPEC]`:** nenhuma ordem de gravação além do launch fecha antes do vidIQ do curso.

---

## 11. Próximos passos (um de cada vez)

1. **Decidir a sobra do Excel** (T5): 5º minicurso Macros/VBA + Claude? "Excel do Zero" grátis ou incluso?
2. **Confirmar SQL/Python** (§7.4): tem gravado? Manda os índices se sim.
3. **Rodar vidIQ no Excel + IA** (§4) — validar keywords/ângulo e **quais aulas 🎬 valem** antes de gravar.
4. Abrir o **`curso-excel-ia.md`** (o primeiro `.md` de curso) com a lista de aulas final + achados vidIQ + roteiro.
5. Repetir o ciclo curso a curso, na ordem da matriz (§8), reordenando conforme o vidIQ chega.

---

*Consolidado: Jun 2026 — fusão de `courses.md` + `mapeamento-cursos.md` em doc mestre único. Princípios
novos: número de cursos ABERTO (4 do Gemini = ponto de partida, não teto) + só gravar o relevante (filtro
vidIQ). Modelo Udemy×Escola resolvido. Excel + IA mapeado em definitivo (4 minicursos + candidatos da sobra:
Macros/VBA, Excel do Zero). Power BI/DAX/Data Modeling estruturais (Data Modeling tem semente → subiu na
matriz). Lacuna SQL/Python sinalizada. Cada curso terá seu próprio `.md` na produção. Aberto: T2 (SQL/Python),
T5 (sobra Excel), demanda via vidIQ.*

*Atualizado: Jun 2026 — adicionada §2.1 (reconciliação produção↔schema/UI): enum `UNIVERSAL/MODERNO/IA` (agnóstico; "Excel 365" = exemplo só no Excel), selo opcional via `Course.camadas[]` (curso pode ter 1–3 camadas), %/“reaproveitado”/jargão ficam internos (não vão pra UI), textos+ícones globais (stack-2·bolt·sparkles, azul só na IA), override por curso é exceção. Coluna "Enum schema/UI" na tabela da §2. Ver CLAUDE.md (build) + content.md §15 (copy).*
