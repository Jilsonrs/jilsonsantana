# Bunny — o que contratar e como configurar

> **O QUE É ISTO:** o guia de contratação e configuração do Bunny. Diz quais produtos a escola
> usa e quais ficam de fora, como deixar cada um no painel, e quais escolhas ainda são do
> operador. **NÃO é lido por sessão.**
>
> **QUANDO LER (gatilho mecânico):**
> - antes de criar ou mudar qualquer coisa no painel do Bunny;
> - antes do primeiro write/edit que monte URL, token ou assinatura do Bunny. É o **mesmo
>   gatilho** da superfície Bunny na tabela de context7 do `CLAUDE.md`;
> - antes do primeiro código que **envie arquivo** pelo site, como a foto do aluno.
>
> **De onde vem:** a documentação oficial do Bunny, consultada em **25/09/2026** via context7
> (`/bunnyway/documentation`, 3 consultas). **Preço e nome de tela mudam:** confira no painel
> antes de contratar. O que está marcado **[A VERIFICAR NO PAINEL]** não apareceu na
> documentação consultada.
>
> **O que NÃO está aqui:** as travas de código, como a janela de 6–12 h, a falta de trava por IP
> e o vídeo de apresentação fora do portão. Elas ficam no `CLAUDE.md` → *Video* e *Access
> Architecture*, porque um agente prestes a escrever código erra sem elas.

## 1. Resumo: o que entra e o que fica de fora

| Produto do Bunny | Para que serve aqui | Contratar? |
|---|---|---|
| **Stream** (bibliotecas de vídeo) | aulas + vídeo de apresentação de cada curso | **Sim**: é a Fase 3 |
| **Storage + CDN** (*Storage Zone* + *Pull Zone*) | imagens **enviadas pelo site**: foto do aluno e imagem de curso pelo admin | **Recomendado, com decisão pendente do operador** (§4). Só quando existir envio de arquivo |
| **MediaCage Enterprise DRM** | proteção máxima contra cópia do vídeo | **Não no lançamento.** Custa **US$ 99/mês fixos por biblioteca**, mais as licenças, mesmo sem uso *(doc do Bunny, 25/09/2026)* |
| Optimizer, Shield/WAF, DNS, Edge Scripting, Magic Containers, Database, Fonts | — | **Não.** Nenhum deles impede uma falha nossa hoje (critério de stack do `CLAUDE.md`) |

## 2. A conta

- [ ] Criar a conta com o **e-mail do admin**, o mesmo que já está protegido.
- [ ] **Ligar o 2FA por aplicativo autenticador no primeiro dia** (nunca SMS), e guardar os
      códigos de recuperação **fora do Mac**. O item já está na Fase 7 (continuidade do
      operador), mas conta de fornecedor sem 2FA é o risco que faz mais estrago em minutos.
- [ ] A cobrança é **por uso**. Conferir no painel os valores e se existe mínimo mensal.
      **[A VERIFICAR NO PAINEL]**

## 3. Stream — os vídeos

### 3.1 Três bibliotecas, uma por papel *(recomendação do agente, a confirmar no build)*

| Biblioteca | Ambiente | O que guarda | Token |
|---|---|---|---|
| `jilson-aulas` | produção | as aulas: só para quem tem assinatura ativa | **ligado** |
| `jilson-apresentacao` | produção | o vídeo de apresentação dos cursos, que toca para quem **não** é assinante (é ativo de venda) | desligado |
| `jilson-dev` | desenvolvimento | 2 ou 3 vídeos de teste | ligado, igual à de aulas |

**Por que separar a apresentação das aulas:** o token vale para a **biblioteca inteira**. Se o
vídeo de venda morasse junto com as aulas, a página pública também precisaria de token. Uma
página pública pode ficar guardada em cache, e aí o vídeo quebra quando o token vence.
Separadas, cada uma tem a regra certa. Se um dia houver Enterprise DRM, ele liga só onde precisa,
porque ele é cobrado por biblioteca.

**Por que uma biblioteca de dev:** cada ambiente nasce com a sua própria chave (`CLAUDE.md` →
*Secrets*). Com a chave de produção no computador, um vazamento no ambiente menos protegido seria
um vazamento de produção.

**Idioma não pede biblioteca própria:** curso em inglês é outro curso, com os seus próprios
vídeos (`CLAUDE.md` → *Idiomas*). Os vídeos dele ficam na mesma `jilson-aulas`.

### 3.2 Segurança da `jilson-aulas` (painel → Security)

Tudo abaixo **existe no Stream**, conforme a documentação consultada:

- [ ] **Embed view token authentication → LIGAR.** Sem o token, o player recusa (403). Quem gera
      o token é o **nosso servidor**, e só para quem tem assinatura ativa. A validade é de **6 a
      12 h**, por decisão de Ago 2026 (não encurtar; a razão está no plano, Fase 3).
- [ ] **Allowed domains → `jilsonsantana.com`** (mais `www.jilsonsantana.com`, se esse endereço
      for usado). Com isso, o vídeo só toca dentro do site. **Isto fecha o item
      *[PENDENTE DE VERIFICAÇÃO]* da Fase 3:** a restrição de domínio existe e se chama *Allowed
      domains*.
- [ ] **Block Direct URL File Access → LIGAR.** Impede baixar o arquivo pelo endereço direto.
- [ ] **Sem trava por IP.** É decisão de Ago 2026: o vídeo não pode parar quando o aluno troca o
      Wi-Fi pelo 4G.
- [ ] **DRM:** o Enterprise fica fora (§1). Se o painel oferecer uma proteção básica **sem
      custo**, ligar. **[A VERIFICAR NO PAINEL]**
- **Aula na TV (Chromecast) é decisão do operador** (§6). Se for sim, é preciso acrescentar
  `*.gstatic.com` aos *Allowed domains*, senão o vídeo toca no navegador e não toca na TV.

Na `jilson-dev`, a mesma configuração, com **`localhost`** nos *Allowed domains*.

### 3.3 Segurança da `jilson-apresentacao`

- [ ] Token **desligado**: ela precisa tocar para qualquer visitante.
- [ ] **Allowed domains → `jilsonsantana.com`**: sem isso, qualquer site poderia exibir os seus
      vídeos de venda.
- [ ] **Block Direct URL File Access → LIGAR.**

### 3.4 Como os vídeos entram *(decisão do operador, §6)*

- **Opção A (recomendada para o lançamento):** você envia o vídeo pelo painel do Bunny, copia o
  **ID do vídeo** e cola na aula, no admin da escola. Não tem código a mais nem nada para
  manter.
- **Opção B:** o envio acontece pelo admin da escola. É mais cômodo, mas é código novo numa fase
  de alto risco.

O plano já prevê as duas (Fase 3 → *admin upload flow, or direct-to-Bunny + store reference*).

## 4. Storage + CDN — as imagens enviadas pelo site *(decisão pendente do operador)*

**Hoje não há nada a contratar.** As imagens dos cursos moram no projeto (`client/public/img`)
e entram inteiras em cada publicação.

**Quando houver envio de arquivo pelo site** (a foto do aluno, pendência de 24/09, ou imagem de
curso pelo admin), o arquivo **não pode ficar na Railway**: o disco do servidor é zerado a cada
publicação.

| Opção | Leitura |
|---|---|
| **Bunny Storage + Pull Zone** *(recomendação do agente, 25/09)* | Não entra fornecedor novo, porque o Bunny já vem com os vídeos. Entrega rápido no mundo todo, e a troca de fornecedor é simples (abaixo) |
| Railway Volume | Um disco que sobrevive às publicações. Fica numa máquina só, sem entrega rápida no mundo |
| ~~Dentro do banco (Neon)~~ | **Não.** Deixa o banco pesado (o plano grátis tem pouco espaço), faz cada imagem passar por um banco que dorme (~1,2 s para acordar) e pesa a cópia de segurança |

**Se a escolha for o Bunny, a configuração é esta:**

- [ ] **Storage Zone** de produção (`jilson-arquivos`) e uma de dev (`jilson-arquivos-dev`), pela
      mesma regra de chave por ambiente. A região principal deve ser a mais perto do Brasil que o
      painel oferecer. **[A VERIFICAR NO PAINEL]** A replicação em outras regiões custa a mais e
      pode esperar, porque o CDN já entrega rápido.
- [ ] **Pull Zone** ligada à Storage Zone: *Origin → Origin Type → Bunny Storage Zone*.
- [ ] **Endereço próprio:** `img.jilsonsantana.com` como *hostname* da Pull Zone, um registro
      CNAME no DNS do domínio e o HTTPS ligado para ele no painel.
      **Por quê:** numa troca de fornecedor, o endereço que o público vê **não muda**, e links já
      compartilhados continuam funcionando.

**Regras de build que já valem** (é o que torna a troca simples):

- O banco guarda **só o caminho** (`alunos/…webp`). O começo do endereço fica numa única
  configuração do servidor. Trocar de fornecedor é copiar os arquivos e mudar essa
  configuração, sem nenhuma linha do banco.
- **O nome do arquivo é imprevisível**, nunca o número do aluno: ninguém deve adivinhar o
  endereço da foto de outra pessoa.
- **A foto é dado pessoal:** ela some junto quando a conta é excluída (LGPD). Formato **WebP**
  (`design.md` §12).
- **Cópia de segurança pela API do Bunny, que usa HTTPS.** O FTP do Bunny existe, mas **não tem
  criptografia**, conforme a própria documentação: não usar. A cópia fria das imagens entra junto
  com a cópia de segurança do banco (Fase 7).

## 5. Chaves e senhas — leia antes do passo a passo

O Bunny gera três tipos de chave:

1. **API key de cada biblioteca do Stream:** assina o token do vídeo. Vai para o **servidor**.
2. **Senha de cada Storage Zone:** envia e apaga arquivos. Vai para o **servidor**.
3. **API key da conta:** dá acesso total à conta. **Não vai para lugar nenhum**, porque o site
   não precisa dela.

- **NUNCA cole uma chave no chat**: nem no Claude do projeto, nem no Claude Code, nem em
  print. Conversa não se apaga. **Se uma chave aparecer no chat, gere outra no painel na mesma
  hora.**
- **Produção:** a chave vai direto do painel do Bunny para as *Variables* do Railway, sem passar
  por nenhum outro lugar.
- **Dev:** as chaves da `jilson-dev` e da `jilson-arquivos-dev` vão no `server/.env`, com o
  arquivo **fechado no editor** antes de salvar.
- **Não crie as variáveis antes da hora.** Os nomes delas são definidos no build da Fase 3. Por
  enquanto, basta criar as bibliotecas e deixar as chaves no painel.

## 6. Decisões do operador

| # | Decisão | Opções | Quando |
|---|---|---|---|
| 1 | Onde guardar as imagens enviadas pelo site | Bunny Storage *(recomendado)* · Railway Volume | antes do envio da foto do aluno |
| 2 | O aluno pode mandar a aula para a TV (Chromecast)? | sim · não | antes de configurar os *Allowed domains* |
| 3 | Como os vídeos entram | painel do Bunny + colar o ID *(recomendado)* · envio pelo admin | antes do bloco de vídeo da Fase 3 |
| 4 | Endereço das imagens | `img.jilsonsantana.com` · outro nome | junto com a decisão 1 |
| 5 | Enterprise DRM | não no lançamento *(recomendado)* · sim | antes da Fase 3 |

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
- **ACHADO, reportado e não corrigido (25/09):** o token do embed é **por vídeo e por
  validade**. Ele **não carrega a identidade do aluno**. O `CLAUDE.md` → *Video* e o
  `tech-stack.md` citam *"per-user signing"* entre as proteções. Na prática, isso só pode
  significar que o servidor emite o token apenas para quem tem acesso. Confirmar no build e, se
  for isso, ajustar a frase nos dois docs com o ok do operador.
- **CSP:** quando o bloco do `helmet` entrar (backlog P2), o `frame-src` precisa de
  `iframe.mediadelivery.net`.
