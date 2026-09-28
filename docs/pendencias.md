# Pendências do operador

> **O QUE É ISTO:** a lista única do que está **esperando o operador**: uma resposta, uma
> confirmação, um conteúdo ou uma tarefa no painel de algum fornecedor. Tarefa de **código** não
> entra aqui; ela é checkbox no `implementation-plan.md`.
>
> **COMO USAR (vale para qualquer chat, Claude Code ou Claude do projeto):**
> 1. **Resolva na ordem da seção A**, um item por vez: leia o item, pergunte ao operador, espere
>    a resposta dele.
> 2. **Registre a resposta no destino** que o item indica (coluna *Onde registrar*), com a data e
>    "decisão do operador".
> 3. **Apague o item desta lista no MESMO commit.** Item resolvido **sai**; não fica riscado. A
>    história fica no documento de destino e no git.
> 4. **Não resolva no lugar do operador.** Se a resposta dele contradiz um documento, reporte a
>    divergência com o trecho e pergunte (`CLAUDE.md` → *DE QUEM É A DECISÃO*).
> 5. **Item novo ganha o próximo número livre.** Número nunca se reutiliza, para que "P7" queira
>    dizer sempre a mesma coisa em qualquer conversa.
>
> **Próximo número livre: P29** · Atualizada em 27/09/2026

## A. Agora, em sequência *(nascidas da configuração do Bunny, 25/09/2026)*

| # | O que falta | Onde registrar |
|---|---|---|
| P28 | **Responder as perguntas do mapa Udemy × escola** (Q1, Q2…), **depois do último lote de prints**. Elas decidem como o formulário do curso é reorganizado em áreas | `docs/mapa-admin-curso.md` §5, e dali para o plano |

## B. Conteúdo e cadastro *(tarefas suas, sem ordem fixa)*

| # | O que falta | Onde registrar |
|---|---|---|
| P12 | Revisar as **15 perguntas da FAQ**, que já estão no admin | no próprio admin |
| P13 | Dizer, em **uma frase por seção**, o que vai dentro das seções **planejadas** do menu do admin (Alunos, Dados…) | `implementation-plan.md` → *PENDENTE DO OPERADOR — o que cada seção PLANEJADA vai ter dentro* |
| P15 | Decidir se **`/inicio`, `/conta` e `/minhas-trilhas` mudam para `/aluno/*`** (mexe em endereço já em uso; não é urgente) | `CLAUDE.md` → *DUAS SUPERFÍCIES* → *PENDÊNCIA conhecida* |
| P16 | **Cadastrar os 5 cursos da home** no admin. A etapa 1 do C4 (o campo de imagem) ficou pronta no `dev` em 27/09; **no site no ar, o campo só aceita `/img/…` depois de publicada** | `implementation-plan.md` → Bloco C4 |

## C. Com hora marcada *(resolver quando o bloco abrir, não antes)*

| # | O que falta | Quando | Onde registrar |
|---|---|---|---|
| P14 | Confirmar os **slugs em inglês** que ainda faltarem. Os endereços `/en/courses`, `/en/course/:slug`, `/en/learning-path/:slug` e `/en/certificate/:publicId` já foram decididos em 14/09 | quando as páginas públicas em inglês forem construídas *(operador, 27/09: "vamos vendo no desenvolvimento")* | `idiomas.md` §2 |
| P27 | **Avaliação por curso no cartão do admin:** a nota já planejada é **uma por aluno e geral** ("sem disputa por curso", decisão de 23/09). Para o cartão mostrar uma média por curso, a Fase 5 teria que guardar **qual curso o aluno acabou de concluir** quando deu a nota. Guardar ou deixar o cartão sem avaliação? | Fase 5, antes do pedido de depoimento | `implementation-plan.md` → Fase 5 e Bloco A |
| P5 | **Aula na TV (Chromecast):** com ou sem? Até lá fica **sem**. O controle de acesso continua (só quem recebeu o token do nosso servidor abre o player). A doc não diz se a TV toca com o CDN token e o MediaCage Basic ligados: **testar numa TV com Chromecast** | bloco de vídeo da Fase 3, com o site já tocando vídeo *(adiada pelo operador em 27/09)* | `bunny.md` §3.2 e §6 (decisão 2) |
| P17 | **Qual curso é o destaque** da home (o primeiro da ordem, ou o marcado com a etiqueta "Destaque") | etapa 3 do C4 | `implementation-plan.md` → Bloco C4 |
| P18 | O que fazer com os **2 cursos `exemplo-*`, publicados em produção**, que apareceriam na home | etapa 3 do C4 | `implementation-plan.md` → Bloco C4 |
| P19 | **Criar no painel do Bunny, uma coisa antes de cada etapa do bloco de envio** (`implementation-plan.md` → *Bloco U*): **etapa 2:** criar a `jilsonsantana-stream-apresentacao` (sem biblioteca de dev, decisão de 27/09: testa no ar), pôr no Railway `BUNNY_STREAM_INTRO_LIBRARY_ID` e `BUNNY_STREAM_INTRO_API_KEY`, mover o vídeo de teste "Apresentação" e enviar um vídeo pelo admin no ar · **etapa 3:** `jilsonsantana-stream-dev` *(ou testar no ar, como nas etapas 1 e 2 — decidir na etapa)*; **desligar o multi-audio** na `jilsonsantana-stream` (decidido em 27/09, era a P6). Depois de cada criação, as chaves vão direto do painel para o `server/.env` (dev) e o Railway (produção), com os nomes de `bunny.md` §5, **nunca pelo chat** | antes de cada etapa do Bloco U | `bunny.md` §0, §3 e §4.1 |
| P20 | **Limpar a foto da CDN quando a conta é excluída (LGPD)** — decisão 6: com a chave da conta · cache curto só na pasta de fotos · aceitar até 1 mês | bloco de envio de arquivo | `bunny.md` §4.4 e §6 |
| P22 | **Imposto de venda fora do Brasil:** Stripe Tax com o contador · Stripe Managed Payments | Fase 4, antes da primeira venda fora do Brasil | `idiomas.md` §5 e `billing.md` |
| P23 | **Transferência internacional de dados (LGPD)** para os fornecedores de fora do Brasil: pergunta para advogado | antes do lançamento | `bunny.md` §2 |
| P25 | **Qual serviço de alerta de erro** em produção (tipo Sentry) | Fase 7, antes do primeiro aluno pagante | `implementation-plan.md` → Fase 7 e `tech-stack.md` |
| P26 | Com o build da Fase 3 confirmando que o token do Bunny não carrega a identidade do aluno, **autorizar o ajuste da frase *"per-user signing"*** no `CLAUDE.md` → *Video* e no `tech-stack.md` | depois do bloco de vídeo da Fase 3 | `CLAUDE.md` e `tech-stack.md` |

## Fora desta lista, de propósito

- **O que se resolve no código**, sem resposta sua: provar que o vídeo toca no site com o CDN
  token ligado, confirmar qual chave entra no token, o comportamento do preload e o teste no
  celular com 4G. Estão em `bunny.md` §7 e entram no plano da Fase 3.
- **O que já tem gatilho de reabertura** (nome da conta do Bunny quando abrir a empresa, réplica
  em Frankfurt quando houver alunos fora do Brasil): não é pendência, é condição. Mora no
  documento da decisão.
