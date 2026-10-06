# courses.md — Produto, Catálogo e Engenharia de Cursos

> **O que é este doc.** A fonte única sobre **cursos** da escola jilsonsantana.com: por que cada
> curso existe, como ele vira uma página que vende a assinatura sem enganar ninguém, como um curso
> da Udemy é transposto para a escola, como um curso novo nasce, como a demanda é medida e o que o
> catálogo tem hoje. Serve para os cursos que já existem **e** como base para todo curso futuro,
> em português e em inglês.
>
> **Para quem.** O operador (Jilson) e qualquer sessão nova do Claude. Um chat novo que leia a
> **Leitura rápida** e o **Playbook de transposição** (§12) precisa conseguir entregar o mesmo nível
> de trabalho sem pedir que o operador explique tudo de novo.
>
> **Docs vizinhos.** Estratégia: `project-description.md` · Voz e concorrência: `strategy.md` · Copy
> da landing e da página de curso: `content.md` (§15) · Build: `implementation-plan.md` · Invariantes
> de código da página de curso: `CLAUDE.md` · Idiomas: `idiomas.md` · Decisões com gatilho de
> reabertura: `decisions-archive.md`. **Edit owner:** Project.
>
> **Reescrito do zero em 05/10/2026** a partir da versão de Set 2026 (fusão de `courses.md` +
> `mapeamento-cursos.md`). O que saiu e por quê está no Anexo C. A versão anterior continua no git.

---

## Disciplina de fonte (vale para todo o doc)

Toda afirmação carrega a origem. Sem origem, não entra.

| Marca | Significa |
|---|---|
| `[FATO]` | Documentado: doc do projeto, dado medido, tela da Udemy, ou **decisão do operador com data** |
| `[INFER]` | Dedução do agente a partir de fatos. Pode estar errada |
| `[ESPEC]` | Palpite a validar (quase sempre demanda: só o vidIQ confirma) |
| `[PROPOSTA]` | Sugestão do agente **ainda não aprovada** pelo operador. Não é regra até ele dizer |

**De quem é a decisão** `[FATO, regra do operador, Set 2026]`: *"a escola é dele, o código é
nosso."* O operador decide o que existe, o que o aluno vê e lê, os textos e nomes, o escopo e a
prioridade. Este doc registra **as decisões dele** com origem rastreável. Nunca escreva "o produto
faz X" porque parece certo: ou é decisão datada, ou é `[PROPOSTA]`.

---

## Leitura rápida (o mínimo que um chat novo precisa saber)

1. **A escola vende uma assinatura, nunca curso avulso.** R$ 99,90/mês sem fidelidade, ou ~R$ 995/ano.
   Fora do Brasil: US$ 30/mês ou US$ 299/ano. `[FATO]`
2. **Cada curso é um iPhone.** O catálogo é pequeno de propósito (teto de **15 cursos por
   idioma**), então cada curso precisa justificar a assinatura sozinho e levar o aluno a descobrir
   os outros, como o iPhone leva ao Mac. `[FATO, operador, 04–05/10/2026]` → §1
3. **Venda otimizada, mas honesta, no padrão Apple.** Premium e irresistível, sem exagero, sem
   escassez falsa, sem promessa que o curso não cumpre. → §2
4. **Cada página de curso é uma landing de venda montada de campos estruturados.** Não existe
   campo de copy livre. → §9
5. **O público da escola vem do YouTube**, num estágio de decisão diferente do da Udemy. A copy da
   escola é escrita para ele, com vocabulário medido no vidIQ. `[FATO, operador, 05/10/2026]`
6. **Os cursos da Udemy entram na escola com o mesmo conteúdo e texto novo** (título, subtítulo,
   descrição e listas), para não canibalizar. Conteúdo exclusivo da escola vem depois. → §12
7. **"O que vai aprender" é uma lista de tags curtas** `[FATO, operador, 05/10/2026]`, e cada item
   de lista é entregue numa linha própria, pronto para colar. → §10
8. **O vidIQ mede antes de escrever ou gravar.** Três consultas por curso. → §14
9. **Dados é o centro; IA é a camada que atravessa tudo.** Cursos *sobre* IA são o menor pilar e os
   primeiros a sair na rotação. → §4, §7
10. **Inglês é outra escola dentro da mesma assinatura:** curso em inglês é outro curso, regravado,
    com teto próprio de 15. → §16
11. **Energia do operador é restrição de projeto.** Um curso por vez, não regravar para transpor,
    nada vira câmera antes de a distribuição andar. ⚠️ Sinalize risco de burnout sempre que couber.
12. **Datas e números mudam.** O estado vivo do catálogo está na Parte V; confira antes de afirmar.

---

# PARTE I — FILOSOFIA DE PRODUTO

## 1. O curso é o produto (o princípio iPhone)

`[FATO, operador, 04/10/2026]` *"Mesmo que não venda cursos individualmente, cada curso por si só já
justifica a assinatura, aumentando ao máximo a conversão e a retenção dos alunos."*
`[FATO, operador, 05/10/2026]` *"Com o acervo de no máximo 15 cursos, os cursos e trilhas precisam ser
irresistíveis, produto premium, com assinatura acessível, otimizado para vendas mas sem enganar
ninguém, como a Apple faz."*

O que isso significa na prática:

- **Um curso, uma razão completa para assinar.** O visitante que chega por um curso só (busca,
  vídeo do YouTube, link compartilhado) tem que sair querendo assinar sem precisar ver a home.
- **O curso é a porta; o produto é a escola.** A página do curso apresenta o curso e mostra o que a
  assinatura dá a mais: as trilhas, os outros cursos, o JilsonAI, o certificado. Como o iPhone que
  leva ao Mac. `[FATO, operador, Out 2026 — referência: páginas de curso da Impacta]`
- **A mesma página serve à retenção.** O aluno logado que relê o curso tem que ver o valor do que
  já paga. É por isso que "Este curso inclui" também aparece no "Sobre o curso" da página da aula.
- **Poucos cursos, todos excelentes.** O teto de 15 não é falta de ambição; é o que permite que
  cada curso seja um produto acabado. Um catálogo que só cresce vira esteira de manutenção que um
  operador solo não sustenta.
- **Trilha também é produto.** A trilha é a jornada que transforma cursos soltos num resultado de
  carreira, e dá certificado por competências (`skillsCovered`), que é o que o RH lê.

> `[INFER]` **O fosso não é o curso; é o conjunto.** O curso atrai, mas quem fica, fica pelo
> conjunto: progresso, trilha, certificado, JilsonAI. É a mesma lógica do fosso da Apple descrita em
> `project-description.md` (sair custa abandonar a biblioteca, não o aparelho).

## 2. Venda honesta: o padrão Apple

Premium não é exagero. A Apple vende com precisão: diz o que o produto faz, mostra bem e não
inventa. Estas regras valem para toda página, todo campo e todo texto de venda.

**Regras decididas** `[FATO, com a decisão de origem]`:

| Regra | Origem |
|---|---|
| A escola vende **a assinatura**. Não existe preço, botão ou "comprar este curso" por curso | operador, 04/10/2026 |
| **Nunca** prometer "acesso vitalício" | operador, 28/09/2026 |
| A página **não** mostra número de alunos nem "Atualizado em" | operador, 28/09/2026 |
| Pré-requisitos **mostrados abertamente** (os concorrentes escondem; aqui corta reembolso e suporte) | `content.md` §15 |
| **Nunca prometer arquivo que não existe**: o item de arquivos é derivado do que está publicado | operador, 04/10/2026 |
| Sem escassez fabricada, sem oferta de fundador, sem preço travado para sempre | decisões de preço |
| Pode prometer o que o aprendizado entrega; **nunca emprego ou salário** | decisões de preço |
| Depoimentos **reais**, com nome completo (removível a pedido) | decisões de preço |
| Reembolso de 7 dias (CDC art. 49) e cancelamento visível em 1 clique, com tom calmo | decisões de preço |
| "Mais vendido" é **afirmação do operador**, revisada por ele, não cálculo | operador, 22/09/2026 |

**Ferramenta de terceiros: "utilizamos o plano gratuito"** `[FATO, operador, 05/10/2026]`. Não
"começa no plano gratuito" (soa como se fosse preciso pagar depois). Nunca "100% grátis", "custo
zero" ou "ilimitado": cotas gratuitas mudam sem aviso, por isso o texto cita que existem limites.

**Regras propostas nesta sessão, a confirmar** `[PROPOSTA, 05/10/2026]`:

- **Verbo que o curso cumpre.** "Reduzir respostas inventadas", não "evitar alucinações"; "aprender
  a usar", não "dominar".
- **O que o curso não ensina não aparece**, nem como tag nem como persona.
- **Linha de transparência opcional** em curso que também está na Udemy: *"Este curso também está
  disponível na Udemy. Na escola, ele faz parte de uma trilha e vem com [o que a assinatura dá a
  mais]."* A decisão de usar é do operador.

> **Teste de cada frase:** *"se o aluno ler isso, assistir ao curso inteiro e voltar aqui, ele
> concorda?"* Se não, a frase sai.

## 3. Por que o curso da escola é diferente do curso da Udemy

`[FATO, operador, 05/10/2026]` Os cursos compartilhados com a Udemy ganham **título, subtítulo,
descrição e listas próprios** na escola, pelos motivos:

1. **Canibalização de busca.** A Udemy tem mais autoridade de domínio. Com o mesmo texto, o Google
   tende a indexar a Udemy e a página da escola some. `[INFER]`
2. **Outro público, outro momento.** O comprador da Udemy está em busca transacional dentro da
   Udemy; o visitante da escola vem do YouTube e da marca. São estágios de decisão diferentes.
3. **O curso da escola vai crescer.** No começo o conteúdo é o mesmo; com o tempo ganha a Camada IA
   e conteúdo exclusivo, e a diferença deixa de ser só de texto.

O que o texto novo **não** resolve, registrado para não haver ilusão `[INFER]`:

- **A comparação de preço continua possível.** Quem procura o nome do Jilson acha o mesmo curso na
  Udemy em promoção. A resposta não é esconder: é a página vender **a escola** (trilha, JilsonAI,
  certificado, catálogo), não só o curso.
- **Se o aluno descobrir os mesmos vídeos com outro nome, pode se sentir enganado** `[ESPEC]`. Por
  isso a linha de transparência (§2) é uma opção séria.

## 4. Os 5 princípios do catálogo

1. **Teto de 15 cursos por idioma, de 2h a 5h cada; no máximo 2 idiomas (PT e EN).**
   `[FATO, operador, Set 2026; "por idioma" em 14/09]` É teto, não meta: existe para dizer quando
   **parar**. Slate comprometido em PT: 12. Folga: 3 slots, que são amortecedor da rotação (D9),
   não convite a expandir.
   - *Por que 15 e não 20:* os 20 foram calibrados contra o `analystbuilder.com` (1,42M inscritos).
     O catálogo dele é **consequência** do funil, não causa (§20). Vinte é o teto de quem já tem
     público; quinze é o de quem está construindo o seu.
   - **Regra de entrada:** nenhuma proposta de curso vale sem nomear **qual slot ocupa e por que
     vale mais que os candidatos reservados** ou, com o teto cheio, **quem sai**. Sem isso é ideia,
     não decisão. Entrar exige relevância estratégica **e** demanda real (vidIQ), nunca "porque já
     está gravado".
2. **Só se grava o que for relevante.** Cada aula nova passa pelo filtro: *tem demanda (vidIQ) e/ou
   é estrategicamente necessária?* Se não tem nenhum dos dois, não grava.
3. **A Regra do Satélite: a cerca do catálogo.** `[FATO, Ago 2026]` Um curso fora do centro entra
   **se o título aceitar naturalmente o sufixo "…para quem trabalha com dados"**. Se soar forçado, é
   outra escola.
   - ✅ "Git para quem trabalha com dados" · "N8N para automatizar rotinas de dados"
   - ❌ "Monte sua agência de chatbots" · "Automação de marketing" · "Prompt engineering genérico"
   - O eixo que se abre é o **comprador**, não o tema: *"esse curso faz sentido para o mesmo
     assinante que comprou Excel + IA?"*
4. **As 4 camadas: onde cada curso mora.** `[FATO, Set 2026]` Um curso tem exatamente uma camada,
   e ela define a ordem de saída na rotação.

   | Camada | Papel | Cursos |
   |---|---|---|
   | **NÚCLEO** | Ativo já gravado, maior funil, B2B. Paga a conta | Excel 1–5 · Power BI + IA · PL-300 |
   | **EXTENSÃO** | O analista completo. Evergreen, gravação nova | SQL · Python |
   | **SATÉLITE** | Entra pelo comprador, via sufixo | *(vazia)* |
   | **PRATELEIRA** | Vitrine e diferenciação, não receita. **Primeira fila da rotação** | Antigravity · Claude Code · N8N |

   SQL e Python **não** são satélites: são a continuação da carreira do mesmo aluno, e `sql` é o
   maior motor de aquisição fora do Excel (§18).
5. **IA como CAMADA × IA como ASSUNTO.** `[FATO, Set 2026]`

   | | O que é | Tamanho |
   |---|---|---|
   | **IA como camada** | Camada IA em cada curso + JilsonAI como tutor | **É a escola inteira** |
   | **IA como assunto** | Cursos *sobre* IA (Antigravity, Claude Code, N8N) | **O menor pilar** |

   "IA é mais um curso no catálogo" é o comportamento da escola medieval (`content.md` §5). Aqui a
   IA é a experiência, não uma prateleira.

## 5. Decisões travadas (D1–D12) e a política de produção

| # | Decisão | Implicação |
|---|---|---|
| D1 | Não fazer rebuild do carro-chefe na Udemy | Zero regravação do ativo de 499 aulas para a Udemy |
| D2 | Atualizar o carro-chefe com Quiz | Defesa de ranking sem entregar conteúdo novo |
| D3 | Conteúdo novo em 3 camadas é gravado **só para a escola** | Ver a tensão T9 abaixo |
| D4 | Reaproveitar o ativo legado como Camada Universal | ~75–85% de cada curso já existe |
| D5 | Pílulas de 2h a 5h, não monólitos | Cursos digeríveis, vendáveis por competência |
| D6 | Camada IA ensina **padrão de pensamento**, não interface | O que envelhece rápido dura mais |
| D7 | A Camada IA é o fosso e não vai para a Udemy `[INFER]` | O diferencial fica na escola |
| ~~D8~~ | ~~Ambiente único Databricks~~ **REVOGADO Set 2026** | Runtime por pilar, §8 |
| D9 | Catálogo rotativo com teto de 15 | Tecnologia menos relevante sai, outra entra. §6 |
| D10 | Camada IA em dois modos: **Pessoal** e **Empresa** | Quem tem IA bloqueada no trabalho não perde o curso. §7 |
| D11 | Lei anti-defasagem da Camada IA | Grava-se o padrão, nunca a integração do momento. §7 |
| D12 | **Runtime nunca vira título nem SEO** | O curso chama "SQL", não "PostgreSQL" |

**Política de produção vigente** `[FATO, operador, Set 2026]`:
- Enquanto a escola não tiver base sólida de alunos, **não se produz curso exclusivo da escola**.
  Só se produz curso para oportunidade da Udemy ou da Udemy Business (com incentivo ou garantia), e
  ele é compartilhado com a escola.
- **Não se regrava curso da Udemy para a escola.** Reaproveita-se como está; muda o texto.
- O conteúdo exclusivo da escola entra **com o tempo**, para criar diferenciação. `[FATO, 05/10]`
- O curso do Claude ficou fora por ora (leva muito mais tempo).

**Modelo Udemy × Escola** `[FATO]`: a Udemy fica com a base; a escola fica com base + Camada IA +
extras; a Camada IA é sempre exclusiva da escola.

> ⚠️ **T9 — TENSÃO REGISTRADA, NÃO RESOLVIDA** `[INFER]`. A política de Set 2026 ("nenhum curso
> exclusivo; não regravar") e partes do slate apontam em direções opostas:
> - Os **Excel + IA 1–4** (§17) são remontagem com aulas novas (🎬), inclusive toda a Camada IA.
> - **Claude Code (11)** e **N8N (12)** estão marcados como exclusivos da escola (`E`).
>
> Não é contradição se a política for uma **fase** (antes da base sólida) e o slate for o
> **destino**. Mas isso não está escrito. **Decisão do operador:** confirmar se a política suspende
> esses cursos até um gatilho (qual? número de assinantes?) ou se algum deles é exceção.

**Teto do conteúdo exclusivo** `[PROPOSTA, 05/10/2026]`: "exclusivo" significa a **Camada IA já
planejada**, não módulos novos por curso. Teto sugerido: 1 aula de Camada IA por curso, só depois
do lançamento, primeiro nos cursos do NÚCLEO. ⚠️ Sem teto, doze cursos com "conteúdo extra" viram
uma fila sem fim competindo com o build.

---

# PARTE II — ARQUITETURA DO CATÁLOGO

## 6. Pilares, rotação e arquivamento

### 6.1 Os 5 pilares `[FATO, Ago 2026; ocupação medida contra o slate de 12]`

| Pilar | Runtime | Slots | Ocup. | Racional |
|---|---|:-:|:-:|---|
| **1 · Excel** | Excel | 5 | 5 | Maior ativo gravado, maior topo de funil. **Cheio** |
| **2 · Power BI** | Power BI Desktop | 4 | 2 | Núcleo BI. Absorve PL-300, modelagem, dashboards e storytelling |
| **3 · SQL** | PostgreSQL + pgAdmin | 2 | 1 | Evergreen. `sql` = 42.436 buscas/mês BR |
| **4 · Python** | Python local + Jupyter | 2 | 1 | Evergreen, dá teto de senioridade |
| **5 · IA aplicada a dados** | varia | 2 | **3 ⚠️** | **Deliberadamente o menor**: maior defasagem, menor durabilidade |
| | | **15** | **12** | 3 slots livres |

> 🔴 **Desalinhamento registrado** `[FATO, Set 2026]`: o pilar 5 está com 3 de 12 (25%), acima do
> próprio teto e à frente do Power BI. Resultou de seis remoções seguidas que pouparam o pilar 5,
> não de decisão. **Não corrigir removendo curso agora:** os três são PRATELEIRA e formam a primeira
> fila da rotação. **Gatilho de reabertura:** qualquer curso do pilar 5 exigindo regravação por
> defasagem (D11), ou o N8N chegando à gravação sem validação de demanda PT.
>
> Por que o pilar de IA é o menor: é o que mais dá vontade de inflar e o que menos deveria. Carrega
> 100% do risco de regravação e ~0% do ativo já gravado.
>
> Não existe 6º pilar: dashboards, storytelling e modelagem moram no pilar 2.

### 6.2 D9 — Rotação e política de arquivamento `[FATO, não reabrir]`

- Com o teto cheio, curso novo entra quando outro sai.
- Saída: aviso ao aluno e **arquivamento 1 ano depois**.
- Arquivado = invisível na vitrine e na busca para novos; **assinante ativo continua acessando**.
- Sem alunos ativos, o vídeo pode ser deletado à mão. Histórico, aulas e certificado permanecem.
- **Arquivamento não interfere em certificado**: o certificado guarda nome e competências como
  snapshot, e a página pública `/certificado/:publicId` continua no ar.
- **Gatilho objetivo de aposentadoria:** matrículas nos últimos 6 meses abaixo do limiar **ou** a
  tecnologia saiu do mercado.
- **Não construir** funcionalidade de deleção de vídeo: no Bunny o caro é banda, e curso arquivado
  sem espectador consome banda ≈ zero.

## 7. A Camada IA e a Metodologia 3 Camadas

### 7.1 As 3 camadas (padrão de produção) `[FATO]`

| Camada | Enum | O que é | % médio | Produção |
|---|---|---|:-:|---|
| **1. Universal** | `UNIVERSAL` | Fundamentos que rodam em qualquer versão | 75–80% | Reaproveitado |
| **2. Moderno** | `MODERNO` | Recursos atuais (no Excel: PROCX, matrizes dinâmicas, coautoria) | 15–20% | Gravação nova |
| **3. IA** | `IA` | JilsonAI + Claude como copilotos | 5–10% | Gravação nova |

- Nem todo curso tem as três (o N8N pode ter só a IA). `Course.camadas[]` marca quais.
- **Internos, nunca na tela do aluno:** os percentuais, a palavra "reaproveitado" e o jargão "3
  camadas". O aluno vê a promessa.
- **Textos e ícones globais**, escritos uma vez por idioma, editáveis em Admin → Textos
  (`common.camadas`, decisão de 24/09/2026):

  | Enum | Ícone | Nome | Texto |
  |---|---|---|---|
  | `UNIVERSAL` | `stack-2` | **Fundamentos sólidos** | "A base que funciona em qualquer versão — você aplica com o que já tem." |
  | `MODERNO` | `bolt` | **Recursos modernos** | "Os recursos mais atuais que aceleram seu trabalho e poucos dominam." |
  | `IA` | `sparkles` (azul `#238FE8`) | **Com IA do seu lado** | "A IA como copiloto pra gerar lógica, destravar erros e ganhar tempo." |

  Só a camada IA recebe o azul. `bolt` é energia, não hype: nada de foguete ou varinha.
  `camadaOverride` por curso é exceção; se virar rotina, o texto global está errado.

### 7.2 D10 — Dois modos `[FATO, Ago 2026]`

Toda aula da Camada IA declara o modo.

| | **Modo Pessoal** | **Modo Empresa** |
|---|---|---|
| Onde o modelo roda | Servidor do fornecedor de IA | Dentro do ambiente da empresa |
| O dado sai da empresa? | **Sim** | **Não** |
| Exemplos | Excel + Claude · Power BI + Claude via MCP | IA governada dentro da plataforma de dados |

> **A distinção que quase ninguém faz:** "MCP local" não significa "o dado não sai". A topologia é
> local; o fluxo não é. Os resultados das consultas viajam até o fornecedor. Rende a aula *"Sua
> empresa aprovou a IA — mas você sabe o que está saindo?"*, que abre conversa B2B sozinha.

**Giro de foco:** de **gerar** para **auditar e diagnosticar**. Gerar SQL ou DAX não é a habilidade
escassa; **verificar** é. O erro caro não é a consulta que quebra, é a que roda, devolve um número e
ninguém percebe que o JOIN duplicou linhas.

### 7.3 D11 — Lei anti-defasagem `[FATO, Ago 2026]`

| GRAVAR (dura anos) | NÃO GRAVAR (dura meses) |
|---|---|
| "A IA vai até o dado, não o contrário" | O nome do modelo do momento |
| "Como auditar o que a IA escreveu" | A tela de hoje |
| "O que sai da empresa e o que não sai" | Passo a passo de configuração de integração |

**Teste obrigatório antes de gravar cada aula da Camada IA:** *"esta aula continua verdadeira se o
modelo ou a interface mudar de nome?"* Se não: reescreve, ou vira **material escrito** que se
atualiza em 5 minutos.

## 8. Runtime por pilar (D8 revogado, D12 vale em dobro) `[FATO, Set 2026]`

| Pilar | Runtime | Fonte |
|---|---|---|
| SQL | PostgreSQL + pgAdmin · dataset em dump `.sql` | SQL Blueprint v4.0 |
| Python | Python local + pip + Jupyter | python-blueprint v2.0 |
| Power BI | Power BI Desktop | — |

- **Regra que impede repetir o erro de D8:** blueprint que decide runtime **emenda este doc na mesma
  sessão**. O `courses.md` foi fonte da verdade errada por mais de uma semana.
- **Custo aceito no SQL:** com Postgres local, a instalação vira a aula de maior risco e a maior
  fonte de dúvidas permanentes. Mitigação: FAQ de instalação escrito + teste cronometrado no Windows.
- **Questão aberta** `[ESPEC]`: Postgres gerenciado sem instalação (a plataforma já roda no Neon
  Free). Avaliar **antes** de gravar a Seção 1 do SQL.
- *Aprendizado de D8:* Databricks não é Microsoft. Argumento de fornecedor tem que ser verificado
  antes de virar decisão. História completa em `decisions-archive.md`.

---

# PARTE III — A PÁGINA DO CURSO (landing de venda)

## 9. Princípio: landing de venda montada de campos

`[FATO, operador, Ago e 04/10/2026]` A página de curso é **vitrine completa**, estilo Udemy/Coursera,
com a opção de assinar ao lado, rota **pública montada no servidor**, e **cada uma é uma landing de
venda**.

**Mas é montada de campos estruturados, nunca de texto livre.** `[FATO — trava no CLAUDE.md]`
Com até 15 cursos por idioma em dois idiomas, são até 30 páginas para manter. Campos mantêm o custo
por curso baixo. **Um campo de copy livre (tipo `salesCopy`) ressuscita o problema.**
*Gatilho de reabertura:* dado real de conversão mostrando que a página estruturada converte pior.

Ordem das seções e visual: saem do mock do parceiro de design (`design-lab/GEMINI.md`), aprovado
pelo operador. Outras decisões da página `[FATO, 28/09/2026]`: a seção do autor é a mesma da home ·
etiqueta "Novo" · as **trilhas do curso** no lugar de categorias · **outros cursos da escola** no fim
· o curso também dá certificado ao ser concluído.

## 10. O padrão de campos (como preencher cada um)

Limites são técnicos `[FATO, admin]`. As diretrizes de escrita seguem a marca de origem de cada uma.

### 10.1 Tabela-resumo

| Campo | Limite | Regra de escrita |
|---|---|---|
| **Título** | 60 caracteres | Nome que o público busca + promessa. **Sem ano.** Decisão do operador |
| **Slug** | 80 caracteres | ⚠️ **Irreversível.** Sem ano, minúsculas, hífens. Definir **antes** de cadastrar |
| **Subtítulo** | 120 caracteres | Uma frase de **resultado**. Desfaz a dúvida que o título deixa |
| **Descrição** | 5.000 · ✓ com ≥ 200 palavras | Markdown (negrito, itálico, listas; **sem link**). §10.3 |
| **Nível** | lista fixa | Iniciante · Intermediário · Avançado · Todos os níveis |
| **O que vai aprender** (`learnTags`) | 160 por item | **Tags curtas.** §10.4 |
| **Pré-requisitos** | 160 por item | Honestos e verificáveis. §10.5 |
| **Para quem é** (`personas`) | 160 por item | 3 a 5 personas, uma por linha. §10.6 |
| **Destaques** (`highlights`) | ícone + título + texto | 3 a 4 cards; ícone do conjunto fixo do Lucide (55 nomes). §10.7 |
| **Perguntas frequentes** | opcional | 0 a 2, só dúvida real recorrente. §10.8 |
| **Camadas** | enum | Marcar só as que o curso tem |
| **Materiais exclusivos** | enum | Biblioteca de prompts · Apostila. Arquivos para baixar são **derivados** |
| **Etiqueta** | Novo · Destaque · Mais vendido | "Novo" expira sozinho em 120 dias. §10.9 |
| **Imagem / vídeo promocional** | — | Imagem = catálogo; vídeo = página de detalhe (toca para não membro) |
| **Mensagens** | 2.000 cada | Boas-vindas (1ª aula) e parabéns (conclusão), só para assinantes. Parágrafos curtos, voz do professor, JilsonAI. §10.11 |

**Derivados, nunca digitados:** carga horária, número de módulos e aulas, a faixa de metadados, o
item de arquivos do "Este curso inclui". Por isso **não se escreve número de aulas ou duração na
descrição** `[PROPOSTA, 05/10]`: o número na tela é derivado e o do texto ficaria errado na primeira
edição.

### 10.2 Título, slug e subtítulo

- **O título é decisão do operador.** O agente propõe, compara e aponta risco; não fecha.
- Fórmula que funcionou `[FATO, Antigravity, 05/10]`: **nome da ferramenta ou tema primeiro**
  (é o que se busca) + verbo de resultado. Ex.: *"Google Antigravity: Desenvolva com Agentes de IA"*.
- **Sem ano no título nem no slug** `[PROPOSTA, 05/10]`. Em curso de "publicar e congelar", o ano
  envelhece e o slug não pode ser corrigido.
- O título não repete a Udemy (§3) e não vira o nome do runtime (D12).
- **O subtítulo trabalha para o título:** se o título deixa uma dúvida ("é para programador?"), o
  subtítulo responde.
- **Escola por marca:** a SEO da escola é de marca (Jilson Santana + nome do curso), não de
  "curso de excel". O título não precisa disputar palavra-chave genérica com a Udemy.

### 10.3 Descrição (estrutura padrão) `[PROPOSTA, 05/10, a partir do Antigravity]`

1. **Abre pelo público**, não pela dor genérica: quem trabalha com dados e o próximo passo dele.
2. **O que se constrói:** o projeto do curso, concreto.
3. **"O foco é o método, não só a ferramenta"**, com a lista do que se aprende (verbos que o curso
   cumpre).
4. **Responde à preocupação medida no vidIQ** (custo, instalação, limite, versão).
5. **Fecha com o formato:** aulas curtas, quiz, materiais, **sem números derivados**.

Proibido na descrição: link (o campo não aceita), número de aulas ou horas, "vitalício", "100%",
"domine", menção à Udemy (salvo a linha de transparência, se o operador adotar).
**Conte as palavras antes de entregar** (o ✓ do passo exige ≥ 200).

### 10.4 "O que vai aprender" — tags `[FATO, operador, 05/10/2026]`

**Decisão:** lista de **tags curtas**. Substitui a decisão de 28/09/2026 (frases de até 160 com ✓
em duas colunas).

> ⚠️ **Pendência de consistência:** a dica do admin ainda diz *"Frases curtas que começam com um
> verbo, como 'Criar' ou 'Automatizar'"*. Texto de interface é do operador; enquanto não mudar, o
> próximo curso vai ser preenchido no formato antigo.

Diretrizes `[PROPOSTA, 05/10]`:
- **6 a 10 tags**, de 2 a 5 palavras, substantivadas ("Plan Mode e subagentes", "RAG com seus
  próprios dados").
- **Vocabulário de quem busca**, medido no vidIQ. Jargão sem busca sai ("Fluxo Agent-First" não
  aparece em nenhuma busca medida).
- **Toda tag tem aula por trás.** Se o curso não ensina, não é tag.
- **Uma tag não pode ser a identidade de outro curso do catálogo.** Ex.: "Automação" é a palavra do
  N8N ("Automação de Fluxos"); usá-la no Antigravity confunde os dois na mesma trilha.
- **Nome igual para a mesma coisa em todo o catálogo** ("Engenharia de Prompt", sempre assim).
  Proposta: manter um glossário de tags no Anexo D, para quando as tags virarem filtro ou busca.
- Prefira tags que **respondem a dúvidas reais**: "Instalação e configuração", "Uso e limites do
  plano gratuito".

### 10.5 Pré-requisitos

- Honestos, verificáveis e curtos. Inclua **"Não precisa saber programar"** quando for verdade.
- Corte o enchimento ("vontade de aprender" não ajuda ninguém a decidir).
- Conta, software e versão necessários aparecem aqui, não escondidos na aula.

### 10.6 Para quem é `[FATO, operador, 05/10: um item por linha]`

- **3 a 5 personas**, cada uma numa linha própria, pronta para colar no admin.
- Cada linha: **quem é + o que quer fazer**.
- Exclua compradores fora do funil, mesmo que o curso sirva a eles (ex.: "desenvolvedores" num
  curso vendido como "sem programar"). `[INFER]`
- O público central da escola: quem vive de planilha e quer subir de nível; quem ouve "IA" o dia
  todo e quer aplicar no trabalho; quem se perdeu em curso solto e quer trilha (`content.md` §10).

### 10.7 Destaques (3 a 4 cards)

- Cada card: **título de até ~5 palavras + uma frase**.
- Bons temas, do que já funcionou: projeto completo; resultado na mesma aula; usamos o plano
  gratuito (com a ressalva dos limites); **método que vale além da ferramenta** (obrigatório em
  curso do pilar 5, `[PROPOSTA]`: protege o curso quando a ferramenta muda).
- Ícone do conjunto fixo. Arte sob medida por curso = burnout.

### 10.8 Perguntas frequentes

- **Opcional; a maioria dos cursos deixa vazio.** O FAQ global já cobre a assinatura, e **o
  JilsonAI é o FAQ vivo**.
- Use 1 a 2 itens só onde o vidIQ ou o Q&A da Udemy mostrem dúvida recorrente (ex.: "preciso pagar
  pela ferramenta?").
- Nunca responda com promessa que depende de terceiro ("ilimitado") nem com algo que contrarie
  termos de uso de terceiros (ex.: criar várias contas).

### 10.9 Etiqueta do curso `[FATO, operador, 22/09/2026]`

- Um campo, **separado do `status`** (trava: pôr "NOVO" no enum de status sumiria com o curso do
  site sem erro). Uma etiqueta por curso.
- `NOVO` **expira sozinho em 120 dias** (a data é gravada quando a etiqueta é definida, não o
  `createdAt`). Os outros dois não expiram.
- O rótulo sai do dicionário (`common.badges.*`); o valor fica no banco.
- O slot de destaque da home sempre tem um curso; ao trocar, o operador ajusta a etiqueta do
  anterior.

### 10.10 "Este curso inclui" `[FATO, operador, 04/10/2026]`

- Aparece na página de venda **e** no "Sobre o curso" da página da aula.
- **Derivado, nesta ordem** *(operador: arquivos em 04/10; as outras quatro em 05/10/2026)*: horas
  de vídeo ("3h 20min de vídeo") · artigos (aulas de texto) · aulas grátis ("2 aulas grátis para
  experimentar") · arquivos para acompanhar as aulas · "Legendas em português" (ou em inglês, pelo
  idioma do curso), só quando **todas** as aulas de vídeo têm legenda em dia. Cada linha só
  aparece quando existe. O aluno conta a cadeia publicada; o admin, na prévia, tudo. O número
  quem põe é o código; a palavra é editável em Admin → Textos. O certificado entra com a Fase 6.5.
- **Marcado à mão:** materiais exclusivos de uma lista fixa (Biblioteca de prompts, Apostila).
- **Sem linha de acesso:** o acesso fica no cartão de preço; "vitalício" continua proibido.

### 10.11 Mensagens do curso: boas-vindas e parabéns `[FATO, operador, 05/10/2026, a partir do Antigravity]`

**Como funcionam** `[FATO, admin]`
- **Boas-vindas** chega quando o aluno abre a primeira aula. **Parabéns** chega quando ele conclui
  todas as aulas publicadas. Campo em branco = nenhuma mensagem.
- Até 2.000 caracteres cada. Editor com negrito, itálico e listas, com abas Escrever/Visualizar.
- Chegam como **aviso**, não como página: o aluno lê de passagem, e a prévia mostra só o começo.

**Decisões do operador** `[FATO, 05/10/2026]`
- É o **padrão de todos os cursos** da escola daqui em diante.
- **Enxutas, mas com calor humano.** É o professor falando com o aluno, não um comunicado da
  plataforma.
- **Não precisa copiar o formato da Udemy** (lá eram passos numerados). O texto da Udemy é ponto de
  partida: aproveita as palavras-chave e a mensagem central, e a forma é reescrita.
- **O JilsonAI aparece nas duas**, como apoio ao aluno.

**Forma** (o que fez a versão aprovada funcionar)
- **3 a 5 parágrafos curtos, sem lista.** Em aviso, lista parece formulário; parágrafo soa como
  recado do professor.
- **A primeira linha traz o nome do curso em negrito** (é o que aparece na prévia).
- **Primeira pessoa do professor:** "preparei", "faça junto comigo", "fiquei muito feliz", "conte
  comigo".
- **No máximo um trecho em negrito por parágrafo**, só na promessa ou na conquista principal.
- **Enxugar = tirar ideia repetida, nunca conectivo.** Frases completas, com ritmo. A versão
  telegráfica (cortando conectivos e trocando frases por dois-pontos) foi reprovada pelo operador.
- **Tamanho de referência:** ~900 caracteres cada (Antigravity: 924 e 909). Os 2.000 são teto, não
  meta.
- **Assinatura:** "Abraço," na boas-vindas e "Um grande abraço," nos parabéns, seguido de "Jilson
  Santana".

**Boas-vindas: esqueleto**
1. Acolhida com o nome do curso: *"Que bom ter você aqui no **<curso>**!"*
2. O que o aluno vai construir e a habilidade que leva, com negrito na promessa principal.
3. Como aproveitar: fazer junto, onde estão os materiais (**nome exato da aula**) e a dica que é
   própria do curso (no Antigravity: ajustar o pedido e revisar o que o agente entrega).
4. JilsonAI: *"Travou em alguma parte? Chame o JilsonAI. Ele está aqui para tirar suas dúvidas a
   qualquer hora."*
5. Fechamento caloroso (*"Conte comigo nessa jornada. Bons estudos!"*) e assinatura.

**Parabéns: esqueleto**
1. Parabéns com o nome do curso e uma frase de afeto do professor (*"Fiquei muito feliz de estar
   com você até aqui."*).
2. O que o aluno fez, com as **entregas concretas do projeto** e negrito na conquista principal.
3. Próximo passo: aplicar no cenário dele, o **cuidado específico do curso** (no Antigravity: proteger
   a chave de acesso) e o JilsonAI continuando disponível.
4. Frase-síntese do curso em negrito, como fechamento.
5. Assinatura.

**Checklist antes de entregar**
- **Só cite o que existe na escola no dia da publicação:** nome da aula de materiais, quiz,
  certificado (Fase 6.5), JilsonAI. O que ainda não estiver no ar sai do texto e entra depois numa
  edição. ⚠️ O JilsonAI é fase própria do build (`jilsonai.md`): conferir se está no ar antes de
  publicar um curso que o cite `[INFER: risco de prometer recurso inexistente]`.
- **Precisão técnica:** descreva o que o aluno fez de verdade. Ex.: *"conectou o assistente ao
  Gemini pelo AI Studio"* (o AI Studio é onde se gera a chave), e não "conectou o Gemini ao AI
  Studio".
- **Promessas:** valem as regras da §2. Exagero que não passa na página também não passa na
  mensagem.
- **Sem imagem repetida:** a mesma expressão não aparece duas vezes. Ex.: "o JilsonAI ao seu lado"
  disputava com o fechamento "lado a lado com a IA", então virou "continua por aqui para ajudar".
- **Gramática:** "o passo a passo" (singular); aspas fecham logo depois do nome da aula; dois-pontos
  quando a frase seguinte explica a anterior.
- **Convite para outros cursos:** ficou **fora** do texto aprovado, para não enfraquecer o
  fechamento. Só entra se o operador pedir.
- **Entrega:** os dois textos completos, cada um num bloco de código, prontos para colar. O operador
  cola e confere na aba **Visualizar**.
- **Curso em inglês** `[PROPOSTA]`: mesmo esqueleto, escrito direto em inglês (não traduzido), com a
  voz do professor.

> ⚠️ **Burnout:** são duas mensagens por curso; com o esqueleto, ~10 minutos. Se virar muitas
> rodadas de ajuste fino, entregue a versão do esqueleto e deixe o retoque final para o operador.

Referência de qualidade: as mensagens aprovadas do Antigravity estão no **Anexo A**.

## 11. O admin do curso (como o operador preenche) `[FATO, 27–28/09/2026]`

Sete passos em ordem de preenchimento, cada um com ✓:

| Passo | Campos | ✓ quando |
|---|---|---|
| Informações básicas | título, subtítulo, slug, descrição, idioma, nível | título, subtítulo, nível e descrição ≥ 200 palavras |
| Para quem é | o que vai aprender, pré-requisitos, para quem é | ≥ 1 item em cada lista |
| Conteúdo | módulos e aulas | ≥ 1 aula publicada em módulo publicado |
| Legendas | uma `.vtt` por aula e pela apresentação | todas as aulas de vídeo publicadas com legenda em dia — a mesma conta do "x de y" da tela; a apresentação não conta *(operador, 05/10/2026)* |
| Mídia e destaques | imagem, vídeo, destaques, perguntas, camadas | imagem **e** vídeo promocional |
| Mensagens | boas-vindas e parabéns | as duas escritas *(operador, 05/10/2026)* |
| Publicar | o que falta, status, ordem, link | curso publicado |

- **Visualizar** abre a tela do aluno em qualquer status. A visualização da página **pública**
  espera o bloco C5.
- O aluno entra no curso pela **primeira aula** (a de boas-vindas, que o operador sobe como as
  outras).
- Arquivos: na prática, **um .zip por curso**, numa aula qualquer; só assinantes baixam.
- Idioma do curso só muda enquanto está em rascunho.
- **Ficou fora, de propósito:** preço e cupom por curso · categoria · baixar vídeo · descrição na
  aula de vídeo · envio em lote · legenda em outro idioma · liberação programada · tarefas,
  simulados, laboratório, número de alunos e "Atualizado em".

---

# PARTE IV — PROCESSOS

## 12. Playbook de transposição: Udemy → Escola

O processo que produziu a primeira transposição (Antigravity, 04–05/10/2026). **Um curso por
sessão.** O conteúdo não muda; muda o texto e a página.

### Etapa 0 — Portões (antes de escrever qualquer coisa)

| Portão | Pergunta | Se falhar |
|---|---|---|
| Slate | O curso está no slate (§17)? | Regra de entrada (§4) antes de tudo |
| Contrato | Curso encomendado pela UB tem cláusula de exclusividade ou prazo? | **Ler o contrato** antes de pôr na escola (ex.: PL-300 PT) |
| Atualidade | A ferramenta mudou desde a gravação? (pilar 5 principalmente) | Conferir as aulas de instalação e interface; se defasado, aciona D11 (manter ou aposentar, **não regravar tudo**) |
| Vídeos | As aulas citam a Udemy ("avalie na Udemy", "use o Q&A")? | Levantar nas transcrições (Descript) e anotar; nota na aula ou corte, sem regravar |

Também vale: **não colocar divulgação da escola dentro dos cursos da Udemy** `[INFER — confirmar
na política de promoção vigente da Udemy]`.

### Etapa 1 — Inventário da Udemy (o operador manda)

Prints ou texto de: título · subtítulo · descrição · "O que você aprenderá" · requisitos · "Para
quem é" · "Este curso inclui" · currículo (seções, aulas, durações). **A página da Udemy não é
alterada** `[PROPOSTA]`: mexer numa página que converte traz risco sem ganho para a escola.

### Etapa 2 — Contexto

Ler a ficha do curso (Anexo B), a camada, o pilar, a trilha e se o curso está no lançamento.

### Etapa 3 — vidIQ (3 consultas padrão, §14)

1. `research` com o nome da ferramenta ou tema, `country: BR`
2. `country_search` exato, `country: BR`
3. `questions`, `language: pt`

Montar a tabela de demanda **com data** e registrar os números na ficha.

### Etapa 4 — Leitura da demanda

Responder por escrito, separando fato de inferência:
- Qual é a **dúvida nº 1**? (No Antigravity: "como usar", não "o que é agente".)
- Que **jargão** a copy da Udemy usa e ninguém busca?
- Qual **preocupação** aparece (custo, limite, instalação)?
- Há **sinal de defasagem** (pico de "atualizou", "versão 2.0", "novo")?
- O público **compara** com que ferramenta?

### Etapa 5 — Auditoria de promessas da copy da Udemy

Listar o que não passa no teste da §2: "100%", "custo zero", "evitar", "domine", "vitalício",
promessa que depende de terceiro, persona fora do funil, tag sem aula por trás.

### Etapa 6 — Rascunho campo a campo, comparado

Entregar **parte por parte**, na ordem do admin, com a coluna "Udemy (atual)", a coluna "Escola
(novo)" e o **porquê** de cada mudança `[FATO, operador, 05/10: comparar parte por parte]`:

Título → Slug → Subtítulo → Descrição → O que vai aprender → Destaques → Pré-requisitos → Para quem
é → Materiais → Perguntas frequentes → Mensagens (§10.11; aqui não há coluna Udemy × Escola, entregam-se
os dois textos finais prontos para colar).

### Etapa 7 — Formato de entrega

- **Cada item de lista numa linha própria**, pronto para copiar e colar `[FATO, operador, 05/10]`.
  Nunca juntar itens com "·" numa célula de tabela.
- Contagem de caracteres em título, subtítulo e slug; **contagem de palavras na descrição**.
- Marcar o que é `[INFER]` sobre o público.

### Etapa 8 — Decisão e cadastro

O operador decide (título principalmente), cadastra no admin e marca as camadas e os materiais.
**O texto vigente vive no admin**; este doc guarda as **decisões** e os dados (Anexo B), não uma
segunda cópia do texto que ficaria velha.

### Etapa 9 — Antes de publicar

Legendas · aula de boas-vindas · .zip de materiais · menções à Udemy tratadas · slug conferido ·
etiqueta · mensagens escritas e conferidas em Visualizar, citando só recursos que já estão no ar
(§10.11).

### Etapa 10 — Registro

Atualizar a ficha (Anexo B): decisões, dados do vidIQ com data e pendências.

> ⚠️ **Burnout:** transposição é texto, não câmera. Se uma transposição começar a pedir regravação,
> pare e leve a decisão ao operador (D11 / rotação). Uma por sessão; a fila não tem prazo de banca.

## 13. Playbook de curso novo

**Fluxo:** régua (§13.1) → mapa de conteúdo (§17) → **vidIQ valida demanda e aulas** (§14) →
abre o `.md` do curso (`curso-<slug>.md`, com lista final de aulas, achados do vidIQ e roteiro) →
grava só o relevante → página pelo padrão da Parte III.

**Política vigente** (§5): enquanto a base não for sólida, curso novo nasce de oportunidade
Udemy/UB e é compartilhado com a escola.

### 13.1 A régua (1 a 5 por eixo)

| Eixo | Pergunta | Quem responde |
|---|---|---|
| Demanda | Tem volume de busca ou audiência puxando? | vidIQ |
| Evergreen | Dura anos ou defasa rápido? | `strategy.md` + `[INFER]` |
| B2B fit | Empresa paga para treinar o time nisso? | `[INFER]` |
| DNA "IA no DNA" | É demonstração viva de IA bem usada? | `[INFER]` |
| Autoridade Jilson | Está no núcleo de marca e conhecimento? | `[FATO]` |
| Contribuição marginal | Quanto adiciona ao que já existe? | `[FATO]` |
| Diferenciação | Os concorrentes já fazem? | `strategy.md` |
| Esforço de produção | Quanto se grava do zero? | `[INFER]` |

**Melhor candidato:** demanda alta + reaproveitamento alto + DNA alto + esforço baixo. Demanda alta
com esforço altíssimo = risco de burnout: entra depois, ou não entra.
**Máximo de 1 curso "do zero" por ciclo**, intercalado com reaproveitáveis (T3).

### 13.2 ROI de curso numa assinatura (T7) `[INFER]`

A receita é `assinantes × R$ 99,90`. O curso nº 13 não aumenta o que já se recebe de quem assina.
**ROI de curso novo = assinantes novos que ele traz + cancelamentos que evita.** Curso amplo mas
não buscado retém; curso de nome buscado (`curso de sql`) adquire. **A ordem importa mais que a
amplitude.**

## 14. vidIQ: o parceiro que mede antes

O vidIQ valida **antes** de escrever ou gravar e decide: palavra-campeã (nome do curso e vídeo de
funil), ângulo (posicionamento), lacuna (módulo exclusivo), quais aulas novas valem e que copy usar.

### 14.1 Consultas por situação

| Situação | Ferramenta e modo |
|---|---|
| **Transposição** (padrão, ~15 créditos) | `keyword_research` modos `research` (BR) + `country_search` (BR) + `questions` (pt) |
| Curso novo: demanda | as três acima + `matching_terms` na palavra-campeã |
| Curso novo: ângulo | `youtube_search` + `outliers` (`language: pt`) |
| Tendência | `keyword_research` modo `rising` (`language: pt`) |
| O que já funcionou no canal | `channel_videos` do próprio canal + estatísticas |
| Concorrência | `similar_channels` |
| Inglês | os mesmos modos com `country: US` e `language: en` |

### 14.2 Cuidados de leitura `[FATO, observado em 05/10/2026]`

- Os números são **estimativas** do vidIQ. Registre com data e trate como ordem de grandeza.
- O índice de perguntas "pt" **mistura resultados em espanhol**. Descarte-os.
- Volume de país para termos curtos tem **ruído** (termos sem relação entram). Prefira frases.
- O crescimento (`searchDemandGrowthPct`) é contra a base de 30 dias: pico curto não é tendência.
- **Nunca use número do vidIQ em texto público.**

> **Sustentabilidade:** rode só o **próximo curso da fila**. Rodar tudo de uma vez esgota cota e
> energia. Bônus: a mesma medição serve ao curso **e** ao vídeo do YouTube que aponta para ele.

## 15. Radar de tendências e demanda

O doc também serve para mapear o que vem. **O radar alimenta decisões; não as toma.** Uma tendência
só vira curso pela regra de entrada (§4).

### 15.1 Cadência `[PROPOSTA, 05/10]`

- **Trimestral:** `rising` em pt para os temas dos pilares + recheck das palavras-campeãs do slate.
  Uma sessão, um registro na §18.
- **Por curso do pilar 5, a cada trimestre:** procurar sinais de defasagem.
- ⚠️ Mais que isso vira trabalho que não gera assinante. **Distribuição é o gargalo, não catálogo.**

### 15.2 O que cada sinal aciona

| Sinal | Aciona |
|---|---|
| Tema novo com demanda PT medida e comprador do mesmo funil | Candidato aos slots livres (§19), com a regra de entrada |
| Pico de "atualizou", "versão X", "novo" numa ferramenta do slate | Conferir aulas de instalação e interface → D11 → manter ou aposentar |
| Queda sustentada de busca de um curso da PRATELEIRA | Gatilho de aposentadoria (D9) |
| Dúvida recorrente no Q&A da Udemy | Tag, FAQ do curso, aula da Camada IA ou vídeo do YouTube |
| Comparação frequente ("X vs Y") | Destaque "método que vale além da ferramenta" ou vídeo autoral |

**Fonte de ideias além do vidIQ** `[FATO]`: o Q&A real da Udemy (dúvida repetida = título validado
e alimenta o golden set do JilsonAI), alunos corporativos, análises próprias do Jilson.

## 16. Inglês: a escola bilíngue `[FATO, operador, 14/09/2026]`

- **No máximo 2 idiomas.** Teto de **15 cursos por idioma**; rotação e regra de entrada valem para
  cada idioma separadamente.
- **Curso em inglês é outro curso:** vídeos próprios, slug próprio, **regravado**, nunca tradução
  do mesmo registro. O idioma do curso é obrigatório na criação.
- **Idioma é filtro, nunca portão:** uma assinatura dá acesso aos cursos dos dois idiomas.
- Uma URL por idioma: PT sem prefixo, EN em `/en` com segmentos em inglês.
- Trilha só aceita itens do mesmo idioma (o servidor recusa).
- Dois canais de YouTube, nunca misturados: o canal EN é `@jilsonen`.
- O lado EN nasceu ligado mesmo sem curso; o botão de assinar nas páginas em inglês só acende com
  ≥ 1 aula em inglês publicada.
- **Estado** `[FATO, Ago 2026]`: o plano do PL-300 em inglês foi abandonado; a produção em inglês
  ficou condicionada à aceitação no LinkedIn Learning.

**Transposição para o inglês** `[PROPOSTA, 05/10]`:
- O playbook da §12 vale igual, com o vidIQ em `country: US` / `language: en`.
- **A copy é escrita em inglês para o público em inglês, não traduzida:** outro vocabulário de
  busca, outras dúvidas, outros concorrentes.
- Critério de ordem: NÚCLEO e EXTENSÃO evergreen primeiro (Excel, Power BI, SQL), PRATELEIRA por
  último. Demanda EN medida antes de gravar.

---

# PARTE V — ESTADO DO CATÁLOGO (o que muda; conferir a data)

## 17. O slate de 12 (PT) `[FATO, lista final do operador, Set 2026]`

🟢 reaproveitamento alto · 🟡 misto · 🔴 do zero ou alta defasagem.
Estado: ✅ publicado · 📐 blueprint fechado · ⬜ sem blueprint. Tipo: U = Udemy, E = Escola.

| # | Curso | Est. | Pilar | Camada | Tipo | Resumo |
|---|---|:-:|:-:|---|:-:|---|
| 1 | **Excel + IA — Lógica de Negócios & Fórmulas Dinâmicas** 🟢 | ⬜ | P1 | Núcleo | U+E | Remontagem do carro-chefe. Maior funil, B2B 5/5. §17.2 |
| 2 | **Excel + IA — ETL e Automação com Power Query** 🟢 | ⬜ | P1 | Núcleo | U+E | Curadoria do `S15` |
| 3 | **Excel + IA — Analytics & Tabelas Dinâmicas** 🟢 | ⬜ | P1 | Núcleo | U+E | |
| 4 | **Excel + IA — Dashboards Executivos & Storytelling** 🟢 | ⬜ | P1 | Núcleo | U+E | Abre pela IA |
| 5 | **Excel + Claude IA** 🟢 | ✅ 11/07/26 | P1 | Núcleo | U+E | Publicado na Udemy |
| 6 | **Power BI + IA** 🟡 | ⬜ | P2 | Núcleo | U+E | "Relatórios que se explicam sozinhos". Lacuna que a DataTraining deixa |
| 7 | **PL-300** 🟡 | ✅ 14/08/26 | P2 | Núcleo | U+E | Certificação, intenção alta. Absorve a modelagem de prova |
| 8 | **Google Antigravity** 🔴 | ✅ 18/09/26 | P5 | Prateleira | U+E | **Selo de vanguarda, não receita.** Publicar e congelar |
| 9 | **SQL + IA — Análise de Dados e Negócios** 🟡 | 📐 v4.0 | P3 | Extensão | U+E | 42.436 buscas/mês BR. Runtime: PostgreSQL |
| 10 | **Python + IA para Analistas** 🟡 | 📐 v2.0 | P4 | Extensão | U+E | O recorte "para analistas" salva do tema concorrido. Absorve o módulo Git |
| 11 | **Claude IA + Code para Dados e Negócios** 🔴 | ⬜ | P5 | Prateleira | E | Do zero. A cerca está no título. ⚠️ T9 |
| 12 | **N8N + IA — Automação de Fluxos** 🔴 | ⬜ | P5 | Prateleira | E | Título sem a cerca do sufixo · demanda PT nunca validada · muda rápido. ⚠️ T9 |

**Cancelados sem nunca terem sido produzidos** (não contam como remoção):

| Cancelado | Motivo |
|---|---|
| Databricks conceitual | Perdeu a âncora com a revogação de D8. Demanda 2.975/mês BR |
| Git para Analistas | Virou módulo de ~15 min no curso 10 (o `.gitignore` de credenciais é o que justifica) |
| Projeto End-to-End: Agente Autônomo | Comprador fora do funil |
| Modelagem de Dados (Star Schema) | Redundante com 6 e 7; e o título puxava para projeto de banco, comprador de engenharia |

**Lançamento** `[FATO, operador, Set 2026]`: **5 cursos**: Agentic AI na Prática (destaque da home)
· Google Antigravity · Excel + Claude IA · Power BI + IA · PL-300. O teto continua máximo, não meta.
Sem trilha em destaque (o catálogo ainda não completa uma trilha) e **sem contagem de cursos na
home** (com cinco, o número trabalharia contra). Quem mostra volume é a página de cada curso.

> ⚠️ **T10 — Agentic AI está no lançamento e fora do slate** `[INFER]`. Pela regra de entrada, ele
> precisa nomear o slot que ocupa (livre) ou quem sai. O operador já perguntou se ele substituiria
> o N8N. **Decisão do operador.**
>
> ⚠️ **T11 — Power BI + IA está no lançamento com estado ⬜** `[INFER]`. Se ele entra como
> transposição do "Power BI Básico Avançado" (mesmo conteúdo das seções de Power BI do carro-chefe),
> isso precisa estar escrito. **A confirmar.**

### 17.1 Fila de transposição Udemy → Escola

O operador estima **5 ou 6 cursos** a transpor. Estado conhecido em 05/10/2026 (a confirmar):

| Curso na Udemy | Vai para | Estado da transposição |
|---|---|---|
| Google Antigravity: IA Generativa na Prática com Gemini 2026 | #8 | **Título decidido; resto do texto em revisão** (Anexo A) |
| Excel + Claude IA: Inteligência Artificial, Análise de Dados | #5 | Pendente |
| PL-300 em português (encomendado pela UB) | #7 | Pendente · ⚠️ ler o contrato UB primeiro |
| Power BI Básico Avançado — Formação Especialista + Dashboard | #6? (T11) | A confirmar o destino |
| SQL para Análise de Dados e Negócios (em produção para a UB) | #9 | Quando publicado |
| N8N + IA Automação de Fluxos | #12? | A confirmar se já existe gravado (o slate diz ⬜) |
| Agentic AI (candidatura Udemy) | destaque do lançamento (T10) | Depende da aprovação na Udemy |

O carro-chefe "Excel + Power BI + DAX — 7 Cursos em 1" **não se transpõe inteiro**: vira os
minicursos 1–4 (§17.2), sob a tensão T9.

### 17.2 Mapa de conteúdo: carro-chefe → escola

**O ativo real** `[FATO]`: "Excel + Power BI + DAX — 7 Cursos em 1" · 30 seções · 499 aulas · 53h42
· 4,8★. Não tem SQL, Python nem IA standalone.

- **Excel, fórmulas (~7h):** `S1` Fórmulas/Funções · `S2` Recursos Adicionais · `S3`–`S5` Avançadas
  I–III · `S6` **PROCX**
- **Excel, dados, gráficos e dinâmicas (~9h):** `S7` Gerenciamento/Análise · `S8` Impressão · `S9`
  Gráficos (cascata, combinação, mapa, pareto) · `S10` TD I · `S11` TD II · `S12` TD III
  (**Relacionamentos + Power Pivot** + Macros)
- **Excel, dashboards (~5,5h):** `S13`–`S14`
- **Excel, ETL (~5h):** `S15` Power Query (importar, limpar, Left Join, acrescentar)
- **Excel, automação (~7h):** `S16` Macros · `S17` VBA
- **Excel, análise e entrega (~6h):** `S18` Cenários · `S19` Atingir Metas/Solver · `S20` Segurança
  · `S21` Projeto Final
- **Excel, básico e extras (~3h):** `S22` Primeiros Passos · `S23` Dicas
- **Power BI + DAX (~11,5h):** `S24` Intro · `S25` Import/Transform · `S26` **Modelo de Dados** ·
  `S27` **DAX** · `S28` Dashboard · `S29` Publicação · `S30` Conclusão

Legenda: 🟦 Universal (reaproveita) · 🟩 Moderno · 🟧 IA (exclusiva da escola). ✅ já existe · 🎬
gravar novo (passa pelo filtro da §4).

**Minicurso 1 — Lógica de Negócios & Fórmulas Dinâmicas (~3h)**

| Módulo | Conteúdo | Fonte | Camada | Gravar? |
|---|---|---|:-:|:-:|
| 1. Base Lógica Inquebrável | Ordem de execução, SE, E/OU, SEERRO | `S1`+`S3` | 🟦 | ✅ |
| 2. O Motor de Análise | SOMASE/CONT.SE, família SES, PROCV, ÍNDICE+CORRESP | `S3`+`S4` | 🟦 | ✅ |
| 3. O Novo Padrão | PROCX, PROCV vs PROCX | `S6` | 🟩 | ✅ +1🎬 |
| 4. Matrizes Dinâmicas | FILTRO, ÚNICO, CLASSIFICAR/CLASSIFICARPOR | — | 🟩 | 🎬 |
| 5. Copiloto de Fórmulas | Prompt para Excel, diagnosticar #N/D e #VALOR!, lógica via IA | — | 🟧 | 🎬 |

**Minicurso 2 — Power Query (~3,5h), curadoria do `S15` (5h11)**

| Módulo | Conteúdo | Fonte | Camada | Gravar? |
|---|---|---|:-:|:-:|
| 1. Fim do Trabalho Manual | Sobre PQ, importar Excel, pasta de arquivos | `S15` | 🟦 | ✅ |
| 2. Lavanderia de Dados | Limpeza, tipos, dividir colunas | `S15` | 🟦 | ✅ |
| 3. Modelagem B2B | Mesclar (Left Join), Acrescentar | `S15` | 🟦 | ✅ |
| 4. Automação em Nuvem | SharePoint/OneDrive, atualização em 2º plano | — | 🟩 | 🎬 `[ESPEC]` |
| 5. IA para Engenharia de Dados | Mascarar CPF, scripts M e RegEx via IA | — | 🟧 | 🎬 |

**Minicurso 3 — Analytics & Tabelas Dinâmicas (~2,5h)**

| Módulo | Conteúdo | Fonte | Camada | Gravar? |
|---|---|---|:-:|:-:|
| 1. Padrão Ouro | Preparar dados, criar TD, visualização | `S10` | 🟦 | ✅ |
| 2. Manipulação e Cálculos | Operação de campo, campo calculado | `S10`/`S11` | 🟦 | ✅ |
| 3. Interatividade | Segmentação, linha do tempo | `S11` | 🟦 | ✅ |
| 4. Escalabilidade | Relacionamentos, Power Pivot | `S12` | 🟩 | ✅ |
| 5. Analista Aumentado | CSV no Claude, perguntas de negócio, variações | — | 🟧 | 🎬 |

**Minicurso 4 — Dashboards Executivos & Storytelling (~3h), abre pela IA**

| Módulo | Conteúdo | Fonte | Camada | Gravar? |
|---|---|---|:-:|:-:|
| 1. Storytelling com IA | KPIs com JilsonAI, paletas via prompt, wireframe | — | 🟧 | 🎬 |
| 2. Arquitetura de Dashboards | Layout, planilha auxiliar, controles | `S13`/`S14` | 🟦 | ✅ |
| 3. Visualização Essencial | Gráficos, formatação condicional | `S9` | 🟦 | ✅ |
| 4. Visuais Modernos | Cascata, mapa, combinação, ícones SVG | `S9`+parcial | 🟩 | ✅ +🎬 |
| 5. Entrega B2B | Proteger/ocultar, coautoria OneDrive | `S20`+parcial | 🟩 | ✅ +🎬 |

`[INFER]` A gravação genuinamente nova encolhe para: matrizes dinâmicas · PQ em nuvem · ícones SVG
e coautoria · **toda a Camada IA**. O resto é curadoria.

**Power BI** `[INFER]`:

| Curso | Base | Camada nova (escola) |
|---|---|---|
| 6 · Power BI + IA | `S24`–`S29` (= Power BI Básico Avançado) | 🟧 Copilot, medida DAX via Claude, narrativa de insight, documentação via IA · ~20 min de "o modelo errado não dá erro, dá número" (direção de filtro, granularidade, fan-out) |
| 7 · PL-300 | `S25`–`S29` cobrem boa parte | simulados + JilsonAI tutor de questões |

**A sobra do Excel** (~16h fora dos minicursos; o pilar 1 está cheio, então só entra deslocando):

| Bloco | Tempo | Candidato a | Recomendação |
|---|---|---|---|
| Macros + VBA (`S16`+`S17`) | ~7h | Minicurso "Macros/VBA + Claude" | Forte: gravado + Camada IA + B2B. Validar "vba" no vidIQ |
| Excel Básico (`S22`) | ~3h | "Excel do Zero" | Decidir papel (T5) |
| Cenários/Solver (`S18`/`S19`) | ~1,5h | Módulo opcional | Só com busca medida |
| Projeto Final (`S21`) | ~4h | Capstone de trilha | Reaproveitar |
| Impressão/Dicas | ~0,5h | Aulas avulsas pesquisáveis | Não viram curso |

## 18. Demanda medida (registro vivo, sempre com data)

| Data | Termo | Volume | Escopo | Leitura |
|---|---|---:|---|---|
| Ago/2026 | `sql` | 42.436/mês | BR | Maior motor de aquisição fora do Excel |
| Ago/2026 | `curso de sql` | 14.069/mês | BR | Intenção de compra explícita |
| Ago/2026 | `curso sql` | 5.573/mês | BR | — |
| Ago/2026 | `databricks` | 2.975/mês | BR | ~14x menor que `sql`; zero outlier PT relevante. Sustenta D12 |
| 04/10/2026 | `antigravity` (com ruído) | 116K | BR | Termo curto; ruído alto |
| 04/10/2026 | `google antigravity` | 15,1K | BR | 279K global, +13% |
| 04/10/2026 | `como usar antigravity` | 35,2K, +57% | perguntas pt | **Dúvida nº 1** |
| 04/10/2026 | `como configurar o antigravity` | 14K, +85% | perguntas pt | Em alta |
| 04/10/2026 | `como instalar antigravity` | 13,2K (BR 14,8K) | perguntas pt | O curso cobre |
| 04/10/2026 | `antigravity ilimitado` / `gratis` / `quantas contas posso criar` | 33K / 16K / 8,9K | BR / BR / pt | Custo e limite preocupam |
| 04/10/2026 | `antigravity atualizou` / `novo antigravity` / `atualização` | ~32–34K cada | BR | **Sinal de defasagem** (§15.2) |
| 04/10/2026 | `google antigravity 2.0` | 21,7K, +125% | global (BR 8K) | Idem |
| 04/10/2026 | `antigravity vs claude code` | ~12K | BR | O público compara ferramentas |
| 04/10/2026 | `curso de antigravity` | 10,4K | BR | Intenção de curso em PT |
| 04/10/2026 | `vibe coding` | 56,3K | BR | Termo vizinho de alto volume `[ESPEC: não testado na copy]` |

## 19. Prioridade e candidatos

**Ordem de gravação** `[FATO, decisão]`: **Excel + IA primeiro.** Máximo reaproveitamento, mínimo
risco, maior funil. Registrado porque momentum é como operador solo constrói a coisa certa na ordem
errada.

**Notas da régua (Ago 2026, numeração atual; não recalculadas)** `[INFER]/[ESPEC]`:

| # | Curso | Demanda | Evergreen | B2B | DNA | Reaproveit. | Diferenc. | Esforço (5 = fácil) |
|---|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| 1–4 | Excel + IA | 5? | 5 | 5 | 5 | 5 | 4 | 5 |
| 6 | Power BI + IA | 5? | 4 | 5 | 5 | 4 | 5 | 3 |
| 7 | PL-300 | 4? | 4 | 4 | 3 | 3 | 3 | 2 |
| 9 | SQL | **5** (medido) | 5 | 4 | 5 | 2 | 4 | 2 |
| 10 | Python | 4? | 5 | 4 | 5 | 2 | 3 | 2 |
| 12 | N8N | 2? | 3 | 4 | 5 | 1 | 5 | 2 |
| 8 | Antigravity | medido Out/26 | 1 | 2 | 5 | 1 | 5 | 2 |

**Candidatos reservados para os 3 slots livres** (nenhum iniciado, nenhum decidido):

| Candidato | Pilar | Por quê | O que falta |
|---|---|---|---|
| **SQL nº 2 — crash de entrevista / prática** | P3 | Reempacotamento: dataset, runtime e 87 aulas vão existir. O mais barato, no termo mais buscado | Decisão |
| **Estatística Aplicada (Python)** | P4 | Única lacuna de **competência**: os 12 ensinam ferramenta; nenhum ensina se o número significa algo | Recorte de 2h–2h30 |
| **DAX** | P2 | DAX erra em silêncio (filter context) | `dax` no vidIQ + teste de canibalização com 6 e 7 (se não saírem 3 aulas que não cabem neles, é módulo) |
| Macros/VBA + Claude · Excel do Zero | P1 cheio | §17.2 | Só deslocando um Excel |
| Agentic AI | P5 | Lançamento (T10) | Regra de entrada |
| Carreira / portfólio | — | Aquisição, não competência | Fora do centro de dados |

## 20. Benchmark: analystbuilder.com `[FATO, inspeção de ago/2026]`

Alex Freberg ("Alex The Analyst"): 1,42M inscritos, 465 vídeos, ~2 uploads/semana, **20 cursos**.

| Nossa decisão | O que a inspeção confirmou |
|---|---|
| Teto pequeno | 20 cursos exatos, de 1h a 12h |
| D12 (runtime ≠ título) | "Modern Data Workflows with Databricks", não "Curso de Databricks" |
| Regra do satélite | Todos os títulos com *for Data Professionals*: o sufixo é a cerca |
| Certificado | Padrão da categoria; nosso diferencial é o certificado **por competências** |
| D10 | IA governada como aula gravada funciona |

Inspirou: Git (virou módulo) · crash courses de entrevista · banco de questões a partir do Q&A da
Udemy. **Não copiar:** R e Tableau · gamificação · duas plataformas de nuvem · cursos de 12h.

> ⚠️ **A assimetria:** ele lançou 20 cursos porque tinha um milhão assistindo; não conseguiu o
> milhão porque tinha 20 cursos. **Distribuição é o gargalo, não produto.**

## 21. Trilhas (pilar ≠ trilha)

O **pilar** controla slots do catálogo; a **trilha** é a jornada do aluno e atravessa pilares. Um
curso tem um pilar e pode estar em várias trilhas.

| Trilha | Cursos | Pilares |
|---|---|---|
| 1 · Comece por aqui (Fundamentos) | Excel + IA 1–4 · Excel + Claude IA | P1 |
| 2 · Business Intelligence | Power BI + IA · PL-300 | P2 |
| 3 · Dados + Código | SQL + IA · Python + IA | P3, P4 |
| 4 · Automação & IA Aplicada | Claude Code · N8N · Antigravity (vitrine) | P5 |

A Trilha 2 perdeu o pré-requisito de modelagem (curso cancelado): a modelagem de prova vive no
PL-300 e o diagnóstico de modelo errado entra no curso 6. **Emendar `content.md` §4 junto.**

## 22. Tensões e decisões em aberto

| # | Tensão | Estado |
|---|---|---|
| T3 | Cursos "do zero" = risco de burnout | **Máx. 1 por ciclo**, intercalado. Válido |
| T4 | Antigravity é selo, não curso (30–60 min, aposentável) | Publicado com ~2h35. Vale como regra de manutenção: não regravar |
| T5 | Sobra do Excel: Macros/VBA? Excel do Zero? | Decisão do operador |
| T6 | Demanda da maior parte do catálogo ainda `[ESPEC]` | vidIQ curso a curso |
| T8 | Concentração de fornecedor no ambiente | Mitigada: SQL que roda em qualquer lugar |
| **T9** | **Política "nenhum exclusivo / não regravar" × Excel 1–4, Claude Code e N8N** | **Decisão do operador** (§5) |
| **T10** | **Agentic AI no lançamento e fora do slate** | **Decisão do operador** (§17) |
| **T11** | **Power BI + IA no lançamento com estado ⬜** | **A confirmar** (§17) |
| **T12** | **Tags (05/10) × dica do admin e decisão de 28/09** | Atualizar a dica do admin (texto do operador) |
| **T13** | **Antigravity 2.0: as aulas de instalação e interface ainda valem?** | Conferir 3 aulas antes do lançamento (Anexo A) |
| T14 | Linha de transparência "também na Udemy" | Decisão do operador (§2) |
| T15 | Postgres gerenciado sem instalação no SQL | Avaliar antes de gravar a Seção 1 (§8) |

## 23. Próximos passos (um de cada vez)

1. **Fechar o Antigravity** (Anexo A): revisar o texto, conferir as 3 aulas da versão 2.0,
   cadastrar.
2. **Decidir T10 e T11** (o lançamento depende disso).
3. **Transpor o próximo curso do lançamento**, pelo playbook (§12), uma sessão por curso.
4. **Ajustar a dica do admin** para tags (T12).
5. Depois do lançamento: rodar vidIQ no Excel + IA e abrir `curso-excel-ia.md`.

> ⚠️ **Precedência:** este doc projeta o catálogo; **catálogo não gera assinante, distribuição
> gera.** Transpor texto pode andar agora; câmera nova espera o build e o canal andarem.

---

# ANEXOS

## Anexo A — Ficha de referência: Google Antigravity (primeira transposição)

> Exemplo completo do padrão. **O texto vigente é o do admin**; este anexo guarda as decisões e o
> raciocínio para servir de modelo. Estado em 05/10/2026.

**Identidade**
- Udemy: "Google Antigravity: IA Generativa na Prática com Gemini 2026" · publicado em 18/09/2026 ·
  R$ 79,90 · 7 seções, 45 aulas, 2h35 · projeto: assistente virtual da rede fictícia "Hotéis Smart".
- Escola: slate #8 · Pilar 5 · PRATELEIRA · Trilha 4 · **lançamento**.

**Decisões do operador**
- Título: **"Google Antigravity: Desenvolva com Agentes de IA"** (48/60) `[FATO, 05/10/2026]`
- O que vai aprender = tags `[FATO, 05/10/2026]`
- Para quem é: um item por linha `[FATO, 05/10/2026]`

**Rascunho em revisão pelo operador** `[PROPOSTA, 05/10/2026]`
- Slug: `google-antigravity-agentes-ia` (sem ano) — ⚠️ irreversível, confirmar antes de cadastrar
- Subtítulo (108/120): *Construa uma aplicação com IA de ponta a ponta usando só linguagem natural,
  sem precisar saber programar.* (o "Desenvolva" do título pode soar para programador; o subtítulo
  desfaz)

**Descrição (229 palavras):**

```
Você já trabalha com planilhas, relatórios ou dashboards e ouve falar de IA o dia todo. O próximo passo não é virar programador: é aprender a dirigir uma IA que programa por você.

Neste curso você usa o **Google Antigravity**, a plataforma de agentes de IA do Google, para construir do zero um assistente inteligente completo. Ele responde com base no seu próprio arquivo de conhecimento, faz cálculos, funciona em três idiomas e aceita comandos de voz. Você descreve o que quer em português, o agente planeja e executa, e você revisa.

**O foco é o método, não só a ferramenta.** Você aprende a:

- escrever um pedido que o agente entende de primeira;
- usar o Plan Mode para o agente planejar antes de agir;
- dar memória ao projeto com o arquivo GEMINI.md;
- delegar tarefas em paralelo com subagentes;
- revisar o trabalho da IA com olhar crítico, em vez de aceitar tudo;
- controlar formato, tom e escopo das respostas com engenharia de prompt.

Utilizamos o plano gratuito do Google Gemini e AI Studio, sem servidor e sem banco de dados para configurar. Como os limites de uso existem e mudam, você também aprende a acompanhá-los para não ser pego de surpresa no meio do projeto.

Aulas curtas e diretas, com quiz ao fim de cada seção, biblioteca de prompts e os arquivos do projeto para acompanhar.
```

**O que vai aprender (tags), uma por linha:**

```
Instalação e configuração
Plan Mode e subagentes
Memória de projeto (GEMINI.md)
Engenharia de Prompt
RAG com seus próprios dados
API do Gemini (AI Studio)
Revisão de código gerado por IA
Uso e limites do plano gratuito
Criação de MVPs
Apps com IA sem programar
```

Se o limite for 8, saem "Memória de projeto" e "API do Gemini" (já estão na descrição).

**Comparação com o que estava no admin e por quê:**

| Antes | Depois | Motivo |
|---|---|---|
| Fluxo Agent-First | Plan Mode e subagentes | Jargão sem nenhuma busca medida |
| RAG (Contexto de IA) | RAG com seus próprios dados | Mostra o benefício |
| Automação sem Código | Apps com IA sem programar | Expectativa errada (quem busca "automatizar tarefas" espera automação do computador) + é a palavra do N8N |
| API do Gemini | API do Gemini (AI Studio) | O termo que o aluno vê na tela |
| Criação de MVPs · Engenharia de Prompt | mantidas | — |

**Destaques:**

```
Do zero ao app funcionando — Você termina com um assistente completo, construído aula a aula.
Resultado na mesma aula — Cada aula entrega algo que você testa no navegador na hora.
Usamos o plano gratuito — Google Gemini e AI Studio no plano gratuito, sem servidor e sem banco de dados. Você aprende a acompanhar os limites de uso.
Método que vale além da ferramenta — Planejar, dar memória e revisar o agente é o mesmo raciocínio em outras ferramentas de IA.
```

**Pré-requisitos:**

```
Base em Excel, Power BI ou lógica de negócio.
Computador com internet e uma conta Google gratuita.
Não precisa saber programar.
```

**Para quem é:**

```
Analistas e usuários de Excel ou Power BI que querem criar as próprias ferramentas com IA, sem esperar o time de TI.
Gestores que querem tirar uma ideia do papel e testar um protótipo funcional.
Quem já usa ChatGPT ou Gemini no chat e quer passar para agentes que executam o trabalho.
Quem quer usar o Antigravity de verdade, do primeiro acesso a um projeto completo.
```

"Desenvolvedores" saiu: comprador fora do funil e enfraquece o "sem programar".

**Materiais e FAQ**
- Materiais: Biblioteca de prompts (os arquivos do projeto aparecem sozinhos com o .zip).
- FAQ (opcional, 1 item): *"Preciso pagar pelo Google Gemini ou pelo AI Studio?"* → *"Não. No curso utilizamos
  o plano gratuito do Google Gemini e AI Studio. Os limites de uso mudam com o tempo, e uma aula mostra como acompanhá-los."*

**Mensagens (texto aprovado pelo operador, 05/10/2026; modelo da §10.11):**

Boas-vindas (924 caracteres):

```
Que bom ter você aqui no **Google Antigravity: Desenvolva com Agentes de IA**!

Preparei este curso para você criar um assistente inteligente completo, do zero e **sem escrever uma linha de código**. Você descreve o que quer em português e o agente constrói. O projeto é para uma rede de hotéis, mas o que você leva é a habilidade de **transformar uma ideia em software funcionando, em horas em vez de semanas**.

Faça junto comigo: baixe os arquivos do projeto e a biblioteca de prompts em "Arquivos Fontes do Curso" e siga o passo a passo das aulas. Se o resultado do agente sair diferente do meu, tudo bem: ajustar o pedido é metade do aprendizado. E revise sempre o que ele entrega, porque é isso que separa quem comanda a IA de quem torce para dar certo.

Travou em alguma parte? Chame o JilsonAI. Ele está aqui para tirar suas dúvidas a qualquer hora.

Conte comigo nessa jornada. Bons estudos!

Abraço,
Jilson Santana
```

Parabéns (909 caracteres):

```
Parabéns, você concluiu o **Google Antigravity: Desenvolva com Agentes de IA**! Fiquei muito feliz de estar com você até aqui.

Você fez algo que até pouco tempo exigia um time de desenvolvimento: **tirou uma ideia do papel e entregou uma aplicação funcionando**, comandando a IA em linguagem natural. Definiu o conhecimento do negócio, criou a interface, conectou o assistente ao Gemini pelo AI Studio e o ensinou a responder com precisão, sem inventar informação.

Agora é a sua vez: troque o cenário do hotel pelo da sua empresa ou projeto. Antes de usar de verdade, peça ao próprio Antigravity que explique como proteger a chave de acesso, que no curso fica exposta no navegador para facilitar o aprendizado. E, se surgir alguma dúvida no caminho, o JilsonAI continua por aqui para ajudar.

Você não aprendeu uma ferramenta. **Aprendeu a trabalhar lado a lado com a IA.**

Um grande abraço,
Jilson Santana
```

Na Udemy eram passos numerados; na escola viraram parágrafos com a voz do professor e o JilsonAI.
"Comandos" virou "prompts" (mesmo termo da página) e "conectou a inteligência do Gemini" virou
"conectou o assistente ao Gemini pelo AI Studio" (precisão técnica).

**Promessas da Udemy que não vieram para a escola:** "100% gratuita" e "Custo Zero" (a cota muda) ·
"evitando alucinações" (exagero) · "Orquestrador de IA" como título profissional (linguagem de
vendedor) · "2026" no título.

**Pendências:**
- ⚠️ **T13:** conferir na versão atual as aulas "Instalando o Antigravity", "Primeiro acesso" e
  "Conhecendo a IDE". Se defasadas: D11, manter ou aposentar, **não regravar o curso**.
- Menções à Udemy nos vídeos: levantar nas transcrições.
- Linha de transparência (T14).
- O que a escola dá a mais **neste curso** no lançamento (só prometer o que estiver no ar).
- As mensagens citam o **JilsonAI**: se ele não estiver no ar na publicação, tirar o 4º parágrafo
  da boas-vindas e a última frase do 3º parágrafo dos parabéns, e devolver quando entrar.

## Anexo B — Template de ficha de transposição

```
### <Nome do curso na escola>
Identidade
- Udemy: <título> · <publicação> · <preço> · <seções/aulas/duração> · <projeto>
- Escola: slate #<n> · Pilar <n> · <camada> · Trilha <n> · lançamento? <s/n>
Portões (Etapa 0)
- Slate: ok/pendente · Contrato UB: n/a | lido em <data> · Atualidade: ok | T<n> · Vídeos citam Udemy: <aulas>
Demanda (vidIQ, <data>)
- <termo> · <volume> · <escopo> · <leitura>
Decisões do operador
- Título: "<...>" (<n>/60) [FATO, <data>]
- Slug: <...> [FATO, <data>]  ⚠️ irreversível
Mensagens (§10.11): escritas em <data> · recursos citados: <JilsonAI / aula de materiais / ...> · todos no ar? <s/n>
Texto: vive no admin. Diferenças-chave Udemy → escola e o porquê:
- <campo>: <antes> → <depois> · <motivo>
Pendências
- <...>
```

**Pedido de abertura para um chat novo** (o operador cola junto com os prints):

```
Transpor o curso "<nome>" da Udemy para a escola. Siga o courses.md: Leitura rápida, §2, §10 e o
Playbook da §12 (Etapas 0 a 10), com o Anexo A como referência de qualidade. Use o vidIQ (§14.1,
transposição). Entregue parte por parte, Udemy × Escola, com o porquê, cada item de lista numa
linha. No fim, as mensagens de boas-vindas e parabéns (§10.11, modelo no Anexo A), completas e
prontas para colar. Separe fato, inferência e especulação, e sinalize risco de burnout.
```

## Anexo C — O que saiu desta versão e por quê

| Saiu | Por quê | Onde está agora |
|---|---|---|
| Texto original de D8 (Databricks), custos, verificações do Free Edition, próximos passos 1–2 | D8 revogado; as verificações eram para ele | `decisions-archive.md` e o git |
| Slate antigo de 10 (numeração descontinuada) e matriz com cursos cancelados | Confundia a numeração atual | git; as notas que valem foram para a §19 |
| Linha "9 · Data Modeling" no mapa do Power BI | Curso cancelado | §17 (cancelados) |
| Pergunta "você tem SQL/Python gravados?" (§7.4 antiga) | Respondida: SQL e Python são gravação nova, com blueprints | §17 |
| Rodapés de changelog longos | Viraram o histórico abaixo | Anexo E |

Nenhuma decisão do operador foi removida; as que mudaram foram marcadas com a nova data (tags
substituindo os ✓ de 28/09).

## Anexo D — Glossário de tags `[PROPOSTA, 05/10/2026]`

Mesmo conceito, mesmo nome, em todo o catálogo. Cresce a cada transposição.

| Tag | Usar quando | Não usar |
|---|---|---|
| Engenharia de Prompt | O curso ensina a estruturar pedidos para a IA | "Prompt engineering", "Prompts avançados" |
| RAG com seus próprios dados | A IA responde com base em arquivo ou base do aluno | "RAG (Contexto de IA)" |
| Instalação e configuração | Há aulas de instalar e configurar a ferramenta | — |
| Revisão de código gerado por IA | O curso ensina a auditar o que a IA escreveu | — |
| Automação | **Só nos cursos de automação de fluxos (N8N)** | Em cursos que constroem apps |

## Anexo E — Histórico

| Data | Mudança |
|---|---|
| Jun 2026 | Fusão de `courses.md` + `mapeamento-cursos.md`; 3 camadas; reconciliação produção × interface |
| Ago 2026 | 5 pilares, teto de 20, rotação (D9), D8–D12, Regra do Satélite, benchmark analystbuilder, demanda medida de SQL |
| Set 2026 | Teto de 15 por idioma; slate de 12; D8 revogado; 4 camadas; IA camada × assunto; lançamento com 5; escola bilíngue; etiqueta; admin em passos; página como vitrine |
| 04/10/2026 | Página de curso = landing de venda da assinatura; "Este curso inclui" |
| **05/10/2026** | **Reescrita do zero.** Novos: filosofia de produto (princípio iPhone, venda honesta), Udemy × escola (§3), padrão de campos com diretrizes, tags no lugar das frases com ✓, playbook de transposição, vidIQ por situação e cuidados de leitura, radar de tendências, transposição para o inglês, fila de transposição, demanda de Out/2026, tensões T9–T15, Anexo A (Antigravity) |
| 05/10/2026 (tarde) | §10.11 Mensagens do curso (padrão aprovado pelo operador: parágrafos, voz do professor, JilsonAI); mensagens do Antigravity no Anexo A; Etapas 6 e 9 e Anexo B atualizados |
