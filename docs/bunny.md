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
> **O que NÃO está aqui:** as travas de código, como a janela de 6–12 h, a falta de trava por IP
> e o vídeo de apresentação fora do portão. Elas ficam no `CLAUDE.md` → *Video* e *Access
> Architecture*, porque um agente prestes a escrever código erra sem elas.

## 0. Estado real em 25/09/2026

| O quê | Estado |
|---|---|
| Conta | **criada**, com 2FA e saldo pré-pago (§2) |
| Storage Zone de produção | **criada**: `jilsonsantana-storage` (§4.1) |
| Storage Zone de dev | **não criada** (§4.1) |
| Pull Zone das imagens | **criada e testada**: `img.jilsonsantana.com` (§4.2) |
| Stream: biblioteca de aulas | **criada e testada**: `jilsonsantana-stream` (§3.2) |
| Stream: bibliotecas de apresentação e de dev | **não criadas** (§3.3) |
| Código do site usando o Bunny | **nenhum**. Nenhuma variável de ambiente foi criada |

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
- [ ] Códigos de recuperação do 2FA guardados **fora do Mac**. **A confirmar pelo operador.**
- **Nome da empresa na conta:** "Jilson Santana" (pessoa física, sem CNPJ). **Trocar quando a
  empresa for aberta.**
- **E-mail de cobrança vazio de propósito:** as faturas vão para o e-mail principal.
- **E-mail para denúncia de abuso:** a confirmar pelo operador.
- **E-mails:** promocionais **desligados** (recomendado); de notificação **ligados**, porque são
  eles que avisam do saldo.
- **Cobrança pré-paga:** US$ 10 pagos em 25/09, com **recarga automática** de US$ 10 quando o
  saldo chega a US$ 2. *Subir o gatilho da recarga para US$ 5 foi recomendado; a confirmar pelo
  operador.* Se existe mínimo mensal: **[A VERIFICAR NO PAINEL]**.
- **Teste grátis:** US$ 50 de crédito, que **expira por volta de 09/10/2026**. O crédito que
  sobrar some no fim do teste.
- **Contrato de tratamento de dados (DPA, GDPR):** a confirmar pelo operador se foi aceito. A
  questão de **transferência internacional de dados pela LGPD** é pergunta para advogado.
- **Fato da doc (o dia ruim desta seção):** com o saldo zerado, a conta é **suspensa**, e os dados
  do Storage **podem ser apagados**. A documentação diverge no prazo, entre "alguns dias" e "2
  meses". **Tratar o pior caso:** é a recarga automática que impede isso, e os e-mails de
  notificação precisam continuar ligados.

## 3. Stream — os vídeos *(biblioteca de aulas criada pelo operador em 25/09/2026)*

### 3.1 Três bibliotecas, uma por papel *(nomes e regiões: decisão do operador, 25/09/2026)*

| Biblioteca | Ambiente | O que guarda | Token | Regiões | Estado |
|---|---|---|---|---|---|
| `jilsonsantana-stream` (library ID 762605) | produção | as aulas: só para quem tem assinatura ativa | **ligado** | Frankfurt + São Paulo | **criada e testada em 25/09** |
| `jilsonsantana-stream-apresentacao` | produção | o vídeo de apresentação dos cursos, que toca para quem **não** é assinante (é ativo de venda) | desligado | Frankfurt + São Paulo | não criada |
| `jilsonsantana-stream-dev` | desenvolvimento | 2 ou 3 vídeos de teste | ligado, igual à de aulas | só Frankfurt | não criada |

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
| Multi-audio | **ligado** |
| Content tagging | desligado |
| Marca d'água | nenhuma |

- **Keep Original desligado, e por quê** *(operador)*: para recodificar, o vídeo é **reenviado a
  partir das cópias do operador** (HD externo + Descript), com internet de 1 Gb. **Consequência:**
  o arquivo original **não fica no Bunny**. A cópia de segurança dos vídeos é a do operador.
- **⚠️ Reportado em 25/09, não resolvido:** multi-audio permite mais de uma faixa de áudio no
  mesmo vídeo. Se a ideia for dublar a mesma aula em inglês, isso contraria o `CLAUDE.md` →
  *Idiomas*: *"Curso em inglês é OUTRO curso (vídeos e slug próprios), nunca uma tradução do mesmo
  registro"*. A intenção do operador ao ligar não está registrada.

**Segurança (painel → Security):**
- [x] **Enable direct play:** desligado.
- [x] **Allowed domains:** `jilsonsantana.com` e `*.jilsonsantana.com`. **Isto fecha o item
      *[PENDENTE DE VERIFICAÇÃO]* da Fase 3:** a restrição de domínio existe e se chama *Allowed
      domains*.
- [x] **Block Direct URL File Access:** ligado. Impede baixar o arquivo pelo endereço direto.
- [x] **Embed view token authentication:** ligado. Sem o token, o player recusa (403). Quem gera
      o token é o **nosso servidor**, e só para quem tem assinatura ativa. A validade é de **6 a
      12 h**, por decisão de Ago 2026 (não encurtar; a razão está no plano, Fase 3).
- [x] **CDN token authentication:** ligado. *Fato da tela, registrado pelo operador:* o player
      embutido assina sozinho. *(⚠️ ver a divergência no §7.)*
- [x] **Sem trava por IP.** É decisão de Ago 2026: o vídeo não pode parar quando o aluno troca o
      Wi-Fi pelo 4G.
- [x] **DRM:** **MediaCage Basic (grátis) ligado.** Enterprise **não** (decisão 5, §6).
- **Chromecast:** configurado **sem** (`*.gstatic.com` fora dos *Allowed domains*). **Decisão 2
  a confirmar pelo operador** (§6). Se um dia for sim, é preciso acrescentar `*.gstatic.com`,
  senão o vídeo toca no navegador e não toca na TV.
- **Teste do operador:** toca no painel; é **bloqueado numa aba anônima**.

**Entrega:** tier **High Volume**, sem filtros de roteamento.

**Vídeo de teste:** "Apresentação" (`apresentacao.mp4`) está nesta biblioteca. **Mover** para a
`jilsonsantana-stream-apresentacao` quando ela existir.

### 3.3 As duas bibliotecas que faltam *(a criar)*

**`jilsonsantana-stream-apresentacao`** (Frankfurt + São Paulo):
- [ ] Token **desligado**: ela precisa tocar para qualquer visitante.
- [ ] **Allowed domains → `jilsonsantana.com`**: sem isso, qualquer site poderia exibir os seus
      vídeos de venda.
- [ ] **Block Direct URL File Access → LIGAR.**

**`jilsonsantana-stream-dev`** (só Frankfurt): a mesma configuração da de aulas, com
**`localhost`** nos *Allowed domains*.

### 3.4 Como os vídeos entram — decisão 3 FECHADA *(operador, 25/09/2026)*

- **Upload pelo admin da escola.** O operador chamou esta opção de **"C"**. No guia, as opções
  eram **A** (painel do Bunny + colar o ID) e **B** (envio pelo admin), e "upload pelo admin"
  corresponde à **B**. *(⚠️ Divergência de rótulo, reportada em 25/09.)*
- **As coleções do Stream são criadas pelo admin da escola, NÃO à mão no painel.**
- **Consequência que já estava registrada:** é código novo na Fase 3, que é de alto risco. As
  regras do §7 valem para ele.

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
  teste. **Pendente:** definir a estrutura de pastas e converter para WebP (`design.md` §12)
  antes de usar no site.

**Dev: `jilsonsantana-storage-dev`, NÃO criada.** Quando for criada: Standard, São Paulo, **sem
réplica**, S3 desligado.

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

- O banco guarda **só o caminho** (`alunos/…webp`). O começo do endereço fica numa única
  configuração do servidor. Trocar de fornecedor é copiar os arquivos e mudar essa
  configuração, sem nenhuma linha do banco.
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
- **Estrutura de pastas no Storage:** pendente.
- **Site aberto por outro endereço** (por exemplo `.up.railway.app`) **não mostra as imagens**,
  por causa dos *Allowed referrers*.
- **Proposta de mudança na lei de build (NÃO aplicada):** o `CLAUDE.md` → Context7 manda dizer
  **"Stream"** na consulta ao ID do Bunny, senão a resposta desvia para a CDN. Para o Storage, a
  consulta precisa dizer **"Storage"**. A regra atual não cobre esse caso; mudar é decisão do
  operador.

## 5. Chaves e senhas — leia antes do passo a passo

O Bunny gera estes tipos de chave:

1. **API key de cada biblioteca do Stream:** usada para enviar e gerenciar vídeos (o upload
   pelo admin, decisão 3). Vai para o **servidor**.
2. **Token authentication key de cada biblioteca** (painel → Security): é a chave dos tokens de
   segurança. Vai para o **servidor**. *Qual das duas chaves (esta ou a API key) entra no cálculo
   do token do embed é confirmação do build: a doc consultada em 25/09 mostra a API key num
   exemplo (§7).*
   **Regra do operador (25/09/2026):** *"API key da biblioteca e token authentication key: só no
   Railway, nunca no chat nem no navegador."* *(⚠️ Divergência reportada em 25/09: a linha
   **Dev**, logo abaixo, manda as chaves da biblioteca de dev para o `server/.env`. A regra do
   operador fala em "só no Railway", sem dizer se vale só para a biblioteca de produção.)*
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
- **Não crie as variáveis antes da hora.** Os nomes delas são definidos no build. Por enquanto,
  as chaves ficam só no painel. **Estado em 25/09: nenhuma variável criada.**

## 6. Decisões do operador

| # | Decisão | Opções | Estado |
|---|---|---|---|
| 1 | Onde guardar as imagens enviadas pelo site | Bunny Storage · Railway Volume | **FECHADA em 25/09/2026** (operador): **Bunny Storage** |
| 2 | O aluno pode mandar a aula para a TV (Chromecast)? | sim · não | **configurado SEM Chromecast em 25/09** (`*.gstatic.com` fora); a confirmar pelo operador |
| 3 | Como os vídeos entram | painel do Bunny + colar o ID · envio pelo admin | **FECHADA em 25/09/2026** (operador): **upload pelo admin**, com as coleções criadas pelo admin (§3.4) |
| 4 | Endereço das imagens | `img.jilsonsantana.com` | **FECHADA em 25/09/2026** (operador): no ar, com SSL |
| 5 | Enterprise DRM | não no lançamento · sim | **FECHADA em 25/09/2026** (operador): **sem Enterprise**; **MediaCage Basic (grátis) ligado** |
| 6 | Purga da CDN na exclusão de conta | chave da conta · cache curto na pasta de fotos · aceitar até 1 mês | pendente: antes do envio da foto do aluno (§4.4) |
| 7 | Gatilho da recarga automática | US$ 2 (atual) · US$ 5 (recomendado) | a confirmar pelo operador (§2) |

## 7. Para o agente de build (Fase 3)

- **O gate do context7 continua obrigatório.** Este guia **não substitui** a consulta de
  `/bunnyway/documentation` no primeiro código que monte token ou URL do Bunny. Os detalhes
  abaixo foram lidos em 25/09 e precisam ser confirmados no build.
- **Token do embed:** HMAC-SHA256 com a chave da biblioteca sobre *chave + videoId + expires*,
  entregue como `?token=…&expires=…` no iframe `iframe.mediadelivery.net/embed/<biblioteca>/<id>`.
  A documentação consultada mostra **duas formas de montar** o token (um exemplo em hex e um em
  Base64 de `assinatura:expires`). **Confirmar qual vale** antes de escrever o código.
- **Com *Block Direct URL File Access* ligado, o iframe precisa de
  `referrerpolicy="strict-origin-when-cross-origin"`.** Sem isso, uma política de referrer mais
  estrita no site faz o Bunny tratar o acesso como direto e recusar o vídeo.
- **CDN token authentication** (na Pull Zone) serve para player próprio ou URL direta. Com o
  player do Bunny em iframe, **não é necessário**.
  **⚠️ Divergência reportada em 25/09, não resolvida:** o operador **ligou** o CDN token na
  `jilsonsantana-stream`. A tela do painel diz que o player embutido assina sozinho, e o vídeo tocou
  no painel. **Falta provar no build** que o iframe no **nosso site**, com o token do embed, continua
  tocando com o CDN token ligado.
- **ACHADO, reportado e não corrigido (25/09):** o token do embed é **por vídeo e por
  validade**. Ele **não carrega a identidade do aluno**. O `CLAUDE.md` → *Video* e o
  `tech-stack.md` citam *"per-user signing"* entre as proteções. Na prática, isso só pode
  significar que o servidor emite o token apenas para quem tem acesso. Confirmar no build e, se
  for isso, ajustar a frase nos dois docs com o ok do operador.
- **CSP:** quando o bloco do `helmet` entrar (backlog P2), o `frame-src` precisa de
  `iframe.mediadelivery.net`, e o `img-src` precisa de `img.jilsonsantana.com`.

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
- **A API key e a token authentication key da biblioteca ficam só no Railway**, nunca no chat
  nem no navegador (§5). **Gate do context7 obrigatório**, com a consulta dizendo **"Stream"**.
- **Teste pendente:** reprodução no **celular com 4G**, quando o site já tocar vídeo.
