# Histórico de execução — o que já foi construído

> **O que é isto:** o registro do que já foi **feito**, fase por fase. Complemento do
> [`decisions-archive.md`](decisions-archive.md), que guarda o **porquê** de cada decisão.
> Este guarda o **quê**.
>
> **NÃO é lido por sessão.** É consulta sob gatilho — ver `CLAUDE.md` → *Arquivos de memória*.
> **O gatilho principal deste arquivo:** antes de afirmar que algo "não existe" ou "não foi feito".
> Há dezenas de checkboxes já fechados aqui; supor que falta é como se re-implementa o que existe.
>
> **Como isto se mantém vivo (rotação):** quando uma fase fecha no
> [`implementation-plan.md`](implementation-plan.md) — todos os checkboxes marcados e o `Done when`
> cumprido — **a fase inteira desce pra cá**, com os checkboxes intactos. O plano fica só com o que
> **falta fazer**; este arquivo acumula o que já foi. A unidade de movimento é a **fase** — ou,
> numa fase longa e ainda aberta, **um conjunto de 3 ou 4 etapas fechadas e publicadas** (decisão
> do operador, 11/10/2026) —, nunca o checkbox solto nem a etapa em andamento: o que está aberto
> fica no plano, com os itens feitos ao lado dos pendentes.
>
> **A fonte da verdade continua sendo o git.** Cada item aqui corresponde a commits reais.

---

## Fases concluídas

## Phase 0 — Foundation & Deploy Pipeline  *(low–medium risk)*  ✅ DONE

- [x] Initialize npm-workspace monorepo: `/core`, `/client`, `/server`, `/e2e`
- [x] `/client`: React + TypeScript + Vite + Tailwind + shadcn/ui init; `@/` path alias
- [x] `/server`: Express + TypeScript; `/api/health` endpoint
- [x] `/core`: workspace package for Zod schemas + constants; importable from client and server
- [x] Connect Prisma to Supabase (`DATABASE_URL`); `prisma db pull` baseline
- [x] Dockerfile (multi-stage: build client → serve via server) + `.dockerignore`
- [x] `railway.json` (startCommand + healthcheck `/api/health`); Railway auto-deploy on push confirmed
- [x] GitHub Actions: lint + typecheck + build on push
- [x] CLAUDE.md committed at repo root
- [x] Custom domain `www.jilsonsantana.com` live with SSL
- **Done when:** push to `main` → Railway serves the app + `/api/health` returns OK. ✅

## Phase 1 — Authentication & App Shell  *(low risk)*  ✅ DONE

- [x] Better Auth server config (Prisma adapter); mount at `/api/auth/{*any}` before `express.json()`
- [x] `User` additionalFields: `name` optional, `image`, `role` (default `member`), `birthday` (day+month, optional), `preferredLanguage` (default `"pt"`, dormant seam), `marketingConsent` (default `false`), **`acquisitionSource` + `acquisitionCampaign` (optional — UTM capture)**, `deletedAt`
- [x] Drop legacy `public.users` + `public.sessions` (0 rows — safe); also dropped orphaned `"Role"` enum type
- [x] Better Auth migration → creates `user`, `session`, `account`, `verification` tables; **add RLS ENABLE for each in the same migration**
- [x] Run `get_advisors(security)` → 0 `rls_disabled_in_public`
- [x] `requireAuth` (rejects soft-deleted users) + `requireAdmin` middleware (sets `req.user`)
- [x] Client: auth-client, `LoginPage`, `ProtectedRoute`, `AdminRoute`, `Layout`
- [x] `disableSignUp: true`; seed admin (Jilson) + a seeded **test member** (lets login be tested before billing exists); registration open to all countries
- [x] Account page (log out; profile)
- [x] **Attribution capture (UTM).** Client reads `utm_source`/`utm_campaign`/`utm_*` on first visit and stores in cookie/localStorage; on user creation (here in P1 for the seed/test member, and at the Stripe webhook in P4) persist into `User.acquisitionSource`/`acquisitionCampaign`. *(P1 = client first-touch capture in `attribution.ts`; server-side persistence lands with the Stripe webhook in P4.)* ~Zero build cost, high value: without it the YouTube→site funnel runs blind (can't tell which video converts a subscriber). Must exist **before** the channel starts sending traffic. (Not "Priority Zero" over auth/billing — it's a cheap seam that just needs to be live by funnel go-live.)
- **Done when:** members log in, protected routes redirect, admin gate works, soft-deleted users are blocked.

> Note: `Subscription` and `temAcessoAtivo()` are NOT built here — they are born with Stripe in Phase 4. Phase 1 stays lean (identity + shell). The `User` already carries its optional fields so it never needs reshaping later.

---

## Etapas fechadas de fases ainda abertas

> Desde 11/10/2026 (decisão do operador), numa fase LONGA e ainda aberta as etapas fechadas e
> publicadas descem para cá em conjuntos de 3 ou 4 — inteiras, com os checkboxes intactos. No
> plano fica o título de cada uma, marcado, com o ponteiro para cá.
> **Quando a fase fechar** (condição do operador, 11/10/2026): o que restar dela desce, e as
> etapas que já estão aqui se juntam às que chegam NUMA seção só, na ordem das etapas, que sobe
> para *Fases concluídas* — a fase nunca fica em dois pedaços.

### Phase 4 — Billing & Membership Gate (Stripe) — etapas 4.0 a 4.5  *(movidas em 11/10/2026)*

- [x] **4.0 — A Stripe em modo de TESTE (operador, no painel, sem código, ~1 h).** A conta (CNPJ/MEI,
      pagamento no Banco do Brasil) — o modo de teste funciona antes de a conta ser aprovada. No
      **modo de teste**: o produto "Assinatura" com os **2 preços em real** (mensal R$ 99,90, anual
      R$ 995) · **um cupom de 100% "para sempre"** e **um código promocional** dele, com limite de
      usos · em *Billing → falhas de pagamento*: **"cancelar a assinatura quando todas as tentativas
      falharem"** (achado de segurança de 29/09, item abaixo) · **sem Customer Portal**. **As chaves
      não passam pelo chat:** o operador cola no `server/.env` (dev) e, na 4.3, no Railway — o passo a
      passo vem na hora (*CLAUDE.md → Secrets in agent sessions*).
      `[FATO — context7 /websites/stripe, 10/10/2026, 4 consultas]` a Stripe hoje chama o ambiente de
      teste de **sandbox** ("sandbox (test mode)"). Cada ambiente tem as suas chaves, e o que se cria
      num não existe no outro: **o produto, os preços e o cupom nascem no MESMO ambiente de onde
      saem as chaves.** A conta do operador mostra dois: o **"Test mode"** padrão, que *"shares
      certain settings with live mode"* (mexer numa configuração ali pode mudar a da conta de
      verdade), e uma **área restrita** isolada. **O operador usou a área restrita** (10/10/2026).
      **Feito por ele em 10/10/2026, na área restrita:** um produto, **"Assinatura Jilson Santana"**
      (o nome é dele; aparece no recibo do aluno), com os 2 preços em real e uma **lookup key** em
      cada um — `assinatura_mensal` (R$ 99,90/mês) e `assinatura_anual` (R$ 995/ano). **Convenção de
      engenharia:** o site acha o preço pela lookup key, nunca pelo ID nem pelo nome — assim não há
      código de preço para colar em nenhum ambiente, e no lançamento basta repetir as mesmas chaves
      na conta de verdade. **O cupom:** "Free" (nome dele), 100%, para sempre, com o código de teste
      `TESTE100` (5 usos). É um cupom só para a conta de aluno dele e para quem ele quiser
      presentear; o que muda por pessoa é o **código** *(sugestão do agente para a conta de verdade,
      a confirmar no lançamento: um código por pessoa, com 1 uso)*. **Falha de pagamento** (tela
      *Billing → Revenue recovery → Retries*, como já vinha): a 1ª falha deixa a assinatura em
      atraso, e todas as tentativas falhando **cancela**. **As chaves** de teste (a secreta e a
      publicável) estão no `server/.env`; o segredo do webhook entra na 4.2.
      **FECHADA em 10/10/2026, conferida pela API da Stripe (só leitura, sem mostrar chave):** as
      duas chaves são de teste e da mesma conta; os 2 preços saem pelas lookup keys, ativos, no
      mesmo produto, e ele é o único ativo; o código `TESTE100` está ativo, com 0 de 5 usos, no
      cupom de 100% para sempre. *Fica para o GO-LIVE: ativar a conta de verdade e refazer tudo lá
      (Fase 7).*
- [x] **4.1 — O webhook e o espelho (código, ALTO RISCO).** Dependência nova: **`stripe`** (servidor).
      `POST /api/stripe/webhook` montado **acima** do `express.json()`, com o corpo cru → confere a
      assinatura → grava o `event.id` (tabela nova, com RLS; repetido = nada) → **recalcula** o
      espelho buscando a assinatura na Stripe (nunca o retrato do evento) → responde 200. A assinatura
      se liga à conta pelo `userId` que o NOSSO checkout grava no cliente da Stripe; sem ele, o evento
      é registrado e ignorado (o visitante entra na 4.7). Testes de servidor com a Stripe simulada **na
      nossa fronteira**: assinatura inválida 400, evento repetido sem efeito, fora de ordem recalcula,
      cada status no espelho. Dá para construir e testar **sem a conta da Stripe pronta**.
      **FEITO E PUBLICADO (09/10/2026, `main` = `6b09789`).** `stripe@23.0.0` fixada (API 2026-09-30) ·
      `server/src/lib/stripe.ts` (a nossa fronteira: verificar o aviso, buscar a assinatura) ·
      `lib/assinaturas.ts` (o espelho) · `routes/stripe-webhook.ts` · migrations
      `20261009180000_avisos_da_stripe` (tabela `stripe_event`, com RLS) e
      `20261009190000_assinatura_de_teste_ou_real` (`subscription.livemode`), aplicadas no `dev`
      com o retrato antes/depois idêntico, zero tabela sem RLS e `migrate diff` sem diferença.
      **O "pago até":** o `currentPeriodEnd` do espelho é o fim do último período PAGO, não o fim
      do período da Stripe (`billing.md` → *O espelho*). Sem a chave do webhook, todo aviso é
      recusado (503).
      **Revisão de segurança (`security-vulnerability-reviewer`) — os achados e o destino de cada um:**
      (P1) dois avisos da mesma assinatura ao mesmo tempo deixavam a resposta velha por cima da nova
      → **corrigido**: uma assinatura de cada vez (`pg_advisory_xact_lock`), com a busca na Stripe
      **dentro** da trava · (P1) a cobrança pausada continua `active` na Stripe → **corrigido**: vira
      `paused` no espelho · (P1) assinatura paga sem conta passava calada → **corrigido**: o registro
      grita (erro, com a assinatura e o cliente) · (P1) o reembolso não corta o acesso → **P56**, do
      operador · (P2) recusas sem registro → **corrigido**, sem o corpo do aviso · (P2) assinatura
      do modo de teste viraria acesso eterno depois do GO-LIVE → **corrigido** com a coluna
      `livemode` + item novo na Fase 7 · (P2) RLS da tabela nova → conferido no `dev` (produção
      confere no pre-deploy) · (P2) a sessão cair ao perder o acesso → já era a **etapa 4.4**.
      **Testes:** 16 de servidor (o aviso de ponta a ponta, com assinaturas da própria biblioteca
      da Stripe) + 7 unitários (o espelho a partir da Stripe). **Mutação:** 7 de 7 reprovaram —
      sem a trava, a busca fora da trava, pausa vista como ativa, modo de teste não gravado, sem
      conta só avisando, recusa registrando o erro inteiro, 503 mudo.
      **Docs check (context7):** Stripe → `/websites/stripe` → a verificação do aviso com o corpo
      cru e as mudanças da API "basil" (o período por item, a fatura → assinatura) — **4 consultas
      no dia**, contando as 2 do plano. A pausa e o reembolso foram conferidos nos tipos da própria
      `stripe@23.0.0`.
- [x] **4.2 — Assinar com a conta logada: o checkout embutido (código, ALTO RISCO).** Dependências
      novas: **`@stripe/stripe-js`** e **`@stripe/react-stripe-js`** (site). Mensal **ou** anual (trava
      do `billing.md`), o campo do código promocional e o **Payment Element**; o servidor cria o
      cliente (com o `userId`) e a assinatura; com o cupom de 100%, ela já nasce ativa; a tela de
      "pronto" espera o webhook. **Decidido pelo operador (09/10/2026):** as duas bibliotecas do
      site **aprovadas**; chega-se à tela pela **aula trancada** (um botão Assinar embaixo de "Esta
      aula é para assinantes.") e pelos **botões Assinar da home** quando há login (sem login é a
      4.7). Falta: os textos — rascunho do agente, para a revisão dele.
      **PONTO DE PARTIDA (10/10/2026 — o que a sessão que abrir esta etapa precisa saber):**
      (a) no `server/.env` já estão `STRIPE_SECRET_KEY` e `STRIPE_PUBLISHABLE_KEY`, de teste, da
      área restrita; `STRIPE_WEBHOOK_SECRET` está **vazio**, e o **Stripe CLI não está instalado** —
      para o aviso chegar no computador, o operador instala e faz o `stripe login` (interativo,
      nunca chave por argumento) e o `stripe listen` dá o segredo, que ele cola no `.env` fechado ·
      (b) **a chave publicável sai do servidor** (`STRIPE_PUBLISHABLE_KEY`), não do build do site:
      trocar de ambiente é trocar variável num lugar só · (c) **os preços se acham pela lookup key**
      (`assinatura_mensal`, `assinatura_anual`), nunca por ID nem por nome · (d) `[FATO — tipos da
      `stripe@23.0.0`]` no código promocional, o cupom fica em `promotion.coupon` · (e) **no banco
      de dev o `member@` JÁ tem a assinatura de teste do seed**, que dá acesso: o teste do checkout
      precisa de uma conta sem assinatura — como, se decide no plano da etapa · (f) **o endereço da
      tela é decisão a levar ao operador:** tela do aluno nasce sob `/aluno/`, e o `/assinar`
      público da *Rendering Boundary* é o do visitante (4.7) · (g) para conferir a Stripe sem ver
      chave: um script só de leitura que imprime sim/não e o que existe, nunca a mensagem de erro
      da Stripe (ela pode trazer um pedaço da chave).
      **SE A SESSÃO PARAR NO MEIO** (limite de uso): o plano aprovado é escrito AQUI antes do
      código, cada passo é um commit no `dev`, e o último passo de cada sessão é uma linha
      *"parei em …"* neste item — a próxima conversa continua daí, sem depender da anterior.
      **O PLANO APROVADO (operador, 10/10/2026).** Decisões dele nesta data: a tela mora em
      **`/aluno/assinar`** e a de depois do pagamento em **`/aluno/assinar/concluido`** (o `/assinar`
      curto fica para o visitante, 4.7) · quem **já é assinante** e abre a tela vê "Você já é
      assinante" com um botão para o Início · para testar no computador, o agente apaga **só a
      assinatura de mentira do seed** do `member@` no banco de dev, pedindo o OK na hora (o seed a
      devolve) · **o que ficou de fora desta etapa foi escrito nas etapas 4.6 a 4.9** (*"quero fechar
      a Stripe em 100% ao final dessas sessões"*), e a 4.2 é montada para elas entrarem **sem
      refazer** a tela (*Para não refazer depois*, abaixo).
      **O que o aluno vê:** mensal ou anual · o campo do código promocional · o cartão. Com código de
      100% o cartão some e o botão já assina. Depois, a tela de concluído, que espera o aviso da
      Stripe e libera a escola.
      **Como fica por dentro (convenção de engenharia):** o site manda só `plano` (mensal|anual) e
      `codigo`; preço, valor e conta **nunca** vêm do navegador (o `userId` é o da sessão) · o cartão
      é preenchido **antes** de a assinatura existir na Stripe (Elements em modo `subscription`; a
      assinatura nasce no clique em Assinar) — quem só olha a tela não deixa assinatura pela metade
      lá · **só o webhook grava o espelho**, como na 4.1 · tabela nova **`stripe_customer`**
      (`userId` → cliente da Stripe, `livemode`, com RLS): uma conta é sempre UM cliente · dois
      cliques não viram duas assinaturas (trava por conta; a assinatura incompleta anterior é
      reaproveitada ou cancelada) · quem já tem acesso (`temAcessoAtivo()`) recebe 409 · a chave
      publicável só sai do servidor se começar com `pk_` (a secreta colada na variável errada nunca
      vai ao navegador) · o erro da Stripe nunca vai inteiro para o registro nem para a resposta ·
      nesta etapa, **só cartão** e **só real**.
      **Rotas novas** (`server/src/routes/billing.ts`, todas com `requireAuth`, depois do
      `express.json()`): `GET /api/billing/planos` (os 2 preços lidos da Stripe + a chave
      publicável) · `POST /api/billing/previa` (o valor de hoje com o código, calculado pela própria
      Stripe — `invoices.createPreview`; não gasta uso do código) · `POST /api/billing/assinatura`
      (cria; devolve `ativa`, ou `pagar` com o segredo do pagamento) · `GET /api/billing/assinatura`
      (tem acesso? — a tela de concluído pergunta até a resposta ser sim).
      **Passos — um commit cada, no `dev`; em todos: typecheck, a suíte inteira e build:**
      - [x] **Passo 1 — servidor, os planos.** `GET /api/billing/planos` + o tipo `Plano` no `core` +
            testes de servidor. *Prova:* com login, devolve R$ 99,90 e R$ 995 da área restrita.
            **FEITO (10/10/2026).** `core/src/constants/billing.ts` · `server/src/routes/billing.ts` ·
            em `lib/stripe.ts`: `buscarPrecos` (pela lookup key; lança se um preço faltar ou vier
            com o intervalo trocado), `chavePublicavel` (só `pk_`) e `erroSemMensagem`. **Provado no
            app de verdade, com o banco de dev e a área restrita:** sem login 401; com o `member@`,
            200 com mensal 9990 e anual 99500 centavos, em `brl`, e a chave publicável de teste.
            **Testes:** 6 de servidor + 8 unitários. **Mutação:** 4 de 4 reprovaram (a rota sem
            login, a chave sem conferir o `pk_`, o código do preço na resposta, o intervalo sem
            conferir).
      - [x] **Passo 2 — servidor, o código.** `POST /api/billing/previa` + testes. *Prova:*
            `TESTE100` → R$ 0; código errado → recusado.
            **FEITO (10/10/2026).** `core/src/schemas/billing.ts` (`previaSchema`: plano + código,
            aparado) · em `lib/stripe.ts`: `buscarCodigo` e `calcularPrevia` (a prévia da fatura da
            Stripe). Código que não existe e código que não vale para a compra dão a MESMA resposta
            (400 `CodigoInvalido`); o código digitado não vai para o registro. **Provado no app de
            verdade, com o banco de dev e a área restrita:** `TESTE100` no mensal e ` teste100 `
            (minúsculas, com espaço) no anual → R$ 0, 100% para sempre; código inexistente → 400;
            sem login → 401; **os usos do `TESTE100` continuaram 0 de 5.** **Testes:** 9 de servidor
            + 5 unitários. **Mutação:** 5 de 5 reprovaram (sem login, sempre o preço do primeiro
            plano, código inexistente seguindo para o cálculo, cupom vencido aceito, código sem
            aparar). *Sem teste automático, só a prova acima:* qual recusa da Stripe na prévia conta
            como "código não vale" (`calcularPrevia` olha se o erro é do desconto) — é a função que
            vai à rede.
            **Limitação conhecida, NÃO resolvida no passo 3:** um código promocional preso a UM
            cliente na Stripe só confere com o cliente no pedido, e a prévia não manda cliente — esse
            código apareceria como inválido na tela (na criação da assinatura a Stripe confere
            certo). Hoje não existe código assim (`TESTE100` vale para qualquer conta). *Gatilho: o
            operador criar um código preso a um cliente — aí a prévia passa a mandar o cliente da
            conta.*
      - [x] **Passo 3a — a tabela do cliente da Stripe e "tem acesso?".** **FEITO (10/10/2026).**
            Migration `20261010120000_cliente_da_stripe` (tabela `stripe_customer`, com RLS; o SQL
            saiu do `prisma migrate diff` contra o banco local) + o model `StripeCustomer` + `GET
            /api/billing/assinatura` (a resposta do gate para a conta da sessão). **Provado num banco
            limpo** (o local, recriado do zero pela suíte): `migrate diff` sem diferença, zero tabela
            em `public` sem RLS. **Testes:** 4 de servidor. **Mutação:** 2 de 2 reprovaram (sem login,
            "sim" sem perguntar ao gate). O item da Fase 7 (*as de teste saem do banco de produção*)
            já inclui a tabela nova.
            **Aplicada no banco de DEV em 10/10/2026, com o OK do operador** (`npx prisma migrate
            deploy`, de dentro de `server/`): o retrato das 24 tabelas igual antes e depois, fora a
            tabela nova (0 linhas) e o registro da migration; login do admin e do `member@` 200 antes
            e depois; zero tabela em `public` sem RLS; `migrate diff` sem diferença.
      - [x] **Passo 3b — servidor, criar a assinatura.** `POST /api/billing/assinatura` + testes (401
            · plano inválido · 409 de quem já tem acesso · o corpo não escolhe preço nem conta ·
            código inválido · um cliente só · 100% → ativa · cartão → pagar · Stripe fora do ar sem
            vazar o erro · dois cliques) + **mutação**. **O desenho, para quem continuar:** tudo
            dentro de uma trava por conta (`pg_advisory_xact_lock`, como o aviso da 4.1) → (1) quem
            `temAcessoAtivo()` recebe 409 `JaAssinante` → (2) acha ou cria o cliente (`metadata.userId`;
            grava em `stripe_customer`) → (3) lista as assinaturas dele NA STRIPE: uma viva (nem
            incompleta, nem cancelada) → 409 `JaAssinante` (o espelho está atrasado); uma incompleta
            do MESMO plano e código → devolve o segredo dela (tentar de novo depois do cartão
            recusado não cria outra); incompleta de outro plano ou código → cancela, e se o
            cancelamento mostrar que ela tinha sido paga nesse instante, grita no registro e responde
            409 → (4) cria: `payment_behavior: default_incomplete`, só `card`,
            `save_default_payment_method: on_subscription`, `metadata` com `userId`, plano e código,
            `expand` do `latest_invoice.confirmation_secret` e do `pending_setup_intent`. **A
            resposta:** `ativa` (a Stripe já ativou: nada a pagar hoje e desconto para sempre) ·
            `pagar` com o segredo e o tipo — `pagamento` (cobra hoje) ou `cartao` (nada hoje, mas o
            desconto acaba: guarda o cartão para a cobrança seguinte). **Consequência para a tela:**
            o cartão só some com desconto de 100% PARA SEMPRE; com 100% só na primeira cobrança, o
            cartão é pedido. *A conferir na área restrita antes de confiar:* cancelar uma assinatura
            incompleta leva a `incomplete_expired`; e o que vem em `pending_setup_intent` com 100%.
            A prova na área restrita pode usar o banco LOCAL (que já tem a tabela) com as chaves de
            teste, sem esperar o banco de dev.
            **FEITO (10/10/2026).** `server/src/lib/checkout.ts` (a regra) · em `lib/stripe.ts`:
            `criarCliente`, `assinaturasDoCliente`, `cancelarIncompleta`, `criarAssinatura` (as formas
            de pagamento numa lista só, hoje `card`) · `assinarSchema` no `core`. **Dois fatos medidos
            na área restrita:** cancelar a incompleta a leva a `incomplete_expired` e anula a fatura;
            o segredo da fatura aberta é de um pagamento (`pi_`). **Sem chave de repetição ao criar o
            cliente, de propósito:** ela devolveria por 24 h o mesmo cliente mesmo depois de apagado
            no painel. **Provado no app de verdade, com o banco LOCAL e a área restrita:** assinar
            mensal → `pagar`, com o cliente da conta levando o `userId` · tentar de novo → o MESMO
            segredo, uma assinatura só · trocar para anual → a mensal vira `incomplete_expired` e
            nasce a anual · confirmar com o cartão de teste → 99500 centavos pagos, assinatura
            `active`, cartão guardado nela · o espelho da 4.1 buscando essa assinatura na Stripe →
            "tem acesso?" passa de não para sim · assinar de novo → 409 `JaAssinante`. O cliente de
            teste foi apagado no fim. **Testes:** 18 de servidor + 5 unitários. **Mutação:** 10 de 10
            reprovaram (sem a trava, quem já tem acesso assinando, a viva da Stripe ignorada, a
            incompleta de outro plano e a de outro código reaproveitadas, a cancelada sem conferir,
            o cliente não guardado, o desconto que acaba sem pedir cartão, o 100% para sempre
            pedindo cartão, o segredo saindo de fatura fechada).
            **NÃO provado ainda, fica para o passo 6 (com o operador):** o caminho do `TESTE100`
            criando a assinatura de verdade (gastaria 1 dos 5 usos), a confirmação pelo navegador e
            o aviso chegando pelo `stripe listen`. **Sem teste automático, só a prova acima:** as
            quatro funções que vão à rede (os parâmetros que a Stripe aceita).
      - [x] **Passo 4 — site, a tela `/aluno/assinar`.** `@stripe/stripe-js` e
            `@stripe/react-stripe-js` entram aqui. O layout padrão (`PageContainer`…), os textos pelo
            `useT()`, e a nossa fronteira com o Stripe.js num arquivo só (os testes simulam ELA, nunca
            `@stripe/*`). Estados: carregando, erro, já assinante, código aplicado ou inválido, valor
            zero sem cartão, enviando. Teste de componente de cada um + mutação. Medir o peso no
            pacote do aluno; `import()` novo entra em `PEDACOS_DO_ALUNO`. O envio passa por
            `semInterromper()`.
            **FEITO (10/10/2026).** `@stripe/stripe-js@10.0.0` e `@stripe/react-stripe-js@7.0.0`,
            fixadas · `client/src/lib/stripe-do-site.tsx` (a ÚNICA porta para `@stripe/*` no site) ·
            `lib/assinar.ts` · `components/assinar/` (o formulário, separado da página: plano,
            código, resumo, cartão, botão) · `pages/aluno/AssinarPage.tsx` · a rota, atrás do login.
            **As formas de pagamento vêm do servidor** (`formasDePagamento` em `GET
            /api/billing/planos`, a mesma lista com que ele cria a assinatura). **Os textos entraram
            no dicionário como RASCUNHO** (`app.assinar.*`, PT e EN) — o operador revisa depois
            (*"isso fazemos depois, é detalhe"*, 10/10/2026); um texto a mais que o rascunho não
            tinha: "Escolha o plano" | "Choose your plan", a legenda do grupo dos planos.
            **O peso, medido:** direto, o formulário punha +9,3 KB compactados no pacote de todo
            aluno (231,1 → 240,4 KB); carregado à parte (`lazy()` + `PEDACOS_DO_ALUNO`), o pacote
            ficou em 232,7 KB e o formulário em 8 KB só dele. O script da Stripe só é baixado quando
            a tela abre (`@stripe/stripe-js/pure`). **Testes:** 21 de componente (carregando, erro,
            já assinante, os valores do servidor, o código, o envio na ordem, cartão incompleto e
            recusado, 409, dois cliques) + 1 do pré-carregamento. **Mutação:** 9 de 9 reprovaram —
            uma foi refeita: a primeira forma dela dava o mesmo resultado na tela por outro caminho
            e não provava nada.
            **NÃO provado ainda, fica para o passo 6:** o campo de verdade da Stripe abrindo num
            navegador — os testes usam um dublê da nossa fronteira, e `stripe-do-site.tsx` só tem a
            conferência de tipos contra a biblioteca.
      - [x] **Passo 5 — site, o concluído e as entradas.** `/aluno/assinar/concluido` (espera o
            aviso; mensagem calma se demorar) · o botão Assinar embaixo de "Esta aula é para
            assinantes." · os botões Assinar da home viram link quando há login (sem login ficam como
            hoje, até a 4.7) + testes.
            **FEITO (10/10/2026).** `pages/aluno/AssinaturaConcluidaPage.tsx`: pergunta ao servidor
            a cada 2 s até ele dizer que a conta tem acesso (inclusive depois de falha de rede), e
            então para; aos 20 s sem resposta, diz que continua conferindo; confirmada, esquece o
            que as outras telas guardaram de antes (senão a aula mostraria "para assinantes" por um
            instante, logo depois de pagar). **A aula trancada:** o botão Assinar embaixo do aviso,
            **só para quem está logado** — o visitante não vê botão, como na home (ele é a 4.7).
            **A home:** os dois botões Assinar (o do preço e o do fim da página) levam à tela de
            assinar quando há login e o botão está ligado; são os MESMOS botões do mock, dentro de
            um formulário que só navega (`display: contents`, fora do desenho); sem login e na
            página em inglês desligada, nada muda. Os endereços das duas telas moram no `core`
            (`TELA_DE_ASSINAR`, `TELA_DE_CONCLUIDO`), para o servidor e o site apontarem igual.
            **Testes:** 6 de componente (concluído) + 3 na página da aula + 3 de servidor (home).
            **Mutação:** 10 de 10 reprovaram.
            **Fica como está, por não ter texto nem decisão:** quem abre `/aluno/assinar/concluido`
            sem ter assinado vê "confirmando" e depois "está demorando", sem um caminho de volta
            na própria tela (a navegação da escola continua ao lado).
      - [x] **Passo 6 — a prova no computador, a revisão de segurança e os docs.** O operador instala
            o Stripe CLI (`stripe login` interativo; o `stripe listen` dá o segredo, que ele cola no
            `.env` FECHADO). O `member@`, sem a assinatura de mentira, assina com `4242` e com
            `TESTE100` → a aula trancada abre. `security-vulnerability-reviewer` no código de
            cobrança, com os achados e o destino de cada um aqui. `billing.md` reconciliado e o
            checkbox da etapa. *(Cada teste de verdade com `TESTE100` gasta 1 dos 5 usos.)*
            **Revisão de segurança FEITA (`security-vulnerability-reviewer`, 10/10/2026): nenhum
            bloqueio, 1 achado P1 e 19 P2. O destino de cada um:**
            **Corrigidos nesta etapa** — (P1) a Stripe diz que a conta assina e o espelho não dá
            acesso: era só um aviso → agora **grita** (erro) quando ela dá acesso lá, porque há
            alguém pagando e trancado fora; o conserto de verdade (o checkout chamar a sincronia)
            foi para a **4.4** · quem já tem acesso **nem chega à Stripe** (a resposta dizia a um
            assinante se um código existe) · a incompleta se reaproveita pelo **preço de verdade**,
            não pelo rótulo do plano (com o preço trocado, cobraria o valor velho) · desconto
            recusado pela Stripe **na criação** vira 400 `CodigoInvalido`, não 500 · o que vai à
            Stripe (o desconto, o `userId`) passou a sair de **funções puras com teste** — antes,
            apagar o desconto ou o `userId` deixava a suíte verde · a busca da assinatura da 4.1
            também sobe **sem a mensagem da Stripe** · **nenhuma resposta por conta fica em cache**
            (`private, no-store`), nem a home de quem está logado (`private, no-cache`; a do
            visitante não muda) · testes novos: duas contas com clientes diferentes, o checkout não
            grava o espelho, o segredo fora das quatro vias do registro, a conferência de novo com
            a trava. **Provado de novo na área restrita depois das correções** (assinar, tentar de
            novo, trocar de plano, pagar, o espelho liberar, 409 com código qualquer). **Testes:**
            +12 de servidor e +6 unitários. **Mutação:** 12 de 12 reprovaram.
            **Movidos, com destino:** 4.3 — conferir o `connection_limit` do banco no Railway e
            rodar o SQL de RLS em produção · 4.4 — a sincronia chamada do checkout; um tratador de
            erro próprio no fim de `/api` · 4.7 — o limite por conta e por IP nas DUAS rotas que
            conferem código; a trava que segura conexão esperando; o checkout público nunca no ar
            com chave de teste; medir se a incompleta com código gasta uso dele · 4.9 — a corrida do
            cancelamento com o Pix; limpar o endereço da volta · Fase 7 — a conferência de
            `livemode` na subida, a lista de erros de cobrança para o monitor, o código de 100% da
            conta de verdade · `billing.md` → *Limitações conhecidas* — código que não é "para
            sempre"; apagar a conta com assinatura na Stripe.
            **Sem teste automático, só a prova na área restrita:** a limpeza do erro em
            `buscarAssinatura` e qual recusa da Stripe conta como "o desconto não vale".
            **O DEFEITO QUE SÓ O NAVEGADOR MOSTROU (10/10/2026):** no primeiro teste do operador,
            **o campo do cartão não apareceu** — a seção Pagamento veio vazia, sem erro na tela.
            `[FATO — lido do que a própria Stripe registra, num navegador de teste em localhost]` o
            Stripe.js no ar recusa a opção `paymentMethodTypes` (*"is no longer supported in this
            version of Stripe.js. Use `allowedPaymentMethodTypes`…"*). Nenhum gate acusou: os testes
            de tela usam um dublê da nossa fronteira, e a conferência de tipos não viu porque as
            opções eram montadas com `...espalhar`, que o TypeScript não confere. **Corrigido**
            (`client/src/lib/stripe-do-site.tsx`): `allowedPaymentMethodTypes`, com as opções
            escritas por extenso — a opção antiga agora quebra a compilação (conferido).
            **PROVADO NO NAVEGADOR DE TESTE (Playwright, localhost, área restrita, com o `stripe
            listen` do operador ligado):** o `member@` vê o campo (número, validade, código de
            segurança, país) · a conta de **admin** assinou o mensal com o cartão `4242`: `POST
            /api/billing/assinatura` 200 → tela de concluído → "Confirmando sua assinatura…" →
            **"Assinatura confirmada"**. O espelho foi gravado pelo aviso que chegou pelo `stripe
            listen` (ativa, paga até 10/11/2026, modo de teste); na Stripe, ativa e com o cartão
            guardado. O que o teste criou foi apagado (o cliente na Stripe e as linhas do admin no
            banco de dev); o `member@` ficou como estava, sem assinatura.
            **PROVADO PELO OPERADOR (10/10/2026), no navegador dele:** o `member@`, da aula
            trancada à tela de assinar, pagou com o cartão `4242` — *"funcionou"*. No banco de dev:
            a assinatura dele ativa, paga até 10/11/2026, do modo de teste, gravada pelo aviso.
            **A TELA SIMPLIFICADA, a pedido dele no mesmo dia** (*"faltou destacar o desconto no
            plano anual, e 'hoje você paga…' ficou confuso; veja como simplificar como a Anthropic
            faz"*): cada cartão de plano diz o preço e como é cobrado ("Cobrado todo mês" | "Cobrado
            uma vez por ano"), o anual leva o selo **"17% de desconto"** — CALCULADO dos dois
            preços do servidor, nunca um texto fixo —, o plano escolhido fica destacado, e o bloco
            "Hoje você paga" **só aparece com código promocional** (sem código, repetia o preço do
            cartão). Textos novos como rascunho; as duas frases do "Depois, …" saíram do dicionário.
            **Testes:** +3 de componente. **Mutação:** 5 de 5 reprovaram. Conferido em duas fotos da
            tela no navegador de teste. **O acabamento visual é do Antigravity** (*"depois ajuste
            design com Antigravity"*): a estrutura está pronta para ele.
            **Achado, fora desta etapa (reportado ao operador):** com os servidores de
            desenvolvimento ligados, a suíte do site estoura o tempo em testes de peças carregadas
            à parte (13 e depois 8 falhas, sempre diferentes; carga da máquina acima de 100). Com 3
            processos em vez de 16 (`vitest run --maxWorkers=3`), 794 de 794. O gate desta
            correção foi rodado assim, mais a suíte de servidor inteira (641).
      **Para não refazer depois (o que cada etapa seguinte ACRESCENTA, sem reescrever a 4.2):** o
      valor e a **moeda** já vêm do servidor, e o cartão já é lido antes de cobrar → o dólar (4.8)
      entra no servidor · as formas de pagamento saem de **uma lista no servidor** (hoje só `card`)
      → o Pix (4.9) é um item a mais, com o mandato · o formulário (plano + código + cartão) é um
      **componente separado da página** → o visitante (4.7) usa o mesmo, com o campo de e-mail ·
      "já tem acesso?" é uma função só → a volta de quem cancelou (4.6) muda ali.
      **Textos — RASCUNHO do agente, para a revisão do operador ANTES do passo 4** (vão para
      `app.assinar.*` no dicionário; português | inglês):
      título: "Assinar" | "Subscribe" · abaixo dele: "Uma assinatura, todos os cursos e trilhas." |
      "One subscription, every course and learning path." · planos: "Mensal" | "Monthly", "Anual" |
      "Yearly", "/mês" | "/month", "/ano" | "/year" · no anual: "equivale a {valor} por mês" | "works
      out to {valor} per month" (calculado do preço) · abaixo dos planos: "Sem fidelidade. Cancele
      quando quiser." | "No commitment. Cancel anytime." · código: "Código promocional" | "Promo
      code", "Aplicar" | "Apply", "Remover" | "Remove", "Este código não é válido." | "This code
      isn't valid." · desconto: "{desconto} de desconto em todas as cobranças" | "{desconto} off
      every charge", "{desconto} de desconto na primeira cobrança" | "{desconto} off your first
      charge", "{desconto} de desconto por {meses} meses" | "{desconto} off for {meses} months" ·
      resumo: "Hoje você paga" | "Due today"; sem código: "Depois, {valor} por mês até você
      cancelar." | "Then {valor} per month until you cancel." (e a versão "por ano" | "per year") ·
      cartão: "Pagamento" | "Payment" · botão: "Assinar" | "Subscribe", "Processando…" |
      "Processing…" · erros: "Não foi possível carregar os planos. Tente de novo." | "We couldn't
      load the plans. Please try again.", "Não foi possível concluir a assinatura. Confira os dados
      e tente de novo." | "We couldn't complete your subscription. Check your details and try
      again." · já assinante: "Você já é assinante." | "You're already a subscriber.", "Ir para o
      Início" | "Go to Home" · concluído: "Confirmando sua assinatura…" | "Confirming your
      subscription…", "Assinatura confirmada. Bons estudos!" | "You're subscribed. Happy
      learning!", "Começar a estudar" | "Start learning"; se demorar: "Está demorando mais que o
      normal. Seu pagamento não se perde: esta página continua conferindo." | "This is taking longer
      than usual. Your payment is safe: this page keeps checking." · na aula trancada, o botão:
      "Assinar" | "Subscribe".
      *A decidir por ele na revisão: se a tela leva uma linha sobre o reembolso de 7 dias (o texto
      em português da home segue mais vago que o em inglês — `billing.md` → Reembolso).*
      **Docs check (context7):** Stripe → `/websites/stripe` → a assinatura com o Payment Element
      (`default_incomplete` + `latest_invoice.confirmation_secret` + `confirmPayment` com
      `return_url`) e o cartão antes da assinatura (`stripe.elements({ mode: "subscription",
      amount, currency })` + `elements.submit()` + `confirmPayment` com o `clientSecret`) — **2
      consultas** (10/10/2026). Nos tipos da `stripe@23.0.0`: `prices.list` por `lookup_keys`,
      `invoices.createPreview`, `PromotionCode.promotion`, `Invoice.confirmation_secret`.
      **Uma 3ª consulta no passo 4** (o lado do site: `elements.update` do valor,
      `redirect: "if_required"`, `confirmSetup`) — **3 no dia para esta etapa**; acima das 2 que
      o `CLAUDE.md` dá como sinal, porque a etapa tem servidor e site.
      **Respostas do operador (10/10/2026):** a migration no banco de dev — **OK** (aplicada) · os
      textos — *"isso fazemos depois, é detalhe"* (seguem como rascunho no dicionário) · **o cartão
      só some com desconto de 100% PARA SEMPRE** (com 100% só na primeira cobrança o cartão é
      pedido, porque a cobrança seguinte precisa dele) — **OK**.
      **PAREI EM (10/10/2026):** passos 1 a 5, a revisão de segurança com as correções e o
      `billing.md` feitos e commitados no `dev` (nada publicado). **Só falta a prova no navegador,
      com o operador:** o Stripe CLI (o Mac dele é Intel e não tem Homebrew — baixado direto da
      página oficial, versão 1.53.1, em `~/stripe-cli` — **instalado pelo agente em 10/10/2026**,
      conferido com a soma oficial), o `stripe login` na área restrita (**feito por ele**), o
      `~/stripe-cli/stripe listen --all-snapshot --forward-to localhost:3000/api/stripe/webhook`
      (`[FATO — a ajuda da própria CLI 1.53.1]` ela exige dizer quais avisos encaminhar; sem
      `--all-snapshot` ou `--events`, recusa com *"must specify events to forward"*), o segredo `whsec_` colado
      no `server/.env` com o arquivo FECHADO no editor, e o OK dele para apagar a assinatura de
      mentira do `member@` no banco de dev. Depois: `4242` e `TESTE100`, e o checkbox da etapa.
      **ATUALIZAÇÃO (10/10/2026, mais tarde):** a CLI está instalada, o login e o `listen` feitos,
      o segredo no `.env`, e a assinatura de mentira do `member@` **apagada do banco de dev com o
      OK dele** (o seed a devolve). O campo do cartão não abria — corrigido e provado no navegador
      de teste com a conta de admin (acima). **Falta só o operador repetir com o `member@`** (a
      aula trancada → Assinar → `4242`) e depois o `TESTE100`; para o segundo teste, tirar antes a
      assinatura que o primeiro criar (o cliente na Stripe e as linhas dele no banco de dev).
      **ATUALIZAÇÃO 2 (10/10/2026):** o teste dele com o `member@` e o cartão `4242` **funcionou**,
      e a tela foi simplificada a pedido dele. **Para fechar a etapa falta só o `TESTE100`** — o
      `member@` está assinando (a do cartão): com o OK dele, tirar essa assinatura (o cliente na
      área restrita e as duas linhas no banco de dev) e ele assina de novo com o código.
      **ETAPA FECHADA (10/10/2026).** Com o OK dele, a assinatura do cartão foi tirada (o cliente
      apagado na área restrita, as duas linhas do `member@` apagadas no banco de dev) e **ele
      assinou de novo com o `TESTE100`** — *"feito, ficou ótimo"*: a tela foi a "Assinatura
      confirmada". **Conferido nos registros, só leitura:** na Stripe, a assinatura ativa, com o
      desconto, **sem cartão guardado**, a primeira fatura paga com total zero; no banco de dev,
      o espelho ativo, do modo de teste, e o `member@` com acesso; **o `TESTE100` com 1 de 5
      usos.** *O `member@` do banco de dev fica assinando por esse código (a assinatura de mentira
      do seed volta se o seed rodar de novo).* **Nada foi publicado:** `dev` à frente da `main`;
      o merge é decisão do operador, na etapa 4.3.
      **O botão "stripe" no canto da tela** (pergunta dele, 10/10/2026). `[FATO — context7
      /websites/stripe, a nota de versão de 30/09/2025]` *"A developer assistant is now
      automatically rendered in Elements while using a sandbox environment."* É a ajuda de teste
      da própria Stripe: aparece com as chaves de teste, e some com as de verdade. **Consequência
      para a etapa 4.3:** enquanto a produção usar chaves de teste, ele aparece na tela de assinar
      do site no ar (só para quem chega nela, atrás do "Em breve"). Desligar é uma linha em
      `client/src/lib/stripe-do-site.tsx` (`developerTools.assistant.enabled: false`, opção que
      existe nos tipos da biblioteca) — se desliga, é decisão dele. *5 consultas ao context7 no
      dia para esta etapa (uma sem resultado).*
      **DESLIGADO (decisão do operador, 10/10/2026):** *"Desliga ela… não precisamos desse botão
      do Stripe."* Conferido no navegador de teste: o botão sumiu, o campo de pagamento continua
      abrindo, e a Stripe não relatou erro.
- [x] **4.3 — No ar, COM AS CHAVES DE VERDADE: o PRIMEIRO TESTE REAL (com o operador).**
      **DECISÃO REVISTA (operador, 10/10/2026 — *"Por que não colocamos no ar as chaves de
      produção?"*; confirmada por ele: *"chaves de verdade"*).** O texto original desta etapa
      (abaixo) previa as chaves de TESTE no site até o lançamento. **O que fez mudar:** o
      computador e o site ficariam ligados à MESMA área restrita — cada teste do dev avisaria o
      site no ar, que registraria erros falsos de "assinante pagando e trancado fora", e a chave
      do dev seria a de produção (contra *cada ambiente nasce com credencial própria*). **A conta
      de verdade está verificada** (e-mail e empresa; visto por ele no painel em 10/10/2026).
      **O que passa a valer:** no site, o cartão de teste NÃO funciona — o operador testa com um
      código de 100% (não cobra nada); cartão de verdade, quando ele quiser, e devolve pelo painel.
      Ninguém além dele assina (cadastro fechado; o visitante é a 4.7).
      **O plano aprovado, ajustado:** (1) ✅ o `dev` enviado ao GitHub e o CI verde nos dois jobs
      (`c36d494`, 10/10/2026) · (2) o operador, **na conta de verdade** da Stripe: o produto com os
      2 preços e as MESMAS lookup keys (`assinatura_mensal`, `assinatura_anual`), o cupom de 100%
      com um código (aleatório, poucos usos), o ajuste de "cancelar quando todas as tentativas
      falharem", e o endereço do aviso (com "www"; os 5 tipos de aviso que o servidor trata; a
      versão da API mais recente — o servidor lê a assinatura da fatura no formato novo) · (3) o
      operador, no Railway: `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY` e `STRIPE_WEBHOOK_SECRET`,
      **de verdade**, nunca pelo chat; e se a `DATABASE_URL` tem `connection_limit` · (4) com o
      "pode publicar" dele: merge `dev → main`; o pre-deploy aplica a migration `cliente_da_stripe`
      · (5) o agente prova de fora, só leitura · (6) o SQL de RLS em produção · (7) o operador
      testa no site com o código de 100% · (8) checkbox e *Estado atual*.
      `Docs check (context7): Stripe → /websites/stripe → como cadastrar o endereço do aviso no
      painel (Workbench: um "event destination", com a conta de origem, a versão da API, os tipos
      de aviso e o endereço; o segredo `whsec_` fica na página do destino) — 1 consulta
      (10/10/2026). Nenhum código da Stripe é escrito nesta etapa.`
      **PASSOS 2 e 3 FEITOS PELO OPERADOR (10/10/2026), na conta de VERDADE — conferidos pelos
      prints dele, sem nenhum segredo à mostra:** o produto "Assinatura Jilson Santana", ativo,
      com os 2 preços recorrentes — R$ 99,90 por mês (`assinatura_mensal`) e R$ 995,00 por ano
      (`assinatura_anual`) · o cupom "FreeJS" (o nome é dele), 100% para sempre, sem teto no
      cupom, com um código promocional gerado pela Stripe — **o primeiro código apareceu num print
      e foi trocado por ele** (a regra de segredo que chega à conversa) · falha de pagamento: a
      1ª deixa a assinatura em atraso, todas falhando **cancela** (os e-mails de cobrança da Stripe
      estão desligados: decide-se na 4.10) · o destino dos avisos "jilsonsantana.com": ativo, o
      endereço com "www", **a versão `2026-09-30.endive`** (a mesma da biblioteca; a conta estava
      em `2026-05-27.dahlia`), os 5 tipos de aviso · no Railway, as 3 variáveis.
      **Provado de fora, só leitura:** o aviso sem assinatura passou de 503 (`NaoConfigurado`) para
      **400** — o site leu o segredo. As duas chaves só se provam depois da publicação (a tela de
      assinar lê os preços com elas). **A `DATABASE_URL` do Railway não tem `connection_limit`**
      (dito por ele, sem mostrar o endereço): não há o limite de 1 conexão.
      **PASSOS 4 e 5 FEITOS (10/10/2026):** com o *"Pode publicar"* do operador e o CI verde nos
      dois jobs no `dev` (`c57aeee`), merge `--no-ff` → **`main` = `efb231f`**; CI da `main` verde
      nos dois jobs; o Railway publicou (a versão passou a `mv2p7nvt-a7885b6b`). **Provado de
      fora, só leitura:** `health` 200 · o aviso sem assinatura → 400 · `GET /api/billing/planos`,
      `GET` e `POST /api/billing/assinatura` e `POST /api/billing/previa` → 401 sem login, todas
      com `Cache-Control: private, no-store` · a página inicial e `/aluno/assinar`, para o
      público, mostram o "Em breve" (nenhum botão para a tela de assinar). *A migration não se vê
      de fora; a versão nova no ar é o sinal de que o pre-deploy passou.*
      **PASSO 6 FEITO (10/10/2026) — RLS em PRODUÇÃO, com a autorização do operador** (*"pode
      rodar no banco de produção"*): uma consulta que só lê o catálogo, no branch `production` do
      Neon (`br-divine-pond-aezsg40q`). **Resultado: zero tabela em `public` sem RLS, e a
      `stripe_customer` existe, com RLS ligado** — a migration foi aplicada pelo pre-deploy.
      **PASSO 7 FEITO — ETAPA FECHADA (10/10/2026).** O operador assinou no site, como `member@`,
      com o código de 100% da conta de verdade. O que ele viu (respostas dele): a tela mostrou os
      dois preços, R$ 99,90 e R$ 995 · com o código, "Hoje você paga R$ 0,00", sem o campo do
      cartão · terminou em "Assinatura confirmada" e a aula abriu. **Conferido no banco de
      produção, com a autorização dele, lendo só a linha do `member@`:** uma assinatura, `active`,
      paga até 10/11/2026, **de verdade (`livemode` verdadeiro)**, com o cliente da Stripe
      guardado, também de verdade. Isso prova as duas chaves de verdade, os preços pelas lookup
      keys, o código promocional e o aviso real da Stripe gravando o espelho.
      **← Daqui em diante o operador testa tudo como aluno, no site de verdade.** Nada foi cobrado.
      **O TEXTO ORIGINAL, de antes da revisão (fica como registro):** As
      chaves de teste e o segredo do webhook no Railway, o endereço do webhook no painel — **com
      "www"**: `https://www.jilsonsantana.com/api/stripe/webhook` (medido em 09/10/2026: sem o "www",
      só a página inicial redireciona e todo outro endereço responde 404) —, publicar,
      e o `member@` assina com o cartão de teste `4242…` ou com o código de 100% → **a aula paga
      tocando no ar.** ← **Daqui em diante o operador testa tudo como aluno.**
      **Trazido da revisão de segurança da 4.2 (10/10/2026):** antes de publicar, conferir o
      limite de conexões do banco no Railway (`connection_limit` na `DATABASE_URL`; com 1, todo
      checkout falharia — assinar segura uma conexão enquanto fala com a Stripe e usa outra para
      ler) · depois de publicar, rodar em produção o SQL de RLS do `CLAUDE.md` (zero linhas; a
      tabela nova é `stripe_customer`).
- [x] **4.4 — Sincronizar e perder o acesso direito (código).** Forçar a sincronia pelo admin (a
      recuperação de webhook perdido; nunca rota aberta) · ao perder o acesso, a sessão cai
      (`session.deleteMany`) · `requireActiveMembership` · a **matriz de testes de servidor** deste
      plano (os ~16 casos, incluindo o acesso cruzado de idioma).
      **Trazido da revisão de segurança da 4.2 (10/10/2026):** (a) **o checkout chama a sincronia**
      quando a Stripe diz que a conta já tem assinatura viva e o espelho não dá acesso — hoje ele
      responde "já é assinante", grita no registro e a aula continua trancada (achado P1); a
      sincronia é a MESMA rotina do aviso, com a trava da assinatura · (b) **um tratador de erro
      próprio no fim de `/api`**: hoje é o padrão do Express, que em produção responde só
      "Internal Server Error" (conferido), mas copia o status e os cabeçalhos de um erro que
      escape cru.
      **O PLANO APROVADO (operador, 10/10/2026) — um commit por passo no `dev`; sem migration e
      sem dependência nova.**
      **Decisões do operador (10/10/2026):** (1) o botão de forçar a sincronia mora num **item novo
      "Assinaturas" no menu do admin** (entre um item novo, um bloco no Dashboard e nenhuma tela) ·
      (2) **"Reativar assinatura" no lugar de "Assinar"** para quem já foi assinante e está sem
      acesso — *"'Assinar' apenas na primeira vez. Algo nesse sentido como as empresas grandes
      fazem"* · (3) confirmou a regra do gate: *"Quem cancela mas ainda tem dias pagos pode
      continuar assistindo enquanto for válida a assinatura nos dias restantes"* — já é a regra de
      Ago 2026, com teste; nesse caso a sessão também **não** cai. Os textos novos (a tela do admin,
      e o inglês de "Reativar assinatura") entram como RASCUNHO do agente, a revisar por ele.
      **Convenções de engenharia (como o código faz):** a sincronia é UMA rotina, a do aviso, com a
      trava da assinatura — o aviso, o checkout e o admin chamam a mesma · a sessão cai só quando a
      conta **tinha** acesso antes da sincronia e **deixou** de ter depois (comparado dentro da
      mesma transação, pelo próprio `temAcessoAtivo()`): quem tenta pagar e não consegue nunca é
      deslogado · **a queda da sessão não é a fronteira** — quem só deixa o período pago vencer não
      recebe aviso da Stripe e continua logado; quem tranca a aula é o gate, a cada pedido · o
      checkout chama a sincronia **fora** da trava da conta (não segura conexão a mais) · "já foi
      assinante" é DERIVADO do espelho (uma assinatura que passou do primeiro pagamento), nunca
      coluna · assinatura que a Stripe não conhece é **relatada** pela sincronia do admin, nunca
      apagada.
      `Docs check (context7): Stripe → /websites/stripe → a Stripe reentrega o aviso por até 3 dias
      na conta de verdade, com intervalos crescentes (na área restrita, 3 vezes em poucas horas); o
      reenvio manual vale 15 dias no painel e 30 na CLI — depois disso só a sincronia recupera — 1
      consulta · Better Auth → /better-auth/better-auth → apagar as sessões no banco desloga na hora
      enquanto não houver `cookieCache` nem `secondaryStorage` (este repo não usa nenhum dos dois;
      com `cookieCache`, a sessão revogada valeria até o cache vencer) — 1 consulta (10/10/2026).`
      - [x] **Passo 1 — a sincronia única e a sessão que cai.** `lib/assinaturas.ts`: a rotina do
            aviso vira `sincronizarAssinatura` (trava → busca na Stripe AGORA → grava o espelho), que
            o aviso chama marcando o `event.id` na mesma transação · ao perder o acesso,
            `session.deleteMany` na mesma transação · `temAcessoAtivo()` aceita ler pela transação.
            Testes de servidor: perdeu o acesso → o cookie de antes responde 401; quem não tinha
            acesso não é deslogado; cancelou com dias pagos → segue com acesso e logado; outra
            assinatura ainda dá acesso → não cai. Mutação.
            **FEITO (10/10/2026).** `sincronizar` (com a trava já tomada) é o miolo único;
            `processarAviso` o chama e marca o `event.id` na mesma transação; `sincronizarAssinatura`
            é a entrada sem aviso (checkout e admin, passos 2 e 3). A queda da sessão compara o
            acesso de antes e de depois pela transação, e apaga só as sessões da conta que perdeu.
            O registro do aviso diz quando a conta perdeu o acesso. **Testes:** +8 de servidor em
            `stripe-webhook.test.ts`, com sessões de verdade do `member@` e do admin — a que acabou
            derruba (o cookie de antes → 401); cancelou com dias pagos → acesso e sessão ficam; quem
            não tinha acesso não cai (a incompleta que expira, a antiga conferida de novo); outra
            assinatura segura a sessão; a sessão das OUTRAS contas não cai junto; a sincronia sem
            aviso faz o mesmo e não marca aviso; com a Stripe fora do ar, nada é gravado; a
            sincronia sem aviso e um aviso ao mesmo tempo respeitam a mesma trava. **Mutação:** 6
            de 6 reprovaram — sem apagar a sessão, derrubar sem comparar com o antes, o "depois"
            lido fora da transação, apagar a sessão de todo mundo, a sincronia sem a trava, o aviso
            sem marcar o `event.id`. Gates: typecheck, suíte de servidor (649) e do site (797),
            build.
      - [x] **Passo 2 — o checkout chama a sincronia** (o achado P1 da revisão da 4.2). A Stripe
            diz que a conta tem assinatura viva e o espelho não dá acesso → sincroniza e responde
            409 `JaAssinante`, agora com a aula liberada. Se a Stripe não responder nessa hora, o
            erro sobe (500): o aluno vê "tente de novo", e não um "já é assinante" com a aula
            trancada. Testes + mutação.
            **FEITO (10/10/2026).** `lib/checkout.ts`: a assinatura viva sai da trava da conta e é
            sincronizada FORA dela (`sincronizarAViva`), pela rotina do passo 1; responde 409
            `JaAssinante` como antes — a diferença é que o espelho passa a dizer o que a Stripe diz.
            Sincronizou e a conta segue sem acesso: se a assinatura dá acesso na Stripe (ela não diz
            de que conta é, ou diz que é de outra), o registro GRITA "trancado fora"; se não dá
            (`unpaid`, pausada vencida), só avisa. **Testes:** o teste antigo (que só gritava) deu
            lugar a 5 de servidor — o aviso se perdeu → espelho nasce e a conta tem acesso, sem
            assinatura nova; o espelho atrasado é atualizado; segue sem acesso → grita ou avisa; a
            Stripe fora do ar → 500 e nada gravado; **a conta da sessão não fica com a assinatura
            que a Stripe diz ser de outra conta**. A Stripe de mentira da sincronia passou a ser
            zerada a cada teste (um teste antigo passava com a resposta deixada pelo anterior).
            **Mutação:** 4 de 4 reprovaram — sem sincronizar, engolindo a falha da Stripe, sem
            gritar, criando outra assinatura em vez de reconhecer a viva. Gates: typecheck, suíte de
            servidor (653) e do site (797), build.
      - [x] **Passo 3 — forçar a sincronia pelo admin: a rota.** `POST
            /api/admin/assinaturas/sincronizar`, com o e-mail do aluno, atrás do `requireAdmin`:
            sincroniza as assinaturas do cliente da conta na Stripe e as que o espelho já conhece,
            e devolve o que a Stripe diz e se a conta tem acesso. Testes: sem login 401, aluno comum
            403 (casos 13 e 14 da matriz), libera quem pagou, tira de quem não paga mais, conta que
            não existe. Mutação.
            **FEITO (10/10/2026).** `routes/admin-assinaturas.ts` (só admin; o corpo diz só o
            e-mail) + `sincronizarConta` em `lib/assinaturas.ts`: confere, uma a uma e pela rotina
            do passo 1, as assinaturas que a Stripe lista para o cliente da conta e as que o espelho
            já conhece dela; responde o que a Stripe diz de cada uma e a resposta do gate depois.
            **A assinatura que a Stripe não conhece** (apagada lá, a de teste do seed, ou do outro
            modo) é relatada como `nao-encontrada` — erro com nome próprio na fronteira
            (`AssinaturaNaoEncontrada`) — e o espelho dela nunca é apagado. O registro leva ids e
            status, nunca o e-mail. Tipos e corpo no `core` (`sincronizarContaSchema`,
            `SincroniaDaConta`). **Testes:** 16 de servidor (`admin-assinaturas.test.ts`) — 401 e
            403 sem consultar a Stripe (casos 13 e 14 da matriz), não existe por GET, 400, 404, 503,
            libera quem pagou, tira o acesso de quem a Stripe encerrou, a sessão de quem perde o
            acesso cai e a do admin fica, Stripe + espelho sem repetir, sem-conta, conta que nunca
            passou pela Stripe, e-mail com espaço e maiúsculas, o corpo não aponta assinatura, a
            Stripe fora do ar → 500, fecha na dúvida sem a conta, o registro sem o e-mail.
            **Mutação:** 8 de 8 reprovaram. Gates: typecheck, suíte de servidor (669) e do site
            (797), build. **Sem teste automático, fica para a prova na área restrita (passo 9):** a
            Stripe responder `resource_missing` para a assinatura que ela não conhece.
      - [x] **Passo 4 — a tela do admin "Assinaturas".** `/admin/assinaturas`: o e-mail do aluno, o
            botão, o resultado; carregando, erro e vazio, com teste de componente de cada um. Layout
            padrão (`PageContainer` + `PageHeader` + `PageSection`); textos em português, na tela.
            **FEITO (10/10/2026).** `pages/admin/AdminAssinaturasPage.tsx` (92 linhas) + os textos
            em `lib/sincronia.ts` + `adminSincronizarConta` em `lib/api.ts`. O item "Assinaturas"
            entrou no menu do admin **logo depois de "Alunos"** — a posição é escolha do agente,
            para não desfazer a decisão de 06/10 ("Comunicação" logo antes de "Alunos"); *a ordem é
            do operador, a confirmar.* A tela mostra se a conta ficou com acesso e, de cada
            assinatura, a situação em português e até quando está paga; as que precisam de gente
            dizem por quê. **Textos em RASCUNHO do agente**, a revisar por ele. **Testes:** 8 de
            componente (de início, o e-mail aparado, carregando, sem acesso com cada situação,
            vazio, as três frases de erro, o que não é e-mail, o resultado de um aluno não fica na
            tela quando a conferência do seguinte falha) + 1 do mapa de navegação (o aluno não vê o
            item). **Mutação:** 6 de 6 reprovaram. Gates: typecheck, suíte do site (806) e de
            servidor (669), build. **Sem prova no navegador pelo agente** (precisaria da senha do
            admin): o acabamento é do Antigravity, e quem abre a tela é o operador.
      - [x] **Passo 5 — `requireActiveMembership`.** O invólucro HTTP de `temAcessoAtivo()`: sem
            login 401, sem acesso 403 `AssinaturaNecessaria`. Primeira rota: o download dos arquivos
            da aula (login + assinatura, sem exceção). Para o aluno nada muda; o visitante sem login
            que pedir o endereço direto passa a receber 401 (era 403), e a recusa vem antes de
            procurar o arquivo. Testes da trava (anônimo / sem assinatura / assinante) + mutação.
            **FEITO (10/10/2026).** `requireActiveMembership` em `middleware/auth.ts`, sozinho como
            o `requireAdmin`; a regra continua em `temAcessoAtivo()`. `GET
            /api/lessons/:id/files/:fileId` passou a usá-lo, no lugar da checagem escrita na rota.
            **O que mudou de fora:** o visitante sem login recebe 401 (era 403), e quem não assina
            recebe a MESMA recusa exista o arquivo ou não (antes, 404 para o que não existia e 403
            para o que existia — dava para descobrir quais arquivos existem). O site não lê essa
            resposta: o download é um link. **Testes:** +3 de servidor em `lesson-view.test.ts` e 2
            ajustados — a recusa antes de procurar o arquivo; a regra é a do gate (pagamento
            atrasado e cancelada com dias pagos baixam; cancelada e vencida e a nunca paga, não);
            o admin não baixa pela rota do aluno. **Mutação:** 5 de 5 reprovaram. Gates: typecheck,
            suíte de servidor (672) e do site (806), build.
      - [x] **Passo 6 — o tratador de erro no fim de `/api`.** Erro que escape de qualquer rota de
            `/api`: 500 `ErroInterno`, sem copiar status nem cabeçalho do erro; o corpo malformado
            continua 4xx; o registro continua levando o erro. Testes + mutação.
            **FEITO (10/10/2026).** `lib/erro-da-api.ts`, montado em `app.ts` como o ÚLTIMO de
            `/api` (rota nova entra acima dele). Erro que escapa: 500 `ErroInterno` em qualquer
            ambiente, sem status, cabeçalho, mensagem nem rastro do erro na resposta. O corpo que o
            Express recusou ao ler (JSON malformado, grande demais) responde 4xx `CorpoInvalido`,
            por uma lista fechada de tipos. O registro leva o método, o endereço sem o que vem
            depois do "?" e o rastro — nunca o objeto do erro inteiro. Com a resposta já começada,
            passa o erro original adiante. **Testes:** 8 de servidor (`erro-da-api.test.ts`), com um
            erro com a cara do da Stripe escapando de uma rota de verdade. **Mutação:** 8 de 8
            reprovaram (a da resposta já começada só depois de o teste ser refeito: do jeito que
            estava, ele não tinha como reprovar). **No servidor de desenvolvimento, de verdade:**
            corpo malformado → 400 `CorpoInvalido`; forçar a sincronia sem login → 401; download
            sem login → 401. Gates: typecheck, suíte de servidor (680) e do site (806), build.
      - [x] **Passo 7 — o que falta da matriz.** (7–10) 401/403/200 em `/api/me` e
            `/api/admin/ping` · (11) a trilha em rascunho pelo endereço, se faltar · (15) o limite
            de tentativas de login **ligado de verdade**, num teste isolado · (16) o player assinado
            no curso em inglês. Os casos 1–6 e 12 já existem (`stripe-webhook.test.ts`,
            `acesso.test.ts`, `public-reads.test.ts`).
            **FEITO (10/10/2026) — a matriz está completa.** (7–10) `matriz-http.test.ts`: sem
            login / aluno / admin em `/api/me` e `/api/admin/ping`, e um cookie inventado · (11) a
            trilha em rascunho pelo endereço → 404, com e sem login (faltava: só o "salvar" tinha
            teste) · (13–14) no passo 3 · **(15) `login-limite.test.ts`: o limite LIGADO, por
            comportamento** — o arquivo carrega o `auth` como em produção e fala com ele direto,
            isolado no seu processo (a suíte inteira seguiu verde com ele no meio).
            `[MEDIDO, 10/10/2026]` do mesmo IP: 401, 401, 401, **429**, 429; barrado, nem a senha
            certa entra; de outro IP ela entra; trocar o `x-forwarded-for` a cada pedido não escapa
            · (16) o curso em inglês com o endereço ASSINADO do vídeo. **Onde está cada caso:** 1–3
            `stripe-webhook.test.ts` · 4–6 `acesso.test.ts` · 7–10 `matriz-http.test.ts` · 11–12
            `public-reads.test.ts` · 13–14 `admin-assinaturas.test.ts` · 15 `login-limite.test.ts`
            · 16 `lesson-view.test.ts`. **Mutação:** 5 de 5 reprovaram — o limite desligado, o IP
            lido do cabeçalho padrão (cai o "cada pessoa tem o seu"), `/api/admin/ping` sem a trava,
            `requireAdmin` sem conferir o papel, a trilha sem o filtro de publicada. Gates:
            typecheck, suíte de servidor (688) e do site (806), build.
      - [x] **Passo 8 — "Reativar assinatura".** Quem já foi assinante e está sem acesso vê
            "Reativar assinatura" onde hoje lê "Assinar": na aula trancada, na tela de assinar e
            nos dois botões da home quando há login. O visitante sem login continua vendo
            "Assinar". O servidor diz se a conta já foi assinante; os textos saem do dicionário,
            nos dois idiomas. Testes de servidor e de componente + mutação.
            **FEITO (10/10/2026).** **A regra (derivada, sem coluna):** o convite é "Reativar
            assinatura" quando a conta **já foi assinante** (tem no espelho uma assinatura que
            passou do primeiro pagamento — qualquer status que não seja `incomplete` nem
            `incomplete_expired`) **e hoje está sem acesso** (`jaFoiAssinante` e `convidaAReativar`,
            em `lib/acesso.ts`, ao lado do gate; é só texto, nunca decide acesso). Quem só tentou
            pagar continua lendo "Assinar"; quem cancelou e ainda tem dias pagos tem acesso, então
            não há botão a trocar. **Onde:** a aula trancada (`GET /api/lessons/:id/aula` ganhou
            `reativar`) · a tela de assinar, no título e no botão (`GET /api/billing/assinatura`
            ganhou `reativar`) · os dois botões da home para quem está logado — o visitante sem
            login vê sempre "Assinar", e a home dele continua sem ir ao banco por isto. As duas
            respostas só GANHARAM um campo (API aditiva). **Textos novos, nos dois idiomas:**
            `home.pricing.btnReactivate` e `home.cta.btnReactivate` (editáveis em Admin → Textos),
            `app.assinar.tituloReativar`, `app.assinar.botaoReativar` e `app.aula.reativar` —
            português do operador ("Reativar assinatura"); **inglês "Reactivate subscription",
            RASCUNHO do agente, que ainda passa pelo ciclo de revisão do `idiomas.md`** (ponto de
            dúvida: "Reactivate subscription" × "Resubscribe"). **Não mudou:** a tela de depois do
            pagamento continua com o título "Assinar". **Testes:** +11 de servidor (a regra, a
            resposta do gate em 6 situações, a aula trancada, a home nos dois idiomas e sem login)
            e +4 de componente. **Mutação:** 13 de 13 reprovaram. **No servidor de
            desenvolvimento:** a home do visitante, nos dois idiomas, segue com os 2 botões
            Assinar/Subscribe e nenhum "Reativar". Gates: typecheck, suíte de servidor (699) e do
            site (810), build.
      - [x] **Passo 9 — a prova na área restrita, a revisão de segurança e os docs.** No
            computador, com uma conta descartável criada e apagada no banco de desenvolvimento
            (branch `dev` do Neon) e o cartão de teste, **com o aviso desligado**: pagou e ficou
            trancado → Assinar de novo libera; a sincronia do admin libera; cancelada na Stripe → a
            sincronia acompanha. Não gasta uso do `TESTE100` e não toca a produção.
            `security-vulnerability-reviewer` no código de acesso e cobrança, com o destino de cada
            achado aqui · `billing.md` e `CLAUDE.md` reconciliados · checkbox e *Estado atual*.
            **FEITO (10/10/2026).**
            **A prova na área restrita** (conta descartável no branch `dev` do Neon, cartão de
            teste `pm_card_visa`, chave `sk_test_`; nenhum segredo impresso) — os 15 pontos
            conferidos passaram: pagou de verdade na área restrita · a Stripe diz ativa e o
            espelho não existe → **assinar de novo** devolveu o espelho e o acesso, e a Stripe
            continuou com UMA assinatura · **a sincronia do admin** fez o mesmo, e relatou como
            não encontrada uma assinatura que a Stripe não conhece (`resource_missing` de
            verdade), sem apagar o espelho dela · **cancelada na Stripe** com a fatura paga →
            `canceled`, paga por mais 31 dias, com acesso, sem deslogar e sem convite de reativar.
            Limpeza: o cliente apagado na área restrita, a conta descartável apagada do banco
            (zero linhas de espelho dela). **Diferente do previsto:** o `stripe listen` do
            operador estava LIGADO, então o "aviso desligado" não aconteceu sozinho — o estado
            de aviso perdido foi recriado apagando a linha do espelho da conta descartável
            depois do pagamento (o lado da Stripe foi todo real). **Não exercitado contra a
            Stripe**, só com ela simulada e sessões de verdade: a assinatura cancelada por
            falta de pagamento derrubando a sessão. **A tela Admin → Assinaturas não foi aberta
            num navegador pelo agente** (precisa da senha de admin): fica para o operador.
            **A revisão de segurança** (`security-vulnerability-reviewer`, sobre o diff dos 8
            passos): **nenhum bloqueio.** O destino de cada achado:
            - **P1 — a trava do checkout segura conexão do banco esperando** (código da 4.2;
              alcance hoje: só as contas semeadas, porque o cadastro é fechado) → **já é o
              pré-requisito (b) da etapa 4.7**, abaixo; acrescentado lá o que esta revisão
              trouxe (ler o gate pela transação da trava).
            - **P1 — toda falha de cobrança só existe no registro da Railway** → é o **monitor
              de erro da Fase 7** (pendência P25), que precede o primeiro pagante que não seja
              o operador; a lista das linhas a alertar foi completada lá.
            - **P2 — a busca do admin por e-mail conferia a conta de OUTRA pessoa** quando o
              e-mail digitado tinha "_" (na busca "sem diferenciar maiúsculas" do banco ele
              vale por qualquer caractere). **Medido** (o teste novo deu 200 no lugar de 404)
              **e corrigido:** a conta se acha ao pé da letra, em minúsculas — como o login.
              Não liberava acesso a ninguém; o risco era o admin ler a resposta da pessoa errada.
            - **P2 — o corpo recusado respondia 4xx sem linha nenhuma no registro**, inclusive
              no aviso da Stripe (um aviso grande demais seria recusado por 3 dias sem ninguém
              ver). **Medido e corrigido:** a recusa vai para o registro — endereço, status e
              motivo, nunca o corpo (a mensagem do erro cita um trecho dele: medido).
            - **P2 — o convite diz "Reativar assinatura" e o checkout não deixa** quando a
              assinatura está "não paga" (`unpaid`) ou pausada com o período vencido: a pessoa
              clica e nada acontece. Só existe se a régua da Stripe terminar em "marcar como
              não paga" (configuração do painel). → **pendência P60**; até lá o registro GRITA
              nesse caso (era só aviso).
            - **P2 — duas assinaturas da mesma conta acabando no mesmo instante não derrubam a
              sessão** → **registrado como limitação** no `billing.md`: a aula tranca do mesmo
              jeito, e uma segunda trava por conta não evitaria dia ruim nenhum. *Reabre se a
              escola passar a permitir duas assinaturas vivas na mesma conta.*
            - **P2 — o teste do GET afirmava um status que só vale no ambiente de teste** →
              **teste reescrito**: afirma o que protege em qualquer ambiente (a Stripe não é
              consultada, o espelho não muda). *A sugestão do revisor — um 404 próprio para o
              endereço de `/api` que não existe, que hoje devolve a página do site — NÃO foi
              feita: muda o que a produção responde fora desta etapa. Fica como proposta.*
            - **Ressalvas, registradas no `billing.md`:** toda ida nova à Stripe passa por
              `erroSemMensagem` (senão a mensagem dela vai para o registro) · o teste do limite
              de login depende de cada arquivo de teste rodar isolado (o padrão do Vitest).
            **Conferido sem achado:** nenhum caminho novo libera acesso · apagar sessões nunca
            fica sem filtro · sem travas cruzadas · o download não revela se a aula existe · o
            tratador não vaza nada do erro · a rota do admin fechada · "reativar" só fala da
            conta da sessão. **Testes:** +2 de servidor. **Mutação:** 7 de 7 reprovaram (uma
            passou na primeira rodada, e o teste foi reforçado). Gates: typecheck, suíte de
            servidor (701) e do site (810), build.
      **Fora desta etapa:** ESLint (4.5) · "minha assinatura" e quem cancelou com dias pagos voltar
      a assinar (4.6) · o visitante e a sincronia de assinatura sem conta (4.7) · o reembolso (P56).
      **ONDE PAROU:** etapa FECHADA (10/10/2026), os 9 passos commitados, e a **publicação
      autorizada pelo operador** no mesmo dia. Ele abriu a tela Admin → Assinaturas no navegador
      e ela conferiu certo. Com ele ficam: a P59 (textos e posição no menu) e a P60 (a opção do
      painel da Stripe). O que ele pediu a mais para a tela virou a etapa 4.7b.
- [x] **4.5 — ESLint com `no-floating-promises`, bloqueante no CI (código, pequena).** Dependências
      de desenvolvimento novas: `eslint` + `typescript-eslint`. Já decidido para esta fase (item
      abaixo): promessa sem `await` dentro do webhook derruba o servidor sem nenhum teste perceber.
      **PLANO APROVADO (10/10/2026)** *(operador: "Pode seguir. A")*.
      - **O que é, em uma frase:** um revisor automático que barra no CI o código que manda
        fazer uma tarefa e não espera ela terminar — o descuido que passa em todo teste e
        derruba o servidor quando a tarefa falha.
      - **Medido antes de planejar** (numa pasta fora do repositório, sem mexer em nada):
        servidor 131 arquivos, código compartilhado 17 e testes de navegador 3 — **zero achados**
        nas três regras; o site, 248 arquivos — **zero `any`**, e 20 pontos de "não esperou"
        (8 + 12), todos em telas do admin.
      - **Decisões do operador:** (A) **o "sem `any`" vale no projeto inteiro**, site incluído
        (custo zero hoje; fecha a pendência antiga de a regra valer só por revisão) · (B) **as
        regras de "não esperou" no SITE ficam para depois** — lá o efeito é um erro na tela, não
        o servidor caindo, e mais da metade é o padrão normal dos formulários. *Reabre quando um
        erro de tela do aluno tiver essa causa, ou quando o alerta de erro das telas (Sentry,
        parte 2) mostrar promessa rejeitada sem tratamento.*
      - **Dependências de desenvolvimento novas** (previstas neste item): `eslint` **10.11.0** e
        `typescript-eslint` **8.70.1**, fixadas — as últimas com duas semanas ou mais. Não vão
        para a imagem de produção (`--omit=dev` no Dockerfile).
      - **As regras** (servidor, código compartilhado e testes de navegador):
        `no-floating-promises` **sem aceitar `void` como saída** — toda promessa é esperada ou
        tem tratamento de falha; medido: custa reescrever 2 linhas — · `no-misused-promises` ·
        `no-explicit-any`. No site, só a `no-explicit-any`. **Nenhum pacote pronto de regras**
        (traria dezenas de avisos em código que funciona) e nada de estilo.
      - **Convenções de engenharia:** um `eslint.config.mjs` na raiz; `npm run lint` passa a ser
        o quarto gate da raiz; no CI, um passo bloqueante depois do typecheck do servidor (a
        regra precisa dos tipos); comentário que desliga uma regra sem precisar também reprova.
      - **Passos, um commit cada:** (1) este plano · (2) as dependências, a configuração, o
        comando e as 2 linhas reescritas, com a prova por mutação (uma promessa solta, um
        `try/catch` sem `await`, um `any`) · (3) o passo no CI, com a prova de que ele BLOQUEIA
        (um ramo descartável com uma violação, CI vermelho, ramo apagado) · (4) os docs —
        `CLAUDE.md` (o `lint` existe; "sem `any`" com verificação; a trava do `await`),
        `tech-stack.md` e os checkboxes.
      - **Fora:** as regras de promessa no site (decisão B) · estilo e formatação.
      - `Docs check (context7): not triggered` — a configuração foi verificada rodando.
      - **Passo 2 — FEITO (10/10/2026).** `eslint.config.mjs` na raiz, `npm run lint`, as duas
        dependências fixadas. **Reescritas para passar:** o desligar do servidor (`index.ts`) e
        o fim de um script de senha (`set-db-password.ts`), que usavam `void`; e saiu um
        comentário antigo que desligava uma regra que não está ligada (`middleware/auth.ts`).
        **Mutação (um arquivo de prova, criado e apagado):** no servidor o revisor reprovou os
        seis descuidos — a promessa solta, o `try/catch` sem `await`, o `void`, a função
        assíncrona onde ninguém espera, o `any` e o comentário que desliga sem precisar —; no
        site reprovou o `any` e, como decidido, NÃO a promessa solta. Apagados, voltou a passar.
        **Provado em execução:** o servidor montado, em modo de produção, sai com código 0 ao
        receber o aviso de desligar, com o alerta ligado e desligado. Gates: typecheck, suíte de
        servidor (727) e do site (810), build e lint.
      - **Passo 3 — FEITO (10/10/2026).** O passo `Lint` entrou no job principal do CI, depois
        do build do `core` e da geração do cliente do Prisma (as regras de promessa leem os
        tipos; sem eles o passo ficaria verde sem conferir nada). **A prova de que BLOQUEIA:**
        no `dev` (`59fdf22`) o CI passou nos dois jobs; num ramo descartável com UMA promessa
        solta numa chamada ao banco, o job principal **reprovou no passo `Lint`**, apontando a
        linha. O ramo foi apagado, no computador e no GitHub. *(O job do E2E não roda o lint, e
        passou nos dois casos: quem bloqueia é o job principal.)*
      - **Passo 4 — FEITO (10/10/2026).** `CLAUDE.md` (o `lint` existe e é o quarto gate; o "sem
        `any`" passa a ter verificação; a trava do `await` no e-mail, agora barrada pelo lint;
        o CI), `tech-stack.md` e o `GEMINI.md` do parceiro de design (os quatro gates que ele
        roda antes de publicar).
      **ONDE PAROU:** etapa FECHADA e PUBLICADA em 10/10/2026 (`main` = `8d9a364`). Nada muda
      para o aluno: são ferramentas de desenvolvimento, o passo do CI e duas linhas reescritas
      no servidor (o desligar e um script de senha).

## Infraestrutura — tarefas concluídas fora de fase

> Não são fases; são trabalhos de infra já **feitos**, registrados aqui pelo gatilho principal deste
> arquivo: *antes de afirmar que algo "não existe" ou "não foi feito"*. **Não foram para o changelog
> de decisões** porque são **conclusão de tarefa**, não mudança de decisão (regra anti-reinflação —
> `CLAUDE.md` → rodapé do changelog).

**Ago 2026 — upgrade do Postgres de PRODUÇÃO** (`gaxmbnhwltljlkukdwba`, "Jilson Santana Website",
us-east-2): **17.6.1.048 → 17.6.1.155**, canal `ga`. *A 17.6.1.164 vinha **pré-selecionada como
PREVIEW** no diálogo do painel e foi trocada manualmente pela estável — registrar porque o default
do fornecedor não era a escolha certa.* Verificação pós-upgrade via MCP: **11 tabelas** em `public`
com **RLS habilitado em todas e zero policies** (o estado desejado), **3 migrations** aplicadas sem
rollback, índices preservados, extensões íntegras (`pgcrypto`, `uuid-ossp`, `pg_stat_statements`,
`supabase_vault`, `plpgsql`); advisors de segurança **só INFO**. `npx prisma migrate status` de
dentro de `server/`: *"Database schema is up to date!"*.

**Ago 2026 — criação do banco de TESTE** (`mvaobzypsiuhqzipcelw`, "Jilson Santana Test",
**us-east-1**, mesma org `hdmecfinlnocurhcxrdb`), já nascido na **17.6.1.155**. **Data API
DESLIGADA** na criação (PostgREST não participa da arquitetura — o acesso é Prisma via
`DATABASE_URL`) e **"Automatic RLS" desligado de propósito**, pra que o RLS entre por **migration
versionada** igual em produção; trigger fazendo isso por fora criaria divergência entre teste e
produção. Resolve o antigo `[PENDENTE DE VERIFICAÇÃO]` sobre o tier grátis: **o Free permite 2
projetos ativos.** *Migrations aplicadas (4, por `prisma migrate deploy`); **seed ainda pendente**
(`implementation-plan.md` → Fase 4, pré-requisito de separação de ambientes).*

**Ago 2026 — RLS em `_prisma_migrations`, nos dois bancos, por migration versionada**
(`20260824214838_rls_prisma_migrations_table`). Fecha de verdade o backlog P2 nº (5), que **tinha
sido fechado errado horas antes** como "suspeita falsa". O que revelou o erro: produção tinha o RLS
ligado por um ajuste **de fora do versionamento**, e o banco de teste — mesmas 3 migrations, via
`migrate deploy` — nasceu com `relrowsecurity = false` na mesma tabela. Estado final **idêntico nos
dois**: 11 tabelas, 0 sem RLS, 4 migrations, 0 rollbacks, advisors só INFO. Produção reconferida
depois de aplicar: 2 users e 39 sessions, iguais ao pré-voo. **Lição registrada no
`implementation-plan.md` (Fase 7, item 5) e virada convenção no `CLAUDE.md`: estado verificado em UM
ambiente não prova estado REPRODUZÍVEL.**

---

### Bloco G — A casa nova: Google Cloud Run (21 a 23/10/2026)  *(movido do plano em 24/10/2026)*

**Por que existe:** o incidente da Railway (ver *Estado atual*). **Decisão do operador, 21/10/2026:**
*"perdi a confiança nesses provedores pequenos, quero algo que possa me acompanhar para o resto da
vida e como meu canal no YouTube já é Google fico logo lá"* — o **Google Cloud Run**, que o agente
recomendou: o site já é um contêiner, as chaves passam a morar num cofre, o custo começa perto de
zero e o contêiner continua portátil. **O pedido dele para o bloco:** *"em um chat faça uma etapa e
quando terminar está tudo funcionando novamente"*.
**Passa no critério de stack** (`CLAUDE.md` → *Working Method*): a falha que a peça nova evita tem
nome — as chaves de produção guardadas como variáveis numa plataforma que as deixou vazar. O cofre do
Google (Secret Manager) guarda cifrado, controla quem pode ler e registra cada leitura.
**O que NÃO muda:** o banco (Neon), o vídeo e os arquivos (Bunny), a cobrança (Stripe), o e-mail
(Resend), o código no GitHub, o Docker, o endereço `www.jilsonsantana.com` e a regra de publicar
(`dev` → `main` só com a ordem dele).

**OS FATOS DO GOOGLE QUE MUDAM O DESENHO** `[FATO — context7 /websites/cloud_google_run, a página de
limites do Cloud Run e a de preços de rede, lidas em 21/10/2026]`:
- **Um pedido comum (HTTP/1) passa de no máximo 32 MiB, e uma resposta também** — *"Limit applies if
  not using Transfer-Encoding: chunked or streaming"*; com servidor HTTP/2, o pedido não tem limite.
  Pega **o envio de arquivo de aula**, que hoje não tem limite (decisão do operador de 29/09/2026 —
  `admin-lesson-files.ts`), e **o download** (`lesson-view.ts`), que sai em fluxo mas manda o tamanho
  (`Content-Length`) — se isso conta como "em fluxo" para o Google, se mede na G3.
  **Decisão do operador (22/10/2026 — fecha a P101): SEM LIMITE de tamanho, como estava** (*"eu posso
  ter aulas de até uns 500 MB cada arquivo"*; e, no mesmo dia, ao ver que o limite pedia uma frase nova
  na tela: *"não precisa desse limite de 1 GB, deixa como estava"* — revê o "1 GB" que ele tinha
  dito minutos antes). **O teto que sobra é o do download:** o Google corta um pedido depois de 60
  minutos (era 15 na Railway), então um arquivo muito grande numa internet lenta pode não terminar.
  *Gatilho: um aluno relatar download cortado — aí entra o link assinado e temporário direto do Bunny
  (`bunny.md` §4.5).* **O caminho (engenharia):
  o envio EM PARTES pelo nosso servidor** — o navegador do admin manda o arquivo em pedaços de até
  30 MB, cada um guardado no Bunny como um objeto, e o download do aluno os entrega em sequência.
  **Por que não o envio direto do navegador ao Bunny** `[FATO — context7 /bunnyway/documentation,
  Storage, 22/10/2026]`: só pela função S3 do Bunny, que *"can only be enabled when creating a new
  storage zone"*, *"cannot be changed after"*, está em *Preview* e **não existe em São Paulo** — a
  zona dos arquivos foi criada em São Paulo, sem ela (`bunny.md` §4.5). **Por que não o HTTP/2 de
  ponta a ponta** (que tira o limite no Google): o Express não roda sobre o servidor HTTP/2 do Node.
  O download continua saindo pelo nosso servidor (decisão do operador de 29/09/2026, `bunny.md` §4.5).
- **O endereço próprio: O MAPEAMENTO DE DOMÍNIO** *(decisão do operador, 22/10/2026 — fecha a P100:
  "fico com o mapeamento")*. Grátis; em *Preview* (*"not production-ready […] not recommended for
  production services"*, por atraso); certificado do Google, que leva de 15 min a 24 h para sair; só
  em algumas regiões, entre elas `us-east4`. **Recusado por agora: o balanceador** (o recomendado pelo
  Google; ~US$ 18 por mês fixos — US$ 0,025/h a regra de entrada, mais US$ 0,008 por GiB). *Gatilho:
  a escola ter receita que o pague, ou atraso medido no mapeamento — a troca não mexe no código, só na
  regra do IP, que se mede de novo.* **Fora:** o Firebase Hosting (`[CONHECIDO, não conferido]` só
  repassa ao servidor o cookie `__session`, o que derrubaria o login).
- **Desligar:** o pedido em andamento termina antes de o servidor sair, e depois do aviso (SIGTERM) há
  10 s até o desligamento à força. O `desligarComCalma` continua servindo; o `drainingSeconds` da
  Railway deixa de existir.
- **A cobrança padrão dá processador só durante um pedido** (*request-based billing*): trabalho depois
  da resposta corre devagar ou para. O lint já não deixa promessa solta, mas o envio do alerta ao
  Sentry é assíncrono — **provar na G3 que o alerta chega**. *Se não chegar: o alerta espera o envio
  (`flush`) antes de a resposta sair, ou o serviço passa à cobrança por instância (mais cara).*
- **Os contadores em memória supõem UM servidor só**, como a Railway rodava: o limite de tentativas, os
  3 "assinar sem login" ao mesmo tempo, o cache do dicionário (`dict.ts`). **O serviço fica com no
  máximo 1 instância** (`max-instances=1`), o que também segura o custo. *Gatilho: um servidor não dar
  mais conta — aí os contadores vão para o banco antes de subir o máximo.*
- **O IP de quem acessa muda de cabeçalho.** A regra do `x-real-ip` foi MEDIDA na Railway e não vale
  no Google (`CLAUDE.md` → *Rate-limit de login*, gatilho "trocar de hospedagem"). Lá, a frente do
  Google acrescenta o endereço ao `X-Forwarded-For`, e a posição depende da frente (o mapeamento).
  **A regra nova sai de MEDIÇÃO em produção** (G4), como em 23/09/2026 — a doc não decide sozinha.

**A FORMA** *(convenções de engenharia, propostas pelo agente; o que é do operador está nas P)*:
- **A região: `us-east4` (Virgínia do Norte)**, com o mapeamento de domínio — **e o banco vai para
  a Virgínia também** *(decisão do operador, 22/10/2026: "eu quero mudar a Neon para a Virgínia (AWS):
  é mais perto, e a AWS também é confiável; se um dia eu tiver problema com a Neon, mudamos para o
  Google")*: um projeto novo do Neon em `aws-us-east-1` (Virgínia do Norte), vizinho do servidor —
  etapa G1b. *O Neon não roda dentro do Google* `[FATO — lista de regiões da conta, 22/10/2026: só
  AWS e Azure]`. *Gatilho: problema com o Neon → o banco vai para o Google (Cloud SQL).* Em São Paulo, cada página atravessaria o continente várias vezes. *O vídeo continua saindo do Bunny, perto do aluno.*
- **As chaves no cofre** (Secret Manager), lidas pelo serviço por referência. O que não é segredo
  (`COMING_SOON`, `BETTER_AUTH_URL`, `NODE_ENV`, os endereços e nomes do Bunny) num arquivo
  **versionado** no repositório, para a configuração da casa ser reproduzível. **Chave nenhuma no
  GitHub.**
- **Publicar = GitHub Actions, depois do CI verde na `main`:** monta a imagem, guarda no Artifact
  Registry, roda as migrations num **Cloud Run Job** com a mesma imagem (o papel do pre-deploy da
  Railway: se falhar, não publica) e só então troca o serviço. O GitHub entra no Google **sem chave
  guardada** (Workload Identity Federation). A publicação **espera o CI verde** da mesma `main`.
- **Duas contas de serviço:** a do site, que só lê os segredos dele; a da publicação, que só publica.
- **O servidor: LIGADO, ESPERANDO** *(decisão do operador, 22/10/2026, depois da conta com os preços
  do Google: "Ligado, esperando")* — `min-instances=1` e `max-instances=1`, com a **cobrança por pedido**
  (o processador fica reduzido entre os pedidos; o tempo parado sai pela tarifa de espera), 1
  processador e 512 MB: **~US$ 10 por mês** (talvez menos, se a cota grátis descontar parte — conferir
  na primeira fatura). Ninguém espera o servidor ligar.
  **ENQUANTO DURAR O CRÉDITO: 2 processadores e 2 GB** *(decisão do operador, 22/10/2026: "como vai
  utilizar meus créditos nesses 90 dias, deixa 2 processadores e 2 GB; quando acabarem os créditos eu
  mudo para uma configuração menor")* — ~US$ 26 por mês parado (`[medido 22/10]`), ~US$ 80 nos três
  meses, dentro do crédito de R$ 1.779. **Antes de 20/01/2027, volta ao tamanho de cima** (1
  processador; 512 MB ou 1 GB, conforme a memória medida) — P104. *Nota de engenharia:* o Node roda
  o código num processador só; o segundo ajuda o banco (Prisma) e a compressão, e o ganho é modesto. **Recusados:** o que desliga sozinho (~R$ 0, mas
  o primeiro visitante espera alguns segundos) e o processador cheio o tempo todo (~US$ 45).
- **O resto da conta mínima** *(o operador, 22/10/2026: "prefiro fazer a configuração só do que
  realmente vou precisar, assim quando os créditos expirarem não fico com um custo alto")*: o cofre com
  as 13 chaves (6 grátis; ~US$ 0,40 por mês o resto) · o registro de imagens guardando **só as últimas**
  (regra de limpeza), para caber na cota grátis · nada de balanceador, CDN, proteção extra contra ataque
  ou montagem de imagem no Google (a imagem se monta no GitHub Actions). O crédito de R$ 1.779 vence em
  20/01/2027; a cota grátis mensal do Cloud Run continua depois dele.
- **Teto de gasto:** o alerta de orçamento (R$ 100 por mês, já ligado na G1) e `max-instances=1`. O
  Google não tem teto automático.
- **Tempo máximo de um pedido: 60 minutos** (o padrão do Cloud Run é 5): um download de 500 MB numa
  internet lenta passa de 5 minutos. *Custo aceito:* enquanto um download corre, o servidor conta como
  "trabalhando" (tarifa cheia) — centavos por download.
- **O mapa do que mais existe no Google, quando ligar e quanto custa:** `tech-stack.md` → *Google
  Cloud — o que a escola usa, e o mapa do que pode contratar depois*.
- **A conta Google: `jilson@jilsonsantana.com`** *(decisão do operador, 21/10/2026 — fecha a P99: "vou
  utilizar o meu e-mail da empresa […] que é o mesmo e-mail do meu canal, mas tomaremos as medidas de
  segurança como autenticador ou o que for necessário")*. O agente tinha recomendado uma conta
  separada da do YouTube; ele decidiu pela mesma, com proteção reforçada. **Na G1, antes de tudo:**
  verificação em duas etapas com chave de acesso (passkey) e app autenticador, os códigos de reserva
  guardados fora do computador, e o telefone e o e-mail de recuperação conferidos. *Reabre se a conta
  sofrer tentativa de invasão, ou se mais alguém precisar entrar no Google Cloud — aí a escola ganha
  uma conta ou organização própria.*
- **Segredo nunca passa pelo chat nem por argumento de comando** (`CLAUDE.md` → *Secrets in agent
  sessions*): o que o operador recebe de um fornecedor, ele digita no console do Google; o que nós
  geramos (segredo das sessões, token da prévia) vai por um comando que gera e grava sem mostrar.

**QUEM EXECUTA: O ANTIGRAVITY, E O CLAUDE CONFERE** *(decisão do operador, 21/10/2026: "o antigravity
consegue fazer essa mudança? […] você deixaria registrado o que ele deve seguir e você ficaria para
verificar e continuar com a Stripe")*. O Claude Code segue com a Stripe (etapa 4.7, passo 6) na `dev`
enquanto isso. **As regras do Antigravity neste bloco — valem SOBRE o `design-lab/GEMINI.md`, só para
os arquivos e comandos do Bloco G:**
1. **Leia antes:** o `CLAUDE.md` inteiro (sobretudo *Secrets in agent sessions*, *Block Execution
   Protocol*, *DE QUEM É A DECISÃO*, *Database & Migrations* e o *Rate-limit de login* em *Quality
   Gates*), este Bloco G inteiro e as pendências P100, P101, P103 e P97.
2. **Branch próprio: `bloco-g`**, saído da `dev`. Um commit por etapa, com o checkbox e os documentos
   no mesmo commit. **Nunca faça merge na `dev` nem na `main`:** o Claude lê o diff, roda o
   `security-vulnerability-reviewer` e faz o merge na `dev`; a `main` só com o "publica" do operador.
3. **Segredo nunca aparece:** nem no chat, nem como argumento de comando, nem na saída de um comando.
   O que vem de fornecedor, o operador digita no console do Google. O que nós geramos vai por pipe,
   sem mostrar: `openssl rand -base64 32 | gcloud secrets create NOME --data-file=-`. Conferir
   segredo = conferir que o NOME existe (`gcloud secrets list`), nunca o valor. **Não abra arquivo
   `.env`.**
4. **O banco de produção:** nenhuma consulta e nenhuma migration à mão. As migrations só pelo Job da
   publicação. **O Antigravity nunca se conecta ao banco de produção:** as leituras da G3 (antes e
   depois) o OPERADOR roda no console do Neon (*SQL Editor*, branch `production`), com as consultas
   prontas da G3, e cola o resultado no relatório — são só leitura e não mostram segredo.
5. **O IP de quem acessa não se adivinha:** codifique pela doc do mapeamento de domínio, com teste
   de valor forjado, e **meça em produção na G4** antes de dar a regra por certa. A rota de diagnóstico
   é temporária, não mostra nada além dos cabeçalhos de endereço, e sai na mesma etapa. Nunca use
   `fastly-client-ip`, `true-client-ip` nem `cf-connecting-ip`.
6. **Só o que o plano manda:** nenhuma tela, nenhum texto, nenhuma regra de produto muda neste
   bloco. Achado fora do plano se REPORTA ao operador, não se conserta. Surpresa (permissão negada,
   comportamento diferente da doc) = **pare e conte**, não contorne.
7. **Antes de cada commit, os quatro gates:** `npm run typecheck`, `npm run lint`, `npm run test` (a
   suíte inteira) e `npm run build`.
8. **A conta mínima desde o primeiro serviço:** `us-east4`, `min-instances=1`, `max-instances=1`,
   cobrança por pedido, **2 processadores e 2 GB enquanto durar o crédito** (decisão do operador,
   22/10/2026; volta a 1 processador antes de 20/01/2027 — P104), o registro de imagens com regra de
   limpeza. Nada que
   não esteja em *A forma* (balanceador, CDN, proteção extra) — e nada de crédito "para testar".
9. **No fim de cada etapa, um relatório** no checkbox dela: o que mudou, os comandos rodados (sem
   segredo) e as provas. É por ele que o Claude confere.

**AS ETAPAS — uma por sessão; cada uma termina num estado seguro, sem nada pela metade no ar:**

- [x] **G1 — As contas e as chaves** *(painéis; o operador, com o agente guiando tela a tela)*.
      A conta `jilson@jilsonsantana.com` com a proteção reforçada (acima) · o projeto, o faturamento e o **alerta de orçamento** · o
      `gcloud` no Mac (o instalador do próprio Google: o Mac não tem Homebrew) · **trocar as chaves
      vazadas (P103)** — a senha do banco de produção (Neon → `production` → *Roles* → *Reset
      password*; o `dev` tem outra senha e não muda), a `sk_live_` da Stripe (vencendo na hora) e o
      segredo do aviso, as chaves da biblioteca de aulas e do token, as senhas das duas pastas do
      Bunny · **cada valor novo direto para o cofre**, e a chave da conta do Bunny que ele já trocou
      também · a chave de produção do Resend (**P97**) · os nossos gerados (segredo das sessões, token
      da prévia).
      **Pronto quando:** cada segredo existe no cofre (conferido pelo NOME, nunca pelo valor), as
      chaves antigas foram canceladas nos fornecedores e o alerta de orçamento está ligado.
      *(22/10/2026, no branch `bloco-g`.)* **Relatório da etapa G1 (Regra 9):**
      - **Conta Google (`jilson@jilsonsantana.com`):** verificação em duas etapas reforçada com app
        autenticador (`Etapa de login adicionada: app Google Authenticator`) e códigos de backup
        gerados e guardados fora do Mac; telefone e e-mail de recuperação conferidos. *Decisão do
        operador (21/10/2026): sem chave de acesso (passkey) no iMac (`x86_64`, sem Touch ID), ficando
        com o app autenticador e os códigos de backup.*
      - **Projeto, faturamento e alerta de orçamento:** projeto `jilsonsantana` (ID `jilsonsantana`)
        criado no Google Cloud, conta de faturamento vinculada (com US$ 300 / R$ 1.779 de créditos de
        teste gratuito por 90 dias) e **alerta de orçamento mensal de R$ 100** criado e ativo (50%,
        90% e 100%, com envio de alerta por e-mail).
      - **`gcloud` no Mac (`x86_64`):** na versão `590.0.0`, o arquivo oficial
        `google-cloud-cli-darwin-x86_64.tar.gz` trouxe o manifesto de Python embutido vazio e recusou
        o Python 3.9 do Command Line Tools da Apple; reportada a surpresa ao operador (Regra 6), que
        escolheu instalar o Python `3.12.8` oficial (`python-3.12.8-macos11.pkg`, `python.org`) e
        apagar os instaladores temporários de `/tmp`. `Google Cloud SDK 590.0.0` instalado em
        `/Users/jilson/google-cloud-sdk`, autenticado em `jilson@jilsonsantana.com`, projeto padrão
        `jilsonsantana` configurado e API `secretmanager.googleapis.com` ativada.
      - **Chaves trocadas nos fornecedores (fecha a P103), chave do Resend (fecha a P97) e segredos no
        cofre:** todos os valores vindos de fornecedores foram colados pelo operador direto no painel
        do Secret Manager (nenhum segredo passou pelo chat ou por argumento de comando; nenhum arquivo
        `.env` foi aberto):
        1. **Neon (`production`, `ep-still-breeze-aebrui0f`):** senha de `neondb_owner` resetada pelo
           operador (apenas no branch `production`; o `dev` e a cópia de 21/10 permaneceram intocados)
           → gravados `DATABASE_URL` (com `-pooler`) e `DIRECT_URL` (sem `-pooler`).
        2. **Stripe (modo de produção):** `sk_live_` rotacionada (*Rotate key*) com expiração
           imediata (`now`) → gravada em `STRIPE_SECRET_KEY`; `Signing secret` do destino de webhook
           `https://www.jilsonsantana.com/api/stripe/webhook` rotacionado com expiração imediata
           (`now`) → gravado em `STRIPE_WEBHOOK_SECRET`.
        3. **Bunny:** chave geral da conta (trocada em 21/10) gravada em `BUNNY_ACCOUNT_API_KEY`; na
           biblioteca `jilsonsantana-stream` (`762605`), `API Key` e `Token Authentication Key`
           resetadas e gravadas em `BUNNY_STREAM_LESSONS_API_KEY` e `BUNNY_STREAM_LESSONS_TOKEN_KEY`;
           nas Storage Zones `jilsonsantana-storage` e `jilsonsantana-arquivos`, senhas de escrita
           resetadas e gravadas em `BUNNY_STORAGE_PASSWORD` e `BUNNY_FILES_STORAGE_PASSWORD`.
        4. **Resend (fecha a P97):** chave nova `Production` criada pelo operador (`Sending access`,
           restrita ao domínio `alunos.jilsonsantana.com`, mantendo a chave `dev` separada para o
           computador) → gravada em `RESEND_API_KEY`.
        5. **Sentry:** chave nova gerada em *Client Keys (DSN)*, a antiga (que estava na Railway)
           excluída pelo operador, e a nova gravada em `SENTRY_DSN`.
        6. **Gerados por nós via pipe (sem exibir valor):** `BETTER_AUTH_SECRET` (`openssl rand
           -base64 32 | tr -d '\n'`) e `PREVIEW_TOKEN` (`openssl rand -hex 32 | tr -d '\n'`, em
           hexadecimal sem `+`/`=`/`\n` para não quebrar na query string `/__preview?token=`).
      - **Comandos rodados (sem segredo):**
        - `git checkout -b bloco-g`
        - `curl -fsSL https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/google-cloud-cli-darwin-x86_64.tar.gz -o /tmp/google-cloud-cli-darwin-x86_64.tar.gz`
        - `tar -xzf /tmp/google-cloud-cli-darwin-x86_64.tar.gz -C /Users/jilson`
        - `curl -fsSL https://www.python.org/ftp/python/3.12.8/python-3.12.8-macos11.pkg -o /tmp/python-3.12.8-macos11.pkg && open /tmp/python-3.12.8-macos11.pkg`
        - `rm -rf /tmp/google-cloud-cli-darwin-x86_64.tar.gz /tmp/google-cloud-sdk /tmp/python-3.12.8-macos11.pkg`
        - `/Users/jilson/google-cloud-sdk/install.sh --quiet --path-update=true --command-completion=true --usage-reporting=false`
        - `/Users/jilson/google-cloud-sdk/bin/gcloud auth login jilson@jilsonsantana.com --project=jilsonsantana --quiet`
        - `/Users/jilson/google-cloud-sdk/bin/gcloud services enable secretmanager.googleapis.com --project=jilsonsantana`
        - `openssl rand -base64 32 | tr -d '\n' | /Users/jilson/google-cloud-sdk/bin/gcloud secrets create BETTER_AUTH_SECRET --replication-policy=automatic --data-file=- --project=jilsonsantana`
        - `openssl rand -hex 32 | tr -d '\n' | /Users/jilson/google-cloud-sdk/bin/gcloud secrets create PREVIEW_TOKEN --replication-policy=automatic --data-file=- --project=jilsonsantana`
        - `/Users/jilson/google-cloud-sdk/bin/gcloud secrets create <NOME> --replication-policy=automatic --project=jilsonsantana` (para os 11 segredos de fornecedores)
        - `/Users/jilson/google-cloud-sdk/bin/gcloud secrets list --project=jilsonsantana` e `gcloud secrets versions list <NOME> --project=jilsonsantana`
      - **Provas:** `gcloud secrets list --project=jilsonsantana` lista os 13 segredos
        (`BETTER_AUTH_SECRET`, `BUNNY_ACCOUNT_API_KEY`, `BUNNY_FILES_STORAGE_PASSWORD`,
        `BUNNY_STORAGE_PASSWORD`, `BUNNY_STREAM_LESSONS_API_KEY`, `BUNNY_STREAM_LESSONS_TOKEN_KEY`,
        `DATABASE_URL`, `DIRECT_URL`, `PREVIEW_TOKEN`, `RESEND_API_KEY`, `SENTRY_DSN`,
        `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`), todos com `version 1` em estado `enabled`
        conferido por `gcloud secrets versions list`. Quatro gates (`typecheck`, `lint`, `test`,
        `build`) verdes antes do commit.
      - **CONFERIDO PELO CLAUDE (22/10/2026), antes do merge na `dev`:** o diff é só de documento, sem
        segredo nenhum (busca por formatos de chave: zero achados) · os 13 segredos no cofre, cada um
        com a versão 1 ativa · **o formato de cada valor conferido sem mostrá-lo** (um roteiro que lê
        do cofre e responde só sim ou não): nenhum com espaço ou quebra de linha nas pontas; a
        `DATABASE_URL` com `-pooler` e a `DIRECT_URL` sem, as duas no endpoint de produção e no banco
        `neondb`; a chave da Stripe `sk_live_`, o segredo do aviso `whsec_`, a do Resend `re_`, o DSN
        `https://`, o token da prévia com 64 caracteres hexadecimais e o segredo das sessões com 32 ou
        mais · **no Neon, pelo registro de operações (sem ler dado):** a mudança de configuração no
        ponto de conexão de produção às 08:27 UTC de 22/10 (a troca da senha), e **nenhuma conexão ao
        banco de produção entre 23:55 UTC de 21/10 e a troca** — a senha antiga não foi usada nessa
        janela · os quatro gates de novo (site 928, servidor 1250). *O `security-vulnerability-reviewer`
        não rodou nesta etapa: ela não tem código; ele roda a partir da G2.*
- [x] **G1b — O banco na Virgínia** *(painéis do Neon e do Google; o operador, com o Antigravity
      guiando; antes da G3, antes ou depois da G2)*. `[FATO — doc do Neon, "Migrate to another Neon
      region", 22/10/2026: o **Import Data Assistant** do console cria o projeto novo na região escolhida
      e copia os dados, para bancos de até ~10 GB; o nosso tem ~34 MB.]`
      1. **O retrato ANTES** (o operador, no *SQL Editor* do projeto atual, branch `production`): as
         consultas do Passo 0 da G3 e mais estas duas, de todas as tabelas —
         `SELECT table_name, (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I', table_schema, table_name), false, true, '')))[1]::text::int AS linhas FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY 1;` ·
         `SELECT sequencename, last_value FROM pg_sequences WHERE schemaname='public' ORDER BY 1;` ·
         e quantas contas não são as duas de teste: `SELECT count(*) FROM "user" WHERE email NOT IN ('jilson@jilsonsantana.com','member@jilsonsantana.com');`
      2. **O projeto novo** (o operador, no console: *Projects* → *Import Data Assistant*): a origem é a
         ligação **direta** (sem `-pooler`) do branch `production` atual, colada no assistente —
         nunca no chat; o destino é **AWS US East 1 (N. Virginia)**, com o **mesmo Postgres (18)**. No
         projeto novo: o branch principal se chama `production`, fica **protegido**, e a **janela de
         restauração é a mesma do atual (7 dias)**.
      3. **O retrato DEPOIS**, as mesmas consultas no projeto novo: **cada tabela com o mesmo número de
         linhas, as sequências com os mesmos valores, as migrations iguais, a consulta de RLS com zero
         linhas.** Qualquer diferença: **pare e conte** (regra 6) — o projeto atual continua intacto.
      4. **O branch `dev` no projeto novo**, feito do `production` — **e a senha dele trocada na hora**
         (*Reset password*: o branch nasce com a senha de produção — `CLAUDE.md` → *BRANCH NOVO HERDA A
         SENHA*). **Se a consulta das contas (passo 1) der mais que zero, o `dev` é schema-only** (sem as
         linhas) — mesma seção do `CLAUDE.md`. Depois, o seed no `dev` (as contas de teste com as senhas
         do computador).
      5. **O cofre:** versões novas de `DATABASE_URL` (com `-pooler`) e `DIRECT_URL` (sem), do
         `production` NOVO, coladas pelo operador no console do Google; as versões antigas,
         **desativadas**. **O computador:** o operador troca as duas ligações do `server/.env` pelas do
         `dev` novo, **com o arquivo FECHADO no editor**; prova: `npm run dev:server` sobe e o login com
         a conta de teste funciona.
      6. **Os documentos, no mesmo commit:** o `CLAUDE.md` (*Database & Migrations*: o id do projeto,
         os endpoints do `production` e do `dev`, a região), o `tech-stack.md` (*Database*) e o *Estado
         atual*.
      **O projeto antigo (Ohio):** o plano o mantinha até a G4; **o operador decidiu apagá-lo na própria
      G1b** (22/10/2026, 17:53 UTC), e com ele a cópia de 21/10 e o `dev` antigo. **O Neon o guarda
      para recuperação até 29/10/2026** (`[FATO — Neon, lista de projetos recuperáveis, 22/10/2026]`);
      depois disso, a volta atrás é a janela de 7 dias do projeto novo.
      **CONFERIDO PELO CLAUDE (22/10/2026), antes do merge na `dev`:** o diff sem segredo (zero
      achados); a única mudança de código é a trava da assinatura de teste apontando para o `dev`
      novo, com o teste recusando a produção nova · o cofre, sem mostrar valores: `DATABASE_URL` e
      `DIRECT_URL` na versão 3, no endpoint da produção nova, na Virgínia, com e sem `-pooler`,
      `sslmode=require` e sem `channel_binding` · o Neon: o projeto novo em `aws-us-east-1`, com o
      `production` principal e protegido e 7 dias de restauração, e o `dev` · **só lendo a produção
      nova:** 26 tabelas, nenhuma sem RLS; 34 migrations (a última, de 18/10 — as quatro de 21/10 entram
      na G3); 2 contas, 2 cursos e 1 assinatura; a conta de admin ainda sem o e-mail confirmado
      (esperado: é a migration de 21/10 que confirma) · **o projeto de Ohio apagado** (recuperável até
      29/10), então a comparação de antes e depois fica com o retrato do operador · os quatro gates.
      **Pronto quando:** o projeto novo na Virgínia tem os mesmos dados (provado tabela por tabela), o
      `dev` novo com senha própria, o cofre e o computador apontando para ele.
      - **Relatório de execução (22/10/2026 — branch `bloco-g`):**
        - **Modo de operação escolhido pelo operador:** 100% pelo painel da Neon (sem usar o MCP da Neon sobre `production`, respeitando a Regra 4 do Bloco G).
        - **Retrato ANTES (projeto antigo `falling-snow-79489296`, Ohio, branch `production`) vs. Retrato DEPOIS (projeto novo `rough-meadow-05608403`, Virgínia `aws-us-east-1`, branch `production`) — 100% idênticos nas 7 consultas:**
          1. **Últimas 6 migrations (34 no total em `production`):** `20261018170000_sai_o_idioma_da_conta`, `20261012190000_sai_o_idioma`, `20261012170000_idioma_com_valor_padrao`, `20261010233000_resposta_do_reembolso_em_ingles_sem_o_parentese`, `20261010230000_reembolso_de_14_dias_na_resposta_em_ingles`, `20261010120000_cliente_da_stripe` (mesmos carimbos de `finished_at`).
          2. **Resumo:** `contas = 2`, `cursos = 2`, `assinaturas = 1`, `sessoes = 7`.
          3. **Admin:** `email = jilson@jilsonsantana.com`, `emailVerified = f`.
          4. **Tabelas em `public` sem RLS (`NOT relrowsecurity`):** `0` linhas (`No result`).
          5. **Todas as 26 tabelas de `public` e respectivas linhas:** `_prisma_migrations` (34), `account` (2), `announcement` (0), `caption` (15), `course` (2), `course_start` (2), `faq_item` (14), `learning_plan` (1), `lesson` (15), `lesson_event` (14), `lesson_file` (1), `lesson_progress` (10), `module` (7), `notification` (2), `plan_item` (0), `plan_module` (1), `saved_item` (1), `session` (7), `site_text` (0), `stripe_customer` (1), `stripe_event` (2), `student_preference` (1), `subscription` (1), `testimonial` (4), `user` (2), `verification` (0).
          6. **Todas as 18 sequências de `public` (`last_value`):** `announcement_id_seq` (`null`), `caption_id_seq` (22), `course_id_seq` (12), `course_start_id_seq` (245), `faq_item_id_seq` (30), `learning_plan_id_seq` (8), `lesson_event_id_seq` (14), `lesson_file_id_seq` (2), `lesson_id_seq` (29), `lesson_progress_id_seq` (362), `module_id_seq` (20), `notification_id_seq` (306), `plan_item_id_seq` (9), `plan_module_id_seq` (9), `saved_item_id_seq` (1), `site_text_id_seq` (`null`), `subscription_id_seq` (1), `testimonial_id_seq` (8).
          7. **Contas além das duas de teste (`contas_extras`):** `0`.
        - **O que foi feito nos painéis (Neon e Google Cloud):**
          - **Neon (`rough-meadow-05608403`, renomeado para `jilsonsantana-prod`):** criado via *Import Data Assistant* usando a `DIRECT_URL` (sem `-pooler`) do `production` antigo, região **AWS US East 1 (N. Virginia)** (`aws-us-east-1`), **PostgreSQL 18**, *Enable Neon Auth* desmarcado, janela de restauração (*History retention*) de **7 dias**. Como o assistente da Neon importa os dados num branch separado (`import-...`) e deixa o branch inicial vazio, o branch com os dados importados foi promovido a `Default` e `Protected` com o nome **`production`** (endpoint `ep-muddy-hill-b8oromcw`) e o branch vazio inicial foi excluído. **Decisão explícita do operador:** apagar já o projeto antigo de Ohio (`falling-snow-79489296`) para reutilizar o nome `jilsonsantana-prod` no projeto novo.
          - **Branch `dev` (`ep-soft-base-b8waj57h`):** criado a partir de `production` (*Branch data and schema*, *Auto-delete: Never*, já que `contas_extras = 0`) e com a senha de `neondb_owner` resetada imediatamente (*Reset password*). Em seguida, aplicadas no `dev` as 4 migrations de 21/10 (`20261021120000_ficha_de_espera_do_visitante`, `20261021180000_boas_vindas_da_ficha`, `20261021220000_senha_da_ficha_uma_vez`, `20261021220100_admin_com_email_confirmado`, totalizando **38 migrations** no `dev`), sincronizados os hashes de senha de `jilson@jilsonsantana.com` e `member@jilsonsantana.com` no `dev` com `SEED_ADMIN_PASSWORD` / `SEED_MEMBER_PASSWORD` do `server/.env`, e executado `npm --workspace server run db:seed` (que confirmou `+ assinatura de teste ativa para member@jilsonsantana.com (banco local ou dev)`).
          - **Achado técnico registrado no `CLAUDE.md`:** o diálogo *Connect* da Neon anexa `&channel_binding=require` ao final da query string (`?sslmode=require&channel_binding=require`), o que faz o motor Rust do Prisma (`quaint`) falhar com `P1001: Can't reach database server`. Tanto no Secret Manager quanto no `server/.env` as URLs foram gravadas terminando apenas em `?sslmode=require`.
          - **Achado de código autorizado pelo operador (Regra 6):** [`server/src/lib/assinatura-de-teste.ts`](server/src/lib/assinatura-de-teste.ts) e [`server/src/test/acesso.test.ts`](server/src/test/acesso.test.ts) traziam o ID do endpoint antigo (`ep-lingering-morning-aehqd81z`) e foram atualizados para o novo endpoint de `dev` (`ep-soft-base-b8waj57h`).
          - **Google Cloud Secret Manager:** `DATABASE_URL` (`ep-muddy-hill-b8oromcw-pooler`) e `DIRECT_URL` (`ep-muddy-hill-b8oromcw`) atualizados na `version 3` (`enabled`), com as versões `1` e `2` em estado `destroyed`. Conferido sem exibir segredo: sem espaços/quebras nas pontas, `search: '?sslmode=require'`, `pathname: '/neondb'`, e `prodPwd !== devPwd` (`true`).
        - **Comandos rodados (sem segredo):**
          - `git status` / `git branch --show-current`
          - `npm --workspace server exec prisma migrate deploy` (aplicou as 4 migrations de 21/10 no branch `dev`)
          - `npm --workspace server run db:seed`
          - `/Users/jilson/google-cloud-sdk/bin/gcloud secrets versions list DATABASE_URL --project=jilsonsantana`
          - `/Users/jilson/google-cloud-sdk/bin/gcloud secrets versions list DIRECT_URL --project=jilsonsantana`
          - `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`
        - **Provas:** retrato ANTES vs. DEPOIS 100% idêntico nas 7 consultas em `production` · `gcloud secrets versions list` confirma `version 3 enabled` e versões anteriores `destroyed` em `DATABASE_URL` e `DIRECT_URL`, com senha de `production` distinta da de `dev` · `POST /api/auth/sign-in/email` em `http://localhost:3000` e `http://localhost:5173` retornando `HTTP 200` (`role: 'admin'`) · quatro gates (`typecheck`, `lint`, `test`, `build`) verdes.
- [x] **G2 — O código se adapta** *(no `dev`, testado no computador; nada publicado)*.
      `Docs check`: Cloud Run → `/websites/cloud_google_run` (o cabeçalho do IP no mapeamento de
      domínio; a publicação pelo GitHub) · Bunny → `/bunnyway/documentation`, perguntando por
      **"Storage"** (gravar, ler e apagar objeto — o envio em partes).
      **O arquivo de aula em partes, sem limite de tamanho** (decisão da P101, acima): o navegador do admin manda
      pedaços de até 30 MB, um de cada vez, tentando de novo o que falhar na rede; cada um vira um
      objeto na zona dos arquivos; o banco guarda quantas partes o arquivo tem (migration, com o
      Passo 0) e **o arquivo só aparece para o aluno quando todas chegaram**; **nenhum limite de
      tamanho e nenhuma frase nova na tela**; o download entrega as partes em sequência, em
      fluxo, com a MESMA trava de hoje (só assinante, a prévia grátis não libera arquivo); apagar
      apaga todas as partes, e a trava que só aceita caminho de arquivo continua estrita (apagar pasta
      apaga tudo, `bunny.md` §4.5); o arquivo já guardado inteiro vale como uma parte só. **A tela do
      admin não muda** (o que o operador vê é o mesmo envio, com o andamento). Testes de servidor (o
      assinante baixa o arquivo inteiro e igual; quem não assina, 403; parte faltando não aparece) e
      mutação no download e no apagar. O `bunny.md` §4.5 reconciliado.
      **O endereço sem "www" leva ao `www`, com o resto do endereço** (fecha a P57 na G4): um desvio
      301 no servidor, só quando o pedido chega por `jilsonsantana.com` exato — o endereço provisório
      do Google (`*.run.app`) não desvia, para a G3 poder provar por ele. Com teste.
      **O porteiro do IP:** uma função só decide o endereço de quem pediu, conforme a frente, e as duas
      leituras que hoje usam o `x-real-ip` (o Better Auth, em `auth.ts`, e o nosso limite, em
      `limite-de-tentativas.ts`) passam a confiar nela — com teste de valor forjado e mutação · o
      arquivo da publicação (`.github/workflows/deploy.yml`) e o Job das migrations · o arquivo da
      configuração sem segredo · sai o `railway.json` · o download em fluxo, se a P101 pedir · os
      comentários que citam a Railway (`desligar.ts`, `limite-de-tentativas.ts`, `auth.ts`, `dict.ts`,
      `admin-lesson-files.ts`) · **o `CLAUDE.md` reescrito onde a regra era da Railway** (o IP, o
      pre-deploy, o `drainingSeconds`, *Separação de ambientes*, *Costs*, a nota provisória em *Tech
      Stack*) e o `tech-stack.md`. `security-vulnerability-reviewer` sobre o diff; os quatro gates.
      **Pronto quando:** o `dev` verde, com o plano e os documentos no mesmo commit.
      - **Execução detalhada da G2 (Antigravity no branch `bloco-g`, 22/10/2026):**
        - **Parte 1 (commit `d9b3b6d`): O endereço de quem acessa e o domínio sem "www"**
          - Criada a função `ipDoPedido` (`server/src/lib/limite-de-tentativas.ts`) centralizando a determinação do IP do cliente a partir do último elemento de `x-forwarded-for` (padrão documentado da borda do Cloud Run com mapeamento de domínio), provisória até medição em produção na G4.
          - Better Auth (`server/src/lib/auth.ts`, pelo embrulho do handler, `pedidoComIpDoPorteiro`) e limite de tentativas (`enderecoDoPedido`) integrados a `ipDoPedido`.
          - Adicionado middleware de redirecionamento 301 no Express (`server/src/app.ts`) para requisições com host exato `jilsonsantana.com`, preservando URL e query para `https://www.jilsonsantana.com`. Requisições `*.run.app` não sofrem desvio.
          - Provas *(nomes corrigidos pelo Claude na conferência)*: `server/src/test/auth-ip.test.ts` (o `ipDoPedido` com cabeçalho forjado, IPv6, vazio e inválido; o desvio 301 com caminho e query, e o `*.run.app` sem desvio) e `server/src/test/login-limite.test.ts` (cada pessoa com o seu limite; forjar o começo do cabeçalho não escapa). O recuo para o endereço da conexão vale **só fora de produção**.
          - Mutação provada: forçar a leitura do primeiro elemento do cabeçalho quebrou a suíte com `expected '203.0.113.195' to be '198.51.100.1'`.
        - **Parte 2 (commit `b843cdb`): O arquivo de aula em partes, sem limite de tamanho**
          - Model `LessonFile` atualizado em `server/prisma/schema.prisma` com `partes Int @default(1)`, `partesEnviadas Int @default(1)` e `completo Boolean @default(true)`.
          - Migration escrita à mão `server/prisma/migrations/20261022210000_arquivo_da_aula_em_partes/migration.sql`.
          - Passo 0 no branch `dev` da Neon: retrato ANTES vs. DEPOIS idêntico nas contagens (`user: 2`, `course: 2`, `lesson: 15`, `lesson_file: 1`, `subscription: 2`), `prisma migrate deploy` executado com sucesso no `dev`, `prisma migrate diff` atestando nenhuma diferença e RLS zerado.
          - Chunked upload (`client/src/lib/api.ts`): arquivos acima de 30 MB são fatiados em partes de 30 MB (`TAMANHO_MAXIMO_DA_PARTE`), enviados sequencialmente (`POST` inicial com `X-Total-De-Partes`, seguido de `PUT /api/admin/lesson-files/:id/partes/:parte`), com 3 retentativas automáticas para falhas transientes e limpeza completa no storage e no banco se a falha for definitiva. A interface do admin não muda nenhuma linha visual nem frase.
          - Visibilidade do aluno: arquivo só aparece quando `completo = true` (`partesEnviadas === partes`).
          - Download em fluxo (`server/src/routes/lesson-view.ts`): streaming sequencial das partes do Bunny Storage via pipeline Node.js, `Content-Length` total, com trava estrita de assinante ativo (403 para não-assinantes e prévia grátis sem download).
          - Exclusão (`server/src/routes/admin-lesson-files.ts` e `server/src/lib/limpeza-no-bunny.ts`): exclusão de todas as partes no Bunny Storage mantendo a validação estrita de caminho de arquivo. Arquivos legados com 1 parte continuam totalmente funcionais.
          - Reconciliada a §4.5 do `docs/bunny.md`.
          - Provas *(nomes corrigidos pelo Claude na conferência)*: `server/src/test/lesson-files.test.ts`, `server/src/test/lesson-view.test.ts` e `client/src/components/admin/course-editor/CourseEditorLessonFiles.test.tsx`.
          - Mutações provadas: alteração no loop de download quebrou testes com `Error: aborted`; alteração na exclusão das partes quebrou o spy de chamadas (`expected 3, got 1`).
        - **Parte 3: A publicação no Google e os documentos**
          - Criado `.github/workflows/deploy.yml`: acionado apenas na `main` após sucesso do workflow de CI (`workflow_run`), autentica no Google Cloud via Workload Identity Federation, compila e armazena imagem Docker no Artifact Registry, executa o Cloud Run Job de migrations (`prisma migrate deploy`) com `--wait` (falha bloqueia o deploy), e atualiza o serviço Cloud Run.
          - Especificação da conta mínima do serviço: `us-east4`, `min-instances 1`, `max-instances 1`, cobrança por pedido (`--cpu-throttling`), 2 processadores e 2 GB de memória, tempo máximo de requisição 3600 s (`--timeout=3600`), variáveis públicas em `deploy/cloud-run.yaml` e segredos via Secret Manager (`--set-secrets`).
          - Criado `deploy/cloud-run.yaml` versionado com variáveis não confidenciais.
          - Removido `railway.json`.
          - Comentários que citavam a Railway atualizados em `server/src/lib/desligar.ts`, `server/src/lib/dict.ts`, `server/src/lib/auth.ts`, `server/src/index.ts`, `server/src/app.ts`, `server/src/lib/monitor.ts`, `server/src/routes/billing-sem-login.ts`, `server/src/routes/stripe-webhook.ts` e `server/src/test/test-env.ts`.
          - Reescreveu-se no `CLAUDE.md` e em `docs/tech-stack.md` as regras da Railway (IP, pre-deploy de migrations via Job, desligamento gracioso com SIGTERM no Cloud Run, separação de ambientes, custos e nota provisória de stack).
          - Docs check do Cloud Run e Bunny consultados e documentados.
        - **Comandos executados (sem segredo):**
          - `npm --workspace server exec prisma migrate deploy`
          - `npm --workspace server exec prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-url "$DIRECT_URL"`
          - `npm run typecheck`
          - `npm run lint`
          - `npm run test`
          - `npm run test -- --workspace=server src/test/billing-webhook.test.ts src/test/billing-checkout.test.ts src/test/billing-cartao.test.ts`
          - `npm run build`
          - `git rm railway.json`
        - **Provas finais:** 4 gates verdes (`typecheck`, `lint`, `test` com 80 arquivos/929 testes no cliente e 80 arquivos/1262 testes no servidor, e `build`). Branch `bloco-g` pronto para revisão de segurança e merge do Claude Code na `dev`.
      **CONFERIDO PELO CLAUDE (22/10/2026), com o `security-vulnerability-reviewer`:** nenhum P0.
      **Corrigido pelo Claude antes do merge:** (1) **a publicação podia sair de código de fora** — o
      repositório é público, o CI roda em pull request, e o `head_branch` de uma cópia (fork) pode se
      chamar `main`: o `deploy.yml` passou a exigir `event == 'push'` e o repositório deste projeto, e
      ganhou fila (duas publicações não correm juntas) · (2) o arquivo de configuração estava em
      `CHAVE=valor`, e o `--env-vars-file` do gcloud lê YAML: virou `deploy/cloud-run.yaml` · (3) o
      `PORT` saiu dele (reservado pelo Cloud Run) · (4) faltavam o `BASE_URL` (as páginas públicas
      sairiam com `localhost` no canonical) e a chave pública da Stripe (no cofre, G3) · (5) **o IP de
      rede interna** (privada, a própria máquina, as faixas da frente do Google) deixa de valer como
      visitante e vira "sem IP" — que agora **alerta também no login** (antes, só nas rotas de
      cobrança) · (6) **a parte já contada não se reenvia** (200 sem tocar no Bunny), o arquivo
      completo não se reescreve (409), e a parte é contada uma vez só mesmo com dois pedidos iguais
      juntos — é o que mantém o tamanho declarado no download igual aos bytes. *A trava extra que a
      revisão sugeriu no download (`strictContentLength`) foi testada e SAIU: com o tamanho gravado como
      texto, o Node acusa "5 diferente de 5" e lança um erro solto que derrubaria o servidor.* · (7) os
      nomes de teste errados nos documentos. **Testes novos:** 2 (as faixas internas; a repetição e o
      completo). **Mutação: 3 de 3 reprovaram.** Gates: site 929, servidor 1264.
      **Dívida registrada, com gatilho (P2 da revisão):** (a) **um assinante abrindo dezenas de
      downloads lentos** ocupa o servidor único por até 60 min — limite de downloads ao mesmo tempo por
      conta e `--concurrency` maior; *gatilho: o primeiro aluno pagante, ou 429 no registro* · (b)
      **a publicação segue a ordem em que os CI terminam**, e um CI antigo que acabe depois publica por
      cima do novo — pular quando o commit não for mais o topo da `main`; *gatilho: dois "publica"
      seguidos* · (c) **as ferramentas da publicação fixadas por versão móvel** (`@v4`), num passo que
      pode publicar — fixar pelo código do commit; *gatilho: antes da abertura ao público (passo 8 da
      4.7)*.
- [x] **G3 — A casa nova no ar, no endereço provisório do Google.**
      O agente monta com o `gcloud`, o operador acompanhando: as APIs, o Artifact Registry, as duas
      contas de serviço, a ligação com o GitHub, o serviço (com a conta mínima de *A forma*) e o Job.
      **Passo 0 no banco de produção** (o operador, no console do Neon, branch `production` — regra
      4), o retrato ANTES de publicar, e as mesmas consultas DEPOIS:
      `SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 6;` ·
      `SELECT (SELECT count(*) FROM "user") AS contas, (SELECT count(*) FROM course) AS cursos, (SELECT count(*) FROM subscription) AS assinaturas, (SELECT count(*) FROM session) AS sessoes;` ·
      `SELECT email, "emailVerified" FROM "user" WHERE role = 'admin';` · e a de RLS do `CLAUDE.md`
      (*Database & Migrations*). **Esperado depois:** as quatro migrations de 21/10 (e as da G2) no
      topo da lista; contas, cursos e assinaturas iguais ao antes (as sessões podem cair: o segredo
      das sessões é novo); o admin com `emailVerified = true`; o RLS com zero linhas.
      **A ligação com o GitHub:** o que o arquivo da publicação precisa (o projeto, a região, o
      provedor do Workload Identity e a conta de serviço de publicação) entra como **variável** do
      repositório no GitHub, não como segredo — nenhum deles é chave.
      **Antes da primeira publicação (achados da revisão da G2, 22/10/2026):** o operador cria no
      cofre o segredo `STRIPE_PUBLISHABLE_KEY` (a chave PÚBLICA `pk_live_` da Stripe — o servidor a
      lê em `lib/stripe.ts` e a publicação já a referencia); o Job das migrations recebe
      `DATABASE_URL` e `DIRECT_URL` (o Prisma exige as duas); e o provedor do Workload Identity aceita
      **só a publicação da `main` deste repositório** (revisão de segurança da G2: o nome do
      repositório sozinho aceitaria qualquer workflow de qualquer branch dele) — condição
      `assertion.repository_id=='<id>' && assertion.repository_owner_id=='<id>' && assertion.event_name=='workflow_run' && assertion.ref=='refs/heads/main' && assertion.workflow_ref=='Jilsonrs/jilsonsantana/.github/workflows/deploy.yml@refs/heads/main'`
      (os ids saem de `gh api repos/Jilsonrs/jilsonsantana --jq '.id,.owner.id'`). **A conta de
      publicação** fica com `run.developer` no serviço e no Job, `iam.serviceAccountUser` na conta do
      site e a escrita no Artifact Registry — **sem** acesso aos segredos (quem lê o cofre é a conta do
      site).
      **Quem publica:** com o "publica" do operador, o Antigravity faz o merge `--no-ff` da `dev` na
      `main` e envia (o mesmo caminho do `GEMINI.md` §5); a publicação sai pelo GitHub Actions. O
      Claude confere depois. **Publicar** (a ordem é
      dele: "publica"): merge `--no-ff` da `dev` na `main` → as migrations (as quatro de 21/10, que
      nunca chegaram ao ar, mais as da G2) → o serviço. **A prova no endereço provisório
      (`*.run.app`):** `/api/health`, o catálogo, a versão nova no `x-versao-do-app`, o "Em breve"; o
      banco igual ao retrato mais as migrations; a consulta de RLS do `CLAUDE.md` (zero linhas; a
      `guest_checkout` com RLS); a conta de admin com o e-mail confirmado; um download acima de 32 MiB
      — e, com o operador, **um arquivo de ~500 MB enviado pelo admin e baixado inteiro, igual ao
      original** (o envio em partes); um alerta de teste chegando ao e-mail (Sentry) **com o servidor parado** — provocar o erro e não
      mandar mais nenhum pedido: a cobrança por pedido reduz o processador depois da resposta, e o
      alerta do webhook da Stripe é a detecção do assinante pagante trancado. *Se não chegar:* o
      caminho de erro espera o envio (`Sentry.flush`, até 2 s) antes de responder, ou o serviço passa
      a `--no-cpu-throttling`; **a memória do
      servidor** no painel, anotada no relatório — é ela que decide, na P104, se a volta é para 512 MB
      ou 1 GB · **o tempo de resposta das páginas** no painel, anotado no relatório: se o banco pesar,
      com o banco já na Virgínia (G1b) · **o alerta de orçamento**: conferir se ele conta o gasto antes ou depois do crédito —
      com 2 processadores o gasto antes do crédito passa dos R$ 100 todo mês, e o alerta dispararia
      sem haver cobrança. *O login no endereço provisório pode
      recusar — o `BETTER_AUTH_URL` é o `www`: ele se prova na G4.*
      **Pronto quando:** o serviço responde no endereço do Google, ligado ao banco de produção, e o
      `www` ainda não aponta para ele.
      - **Relatório de execução da G3 (Antigravity no branch `bloco-g`, 23/10/2026):**
        - **Infraestrutura montada no Google Cloud (`jilsonsantana`, número `873389611774`):**
          - APIs habilitadas: `run.googleapis.com`, `artifactregistry.googleapis.com`, `iam.googleapis.com`, `iamcredentials.googleapis.com`, `sts.googleapis.com`.
          - **Artifact Registry:** repositório Docker `jilsonsantana` em `us-east4`, com política de limpeza estrita ativa mantendo apenas as 5 imagens mais recentes (`keepCount: 5`) para garantir consumo dentro da cota gratuita.
          - **Contas de serviço com privilégio mínimo:** `jilson-site` (conta de execução do Cloud Run, que lê apenas os 14 segredos atribuídos individualmente via `roles/secretmanager.secretAccessor`, sem nenhuma role no projeto) e `jilson-publicacao` (conta de CI/CD do GitHub Actions, que possui apenas `roles/artifactregistry.writer` no repositório Docker, `roles/iam.serviceAccountUser` na conta `jilson-site`, e `roles/run.developer` restrito ao serviço `jilson-prod` e ao Job `jilson-prod-migration`, **sem** acesso aos segredos do Secret Manager).
          - **Workload Identity Federation:** pool `github` e provedor `github-actions` criados com mapeamento e condição estrita exigindo `assertion.repository_id == '1110554640'`, `assertion.repository_owner_id == '186621656'`, `assertion.event_name == 'workflow_run'`, `assertion.ref == 'refs/heads/main'` e `assertion.workflow_ref == 'Jilsonrs/jilsonsantana/.github/workflows/deploy.yml@refs/heads/main'`. Vínculo `roles/iam.workloadIdentityUser` aplicado na conta `jilson-publicacao` restrito a este principal.
          - **Variáveis do repositório no GitHub:** 7 variáveis cadastradas em *Settings → Secrets and variables → Actions → Variables* (`GCP_PROJECT_ID=jilsonsantana`, `GCP_REGION=us-east4`, `GCP_WORKLOAD_IDENTITY_PROVIDER=projects/873389611774/locations/global/workloadIdentityPools/github/providers/github-actions`, `GCP_DEPLOY_SERVICE_ACCOUNT=jilson-publicacao@jilsonsantana.iam.gserviceaccount.com`, `GCP_ARTIFACT_REPOSITORY=jilsonsantana`, `GCP_MIGRATE_JOB_NAME=jilson-prod-migration`, `GCP_SERVICE_NAME=jilson-prod`).
          - **Secret Manager:** criado o segredo `STRIPE_PUBLISHABLE_KEY`, com versão 1 ativada pelo operador colando a chave pública `pk_live_` diretamente no console do Google (chave nunca trafegou no chat nem em linha de comando), totalizando 14 segredos no cofre com leitura atribuída a `jilson-site`.
          - **Serviço Cloud Run inicial:** criado `jilson-prod` na região `us-east4`, com imagem provisória inicial, `min-instances=1`, `max-instances=1`, `cpu=2`, `memory=2Gi`, `--cpu-throttling`, `--timeout=3600`, variáveis versionadas via `deploy/cloud-run.yaml` e 14 segredos via `--set-secrets`.
          - **Cloud Run Job de migrations:** criado `jilson-prod-migration` em `us-east4` com `--service-account=jilson-site`, `command=npx`, `args=prisma,migrate,deploy,--schema,server/prisma/schema.prisma`, segredos `DATABASE_URL` e `DIRECT_URL`, e timeout de 10 min.
        - **Retrato ANTES (Neon `rough-meadow-05608403`, branch `production`, registrado pelo operador via SQL Editor):**
          1. Últimas 6 migrations: 34 migrations no total, topo `20261018170000_sai_o_idioma_da_conta` (18/10/2026).
          2. Contagens: `contas = 2`, `cursos = 2`, `assinaturas = 1`, `sessoes = 7`.
          3. Admin: `email = jilson@jilsonsantana.com`, `emailVerified = f`.
          4. RLS: `0` linhas sem RLS (`No result`).
        - **Publicação na `main` autorizada pelo operador ("Publica"):**
          - Merge `--no-ff` da `dev` na `main` (commit `6de3c67`) e envio com `git push origin main`.
          - GitHub Actions executou o CI completo (`Typecheck, test & build` e `E2E Playwright`), aprovado com sucesso (run `39951337388`).
          - Acionado o workflow `Deploy` (run `39953157040`): autenticação via WIF, compilação de imagem Docker enviada para o Artifact Registry (`app:6de3c67`), execução do Cloud Run Job `jilson-prod-migration-255tj` (concluído com sucesso em 25,4 segundos aplicando as migrations em produção) e atualização do serviço `jilson-prod` para a revisão `jilson-prod-00002-k96`.
        - **Retrato DEPOIS (Neon `rough-meadow-05608403`, branch `production`, registrado pelo operador via SQL Editor):**
          1. Últimas 6 migrations (39 no total): `20261022210000_arquivo_da_aula_em_partes` (23/10 12:28:49 UTC), `20261021220100_admin_com_email_confirmado` (12:28:49 UTC), `20261021220000_senha_da_ficha_uma_vez` (12:28:49 UTC), `20261021180000_boas_vindas_da_ficha` (12:28:49 UTC), `20261021120000_ficha_de_espera_do_visitante` (12:28:49 UTC), seguidas por `20261018170000_sai_o_idioma_da_conta`.
          2. Contagens: `contas = 2`, `cursos = 2`, `assinaturas = 1`, `sessoes = 7` (dados 100% preservados).
          3. Admin: `email = jilson@jilsonsantana.com`, `emailVerified = t` (confirmado automaticamente pela migration `20261021220100`).
          4. RLS: `0` linhas sem RLS (`No result`, mantendo proteção integral em todas as tabelas).
        - **Provas no endereço provisório do Cloud Run (`https://jilson-prod-873389611774.us-east4.run.app` / `https://jilson-prod-igv4d7nfba-uk.a.run.app`):**
          - `GET /api/health`: HTTP 200 `{"status":"ok"}`.
          - Cabeçalho de versão: `x-versao-do-app: mvky237l-d267b74a`.
          - Home (`GET /`): HTTP 200, título `<title>Em breve — Jilson Santana</title>`, `robots: noindex`.
          - Catálogo (`GET /api/courses` e `GET /api/trilhas`): HTTP 200 com dados reais do banco de produção.
          - Aula (`GET /api/lessons/18/aula`): HTTP 200 com estrutura da aula e indicação de arquivo.
          - Trava de arquivo de aula sem sessão (`GET /api/lessons/18/files/1`): HTTP 401 `{"error":"Unauthorized"}`.
          - Trava de assinatura sem sessão (`GET /api/billing/minha-assinatura`): HTTP 401 `{"error":"Unauthorized"}`.
          - Pedido de código por e-mail (`POST /api/conta/codigo`): HTTP 200 `{"ok":true}`.
          - Venda sem login (`GET /api/billing/visitante/planos`): HTTP 404 `{"error":"NaoEncontrado"}` (desligada em produção até ativação deliberada).
          - Medição de tempos de resposta (Cloud Run `us-east4` ↔ Neon `aws-us-east-1`): Home **279 ms**, `/api/trilhas` **28 ms**, `/api/courses` **30 ms**, `/api/billing/minha-assinatura` **68 ms**, `/api/conta/codigo` **203 ms**.
          - Sentry: evento de inicialização `[servidor] no ar, versão mvky237l-d267b74a` registrado no painel do Sentry (`jilson-santana.sentry.io/issues`) 33 minutos após o deploy da revisão.
          - Proteção de autenticação: login de navegador no endereço provisório `*.run.app` recusado com `403 INVALID_ORIGIN` pelo Better Auth conforme especificado no plano (pois `BETTER_AUTH_URL` aponta para o domínio canônico `www`), ficando a validação visual do fluxo de upload/download de aula de ~500 MB no painel do admin para a etapa G4.
        - **Quatro gates locais no branch `bloco-g`:** `npm run typecheck`, `npm run lint`, `npm run test` (80 arquivos/929 testes no cliente e 80 arquivos/1264 testes no servidor com banco local PG17) e `npm run build` (core, client e server) 100% verdes.
- [x] **G4 — O endereço de volta, e tudo funcionando.**
      **O mapeamento** (o Antigravity, com o `gcloud`): provar ao Google que o domínio é da escola (o
      registro TXT que ele pede, na GoDaddy) e mapear o `www.jilsonsantana.com` e o `jilsonsantana.com`
      ao serviço. **A GoDaddy** (o operador, guiado): o `www` deixa de apontar para a Railway e aponta
      para o Google (o CNAME que o mapeamento indicar); o domínio sem "www" troca o encaminhamento da
      GoDaddy pelos registros A e AAAA que o mapeamento indicar; sai o TXT `_railway-verify.www`.
      **NÃO SE TOCAM:** os registros de e-mail — o MX e os outros do e-mail `jilson@` (Microsoft) e os
      do `alunos.jilsonsantana.com` (Resend). Antes de mudar, um retrato de todos os registros (print ou
      lista) para poder voltar. **O HTTPS:** o mapeamento emite e renova sozinho um certificado do
      Google, grátis (`[FATO — context7, 21/10/2026]`: *"A Google-managed certificate for HTTPS
      connections is automatically issued and renewed"*); leva de 15 min a 24 h depois de a GoDaddy
      apontar para o Google. Conferir: `https://www.jilsonsantana.com` abre com o cadeado, e
      `http://` leva ao `https://` — se não levar, **pare e conte** (regra 6), não contorne.
      **A rota de diagnóstico do IP:** `GET /api/diagnostico-ip`, que devolve SÓ os cabeçalhos de
      endereço que chegam ao servidor (`x-forwarded-for`, `x-real-ip` e `forwarded`),
      sem cookie e sem nada mais; publicada, medida (o operador abre de duas redes; um `curl` com um
      `x-forwarded-for` forjado; **e outro com DUAS linhas `X-Forwarded-For` separadas** — revisão de
      segurança da G2: se a frente juntar uma linha do visitante depois da dela, ele escolheria o
      próprio IP), e **apagada numa segunda publicação na mesma etapa**. A G4 só fecha se o último
      item for o IP público do operador em todos os casos e nas duas redes.
      A regra do porteiro do IP é conferida contra a medição antes de a etapa fechar. **A
      medição do IP** em produção (rota temporária de diagnóstico, apagada na mesma etapa, como em
      23/09/2026), a regra conferida e o limite de login provado pelo operador em duas redes. **A
      prova de fora:** a versão nova; catálogo, trilhas, textos comuns e sessão → 200;
      `/api/billing/minha-assinatura` → 401; login com e-mail inexistente → 401; `POST
      /api/conta/codigo` com e-mail inexistente → 200 `{ ok: true }`; `/api/billing/visitante/planos`
      → 404 (a venda sem login segue desligada); o público vê o "Em breve"; o domínio sem "www" leva
      ao `www` com o resto do endereço (fecha a P57). **Com o
      operador:** entrar no admin pelo `/__preview`; uma aula tocando (a chave do token nova); uma
      capa enviada (a senha da pasta nova); um código de acesso chegando (o Resend); o aviso de teste
      da Stripe → 200 (o segredo novo); os avisos que a Stripe não conseguiu entregar com o site fora,
      reenviados pelo painel dela ou acertados pelo "Conferir na Stripe" do admin. O *Estado atual*
      registra o site de volta, e a memória "Conferir publicação" passa a olhar a publicação no
      GitHub Actions.
      **Pronto quando:** o site está como estava em 20/10, mais a publicação de 21/10, na casa nova.
      - **Relatório de execução da G4 (Antigravity no branch `bloco-g`, 23/10/2026):**
        - **Retrato de DNS e preparação na GoDaddy (passo 1):**
          - Capturado retrato prévio completo (23 registros): registros essenciais de e-mail corporativo (Microsoft 365: MX, SPF, CNAMEs e SRVs) e de e-mail de alunos (Resend: CNAMEs `rsend.alunos`, `send.alunos`, DKIM e DMARC) identificados e mantidos estritamente intocados.
          - Desativado o encaminhamento HTTP legado da GoDaddy (`jilsonsantana.com` -> `https://www.jilsonsantana.com`), liberando a edição dos registros A no ápice `@`.
          - Removido o registro TXT legado `_railway-verify.www`.
          - CNAME `www` apontado para `ghs.googlehosted.com.`.
          - Configurados no ápice `@`: 4 registros Anycast IPv4 (`216.239.32.21`, `216.239.34.21`, `216.239.36.21`, `216.239.38.21`) e 4 registros IPv6 (`2001:4860:4802:32::15`, `2001:4860:4802:34::15`, `2001:4860:4802:36::15`, `2001:4860:4802:38::15`), todos conferidos diretamente nos nameservers autoritativos (`ns59.domaincontrol.com`).
        - **Validação de propriedade e mapeamento no Cloud Run (passo 2):**
          - Domínio validado com sucesso no Google Search Console via GoDaddy Domain Connect (`google-site-verification=udBGlkYikbfO4Te-xnyVcitk07g90atwiEMNx9_cLd4`), habilitando o projeto `jilsonsantana` a mapear domínios da zona.
          - Executado `gcloud beta run domain-mappings create` mapeando `www.jilsonsantana.com` e `jilsonsantana.com` para o serviço `jilson-prod` em `us-east4`.
          - Certificados HTTPS gerenciados pelo Google (Google Trust Services `WR3`) emitidos e ativos para ambos os domínios (`Ready: True`, `CertificateProvisioned: True`, `DomainRoutable: True`).
        - **Medição do porteiro de IP em produção (passo 3):**
          - Rota temporária `GET /api/diagnostico-ip` criada (retornando apenas `x-forwarded-for`, `x-real-ip` e `forwarded`), testada com 4 gates verdes e publicada na `main` via GitHub Actions (run `39975573440`).
          - Medição empírica realizada em produção:
            1. Conexão fixa (Mac / Wi-Fi): IPv6 `2804:14d:7238:86be:f4ee:f7fb:d57e:b392` e IPv4 `179.105.131.114`.
            2. Conexão móvel (Celular 4G/5G): IPv6 `2a02:26f7:e52c:5808:0:2000:0:7`.
            3. Teste de segurança com cabeçalho forjado (`X-Forwarded-For: 1.2.3.4`): a borda do Google colocou o valor forjado no início e anexou o IP real no final (`1.2.3.4, 2804:14d:...`).
            4. Teste de segurança com duas linhas separadas (`1.2.3.4` e `5.6.7.8`): Google Frontend anexou o IP real estritamente no último elemento (`1.2.3.4, 5.6.7.8, 2804:14d:...`).
            5. `x-real-ip`: `null` em todas as requisições no Cloud Run.
          - Comprovada a exatidão da função `ipDoPedido` (`server/src/lib/limite-de-tentativas.ts`), que extrai o último elemento de `x-forwarded-for` e valida IPv4/IPv6 ignorando as faixas internas.
          - Rota temporária apagada do código, testes e comentários atualizados e enviada nova publicação definitiva para a `main` via GitHub Actions (run `39986251754`).
        - **Provas externas no domínio definitivo `www.jilsonsantana.com` (passo 4):**
          - Desvio 301 completo: `http://jilsonsantana.com/curso/teste?a=1` redireciona 302 para `https://` e 301 para `https://www.jilsonsantana.com/curso/teste?a=1` preservando rota e query string.
          - Visitante comum acessando `https://www.jilsonsantana.com` recebe HTTP 200 com a página **"Em breve"** (`<title>Em breve — Jilson Santana</title>`).
          - Rotas de catálogo e trilhas (`/api/courses` e `/api/trilhas`) respondendo HTTP 200 com os dados do banco Neon na Virgínia.
          - Gating de segurança: `/api/billing/minha-assinatura` 401; login inexistente 401; venda sem login 404.
          - Login no admin com o cookie de prévia (`/__preview?token=...`) funcionando perfeitamente.
          - Upload de arquivo de aula grande em fatias sequenciais de 30 MB (testado pelo operador com arquivo de ~300 MB) e download completo com integridade preservada.
          - Aula tocando vídeo normalmente com URL assinada do Bunny Stream (`BUNNY_STREAM_LESSONS_TOKEN_KEY`).
          - Envio e gravação de capa de curso no Bunny Storage (`jilsonsantana-storage`).
          - Código de acesso solicitado e entregue na caixa de entrada via Resend (`Production API Key`).
          - Webhook da Stripe: evento `invoice.paid` reenviado manualmente pelo painel Stripe Workbench e respondido com **HTTP 200 OK** (`{ "recebido": true }`) às 20:55:36 BRT de 23/10/2026, comprovando o `STRIPE_WEBHOOK_SECRET` ativo no Secret Manager.
        - **Quatro gates locais no branch `bloco-g`:** `npm run typecheck`, `npm run lint`, `npm run test` (80 arquivos/929 testes no cliente e 80 arquivos/1264 testes no servidor com banco local PG17, total 2.193 testes passando) e `npm run build` 100% verdes.

**Depois do Bloco G** volta a fila de antes: a etapa 4.7, passo 6 (a tela pública de assinar). *A
cópia do banco de 21/10 fica até o backup frio da Fase 7; apagá-la é decisão do operador.*
**Fica de fora** (não é desta mudança): levar o banco para o Google, o balanceador (o gatilho está em
*A forma*), CDN na frente das páginas, proteção contra ataque além do que o Google já traz, e mais de
uma instância.

`Docs check (context7): Cloud Run → /websites/cloud_google_run → o limite de 32 MiB (HTTP/1) e a
resposta em fluxo; o desligamento (SIGTERM, 10 s, os pedidos em andamento terminam); as três formas
de endereço próprio e os limites do mapeamento; a cobrança por pedido. 8 chamadas (a busca do ID e 7
consultas, duas sem resultado) — acima de 2 porque é uma mudança de casa inteira; o resto se confere
na etapa que precisar. Lidas também, direto do Google: a página de limites do Cloud Run e a de preços
de rede.`

---

## Changelog histórico do plano (Jun 2026 → Ago 2026 (6))

*(Texto preservado integralmente. As 3 entradas mais recentes — Ago 2026 (7), (8) e (9) — seguem no
`implementation-plan.md`; quando entrar uma nova lá, a mais antiga desce pra cá.)*

*Atualizado: Jun 2026 — trilhas (LearningPlan/PlanModule/PlanItem) entram na Fase 2; aula vira first-class pesquisável; certificados puxados pro MVP (Fase 6.5); pricing mensal-sem-fidelidade + anual + 2 prices Stripe (Fase 4); comunidade-fórum removida (JilsonAI absorve); EN/Phase 13 removida. Ver JILSONAI.md p/ trilhas curadas vs montagem por IA.*
*Atualizado: Jun 2026 (rev. externa Gemini) — seams de engenharia distribuídos por fase, sem inflar o MVP (0–7): UTM capture (P1), signed URL elástico sem IP-lock (P3), force-sync Stripe + offboarding screen anti roach-motel (P4), certificado público opt-in (P6.5), captura de motivo de cancelamento no launch + "pausar 1 mês" como fast-follow (P7). Auto-ingestão de LessonChunks fica PARQUEADA na Fase 5 (RAG, pós-MVP) — não construir, não puxar pra frente.*
*Atualizado: Jul 2026 — P6.5 ganha o upgrade "certificate-as-media" (OG image server-side, botão
LinkedIn Add-to-Profile, `utm_source=certificate` fechando o loop com a UTM capture da P1).
Racional: playbook big-tech→solo em STRATEGY.md. Escopo pequeno, mesma fase, opt-in/LGPD
inalterados. Nada muda no roadmap de fases.*
*Atualizado: Jun 2026 — **Fase 2 ganhou a página de curso** (mapeada da análise Mosh/Xperiun/Hashtag): campos do Course (subtitle, level, learnTags, requirements mostrados, personas, highlights c/ ícone, thumbnailUrl=lista, introVideoId=detalhe, displayOrder, status) + Module/Lesson (displayOrder, status). **Metodologia 3 Camadas** = selo opcional via `Course.camadas[]` (não-boolean; curso pode ter 1–3 camadas) + textos globais em core/ + `camadaOverride?` (exceção, ex. N8N). Enum UNIVERSAL/MODERNO/IA, ícones stack-2·bolt·sparkles (azul só na IA). Seams pós-launch: introVideoId não-gated (wiring P3), filtro/agrupamento por camada, "pergunte ao JilsonAI" na página de curso (P6), prova social pesada.*
*Atualizado: Jun 2026 — FAQ por curso adicionada como `Course.faq[]` **opcional** (renderiza só se preenchida; JilsonAI é a FAQ viva; preencher por exceção, não obrigatório — evita burnout no catálogo amplo).*
*Atualizado: Jun 2026 — **Fase 4 reescrita: Stripe Plano Padrão + recorrência IN-HOUSE.** Conta MEI/CNPJ, payout Banco do Brasil (substitui C6). NÃO usar Stripe Billing nem Customer Portal — assinatura recorrente construída nos primitivos (Customer/SetupIntent/PaymentMethod/PaymentIntent), agendada via pg-boss; captura de cartão via Payment Element embutido (aluno nunca sai da escola); gestão/cancelamento dentro do site. Custo da decisão = dunning + 3DS/SCA off-session + proration mensal↔anual viram código nosso (por isso é bloco MAX/Ultracode). Confirmar o % do Stripe Billing antes de fechar a economia unitária.*
*Atualizado: Jun 2026 — **Fase 2 Bloco 5 (UI do aluno):** catálogo (`/cursos`, trilhas+cursos, busca embutida via `/api/search`), página de curso (`/curso/:slug` — hero, selo 3-camadas, highlights, learnTags, requirements, personas, accordion módulo→aula, FAQ condicional) e página de trilha (`/trilha/:slug` — árvore módulo→item, botão salvar/clonar). Reconciliação de doc-sync: os checkboxes de schema/campos do Course/Module/Lesson e do `LAYER_CONFIG` global (linhas acima) já estavam implementados desde o Bloco 1 mas ficaram sem marcar — corrigido agora, sem trabalho novo nessas linhas. `QueryClient` global ganhou uma política de retry que não reten­ta em 4xx (achado em teste manual: sem isso, toda página "não encontrado" ficava ~10s em "Carregando…" por causa dos 3 retries padrão do React Query num 404 que nunca teria sucesso).*
*Atualizado: Jun 2026 — reconciliação de doc-sync adicional: os 4 checkboxes de fundação da Fase 2 (modelos Prisma `Course`/`Module`/`Lesson`+RLS, entidades de trilha `LearningPlan`/`PlanModule`/`PlanItem`, `core/schemas/`, rotas CRUD `/api/courses`/`/api/modules`/`/api/lessons`/`/api/trilhas`) estavam implementados desde os Blocos 1/2/3a/3b mas ficaram sem marcar — corrigido agora, sem trabalho novo.*
*Atualizado: Jun 2026 — **Fase 2 Bloco 6a (UI admin de curso/módulo/aula):** `GET /api/admin/courses` + `GET /api/admin/courses/:id` novos (qualquer status, só admin — as leituras públicas só devolvem PUBLISHED). Cliente: `/admin/cursos` (lista, qualquer status), `/admin/cursos/novo` e `/admin/cursos/:id` (form completo — todos os campos do curso + seletor de camadas + `useFieldArray` pra highlights/faq + árvore inline de módulos/aulas com reordenar ↑/↓). Link "Admin" na nav só pra `role===ADMIN`. O item "Admin: build curated trilhas" do checklist abaixo fica pro Bloco 6b. Achado em teste manual (corrigido): módulo/aula novos nasciam todos com `displayOrder:0` (sem incrementar), o que tornava o reordenar ↑/↓ um no-op pra itens recém-criados — `createModule`/`createLesson` agora calculam `max(displayOrder existente)+1`. Confirmado também: mutations de escrita contra o Supabase remoto levam ~4–8s (mesma latência já vista no Bloco 5) — não é regressão, é a infra de dev.*
*Atualizado: Jun 2026 — **Auditoria do Bloco 5** (leitura de código + browser real desktop/mobile, sem erros de console): achados registrados como checklist na nova seção "Estado real da Fase 2 + checklist de continuidade" (logo abaixo do "Done when" da Fase 2) — `SaveTrilhaButton` não reflete trilha já salva entre sessões, aula isolada numa trilha sem contexto de curso, sem tela "Minhas trilhas", selo 3-camadas/highlights sem heading de seção. Nenhum desses itens foi corrigido nesta passada — é só o registro pra continuidade entre chats, por pedido explícito do operador (revisão manual item a item, possivelmente em sessão nova). Backlog de polish (fotos/imagens, direção visual completa do `design.md`, navegação mobile) também registrado, sem dono de bloco ainda.*
*Atualizado: Jul 2026 — **fechamento das 3 lacunas de produção** (auditoria pré-Fase 3/4): (P3) migrations em prod = `npx prisma migrate deploy` como **pre-deploy command** do Railway (nunca no entrypoint, nunca `migrate dev` em prod) — novo 1º checkbox da fase; (P4) **régua de dunning v1** especificada (D0 → retries D+2 e D+5 → corte D+7; acesso mantido na janela via `PAST_DUE`; retry-on-update; `requires_action` → tela logada "Resolver pagamento"; e-mails por tentativa + aviso D+6 + corte com winback) + novo checkbox **alerta de falha** (fila `admin-alerts`: job de billing/webhook/dunning que esgota retries → e-mail admin; force-sync é a recuperação, o alerta é a detecção) + E2E ampliado com retry-on-update e `requires_action`; (P7) upgrade Supabase Free→Pro vira item pré-launch, antes do primeiro aluno pagante. Convenções permanentes correspondentes já no CLAUDE.md (Database & Migrations + Background Jobs).*
*Atualizado: Ago 2026 — **plano de bloco ganha lar + governança de merge alinhada ao CLAUDE.md:** (1) o blockquote de regras do topo passa a exigir que **todo plano de bloco declare, antes de qualquer código**, quatro coisas — a task sliceável, os arquivos que vai tocar, dependências de runtime novas (se houver) e a linha `Docs check (context7): <superfície> → <ID pinado> → <o que foi verificado>` (ou `not triggered` explícito). O CLAUDE.md exigia essa linha mas não havia template de plano no repo pra abrigá-la; em vez de criar um arquivo novo, a exigência mora na regra que já é lida no topo deste plano. (2) Corrigida a contradição de merge: o topo dizia "merge to `main` when green (`main` auto-deploys)", o que conflita com o Working Method do CLAUDE.md — **CI verde é o piso que torna o merge elegível, nunca o gatilho**; o merge `dev → main` é decisão explícita do operador ao fim de uma fase. CLAUDE.md é a fonte única de convenções de engenharia e vence. Pendência sinalizada, não alterada nesta passada: a linha "Merge to `main` only when green" na seção de git mais abaixo repete a formulação antiga — reconciliar quando o operador decidir.*
*Atualizado: Ago 2026 (2) — **varredura fecha a pendência da entrada acima:** `git grep` por "when green" / "sacred" / "auto-deploy" / "merge" em `docs/` + `CLAUDE.md` achou a formulação de gatilho em exatamente dois lugares, ambos na seção "Branching workflow (all phases)". Corrigidos: (1) "Merge to `main` only when green" → **verde é o piso que torna o merge elegível, nunca o gatilho**; o merge `dev → main` é decisão explícita do operador ao fim de uma fase. A parte verdadeira — `main` faz auto-deploy pro Railway, logo é "sacred", só código testado chega lá — foi **preservada**, era só o gatilho que estava errado. (2) "até lá, `dev → main` after local testing" virou "**merge manual que o operador autoriza** after local testing" (mesma forma de gatilho implícito, escala menor). Não alteradas por serem factuais, não regras de merge: `railway.json`/Railway auto-deploy on push (Fase 0), `tech-stack.md` (Railway auto-deploy on push to `main`), CLAUDE.md linhas 51/76/82/96 (já são a fonte correta). Nenhuma outra ocorrência no repo.*
*Atualizado: Ago 2026 (3) — **Fase 4 reescrita de novo: Stripe Payments + STRIPE BILLING** (Payment Element embutido mantido, Customer Portal segue fora). Reverte a decisão de recorrência in-house de Jun 2026: ela empacotava *checkout na nossa página* (requisito de UX) com *quem opera a recorrência* (era in-house pra evitar a taxa) — só a primeira é requisito. Custo verificado: Billing 0,7% do volume + Payments BR 3,99% + R$ 0,50 → ~R$ 5,19/assinante/mês. **Saem da fase:** agendador pg-boss de renovação, régua de dunning D0/D+2/D+5/D+7 como código, `PaymentIntent` off-session, tela "Resolver pagamento" para `requires_action`, cálculo de proração. **Entram/permanecem:** espelho local `Subscription` (`stripeSubscriptionId` agora obrigatório), webhooks de assinatura idempotentes e order-safe, force-sync via `subscriptions.retrieve`, gate de acesso, telas de assinatura/offboarding. A política de dunning continua **decisão nossa** (acesso mantido na janela, `past_due`) — vira configuração de Smart Retries. A fase **continua HIGH RISK**: o Billing removeu a mecânica do dinheiro, não a fronteira de acesso. E2E ampliado com webhook duplicado / fora de ordem / assinatura inválida.*
*Atualizado: Ago 2026 (4) — **auditoria de testes + de stack** (aulas de E2E do curso de referência × este projeto). **Ordem do roadmap mudou em dois pontos, e por um motivo só: gate não é feature.** (1) **Bloco 0 — GATES no topo da Fase 3**, promovido da Fase 7: CI que roda teste de verdade (não existe script `test` na raiz; o `ci.yml` só faz `npm ci` + typecheck + build — e o job se chama "Lint, typecheck & build" **sem step de lint**), `lint` que para de mentir (é alias de `tsc --noEmit`, não há ESLint), e rate-limit de login (com o passo 1 = **verificar** qual header a Railway garante sobrescrever, preservado). Sem CI, qualquer suíte escrita depois vale zero — o operador trabalha em sessões separadas por semanas. (2) **Testes de servidor (~15, supertest) entram DENTRO da Fase 4**, colados ao handler de webhook: 100% do risco catastrófico é servidor e **webhook não tem tela**. Os casos de webhook duplicado / fora de ordem / assinatura inválida **saíram do E2E** e viraram teste de servidor (mais baratos, sem browser); os dois achados P1 da Fase 2 (vazamento de `DRAFT`) passam a ter teste que os fecha — por referência, sem duplicar o diagnóstico. **pg-boss removido do MVP:** o webhook vira **inline** (assinatura → `event.id` → espelho → 200; e-mail Resend na mesma request em `try/catch`), porque a Stripe já reentrega em cima de 5xx — a fila duplicava o fornecedor, e o **alerta** de falha era ele mesmo uma fila, ou seja, a detecção dependia da coisa que deveria detectar. Detecção passa a ser **monitor de erro externo** (tier grátis, tipo Sentry; **fornecedor PENDENTE**), agora checkbox de **pré-requisito do primeiro aluno pagante** na Fase 7. **Gatilho de volta da fila registrado: JilsonAI Fases 4–5** (embeddings da KB; pipeline transcrição→chunk→embedding) — lote, demorado, retentável, e código que ainda não existe. **Playwright fica**: o E2E de hoje só assere redirect do React Router por falta do `globalSetup` com **banco de teste (2º projeto Supabase, trava `_test`)** — corrigido o diagnóstico, alvo 6–8 testes full-stack **depois** dos de servidor; `e2e-test-writer` **ADIADO**. Backlog P2 do reviewer: nº 1 → Fase 4, nº 6 → Fase 3, **restam 4** (numeração original preservada). Nota de manutenção: a entrada anterior ("Fase 4 reescrita de novo") estava sem número apesar de ser a 3ª de Ago 2026 — renumerada para **(3)** nesta passada, sem alterar o texto.*
*Atualizado: Ago 2026 (5) — **fechamento da auditoria: continuidade do operador.** O raciocínio completo (e o que ficou deliberadamente de fora) está no changelog do `CLAUDE.md`, entrada **Ago 2026 (7)** — **não duplicado aqui**. O que mudou neste plano: (1) **Bloco 0 (Fase 3)** ganha `npm audit --audit-level=high` como step **NÃO-BLOQUEANTE**, com a degradação pra conferência mensal já decidida — não entra no "Done when" do bloco. (2) **Fase 3 (vídeo)** ganha o checkbox de **TTL curto da signed URL** (minutos, por requisição, sem cache, sem log) com a razão de negócio registrada: o gate protege a *página*, mas a URL assinada é a *fechadura real* do arquivo no Bunny — URL de vida longa vira link em grupo e a receita vaza **sem nenhum erro aparecer**. **Fica marcado como CONTRADIÇÃO ABERTA** contra a janela elástica ~6–12h (mesma fase, + CLAUDE.md → Video + tech-stack.md → Video): os dois não coexistem sem renovação de token no player, que é decisão de código — resolver **antes** de escrever o player e alinhar os três lugares no mesmo commit. (3) **Fase 7** ganha a seção **"Continuidade do operador (pré-primeiro aluno pagante)"**: 2FA por app (nunca SMS) nos fornecedores + e-mail do admin, códigos de recuperação fora do Mac, senha única por serviço, **restore de teste** contra o 2º projeto Supabase (a *política* de backup continua no checkbox de upgrade Free→Pro, por referência), e LGPD mínimo como pendência de lançamento. Tudo antes do GO-LIVE.*
*Atualizado: Ago 2026 (6) — **CONTRADIÇÃO ABERTA da entrada (5) RESOLVIDA pelo operador: a janela elástica ~6–12h sem IP-lock fica**, e **não** se constrói renovação de token durante a reprodução. O checkbox de "TTL curto" e o bloco de contradição foram **apagados** da Fase 3; a razão da recusa passou a viver **junto do checkbox de signed URL** que já existia (TTL curto cobre link vazando passivamente, não o vetor real — baixar e re-subir — que atravessa qualquer janela; renovação de token é código que falha em silêncio e é depurado por um operador sozinho; a razão de UX original segue válida). `CLAUDE.md` → Video e `tech-stack.md` → Video **não** foram alterados — continuam corretos, e a razão não é duplicada neles. **No lugar entrou:** restrição de **domínio/referrer no Bunny** (`[PENDENTE DE VERIFICAÇÃO]` de existência e nome), que ataca o mesmo risco pelo lado certo — configuração no fornecedor, sem tocar no playback e sem código nosso — mais o registro de que **marca d'água por aluno** é a única defesa contra re-upload e fica para quando houver receita.*
