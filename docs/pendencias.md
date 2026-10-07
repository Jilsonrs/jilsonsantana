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
> **Próximo número livre: P54** · Atualizada em 07/10/2026

## A. Agora, em sequência *(nascidas da configuração do Bunny, 25/09/2026)*

| # | O que falta | Onde registrar |
|---|---|---|
| **P53** | **Trocar o script da legenda lembrada no painel do Bunny** (07/10/2026) — pode ser antes ou depois de publicar o site com o player novo: no player antigo o script novo não faz nada. Stream → `jilsonsantana-stream` → **Player** → **Custom HTML head** → apagar o script anterior → colar o bloco do `bunny.md` (seção *A legenda lembrada*) → **Save Settings**. Depois, testar a página da aula no Chrome do computador e no iPhone (o roteiro da etapa 5 do Bloco AULA, mais a legenda). | `bunny.md`, seção *A legenda lembrada*: "colado pelo operador em <data>" |

*A P51 e a P52 foram resolvidas em 07/10/2026 — registro em `bunny.md`.*

## B. Conteúdo e cadastro *(tarefas suas, sem ordem fixa)*

| # | O que falta | Onde registrar |
|---|---|---|
| P45 | **Revisar os textos novos de 06/10**, rascunho do agente: "Notificação não encontrada." / "Notification not found." (mensagem aberta que não está mais na lista) e "Notifications" (o item do menu em inglês) | `core/src/i18n/pt.ts` e `en.ts` |
| P47 | **O e-mail educacional também aparece no sino?** (a Udemy põe nos dois). Recomendação do agente: sim | `implementation-plan.md` → 4d, antes do C4 |
| P48 | **Limite de envios por mês?** (a Udemy: 4 educacionais e 2 promocionais). Recomendação do agente: sem limite no sistema | `implementation-plan.md` → 4d, antes do C4 |
| P49 | **O remetente dos e-mails:** nome e endereço (ex.: "Jilson Santana <jilson@jilsonsantana.com>") e o e-mail que recebe as respostas | `implementation-plan.md` → 4d, antes do C2 |
| P50 | **Revisar os textos novos do admin em Comunicação (06/10)**, rascunho do agente: "Nova notificação", "Todo mundo com conta", "Os alunos de um curso (quem já começou)", "Já enviada: o 'para quem' não muda.", "Vai para N pessoas.", "Confirmar envio", "x de y leram", "Nenhuma notificação ainda. Escreva a primeira em Nova notificação.", "Editar no curso", "sem mensagem (nada é enviado)" | nas próprias telas (`client/src/pages/admin/comunicacao/`, `components/admin/comunicacao/`) |
| P12 | Revisar as **15 perguntas da FAQ**, que já estão no admin | no próprio admin |
| P16 | **Cadastrar os 5 cursos da home** no admin. Tudo o que o cadastro precisa **já está no ar**: o envio da capa e do vídeo promocional, a descrição com negrito e listas, e os limites de caracteres | `implementation-plan.md` → Bloco C4 |
| P32 | **Confirmar o número de alunos corporativos (4.150+)** que está na home, no bloco do autor (os 107 mil+ e os 70 países já foram confirmados na sessão da home) | no próprio admin, em Textos → Home |
| P35 | **Revisar os textos novos de 29/09**, que são rascunho do agente, em português e em inglês. No **Início:** o "Continue estudando" EM BREVE, o vazio de Minhas trilhas, "Ver todas" e "Atalhos". No **Dashboard:** a descrição, os 4 relatórios e o "Chega com…" de cada um. No **menu:** Em andamento, Concluídos e a etiqueta EM BREVE ("COMING SOON" em inglês). Esses textos **não** aparecem em Admin → Textos (são do app) | `core/src/i18n/pt.ts` e `en.ts` (parte `app`); o Dashboard em `client/src/pages/AdminPage.tsx` |
| P36 | **Revisar as dicas embaixo dos campos do editor do curso** (você pediu para revisar depois, em 28/09). Todas num arquivo só | `client/src/lib/course-hints.ts` e o plano, Bloco E ("Em todos os passos") |
| P37 | **Colar à mão outro ID no campo do vídeo de apresentação** troca o vídeo, mas **não apaga o antigo no Bunny** (só o envio pelo botão apaga; o antigo fica lá sem curso). Apagar também, como na troca pelo botão? | `implementation-plan.md` → Bloco E e `bunny.md` §3.4 |
| P38 | **Revisar os textos novos de 03/10**, rascunho do agente. Na página da aula e na do curso: o título do quadro das camadas em inglês, **"Our method."** (o português, "Nosso método.", é o do Antigravity). Na página da aula: **"Progresso no curso"** (lido pelo leitor de tela na barra) e **"Concluída"** (no conteúdo do curso), em inglês **"Course progress"** e **"Completed"**. No cartão do curso: **"67% concluído"** ("67% complete"). Os botões de salvar: **"Salvar para depois"** e **"Salvar curso"** ("Save for later", "Save course"). A tela Salvos: o nome **"Salvos"** ("Saved"), o vazio **"Nada salvo ainda. Salve aulas e cursos para assistir depois."** e o erro. O quadro "Este curso inclui" (Admin → Textos, "Toda página"): "Este curso inclui:", "Arquivos para acompanhar as aulas", "Biblioteca de prompts", "Apostila" — e o inglês de cada um. No editor do curso (admin, só português): **"Suas alterações foram salvas."**, **"Confira os campos marcados antes de salvar."** e **"Curso criado."**. Na tela Legendas: os estados de cada linha ("Legenda enviada", "Sem legenda", "Envie a legenda de novo", "Envie o vídeo primeiro"), "Todas as aulas publicadas têm legenda." e as mensagens de erro do envio; e o aviso "Legenda enviada. O player pode mostrar a anterior por algumas horas." (e "Legenda excluída. …"). No editor do curso: o **nome em português de cada ícone** dos Destaques — desde 05/10 são **todos os do Lucide (1.490 nomes)**, os 55 de 03/10 mais os que o agente escreveu, com sinônimos para a busca, em `client/src/components/admin/nomes-dos-icones.ts`; não precisa ler um por um: corrija o que estranhar ao usar. E os textos do **seletor com busca** (05/10): "Buscar (ex.: caixa, construção)", "Sugeridos. Digite para buscar entre os 1.485 ícones.", "Mostrando 60 de {n}. Continue digitando para filtrar." e "Nenhum ícone encontrado para “{busca}”.". No passo **Mensagens** (04/10): os rótulos "Mensagem de boas-vindas" e "Mensagem de parabéns" e as dicas ("Chega quando o aluno abre a primeira aula do curso. Em branco, nenhuma mensagem é enviada." e "Chega quando o aluno conclui todas as aulas publicadas. …"). O **sino de Notificações** (04/10, PT e EN): "Notificações" / "Notifications", "Notificações, 1 não lida" e "…, {n} não lidas" (o nome do botão), "Marcar todas como lidas" ("Mark all as read"), "Ver todas" ("See all"), "Nenhuma notificação por enquanto." ("No notifications yet."), o erro, "Boas-vindas ao curso {curso}" ("Welcome to {curso}"), "Parabéns! Você concluiu {curso}" ("Congratulations! You completed {curso}"), "Ir para o curso" ("Go to the course") e "Não lida" ("Unread"). No quadro "Este curso inclui" (05/10, Admin → Textos, "Toda página"): "de vídeo", "artigo"/"artigos", "aula grátis para experimentar"/"aulas grátis para experimentar", "Legendas em português" e "Legendas em inglês" — e o inglês de cada um. O quadro "Este curso inclui" (05/10, Admin → Textos): "Certificado de conclusão" ("Certificate of completion"). A tela de erro no lugar da página em branco: "Algo deu errado ao abrir esta tela." e "Recarregar a página" ("Something went wrong opening this screen.", "Reload the page"). A aula de texto vazia: "Esta aula ainda não tem texto." ("This lesson has no text yet."). No topo do editor do curso (04/10, admin): o erro da pré-visualização "Não foi possível abrir a pré-visualização deste curso.". Esses textos **não** aparecem em Admin → Textos | `core/src/i18n/pt.ts` e `en.ts` (parte `app.notificacoes`, `app.curso.metodo`, `app.aula.progressoNoCurso`, `app.aula.concluida`, `app.aula.salvarParaDepois`, `app.aula.salvarCurso`, `app.curso.concluido`, `app.nav.salvos` e `app.salvos`); `nomes-dos-icones.ts` |

## C. Com hora marcada *(resolver quando o bloco abrir, não antes)*

| # | O que falta | Quando | Onde registrar |
|---|---|---|---|
| P14 | Confirmar os **slugs em inglês** que ainda faltarem. Os endereços `/en/courses`, `/en/course/:slug`, `/en/learning-path/:slug` e `/en/certificate/:publicId` já foram decididos em 14/09 | quando as páginas públicas em inglês forem construídas *(operador, 27/09: "vamos vendo no desenvolvimento")* | `idiomas.md` §2 |
| P27 | **Avaliação por curso no cartão do admin:** a nota já planejada é **uma por aluno e geral** ("sem disputa por curso", decisão de 23/09). Para o cartão mostrar uma média por curso, a Fase 5 teria que guardar **qual curso o aluno acabou de concluir** quando deu a nota. Guardar ou deixar o cartão sem avaliação? | Fase 5, antes do pedido de depoimento | `implementation-plan.md` → Fase 5 e Bloco A |
| P5 | **Aula na TV (Chromecast):** com ou sem? Até lá fica **sem**. O controle de acesso continua (só quem recebeu o token do nosso servidor abre o player). A doc não diz se a TV toca com o CDN token e o MediaCage Basic ligados: **testar numa TV com Chromecast** | bloco de vídeo da Fase 3, com o site já tocando vídeo *(adiada pelo operador em 27/09)* | `bunny.md` §3.2 e §6 (decisão 2) |
| P17 | **Qual curso é o destaque** da home (o primeiro da ordem, ou o marcado com a etiqueta "Destaque") | etapa 3 do C4 | `implementation-plan.md` → Bloco C4 |
| P20 | **Limpar a foto da CDN quando a conta é excluída (LGPD)** — decisão 6: com a chave da conta · cache curto só na pasta de fotos · aceitar até 1 mês | bloco de envio de arquivo *(04/10: a chave da conta passou a existir no servidor, para a legenda; a escolha das fotos continua sua)* | `bunny.md` §4.4 e §6 |
| P22 | **Imposto de venda fora do Brasil:** Stripe Tax com o contador · Stripe Managed Payments | Fase 4, antes da primeira venda fora do Brasil | `idiomas.md` §5 e `billing.md` |
| P23 | **Transferência internacional de dados (LGPD)** para os fornecedores de fora do Brasil: pergunta para advogado | antes do lançamento | `bunny.md` §2 |
| P25 | **Qual serviço de alerta de erro** em produção (tipo Sentry) | Fase 7, antes do primeiro aluno pagante | `implementation-plan.md` → Fase 7 e `tech-stack.md` |
| P26 | Com o build da Fase 3 confirmando que o token do Bunny não carrega a identidade do aluno, **autorizar o ajuste da frase *"per-user signing"*** no `CLAUDE.md` → *Video* e no `tech-stack.md` | depois do bloco de vídeo da Fase 3 | `CLAUDE.md` e `tech-stack.md` |
| P29 | **Página para baixar material:** como ela funciona (você ia ver como outras escolas fazem) e **se o aluno segue a mesma regra de e-mail** — o inscrito da página recebe novidades até se descadastrar, mas o `marketingConsent` do aluno hoje começa **desligado** | quando a página for construída | `implementation-plan.md` → *Páginas públicas que faltam* |
| P30 | **Quem somos e Contato:** o conteúdo das duas páginas e **onde ficam os dados da empresa** (rodapé ou Contato) | quando as páginas forem construídas | `implementation-plan.md` → *Páginas públicas que faltam* |
| P31 | **Mostrar curso "em breve"** (ainda não publicado) na vitrine? Hoje só aparece curso publicado, e mostrar "em breve" seria regra nova | quando a vitrine de cursos for desenhada (C5) | `implementation-plan.md` → Bloco C5 |
| P39 | **O que o certificado atesta:** a aula conta como concluída sozinha (vídeo a 90%, texto ao abrir — decisão de 03/10), e quem decide isso é a **tela**. Alguém que chame o site por fora consegue marcar como concluídas as aulas a que tem acesso sem assistir. Para o progresso não faz diferença; para o **certificado público** (Fase 6.5), sim. Aceitar e o certificado atestar "concluiu o curso na plataforma", ou exigir no servidor a prova de que o vídeo chegou aos 90%? *(achado P2 da revisão de segurança, 03/10)* | antes da Fase 6.5 (certificado) | `implementation-plan.md` → Fase 5 e Fase 6.5 |
| P43 | **O Visualizar conta como você abrindo a aula:** aula de texto aberta fica concluída para você, e a boas-vindas do curso chega no seu sino. O aluno não é afetado. **Fica assim, ou a prévia não deve contar nada?** | `docs/implementation-plan.md` (Bloco E, Visualizar como aluno) |

## Fora desta lista, de propósito

- **O que se resolve no código**, sem resposta sua: provar que o vídeo toca no site com o CDN
  token ligado, confirmar qual chave entra no token, o comportamento do preload e o teste no
  celular com 4G. Estão em `bunny.md` §7 e entram no plano da Fase 3.
- **O que já tem gatilho de reabertura** (nome da conta do Bunny quando abrir a empresa, réplica
  em Frankfurt quando houver alunos fora do Brasil): não é pendência, é condição. Mora no
  documento da decisão.
