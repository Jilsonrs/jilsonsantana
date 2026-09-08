# DESIGN.md — Direção Visual & Design System

> **Fonte de verdade visual do projeto.** Identidade e estratégia: `project-description.md` ·
> Convenções de engenharia: `CLAUDE.md` · Stack: `tech-stack.md`.
> Princípio que rege tudo: **IA no DNA** — *a escola não ensina IA, a escola É IA.*
>
> **Este documento é vivo, não pedra.** *(direção do operador, Set 2026: "não adianta ser a escola
> de IA com documentos como rocha"; "se o Opus 6 ou 7 revir o que fizemos e resolver reescrever
> melhor, faremos — funciona para o momento atual, daqui a 2 anos pode ser outra coisa".)*
>
> **Um modelo futuro reescrever isto é o funcionamento esperado, não uma falha.** É por isso que
> cada decisão carrega um **gatilho de reabertura**: sem ele, uma escolha vira dogma (ninguém ousa
> tocar) ou vira ruído (todo mundo ignora). Com ele, quem chega depois sabe exatamente **que evento
> torna a decisão obsoleta** — e pode reabrir com segurança em vez de adivinhar.
>
> **A exceção, e é uma só:** as travas de **acessibilidade** (contraste, teclado, tamanho mínimo de
> texto) não são moda e não têm gatilho. Elas não descrevem gosto de 2026 — descrevem quem
> consegue usar o produto. Essas ficam.

---

## 0. Quem faz o quê (parceria de design)

**O front-end tem DOIS autores, e isso é desenho, não improviso** *(Set 2026)*:

- **Direção de arte — agente parceiro (Gemini/Antigravity).** Concebe e constrói mockups em
  HTML/CSS dentro de `design-lab/`, **e depois formata o resultado direto no código do app**. Este
  último passo é deliberado: ele elimina a etapa em que a engenharia traduz o mock e perde
  acabamento no caminho.
- **Engenharia — Claude Code.** Constrói a estrutura, a lógica e os testes; incorpora aqui o que o
  estúdio aprovou; mede contraste.
- **As instruções operacionais do parceiro vivem em [`design-lab/GEMINI.md`](../design-lab/GEMINI.md)**
  — quais arquivos ele toca, quais não toca, as sete regras e como ele verifica que não quebrou
  nada. **Esse arquivo é versionado; o resto de `design-lab/` não é.**

**`design-lab/` é o ESTÚDIO; este arquivo é a LEI.** O que for aprovado no estúdio é incorporado
aqui, e é **aqui** que se consulta. **Por que a distinção existe:** dois documentos se declarando
"fonte da verdade" divergem em semanas — a falha que a regra *git-wins* do `CLAUDE.md` existe para
impedir. Mock é exploração: vale enquanto não contradiz esta lei; contradisse e a ideia é melhor?
**Reescreva esta lei**, não conviva com as duas.

**Os mocks NÃO são versionados** (`.gitignore`: `design-lab/*` + `!design-lab/GEMINI.md`). São
exploração descartável, e o que importa deles já está aqui. **Consequência a saber:** num clone
novo a pasta chega só com o `GEMINI.md` — se você procurar um mock citado num commit antigo e não
achar, não é defeito, é o desenho.

**A rede de segurança que torna isso seguro são os TESTES.** O parceiro edita `.tsx` de verdade, e
o que o impede de apagar acessibilidade sem querer não é a boa vontade dele: é a suíte reprovar.
Expansão por teclado, `aria-current`, rótulo do rail recolhido, visibilidade por papel e destino de
link **têm teste**. Por isso a regra correspondente no `GEMINI.md` é *"não edite o teste, avise"* —
teste ajustado para passar deixa de proteger.

---

## 1. Tese de design

A coisa mais característica do produto não é o Jilson nem "+100 mil alunos" — é o **momento em que
a IA transforma um objetivo do aluno num caminho.** Então o design não abre com headshot + barra de
stats (resposta-template). Abre com **a IA em ação.**

**Clima:** editorial, imaculado, premium — claro, arejado, calmo, silencioso. Muito respiro,
tipografia grande e confiante, transições leves. Nada de "tech-autoridade" escuro, nada de
gradiente berrante, nada de gamificação. **A elegância vem da precisão** (espaçamento, tipo,
detalhe), não da decoração. A IA aparece **natural e fluida**, nunca intimidadora.

**A cor é dele.** Sobre o branco, **um único acento azul #238FE8** (o azul da logomarca) carrega
marca, ação e o "brilho" do JilsonAI. Disciplina total: um acento, muito neutro em volta.

**Leveza é requisito técnico, não gosto** *(princípio do parceiro de design, aprovado pelo
operador — "Acessibilidade de Performance / Realidade Brasileira")*. Boa parte do público acessa de
aparelho antigo e conexão móvel instável. Estética premium **não** justifica peso: sem biblioteca
pesada em runtime, sem dependência externa em caminho crítico, animação sempre degradando com
elegância.

---

## 2. Elemento-assinatura (o que a página é lembrada por)

**A trilha que se monta sozinha.** No hero, o aluno digita (ou escolhe) um objetivo em linguagem
natural — *"quero virar analista de dados"* — e, na frente dele, o JilsonAI **monta uma trilha
nomeada**, agrupada por competência, com cursos e aulas aparecendo em sequência suave. É um **demo
vivo**, não uma ilustração: a tese ("a escola É IA") visível em 4 segundos.

- No load, roda uma vez sozinha (sequência **roteirizada**, sem API).
- Interatividade via **presets**: 3–4 objetivos-chip que mapeiam para trilhas **pré-computadas e
  versionadas no front**. Trocar o chip remonta → prova interativa **sem chamar a Claude API**.
- `prefers-reduced-motion`: mostra o resultado final montado, sem a animação de digitação.

> **TRAVA — o hero público NUNCA chama a Claude API.** Motivo: latência, custo e superfície de
> abuso (anônimo martelando a API na vitrine). A montagem **real** de trilha só roda na área
> logada (`recommendTrilha` / `buildLearningPlan`). *Gatilho: só se houver proteção de abuso e
> orçamento medido — não antes.*

**Motivo de ser não-template:** o hero óbvio seria foto + "104K alunos" + CTA, que qualquer escola
faz. A trilha auto-montável é a única coisa que **só esta escola** pode mostrar, e é literalmente o
produto. **A ousadia se gasta aqui; o resto fica quieto.**

**A marca no layout:** o "**#**" da logomarca vira marcador estrutural discreto — eyebrow de seção,
marcador de item. Com parcimônia.

---

## 3. Paleta (tokens)

```css
:root {
  /* Superfícies claras — o produto */
  --background:        #FFFFFF;   /* fundo do conteúdo */
  --surface-alt:       #F8FAFC;   /* quebra de seção / coluna secundária */
  --card:              #FFFFFF;

  /* Texto */
  --foreground:        #0A0A0B;   /* títulos e corpo */
  --muted-foreground:  #737373;   /* texto secundário — o mais claro que passa AA */
  --brand-gray:        #838383;   /* cinza RGB 131 da LOGOMARCA — ver trava abaixo */

  /* Acento — o azul da marca, ÚNICO */
  --primary:           #238FE8;   /* botões, links, item ativo, brilho JilsonAI */
  --primary-foreground:#FFFFFF;
  --primary-hover:     #1A6FBB;
  --primary-tint:      rgba(35,143,232,0.08); /* glows, chips, fill do medidor */
  --ring:              #238FE8;   /* foco visível */

  /* Linhas */
  --border:            #E8ECF1;   /* hairline estrutural */
  --border-fine:       rgba(0,0,0,0.03); /* fio de cabelo — DECORATIVO só */

  /* Rail escuro — nível 1 da navegação (§6) */
  --rail:              #0A0A0B;   /* a ÚNICA superfície escura do produto */
  --rail-foreground:   #A1A1AA;   /* ícones e rótulos inativos */
  --rail-item-ativo:   #303236;   /* fundo do item ativo */

  /* Semânticos — discretos */
  --success:           #1FA97E;
  --destructive:       #E5484D;
  --radius:            12px;
}
```

**Regra de ouro:** sem cor hardcoded — sempre os tokens semânticos (`bg-background`,
`text-muted-foreground`, `text-primary`, `border-border`). Dark mode **não** entra no MVP; o rail é
a exceção deliberada ao "produto claro", e **ser a única** é o que impede a segunda linguagem
visual.

### TRAVAS DE CONTRASTE — medidas, não estimadas *(Set 2026)*

> **Nenhum número aqui é lembrado; todos foram calculados sobre os tokens reais.** Mudou um token,
> **meça de novo**. Régua: **4,5:1** para texto; **3:1** para ícone, borda estrutural e texto grande
> (≥24px, ou ≥18,7px em negrito).

| Par | Medido | Veredito |
|---|---|---|
| `--rail-foreground` sobre `--rail` | 7,72:1 | ✅ |
| `--primary` sobre `--rail` (item ativo) | **5,81:1** | ✅ |
| `--muted-foreground` sobre branco | 4,74:1 | ✅ |
| `--muted-foreground` sobre `--surface-alt` | 4,53:1 | ✅ |
| `--brand-gray` sobre branco | 3,79:1 | ❌ **texto, não** |
| `--border-fine` sobre branco | 1,07:1 | decorativo só |

- **`--brand-gray` NÃO serve para texto.** É cor de **logomarca**: wordmark, grafismo e texto
  **grande**. Para texto secundário existe `--muted-foreground` (#737373), escolhido por busca como
  **o cinza mais claro que ainda passa nos dois fundos** — o mais próximo possível da marca sem
  reprovar. *(A versão anterior deste doc dizia "usar só em texto ≥16px", regra ERRADA: o WCAG
  libera 3:1 só para texto GRANDE, e 16px não é grande. A licença era mais larga que a norma.)*
- **`--border-fine` é decorativo.** Quebra de seção sem linha dura, sim; separador de item,
  contorno de campo ou indicador de ativo, **não** — esses precisam de 3:1, use `--border` ou azul.
- **No escuro o azul passa sozinho; no claro, não.** `--primary` sobre o rail dá 5,81:1; sobre um
  azul-claro dá **2,96:1** e reprova. **Não copie o tratamento de um para o outro** — em superfície
  clara, azul sobre azul precisa de tom escurecido.

---

## 4. Tipografia — a alma da interface

```css
--font-display:  'MuseoModerno', system-ui;     /* marca + títulos — a fonte da logomarca */
--font-body:     'Hanken Grotesk', system-ui;   /* corpo e UI */
--font-mono:     'JetBrains Mono', monospace;   /* código, fórmulas, etiquetas */
--font-emphasis: 'Playfair Display', serif;     /* itálico — UMA palavra por título */
```

- **MuseoModerno** (600/700) — geométrica e arredondada, carrega a personalidade do Jilson. Com
  **restrição**: wordmark, H1/H2/H3, números grandes. Nunca em corpo.
- **Hanken Grotesk** (400/500/600) — corpo, menus, botões. Quente sem ser fria, legível no longo.
- **JetBrains Mono** — código, DAX/SQL, fórmulas e **micro-etiquetas** (`[ SKILLS • COWORK ]`),
  maiúsculas com `letter-spacing: 0.1em`. Escolha ancorada no assunto: o produto é dados.
- **Playfair Display Itálico** (600) — **o charme editorial, e a regra é a restrição**: destaca
  **UMA palavra** dentro de um título da MuseoModerno, em `--primary` (ex.: "Stack *moderno*"). É a
  mistura de peso geométrico com serifa em itálico que faz o título parecer editorial em vez de
  genérico. **Nunca em frase inteira, nunca em corpo, no máximo um destaque por título** — usada em
  tudo, deixa de destacar e vira enfeite.

### Escala

| Papel | Tamanho | Peso | Fonte |
|-------|---------|------|-------|
| Hero H1 | `clamp(2.5rem, 6vw, 4.5rem)` | 600 | MuseoModerno |
| Seção H2 | `clamp(1.75rem, 3vw, 2.5rem)` | 600 | MuseoModerno |
| Título de página (logado) | 1,75rem | 600 | MuseoModerno |
| Card H3 | 1,25rem | 600 | Hanken Grotesk |
| Corpo | 1,0–1,125rem | 400 | Hanken Grotesk |
| Legenda/meta | 0,875rem | 400 | Hanken Grotesk |
| Micro-etiqueta | **0,75rem** (mínimo absoluto) | 400 | JetBrains Mono |

Corpo com `line-height` 1,6–1,8 e medida ~66ch. **Nada abaixo de 0,75rem (12px)** — ver §9.

---

## 5. Layout & espaçamento

- **Respiro:** seções públicas `py-24`/`py-32`; conteúdo `max-w-6xl` (texto corrido `max-w-[1000px]`).
  **Nunca espremer.** O conteúdo expande naturalmente até o limite estrutural, sem se sentir
  confinado em caixas desnecessárias.
- **Ritmo de fundo:** alterna `--background` e `--surface-alt` para separar seções **sem linha
  dura**.
- **Cantos:** `--radius` (12px) em cards e superfícies; 16px em cards grandes; `rounded-full` em
  botões e chips.
- **Sombra:** quase nada. Difusa e suave, nunca dura. **Cuidado com blur grande em grade de
  cards** — é das operações de pintura mais caras, e contraria a trava de leveza do §1.
- **Grade:** 1 coluna (mobile) → 2 (`md`) → 3 (`lg`).
- **A área logada é MAIS DENSA que a landing:** `py-8`/`py-12`, `gap-4`/`gap-6`. O aluno volta ali
  todo dia — a landing impressiona, o painel trabalha.

### Wireframe da landing

```
┌──────────────────────────────────────────────┐
│  #Jilson Santana          [Entrar] [Assinar]   │  nav — fina, branca, sticky
├──────────────────────────────────────────────┤
│  Torne-se um especialista em dados na era da IA│  HERO
│  ┌────────────────────────────────────────┐    │  ← ASSINATURA:
│  │ objetivo: "virar analista de dados"  ▸ │    │    trilha se monta
│  │ → Trilha: Fundamentos · BI · Dados+IA  │    │    sozinha, ao vivo
│  └────────────────────────────────────────┘    │
│  [Começar agora]   +100 mil alunos · simples   │
├──────────────────────────────────────────────┤
│  Tudo numa assinatura só.  (3 pilares)         │  surface-alt
│  # Cursos que você aplica amanhã               │
│  # JilsonAI: você nunca trava sozinho  ← herói │
│  # Sempre à frente da curva                    │
├──────────────────────────────────────────────┤
│  Como funciona (trilhas + certificado)         │  branco
├──────────────────────────────────────────────┤
│  O JilsonAI em ação (chat + medidor calmo)     │  surface-alt
├──────────────────────────────────────────────┤
│  Preço — R$99,90/mês · anual ~R$995            │  branco — 1 card, claro
├──────────────────────────────────────────────┤
│  FAQ  ·  Footer (#Jilson · YouTube · termos)   │
└──────────────────────────────────────────────┘
```

> Ordem definitiva das seções é decisão de construção. Onboarding do aluno logado é **aberto**:
> trilhas e cursos navegáveis livremente; `recommendTrilha` é ajuda opcional, **nunca portão**.

---

## 6. Área logada — navegação em TRÊS NÍVEIS

A área logada é um **shell de aplicação**, não uma landing. Herda a marca (tokens, fontes, cantos,
hairlines, foco visível), **não** herda a escala do hero, o ritmo `py-24`, o elemento-assinatura nem
os scroll reveals. Logado é mais denso e mais quieto.

> **Esta seção REVERTEU duas decisões anteriores, as duas do operador, com gatilho.** Não voltar
> atrás sem dado novo.
> **REVERSÃO 1 — o nível 2 existe.** Dizia-se *"sem segunda coluna de navegação; um produto solo
> não sustenta dois níveis de cromo"*. O argumento era carga; o contrário se mostrou verdadeiro: a
> estrutura pronta **reduz** a carga, porque cada tela **declara** seus níveis em vez de reinventar
> navegação. *Gatilho: se o mapa de navegação virar manutenção maior que as telas que serve.*
> **REVERSÃO 2 — o rail é escuro.** Dizia-se *"nunca escuro — introduz uma segunda linguagem
> visual"*. Referência: painel de instrutor da Udemy. O escuro fica **confinado ao nível 1**, que é
> o que separa cromo de conteúdo. *Gatilho: se o nível 2 também precisar escurecer para não brigar
> com o rail, a segunda linguagem terá acontecido de fato — reabrir.*

**Cada tela liga só os níveis que precisa.** A navegação é **dado** (`client/src/lib/navigation.ts`),
não código espalhado: uma tela nova declara seus níveis e o cromo se monta sozinho.

### Nível 1 — Rail escuro (esquerda)

- Fundo `--rail`. **Recolhido: 80px** (só ícones + o "#" da marca). **Expandido: 280px.**
- Expande ao **passar o mouse** *e* ao **receber foco de teclado**, **sobrepondo** o conteúdo
  (`position: fixed` + espaçador que reserva os 80px). Sombra densa ao expandir, para descolar do
  conteúdo.
- **Item ativo — "glow timeline":** ponto luminoso azul (`box-shadow` radial) + linha fina em
  gradiente descendo, imitando uma jornada. Ícone e rótulo em `--primary`. É o **único** lugar onde
  o azul aparece no rail: hover é **neutro**, senão o rail perde o sinal de "onde estou".
- **TRAVA de acessibilidade:** o rótulo recolhido usa `opacity: 0` + `white-space: nowrap`, **nunca
  `display:none`** — assim continua na árvore de acessibilidade e o leitor de tela o anuncia nos
  dois estados. E expandir **só por mouse** excluiria quem navega por teclado: as duas condições
  andam juntas, sempre. *(Isto é norma de acessibilidade — WCAG 2.1.1, operável por teclado —, não
  preferência do agente.)*

### Nível 2 — Coluna secundária (meio)

- Aparece quando a seção tem subitens.
- Fundo `--surface-alt`, largura ~280px, hairline à direita.
- **Acordeão nativo `<details>/<summary>`** para grupos retráteis: ícone `+` que gira para `×`,
  separadores finos. Nativo por três motivos — sem JavaScript, acessível de graça, e o conteúdo
  existe no HTML mesmo fechado.
- Item ativo: texto `--primary` + borda esquerda azul de 2px.

### Nível 3 — Abas horizontais (topo do conteúdo)

- Só quando a tela tem abas. Sublinhado azul de 2px no ativo, com brilho suave; inativas em
  `--muted-foreground`.
- Assentam sobre a hairline da área de conteúdo (`margin-bottom: -1px`).

### Conteúdo (direita)

- Fundo branco. **"Luz de IA":** um `radial-gradient` azul quase invisível (~3% de opacidade) no
  canto superior, dando volume e assinatura sem custar leitura.

### Mobile (< 768px)

- O rail vira **gaveta** (off-canvas), aberta por botão no cabeçalho.
- **TRAVA — a gaveta navega em PROFUNDIDADE.** `Comunicação ›` entra no submenu, `‹ Menu` volta.
  **Esconder o nível 2 no celular sem alternativa deixaria as sub-páginas inalcançáveis** — o
  aparelho mais usado ficaria com menos navegação, não com navegação diferente.

### TRAVA — o app não sequestra o scroll

**Nada de `height: 100vh; overflow: hidden` no `body`.** Duas quebras reais: `100vh` está errado em
navegador de celular (a barra de endereço entra na conta — use `svh`), e travar o scroll do
documento quebra página de curso longa e o catálogo público. O rail é `fixed`, o que já entrega o
efeito de painel **sem** tirar o scroll natural do documento.

---

## 7. Componentes-chave

**Públicos**
- **HeroTrilhaDemo** — a assinatura (§2). Presets pré-computados, **sem** Claude API.
- **PillarCard** (3) — ícone Lucide, título MuseoModerno, uma frase. O JilsonAI ganha destaque leve
  (tint azul), sem virar carnaval.
- **PriceCard** — um card claro, sem tabela de comparação pesada. Mensal em destaque, anual como
  "economize ~17%". Nada de "de/por" agressivo.
- **FAQ** — `<details>/<summary>`, com o texto **no HTML**. Não é preferência: conteúdo atrás de
  clique que busca dados é invisível para o crawler (`CLAUDE.md` → Rendering Boundary).

**Compartilhados**
- **Card** — fundo branco, borda `--border-fine`, raio 12–16px. **Hover:** sobe
  (`translateY(-4px)`), a sombra cresce um pouco e a borda fica sutilmente azul. Ícone do card num
  círculo `--surface-alt` com o glifo em `--primary`.
- **Lista customizada** — **nunca bolinha**. O marcador é um travessão azul
  (`content: '—'; color: var(--primary); font-weight: 700`).
- **Micro-badge** — etiqueta monoespaçada minúscula com ponto azul ao lado simulando status.
  **Piso de 0,75rem** (§9).
- **Campo de IA (prompt)** — cantos arredondados, ícone dentro, e no `:focus-within` a borda vira
  azul com brilho difuso. É o componente que faz a IA parecer fluida em vez de intimidadora.
- **Button** — primary `--primary` sólido, `rounded-full`, hover `--primary-hover` + `scale-[1.01]`;
  secondary é contorno fino. Foco visível sempre.

**Do aluno**
- **TrilhaCard / CourseCard / LessonRow** — thumbnail, título, duração, progresso. A aula é
  first-class (aparece sozinha em busca e em trilha).
- **JilsonAIChat** — painel calmo, bolhas claras; o brilho azul só no avatar e na ação.
- **UsageMeter** — cápsula horizontal, trilho `--surface-alt`, fill `--primary-tint → --primary`,
  rótulo *"uso do mês"*. **Calmo e positivo, nunca countdown.**
- **Certificate** — nome da trilha + **competências cobertas** (o que vale para o RH).
- **CertificatePublicPage** — o certificado é **mídia de aquisição**: página pública **opt-in**
  (`isPublic`, LGPD), **OG image dedicada** gerada no servidor junto com o PDF, botão "Adicionar ao
  LinkedIn" e **UTM `utm_source=certificate`** em todo link de volta. Fecha o loop com a captura de
  atribuição e torna cada formado um canal rastreável.

---

## 8. Movimento e micro-interações

- **Revelação suave:** elementos "nascem" — `opacity: 0 → 1` com `translateY(20px) → 0`. **Só nas
  entradas de seção**, curto (~250ms, ease-out), nunca em tudo.
- **Hover:** cards e botões flutuam sutilmente e revelam **glow** (sombra azul difusa) em vez de
  borda dura.
- **Load do hero:** a trilha se monta uma vez. É o momento que vende, e é onde o movimento se
  concentra.
- **Medidor:** preenche suave ao carregar — transmite uso, não ansiedade.
- **`prefers-reduced-motion` sempre respeitado:** corta transição e animação, **mantém o conteúdo
  final** — nunca deixa alguém sem ver o resultado.
- **Cuidado:** excesso de animação faz parecer "gerado por IA". Menos é mais — a assinatura
  concentra o movimento, o resto é quase parado. **Nada que rode continuamente.**

---

## 9. Piso de qualidade (não-negociável)

- **Contraste AA** — números e regras em §3. O cinza da logomarca **reprova para texto**.
- **Tamanho de texto é decisão do operador**, não regra deste documento. *(Set 2026: um piso de
  0,75rem chegou a ser escrito aqui pelo agente, por julgamento próprio, e o operador decidiu
  diferente ao ver a tela. O WCAG não exige tamanho mínimo — exige que o texto sobreviva a 200% de
  ampliação, o que unidade relativa já garante.)*
- **Foco de teclado visível** em tudo (`--ring`), e **toda** interação alcançável por teclado.
- **Responsivo de 320px a 1920px** (testar 375 / 768 / 1024 / 1440).
- **`prefers-reduced-motion`** respeitado.
- **Carregamento < 3s** — e lembrar que ~1,2s do orçamento já pode ir para acordar o banco no
  primeiro acesso do dia (medição em `implementation-plan.md`).
- **Sem dependência externa em caminho crítico** — ver §10.

---

## 10. Carregamento de fontes — LOCAL, não CDN

**As quatro famílias são hospedadas no projeto** (`woff2`, subconjunto latino, `font-display: swap`,
`preload` só nas duas do primeiro dobra).

**Escolha DELEGADA ao agente pelo operador** *(Set 2026: "seja fontes locais ou remotas, desde que
o resultado final seja tão lindo e premium")* — o visual é idêntico nos dois caminhos, então a
decisão virou técnica.

**Por que não o CDN do Google**, e o motivo é o mesmo §1: são requisições
bloqueantes a um terceiro no caminho crítico, exatamente para o público de conexão instável que a
trava de leveza protege. Somam-se dois motivos independentes: as rotas públicas viram **template de
servidor sem bundle** na Fase 3, e reintroduzir um CDN desfaria parte do ganho; e o CDN do Google
entrega o IP do visitante a um terceiro — evitável de graça hospedando o arquivo.

*Gatilho de reabertura: se o custo de manter os arquivos passar a doer, ou se medição mostrar o
local mais lento que o CDN — aí é dado novo.*

---

## 11. Copy na interface

- Voz da marca: tornar o complexo simples. Curto, direto, ativo. Frase de produto, não jargão.
- Botões dizem o que acontece — **"Começar agora"**, **"Assinar"**, **"Continuar trilha"**, nunca
  "Enviar". A ação mantém o nome no fluxo inteiro.
- Erros não pedem desculpa nem são vagos: dizem **o que houve e como resolver**.
- Tela vazia é **convite à ação**, não decoração — e sempre com saída (um link para onde ir).
- Evitar: guru, ninja, hack, "mágica da IA", "destrave seu potencial".
  Usar: aplicar, prática, simples, no seu ritmo, especialista, era da IA.

---

## 12. Iconografia, imagens, favicon e OG

- **Ícones:** Lucide, traço fino, monocromáticos (herdam `currentColor`). Sem ícone colorido.
- **Favicon:** o "**#**" da logomarca em `--primary` sobre branco.
- **OG image:** wordmark #Jilson Santana + a tagline sobre fundo claro com um respiro do azul.
  Limpo. **Toda rota pública precisa da sua** — sem OG, compartilhar gera card genérico.

---

*Atualizado Set 2026 — **reescrito**, incorporando o design system do parceiro de arte
(`design-lab/design-ia-apple.md` + `ia-apple.html`): navegação em três níveis detalhada, quarta
fonte (Playfair itálico como ênfase de uma palavra), acordeão nativo, glow timeline no item ativo,
luz de IA no conteúdo, cards com lift, lista com travessão, campo de IA com brilho no foco.*
*O que foi **corrigido** em cima do mock, com medição: o cinza da marca reprova AA para texto
(3,79:1 → `--muted-foreground` #737373); `--border-fine` é decorativo e não serve de separador
estrutural; piso de 0,75rem para texto; fontes locais em vez do CDN; e **nada de
`100vh`/`overflow:hidden` no body**, que quebraria página longa e o scroll no celular.*
*O que foi **preservado** do doc anterior: a tese, o elemento-assinatura e sua TRAVA de não chamar
a API no hero público, o certificado como canal de aquisição, o medidor calmo, as regras de copy, e
as duas reversões do §6 com seus gatilhos.*
