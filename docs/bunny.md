# Bunny — o que contratar e como configurar

> **O QUE É ISTO:** o guia de contratação e configuração do Bunny, e o **estado real** da conta.
> Diz quais produtos a escola usa e quais ficam de fora, como está cada um no painel, e quais
> escolhas ainda são do operador. **NÃO é lido por sessão.**
>
> **QUANDO LER (gatilho mecânico):**
> - antes de criar ou mudar qualquer coisa no painel do Bunny;
> - antes do primeiro write/edit que monte URL, token ou assinatura do Bunny. É o **mesmo
>   gatilho** da superfície Bunny na tabela de context7 do `CLAUDE.md`;
> - antes do primeiro código que **envie arquivo** pelo site, como a foto do aluno.
>
> **De onde vem:** a documentação oficial do Bunny, consultada em **25/09/2026** via context7
> (`/bunnyway/documentation`), e a configuração que o operador fez no painel no mesmo dia. **Preço
> e nome de tela mudam:** confira no painel antes de contratar. O que está marcado **[A VERIFICAR
> NO PAINEL]** não apareceu na documentação consultada.
>
> **O que NÃO está aqui:** as travas de código, como a validade de 24 h, a falta de trava por IP
> e o vídeo de apresentação fora do portão. Elas ficam no `CLAUDE.md` → *Video* e *Access
> Architecture*, porque um agente prestes a escrever código erra sem elas.

## 0. Estado real em 25/09/2026

| O quê | Estado |
|---|---|
| Conta | **criada**, com 2FA e saldo pré-pago (§2) |
| Storage Zone de produção | **criada**: `jilsonsantana-storage` (§4.1) |
| Storage Zone de dev | **não criada** (§4.1) |
| Pull Zone das imagens | **criada e testada**: `img.jilsonsantana.com` (§4.2) |
| Storage Zone dos ARQUIVOS PARA BAIXAR | **a criar pelo operador** (`pendencias.md`, P33): zona própria, **sem Pull Zone** (§4.5). O código do envio está pronto no `dev` (28/09) |
| Stream: biblioteca de aulas | **criada e testada**: `jilsonsantana-stream` (§3.2). Desde 28/09 guarda também a apresentação; o envio do vídeo de uma aula pelo admin **funcionou no ar em 28/09** |
| Stream: biblioteca de apresentação | **existiu e foi apagada pelo operador em 28/09**: a `jilsonsantana-stream-apresentacao` (763872) guardava o vídeo de apresentação; desde 28/09 é tudo na `jilsonsantana-stream` (§3.1) |
| Stream: bibliotecas de dev | **não serão criadas por enquanto**: o operador testa o envio direto no ar (decisão de 27/09, §4.1) |
| Código do site usando o Bunny | **envio da capa do curso pelo admin**: **no ar e provado em 27/09** (Bloco U, etapa 1): o operador enviou uma capa pelo admin, e ela saiu por `img.jilsonsantana.com/cursos/…`. Sem Storage de dev, por decisão dele |

## 1. Resumo: o que entra e o que fica de fora

| Produto do Bunny | Para que serve aqui | Contratar? |
|---|---|---|
| **Stream** (bibliotecas de vídeo) | aulas + vídeo de apresentação de cada curso | **Sim**: a biblioteca de aulas foi criada em 25/09 (§3). O site ainda não toca vídeo nenhum |
| **Storage + CDN** (*Storage Zone* + *Pull Zone*) | imagens **enviadas pelo site**: foto do aluno e imagem de curso pelo admin | **Criados pelo operador em 25/09** (§4). O site ainda não envia arquivo nenhum |
| **MediaCage Enterprise DRM** | proteção máxima contra cópia do vídeo | **Não** (decisão 5, fechada em 25/09). Custa **US$ 99/mês fixos por biblioteca**, mais as licenças, mesmo sem uso, e só se desliga pelo suporte *(doc do Bunny)*. No lugar, **MediaCage Basic (grátis) ligado** |
| Optimizer, Shield/WAF, DNS, Edge Scripting, Magic Containers, Database, Fonts | — | **Não.** Nenhum deles impede uma falha nossa hoje (critério de stack do `CLAUDE.md`). Optimizer e Shield estão **desligados** na Pull Zone (§4.2) |

## 2. A conta *(configurada pelo operador em 25/09/2026)*

- [x] Criada com o **e-mail do admin** (`jilson@jilsonsantana.com`).
- [x] **2FA por aplicativo autenticador ativo.**
- [x] Códigos de recuperação do 2FA guardados **fora do Mac** *(confirmado pelo operador,
      27/09/2026)*.
- **Nome da empresa na conta:** "Jilson Santana" (pessoa física, sem CNPJ). **Trocar quando a
  empresa for aberta.**
- **E-mail de cobrança vazio de propósito:** as faturas vão para o e-mail principal.
- **E-mail para denúncia de abuso:** `jilson@jilsonsantana.com` *(decisão do operador,
  27/09/2026)*.
- **E-mails:** promocionais **desligados** (recomendado); de notificação **ligados**, porque são
  eles que avisam do saldo.
- **Cobrança pré-paga:** US$ 10 pagos em 25/09, com **recarga automática** de US$ 10 quando o
  saldo chega a US$ 2. **O gatilho fica em US$ 2** *(decisão do operador, 27/09/2026; a
  recomendação de subir para US$ 5 não foi adotada)*. Se existe mínimo mensal: **[A VERIFICAR NO
  PAINEL]**.
- **Teste grátis:** US$ 50 de crédito, que **expira por volta de 09/10/2026**. O crédito que
  sobrar some no fim do teste.
- **Contrato de tratamento de dados (DPA, GDPR):** **aceito** no painel *(confirmado pelo
  operador, 27/09/2026)*. A questão de **transferência internacional de dados pela LGPD** continua
  sendo pergunta para advogado (`pendencias.md`, P23).
- **Fato da doc (o dia ruim desta seção):** com o saldo zerado, a conta é **suspensa**, e os dados
  do Storage **podem ser apagados**. A documentação diverge no prazo, entre "alguns dias" e "2
  meses". **Tratar o pior caso:** é a recarga automática que impede isso, e os e-mails de
  notificação precisam continuar ligados.

## 3. Stream — os vídeos *(biblioteca de aulas criada pelo operador em 25/09/2026)*

### 3.1 UMA biblioteca só, com token *(decisão do operador, 28/09/2026 — revê a de 25/09, abaixo)*

**A `jilsonsantana-stream` (762605), com o token LIGADO, guarda as aulas E os vídeos de
apresentação.** Motivo do operador: já era onde a apresentação estava, e é mais simples no
painel. O que isso muda, e já está no código (28/09):
- **todo player sai assinado pelo nosso servidor**, inclusive o da apresentação, que continua
  tocando para qualquer visitante (é vídeo de venda: o servidor assina sem conferir acesso);
- **a assinatura vale 24 h para todo vídeo** — apresentação, prévia grátis e aula paga
  *(operador, 28/09/2026, depois de comparar: Bunny recomenda token curto só quando ele é gerado
  na hora do play; Mux usa 7 dias por padrão e "horas a dias" para assinatura; Cloudflare, 1 h
  por padrão e 24 h no máximo; plataformas de curso, 4 a 8 h)*. A aula paga continua **só para
  quem está logado com assinatura ativa** (a trava da etapa 4): é ela, e não a validade, que
  protege a aula;
- **as variáveis são só as das aulas** (`BUNNY_STREAM_LESSONS_*`, §5); as `BUNNY_STREAM_INTRO_*`
  deixaram de ser usadas;
- **página pública com player não pode ficar em cache mais de 24 h**, senão a assinatura vence.
*O argumento de 25/09 para separar era esse cache; hoje a página pública é montada a cada pedido.
Gatilho de reabertura: se uma página pública passar a ficar em cache por mais de 24 h (uma CDN na
frente do site, por exemplo), ou se o Enterprise DRM entrar só para as aulas.*

**O que o primeiro teste no ar mostrou (28/09/2026, fato medido):** a biblioteca de apresentação
**existia** (`jilsonsantana-stream-apresentacao`, 763872), ao contrário do que este documento
dizia, e o vídeo de apresentação morava nela. A variável `BUNNY_STREAM_LESSONS_LIBRARY_ID` apontava
para ela, e a `…_API_KEY` era da `jilsonsantana-stream` (762605): a apresentação tocava, e criar
vídeo de aula dava **401**. *Fato da doc do Bunny:* o 401 na criação quer dizer chave ausente,
chave da conta em vez da biblioteca, **ou chave de outra biblioteca**. O operador trocou o ID e a
token key para os da 762605 e **apagou** a biblioteca de apresentação; o envio da aula passou a
funcionar. **Consequência:** o vídeo de apresentação que existia se perdeu com a biblioteca e
precisa ser enviado de novo pelo admin (`pendencias.md`, P19). **Diagnóstico para a próxima vez:**
o número da biblioteca em uso aparece no endereço público do player da apresentação, sem precisar
de chave nenhuma.

### 3.1-bis O desenho de 25/09 (histórico, substituído em 28/09)

| Biblioteca | Ambiente | O que guarda | Token | Regiões | Estado |
|---|---|---|---|---|---|
| `jilsonsantana-stream` (library ID 762605) | produção | as aulas: só para quem tem assinatura ativa | **ligado** | Frankfurt + São Paulo | **criada e testada em 25/09** |
| `jilsonsantana-stream-apresentacao` (library ID 763872) | produção | o vídeo de apresentação dos cursos, que toca para quem **não** é assinante (é ativo de venda) | desligado | Frankfurt + São Paulo | **existiu e foi apagada pelo operador em 28/09** (tudo na `jilsonsantana-stream`, §3.1) |
| `jilsonsantana-stream-dev` | desenvolvimento | 2 ou 3 vídeos de teste | ligado, igual à de aulas | só Frankfurt | **não será criada por enquanto** (testa no ar, decisão de 27/09) |

- **Regiões:** no Stream, **Frankfurt é a principal e não se escolhe**; São Paulo foi
  acrescentada. **Irreversível:** réplica só se acrescenta, nunca se remove.

**Por que separar a apresentação das aulas:** o token vale para a **biblioteca inteira**. Se o
vídeo de venda morasse junto com as aulas, a página pública também precisaria de token. Uma
página pública pode ficar guardada em cache, e aí o vídeo quebra quando o token vence.
Separadas, cada uma tem a regra certa. Se um dia houver Enterprise DRM, ele liga só onde precisa,
porque ele é cobrado por biblioteca.

**Por que uma biblioteca de dev:** cada ambiente nasce com a sua própria chave (`CLAUDE.md` →
*Secrets*). Com a chave de produção no computador, um vazamento no ambiente menos protegido seria
um vazamento de produção.

**Idioma não pede biblioteca própria:** curso em inglês é outro curso, com os seus próprios
vídeos (`CLAUDE.md` → *Idiomas*). Os vídeos dele ficam na mesma `jilsonsantana-stream`.

### 3.2 `jilsonsantana-stream` — como está *(configurada pelo operador em 25/09/2026)*

**Encoding:**

| Item | Valor |
|---|---|
| Tier de encoding | **Free** |
| Codec | H.264 |
| Resoluções | 480 · 720 · 1080 · 1440 |
| Keep Original | **desligado** |
| MP4 Fallback | desligado |
| Early-Play | desligado |
| JIT | desligado |
| Multi-audio | **desligado** (decisão do operador, 27/09/2026; desligado por ele em 28/09) |
| Content tagging | desligado |
| Marca d'água | nenhuma |

- **Keep Original desligado, e por quê** *(operador)*: para recodificar, o vídeo é **reenviado a
  partir das cópias do operador** (HD externo + Descript), com internet de 1 Gb. **Consequência:**
  o arquivo original **não fica no Bunny**. A cópia de segurança dos vídeos é a do operador.
  **Compromisso do operador (27/09/2026):** manter as cópias originais dos vídeos no **Descript** e
  no **HD externo**.
- **Multi-audio: desligar** *(decisão do operador, 27/09/2026)*. Ele permite mais de uma faixa de
  áudio no mesmo vídeo, e a escola não usa isso: curso em inglês é **outro curso**, com vídeos
  próprios (`CLAUDE.md` → *Idiomas*). **Desligado no painel pelo operador em 28/09/2026.**

**Segurança (painel → Security):**
- [x] **Enable direct play:** desligado.
- [x] **Allowed domains:** `jilsonsantana.com` e `*.jilsonsantana.com`. **Isto fecha o item
      *[PENDENTE DE VERIFICAÇÃO]* da Fase 3:** a restrição de domínio existe e se chama *Allowed
      domains*.
- [x] **Block Direct URL File Access:** ligado. Impede baixar o arquivo pelo endereço direto.
- [x] **Embed view token authentication:** ligado. Sem o token, o player recusa (403). Quem gera
      o token é o **nosso servidor**, e só para quem tem assinatura ativa. A validade é de **24 h**
      para todo vídeo (§3.1, 28/09). **Nunca desligar:** é nele que a proteção da aula paga se apoia.
- [x] **CDN token authentication:** **DESLIGADO pelo operador em 28/09/2026**, para ligar o DRM.
      *Fato medido no painel:* o Bunny recusa os dois juntos (*"Cannot have Token Authentication
      and DRM enabled at the same time"*); desligar o CDN token deixou ligar o DRM, e o Embed view
      token continuou ligado. Entre os dois, o operador ficou com o DRM *(recomendação do agente:
      o risco real é baixar a aula enquanto assiste, e é o DRM que impede isso; os domínios
      permitidos e o bloqueio de acesso direto continuam valendo)*. *Gatilho de reabertura: o Bunny
      passar a aceitar os dois juntos, ou o DRM sair da biblioteca.*
- [x] **Sem trava por IP.** É decisão de Ago 2026: o vídeo não pode parar quando o aluno troca o
      Wi-Fi pelo 4G.
- [x] **DRM:** **MediaCage Basic (grátis) ligado em 28/09/2026.** Até ali este documento o dava
      como ligado, mas ele estava ligado só na biblioteca de apresentação. Enterprise **não**
      (decisão 5, §6).
- **Chromecast:** configurado **sem** (`*.gstatic.com` fora dos *Allowed domains*). **A decisão
  fica para o bloco de vídeo da Fase 3** *(operador, 27/09/2026)*, com um teste numa TV com o site
  já tocando vídeo. **O controle de acesso continua com a TV:** só quem recebeu o token do nosso
  servidor abre o player, e é do player que a aula vai para a TV. **O que a doc não responde:** se
  a TV toca com o MediaCage Basic ligado. Para ligar: acrescentar `*.gstatic.com`
  aos *Allowed domains* (fato da doc) e ativar a transmissão nas configurações do player da
  biblioteca **[A VERIFICAR NO PAINEL: o nome exato da opção]**.
- **Teste do operador:** toca no painel; é **bloqueado numa aba anônima**.

**Entrega:** tier **High Volume**, sem filtros de roteamento.

**Vídeo de teste:** "Apresentação" (`apresentacao.mp4`) está nesta biblioteca desde 25/09. Não
precisa mais mudar de biblioteca (§3.1).

### 3.3 As duas bibliotecas que faltavam *(nenhuma a criar hoje)*

**`jilsonsantana-stream-apresentacao`** — *existiu e foi apagada em 28/09 (§3.1); não volta.*
O que estava previsto para ela, guardado como histórico (Frankfurt + São Paulo):
- [ ] Token **desligado**: ela precisa tocar para qualquer visitante.
- [ ] **Allowed domains → `jilsonsantana.com`**: sem isso, qualquer site poderia exibir os seus
      vídeos de venda.
- [ ] **Block Direct URL File Access → LIGAR.**

**`jilsonsantana-stream-dev`** (só Frankfurt): a mesma configuração da de aulas, com
**`localhost`** nos *Allowed domains*. *(Não será criada por enquanto: o operador testa direto no
ar, decisão de 27/09. O mesmo vale para uma biblioteca de apresentação de dev.)*

### 3.4 Como os vídeos entram — decisão 3 FECHADA *(operador, 25/09/2026)*

- **Upload pelo admin da escola.** O operador chamou esta opção de **"C"**. No guia, as opções
  eram **A** (painel do Bunny + colar o ID) e **B** (envio pelo admin), e "upload pelo admin"
  corresponde à **B** *(confirmado pelo operador, 27/09/2026)*.
- ~~As coleções do Stream são criadas pelo admin da escola~~ **SEM COLEÇÕES** *(decisão do
  operador, 27/09/2026, revendo a de 25/09: "sem pasta fica mais flexível")*. O site liga cada
  aula ao **código único** do vídeo, e a pasta só serviria para navegar no painel.
  **O nome do vídeo no Bunny = o NOME DO ARQUIVO que o operador envia**, para a apresentação e
  para as aulas *(decisão do operador, 27/09/2026: "o nome do arquivo deve ser o que eu envio + o ID
  que o Bunny cola, sem complicar as coisas"; substitui, no mesmo dia, "título do curso/da aula" e
  "slug do curso")*. O ID o Bunny já mostra ao lado de cada vídeo, então não vai no nome. O mesmo
  nome vai no envio (TUS), para os dois baterem. *Gatilho de reabertura:* o operador passar a gerenciar vídeos pelo painel do Bunny, ou
  precisar de estatística por curso lá dentro. Aí título e coleções mudam sem mexer no que já
  existe no site.
- **Consequência que já estava registrada:** é código novo na Fase 3, que é de alto risco. As
  regras do §7 valem para ele.
- **Limpeza automática ao reenviar** *(decisão do operador, 27/09/2026: "o incompleto e o
  antigo")*:
  - reenviar o vídeo da mesma aula ou da mesma apresentação **apaga no Bunny o envio que ficou
    pela metade**;
  - quando o envio novo termina, **o vídeo substituído também é apagado**;
  - **nunca o vídeo em uso**;
  - se o Bunny recusar apagar, o envio continua valendo, e o que sobrar se apaga no painel.

  Na apresentação, isso já está no código (Bloco U, etapa 2); nas aulas, entra na etapa 3.
  *Não confundir com apagar vídeo de curso arquivado, que continua fora (Ago 2026).*
- **EXCLUIR apaga no Bunny também** *(decisão do operador, 28/09/2026: "deveria excluir o vídeo,
  já que ele ficaria perdido no Bunny")*: excluir aula, módulo ou curso apaga lá o vídeo da aula,
  o envio pela metade e os arquivos para baixar; o curso, também o vídeo de apresentação. O Bunny
  primeiro: se ele recusar, nada é excluído, e o operador tenta de novo. **Arquivar** continua não
  apagando nada (é a decisão de Ago 2026, acima).
- **Prévia grátis** *(decisão do operador, 27/09/2026, "como na Udemy")*: o operador liga e desliga
  por aula quais aulas tocam para **qualquer visitante, sem login e sem assinatura**; ele pensa em
  2, 3 ou 5 aulas de uns 10 minutos por curso. Elas continuam na biblioteca de aulas, com token, e
  quem entrega o token para a prévia é o nosso servidor. Entra nas etapas 3 e 4 do Bloco U.

### 3.5 Custos do Stream — fatos da doc

*Fonte trazida pelo operador: `bunny.net/docs/stream/pricing`, página de 24/08/2026.*

- **Encoding padrão: grátis.** Resolução a mais só soma **armazenamento**: o 1440p **não** é
  cobrado como encoding. **Só o encoding Premium é cobrado** (US$ 0,025 · 0,05 · 0,15 por minuto,
  conforme o codec).
- **Armazenamento conta:** cada resolução + legendas + miniaturas + prévias, e também o MP4
  fallback e os originais, quando ligados.
- **Mudar o encoding vale só para vídeos novos.** Existe limpeza das resoluções desligadas.
- **Entrega:** Volume a **US$ 0,005/GB** (de 0 a 500 TB); Standard na América do Sul a
  **US$ 0,045/GB**.
- **Transcrição: US$ 0,10 por minuto, por idioma.** **Pedir a transcrição de um vídeo (pelo botão
  ou pela API) COBRA mesmo com a transcrição desligada na biblioteca.**
- **Enterprise DRM: US$ 99/mês por biblioteca**, e **para desligar é preciso falar com o
  suporte**.

## 4. Storage + CDN — as imagens enviadas pelo site

**Por que existe:** quando houver envio de arquivo pelo site (a foto do aluno, pendência de
24/09, ou imagem de curso pelo admin), o arquivo **não pode ficar na Railway**, porque o disco do
servidor é zerado a cada publicação. As imagens de hoje moram no projeto (`client/public/img`) e
entram inteiras em cada publicação.

| Opção | Leitura |
|---|---|
| **Bunny Storage + Pull Zone** *(**decisão do operador, 25/09/2026**, seguindo a recomendação do agente do mesmo dia)* | Não entra fornecedor novo, porque o Bunny já vem com os vídeos. Entrega rápido no mundo todo, e a troca de fornecedor é simples (§4.3) |
| Railway Volume | Um disco que sobrevive às publicações. Fica numa máquina só, sem entrega rápida no mundo |
| ~~Dentro do banco (Neon)~~ | **Não.** Deixa o banco pesado (o plano grátis tem pouco espaço), faz cada imagem passar por um banco que dorme (~1,2 s para acordar) e pesa a cópia de segurança |

### 4.1 Storage Zone *(decisões do operador, 25/09/2026)*

**Produção: `jilsonsantana-storage`**

| Item | Valor |
|---|---|
| Tier | **Standard (HDD)** |
| Região principal | **São Paulo (BR)** |
| Réplica | **New York (NY)** |
| S3 Compatibility | **desligado** |
| Custo | US$ 0,02 por GB por mês |
| Endpoint regional | `br.storage.bunnycdn.com` |
| FTP | **nunca usado** (o FTP do Bunny não tem criptografia; §4.3) |
| Tratamento de erro | padrão, sem transformar 404 em 200 |

- **IRREVERSÍVEIS** *(fato da doc)*: o **tier**, o **S3** e a **réplica em NY**. Réplica só se
  acrescenta, nunca se remove: a única saída é apagar a zona e recriar.
- **Próxima réplica candidata:** Frankfurt, **quando houver alunos fora do Brasil**.
- **Senhas:** existe também uma **senha só de leitura**, que é a de usar na cópia fria da Fase 7.
  **As senhas não estão em lugar nenhum fora do painel.**
- **Arquivo em produção hoje:** `Jilson-Santana.png` na raiz, a foto do instrutor, subida como
  teste. Pode ser usada como está: PNG é aceito (`design.md` §12, decisão de 27/09).
- **Pastas** *(decisão do operador, 27/09/2026, era a P21)*: capa do curso em
  **`cursos/<slug>-<código>.<ext>`**; depois, foto do aluno em **`alunos/<código>.<ext>`**. O código
  é aleatório e muda a cada envio, por causa do cache de 1 mês da CDN (§4.4).

**Dev: `jilsonsantana-storage-dev`, NÃO criada, por decisão do operador (27/09/2026):** o envio
de imagem é testado **direto no site no ar**. A senha da Storage de produção fica **só no
Railway**, nunca no computador dele. Usar a de produção no computador foi recusado, porque contraria
a regra de senha por ambiente e exigiria liberar `localhost` na CDN de produção. **No computador
do operador, "Enviar imagem" responde que o Storage não está configurado**, e isso é o esperado.
*Gatilho de reabertura:* se testar no ar passar a atrapalhar, por exemplo arquivos de teste
misturados às capas de verdade ou um erro que só dá para investigar localmente. Aí se cria a de dev
(Standard, São Paulo, sem réplica, S3 desligado) **com uma Pull Zone de dev** que tenha `localhost`
nos *Allowed referrers*, senão a imagem não aparece no computador.

### 4.2 Pull Zone das imagens *(decisões do operador, 25/09/2026)*

| Item | Valor |
|---|---|
| Nome | `jilsonsantanaimg` → `jilsonsantanaimg.b-cdn.net` |
| Origem | a Storage Zone `jilsonsantana-storage` |
| Tier | Standard |
| Zonas de preço | as 5 ligadas |
| **Endereço próprio** | **`img.jilsonsantana.com`**: CNAME `img` → `jilsonsantanaimg.b-cdn.net` no DNS da GoDaddy, SSL gratuito ativo, **Force SSL ligado nos dois endereços** |

**Segurança:**
- **Block root path:** ligado. **Block POST:** ligado.
- **Allowed referrers:** `jilsonsantana.com` e `*.jilsonsantana.com`. Blocked referrers e IPs:
  vazios.
- **Block direct URL file access: DESLIGADO de propósito.** A prévia de link no WhatsApp e no
  LinkedIn e os e-mails chegam **sem** referrer; com a opção ligada, eles ficariam sem imagem.
- **Fato da doc:** *Allowed referrers* só recusa pedido que **traz** um referrer fora da lista.
  Pedido **sem** referrer passa.

**Limites de rede:** limite de banda mensal de **100 GB**. Se atingir, **a zona é desativada até o
mês virar** e as imagens somem do site. Os demais limites estão em 0.

**Cache:** expiração de **1 mês** (sobrescrevendo a da origem), e no navegador a mesma. Smart
Cache e Vary Cache desligados.

**Log:** o IP fica **anonimizado por padrão** *(doc oficial)*. **Não desligar.**

**Bunny Shield: desligado** (decisão do operador, pelo critério de stack). **Optimizer:
desligado** (é pago).

**Teste de ponta a ponta: OK** em `https://img.jilsonsantana.com/Jilson-Santana.png`.

### 4.3 Regras de build que já valem

- **O banco guarda o endereço COMPLETO em `img.jilsonsantana.com`** *(convenção de engenharia,
  27/09/2026, no plano aprovado pelo operador; substitui "o banco guarda só o caminho")*. O domínio é
  da escola: trocar de fornecedor é copiar os arquivos e **reapontar o CNAME `img`**, e o endereço
  gravado continua valendo. O começo do endereço vem de `BUNNY_IMG_BASE_URL` no momento do envio.
- **O nome do arquivo é imprevisível**, nunca o número do aluno: ninguém deve adivinhar o
  endereço da foto de outra pessoa.
- **A foto é dado pessoal:** ela some junto quando a conta é excluída (LGPD). Formato **WebP**
  (`design.md` §12).
  **⚠️ DIVERGÊNCIA reportada em 25/09, aguardando o operador:** pela doc, apagar do Storage **não
  remove** a cópia que está na CDN (§4.4). Com o cache de 1 mês, a foto pode continuar no ar por
  até 1 mês depois da exclusão.
- **Cópia de segurança pela API do Bunny, que usa HTTPS**, com a senha só de leitura (§4.1). O
  FTP do Bunny existe, mas **não tem criptografia**, conforme a própria documentação: não usar.
  A cópia fria das imagens entra junto com a cópia de segurança do banco (Fase 7).

### 4.4 Pendências para o bloco de envio de arquivo *(registradas, NÃO decididas)*

- **Fato da doc:** a CDN **não percebe** quando o arquivo muda na origem. O arquivo em cache fica
  até **expirar (1 mês)** ou até ser **purgado**. Daí vêm duas consequências:
  - **nome novo a cada envio vale para TODA imagem**, capa de curso incluída, e não só para a foto
    do aluno. Sem isso, a imagem trocada continua aparecendo a antiga por até 1 mês;
  - **exclusão de conta (LGPD):** apagar do Storage não tira a cópia da CDN. Purgar um endereço
    exige a **chave de API da CONTA**, que tem poder total.
    **Decisão do operador pendente:** purgar com essa chave · cache curto só na pasta de fotos de
    aluno · aceitar até 1 mês.
    **⚠️ DIVERGÊNCIA reportada em 25/09:** a primeira opção contradiz o §5, que diz que a chave da
    conta "não vai para lugar nenhum, porque o site não precisa dela".
- **Estrutura de pastas no Storage:** decidida em 27/09 (§4.1).
- **Site aberto por outro endereço** (por exemplo `.up.railway.app`) **não mostra as imagens**,
  por causa dos *Allowed referrers*.
- **Regra do context7 para o Storage: APLICADA** *(aceita pelo operador, 27/09/2026)*. A consulta
  ao ID do Bunny diz o nome do produto perguntado: **"Stream"**, **"Storage"** ou **"CDN"**
  (`CLAUDE.md` → Context7 → *Bunny caveat*).

### 4.5 A zona dos ARQUIVOS PARA BAIXAR *(decisão do operador, 28/09/2026)*

- **Uma Storage Zone PRÓPRIA, sem Pull Zone.** Os arquivos das aulas (planilhas, PDFs,
  `.pbix`) são material pago: **nada lá tem endereço público**, e quem entrega ao aluno é o
  nosso servidor, só para assinante e sempre como download (etapa 4 do Bloco U). Com Pull Zone,
  qualquer um que visse o endereço baixaria.
- **Tier e réplica são IRREVERSÍVEIS** (§4.1): a escolha é do operador. Recomendação do agente:
  **Standard (HDD), São Paulo, sem réplica** — réplica só se acrescenta, e os arquivos saem pelo
  nosso servidor (na Railway), então a réplica não aproxima nada do aluno.
- **Nome:** sugestão `jilsonsantana-arquivos`. **Sem zona de dev** (o teste é no ar, como nas
  imagens).
- **Regras de build que já valem** *(código em `server/src/lib/bunny-storage.ts`)*: nome
  aleatório no Storage (`aulas/<aula>/<24 caracteres>.<ext>`); o nome original fica só no banco;
  **apagar só aceita caminho de arquivo nesse formato**, porque, pela doc (context7, 28/09),
  **apagar uma PASTA apaga tudo dentro dela, sem aviso**.

## 5. Chaves e senhas — leia antes do passo a passo

O Bunny gera estes tipos de chave:

1. **API key de cada biblioteca do Stream:** usada para enviar e gerenciar vídeos (o upload
   pelo admin, decisão 3). Vai para o **servidor**.
2. **Token authentication key de cada biblioteca** (painel → Security): é a chave dos tokens de
   segurança. Vai para o **servidor**. **É ESTA que entra no token do embed, não a API key**
   *(confirmado na doc via context7 em 28/09/2026, no build do vídeo das aulas — §7)*.
   **Regra do operador (25/09/2026):** *"API key da biblioteca e token authentication key: só no
   Railway, nunca no chat nem no navegador."* **Vale para a biblioteca de PRODUÇÃO** *(esclarecido
   pelo operador, 27/09/2026)*. As chaves da biblioteca de dev vão no `server/.env` (linha **Dev**,
   abaixo), para o vídeo tocar quando o site roda no computador dele.
3. **Senha de cada Storage Zone:** envia e apaga arquivos. Vai para o **servidor**.
4. **Senha só de leitura da Storage Zone:** lê e baixa. É a da **cópia fria** (Fase 7); não vai
   para o site.
5. **API key da conta:** dá acesso total à conta. **Não vai para lugar nenhum**, porque o site
   não precisa dela. *(⚠️ ver a divergência em §4.4: a purga da CDN depende dela.)*

- **NUNCA cole uma chave no chat**: nem no Claude do projeto, nem no Claude Code, nem em
  print. Conversa não se apaga. **Se uma chave aparecer no chat, gere outra no painel na mesma
  hora.**
- **Produção:** a chave vai direto do painel do Bunny para as *Variables* do Railway, sem passar
  por nenhum outro lugar.
- **Dev:** as chaves da `jilsonsantana-stream-dev` e da `jilsonsantana-storage-dev` vão no `server/.env`, com o
  arquivo **fechado no editor** antes de salvar.
- **Os nomes das variáveis** *(definidos no plano do Bloco U, 27/09/2026)*. Crie cada grupo só
  antes da etapa que usa:

  | Etapa | Variável | O que é | Segredo? |
  |---|---|---|---|
  | 1 | `BUNNY_STORAGE_ZONE` | nome da Storage Zone (`jilsonsantana-storage` no ar, a de dev no computador) | não |
  | 1 | `BUNNY_STORAGE_HOST` | `br.storage.bunnycdn.com` | não |
  | 1 | `BUNNY_STORAGE_PASSWORD` | a senha da Storage Zone (a de escrita, não a só de leitura) | **sim** |
  | 1 | `BUNNY_IMG_BASE_URL` | `https://img.jilsonsantana.com` no ar; o endereço da Pull Zone de dev no computador | não |
  | ~~2~~ | ~~`BUNNY_STREAM_INTRO_LIBRARY_ID`~~ | **não é mais usada** (28/09: uma biblioteca só, §3.1). **Apagada do Railway pelo operador em 28/09** | não |
  | ~~2~~ | ~~`BUNNY_STREAM_INTRO_API_KEY`~~ | **não é mais usada** — apagada do Railway em 28/09 | **sim** |
  | 3 | `BUNNY_STREAM_LESSONS_LIBRARY_ID` | ID da biblioteca (762605, a `jilsonsantana-stream`) — aulas **e** apresentação desde 28/09 | não |
  | 3 | `BUNNY_STREAM_LESSONS_API_KEY` | API key da biblioteca de aulas | **sim** |
  | 3 | `BUNNY_STREAM_LESSONS_TOKEN_KEY` | token authentication key da biblioteca de aulas | **sim** |
  | 3 | `BUNNY_STREAM_LESSONS_CDN_HOST` | o *CDN Hostname* da aba **API** da `jilsonsantana-stream` (`vz-….b-cdn.net`): de onde vem a miniatura que o editor mostra (28/09). Sem ela, a aula aberta mostra o nome e a duração, sem a miniatura | não |
  | arquivos | `BUNNY_FILES_STORAGE_ZONE` | nome da Storage Zone dos arquivos (§4.5) | não |
  | arquivos | `BUNNY_FILES_STORAGE_HOST` | o endpoint da zona (ex.: `br.storage.bunnycdn.com`) | não |
  | arquivos | `BUNNY_FILES_STORAGE_PASSWORD` | a senha da zona dos arquivos (a de escrita) | **sim** |

  **Estado em 27/09: as 4 da etapa 1 estão no Railway** (o envio foi provado no ar). As das etapas
  2 e 3 ainda não existem. **Em 28/09 o código da etapa 3 ficou pronto no `dev`** (o vídeo das
  aulas): sem as 3 variáveis dela, o envio responde "não configurado" e nada quebra. O teste é
  no ar, como nas etapas 1 e 2 (decisão do operador de 28/09): elas vão **só no Railway**. Sem as da etapa 1, o envio da capa responderia que
  o Storage não está configurado, e nada quebra. **As 4 da etapa 1 vão só no Railway**, com os
  valores de produção (`jilsonsantana-storage`, `https://img.jilsonsantana.com`), porque não
  existe Storage de dev (§4.1, decisão de 27/09).

## 6. Decisões do operador

| # | Decisão | Opções | Estado |
|---|---|---|---|
| 1 | Onde guardar as imagens enviadas pelo site | Bunny Storage · Railway Volume | **FECHADA em 25/09/2026** (operador): **Bunny Storage** |
| 2 | O aluno pode mandar a aula para a TV (Chromecast)? | sim · não | **ADIADA pelo operador em 27/09:** fica sem até o bloco de vídeo da Fase 3, quando se testa numa TV (§3.2; `pendencias.md` P5) |
| 3 | Como os vídeos entram | painel do Bunny + colar o ID · envio pelo admin | **FECHADA em 25/09/2026** (operador): **upload pelo admin**, **sem coleções** (revisto em 27/09, §3.4) |
| 4 | Endereço das imagens | `img.jilsonsantana.com` | **FECHADA em 25/09/2026** (operador): no ar, com SSL |
| 5 | Enterprise DRM | não no lançamento · sim | **FECHADA em 25/09/2026** (operador): **sem Enterprise**; **MediaCage Basic (grátis) ligado** |
| 6 | Purga da CDN na exclusão de conta | chave da conta · cache curto na pasta de fotos · aceitar até 1 mês | pendente: antes do envio da foto do aluno (§4.4) |
| 7 | Gatilho da recarga automática | US$ 2 · US$ 5 | **FECHADA em 27/09/2026** (operador): **fica em US$ 2** (§2) |

## 7. Para o agente de build (Fase 3)

- **O gate do context7 continua obrigatório.** Este guia **não substitui** a consulta de
  `/bunnyway/documentation` no primeiro código que monte token ou URL do Bunny. Os detalhes
  abaixo foram lidos em 25/09 e precisam ser confirmados no build.
- **Token do embed: CONFIRMADO em 28/09/2026 (context7) e em uso no código** (`tokenDoPlayer`
  e `enderecoAssinado` em `server/src/lib/bunny-stream.ts`): **`SHA256_hex(token_security_key +
  video_id + expires)`**, com `expires` em **segundos**, entregue como `?token=…&expires=…` no
  iframe `iframe.mediadelivery.net/embed/<biblioteca>/<id>`. A chave é a **token key** da
  biblioteca, não a API key. *(A forma em Base64 que a leitura de 25/09 citava é de outro produto
  — o token da CDN —, não do embed.)* Validade: **24 h** para todo vídeo (§3.1, 28/09).
- **Com *Block Direct URL File Access* ligado, o iframe precisa de
  `referrerpolicy="strict-origin-when-cross-origin"`.** Sem isso, uma política de referrer mais
  estrita no site faz o Bunny tratar o acesso como direto e recusar o vídeo.
- **CDN token authentication** (na Pull Zone) serve para player próprio ou URL direta. Com o
  player do Bunny em iframe, **não é necessário**.
  *(A divergência de 25/09 — o CDN token ligado na `jilsonsantana-stream` — **acabou em 28/09**: o
  operador o desligou para ligar o DRM, §3.2.)*
- **ACHADO, reportado e não corrigido (25/09):** o token do embed é **por vídeo e por
  validade**. Ele **não carrega a identidade do aluno**. O `CLAUDE.md` → *Video* e o
  `tech-stack.md` citam *"per-user signing"* entre as proteções. Na prática, isso só pode
  significar que o servidor emite o token apenas para quem tem acesso. Confirmar no build e, se
  for isso, ajustar a frase nos dois docs com o ok do operador.
- **Confirmado NO AR em 27/09 (Bloco U, etapa 2):** apagar um vídeo com
  `DELETE https://video.bunnycdn.com/library/:id/videos/:id` funciona (o operador viu o vídeo
  substituído sumir do painel), e o nome do vídeo é o que vai na criação e no envio (TUS).
- **Confirmado na doc em 27/09, e já em uso no código (Bloco U, etapa 2):** criar o vídeo devolve
  o id em **`guid`** · o envio retomável usa `https://video.bunnycdn.com/tusupload` com os
  cabeçalhos `AuthorizationSignature`, `AuthorizationExpire`, `VideoId` e `LibraryId` · a
  assinatura é SHA-256 (hex) de biblioteca + chave + validade + id · o player é
  `iframe.mediadelivery.net/embed/<biblioteca>/<id>`, o dos exemplos oficiais.
  **Confirmado na doc em 28/09 (context7), e em uso no código (`interpretarResumo`):** a miniatura
  padrão é `https://{CDN Hostname da biblioteca}/{id do vídeo}/thumbnail.jpg`. Com o CDN token
  desligado (28/09), ela carrega sem assinatura para quem vem do domínio da escola. **Não
  confirmado:** o campo `length` (a duração, em segundos) na leitura do vídeo; o código só o usa
  quando é número.
  **Não confirmado:** o significado dos números de `status` na leitura do vídeo. A doc só lista os
  do webhook (3 = terminado; 4 = a primeira resolução ficou pronta e o vídeo já toca; 5 = falhou).
  Por isso a prévia do admin, que se atualiza sozinha, trata como **pronto** o status 4 **ou** o
  `encodeProgress` 100 (`interpretarEstado` em `server/src/lib/bunny-stream.ts`). Se um envio no
  ar ficar "processando" para sempre, é aqui que se ajusta.
- **Endereço do player a conferir (achado de 27/09, anotado a pedido do operador):** a doc do
  Bunny mostra que o **player novo** usa `player.mediadelivery.net/embed/` (com a opção *Enable
  legacy player* desligada em *Player Settings*). Este guia cita o endereço antigo,
  `iframe.mediadelivery.net`. **Confirmar no build qual vale** para a `jilsonsantana-stream`, e usar
  o mesmo no iframe e na CSP.
- **CSP:** quando o bloco do `helmet` entrar (backlog P2), o `frame-src` precisa do endereço do
  player (acima: `iframe.mediadelivery.net` ou `player.mediadelivery.net`), e o `img-src` precisa
  de `img.jilsonsantana.com`.

### 7.1 Regras do operador para o build da Fase 3 *(25/09/2026: registradas, NÃO implementadas)*

- **O upload envia o arquivo original byte a byte**, sem recompressão no navegador, e é
  **retomável** (se a conexão cair, continua de onde parou).
- **"Trocar o vídeo da aula" substitui o vídeo sem recriar a aula.** O progresso do aluno fica
  ligado à **AULA**, nunca ao ID do vídeo.
- **O código NUNCA chama transcrição nem liga o Enterprise DRM.** Os dois cobram: a transcrição
  cobra mesmo com a opção desligada na biblioteca (§3.5), e o DRM só se desliga pelo suporte.
  *(Nota: o `jilsonai.md` → Fase 5 cita "legendas do Bunny ou transcrição" como fonte do RAG.
  As legendas `.vtt` enviadas pelo operador são compatíveis com esta regra; a transcrição paga do
  Bunny não é. A escolha da fonte continua sendo da Fase 5.)*
- **Legendas `.vtt` casadas pelo nome do arquivo** com o `.mp4`.
- **O preload do embed gasta banda:** decidir o comportamento junto com o `design.md`.
- **A API key e a token authentication key da biblioteca de produção ficam só no Railway**, nunca
  no chat nem no navegador. As da biblioteca de dev vão no `server/.env` (§5). **Gate do context7 obrigatório**, com a consulta dizendo **"Stream"**.
- **Teste pendente:** reprodução no **celular com 4G**, quando o site já tocar vídeo.
