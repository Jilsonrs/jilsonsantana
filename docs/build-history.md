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
> plano fica o título de cada uma, marcado, com o ponteiro para cá. Quando a fase fechar, o que
> restar dela desce junto, e o bloco abaixo passa a ser a fase inteira.

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
