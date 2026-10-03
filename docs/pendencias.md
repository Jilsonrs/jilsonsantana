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
> **Próximo número livre: P38** · Atualizada em 30/09/2026

## A. Agora, em sequência *(nascidas da configuração do Bunny, 25/09/2026)*

*Vazia desde 28/09/2026 (a P28 foi respondida inteira). Item novo que precise de resposta
rápida entra aqui, com o próximo número livre.*

## B. Conteúdo e cadastro *(tarefas suas, sem ordem fixa)*

| # | O que falta | Onde registrar |
|---|---|---|
| P12 | Revisar as **15 perguntas da FAQ**, que já estão no admin | no próprio admin |
| P16 | **Cadastrar os 5 cursos da home** no admin. Tudo o que o cadastro precisa **já está no ar**: o envio da capa e do vídeo promocional, a descrição com negrito e listas, e os limites de caracteres | `implementation-plan.md` → Bloco C4 |
| P32 | **Confirmar o número de alunos corporativos (4.150+)** que está na home, no bloco do autor (os 107 mil+ e os 70 países já foram confirmados na sessão da home) | no próprio admin, em Textos → Home |
| P35 | **Revisar os textos novos de 29/09**, que são rascunho do agente, em português e em inglês. No **Início:** o "Continue estudando" EM BREVE, o vazio de Minhas trilhas, "Ver todas" e "Atalhos". No **Dashboard:** a descrição, os 4 relatórios e o "Chega com…" de cada um. No **menu:** Em andamento, Concluídos e a etiqueta EM BREVE ("COMING SOON" em inglês). Esses textos **não** aparecem em Admin → Textos (são do app) | `core/src/i18n/pt.ts` e `en.ts` (parte `app`); o Dashboard em `client/src/pages/AdminPage.tsx` |
| P36 | **Revisar as dicas embaixo dos campos do editor do curso** (você pediu para revisar depois, em 28/09). Todas num arquivo só | `client/src/lib/course-hints.ts` e o plano, Bloco E ("Em todos os passos") |
| P37 | **Colar à mão outro ID no campo do vídeo de apresentação** troca o vídeo, mas **não apaga o antigo no Bunny** (só o envio pelo botão apaga; o antigo fica lá sem curso). Apagar também, como na troca pelo botão? | `implementation-plan.md` → Bloco E e `bunny.md` §3.4 |
| P38 | **Revisar os textos novos de 03/10**, rascunho do agente. Na página da aula e na do curso: o título do quadro das camadas em inglês, **"Our method."** (o português, "Nosso método.", é o do Antigravity). Na página da aula: **"Progresso no curso"** (lido pelo leitor de tela na barra) e **"Concluída"** (no conteúdo do curso), em inglês **"Course progress"** e **"Completed"**. No cartão do curso: **"67% concluído"** ("67% complete"). Os botões de salvar: **"Salvar para depois"** e **"Salvar curso"** ("Save for later", "Save course"). A tela Salvos: o nome **"Salvos"** ("Saved"), o vazio **"Nada salvo ainda. Salve aulas e cursos para assistir depois."** e o erro. No editor do curso: o **nome em português de cada ícone** dos Destaques (55 nomes, em `client/src/components/admin/nomes-dos-icones.ts`). Esses textos **não** aparecem em Admin → Textos | `core/src/i18n/pt.ts` e `en.ts` (parte `app.curso.metodo`, `app.aula.progressoNoCurso`, `app.aula.concluida`, `app.aula.salvarParaDepois`, `app.aula.salvarCurso`, `app.curso.concluido`, `app.nav.salvos` e `app.salvos`); `nomes-dos-icones.ts` |

## C. Com hora marcada *(resolver quando o bloco abrir, não antes)*

| # | O que falta | Quando | Onde registrar |
|---|---|---|---|
| P14 | Confirmar os **slugs em inglês** que ainda faltarem. Os endereços `/en/courses`, `/en/course/:slug`, `/en/learning-path/:slug` e `/en/certificate/:publicId` já foram decididos em 14/09 | quando as páginas públicas em inglês forem construídas *(operador, 27/09: "vamos vendo no desenvolvimento")* | `idiomas.md` §2 |
| P27 | **Avaliação por curso no cartão do admin:** a nota já planejada é **uma por aluno e geral** ("sem disputa por curso", decisão de 23/09). Para o cartão mostrar uma média por curso, a Fase 5 teria que guardar **qual curso o aluno acabou de concluir** quando deu a nota. Guardar ou deixar o cartão sem avaliação? | Fase 5, antes do pedido de depoimento | `implementation-plan.md` → Fase 5 e Bloco A |
| P5 | **Aula na TV (Chromecast):** com ou sem? Até lá fica **sem**. O controle de acesso continua (só quem recebeu o token do nosso servidor abre o player). A doc não diz se a TV toca com o CDN token e o MediaCage Basic ligados: **testar numa TV com Chromecast** | bloco de vídeo da Fase 3, com o site já tocando vídeo *(adiada pelo operador em 27/09)* | `bunny.md` §3.2 e §6 (decisão 2) |
| P17 | **Qual curso é o destaque** da home (o primeiro da ordem, ou o marcado com a etiqueta "Destaque") | etapa 3 do C4 | `implementation-plan.md` → Bloco C4 |
| P20 | **Limpar a foto da CDN quando a conta é excluída (LGPD)** — decisão 6: com a chave da conta · cache curto só na pasta de fotos · aceitar até 1 mês | bloco de envio de arquivo | `bunny.md` §4.4 e §6 |
| P22 | **Imposto de venda fora do Brasil:** Stripe Tax com o contador · Stripe Managed Payments | Fase 4, antes da primeira venda fora do Brasil | `idiomas.md` §5 e `billing.md` |
| P23 | **Transferência internacional de dados (LGPD)** para os fornecedores de fora do Brasil: pergunta para advogado | antes do lançamento | `bunny.md` §2 |
| P25 | **Qual serviço de alerta de erro** em produção (tipo Sentry) | Fase 7, antes do primeiro aluno pagante | `implementation-plan.md` → Fase 7 e `tech-stack.md` |
| P26 | Com o build da Fase 3 confirmando que o token do Bunny não carrega a identidade do aluno, **autorizar o ajuste da frase *"per-user signing"*** no `CLAUDE.md` → *Video* e no `tech-stack.md` | depois do bloco de vídeo da Fase 3 | `CLAUDE.md` e `tech-stack.md` |
| P29 | **Página para baixar material:** como ela funciona (você ia ver como outras escolas fazem) e **se o aluno segue a mesma regra de e-mail** — o inscrito da página recebe novidades até se descadastrar, mas o `marketingConsent` do aluno hoje começa **desligado** | quando a página for construída | `implementation-plan.md` → *Páginas públicas que faltam* |
| P30 | **Quem somos e Contato:** o conteúdo das duas páginas e **onde ficam os dados da empresa** (rodapé ou Contato) | quando as páginas forem construídas | `implementation-plan.md` → *Páginas públicas que faltam* |
| P31 | **Mostrar curso "em breve"** (ainda não publicado) na vitrine? Hoje só aparece curso publicado, e mostrar "em breve" seria regra nova | quando a vitrine de cursos for desenhada (C5) | `implementation-plan.md` → Bloco C5 |
| P39 | **O que o certificado atesta:** a aula conta como concluída sozinha (vídeo a 90%, texto ao abrir — decisão de 03/10), e quem decide isso é a **tela**. Alguém que chame o site por fora consegue marcar como concluídas as aulas a que tem acesso sem assistir. Para o progresso não faz diferença; para o **certificado público** (Fase 6.5), sim. Aceitar e o certificado atestar "concluiu o curso na plataforma", ou exigir no servidor a prova de que o vídeo chegou aos 90%? *(achado P2 da revisão de segurança, 03/10)* | antes da Fase 6.5 (certificado) | `implementation-plan.md` → Fase 5 e Fase 6.5 |

## Fora desta lista, de propósito

- **O que se resolve no código**, sem resposta sua: provar que o vídeo toca no site com o CDN
  token ligado, confirmar qual chave entra no token, o comportamento do preload e o teste no
  celular com 4G. Estão em `bunny.md` §7 e entram no plano da Fase 3.
- **O que já tem gatilho de reabertura** (nome da conta do Bunny quando abrir a empresa, réplica
  em Frankfurt quando houver alunos fora do Brasil): não é pendência, é condição. Mora no
  documento da decisão.
