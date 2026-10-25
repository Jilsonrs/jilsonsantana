# jilsonsantana.com — Tech Stack

> Decided. Adapted from the production patterns in Mosh's Claude Code course
> (helpdesk reference project), reconciled with Jilson's prior decisions.

## Frontend

- **React + TypeScript + Vite** — SPA
- **Tailwind CSS + shadcn/ui** — UI; use shadcn semantic tokens (`bg-background`, `text-muted-foreground`), not hardcoded colors. **Aesthetic: Apple — light, airy, creative, beautiful imagery, light transitions.** Brand accent = blue **#238FE8** (`--primary`), with black text + gray #838383 secondary; **MuseoModerno** for the brand wordmark only, **Outfit** for H1/H2 (Sep 2026), neutral sans (Hanken Grotesk) for body and H3. See DESIGN.md.
- **React Router** — routing
- **TanStack React Query** — server state (`useQuery` / `useMutation`), not `useEffect` + `useState`
- **Axios** — HTTP client (not `fetch`)
- **React Hook Form + Zod resolver** — form validation
- **`react-markdown`** (client) — mostra Markdown **sem HTML cru**: HTML digitado aparece como
  texto (padrão da biblioteca, conferido no context7 em 27/09/2026), e `allowedElements` diz
  exatamente o que vale. Entrou para a **descrição do curso** (negrito, itálico e listas, decisão
  do operador de 27/09/2026), cumprindo o gatilho de reabertura do editor rico de 23/09 (abaixo,
  em *What We Do NOT Use*). **Um lugar só:** `client/src/components/content/MarkdownText.tsx`,
  e é carregado **só quando usado** (fica fora do pacote que todo aluno baixa: medido, +37 KB
  compactados se importado direto). O JilsonAI (Fase 6) usa a mesma peça, com a lista dele.
  *Esta decisão se reabre se o JilsonAI precisar de algo que ela não faz com plugin oficial
  (bloco de código com cor, fórmula).*
- **`@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities`** (client) — **arrastar**
  módulos e aulas no passo Conteúdo do editor do curso *(liberado pelo operador em 28/09/2026,
  Bloco E etapa 2)*. O dia ruim que evita: reorganizar um curso de 40 aulas clicando em seta, uma
  posição por vez. Funciona pelo teclado (espaço pega, setas movem, espaço solta), com as
  instruções e os avisos ao leitor de tela **em português** (o padrão é inglês). **Um lugar só:**
  `client/src/components/admin/course-content/arrastar.tsx`, e só carrega no passo Conteúdo (o
  passo é `lazy()`): o pacote que todo aluno baixa não tem nada dele (conferido no build de
  28/09: 19,6 KB compactados no pedaço do Conteúdo, zero no principal). As setas continuam.
  **A mesma peça serve à ordem dos cursos e das perguntas frequentes** (C4, etapa 5). *Esta
  decisão se reabre se a peça parar de ser mantida, ou se um dia o arrastar entrar numa tela do
  aluno (aí o peso volta a contar).*

## Backend

- **Node.js + Express + TypeScript** — runtime is Node (not Bun), npm workspaces
- **Prisma** — ORM, type-safe queries, schema as code
- **Express 5** — async errors caught automatically (no try/catch in route handlers)

## Shared

- **`core/` package** (npm workspace) — Zod schemas + domain constants shared by client and server. Single source of truth for shapes and types end to end.

## Database

- **Neon (PostgreSQL serverless)** — projeto `rough-meadow-05608403` (`jilsonsantana-prod`), região **aws-us-east-1** (N. Virginia), **PostgreSQL 18**. **Plano pago, por uso** *(o operador, Out 2026: a mesma configuração do grátis, sem o limite de restauração — **7 dias** em vez de 6 horas; até 22/10, 2,36 horas de processamento e US$ 0,25)*. *(Migrado do Supabase em Set 2026 — o porquê, a verificação e os gatilhos estão no changelog do `CLAUDE.md`, entrada (15); movido de Ohio `falling-snow-79489296` para a Virgínia em 22/10/2026, etapa G1b.)*
- **UM projeto, DOIS branches — não dois projetos.** `production` (endpoint `ep-muddy-hill-b8oromcw`) = **produção**, alcançável só pelo Cloud Run · `dev` (endpoint `ep-soft-base-b8waj57h`) = **dev / a escola**, nunca apagado. O banco de **teste** é local (ver *Testing*). **Isto é o que derrubou o custo:** no Supabase o 2º ambiente era um 2º projeto (US$ 10/mês no plano pago); aqui é um branch copy-on-write, que custa ~zero e nasce com os dados do pai.
- **Branch é isolado em DADOS, não em CREDENCIAL.** Branch novo herda a senha da role do pai — rotacionar antes de usar. Regra e o incidente que a produziu: `CLAUDE.md` → Database & Migrations.
- **REGIÃO aws-us-east-1 (N. Virginia), movida de us-east-2 (Ohio) em 22/10/2026 (etapa G1b).** Em Set 2026 o projeto nasceu em `aws-us-east-2` com o gatilho de só recriar quando houvesse *"outro motivo que exija recriar o projeto"*. Na saída da Railway para o Google Cloud Run (`us-east4`, N. Virginia, junto da costa leste e do Bunny em NY), o operador decidiu trazer o banco para **aws-us-east-1** via *Import Data Assistant* (zero alunos no ar, cópia conferida tabela por tabela e sequência por sequência), deixando aplicação e banco na mesma região. A análise original continua válida: a latência de rede não é o gargalo perto do vídeo (Bunny com PoP local) nem do cold start.
- **O que come o orçamento de 3 s não é a região — é o COLD START.** `[FATO — Set 2026, medido em produção: COLD **1,544 s**, warm **~0,377 s** ⇒ acordar o compute ≈ **1,2 s**; autosuspend em ~5 min de ociosidade.]` Ou seja: **~8× o custo da região.** Otimizar região ou cascata de query antes de considerar o cold start é olhar para o lugar errado. O número acima é da **chamada de API**; página completa soma assets em cima. Detalhe e gatilho: `CLAUDE.md` → changelog (15), item (i).
- Accessed **only via Prisma** through `DATABASE_URL` (pooled) / `DIRECT_URL` (direta). As duas **mudam juntas** — ver `CLAUDE.md`.
- **RLS convention:** every `public` table has Row Level Security ENABLED (without policies) in the same migration that creates it. Prisma conecta como a role dona e é o único acessor. **O alvo mudou de fornecedor:** era a Data API do Supabase, agora é a **Data API do Neon** (aba do diálogo *Connect*, hoje desligada). Verificação após cada migration de DDL = **SQL sobre `pg_class.relrowsecurity`**, não o `get_advisors` do MCP do Supabase, que não existe aqui. NOT used: Neon Auth, Data API, Storage.

## Authentication

- **Better Auth** — email/password, **database sessions**, Prisma adapter on the Neon Postgres.
- **Isto NÃO é o auth do fornecedor de banco** (não era o Supabase Auth, não é o Neon Auth). As sessões vivem no **nosso** Postgres, acessadas via Prisma — biblioteca mantida em vez de código artesanal. **Set 2026 mostrou o valor prático disso:** a troca de fornecedor de banco não tocou **uma linha** de autenticação; as tabelas `user`/`session`/`account` migraram como dados comuns.
- Sign-up creates a `member`. `admin` (Jilson) is seeded.

## Billing

- **Stripe — Payments (Plano Padrão) + Stripe Billing**, com **Payment Element embutido**. Conta criada como **MEI (CNPJ)**; payout para **Banco do Brasil**.
- **Custos (verificados em `stripe.com/en-br/billing/pricing`, ago 2026):** Payments **3,99% + R$ 0,50** por cobrança de cartão bem-sucedida · Billing **0,7% do volume de Billing** (pay-as-you-go, sem mensalidade). Em R$99,90/mês: ~R$ 4,49 + R$ 0,70 = **~R$ 5,19 por assinante/mês**.
- **Por que Billing (decisão REVISTA em Ago 2026):** a decisão anterior ("recorrência in-house pra evitar a taxa") empacotava duas escolhas independentes — *checkout na nossa página* e *quem opera a recorrência*. Só a primeira é requisito de UX, e ela **não** exige abrir mão do Billing. Billing entrega, incluído: renovação agendada, **Smart Retries**, lembretes automáticos de pagamento em atraso, automações de recuperação/retenção, proração, faturas, e atualização de cartão vencido junto às bandeiras. Construir isso in-house era o maior bloco de código financeiro irreversível do projeto — e o maior passivo de manutenção permanente pra operador solo. Aplica a regra do CLAUDE.md: *prefer battle-tested libraries over custom code*.
- **NÃO usamos Customer Portal** (página hospedada da Stripe), embora venha incluído no Billing. **Princípio de UX central: o aluno nunca sai de jilsonsantana.com** — assinar, trocar cartão, mudar de plano e cancelar vivem em telas nossas, chamando a Subscriptions API. A doc da Stripe trata a API como caminho principal e o portal como opcional, então isso não é contramão.
- **Limite de tentativas nas rotas de cobrança: `express-rate-limit@8.7.0`** (versão exata, aprovada pelo operador em 19/10/2026 — Fase 4, etapa 4.7, passo 1), com a contagem **no banco** desde 25/10/2026 (`lib/loja-de-tentativas.ts`, tabela `limite_de_tentativa` — o servidor passou a ter até 3 cópias) e um pacote junto, `ip-address`. A falha que ele impede, numa frase: *o site servindo para testar cartão roubado, adivinhar código promocional ou gastar o limite de pedidos da escola na Stripe*. Um arquivo só o importa (`server/src/lib/limite-de-tentativas.ts`); a chave do endereço é nossa (o `x-real-ip`), com o IPv6 agrupado pela função do pacote. Detalhe: `billing.md` → *Limite de tentativas*. *Reabre se houver um segundo servidor (a contagem precisa de um lugar comum).*
- **Biblioteca no servidor: `stripe@23.0.0`** (versão exata, aprovada pelo operador em 09/10/2026 — Fase 4, etapa 4.1), que fixa a **versão `2026-09-30` da API**. Dois fatos dela que o código usa: o fim do período fica em **cada item** da assinatura, e a fatura aponta a assinatura em `parent.subscription_details.subscription`. Atualizar a biblioteca é atualizar a versão da API: conferir os dois de novo (context7) antes.
- **Captura de cartão embutida via Stripe Payment Element (Elements):** o formulário roda na própria página; o dado do cartão vai direto pro Stripe — **nunca toca nosso servidor** (PCI no escopo mais leve).
- **Preços = objetos `Price` da Stripe** (um produto "Assinatura", dois prices): Mensal **R$99,90 (sem fidelidade)** + Anual **~R$995 (~17% off)**. **Só em reais** *(decisão do operador, 12/10/2026: a escola vende só para o Brasil; o preço em dólar saiu do projeto)*. **Sem free trial e sem trava de preço vitalícia.** Conteúdo grátis, só a **prévia grátis** de aula — `Lesson.isFreePreview`, que o admin liga por aula: toca para qualquer visitante, sem os arquivos *(decisões do operador, 27 e 29/09/2026; `CLAUDE.md` → Access Architecture)*. **Troca de plano** *(decisões do operador, 11/10/2026)*: mensal → anual na hora, com o ano começando no dia da troca e o valor cobrado igual ao mostrado — o anual cheio e um crédito de valor fixo no mesmo pedido (`paraPedidoDeCobrar`), não a proração da Stripe, que anda com o relógio; anual → mensal marcado para o fim do ano pago, por um agendamento da Stripe. Detalhe: `billing.md` → *Minha assinatura*.
- **Fonte da verdade do acesso:** a `Subscription` **da Stripe é canônica**; a nossa tabela `Subscription` é o **espelho local** (status + `currentPeriodEnd`) que o gate lê, sincronizado por webhooks de assinatura. Em qualquer dúvida, re-buscar `subscriptions.retrieve` e recomputar o espelho — nunca confiar no snapshot do evento.
- **Dunning = configuração, não código.** A régua (D0 → retries → corte) continua sendo **decisão de produto nossa** — em especial **acesso MANTIDO durante a janela** (status `past_due`), porque churn involuntário é a maior alavanca (strategy.md §6). O que muda é *quem executa*: Smart Retries + automações de recuperação da Stripe, não um agendador nosso.
- **O que continua sendo código nosso — e onde mora o risco restante:** o **gate de acesso** (`temAcessoAtivo` + `requireActiveMembership`), webhooks **idempotentes e à prova de ordem**, o **force-sync** de reconciliação, e as telas de assinatura/cancelamento. O Billing removeu a *mecânica do dinheiro*, não a *fronteira de acesso*. A Fase 4 segue HIGH RISK com "Ask before edits" ON + revisão humana; o que encolheu foi a **superfície**. Se mantém nível MAX/Ultracode é decisão do operador na abertura da fase.

## Video

- **Bunny Stream** — video hosting + DRM + signed URLs. Playback gated to active members via signed URLs issued by the server, **24 h for every video and no IP-lock** (don't break playback on Wi-Fi↔4G switches) — *operador, 28/09/2026: uma biblioteca só (`jilsonsantana-stream`, com token), a apresentação também assinada; substitui a janela de 6–12 h de Ago 2026 (`bunny.md` §3.1).* (Panda Video = fallback.)
- **`tus-js-client`** (client) — o envio de vídeo em partes, que **retoma** quando a conexão cai
  (regra do operador de 25/09; peça aprovada por ele em 27/09). É a biblioteca dos exemplos
  oficiais do Bunny. Isolada em `client/src/lib/video-upload.ts`, o único arquivo que a importa:
  trocar de peça custa um arquivo. O arquivo vai do navegador direto para o Bunny, e a chave fica
  no servidor, que só entrega a assinatura.
- **`player.js` 0.1.0** (client, versão **travada**) — o site ouve o player do Bunny para saber até
  onde o aluno assistiu: a aula em vídeo conta como concluída **aos 90%** (decisão do operador,
  03/10/2026; peça aprovada por ele no mesmo dia). É a peça que a doc do Bunny indica ("Playback
  control API": eventos `timeupdate` com segundos e duração, e `ended`). Instalada do npm, e **não**
  carregada do CDN do Bunny (`playerjs-latest`), para nenhum código de fora mudar sob o site sem
  aviso. Isolada em `client/src/lib/player-do-bunny.ts`, o único arquivo que a importa. Travada
  porque a última versão é de 2017 e o protocolo não muda: atualizar não traz nada.
- **O que contratar e configurar no Bunny** (bibliotecas, segurança, chaves, o que fica de fora):
  [`docs/bunny.md`](bunny.md). **Enterprise DRM fica fora do lançamento**: são US$ 99/mês fixos
  por biblioteca *(doc do Bunny, 25/09/2026)*.
- **Arquivos enviados pelo site (foto do aluno etc.): Bunny Storage + Pull Zone** *(decisão do
  operador, 25/09/2026)*, servidos em `img.jilsonsantana.com`. Nunca no disco do container do
  Cloud Run, que é efêmero e zerado a cada reinício ou publicação. Configuração e estado: `bunny.md` §4.

## AI (JilsonAI)

- **MULTI-PROVEDOR via AI SDK** (`ai` + `@ai-sdk/anthropic` + `@ai-sdk/google`) — **decisão do operador, Set 2026**. **Claude é o default; Gemini é a segunda opção**, escolhida por **string em runtime** (`createProviderRegistry`), o que permite **trocar de IA pelo admin sem deploy**. Teaching assistant in Jilson's voice/method. Server-side only; a chave nunca toca o frontend. Um gateway (`askJilsonAI()`); **a AI SDK é implementação de `llm.complete()`, nunca substituta** — a Vercel também é fornecedor, e sair dela tem que custar um arquivo. Default = **modelo de ponta (Sonnet)**, barato só pra trivial. **Quota + medidor calmo**; rate-limit por membro; tiers como seams pós-lançamento.
  - **Preço reconferido (set/2026):** Haiku 4.5 $1/$5 · **Sonnet 5 $2/$10** · Opus 5 $5/$25 por Mtok — a linha antiga citava Sonnet 4.6 a $3/$15, então **o orçamento melhorou ~⅓ na entrada**. Prompt caching −90% na entrada cacheada.
  - **NADA instalado ainda, de propósito:** o JilsonAI não tem uma linha de código (o `server` tem 6 dependências, nenhuma de IA). Os pacotes entram na **Fase 6**, como dependência nova declarada no plano do bloco — não antes. Ver `docs/jilsonai.md` e `CLAUDE.md` → changelog Set 2026 (14).

## Background Jobs

- **Nenhuma fila no MVP** (pg-boss removido em Ago 2026 — o porquê e o gatilho de volta estão em *What We Do NOT Use*, e a convenção de execução em `CLAUDE.md` → Background Jobs). Webhook, e-mail e afins rodam **inline na request**.

## Email

- **Resend** — transactional (welcome, receipts, password reset) + educational emails. **`resend@6.32.1`, fixada** (etapa 4.7, passo 3, 20/10/2026 — a mais nova tinha 4 dias; ficou a de duas semanas). **Todo envio passa por `enviarEmail()`** (`server/src/lib/email.ts`), e o texto é montado por `montarEmail()` (`server/src/views/email.ts`) — convenção em `CLAUDE.md` → Membership Gating.
  - **Remetente `Jilson Santana <suporte@alunos.jilsonsantana.com>`; as respostas vão para `suporte@jilsonsantana.com`** (P49 — decisões do operador, 20/10/2026). O envio sai por um **subdomínio** porque a fama de spam é do domínio: um e-mail da escola marcado como spam não pode atingir o e-mail pessoal dele (`jilson@`, Microsoft 365, no domínio principal). A caixa `suporte@` é uma **caixa compartilhada** do Microsoft 365, **criada pelo operador em 21/10/2026 (P92)**, com ele como membro: espaço próprio, sem licença até 50 GB, sem senha própria (entra-se pela conta de um membro), e o Mail da Apple não a mostra — lê-se e responde-se pelo Outlook (web ou aplicativo), saindo como `suporte@`. A parte antes do @ do remetente muda a qualquer momento; o subdomínio, não.
  - **Configuração no Resend (20/10/2026):** domínio `alunos.jilsonsantana.com`, região **São Paulo** (`sa-east-1`); os registros na GoDaddy foram postos pelo "Auto configure" (`resend._domainkey.alunos`, `rsend.alunos`, `send.alunos`) e conferidos na internet, com os da Microsoft intactos; **DMARC:** `v=DMARC1; p=none;` em `_dmarc.jilsonsantana.com` (o domínio principal, que é o do e-mail da Microsoft: só declara, não bloqueia nada) e **`v=DMARC1; p=quarantine;` em `_dmarc.alunos.jilsonsantana.com`** (21/10/2026, ok do operador: o que disser vir do subdomínio da escola e não passar na assinatura vai para o spam — só o Resend envia por ali, e ele passa; não toca no e-mail da Microsoft, e **ninguém responde aluno de um endereço `@alunos`**); **rastreamento de abertura e de clique DESLIGADO** (trocar o link de um e-mail de senha por um endereço do Resend só aumenta o risco de spam); TLS *Opportunistic* ("Enforced" deixaria sem e-mail quem usa servidor antigo); recebimento pelo Resend desligado (a resposta vai para a Microsoft). *Gatilho do DMARC do domínio principal: endurecer para `quarantine` quando houver volume e os relatórios mostrarem que só a Microsoft (e o Resend, pelo subdomínio) enviam pelo domínio.*
  - **A entrega, MEDIDA com o e-mail de prova (20–21/10/2026):** iCloud → caixa de entrada; Yahoo → lixo eletrônico; Microsoft 365 da empresa do operador → quarentena (`CAT:HPHISH`, SCL 8) **com SPF, DKIM, DMARC e compauth todos `pass`** — a configuração está certa; pesam o domínio criado no mesmo dia e, nos testes, o remetente com o nome do próprio destinatário; mail-tester **10/10** (sem lista de bloqueio, conteúdo aprovado). **Trocar o Resend pela AWS não muda nada:** o Resend envia pelo Amazon SES (o cabeçalho mostra `smtp-out.sa-east-1.amazonses.com` e uma assinatura `d=amazonses.com`). O que falta é **reputação do domínio novo**: o aquecimento e o novo teste ficam no plano → etapa 4.7, passo 8.
  - **Sem `List-Unsubscribe` nos e-mails de serviço** (criar senha, cobrança): ele é obrigatório em e-mail de **divulgação** em massa, e um "cancelar inscrição" no e-mail de senha não faz sentido. *Entra junto com o primeiro e-mail de novidades ou promoção da escola.*
  - **Uma chave por ambiente**, só com permissão de **envio** e só para o domínio. A de desenvolvimento está no `server/.env`; **a de produção nasce no dia de publicar** e vai direto para o Secret Manager do Google Cloud (`RESEND_API_KEY`) — ela só aparece uma vez, e pô-la antes publicaria o site sem necessidade. Teste e CI não têm chave: o envio é testado com a rede trocada por dublê (`email-rede.test.ts`).
    **Como pôr a chave no `server/.env` sem abri-lo no editor** (arquivo aberto no VS Code vai para o contexto do agente — `CLAUDE.md` → Secrets), no terminal, da raiz do repo: `read -s "K?Cole a chave do Resend e aperte Enter: " && printf '\nRESEND_API_KEY=%s\n' "$K" >> server/.env && unset K && echo ok` — a chave não aparece na tela nem fica no histórico.

## Certificates

- **Server-side PDF** generation on trilha/course completion (100%) — **MVP (Fase 6.5)**, "a escola nasce completa". Certificate carries the trilha name + `skillsCovered` (competencies), valuable for students targeting employers.
- **Biblioteca de geração NÃO escolhida** — é dependência de runtime nova, logo é **decisão de plano** (`CLAUDE.md` → Working Method: nada de `npm install` no meio do bloco). Decidir na abertura da Fase 6.5, não antes.
- **A URL do certificado usa `publicId` (cuid), nunca a PK sequencial** — `/certificado/:publicId`. Convenção e o porquê: `CLAUDE.md` → Database & Migrations.

## Testing

- **Vitest + React Testing Library** — component tests (the majority of coverage)
- **Vitest + supertest** — **testes de servidor, sem browser** (o único lugar onde mora o risco catastrófico: assinante pagante trancado fora / acesso liberado sem pagar). Nascem **dentro da Fase 4**, colados ao handler de webhook. Lista dos casos: `implementation-plan.md` → Fase 4.
- **Playwright** — E2E only for what needs a real browser + server (auth redirects, navigation, full-stack flows like webhook → DB → UI). **Permanece na stack:** o E2E de hoje só assere redirect do React Router porque falta o `globalSetup` com banco de teste — não é escolha errada de ferramenta. Alvo: 6–8 testes full-stack, **depois** dos testes de servidor. **O `globalSetup` deixou de ser pendência vaga e virou trabalho datado:** `implementation-plan.md` → Fase 3, **Bloco T**.
- **Teste unitário: NÃO é uma camada aqui** — só função pura, sem I/O (hoje: um caso, o `escapeHtml`/`jsonLd`). Rota se testa por supertest contra o app real; tela, por component test. Convenção em `CLAUDE.md` → Testing.
- **Renderer de Markdown do JilsonAI: ESCOLHIDO em 27/09/2026 — `react-markdown`** (ver
  *Frontend*). Entrou pela descrição do curso e atende o requisito que já estava escrito aqui:
  HTML cru desligado por **configuração** (é o padrão dela), não por sanitização posterior. O que
  fica para a Fase 6 é só **o que o chat aceita** (a lista de `permitidos` do `MarkdownText`, e
  se entra algum plugin para bloco de código).
- **Banco de teste = PostgreSQL 17 LOCAL** (`localhost:5432/jilsonsantana_test`), instalado pelo instalador oficial EDB. **Decisão REVISTA em Ago 2026:** a anterior ("um segundo projeto Supabase, não Postgres local — menos infra pro operador solo") caiu quando o mesmo projeto passou a servir **dev E teste** e o `migrate reset --force` da suíte começou a apagar o trabalho de desenvolvimento. **Martelo só é problema quando o que está embaixo tem valor:** com o banco de teste local e descartável, o reset volta a ser inofensivo, e a separação é **estrutural, não disciplinar**. Custo US$ 0. **Decisão REAFIRMADA na migração para o Neon (Set 2026):** branch de nuvem é barato e instantâneo, o que torna tentador usar um como banco de teste — mas isso devolve o `migrate reset --force` para um banco alcançável pela internet, que é exatamente o que a decisão evita. A trava do setup verifica **hostname parseado** contra uma lista de hosts locais (terceira forma da trava; as duas anteriores comparavam texto). Código, histórico e gatilho de reabertura: `CLAUDE.md` → Database & Migrations.
- **Major 17, com divergência conhecida:** produção é **PG18** desde a migração; teste e CI seguem no **17**. A razão original do 17 (*"o Prisma 5.22 é anterior ao 18"*) foi **medida e é falsa** — `migrate deploy`, `migrate status`, client, transação e rollback rodam contra o Neon 18.6. O 17 fica por inércia útil (o CI usa `postgres:17`). *Gatilho: alinhar quando algum código depender de comportamento específico do 18.*
- **O branch `dev` da Neon é a testemunha de reprodutibilidade contra produção** — mesmo papel que o 2º projeto Supabase tinha, agora sem custo. A comparação é por **SQL de catálogo** (colunas, constraints, índices, `relrowsecurity`), não por `get_advisors`.

## Deployment & CI

- **Docker** — multi-stage build (client + server)
- **Google Cloud Run** — hosting (região `us-east4`, plano → *Bloco G*; decisão do operador, 21/10/2026). A Railway saiu em 21/10/2026 após incidente de segurança dela. O serviço roda contêiner Docker (Node.js/Express) com **1 processador e 1 GB por cópia, de 1 a 3 cópias** (`min-instances 1`, `max-instances 3`, até 160 pedidos ao mesmo tempo por cópia — decisões do operador, 25/10/2026, depois do teste de carga; o 1 GB é folga sobre os ~150–210 MB medidos). **Todas as cópias têm sempre o mesmo tamanho** — o Cloud Run não deixa uma "principal" maior e "reservas" menores no mesmo serviço: subir o tamanho sobe o de todas, timeout de 3600 s e variáveis protegidas no Secret Manager e `deploy/cloud-run.yaml`. Health check at `/api/health`.
- **GitHub Actions** — `npm ci` + build do core + typecheck (client/server) + **`Lint`** + **`Test client`** + **`Test server`** + build (client/server) + `npm audit` informativo.
- **ESLint + typescript-eslint** (dependências de desenvolvimento, fixadas em `10.11.0` e `8.70.1`; etapa 4.5, 10/10/2026) — **três regras e só elas**: a tarefa disparada e não esperada (`no-floating-promises`, sem aceitar `void`), a função assíncrona onde ninguém espera (`no-misused-promises`) e o `any` (`no-explicit-any`). A falha que impedem: a promessa rejeitada sem tratamento que derruba o servidor, e que nenhum teste percebe. No site vale só a do `any`. Não vão para a imagem de produção. *Reabre para acrescentar regra só com uma falha descritível em uma frase; pacote pronto de regras fica fora.* *(A frase antiga aqui — "não roda teste e não roda lint" — ficou obsoleta em duas etapas: o Bloco 0 da Fase 3 ligou o teste de client e apagou o `lint`, e a fatia do `globalSetup` ligou o de servidor. Não há ESLint no repo; o nome `lint` segue livre.)* O step de servidor **não precisa de secret nenhum** desde Ago 2026: o banco é um **service container `postgres:17`** em `localhost`, e todo segredo do run (`BETTER_AUTH_SECRET`, senhas de seed) é gerado no próprio job — o `globalSetup` reseta o banco a cada execução, então nada precisa sobreviver. *(Antes eram dois secrets, `TEST_DATABASE_URL` e `TEST_DIRECT_URL`, apontando para um banco de nuvem; saíram junto com a mudança para banco local — connection string de nuvem em secret é superfície, `localhost` não é segredo.)* Claude code review on PRs: pendente.
- **Monitor de erro em produção** — **Sentry, no plano grátis** *(decisão do operador, 10/10/2026; **no servidor desde 10/10/2026**, ligado em produção — as telas do aluno são a parte 2, ainda não feita. Reabre se o plano grátis deixar de dar conta: aí se compara com outro serviço antes de pagar)*. **O plano grátis, pela página de preços que o operador conferiu em 10/10/2026:** 1 usuário, 5 mil erros por mês, alerta por e-mail, 30 dias de histórico. **O pago (Team, US$ 29/mês; US$ 26 no anual) só passa a valer quando acontecer uma destas três coisas:** uma segunda pessoa precisar entrar no painel · os 5 mil erros do mês acabarem mesmo com os filtros ligados (no grátis, o que passa do limite deixa de ser registrado até o mês virar — confirmar ao criar a conta) · ser preciso olhar um erro com mais de 30 dias. **Conta criada pelo operador em 10/10/2026** (organização `jilson-santana`), com o primeiro projeto para o servidor (Express) e só o monitoramento de erros marcado; a tela diz que o volume é ilimitado por 14 dias e depois valem os limites do grátis, sem cartão. **Instalado no SERVIDOR em 10/10/2026:** `@sentry/node` fixada em `10.75.3` (a linha 10, madura e com 21 pacotes; a 11 tinha 17 dias e 42 — medido), atrás de um arquivo só (`server/src/lib/monitor.ts`). Vira alerta a linha de erro com etiqueta nossa e o que derrubaria o processo; não sai cabeçalho, cookie, corpo, usuário, IP nem rastro anterior, e e-mail, chave e segredo num texto são mascarados; no máximo 30 envios em 10 minutos e 150 por dia, para um defeito repetido não gastar a cota. Sem medição de desempenho. Liga só em produção, com `SENTRY_DSN`. **Monitor de site fora do ar** (o único do plano grátis) criado pelo operador em 10/10/2026: "Site online", a cada 1 minuto em `/api/health`, com aviso depois de 3 falhas seguidas. **As regras de e-mail no painel (operador, 10/10/2026):** "Erro novo no servidor" — problema novo, que piora ou que volta, com nível de erro ou maior, e-mail direto para ele (o aviso de "no ar" de cada publicação é informativo e não vira e-mail) — e a regra de fábrica, para o que o Sentry marca como alta prioridade (é a que cobre o site fora do ar), com "todos os membros do projeto" como destinatário de reserva. Os dois e-mails de teste chegaram. **Falta a parte 2, as telas do aluno** (com a medição do peso no carregamento). *Reabre a escolha da versão quando a linha 10 parar de receber correção, ou com a 11 madura.* Não é opcional: é pré-requisito do primeiro aluno pagante (`implementation-plan.md` → Fase 7).

### Google Cloud — o que a escola usa, e o mapa do que pode contratar depois *(22/10/2026)*

> **Pedido do operador (22/10/2026):** *"não quero pagar pelo que não é necessário nem deixar de
> utilizar o que pode ser importante no futuro […] quando eu falar num chat sobre Google Cloud e os
> recursos que ainda podem ser contratados, apareçam as opções"*. **Regra dele para a conta:** só o
> necessário — o crédito de R$ 1.779 vence em 20/01/2027, e o que for ligado "para testar" vira
> conta depois. **Quem propõe ligar um recurso daqui traz o gatilho cumprido**, não "seria bom ter".
> Preço marcado `[medido]` foi lido na página do Google na data; `[a conferir]` é ordem de grandeza —
> confira no painel antes de orçar (`CLAUDE.md` → *Costs*: preço de fornecedor envelhece).

**O que a Railway tinha, e o que temos no Google sem pagar a mais:** a Railway tinha uma **borda**
dela (o endereço, o certificado e o encaminhamento até o servidor), incluída no preço, sem proteção
contra ataque nem cache de página. **No Google, o equivalente incluído é a frente do Cloud Run com o
mapeamento de domínio** — o mesmo nível. O **balanceador** não é o que a Railway tinha: é um degrau
acima (proteção, cache, certificado próprio), e por isso é opcional.

**EM USO (Bloco G):**

| Recurso | Para quê | Custo |
|---|---|---|
| Cloud Run (serviço) | o site: o contêiner da aplicação | **1 processador e 1 GB por cópia, de 1 a 3 cópias** (desde 25/10/2026 — decisões do operador): a cópia sempre ligada ~US$ 13/mês (512 MB seriam ~US$ 10, 2 GB ~US$ 19); as outras só nas horas de carga, do mesmo tamanho |
| Cloud Run (Job) | as migrations, antes de cada publicação | centavos (roda segundos por publicação) |
| Mapeamento de domínio | `www.jilsonsantana.com` e o domínio sem "www" | grátis (em *Preview*) |
| Secret Manager | o cofre das 13 chaves | 6 grátis; ~US$ 0,06/mês cada outra `[medido 22/10]` |
| Artifact Registry | as versões montadas do site (só as últimas) | cota grátis pequena `[a conferir]` |
| IAM + Workload Identity Federation | quem pode o quê; o GitHub publica sem chave guardada | grátis |
| Cloud Logging | os registros do servidor | cota grátis mensal `[a conferir]` |
| Orçamento e alertas | o aviso de gasto (R$ 100/mês) | grátis |

**O MAPA — o que pode servir à escola, e QUANDO** *(ordenado pelo que deve chegar primeiro)*:

| Recurso | O que faz pela escola | Quando ligar (o gatilho) | Custo |
|---|---|---|---|
| **Cloud Storage + Cloud Scheduler** (cópia do banco) | um `pg_dump` noturno do banco, guardado fora do Neon — a cópia fria que a Fase 7 pede e que hoje não existe | **antes do primeiro aluno pagante** (Fase 7) | centavos por mês `[a conferir]` |
| **Cloud Scheduler** (tarefas com hora marcada) | e-mail com data marcada, como o "aviso antes de trancar" do passo 7 da etapa 4.7 — hoje a escola não tem agendador | quando o passo 7 precisar de envio com hora marcada | algumas tarefas grátis por conta `[a conferir]` |
| **Uptime check** (Cloud Monitoring) | testa o site a cada minuto e manda e-mail se ele cair — o Sentry só vê erro de quem chegou ao servidor | barato e útil já; ligar na abertura ao público (passo 8 da 4.7) | cota grátis `[a conferir]` |
| **Mais processador e memória** no Cloud Run | página mais rápida sob carga | o painel do Cloud Run mostrar processador acima de ~70% por bastante tempo, ou o tempo de resposta subindo | linear: 1 → 2 processadores e 2 GB ≈ US$ 26/mês parado `[medido 22/10]` |
| **Mais de uma instância** | atender muita gente ao mesmo tempo | **LIGADO em 25/10/2026: até 3 cópias** (os contadores e o cache dos textos já no banco). *Subir o máximo:* o teste de carga mostra ~200 pedidos por segundo por 3 cópias — passar disso, ou o processador das 3 ficar acima de ~70% | só nas horas de carga, ~US$ 0,09 por hora por cópia ocupada de 1 processador e 512 MB `[a conferir]` |
| **Balanceador** (Application Load Balancer) | o caminho que o Google recomenda para produção; necessário para os três itens abaixo | a escola ter receita que o pague, ou atraso medido no mapeamento | ~US$ 18/mês + US$ 0,008/GiB `[medido 21/10]` |
| **Cloud Armor** (exige o balanceador) | barra ataque e robô antes de chegar ao site; limite de pedidos na borda | ataque medido (enxurrada de pedidos, teste de cartão em massa) | dezenas de US$/mês `[a conferir]` |
| **Cloud CDN** (exige o balanceador) | guarda as páginas públicas perto do visitante | tráfego da vitrine crescer; o vídeo e as imagens já vêm do Bunny, perto do aluno | por GB `[a conferir]` |
| **reCAPTCHA** | prova que é gente no "assinar sem login" | teste de cartão ou cadastro por robô medido na tela pública | cota grátis mensal `[a conferir]` |
| **Gemini (Vertex AI ou API)** | a segunda IA do JilsonAI (a primeira é a Claude) — sempre atrás do `llm.complete()` | Fase 6 (JilsonAI) | por uso `[a conferir]` |
| **Cloud Tasks ou Pub/Sub** (fila) | trabalho demorado que tenta de novo sozinho | JilsonAI Fases 4–5 (o gatilho de volta da fila, `CLAUDE.md` → *Background Jobs*) | centavos `[a conferir]` |
| **Speech-to-Text** | transcrever as aulas para a base do JilsonAI | JilsonAI Fases 4–5 — conferir antes se o próprio Bunny já transcreve | por minuto de áudio `[a conferir]` |
| **BigQuery + Looker Studio** | relatórios de estudo (horas assistidas, onde o aluno desiste) sobre os `LessonEvent` | quando o Postgres não der conta das análises (a convenção de *Analytics*: leitura em módulo à parte) | cota grátis mensal `[a conferir]` |
| **Error Reporting** | erros agrupados, sem o Sentry | só se o plano grátis do Sentry não bastar | grátis `[a conferir]` |
| **Memorystore (Redis)** | memória compartilhada entre instâncias | mais de uma instância **e** o banco lento para os contadores | dezenas de US$/mês `[a conferir]` |
| **Cloud DNS** | o domínio sair da GoDaddy | se a GoDaddy atrapalhar; não há ganho hoje | centavos `[a conferir]` |

**O QUE NÃO SE LIGA, mesmo existindo no Google:**
- **Cloud SQL / AlloyDB** (banco no Google): o Neon atende, custa centavos, **desliga sozinho quando ninguém usa** e tem o branch de dev (cópia instantânea). O Cloud SQL fica sempre ligado (parado à mão, não liga sozinho) e cada cópia é um banco pago à parte. *Pergunta do operador (22/10/2026, sem alunos ainda): "ficar tudo num lugar só evitaria migrar com a escola funcionando". Resposta registrada:* trocar o banco depois não mexe no código (o Prisma fala com qualquer Postgres) — é copiar os dados e trocar as duas ligações no cofre, numa janela de minutos. *Gatilho: problema no Neon, ou o operador decidir juntar tudo num fornecedor.*
- **O Neon dentro do Google: não existe** `[FATO — Neon, lista de regiões da conta, 22/10/2026: só AWS e Azure]`. **DECIDIDO (operador, 22/10/2026): o projeto do Neon vai para a AWS da Virgínia** (`aws-us-east-1`), vizinha do `us-east4` do Google — *"é mais perto, e a AWS também é confiável; se um dia eu tiver problema com a Neon, mudamos para o Google"*. Plano → Bloco G, etapa G1b. *Gatilho: problema com o Neon → Cloud SQL.*
- **Identity Platform / Firebase Auth**: a identidade é nossa, no Better Auth (`CLAUDE.md` → *Tech Stack*). Sem gatilho: arquitetural.
- **Firebase Hosting** na frente do site: só repassa ao servidor o cookie `__session` `[conhecido, não conferido]`, o que derrubaria o login.
- **Cloud Build**: a imagem se monta no GitHub Actions. *Gatilho: os minutos do GitHub acabarem.*
- **Processador cheio o tempo todo** (cobrança por instância, ~US$ 45/mês): o "ligado, esperando" já tira a espera. *Gatilho: trabalho em segundo plano entre pedidos.*

**DESEMPENHO — para quem vem de hospedagem compartilhada e VPS:** o serviço "ligado, esperando" com
1 processador e 512 MB equivale a um **VPS pequeno, só para a escola** — o mesmo tamanho de uso
antes planejado. O que pesa na página não é o tamanho: é a **distância** (o servidor e o banco
ficam os dois na Virgínia desde a G1b; o aluno no Brasil soma ~0,1 s por pedido) e o **banco**
(cada consulta, na mesma região, leva poucos milissegundos). O pesado — vídeo e imagens — já sai do Bunny, com
servidor no Brasil. **Subir de desempenho é uma configuração**, aplicada numa publicação nova sem
tirar o site do ar, em cerca de um minuto, e volta atrás do mesmo jeito: processador (1, 2, 4…) e
memória (512 MB, 1 GB, 2 GB…). **O sinal para subir** está no painel do Cloud Run (processador,
memória e tempo de resposta). A única mudança que precisa de código antes é ter **mais de uma
instância** (os contadores em memória).

**O TESTE DE TAMANHOS — MEDIDO em 25/10/2026** *(pedido do operador: "testar 512 MB a 8 GB para
entender quando faz diferença")*. Em cada tamanho: 50 pedidos seguidos à rota do curso (banco +
endereço assinado), 40 à rota de saúde (sem banco) e uma rajada de 100 pedidos, 20 ao mesmo tempo.
Tempo **dentro do servidor** (registro do Cloud Run, sem a viagem pela internet); a rajada, medida de
casa; a memória, no Cloud Monitoring. No fim, o serviço voltou a 2 processadores e 2 GB.

| Processadores · memória | Rota do curso, mediana | Rajada de 100 (20 juntos) | Memória usada no pico |
|---|---|---|---|
| 2 · 512 MB | 55 ms | 1,9 s | — |
| 2 · 1 GB | 37 ms | 1,8 s | 143 MB |
| 2 · 2 GB | 56 ms | 1,8 s | 164 MB |
| 2 · 3 GB | 40 ms | 1,8 s | — |
| 2 · 4 GB | 34 ms | 1,7 s | 163 MB |
| 2 · 5 GB | 52 ms | 1,8 s | 204 MB |
| 2 · 6 GB | 56 ms | 1,9 s | 184 MB |
| 2 · 7 GB | 64 ms | 2,0 s | 214 MB |
| 2 · 8 GB | 36 ms | 1,7 s | — |
| **1 · 512 MB** | 71 ms | 2,5 s | 154 MB |
| 1 · 1 GB | 127 ms | 2,2 s | 153 MB |

*(— : o Monitoring não guardou amostra daquela versão.)* A rota de saúde levou **2 a 3 ms em todos**.
**O que os números dizem:**
- **Memória não muda nada hoje.** A escola usa 140 a 215 MB em qualquer tamanho; o resto fica
  reservado sem uso. A variação de 34 a 64 ms não segue o tamanho: é o banco e a rede oscilando.
- **Processador muda pouco, e só com gente junta.** Com 1 processador, cada pedido levou uns 20 a 70 ms
  a mais, e a rajada, 0,5 s a mais. Para um aluno de cada vez, não se percebe.
- **O que se sente de casa (~0,4 a 0,5 s por pedido) é quase todo a viagem Brasil → Virgínia** e o
  aperto de mão da conexão segura — não o tamanho do servidor.
- **As cópias se veem** na aba *Observabilidade → Métricas*, gráfico *Contagem de instâncias do contêiner* (`active` atendendo, `idle` ligada e esperando). **Gatilhos para subir** (painel do Cloud Run, aba *Métricas*): memória acima de ~70% do limite (no
  teto, o servidor reinicia); processador acima de ~70% por bastante tempo, ou o tempo de resposta
  subindo quando há alunos ao mesmo tempo.

**O TESTE DE CARGA — 100, 500 E 1.000 ALUNOS, MEDIDO em 25/10/2026** *(pedido do operador: "se minha
meta de 1k alunos for atingida e todos entrarem para estudar ao mesmo tempo, qual configuração
preciso", com os custos)*. Rota do curso (banco + endereço assinado), saindo de um computador no
Brasil: rajadas de 100, 500 e 1.000 pedidos ao mesmo tempo e um fluxo de 200 pedidos por segundo
durante 20 s. Sentry desligado durante o teste e religado no fim; o serviço voltou a 2 processadores,
2 GB e 1 cópia (revisão `jilson-prod-00027`). **Nenhum pedido falhou em nenhuma configuração.**

| Configuração | Rajada de 1.000 (mediana · pior) | Fluxo: aguenta por segundo | Processador no pico | Memória no pico |
|---|---|---|---|---|
| 1 cópia · 1 proc · 512 MB | 9,2 s · 16,1 s | ~68 pedidos | 30% | 154 MB |
| 1 cópia · 1 proc · 2 GB | 8,1 s · 14,2 s | ~77 | 58% | 184 MB |
| 1 cópia · 2 proc · 2 GB (hoje) | 6,9 s · 11,6 s | ~95 | 45% | 205 MB |
| 1 cópia · 4 proc · 4 GB | 5,5 s · 9,3 s | ~115 | 47% | 204 MB |
| 3 cópias · 2 proc · 2 GB | 2,5 s · 3,8 s | 200 com folga (mediana 0,3 s) | 19% | 204 MB |
| 10 cópias · 2 proc · 2 GB | 2,7 s · 4,0 s | 200 com folga (mediana 0,35 s) | 13% | 184 MB |
| **A CONFIGURAÇÃO ADOTADA** — de 1 a 3 cópias · 1 proc · 512 MB *(revisão `00028`, medida no ar em 25/10/2026, com o Sentry ligado)* | 3,7 s · 6,4 s | ~145 nos primeiros 60 s (ligando as cópias) e ~190 com as 3 ligadas (mediana 0,5 a 0,7 s) | **93%** | 179 MB de 512 |

*8 processadores não foi testado: o projeto tem um teto de **20 processadores por região** (cota do
Google; aumentar é pedido gratuito no painel) — ou seja, hoje cabem no máximo 10 cópias de 2.*
**O que os números dizem:**
- **Uma cópia não cresce com o tamanho.** De 1 para 4 processadores, ela passa de ~68 para ~115
  pedidos por segundo, e o processador nunca enche: o programa do servidor usa um processador por vez,
  e as conexões com o banco de cada cópia são poucas. **Quem multiplica a capacidade é o número de
  cópias** — 3 cópias atenderam o fluxo inteiro com 0,3 s de mediana.
- **Memória continua indiferente:** 150 a 205 MB mesmo sob a carga máxima.
- **A partir de 3 cópias, o limite passou a ser o computador que gerava a carga** (3 e 10 cópias deram
  o mesmo resultado): a capacidade real de 3 cópias é maior que a medida.

**Quanto pedido um aluno faz:** o vídeo sai do Bunny, não do servidor. Quem assiste manda o "estou
neste segundo" a cada 5 s (0,2 pedido por segundo) — **1.000 alunos assistindo ≈ 200 pedidos por
segundo**; abrir a aula são uns 6 a 8 pedidos de uma vez. *(Com a gravação a cada 15 s, como era até
25/10, a carga seria um terço — é a troca que se fez pela precisão do ponto.)*

| Alunos assistindo ao mesmo tempo | Pedidos por segundo | Configuração que aguenta (medido) | Com a adotada (1 proc · 512 MB · até 3 cópias) |
|---|---|---|---|
| **100** | ~20 | 1 cópia · 1 processador · 512 MB (sobra 3 vezes) | 1 cópia, com folga |
| **500** | ~100 | 1 cópia · 2 processadores fica no limite → **2 cópias** de 2 processadores e 2 GB | 2 cópias, com folga |
| **1.000** | ~200 | **3 cópias** de 2 processadores e 2 GB (medido com folga) | 3 cópias **no limite** (processador a 93%, 0,5 a 0,7 s por pedido) — *gatilho: com uns 500 alunos ao mesmo tempo, (1) subir o máximo para 5 cópias, o mais barato — as extras só ligam no pico; ou (2) 2 processadores por cópia (a de sempre ligada ~US$ 19/mês com 1 GB), cada pedido mais rápido — e as cópias de reserva sobem junto: todas têm o mesmo tamanho. Só configuração* |

**A mudança de código para mais de uma cópia — FEITA em 25/10/2026:** o limite de tentativas da
cobrança, do assinar sem login, do código por e-mail e do login conta no banco (`limite_de_tentativa`,
uma instrução por pedido, chave cifrada); o cache dos textos vale 1 minuto em cada cópia. As
travas da cobrança já eram do banco. O serviço passou a ter de 1 a 3 cópias.

**CUSTOS PREVISTOS por mês** *(US$; Google: preços da cobrança por pedido na região us-east4 — a
parte "ligado, esperando" bate com a conta medida em 22/10; os preços com o servidor ocupado e o pedido
`[a conferir]` na página de preços. Bunny: tabela da doc, `[medido 25/10]`. Neon: `[a conferir]`.)*
- **Servidor (Google)**, cada cópia sempre ligada: 1 proc · 512 MB ≈ **US$ 10**; 2 proc · 2 GB ≈
  **US$ 26**. **Com a configuração adotada** (1 proc · 1 GB, 1 sempre ligada e até 3), a cópia
  ocupada custa ~US$ 0,095 por hora: 100 alunos ≈ **US$ 13–23/mês** · 500 ≈ **US$ 23–38** · 1.000 ≈
  **US$ 38–55** (estudando ~4 h por dia no pico; os pedidos, ~US$ 2 a mais com 1.000). *O gasto real
  se acompanha em **Faturamento → Relatórios**, filtrando o serviço Cloud Run.* Ocupada, a cópia de 2 proc · 2 GB custa ~US$ 0,19 por hora (US$ 0,000053 por segundo);
  pedidos, US$ 0,40 por milhão depois de 2 milhões grátis. O jeito barato de crescer é **1 cópia sempre
  ligada e as outras ligando só com carga** (máximo de 3 a 5): paga-se a cópia extra só nas horas de pico.
  - 100 alunos: ~US$ 10–15 · 500 alunos: ~US$ 30–50 · 1.000 alunos: ~US$ 50–110 *(estudando ~4 h por dia
    no pico; com as 3 cópias sempre ligadas, ~US$ 80 só paradas).*
- **Vídeo (Bunny) — o maior custo.** Entrega para a América do Sul: **US$ 0,045 por GB**. Os vídeos da
  escola (gravação de tela) somam 1,86 GB por hora em todas as resoluções; quem assiste baixa uma só —
  **~0,5 a 1 GB por hora assistida ≈ US$ 0,02 a 0,045 por hora**. Com 10 h por aluno no mês: 100 alunos
  ≈ US$ 22–45 · 500 ≈ US$ 110–225 · 1.000 ≈ US$ 225–450.
- **Banco (Neon):** cresce sozinho de 0,25 a 4 unidades de processamento (era 2 no teste) (1 unidade = 1 processador e
  ~4 GB) e dorme após 5 min sem uso. **No teste, nem saiu do mínimo** *(painel Monitoring do Neon, lido
  pelo operador em 25/10/2026)*: usou no máximo ~0,09 de processador (dos 0,25), ~0,35 GB de memória,
  27 conexões no pooler (de 10.000) com **espera zero**, ~20 no Postgres (de 905), nenhum deadlock.
  **Subir o teto de 2 para 8 não muda nada hoje.** *O operador subiu para 4 em 25/10/2026, por folga* (só se
  paga o que for usado; o painel mostra 0,25 a 4 unidades, ~16 GB no teto). Com 1.000 alunos, a carga do banco seria a do
  teste: o custo deve ficar perto do mínimo (preço por unidade-hora `[a conferir no painel do Neon]`).
  *A decidir na abertura da escola (Fase 7):* o "dormir após 5 min" faz o primeiro visitante depois de
  um silêncio esperar ~0,5 s a mais; deixá-lo sempre acordado custa o mínimo (0,25) o mês inteiro.

**O QUE FOI MONTADO, EM LINGUAGEM SIMPLES** *(pedido do operador, 24/10/2026)* — uma publicação passa
por todas as peças, nesta ordem:
1. **GitHub Actions** monta o site (a "imagem") e entra no Google **sem senha guardada** (Workload
   Identity Federation: o Google confere que o pedido vem deste repositório, da `main`).
2. **Artifact Registry** guarda a imagem montada — o depósito das versões.
3. **Cloud Run Job** (`jilson-prod-migration`) atualiza o banco com a mesma imagem; se falha, a
   publicação para ali.
4. **Cloud Run** (serviço `jilson-prod`) passa a usar a imagem nova. Cada publicação, ou mudança de
   tamanho, vira uma **revisão** numerada; o tráfego passa para ela sem tirar o site do ar, e as
   antigas ficam guardadas — dá para voltar a uma delas na aba *Revisões*.
5. **Secret Manager** entrega as chaves ao servidor quando ele liga; só a conta do site lê, e cada
   leitura fica registrada.

E em volta: as **contas de serviço** são os "crachás" — `jilson-site` (o site e o Job: leem o cofre) e
`jilson-publicacao` (o GitHub: publica); a conta padrão `…-compute@` sobrou do Google (P106). O
**mapeamento de domínio** liga `www.jilsonsantana.com` ao serviço e renova o cadeado sozinho. O
**Cloud Logging** é o registro de cada pedido; o **Cloud Monitoring**, os gráficos de memória,
processador e tempo; o **Orçamento**, o aviso de gasto.

## AI-Assisted Dev (quality gates)

- **Claude subagents** (`.claude/agents/` — versionado; ver a exceção de ignore no `CLAUDE.md`): `security-vulnerability-reviewer` (existe; tools read-only, sem Edit/Write — reporta, nunca corrige). `e2e-test-writer` — **PENDENTE e ADIADO** (não existe; adapted from the Mosh reference): gerar teste numa camada que hoje nem roda no CI é dívida, não cobertura — só faz sentido depois do bloco Gates. Duas restrições já decididas pra quando nascer: Write/Edit **restrito a `e2e/**`** (sem acesso a `server/src`/`client/src`) e **só a mecânica** vai pro arquivo do agente. Detalhe em `CLAUDE.md` → Testing.
- **Skills** (`.agents/skills/`): `frontend-design`, `better-auth-best-practices`, pinned via `skills-lock.json`.

## Server library (decision needed before Phase 6)

- **Claude API SDK**: use Anthropic's official TypeScript SDK (`@anthropic-ai/sdk`) for JilsonAI. (The Mosh reference used the Vercel AI SDK with OpenAI; we use Anthropic directly.)

## Public Surface (SEO)

- **Rotas públicas = HTML montado no servidor** (Express + template + Tailwind, **sem React**). O app privado (`/aluno/*`, `/admin/*`) continua React SPA. Lista de rotas, trava do conteúdo-atrás-de-interação e política de `robots.txt`: `CLAUDE.md` → **Rendering Boundary**.
- **Nenhum provedor muda por causa disto.** Google Cloud, Neon, Bunny, Stripe e Resend seguem. Registrado de propósito: *"vamos fazer certo"* é o clima em que se troca infraestrutura que estava boa. Nada se troca sem uma falha nomeável. *(A troca Supabase → Neon em Set 2026 foi decisão do operador, não um caso de "melhorar por melhorar" — está no changelog do `CLAUDE.md`, entrada (15).)*
- **Google Search Console** — conectar **agora** (a verificação demora e queremos histórico desde o dia um), mas **só produz dado ~30–60 dias depois do catálogo ir ao ar**. GSC mede **o nosso** desempenho no que já existe; ele **não substitui** ferramenta de pesquisa de mercado (volume, dificuldade de termo, tráfego de concorrente), que responde perguntas de **antes** de existir site.

## What We Do NOT Use (and why)

- **Auth / Data API / Storage do fornecedor de banco** (era Supabase, agora Neon) — auth is Better Auth via Prisma; all DB access via Prisma.
- **Stripe Customer Portal** — vem incluído no Billing, mas não usamos: a gestão de assinatura fica embutida na escola (aluno nunca sai do site), via Subscriptions API em telas nossas. *(Stripe Billing SIM — decisão revista em Ago 2026; ver a seção Billing.)*
- **pg-boss (fila de jobs)** — **removido do MVP em Ago 2026.** Aplicação direta do critério de decisão de stack (`CLAUDE.md` → Working Method: *toda peça precisa impedir uma falha descritível em uma frase*). A falha que a fila evitaria é "o webhook falhou e ninguém retentou" — mas **a Stripe já reentrega quando devolvemos 5xx**, então mantínhamos worker + schema `pgboss` + um modo de falha próprio só pra duplicar o fornecedor. Agravante: o **alerta** de falha era ele mesmo uma fila do pg-boss — a detecção dependia da coisa que deveria detectar (a detecção agora é o monitor externo, acima). O webhook passa a ser **inline**: assinatura → `event.id` → espelho local → 200. **GATILHO DE VOLTA:** a fila retorna nas **Fases 4–5 do JilsonAI** (embeddings da KB; pipeline transcrição→chunk→embedding) — lote, demorado, retentável — e é código que ainda não existe, então entrar depois não refatora nada. No MVP do JilsonAI (Fases 0–3) o chat é síncrono com streaming: fila ali pioraria o produto. A razão do Mosh pra adotá-la é **CONHECIDA desde Ago 2026 e CONFIRMA a remoção** — as filas dele retentam chamada de LLM de terceiro, não o webhook; o caso de uso tem a forma exata do nosso gatilho de volta. Detalhe em `CLAUDE.md` → Background Jobs.
- **Bun** — Node is the existing environment; less novelty to manage.
- **Teachable / course platforms** — building an owned asset.
- **Next.js** — PROPOSTO e REJEITADO de novo em Ago 2026, com razão **nova**: a razão antiga ("o público vem do YouTube, SPA basta") ficou **FALSA** quando a página de curso virou vitrine indexável. A razão que vale: a superfície pública é pequena e read-only e é servida como **template no servidor** (ver `CLAUDE.md` → Rendering Boundary); Next.js reescreveria o app privado, que não ganha nada com SEO. *Gatilho de reabertura no `CLAUDE.md`.*
- **Gamification** — deliberately excluded (solo maintainability).
- **Editor rico de HTML (TinyMCE e similares)** — **não adotado** *(o operador perguntou em
  23/09/2026; recomendação do agente aceita)*. Três razões: o admin **não recebe HTML digitado**
  (`CLAUDE.md` → *negrito = dois campos*); HTML gravado no banco é a porta clássica de XSS numa
  página que o React não protege (template de servidor); e a página de curso é **montada de
  campos**, justamente para não virar texto livre curso a curso. *Gatilho de reabertura:* surgir
  uma seção que precise de texto longo formatado (páginas legais, anúncios) — e aí o caminho é
  **Markdown com HTML bruto desligado** (mesma dependência pendente do JilsonAI, acima), não um
  editor de HTML.
  **Gatilho cumprido em 27/09/2026:** a descrição do curso pediu negrito e listas, e o caminho
  seguido foi exatamente esse (`react-markdown`, em *Frontend*). O editor de HTML continua fora.
