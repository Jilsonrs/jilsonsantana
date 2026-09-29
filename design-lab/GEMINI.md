# GEMINI.md — instruções para o parceiro de design

> Você é o **diretor de arte** deste projeto (escola online do Jilson Santana, bilíngue — PT/BR e EN). O Claude Code é a engenharia. Este arquivo diz **onde você mexe, no que precisa ficar
> atento, e como confere que não quebrou nada.**
>
> **Este é o único arquivo desta pasta que vai para o repositório.** Os mocks (`.html`, imagens)
> são exploração local e ficam fora do git de propósito — o que for aprovado é incorporado ao
> `docs/design.md`, que é a lei visual.

---

## 0. DUAS SUPERFÍCIES — leia antes de tudo *(decisão do operador, set/2026)*

O produto tem **duas famílias de tela, e elas não são a mesma coisa com roupa diferente**:

| | **PÁGINA PÚBLICA** | **PÁGINA DE SISTEMA** |
|---|---|---|
| Quem vê | visitante e **Google** | aluno **logado** |
| Para quê | vender, ser encontrada | estudar, acompanhar progresso |
| Tem a barra escura? | **não** | **sim** |
| Como é desenhada | HTML montado no **servidor**, sem React | **React** |
| Onde mora | `server/src/views/**` + `client/src/public-input.css` | `client/src/pages/**` |

**Você trabalha nas DUAS** — muda o caminho até o seu trabalho:

- **Pública:** o operador e o Claude definem o conteúdo → **você faz o mock** na `design-lab/` →
  **o Claude transpõe** para o template de servidor → **você formata o template**. A home (`/`)
  já passou por esse caminho inteiro; é o modelo.
- **De sistema:** o Claude constrói em React com testes → **você formata o `.tsx`** direto.

**Por que a separação existe:** o Google não executa o app do aluno, e o aluno não precisa de
página de venda. Uma tela só faria os dois mal.

---

## 1. O fluxo combinado

1. O operador e o Claude definem **o que vai ter** na tela.
2. Você gera o **mock** em HTML/CSS aqui na `design-lab/`.
3. O Claude **constrói**: template de servidor se a página for pública, React + Tailwind se for de
   sistema (§0). Nos dois casos, com testes.
4. **Você formata o resultado direto no código** — é este passo que faz o acabamento chegar
   inteiro, em vez de se perder na tradução do mock.

**O passo 3 não é uma reinterpretação do seu mock, é uma TRANSPOSIÇÃO:** mesma marcação, mesmas
classes, só os dados entrando. A primeira tentativa na home foi reescrita com classes inventadas e
metade da página ficou sem estilo — e nem o typecheck nem os testes viram, porque nenhum dos dois
olha CSS. Se você receber um template que não parece o seu mock, **avise**.

Você tem liberdade total dentro da `design-lab/`. No código do app, valem as regras abaixo.

---

## 2. Onde você mexe

Caminhos a partir da raiz do projeto. A tabela abaixo é o **básico compartilhado** — o que muda o
produto inteiro. **Cada tela em si está no MAPA DAS TELAS**, mais abaixo nesta seção: lá estão o
endereço, o arquivo e o que vale (ou não vale) acabamento.

| Arquivo | O que é |
|---|---|
| `client/src/index.css` | **Os tokens** — cores, raio. Mexer aqui muda o produto inteiro de uma vez. |
| `client/tailwind.config.ts` | Fontes, cores expostas como classe, animações |
| `client/src/components/nav/AppRail.tsx` | Nível 1 — o rail escuro |
| `client/src/components/nav/MobileNav.tsx` | A gaveta do celular |
| `client/src/components/Layout.tsx` | O shell e o cabeçalho público |
| `client/src/pages/StudentHomePage.tsx` | A página de início |
| `client/src/components/ui/button.tsx` | Botão base — usado em todas as telas |
| `client/src/components/ui/card.tsx` | Card base |
| `client/src/components/ui/input.tsx` | Campo base (o estado de erro é dirigido por `aria-invalid`) |
| `client/src/components/layout/PageLayout.tsx` | **O layout padrão de toda tela do app e do admin**: `PageContainer`, `PageHeader`, `PageSection`. Tela nova do app nasce com ele: o Claude monta a estrutura e você faz o acabamento. |
| `.agents/rules/page_layout.md` | A sua regra desse layout, com exemplo. É versionada: se mudar o padrão, atualize aqui junto. |
| `client/src/fonts.css` | As quatro famílias, hospedadas localmente |

### A parte PÚBLICA saiu do React *(set/2026 — leia antes de abrir a home)*

A home (`/` e `/en`) **não é mais React**. É HTML montado no servidor, sem hidratação, porque
página de marketing é buscar do banco e desenhar — e assim ela carrega sem bundle de JS. O que
isso muda para você:

| Arquivo | O que é |
|---|---|
| `server/src/views/home.ts` | **A marcação da home pública.** É o seu mock transposto: mesma estrutura, mesmas classes. Você formata aqui. |
| `client/src/public-input.css` | **O CSS da home pública** — o do mock, depois das diretivas do Tailwind. Você mexe aqui. |
| `client/tailwind.public.config.ts` | O Tailwind **da vitrine**, separado do app. Herda tema, fontes e cores do config base; muda só o que ele varre. |
| `client/public/css/public.css` | **Saída compilada. Nunca edite à mão** — é gerada pelo comando da §5. |

**São DOIS Tailwind, e a separação tem motivo** *(set/2026)*: o config do app varre
`client/src/**`, e compilar a vitrine com ele fazia a página pública carregar as classes de **toda
tela do React** — 50 KB viraram 68 KB só com uma tela nova de admin, e cresceria a cada tela.
Justamente na página que existe para carregar leve, sem bundle de JS. O config da vitrine varre
**só `server/src/views/**`**, e o CSS voltou para 38 KB.

**O que isso muda para você, na prática:** classe utilitária do Tailwind que você escrever **no
template do servidor** gera CSS normalmente. O que NÃO vale é contar com uma classe só porque ela
existe em alguma tela do React — a vitrine não a enxerga mais. Se precisar, escreva a regra no
`public-input.css`, que é onde o CSS do mock já mora.

### O MAPA DAS TELAS — o que existe, onde abrir, qual arquivo *(set/2026)*

Toda tela do produto, para você não precisar procurar. **Abrir:** o operador sobe os dois
servidores (§5); o React responde em `localhost:5173`, a home pública em `localhost:3000`.

**Públicas — HTML de servidor, SEM React** *(porta 3000)*

| Endereço | Arquivo |
|---|---|
| `/` · `/en` | `server/src/views/home.ts` + `client/src/public-input.css` |

**Públicas — hoje em React, mas PROVISÓRIAS** *(porta 5173)*

| Endereço | Arquivo | Atenção |
|---|---|---|
| `/cursos` | `client/src/pages/CatalogPage.tsx` (`tipo="cursos"`) | ⛔ será substituída |
| `/trilhas` | o MESMO arquivo (`tipo="trilhas"`) | ⛔ idem |
| `/curso/:slug` | `client/src/pages/CourseDetailPage.tsx` | ⛔ idem |
| `/trilha/:slug` | `client/src/pages/TrilhaDetailPage.tsx` | ⛔ idem |
| `/login` | `client/src/pages/LoginPage.tsx` | fica no React |

> **⛔ NÃO invista acabamento nessas quatro.** Elas vão ser **substituídas** por templates de
> servidor, como a home já é (decisão do operador, set/2026: *"eu quero que seja a versão final que
> vamos utilizar"* — sem construir duas vezes). Quando a substituta existir, **você trabalha nela**;
> o que você fizer no `.tsx` de hoje é jogado fora junto com o arquivo. Tokens e CSS sobrevivem,
> marcação não.


**Do aluno — exigem login** *(porta 5173)*

> **Os endereços mudaram em 29/09** *(decisão do operador, 28/09/2026)*: as telas do aluno moram
> em `/aluno/*`, e os endereços antigos (`/inicio`, `/conta`, `/minhas-trilhas`) redirecionam. Os
> **arquivos** continuam os mesmos.

| Endereço | Arquivo |
|---|---|
| `/aluno/inicio` | **O painel do aluno** (29/09): `client/src/pages/StudentHomePage.tsx` + os blocos em `client/src/components/inicio/` (ver a fila, item 14) |
| `/aluno/minhas-trilhas` | `client/src/pages/MyTrilhasPage.tsx` |
| `/aluno/minhas-trilhas/:id` | `client/src/pages/MyTrilhaDetailPage.tsx` |
| `/aluno/conta` | `client/src/pages/AccountPage.tsx` |
| `/aluno/meus-estudos` | **Meus estudos** (29/09): `client/src/pages/aluno/MeusEstudosPage.tsx` — um cartão por item do nível 2 (Em andamento, Minhas trilhas, Concluídos, Certificados). Só Minhas trilhas tem conteúdo (quantas estão salvas + o link); os outros três saem com EM BREVE, **sem link** (tem teste). No celular é por esta tela que o aluno chega a Minhas trilhas. |
| `/aluno/aula/:id` | **A página da aula** (29/09, estilo LinkedIn Learning): `client/src/pages/aluno/LessonPage.tsx` + `client/src/components/aula/` — `CourseContentsNav.tsx` (o conteúdo do curso, que é o **nível 2** no computador e fica embaixo do player no celular e para o visitante), `LessonContent.tsx` (o player grande, o texto no centro ou "para assinantes"), `LessonResources.tsx` (os arquivos para baixar e o "Recursos" de cada aula) e `AiDock.tsx` (o **botão flutuante** da IA no canto inferior direito e o painel "Em breve", que encolhe o player). **Não exige login** (a prévia grátis toca para visitante). **Têm teste:** a aula atual com `aria-current`, o "para assinantes" sem player, o rascunho marcado só para o admin, e o botão da IA com `aria-expanded` e nome. O editor ganhou **Visualizar** em cada aula, que abre esta página numa aba nova. **Embaixo do player, em toda aula, "Sobre o curso"** (`components/aula/CourseDetails.tsx`, 29/09): nível, descrição, listas, camadas, destaques e perguntas; bloco vazio não aparece (tem teste). |
| `/aluno/curso/:slug` | A entrada do aluno num curso (29/09): `client/src/pages/aluno/CourseEntryPage.tsx` só leva à primeira aula (sem tela própria, além de "carregando" e "sem aulas"). O cartão do curso no catálogo leva aqui quando a pessoa está logada. |

**Do admin — exigem login como admin** *(porta 5173)*

| Endereço | Arquivo |
|---|---|
| `/admin` | **O Início do admin** (29/09): `client/src/pages/AdminPage.tsx` — os 4 relatórios (Assinantes, Aprendizado, De onde vieram os alunos, Uso do JilsonAI), todos EM BREVE, e os atalhos embaixo (Trilhas EM BREVE, sem link). Cada cartão é um grupo com nome (`role="group"`) e **tem teste**: EM BREVE nunca é link. |
| `/admin/cursos` | `client/src/pages/admin/AdminCoursesPage.tsx` + **o cartão de cada curso**, `client/src/components/admin/AdminCourseCard.tsx` (27/09) |
| `/admin/cursos/novo` | `client/src/pages/admin/course-editor/NewCoursePage.tsx` — só o passo 1; "Criar curso" abre o editor |
| `/admin/cursos/:id/basico` · `/para-quem-e` · `/conteudo` · `/pagina` · `/publicar` | **O editor do curso em 7 passos** (28/09): `course-editor/CourseEditorLayout.tsx` (o topo, comum a todos), `course-editor/steps.tsx` (o que cada passo mostra) e `course-editor/StepForm.tsx` (o botão Salvar de cada passo). O conteúdo de cada passo são as seções de `client/src/components/admin/course-form/`. |
| `/admin/site` → leva a `/admin/site/textos` | (só redireciona) |
| `/admin/site/textos` | `client/src/pages/admin/AdminSiteTextPage.tsx` + `client/src/components/admin/SiteTextField.tsx` — **uma aba por página** ("Toda página", "Home"; página nova ganha aba sozinha). Com busca, as abas somem e o resultado vem de todas as páginas. As abas têm `aria-pressed` e teste. |
| `/admin/site/depoimentos` | `client/src/pages/admin/AdminTestimonialsPage.tsx` |
| `/admin/site/faq` | `client/src/pages/admin/AdminFaqPage.tsx` |

> **O editor do curso em 7 passos** *(Bloco E, etapa 1, 28/09/2026)*: os passos ficam no **nível
> 2** (a coluna do meio). Legendas e Mensagens aparecem como **EM BREVE**, e cada passo completo
> ganha um **✓**, os dois desenhados em `client/src/components/nav/SecondaryNavItem.tsx`. **Formate
> as seções à vontade.** A antiga seção "Organização" se dividiu:
> - idioma e nível foram para `CourseLanguageLevelFields.tsx`, dentro de Informações básicas;
> - as camadas foram para `CourseLayersSection.tsx`, no passo Mídia e destaques (era "Página do curso");
> - status e ordem foram para `CoursePublishSection.tsx`, no passo Publicar.
>
> **O passo Publicar** (28/09) também mostra a barra de Preenchimento, a mesma do cartão da lista:
> ela mora em `client/src/components/admin/CompletenessBar.tsx`, e formatar ali muda os dois
> lugares. O link com o botão de copiar fica em `course-form/CourseLinkField.tsx`. O aviso "Link
> copiado." sai numa região `role="status"`: **mantenha a região sempre na página, mesmo vazia**,
> porque é assim que o leitor de tela anuncia a mudança.
>
> **As três listas do passo "Para quem é"** (28/09) têm um campo por item, com contador, setas e
> lixeira, em `course-form/ListItemsField.tsx`. As setas e a lixeira são só ícone: o nome delas
> ("Subir o item 2") está no `aria-label`, que **tem teste**. Não o tire.
>
> **O passo Conteúdo** (28/09) mora em `client/src/components/admin/course-content/`
> (`ModuleLessonTree.tsx`, `ModuleCard.tsx`, `LessonRow.tsx`). As setas e lixeiras são só ícone:
> o nome delas ("Descer a aula Fórmulas") está no `aria-label`, que **tem teste**.
> **O "+" entre dois itens** (`InsertPoint.tsx`) fica escondido por **opacidade** até o mouse ou
> o foco do teclado chegar: **não troque por `hidden`**, senão o teclado não o alcança (tem
> teste). O texto da aula de texto usa o mesmo `MarkdownField` da descrição.
> **Como na Udemy** (operador, 28/09): a linha do módulo e a da aula mostram só o texto; o
> **lápis** abre a edição com Cancelar e Salvar. **Não volte a deixar os campos abertos na linha**
> (tem teste: nenhum "Salvar" na tela fora da edição). "+ Aula" e "+ Módulo" ficam no fim de cada
> lista, e o "+" entre itens fica no começo da linha.
> **Cada aula abre e recolhe como na Udemy** (operador, 28/09): a seta no fim da linha
> (`aria-expanded`, "Abrir a aula …"/"Recolher a aula …") mostra o conteúdo — na aula de vídeo, a
> miniatura, o nome do arquivo e a duração (`LessonVideoSummary.tsx`), o envio e a Prévia grátis;
> na de texto, o texto — e, embaixo, os Arquivos (`LessonFilesPanel.tsx`). **O editor NÃO tem
> player** (decisão dele: assistir é na página da aula do aluno): não coloque iframe aqui (tem
> teste). **Quem começa aberta** (29/09, `aulas-abertas.tsx`): a aula de vídeo sem vídeo ou
> ainda processando; a aula criada pelo "+" já nasce aberta; o que está aberto continua aberto
> enquanto ele fica na tela. Tudo isso tem teste.
> **Arrastar** (`arrastar.tsx`): a alça com os pontinhos é um **botão** com nome ("Arrastar a
> aula Fórmulas"), e as instruções de teclado saem em português. Os dois têm teste.
>
> **As dicas embaixo dos campos** (28/09) saem do `Field.tsx` (a propriedade `dica`); o texto de
> todas mora em `client/src/lib/course-hints.ts` e é do operador. Cada campo aponta para a dica e
> para o contador no `aria-describedby`: **não tire o `id` da dica**, é por ele que o leitor de
> tela a lê (tem teste).
>
> **Não mexa sem falar com o operador:** o ✓ tem um "completo" escondido para leitor de tela, e
> EM BREVE é texto, nunca link. **Os dois têm teste.**

> **Depoimentos e Perguntas frequentes são a MESMA tela** com nomes diferentes *(Bloco C3,
> 23/09/2026)*. A marcação mora em três componentes compartilhados — formatar um formata os dois:
> `client/src/components/admin/HomeListEditor.tsx` (abas de idioma, botão de novo, lista),
> `HomeListItem.tsx` (o cartão de cada item, com Editar e Excluir) e `HomeListItemForm.tsx` (o
> formulário). As duas páginas só dizem os nomes dos campos.
> **Não mexa sem falar com o operador:** o **Excluir em dois cliques** (ele apaga de vez — é o
> caminho do pedido de remoção por LGPD) e as abas de idioma com `aria-pressed`. Os dois têm teste.
> **"Site" ganhou 2º nível** (Textos · Depoimentos · Perguntas frequentes) na coluna secundária
> (`SecondaryNav.tsx`). Como os itens não têm `grupo`, a coluna mostra o título **"Geral"** — é o
> comportamento atual do componente; se quiser outro visual ali, é conversa com o operador.
> **Na home**, as seções de depoimentos e de perguntas **somem inteiras** quando o idioma não tem
> item publicado (decisão do operador). Ao formatar, não conte com elas sempre presentes.
> **Depoimentos na home: no máximo 4 cards, sorteados a cada visita** (decisão do operador,
> 23/09/2026) — pode haver 1, 2, 3 ou 4. **Sem carrossel e sem script.** No celular, deixar os 4
> lado a lado deslizando com o dedo (CSS `scroll-snap`, sem JavaScript) é opção visual sua — fale
> com o operador. **No admin, depoimento não tem campo Ordem**; pergunta frequente tem.

**PLANEJADAS — aparecem no rail em cinza, com a etiqueta EM BREVE, e NÃO têm tela**

Trilhas Admin · Alunos · JilsonAI Admin · JilsonAI (do aluno) — e, no nível 2 de **Meus
estudos**, Em andamento · Concluídos · Certificados.
Elas existem só no mapa de navegação. **Não procure o arquivo: não há.**
**Desde 29/09 o ALUNO também as vê** (as dele: JilsonAI e as três de Meus estudos), por decisão do
operador: *"o que ainda não existe aparece como EM BREVE"*. A etiqueta sai do dicionário
(`app.nav.emBreve` — "COMING SOON" em inglês); nas seções de admin fica sempre em português.
*(28/09/2026: o operador decidiu o que cada uma tem dentro — plano, Fase 2, "o que cada seção
PLANEJADA vai ter dentro" — e criou uma nova, **Comunicação** (fila de dúvidas, anúncios). Ela
entra no mapa de navegação numa etapa próxima; "Escalações" sai do JilsonAI Admin e vai para lá.)*

### FILA DE FORMATAÇÃO — o que está pronto em estrutura e esperando o seu acabamento *(23/09/2026)*

Tudo abaixo funciona e tem teste; falta só o visual. Trabalhe direto no código (é tela de sistema),
exceto o item 4, que é página pública.

> **Feitos em 23/09 e publicados:** os antigos itens 1 (Depoimentos e Perguntas frequentes) e 2
> (Textos), junto com o layout padrão `PageLayout` nas telas do app e do admin. Na revisão, o
> operador mandou corrigir duas frases que descreviam o que o sistema ainda não faz ("Salva
> automaticamente": cada campo tem o botão Salvar; "upload das videoaulas": não existe upload).

3. **A coluna secundária de "Site"** mostra o título **"Geral"** acima dos três itens (é o que o
   `SecondaryNav.tsx` faz com itens sem `grupo`). Se quiser outro visual, combine com o operador —
   mudar o texto é decisão dele.
4. **Depoimentos na home** (`server/src/views/home.ts`, seção 7) — de **1 a 4** cards sorteados por
   visita. O desenho precisa ficar bom com qualquer quantidade nesse intervalo. Deslizar com o dedo
   no celular (CSS `scroll-snap`, sem JavaScript) é opção sua, com o ok do operador. Mexeu no CSS?
   `npm run css:publico` (regra 10).
5. ~~**Rodapé do app**~~ — **feito em 24/09 e publicado.** Na revisão, a cor `#F5F5F7` escrita
   no componente virou o token `--surface-vitrine` (regra 2), mesma cor. O seletor PT | EN que
   você desenhou fica. **Em 24/09 o Claude o ligou ao idioma do app:** virou botão (troca o
   idioma sem sair da tela), com `aria-pressed` no idioma atual. As classes que você escreveu
   continuam as mesmas.
6. **Campo Idioma no formulário de curso** (hoje em `client/src/components/admin/course-form/CourseLanguageLevelFields.tsx`, no passo Informações básicas; era `CourseOrganizationSection.tsx`, que se dividiu em 28/09)
   — novo em 24/09, na seção Organização. A grade tinha 3 colunas (Nível, Status, Ordem) e agora
   tem 4 itens, então o quarto desce de linha: o arranjo é seu. Travado (curso publicado), o
   idioma aparece como texto com o aviso "O idioma trava depois que o curso é publicado." — mude
   o visual, não o texto (é do operador). Também a etiqueta **"EN"** na lista de cursos
   (`AdminCoursesPage.tsx`) e o **aviso de erro ao salvar**, logo acima do botão "Salvar" de cada passo (cru: uma linha
   vermelha; em `course-editor/StepForm.tsx` desde 28/09).
7. ~~**Menu de conta**~~ — **acabamento feito em 24/09.** Na revisão, o "abrir ao passar o mouse"
   que você pôs ficou, mas **só para mouse**: no celular o toque dispara "entrar" e "clicar" em
   sequência, e o painel abria e fechava na hora; no computador, passar e clicar também fechava.
   O Claude consertou (`pointerType === "mouse"`) e **há teste para os dois casos** — não volte
   para `onMouseEnter`. Texto original do item, para referência:
   **Menu de conta** (`client/src/components/layout/AccountMenu.tsx`) e a **faixa do topo** que o
   carrega (`client/src/components/Layout.tsx`) — novos em 24/09, em toda tela depois do login.
   Estrutura crua: botão redondo com a foto ou as iniciais, e um painel com nome, e-mail, Minha
   conta, Faturamento e assinatura e Sair. No celular, a mesma faixa tem o botão da gaveta à
   esquerda. **Não troque o painel por `role="menu"`** sem a navegação por setas que ele promete, e
   mantenha o fechamento por Esc e por clique fora: **têm teste**.

8. **Cartão do curso na lista do admin** (`AdminCourseCard.tsx`, 27/09) — capa 16:9 (sem capa,
   "Sem imagem"), status em português, "EN", módulos e aulas, três números como **"—" / "em
   breve"** e a barra de **Preenchimento** com o que falta. Os textos foram **aprovados pelo
   operador**: mude o visual, não o texto. O cartão tem `role="article"` com o título como nome, e
   a barra é um `progressbar` com valor: **têm teste**.
9. **Mídia do curso** (`CourseMediaSection.tsx` e os três componentes de envio, 27/09) — **a ordem
   foi pedida pelo operador: a mídia em cima, o campo embaixo, o botão por último**; mantenha. No
   player (`components/content/BunnyPlayer.tsx`, que a prévia usa), **não tire o
   `referrerPolicy`** do iframe: é ele que deixa o Bunny reconhecer o domínio da escola, e sem ele o
   vídeo não toca.
10. **Informações básicas** (`CourseBasicsSection.tsx`, `Field.tsx`, `MarkdownField.tsx`, 27/09) —
   contador "42/60" embaixo de cada campo e a descrição com as abas **Escrever / Visualizar** e os
   botões Negrito, Itálico, Lista, Lista numerada. Os textos foram **aprovados**. As abas são
   `role="tab"` com troca pelas setas do teclado: mantenha. **O painel da aba inativa usa `hidden`
   de propósito** — é o padrão de abas acessíveis, e não contradiz a regra 3, que é sobre rótulos.
   A aparência do texto formatado (listas, negrito) mora em
   `client/src/components/content/MarkdownText.tsx`, **compartilhado**: formatar ali muda todo lugar
   que mostra Markdown (hoje, a prévia da descrição; depois, telas do aluno e o chat do JilsonAI).
   Ele é carregado só quando alguém abre Visualizar: não troque o `lazy()` por import direto.

> **Acrescentados em 29/09/2026 (fila atualizada no fim da sessão).** O item 9 agora se chama
> **Mídia e destaques** (era "Página do curso"; o endereço `/pagina` ficou).

11. **A página da aula** (`/aluno/aula/:id` — o mapa das telas acima tem os arquivos). É a tela que
   o aluno mais vai usar, e está **crua**: player grande, o conteúdo do curso no nível 2, os
   Recursos, o "para assinantes", o botão flutuante da IA e o painel "Em breve". Os textos saem do
   dicionário (`app.aula.*`): **mude o visual, não o texto**. **Têm teste e não podem sair:** o
   `aria-current` da aula atual, o "para assinantes" **sem** player, o rascunho marcado só para o
   admin, o botão da IA com nome e `aria-expanded`. O player é o mesmo `BunnyPlayer` do item 9:
   **não tire o `referrerPolicy`**. No celular e para o visitante, o conteúdo do curso desce para
   baixo do player (não há nível 2): confira os dois jeitos.
12. **"Sobre o curso"** (`components/aula/CourseDetails.tsx`), embaixo do player em toda aula:
   nível, descrição, o que vai aprender, pré-requisitos, pra quem é, camadas, destaques e perguntas.
   **Reaproveita peças compartilhadas** — `LayerSelo`, `HighlightCard` e `MarkdownText`, de
   `components/content/`, e o `Accordion` do shadcn: formatar ali muda todos os lugares que usam.
   **Bloco vazio não aparece** (tem teste): o desenho precisa ficar bom com qualquer combinação.
13. **O Conteúdo do editor** (a linha da aula que abre e recolhe, a miniatura do vídeo, os Arquivos
   com a porcentagem do envio — descritos acima, no bloco sobre `ModuleLessonTree`). O
   comportamento é do operador e tem teste; o acabamento é seu.
14. **O menu novo do aluno — ESTRUTURA PRONTA em 29/09, o acabamento é seu** (`docs/design.md`
   § 6, *O menu do aluno*): Início · Cursos · Trilhas · **Meus estudos** · JilsonAI (EM BREVE).
   Três lugares a formatar:
   - **o Início** (`pages/StudentHomePage.tsx`), que virou painel de 4 blocos, cada um em
     `components/inicio/`: `ContinueEstudando.tsx` (EM BREVE), `MinhasTrilhasNoInicio.tsx` (até 3
     trilhas salvas + "Ver todas") e `Atalhos.tsx` (o card das antigas "portas", sem a legenda);
   - **Meus estudos** (`pages/aluno/MeusEstudosPage.tsx`), um cartão por item;
   - **a etiqueta EM BREVE das telas do aluno**, `components/content/EmBreve.tsx` — formatar ali
     muda todos os lugares.
   **Têm teste, não mexa sem falar com o operador:** o que é EM BREVE nunca é link, os títulos
   (`h2`) de cada bloco e cartão, e o máximo de 3 trilhas no Início. **Sem "Salvos"** e sem as
   muitas fileiras do Home do LinkedIn (decisão dele).

15. **O Início do admin — ESTRUTURA PRONTA em 29/09, o acabamento é seu** (`/admin`,
   `pages/AdminPage.tsx`; decisão do operador): logado como admin, o Início é o painel da escola;
   o aluno continua indo para o dele. Os 4 relatórios são EM BREVE até os dados existirem, e os
   atalhos ficaram embaixo. **Tem teste, não mexa sem falar com o operador:** EM BREVE nunca é
   link, e a etiqueta do admin fica em português.

> **Fora do seu trabalho, para não confundir:** o Bunny ganhou **Live Stream** em acesso
> antecipado (29/09). É só avaliação depois da Fase 3, **não** é tela a desenhar (`docs/bunny.md`
> § 6, decisão 8).

## 3. Onde você NÃO mexe

| Arquivo | Por quê |
|---|---|
| `client/src/lib/navigation.ts` | É o **mapa de navegação** — dado, não estilo. Ele decide o que aparece e para quem; você decide como aparece. |
| `client/src/lib/footer.ts` | Os **itens do rodapé do app** e para onde levam — dado, igual ao mapa de navegação. O visual fica em `components/layout/AppFooter.tsx`. |
| Qualquer `*.test.tsx` / `*.test.ts` | Se um teste incomodar, **avise** — não edite. Um teste ajustado para passar deixa de proteger. |
| `client/src/components/ui/sheet.tsx` | Vem da biblioteca (shadcn/Radix). |
| `core/src/i18n/pt.ts` e `en.ts` | **É o texto do site** — conteúdo, não estilo, e o operador vai editá-lo pelo admin. Ver regra 9. |
| `core/`, `e2e/`, `prisma/`, e o resto de `server/` | Nada de front ali. **A exceção é `server/src/views/`**, que é a marcação das páginas públicas (§2). |

---

## 4. Doze regras — cada uma já custou tempo aqui

**1. Classe de Tailwind tem que ser TEXTO LITERAL.**
```tsx
const L = "w-64";
className={`hover:${L}`}   // ❌ NÃO gera CSS. Sem erro de build. O efeito só não acontece.
className="hover:w-64"      // ✅
```
Já aconteceu com a largura do rail. O Tailwind gera CSS **varrendo o texto do arquivo** — se a
string completa não existe no código, a classe não existe no CSS.

**2. Cor só via token.** Nunca hex solto num componente. Se precisa de uma cor nova, ela entra em
`client/src/index.css` como token e é exposta no `tailwind.config.ts`. Um hex perdido num
componente é a cor que ninguém acha quando a marca mudar.

**3. Nunca esconda texto com `hidden` ou `display:none`.** Use **opacidade**: o elemento
transparente continua na árvore de acessibilidade, e quem usa leitor de tela continua ouvindo.
O rótulo do rail recolhido depende disso — e **tem teste**.

**4. Não remova estes atributos:** `aria-current`, `aria-label`, `aria-invalid`, `aria-hidden`,
e as classes `focus-visible:*` e `focus-within:*`. São acessibilidade, vários **têm teste**.
O `focus-within:w-[280px]` do rail é o que faz ele expandir para quem navega por **teclado** —
sem isso, só quem usa mouse consegue ler os rótulos.

**5. Contraste é medido, não estimado.** Texto **4,5:1**; ícone, borda estrutural e texto grande
(≥24px) **3:1**. Já reprovamos duas combinações aqui:
- o azul da marca `#238FE8` sobre azul-claro dá **2,96:1** (reprova) — em superfície clara use
  `--primary-tint-foreground`;
- o cinza da logomarca `#838383` dá **3,79:1** (reprova para texto) — para texto use
  `--muted-foreground`.
No **rail escuro** o azul passa sozinho (5,81:1) e pode ser usado direto.

**6. Tamanho de texto é decisão do operador — não há piso definido por este documento.** Use seu
julgamento de design; se achar que algo ficou pequeno demais para o público (parte dele é de mais
idade, em tela pequena), **levante com ele**, não imponha.

**7. Leveza é requisito técnico, não gosto.** Boa parte do público acessa de aparelho antigo e
conexão instável.
- **Fontes ficam locais** — não voltar para o CDN do Google.
- `prefers-reduced-motion` sempre respeitado (use `motion-reduce:transition-none`).
- Nada de animação em laço contínuo.
- Cuidado com `box-shadow` de blur grande em grade de cards: é das operações de pintura mais caras.

**8. Formatos de imagem estritos (decisão técnica):** SVG para logos e ícones. WebP para fotos e ilustrações (garante leveza). PNG ou JPG (1200x630) EXCLUSIVAMENTE para a imagem OG (Open Graph) de compartilhamento, pois WhatsApp e LinkedIn não lidam bem com WebP.

**9. Nas páginas públicas, NENHUM texto visível fica escrito no template.** Todo texto sai do
dicionário (`core/src/i18n/`), **inclusive `aria-label`, `alt` e `title`**:

```ts
<p>Escolha um objetivo, siga uma trilha pronta.</p>        // ❌
<p>${escapeHtml(dict.home.trilhas.subtitle)}</p>           // ✅
```

**Por quê:** o operador edita esses textos pelo painel, sem deploy — texto cravado no HTML ele
não alcança. E a versão em inglês (`/en`) lê o mesmo dicionário: literal em português aparece
**na página em inglês**. Em set/2026 havia 55 textos assim; hoje há zero, e **a suíte reprova se
um voltar** (o teste compara `/` com `/en`).

Corolários que já quebraram coisa aqui:
- **Texto de dicionário nunca vira caminho de arquivo.** `src="/img/${dict...title}.png"`
  funciona até o operador editar aquele rótulo — aí a imagem some, sem erro.
- **Negrito no meio de um texto = dois campos** (`label` + `text`), nunca `<strong>` dentro da
  string. O operador não digita HTML no painel.
- Precisa de um texto que não existe no dicionário? **Peça a chave**, não escreva no template.
- **Vale também para as telas do ALUNO no React** *(desde 24/09 — o app do aluno existe em
  inglês)*: o texto delas vem de `useT()` (parte `app` do dicionário). Texto escrito direto no
  `.tsx` de uma tela do aluno aparece em português para o aluno estrangeiro. **O Admin é a
  exceção**: fica em português, com o texto na própria tela.
- **A primeira parte da chave diz onde o texto aparece:** `common.*` sai em TODA página pública
  (menu, rodapé) **e no rodapé do app logado**, `home.*` só na home. Mexer num `common.*` muda
  todas as páginas de uma vez.

**10. Mexeu no `public-input.css`, recompile:** `npm run css:publico`. A vitrine lê
`client/public/css/public.css`, que é **gerado**. Sem rodar o comando, seu CSS não chega na tela —
e não há erro nenhum avisando: você recarrega e simplesmente não mudou nada. **O arquivo gerado é
versionado**, então ele entra no commit junto com a sua mudança.

**11. No mapa de navegação, RÓTULO e ÍCONE são únicos.** Dois itens com o mesmo ícone viram dois
itens indistinguíveis no rail **recolhido**, onde só o ícone aparece. Já aconteceu duas vezes em
uma semana: "Site" nasceu com o ícone do "Catálogo", e "JilsonAI" existia duas vezes (aluno e
admin) com o mesmo ícone e o mesmo nome. **Tem teste** — `navigation.test.ts` reprova rótulo ou
ícone repetido **em cada menu** (o do aluno e o do admin, nos dois idiomas). Desde 29/09 existem
dois "Início" no mapa, um por papel, que nunca aparecem juntos. Se precisar de um ícone novo, pegue
no `lucide-react`.

**12. Seção PLANEJADA é TEXTO, nunca `<a>`.** O rail mostra as telas que ainda não existem, em
cinza e com a etiqueta EM BREVE — ao admin, para ele não esquecer o que falta, e ao aluno, as dele
(desde 29/09/2026). Elas **não podem virar link**: a rota não existe, e clique que leva a lugar
nenhum é pior que item ausente. Vale no rail, na gaveta do celular **e** no nível 2 — os três
precisam concordar. **Tem teste.**

---

## 5. Como você confere que não quebrou nada

```bash
npm run typecheck && npm --workspace client run test
npm --workspace server run test     # se você tocou em server/src/views/
```

**Isto é a rede de segurança de verdade.** Se você apagar sem querer a expansão por teclado, o
`aria-current`, o rótulo do rail, a checagem de papel do admin ou o destino de um link, **a suíte
reprova e diz exatamente qual**. A suíte do servidor cobre as páginas públicas: texto cravado no
template, favicon, `canonical`, `hreflang` e as seções de depoimentos e perguntas (só as
publicadas, no máximo 4 depoimentos, seção some quando vazia). Dentro disso, formate à vontade.

**Se você mexeu no CSS da vitrine**, recompile antes de olhar (regra 10):
```bash
npm run css:publico
```
*(Era um comando longo e fácil de digitar errado; virou script em set/2026. Ele usa o config
próprio da vitrine — ver §2.)*

Se um teste reprovar e você achar que o teste é que está errado: **não edite o teste, avise.**

Para ver na tela (o operador roda nos terminais dele):
```bash
npm run dev:server      # http://localhost:3000 — a home pública (HTML de servidor)
npm run dev:client      # http://localhost:5173 — todo o resto (React)
```

**Os dois precisam estar de pé**, mesmo para olhar só o React: as telas buscam dados do servidor,
e sem ele você vê o estado de erro em vez da tela.

**Para abrir as telas de aluno e de admin é preciso ENTRAR** — `localhost:5173/login`, com a conta
de admin. **Peça as credenciais ao operador**; elas não ficam escritas em lugar nenhum do repo.
Sem login, `/aluno/inicio`, `/aluno/conta`, `/admin/*` redirecionam para o login.

---

## 6. A regra que mantém o sistema coerente

**Se você criar algo GERAL — um token novo, um padrão de componente que vai se repetir — isso
precisa subir para `docs/design.md` antes de espalhar pelas telas.** Se for só o arranjo daquela
tela específica, fica na tela.

Sem essa separação, a décima tela tem dez paletas paralelas e ninguém sabe qual vale.

---

## 7. Contexto rápido do que já está construído

- **Navegação em três níveis** (`docs/design.md` §6), e o estado de cada um *(conferido set/2026)*:
  - **Nível 1 — o rail escuro:** construído. Recolhido em 80px, expande para 280px **sobrepondo** o
    conteúdo (`AppRail.tsx`).
  - **Nível 2 — a coluna secundária clara:** **construído** (`SecondaryNav.tsx`, montado no
    `Layout`). Aparece sozinha quando a seção declara `filhos` — hoje "Minha conta" tem 6, **"Site"
    tem 3** (Textos · Depoimentos · Perguntas frequentes), **o editor do curso tem os 7 passos**
    (28/09), e "JilsonAI Admin" já tem os dele declarados esperando a tela nascer. **Vai ser usado
    também pela tela da aula**, onde a lista de módulos e aulas fica no nível 2 (decisão do
    operador, 28/09).
  - **Nível 3 — as abas horizontais:** **NÃO construído.** A função `abasDaRota` existe e tem
    teste, mas **nenhum componente a renderiza ainda**. "Cursos Admin" já declara três abas
    (Publicados · Rascunhos · Arquivados) que hoje não aparecem em lugar nenhum.
    *(A linha anterior deste documento dizia que os níveis 2 e 3 não existiam — estava
    desatualizada quanto ao nível 2.)*
- **A home pública está no ar**, em HTML de servidor (`/` e `/en`), sem React e sem hidratação.
  Ela é o mock `design-lab/home-lab.html` transposto. **Mock aprovado se TRANSPÕE, não se
  reinterpreta:** a primeira tentativa reescreveu a marcação com classes inventadas e metade da
  página ficou sem estilo — o typecheck e os testes passaram, porque nenhum dos dois olha CSS.
- **Navegação é dado**, não código: cada tela declara seus níveis em `navigation.ts` e o cromo se
  monta sozinho. (Nota: UI bilingue usa textos num dicionário global na implementação).
- **Texto vem do dicionário e JÁ é editável pelo painel** *(desde 23/09)*. O texto em
  `core/src/i18n/` é o **valor de fábrica**; o operador sobrescreve em `/admin/site/textos` sem
  deploy. Por isso a regra 9 não é preferência de organização — é o que faz o painel dele
  funcionar. **Depoimentos e perguntas frequentes não estão no dicionário:** moram no banco e são
  editados nas telas deles.
- **Fontes:** MuseoModerno (**só a marca**, classe `font-brand`), Outfit (apenas H1 e H2, classe `font-display`), Hanken Grotesk (corpo e títulos menores/H3), JetBrains Mono (etiquetas).
- **O azul `#238FE8` é o acento ÚNICO.** No rail, é o único sinal de "onde estou" — por isso o
  hover ali é neutro.

- **Vem aí, e vai precisar de você** *(decidido pelo operador em 27–28/09, ainda não
  construído; detalhe no plano)*: o **editor do curso em 7 passos** no nível 2 (Bloco E) · o
  **"+" entre aulas** e **arrastar para reorganizar** (uma peça de arrastar só, também para a
  ordem dos cursos e das perguntas) · o **sino** ao lado da foto, no topo, com os avisos do aluno ·
  o **painel do aluno** no Início · a tela da **aula** (vídeo + lista no nível 2) · e, do lado
  público, a **página do curso**, a **página curta da trilha**, **Quem somos**, **Contato** e a
  **página de baixar material** (plano → *Páginas públicas que faltam*). As públicas seguem o
  caminho da home: mock aqui, transposição, acabamento.

**A lei visual completa é `docs/design.md`.** Ela é viva: se você tiver algo melhor, proponha e a
gente reescreve. O que não muda sem conversa são as travas de **acessibilidade** — elas não
descrevem gosto, descrevem quem consegue usar o produto.
