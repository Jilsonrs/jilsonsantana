# jilsonsantana.com — Implementation Plan

> Phases are ordered by dependency. Each phase is sliced into **session-sized tasks**
> (each checkbox ≈ one focused working block, safe to stop after a commit).
> Rule: never end a session with broken code on `main`. Work on the `dev` branch,
> commit small functional steps to `dev`; merging `dev → main` is the operator's
> explicit decision at the end of a phase — green CI is the floor that makes a merge
> eligible, never the trigger (see CLAUDE.md).
> **HIGH-RISK phases are marked** — give them their own sessions, don't rush.
>
> **Every block plan states, before any code is written:** the sliceable
> task, the files it will touch, new runtime dependencies (if any), and
> `Docs check (context7): <surface> → <pinned ID> → <what was verified>`
> — or `Docs check (context7): not triggered`. See the Context7 block in
> CLAUDE.md for the trigger surfaces.

---

## Estado atual  *(atualizar ao fechar cada bloco)*

> **🟢 NO AR NO GOOGLE CLOUD RUN DESDE 23/10/2026** — `https://www.jilsonsantana.com`, ainda com o
> "Em breve" para o público. A Railway saiu em 21/10 (incidente de segurança dela); o **Bloco G** fez a
> mudança (as chaves trocadas, o banco na Virgínia, o código e a publicação pelo GitHub Actions) e está
> no [`build-history.md`](build-history.md). **Conferido pelo Claude em 24/10/2026**, só lendo: o site
> de fora, a trava da publicação (só a `main` deste repositório), as contas de serviço (só a do site lê
> o cofre), o servidor (ligado e esperando, 1 instância, 2 processadores e 2 GB — hoje, 1 processador e 512 MB, de 1 a 3 cópias) e o banco de produção
> (39 migrations, nenhuma pela metade; nenhuma tabela sem RLS; o admin com o e-mail confirmado).
> **No ar desde 25/10/2026: 1 processador e 1 GB por cópia, de 1 a 3 cópias, no Node.js 24** (`950e63a`,
> revisão `jilson-prod-00029`); antes, com 512 MB (`6b9a5a6`, revisão
> `jilson-prod-00028`) — as tentativas de cobrança e de login contando no banco, os textos relidos a cada
> minuto; teste de carga no ar sem erro (o plano → *Depois do Bloco G*).
> **A atualização das bibliotecas, as 7 etapas, no ar desde 25–26/10/2026** (`f5e8cd1`, revisão
> `jilson-prod-00030`; `fc4a018`, revisão `jilson-prod-00031`; `bcd6bbc` — React 19 e React Router 7 —,
> revisão `jilson-prod-00032`; `bff55eb` — Zod 4 —, revisão `jilson-prod-00033`; `6cddb68` — os ícones no
> Lucide 1 —, revisão `jilson-prod-00034`; `82f0670` — Prisma 7 —, revisão `jilson-prod-00035`, com o job das
> migrations conferido no registro; `7f5976f` — TypeScript 6 —, revisão `jilson-prod-00036`), conferidas de fora: o site, o login (401 com senha errada), os dados do
> curso e a cobrança sem login (401); o alerta do Sentry 11 ligou no ar. O detalhe: `build-history.md` → *A atualização de todas as bibliotecas*; o que ficou para depois: o plano → *Depois do Bloco G*.
> **Publicado em 26/10/2026: `8085d26`** (só documentos — o alerta do Sentry com o servidor parado,
> provado; o orçamento conta depois do crédito; a conta do Google paga; P106), **revisão
> `jilson-prod-00039`**, conferida de fora: o site e a saúde (200), o login com senha errada (401), o
> aviso da Stripe sem assinatura (400 — o segredo no lugar), o job das migrations com sucesso. *(As
> revisões `00037` e `00038` foram do teste do alerta: o plano → *Depois do Bloco G*.)*
> **Publicado em 27/10/2026: `b2ef17c`** (só documentos — o banco no Neon com mínimo 0,5, medido no
> ar; o aviso de gasto do Neon), **revisão `jilson-prod-00040`**, conferida de fora: o site, a saúde e o
> curso (200), o login com senha errada (401), o aviso da Stripe sem assinatura (400), o job das
> migrations com sucesso. **O banco de produção está em 0,5 a 4 desde 27/10/2026** (mudado pelo
> operador no painel do Neon).
> **Publicado em 27/10/2026: `0116461`** (só documentos — a proteção na entrada), **revisão
> `jilson-prod-00041`**, conferida de fora: o site, a saúde e o curso (200), o login com senha errada
> (401), o aviso da Stripe sem assinatura (400), o job das migrations com sucesso.
> **Publicado em 27/10/2026: `4951b03`** (a etapa 4.7, passo 6 — a tela de assinar, de 6a a 6f; ordem do
> operador: *"ficou bom pode publicar depois ajustamos com o Antigravity"*), **revisão
> `jilson-prod-00042`**, conferida de fora: a versão nova do app (`mvr43nr8-51a660b2`; antes,
> `mvpgar4m-f9774573`); o site, a saúde, o curso, as trilhas, os textos comuns e a sessão (200); a
> assinatura sem login (401); o login com um e-mail que não existe (401); o aviso da Stripe sem
> assinatura (400); **a venda sem login segue desligada** (`/api/billing/visitante/planos` → 404); o
> público vê o "Em breve" também na `/assinar` e na `/assinar/concluido`; o job das migrations com
> sucesso, aplicando a `20261027130000_resumo_da_tentativa` (só dados, sem mudar a estrutura).
> **Falta:** o operador abrir a `/assinar` no ar (pelo `/__preview`) — só ele vê a página atrás do
> "Em breve". **Destravado por esta publicação:** o CPF obrigatório no servidor (etapa 4.7, passo 6).
> **Publicado em 27/10/2026, depois: `76f5f43` — A VENDA SEM LOGIN LIGADA, antes da abertura**
> (decisão do operador: `ASSINAR_SEM_LOGIN: "true"` em `deploy/cloud-run.yaml`; o risco aceito por
> ele em `billing.md` → *Assinar sem conta*), **revisão `jilson-prod-00043`**, conferida de fora: a
> chave no serviço (`ASSINAR_SEM_LOGIN=true`, com `COMING_SOON=true`); `/api/billing/visitante/planos`
> → 200, com o mensal e o anual (antes, 404); o público segue no "Em breve", também na `/assinar`; a
> saúde e o curso (200); a assinatura sem login (401); o login com um e-mail que não existe (401); o
> aviso da Stripe sem assinatura (400); o job das migrations com sucesso, sem migration nova. A versão
> do app não mudou (`mvr43nr8-51a660b2`): só a configuração mudou. **Falta: o teste do operador no
> ar**, como visitante, pela prévia.
> **Publicado em 28/10/2026 (UTC; noite de 27/10 no Brasil): `d1d85fa`** — o botão Assinar por último,
> como a Udemy (etapa 4.7, 6h), e o vigia contra a página em branco de antes de uma publicação (Fase 7);
> ordem do operador: "Publica". **Revisão `jilson-prod-00044`**, conferida de fora: a versão nova do
> app (`mvrh8d0t-b7ff4103`; antes, `mvr43nr8-51a660b2`); o vigia é o primeiro script da página do app,
> e o arquivo principal que ela cita responde 200; a venda sem login (200); a saúde e o curso (200); a
> assinatura sem login (401); o login com um e-mail que não existe (401); o aviso da Stripe sem
> assinatura (400); o público no "Em breve", também na `/assinar` e na aula; o job das migrations com
> sucesso, sem migration nova. **O vigia protege as páginas abertas depois desta publicação.**
> **Conferido pelo operador no ar em 28/10/2026:** o botão Assinar por último (6h) apareceu certo.
> **Publicado em 28/10/2026: `c12b0cd`** — a etapa 4.7, passo 7 (os e-mails da cobrança e a rodada
> do agendador), o CPF obrigatório no servidor, a revisão da etapa inteira (o P1 e os P2 corrigidos)
> e a frase do operador no e-mail da falha (P107); ordem do operador: *"pode publicar"*. **Revisão
> `jilson-prod-00045`**, conferida de fora: a versão nova do app (`mvs757nl-7734a2c8`; antes,
> `mvrh8d0t-b7ff4103`); o site e a `/assinar` no "Em breve"; a saúde, os cursos, as trilhas, os
> textos e a sessão (200); a venda sem login (200); a assinatura sem login (401); o login com um
> e-mail que não existe (401); o aviso da Stripe sem assinatura (400); o job das migrations com
> sucesso, aplicando a `20261028120000_emails_da_assinatura` (a tabela `subscription_email`); **no
> banco de produção, só leitura: nenhuma tabela sem RLS** (a nova incluída); o job
> `jilson-prod-avisos` atualizado pela publicação para a mesma imagem, com o comando da rodada;
> **o agendador RETOMADO** (`0 * * * *`, horário de Brasília) e a primeira rodada forçada às 14:19
> UTC — no registro do job: `[avisos] a rodada terminou: 0 conferida(s) na Stripe, 0 ocupada(s), 0
> que a Stripe não conhece, 0 adiada(s), 0 com falha`, com o monitor ligado. **Desde esta
> publicação os e-mails da cobrança saem sozinhos em produção.** O Cloud Scheduler e a conta
> `jilson-agendador` existem desde 28/10/2026 (criados com o OK do operador, 7b).
> **Publicado em 29/10/2026 (UTC; noite de 28/10 no Brasil): `d9dc5e6`** — a etapa 4.9 (Pix pré-pago),
> passos 1 a 4: `a94e888` (1, a fundação), `abf0542` (2a, as rotas do Pix), `cd826da` (2b, a tela: cartão
> ou Pix, o QR, o "QR de novo"), `cf9f455` (P110), `8bcd16e` (P109: a configuração só-Pix da conta de
> verdade em `deploy/cloud-run.yaml`), `fb7ee7f` (3, o pré-pago em Faturamento e no reembolso) e `230264f`
> (4, o e-mail "está acabando"); ordem do operador: *"Publica"*. **Revisão `jilson-prod-00046`**, conferida
> de fora: a versão nova do app (`mvstjfq9-9c3fa01b`; antes, `mvs757nl-7734a2c8`);
> **`/api/billing/visitante/planos` → 200 com `pix: { configuracao }`** (o mensal e o anual); o site e a
> `/assinar` no "Em breve"; a saúde, os cursos, as trilhas, os textos e a sessão (200); a assinatura sem
> login (401); o login com um e-mail que não existe (401); o aviso da Stripe sem assinatura (400); o job
> das migrations com sucesso, aplicando a `20261028200000_pix_pre_pago` e a
> `20261028230000_prepago_terminando` (as duas concluídas na tabela do Prisma, lida só leitura); **no banco
> de produção, só leitura: nenhuma tabela sem RLS**; o job `jilson-prod-avisos` na mesma imagem. **O Pix
> está no ar, atrás do "Em breve"**: a escolha "Como você quer pagar?" aparece na tela de assinar. **Falta: o
> operador ver a tela de assinar pela prévia** (`/__preview`).
>
> **Publicado em 29/10/2026: `09187af`** — o passo 6 da 4.9: `12aee69` (parte 1: **o campo do Pix não abria no
> navegador** — corrigido; a janela do QR em português; o Pix da aba esquecido ao pagar por cartão), `c89058b`
> (parte 2: a pré-paga nasce paga em todo caminho, o valor conferido com o preço), `4fcf5cc` (parte 3: o Pix pago
> sem assinatura vira assinatura na hora, nas quatro portas e no force-sync; a ficha presa à tentativa que pagou;
> o QR só com o mesmo preço), `316bf36` (P113), `73fd108` (P115; P114 registrada na 4.7b), `2e01aa1` e `fd930b3`
> (P108 e P111), `62d3fdd` (parte 4: a segunda revisão de segurança, o servidor) e `70f597d` (parte 5: o site);
> ordem do operador: *"Publicar (já autorizei, depois da revisão)"*. A terceira passada da revisão (só as
> correções) não achou P0 nem P1. **A publicação foi PARADA no meio da montagem da imagem** (nada tinha mudado no
> ar) quando a revisão ampla (4.9b) apontou publicar sem a P112 como P1; **o operador fez a P112** (o endereço de
> avisos da conta de verdade com 8 avisos, incluindo o `payment_intent.succeeded`) e a publicação foi retomada.
> **Revisão `jilson-prod-00047`** (100% do tráfego), conferida de fora: a versão nova do app (`mvu0vw00-1035c50a`;
> antes, `mvstjfq9-9c3fa01b`); `/api/billing/visitante/planos` → 200 com o Pix e os dois planos; a home e a
> `/assinar` no "Em breve"; a saúde, os cursos, as trilhas, os textos e a sessão (200); a assinatura sem login
> (401); o login com um e-mail que não existe (401); o aviso da Stripe sem assinatura (400); o job das migrations
> com sucesso, *"No pending migrations to apply"* (46 migrations); o job `jilson-prod-avisos` na mesma imagem do
> site. **No banco de produção (branch `production`), só leitura: nenhuma tabela sem RLS; nenhum registro do modo
> de teste** em `subscription`, `stripe_customer` e `guest_checkout` (1 assinatura e 1 cliente, os do operador, de
> verdade — a verificação pendente da revisão de segurança ampla). **O campo do Pix passa a abrir no ar** (atrás do
> "Em breve"). **Falta: o operador ver a `/assinar` pela prévia** (`/__preview`).
>
> **Publicado em 30/10/2026 (UTC; noite de 29/10 no Brasil): `f36e274`** — a 4.9b, grupo 1: `959f65e` (E5),
> `1b8ab8f` (E4), `d97ef6a` (E1), `61b98ae` (E3) e `bdcc04b` (E2), mais as correções da revisão de segurança do
> grupo 1 — `f5a5161` (C1 e C2), `e62058a` (C3) e `ee50f08` (C4 e C5); ordem do operador: *"Corrigir, revisar só
> isso, publicar"*. A revisão curta das correções não achou P0 nem P1. **Revisão `jilson-prod-00048`** (100% do
> tráfego), conferida de fora: a versão nova do app (`mvu7ui5z-74d3d2b9`; antes, `mvu0vw00-1035c50a`); as rotas
> novas no ar — `POST /api/billing/conferir` sem login → 401, `/api/billing/visitante/conferir` e
> `/api/billing/campo-nao-abriu` com o corpo vazio → 400 (a validação, sem alerta); `/api/billing/visitante/planos`
> → 200 com o Pix; a home no "Em breve"; os cursos, as trilhas, os textos e a sessão (200); a assinatura sem login
> (401); o job das migrations com sucesso, *"No pending migrations to apply"* (46; nenhuma migration nesta
> publicação); os dois jobs na mesma imagem do site. **A conferência da cobrança na subida não alertou** (as chaves,
> o endereço de avisos com os 8 avisos e a versão da API passaram; nesta versão ela só escreve quando acha problema
> — a linha "a cobrança confere" entra com o R1). **Achado na subida, de antes desta publicação:** a conferência do
> fuso do banco falhou por tempo de conexão, como em 7 das 11 subidas desde 27/10 (P128).
>
> **Publicado em 30/10/2026: `0f8c0c7`** — a 4.9b, grupo 2: `5c204a7` (R1 a R6, a revisão curta das correções),
> `15b6e40` (E8 e E10), `a0f7eea` (E9), `073e80e` (E6), `dd8cd9b` (P128), `e34c0b5` (E7) e `7f7cbba` (os achados da
> revisão do grupo 2, com o inquérito que só alerta); ordem do operador: *"Publicar agora"*, depois da revisão de
> segurança sem P0 nem P1 e da P129 e da P130 (o endereço de avisos com os 11 avisos, na `2026-09-30.endive`, conferido
> pelos prints dele). **Revisão `jilson-prod-00049`** (100% do tráfego), conferida de fora: a versão do app a mesma
> (`mvu7ui5z-74d3d2b9` — o grupo 2 não mexe nas telas); **os cabeçalhos novos na página** (`content-security-policy:
> frame-ancestors 'self'`, `x-frame-options: SAMEORIGIN`, `strict-transport-security: max-age=31536000`); **a trava contra
> outro site** — o pedido `same-site` e o sem `Sec-Fetch-Site` com o `Origin` de outro site, 403 `OutroSite`; o da mesma
> origem passa (400, a validação); os cursos, as trilhas, os textos e a sessão (200); a assinatura sem login (401); a
> vitrine com o Pix; a home no "Em breve"; o job das migrations com sucesso, *"No pending migrations to apply"* (46;
> nenhuma migration); os dois jobs na mesma imagem do site. **Na subida, pela primeira vez, a prova positiva:** *"[stripe]
> subida: a cobrança confere — as chaves no mesmo modo, e o endereço de avisos ligado, com os 11 avisos, na linha da API
> do site (2026-09-30.endive)"*, ANTES do *"Server running"* (a P128: as conferências rodam antes de abrir a porta), e sem
> a falha do fuso do banco. **Conferido no registro do job (30/10/2026):** a rodada das 12h UTC (a primeira com o E6) fez a
> conferência das ativas vencidas — 0 conferidas, 0 com falha — e saiu com código 0.
>
> **Publicado em 30/10/2026: `5313557`** — a 4.9b, grupos 3 e 4: `3e4af1d` e `d2c4a12` (o grupo 3 e os achados da revisão
> dele), `002e5ce` (E15), `b2376a4` (E16 e E18, com a migration `20261030120000_email_de_confirmacao`), `50c508e` (E14),
> `b569ae3` (o que a prova na área restrita achou), `c623002` (os achados da revisão do grupo 4 e a P131) e `37ab510` (a
> prova pela rota); ordem do operador: *"Publicar agora"*, depois das revisões de segurança sem P0 nem P1 aberto e da
> prova pela rota (16 de 16). CI e publicação com sucesso. **Revisão `jilson-prod-00050`** (100% do tráfego), conferida de
> fora: o job das migrations aplicou a `20261030120000_email_de_confirmacao` (*"All migrations have been successfully
> applied"*) e o banco de produção tem o tipo `CONFIRMADA`, com 0 tabelas sem RLS (leitura); a subida com *"a cobrança
> confere — […] os 11 avisos, na linha da API do site (2026-09-30.endive)"* e nenhuma linha de erro; a página, 200; a
> sessão sem login, 401, com a versão nova do app (`mvv00bvk-4af06e93`); `/aluno/pagar-com-pix`, 200; o job da rodada na
> mesma imagem do site. **Nenhum e-mail de confirmação saiu na publicação:** a única assinatura de produção (a de teste do
> operador, de 10/10) é de fora da janela de 2 dias (leitura, antes de publicar).
>
> **Publicado em 30/10/2026: `d4a15b0`** — o conserto da contestação (`f94cfb1`: a marca e o cancelamento sem chave de
> repetição) e o registro da publicação anterior; ordem do operador: *"faz a correção […] publica"*. CI e publicação com
> sucesso. **Revisão `jilson-prod-00051`** (100% do tráfego), conferida de fora: a subida com a cobrança conferida (os 11
> avisos, na `2026-09-30.endive`) e nenhuma linha de erro; o job das migrations, *"No pending migrations to apply"* (47);
> a página, 200; a sessão sem login, 401; o job da rodada na mesma imagem do site.
>
> **PARA CONTINUAR NO PRÓXIMO CHAT (a ordem — atualizado em 30/10/2026, depois da publicação `d4a15b0`):**
> 1. **A revisão ampla da cobrança (a etapa 4.9b): o bloco de engenharia APROVADO (29/10/2026), na ordem do
>    plano** — grupo 1 (E5, E4, E1, E3, E2) **FEITO e publicado (`f36e274`)**, com as correções C1 a C5; **o grupo 2 (E8, E10,
>    E9, E7, E6), os R1 a R6, a P128 e os achados da revisão do grupo 2: FEITOS e publicados (`0f8c0c7`).** **O grupo 3
>    (E11, E12, E13, E17) e o grupo 4 (E14, E15, E16, E18), com os achados das duas revisões e a P131: FEITOS e publicados
>    (`5313557`), e o conserto da contestação (`d4a15b0`).** **O bloco de engenharia da 4.9b está todo no ar.** Fica, da 4.9b, o que é do operador: a P126 (as
>    conferências nos painéis) e a P125 (quando ele for criar um desses códigos). O achado da contestação (E7: a chave de
>    repetição que fazia a reentrega do aviso falhar por até 5 min) foi corrigido por ordem dele (30/10/2026). Uma
>    revisão de segurança por grupo, só do que mudou, antes de publicar. Um commit por parte. **Sem nova rodada de revisão a cada correção** *(operador, 29/10/2026: "fechando
>    P1, P2, P3 e seguindo em frente e rodando os testes no que precisar para não ficar em polimento infinito")*:
>    P0 e P1 travam a publicação; P2 e P3 se fecham com teste e mutação, sem revisar de novo. A P128 (o fuso do
>    banco na subida) foi respondida e feita: as conferências rodam antes de abrir a porta. As decisões P116–P124 e P127 já
>    foram respondidas (registradas na 4.9b, na 4.7b e no `billing.md`); ficam a P126 (as conferências nos painéis,
>    por prints — fazer junto com o operador) e a P125 (só quando ele for criar um desses códigos). O roteiro
>    "quando um aluno não conseguir pagar" está em `billing.md`, como rascunho, para ele revisar.
> 2. **O passo 9 da 4.7 — quem não terminou de assinar, e a tabela de leads** (decisões do operador,
>    29/10/2026): registrar no plano e construir. O e-mail "você não terminou a assinatura" 2 horas depois
>    da última tentativa; aos 7 dias, a ficha e o cliente da Stripe (com o CPF) são apagados; quem marcou
>    "Quero receber novidades" vira LEAD (nome e e-mail, nunca o CPF), e o lembrete dos outros traz o botão
>    "Quero receber novidades" (clicou, vira lead; não clicou, sai em 7 dias); descadastrar; o campo "Seu
>    nome" no formulário de assinar sem conta; tudo na rodada de hora em hora (`jilson-prod-avisos`). A
>    tabela de leads serve depois à captura do YouTube e do LinkedIn. **Todo texto** (o e-mail, o campo, o
>    consentimento, a página de descadastro) vai ao operador para aprovar.
> 3. **P93, um passo por vez, com a confirmação dele:** o 1º e-mail (o código de entrar) foi enviado ao Yahoo
>    em 29/10/2026 e espera a resposta; depois o código da senha nova, as boas-vindas e as telas de entrar e
>    de senha nova.
> 4. **O passo 8 da 4.7** (o teste dele com cartão e Pix reais, R$ 99,90 e o reembolso — a P112 já está feita),
>    com a P102.
> **O que o próximo chat precisa saber:** a suíte do servidor apaga o banco de teste local — perguntar
> UMA vez e usar a resposta exata em `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION`; rodar como o CI
> (`STRIPE_SECRET_KEY= STRIPE_PUBLISHABLE_KEY= STRIPE_WEBHOOK_SECRET= RESEND_API_KEY= STRIPE_PIX_CONFIGURATION=`);
> a mutação por roteiro com cópia de segurança de cada arquivo; o Pix de teste se simula pelo e-mail de
> cobrança (`succeed_immediately@example.com`, `fill_never@example.com` — e desde a P113 o e-mail digitado
> no formulário É o de cobrança); os servidores de dev em segundo plano: `npm run dev:client` da raiz. Os
> arquivos do Pix: `server/src/lib/stripe-pix.ts`, `pix-pre-pago.ts`, `assinaturas.ts` (`processarPixPago`,
> `pixPagoSemEspelho`, `escolherPrePaga`, `pixConsumido`, `cancelarOutrosPix`, `pixDaPrePagaIncompleta`; em
> `stripe-pix.ts`, `listarPixDoCliente`, `assinaturasDoPix` e `marcarEmConferencia`), `checkout.ts` e
> `checkout-do-visitante.ts` (`pixPagoDaConta`, `pixPagoDoEmail`),
> `minha-assinatura.ts` (`prePaga`), `stripe-devolucao.ts` (`periodoDevolvido`), `avisos-da-assinatura.ts`;
> no site, `lib/stripe-do-site.tsx` (`opcoesDoCampo`, `opcoesDoElemento`, `mostrarQrDeNovo`),
> `lib/pedido-de-assinatura.ts`, `lib/pix-pendente.ts`, `lib/assinar.ts` (`useConfirmacaoSemLogin`),
> `components/assinar/EscolhaDaFormaDePagamento.tsx` e `QrDeNovo.tsx`. A spec: `billing.md` → *Formas de pagamento*.
> **Publicado em 24–25/10/2026:** `d6c2906` — o endereço do CDN do Bunny corrigido (P105) e a
> conferência dele no CI; `f09a903` — o download do arquivo da aula em pedaços (o Cloud Run recusava
> acima de 32 MB); `294b106` — o segundo mais novo vence entre aparelhos. Conferidos de fora (o site
> responde 200; a revisão no ar é a da imagem publicada) e **provados no ar pelo operador**: a
> miniatura e a troca de vídeo no editor, a legenda, o arquivo grande e a volta no mesmo segundo entre
> computador e iPhone (o plano → *Depois do Bloco G*).
> **O que ficou aberto:** o plano → *Bloco G* → *Depois do Bloco G*.
>
> **Fases fechadas:** 0 (fundação/deploy) · 1 (auth/shell) · **Bloco G (Google Cloud Run)** — checkboxes completos em
> [`build-history.md`](build-history.md). **Também lá, desde 11/10/2026:** as etapas 4.0 a 4.5 da
> Fase 4 (Stripe), fechadas e publicadas — aqui ficou só o título de cada uma. **Fase 2** (conteúdo/trilhas) segue **aberta**: ver
> "Estado real da Fase 2" abaixo.
>
> **✅ `main` ATUALIZADA (Ago 2026) — a dívida de integração da Fase 2 foi paga.** O merge levou
> `main` de `431e989` (23/jun) para `cc2bde1`: 65 commits, a Fase 2 inteira, a infraestrutura de
> testes e o login fechado. **O público segue vendo a coming-soon** (`COMING_SOON=true`), então
> nada mudou para quem visita; o operador entra via `/__preview?token=`.
> Verificado antes do merge, não presumido: as **4 migrations já estavam aplicadas** em produção e
> as **7 variáveis do Railway cobrem** tudo que o servidor lê em runtime — por isso o merge não
> exigiu janela de manutenção.
> **Cursos de exemplo APAGADOS de produção pelo operador (03/10/2026)**, que passou a cadastrar
> os cursos reais (fecha a P18). O seed continua criando os `exemplo-*` só no banco de teste e no
> de dev.
>
> **🟢 NO AR EM PRODUÇÃO (23/09/2026, `main` = `b38b0f5`) — atrás do portão "Em breve":**
> home pública `/` e `/en` em HTML de servidor, bilíngue, com depoimentos (**4 sorteados por
> visita**) e perguntas frequentes vindos do banco · admin **Site** com 2º nível: **Textos** (uma
> aba por página, texto editável sem deploy), **Depoimentos** e **Perguntas frequentes** · login com
> **limite de tentativas por pessoa** (Better Auth 1.7.5 lendo o IP do `x-real-ip`; provado em
> produção pelo operador em duas redes) · CI verde nos dois jobs (testes e E2E).
> **O público segue vendo a coming-soon** (`COMING_SOON=true`).
>
> **🇧🇷 A ESCOLA É SÓ EM PORTUGUÊS E SÓ PARA O BRASIL** *(decisão do operador, 12/10/2026 — reverte
> a escola bilíngue de 14/09/2026)*. A etapa 4.6c tirou o segundo idioma do site, do banco e dos
> documentos (passos 1 a 6). Travas: `CLAUDE.md` → *Idioma*. O texto continua no dicionário
> (`core/src/i18n/pt.ts`), que é o que o admin edita.
>
> **Infra de banco (atualizado Set 2026 — MIGRADA DO SUPABASE PARA O NEON; e movido de Ohio para a Virgínia em 22/10/2026, etapa G1b) — TRÊS ambientes, um por
> papel, agora com DOIS deles no MESMO projeto:**
> Neon `rough-meadow-05608403` (`jilsonsantana-prod`, **aws-us-east-1** — N. Virginia, **PG18**), branch **`production`**
> (`ep-muddy-hill-b8oromcw`) = **produção**, só o Cloud Run · branch **`dev`**
> (`ep-soft-base-b8waj57h`) = **dev / a escola**, **nunca apagado** ·
> **`localhost:5432/jilsonsantana_test`** (PostgreSQL 17.11 local) = **teste**, apagado a cada
> execução da suíte. Plano **Free**, US$ 0 — o 2º ambiente virou **branch**, não um 2º projeto, e é
> isso que zerou os US$ 10/mês que o Supabase cobraria.
> ✅ **Migração verificada, não presumida:** 11 tabelas / 19 linhas conferidas uma a uma, diff de
> schema completo (colunas, tipos, defaults, constraints, índices, enums, RLS) idêntico, `last_value`
> das 6 sequences preservado, `migrate deploy` no pre-deploy do Railway = *"No pending migrations"*,
> e **login real em produção gravando sessão no Neon enquanto o Supabase permaneceu inalterado**.
> ✅ **A separação de ambientes se manteve na troca:** `server/.env` → branch `dev`, `server/.env.test`
> → Postgres local (a trava de hostname disparou e confirmou `localhost`). As senhas das contas
> semeadas foram **rotacionadas no branch `dev`**, e provado por sign-in que a credencial de dev é
> **rejeitada em produção**.
> ✅ **Supabase APAGADO pelo operador em Set 2026, na mesma sessão da migração.** Ele foi mantido
> intocado e somente-leitura durante toda a troca, serviu de rollback até a validação fechar, e então
> saiu. **Não há mais rollback para o Supabase** — o caminho de recuperação hoje é o PITR do Neon
> (janela do plano Free, curta) mais o `pg_dump` frio, que é o checkbox de backup da Fase 7 e segue
> **em aberto**. Enquanto ele estiver aberto, a rede de segurança do banco é **só** a janela do Free.
>
> **Cobertura de teste — o que EXISTE hoje (medido em 23/09/2026, não estimado):** cliente **20
> arquivos / 143 testes** (Vitest + RTL) ✅ no CI · servidor **10 arquivos / 70 testes**
> (supertest, Postgres local) ✅ no CI — fumaça, login, leituras públicas, home, texto do site,
> depoimentos/FAQ (acesso 401/403 incluído), i18n e a trava do IP · E2E **1 arquivo / 7 testes** ✅
> **no CI, em job próprio**. As três camadas rodam e podem falhar. *(O E2E ficou vermelho de 23/09
> manhã até a correção do mesmo dia: o Playwright conferia o Vite na raiz, que virou home de
> servidor — hoje confere em `/login`.)*
> Não há teste de servidor
> de **negócio** (a matriz de acesso e os casos de webhook são a Fase 4) e não há suíte nenhuma de
> Bunny ou Stripe, porque esse código não existe. Plano de cobertura: **Fase 3 → Bloco T**.
>
> **⚠️ GATILHO DISPARADO (registrado, não resolvido) — `CLAUDE.md` passou de ~85 KB.** A entrada
> (11c) do próprio changelog escreveu: *"se o arquivo passar de ~85 KB com o critério em vigor, o
> problema é ESCOPO, não redação."* Medido em Ago 2026: **já estava em 91,8 KB antes desta sessão**
> e foi a **101,1 KB** depois (+9,3 KB de convenções de teste/XSS/segurança). **Em 23/09/2026:
> 124,9 KB.** O gatilho não pede
> reescrita — pede **decisão do operador sobre escopo**: quais seções ainda passam no critério de
> entrada (*"um agente prestes a escrever código produziria um diff ERRADO sem esta linha?"*).
> **Não tratar como tarefa de redação**, que é exatamente o erro que o gatilho existe para evitar.
>
> **Rate-limit de login: RESOLVIDO em 23/09** (era o "próximo bloqueio" e o bloqueio do go-live).
>
> **Formatação do Antigravity publicada (23/09):** layout padrão (`PageLayout`) em 13 telas do app
> e do admin, revisado antes do merge (duas frases falsas corrigidas, 4 testes atualizados para os
> textos que o operador aprovou). A tela de Textos passou a se chamar **"Textos do Site"**.
> **Ajustes finos em 24/09:** as seções passaram a ser **empilhadas** (`PageSection`: título em
> cima, conteúdo embaixo, no lugar do painel dividido). **É a base de toda tela nova do app** —
> regra no `CLAUDE.md` → Client, em `design.md` §6 e em `.agents/rules/page_layout.md`.
> **Rodapé do app (24/09, publicado):** toda tela depois do login ganhou rodapé, com os mesmos
> textos editáveis do rodapé da home, e o seletor PT | EN (provisório). Ver Bloco S.
> **Próximo, decidido pelo operador em 24/09: o bloco "app do aluno em inglês", ANTES do C4.** Em 5
> etapas (Bloco I). **As 5 etapas feitas e PUBLICADAS em 24/09** (`main` = `81a1ae5`), junto com o
> menu de conta no topo. Antes, no `dev`: o seletor do rodapé
> troca o idioma do app e grava na conta; menu, login, início, minha conta, minhas trilhas,
> catálogo, busca e páginas de curso e trilha existem em inglês; cursos e trilhas têm idioma
> (migration aplicada no dev, produção aplica no próximo publish); campo Idioma no admin; as 3
> camadas editáveis em Textos; o formulário de curso avisa quando salvar falha. **Falta a etapa 5:
> a revisão do inglês pelo operador, antes de publicar.** *(Feita e publicada — ver Bloco I.)*
> **Próximo:** o Antigravity formata o menu de conta (fila item 7); depois, o C4.
>
> **Publicado em 27/09, a pedido do operador:** a **etapa 1 do C4** (o campo de imagem do curso aceita
> `/img/…` e `https://`, e recusa o perigoso), junto com os docs do Bunny (`bunny.md`) e a lista
> única de pendências. O Bunny já está contratado e configurado no painel (Storage, CDN das imagens
> e biblioteca de aulas). **Também publicada em 27/09: a etapa 1 do Bloco U** (a capa enviada pelo
> admin vai para o Bunny Storage). Ela passa a funcionar quando as 4 variáveis do Storage estiverem
> no Railway, e é testada no site no ar, porque não existe Storage de dev (decisão do operador).
> **E a etapa 2 também, em 27/09:** o vídeo de apresentação enviado pelo admin, tocando no
> formulário e na página do curso, com a limpeza automática no Bunny. A migration
> `20260927120000_course_intro_video_pending` entra em produção pelo pre-deploy.
> **Depois, no mesmo dia:** a prévia do admin que se atualiza sozinha quando o Bunny termina, e o
> nome do vídeo no Bunny = o nome do arquivo enviado, decisão do operador.
> **Publicado em 27/09, à noite (`main` = `dbb4c5e`):** o **Bloco A** (o cartão do curso na lista
> do admin, com capa, status em português e a barra de Preenchimento) e o **Bloco B** (limite de
> caracteres com contador nos campos do curso, e a descrição com negrito, itálico e listas, pelo
> `react-markdown`). **Publicado em 28/09 (`main` = `e42b152`):** os documentos do Bloco E.
> **PUBLICADO em 28/09, à noite (`main` = `a042393`, CI verde nos dois jobs): uma biblioteca só, com
> token.** Aulas e apresentação moram na `jilsonsantana-stream`; o vídeo de apresentação sai
> **assinado** para qualquer visitante, e a assinatura vale **24 h para todo vídeo** (decisões do
> operador, `bunny.md` §3.1). Antes de publicar, o operador desligou o multi-audio e criou as 3
> variáveis `BUNNY_STREAM_LESSONS_*` no Railway. **No teste no ar, o envio do vídeo da aula deu
> 401** porque as variáveis misturavam duas bibliotecas (a de apresentação existia; `bunny.md`
> §3.1). Corrigido pelo operador no mesmo dia: tudo na 762605, a biblioteca de apresentação
> apagada, CDN token desligado e DRM Basic ligado. O envio da aula **funcionou e o vídeo tocou**.
> Falta a apresentação enviada de novo (P19). **PUBLICADO em 29/09 (`main` = `cb57273`, CI verde
> nos dois jobs, deploy do Railway ok):** a aula no editor como na Udemy (abre e recolhe, com a
> miniatura, sem player; a criada já nasce aberta; ao voltar, só a pronta fica recolhida) e os
> arquivos para baixar sem limite de tamanho. As migrations `lesson_video_ready` e
> `lesson_file_size_bigint` entraram em produção pelo pre-deploy. O operador criou a zona
> `jilsonsantana-arquivos` e as variáveis (P33) e a `BUNNY_STREAM_LESSONS_CDN_HOST` (P19). Falta
> conferir no ar: a miniatura da aula "Teste", o reenvio da apresentação e um .zip enviado.
> **Conferido pelo operador no mesmo dia:** a miniatura, o nome e a duração aparecem; o .zip chegou
> inteiro (P33 fechada). **Publicado em seguida (`main` = `013bd1c`, CI verde, deploy ok):** o
> envio de vídeo sobrevive à tela. Da P19 falta só o reenvio da apresentação.
> **PUBLICADO em 29/09, à tarde (`main` = `4ecd0f4`, CI verde, deploy ok depois de um incidente
> do próprio Railway que travou as publicações por ~30 min):** a **página da aula do aluno**
> (etapa 4 do Bloco U: a trava de acesso com o espelho `Subscription`, as rotas da aula e do
> download, a tela no estilo LinkedIn, a prévia grátis em que o visitante só assiste, e os
> consertos da revisão de segurança) e **aula e módulo novos nascendo conforme o curso**. A
> migration `20260929160000_subscription` entrou em produção pelo pre-deploy. **RLS conferido em
> produção no mesmo dia** (a pedido do operador, pelo MCP do Neon, só leitura no `pg_class` do
> branch `production`): a `subscription` com RLS, e nenhuma tabela sem ele — a P34 fechou. Falta a
> prova no ar da página da aula.
> **PUBLICADO em 29/09, no fim do dia (`main` = `cbf0129`, CI verde, deploy ok):** o aluno entra no
> curso pela **primeira aula**, com **"Sobre o curso"** embaixo do player em toda aula, e aula e
> módulo novos nascendo conforme o curso.
> **🟢 NO AR DESDE 29/09, no fim da noite (`main` = `7a769c8`, CI verde nos dois jobs, deploy ok) —
> o menu novo e a área do admin, no formato final do dia** (decisões do operador; detalhe no
> Bloco S):
> - **A plataforma é uma só.** O Início é `/inicio`, o mesmo painel para o aluno e para o admin,
>   que testa ali tudo o que o aluno faz; todo mundo cai nele depois de entrar. O painel tem 4
>   blocos: saudação · Continue estudando (EM BREVE) · Minhas trilhas · Atalhos.
> - **Menu:** Início · Cursos · Trilhas · Meus estudos · JilsonAI (EM BREVE). Para o admin, a
>   parte administrativa começa em **Dashboard** (`/dashboard`: 4 relatórios EM BREVE + atalhos;
>   "Dados" virou ele).
> - **Meus estudos** abre em Em andamento (`/aluno/em-andamento`, só o título até a Fase 5); a
>   coluna do nível 2 é o guia (Em andamento · Minhas trilhas · Salvos · Concluídos · Certificados;
>   Salvos entrou em 03/10).
> - As telas do aluno moram em `/aluno/*`; **endereço antigo não redireciona** (a escola está em
>   desenvolvimento).
> - Chegou lá em 3 publicações no mesmo dia (`35fb940`, `f44187e`, `7a769c8`), cada uma com CI
>   verde e deploy ok. Textos novos em PT e EN são **rascunho do agente, para a revisão do
>   operador**; o acabamento visual é do Antigravity (`GEMINI.md`, fila itens 14 e 15).
> **PUBLICADO em 29/09 (`main` = `5271ca6`, CI verde nos dois jobs, deploy ok):** no editor do
> curso, **campo já salvo volta a poder ficar vazio** (subtítulo, descrição, nível, imagem, vídeo
> de apresentação e a camada do módulo); apagar o ID do vídeo apaga o vídeo no Bunny. E a **P19
> fechou**: o vídeo de apresentação reenviado toca. Ver Bloco E.
> **PUBLICADO em 30/09 (`main` = `8aff7eb`, CI verde nos dois jobs, deploy ok):** a **duração do
> curso no topo do editor** ("2h 35min de vídeo", soma de todo vídeo enviado), com a migration
> `lesson_video_duration`, aplicada na produção pelo pre-deploy. Ver Bloco E.
> **PUBLICADO em 30/09 (`main` = `d96589d`, CI verde nos dois jobs, deploy ok):** a duração também
> no **cartão do catálogo** e na **página do curso** ("2 módulos · 4 aulas · 1h 05min"; só aulas
> publicadas; "0min" sem vídeo).
> **PUBLICADO em 30/09 (`main` = `0b6b4d1`, CI verde nos dois jobs, deploy ok):** a duração
> também na **lista de cursos do admin** ("2 módulos · 5 aulas · 1h 05min"). Antes, no mesmo dia,
> o **Antigravity publicou** o acabamento do cartão de curso do admin (`0419a93`), pelo caminho
> do `GEMINI.md` §5.
> **⚠️ CI VERMELHO DE 30/09 (noite) A 01/10 — CONSERTADO E PUBLICADO EM 01/10 (`main` = `dc8aad4`,
> CI verde nos dois jobs, deploy ok)** *(registrado pelo Claude)*: depois do último verde (`7425102`), o Antigravity publicou ~15 vezes na `main` com o
> CI reprovando (até `b74b008`), tentou passar alterando testes, e fez mudanças que **não são só
> visuais**: o seletor de ícones dos Destaques com ~30 ícones (era tarefa do Claude para sábado),
> chaves novas no dicionário ("Recursos" → "Arquivos", "Fechar o menu", "Diferenciais do curso"),
> a contagem de módulos e tempo na página da aula e o nível no cartão do admin. O site seguiu no
> ar (sem aluno real). **O conserto:** os testes alterados foram descartados; a dica voltou a ser
> lida junto com o campo (`Field.tsx`, fora do rótulo); as "//" saíram de dentro do título
> (`PageSection`); os **rótulos e textos novos foram mantidos por decisão do operador** ("quero
> manter esse resultado final na tela"), e os testes passaram a esperar o texto novo, conferindo
> o mesmo comportamento. **Pendente (sábado):** revisar com o operador as mudanças não visuais
> acima e reconciliar o plano e o `GEMINI.md` com elas.
> **PUBLICADO em 03/10/2026 (`main` = `73e5324`, CI verde nos dois jobs, deploy ok, migrations
> `lesson_progress` e `saved_item` aplicadas pelo pre-deploy):** as correções abaixo, o progresso real
> (aula concluída sozinha, barra na aula e no cartão), o vídeo que não recomeça ao trocar de aba
> (a apresentação abre pausada, a aula toca sozinha) e o "Salvos". **Primeiro teste com o player de
> verdade: com o operador** (assistir uma aula até perto do fim e ver a barra andar).
> **PUBLICADO em 20/10/2026 (`main` = `ac64077`, CI verde nos dois jobs, deploy ok; sem
> migration; ordem do operador: "Publica"):** a **etapa 4.7, passos 1 e 2** — o limite de
> tentativas nas rotas de cobrança (dependência nova: `express-rate-limit@8.7.0`), com a frase dele,
> e a trava de assinar que não espera —, o **"Assine" do rodapé da home** sumindo para quem tem
> assinatura ativa (decisão dele, 19/10), a etiqueta EM BREVE simplificada e os documentos
> reconciliados (a lista antiga do fim da Fase 4, as frases velhas). **Provado no site, de fora:** a
> versão nova (`mvgi4xc7-4a18c331`; antes, `mvfpyhz2-a2d42ffc`); catálogo, trilhas, textos comuns e
> sessão → 200; a assinatura, os planos e a troca de cartão sem login → 401 (o limite vem depois do
> login: quem não entrou não gasta cota de ninguém); o login com um e-mail que não existe → 401; o
> público segue no "Em breve". *O limite em si só se vê com login: a prova é a suíte (23 testes de
> servidor e 9 de tela).*
> **NA `main` DESDE 21/10/2026, MAS AINDA NÃO NO AR (`main` = `2820406`, CI verde nos dois jobs;
> ordem do operador: "publica"):** a **etapa 4.7, passos 3, 4 e 5** — o balcão de e-mail (Resend) e
> o modelo do e-mail; a ficha de espera e a conta que nasce no pagamento, com as rotas para assinar
> sem login, **fora do ar no site até o operador ligar `ASSINAR_SEM_LOGIN=true`** (passo 8); o
> código de 6 números no e-mail para entrar ("Receber código de acesso") e para a senha nova
> ("Esqueci minha senha"), a senha logo depois de pagar e o e-mail de boas-vindas. As quatro
> migrations entram pelo pre-deploy: `20261021120000_ficha_de_espera_do_visitante`,
> `20261021180000_boas_vindas_da_ficha`, `20261021220000_senha_da_ficha_uma_vez` e
> `20261021220100_admin_com_email_confirmado`. **A Railway não publicou:** ela está com as
> publicações pausadas desde 21/10, 07:24 UTC (incidente "Railway Platform Outage",
> status.railway.com; o plano Hobby está entre os últimos a voltar), e nenhum deploy de `2820406`
> foi criado. Na pausa do dia anterior, a página dela avisou que o enviado durante a pausa não começa
> sozinho depois. O site segue em `ac64077` (versão `mvgi4xc7-4a18c331`). **Falta:** quando a
> Railway voltar, conferir se o deploy saiu — se não, o operador publica pelo painel (P98) —; provar
> no site, de fora (a versão nova, as rotas de sempre, `POST /api/conta/codigo` → 200 e
> `/api/billing/visitante/planos` → 404, a venda sem login desligada); com a autorização dele, a
> consulta só de leitura no banco de produção (RLS: zero linhas, a `guest_checkout` com RLS; a conta
> de admin com o e-mail confirmado); e a chave do Resend na Railway (P97), sem a qual os códigos não
> chegam no site no ar. **Atualização (21/10, à noite): a Railway não volta mais** (conta apagada — ver o topo).
> Estas quatro migrations entram em produção na primeira publicação no Cloud Run (etapa G3), a prova
> de fora passa para a G4, e a chave do Resend vai para o cofre do Google (G1).
> **PUBLICADO em 19/10/2026 (`main` = `1ee7c0c`, CI verde nos dois jobs, deploy ok; sem
> migration; ordem do operador: "publica"):** o **passo 6 da etapa 4.6c** (os documentos num
> idioma só; saíram o `idiomas.md` e o script da revisão do inglês; a legenda do Bunny só aceita
> `"pt"` no tipo), o conserto do `auth:generate` (o `jiti` 2 na raiz), **a logomarca da home no
> rodapé do app** e **o "Assine" do menu da home some para quem tem assinatura ativa** (decisão
> do operador, 19/10/2026; o "Assine" do rodapé da home ficou como estava, sem decisão).
> *Depois, no mesmo dia, ele decidiu que o do rodapé também some para quem tem assinatura ativa
> (`billing.md` → *Sincronizar e perder o acesso*): publicado em 20/10/2026 (`main` = `ac64077`).*
> **Provado no site, de fora:** a versão nova (`mvfpyhz2-a2d42ffc`; antes, `mvea5i2y-3a00b6df`);
> catálogo, trilhas, textos comuns e sessão → 200; a assinatura sem login → 401; o login com um
> e-mail que não existe → 401; a imagem da logomarca → 200; o público segue no "Em breve".
> **PUBLICADO em 18/10/2026, por último (`main` = `d61962c`, CI verde nos dois jobs, deploy ok
> às 20:40; a migration `20261018170000_sai_o_idioma_da_conta` aplicada pelo pre-deploy — a
> publicação só termina com sucesso se ela passar; mesma ordem do operador):** o **passo 5b da
> etapa 4.6c** — a conta perdeu a coluna `preferredLanguage`, a última de idioma do banco.
> **Provado no site, de fora:** catálogo, trilhas, textos comuns e sessão → 200; a assinatura sem
> login → 401; o login com um e-mail que não existe → 401 (a leitura de conta funciona sem a
> coluna); o público segue no "Em breve". A versão do app não mudou (`mvea5i2y-3a00b6df`): o 5b
> não toca no site.
> **PUBLICADO em 18/10/2026 (`main` = `80c4478`, CI verde nos dois jobs, deploy ok às 20:32;
> sem migration; ordem do operador: "sim pode publicar em duas etapas"):** o **passo 5a da etapa
> 4.6c** — o login deixou de usar a preferência de idioma da conta; a coluna ficou no banco para
> o 5b. **Provado no site, de fora:** a versão nova (`mvea5i2y-3a00b6df`; antes,
> `mvars26z-d04be514`); catálogo, trilhas, textos comuns e sessão → 200; a assinatura sem login →
> 401; o login com um e-mail que não existe → 401 (antes e depois — sem erro de servidor); o
> público segue no "Em breve". *O site responde em `www.jilsonsantana.com`; o endereço sem `www`
> devolve 404 e não é o da Railway.* **Para saber quando uma publicação só de servidor terminou:**
> a Railway registra cada uma no GitHub (`gh api repos/{owner}/{repo}/deployments`, e os
> `statuses` de cada uma: `success` ou `failure`).
> **PUBLICADO em 12/10/2026, por último (`main` = `011f53a`, CI verde nos dois jobs, deploy ok; a
> migration `20261012190000_sai_o_idioma` aplicada pelo pre-deploy; publicado pelo Antigravity,
> por ordem do operador, depois de ele conferir no banco do site que não havia curso, trilha nem
> legenda em inglês):** o **passo 4 da etapa 4.6c** — o banco perdeu a coluna de idioma das seis
> tabelas, o tipo `Language` e as linhas em inglês de perguntas, depoimentos e textos.
> **Provado no site, de fora, pelo Claude Code:** o catálogo responde com o curso cadastrado, e
> sem o campo de idioma; trilhas e busca → 200; o endereço antigo dos textos comuns deixou de
> responder, e o novo responde; a assinatura sem login → 401; o público segue no "Em breve".
> **A versão do app NÃO mudou (`mv5hrmdi-a7421ae7`), e é o esperado:** o passo 4 não tocou em
> nenhum arquivo do site nem do `core`, e a montagem do site foi reaproveitada. *Para a próxima
> publicação só de servidor: a versão do app não serve de prova; confira uma rota que mudou.*
> **PUBLICADO em 12/10/2026, depois (`main` = `7b506b6`, CI verde nos dois jobs, deploy ok; a
> migration `20261012170000_idioma_com_valor_padrao` aplicada pelo pre-deploy; ordem do operador:
> "publica o passo 3 e inicia o passo 4"):** o **passo 3 da etapa 4.6c** — o servidor não filtra
> mais lista por idioma nem aceita idioma em pedido; saíram o dicionário em inglês e a rota de
> trocar o idioma da conta. **Provado no site, de fora:** a versão nova (`mv5hrmdi-a7421ae7`); o
> endereço novo dos textos comuns (`/api/site-text/common`) → 200, e o antigo ainda responde; o
> catálogo pedido com `?lang=en` → 200; o público segue no "Em breve".
> **PUBLICADO em 12/10/2026 (`main` = `d469ae7`, CI verde nos dois jobs, deploy ok; sem migration;
> publicação autorizada pelo operador: "publica" e, à pergunta sobre a 4.6b ir junto, "Publicar
> tudo"):** a **etapa 4.6b** (a cobrança atrasada dá as aulas por 3 dias, não mais sem prazo) e os
> **passos 1 e 2 da etapa 4.6c** — a escola só em português: saíram o seletor PT | EN (home e
> rodapé do app), a página `/en`, o idioma do login, e no admin o campo Idioma do curso, a
> etiqueta EN, as abas de idioma de Perguntas e Depoimentos e a coluna de inglês de Textos.
> **Provado no site, de fora:** a versão nova (`mv5gnft3-0d225eb6`; antes, `mv4kyc92-2fb78ccb`);
> `/`, `/en` e a tela de assinar, para o público, seguem no "Em breve"; a assinatura sem login →
> 401.
> **PUBLICADO em 10/10/2026, por último (`main` = `8d9a364`, CI verde nos dois jobs, deploy ok;
> sem migration; publicação autorizada pelo operador):** a Fase 4, etapa 4.5 — **o revisor
> automático (ESLint).** `npm run lint` é o quarto gate, bloqueante no CI: reprova a tarefa
> disparada e não esperada no servidor e o `any` no projeto inteiro. **Nada muda para o aluno:**
> são ferramentas de desenvolvimento e duas linhas reescritas no servidor.
> **Provado no site, de fora:** a versão nova (`mv34iygo-45588dc9`), e as respostas de sempre.
> **A TROCA DE SERVIDOR NÃO DERRUBOU O SITE** `[MEDIDO nesta publicação, 10/10/2026]`: 480
> pedidos a `/api/health`, um a cada ~1,7 s, de antes do envio até 12 minutos depois da troca —
> **480 respostas 200, nenhuma falha**; a versão mudou uma vez só, 1 min 19 s depois do envio.
> *O que esta medição NÃO cobre:* publicação com migration, e um pedido longo (um envio de vídeo)
> atravessando a troca.
> **PUBLICADO em 10/10/2026, antes (`main` = `354c96a`, CI verde nos dois jobs, deploy ok;
> duas migrations de DADO aplicadas pelo pre-deploy, sem mudança de estrutura; publicação
> autorizada pelo operador):** **o alerta de erro no servidor** (Sentry, parte 1 — plano → Fase 7)
> e **a resposta de "Is there a refund?" com 14 dias** ("Yes, we offer a 14-day money-back
> guarantee."). O operador já tinha posto a variável `SENTRY_DSN` na Railway, com uma chave nova,
> e criado no Sentry o monitor de site fora do ar ("Site online", verde).
> **Provado no site, de fora:** a versão nova (`mv32ckxr-d02f9f62`); o endereço malformado que
> chega ao servidor (`/api/lessons/%C3%28`) → 400 `EnderecoInvalido` (antes da publicação, 500);
> conferir assinatura sem login → 401; o corpo malformado → 400 `CorpoInvalido`; o aviso sem
> assinatura → 400; as páginas públicas seguem no "Em breve".
> **Confirmado pelo operador no painel do Sentry (10/10/2026):** o aviso "[servidor] no ar, versão
> mv32ckxr-d02f9f62" chegou — o alerta está ligado em produção — e o e-mail de teste da regra
> de alerta chegou na caixa dele. No mesmo dia ele criou a regra "Erro novo no servidor"
> (e-mail a cada erro novo), e o teste dela chegou: a P63 fechou. **A resposta nova na página em inglês:** o
> operador mandou a foto da página com "Yes, we offer a 14-day money-back guarantee." — do
> site no ar, confirmou ele. A publicação ficou conferida por completo.
> **PUBLICADO em 10/10/2026, antes (`main` = `91cb4dc`, CI verde nos dois jobs, deploy ok;
> sem migration; publicação autorizada pelo operador: "Publica a 4.4"):** a Fase 4, etapa 4.4 —
> **sincronizar e perder o acesso.**
> **Admin → Assinaturas** (o e-mail do aluno e "Conferir na Stripe": a recuperação de quando um
> aviso da Stripe se perde) · quem pagou e ficou trancado é liberado ao clicar em Assinar de novo ·
> quem perde o acesso sai da conta · **"Reativar assinatura"** no lugar de "Assinar" para quem já
> foi assinante · o download dos arquivos da aula atrás de login + assinatura · um tratador de
> erro próprio no fim da API. **Sem migration.** Revisão de segurança feita: nenhum bloqueio.
> **O painel de assinaturas** (lista, filtros e ações — o mapa aprovado por ele no mesmo dia)
> **NÃO está nesta publicação:** é a etapa 4.7b, depois da 4.7.
> **Provado no site, de fora:** a versão nova (`mv2vto41-b161cf53`); conferir assinatura sem
> login → 401 (antes da publicação, 404: a rota não existia); o corpo malformado → 400
> `CorpoInvalido` (antes, a página de erro padrão); o download de arquivo sem login → 401; o
> aviso sem assinatura → 400; a página inicial, a tela de assinar e o endereço do admin, para o
> público, seguem no "Em breve".
> **PUBLICADO em 10/10/2026, antes (`main` = `efb231f`, CI verde nos dois jobs, deploy ok; a
> migration `cliente_da_stripe` aplicada pelo pre-deploy):** a Fase 4, etapas 4.2 e 4.3 —
> **assinar com a conta logada, com a Stripe DE VERDADE no site** (decisão do operador no mesmo
> dia: a produção usa as chaves de verdade; o computador, a área restrita). A tela
> `/aluno/assinar` (mensal ou anual, código promocional, o campo de pagamento da Stripe), a de
> depois do pagamento, o botão Assinar na aula trancada e os botões da home para quem está
> logado. **Para o visitante nada muda** (continua o "Em breve"), e ninguém além do operador
> consegue assinar: o cadastro é fechado, e a tela do visitante é a etapa 4.7.
> **Provado no site, de fora:** a versão nova (`mv2p7nvt-a7885b6b`); o aviso sem assinatura → 400
> (o segredo lido); as quatro rotas `/api/billing/*` → 401 sem login, com `private, no-store`; a
> página inicial e a tela de assinar, para o público, seguem no "Em breve".
> *Antes, no computador do operador (área restrita):* ele assinou como `member@` com o cartão de
> teste e com o código de 100%.
> **A PRIMEIRA ASSINATURA DE VERDADE (10/10/2026):** o operador assinou no site, como `member@`,
> com um código de 100% (nada cobrado). No banco de produção: ativa, de verdade, paga até
> 10/11/2026. **O `member@` de produção agora tem acesso de assinante** — ele testa a escola como
> aluno no site no ar. Zero tabela em `public` sem RLS (conferido em produção no mesmo dia).
> **PUBLICADO em 09/10/2026, por último (`main` = `6b09789`, CI verde nos dois jobs, deploy ok; as
> migrations `avisos_da_stripe` e `assinatura_de_teste_ou_real` aplicadas pelo pre-deploy):** a
> Fase 4, etapa 4.1 — **o aviso da Stripe (webhook) e o espelho da assinatura.** Nada muda para quem
> visita: sem as chaves da Stripe no Railway, todo aviso é recusado. **Provado no site:** a versão
> nova (`mv163qiw-f7d8cbce`); `POST /api/stripe/webhook` → 503 `NaoConfigurado`;
> `/api/progresso/trilhas` sem login → 401; a checagem do player passa.
> **PUBLICADO em 09/10/2026, antes (`main` = `307581c`, CI verde nos dois jobs, deploy ok):** o
> Bloco MEDIR, etapas 2 e 3 — **horas assistidas e alunos reais no cartão do curso do admin** e **a
> barra da trilha** (Minhas trilhas e Início), com a trilha sabendo quando está concluída. **Provado
> no site:** a versão nova (`mv0thvrg-dbb213a7`); `/api/admin/stats/cursos` e
> `/api/progresso/trilhas` respondem 401 sem login; a checagem do player passa. *A prova com o vídeo
> de verdade é do operador: entrar com a conta de aluno, assistir uma aula de prévia grátis (a conta
> de aluno de produção não tem assinatura, decisão dele de 27/09) e ver as horas no cartão do admin.*
> **PUBLICADO em 09/10/2026, antes (`main` = `a236c0c`, CI verde nos dois jobs, deploy ok; a
> migration `eventos_do_video` aplicada pelo pre-deploy):** o Bloco MEDIR, etapa 1 — **os eventos do
> vídeo guardados** (tocou, pausou, terminou; só do aluno; teto por pessoa) — e as decisões do
> operador de 09/10 (P27, P39, P43). **Provado no site:** a versão nova (`mv0sesh1-8e53964f`) — o
> deploy só sobe depois do pre-deploy, então a tabela existe —; guardar evento sem login → 401; a
> checagem do player passa. *A prova com o vídeo de verdade vem com a etapa 2: as horas no cartão.*
> **PUBLICADO em 09/10/2026, antes (`main` = `aea39eb`, CI verde nos dois jobs, deploy ok):** só
> documentação — o Bloco AULA fechado com o retorno do operador, o guia do Antigravity com o player
> novo (`GEMINI.md`, item 32) e a entrada (20) do `CLAUDE.md`. **Provado no site:** a versão nova
> (`mv0qkr43-4cc217c2`) e a checagem do player passando contra o site no ar. A checagem agendada já
> rodou sozinha em 08/10 e passou (o GitHub a soltou com horas de atraso — normal em agendamento).
> **PUBLICADO em 07/10/2026, antes (`main` = `c241002`, CI verde nos dois jobs, deploy ok):** o
> Bloco AULA, etapas 6c e 6d — **o player NOVO do Bunny** (`player.mediadelivery.net`), com os
> botões no idioma do app e a legenda decidida pela conta (`captions=<idioma>` ou `off`), o script
> da legenda do player novo já colado no Bunny pelo operador (P53), e **a checagem diária** do
> script. **Provado no site:** a versão nova (`muy9y8ea-68f7f36e`); a API entrega o endereço do
> player novo; `npm run checar:player` passa contra o site no ar; a checagem rodada uma vez pelo
> próprio GitHub passa, e o registro público dela mostra só "✓" (nenhum endereço). *O teste com o
> vídeo real é do operador: a aula de ponta a ponta (abrir no ponto, 90%, próxima aula), a legenda
> (ligar → a próxima abre ligada → sair e voltar; desligar → continua desligada), os botões em
> português, no Chrome do computador e no iPhone.* **Feito pelo operador em 09/10/2026: "Está tudo
> funcionando."**
> **PUBLICADO em 07/10/2026, antes (`main` = `2203e69`, CI verde nos dois jobs, deploy ok; a
> migration `preferencia_do_aluno` aplicada pelo pre-deploy):** o Bloco AULA, etapa 6 — a legenda
> lembrada pelo CC do player, como no LinkedIn —, com o script já colado no Bunny pelo operador
> (P52) e a janela da escola isolada (`Cross-Origin-Opener-Policy`). **Provado no site:** a versão
> nova (`muy035j7-f3b5e71d`); `/api/me/preferences` responde 401 sem login; o cabeçalho
> `cross-origin-opener-policy: same-origin-allow-popups` nas respostas; a entrada do curso segue
> levando à aula 14. *O teste com o vídeo real é do operador: ligar o CC numa aula e ver a próxima
> abrir com ela; desligar e ver a próxima abrir sem; o player tocando normalmente.*
> **PUBLICADO em 07/10/2026, depois (`main` = `bd3d895`, CI verde nos dois jobs, deploy ok):** o
> conserto do ponto do vídeo — o servidor aceita o segundo com casas decimais que o player manda, e
> recarregar, outro aparelho e voltar outro dia abrem no mesmo segundo (defeito do agente, achado no
> teste do operador). **Provado no site:** a versão nova (`muxxrnij-22d64293`). *A prova com o vídeo
> real é o novo teste do operador (itens 4 e 6).*
> **PUBLICADO em 07/10/2026 (`main` = `f247200`, CI verde nos dois jobs, deploy ok):** o Bloco
> AULA, etapas 3 e 4 — trocar de aula sem a tela piscar (topo e lista ficam), a moldura nova do
> player (o Voltar certo), a gaveta do celular que fecha, o "Próxima aula" na aula de texto, e o
> piso de aparelhos (iOS 15 em diante, com o reforço do texto das aulas). A P51 está resolvida
> (Resumable desligado no painel). **Provado no site:** a versão nova (`muxuuxt0-37d01787`) no
> cabeçalho e no `versao.txt`; a entrada do curso no ar leva à aula 14; curso inexistente → 404;
> gravar o ponto sem login → 401; o pacote anterior → 404. **Falta só a etapa 5: o roteiro nos
> aparelhos, com o operador.**
> **PUBLICADO em 06/10/2026, à noite (`main` = `778bbee`, CI verde nos dois jobs, deploy ok; a
> migration `ponto_da_aula` aplicada pelo pre-deploy):** o Bloco AULA, etapas 1 e 2 — entrar no
> curso onde parou, o vídeo voltando sempre tocando, o ponto na conta (também ao fechar a aba).
> **Provado no site:** a versão nova (`muxf3a8v-c0cdae17`) no cabeçalho e no `versao.txt`; a
> entrada do curso no ar (`google-antigravity-agentes-ia`) leva o visitante à aula 14, a primeira
> publicada, sem cache; curso inexistente → 404; gravar o ponto sem login → 401; arquivo antigo →
> 404. *O vídeo de verdade (o ponto, tocar sozinho, o fim) é o teste do operador, etapa 5, depois
> da P51.*
> **✅ Bloco AULA (a tela onde o aluno estuda) — FECHADO em 09/10/2026**, pedido do operador em
> 06/10/2026: entrar no curso onde parou, no mesmo segundo e tocando (o ponto na conta, também ao
> fechar a aba), a próxima aula sozinha no fim do vídeo, o "Próxima aula" no texto, trocar de aula
> sem a tela piscar, o piso de aparelhos (iOS 15 em diante), **o player novo do Bunny** com os botões
> no idioma do app e **a legenda lembrada na conta**, mais a checagem diária do script da legenda.
> Confirmado no ar pelo operador ("Está tudo funcionando"). Detalhe: Fase 5 → **Bloco AULA**.
> **PUBLICADO em 06/10/2026, no fechamento (`main` = `e12530d`, CI verde nos dois jobs, deploy
> ok):** o conserto da troca de aula — sair de uma aula de vídeo não derruba mais a próxima na tela
> de erro. **Provado no site:** a versão nova (`mux313p8-c56d5a94`). *A passagem automática com o
> vídeo real do Bunny fica para o teste do operador* (o teste automático cobre o player.js, não o
> vídeo do Bunny).
> **PUBLICADO em 06/10/2026 (`main` = `84d55d5`, CI verde nos dois jobs, deploy ok;
> a migration `comunicacao_notificacoes` aplicada pelo pre-deploy):** a Comunicação (C1 — menu,
> Notificações e Mensagens automáticas), "Notificações" em Meus estudos com a lista e a mensagem
> completa, e a mensagem do curso com o texto atual do admin (P46). **Provado no site:** a versão
> nova (`mux2k0zg-923a6b7c`); `/api/notificacoes` e `/api/admin/announcements` respondem 401 sem
> login.
> **PUBLICADO em 06/10/2026 (`main` = `40ae6f8`, CI verde nos dois jobs, deploy ok):**
> a prévia do sino volta a mostrar só as 2 primeiras linhas e a data, como na Udemy (o clique abre
> a mensagem completa em "Ver todas"). **Provado no site:** a versão nova (`muwymfgl-553ac24d`) no
> cabeçalho e no `versao.txt`.
> **PUBLICADO em 06/10/2026 (`main` = `04ef820`, CI verde nos dois jobs, deploy ok):**
> a duração ao lado de cada aula e o "% concluído" no topo da aula, o endereço inexistente levando
> ao Início (P44), e o player renovando sozinho o endereço vencido (aula aberta há mais de 24 h).
> **Provado no site:** a versão nova (`muwr1cyr-f4243b2b`) no cabeçalho e no `versao.txt`; arquivo
> antigo → 404.
> **PUBLICADO em 06/10/2026, no fechamento (`main` = `33fe367`, CI verde nos dois jobs, deploy
> ok):** a última varredura da área logada — gravações do aluno que tentam de novo, falha do login
> ao abrir sem expulsar ninguém, a moldura do app com tela de erro, e o ponto do vídeo por aula e
> vídeo. **Provado no site:** a versão nova (`muwhzedy-3d6c240e`) no cabeçalho e no `versao.txt`;
> arquivo antigo → 404. Abertos para o operador: P44 e o player aberto há mais de 24 h.
> **PUBLICADO em 06/10/2026 (`main` = `0ba6d76`, CI verde nos dois jobs, deploy ok):** atualizar o
> site sem atrapalhar quem está estudando, na área logada inteira — a versão nova entra no próximo
> clique, os pedaços do aluno e do admin baixados com antecedência, o envio de vídeo nunca cortado,
> o teste-guarda dos `import()`, e o servidor antigo terminando os pedidos antes de sair. **Provado
> no site:** `X-Versao-Do-App` nas respostas da API, igual ao `versao.txt` publicado; arquivo antigo
> → 404. *Não conferido no site:* o `no-cache` da página do app, que fica atrás da página "Em
> breve" (só com o acesso de prévia do operador); a página "Em breve" sai com `max-age=0`.
> **PUBLICADO em 05/10/2026, no fechamento (`main` = `ecc9025`, CI verde nos dois jobs, deploy
> ok):** o fim da tela em branco depois de publicar (provado no site: arquivo antigo e inexistente
> → 404; tela do aluno → app), a tela de erro, a aula de texto vazia, e o CC e o certificado no
> "Este curso inclui". Antes, `main` = `388225f`: o `courses.md` §10.11.
> **PUBLICADO em 05/10/2026 (`main` = `592d588`, CI verde nos dois jobs, deploy ok):**
> a correção do Salvar no passo Publicar com a Ordem editada.
> **PUBLICADO em 05/10/2026, à noite (`main` = `ce94db8`, CI verde nos dois jobs, deploy ok):** o
> ✓ dos passos Legendas e Mensagens, e o gerador de esquema do Better Auth oficial (`auth`, na
> versão do site). *(O CI da `main` ficou ~10 min na fila por lentidão do GitHub Actions; o
> deploy já tinha saído, e o conteúdo era idêntico ao do `dev`, que tinha passado nos dois jobs.)*
> **PUBLICADO em 05/10/2026, no fim do dia (`main` = `f956f6c`, CI verde nos dois jobs, deploy
> ok):** o fim do vídeo abre a próxima aula e quem volta abre onde parou; os testes de servidor
> num servidor em `127.0.0.1` (fim das falhas intermitentes); `npm run test:changed`; e o cache
> das bibliotecas no CI. *(A `main` não usa o cache criado no `dev` — regra do GitHub —, então a
> primeira execução dela instalou e guardou; as seguintes, e as do `dev`, já o usam.)*
> **PUBLICADO em 05/10/2026, antes (`main` = `789e9eb`, CI verde, deploy ok):** as linhas
> calculadas do "Este curso inclui".
> **PUBLICADO em 05/10/2026, depois (`main` = `93ed6a6`, CI verde nos dois jobs, deploy ok):** o
> ícone dos Destaques escolhido por busca entre todos os do Lucide (feito em outro chat; o pacote
> principal não cresceu, medido) e o `courses.md` reescrito pelo operador.
> **PUBLICADO em 05/10/2026 (`main` = `59176c0`, CI verde nos dois jobs, deploy ok, migrations
> `notificacoes` e `notificacao_titulo_do_curso` aplicadas pelo pre-deploy):** o passo Mensagens,
> o sino de Notificações (boas-vindas e parabéns do curso, lista e página Ver todas) e o botão
> **Visualizar** no topo do editor. `/api/notificacoes` e `/api/admin/courses/:id/pagina`
> respondem 401 sem login no ar.
> **PUBLICADO em 04/10/2026 (`main` = `643dd08`, CI verde nos dois jobs, deploy ok,
> migration `course_materiais` aplicada pelo pre-deploy):** o quadro "Este curso inclui" — os
> materiais marcados no passo Publicar, o quadro na página do curso e no "Sobre o curso" da aula.
> **PUBLICADO em 04/10/2026, depois (`main` = `45e33b8`, CI verde, deploy ok):** a limpeza do cache
> da legenda trocada (falta a chave da conta no Railway — P40).
> **PUBLICADO em 04/10/2026 (`main` = `4cbebf3`, CI verde, deploy ok, migration `caption` aplicada
> pelo pre-deploy):** a tela **Legendas** do editor (aula e apresentação, com reenvio na troca de
> vídeo). Antes, em 03/10 (`8ad1037`): o Salvar no topo do editor, com mensagem de confirmação.
> **Primeiro envio real de legenda ao Bunny: com o operador.**
> **Revisão de 03/10 (plano aprovado pelo operador), em 5 etapas:** **(1) página da aula** — a
> duração soma só aula de vídeo, como na página do curso (com teste de servidor); a contagem
> "módulos · aulas · tempo" ganhou teste; "Nosso método." saiu da tela para o dicionário (o
> inglês é rascunho, P38); e o menu do curso, **fechado, continua fechado** nas próximas aulas
> (decisão do operador, 03/10), guardado no navegador de cada pessoa em vez do endereço.
> **(2) editor e admin** — o seletor de ícones dos Destaques (feito pelo Antigravity) ficou, com
> **nome em português** em cada ícone (decisão do operador, 03/10; rascunho na P38), teclado e
> leitor de tela; as caixas das Camadas mostram o nome que o aluno vê, em português e com as
> edições de Admin → Textos; o nível no cartão do admin fica em português mesmo com o app em
> inglês. Tudo com teste.
> **(3) progresso: banco e servidor**, **(4) progresso na tela da aula** e **(5) barra no cartão do
> curso** — ver Fase 5. **A revisão do trabalho do Antigravity está fechada.**
> **`dev` = `main` em código (30/09):** tudo o que foi construído está no ar. O operador passa a
> trabalhar com o Antigravity no acabamento (fila em `design-lab/GEMINI.md`, itens 11 a 16).
> **Registrado no fim da sessão de 29/09 (só documentos, no `dev`):** o mapa do que falta nos 7
> passos do editor (Bloco E, depois da etapa 4), com um **achado novo** (campo já salvo não volta a
> ficar vazio); o **Live Stream** do Bunny em acesso antecipado (`bunny.md` §6, decisão 8,
> avaliar depois da Fase 3); e a fila do parceiro de design (`design-lab/GEMINI.md`, itens 11–14).
> **PUBLICADO em 28/09 (`main` = `5a60fa1`, CI verde): o Bloco E, etapa 2 INTEIRA (partes 2a a 2e)**,
> mais a edição como na Udemy e a limpeza no Bunny ao excluir. *(A primeira publicação do dia,
> `d342000`, pegou CI vermelho por um teste do arrastar que dependia de tempo — não do site; o
> teste foi corrigido e republicado na mesma hora.)* O texto abaixo descreve o que entrou — a
> ordem do curso numa gravação só, o "+" entre itens e a aula de texto, arrastar (dnd-kit), o
> **vídeo de cada aula** (Bloco U etapa 3, alto risco) e os **arquivos para baixar** (o envio).
> Quatro migrations novas (`lesson_kind_content`, `lesson_video`, `lesson_file`, e a
> `level_todos_os_niveis` já publicada), todas aplicadas no dev; produção aplica no publish. Para
> testar no ar: a P19 (vídeo das aulas) e a P33 (zona dos arquivos), em `pendencias.md`.
> **Publicado em 28/09 (`main` = `4bd36da`): o Bloco E, etapa 1 INTEIRA (partes 1a a 1e)** — o editor
> do curso em 7 passos no nível 2, o passo Publicar com o que falta e o link, as três listas com um
> campo por item, "Todos os níveis" (com a migration `20260928120000_level_todos_os_niveis`, já
> aplicada no dev; produção aplica no próximo publish) e as dicas embaixo dos campos.
> **Revisão do operador pendente** (ele pediu para implementar tudo e ajustar depois): os textos
> novos das partes 1b e 1c e as dicas (`client/src/lib/course-hints.ts`). O Visualizar e a
> duração publicada no topo ficaram para depois, com motivo (ver Bloco E).
> **Decidido em 27–28/09, ainda não construído:** o **Bloco E** (o editor do curso em 7 passos, a
> partir dos prints da Udemy e de 5 plataformas pesquisadas), o conteúdo de cada seção planejada
> do admin (e a nova **Comunicação**) e as páginas públicas que faltam. *(A mudança das telas do
> aluno para `/aluno/*`, que também estava aqui, foi feita em 29/09.)* Tudo no corpo deste plano.
>
> **PRÓXIMO PASSO: implementação, e QUAL BLOCO é decisão do operador.** Candidatos, com o que cada
> um precisa:
> - ~~**Bloco U, etapa 3**~~ — **publicada em 28/09**; prova no ar fechada em 29/09 (a P19).
> - ~~**Bloco E, etapa 1**~~ — **feita em 28/09**, no `dev` (ver acima).
> - ~~**Telas do aluno para `/aluno/*`**~~ — **publicada em 29/09**, com o menu novo (ver acima).
> - **O que falta nos 7 passos do editor do curso** (Bloco E, o mapa depois da etapa 4) — o
>   próximo assunto do operador, em 29/09.
> - **C4, etapa 3** (a home lendo os cursos do banco) — depende da P17 e do cadastro dos cursos
>   (P16; a P18 fechou em 03/10: os cursos de exemplo foram apagados de produção).
> Fora da escolha e em paralelo: o **Bloco I** restante, o **C5** (bloqueado até o conteúdo das
> telas), o corpo da Fase 3 (HIGH RISK) e a continuidade do operador (2FA, backup frio).
>
> **Cobertura de teste medida em 29/09/2026:** cliente **41 arquivos / 453 testes** · servidor
> **27 arquivos / 310 testes** · E2E em job próprio. As três rodam no CI.
> **Pendências do operador: a lista única está em [`docs/pendencias.md`](pendencias.md)** *(desde
> 25/09/2026, a pedido do operador)*. As que moravam aqui foram para lá (P12–P16). Item resolvido
> sai daquela lista no mesmo commit em que a resposta é registrada no destino.

---

## O PLANO DE LANÇAMENTO — a escola no ar *(decisões do operador, 28/10/2026)*

> **A meta do operador (28/10/2026):** a escola no ar em 1 mês. **O que entra no dia da abertura**
> (decisões dele no mesmo dia, uma pergunta por vez): **o JilsonAI** (Fase 6 — o agente recomendou logo
> depois), **o Pix recorrente** (4.9), **os certificados** (6.5 — o agente recomendou logo depois),
> **as trilhas** (a tela de montar no admin, Bloco 6b, e a Trilha 1) e **a página Quem somos**
> (simples, com o texto e a foto dele). **Depois da abertura:** o painel de assinaturas (4.7b), os E2E
> da cobrança (4.10) e a vitrine fora do React (C5).
> **O risco, dito sem rodeio:** com o JilsonAI na abertura, o mês fica apertado — é o maior bloco e o
> mais incerto (vem logo depois do Pix — a ordem do operador, abaixo). *Proposta do agente, a
> confirmar pelo operador: um ponto de checagem em 11/11/2026 — se o JilsonAI não estiver respondendo
> no chat do aluno, ele decide se a abertura espera ou se o JilsonAI entra logo depois (a linha do
> cartão muda em Admin → Textos).*

**A ordem — aprovada pelo operador em 28/10/2026, com UMA mudança dele:** *"O PIX vai ser logo após o
cartão para fechar 100% a parte de assinatura e pagamento"* — o Pix antes do JilsonAI (o agente tinha
proposto o JilsonAI primeiro). O ponto de checagem de 11/11 segue como proposta. O código é do agente;
o que é do operador corre em paralelo:

| # | Bloco | De quem | Depende de |
|---|---|---|---|
| 1 | **Pix recorrente** (4.9) — alto risco: fecha a assinatura e o pagamento por inteiro | agente | — |
| 2 | **JilsonAI**: as decisões de produto (`jilsonai.md`), depois as Fases 0–3 (o chat com o contexto do curso, a escalação para o Jilson, o medidor de uso) | agente + operador (decisões, persona) | — |
| 3 | **Trilhas**: a tela de montar no admin (Bloco 6b) | agente | — |
| 4 | **Certificados** (6.5): ao concluir o curso e a trilha | agente | 3 |
| 5 | **A home lendo os cursos do banco** (C4) | agente | os cursos cadastrados (P16) |
| 6 | **As páginas**: Termos (com a cláusula da P61), Privacidade, Contato, Quem somos — e o caminho de excluir a conta (LGPD) | agente (páginas) + operador (textos) | os textos dele |
| 7 | **A cópia do banco fora do Neon**, com teste de restauração (Cloud Storage + o agendador que já existe) | agente, com o OK do operador para o recurso | — |
| 8 | **O aviso de erro nas telas do aluno** (Sentry, parte 2) | agente | — |
| 9 | **Indexação**: robots.txt, noindex na área do aluno, sitemap.xml — e o `og:image` da home, hoje 404 (achado de 27/10, se o operador aprovar) | agente | — |
| 10 | **Fechamento**: a revisão de segurança final, a proteção na entrada revista, onde os e-mails caem (Gmail e Outlook de outra pessoa, mail-tester), o teste com cartão de verdade e tirar o "Em breve" | agente + operador | tudo acima |

**Do operador, em paralelo (sem esperar o código):** a 6g com o Antigravity · cadastrar os 5 cursos
(P16) e montar a Trilha 1 · revisar a FAQ (P12) e os textos do código no e-mail (P93) · os textos das
páginas (Termos, Privacidade, Contato, Quem somos) e a foto · a persona do JilsonAI.

---

## Bloco G — A casa nova: Google Cloud Run  ✅ CONCLUÍDO em 23/10/2026
> **Movido para o [`build-history.md`](build-history.md) → *Infraestrutura* em 24/10/2026**, inteiro: os
> fatos do Google, *A forma* (a conta mínima e as decisões do operador), as regras de *Quem executa*,
> as etapas G1, G1b, G2, G3 e G4 com os relatórios e as conferências. O mapa do Google Cloud (o que
> usar, quando e quanto custa) continua no `tech-stack.md` → *Google Cloud*.

### Depois do Bloco G — o que ficou aberto *(23–24/10/2026)*
- [x] **O Bunny no ar** *(24/10/2026)* — o operador viu a miniatura do vídeo sumir no passo Conteúdo
      do editor de aulas (P105). **Causa:** na G2 o `BUNNY_STREAM_LESSONS_CDN_HOST` do
      `deploy/cloud-run.yaml` foi reescrito à mão com um endereço que o Bunny não conhece
      (`vz-0925232d-209`); o certo, lido na API da conta, é `vz-6996efe9-374.b-cdn.net`. Na Railway o
      valor morava só no painel e sumiu com a conta. Medido: miniatura de um vídeo pronto, 200 no
      endereço certo e 403 no errado. O resto do Bunny conferido na conta e certo (a biblioteca, as
      duas zonas de arquivos, `img.jilsonsantana.com`, os domínios permitidos, as chaves da G1).
      **Contra a volta** *(decisão do operador)*: `deploy/conferir-bunny.sh`, primeiro passo do CI,
      pergunta ao Bunny se o endereço existe e aceita o site — mutação: endereço errado, site fora dos
      domínios permitidos e linha apagada, os três reprovam.
- [x] **Os dois e-mails do Sentry** (P105) — eram UM erro (`NODE-EXPRESS-5`, `[bunny-stream] limpar
      cache recusado: 404`, 23/10 18:26), mesma causa do item acima: o Bunny recusa limpar o cache de
      um endereço que não é dele. Dois e-mails porque duas regras de alerta dispararam (a nossa, "Erro
      novo no servidor", e a padrão do Sentry, "high priority"); desligar a padrão é escolha do operador.
      *Prova no ar depois do "publica":* a miniatura aparece, e salvar uma legenda não alerta.
- [x] **A prova do Bunny no ar** *(24/10/2026, pedido do operador: "o coração da escola")* — de fora,
      sem gravar nada: os 15 vídeos do banco existem no Bunny, prontos, as 14 aulas com legenda; as 4
      chaves aceitas; capas e arquivo da aula 18 no Bunny; o vídeo de apresentação assinado toca pelo
      site e é recusado sem origem e com token trocado; aula paga sem vídeo para visitante; download e
      rotas de admin sem login, 401. Os envios, pelo operador no admin: vídeo, legenda (trocada),
      arquivo em 4 partes — todos 200. A troca de vídeo apagou o antigo no Bunny, e apagar a aula de
      teste tirou de lá o vídeo e as 4 partes do arquivo (conferido na API do Bunny, 25/10/2026).
- [x] **O download de arquivo grande no ar** *(achado na prova acima)* — 500 *"Response size was too
      large"*: com `Content-Length`, o Cloud Run segura a resposta e recusa acima de 32 MB. Agora vai em
      pedaços (`chunked`, o que a doc do Google pede); o navegador mostra os MB, sem a porcentagem
      *(decisão do operador)*. Teste: `vaiEmPedacos` nos três downloads; mutação (o tamanho de volta)
      reprova os três. **Provado no ar pelo operador em 25/10/2026** (publicação `f09a903`): o arquivo
      de 4 partes (uma aula compactada) baixou inteiro e, descompactado, tocou normalmente.
      **Não era defeito:** o "continuar de onde parou" foi para outra aula porque a aula "Teste" estava
      em **rascunho** — a entrada do curso só considera aulas publicadas (`onde-parou.ts`); o segundo
      foi gravado (87 s).
- [x] **A volta no mesmo segundo entre aparelhos** *(25/10/2026 — achado do operador na prova do Bunny;
      plano aprovado por ele, com o item 4)*. **Causa, medida no registro do servidor:** (a) a aba
      que já tinha a aula aberta antes reabria no segundo da **memória dela** e, ao abrir, gravava
      esse segundo velho por cima do mais novo de outro aparelho (iPhone voltou em 1:45 com o
      servidor em 1:41); (b) no iPhone, a pausa às vezes não chega ao servidor (o computador abriu
      em 1:35, o último ponto gravado). Não veio da mudança para o Google. **O que mudou:** a aula
      abre no ponto do servidor, buscado na hora e depois da gravação pendente deste aparelho
      (`isFetchedAfterMount`, `gravacaoPendente`); a aba parada na aula pula para o ponto de outro
      aparelho se o vídeo estiver pausado (`irParaSePausado`, player.js); a gravação a cada 5 s
      (era 15). O relógio de renovação do endereço saiu do `BunnyPlayer` para
      `useRenovarNoVencimento` (o componente chegava a 200 linhas; sem mudar o que faz).
      **Mutação** (6): abrir pela memória, não esperar a gravação, nunca perceber outro aparelho, o
      player não repassar o pulo, pular tocando, voltar aos 15 s — todas reprovam.
      **Provado no ar pelo operador em 25/10/2026** (publicação `294b106`): iPhone parado em 0:31 →
      o computador abriu em 0:31; o computador em 0:51 → o iPhone abriu em 0:51; e entre navegadores
      do computador. *A primeira tentativa no iPhone rodou a versão ANTIGA* (a aba do Safari aberta
      desde antes da publicação: a versão nova só entra na próxima troca de tela) e gravou o segundo
      velho dela — não é defeito da correção. *A aba parada que pula* também provada no ar pelo
      operador no mesmo dia (a aula pausada no computador pulou para o segundo do iPhone).
- [x] **No iPhone, a pausa às vezes não chega ao servidor** — no teste de 25/10/2026, a pausa em 0:31
      chegou (o computador abriu nela). *Gatilho de reabertura: um aparelho voltar a abrir alguns
      segundos antes do ponto em que parou — aí, investigar o aviso `pause` do player.js no iPhone
      (doc do Stream). Enquanto isso, a gravação a cada 5 s limita a perda a 5 s.*
- [x] **O alerta do Sentry com o servidor parado** *(provado no ar em 26/10/2026, com o OK do
      operador)* — o erro `[stripe] aviso recusado: STRIPE_WEBHOOK_SECRET não configurado`, provocado
      tirando por 4 minutos o segredo do aviso da Stripe (revisão `jilson-prod-00037`; devolvido na
      `00038`, a mesma imagem — o aviso sem assinatura voltou a dar 400), com o monitor "Site online"
      pausado e um pedido só. **O Sentry recebeu o erro no mesmo segundo (15:47:25) e disparou o
      e-mail às 15:47:51**, antes do pedido seguinte (um robô, às 15:48:16): o envio não espera outro
      pedido, mesmo com o processador cobrado só nos pedidos (`--cpu-throttling`). O `Sentry.flush` no
      caminho de erro e o `--no-cpu-throttling` ficam sem uso. *Gatilho de reabertura: um alerta que só
      chegue depois do pedido seguinte (no Sentry, o "Received" bem depois do "Occurred").*
- [x] **O alerta de orçamento conta o gasto antes ou depois do crédito?** *(26/10/2026, pelo painel —
      a API de faturamento continua desligada)* — **depois**: o padrão do Google desconta os créditos, e
      o painel mostra "R$ 0,00 / R$ 100,00 — inclui uma economia de −R$ 13,88". O alarme falso que se
      temia (o gasto antes do crédito passar dos R$ 100) não acontece; em troca, durante o crédito ele
      não avisa nada. **Fica como está** *(decisão do operador)*. Registro e gatilho: `tech-stack.md` →
      *Google Cloud*, linha *Orçamento e alertas*.
- [x] **A conta do Google passa a paga** *(26/10/2026, achado ao conferir o orçamento; decisão do
      operador)* — era de teste gratuito, e no fim do teste o Google interrompe todos os recursos: o site
      sairia do ar em 20/01/2027. O operador fez o upgrade pelo painel; a Visão geral diz "Conta paga", sem
      aviso pendente, e o crédito que sobrou segue valendo até 20/01/2027. O assistente "Get
      production-ready" que o Google abre em seguida **não foi usado** (cria projetos e permissões novos).
      O site seguiu no ar durante tudo (conferido de fora: 200). Registro: `tech-stack.md` → *Google
      Cloud*.
- [x] **O banco no Neon: mínimo 0,5** *(27/10/2026, decisão do operador)* — o mesmo teste de carga com o
      mínimo em 1, 0,25 e 0,5 (o operador trocou no painel), 5.950 pedidos por rodada, nenhum erro: um
      aluno de cada vez, 22, 27 e 26 ms dentro do servidor; com muita gente, quem limita é o servidor do
      site. Custo do mínimo 0,5: ~US$ 4/mês hoje, ~US$ 25 com alunos. Ligado também o **aviso de gasto
      do Neon em US$ 20** (subir na abertura). Tabela, custos e gatilhos: `tech-stack.md` → *Banco
      (Neon)*.
- [x] **A memória e o tempo de resposta** *(medidos em 25/10/2026)* — decidem a volta da P104. Nas 46 h
      antes do teste: memória no pico de 160 a 220 MB (8 a 11% dos 2 GB), processador até 7%. No teste
      de tamanhos (512 MB a 8 GB): a escola usa 140 a 215 MB em qualquer tamanho, e a memória não muda
      o tempo de resposta; 1 processador deixa a rajada de 100 pedidos 0,5 s mais lenta. **Para a
      P104: 512 MB bastam** (o pico usa ~30–40%); a escolha final é do operador. Tabela e gatilhos:
      `tech-stack.md` → *O teste de tamanhos*.
- **O servidor pronto para até 3 cópias, no tamanho de depois do crédito** *(plano aprovado pelo
  operador em 25/10/2026: 1 processador e 512 MB, de 1 a 3 cópias; o Neon com teto de 4 unidades,
  ajustado por ele no painel)*. Com mais de uma cópia, o que mora na memória de cada uma deixa de valer
  para as outras — as travas da cobrança já são do banco (`pg_advisory_xact_lock`).
  - [x] **O limite de tentativas conta no banco** (cobrança, assinar sem login, código por e-mail e os
        clientes novos do dia): `lib/loja-de-tentativas.ts`, tabela `limite_de_tentativa` (migration
        `20261025140000`, com RLS), uma instrução atômica por pedido. Testes: duas cópias somam a mesma
        contagem, 20 pedidos simultâneos de duas cópias dão 20, a janela zera, limites não se misturam.
        Mutação (cada cópia conta sozinha · a janela nunca zera · desfazer negativo): reprovam. O
        "máximo de 3 assinaturas sem login ao mesmo tempo" fica por cópia, de propósito (protege as
        ligações com o banco, que são de cada cópia).
  - [x] **As tentativas de login contam no banco** — pelo `rateLimit.customStorage` do Better Auth 1.7.5
        (`consumirTentativaDeLogin`, `lib/loja-de-tentativas.ts`): UMA instrução por pedido, na mesma
        tabela do limite de tentativas, com o nome `login|`. *A primeira forma* (`storage: "database"`,
        tabela `rateLimit` própria, migration `20261025150000`) *saiu na revisão de segurança*: fazia de
        2 a 6 consultas, com transação, a cada pedido a `/api/auth/*`, no caixa de ligações da sessão —
        a tabela some na migration `20261025160000` (nunca teve uso em produção). Teste: barrado, a
        contagem está no banco; apagada, a pessoa volta a tentar; o teto e o "tente em N s". Mutação
        (login nunca barra): reprova.
  - [x] **A revisão de segurança** (agente `security-vulnerability-reviewer`, 25/10/2026) — 0 P0, 3 P1,
        5 P2, todos tratados: (P1) a chave vai CIFRADA (HMAC com o segredo do servidor) — um `\u0000`
        no e-mail virava 500 e esgotava os alertas, e o e-mail ficava em claro no banco; o cliente novo
        do visitante conta pela transação de quem segura a trava (`contarClienteNovo(req, tx)`); o login
        de uma instrução (acima). (P2) quem já passou do teto do endereço é recusado ANTES dos limites
        por e-mail, sem gravar linha (`enderecoJaBarrado`); linhas vencidas saem depois de 1 hora;
        `passOnStoreError: false` escrito, com teste (a contagem que falha recusa com 500); cada limite
        com nome fixo e único, sem o teto. Testes novos e mutação (chave em claro · cliente fora da
        transação · contagem que falha deixa passar · sem a checagem do endereço · login nunca barra):
        todas reprovam. *Fica de fora, com o motivo:* filtrar as rotas de `/api/auth` antes do Better
        Auth — com a contagem de uma instrução, um caminho inventado custa o mesmo que qualquer rota
        pública; proteção contra enxurrada é do Cloud Armor (mapa, `tech-stack.md`).
  - [x] **Os textos do site relidos a cada 1 minuto** em cada cópia (`VALIDADE_DO_CACHE_DE_TEXTO`,
        `lib/dict.ts`): a cópia que recebe a edição limpa o cache na hora; as outras, em até 1 minuto.
        Teste: a edição de "outra cópia" (gravada direto no banco) não aparece antes de 1 minuto e
        aparece depois. Mutação (cache sem validade): reprova.
  - [x] **A publicação com 1 processador, 512 MB e de 1 a 3 cópias** (`deploy.yml`, com
        `--concurrency=160` escrito) — **publicada em 25/10/2026** (`6b9a5a6`, revisão `jilson-prod-00028`).
        Conferido no ar: as 3 migrations do dia aplicadas, `limite_de_tentativa` com RLS, a `rateLimit`
        fora, nenhuma tabela sem RLS; o login barrou na 4ª tentativa de fora (401, 401, 401, 429), com a
        contagem no banco de produção e a chave cifrada. **Teste de carga nesta configuração** (Sentry
        ligado): nenhum erro; o Google ligou as 3 cópias no primeiro minuto; processador a 93% no pico,
        memória 179 MB de 512; ~190 pedidos por segundo com as 3 ligadas (mediana 0,5 a 0,7 s); rajada
        de 1.000 em 3,7 s (pior 6,4 s). **Para 1.000 alunos ao mesmo tempo, esta configuração fica no
        limite** — gatilho: com uns 500 alunos ao mesmo tempo, subir o máximo para 5 cópias. Custos:
        `tech-stack.md` → *O teste de carga*. A P104 saiu da lista, decidida.
- [x] **1 GB por cópia** *(decisão do operador, 25/10/2026: "deixa default 1G e 1 processador na cópia
      sempre ligada e nas cópias reservas")* — `deploy.yml` com `--memory=1Gi`; **publicado em 25/10/2026**
      (`950e63a`, revisão `jilson-prod-00029`), conferido de fora. ~US$ 3/mês a mais na cópia sempre ligada. *O operador pensava numa principal maior e
      reservas menores: o Cloud Run não permite — todas as cópias têm o mesmo tamanho (registrado no
      `tech-stack.md`).*
- [x] **O Node.js 24 no contêiner e no CI** *(pedido do operador, 25/10/2026 — o 20 saiu de suporte em
      abril de 2026)*: `Dockerfile` (as 4 etapas), `ci.yml` (os 2 jobs e a chave do cache), a checagem do
      player, `@types/node` 24 e `engines` a partir do 22. CI verde no Node v24.21.0; **publicado em
      25/10/2026** (`950e63a` — a imagem montada de `node:24-alpine`), e no ar: o site, o login (401 com
      senha errada) e os dados do curso respondem. O computador do operador também no 24.22.1.
- [x] **O lembrete de atualizar o stack** *(pedido do operador, 25/10/2026: "me lembrar todo janeiro ou a
      cada 6 meses")* — o GitHub abre um aviso por e-mail em 1º de janeiro e 1º de julho, com o Node e as
      bibliotecas atrasadas (`lembrete-do-stack.yml`, `scripts/lembrete-do-stack.mjs`); a rotina mora no
      `tech-stack.md` → *Atualizações*, e o `CLAUDE.md` manda lê-la antes de mexer em versão. Conferido
      rodando o roteiro: Node 24 em dia; 18 bibliotecas com versão grande nova (nenhuma urgente).
- [x] **A atualização de todas as bibliotecas** *(pedido do operador, 25/10/2026; as 7 etapas no ar em 25 e
  26/10/2026 — o detalhe de cada uma está no [`build-history.md`](build-history.md) → *A atualização de todas as
  bibliotecas*)*: **Etapa 1 — as 22 pequenas** · **Etapa 2 — ferramentas de teste e o servidor sem tela:** · **Etapa 3 — React 19** · **Etapa 4 — Zod 4** · **Etapa 5 — o visual: Tailwind 4, `tailwind-merge` 3 e os ícones (`lucide-react` 1)** · **Etapa 6 — Prisma 7** · **Etapa 7 — TypeScript 6.0.**.
  - **Ficou para depois, cada um com o motivo** *(decisão do operador, 26/10/2026: "em janeiro analisamos se vale
    a pena ou não; o que não valer a pena troco quando acabar o suporte, assim mantenho a compatibilidade com
    aparelhos antigos por mais tempo")* — a regra e a lista moram em `tech-stack.md` → *Atualizações*, que o
    lembrete de janeiro puxa: **Tailwind 4** (exige aparelhos mais novos que o piso do site) · **Prisma 8**
    (em teste, e o login ainda não aceita) · **TypeScript 7** (o revisor automático ainda não aceita) ·
    **`@hookform/resolvers` 6** (trava a instalação do npm; só muda uma peça que não usamos).
- [x] **"O Google Cloud explicado"** *(pedido do operador, 24/10/2026: "é a primeira vez que utilizo
      […] preciso saber o essencial para entender como funciona e testar configurações maiores e
      menores e analisar o que fez diferença ou não")*: o que foi montado e por quê, e um teste de
      tamanhos do servidor medindo o tempo de resposta — sempre dentro da conta mínima, e voltando ao
      tamanho decidido no fim. **Feito em 25/10/2026:** `tech-stack.md` → *O que foi montado, em
      linguagem simples* e *O teste de tamanhos* (11 configurações, de volta a 2 processadores e 2 GB
      no fim — revisão `jilson-prod-00020`).
- [x] **O teste de carga — 100, 500 e 1.000 alunos, com os custos** *(pedido do operador, 25/10/2026)*:
      7 configurações (tamanhos com 1 cópia; 3 e 10 cópias), rajadas de até 1.000 pedidos e fluxo de
      200 por segundo — nenhum erro. **Diagnóstico:** uma cópia aguenta de ~70 a ~115 pedidos por
      segundo, qualquer que seja o tamanho; **100 alunos = 1 cópia de 1 processador e 512 MB; 500 = 2
      cópias; 1.000 = 3 cópias** de 2 processadores e 2 GB. Antes de mais de uma cópia, os contadores
      em memória vão para o banco. O maior custo com muitos alunos é o **vídeo** (Bunny, ~US$ 0,02 a
      0,045 por hora assistida). Achado: o projeto tem teto de 20 processadores por região. Tabelas e
      custos: `tech-stack.md` → *O teste de carga*. Servidor de volta a 2 processadores, 2 GB e 1 cópia
      (revisão `jilson-prod-00027`), Sentry religado.
- [x] **A conta padrão do Google (`…-compute@developer`) tem papel de editor no projeto inteiro** —
      nada a usa (o site e o Job usam `jilson-site`; a publicação, `jilson-publicacao`): tirar o papel
      (P106). *(26/10/2026, com o OK do operador.)* Conferido antes: nada roda com ela e não há chave dela.
      O papel saiu (`remove-iam-policy-binding`); a conta segue existindo, sem papel nenhum — desfazer é um
      comando. Conferido de fora depois: o site, o login, os cursos e a cobrança respondem, e a revisão no
      ar segue pronta.
- [ ] **As dívidas da revisão da G2, com gatilho** (detalhe no histórico): limite de downloads ao mesmo
      tempo por conta e concorrência maior *(o primeiro aluno pagante, ou 429 no registro)* · publicar
      só o topo da `main` *(dois "publica" seguidos)* · fixar as ferramentas da publicação pelo código do
      commit *(antes da abertura ao público)*.

---

## Phase 2 — Content Model (Courses / Modules / Lessons) + Trilhas  *(low–medium risk)*

- [x] Prisma models: `Course`, `Module`, `Lesson` (+ RLS on each) ; migration
- [x] **`Lesson` is first-class & searchable** (own title + tags) — a lesson can appear in
      results and inside a trilha on its own, not only nested in a course.
- [x] **Trilha entities** (the "currículo" — see JILSONAI.md → Trilhas): `LearningPlan`
      (`ownerUserId?` null = curated template, `isTemplate`, `skillsCovered[]`),
      `PlanModule` (grouping by competency), `PlanItem` (`itemType[COURSE|LESSON]`,
      `courseId?`/`lessonId?` — **free mix of whole courses + standalone lessons**) (+ RLS) ; migration
- [x] `core/schemas/` for course/module/lesson + **plan/planItem** + `core/constants/`
- [x] Server routes: CRUD under `/api/courses`, `/api/modules`, `/api/lessons`,
      **`/api/trilhas`** (admin-protected for writes; a member can save/clone a curated trilha)
- [x] **Keyword search** endpoint over trilhas/courses/lessons (semantic/IA search = JILSONAI Fase 4–5)
- [x] Client: catalog page (trilhas + courses), course page, lesson list (no video yet)
- [x] Admin: manage courses/modules/lessons (Bloco 6a)
- [ ] Admin: **build curated trilhas** (Bloco 6b, Jilson = "IA v0")
- [ ] Seed the **Trilha 1 — Fundamentos (Excel + IA)** + its course structure

**Rotating catalog — `ARCHIVED` read semantics (Ago 2026 · `courses.md` D9 / §1.3):**

The school runs a **rotating catalog capped at 15 courses** *(was
"20" here — stale since `courses.md` Set 2026 (13) lowered it to 15; the "per language" of
14/09/2026 left on 12/10/2026, when the school became Portuguese-only)*: a new course enters when another
leaves. `Course.status` already carries `ARCHIVED` — the enum exists, **the read semantics do not**.
No new model, no entitlement table: the operator chose the simple rule (access while the
subscription is active), which the existing enum covers.

- [ ] **Split the read paths.** Today "public reads return only `PUBLISHED`" is a single rule; it
      has to become two. **Catalog/search/sitemap:** `PUBLISHED` only — `ARCHIVED` disappears for
      new students. **Direct access by an active member** (course page, lesson, saved trilha):
      `PUBLISHED` **or** `ARCHIVED` behind `temAcessoAtivo()`. ⚠️ Without this split, archiving a
      course silently revokes it from paying members who were mid-course — the exact opposite of
      the decision. `DRAFT` stays invisible to everyone but admin, unchanged.
- [ ] **A saved trilha containing an archived course keeps resolving** (Bloco 5/6b path). The
      transitive predicate must treat `ARCHIVED` as reachable-for-members, not as `DRAFT`.
- [ ] **Certificates are NOT affected by archiving** — `[FATO, operator decision]` `Certificate`
      carries `nameSnapshot` + `skillsCovered[]` as a **snapshot**, so it never depends on the
      course still existing. See also Phase 6.5. **Archiving only frees the slot.**
- [ ] **Do NOT build video deletion.** `[FATO, decision — rejected under the stack-decision
      criterion]` Bunny bills bandwidth, not shelf space; an archived course with no viewers costs
      ≈ zero. Manual deletion in the vendor panel takes 5 minutes. Naming this here so nobody
      re-proposes it as a gap in six months.

**Shared setup module (Ago 2026 · `courses.md` D8):** SQL and Python share the same practice
environment, so a ~15–20 min "create your account + first query" module is meant to be **recorded
once and reused in N courses**.

- [ ] `[VERIFICAR]` **Can a `Lesson` be referenced by more than one course?** Current shape is
      `Course → Module → Lesson`, so a lesson belongs to exactly one module — meaning the shared
      setup would be **recorded once but registered twice**, and maintained in both places forever.
      Decide before Phase 2 closes: (a) accept the duplication (cheapest, honest), or (b) let a
      trilha carry the setup as a standalone `PlanItem` of `itemType=LESSON` (the free-mix seam
      already exists and may cover this without any schema change). **Do not add a many-to-many
      until (b) is proven insufficient.**

**Course-page fields + Metodologia 3 Camadas** — spec de produto (catálogo de campos, textos e ícones globais das camadas) em **`courses.md` §7.1 e §10**; invariantes de build em **`CLAUDE.md` → Página de curso e selo 3 Camadas**:
- [x] `Course` fields: `subtitle?`, `description?`, `level?` (`INICIANTE|INTERMEDIARIO|AVANCADO`, `as const` in `core/`), `learnTags[]`, `requirements[]`, `personas[]`, `highlights[]` (`{icon,title,text}`), `faq[]?` (`{pergunta,resposta}` — optional per-course FAQ, renders only if filled), `thumbnailUrl?` (catalog image), `introVideoId?` (detail-page presentation video), `displayOrder`, `status` (`DRAFT|PUBLISHED|ARCHIVED`)
- [x] `Module`: `layer?` (`UNIVERSAL|MODERNO|IA`, optional), `displayOrder`, `status` ; `Lesson`: `displayOrder`, `status`
- [x] **3-camadas as `Course.camadas[]`** (array, NOT boolean — a course may have 1, 2 or 3 layers) + `camadaOverride?` (jsonb, per-course text exception) ; migration (+ RLS on new tables)
- [x] **Global layer config** in `core/` (icon `stack-2`/`bolt`/`sparkles` + name + blurb per layer) — written once, not per course. Blue `--primary` only on the `IA` layer.
- [x] Client course-detail page: hero (title/subtitle/metadata strip — carga & lesson count **derived**), `highlights[]` icon cards, **3-camadas selo** (renders only the layers in `camadas[]`), `learnTags[]` as tag pills, `requirements[]` shown openly, `personas[]`, accordion (Module→Lesson), `faq[]` accordion (renders only if filled)
- [x] Catalog/list shows `thumbnailUrl`; admin can set all the above per course
- **Done when:** the Excel + IA course AND a curated trilha are visible; a member can save a
      trilha; admin can edit; lessons are searchable on their own; the course-detail page renders
      highlights + the 3-camadas selo (only the marked layers) + pré-requisitos.

> Course-page seams (do NOT build at launch): `introVideoId` must play for **non-members** (sales asset, NOT gated by `temAcessoAtivo()`) — that wiring lands in **Phase 3** (Bunny); here `introVideoId` is just an optional string column. Per-layer **filter** ("só o que roda no meu Excel 2016") and **grouping the accordion by layer** = post-launch read-side. "Pergunte ao JilsonAI sobre este curso" on the course page = **post-launch** (JilsonAI is born in Phase 6); Phase 2 leaves only the conceptual space. Heavy social proof (vídeo-depoimento, mural de logos) = post-launch.
> Effort (per operator convention): schema/migration = **Extra high (Opus)**, low-risk (NOT a MAX moment like Stripe/Bunny); pure UI/React (course page, cards, pills, selo) = **AUTO** (saves quota).
> ~~Language seam: content is modeled so language can become a LAYER later (a course can have content in N languages) — but build PT-only now. Do not build any multi-language content system yet.~~ **Superseded Sep 2026 (operator decision, 14/09):** the school is bilingual from launch, and each course/trilha is created **in one language** (an English course is a separate course, not a language layer on the same one). Built in **Phase 3 → Bloco I** — see `idiomas.md`.
> Trilha seam: curated and (future) AI-assembled plans are the SAME `LearningPlan` entity — only `ownerUserId`/`isTemplate` differ. AI-assembled plans (member describes a goal → JilsonAI builds a custom plan) land in JILSONAI Fase 4–5, no rewrite. Progress counts per `Lesson`.

### Estado real da Fase 2 (Jun 2026) + checklist de continuidade

> Esta seção existe pra qualquer chat/agente novo retomar o trabalho **só lendo este doc**, sem
> precisar do histórico da conversa que a gerou. Atualize-a conforme for fechando os itens.

**Confirmado funcionando (commitado em `dev`, testado em browser real, typecheck/lint/test
verdes):** Blocos 1–4 (modelo de dados, read API, CRUD admin via API, autoria de trilha via API,
busca por keyword); Bloco 5 (catálogo `/cursos`, página de curso `/curso/:slug`, página de trilha
`/trilha/:slug`, busca embutida, botão salvar-trilha); Bloco 6a (admin de curso/módulo/aula em
`/admin/cursos`).

**Checklist — fechar o Bloco 5 100% (achados de auditoria Jun 2026, ainda NÃO corrigidos):**
cada item abaixo já tem o arquivo e o fix apontados — quem for implementar não precisa reabrir a
investigação.
- [ ] `SaveTrilhaButton` não reflete uma trilha já salva em sessão anterior — só usa o estado local
      da mutation (`mutation.isSuccess`), nunca consulta `GET /api/trilhas/mine` (existe desde o
      Bloco 3b). Ao recarregar a página, um membro que já salvou volta a ver "Salvar trilha".
      Arquivo: `client/src/components/content/SaveTrilhaButton.tsx`.
- [ ] Aula isolada (`PlanItem` tipo `LESSON`) dentro de uma trilha não mostra contexto nenhum —
      vira texto solto sem curso/módulo. Falta `module: { select: { title, course: { select:
      { slug, title } } } }` no `select` de `lesson` dentro de `itemInclude`, em
      `server/src/routes/trilhas.ts` (usado por TODAS as leituras de trilha — curada e mine).
      Depois, `PlanItemRow` em `client/src/pages/TrilhaDetailPage.tsx` passa a linkar a aula
      isolada pro curso-pai (mesmo padrão que a busca já usa: aula → curso, não aula → aula,
      que ainda não tem página própria, Fase 3).
- [x] Sem tela "Minhas trilhas" — a leitura já existe (`GET /trilhas/mine`, `GET
      /trilhas/mine/:id`, Bloco 3b), só falta a UI. Sem ela, salvar uma trilha é um beco sem
      saída (o membro não acha de novo). Precisa: `getMyTrilhas()`/`getMyTrilha(id)` em
      `client/src/lib/api.ts`; `client/src/pages/MyTrilhasPage.tsx` (`/minhas-trilhas`, dentro de
      `ProtectedRoute`) + `MyTrilhaDetailPage.tsx` (`/minhas-trilhas/:id`); extrair o accordion
      PlanModule→PlanItem de `TrilhaDetailPage.tsx` pra um componente compartilhado (reusado pela
      trilha curada e pela trilha própria); link "Minhas trilhas" no `Layout.tsx` (qualquer
      logado, não só admin).
      ✅ **Set 2026.** Entregue como especificado. Dois detalhes que o texto acima não previa e
      ficam registrados porque mudam código vizinho: o accordion compartilhado é
      `client/src/components/content/PlanModuleAccordion.tsx` e **ganhou estado VAZIO** (módulo
      cujos itens todos apontam para curso não publicado chega vazio pelo filtro
      `publicadoNaCadeia`); e `TrilhaCard` ganhou um `to?` opcional — a trilha salva não tem slug,
      então o card não conseguia derivar o link e virava `<div>` sem destino.
- [ ] Selo 3-camadas e "Diferenciais" (highlights) sem heading de seção em
      `client/src/pages/CourseDetailPage.tsx` — os dois blocos de cards (ícone+título+texto) ficam
      empilhados sem título, parecem duplicados (achado nas capturas desktop/mobile).
- [ ] **Destaque VISUAL no campo com erro** (login e todo formulário) — hoje o erro é só texto
      abaixo do campo; a referência (Apple Store, ago/2026) pinta borda e fundo do campo errado.
      **Barato e sem retrabalho:** o estado de erro por campo já existe no formulário, só não é
      usado visualmente. **Fazer junto com `aria-invalid`**, não só cor: quem usa leitor de tela ou
      não distingue vermelho não recebe aviso nenhum hoje, e é a mesma linha de código. Cai na
      passada de direção visual (`design.md`), não abre bloco próprio.
- [ ] (bônus, baixa prioridade) sem link "← Catálogo" no topo de `CourseDetailPage`/
      `TrilhaDetailPage` — hoje só dá pra voltar pelo nav ("Catálogo") ou botão do browser.

**Achados P1 do `security-vulnerability-reviewer` (Ago 2026, HEAD `a5f7d77`) — código DESTA fase,
fecham com ela.** Os dois furam a mesma convenção (CLAUDE.md → Server: "public reads return
`PUBLISHED` content only"). Nenhum está *ativo* com o seed atual — os caminhos de código estão.
- [ ] `GET /api/trilhas/:slug` (`server/src/routes/trilhas.ts:26`, usado em `:122`) — `itemInclude`
      resolve `course`/`lesson` de cada `PlanItem` **sem filtro de status**, em rota pública sem
      auth. Cenário: a trilha é montada antes do curso ir ao ar (fluxo normal) → visitante anônimo
      recebe `id`, `slug`, `title`, `subtitle`, `level`, `thumbnailUrl`, `camadas` de curso
      `DRAFT`/`ARCHIVED`. O predicado transitivo correto já existe em
      `server/src/routes/search.ts:61` — espelhar. Filtrar no nível do `PlanItem` (relação to-one
      no Prisma não aceita `where`), mantendo a variante sem filtro só para leitura admin/owner.
- [ ] `POST /api/trilhas/:id/save` (`server/src/routes/trilhas.ts:211`) — rejeita só
      `!template.isTemplate`, **não checa `status`**. Qualquer usuário autenticado (não precisa ser
      admin) itera ids e clona trilha curada ainda em `DRAFT`; o clone nasce `PUBLISHED` (`:233`) e
      a árvore inteira fica legível em `GET /api/trilhas/mine/:id` (`:110`), que também não filtra.
      Regra "só PUBLISHED" contornada por um endpoint de **escrita**. Fix: `status: PUBLISHED` no
      `where` do template (ou `findFirst`), 404 caso contrário.

**O que falta na Fase 2 depois do Bloco 5 fechado:**
- [ ] Bloco 6b — **ENTRA NA ABERTURA** *(decisão do operador, 28/10/2026, com a Trilha 1 montada por
      ele pela tela)*. UI de montagem de trilha curada (admin): `GET /api/admin/trilhas` +
      `GET /api/admin/trilhas/:id` novos (espelho admin, qualquer status, mesmo padrão do Bloco
      6a); `/admin/trilhas`, `/admin/trilhas/novo`, `/admin/trilhas/:id`; árvore inline
      PlanModule→PlanItem com reordenar ↑/↓; ao adicionar um PlanItem tipo LESSON, dois selects
      dependentes (curso → aula daquele curso).
- [ ] Autoria real da **Trilha 1 — Fundamentos (Excel + IA)** pelo admin, pela UI (não é bloco de
      código — é o operador usando o Bloco 6a/6b prontos; o seed atual é só smoke descartável).

**PENDENTE DO OPERADOR — o que cada seção PLANEJADA vai ter dentro** *(23/09/2026: "coloca como
pendência definir o que vai ter porque não tive tempo de pensar em tudo ainda")*

O rail já mostra ao admin as seções que faltam construir, em cinza. **Mas o segundo nível delas
está quase todo vazio:** das cinco planejadas, só **JilsonAI Admin** tem subitens declarados
(Escalações · Persona · Modelo · Quotas). Por isso "ligar o segundo nível" hoje mostraria quatro
linhas e nada mais — não responde *"o que falta no admin"*, porque o que falta ainda não foi
escrito em lugar nenhum.

- [x] **Operador define, uma frase por seção** *(respondido em 28/09/2026)*:
      - **Alunos:** lista de todos os alunos, com busca; em cada um, os dados do cadastro, a
        assinatura (situação, desde quando, próxima cobrança), o progresso nos cursos, o botão
        **Mensagem**, **sincronizar com a Stripe** (destravar quem pagou e ficou sem acesso) e a
        **exclusão a pedido** (LGPD).
      - **Dados:** **uma tela só, em blocos**: assinantes (ativos, novos e cancelados no mês),
        aprendizado (horas assistidas, cursos mais vistos, conclusões), de onde vieram os alunos
        (campanha do link) e uso do JilsonAI. Se crescer, vira partes depois.
        **→ Virou o Dashboard do admin em 29/09/2026** (`/dashboard`, decisão do operador) e
        saiu do menu; os 4 blocos são EM BREVE até os dados existirem (Fases 4, 5 e 6).
      - **Trilhas Admin:** a lista das trilhas curadas e um editor **no mesmo jeito do curso**
        (passos em ordem de preenchimento): nome, idioma, descrição, **imagem da trilha** (campo
        novo), módulos por competência (cada um com o seu **"Ao terminar, você sabe…"**, visto
        só por quem está logado), itens, competências cobertas (vão no certificado),
        publicar. **Trilha pronta leva só cursos inteiros, sem aula avulsa** (decisão da sessão da
        home, set/2026 — `CLAUDE.md` → Content Model).
      - **Certificados** (de curso e de trilha): a lista dos emitidos (aluno, curso ou trilha,
        data, se o aluno deixou público, link de verificação) + **um modelo visual único**
        (texto e assinatura).
      - **Comunicação** *(seção nova, Bloco E)*: a fila de dúvidas que sobem do JilsonAI, os
        anúncios e, depois, o resumo do que os alunos perguntam. **JilsonAI Admin perde
        "Escalações"** e fica com Persona, Modelo e Quotas.
- [ ] Declarar no `client/src/lib/navigation.ts` (é dado, não código — cada seção declara os
      níveis que usa), **incluindo Comunicação e a saída de Escalações do JilsonAI Admin**, e só
      então ligar a exibição do 2º nível para seção planejada.
- **Por que nesta ordem:** declarar primeiro é o que faz a visão "o sistema inteiro de uma olhada"
  existir de verdade. Ligar antes entrega a moldura vazia.

**Backlog de polish (sem dono de bloco ainda — não bloqueia o fechamento da Fase 2, mas precisa
de uma sessão própria antes do launch):**
- [ ] Fotos/imagens reais (thumbnails de curso, qualquer asset de marca) — hoje tudo usa
      placeholder (`BookOpen` icon quando `thumbnailUrl` é nulo).
- [ ] A direção visual completa de `docs/design.md` (paleta off-white `--surface-alt`, fontes
      MuseoModerno (marca)/Outfit/Hanken Grotesk, o hero animado "trilha que se monta sozinha") ainda não foi
      implementada — o client hoje usa os tokens default do shadcn (`zinc`) só com `--primary`
      trocado pro azul da marca. Isto já está anotado no código
      (`client/src/index.css`: "the full design.md palette/fonts land in the later design pass") —
      não é uma divergência nova, é um adiamento já decidido.
- [ ] Navegação mobile mais elaborada se o menu crescer (hoje é só uma lista horizontal de
      botões no header — funciona bem nas larguras testadas, mas não tem um padrão de menu
      hambúrguer se mais itens entrarem).
- [ ] Qualquer ajuste visual que só aparece usando o produto de verdade com conteúdo real (não o
      smoke seed) — preencher conforme for revisando.

## Phase 3 — Video Playback (Bunny Stream)  *(HIGH RISK — own sessions)*

### Bloco 0 — GATES  *(promovido da Fase 7 em Ago 2026 — fazer ANTES de qualquer código de vídeo)*

> **Por que isto vem na frente de tudo:** **gate não é feature.** Sem CI que execute a suíte,
> qualquer teste escrito depois vale **zero** — o operador trabalha em sessões separadas por
> semanas, ninguém roda a suíte na mão, e um gate que mente é pior que gate nenhum (dá a sensação
> de cobertura sem a cobertura). Estes três itens estavam na Fase 7 (ou seja, **depois** do Stripe)
> e foram promovidos pro topo da primeira fase ainda não aberta.

- [x] **CI passa a rodar teste.** ✅ *(Ago 2026 — script `test` na raiz + step `Test client` no
      `ci.yml`, **depois do build do core**, porque as suítes importam `@jilson/core` → `core/dist`.
      Provado por **mutação**: apagar a checagem de `Role.ADMIN` em `AdminRoute.tsx` reprova o CI.
      O script cobre só o `client` — é o único workspace com runner; o `server` entra na Fase 4.
      **E2E ficou de fora explicitamente**, como o próprio item pedia: precisa de banco de teste.)*
      [FATO histórico] Não existia script `test` no `package.json` **raiz**; o
      `.github/workflows/ci.yml` faz `npm ci` + build do core + typecheck (client/server) + build
      (client/server) — e **não tem step de lint nenhum**, apesar de o job se chamar
      "Lint, typecheck & build". Consequência hoje: `AdminRoute.test.tsx`, `ProtectedRoute.test.tsx`
      e o E2E de auth **nunca executam** em push nem em PR — dá pra remover a checagem de
      `Role.ADMIN` e o CI fica verde. Contradiz CLAUDE.md → Quality Gates e a seção Commands (já
      reconciliadas na mesma passada). Fix: script `test` na raiz agregando os workspaces que têm
      suíte + step no `ci.yml`. **E2E entra como job separado**, só quando houver banco de teste no
      CI — declarar no plano do bloco, não deixar implícito.
- [x] **`lint` para de mentir.** ✅ *(Ago 2026 — resolvido pela **terceira** saída, decidida no plano
      do bloco: **apagar** o script (raiz + `client` + `server`), não renomear. Motivo: ele executava
      `tsc --noEmit`, comando que **já tem nome aqui — `typecheck`**; renomear "pro que faz" criaria
      colisão, porque a mentira era a **duplicata**, não o nome. Job do CI renomeado para
      "Typecheck, test & build". **ESLint NÃO entrou** — continua sendo decisão própria, e o nome
      `lint` fica livre pra ela. **Custo aceito e registrado no checkbox abaixo.**)*
      [FATO histórico] `client/package.json:11` e `server/package.json:11` definiam
      `"lint": "tsc --noEmit"` — idêntico ao `typecheck`; **não existe ESLint no repo**. Logo a
      regra "no `any`" do CLAUDE.md **não tem enforcement automático** (o código de auth está limpo
      hoje; nada impede a regressão). Duas saídas aceitas: instalar `typescript-eslint` com
      `no-explicit-any: error`, **ou** renomear o script e ajustar CLAUDE.md/CI. O que não pode é o
      gate continuar dizendo que faz uma coisa e fazendo outra. *(Dependência de runtime nova =
      decisão de plano, com OK do operador — CLAUDE.md → Working Method.)*
- [x] **Consequência aceita da remoção do `lint`: "sem `any`" fica SEM enforcement automático.** ✅
      *(Ago 2026 — registrado como item explícito, não como nota de rodapé, porque é uma convenção
      do `CLAUDE.md` (Key Conventions → General) que passa a valer **só por revisão de diff**. Nada
      no CI barra um `any` novo. Preferível a fingir que um gate cobre isso: o `lint` anterior
      **também** não cobria — ele rodava `tsc --noEmit`, que aceita `any` sem reclamar. Ou seja, a
      remoção não perdeu cobertura nenhuma; só parou de simular que havia. Fecha de vez quando
      ESLint + `typescript-eslint` com `no-explicit-any: error` entrarem em bloco próprio.)*
      **FECHOU em 10/10/2026:** a etapa 4.5 da Fase 4 ligou `no-explicit-any: error` nos quatro
      workspaces, bloqueante no CI. Medido naquele dia: nenhum `any` no repositório.
- [ ] **Rate-limit de login — VERIFICAR a borda ANTES de escrever código** (achado do
      `security-vulnerability-reviewer`, Ago 2026). `rateLimit` está ligado em produção
      (`server/src/lib/auth.ts:72`), mas sem `advanced.ipAddress` o Better Auth lê
      `x-forwarded-for` e usa o **primeiro** elemento — o que o cliente controla quando a borda
      **anexa** em vez de sobrescrever. Nesse caso o atacante varia o header e faz brute-force
      ilimitado contra o e-mail do admin em `/api/auth/sign-in/email` — **a única porta de entrada**
      (`disableSignUp: true`), e ela dá no admin. A convenção "rate-limit auth routes in production"
      fica satisfeita **na letra** e **vazia no efeito**. Se houver header confiável, fixar em
      `advanced: { ipAddress: { ipAddressHeaders: [...] } }`; se não houver, `express-rate-limit` à
      frente de `app.all("/api/auth/{*any}")` com `app.set('trust proxy', <hops>)`.
      **As duas armadilhas** (`trust proxy` não configura o Better Auth; a premissa do XFF pode
      estar defasada) estão em `CLAUDE.md` → Quality Gates — **não duplicar aqui**.
  - [x] ~~**PASSO 1 — rota temporária `/api/__whoami`**~~ **DISPENSADO pela atualização para a
        1.7.5** (Set 2026). A versão nova **avisa no log**, uma vez, quando não consegue resolver o
        IP: *"Rate limiting could not determine a client IP and is falling back to a single shared
        per-path bucket"*. A presença ou ausência dessa linha nos logs da Railway responde a mesma
        pergunta, **sem rota nova, sem deploy de diagnóstico e sem nada para remover depois**.
  - [x] **PASSO 1 (novo) — o operador procura essa linha nos logs da Railway** ✅ *(23/09: a linha
        APARECEU às 11:41 — balde compartilhado confirmado)* depois do primeiro
        deploy com a 1.7.5, tendo feito ao menos um login. **Aparece** ⇒ a borda anexa ao
        `x-forwarded-for`, o balde está compartilhado, e é preciso `advanced.ipAddress.trustedProxies`
        com as faixas da Railway (ou um header que ela garanta). **Não aparece** ⇒ o IP resolve, e
        só falta apertar `/sign-in/email`.
  - [x] **Diagnóstico feito com rota temporária (23/09), já removida.** `x-real-ip` é sobrescrito
        pela Railway e é o IP real (conferido contra serviço externo); `x-forwarded-for` chega com 2
        elementos; nenhum IP é da Fastly (o alerta antigo do suporte não vale mais). **Correção:**
        `ipAddressHeaders: ["x-real-ip"]`.
  - [x] ~~Três provas com header forjado~~ — **não são mais necessárias para saber se dá para
        forjar**: medido na 1.7.5 que cadeia com mais de um elemento devolve `null`, então o
        atacante não escolhe mais o próprio balde. O que resta descobrir é outra coisa: **quais são
        as faixas de IP dos proxies da Railway**, para preencher `trustedProxies`. Isso se pergunta
        ao suporte deles ou se lê do próprio `x-forwarded-for` de um acesso conhecido.
  - [ ] **Critério de aprovação (depende do deploy):** o aviso do balde compartilhado **some** dos logs, e um login
        continua funcionando. Só então apertar `/sign-in/email` com `customRules` (ex.: 3 em 10 s).
        **Nessa ordem, e a ordem inverteu com a 1.7.5:** apertar antes de o IP resolver transforma o
        limite na própria negação de serviço — três erros de qualquer pessoa trancariam o login de
        todos, inclusive o do único admin.
  - [x] ~~**Remover a rota `/api/__whoami`**~~ — não existe mais rota para remover, porque a
        1.7.5 dispensou a rota. *(A regra que a motivava continua valendo: rota de diagnóstico que
        sobrevive ao diagnóstico é superfície que ninguém revisa depois.)*
- [x] **(NÃO-BLOQUEANTE — adicionado Ago 2026, não veio da Fase 7) `npm audit --audit-level=high`
      no `ci.yml`.** ✅ *(Ago 2026 — step com `continue-on-error: true`. **Nasce falho-porém-tolerado
      e isso é o esperado, não regressão:** medido na hora da implementação, o comando já sai com
      exit 1 — `{low:2, moderate:6, high:5, critical:1}`, puxados por advisory transitivo do
      `react-router`. O job fica **verde**; o step aparece marcado. Registrado antes do push pra não
      virar susto no primeiro PR.)* Entra como step **informativo**: **não trava o gate no primeiro dia.** Se
      produzir ruído de dependência transitiva (vulnerabilidade em pacote fora do caminho de
      execução, ou sem fix publicado), **degrada para conferência mensal manual** — não vira alarme
      permanente. *Um gate que grita sempre é um gate que ninguém lê*, e o custo disso é maior que o
      benefício de bloquear cedo demais. (É step de CI, não dependência de runtime — não cai na
      regra de "dependência nova = decisão de plano".)
- [ ] **(BACKLOG, não executar agora) Divergência de runtime Node — TRÊS fontes, três histórias.**
      Não é só o warning de depreciação; o warning é o **sintoma**. O que o log do run `32743912121`
      revela (texto literal: *"Node 20 is being deprecated. This workflow is running with **Node 24
      by default**"*):
      - `ci.yml` pede **`node-version: "20"`**
      - o workflow **executa em Node 24 na prática** (as actions forçam)
      - o `Dockerfile` publica em **`node:20-alpine`**
      - a raiz declara **`engines.node: ">=20"`** — permissivo demais pra arbitrar entre os dois
      **Consequência, que é o motivo de isto ser um item e não uma nota:** **validamos num runtime e
      publicamos em outro.** Um teste que passa no CI (Node 24) não prova nada sobre o Node 20 que
      serve o aluno em produção — e o inverso também vale. É a **MESMA FAMÍLIA** da divergência
      Docker↔CI que causou o bug do Prisma (`d3d2135` corrigiu o Dockerfile e o `ci.yml` ficou pra
      trás): duas definições do mesmo ambiente evoluindo separadas, sem nada que force a igualdade.
      O do Prisma custou dois meses de CI vermelho; este ainda não custou nada — por enquanto.
      **Escopo do bloco futuro:** escolher UMA versão, alinhar as quatro fontes acima (incluindo
      apertar o `engines.node`) e subir as actions pra `@v5`. **Bloco próprio, não conserto
      oportunista:** mexer em runtime de CI de carona em outra coisa é exatamente como um gate
      quebra sem ninguém entender por quê.
- [ ] **Revisar UMA vez o advisory `critical` puxado pelo `react-router`** (acréscimo do operador,
      Ago 2026 — **fora do escopo do bloco que ligou o audit**, registrado aqui pra não sumir).
      Decidir se **alcança o nosso uso** — é dev-only? é caminho não exercido pela app? (o advisory
      visto na implementação é de **hidratação SSR**, e este cliente é **SPA Vite sem SSR**, o que
      *sugere* não-alcance — **verificar, não presumir**) — e **registrar a conclusão** aqui.
      Razão de ser um item próprio: ruído transitivo é a regra e por isso o step é não-bloqueante,
      mas **`critical: 1` não é ruído por padrão** — exige um olhar, não zero. Sem este checkbox, a
      tolerância vira permanente sem ninguém nunca ter lido o que está sendo tolerado.
- **Done when (Bloco 0):** um push com teste quebrado **reprova** o CI; o script `lint` faz o que o
      nome diz (ou não se chama mais `lint`); e o brute-force contra `/api/auth/sign-in/email` é
      barrado por um limite que **não** depende de header controlado pelo cliente. *(O `npm audit`
      é informativo — não entra neste "Done when".)*
      > **⚠️ ACHADO DE EXECUÇÃO (Ago 2026) — a premissa do bloco estava ERRADA: o CI não estava
      > verde-mas-vazio, estava VERMELHO por DOIS MESES e ninguém viu.** Descoberto só ao dar o
      > primeiro push com o step de teste. **CORREÇÃO (registrada ao ler o histórico completo via
      > `gh run list`, depois de instalar o GitHub CLI):** a primeira redação deste achado dizia
      > "5 commits" — era o que a API pública mostrava na primeira página. A janela real é
      > **24/jun/2026 → 24/ago/2026**, de `ca1d02a` (o push que carregou a **Fase 2 Blocos 1 e 2**)
      > até o commit deste bloco, passando por `ec044e7`, `a91588d` e `8360ad3`. Último verde:
      > `18d963a`. Sempre a MESMA falha: `Typecheck server`.
      > **Por que dois meses passaram em branco — e este é o ponto que importa mais que a duração:**
      > quase todos os pushes do período eram de **documentação** ("Documentos atualizados…",
      > "docs(plan): …"). **Commit de doc não faz ninguém abrir o Actions** — a expectativa mental é
      > "não mexi em código, não tem o que quebrar". Só que o CI roda em `branches: ["**"]` e falhava
      > igual. A cegueira não foi descuido pontual: foi **estrutural**, e maior do que o bloco supôs
      > quando foi planejado.
      > **Causa:** o `ci.yml` **nunca rodou `prisma generate`**. O código do server importa tipos do
      > `@prisma/client`; a Fase 2 introduziu os models; num runner limpo esses tipos não existem e
      > o `tsc` quebra. Local passava porque `node_modules/.prisma` já estava gerado. O
      > **`Dockerfile` ganhou esse fix em `d3d2135`** ("generate Prisma client before build") e o
      > **`ci.yml` ficou para trás** — deploy e CI divergiram sem ninguém notar. Corrigido em commit
      > separado (`ci: gera Prisma client antes do typecheck`), espelhando `Dockerfile:60-63`; o
      > `generate` **não precisa de `DATABASE_URL`** (só lê o schema e escreve em `node_modules`),
      > verificado antes do push.
      > **Os 10 erros do log eram UMA causa raiz, não dez problemas** — e isto fica registrado
      > explicitamente para ninguém, daqui a seis meses, ler o histórico e concluir que havia dívida
      > de tipagem no server: os 2 primeiros eram `Namespace '...prisma/client/default'.Prisma has
      > no exported member 'InputJsonValue'`, e os outros 8 (`Parameter 'm' implicitly has an 'any'
      > type`, `Binding element 'modules'…`) eram **SINTOMA da ausência dos tipos gerados** — sem
      > eles o `tsc` não infere nada das queries. **Não eram violações da convenção "sem `any`"**
      > (CLAUDE.md → Key Conventions). O `prisma generate` zera a lista inteira.
      > **A lição, que é a do próprio bloco um nível abaixo:** *gate que grita sem ninguém escutar*
      > é o mesmo defeito de *gate que mente*. O Bloco 0 nasceu para consertar o segundo e
      > tropeçou no primeiro. Notificação de falha de CI = candidato a item futuro.
      >
      > **✅ CONFIRMADO POR LOG (run `32743912121`, lido via `gh run view --log` — não inferido da
      > API).** Duas coisas que antes eram só dedução ficaram provadas textualmente:
      > 1. **`Test client` executou de verdade: `Test Files 9 passed (9)` · `Tests 23 passed (23)`.**
      >    O step tinha ficado `skipped` no run anterior (o `Typecheck server` morria antes), então
      >    esta é a primeira execução real da suíte em CI na história do repo.
      > 2. **O step de audit tem `outcome=failure` / `conclusion=success`** — falhou de fato
      >    (`14 vulnerabilities (2 low, 6 moderate, 5 high, 1 critical)` + `##[error]Process
      >    completed with exit code 1`) e foi **tolerado por desenho** pelo `continue-on-error: true`.
      >    A API REST expõe só `conclusion`, que mascara isso; o `outcome` só aparece no log ou em
      >    expressão de workflow. **Registrado porque a leitura ingênua ("audit: success") diria o
      >    oposto da verdade** — e porque confirma que o **advisory `critical` segue EM ABERTO**,
      >    aguardando o checkbox de revisão acima. Nada foi silenciosamente consertado.
      >
      > **STATUS (Ago 2026): PARCIAL — 2 de 3 critérios verdes, bloco NÃO fechado.** ✅ push com
      > teste quebrado reprova o CI (provado por mutação) · ✅ o `lint` parou de mentir (apagado) ·
      > ❌ **rate-limit de login pendente** — é bloco próprio: toca `server/src/lib/auth.ts`, o que
      > dispara o gate obrigatório de context7 (`/better-auth/better-auth`), e o **passo 1 continua
      > sendo VERIFICAR** qual header a Railway garante sobrescrever, nunca codar antes.

### Bloco T — Cobertura: infra de teste, os P1 abertos e a fronteira de XSS  *(Ago 2026 · precede o corpo da fase)*

> **ABORDAGEM DECIDIDA — "infra uma vez, cobertura por fase".** Registrada porque as duas
> alternativas óbvias falham, cada uma do seu jeito. *Parar e retro-cobrir tudo antes de avançar*
> é a fase que não fecha: operador solo, telas que já funcionam há meses, e o repo **já decidiu**
> que Fases 0/1/2 não são retro-completadas (`CLAUDE.md` → Definição de pronto por fatia).
> *Deixar pra depois* é o modo de falha que este repo **já viveu**: a doutrina de teste sempre
> existiu e mesmo assim o CI não rodava suíte. O meio-termo é o único que sobrevive a sessões
> separadas por semanas: **paga-se AGORA só o que DESTRAVA** — a infra que falta e o que já é bug
> em código escrito — e **cada fase seguinte nasce com os testes dela**, nunca um "bloco de
> testes" no fim.
>
> **O que NÃO entra aqui, de propósito:** teste de componente em tela que já funciona · meta de
> cobertura · qualquer suíte de Bunny ou Stripe. Teste escrito antes do handler existir testa a
> imaginação de quem escreveu, não o código.

**T0 — o que NÃO precisa ser configurado (leia antes de configurar qualquer coisa).**
A pergunta natural é *"preciso configurar os testes para começar"*. Medido em Ago 2026, a resposta
é **não, em duas das três camadas** — e isso muda por onde se começa:

| Camada | Configuração | Para escrever um teste novo, hoje |
|---|---|---|
| **Componente** (Vitest + RTL) | ✅ **pronta** | criar `Name.test.tsx` ao lado do componente. Nada a montar. |
| **Servidor** (supertest) | ✅ **pronta** | criar `src/**/*.test.ts` e `import app`. Nada a montar. |
| **E2E** (Playwright) | ❌ **falta, e hoje é perigosa** | é o T1 abaixo — a única configuração real deste bloco. |

> **Registrado porque a intuição erra aqui:** "configurar os testes" soa como pré-requisito único e
> grande. Não é — o pré-requisito grande é só o E2E. **Teste de tela pode ser escrito hoje, sem
> nenhum setup**, e é isso que destrava começar pela tela de login sem esperar o resto.

**T1 — o E2E deixa de ser teatro.** Hoje [`e2e/tests/auth.spec.ts`](../e2e/tests/auth.spec.ts) tem
**6 testes que nunca rodam em CI**, e que quando rodam só provam redirect do React Router.

> **O QUE A PASTA `e2e/` JÁ TEM** *(inventariado em Ago 2026 — são 4 arquivos, nada mais)*:
> `playwright.config.ts` (55 linhas — `webServer` para 3000 e 5173 **já configurado**, `baseURL`,
> projeto chromium, `retries: 2` no CI) · `tests/auth.spec.ts` (6 testes: 2 redirects de anônimo,
> member entra em `/conta` e é barrado em `/admin`, admin entra em `/admin`, logout, senha errada) ·
> `package.json` (só `@playwright/test` + `typescript`) · `tsconfig.json`.
> **Não existe:** `global-setup.ts`, seed, job no CI, `.env` próprio. **O que falta é exatamente o
> que a lista abaixo cria** — a estrutura em si está de pé, e o `webServer` é reaproveitado.
>
> **ESTADO DO BANCO DE TESTE** `mvaobzypsiuhqzipcelw` *(medido via MCP, Ago 2026)*: 11 tabelas ·
> **4 migrations aplicadas** · `user` = **2**, `account` = **2**, `session` = 1 → **o seed de
> usuários JÁ RODOU** (admin + member existem, que é o que as 6 specs usam) · **`course`,
> `module`, `lesson`, `learning_plan`, `plan_module`, `plan_item` = 0** — conteúdo **vazio**.
> **Consequência prática para o T1:** as 6 specs de auth funcionam com o que já está lá; **qualquer
> spec futura que precise de um curso vai precisar de `db:seed:content` no `globalSetup`.**
> Melhor descobrir isso agora do que num teste vermelho sem causa aparente.
>
> **⚠️ ACHADO (Ago 2026, ao conferir o arquivo em vez de presumir): o E2E de hoje roda contra
> PRODUÇÃO.** [`e2e/playwright.config.ts:9`](../e2e/playwright.config.ts#L9) chama
> `loadServerEnv()`, que lê **`../server/.env`** — e o `webServer` (`:39-54`) sobe
> `npm run dev:server`, que carrega **esse mesmo `.env`**. Enquanto o `.env` local apontar para o
> banco que o Railway serve (o que o *Estado atual* deste plano registra que ainda é o caso),
> `npm --workspace e2e run test` **autentica com credencial semeada contra o banco de produção**.
> Hoje o dano é limitado porque as 6 specs só leem — mas a **primeira** spec que criar ou apagar
> algo grava lá, e nada no repo avisa. Isto é o mesmo defeito de família da trava por REF: falta de
> identidade verificada, não falta de cuidado. **É o item que justifica T1 vir antes de tudo.**

- [x] `e2e/global-setup.ts` com a **MESMA trava** de `server/src/test/test-env.ts` — **importada**,
      não copiada. *(Passou a ser a trava de host local, não mais por REF: o banco de teste virou
      Postgres local no commit anterior.)*
- [x] `loadServerEnv()` **removido**. Ele lia `../server/.env` num `try/catch` silencioso, e era
      isso que transformava "sem env de teste" em "roda contra o que estiver lá". O env agora vem do
      `globalSetup`, que aborta com a causa dita.
- [x] `webServer` sobe o server com **`--env-file=server/.env.test`**. Sem isso o
      `import "dotenv/config"` do `index.ts` carregaria o `.env` (dev) e o Playwright resetaria um
      banco para dirigir um servidor ligado a outro. `reuseExistingServer: false` no server pela
      mesma razão. **Custo operacional aceito: é preciso parar o `dev:server` antes de rodar E2E.**
- [x] `fullyParallel: false` + `workers: 1`.
- [x] Reset e seed são os **mesmos comandos** da suíte de servidor (executados como subprocesso —
      `seed.ts` não exporta função, e rodar o mesmo script torna a divergência impossível).
- [x] Job **separado** `e2e` no `ci.yml`, com service container `postgres:17`, browser só chromium
      e upload do report em falha. YAML validado.
- [x] **DESCOBERTO NO CAMINHO — o workspace `e2e` era o único em CommonJS.** `core`, `client` e
      `server` são `"type": "module"`. Isso quebrava `import.meta.url` e **impedia importar a trava
      do servidor**, que é ESM. Alinhado para ESM.
- [x] **`e2e` entrou no `npm run typecheck` da raiz.** Não estava no plano: virou necessário quando
      o workspace passou a ter código de verdade (`global-setup.ts`) — sem isso, um erro de tipo ali
      só apareceria no job lento, e o gate rápido mentiria por omissão.
- [x] **PROVA POR MUTAÇÃO — feita, e reprovou.** Removido o `<Route element={<ProtectedRoute />}>`
      que envolve `/conta` em `App.tsx:24-26`: **2 testes falharam**; revertido, 6/6 verdes.
      *(A primeira tentativa de mutação não casou o padrão — o guard é uma rota-PAI, não um wrapper
      inline —, e o script abortou sem escrever. Registrado porque o output "6 passed" daquela
      rodada era do código **não mutado**: mutação que não aplica dá falso conforto, exatamente como
      o teste que não pode falhar.)*
- [x] **ACHADO — a suíte estava STALE e ninguém sabia.** Ligado o E2E, `admin reaches /admin`
      falhou: esperava o texto *"Área administrativa"*, renomeado para *"Admin"* no commit `de17fe6`
      (Fase 2, Bloco 6a). **Quebrada desde então, em silêncio, porque o E2E não rodava.** É a
      demonstração exata da premissa do bloco. Reescrita com `getByRole` em vez de texto solto
      (sobrevive a mudança de copy) e com asserção de URL, que é o que o teste de fato quer provar:
      o admin **não** é redirecionado, ao contrário do member.

**T2 — fechar os P1 de vazamento, com o teste colado ao fix.** São os achados de segurança em
**código que já existe**; o resto do backlog é sobre código ainda não escrito.

> **Eram 2; a varredura do `security-vulnerability-reviewer` (Ago 2026) achou mais 2** — um deles
> na mesma família dos conhecidos, o outro numa família nova (cookie). **A informação central para
> este bloco:** nenhum dos quatro reprovaria o CI de hoje. São exatamente a classe de bug que
> **teste de servidor pega e typecheck nunca pega** — que é a justificativa do Bloco T inteiro.

- [x] **P1-a — `GET /api/lessons/:id` não checa a cadeia** (`server/src/routes/lessons.ts:17-19`).
      O `where` filtra só a própria aula. **Cenário:** o operador arquiva um curso; as aulas
      continuam `PUBLISHED`, e a rota segue devolvendo título, tags, título do módulo e **slug +
      título do curso retirado do ar** — idem curso `DRAFT` cujas aulas foram publicadas uma a uma
      durante a autoria. **A forma correta já existe no repo**: `search.ts:61` faz
      `lesson → module → course`. É inconsistência, não escolha de desenho.
- [x] **P1-b — `itemInclude` sem filtro de status** (`server/src/routes/trilhas.ts:24-29`, usado em
      `:113` e `:122`) — *conhecido, confirmado, e **pior** do que estava registrado.* O vazamento
      passivo (trilha `PUBLISHED` que referencia curso `DRAFT`) é o caso menor. O maior:
      `POST /api/plan-items` (`:328-336`) verifica só que o curso **existe**, nunca que está
      publicado ⇒ qualquer usuário logado adiciona um `courseId` chutado ao **próprio** plano e lê
      os metadados de volta por `GET /api/trilhas/mine/:id`. Vira **oráculo de enumeração** do
      catálogo não lançado, e passa por toda checagem de dono, porque o plano **é** dele.
      **⚠️ Nota de implementação que muda o fix:** o Prisma **não aceita `where` em include de
      relação to-one**, então o filtro sobe para `items` (to-many) em `planTreeInclude:31` — e
      `:329`/`:333` viram `findFirst` com `status: PUBLISHED`.
- [x] **P1-c — `POST /api/trilhas/:id/save` rejeita só parcialmente** (`:211`) — *conhecido,
      confirmado.* `if (!template || !template.isTemplate)` nunca checa `status`: membro salva uma
      trilha curada `DRAFT` ou `ARCHIVED`, o servidor clona a árvore inteira para a conta dele, e o
      `GET /api/trilhas/mine/:id` renderiza o material não lançado. `GET /api/trilhas/:slug` exige
      `PUBLISHED` corretamente — **o save/clone é o desvio em volta desse gate.**
- [x] **P1-d — `secure` do cookie de sessão não está fixado** (`server/src/lib/auth.ts:46-51`) —
      **família diferente das outras três, e a de maior impacto.** Hoje `secure` depende da
      **grafia** de `BETTER_AUTH_URL`; gravada sem esquema ou com `http://` no Railway, o cookie de
      sessão viaja em claro **sem erro e sem log**. Fix: `advanced: { useSecureCookies:
      process.env.NODE_ENV === "production" }`. **Toca `lib/auth.ts` ⇒ dispara o gate obrigatório
      do context7** (`/better-auth/better-auth`) — pode sair na MESMA chamada do rate-limit, que já
      é exigida pelo Bloco 0 e mexe no mesmo arquivo.
- [ ] **NÃO esperar a verificação do Railway para aplicar o fix — ele é INCONDICIONAL.** Registrado
      porque a pergunta *"a `BETTER_AUTH_URL` começa com `https://`?"* parecia bloqueante e **não
      é**: `useSecureCookies: NODE_ENV === "production"` é o valor correto **nos dois casos**. Se a
      URL já está certa, o fix não muda comportamento e **remove a dependência de uma grafia**; se
      está errada, o fix **conserta**. Não há resposta que mude o código.
      **PRÉ-REQUISITO VERIFICADO antes de recomendar** `[FATO — `Dockerfile:71`, estágio
      `production`, de onde sai o `CMD`]`: `ENV NODE_ENV=production` está fixado na imagem. **Sem
      isso o fix seria pior que o problema** — `secure` viraria `false` em produção sem ninguém
      notar. Não é detalhe: é a premissa inteira.
      **⚠️ DEPENDÊNCIA RESIDUAL, escrita porque é o jeito de furar este fix: NUNCA declarar
      `NODE_ENV` nas variáveis do Railway.** Variável de serviço **sobrepõe** o `ENV` do Dockerfile;
      declarada ali com qualquer outro valor, o cookie volta a ser inseguro em silêncio.
      **Por que o fix ainda assim é melhor que o estado atual:** a dependência sai de uma string de
      painel **não versionada, não revisada e com muitas grafias válidas** (`BETTER_AUTH_URL`) e
      passa para uma linha **versionada, revisada em diff e de valor canônico único** (o
      `Dockerfile`). Não é remover a dependência — é movê-la para onde o git enxerga.
- [x] **`PREVIEW_TOKEN` e `COMING_SOON` estão SET no Railway** *(Ago 2026, conferido pelo operador
      no painel — só a presença, nunca o valor)*. Fecha a verificação nº 3 da seção (C) do
      `security-vulnerability-reviewer`: `PREVIEW_TOKEN` vazio faria `hasPreviewCookie` devolver
      sempre `false` (`app.ts:60-61`) e trancaria o operador fora do próprio bypass da coming-soon.
      As 7 variáveis do serviço são `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `CLIENT_URL`,
      `COMING_SOON`, `DATABASE_URL`, `DIRECT_URL`, `PREVIEW_TOKEN` — **e `NODE_ENV` corretamente
      NÃO está entre elas** (ver a dependência residual acima).
- [x] **O espaço de falha é MENOR do que a análise supunha — resolvido por dedução, não por
      inspeção do painel** `[FATO — `better-auth/dist/utils/url.mjs:36` da 1.6.20 instalada]`: o
      Better Auth **lança** `Invalid base URL: … URL must include 'http://' or 'https://'` quando o
      protocolo não é um dos dois. **Logo `BETTER_AUTH_URL` não pode conter lixo:** se contivesse, o
      servidor **não subiria**, e ele está no ar servindo a coming-soon. A hipótese de "as duas
      variáveis foram trocadas na configuração" está **descartada por evidência**, sem precisar
      revelar valor nenhum.
      **O que sobra é binário — `http://` ou `https://`** —, e nenhum dos dois muda o fix. Registrado
      porque a análise original tratava "URL mal escrita" como espaço aberto de possibilidades; o
      fornecedor já fecha quase todo ele, e **saber onde o fornecedor já protege evita construir
      guarda em cima de guarda**.
- [ ] **A verificação continua valendo — mas mede URGÊNCIA, não decide o fix.** Ela responde *"o
      cookie está inseguro AGORA em produção?"*, o que muda se isto é conserto de rotina ou incidente.
      **Como olhar sem expor valor:** painel do Railway → o serviço → aba **Variables** → conferir
      só os **8 primeiros caracteres** de `BETTER_AUTH_URL`. *(Não há CLI do Railway instalada nesta
      máquina — verificado Ago 2026; via CLI o padrão seguro seria
      `railway variables --json | jq -r '.BETTER_AUTH_URL | startswith("https://")'`, que imprime
      **apenas `true`/`false`**.)*
      **Contexto que limita a urgência:** `main` está parada em `431e989` servindo a coming-soon, e
      existem **2 usuários** (admin + member). Mesmo no pior caso, a exposição hoje é a sessão do
      próprio operador — não há aluno com sessão em produção. **Isso muda no primeiro merge**, que
      é quando o fix precisa já estar dentro.
- [x] **Teste de servidor no MESMO commit dos quatro** — é fronteira, então a exceção da *fronteira
      transversal* se aplica: supertest, sem teste de componente. Os de vazamento viram os casos
      **(11–12)** da lista da Fase 4; quando a fase chegar, o checkbox de lá **aponta para cá** em
      vez de reescrever.
- [x] **`get_advisors(type='security')` nos DOIS projetos — ✅ VERDE, e fecha uma divergência
      aberta.** *(Ago 2026, via MCP.)* Produção (`gaxmbnhwltljlkukdwba`) e teste
      (`mvaobzypsiuhqzipcelw`) devolvem **exatamente o mesmo resultado**: **11 tabelas, 11 avisos
      `rls_enabled_no_policy` de nível INFO, ZERO erro `rls_disabled_in_public`** — que é o estado
      desejado descrito no `CLAUDE.md`, não uma lacuna.
      **O que isto prova além do óbvio:** o banco de teste foi construído **só a partir das
      migrations versionadas** (`_prisma_migrations` = 4 linhas) e chegou **idêntico** à produção.
      Era exatamente essa comparação que o `CLAUDE.md` pede quando diz que *`get_advisors` responde
      "ESTE banco está ok", nunca "o REPO produz um banco ok"* — agora responde as duas.
      **Não é fechamento novo, é RE-verificação independente:** o backlog P2 nº 5
      (`_prisma_migrations` sem RLS no teste) já havia sido fechado pela migration
      `20260824214838_rls_prisma_migrations_table`, e esta leitura confirma que o estado **se
      manteve** nos dois bancos. Registrado assim de propósito — dizer "eu resolvi" o que já estava
      resolvido é o tipo de crédito errado que faz a próxima pessoa procurar um conserto que nunca
      houve.
      **⚠️ E o que esta verificação NÃO cobre, porque advisor não enxerga:** o *Automatic RLS*
      segue **ligado em produção e desligado no teste** — divergência **viva** registrada no
      changelog (9) deste plano. Ela não afeta tabela nossa (nossas migrations ligam RLS
      explicitamente), mas afeta **qualquer tabela criada fora delas**. Continua sendo decisão do
      operador, no painel do fornecedor: recomendação é **desligar em produção**, para que os dois
      ambientes dependam só do versionamento.

**T3 — XSS: a convenção agora, o helper no bloco que o usa.** A defesa que o repo tem hoje é a
proibição de `dangerouslySetInnerHTML` — uma regra **do React**. A superfície pública decidida em
Ago 2026 **sai do React**, e a proteção não migra sozinha: template de string no Express não
escapa nada.

- [x] **Convenção escrita** em `CLAUDE.md` → Rendering Boundary (mesma passada que criou este
      bloco). É o item que tem custo zero e prazo curto: precisa existir **antes** de alguém
      escrever o primeiro template, não depois.
- [ ] O helper (`escapeHtml`/`jsonLd`) + teste unitário ficam **no bloco da superfície indexável**,
      não aqui. **Razão:** função escrita dois meses antes de ter uso é função que alguém esquece
      que existe e reimplementa — *na dúvida, remove* (critério de decisão de stack). A convenção
      é o que sobrevive à espera; o código, não.

**T4 — LOGIN: a primeira tela fechada de verdade, e o molde que se repete.**

> **⚠️ ACHADO (Ago 2026) — `LoginPage.test.tsx` EXISTE e não cobre nada.** São 12 linhas que
> renderizam e conferem que três nós existem, com `expect(...).toBeTruthy()` — **o anti-padrão
> nomeado com todas as letras em `CLAUDE.md` → Test quality**. **Provado por MUTAÇÃO, não por
> leitura:** removendo o tratamento de erro inteiro do `onSubmit` (o 401, o erro genérico, o
> `console.error`), a suíte deu **`Test Files 9 passed · Tests 23 passed`**. Ou seja: o login pode
> parar de reportar senha errada e **nada no repo avisa**.
> **Por que isto vale mais que a lacuna em si:** um arquivo `.test.tsx` presente e verde é *pior*
> que arquivo nenhum — ele responde "essa tela tem teste" para quem for procurar, e desliga a
> pergunta. É a mesma família do `lint` que rodava `tsc --noEmit` e da trava `_test` que nunca
> disparava: **parece proteção e não protege**. O `.test.tsx` é reescrito, não acrescentado.

- [ ] **GRUPO A — sete testes, um por ramo real de
      [`LoginPage.tsx`](../client/src/pages/LoginPage.tsx)** (a lista sai do código, não de um
      modelo genérico de formulário):
      **(1)** e-mail inválido → mensagem do `loginSchema`, e `signIn.email` **não** é chamado ·
      **(2)** campos vazios → idem · **(3)** erro **401** → *"E-mail ou senha incorretos."* ·
      **(4)** erro **não-401** (500) → *"Não foi possível entrar agora. Tente novamente."* ·
      **(5)** sucesso → navega para `/conta` com `replace` · **(6)** durante o envio → botão
      **desabilitado** e rótulo *"Entrando…"* · **(7)** sessão já ativa → redireciona sem
      renderizar o formulário.

- [ ] **GRUPO B — sete erros clássicos.** Os três primeiros **não são hipótese: foram medidos**
      contra o `loginSchema` real (`core/src/schemas/auth.ts`) em Ago 2026.
      **(8) e (9) — RESOLVIDOS JUNTOS por uma mudança no `loginSchema`, verificada antes de
      propor.** O impasse aparente era: senha só de espaços (`"   "`) **PASSA** `[MEDIDO]`, e-mail
      com espaço nas pontas é **REJEITADO** `[MEDIDO]` — mas `.trim()` na senha **não é opção**,
      porque alteraria os bytes enviados e trancaria para fora quem tem espaço na senha de verdade.
      **A saída é separar VALIDAR de TRANSFORMAR:**
      ```ts
      email:    z.string().trim().email("Informe um e-mail válido."),
      // .refine VALIDA sem TRANSFORMAR — a senha segue byte a byte a que foi digitada.
      password: z.string().min(1, "Informe sua senha.")
                 .refine((v) => v.trim().length > 0, "Informe sua senha."),
      ```
      **Comportamento medido com a proposta aplicada:** `" a@b.com "` → vira `"a@b.com"` e passa ·
      `"   "` na senha → **rejeitado com a mensagem certa**, em vez de virar um 401 que mente ·
      `"  senha com espaços  "` → **preservada byte a byte** · `A@B.COM` → segue passando no
      client, porque **quem decide caixa de e-mail é o servidor** (é o teste (10)).
      **Cobertura de teste que isto exige:** um teste para o e-mail trimado, um para a senha só de
      espaços, e — o que **trava a regra** — um afirmando que a senha com espaços nas pontas
      **chega intacta** ao `signIn.email`. Sem esse terceiro, um "simplifica isso aí" futuro põe
      `.trim()` na senha e ninguém percebe até o chamado de suporte.
      **Escopo:** mexe em `core/src/schemas/auth.ts`, que é do `core/` compartilhado — o login é o
      único consumidor hoje, então o raio é pequeno.
      **(10) E-mail em MAIÚSCULAS (`A@B.COM`) — `PASSA` o schema** `[MEDIDO]`, mas **quem decide é
      o servidor**: se o Better Auth casar e-mail com sensibilidade a caixa, este é o chamado
      clássico de *"não consigo entrar"*. **Não é respondível lendo o client** — vira **teste de
      servidor** (supertest: semear `admin@x.com`, autenticar com `ADMIN@X.COM`).
      **(11) Senha com espaço nas pontas (`"senha "`) NÃO pode ser trimada.** Teste que trava o
      comportamento: senha é bytes do usuário. Trimar senha **tranca gente para fora** e o suporte
      nunca descobre por quê — é o inverso exato do (9), e é por isso que os dois andam juntos.
      **(12) Duplo clique no botão** → `signIn.email` chamado **uma vez só**. O `disabled={isSubmitting}`
      (`:90`) deveria cobrir; o teste prova. Sem isso, duas requisições de login concorrentes.
      **(13) Erro anterior some no envio seguinte.** `setFormError(null)` (`:28`) deveria limpar;
      o clássico é o aluno corrigir a senha e continuar lendo o erro velho, achando que falhou de novo.
      **(14) `signIn.email` REJEITA (throw) em vez de devolver `{ error }`.** O `onSubmit`
      (`:27-45`) **não tem `try/catch`** — ele espera sempre a forma `{ error }`. Numa queda de rede,
      se a promise rejeitar, a rejeição escapa do handler. **Este teste é investigativo: ele revela
      o comportamento, e pode virar achado** — mesma família do `try/catch` sem `await` do webhook
      já registrado no `CLAUDE.md`. Se virar achado, o fix entra no mesmo bloco.
- [ ] **(3) e (4) são o par que carrega o valor do bloco** — o `onSubmit` distingue os dois de
      propósito (`LoginPage.tsx:36-41`), e o bug clássico é colapsar tudo em "senha incorreta",
      que faz o aluno tentar de novo para sempre enquanto o servidor está fora. **Um teste só, do
      caminho feliz, não pega isso.** Escrever os dois separados ou não escrever nenhum.
- [ ] **Mock em `@/lib/auth-client`** (a nossa fronteira), nunca no `better-auth/react` — o
      arquivo atual já acerta nisso; é a única coisa dele que se aproveita.
- [ ] **`renderWithProviders`** (`@/test-utils`) em vez do `MemoryRouter` montado à mão.
      **⚠️ Detalhe de implementação que vai aparecer no meio do caminho:** o helper monta **uma**
      rota só (`path`, default `"*"`), então o teste (5) não tem `/conta` onde aterrissar. Resolver
      **estendendo o helper** com uma rota extra opcional — não mockando `useNavigate`, que testaria
      implementação em vez de comportamento observável.
- [x] **Prova por mutação — feita, e o contraste é o resultado do bloco.** A MESMA mutação (apagar
      o tratamento de erro do `onSubmit`) que antes dava **23/23 verde** agora derruba **4 testes**;
      revertida, **35/35**. O arquivo antigo tinha 12 linhas e não podia falhar; o novo tem 13
      testes e falha quando deve.
- [x] **BUG REAL ENCONTRADO PELO TESTE (14), não por leitura.** `signIn.email` normalmente resolve
      com `{ error }`, mas numa **queda de rede ela REJEITA** — e o `onSubmit` não tinha `try/catch`.
      A rejeição escapava do handler: **nenhuma mensagem aparecia e o botão ficava preso em
      "Entrando…"**, sem a pessoa saber o que houve. O teste falhou de primeira, o `try/catch`
      entrou, e passou. *Registrado porque é o argumento inteiro do passo 8 em uma frase: o teste
      investigativo pagou por si mesmo na primeira execução.*
- [x] **`loginSchema` mudado** (`core/src/schemas/auth.ts`): `.trim()` no e-mail (transforma) e
      `.refine()` na senha (valida sem transformar). Consumidor único é o `LoginPage`.
- [x] **`renderWithProviders` ganhou `extraRoutes`** — sem uma rota de destino, o teste de "entrou
      e foi redirecionado" não tinha o que assertar. A alternativa era mockar `useNavigate`, que
      testaria implementação; um marcador na rota de destino testa comportamento observável.
- [x] **Sem dependência nova:** usado `fireEvent` + `waitFor`, o idioma que os testes existentes já
      usam. `@testing-library/user-event` não está instalado e não foi instalado — dependência é
      decisão de plano, não `npm install` no meio do bloco.
- [x] **SUÍTE DE SERVIDOR DO LOGIN — `server/src/test/login.test.ts`, 10 testes.** É o critério 4
      (*rota que toca acesso exige teste de servidor*), e faltava: os 13 testes de tela mockam a
      API, logo provam que o formulário se comporta — **nenhum prova que o servidor recusa quem
      deve recusar**. Cobre: credencial correta emite sessão UTILIZÁVEL (linha criada não prova
      sessão) · senha errada, e-mail inexistente, senha vazia e senha só de espaços → **401
      exato** · **cadastro público → 400 `EMAIL_PASSWORD_SIGN_UP_DISABLED`** · cookie com
      `httpOnly` e `sameSite`.
      **Achado que vale além do login — ENUMERAÇÃO DE USUÁRIO está fechada:** senha errada e e-mail
      inexistente devolvem status **e corpo idênticos** (`INVALID_EMAIL_OR_PASSWORD`), então
      ninguém descobre quais e-mails têm conta na escola sem ter a senha. Havia um teste para isso
      porque é propriedade de segurança de qualquer login, não porque suspeitávamos.
- [x] **Caso (10) RESOLVIDO por medição: e-mail em MAIÚSCULAS AUTENTICA** — o Better Auth normaliza
      a caixa. O chamado de suporte que se temia não existe. O teste fica no repo com falha
      explicativa, para que uma regressão futura apareça no CI em vez de na caixa de entrada.
- [x] **Asserções apertadas depois de MEDIR os status reais.** A primeira versão usava
      `not.toBe(200)` — que **um 500 satisfaz**: servidor quebrado seria lido como "acesso negado
      corretamente". Trocado por 401/400 exatos. *Mesmo defeito de família do `.toBeTruthy()` que
      condenou o teste antigo desta tela, agora encontrado no próprio código novo.*
- [x] **Dois últimos casos do login fechados.** **(a) E2E: a sessão sobrevive ao F5** — é o caso
      que só um browser prova (componente mockaria a sessão; servidor não guarda cookie). O sintoma
      que ele evita: o aluno entra, aperta F5, é deslogado e desiste antes de abrir chamado.
      **(b) Servidor: aluno excluído (LGPD) não obtém acesso** — o `deletedAt` marca sem apagar, e
      o teste prova que o cookie eventualmente emitido **não abre nada** (`/api/me` → 401). Mutado
      o `deletedAt` de `middleware/auth.ts:31`, a suíte **reprova**.
- [x] **ACHADO DE MÉTODO (registrado como convenção no `CLAUDE.md` → Testing): E2E não prova a
      fronteira do servidor.** Mutando `loadSession` para devolver `null` sempre — servidor
      recusando TODA sessão — os **7 testes de E2E passaram**. A tela resolve "estou logado?" pelo
      cliente do Better Auth; o middleware protege as rotas de **dados**, que a navegação não
      exerce. A mesma mutação reprova a suíte de servidor. **É fácil olhar "E2E verde" e concluir
      que o acesso está provado; não está, e a conclusão errada é indetectável.**
- [x] **Honestidade sobre o teste de F5:** ele passa, mas **não achei mutação que só ele pegue** —
      os testes existentes já fazem `page.goto()` depois do login, que é igualmente um carregamento
      de página completo. Valor único baixo; fica porque nomeia a intenção explicitamente e custa
      ~1s de CI. Registrado em vez de omitido, porque cobertura que não se sabe medir é a mesma
      família do teste que não pode falhar.
- [x] **Prova por mutação da suíte de servidor:** `disableSignUp: true → false` derruba o teste de
      cadastro (`expected 200 to be 400`); revertido, 13/13.
      **⚠️ LIÇÃO REGISTRADA — a mutação FALHOU EM APLICAR duas vezes nesta sessão, e nas duas o
      output verde parecia aprovação.** Na primeira, o padrão casou um **comentário** em vez da
      configuração; na segunda (bloco T1) o guard era rota-pai e o script abortou sem escrever.
      **Toda mutação passa a exigir verificação de que ela de fato entrou no arquivo** — imprimir a
      linha alterada antes de rodar a suíte. Mutação que não aplica é a mesma família do teste que
      não pode falhar: dá confiança sem dar informação.

**T5 — a cadência, escrita uma vez para não ser redecidida por tela.**

> **DECISÃO DO OPERADOR (Ago 2026): fase não fecha sem teste — e o gatilho é TOCAR a tela, não a
> data da fase.** Isto **refina, não reverte**, o *"vale daqui pra frente"* da *Definição de pronto
> por fatia*: não se volta para cobrir tela parada, mas **toda tela que entra em trabalho sai
> fechada**. **Razão do operador: evitar retrabalho** — descobrir o defeito na tela seguinte custa
> reabrir a anterior, e reabrir é o que consome a sessão de quem trabalha sozinho e em semanas
> alternadas. *Gatilho de reabertura: se a cadência começar a segurar entrega — duas telas seguidas
> em que o teste custou mais que a feature —, o problema é o tamanho da fatia, não a regra.*

Ao fechar **qualquer** tela, nesta ordem (é a *Definição de pronto por fatia* do `CLAUDE.md`,
tornada executável — não uma lista nova):
1. Caminho feliz funciona no browser.
2. **Loading, erro e vazio existem** na tela.
3. **Um teste de componente por estado acima** + um por ramo de decisão do arquivo.
4. **Teste de servidor SE a rota tocar acesso ou dinheiro** (aí é fatia própria: supertest, sem
   teste de componente — a fronteira não tem tela).
5. **Mutação:** quebrar de propósito o ramo mais importante e confirmar que a suíte **reprova**.
   *Sem este passo os 4 anteriores não provam nada — é o que este bloco acabou de demonstrar.*
6. CI verde · diff revisado · checkbox e doc no **MESMO** commit.

- **Done when (Bloco T):** existe job E2E no CI e ele **reprova por mutação** · os **quatro** P1
  fecham com teste de servidor no mesmo commit · a convenção de escape está no `CLAUDE.md` · **a
  tela de login fecha pelos 6 passos do T5, e a mutação do `onSubmit` reprova a suíte**.
  **Não** inclui escrever template público nenhum — isso é o bloco da superfície indexável, depois
  do Bunny.

#### Velocidade e confiabilidade da suíte *(05/10/2026 — pedido do operador: "fazer do jeito certo, como as empresas grandes")*

> Medido antes de mexer: a suíte inteira leva ~50 s na máquina do operador (tela 11 s,
> servidor 38 s) e ~4 min no CI, dos quais ~1 min 37 s é instalar as bibliotecas. O número de
> testes **não** era o gargalo. O modelo adotado é o do Google (TAP): **durante o trabalho, só os
> testes afetados; antes de publicar, todos** — a suíte inteira continua sendo o gate.

- [x] **As falhas intermitentes da suíte de servidor, com causa provada e corrigida.** O supertest
      abria um servidor por pedido sem endereço; no macOS, outro programa que abra depois só em
      `127.0.0.1` (Antigravity, VS Code) toma a mesma porta — 200 de 200 no experimento — e
      responde no lugar do teste ("Invalid CSRF token"). Agora cada arquivo usa um servidor em
      `127.0.0.1` (`server/src/test/servidor.ts`; 0 de 200), e `servidor.test.ts` reprova se algum
      teste voltar a usar o `app` direto. Mutação: o servidor sem endereço e um `request(app)` num
      teste — as duas reprovam.
- [x] **Durante o trabalho, só os testes afetados** (`npm run test:changed`); antes de commitar e
      de publicar, a suíte inteira (`CLAUDE.md` → Commands). Medido: mudar um componente roda 3
      arquivos da tela em vez de 51; mudar o dicionário no `core` roda todos (`forceRerunTriggers`);
      no servidor, uma rota roda 34 de 40 arquivos — quase tudo passa pelo `app`, de propósito.
- [x] **A ferramenta do esquema do Better Auth, trocada pela oficial** *(05/10/2026, pedido do
      operador)*. O `@better-auth/cli` parou na 1.4.21 (o site está na 1.7.5) e trazia um SQLite,
      o Drizzle e uma segunda cópia do Better Auth. Desde o 1.5 o sucessor é o pacote `auth`, do
      mesmo repositório e com a mesma numeração: entrou fixo na 1.7.5 (`npm --workspace server run
      auth:generate`), e `better-auth-cli.test.ts` reprova se ele e o `better-auth` divergirem.
      **Conferido:** gerado com a 1.7.5 a partir do nosso `auth.ts`, numa cópia, o esquema não
      muda nenhum campo — o banco já estava certo para a versão do site. **Efeito medido:**
      vulnerabilidades apontadas nas dependências 25 → 17 (a crítica sumiu; altas 12 → 9) e 779 →
      745 pacotes. Docs check (context7): Better Auth → `/better-auth/better-auth` → o CLI novo
      (`npx auth`, blog do 1.5) e as opções do `generate`.
- [x] **CI mais rápido:** as bibliotecas instaladas guardadas entre uma execução e outra
      (`node_modules` por `package-lock` + Node 20; `npm ci` só quando a chave muda). **Medido no
      mesmo commit, sem e com o cache:** job principal 4 min 4 s → 2 min 22 s; E2E 2 min 22 s →
      1 min 18 s. Mudar qualquer dependência muda a chave e a primeira execução volta a instalar.
      O navegador do Playwright segue sem cache (a doc dele desaconselha: restaurar custa quase o
      mesmo que baixar).

#### Postura de segurança — o que JÁ está coberto  *(varredura completa do `security-vulnerability-reviewer`, Ago 2026, branch `dev` @ `d9b22ea`)*

> **Por que isto está escrito:** sem inventário, toda auditoria futura re-descobre o mesmo chão e
> "propõe" proteção que já existe — o mesmo desperdício que o `decisions-archive` evita do lado das
> decisões. **Cada linha tem o arquivo que a prova**; nenhuma é afirmação de memória.

- **Fronteira de acesso:** `requireAuth`/`requireAdmin` compartilham `loadSession()`
  (`middleware/auth.ts:27-35`), que rejeita `deletedAt` **antes** de qualquer uso — soft-delete vale
  para os dois guards · `requireAdmin` faz auth antes de papel (401 sem sessão, 403 não-admin,
  `:61-69`) e compara com `Role.ADMIN`, nunca literal · **`userId` nunca vem do client** — toda rota
  de dono lê `req.user.id` da sessão · `isTemplate`/`ownerUserId` são forçados no servidor e
  **ausentes do Zod**, então membro não fabrica template · `/trilhas/mine` registrada **antes** de
  `/trilhas/:slug`, então `:slug` não captura `mine`.
- **Leitura pública:** `/api/courses` e `/api/courses/:slug` filtram `PUBLISHED` em curso **e**
  módulo **e** aula · `/api/search` faz a cadeia completa — **é a referência correta do repo** ·
  leituras admin de qualquer status vivem sob `/api/admin/*`.
- **Validação:** **todas** as rotas que recebem body usam `validate()`; nenhuma escapou. Todo `:id`
  numérico passa por `parseId`.
- **Segredos:** zero segredo hardcoded no repo · **zero `VITE_*` e zero `import.meta.env`** no
  client, então nenhuma superfície de env chega ao bundle · `.gitignore` com o padrão correto
  (`.claude/*` + `!.claude/agents/`, `.env.*` + `!.env.example`) · **zero `console.*` em qualquer
  handler** · em produção o stack **não** vai no corpo da resposta (`NODE_ENV=production` fixado no
  Dockerfile).
- **Auth:** `disableSignUp: true` · `role`/`deletedAt`/`marketingConsent`/`acquisition*` todos com
  `input: false` · Better Auth montado **antes** do `express.json()` com `.catch(next)` ·
  `trustedOrigins` é allow-list que devolve `[]` em produção para origens de dev.
- **Client:** **zero `dangerouslySetInnerHTML`**, zero `innerHTML`, zero `eval` · o único sink de
  URL vinda do servidor é `<img src={course.thumbnailUrl}>` (`CourseCard.tsx:28`) — **não existe
  nenhum `<a href={dadoDoServidor}>`** · Axios com `baseURL` relativo, sem `cors` instalado,
  coerente com o desenho de mesma origem.
- **RLS: 11/11 tabelas**, cada uma na MESMA migration que a criou — as 4 do Better Auth, as 6 de
  conteúdo/trilhas, e `_prisma_migrations`. *(Prova estática; a confirmação no banco vivo é o
  checkbox de `get_advisors` acima.)*
- **Travas de banco de teste:** `TEST_DB_REF` verifica **identidade** do ref e roda antes de
  qualquer conexão; `childEnv()` passa o ambiente explicitamente para não herdar `server/.env`.

#### Backlog P2 — endurecimento (não bloqueia o Bloco T; ordenado por quando o risco aparece)

- [ ] **`app.ts` não tem handler de erro nenhum** — o único rastro de um 500 hoje é o `logerror`
      default do Express: `console.error(err.stack)`, cru e sem redação. **É pré-requisito da Fase
      4**, não polish: o checklist do webhook exige registrar "IDs + status", e não existe lugar que
      faça isso; um stack cru de cliente Stripe/Bunny/Resend é exatamente o que carrega chave ou
      payload inteiro para o log do Railway. Handler terminal logando
      `{ method, path, status, errorName, message }` — **nunca `err.stack` verbatim**.
- [ ] **`.max()` nos campos de texto autorados** (`core/src/schemas/content.ts:29-41,56-73`) e
      ~~**trocar `z.string().url()` por checagem explícita de esquema** em `thumbnailUrl`~~ *(esta
      metade FEITA em 27/09, na etapa 1 do C4)*. **`.max()` FEITO em 27/09 para título, subtítulo,
      slug e descrição do curso** (Bloco B); falta nos demais: listas do curso, destaques, FAQ,
      títulos de módulo e aula, e nome e descrição da trilha — ver a
      convenção nova em `CLAUDE.md` → Shared `core/` package (o `.url()` aceita `javascript:` e
      `data:text/html`, **medido neste repo**, não suposto).
- [x] *(Feito em 27/09, no Bloco U, etapa 2: `bunnyVideoIdSchema` em `core/src/schemas/content.ts`.)*
      **`introVideoId` sem formato** (`content.ts:70`) — hoje inerte, mas na Fase 3 esse valor vai
      ser interpolado numa URL/iframe do Bunny **numa rota de HTML de servidor sem escape
      automático**. Restringir ao GUID do Bunny Stream; **confirmar o formato exato via context7
      `/bunnyway/documentation`** (query dizendo "Stream") na MESMA chamada que a fase já exige.
      Custa zero agora, caro depois do template existir.
- [ ] **Escritas admin fora de `/api/admin/*`** (`courses.ts:138,150,171` · `modules.ts` ·
      `lessons.ts` · `trilhas.ts:139`). O `requireAdmin` **está presente em todas** — nada exposto
      hoje. O achado é que **o path deixou de codificar a fronteira**: `POST /api/courses` parece
      rota pública, e uma rota nova acrescentada ao lado herda o path público e **nenhum middleware
      por default**, com o erro invisível no diff. Alternativa mais barata que mover tudo:
      `router.use("/admin", requireAdmin)`, para prefixo e guard virarem o mesmo fato.
- [ ] **Token de preview no query string** comparado com `===` (`app.ts:80-92`). Impacto baixo (o
      ativo é o bypass da coming-soon), mas **contradiz "nunca logar segredo" por construção**:
      token em URL é gravado por proxy, histórico e `Referer` — o operador não tem como evitar o
      log. Receber por header/POST + `crypto.timingSafeEqual`.
- [ ] **`seed.ts:101` despeja o objeto de erro inteiro** (`console.error("Seed failed:", err)`), e o
      caminho passa por `signUpEmail({ body: { password } })` — o `APIError` do Better Auth
      serializa seu `body`. O padrão correto está no arquivo ao lado (`rotate-credentials.ts:157`,
      só `err.message`). Idem `seed-content.ts:165`.
- [ ] **Sem `helmet`** — nenhum header de segurança. Hoje o que expõe é estreito (app mesma-origem,
      sem `dangerouslySetInnerHTML`, sem sink de `href`): falta `nosniff`, falta
      `X-Frame-Options`/`frame-ancestors` (**a app pode ser enquadrada** → clickjacking em
      `/aluno/conta`, `/dashboard` e `/admin/*`), falta `Referrer-Policy` — que é justamente o que faz a URL `/__preview?token=`
      vazar. **Entra no MESMO bloco que introduzir o HTML público de servidor**, não antes: a CSP
      precisa conhecer a origem do Bunny (`frame-src`) e a da Stripe (`script-src`), e escrita antes
      é escrita duas vezes. Dependência de runtime nova ⇒ **decisão de nível de plano**.
      *(07/10/2026: o **`Cross-Origin-Opener-Policy`** entrou sozinho, sem dependência, pela revisão
      de segurança do Bloco AULA, etapa 6 — em toda resposta, `server/src/app.ts`, com teste. Os
      outros — `X-Frame-Options`/`frame-ancestors`, `nosniff`, `Referrer-Policy`, CSP — seguem
      aqui.)*
- [ ] **Nenhum limite de pedidos por conta na API do aluno** *(achado P2 da revisão de segurança do
      Bloco AULA, etapa 1, 06/10/2026)*. O `POST /api/lessons/:id/ponto` nasceu para ser chamado em
      intervalo (a cada ~15 s com o vídeo tocando) e custa ~5 idas ao banco; quem tem conta pode
      repeti-lo sem teto contra o Neon. **Não é só dele:** o `GET /api/lessons/:id/aula`, mais
      pesado, também não tem limite — então a decisão é um limite **por conta, para a API logada**,
      e não um remendo numa rota. O risco é carga, não dado: o índice único (pessoa × aula) segura o
      número de linhas, e o cadastro é fechado. `express-rate-limit` é dependência nova ⇒ **decisão
      de plano**; um contador em memória é a alternativa sem dependência. *Esta decisão se reabre
      (vira prioridade) com o primeiro aluno pagante, ou com qualquer sinal de abuso no log.*
- [ ] **Endereço de API que não existe responde 200 com a página do app** *(achado na publicação de
      06/10/2026, NÃO consertado — fora do pedido)*. Medido no ar: `GET /api/rota-que-nao-existe`
      devolve o HTML do React com 200, em vez de 404. Hoje o app só chama rotas que existem, então
      nada quebra; o risco é o dia em que uma chamada nova errar o endereço — ela "dá certo" com
      HTML, em silêncio, em vez de falhar alto. O conserto é um 404 em JSON para todo `/api/*` que
      nenhuma rota atendeu, antes do app. Decisão do operador quando mexer no servidor.

### Bloco S — Shell do aluno: menu lateral e, depois, painel  *(Ago 2026 · direção do operador)*

> **DIREÇÃO DECIDIDA: o modelo é o LinkedIn Learning, não o Udemy nem o Mosh.**
> *(Operador, Ago 2026, comparando as três referências.)* Udemy usa barra de ícones sem rótulo —
> econômica em espaço, mas exige aprender os ícones. Mosh usa menu horizontal no topo — não cresce.
> **LinkedIn: barra lateral com ícone + rótulo, agrupada por seção** — é a que suporta o destino
> real desta tela.
>
> **O destino é um PAINEL DE ESTUDO**, não uma home institucional: progresso, o que falta concluir,
> o que estudar em seguida, trilhas em andamento. Isso é o que decide o formato — um painel tem
> muitas entradas e vai ganhar mais; menu de topo satura, barra lateral não.

- [x] **Já em vigor:** link "Minha conta" no cabeçalho, e **o login cai em `/inicio`** — a home do
      aluno. *Nem a conta (destino de TAREFA: mudar dados, assinatura) nem o catálogo (uma SEÇÃO da
      home, não o começo dela).* Destino declarado numa constante única (`POS_LOGIN` em
      `LoginPage.tsx`): quando a home virar painel, nada mais muda de lugar.
      **`StudentHomePage` nasce magra de propósito** — saudação, o vazio de "continue estudando" e
      a porta para o catálogo. **Não busca dados**, e por isso não tem estado de carregando nem de
      erro; quando passar a buscar, os três entram junto com os testes deles. O conteúdo real
      **depende da Fase 5** (progresso): sem `LessonProgress` não existe "o que você estava vendo",
      e encher a tela com dado de mentira esconderia a dependência.
- [x] **DOIS ACHADOS que só apareceram porque o E2E agora roda:**
      **(a)** `CardTitle` renderiza uma `div`, não um cabeçalho — a página da conta **não tinha
      título nenhum** para leitor de tela, que navega por títulos. Ganhou um `<h1>` de verdade
      (mesmo padrão do `AdminPage`).
      **(b)** O teste de logout ficou instável enquanto o destino pós-login era o **catálogo**, que
      busca dados; com a home, que não busca, estabilizou. *Registrado porque a causa provável —
      clicar durante uma busca em andamento — vai reaparecer quando a home passar a buscar, e aí a
      spec precisa esperar o dado, não o navegador.*
- [x] **Cabeçalho provisório completo:** Início · Catálogo · Minha conta · Sair (+ Admin por
      papel), e **a marca leva para `/inicio` quando há sessão** — logada, ela levava para a landing
      pública, ou seja, mandava quem já assina de volta para a página que tenta convencê-lo a
      assinar. **Lacuna fechada junto: o `Layout` nunca teve teste**, apesar de ser ele que decide o
      que cada papel enxerga. 6 testes (visitante / aluno / admin); o que mais importa é o aluno
      **não ver o item Admin** — não é sobre acesso (o servidor barra, e isso já é testado), é sobre
      não anunciar a existência de uma área que não é dele. Mutação derruba.
- [x] Barra lateral (ícone + rótulo, agrupada), substituindo o link provisório do cabeçalho.
      **ESCOPO — a MESMA barra serve os DOIS ambientes** *(operador, Ago 2026)*: área do aluno **e**
      área administrativa inteira. Não são dois componentes; é um, com itens diferentes por papel —
      dois componentes divergem em espaçamento, comportamento e estados de foco, e a divergência
      aparece como "o admin parece outro site".
      ✅ **Set 2026.** `AppSidebar.tsx`, um componente, itens por papel. O `Layout` escolhe pela
      sessão: sem sessão o cabeçalho público de hoje, com sessão a barra — **o cromo segue a
      pessoa, não a rota**, então o aluno logado mantém a barra no catálogo, que é rota pública.
- [x] **Retraída ↔ expandida, como na Udemy** — recolhida mostra só ícone, expande ao passar o
      mouse; e o estado escolhido **persiste** (quem recolheu não quer recolher de novo a cada
      visita). **Trava de acessibilidade:** expandir só por mouse exclui quem navega por teclado —
      o rótulo tem que estar sempre disponível para leitor de tela (via `aria-label` ou texto
      visualmente oculto), mesmo com a barra recolhida. Mesma regra do destaque de erro do login:
      **a informação nunca pode existir só no visual.**
      ✅ **Set 2026, com DOIS achados que o texto acima não previa:**
      **(a) A persistência NÃO vinha de graça** — a peça do shadcn *escreve* o cookie e nunca o
      lê; quem lê, no desenho dela, é um servidor que renderiza a página, e num app Vite ele não
      existe. A barra voltaria aberta **sempre**, sem erro e sem log. O `Layout` passou a ler o
      cookie (`barraComecaAberta()`), e o `SIDEBAR_COOKIE_NAME` virou export para não haver um
      literal repetido que divergisse em silêncio. Tem teste nos três casos.
      **(b) A trava de acessibilidade já estava satisfeita — mas por acidente, e agora tem
      guarda.** O shadcn recorta o rótulo com `overflow`, não com `display:none`, então ele
      permanece na árvore de acessibilidade. Isso é fácil de "otimizar" para `display:none` sem
      ninguém notar, porque a tela fica idêntica; o teste da barra recolhida existe para reprovar
      quem tentar.
- [x] **Painel do aluno** como destino pós-login: progresso, próxima aula, trilhas em andamento.
      **Direção do operador (28/09/2026):** a tela de **Início é o painel do aluno, rica**, com o
      que ele tem disponível **a um clique**; o menu continua na barra lateral, e o painel nasce
      preparado para **ganhar itens no futuro**.
      ✅ **29/09/2026 (etapa 3), com os 4 blocos que o operador escolheu ao aprovar o plano:**
      saudação · **Continue estudando — EM BREVE** · **Minhas trilhas** (até 3 salvas + "Ver
      todas"; carregando, erro e vazio) · **Atalhos** (Cursos e Trilhas; JilsonAI e Certificados
      EM BREVE). Cada bloco é um componente em `components/inicio/`: bloco novo entra como mais
      uma linha no `StudentHomePage`. **Progresso e próxima aula continuam na Fase 5** — ver o
      checkbox "tirar o EM BREVE" lá. Mutação: sem o ramo de erro de Minhas trilhas, a suíte
      reprova. O E2E passou a esperar Minhas trilhas carregar depois do login (achado (b) acima).
- [x] **O menu do aluno novo** *(decisão do operador, 29/09/2026 — `design.md` §6, "O menu do
      aluno")*: **Início · Cursos · Trilhas · Meus estudos · JilsonAI**. "Trilhas" são as trilhas
      prontas; **Meus estudos** tem no nível 2 **Em andamento · Minhas trilhas · Concluídos ·
      Certificados** (EM BREVE o que ainda não existe). "Minhas trilhas" e "Certificados" saem do
      menu principal. Sem "Salvos" (a trilha personalizada faz esse papel) *(revisto em 03/10/2026: o operador decidiu ter
      "Salvos", como no LinkedIn, depois de Minhas trilhas — ver Fase 5)*. Anda junto com o item
      abaixo (as telas sob `/aluno/*`) e com o painel do Início.
      ✅ **29/09/2026 (etapa 2):** o mapa (`navigation.ts`) com os cinco itens; o **JilsonAI
      aparece para o aluno como EM BREVE** e **Meus estudos tem tela própria**
      (`/aluno/meus-estudos`, um cartão por item) — as duas decididas pelo operador ao aprovar o
      plano. *(A tela de cartões saiu no mesmo dia: ver "Meus estudos sem repetição", abaixo.)* O que é planejado passou a aparecer para o aluno (`secoesVisiveis`), sempre como
      texto; a etiqueta EM BREVE saiu do dicionário (em inglês, "COMING SOON"; no admin, sempre
      em português). Mutação: virar link um item EM BREVE (nível 2 ou rail) e voltar a esconder o
      planejado do aluno — as três reprovam.
- [x] **O Início do admin é o painel dele** *(decisão do operador, 29/09/2026)*: logado como
      admin, "Início" leva a `/admin` e é para lá que ele vai depois de entrar; o aluno continua no
      painel dele. O painel do admin: os 4 relatórios de "Dados" (EM BREVE, sem link, cada um
      dizendo quando chega) e os atalhos de antes embaixo (Trilhas virou EM BREVE: a tela não
      existe). "Dados" saiu do menu. No mapa, cada Início tem o seu `papel`, e o teste de rótulo e
      ícone únicos passou a valer por menu. O papel, depois de entrar, sai da resposta do próprio
      login (conferido no Better Auth 1.7.5 instalado). Mutação: admin mandado ao Início do aluno,
      relatório EM BREVE virando link, Início do aluno de volta ao menu do admin — as três
      reprovam.
      **Refinado pelo operador no mesmo dia (item abaixo):** o Início voltou a ser um só.
- [x] **A plataforma é uma só: Início em `/inicio` para todos + "Dashboard" do admin**
      *(decisão do operador, 29/09/2026 — refina o item acima)*: o Início é o painel do aluno,
      o mesmo para o aluno e para o admin, que testa por ele tudo o que o aluno faz; todo mundo
      cai nele depois de entrar. O painel do admin passa a `/dashboard`, no item **"Dashboard"**
      logo antes de Cursos Admin (o que vem antes é do aluno; dali para baixo, administrativo),
      com o título "Dashboard". `/aluno/inicio` → `/inicio` e `/admin` → `/dashboard`
      redirecionam (`RotasAntigas.tsx`, que antes era `RotasAntigasDoAluno.tsx`); `/admin/cursos`
      e o resto não mudam. **Conferido no código:** o admin já usa tudo do lado do aluno — assiste
      pela rota de admin (vê até rascunho) e salva e edita trilhas como qualquer pessoa logada.
      Mutação: admin mandado ao Dashboard no login, sem o redirecionamento de `/admin`, e o
      Início escondido do admin — as três reprovam.
- [x] **Meus estudos sem repetição + fim dos endereços antigos** *(decisão do operador,
      29/09/2026, olhando a tela no ar)*: a tela `/aluno/meus-estudos` (um cartão por item)
      **saiu**, porque repetia o título e os itens da coluna. Meus estudos abre em **Em andamento**
      (`/aluno/em-andamento`), só com o título até a Fase 5; a coluna do nível 2 é o guia, e o
      título de cada página a identifica. No nível 2, Em andamento e Minhas trilhas são links;
      Concluídos e Certificados, EM BREVE. **Os 4 redirecionamentos saíram** (`/conta`,
      `/minhas-trilhas`, `/aluno/inicio`, `/admin`; `RotasAntigas.tsx` apagado): a escola está em
      desenvolvimento, e o que não se usa sai. No celular, Minhas trilhas fica acessível pelo
      "Ver todas" do Início. Mutação: Em andamento de volta a EM BREVE, e Meus estudos apontando
      para a tela removida — as duas reprovam.
- [x] **As telas do aluno passam para `/aluno/*`** *(decisão do operador, 28/09/2026, era a P15)*:
      `/inicio` → `/aluno/inicio`, `/conta` → `/aluno/conta` (com as subpáginas),
      `/minhas-trilhas` → `/aluno/minhas-trilhas`. Os endereços antigos **redirecionam** para os
      novos. Mudar agora porque só o operador e a conta de teste usam: com aluno real, quebraria
      link. Mexe no mapa de navegação, no destino pós-login (`POS_LOGIN`), nos testes e no E2E.
      **Depende da Fase 5** (captura de progresso) — sem `LessonProgress` não há o que mostrar, e
      construir a casca antes deixa uma tela vazia que ninguém sabe se está quebrada.
      **NOTA (Set 2026): a dependência encolheu.** "Trilhas em andamento" já tem dado real desde
      `GET /api/trilhas/mine` (Bloco 5) — só as barras de **progresso** ainda dependem da Fase 5.
      A home pode ganhar a seção de trilhas antes, e isso é fatia própria, não este bloco.
      ✅ **29/09/2026 (etapa 1 do bloco do menu novo):** `/aluno/inicio`, `/aluno/conta` e
      `/aluno/minhas-trilhas(/:id)`; os antigos redirecionam mantendo o resto do caminho e a busca
      (`RotasAntigasDoAluno.tsx`, 7 testes, mutação derruba). O login cai em `/aluno/inicio`, o
      aluno barrado no admin vai para `/aluno/conta`, e o botão "Meus estudos" do topo da home
      (logado) leva a `/aluno/inicio`. O E2E passou a exigir os endereços novos.
      *(Mais tarde, no mesmo dia, o operador ajustou: o Início voltou a `/inicio` e os
      redirecionamentos saíram — ver os itens acima.)*
- [x] Navegação mobile — o menu lateral obriga a decidir isto, que o cabeçalho atual adiava.
      ✅ **Set 2026:** gaveta (`Sheet`) abaixo de 768px, aberta pelo mesmo botão do cabeçalho.
      **A gaveta e a barra desktop NUNCA renderizam juntas** (o componente ramifica em
      `useIsMobile`) — verificado porque o risco previsto era nome duplicado no DOM, e ele não se
      materializou por aqui. Materializou-se **em outro lugar**: ver o achado do E2E abaixo.
- **Done when:** o aluno entra e vê para onde ir sem digitar URL; a conta é alcançável em 1 clique
  de qualquer tela. ✅ **CUMPRIDO (Set 2026)** para a navegação; o painel de progresso segue aberto
  acima, e é fatia da Fase 5.

#### Bloco S2 — NAVEGAÇÃO EM TRÊS NÍVEIS  *(direção do operador, Set 2026 — SUCEDE o Bloco S)*

> **O Bloco S entregou uma barra; este entrega um SISTEMA.** Registrado como bloco novo, e não
> como correção do anterior, porque o anterior **não estava errado** — o escopo é que mudou, e
> apagar aquele histórico esconderia que a barra simples existiu e funcionou.

**O que muda em relação ao que foi entregue** (referência: painel de instrutor da Udemy, capturas
do operador; especificação visual em `design.md` §13, que foi reescrito na mesma sessão):
- Rail **escuro** e **recolhido por padrão** — hoje é claro e nasce aberto.
- Expande **ao passar o mouse**, **sobrepondo** o conteúdo — hoje é botão de clique, e empurra.
- **Nível 2** (coluna secundária, com grupos retráteis) e **nível 3** (abas no topo) passam a
  existir, ligados por tela.
- Mobile vira **gaveta com navegação em profundidade** (`Comunicação ›` … `‹ Menu`) — hoje é
  gaveta de um nível só.

**O QUE DÁ VALOR AO BLOCO, e por que não é over-engineering:** a navegação inteira vira **dado**,
num mapa único; cada tela **declara** seus níveis e o cromo se monta sozinho. Passa no critério de
decisão de stack porque o dia ruim é nomeável: *"a cada tela nova eu reinvento a navegação"* — e o
sistema administrativo inteiro ainda está por construir (Bloco 6b, Fase 4, Fase 5, Fase 6).

- [ ] **Mapa de navegação** (`client/src/lib/navigation.ts`): níveis, subníveis, abas, visibilidade
      por papel. **Nasce como RASCUNHO do sistema inteiro** — decisão do operador: *"cada página
      será única, mas o sistema de navegação é para todo o sistema"* — e é editado conforme as
      telas nascem, sem tocar nos componentes.
- [ ] **Nível 1** — rail escuro, recolhido, hover expande sobrepondo. **Foco de teclado expande
      também** (`design.md` §6 — norma de acessibilidade, WCAG 2.1.1).
- [ ] **Nível 2** — coluna secundária, grupos retráteis, só quando a seção tem subitens.
- [ ] **Nível 3** — abas horizontais, só quando a tela tem abas.
- [ ] **Mobile** — gaveta com navegação em profundidade (ida e volta entre níveis).
- [x] **Rodapé do app** *(decisão do operador, 24/09/2026 — comparou com o LinkedIn Learning)*:
      em **toda tela depois do login, do aluno e do admin**; o visitante sem login não o vê.
      Itens: marca + © · FAQ · Quem somos · Contato · YouTube · Termos · Privacidade (os mesmos da
      home, menos Cursos/Trilhas/Assine, que o menu lateral já cobre). **Os textos são os MESMOS do
      rodapé da home** (`common.footer`), lidos por `GET /api/site-text/common/:lang` com as
      edições do operador: editou em *Admin → Textos*, muda nos dois. Salvar em Textos atualiza o
      rodapé na hora. **Links sem página entram assim mesmo** (Quem somos, Contato, Termos,
      Privacidade dão tela vazia até existirem) — decisão dele. Estrutura em
      `components/layout/AppFooter.tsx` + `lib/footer.ts` (dado); acabamento com o Antigravity.
      **Acabamento do Antigravity (24/09), aprovado pelo operador:** barra no tom do menu da home
      (token `--surface-vitrine`), a frase `common.footer.tagline` e o **seletor PT | EN** —
      provisório, leva à home pública até o bloco "app do aluno em inglês" (ver Bloco I).
      Testes: 5 de servidor, 7 do rodapé, 3 no shell, 1 na tela de Textos. **Mutação:** rota
      ignorando as edições, rodapé ignorando o servidor, rodapé fora do shell e salvar sem avisar o
      rodapé → reprovam. Revertido.
- [x] **Menu de conta no canto superior direito** *(decisão do operador, 24/09/2026 — a partir da
      Udemy, da Amazon, do LinkedIn e da Mosh)*: em toda tela depois do login, aluno e admin, uma
      faixa no topo da área de conteúdo com a **foto** (ou as iniciais) à direita; no celular, a
      mesma faixa leva também o botão da gaveta. O painel: foto, nome, e-mail · **Minha conta** ·
      **Faturamento e assinatura** (`/conta/faturamento`, sem página até a Fase 4 — decisão dele) ·
      **Sair**. **"Minha conta" saiu do menu lateral e da gaveta** (`foraDoMenuLateral` no mapa); a
      coluna da conta segue em `/conta`. **Muda a regra de set/2026** ("não há botão global de
      Sair"): agora o Sair global mora no menu da foto. Disclosure, não `role="menu"`; sem
      biblioteca e sem Popover API (aparelho antigo — guia modern-web-guidance). Textos em `app.nav`.
      Junto: o texto de leitor de tela da gaveta ("Navegação principal do site.") foi para o
      dicionário, achado da etapa 2. Testes: 9 do menu, 3 no shell, 3 ajustados à decisão nova; E2E
      abre a conta e sai pelo menu da foto. **Mutação:** sem Sair e "Minha conta" de volta ao rail
      → 6 reprovaram. Revertido.
      **Acabamento do Antigravity (24/09):** no computador a faixa do topo flutua sobre o
      conteúdo, e o painel abre ao passar o mouse. **Conserto na revisão:** o hover passou a valer
      SÓ para mouse (`pointerType`), e o clique não fecha o que o hover abriu. Antes disso, no
      celular o toque abria e fechava o painel na hora. Testes novos para mouse e toque, e um
      `PointerEvent` mínimo no `test-setup.ts` (o jsdom 24 não tem). **Mutação:** voltar ao
      hover para todos → 2 reprovaram. Revertido.
      **Ajuste do operador (24/09):** em Minha conta o "Sair" fica **só na coluna lateral** — saiu o
      botão "Sair da plataforma" da tela (e a frase `app.conta.sair`). Teste: a tela não tem botão
      de sair próprio (mutação: devolver o botão → reprova).
- [ ] **Incluir ou trocar a foto do aluno** *(decisão do operador, 24/09/2026 — pendente, não
      construído)*. Onde: Minha conta → Seus dados; a foto do menu da conta passa a mostrar a nova.
      O campo já existe (`User.image`, do Better Auth); falta o envio do arquivo. **Onde a foto
      fica guardada: Bunny Storage** *(decisão do operador, 25/09/2026)*, servida em
      `img.jilsonsantana.com`; configuração em [`docs/bunny.md`](bunny.md) §4. **Nunca na Railway**, porque o disco do servidor é
      zerado a cada publicação. Regras que já valem: formato WebP (regra de imagem do design), tamanho
      máximo, e a foto é dado pessoal — some junto quando a conta é excluída (LGPD). Até lá, sem
      foto, o menu mostra as iniciais.
- **Done when:** uma tela nova entra no sistema **declarando** seus níveis no mapa, sem escrever
  componente de navegação nenhum — e os três níveis somem sozinhos onde não há dado.

**ACHADO DO E2E — duplicidade de nome, e por que o conserto NÃO foi `.first()`** *(Set 2026)*.
`admin reaches /admin` quebrou: a barra ganhou um item "Cursos" e a página `/admin` já tinha um
link "Cursos", então o seletor por nome achou dois. **Não é ambiguidade para o aluno** — os dois
levam ao mesmo lugar — só para o seletor. O conserto foi **escopar ao `main`**, o que devolve a
intenção original daquela linha (provar que a PÁGINA tem o link, não que a navegação tem);
`.first()` faria passar escondendo qual dos dois foi encontrado, que é a família de gate-que-mente
já nomeada em *Test quality*. **Segundo achado na mesma investigação:** `SidebarInset` já É um
`<main>`, e o `Layout` estava aninhando outro dentro — HTML inválido e landmark dentro de
landmark. Corrigido junto.

### Vídeo (o corpo da fase)

- [x] **Infra: migrations em prod via pre-deploy — FEITO (Ago 2026), por CONFIG-AS-CODE.**
      `railway.json` na raiz com `deploy.preDeployCommand`, em vez de configurar no painel.
      **Por que arquivo e não painel:** é a mesma lição do `NODE_ENV` — configuração em painel não
      é versionada, não passa por revisão de diff e ninguém audita. No arquivo, ela viaja com o
      repo. **Garantia que a Railway dá** `[FATO — context7 `/railwayapp/docs`]`: *"if your command
      fails, the deployment will not proceed"* — migration quebrada **bloqueia** a publicação em
      vez de subir código novo contra banco velho, que é exatamente o modo de falha temido.
      **⚠️ ACHADO que teria quebrado a primeira publicação:** o `prisma` (a CLI que roda a migração)
      era **devDependency**, e o estágio de produção do Dockerfile instala com `--omit=dev` — o
      comando falharia em TODO deploy. Movido para `dependencies`. As migrations já eram copiadas
      para a imagem (`Dockerfile:91`), então só faltava a ferramenta.
      **Comando verificado rodando da RAIZ**, que é onde o container executa (`WORKDIR /app`), não
      de dentro de `server/` como fazemos aqui — daí o `--schema server/prisma/schema.prisma`
      explícito, sem o qual o Prisma não acha o schema (CLAUDE.md → Database & Migrations).
      *(Não substituído: o item original abaixo descrevia a configuração pelo painel.)*
- [ ] ~~Configurar~~ *(substituído pelo item acima — mantido o texto original por rastreabilidade)*
      `npx prisma migrate deploy` como **pre-deploy command** do Railway (railway.json /
      service settings) — roda 1× por deploy, antes da instância nova subir. NUNCA no
      entrypoint do Docker (re-executaria a cada restart) e nunca `migrate dev` contra prod.
      Validar com a primeira migration desta fase. (Convenção no CLAUDE.md → Database & Migrations.)
- [ ] *(operador)* **Contratar e configurar o Bunny pelo guia [`docs/bunny.md`](bunny.md)**: a conta
      com 2FA (§2), as três bibliotecas do Stream e a segurança delas (§3) e as chaves (§5), que
      nunca passam pelo chat. As decisões dele que o guia lista (§6) vêm antes do bloco de vídeo.
      *(Guia escrito em 25/09/2026, a pedido do operador, a partir da doc oficial do Bunny via
      context7.)*
- [ ] Bunny account + library; store video IDs on `Lesson`
- [ ] **TRAVA (achado do `security-vulnerability-reviewer`, Ago 2026):** o campo de vídeo de
      **membro** nasce em **coluna PRÓPRIA** — **nunca** reaproveitar `Course.introVideoId`.
      `introVideoId` sai hoje na resposta pública de `GET /api/courses/:slug`, e isso está
      **correto** (vídeo de intro é ativo de venda, não-gated — TRAVA do CLAUDE.md → Course page
      fields). Justamente por isso, pendurar vídeo gated na mesma coluna = vazamento silencioso:
      a rota pública continua servindo o id sem nenhum erro aparecer.
- [ ] *(Metade feita em 27/09, no Bloco U, etapa 2: `GET /api/courses/:slug` já usa `select`. Falta
      `GET /api/trilhas/:slug`, na etapa 3.)*
      **PRÉ-REQUISITO desta fase — `include` → `select` nas rotas públicas de detalhe** (movido do
      backlog P2 da Fase 7; achado do `security-vulnerability-reviewer`, Ago 2026). `GET
      /api/courses/:slug` (`server/src/routes/courses.ts:54`) e `GET /api/trilhas/:slug`
      (`server/src/routes/trilhas.ts:126`) usam `include:`, então devolvem **todas** as colunas
      escalares — e qualquer coluna futura entra na resposta pública **automaticamente**, sem
      ninguém decidir isso. Esta fase adiciona exatamente o tipo de coluna que não pode vazar, e a
      migration vem **antes** da revisão da rota na ordem natural do trabalho — ou seja, o furo se
      abre sozinho se este item não vier primeiro. **Fazer ANTES de qualquer coluna de vídeo entrar
      no modelo.** Fix: `select` explícito listando só os campos que `CourseDetail`/`TrilhaDetail`
      (`client/src/lib/api.ts:51,107`) consomem. As rotas irmãs já fazem certo
      (`courses.ts:25`, `lessons.ts:19`) — copiar o padrão.
- [ ] Server: issue short-lived **signed URLs**, member-only. **Validade de 24 h para todo vídeo
      (operador, 28/09/2026 — era "Elastic window (~6–12h)"; ver o registro no Bloco U) and NO
      IP-lock** — so the video doesn't break when the student switches Wi-Fi↔4G mid-lesson (classic
      mobile support ticket). *Inferência:* exact controls (path-token + expiry, optional IP) are
      Bunny's API — confirm flags at build. Trade-off accepted: no IP-lock slightly raises URL-share
      risk, mitigated by the short window + DRM + per-user signing. UX > marginal anti-piracy for a
      solo operator.
      **Decisão do operador, Ago 2026 — a janela FICA como está, e NÃO se constrói renovação de
      token durante a reprodução.** A proposta de TTL curto (minutos) foi avaliada e recusada por
      três razões: (a) TTL curto protege contra **link vazando passivamente**, não contra o vetor
      real de uma escola — **baixar e re-subir** —, que acontece dentro de qualquer janela, de 5
      minutos ou de 12 horas; (b) renovação de token no player é **código que falha em silêncio**,
      na conexão específica de um aluno específico, e depurado por um operador **sozinho** — custo
      alto por proteção quase nula; (c) a justificativa original (não quebrar o playback na troca
      Wi-Fi↔4G) **continua válida**. As linhas de `CLAUDE.md` → Video e `tech-stack.md` → Video
      seguem valendo sem alteração — a razão mora **aqui**, não duplicar lá.
      **Em 28/09/2026 a janela subiu para 24 h para todo vídeo** (operador, depois de comparar
      Bunny, Mux, Cloudflare e plataformas de curso) — **na mesma direção** desta decisão: a
      validade não é o que protege a aula (é quem recebe a assinatura e os domínios permitidos),
      e uma janela maior poupa o aluno de recarregar depois de uma pausa longa. `CLAUDE.md` e
      `tech-stack.md` foram atualizados com o número novo.
- [ ] **Restrição de domínio/referrer no Bunny** — vídeo servido **apenas** para requisições vindas
      do domínio da plataforma. **[VERIFICADO em 25/09/2026, doc oficial via context7:]** a restrição
      existe e se chama **Allowed domains**. Ao lado dela há **Block Direct URL File Access**, que
      bloqueia baixar o arquivo pelo endereço direto. A configuração está em `docs/bunny.md` §3.2.
      **Razão:** é a alavanca **certa** para o
      mesmo risco que o TTL curto tentava cobrir — **mata o compartilhamento casual de URL** (link
      colado num grupo e aberto fora do site) **sem tocar no playback e sem escrever código nosso**:
      é configuração no fornecedor, não mecanismo que a gente passa a manter e depurar.
      *Registrado como decisão de produto, fora do MVP:* **marca d'água com identificação do aluno é
      a única defesa real contra re-upload** — entra **quando houver receita**, não antes (critério
      de decisão de stack, CLAUDE.md → Working Method).
- [ ] **Upload de vídeo pelo admin** *(decisão do operador, 25/09/2026, substitui o antigo "admin
      upload flow, or direct-to-Bunny + store reference"; detalhe em `docs/bunny.md` §3.4 e §7.1)*.
      As regras dele: o arquivo original vai **byte a byte**, sem recompressão no navegador, e o
      envio é **retomável** · **sem coleções** no Bunny, e o nome do vídeo lá é **o nome do arquivo
      enviado** (operador, 27/09: ele gerencia os vídeos pelo admin, não pelo painel) · **trocar o vídeo da aula** substitui o vídeo sem recriar a aula · o progresso do
      aluno fica preso à **AULA**, nunca ao ID do vídeo · legenda `.vtt` casada pelo nome do
      arquivo · o código **nunca** pede transcrição nem liga o Enterprise DRM (os dois cobram).
- [ ] Client: gated player on the lesson page
- [ ] **TESTES DE SERVIDOR do gate de vídeo — escritos JUNTO com a rota que assina a URL, não
      depois** (mesma disciplina da Fase 4; a rota é fronteira de acesso e **não tem tela**, então
      é fatia própria: supertest, sem teste de componente). Casos mínimos:
      **(a)** anônimo pede URL assinada → **401** · **(b)** membro autenticado **sem assinatura
      ativa** → **403** · **(c)** membro com acesso → **200 + URL assinada** · **(d)** a URL
      devolvida **não** é a URL crua do Bunny (assere a presença do token, não a ausência de erro)
      · **(e)** `introVideoId` responde para **não-membro** — é a TRAVA do vídeo de venda, e é o
      único caso em que "200 sem sessão" é o comportamento correto; sem teste, o próximo agente
      fechando buracos de gating **conserta** essa exceção e quebra a página de vendas.
- [ ] E2E: non-member cannot get a playable URL
- **Done when:** a member plays a lesson; a non-member is blocked. *Test the gate hard.*

### Bloco U — Envio de imagem e de vídeo pelo admin, e os vídeos tocando  *(27/09/2026 · pedido do operador · HIGH RISK nas etapas 3 e 4)*

> **Por que agora e nesta ordem** *(operador, 27/09)*: ele vai fazer muitas mudanças na página do
> curso e quer, antes, o envio funcionando e o vídeo tocando. **Quatro etapas, uma por commit**; o
> operador revisa cada uma antes da seguinte, e publicar é só com o "publica". Plano aprovado em
> 27/09. Decisões dele: capa em **WebP, JPG ou PNG sem conversão** (`design.md` §12) · pastas
> `cursos/<slug>-<código>.<ext>` (era a P21) · peça nova **`tus-js-client`** para o envio de vídeo
> retomável · para testar como aluno, **assinatura de teste só no dev** (a trava de acesso vem
> adiantada da Fase 4, sem Stripe; em produção o `member@` continua dependendo do cupom de 100%).
> **Antes de cada etapa, o operador cria algo no painel do Bunny** (`pendencias.md` → P19; nomes das
> variáveis em `bunny.md` §5).

- [x] **Etapa 1 — capa do curso enviada pelo admin** *(27/09, no `dev`, não publicada)*.
      `server/src/lib/bunny-storage.ts` (PUT no Storage, senha só no servidor; sem as variáveis,
      responde "não configurado" e nada quebra) + `server/src/lib/image-type.ts` (o tipo pelo
      **conteúdo** do arquivo) + `POST /api/admin/courses/:id/thumbnail` (`requireAdmin`,
      `express.raw` só nela, até 5 MB, nome novo a cada envio, grava o endereço completo em
      `img.jilsonsantana.com` — `bunny.md` §4.3). Admin: o botão **"Enviar imagem"** em curso já
      salvo (`ThumbnailUpload.tsx`). Testes: 12 de servidor (401 · 403 · 404 · WebP/JPG/PNG · nome
      que não se repete · arquivo disfarçado · GIF/SVG · 413 · 503 · 502), com o Bunny trocado por
      um dublê no **nosso** módulo, e 4 de tela (sem botão em curso novo · enviando · recusado ·
      GIF e arquivo grande nem saem da tela). Mutação: tipo sempre aceito ⇒ 3 reprovam; sem
      `requireAdmin` ⇒ 2 reprovam; tela sem conferir o tipo e sem pôr no campo ⇒ 2 reprovam.
      **PROVADO no site no ar em 27/09** *(sem Storage de dev, decisão do operador; as 4 variáveis
      estão só no Railway — `bunny.md` §4.1 e §5)*: o operador enviou uma capa PNG pelo admin, e
      ela apareceu na prévia servida por `img.jilsonsantana.com/cursos/exemplo-fundamentos-excel-ia-bfa5e6cf13ce.png`.
- [x] **Etapa 2 — vídeo de apresentação** *(27/09, no `dev`; sem biblioteca de dev, decisão do
      operador: testa no ar como a capa)*. Servidor: `server/src/lib/bunny-stream.ts` (cria o vídeo;
      o id volta em `guid`; assinatura SHA-256 do envio; endereço do player derivado, `null` sem a
      biblioteca configurada) + `POST /api/admin/courses/:id/intro-video` (`requireAdmin`; devolve a
      assinatura, nunca a chave; **não** grava o vídeo no curso) + `introVideoEmbedUrl` derivado nas
      respostas do curso (público e admin). `introVideoId` só aceita o GUID do Bunny. Admin:
      `IntroVideoUpload.tsx` (o botão **"Enviar vídeo"**, com a porcentagem; grava o id **só quando
      o envio termina**) + `client/src/lib/video-upload.ts` (o único lugar com o `tus-js-client`) +
      `BunnyPlayer.tsx` (o player, com a política de referrer que o Bunny exige), no formulário e na
      página do curso. **Duas mudanças em relação ao plano, e o porquê:**
      - ~~sem consulta de "processando"~~ **REVISTO no mesmo dia, a pedido do operador:** no ar, o
        quadro ficava em "Processing video" até recarregar a página, porque o player do Bunny não
        se atualiza sozinho. Agora a prévia do admin (`IntroVideoPreview.tsx`) pergunta a cada 15 s
        (`GET /api/admin/intro-video/:videoId/status`, `requireAdmin`) e **recarrega o quadro**
        quando o Bunny termina; desiste depois de 20 min. Como a doc não confirma os números da
        leitura do vídeo, "pronto" aceita dois sinais, e qualquer um basta: status 4 ou
        `encodeProgress` 100 (`interpretarEstado`, função pura com teste). **A prova é o próximo
        envio no ar.**
      - **o envio retoma na mesma sessão**, por uns 5 minutos de tentativas. Retomar de OUTRA sessão
        mandaria o arquivo para o vídeo antigo enquanto o curso gravaria o novo. Se cair de vez, o
        operador envia de novo.

      **LIMPEZA AUTOMÁTICA no Bunny** *(decisão do operador, 27/09/2026: "o incompleto e o
      antigo")*. O curso guarda o **envio em andamento** (`Course.introVideoPendingId`, migration
      `20260927120000_course_intro_video_pending`). **Reenviar** apaga no Bunny o envio que ficou
      pela metade; **terminar** (`POST /api/admin/courses/:id/intro-video/complete`, que só aceita o
      envio em andamento DESTE curso, senão 409) troca o vídeo do curso e apaga o **substituído**.
      **Nunca apaga o vídeo em uso.** Se o Bunny recusar apagar, o envio continua valendo: a
      limpeza é arrumação. *Não confundir com a "deleção de vídeo" PROPOSTA e REJEITADA em Ago 2026:
      aquela era para curso ARQUIVADO e continua fora; esta é a limpeza do próprio envio.*
      **Junto, e antes da coluna nova** (a trava da Fase 3): `GET /api/courses/:slug` trocou
      `include` por `select` explícito. A outra rota da trava, `GET /api/trilhas/:slug`, fica para a
      etapa 3. Passo 0 no banco de dev: as mesmas contagens antes e depois, 0 tabelas sem RLS e
      "No difference detected".

      Testes: 4 de unidade (a assinatura presa a um valor conhecido; o endereço do player) + 17 de
      servidor (401 e 403 nas duas rotas · 404 · 200 sem a chave · começar deixa **em andamento** ·
      terminar troca · 409 · GUID inválido 400 · 503/502 · **reenviar apaga o incompleto** ·
      **terminar apaga o substituído, e começar não apaga o vídeo em uso** · Bunny recusando apagar
      não derruba · **o player sai para visitante sem login** · **o envio em andamento nunca sai na
      resposta pública**) + 8 de tela. Mutação: a ordem da assinatura, a exceção do vídeo de venda,
      a trava de admin, gravar antes do fim, o formato do id, tirar a limpeza, apagar o vídeo em
      uso, não conferir o envio em andamento, e pôr a coluna nova no `select` público — todas
      reprovam. **PROVADO no ar em 27/09:** o operador enviou o vídeo pelo admin, e ele tocou na
      prévia do Editar curso ("funcionou"). A rota de apagar é a mesma forma da doc
      (`DELETE /library/:id/videos/:id`), e **o operador confirmou no painel, no mesmo dia**: o vídeo
      substituído sumiu (a biblioteca ficou com 1 vídeo) e o novo tem o nome do arquivo enviado
      (`analise-de-cohort-e-retencao.mp4`).
      **Ajuste pedido pelo operador no mesmo dia:** na seção de mídia, primeiro a imagem/o vídeo,
      depois o campo, depois o botão de enviar; os rótulos "URL da thumbnail" e "ID do vídeo
      (Bunny)" passaram a ser **"Imagem do curso"** e **"Vídeo promocional"**.
- [ ] **Etapa 3 — vídeo das aulas:** primeiro o `include` → `select` de `GET /api/trilhas/:slug` (o
      de `/courses/:slug` já foi feito na etapa 2) *(✅ feito em 28/09, no Bloco E etapa 2, parte
      2a)*; depois `Lesson.bunnyVideoId` +
      `Lesson.bunnyVideoPendingId` (**sem coleção**, e o nome do vídeo no Bunny é **o nome do
      arquivo enviado** — decisões do operador de 27/09), o envio
      **com a mesma limpeza da etapa 2** (reenviar apaga o incompleto; terminar apaga o substituído)
      e a **prévia do admin com token**. **Prévia grátis** *(decisão do operador, 27/09/2026, "como
      na Udemy")*: `Lesson.isFreePreview`, que o operador liga e desliga por aula no admin; ele
      pensa em 2, 3 ou 5 aulas de uns 10 minutos por curso. `LessonRow.tsx` sai do
      `ModuleLessonTree.tsx` (328 linhas) antes. Nenhuma rota pública devolve `bunnyVideoId`,
      provado por teste. `security-vulnerability-reviewer` no fim.
      **✅ CONSTRUÍDA em 28/09, no `dev`, como Bloco E etapa 2 parte 2d (não publicada; o teste de
      verdade é no ar, decisão do operador de 28/09).** Migration `20260928160000_lesson_video`
      (`bunnyVideoId`, `bunnyVideoPendingId`, `isFreePreview` padrão desligado). `bunny-stream.ts`
      atende a biblioteca de **aulas** e ganhou `tokenDoPlayer` + `enderecoAssinado` — formato
      **confirmado na doc via context7 em 28/09**: `SHA256_hex(token key + id do vídeo + expires)`,
      com a **token key** (não a API key), validade de **6 h**. Rotas só de admin em
      `routes/admin-lesson-video.ts`: começar o envio (devolve a assinatura, **sem** endereço de
      player sem token), terminar (só o envio em andamento **desta** aula → é o que impede reusar
      vídeo de outra aula; 409 no resto), a prévia assinada e o estado; aula de texto não recebe
      vídeo (400). Sem as variáveis, 503 — "A biblioteca de aulas não está configurada neste
      ambiente." O vídeo **só entra pelo envio**: a edição da aula ignora `bunnyVideoId`. Tela:
      "Vídeo da aula" em cada aula de vídeo (`LessonVideoPanel.tsx`), com a prévia que se
      atualiza sozinha (a da apresentação, generalizada), o envio com porcentagem e a chave
      **Prévia grátis**. **Provado por teste que o vídeo não sai** na página do curso, na aula
      pública, na busca e na trilha. Passo 0 no dev: mesmas contagens (só `_prisma_migrations`
      10→11), 0 sem RLS, login 200, "No difference detected". Testes: 17 de servidor + 4 de
      assinatura (valor calculado fora do código, com o Python), 9 de tela. **Mutação:** token com
      a ordem trocada, token com a API key, terminar sem conferir o envio em andamento, apagar o
      vídeo em uso (ao terminar e ao começar), vídeo saindo na aula pública e na página do curso,
      aula de texto recebendo vídeo, a prévia sem `requireAdmin` e a tela gravando antes do fim →
      todas reprovam. Revertido. **O que falta provar no ar** (bunny.md §7): o iframe tocando no
      nosso site com o token do embed **e** o CDN token ligados, e o endereço do player
      (`iframe.` ou `player.mediadelivery.net`).
- [x] **Uma biblioteca só, com token, e duas validades** *(decisões do operador, 28/09/2026, no
      `dev`)*: aulas **e** apresentação na `jilsonsantana-stream` (762605), token ligado; **todo
      player sai assinado** (`enderecoAssinado`), a apresentação inclusive, para qualquer
      visitante. **A assinatura vale 24 h para todo vídeo** (o operador decidiu depois de comparar
      Bunny, Mux, Cloudflare e plataformas de curso; substitui a janela de 6–12 h de Ago 2026); a
      aula paga continua só para quem está logado com assinatura ativa (etapa 4). As variáveis passam a ser só as
      `BUNNY_STREAM_LESSONS_*`; as `_INTRO_*` saíram do código. Sem a assinatura, a apresentação
      **não tocava** mais na biblioteca com token. Registro em `bunny.md` §3.1 e `CLAUDE.md` →
      Video; P19 atualizada. Testes: apresentação assinada com 24 h, as duas validades, o token.
      **Mutação:** validade de 6 h, apresentação sem assinatura e o código lendo as variáveis
      antigas → todas reprovam.
- [x] **A aula no editor como na Udemy: abre e recolhe, com a miniatura do vídeo, SEM player**
      *(decisão do operador, 28/09/2026, depois de ver o vídeo tocando no ar: "na Udemy só toca na
      página do aluno"; plano aprovado no mesmo dia; no `dev`)*. A seta no fim da linha abre e
      recolhe a aula (toda aula começa recolhida); aberta, ela mostra o conteúdo (na de vídeo: a
      **miniatura, o nome do arquivo e a duração**, o envio e a Prévia grátis; na de texto: o
      texto) e, embaixo, os Arquivos. Saíram os botões "Vídeo da aula", "Texto da aula" e
      "Arquivos". **Assistir é só na página da aula do aluno** (etapa 4), e o **Visualizar** chega
      com ela. Servidor: `GET /api/admin/lessons/:id/video` lê no Bunny o vídeo **daquela** aula e
      devolve o resumo (`interpretarResumo`, função pura com teste); **a miniatura só sai com o
      vídeo pronto** e com a variável nova `BUNNY_STREAM_LESSONS_CDN_HOST` (não é segredo);
      saíram a rota do player do admin, a do estado por id e o `playerUrl` do fim do envio.
      **Mutação:** miniatura antes de pronto, o id do vídeo vindo de quem pede, a seta que não
      abre, a duração sem os dois dígitos e a tela mostrando imagem processando → todas reprovam.
- [x] **A aula aberta como na Udemy (continuação) e arquivos para baixar sem limite** *(decisões do
      operador, 29/09/2026; plano aprovado no mesmo dia)*: a aula criada já nasce aberta; o que
      está aberto fica aberto enquanto ele está na tela; ao voltar, a aula com o vídeo pronto volta
      **recolhida**, e a que processa ou está sem vídeo volta **aberta** (a de texto, recolhida).
      Arquivos: zona própria sem CDN (confirmado, P33), **sem limite de tamanho**, em fluxo pelo
      servidor; o único teto é o do Railway (o envio precisa terminar em 5 minutos).
      **Parte 1 feita:** `Lesson.bunnyVideoReady` (migration `20260929120000_lesson_video_ready`,
      um lembrete do que o Bunny respondeu, não um dado derivado); terminar o envio desmarca, o
      resumo marca, e `GET /api/admin/courses/:id` pergunta ao Bunny só pelas aulas não
      confirmadas (`lib/videos-prontos.ts`). Passo 0 no branch `dev`: mesmas contagens (só
      `_prisma_migrations` 12→13 e `session` +1 do login de teste), 0 sem RLS, login 200, "No
      difference detected". **Mutação:** terminar sem desmarcar e perguntar pelas já confirmadas →
      reprovam.
      **Parte 2 feita:** o aberto/recolhido saiu da linha para a árvore (`aulas-abertas.tsx`, um
      contexto): a regra de entrada é uma função pura (aula de vídeo sem vídeo ou não confirmada
      → aberta), a aula criada pelo "+ Aula" ou pelo "+" entre aulas nasce aberta, e a aberta
      continua aberta quando o curso recarrega. **Mutação:** regra invertida, aula criada que não
      abre e a regra recalculada a cada recarga → reprovam.
      **Parte 3 feita:** sem limite de tamanho (saiu `LIMITE_DO_ARQUIVO_DA_AULA_MB`); o arquivo
      passa **em fluxo** pelo servidor até o Bunny, com o tamanho no cabeçalho (medido: sem ele, o
      fetch do Node manda em pedaços); a tela mostra a porcentagem. `LessonFile.sizeBytes` virou
      `BigInt` (migration `20260929140000_lesson_file_size_bigint`: o `Int` parava em 2 GB e o
      .zip seria enviado e depois falharia ao gravar). Passo 0: mesmas contagens (só
      `_prisma_migrations` 13→14 e o login de teste), 0 sem RLS, login 200, "No difference
      detected". **Mutação:** o limite de 50 MB de volta na tela e no servidor, e o tamanho sem ir
      ao Bunny → reprovam. **Para a etapa 4:** decidir a entrega do .zip (pelo servidor, que sai
      pelo Railway e é cobrado, ou link assinado temporário do Bunny — `bunny.md` §4.5).
- [x] **O envio de vídeo sobrevive à tela** *(pedido do operador, 29/09/2026: "mudar de passo, se
      quiser, sem interromper o que estava acontecendo")*. O envio já continuava sozinho quando a
      tela saía; o que se perdia era a porcentagem, que morava no componente. Agora o estado de
      cada envio mora em `lib/envios-de-video.ts`, fora da tela: recolher a aula ou trocar de passo
      e voltar mostra a porcentagem de onde está, uma falha no meio aparece ao reabrir, e a aula
      não deixa começar um segundo envio enquanto o primeiro não termina. Fechar ou recarregar a
      aba continua interrompendo (como na Udemy). **Mutação:** a porcentagem sem ser guardada e o
      botão sem travar → reprovam.
- [x] **O aluno entra no curso pela primeira aula, com "Sobre o curso" embaixo do player** *(decisão
      do operador, 29/09/2026; plano aprovado no mesmo dia)*. A rota da aula devolve os detalhes
      do curso (os mesmos campos da página pública); `CourseDetails.tsx` desenha nível, descrição,
      listas, camadas, destaques e perguntas **em toda aula, liberada ou não** (bloco vazio não
      aparece). `/aluno/curso/:slug` (`CourseEntryPage.tsx`) leva à primeira aula publicada; o
      cartão do catálogo leva para lá quem está logado, e o visitante segue para a página pública.
      **Mutação:** os detalhes fora da resposta, a entrada na segunda aula, o cartão do logado
      indo para a página pública e o bloco vazio aparecendo → reprovam. **Fora:** "continuar de
      onde parou" (Fase 5) e os outros links que levam o aluno logado à página de venda (a trilha
      e a busca).
- [x] **Aula e módulo novos nascem conforme o curso, como na Udemy** *(decisão do operador,
      29/09/2026; os módulos seguem a mesma regra, resposta dele)*: curso em rascunho → nascem
      **publicados**; curso publicado ou arquivado → nascem em **rascunho**. Nas rotas do "+"
      (`admin-course-structure.ts`, `statusDoNovo`); os itens que já existiam não mudam. Teste
      para os três estados do curso; **mutação** (curso publicado fazendo nascer publicado) →
      reprova.
- [x] **Etapa 4 — a trava de acesso e a aula tocando para o aluno** *(feita em 29/09, no `dev`, partes 4a–4d abaixo; falta a prova no ar depois do "publica")*: adianta da Fase 4 o model
      `Subscription`, o `temAcessoAtivo()` e o `requireActiveMembership`, **sem Stripe**; rota
      `GET /api/lessons/:id/player`; assinatura de teste do `member@` **só fora de produção** (o
      seed para com erro em produção); a matriz da trava em teste de servidor. **A aula com prévia
      grátis toca para QUALQUER visitante, sem login e sem assinatura** *(decisão do operador,
      27/09/2026)*: vira a **segunda exceção** ao portão de vídeo, ao lado do vídeo de apresentação.
      A trava do `CLAUDE.md` → Access Architecture é reescrita junto, no mesmo commit, com teste
      provando que **desligar a prévia volta a trancar a aula**.
      **Na tela da aula, a lista de módulos e aulas do curso fica no NÍVEL 2 da navegação** (a
      coluna do meio, colada ao menu lateral, `design.md` §13), e o vídeo ao lado dela *(decisão do
      operador, 28/09/2026)*.
      **Os arquivos para baixar, como na Udemy** *(referência do operador, 29/09/2026, com prints da
      Udemy)*: na lista de aulas do curso, a aula com arquivos ganha um botão **Recursos** junto ao
      nome, que abre a lista dos arquivos para baixar — **vale para aula de vídeo e de texto**; na
      aula **só de texto**, o texto fica no centro da tela e, embaixo dele, **"Recursos para esta
      aula"** com os arquivos. Só assinante baixa (a trava desta etapa), sempre como download, e
      **com o NOME ORIGINAL** — o que o operador enviou, um arquivo só, como na Udemy *(pedido do
      operador, 29/09/2026, depois de baixar pelo painel do Bunny e receber `download.zip` → pasta
      da aula → arquivo com nome de código)*. O nome com código no Storage continua (é o endereço
      interno); o nome original sai do banco no `Content-Disposition` — atenção ao achado P2 da
      revisão de segurança sobre caracteres invisíveis no nome.
      **Decidir aqui** como o .zip chega ao aluno: pelo servidor (sai pelo Railway, cobrado) ou link
      assinado temporário do Bunny (`bunny.md` §4.5).
      `security-vulnerability-reviewer` e revisão do operador antes do "publica".
      **Plano aprovado em 29/09/2026** (a página da aula no estilo do LinkedIn Learning, em 4
      partes). Respostas do operador: **o admin vê tudo, com o rascunho marcado, por rotas de
      admin** (a trava do aluno segue com um caminho só) · **o .zip sai pelo nosso servidor** · **o
      botão flutuante da IA entra já, com "Em breve"**.
      - [x] **4a — a trava** *(29/09, no `dev`)*: migration `20260929160000_subscription` (o espelho
        local, com as costuras do corporativo, `status` em texto, sem idioma, RLS); Passo 0 no
        branch `dev` (tabela nova vazia, o resto igual, 0 sem RLS, login 200, "No difference
        detected"). `temAcessoAtivo()` em `lib/acesso.ts`, com a regra do gate como função pura
        (`assinaturaDaAcesso`); não lê idioma nem papel. **Assinatura de teste do `member@`** no
        seed, só em banco local ou no branch `dev` (hostname conferido, como a trava do teste); em
        outro banco ela **não nasce e o seed diz por quê**, sem erro, porque o seed também roda em
        produção para o admin. Criada no branch `dev` em 29/09. **O `requireActiveMembership`
        ficou para quando uma rota exigir login e assinatura sem exceção**: a rota da aula aceita
        visitante (prévia grátis) e consulta a trava direto. **Mutação:** `incomplete` liberando, a
        trava lendo o papel de admin e o banco de produção aceito para a assinatura de teste →
        reprovam.
      - [x] **4b — as rotas da aula** *(29/09, no `dev`)*: `routes/lesson-view.ts`. **Aluno:**
        `GET /api/lessons/:id/aula` (só a cadeia publicada; liberada com a prévia grátis ou com
        `temAcessoAtivo()`; bloqueada, só a lista do curso — sem vídeo, token, texto nem arquivo;
        `Cache-Control: private, no-store`) e `GET /api/lessons/:id/files/:fileId` (mesma regra,
        o arquivo tem que ser **desta** aula, em fluxo do Storage, `Content-Disposition` com o
        **nome original** limpo de caracteres de controle e de direção de texto — fecha o achado
        P2 de 28/09 — e `nosniff`). **Admin:** `GET /api/admin/lessons/:id/aula` e
        `/api/admin/lesson-files/:id/download`, qualquer status, com o rascunho marcado.
        `CLAUDE.md` → Access Architecture reescrito (a prévia grátis é a segunda exceção; o admin
        assiste por rota de admin). **Mutação:** a prévia sem efeito, o conteúdo na resposta
        bloqueada, o download sem a trava, o nome sem limpeza e o rascunho na rota do aluno →
        reprovam.
      - [x] **4c — a tela** *(29/09, no `dev`)*: `/aluno/aula/:id` (`pages/aluno/LessonPage.tsx`),
        **fora** do `ProtectedRoute` (a prévia grátis é para visitante). O mapa de navegação
        ganhou uma seção fora do menu lateral com `nivel2: "conteudo-do-curso"`: o `SecondaryNav`
        desenha o **conteúdo do curso** da aula (`components/aula/CourseContentsNav.tsx`), com a
        aula atual em `aria-current`, o ícone de vídeo ou texto, **Recursos** nas aulas com
        arquivo e o **rascunho marcado só para o admin**; no celular e para o visitante, a lista
        fica embaixo do player. `LessonContent` (o player grande assinado, o texto no centro com
        **"Recursos para esta aula"**, ou "para assinantes"), `AiDock` (o botão flutuante e o
        painel "Em breve", que encolhe o player). O admin lê pela rota de admin
        (`lib/pagina-da-aula.ts`). Textos por `useT()`, com as chaves `app.aula.*` e
        `app.nav.aula` em português e inglês (inglês: rascunho do agente). **Visualizar** em cada
        aula do editor (aba nova, para não parar um envio) e link em cada aula da página de curso
        provisória. **Mutação:** a aula atual sem destaque e o conteúdo aparecendo na bloqueada →
        reprovam.
      - [x] **4d — a revisão de segurança e os consertos** *(29/09, no `dev`)*. O
        `security-vulnerability-reviewer` sobre 4a e 4b: **nenhum P0**. **P1 (consertado):** o
        download usava `.pipe()`, e o Bunny caindo no meio derrubaria o servidor inteiro; agora é
        `pipeline` com o erro tratado e registrado (teste: o download quebra no meio e o
        `/api/health` continua 200; `.pipe()` de volta reprova). **P2 consertados:** a trava fecha
        quando chamada sem pessoa (no Prisma, `undefined` num filtro é "sem filtro"); testes de
        aula em **módulo** em rascunho e de download de aula em rascunho. **Decisão do operador no
        mesmo dia: na prévia grátis o visitante SÓ ASSISTE** — os arquivos de qualquer aula são só
        para assinante (`arquivosLiberados` na resposta; a tela mostra "para assinantes" no lugar
        dos recursos). Isso também fechou o P2 dos downloads anônimos sem limite. **P2 em
        aberto:** a opção da Stripe para quando as tentativas acabam (item na Fase 4) e o RLS da
        `subscription` em produção depois do publish (`pendencias.md`, P34). **Mutação:** `.pipe()`
        de volta, a trava sem a proteção, a cadeia sem o módulo, o download sem a cadeia, o
        arquivo liberado pela prévia e os recursos sem o "para assinantes" → todos reprovam.
- **Done when:** no computador do operador, a capa enviada aparece no admin; o vídeo de
  apresentação toca no admin e na página; a aula aberta no editor mostra a miniatura, o nome e a
  duração do vídeo (sem player, decisão de 28/09); o `member@`
  assiste à aula e um aluno sem assinatura vê "Esta aula é para assinantes."

### Bloco A — Lista de cursos do admin: o cartão com capa e números  *(27/09/2026 · pedido do operador, modelo Udemy)*

> Hoje a lista mostrava só título, "módulos · aulas" e o status em inglês. O operador pediu o cartão
> da Udemy: a capa e os números de cada curso, com **placeholder** no que ainda não existe e o número
> real entrando quando a parte que o produz for construída. Plano aprovado em 27/09.
> **Decisões dele:** **sem preço** (a escola é por assinatura) · **horas assistidas** no lugar de
> "Ganhos do mês / Total recebido" · **avaliação só para ele**, nunca no site · **barra de
> preenchimento com o que falta** no lugar do "Concluir seu curso".

**O mapeamento (Udemy → escola):**

| Na Udemy | Na escola | Quando vira número |
|---|---|---|
| Capa | Capa do curso | **agora** |
| PUBLICADO / RASCUNHO | Publicado · Rascunho · Arquivado | **agora** |
| Preço | **não entra** | nunca (assinatura) |
| Ganhos do mês · Total recebido | Horas assistidas (mês · total) | **real desde 09/10/2026** (Bloco MEDIR) |
| Inscrições neste mês · Total de alunos | Alunos que começaram (mês · total) | **real desde 09/10/2026** (Bloco MEDIR) |
| Classificação (estrelas) | Avaliação, só para o operador | Fase 5 (a avaliação do curso ao concluir — P27, 09/10) |
| Concluir seu curso | Preenchimento + o que falta | **agora** |
| Oportunidade de conteúdo | **não entra** | nunca (pesquisa de mercado da Udemy) |

- [x] **O cartão** *(27/09, no `dev`)*. `GET /api/admin/courses` devolve também a capa, se tem vídeo
      de apresentação e descrição (sim/não, sem o texto) e as **aulas publicadas na cadeia** (aula
      publicada em módulo publicado). `AdminCourseCard.tsx`: capa 16:9 (sem capa, "Sem imagem"),
      status em português, EN, módulos · aulas, os três números como **"—" / "em breve"**, e a barra
      de **Preenchimento** (`client/src/lib/course-completeness.ts`) com o que falta: capa, vídeo de
      apresentação, descrição, aula publicada. Estados de carregando, erro e vazio. Testes: 3 de
      servidor + 10 de tela; mutações (a conta do preenchimento, o status em inglês, a cadeia das
      aulas publicadas) reprovam. Textos aprovados pelo operador em 28/09/2026.
- [x] **Quinto item do preenchimento: o vídeo de cada aula** — entra com a etapa 3 do Bloco U.
      *(28/09, no `dev`)* "N aulas sem vídeo": aulas de **vídeo** publicadas na cadeia ainda sem o
      vídeo (a de texto não conta); a lista do admin devolve `lessonsWithoutVideo`. **Curso sem aula
      publicada não ganha o item de graça** (sairia com 20% sem nada) e não repete o aviso: o que
      falta ali já é "Nenhuma aula publicada". Com cinco itens, cada um vale 20%.
- [ ] **Horas assistidas** e **Alunos** viram número — na Fase 5 (checkboxes lá).
- [ ] **Avaliação** vira número — na Fase 5; antes, decidir a P27 (`pendencias.md`).
- **Fora, e não pedido:** busca, ordenação e troca de visualização que a Udemy tem no topo da lista.

### Bloco B — Informações básicas do curso: limites e descrição formatada  *(27/09/2026 · pedido do operador)*

> O operador não sabia quantos caracteres cabiam nos campos, e a descrição não tinha negrito. Pediu
> o que os grandes fazem. **Decisões dele (27/09):** Título **60** · Subtítulo **120** · Slug **80**
> · Descrição **5.000** · a descrição aceita **negrito, itálico e listas**, sem link · **botões +
> aba Visualizar**, como no GitHub. O editor de HTML segue recusado (23/09).

- [x] **Limites nos dois lados** *(27/09, no `dev`)*. `LIMITES_DO_CURSO` em
      `core/src/constants/content.ts`; o `courseCreateSchema` e o `slugSchema` recusam acima (vale
      também para o slug da trilha). Cada campo mostra **"usados/limite"** e trava no número; curso
      antigo acima do limite mostra o aviso e não salva.
- [x] **Descrição em Markdown** *(27/09, no `dev`)*. `MarkdownField.tsx` (abas Escrever e
      Visualizar; botões Negrito, Itálico, Lista, Lista numerada, que desfazem no segundo clique) +
      `MarkdownText.tsx`, o único lugar que mostra Markdown no React (`react-markdown`, com a lista
      do que vale; HTML digitado vira texto; link e imagem não saem). A prévia baixa só quando
      aberta. Testes: 6 de servidor + 13 de tela; mutações (tirar o limite do servidor, trocar por
      HTML cru, tirar a lista do que vale, o botão não marcar) reprovam. Textos aprovados pelo
      operador em 28/09/2026.
- **Fora:** limite nos outros campos de texto (backlog do P2, abaixo) · mostrar a descrição ao aluno
  (a página de curso de hoje não mostra; ver o *DEPOIS* do C5).

### Bloco E — O editor do curso em passos  *(decisões do operador, 27–28/09/2026)*

> O operador mandou os 29 prints do admin de curso da Udemy; o agente cruzou com a escola e
> pesquisou cinco plataformas, e o operador respondeu item a item. **Cada linha abaixo é decisão
> dele.** O porquê da organização e o que ficou fora estão em `courses.md` → *O admin do curso*.
> **Cada etapa passa por plano aprovado antes do código.**

**Etapa 1 — o menu do curso em passos (agora, sem depender de nada):** *plano aprovado em
28/09/2026, em 5 partes (1a–1e), um commit cada. Respostas do operador no mesmo dia: onde fica
cada campo, a regra do ✓, 160 caracteres nas três listas e o Visualizar esperando o C5 — em
`courses.md` → O admin do curso.*
- [x] **1a — os passos existem** *(28/09, no `dev`)*. O formulário único virou **um menu no nível
      2** com **7 passos em ordem de preenchimento**, cada um com ✓ quando completo: Informações
      básicas · Para quem é · Conteúdo · Legendas · Página do curso *(hoje "Mídia e destaques",
      29/09)* · Mensagens · Publicar.
      **Cada passo salva a sua parte.** Topo: voltar, título e status em português.
      Endereços: `/admin/cursos/novo` (só o passo 1; "Criar curso" grava e abre o editor) e
      `/admin/cursos/:id/{basico,para-quem-e,conteudo,pagina,publicar}`; `/admin/cursos/:id`
      leva ao passo 1. Legendas e Mensagens são texto **EM BREVE** (etapas 3 e 4).
      Como funciona: o mapa de navegação ganhou a seção "Editar curso" (`/admin/cursos/:id`,
      fora do menu lateral; o `:id` só casa com número), e o nível 2 ganhou item planejado e
      o ✓. Os passos, os campos de cada um e a regra do ✓ moram em
      `client/src/lib/course-steps.ts`; o ✓ lê o curso **gravado**, na mesma consulta do
      editor (`lib/nav-marks.ts`). O formulário nasce uma vez por curso: o que foi digitado e
      não salvo continua ao trocar de passo, e salvar um passo manda só os campos dele. A seção
      "Organização" se dividiu (idioma e nível → Básicas; camadas → Página; status e ordem →
      Publicar), e o status aparece em português. `AdminCourseFormPage` saiu; os testes dele
      foram para `pages/admin/course-editor/` sem perder caso. Testes: 22 do editor, 12 de
      mídia, 5 de Novo curso, 10 da regra do ✓, 4 do mapa. **Mutação:** passo mandando campo
      de outro, salvar sem recarregar o curso, Legendas virando link, `:id` aceitando texto, as
      200 palavras, o módulo em rascunho, a capa sem recarregar, o idioma sem trava e o
      formulário se reiniciando a cada recarga → todas reprovam. Revertido. Textos aprovados pelo
      operador em 28/09/2026.
      **Ficam para depois:** a **duração publicada** no topo (entra com o vídeo das aulas, Bloco
      U etapa 3: hoje a aula não tem duração) e o **Visualizar** (espera o C5, abaixo).
      *(A duração entrou em 29/09/2026: ver "A duração do curso no topo", no mapa do que falta.)*
- [x] **1b — Publicar** *(28/09, no `dev`)* reúne o que falta (a barra de Preenchimento, agora
      também no editor — `components/admin/CompletenessBar.tsx`, a mesma do cartão), status em
      português, ordem no catálogo e **o link do curso com o botão de copiar**
      (`course-form/CourseLinkField.tsx`). O link sai do slug e do idioma **gravados**, pelo
      `enderecoDoCurso` do `core` (`/curso/:slug`; `/en/course/:slug`, com o aviso de que a página
      em inglês ainda não existe). O link fica sempre num campo só de leitura: sem área de
      transferência (ou com a permissão negada), a tela diz para copiar à mão. *O guia
      modern-web-guidance não tem receita de área de transferência (consultado): padrão comum,
      com checagem do recurso e o aviso numa região `role="status"`.* Testes: 6 do Publicar, 2 da
      descrição curta no cartão, 1 de servidor ajustado. **Mutação:** descrição curta contando
      como feita, o aviso sem dizer "curta", o copiar salvando o passo, o link ignorando o idioma,
      o erro de cópia virando sucesso e o servidor contando marcador de Markdown como palavra →
      todas reprovam. Revertido.
- [x] **A aula que passa para a próxima e o vídeo que volta de onde parou** *(decisões do operador,
      05/10/2026)*: o FIM do vídeo abre a próxima aula da lista na hora (vídeo ou texto; aluno e
      prévia do admin; na última, fica); a aula de texto espera o clique. Quem sai e volta abre no
      mesmo ponto, pausado se tinha pausado — guardado no navegador, por aula (`t` e `autoplay` no
      endereço do Bunny); ver até o fim apaga o ponto. A prévia grátis do visitante fica para a
      página pública. Mutação: o fim sem passar de aula, abrir sempre tocando e não apagar o ponto
      no fim — reprovam.
- [x] **Visualizar como aluno** *(decisão do operador, 04/10/2026 — muda o alvo: a TELA DO ALUNO,
      logada, onde ele assiste às aulas, e não a página pública)*: botão **Visualizar** no TOPO do
      editor, entre "Voltar para cursos" e "Salvar", em todo passo (operador, 04/10/2026; nasceu
      no passo Publicar e subiu no mesmo dia), em nova aba, para **qualquer status**; o operador simula o aluno entrando no curso enquanto
      cadastra. Com aula, `/admin/cursos/:id/previa` leva à **primeira aula** na ordem do Conteúdo
      (a rota de admin da página da aula já marca o rascunho); sem nenhuma aula, mostra a tela do
      aluno com o título, *"Este curso ainda não tem aulas."* e o "Sobre o curso"
      (`GET /api/admin/courses/:id/pagina`, `requireAdmin`). Abrir a prévia é o admin abrindo a
      aula: texto conta como concluído para ele e a boas-vindas chega no sino dele. **Fica assim** (decisão do
      operador, 09/10/2026 — a P43: "abriu a aula, conta como vista"). Mutação: a
      prévia ignorando rascunho (cliente e servidor) e a rota sem `requireAdmin` — reprovam.
      *O texto abaixo é o histórico do Visualizar da página PÚBLICA, que continua com o C5:*
      a rota pública continua devolvendo só o publicado. **Espera o C5** *(operador,
      28/09/2026)*: a página pública de curso de hoje ainda é React e nem mostra a descrição,
      então a prévia mostraria outra página. **Onde fica** *(operador, 29/09/2026)*:
      um link no passo **Publicar** para abrir a página pública do curso e conferir como ficou.
      Por isso o passo de imagem, vídeo, destaques, perguntas e camadas deixou de se chamar
      "Página do curso" e passou a **"Mídia e destaques"** (o endereço `/pagina` ficou).
- [x] **1e — Dicas embaixo dos campos** *(28/09, no `dev`)*: o agente escreveu o rascunho, **todas
      num arquivo só, `client/src/lib/course-hints.ts`, para a revisão do operador ser de uma vez**
      (ele pediu para seguir e revisar depois — 28/09). Cada dica diz só o que já é regra ou fato
      do sistema (limites, slug permanente, o que o aluno vê), nenhuma inventa regra de produto.
      O `Field` ganhou `dica` e `descritoPor()`: o campo aponta para a dica **e** para o contador
      no `aria-describedby`, então o leitor de tela lê os dois. Nas três listas, a dica fica sob o
      título da lista e todo item aponta para ela. Testes: 14 (um por campo, e o contador junto).
      **Mutação:** a ligação ignorando a dica, a dica sem id e os itens sem a dica → reprovam.
      Revertido.
- [x] **1d — "Todos os níveis"** no Nível *(28/09, no `dev`)*: valor novo no enum `Level`, com a
      migration `20260928120000_level_todos_os_niveis` (só `ALTER TYPE … ADD VALUE`, escrita à mão:
      o `migrate dev` não roda no terminal do agente). Rótulo no dicionário ("Todos os níveis" /
      "All levels"), e o Nível do admin passou a mostrar os nomes em português no lugar do código
      do banco. **Passo 0 no banco de dev**, antes e depois: as mesmas contagens em todas as
      tabelas (só mudaram `_prisma_migrations` 8→9 e uma sessão, a do login de conferência), 0
      tabelas sem RLS, login do admin 200 e "No difference detected". A suíte do servidor recria
      o banco do zero, então prova que a migration replica. **Produção recebe a migration pelo
      pre-deploy no próximo publish.** Testes: 2 de servidor, 1 de tela. **Mutação:** sem a
      migration → o servidor reprova ao gravar; o Nível mostrando o código → a tela reprova.
      Revertido.
- [x] **1c — As três listas viram um campo por item** *(28/09, no `dev`)*, com contador, lixeira e
      ordem; **as três com até 160 caracteres por item** *(era só "O que vai aprender"; os outros
      dois, operador em 28/09/2026)*. `course-form/ListItemsField.tsx` (o `useFieldArray` do
      react-hook-form; cada item `{ valor }`); as setas são botões, então funcionam pelo teclado,
      e o primeiro não sobe nem o último desce. Lista vazia abre com um campo em branco, que não
      vai no envio. O limite mora em `LIMITES_DO_CURSO.itemDaLista` (`core`), e o servidor recusa
      item de 161 (400, a lista antiga fica); curso antigo acima do limite mostra o aviso no
      próprio item e não salva. `lib/array-field.ts` (o "um item por linha") saiu: só o
      formulário de curso o usava. Testes: 8 das listas, 4 de servidor. **Mutação:** servidor
      sem o limite, tela sem o limite, "descer" sem mudar a ordem, campo em branco indo no envio
      e o campo sem trava → todas reprovam. Revertido.
- [x] Descrição curta conta como **"falta"** no Preenchimento, sem travar. **Curta = menos de 200
      palavras** *(operador, 28/09/2026)*. Feito na 1b: a lista do admin devolve
      `descriptionWordCount` (no lugar do sim/não), contado pelo `contarPalavras` do `core` — o
      mesmo do ✓ —, e o que falta diz "Descrição curta (menos de 200 palavras)".

**Etapa 2 — o Conteúdo (junto com a etapa 3 do Bloco U, o vídeo das aulas):** *plano aprovado em
28/09/2026, em 5 partes (2a–2e), um commit cada; o operador pediu para fazer tudo e revisar no
fim. Respostas dele no mesmo dia: **dnd-kit liberado** · vídeo das aulas **testado no ar** ·
arquivos numa **Storage Zone própria, sem CDN**, entregues só pelo servidor · **quiz em etapa
própria**.*
- [x] **2a — preparação** *(28/09, no `dev`)*. A lista de aulas (328 linhas) virou três arquivos em
      `components/admin/course-content/` (`ModuleLessonTree`, `ModuleCard`, `LessonRow`). **Uma
      rota só para a ordem:** `PUT /api/admin/courses/:id/estrutura` recebe a lista inteira
      (`{ modulos: [{ id, aulas }] }`) e grava numa transação; a aula pode mudar de módulo **dentro
      do curso**, e a lista tem que ser exatamente a do curso (aula ou módulo de outro curso,
      faltando ou repetido → 400, nada muda). As setas passaram a usar essa rota: antes trocavam
      dois números em duas gravações, e itens empatados no 0 não saíam do lugar. A ordem nova sai
      de `lib/course-structure.ts` (função pura). Setas e lixeiras ganharam nome para leitor de
      tela, e o status de módulo e aula aparece em português. **Trava da Fase 3:** a árvore da
      trilha (`/trilhas/:slug` e `/mine/:id`) trocou `include` por `select` explícito, com teste
      dos campos. Testes: 9 de servidor (ordem) + 1 (campos da trilha), 6 da função, 5 de tela.
      **Mutação:** aula de outro curso aceita, repetição aceita, trilha de volta ao `include`,
      a direção ignorada e a seta mandando lista parcial → todas reprovam. Revertido.
- [x] **2b — "+" entre dois itens** (passar o mouse entre eles mostra o "+") para inserir aula ou
      módulo ali, também pelo teclado *(28/09, no `dev`)*. `course-content/InsertPoint.tsx`:
      escondido por **opacidade** (nunca `hidden`), então o Tab o alcança; entre aulas oferece
      **Aula de vídeo · Aula de texto · Quiz (EM BREVE, sem ação)**; entre módulos, **Módulo**
      (vai direto ao título). A aula ou o módulo nasce **na posição**: `POST
      /api/admin/modules/:id/lessons` e `POST /api/admin/courses/:id/modules` com `posicao`, e
      o servidor reescreve a ordem numa transação (desempata itens no 0). **Aula de texto:**
      migration `20260928140000_lesson_kind_content` (enum `LessonKind` VIDEO|TEXT, as aulas
      antigas viram VIDEO; `Lesson.content`), painel "Editar texto" com o mesmo `MarkdownField`
      da descrição (generalizado), até **20.000 caracteres** *(proposta do agente no plano
      aprovado)*. **O servidor recusa texto em aula de vídeo** (400 `TextoSoEmAulaDeTexto`), e o
      tipo não muda depois de criada. **O texto é conteúdo pago: provado por teste que não sai**
      na página do curso, na aula pública nem na busca. Passo 0 no dev: mesmas contagens (só
      `_prisma_migrations` 9→10), 0 sem RLS, login 200, "No difference detected". Testes: 10 de
      servidor, 8 de tela. **Mutação:** posição ignorada, texto aceito em aula de vídeo, texto
      saindo na aula pública, posição errada na tela, "+" com `hidden` e o quiz virando botão →
      todas reprovam. Revertido.
- [x] **2c — Arrastar para reorganizar** aulas e módulos, **mantendo as setas** para o teclado
      *(28/09, no `dev`)*. Peça nova **dnd-kit, liberada pelo operador em 28/09** (registro e
      gatilho em `tech-stack.md`) — **a mesma do C4 etapa 5** (ordem dos cursos e das perguntas
      frequentes). `course-content/arrastar.tsx`: alça de arrastar (botão com nome) em cada módulo e
      aula; **a aula pode ir para outro módulo do curso**; a ordem nova sai de `aplicarArraste`
      (função pura) e vai pela rota única da 2a; soltar no mesmo lugar não grava. Pelo teclado:
      espaço pega, setas movem, espaço solta, com instruções e avisos **em português**. **Achado
      do teste, corrigido na mesma parte:** a seta para baixo, partindo de um módulo, parava na
      primeira aula dele e o módulo não saía do lugar; agora a seta só procura item do mesmo tipo.
      O passo Conteúdo carrega sob demanda: **o dnd-kit não está no pacote do aluno** (build
      conferido). Testes: 9 da função, 5 de tela (o jsdom não mede a tela: o teste dá a cada
      elemento uma posição falsa, na ordem da página). **O arraste com o mouse o operador confere
      na tela.** **Mutação:** a seta sem filtrar o tipo, a aula indo para o fim, soltar no mesmo
      lugar gravando, a aula sumindo e as instruções em inglês → todas reprovam (a terceira só
      depois de corrigir o teste, que soltava antes da medida e não podia falhar). Revertido.
- [x] **Tipos de item no "+":** Aula (vídeo **ou** texto) e Quiz. Aula de texto tem o seu
      texto, com negrito e listas; **aula de vídeo não tem descrição** (confirmado em 28/09).
      *Feito na 2b; o Quiz aparece como EM BREVE até a etapa própria dele.*
- [x] **2e — Arquivos para baixar por aula, só para assinantes**, guardados de forma protegida
      *(28/09, no `dev`: o ENVIO pelo admin)*. **Onde, decisão do operador de 28/09:** uma
      **Storage Zone própria do Bunny, sem Pull Zone** (nada lá tem endereço público; só o nosso
      servidor entrega). Tabela `lesson_file` (migration `20260928180000_lesson_file`, com RLS):
      aula, nome original, caminho, tamanho. O arquivo chega cru (como a capa), com o nome no
      cabeçalho; **no Storage o nome é aleatório** (`aulas/<aula>/<24 caracteres>.<ext>`), o do
      operador fica só no banco, e a tela **nunca** recebe o caminho. Limite de **50 MB** e as
      extensões **pdf, xlsx, xlsm, xls, csv, docx, pptx, pbix, zip, txt, sql, py, ipynb, json**
      *(propostas do agente no plano aprovado)*, conferidos na tela e no servidor. **Trava contra
      o apagar recursivo** (fato da doc, via context7 em 28/09: apagar pasta no Bunny apaga tudo
      dentro): apagar só aceita caminho de arquivo nesse formato exato. Se o Bunny recusar
      apagar, o registro fica (502). Sem as variáveis, 503 — "O armazenamento de arquivos não está
      configurado neste ambiente." Tela: botão **Arquivos** em cada aula (`LessonFilesPanel.tsx`),
      um painel aberto por vez. Passo 0 no dev: tabela nova vazia **com RLS**, as outras contagens
      iguais, login 200, "No difference detected". Testes: 24 de servidor (com a trava do caminho,
      função pura), 7 de tela. **Mutação:** a trava aceitando pasta, qualquer extensão, o nome do
      operador no Storage, o caminho saindo para a tela, apagar o registro com o Bunny recusando,
      o envio sem `requireAdmin` e a tela sem conferir o tipo → todas reprovam. Revertido.
      **A entrega ao aluno** (só assinante, sempre como download) **entra com a trava de acesso,
      na etapa 4 do Bloco U**: hoje nenhuma rota entrega o arquivo.
- **Revisão de segurança (`security-vulnerability-reviewer`) das partes 2d e 2e, 28/09/2026:
  nenhum P0 nem P1.** Conferiu: só admin nas rotas novas; chave e token key nunca em resposta nem
  em log; token no formato da doc, 6 h; nenhuma leitura pública devolve vídeo, envio em andamento,
  texto da aula nem endereço assinado; o `PATCH` da aula descarta `bunnyVideoId`; a trava do
  caminho impede apagar pasta. **Quatro P2 (baixo), registrados e NÃO corrigidos** (decisão de
  quando é do operador):
  - [ ] **Corrida na troca de vídeo** (`admin-lesson-video.ts`): o `complete` lê e depois grava sem
        condição; com **duas abas do admin** trocando o vídeo da mesma aula ao mesmo tempo, a
        limpeza pode apagar o vídeo em uso. Correção proposta: `updateMany` condicional
        (`where: { id, bunnyVideoPendingId }`) e apagar só se `count === 1`, com teste que
        intercala os dois pedidos. *O vídeo de apresentação (`admin-media.ts`) tem a mesma forma.*
  - [x] **Excluir aula, módulo ou curso não apaga no Bunny** o vídeo, o envio pendente e os
        arquivos (a cascata do banco perde o caminho). **FEITO em 28/09 — decisão do operador:**
        *"deveria excluir o vídeo, já que ele ficaria perdido no Bunny"*. `server/src/lib/
        limpeza-no-bunny.ts`: excluir **aula** apaga no Bunny os arquivos, o envio pela metade e o
        vídeo; **módulo** faz isso em cada aula; **curso** também, e mais o vídeo de apresentação
        (e o envio pela metade dele). **O Bunny primeiro, o registro depois:** se o Bunny recusar,
        a exclusão para (502 `BunnyNaoApagou`) e a tela avisa; cada coisa apagada lá sai do banco
        na hora, então tentar de novo continua de onde parou. Sem o Bunny configurado, aula com
        vídeo ou arquivo não se exclui (não há como apagar lá). *Não confundir com a deleção de
        vídeo de curso ARQUIVADO, proposta e rejeitada em Ago 2026: arquivar continua não apagando
        nada; isto é só a EXCLUSÃO.* Testes: 9 de servidor, 4 de tela. **Mutação:** excluir sem
        limpar (aula e módulo), excluir com o Bunny recusando, esquecer o envio pela metade, não
        tirar do banco o que já foi apagado, esquecer a apresentação e a tela sem aviso → todas
        reprovam. Revertido.
  - [ ] **Testes de "não vaza" sem as trilhas do aluno:** o do texto da aula não consulta
        `/api/trilhas/:slug` nem `/mine/:id`, e o do vídeo não consulta `/mine/:id`. O código
        protege (`select` explícito), mas nenhum teste reprova se voltar o `include`.
  - [x] **Nome do arquivo para o download** (etapa 4): na rota de entrega, usar
        `res.attachment()`/`res.download()` (nunca interpolar no `Content-Disposition`) e tirar do
        nome os caracteres de direção de texto (U+202E e parecidos), que disfarçam a extensão.
        **FEITO na etapa 4 do Bloco U (29/09):** `res.attachment(nomeParaDownload(...))` em
        `routes/lesson-view.ts`; `lib/nome-do-download.ts` tira os caracteres invisíveis.
- [x] **Excluir a aula (ou o curso) não apaga os arquivos dela no Bunny** *(achado da 2e;
      **feito em 28/09** junto com o vídeo, decisão do operador — ver a revisão de segurança,
      acima)*. O registro some pela cascata do banco; o arquivo
      fica na zona, que não é pública, então não vaza — mas ocupa espaço (US$ 0,02/GB/mês). Fazer
      junto com a entrega ao aluno (etapa 4 do Bloco U), ou antes, se o operador pedir.
- [x] **Editar e adicionar como na Udemy** *(decisões do operador, 28/09/2026, a partir dos prints
      dele: "tem um monte de salvar")*. **Nenhum Salvar solto na tela:** a linha do módulo e a da
      aula mostram só o texto (título, tipo, camada, status em português, "Prévia grátis"); o
      **lápis** abre a edição daquele item, com **Cancelar** e **Salvar** (`ModuleHeader.tsx`,
      `LessonEditForm.tsx`). **Adicionar já grava:** os campos fixos "Título da nova aula" e
      "Título do novo módulo" viraram os botões **"+ Aula"** e **"+ Módulo"**, que abrem o mesmo
      formulário do "+" entre itens; o botão que grava diz **"Adicionar aula"** / **"Adicionar
      módulo"** (era "Criar"). O "+" discreto depois do último item saiu (o botão fixo faz esse
      papel), e o "+" fica no começo da linha, não no centro (pedido dele, no mesmo dia). O botão
      do conteúdo da aula de texto passou a "Texto da aula", par de "Vídeo da aula". *O "objetivo
      do módulo" que a Udemy pede ao criar a seção continua fora (decisão de 27–28/09).* O cartão
      do módulo se dividiu (`ModuleCard`, `ModuleHeader`, `LessonList`); opções e estilos
      compartilhados em `course-content/opcoes.ts`. Testes: 6 novos, 8 ajustados. **Mutação:** a
      linha nascendo em edição (aula e módulo), Cancelar gravando, Salvar sem fechar e os botões
      fixos na posição errada → todas reprovam. Revertido.
- [x] **2d** — Vídeo **sem limite** de tamanho ou resolução no site; **um por vez**; **sem reuso**
      entre aulas *(28/09, no `dev`: é o vídeo das aulas, Bloco U etapa 3 — detalhe lá)*.
- [ ] **Quiz escrito pelo operador** — **etapa própria** *(decisão do operador, 28/09/2026: tem
      decisões dele — uma ou várias respostas certas, explicação, nota mínima, o que o aluno vê)*.
      No "+", aparece como EM BREVE.

**Etapa 3 — Legendas:**
- [ ] **Tela própria** no passo 4: "x de y aulas com legenda"; enviar, baixar e excluir o `.vtt`
      por vídeo. Legenda só em português. A regra do nome do arquivo (`bunny.md` §7.1)
      continua valendo.
- **Decisões do operador, 04/10/2026** (a partir da tela da Udemy): **uma legenda por aula**, sem
  envio em lote; **a apresentação também tem legenda**; **sem editor de texto na tela** — corrigir
  é enviar de novo, que substitui. O menu de cada linha: Enviar/Substituir, Baixar, Excluir.
- [x] **Etapa 3a — banco, Bunny e servidor (04/10/2026):** tabela `caption` (uma por aula ou pela
      apresentação; CHECK de um dono só; RLS) com a **cópia** de cada legenda — é ela que a tela
      lista, que o "Baixar" entrega e que a troca de vídeo vai reenviar (etapa 3c). Rotas do admin
      `/api/admin/courses/:id/legendas`, `/api/admin/lessons/:id/legenda` e
      `/api/admin/courses/:id/legenda-apresentacao` (enviar, baixar, excluir). Só `.vtt` que começa
      com `WEBVTT`, até 2 MB, sem byte nulo; o Bunny primeiro (recusou, nada gravado). Revisão de
      segurança sem P0/P1; os três P2 de código e teste corrigidos.
- [x] **Etapa 3b — a tela Legendas (04/10/2026):** o passo deixou de ser EM BREVE. A apresentação e
      cada módulo com as suas aulas de vídeo; o estado de cada linha ("Legenda enviada", "Sem
      legenda", "Envie a legenda de novo", "Envie o vídeo primeiro") e há quanto tempo; as ações
      Enviar/Substituir, Baixar e Excluir (com confirmação) **na própria linha** — o menu "⋮" da
      Udemy fica para o acabamento do Antigravity, se o operador quiser; a contagem e "Todas as
      aulas publicadas têm legenda."; a mensagem flutuante do editor ao enviar ou falhar.
- [x] **Materiais exclusivos no passo Publicar** *(decisão do operador, 04/10/2026; feito no mesmo dia — migration `course_materiais`, caixas em `CourseMaterialsSection.tsx`)*: caixas de
      marcar para a lista fixa (hoje Biblioteca de prompts e Apostila), gravadas em
      `Course.materiais[]` (enum do Prisma, migration própria), com o texto de cada item global em
      `common.*` (editável em Admin → Textos) — o mesmo desenho das Camadas. Alimenta o quadro
      "Este curso inclui" da vitrine (`courses.md` §10.10; Bloco C5).
- [x] **Etapa 3c — trocar o vídeo não perde a legenda (04/10/2026):** ao terminar a troca do vídeo
      da aula ou da apresentação, o site manda a legenda guardada para o vídeo novo
      (`server/src/lib/legendas.ts`). Se o Bunny recusar (ou a rede cair), o vídeo troca do mesmo
      jeito e a linha mostra **"Envie a legenda de novo"**, fora da contagem; enviar pela tela tira
      a marca. **Fato a confirmar no ar:** se o Bunny aceita legenda enquanto o vídeo novo ainda
      processa — se não aceitar, a marca aparece e o operador reenvia depois.
- [x] **ACHADO NO TESTE NO AR (operador, 04/10/2026): a legenda trocada seguia antiga no player**
      (o "Baixar" trazia a nova). Causa: o cache do CDN do Bunny. **Correção (decisão do operador):**
      ao substituir ou excluir, o site limpa o cache da legenda e do `playlist.m3u8`, com a chave da
      conta (`bunny.md` §5 item 5; a chave é a P40). Sem limpar, a tela avisa que o player pode
      mostrar a anterior por algumas horas. O tamanho da letra da legenda é ajuste de visual da
      biblioteca no painel (vale para todos); não achei na doc um controle para o aluno.

- [x] **Atualizar o site sem atrapalhar quem está estudando** *(decisão do operador, 06/10/2026: "recarrega
      só se houver versão nova")*. O app de uma página só roda a versão de quando a aba abriu; antes,
      uma publicação podia deixar a aula em branco ou recarregando. Três camadas, mais a rede de
      05/10 (recarregar uma vez / tela de erro) como último recurso:
      (1) **o leitor de texto da aula é baixado logo depois de abrir** (`PEDACOS_DO_ALUNO`), então
      a aba aberta não depende dele depois; (2) **identidade da versão** gerada na montagem do Vite
      (`versao.txt` + `__VERSAO_DO_APP__`), mandada pelo servidor de produção em toda resposta da
      API (`X-Versao-Do-App`); quando não bate, **o próximo clique num link ou a passagem
      automática de aula carregam a página inteira**, já atualizada (`client/src/lib/versao.ts`);
      (3) **API aditiva** como regra (`CLAUDE.md` → Rendering Boundary). E a página do app nunca
      fica guardada no navegador (`Cache-Control: no-cache`). Fora: manter versões antigas no ar
      (CDN ou disco persistente — na Railway, disco persistente custa segundos fora do ar a cada
      publicação). Fontes: Next.js (`deploymentId` → navegação completa, via context7), Vercel
      Skew Protection, doc do Vite (`vite:preloadError`, `no-cache` no HTML), "Version Skew"
      (Malte Ubl). Mutação: a comparação sempre igual, o clique sem desviar e o fim do vídeo sem
      carregar a página — reprovam. *O cabeçalho só existe em produção: conferido no site depois
      de publicar.*
- [x] **O mesmo cuidado para a área logada inteira, do aluno e do admin** *(pedido do operador,
      06/10/2026: "não só na página de aula")*. Auditoria do que ainda podia quebrar numa aba aberta
      durante uma publicação, e o conserto de cada achado: (1) **os pedaços do editor de curso**
      (passo Conteúdo e seletor de ícones) passam a ser baixados em segundo plano para quem é admin
      (`PEDACOS_DO_ADMIN`) — o operador costuma publicar com o editor aberto; (2) **o ícone dos
      Destaques** na página do curso: se os desenhos não vierem, mostra o Brilho e a página segue
      (antes, a tela de erro e o recarregar); (3) **o envio de vídeo** (da aula e de apresentação)
      **não é cortado** por uma atualização: enquanto ele corre, nada carrega a página inteira
      (`semInterromper`); (4) **teste-guarda** (`client/src/lib/pedacos.test.ts`): um `import()` novo
      fora das listas reprova a suíte — a regra deixa de depender de memória; (5) **o servidor
      antigo termina os pedidos em andamento antes de sair**: a Railway o desligava na hora (padrão
      de 0 s, conferido na doc dela via context7), cortando um "marcar como concluída" ou um
      "Salvar" que estivesse no meio — agora `drainingSeconds: 30` no `railway.json` +
      `desligarComCalma` no aviso de desligar (`server/src/lib/desligar.ts`). Já coberto sem código
      novo: a volta à aba busca os dados de novo (React Query), o que já informa a versão. Mutação:
      as 9 partes reprovam.
- [x] **Defeito corrigido (06/10/2026, achado do operador): sair de uma aula de vídeo derrubava a
      próxima na tela de erro** — a passagem automática ao fim do vídeo e o clique em outra aula
      abriam "Algo deu errado ao abrir esta tela" (às vezes: só quando o player saía da página).
      **Causa, reproduzida em teste com o `player.js` de verdade:** ao sair da aula, o app manda o
      player parar de avisar; nessa hora o iframe já saiu da página, e o `player.js` tenta mandar
      uma mensagem para a janela dele, que não existe mais (`TypeError`) — o erro sobe até a tela de
      erro da aula seguinte. Os testes não pegavam porque trocavam o `player.js` por dublê.
      **Agora:** sem o iframe na página, parar de ouvir não fala com ele (e nunca derruba a tela)
      (`client/src/lib/player-do-bunny.ts`); teste novo com o pacote de verdade
      (`player-do-bunny.real.test.ts`). Mutação: sem a proteção, reprova.
- [x] **A mensagem do curso mostra o que está no admin** *(decisão do operador, 06/10/2026 — P46,
      opção b: "mostra o que está no Admin porque lê o que está corrigido; e-mail vai ser o que
      chegar no e-mail do aluno e aí sim não tem como mudar")*. Corrigir a boas-vindas ou os
      parabéns corrige também para quem já recebeu (`GET /api/notificacoes` lê o texto e o título
      atuais do curso). **Só enquanto o curso está publicado:** fora do ar ele pode estar sendo
      reescrito em rascunho, e o texto e o título novos não vazam pelo sino (achado P1 da revisão de
      segurança de 04/10 continua valendo) — vale o que foi copiado no envio, que segue gravado.
      Mensagem apagada no admin também volta ao que chegou. "Ir para o curso" fica só nas mensagens
      de curso; os avisos da Comunicação (4d) não terão esse link. Mutação: as 4 partes reprovam.
      *Gatilho de reabertura: a mensagem do curso passar a sair também por e-mail — aí o e-mail é o
      retrato do envio, e a tela pode continuar lendo o atual.*
- [x] **Notificações em Meus estudos: lista e mensagem completa** *(decisões do operador, 06/10/2026,
      a partir da Udemy: "o sino é só mais um atalho")*. (1) **"Notificações" no menu de Meus
      estudos, embaixo de Salvos**; (2) **a página vira LISTA** — título, 2 primeiras linhas e
      data de cada uma (`/aluno/notificacoes`); (3) **clicar abre a mensagem completa**, com os
      parágrafos, o link do curso e a volta para a lista (`/aluno/notificacoes/:id`,
      `NotificacaoPage`); (4) **o sino leva à mesma mensagem**; (5) **abrir a mensagem é o que a
      marca como lida** — um lugar só, venha do sino ou da lista (antes, era o clique no sino).
      Texto novo, rascunho do agente: "Notificação não encontrada." e "Notifications" no menu em
      inglês (P45). Mutação: as 6 partes reprovam.
- [x] **Defeito corrigido (06/10/2026, achado do operador): a prévia do sino mostrava a mensagem
      inteira, numa massa só**, em vez das 2 primeiras linhas (o texto inteiro, com os parágrafos,
      fica em "Ver todas"). Causa: `line-clamp-2` junto de `block` — a classe de exibição vem
      depois no CSS do Tailwind e anula o corte. Defeito do agente, de 04/10. Teste-guarda
      `client/src/components/corte-de-linhas.test.ts` reprova a combinação em qualquer tela
      (mutação: devolver o `block` reprova); regra 14 no `GEMINI.md`.
- [x] **Aula aberta há mais de 24 h: o player renova o endereço sozinho** *(decisão do operador,
      06/10/2026: "se expirar, recarrega a página ao dar play ou recarrega aula" — fecha o achado da
      varredura do mesmo dia)*. A doc do Bunny (context7) diz que abrir o player com o endereço
      vencido dá 403. Agora o `BunnyPlayer`, 10 min antes de vencer — ou quando a pessoa dá play num
      vencido (o relógio atrasa com a aba em segundo plano) —, pede um endereço novo à página da aula
      e recarrega só o player, no ponto guardado, pausado se estava pausado. Um pedido por vez (o
      play avisa várias vezes por segundo). Endereço que ainda vale nunca troca: trocar de aba
      continua sem recomeçar o vídeo. Mutação: as 6 partes reprovam.
- [x] **A duração de cada aula, o "% concluído" no topo da aula, e o endereço inexistente** *(decisões
      do operador, 06/10/2026, a partir do LinkedIn Learning)*: (1) no Conteúdo do curso da página
      da aula, **a duração embaixo de cada aula de VÍDEO** ("1min 22s", "48s", "1h 05min" —
      `minutosESegundos`); aula de texto e vídeo ainda processando vêm sem (o servidor manda
      `duracaoSegundos`, pela mesma regra da soma do curso: aula que virou texto não leva o tempo do
      vídeo antigo); (2) **no topo da aula, depois de "Salvar curso", o "% concluído"** — o mesmo
      número da barra e do cartão, só logado; (3) **endereço que não existe no app leva ao Início**
      (P44 resolvida — rota `*` do `App.tsx`; antes, página em branco). Mutação: as 6 partes
      reprovam.
- [x] **Última varredura da área logada, do aluno e do admin** *(pedido do operador, 06/10/2026:
      "análise minuciosa de tudo que está na área logada para não quebrar")*. Consertado:
      (1) **concluir a aula, salvar e marcar notificação como lida tentam de novo** depois de um
      tropeço de rede ou erro do servidor (antes, a falha sumia em silêncio e a aula ficava sem
      concluir) — só essas três, que o servidor aceita repetidas; um 4xx nunca insiste
      (`client/src/lib/tentar-de-novo.ts`); (2) **ao abrir a página, se a conferência do login
      falhar** (rede, servidor), aparece a tela de erro com "Recarregar" — antes, quem estava logado
      era mandado para o login (`ProtectedRoute`, `AdminRoute`; conferido no código do Better Auth
      1.7.5 e via context7: numa falha DEPOIS de aberta, a sessão já se mantinha); (3) **a moldura do
      app** (menu, sino, topo) ganhou a mesma tela de erro que a tela tinha — antes, um defeito nela
      deixava a página inteira em branco; (4) **o ponto do vídeo é lembrado por aula E vídeo**:
      trocar o vídeo de uma aula por um mais curto fazia o ponto antigo cair depois do fim, e a aula
      pulava direto para a próxima. Conferido sem defeito: trocar de aba não recarrega o player;
      carregando/erro/vazio nas telas do aluno e do admin; o servidor não tem tarefa "solta" que o
      derrube, e o download de arquivo trata a falha. Mutação: as 9 partes reprovam.
      **Achados NÃO consertados (decisão do operador):** endereço inexistente dentro do app (ex.:
      um favorito antigo de `/conta`) mostra a **página em branco** — falta uma tela "Página não
      encontrada", que é texto e tela novos (P44 em `pendencias.md`); e um player aberto há **mais
      de 24 h** usa um endereço assinado já vencido — o que o Bunny faz ao dar play nele não está
      na doc, então não mexi sem medir.
- [x] **"Este curso inclui": o ícone CC nas legendas e o "Certificado de conclusão" fixo** *(decisões
      do operador, 05/10/2026 — fecha a P41)*: a última linha, em todo curso; o quadro sempre
      aparece. ⚠️ O certificado nasce na Fase 6.5 e precisa estar no ar antes do lançamento.
- [x] **Defeito corrigido (05/10/2026, achado pelo operador): a tela da aula ficava em branco** ao
      abrir uma aula de texto, ou ao clicar numa aula, depois de uma publicação com o site aberto.
      **Causa provada no site:** o pedaço antigo do app (`MarkdownText-Cse5IHeA.js`) não existe
      mais, e o servidor devolvia a página do app (HTML) no lugar do `.js` — o navegador falhava e,
      sem tela de erro, ficava tudo branco; recarregar resolvia. **Agora:** arquivo que não existe
      responde 404 (`server/src/lib/pede-arquivo.ts`); o app recarrega sozinho UMA vez quando um
      pedaço não carrega (`vite:preloadError` + trava de 30 s, `client/src/lib/recarregar.ts`); e
      qualquer tela que quebrar mostra "Algo deu errado… / Recarregar a página" com o menu ainda
      na tela (`ErroDaTela`, em volta das telas no `Layout`). A aula de texto vazia mostra "Esta
      aula ainda não tem texto.". Mutação: certificado sumindo, servidor devolvendo a página no
      lugar do arquivo, recarregar sem trava e a tela de erro removida — reprovam. *O 404 do arquivo
      só existe em produção: conferido no site depois de publicar.*
- [x] **Defeito corrigido (05/10/2026, achado pelo operador): salvar o passo Publicar dava erro
      depois de editar a Ordem**, com qualquer status. O campo guardava o texto digitado ("1"), e o
      Salvar de cada passo envia os valores crus do formulário (desde o editor em 7 passos, 28/09) —
      o servidor recusava (400). O campo agora guarda o número (`CoursePublishSection.tsx`); o teste
      edita a Ordem, salva e confere o envio contra o MESMO schema do servidor
      (`courseUpdateSchema`). Era o único campo numérico do formulário do curso.
- [x] **O ✓ dos passos Legendas e Mensagens** *(decisões do operador, 05/10/2026 — fecha a P42)*:
      Legendas com todas as aulas de vídeo publicadas com legenda em dia (a mesma conta do "x de
      y" da tela, numa função só no servidor — `contagemDeLegendas`; a apresentação não conta;
      sem aula de vídeo, sem ✓); Mensagens com as duas escritas. Enviar ou excluir legenda
      recarrega o curso, e o ✓ aparece na hora. Mutação: a conta ignorando a legenda a reenviar,
      mensagens com uma só e enviar sem recarregar o curso — reprovam.

**Etapa 4 — Mensagens e o sino:**
- [x] **O sino ao lado da foto, no topo**: área de avisos do aluno, com as mensagens de
      **boas-vindas** (ao abrir a primeira aula do curso) e de **parabéns** (ao concluir), e outras
      comunicações do operador ou do JilsonAI. **Sem e-mail.** O passo 6 do editor é onde ele
      escreve as duas mensagens do curso.
      **Plano aprovado em 04/10/2026, em três partes** (decisões do operador no mesmo dia, a partir
      da Udemy, do Bunny e do YouTube): boas-vindas na **primeira aula que o aluno abrir** (qualquer
      uma), só o **número no sino** (nada interrompe a aula), a **lista** com "Marcar todas como
      lidas" e a página **Ver todas**, e o nome **Notificações**.
  - [x] **4a — O passo Mensagens** *(04/10/2026)*: migration `notificacoes` (as duas colunas do
        curso e a tabela `notification`, uma de cada tipo por aluno e curso, CHECK e RLS); os dois
        campos em Markdown, até 2.000 caracteres, com o Salvar no topo. O ✓ do passo fica
        esperando a regra do operador. Mutação: o passo sem `congratsMessage` e o servidor sem
        `welcomeMessage` — as duas reprovam.
  - [x] **4b — O servidor manda, lista e marca como lida** *(04/10/2026)*: a boas-vindas na
        página da aula, só com assinatura (ou o admin, pela rota dele); os parabéns na conclusão
        da última aula (o aluno conta só o publicado; o admin, todas); o texto copiado no envio;
        `GET /api/notificacoes` (as 50 mais recentes + não lidas; o link do curso só enquanto
        publicado), `PUT …/:id/lida` (a de outra pessoa dá 404) e `PUT …/lidas`
        (`server/src/lib/notificacoes.ts`, `routes/notificacoes.ts`). Mutação: boas-vindas sem
        conferir a assinatura, parabéns contando rascunho e marcar sem conferir o dono — as três
        reprovam. **Revisão de segurança (04/10):** P1 corrigido — o título do curso também é
        copiado no envio (`notification.courseTitle`, migration `notificacao_titulo_do_curso`),
        senão um curso fora do ar renomeado em rascunho vazaria o nome novo pelo sino; P2
        corrigidos — os parabéns também exigem assinatura (a prévia grátis não basta), e a falha
        ao criar a notificação não derruba a aula nem a conclusão (`semDerrubar`, log só com ids e
        código). Mutação nas três correções: reprovam.
  - **4d — COMUNICAÇÃO: o lugar do operador para falar com os alunos** *(decisões do operador,
        04/10 e 06/10/2026, a partir da área Comunicação da Udemy; plano aprovado em 06/10)*.
        No menu do admin, **"Comunicação" antes de "Alunos"**, com o nível 2: Notificações ·
        Mensagens automáticas · Dúvidas · E-mails educacionais · E-mails promocionais · Insights
        do JilsonAI (o que ainda não existe, com EM BREVE). **O mapa Udemy → escola:**
        Perguntas e respostas → **Dúvidas, PRIVADO** (o JilsonAI responde primeiro; o que ele não
        resolve chega ao operador, e a resposta volta ao aluno — sem perguntas públicas entre
        alunos; a "Escalações" do JilsonAI Admin passa para cá) · Perguntas em destaque → não entra
        (as perguntas frequentes de cada curso já existem e alimentam o JilsonAI) · Insights do AI
        Assistant → **Insights do JilsonAI** (depois de uso real) · Mensagens automáticas → **a
        boas-vindas e os parabéns de cada curso, numa lista** · conversa 1 a 1 → a fila das Dúvidas
        · Tarefas → não existe na escola · Anúncios educacionais → **E-mails educacionais** ·
        E-mails promocionais → **E-mails promocionais** (só para quem aceitou) · o sino →
        **Notificações**. **E-mail pelo Resend** (doc via context7): ele faz o envio em massa, a
        página de descadastro (educacional × promocional) e os números (entregues, abertura,
        cliques, descadastro) — sem fila nem contador nossos. **Decisões do operador (06/10):**
        "todos" = **todo mundo com conta**; "de um curso" = **quem já começou o curso** (abriu uma
        aula com acesso — `CourseStart`); notificação enviada pode ser **editada** (todos veem o
        texto novo) e **apagada** (some do sino de todos).
    - [x] **C1, etapa 1 — banco e servidor** *(06/10/2026)*: migration `comunicacao_notificacoes`
          (`Announcement`, o enum `AnnouncementAudience`, `NotificationKind.AVISO`,
          `Notification.announcementId` com CHECK, e `CourseStart` preenchido com quem já tinha
          boas-vindas ou aula concluída; RLS nas duas tabelas novas — conferido: zero tabelas sem
          RLS); a página da aula registra o começo do curso (aula com acesso, logado; e o admin pela
          rota dele); `server/src/routes/admin-announcements.ts` (listar com recebidas/lidas,
          quantos vão receber, criar como rascunho, salvar, enviar uma vez só, apagar, e as
          mensagens automáticas em `/api/admin/course-messages`); o sino traz o aviso com o
          **título e o texto atuais** e sem link de curso (campo novo `titulo`, API aditiva).
          Mutação: as 6 partes reprovam.
    - [x] **C1, etapa 2 — as telas** *(06/10/2026)*: **Comunicação** no menu do admin, antes de
          Alunos, com o nível 2 (Notificações e Mensagens automáticas ativas; Dúvidas, E-mails
          educacionais, E-mails promocionais e Insights do JilsonAI com EM BREVE) — e "Escalações"
          saiu do JilsonAI Admin; **Notificações** (`/admin/comunicacao/notificacoes`): a lista
          (para quem, rascunho ou "Enviada em", "x de y leram", Editar, Apagar com confirmação), a
          **Nova notificação** e o **Editar** (título, texto no mesmo editor com Visualizar, para
          quem; Salvar como rascunho; **Enviar** salva, diz "Vai para N pessoas" e só envia ao
          confirmar; enviada: só Salvar, com o "para quem" travado); **Mensagens automáticas**
          (`/admin/comunicacao/mensagens-automaticas`): a boas-vindas e os parabéns de cada curso,
          com "Editar no curso"; no aluno, o sino e a mensagem mostram o **título do aviso**, sem
          "Ir para o curso". Defeito pego pelo teste antes de chegar à tela: "nenhum curso
          escolhido" virava **0** (e a mensagem saía "Number must be greater than 0" em vez de
          "Escolha o curso."). Textos do admin, rascunho do agente: P50. Mutação: as 8 partes
          reprovam.
    - [ ] **C2 — A base do e-mail** (nada chega a aluno): a peça `resend` e o renderizador de
          Markdown no servidor (dependências novas — OK do operador no bloco), um ponto só de envio
          (`server/src/lib/email.ts`, `await` em `try/catch`), o modelo base, "enviar um e-mail de
          prévia para mim" e o passo a passo do Resend para o operador (conta, domínio, remetente,
          chave na Railway).
    - [ ] **C3 — E-mails da conta**: "esqueci minha senha" (tela + e-mail; doc do Better Auth), a
          boas-vindas da conta; o "ao assinar" ligado no webhook da Fase 4.
    - [ ] **C4 — E-mails educacionais** como na Udemy (para quem, assunto, texto com link e imagem,
          Visualizar, prévia por e-mail, rascunho, Enviar, a lista com os números), alunos
          sincronizados com o Resend. Depois: filtros por progresso, data de início e "excluir quem
          fez outro curso", e o agendamento.
    - [ ] **C5 — E-mails promocionais**: só para quem aceitou; o aceite em Minha conta →
          Preferências e a regra da página de baixar material (P29).
  - [x] **4c — O sino, a lista e a página Ver todas** *(04/10/2026)*: o sino no cabeçalho, ao lado
        da foto, para aluno e admin, com o número de não lidas ("9+") no nome do botão; a lista
        das 5 mais recentes (título, começo do texto sem as marcas do Markdown, há quanto tempo)
        com **Marcar todas como lidas** e **Ver todas**; clicar marca como lida e leva à página
        `/aluno/notificacoes`, na notificação clicada, com o texto inteiro (`MarkdownText`, sem
        link, carregado só ali). O número se atualiza ao voltar para a aba, ao abrir e ao concluir
        aula. Textos em `app.notificacoes` (P38). Mutação: o sino sem o número, o clique sem
        marcar e o texto com link — as três reprovam.

**O QUE FALTA NOS 7 PASSOS (atualizado em 30/09/2026 — as linhas estão acima; aqui é o mapa):**

| Passo | Estado | O que falta | Depende de |
|---|---|---|---|
| 1 Informações básicas | pronto | — *(a duração no topo entrou em 29/09, e no catálogo em 30/09: ver abaixo)* | — |
| 2 Para quem é | pronto | — | — |
| 3 Conteúdo | pronto | o **Quiz** (no "+" aparece EM BREVE) | as regras do operador: uma ou várias respostas certas, explicação, nota mínima, o que o aluno vê |
| 4 Legendas | pronto (04/10: a tela; o ✓ em 05/10) | — | — |
| 5 Mídia e destaques | pronto | — *(a P19 fechou em 29/09)* | — |
| 6 Mensagens | pronto (04/10: o passo, o envio e o sino; o ✓ com as duas escritas em 05/10) | — | — |
| 7 Publicar | pronto *(Visualizar como aluno desde 04/10)* | o Visualizar da página **pública** do curso | a página definitiva do curso: **C5** |

**Em todos os passos, ainda aberto:**
- [x] **O Salvar no TOPO, com mensagem de confirmação** *(decisões do operador, 03/10/2026, a
      partir da Udemy)*: o **Salvar** de cada passo com formulário e o **Criar curso** ficam no topo,
      depois de "Voltar para cursos"; a linha de baixo, que só existia para o botão, saiu. Uma
      **mensagem flutuante nossa** (sem dependência nova) diz se salvou: o sucesso some sozinho em
      5 s, com "Fechar"; o erro fica até fechar. Campo inválido avisa "Confira os campos marcados
      antes de salvar." (com o botão no topo, o campo pode estar fora da tela). Ao criar, o editor
      abre com "Curso criado.". O passo Conteúdo, que salva aula por aula, não tem Salvar no topo.
- [ ] **Revisão das dicas pelo operador** — todas em `client/src/lib/course-hints.ts`, num arquivo
      só (ele pediu para revisar depois, 28/09). *(Também na lista de pendências: P36.)*
- [x] **ACHADO (29/09, confirmado no código): campo já salvo não volta a ficar
      vazio.** Apagar o texto do **subtítulo**, da **descrição**, do **nível**, da **imagem** ou
      do **ID do vídeo de apresentação** e salvar não apaga nada: `toPayload`
      (`client/src/lib/course-form.ts`) manda `undefined` para o campo vazio, e o servidor lê
      campo ausente como "deixa como está". O salvamento diz "salvo" e o valor antigo continua.
      As listas não têm o problema (vão sempre como lista).
      ✅ **Corrigido em 29/09/2026, a pedido do operador:** campo apagado vai como `null`, que o
      servidor grava; ausente continua querendo dizer "não mexe" (é o que deixa cada passo salvar
      só os campos dele). **A camada do módulo tinha o mesmo defeito e entrou junto** (decisão
      dele). **Apagar o ID do vídeo de apresentação apaga o vídeo no Bunny** (decisão dele, como
      a troca já faz), com o Bunny primeiro: se ele recusar, nada é gravado e o passo avisa
      (`bunny.md` §3.4). A capa não é apagada do Storage ao limpar o campo, como na troca (27/09).
      Teste de servidor novo (`clear-fields.test.ts`, 7 casos) e de tela. Mutação: o formulário
      voltando a mandar "ausente", o servidor sem apagar no Bunny e o servidor gravando com o
      Bunny recusando — as três reprovam.
- [ ] **ACHADO (29/09, NÃO corrigido): colar à mão OUTRO ID no campo do vídeo de apresentação e
      salvar troca o vídeo, mas NÃO apaga o antigo no Bunny** — só o envio pelo botão apaga. O
      antigo fica lá sem curso nenhum. Correção é decisão do operador. *(Pendências: P37.)*
- [ ] **A corrida na troca de vídeo com duas abas** (P2 da revisão de segurança, na etapa 2 acima).
- [x] **A duração do curso no topo do editor** *(29/09/2026, decisões do operador: soma **todo
      vídeo enviado**, como a Udemy, inclusive de aula em rascunho; formato **"2h 35min de
      vídeo"**)*. A aula guarda a duração do vídeo (`Lesson.videoDurationSeconds`, migration
      `20260929180000_lesson_video_duration`), gravada quando o Bunny confirma o "pronto" — ao
      abrir o editor e no resumo do vídeo — e esvaziada na troca. **Os vídeos que já existiam
      ganham a duração na primeira vez que o editor do curso é aberto.** A soma é derivada
      (`client/src/lib/duracao-do-curso.ts`); a aula de texto não conta; vídeo curto conta 1min.
      Confirmado na doc do Bunny (context7, fonte alternativa): `length` = segundos, inteiro.
      Passo 0 no branch `dev`: contagens iguais (só a migration +1 e as sessões do login), 0
      tabelas sem RLS, login 200 (admin e aluno), *No difference detected*. Mutação: a soma sem
      rascunho, a troca sem zerar a duração e o formato sem o "1min" — as três reprovam.
- [x] **A duração também no catálogo e na página do curso** *(decisões do operador, 30/09/2026)*:
      "2 módulos · 4 aulas · **1h 05min**", "0min" sem vídeo, nos dois lugares. As leituras
      públicas (`GET /api/courses` e `/api/courses/:slug`) devolvem `videoSeconds`, a soma **só
      das aulas de vídeo publicadas em módulo publicado** (a mesma cadeia do "4 aulas"); a
      duração de cada aula não sai. `horasEMinutos` (`lib/duracao-do-curso.ts`) é o formato
      curto; o topo do editor acrescenta "de vídeo". Testes: servidor (`course-duration.test.ts`,
      4 casos) e tela. Mutação: a lista somando rascunho, a página somando módulo em rascunho e
      o cartão sem a duração — as três reprovam. *(O C5 leva a duração para o template de
      servidor, junto com o desenho transposto — `courses.md`.)*
- [x] **A duração também na lista de cursos do admin** *(operador, 30/09/2026)*: "2 módulos · 5
      aulas · 1h 05min" no cartão de Cursos Admin, somando **todo vídeo enviado, inclusive
      rascunho** — como o topo do editor e como o "5 aulas" da mesma linha. `GET
      /api/admin/courses` devolve `videoSeconds`. Mutação: o cartão sem a duração e a soma
      ignorando rascunho — as duas reprovam.

- [x] **O ícone dos Destaques: busca entre TODOS os ícones do Lucide** *(pedido do operador,
      05/10/2026)*: o seletor virou campo de busca — digita "caixa" ou "construção" e aparece a
      lista com ícone e nome em português. Busca em português, sem acento, por sinônimo e pelo
      nome em inglês; vazia, mostra os 55 de sempre. 1.485 ícones na lista (os 1.488 do Lucide
      menos 5 que repetem um dos 55, mais os 2 nomes antigos nossos), nome em português escrito
      pelo agente (`nomes-dos-icones.ts`, revisão na P38). Cursos já salvos não mudam. O aluno
      baixa os desenhos **só** quando a página do curso usa um ícone fora dos 55 (um pacote,
      ~100 KB compactados, depois em cache); o pacote principal não cresceu (medido). Mutação:
      a busca sem tirar acento, o ícone novo virando Brilho e o Enter sem ser consumido — as três
      reprovam. **Quando a página do curso virar template de servidor**, o ícone passa a ser
      desenhado lá, e o aluno não baixa nada.

**Vai para outros blocos (anotado lá quando eles abrirem):**
- **Página do curso (vitrine, depois do C5):** a seção do autor é **a mesma da home**
  (`home.author`, uma edição serve às duas) · frases com ✓ em duas colunas · **ferramentas do
  curso** (campo novo, ex.: Excel 365, Power BI; decisão da sessão da home, set/2026) · etiqueta
  **"Novo"** (a do C4 etapa 4, que expira em 120 dias),
  **sem** número de alunos e **sem** "Atualizado em" · no lugar de temas, **as trilhas do curso**
  · no fim, **outros cursos da escola**, sem nota e sem preço · nunca prometer "acesso vitalício"
  (o acesso dura enquanto a assinatura estiver ativa).
- **Fase 4 (assinatura):** campo **"tenho um cupom"** na tela de assinar; o cupom é criado no
  painel da Stripe. Sem assinatura de presente no lançamento.
- **Fase 5:** área **Alunos** em cada curso, com busca e botão Mensagem, **sem exportar
  planilha**.
- **Fase 6 (JilsonAI):** o aviso da dúvida que sobe para o operador, **sem prazo nem data**, na
  direção do texto dele: *"Sua dúvida já está com o Jilson… ele vai te responder o quanto antes
  possível"* · a área **Comunicação** do admin (fila, anúncios, resumo do que os alunos
  perguntam; sem Tarefas). **A fila de dúvidas mora em Comunicação, não em "JilsonAI Admin ›
  Escalações"** (operador, 28/09): o JilsonAI Admin fica só com a configuração da IA (Persona,
  Modelo, Quotas). Corrigir o `navigation.ts` quando a P13 for declarada lá · o JilsonAI **revisando a página do curso** e **fazendo perguntas**
  sobre a aula · **Role play** com o JilsonAI.
- **Fase 6.5 (certificados):** ⚠️ **desde 05/10/2026 o quadro "Este curso inclui" já promete
  "Certificado de conclusão" em todo curso** (decisão do operador) — a Fase 6.5 precisa estar no ar
  antes do lançamento. **O curso também dá certificado** ao ser concluído; o da trilha
  continua o de competências.
- **Fora, por decisão:** a lista, com o porquê de cada item, está em `courses.md` → *O admin do
  curso*.

### Bloco I — ~~Escola bilíngue: idioma no conteúdo + dicionário de textos~~ — SAIU em 12/10/2026

> **A escola é só em português** *(decisão do operador, 12/10/2026)*. O bloco era de Set 2026: o
> idioma no conteúdo, o dicionário de textos e o seletor PT | EN. Boa parte foi construída sem que
> as caixas fossem marcadas, e a etapa 4.6c (Fase 4) tirou tudo o que era do segundo idioma.
> **Ficou, e é usado:** o dicionário de textos (`core/src/i18n/pt.ts`), servido ao servidor por
> `getDict()` e ao React por `useT()`, com os textos das telas do aluno. O texto do bloco:
> `git show e62ec0c:docs/implementation-plan.md`, seção *Bloco I*.

### Bloco — Superfície pública indexável  *(Ago 2026 · política em `CLAUDE.md` → Rendering Boundary)*

> **PARCIALMENTE CONSTRUÍDO FORA DE ORDEM (set/2026, decisão do operador).** A **home** (`/` e
> `/en`) já está no ar em HTML montado no servidor, junto com `escapeHtml`/`jsonLd` e o dicionário
> bilíngue do `core`. Foi feita antes do Bunny porque a home não usa `introVideoId` — a
> dependência que justificava a ordem é da **página de curso**, que continua depois do Bunny.
> **O que ficou pendente dentro deste bloco:** os 5 cursos da home vêm de uma constante em
> `server/src/routes/home.ts` (falta a migration de `language` e o cadastro) e
> `robots.txt`/`sitemap.xml`/`noindex` continuam por fazer. *(O `en.ts` foi escrito e revisado em
> 22/09; depoimentos e FAQ saíram do dicionário para o banco no C3.)*
> **Desdobrado em 22/09/2026** nos quatro blocos de conteúdo logo abaixo (fiação → admin de texto
> → depoimentos e FAQ → cursos do banco), na ordem decidida pelo operador.

#### Bloco C1 — Fiação: nenhum texto visível literal no template ✅ DONE *(22/09/2026)*

> **Por que este bloco vem ANTES do admin de texto, e não depois:** com texto cravado no HTML, o
> operador abriria a tela, editaria um campo, salvaria — e o site não mudaria. Falha silenciosa.
> Fiando primeiro, no dia em que a tela existe **todo campo dela funciona**.

- [x] **Medir antes de mexer** — script que achata o dicionário e confere chave a chave contra o
      template. Resultado: **55 de 145 chaves não eram usadas** (texto literal no HTML) e o `/en`
      era uma mistura de campo vazio com português.
- [x] Fiar as 12 seções da home. Listas (`ai.features`, `testimonials.list`, `faq.list`) passam a
      renderizar por `.map()` — acrescentar item vira mudança de dado, não de marcação.
- [x] **`aria-label`, `alt` e `title` também** — seção `a11y` nova no dicionário. Eram português
      puro no `/en`, e leitor de tela lê.
- [x] **Negrito vira dois campos** (`ai.features[i].label` + `.text`): o `<strong>` sai da string
      para o operador nunca digitar HTML no admin.
- [x] **Defeito corrigido junto** (mesma família, mesmo arquivo): `src="/img/${dict...title}.png"`
      usava texto de dicionário como caminho de arquivo — a imagem sumiria na primeira edição.
- [x] **Teste:** um trecho em português por seção tem que aparecer em `/` e **não** em `/en`.
- [x] **Passo 8 — mutação:** literal cravado de volta → a suíte **reprovou** (`vazou em /en`).
      Revertido.
- **Done when:** medição acusa **0** chaves não usadas. *Restaram 3 de propósito — `pricePtAnnual`,
  `priceEn`, `priceEnAnnual` não têm elemento na página; é a questão preço mostrado × cobrado, que
  é decisão da Fase 4.* Os rótulos das 3 camadas continuam literais e entram com o selo.

#### Bloco C2 — Texto de página editável no admin  *(decisão do operador, 22/09/2026)*

> **O desenho:** `texto exibido = sobrescrita do banco ?? valor de fábrica do dicionário`.
> Racional, alternativas pesadas e gatilho de reabertura em [`content.md`](content.md) § 16.
> **O mecanismo não conhece a home** — ele conhece chaves. Página nova nasce com chaves no
> dicionário e **já aparece no admin**, sem tabela nem tela nova. É isso que faz a coisa crescer
> sem refazer.

- [x] **Passo 0 — resolvido sem pergunta:** o dicionário hoje contém **só** copy de página pública
      (`common.*` + `home.*`), então tudo nele é editável e nada de rótulo do app logado entrou.
      Quando o React passar a usar o dicionário, a tela precisa filtrar — fica anotado aqui.
      **Pré-flight feito:** banco `dev` (`ep-lingering-morning`), 2 usuários, login de admin e de
      membro OK antes E depois da migration; contagens idênticas; zero drift.
- [x] **Migration** `20260922235628_site_text_and_language_enum`: enum `Language { PT EN }` + tabela
      `site_text` (único por chave+idioma) + **RLS na mesma migration**. Consulta de verificação
      rodada: **zero tabelas em `public` sem RLS**.
      **ESCRITA À MÃO porque o `prisma migrate dev` estava quebrado** (P1014: valida o histórico
      num shadow database onde `_prisma_migrations` não existe, e a migration de RLS de Ago 2026
      fazia `ALTER TABLE` nela). **CONSERTADO na mesma sessão, a pedido do operador:** aquela
      migration virou condicional (`IF EXISTS` num bloco `DO $$`). Provas: A/B no mesmo shell
      (incondicional → P1014, condicional → passa) · banco limpo pelo `migrate reset` continua com
      RLS em `_prisma_migrations` e **zero** tabelas sem RLS · `migrate status`, `migrate deploy` e
      o diff de drift passam nos dois bancos **sem** `migrate resolve`, porque o Prisma 5.22 não
      reprova checksum de migration já aplicada (medido). Regra nova no `CLAUDE.md` → Commands.
- [x] **Servidor:** `server/src/lib/dict.ts` é a **única porta** para o texto — template nenhum
      importa `pt`/`en` direto, senão a edição do operador não aparece naquela tela. Cache em
      memória limpo ao salvar. *(Limite registrado no próprio arquivo: o cache é por instância.)*
      A lista branca de chaves (`DICT_KEYS`) vive no `core` e é usada pelo schema Zod.
- [x] **Rotas** `GET /api/admin/site-text` e `PUT /api/admin/site-text`, atrás de `requireAdmin`.
      A lista sai do **dicionário**, não do banco: campo nunca editado também aparece, senão a tela
      só mostraria o que já foi mexido. **Valor vazio APAGA a sobrescrita** e volta ao valor de
      fábrica — sem isso, desfazer exigiria o operador redigitar o texto original.
- [x] **Tela** (`/admin/site`, item de menu **"Site"** — nome decidido pelo operador; posicionado
      depois de Cursos e Trilhas para manter as seções de conteúdo juntas): lista agrupada por
      seção com busca **por texto ou por chave** (com 155 campos, rolar não é navegação), PT e EN
      lado a lado, valor de fábrica visível **só quando há sobrescrita** — é quando a diferença
      importa, porque é o que volta se o campo for limpo. **Cada campo salva sozinho.**
      Loading / erro / vazio + **12 testes de componente**.
      **Dependência nova NÃO adicionada:** `@testing-library/jest-dom` não existe no repo, e isso é
      decisão de plano — as asserções seguem o estilo dos testes atuais (`toBeTruthy`, `toBeNull`,
      `textContent`).
- [x] **Testes de servidor (10):** os seis previstos + idioma inválido recusado + a lista de admin
      trazendo fábrica e sobrescrita separadas. **Quase todos terminam lendo a HOME de verdade** —
      gravar a linha não prova nada se ela não chegar na página.
- [x] **Passo 8 — mutação, nos dois lados.** Servidor: ignorar a sobrescrita no `getDict` **e**
      remover a lista branca de chaves → **3 testes reprovaram**. Tela: apagar o aviso de falha ao
      salvar e fazer "Voltar ao padrão" mandar o valor de fábrica em vez de vazio → **2 testes
      reprovaram**. Revertido nos dois.
- **Done when:** ✅ o operador troca um texto no admin e ele muda no ar, nos dois idiomas, sem
  deploy. *Provado pelos testes de servidor (que terminam lendo a home de verdade) **e pelo
  operador na tela**, em 23/09: ele editou `home.hero.featuredBadge` pelo `/admin/site` e a linha
  está no banco de desenvolvimento. Caminho inteiro exercitado com banco real.*

#### Bloco C5 — A vitrine sai do React  *(decisão do operador, set/2026)*

> **Por que existe:** `/cursos` e `/trilhas` são hoje páginas React que fazem dois papéis mal — o
> visitante vê cromo de app, o aluno não vê progresso. O operador separou as duas superfícies
> (`CLAUDE.md` → *DUAS SUPERFÍCIES*) e pediu que o que for construído agora **seja a versão
> final**: *"eu quero que seja a versão final que vamos utilizar"*. Sem construir duas vezes.
> **NADA SE PERDE** *(operador, 30/09/2026)*: *"O que estiver dentro da área logada não é página temporária, já é definitiva, e o que montar de HTML nas páginas públicas também não será perdido, apenas transportado para dados dinâmicos."* O que o aluno vê em React já é o
> catálogo do aluno; da vitrine, a marcação e as classes de hoje (ou do mock) são **transpostas**
> para o template de servidor, trocando o conteúdo fixo por dados do banco. O acabamento que o
> Antigravity fizer nessas telas agora vale.
>
> **BLOQUEADO — e o bloqueio é do operador, não técnico.** O passo 1 do fluxo com o parceiro de
> design é *"o operador e o Claude definem o que vai ter na tela"*, e ele adiou: *"depois
> analisamos minuciosamente o que vai ter em cada página"*. Sem isso não há mock, e sem mock não há
> transposição.

- [ ] **Passo 0 (operador):** o que a vitrine mostra, e o que a tela do aluno mostra **a mais**.
      **Já decidido (04/10/2026): cada página de curso é uma LANDING PAGE DE VENDA** — cada curso,
      sozinho, justifica a assinatura; conversão e retenção (`courses.md` §9, `CLAUDE.md`). O
      mock da página de curso vai para a fila do Antigravity (`GEMINI.md`, item 23).
      Direção já dada por ele, a detalhar: progresso por curso · "continue de onde parou" no topo ·
      o botão sendo **Continuar** em vez de **Assinar**. **Já decidido (30/09/2026):** o cartão e
      a página do curso mostram a duração ("2 módulos · 4 aulas · 1h 05min", "0min" sem vídeo) —
      `courses.md`; o servidor já devolve `videoSeconds`.
      **Já decidido (04/10/2026):** o quadro **"Este curso inclui"** na página de venda —
      os arquivos para baixar aparecem sozinhos quando existem; os materiais exclusivos
      (Biblioteca de prompts, Apostila) são marcados no passo Publicar, com texto global; sem
      linha de acesso (`courses.md` §10.10). As linhas derivadas restantes: P41.
      **Feito em 04/10/2026, na página de hoje** (a transpor no C5, nada se perde): o quadro na
      coluna lateral de `/curso/:slug` (`CourseIncludes.tsx`), com os arquivos (derivado do
      servidor: `temArquivos`, só a cadeia publicada) e os materiais marcados.
      **E também no "Sobre o curso" da página da aula** *(decisão do operador, 04/10/2026: "nos dois
      lugares")*, onde o aluno logado está.
      **As linhas calculadas, feitas em 05/10/2026** *(decisão do operador, fecha a P41 menos o
      certificado)*: horas de vídeo, artigos, aulas grátis e legendas, além dos arquivos — uma
      função só no servidor (`server/src/lib/inclui.ts`) para a página de venda, a página da aula e
      a prévia; o aluno conta a cadeia publicada, o admin tudo. Mutação: legendas com aula sem
      legenda, a venda contando rascunho e a linha de aulas grátis sumindo — reprovam.
- [ ] **Mock na `design-lab/`** (parceiro de design) → **transposição** para template de servidor
      (mesma marcação, mesmas classes) → **formatação** pelo parceiro. É o caminho que a home já
      percorreu inteiro.
- [ ] `/cursos` e `/trilhas` viram template de servidor, com o payload de indexação que a home já
      tem (title, description, canonical, OG, JSON-LD), em português — sem `hreflang`: há um idioma só.
- [ ] Catálogo do aluno nasce em **`/aluno/cursos`** e **`/aluno/trilhas`** (React, dentro do
      shell). `CatalogPage.tsx` é a base — o que muda é o que ele mostra a mais.
- [ ] O rail do aluno passa a apontar para `/aluno/*`; a vitrine fica com o endereço curto.
- [ ] Testes: servidor para a vitrine (responde, indexa, filtra por status) + componente
      para a do aluno (os estados + o que ela tem a mais).
- [ ] **Passo 8 — mutação:** remover o filtro de status da vitrine → a suíte de servidor reprova.
- **Done when:** o visitante e o Google veem a mesma vitrine, sem barra; o aluno logado tem a
  dele, com barra e progresso.
- **DEPOIS deste bloco:** `/curso/:slug` e `/trilha/:slug` seguem o mesmo caminho. A página de
  curso espera o **Bunny** (o `introVideoId` toca para não-membro nela) — é a dependência que já
  justificava a ordem original.
  **A página pública da TRILHA é CURTA** *(decisão do operador na sessão da home, set/2026; trazida
  do `design-lab` em 28/09)*: nome, frase, os cursos que ela inclui e o botão de assinar — **sem**
  etapas, aulas nem "ao terminar, você sabe", que só aparecem depois de logar. Motivo dele:
  simplicidade e não entregar a estrutura aos concorrentes. **Na lista de trilhas**, quem não está
  logado vai para a página curta; quem está logado vai para a trilha. *A definir na construção:* o
  que vê quem está logado com a assinatura cancelada.
  **Curso apagado que foi substituído por outro** (ex.: o temporário em inglês) leva o endereço
  antigo para o novo, para não virar link quebrado (mesma família do *slug permanente*).
  **A página pública com o vídeo de apresentação não pode ficar em cache por mais de 24 h**
  *(consequência da decisão de 28/09/2026: uma biblioteca só, com token — o player sai assinado
  e a assinatura pública vale 24 h; `bunny.md` §3.1)*.
  **Junto com a página de curso nova entra o Visualizar da página PÚBLICA** (Bloco E, etapa 1; o
  Visualizar **como aluno**, da tela logada, existe desde 04/10/2026):
  a página como o aluno vê, **inclusive em rascunho, só para o admin**, sem abrir a rota pública
  para o que não está publicado *(operador, 28/09/2026: esperar a página definitiva)*.

#### Páginas públicas que faltam *(decididas na sessão da home, set/2026; trazidas do `design-lab` em 28/09)*

Mesmo caminho da home: conteúdo definido → mock na `design-lab/` → transposição para template de
servidor → acabamento. Só em português (12/10/2026).

- [ ] **Quem somos** — explica a escola (que é uma escola, que tem certificado…). Conteúdo: P30.
      **ENTRA NA ABERTURA, simples** *(decisão do operador, 28/10/2026)*: página do servidor, com o
      texto e a foto dele, os textos em Admin → Textos.
- [ ] **Contato** — página própria. Conteúdo e onde ficam os dados da empresa: P30.
- [ ] **Página para baixar material** — uma página só, para quem chega de fora (ex.: do YouTube)
      baixar planilha ou arquivo; pede **nome e e-mail**, e a pessoa entra na base de contatos.
      **Todo inscrito recebe novidades até se descadastrar** (motivo dele: se dependesse de marcar,
      quase ninguém marcaria). Para valer pela LGPD: a página **avisa na hora** que a pessoa vai
      receber e-mails, e **todo e-mail tem o link para se descadastrar**. *Em aberto:* como
      funciona (ele vai ver como outras escolas fazem) e se o aluno segue a mesma regra, porque hoje
      o `marketingConsent` do aluno começa desligado: P29.
  **A `description` do curso é Markdown** desde 27/09 (Bloco B): quando a página de curso virar
  template de servidor, ela precisa de um renderizador **no servidor**, com HTML cru desligado por
  configuração e a mesma lista do que vale (negrito, itálico, listas). É dependência nova do
  `server` ⇒ decidir no plano daquele bloco, com consulta ao context7. **Nunca** `escapeHtml` no
  texto inteiro (mostraria os asteriscos) nem HTML montado à mão.

#### Bloco C3 — Depoimentos e FAQ viram tabela ✅ DONE *(23/09/2026, no ar em produção)*

> São as duas únicas listas da home que **crescem**. O resto tem tamanho fixo preso ao layout.
> Depoimento tem obrigação própria já escrita (`content.md`: *sai na hora se a pessoa pedir*) —
> isso não pode depender de deploy.

> **Decisões do operador (23/09, ao aprovar):** telas **dentro de "Site"** (2º nível: Textos ·
> Depoimentos · Perguntas frequentes) · **lista vazia esconde a seção inteira** · **status para
> esconder + Excluir que apaga de vez** (LGPD) · **conteúdo atual migra sozinho** na publicação.
> Registradas em `content.md` § 16.

- [x] Models `Testimonial` e `FaqItem` (`language`, `displayOrder`, `status`) + RLS, migration
      única `20260923153515_testimonials_and_faq`. **As iniciais não são coluna** — saem do nome
      na hora de desenhar. **A migration também semeia o que estava no ar** (4 depoimentos + 15
      perguntas, PT e EN, publicados), com os INSERTs **gerados do dicionário** para o texto ficar
      idêntico. Aplicada no dev: Passo 0 antes/depois (mesmos 2 usuários entrando, mesmo texto
      editado, 2 cursos), zero tabela sem RLS, diff de drift *No difference detected*.
- [x] Leitura pública (a própria rota da home, que é SSR — nenhuma API pública nova) filtra
      `PUBLISHED` + idioma e ordena por `displayOrder`. As listas **saíram do dicionário**; ficam só
      título e etiqueta das seções. `renderHome` passou a receber **um objeto** (seriam 9
      parâmetros posicionais).
- [x] **FAQ ganha JSON-LD `FAQPage`**, só quando há pergunta publicada.
- [x] **Testes de servidor (8)** em `server/src/test/home-lists.test.ts`: status e idioma (nas duas
      listas), ordem, iniciais, seção some inteira quando vazia, `FAQPage` com exatamente as
      perguntas da página, e o que vem do banco nunca vira HTML (`<img onerror>` escapado,
      `</script>` não fecha o JSON-LD). **Mutação:** sem o filtro de publicado → 3 reprovam; seção
      sempre desenhada → 1 reprova. Revertido.
- [x] **CRUD no admin** — `GET/POST /api/admin/testimonials`, `PATCH/DELETE …/:id` (idem
      `/api/admin/faq`), todas atrás de `requireAdmin`. A API fala `pt`/`en` como o resto; o banco,
      `PT`/`EN` (conversão única em `server/src/lib/language.ts`). Schemas compartilhados em
      `core/src/schemas/home-lists.ts` (`homeFaq*`, porque `faqItemSchema` já é a FAQ de cada
      curso). **DELETE apaga a linha**; esconder é o `status`.
      **Testes de servidor (12)** em `admin-home-lists.test.ts`: 401/403 nos quatro métodos das
      duas rotas (e nada gravado pelo aluno), publicar aparece na home do idioma certo, rascunho só
      no admin, arquivar tira da home sem apagar, **Excluir some com o nome do banco**, corpo
      inválido = 400 (inclusive nome só de espaços e terceiro idioma), 404/400 de id, e o ciclo
      criar → editar → excluir de uma pergunta conferido na home a cada passo.
      **Mutação:** sem `requireAdmin` no POST + Excluir virando arquivar → 3 reprovam. Revertido.
- [x] **Telas** em `/admin/site/depoimentos` e `/admin/site/faq`; **Textos mudou para
      `/admin/site/textos`** (e `/admin/site` redireciona para lá), porque a coluna secundária acende
      um item também nas sub-rotas dele — em `/admin/site` ele ficaria aceso junto com os outros.
      As duas telas são **um editor só** (`HomeListEditor` + `HomeListItem` + `HomeListItemForm`),
      configurado por página. Abas de idioma, item novo **nasce Rascunho** e no **fim** da lista
      (maior ordem + 10), **Excluir em dois cliques**, status em palavras (Rascunho/Publicado/
      Arquivado). **17 testes de componente** (estados carregando/erro/vazio, lista por idioma,
      criar no idioma da aba, validação, editar, excluir com confirmação, falhas visíveis) + **2**
      no mapa de navegação (o 2º nível de Site; nenhum filho prefixo de outro).
      **Mutação:** Excluir sem confirmação + fiação da FAQ trocada + item novo nascendo publicado +
      Textos de volta em `/admin/site` → **6 reprovam**. Revertido.
- [x] **Depoimentos: 4 SORTEADOS por visita, sem ordem** *(depois do teste do operador, 23/09 —
      "com milhares de depoimentos nunca vão ver igual")*. A home usa `ORDER BY random() LIMIT 4`
      (SQL parametrizado do Prisma); sem carrossel e sem script, porque quase ninguém passa do 1º
      quadro (pesquisa em `content.md` § 16). O admin de depoimentos perdeu o campo Ordem
      (`comOrdem` no editor comum) e lista do mais novo; a FAQ mantém a ordem. Testes que esperam
      um depoimento específico isolam o sorteio (`server/src/test/testimonial-pool.ts`); novo teste
      "no máximo 4, sorteados" (6 no pool → 4 na página; 15 visitas → mais de 4 nomes).
      **Mutação:** sempre os 4 primeiros → 1 reprova; Ordem de volta nos depoimentos → 2 reprovam.
- [x] **Textos com uma aba por página** *(operador, 23/09)*: "Toda página" e "Home" (a página é o
      1º pedaço da chave — página nova ganha aba sozinha), seções na ordem do dicionário com
      **"Leitor de tela" por último**, nome curto dentro da aba. **A busca atravessa as abas** (com
      termo, as abas somem e vêm resultados de todas as páginas, com o nome completo). **4 testes
      novos** + 2 ajustados. **Mutação:** sem "Leitor de tela por último" e busca presa à aba →
      2 reprovam. Revertido.
- **Done when:** ✅ o operador publica um depoimento novo e remove outro pelo admin, sem deploy.
  *Provado pelo operador no dev em 23/09 (publicou um depoimento pelo admin e ele apareceu na home —
  "Funcionou") e pelos testes de servidor, que publicam, arquivam e excluem terminando na home.*

#### Bloco C4 — Os 5 cursos da home vêm do banco

> **EM 5 ETAPAS, uma por vez** *(operador, 23/09/2026: "divida em etapas, discutimos cada etapa e
> implementamos 1 a 1")*. Cada etapa é discutida antes, aprovada por ele, e vira **um commit**.
> A etapa 1 vem primeiro porque é pequena e destrava o cadastro: com ela pronta, o operador já
> cadastra os cursos, e a etapa 2 marca como PT tudo o que existir.

- [x] **Etapa 1 — campo de imagem aceita `/img/curso.jpg`** *(plano aprovado em 23/09; feita em
      27/09 no `dev`: `enderecoDeImagemValido` + `imageUrlSchema` em `core/src/schemas/content.ts`,
      a mesma regra no formulário, com o aviso embaixo do campo · `server/src/test/course-image.test.ts`
      (11 casos, incluindo `/\`, tabulação e espaço na frente) + 5 casos no teste do formulário ·
      mutação: com a regra desligada, 9 testes de servidor e 3 de tela reprovam; sem a checagem de
      espaço e `\`, reprovam os 2 casos deles)*.
      `thumbnailUrl` usa `z.string().url()`, que **recusa** caminho relativo (as imagens atuais não
      salvam pelo admin) e **aceita** `javascript:`. Trocar pela checagem explícita de esquema que
      o `CLAUDE.md` já exige (`core/` → a regra do `.url()`): aceita `https?://…` ou caminho do
      próprio site começando com `/`; recusa `javascript:`, `data:` e `//outro-site`. Teste de
      servidor + de componente + mutação.
- [x] **Etapa 2 — idioma no curso** (a parte de dados do Bloco I que o C4 exige). *Feita em 24/09
      como etapa 3 do "app do aluno em inglês" (Bloco I).* *MOVIDA em
      24/09 para a etapa 3 do "app do aluno em inglês" (Bloco I), que vem antes do C4 — quando ela
      fechar, esta fecha junto:*
      `Course.language` obrigatório + campo **Idioma** no formulário de curso + etiqueta "EN" na
      lista do admin; os cursos que já existem viram PT. *A confirmar na discussão da etapa:* o
      idioma fica travado depois de criado (como o slug). **Antes desta etapa:** dividir o
      `AdminCourseFormPage.tsx`, que passou de ~280 para ~370 linhas na formatação de 23/09 (teto
      ~200) — é nele que o campo entra.
- [ ] *(operador)* **Cadastrar os 5 cursos da home** no admin.
- [ ] **Etapa 3 — a home lê os cursos do banco** (`server/src/routes/home.ts`, que hoje usa uma
      constante): `PUBLISHED` + `displayOrder`. *A decidir na etapa:* **qual curso é o destaque** (o
      primeiro da ordem, ou o que tiver a etiqueta Destaque — nesse caso a etapa 4 vem antes) e o
      que fazer com os 2 cursos `exemplo-*`, que estão **publicados em produção** e apareceriam na
      home.
- [ ] **Etapa 4 — etiqueta do curso** *(decidida em 22/09 — spec em `courses.md` → "Etiqueta do
      curso")*: enum `CourseBadge { NOVO DESTAQUE MAIS_VENDIDO }` + `Course.badge?` + a data que
      faz `NOVO` **expirar em 120 dias** · campo de seleção no formulário de curso · rótulos em
      `common.badges.*` no dicionário (editáveis no `/admin/site`) · a home usa a etiqueta do curso
      no lugar do texto fixo "CURSO EM DESTAQUE". **Trava:** é campo SEPARADO do `status` — pôr
      "NOVO" naquele enum sumiria com o curso do site inteiro, sem erro.
- [ ] **Etapa 5 — ordem por ARRASTAR** *(operador, 23/09)*: nos cursos, e **o mesmo componente**
      passa a ordenar as perguntas frequentes (hoje, número de Ordem). A biblioteca de arrastar é
      **dependência nova** — nomeá-la no plano da etapa, com o ok do operador.
      **Com um interruptor: ordem AUTOMÁTICA (mais novo primeiro) ou MANUAL (arrastar)**, e o
      catálogo **começa na automática** *(decisão do operador na sessão da home, set/2026; trazida
      do `design-lab` em 28/09)*.
- [ ] **O curso em destaque ganha uma imagem grande própria** (a do catálogo pode ser pequena
      demais para o topo da home) — decidir junto com a P17 *(sessão da home, set/2026)*.
- **Done when:** o operador troca o curso em destaque pelo admin e a home muda.

> **SEQUENCIAMENTO DECIDIDO: este bloco vem DEPOIS do Bunny.** O `introVideoId` é ativo do Bunny
> numa rota **pública** (o vídeo de apresentação toca para não-membro), e é o único ponto onde as
> duas frentes se tocam. Construir a página pública antes de saber como o Bunny assina e embeda
> significa construí-la duas vezes. A **fronteira** já está decidida, então o player nasce do lado
> privado desde o dia um — só o payload de SEO espera.

- [x] **PRIMEIRO ITEM DO BLOCO — `server/src/lib/html.ts`: `escapeHtml()` + `jsonLd()`.** Vem antes
      do primeiro template, não depois: escape retrofitado é escape com furo, porque ninguém
      relê 6 arquivos procurando a interpolação que escapou. **São DUAS funções porque são dois
      problemas diferentes:** `escapeHtml` cobre texto e atributo (`&`, `<`, `>`, `"`, `'`);
      `jsonLd` serializa o bloco `<script type="application/ld+json">`, onde escapar HTML
      produziria `&amp;` **visível para o crawler** (quebrando o dado estruturado que o bloco
      inteiro existe para emitir) e o risco real é outro — fechar o `</script>` de dentro da
      string, o que se resolve com `JSON.stringify` + `<` → `<`. Usar um no lugar do outro
      falha nas duas direções.
- [x] **Teste unitário do helper** — é a **única unidade genuína de todo o plano**, e cabe aqui
      porque a função é pura: sem I/O, sem banco, sem tela. Casos: `<script>` em texto · `"` em
      atributo (o que quebra `content="…"` das metas OG) · `</script>` dentro do JSON-LD · e o que
      passa despercebido em revisão de diff — **string já escapada não pode ser escapada duas
      vezes** (`&amp;amp;` na página é o sintoma).
- [ ] **Template das rotas públicas** — Express + Tailwind, **sem React**: `/`, `/cursos`,
      `/curso/:slug`, `/trilha/:slug`, `/certificado/:publicId`, páginas legais.
      **TRAVA: todo valor vindo do banco passa por `escapeHtml()`** (`CLAUDE.md` → Rendering
      Boundary). Os campos que alimentam estas páginas — `subtitle`, `description`, `learnTags[]`,
      `requirements[]`, `personas[]`, `highlights[]`, `faq[]` — são **texto livre autorado no
      painel admin**, e o Zod do `validate()` confere **forma, não conteúdo**.
- [ ] **Teste de servidor de XSS na rota pública** (supertest, sem browser): semear um curso com
      `<script>alert(1)</script>` na `description` e no `faq[].resposta`, pedir `GET /curso/:slug`
      e assertar que o HTML de resposta contém `&lt;script&gt;` e **não** contém `<script>alert`.
      *É um teste que só existe porque a defesa saiu do React — enquanto era React, o framework
      garantia isso e testá-lo seria testar o React.*
- [ ] **Metas por rota, no HTML da primeira resposta:** `<title>` e `description` **próprios da
      página** (nunca o genérico do site), Open Graph completo (`og:title`, `og:description`,
      `og:image`, `og:url`, `og:type`, `og:site_name`) + `twitter:card=summary_large_image`, e
      `<link rel="canonical">` absoluto.
- [ ] **A IMAGEM de OG em si** (o arquivo, não a meta tag). Arte conforme `design.md` §12; mora em
      `client/public/img/`, que é servida na raiz (`/img/og-…`).
      **Duas travas que fazem o card sair sem imagem, as duas silenciosas:**
      **(a)** `og:image` exige **URL ABSOLUTA** (`https://…`) — caminho relativo é ignorado pelo
      crawler, e no nosso HTML ele passa por `escapeHtml()` como todo atributo.
      **(b)** a imagem precisa ser alcançável **sem sessão**. Nada de OG apontando para arquivo
      atrás do gate — o robô não faz login.
      ⚠️ `[MEDIR antes de fechar, nunca supor]` **o formato.** A `design.md` §12 manda PNG/JPG
      1200×630 e trata WebP como risco — postura **conservadora, não medida**, e o gatilho de
      reabertura dela é exatamente este item. Meça com as ferramentas das próprias plataformas:
      **Post Inspector** (LinkedIn) e **Sharing Debugger** (Facebook) renderizam o card e forçam
      limpeza de cache; no WhatsApp, mande o link para você mesmo.
      **Se as três aceitarem WebP, a exceção morreu** — atualize a §12 e registre; se qualquer uma
      falhar, a §12 está certa e o motivo passa a ser medido em vez de suposto.
      **Por que MEDIR e não confiar no verde:** card sem imagem não gera erro, não reprova teste e
      **não aparece para quem compartilha** (o cache local já tem o card). O sintoma é queda de
      clique que ninguém liga à causa — e o link do certificado é canal de aquisição por decisão de
      produto (`courses.md`).
- [ ] **Três blocos `<script type="application/ld+json">`, separados** (receita verificada no fonte
      da página de compra do Mac mini, ago/2026):
      **`Course`** com `provider` (Organization), `offers` (a assinatura), `teaches`/`about` (de
      `learnTags[]`), `educationalLevel` (de `level`) · **`FAQPage`** com `Question`/`acceptedAnswer`
      alimentado por `faq[]`, que **já existe** no modelo — **é o mais valioso**, porque o texto fica
      duas vezes no HTML (visível + JSON) e é a forma que crawler de IA extrai melhor ·
      **`BreadcrumbList`** — Início → Cursos → [curso].
      ⚠️ `[VERIFICAR antes de codar]` campos obrigatórios de `Course` em schema.org e os requisitos
      do Google para resultado rico de curso — **a lista acima é proposta, não doc verificada.**
- [ ] **`sitemap.xml` gerado do banco** (rota do servidor, não arquivo estático): cursos e trilhas
      `PUBLISHED`, certificados com `isPublic=true`. `DRAFT`/`ARCHIVED` **nunca** entram — o sitemap
      respeita o mesmo filtro das leituras públicas.
- [x] ~~**Os dois idiomas na superfície pública**~~ — **CANCELADO em 12/10/2026** (a escola é só
      em português — etapa 4.6c). O texto antigo: `git show e62ec0c:docs/implementation-plan.md`.
- [ ] **`robots.txt`** conforme a política decidida (permite busca **e** treino) + **`noindex`** em
      `/aluno/*` e `/admin/*`, via meta **e** via `robots.txt`.
- [ ] **Botão de compartilhar** em curso, trilha e certificado — `navigator.share` quando existir,
      com fallback de copiar link + links diretos LinkedIn/WhatsApp. **ORDEM IMPORTA:** share **sem**
      as OG tags compartilha card genérico. As metas vêm primeiro.
- [ ] **Google Search Console — conectar AGORA** (a verificação demora e queremos histórico desde o
      dia um), sabendo que **só produz dado ~30–60 dias depois do catálogo ir ao ar**: hoje o que
      está no ar é a coming-soon e não há página indexável. GSC mede **o nosso** desempenho no que
      já existe; **não substitui** ferramenta de pesquisa de mercado (volume, dificuldade de termo,
      tráfego de concorrente), que responde perguntas de **antes** de existir site.
- **Done when (teste de aceitação — obrigatório antes de marcar os checkboxes):**
  1. `curl -s https://www.jilsonsantana.com/curso/<slug> | grep -c "<uma frase visível da página>"`
     → tem que ser **≥ 1**.
  2. No browser: `Cmd+U` (view-source) e `Cmd+F` numa frase que aparece na tela → **tem que achar**.
  3. ⚠️ **NUNCA usar o DevTools para este teste** — ele mostra o DOM já renderizado e mente sempre
     a favor do JavaScript. O único juiz é o fonte cru.
  4. Os três JSON-LD validam no Rich Results Test do Google.

## Phase 4 — Billing & Membership Gate (Stripe Payments + Stripe Billing)  *(HIGH RISK — own sessions)*

> **Decisão revista Ago 2026:** usamos **Stripe Billing** para operar a recorrência, mantendo
> **Payment Element embutido** e **sem Customer Portal**. O aluno continua sem sair do site.
> Ver `tech-stack.md` → Billing. O risco desta fase mudou de lugar: saiu da *mecânica de
> cobrança* (agora é da Stripe) e concentrou-se na **fronteira de acesso** — é lá que o teste
> tem que ser duro.

`Docs check (context7)`: **obrigatório** nesta fase — Stripe → `/websites/stripe`. Preencher no
plano de cada bloco antes de escrever código (CLAUDE.md → Context7).

### O PLANO EM ETAPAS DE UMA SESSÃO  *(pedido do operador, 09/10/2026: "etapas pequenas que possam ser feitas uma por sessão")*

> **O objetivo primeiro é TESTAR DE VERDADE.** Boa parte da escola não se testa no ar porque a
> conta de aluno de produção não tem assinatura (decisão de 27/09: a assinatura de teste só existe
> fora de produção). O caminho mais curto até o operador assinar como aluno e ver tudo funcionando
> é **4.0 → 4.1 → 4.2 → 4.3**: a Stripe em **modo de teste** dentro do site no ar — que continua
> atrás do "Em breve" —, com o cartão de teste da Stripe ou o cupom de 100%. As chaves de verdade
> só entram no GO-LIVE (Fase 7).
> **⚠️ REVISTO em 10/10/2026 (decisão do operador): a produção usa as chaves de VERDADE já na
> etapa 4.3.** O computador fica com a área restrita; o site, com a conta de verdade. O porquê e o
> que muda: etapa 4.3, abaixo, e `CLAUDE.md` → changelog (22).
> **Estimativa honesta:** cerca de **3 sessões de código**, mais a configuração do painel pelo
> operador, até o primeiro teste real (4.3); cerca de **10 a 12 sessões** para a fase inteira. Pode
> crescer com surpresa da Stripe: é fase de alto risco, e toda etapa de código tem revisão de
> segurança.
> **O fato que decidiu o desenho do cupom** `[FATO — context7 /websites/stripe, 09/10/2026]`: *"If
> the first payment succeeds or requires no payment, the invoice marks as paid and the subscription
> becomes active."* Cupom de 100% **para sempre** → assinatura ativa **sem cartão**. É o caminho já
> decidido para o `member@` de produção e serve igual para cortesia e promoção (item *DECISÃO
> REGISTRADA — usuários semeados*, abaixo).
> **Docs check (context7):** Stripe → `/websites/stripe` → a assinatura com o Payment Element
> (`payment_behavior: default_incomplete` + `latest_invoice.confirmation_secret`) e a fatura zerada
> pelo cupom (assinatura ativa sem pagamento) — **2 consultas** (09/10/2026). O dólar pelo país do
> cartão consulta na etapa 4.8.
> **Em paralelo com a Fase 5** (decisão do operador, 09/10/2026 — *CLAUDE.md → Working Method*): a
> avaliação do curso e o depoimento, e as telas sem "EM BREVE", andam sem esperar esta fase.
> **A Stripe fecha INTEIRA nesta fase, com o Pix** (decisão do operador, 10/10/2026): *"o PIX vai
> estar pronto nessa fase Stripe, quero deixar essa parte pronta mesmo sem ter terminado todas as
> telas da escola; quero que a escola possa ser lançada a qualquer momento depois da fase da
> Stripe."* Nenhuma etapa de 4.0 a 4.10 fica para depois do lançamento.

- [x] **4.0 — A Stripe em modo de TESTE (operador, no painel, sem código, ~1 h).** *Fechada e publicada — o registro completo está em [`build-history.md`](build-history.md) → Fase 4, etapas 4.0 a 4.5.*
- [x] **4.1 — O webhook e o espelho (código, ALTO RISCO).** *Fechada e publicada — o registro completo está em [`build-history.md`](build-history.md) → Fase 4, etapas 4.0 a 4.5.*
- [x] **4.2 — Assinar com a conta logada: o checkout embutido (código, ALTO RISCO).** *Fechada e publicada — o registro completo está em [`build-history.md`](build-history.md) → Fase 4, etapas 4.0 a 4.5.*
- [x] **4.3 — No ar, COM AS CHAVES DE VERDADE: o PRIMEIRO TESTE REAL (com o operador).** *Fechada e publicada — o registro completo está em [`build-history.md`](build-history.md) → Fase 4, etapas 4.0 a 4.5.*
- [x] **4.4 — Sincronizar e perder o acesso direito (código).** *Fechada e publicada — o registro completo está em [`build-history.md`](build-history.md) → Fase 4, etapas 4.0 a 4.5.*
- [x] **4.5 — ESLint com `no-floating-promises`, bloqueante no CI (código, pequena).** *Fechada e publicada — o registro completo está em [`build-history.md`](build-history.md) → Fase 4, etapas 4.0 a 4.5.*
- [ ] **4.6 — Minha assinatura, dentro da escola (código, 2 sessões).** (a) ver o plano e a próxima
      cobrança, trocar o cartão; (b) mudar mensal↔anual com a proração mostrada **antes**, e cancelar
      com o motivo — "cancelar mesmo assim" de 1 clique sempre visível, tom calmo. Sem Customer
      Portal. Telas e textos: decisões do operador. **(c) — trazido da 4.2 (10/10/2026):** quem
      cancelou e ainda tem dias pagos volta a assinar pela tela de assinar, sem pagar duas vezes o
      mesmo período (na 4.2 essa pessoa vê "Você já é assinante").
      **Decisões do operador (10/10/2026) que esta etapa constrói** (`billing.md` → *Reembolso*):
      o aluno cancela quando quiser e mantém o acesso pago · **dentro dos 7 dias a tela oferece
      as duas saídas** — "parar a renovação e continuar" e "cancelar e receber o dinheiro de
      volta" · **o reembolso corta o acesso na hora** (o período devolvido deixa de contar como
      pago no espelho; hoje a Stripe segue dizendo "paga") · **reembolso repetido não tem
      bloqueio automático** (decisão dele no mesmo dia, que substituiu o "no máximo 2
      reembolsos"): a trava é a cláusula de reembolso abusivo nos termos de uso (P61) e a
      análise caso a caso — esta etapa NÃO constrói contador nem recusa de assinatura ·
      **o prazo é de 7 dias** (os 14 dias de fora do Brasil saíram com a 4.8, cancelada em
      12/10/2026) · **trocar de plano não recomeça o prazo**: os
      dias contam do primeiro dia da assinatura.
      **PLANO APROVADO (operador, 11/10/2026: "Aprovado").**
      - **O que o aluno passa a ter:** em **Faturamento e Assinatura** ele vê o plano, a próxima
        cobrança e o cartão; trocar o cartão, mudar de plano e cancelar abrem cada um a sua tela.
      - **Decisões do operador nesta data** (perguntadas com opções; o registro definitivo vai
        para `billing.md` no passo 6):
        - **A tela mora no item que JÁ EXISTE no menu, "Faturamento e Assinatura"** (menu da
          foto e coluna de Minha conta), em **`/aluno/conta/faturamento`** — o item estava no
          menu sem tela nenhuma (caía no Início). *Reabre se a conta ganhar outra tela de
          cobrança (recibos, notas) que peça separar "assinatura" de "faturamento".*
        - **Resumo + uma tela por ação**, cada uma com endereço próprio — `…/faturamento/cartao`,
          `…/faturamento/plano`, `…/faturamento/cancelar` (entre isso e tudo numa tela só). É o
          que dá link direto para "trocar o cartão": o painel (4.7b) e o e-mail da cobrança que
          falhou (4.7) precisam dele. *Reabre se o Antigravity redesenhar a tela.*
        - **Motivos de cancelamento: a lista curta, e escolher é OPCIONAL** (o botão de cancelar
          funciona sem motivo) — "Está caro para mim agora" · "Não estou tendo tempo de estudar" ·
          "Já aprendi o que precisava" · "Não encontrei o conteúdo que procurava" · "Outro
          motivo" —, mais o campo opcional "Quer contar mais?" (entre a curta, a completa com
          nove, e só um campo aberto). *Reabre quando houver cancelamentos de verdade e "Outro
          motivo" for a resposta mais comum.*
        - **Anual → mensal vale no FIM do ano já pago** (entre isso, na hora com crédito, e não
          oferecer): a pessoa continua no anual até a data paga e dali em diante é cobrada todo
          mês; a tela diz "Seu plano muda para Mensal em DD/MM/AAAA" e deixa desistir da troca;
          nenhum dinheiro volta. *Reabre se um aluno pedir a troca na hora, ou se o agendamento
          na Stripe der mais manutenção do que vale — aí "não oferecer" volta à mesa.*
        - **Depois do reembolso pedido pela própria pessoa, ela CONTINUA LOGADA** (entre isso e
          ser deslogada, como manda a regra de quem perde o acesso): vê a confirmação e segue no
          site, sem as aulas, com "Reativar assinatura". Vale só para esse caso; nos demais,
          perder o acesso continua derrubando a sessão. *Reabre se a sessão que fica aberta der
          algum acesso que o gate não tranca.*
        - **Os textos da sessão (a), em português e inglês: aprovados** (a tabela mostrada a ele;
          moram em `app.faturamento.*`). **Os da sessão (b)** — mudar de plano, cancelar e os
          cinco motivos em inglês — são mostrados a ele na abertura dela, antes de construir.
      - **O que decorre das decisões já tomadas** (lido de volta a ele e aprovado junto):
        o reembolso devolve **tudo o que foi pago naquela assinatura** (quem trocou de plano
        dentro dos 7 dias recebe as duas cobranças) · a assinatura de cortesia (código de 100%)
        **não mostra** a saída do reembolso — não há dinheiro a devolver · mensal → anual vale
        **na hora**, com o valor mostrado antes · cartão trocado com o pagamento atrasado → a
        escola **tenta cobrar na hora** com o cartão novo · o motivo fica guardado **na Stripe**,
        em cada assinatura (a contagem dentro da escola vem com o painel, 4.7b) · cancelar com
        reembolso **direto no painel da Stripe** também passa a cortar o acesso.
      - **Convenções de engenharia (como o código faz):**
        - **Sem migration e sem dependência nova.** A tela lê a Stripe **na hora** (plano,
          próxima cobrança, cartão, "vai cancelar", o prazo do reembolso); o espelho continua
          guardando só o que o gate lê. As colunas de plano e de "vai cancelar" ficam para a
          4.7b, que é quem lista todas as assinaturas.
        - **O site nunca diz QUAL assinatura.** A conta é a da sessão; a assinatura é a viva
          dessa conta, achada no servidor. Nenhum id da Stripe (assinatura, cartão, fatura) vem
          do navegador.
        - **Cada ação é uma OPERAÇÃO do servidor** (`server/src/lib/minha-assinatura.ts`), que
          recebe a assinatura e quem pediu; a rota só resolve a conta e responde. São as mesmas
          que o painel (4.7b) e o JilsonAI vão chamar.
        - **Toda operação: a Stripe, e depois `sincronizar` — dentro da trava da assinatura.** O
          aviso da Stripe que chegar no meio espera a trava e já encontra o espelho gravado.
          Nada grava o espelho à mão.
        - **O período devolvido não conta:** o "pago até" do espelho passa a tratar a última
          fatura **devolvida por inteiro** como não paga. Devolução parcial continua contando.
          O caminho de ler a devolução na Stripe é **medido na área restrita** antes de escrever.
        - **O prazo de 7 dias se confere no servidor, na hora da ação**, pela data de início da
          assinatura na Stripe (constante no `core`; os 14 dias entram na 4.8). A tela só mostra
          o que o servidor disse.
        - **"Continua logada":** a rotina de sincronia ganha a opção de não derrubar a sessão,
          usada **só** pela operação de reembolso pedida pelo dono. `CLAUDE.md` → *Access
          Architecture* é reconciliado no mesmo commit.
        - **Trocar o cartão:** o servidor abre na Stripe um pedido de guardar cartão para o
          cliente da conta; o site confirma com o campo da Stripe (o `CartaoProvider` já sabe
          "só guardar"); o servidor confere **na Stripe** que o pedido é do cliente desta conta e
          deu certo, e só então põe o cartão na assinatura.
        - **Repetir não faz mal:** parar a renovação duas vezes dá no mesmo; a devolução leva
          chave de repetição por fatura.
        - **Registro:** o que o aluno causa sozinho (cartão recusado, fora do prazo) é
          `console.warn`; `console.error`, com etiqueta, só o que precisa de gente (cancelou e a
          devolução falhou).
      - **Docs check (context7):** Stripe → `/websites/stripe` → cancelar na hora (`prorate`,
        `invoice_now`, `cancellation_details`; cancelada é estado final) · cancelar no fim do
        período é `update` com `cancel_at_period_end`, nunca o `DELETE` · a troca de preço com
        `proration_behavior` e `payment_behavior` — **3 consultas** (11/10/2026). Conferido nos
        tipos da `stripe@23.0.0`: a prévia da troca (`invoices.createPreview` com `subscription`
        e `subscription_details`), a devolução (`refunds.create`), os pagamentos de uma fatura
        (`Invoice.payments`) e `Charge.refunded`. **A consultar na abertura da sessão (b):** o
        agendamento da troca para o fim do período (subscription schedule) e a cobrança da
        fatura em aberto com o cartão novo.
      - **Passos, um commit cada. SESSÃO (a):** (1) este plano · (2) servidor: ler a assinatura
        da conta · (3) site: a tela de resumo, com o item do menu abrindo nela · (4) servidor:
        trocar o cartão · (5) site: a tela de trocar o cartão · (6) prova na área restrita com
        uma conta descartável, revisão de segurança, `billing.md` e "onde parou".
        **SESSÃO (b):** (7) servidor: parar a renovação e desfazer, com o motivo · (8) servidor:
        o reembolso — a operação, o período devolvido deixando de contar, a pessoa continuando
        logada e o aviso de dinheiro devolvido · (9) site: a tela de cancelar e o "Manter a
        assinatura" no resumo · (10) servidor: a prévia e a troca de plano · (11) site: a tela de
        mudar de plano · (12) o item (c) acima: quem cancelou e abre a tela de assinar é levado a
        "Manter a assinatura"; o caso raro da assinatura encerrada de vez ainda com dias pagos ·
        (13) prova na área restrita, revisão de segurança, documentos e fechamento.
        Cada passo fecha com os quatro gates, a suíte do servidor rodada como no CI (sem chave
        de fornecedor) e a mutação do ramo mais importante.
      - **SESSÃO (c), pedida pelo operador ao aprovar** (11/10/2026: *"depois inclua sessão (c)
        para tratar dessa parte"*): na coluna de **Minha conta**, os itens **Preferências**,
        **Senha e Acesso**, **Sessões ativas** e **Integrações** aparecem como links e não têm
        tela — quem clica cai no Início (achado do agente ao ler o menu para esta etapa). **O
        que cada um vira é decisão dele, tomada na abertura da sessão** (pendência P64): ganhar
        a tela, aparecer como EM BREVE, ou sair do menu. Não é código de cobrança: entra aqui
        porque é a mesma coluna do "Faturamento e Assinatura", e não segura o fechamento das
        sessões (a) e (b).
      - **Fora desta etapa:** o visitante assinar e o e-mail (4.7) · o painel do admin (4.7b) ·
        o dólar e os 14 dias (4.8) · o Pix (4.9) · o alerta de erro nas telas do aluno · a pausa
        de um mês · contador ou recusa por reembolso repetido (decisão dele: não existe).
      - **Passo 2 — FEITO (11/10/2026).** `GET /api/billing/minha-assinatura`: a assinatura da
        conta da sessão, como a Stripe diz agora — o plano (pelo intervalo da cobrança, não pela
        lookup key: quem assinou antes de um aumento continua no preço antigo, sem chave), o
        preço, o cartão (a bandeira, os 4 últimos e a validade) e a próxima cobrança, que é a
        prévia da fatura da própria Stripe e só é pedida para a assinatura que renova. A regra
        mora em `lib/minha-assinatura.ts`; a ida à Stripe, em `lib/stripe-assinatura.ts` (a
        segunda metade da fronteira: `stripe.ts` passou de 360 linhas). "Tem acesso?" é a
        função do gate, a mesma da aula. Sem assinatura que dê acesso, a resposta sai do espelho
        e a Stripe nem é consultada. **A assinatura que a Stripe não conhece** (a de mentira do
        seed) responde 404 com aviso, não erro: a tela mostra "não foi possível carregar".
        **Testes:** 19 de servidor + 15 unitários. **Mutação:** 3 de 3 reprovaram — a busca
        sem o filtro da conta, a tela sem a regra do gate, a próxima cobrança pedida para
        toda assinatura. Gates: typecheck, lint, suíte de servidor como o CI (761) e do site
        (810), build.
      - **Passo 3 — FEITO (11/10/2026).** A tela `/aluno/conta/faturamento` (o item do menu da
        conta passa a abrir nela): o plano com o preço, a próxima cobrança com o valor e a data
        que o servidor mandou, o cartão, a renovação parada com a data do fim, e o alerta da
        cobrança que falhou; sem assinatura leva a "Assinar", e quem já teve, a "Reativar
        assinatura". Os textos aprovados em `app.faturamento.*`, PT e EN (a data em inglês sai
        com o mês por extenso: "Nov 10, 2026"). **Os botões de trocar o cartão, mudar de plano
        e cancelar entram junto com a tela de cada um** (passos 5, 9 e 11): nenhum link aponta
        para tela que ainda não existe. **Um texto a mais, rascunho do agente:** "Sua
        assinatura terminou." / "Your subscription has ended.", para quando a Stripe não tem a
        data do fim (o aprovado, sem o "em {data}"). **Testes:** 15 de tela (carregando, falha,
        vazio e cada situação, e o inglês). **Mutação:** 4 de 4 reprovaram — a próxima cobrança
        com o preço do plano, o alerta sumindo, a falha sumindo, "Assinar" no lugar de
        "Reativar". Gates: typecheck, lint, suíte do site (825) e de servidor como o CI (761),
        build. **Não visto em navegador pelo agente** (entrar exige a senha do aluno): a
        conferência visual é do operador.
      - **Passo 4 — FEITO (11/10/2026).** Trocar o cartão, em dois pedidos sem corpo.
        `POST /api/billing/cartao` abre na Stripe um pedido de guardar cartão para o cliente da
        assinatura da conta e devolve só o segredo; `POST /api/billing/cartao/aplicar` lê **na
        Stripe** o cartão que esse pedido confirmou (só vale o que deu certo, do nosso fluxo,
        desta conta, deste cliente e desta assinatura) e o põe na assinatura. O site não manda
        código de cartão. O cartão antigo sai da Stripe depois de o novo estar no lugar (se não
        sair, é aviso: a troca valeu). **Com a cobrança atrasada**, o cartão novo paga a fatura
        em aberto na hora e o espelho é acertado por `sincronizarAssinatura`; cartão novo
        recusado não é erro — a troca valeu e a Stripe segue tentando. Assinatura encerrada de
        vez não recebe cartão (409). `[FATO — tipos da `stripe@23.0.0`]` no pedido de guardar
        cartão a lista de formas de pagamento é `allowed_payment_method_types`; o nome antigo
        não existe mais nesta versão. **Mudou em relação ao plano:** a troca do cartão **não
        segura a trava da assinatura** — ela não decide nada pelo espelho, e quem ordena a
        gravação é a própria rotina de sincronia; a trava fica para cancelar e reembolsar
        (sessão b). **Testes:** 25 de servidor + 10 unitários. **Mutação:** 6 de 6 reprovaram —
        cartão confirmado de outra conta valendo, pedido que não deu certo valendo, assinatura
        encerrada recebendo cartão, fatura cobrada com a assinatura em dia, o cartão novo
        sendo tirado, a falha ao tirar o antigo derrubando a troca. *(Numa das rodadas de
        mutação um teste que não toca a Stripe marcou 493 s e reprovou; não se repetiu em três
        rodadas seguidas nem na suíte inteira — fica anotado.)* Gates: typecheck, lint, suíte
        de servidor como o CI (796) e do site (825), build.
      - **Passo 5 — FEITO (11/10/2026).** A tela `/aluno/conta/faturamento/cartao` e o botão
        "Trocar cartão" (ou "Adicionar cartão") no resumo. O campo é o da Stripe, aberto para só
        GUARDAR o cartão — nada é cobrado ali —, com a moeda da assinatura. O envio, na ordem:
        confere o preenchimento → o servidor abre o pedido → o campo confirma → o servidor
        aplica. Depois, a tela diz "Cartão atualizado." (ou "…e pagamento confirmado.", quando a
        cobrança estava atrasada), mostra o cartão novo e o caminho de volta ao resumo. **O
        botão só aparece quando o SERVIDOR diz que a assinatura aceita cartão** (campo novo na
        resposta, `aceitaCartao`; a regra é uma só, `aceitaCartaoNovo`, para a tela e para a
        operação). Se o último passo falha, o novo clique repete só ele: confirmar de novo
        guardaria um segundo cartão. O formulário é carregado à parte e está em
        `PEDACOS_DO_ALUNO` (+0,7 KB compactado no pacote de todo aluno). **Testes:** 17 da tela
        nova + 3 no resumo. **Mutação:** 6 de 6 reprovaram — o cartão recusado sendo aplicado,
        o novo clique guardando outro cartão, o campo abrindo com valor a cobrar, o cartão mal
        preenchido indo ao servidor, o formulário abrindo para quem não pode, "pagamento
        confirmado" sem ter pago. Gates: typecheck, lint, suíte do site (845) e de servidor
        como o CI (796), build.
      - **Passo 6 — FEITO (11/10/2026): a prova na área restrita, a revisão de segurança e os
        documentos.**
        **A prova** (duas contas descartáveis no branch `dev` do Neon, chave `sk_test_`, nenhum
        segredo impresso; um roteiro fora do repositório, com as duas travas — chave de teste e
        banco de dev — conferidas antes de começar): **32 pontos, todos passaram**, e de novo
        depois das correções da revisão. Ler a assinatura de verdade (plano, preço, cartão, a
        prévia da próxima cobrança 31 dias à frente) · a Stripe aceitou o pedido de guardar
        cartão · aplicar antes de confirmar não muda nada · confirmado, o cartão da assinatura é
        o novo e o antigo saiu do cliente · repetir não tira o novo · a renovação parada e a
        encerrada de vez com dias pagos · e, **com um relógio de teste da Stripe**, a cobrança
        que falha na renovação, a conta atrasada com acesso, o cartão novo pagando a fatura em
        aberto e o espelho acertado; o cartão novo que também falha. Limpeza: clientes e relógio
        apagados na área restrita, as contas apagadas do banco (zero linhas delas).
        **A revisão de segurança** (`security-vulnerability-reviewer`, sobre o diff da sessão):
        **nenhum bloqueio.** Os achados e o destino de cada um:
        - *O espelho dá acesso e a Stripe diz que acabou (aviso perdido): a leitura respondia
          "terminada" e não fazia nada* → **corrigido**: a leitura chama a rotina de sincronia
          (o gate tranca; a sessão cai, como em toda perda de acesso); se a sincronia falha, é
          erro no registro.
        - *Conta com acesso por assinatura que a Stripe não conhece só gerava aviso* →
          **corrigido**: erro em produção (lá é sempre acesso sem assinatura de verdade), aviso
          fora dela (é a de mentira do seed); as três rotas registram.
        - *As rotas novas sem limite de tentativas* (um assinante poderia testar cartões pelo
          site) → **etapa 4.7, pré-requisito (a)**, agora com as três rotas pelo nome. Não
          bloqueia antes: o cadastro é fechado.
        - *A troca do cartão segurava conexão do banco esperando a trava* → **corrigido**: a
          sincronia que não espera (`sincronizarSeLivre`).
        - *O campo de verdade da Stripe em modo "só guardar" nunca abriu num navegador* → **do
          operador, ANTES de publicar** (`billing.md` → *Pendências de verificação*).
        - *Pedido de cartão antigo valia para sempre* → **corrigido**: só o aberto há até 1 hora.
        - *A fatura paga no mesmo instante virava erro 500* → **corrigido**: a fatura é relida.
        - *O banco pedindo confirmação na cobrança da fatura era tratado como recusa* →
          **corrigido em parte**: desfecho próprio, registrado com a conta e a assinatura.
          **Completar a confirmação na tela** (e o texto) fica para a **sessão (b), passos 10 e
          11**: a troca de plano precisa do mesmo mecanismo, e o texto é do operador.
        - *Só o cartão da assinatura sai da Stripe* (o confirmado e não aplicado, e o padrão do
          cliente, ficam) → **sessão (b), abertura do passo 7**: tirar todos menos o novo.
        - *"Sair" não limpa o que as telas guardaram; a leitura da assinatura era vista por
          instantes pela conta seguinte na mesma aba* → **corrigido na leitura nova** (ela é
          esquecida quando a tela fecha); o caso geral, das outras telas, é **achado levado ao
          operador** — está fora desta etapa.
        - *O dono se apoiava só no espelho* → **corrigido**: se a Stripe diz que a assinatura é
          de outra conta, nada dela é lido nem trocado, e o registro grita.
        - *As idas à Stripe eram dublê em todo teste de rota* → **corrigido**: 16 testes com a
          biblioteca da Stripe trocada por um dublê do tamanho do que as funções usam.
        **Depois das correções:** 8 mutações novas, todas reprovaram. Gates: typecheck, lint,
        suíte de servidor como o CI (822) e do site (847), build. `CLAUDE.md` → *Membership
        Gating* (o pedido nunca diz qual assinatura; a sincronia que não espera) e `billing.md`
        (a seção *Minha assinatura*) reconciliados; pendência P65 (um texto rascunho).
      - **O teste do operador no navegador (11/10/2026), e o que saiu dele.** Como `member@`, no
        computador: o resumo abriu, **o campo de verdade da Stripe abriu para guardar o cartão**
        (o ponto que faltava provar), o `4242` foi salvo e o resumo passou a mostrá-lo.
        **Dois apontamentos dele:** (1) *"Seus dados continua realçado"* → **corrigido**: na
        coluna do nível 2 fica um item aceso por vez, o mais específico (`itemAceso`, em
        `lib/navigation.ts`; 4 testes, e a mutação reprova) — os itens da coluna da conta
        ganharam `aria-current` · (2) a frase de autorização embaixo do campo → é da Stripe, e
        **fica a dela** (decisão dele; `billing.md` → *Minha assinatura*); o nome estranho é o
        da área de teste — no site entra o nome público da conta de verdade (P58).
        **Decisões dele no mesmo dia:** publicar a sessão (a) sozinha · "Sair" passa a limpar o
        que as telas guardaram (abertura da sessão b) · quem abre a tela com a assinatura já
        encerrada é deslogado (mantido). O `GEMINI.md` do parceiro de design ganhou as duas
        telas no mapa e o item 34 na fila de formatação.
      - **SESSÃO (b), item 0 — FEITO (11/10/2026): "Sair" esquece o que as telas guardaram.**
        Ao sair, tudo o que as telas leram e guardaram na aba é apagado antes de a tela de entrar
        abrir (`Layout`, o único lugar que encerra a sessão): quem entra em seguida na mesma aba
        não vê nada da conta anterior. A leitura da assinatura continua sendo esquecida ao fechar
        a tela — é o que cobre a sessão que acaba SEM o "Sair". **Teste:** 1 de tela (a tela
        guarda, "Sair", a tela seguinte não acha nada). **Mutação:** 1 de 1 reprovou (sem a
        limpeza, "ainda guardado: o progresso da Ana"). Gates: typecheck, lint, suíte do site
        (852) e de servidor como o CI (822), build. **Achado, levado ao operador e NÃO
        construído:** a sessão que o servidor derruba (ou que vence) não passa pelo "Sair"; se
        outra conta entrar na mesma aba em até 5 minutos, sem recarregar, as outras telas ainda
        mostram por instantes o que era da anterior — a de faturamento, não.
        **Os textos da sessão (b)** (mudar de plano, cancelar com os cinco motivos, e o banco
        pedindo confirmação), em português e inglês, **foram mostrados a ele nesta data e
        aguardam aprovação**; as telas (passos 9 e 11) esperam por ela.
        **Docs check (context7):** Stripe → `/websites/stripe` → o agendamento
        (`subscription_schedules`: criar, soltar com `release`, cancelar), a troca com
        `payment_behavior` e o segredo de confirmação da fatura, cancelar na hora
        (`cancellation_details`, `prorate`, `invoice_now`) e `refunds.create` — **3 consultas**.
        Conferido nos tipos da `stripe@23.0.0`: `from_subscription`, `end_behavior: release`,
        `Subscription.schedule` e `pending_update`, `pending_if_incomplete`,
        `Invoice.confirmation_secret`, e a lista FIXA de motivos da Stripe (oito valores; "Já
        aprendi o que precisava" não tem par — vai como "outro", com o motivo exato guardado
        junto da assinatura).
      - **Passo 7 — FEITO (11/10/2026): parar a renovação e voltar atrás, com o motivo.**
        `POST /api/billing/minha-assinatura/cancelar` (o corpo leva só o motivo e o "Quer contar
        mais?", os dois opcionais — sem corpo também funciona) marca a assinatura da conta para
        acabar no fim do período pago e responde até quando há acesso;
        `POST …/minha-assinatura/manter` (sem corpo) tira a marca, sem cobrar nada. Quem parou
        continua com acesso e logado: a assinatura segue viva na Stripe, e o gate lê status e
        data. **O motivo fica na Stripe:** o par mais próximo na lista fixa dela e o motivo exato
        da escola junto da assinatura (`metadata.motivo`), que é o que o painel (4.7b) vai contar;
        o comentário nunca vai para o registro. Voltar atrás apaga o motivo. **Toda operação que
        muda a assinatura passa por `operarNaAssinatura`** (`assinaturas.ts`): a Stripe e depois
        a sincronia de sempre, com a trava da assinatura e **sem esperar por ela** — ocupada,
        responde 409 sem ter ido à Stripe; se a Stripe mudou e a sincronia falhou, a operação
        valeu (é aviso; o aviso da Stripe acerta o espelho). A tela passa a receber `podeParar` e
        `podeManter`, pelas mesmas regras das operações. **Com a cobrança atrasada, cancelar
        responde 409** (`CobrancaAtrasada`) e nada muda: o que cancelar faz ali é decisão do
        operador (pendência P67). **Na abertura do passo:** trocar o cartão passou a tirar da
        Stripe TODOS os cartões do cliente menos o novo (o da assinatura, o confirmado e nunca
        aplicado, o padrão do cliente), depois de o novo estar no lugar; se algum não sair, é
        aviso. **Testes:** 28 de rota + 9 com a biblioteca da Stripe trocada por dublê + 6
        unitários novos (e os da troca de cartão refeitos). **Mutação:** 13 de 13 reprovaram —
        parar encerrando na hora, a assinatura ocupada operada assim mesmo, o espelho acertado
        antes de a Stripe mudar, a sincronia que falha virando erro, cancelar com a cobrança
        atrasada, a encerrada de vez sendo parada e voltando atrás, manter mexendo em quem já
        renova, o comentário no registro, "Manter" oferecido à encerrada, o cartão novo sendo
        tirado, os antigos saindo antes de o novo entrar, o motivo ficando em quem voltou atrás.
        `[FATO — medido na área restrita, 11/10/2026, com dois clientes descartáveis, já
        apagados]` parar deixa a assinatura `active` com a data de fim igual ao fim do período,
        e guarda o motivo, o comentário e o `metadata.motivo` · parar de novo sem motivo mantém o
        motivo de antes · voltar atrás com os campos vazios apaga os três · a data avulsa de fim
        se desfaz com `cancel_at` vazio, e mandar as duas marcas juntas a Stripe recusa · tirar
        os outros cartões limpa também o padrão do cliente, e a assinatura segue `active` com o
        novo. Gates: typecheck, lint, suíte do site (852) e de servidor como o CI (861), build.
        *(A Stripe CLI pede confirmação para apagar: sem `--confirm` o comando fica esperando.)*
      - **Passo 8 — FEITO (11/10/2026): o reembolso.**
        `POST /api/billing/minha-assinatura/reembolso` (o corpo leva só o motivo, opcional):
        dentro do prazo, **encerra a assinatura da conta na hora e devolve tudo o que foi pago
        nela** — o que FALTA voltar de cada cobrança, as duas de quem trocou de plano — e responde
        quanto voltou. **O prazo (7 dias do primeiro dia da assinatura; `PRAZO_DO_REEMBOLSO_EM_DIAS`
        no `core`) é conferido no servidor na hora da ação, e de novo com a trava**, junto com o
        que foi pago. A cortesia não tem o que devolver (409, e não é encerrada). **O acesso
        termina na hora e a pessoa continua logada**: a sincronia ganhou `manterSessao`, usada só
        por esta operação. **A ordem é encerrar e depois devolver:** se a devolução falha, a
        resposta tem nome próprio (502 `DevolucaoFalhou`), o registro grita (`console.error`, com
        etiqueta, a conta e a assinatura), a pessoa segue com o acesso do que pagou e pode
        repetir — a assinatura já encerrada não é encerrada de novo, e repetir não devolve duas
        vezes (chave de repetição por pagamento; o que a Stripe diz que já voltou conta como
        feito). **O período devolvido deixou de contar:** a última fatura devolvida POR INTEIRO
        não conta como paga no "pago até" — do espelho e da tela, pela mesma conta; a devolução
        parcial continua contando. **O aviso de dinheiro devolvido** (`charge.refunded`) traz só a
        cobrança: o servidor acha a assinatura pelo pagamento e a sincroniza — é o que faz o
        reembolso dado direto no painel da Stripe também cortar o acesso (**o endereço de avisos
        da conta de verdade precisa receber esse aviso: pendência P69**). **A tela** passa a
        receber `reembolso` (quanto volta e até quando), só dentro do prazo e com dinheiro a
        devolver; fora do prazo a Stripe nem é consultada.
        **Mudou a estrutura** (engenharia): a fábrica da biblioteca da Stripe foi para
        `stripe-cliente.ts` e a leitura da devolução para `stripe-devolucao.ts`, para que a busca
        que alimenta o espelho rode de verdade nos testes (só a rede é dublê); as idas do
        reembolso moram em `stripe-reembolso.ts`. Custo: a busca da assinatura faz uma ida a mais
        à Stripe quando a última fatura tem pagamento.
        `[FATO — medido na área restrita, 11/10/2026]` a fatura devolvida continua `paid`, com o
        mesmo valor pago, e o pagamento dela também: quem diz que o dinheiro voltou é a COBRANÇA ·
        a Stripe não deixa expandir da assinatura até a cobrança (limite de 4 níveis) · a
        cobrança não diz de que fatura é; acha-se pelo pagamento (`invoice_payments`) · encerrar
        na hora sem crédito não gera fatura nova · a mesma chave de repetição devolve a MESMA
        devolução, e devolver de novo o que já voltou é recusado (`charge_already_refunded`) · a
        cortesia tem fatura paga de valor zero e nenhum pagamento · a data de início é a de
        criação · pagamento que não existe: a lista vem vazia (nenhuma assinatura), sem erro.
        **A prova com as funções de verdade** (área restrita, 3 clientes descartáveis e 1 cupom,
        já apagados; o banco não foi tocado): **23 pontos** — parar e voltar atrás, tirar os
        outros cartões, encerrar, devolver, repetir sem devolver duas vezes, o espelho sem acesso
        depois da devolução, a parcial contando, a cortesia sem a saída. 22 passaram de primeira;
        o 23º era uma suposição errada da própria prova (esperava erro para um pagamento que não
        existe; a Stripe devolve lista vazia — conferido).
        **Testes:** 31 de rota + 5 do aviso + 27 com a biblioteca trocada por dublê + 5 unitários.
        **Mutação:** 21 de 21 reprovaram — a fatura devolvida contando como paga, a busca do
        espelho sem conferir a devolução, a parcial tirando o acesso, o reembolso fora do prazo
        (antes e com a trava), o prazo de 8 dias, sem data de início o dinheiro saindo, a
        cortesia encerrada, devolver antes de encerrar, encerrar duas vezes, a devolução que
        falha respondendo "devolvido" e sem avisar ninguém, quem pede sendo deslogado, ninguém
        mais sendo deslogado, a saída mostrada fora do prazo e para a cortesia, o aviso sem achar
        a assinatura, o valor cheio no lugar do que falta, sem chave de repetição, o crédito
        proporcional, faturas de qualquer assinatura. Gates: typecheck, lint, suíte do site (852)
        e de servidor como o CI (929), build.
      - **Passo 10 — MEDIDO na área restrita antes de escrever (11/10/2026; 8 clientes
        descartáveis e 1 cupom, já apagados).** `[FATO]`
        **Mensal → anual na hora** (`subscriptions.update` com o preço novo no item,
        `proration_behavior: always_invoice` e `payment_behavior: pending_if_incomplete`): a
        prévia (`invoices.createPreview` com `subscription_details`) dá o valor de hoje — o ano
        inteiro menos o que sobrou do mês (R$ 895,10 no primeiro dia) — e **o cobrado é o da
        prévia**; a assinatura vira anual na hora, com o fim do período um ano à frente e a
        MESMA data de início (o prazo do reembolso não recomeça); ficam duas faturas pagas, e o
        reembolso devolve as duas. De cortesia: prévia de R$ 0, troca na hora.
        **O banco pede confirmação:** a resposta vem 200, a assinatura CONTINUA mensal, com a
        troca pendente (vale ~23 h) e a fatura da troca em aberto; o pagamento fica
        `requires_action`, e o segredo de confirmação da fatura é o que o site usa. Confirmado o
        pagamento, a Stripe aplica a troca sozinha (anual, fatura paga).
        **Cartão recusado:** a mesma forma (200, troca pendente, fatura em aberto), com o
        pagamento `requires_payment_method` e `card_declined` — distingue-se pelo PAGAMENTO, que
        se lê com `invoices.retrieve` expandindo `payments.data.payment.payment_intent`.
        **Desistir da troca pendente = anular a fatura dela:** a pendência some, a assinatura
        segue mensal, a próxima cobrança segue a do mensal e não sobra crédito no cliente. Uma
        segunda tentativa substitui a primeira sozinha (a fatura antiga é anulada pela Stripe).
        *Consequência conhecida:* depois de anulada, a "última fatura" da assinatura é a anulada
        até a próxima renovação.
        **Anual → mensal no fim do ano (agendamento):** `subscriptionSchedules.create` com
        `from_subscription` cria uma fase (o ano pago); `update` com duas fases (a atual e a
        mensal) e `end_behavior: release` deixa a assinatura intacta até lá, e a prévia da
        próxima cobrança já diz R$ 99,90 na data do fim do ano; `release` desfaz (a assinatura
        segue anual, sem agendamento) e dá para agendar de novo. O agendamento se lê junto com a
        assinatura (`expand: schedule.phases.items.price`). **O desconto só sobrevive se as fases
        o levarem** (a fase criada traz `discounts`; copiado para as duas, a cortesia segue
        cortesia). **Com agendamento, a Stripe RECUSA parar a renovação direto na assinatura**
        ("managed by the subscription schedule"): antes, soltar o agendamento. Trocar o cartão e
        gravar o motivo continuam aceitos; encerrar na hora também (o agendamento vira cancelado).
      - **Passo 10 — FEITO (11/10/2026): o servidor mostra a conta e muda o plano.**
        `GET /api/billing/minha-assinatura/plano` diz a troca que a conta pode fazer agora, já
        com a conta da Stripe: para o **anual**, quanto se paga hoje, a cobrança seguinte e o
        instante da conta (`previaDe`); para o **mensal**, quando a troca vale (o fim do período
        pago) e quanto passa a custar. `POST …/plano` recebe só PARA QUAL plano (e o `previaDe`
        de volta): **anual vale na hora**, e a assinatura só muda se o pagamento passar;
        **mensal é só marcado** para o fim do período — nada é cobrado nem trocado até lá.
        `POST …/plano/desistir` solta a troca marcada, ou anula a que ficou esperando o banco.
        **O valor mostrado é o cobrado:** a troca usa o MESMO instante da prévia, e o servidor só
        o aceita com até 30 minutos (`VALIDADE_DA_PREVIA_DA_TROCA`): um instante antigo daria
        crédito por dias que a pessoa já usou; vencido, responde 409 `PreviaVencida` e a tela
        pede outra conta. **Cartão recusado:** 402, e a fatura da troca é anulada na hora (se não
        anular, `console.error` com etiqueta: ela ainda poderia ser cobrada). **O banco pede
        confirmação:** a resposta leva o segredo para o site completar; a troca só vale depois, e
        desistir anula a fatura (se o pagamento já tinha passado, a resposta diz que o plano
        mudou). **A mesma confirmação na troca de cartão:** com a cobrança atrasada e o banco
        pedindo confirmação, a resposta de aplicar o cartão passou a levar o segredo da fatura em
        aberto (`confirmar`). **Quem está saindo não troca de plano:** parar a renovação solta
        antes a troca marcada (com ela a Stripe recusa parar) e anula a que esperava o banco —
        **o que isso significa para o aluno é pergunta ao operador (pendência P70)**. O reembolso
        já convive com o agendamento (medido). **A tela** passa a receber `podeMudarDePlano` e
        `trocaMarcada` (para qual plano e quando). As operações moram em `lib/meu-plano.ts`, e as
        idas à Stripe em `lib/stripe-plano.ts`.
        **A prova com as funções de verdade** (área restrita, 6 clientes descartáveis e 1 cupom,
        já apagados; o banco não foi tocado): **25 de 25 pontos** — a prévia, a troca cobrando
        exatamente o mostrado mesmo segundos depois, a data de início que não muda, o banco
        pedindo confirmação (continua mensal; desistir; confirmar e virar anual; desistir depois
        de pago), o cartão recusado sem fatura sobrando, a troca marcada (continua anual, a
        próxima cobrança já é a do mensal, a Stripe recusando parar a renovação até soltar),
        desistir, e a cortesia nos dois sentidos (R$ 0 e o desconto indo junto).
        **Não exercitado:** a virada de verdade para o mensal no fim do ano (só a prévia da
        Stripe diz R$ 99,90 naquela data) — fica para o relógio de teste do passo 13.
        **Testes:** 62 novos (de rota, com a biblioteca da Stripe trocada por dublê e unitários).
        **Mutação:** 22 de 22 reprovaram — a troca com a hora do servidor no lugar do instante
        mostrado, a conta velha aceita, a troca sem conferir a conta, o plano que não cabe, a
        fatura do recusado ficando em aberto, o recusado e o "confirmar" respondendo "trocado",
        o mensal trocando na hora, quem não renova mudando de plano, duas trocas marcadas,
        desistir sem soltar e dizendo que desfez o que foi pago, parar a renovação sem soltar nem
        anular, o segredo que não chega ao site, a troca valendo sem o pagamento, o recusado
        ficando à espera, a prévia e a troca com contas diferentes, o desconto perdido na fase
        nova, o agendamento pela metade preso, a fatura paga dada como anulada, "troca marcada"
        para o mesmo plano. Gates: typecheck, lint, suíte do site (852) e de servidor como o CI
        (991), build.
      - **A revisão de segurança do SERVIDOR da sessão (b) — FEITA (11/10/2026), adiantada do
        passo 13** (`security-vulnerability-reviewer`, sobre o diff dos quatro commits; o passo
        13 revê as telas e estas correções). **Nenhum bloqueio (P0); três P1, corrigidos.** Sem
        achado em: agir sobre a assinatura de outra conta, receber fora do prazo, duas vezes, a
        mais ou de outra assinatura, pagar menos pela conta mostrada, a troca valer sem o
        pagamento, o segredo no registro, a sessão mantida dar acesso, e forjar ou repetir o
        aviso de dinheiro devolvido. Os achados e o destino de cada um:
        - *P1 — repetir o reembolso dependia de o espelho ainda dar acesso, e o espelho deixa de
          dar acesso quando a ÚLTIMA fatura volta* (com duas cobranças, a mais nova voltava
          primeiro; e depois de uma troca de plano que não se completou, a última fatura é a
          anulada): a pessoa ficava sem acesso, com dinheiro por receber e sem poder repetir. O
          teste passava porque o dublê só tirava o acesso quando TUDO voltava → **corrigido**: as
          cobranças voltam da mais antiga para a mais nova; o reembolso acha também a assinatura
          ENCERRADA mais recente da conta, sem acesso e dentro do prazo (as três mais novas, com
          as conferências de dono, prazo e valor); e o dublê passou a cortar o acesso como o
          código de verdade.
        - *P1 — o reembolso não anulava a troca de plano que esperava a confirmação do banco* →
          **corrigido**: a fatura da troca é anulada antes de encerrar, e o que foi pago se lê
          depois (se a troca se completou no mesmo instante, a cobrança dela entra na devolução).
          `[FATO — medido, 11/10/2026]` ao encerrar na hora a própria Stripe anula essa fatura e
          cancela o pagamento dela: confirmar depois é recusado.
        - *P1 — o dinheiro voltava com o espelho não acertado, e só ficava um aviso* (com a
          assinatura já encerrada, a Stripe não manda mais aviso sobre ela) → **corrigido**: a
          operação tenta a sincronia mais uma vez; se não der, `console.error` com etiqueta, a
          conta e a assinatura. **E a P69 passou a ser condição de publicar o reembolso**, não só
          para o reembolso dado pelo painel.
        - *A operação com várias idas à Stripe usava o tempo de UMA* (vencido, a trava soltaria
          no meio) → **corrigido**: 90 s, a mesma conta do checkout.
        - *A sessão ficava em todo desfecho do reembolso* (também quando nada era devolvido e o
          acesso acabava) → **corrigido**: só quando o reembolso saiu.
        - *Se nem ler o pagamento da troca desse, o erro subia com a fatura em aberto* →
          **corrigido**: é recusa, e a fatura é anulada.
        - *A devolução que a Stripe aceita e que falha depois não avisava ninguém* →
          **corrigido**: o aviso de devolução com falha vira `console.error`, e a assinatura é
          sincronizada (o período volta a contar como pago). Também depende da P69.
        - *A chave de repetição fixa repetiria a FALHA por um dia* (a Stripe guarda a primeira
          resposta de cada chave) → **corrigido**: a chave muda a cada 5 minutos. *Não medido*: o
          comportamento é o documentado por ela.
        - *Parar, voltar atrás, mudar de plano e desistir decidiam pelo que foi lido ANTES da
          trava* (duas abas) → **corrigido**: os detalhes são relidos com a trava.
        - *O cartão trocado depois de marcar a troca de plano* → **medido, sem problema**: a
          Stripe passa o cartão novo para o agendamento sozinha.
        - *A virada do anual para o mensal não foi exercitada; o cupom de duração limitada
          copiado para a fase nova* → **passo 13** (relógio de teste); hoje não existe cupom assim.
        - *A chave de produção restrita não leria os pagamentos, e todo aviso responderia 500; e
          os alertas novos só existem com o Sentry configurado na Railway* → **do operador,
          antes de publicar: pendência P71.**
        **Depois das correções:** 19 testes novos (servidor: 1010), **21 de 21 mutações
        reprovaram**, e as duas provas com as funções de verdade rodaram de novo na área restrita
        (23 de 23 e 25 de 25). Gates: typecheck, lint, suíte do site (852) e de servidor como o
        CI (1010), build.
      - **As duas decisões de 11/10/2026 que faltavam no código — FEITO (11/10/2026).**
        **(i) Cancelar com a cobrança atrasada termina na hora.** A mesma rota de cancelar: para
        quem está em dia, continua sendo parar a renovação; com a cobrança atrasada, ENCERRA a
        assinatura, anula a cobrança em aberto (nessa ordem) e responde `terminou`. As aulas
        trancam na hora e a pessoa continua logada. A tela é avisada antes (`terminaAoCancelar`).
        A recusa `CobrancaAtrasada` deixou de existir. Os dois textos aprovados entraram no
        dicionário (`cancelamento.terminaAgora` e `.trocaDesfeita`). **Testes:** 8 de rota.
        **Mutação:** 9 de 9 reprovaram. **A prova com o relógio de teste da Stripe** (as funções
        de verdade, 2 relógios descartáveis, já apagados): 6 de 6 — a renovação que falha, a
        atrasada, encerrar, anular, nada em aberto, o espelho sem acesso. `[FATO — medido]`
        anular a cobrança em aberto com a assinatura ainda viva a devolve a `active`: é por isso
        que se encerra primeiro. **E, para a etapa 4.6b:** na atrasada, o "pago até" é mesmo o
        dia em que a renovação falhou.
        **(ii) Quem entra começa do zero:** o login limpa o que as telas guardaram (a senha
        errada não limpa nada). **Testes:** 2 de tela. **Mutação:** 2 de 2 reprovaram.
      - **Passo 9 — FEITO (11/10/2026): a tela de cancelar e os botões no resumo.**
        `/aluno/conta/faturamento/cancelar` (`CancelarPage`, com `MotivoDoCancelamento` e
        `SaidaDoCancelamento`; o que a tela guarda e faz mora em `lib/cancelamento.ts`). A tela
        oferece SÓ o que o servidor disse que cabe: em dia, parar a renovação (um cartão, com a
        data até quando há acesso); nos 7 primeiros dias e com dinheiro pago, **as duas saídas
        lado a lado**, com o valor e a data que o servidor mandou; com a cobrança atrasada, o
        aviso de que termina agora — e, depois do clique, o resumo, que diz que terminou. O
        motivo é opcional: sem nada, ao servidor vai um corpo vazio. Cada falha tem a frase
        dela (o prazo que acabou, a devolução que não saiu), e depois de qualquer falha a tela
        lê a assinatura de novo. Quem tinha a troca para o Mensal marcada lê o aviso. Sem nada a
        cancelar, a pessoa volta ao resumo. **No resumo** (`AcoesDoPlano`): "Cancelar
        assinatura" (para quem renova, quem está atrasado e quem ainda está no prazo do
        reembolso) e "Manter a assinatura" (a renovação parada que ainda volta), cada um só
        quando o servidor diz que cabe. Os motivos são botões de rádio nativos: não há
        componente de rádio em `components/ui/`, e um novo seria dependência nova.
        **Um texto a mais, rascunho do agente:** "Não foi possível manter a assinatura. Tente de
        novo." (pendência P73). **Testes:** 21 da tela nova + 10 no resumo. **Mutação:** 18 de
        18 reprovaram — a 16ª passou de primeira e mostrou um caso sem teste (a encerrada ainda
        no prazo do reembolso não pode ler "Manter"); o teste entrou e ela reprovou. Gates:
        typecheck, lint, suíte do site (885) e de servidor como o CI (1017), build. O
        `GEMINI.md` do parceiro de design ganhou a tela no mapa e o item 35 na fila.
        **Não visto em navegador pelo agente** (entrar exige a senha do aluno): a conferência
        visual é do operador.
      - **Passo 11 — FEITO (11/10/2026): a tela de mudar de plano e a confirmação do banco.**
        `/aluno/conta/faturamento/plano` (`MudarDePlanoPage`, com `OfertaDePlano` e
        `TrocaMarcada`; o que a tela lê e faz mora em `lib/troca-de-plano.ts`). Mostra o plano
        de hoje e o plano novo com o que o SERVIDOR disse: para o Anual, **quanto se paga hoje,
        ANTES do botão**, e a cobrança seguinte; para o Mensal, quando a troca vale e quanto
        passa a custar. Ao servidor vão só o plano e o instante da conta mostrada. Cartão
        recusado: a frase e o caminho para trocar o cartão. A conta que envelheceu: a tela pede
        outra e avisa que o valor mudou. Quem parou a renovação ou está atrasado lê o porquê.
        **A confirmação do banco na tela** (`confirmarNoBanco`, em `stripe-do-site.tsx` —
        `handleNextAction` do Stripe.js, sem campo de cartão): na troca para o Anual, a janela
        do banco abre por cima; confirmou, a tela espera a assinatura virar Anual e diz que
        trocou; não concluiu, a troca pendente é desfeita NA HORA e a tela diz que nada foi
        cobrado. **E na troca de cartão com a cobrança atrasada** (fecha a limitação da sessão
        a): a janela abre logo depois de o cartão ser posto; não concluída, a tela oferece
        "Confirmar pagamento". **No resumo:** "Mudar de plano", e a troca marcada com a data e
        "Continuar no Anual". O `import()` do Stripe.js para a confirmação entrou em
        `PEDACOS_DO_ALUNO`.
        **Defeito achado pelos testes, e corrigido:** o botão de trocar aparecia antes de a
        chave do Stripe.js chegar — quem clicasse nesse instante teria a confirmação do banco
        pulada e a troca desfeita à toa. O botão passou a esperar a chave.
        **Testes:** 23 da tela nova + 6 no resumo + 5 na troca de cartão. **Mutação:** 20 de 20
        reprovaram (a troca com a hora do navegador, a falha dada como troca, a recusa sem o
        caminho do cartão, a confirmação não concluída sem desfazer e dada como troca, o
        pagamento já passado dito "nada foi cobrado", a conta velha sem pedir outra, o preço no
        lugar do valor de hoje, o botão ligado enquanto envia, o botão antes da chave, marcar de
        novo com a troca marcada, e os do resumo e do cartão) — uma passou de primeira e mostrou
        um caso sem teste (a nova tentativa que o banco também não confirma), que entrou; e uma
        guarda que nenhum teste distinguia saiu do código (quem impede dois cliques é o botão
        desligado). Gates: typecheck, lint, suíte do site (916) e de servidor como o CI (1017),
        build. O `GEMINI.md` do parceiro de design ganhou a tela no mapa e o item 36 na fila.
        **Não visto em navegador pelo agente** — e **a janela do banco de verdade nunca abriu
        num navegador**: é do operador, no computador, com o cartão de teste que exige
        confirmação (`billing.md` → *Pendências de verificação*).
      - **Passo 12 — FEITO (11/10/2026): quem cancelou e abre a tela de assinar.** A tela de
        assinar, para quem JÁ tem acesso, passou a ler a assinatura: se ela termina numa data
        (a renovação parada, ou a encerrada de vez ainda com dias pagos), a pessoa é levada a
        Faturamento e Assinatura — onde está "Manter a assinatura", que não cobra nada — em vez
        de ler só "Você já é assinante". Assinar de novo cobraria duas vezes o mesmo período, e
        o servidor já recusa (409). Quem renova, ou está com a cobrança atrasada, continua
        lendo "Você já é assinante". Se a leitura falhar, vale o aviso de sempre: a tela não
        tranca. Quem não assina nem tem a assinatura lida. **O caso raro** (a encerrada de vez,
        ainda com dias pagos): não dá para manter nem para assinar de novo antes do fim — o
        resumo diz até quando há acesso, e "Reativar assinatura" aparece depois da data. *Se a
        tela deve dizer isso com todas as letras é pergunta ao operador (pendência P74).*
        **Testes:** 5 de tela. **Mutação:** 4 de 4 reprovaram. Gates: typecheck, lint, suíte do
        site (921) e de servidor como o CI (1017), build.
      - **Passo 13, parte 1 — FEITO (11/10/2026): a prova com CONTAS DESCARTÁVEIS.** As
        operações de verdade (`minha-assinatura.ts`, `meu-plano.ts`), com contas descartáveis no
        banco de desenvolvimento e a Stripe de teste; um roteiro fora do repositório, com as duas
        travas conferidas antes de começar (chave de teste; o banco é o branch de
        desenvolvimento) e nenhum segredo impresso. **42 pontos, todos passaram.**
        *A vida inteira de uma conta* (19): mensal no primeiro dia, com a saída do reembolso ·
        parar (continua com acesso e logada) · manter · a conta da troca e a troca para o anual
        cobrando EXATAMENTE o mostrado · o reembolso passando a ser das duas cobranças · pedir o
        plano que já tem · marcar o mensal · cancelar com a troca marcada (a troca é desfeita) ·
        manter (volta no anual) · o reembolso das duas cobranças, o acesso terminando na hora e
        a sessão continuando · pedir de novo sem devolver duas vezes · na Stripe, o total
        devolvido igual ao total pago. *As recusas* (6): a conta de 40 minutos atrás, o cartão
        recusado sem fatura sobrando, o banco pedindo confirmação com o plano parado no mensal,
        desistir. *A cortesia* (4): sem a saída do reembolso, sem ser encerrada, a troca a R$ 0
        e o desconto indo junto. *A cobrança atrasada, com o relógio de teste* (3): cancelar
        termina na hora, a cobrança é anulada, a sessão continua. ***A VIRADA do anual para o
        mensal, com o relógio de teste* (5): no fim do ano o plano vira mensal, a primeira
        cobrança de R$ 99,90 sai paga — com o cartão NOVO, trocado depois de marcar —, e cancelar
        funciona depois.** *O agendamento que sobra* (4, abaixo).
        Limpeza: 10 contas apagadas do banco (zero linhas delas), e os clientes, relógios e
        cupons apagados da área restrita. *Não coube na prova:* o prazo de 7 dias vencendo (o
        relógio do servidor não é o da Stripe; está nos testes).
        **Achado da prova, e corrigido:** `[FATO — medido com o relógio de teste]` depois da
        virada o agendamento continua preso à assinatura por mais um mês, já sem troca nenhuma —
        e a tela não oferecia mudar de plano nesse mês. Agora o que impede é a troca MARCADA, e
        não o agendamento; a operação solta o agendamento velho antes de mudar. 3 testes de
        rota, 4 de 4 mutações reprovaram, e a prova na área restrita (4 pontos).
        `[FATO — medido]` o relógio de teste só avança dois intervalos do menor período por vez
        (com o mensal no agendamento, dois meses): a prova avança em etapas.
      - **Passo 13, parte 2 — FEITO (11/10/2026): a SEGUNDA REVISÃO DE SEGURANÇA**
        (`security-vulnerability-reviewer`, sobre tudo o que entrou depois da primeira: as
        telas, a troca de plano, cancelar com a cobrança atrasada). **Nenhum bloqueio. Dois
        achados para corrigir antes de publicar e uma lista de melhorias — tudo o que não
        dependia de decisão do operador foi corrigido aqui.**
        **(1) A tela podia dizer "nada foi cobrado" com o pagamento já feito.** A janela do banco
        pode dar erro DEPOIS de o pagamento passar; o servidor não achava mais nada a desfazer,
        e a tela concluía que o plano continuava o mesmo. Agora `desistir` responde em que plano
        a assinatura está, relido com a trava (`TrocaDesfeita.plano` — campo a mais, API
        aditiva), e a tela só diz "nada foi cobrado" quando o SERVIDOR diz que o plano continua
        o mesmo.
        **(2) A "fatura da troca" podia ser outra.** Era "a última fatura em aberto, havendo
        troca pendente". Agora é só a fatura cujo motivo é o da troca (`subscription_update`), e
        desistir nunca anula fatura com a cobrança atrasada. `[FATO — medido com o relógio de
        teste, 11/10/2026]` quando a renovação chega com uma troca ainda pendente, a Stripe
        DESCARTA a troca (anula a fatura dela) e a assinatura fica atrasada com a fatura da
        renovação em aberto: o caso do achado não chega a acontecer, e a correção o fecha de
        qualquer jeito.
        **As melhorias, feitas:**
        · toda saída da janela do banco que não seja "pagamento aprovado" desfaz a troca
        pendente — inclusive o Stripe.js que quebra ou não carrega; desfazer tenta 3 vezes; e o
        servidor anula a troca anterior ainda pendente antes de aceitar outra (duas cobranças do
        plano novo nunca ficam em aberto);
        · depois de o banco confirmar, a tela espera o SERVIDOR dizer Anual (até 6 leituras)
        antes de afirmar; e depois de QUALQUER falha ela relê a assinatura — se a troca já foi
        feita (a resposta se perdeu no caminho), diz que deu certo em vez de pedir de novo;
        · a tela de cancelar não perde mais a frase da devolução que falhou (a assinatura já
        aparecia terminada, e a tela ia para o resumo), e a pessoa continua logada nesse caso;
        · cancelar com a cobrança atrasada: a cobrança que não pôde ser anulada, ou que PASSOU
        no instante do cancelamento, virou alerta para o operador (era só aviso);
        · só o agendamento que a ESCOLA criou (a marca `MARCA_DA_TROCA`, gravada por
        `agendarTroca`) é mostrado como troca marcada e solto ao mudar de plano ou desistir; o
        que for posto pelo painel da Stripe não é mostrado nem solto — a não ser ao cancelar,
        que é direito da pessoa (aí sai, com alerta);
        · pedido que muda cobrança e vem de OUTRO SITE: 403 (`Sec-Fetch-Site`), segunda trava
        além do cookie — vale para todo `/api/billing`;
        · a conta da sessão mudou sem "Sair" (entrou com outra em outra aba): o que as telas
        guardaram é esquecido e relido (`Layout`);
        · as leituras avulsas da assinatura não voltam a guardar plano e cartão
        (`CONSULTA_DA_MINHA_ASSINATURA`); o alerta da devolução que falhou sai uma vez por
        aviso, e não a cada reentrega; `encerradaDeVez` mora em `acesso.ts`.
        **Testes:** 17 de servidor e 14 de tela a mais. **Mutação:** 31 de 31 reprovaram.
        **Prova na área restrita:** 9 de 9 (a fatura da troca reconhecida; o agendamento da
        escola com a marca e o de fora sem ela; a renovação com a troca pendente, no relógio de
        teste), tudo apagado no fim. **Gates:** typecheck, lint, build, suíte do site (935) e de
        servidor como o CI (1037).
        **Ficou registrado, sem código:** o limite de pedidos por conta nas rotas de cobrança
        (pré-requisito da 4.7, já citado lá) · o reembolso que se repete — assina, pede, assina
        de novo, pede de novo — é pergunta ao operador (**P75**, antes da 4.7) · o que traduz a
        resposta do Stripe.js (`confirmarNoBanco`) não tem teste automático: é a nossa fronteira
        com o fornecedor, e se confere no navegador · se, com o pagamento aprovado, o servidor
        ainda não disser Anual depois das 6 leituras (~9 s), a tela afirma assim mesmo — o
        resumo pode mostrar Mensal por instantes.
      **ONDE PAROU:** SESSÃO (a) FECHADA e **PUBLICADA em 11/10/2026 (`main` = `6305077`)**, com
      a autorização do operador (*"pode publicar depois desses ajustes"*): CI verde nos dois jobs
      no `dev` e na `main`, e conferido no ar como visitante — as rotas novas respondem 401 sem
      login. Sem migration. **Para ele ver no site:** como `member@`, Faturamento e Assinatura
      mostra a assinatura de verdade (a do código de 100%); em "Adicionar cartão" a frase da
      Stripe traz o nome público da conta de verdade (P58) — só olhar: salvar ali guarda um
      cartão de verdade.
      **SESSÃO (b) — FECHADA e PUBLICADA em 11/10/2026 (`main` = `1bacac1`)**, com a autorização
      do operador (*"Publica o que está feito."*): os passos 7 a 13, três revisões de segurança
      e as duas partes do teste dele no navegador. CI verde nos dois jobs no `dev` (`899287f`) e
      na `main`; conferido no ar como visitante — as seis rotas novas respondem 401 sem login, e
      o pedido vindo de outro site, 403. Sem migration.
      **A P69 foi resolvida por ele em 12/10/2026** (os avisos de devolução no endereço de avisos
      da conta de verdade: 7 avisos), **e a P71 também** (a chave de produção é a comum,
      `sk_live_`, e a `SENTRY_DSN` está preenchida) — as duas estavam em aberto na publicação. *Sintoma se a P71 estiver errada:* os avisos da Stripe
      passam a falhar no painel dela, e Faturamento e Assinatura diz "não foi possível
      carregar". Hoje só ele assina no site no ar. O histórico da sessão segue abaixo.
      **Teste do operador no navegador, parte 1 — FEITO (11/10/2026)**, com a assinatura de
      cortesia do `member@` do computador, 12 telas conferidas: mudar para o Anual (R$ 0,00, na
      hora), marcar o Mensal para o fim do ano, "Continuar no Anual", cancelar com motivo e
      comentário (uma saída só, sem reembolso), "Manter a assinatura". Tudo como esperado; a
      assinatura ficou anual, renovando, sem troca marcada e sem motivo guardado (conferido na
      Stripe e no espelho).
      **Achado do teste, e a decisão do operador (P76 → B, 11/10/2026): O ANO DO ANUAL COMEÇA
      NO DIA DA TROCA.** `[FATO — medido com o relógio de teste]` sem pedir nada, a Stripe
      mantém o aniversário da assinatura: mensal assinado em 11/10 e trocado em 30/12 pagava
      R$ 738,25 (o anual proporcional até o aniversário) e era cobrado de novo em 11/10/2027. As
      provas anteriores só trocaram no primeiro dia, quando as duas contas coincidem.
      **O que mudou no código** (substitui o "instante da conta" dos passos 10 e 11, abaixo):
      `paraPedidoDeTroca` pede o período recomeçando (`billing_cycle_anchor: { type: "now" }`);
      `[FATOS — medidos]` nesta versão da Stripe o campo é um objeto, e com ele ela recusa o
      instante da conta (`proration_date`). Então saíram `previaDe`, `previaAindaVale` e a
      validade de 30 minutos, e entrou a conferência do valor: o site devolve o valor que
      mostrou (`valorMostrado`), o servidor refaz a conta com a trava logo antes de trocar e,
      se não bate, responde `PreviaVencida` — a tela mostra o valor novo. O valor que vem do
      site nunca é o que se cobra. **Docs check (context7):** Stripe → `/websites/stripe` →
      no modo flexível a âncora não recomeça sozinha ao trocar de preço (2 consultas, refeitas
      porque a sessão foi compactada; a forma do campo e a recusa do instante saíram dos tipos
      da biblioteca e da medição). **Prova na área restrita:** 18 de 18 com as funções de
      verdade — mensal há 80 dias paga R$ 956,33 (o anual menos os 12 dias que sobraram), o ano
      vai do dia da troca a um ano depois, o cobrado é o mostrado, a data de início não muda, o
      banco pedindo confirmação e o cartão recusado deixam o mês pago como estava, a cortesia
      troca a R$ 0. **Testes:** 3 de rota novos e os existentes reescritos; **mutação:** 7 de 7.
      Gates: typecheck, lint, build, suíte do site (935) e de servidor como o CI (1038).
      **E O VALOR MOSTRADO FICA CONGELADO POR 10 MINUTOS** (decisão do operador, no mesmo dia:
      *"prefiro perder 1 centavo a cobrar a mais do que foi mostrado […] cobra o que mostrou
      pela primeira vez; se passar uns 10 minutos sem confirmar, explica que expirou"*).
      Substitui a conferência "o valor tem que ser igual" do parágrafo acima: a cobrança sai
      EXATAMENTE no valor mostrado, e a escola abre mão dos centavos que o tempo levou. Como: o
      anual entra cheio, sem a conta por tempo da Stripe, e o desconto é uma linha de crédito de
      valor fixo no mesmo pedido (`paraPedidoDeCobrar`, `trocarAgora(troca, cobrar)`). O site
      devolve o valor e o instante da conta (`valorMostrado`, `mostradoEm`); o servidor confere
      os dois, porque vêm do navegador — o instante com até 10 minutos (`ofertaAindaVale`,
      `VALIDADE_DO_VALOR_MOSTRADO`) e o valor no máximo 5 centavos abaixo da conta refeita com a
      trava, nunca acima (`FOLGA_DO_VALOR_MOSTRADO`). Passou disso: `PreviaVencida`, e a tela
      mostra o valor novo. **Os textos são do operador (11/10/2026):** logo abaixo do valor,
      "Conclua em até 10 minutos, ou o valor poderá ser atualizado."; e, vencido o prazo, "Este
      valor foi atualizado. Confira e clique para concluir." (`app.faturamento.plano.valorValePor`
      e `.valorAtualizado`). **Prova na área restrita:** 26 de 26 com as
      funções de verdade — mostrado R$ 956,33, a conta da Stripe 9 minutos depois R$ 956,35,
      cobrado R$ 956,33; com código de 50% o cobrado é o mostrado (o crédito fica fora do
      alcance do código); o banco pedindo confirmação, o cartão recusado e a cortesia como
      antes. **Testes:** 12 de servidor a mais; **mutação:** 17 de 17. Gates: typecheck, lint,
      build, suíte do site (935) e de servidor como o CI (1050). **Rede de segurança:** a
      fatura da troca que não der o valor mostrado é anulada (se ainda espera o banco) ou vira
      alerta (se já foi cobrada). **Antes da etapa 4.8:** o imposto na fatura muda essa conta —
      rever o crédito e a folga lá.
      **TERCEIRA REVISÃO DE SEGURANÇA (11/10/2026), sobre o ano do Anual e o valor congelado:**
      nenhum bloqueio; não há caminho em que um valor forjado tire da escola mais que a folga.
      **Um achado para corrigir antes de produção, corrigido:** o pedido de troca deixou de ser
      inofensivo quando repetido. `[FATO — medido em tempo de verdade]` repetido numa assinatura
      que já virou anual ele não cobra de novo, mas deixa o crédito do mês solto no cliente (a
      renovação seguinte sairia R$ 99,90 mais barata). Agora `trocarAgora` não manda o pedido se
      o item já está no preço novo, e manda com chave de repetição (`chaveDaTroca`, que leva a
      última fatura de antes). **As melhorias, feitas:** a rede de segurança olha a fatura nova
      sem depender do motivo que a Stripe escreve, e não diz "nada foi cobrado" se a anulação
      falhou ou se a fatura foi paga no mesmo instante · a operação confere o valor por conta
      própria (inteiro, não negativo), porque é a porta que o admin e o JilsonAI vão usar · o
      valor fora da folga deixa rastro no registro · testes: a cortesia a R$ 0 pela rota, o
      pedido repetido, a anulação que falha, os dublês de troca pendente com fatura realista.
      **Prova na área restrita:** 31 de 31 (repetir a troca que já valeu não gera fatura; a
      mesma chave duas vezes, uma cobrança; recusado → trocou o cartão → passa; desistiu no
      banco → a tentativa seguinte é nova). **Mutação:** 11 de 11. **Registrado, sem código:**
      o saldo de crédito do cliente na Stripe (`billing.md` → Limitações) · o caminho da troca
      faz mais idas à Stripe com a trava do que antes; com a Stripe muito lenta o tempo da
      operação pode estourar — o pedido falha e nada é cobrado em dobro (as duas travas acima).
      `CLAUDE.md`: a trava "o site nunca escolhe valor" aponta a exceção, e a decisão ganhou a
      entrada (25) do changelog, com gatilho de reabertura; a (22) desceu para o arquivo.
      **TESTE DO OPERADOR NO NAVEGADOR, PARTE 2 — FEITO (11/10/2026)**, com cartão de teste e a
      janela do banco de verdade abrindo pela primeira vez num navegador (14 telas): reativar
      com o cartão que pede confirmação · mudar para o Anual a R$ 895,11 — "Fail" no banco
      ("nada foi cobrado"), depois "Complete" ("seu plano agora é o Anual") · o resumo com a
      cobrança seguinte em um ano · cancelar com as duas saídas, o reembolso de R$ 995,01 (os
      R$ 99,90 mais os R$ 895,11: o cobrado foi exatamente o mostrado) · parar a renovação e
      manter · a aula trancada com "Reativar assinatura", e ele ainda logado. Tudo como esperado.
      **Duas mudanças pedidas por ele depois do teste, feitas:** (1) sai da tela o aviso "Conclua
      em até 10 minutos…" (*"ninguém demora 10 minutos para decidir"*); (2) a troca acontece NUM
      CLIQUE SÓ mesmo depois de a pessoa demorar (*"tem que acontecer num passo só […] sem uma
      segunda confirmação do aluno"*). Para isso o prazo de 10 minutos saiu (`mostradoEm`,
      `ofertaAindaVale`, `VALIDADE_DO_VALOR_MOSTRADO`): a cobrança continua saindo no valor
      mostrado, e a única conferência é a folga, que passou de 5 centavos para R$ 1,00
      (`FOLGA_DO_VALOR_MOSTRADO` — **número escolhido pelo agente, a confirmar: pendência P77**).
      Só fora dela a tela busca o valor de novo e pede o segundo clique. O prazo nunca foi a
      proteção contra valor forjado (a terceira revisão já dizia: o instante vem do navegador;
      quem segura é a conferência do valor). Testes reescritos; mutação 2 de 2; gates abaixo.
      **Achado do teste, só relatado:** depois de pagar pela tela "Reativar assinatura", a
      confirmação aparece com o título "Assinar".
      **As respostas dele (11/10/2026), feitas:** (1) **a P77 — "R$ 1,00 está ok"**; (2) **passou
      da folga, a tela leva ao INÍCIO**, sem a mensagem "valor atualizado" nem segundo clique
      (*"passou do tempo, redireciona; quando for lá novamente já vê o novo valor […] igual banco
      que expira"*): a oferta traz `valeAte` (`validadeDoValorMostrado`: o tempo que a conta leva
      para andar a folga, com o mês mais curto — 6 h 43 min no mensal de R$ 99,90) e a tela sai
      sozinha quando ele passa (`useValorVencido`: relógio em pedaços, e conferência quando a aba
      volta a ser vista); no clique, a recusa do servidor (`PreviaVencida`) leva ao mesmo lugar.
      O texto `valorAtualizado` saiu do dicionário. (3) **a confirmação de quem reativou diz
      "Reativar assinatura"** (*"deixa 'Reativar assinatura' para ficar igual"*): a marca vai no
      endereço (`telaDeConcluido`, `?reativou=1`), pelo caminho de dentro do site e pelo
      endereço de volta da Stripe, e só muda o título — quem confirma continua sendo o servidor.
      **Testes:** 7 de tela e 1 de servidor a mais (site 942, servidor 1058); **mutação:** 11 de 11 — e os testes pegaram
      um defeito antes de ele existir para alguém: um prazo muito distante fazia o relógio do
      navegador disparar na hora. Gates: typecheck, lint, build e as duas suítes.
      **O operador testou de novo no navegador (11/10/2026): a troca num clique só funcionou.**
      E pediu um ajuste de texto, feito: no cartão do Anual, "A troca vale na hora." virou "A
      troca é imediata." (`app.faturamento.plano.paraOAnual`).
      **Para a parte 2 do teste:** a assinatura de cortesia do `member@` do computador foi
      encerrada a pedido do operador (11/10/2026). `[FATO — medido]` encerrar uma assinatura de
      100% direto deixa o período inteiro como "pago" (um ano de acesso, no anual); para a
      conta ficar livre, um período de teste de 90 segundos antes de encerrar — só na área
      restrita, com as travas de sempre.
      Feito: o item 0 ("Sair"), a consulta à Stripe, os
      **passos 7, 8 e 10** (todo o servidor) e **os textos das telas, aprovados por ele em
      português** (três blocos, 11/10/2026; já no dicionário, em `app.faturamento.plano`,
      `.cancelamento` e `.banco`).
      As duas decisões dele de 11/10/2026 (cancelar com a cobrança atrasada; limpar ao entrar)
      já estão no código, e os **passos 9 e 11** (as telas de cancelar e de mudar de plano)
      e o **passo 12** estão feitos. **Próximo: o passo 13** — a prova com conta descartável
      e o relógio de teste, a revisão de segurança das telas, os documentos e o fechamento. A tela
      de cancelar avisa quem tem a troca para o Mensal marcada de que ela também será desfeita
      (decisão dele, 11/10/2026; `billing.md` → *Minha assinatura*).
      Nas telas: os endereços `…/faturamento/cancelar` e `…/faturamento/plano` (constantes no
      `core`), os botões no resumo ("Cancelar assinatura", "Manter a assinatura", "Mudar de
      plano", "Continuar no Anual"), a confirmação do banco pelo site (`handleNextAction`, em
      `stripe-do-site.tsx`) na troca de plano e na troca de cartão, e a tela pedindo outra conta
      quando a resposta é `PreviaVencida`. Depois, o 12 e o 13 (com o relógio de teste para a
      virada do anual para o mensal).
      **Antes de publicar:** a P69 (os avisos de dinheiro devolvido e de
      devolução que falhou no endereço de avisos da conta de verdade — condição do reembolso) e
      a P71 (a chave de produção e o Sentry). A revisão de segurança do servidor já foi feita e
      corrigida; a do passo 13 cobre as telas. Nada desta sessão está publicado. A sessão (c)
      começa pela pendência P64.
- [x] **4.6b — A tolerância de 3 dias na cobrança atrasada (código, ALTO RISCO).** Decisão do
      operador de 11/10/2026 (`billing.md` → *Régua de inadimplência*): depois da cobrança que
      falhou, as aulas ficam abertas por **3 dias**, e não mais pela janela inteira de
      tentativas; a Stripe continua tentando, e quem paga (uma tentativa que passa, ou o cartão
      novo) volta a ter as aulas na hora. **Revê a regra do gate de Ago 2026** — `past_due`
      deixa de dar acesso sem prazo. **Antes da etapa 4.7** (até lá só o operador assina).
      O que o passo mexe, para o plano dele (a escrever e aprovar na abertura):
      - **O gate:** `past_due` dá acesso só até 3 dias depois do "pago até" — que, na cobrança
        atrasada, já é o dia em que a renovação falhou (o começo do período não pago). Sem
        migration; a constante no `core`.
      - **Faturamento e Assinatura para quem está atrasado e já SEM aulas:** hoje a tela só
        acha a assinatura que dá acesso — essa pessoa leria "sua assinatura terminou", e não o
        alerta com "Trocar cartão". A busca da assinatura da conta passa a achar a atrasada.
      - **"Reativar assinatura" e a tela de assinar:** para a atrasada sem aulas, o caminho é
        trocar o cartão (que paga a fatura em aberto na hora), não assinar de novo — hoje o
        checkout responderia "você já é assinante".
      - **A sessão:** passar dos 3 dias não gera aviso da Stripe; a aula tranca pelo gate e a
        pessoa continua logada (é o que ela precisa para trocar o cartão).
      - **Cancelar com a cobrança atrasada** (decidido em 11/10/2026: termina na hora): depois
        dos 3 dias a pessoa está sem aulas, e a operação tem que achar a assinatura dela.
      - `CLAUDE.md` → *Membership Gating* (a regra do gate) reescrita no MESMO commit; os testes
        do gate e de ponta a ponta com o aviso; a prova com o relógio de teste da Stripe.
      **FEITO em 12/10/2026, e PUBLICADO no mesmo dia** (`main` = `d469ae7`, com os passos 1 e 2 da 4.6c; ordem do operador: "Publicar tudo"). Respostas do operador na abertura
      (12/10): o comportamento aprovado; a data no aviso de dentro dos 3 dias; a aula trancada
      com texto próprio e "Trocar cartão"; a frase de depois dos 3 dias foi proposta pelo
      agente e aprovada por ele no mesmo dia (o inglês dos três textos fica na pendência P72).
      `Docs check (context7): Stripe → /websites/stripe → a cobrança que falha deixa a
      assinatura em past_due; o que vem depois da última tentativa depende da opção do painel.`
      - **O que entrou:** o gate (`assinaturaDaAcesso`: `past_due` só até 3 dias depois do "pago
        até"), a constante no `core`, `cobrancaAtrasada`, `aulasAbertasAte` e
        `atrasadaSemAcesso` em `acesso.ts` · `assinaturaDaConta` acha a atrasada sem aulas, e a
        leitura devolve `aulasAte` e `aulasTrancadas` (nunca "terminada") · a tela de assinar e
        o servidor (409 `CobrancaAtrasada`) mandam essa pessoa trocar o cartão · a situação e a
        página da aula ganham `atrasada` (resposta só acrescenta campo) · três textos novos no
        dicionário, nos dois idiomas. Sem migration. Cancelar e trocar o cartão acham a
        assinatura depois dos 3 dias sem mudança própria: usam `assinaturaDaConta`.
      - **Testes:** servidor 1080 (eram 1058), site 947 (eram 942). **Mutação:** 39 de 39
        reprovaram. **Duas provas na área restrita**, com o relógio de teste da Stripe e tudo
        apagado ao fim: (i) as funções de verdade — 11 de 11: falha, 2 dias com acesso, 4 dias
        sem acesso com a Stripe ainda tentando, cartão novo paga e o acesso volta na hora;
        (ii) de ponta a ponta, com contas descartáveis no banco de desenvolvimento — 19 pontos:
        o espelho, a sessão, a tela, a recusa de assinar de novo, o acerto de quem pagou, e
        cancelar sem aulas. *(Na primeira rodada um ponto reprovou por comparar a data do
        relógio de teste, um mês à frente, com o relógio de verdade; refeito na hora do relógio
        de teste, passou.)*
      - **A revisão de segurança (12/10/2026): 1 achado importante e 3 menores, os quatro
        corrigidos com teste e mutação.** (1) Os 3 dias contavam do começo do período corrente:
        atrasada por mais de um ciclo, voltariam a cada ciclo. Agora a rotina que grava o
        espelho não aceita data nova de uma atrasada que continua atrasada, e na tela quem diz
        "aulas trancadas" é o gate. (2) O cancelamento automático depois dos 3 dias não desloga
        mais (a pessoa já estava sem aulas): é o esperado, e ganhou testes. (3) Pagou com o
        cartão novo, a sincronia falhou e a conta segue sem aulas: agora é alerta para o
        operador. (4) A frase do alarme do checkout sai da regra do gate, e não de uma lista de
        status à parte. **Achado meu, na releitura:** quem está atrasado, paga numa nova
        tentativa da Stripe e o aviso se perde ficaria trancado — abrir Faturamento e
        Assinatura agora acerta.
      - **Não mudou, de propósito:** o botão da home continua "Reativar assinatura" para essa
        pessoa (leva à tela de assinar, que leva ao Faturamento) · a sessão não cai ao passar
        dos 3 dias · os dois e-mails são da etapa 4.7.
      - **Para saber:** a data do aviso é a do dia em que as aulas trancam, e elas trancam na
        mesma hora em que a cobrança falhou — não no fim desse dia.
- [x] **4.6c — A escola só em português e só para o Brasil: sai o segundo idioma (código + banco + documentos; RISCO ALTO: mexe no banco, na conta e em quase toda tela).**
      **Decisão do operador (12/10/2026):** *"Eu vou implementar a 4.6c […] remover tudo que foi
      feito para dar suporte a inglês e fica a escola 100% nativa em português e restrita ao
      Brasil, assim uma dor de cabeça a menos, e tudo que fizermos de agora em diante fica uma
      língua só"*. Vem de a pesquisa do mesmo dia não ter achado, para empresa do Brasil, quem
      cuide do imposto da venda para fora sem tirar o aluno do site (`billing.md` → *A tela
      pública de assinar*). **Reverte a escola bilíngue de 14/09/2026.** O agente tinha
      recomendado esperar a resposta da Paddle e, se fosse não, só desligar; ele escolheu
      apagar. *Reabre só por decisão dele — e aí é projeto novo, não "religar".*
      **Vem ANTES dos passos 3, 5, 6 e 7 da etapa 4.7** (eles escrevem texto de tela e de
      e-mail); os passos 1, 2 e 4 da 4.7 e o Pix (4.9) não dependem dela.
      **O tamanho** `[MEDIDO em 12/10/2026]`: o idioma aparece em 84 arquivos de código (55 do
      site, 20 do servidor, 7 do `core`) e em cerca de 45 de teste; no banco, a coluna
      `language` em 6 tabelas (`SiteText`, `Testimonial`, `FaqItem`, `Course`, `LearningPlan`,
      `Caption`), o tipo `Language` e `User.preferredLanguage`; o dicionário em inglês tem 531
      linhas.
      **O QUE SAI:** o seletor PT | EN (home, rodapé do app, login) · as páginas `/en` e a
      escolha de idioma pelo navegador · o campo Idioma de curso e de trilha, e as três recusas
      de idioma do servidor · a coluna de inglês em Admin → Textos, FAQ e Depoimentos · o
      filtro por idioma nas listas · o dicionário em inglês (`en.ts`) e a trava de tradução
      faltando · a preferência de idioma da conta · a coluna `language` e o tipo `Language` do
      banco, com as linhas em inglês · o canal do YouTube em inglês no rodapé · `hreflang` e
      `og:locale` do outro idioma · os testes do inglês · as regras do inglês nos documentos.
      **O QUE NÃO SAI** (para a etapa não crescer): **o dicionário em português (`pt.ts`) e o
      `useT()`** — é onde os textos moram e o que Admin → Textos edita; tirar o texto de 100+
      telas de lá não muda nada para o aluno · as migrations antigas (histórico não se edita;
      elas continuam replicando do zero) · o `decisions-archive.md` e o `build-history.md` · o
      canal do YouTube em si (é fora do site).
      **Sem redirecionamento:** os endereços `/en/…` deixam de existir (regra dele de
      29/09/2026: o que não se usa sai; o site nunca abriu ao público, não há link a preservar).
      **As regras da etapa** (do `CLAUDE.md`, aplicadas aqui): um passo por sessão e por commit
      no `dev`, cada um fechado com os quatro gates e publicável sozinho · **a tela para de
      usar antes de o servidor deixar de aceitar, e o servidor para de ler antes de o banco
      perder a coluna** (API aditiva; a versão que está no ar durante a migration não pode ler
      coluna que sumiu) · toda mudança de banco com o Passo 0 (o estado antes e depois) · a
      mutação em cada passo · revisão de segurança (`security-vulnerability-reviewer`) nos
      passos 4 e 5 · **antes de mexer em `components/nav/**`, `components/layout/**` e na
      home, ler o `design-lab/GEMINI.md`**: o seletor de idioma mora em arquivos do
      Antigravity. **Antes de abrir: a P90** (o que existe cadastrado em inglês, e as legendas).
      - [x] **Passo 0 — A fotografia, com o operador (sem código).** *(Feito em 12/10/2026: a contagem do dev está abaixo; o ponto de volta `antes-da-4.6c` está marcado no git. Do site, falta só o operador olhar no admin antes do passo 4, e conferir na Stripe que não há preço em dólar.)* Contar o que existe em
            inglês em cada banco (o do dev e o do site): cursos, trilhas, legendas, depoimentos,
            perguntas e textos. **Curso, trilha e legenda em inglês se apagam PELO ADMIN** (é
            ele que limpa o vídeo e a legenda no Bunny), nos dois bancos, antes do passo 4.
            Conferir na Stripe que não existe preço em dólar criado. Marcar o ponto de volta no
            git (`antes-da-4.6c`). Registrar os números neste item.
            **A fotografia do banco do DEV** `[MEDIDO em 12/10/2026, só leitura]`: cursos 2,
            os dois em português · trilhas 1, em português · legendas 0 · perguntas 15 em
            português e 15 em inglês · depoimentos 5 em português e 4 em inglês · textos
            editados no admin 1, em português. **Nada a apagar pelo admin nem no Bunny no
            dev:** o que existe em inglês são 15 perguntas e 4 depoimentos, que a migration do
            passo 4 apaga. **Do site**, o operador disse no mesmo dia: *"só tem um curso
            cadastrado, quando você remover os campos em inglês a informação some"*; e confirmou
            depois: *"não tem trilha ou legenda em inglês; e na Stripe, não existe preço em
            dólar criado"*. A migration do passo 4 aborta, de todo modo, se achar curso, trilha
            ou legenda em inglês.
      - [x] **Passo 1 — O visitante e o aluno deixam de ver o inglês (site + home).** *(Feito em 12/10/2026, no `dev`; os quatro gates verdes — site 896 testes, servidor 1.073. Mutação: um texto cravado no template reprova o teste novo da home; tirar o filtro de português dos depoimentos reprova o das listas. A "escolha pelo idioma do navegador" nunca chegou a existir no código: nada a tirar. Ficam para o passo 3: o tipo do idioma no `core`, que os formatadores de data e de dinheiro ainda recebem, e a chave `app.footer.erroIdioma` do dicionário, sem uso. Em `public-input.css`, a classe `.lang-atual` ficou sem uso — é do Antigravity.)* Sai o
            seletor PT | EN da home, do rodapé do app e do login (`?lang=`); saem a rota `/en`
            da home e a escolha pelo idioma do navegador; a página passa a dizer sempre
            `lang="pt-BR"`, sem `hreflang`. `useT()` e `useIdioma()` passam a devolver sempre o
            português; `ROTAS_PUBLICAS` fica com um endereço só. As listas param de MANDAR o
            idioma (o servidor ainda aceita). **O teste que segurava "nenhum texto literal no
            template" compara `/` com `/en`** (`home.test.ts`): trocar por um que muda um texto
            no banco e confere a página — sem isso a trava do `CLAUDE.md` fica sem rede.
            Onde: `server/src/views/home.ts`, `routes/home.ts`, `client/src/lib/language.tsx`,
            `Layout.tsx`, `AppFooter.tsx`, `LoginPage.tsx`, `lib/footer.ts`, `lib/navigation.ts`,
            `lib/api.ts`, as páginas de catálogo e `core/src/constants/site.ts`.
      - [x] **Passo 2 — O admin deixa de pedir idioma.** *(Feito em 12/10/2026, no `dev`; os quatro gates verdes — site 893 testes, servidor 1.073. Mutação: tirar da tela o filtro de português reprova o teste de Depoimentos. As telas mandam `language: "pt"` fixo, porque o servidor ainda exige na criação. O formulário de TRILHA do admin não tem campo Idioma: não havia o que tirar. O arquivo do campo virou `CourseLevelField.tsx`. **Textos de tela ajustados pelo agente, por consequência — a conferir pelo operador:** o vazio das duas listas perdeu o "neste idioma" ("Nenhuma pergunta ainda.", "Nenhum depoimento ainda."); a seção "Idioma e Cadastro" passou a "Cadastro", sem a descrição; "Itens Cadastrados" perdeu a descrição "Lista de itens em português"; no passo Legendas, "Legendas em Português · 1 de 3 aulas…" passou a "1 de 3 aulas publicadas com legenda".)* O campo Idioma do curso e da trilha
            (`CourseLanguageLevelFields.tsx` fica só com o nível), a coluna de inglês em Admin →
            Textos (`SiteTextField.tsx`), as abas de idioma de FAQ e Depoimentos
            (`HomeListEditor.tsx`) e o passo Legendas (conforme a P90). O servidor ainda aceita
            o que a tela deixou de mandar.
      - [x] **Passo 3 — O servidor deixa de ler e de aceitar idioma.** *(Feito em 12/10/2026, no `dev`, depois de os passos 1 e 2 irem ao ar; os quatro gates verdes — site 892 testes, servidor 1.057. **O que saiu:** o filtro por idioma do catálogo, das trilhas e da busca · o idioma na criação e na edição de curso, trilha, pergunta, depoimento e texto (o que a versão anterior do site ainda manda é IGNORADO, nunca recusado) · as três recusas de idioma · a rota `PATCH /api/me/language` · o dicionário em inglês (`en.ts`) e o tipo do idioma no `core` · o idioma que os formatadores de data, de dinheiro e de tamanho recebiam no site · o `en` da lista de Admin → Textos. As legendas têm um rótulo só ("Português"). **A migration `20261012170000_idioma_com_valor_padrao`** só põe o padrão `PT` nas seis colunas; aplicada no banco do dev; no de teste, `migrate diff` sem diferença, RLS em todas as tabelas. **Diferente do que este item previa, de propósito (regra da API aditiva):** `lib/language.ts` não saiu inteiro — ficou a conversão que devolve `language` nas respostas de curso, trilha, pergunta e depoimento, porque a versão do site que está no ar ainda lê esse campo; e o endereço antigo `/api/site-text/common/:lang` continua respondendo ao lado do novo, sem idioma. Os dois saem no passo 4. As sobras em inglês do banco (perguntas, depoimentos, textos) não aparecem na home nem no admin. **Testes:** saíram `content-language`, `me-language` e `i18n`; entrou `idioma-saiu.test.ts`. Mutação: tirar o filtro de português da lista do admin, ou do dicionário, reprova. **Chaves que saíram do dicionário, para o operador saber** (duas eram editáveis em Admin → Textos): `home.pricing.priceEn` e `priceEnAnnual` (o preço em dólar), `common.inclui.legendasEn` ("Legendas em inglês") e `app.footer.erroIdioma`. `Docs check (context7): Stripe → /websites/stripe → consultado nesta sessão; no campo do cartão só o idioma foi fixado em "pt-BR", o valor que o português já usava. Bunny → not triggered (o endereço do player não mudou; quem o chama passa "pt" fixo).`)* Saem `lib/language.ts`
            (`idiomaDaLista`), o idioma em `lib/dict.ts`, os filtros em `routes/courses.ts`,
            `trilhas.ts`, `search.ts`, `site-text.ts`, `saved.ts` e `progress.ts`, a troca de
            idioma em `routes/me.ts`, as recusas `LanguageMismatch`, `LanguageLocked` e
            `LanguageInUse`, o `CAN_SUBSCRIBE_EN`, e o idioma dos esquemas do `core`
            (`schemas/content.ts`, `site-text.ts`, `me.ts`). Saem o `core/src/i18n/en.ts` e o
            tipo que obrigava a tradução; `keys.ts` continua. As legendas passam a ter um
            rótulo só. **Para o banco aceitar gravação sem idioma, uma migration põe o valor
            padrão `PT` nas colunas** (elas só saem no passo 4). O `seed-content.ts` acompanha.
            Testes de servidor: saem `content-language`, `me-language` e `i18n`; os outros
            perdem o caso do inglês. **Só depois de os passos 1 e 2 estarem publicados.**
      - [x] **Passo 4 — O banco perde o idioma (migration; revisão de segurança).** *(Feito em
            12/10/2026, no `dev`, depois de o passo 3 ir ao ar; os quatro gates verdes — site
            892 testes, servidor 1.060. **PUBLICADO em 12/10/2026, `main` = `011f53a`** — pelo Antigravity,
            por ordem do operador; a prova está no bloco *Estado atual*.)*
            **A migration `20261012190000_sai_o_idioma`:** PARA se houver curso, trilha ou
            legenda em inglês; apaga as linhas em inglês de `site_text`, `faq_item` e
            `testimonial`; tira a coluna `language` das seis tabelas e o tipo `Language`; a
            chave de `site_text` passa a ser única sozinha, e os índices de perguntas e de
            depoimentos ficam por situação e ordem. **Provas:** aplicada do zero no banco de
            teste, `migrate diff` sem diferença · todas as tabelas com RLS · a única coluna de
            idioma que sobra é `user.preferredLanguage` (passo 5) · a trava, provada com
            tabelas temporárias: com um curso em inglês ela para; só com português, passa.
            **No banco do DEV (Passo 0, contado antes e depois):** antes, 2 cursos e 1 trilha
            em português, nenhuma legenda, 15 perguntas e 4 depoimentos em inglês; depois, os
            mesmos 2 cursos e a trilha, 15 perguntas e 5 depoimentos (os em português), 1 texto
            editado e as 2 contas — a migration aplicada, sem diferença para o schema.
            **O que saiu do código, como o passo 3 tinha deixado anotado:** `lib/language.ts`
            e o `language` das respostas · o endereço antigo `/api/site-text/common/:lang` · os
            filtros `language: "PT"`. **Testes:** `idioma-saiu.test.ts` reescrito (as listas
            ignoram `?lang`; o idioma do pedido é ignorado; nenhuma resposta leva idioma; o
            banco não tem a coluna nem o tipo). **Achado ao limpar os testes:** "recusa uma
            legenda sem dono" passava pelo motivo errado — o banco recusava o campo `language`
            que o próprio teste mandava; agora quem recusa é a regra do dono.
            **A revisão de segurança (12/10/2026): nada que bloqueie; seis pontos menores, os de
            código feitos com teste e mutação.** (1) Não havia mais teste da checagem de status
            da AULA ao adicionar item à trilha — o único tinha saído com os de idioma: entrou em
            `public-reads.test.ts`, com o controle (a aula de um curso no ar entra); tirar a
            checagem do curso publicado reprova. (2) A checagem de dono da trilha pronta nunca
            teve teste: entrou (o aluno não edita, não apaga e não cria módulo — 403). (3) Voltou
            a asserção de que a conta não muda de idioma, até o passo 5. (4) O cabeçalho da
            migration passou a dizer o que acontece se a trava disparar na publicação, e que a
            legenda em inglês apagada pelo admin deixa a faixa "en" no Bunny. **Conferido por
            ela, sem achado:** as leituras públicas continuam só com o publicado, pela cadeia
            inteira; as rotas do admin seguem atrás do `requireAdmin`; nenhuma resposta ganhou
            campo; os esquemas não ficaram mais permissivos; nenhum teste de acesso foi
            afrouxado.
            **O que se sabia antes de publicar** *(registro; a publicação já aconteceu)*:
            (a) **contar antes, no banco do SITE,** só leitura, curso, trilha e legenda em
            inglês (as três consultas da trava). Se a trava disparar na publicação, a migration
            fica marcada como falha lá, e nenhuma publicação seguinte passa até um
            `prisma migrate resolve --rolled-back`;
            (b) **enquanto a migration roda, cerca de um minuto,** a versão que está no ar
            ainda lê a coluna: a home, a página de curso, a de trilha e a de aula dão erro.
            Hoje o público vê o "Em breve" e só ele usa o site;
            (c) **não tem volta pela Railway:** depois da migration, a versão anterior do site
            não funciona mais, e as linhas apagadas só voltam pela janela curta de restauração
            do Neon.
      - [x] **Passo 5 — A preferência de idioma sai da conta (Better Auth; revisão de
            segurança).** Tirar `preferredLanguage` dos campos extras em `lib/auth.ts`, rodar
            `auth:generate`, conferir o diff e reaplicar as notas *REAPLICAR*, e a migration que
            tira a coluna. Passo 0: o admin e o aluno de teste entram antes e depois. context7
            `/better-auth/better-auth` primeiro.
            **Feito em 18/10/2026, em DUAS publicações** (achado da revisão de segurança: com
            tudo junto, uma publicação que falhe depois de apagar a coluna, ou a volta para a
            versão anterior pela Railway, deixaria o login de todos fora do ar até sair outra
            publicação — a versão anterior lê a coluna em toda leitura de conta).
            - [x] **5a — o código para de ler** (no `dev`). Saiu `preferredLanguage` do
                  `auth.ts`, do `auth-client.ts` e do `schema.prisma`; a coluna continua no
                  banco (aceita vazio e tem valor padrão: criar conta segue funcionando, e o
                  Prisma ignora coluna que não declara). `migrate diff` mostra a diferença
                  dessa coluna até o 5b — esperado. **Medido:** o `auth generate` NÃO apaga
                  campo que saiu do `auth.ts` (só acrescenta linhas em branco); a remoção é à
                  mão. **Achado de ferramenta:** `npm --workspace server run auth:generate` FALHAVA
                  (*"createJiti is not a function"*): o `c12`, que lê a configuração, achava na
                  raiz o `jiti` 1 (do Tailwind) e precisa do 2, que só existia dentro do pacote
                  `auth`. Rodado aqui por um desvio fora do repo. **CONSERTADO em 19/10/2026**
                  (ordem do operador: *"conserta o que for necessário"*): o `jiti` 2 entrou nas
                  `devDependencies` da raiz, e o Tailwind ficou com a cópia 1 dele; o comando
                  roda sem desvio, e o schema que ele gera é igual ao nosso. Um ajuste só para o
                  `c12` (`overrides`) não pegou: o `npm` não o aplica a dependência opcional.
                  `better-auth-cli.test.ts` reprova se o `c12` voltar a achar o 1 (mutação: com
                  o lockfile de antes, reprova). O CSS público compilado saiu idêntico. **Teste novo, da revisão de segurança:** o aluno não consegue se
                  promover a admin, se marcar como excluído nem ligar o aceite de e-mail pela
                  rota pronta `POST /api/auth/update-user` (`login.test.ts`, com o controle de
                  que a rota funciona para o nome); tirar o `input: false` do `role` reprova.
                  **Provas:** os dois entram e a sessão não leva idioma (teste novo); com o
                  campo de volta no `auth.ts` e sem a coluna, o login dá 500 (mutação). Os
                  quatro gates verdes. `Docs check (context7): Better Auth →
                  /better-auth/better-auth → additionalFields e o generate (a doc não diz se ele
                  apaga campo; medido).`
            - [x] **5b — o banco perde a coluna** (migration
                  `20261018170000_sai_o_idioma_da_conta`). **Os dois PUBLICADOS em 18/10/2026,
                  nesta ordem:** o 5a em `main` = `80c4478`, o 5b em `main` = `d61962c` (prova
                  no bloco *Estado atual*). Já aplicada no banco do DEV,
                  com o Passo 0: antes e depois, o admin e o aluno entram (200, sessão, papel
                  certo), 2 contas, RLS em todas as tabelas, `migrate diff` sem diferença. No
                  banco de teste, do zero: sem diferença e nenhuma coluna de idioma. Mutação:
                  sem o `DROP`, o teste de colunas reprova. A revisão de segurança não achou
                  nada que bloqueie.
      - [ ] **Passo 6 — Os documentos e a lei de build.** Cada passo acima já corrige, no mesmo
            commit, a linha do `CLAUDE.md` que ele invalida; aqui fica a varredura final: o
            `CLAUDE.md` (a seção *Idiomas* vira um parágrafo — uma língua, um país —, e saem as
            regras do inglês de *Rendering Boundary*, *Auth*, *Indexação*, *Access*,
            *Membership Gating*, *Testing* e do *Document Map*) · o `idiomas.md` (proposta do
            agente: sai do repo, e a decisão fica no `decisions-archive.md`) · `billing.md` (o
            dólar, os 14 dias, os textos em inglês e o registro da pesquisa de 12/10) ·
            `content.md`, `courses.md` ("15 cursos por idioma"), `bunny.md`, `jilsonai.md`,
            `design.md` · **os textos de posicionamento são dele:** `project-description.md`,
            `strategy.md` e `project-scope.md` dizem "bilíngue" e "global" — o agente propõe,
            ele aprova · `design-lab/GEMINI.md` (o Antigravity deixa de produzir inglês) ·
            `pendencias.md` (sai a parte em inglês de cada item) · os itens abertos deste plano
            que citam idioma (o Bloco I, a superfície pública em dois idiomas, o certificado
            no idioma da trilha, o JilsonAI no idioma do aluno). **Fecha com:** a busca por
            `Language`, `/en` e `idioma` no código devolvendo só o esperado, a suíte inteira, e
            o operador conferindo no site: home sem seletor, `/en` fora do ar, admin sem campo
            de idioma.
            **Em partes, um commit cada** (o passo é grande — 15 documentos):
            - [x] **6a — a lei de build** *(19/10/2026)*: o `CLAUDE.md` já estava em dia (cada
                  passo corrigiu a sua linha; falta só o `idiomas.md` no mapa, que sai na 6f);
                  o `GEMINI.md` perdeu as menções ao inglês nos itens; o `tech-stack.md`, o
                  preço em dólar; saiu o script da revisão do inglês
                  (`scripts/gerar-revisao-ingles.mjs` e o `npm run revisao:ingles`), que lia o
                  dicionário em inglês.
            - [x] **6b — `billing.md`** *(19/10/2026)*: as seções do dólar e do imposto de
                  fora viraram uma só, *Só em reais, só para o Brasil*; os 14 dias de reembolso
                  e a promessa "ao mundo" saíram (o código sempre teve só os 7 dias); os
                  rascunhos de texto em inglês saíram dos registros. **A pesquisa de 12/10 e o
                  texto antigo dessas seções desceram verbatim** para o `decisions-archive.md` →
                  *Registros de pesquisa* (o porquê da entrada (28)) — conferido linha a linha:
                  nenhuma linha que saiu ficou sem cópia lá. No código, o comentário de
                  `PRAZO_DO_REEMBOLSO_EM_DIAS` deixou de prometer os 14 dias.
            - [x] **6c — `content.md`, `courses.md`, `bunny.md`, `jilsonai.md`, `design.md`**
                  *(19/10/2026)*: o `courses.md` perdeu o teto "por idioma" (fica o teto de 15), o
                  curso em inglês e o preço em dólar, e a §16 virou *Um idioma só* (a linha do
                  LinkedIn Learning, que é fora do site, ficou como estava); o `content.md`, a
                  copy em inglês e o preço em dólar da página em inglês; o `bunny.md`, a legenda
                  "no idioma do curso" (é `captions=pt`) e os botões em inglês do player; o
                  `jilsonai.md`, a resposta "no idioma do aluno"; o `design.md`, o seletor do
                  rodapé do app.
            - [x] **6d — os itens abertos deste plano que citam idioma, e a `pendencias.md`**
                  *(19/10/2026)*: o Bloco I virou uma lápide (o que ficou e é usado: o dicionário
                  em português); cancelados, com o título riscado, os dois idiomas na superfície
                  pública, os seis itens do dólar e do imposto de fora da Fase 4, o JilsonAI no
                  idioma do aluno e o certificado no idioma da trilha; a vitrine, a home, a
                  legenda, o e-mail e as páginas legais ficaram só em português; os passos da 4.7
                  perderam o "nos dois idiomas"; o caso (16) da matriz de testes saiu. O texto
                  antigo de cada item: `git show e62ec0c:docs/implementation-plan.md`. O bloco
                  *Estado atual* diz que a escola é só em português. Na `pendencias.md`, cada
                  item perdeu a parte em inglês (o texto, o arquivo `en.ts`, o "Reactivate
                  subscription").
            - [x] **6e — os textos de posicionamento** (`project-description.md`,
                  `strategy.md`, `project-scope.md`) *(19/10/2026 — texto proposto pelo agente,
                  **aprovado pelo operador no mesmo dia**)*: *Idioma & foco* e o §9 da
                  estratégia reescritos com a frase dele de 12/10/2026, o que pesou, o caminho até
                  aqui e o gatilho de reabertura; *Quem serve* só o Brasil; saem a frase de marca
                  em inglês, o preço em dólar e o canal do YouTube em inglês como frente da escola
                  (o canal em si é decisão dele — P90); o LinkedIn Learning ficou como estava.
            - [x] **6f — sai o `idiomas.md`** *(19/10/2026)*: apagado do repo; o registro está
                  no `decisions-archive.md` → *Registros de pesquisa*, e o texto inteiro em
                  `git show 8bf1f12:docs/idiomas.md`. Saiu também do mapa de documentos do
                  `CLAUDE.md`. **A única regra que ainda valia lá** — o valor de enum é código e
                  o nome que a tela mostra vem do dicionário (`app.niveis`) — foi para o
                  `CLAUDE.md` → *Key Conventions → Client*. **A busca final no código:** sobram
                  só o código `pt` que o Bunny e a Stripe pedem, comentários que registram o que
                  saiu, os nomes de ícone em inglês (vêm do Lucide e servem à busca do admin) e
                  uma linha de comentário num arquivo do Antigravity (`nav/SecondaryNavItem.tsx`,
                  não está errada). Ao fazer a busca: as funções de legenda do Bunny aceitavam
                  o código `"en"` no tipo — agora só `"pt"` (*Docs check (context7): Bunny →
                  `/bunnyway/documentation` → Stream, o `srclang` da legenda é texto livre: o
                  tipo é só nosso*); uns 25 comentários deixaram de falar em "dois idiomas".
                  **Achado, não mexido:** com um idioma só, `etiquetaEmBreve` (`lib/navigation`)
                  e o `texto` do `EmBreve` escolhem entre duas etiquetas que agora são iguais —
                  código que dá para simplificar, se o operador quiser. Os quatro gates verdes
                  (site 892, servidor 1.066).
                  **Simplificado em 19/10/2026, a pedido dele:** saíram a função e o `texto`; o
                  rail, a gaveta e o nível 2 leem `app.nav.emBreve` direto, e o `EmBreve` também
                  no Dashboard. Nada mudou na tela. O teste que provava "a do admin fica em
                  português" deu lugar a dois de tela (rail e gaveta: a seção planejada do admin
                  leva a etiqueta) — sem eles, a etiqueta podia sumir só das seções de admin.
                  Mutação: 4 de 4 reprovaram.
            - [x] **Fecha a etapa: o operador confere no site** *(19/10/2026)* — o operador,
                  logado: *"não encontrei o idioma na home logada, está correto"*. De fora, o
                  agente: a home diz `lang="pt-BR"`, sem `hreflang` nem link para `/en`, e `/en`
                  mostra o mesmo "Em breve" de qualquer endereço. O formulário de curso sem campo
                  de idioma é garantido pelos testes do admin (`CourseLevelField`).
- [ ] **4.7 — O visitante assina: a conta nasce no pagamento (código, ALTO RISCO).** O checkout
      público: e-mail + pagamento → o webhook cria a conta (o cadastro continua fechado) e manda o
      e-mail de "crie sua senha". **Depende do Resend configurado e da P49** (o remetente). Junto:
      a origem do aluno (UTM) gravada na criação da conta. **Trazido da 4.2 (10/10/2026):** o
      `/assinar` público usa o MESMO formulário da 4.2 (plano + código + cartão), com o campo de
      e-mail · **antes de abrir ao visitante, o limite de tentativas do código promocional** (na
      4.2 só conta logada confere código, e o cadastro é fechado) · os botões Assinar da home
      passam a funcionar sem login.
      **O TESTE COM CARTÃO DE VERDADE é desta etapa** (decisão do operador, 11/10/2026: *"a
      gente testa no 4.7"*): uma vez, no site no ar, antes de abrir ao público, com uma conta
      SEM assinatura (o `member@` de produção tem a de cortesia) — assinar o mensal, mudar para
      o anual e pedir o reembolso dentro dos 7 dias. É o que a área restrita não prova: a
      configuração da conta de verdade, o banco de verdade e o caminho do cartão no site (que
      até hoje só viu o código de 100%). Olhar no painel quanto a Stripe reteve de taxa.
      **Dois e-mails da cobrança atrasada, pedidos pelo operador (11/10/2026):** na falha —
      "não conseguimos renovar; vamos tentar de novo no dia X", com o link para trocar o cartão
      (`…/faturamento/cartao`; a data vem da Stripe, no aviso da cobrança que falhou) — e antes
      de trancar — "se não for pago até o dia Y, você perde o acesso" (Y = 3 dias depois da
      falha: etapa 4.6b). Os textos são dele.
      **Pedido do operador (10/10/2026, depois de testar a 4.2):** *"tem que funcionar também a
      partir do card da home para quem não é cadastrado no site"* — é esta etapa. **A ordem fica
      a do plano** (decisão dele, no mesmo dia: *"Seguir a ordem do plano"*), e o Resend e o
      remetente (P49) se resolvem **com a ajuda do agente, na hora** em que esta etapa abrir.
      **Trazido da revisão de segurança da 4.2 (10/10/2026) — pré-requisitos de abrir ao
      visitante:** (a) o limite de tentativas é **por conta e por IP** (`x-real-ip`) e cobre as
      DUAS rotas que conferem código (`/billing/previa` e `/billing/assinatura`), que também são
      as que chamam a Stripe — **e as três da etapa 4.6** (revisão de segurança de 11/10/2026):
      `GET /billing/minha-assinatura`, `POST /billing/cartao` (poucos pedidos por hora: cada um
      abre um pedido de guardar cartão, e sem limite o site serve para testar cartão roubado) e
      `POST /billing/cartao/aplicar` (numa conta atrasada, cada chamada tenta uma cobrança) — **e as três da sessão (b)**: `POST /billing/minha-assinatura/cancelar`, `…/manter` e `…/reembolso` (cada uma vai à Stripe; a de reembolso lê as faturas e as cobranças), e `GET`/`POST …/minha-assinatura/plano` e `…/plano/desistir` (a de trocar tenta uma cobrança a cada chamada) · (b) **a trava do checkout não pode segurar conexão do banco
      esperando**: vários pedidos juntos esgotariam as conexões e parariam a API inteira — a trava
      que não espera (`pg_try_advisory_xact_lock`) ou a Stripe fora da transação *(a revisão da
      4.4 voltou a apontar, como P1: quem tem a trava ainda pede uma SEGUNDA conexão para ler o
      gate e o cliente — ler os dois pela transação da trava, o que `temAcessoAtivo(id, tx)` já
      permite desde a 4.4)* · (c) **o
      checkout público NUNCA vai ao ar com chave de teste**: o gate não lê `livemode`, e a API não
      fica atrás do "Em breve" — qualquer pessoa assinaria de graça com o cartão `4242` *(desde a
      decisão de 10/10/2026 a produção só tem chaves de verdade: cumprido por construção)* · (d)
      medir na área restrita se criar uma assinatura incompleta com código gasta um uso dele (se
      gastar, trocar de plano várias vezes esgota um código sem pagar nada).
      **Decisão do operador (10/10/2026), que entra aqui porque é esta etapa que traz o envio de
      e-mail:** quando as tentativas de cobrança acabam, a Stripe CANCELA a assinatura (P60: a
      opção do painel) e **a escola manda um e-mail avisando, com o link para reativar**
      (`billing.md` → *Régua de inadimplência*). O link leva à tela de assinar, que já diz
      "Reativar assinatura". **E vale para TODA assinatura cancelada, não só a da cobrança que
      falhou:** *"o sistema envia automaticamente e-mail para o aluno, como a Anthropic faz"*
      (operador, 10/10/2026) — sai sozinho quando o aviso da Stripe chega, sem botão do admin.

      **REVISTO PELA ETAPA 4.6c** *(decisão do operador, 12/10/2026: a escola fica só em
      português e só para o Brasil)*: **os passos 3, 5, 6 e 7 só abrem depois dela**, e
      escrevem texto SÓ EM PORTUGUÊS. Não há campo País, aviso para quem é de fora nem lista de espera. O que continua:
      o CPF ou CNPJ obrigatório, a coluna de resumo, o menu e o rodapé do site. Os passos 1, 2
      e 4 não dependem do idioma e podem andar em paralelo com a 4.6c.

      **OS PASSOS DA 4.7** *(divisão do agente, 12/10/2026, a pedido do operador: "divida em
      passos […] de forma que eu possa ir fazendo 1 por vez")*. Um passo por sessão, um commit
      por passo no `dev`, cada um fechado com os quatro gates; o que estiver fechado não é
      refeito na semana seguinte. O escopo é o do texto acima — aqui só a ordem e o corte.
      Ao abrir cada passo: o plano curto dele, e as perguntas que forem do operador.
      - [x] **Passo 1 — Limite de tentativas nas rotas de cobrança.** Por conta e por IP
            (`x-real-ip`), nas rotas listadas em (a) acima. **Não depende do operador, a não ser
            do ok para o pacote** (dependência nova: o agente propõe `express-rate-limit`, em
            memória — há um servidor só) **e da frase** que a tela mostra a quem passou do
            limite. Pode ser publicado sozinho: só endurece o que já existe.
            *(Da proposta da tela pública, 12/10/2026: quando o passo 5 criar o "Enviar de
            novo" do e-mail de criar a senha, ele entra neste limite — sem isso, o site serve
            para encher a caixa de e-mail de alguém.)*
            **FEITO (19/10/2026), no `dev`.** **Decisões do operador no mesmo dia:** o plano, com
            o pacote (*"Sim, com o pacote"*) — `express-rate-limit@8.7.0`, fixo — e a frase
            *"Muitas tentativas seguidas. Por segurança, espere alguns minutos e tente de
            novo."* (`app.comum.muitasTentativas`), onde a pessoa clica.
            **O que entrou:** `server/src/lib/limite-de-tentativas.ts`, posto nas 12 rotas de
            `/billing` que vão à Stripe, depois do `requireAuth` — as 11 da lista (a) e
            `GET /billing/planos`, que também vai à Stripe a cada vez; o "já tenho acesso?"
            fica de fora. Por conta e o dobro por endereço, cada rota contando à parte: cartão
            e cobrança 5 a cada 15 min e 20 por dia; as outras ações 10; as leituras 60. A
            recusa é 429 `MuitasTentativas` com `Retry-After`, antes de a rota ir à Stripe. No
            site, a frase em 7 lugares (assinar e o código, o cartão, cancelar, manter, mudar
            de plano, desistir da troca). Detalhe: `billing.md` → *Limite de tentativas*.
            **A revisão de segurança** (`security-vulnerability-reviewer`, sobre o diff): **nenhum
            bloqueio; dois P1, corrigidos** — (1) as grafias de `/api` (`/API/…`, `/Api/…`)
            abriam uma contagem cada, até 8× o teto: a chave passou a ser o desenho da rota ·
            (2) a prévia do código se repetia sozinha (voltar à aba, reconectar, voltar a um
            plano visto), e um aluno honesto pararia no limite: não se repete mais. **Os P2:**
            corrigidos — sem um `x-real-ip` válido em produção, não conta por endereço e alerta
            uma vez · o limite por conta montado sem sessão vira erro (não uma contagem de
            todos) · o teto do dia da conta antes dos do endereço · o "desistir da troca" não
            insiste no limite · três testes que faltavam e um que não provava o que dizia ·
            uma guarda para o "zerar as contagens" nunca sair dos testes. **Com destino:** o
            Radar (P91 — conferido pelo operador em 20/10/2026: ativo; a chave dos cartões
            guardados fica desligada) · o teto do dia na prévia e os códigos difíceis de adivinhar
            (passo 4) · o evento com o mesmo Wi-Fi (`billing.md` → *Limitações*) · a tela que
            deixa assinar sem o código quando ele falha (decidido pelo operador em 20/10/2026:
            fica assim — `billing.md` → *A tela pública de assinar*).
            **Testes:** 23 de servidor e 9 de tela. **Mutação:** 31 de 31 reprovaram (20 do
            passo, o `HEAD` e 10 das correções da revisão). Uma suíte de cobrança mudou: um laço de
            `mudar-de-plano.test.ts` (6 trocas num teste) zera a contagem a cada volta. Nos
            testes o limite fica ligado, como em produção; o `test/setup.ts` zera antes de cada
            teste.
      - [x] **Passo 2 — O checkout aguenta muita gente ao mesmo tempo.** O item (b) acima (a
            trava que não espera, e o gate lido pela transação da trava) e a medição do item
            (d) (a assinatura incompleta gasta um uso do código?), com a correção se gastar.
            **Não depende do operador.** Pode ser publicado sozinho.
            **FEITO (19–20/10/2026), no `dev`.** **Decisões do operador:** o plano (*"Sim, pode
            seguir"*, depois de duas explicações com exemplo) e, para o item (d), **a regra dos
            códigos**: desconto parcial sem limite de usos, só com data de validade; limite de
            usos só em código de 100% (`billing.md` → *Códigos promocionais*).
            **O item (d), medido na área restrita com as funções de verdade:** criar a
            incompleta com o código GASTA um uso; cancelá-la (trocar de plano) e deixá-la
            expirar (relógio de teste, 25 h) NÃO devolvem; esgotado, o código fica inativo e a
            tela já diz "não é válido"; criar com ele esgotado é recusado com `param:
            promotion_code` — que o checkout tratava como erro (500) e passou a tratar como
            "código não vale".
            **O item (b):** a trava da conta não espera (`pg_try_advisory_xact_lock`): ocupada →
            409 `Ocupada`, sem ir à Stripe; com a trava, o gate e a decisão pela MESMA ligação
            (`temAcessoAtivo(id, tx)`); o cliente novo da Stripe gravado antes, numa transação
            curta só dele; e a sincronia que o checkout chama passou a não esperar
            (`sincronizarSeLivre`). Para o aluno, só muda o caso das duas abas no mesmo
            instante: a segunda lê "Não foi possível concluir…", e o novo clique segue com a
            mesma assinatura.
            **A revisão de segurança** (`security-vulnerability-reviewer`, sobre o diff): **nenhum
            bloqueio, nenhum P1.** Os P2, corrigidos: (1) a sincronia ocupada respondia
            "ocupada", e a tela diria "não foi possível" a quem pode ter acabado de pagar — agora
            é "já é assinante", que é o que a Stripe disse, e a tela relê o gate · (2) o teste de
            uma ligação só passou a provar a própria premissa, a cobrir a sincronia (a terceira
            transação com trava) e a devolver o endereço do banco · (3) a segunda leitura do
            cliente, já com a trava, ganhou teste (a leitura sem trava "chega atrasada") ·
            (4) a recusa do código na criação deixa uma linha de aviso, com o id do código ·
            (5) a seção dos códigos no `billing.md` lembra o cuidado com o de 100% que não é
            "para sempre". `[FATO — medido]` no Prisma, desfazer um `vi.spyOn` num método do
            banco o deixa vazio para os testes seguintes: o teste troca e devolve a função
            original.
            **Testes:** 4 de rota (os dois cliques, determinístico — o primeiro fica parado com a
            trava; a conta ocupada; a sincronia ocupada; a leitura atrasada), 3 com o banco
            aceitando UMA ligação só (`checkout-uma-ligacao.test.ts`: a premissa, as duas
            transações da conta e a sincronia — com o código antigo, ele reprova) e 5 da recusa
            do código com a biblioteca da Stripe trocada por dublê. **Mutação:** 12 de 12
            reprovaram — inclusive a volta do código antigo (o gate lido fora da trava) e o `tx`
            tirado de dentro da sincronia.
            Gates: build, typecheck, lint, site 902, servidor como o CI 1108.
      - [x] **Passo 3 — O envio de e-mail (Resend).** Com o operador, nos painéis: a conta no
            Resend, o domínio e o remetente (pendência P49). No código: o pacote `resend`, uma
            porta única de envio (com `await` e sem derrubar o pedido — CLAUDE.md → *Membership
            Gating*), o modelo de e-mail e um envio de prova para ele. Sozinho,
            não muda nada para o aluno.
            **FEITO em 20–21/10/2026** (o operador nos painéis do Resend, da GoDaddy e da
            Microsoft, com o agente):
            - **O remetente (P49 — decisões do operador, 20/10/2026):** `Jilson Santana
              <suporte@alunos.jilsonsantana.com>`, e as respostas vão para
              `suporte@jilsonsantana.com` (caixa compartilhada do Microsoft 365, sem custo —
              criada por ele em 21/10/2026, a **P92**). Por um **subdomínio**, para que a fama de spam da escola não
              atinja o e-mail pessoal dele. Domínio, região (São Paulo), registros, DMARC
              (`p=quarantine` só no subdomínio, 21/10), rastreamento desligado e as chaves:
              `tech-stack.md` → *Email*. **A chave de produção nasce no dia de publicar o passo 5**
              (só envio, só o domínio) e vai direto para a Railway.
            - **No código:** `resend@6.32.1`, fixada (ok do operador; a mais nova tinha 4 dias) ·
              o balcão `enviarEmail()` (`server/src/lib/email.ts`, o único que importa `resend`):
              nunca lança, nem ao montar o e-mail · 10 s e desiste · alerta `[email]` com
              `referencia` (ids nossos) e sem destinatário nem conteúdo · só um endereço válido,
              em minúsculas · o endereço da API fixo · `chave` contra e-mail repetido (24 h) ·
              `motivo: "duplicado"` · o modelo `montarEmail()` (`server/src/views/email.ts`) · o
              topo e o rodapé em `app.email` no dicionário (fora de Admin → Textos) · a prévia
              `npm --workspace server run email:previa` · o logo do e-mail,
              `client/public/img/Logomarca-email.png` (recorte do logo do menu da home; só
              aparece no e-mail depois de publicado) · as três regras de chamada no CLAUDE.md →
              *Membership Gating*.
            - **O desenho (decisões do operador, 21/10/2026):** o do site, com o e-mail da Apple
              como referência — o logo oficial centralizado DENTRO do cartão branco, com 120 de
              largura; 660 de largura; as fontes e as cores do site; o botão em pílula azul. O
              rodapé ("Jilson Santana · jilsonsantana.com") foi aprovado junto. **O acabamento
              fino fica com o Antigravity**, quando o operador quiser: instruções no
              `design-lab/GEMINI.md` → *O MODELO DE E-MAIL* (fila, item 37).
            - **Revisão de segurança (20/10/2026):** sem P0. Os dois P1 corrigidos (o alerta não
              dizia QUEM ficou sem o e-mail; a montagem do e-mail podia lançar e derrubar o
              pedido), e os P2 (destinatário validado, assunto sem quebra de linha, endereço da
              API fixo, `tipo` como lista fechada, testes do tempo limite e da porta única). Os
              que são de quem vai chamar o balcão estão no passo 5 e nas regras do CLAUDE.md.
            - **Testes:** 14 do balcão (a biblioteca de verdade, com só a rede trocada por dublê)
              e 10 do modelo. **Mutação: 22/22 reprovaram.** Gates: build, typecheck e lint ok;
              site 902, servidor 1132 (como o CI, sem chave de fornecedor).
            - **A entrega, medida com o e-mail de prova:** iCloud → caixa de entrada; Yahoo →
              lixo eletrônico (o operador marcou "não é spam"); a Microsoft da empresa dele →
              quarentena (`CAT:HPHISH`, com SPF, DKIM, DMARC e compauth todos `pass`);
              mail-tester **10/10**. **A configuração está certa; o que falta é reputação do
              domínio novo** → passo 8.
      - [x] **Passo 4 — A conta nasce no pagamento (servidor, ALTO RISCO).** A rota pública que
            recebe e-mail + plano + código; o aviso da Stripe cria a conta (o cadastro continua
            fechado), liga o cliente da Stripe, grava o espelho e a origem (UTM). Os casos: o
            e-mail já tem conta, o pagamento abandonado, o aviso repetido. Revisão de segurança
            e prova na área restrita. **Depende dos passos 1 e 2.** Não vai ao ar sozinho.
            **Da proposta da tela pública (agente, 12/10/2026 — `billing.md` → *A tela pública
            de assinar*), a resolver ANTES de fechar o que a rota aceita:** **a rota recebe a resposta da caixa
            "quero receber novidades"** (decisão do operador, 12/10/2026: a caixa entra,
            desmarcada) e grava no `marketingConsent` da conta que nasce. **A rota recebe o CPF ou CNPJ, obrigatório**
            (decisões do operador, 12/10/2026: *"colocar CPF logo já resolve"* e *"deixa CPF
            obrigatório e aceita CNPJ"* — `billing.md`). **Não há campo País** (decisão dele no
            mesmo dia, etapa 4.6c: a escola é só para o Brasil); o que restringe é o número
            fiscal brasileiro — o cartão emitido fora era a **P88** (respondida em 21/10/2026: aceito). *Proposta do agente, a
            fechar no plano do passo, com context7:* o número é conferido no servidor e fica
            guardado NA STRIPE, junto do cliente (o número fiscal dela, `br_cpf`/`br_cnpj`) —
            um dado pessoal a menos no banco da escola.
            **E duas coisas que a tela precisa deste passo:** a tela de depois do
            pagamento não tem login — precisa saber que a assinatura valeu sem revelar nada de
            outra pessoa · o que se diz quando o e-mail já tem conta (rascunho: "Este e-mail já
            tem conta. Entre para assinar."; dizer isso revela quem tem conta — a revisão de
            segurança do passo pesa).
            **Da revisão de segurança do passo 1 (19/10/2026), a resolver neste passo:** a rota
            pública ganha um grupo PRÓPRIO no limite de tentativas, por endereço — o grupo por
            conta lança erro sem sessão, de propósito · **pergunta ao operador, antes de a
            prévia abrir ao visitante:** um teto por dia na prévia do código, ou todo código
            difícil de adivinhar e com poucos usos (`billing.md` → *Limite de tentativas*) ·
            conferir no context7 se a Stripe tem um teto de confirmações por pedido de pagamento
            ou de guardar cartão; se não tiver, decidir se o servidor cancela o pedido depois de
            algumas recusas (o teste de cartão pelo campo da Stripe não passa pelo limite).
            **ABERTURA (21/10/2026) — plano aprovado pelo operador ("Sim, pode seguir"), em três
            partes, um commit cada:** **(A)** a ficha de espera do visitante (tabela nova) e a
            conta que nasce dela quando a Stripe diz que o pagamento passou, na mesma transação do
            espelho; o "Conferir na Stripe" do admin passa a achar também quem pagou e não tem
            conta · **(B)** as rotas sem login (planos, prévia do código, assinar, "o pagamento já
            valeu?" — só sim ou não, e só a quem fez aquele pedido), o CPF ou CNPJ conferido pelo
            dígito (inclusive o CNPJ com letras) e guardado só na Stripe, e os limites por
            endereço (10 a cada 15 min e 40 por dia), por e-mail (5 e 20) e de e-mails novos (10
            por dia por endereço); **as rotas ficam fora do ar no site até o passo 8**, por uma
            variável na Railway que o operador liga · **(C)** a prova na área restrita, a revisão
            de segurança, a mutação e os documentos. O teste de cartão direto no campo da Stripe
            fica com a proteção dela (já registrada em `billing.md` → *Limite de tentativas*).
            **As respostas da abertura (operador, 21/10/2026):** e-mail que já tem conta → a tela
            avisa e manda entrar · a prévia do código sem login → teto por dia (40 por endereço) e
            código de 100% difícil de adivinhar · **P88** → aceita qualquer cartão · **P75** → fica
            como decidido em 10/10 (sem bloqueio automático). Registro em `billing.md`.
            - [x] **Parte A — a ficha de espera e a conta que nasce no pagamento.** FEITA
                  (21/10/2026), no `dev`. A migration `20261021120000_ficha_de_espera_do_visitante`
                  (tabela `guest_checkout`, com RLS) — aplicada no banco do dev por `migrate
                  deploy`, com o Passo 0 conferido antes e depois (2 contas com senha, 5 assinaturas,
                  1 cliente, 75 sessões; 27 tabelas, nenhuma sem RLS; `migrate diff` sem diferença).
                  A conta nasce em `pedido-do-visitante.ts`, chamado SÓ pela rotina do espelho, na
                  transação dele; o aviso registra a conta nova pelo id; a tentativa não paga é
                  informação, não aviso; a sincronia devolve `contaNova` (o passo 5 manda o e-mail
                  por ela); o "Conferir na Stripe" do admin confere a ficha do e-mail sem conta.
                  O como e as limitações: `billing.md` → *Assinar sem conta*. **Testes:** 11 de
                  servidor (`conta-do-visitante.test.ts`) e 2 da leitura da Stripe. **Mutação: 14 de
                  14 reprovaram** (sem conferir o pagamento, o cliente, a conta já nascida, o e-mail
                  com conta; o e-mail sem minúsculas; sem ligar o cliente ou marcar a ficha; as
                  novidades com qualquer marca; o admin sem a ficha; "aguardando" como aviso;
                  `contaNova` vazia; nascer admin; o consentimento fixo; o pedido só da assinatura).
                  Gates: typecheck, lint, build; site 902, servidor 1145 (como o CI, sem chave de
                  fornecedor).
            - [x] **Parte B — as rotas sem login.** FEITA (21/10/2026), no `dev`. Em
                  `/api/billing/visitante/`: `planos`, `previa`, `assinatura` e `confirmacao`
                  (`routes/billing-sem-login.ts`), **fora do ar em produção sem
                  `ASSINAR_SEM_LOGIN=true`** (o operador liga no passo 8). O CPF ou CNPJ conferido
                  no `core` (`lerDocumentoFiscal`, inclusive o CNPJ com letras) e guardado só no
                  cliente da Stripe, antes da assinatura. A regra de assinar em
                  `lib/checkout-do-visitante.ts`: o e-mail com conta → `JaTemConta` antes da Stripe;
                  a trava por e-mail que não espera; a tentativa só é reaproveitada com o código
                  dela; a viva na Stripe é sincronizada (a conta nasce) e responde `JaTemConta`.
                  Os limites sem login (por e-mail, por endereço, a prévia com teto por dia e os
                  e-mails novos do dia, que contam clientes criados) e as duas peças que as rotas
                  de quem está logado passaram a dividir (`protecao-da-cobranca.ts`,
                  `vitrine-da-assinatura.ts`). O como e as limitações: `billing.md` → *Assinar sem
                  conta* e *Limite de tentativas*. **Achado no caminho, corrigido antes do
                  commit:** o teto dos e-mails novos, contado na entrada da rota, gastaria o dia do
                  endereço com CPFs errados — passou a contar só o cliente criado. **Testes:** 27
                  de rota (`assinar-sem-login.test.ts`), 8 com a rede da Stripe trocada
                  (`stripe-visitante-rede.test.ts`), 21 do CPF/CNPJ e do pedido
                  (`documento-fiscal.test.ts`) e 5 do que vai à Stripe. **Mutação: 25 de 25
                  reprovaram** — uma delas (a viva sem sincronizar) passou na primeira rodada e
                  mostrou um teste que comparava dois vazios; ele e dois iguais da parte A foram
                  reforçados, e ela passou a reprovar.
            - [x] **Parte C — a prova na área restrita, a revisão de segurança e os documentos.**
                  FEITA (21/10/2026), no `dev`. **A prova** (roteiro fora do repositório, chave de
                  teste, clientes descartáveis apagados no fim): a Stripe aceita o CPF e o CNPJ com
                  ou sem pontuação, **inclusive o CNPJ com letras**, aceita CPF com o dígito errado
                  (o dígito só a nossa conferência pega) e recusa o que não tem forma de número; o
                  fluxo inteiro passou com as funções de verdade (a ficha, reaproveitar com o código,
                  outra tentativa sem ele, o CPF trocado na primeira fatura, pagar com o cartão de
                  teste, a conta nascendo sem senha, o gate, o "já valeu?", o mesmo e-mail depois →
                  já tem conta). **Medido também:** a Stripe CANCELA o pagamento depois de 10 recusas
                  — o servidor não acrescenta teto seu, e o checkout sem login nunca reaproveita o
                  pagamento morto. **A revisão de segurança** (`security-vulnerability-reviewer`,
                  sobre as partes A e B): nenhum P0; **o P1 corrigido** (no máximo 3 "assinar sem
                  login" em andamento: cada um segurava uma ligação do banco enquanto a Stripe
                  respondia, sem teto nenhum); **sete P2 corrigidos** (o número fiscal só muda com a
                  trava e depois de conferir que ninguém pagou · o limite por e-mail conta com o
                  endereço · o assinar com código no mesmo teto do dia da prévia · sem endereço em
                  produção, todos juntos · a mesma recusa com os e-mails novos esgotados · a ficha
                  que virou conta é conta · o teste das grafias do e-mail); **com destino:** a cota
                  da Stripe sob ataque (`billing.md` → *Assinar sem conta*, com gatilho), o RLS no
                  banco de produção e o caixa de ligações (passo 8), as notas do e-mail (passo 5).
                  Detalhe: `billing.md` → *Assinar sem conta* e *Limite de tentativas*. **Testes
                  novos da revisão:** 11 de rota e 1 da leitura da Stripe. **Mutação: 13 rodadas nas
                  correções; duas passaram e mostraram a mesma conferência em dois lugares** — ficou
                  num lugar só, o da trava, e a mutação dela reprova. **Achado FORA do passo,
                  reportado ao operador:** o pagamento morto (10 recusas) também prenderia quem
                  assina LOGADO (`checkout.ts`, desde a 4.2) até trocar de plano ou a tentativa
                  vencer. **Corrigido com a autorização dele, no mesmo dia** (*"Sim, corrija"*), num
                  commit à parte: o novo clique ganha outra tentativa (teste em `billing.test.ts`;
                  a mutação reprova). `Docs check (context7): Stripe → /websites/stripe → o número fiscal do
                  cliente (tax_id_data; a Stripe só confere o formato) e o teto de confirmações de um
                  pagamento (não documentado; medido) · Better Auth → /better-auth/better-auth →
                  criar conta pelo servidor com o cadastro fechado, e a troca de senha cria a senha de
                  quem não tem (conferido também no código da 1.7.5). 3 consultas no passo.`
                  Gates: typecheck, lint, build; site 902, servidor 1209 (como o CI).
      - [x] **Passo 5 — "Crie sua senha".** **FEITO (21/10/2026), no `dev`** — as quatro partes
            abaixo. Com o operador: os textos (P93) e onde os e-mails da prova caíram (P95).
            *(Nasceu como "o e-mail com o link e a tela de definir a senha"; virou o código no
            e-mail na abertura.)*
            **ABERTURA (21/10/2026) — as decisões do operador, uma a uma, e o plano aprovado
            ("Sim, pode seguir"). O passo deixa de ser "o link no e-mail" e passa a ser o CÓDIGO no
            e-mail, "como a Apple e os grandes fazem, mas levando em conta que o meu e-mail como é
            novo ainda pode ser considerado spam […] um misto de velho com novo":** o antigo (entrar
            com e-mail e senha, sem depender de e-mail chegar) e o novo (o código de 6 números).
            (1) **A senha nasce na própria tela de depois do pagamento** — a pessoa já entra para
            estudar; o e-mail não é preciso para começar (o servidor deste passo; a tela, no passo
            6). (2) **O nome não é pedido aqui** (fecha a P83): a pessoa preenche em Minha conta
            quando quiser e, ao pedir o certificado sem nome, aparece na hora a tela para preencher
            (Fase 6.5). (3) **"Esqueci minha senha" entra junto, com CÓDIGO de 6 números** — vale 10
            minutos, 3 tentativas; digitado na mesma tela, com a senha nova (o antivírus de e-mail
            das empresas não estraga código, e estraga link de uso único). (4) **O e-mail não é
            confirmado na hora de pagar**: fica confirmado na primeira vez que a pessoa usa um código;
            **novidades e ofertas só vão para e-mail confirmado**. *(Ajustada pela P94, no mesmo
            dia: a senha criada logo depois de pagar também deixa o e-mail confirmado — o código é
            só mais uma forma de entrar, e a senha continua valendo. Com isso, o "e-mail confirmado"
            do login não prova mais que a caixa é da pessoa, e as novidades precisam de confirmação
            própria: P96.)* (5) **Trocar a senha pelo código
            desconecta os outros aparelhos.** (6) **Na tela de entrar, além de e-mail e senha, o botão
            "Receber código de acesso"**: o campo da senha vira o campo do código, a pessoa recebe o
            código e entra — sem criar senha nova na hora. **Entrar por código nunca cria conta** (a
            conta continua nascendo só no pagamento). (7) **O e-mail de boas-vindas** sai quando a
            conta do visitante nasce: confirma a assinatura e diz como entrar.
            **Sai da proposta:** o "Enviar de novo" na tela de depois do pagamento (o "Receber código
            de acesso" cobre quem fechou a tela) e o link de criar a senha.
            **As partes, um commit cada:** **(1)** o código no e-mail (servidor): o recurso pronto do
            Better Auth (`emailOTP`, sem pacote novo), o e-mail do código pelo nosso balcão, os
            limites (por e-mail 3 por hora e 6 por dia; por endereço 10 a cada 15 min) · **(2)** a
            senha logo depois de pagar (só quem pagou naquela tela, só sem senha, até 24 h depois de
            a conta nascer; já entra) e o e-mail de boas-vindas (tenta de novo no próximo aviso da
            Stripe se falhar) · **(3)** as telas: "Esqueci minha senha" e "Receber código de acesso"
            na tela de entrar, e a tela do código com a senha nova; os textos são rascunho do agente
            · **(4)** a prova, a revisão de segurança, a mutação e os documentos, com um e-mail de
            cada tipo para o operador ver.
            - [x] **Parte 1 — o código no e-mail (servidor).** FEITA (21/10/2026), no `dev`. O
                  `emailOTP` do Better Auth 1.7.5 (sem pacote novo): 6 números, 10 minutos, 3
                  tentativas, guardado só o resumo (`hashed`), **`disableSignUp: true` também nele**
                  (sem isso, entrar com código criaria a conta de qualquer e-mail — medido no código);
                  trocar a senha pelo código desconecta os outros aparelhos
                  (`revokeSessionsOnPasswordReset`) e confirma o e-mail; o código cria a primeira
                  senha de quem não tem. **Pedir código só por `POST /api/conta/codigo`**
                  (`routes/conta-codigo.ts`), a mesma resposta exista a conta ou não, com os limites
                  do plano (por e-mail, de qualquer endereço, 3 por hora e 6 por dia; por endereço,
                  10 a cada 15 min); as rotas do recurso de pedir código, e as de link e de troca de
                  e-mail, desligadas (`disabledPaths`); gastam o código as do Better Auth
                  (`/sign-in/email-otp`, `/email-otp/reset-password`). O e-mail do código
                  (`lib/codigo-por-email.ts`) pelo balcão, para o endereço do banco; os textos são
                  **rascunho do agente** (`app.email.codigo`), para o operador revisar com os das
                  telas (parte 3). **Testes:** 15 (`codigo-por-email.test.ts`). **Mutação: 12 de 13
                  reprovaram na primeira rodada** — a que passou era a trava de não criar conta (o
                  nosso e-mail já não saía para e-mail sem conta, e o teste não enxergava o código
                  gerado); o teste passou a enxergá-lo, e ela reprova. Uma é equivalente (o destino
                  pelo e-mail digitado ou pelo do banco é o mesmo texto, porque a busca é exata em
                  minúsculas).
            - [x] **Parte 2 — a senha logo depois de pagar e as boas-vindas (servidor).** FEITA
                  (21/10/2026), no `dev`. `POST /billing/visitante/senha` (com o código da tentativa;
                  só a conta que nasceu daquele pagamento, com acesso, sem senha, até 24 h; abre a
                  sessão; o e-mail não fica confirmado) e o e-mail de boas-vindas (depois de qualquer
                  sincronia, uma vez, com a marca na ficha — migration
                  `20261021180000_boas_vindas_da_ficha`, aplicada no banco do dev com o Passo 0
                  conferido antes e depois; nunca derruba o aviso; o botão só com https em produção,
                  e a subida do servidor alerta). O tamanho da senha (8 a 128) no `core`, o mesmo do
                  Better Auth. Os textos das boas-vindas são rascunho do agente. Detalhe:
                  `billing.md` → *Assinar sem conta* → *Depois de pagar*. **Testes:** 9 da senha, 7
                  das boas-vindas e 1 do código (a senha curta). **Mutação: 17 de 18 reprovaram**; a
                  que passou é equivalente (a leitura antecipada da marca só poupa consultas — quem
                  impede o segundo envio é a tomada da marca).
            - [x] **Parte 3 — as telas.** FEITA (21/10/2026), no `dev`. **A tela de entrar**
                  (`LoginPage`, recomposta: a moldura `MolduraDeAcesso` com as MESMAS classes de
                  antes, e as formas de entrar em `components/acesso/`): e-mail e senha como antes,
                  **"Receber código de acesso"** (pede o código para ENTRAR — só com o e-mail válido
                  —, e o campo da senha dá lugar ao do código, com "Pedir outro código" e "Entrar com
                  senha") e **"Esqueci minha senha"**, que leva o e-mail já digitado (no estado da
                  navegação, nunca no endereço). **A tela da senha nova** (`/esqueci-minha-senha`,
                  `EsqueciMinhaSenhaPage`): o e-mail; depois o código e a senha nova (nunca aparada;
                  8 a 128, do `core`); criada a senha, a pessoa entra com ela e vai para o Início (se
                  a entrada não abrir, para a tela de entrar). Quem entra pelo código também começa
                  do zero (o cache limpo). As falhas: o código recusado (400/403), o excesso (429, a
                  frase das tentativas) e a queda de rede dizem coisas diferentes. O cliente do
                  Better Auth ganhou o `emailOTPClient`; pedir o código é pela nossa rota
                  (`pedirCodigo`). Os textos são **rascunho do agente: P93**. **Testes:** 23 de tela
                  (`LoginPage.codigo.test.tsx`, `EsqueciMinhaSenhaPage.test.tsx`), e os 22 de antes da
                  tela de entrar passam sem mudar. **Mutação: 14 de 16 na primeira rodada** — uma é
                  equivalente (o campo de e-mail do navegador já tira os espaços das pontas) e a outra
                  mostrou dois testes que achavam a frase da vez anterior; separados, ela reprova.
            - [x] **Parte 4 — a prova, a revisão de segurança e os documentos.** FEITA
                  (21/10/2026), no `dev`. **A prova dos e-mails:** um de cada tipo (o código de
                  entrar, o da senha nova e as boas-vindas) para os três endereços do operador
                  (Yahoo, iCloud e Microsoft), pelo caminho de verdade (`auth.api.sendVerificationOTP`
                  e `mandarBoasVindasDaAssinatura`, com contas, fichas e assinaturas descartáveis no
                  banco do dev, apagadas no fim — o banco igual antes e depois): os 9 entregues ao
                  Resend. Onde caíram: **P95** — *respondida pelo operador em 29/10/2026: os 9 na caixa de entrada
                  (Yahoo, iCloud e jilson@), e também os 2 da prova do Pix desse dia ("está acabando" e "terminou", no
                  Yahoo)*. **A revisão de segurança**
                  (`security-vulnerability-reviewer`, sobre as partes 1 a 3): nenhum P0. **Os P1:**
                  (1) **corrigido** — quem guardasse a tentativa voltaria à conta depois que a dona do
                  e-mail a confirmasse (o Better Auth apaga a senha de antes da confirmação na
                  primeira entrada pelo código, e a rota deduzia o "uma vez" da linha de senha):
                  agora a tentativa não cria senha com o e-mail confirmado (`EmailConfirmado`), e a
                  vez fica marcada na ficha (`senhaCriadaEm`, migration
                  `20261021220000_senha_da_ficha_uma_vez`); (2) **a primeira entrada pelo código numa
                  conta de e-mail não confirmado APAGA a senha e desconecta os aparelhos** — do
                  Better Auth 1.7, documentado, sem opção para desligar. O que é de engenharia,
                  corrigido: as contas do seed nascem confirmadas, e a de admin que já existe fica
                  confirmada pela migration `20261021220100_admin_com_email_confirmado` (só dados; no
                  ar, roda na publicação) — sem isso, o primeiro código apagaria a senha de admin. **O
                  efeito no aluno foi ao operador (P94), e ele decidiu no mesmo dia:** *"a pessoa cria a
                  senha normal e quando entrar com o código é só mais uma opção de acesso"* — **a senha
                  continua valendo**. Por isso a senha criada depois de pagar também deixa o e-mail
                  confirmado, e a entrada pelo código não apaga nada (o risco que ele aceitou e o
                  gatilho: `billing.md` → *Depois de pagar*); (3) a chave das boas-vindas é por conta
                  (`boas-vindas/<conta>`), não por evento — a regra (2) do `CLAUDE.md` foi emendada: o
                  mesmo e-mail sai de três gatilhos, e uma chave por evento não seguraria a repetição
                  entre avisos diferentes. **Os P2:** corrigidos — a senha criada com a sessão que não
                  abre vira alerta (`console.error`), e o teste do "começa do zero" depois da senha
                  nova · com destino — o resumo da tentativa e as regras dela no navegador (passo 6),
                  a cota do Resend (passo 8) · aceitos, com gatilho: `billing.md` → *Depois de pagar*.
                  `Docs check (context7): Better Auth → /better-auth/better-auth → a entrada pelo
                  código numa conta de e-mail não confirmado apaga a senha e as sessões (plugin
                  email-otp e guia da 1.7), e o caminho indicado é a senha nova pelo "esqueci minha
                  senha" (conferido também no código da 1.7.5). 1 consulta, refeita depois do resumo
                  da sessão.` **Passo 0 das migrations no banco do dev:** antes e depois, as 2 contas,
                  as senhas (conferidas com o `.env`), as sessões, as fichas e as assinaturas iguais;
                  a de admin com o e-mail confirmado; 27 tabelas, nenhuma sem RLS; `migrate diff` sem
                  diferença. **Testes:** 8 de servidor e 1 de tela. **Mutação: 5 de 5 reprovaram**
                  (sem as duas conferências do e-mail confirmado; sem a marca da vez; o alerta como
                  aviso; o seed sem confirmar; a tela sem limpar o cache). Gates: typecheck, lint,
                  build; site 928, servidor 1250 (e os 3 arquivos do passo como o CI, sem chave).
            **Da revisão de segurança do passo 4 (21/10/2026), para este passo:** não depender só
            do `contaNova` da sincronia — ele sai uma vez, e se o servidor cair entre a gravação e
            o envio, ninguém recebe o e-mail e nada alerta (a reentrega do aviso já não diz
            "conta nova") · o link: de uso único e curto, só para o `User.email` lido do banco,
            enviado depois do commit, nunca no registro · marcar `emailVerified` quando a pessoa
            criar a senha · o `reset-password` do Better Auth 1.7.5 já cria a conta de senha que
            falta (`password.mjs:163`) · **as novidades só depois de o e-mail verificado**: quem
            marcou a caixa foi quem pagou, que pode não ser o dono do e-mail.
            **Pergunta para a abertura:** "Esqueci minha senha", na tela de entrar, usa o mesmo
            mecanismo — entra junto? **Depende dos passos 3 e 4.**
            **Da proposta da tela pública (agente, 12/10/2026):** a tela de definir a senha
            pede também o nome, que vai no certificado (**P83**) · a tela de depois do pagamento
            tem "Enviar de novo" para quando o e-mail não chega — a rota é deste passo, dentro
            do limite do passo 1.
            **Do passo 3 (20–21/10/2026):** o e-mail sai por `enviarEmail()` com as três regras
            de chamada do CLAUDE.md (depois do commit e fora de trava; `chave` =
            `<tipo>/<event.id>`, com o token do link gravado antes e REAPROVEITADO na reentrega;
            `para` lido do nosso banco e `referencia` com os ids) · o tipo do e-mail entra na
            lista `TipoDeEmail` · **o endereço base do link é conferido na SUBIDA do servidor**
            (https em produção — a revisão de segurança lembrou que um `BETTER_AUTH_URL` sem
            `https://` faria o e-mail não sair) · a chave de produção do Resend vai para a
            Railway na publicação deste passo · **pergunta ao operador na abertura:** o aluno
            cria a senha **na própria tela de depois do pagamento**, sem depender do e-mail para
            entrar? O e-mail viraria confirmação, e cair no spam deixaria de impedir a matrícula
            (o que o passo 3 mediu no Yahoo e na Microsoft). Tem prós e contras a pesar com ele,
            com a revisão de segurança.
      - [ ] **Passo 6 — A tela pública de assinar e os botões da home.** O mesmo formulário da
            4.2 com o campo de e-mail, a confirmação para quem acabou de pagar ("enviamos um
            e-mail para você criar a senha") e os botões Assinar da home sem login.
            Os textos são do operador. **Depende dos passos 4 e 5.**
            **Do passo 4 (21/10/2026):** a resposta `MuitosAoMesmoTempo` (o servidor atende 3
            "assinar sem login" de cada vez) mostra **"Aguarde um instante e tente novamente."**
            (`app.assinar.aguardeUmInstante` — texto do operador, no mesmo dia, para a pessoa não
            clicar de novo em seguida); o `Ocupada` (o mesmo e-mail em duas abas) é outro caso.
            **Da revisão de segurança do passo 5 (21/10/2026):** (a) **a tentativa abre a conta**
            (cria a primeira senha e a sessão, por até 24 h): nunca vai no endereço — nem
            `?tentativa=`, nem no `return_url` da Stripe —, fica só na memória da página ou no
            `sessionStorage`, sai dali depois de criada a senha, e a senha se cria só por POST;
            (b) **guardar só o resumo da tentativa** (SHA-256) na ficha e no `metadata` da
            assinatura da Stripe, e buscar e comparar pelo resumo — **FEITO na 6b (27/10/2026)**; (c) **as recusas da senha** que a tela mostra:
            `NaoConfirmado`, `PrazoVencido`, `EmailConfirmado` (a dona do e-mail já entrou pelo
            código: a senha agora é pelo "Esqueci minha senha"), `JaTemSenha`, `Ocupada` — os textos
            são do operador.
            **A PROPOSTA DA TELA** *(agente, 12/10/2026, depois de o operador mostrar as telas
            de pagamento da Udemy e do Code with Mosh)* **está em `billing.md` → *A tela pública
            de assinar*:** os blocos em ordem, os textos, o que a Stripe exige
            (endereço não) e o que fica de fora. **Antes de construir: P80 (o que existe na
            tela) e P81 (os textos).** **A P80 foi respondida em 27/10/2026** (`billing.md` →
            *O que existe na tela*): entram o "Já tem conta? Entrar", a linha dos Termos e a lista
            "O que está incluído"; o link para as perguntas frequentes não (o rodapé já tem); e as
            duas telas ficam iguais. **A P81 também, no mesmo dia:** os textos aprovados (os da
            tela, os de depois do pagamento e as recusas da senha do item (c) acima) estão na
            tabela de `billing.md` e entram no `pt.ts` com a construção. Do operador, em 12/10: o formulário de quem está
            logado *"está ótimo porque já está funcionando"* — é a base, sem refazer — e o
            desconto do anual continua à vista (*"é um atrativo"*). **DECISÃO dele (12/10/2026):
            a tela leva o menu de cima e o rodapé do site, como as outras páginas públicas, e o
            formulário entra no meio** (*"o check out entra no content"*) — recusa o topo só com
            o logo que o agente tinha sugerido. O que a proposta acrescenta
            ao formulário: "Já tem conta? Entrar" · três linhas
            junto do botão (a renovação, o reembolso, o pagamento seguro) e a dos Termos ·
            a lista "O que está incluído" · o link para as perguntas frequentes · a tela de
            depois do pagamento para quem ainda não tem senha.
            *Convenções de engenharia:* a lista "O que está incluído" lê a MESMA chave do
            cartão da home (`home.pricing.features`, com as edições do admin) — duas listas
            divergem · as linhas novas valem para as duas telas, porque o formulário é um só (P80,
            27/10/2026) · o valor da linha de renovação é o do
            servidor; com código promocional, se a prévia não der o valor da renovação, a linha
            sai sem valor — nunca conta feita na tela.
            **Acrescentado em 12/10/2026, na mesma conversa:** o **CPF ou CNPJ**, obrigatório,
            entra no formulário, que é o mesmo das duas telas (a pública e a de quem está
            logado) · a **coluna de resumo** com o total de hoje, a renovação, o reembolso e o
            pagamento seguro — **decisão dele, 12/10/2026** ("Certo"); revê, na tela pública, a
            decisão de 10/10 de mostrar "Hoje você paga" só com código (e na tela logada também:
            P80, 27/10/2026) ·
            **antes de desenhar o campo do CPF, MEDIR na área restrita o que o campo da Stripe
            já pede sozinho**, com um cartão de teste do Brasil: a doc diz que o campo de
            pagamento cuida do número fiscal de comprador da América Latina, e dois campos de
            CPF na mesma tela é o erro a evitar. **CANCELADOS no mesmo dia, pela etapa 4.6c:**
            o campo País e o aviso com "Avise-me" para quem é de fora (chegaram a ser decididos
            e saíram quando ele tirou a venda para fora do projeto). **Só em português.**
            **O PLANO DO PASSO 6, APROVADO pelo operador em 27/10/2026** (um commit por parte;
            *Docs check (context7):* Stripe → `/websites/stripe` → o campo de pagamento não pede
            o CPF numa conta do Brasil, e mandá-lo nos dados do cartão é proibido — o CPF vai na
            ficha do cliente (medido, `billing.md`); Better Auth → `/better-auth/better-auth` →
            antes de mexer na tela de entrar, na 6e):
            - [x] **6a — O CPF também na assinatura de quem está logado (servidor).**
                  `POST /api/billing/assinatura` recebe o CPF ou CNPJ e o grava na ficha do
                  cliente da Stripe com a trava, antes de a assinatura nascer (`checkout.ts`,
                  reaproveitando `acertarNumeroFiscal`); se o número mudou, a incompleta antiga
                  não é reaproveitada; a recusa da Stripe é 400 `DocumentoInvalido`; quem a Stripe
                  diz que já assina não tem a ficha mexida. 7 testes novos em `billing.test.ts`;
                  mutação (reaproveitar com o CPF trocado · não gravar · recusa virar 500 · mexer
                  na ficha de quem já assina): as quatro reprovam. **Opcional no servidor nesta
                  publicação** (a API só acrescenta), e a tela sempre manda.
            - [x] **6b — Só o resumo (SHA-256) da tentativa no banco e na Stripe** (servidor +
                  migration). `lib/tentativa-do-visitante.ts` (gera e resume); a ficha
                  (`GuestCheckout.tentativa`) e os dados da assinatura na Stripe guardam o resumo;
                  a confirmação e a senha buscam pelo resumo; a migration
                  `20261027130000_resumo_da_tentativa` troca as linhas que existiam (sem DDL —
                  `migrate diff`: *No difference detected*, no banco de teste recriado do zero).
                  Testes: `resumo-da-tentativa.test.ts` (a migration, e a ficha em claro que não
                  abre nada) e os do visitante e da senha comparando com o SHA-256 calculado à
                  parte. Mutação (a ficha em claro · a Stripe em claro · a confirmação e a senha
                  buscando em claro · a migration sem efeito): as cinco reprovam.
            - [x] **6c — A página `/assinar` do servidor**, com o menu e o rodapé da home (sem
                  mudar o HTML dela) e o app montado no meio só com o formulário; com a venda sem
                  login desligada, nada muda para o visitante. O menu, o rodapé e as fontes saíram
                  de `home.ts` para `views/partes-do-site.ts` (a home renderizada nas 4 variantes
                  saiu IGUAL, caractere a caractere); `views/assinar.ts` + `routes/assinar.ts`
                  (logado → `/aluno/assinar`; venda desligada → `/login`; em dev, só pelo Vite);
                  `lib/etiquetas-do-app.ts` (as etiquetas do `index.html` do app: o montado em
                  produção, o do Vite em dev); o proxy do Vite ganhou `/assinar`; no app, a rota
                  fora do `Layout` e `naPaginaDoServidor()` (todo link vira carregamento normal, e
                  os pedaços do aluno não são baixados ali). Nesta parte a tela mostra os planos
                  (carregando, erro e sem planos). Testes: `pagina-de-assinar.test.ts`,
                  `etiquetas-do-app.test.ts`, `AssinarSemLoginPage.test.tsx` e os de `versao`.
                  Mutação (logado sem desvio · venda desligada abrindo · o CSS do site antes do
                  app · o menu sem o caminho da home · o menu sem escape · dev sem desvio para o
                  Vite · o app trocando por dentro): as sete reprovam. *O menu na `/assinar` leva
                  às seções da home (`/#cursos`…), o mesmo destino do menu dela.*
            - [x] **6d — As partes novas do formulário, nas duas telas**: Seus dados, a coluna de
                  resumo, "O que está incluído" e os textos aprovados no `pt.ts`. O formulário
                  dividido (`FormularioDeAssinatura` + `CampoDoDocumento`, `ResumoDaAssinatura`,
                  `OQueEstaIncluido`, `BotaoComCartao`): o CPF ou CNPJ conferido pelo `core` antes
                  do cartão e do servidor, e no pedido; o "Total de hoje" sempre na coluna (sai o
                  "Hoje você paga"), a renovação com o valor do servidor — com código, sem valor —,
                  o reembolso, o pagamento seguro, o botão e os Termos (links em outra aba); a lista
                  e a frase da home vêm com os planos (`incluido`, com as edições do admin —
                  `vitrine-da-assinatura.ts`). A tela logada já tem tudo; a pública ganha o
                  formulário na 6e. *Nesta parte só entra o que é das DUAS telas: o e-mail, o
                  atalho "Já tem conta? Entrar" e as novidades são do visitante (6e).* Testes: 6
                  novos e os de antes ajustados (`AssinarPage.test.tsx`, 43) e o da lista com as
                  edições do admin (`billing.test.ts`). Mutação (sem conferir o CPF · o CPF fora do
                  pedido · a renovação com valor mesmo com código · o total ignorando o código · a
                  recusa do servidor virando erro geral · os Termos na mesma aba · a lista que nunca
                  aparece · a lista sem as edições do admin): as oito reprovam.
            - [x] **6e1 — O visitante assina** *(a 6e foi em duas partes, para caber)*: na
                  `/assinar`, o formulário inteiro no modo sem login (o e-mail com "Já tem conta?
                  Entrar", o CPF, as novidades desmarcadas, os planos e a prévia pelas rotas do
                  visitante, a origem do UTM quando guardada); **a tentativa só na memória e no
                  `sessionStorage`** (`lib/tentativa-de-assinar.ts`), guardada ANTES de o cartão
                  confirmar, nunca no endereço de volta da Stripe; a do mesmo e-mail segue no novo
                  clique; as recusas (`JaTemConta` embaixo do e-mail, `Ocupada`,
                  `MuitosAoMesmoTempo`, `DocumentoInvalido`); depois do pagamento, a tela de
                  concluído carrega inteira. "Já tem conta? Entrar" → `/login?depois=assinar` →
                  `/aluno/assinar` (`destinoDepoisDeEntrar`: lista fechada; o resto vai ao Início).
                  Os botões Assinar da home, para o visitante, levam à `/assinar` — só com a venda
                  sem login ligada. Testes: `AssinarSemLoginPage.test.tsx` (12), `LoginPage.test.tsx`
                  (8 novos, com destinos de fora indo ao Início) e `home.test.ts`. Mutação (a
                  tentativa não guardada · a tentativa no endereço de volta · a tentativa de outro
                  e-mail seguindo · sem conferir o e-mail · o "já tem conta" virando erro geral · a
                  prévia pela rota logada · o destino vindo do endereço · o botão da home sem a trava
                  da venda): as oito reprovam.
            - [x] **6e2 — A tela de depois do pagamento** (`/assinar/concluido`): confirma, pede
                  a senha, entra e vai ao Início; as recusas; sem tentativa guardada, a tela de
                  entrar. A página do servidor é a mesma da `/assinar` (`pagina: "concluido"`: fora
                  do Google, sem o título "Assinar"; logado → `/aluno/assinar/concluido`), e o proxy
                  do Vite a cobre. No app, `AssinaturaConcluidaSemLoginPage` + `CriarSenhaDepoisDePagar`:
                  a confirmação pela tentativa desta aba a cada 2 s, com o "demorando"; a senha
                  (`senhaNovaSchema`, os avisos de `senhaNova`) por POST com a tentativa; entrou → a
                  tentativa esquecida e o Início; a entrada automática falhou → o botão Entrar; as
                  recusas com os textos aprovados (as que encerram esquecem a tentativa e levam à tela
                  de entrar; `NaoConfirmado` e `Ocupada` mantêm o formulário); falha sem motivo → a
                  frase da tela de entrar; o contato do suporte (`EMAIL_DE_SUPORTE`, no `core` — o
                  e-mail usa o mesmo). Testes: `AssinaturaConcluidaSemLoginPage.test.tsx` (11) e
                  `pagina-de-assinar.test.ts` (3 novos). Mutação (sem tentativa e sem ir ao login · a
                  senha antes de confirmar · a tentativa guardada depois de entrar · a recusa que
                  encerra guardando a tentativa · o "não confirmado" virando falha geral · sem
                  perguntar de novo · o concluído no Google · o logado indo à tela errada): as oito
                  reprovam.
            - [x] **6f — Prova e revisão**: `security-vulnerability-reviewer`, mutação, prova no
                  banco de dev com conta descartável e cartões de teste, a tela olhada em dev.
                  **FECHADA em 27/10/2026, e o passo 6 publicado no mesmo dia** (`4951b03`, revisão
                  `jilson-prod-00042` — o *Estado atual*).
                  - [x] **A revisão de segurança** (27/10/2026): nenhum P0; um P1 e três P2.
                  - [x] **O P1 corrigido** *(decisão do operador, no mesmo dia: "10 por cópia")*: com 1
                        processador, cada cópia tinha 3 ligações com o banco, e 3 assinaturas esperando
                        a Stripe ocupavam todas (a aula de quem paga esperava). Agora 10 ligações por
                        cópia (`LIGACOES_POR_COPIA`, `lib/ligacoes.ts`), e um teto único de assinaturas
                        em andamento — com e sem login —, as ligações menos 2 (`lib/assinaturas-em-
                        andamento.ts`; cheio → 409 `MuitosAoMesmoTempo`, e a tela logada também diz
                        "Aguarde um instante e tente novamente."). Testes (o teto do visitante, o do
                        logado, as ligações) e mutação (o teto que nunca enche · o logado fora do teto ·
                        nenhuma ligação livre · de volta a 3 ligações · a tela logada sem a frase): as
                        cinco reprovam.
                  - [x] **Os três P2 corrigidos** *(decisão do operador, 27/10/2026: "Corrijo os três
                        agora")*: (1) o pedido de quem está logado SEM o CPF só segue se a ficha do
                        cliente já tiver um (`temNumeroFiscalDoBrasil`); sem nenhum, 400
                        `DocumentoInvalido` — fecha o "assinar sem CPF chamando o servidor direto" até
                        o CPF virar obrigatório no servidor (o checkbox abaixo continua); (2) reaproveitar
                        a incompleta compara o número com que a FATURA dela foi fechada
                        (`numeroFiscalDaFatura`, lido de `latest_invoice.customer_tax_ids`), não o da
                        ficha de agora — nos dois caminhos, logado e visitante; (3) a recusa "já tem
                        conta" deixa uma linha `[api]` no registro com o endereço só como marca
                        (`marcaDoEndereco`, a mesma cifra das contagens — sem IP nem e-mail), o que torna
                        visível o gatilho de reabertura do oráculo de e-mail. Testes novos nos dois
                        caminhos e na função pura; mutação (sem CPF e sem ficha assinando · o logado e o
                        visitante reaproveitando sem olhar a fatura · a leitura sem o número da fatura ·
                        a recusa sem linha · o IP em claro · a rota sem a recusa): as sete reprovam.
                  - [x] **Os dois achados reportados no plano, corrigidos** *(pedido do operador,
                        27/10/2026)*: (1) **a origem do visitante (UTM) se perdia na home** — página do
                        servidor, sem o app; agora a home grava a origem com o MESMO registro do app
                        (`SCRIPT_DA_ORIGEM` e `CHAVE_DA_ORIGEM`, `core/src/constants/origem.ts`; o
                        `attribution.ts` usa a mesma chave), e o teste do app executa o script e confere
                        que o app lê o que ele gravou; (2) **o proxy do Vite** perdeu o `/en` e passou a
                        aceitar a raiz com `?utm_…` (antes, em dev, a home com a origem caía no React).
                        Mutação (outra chave · outro formato · sobrescrever o primeiro acesso · a home sem
                        o script): as quatro reprovam.
                  - [x] **A prova no banco de dev** (27/10/2026, a migration da 6b aplicada lá antes):
                        16 de 16 — o visitante assina com CPF, a tentativa só como resumo na ficha e na
                        Stripe, o CPF na ficha do cliente (`br_cpf`), o pagamento com cartão de teste, a
                        conta nascendo pela sincronia, a confirmação, a senha criada e o acesso, a
                        repetição recusada (`JaTemSenha`), e o logado com CNPJ (`br_cnpj`); o banco
                        voltou ao retrato de antes.
                  - [x] **A tela olhada em dev pelo operador** (27/10/2026: *"ficou bom pode publicar
                        depois ajustamos com o Antigravity"*): o acabamento visual fica para a 6g.
            - [x] **6h — O botão Assinar por último, como a Udemy** *(decisão do operador, 27/10/2026,
                  depois de olhar a tela no ar — `billing.md` → *O que existe na tela*, item 6)*: no
                  resumo, os Termos antes e o botão por último; "O que está incluído" à esquerda,
                  depois da escolha do plano; o código onde estava. Nas duas telas (o formulário é um
                  só). Teste de ordem (`AssinarPage.test.tsx`); mutação (os Termos depois do botão · a
                  lista de volta à direita): as duas reprovam.
            - [ ] **6g — O ACABAMENTO VISUAL das telas de assinar, pelo Antigravity** *(pedido do
                  operador, 27/10/2026: passar ao Antigravity com um passo a passo; o Claude confere)*.
                  **Só visual** — nada de texto, comportamento, rota ou teste.
                  1. Da `dev`, abrir o branch `acabamento-assinar`. Ligar `npm run dev:server` e
                     `npm run dev:client` e abrir pelo Vite: `http://localhost:5173/assinar`
                     (visitante) e `http://localhost:5173/aluno/assinar` (logado com o member@).
                     Para ver a `/assinar/concluido`: no DevTools, em `sessionStorage`, gravar
                     `jilson.assinar.tentativa` = `{"tentativa":"x","email":"a@b.com"}` — aparece o
                     "Confirmando sua assinatura…".
                  2. Acabar as duas colunas (formulário à esquerda, com "O que está incluído" logo
                     depois dos planos; à direita, o resumo com o botão POR ÚLTIMO — 6h, como a Udemy;
                     no celular, uma coluna só, nesta ordem; não mudar a ordem) e os componentes
                     novos: `client/src/components/assinar/` (`FormularioDeAssinatura`,
                     `CampoDoDocumento`, `DadosDoVisitante`, `ResumoDaAssinatura`, `OQueEstaIncluido`,
                     `CriarSenhaDepoisDePagar`) e `client/src/pages/AssinaturaConcluidaSemLoginPage.tsx`.
                  3. Na página do servidor (`server/src/views/assinar.ts`) mexer só nas classes da
                     parte do título; texto sai do dicionário e passa por `escapeHtml` (não trocar).
                     **Atenção:** ali o CSS do site (`/css/public.css`) vem DEPOIS do CSS do app, e vence
                     nas regras do `body` e dos títulos — se o formulário sair com cara errada, ajustar
                     em `client/src/public-input.css`, só para `body[data-pagina-do-servidor]`, e
                     remontar com `npm --workspace client run build:css`.
                  4. Não mudar: textos, o que é botão ou link e para onde leva, `aria-*`, a ordem dos
                     campos. Os quatro gates verdes (`typecheck`, `lint`, `test`, `build`), conferidos
                     pelo código de saída. Commit no branch e **parar**: sem merge na `dev` nem na
                     `main` — o Claude confere o diff e faz o merge na `dev`.
            - [x] **Depois da publicação com a 6a:** o CPF passa a ser OBRIGATÓRIO no servidor
                  (`assinarSchema`, `core/src/schemas/billing.ts`) — tira o "sem o CPF ainda
                  assina" e o teste dele.
                  **FEITO (28/10/2026), no `dev`:** sem o CPF, 400 `ValidationError` antes de
                  qualquer ida à Stripe; saíram o caminho "sem o CPF, com um número na ficha"
                  (`temNumeroFiscalDoBrasil` e o desfecho `sem-documento`) e o teste dele; a
                  incompleta só se reaproveita com o número da fatura igual ao do pedido, sempre.
                  Testes: o novo "sem o CPF ou CNPJ: 400, e nada vai à Stripe"; os pedidos dos testes
                  levam um CPF (`billing.test.ts`, `checkout-uma-ligacao.test.ts`,
                  `limite-de-tentativas.test.ts`). Mutação (o CPF opcional de novo · reaproveitar sem
                  olhar o número da fatura): as duas reprovam.
      - [x] **Passo 7 — Os e-mails automáticos da assinatura.** A cobrança que falhou (com a
            data da próxima tentativa), o aviso antes de trancar e a assinatura cancelada (com
            o link para reativar). Os textos são do operador. **Depende só do passo 3** — pode
            vir antes dos passos 4 a 6. **Questão em aberto, para a abertura:** o aviso "antes
            de trancar" sai num dia em que a Stripe pode não mandar aviso nenhum, e a escola não
            tem fila nem agendador (CLAUDE.md → *Background Jobs*); as saídas são dizer as duas
            datas num e-mail só, na falha, ou pendurá-lo numa nova tentativa da Stripe.
            **DECISÕES DO OPERADOR (28/10/2026), cada uma à pergunta do agente:** (a) **dois e-mails
            na cobrança que falhou — um na falha e outro 1 dia antes de trancar —, com um agendador**
            (o agente recomendou um e-mail só, com as duas datas, sem agendador; ele escolheu os dois)
            — fecha a questão em aberto acima; as outras tentativas da Stripe não mandam e-mail;
            (b) **o de cancelada sai só no fim de uma assinatura que foi paga**: o fim do período de
            quem cancelou, as tentativas que acabaram, o reembolso, o cancelamento pelo painel — e
            nunca para quem desistiu no meio do primeiro pagamento.
            **O PLANO DO PASSO 7, APROVADO pelo operador em 28/10/2026** (*"Aprovo o plano"*). Um
            commit por parte. *Docs check (context7):* Stripe → `/websites/stripe` → a data da
            próxima tentativa é o `next_payment_attempt` da fatura (vazio quando as tentativas
            acabam; com as automações da Stripe ele não vem no aviso da falha, por isso se lê na
            fatura buscada na hora) · o aviso `customer.subscription.deleted` sai no cancelamento
            direto e no fim do período de quem cancelou, com o motivo (`cancellation_details.reason`)
            — 2 consultas.
            - [x] **7a — Os três e-mails e a regra de quando cada um sai** (servidor + migration).
                  UMA regra (`server/src/lib/avisos-da-assinatura.ts`) olha a assinatura como a Stripe
                  diz agora: atrasada, antes do último dia → "a cobrança falhou" (com a data da
                  próxima tentativa, da Stripe, e o link para trocar o cartão); atrasada, no último dia
                  antes de trancar → "antes de trancar" (com o dia em que tranca: `aulasAbertasAte`, a
                  mesma conta da tela); já trancada → nada (o de cancelada vem no fim das tentativas);
                  cancelada (`canceled` — nunca a que expirou sem pagar) → "assinatura cancelada", com
                  o link para reativar. **Uma vez cada:** uma tabela nova (`subscription_email`, com
                  RLS) marca o e-mail tomado — a assinatura, o tipo e a falha a que ele se refere —;
                  o envio que falha desmarca, e a vez seguinte tenta de novo; a chave do Resend é o id
                  da marca. **Quem chama:** o aviso da Stripe, depois do commit, em todo aviso da
                  assinatura (como as boas-vindas), e a rodada do agendador (7b). **Os links:** trocar
                  o cartão → `/login?depois=cartao` (um destino novo na lista fechada da tela de
                  entrar, que leva a Faturamento → cartão; quem já está logado vai direto); reativar →
                  `/login?depois=assinar` (já existe). **Os textos** no `pt.ts` (`app.email`, fora de
                  Admin → Textos), com o rascunho aprovado pelo operador antes. Testes: os três casos,
                  as janelas de data, uma vez cada, o envio que falha e volta, a expirada e a sem dono
                  sem e-mail, o aviso da Stripe chamando, a migration do zero. Mutação.
                  **FEITO (28/10/2026), no `dev`.** A regra (`lib/avisos-da-assinatura.ts`:
                  `emailDevido` e `avisarSobreAAssinatura`), a montagem sem banco
                  (`views/email-da-cobranca.ts`), a migration `20261028120000_emails_da_assinatura`
                  (`subscription_email`, com RLS — no banco de teste recriado do zero: *No difference
                  detected*, nenhuma tabela sem RLS), a data da próxima tentativa e o motivo do fim lidos
                  na assinatura buscada (`proximaTentativa`, `encerradaSemPagamento`), o destino
                  `cartao` na lista do `core` (`DESTINOS_DEPOIS_DE_ENTRAR`, que a tela de entrar e os
                  e-mails usam) e o aviso da Stripe chamando a regra depois do commit. **Os textos:**
                  rascunho do agente, **conferidos pelo operador em 28/10/2026 nos e-mails de verdade da
                  prova 7c — uma frase trocada por ele** (a do e-mail da falha: "Você continua tendo
                  acesso às aulas até o dia…"); P107 fechada. A prévia (`email:previa`) grava os quatro. Testes: `avisos-da-assinatura.test.ts`
                  (16), `stripe.test.ts` (2) e `LoginPage.test.tsx` (2, e os nomes que não viram
                  destino). Mutação: 14 de 14 reprovaram (o último dia que nunca chega · a trancada
                  que manda · sem a marca · a marca que não volta · a cancelada com dias pagos · a
                  expirada que manda · o aviso sem a regra · a data da fatura paga · nunca "sem
                  pagamento" · a frase da data passada · a conta excluída · sempre "terminou" · a data
                  sem o fuso, em UTC como o CI · a tela de entrar sem o cartão). Gates: typecheck,
                  lint, build; site 993, servidor 1361 (como o CI). **Até a 7b, o "antes de trancar"
                  só sai se um aviso da Stripe chegar no último dia.**
                  **Revisto na revisão da etapa (28/10/2026 — os achados, abaixo do passo 8):** a
                  cancelada com dias pagos não deve nada AINDA (na função pura — deve quando o período
                  acaba); a marca fica PENDENTE até o Resend confirmar (`sentAt`) e, pendente há mais de
                  15 min, é retomada pela vez seguinte (A7 — quem a tomou caiu no meio; a chave do Resend
                  impede o dobro); a conta que cancelou e já assinou de novo, e a excluída, CONSOMEM a
                  marca sem e-mail (P1 — senão a rodada voltaria a elas toda hora, e a antiga mandaria
                  "reative" no dia em que a nova atrasasse).
            - [x] **7b — A rodada de hora em hora (o agendador).** Um comando do servidor
                  (`server/src/tarefas/avisos-da-cobranca.ts`): as assinaturas atrasadas e as
                  canceladas nos últimos 3 dias que ainda não receberam o e-mail devido, conferidas uma
                  a uma na Stripe (`sincronizarSeLivre`) e passadas à regra da 7a; sai sozinho no fim.
                  **No Google Cloud** (o mapa já previa: *Cloud Scheduler — o aviso antes de trancar*;
                  o agente roda os comandos com o OK do operador): ligar o Cloud Scheduler; um Cloud Run
                  **Job** `jilson-prod-avisos`, com a MESMA imagem e a mesma conta do site
                  (`jilson-site`), como o das migrations; uma tarefa do Scheduler, de hora em hora, que
                  executa esse job. A publicação (`deploy.yml`) passa a atualizar a imagem do job
                  junto. **Por que um job, e não uma rota no site:** nenhuma porta nova na internet,
                  nenhuma senha nova e nenhuma biblioteca nova — quem pode executar o job é só a conta
                  do agendador. **Custo:** o Scheduler usa 1 das 3 tarefas grátis da conta de
                  faturamento (depois, US$ 0,10 por tarefa ao mês, sem cobrança por execução — página
                  do Google, 28/10/2026); o job, ~720 execuções de segundos por mês: centavos `[a
                  conferir]`. O `CLAUDE.md` (*Background Jobs*) e o mapa do `tech-stack.md` registram a
                  peça nova, com o gatilho de reabertura.
                  **FEITO (28/10/2026), no `dev`.** A rodada (`rodadaDosAvisos`, em
                  `lib/avisos-da-assinatura.ts`: a atrasada com as aulas abertas, a cancelada há pouco e
                  a cancelada com dias pagos cujo período acabou; pula, sem ir à Stripe, o que já saiu)
                  e o comando do job (`server/src/tarefas/avisos-da-cobranca.ts`: o alerta liga antes de
                  carregar o resto, e sai com `process.exit`). **No Google Cloud, criados pelo agente com
                  o OK do operador (28/10/2026, *"Pode criar"*):** o Cloud Scheduler ligado; a conta
                  `jilson-agendador`; o job `jilson-prod-avisos` (us-east4, a imagem no ar e a conta
                  `jilson-site`, sem nova tentativa, 5 min, 4 chaves: banco, Stripe, Resend, Sentry); no
                  job, `jilson-agendador` com Cloud Run Invoker e `jilson-publicacao` com Cloud Run
                  Developer (como no das migrations — sem ele, a publicação quebraria); a tarefa
                  `jilson-prod-avisos-de-hora-em-hora` (`0 * * * *`), **PAUSADA**; no GitHub, a variável
                  `GCP_AVISOS_JOB_NAME`. A publicação (`deploy.yml`) atualiza o job antes do serviço.
                  Testes: 7 da rodada e 1 que confere o comando na publicação. Mutação: 7 de 7
                  reprovaram (sem as atrasadas · sem pular o que já saiu · sem conferir na Stripe · uma
                  falha que para a rodada · a cancelada sem a janela do período · sem a cancelada de
                  agora há pouco · a publicação com outro comando).
                  **Depois da publicação (no passo 7c):** retomar a tarefa do agendador
                  (`gcloud scheduler jobs resume jilson-prod-avisos-de-hora-em-hora --location=us-east4`),
                  forçar uma rodada (`gcloud scheduler jobs run …`) e conferir no registro do job a linha
                  `[avisos] a rodada terminou`. **FEITO em 28/10/2026, depois da publicação `c12b0cd`**
                  (revisão `jilson-prod-00045`): a tarefa retomada (`ENABLED`), a rodada forçada às 14:19
                  UTC, a linha no registro (0 conferidas, 0 falhas) e o monitor ligado no job.
                  **Revisto na revisão da etapa (28/10/2026):** a rodada só LÊ a cancelada na Stripe
                  (`buscarAssinatura`), sem regravar o espelho — regravar renovava o `updatedAt` que a
                  escolheu, e ela voltava toda hora (P1); a consulta ignora a conta excluída; a
                  assinatura que a Stripe não conhece é aviso, contada em `desconhecidas`, não alerta a
                  cada hora (P2); e a rodada para pelo prazo (`PRAZO_DA_RODADA_EM_MS`, 240 s dos 300 do
                  job), adiando o resto para a próxima hora com um aviso (P2). Testes: 7 novos
                  (`avisos-da-assinatura.test.ts`, 31). Mutação: 10 de 10 reprovaram (a cancelada com
                  dias pagos já devendo · sem consumir, nos dois casos · a rodada regravando a cancelada ·
                  qualquer marca resolvendo · tomar sem retomar · o envio sem confirmar a marca · a
                  desconhecida virando alerta · sem o prazo · a consulta sem excluir a conta excluída).
            - [x] **7c — Prova e revisão:** na área restrita, com o relógio de teste da Stripe (a
                  falha e a data da próxima tentativa, o dia antes de trancar, o cancelamento depois das
                  tentativas, a expirada sem e-mail); no banco de dev; os e-mails olhados pelo operador
                  no Gmail e no Outlook. A revisão de segurança entra na revisão da etapa inteira.
                  **FEITA em 28/10/2026 — 20 de 20 pontos**, com as funções de verdade, 3 contas
                  descartáveis no banco de dev (a migration aplicada lá antes; nenhuma tabela sem RLS) e
                  um relógio de teste da Stripe: a renovação que falha (cartão `pm_card_chargeCustomerFail`)
                  → atrasada, com a próxima tentativa lida da fatura e o e-mail da falha na hora, uma vez;
                  no último dia, a rodada mandou o "antes de trancar"; a Stripe cancelou a atrasada entre 10
                  e 17 dias depois da falha e o e-mail "foi cancelada" saiu; a cancelada a pedido, no fim do
                  período, recebeu "terminou"; a que expirou sem pagar, nada; a rodada seguinte não repete
                  nada; o banco voltou ao retrato de antes. `[FATO — medido]` o relógio de teste ACEITA
                  começar no passado (40 dias atrás) — é o que deixa o "pago até" do espelho no passado de
                  verdade, e a regra do gate (relógio do servidor) ver a cancelada sem aulas ·
                  `cancellation_details.reason` vem `payment_failed` no cancelamento pelas tentativas ·
                  `next_payment_attempt` veio ~2 dias depois da falha. **Os 4 e-mails de verdade** foram ao
                  Yahoo (3) e ao iCloud (1) do operador — são os textos da P107 para ele conferir. **A
                  revisão da etapa** (segurança + geral) está abaixo do passo 8.
                  **Depois da publicação (28/10/2026, `c12b0cd`):** o agendador retomado e a primeira
                  rodada no registro do job (7b) — o passo 7 está inteiro no ar.
            **Fora do passo:** o e-mail no clique de cancelar (decisão (b)) · um e-mail a cada nova
            tentativa (decisão (a)) · o aviso de renovação do plano anual.
      - [ ] **Passo 8 — O teste com cartão de verdade e a abertura ao público.** O teste do
            operador no site no ar (mensal → anual → reembolso), olhando a taxa da Stripe. Antes
            de abrir: as pendências P58 (o nome na fatura — **fechada em 28/10/2026**:
            `JILSONSANTANA.COM`, `billing.md` → *O nome na fatura*) e P60 (a opção do painel) — a P91 (o
            Radar) fechou em 20/10/2026, a P75 (o limite do reembolso) em 21/10/2026 **e a P60 em
            28/10/2026** (a conta de verdade em "cancelar", Smart Retries 8× em 2 semanas, os e-mails
            da Stripe desligados — `billing.md` → *Régua de inadimplência*) —, a cópia do banco
            (Fase 7) e a revisão de segurança da etapa inteira. A publicação é ordem dele.
            **A REVISÃO DA ETAPA INTEIRA — FEITA em 28/10/2026** *(pedido do operador: dois revisores em
            paralelo no Fable 5.1, esforço máximo — o `security-vulnerability-reviewer` e um revisor
            geral —, sobre os 25 commits de código da 4.7, passos 1 a 7; só leitura)*. **Nenhum P0;
            nenhum P1 fora da 7b do mesmo dia.** Os achados e o destino de cada um *(decisões do
            operador no mesmo dia: "O P1 e os P2 (a) e (c)"; "A3, A5, A6, A4 e A7 agora; A2 vira
            pendência")*:
            - **P1 (segurança) = A1 (geral)** — a rodada voltava toda hora à cancelada de quem já assinou
              de novo (e à da conta excluída), e mandaria "reative" no dia em que a nova atrasasse →
              **corrigido** (`f059df9`, a 7b).
            - **P2 (a)** — a assinatura que a Stripe não conhece alertava a cada hora → **corrigido**
              (`f059df9`).
            - **P2 (b)** — o job da rodada roda com a conta do site (`jilson-site`), como o das migrations;
              o revisor sugeriu uma conta só dele, com acesso só às 4 chaves → **fica assim** *(decisão do
              operador, 28/10/2026)*. *Reabre se o site ganhar um papel novo no Google Cloud, ou se um
              incidente mostrar o job como caminho.*
            - **P2 (c) + A7** — o job de 5 min podia morrer no meio, e a marca tomada sem envio nunca saía
              → **corrigidos** (`f059df9`: o prazo da rodada; a marca pendente, retomada depois de 15 min).
            - **A2** — a tela de depois do pagamento insiste a cada 2 s mesmo com 429/5xx, sem frase
              própria → **P108** → **corrigido em 29/10/2026** (frase sugerida, aprovada pelo operador no mesmo
              dia: *"Não conseguimos confirmar agora. Seu pagamento não se perde: entre com "Receber código de
              acesso" ou tente de novo em alguns minutos."* — `app.assinar.naoConfirmouAgora`): a pergunta
              respeita o `Retry-After` do servidor (`esperaDaProximaConferencia`) e, depois de 3 recusas
              SEGUIDAS (`RECUSAS_ATE_O_AVISO`), a frase entra no lugar do "demorando" — **e na hora, na recusa que
              pede espera** (ajuste do operador no mesmo dia: o servidor pede até 15 min, e 3 recusas assim seriam
              ~30 min de "Confirmando…"); qualquer resposta zera a conta, e a pergunta continua. Testes: `assinar.test.ts` (+2), `AssinaturaConcluidaSemLoginPage.test.tsx`
              (+2). **Mutação: 3 de 3 reprovaram.**
            - **A3** — o CPF ia para a ficha da Stripe ANTES de o laço descobrir a tentativa paga no meio
              (os dois checkouts) → **corrigido** (reordenado; teste nos dois caminhos).
            - **A4** — documentos velhos: a seção *Limite de tentativas* do `billing.md` (contagem em
              memória, `x-real-ip`, Railway, "3 em andamento", sem a rota da senha) e dois comentários
              "provisório até a G4" → **reconciliados**. *O sub-item "o `pedacos.test.ts` não existe" era
              alarme falso: existe.*
            - **A5** — três telas de acesso navegavam com `navigate()` direto → **`useIrPara()`**, que
              ganhou `substituir` (o "voltar" não volta ao formulário de entrar).
            - **A6** — um assert de teste que não podia falhar → **tirado**.
            **O que os dois conferiram e acharam sólido** (resumo): o webhook (corpo cru, idempotência,
            a trava, o 200 só no fim); a conta que nasce só na sincronia, com acesso pela regra do gate;
            `disableSignUp` nos dois lugares e as rotas de pedir código desligadas; a tentativa só como
            resumo e nunca no endereço; a senha depois de pagar uma vez; preço, cliente, assinatura e
            conta nunca do navegador; os limites (no banco, com HMAC); RLS em toda tabela nova; os 30
            textos aprovados (P81) iguais no `pt.ts`; nenhum texto cravado; `escapeHtml` no template.
            **O que não puderam conferir** (fora do repositório — ficam para o passo 8): a IAM do Google,
            o RLS no banco de produção (o SQL abaixo), o painel da Stripe (P60; um endpoint de webhook só;
            os e-mails da própria Stripe desligados) e a prova 7c.
            **A venda sem login foi LIGADA em 27/10/2026, antes da abertura** *(decisão do operador:
            "quando a escola estiver pronta é só tirar o aviso")*: `ASSINAR_SEM_LOGIN: "true"` em
            `deploy/cloud-run.yaml`, para ele testar tudo no site no ar, atrás do "Em breve". No dia de
            abrir, basta tirar o aviso. A API não fica atrás do aviso — o risco, aceito por ele, e o
            gatilho estão em `billing.md` → *Assinar sem conta*.
            **Da revisão de segurança do passo 4:** depois de publicar, rodar no banco de produção
            o SQL de RLS do `CLAUDE.md` (a tabela `guest_checkout` é nova — esperado: zero linhas) ·
            conferir com o operador o tamanho do caixa de ligações do banco na Railway
            (`connection_limit` na `DATABASE_URL`, que hoje não tem): é dele que depende quanto
            os 3 "assinar sem login" em andamento ocupam. **FEITOS:** o SQL de RLS rodado no banco de
            produção em 28/10/2026 (só leitura, depois da publicação `c12b0cd`): **zero linhas**, com
            `guest_checkout`, `limite_de_tentativa` e `subscription_email` · o caixa de ligações: **10
            por cópia** desde a 6f (decisão do operador, 27/10/2026 — `lib/ligacoes.ts`), e o teto de
            assinaturas em andamento é as ligações menos 2, com e sem login.
            **Da revisão de segurança do passo 5 (21/10/2026):** depois de publicar, conferir no
            mesmo banco que a conta de admin ficou com o e-mail confirmado (a migration
            `20261021220100_admin_com_email_confirmado` roda na publicação) — antes disso, não usar
            "Receber código de acesso" com ela **(FEITO: conferido em 24/10/2026 — o *Estado atual*)** ·
            **a cota do plano do Resend contra o pior caso**: o
            teto de códigos é por caixa (6 por dia), não da escola — N contas somam N × 6, e com a
            cota esgotada códigos e boas-vindas falham para todos até o dia seguinte (só os alertas
            `[email]` mostram).
            **Da proposta da tela pública (agente, 12/10/2026):** antes de abrir, também os
            Termos de Uso e a Política de Privacidade no ar (a tela de assinar aponta para os
            dois; hoje são pendência da Fase 7 e a P61) — **e a página de contato (`/contato`):
            desde 28/10/2026 o painel da Stripe aponta o suporte para ela, e os termos e a
            privacidade para `/termos` e `/privacidade`** (`billing.md` → *O nome na fatura*) · a **P84** (o cartão promete o JilsonAI
            e o Pix, que ainda não existem) · a resposta da FAQ sobre nota fiscal já trocada por
            ele no admin (decisão de 12/10/2026: "sempre que solicitada").
            **A entrega dos e-mails (do passo 3, 21/10/2026):** antes de abrir, medir de novo
            onde o e-mail cai — no **Gmail e no Hotmail/Outlook.com de OUTRA pessoa** (os testes
            do passo 3 foram para caixas do próprio operador, com o nome dele no remetente e no
            destinatário), no Yahoo e no mail-tester (o DMARC do subdomínio deve sair verde; em
            21/10 o verificador dele ainda lia o registro antigo). Até lá, **aquecer o domínio**:
            e-mails de verdade para quem abre e responde, e "não é spam" quando cair no lixo.
            **Medido em 28/10/2026, nos 3 e-mails da cobrança da prova 7c, no Yahoo:** "não
            conseguimos renovar" e "ainda não foi paga" na **entrada**; "foi cancelada" no **spam**
            (o operador marcou "não é spam"; os três ficaram na entrada). Mesmo remetente, mesmo
            domínio, um minuto entre eles — a diferença é o conteúdo ("cancelada", "reativar"), não a
            configuração. O do iCloud ("terminou"): a confirmar com o operador.
- [ ] **4.7b — Admin → Assinaturas vira um PAINEL de assinaturas (código, ALTO RISCO).**
      **MAPA APROVADO pelo operador (10/10/2026: "Aprovo o mapa"), e fica para DEPOIS da 4.7**
      (decisão dele no mesmo dia: *"o Painel pode ficar para depois da 4.7 que é mais
      importante"*). O mapa abaixo foi proposto pelo agente a pedido dele; o plano de cada
      sessão ainda é mostrado a ele antes de programar, como em todo bloco. *(Nasceu como "4.4b";
      mudou de número ao mudar de lugar.)*
      **O pedido (operador, 10/10/2026, depois de usar a tela da 4.4):** *"achei pouco funcional
      […] Eu quero uma tela funcional e não só saber como está a assinatura"* · *"pode ser um mini
      sisteminha administrativo sem precisar ficar indo na Stripe para gerenciar assinaturas e
      problema dos alunos e que no futuro o JilsonAI possa resolver me avisando o que fez quando
      for relevante para não ter prejuízos financeiros"*.
      **Já decidido por ele (10/10/2026), e vale para esta tela:** assinatura cancelada → o admin
      **envia ou copia o link** para o aluno reativar, e é o aluno quem paga · cancelar não corta
      o acesso já pago; **dentro dos 7 dias**, cancelar devolve o dinheiro e corta o acesso na
      hora (`billing.md` → *Reembolso*) · quando as tentativas de cobrança acabam, a Stripe
      cancela (P60).
      **O MAPA — o que faz sentido ter:**
      1. **A lista.** Todas as assinaturas, a mais recente primeiro: o aluno (nome e e-mail), o
         plano (mensal ou anual), a situação, até quando está pago (ou a próxima cobrança) e o
         código promocional, se houver. **Filtros:** Ativas · Vão cancelar · Pagamento atrasado ·
         Canceladas · Aguardando o primeiro pagamento · Todas. **Busca** por e-mail ou nome. No
         topo, quantas há em cada situação.
      2. **"Precisa de atenção"** — o filtro que abre primeiro: pagamento atrasado · quem pagou e
         está sem acesso · assinatura paga sem conta na escola (etapa 4.7) · pedido de reembolso.
      3. **O detalhe de uma assinatura** (ao clicar): as cobranças, uma por linha (data, valor,
         paga, falhou ou devolvida — e o **motivo da falha** como a Stripe diz: cartão recusado,
         sem saldo, vencido) · o cartão em uso (bandeira e os 4 últimos números, nunca o cartão) ·
         desde quando assina · o que já foi feito nesta assinatura, e por quem.
      4. **As ações, conforme a situação:**
         - **Ativa** → Cancelar no fim do período (continua assistindo até o fim do que pagou) ·
           Cancelar e devolver o dinheiro (só dentro dos 7 dias; corta o acesso na hora) ·
           Conferir na Stripe.
           **Decisão do operador, 29/10/2026 (à pergunta P114 do passo 6 da 4.9):** *"Tanto de cartão
           quanto no Pix não dá para fazer esse gerenciamento pelo /admin e um clique reembolso já
           resolver tudo, ou mesmo de forma automática após aprovação, sem depender de ficar entrando no
           site da Stripe e fazer trabalho manual — sou operador solo, quanto mais automatizar melhor."*
           Vale para esta tela: **"Cancelar e devolver o dinheiro" é UM clique, para o cartão e para a
           pré-paga do Pix** (devolve o Pix, encerra na hora e corta o acesso — a operação do aluno,
           `reembolsarMinhaAssinatura`/`stripe-reembolso.ts`, já faz isso; o painel chama a mesma, sem o
           prazo dos 7 dias, que é o direito do aluno, não o limite do operador), e o **pedido de
           reembolso** do item 2 vira um fluxo: o aluno pede, o admin aprova com um clique, e o resto é
           automático. **O painel da Stripe deixa de ser caminho de gestão**: devolver lá sem cancelar
           não corta o acesso (o gate libera `active` sem olhar a data) — fica só para emergência, e o
           `billing.md` avisa.
         - **Ativa, com o cancelamento marcado** → Desfazer o cancelamento.
         - **Pagamento atrasado** → Tentar cobrar de novo agora (o aluno avisou que resolveu o
           cartão) · Copiar o link para trocar o cartão (a tela é a da etapa 4.6) · Cancelar.
         - **Cancelada** → Copiar o link para reativar (o e-mail automático do sistema já
           terá saído sozinho: decisão dele de 10/10/2026, etapa 4.7).
         - **Paga e sem conta na escola** → Ligar a uma conta (etapa 4.7).
         - **Pix "em conferência"** (pagou e não virou assinatura sozinho — a 4.9b) → **Aceitar este Pix**
           (cria a pré-paga no preço de agora do plano, tira a marca de conferência e grava pelo
           `sincronizar`) · **Devolver** (o Pix volta e a pessoa paga de novo pela tela). *Decisão do
           operador, 29/10/2026 (P117).* Até esta tela existir, só devolver, pelo painel da Stripe — nunca
           criar a assinatura à mão lá (`billing.md` → *Quando um aluno não conseguir pagar*).
         - **Qualquer conta, quando o site não conseguiu cobrar** → **Liberar acesso pago por fora** (o
           operador recebeu por Pix direto ou transferência): o plano e o período, com confirmação, e fica
           registrado quem liberou, quando e até quando. *Decisão do operador, 29/10/2026 (P120 — a revisão
           ampla da cobrança, 4.9b).* **Não é cortesia:** a decisão de 10/10/2026 (o admin não presenteia acesso
           pela tela — `billing.md` → *Sincronizar e perder o acesso*) continua. **Trava de engenharia:** o acesso
           sai de uma assinatura de verdade na Stripe, pré-paga e paga por fora (como a do Pix:
           `cancel_at_period_end`, a fatura `paid_out_of_band`), gravada pelo `sincronizar` — nunca de um desvio
           em `temAcessoAtivo()`; assim o espelho, a régua e os e-mails continuam valendo. **E a CONTESTAÇÃO GANHA**
           (E7, 30/10/2026): a assinatura contestada foi cancelada na Stripe, com a marca `contestacao`
           (`METADADO_DA_CONTESTACAO`), que faz o período dela não contar como pago — liberar de novo é TIRAR A MARCA
           (pela operação na assinatura, com a sincronia): o período que a pessoa pagou volta a valer até o fim, e a
           assinatura continua cancelada (para seguir depois, ela assina de novo).
         - **Conta que nasceu com o e-mail digitado errado** → **Corrigir o e-mail**: o admin digita o certo, o site
           manda o código de entrar para ele, e a troca só vale depois do código confirmado. *Decisão do operador,
           29/10/2026 (P121).* **Travas de engenharia (é a porta de tomar conta):** o e-mail novo não pode ser de
           outra conta; a troca encerra todas as sessões; a ficha do visitante e o cliente da Stripe passam ao
           e-mail novo; fica registrado quem trocou e quando. A troca de e-mail do Better Auth continua desligada
           para o aluno.

         Toda ação pede confirmação dizendo o efeito ("Fulano continua com acesso até 10/11"), e
         a tela se atualiza com o que a Stripe respondeu.
      5. **O registro do que foi feito.** Cada ação fica gravada: quem fez (o operador e, no
         futuro, o JilsonAI), quando, em qual assinatura e o que a Stripe respondeu. É o que
         deixa o JilsonAI agir e o operador ver depois.
      **O JilsonAI, no futuro (`jilsonai.md` → *Decisões em aberto*, item 8):** as ações acima
      são as MESMAS que ele vai usar — construídas uma vez, no servidor. Proposta de três níveis,
      a decidir quando aquela fase abrir: **faz sozinho** o que não mexe em dinheiro (conferir,
      explicar ao aluno a situação dele, mandar o link de reativar ou de trocar o cartão) · **faz
      e avisa** o que segue uma regra fechada (devolver o dinheiro dentro dos 7 dias, tentar
      cobrar de novo) · **só com o OK do operador** o que foge da regra (devolução fora do
      prazo, qualquer exceção).
      **O que fica FORA, e por quê:** cobrar o cartão do aluno por conta própria (uma assinatura
      nova sem ele clicar: cobrança contestada é prejuízo e risco para a conta na Stripe) · dar
      acesso de cortesia pela tela (ele escolheu só o link; o código de 100% continua existindo) ·
      trocar o plano do aluno pelo admin (o aluno troca na tela dele, etapa 4.6) · contestação
      de cobrança no cartão, repasses e imposto: continuam no painel da Stripe.
      **Como se constrói (engenharia; uma sessão cada, e a ordem é do operador):** (1) a lista,
      os filtros, a busca e o detalhe — só leitura; (2) as ações que não mexem em dinheiro + o
      registro; (3) as que mexem (devolver, cobrar de novo). Pede uma migration (o espelho passa
      a guardar o plano e o "vai cancelar"; a tabela do registro, com RLS). Cancelar, desfazer
      e devolver o dinheiro são as mesmas operações da tela do aluno (etapa 4.6): quando este
      painel começar, elas já existem. context7 da Stripe antes de escrever; revisão de
      segurança ao fim.
      **Em aberto:** P61 (a cláusula de reembolso abusivo nos termos de uso). O detalhe de cada
      assinatura mostra as cobranças devolvidas: é o que sustenta a análise caso a caso, já que
      não há bloqueio automático por reembolso repetido (decisão do operador, 10/10/2026).
- **4.8 — CANCELADA em 12/10/2026** *(era: dólar pelo país do cartão + o botão das páginas em
      inglês)*. Decisão do operador no mesmo dia: a escola fica só em português e só para o
      Brasil (etapa 4.6c); não há dólar, venda para fora nem página em inglês. **O número 4.8
      não se reaproveita.** O texto abaixo é o histórico da etapa, e sai na varredura do passo
      6 da 4.6c. *Reabre só com a decisão de voltar a vender para fora.*
      *(Decisão do operador, 10/10/2026: fora do Brasil o prazo de reembolso é de 14 dias —
      `billing.md` → Reembolso. Esta etapa liga os 14 dias à cobrança em dólar. A decidir com
      ele aqui: a página em inglês promete 14 dias a todos, e quem paga com cartão do Brasil
      teria 7 pela regra do cartão.)* context7
      primeiro. **Depende da decisão de imposto internacional com o contador (P22)** antes da primeira
      venda fora do Brasil. **Trazido da 4.2 (10/10/2026):** a tela de assinar já recebe o valor e a
      moeda do servidor e já lê o cartão antes de a assinatura existir — o dólar entra no servidor,
      sem refazer a tela. **Da proposta da tela pública (agente, 12/10/2026):** a linha do
      reembolso na tela de assinar em inglês (o sistema hoje dá 7 dias a toda cobrança; os 14
      chegam aqui) e se o imposto de fora pede o país na tela — **P85** e `billing.md` → *A tela
      pública de assinar*. **Conferido na doc da Stripe (12/10/2026):** para aprovar o cartão,
      endereço não é preciso, nem fora do Brasil; se a P22 escolher o Stripe Tax, ele pede o
      país — nos EUA o CEP, no Canadá o CEP ou a província —, nunca o endereço completo. Pode
      aparecer só para quem paga com cartão de fora; como mostrar é decisão do operador.
      **A direção dele para o imposto de fora (12/10/2026):** *"eu quero terceirizar o máximo
      que puder com a Stripe"* — pesa para o Stripe Managed Payments (a Stripe como vendedora).
      Conferido na doc no mesmo dia: ele só funciona com o Checkout da Stripe e Payment Links, e
      **assinatura já feita não migra para ele** — decide-se ANTES da primeira venda para fora
      (P86 trata do que fazer até lá).
      **PESQUISADO a pedido dele, no mesmo dia — muda esta etapa:** (1) **decisão dele: quem é
      de fora também não sai do site para pagar** (*"é uma experiência horrível de compra"*);
      (2) **com a empresa no Brasil, a Stripe não cuida do imposto de fora por nenhum caminho:**
      o Brasil não está na lista de países do Managed Payments nem na do Stripe Tax (da América
      Latina, só o México). As "duas opções" que a P22 levava ao contador não existem para a
      empresa de hoje. O que sobra, sempre com o aluno dentro do site: lançar só para o Brasil ·
      vender para fora pelo Brasil, com o contador cuidando do imposto · empresa num país da
      lista, com o Stripe Tax e a mesma tela · a Paddle só para quem é de fora (peça nova de
      stack). Fatos, citações e as páginas lidas: `billing.md` → *A tela pública de assinar*.
      **DECIDIDO por ele em 12/10/2026 (P86): no lançamento a escola vende SÓ PARA O BRASIL**,
      e quem é de fora deixa o e-mail para ser avisado (etapa 4.7, passo 6). **E o imposto de
      fora não fica com o contador:** *"tem que ser com empresa terceirizada na fase do
      exterior"*. **Consequência para ESTA etapa, CONFIRMADA por ele no mesmo dia**: o dólar
      pelo país do cartão deixa de ter o que fazer antes do lançamento e passa
      para a fase do exterior, junto da escolha da empresa terceirizada (P22); o que sobra aqui
      é o botão de assinar das páginas em inglês, para quem mora no Brasil.
      **A direção dele para essa fase (12/10/2026):** *"Se a Paddle resolver, utilizo eles em
      vez de Stripe para clientes do exterior"* — condicional: a Paddle se apresenta como feita
      para empresa de software, e curso gravado por assinatura não aparece nem como aceito nem
      como proibido. As quatro perguntas a fazer a ela estão em `billing.md`. É peça nova de
      stack: só entra com a resposta dela e o OK dele, num plano próprio.
- [ ] **4.9 — Pix PRÉ-PAGO (código, ALTO RISCO).** *(Era "Pix recorrente": em 28/10/2026, ao abrir a
      etapa, a documentação da Stripe disse que o Pix Automático NÃO existe para empresa do Brasil —
      `billing.md` → *Formas de pagamento*, a correção do fato.)* **Decisão do operador, 28/10/2026:**
      quem paga com Pix paga UMA vez (o mensal ou o anual) e estuda pelo período; não renova sozinho —
      para continuar, paga de novo; a escola avisa antes de acabar. O cartão segue recorrente.
      **ENTRA NA ABERTURA, logo depois do cartão** *(ordem dele: "fechar 100% a parte de assinatura e
      pagamento")*: a linha "Pagamento no cartão ou no Pix" do cartão de preço fica. **O plano da etapa
      (o desenho na Stripe, a régua do pré-pago, as telas e os textos) vem depois da medição na área
      restrita, para o OK dele.** O texto antigo da etapa, abaixo, vale no que não depender do mandato.
      **Medido em 28/10/2026, na área restrita** (roteiro fora do repo, cliente descartável, sem banco):
      a conta é do Brasil (`BR`, `brl`); a configuração de formas de pagamento diz **`pix: available
      false, preference off`** — e criar assinatura com `payment_settings.payment_method_types: ["pix"]`
      falha nas três formas (cobrada automaticamente só Pix; cartão e Pix; fatura enviada) com
      *"The payment method type `pix` is invalid. Please ensure the provided type is activated in your
      dashboard"*. **Primeiro passo da etapa: o operador ativa o Pix no painel** (*Settings → Payments →
      Payment methods*), na área restrita e na conta de verdade; só então a medição do desenho (o
      Pix avulso na primeira fatura, cancelada no fim do período) faz sentido.
      **O operador ativou o Pix nos dois (28/10/2026) — e também o Apple Pay e o Google Pay, "se for
      simples e atender ao desenho".** As medições seguintes, no mesmo dia (3 roteiros fora do repo,
      clientes descartáveis apagados; *Docs check (context7):* Stripe → `/websites/stripe` → 4
      consultas nesta abertura — Pix Automático, elegibilidade por país, cobrança da 1ª fatura,
      carteiras no Payment Element):
      - `[FATO]` **`pix` em `payment_settings.payment_method_types` de uma ASSINATURA é recusado mesmo
        com o Pix ativado** — *"ensure … your account is enabled for any preview features that you are
        trying to use"*: o Pix em assinatura é recurso de prévia que a conta do Brasil não tem
        (coerente com "sem Pix Automático no Brasil"). Nas três formas: cobrada automaticamente só
        Pix; cartão e Pix; fatura enviada.
      - `[FATO]` **o Pix AVULSO funciona**, do jeito que a conta exige (formas de pagamento DINÂMICAS:
        `automatic_payment_methods`, e `payment_method_types` num PaymentIntent solto é recusado como
        "no longer supported"): o pagamento nasce com `["card","pix"]` (o que está ligado no painel),
        confirmado com `pix` fica `requires_action` com `pix_display_qr_code` — imagem do QR, código
        "copia e cola", página da Stripe com as instruções — e a validade é nossa
        (`expires_after_seconds`; medido com 1 h). **Em teste ele NÃO paga sozinho** (40 s depois,
        ainda `requires_action`): a confirmação de teste é à mão (a página de instruções em teste,
        ou o painel) — conferir no plano.
      - `[FATO]` **o caminho do pré-pago funciona:** assinatura criada como hoje (cartão,
        `default_incomplete`) com `cancel_at_period_end: true` → `invoices.pay(fatura, {
        paid_out_of_band: true })` → a assinatura fica **`active`**, a fatura `paid`, o período de 31
        dias, `cancel_at` no fim, **sem nenhum cartão** — a Stripe aceita.
      - Carteiras: Apple Pay e Google Pay **não são tipo de pagamento**: aparecem sozinhos no Payment
        Element quando `card` está ligado, o aparelho tem carteira, o site é https e **o domínio está
        registrado** no painel (*Payment method domains*); o Apple Pay exige servir um arquivo da Apple
        em `/.well-known/apple-developer-merchantid-domain-association` (o site não o tem). O cartão
        da carteira é um `card` normal: fica na assinatura e renova. **É simples e atende.**
      **A direção que o agente propõe (a aprovar):** o Pix é um PaymentIntent AVULSO, numa configuração
      de formas de pagamento só com Pix; quando ele é pago (aviso `payment_intent.succeeded`), a
      sincronia cria a assinatura pré-paga — `cancel_at_period_end: true`, a primeira fatura paga por
      fora, o PaymentIntent gravado nos metadados dela — e o espelho nasce como hoje; no fim do período
      ela termina (o e-mail "terminou — reative" já existe); a rodada ganha o aviso "seu acesso acaba
      em X dias — pague de novo"; a troca de plano e a troca de cartão não valem para o pré-pago; o
      reembolso dos 7 dias devolve o Pix. **A direção foi APROVADA pelo operador em 28/10/2026, com
      o Apple Pay e o Google Pay juntos** (*"Aprovo, com Apple Pay e Google Pay juntos"*).
      **REVISTO PELO OPERADOR NO MESMO DIA, ao fim da sessão: APPLE PAY E GOOGLE PAY SAEM** — *"Cartão
      de crédito e Pix atende a todos os públicos e desisti de Google Pay e Apple Pay; quanto menos
      complicar melhor, principalmente para os mais cautelosos: quem tiver medo de colocar o cartão paga
      um mês ou quantos quiser via Pix, estuda e pega seu certificado, volta quando quiser."* A escola
      fica com **cartão (recorrente) e Pix (pré-pago)**; o passo 5 sai; nenhum código muda (o campo já
      abre só com `card`, e sem o domínio registrado as carteiras nunca apareceram). No painel da Stripe,
      Apple Pay e Google Pay podem ficar como estão (não aparecem sem o registro do domínio) — desligá-los
      é opcional. *Reabre se alunos pedirem a carteira, ou se um dado de conversão mostrar que o cartão
      digitado perde venda.*
      **O PLANO DA 4.9 — proposta do agente, 28/10/2026 (um passo por sessão, um commit por passo,
      os quatro gates; a aprovar pelo operador).** *Docs check (context7):* Stripe →
      `/websites/stripe` → as 4 consultas acima; o passo 2 abre com UMA consulta a mais (a opção
      `paymentMethodConfiguration` do Payment Element com intenção adiada). O que é do operador vem
      como pergunta na abertura de cada passo: os textos, a validade do QR (proposta: 1 hora), os
      dias do aviso antes de acabar (proposta: 3), e a decisão abaixo.
      **Decisões de produto — a (a) DECIDIDA pelo operador em 28/10/2026 ("Só depois de acabar"), as
      outras valem se ele não disser o contrário ao aprovar:** (a) **pagar de novo só DEPOIS de o
      período acabar** — o pré-pago não soma tempo por cima do que está correndo
      (somar exige uma segunda assinatura começando no fim da primeira e a fatura dela paga por fora na
      hora certa: mais código e mais erro; reabre se os números mostrarem gente querendo renovar antes);
      (b) **sem código promocional no Pix, na primeira versão** — o desconto da Stripe é da assinatura,
      e no Pix o valor é de um pagamento solto (o campo do código some quando o Pix é escolhido; reabre
      se houver campanha com Pix); (c) os preços são os mesmos dos planos no cartão.
      - [x] **Passo 1 — A fundação (servidor + migration, ALTO RISCO).** A configuração de formas de
            pagamento **só com Pix** na Stripe (uma por modo, criada pela API com o OK do operador; o
            id em `deploy/cloud-run.yaml` e no `server/.env` — `STRIPE_PIX_CONFIGURATION`; não é
            segredo). A coluna `Subscription.pixPaymentIntentId` (migration; nula = recorrente): é ela
            que diz "pré-pago" às telas, à rodada e ao reembolso. `paraAssinaturaNaStripe` lê
            `metadata.pix_payment_intent`. O novo `lib/pix-pre-pago.ts`: `criarPagamentoPix` (um
            PaymentIntent com `automatic_payment_methods` + a configuração só-Pix, o valor do plano,
            `expires_after_seconds`, e nos metadados o plano e QUEM paga — `userId`, ou a ficha e a
            tentativa do visitante, como a assinatura leva hoje) e, no aviso `payment_intent.succeeded`
            de um pagamento NOSSO (`verificarAviso` passa a devolvê-lo), a rotina que **cria a
            assinatura pré-paga** — `cancel_at_period_end: true`, `default_incomplete`, os metadados
            copiados mais `pix_payment_intent` — e **paga a primeira fatura por fora**
            (`invoices.pay(paid_out_of_band)`), **idempotente pelo id do pagamento** (a trava
            `pg_advisory_xact_lock` no id do pagamento; antes de criar, procura o espelho pela coluna e
            a Stripe pelos metadados), e então a sincronia de sempre grava o espelho (e a conta do
            visitante nasce ali, como hoje). O aviso repetido e dois ao mesmo tempo não criam duas.
            Testes de servidor com a Stripe de dublê: a assinatura nasce paga e ativa, o espelho, a
            conta do visitante, o repetido, a corrida, o pagamento que não é nosso (ignorado), a
            migration do zero. Mutação.
            **FEITO (28/10/2026), no `dev`.** A configuração só-Pix da área restrita criada pela API
            (`pmc_1UVZtxCynmmEXrpbuDF6o2GV`: pix ligado, o resto desligado — um pagamento com ela nasce
            só com `pix`, medido) e posta no `server/.env` (`STRIPE_PIX_CONFIGURATION`; a da conta de
            verdade o operador cria no painel, passo 2, e vai no `deploy/cloud-run.yaml`). A coluna
            `Subscription.pixPaymentIntentId` (migration `20261028200000_pix_pre_pago`, única). Em
            `stripe.ts`: `PagamentoPrePago`, `pagamentoPrePagoDoAviso` (só o `payment_intent.succeeded`
            com a marca `prepago` = plano, o preço e o cliente), `verificarAviso` o devolve, e
            `paraAssinaturaNaStripe` lê o id do Pix. O novo `stripe-pix.ts`: `paraPedidoDePix`,
            `criarPagamentoPix`, `paraPedidoDeAssinaturaPrePaga`, `criarAssinaturaPrePaga` (idempotente
            pelo id do Pix; a fatura paga por fora, sem pagar duas vezes), `assinaturaDoPagamentoPrePago`
            (a busca pelos metadados, com o id conferido antes de entrar na consulta) e a validade do QR
            (1 h, proposta). Em `assinaturas.ts`: `processarPixPrePago` — a trava no id do pagamento, o
            espelho pela coluna, a busca, a criação, a sincronia de sempre e o aviso marcado na mesma
            transação; o espelho grava o id do Pix. A rota do webhook manda as boas-vindas e os
            e-mails também para a assinatura que nasceu do Pix. **Testes:** `pix-pre-pago.test.ts` (7,
            contra o banco: a conta logada, o repetido, dois ao mesmo tempo, a já existente na Stripe,
            a criação que falha e volta, o visitante com a conta nascendo e as boas-vindas, o que não é
            nosso), `stripe-pix-rede.test.ts` (12, a Stripe de dublê) e `stripe.test.ts` (5). **Mutação:
            12 de 12 reprovaram** (sem a marca · sem olhar o espelho · sem a trava · sem
            `cancel_at_period_end` · sem pagar por fora · o espelho sem o id · a assinatura sem o id ·
            sem a configuração só-Pix · o aviso sem marca · `verificarAviso` sem o pagamento · a rota
            sem a assinatura nova · o id do Pix não lido). Gates: typecheck, lint, build; site e
            servidor como o CI.
      - [x] **Passo 2 — Pagar com Pix nas duas telas (rotas + site).** *(Fechado em 29/10/2026: a prova no navegador, que ficava para o passo 6, foi feita — ver lá.)* `POST /billing/pix` (login,
            `limiteDeTentativas.cobranca`, `comVaga`, o CPF obrigatório como no cartão) e
            `POST /billing/visitante/pix` (`limiteSemLogin.assinar` — e-mail e endereço —, a ficha e a
            tentativa como hoje, `contarClienteNovo`): respondem `{ estado: "pagar", segredo, tipo: "pix"
            }`; quem já tem acesso recebe 409 `JaAssinante` (decisão (a)). `GET /billing/planos` e o do
            visitante passam a dizer `pix: { configuracao }`. No site: a escolha **"Cartão — renova
            sozinho" / "Pix — você paga e estuda por 1 mês ou 1 ano, sem renovação automática"** antes
            do campo de pagamento (texto do operador); com Pix, o campo abre em `mode: "payment"` com a
            configuração só-Pix e o código promocional some; `confirmPayment` → a própria Stripe.js
            mostra o QR (imagem e "copia e cola") e fecha quando o Pix cai; a tela de concluído já
            pergunta ao gate a cada 2 s; **se a pessoa fechar o QR sem pagar, um botão "Mostrar o QR de
            novo"** (`handleNextAction`, que já existe). Testes de tela: a escolha, o campo no modo
            certo, o código escondido, o QR de novo; de servidor: as duas rotas, os limites, o teto, o
            409. Mutação.
            **Em duas partes (28/10/2026): 2a, o servidor; 2b, o site.** Decisões do operador na abertura:
            **o QR vale 1 hora** (`VALIDADE_DO_PIX_EM_SEGUNDOS`) e **os textos da escolha** (abaixo, na 2b).
            - [x] **2a — o servidor. FEITO (28/10/2026), no `dev`.** `POST /billing/pix` (`requireAuth`,
                  `limiteDeTentativas.cobranca`, `comVaga`, o CPF obrigatório — `pixSchema`, no `core`) e
                  `POST /billing/visitante/pix` (`limiteSemLogin.assinar`, a cota de clientes novos do dia, a
                  ficha e a tentativa como no cartão — `pixSemLoginSchema`, SEM `codigo`): 503 `NaoConfigurado`
                  sem `STRIPE_PIX_CONFIGURATION`; `{ estado: "pagar", segredo, tipo: "pix" }` (o visitante leva a
                  `tentativa`); 409 `JaAssinante` / `JaTemConta` / `Ocupada` / `MuitosAoMesmoTempo` /
                  `CobrancaAtrasada`; 400 `DocumentoInvalido`. `GET /billing/planos` e o do visitante dizem
                  `pix: { configuracao } | null` (`lerPlanos`). A regra em `lib/pix-pre-pago.ts` (`pagarComPix`,
                  `pagarComPixSemLogin`), com as peças do checkout exportadas (`clienteDaConta`, `travarSeLivre`,
                  `fichaDoEmail`, `sincronizarAViva`): quem já tem acesso não paga; a assinatura VIVA na Stripe é
                  sincronizada, sem QR (a atrasada há mais de 3 dias → trocar o cartão); **um QR por vez** — o
                  mesmo plano é o MESMO QR, outro plano cancela o anterior, o visitante só reaproveita com o
                  código da tentativa (`pagamentosPixPendentes`, `cancelarPagamentoPix`, em `stripe-pix.ts`);
                  **um pagamento aberto por vez, nos dois sentidos** — o Pix cancela a incompleta do cartão
                  (`cancelarIncompleta`) e o checkout por cartão, logado e sem login, cancela o Pix à espera
                  (`cancelarPagamentosPixPendentes`, que não vai à Stripe sem o Pix configurado); o CPF vai para
                  a ficha antes do QR, também no reaproveitado (a fatura só nasce quando o Pix cai); nada grava o
                  espelho. No `core`: `pixSchema`, `pixSemLoginSchema`, `PlanosDaAssinatura.pix` e o `tipo: "pix"`
                  em `AssinaturaCriada`/`AssinaturaSemLogin`; no site, só o tipo (`confirmar` aceita `"pix"`,
                  tratado como pagamento). **Testes:** `pagar-com-pix.test.ts` (25, contra o banco: as duas
                  portas — o corpo, sem configuração, quem já tem acesso, o caminho feliz, o código ignorado, um
                  QR por vez, o cartão aberto cancelado e o pago no meio, a viva sincronizada, a atrasada, dois
                  cliques, o teto, o CPF recusado, a tentativa, a conta que nasce na sincronia, os limites por
                  e-mail e os e-mails novos do dia, o cartão cancelando o Pix nas duas portas, o `pix` nas duas
                  vitrines), `stripe-pix-rede.test.ts` (+3: os pendentes, o cancelar, o cancelar todos),
                  `limite-de-tentativas.test.ts` (a rota no grupo da cobrança), `billing.test.ts` (`pix: null`).
                  **Mutação: 9 de 9 reprovaram** (sem o "já tem acesso" · um QR por vez sem cancelar · o
                  visitante sem conferir a tentativa · o Pix sem cancelar a incompleta · a viva sem sincronia ·
                  o cartão sem cancelar o Pix, logado e visitante · a rota sem a configuração · o CPF depois do
                  QR). Gates: typecheck, lint, build; site e servidor como o CI. **P109 feita pelo operador em
                  28/10/2026:** a configuração só-Pix da conta de verdade ("Pix pré-pago", só o Pix ligado), o id
                  em `deploy/cloud-run.yaml` (`STRIPE_PIX_CONFIGURATION`) — o Pix entra no ar na próxima
                  publicação; até lá, em produção ele responde 503 e a vitrine diz `pix: null`.
            - [x] **2b — o site. FEITO (28/10/2026), no `dev`.** A escolha antes do campo de pagamento, com os
                  textos APROVADOS pelo operador (28/10/2026): título **"Como você quer pagar?"**; **"Cartão —
                  Renova sozinho todo mês (ou todo ano). Cancele quando quiser."**; **"Pix — Você paga uma vez e
                  estuda por 1 mês ou 1 ano. Não renova sozinho: quando acabar, é só pagar de novo."**; no resumo,
                  **"Acesso até DD/MM/AAAA"** no lugar da renovação (a previsão do fim do período, contada de
                  hoje — `fimDoPeriodoPrePago`, com o dia que não existe virando o último do mês, como a Stripe
                  conta); o botão **"Pagar com Pix"**; e **"Mostrar o QR de novo"** nas duas telas de concluído
                  (`QrDeNovo` → `mostrarQrDeNovo`, o `handleNextAction` do Stripe.js, carregado por `import()`:
                  as telas de concluído estão no pacote de todo aluno). **Como ficou:** a escolha
                  (`EscolhaDaFormaDePagamento`) só aparece quando os planos trazem `pix` (sem a P109, em produção
                  nada muda); com o Pix, o código promocional some e o aplicado é esquecido, o `CartaoProvider`
                  abre em `mode: "payment"` com `paymentMethodConfiguration` + `allowedPaymentMethodTypes:
                  ["pix"]` e o valor do plano, e o `confirmar` confirma como pagamento (a própria Stripe.js mostra
                  o QR); o pedido ao servidor, nas quatro combinações (logado ou sem conta × cartão ou Pix), saiu
                  do formulário para `lib/pedido-de-assinatura.ts` (o formulário ficou em 191 linhas); o segredo
                  do Pix e a chave publicável ficam em `lib/pix-pendente.ts` (memória + `sessionStorage` da aba,
                  guardados ANTES de confirmar; esquecidos quando o servidor confirma). **A tela NUNCA pede um
                  QR novo sozinha** — só o clique pede; quem acabou de pagar e clicasse de novo ganharia outro
                  QR. Textos em `pt.ts` (`app.assinar.pix.*`). **Testes:** `AssinarPage.test.tsx` (+7: sem o
                  Pix no ar; a escolha e os textos; o código some, "Acesso até" com o fim do mês, o botão e o
                  campo só-Pix; o código aplicado esquecido; o envio na ordem com o segredo guardado antes; o
                  cartão não guarda nada; o 409), `AssinarSemLoginPage.test.tsx` (+3), as duas telas de concluído
                  (+2 cada: o QR de novo com o que foi guardado; esquecido ao confirmar), `assinar.test.ts` (4,
                  a função pura da data). **Mutação: 11 de 11 reprovaram.** Gates: typecheck, lint, build; site
                  (1014) e servidor como o CI. *Docs check (context7):* Stripe → `/websites/stripe` →
                  `paymentMethodConfiguration` nas opções do Elements com intenção adiada (`mode: "payment"`,
                  `amount`, `currency`); a confirmação do Pix pelo `confirmPayment` do Payment Element; o
                  `handleNextAction` para o QR de novo. **Fica para a prova no navegador (passo 6):** o que o
                  `confirmPayment` devolve quando a pessoa FECHA a janela do QR sem pagar (a tela segue para a de
                  concluído em qualquer caso sem erro; se vier erro, ela fica com a frase de sempre e o novo
                  clique recebe o mesmo QR); o QR vencido depois de 1 h (o pagamento volta a `requires_payment_
                  method`, e o novo clique gera outro QR no mesmo pagamento); e a janela do QR no celular.
                  **P110, decidida pelo operador no mesmo dia:** com o Pix, a linha do pagamento seguro sai sem a
                  parte do cartão — "Pagamento seguro, processado pela Stripe." (`app.assinar.pix.pagamentoSeguro`).
      - [x] **Passo 3 — O pré-pago nas telas do aluno e nas operações.** `minha-assinatura.ts`:
            a pré-paga vem com `prePago: true` e `acessoAte`, sem parar/manter/mudar de plano/trocar
            cartão (a renovação não existe); Faturamento mostra "Seu acesso vai até DD/MM; para
            continuar, é só pagar de novo quando acabar" (texto dele). **O reembolso dos 7 dias
            devolve o Pix**: `stripe-reembolso.ts` ganha o ramo do pagamento solto (`refunds.create` pelo
            `pixPaymentIntentId`) e `cancelarNaHora`; o aviso `charge.refunded` de um Pix acha a
            assinatura **pela coluna do espelho**, não pela fatura (hoje só a fatura). As rotas de
            cartão e de plano recusam a pré-paga (409 `PrePago`). Testes nos dois lados; mutação.
            **FEITO (28/10/2026), no `dev`.** Texto do operador (decidido na abertura): *"Seu acesso vai até
            {data}. Para continuar, é só pagar de novo quando acabar."*, e "Pix" em *Forma de pagamento*.
            **Como ficou:** `DetalhesDaAssinatura.pixPaymentIntentId` (lido dos metadados da Stripe, como o
            espelho) e a regra `prePaga()` em `minha-assinatura.ts` — a mesma para a tela e para as
            operações: `podeManter` e `aceitaCartaoNovo` são falsos na pré-paga; a leitura sai `vai-cancelar`
            com `prePago: true`, `acessoAte` e sem botões; preparar/aplicar cartão, cancelar e manter respondem
            **409 `PrePago`** (`RECUSAS`); mudar de plano já era `indisponivel` (não renova). **O reembolso:**
            `buscarOQueFoiPagoNoPix` (o Pix, não as faturas — a primeira fatura da pré-paga foi paga por fora
            e não tem pagamento), `devolver` pelo id do Pix, `cancelarNaHora`; a saída da tela mostra o valor do
            Pix. **O período pago da pré-paga é o do PIX:** `periodoDevolvido` (`stripe-devolucao.ts`) olha a
            cobrança do Pix quando há `pix_payment_intent` nos metadados, nas duas leituras (`buscarAssinatura`,
            o espelho; `buscarDetalhes`, a tela) — conferir a fatura devolveria o acesso a quem recebeu o Pix de
            volta. **O aviso de devolução** (`charge.refunded` e os `refund.*`) acha a assinatura pela coluna
            `pixPaymentIntentId` do espelho antes de perguntar à Stripe (`assinaturaDoPagamentoDevolvido`).
            Na tela: `BlocoDoPlano` (o texto), `BlocoDoCartao` ("Pix", ícone de QR, sem botão). **Testes:**
            `minha-assinatura` (+2), `cancelar-assinatura` (+1), `trocar-cartao` (+1), `reembolso` (+3),
            `stripe-webhook` (+1), `stripe-reembolso.test.ts` (+3: a pré-paga no espelho, o que foi pago no Pix,
            o Pix devolvido por inteiro), `FaturamentoPage` (+3). **Mutação: 9 de 9 reprovaram.** Gates:
            typecheck, lint, build; site e servidor como o CI. *Docs check (context7): not triggered* (nenhuma
            chamada nova à Stripe; `refunds.create` por `payment_intent` já existia).
      - [x] **Passo 4 — Os e-mails do pré-pago.** `emailDevido`: ativa + pré-paga + acaba em N dias
            (proposta: 3) → `PREPAGO_TERMINANDO` ("seu acesso acaba dia X; depois, é só pagar de novo" —
            texto dele), pela rodada de hora em hora (a consulta ganha as pré-pagas perto do fim); no
            fim, a Stripe cancela e sai o "terminou — reative" que já existe (com uma frase própria
            para o pré-pago, se ele quiser). Testes e mutação como no passo 7.
            **FEITO (28/10/2026), no `dev`.** Decisão do operador na abertura: **3 dias antes, um e-mail só**
            (`ANTECEDENCIA_DO_PREPAGO_EM_MS`). **Como ficou:** o tipo `PREPAGO_TERMINANDO` no enum dos e-mails
            (migration `20261028230000_prepago_terminando`, escrita à mão — só o `ALTER TYPE … ADD VALUE` —,
            provada pelo `migrate diff` sem diferença e pela suíte, que a aplica do zero); `emailDevido`: a
            ativa do Pix com o fim do acesso a até 3 dias → "está acabando", com a referência no fim do
            período (um período, um e-mail); a rodada escolhe as pré-pagas nessa janela e as confere na
            Stripe como a atrasada (o Pix pode ter sido devolvido — aí o espelho é acertado e nada sai); o
            aviso da Stripe passa o `pixPaymentIntentId` do espelho à regra. **O e-mail não tem botão:** pagar
            de novo é só depois de acabar (decisão (a)) — "Reativar assinatura" vem no "terminou" de sempre,
            que a pré-paga recebe quando a Stripe a encerra no fim do período (testado). **O texto é RASCUNHO
            do agente** (`app.email.prePagoTerminando`; a prévia em `npm --workspace server run email:previa`)
            — revisão dele: **P111** — *aprovado como está pelo operador em 29/10/2026*. **Testes:** `avisos-da-assinatura.test.ts` (+3: a rodada com a pré-paga a
            2 dias, a de 10 dias e a que terminou; o Pix devolvido; a regra pura). **Mutação: 5 de 5
            reprovaram.** Gates: typecheck, lint, build; site e servidor como o CI. *Docs check (context7):
            not triggered.*
      - [x] **Passo 5 — ~~Apple Pay e Google Pay~~ DESCARTADO (decisão do operador, 28/10/2026 — o
            cabeçalho da etapa).** Não há arquivo da Apple, rota nem registro de domínio: a escola fica
            com cartão e Pix. *Se um dia voltar:* o arquivo da Apple é o da Stripe, o mesmo para todas as
            contas (`https://stripe.com/files/apple-pay/apple-developer-merchantid-domain-association`),
            servido em `/.well-known/apple-developer-merchantid-domain-association` **antes do portão
            "Em breve"**, e o domínio registrado em *Settings → Payments → Payment method domains* (teste
            e ao vivo). Nada muda no campo do cartão.
      - [x] **Passo 6 — Prova e revisão.** *(Fechado em 29/10/2026 — a prova, as duas revisões, as partes 1 a 3 e as
            decisões P113, P114 e P115 —, REABERTO no mesmo dia pela segunda passada, que achou 10 problemas, e
            FECHADO de novo: as partes 4 (o servidor) e 5 (o site), a terceira passada e a P112, feitas. O que ela
            deixou vai para a revisão ampla (4.9b); o Pix de verdade fica no passo 8 da 4.7.)* Na área restrita: como se confirma um Pix de teste (a
            página de instruções da Stripe em teste), o pré-pago de ponta a ponta com o relógio de
            teste (nasce, avisa 3 dias antes, termina, "terminou"), o reembolso do Pix, o QR vencido;
            no banco de dev; a revisão de segurança (`security-vulnerability-reviewer`); o Pix de
            verdade (R$ 99,90 e o reembolso) é do teste do operador no passo 8 da 4.7.
            **EM ANDAMENTO (29/10/2026) — a PROVA e as REVISÕES estão FEITAS; as correções saem em partes
            (um commit cada), e as decisões de produto vão ao operador uma a uma.** *Docs check (context7):*
            Stripe → `/websites/stripe` → 3 consultas (o Pix de teste ×2 — a doc que vale é a página do Pix
            lida pelo agente de busca —, o `handleNextAction` e o fechamento da janela do QR).
            **A prova pelas ROTAS** (roteiro fora do repo, conta descartável, banco de dev, Stripe de teste —
            tudo apagado no fim, retrato do banco igual ao de antes): logado 28 de 32 (as 4 falhas não eram
            do produto: o teto de 5 pedidos/15 min por conta, e o campo `paid_out_of_band`, que não existe
            mais na API `2026-09-30.endive` — a fatura paga por fora aparece em `invoice.payments` como um
            `payment_record` pago); o QR vencido com conta nova 7 de 7; o visitante 21 de 21 (a conta nasce
            do Pix, boas-vindas, confirmação, senha, 409 `JaTemConta`); o relógio de teste 16 de 16 — criado
            33 dias no passado, como na prova 7c da 4.7: o "está acabando" a 2 dias do fim e o "terminou" no
            fim SAÍRAM DE VERDADE para o operador (com o relógio no presente, o "terminou" só é marcado
            como consumido: a regra confere o acesso pelo relógio do servidor, e o período pago ainda está
            no futuro real). **Fatos medidos:** o Pix de teste se simula pelo `billing_details.email`
            (`succeed_immediately@example.com` paga em segundos; `fill_never@example.com` nunca paga e vence
            pelo prazo; e-mail com domínio qualquer paga sozinho em ~3 min); `expires_after_seconds` mínimo
            é 60; re-confirmar um pagamento em `requires_action` dá um QR novo; o vencido volta a
            `requires_payment_method` com `payment_intent_payment_attempt_expired`; **o branch `dev` do Neon
            estava DUAS migrations atrás** (as da 4.9 foram aplicadas na suíte e em produção, nunca no dev —
            `migrate deploy` em 29/10/2026).
            **A prova no NAVEGADOR** (Chrome do agente em `localhost:5173`, visitante, Stripe de teste):
            ao fechar a janela do QR, o `confirmPayment` resolve SEM erro, com o pagamento em
            `requires_action`, e a tela vai para a de concluído com "Mostrar o QR de novo"; o botão abre a
            janela (0,6 s; no desktop e no celular, 390×844) e, fechada, o `handleNextAction` resolve sem
            erro; pago o Pix, a tela de concluído confirma sozinha e esquece o QR. *Uma vez, com o e-mail de
            teste que paga sozinho, o "QR de novo" não abriu janela (resolveu em 3,6 s); com o `fill_never`
            abriu 3 de 3 — provável artefato do modo de teste; o teste do operador com Pix real (passo 8 da
            4.7) inclui fechar o QR e mostrar de novo.*
            **ACHADOS (a revisão de segurança + a geral, no Fable 5.1, conferidos no código):**
            (1) **P1 — o endereço de avisos da conta de verdade NÃO recebe `payment_intent.succeeded`**
            (`billing.md` → os 7 avisos cadastrados): em produção, um Pix pago nunca viraria assinatura,
            sem alerta — **P112, do operador, antes de qualquer Pix real**; (2) **P1 — o campo do Pix não
            abria no navegador**: o Stripe.js recusa `paymentMethodConfiguration` junto com
            `allowedPaymentMethodTypes` e o `react-stripe-js` engole o erro — *corrigido na parte 1*; (3) o
            quadro do Pix da Stripe tem um campo "E-mail" próprio (o aluno digita duas vezes) — **P113**;
            (4) **P1 estreito — a janela entre o Pix cair e o aviso chegar**: um clique "sem login" com o
            e-mail de quem acabou de pagar troca a tentativa da ficha e cria a senha da conta paga pela vítima
            — *parte 3*: o Pix pago sem assinatura vira "viva" (processado na hora) e a senha fica amarrada à
            tentativa que PAGOU; (5) **P2 — pagou e ficou sem acesso em silêncio**: se o `invoices.pay` por
            fora falhar, a reentrega acha a assinatura incompleta pela busca e não a paga — *parte 2*:
            garantir a fatura paga em todo caminho + alerta; (6) **Pix devolvido pelo painel sem cancelar
            mantém o acesso** (o gate libera `active` sem olhar a data) — **P114**; (7) **P2 — o QR é
            reaproveitado por plano, não por preço** — *parte 3*; (8) a janela do "QR de novo" saía no
            idioma do navegador — *parte 1* (`locale` no Stripe.js); depois de 1 h o botão não faz nada
            visível — **P115** (frase); (9) menores: o force-sync do admin não enxerga Pix pago sem
            assinatura (*parte 3*), o valor do Pix não é conferido com o preço (*parte 2*), o Pix guardado
            na aba sobrevivia ao cartão (*parte 1*), o "outro" Pix pago no meio dá 500 sem alerta (*parte
            3*), comentário morto em `stripe.ts` (*parte 2*), `pix-pre-pago.test.ts` com uma afirmação que
            é eco do dublê (*parte 2*), `TEMPO_DA_OPERACAO` abaixo do pior caso (*parte 2*), textos
            superados no `billing.md` (*parte 1*). O `[FATO]` de `processing`: o Pix é de notificação
            imediata (`requires_action` → `succeeded` | `requires_payment_method`); `processing` fica fora
            das listas de propósito.
            - [x] **Parte 1 — o site (29/10/2026).** `opcoesDoCampo` (função pura, `stripe-do-site.tsx`):
                  no Pix só a configuração só-Pix, nunca com `allowedPaymentMethodTypes` (teste
                  `stripe-do-site.test.ts`); `OPCOES_DO_STRIPE` com `locale: "pt-BR"` (a janela do QR);
                  `pedirAoServidor` esquece o Pix da aba ao pagar por cartão (`AssinarPage.test.tsx`).
                  **Mutação: 3 de 3 reprovaram.** Docs: o registro acima, P112–P115 em `pendencias.md`, e
                  os trechos superados do `billing.md`.
            - [x] **Parte 2 — o servidor, a criação da pré-paga (29/10/2026).** `garantirFaturaPaga`
                  (`stripe-pix.ts`): a primeira fatura paga por fora em TODO caminho — a assinatura achada no
                  espelho ou pela busca também (achado 5); `chaveDoPrePago`: as chaves de idempotência da
                  criação e do pagar-por-fora com janela de 5 min (a Stripe repete por 24 h a primeira
                  resposta, inclusive a falha); o VALOR do Pix conferido com o preço antes de criar — diferente
                  ou fora de venda, nada nasce, o aviso fica marcado e sai alerta (achado 9); o alerta
                  `[stripe] … pagante trancado` na rota quando o Pix pago termina sem acesso; `TEMPO_DO_PIX`
                  (150 s, 7 idas × 20 s); o comentário morto de `FORMAS_DE_PAGAMENTO`; o teste eco anotado.
                  Testes: `pix-pre-pago.test.ts` (+4), `stripe-pix-rede.test.ts` (+5). **Mutação: 5 de 5
                  reprovaram.**
            - [x] **Parte 3 — o servidor, o Pix pago sem assinatura (29/10/2026).** `pagamentosPixPagos` +
                  `pixPagoSemEspelho` (o Pix nosso `succeeded` sem espelho) e `processarPixPago` (a MESMA
                  rotina do aviso, sem `event.id`): nas quatro portas — `pagarComPix`, `pagarComPixSemLogin`,
                  e o `decidir` dos dois checkouts por cartão — o Pix pago cujo aviso ainda não chegou vira
                  assinatura FORA da trava (`pixPagoDaConta`, `pixPagoDoEmail`) e a resposta é "já assina" /
                  "já tem conta": sem outro QR, sem cartão por cima, sem tocar no CPF nem na tentativa da
                  ficha (achado 4); `contaDoPedido` grava na ficha a tentativa que PAGOU (lida dos metadados
                  da assinatura — `AssinaturaNaStripe.resumoDaTentativa`), então "já valeu?" e a senha
                  respondem só a quem pagou; o force-sync do admin (`sincronizarConta`/`sincronizarPedido`)
                  processa os Pix pagos sem espelho antes de listar (achado 9); `PixPendente.precoId`: o QR
                  só é reaproveitado com o MESMO preço (achado 7); o "outro" Pix pago no meio do
                  cancelamento é lido (`lerPagamentoPix`) e processado, em vez de 500 (achado 9).
                  `pagamentosPixPagos` não vai à Stripe sem o Pix configurado. Testes: `pagar-com-pix.test.ts`
                  (+6), `pix-pre-pago.test.ts` (+1), `admin-assinaturas.test.ts` (+1), `stripe-pix-rede.test.ts`
                  (+2). **Mutação: 6 de 6 reprovaram.**
            - [x] **P113 — o e-mail no quadro do Pix (decisão do operador, 29/10/2026: esconder o campo e
                  mandar o e-mail já digitado).** O servidor devolve `email` com o segredo do Pix (a conta da
                  sessão, ou o do visitante em minúsculas — `AssinaturaCriada`/`AssinaturaSemLogin`, API
                  aditiva); o site esconde o campo (`opcoesDoElemento`: `fields.billingDetails.email: "never"`)
                  e o entrega na confirmação (`confirmar(…, { email })`, só no Pix) — `[FATO — docs da Stripe,
                  context7 (4ª consulta Stripe da sessão), 29/10/2026]` com o campo escondido a Stripe EXIGE o
                  e-mail em `payment_method_data.billing_details`. **Provado no navegador:** o quadro do Pix
                  mostra só "Pix" e a frase do QR; o clique abre a janela do QR; o pagamento na Stripe fica com
                  o e-mail do servidor. Testes: `stripe-do-site.test.ts` (+2), as duas telas (+e-mail na
                  confirmação), `pagar-com-pix.test.ts` (o corpo com o e-mail).
            - [x] **P114 — a devolução pelo painel (decisão do operador, 29/10/2026):** não é regra para o
                  painel da Stripe, é um clique no `/admin` — registrado na etapa 4.7b (as ações), onde mora;
                  até lá, o `billing.md` avisa que devolver no painel sem cancelar não corta o acesso.
            - [x] **A segunda passada (só as correções) — FEITA no Opus 5.5, com esforço máximo (pedido do
                  operador, 29/10/2026), e ela ACHOU 10 problemas; o operador decidiu corrigir todos antes de
                  publicar.** Os achados e onde cada um foi parar: (1) **o Pix DEVOLVIDO antes do aviso virava
                  assinatura** — acesso sem pagar → *parte 4*; (2) **as portas cancelavam a pré-paga incompleta**
                  (a fatura dela no meio), tratando-a como cartão começado — trancava quem pagou → *parte 4*; (3)
                  **qualquer linha no espelho escondia o Pix**, mesmo a de uma pré-paga que nunca valeu — as
                  portas vendiam de novo → *parte 4*; (4) **o Pix pago que não vira assinatura sozinho** (valor ≠
                  preço, fatura que não se paga, pré-paga morta, processado e ainda sem acesso) alertava a cada
                  clique e deixava pagar de novo → *parte 4* (EM CONFERÊNCIA) e *parte 5* (a frase); (5) **a busca
                  por metadados atrasa**: uma nova tentativa logo depois de uma falha criava uma SEGUNDA assinatura
                  para o mesmo Pix (e a chave do pagar-por-fora era do Pix, não da fatura) → *parte 4*; (6) **duas
                  idas à Stripe** (os pagos e os à espera): o Pix que caísse entre elas não era visto; e a tentativa
                  do visitante era gravada mesmo com a conta nascida no meio do clique → *parte 4*; (7) **sem aviso
                  (o clique, o admin), a trava do Pix esperava**, segurando uma ligação do banco → *parte 4*; (8)
                  **o "QR de novo" gerava QR novo com o valor antigo** depois de o preço mudar → *parte 5*; (9)
                  **o checkout por cartão dava 500 com o Pix pago no meio do cancelamento** → *parte 4*; (10) **o
                  alerta "pagante trancado" da rota disparava também para o Pix sem assinatura** (devolvido, ou já
                  alertado em conferência) → *parte 4*. *Antes dela (registro do mesmo dia):* o agente de revisão
                  no Fable 5.1 parou no limite mensal de gasto da conta, e a conferência à mão, no Opus 5.5, dos pontos de
                  risco das partes 2 e 3 e das P113/P115: o `processarPixPago` chamado pelas rotas só transforma
                  em assinatura o Pix NOSSO já pago do cliente DAQUELA conta ou ficha (os metadados são do nosso
                  servidor), sem tocar no CPF nem na tentativa; a conta nasce presa à tentativa que PAGOU (a coluna
                  `tentativa` é única, e o resumo é de bytes aleatórios — sem colisão); o `garantirFaturaPaga` só
                  vê assinaturas pré-pagas (achadas pela coluna do Pix ou pelos metadados), e fatura paga, anulada
                  ou incobrável não é paga de novo; o e-mail devolvido ao site é o da própria sessão ou o digitado
                  pelo visitante; as linhas novas de registro só têm ids. **Nada novo achado** (a passada no Opus 5.5
                  com esforço máximo, acima, achou os 10); um P3 — os
                  comentários "até 9 idas à Stripe dentro da trava" passaram a 10 — corrigido no fechamento. *O
                  clique "sem o código" de quem sabe só o e-mail ainda cancela o QR à espera da pessoa (o "um QR
                  por vez" de sempre, aceito na 4.7): incomoda, não toma a conta.*
            - [x] **Parte 4 — o servidor, a segunda revisão (29/10/2026).** (1) `processarPixPago`: o Pix
                  devolvido por inteiro (`pixDevolvido`) nunca vira assinatura, e a incompleta dele é encerrada;
                  `listarPixDoCliente` não o conta como pago (`paraPixDoCliente`, pela cobrança expandida); com a
                  incompleta aberta, o clique a encerra e responde 409 `Ocupada` (tentar de novo — `pixPagoDaConta`,
                  `pixPagoDoEmail`). (2) A pré-paga incompleta nunca se cancela nem se reaproveita: `assinaturasAbertas`
                  (o Pix) e o `decidir` dos dois checkouts por cartão a reconhecem (`AssinaturaNoCheckout.pixPaymentIntentId`)
                  e processam o Pix dela (`pixDaPrePagaIncompleta`); nas portas do Pix, o Pix pago é lido ANTES de
                  qualquer cancelamento. (3)(4) **EM CONFERÊNCIA:** o Pix pago que não vira assinatura sozinho ganha a
                  marca `em_conferencia` nos metadados (`marcarEmConferencia` — o alerta sai só quando a marca é nova),
                  e as quatro portas respondem 409 `PixEmConferencia` sem processar de novo; o force-sync o deixa para o
                  operador; só o espelho que VALEU esconde o Pix (`pixConsumido`); `criarAssinaturaPrePaga` diz se a
                  fatura ficou paga, e sem ela o espelho não é gravado. (5) As pré-pagas de um Pix se acham pela LISTA
                  das assinaturas do cliente (`assinaturasDoPix`, `status: "all"`, a fatura expandida —
                  `escolherPrePaga`), não pela busca; a chave do pagar-por-fora é a da fatura. (6) UMA lista para os
                  pagos e os à espera (`listarPixDoCliente`); a tentativa do visitante só grava com a ficha ainda sem
                  conta (`updateMany` com `userId: null` — senão o QR ou a assinatura nova é encerrado e a resposta é
                  `JaTemConta`). (7) Sem aviso, a trava não espera (`travarChave`: `ocupada`). (9) O cartão também
                  processa o Pix pago no meio do cancelamento (`cancelarOutrosPix`, a mesma das portas do Pix). (10) O
                  alerta da rota do aviso só para a assinatura que existe e não dá acesso. Testes:
                  `pix-pre-pago.test.ts` (+8), `pagar-com-pix.test.ts` (+15), `admin-assinaturas.test.ts` (+1),
                  `stripe-pix-rede.test.ts` (+3, e outros reescritos), `stripe.test.ts` (+1). **Mutação: 29 de 29 reprovaram** — as 21 da
                  lista e 8 que o agente acrescentou nas portas do cartão e do visitante; 6 dessas 8 PASSARAM na
                  primeira rodada (a pré-paga incompleta no cartão, logado e visitante; o Pix pago no meio do
                  cancelamento no cartão do visitante; o devolvido na porta do visitante; a marca e o alerta do
                  "processado e ainda sem acesso", logado e visitante) e ganharam 7 testes antes do commit.
                  *Docs check (context7):* Stripe → `/websites/stripe` → 2 consultas: a lista de assinaturas por cliente
                  (`status: "all"` traz todos os estados, inclusive `incomplete_expired`) e os metadados do pagamento
                  (a atualização junta as chaves às que existem; o valor tem até 500 caracteres — o motivo vai cortado
                  em 450). A lista de pagamentos com `expand: ["data.latest_charge"]` é a expansão comum de lista.
            - [x] **Parte 5 — o site, a segunda revisão (29/10/2026).** O 409 `PixEmConferencia` mostra a frase
                  APROVADA pelo operador — *"Recebemos o seu Pix e estamos conferindo o pagamento. Já fomos avisados e
                  vamos responder pelo seu e-mail. Se precisar, escreva para suporte@jilsonsantana.com."*
                  (`app.assinar.pix.emConferencia`) — nas duas telas de assinar, por cartão e por Pix
                  (`FormularioDeAssinatura`). Logado, o 409 `Ocupada` mostra *"Aguarde um instante e tente novamente."*
                  (`aguardeUmInstante`) — **decisão do operador, 29/10/2026**, à pergunta do caso raro do achado 1 (o
                  Pix devolvido com a incompleta aberta; vale também para o clique duplo); sem conta fica a frase de
                  hoje (`ocupadaOutraAba`), que já diz "aguarde um instante". **Achado 8:** `comoMostrarOQr` (sem
                  Stripe.js, com teste) dá QR novo ao QR vencido só se o VALOR do pagamento ainda for o preço de um
                  plano — senão, a frase `qrNaoAbriu` manda clicar em "Pagar com Pix", que cria o Pix no preço de
                  agora; os preços só são lidos nesse caso, pela rota de cada tela (`QrDeNovo.lerPlanos`:
                  `getPlanosDaAssinatura` logado, `getPlanosSemLogin` sem conta). Testes: `stripe-do-site.test.ts`
                  (+2, e o de antes reescrito), `AssinarPage.test.tsx` (+2), `AssinarSemLoginPage.test.tsx` (+1), as
                  duas telas de concluído (+1 cada). **Mutação: 8 de 9 reprovaram.** A que passou é a linha que, DENTRO
                  da fronteira com o Stripe.js (`mostrarQrDeNovo`), só repassa o status, o valor e quem lê os preços à
                  decisão: a regra do repo é simular o nosso módulo, nunca o da Stripe, e ela fica sem teste de
                  propósito. *Docs check (context7):* Stripe → `/websites/stripe` → 1 consulta (a 3ª da sessão): com o
                  segredo do cliente, o Stripe.js lê `status`, `amount` e `currency` do pagamento (`retrievePaymentIntent`).
                  *Não provado no navegador:* o caminho feliz do QR vencido (o valor bate, o QR novo abre) — a prova da
                  P115 foi antes desta mudança.
            - [x] **A terceira passada da revisão de segurança (Opus 5.5, esforço máximo — pedido do operador), só das
                  partes 4 e 5 (29/10/2026).** **Nenhum P0 nem P1:** as correções fecham os 10 achados. Ficaram 2 P2 e
                  2 P3, levados para a revisão ampla (a etapa 4.9b, abaixo): o Pix em conferência não tem saída pelo
                  sistema (só devolver — P117); o "QR de novo" confere só o valor, e o servidor confere o id do preço e
                  o valor (um preço recriado com o mesmo valor põe em conferência quem pagou o QR novo — E11); o 409
                  `PixEmConferencia` sem login revela um pouco mais sobre um e-mail (P124); `TEMPO_DO_PIX` (150 s)
                  abaixo do pior caso, que passou a 8 idas à Stripe (E12).
            - [x] **P115 — o QR vencido (decisão do operador, 29/10/2026: "o mesmo botão gera o QR novo quando
                  venceu").** `mostrarQrDeNovo` lê o pagamento AGORA (`retrievePaymentIntent`) e decide pelo status
                  (`comoMostrarOQr`, função pura): `requires_action` → reabre o MESMO QR (`handleNextAction`);
                  `requires_payment_method` (vencido) ou `requires_confirmation` → confirma o MESMO pagamento de
                  novo com o Pix e o e-mail de quem paga (`confirmPixPayment`), e a janela abre com o QR novo;
                  pago → nada (a tela confirma sozinha); cancelado → a frase aprovada por ele, *"Não foi possível
                  mostrar o QR. Volte e clique em Pagar com Pix."* (`app.assinar.pix.qrNaoAbriu`), que aparece só
                  se nada abriu. O e-mail viaja com o Pix guardado na aba (`PixGuardado.email`). **Provado no
                  navegador** (com a validade do QR baixada a 60 s só no computador, cópia de segurança e
                  restaurada — `git diff` vazio): o QR venceu (`requires_payment_method`,
                  `payment_intent_payment_attempt_expired`), o botão abriu a janela em 1,2 s com um QR NOVO no
                  MESMO pagamento (venceria 10:51:00; o antigo, 10:49:45), em português, e fechar não mostrou a
                  frase; com o QR ainda valendo, o botão reabriu o MESMO (0,8 s, a mesma validade). Testes:
                  `stripe-do-site.test.ts` (+1), `AssinaturaConcluidaPage.test.tsx` (+2: a frase; o Stripe.js que
                  lança), as telas de assinar (o e-mail guardado). **Mutação: 4 de 4 reprovaram.**
            - [x] **P112 — FEITA pelo operador em 29/10/2026**, com o agente guiando pelos prints dele: o endereço de
                  avisos da conta de verdade passou de 7 para 8 avisos, com o `payment_intent.succeeded` (só ele) —
                  `billing.md` → *O aviso do Pix chega ao site no ar*. A publicação deste passo foi PARADA no meio da
                  montagem da imagem, quando a revisão ampla (4.9b) apontou publicar sem a P112 como P1 — nada tinha
                  mudado no ar —, e retomada depois dela.
      **Fora da 4.9:** somar tempo pagando antes de acabar (decisão (a)) · código promocional no Pix
      (decisão (b)) · Pix na troca de plano · o Pix Automático (quando a Stripe liberar para o Brasil) ·
      **Apple Pay e Google Pay** (decisão do operador, 28/10/2026). **Trazido da 4.2 (10/10/2026):** o Pix é um item a mais na
      lista de formas de pagamento do servidor (na 4.2, só cartão), sem refazer a tela *(superado em
      28/10/2026: o Pix é pagamento solto, fora de `FORMAS_DE_PAGAMENTO`, que segue só `card`)*. A home já
      diz "Pagamento no cartão ou no Pix": esta etapa fecha antes do lançamento.
      **Trazido da revisão de segurança da 4.2 (10/10/2026):** com o Pix o pagamento chega minutos
      depois do pedido — conferir na área restrita que trocar de plano com um Pix pendente
      invalida o Pix antigo (hoje o checkout cancela a incompleta e só GRITA se ela tiver sido
      paga nesse instante) *(feito no código no passo 2a, 28/10/2026 — um QR por vez e um pagamento
      aberto por vez; a prova na área restrita fica no passo 6)* · se entrar forma de pagamento que saia do site e volte, tirar do
      endereço da volta o segredo que a Stripe acrescenta.
- [ ] **4.9b — A REVISÃO AMPLA DA COBRANÇA (pedido do operador, 29/10/2026).** Nas palavras dele: *"uma revisão
      minuciosa de tudo que foi feito relacionado a Stripe até o momento para evitar ao máximo erros, invasão e
      principalmente o aluno não conseguir pagar e eu não ficar sabendo ou mesmo não ter como resolver e quando
      acontecer os caminhos para receber"*. Dois revisores em paralelo, no Opus 5.5 com esforço máximo (escolha dele):
      o `security-vulnerability-reviewer` (invasão e fraude) e um revisor geral (o aluno que não consegue pagar: o que
      ele vê, se o operador fica sabendo, se há como resolver e como receber) — sobre o `dev` em `70f597d`, só
      leitura. **Nenhum P0 de invasão.** O que pesa é o "pagou, ou quis pagar, e ninguém soube":
      **Os achados graves (P0/P1, os dois revisores):** (a) **publicar sem a P112** — feita no mesmo dia (4.9, passo
      6); (b) **o campo de pagamento que não abre é invisível**: o erro fica no navegador e o pedido nem chega ao
      servidor (`stripe-do-site.tsx`, `FormularioDeAssinatura.tsx`) — já aconteceu duas vezes (10/10 e 29/10),
      achado só abrindo a tela à mão, e o alerta das telas (Fase 7) não o pegaria, porque o erro não é lançado;
      (c) **a assinatura do aviso que não confere só gera `console.warn`** (`stripe-webhook.ts:32`): com o segredo
      trocado ou colado errado, TODOS os avisos são recusados com 400 e ninguém sabe — e a conferência de cada
      publicação (o aviso sem assinatura → 400) não distingue o segredo certo do errado; (d) **nada confere se os
      avisos chegaram**, e a tela de depois do pagamento nunca confere sozinha na Stripe nem mostra o contato do
      suporte ("Confirmando…" para sempre); (e) **a cobrança atrasada sem outro cartão**: o Pix é recusado
      ("atrasada") e a saída (cancelar e assinar com Pix) fica escondida; (f) **quem tenta e não consegue pagar** só
      aparece no painel da Stripe, e nenhuma frase de erro de pagamento cita o suporte.
      **O BLOCO DE ENGENHARIA (proposta do agente; nenhuma peça nova de stack) — APROVADO pelo operador em
      29/10/2026, nesta ordem, um commit por parte, cada uma com teste, mutação e os quatro gates:** **grupo 1, "pagou
      e ninguém soube"** — E5, E4, E1, E3, E2; **grupo 2, segurança** — E8, E10, E9, E7, E6; **grupo 3, ajustes do
      Pix** — E11, E12, E13, E17; **grupo 4, telas e e-mails novos** (cada texto vai a ele antes) — E14, E15, E16,
      E18. Publicar é ordem dele, como sempre.
      - [x] **E1 — a rodada de hora em hora confere os avisos:** pede à Stripe os eventos recentes dos tipos tratados
            (ela guarda 30 dias) e processa, pela mesma rotina do aviso, os que o site não registrou (`stripe_event`),
            com um alerta. Pega o aviso esquecido no endereço, o segredo trocado, o endereço desligado e o aviso de
            fim ou de devolução perdido (que hoje deixa o espelho `active` e o acesso aberto sem pagamento).
            **FEITO (29/10/2026):** `lib/avisos-perdidos.ts` (`conferirAvisosPerdidos`): os avisos dos tipos de
            `AVISOS_DO_ENDERECO` dos últimos **3 dias** (o tempo em que a Stripe tenta entregar) até **10 min** atrás (a
            entrega normal ainda pode estar chegando), lidos da API (`avisosDaStripe`, `stripe.ts` — autenticada, sem
            assinatura a conferir); os sem marca vão, do mais velho para o mais novo, pela MESMA rotina do endereço —
            `processarAviso` e **`depoisDoAviso`** (`lib/depois-do-aviso.ts`: os alertas, o registro, as boas-vindas e
            os e-mails da cobrança saíram da rota para cá, sem mudar nada — a suíte inteira passou antes de seguir), e
            `paraAviso` separou o "evento → aviso" da verificação da assinatura. Um alerta por rodada, com texto fixo (o
            Sentry junta as rodadas), e outro se algum falhar de novo (fica sem marca, para a próxima). A conferência
            roda primeiro na tarefa da rodada (`tarefas/avisos-da-cobranca.ts`), com 1 minuto de prazo; a rodada dos
            e-mails fica com o resto dos 4 (o job tem 5). Testes: `avisos-perdidos.test.ts` (novo, 7, contra o banco),
            `avisos-da-stripe-rede.test.ts` (novo, 3). **Mutação: 10 de 10 reprovaram.** *Sem teste:* a tarefa em si (o
            `process.exit`); a prova é o registro da rodada no ar (`[avisos] a conferência dos avisos da Stripe
            terminou: …`). *Reabre se a rodada ficar parada mais de 3 dias (P126: o alerta de "a rodada não rodou"), ou
            se a lista passar do máximo (2.000) com frequência.*
      - [x] **E2 — a tela de depois do pagamento pede conferência:** sem confirmação em ~30 s, pede ao servidor que
            confira na Stripe (a sincronia das portas: a assinatura viva, o Pix pago), com limite; nada do navegador
            vale como prova. **FEITO (29/10/2026):** `conferirOCliente` (`assinaturas.ts`): o Pix pago sem espelho
            (pela rotina sem aviso) e as assinaturas não encerradas do cliente (`sincronizarSeLivre`) — **sem esperar
            nenhuma trava**, porque quem pede é o aluno; `POST /api/billing/conferir` (a conta da sessão; quem já tem
            acesso nem vai à Stripe; teto por conta, 10 a cada 15 min) e `POST /api/billing/visitante/conferir` (pela
            tentativa da aba: a ficha que pagou ganha a conta e as boas-vindas, como no "Conferir na Stripe" do admin;
            a tentativa desconhecida responde igual, sem ir à Stripe; teto por endereço, 10). No site,
            `usePedirConferencia` (`lib/assinar.ts`): aos 30 s sem confirmação e depois a cada minuto, no máximo 5; o
            pedido não decide nada — a pergunta "já valeu?" de sempre vê o resultado. Testes:
            `conferir-pela-tela.test.ts` (novo, 8, contra o banco), as duas telas de concluído (+5, +3). **Mutação: 13
            de 13 reprovaram** — duas passaram na primeira rodada porque os MEUS testes não provavam nada (o aluno
            ficava com acesso de um teste para o outro, e no de "quem tem acesso" ele nem tinha cliente na Stripe);
            corrigidos, reprovaram. O `billing.md` (*limitações conhecidas*) deixou de dizer que a tela não confere.
      - [x] **E3 — o vigia do campo de pagamento:** o Stripe.js que não carrega, ou o campo que não fica pronto em
            ~15 s, mostra uma frase e avisa o servidor, que alerta (`[site] …`).
            **FEITO (29/10/2026):** `CampoVigiado` (`components/assinar/`, fora da fronteira com o Stripe.js, para ter
            teste) em volta do `CampoDoCartao`, que passa adiante o `onReady` e o `onLoadError` da Stripe
            (`[FATO — docs da Stripe, context7, 29/10/2026]`): sem "pronto" em 15 s, ou com a falha, a frase aprovada
            (`app.assinar.campoNaoCarregou`) e UM aviso ao servidor — `POST /api/billing/campo-nao-abriu`, sem login,
            com o teto por endereço (5 a cada 15 min, `limiteSemLogin.campoNaoAbriu`) e o corpo de listas fechadas
            (`campoNaoAbriuSchema`: a tela e o motivo); o servidor alerta **`[stripe] site: …`** (e não `[site]`: as
            regras de alerta do Sentry são por origem, e a de `stripe` com certeza avisa), no máximo um a cada 15 min
            por cópia. Nas três telas: assinar (logado e sem conta) e trocar o cartão. Testes: `CampoVigiado.test.tsx`
            (novo, 5), as três telas (+1 cada: o nome da tela no aviso), `campo-nao-abriu.test.ts` (novo, 4).
            **Mutação: 15 de 16 reprovaram** (o site 7 de 8, o servidor 4 de 4); a que passou é a ligação do
            `onLoadError` dentro da fronteira — e a prova no navegador a exercitou. **Provado no navegador** (Chrome do
            agente em `localhost`, a `/assinar` sem conta, a Stripe de teste): o campo de verdade abriu, e 20 s depois
            nenhuma frase — no cartão e no Pix; sem internet, a troca para cartão mostrou a frase em menos de 10 s (a
            Stripe disse que falhou); com a internet de volta, o aviso do navegador chegou ao servidor (204) e virou a
            linha de alerta. **A frase, APROVADA pelo operador
            em 29/10/2026 (P116, a sugestão do revisor):** *"O campo de pagamento não carregou. Tente outro
            navegador ou desative o bloqueador; se continuar, escreva para suporte@jilsonsantana.com."*
      - [x] **E4 — a conferência na subida do servidor:** a chave publicável e a secreta no mesmo modo (hoje só se
            confere a `pk_`), e o endereço de avisos de produção ativo e com todos os eventos que o código trata —
            faltou um, alerta. **FEITO (29/10/2026):** `lib/conferencia-da-cobranca.ts` — `problemaDasChaves` (a
            publicável `pk_`, a secreta `sk_` ou `rk_`, do mesmo modo; o registro diz o modo, nunca a chave),
            `problemaDoEndereco` (um endereço de avisos da conta aponta para o site, LIGADO, e os ligados assinam
            juntos todos os de `AVISOS_DO_ENDERECO`, ou "todos os eventos") e `conferirCobrancaNaSubida`, chamada no
            `index.ts` só em produção, uma vez por subida de cada cópia: cada problema vira alerta `[stripe] subida: …`,
            e nunca derruba a subida. **A lista dos avisos exigidos passou a morar no código**
            (`AVISOS_DO_ENDERECO`, `stripe.ts`: os 8 da P69 e da P112), com um teste que assina cada um de verdade e
            prova que ele é tratado. Testes: `conferencia-da-cobranca.test.ts` (novo, 10), `stripe.test.ts` (+1).
            **Mutação: 11 de 11 reprovaram.** *Sem teste:* a chamada no `index.ts` (a subida não roda na suíte, como
            a do fuso do banco); a prova é o primeiro registro da subida depois da publicação.
      - [x] **E5 — o aviso com a assinatura que não confere vira alerta** quando o cabeçalho tem o formato da Stripe e
            a hora é recente (no máximo um a cada 15 min por cópia); cabeçalho ausente ou malformado continua só
            registro. Na conferência de cada publicação, o reenvio de um aviso pelo painel (200) no lugar do 400.
            **FEITO (29/10/2026):** `pareceAvisoDaStripe` (`stripe.ts`, função pura: `t=` com até 5 min de diferença e
            ao menos um `v1=` de 64 hexadecimais — `[FATO — docs da Stripe, context7, 29/10/2026]`, e a Stripe assina
            cada nova tentativa de entrega com a hora dela) e, na rota (`stripe-webhook.ts`), o alerta `[stripe] aviso
            recusado: o cabeçalho é da Stripe e recente…` no máximo um a cada 15 min por cópia (a marca na memória,
            com o motivo escrito: protege a cota de alertas, que é por cópia); o resto continua `warn`. **Assim o
            segredo trocado alerta sozinho no primeiro aviso de verdade** — o reenvio pelo painel (200) continua sendo
            a prova manual, na P126. Testes: `stripe-webhook.test.ts` (+2: o segredo trocado alerta uma vez, cala por
            15 min e volta; sem cabeçalho, malformado, velho e adiantado não alertam — com a prova de que o alerta
            estava livre), `stripe.test.ts` (+2); o teste "nenhuma recusa fica muda" passou a olhar o alerta e o
            registro juntos (dependia da ordem dos testes). **Mutação: 6 de 6 reprovaram.**
      - [x] **E6 — uma vez por dia, a rodada relê as assinaturas `active` com o período vencido há mais de 2 dias**,
            e alerta a que a Stripe diz devolvida ou vencida (a devolução pelo painel sem cancelar, P114; o aviso de
            fim perdido). **FEITO (29/10/2026):** `conferirAtivasVencidas` (`server/src/lib/ativas-vencidas.ts`), na
            rodada das 12h UTC (9h no Brasil — `ehHoraDaConferenciaDasAtivas`; `tarefas/avisos-da-cobranca.ts`, depois
            da conferência dos avisos): as ativas no site com o período pago vencido há mais de 2 dias (de conta não
            apagada, as mais vencidas primeiro, até 50 por dia, 60 s de prazo) são relidas pela sincronia de sempre
            (`sincronizarSeLivre`; a ocupada fica para amanhã). **Alerta** a que continua ativa sem período pago (o
            reembolso pelo painel sem cancelar — a pessoa continua com as aulas: cancelar no painel), a encerrada na
            Stripe (o espelho dava acesso a quem saiu — já acertado) e a que a Stripe não conhece; a que renovou fica
            no registro; a falha fica para amanhã, com um alerta só no fim. Teste: `ativas-vencidas.test.ts` (novo, 8).
            **Mutação: 9 de 9 reprovaram** (uma sobreviveu antes: o teste calculava a idade pela própria constante —
            corrigido). O roteiro de `billing.md` (*Quando um aluno não conseguir pagar*, item 6) cita o alerta.
      - [x] **E7 — a contestação e o aviso de fraude** (`charge.dispute.created`, `radar.early_fraud_warning.created`)
            tratados com alerta e cadastrados no endereço de avisos; hoje só o e-mail da Stripe avisa, e a disputa
            não corta o acesso. **Decisão do operador, 29/10/2026 (P122): a contestação CORTA o acesso na hora** (se
            resolvida a favor da escola, ele libera de novo pela 4.7b); o aviso de fraude só alerta —
            `billing.md` → *Reembolso*. **E CANCELA a assinatura na Stripe** *(decisão do operador, 30/10/2026: "cortar
            e cancelar" — o cartão contestado nunca mais é cobrado; a pessoa recebe o e-mail de sempre de assinatura
            encerrada)*. **FEITO (30/10/2026):** os dois avisos em `AVISOS_DO_ENDERECO` (agora 10) e lidos do aviso
            (`paraAviso`: a contestação, com o pagamento, o motivo, o valor e o prazo; o aviso de fraude, com a
            cobrança, o pagamento e o tipo). A contestação acha a assinatura pelo pagamento (como a devolução) e, com a
            trava dela, `cancelarPorContestacao` (`stripe-reembolso.ts`) põe a MARCA `contestacao` na assinatura e só
            então a cancela na hora (sem crédito nem fatura nova; vale uma vez pela marca, que é a mesma, e pela já
            encerrada que não se cancela de novo — **sem chave de repetição desde 30/10/2026**, ver abaixo); a sincronia
            de sempre corta o acesso e derruba as sessões —
            `paraAssinaturaNaStripe` não conta como pago o período da assinatura com a marca (sem ela, a cancelada
            daria acesso até o fim do período). Alertas (`depois-do-aviso.ts`, uma vez por aviso): **`[stripe]
            contestação …`** com o valor, o motivo, como ficou a assinatura e o prazo para responder no painel — também
            quando o pagamento não é de uma assinatura da escola —; **`[stripe] aviso de fraude …`**, que só alerta. A
            Stripe que falha não marca o aviso (ele volta). Testes: `contestacao.test.ts` (novo, 4), `stripe.test.ts`
            (+4), `stripe-reembolso.test.ts` (+3). **Mutação: 10 de 10 reprovaram.** **Conserto de 30/10/2026 (ordem do
            operador, depois da publicação `5313557`):** a prova do E14 mediu que a chave de repetição devolve, na marca,
            a resposta GUARDADA da primeira vez, e que a Stripe a ignora no cancelamento (cancelar a já cancelada dá 404) —
            o aviso da contestação que voltasse em menos de 5 min, depois de uma falha no meio, falharia até a janela
            virar. As chaves saíram: a resposta da marca é a de agora, e a já cancelada não se cancela de novo. Provado na
            área restrita (cancelar duas vezes seguidas, sem erro, e o período sem contar como pago); teste novo; mutação
            2 de 2. **A P129, feita pelo operador em
            30/10/2026 (conferida pelo print dele):** o endereço de avisos da conta de verdade passou a assinar os 10
            avisos — entraram `charge.dispute.created` e `radar.early_fraud_warning.created` —, na versão
            `2026-09-30.endive`, a mesma da biblioteca. *Docs check (context7): Stripe → `/websites/stripe` → 1 consulta (a
            contestação e o aviso de fraude trazem a cobrança e o pagamento, não a assinatura); os campos, na biblioteca
            (`Disputes.d.ts`, `Radar/EarlyFraudWarnings.d.ts`).*
      - [x] **E8 — a trava contra pedido de outro site aceita só `same-origin`** (ou o cabeçalho ausente); hoje
            recusa só `cross-site` (`protecao-da-cobranca.ts`): uma página num subdomínio de `jilsonsantana.com`
            apontando para terceiro poderia mandar o aluno logado reembolsar ou cancelar. **FEITO (29/10/2026):**
            `pedidoDeOutroSite` (`protecao-da-cobranca.ts`): passam a mesma origem, o `none` (a própria pessoa abriu
            o endereço) e o cabeçalho ausente; o `same-site` e o `cross-site`, 403 `OutroSite`. A mesma regra no
            pedido de código por e-mail (`conta-codigo.ts`), que tinha uma cópia da trava antiga. Testes:
            `mudar-de-plano.test.ts` e `codigo-por-email.test.ts` (o subdomínio recusado; a mesma origem, o `none` e
            sem o cabeçalho passam). **Mutação: 4 de 4 reprovaram.**
      - [x] **E9 — o teto do Sentry com uma reserva para `[stripe]`, `[email]` e `[avisos]`** (hoje um apagão com
            centenas de `[api]` gasta o dia, e o alerta seguinte de pagante trancado não sai), e um alerta quando o
            limite começar a descartar. **FEITO (29/10/2026):** `criarLimite` (`monitor.ts`) pergunta pela etiqueta: as
            de `ETIQUETAS_COM_RESERVA` (`stripe`, `email`, `avisos` e `monitor`) vão até 30 por janela e 150 por dia;
            as outras param em 20 e 100 (`RESERVA_DE_ENVIOS`: 10 e 50). Quando o limite descarta pela primeira vez no
            dia, sai UM alerta `[monitor] o limite de alertas começou a descartar…`, pela reserva — a marca é posta
            antes de pedir o envio, então nunca entra em laço; ligar o monitor zera as marcas. O `CLAUDE.md` (*Server*)
            ganhou a regra: alerta novo de cobrança usa uma dessas etiquetas. Testes: `monitor.test.ts` (+2: a reserva
            na janela e no dia; com o limite de verdade, o apagão de `[api]` para em 20, o `[stripe]` sai e um alerta só
            do descarte; os dois testes do limite passaram a usar a etiqueta da cobrança). **Mutação: 6 de 6
            reprovaram.** Na P126, conferir que a regra de alerta do Sentry avisa também a origem `monitor`.
      - [x] **E10 — HSTS e `frame-ancestors 'self'` nas páginas** (hoje a `/assinar` pode ser emoldurada por outro
            site). **FEITO (29/10/2026):** `cabecalhosDeSeguranca` (`server/src/lib/cabecalhos-de-seguranca.ts`, função
            pura), em toda resposta (`app.ts`, no lugar do passo que só punha o `Cross-Origin-Opener-Policy`):
            `Content-Security-Policy: frame-ancestors 'self'` e `X-Frame-Options: SAMEORIGIN` (navegador antigo) em todo
            ambiente; em produção, também `Strict-Transport-Security: max-age=31536000`, sem os subdomínios. As molduras
            que a escola abre (o player do Bunny, o campo da Stripe) não mudam, e o parceiro de design abre o servidor
            local direto, sem moldura. Teste: `janela-isolada.test.ts` (a página e a API; o de produção pela função).
            **Mutação: 5 de 5 reprovaram.**
      - [x] **E11 — o Pix conferido pelo plano e pelo valor**, com a pré-paga criada no preço de agora desse plano
            (hoje, pelo id do preço — a terceira passada do passo 6). **FEITO (30/10/2026):** `processarPixPago`
            (`assinaturas.ts`) acha o preço de AGORA pelo plano do Pix; valor diferente → em conferência (com o
            motivo); valor igual → a pré-paga nasce nesse preço (`criarAssinaturaPrePaga` com o `precoId` de agora — a
            Stripe não aceita assinatura nova num preço arquivado). O id gravado no Pix que saiu de venda deixou de pôr
            em conferência quem pagou o valor certo. Teste: `pix-pre-pago.test.ts` (o teste do "preço fora de venda"
            virou o caso que agora vira assinatura). **Mutação: 3 de 3 reprovaram.**
      - [x] **E12 — `TEMPO_DO_PIX` 180 s** (o pior caso passou a 8 idas à Stripe — a terceira passada). **FEITO
            (30/10/2026):** 180 s, com a conta das 8 idas no comentário; teste do prazo (`pix-pre-pago.test.ts`).
            **Mutação: 1 de 1 reprovou.**
      - [x] **E13 — o id da conta nas linhas `[api]` de `/billing`**: o alerta diz quem (a busca por `sub_`, `pi_`
            e `cus_` é da 4.7b). **FEITO (30/10/2026):** o tratador de erro da API (`erro-da-api.ts`) escreve
            `… falhou (conta <id>): …` quando o pedido tem sessão — o id, nunca o e-mail —, em toda rota de `/api`.
            Teste: `erro-da-api.test.ts`. **Mutação: 1 de 1 reprovou.**
      - [x] **E14 — o Pix na cobrança atrasada** *(decisão do operador, 29/10/2026, P118)*: ao lado de "Trocar
            cartão" (Faturamento, a aula trancada e o e-mail da falha), um "Pagar com Pix" que encerra a atrasada
            e abre o Pix do plano — pela operação da assinatura (`operarNaAssinatura`), um pagamento aberto por vez.
            A frase e o botão vão ao operador para aprovar. **FEITO (30/10/2026), com a tela, o endereço e os textos
            APROVADOS pelo operador no mesmo dia** ("Tela própria"): o botão "Pagar com Pix" ao lado de "Trocar cartão" em
            Faturamento (também dentro dos 3 dias) e na aula trancada; a tela `/aluno/pagar-com-pix` com *"Ao pagar com Pix,
            sua assinatura no cartão é encerrada agora e você paga o plano {plano}: {valor} por {1 mês|1 ano}. O acesso volta
            assim que o Pix for pago. O Pix não renova sozinho: quando acabar, é só pagar de novo."*, o CPF ou CNPJ e "Gerar
            o Pix" (o QR de sempre; pago, a tela de concluído); e nos dois e-mails da atrasada, depois do botão, *"Se preferir
            pagar com Pix, entre na escola e escolha 'Pagar com Pix' em Faturamento."* (só com o Pix no ar). **Servidor:**
            `POST /api/billing/minha-assinatura/pix` (só o CPF ou CNPJ no corpo; `lib/pix-da-atrasada.ts`): o CPF na ficha
            ANTES de tudo (recusado, nada muda) → a atrasada relida e ENCERRADA com a trava dela, com a marca
            o comentário "Trocada pelo Pix" (que cala o "sua assinatura terminou") → a cobrança em aberto ANULADA depois de encerrar (paga no
            instante: alerta e sem Pix; não anulada: alerta) → o Pix pré-pago de sempre, do plano da atrasada, pelo preço do
            servidor. A pessoa continua logada. Encerrar só depois do Pix pago não é seguro (a Stripe tentaria o cartão de
            novo e os dois seriam cobrados) — por isso o texto avisa que o acesso volta quando o Pix cair. Docs check
            (context7): Stripe → `/websites/stripe` → anular fatura em aberto (só `open`/`uncollectible`; anulada não é
            cobrável e não muda o status da assinatura). Testes: `pix-da-atrasada.test.ts` (15), `stripe-reembolso.test.ts`
            (+2), `stripe.test.ts` (+1), `avisos-da-assinatura.test.ts` (+2), `email.test.ts` (+1); telas:
            `PagarComPixPage.test.tsx` (13), `FaturamentoPage.test.tsx` e `LessonPage.test.tsx` (os botões). Um teste achou
            um defeito antes do commit: a releitura da assinatura depois do clique desmontava o formulário (e o QR) —
            a tela agora fica com a atrasada do instante do clique. **Mutação: 26 de 26 reprovaram** (servidor 10, telas 10,
            e-mails 6; uma sobreviveu antes — o campo do Pix que não confere não tinha teste; ganhou).
        - [x] **A prova na área restrita, do lado da Stripe** (30/10/2026, roteiro fora do repositório com as funções de
              verdade e um relógio de teste no passado): a renovação falhou de verdade (`past_due`, fatura `open`); encerrar
              deixou `canceled` com o comentário, a fatura ficou `void`, e a assinatura lida para o espelho diz encerrada, sem
              período pago, "trocada pelo Pix" e o plano. **Ela achou dois defeitos que os testes não pegavam:** (1) a marca
              gravada antes levava a hora, e o pedido repetido com a mesma chave de repetição era recusado
              (`StripeIdempotencyError`); (2) `[FATO — medido]` a chave de repetição não vale para encerrar (a Stripe a ignora;
              encerrar a já encerrada dá 404 `resource_missing`), e na marca ela devolve a resposta GUARDADA da primeira vez. Os
              dois sumiram com o achado P2 da revisão abaixo: não há mais marca antes — o comentário vai no próprio
              encerramento, sem chave — e a rota relê a assinatura com a trava e só encerra a atrasada.
        - [x] **A prova pela rota** (30/10/2026, depois das correções da revisão do grupo 4): servidor local (porta 3997)
              com o banco de DEV (que recebeu a migration do E18 por `migrate deploy`), conta descartável com uma atrasada de
              verdade (relógio de teste; o 1º mês pago, a renovação recusada), e os avisos reais da Stripe entregues ao
              servidor local. **16 de 16 pontos:** Faturamento diz atrasada com as aulas trancadas → `POST
              /api/billing/minha-assinatura/pix` só com o CPF → 200 com o QR → na Stripe, a atrasada `canceled` com "Trocada
              pelo Pix", a cobrança em aberto `void`, o Pix de 9990 centavos só com Pix e o plano mensal → continua logada →
              o aviso do encerramento: 200 e o "terminou" consumido sem envio → o Pix pago (`succeed_immediately`) e o aviso:
              a pré-paga `active`, as aulas de volta, e a confirmação do E18 entregue ao Resend (caixa de teste). Nenhum erro
              nem alerta no registro do servidor; a limpeza devolveu o banco de dev ao retrato de antes.
      - [x] **E15 — o suporte nas frases de erro de pagamento** *(decisão do operador, 29/10/2026, P119)*: as
            frases de erro de pagamento (as de assinar, de trocar o cartão e a "Está demorando…" de depois do
            pagamento) passam a citar suporte@jilsonsantana.com, e depois de um cartão recusado a tela sugere
            pagar com Pix. **Cada frase reescrita vai ao operador, uma a uma, antes de entrar no site.** **FEITO
            (30/10/2026), com as frases APROVADAS pelo operador no mesmo dia** (`core/src/i18n/pt.ts`): `assinar.erro`,
            `assinar.cartaoRecusado` (nova), `erroDoCartao` e `demorando`, todas com a saída pelo suporte. O cartão
            recusado (`card_declined`, lido em `falhou`, `stripe-do-site.tsx`) mostra a frase que sugere o Pix só quando o
            Pix está no ar; sem ele, a da Stripe. Testes: `AssinarPage.test.tsx` (+1), `stripe-do-site.test.ts` (+2) e as
            frases novas nos testes das telas. **Mutação: 4 de 4 reprovaram.**
      - [x] **E16 — o aviso "uma senha foi criada"** *(decisão do operador, 29/10/2026, P123)*: a senha criada logo
            depois de pagar (`senha-depois-de-pagar.ts`) manda um e-mail para a caixa — se não foi a pessoa, ela
            cria outra pelo "Esqueci minha senha", que desconecta os outros aparelhos (conferir na prova). Pela
            porta de sempre (`enviarEmail`, depois do commit, com a chave). O texto vai ao operador. **FEITO
            (30/10/2026), com o texto APROVADO pelo operador no mesmo dia** (`app.email.senhaCriada`): *"Uma senha foi
            criada agora para entrar na escola com este e-mail."* e *"Se não foi você, crie uma senha nova em 'Esqueci
            minha senha', na tela de entrar: quem entrou com a senha anterior sai da conta na hora."*, com o botão para a
            tela de entrar. Sai **depois do commit** da transação que grava a senha, só quando ela foi criada
            (`avisarSenhaCriada`), chave `senha-criada/<conta>`. A promessa do texto está provada: o "Esqueci minha senha"
            derruba as sessões de antes (`revokeSessionsOnPasswordReset`; `codigo-por-email.test.ts` já reprova sem
            isso). Teste: `senha-depois-de-pagar.test.ts` (o aviso uma vez, com o texto; a recusa seguinte não manda).
            **Mutação: 3 de 3 reprovaram.**
      - [x] **E17 — sem login, o "em conferência" só para a aba que pagou** *(decisão do operador, 29/10/2026,
            P124)*: nas duas portas sem login, o 409 `PixEmConferencia` só com o código da tentativa do Pix pago
            (`pago.visitante?.resumoDaTentativa === resumoDaTentativa(pedido.tentativa)`); os outros, 409 `Ocupada`,
            sem nunca criar outro pagamento. **FEITO (30/10/2026):** `emConferenciaSoParaQuemPagou`
            (`checkout-do-visitante.ts`, função pura), nos DOIS lugares de cada porta (cartão e Pix sem login): o Pix
            que já estava em conferência e o que entra em conferência ao ser processado ali. Testes:
            `pagar-com-pix.test.ts` (a aba que pagou e as outras, por Pix e por cartão; o Pix processado na hora pelas
            duas portas). **Mutação: 6 de 6 reprovaram** (uma sobreviveu antes — o caminho do cartão processado na hora
            não tinha teste; ganhou).
      **A REVISÃO DO GRUPO 3** (30/10/2026, `security-vulnerability-reviewer`, Opus 5.5, esforço máximo, sobre
      `0af2891..3e4af1d`): **nenhum P0 nem P1.** O E11 só dá o plano a quem pagou exatamente o preço de agora dele (o plano
      e o valor nascem no servidor); o E12 cabe nos 180 s; o E13 só põe o id da conta; o E17 compara o resumo, nunca o
      código, e não cria pagamento. **Três P2** — dois fechados com teste e mutação (6 de 6 reprovaram), um é texto do
      operador:
      - [x] **(P2) O Pix pago segurava uma ligação do banco por até 180 s fora do teto das portas** (no aviso e nas duas
            rotas de conferir): com a Stripe lenta, as 2 ligações livres do gate e das aulas acabariam. **FEITO:** os três
            caminhos pedem a vaga das assinaturas (`comVaga`); cheio, o aviso responde 503 (a Stripe entrega de novo, e a
            rodada do E1 pega o resto) e as rotas de conferir, 204 sem conferir. Testes: `pix-pre-pago.test.ts`,
            `conferir-pela-tela.test.ts`.
      - [x] **(P2) O terceiro caminho do "em conferência" sem login** (a pré-paga incompleta cujo Pix não se lê pago)
            escapava do E17, e o alerta dele saía a cada clique. **FEITO:** decide pela tentativa gravada na própria
            pré-paga (`resumoDaTentativa`), e o alerta sai no máximo a cada 15 min por Pix (`alertarNoMaximoACada15Min`).
            Teste: `pagar-com-pix.test.ts` (as duas portas; um alerta só).
      - [x] **(P2) Quem pagou e perdeu o código da aba** (outra aba, outro aparelho) recebe o 409 `Ocupada`, cuja frase
            (*"Este e-mail já tem uma assinatura em andamento em outra aba. Termine por lá ou aguarde um instante."*) não
            dá saída. **FEITO (30/10/2026), com o texto APROVADO pelo operador junto com o E15:** *"Este e-mail já tem uma
            assinatura em andamento. Termine por onde começou ou aguarde um instante. Se você já pagou, vamos responder
            pelo seu e-mail; se precisar, escreva para suporte@jilsonsantana.com."* — não conta a ninguém que houve
            pagamento, e dá a saída (`assinar.ocupadaOutraAba`).
      - [x] **E18 — o e-mail de confirmação para quem assina logado** *(decisão do operador, 29/10/2026, P127)*:
            sai da sincronia que dá o acesso, uma vez por assinatura (a mesma regra das boas-vindas: depois do
            commit, `enviarEmail`, chave estável), para cartão e Pix. O texto vai ao operador. **FEITO (30/10/2026),
            com o texto APROVADO pelo operador no mesmo dia** (`app.email.confirmada`): no cartão, *"Sua assinatura do
            plano {Mensal|Anual} foi confirmada: você tem acesso a todos os cursos e trilhas. Ela renova sozinha {todo
            mês|todo ano}, até você cancelar."*; no Pix, *"Seu Pix foi confirmado: você tem acesso a todos os cursos e
            trilhas até o dia {data}."*; botão "Ir para a escola" (`/inicio`). **Como:** é mais um e-mail da MESMA regra
            dos da cobrança (`emailDevido`, `avisos-da-assinatura.ts`), com a marca `CONFIRMADA` (migration
            `20261030120000_email_de_confirmacao`, que só acrescenta o valor ao tipo) — uma vez por assinatura, depois
            do commit, e a rodada de hora em hora manda a que falhou no aviso. **Só a assinatura viva que nasceu há
            menos de 2 dias** (`JANELA_DA_CONFIRMACAO_EM_MS`): quem já assinava antes da publicação, ou renova, nunca a
            recebe. **A de quem assinou sem conta não recebe** (as boas-vindas já confirmam): a marca fica consumida
            quando as boas-vindas da ficha ainda não saíram ou saíram depois de a assinatura nascer; quem assinou sem
            conta e depois assina de novo logado recebe. O plano vem dos metadados (Pix) ou do intervalo do preço
            (cartão — `paraAssinaturaNaStripe`). A prévia (`email:previa`) monta os três. Testes:
            `avisos-da-assinatura.test.ts` (+8) e `stripe.test.ts` (+1). **Mutação: 12 de 12 reprovaram** (uma
            sobreviveu antes — a leitura do plano pelo intervalo não tinha teste; ganhou).
      **A REVISÃO DO GRUPO 4** (30/10/2026, `security-vulnerability-reviewer`, Opus 5.5, esforço máximo, sobre
      `d2c4a12..50c508e` — E15, E16, E18, E14): **nenhum P0.** Conferidos sem achado: no E14, a conta e a assinatura saem só da
      sessão, o corpo só leva o CPF, o plano e o preço são do servidor, a ordem encerrar → anular, a cobrança paga no instante,
      o espelho por um escritor só, as duas abas; no E16, o e-mail depois do commit e uma vez; no E18, a marca e a chave, sem
      dobrar com as boas-vindas; a API aditiva, os pedaços do app e nenhum alerta novo que um anônimo dispare. **Um P1, que era
      decisão do operador:** a regra escrita dizia que só o reembolso mantém a pessoa logada ao perder as aulas, e o código já
      tinha o cancelar da atrasada (decisão dele, 11/10/2026) — e agora o Pix da atrasada, sem o qual quem ainda está nos 3
      dias sai da conta no meio do QR. **Respondida (P131, 30/10/2026): "Manter logada".** A regra passou a listar as três
      operações (`CLAUDE.md` → Access Architecture, `assinaturas.ts`, `billing.md`). *Reabre se ele preferir que perder as
      aulas sempre deslogue.* **Quatro P2/P3, fechados com teste e mutação (8 de 8 reprovaram):**
      - [x] **(P2) Encerrada e a sincronia falhou** (Stripe lenta): com o espelho velho ("ainda tem aulas", nos 3 dias), a porta
            do Pix respondia "já é assinante", sem QR e com o cartão já encerrado. **FEITO:** confere de novo (mantendo a
            sessão); sem conseguir, 409 `Ocupada` (tentar de novo), nunca "já é assinante".
      - [x] **(P2) A marca gravada ANTES do encerramento** ficava se ele falhasse, e calaria o "terminou" de um fim de verdade,
            meses depois. **FEITO:** "trocada pelo Pix" agora é o comentário do PRÓPRIO encerramento (encerrada E com o
            comentário — `COMENTARIO_DA_TROCA_POR_PIX`); a marca saiu. Medido de novo na área restrita. Isso também fecha o
            terceiro achado (a chave de repetição da marca), que a prova já tinha encontrado.
      - [x] **(P3) O aviso de senha criada que falha ao ser montado** (os textos que não vêm do banco) derrubava o 200 já
            ganho: a senha gravada, a sessão sem abrir. **FEITO:** nunca lança — vira alerta `[email]`.
      - [x] **(P3) O CPF ia para a ficha sem a trava da conta:** duas abas juntas trocariam o número as duas. **FEITO:** com a
            trava da conta; ocupada, 409 `Ocupada`.
      **A REVISÃO DE SEGURANÇA DO GRUPO 1** (29/10/2026, `security-vulnerability-reviewer`, Opus 5.5, esforço máximo,
      sobre `76742f9..bdcc04b`): **nenhum P0.** Dois P1 da mesma causa — **dois alertas novos que um robô dispara à
      vontade** (o do E5, com um cabeçalho de mentira de formato certo; o do E3, sem login): juntos, uns 192 por dia
      por cópia contra o teto de 150 do Sentry, e os alertas que importam (pagante trancado, Pix sem acesso) deixam de
      chegar; e o do E5 contradizia a regra escrita do `CLAUDE.md` ("aviso com assinatura trocada" nunca é `error`).
      Cinco P2: o E1 leria errado um aviso de fatura num formato antigo da API e o marcaria (a reentrega de verdade
      viraria "repetido"); a falha da Stripe na conferência pedida pela tela (E2) vira um alerta por pedido; a
      conferência pulava a cancelada com dias pagos; e dois que dependem do operador — a ficha do visitante que fica
      com a última tentativa quando a assinatura não traz o resumo (já existia; vira P0 com as ações da 4.7b) e a
      rodada parada que não avisa ninguém. **Decisão do operador (29/10/2026): corrigir os 2 P1 e os 3 P2 do código
      do grupo, uma revisão curta só das correções, e publicar.**
      - [x] **C1 — o alerta do E5 só com a Stripe confirmando** que o aviso recusado existe na conta (o `id` do corpo,
            `events.retrieve`; no máximo uma conferência por minuto por cópia): forjado continua `warn`, como manda o
            `CLAUDE.md`. A rodada (E1) continua achando o segredo trocado pela API, sem depender disto. **FEITO
            (29/10/2026):** `idDoAvisoNoCorpo` (função pura: só `evt_` e letras e números, corpo até 512 KB) e
            `avisoExisteNaStripe` (`stripe.ts`; `resource_missing` = forjado; a Stripe sem responder = não, com
            registro); na rota, uma pergunta por minuto e um alerta a cada 15 min, os dois por cópia. O `CLAUDE.md`
            (*Server*) ganhou a razão: alerta que um anônimo dispara cala os outros. Testes: `stripe-webhook.test.ts`
            (os do E5 reescritos, +2: o forjado e o limite de perguntas), `stripe.test.ts` (+2),
            `avisos-da-stripe-rede.test.ts` (+3). **Mutação: 5 de 5 reprovaram.**
      - [x] **C2 — o alerta do E3 no máximo a cada 6 h por cópia**, com quantos relatos e de quantos endereços (a marca
            do endereço) desde o último; a marca também na linha de registro. **FEITO (29/10/2026):**
            `contarRelatoDoCampo` (`billing.ts`; até 1.000 endereços contados entre dois alertas). Teste:
            `campo-nao-abriu.test.ts` (o primeiro reescrito: 1 alerta, os de menos de 6 h no registro com a marca e sem
            o IP, e o alerta seguinte com "3 relato(s) de 2 endereço(s)"). **Mutação: 4 de 4 reprovaram.**
      - [x] **C3 — o formato da API:** a rodada não processa (nem marca) aviso de fatura sem o `parent` (formato
            anterior à `2025-03-31.basil`) e alerta; a subida (E4) confere a versão da API do endereço de avisos contra
            a da biblioteca (`Stripe.API_VERSION`). **FEITO (29/10/2026):** `avisoEmFormatoAntigo` (`stripe.ts`, função
            pura) — a rodada o pula sem marca, registra cada um e alerta uma vez (`formatoAntigo` na conta da rodada e
            na linha do job); `versaoServeAoSite` (`conferencia-da-cobranca.ts`): **a mesma linha da biblioteca
            (`.endive`), numa versão igual ou mais nova** — as mensais de uma linha não quebram nada, e exigir a exata
            daria alarme a cada subida com o endereço na "mais recente" do painel; a padrão da conta (sem versão
            própria) não serve. A versão da biblioteca mora num lugar só (`VERSAO_DA_API`, `stripe-cliente.ts`). O
            passo a passo da troca: `billing.md` → *A versão do endereço de avisos*. Testes: `avisos-perdidos.test.ts`
            (+1, e a conta nova nos outros 6), `stripe.test.ts` (+1), `conferencia-da-cobranca.test.ts` (+2).
            **Mutação: 9 de 9 reprovaram.** **A versão do endereço de produção não é conhecida:** a primeira subida
            depois da publicação diz (sem alerta, ela serve). *Docs check (context7): Stripe → `/websites/stripe` → 2
            consultas (o endereço sem versão própria recebe na da conta, e outra versão exige endereço novo; as mensais
            de uma linha sem quebra).*
      - [x] **C4 — a conferência pedida pela tela que falha** responde 204 do mesmo jeito, registra, e alerta no
            máximo uma vez a cada 15 min por cópia. **FEITO (29/10/2026):** `conferirPelaTela`
            (`server/src/lib/conferencia-pela-tela.ts`), nas duas portas (`/billing/conferir` e
            `/billing/visitante/conferir`): a falha volta `null`, e o registro diz de quem (a conta ou a ficha) e o
            motivo; o limite do alerta é um só para as duas portas, por cópia (protege a cota de alertas da cópia, como
            os do E3 e do E5). Teste: `conferir-pela-tela.test.ts` (+1: 204 nas duas portas, sem 500 nem `[api]`, um
            alerta em 15 min, o relógio que volta, e nada muda). **Mutação: 9 de 9 reprovaram.**
      - [x] **C5 — a conferência pula só a `incomplete_expired`** (a cancelada com dias pagos ainda dá acesso pelo gate).
            **FEITO (29/10/2026):** `ENCERRADAS_NA_CONFERENCIA` (`assinaturas.ts`) só com ela. A cancelada sempre já
            foi paga (cancelar a incompleta a leva para `incomplete_expired` — `cancelarIncompleta`) e a lista é das
            últimas 20: a ida a mais à Stripe é limitada, e só para quem está sem acesso. Teste:
            `conferir-pela-tela.test.ts` (+1: a cancelada com dias pagos volta a dar acesso; o teste do E2 passou a
            pular a que expirou). **Mutação: 3 de 3 reprovaram.**
      **A REVISÃO CURTA DAS CORREÇÕES** (29/10/2026, `security-vulnerability-reviewer`, Opus 5.5, esforço máximo, sobre
      `bdcc04b..ee50f08`): **nenhum P0 nem P1** — C1, C4 e C5 fecham os achados sem abrir outro, e C2 e C3 fecham o
      problema que os motivou; nenhum alerta novo que um anônimo dispare à vontade, nenhuma ida à Stripe que ele
      multiplique, e nada novo no registro além de ids, tipos, versões e a marca do endereço. **Dois P2 e quatro P3,
      fechados por decisão do operador (29/10/2026: *"fechando P1, P2, P3 e seguindo em frente"*), com teste e
      mutação e sem nova revisão — mutação: 11 de 11 reprovaram:**
      - [x] **R1 (P2) — a versão do endereço depois de uma atualização pequena da `stripe`:** cada versão pequena da
            biblioteca fixa a mensal nova da MESMA linha, e o endereço criado hoje ficaria "mais velho" — alerta em
            toda subida, empurrando uma troca de segredo desnecessária. **FEITO:** `versaoServeAoSite` aceita
            qualquer versão da linha da biblioteca; outra linha, versão sem linha e a padrão da conta continuam
            alertando. E a subida escreve "a cobrança confere" quando tudo passa — sem isso, nenhum alerta não
            distingue o certo do parado.
      - [x] **R2 (P2) — o alerta do campo que não abriu saía no 1º relato** ("1 de 1", que o texto manda ler como "não
            é defeito nosso") e calava a cópia por 6 h justamente quando muitos falham. **FEITO:** o alerta sai
            quando, numa janela de 6 h, os relatos vêm de 3 endereços diferentes; no máximo 1 a cada 6 h por cópia;
            um aluno sozinho fica no registro (a tela já lhe diz o que fazer).
      - [x] **R3 (P3) — a marca do endereço era do IP inteiro**, e o limite agrupa o IPv6 por /56: um robô num bloco
            forjava "muitos endereços". **FEITO:** a marca sai da chave do limite (`enderecoDoPedido`).
      - [x] **R4 (P3) — a conferência pela tela sincronizava também a cancelada já acabada**, que nunca dá acesso — o
            caso comum de quem paga por Pix (cada pré-paga vira cancelada). **FEITO:** a lista traz o fim do período
            (`fimDoPeriodo`, o maior `current_period_end` dos itens), e a cancelada acabada não vai à Stripe; sem a
            data, vai (o lado seguro). O comentário "ela sempre já foi paga" saiu: quem diz se houve pagamento é o
            "pago até", nunca o status.
      - [x] **R5 (P3) — o aviso de fatura em formato antigo voltava em toda rodada por 3 dias**, e o efeito dele se
            perdia. **FEITO:** a rodada relê a fatura pela API (`comAFaturaRelida`, na versão do site, com o
            `parent`) e processa; a releitura que falha é falha como qualquer outra, sem marca. O alerta "formato
            antigo" saiu (não sobra nada sem processar).
      - [x] **R6 (P3) — a única pergunta por minuto do E5 é gasta por qualquer pedido de formato certo:** com o
            segredo de fato trocado, um robô adia o alerta imediato. **ACEITO, sem mudança** (a primeira opção do
            revisor): a rodada (E1) acha o segredo trocado em até uns 70 min, sem depender disto. *Reabre se o
            alerta do segredo trocado chegar atrasado na prática, ou se for preciso o alerta imediato à prova de
            robô — aí, só perguntar à Stripe pelos endereços de IP dela, uma lista a manter no código.*
      Testes: `conferencia-da-cobranca.test.ts`, `campo-nao-abriu.test.ts` (+2: os relatos espalhados no tempo e o
      robô num bloco IPv6), `stripe.test.ts` (+1), `conferir-pela-tela.test.ts`, `avisos-perdidos.test.ts` e
      `avisos-da-stripe-rede.test.ts` (+3).
      - [x] **P128 — as conferências da subida rodam ANTES de abrir a porta** *(decisão do operador, 30/10/2026, entre
            isso, o processador sempre ligado — uns US$ 45 por mês — e calar a falha)*. Achado na publicação `f36e274`:
            a conferência do fuso do banco esgotava o tempo da conexão em 7 de 11 subidas desde 27/10, cada uma com um
            alerta à toa — no Cloud Run, depois de a porta abrir e sem pedido, quase não há processador; durante a
            subida, há. **FEITO (30/10/2026):** `conferirNaSubida` (`server/src/lib/conferencias-da-subida.ts`),
            esperada no `index.ts` antes do `listen`: o fuso do banco e, em produção, a cobrança, uma depois da outra,
            cada uma com um teto de 15 s (a espera do Google na subida é de 240 s) — a que passa do teto fica no
            registro e a subida segue; a que falha depois do teto também fica no registro, sem alerta. Teste:
            `conferencias-da-subida.test.ts` (novo, 6). **Mutação: 5 de 5 reprovaram.** *Sem teste:* a chamada no
            `index.ts` (a subida não roda na suíte); a prova é o registro da próxima subida no ar — sem a falha do fuso,
            e com a linha "a cobrança confere". *Reabre se a falha continuar depois desta mudança: a causa é outra, e
            aí as opções são o processador sempre ligado ou levar as conferências para a rodada de hora em hora.*
      **A REVISÃO DO GRUPO 2** (30/10/2026, `security-vulnerability-reviewer`, Opus 5.5, esforço máximo, sobre
      `f36e274..e34c0b5` — os R1 a R6, o E8, o E10, o E9, o E6, a P128 e o E7): **nenhum P0 nem P1.** Ninguém consegue
      cancelar a assinatura de outra pessoa; o E8 não recusa pedido legítimo; o E10 só toca molduras de fora; a P128 não
      trava a subida; o E6 não tira acesso de quem pagou; o E9 não entra em laço. **Três P2 e nove P3, fechados com teste
      e mutação, sem nova revisão** (regra do operador de 29/10/2026) — **mutação: 14 de 15 reprovaram; a que passou era
      uma linha repetida (equivalente), que saiu:**
      - [x] **(P2) O INQUÉRITO cortava e cancelava como a contestação.** O banco abre o inquérito por
            `charge.dispute.created` (`warning_*`): só pergunta, o dinheiro não sai e ainda dá para devolver sem taxa
            `[FATO — docs da Stripe, context7, 30/10/2026]`. **Decisão do operador, 30/10/2026: "inquérito só alerta"** —
            o corte e o cancelamento acontecem quando o dinheiro sai (`charge.dispute.funds_withdrawn`, que a Stripe manda
            também quando o inquérito vira contestação). `Contestacao.fase` (`inquerito`, `aberta`, `dinheiro-saiu`); só o
            dinheiro que saiu leva o pagamento ao processamento; os outros dois só alertam (`[stripe] inquérito …`, com
            "devolver o dinheiro agora, sem taxa"; `[stripe] contestação … quando o dinheiro sair da conta`).
            `AVISOS_DO_ENDERECO` agora tem 11 — **a P130, feita pelo operador em 30/10/2026** (conferida pelo print dele: o
            endereço com os 11 avisos, na `2026-09-30.endive`).
      - [x] **(P2) Nenhum teste cobria "a marca gravou e o cancelamento falhou".** Agora cobre: a falha sobe, sem a mensagem
            crua, e o aviso volta (`stripe-reembolso.test.ts`).
      - [x] **(P2) O que só se confere nos painéis:** a regra de alerta do Sentry para as quatro origens da reserva
            (`stripe`, `email`, `avisos`, `monitor`) e o alerta de "a rodada não rodou" (o E6 depende da rodada das 12h
            UTC) — entraram na P126.
      - [x] **(P3) A chave de repetição fixa** guardava a falha da Stripe por 24 h: agora leva a janela de 5 min, como a da
            devolução.
      - [x] **(P3) O alerta dizia "acesso cortado" sem olhar o resultado:** agora diz o status da assinatura e se a conta
            perdeu o acesso — ou "não perdeu por aqui" (outra assinatura, como a pré-paga de um Pix).
      - [x] **(P3) A contestação fazia até 5 idas à Stripe com o tempo de transação de uma:** usa o tempo das operações
            (`TEMPO_DA_OPERACAO`).
      - [x] **(P3) A fatura em aberto da atrasada contestada** agora é anulada depois do cancelamento (como no cancelar do
            aluno); se não der, é alerta, e o cancelamento vale.
      - [x] **(P3) O aviso diário do descarte** passava pelo mesmo limite: tem vaga própria, acima do teto (uma vez por dia).
      - [x] **(P3) A configuração da cobrança ausente** alertava a cada pedido sem login (e no endereço de avisos): agora no
            máximo uma vez a cada 15 min por cópia (`alertarConfiguracaoAusente`, `lib/alerta-de-configuracao.ts`).
      - [x] **(P3) A falha ao processar um aviso da Stripe** saía como `[api]`, fora da reserva: agora `[stripe]`
            (`erro-da-api.ts`).
      - [x] **(P3) Sem `Sec-Fetch-Site`** (o Safari antes do 16.4; o piso é o iOS 15), o pedido passava: agora decide o
            `Origin` — só o do próprio site (o `BETTER_AUTH_URL` e os do login); o `null`, recusado.
      - [x] **(P3) O E6 e o R4 repetiam partes da regra do gate:** agora usam as do próprio `acesso.ts` (`STATUS_VIVOS`,
            `encerradaDeVez`, `assinaturaDaAcesso`).
      Testes: `contestacao.test.ts` (as três fases; a conta com outra assinatura), `stripe.test.ts`,
      `stripe-reembolso.test.ts` (+3), `monitor.test.ts` (+1), `erro-da-api.test.ts` (+1), `codigo-por-email.test.ts` (+1),
      `alerta-de-configuracao.test.ts` e `configuracao-ausente.test.ts` (novos). *Docs check (context7): Stripe →
      `/websites/stripe` → 1 consulta (o inquérito chega por `charge.dispute.created`, sem tirar o dinheiro; ao virar
      contestação, `charge.dispute.funds_withdrawn`).*
      **As decisões do operador:** P116 a P127 em `pendencias.md` (P126 são as conferências fora do repositório).
      **Respondidas em 29/10/2026:** P116 (a frase do E3), P117 (os botões do Pix em conferência na 4.7b), P118
      (o E14), P119 (o E15), P120 (a ação "Liberar acesso pago por fora" na 4.7b), P121 (a ação "Corrigir o e-mail" na 4.7b), P122 (a contestação corta o acesso — E7), P123 (o E16), P124 (o E17), P127 (o E18). **Para depois:** P125 (quando for criar um desses códigos) e P126 (as conferências nos painéis, por prints).
      **Riscos aceitos que os revisores citaram, sem mudança:** a API fora do "Em breve"; a cota da Stripe sem cache
      de preços; o reembolso repetido; o teto por endereço num Wi-Fi compartilhado; o cartão de fora do Brasil.
      **Menores (P3), registrados sem pedido agora:** o Pix some da tela sem alerta se a configuração faltar
      (`vitrine-da-assinatura.ts`); "Seu pagamento não se perde" aparece também para quem fechou o QR sem pagar;
      sem `sessionStorage`, logo depois de pagar sem conta a pessoa cai na tela de entrar, sem explicação; o anual
      por Pix (R$ 995) está logo abaixo do limite de Pix noturno dos bancos (R$ 1.000, das 20h às 6h) — **se o
      preço do anual subir, o Pix à noite pode falhar no banco**; os gatilhos de reabertura aceitos ("muitos ao
      mesmo tempo", 429 da Stripe) só aparecem no registro.
      **Conferido no banco de produção (branch `production`), só leitura, 29/10/2026:** nenhum registro do modo de
      teste em `subscription`, `stripe_customer` e `guest_checkout` (o gate não lê `livemode` — a verificação que o
      revisor de segurança deixou pendente).
      **O roteiro "quando um aluno não conseguir pagar"**, com o que existe hoje: `billing.md` → *Quando um aluno não
      conseguir pagar* (rascunho do agente, a revisar pelo operador).
      *Docs check (context7): Stripe → `/websites/stripe` → o revisor geral, 3 consultas (o aviso que falha e o
      e-mail da Stripe; a assinatura com "enviar fatura"; o Pix em fatura); o agente, 1 (o Workbench → Webhooks,
      para guiar a P112).*
- [ ] **4.10 — Fechamento da fase (código + painel).** **O E2E de assinar abre o campo DE VERDADE
      da Stripe e paga com o cartão de teste** — na 4.2 o campo não abria e nenhum teste acusou,
      porque todos usam um dublê; o roteiro que provou está descrito no item 4.2 (passo 6). E2E de ponta a ponta (assinar, renovar, cancelar,
      pagamento falho com as aulas abertas por 3 dias e trancadas depois — etapa 4.6b) · a régua de
      inadimplência no painel (Smart Retries e as automações de recuperação) · revisão de segurança
      da fase inteira. *(Revisto em 10/10/2026: as chaves de verdade entram já na etapa 4.3 — não há
      mais troca no lançamento.)* ~~**A troca para as chaves de verdade fica no GO-LIVE (Fase
      7).**~~ *(Frase de antes da revisão de 10/10/2026, logo acima.)*
      **Da lista antiga do fim da fase (reconciliada em 19/10/2026), o que faltava e entra aqui:**
      - [ ] os E2E de assinar, renovar, cancelar e do pagamento que falha (a caixa "E2E: assinar →
            acesso liberado…", abaixo) e os dois que faltam do "E2E full-stack": o checkout com o
            cartão de teste e o cancelamento;
      - [ ] no painel da Stripe, as novas tentativas e as automações de recuperação (a caixa
            "Configurar Smart Retries…", abaixo): as tentativas por 2 semanas (com a P60) e se os
            e-mails de cobrança da própria Stripe, desligados desde a 4.3, continuam assim.

> **Os itens abaixo continuam sendo a ESPECIFICAÇÃO da fase** (as travas, os casos de teste, as
> decisões); as etapas acima dizem em que ordem e em que sessão cada um entra. **Reconciliado em
> 09/10/2026:** o *pré-requisito de separar o banco de dev do de produção* está **cumprido** desde a
> mudança para o Neon (Set 2026 — produção, dev e teste em bancos diferentes, *CLAUDE.md →
> Database & Migrations*); e o *follow-up do "Automatic RLS"* ficou **sem objeto** — era do Supabase,
> que foi apagado.
> **Reconciliado de novo em 19/10/2026, caixa por caixa** (conferido no código e no
> `build-history.md`): cada caixa feita está marcada com a etapa que a fez; o que faltava entrou na
> **etapa 4.10** (os E2E da cobrança e a configuração das novas tentativas no painel) ou já estava
> na **4.7** (a conta que nasce no pagamento, o e-mail). **Nenhuma caixa aberta ficou nesta lista**;
> o texto de cada uma continua aqui, como especificação e registro.

- [x] **ESLint entra AQUI** *(feito em 10/10/2026 — é a etapa 4.5, acima; as três regras valem também no `core` e no `e2e`, e a do `any` nos quatro workspaces)* (gatilho registrado em `CLAUDE.md` → changelog Ago 2026 (11)):
      typescript-eslint, escopo inicial `server/src`, **bloqueante no CI**, 2–3 regras. A que se
      justifica sozinha é **`no-floating-promises`** — promise não aguardada escapa do `try/catch`,
      vira *unhandled rejection* e pode derrubar o Node **dentro do handler de webhook da Stripe**;
      typecheck passa, teste passa, cai em produção. O nome `lint` está livre desde o Bloco 0.
      **Por que não antes:** trazer o ESLint agora seria limpar avisos em código que já funciona,
      com zero aluno — não passa no critério de decisão de stack. Aqui ele entra junto do código
      que a regra protege.
- [x] **PRÉ-REQUISITO DA FASE — separar o banco de DEV do banco de PRODUÇÃO.** *(CUMPRIDO desde
      Set 2026, na mudança para o Neon: produção no branch `production`, dev no branch `dev`, teste
      no Postgres local — `CLAUDE.md` → *Database & Migrations*, que guarda também a regra dos três
      caminhos até o banco. O texto abaixo é o registro de Ago 2026, com os projetos do Supabase,
      apagado em Set 2026.)*
      **[FATO, Ago 2026] O ambiente local aponta hoje para o MESMO projeto que o Railway serve.**
      Evidência: os usuários semeados na Fase 1 (admin + member) e as **39 sessões de
      desenvolvimento** deles vivem no banco de produção `gaxmbnhwltljlkukdwba`. *As sessões em si
      são normais — o achado é a **LOCALIZAÇÃO** delas.*
      **Por que isto vira bloqueio agora e não antes:** a partir desta fase o banco passa a ter o
      **espelho de `Subscription`**. Um `migrate reset` com o `.env` errado deixa de ser "perdi meu
      seed" e passa a ser **apagar o estado de acesso de quem paga**.
      **Resolução:** o projeto **`mvaobzypsiuhqzipcelw`** ("Jilson Santana Test") serve **dev E
      teste**; produção fica sozinha no `gaxmbnhwltljlkukdwba`, alcançável só pelo Railway.
      **REGISTRAR (é o ponto que a trava não cobre): existem TRÊS caminhos até o banco — (1) Vitest
      via `globalSetup`, (2) chamada de MCP, (3) comando digitado à mão — e SÓ O PRIMEIRO tem trava
      automática** (a checagem do `TEST_DB_REF`, CLAUDE.md → Database & Migrations). MCP recebe o
      `project_id` como argumento e comando manual lê o `.env` que estiver lá: nos dois, a única
      proteção é **declarar contra qual ref se está apontando antes de rodar**. Não inventar trava
      para (2) e (3) — inventar guarda que não segura é o defeito do `lint` que mentia; o que vale
      aqui é a disciplina explícita.
      **Preparo do banco de teste — estado em Ago 2026:**
      - [x] Projeto criado (`mvaobzypsiuhqzipcelw`, us-east-1, Postgres 17.6.1.155). **Data API
            DESLIGADA** (PostgREST não participa da arquitetura — o acesso é Prisma via
            `DATABASE_URL`) e **"Automatic RLS" também desligado de propósito**, pra que o RLS entre
            por **migration versionada** igual em produção: trigger fazendo isso por fora criaria
            divergência entre teste e produção.
      - [x] `server/.env.test` criado (**esqueleto, valores em branco**) + cobertura no
            `.gitignore` — o padrão era só `.env`, que **não** casa com `.env.test`; agora é
            `.env` + `.env.*` + `!.env.example`. Verificado com `git check-ignore`.
      - [x] `server/.env.test` preenchido e **conectando pelo POOLER** (`postgres.<ref>@aws-0-us-east-1.pooler.supabase.com`, 6543/5432), igual a produção. **Não usar o host da aba "Direct" do painel** — ver `CLAUDE.md` → Database & Migrations; foi o que travou esta fatia por horas.
      - [x] ⚠️ **INCIDENTE DE CREDENCIAL (Ago 2026) — RESOLVIDO.** As `SEED_*` foram **copiadas de
            `server/.env`** para o `.env.test`, então a senha do admin de teste **era a mesma de
            produção**: o vazamento não ficou contido no ambiente barato. Ele aconteceu porque o
            arquivo estava **ABERTO no editor** — a notificação de mudança do IDE despeja o
            **conteúdo** no contexto do agente, sem ninguém colar nada no chat. **Rotação concluída
            nos DOIS ambientes** com senhas novas, independentes (conferido por hash: diferentes),
            sign-in provado em cada usuário e **0 sessões ativas** nos dois bancos. Também
            rotacionada a senha do Postgres do projeto de teste. As duas convenções que saíram
            disto estão no `CLAUDE.md` → *Secrets in agent sessions*: **cada ambiente nasce com
            credencial própria** e **arquivo de segredo aberto no editor entra no contexto do
            agente**. Ferramenta: `server/src/rotate-credentials.ts` (o `seed.ts` é create-only
            para senha — não serve para rotacionar).
      - [x] Migrations aplicadas no banco de teste com **`prisma migrate deploy`** (NÃO
            `migrate dev` — o histórico já está definido). **Receita sem dependência nova** (o
            `dotenv/config` do server só lê `.env`, e o Prisma CLI não sobrescreve variável já
            exportada):
            ```bash
            cd server
            set -a && . ./.env.test && set +a     # exporta o ambiente de TESTE
            npx prisma migrate deploy
            npx tsx src/seed.ts
            ```
            **PEGADINHA verificada na execução:** o Prisma imprime *"Environment variables loaded
            from .env"* **mesmo quando as variáveis exportadas do `.env.test` é que estão valendo**
            (ele carrega o `.env`, mas `dotenv` não sobrescreve variável já presente no ambiente). A
            linha que diz a verdade é a do **`Datasource`**, que mostra o host real — foi ela que
            confirmou `db.mvaobzypsiuhqzipcelw.supabase.co`. **Não ler a primeira linha como se
            fosse a resposta.** Some daí a guarda explícita de ref antes de cada `deploy`.
            **Nota sobre o `.env` de PRODUÇÃO: ele NÃO pode ser lido com `. ./.env`** — a
            `DATABASE_URL` do pooler tem `?pgbouncer=true&connection_limit=1`, e o `&` quebra o
            shell (`parse error near '&'`). Para produção, deixe o **próprio Prisma** carregar o
            `.env` e faça a guarda por `grep -c "<ref>" .env` (conta ocorrências sem imprimir
            segredo; lembre que `grep -c` sai com código 1 quando o resultado é zero).
            **O `cd server` não é estilo, é obrigatório — MEDIDO em Ago 2026, não inferido:** da
            raiz do monorepo, `npx prisma <cmd>` falha com *"Could not find Prisma Schema"*.
            **A correção óbvia NÃO resolve:** declarar `"prisma": {"schema": ...}` no
            `server/package.json` **não muda nada da raiz**, porque o CLI lê o `package.json` mais
            próximo do **CWD** — da raiz, esse é o `package.json` da raiz. E declarar no
            `package.json` **da raiz** resolve o schema mas **para no passo seguinte**:
            `Environment variable not found: DIRECT_URL`, porque o Prisma carrega `.env` relativo ao
            CWD e o nosso `.env` mora em `server/`. *(A chave **foi** adicionada ao
            `server/package.json` — ela deixa o caminho do schema **explícito**, o que vale por si;
            só não é o conserto do comando da raiz, e este parágrafo existe pra ninguém tentar de
            novo achando que é.)*
            **Consequência que vale manter:** rodar Prisma da raiz **não funciona**, e isso é um
            freio acidental útil — o caminho (3), "comando digitado à mão", é o único sem trava
            automática, e hoje ele **obriga** a passar por `server/`, onde o `.env` escolhe o banco.
            Se um dia virar script de conveniência, o script tem que fixar o ambiente
            (`--env-file=.env.test`), nunca herdar o que estiver no `.env`.
      - [x] **Paridade verificada — e foi ela que pegou o furo do RLS.** Estado final **idêntico nos
            dois bancos**: 11 tabelas em `public`, **0 sem RLS**, 4 migrations aplicadas, 0
            rollbacks, advisors só INFO `rls_enabled_no_policy`. A divergência encontrada no caminho
            (`_prisma_migrations` com RLS em produção e sem no teste) virou o backlog P2 nº (5)
            reaberto e a migration `20260824214838_rls_prisma_migrations_table` — ver Fase 7.
            Confirmado o que o item já mandava: divergência se corrige **por MIGRATION**, nunca por
            comando avulso no painel, senão não viaja pro git.
      - [x] **Usuários semeados presentes no banco de teste** — admin + member (2 users, 2 contas
            `credential`), com as credenciais **já rotacionadas** e sign-in provado. Não foi preciso
            re-rodar o seed: ele havia rodado antes, e de todo modo `seed.ts` é **create-only para
            senha** (retorna cedo se o usuário existe), então quem troca credencial é o
            `rotate-credentials.ts`, não ele.
      - [x] **SEM OBJETO desde Set 2026:** era uma chave do Supabase, que foi apagado (nota acima
            da lista, 09/10/2026). O texto, como registro:
            **(follow-up, decisão do operador) O "Automatic RLS" está LIGADO em produção e DESLIGADO
            no teste — isso é divergência viva, não histórica.** Ela não afeta tabela nossa (toda
            migration nossa liga o RLS explicitamente), mas afeta qualquer tabela criada **fora** das
            migrations — que foi exatamente o caso da `_prisma_migrations`. Enquanto os dois projetos
            divergirem nessa chave, produção continua "se consertando sozinha" em silêncio e o teste
            não, o que é justamente o que esconde o próximo furo. Opções: desligar em produção (os
            dois passam a depender só do versionamento, que é a convenção) ou ligar no teste (os dois
            mentem juntos). **Recomendo desligar em produção**; é mudança de configuração no
            fornecedor, então é chamada do operador.
- [x] **DECISÃO REGISTRADA — usuários semeados (admin + member de teste) são PERMANENTES e existem
      em TODOS os ambientes, produção inclusive.** O **admin é obrigatório** (`disableSignUp: true`
      — não há outro caminho para criar o primeiro usuário). O **member de teste em produção recebe
      acesso via assinatura REAL na Stripe com cupom de 100%** — **NUNCA** via bypass no
      `temAcessoAtivo()`, flag de "usuário de teste" no `User`, ou exceção por e-mail.
      **Razão:** o gate tem **fonte única e caminho único**. Um segundo caminho "só para teste" é
      **porta sem revisão que sobrevive ao motivo que a criou** — e é a única classe de bug que
      libera acesso sem pagamento sem nenhum erro aparecer.
      **Efeito colateral desejável:** o mesmo mecanismo (cupom de 100% na Stripe) já serve para
      **assinaturas cortesia** e para **promoções** (Black Friday, founding member) — não é
      concessão, é o caminho normal.
      *Sem gatilho de reabertura — arquitetural.*
      **Cumprida na etapa 4.3 (10/10/2026):** o `member@` de produção assina com um código de
      100% da conta de verdade, e o gate não tem desvio nenhum (`build-history.md` → 4.3).
- [x] **Na Stripe, "quando todas as tentativas de cobrança falharem" = CANCELAR a assinatura (ou
      marcar como `unpaid`), NUNCA "deixar como vencida"** *(achado da revisão de segurança,
      29/09/2026)*. A regra do gate libera `past_due` sem olhar a data (é a janela de novas
      tentativas, decisão de Ago 2026); ela só acaba se a Stripe tirar a assinatura de `past_due`.
      Deixada como vencida, o aluno fica com acesso para sempre sem pagar, e nenhum código nosso
      percebe. Conferir no painel antes do primeiro aluno pagante.
      **Configurado pelo operador** na área restrita (etapa 4.0) e na conta de verdade (etapa 4.3),
      pelos prints dele; a decisão de 10/10/2026 fechou em **cancelar** — nunca "marcar como não
      paga" (`billing.md` → *Régua de inadimplência*). **A conferência final no painel** —
      "cancelar" nos dois lugares e as tentativas por 2 semanas — **é a P60**, condição do passo 8
      da etapa 4.7. *(Desde 12/10/2026 o gate não libera mais `past_due` sem olhar a data: são 3
      dias depois da cobrança que falhou, e a atrasada que continua atrasada não ganha data nova —
      etapa 4.6b. A opção do painel continua importando: é ela que faz "Reativar assinatura"
      funcionar.)*
- [x] **Setup no dashboard (sem código):** Payments Plano Padrão (conta MEI/CNPJ, payout Banco do Brasil) + **Stripe Billing ativado**. Produto **"Assinatura"** com **2 `Price`**: Mensal R$99,90 (sem fidelidade) / Anual ~R$995 (~17% off). Sem free trial *(conteúdo grátis, só a prévia grátis de aula — decisão do operador, 27/09/2026; não é configuração da Stripe)*. **Sem Customer Portal.**
      *(FEITO pelo operador: na área restrita na etapa 4.0 e na conta de verdade na etapa 4.3 — o
      produto "Assinatura Jilson Santana", os 2 preços com as lookup keys `assinatura_mensal` e
      `assinatura_anual`, R$ 99,90 e R$ 995; `build-history.md` → 4.0 e 4.3.)*
- [x] ~~**Preços em dólar pelo país do cartão · preço mostrado × cobrado em outra moeda · decisão
      de imposto internacional · "idioma é filtro, não portão" · botão de assinar das páginas em
      inglês · conta de receita em dólar**~~ — **CANCELADOS em 12/10/2026** (decisão do operador:
      a escola é só em português e só para o Brasil; cobra só em reais — etapa 4.6c). O texto
      antigo: `git show e62ec0c:docs/implementation-plan.md`.
- **→ Na etapa 4.10 (reconciliado em 19/10/2026):** **Configurar Smart Retries + automações de recuperação** conforme a política de produto abaixo. Isto é **configuração, não código**.
      *(Já decidido: as tentativas por 2 semanas — `billing.md` → *Régua de inadimplência*, com a
      conferência na P60. Os e-mails de cobrança da própria Stripe estão desligados desde a 4.3, e
      ficou para a 4.10 decidir se continuam assim — `build-history.md` → 4.3.)*
- [x] **Política de dunning — REVISTA pelo operador em 11/10/2026 e no código desde 12/10/2026
      (etapa 4.6b): o acesso NÃO é mais mantido pela janela inteira.** São **3 dias** depois da
      cobrança que falhou (o prazo é constante no `core`; a janela de tentativas da Stripe, de 2
      semanas, continua sendo do painel), e nem passar dos 3 dias nem o cancelamento automático
      deslogam — a pessoa precisa estar logada para trocar o cartão. A régua viva: `billing.md` →
      *Régua de inadimplência* e `CLAUDE.md` → *Membership Gating*. Os intervalos da Stripe: 8
      tentativas em 2 semanas (context7, 11/10/2026). **O texto de Ago 2026, como registro:**
      **Política de dunning (decisão NOSSA, executada pela Stripe):** falha na renovação → retries automáticos → corte. **Acesso MANTIDO durante toda a janela de retry** (`past_due`) — churn involuntário é a maior alavanca (strategy.md §6). Corte no fim da janela → `unpaid`/`canceled` + `session.deleteMany`. Ajustar a janela é mudança de configuração. *Confirmar os intervalos exatos que a Stripe expõe na abertura da fase, via context7.*
- [x] **Checkout embutido (Payment Element).** Cria `Customer` + `Subscription` na Stripe e confirma o primeiro pagamento na própria página. O dado do cartão vai direto pro Stripe (não toca nosso servidor). **`requires_action`/3DS é tratado pelo Element no fluxo de assinatura.**
      *(FEITO para quem está logado na etapa 4.2 (10/10/2026); a confirmação do banco (3DS) no
      checkout provada pelo operador no navegador, com o cartão que pede confirmação — etapa 4.6,
      sessão (b), parte 2 do teste dele (11/10/2026). O visitante sem conta é a etapa 4.7.)*
- [x] `Subscription` model = **espelho local** (o gate lê daqui) com growth seams: `ownerUserId?`, `organizationId?` (nullable), `seats` (default 1), `status`, `currentPeriodEnd`, `stripeCustomerId`, **`stripeSubscriptionId` (obrigatório — é a chave do objeto canônico)** (+ RLS); migration — **sem coluna de idioma** (a escola não tem idioma no banco desde 12/10/2026)
      *(FEITO: a migration `20260929160000_subscription` — Fase 3, Bloco U, etapa 4, 29/09/2026 —,
      a coluna `livemode` na etapa 4.1 e a tabela `stripe_customer` (o cliente da Stripe de cada
      conta) na 4.2. Conferido no `schema.prisma` em 19/10/2026: as costuras e o
      `stripeSubscriptionId` obrigatório.)*
- [x] `temAcessoAtivo(userId)` lib — caminho individual (`assinaturaIndividualAtiva`); **fonte única de verdade do acesso para a aplicação**, lida do espelho local. *(A verdade canônica é a `Subscription` da Stripe; o espelho é o que o gate consulta em tempo de request.)*
      *(FEITO: `server/src/lib/acesso.ts` — Fase 3, Bloco U, etapa 4, 29/09/2026; a regra com a
      tolerância de 3 dias, etapa 4.6b.)*
- [x] **Webhook handler** dos eventos de assinatura (`customer.subscription.created/updated/deleted`, `invoice.paid`, `invoice.payment_failed`) — **TUDO INLINE, SEM FILA** (pg-boss removido do MVP em Ago 2026; ver CLAUDE.md → Background Jobs). A ordem é: **verifica assinatura do Stripe → grava o `event.id` → atualiza o espelho local → responde 200**, tudo na mesma request (milissegundos). CRIA user+subscription no primeiro pagamento (substitui o seed). **A confiabilidade vem da Stripe:** devolvemos 5xx e ela reentrega — era isso que a fila duplicava. E-mail (Resend) sai na mesma request, dentro de `try/catch`: falha de e-mail **nunca** derruba o 200 de um evento já processado.
      *(FEITO na etapa 4.1 (09/10/2026; `routes/stripe-webhook.ts`), com os avisos de devolução
      acrescentados na 4.6 — 7 tipos hoje (`billing.md` → *Minha assinatura*). **O que faltava
      dele já está na etapa 4.7:** criar a conta no primeiro pagamento (passo 4) e o e-mail
      (passos 3 e 7).)*
- [x] **TRAVA de montagem (achado do `security-vulnerability-reviewer`, Ago 2026):** a rota do
      webhook Stripe é montada **ACIMA** de `express.json()` (`server/src/index.ts:38`) — junto do
      handler do Better Auth, que já vive lá por essa mesma razão — ou com `express.raw`. Se o body
      chegar já parseado, a verificação de assinatura (`constructEvent`) falha **em silêncio**: o
      raw body não é mais recuperável e a checagem passa a validar algo que não é o payload
      original. Hoje os routers de API são montados depois da linha 38 (`:41-50`), então o padrão
      default do repo é o errado para esta rota.
      *(FEITO na etapa 4.1: o `app.ts` monta o aviso acima do `express.json()`, e a rota lê o corpo
      cru com `express.raw` — a linha de `index.ts` citada acima é de antes de o app sair para o
      `app.ts`. A trava continua em `CLAUDE.md` → *Membership Gating*.)*
- [x] **Idempotência + order-safety (TRAVA):** registrar `event.id` processados (repetido = no-op); eventos podem chegar fora de ordem → em qualquer dúvida, `subscriptions.retrieve` e **recomputar** o espelho, nunca confiar no snapshot do payload.
      *(FEITO na etapa 4.1: a tabela `stripe_event` guarda cada aviso processado, e o espelho se
      recalcula buscando a assinatura na Stripe, com a trava da assinatura.)*
- [x] **"Force sync" fallback.** `subscriptions.retrieve` + recomputa o espelho, caso um webhook falhe até esgotar as reentregas da Stripe — evita o pior caso de suporte: assinante pagante trancado pra fora. **TRAVA:** admin-only OU escopo de servidor seguro. NUNCA um GET não autenticado que libere acesso — seria bypass de billing.
      *(FEITO na etapa 4.4: `POST /api/admin/assinaturas/sincronizar`, só admin, e a tela Admin →
      Assinaturas; o painel completo é a etapa 4.7b.)*
- [x] **Detecção de falha = monitor de erro externo, NÃO uma fila nossa.** O desenho antigo
      (alerta via fila `admin-alerts` do pg-boss) tinha um defeito de raiz: **a detecção dependia
      exatamente da coisa que deveria detectar.** Com a fila fora, o webhook que estourar cai no
      **monitor externo gerenciado** — item de pré-requisito do primeiro aluno pagante na Fase 7
      (fornecedor ainda **PENDENTE**). O force-sync continua sendo a *recuperação*; o monitor é a
      *detecção*. (Convenção no CLAUDE.md → Background Jobs.)
      *(FEITO no servidor em 10/10/2026: o Sentry, em `server/src/lib/monitor.ts` — Fase 7, parte 1,
      publicada e ligada em produção. As telas do aluno são a parte 2, na Fase 7.)*
- [x] **INFRAESTRUTURA da suíte de servidor — PRONTA (Ago 2026).** Entrega o encanamento, não os
      testes de negócio. **`app.ts` novo**: monta e exporta o app **sem** `listen()`, que ficou em
      `index.ts` — enquanto `index.ts` escutava porta no import, supertest não tinha o que importar.
      Entrada de produção segue `dist/index.js`; Dockerfile e Railway intocados. **`vitest.config.ts`**
      (`environment: node`, `fileParallelism: false` — workers em paralelo disputariam o mesmo banco e
      gerariam falha intermitente, que é a pior classe de teste). **`src/test/`**: `test-env.ts` (trava
      por REF + `loadEnv` com `override: true`, para a suíte não depender de o operador ter feito
      `set -a`), `global-setup.ts` (trava → `migrate reset --force --skip-seed` → seed, com env
      **passado explicitamente** ao filho, nunca herdado do `.env`), `setup.ts` (roda em cada worker,
      porque o globalSetup roda em outro contexto e `process.env` não atravessa). **3 testes de
      fumaça**: `/api/health` 200 · `/api/me` sem sessão 401 · admin semeado autentica e `/api/me`
      devolve `role=admin`. **`tsconfig.build.json`** exclui `src/test/` do build — código de teste
      não vai para a imagem de produção; o `typecheck` continua cobrindo os testes.
      **Provado por MUTAÇÃO, não presumido:** (a) com o `.env.test` apontando para o ref de
      **produção**, o setup **aborta** — `[test-setup] migrate reset` executou **0 vezes**, `Seed
      complete` **0 vezes**, exit code **1**; *(a primeira tentativa de mutação, passando
      `DATABASE_URL` pelo shell, NÃO disparou a trava — o `override: true` sobrescreve o shell com o
      arquivo. Isso é o requisito, não um furo: o vetor real é o **arquivo** apontar errado, que é o
      erro que de fato aconteceu esta semana. Registrado porque a mutação ingênua dá falso conforto.)*
      (b) removendo `requireAuth` de `me.ts`, **2 dos 3 testes reprovam** — a suíte pode falhar, logo
      é teste. **CI:** step `Test server` novo; exige os secrets `TEST_DATABASE_URL` e
      `TEST_DIRECT_URL`, com o resto gerado no run.
      **Achado colateral corrigido:** o `.dockerignore` tinha `**/.env`, que **não** cobre
      `.env.test` — o `COPY server/ ./server/` levaria o arquivo de segredo para uma camada do
      builder. **Mesmo defeito que o `.gitignore` tinha**, no mesmo padrão, em outro arquivo.
- [x] **DECISÃO TOMADA (Ago 2026) — o gatilho disparou e a resposta é POSTGRES LOCAL SÓ PARA TESTE.
      Reverte a decisão de Ago 2026 que rejeitava banco local; a reversão traz DADO NOVO, como a
      regra exige.** O gatilho registrado era *"quando o operador começar a autorar conteúdo de
      verdade em dev"* — e ele disparou no dia em que o operador abriu o `/admin` local para
      trabalhar. **O dado novo é a colisão em si:** `mvaobzypsiuhqzipcelw` servia dev **e** teste, e
      `migrate reset --force` não distingue um do outro.
      **O desenho que fica — TRÊS ambientes, um por papel:**

      | Ambiente | Banco | Quem usa | Apagado? |
      |---|---|---|---|
      | Produção | Supabase `gaxmbnhwltljlkukdwba` | só o Railway | nunca |
      | Dev / escola | Supabase `mvaobzypsiuhqzipcelw` | `dev:server`, o operador no `/admin` | **nunca** |
      | Teste | **Postgres local** | `server run test` · `e2e run test` | a cada execução |

      **Por que local e não um terceiro projeto Supabase:** custo **US$ 0** contra US$ 10/mês, e
      `migrate reset` deixa de ser perigoso — martelo só é problema quando o que está embaixo tem
      valor. **Resolve por CONSTRUÇÃO, não por disciplina**, que é o que importa para quem trabalha
      sozinho em semanas alternadas: prefixo de fixture e limpeza seletiva (ambos considerados)
      dependem de lembrar, e lembrar decai com duas semanas fora.
      **A premissa de custo foi VERIFICADA, não suposta** `[FATO — MCP `get_organization`, Ago 2026:
      `"plan": "free"`]`: a organização está no **Free**, que permite 2 projetos ativos, então hoje
      os dois Supabase custam **US$ 0**. Os US$ 10 do segundo só existem depois do upgrade para Pro,
      que o `CLAUDE.md` já amarra à chegada de alunos pagantes — custo já orçado, não custo novo.
      **O que se temeu perder e NÃO se perde:** a comparação de paridade que pegou o furo do
      `_prisma_migrations` exige um banco construído **só a partir das migrations** para confrontar
      com produção — e o projeto de dev continua sendo exatamente isso, agora nesse papel. O
      `get_advisors` segue valendo nele.
      **Instalação: PostgreSQL 17.11 — NÃO o 18**, ainda que o instalador ofereça o 18.6. **Duas
      razões, e a primeira é a que decide:** *(i)* o Prisma deste repo é o **5.22.0**, pinado por
      decisão própria, e é **anterior** ao PostgreSQL 18 — usar o 18 é rodar uma combinação que o
      Prisma nunca viu, justamente em migration e introspecção; o risco não é "quebra", é
      **depurar na direção errada** quando quebrar. *(ii)* produção roda `17.6.1`, então a mesma
      major mantém a paridade — e o repo **já tem essa dor catalogada** no backlog de divergência
      de runtime do Node (*"testamos num runtime e publicamos em outro"*): abrir um segundo caso da
      mesma família, agora no banco, com o primeiro ainda aberto, não passa no critério de decisão
      de stack. O 18 não impede nenhuma falha descritível em uma frase.
      Marcar **Command Line Tools** (o `psql` é o que dá inspeção do banco local, já que não há MCP
      para ele); desmarcar **Stack Builder**; pgAdmin 4 é opcional. **Trava do Prisma:** sem pooler local,
      `DATABASE_URL` e `DIRECT_URL` recebem **o mesmo valor** — sem isso o Prisma reclama de
      variável ausente e a mensagem não deixa óbvio que é essa.
      **Gatilho de reabertura:** se a suíte passar a precisar de recurso que só o Supabase tem
      (Data API, extensão específica, comportamento de RLS sob o papel `anon`), o banco de teste
      volta para a nuvem — hoje nada disso é exercitado, porque o Prisma conecta com papel que
      ignora RLS.
      **✅ EXECUTADO (Ago 2026), com as provas:** PostgreSQL **17.11** instalado · banco
      `jilsonsantana_test` criado · **4 migrations aplicadas** · **11 tabelas, 0 sem RLS** — mesma
      contagem do Supabase, o que faz do banco local uma **terceira testemunha** de que o repo
      produz um banco protegido, agora em outra plataforma · seed com admin + member · suíte
      **3/3 verde** em 4s · trava reescrita e **provada nos 7 casos** (local ✓ · `127.0.0.1` ✓ ·
      `[::1]` ✓ · Supabase produção ✗ · Supabase dev ✗ · a armadilha `evil.com:5432/localhost` ✗ ·
      lixo não-parseável ✗). *A trava foi testada como **função isolada**, nunca pelo `globalSetup`
      inteiro: se tivesse bug, o `migrate reset` teria acertado a nuvem de verdade.*
      **A prova que fecha o item:** rodar `npm test` (que executa `migrate reset --force`) e
      confirmar em seguida, via MCP, que o banco de **dev** seguia com 2 cursos, 2 módulos, 3 aulas,
      1 trilha e 2 usuários — **intacto**. Era exatamente esse comando que destruía o trabalho.
- [x] **TESTES DE SERVIDOR (~16, supertest, sem browser) — escritos JUNTO com o handler acima, não
      depois.** *(FEITO — a matriz fechou na etapa 4.4, passo 7, 10/10/2026. Onde mora cada caso:
      1–3 `stripe-webhook.test.ts` · 4–6 `acesso.test.ts` · 7–10 `matriz-http.test.ts` · 11–12
      `public-reads.test.ts` · 13–14 `admin-assinaturas.test.ts` · 15 `login-limite.test.ts`. O
      banco de teste é o Postgres local, com a trava de hostname — não mais o projeto do Supabase
      citado no fim deste item.)* Este é o item que fecha a fase; não é polish de fim de ciclo. **Justificativa
      (Ago 2026):** 100% do risco catastrófico do projeto é servidor — *assinante pagante trancado
      pra fora* e *acesso liberado sem pagar* — e **nada disso é observável por browser: webhook não
      tem tela.** Casos mínimos:
      **Webhook** — (1) assinatura inválida → **400**; (2) `event.id` repetido → **no-op** (espelho
      inalterado, sem efeito colateral duplicado); (3) evento fora de ordem → **recomputa via
      `subscriptions.retrieve`**, nunca confia no snapshot do payload.
      **Gate de acesso** — (4) `PAST_DUE` **mantém** acesso dentro da janela; (5) `CANCELED` **não**;
      (6) sem `Subscription` → não.
      **Matriz HTTP** — (7–10) **401/403/200** em `/api/me` e `/api/admin/ping` (anônimo /
      member / admin).
      **Vazamento de conteúdo** — (11–12) rotas públicas **não devolvem `DRAFT`** — *fecha por teste
      os dois achados P1 já abertos na Fase 2 (`GET /api/trilhas/:slug` e `POST
      /api/trilhas/:id/save`); referência, não duplicação: o fix e o diagnóstico moram lá.*
      **Billing bypass** — (13) force-sync **sem auth → 401**; (14) force-sync como member comum →
      403.
      **Rate limit** — (15) o limite do Bloco 0 (Fase 3) **liga e bloqueia** de verdade.
      ~~**Idioma** — (16) assinatura em português → curso em inglês liberado~~ — saiu em 12/10/2026:
      não há mais idioma.
      *Requer o banco de teste (projeto `mvaobzypsiuhqzipcelw` + trava por **REF** no `globalSetup`)
      — CLAUDE.md → Database & Migrations.*
- [x] `requireActiveMembership` middleware (wraps `temAcessoAtivo`) gating content + video URLs
      *(FEITO na etapa 4.4, passo 5: `middleware/auth.ts`; a primeira rota é o download dos arquivos
      da aula. A página da aula, por causa da prévia grátis, chama `temAcessoAtivo()` direto —
      `CLAUDE.md` → *Access Architecture*.)*
- [x] On access loss: `session.deleteMany({ userId })` to force logout
      *(FEITO na etapa 4.4, passo 1, dentro da rotina que grava o espelho, e só quando a conta tinha
      acesso e deixou de ter; a exceção do reembolso pedido pela própria pessoa é da etapa 4.6.)*
- [x] Client: pricing page + **checkout embutido (Payment Element)** + **tela de gestão de assinatura DENTRO da escola** (trocar cartão, ver próxima cobrança, mudar mensal↔anual, cancelar) — substitui o Customer Portal, chamando a Subscriptions API. *Mostrar a proração da Stripe **previsualizada** antes de confirmar a troca de plano.*
      *(FEITO para quem está logado: a tela de assinar na etapa 4.2, e Faturamento e Assinatura —
      o cartão, a próxima cobrança, o plano e cancelar — na 4.6, sessões (a) e (b). A proração da
      Stripe mostrada antes deu lugar, em 11/10/2026, ao valor mostrado igual ao cobrado, num
      clique só (decisões do operador; `billing.md` → *Minha assinatura*). A tela pública de
      assinar é a etapa 4.7, passo 6.)*
- [x] **Tela de offboarding antes do cancelamento (seam).** Intercepta "cancelar", coleta o motivo, depois executa `cancel_at_period_end` (não recobra; acesso segue até o fim do período pago). **TRAVA (anti roach-motel — sensibilidade Procon/CDC já levantada no pricing):** "cancelar mesmo assim" sempre visível, 1 clique; tom calmo, não retentivo. **Faseamento:** captura de motivo = **launch**; **"pausar 1 mês" (pause collection da Stripe) = fast-follow.** Não construir a pausa no launch.
      *(FEITO na etapa 4.6, sessão (b), passo 9: a tela de cancelar, com o motivo opcional e só as
      saídas que o servidor diz que cabem; o motivo fica na Stripe. A pausa continua fora do
      lançamento.)*
- **→ Na etapa 4.10 (reconciliado em 19/10/2026):** E2E: assinar → acesso liberado; renovação → período estende; cancelar → acesso revogado no fim do período; **pagamento falhado → `past_due` com acesso MANTIDO → corte no fim da janela**. *(Os três casos de webhook — duplicado, fora de ordem, assinatura inválida — saem daqui e viram **teste de servidor** no item acima: são mais baratos, mais rápidos e não precisam de browser.)*
      *(Desde a etapa 4.6b o pagamento falhado mantém as aulas por 3 dias, não pela janela
      inteira: é isso que o E2E confere.)*
- [x] **E2E full-stack habilitado (6–8 testes) — DEPOIS dos testes de servidor.** *(FEITO EM
      PARTE na Fase 3, Bloco T (T1): o `globalSetup` com o banco de teste local e a MESMA trava do
      servidor, e 7 testes em `e2e/tests/auth.spec.ts` — entrar e senha errada, rota protegida e
      de admin sem login, a sessão que sobrevive ao recarregar, sair. **O que falta:** o checkout
      com o cartão de teste e o cancelamento estão na **etapa 4.10**; o gate de vídeo membro ×
      não-membro é a caixa da Fase 3 → *Vídeo* ("E2E: non-member cannot get a playable URL").)*
      **Correção de
      diagnóstico (Ago 2026):** o E2E atual só assere redirect do React Router **porque falta o
      `globalSetup` com banco de teste** — não porque Playwright seja a ferramenta errada;
      **Playwright fica na stack**. Primeiro o `globalSetup` (banco de teste travado por **REF**,
      seed determinístico),
      depois o escopo alvo: login válido / senha errada; rota protegida sem auth; rota admin sem
      auth; gate de vídeo membro **vs** não-membro (Fase 3); checkout com cartão de teste;
      cancelamento. *O `e2e-test-writer` continua **ADIADO** — CLAUDE.md → Testing.*
- **Done when:** paying members get access, status survives reload, webhooks reconcile truth, **and a non-member cannot reach gated content by any path.**

## Phase 5 — Lesson Progress + Event Capture Foundation  *(low–medium risk)*

- **Decisões do operador, 03/10/2026:** a aula conta como concluída **sozinha, sem botão** — vídeo
  ao chegar a **90%**, texto **ao abrir**; o site ouve o player do Bunny pelo pacote `player.js`
  (dependência aprovada, versão travada). O que o certificado atesta com isso foi decidido
  em 09/10/2026 (a P39): ver Fase 6.5.
- [x] `LessonProgress` (user×lesson, `completed`, `completedAt`) + RLS ; migration
      *(03/10/2026: migration `lesson_progress`; churn não apaga, só some com a aula ou a pessoa)*
- [x] Endpoint: mark lesson watched; lesson list shows completion
      *(03/10/2026, o servidor: `PUT /api/lessons/:id/concluida` — só a cadeia publicada e só a
      aula que a pessoa pode assistir, pela mesma regra da página da aula, `aulaLiberada()`; e
      `PUT /api/admin/lessons/:id/concluida` para o admin; a página da aula devolve `concluidas`
      de quem pede. Revisão de segurança sem P0/P1. **A tela (etapa 4):** o vídeo conclui aos 90%
      (`player-do-bunny.ts`), o texto ao abrir, só com login; a barra da página da aula mostra o
      número real (aulas concluídas ÷ aulas da lista) e o conteúdo do curso marca a aula feita.)*
- [x] **Trilha completion:** a saved trilha is "complete" when all its `PlanItem` lessons are
      done (course-item = its lessons). Drives certificate eligibility (Phase 6.5). → **Bloco MEDIR, etapa 3** *(09/10/2026)*
- [x] `LessonEvent` table (event-sourced: type, position, ts) + RLS — **capture only, no analytics yet** → **Bloco MEDIR, etapa 1** *(09/10/2026)*
- [x] Client: fire PLAY/PAUSE/ENDED events from the player (cheap writes) → **Bloco MEDIR, etapa 1** *(09/10/2026)*
- [ ] **Ao concluir um curso: a AVALIAÇÃO do curso e, uma vez por aluno, o DEPOIMENTO** *(decisões do
      operador de 23/09/2026 e de 09/10/2026 — a P27, que troca a nota "uma por aluno, geral" por uma
      nota POR CURSO)*. Depende deste bloco: "concluiu um curso" só existe com o `LessonProgress`.
      - **A avaliação, a cada curso concluído:** nota de **1 a 5 estrelas** daquele curso + um
        **comentário, se o aluno quiser**. Serve **só ao operador** — *"para eu entender se estou
        ensinando do jeito que os alunos gostam ou não"* — e **nunca é publicada**.
        Teste de servidor garante que nem a nota nem o comentário saem no site. É ela que vira a
        **Avaliação do cartão do admin** (a média do curso).
      - **O depoimento, um por aluno:** o testemunho que pode ir para o **site**. Aparece **abaixo da
        avaliação**, no mesmo pedido, **até o aluno preencher**; depois disso, os próximos cursos
        concluídos pedem **só a avaliação**. O texto exato da pergunta é do operador, na hora de
        construir. *(De 23/09, não revogado: sem escolha de tema.)*
      - **Um depoimento por aluno, garantido pelo BANCO:** `Testimonial` ganha o aluno ligado a ele,
        **único** e opcional (os depoimentos cadastrados à mão, como os 4 vindos da Udemy, não têm
        conta aqui). O segundo envio do mesmo aluno é recusado pelo banco, não só pela tela.
      - **Chega como Rascunho**, e o operador escolhe o que publicar no `/admin/site/depoimentos`. O
        aluno marca se **autoriza aparecer com o nome completo**; **sem essa marcação o texto fica só
        para o operador**, e o servidor recusa publicá-lo (LGPD — a tela esconder o botão não é
        defesa).
      - *A confirmar com o operador na hora de construir:* o **"Não, obrigado"** de 23/09 (o aluno
        encerra de vez o pedido de depoimento) continua junto do "aparece até ele preencher"? Se
        continuar, a recusa fica gravada **sem** coluna nova no `User` (identidade enxuta).
- [x] **Os números do cartão do admin** (Bloco A, 27/09/2026), que hoje são placeholder: **horas
      assistidas** (mês e total, dos `LessonEvent`) e **alunos que começaram** o curso (mês e total,
      do `LessonProgress`). Leitura do admin, **nunca** no site. → **Bloco MEDIR, etapa 2** *(09/10/2026)*
- [ ] **A avaliação no cartão do admin** — **destravada em 09/10/2026 (a P27):** a média das notas do
      curso (1 a 5), só para o operador, nunca no site. Nasce junto da avaliação do item acima.
- [x] **O progresso também funciona para o ADMIN** *(consequência da decisão do operador de
      29/09/2026: a plataforma é uma só, e ele testa tudo como aluno sem trocar de conta)*: "marcar
      como vista", o Continue estudando e as conclusões não podem depender só de assinatura ativa
      — o admin não tem assinatura. **Sem** pôr `role === admin` dentro de `temAcessoAtivo()`
      (`CLAUDE.md` → Access Architecture): o admin entra por uma regra própria, como já faz na
      aula.
      *(03/10/2026: rota própria `PUT /api/admin/lessons/:id/concluida`; a página da aula do admin
      conclui por ela e conta as aulas em rascunho da lista dele.)*
- [x] **"Salvos" — salvar para assistir depois, curso ou aula** *(decisão do operador, 03/10/2026,
      "como no LinkedIn")*: um botão ao lado de cada aula (no conteúdo do curso) e no curso; a lista
      é um item novo de Meus estudos, **"Salvos"**, depois de Minhas trilhas, com aulas e cursos
      juntos. **Feito (etapa 2):** tabela `saved_item` (exatamente um dos dois, pelo banco; RLS) e
      as rotas `/api/salvos` — só com login, sem exigir assinatura (é só um marcador), salvar só o
      que está publicado na cadeia inteira (rascunho é 404), e a lista só mostra o que continua
      publicado. Revisão de segurança sem P0/P1; os dois buracos de teste que ela apontou foram
      cobertos. **Os botões (etapa 3):** ao lado de cada aula do conteúdo do curso e "Salvar curso" no
      topo da página da aula — só logado e só no que está publicado na cadeia inteira; ligado/desligado
      para o leitor de tela. **A tela (etapa 4):** `/aluno/salvos`, com cursos (levam à primeira aula)
      e aulas (com o nome do curso), tirar dos salvos pelo mesmo botão, e os estados de carregando,
      erro e vazio; o item **Salvos** em Meus estudos, depois de Minhas trilhas.
- [x] **O vídeo não recomeça ao trocar de aba nem ao concluir** *(achado do operador, 03/10/2026)*:
      o player mantém o endereço enquanto o vídeo for o mesmo; a apresentação abre **pausada** e
      a aula **toca sozinha** (decisões dele), pelo próprio endereço (`bunny.md` §3.1). O defeito
      também atingia a etapa 4 do progresso (concluir aos 90% recarregaria a aula do início) e
      foi pego antes de publicar.
- [x] **Barra de progresso no cartão do curso, na lista de Cursos do aluno** *(pedido do operador,
      30/09/2026, a partir da Mosh)*: só nos cursos que o aluno já começou, com a porcentagem (aulas
      vistas ÷ aulas publicadas). Depende do `LessonProgress` acima; entra com ele.
      *(03/10/2026: `GET /api/progresso/cursos`, só com login, só a cadeia publicada nos dois
      lados da conta; o cartão do catálogo mostra a barra e "67% concluído" só no curso começado.)*
- [ ] **Tirar o EM BREVE do que espera o progresso** *(menu novo do aluno, 29/09/2026)*: o bloco
      **Continue estudando** do Início, o **conteúdo** da página Em andamento (hoje só o título) e
      **Concluídos** em Meus estudos. O que cada um mostra é decisão do operador na hora de
      construir.
- **Done when:** "marquei como vista" works, trilha % completion shows, AND events are captured for future analytics.

### Bloco AULA — A tela onde o aluno estuda, no nível do LinkedIn Learning  ✅ FECHADO em 09/10/2026  *(pedido do operador, 06/10/2026 · plano aprovado por ele no mesmo dia · etapas 1 e 2 tocam a trava da aula)*

**O pedido** *(comportamento esperado, nas palavras do operador, 06/10/2026 — é a tela "coração da
escola", e tem que ser impecável no computador, no celular e em aparelho antigo, com legenda)*:
1. **Primeira vez no curso:** abre a primeira aula; vídeo toca sozinho, texto fica para ler; o
   sino recebe a boas-vindas.
2. **O vídeo vai até o fim e abre a próxima aula sozinho**; vídeo toca, texto fica — e assim por
   diante.
3. **Texto e quiz não passam sozinhos:** a próxima aula só com um clique. Tocar sozinho é só vídeo.
4. **Saiu e voltou ao curso** — amanhã, daqui a um mês, daqui a um ano —: abre a MESMA aula, no
   MESMO segundo, tocando.
5. **Pausou, saiu e voltou:** abre no ponto e TOCA. *Revoga o "pausou, volta pausado" de
   05/10/2026 (operador: "pode esquecer isso").* Texto e quiz não tocam.
6. **Passar de aula, sozinho ou no clique, funciona sem erro.**

**Decisões do operador na análise (06/10/2026):** **curso terminado** (viu até o fim a ÚLTIMA aula)
→ entrar de novo abre a **primeira aula ainda não concluída**; se concluiu todas, a primeira do
curso · **botão "Próxima aula" no fim da aula de texto** (e do quiz, quando existir), além da
lista — texto "Próxima aula" / "Next lesson" · **legenda desligada ao abrir** (o aluno liga no CC),
como hoje; o teste no aparelho confere se, ligada numa aula, ela continua ligada na próxima.

**Diagnóstico (06/10/2026 — medido, não presumido):**
- **Erro 1, "entra sempre na primeira aula":** `CourseEntryPage` vai à primeira aula publicada por
  construção (decisão de 29/09, quando o progresso não existia), e nada registra em que aula a
  pessoa estava.
- **Erro 2, "volta na primeira, e a próxima abre pausada":** a mesma causa, mais o
  `autoplay=false` que `posicao-do-video.ts` põe no endereço quando o ponto guardado diz "pausado"
  — a aula seguinte era uma que tinha sido pausada antes.
- **O ponto vive só no `localStorage`:** não vale em outro aparelho, e o Safari (iOS e macOS) apaga
  o armazenamento do site depois de 7 dias sem visita (ITP). O item 4 ("daqui a um mês") é
  impossível nesse desenho.
- **Achado A — o Voltar do navegador mostra o vídeo errado.** Ir para uma aula que ainda está na
  memória (aberta nos últimos 5 min) reaproveita a MESMA moldura do player e só troca o `src`
  (provado por teste de componente). No Chrome, trocar o `src` de uma moldura já carregada cria uma
  entrada no histórico (provado no navegador: `history.length` +1 por troca; moldura nova, +0); um
  Voltar então troca só o vídeo, e o título continua o da aula atual (provado).
- **Achado B — no celular, a gaveta do conteúdo fica aberta por cima da aula escolhida**, no mesmo
  caso (provado). Com aula nova ela fecha só porque a página inteira some (achado C).
- **Achado C — entre uma aula e outra, a tela inteira vira "Carregando…"**: título, nome do curso,
  lista lateral e player somem e voltam (provado).
- **Achado D — aparelho antigo:** o Vite 7 compila por padrão para Safari 16 / Chrome 107, acima do
  piso que o TanStack Query v5 declara (Safari/iOS 15, Chrome/Edge 91, Firefox 90 — conferir na
  etapa 4). O pacote de hoje não tem sintaxe nova (conferido: sem *lookbehind*, sem *static
  block*), mas nada garante isso no próximo build.
- **Risco no painel do Bunny:** o player tem um "retomar de onde parou" próprio (*Resumable Player*,
  aba Player da biblioteca — doc oficial). Ligado, disputa o ponto com o do site → **P51, resolvida
  em 07/10/2026: o operador conferiu no painel que está desligado** (registro em `bunny.md`).
- **Conferido sem defeito:** a boas-vindas no sino ao abrir a primeira aula (assinante e admin,
  curso com mensagem), o fim do vídeo abrindo a próxima, trocar de aba sem recomeçar, e a renovação
  do endereço vencido.

**Limite que não depende do site (para o teste):** o navegador pode bloquear vídeo com som que
começa sozinho. Chrome, Edge e Firefox permitem quando a pessoa já clicou no site — o caminho normal,
clicando no curso. No iPhone, a Apple tende a exigir um toque dentro do próprio player: o vídeo
abre no ponto certo, com o botão de play, e um toque basta. *Começar sem som: NÃO adotado (quem não
percebe perde o começo); reabre se o teste no iPhone mostrar que o toque incomoda.*

**Desenho:**
- **O ponto e a última aula NA CONTA** (`LessonProgress`, migration aditiva `ponto_da_aula`):
  `positionSeconds Int?` (o segundo do vídeo; vazio = do começo) e `lastSeenAt DateTime?` (quando a
  pessoa esteve na aula). Passa a existir linha com `completed = false` — o esquema já a previa
  ("reservado para o 'começou'") e todo leitor de `lessonProgress` já filtra `completed: true`
  (conferido: `aulasConcluidas`, `/progresso/cursos`, parabéns). Churn não apaga; excluir a conta
  apaga junto (cascade).
- **Gravar:** `POST /api/lessons/:id/ponto` — `requireAuth` + cadeia publicada + `aulaLiberada()`,
  a MESMA regra do concluir (401/404/403) — e `POST /api/admin/lessons/:id/ponto` (`requireAdmin`,
  qualquer status). Corpo validado por schema Zod no `core`: `{ segundos: inteiro 0..86400 | null }`
  (`null` = viu até o fim, ou aula sem vídeo). POST porque o envio na saída da página vai com
  `keepalive`.
- **Ler:** a página da aula devolve `aula.ponto` (API aditiva). *Proposta do agente, aprovada com o
  plano:* ponto nos últimos 5 s do vídeo conta como "do começo" (senão tocaria 2 s e pularia para a
  próxima), e trocar o vídeo de uma aula (`admin-lesson-video.ts`) zera o ponto dela para todos.
- **Entrar no curso:** `GET /api/cursos/:slug/entrada` → `{ aulaId }`. Logado: a aula de
  `lastSeenAt` mais recente na cadeia publicada; se ela é a ÚLTIMA da lista, de vídeo, vista até o
  fim → a primeira não concluída (todas concluídas → a primeira). Sem histórico ou visitante → a
  primeira. Curso inexistente ou não publicado → 404. Sem filtro de idioma (link direto não filtra).
  O catálogo, os Salvos e o sino já entram por `/aluno/curso/:slug` e ganham o comportamento sem
  mudança; o Visualizar do admin continua abrindo a primeira aula.
- **Tela:** saem `posicao-do-video.ts`, o "pausado" e o `localStorage` (as chaves antigas
  `jilson:ponto-da-aula:*` são limpas uma vez). Endereço do player: `autoplay=true` sempre (já vem
  do servidor) + `t=<ponto>s`. A página avisa "estou nesta aula" ao abrir (vídeo e texto); o player
  grava o ponto **a cada ~15 s tocando, na pausa, ao sair da aula e ao fechar ou esconder a página**
  (`visibilitychange`/`pagehide`, Axios com o adaptador `fetch` + `keepalive` — conferido no Axios
  1.18 do repo); no fim do vídeo, ponto vazio. O cache da página da aula recebe o ponto gravado, para
  quem volta à aula na mesma visita não abrir no ponto velho.
- **Trocar de aula sem erro:** moldura NOVA do player a cada endereço (`key`), fim da entrada extra
  no histórico · o cabeçalho e a lista do curso FICAM enquanto a aula seguinte carrega (dado
  anterior só se for do mesmo curso; o título novo sai da própria lista) e só o quadro do conteúdo
  mostra o carregando, em 16:9 · a gaveta do celular fecha ao escolher uma aula.
- **"Próxima aula"** no fim da aula de texto (decisão acima); na última aula, não aparece.
- **Aparelho antigo:** `build.target` explícito no `vite.config.ts` = o piso das bibliotecas (iOS 15
  — iPhone 6s em diante —, Chrome/Edge 91, Firefox 90).

**Fora do escopo, de propósito:** o "Continue estudando" do Início e a página Em andamento (o dado
passa a existir; o que mostram é decisão do operador — checkbox acima) · `LessonEvent` · começar
sem som no iPhone · a prévia grátis do visitante passando de aula (página pública, C5) · o quiz (não
existe; a regra "não passa sozinho" já vale para tudo que não é vídeo).
**Dependências novas:** nenhuma.
**Docs check (context7):** Bunny Stream → `/bunnyway/documentation` → parâmetros do embed (`t` em
`Xs`, `autoplay`, `muted`, `captions` = idioma padrão da legenda, `disableIosPlayer`), eventos do
player.js (`ready`, `play`, `pause`, `ended`, `timeupdate`, `seeked`, `error`) e o *Resumable Player*
da aba Player — **3 consultas na análise (passou de 2: anotado)**. A sessão que construir refaz uma
(regra: uma por sessão). Better Auth e Stripe: não disparados.
**Revisão de segurança:** `security-vulnerability-reviewer` na etapa 1 (rota nova que aplica
`aulaLiberada()`/`temAcessoAtivo()` e lê progresso de outra pessoa se errar o filtro).

**Etapas** — uma por commit no `dev`; seguro parar depois de qualquer uma:
- [x] **Etapa 1 — servidor (G):** a migration (`migrate diff` + `migrate deploy` no dev; conferir RLS
      e `migrate diff` vazio), o schema no `core`, `POST …/ponto` (aluno e admin), `aula.ponto`, a
      entrada no curso, e zerar o ponto ao trocar o vídeo. **Testes de servidor:** 401 sem login ·
      404 rascunho e cadeia quebrada · 403 aula paga sem assinatura · 204 assinante e prévia grátis
      · admin em rascunho · o ponto volta só para quem gravou · entrada: sem histórico → 1ª, última
      vista → ela, aula que saiu do ar é pulada, curso terminado → 1ª não concluída, todas
      concluídas → 1ª, visitante → 1ª, curso não publicado → 404 · trocar o vídeo zera. Revisão de
      segurança. **Mutação:** sem a trava de acesso, sem o filtro da cadeia, ignorando o
      "terminado" → reprovam.
      *(06/10/2026, no `dev`.)* Migration `20261006210000_ponto_da_aula` — só acrescenta as duas
      colunas; **aplicada no dev** (produção aplica no próximo publish, pelo pre-deploy). **Passo 0
      no dev:** as mesmas contagens antes e depois (2 usuários, 2 cursos, 5 aulas, 63 sessões), admin
      e aluno entram, zero tabelas sem RLS, `migrate diff` vazio; a suíte recria o banco de teste do
      zero com ela. O código mora em `server/src/lib/onde-parou.ts` (gravar o ponto, o ponto que
      vale, a entrada) e `core/src/schemas/progress.ts`; as rotas em `routes/progress.ts`; o
      `aula.ponto` em `routes/lesson-view.ts`; a troca de vídeo zera o ponto **para zero, não vazio**
      (vazio quer dizer "viu até o fim" e faria a entrada achar que o curso terminou). **Testes:**
      `onde-parou.test.ts` (41) e 1 em `lesson-video.test.ts`; suíte inteira verde. **Revisão de
      segurança** (`security-vulnerability-reviewer`): **sem P0/P1**; dois P2 corrigidos na hora — o
      teste de que ABRIR a aula não conta como CONCLUIR (nas concluídas da página, no % do curso,
      nos parabéns e na entrada; antes, tirar o filtro `completed: true` passava a suíte) e a trava
      de `esquecerPontosDaAula` sem aula (zeraria o ponto de todo mundo); o terceiro, o limite de
      pedidos por conta, foi para o *Backlog P2 — endurecimento* (vale para a API logada inteira).
      **Mutação: as 16 partes reprovam** — além das três acima, a entrada sem filtrar a aula
      publicada, na ordem de criação, lendo o histórico de outra pessoa; o ponto saindo na aula
      bloqueada; o fim do vídeo valendo como ponto; gravar desmarcando a conclusão; a troca de vídeo
      zerando para vazio, zerando todas as aulas, ou não zerando; a rota do admin aberta a qualquer
      logado; as concluídas e o % contando a aula só aberta; e zerar sem a trava.
- [x] **Etapa 2 — tela: entrar onde parou e tocar sempre (G):** `CourseEntryPage` pela rota nova,
      gravar e ler o ponto na conta, sair o "pausado" e o `localStorage`, os envios na saída.
      Componente: a entrada (carregando, erro, vazio, destino) · player no ponto e tocando ·
      gravação na pausa, no intervalo e na saída · o fim apaga · o cache recebe o ponto.
      **Mutação:** voltar o `autoplay=false`, gravar só no fim, entrar sempre na 1ª → reprovam.
      Reconciliar `bunny.md` (*Tocar sozinho e trocar de aba*).
      *(06/10/2026, no `dev`.)* **A entrada** pergunta ao servidor a cada visita (a resposta de uma
      visita anterior nunca leva à aula antiga) e separa "curso não encontrado" (404) de falha de
      rede, que agora avisa o erro em vez de dizer que o curso não existe. **A gravação**
      (`client/src/lib/ponto-da-aula.ts`): "estou aqui" ao abrir (vídeo no ponto em que abre; texto
      sem ponto), a cada 15 s de vídeo, na pausa, ao sair da aula, e "viu até o fim" no `ended`;
      em **fila** (o servidor recebe na ordem em que o vídeo andou) e **insistindo** só em queda de
      rede ou 5xx, como as outras gravações do aluno; ao sair, a memória da tela recebe o ponto
      (quem volta na mesma visita não abre no ponto velho). **Fechar a aba ou trocar de app**
      (`client/src/lib/envio-na-saida.ts`): o padrão do guia modern-web-guidance
      (`full-session-analytics`, consultado) — `fetchLater` no Chrome/Edge; no Safari/Firefox, o
      envio sai quando a página esconde, com `keepalive`; nunca `unload`. É a **exceção única** ao
      "Axios para HTTP", registrada no `CLAUDE.md` → Client. **O player** abre no ponto da conta
      com `t=`, nunca mexe no `autoplay` que veio do servidor (a aula sempre volta tocando), e
      recarrega no ponto em que o vídeo estava quando o endereço vence; **um player por aula**
      (`key` no `LessonContent`), o que já tira a entrada extra no histórico ao **trocar de aula**
      (o achado A fica por inteiro com a etapa 3, para a renovação do endereço). `posicao-do-video.ts`
      saiu; as chaves antigas do navegador são limpas uma vez. A regra "começo e fim valem como do
      começo" (`pontoUtil`) mudou para o `core`: uma só para o servidor e a tela. **Testes:** suíte
      do cliente 697 → **717** (entrada, player, envio na saída, e 12 do ponto na página da aula);
      servidor 513, verde. **Mutação: as 16 partes reprovam** — duas passavam na primeira rodada e
      viraram teste: a entrada tinha duas proteções iguais (ficou uma, vigiada), e faltava o fim do
      vídeo na ÚLTIMA aula, onde não há "próxima" para gravar na saída. `bunny.md` reconciliado.
      **Docs check (context7):** Bunny → `/bunnyway/documentation` → reaproveitado da análise
      nesta mesma sessão (`t` em `Xs`, `autoplay`, eventos do player.js); Better Auth e Stripe: não
      disparados.
- [x] **Etapa 3 — trocar de aula sem erro (M):** *(entra também: a `LessonPage.tsx` passou do limite
      de ~200 linhas na etapa 2 — 214 —, então o topo da aula vira componente próprio, com as mesmas
      classes; é a parte que esta etapa já reescreve.)* A `key` do player, cabeçalho e lista que ficam, a
      gaveta que fecha, o botão "Próxima aula". Componente: moldura nova por aula · carregando só no
      quadro · gaveta fechada depois da escolha · botão na aula de texto (não na última, não no
      vídeo). **Mutação:** cada um dos quatro → reprova.
      *(07/10/2026, no `dev`.)* **O topo** foi para `components/aula/LessonHeader.tsx` (mesmas
      classes; a `LessonPage` caiu de 214 para 152 linhas). **A moldura do player é nova a cada
      endereço** (`key` no iframe) — também na renovação de 24 h: fecha o achado A inteiro (o Voltar
      nunca mais troca só o vídeo). **Enquanto a aula seguinte carrega**, a página da aula mostra os
      dados da anterior **só se forem do mesmo curso** (`placeholderData` em `pagina-da-aula.ts`): o
      topo (já com o título da aula nova, tirado da lista) e a lista ficam, e só o lugar do conteúdo
      mostra "Carregando…" (`LessonContentCarregando`: o quadro 16:9 no vídeo, a largura do texto no
      texto); nada da aula anterior — conteúdo, conclusão, ponto — vale para a nova. Aula de outro
      curso carrega a tela inteira, como antes. **A gaveta do celular** é uma por aula (`key`): fecha
      ao escolher uma aula e na passagem automática. **"Próxima aula"** no fim da aula de texto
      (texto aprovado pelo operador — `app.aula.proximaAula`, "Next lesson" em inglês): link de
      verdade, então a versão nova do site entra nele; não aparece na última aula, na de vídeo nem
      na trancada. `GEMINI.md`: o mapa da tela, o item 11 (sem o "pausado") e o item 31 na fila do
      Antigravity (o acabamento do botão e do carregando). **Testes:** 5 novos na página da aula e 2
      afirmações novas no player; suíte verde. **Mutação: as 8 partes reprovam** — a moldura
      reaproveitada, sem manter a aula anterior, mantendo a de OUTRO curso, mostrando o conteúdo da
      anterior, a gaveta sem `key`, o botão na última aula, o botão levando à própria aula, e o título
      da aula anterior no topo. **Docs check (context7):** não disparado (nenhum endereço ou token do
      Bunny montado; só a moldura do iframe).
- [x] **Etapa 4 — aparelho antigo (P):** `build.target` explícito; conferir o pacote (nenhuma
      sintaxe acima do piso) e o tamanho.
      *(07/10/2026, no `dev`.)* **O piso ficou escrito** no `vite.config.ts`: iOS 15 (iPhone 6s em
      diante), Chrome e Edge 91, Firefox 90 — no código e no CSS (conferido no que o próprio Vite
      resolve). **Medido no pacote, não presumido:** a sintaxe saiu igual (o código de hoje não usa
      nada que o iOS 15 não entenda; a linha protege o futuro, porque o padrão do Vite muda a cada
      versão grande — no Vite 7, Safari 16); tamanho: +174 bytes no pacote principal, o resto igual.
      Das funções novas do navegador, as bibliotecas conferem antes de usar quase todas
      (`structuredClone`, `crypto.randomUUID`, `checkVisibility`, `requestIdleCallback`); **a única
      usada sem conferir é `Object.hasOwn` (iOS 15.4), pela biblioteca do texto das aulas** — sem
      ela, toda aula de texto quebrava num iPhone com iOS 15.0 a 15.3 (provado com a peça real no
      teste). Reforço de 3 linhas em `client/src/lib/compat.ts`, a primeira coisa que o app carrega,
      que só entra quando o navegador não tem a função. *A afirmação do plano sobre o piso do
      TanStack Query não foi conferida na doc: a medição do pacote a substituiu.* **Testes:** o
      reforço (3, com a peça real do texto) e o guarda do piso (2: a linha da configuração e o
      reforço como primeira importação — as duas falhariam em silêncio). **Mutação: as 5 partes
      reprovam.** Regra no `CLAUDE.md` → Client (biblioteca nova × função nova do navegador).
      **Achado visual, NÃO consertado (decisão do operador):** no iOS 15.0 a 15.3 a moldura do app
      (`min-h-svh` no `Layout.tsx`) não ocupa a altura toda da tela — o resto funciona; o anel de foco
      do teclado (`:focus-visible`) também só aparece do iOS 15.4 em diante, o que não pesa no toque.
- [x] **Etapa 5 — publicar e testar no ar, com o operador (P):** o player só toca no domínio da
      escola, então a prova é no site. **Antes:** a P51 — *resolvida em 07/10/2026 (desligado no
      painel, conferido pelo operador)*. Roteiro em cada aparelho (Chrome no
      computador, Safari no Mac, iPhone, Android, e um aparelho antigo se houver): 1ª vez no curso
      + sino · fim do vídeo → próxima · texto parado + "Próxima aula" · sair aos 17 s e voltar pelo
      catálogo, no mesmo aparelho e no outro · pausar, sair, voltar tocando · o Voltar do navegador
      · a gaveta no celular · legenda ligada numa aula continua na próxima? · fim do curso → 1ª não
      concluída.
      *(07/10/2026: **publicado** — `main` = `f247200`, as 4 etapas no ar. Falta o operador rodar o
      roteiro nos aparelhos; o que ele achar entra aqui, e o checkbox fecha com o resultado.)*
      **O teste do operador no ar (07/10/2026, com a conta de admin** — a de aluno de teste não tem
      assinatura em produção, por decisão dele de 27/09: só com a Stripe, na Fase 4**):** (1) primeira
      vez — não reproduzível com uma conta que já tinha visto aulas, mas entrou na primeira aula,
      como esperado para quem ainda não tinha ponto gravado; (2) fim do vídeo → próxima, (3) texto
      parado e "Próxima aula", (5) pausar e voltar tocando, (7) o Voltar do navegador e (8) a gaveta
      do celular — **ok**; (4) sair e voltar pelo site — ok, mas **recarregar a página** abria do
      começo; (6) outro aparelho abria a aula certa, mas **do começo**; (9) **a legenda ligada não
      continua na aula seguinte**, nem ao voltar.
      **Defeito do agente, CORRIGIDO no mesmo dia (itens 4 e 6):** o player do Bunny avisa o tempo
      com **casas decimais** (17,43 s), e o servidor, pelo contrato da etapa 1, só aceitava inteiro —
      recusava (400) toda gravação durante o vídeo; só o "estou aqui" ao abrir, sempre no começo,
      chegava ao banco. Sair e voltar dentro do site funcionava porque a tela guarda o ponto na
      própria memória; recarregar, outro aparelho e **voltar no dia seguinte** dependem do banco — era
      o item 4 do pedido que não funcionava. Os testes não pegaram porque usavam segundos inteiros.
      **Conserto:** a tela manda o segundo inteiro (`Math.floor`), e o servidor **aceita fração e
      arredonda para baixo** — o que conserta até a aba aberta antes da publicação (API aditiva). Os
      testes passaram a usar os tempos quebrados do player de verdade. **Mutação:** a tela sem
      arredondar (andando e na pausa) e o servidor voltando a recusar fração → reprovam; tirar o
      arredondamento do servidor **não** reprova, porque o próprio Prisma grava o inteiro truncado
      (medido: 89,73 → 89) — o comportamento continua protegido pelo teste, e a linha fica, explícita.
      **Legenda (item 9) — o que a doc do Bunny diz e por que não funcionou:** o player tem uma
      "preferência lembrada" de legenda, mas ela mora no aparelho, dentro da moldura do Bunny — que o
      Safari bloqueia, e o Chrome em algumas configurações. E o player.js **não avisa** quando o aluno
      liga ou desliga o CC (só play, pausa, tempo, fim). O que o site consegue é mandar o player abrir
      com a legenda ligada (`captions=<idioma>`). **Decisão do operador (07/10/2026), como no
      LinkedIn:** começa desligada; o aluno liga **no CC do próprio player**, e ela continua ligada
      nas próximas aulas e ao sair e voltar, até ele desligar no mesmo CC. **Sem botão novo**
      (ele recusou o botão da escola: "botão extra não faz sentido"), e sem ligar sempre ("incomoda
      quem não precisa"). Pediu a pesquisa na doc do Bunny → etapa 6.
      **FECHADA em 09/10/2026 — o operador, depois do player novo no ar (etapas 6c e 6d): "Está
      tudo funcionando"**, no Chrome do computador e no iPhone, seguindo o roteiro da publicação de
      07/10 (a aula de ponta a ponta, a legenda lembrada, os botões em português). *Android e aparelho
      antigo não foram citados no retorno dele; o piso de aparelhos segue provado pela medição da
      etapa 4.*
- [x] **Etapa 6 — a legenda lembrada, pelo CC do player (M)** *(proposta em 07/10/2026, aprovada pelo
      operador no mesmo dia: "implementa agora")*. **O que a pesquisa achou** (doc do Bunny, via context7 — 3 consultas além das 4
      da sessão, anotado; e a doc do media-chrome, `/muxinc/media-chrome`): o player novo do Bunny é
      feito de componentes do **media-chrome** e **ainda executa o HTML personalizado** da aba Player
      (*Custom HTML head* — "selectors and script hooks should be updated", guia de migração do
      Bunny); o media-chrome marca a legenda ligada num atributo oficial do controlador,
      **`mediasubtitlesshowing`** (e `aria-checked` no botão CC). **O desenho:** (1) **no painel do
      Bunny** (operador cola uma vez; o texto fica versionado no `bunny.md`), um script curto observa
      esse atributo e avisa a página da escola "ligou/desligou" (`postMessage` só para
      `www.jilsonsantana.com`); (2) **o site** ouve só a moldura do player da aula (origem do Bunny,
      a própria moldura e o formato do aviso conferidos — o aviso é dado não confiável), **grava a
      escolha na conta** (tabela própria `preferencia_do_aluno`, com RLS — `User` fica só com
      identidade) e abre cada aula com `captions=<idioma do curso>` enquanto ela estiver ligada; vale
      em qualquer aparelho. (3) **Testes:** servidor (401, só a própria escolha) e tela (aviso de
      outra origem, de outra moldura ou com formato estranho é ignorado; ligou → gravou e a próxima
      aula abre com `captions`; desligou → a próxima abre sem). **O que só se prova no ar:** o script
      depende do player pôr o controlador ao alcance do HTML personalizado (a doc indica que sim,
      pelos exemplos de CSS do guia); se não puser, ele só não avisa, e nada quebra.
      *(07/10/2026, no `dev`.)* **Banco:** tabela `student_preference` (migration
      `20261007120000_preferencia_do_aluno`, com RLS; uma linha por pessoa, criada na primeira
      mudança; some com a pessoa) — **passo 0 no dev:** as mesmas contagens antes e depois, zero tabelas
      sem RLS, `migrate diff` vazio. **Servidor:** `GET`/`PATCH /api/me/preferences` (`requireAuth`,
      sempre a da sessão; sem linha, desligada). **Site:** `client/src/lib/legenda-lembrada.ts` (o
      leitor do aviso — só a moldura do player da aula, a origem do Bunny e o formato do nosso
      script — e a preferência na memória da tela, que muda na hora e insiste como as outras
      gravações); o player abre com `captions=<idioma do curso>` quando a legenda foi deixada ligada,
      e a página da aula espera a preferência chegar antes de abrir o vídeo (ela vai no endereço);
      aviso igual ao que a conta já tem não vira pedido. **O script** do Bunny está no `bunny.md`, e
      **só avisa a mudança que vem logo depois de um toque do aluno no player** (as do player se
      preparando não contam); **P52:** o operador cola no painel — *colado por ele em 07/10/2026*. *Arrumação:* as funções de montar o
      endereço do player saíram para `client/src/lib/endereco-do-player.ts` (o `BunnyPlayer` tinha
      passado de 200 linhas). **Testes:** servidor 7 (`preferencias.test.ts`); site: o leitor do
      aviso (3), o player (6 novos), a página da aula (8 novos) e **o próprio script, tirado do
      `bunny.md` e rodado num navegador simulado** (5 — se o script e a página deixarem de combinar,
      reprova); suíte inteira verde. **Revisão de segurança** (`security-vulnerability-reviewer`):
      **sem P0**; o **P1** — a página sem `Cross-Origin-Opener-Policy`, e a origem do Bunny sendo a
      mesma para todo cliente dele, o que deixa o canal do aviso menos garantido do que o comentário
      dizia — foi **corrigido na hora**: o cabeçalho `same-origin-allow-popups` em toda resposta
      (`server/src/app.ts`; só vale para a janela principal, o player não muda) e o comentário de
      `legenda-lembrada.ts` com a garantia real (um documento do Bunny na nossa moldura) e a regra
      que segue dela: **por esse canal só passa preferência cosmética**. Análise do agente,
      registrada: o pior caso de um aviso forjado é ligar ou desligar a legenda de alguém; abrir a
      escola numa janela e trocar o documento da moldura já esbarra na regra dos navegadores, e a
      escola dentro da moldura de outro site não leva a sessão (cookie `sameSite=lax`). Os dois **P2**:
      os testes de que um `userId` vindo do cliente (no corpo ou no endereço) não muda de quem é a
      preferência — feitos —, e a RLS conferida no banco (dev: zero tabelas sem RLS, medido; produção:
      a mesma migration, aplicada pelo pre-deploy). *A confirmar no teste no ar: o player continua
      tocando com o cabeçalho novo.* **Mutação: as 17 partes reprovam** (10 do código, 4 do script e
      da página, 3 da revisão) — uma passava na primeira rodada (o player sem esperar a preferência) e
      o teste foi corrigido para esperar a aula chegar antes de soltar a preferência. **Docs check (context7):** Bunny
      (`/bunnyway/documentation` e o fallback `/llmstxt/bunny_net_llms_txt`) e media-chrome
      (`/muxinc/media-chrome`) — consultas listadas acima.
- [x] **Etapa 6b — conserto: o script da legenda refeito para o player que o Bunny serve de verdade
      (P)** *(07/10/2026; teste do operador: no iPhone a legenda era lembrada, no Chrome do computador
      não)*. **Achado, medido:** a página do player, baixada como Chrome de computador e como iPhone
      (pelo endereço do vídeo de apresentação, que é público; o endereço assinado não foi impresso),
      carrega o **Plyr** (`plyr/3.7.8.4-bn`), não o media-chrome que a doc do Bunny descreve — com
      "Enable legacy player" desligado. O script da etapa 6 procurava o `media-controller`, que não
      existe ali: **nunca avisou nada**, em nenhum aparelho. O que funcionava no iPhone era a memória
      do próprio Plyr, guardada no armazenamento da moldura (`captions` e `language`), que no Chrome
      do computador falha. **Conserto, só no script do `bunny.md` (o site não muda):** (1) apaga a
      memória de legenda do Plyr antes de ele começar — a conta passa a ser a única que decide, também
      no iPhone; (2) avisa nos eventos do Plyr (`captionsenabled`/`captionsdisabled`), logo depois
      de um toque do aluno, **um aviso por clique, com o estado final** (o menu do player dispara
      desligou → ligou → desligou em ~14 ms — medido). **Provado com o Plyr do Bunny num Chrome de
      verdade** (banco de prova local, fora do repo: a página e a moldura em endereços diferentes,
      o script tirado do `bunny.md`): abre como a conta manda mesmo com o aparelho lembrando o
      contrário, e o volume lembrado fica; botão CC e menu, ligar e desligar → um aviso cada; o
      player mudando sozinho, sem toque → nada. **Testes:** o do script refeito (7) imita o Plyr
      medido. **Mutação:** 5 de 6 reprovam; a que sobrevive (ouvir sem captura) é equivalente — a
      cópia do aviso na moldura do player sobe pela página. **P53:** o operador cola o script novo
      no painel; vale na hora, sem publicar o site. **Lição:** a página do player se olha **antes**
      de escrever script para ela — a doc descreve um player, e a biblioteca serve outro.
      **Docs check (context7):** não acionado — a fonte foi a própria página do player no ar, que
      desmentiu a doc. **Substituída no mesmo dia pela etapa 6c** (o operador preferiu trocar de
      player); o script do Plyr nunca foi colado.
- [x] **Etapa 6c — o player NOVO do Bunny (M)** *(07/10/2026; pergunta do operador: "por que não
      troca para o mais novo?"; **decisão dele: trocar agora**, e os botões do player no idioma do
      app do aluno)*. **O que a pesquisa achou** (doc do Bunny via context7, 2 consultas, e a página
      do player baixada do ar): o player antigo (Plyr, `iframe.mediadelivery.net`) está
      **descontinuado e sai do ar no começo de 2027**; o novo mora em `player.mediadelivery.net`, e
      **o endereço é que escolhe o player** — com *Enable legacy player* desligado, o antigo
      continuava respondendo. No novo: o mesmo token vale (e sem token, 403); `t`, `autoplay` e
      `captions` iguais; o player.js com os mesmos eventos; o HTML personalizado roda; e **`captions=off`
      vence a memória do aparelho** (o antigo não tinha isso). **Achado de segurança, medido** (a
      partir da revisão do `security-vulnerability-reviewer`, que pediu a conferência — sem P0/P1):
      o endereço **antigo** abria o player com o endereço assinado vindo de **outro site** ou **sem
      origem** (a trava de domínios do painel não valia ali); o **novo** recusa os dois (403). A troca
      fecha a brecha. **O que mudou:** o servidor monta o
      endereço novo (`montarEndereco`, uma linha — vale para aula, apresentação e prévia do admin);
      a página da aula, para quem está logado, abre **toda** aula com `captions=<idioma>` ou
      `captions=off` (a conta decide sozinha — sem apagar memória nenhuma); todo player leva
      `lang=<idioma do app>`; a página só aceita aviso de legenda do endereço novo; e o script do
      `bunny.md` foi refeito para o player novo (ouve os **pedidos** de legenda, que o player só
      dispara por ação de quem assiste; um aviso por clique). **Provado com o player novo num Chrome
      de verdade** (banco de prova local: a página do player baixada do ar, com um vídeo público de
      teste no lugar do nosso): abre como a conta manda mesmo com o aparelho lembrando o contrário;
      CC e menu, ligar e desligar → um aviso cada; abrir ligada → nenhum aviso. **Testes:** o do
      script (5, com os tempos medidos), o player (idioma dos botões, `off`, o endereço antigo
      recusado), a página da aula (`off` para quem está logado) e os do endereço no servidor.
      **Mutação:** 6 de 6 no código reprovam; no script, 5 de 6 — a sobrevivente (não ouvir o
      pedido "desligar") é equivalente no medido, porque o "Desligado" do menu também dispara
      "mostrar: desligado". **Não provado aqui, fica para o teste do operador:** o player novo num
      **iPhone antigo** (a varredura do pacote dele não achou nada além do iOS 15, mas só o aparelho
      prova) e a aula tocando de ponta a ponta no ar (ponto, próxima aula, 90%), porque o vídeo do
      Bunny só toca no domínio da escola. **P53:** o operador troca o script no painel.
      **Docs check (context7):** Bunny Stream → `/bunnyway/documentation` → o player novo, o fim
      do antigo, os parâmetros do embed (`captions`, `lang`, `t`, `autoplay`) — 2 consultas.
      **Revisão do player (pedido do operador, 07/10/2026, enquanto o CI do GitHub estava fora do
      ar):** o NOSSO módulo de verdade (`player-do-bunny.ts`, empacotado) ouvindo o player novo de
      verdade, com um vídeo público tocando: tocou sozinho, abriu no segundo pedido (565), tempo com
      duração, 90% concluíram (571 de 634 s), pausa e volta, fim (pausa e depois fim, a mesma ordem do
      antigo — a gravação do ponto já trata). Lido no pacote do player: o player.js dele só fala com a
      página que o abriu, e o "pronto" exige o endereço idêntico ao da moldura — **no ar não há
      redirecionamento** (medido). Sem nada a corrigir.
- [x] **Etapa 6d — a checagem diária do script da legenda (P)** *(07/10/2026; decisão do operador,
      entre as saídas para o dia em que o Bunny não rodar mais o script — as outras ficam registradas
      no `bunny.md`)*. `scripts/checar-legenda-no-player.mjs` (`npm run checar:player`) +
      `.github/workflows/checagem-do-player.yml` (todo dia, 06:17 em Brasília, e à mão): confere no ar
      que o site abre o player novo, que o nosso script (versão do player novo) está na página dele e
      que o pacote do player tem os nomes que o script ouve; falhou → e-mail do GitHub. Nunca imprime
      o endereço assinado (repositório público). **Provado:** contra o site de hoje (ainda no player
      antigo) **falha**, com a explicação certa; com a página e o pacote reais do player novo
      **passa** — o que também confirmou que o script colado pelo operador é a versão nova —; e
      **falha** em cada quebra simulada (script fora do painel, script antigo colado, pedido
      renomeado, estado renomeado, volta do Plyr, pacote ausente). *Começa a valer quando a `main`
      tiver o player novo (o agendamento só roda na `main`).*
- **Done when:** os 6 comportamentos do pedido passam no roteiro da etapa 5, sem erro, nos aparelhos
  testados; CI verde nos dois jobs. ✅ **Cumprido em 09/10/2026** (o retorno do operador na etapa 5;
  CI da `main` = `c241002` verde nos dois jobs).

**Decisão registrada:** *o ponto e a última aula moram na CONTA, não no navegador* — o pedido exige
outro aparelho e "daqui a um mês", e o Safari apaga o armazenamento do site em 7 dias. *Sem gatilho:
é o que o comportamento pedido exige.*

### Bloco MEDIR — o que a Fase 5 constrói sem decisão pendente  *(pedido do operador, 09/10/2026: "você não quer montar um plano de implementação e fazer logo?")*

> Os três itens da Fase 5 que **não esperam decisão**: guardar os eventos do vídeo, os números do
> cartão do admin e a trilha concluída. Uma etapa por commit, cada uma com teste e mutação. A
> avaliação do curso e o depoimento (decididos em 09/10) ficam para o bloco seguinte, porque têm
> tela e texto novos que são do operador.

- [x] **Etapa 1 — guardar os eventos do vídeo (`LessonEvent`) (M)** — **não muda nada que o aluno
      vê**. Tabela `lesson_event` (tipo **PLAY / PAUSE / ENDED**, o segundo do vídeo, a hora), com
      RLS, presa à pessoa e à aula — some com elas, **nunca** com o churn (`CLAUDE.md` → *Churn não
      apaga nada*). `POST /api/lessons/:id/eventos`: só logado, só aula de **vídeo**, a mesma trava
      do ponto (cadeia publicada + aula liberada). A página da aula manda: **tocou**, **pausou**,
      **terminou**; e, para as horas assistidas não contarem a aba escondida, **pausou** quando a
      página some com o vídeo tocando (o envio que sobrevive a fechar a aba, `envio-na-saida.ts`) e
      **tocou** quando ela volta. **O admin não grava** — assistir para conferir não pode inflar as
      horas dos alunos. *SEEK fica de fora até uma análise pedir (uma linha de migration).*
      *(09/10/2026, no `dev`.)* **Banco:** migration `eventos_do_video` (enum + tabela + 2 índices +
      RLS) — **passo 0 no dev:** as mesmas contagens antes e depois (25 → 26 migrations), zero tabelas
      sem RLS, `migrate diff` vazio. **Servidor:** a rota no `progress.ts`, junto da do ponto, com o
      segundo inteiro (o player manda fração). **Site:** `client/src/lib/eventos-da-aula.ts` (o
      gancho: um "tocou" abre o trecho e o evento seguinte fecha; esconder a página tocando fecha na
      hora pelo `enviarJa` de `envio-na-saida.ts`, e voltar tocando reabre; sair da aula tocando
      fecha; em fila, insistindo — evento repetido não muda a conta); a página da aula entrega o aviso
      do player ao ponto E aos eventos, e o admin não grava. **Testes:** servidor 12 (401, 404 fora da
      cadeia publicada, 400 na aula de texto e no corpo errado, 403 sem assinatura e a prévia grátis
      guardando, a ordem, o segundo inteiro e a pessoa da sessão); site 6 do gancho + 3 da página da
      aula. **Mutação: as 10 partes reprovam** (a trava da assinatura, a aula de texto, a cadeia
      publicada; esconder, voltar, sair, a fila, a aba escondida; o admin gravando; a pausa sem chegar
      aos eventos). *A prova com o vídeo de verdade, no ar, vem com a etapa 2: as horas no cartão.*
      **Revisão de segurança** (`security-vulnerability-reviewer`): **sem P0**; o **P1** — a primeira
      tabela em que o aluno só acrescenta linhas, sem teto: um script enchia o banco de todos —
      **corrigido na hora**: **30 eventos por minuto e 1.000 por dia por pessoa**, passou → 429 sem
      gravar (a tela não insiste em 4xx); 2 testes, e tirar o teto (inteiro, do minuto ou do dia)
      reprova. Os dois **P2** viraram nota onde agem: a conta das horas limita cada trecho e ignora
      conta excluída (etapa 2, abaixo); a exclusão a pedido apaga os eventos (Fase 7, LGPD).
- [x] **Etapa 2 — os números do cartão do admin (M)**: **horas assistidas** (do `LessonEvent`: o
      tempo entre "tocou" e o próximo "pausou"/"terminou", com teto, só de alunos) e **alunos que
      começaram** (do `LessonProgress`: quem abriu uma aula do curso, só alunos), **no mês e no
      total** — rota própria `/api/admin/stats/*` (`CLAUDE.md` → *Analytics Convention*). O mês é o
      de Brasília. **Visível para o operador:** o formato no cartão é dele (proposta abaixo).
      *Da revisão de segurança da etapa 1 (P2):* cada trecho conta no máximo a **duração do vídeo da
      aula**; "tocou" sem evento seguinte **não conta**; conta com `deletedAt` **não entra**.
      *(09/10/2026, no `dev`.)* **Servidor:** `server/src/routes/admin-stats.ts` —
      `GET /api/admin/stats/cursos` (`requireAdmin`, sem cache), duas consultas SQL: as horas (o
      trecho de cada "tocou" até o evento seguinte da mesma pessoa na mesma aula, com o teto da
      duração do vídeo, ou 3 h sem ela) e os alunos (a primeira linha de progresso de cada um no
      curso); os dois no total e a partir da meia-noite do dia 1º **em Brasília**; só `member`, sem
      `deletedAt`. **Site:** o cartão mostra o total grande e "N este mês" embaixo (decisão do
      operador); curso sem número = zero; carregando ou falha = "—" (a lista continua). **Testes:**
      servidor 6 (quem lê; as horas com o "tocou" repetido, o fechamento perdido, a falta de duração,
      o "tocou" sem fechamento, o admin e a conta excluída fora; os alunos contados uma vez; o mês de
      Brasília conferido por fora do banco, e um trecho uma hora antes da meia-noite de lá contando
      no mês passado); site 3 do cartão. **Mutação: as 9 partes reprovam.** *A prova com o vídeo de
      verdade: depois de publicar, assistir uma aula com a conta de aluno e ver as horas no cartão.*
- [x] **Etapa 3 — a trilha concluída e a porcentagem da trilha (M)**: a trilha salva está concluída
      quando todas as aulas dos itens dela estão concluídas (item de curso = as aulas publicadas dele);
      é o que a Fase 6.5 usa para o certificado. **Visível para o aluno:** onde a porcentagem aparece é
      do operador (proposta abaixo).
      *(09/10/2026, no `dev`.)* **Servidor:** `progressoDasTrilhas` em `server/src/lib/progresso.ts` +
      `GET /api/progresso/trilhas` (só logado, sem cache), irmã da `/progresso/cursos`: só as trilhas
      DELE, só a cadeia publicada, a aula que entra pelo curso e avulsa conta uma vez, concluída =
      aula concluída de verdade; devolve só as começadas, com `concluida` (todas as aulas). **Site:**
      a barra do cartão do curso virou peça compartilhada (`components/content/BarraDeProgresso.tsx`,
      as mesmas classes) e o cartão da trilha a usa em Minhas trilhas e no Início, só na começada; o
      rótulo do leitor de tela, "Progresso na trilha", é rascunho do agente (P55). **Testes:**
      servidor 5; site 3 (Minhas trilhas e Início). **Mutação: as 8 partes reprovam.**
- **Decididas pelo operador em 09/10/2026 (as propostas do agente, aceitas como estavam):** (2) no cartão do admin,
  o número grande é o **total** e a linha pequena embaixo diz **"N este mês"**, no lugar de "em
  breve"; a Avaliação continua "em breve" até a avaliação do curso existir. (3) A porcentagem da
  trilha aparece **no cartão da trilha em Minhas trilhas e no Início**, com a mesma barra do cartão
  do curso, só na trilha começada.
- **Done when:** os eventos chegam ao banco a cada tocar/pausar/terminar (provado no ar com o vídeo
  de verdade); o cartão do admin mostra horas e alunos reais; a trilha mostra a porcentagem e sabe
  quando está concluída. CI verde nos dois jobs.

## Phase 6 — JilsonAI (lean v1 + suporte)  *(medium risk)*  → ver **JILSONAI.md** (roadmap interno)

> **O JILSONAI ENTRA NO DIA DA ABERTURA** *(decisão do operador, 28/10/2026, à pergunta da P84 — o
> agente recomendou abrir antes e trazê-lo logo depois)*. **A abertura ao público (etapa 4.7, passo 8)
> passa a depender desta fase**, e a linha "Suporte com JilsonAI + Jilson" do cartão de preço fica
> como está. *Reabre se a Fase 6 atrasar a abertura além do que o operador aceitar — aí a linha muda
> em Admin → Textos e a escola abre antes.*

- [ ] JilsonAI Fases 0–3 (gateway, chat com contexto do curso, escalação humana, tools com
      escopo + msg privada). Inclui tool `recommendTrilha` (sugere trilha curada pelo objetivo).
- [ ] **INSTALAR a AI SDK — dependência nova JÁ APROVADA pelo operador (Set 2026), só executar:**
      `npm --workspace server i ai @ai-sdk/anthropic @ai-sdk/google`. Server-side only;
      rate-limited per member; chat panel in member area. **A aprovação é desta lista exata** —
      qualquer pacote além destes três volta a ser decisão de plano.
- [ ] **`llm.complete()` resolve o modelo por STRING** via `createProviderRegistry`
      (`"anthropic:claude-sonnet-5"` default, `"google:gemini-…"` como segunda opção).
      **`generateText`/`streamText` NÃO saem deste arquivo** — a Vercel é fornecedor como
      qualquer outro, e sair dela tem que custar um arquivo (ver `CLAUDE.md` → JilsonAI).
- [ ] **Catálogo de modelos permitidos em `core/src/constants/`**, e o valor que vem do admin é
      **validado contra ele** — nunca repassado cru ao registry. (String de modelo escolhida pelo
      usuário é entrada não confiável, como qualquer outra.)
- [ ] **`AiEvent` grava QUAL modelo atendeu.** Sem essa coluna não há como responder depois
      *"a qualidade caiu quando eu troquei?"* — e é a única evidência que sobra.
- [ ] **Seletor de modelo no admin — SÓ ENTRA JUNTO com o harness de eval** (JILSONAI.md Fase 3).
      **Não é preferência de sequência:** trocar de modelo sem reexecutar conversas antigas
      degrada o JilsonAI **sem erro, sem log e sem aviso** — descobre-se pelo aluno reclamando
      semanas depois. Seletor sozinho é um botão para piorar o produto às cegas.
- [ ] **Reconferir preço de API na abertura desta fase** — os números do `jilsonai.md` são de
      set/2026 e preço de fornecedor envelhece sozinho. Não copiar do doc; conferir.
- [x] ~~**O JilsonAI responde no idioma do aluno**~~ — **CANCELADO em 12/10/2026**: a escola é só
      em português, e o JilsonAI responde em português.
- [x] *(Resolvido em 27/09/2026: `react-markdown`, que entrou pela descrição do curso — Bloco B
      da Fase 3 e `tech-stack.md`. Fica para esta fase só **o que o chat aceita**: a lista de
      `permitidos` do `MarkdownText` e se entra plugin para bloco de código.)*
      **DECISÃO PENDENTE — qual renderer de Markdown.** O `CLAUDE.md` já **proíbe**
      `dangerouslySetInnerHTML` e manda renderizar "com HTML bruto desabilitado ou sanitizado",
      mas **a biblioteca nunca foi escolhida nem instalada** (conferido em Ago 2026: não há
      `react-markdown`, `marked` nem `dompurify` em nenhum `package.json`). É dependência nova ⇒
      **decisão de nível de plano** (Working Method), não `npm install` no meio do bloco.
      **Requisito que decide:** desabilitar HTML bruto por **configuração**, não por sanitização
      posterior — desligar a porta é verificável em uma linha de config; sanitizar é confiar numa
      lista de bloqueio que envelhece.
- [ ] **Teste de componente do painel de chat cobrindo o caso adversário**, não só o feliz: uma
      resposta do modelo contendo `<img src=x onerror=alert(1)>` e uma contendo `[link](javascript:…)`
      renderizam como **texto**, nunca como nó ativo. **Por que este teste é obrigatório e o resto
      da tela não é:** este é o **único** ponto do produto onde conteúdo gerado por um modelo
      **alimentado com input de aluno** vira DOM — é o vetor nomeado no `CLAUDE.md` como o real,
      não hipotético.
- **Done when:** members ask and get answers in Jilson's voice; unresolved → escalation; JilsonAI
      suggests a curated trilha by goal. (RAG, KB, montagem de plano por IA = JILSONAI Fase 4–5, pós-launch.)

## Phase 6.5 — Certificates (trilha + course completion)  *(low–medium risk — MVP: "escola nasce completa")*

> **OS CERTIFICADOS ENTRAM NO DIA DA ABERTURA** *(decisão do operador, 28/10/2026 — o agente recomendou
> logo depois, antes de alguém concluir um curso)*. A home promete "Certificado de conclusão" em todo
> curso e "um certificado por trilha concluída". *Reabre se esta fase atrasar a abertura além do que o
> operador aceitar.*

- [ ] `Certificate` (user, planId/courseId, issuedAt, `nameSnapshot`, `skillsCovered[]`, **`isPublic` default false**) + RLS ; migration
- [ ] Server-side PDF on 100% completion of a trilha (or course). Name = trilha name; lists skills covered.
- [ ] If `User.name` missing at issue time, prompt the student for the name to print.
      **Decisão do operador (21/10/2026 — fecha a P83):** o nome não é pedido ao assinar nem ao
      criar a senha; a pessoa preenche em Minha conta quando quiser e, *"quando for emitir o
      certificado se estiver sem nome aparece a tela para preencher na hora, salva no banco e gera
      o certificado"*.
- **Decisão do operador, 09/10/2026 (a P39 — o que o certificado atesta):** *"o certificado é só para
  assinante, e o cálculo para emissão só com as aulas concluídas do aluno logado"*. Emite só para
  quem tem assinatura ativa, contando as aulas que a plataforma marcou como concluídas **na conta
  dele** (vídeo aos 90%, texto ao abrir — decisão de 03/10), **sem** prova extra no servidor de que
  o vídeo chegou aos 90%. *Gatilho de reabertura (proposto pelo agente): certificado emitido para
  quem marcou aulas sem assistir, medido — aí o servidor passa a exigir a prova.*
- [x] ~~**Certificate in the trilha/course language**~~ — **CANCELLED on 12/10/2026**: the school is Portuguese-only. The certificate's fixed text still comes from the shared dictionary (`pt.ts`).
- [ ] **Public verifiable URL.** Route **`/certificado/:publicId`** (`publicId` cuid — **nunca a PK sequencial**; ver `CLAUDE.md` → Database & Migrations) listing the `skillsCovered`, with Open Graph optimized for LinkedIn sharing → each graduate becomes an organic marketing vector and feeds the "emprego em empresa" angle (cert by competencies). **TRAVA:** student opt-in (`isPublic`, default false). The cert always exists; the public route is private/404 unless the student allows it (LGPD). ✅ **O requisito de OG passa a ser CUMPRÍVEL desde Ago 2026** — esta rota é pública e montada no servidor (`CLAUDE.md` → Rendering Boundary); enquanto o site era SPA puro, este checkbox pedia algo que a arquitetura não entregava, porque o crawler do LinkedIn lê HTML cru.
- [ ] **Certificate-as-media upgrade (same phase, small):** dedicated **OG image** rendered
      server-side alongside the PDF (wordmark + student name + trilha + skills — Apple-clean, spec
      in DESIGN.md §6); **"Add to LinkedIn"** button (Add-to-Profile deep-link, pre-filled); every
      link back to the site carries **`utm_source=certificate`** → closes the loop with P1
      attribution capture and makes each graduate a *measurable*, CAC-zero acquisition channel.
      Opt-in gate (`isPublic`) unchanged.
- [ ] **Archiving a course does NOT affect issued certificates.** `[FATO, operator decision — Ago
      2026]` The snapshot design (`nameSnapshot`, `skillsCovered[]`) already guarantees this: the
      certificate never reads the live course. Two consequences to honor explicitly: the public
      `/certificado/[id]` route **stays live** for archived-course certificates (a 404 in 2030
      breaks the CAC-zero acquisition channel this phase exists to create), and certificate
      eligibility is evaluated **at completion time**, never re-derived from current catalog state.
      Rotation frees a catalog slot — nothing else. See `courses.md` D9 / §1.3.
- **Done when:** completing a curated trilha issues a certificate PDF with name + competencies.

## Phase 7 — Launch Prep  *(medium risk)*

- [ ] Transactional emails (Resend): welcome, receipt, password reset (transactional ignores `marketingConsent`)
      *(As boas-vindas de quem assina sem conta e a recuperação de senha — por CÓDIGO no e-mail —
      são da etapa 4.7, passo 5, decisões do operador de 21/10/2026.)*
      — in Portuguese (the school is Portuguese-only since 12/10/2026)
- [ ] LGPD: privacy policy, terms, consent, data export/delete path (in Portuguese only — the
      English versions left on 12/10/2026)
- [ ] Error/loading states everywhere; security review (subagent) on auth/billing/video
      - [x] **A página em branco ao reabrir uma página de antes de uma publicação** *(achado do
            operador, 27/10/2026: "Eu abro uma aula para assistir e mudo de guia […] quando volto
            fica tudo em branco")*. **Medido no registro do Google:** às 00:58:53 o Safari reabriu
            uma página de 26/10 e pediu o arquivo PRINCIPAL do app daquela versão (404) — sem ele o
            app nem começa, e a proteção de `recarregar.ts`, que mora no app, nunca roda. **O
            conserto:** um vigia escrito no começo da página do app (`client/src/lib/arquivo-que-sumiu.ts`,
            ligado pelo `vite.config.ts`; a `/assinar` o recebe pelas etiquetas do app): script ou
            folha de estilo do app que não chega recarrega a página uma vez, com a MESMA trava de 30 s
            do app. Testes executam o vigia de verdade; mutação (nunca reconhece o arquivo · sem a
            trava · qualquer arquivo recarrega · o vigia no fim da página · o Vite sem o plugin): as
            cinco reprovam.
            **Em aberto:** a aba da aula no Chrome (por volta de 01:27) ficou em branco SEM fazer
            pedido nenhum ao site — não é este caso. Na próxima vez: o Console do navegador
            (botão direito → Inspecionar → Console) com o que estiver em vermelho.
            *(Achado junto, reportado e não consertado: a home aponta `og:image` para
            `/img/og-home.jpg`, que não existe — 404 no registro; o cartão do link compartilhado sai
            sem foto.)*
- [ ] **A proteção na entrada, revista antes da abertura** *(pedido do operador, 27/10/2026)* — conferir
      com o operador os sinais de ataque e a escada do que ligar (`tech-stack.md` → *Proteção na
      entrada*), e se algum gatilho já se cumpriu. Nada se liga sem gatilho.
- [ ] **⚠️ REVISTO em 10/10/2026: a Stripe de verdade entra na etapa 4.3, não aqui.** Com isso, a
      troca de chaves e a limpeza descritas abaixo **deixam de existir** (o banco de produção nunca
      recebe assinatura nem cliente do modo de teste). **O que continua sendo deste item, antes da
      primeira venda de verdade:** avaliar uma **chave restrita** no lugar da secreta padrão · o
      nome que aparece na fatura do cartão (P58) · o reembolso cortar o acesso (decidido em
      10/10/2026, `billing.md` → *Reembolso*; falta o código: etapa 4.6) · o
      imposto fora do Brasil (P22) · o código de 100% para presentear: aleatório e de 1 uso.
      *O texto original, como registro:*
      **A Stripe de verdade — e as assinaturas do modo de teste SAEM do banco de produção** *(achado
      P2 da revisão de segurança da etapa 4.1, 09/10/2026)*. Com a conta de verdade **ativada** (os
      dados da empresa e a conta bancária): no Railway, trocar as chaves e o segredo do webhook do
      modo de teste pelos de verdade — avaliando uma **chave restrita** no lugar da secreta padrão
      (menos poderes se vazar) —, e cadastrar o endereço do webhook no modo de verdade do painel.
      **O que foi criado no ambiente de teste não existe na conta de verdade**
      (fato da doc, 10/10/2026): o produto, os 2 preços **com as mesmas lookup keys**
      (`assinatura_mensal`, `assinatura_anual`), o cupom com o código promocional e o ajuste de
      "cancelar quando todas as tentativas falharem" são refeitos lá; e o nome que aparece na fatura
      do cartão se decide (P58). **Na mesma publicação, apagar do banco de produção as `subscription` com
      `livemode = false`:** as chaves de verdade nunca mais recebem aviso delas, então nenhuma seria
      cancelada — e uma ativa daria acesso para sempre. **E os `stripe_customer` com `livemode =
      false`** *(etapa 4.2, 10/10/2026)*: o cliente do modo de teste não existe na conta de verdade,
      e a conta que ficasse com ele não conseguiria assinar. **Na subida do servidor, uma
      conferência que grita** se houver linha de teste nas duas tabelas com a chave de verdade no
      lugar *(revisão de segurança da 4.2)*. **O código de 100% da conta de verdade:** aleatório
      e de 1 uso — código legível se adivinha. Como apagar sem falar direto com o banco de
      produção (só o Railway fala com ele) se decide na abertura do item. O `member@` de produção
      assina de novo, com o cupom de 100% do modo de verdade.
- **→ MOVIDOS para a Fase 3, bloco "Gates" (Ago 2026):** *rate-limit de auth* e *CI não roda
      testes*. Razão: **gate não é feature** — sem CI, teste escrito depois vale zero. O texto
      completo dos dois (com os `[FATO]` e o "passo 1 = verificar a borda") mora agora no **Bloco 0
      da Fase 3**; não duplicar aqui.
- [ ] **Monitor de erro externo gerenciado — PRÉ-REQUISITO DO PRIMEIRO ALUNO PAGANTE.** Hoje a
      única forma de descobrir um erro em produção é **o aluno reclamar**: não há captura de
      exceção, nem alerta, nem histórico (o log do Railway não é ferramenta de detecção). Serviço
      gerenciado, **tier grátis** — client + server. **Fornecedor: o Sentry, no plano grátis**
      *(decisão do operador, 10/10/2026 — fecha a P25; os pacotes são nomeados no plano do bloco
      que instalar, e o limite do plano grátis se confere na página deles na hora)*. Substitui o antigo alerta por fila
      `admin-alerts` do pg-boss, cujo defeito era a detecção depender da própria coisa que deveria
      detectar (ver Fase 4 e CLAUDE.md → Background Jobs).
      **Os erros de cobrança que hoje morrem no registro** *(revisão de segurança da etapa 4.2,
      10/10/2026)* e que o monitor precisa pegar: o checkout dizendo que há assinante pagando e
      trancado fora, ou que uma assinatura foi cancelada já paga (`lib/checkout.ts`) · a cobrança
      não configurada e todo erro 500 de assinar (`routes/billing.ts`) · o aviso recusado, a
      assinatura sem conta e a falha ao processar o aviso (`routes/stripe-webhook.ts`).
      **Da revisão da etapa 4.4 (10/10/2026) — as linhas a alertar, pelo começo delas:**
      `[api] POST /api/stripe/webhook` (o aviso que falhou, ou cujo corpo foi recusado) ·
      `[api] POST /api/admin/assinaturas/sincronizar falhou` · `[stripe]` em nível de erro (o
      assinante trancado fora, quem quer assinar e não consegue, a cancelada já paga, o aviso
      recusado por falta do segredo). *Com as chaves de verdade já no site (10/10), isto precede
      o primeiro pagante que não seja o operador.*
      **PLANO APROVADO (10/10/2026) — PARTE 1: O SERVIDOR.** *(Operador: "você arruma de forma
      que ele cumpra o seu papel e justifique o seu uso" e, visto o plano, "Sim. vamos lá".)*
      Puxado para antes da etapa 4.7: o site já usa as chaves de verdade da Stripe.
      - **Dependência nova, aprovada:** `@sentry/node`, fixada em **`10.75.3`**. *Por que a
        linha 10 e não a 11 `[MEDIDO em 10/10/2026]`:* a 11 tinha 17 dias de vida e 7 versões
        nesse tempo, e traz 42 pacotes; a 10.75.3 traz 21, tem um ano de uso e segue recebendo
        correção. *Reabre quando a linha 10 parar de receber correção, ou com a 11 madura.*
      - **O que vira alerta:** todo `console.error` do servidor que começa com uma etiqueta
        nossa (`[stripe]`, `[api]`, `[bunny-stream]`…) — é a convenção que o repo já usa (erro =
        precisa de gente; aviso = não) — e o que derrubaria o processo. **Linha de biblioteca de
        terceiro não vai:** o Better Auth registra senha errada como erro, e isso gastaria a cota.
      - **O que sai do servidor:** a linha ou o erro, e a versão do app. **Nunca:** cabeçalho,
        cookie, corpo do pedido, usuário, IP, nem o rastro do que veio antes (desligado). E-mail
        e segredo que apareçam num texto são mascarados antes de sair.
      - **Convenções de engenharia:** o Sentry só é importado em `server/src/lib/monitor.ts`
        (trocar de fornecedor custa um arquivo) · liga só em produção e só com `SENTRY_DSN` (em
        produção sem ela, um aviso no registro) · sem medição de desempenho e sem os ganchos de
        carregamento de módulo · a cada subida, um aviso "no ar, versão X" — é a prova de que a
        ligação funciona em produção · ao desligar, espera o envio do que estiver pendente.
      - **Passos, um commit cada:** (1) este plano · (2) a biblioteca, `monitor.ts`, a ligação
        no `index.ts` e no desligar, e os testes com um transporte de mentira (o que sai e o
        que não sai), com mutação · (3) os docs — `CLAUDE.md` (a convenção do `console.error` e
        o import único), `tech-stack.md`, `.env.example` e as pendências do operador.
      - **Com o operador, no painel:** um DSN novo no lugar do que apareceu numa foto de tela, a
        variável `SENTRY_DSN` na Railway, a regra de alerta por e-mail e o monitor de site fora
        do ar.
      - **Fora desta parte:** as telas do aluno (parte 2, com a medição do peso no carregamento
        e do piso de aparelhos) · ligar o repositório ao Sentry · medição de desempenho.
      - `Docs check (context7): superfícies fixadas → not triggered`. Sentry →
        `/getsentry/sentry-javascript` (2 consultas) → o transporte de teste (`createTransport`),
        `captureConsoleIntegration` (eventos) × `consoleLoggingIntegration` (outro produto), a
        ligação sem `--import` quando não se usa instrumentação automática, e o que mudou na 11.
      **FEITO (10/10/2026) — passos 2 e 3.**
      - **O que nasceu:** `lib/monitor.ts` (o único arquivo com o Sentry), `monitor-no-ar.ts`
        (liga antes de o app montar) e a ligação no `index.ts` — o aviso de "no ar" a cada
        subida, e a espera do envio ao desligar.
      - **Três ajustes para o alerta não gritar à toa, achados ao ligar:** (a) **erro fora de
        `/api`** (a home quebrada) não tinha etiqueta e não alertaria: `lib/erro-do-site.ts`
        anota com `[site]` e deixa a resposta como era · (b) **endereço malformado em `/api`**
        (coisa de robô) respondia 500 com linha de erro — medido; agora é 400
        `EnderecoInvalido`, com aviso · (c) **o aluno que desiste de um download** gerava linha
        de erro; agora é aviso, e o Storage caindo no meio continua erro.
      - **Mudança de comportamento, de propósito:** com o alerta ligado, a promessa rejeitada
        sem tratamento vira alerta e o servidor segue de pé (antes, ela o derrubava e cortava
        os pedidos de todos). Fora de produção continua derrubando.
      - **A cota:** no máximo 30 envios em 10 minutos e 150 por dia; o que passar fica só no
        registro, com um aviso. *Reabre se um problema de verdade ficar sem alerta por causa
        do limite.*
      - **Removido por medição:** a opção de tamanho máximo do texto — na versão instalada o
        texto da linha não é cortado, então ela não fazia nada.
      - **Testes:** +26 de servidor (727): o que vira alerta e o que não vira, o que nunca sai,
        a cota, o import único, o erro fora de `/api`, o endereço malformado e os dois casos de
        download. Nos testes o Sentry de verdade roda com a rede trocada por um gravador.
        **Mutação:** 23 de 23 reprovaram (uma 24ª mostrou a opção inútil, removida).
      - **Provado em execução, no computador:** o servidor MONTADO, em modo de produção, contra
        um Sentry de mentira local e o banco de teste local — chegaram o aviso de "no ar" e uma
        linha de erro de verdade (`[stripe] aviso recusado…`, origem `stripe`); a senha errada
        do Better Auth (linha de terceiro) e o endereço malformado NÃO saíram; do pedido não
        saiu nada (cookie, e-mail do corpo, o que vem depois do "?"); o servidor saiu com
        código 0 ao receber o aviso de desligar.
      - **Provado em PRODUÇÃO (10/10/2026):** depois da publicação, o aviso "[servidor] no
        ar, versão mv32ckxr-d02f9f62" apareceu no painel do Sentry (o operador conferiu), e o
        e-mail de teste da regra de alerta chegou na caixa dele.
      - **O CI reprovou a primeira tentativa, e a causa virou regra:** um teste novo passava
        no computador (que tem as chaves de teste da Stripe no `.env.test`) e reprovou no CI,
        que não tem — 503 no lugar de 500. Reproduzido sem as chaves, corrigido, e a suíte
        inteira rodada nessa condição (727). A regra está no `CLAUDE.md` → *Testing*.
      - **A borda da Railway barra parte dos endereços malformados antes de nós**
        `[MEDIDO em produção, 10/10/2026]`: `%zz`, `%` e `%E0%A4%A` recebem 502 "upstream
        error" da própria borda (`server: railway-hikari`), sem chegar ao servidor; a sequência
        com hexadecimal válido e UTF-8 inválido (`%C3%28`) chega — era ela que respondia 500 e
        passou a responder 400. É a que serve de prova depois de uma publicação.
      - **No painel, com o operador (10/10/2026 — fecha a P63):** a chave antiga apagada e uma
        nova na variável `SENTRY_DSN` da Railway · o monitor de site fora do ar "Site online"
        (a cada 1 minuto em `/api/health`; verde) · a regra "Erro novo no servidor" (problema
        novo, que piora ou que volta, de nível erro ou maior → e-mail para ele) · a regra de
        fábrica, de alta prioridade, mantida para o site fora do ar · os dois e-mails de teste
        chegaram. Na regra de fábrica, o destinatário de reserva passou de "membros ativos
        recentemente" para "todos os membros do projeto" (o aviso não depende de ele ter
        aberto o painel há pouco).
      **ONDE PAROU:** parte 1 PUBLICADA e ligada em 10/10/2026 (`main` = `354c96a`). Falta a
      parte 2 (as telas do aluno), quando o operador escolher.
- [ ] **Backlog P2 do `security-vulnerability-reviewer` (7 no relatório; os nº 1, 2 e 6 foram
      movidos e o nº 5 foi **fechado por migration versionada** → **3 pendentes aqui**. Nenhum
      bloqueia merge; todos antes do primeiro aluno pagante.)** A numeração original do relatório é
      preservada para o mapeamento não quebrar.
      > **Nota de processo — o nº 5 foi fechado errado, reaberto e fechado de novo no mesmo dia.**
      > Fica registrado porque a contagem "3 pendentes" já esteve certa pelo **motivo errado**: o
      > primeiro fechamento verificou **um** ambiente e concluiu "suspeita falsa". Contagem de
      > backlog é resultado, não prova — ler a razão do fechamento antes de confiar no número.
      (1) **→ MOVIDO para a Fase 4** (testes de servidor, supertest). Era "sem teste de fronteira
      no servidor": não há suíte no workspace `server`, e o E2E só assere redirect do React Router,
      que é guarda cosmético do client. A matriz 401/403/200 (`/api/me`, `/api/admin/ping`) e o
      "público não vaza `DRAFT`" agora são checkboxes **colados ao handler de webhook** na Fase 4 —
      escrever junto, não depois. Não contar neste backlog.
      (2) **→ MOVIDO para a Fase 3** (`include` → `select` nas rotas públicas de detalhe). Virou
      pré-requisito de escopo lá, não backlog daqui: tem que estar feito **antes** de qualquer
      coluna de vídeo entrar no modelo. Não contar neste backlog.
      (3) **`PREVIEW_TOKEN` em query string** (`index.ts:80-92`) — aparece em log de proxy,
      histórico e `Referer`; comparação não é de tempo constante; `PREVIEW_TOKEN` e `COMING_SOON`
      não constam no `server/.env.example`.
      (4) **escritas admin fora do prefixo `/api/admin/*`** (`courses.ts:138,150,171`,
      `modules.ts:14,25,39`, `lessons.ts:44,55,69`, `trilhas.ts:139`) — todas corretamente atrás de
      `requireAdmin`, custo é de auditabilidade: "essa rota é admin?" deixa de ser respondível pelo
      path. Mover ou registrar a exceção como decisão do operador — não deixar leitura em
      `/admin/courses` e escrita em `/courses` no mesmo router.
      (5) **✅ FECHADO DE VERDADE (Ago 2026) por migration versionada — depois de ter sido fechado
      ERRADO e REABERTO no mesmo dia.** A suspeita original do relatório era **VERDADEIRA**: a
      tabela `_prisma_migrations` é criada pelo Prisma **fora** das migrations versionadas, então
      nenhum `ENABLE ROW LEVEL SECURITY` nosso jamais passou por ela.
      **Por que o primeiro fechamento errou:** foi verificado **só produção**
      (`gaxmbnhwltljlkukdwba`), onde `pg_class.relrowsecurity` já era `true` — e daí se concluiu
      "suspeita falsa, nenhuma migration necessária". **O dado que derrubou isso:** o banco de teste
      `mvaobzypsiuhqzipcelw` recebeu **as MESMAS 3 migrations** por `prisma migrate deploy` e lá a
      mesma tabela veio com **`relrowsecurity = false`**. As 10 tabelas de domínio vieram `true` nos
      dois. Logo o RLS de produção **não vinha do versionamento** — vinha de um ajuste **de fora**.
      *(Causa mais provável, não distinguida pela evidência: o **"Automatic RLS"** do projeto de
      produção, que estava ligado — no projeto de teste ele foi **desligado de propósito** na
      criação. O que a evidência prova é o que importa: **não veio das migrations**. Se foi um
      humano no painel ou um ajuste de projeto não muda nem o conserto nem a lição.)*
      **Conserto aplicado:** migration `20260824214838_rls_prisma_migrations_table` com o
      `ALTER TABLE "public"."_prisma_migrations" ENABLE ROW LEVEL SECURITY;`, aplicada **nos dois
      bancos por `prisma migrate deploy`** — nunca por painel, nunca por MCP, porque o objetivo é o
      estado ser **REPRODUZÍVEL em qualquer banco futuro**. Idempotência confirmada **antes** de
      escrever a migration (três `ALTER` consecutivos numa tabela de sondagem descartável, sem
      erro), e é por isso que ela roda limpa em produção, onde o estado já era o desejado.
      **Prova final, nos DOIS bancos:** 11 tabelas em `public`, **0 sem RLS**,
      `_prisma_migrations.relrowsecurity = true`, 4 migrations aplicadas, 0 rollbacks; advisors só
      INFO `rls_enabled_no_policy`. Produção reconferida após a aplicação: **2 users e 39 sessions,
      idênticos ao pré-voo**.
      > **LIÇÃO (o motivo de este item valer mais reaberto que fechado): estado verificado em UM
      > ambiente não prova estado REPRODUZÍVEL.** Produção carregava um ajuste manual invisível e,
      > por isso, *parecia* correta — a verificação confirmou o **sintoma certo pelo motivo errado**.
      > Só a criação de um **segundo** banco a partir das mesmas migrations revelou o furo. É a mesma
      > família de *"gate que mente"* (o `lint` que rodava `tsc`) e de *"backup nunca testado é fé,
      > não é plano"*: **a coisa só é verdade quando é reproduzida, não quando é observada uma vez.**
      > Corolário operacional: `get_advisors` num banco só responde *"este banco está ok"*, nunca
      > *"o repo produz um banco ok"*.
      **Não contar neste backlog.**
      (6) **✅ FECHADO no Bloco 0 da Fase 3 (Ago 2026)** — pela via da **remoção** do script, não da
      renomeação; a consequência ("sem `any`" sem enforcement automático) ficou registrada como
      checkbox próprio lá. Detalhes nos itens do Bloco 0 — **não duplicar aqui**. Não contar neste
      backlog.
      (7) **`server/src/seed.ts:101`** — `console.error("Seed failed:", err)` despeja o erro
      inteiro de um caminho que passa por `signUpEmail({ body: { email, password, name } })`; se o
      `APIError` do Better Auth carregar o body, a senha vai em claro pro stdout. *Suspeita, não
      confirmada por leitura estática.*
- [ ] Performance pass (< 3s load); mobile responsive
- [ ] Founding-member offer wiring (scarcity for Udemy students)
- [ ] **Cancellation-reason capture wired.** The offboarding screen (P4) collects the reason on exit — cheap data, gold for churn. Connects to STRATEGY.md churn KPIs (winback, MRR-perdido). (Storage = a small `CancellationReason` row or a field on `Subscription`; reason capture ships at launch, the "pausar 1 mês" path stays fast-follow.)
- [ ] **Upgrade do plano Neon ANTES do primeiro aluno pagante.** Dado real de aluno nunca fica em
      banco sem backup. *(Reescrito em Set 2026 — o checkbox dizia "Supabase Free → Pro"; a métrica
      de decisão mudou junto com o fornecedor.)*
      **O que decide o upgrade é a JANELA DE RETENÇÃO DO PITR, não CPU nem storage.** O *Point-in-Time
      Restore* do Neon é a recuperação de erro dentro de uma janela; no Free a janela é curta, e
      cresce nos planos pagos. **Confirmar a janela vigente no painel no dia** — preço e política de
      fornecedor envelhecem, e por isso o número **não** está fixado nos docs.
      **PITR NÃO É BACKUP, e confundir os dois é o modo de falha aqui.** O PITR protege de erro
      **seu** dentro da janela (apaguei a tabela errada, rodei o `UPDATE` sem `WHERE`). Ele **não**
      protege de perder a conta — suspensão, cobrança falhada, comprometimento do login. São dois
      riscos, e exigem duas coisas: **janela de PITR adequada** *mais* **`pg_dump` periódico guardado
      fora do fornecedor**. O segundo é o checkbox de restauração logo abaixo.
      **O custo de US$ 35/mês do desenho antigo NÃO se transporta:** ele vinha do plano Supabase ser
      por **organização** com 2 projetos (US$ 25 + US$ 10). No Neon o 2º ambiente é um **branch** do
      mesmo projeto, então aquele item de US$ 10 simplesmente deixou de existir.
      **Teto de infra sobe de ~US$ 30 para ~US$ 35/mês.** *Sem gatilho de reabertura — decisão de
      conforto operacional, deliberada.*
- [x] **🔒 BLOQUEIO DO GO-LIVE — o login não pode travar a escola inteira** *(operador, 23/09/2026:
      "não podemos depender de um aluno burro tentando entrar e travar a escola toda")*.
      **O risco, medido na 1.7.5:** o login tem regra padrão de **3 tentativas a cada 10 segundos**
      (`dist/api/rate-limiter/index.mjs:302-308`), e ela conta **toda** tentativa, certa ou errada.
      Se o IP do visitante não resolver, todo mundo cai no **mesmo balde** — então a 4ª pessoa a
      tentar entrar em 10 segundos, qualquer uma, espera; e um atacante segura o balde cheio para
      sempre com uma requisição a cada 3 segundos, trancando o admin junto.
      **Hoje o impacto é zero** (nenhum aluno, gate "Em breve" no ar), e é por isso que dá para
      fazer direito em vez de às pressas. **Mas o gate NÃO desce antes disto:**
      - [x] Confirmar pelo log da Railway se o IP resolve — **não resolvia** (23/09, 11:41).
      - [x] **Corrigido com o cabeçalho que a Railway garante:** `ipAddressHeaders: ["x-real-ip"]`,
            escolhido por medição (forjado ignorado, igual ao IP real). `trustedProxies` não foi
            preciso — o proxy interno muda de IP a cada requisição, o que o tornaria frágil.
      - [x] **Prova antes de descer o gate:** dois logins de redes diferentes em sequência não
            compartilham limite — errar a senha 3 vezes numa rede não impede o login na outra.
            **Provado em produção pelo operador (23/09, 14:55):** 4 tentativas no Mac → a 4ª
            bloqueada, inclusive com a senha certa; no mesmo intervalo o celular no 4G entrou
            normalmente; o Mac voltou a entrar sozinho depois de ~15 s. O log da implantação
            nova mostra só os `Invalid password` — a linha do balde compartilhado não voltou.

- [ ] **🚀 GO-LIVE — desligar o gate "Em breve" (ÚLTIMA AÇÃO, sem deploy de código).** O site ao vivo está atrás de um gate pré-lançamento (público vê "Em breve"; operador acessa via `/__preview?token=<PREVIEW_TOKEN>`). Para abrir ao público: no Railway (projeto `jilsonsantana` → env `production` → service `jilsonsantana`), setar **`COMING_SOON=false`** (ou apagar a variável) → o serviço reinicia → público passa a ver o app real. Nenhum merge/código necessário. *(Mecanismo em [server/src/index.ts](../server/src/index.ts) + [client/public/coming-soon.html](../client/public/coming-soon.html); detalhe operacional na memória `coming-soon-gate`.)* **Fazer só quando o "Done when" abaixo estiver verde.**
### Continuidade do operador (pré-primeiro aluno pagante)

> **Por que esta seção existe — e por que ela não aparece em curso nenhum:** curso pressupõe
> **equipe**. Aqui não há. **Sou operador único:** não existe colega com acesso, não existe conta de
> equipe, não existe quem note que algo quebrou enquanto eu não estou olhando. Nesse arranjo,
> **invasão ou perda de acesso a uma conta de fornecedor causa mais dano em minutos do que qualquer
> falha de aplicação.** A camada de aplicação já está coberta (RLS, segredo só no servidor, webhook
> com assinatura + idempotência, leitura pública só `PUBLISHED`, rate-limit no Bloco 0,
> `security-vulnerability-reviewer` obrigatório nas Fases 3 e 4). O elo fraco que sobra **não é o
> código: é a conta.** **Tudo abaixo fica pronto ANTES do GO-LIVE.**

- [ ] **2FA por app autenticador (NÃO SMS)** em: **Neon, Railway, Stripe, GitHub, Bunny,
      registrador do domínio** e **no e-mail do admin da plataforma**. SMS fica de fora por
      SIM-swap. O e-mail entra na lista porque é o **caminho de reset de todos os outros** —
      blindar os seis e deixar o e-mail aberto é não blindar nada.
- [ ] **Códigos de recuperação guardados FORA do Mac** — impressos ou em gerenciador de senhas.
      Guardados apenas na máquina que autentica, eles somem exatamente no cenário em que serviriam
      (perda, roubo ou pane do Mac).
- [ ] **Senha única por serviço, em gerenciador.** Senha repetida transforma vazamento de terceiro
      em invasão nossa — e um operador só não tem quem perceba o acesso estranho.
- [ ] **Backup: política CONFIRMADA + RESTORE DE TESTE executado uma vez.** A confirmação da janela
      de PITR vive no checkbox *"Upgrade do plano Neon"* acima — não duplicar aqui. **O que é novo é
      o restore:** executar um restore de teste **uma vez** e registrar que funcionou. Porquê:
      **backup nunca testado é fé, não é plano.** E o cenário realista não é invasão — é **migration
      ruim ou reset apontado pro lugar errado** (a trava de hostname do CLAUDE.md nasceu desse mesmo
      risco).
      **O alvo do teste ficou MAIS BARATO com o Neon, e são DOIS testes, não um:**
      **(1) PITR** — criar um branch a partir de um ponto no tempo anterior a um estrago proposital,
      e conferir que o dado voltou. Custa um branch descartável, não um projeto.
      **(2) `pg_dump` frio** — restaurar um dump guardado fora do fornecedor num Postgres limpo
      (o local serve) e comparar contagem **e schema**. Este é o único que cobre "perdi a conta".
      *A receita já foi exercitada em Set 2026, na própria migração Supabase → Neon: `pg_dump
      --schema=public --no-owner --no-privileges` + `psql --single-transaction -v ON_ERROR_STOP=1`,
      com diff de linhas, de catálogo e de `last_value` das sequences.*
- [ ] **LGPD mínimo: política de privacidade publicada + caminho de exclusão de conta.** É
      **pendência de lançamento, não item de engenharia** — não vira bloco de código. O checkbox
      amplo de LGPD no topo desta fase cobre o resto (termos, consentimento, export); aqui fica só
      o mínimo que não pode faltar no dia do GO-LIVE. *Nota técnica (revisão de segurança do Bloco
      MEDIR, 09/10/2026): a exclusão a pedido apaga os eventos do vídeo (`lesson_event`) da pessoa —
      o `deletedAt` sozinho os deixa para sempre.*

- **Done when:** the Excel + IA course is buyable and watchable end to end. **→ LAUNCH**

---

## Post-MVP (additive modules — no rewrite)

- **Phase 8 — Analytics (read-side):** SQL functions + `/stats/*` endpoints derived from `LessonEvent` (watch time, drop-off, re-watch, engagement). Admin dashboard.
- **JilsonAI Fase 4–5 (RAG + montagem de plano por IA):** living KB (`promotedToKb` → `KbArticle`), RAG over transcripts, and **`buildLearningPlan`** (member describes a goal → JilsonAI assembles a custom trilha with free mix of courses+lessons, adapts to level, cert by competencies). See JILSONAI.md.
- **JilsonAI Fase 6 — Memory + proatividade** (winback engine). See JILSONAI.md.
- **Phase 11 — Live cohorts** (tier 2, Zoom)
- **Phase 12 — Corporate/B2B** (tier 3) — `organization` plugin + Stripe quantity-based (per-seat) subscriptions + self-service packages (10, 30, configurable). A corporate student is a NORMAL student (own login, progress, certificate); only the access source (org subscription) and who paid/configured differ. Anti-sharing (emailOtp + session limit) also lands around here.

> **Removidos do roadmap (decisões deste ciclo):**
> - *Segundo idioma (inglês) e venda para fora do Brasil* — **removidos em 12/10/2026** (decisão do operador; etapa 4.6c). A "fase do exterior", criada e cancelada no mesmo dia, não existe. O registro da pesquisa que levou a isso está em `billing.md` → *A tela pública de assinar*.
> - *Community como fórum de pares* — **dissolvido no JilsonAI** (suporte inteligente + escalação) + anúncios. Não há fórum a construir. (Um `Profile` social só nasce se/quando houver feature social futura.)
> - *Certificados* — **puxados pro MVP** (Phase 6.5), a escola nasce completa.
> - ~~*EN phase / canal YouTube EN* — **removido.** Escola e YouTube ficam PT; inglês só via tentativa LinkedIn Learning (quando C1). O seam `User.preferredLanguage="pt"` fica dormente (custo zero), mas não há expansão EN planejada para a escola.~~ **REVERTIDO em 14/09/2026 (decisão do operador):** a escola é bilíngue desde o lançamento (Fase 3 → Bloco I) e o canal do YouTube em inglês volta, separado do PT. Ver `idiomas.md`.

---

## Branching workflow (all phases)

- Work on `dev`. Test locally: build + server boot + `/api/health` + the phase's key flow.
- `main` auto-deploys to Railway, so it is "sacred" — only tested code reaches it. Green lint/typecheck/tests is the floor that makes a merge *eligible*, never the trigger: merging `dev → main` is the operator's explicit decision at the end of a phase (see CLAUDE.md → Working Method).
- PR + CI gate + automated Claude review: adopted in a later phase (when there are tests to gate on); until then, `dev → main` is a manual merge the operator authorizes after local testing.

## Critical-path note for the 2–3 month launch

MVP = **Phases 0 → 7** (incl. trilhas curadas na Phase 2, certificados na Phase 6.5). The two HIGH-RISK phases (3 Bunny, 4 Stripe) hold ~70% of the risk — schedule them as dedicated sessions and test the access gates aggressively (member can, non-member cannot, status survives reload). Analytics, live cohorts, corporate, and JilsonAI RAG/plan-builder are intentionally post-launch so the school goes live faster. **Community as a forum was removed (JilsonAI absorbs it), not deferred.**


---
*Atualizado: Ago 2026 (7) — **Bloco 0 (Fase 3) executado PARCIALMENTE: 3 dos 4 checkboxes fechados, o bloco NÃO.** O raciocínio completo está no changelog do `CLAUDE.md`, entrada **Ago 2026 (8)** — **não duplicado aqui**. O que mudou neste plano: (1) `[x]` em **CI roda teste** (script `test` na raiz + step `Test client` **depois do build do core**; gate provado por **mutação** — apagar `Role.ADMIN` de `AdminRoute.tsx` reprova o CI, e antes passava verde) e em **`lint` para de mentir** (resolvido por uma **terceira** saída que o item não previa: **apagar**, porque `tsc --noEmit` já se chama `typecheck` neste repo e renomear colidiria — a mentira era a duplicata, não o nome). (2) **Checkbox novo registrando o custo**: "sem `any`" fica **sem enforcement automático** até ESLint entrar — com a observação de que o `lint` anterior **também não cobria** isso (`tsc --noEmit` aceita `any`), então a remoção não perdeu cobertura, só parou de simular. (3) `[x]` no **`npm audit`**, com o resultado medido antes do push (`high:5, critical:1`, transitivo do `react-router`) e o comportamento esperado registrado: step falho-porém-tolerado, job verde. (4) **Checkbox novo do operador**: revisar **UMA vez** o advisory `critical` e registrar a conclusão — ruído transitivo justifica o step não-bloqueante, mas `critical` não é ruído por padrão, e sem este item a tolerância viraria permanente sem ninguém ter lido. (5) **"Done when" marcado como PARCIAL**: falta o **rate-limit de login**, que é bloco próprio por tocar auth (gate obrigatório de context7) e por ter o "passo 1 = verificar a borda da Railway" preservado. (6) Backlog P2, item **(6) fechado** por referência. Convenção nova correspondente no `CLAUDE.md`: **"Definição de pronto por fatia"** (teto-não-piso; vale daqui pra frente; fronteira transversal é fatia própria sem teste de componente).*
*Atualizado: Ago 2026 (8) — **separação de ambientes de banco vira PRÉ-REQUISITO da Fase 4, e a trava do banco de teste é CORRIGIDA porque não funcionava.** (1) **[FATO] o ambiente local aponta para o mesmo projeto que o Railway serve** — os usuários semeados na Fase 1 e as 39 sessões de desenvolvimento deles vivem em produção; *as sessões são normais, o achado é a **localização** delas*. Vira bloqueio agora porque esta fase traz o espelho de `Subscription`: um `migrate reset` com o `.env` errado deixa de ser "perdi meu seed" e passa a apagar o estado de acesso de quem paga. Resolução: `mvaobzypsiuhqzipcelw` serve **dev E teste**. Registrado junto o que a trava **não** cobre: existem **três** caminhos até o banco (Vitest, MCP, comando manual) e **só o primeiro tem trava automática** — nos outros dois vale declarar o ref antes de rodar, e **não** inventar guarda que não segura. (2) **Trava `_test` → trava por REF** (`CLAUDE.md` → Database & Migrations): no Supabase o host vem do **project ref opaco**, não do nome do projeto — "Jilson Santana Website" atende em `db.gaxmbnhwltljlkukdwba.supabase.co` —, então a checagem antiga **nunca dispararia**, que é o mesmo defeito do `lint` apagado no Bloco 0. O REF é único globalmente: a trava passa a verificar **identidade**, não semelhança de texto. `[PENDENTE]` do tier grátis **resolvido** (o Free permite 2 projetos ativos). (3) **Decisão registrada, sem gatilho (arquitetural): admin + member de teste são PERMANENTES em todos os ambientes**, e o member em produção recebe acesso por **assinatura real com cupom de 100%** — nunca bypass no `temAcessoAtivo()`, flag de teste ou exceção por e-mail; um segundo caminho "só para teste" é porta sem revisão que sobrevive ao motivo que a criou. Efeito colateral desejável: o mesmo mecanismo serve cortesia e promoções. (4) **Backlog P2 nº (5) FECHADO por verificação — a suspeita era falsa**: `_prisma_migrations` **já tem** RLS (`pg_class.relrowsecurity = true` nas 11 tabelas de `public`), nenhuma migration necessária; **restam 3** no backlog. (5) **Custo do upgrade Supabase Pro corrigido: US$ 35/mês, não 25** — o plano é por **organização** e a nossa tem dois projetos (US$ 25 + US$ 10). Decisão do operador: manter os dois na mesma org, porque no Free o projeto **pausa após 7 dias** e banco de teste é inativo por definição — despausar toda semana custa mais que US$ 10. Teto de infra ~US$ 30 → **~US$ 35**. (6) **Medido, não inferido:** `npx prisma` **da raiz** do monorepo não acha o schema, e **nem a chave `prisma.schema` conserta** (o CLI lê o `package.json` mais próximo do CWD; declarada na raiz, ela acha o schema mas morre em `Environment variable not found: DIRECT_URL`, porque o `.env` mora em `server/`). A chave foi adicionada ao `server/package.json` por ser declaração explícita, **não** por consertar o comando da raiz — registrado pra ninguém tentar de novo. Consequência útil: todo comando de migration passa obrigatoriamente por `server/`, onde o `.env` escolhe o banco.*
*Atualizado: Ago 2026 (9) — **CORREÇÃO da entrada (8): o backlog P2 nº (5) foi fechado ERRADO ali e está reaberto e refechado aqui, agora por migration versionada.** A entrada (8) afirma *"nº (5) FECHADO por verificação — a suspeita era falsa"*; **isso está incorreto** e fica registrado como entrada nova, sem editar a anterior (regra de rotação: histórico não se edita). **O dado que derrubou:** o fechamento anterior verificou **só produção**, onde `_prisma_migrations` já tinha `relrowsecurity = true`. Depois disso o banco de teste `mvaobzypsiuhqzipcelw` recebeu as **MESMAS 3 migrations** por `prisma migrate deploy` e a mesma tabela nasceu **`false`** — as 10 de domínio vieram `true` nos dois. Logo o RLS de produção **não vinha do versionamento**; vinha de fora (causa provável: o *Automatic RLS* do projeto de produção, ligado — no de teste foi desligado de propósito; a evidência não distingue "humano clicou" de "ajuste de projeto", e não precisa: o que ela prova é que **não veio das migrations**). **A suspeita original do `security-vulnerability-reviewer` era VERDADEIRA.** **Conserto:** migration `20260824214838_rls_prisma_migrations_table` (`ALTER TABLE "public"."_prisma_migrations" ENABLE ROW LEVEL SECURITY;`), aplicada **nos dois bancos por `migrate deploy`** — nunca painel, nunca MCP —, porque o alvo é estado **reproduzível em qualquer banco futuro**, não estado correto num banco. Idempotência confirmada **antes** de escrever (três `ALTER` seguidos numa tabela de sondagem descartável, sem erro), o que a faz rodar limpa em produção. Estado final idêntico nos dois: 11 tabelas, **0 sem RLS**, 4 migrations, 0 rollbacks, advisors só INFO; produção reconferida pós-aplicação com **2 users e 39 sessions**, iguais ao pré-voo. **LIÇÃO, promovida a convenção no `CLAUDE.md` → Database & Migrations: estado verificado em UM ambiente não prova estado REPRODUZÍVEL** — `get_advisors` responde *"este banco está ok"*, nunca *"o repo produz um banco ok"*. Mesma família de *gate que mente* e de *backup nunca testado é fé*: a coisa só é verdade quando é **reproduzida**, não quando é **observada uma vez**. Corolário de processo, também registrado: **contagem de backlog é resultado, não prova** — "3 pendentes" já esteve certo pelo motivo errado. **Aberto no caminho:** o *Automatic RLS* está **ligado em produção e desligado no teste**, divergência **viva** que não afeta tabela nossa (nossas migrations ligam RLS explicitamente) mas afeta qualquer tabela criada fora delas — recomendação: desligar em produção; é config no fornecedor, decisão do operador.*

*Atualizado: Ago 2026 — **catálogo rotativo + ambiente único (decisões de `courses.md` D8/D9 que tocam o build).** Fase 2 ganha o bloco **`ARCHIVED` read semantics**: o enum já existia em `Course.status`, mas a semântica de leitura não — a regra "leitura pública só `PUBLISHED`" precisa virar **duas** regras (catálogo/busca = só `PUBLISHED`; acesso direto de membro ativo = `PUBLISHED` **ou** `ARCHIVED` atrás de `temAcessoAtivo()`), senão arquivar um curso **revoga em silêncio** de quem estava no meio dele — o oposto da decisão. Sem model novo e **sem tabela de entitlement**: o operador escolheu a regra simples (acesso enquanto a assinatura estiver ativa), que o enum existente cobre. Junto: trilha salva com curso arquivado continua resolvendo; **deleção de vídeo NÃO se constrói** (reprovada no critério de decisão de stack — o Bunny cobra banda, não prateleira; deletar no painel leva 5 min), registrado aqui pra ninguém repropor como lacuna. Novo `[VERIFICAR]` do **módulo de setup compartilhado**: SQL e Python usam o mesmo ambiente, então as ~15–20 min de "criar conta + primeira query" são gravadas uma vez e reusadas em N cursos — mas `Course → Module → Lesson` prende a aula a um módulo só; decidir antes de fechar a Fase 2 entre aceitar a duplicação de cadastro ou usar o seam de `PlanItem itemType=LESSON` que já existe (**não** adicionar many-to-many antes de provar que o seam não cobre). Fase 6.5 ganha o checkbox de que **arquivamento não afeta certificado emitido** — o desenho de snapshot (`nameSnapshot`/`skillsCovered[]`) já garante, mas as duas consequências viram explícitas: a rota pública `/certificado/[id]` **permanece no ar** e a elegibilidade é avaliada **no momento da conclusão**, nunca re-derivada do catálogo atual. Racional completo e gatilhos de reabertura em `decisions-archive.md` → Ago 2026 (8).*

*Atualizado: Set 2026 (10) — **banco migrado do Supabase para o Neon: produção e dev, com o teste deliberadamente INALTERADO.** **(1) O que a migração exigiu, e o que ela não exigiu.** Foi Postgres→Postgres puro — `pg_dump --schema=public --no-owner --no-privileges` + `psql --single-transaction -v ON_ERROR_STOP=1` — porque a autenticação **já era nossa**: Better Auth guarda `user`/`session`/`account` no schema `public` via Prisma, então elas migraram como dados comuns e **zero linha de código de auth foi tocada**. Registrado porque é o argumento que torna a troca barata, e ele não existiria se o projeto usasse o auth do fornecedor. **(2) A verificação foi de SCHEMA, não só de contagem — e a distinção pagou.** As 11 tabelas / 19 linhas bateram, mas o diff de catálogo acusou **61 diferenças**, todas `NOT NULL` materializado em `pg_constraint`: **mudança do PG18** (o 17 guardava só em `pg_attribute.attnotnull`). Semântica idêntica, provado pelo `is_nullable` do `information_schema` batendo coluna a coluna. Conferidas à parte as **`last_value` das 6 sequences** (10, 8, 11, 13, 9, 9) — contagem de linhas não pega sequence dessincronizada, que é o erro clássico deste tipo de migração. **(3) [FATO que derruba a entrada (10) do changelog do `CLAUDE.md`] Prisma 5.22 funciona com PG18.** A premissa registrada era *"o 5.22 é anterior ao 18"*; medido contra o Neon 18.6, `migrate deploy`, `migrate status`, client gerado, transação e rollback passam. O banco de teste segue no 17 por o CI usar `postgres:17`, **não** mais por esse motivo — e a divergência prod-PG18 / teste-PG17 fica **registrada como aceita**, com gatilho. **(4) INCIDENTE DE CREDENCIAL.** `neon branches create` imprime a connection URI **com senha** por padrão, e **branch do Neon herda a senha da role do pai** — as duas juntas fizeram o vazamento de uma credencial de *dev* ser um vazamento de **produção**. Rotacionadas as duas e **verificado por teste** que a senha antiga falha em ambas. Virou regra no `CLAUDE.md`: rotacionar branch novo antes de usar, e redirecionar a saída de comando que possa emitir connection string. **(5) `DATABASE_URL` e `DIRECT_URL` mudam JUNTAS.** Trocada só a primeira, o app lê um banco e o `migrate deploy` do pre-deploy migra **outro** — e o deploy fica **verde**. Aconteceu aqui; dano zero só porque não havia migration pendente. **(6) O 2º ambiente virou BRANCH, não 2º projeto** — o que **derruba** o teto de US$ 35/mês da entrada (8) deste stream: aquele valor vinha do plano Supabase ser por organização com dois projetos (US$ 25 + US$ 10), e o item de US$ 10 deixou de existir. O checkbox de upgrade da Fase 7 foi reescrito: o que decide o plano passa a ser a **janela de retenção do PITR**, e ficou explícito que **PITR não é backup** (protege de erro seu na janela, não de perder a conta) — o checkbox de restore agora pede **dois** testes, PITR e `pg_dump` frio. **(7) Teste continua LOCAL, e isso é decisão reafirmada, não inércia.** Branch de nuvem é barato e instantâneo, o que torna tentador usá-lo como banco de teste — mas devolveria o `migrate reset --force` para um banco alcançável pela internet, exatamente o que a decisão de Ago 2026 evita. A trava de hostname disparou e confirmou `localhost` durante toda a sessão. **(8) Supabase intocado como rollback durante a migração e APAGADO pelo operador na mesma sessão**, depois de a validação fechar (somente leitura o tempo todo, verificado por comparação antes/depois). **Consequência que vira prioridade:** sem o Supabase de pé, a única rede de segurança do banco passa a ser a **janela curta de PITR do plano Free** — o que promove o checkbox de backup da Fase 7 de "antes do primeiro aluno pagante" para **o próximo item de infra a fechar**, já que o `pg_dump` frio é o que cobre "perdi a conta".*

*Atualizado: Set 2026 (11) — **escola bilíngue (PT + EN) entra no plano** (decisão do operador, 14/09/2026; raciocínio no changelog do `CLAUDE.md`, entrada **Set 2026 (16)** — não duplicado aqui). O que mudou neste plano: (1) **Fase 3 ganha o Bloco I** (idioma no conteúdo, dicionário único de textos, seletor), sequenciado **antes** da *Superfície pública*. A posição exata dentro da fase é do operador. (2) **O bloco Superfície pública ganha o item dos dois idiomas** (`/en`, redirecionamento só na raiz, `hreflang`, sitemap). Ele fica lá, e não no Bloco I, para os endereços nascerem nos templates do servidor em vez de no React. (3) **Fase 4 ganha preço em dólar pelo país do cartão, a questão preço mostrado × cobrado, a decisão de imposto internacional e a conta de receita em dólar.** (4) Fases 6, 6.5 e 7 ganham uma nota de idioma cada. (5) A costura de idioma da Fase 2 e a linha "EN removido" dos *Removidos do roadmap* foram riscadas, não apagadas. **Nada foi construído.** Pendências de produto marcadas no Passo 0 de cada bloco: o que o catálogo EN vazio mostra, onde fica o seletor, os caminhos sob `/en`, o valor do anual em dólar.*

*Atualizado: Set 2026 (12) — **respostas do operador às pendências (14/09, 2ª rodada).** Registro da decisão: `CLAUDE.md` Set 2026 (16), item (h). Neste plano: (1) **Fase 2**: o "catálogo rotativo de até 20" estava defasado desde o Set 2026 (13) do `courses.md`; passa a **15 por idioma, no máximo 2 idiomas**. (2) **Bloco I**: o catálogo EN vazio vira item próprio — **mock "Excel + AI" fora do banco**; o Passo 0 fica só com a posição do seletor. (3) **Superfície pública**: endereços com **segmentos em inglês** (`/en/courses`); falta o segmento de trilha e de certificado. (4) **Fase 4**: anual **US$ 299** confirmado; entra **ACESSO POR IDIOMA** (`Subscription.language` + checagem dentro de `temAcessoAtivo()` + casos 16–18 na matriz, que vai a ~18). Três perguntas ficam para o operador antes de codar a fase: trocar o idioma da assinatura; o que o assinante vê no catálogo do outro idioma; se assinar em inglês fica ligado sem curso em inglês.*

*Atualizado: Set 2026 (13) — **3ª rodada do operador, mesma data** (registro: `CLAUDE.md` Set 2026 (16), item (i)). **Idioma é filtro, não portão** (modelo LinkedIn Learning): a Fase 4 perde o item "acesso por idioma", a `Subscription` não ganha `language`, e os casos 16–18 viram **um** caso de acesso cruzado (matriz vai a ~16). Das três perguntas da entrada (12), sobra só a de assinar em inglês enquanto os cursos em inglês não têm aula. **Bloco I:** o mock "Excel + AI" sai. Entra o **curso publicado com zero aulas**, porque o operador cadastra um ou dois cursos em inglês ainda vazios.*

*Atualizado: Set 2026 (14) — **4ª rodada do operador, mesma data** (registro: `CLAUDE.md` Set 2026 (16), item (j)). Superfície pública: endereços **`/en/learning-path/:slug`** e **`/en/certificate/:publicId`** decididos. Bloco I: curso sem aulas mostra **"0 aulas"** normalmente, e o item garante só que a página não quebra. Fase 4: a pergunta da entrada (13) virou item — **o botão de assinar nas páginas em inglês liga com a 1ª aula publicada em inglês**, derivado do banco, regra de exibição e não de checkout, com teste de servidor pela cadeia de status.*
