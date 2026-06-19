# DESIGN.md — Direção Visual & Design System

> **SUBSTITUI** o design.md antigo (era consultoria: dark, $119, Service 6). Aquele está morto.
> Fonte de identidade: **PROJECT_DESCRIPTION.md** · Convenções de UI: **CLAUDE.md** · Stack: **tech-stack.md**.
> Princípio que rege tudo: **AI no DNA** — *a escola não ensina IA, a escola É IA.*

---

## 1. Tese de design

A coisa mais característica do produto não é o Jilson nem um número de "+100 mil alunos" — é o
**momento em que a IA transforma um objetivo do aluno num caminho.** Então o design não abre com
headshot + barra de stats (resposta-template). Abre com **a IA em ação.**

**Clima:** Apple — claro, arejado, calmo, premium, acessível. Branco, muito respiro, tipografia
grande e confiante, imagens bonitas, transições leves. Nada de escuro "tech-autoridade", nada de
gradientes berrantes, nada de gamificação. A elegância vem da **precisão** (espaçamento, tipo,
detalhe), não da decoração.

**A cor é dele.** Sobre o branco Apple, **um único acento azul #238FE8** (o azul da logomarca)
carrega marca, ação e o "brilho" do JilsonAI. Disciplina total: um acento, muito neutro em volta.

---

## 2. Elemento-assinatura (o que a página é lembrada por)

**A trilha que se monta sozinha.** No hero, o aluno digita (ou escolhe) um objetivo em linguagem
natural — *"quero virar analista de dados"* — e, na frente dele, o JilsonAI **monta uma trilha
nomeada**, agrupada por competência, com cursos e aulas aparecendo em sequência suave. É um
**demo vivo**, não uma ilustração. É a tese ("a escola É IA") tornada visível em 4 segundos.

- No load, roda uma vez sozinha (uma demo curada, sem precisar o aluno digitar).
- O aluno pode trocar o objetivo e ver montar de novo → prova interativa antes do cadastro.
- `prefers-reduced-motion`: mostra o resultado final montado, sem a animação de digitação.

**Motivo escolhido (não-template):** o hero óbvio seria foto + "104K alunos" + CTA. Isso é o que
qualquer escola faz. A trilha auto-montável é a única coisa que **só esta escola** pode mostrar, e
é literalmente o produto. Gasto minha ousadia aqui; o resto fica quieto.

**Motivo da marca:** o "**#**" da logomarca (#Jilson) vira um marcador estrutural discreto —
eyebrow de seção, marcador de item — porque é identidade real do Jilson, não enfeite. Usar com
parcimônia (não como 01/02/03 numerado, que não faz sentido aqui).

---

## 3. Paleta (tokens) — claro, com o azul como único acento

```css
:root {
  /* Canvas — branco Apple + um off-white levemente azulado (não cinza neutro) */
  --background:        #FFFFFF;   /* fundo padrão */
  --surface-alt:       #F6F9FC;   /* quebra de seção fria (eco sutil do azul) */
  --card:              #FFFFFF;

  /* Texto — preto do Jilson + cinza 131 da logomarca */
  --foreground:        #111114;   /* "Jilson Preto" — títulos/corpo */
  --muted-foreground:  #838383;   /* RGB 131 — texto secundário */

  /* Acento — o azul da marca (#238FE8), único */
  --primary:           #238FE8;   /* botões, links, brilho JilsonAI */
  --primary-foreground:#FFFFFF;
  --primary-hover:     #1A6FBB;   /* hover/active */
  --primary-tint:      rgba(35,143,232,0.08); /* glows, fundos de chip, fill do medidor */
  --ring:              #238FE8;   /* foco visível (acessibilidade) */

  /* Linhas */
  --border:            #E8ECF1;   /* hairlines frias e leves */

  /* Semânticos — discretos, estilo Apple */
  --success:           #1FA97E;
  --destructive:       #E5484D;
}
```

**Regra de ouro:** sem cor hardcoded no código — sempre os tokens semânticos do shadcn
(`bg-background`, `text-muted-foreground`, `text-primary`, `border-border`). O azul vive em
`--primary`. Dark mode **não** entra no MVP (a marca é clara); o seam de tokens já permite adicionar
depois sem reescrever.

---

## 4. Tipografia

Par deliberado, não o Inter-de-sempre:

```css
--font-display: 'MuseoModerno', system-ui;     /* marca + títulos — a fonte da logomarca */
--font-body:    'Hanken Grotesk', system-ui;   /* corpo — grotesca quente, legível, acessível */
--font-mono:    'JetBrains Mono', monospace;    /* código/dados — o assunto é dados, isto importa */
```

- **MuseoModerno SemiBold** (600) — geométrica e arredondada; carrega a personalidade do Jilson.
  Usada com **restrição**: wordmark, H1/H2, números grandes. Nunca em corpo de texto.
- **Hanken Grotesk** — corpo e UI. Quente o suficiente pra não ser fria, neutra o suficiente pra
  ler longo. Pareia bem com a redondeza da MuseoModerno.
- **JetBrains Mono** — trechos de código, fórmulas, DAX/SQL, dados. Escolha ancorada no assunto.

### Escala (confiante, Apple-grande)

| Papel | Tamanho | Peso | Fonte |
|-------|---------|------|-------|
| Wordmark | — | 600 | MuseoModerno |
| Hero H1 | `clamp(2.5rem, 6vw, 4.5rem)` | 600 | MuseoModerno |
| Seção H2 | `clamp(1.75rem, 3vw, 2.5rem)` | 600 | MuseoModerno |
| Card H3 | 1.25rem | 600 | Hanken Grotesk |
| Eyebrow (com "#") | 0.8rem | 600, tracking +0.04em, uppercase | Hanken Grotesk |
| Corpo | 1.0–1.125rem | 400 | Hanken Grotesk |
| Legenda/meta | 0.875rem | 400 | Hanken Grotesk |
| Número grande | `clamp(2rem, 4vw, 3rem)` | 600 | MuseoModerno |
| Código/dados | 0.9rem | 400 | JetBrains Mono |

Corpo com `line-height` generoso (1.6) e medida de linha ~66ch — leitura confortável (acessível).

---

## 5. Layout & espaçamento

- **Respiro Apple:** seções com `py-24` a `py-32`; conteúdo `max-w-6xl` centralizado; cards `gap-8`.
- **Ritmo de fundo:** alterna `--background` (branco) e `--surface-alt` (off-white azulado) pra
  separar seções **sem** linhas pesadas. Hairline `--border` só onde precisa.
- **Grade de cards:** 1 coluna (mobile) → 2 (`md`) → 3 (`lg`).
- **Cantos:** `rounded-2xl` nos cards/superfícies (suavidade Apple), `rounded-full` em botões/chips.
- **Sombra:** quase nada — sombras suaves e difusas (`shadow-sm`/`shadow-md` discretas), nunca duras.

### Wireframe da landing (ASCII)

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

> A **ordem definitiva das seções é decisão de construção** (PROJECT_DESCRIPTION). Onboarding do
> aluno logado é **aberto**: trilhas e cursos navegáveis livremente; `recommendTrilha` é ajuda
> opcional, não portão.

---

## 6. Componentes-chave

- **HeroTrilhaDemo** — a assinatura. Input de objetivo + a trilha montando (cursos/aulas aparecendo
  agrupados por competência). Pilar 2 (JilsonAI) é o herói visual da página.
- **PillarCard** (3) — ícone limpo (Lucide), título MuseoModerno, 1 frase. JilsonAI ganha leve
  destaque (tint azul sutil), sem virar carnaval.
- **TrilhaCard / CourseCard / LessonRow** — thumbnail, título, duração, progresso. Aula é
  first-class (aparece sozinha em busca/trilha).
- **JilsonAIChat** — painel de chat calmo; bolhas claras; o brilho azul só no avatar/ação.
- **UsageMeter** — cápsula horizontal, trilho `--surface-alt`, fill `--primary-tint→--primary`,
  rótulo *"uso do mês"*. **Calmo e positivo**, nunca countdown. (Referência: tela "Usage" da
  Anthropic — barras de %, créditos opt-in.)
- **PriceCard** — um card claro, sem tabela de comparação pesada. Mensal em destaque, anual como
  "economize ~17%". Nada de "de/por" agressivo.
- **Button** — primary `bg-primary text-primary-foreground rounded-full`; hover `--primary-hover` +
  leve `scale-[1.01]`; secondary = contorno fino. Foco visível sempre (`--ring`).
- **Certificate (preview)** — mostra nome da trilha + **competências cobertas** (o que vale pro RH).

---

## 7. Iconografia & imagens

- **Ícones:** Lucide, traço fino, monocromáticos (herdam `currentColor`). Sem ícones coloridos
  "stickers". O azul aparece só quando o ícone é uma ação/destaque.
- **Imagens:** fotografia/render limpos, bem iluminados, fundo claro — estética Apple. Pessoas reais
  estudando/aplicando, telas de produto reais (Power BI, Excel, código). Evitar stock genérico
  "corporativo sorridente". Imagens com cantos `rounded-2xl`.
- **Ilustração de dado:** quando precisar (dashboard, gráfico), usar o real do produto, não vetor
  decorativo.

---

## 8. Movimento (leve, deliberado)

- **Load do hero:** a trilha se monta uma vez (sequência orquestrada) — o momento que vende.
- **Scroll reveals:** fade/translate sutil ao entrar (curto, ~250ms, ease-out). Não em tudo — só
  nas entradas de seção.
- **Hover:** micro-interações discretas em cards/botões (lift leve, brilho do azul).
- **Medidor:** preenche suave ao carregar (transmite "uso", não ansiedade).
- **Sempre:** respeitar `prefers-reduced-motion` (corta animações, mantém o conteúdo final).
- **Cuidado:** excesso de animação faz parecer "gerado por IA". Menos é mais — a assinatura concentra
  o movimento; o resto é quase parado.

---

## 9. Piso de qualidade (não-negociável)

- Responsivo até mobile (testar 375 / 768 / 1024 / 1440).
- Foco de teclado visível em tudo (`--ring`).
- Contraste AA: `#111114` sobre branco ✅; cuidado com `#838383` sobre branco (≈ 3.5:1 — usar só em
  texto ≥ 16px/secundário, nunca em texto pequeno crítico).
- `prefers-reduced-motion` respeitado.
- Carregamento < 3s; fontes com `display=swap`.

---

## 10. Copy na interface (estilo)

- Voz da marca: tornar o complexo simples; curto, direto, ativo. Frase de produto, não jargão.
- Botões dizem o que acontece: **"Começar agora"**, **"Assinar"**, **"Continuar trilha"** — não
  "Enviar". A ação mantém o nome no fluxo todo.
- Erros não pedem desculpa nem são vagos: dizem o que houve e como resolver, na voz da interface.
- Tela vazia é convite à ação, não decoração.
- Palavras a evitar (herdadas da estratégia): guru, ninja, hack, "mágica da IA", "destrave seu
  potencial". Palavras a usar: aplicar, prática, simples, no seu ritmo, especialista, era da IA.

---

## 11. Carregamento de fontes

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=MuseoModerno:wght@600&family=Hanken+Grotesk:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

---

## 12. Favicon & OG

- **Favicon:** o "**#**" da logomarca em #238FE8 sobre branco.
- **OG image:** wordmark #Jilson Santana + tagline "Torne-se um especialista em dados na era da IA"
  sobre fundo claro com um respiro do azul. Limpo, Apple.

---

*Criado: Jun 2026 — reescrita total. Substitui o design.md de consultoria (dark/#238FE8/$119/Service 6).
Direção: Apple claro + acessível, acento único #238FE8 (azul da logomarca), MuseoModerno (marca) +
Hanken Grotesk (corpo) + JetBrains Mono (dados). Assinatura = a trilha que se monta sozinha no hero
(AI no DNA tornado visível). Medidor de consumo calmo (não countdown). Tokens semânticos shadcn, sem
cor hardcoded; dark mode fora do MVP (seam preservado). Ordem das seções = decisão de construção.*
