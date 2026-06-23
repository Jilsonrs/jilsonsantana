# CONTENT.md — Copy do Site & Mensagem

> Texto, headlines, CTAs e direção de copy de cada seção da landing.
> Fonte de estratégia/produto: **PROJECT_DESCRIPTION.md** · Estrutura: **implementation-plan.md** + **CLAUDE.md**.
> Idioma: **PT-BR** (a escola é PT; não há copy em inglês).
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

---

## 4. Trilhas (resolve o "por onde começo?")
> `Tracks.tsx` / `Catalog.tsx` · **ATIVO** — mostra trilhas + cursos publicados

**Heading:** "Não comece perdido. Siga uma trilha."

**Copy:** "Você não precisa adivinhar a ordem. Cada trilha te leva do zero ao domínio, passo
a passo. E se ficar na dúvida de por onde começar, o JilsonAI te recomenda a trilha certa pelo
seu objetivo."

**Estrutura inicial (RASCUNHO — refinar):**
- **Trilha 1 — Comece por aqui:** Fundamentos (Excel + IA)
- **Trilha 2 — Business Intelligence:** Power BI / PL-300 + Modelagem de Dados
- **Trilha 3 — Dados + Código:** SQL + Claude, Python + Claude
- **Trilha 4 — Automação & IA Aplicada:** IA + Claude, N8N

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

### Founding Member *(tática aprovada — escassez pros primeiros, vindos de YouTube/Udemy)*
"Os primeiros membros entram como **fundadores**: [condição — TBD: preço travado / bônus]. Vagas limitadas."

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
pares, copy em inglês, "cursos escondidos até 10K subs", ataque direto à Udemy.

---

*Consolidado: Jun 2026 — modelo membership R$99,90/mês sem fidelidade + anual R$995 (~17% off).
3 pilares (Cursos · JilsonAI · Sempre à frente) + frase-âncora. Trilhas guiadas adicionadas.
Comunidade redefinida como suporte AI-nativo + anúncios (sem fórum de pares). Certificado e
suporte no lançamento. Tecnicas de concorrente aproveitadas: tabela medieval×IA, "decisão/
problema primeiro", inversão "não prende" vs "não evapora". 1 TBD: condição de Founding Member.*

*Atualizado: Jun 2026 — adicionada **§15 Página de Curso** (mapeada da análise Mosh/Xperiun/Hashtag): ordem dos blocos, diferenciais como cards-ícone, pré-requisitos mostrados, imagem (lista) vs vídeo de apresentação (detalhe). **Bloco Metodologia 3 Camadas** = selo opcional com textos globais (Fundamentos sólidos · Recursos modernos · Com IA do seu lado), ícones stack-2·bolt·sparkles (azul só na IA). Revelar a promessa, esconder a economia. É página de curso, NÃO a landing.*
*Atualizado: Jun 2026 — §15 ganhou bloco 8 (FAQ do curso, opcional): só aparece se preenchida, JilsonAI cobre o caso geral, 2–3 itens por exceção.*
