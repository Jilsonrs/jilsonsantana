# CONTENT.md — Copy do Site & Mensagem

> Texto, headlines, CTAs e direção de copy de cada seção da landing.
> Fonte de estratégia/produto: **PROJECT_DESCRIPTION.md** · Estrutura: **implementation-plan.md** + **CLAUDE.md**.
> Idioma: **PT-BR — a fonte.** Desde Set 2026 a escola é **bilíngue** (`idiomas.md`): a copy em
> inglês é **tradução desta** (o agente traduz, o operador revisa antes de publicar) e **ainda não
> foi escrita**. Tagline em inglês (operador, 14/09): *"Become a data expert in the AI era."* Nome
> de categoria em inglês: a definir.
>
> **STATUS:** consolidado com as decisões deste ciclo (preço, pilares, suporte AI-nativo,
> trilhas, certificado/comunidade no lançamento). **NÃO é a copy final de go-live** —
> passa por análise final antes do lançamento.

---

## A marca (não esquecer)

**Tagline oficial:** *"Torne-se um especialista em dados na era da IA."*
É a ponte natural do **"Formação Especialista"** (Udemy) -> escola própria. Udemy, YouTube
e site apontam pra mesma palavra: *especialista*.

> Complemento em estudo (rascunho, decidir no go-live): *"A escola da era da IA. Pra você."*
> — crava a diferença vs Udemy Business, que mira RH/empresa. Pessoa, não departamento.

---

## A tese (o que nos torna ruptura)

Todo concorrente vende **conteúdo da era da IA rodando numa escola medieval**: curso que
congela, dúvida que demora dias, fórum onde ninguém responde, ou IA empacotada como produto
enterprise separado. Aqui a **IA é a experiência** — tutor, suporte e guia do aluno, no plano
acessível. Conteúdo da era da IA exige escola da era da IA.

> **Nome da categoria (posicionamento/SEO — não jargão de vitrine):** *a primeira escola de dados
> **AI-nativa** do Brasil.* O termo vive em manifesto, bio, imprensa e SEO — nomeia a categoria
> antes que um concorrente nomeie (racional em STRATEGY.md §1). Na copy pro aluno, a tradução
> acessível continua sendo a tese acima: "aqui a IA é a experiência".

---

## Copy Filter (aplicar a TODO conteúdo)

> "O aluno ideal se reconhece IMEDIATAMENTE neste título?"

Frame pela dor da pessoa, não pela técnica. **Voz da marca:** tornar o complexo simples;
curto, direto, focado no que importa; aprenda rápido e aplique imediatamente.

**USAR:** dados, prático, aplicar, simples, direto, no trabalho, na era da IA, especialista,
trilha, do zero, passo a passo, sem enrolação, acessível, sem fidelidade, na hora.
**EVITAR:** guru, ninja, hack, fórmula secreta, revolucionário, "explode sua mente", hustle,
"deixa o like", segredo dos especialistas.

---

## 1. Hero
> `Hero.tsx` · textos via `useConfig()`

- **Headline:** "Torne-se um especialista em dados na era da IA."
- **Subheadline (direção):** "Excel, Power BI, SQL, Python e IA aplicada — do jeito simples
  e direto, pra você aplicar amanhã no trabalho. Em trilhas guiadas, com o JilsonAI do seu lado."
- **CTA primário:** "Quero ser membro" -> checkout
- **CTA secundário:** "Ver aulas no YouTube" -> @JilsonUS
- **Microcopy de confiança:** "Mais de 100 mil alunos em 68 países. Sem fidelidade — cancele quando quiser."

---

## 2. Credibilidade (StatsBar)
> `StatsBar.tsx` (contadores animados)

**104.000+** alunos formados · **68** países · **12+** anos em dados · **4.150+** alunos corporativos.
Eyebrow: "Quem te ensina" · Apoio: "A mesma autoridade do *Formação Especialista*, agora numa escola que é minha — e sua."

---

## 3. Os 3 pilares (o coração da oferta)
> `Membership.tsx` / blocos de pilar · **TODOS ATIVOS no lançamento**

**Frase-âncora (acima dos pilares):** "Tudo que você precisa pra virar especialista em
dados. Numa assinatura só."

**Cursos que você aplica amanhã**
Excel, Power BI, SQL, Python e IA aplicada — direto ao ponto. Aprenda fazendo, em **trilhas
guiadas** do iniciante ao especialista.

**JilsonAI: você nunca trava sozinho**
Seu tutor no meu método, 24 horas por dia. Travou na fórmula, no DAX, no código? Pergunta e
aplica na hora. E quando ele não resolve, **eu entro**. É como ter o instrutor do lado — sempre.

**Sempre à frente da curva**
Novos cursos e atualizações o tempo todo. A ferramenta mudou? A aula muda. Você nunca fica
com conteúdo velho.

> Pilar 2 é o herói (centro visual) — ataca o medo nº1 de quem estuda dados: "vou empacar e
> desistir". Pilar 3 responde "por que continuo pagando depois de terminar?" — anti-churn virando copy.

> **Cadência ritual no Pilar 3 (decidir o dia no go-live — TBD):** a promessa "sempre à frente"
> ganha **relógio público** — ex.: *"toda primeira segunda do mês, novidade na escola."* Vira 1
> frase aqui no Pilar 3 + 1 item na FAQ (§11). ⚠️ Mensal e humilde (1 aula/atualização basta):
> **previsibilidade > volume** — é promessa pública (racional em STRATEGY.md §6).

---

## 4. Trilhas (resolve o "por onde começo?")
> `Tracks.tsx` / `Catalog.tsx` · **ATIVO** — mostra trilhas + cursos publicados

**Heading:** "Não comece perdido. Siga uma trilha."

**Copy:** "Você não precisa adivinhar a ordem. Cada trilha te leva do zero ao domínio, passo
a passo. E se ficar na dúvida de por onde começar, o JilsonAI te recomenda a trilha certa pelo
seu objetivo."

**Estrutura inicial (RASCUNHO — refinar):**
- **Trilha 1 — Comece por aqui:** Fundamentos (Excel + IA)
- **Trilha 2 — Business Intelligence:** Power BI + IA / PL-300
- **Trilha 3 — Dados + Código:** SQL + Claude, Python + Claude
- **Trilha 4 — Automação & IA Aplicada:** Claude Code, N8N, Antigravity (vitrine)

> Implicação de build: trilha é uma entidade **acima** do curso (Trilha -> Curso -> Módulo ->
> Aula). Aditiva ao modelo atual, não reescreve. Ver implementation-plan/CLAUDE (Fase 2).
> Toca também o JilsonAI: onboarding pergunta o objetivo -> recomenda trilha (liga à Fase 6 do JilsonAI).

---

## 5. Escola medieval × Escola da era da IA
> bloco comparativo · **ATIVO** (técnica adaptada dos concorrentes — coluna direita ancorada no JilsonAI)

| Escola medieval | Escola da era da IA (aqui) |
|-----------------|----------------------------|
| Curso comprado, conteúdo congela | Atualização contínua — mudou a ferramenta, muda a aula |
| Dúvida fica dias sem resposta (ou nunca) | JilsonAI 24/7 no meu método + suporte direto quando precisa |
| Você se perde sozinho | Trilhas guiadas + onboarding que diz por onde começar |
| IA é mais um curso no catálogo | IA é a experiência: seu tutor, seu suporte, seu guia |
| Te prende em 12 meses | Sem fidelidade — você fica pelo valor, não pela trava |

---

## 6. JilsonAI — o diferencial (e o suporte da era da IA)
> `JilsonAI.tsx` · **ATIVO (v1 no lançamento)**

**Heading:** "Seu tutor, 24 horas por dia."

**Copy:** "Nenhuma plataforma te dá isso. O JilsonAI foi treinado no meu método: explica o
complexo de forma simples, no mesmo tom das aulas. Tira dúvida da aula, do certificado, do
seu dia a dia. Resolveu, aplicou. Não resolveu, vira uma conversa direta comigo. Sem fila,
sem fórum morto onde ninguém responde."

> Nota: a "comunidade" aqui **não é fórum de pares** (que nem na Udemy funciona). É suporte
> inteligente (JilsonAI) + canal direto com o Jilson + anúncios/novidades pra todos. Honesto
> e sustentável pra um operador solo. v1 enxuto — não prometer RAG/contexto profundo ainda.

---

## 7. Por que uma assinatura (e não cursos soltos)
> `WhySubscription.tsx` · **ATIVO** (substitui o antigo "por que não a Udemy" — sem atacar canal)

**Heading:** "Você não precisa decorar fórmula. Precisa resolver o problema."

**Copy:** "Curso solto te dá um vídeo e te abandona. Aqui você tem a trilha inteira, sempre
atualizada, com o JilsonAI pra destravar na hora e o certificado no fim. Por menos do que
custa um curso avulso por mês."

---

## 8. Preço (Pricing)
> `Pricing.tsx` · **ATIVO (Fase 4 — Stripe)**

**Heading:** "Um plano. Acesso a tudo. Sem pegadinha."

- **Mensal — R$ 99,90/mês** · sem fidelidade · cancele quando quiser *(padrão, em destaque)*
- **Anual — R$ 995/ano** *(economize ~17%, ~2 meses grátis)* · cobrança única, recorrente anual
- Inclui: todas as trilhas e cursos · JilsonAI · certificados · suporte direto · atualizações contínuas
- Microcopy: "Sem fidelidade. Pague pelo tempo que precisar. Volte quando quiser."

> Build (Fase 4): 2 *prices* Stripe sobre o mesmo produto "Membership" (mensal + anual). Upgrade
> mensal->anual usa proration nativo do Stripe (crédito do tempo não usado). `temAcessoAtivo()`
> só olha se a assinatura está ativa — não liga pra qual price. **Sem free trial. Sem conteúdo
> grátis na escola** (o grátis vive no YouTube).

### Founding Member — **NÃO VAI EXISTIR** *(decisão do operador, set/2026)*
Não há oferta de fundador, nem "vagas limitadas". A regra de conteúdo da home passou a proibir
escassez fabricada sem exceção. *Gatilho de reabertura: nenhum — se voltar à mesa, é decisão nova.*

---

## 9. YouTube (funil de aquisição)
> `YouTube.tsx` · **ATIVO**

**Heading:** "Comece de graça no YouTube"
**Copy:** "Toda semana publico aula prática de dados e IA aplicada. Aprenda de graça — e quando
quiser trilha, tutor 24/7 e certificado, a escola te espera."
3-4 thumbnails (-> YouTube) + CTA "Inscrever no canal".

> AdSense é **bônus**, não renda principal (RPM PT/BR é baixo) — interno, não vai pra copy.

---

## 10. Para quem é
> `ForWhom.tsx` · **ATIVO**

- Quem vive de planilha e quer subir de nível (Power BI, SQL, automação)
- Quem ouve "IA" o dia todo e quer aplicar no trabalho real
- Quem se perdeu em curso solto e quer uma trilha com rumo
- Quem aprende melhor com simplicidade e prática, não teoria longa

---

## 11. FAQ
> `FAQ.tsx` · **ATIVO**

- **Preciso saber programar?** Não. Começa do Excel e sobe no seu ritmo.
- **Por onde começo?** Pelas trilhas guiadas — e o JilsonAI te recomenda a trilha certa pelo seu objetivo.
- **Tem fidelidade?** Não. Mensal, cancele quando quiser.
- **Posso pausar e voltar?** Pode — cancela e volta quando quiser, sem perder nada. Você nunca foi preso a 12 meses.
- **Mensal ou anual?** Mensal R$ 99,90 sem compromisso; anual R$ 995 (~17% off) pra quem quer economizar.
- **Qual a diferença pra comprar curso solto?** Trilha completa, sempre atualizada, JilsonAI 24/7, suporte direto e certificado.
- **Tem certificado?** Sim, ao concluir.
- **O que é o JilsonAI?** Um tutor de IA no meu método, 24/7. Tira dúvida na hora — e quando ele não resolve, eu entro.
- **Quanto tempo até aplicar?** Aulas curtas, feitas pra aplicar no mesmo dia.
- **Com que frequência sai coisa nova?** *(rascunho — ativar quando o dia da cadência for decidido,
  ver §3)* Todo mês, em dia fixo — [dia TBD]. A ferramenta mudou, a aula muda; e a novidade chega
  sempre na mesma data.

---

## 12. CTA final
> `FinalCTA.tsx` · **ATIVO**

**Heading:** "Pronto pra se tornar especialista em dados na era da IA?"
**Botão:** "Quero ser membro" · **Apoio:** "Mais de 100 mil alunos começaram comigo. Sua vez."

---

## 13. Footer
- (c) 2026 Jilson Santana. · Links: YouTube · Udemy · (LinkedIn opcional)
- "Data skills pra todo mundo, sem complexidade."

---

## 14. SEO / Meta (PT-BR)
```html
<title>Jilson Santana — Torne-se um especialista em dados na era da IA</title>
<meta name="description" content="Escola de data skills com +100 mil alunos formados. Excel, Power BI, SQL, Python e IA aplicada em trilhas guiadas — pratico, simples, sempre atualizado. Com o assistente JilsonAI 24/7. Sem fidelidade.">
<meta property="og:title" content="Torne-se um especialista em dados na era da IA — Jilson Santana">
<meta property="og:description" content="Trilhas praticas de dados + IA, tutor JilsonAI 24/7 e certificado. Uma assinatura, sem fidelidade. +100 mil alunos.">
<meta property="og:url" content="https://www.jilsonsantana.com">
```

---

## 15. Página de Curso (copy dos blocos) — NÃO é a landing
> `CoursePage.tsx` · **ATIVO (Fase 2)** · página leve (catálogo), não landing de venda
> Mapeada da análise dos concorrentes (Mosh/Xperiun/Hashtag). A *landing* vende a assinatura;
> a página de curso só apresenta o curso pra quem já é (ou está a 1 clique de ser) membro.

**Ordem dos blocos (mobile-first):**
1. **Hero** — título + subtítulo (1 frase de resultado) + strip de metadados em ícone
   (⏱ carga · 🎬 nº aulas · 📊 nível · 🏅 certificado). Carga e nº de aulas = **derivados**.
   Vídeo de apresentação toca aqui (e toca pra quem **ainda não é membro** — é venda).
2. **Diferenciais do curso** — cards com ícone (não texto corrido). 3–4 por curso.
   *Ex. (Excel + IA):* "Foco em aplicação real" · "Cenário profissional coerente" · "Aulas
   diretas e objetivas" · "Excel moderno que poucos dominam".
3. **Metodologia 3 Camadas** (selo — ver abaixo). Só aparece com as camadas que o curso tem.
4. **O que você vai aprender** — tag pills clicáveis.
5. **Pré-requisitos** — **mostrados abertamente** (os concorrentes escondem; aqui é transparência
   que reduz frustração/reembolso — e numa assinatura não custa venda).
6. **Pra quem é** — personas.
7. **Conteúdo** — accordion Módulo → Aula.
8. **FAQ do curso** *(opcional)* — accordion. Só aparece se preenchido. A FAQ global da landing
   (§11) já cobre a assinatura; aqui é só dúvida específica do conteúdo. **O JilsonAI é a FAQ viva**
   (pergunta de curso → responde no contexto do curso), então preencha 2–3 itens só onde houver
   dúvida recorrente real — não escreva FAQ completa por curso (catálogo amplo = burnout).

> Imagem do curso = aparece na **lista/catálogo**. Vídeo de apresentação = aparece na **página de
> detalhe**. São dois ativos distintos, ambos opcionais (não obrigue thumbnail caprichada + vídeo
> por curso no lançamento — produção recorrente).

### Bloco "Metodologia 3 Camadas" (o diferencial — equivalente aos "pilares" dos concorrentes)

**Frase de abertura:** "Cada curso, montado em três camadas — pra você aplicar hoje e evoluir sempre."

**As 3 camadas (texto global — escrito 1 vez, igual em todo curso que tiver a camada):**
- 📐 **Fundamentos sólidos** — "A base que funciona em qualquer versão — você aplica com o que já tem."
- ⚡ **Recursos modernos** — "Os recursos mais atuais que aceleram seu trabalho e poucos dominam."
- ✦ **Com IA do seu lado** — "A IA como copiloto pra gerar lógica, destravar erros e ganhar tempo."

> Build: ícones Lucide `stack-2` · `bolt` · `sparkles` (azul #238FE8 **só** na camada IA). O curso
> marca quais camadas tem (`Course.camadas[]`) — pode ter 1, 2 ou 3. Nem todo curso tem as três
> (N8N pode ter só IA). Texto global por padrão; `camadaOverride` por curso é exceção (ex. N8N).
> **REVELAR** a promessa das camadas; **NÃO revelar** a economia interna (% de reaproveitamento,
> a palavra "reaproveitado", o jargão "3 camadas"). O "precisa do Excel 365 pra praticar" o Jilson
> **fala na aula** — não vira texto. "Excel 365" nunca entra no texto global (quebra fora do Excel).

---

## Removido nesta versão (não reintroduzir)
Consultoria (6 serviços/Service 6/$100hr/Process/Portfolio), ContactForm de consultoria,
cursos a $119 avulsos, membership $29.99, free trial, conteúdo grátis na escola, fórum de
pares, "cursos escondidos até 10K subs", ataque direto à Udemy.
*(A "copy em inglês" saiu desta lista em Set 2026: a escola passou a ser bilíngue — `idiomas.md`.)*

---

*Consolidado: Jun 2026 — modelo membership R$99,90/mês sem fidelidade + anual R$995 (~17% off).
3 pilares (Cursos · JilsonAI · Sempre à frente) + frase-âncora. Trilhas guiadas adicionadas.
Comunidade redefinida como suporte AI-nativo + anúncios (sem fórum de pares). Certificado e
suporte no lançamento. Tecnicas de concorrente aproveitadas: tabela medieval×IA, "decisão/
problema primeiro", inversão "não prende" vs "não evapora". 1 TBD: condição de Founding Member.*

*Atualizado: Jun 2026 — adicionada **§15 Página de Curso** (mapeada da análise Mosh/Xperiun/Hashtag): ordem dos blocos, diferenciais como cards-ícone, pré-requisitos mostrados, imagem (lista) vs vídeo de apresentação (detalhe). **Bloco Metodologia 3 Camadas** = selo opcional com textos globais (Fundamentos sólidos · Recursos modernos · Com IA do seu lado), ícones stack-2·bolt·sparkles (azul só na IA). Revelar a promessa, esconder a economia. É página de curso, NÃO a landing.*
*Atualizado: Jun 2026 — §15 ganhou bloco 8 (FAQ do curso, opcional): só aparece se preenchida, JilsonAI cobre o caso geral, 2–3 itens por exceção.*
*Atualizado: Jul 2026 — playbook big-tech→solo (racional em STRATEGY.md): nome da categoria
adicionado em "A tese" (AI-nativa = posicionamento/SEO; copy do aluno inalterada); cadência ritual
anotada no §3 (Pilar 3) + item de FAQ como rascunho TBD (dia fixo mensal, decidir no go-live —
promessa mensal e humilde). Nenhuma seção nova na landing.*

*Atualizado: Set 2026 — **a copy da HOME está fechada e saiu deste documento para o código.**
O mock foi aprovado (`design-lab/home-lab.html`) e transposto para a home real, servida pelo
Express. **O texto vivo da home mora em `core/src/i18n/pt.ts`** (o inglês espelha em `en.ts` e
ainda está vazio); este documento continua sendo a direção de mensagem, não o texto literal.
O que mudou em relação ao que estava escrito aqui:*
*(a) **Hero sem botão de assinar** — decisão do operador: não vender de cara; o visitante clica
no curso em destaque e assina na página do curso.*
*(b) **Seção "Cursos"** ganhou título próprio ("Uma escola moderna com IA no DNA.") e a seção
"Para quem é" foi reescrita ("A IA reescreveu as regras. Torne-se o profissional que dita o
jogo.") com 3 pontos: Comece de onde estiver · Direto ao Ponto · Lifelong Learning.*
*(c) **Trilhas:** 4 ideias (Trilhas prontas · Monte a sua · JilsonAI · Certificado), sem cards de
trilha na home e sem trilha em destaque (o catálogo ainda não completa uma trilha inteira).*
*(d) **JilsonAI:** entrou um exemplo de conversa fixo na página; saiu o medidor de uso do mês
(é detalhe de quem já assinou). O `[ ]` do parágrafo saiu do texto visível.*
*(e) **Prova social:** 4 depoimentos REAIS de alunos dos cursos, nome completo, sem foto, sem
estrela. Regra: se a pessoa pedir, o depoimento sai na hora. **Proibido depoimento inventado.***
*(f) **Assine:** UM cartão (Mensal R$ 99,90) com selo "17% de desconto no plano anual"; o anual
é oferecido no checkout. Lista: Cursos e Trilhas · Certificado de Conclusão · Suporte com
JilsonAI + Jilson · Conteúdo sempre atualizado · Pagamento no cartão ou no Pix.*
*(g) **FAQ:** 16 perguntas COM respostas escritas, na ordem de quem decide (o que é → é para mim
→ como funciona → assinatura).*
*(h) **Regra de mensagem que passa a valer para tudo:** pode prometer o que o aprendizado
entrega (trabalhar melhor, acelerar projetos, ganhar confiança); não pode prometer emprego,
salário ou sucesso garantido. Nem tom de sonho, nem tom que desanima.*
*(i) **Founding member removido** e **escassez fabricada proibida** (sem "vagas limitadas").*

---

## 16. ONDE CADA CONTEÚDO MORA — o mapa das páginas públicas *(Set 2026)*

> **DECISÃO DO OPERADOR (22/09/2026):** *"eu não gosto de ter que pedir a IA para alterar um
> texto, eu queria poder abrir o adm e trocar os textos."* **Texto de página passa a ser editável
> no admin, sem sessão de agente e sem deploy.**

Esta seção existe porque a pergunta certa não é *"que tabela essa página precisa?"* — é *"que
tipo de conteúdo é esse?"*. Modelar por **página** produz campo duplicado em três tabelas;
modelar por **tipo** deixa a página ser só uma vista. É como as plataformas grandes fazem:
dado de produto num lugar, texto de marketing em outro, e uma camada fina de curadoria
decidindo o que aparece onde.

### Os três baldes (aplicar ANTES de criar qualquer campo)

| Balde | O que é | Onde mora | Quem edita |
|---|---|---|---|
| **Entidade** | o que a escola vende ou entrega, e que existe fora da página | banco (Prisma) | operador, no `/admin` |
| **Texto de página** | título, parágrafo, rótulo de botão — texto que *descreve*, não que *é* | dicionário (`core/src/i18n/`) + sobrescrita no banco | operador, no `/admin` |
| **Derivado** | contagem de aulas, carga horária, agrupamento | calculado na leitura | ninguém — **nunca vira coluna** |

### O NOME DA CHAVE diz onde o texto aparece *(22/09/2026 — "renomeia logo porque vai ter mais de uma página, aí não mistura")*

A primeira parte da chave é o lugar, não a seção:

| Prefixo | Onde aparece | Exemplo |
|---|---|---|
| `common.*` | **toda** página pública | `common.nav.cursos`, `common.footer.tagline` |
| `home.*` | só na home | `home.target.steps[2].title`, `home.pricing.desc` |

**Página nova = prefixo novo** (`curso.*`, `trilha.*`, `legal.*`) — e ela já aparece no admin
sozinha, sem tabela nem tela nova. É isso que faz a plataforma crescer sem refazer.

**A regra que evita a bagunça:** texto que aparece em **duas** páginas é `common`, nunca duplicado
nas duas. Duplicar é como as duas versões passam a divergir sem ninguém ver.

**Por que foi renomeado ANTES da tabela de sobrescrita existir:** a chave é a chave primária da
linha no banco. Renomear depois significa que cada texto já editado pelo operador aponta para um
nome que não existe mais — migração de dados, em vez de um `sed`. Feito em 22/09, com prova de que
o HTML renderizado ficou **byte a byte idêntico** nos dois idiomas.

### Como o texto de página funciona: valor de fábrica + sobrescrita

O dicionário em código **não é "o texto do site"** — é o **valor de fábrica**: o que uma
instalação nova mostra antes de alguém configurar. A sobrescrita no banco é o que está no ar.

    texto exibido  =  sobrescrita do banco  ??  valor de fábrica do dicionário

**Por que o híbrido e não o banco puro** *(a alternativa foi pesada, 22/09)*: banco puro ganha em
uma coisa — editar na hora — e perde em quatro: banco fora do ar derruba o **texto** junto com o
dado; tradução faltando chega em produção em vez de quebrar a compilação; seção nova nasce
**vazia**; e não há histórico para desfazer. A diferença de custo entre as duas é **uma linha**
(`??`), então o híbrido fica com a vantagem de cada lado.
**Consequência aceita:** depois da primeira edição, o texto do código fica velho. Isso é esperado
— **a verdade do que está no ar é o admin**, e a tela mostra o valor de fábrica ao lado para a
diferença ficar visível.
*Gatilho de reabertura: se um dia houver centenas de textos mudando toda semana, com várias
pessoas editando, o valor de fábrica vira ruído e o banco puro passa a valer. Não é o caso de um
operador com ~150 chaves.*

### O mapa da home, seção por seção

Estado em 22/09/2026, **medido** (não estimado); depoimentos e FAQ atualizados em 23/09 (Bloco C3):

| Seção | Balde | Estado |
|---|---|---|
| Nav, Hero (textos) | texto | dicionário |
| Curso em destaque + 4 cards | **entidade** (`Course`) | ainda constante no código — ver *pendências* |
| Catálogo (título, parágrafo, "ver todos") | texto | dicionário |
| Para quem é (3 passos) | texto | dicionário |
| Trilhas (4 ideias + a ilustração de linha do tempo) | texto | dicionário — a ilustração é **mock**, não lê trilha real |
| JilsonAI (texto + conversa de exemplo) | texto | dicionário; a conversa é **roteirizada**, nunca chama a API |
| Autor (bio, citação, 3 números) | texto | dicionário |
| **Depoimentos** | **entidade** (`Testimonial`) | **banco** desde 23/09 — só o título e a etiqueta da seção ficam no dicionário |
| Preço (cartão, lista, rodapé) | texto | dicionário — o **valor** vira Stripe na Fase 4 |
| **FAQ** | **entidade** (`FaqItem`) | **banco** desde 23/09, com JSON-LD `FAQPage` — só o título fica no dicionário |
| CTA, Rodapé | texto | dicionário |

**Por que depoimentos e FAQ viram tabela e o resto não:** são as duas únicas listas da home que
**crescem**. As outras têm tamanho fixo preso ao layout (3 passos, 4 ideias) — acrescentar item é
mudança de desenho, não de conteúdo. E depoimento tem uma obrigação própria já escrita aqui
(§ acima: *"se a pessoa pedir, o depoimento sai na hora"*) — isso não pode depender de deploy.

**Decisões do operador sobre as duas listas (23/09/2026, ao aprovar o Bloco C3):**
- **Lista vazia esconde a seção inteira**, título incluído — num idioma sem depoimento publicado,
  a página não mostra um título com espaço vazio embaixo.
- **Tirar do ar tem dois jeitos:** o status (rascunho / publicado / arquivado) esconde, e o botão
  **Excluir apaga de vez**. É o Excluir que cumpre o *"sai na hora se a pessoa pedir"*: pelo LGPD o
  nome precisa sumir do banco, não só da tela. Vale igual para depoimento e pergunta.
- **O conteúdo que estava no ar foi para o banco sozinho**, na própria migration — a home
  publicada não ficou um instante sem as seções. Daí em diante, a edição é no admin.
- **Telas no admin: dentro de "Site"**, que ganha um segundo nível (Textos · Depoimentos ·
  Perguntas frequentes).

### Regra que passa a valer para toda página pública

**Nenhum texto visível fica literal no template.** Se está no HTML, o operador não consegue
editar e o `/en` mostra português. A trava mecânica e o teste que a sustenta estão no
`CLAUDE.md` → *Rendering Boundary*.

### Pendências (nesta ordem)

1. ~~Fiação: tirar do HTML os textos que já tinham chave.~~ **Feito em 22/09** — 55 literais
   foram para o dicionário; sobraram só os rótulos das 3 camadas (entram com o selo).
2. ~~Mecanismo de sobrescrita + tela de admin.~~ **Feito em 23/09** (Bloco C2, `/admin/site`).
3. ~~Depoimentos e FAQ viram tabela com CRUD no admin.~~ **Feito em 23/09** (Bloco C3):
   `/admin/site/depoimentos` e `/admin/site/faq`.
4. Os 5 cursos saem da constante e passam a vir do banco (depende da migration de `language`).
5. ~~Escrever o inglês.~~ **Feito e revisado em 22/09** (155 chaves; ciclo de revisão em
   `idiomas.md`). **Fica aberto:** o operador quer revisar **as 15 perguntas do FAQ uma a uma** —
   o conteúdo delas, nos dois idiomas, não a tradução. Ele decide quando. Desde o C3 a revisão é
   feita **direto no admin**, sem passar pelo código.
6. **Preço em dólar na página em inglês:** as chaves `priceEn` e `priceEnAnnual` existem e **não
   são usadas** — a página em inglês mostra o preço em real. Isso é a questão *preço mostrado ×
   preço cobrado*, que é **decisão da Fase 4** (`billing.md`), não de fiação.

