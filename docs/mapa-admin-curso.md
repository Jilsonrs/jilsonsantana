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
> **Estado:** lote 1 de 4 mapeado (Página inicial do curso, Alunos pretendidos, Grade curricular).
> As perguntas ficam na seção final e são respondidas **juntas**, depois do último lote.

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
| Reordenar **arrastando** (≡), editar (lápis), excluir (lixeira) | ✅ setas ↑↓ e lixeira | ❓ Q14 |
| Topo: **duração total do conteúdo publicado** | não existe | 🔜 sai da soma das durações (Q da linha do vídeo), nunca uma coluna |
| Topo: botão **Visualizar** a página do curso | não existe | ❓ Q15 |

## 4. O que a escola tem e a Udemy não

Slug · Camadas (metodologia 3 camadas) · Destaques · Perguntas frequentes do curso · Ordem no
catálogo · a trava do idioma depois de publicado · a barra de **Preenchimento** na lista de cursos.
Na reorganização, cada um precisa de uma área.

## 5. Perguntas para o operador *(responder juntas, depois do último lote)*

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
- **Q14.** Reordenar **arrastando**, em vez das setas? (Seria uma peça nova no site.)
- **Q15.** Botão **Visualizar** no topo, para ver a página do curso como o aluno vê, **inclusive em
  rascunho**?
