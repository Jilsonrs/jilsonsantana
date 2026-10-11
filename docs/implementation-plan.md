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

> **Fases fechadas:** 0 (fundação/deploy) · 1 (auth/shell) — checkboxes completos em
> [`build-history.md`](build-history.md). **Fase 2** (conteúdo/trilhas) segue **aberta**: ver
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
> **🌍 ESCOLA BILÍNGUE (PT + EN) — decisão do operador em 14/09/2026, PARCIALMENTE construída.** A
> escola nasce em português e inglês, com o inglês ligado no lançamento mesmo sem curso em inglês
> (spec: [`idiomas.md`](idiomas.md); travas: `CLAUDE.md` → *Idiomas*). **Já existe:** a home nos
> dois idiomas, o dicionário tipado em `core/src/i18n/` (inglês escrito e revisado em 22/09), o
> enum `Language` no banco (nasceu com `SiteText`) e depoimentos/FAQ por idioma. **Falta (Bloco I):**
> `Course.language` e `LearningPlan.language`, o filtro por idioma nas leituras de catálogo, e as
> telas React no dicionário. Preço em dólar e **decisão de imposto internacional** na Fase 4.
>
> **Infra de banco (atualizado Set 2026 — MIGRADA DO SUPABASE PARA O NEON) — TRÊS ambientes, um por
> papel, agora com DOIS deles no MESMO projeto:**
> Neon `falling-snow-79489296` (aws-us-east-2, **PG18.6**), branch **`production`**
> (`ep-still-breeze-aebrui0f`) = **produção**, só o Railway · branch **`dev`**
> (`ep-lingering-morning-aehqd81z`) = **dev / a escola**, **nunca apagado** ·
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
> **PUBLICADO em 10/10/2026, por último (`main` = `354c96a`, CI verde nos dois jobs, deploy ok;
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
> de alerta chegou na caixa dele. **Ainda a confirmar com ele:** a resposta nova na página em
> inglês (fica atrás do "Em breve": só ele vê) e a regra de "avisar a cada erro novo" (P63).
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

The school runs a **rotating catalog capped at 15 courses per language, 2 languages max** *(was
"20" here — stale since `courses.md` Set 2026 (13) lowered it to 15; per-language cap is the
operator's decision of 14/09/2026, see `idiomas.md`)*: a new course enters when another
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
- [ ] Bloco 6b — UI de montagem de trilha curada (admin): `GET /api/admin/trilhas` +
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
      por vídeo. Legenda só no idioma do curso. A regra do nome do arquivo (`bunny.md` §7.1)
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

### Bloco I — Escola bilíngue: idioma no conteúdo + dicionário de textos  *(Set 2026 · decisão do operador · spec em `idiomas.md`)*

> **ESTADO EM 23/09/2026 — parte adiantada por outros blocos, checkboxes abaixo seguem valendo:**
> o enum `Language` **já existe** no banco (nasceu com `SiteText`, C2), e o dicionário **já serve os
> templates do servidor** (`core/src/i18n/`, tipado, com o teste de chave vazia/idêntica). **Ainda
> falta tudo o que é deste bloco de fato:** `Course.language` e `LearningPlan.language`, o filtro por
> idioma nas leituras de catálogo/busca/trilha, a recusa de item de outro idioma, as telas React no
> dicionário e o seletor para quem está logado. O seletor PT | EN da vitrine **já existe** (dois
> links, um por endereço) — o "Passo 0" abaixo passa a ser só o do app logado.

> **DECISÕES DO OPERADOR EM 23/09/2026 (mudam o tamanho deste bloco):**
> - O **admin fica em português** — não ganha versão em inglês.
> - Os textos do app do aluno **não** entram em *Admin → Site → Textos*: lá ficam só as páginas
>   públicas. (Quando o React usar o dicionário, a tela de Textos filtra — ver C2, Passo 0.)
>   **Exceção, 24/09:** o rodapé do app usa os textos do rodapé da home (`common.footer`), então
>   ele se edita em Textos junto com a home — ver Bloco S → *Rodapé do app*.
> - **O seletor PT | EN da home basta por agora.** Traduzir o app do aluno (dicionário no React,
>   seletor dentro do app, `User.preferredLanguage`) vira **bloco próprio, depois** — os itens
>   *Dicionário*, *Migrar os textos* e *Seletor* abaixo, e os itens 3 e 4 do *Done when*, esperam
>   esse bloco. O Passo 0 (posição do seletor) fica resolvido por isso.
>   **ATUALIZADO em 24/09 (operador):** *"toda [tela] depois do login vai precisar ficar em inglês
>   também, por causa dos alunos internacionais"* — o seletor vai trocar o sistema todo, catálogo
>   incluído. O bloco **"app do aluno em inglês" vem ANTES do C4**. O seletor já existe, no
>   **rodapé do app** (desenho do Antigravity), hoje provisório: leva à home pública PT/EN até o
>   bloco fazê-lo trocar o idioma do próprio app. **O Admin continua em português** (os alunos
>   internacionais não o usam).
> - As páginas provisórias (`/cursos`, `/trilhas`, `/curso/…`, `/trilha/…`): **não mexer** — ele
>   ainda vai pensar nelas; foco na home.
>   *(30/09/2026, operador: não são mais "provisórias" — o que está atrás do login é definitivo, e o
>   desenho da vitrine é transposto para o template, nada se perde. Ver Bloco C5.)*
> - `Course.language` entra pela **etapa 2 do C4**, que precisa dele. O resto da parte de dados
>   (`LearningPlan.language`, filtro nas listas e na busca, recusa de item de outro idioma na
>   trilha, clone herdando) continua neste bloco. O campo Idioma no formulário de **trilha** espera
>   o Bloco 6b, porque esse formulário ainda não existe.

> **APP DO ALUNO EM INGLÊS — 5 ETAPAS, uma por vez** *(plano aprovado pelo operador em 24/09/2026;
> vem ANTES do C4)*. Cada etapa é discutida, aprovada e vira um commit. Decisões dele que o bloco
> segue: Admin em português · o estrangeiro escolhe o idioma na home e **entra já em inglês** ·
> **um canal do YouTube por idioma** (`@jilsonen` para o inglês) · catálogo e páginas de curso e
> trilha entram, mesmo provisórias · textos do app fora de *Admin → Textos* (o rodapé é a exceção).
>
> - [x] **Etapa 1 — o seletor funciona** *(24/09)*. `PATCH /api/me/language` grava
>       `User.preferredLanguage` na conta **da sessão** (só `pt`/`en`); o React lê o idioma da
>       sessão (`client/src/lib/language.ts`, `useAppLanguage`) e, ao trocar, espera o `refetch()`
>       da sessão — tudo muda junto, sem recarregar. O seletor do rodapé virou **botão**
>       (`aria-pressed`), e o rodapé segue o idioma: textos, destinos em inglês e canal do YouTube.
>       Os endereços públicos e os dois canais moram em `core/src/constants/site.ts`
>       (`ROTAS_PUBLICAS`), usados pela home e pelo rodapé — a home `/en` passou a levar ao canal
>       em inglês. Testes: 5 de servidor + 1 na home; 9 no rodapé. **Mutação:** rota sem gravar,
>       home com o canal fixo, idioma fixo em PT e troca sem atualizar a sessão → 6 reprovaram.
>       *Pendente para a etapa 2:* aviso na tela se a troca falhar (é texto novo, entra com o
>       dicionário do app); hoje o idioma simplesmente não muda.
> - [x] **Etapa 2 — telas do aluno em inglês:** parte `app` no dicionário (fora de Textos), menu,
>       início, conta, minhas trilhas e login (quem vem de `/en` vê o login em inglês e a conta
>       passa a ser inglês). Em dois commits:
>   - [x] **2a — a base, o menu e o login** *(24/09)*. Parte `app` em `core/src/i18n/` (tipada:
>         frase faltando no inglês quebra a compilação); `ehTextoEditavel()` tira `app.*` da tela
>         de Textos **e** da gravação (`DICT_KEYS`). O idioma é decidido UMA vez, no shell
>         (`useIdiomaDoShell`: logado → conta; sem login → `?lang=`), e desce por contexto
>         (`useIdioma`, `useT` em `client/src/lib/language.tsx`). Menu: `navegacao(t)` — rótulo do
>         aluno do dicionário, de admin escrito em português. Login em inglês; o "Entrar" de `/en`
>         leva a `/login?lang=en`, e entrar por ali grava o idioma na conta **antes** de abrir o
>         app (falhar não barra o login). Aviso no rodapé se a troca falhar. Testes: 3 de
>         servidor novos/ajustados, 7 no login, 3 no shell, 1 no mapa, 1 no rodapé. **Mutação:**
>         trava de `app.*` aberta, idioma fixo em PT e login sem gravar → 7 reprovaram. Revertido.
>   - [x] **2b — início, minha conta e minhas trilhas** *(24/09)*, e a regra no `CLAUDE.md` →
>         Client (*texto de tela do aluno sai de `useT()`*). Início, Minha conta, Minhas trilhas
>         (lista e detalhe) e o vazio da árvore de trilha nos dois idiomas; o português ficou
>         idêntico (os testes antigos passaram sem mexer). Minha conta ganhou o primeiro arquivo
>         de teste dela. **Mutação:** textos fixos em português → 11 reprovaram; um rótulo escrito
>         à mão → 1 reprovou. Revertido.
> - [x] **Etapa 3 — cursos e trilhas ganham idioma:** a antiga etapa 2 do C4 + a parte de dados
>       deste bloco (migration, campo Idioma e etiqueta "EN" no admin, filtro nas listas, recusa
>       de item de outro idioma na trilha). Antes: dividir o formulário de curso.
>       **Decisões do operador (24/09, ao aprovar):** idioma trocável **enquanto rascunho**, trava
>       depois de publicado · **idioma é filtro, não portão** — só as listas de descoberta filtram;
>       o que é do aluno (trilhas salvas, cursos iniciados) aparece nos dois idiomas.
>   - [x] **3a — formulário de curso dividido** *(24/09)*: 375 → 129 linhas. Lógica em
>         `client/src/lib/course-form.ts`; seções em `client/src/components/admin/course-form/`.
>         Mesmas classes, mesma tela: os testes passaram sem mexer.
>   - [x] **3b — banco e servidor** *(24/09)*. Migration `20260924150000_course_and_plan_language`
>         (as linhas existentes viram PT e o DEFAULT sai: o banco recusa curso ou trilha sem
>         idioma). Passo 0 no dev antes/depois: 2 cursos, 1 trilha, 2 módulos, 3 aulas, 2 usuários,
>         logins de admin e membro OK nas duas vezes; `migrate diff` *No difference*; zero tabela
>         sem RLS. **Aplicada no dev; em produção roda no pre-deploy do próximo publish.**
>         `?lang=pt|en` em catálogo, trilhas e busca (`idiomaDaLista`); link direto e "minhas
>         trilhas" não filtram; `LanguageMismatch` na trilha; `LanguageLocked`/`LanguageInUse` na
>         troca; a cópia herda o idioma da trilha. A API fala `pt`/`en` (`comIdioma`). 14 testes
>         novos (`content-language.test.ts`). **Mutação:** sem filtro, sem trava, sem recusa e
>         "minhas trilhas" filtrando → 4 reprovaram. Revertido.
>   - [x] **3c — campo Idioma e etiqueta "EN" no admin** *(24/09)*. Campo **Idioma** (Português /
>         English) na seção Organização; curso novo nasce Português. Curso GRAVADO fora de rascunho
>         mostra o idioma como texto, com "O idioma trava depois que o curso é publicado." (texto
>         aprovado pelo operador no plano) — texto e não campo desabilitado, porque campo
>         desabilitado sai do envio do formulário. Etiqueta "EN" na lista. **Mutação:** trava
>         desligada, idioma fixo no envio e etiqueta removida → 4 reprovaram. Revertido.
> - [x] **Etapa 4 — catálogo e cursos no idioma escolhido:** catálogo, busca, páginas de curso e
>       trilha; nível e textos das 3 camadas nos dois idiomas; catálogo EN vazio; curso com 0 aulas.
>       **Decisões do operador (24/09):** o nível aparece pelo NOME ("Intermediário" /
>       "Intermediate"), não pelo valor cru — o Admin segue com o cru · os textos das 3 camadas
>       ficam **editáveis em Textos** · junto, o conserto do achado da 3c (formulário de curso sem
>       aviso quando o salvamento falha).
>   - [x] **4a — catálogo e busca** *(24/09)*. `/cursos`, `/trilhas` e a busca pedem a lista no
>         idioma do app (`?lang=`); o idioma está na chave da consulta, então trocar no rodapé refaz
>         a lista. Textos da tela, da busca e do cartão (contagem e nível) no dicionário. Vazio em
>         inglês próprio; curso com 0 aulas mostra "0 aulas". **Mutação:** lista ignorando o idioma
>         e nível cru → 4 reprovaram. Revertido.
>         *Para a revisão do inglês (etapa 5):* a contagem não tem singular — "1 módulos" em PT
>         (já era assim) e "1 modules" em EN.
>   - [x] **4b — páginas de curso e trilha** *(24/09)*, com as 3 camadas editáveis em Textos. Texto da
>         tela no idioma do app; o conteúdo do curso (título, aulas, FAQ) fica como foi escrito.
>         Nome e frase das camadas saíram de `LAYER_CONFIG` (que ficou só com ícone e cor) para
>         `common.camadas`, lidos já com as edições por `useTextosComuns()` — o mesmo hook do rodapé.
>         Em Textos: aba "Toda página", seção "3 camadas". "Entrar para salvar" leva ao login no
>         idioma da tela. `CLAUDE.md`, `courses.md` e `idiomas.md` reconciliados. **Mutação:** selo
>         ignorando as edições e título escrito à mão → 2 reprovaram. Revertido.
>   - [x] **4c — aviso de erro ao salvar o curso** no admin *(24/09 — o achado da 3c, consertado a
>         pedido do operador)*. O formulário mostra, com `role="alert"`, a frase de cada recusa: slug
>         repetido, idioma travado, curso numa trilha de outro idioma e falha genérica (inclusive
>         queda de rede). O aviso some quando o próximo salvamento dá certo. Lógica em
>         `lib/course-form.ts` (`mensagemDeErroAoSalvar`). **Mutação:** todas as falhas com a mesma
>         frase → 3 reprovaram; aviso removido → 6 reprovaram. Revertido.
> - [x] **Etapa 5 — revisão do inglês** pelo operador com o Antigravity, e publicação.
>       **Publicado em 24/09** (`main` = `81a1ae5`, CI verde nos dois jobs). Prova em produção, sem
>       tocar no banco: `/api/courses?lang=es` → 400; `?lang=pt` → o curso de exemplo (PT pela
>       migration); `?lang=en` → vazio. O filtro só responde com a coluna de idioma existindo.
>       *24/09:* arquivo gerado (`design-lab/revisao-ingles.md`, só o texto novo: 98 frases de
>       `app.*` e `common.camadas`) com 11 pontos de dúvida no topo.
>       **Revisão do Antigravity aplicada (24/09):** contagem com singular nos dois idiomas
>       ("1 módulo · 1 aula", "1 module · 2 lessons"; zero segue plural) · "Prerequisites" ·
>       "Your basic account information." · "Lessons in progress show up here once…" · camadas
>       UNIVERSAL ("— apply it with…") e IA ("fix errors, and save time"). **Aplicada em parte:**
>       MODERNO — tirei a vírgula, mas mantive o segundo "that" ("…speed up your work and that few
>       people master"): sem ele a frase lê "your work and few people" como um bloco antes de
>       chegar ao verbo. Os outros 9 pontos de dúvida: manter.
>       **2ª rodada (24/09), revisão completa linha por linha pelo Antigravity, a pedido do
>       operador:** das 10 sugestões do Claude, 9 aceitas; a da camada MODERNO ganhou a versão dele
>       ("The latest features that speed up your work, mastered by few."), que mantém o formato de
>       fragmento das outras duas camadas. Nenhuma outra linha mudou. *Registro:* na 1ª tentativa
>       desta rodada o Antigravity regerou o arquivo com um prompt próprio (as 10 sugestões não
>       chegaram a ele) e editou uma frase do `en.ts`, que entrou sem ser notada no commit do menu
>       de conta — substituída agora. **Falta só publicar** (o `publica` do operador).

> **SEQUENCIAMENTO:** fecha **antes** do bloco *Superfície pública indexável*. Se as páginas
> públicas forem montadas antes, nascem só em português e são refeitas. Não depende do Bunny;
> **a posição exata dentro da Fase 3 é decisão do operador.** Risco baixo–médio (uma migration +
> os textos de todas as telas), **não** é HIGH RISK.
> **FORA deste bloco, de propósito:** os endereços `/en`, o redirecionamento pelo navegador e o
> `hreflang` (nascem com as páginas públicas no servidor, no bloco seguinte, para não serem
> construídos no React e jogados fora); curso em inglês (é produção de conteúdo, não build); preço
> em dólar (Fase 4); e-mail e páginas legais em inglês (Fase 7); ligação entre a versão PT e a EN
> do mesmo curso (entra quando existir o primeiro par).

- [ ] **Passo 0 — a pendência de produto que muda o diff** (operador): **a posição do seletor
      PT | EN** na tela, com o parceiro de design (`design-lab/GEMINI.md`). Sem ela, o bloco não
      começa.
- [ ] **Migration:** enum `Language` + `Course.language` + `LearningPlan.language`, **obrigatórios**;
      linhas existentes = português. `Module` e `Lesson` **herdam** do curso, sem coluna. Sem tabela
      nova ⇒ sem RLS nova, mas a **consulta de RLS roda mesmo assim** (`CLAUDE.md` → Database &
      Migrations). **Passo 0 da migration:** contar cursos/trilhas e provar login de admin e membro
      antes; conferir o mesmo depois.
- [ ] **`core/`:** constante `Language` + schemas Zod exigindo `language` na criação de curso e trilha.
- [ ] **Admin: campo "Idioma" no formulário de curso e de trilha** *(operador, 14/09 — como o da
      Udemy)*. Na trilha, a busca de itens só oferece conteúdo do idioma dela — **e o servidor recusa
      mesmo assim** (próximo item).
- [ ] **Servidor — idioma nas leituras e na escrita.** Leitura pública (catálogo, busca, lista e
      detalhe de trilha) **filtra por idioma do mesmo jeito que filtra por status**; escrita de trilha
      **recusa item de outro idioma**; clonar trilha **herda** o idioma. **Testes de servidor**
      (supertest): curso EN fora da listagem PT e vice-versa · busca respeita idioma · curso EN numa
      trilha PT → 4xx · clone herda. *Não é rota de acesso nem de dinheiro, mas é escrita que confere
      o registro que referencia — mesma família do "oráculo de enumeração"; por isso entra teste.*
- [ ] **Dicionário de textos — UM para servidor e React**, com a garantia de que **chave faltando no
      inglês quebra o typecheck**. **Biblioteca de i18n, se houver, é dependência nova:** entra no
      plano do bloco com o problema que resolve e o OK do operador. `react-i18next` sozinho não serve
      (não cobre os templates do servidor).
- [ ] **Migrar os textos das telas existentes** (24 arquivos com texto em português hoje, medido em
      14/09) para o dicionário, incluindo os rótulos de enum (`Level`, `Layer`) e os textos globais
      das 3 camadas. **O agente traduz para o inglês; o operador revisa antes de publicar** (texto de
      interface é dele — *DE QUEM É A DECISÃO*).
- [ ] **Seletor PT | EN** grava a escolha (cookie para visitante; `User.preferredLanguage` para quem
      está logado), e a interface lê dali até o bloco seguinte trocar o visitante para o endereço.
      Estados de loading/erro + **teste de componente**.
- [ ] **Curso publicado com ZERO aulas** *(operador, 14/09: os primeiros cursos em inglês nascem
      cadastrados e sem aulas, sem mock)*. **A página mostra "0 aulas" normalmente**, sem estado
      especial (decisão do operador). O que o bloco garante: catálogo e página de curso renderizam com
      a lista de aulas vazia **sem quebrar**. Catálogo em inglês vazio tem estado próprio (Definição de
      pronto). **Teste de componente:** curso com zero módulos renderiza e mostra "0 aulas"; catálogo
      vazio mostra o estado vazio.
- [ ] **Passo 8 — mutação:** remover o filtro de idioma da leitura pública e remover a recusa de item
      de outro idioma na trilha → a suíte de servidor **tem que reprovar** nos dois casos; reverter.
- **Done when:**
  1. Curso criado no admin com Idioma = English aparece **só** na listagem em inglês; a listagem em
     português não muda.
  2. Trilha em português **recusa** um curso em inglês **pela API**, não só pela tela.
  3. Toda tela existente renderiza nos dois idiomas, e apagar uma chave do inglês **quebra o
     typecheck**.
  4. A escolha feita no seletor sobrevive a reload, logado e deslogado.

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
      tem (title, description, canonical, OG, `hreflang`, JSON-LD) e **os dois idiomas**.
- [ ] Catálogo do aluno nasce em **`/aluno/cursos`** e **`/aluno/trilhas`** (React, dentro do
      shell). `CatalogPage.tsx` é a base — o que muda é o que ele mostra a mais.
- [ ] O rail do aluno passa a apontar para `/aluno/*`; a vitrine fica com o endereço curto.
- [ ] Testes: servidor para a vitrine (responde, indexa, filtra por idioma e status) + componente
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
servidor → acabamento. Cada uma em PT e EN.

- [ ] **Quem somos** — explica a escola (que é uma escola, que tem certificado…). Conteúdo: P30.
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
      constante): `PUBLISHED` + idioma da página + `displayOrder`. O botão de assinar das páginas
      em inglês passa a ser **derivado do banco** (≥ 1 aula publicada em inglês, pela cadeia
      inteira — `CLAUDE.md` → *Idiomas*). *A decidir na etapa:* **qual curso é o destaque** (o
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
- [ ] **Os dois idiomas na superfície pública** *(Set 2026 — depende do Bloco I; spec em
      `idiomas.md` §2, trava em `CLAUDE.md` → Idiomas)*. Caminhos em inglês **decididos** (operador, 14/09):
      `/en/courses`, `/en/course/:slug`, `/en/learning-path/:slug`, `/en/certificate/:publicId`.
      Então: cada rota pública também sob `/en`
      · redirecionamento **só na primeira visita à raiz**, pelo navegador (`pt*` fica, qualquer
      outro vai para `/en`), **nunca** em link direto nem sem `Accept-Language` · `<html lang>`,
      `og:locale` e `hreflang` recíproco quando houver par · `sitemap.xml` com os dois idiomas.
      **Teste de servidor dos quatro casos do redirecionamento** (pt-BR na raiz fica · en-US na raiz
      vai para `/en` · en-US em link direto fica · sem cabeçalho fica) e o teste de aceitação do
      `curl` abaixo repetido numa URL `/en`.
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
- [ ] **4.5 — ESLint com `no-floating-promises`, bloqueante no CI (código, pequena).** Dependências
      de desenvolvimento novas: `eslint` + `typescript-eslint`. Já decidido para esta fase (item
      abaixo): promessa sem `await` dentro do webhook derruba o servidor sem nenhum teste perceber.
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
      **o prazo é de 7 dias no Brasil e 14 fora**, pelo país do cartão (a cobrança em dólar
      chega na 4.8; até lá só existe o de 7) · **trocar de plano não recomeça o prazo**: os
      dias contam do primeiro dia da assinatura.
- [ ] **4.7 — O visitante assina: a conta nasce no pagamento (código, ALTO RISCO).** O checkout
      público: e-mail + pagamento → o webhook cria a conta (o cadastro continua fechado) e manda o
      e-mail de "crie sua senha". **Depende do Resend configurado e da P49** (o remetente). Junto:
      a origem do aluno (UTM) gravada na criação da conta. **Trazido da 4.2 (10/10/2026):** o
      `/assinar` público usa o MESMO formulário da 4.2 (plano + código + cartão), com o campo de
      e-mail · **antes de abrir ao visitante, o limite de tentativas do código promocional** (na
      4.2 só conta logada confere código, e o cadastro é fechado) · os botões Assinar da home
      passam a funcionar sem login.
      **Pedido do operador (10/10/2026, depois de testar a 4.2):** *"tem que funcionar também a
      partir do card da home para quem não é cadastrado no site"* — é esta etapa. **A ordem fica
      a do plano** (decisão dele, no mesmo dia: *"Seguir a ordem do plano"*), e o Resend e o
      remetente (P49) se resolvem **com a ajuda do agente, na hora** em que esta etapa abrir.
      **Trazido da revisão de segurança da 4.2 (10/10/2026) — pré-requisitos de abrir ao
      visitante:** (a) o limite de tentativas é **por conta e por IP** (`x-real-ip`) e cobre as
      DUAS rotas que conferem código (`/billing/previa` e `/billing/assinatura`), que também são
      as que chamam a Stripe · (b) **a trava do checkout não pode segurar conexão do banco
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
         - **Ativa, com o cancelamento marcado** → Desfazer o cancelamento.
         - **Pagamento atrasado** → Tentar cobrar de novo agora (o aluno avisou que resolveu o
           cartão) · Copiar o link para trocar o cartão (a tela é a da etapa 4.6) · Cancelar.
         - **Cancelada** → Copiar o link para reativar (o e-mail automático do sistema já
           terá saído sozinho: decisão dele de 10/10/2026, etapa 4.7).
         - **Paga e sem conta na escola** → Ligar a uma conta (etapa 4.7).

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
- [ ] **4.8 — Dólar pelo país do cartão + o botão das páginas em inglês (código + decisão).**
      *(Decisão do operador, 10/10/2026: fora do Brasil o prazo de reembolso é de 14 dias —
      `billing.md` → Reembolso. Esta etapa liga os 14 dias à cobrança em dólar. A decidir com
      ele aqui: a página em inglês promete 14 dias a todos, e quem paga com cartão do Brasil
      teria 7 pela regra do cartão.)* context7
      primeiro. **Depende da decisão de imposto internacional com o contador (P22)** antes da primeira
      venda fora do Brasil. **Trazido da 4.2 (10/10/2026):** a tela de assinar já recebe o valor e a
      moeda do servidor e já lê o cartão antes de a assinatura existir — o dólar entra no servidor,
      sem refazer a tela.
- [ ] **4.9 — Pix recorrente (código).** O mandato no Payment Element e a régua própria do Pix (falha
      de Pix não se retenta como cartão). **Trazido da 4.2 (10/10/2026):** o Pix é um item a mais na
      lista de formas de pagamento do servidor (na 4.2, só cartão), sem refazer a tela. A home já
      diz "Pagamento no cartão ou no Pix": esta etapa fecha antes do lançamento.
      **Trazido da revisão de segurança da 4.2 (10/10/2026):** com o Pix o pagamento chega minutos
      depois do pedido — conferir na área restrita que trocar de plano com um Pix pendente
      invalida o Pix antigo (hoje o checkout cancela a incompleta e só GRITA se ela tiver sido
      paga nesse instante) · se entrar forma de pagamento que saia do site e volte, tirar do
      endereço da volta o segredo que a Stripe acrescenta.
- [ ] **4.10 — Fechamento da fase (código + painel).** **O E2E de assinar abre o campo DE VERDADE
      da Stripe e paga com o cartão de teste** — na 4.2 o campo não abria e nenhum teste acusou,
      porque todos usam um dublê; o roteiro que provou está descrito no item 4.2 (passo 6). E2E de ponta a ponta (assinar, renovar, cancelar,
      pagamento falho com acesso mantido na janela) · a régua de inadimplência no painel (Smart
      Retries) · revisão de segurança da fase inteira. *(Revisto em 10/10/2026: as chaves de
      verdade entram já na etapa 4.3 — não há mais troca no lançamento.)* **A troca para as chaves de verdade fica no
      GO-LIVE (Fase 7).**

> **Os itens abaixo continuam sendo a ESPECIFICAÇÃO da fase** (as travas, os casos de teste, as
> decisões); as etapas acima dizem em que ordem e em que sessão cada um entra. **Reconciliado em
> 09/10/2026:** o *pré-requisito de separar o banco de dev do de produção* está **cumprido** desde a
> mudança para o Neon (Set 2026 — produção, dev e teste em bancos diferentes, *CLAUDE.md →
> Database & Migrations*); e o *follow-up do "Automatic RLS"* ficou **sem objeto** — era do Supabase,
> que foi apagado.

- [ ] **ESLint entra AQUI** (gatilho registrado em `CLAUDE.md` → changelog Ago 2026 (11)):
      typescript-eslint, escopo inicial `server/src`, **bloqueante no CI**, 2–3 regras. A que se
      justifica sozinha é **`no-floating-promises`** — promise não aguardada escapa do `try/catch`,
      vira *unhandled rejection* e pode derrubar o Node **dentro do handler de webhook da Stripe**;
      typecheck passa, teste passa, cai em produção. O nome `lint` está livre desde o Bloco 0.
      **Por que não antes:** trazer o ESLint agora seria limpar avisos em código que já funciona,
      com zero aluno — não passa no critério de decisão de stack. Aqui ele entra junto do código
      que a regra protege.
- [ ] **PRÉ-REQUISITO DA FASE — separar o banco de DEV do banco de PRODUÇÃO.**
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
      - [ ] **(follow-up, decisão do operador) O "Automatic RLS" está LIGADO em produção e DESLIGADO
            no teste — isso é divergência viva, não histórica.** Ela não afeta tabela nossa (toda
            migration nossa liga o RLS explicitamente), mas afeta qualquer tabela criada **fora** das
            migrations — que foi exatamente o caso da `_prisma_migrations`. Enquanto os dois projetos
            divergirem nessa chave, produção continua "se consertando sozinha" em silêncio e o teste
            não, o que é justamente o que esconde o próximo furo. Opções: desligar em produção (os
            dois passam a depender só do versionamento, que é a convenção) ou ligar no teste (os dois
            mentem juntos). **Recomendo desligar em produção**; é mudança de configuração no
            fornecedor, então é chamada do operador.
- [ ] **DECISÃO REGISTRADA — usuários semeados (admin + member de teste) são PERMANENTES e existem
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
- [ ] **Na Stripe, "quando todas as tentativas de cobrança falharem" = CANCELAR a assinatura (ou
      marcar como `unpaid`), NUNCA "deixar como vencida"** *(achado da revisão de segurança,
      29/09/2026)*. A regra do gate libera `past_due` sem olhar a data (é a janela de novas
      tentativas, decisão de Ago 2026); ela só acaba se a Stripe tirar a assinatura de `past_due`.
      Deixada como vencida, o aluno fica com acesso para sempre sem pagar, e nenhum código nosso
      percebe. Conferir no painel antes do primeiro aluno pagante.
- [ ] **Setup no dashboard (sem código):** Payments Plano Padrão (conta MEI/CNPJ, payout Banco do Brasil) + **Stripe Billing ativado**. Produto **"Assinatura"** com **2 `Price`**: Mensal R$99,90 (sem fidelidade) / Anual ~R$995 (~17% off). Sem free trial, sem conteúdo grátis. **Sem Customer Portal.** *(Versão em dólar: próximo item.)*
- [ ] **Preços em dólar, pelo país do CARTÃO** *(decisão do operador, 14/09/2026 — `billing.md`)*:
      **US$ 30/mês** + **US$ 299/ano** (confirmado pelo operador em 14/09). **context7 `/websites/stripe` primeiro:** moedas no mesmo
      `Price` ou `Price`s separados, e como saber o país do cartão **antes** de confirmar a cobrança.
      **Trava:** a moeda nunca sai do idioma nem do prefixo `/en` (`CLAUDE.md` → Membership Gating).
      **Teste de servidor:** cartão do Brasil → preço em real; cartão estrangeiro → preço em dólar
      (usar cartões de teste por país, se a Stripe oferecer — verificar).
- [ ] **Preço mostrado × cobrado:** quando o cartão levar a uma moeda diferente da que a página
      mostrou, **a tela de pagamento mostra o valor final antes da confirmação**. O desenho da tela
      é do operador.
- [ ] **DECISÃO DE IMPOSTO INTERNACIONAL — recomendado fechar ANTES da primeira venda para cartão
      estrangeiro** (`idiomas.md` §5). **Stripe Tax** + registro e declaração com o contador **×**
      **Stripe Managed Payments** (a Stripe vira a vendedora; exige a página de pagamento dela e
      reabre a decisão do Payment Element embutido — *dado novo* legítimo). Levar ao contador: conta
      MEI, faturamento já em território EPP, e **IVA europeu desde a 1ª venda, que já pega aluno de
      Portugal**. `[FATO — context7, 14/09/2026]` · aceite de empresa brasileira no Managed Payments:
      **não verificado**.
- [ ] **IDIOMA É FILTRO, NÃO PORTÃO** *(decisão do operador, 14/09/2026 — modelo LinkedIn Learning,
      `idiomas.md` §3)*: uma assinatura dá acesso aos cursos **dos dois idiomas**. `temAcessoAtivo()`
      **não lê idioma**; `Subscription` **não tem** idioma. Caso 16 da matriz abaixo prova isso.
- [ ] **Botão de assinar nas páginas em inglês só liga com ≥ 1 aula publicada em inglês**
      *(operador, 14/09)*. Condição **derivada do banco pela cadeia inteira** (aula publicada → módulo
      publicado → curso em inglês publicado), **nunca** interruptor manual. **Regra de exibição, não
      de acesso:** o checkout não recusa ninguém por ela (a assinatura não tem idioma). **Antes de
      codar, o operador fecha** a aparência do botão desligado. **Teste de servidor:** página em
      inglês sem aula em inglês → sem botão ativo; publicar uma aula → botão ativo; aula publicada
      dentro de **curso em rascunho** → continua sem botão (a cadeia).
- [ ] **Conta de receita em dólar** em `strategy.md` §6 (é doc, não código): taxa da Stripe para
      cartão estrangeiro (verificar no painel) e como o assinante em dólar entra na meta, que hoje
      está só em reais.
- [ ] **Configurar Smart Retries + automações de recuperação** conforme a política de produto abaixo. Isto é **configuração, não código**.
- [ ] **Política de dunning (decisão NOSSA, executada pela Stripe):** falha na renovação → retries automáticos → corte. **Acesso MANTIDO durante toda a janela de retry** (`past_due`) — churn involuntário é a maior alavanca (strategy.md §6). Corte no fim da janela → `unpaid`/`canceled` + `session.deleteMany`. Ajustar a janela é mudança de configuração. *Confirmar os intervalos exatos que a Stripe expõe na abertura da fase, via context7.*
- [ ] **Checkout embutido (Payment Element).** Cria `Customer` + `Subscription` na Stripe e confirma o primeiro pagamento na própria página. O dado do cartão vai direto pro Stripe (não toca nosso servidor). **`requires_action`/3DS é tratado pelo Element no fluxo de assinatura.**
- [ ] `Subscription` model = **espelho local** (o gate lê daqui) com growth seams: `ownerUserId?`, `organizationId?` (nullable), `seats` (default 1), `status`, `currentPeriodEnd`, `stripeCustomerId`, **`stripeSubscriptionId` (obrigatório — é a chave do objeto canônico)** (+ RLS); migration — **sem coluna de idioma** (idioma é filtro, não acesso — Set 2026)
- [ ] `temAcessoAtivo(userId)` lib — caminho individual (`assinaturaIndividualAtiva`); **fonte única de verdade do acesso para a aplicação**, lida do espelho local. *(A verdade canônica é a `Subscription` da Stripe; o espelho é o que o gate consulta em tempo de request.)*
- [ ] **Webhook handler** dos eventos de assinatura (`customer.subscription.created/updated/deleted`, `invoice.paid`, `invoice.payment_failed`) — **TUDO INLINE, SEM FILA** (pg-boss removido do MVP em Ago 2026; ver CLAUDE.md → Background Jobs). A ordem é: **verifica assinatura do Stripe → grava o `event.id` → atualiza o espelho local → responde 200**, tudo na mesma request (milissegundos). CRIA user+subscription no primeiro pagamento (substitui o seed). **A confiabilidade vem da Stripe:** devolvemos 5xx e ela reentrega — era isso que a fila duplicava. E-mail (Resend) sai na mesma request, dentro de `try/catch`: falha de e-mail **nunca** derruba o 200 de um evento já processado.
- [ ] **TRAVA de montagem (achado do `security-vulnerability-reviewer`, Ago 2026):** a rota do
      webhook Stripe é montada **ACIMA** de `express.json()` (`server/src/index.ts:38`) — junto do
      handler do Better Auth, que já vive lá por essa mesma razão — ou com `express.raw`. Se o body
      chegar já parseado, a verificação de assinatura (`constructEvent`) falha **em silêncio**: o
      raw body não é mais recuperável e a checagem passa a validar algo que não é o payload
      original. Hoje os routers de API são montados depois da linha 38 (`:41-50`), então o padrão
      default do repo é o errado para esta rota.
- [ ] **Idempotência + order-safety (TRAVA):** registrar `event.id` processados (repetido = no-op); eventos podem chegar fora de ordem → em qualquer dúvida, `subscriptions.retrieve` e **recomputar** o espelho, nunca confiar no snapshot do payload.
- [ ] **"Force sync" fallback.** `subscriptions.retrieve` + recomputa o espelho, caso um webhook falhe até esgotar as reentregas da Stripe — evita o pior caso de suporte: assinante pagante trancado pra fora. **TRAVA:** admin-only OU escopo de servidor seguro. NUNCA um GET não autenticado que libere acesso — seria bypass de billing.
- [ ] **Detecção de falha = monitor de erro externo, NÃO uma fila nossa.** O desenho antigo
      (alerta via fila `admin-alerts` do pg-boss) tinha um defeito de raiz: **a detecção dependia
      exatamente da coisa que deveria detectar.** Com a fila fora, o webhook que estourar cai no
      **monitor externo gerenciado** — item de pré-requisito do primeiro aluno pagante na Fase 7
      (fornecedor ainda **PENDENTE**). O force-sync continua sendo a *recuperação*; o monitor é a
      *detecção*. (Convenção no CLAUDE.md → Background Jobs.)
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
- [ ] **TESTES DE SERVIDOR (~16, supertest, sem browser) — escritos JUNTO com o handler acima, não
      depois.** Este é o item que fecha a fase; não é polish de fim de ciclo. **Justificativa
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
      **Idioma** *(Set 2026)* — (16) assinatura feita em português → curso em **inglês liberado**,
      inclusive a URL assinada de vídeo. Existe para ninguém "proteger" o acesso por idioma no futuro
      e trancar quem pagou (idioma é filtro — `CLAUDE.md` → Idiomas).
      *Requer o banco de teste (projeto `mvaobzypsiuhqzipcelw` + trava por **REF** no `globalSetup`)
      — CLAUDE.md → Database & Migrations.*
- [ ] `requireActiveMembership` middleware (wraps `temAcessoAtivo`) gating content + video URLs
- [ ] On access loss: `session.deleteMany({ userId })` to force logout
- [ ] Client: pricing page + **checkout embutido (Payment Element)** + **tela de gestão de assinatura DENTRO da escola** (trocar cartão, ver próxima cobrança, mudar mensal↔anual, cancelar) — substitui o Customer Portal, chamando a Subscriptions API. *Mostrar a proração da Stripe **previsualizada** antes de confirmar a troca de plano.*
- [ ] **Tela de offboarding antes do cancelamento (seam).** Intercepta "cancelar", coleta o motivo, depois executa `cancel_at_period_end` (não recobra; acesso segue até o fim do período pago). **TRAVA (anti roach-motel — sensibilidade Procon/CDC já levantada no pricing):** "cancelar mesmo assim" sempre visível, 1 clique; tom calmo, não retentivo. **Faseamento:** captura de motivo = **launch**; **"pausar 1 mês" (pause collection da Stripe) = fast-follow.** Não construir a pausa no launch.
- [ ] E2E: assinar → acesso liberado; renovação → período estende; cancelar → acesso revogado no fim do período; **pagamento falhado → `past_due` com acesso MANTIDO → corte no fim da janela**. *(Os três casos de webhook — duplicado, fora de ordem, assinatura inválida — saem daqui e viram **teste de servidor** no item acima: são mais baratos, mais rápidos e não precisam de browser.)*
- [ ] **E2E full-stack habilitado (6–8 testes) — DEPOIS dos testes de servidor.** **Correção de
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
        ensinando do jeito que os alunos gostam ou não"* — e **nunca é publicada**, em nenhum idioma.
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
- [ ] **O JilsonAI responde no idioma do aluno** (escola bilíngue, Set 2026 — `idiomas.md` §6):
      persona e prompt preparados para PT e EN; o contexto de curso vem do idioma do curso. O
      desenho (uma persona com instrução de idioma × duas personas) se decide na abertura da fase.
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

- [ ] `Certificate` (user, planId/courseId, issuedAt, `nameSnapshot`, `skillsCovered[]`, **`isPublic` default false**) + RLS ; migration
- [ ] Server-side PDF on 100% completion of a trilha (or course). Name = trilha name; lists skills covered.
- [ ] If `User.name` missing at issue time, prompt the student for the name to print.
- **Decisão do operador, 09/10/2026 (a P39 — o que o certificado atesta):** *"o certificado é só para
  assinante, e o cálculo para emissão só com as aulas concluídas do aluno logado"*. Emite só para
  quem tem assinatura ativa, contando as aulas que a plataforma marcou como concluídas **na conta
  dele** (vídeo aos 90%, texto ao abrir — decisão de 03/10), **sem** prova extra no servidor de que
  o vídeo chegou aos 90%. *Gatilho de reabertura (proposto pelo agente): certificado emitido para
  quem marcou aulas sem assistir, medido — aí o servidor passa a exigir a prova.*
- [ ] **Certificate in the trilha/course language** (bilingual school, Sep 2026 — `idiomas.md`): fixed PDF/page text comes from the shared dictionary; `/certificado/:publicId` gets its `/en` counterpart like every public route.
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
      — **in the student's language** (`preferredLanguage`; bilingual school, Sep 2026)
- [ ] LGPD: privacy policy, terms, consent, data export/delete path — **plus English versions of
      the legal pages** (the English side is live from launch — `idiomas.md`)
- [ ] Error/loading states everywhere; security review (subagent) on auth/billing/video
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
      **ONDE PAROU:** parte 1 PUBLICADA em 10/10/2026 (`main` = `354c96a`). Faltam: a
      confirmação no painel do Sentry com o operador (P63: o aviso de "no ar" e o e-mail) e a
      parte 2 (as telas do aluno).
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
