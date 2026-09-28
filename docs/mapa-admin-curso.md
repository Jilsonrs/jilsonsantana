# Mapa do admin do curso — Udemy × escola

> **O QUE É ISTO:** o operador mandou os prints de **todas as telas de gestão de curso da Udemy**
> (29 imagens, 27/09/2026) para cruzar com a escola e **reorganizar o formulário do curso em
> áreas**. Cada linha diz o que a Udemy tem, o que a escola tem hoje, e a proposta.
>
> **REGRA DESTE ARQUIVO:** a coluna **Proposta** é do **agente** e **não é decisão**. Só vira
> decisão quando o operador responder; a resposta vai para a coluna **Decisão**, com a data, e
> depois para o documento de destino (plano, `courses.md`, `design.md`). Nada aqui é construído
> antes disso.
>
> **Legenda:** ✅ já existe · 🔜 já planejado (diz onde) · ❓ pergunta para o operador ·
> ✖ proposta: não entra
>
> **Estado:** **os 4 lotes mapeados** (29 prints, 27/09/2026) + a pesquisa de como outras cinco
> plataformas organizam (§14) + a proposta de organização (§15), que é do agente e espera o operador.
> As perguntas estão na seção final (§17) e podem ser respondidas por número, em partes.

## 0. Como a Udemy organiza

Um menu à esquerda, em **dois grupos**, e cada item é uma **tela própria**:

- **Edição do curso:** Alunos pretendidos · Grade curricular · Página inicial do curso · Legendas ·
  Acessibilidade · Feedback da Udemy
- **Gerenciamento do curso:** Preço · Promoções · Mensagens do curso · Disponibilidade · Alunos

No topo, sempre: voltar para os cursos · título · status (**PUBLICADO**) · **"2 h 36 min de
conteúdo em vídeo publicado"** · botão **Visualizar**.

**Na escola hoje:** uma página só, comprida, com as seções *Informações básicas · Mídia e
Apresentação · Organização · Listas e Detalhes · Destaques · Perguntas Frequentes · Módulos e
Aulas*. **Isso casa com o que já está planejado:** o **nível 2 da navegação** (coluna secundária,
`implementation-plan.md` → Bloco S2) é exatamente o menu da esquerda da Udemy. O editor do curso
pode ser a primeira tela a usá-lo.

## 1. Página inicial do curso

| Na Udemy | Na escola hoje | Proposta |
|---|---|---|
| Título, com contador | ✅ 60 caracteres (Bloco B, 27/09) | — |
| Subtítulo, com contador e **dica embaixo** ("use uma ou duas palavras-chave…") | ✅ 120 caracteres, **sem dica** | ❓ Q1 |
| Descrição com negrito, itálico e listas | ✅ (Bloco B, 27/09), até 5.000 caracteres | — |
| Descrição com **mínimo de 200 palavras** | não tem mínimo | ❓ Q2 |
| Idioma | ✅ Português · English (máximo 2, decisão de 14/09) | — |
| Nível, com **"Todos os níveis"** | ✅ Iniciante · Intermediário · Avançado, **sem** "Todos os níveis" | ❓ Q3 |
| Categoria + subcategoria ("TI e software") | não existe | ✖ Q4 |
| "O que é essencialmente ensinado" (temas) + o tema mais representativo | não existe | ✖ Q4 |
| Imagem do curso (750×422, JPG/PNG/GIF, sem texto) | ✅ envio para o Bunny (JPG/PNG/WebP) | — |
| Vídeo promocional | ✅ envio para o Bunny, prévia no admin | — |
| Perfil do instrutor (biografia, "100.000+ alunos", link) | não existe | ❓ Q5 |

## 2. Alunos pretendidos

| Na Udemy | Na escola hoje | Proposta |
|---|---|---|
| O que os alunos aprenderão: **um campo por item**, contador de **160**, mínimo de 4, lixeira e arrastar para reordenar | ✅ existe (`learnTags`), mas numa **caixa de texto, um por linha**, sem contador, sem mínimo | ❓ Q6 e Q7 |
| Requisitos: mesma forma | ✅ existe (`requirements`), caixa de texto | ❓ Q6 |
| Para quem é: mesma forma | ✅ existe (`personas`), caixa de texto | ❓ Q6 |

## 3. Grade curricular

| Na Udemy | Na escola hoje | Proposta |
|---|---|---|
| Seções com título | ✅ Módulos | — |
| Aula de **vídeo**: miniatura, nome do arquivo, duração | 🔜 Bloco U, etapa 3 (nome = nome do arquivo, decidido em 27/09) | guardar a **duração** que o Bunny informa, para somar a carga horária |
| **Visualizar** a aula como aluno | 🔜 Bloco U, etapa 3 (prévia no admin) | — |
| Cancelar a publicação da aula | ✅ status da aula (Rascunho/Publicado) | — |
| **Prévia gratuita** (liga e desliga) | 🔜 decidido em 27/09 (`isFreePreview`), Bloco U etapas 3–4 | — |
| **Para download** (o aluno baixa o vídeo) | não existe | ✖ Q8 |
| **+ Descrição** da aula | não existe | ❓ Q9 |
| **+ Recursos** (arquivos para baixar: fontes, biblioteca de prompts) | não existe | ❓ Q10 |
| **+ Laboratório** (ambiente prático da Udemy) | não existe | ✖ serviço da Udemy |
| Aula do tipo **artigo** (texto, sem vídeo) | não existe | ❓ Q11 |
| **Teste / Quiz** | não existe | ❓ Q12 |
| **Upload em massa** (vários vídeos de uma vez, cada um vira aula) | não existe | ❓ Q13 |
| Reordenar **arrastando** (≡), editar (lápis), excluir (lixeira). *O operador (27/09): "clicar, manter o mouse pressionado e arrastar para reorganizar aulas e seções"* | ✅ setas ↑↓ e lixeira | ❓ Q14 |
| Topo: **duração total do conteúdo publicado** | não existe | 🔜 sai da soma das durações (Q da linha do vídeo), nunca uma coluna |
| Topo: botão **Visualizar** a página do curso | não existe | ❓ Q15 |
| **"+" entre dois itens** (inserir aula ou seção naquele ponto). *Como o operador descreveu (27/09): "coloca o mouse entre uma e outra, o ícone muda, você clica e cria"; vale para aulas e para seções* | adiciona só no fim, e reordena pelas setas | ❓ Q16 |
| O "+" abre um **menu de tipos**: *Assistir ou ler* (aula em vídeo ou texto) · *Role play* (conversa com IA para praticar, sem nota) · *Programação e laboratórios* (exercício de código, laboratório prático, laboratório corrigido) · *Verificações de conhecimento* (teste, simulado cronometrado, tarefa para enviar) | só existe aula | ❓ Q36 |
| **Nova seção:** título (**80** caracteres) + **"O que os alunos poderão fazer ao final desta seção?"** (objetivo de aprendizado, **200**) | módulo tem só o título, sem limite | ❓ Q35 |
| Adicionar vídeo em **duas abas: "Fazer upload" · "Adicionar da biblioteca"** (reusar um vídeo já enviado) | 🔜 só o envio (Bloco U, etapa 3) | ❓ Q17 |
| Aviso do arquivo: **pelo menos 720p e menos de 4 GB** | não há limite definido para vídeo de aula | ❓ Q18 |

## 4. Legendas

| Na Udemy | Na escola hoje | Proposta |
|---|---|---|
| Tela própria, com o idioma e a contagem **"44/44 aulas publicadas legendadas"** | não existe | ❓ Q19 |
| Uma linha por vídeo (o promocional e cada aula): situação, data, **Editar** e o menu **Fazer upload · Baixar · Excluir** | 🔜 decidido em 25/09: legenda `.vtt` **casada pelo nome do arquivo** do vídeo (`bunny.md` §7.1) | a tela de legendas é onde isso aparece |
| Aviso "todas as aulas legendadas: os alunos verão o ícone **CC**" | não existe | entra junto, se a Q19 for sim |
| **Editar** a legenda na própria tela (corrigir palavra) | não existe | ✖ corrigir no Descript e reenviar o `.vtt` |
| Legenda **gerada sozinha** pela Udemy | não existe | ✖ **trava de custo** (25/09): o código nunca pede transcrição ao Bunny, porque cobra por minuto. A legenda vem do Descript |
| Legenda em **outro idioma** (ex.: inglês num curso em português) | não existe | ❓ Q20 |

## 5. Acessibilidade *(o operador nunca usou)*

| Na Udemy | Na escola hoje | Proposta |
|---|---|---|
| Texto explicativo + **três listas de conferência** (legendas · áudio · materiais), cada uma com uma caixa "atende às diretrizes" | não existe | ✖ Q21 |
| Links para guias da Udemy · "Marcar seu curso como acessível" | não existe | ✖ Q21 |

A acessibilidade que importa aqui é **do site** (teclado, leitor de tela, contraste), e ela já é
regra de engenharia (`design.md` §6), testada em cada tela. Do lado do conteúdo, **a legenda é o
item que mais pesa**, e ela já está na seção 4.

## 6. Feedback da Udemy

| Na Udemy | Na escola hoje | Proposta |
|---|---|---|
| "Seu curso está disponível" + **Melhorias recomendadas** (revisão automática da qualidade) | ✅ na **lista** de cursos: a barra de **Preenchimento** com o que falta (Bloco A, 27/09) | ❓ Q22 |

## 7. Preço

| Na Udemy | Na escola hoje | Proposta |
|---|---|---|
| Preço **por curso**, moeda, faixa de preço, "Programa de Ofertas" | a escola é **por assinatura**: um preço só, em R$ ou US$ pelo país do cartão (`billing.md`) | ✖ não há preço por curso (confirmado no Bloco A, 27/09) |

## 8. Promoções

| Na Udemy | Na escola hoje | Proposta |
|---|---|---|
| **Indicar alunos**: um link que credita a venda a você | 🔜 o cadastro guarda **de onde o aluno veio** (`acquisitionSource` / `acquisitionCampaign`, das marcas UTM do link). Tem que estar no ar antes de o canal mandar gente | ❓ Q23 |
| **Cupons** por curso: desconto, validade, quantos usaram, link, liga/desliga, criar vários | não existe | ❓ Q24 |

## 9. Mensagens do curso

| Na Udemy | Na escola hoje | Proposta |
|---|---|---|
| **Boas-vindas** automática quando o aluno se inscreve, com editor (negrito, listas, imagem, código) | não existe | ❓ Q25 |
| **Parabéns** automático quando o aluno conclui | não existe | ❓ Q25 |

## 10. Disponibilidade

| Na Udemy | Na escola hoje | Proposta |
|---|---|---|
| "Respondo em até X" · "ausente, volto em DD/MM" · sem status · aplicar a todos os cursos | não existe. Na escola **não há fórum**: a dúvida vai ao JilsonAI e, se ele não resolver, **sobe para a fila do Jilson** (`jilsonai.md`, Fase 2) | ❓ Q26 |

## 11. Alunos (do curso)

| Na Udemy | Na escola hoje | Proposta |
|---|---|---|
| Lista: nome, data de inscrição, última visita, **progresso %**, busca | não existe. Os dados nascem na **Fase 5** (progresso por aula e os eventos do player) | ❓ Q27 |
| Colunas "perguntas feitas" e "respostas dadas" no fórum | não há fórum | trocar por **perguntas ao JilsonAI** e **dúvidas que subiram para você** (Q27) |
| Botão **Mensagem** para o aluno | não existe | ❓ Q27 |
| **Exportar para CSV** | não existe | ✖ Q27: é dado pessoal saindo do sistema (LGPD) |
| Etiqueta "Udemy Business" (aluno de empresa) | 🔜 a assinatura já nasce pronta para empresa (`organizationId`), pós-lançamento | — |

## 12. Caixa de mensagens do instrutor *(fora do curso, no menu geral da Udemy)*

| Na Udemy | Na escola hoje | Proposta |
|---|---|---|
| **Perguntas e respostas** + **Mensagens** (filtros: não lida, importante, sem resposta; busca; responder; Compor) | 🔜 a **fila do Jilson**: a conversa inteira do aluno com o JilsonAI, e você responde uma vez (`jilsonai.md`, Fase 2) | ❓ Q28 |
| **Perguntas em destaque** | 🔜 a sua resposta **vira base de conhecimento** do JilsonAI (`promotedToKb`) | — |
| **Insights do AI Assistant** (novo) | 🔜 os registros do JilsonAI (`AiEvent`) já guardam o que os alunos perguntam | ❓ Q28 |
| **Anúncios** (mensagem para todos) | 🔜 já é um dos pilares: "comunidade" = JilsonAI + canal com você + **anúncios** | — |
| **Tarefas** | não existe | ✖ Q28 |

## 13. A página do curso vista pelo aluno

É a **vitrine**, que será refeita como página de servidor (plano, depois do C5). O que a Udemy
mostra, cruzado com a escola:

| Na Udemy | Na escola | Proposta |
|---|---|---|
| Caminho de categorias no topo ("TI e software › IA generativa") | não existe | ✖ Q4 |
| Título e subtítulo | ✅ | — |
| Etiqueta **"Novo"**, **nota 4,9 (5 avaliações)**, **"21 alunos"** | a nota é **só para você**, nunca no site (decisão de 27/09, Bloco A) | ❓ Q29 (etiqueta "Novo" e número de alunos) |
| "Criado por Jilson Santana · 100.000+ alunos" | não existe | ❓ Q5 |
| **"Última atualização em 09/2026"** | não existe | ❓ Q30 |
| Idioma do curso e **idioma da legenda** | ✅ idioma · a legenda depende da Q19 | — |
| "O que você aprenderá" em **duas colunas com ✓**, em frases | hoje planejado como **etiquetas** | ❓ Q7 (o print mostra o jeito da Udemy) |
| "Explorar temas relacionados" | não existe | ✖ Q4 (o equivalente na escola seria **"este curso está nas trilhas…"**) |
| Cartão ao lado: **prévia do vídeo**, preço da assinatura, "obtenha este curso ao assinar", "cancele quando quiser", botão **Iniciar assinatura** | ✅ decidido: a página tem a **opção de assinar ao lado** (`CLAUDE.md` → página de curso é vitrine) | o texto do cartão é seu, na hora do mock |
| **Comprar curso individual** | não há | ✖ só assinatura |
| Ícones **presente** e **compartilhar** | compartilhar: 🔜 depende das metas de indicação da página (`CLAUDE.md` → Indexação) | ❓ Q31 (presente) |
| **"Este curso inclui":** horas de vídeo, artigos, recursos para baixar, celular e TV, legendas | 🔜 é a *faixa de números* do curso, **sempre calculada**, nunca digitada (`CLAUDE.md` → Derivados) | sai da soma das aulas; a TV depende da P5 (Chromecast) |
| "Este curso inclui": **"Acesso total vitalício"** | **não vale para a escola**: o acesso dura enquanto a assinatura estiver ativa | ✖ nunca prometer |
| "Este curso inclui": **"Certificado de conclusão"** | 🔜 o certificado da escola é **da trilha**, ao chegar a 100%, com as competências (Fase 6.5) | ❓ Q32 |
| **Conteúdo do curso:** "7 seções · 45 aulas · 2h35m", expandir todas, cada módulo com aulas e minutos, cada aula com o tipo, a duração e **Visualizar** nas aulas grátis | 🔜 a lista de módulos da página do curso; a duração depende de guardar a do Bunny (seção 3) | — |
| Descrição longa com **"Mostrar menos"** | ✅ a descrição com formatação | recolher só na tela, com o texto inteiro já na página (trava de SEO: *conteúdo nunca atrás de clique*) |
| **"Os alunos também compraram"**: cartões com nota, alunos, horas, "Atualizado em", preço | não existe | ❓ Q33 |
| **"Frequentemente comprados juntos"** + carrinho | não se aplica: a assinatura já dá todos os cursos | ✖ |
| Barra fixa no topo ao rolar (título, nota, alunos) e cartão de assinar que acompanha a rolagem | — | é desenho da página: entra no mock, com o Antigravity |
| Seção **Instrutor** | não existe | ❓ Q5 |

## 14. Como outras plataformas organizam *(pesquisa do agente, 27/09/2026)*

O operador pediu para pesquisar antes de reinventar. O context7 não tem a documentação dessas
plataformas (buscou-se Teachable e Thinkific: nada útil), então a fonte são as **centrais de ajuda
oficiais** de cada uma:

| Plataforma | As áreas de um curso, como elas chamam |
|---|---|
| **Udemy** | Alunos pretendidos · Grade curricular · Página inicial · Legendas · Acessibilidade · Feedback — Preço · Promoções · Mensagens · Disponibilidade · Alunos |
| **Teachable** | Information · Pages (página de venda, checkout, obrigado) · Curriculum · Design Templates · Pricing · Order Bumps · Comments · Coupons · Students · Bundle Contents · Reports · Certificates ([ajuda](https://support.teachable.com/en/articles/11682404-courses)) |
| **Thinkific** | Curriculum · Settings (endereço da página, imagem, SEO, oculto/privado) · Drip (liberação programada) · Pricing · Publish ([ajuda](https://support.thinkific.com/hc/en-us/articles/360030371754-The-Thinkific-Course-Builder)) |
| **LearnWorlds** | Layout (página) · Contents · Access & Settings (acesso, liberação programada) · Video Library · Dashboard (números) ([ajuda](https://support.learnworlds.com/support/solutions/articles/12000079954-general-overview-creating-courses)) |
| **Kajabi** | Outline (módulos e aulas) · Customers · Offers · Certificates · Customize (página) · Settings ([ajuda](https://help.kajabi.com/en/articles/12695120-customize-your-cohort-based-course)) |
| **Hotmart** | Conteúdo (módulos, aulas, materiais) · Configurações · Certificado · Comentários · Compradores ([ajuda](https://help.hotmart.com/pt-br/article/360037537591/curso-online-tudo-o-que-voce-precisa-saber-para-cadastrar-e-configurar-seu-produto)) |

**O que se repete em todas, e é o que vale copiar:**

1. **Conteúdo** (módulos e aulas) é sempre uma área **própria**, nunca misturada com a página de
   venda.
2. **Página do curso** (o que o visitante lê) é outra área.
3. **Configurações** juntam o que não é conteúdo nem página: endereço, status, publicar, SEO.
4. **Preço/ofertas**, **alunos/números** e **certificado** aparecem em quase todas.
5. **Liberação programada** (*drip*: a aula abre só depois de X dias) aparece em quatro delas.

**O que não se aplica à escola:** preço, cupom e pacote **por curso** (a escola é assinatura),
carrinho, página de checkout por curso, e comentários ou fórum (a escola responde pelo JilsonAI).
**Liberação programada:** a decisão de agosto diz *"a entrada é aberta e livre: o aluno clica e
assiste o que quiser"* (`CLAUDE.md` → Content Model), então ela não entra, a menos que o operador
mude isso.

## 15. Proposta de organização do editor do curso *(do agente — espera o operador)*

Um menu dentro do curso, como na Udemy, com os nomes que o operador já conhece onde eles servem.
**O menu é o NÍVEL 2 da navegação, na coluna do meio, colada ao menu lateral, como o `design.md`
§13 já desenha** *(decisão do operador, 28/09/2026; ele chegou a pedir o menu à direita e voltou
atrás ao lembrar que o nível 2 existe)*. **A tela onde o aluno assiste à aula segue a mesma regra:**
a lista de módulos e aulas fica no nível 2, no meio.

**Edição do curso**

| Área | O que vai nela (campos que já existem + o que depender das perguntas) |
|---|---|
| **Para quem é** | O que vai aprender · Pré-requisitos · Pra quem é *(forma: Q6, Q7)* |
| **Conteúdo** | Módulos e aulas · vídeo de cada aula · prévia gratuita *(e o que as Q9–Q18 aprovarem)* |
| **Página do curso** | Título · Subtítulo · Descrição · Idioma · Nível · Imagem · Vídeo promocional · Camadas · Destaques · Perguntas frequentes |
| **Legendas** | só se a Q19 for sim |

**Gerenciamento do curso**

| Área | O que vai nela |
|---|---|
| **Publicação** | Status · Slug · Ordem no catálogo · o que falta para publicar (Q22) |
| **Alunos** | Q27, com os números da Fase 5 |
| **Mensagens do curso** | só se a Q25 for sim |

**No topo de todas:** voltar para os cursos · título · status · duração publicada · **Visualizar**
(Q15).

**Fora do curso**, em áreas próprias do admin: **Comunicação** (fila de dúvidas, anúncios,
disponibilidade: Q26, Q28) e **Assinatura** (preço e cupom: Q24, na Fase 4).

**Consequência técnica, para o operador saber:** hoje o curso inteiro se salva num botão só. Com
áreas separadas, **cada área salva a sua parte**, como na Udemy. Isso é trabalho de código (meu),
não muda nada do que você decide.

## 16. O que a escola tem e a Udemy não

Slug · Camadas (metodologia 3 camadas) · Destaques · Perguntas frequentes do curso · Ordem no
catálogo · a trava do idioma depois de publicado · a barra de **Preenchimento** na lista de cursos.
Na reorganização, cada um precisa de uma área.

## 17. Perguntas para o operador *(responder juntas, depois do último lote)*

- **Q1.** Pôr uma **dica curta embaixo de cada campo**, como a Udemy faz? (O texto das dicas é seu;
  eu proponho um rascunho.)
- **Q2.** A descrição deve ter um **mínimo**? A Udemy pede 200 palavras por causa da busca dela.
  Proposta: sem mínimo obrigatório; no máximo, um item a mais na barra de Preenchimento.
- **Q3.** Acrescentar **"Todos os níveis"** ao Nível? (Precisa de uma mudança pequena no banco.)
- **Q4.** Categoria e temas servem para a Udemy separar 200 mil cursos. Com até 15 cursos por
  idioma, **as trilhas já fazem esse papel**. Proposta: não entram.
- **Q5.** Perfil do instrutor: um **bloco "Sobre o Jilson" escrito uma vez** e igual em todas as
  páginas de curso (como os textos das camadas), ou nada? Isso é da página do curso (vitrine), não
  do formulário.
- **Q6.** Trocar as três caixas de texto (aprender, requisitos, pra quem é) por **um campo por
  item**, com contador, lixeira e ordem, como a Udemy?
- **Q7.** "O que vai aprender" hoje é desenhado como **etiquetas curtas** (pílulas) na página do
  curso. A Udemy usa **frases de até 160 caracteres**. Qual dos dois?
- **Q8.** Deixar o aluno **baixar o vídeo**? Proposta: não, porque vai contra a proteção que você
  configurou no Bunny (bloqueio de acesso direto, MediaCage).
- **Q9.** **Descrição por aula** (a mesma caixa com negrito e listas)? Também ajudaria o JilsonAI a
  saber do que a aula trata.
- **Q10.** **Arquivos para baixar por aula** (fontes, prompts)? Só para quem tem assinatura, o que
  exige guardar esses arquivos de um jeito protegido (diferente das capas, que são públicas).
- **Q11.** Aula **só de texto** (artigo), sem vídeo?
- **Q12.** **Quiz**: como na Udemy (perguntas que você escreve) ou, pela regra da escola de
  "IA no DNA", o **JilsonAI fazendo as perguntas** sobre a aula (Fase 6 em diante)?
- **Q13.** **Enviar vários vídeos de uma vez**, cada um virando uma aula com o nome do arquivo?
- **Q14.** Reordenar **arrastando** aulas e seções, como você descreveu? Seria uma peça nova no site
  (o agente propõe qual no plano). **As setas continuam existindo** para quem usa o teclado: arrastar
  sem alternativa tranca fora quem não usa mouse (regra de acessibilidade, `design.md` §6).
- **Q15.** Botão **Visualizar** no topo, para ver a página do curso como o aluno vê, **inclusive em
  rascunho**?
- **Q16.** Botão **"+" entre as aulas** para inserir no meio, ou basta adicionar no fim e mover?
- **Q17.** **Reusar um vídeo já enviado** em outra aula ("Adicionar da biblioteca")? Atenção: hoje
  o vídeo substituído **é apagado sozinho** do Bunny (decisão de 27/09). Se o mesmo vídeo puder
  estar em duas aulas, essa limpeza precisa conferir se ele ainda é usado antes de apagar.
- **Q18.** Limite do vídeo de aula: copiar a Udemy (**720p no mínimo, até 4 GB**) ou outro número?
- **Q19.** **Tela de Legendas** própria, com "x de y aulas com legenda" e enviar, baixar e excluir
  por vídeo?
- **Q20.** **Legenda em outro idioma** no mesmo vídeo (ex.: legenda em inglês num curso em
  português)? Lembrete: a escola já decidiu que curso em inglês é **outro curso**, com vídeos
  próprios (`idiomas.md`); a legenda seria só uma ajuda a mais.
- **Q21.** Acessibilidade: proposta é **não ter tela**, porque as listas da Udemy são só caixas que
  o instrutor marca, e a legenda (Q19) cobre o principal. Concorda?
- **Q22.** "Feedback" dentro do editor: **mostrar a mesma barra de Preenchimento e o que falta no
  topo do editor**, além da lista? E, mais adiante, o **JilsonAI revisando a página do curso** e
  sugerindo melhorias (é o tipo de coisa que passa no filtro "IA no DNA")?
- **Q23.** No admin, um botão **"copiar link do curso para divulgar"**, já com a marca da campanha
  (ex.: o vídeo do YouTube de onde o link vai sair)? É o que mede qual vídeo traz aluno.
- **Q24.** **Cupom de desconto da assinatura**? A Stripe já faz isso pronto (cupom e código). Lembrete
  do que já está decidido: **sem oferta de fundador e sem escassez fabricada** (`content.md`). E
  cupom é da assinatura inteira, nunca de um curso.
- **Q25.** Mensagens automáticas de **boas-vindas** (quando o aluno abre a primeira aula do curso) e
  de **parabéns** (quando conclui), escritas por você em cada curso? Por **e-mail**, dentro do
  **site**, ou as duas?
- **Q26.** Um aviso **único para a escola inteira** (não por curso), mostrado quando a dúvida sobe
  para você: "o Jilson costuma responder em até X dias" ou "de volta em DD/MM"? Ajuda a proteger o
  seu tempo.
- **Q27.** Uma aba **Alunos dentro de cada curso** (nome, quando começou, última visita,
  progresso, dúvidas)? E o botão **Mensagem**? Proposta: **sem exportar planilha**.
- **Q28.** A caixa de mensagens **não fica no curso**: fica numa área própria do admin
  (**Comunicação**, que o plano de navegação já prevê), com a fila de dúvidas, os anúncios e, mais
  adiante, o **resumo do que os alunos mais perguntam ao JilsonAI**. Concorda? E "Tarefas" fica de
  fora?
- **Q29.** Na página do curso: mostrar a etiqueta **"Novo"**? E o **número de alunos** do curso?
- **Q30.** Mostrar **"Atualizado em MM/AAAA"**? Numa escola que promete conteúdo **sempre
  atualizado**, isso vende. A data sairia sozinha da última mudança nas aulas.
- **Q31.** **Dar a assinatura de presente**? Proposta: não no lançamento.
- **Q32.** **Certificado por curso**, além do certificado da trilha? Hoje só a trilha dá certificado,
  e o diferencial escrito em `courses.md` é o certificado **por competências**.
- **Q33.** No lugar de "Os alunos também compraram": **"Este curso faz parte das trilhas…"** e/ou
  **outros cursos da escola**? Sem nota e sem preço nos cartões.
- **Q34.** A **organização da §15**: aprovada como está, ou quer mudar nomes ou a ordem?
- **Q35.** Cada módulo ganha o **objetivo de aprendizado** ("o que o aluno consegue fazer ao fim
  deste módulo", até 200 caracteres), como a seção da Udemy? Ele pode aparecer na página do curso e
  também dar contexto ao JilsonAI. E o título do módulo com limite de **80**, como lá?
- ~~**Q37.** Menu do editor à direita ou no nível 2?~~ **Respondida (28/09/2026): nível 2, no
  meio, como no `design.md`, no editor do curso e na tela da aula.**
- **Q36.** Que **tipos de item** a escola terá no "+"? Proposta: **Aula (vídeo ou texto)** no
  lançamento; o **teste** conforme a Q12; e, mais adiante, o **role play com o JilsonAI** (o aluno
  pratica uma conversa, ex.: apresentar um dashboard a um gerente). É exatamente o tipo de coisa
  que passa no filtro "IA no DNA". Exercício de código, laboratório, simulado e tarefa: **fora**.

## 18. Respostas do operador *(28/09/2026, em rodadas)*

Cada resposta é **decisão dele** e vale a partir daqui. Quando todas estiverem respondidas, elas
vão para os documentos de destino (plano, `courses.md`, `design.md`) e viram um bloco de trabalho.

| # | Resposta |
|---|---|
| Q1 | **Sim, dicas embaixo dos campos.** O agente escreve o rascunho; o operador aprova os textos. |
| Q2 | **Sem mínimo.** Descrição curta aparece só como "falta" na barra de Preenchimento (o tamanho que conta como "curta" é proposto no plano). |
| Q3 | **Sim: "Todos os níveis"** entra como quarta opção do Nível. |
| Q4 | **Categoria e temas não entram.** No lugar de "temas relacionados", a página mostra as trilhas do curso. |
| Q5 | **A página do curso usa a MESMA seção do autor que já está na home** (`home.author`: "Olá, sou o Jilson", credenciais, números). Uma edição em Admin → Textos serve para a home e para as páginas de curso. |
| Q6 | **Um campo por item** nas três listas, com contador, lixeira e ordem. |
| Q7 | **"O que vai aprender" em frases** de até 160 caracteres, em duas colunas com ✓ (substitui as etiquetas de `courses.md`). |
| Q8 | **Não:** o aluno não baixa o vídeo. |
| Q9 | **Não:** aula de vídeo não tem descrição. |
| Q10 | **Sim: arquivos para baixar em cada aula, só para assinantes**, guardados de forma protegida. |
| Q11 | **Sim: aula sem vídeo.** Leitura do agente, junto com a Q9: a aula de **texto** tem o seu texto (com negrito e listas) e/ou arquivos; a aula de **vídeo** não tem texto. |
| Q12 | **Os dois:** quiz escrito pelo operador onde fizer sentido, e o JilsonAI fazendo perguntas mais adiante. |
| Q13 | **Não:** um vídeo por vez. |
| Q14 | **Sim: arrastar para reorganizar aulas e seções**, com as setas continuando para o teclado. |
| Q15 | **Sim: botão Visualizar**, que mostra a página do curso como o aluno vê, inclusive em rascunho (só para o admin). |
| Q16 | **Sim: o "+" entre dois itens** (aulas e seções), também pelo teclado. |
| Q17 | **Não:** cada aula tem o seu vídeo; a limpeza automática continua como está. |
| Q18 | **Sem limite** de resolução ou tamanho no site: aceita o que o Bunny aceitar. |
| Q19 | **Sim: tela própria de Legendas** no curso ("x de y aulas com legenda"; enviar, baixar e excluir o `.vtt` por vídeo). |
| Q20 | **Não por enquanto:** legenda só no idioma do curso. |
| Q21 | **Sem tela de Acessibilidade.** |
| Q22 | **Os dois:** a barra de Preenchimento com o que falta também no topo do editor; a revisão da página pelo JilsonAI quando ele existir. |
| Q23 | **Só um lugar para copiar o link do curso.** A marca de campanha o operador monta por fora. |
| Q24 | **Sim: cupom da assinatura, criado no painel da Stripe.** O site só tem o campo "tenho um cupom" na tela de assinar. Sem tela de cupom no admin. |
| Q25 | **Sim, dentro do site, por um SINO ao lado da foto, no topo:** uma área de avisos e alertas onde o aluno vê as mensagens de boas-vindas e de parabéns do curso e **outras comunicações do operador ou do JilsonAI**. Sem e-mail. |
| Q26 | **Um aviso só, sem prazo nem data**, quando a dúvida sobe do JilsonAI para o operador. Direção do texto, nas palavras dele: *"Sua dúvida já está com o Jilson… ele vai te responder o quanto antes possível."* |
| Q27 | **Sim: área Alunos em cada curso**, com busca e o botão Mensagem, **sem exportar planilha**. Os números chegam na Fase 5. |
| Q28 | **Sim: "Comunicação" é área própria do admin** (fila de dúvidas, anúncios e, depois, o resumo do que os alunos perguntam ao JilsonAI). **Tarefas fica fora.** |
