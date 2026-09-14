# Plataforma bilíngue (PT + EN) — a especificação

> **O QUE É ISTO:** a especificação de produto da escola em dois idiomas. Cobre quem vê o quê,
> como o visitante cai no idioma certo, o que muda no conteúdo, o preço fora do Brasil, o imposto
> e o que ainda vai nascer com idioma. **NÃO é lido por sessão.**
>
> **QUANDO LER (gatilho mecânico, não julgamento):** antes do primeiro write/edit que toque o
> campo `language` (schema, `core/`, rotas), `User.preferredLanguage`, o dicionário de textos,
> qualquer rota ou template **público** do servidor, `sitemap.xml`/`robots.txt`, ou o formulário
> de curso/trilha do admin.
>
> **O que NÃO está aqui:** as travas que produzem um diff errado se ignoradas (um endereço por
> idioma, filtro de leitura, escrita que confere idioma, texto fora do código, moeda pelo cartão).
> Essas ficam no `CLAUDE.md` → *Idiomas*. Aqui fica o que se precisa saber ao **decidir**.
>
> **Rótulos de origem** (regra 3 de *DE QUEM É A DECISÃO*): `[decisão do operador, data]` ·
> `[convenção de engenharia]` · `[PROPOSTO — confirmar]` = recomendação do agente, ainda sem
> aprovação explícita · `[FATO — fonte]` = verificado.

---

## 1. A decisão

`[decisão do operador, 14/09/2026]` **A escola nasce em português E inglês**, no modelo da Udemy,
mesmo sem nenhum curso em inglês no lançamento. Mais tarde vêm um **canal do YouTube separado em
inglês** e a regravação em inglês dos cursos gravados em português. Nas palavras dele: *"tenho dois
trabalhos, mas duas fontes de renda"*.

| Pergunta | Resposta | Origem |
|---|---|---|
| Como o site escolhe o idioma | pelo **idioma do navegador** | operador, 14/09 |
| O que o visitante em inglês vê | **só os cursos em inglês**, mesmo que sejam poucos | operador, 14/09 |
| Quando o inglês liga | **desde o lançamento**, mesmo sem curso em inglês ("ver a escola nascer em inglês e o Google já indexar") | operador, 14/09 |
| Como nasce um curso | com um **campo Idioma na criação**, como o da Udemy | operador, 14/09 |
| Trilha | **segue o idioma**: trilha em inglês só leva conteúdo em inglês | operador, 14/09 |
| Moeda | **pelo país do cartão**: cartão do Brasil paga em R$, cartão de fora paga em US$ | operador, 14/09 |
| Preço fora do Brasil | **US$ 30/mês** + anual com o **mesmo cálculo** do anual em real | operador, 14/09 |

**O que ela reverte:** `project-description.md` → *Idioma & foco* e `strategy.md` §9 (*"EN
removido da escola. Escola e YouTube ficam PT pra sempre"*), e a linha do `CLAUDE.md` *"Do NOT
build any multi-language UI now"*.

**Por que agora e não depois** `[convenção de engenharia]`: a Fase 3 vai reconstruir as páginas
públicas no servidor, e a Fase 4 cria os preços. Se as duas nascerem bilíngues, o custo é um bloco.
Se o idioma vier depois, as duas são refeitas.

**GATILHO DE REABERTURA** `[PROPOSTO — confirmar]`: a decisão se reabre se **(a)** manter o inglês
passar a atrasar o português de forma medida (um bloco de build ou um curso PT atrasado por causa
de tradução), **ou (b)** 12 meses após o lançamento não houver nenhum curso em inglês publicado. No
caso (b) a estrutura custa manutenção sem render nada. **Não é gatilho:** poucos alunos em inglês
no começo, que o próprio operador já previu.

---

## 2. Como o visitante cai no idioma

**Um endereço por idioma** `[convenção de engenharia — recomendação de SEO do Google]`. O
português fica **sem prefixo**, e os endereços atuais não mudam. O inglês fica **sob `/en`**. O
idioma do navegador **só decide para onde levar a primeira visita**; nunca troca o conteúdo servido
num mesmo endereço.

**Por quê** `[FATO — Google Search Central, "locale-adaptive pages"]`: o Googlebot visita
principalmente de IPs dos EUA e **sem** o cabeçalho de idioma. Uma página que muda de idioma no
mesmo endereço tem só uma versão indexada, e a outra some da busca sem erro. O Google recomenda URLs
separadas com `hreflang`.

**A mecânica** `[convenção de engenharia]`:
- **Visitante logado** → `User.preferredLanguage`, que deixa de ser dormente.
- **Visitante anônimo** → o idioma do **endereço** manda.
- **Primeira visita à raiz (`/`)**, sem escolha salva:
  - navegador em `pt*` (pt, pt-BR, pt-PT…) → fica no português;
  - qualquer outro idioma → vai para `/en`.
  - **Link direto nunca é redirecionado.** Quem abre `/curso/x` compartilhado por um brasileiro vê
    aquela página.
- **Sem cabeçalho de idioma** (caso do Googlebot) → nenhum redirecionamento. O robô descobre a
  outra versão pelo `hreflang` e pelo sitemap.
- **Trocar de idioma pelo seletor** grava a escolha num cookie e, se a pessoa estiver logada, em
  `preferredLanguage`. A escolha vence o navegador dali em diante.

**Por que o navegador e não o país:**
- O brasileiro morando fora usa o navegador em português.
- `[FATO — docs do Railway]` o Railway **não informa** o país do visitante. Detectar país exigiria
  pôr a Cloudflare na frente do site.

**Pendências:**
- `[PROPOSTO — confirmar]` caminhos em inglês sob o prefixo: `/en/courses`, `/en/course/:slug`,
  `/en/track/:slug`. A alternativa é manter os segmentos em português (`/en/cursos`).
- `[pendente — operador + parceiro de design]` **onde fica o seletor PT | EN** e como ele aparece.
  É algo que o aluno vê, então a decisão é do operador, com o parceiro de design.

---

## 3. Conteúdo

- **Curso nasce num idioma** `[operador, 14/09]`: o campo `language` é obrigatório na criação.
  **Módulo e aula herdam** do curso `[convenção de engenharia]`. As linhas que já existem ficam PT.
- **Curso em inglês é OUTRO curso** `[convenção de engenharia, decorrente do campo na criação]`,
  com vídeos, aulas e **slug próprios, no idioma dele**. Nunca é uma tradução do mesmo registro: o
  vídeo é gravado num idioma, e a versão em inglês pode ter outras aulas. A regra de slug permanente
  vale para cada curso separadamente.
- **Trilha segue o idioma** `[operador, 14/09]`:
  - a trilha curada nasce com `language`;
  - o **servidor recusa** item de outro idioma (não só a tela);
  - a trilha clonada pelo aluno herda o idioma.
- **Catálogo, busca, lista de trilhas e sitemap mostram só o idioma do endereço** `[operador,
  14/09]`. É o mesmo mecanismo do filtro por status que já existe.
- `[PROPOSTO — confirmar]` **A assinatura dá acesso aos cursos dos dois idiomas.** Muda só o que
  aparece primeiro. O gate de acesso (`temAcessoAtivo()`) não lê idioma.
- **Ligação entre a versão PT e a EN do mesmo curso: NÃO construir agora.** Ela serve para o
  `hreflang` entre páginas de curso e para o seletor cair na página equivalente. Entra, como adição,
  quando existir o primeiro curso em inglês que seja versão de um curso em português.
- **Catálogo em inglês vazio no lançamento** (consequência de "inglês ligado desde já"):
  - precisa de um **estado próprio**, nunca uma tela em branco;
  - `[pendente — operador]` **o que ele mostra**: por exemplo, "cursos em breve", com ou sem captura
    de e-mail.

---

## 4. Textos

- **Texto de interface sai do código e vai para um dicionário** `[convenção de engenharia]`:
  - **um só**, servindo os templates do servidor e o React;
  - a falta de uma frase em inglês é **acusada na compilação**, então nenhuma tela fica meio
    traduzida;
  - **a biblioteca, se houver, é decidida no plano do bloco** (dependência nova precisa do OK do
    operador). O `react-i18next`, sugerido pelo Gemini em 14/09, serve só o React, e as páginas
    públicas saem do React na Fase 3.
- **Valor de enum continua código** (`Level`, `Layer`, `ContentStatus`); o **rótulo** vem do
  dicionário. Os textos globais das 3 camadas passam a existir nos dois idiomas.
- **Conteúdo de curso não passa pelo dicionário:** título, descrição e FAQ são escritos no idioma do
  curso, porque é outro curso.
- **Quem traduz:** o agente. **Quem aprova:** o operador revisa todo texto que o aluno lê, antes de
  publicar. Texto de interface é decisão dele (*DE QUEM É A DECISÃO*).
- `content.md` continua sendo a **fonte em português**. A copy em inglês ainda não existe.
  `[pendente — operador]` **tagline e nome de categoria em inglês.** "A primeira escola de dados
  AI-nativa **do Brasil**" é o posicionamento do lado PT.

---

## 5. Preço e cobrança (Fase 4)

`[operador, 14/09]` **A moeda segue o país do cartão, nunca o idioma do site.**

| Cartão | Mensal | Anual |
|---|---|---|
| Brasil | R$ 99,90 | ~R$ 995 |
| Outros países | **US$ 30** | **~US$ 299** — mesmo cálculo do R$ 995 (~17% de desconto, ≈ 2 meses grátis). **Valor exato a confirmar pelo operador** |

**Por que o cartão e não o idioma:** se a moeda seguisse o idioma, qualquer estrangeiro trocaria o
site para português e pagaria em real, bem menos que US$ 30.

**Em aberto, resolver na Fase 4:**
- **Preço mostrado × preço cobrado.** A página pública é vista **antes** de a pessoa digitar o
  cartão. Se ela mostra um valor e o cartão leva a outra moeda, **a tela de pagamento tem que mostrar
  o valor final antes da confirmação**. Cobrar de um estrangeiro mais do que a página mostrava é o
  pior caso. Como a Stripe resolve isso: **verificar via context7 na Fase 4**, não supor.
- **Receita por assinante em dólar.** A conta de `strategy.md` §6 (ARPU líquido, meta de 500) existe
  **só em reais**. Cartão estrangeiro tem outra taxa na Stripe (a verificar), então a conta precisa
  de uma versão em dólar.

### Imposto — decidir ANTES da primeira venda fora do Brasil

`[FATO — docs da Stripe via context7 + guias de IVA europeu, 14/09/2026]`
- **Stripe Tax calcula e cobra** o imposto certo de cada país, mas **o registro junto ao governo
  estrangeiro é do vendedor**. A Stripe pode fazer o registro por ele, mas **não entrega as
  declarações**; indica empresas parceiras para isso. *(Correção do que o Gemini disse em 14/09, "a
  Stripe Tax cuida de tudo".)*
- **Na União Europeia, quem vende de fora da UE deve IVA desde a primeira venda**, sem valor
  mínimo. Curso gravado conta como serviço digital. **Isso já vale hoje para um aluno de Portugal**,
  com ou sem inglês. O inglês só multiplica os países.
- **Alternativa: Stripe Managed Payments.** A Stripe vira a vendedora e **registra, declara e
  recolhe** o imposto em mais de 80 países. **Custo:** funciona só com a **página de pagamento da
  Stripe** (Checkout / Payment Links), o que colide com a decisão atual de pagamento **embutido nas
  telas da escola** (Payment Element, sem página hospedada). **Não verificado:** se aceita empresa
  brasileira.

**A escolha**, para a Fase 4 e com o contador: **pagar dentro do site e cuidar da papelada fiscal**
× **usar a página da Stripe e não ter papelada**. Levar junto ao contador: a conta Stripe está como
**MEI** (`tech-stack.md`), e o faturamento previsto já estava em território EPP antes do inglês.

---

## 6. O que ainda vai nascer com idioma (nada disto existe hoje)

| Onde | O quê | Fase |
|---|---|---|
| Superfície pública | rotas `/en`, `hreflang` recíproco, `og:locale`, sitemap com os dois idiomas, `<html lang>` certo | 3 (bloco Superfície pública) |
| Cobrança | preços em dólar, moeda pelo cartão, decisão de imposto | 4 |
| JilsonAI | responde no idioma do aluno; a base de conhecimento busca no idioma do curso | 6 (e Fases 4–5 do JilsonAI) |
| Certificado | texto no idioma da trilha/curso | 6.5 |
| E-mails e páginas legais | e-mail transacional no idioma do aluno; termos e privacidade em inglês | 7 |

---

## 7. YouTube

`[operador, 14/09]` **Dois canais separados**, PT e EN, nunca misturados. O canal em inglês vem
depois e recebe os cursos regravados em inglês. O canal atual segue o rebuild em português.

---

*Criado Set 2026 (14/09) — plataforma bilíngue decidida pelo operador. Consolida as respostas das
duas rodadas de perguntas, as correções às sugestões do Gemini (rotas no React; "Stripe Tax cuida
de tudo") e os fatos verificados de imposto. Registro da decisão: `CLAUDE.md`, changelog Set 2026
(16).*
