# Assinatura e cobrança — a especificação

> **O QUE É ISTO:** a especificação de produto da assinatura — preço, política de
> recorrência, régua de inadimplência e as telas de cancelamento. **NÃO é lido por
> sessão.**
>
> **QUANDO LER (gatilho mecânico, não julgamento):** antes do primeiro write/edit
> que toque `stripe` / `@stripe/*`, `server/src/routes/billing*`, qualquer handler
> de webhook, ou o model `Subscription`. É o **mesmo gatilho** que já obriga a
> chamada de context7 para a superfície Stripe — a linha está na tabela do
> `CLAUDE.md` → Context7 → MANDATORY TRIGGER, para haver **um lugar só** a
> consultar.
>
> **O que NÃO está aqui:** as travas que quebram o código se ignoradas — a regra
> do gate, `cancel_at_period_end`, a montagem do webhook acima do `express.json()`,
> idempotência, `await` no `try/catch` do e-mail. Essas ficam no `CLAUDE.md`,
> porque um agente prestes a escrever código produz um diff **errado** sem elas.
> Aqui fica o que se precisa saber ao **decidir**, não ao digitar.

## Preço

**2 objetos `Price` da Stripe sob um produto "Assinatura":** mensal **R$ 99,90**
(sem fidelidade, é o padrão) + anual **~R$ 995** (~17% de desconto).

- **Sem teste grátis.** O conteúdo da escola é para assinantes, com uma exceção: **a prévia
  grátis** — as aulas que o admin marca como prévia (`Lesson.isFreePreview`) tocam para qualquer
  visitante, sem login, e os arquivos delas continuam só para assinantes *(decisões do operador,
  27 e 29/09/2026 — `CLAUDE.md` → Access Architecture)*. Fora isso, o grátis mora no YouTube.
- **Trocar de plano** *(decisões do operador, 11/10/2026 — o detalhe em *Minha assinatura*,
  abaixo)*: **mensal → anual vale na hora**, com o ano começando no dia da troca, e a pessoa paga
  o anual menos o que sobrou do mês já pago — **o valor cobrado é exatamente o mostrado**, num
  clique só; **anual → mensal vale no fim do ano já pago**. A conta mostrada é a prévia da própria
  Stripe; a cobrança não usa a proração dela, que anda com o relógio, e sim o anual cheio com um
  crédito de valor fixo.
- `temAcessoAtivo()` **ignora qual plano** o membro tem.
- **Não existe oferta de fundador** *(decisão do operador, set/2026)* — nem bônus temporário,
  nem preço travado. A home não usa escassez fabricada.

### Só em reais, só para o Brasil *(decisão do operador, 12/10/2026 — etapa 4.6c)*

A escola cobra **só em reais** e **não vende para fora do Brasil**. Saíram o preço em dólar pelo
país do cartão (US$ 30 e US$ 299, decidido em 14/09/2026) e, com ele, a questão do imposto de
fora: com a empresa no Brasil, a Stripe não cuida desse imposto por nenhum caminho. O porquê está
na entrada Out 2026 (28) do changelog do `CLAUDE.md`; o texto antigo destas seções e a pesquisa de
12/10/2026, no `decisions-archive.md` → *Registros de pesquisa*. *Reabre só por decisão dele, com
dado novo — o Stripe Tax ou o Managed Payments aceitarem empresa do Brasil, ou a empresa mudar
de país.*

## Formas de pagamento: cartão E Pix *(decisão do operador, set/2026)*

A escola aceita **cartão e Pix**, e o Pix é **recorrente**: o aluno autoriza uma vez no
aplicativo do banco (Pix Automático) e a Stripe cobra sozinha a cada período.
`[FATO — documentação da Stripe consultada em set/2026: "You can now create subscriptions that
use Pix as the payment method for recurring billing for customers in Brazil", via mandate options
no PaymentIntent/SetupIntent/Checkout Session; suporte anunciado em 22/abr/2026.]`

**O que isso acrescenta à Fase 4:** o Payment Element precisa das opções de mandato, e a régua de
inadimplência ganha um caminho próprio — **falha de Pix não se retenta como cartão** (não existe
"tentar o mesmo cartão de novo"). *Gatilho de reabertura: se o Pix recorrente exigir mais
manutenção do que traz em conversão, ele sai e fica só o cartão.*

## Reembolso: 7 dias, por lei *(set/2026)*

A home responde "Tem reembolso?" com **7 dias a contar da assinatura**, valendo igual para mensal
e anual. Não é liberalidade: é o **direito de arrependimento do CDC, art. 49** (compra fora de
estabelecimento comercial), com devolução **imediata e corrigida** dos valores pagos. É norma de
ordem pública — pode-se dar mais, nunca menos. Depois do prazo, o cancelamento não devolve dinheiro:
o acesso vai até o fim do período já pago.

**Um prazo só: os 7 dias da lei** *(12/10/2026 — etapa 4.6c)*. Com a escola só para o Brasil,
saíram a promessa de 7 dias "ao mundo" da página em inglês (22/09/2026) e os 14 dias para fora do
Brasil (10/10/2026), que nunca chegaram ao código (`PRAZO_DO_REEMBOLSO_EM_DIAS = 7`, no `core`).
O texto antigo está no `decisions-archive.md` → *Registros de pesquisa*.
**O texto em português da home não cita os 7 dias** — a resposta de "Tem reembolso?" diz
"garantia legal de arrependimento". *Alinhar é decisão do operador (texto de interface é dele);
fica aqui apontado, não corrigido.*


**Trocar de plano não recomeça o prazo** *(decisão do operador, 10/10/2026, como na Udemy)*: os
dias contam do primeiro dia da assinatura; passar do mensal para o anual não abre prazo novo.
*Reabre se chegar reclamação formal sobre o reembolso do plano anual.*

**Sem advogado: a escola segue o que as grandes fazem** *(decisão do operador, 10/10/2026: "Eu
não vou consultar advogado, vamos seguir como os grandes fazem")*. O modelo é a política da
Udemy, descrita abaixo. *Reabre se chegar uma reclamação formal: Procon, juizado, ou cobrança
contestada no cartão por reembolso negado.*

**Cancelar e reembolso — a regra inteira** *(decisão do operador, 10/10/2026 — fecha a P56)*:
- **O aluno cancela a qualquer momento**, inclusive cedo, só para não esquecer de ser cobrado
  (*"às vezes só quer estudar um mês"*). O acesso fica **garantido até o fim do período pago**.
- **Dentro dos 7 dias:** cancelou com reembolso → **recebe o dinheiro de volta e perde o acesso**.
- **Depois dos 7 dias:** não há reembolso, e o acesso continua até o fim do período pago.

*Reabre se a escola passar a dar mais que a lei (prazo maior, devolução proporcional).*

**Dentro dos 7 dias, o aluno ESCOLHE** *(decisão do operador, 10/10/2026)*: a tela oferece as
duas saídas — **"parar a renovação e continuar"** (assiste até o fim do período pago) e
**"cancelar e receber o dinheiro de volta"** (perde o acesso na hora). *Sem gatilho próprio:
acompanha a regra acima.*

**Reembolso repetido: SEM bloqueio automático — a trava são os termos de uso** *(decisão do
operador, 10/10/2026: "não barrar depois de 2 reembolsos, vamos usar outras travas colocando
alguma coisa nos termos" — quem pede reembolso de forma abusiva, contra as políticas da escola,
perde o direito a ele. **Substitui** o "no máximo 2 reembolsos por aluno" decidido horas antes, no
mesmo dia, e nunca construído.)* **Referência dele: a Udemy.**
`[PESQUISA — as duas páginas oficiais da Udemy, em telas enviadas pelo operador em 10/10/2026
("Política de reembolso da Udemy" e "Exceções de reembolso do plano de assinatura devido à lei
aplicável"), mais busca na web; NÃO é parecer jurídico]`
- **A cláusula de abuso da Udemy, como está escrita:** *"Reservamos o direito, a nosso critério
  exclusivo, de limitar ou recusar solicitações se acreditarmos que há um abuso de reembolso,
  incluindo, entre outros"*: parte considerável do curso consumida ou baixada antes do pedido ·
  vários reembolsos do mesmo curso · reembolsos em excesso · conta reportada ou banida por violar
  os termos · reembolso já dado por terceiro (o processador de pagamento). E fecha com: *"Essas
  restrições de reembolso serão aplicadas no limite permitido pela lei aplicável."*
- **Na ASSINATURA a Udemy não dá garantia nenhuma além da lei:** *"não há reembolsos parciais ou
  totais incluídos, exceto quando exigido pela lei aplicável"*. Onde a lei exige, ela honra
  **dentro do prazo de cada país**, contado **do primeiro dia da assinatura** — e **trocar do
  mensal para o anual não recomeça o prazo**. O pedido de reembolso cancela a assinatura.
- **Os prazos da tabela dela:** Brasil 7 dias · Austrália, África do Sul, Taiwan e Tailândia 7 ·
  Argentina e Chile 10 · Colômbia e México 5 · **União Europeia, Reino Unido, Suíça e outros: 14** ·
  Quebec e Turquia: a qualquer momento.
- **Foi esta tabela que levou à decisão de 14 dias fora do Brasil** (10/10/2026), que saiu dois
  dias depois, com a venda para fora (acima).
- **No Brasil, a própria Udemy diz que não consegue impedir de forma sistemática vários
  reembolsos**, porque a lei daqui não abre exceção para quem compra e devolve várias vezes:
  analisa caso a caso ([comunidade](https://community.udemy.com/pt/discussion/30395/reembolsos-acima-do-normal)).
- **O que a lei diz:** o art. 49 do CDC dá os 7 dias sem exigir motivo e não diz quantas vezes;
  não achamos lei nem decisão de tribunal superior sobre uso repetido — a doutrina fala em boa-fé
  e abuso de direito, sem consenso
  ([Conjur](https://www.conjur.com.br/2025-set-16/litigancia-predatoria-no-e-commerce-o-desafio-do-direito-de-retencao//?print=1)).
  E cláusula que tira o arrependimento já foi anulada
  ([TJDF](https://www.conjur.com.br/2025-out-18/homem-e-pressionado-a-contratar-curso-enganoso-e-tj-df-determina-devolucao-de-dinheiro//?print=1)).

**O que isso muda para a escola:** a cláusula vale por inteiro para o que a escola dá ALÉM da lei
— hoje, nada: a escola dá os 7 dias da lei, e só no Brasil. Para o
consumidor brasileiro, dentro dos 7 dias da lei, negar reembolso só pela cláusula é frágil: ali
ela serve para dizer o que a escola considera abuso e para sustentar a análise caso a caso.
**O texto dos termos é do operador, no modelo da cláusula da Udemy (P61).**
**As travas que não dependem de texto** (já decididas ou no plano): o reembolso corta o acesso na
hora · o painel de assinaturas (etapa 4.7b) mostra as cobranças devolvidas de cada aluno, para o
caso a caso.
*Reabre se o reembolso repetido virar prejuízo medido — aí um limite volta à mesa.*
**CONFIRMADO em 21/10/2026** *(fecha a P75, que a segunda revisão de segurança de 11/10 tinha
levantado de novo)*: na abertura da etapa 4.7, passo 4, à pergunta "mantém?", ele respondeu
**"Mantém como decidido"** — entre isso e "uma vez por conta, pela tela" (do segundo reembolso em
diante a tela não ofereceria mais). O que pesou na pergunta: cada volta exige pagar de novo, o
reembolso tranca as aulas na hora, e um limite por conta seria driblado com outro e-mail, agora que
o visitante assina sem conta. *O gatilho de reabertura é o de cima.*

**Estado do código (11/10/2026): o reembolso CORTA o acesso** (etapa 4.6, sessão b, passo 8;
ainda não publicado). A fatura da Stripe não tem situação de "reembolsada" (as situações são
`draft`, `open`, `paid`, `uncollectible` e `void` — tipos da `stripe@23.0.0`): devolvido o
dinheiro, ela continua `paid`. Por isso o "pago até" do espelho passou a ler a COBRANÇA: a última
fatura devolvida por inteiro não conta como paga. O detalhe está em *Minha assinatura*, abaixo.

## O plano ANUAL não aparece na home *(decisão do operador, set/2026)*

A home mostra **um cartão só** (Mensal R$ 99,90) com o selo "17% de desconto no plano anual". O
anual (R$ 995/ano, ≈ R$ 82,92/mês) é oferecido **na hora de assinar**.
**TRAVA para a Fase 4:** a tela de pagamento **tem** que oferecer a escolha mensal/anual — senão a
home anuncia um desconto sem caminho, que é exatamente o tipo de promessa vazia que a régua de
conteúdo proíbe.

## Quem opera a recorrência: Stripe Billing

*(Decisão REVISTA em Ago 2026 — a anterior era recorrência in-house "para evitar a
taxa". O raciocínio completo está em `decisions-archive.md`, entrada Ago 2026 (4).)*

A Stripe agenda renovações, roda **Smart Retries**, envia lembretes de atraso,
resolve 3DS/SCA off-session e proração. **Não construímos motor de cobrança.**

O que **fica** nosso: a fronteira de acesso, os webhooks, o force-sync e as telas
de assinatura. Billing removeu a mecânica do dinheiro, **não** a fronteira de
acesso — por isso a Fase 4 continua HIGH RISK.

## Régua de inadimplência (dunning) — política de produto, não código nosso

A régua (D0 → tentativas → corte) é **decisão nossa**; quem executa é a Stripe.

**Acima de tudo: o acesso é MANTIDO durante a janela de tentativas** (`past_due`).
Churn involuntário é a maior alavanca de receita da escola (`strategy.md`) —
cortar acesso de quem só teve o cartão recusado é perder assinante por problema
que se resolve sozinho na maioria das vezes. *(Regra de Ago 2026 — **revista em 11/10/2026**,
logo abaixo: o acesso passa a durar 3 dias, não a janela inteira.)*

**A TOLERÂNCIA: as aulas ficam abertas por 3 DIAS depois da cobrança que falhou** *(decisão do
operador, 11/10/2026: "2 semanas é muito tempo, ele pode estudar os cursos todos e não pagar mais
nada […] não quero perder aluno e nem ser vítima de espertinhos" — entre 0, 3 e 7 dias)*. Os
dois relógios se separam: **a Stripe continua tentando cobrar** pelo prazo do painel, e **as
aulas trancam passados 3 dias** da cobrança que falhou. Pagou — uma tentativa passou, ou a pessoa
trocou o cartão —, as aulas reabrem na hora. **Dois e-mails automáticos, pedidos por ele:** na
falha ("não conseguimos renovar; vamos tentar de novo no dia X", com o link para trocar o
cartão — a Stripe diz a data da próxima tentativa) e antes de trancar ("se não for pago até o dia
Y, você perde o acesso"). Entram na etapa 4.7, que traz o envio de e-mail.
**NO CÓDIGO desde 12/10/2026 (etapa 4.6b).** A regra mora em `assinaturaDaAcesso`
(`server/src/lib/acesso.ts`); o prazo, em `TOLERANCIA_DA_COBRANCA_ATRASADA_EM_DIAS` (`core`).
Os 3 dias contam do "pago até" do espelho, que numa atrasada é o instante da renovação não paga.
O que a pessoa vê *(escolhas do operador, 12/10/2026)*:
- **Dentro dos 3 dias**, em Faturamento e Assinatura: "Não conseguimos cobrar o seu cartão.
  Troque o cartão até {data} para não perder o acesso." A data é a do dia em que as aulas
  trancam — e elas trancam na mesma hora em que a cobrança falhou, não no fim desse dia.
- **Depois dos 3 dias**, no mesmo lugar: "Não conseguimos cobrar o seu cartão, e as aulas estão
  trancadas. Troque o cartão para voltar a estudar." *(aprovado por ele em 12/10/2026)*. A
  assinatura continua na tela, com "Trocar cartão" e "Cancelar assinatura": o cartão novo paga a cobrança em aberto
  e as aulas voltam na hora.
- **A aula trancada** diz "Sua assinatura está com a cobrança atrasada.", com o botão "Trocar
  cartão" — no lugar de "Esta aula é para assinantes." e "Reativar assinatura".
- **A tela de assinar** leva essa pessoa a Faturamento e Assinatura: não se assina de novo por
  cima de uma assinatura viva (o servidor recusa com 409 `CobrancaAtrasada`). O botão da home
  continua dizendo "Reativar assinatura" e chega ao mesmo lugar.
- **Passar dos 3 dias não desloga ninguém:** a aula tranca pelo gate, e a pessoa continua
  logada, que é o que ela precisa para trocar o cartão. O cancelamento automático que vem
  depois (as tentativas acabaram) também não desloga: ela já estava sem as aulas.

`[FATO — medido na área restrita com o relógio de teste da Stripe, 12/10/2026; 11 pontos]` a
renovação que falha deixa a assinatura `past_due` com o "pago até" no instante da renovação · as
novas tentativas da Stripe não mexem nele · 2 dias depois há acesso; 4 dias depois não há, e a
Stripe continua tentando · o cartão novo paga a cobrança em aberto e o acesso volta na hora, com
o "pago até" no fim do período novo · na área restrita, 16 dias depois da falha a assinatura já
estava `canceled` (lá a opção do painel já é "cancelar").
**Os 3 dias contam da PRIMEIRA cobrança que falhou, e isso não depende do painel** *(achado da
revisão de segurança, 12/10/2026)*: os 3 dias contam do começo do período não pago, e uma
assinatura que ficasse atrasada por mais de um ciclo — o painel em "deixar atrasada" (pendência
P60) ou tentativas por 1 mês ou mais — ganharia um período novo na Stripe, com 3 dias de aula a
cada ciclo sem pagamento. Por isso a rotina que grava o espelho **não aceita data nova de uma
atrasada que continua atrasada**; pagou, a data volta a andar. (Que a Stripe abre o período
novo não foi medido: na área restrita ela cancela antes. A guarda vale nos dois casos.)
**Quem pagou e ficou trancado se acerta sozinho:** se uma nova tentativa da Stripe passa e o
aviso se perde, abrir Faturamento e Assinatura confere com a Stripe e reabre as aulas; se o
acerto falhar — ali ou depois de pagar com o cartão novo —, vai um alerta para o operador
(alguém pagando e trancado fora).
`[FATO — prova de ponta a ponta, 12/10/2026: contas descartáveis no banco de desenvolvimento, as
operações de verdade e o relógio de teste da Stripe; 19 pontos]` a falha deixa a conta atrasada,
com aulas e logada · passados os 3 dias fica sem aulas e logada, e a tela diz "atrasada" com as
aulas trancadas · uma nova sincronia com data mais nova na Stripe não reabre nada · tentar
assinar de novo é recusado e a Stripe continua com uma assinatura só · o cartão novo paga, e
abrir a tela reabre as aulas · cancelar sem aulas encerra na hora, sem cobrança em aberto.
**A Stripe continua tentando cobrar por 2 SEMANAS** *(decisão do operador, 11/10/2026, sobre a
proposta do agente)*: é o padrão recomendado por ela — `[FATO — context7 /websites/stripe,
11/10/2026]` 8 tentativas em 2 semanas; as opções são 1, 2 ou 3 semanas, 1 mês e 2 meses. Com a
tolerância separada, esse prazo deixa de dar dias de aula sem pagar. Configura-se no painel da
Stripe, na mesma tela da pendência P60. *Reabre junto com a tolerância.*
*Reabre se os dados de alunos de verdade mostrarem que 3 dias perde pagante honesto (muita gente
reativando logo depois de trancar) ou que ainda sobra abuso.*

**Quando as tentativas acabam, a assinatura é CANCELADA — e a escola avisa por e-mail, com o
link para reativar** *(decisão do operador, 10/10/2026: "é melhor cancelar e enviar e-mail com
link para reativação ou instrução, igual a AI quando não consegue cobrar cancela e depois paga
reativa")*. No painel da Stripe a opção é **"cancelar a assinatura"** — nunca "marcar como não
paga" nem "deixar atrasada" —, nos dois ambientes (tarefa do operador: pendência P60). Quem foi
cancelado assim lê "Reativar assinatura" e assina de novo pela tela de assinar; o e-mail entra
na etapa 4.7, que traz o envio de e-mail.
`[FATO — context7 /websites/stripe, 10/10/2026]` "Não paga" (`unpaid`) **não tenta mais cobrar**,
mas continua gerando fatura a cada período; **cancelada é estado final** — não se reativa,
cria-se outra (é o que "Reativar assinatura" faz).
*Reabre se a escola quiser cobrar o período em atraso de quem volta (é para isso que "não paga"
guarda a dívida), ou quando a pausa for lançada.*

## Cancelamento dentro do site

Deliberadamente **não usamos o Customer Portal da Stripe**: cancelar e gerenciar
acontece em telas nativas da escola (o aluno nunca sai do site).

- Coleta o motivo → `subscriptions.update` com `cancel_at_period_end`.
- **Anti roach-motel:** um "cancelar mesmo assim" claro, de **1 clique**, sempre
  visível. Tom calmo, não retentivo. *(Sensibilidade Procon/CDC — já levantada na
  decisão de preço.)*
- **Toda assinatura cancelada gera um e-mail AUTOMÁTICO do sistema para o aluno**, com o link
  para reativar *(decisão do operador, 10/10/2026: "o sistema envia automaticamente e-mail para
  o aluno, como a Anthropic faz")*. Não é botão do admin: sai sozinho quando a Stripe avisa.
  Entra na etapa 4.7, que traz o envio de e-mail. *Reabre se o e-mail incomodar quem cancelou
  de propósito — aí separa-se o cancelamento pedido do cancelamento por falta de pagamento.*
- **Faseamento:** captura de motivo = lançamento · **"pausar 1 mês"** (pause
  collection da Stripe) = logo depois, não no lançamento.

## Crescimento (pós-MVP)

`Subscription` já nasce com as costuras de corporativo (`organizationId`, `seats`)
— definidas uma vez em `CLAUDE.md` → Access Architecture, não repetidas aqui.
Aluno corporativo passa **pelo mesmo gate**: `temAcessoAtivo()` nunca precisa
saber qual caminho concedeu o acesso.

## O espelho: o que o gate lê *(Fase 4, etapa 4.1 — 09/10/2026)*

O aviso da Stripe (webhook) atualiza a nossa `Subscription`, que é o que `temAcessoAtivo()` lê.
**Como o `currentPeriodEnd` do espelho é calculado — convenção de engenharia, não decisão de
produto:** a regra do gate (`CLAUDE.md`) diz *"o período já foi PAGO"*. Na Stripe, quando a
renovação falha, o período **já avançou antes de cobrar**: o fim do período atual seria um mês **não
pago**, e quem tivesse a assinatura cancelada por falta de pagamento ficaria com acesso até lá. Por
isso o espelho guarda o **pago até**: última fatura **paga** → o fim do período atual; senão → o
**começo** dele, que é onde o último período pago terminou. `[FATO — context7 /websites/stripe e os
tipos da `stripe@23.0.0`, 09/10/2026: o período fica em `items.data[].current_period_end`.]`
O espelho se recalcula **buscando a assinatura na Stripe a cada aviso** (nunca o retrato do aviso), e
liga a assinatura à conta pelo `userId` que o NOSSO checkout grava na Stripe — ou, na do visitante
que assinou sem conta, pela ficha de espera dele, e a conta nasce ali (etapa 4.7, passo 4: *Assinar
sem conta*, abaixo).

**As chaves:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` e `STRIPE_PUBLISHABLE_KEY` (esta não é
segredo, mas mora junto: o servidor a entrega ao site, e trocar de ambiente é trocar as variáveis
de um lugar só), **só no ambiente do servidor**
(`server/.env` em dev, Railway em produção) — coladas pelo operador, nunca pelo chat. Até o
lançamento: as do **modo de teste** *(revisto em 10/10/2026: no site, as de VERDADE desde a etapa
4.3; as de teste ficam só no computador — ver "Assinar com a conta logada", abaixo)*. Sem o segredo do webhook, todo aviso é recusado (nunca "aceitar
sem verificar", como alguns exemplos da própria doc da Stripe fazem). O espelho guarda de qual modo
veio cada assinatura (`livemode`): no GO-LIVE, as do modo de teste saem do banco de produção (plano,
Fase 7) — as chaves de verdade nunca mais recebem aviso delas, e uma ativa daria acesso para sempre.

**A cobrança pausada** `[FATO — tipos da `stripe@23.0.0`, 09/10/2026: com a cobrança pausada
(`pause_collection`), "o status da assinatura não muda" — continua `active` — e as faturas continuam
sendo geradas]`. O espelho grava **`paused`** enquanto a pausa durar; senão o gate, que libera
`active` sem olhar data, daria a pausa inteira de graça. Como `paused`, vale a segunda metade da
regra do gate: o acesso vai até o fim do período pago — e o "pago até" acompanha, porque a fatura
gerada na pausa nunca fica paga. *(Achado da revisão de segurança da etapa 4.1; fecha a pendência
de verificação que existia aqui desde Ago 2026.)*

**Uma assinatura de cada vez:** dois avisos da mesma assinatura nunca são processados juntos, e a
busca na Stripe acontece **depois** da trava (`server/src/lib/assinaturas.ts`). Sem isso, a resposta
velha ("atrasada") podia gravar por cima da nova ("cancelada") — e, como assinatura cancelada não
gera mais aviso, o acesso ficaria liberado para sempre. *(Achado P1 da revisão da etapa 4.1.)*

## Assinar com a conta logada *(Fase 4, etapa 4.2 — 10/10/2026)*

**Decisões do operador:**
- **A tela mora em `/aluno/assinar`; a de depois do pagamento, em `/aluno/assinar/concluido`**
  (10/10/2026). O `/assinar` curto fica para o visitante (etapa 4.7). *Reabre se a etapa 4.7
  decidir uma tela só para os dois.*
- **Chega-se a ela pela aula trancada e pelos botões Assinar da home, quando há login**
  (09/10/2026). Sem login nada muda. *Reabre na etapa 4.7, que liga os botões para o visitante.*
- **Quem já é assinante e abre a tela vê "Você já é assinante" e o caminho para o Início**
  (10/10/2026). *Reabre na etapa 4.6: quem cancelou e ainda tem dias pagos volta a assinar por
  esta tela.* **Feito na etapa 4.6 (11/10/2026):** quem tem a assinatura terminando numa data é
  levado dali a Faturamento e Assinatura, onde está "Manter a assinatura" — voltar sem pagar de
  novo o período que já pagou.
- **O cartão só some com desconto de 100% PARA SEMPRE** (10/10/2026 — consequência da Stripe,
  levada pelo agente e aceita por ele). Com 100% só na primeira cobrança, ou por alguns meses,
  nada é cobrado hoje, mas o cartão é pedido: a cobrança seguinte precisa dele. *Reabre se ele
  quiser cortesia temporária sem cartão — aí a primeira cobrança falharia, e quem decide o resto
  é a régua de inadimplência.*
- **Os textos da tela estão como RASCUNHO do agente** (`app.assinar.*` e `app.aula.assinar`),
  a revisar por ele (*"isso fazemos depois, é detalhe"*, 10/10/2026) — inclusive
  se a tela leva uma linha sobre o reembolso de 7 dias. *Fecha quando ele revisar.* **A proposta
  dessa linha (12/10/2026) está em *A tela pública de assinar*, abaixo — P80 e P81.**
- **A tela é simples, "como a Anthropic faz"** (10/10/2026, depois do primeiro teste dele): cada
  cartão de plano diz o preço e como é cobrado; o anual leva o selo do desconto (calculado dos
  dois preços, nunca um texto fixo); **"Hoje você paga" só aparece com código promocional**
  *(revisto em 12/10/2026 para a tela PÚBLICA, que ganha a coluna de resumo com o total de hoje
  — ver *A tela pública de assinar*; na tela logada, P80)*. O
  acabamento visual é do Antigravity. *Reabre se o Pix (4.9) pedir mostrar de novo o
  valor final antes de confirmar.*
- **A home tem que levar à assinatura também quem não tem conta** (10/10/2026): é a etapa 4.7.
- **A produção usa as chaves de VERDADE desde a etapa 4.3; o computador, a área restrita**
  (10/10/2026 — revê a decisão de 09/10, de chaves de teste no site até o lançamento). Cada
  ambiente com a sua credencial: os testes do dev nunca tocam o site. No site, o cartão de teste
  não funciona: testa-se com um código de 100%. *Reabre se uma etapa precisar simular no site no ar
  o que só o ambiente de teste simula (cartão recusado, renovação adiantada).*
- **A Stripe fecha INTEIRA na Fase 4, com o Pix** (10/10/2026): *"quero que a escola possa ser
  lançada a qualquer momento depois da fase da Stripe."* *Reabre só por decisão dele.*

**Convenções de engenharia (como o código faz):**
- **O site diz só QUAL plano e o código promocional.** A conta é a da sessão; cliente, preço e
  valor são do servidor (`server/src/lib/checkout.ts`).
- **O valor mostrado é o cobrado.** Os preços vêm da Stripe, pela lookup key; com código, o valor
  de hoje é a prévia da fatura da própria Stripe — que não gasta uso do código.
- **O cartão é preenchido antes de a assinatura existir na Stripe**: quem só olha a tela não deixa
  assinatura pela metade lá.
- **Uma conta é sempre UM cliente na Stripe** (tabela `stripe_customer`).
- **Uma tentativa de cada vez por conta, e a nova tentativa usa a MESMA assinatura**: cartão
  recusado e novo clique não criam outra; trocar de plano ou de código cancela a tentativa
  anterior antes de criar a nova. **Menos quando a Stripe cancelou o pagamento** (depois de 10
  recusas — medido em 21/10/2026, *Assinar sem conta*): aí a antiga é cancelada e nasce outra; sem
  isso, o aluno ficaria preso no pagamento morto até trocar de plano ou a tentativa vencer
  *(achado do passo 4 da etapa 4.7; correção autorizada pelo operador em 21/10/2026: "Sim,
  corrija")*. **A trava NÃO ESPERA** *(etapa 4.7, passo 2, 19/10/2026 —
  plano aprovado pelo operador)*: o pedido que chega com outro da mesma conta em andamento
  (outra aba) responde 409 `Ocupada` na hora, sem ir à Stripe — a tela diz "Não foi possível
  concluir a assinatura. Confira os dados e tente de novo.", e o novo clique segue com a mesma
  assinatura. Esperar seguraria uma ligação com o banco, e vários pedidos juntos parariam o site
  de todo mundo. **Com a trava na mão, tudo pela MESMA ligação** (o gate, a lista da Stripe, a
  decisão): pedir outra ali dentro podia esperar uma que não vinha. O cliente novo da Stripe é
  gravado antes, numa transação curta só dele — continua gravado se o resto falhar. A sincronia
  que o checkout chama também não espera.
- **Só o aviso da Stripe grava o espelho.** A tela de depois do pagamento pergunta ao gate até a
  resposta ser sim; nada no navegador libera acesso. *(Revisto na etapa 4.4: quem grava é a
  ROTINA do aviso, que o checkout e o admin também chamam quando o aviso atrasa ou se perde — ver
  "Sincronizar e perder o acesso", abaixo. Continua valendo: nada no navegador libera acesso.)*
- **As formas de pagamento são UMA lista no servidor** (`FORMAS_DE_PAGAMENTO`, hoje só `card`); o
  site abre o campo de pagamento com ela. O Pix (etapa 4.9) é um item a mais.
- **No site, só `client/src/lib/stripe-do-site.tsx` importa `@stripe/*`**; os testes simulam esse
  arquivo, nunca a biblioteca.

`[FATO — medido na área restrita, 10/10/2026, `stripe@23.0.0`]` Cancelar uma assinatura incompleta
a leva a `incomplete_expired` e anula a fatura dela · o segredo da fatura aberta é de um pagamento
(`pi_…`) · campo de `metadata` com valor vazio não é guardado · o `TESTE100` na prévia dá R$ 0 e não
gasta uso · **o Stripe.js no ar recusa `paymentMethodTypes` ao abrir o campo** (o campo não
aparece, sem erro na tela); a opção que vale é `allowedPaymentMethodTypes` · a Stripe CLI 1.53.1
exige dizer quais avisos encaminhar (`stripe listen --all-snapshot --forward-to …`).

`[FATO — context7 /websites/stripe, nota de versão de 30/09/2025]` **O botão "stripe" no canto da
tela de assinar** é a ajuda de teste da própria Stripe: *"automatically rendered in Elements while
using a sandbox environment"*. Aparece com as chaves de teste e não com as de verdade; desliga-se
com `developerTools.assistant.enabled: false`. **Está DESLIGADO** (decisão do operador,
10/10/2026: *"não precisamos desse botão"*), porque a produção fica com chaves de teste até o
lançamento. *Reabre se alguém quiser usar a ajuda de teste da Stripe ao desenvolver — aí liga só
fora de produção.*

**Limitações conhecidas:** código promocional preso a UM cliente aparece como inválido na tela
(a prévia não manda o cliente; hoje não existe código assim) · quem abre a tela de depois do
pagamento sem ter assinado vê "confirmando" e depois "está demorando", sem caminho de volta nela ·
~~**o limite de tentativas do código promocional não existe**~~ — **existe desde 19/10/2026**
(etapa 4.7, passo 1: *Limite de tentativas nas rotas de cobrança*, abaixo).

**Da revisão de segurança da etapa (10/10/2026):**
- **Código promocional que NÃO é "para sempre"** (100% só na primeira cobrança, ou por alguns
  meses): a assinatura já nasce ativa e o acesso é liberado ANTES de o cartão ser guardado — quem
  fecha a tela fica com o período grátis; e nada impede a mesma conta de usar o código de novo
  depois. Hoje não existe código assim. *Quando o operador criar o primeiro: criá-lo na Stripe com
  a restrição de "só na primeira compra", e decidir se a escola recusa o código repetido pela
  mesma conta.*
- **Apagar a conta de quem assina** (exclusão a pedido do titular, LGPD): a linha do cliente sai
  junto com a conta, mas a assinatura **continua cobrando na Stripe**. *Quando a exclusão de conta
  for construída: cancelar a assinatura na Stripe antes de apagar.*
- **Uma assinatura paga pode ser cancelada pelo checkout** se o pagamento cair no instante exato em
  que o aluno troca de plano em outra aba: o registro grita e a conta fica com o período pago, sem
  renovação. Com cartão é questão de frações de segundo; o Pix (etapa 4.9) reabre o assunto.

## A tela pública de assinar *(Fase 4, etapa 4.7, passo 6 — PROPOSTA do agente, 12/10/2026)*

> **A DECISÃO FINAL DE 12/10/2026, QUE VALE SOBRE TUDO ABAIXO:** *"remover tudo que foi feito
> para dar suporte a inglês e fica a escola 100% nativa em português e restrita ao Brasil"*
> (operador; etapa **4.6c** do plano). **Para esta tela:** só em português · sem campo País,
> sem aviso para quem é de fora, sem lista de espera · CPF ou CNPJ obrigatório · coluna de
> resumo · menu e rodapé do site. **Não há fase do exterior:** a pesquisa sobre vender para
> fora (Stripe, Paddle, PayPal, Teachable, Thinkific, a mensagem para a Paddle) desceu inteira
> para o `decisions-archive.md` → *Registros de pesquisa* em 19/10/2026 (etapa 4.6c, passo 6b).

> **NADA AQUI ESTÁ DECIDIDO além do que traz data e frase do operador.** É a proposta do agente
> depois de ele mostrar as telas de pagamento da Udemy e do Code with Mosh. O que existe na tela
> e os textos são dele: as perguntas estão em `pendencias.md` (**P80, P81, P83, P84 e P90**; a P79, a P82, a P86, a P87 e a P89 ele respondeu em 12/10/2026, e a P88 em 21/10/2026). Quem construir o
> passo 6 confere antes o que ele já respondeu, e registra a resposta aqui, com a data e a frase.
> *A Udemy e o Mosh são referência desta análise, nunca texto do site.*

**O que o operador disse (12/10/2026):**
- *"como fizemos para os alunos logado que vai assinar está ótimo porque já está funcionando"* —
  a tela pública parte do MESMO formulário (plano, código, cartão), sem refazê-lo.
- *"sem esquecer do desconto no plano anual que é um atrativo"* — o anual continua à vista, ao
  lado do mensal, com o selo do desconto.
- **DECISÃO: a tela leva o menu de cima e o rodapé do site, como as outras páginas públicas.**
  *"A tela terá menu superior e inferior com rodapé […] e o check out entra no content"* — o
  formulário de assinar entra no meio da página. Recusa a sugestão do agente de um topo só com
  o logo e "Voltar". *Reabre se os números mostrarem gente saindo da tela pelo menu, sem pagar.*
- **Com o código recusado — ou a conferência dele falhando (sem rede, muitas tentativas) —, a tela
  deixa assinar pelo preço cheio, sem o código** *(decisão do operador, 20/10/2026, à pergunta da
  revisão de segurança da etapa 4.7, passo 1: "fica assim")*. O erro aparece embaixo do código, e
  o valor na tela é o cobrado. Vale para as duas telas: o formulário é o mesmo. *Reabre se alguém
  reclamar de ter pago o preço cheio achando que o código valia.*
- **O e-mail que JÁ TEM CONTA: a tela avisa e manda entrar** *(decisão do operador, 21/10/2026, à
  pergunta da abertura da etapa 4.7, passo 4)*: "Este e-mail já tem conta. Entre para assinar." (o
  texto continua rascunho — P81), e a pessoa assina pela tela de quem está logado, que já
  funciona. **Recusada:** não avisar e ligar o pagamento à conta que existe — quem errasse um
  dígito do e-mail pagaria a assinatura de outra pessoa, sem conseguir entrar. **O custo aceito:**
  quem digita um e-mail descobre se ele tem conta na escola, dentro do limite de tentativas.
  *Reabre se o registro mostrar alguém varrendo e-mails pela tela (muitas recusas "já tem conta"
  vindas do mesmo endereço).*
- **Cartão emitido fora do Brasil: ACEITO** *(decisão do operador, 21/10/2026 — fecha a P88)*: a
  tela aceita qualquer cartão; o que restringe a venda ao Brasil é o CPF ou CNPJ obrigatório. Atende
  o brasileiro que tem cartão de banco de fora. Nada a construir; acompanhar no painel da Stripe
  quantos cartões de fora aparecem. **Recusada:** só cartão emitido no Brasil (recusaria esse mesmo
  brasileiro, e pediria uma regra na Stripe ou uma conferência a construir). *Reabre se o painel
  mostrar fraude ou contestação vinda de cartões de fora.*

**O que a Stripe exige para aprovar o pagamento** `[FATO — context7 /websites/stripe, 12/10/2026:
"The Payment Element only collects essential billing address details by default. To collect a
customer's full billing address for tax calculation […] use the Address Element."]`
- **Endereço não é exigido para aprovar o cartão.** O campo de pagamento já pede sozinho o que
  cada cartão precisa. Endereço completo serve para **calcular imposto**: é por isso que o Mosh
  pede (ele cobra "+ taxes") e a Udemy pede só o país.
- **Para a escola:** a Stripe não pede campo a mais na abertura, com a cobrança em reais. O
  país e o CPF entram na tela por outro motivo: a nota fiscal e o imposto de fora (abaixo).
- **DECISÃO: A TELA DE ASSINAR PEDE O CPF DESDE O COMEÇO** *(operador, 12/10/2026 — fecha a
  P79)*. O agente tinha apontado que a FAQ da home promete "emitimos nota fiscal para todos os
  pagamentos" e a tela pede só e-mail e cartão. A primeira resposta dele, no mesmo dia, foi
  pedir o CPF só no pedido da nota; **ele reviu em seguida:** *"eu penso em crescer, MEI é só o
  começo, para não ficar refazendo a tela toda hora, colocar CPF logo já resolve e quando
  alguém solicitar nota fiscal, se precisar de alguma informação adicional, é só solicitar"*.
  O texto da FAQ continua sendo trocado por ele, no admin (P12): "Sim, emitimos nota fiscal
  sempre que solicitada.". **O campo é OBRIGATÓRIO, e aceita CNPJ** *(ele, 12/10/2026: "Sim, deixa CPF obrigatório e aceita CNPJ,
  assim simplificamos as coisas" — fecha a P87)*. A política de privacidade passa a dizer que a
  escola guarda esse número, e para quê (entra com as páginas legais). *Reabre se a escola
  deixar de emitir nota fiscal no Brasil.*
- **O "campo universal" que ele perguntou EXISTE na Stripe** `[FATO — context7 /websites/stripe,
  12/10/2026]`: cada cliente da Stripe guarda um **número fiscal com o tipo do país** — `br_cpf`
  e `br_cnpj` no Brasil, `eu_vat` na Europa, e dezenas de outros. É um campo só, com a legenda
  que muda conforme o país. E a doc diz que o próprio campo de pagamento cuida disso para
  comprador da América Latina: *"The `tax_id` field on the Payment Method `billing_details`
  hash is used to collect and store Latin American buyers' tax identifiers. Stripe Checkout and
  the Payment Element automatically handle `tax_id` collection."* **Não medido:** em que
  situação o campo da Stripe mostra o CPF sozinho (o cartão de teste usado até hoje é dos EUA).

**O que a Udemy e o Mosh mostram na hora de pagar, e a escola:**

| Elemento | Udemy | Mosh | A escola hoje | Proposta |
|---|---|---|---|---|
| Página só de pagamento, sem menu, com uma saída no canto | sim ("Cancelar") | sim (só o logo) | a tela logada tem o menu do app | **não** (decisão dele, 12/10/2026: leva o menu e o rodapé do site) |
| Criar a conta ANTES de pagar (nome, e-mail, código de 6 dígitos) | sim | não: o e-mail vai na própria tela | decidido: a conta nasce no pagamento | não se aplica |
| "Já tem conta? Entrar" | sim | sim | não | **vale ter** |
| Mensal ou anual na tela de pagamento, com selo no anual | sim (anual vem marcado) | escolhe antes, na página | **já temos** (mensal vem marcado) | fica como está |
| "O que está incluído" | 3 linhas | 5 a 6 linhas | só na home | **vale ter** (a lista da home) |
| Dizer que renova sozinha, por quanto, até cancelar | sim | sim | só a frase da Stripe embaixo do cartão, sem valor | **vale ter** (uma linha) |
| Resumo do pedido numa coluna (total de hoje, próxima cobrança) | sim | sim | "Hoje você paga", só com código (decisão de 10/10) | **sim** (decisão dele, 12/10/2026) |
| Código promocional | sim | sim | **já temos** | — |
| "Cancele quando quiser" | sim, e diz onde | sim | **já temos** | — |
| Reembolso | "não concedemos, exceto por lei" | selo de 30 dias | não aparece na tela | **vale ter** (7 dias) |
| "Pagamento seguro" | sim | sim | não | **vale ter** (uma linha) |
| "Ao assinar, você concorda com os Termos" | sim | sim | não | **vale ter**, quando os Termos existirem |
| País ou endereço | só o país | endereço completo | nada | **o país, sim; endereço, não** (P80) |
| CPF ou número fiscal | não pede | só de empresa, opcional | nada | **sim, o CPF** (decisão dele, 12/10/2026) |
| Receber novidades por e-mail | caixa já marcada | caixa desmarcada | não pergunta | **sim, desmarcada** (decisão dele, 12/10/2026) |
| Nome completo | sim | sim | o nome é opcional | **não se pede** (decisão dele, 21/10/2026: em Minha conta, ou na hora do certificado — fecha a P83) |
| Apple Pay, Google Pay, PayPal | os dois primeiros | Apple Pay e PayPal | só cartão (Pix na 4.9) | não na abertura |
| Depoimentos na tela de pagamento | não | 2 | só na home | não na abertura |
| Nota de avaliações, contagem de cursos e de horas | "31.000 cursos" | "52+ courses", nota 4,6 | não | não se aplica hoje |

**A TELA, de cima para baixo** *(o que é novo está marcado; a arrumação visual é do Antigravity —
sugestão: no computador, o formulário à esquerda e os itens 8 e 9 numa coluna à direita; no
celular, uma coluna só, nesta ordem)*:
1. **O menu de cima do site** *(decisão do operador, 12/10/2026)* — o mesmo das outras páginas
   públicas (Cursos, Trilhas, Assine, Meus estudos). No fim da página, **o rodapé do
   site**, que já leva a FAQ, Termos e Privacidade.
2. **Título** — "Assinar" e "Uma assinatura, todos os cursos e trilhas." (os de hoje).
3. **Seus dados** *(novo)* — o e-mail (com uma linha dizendo para que serve e "Já tem conta?
   Entrar"), o **CPF ou CNPJ**, obrigatório, e a **caixa de novidades**, desmarcada (decisões de
   12/10/2026; a caixa: à recomendação do agente, ele respondeu "sim" — fecha a P82; é ela que
   liga o `marketingConsent` da conta que nasce no pagamento). *O campo País e o aviso
   para quem é de fora chegaram a ser decididos e foram cancelados no mesmo dia (etapa 4.6c).*
4. **Escolha o plano** — os dois cartões de hoje, sem mudança: Mensal marcado (é o cartão em que
   a pessoa clicou na home) e Anual ao lado com o selo "17% de desconto" e "equivale a R$ 82,92
   por mês". Embaixo, "Sem fidelidade. Cancele quando quiser."
5. **Código promocional** — o de hoje, com "Hoje você paga" só quando há código.
6. **Pagamento** — o campo do cartão de hoje, com a frase da Stripe embaixo dele.
7. **O resumo, com o botão** *(novo; **decisão do operador, 12/10/2026** — à pergunta "fica a
   coluna de resumo, com o total de hoje e as três linhas dentro dela?", ele respondeu
   "Certo")* —
   uma coluna ao lado do formulário, como a Udemy e o Mosh: o plano escolhido e o valor, o
   desconto quando há código, **o total de hoje**, a renovação (por quanto, até cancelar), o
   reembolso de 7 dias e o pagamento seguro. Depois o botão **Assinar** e a linha dos Termos.
   No celular, o resumo vem logo antes do botão.
8. **O que está incluído** *(novo nesta tela)* — a MESMA lista do cartão da home e a frase do
   rodapé dele ("Acesso a tudo desde o primeiro dia…"). Duas linhas dela prometem o que ainda
   não existe (o JilsonAI e o Pix): **P84**.
9. **Dúvidas** *(novo)* — um link para as perguntas frequentes da home. *Com o rodapé do site
   na tela (decisão de 12/10/2026), o link de FAQ já está lá: o agente passa a sugerir tirar
   este item — P80.*

**Os textos** *(RASCUNHO do agente para o operador aprovar ou reescrever: P81. Só em português,
desde a decisão de 12/10/2026; a coluna em inglês saiu desta tabela)*:

| Onde | Texto |
|---|---|
| E-mail, rótulo | Seu e-mail |
| E-mail, ajuda *(vencido em 21/10: a senha nasce na tela)* | É com ele que você entra na escola. Depois do pagamento, enviamos o link para criar sua senha. |
| E-mail, atalho | Já tem conta? Entrar |
| CPF *(obrigatório)* | CPF ou CNPJ |
| CPF, ajuda | Usamos para emitir a nota fiscal. |
| CPF inválido | Confira o número: este CPF ou CNPJ não é válido. |
| Resumo, título | Resumo |
| Resumo, total | Total de hoje |
| E-mail que já tem conta | Este e-mail já tem conta. Entre para assinar. |
| Muita gente assinando no mesmo instante (`MuitosAoMesmoTempo`) — **texto do operador, 21/10/2026** | Aguarde um instante e tente novamente. |
| Renovação, mensal | Renova todo mês por {valor}, até você cancelar. |
| Renovação, anual | Renova uma vez por ano por {valor}, até você cancelar. |
| Reembolso | Garantia de 7 dias: se não gostar, você recebe de volta o valor pago. |
| Pagamento seguro | Pagamento seguro, processado pela Stripe. A escola não guarda os dados do seu cartão. |
| Termos | Ao assinar, você concorda com os Termos de Uso e a Política de Privacidade. |
| Título da lista | O que está incluído |
| Dúvidas *(se o item 9 ficar)* | Ficou com dúvida? Veja as perguntas frequentes. |
| Novidades *(caixa desmarcada)* | Quero receber novidades e ofertas da escola por e-mail. |
| Depois de pagar, título | Assinatura confirmada. |
| Depois de pagar, texto *(vencido em 21/10)* | Enviamos um e-mail para {email} com o link para você criar sua senha e começar a estudar. |
| Depois de pagar, não chegou *(saiu em 21/10)* | Não chegou em alguns minutos? Confira a caixa de spam ou peça de novo. |
| Depois de pagar, botão *(saiu em 21/10)* | Enviar de novo |
| Depois de pagar, reenviado *(saiu em 21/10)* | Enviamos de novo. |
| Depois de pagar, e-mail errado | Digitou o e-mail errado? Escreva para {contato}. |

**Depois do pagamento.** *(REVISTO pelas decisões do operador de 21/10/2026, na abertura do passo
5: **a senha nasce na própria tela**, e o e-mail é de boas-vindas — não é preciso para começar. Os
rascunhos de texto abaixo que falam do link ou do "Enviar de novo" estão VENCIDOS: os novos vêm com
o passo 6, na P81.)* Quem acabou de pagar ainda não tem senha nem está logado: a tela confirma,
repete o e-mail digitado (é ali que a pessoa percebe um erro de digitação) e pede a senha — com
ela, a pessoa já entra para estudar. Enquanto a confirmação não vem, valem os textos de hoje ("Confirmando sua
assinatura…", "Está demorando mais que o normal…"). `{contato}` é `suporte@jilsonsantana.com` — a caixa de suporte que o operador escolheu na P49 (20/10/2026; `tech-stack.md` → Email).

**Em inglês: não existe mais** (decisão de 12/10/2026, etapa 4.6c). A tela é só em português.

**O que isto muda nos passos da 4.7** (detalhe em cada passo, no plano): o **6** ganha os itens
acima · o **5** pede o nome ao criar a senha (P83) e ganha o "Enviar de novo" · o **4** recebe a
resposta da caixa de novidades (P82) e o CPF ou CNPJ, e precisa dizer à tela de depois do
pagamento que a assinatura valeu, sem login · o **1** inclui o "Enviar de novo" no limite de
tentativas · o **8** só abre com os Termos de Uso e a Política de Privacidade no ar. **Os
passos 3, 5, 6 e 7 só abrem depois da etapa 4.6c.**

**O que o agente sugere NÃO ter na abertura** *(para ninguém propor de novo sem o gatilho)*:
- **Depoimentos e perguntas frequentes na própria tela** — quem clicou em Assinar acabou de
  passar por eles na home. *Reabre se os números mostrarem gente desistindo nesta tela.*
- **Endereço completo** (rua, cidade, CEP), como o Mosh — a Stripe não exige para aprovar o
  cartão. *Reabre só se a escola voltar a vender para fora (decisão dele).*
- **Apple Pay, Google Pay e PayPal** — mais formas de pagamento a testar e manter antes de haver
  aluno. *Reabre depois do lançamento, se alunos pedirem ou o celular pesar nas desistências.*
- **Caixa de novidades já marcada** — marcada de fábrica não vale como consentimento (LGPD).
- **Contagem de cursos e de horas** — com poucos cursos, o número não vende. *Reabre quando o
  catálogo crescer; aí o número sai do banco, nunca de texto fixo.*
- **Anual marcado de início** (como a Udemy) — a pessoa clicou num cartão que diz R$ 99,90 e
  veria R$ 995 primeiro. *Reabre se ele quiser testar.*

**Recomendação que o agente REVIU** *(12/10/2026)*: tinha sugerido NÃO ter a coluna de resumo,
porque ela repete o que o cartão do plano diz e ele pediu a tela simples em 10/10/2026. O
operador achou a coluna interessante e disse que não quer refazer a tela a cada novidade. Com o
país, o CPF e, mais adiante, o dólar e o imposto de fora *(o país e o dólar saíram no mesmo dia,
com a etapa 4.6c; a coluna ficou)*, o total final precisa de um lugar
fixo: **o agente passou a recomendar a coluna, e ele confirmou no mesmo dia ("Certo").** Na
tela pública, isso revê a decisão de 10/10 de mostrar "Hoje você paga" só com código (o gatilho
de reabertura dela já previa). Na tela de quem está logado, continua a P80. *Reabre se a coluna
confundir quem assina — foi o motivo da decisão de 10/10.*

**Sugerido pelo agente e RECUSADO pelo operador** *(não propor de novo sem o gatilho)*:
- **Topo só com o logo e "Voltar", sem menu** (como a Udemy e o Mosh) — recusado em 12/10/2026:
  a tela leva o menu e o rodapé do site. O gatilho está na decisão, no começo desta seção.

## Assinar sem conta: a conta nasce no pagamento *(Fase 4, etapa 4.7, passo 4 — 21/10/2026)*

**Decisões do operador (21/10/2026):** o plano do passo, em três partes (*"Sim, pode seguir"*) —
a ficha de espera e a conta que nasce dela; as rotas sem login; a prova e a revisão. As respostas
da abertura estão nas seções de cada assunto: o e-mail que já tem conta e o cartão de fora (*A tela
pública de assinar*), o teto da prévia (*Limite de tentativas*), o código de 100% difícil
(*Códigos promocionais*) e o reembolso repetido (*Reembolso*).

**Convenções de engenharia (como o código faz) — a parte A:**
- **A FICHA DE ESPERA** (`GuestCheckout`, tabela `guest_checkout`): quem assina sem conta deixa o
  e-mail, em minúsculas, ligado a UM cliente da Stripe. Uma ficha por e-mail. O CPF ou CNPJ não
  mora nela: fica no cliente da Stripe. `tentativa` é o código público da tentativa em andamento
  (parte B). A ficha some com a conta (cascade).
- **A CONTA NASCE SÓ NA ROTINA DO ESPELHO** (`sincronizar`, `server/src/lib/assinaturas.ts` — a
  única que grava o espelho), em `server/src/lib/pedido-do-visitante.ts`: a assinatura sem espelho
  e sem conta que leva a ficha (`metadata.pedido`, da assinatura ou do cliente) ganha a conta da
  ficha — **na MESMA transação do espelho**, com a trava da assinatura. A conta, a ligação com o
  cliente da Stripe (`stripe_customer`: uma conta é sempre um cliente), a ficha marcada e o espelho
  entram juntos ou não entram; se algo falha, a rota do aviso responde 5xx e a Stripe entrega de
  novo. **Quem a chama:** o aviso da Stripe, o checkout e o "Conferir na Stripe" do admin — os
  mesmos de sempre.
- **Só com o PAGAMENTO feito:** a assinatura tem que dar acesso pela regra do GATE
  (`assinaturaDaAcesso`). A incompleta (a tentativa ainda não paga) não cria conta, e o registro dela
  é informação, não aviso: é o normal de toda tentativa. O código de 100% ativa a assinatura no
  clique, e a conta nasce dele (é a cortesia).
- **A conta nasce:** com o e-mail da ficha em minúsculas (o Better Auth busca assim — com outra
  grafia, o login nunca a acharia), papel de aluno, sem nome (P83, passo 5), **sem senha** — o login
  dela responde "e-mail ou senha inválidos", como numa senha errada, até a pessoa criar a senha pelo
  e-mail (passo 5) — e com o que o visitante escolheu **na tentativa que foi paga**: a caixa de
  novidades (`marketingConsent`; sem a marca exata, é não) e a origem (`acquisitionSource` e
  `acquisitionCampaign`, o UTM do primeiro acesso). Essas escolhas vão na `metadata` da ASSINATURA,
  e não na ficha: cada tentativa leva a escolha de quem a fez. O id da conta sai do gerador do
  próprio Better Auth (`generateId`).
- **A ficha só vale para o cliente dela:** a assinatura de outro cliente da Stripe que diga ser da
  ficha não ganha conta (só o nosso servidor escreve a ficha na Stripe; isto é a segunda trava).
- **O e-mail que ganhou conta entre a ficha e o pagamento NÃO é ligado à conta que existe:** o
  espelho não nasce e o registro grita (há alguém pagando sem acesso). A tela recusa antes de ir à
  Stripe o e-mail que já tem conta (decisão de 21/10), então isto só acontece numa corrida rara.
- **A sincronia diz qual conta nasceu** (`contaNova`, o id) — só na vez em que ela nasce. É por ela
  que o passo 5 manda o e-mail de criar a senha, **depois** de a transação terminar.
- **O aviso que se perdeu:** o "Conferir na Stripe" do admin, com o e-mail de quem pagou e ficou
  sem conta, confere as assinaturas do cliente da ficha (`sincronizarPedido`) — e a conta nasce ali,
  se o pagamento passou. Sem pagamento, a tela continua dizendo "Não existe conta com esse e-mail."
  (que é verdade); nenhuma frase do admin mudou.

**Limitações conhecidas (parte A):**
- **O e-mail que ganhou conta entre a ficha e o pagamento** precisa de gente: o "Conferir na
  Stripe" com esse e-mail acha a conta que existe, e não a assinatura da ficha. O destino é o painel
  de assinaturas (etapa 4.7b → *Paga e sem conta na escola → Ligar a uma conta*); até lá, pelo painel
  da Stripe (reembolsar, e a pessoa assina logada).
- **A ficha de quem desistiu fica guardada** (o e-mail aqui; o e-mail e o CPF no cliente da
  Stripe), sem prazo para sair. *Gatilho: a exclusão de dados a pedido (Fase 7, LGPD) — ela apaga a
  ficha junto; e, se as fichas sem pagamento passarem de algumas centenas, uma limpeza das antigas.*
- **A conta apagada com `deletedAt` (exclusão a pedido) continua com o e-mail**, e a tela diria
  "já tem conta". *Gatilho: a exclusão de conta, quando for construída.*

**Convenções de engenharia — a parte B (as rotas sem login):**
- **As rotas** (`server/src/routes/billing-sem-login.ts`, sob `/api/billing/visitante/`): `GET
  planos`, `POST previa`, `POST assinatura` e `POST confirmacao`. A mesma proteção das de quem está
  logado (`lib/protecao-da-cobranca.ts`: nada em cache; pedido que muda alguma coisa e vem de outro
  site, recusado); os planos e a prévia saem das mesmas funções (`lib/vitrine-da-assinatura.ts`).
- **FORA DO AR NO SITE ATÉ O PASSO 8** *(no plano aprovado pelo operador em 21/10/2026)*: em
  produção, sem `ASSINAR_SEM_LOGIN=true` na Railway, as quatro respondem 404 (`NaoEncontrado`), sem
  ir à Stripe nem ao banco; fora de produção, ligadas. É o que impede, se a `dev` for publicada
  antes da hora, o site de vender sem o e-mail de criar a senha (passo 5) e sem a tela (passo 6).
  **O operador liga a variável no passo 8.**
- **O pedido de assinar** (`assinarSemLoginSchema`, no `core`): o e-mail, o CPF ou CNPJ, o plano, o
  código, a resposta da caixa de novidades (obrigatória, sim ou não), a origem (`origem` e
  `campanha`, o UTM do primeiro acesso — **nunca recusa o pedido**: valor estranho vira nada, e o
  texto é cortado em 100 caracteres) e o código da tentativa anterior. Preço, valor, cliente e conta
  nunca vêm do navegador.
- **O CPF ou CNPJ é conferido no `core`** (`lerDocumentoFiscal`, que a tela do passo 6 também vai
  usar): o dígito verificador, com ou sem pontuação; **o CNPJ com letras** que a Receita emite desde
  julho de 2026 (12 posições de letras ou números e 2 dígitos; o valor de cada posição é o código
  ASCII − 48); o número de um caractere só repetido é recusado. Errado → 400 antes da Stripe, sem
  repetir o número na resposta. Certo → vai ao cliente da Stripe (`tax_id_data`, `br_cpf` ou
  `br_cnpj`, com a pontuação de costume) **antes** da assinatura: a primeira fatura é fechada quando
  a assinatura nasce, e leva o número que o cliente tiver naquela hora. Se a Stripe recusar um
  número que nós aceitamos (`tax_id_invalid`): 400 `DocumentoInvalido`, e o alerta.
- **A ordem de assinar** (`server/src/lib/checkout-do-visitante.ts`, irmão do `checkout.ts`): (1) o
  e-mail que já tem conta → 409 `JaTemConta`, antes da Stripe; (2) o preço do plano e o código; (3)
  a ficha do e-mail, com a **trava por e-mail que não espera** (`assinar-email:`; ocupada → 409
  `Ocupada`): a nova nasce com o cliente da Stripe (já com o número fiscal) numa transação curta só
  dela; a que já existe volta como está; (4) **a decisão, com a trava:** "já tem conta?" de novo —
  pelo e-mail E pela ficha (a que já virou conta é conta, mesmo que a conta troque de e-mail um dia)
  —; o que a Stripe diz do cliente — a assinatura **viva** (pagou, e o aviso atrasou) é sincronizada
  fora da trava, a conta nasce ali, e a resposta é `JaTemConta`, **sem tocar no número fiscal de
  quem pagou** —; só então o número fiscal desta tentativa (`acertarNumeroFiscal`: igual, nada;
  diferente, entra o novo e saem os do Brasil que estavam); a incompleta só é reaproveitada com o
  **código da tentativa**, o mesmo preço, o mesmo código promocional, o mesmo número fiscal e um
  pagamento que a Stripe ainda aceita; as outras são canceladas; (5) a assinatura nova leva a ficha,
  um código de tentativa novo (32 caracteres) e a escolha do visitante, e a ficha passa a guardar
  esse código. O número fiscal e a assinatura nascem na MESMA trava: a primeira fatura sai com o
  número de quem criou aquela tentativa.
- **No máximo 3 "assinar sem login" em andamento ao mesmo tempo**, somando todos os endereços
  (`ASSINATURAS_SEM_LOGIN_AO_MESMO_TEMPO`, achado P1 da revisão de segurança do passo): cada um
  segura uma ligação com o banco enquanto a Stripe responde, e sem conta nada os limitava — uma
  dúzia de endereços disparando juntos deixaria a aula de quem paga esperando. Cheio, 409
  `MuitosAoMesmoTempo` com `Retry-After` na hora, antes de abrir qualquer transação — um código
  próprio, separado do `Ocupada` das duas abas —, e a tela diz **"Aguarde um instante e tente
  novamente."** *(texto do operador, 21/10/2026: "para evitar que ele fique tentando em seguida e
  fique travado"; `app.assinar.aguardeUmInstante`)*. Contagem em memória (um servidor só). *Reabre se um pico de gente honesta assinando ao mesmo tempo ouvir
  "ocupada" com frequência — aí o número sobe, junto com o tamanho do caixa de ligações do banco.*
- **Por que só com o código da tentativa:** o e-mail não é segredo. Quem soubesse o de alguém e
  pudesse seguir com a tentativa dessa pessoa receberia o segredo do pagamento dela — e, num
  pagamento recusado, a bandeira e o fim do cartão aparecem nele. Sem o código, a tentativa anterior
  é cancelada e nasce outra.
- **"O pagamento já valeu?"** (`POST confirmacao`, com o código da tentativa no corpo — não no
  endereço, que fica no registro da hospedagem): sim quando a conta da ficha nasceu e o gate a
  libera; código desconhecido ou antigo, a mesma resposta de "ainda não". Nada sobre a conta, o
  e-mail ou a assinatura.
- **Os limites sem login:** *Limite de tentativas*, abaixo.
- **O registro** leva ids (a ficha, o cliente, a assinatura) — nunca o e-mail, o número fiscal, o
  código digitado ou o segredo do pagamento.

**Limitações conhecidas (parte B):**
- **Quem sabe o e-mail de alguém pode cancelar a tentativa em andamento dessa pessoa, e trocar o
  número fiscal da ficha antes de ela pagar** (ela clica de novo e segue: a tentativa nova dela sai
  com o número dela, que entra na mesma trava em que a assinatura nasce). **Depois que alguém pagou,
  ninguém mexe mais no número**: a decisão vê a assinatura viva antes. É o preço de não exigir conta
  antes de pagar; o limite por e-mail (com o endereço) segura a insistência de um mesmo lugar, e de
  muitos endereços ao mesmo tempo ninguém a segura. *Reabre se o registro mostrar tentativas
  canceladas em série no mesmo e-mail.*
- **A tela de depois do pagamento não chama a sincronia** (como a de quem está logado): se o aviso
  da Stripe se perder, a conta nasce quando a pessoa clica em assinar de novo, ou quando o admin
  confere o e-mail dela.
- **A cota de pedidos da escola na Stripe** (achado P2 da revisão): todo pedido sem login que vai à
  Stripe gasta a mesma cota do aviso e das operações dos alunos, e os planos e a prévia não têm teto
  somando os endereços. Hoje, para esgotá-la, seria preciso perto de mil e quinhentos endereços ao
  mesmo tempo; o assinar já tem o teto de 3 em andamento. *Gatilho: a Stripe responder 429 no
  registro, ou o tráfego esperado da abertura (passo 8) justificar — aí os preços ficam guardados em
  memória por um minuto e as leituras sem login ganham um teto somando os endereços.*

**DEPOIS DE PAGAR: A SENHA E AS BOAS-VINDAS** *(etapa 4.7, passo 5, parte 2 — decisões do operador,
21/10/2026: a senha nasce na própria tela; o e-mail de boas-vindas confirma e diz como entrar)*:
- **A senha na tela** (`POST /billing/visitante/senha`, `lib/senha-depois-de-pagar.ts`, fora do ar em
  produção como as outras rotas sem login): com o **código da tentativa** — que só o navegador que
  pagou recebeu —, só para a conta que nasceu daquele pagamento e que tem acesso, **uma vez** (a
  marca fica na ficha, `senhaCriadaEm`; depois, "Esqueci minha senha"), **só enquanto o e-mail não
  foi confirmado** e **até 24 horas** depois de a conta nascer. Uma de cada vez por conta, sem
  esperar (dois cliques nunca criam duas senhas). A senha é embaralhada pelo próprio Better Auth e
  **nunca aparada**; de 8 a 128 caracteres (os mesmos números do Better Auth e da tela, no `core`). A
  sessão abre na hora, como no login; se não abrir, a senha fica, a resposta diz "não entrou", e é
  alerta. **O e-mail não fica confirmado por aqui** (quem digitou pode não ser o dono dele). As
  recusas: `NaoConfirmado` (tentativa desconhecida, sem conta ou sem acesso — a mesma),
  `PrazoVencido`, `EmailConfirmado`, `JaTemSenha`, `Ocupada`. Limite: 10 a cada 15 minutos por
  endereço.
- **A primeira entrada pelo código apaga a senha de antes da confirmação** `[FATO — Better Auth
  1.7.5, no código e no guia da 1.7, medido em teste em 21/10/2026]`: numa conta com o e-mail não
  confirmado, entrar pelo código apaga a senha e desconecta todos os aparelhos, e só então confirma o
  e-mail — a caixa provada vale mais que o que veio antes dela. Não há opção para desligar. É o que
  derruba quem pagou com o e-mail de outra pessoa e criou a senha; por isso, depois dela, a tentativa
  não cria outra (`EmailConfirmado`). O efeito em quem é dono: quem criou a senha logo depois de pagar
  e um dia entra pelo código perde aquela senha e cria outra em "Esqueci minha senha" (o caminho que
  a doc do Better Auth indica). *A escolha entre manter assim e pedir o código antes da senha é do
  operador: P94.* As contas do seed nascem confirmadas (a de admin no ar, pela migration
  `20261021220100_admin_com_email_confirmado`): o código nunca apaga a senha de admin.
- **As boas-vindas** (`lib/boas-vindas.ts`): saem depois de **qualquer** sincronia da assinatura de
  quem assinou sem conta — o aviso da Stripe (inclusive o repetido), o novo clique de quem já pagou,
  a conferência do admin —, sempre **depois do commit**, e só com a conta com acesso. **Uma vez:** a
  ficha guarda quando ela foi tomada (`boasVindasEnviadaEm`, migration
  `20261021180000_boas_vindas_da_ficha`); se o envio falha, a marca volta, e o aviso seguinte tenta;
  a chave `boas-vindas/<conta>` segura as duas pontas no Resend. **Nunca derruba o aviso** (a falha
  vira alerta `[email]`). O botão "Entrar na escola" leva a `/login`, pelo `BETTER_AUTH_URL` — **em
  produção, só https**: sem isso o e-mail sai sem o botão, e a subida do servidor alerta. Os textos
  são **rascunho do agente** (`app.email.boasVindas`). **A chave é por conta, e não por evento** (a
  regra (2) do `CLAUDE.md`, emendada em 21/10/2026): o mesmo e-mail sai de três gatilhos — dois sem
  `event.id` —, e se o Resend aceitar o envio e a resposta se perder, o gatilho seguinte manda com a
  MESMA chave e o Resend não repete.

**A REVISÃO DE SEGURANÇA DO PASSO 5** (`security-vulnerability-reviewer`, sobre as partes 1 a 3,
21/10/2026): **nenhum bloqueio (P0)**. Os P1, os P2 corrigidos e os que têm destino estão no plano
(etapa 4.7, passo 5, parte 4). **Aceitos, com gatilho (engenharia):**
- **Dá para descobrir se um e-mail tem conta pelo pedir código** — pelo tempo da resposta (só para
  conta de verdade o pedido espera o envio ao Resend) e pelo 4º palpite do código (403 em vez de 400,
  só onde houve código). É a mesma informação que a tela de assinar já dá com o `JaTemConta` (decisão
  do operador no passo 4), e cada sonda manda um e-mail ao dono; igualar as respostas não fecharia
  nada enquanto aquele aviso existir. *Reabre se o aviso de "este e-mail já tem conta" sair da tela
  de assinar.*
- **Se o servidor cair entre tomar a marca das boas-vindas e enviar**, o e-mail não sai e nada
  alerta. A pessoa entra do mesmo jeito (a senha da tela, ou o código). *Reabre se um aluno disser que
  não recebeu as boas-vindas.*
- **A senha criada no mesmo instante em que a dona do e-mail entra pelo código** pode sobreviver: a
  limpeza do Better Auth e a nossa trava não se coordenam. Exige acertar o milissegundo de uma entrada
  que quem guardou a tentativa não enxerga. *Reabre se uma conta de visitante aparecer com duas senhas
  ou com senha criada depois da confirmação.*

**A REVISÃO DE SEGURANÇA DO PASSO** (`security-vulnerability-reviewer`, sobre os commits das partes
A e B, 21/10/2026): **nenhum bloqueio (P0)**. **O P1, corrigido:** o teto de 3 "assinar sem login" em
andamento (acima). **Os P2:** corrigidos — o número fiscal só muda na decisão, com a trava e depois de
conferir que ninguém pagou (antes, um terceiro trocaria o CPF de quem acabou de pagar, e dois pedidos
intercalados deixariam a fatura de uma pessoa com o número da outra) · o limite por e-mail conta
COM o endereço (contado só pelo e-mail, pedidos de propósito trancariam o e-mail de outra pessoa de
qualquer lugar) · o assinar com código conta no mesmo teto do dia da prévia (seriam 80 conferências
por dia, e não 40) · sem endereço em produção, as rotas sem login contam todos juntos (antes,
ficavam sem limite) · com os e-mails novos do dia esgotados, a mesma recusa para qualquer e-mail do
endereço (antes, dizia a quem sonda que um e-mail tinha começado uma assinatura) · a ficha que já
virou conta é conta (pelo `userId`, e não só pelo e-mail) · o teste das maiúsculas e espaços no
e-mail do limite. **Com destino:** a cota da Stripe (acima) · conferir o RLS da tabela nova no
banco de produção depois de publicar (passo 8) · as notas para o e-mail de criar a senha (passo 5,
no plano). **Medido por causa dela:** o teto de recusas da Stripe (abaixo) — e, com ele, o
pagamento morto não é reaproveitado.

`[FATO — medido na área restrita em 21/10/2026, parte C do passo 4, com as funções de verdade e
clientes descartáveis, apagados no fim]` **O número fiscal na Stripe:** `br_cpf` e `br_cnpj` são
aceitos com ou sem pontuação — e ela guarda sempre com a pontuação (`52998224725` →
`529.982.247-25`) —, **inclusive o CNPJ com letras** (`12ABC34501DE35` → `12.ABC.345/01DE-35`); a
verificação dela é `unavailable` para o Brasil; ela **aceita um CPF com o dígito errado**
(`529.982.247-24`), confirmando que o dígito só a nossa conferência pega; e recusa o que não tem
forma de número (`abc` → `tax_id_invalid`). **O fluxo inteiro:** a ficha com o e-mail em minúsculas
e o código da tentativa; o novo clique COM o código seguiu com a mesma tentativa (mesmo segredo);
SEM o código, nasceu outra e a anterior ficou `incomplete_expired`; o CPF trocado deixou o cliente
com UM número, o novo, e a **primeira fatura da tentativa nova já saiu com ele**
(`customer_tax_ids`); a metadata da assinatura levou a ficha, a tentativa, as novidades, a origem e
o plano, sem `userId`; paga com `pm_card_visa`, a assinatura ficou `active`; a sincronia fez a
conta nascer (e-mail em minúsculas, aluno, sem nome, **sem senha**, novidades e origem da tentativa,
o cliente da ficha ligado a ela), a ficha marcada, o espelho `active`, o gate liberou; o "já valeu?"
respondeu sim para o código da tentativa paga e não para o antigo; o mesmo e-mail, de novo, ouviu
"já tem conta". O CNPJ com letras também passou pela função de verdade do cliente do visitante.

`[FATO — medido na área restrita em 21/10/2026, a pedido da revisão de segurança do passo 4]` **A
Stripe tem um teto de recusas por pagamento:** confirmado 20 vezes seguidas com cartão recusado, o
mesmo pagamento recusou as 10 primeiras (`card_declined`) e, da 11ª em diante, nem tentou mais
(`payment_intent_unexpected_state`) — **ela o cancelou** —, inclusive com um cartão bom. A
assinatura continuou `incomplete`, e a fatura `open`, com o segredo do pagamento morto. A documentação
dela (context7 `/websites/stripe`, no mesmo dia) não descreve esse teto: na conta de verdade ele pode
ser outro, e o Radar e os controles dela contra teste de cartão valem por cima. **O que decidiu:** o
servidor NÃO cancela o pedido depois de N recusas (era a pergunta do passo 1 — a Stripe já faz), e
o checkout sem login nunca reaproveita um pagamento que ela cancelou (`pagamentoCancelado`): o novo
clique ganha outra tentativa. *Reabre se o Radar mostrar teste de cartão passando por uma mesma
tentativa, ou se a conta de verdade se comportar diferente.*


## Sincronizar e perder o acesso *(Fase 4, etapa 4.4 — 10/10/2026)*

**Decisões do operador (10/10/2026):**
- **Forçar a sincronia mora em Admin → "Assinaturas"**, um item novo no menu (entre um item novo,
  um bloco no Dashboard e nenhuma tela): o e-mail do aluno e o botão "Conferir na Stripe". A tela
  diz se a conta ficou com acesso e o que a Stripe respondeu de cada assinatura. *Reabre quando a
  tela "Alunos" (planejada) existir, se fizer sentido conferir a assinatura a partir do aluno.*
- **"Reativar assinatura" no lugar de "Assinar" para quem já foi assinante e está sem acesso** —
  *"'Assinar' apenas na primeira vez. Algo nesse sentido como as empresas grandes fazem."* Vale na
  aula trancada, na tela de assinar (título e botão) e nos dois botões da home quando há login. O
  visitante sem login lê sempre "Assinar". *Reabre na etapa 4.6 (quem cancelou e ainda tem dias
  pagos tem acesso, e hoje não vê botão nenhum para voltar) e na 4.7 (o visitante que já foi
  assinante só é reconhecido depois de entrar).*
- **O link "Assine" do menu da home some para quem TEM assinatura ativa** *(decisão do operador,
  19/10/2026: "depois de logado não precisa aparecer assine porque já é aluno"; e, à pergunta
  sobre quem está logado sem assinatura: "só some para quem paga")*. Quem decide é
  `temAcessoAtivo()`, o mesmo do gate. Quem está logado sem assinatura (cancelou, a cobrança
  venceu, nunca assinou — e o admin, que não tem) continua vendo "Assine", que leva aos botões de
  assinar ou de reativar. A seção de preço da página não muda para ninguém. *Reabre se o menu das
  outras páginas públicas, quando virarem template do servidor, pedir a mesma regra.*
  **O "Assine" do RODAPÉ da home segue a mesma regra** *(decisão do operador, 19/10/2026, à
  pergunta do agente: "Sim, some também")*: some para quem tem assinatura ativa, e o visitante,
  quem está logado sem assinatura e o admin continuam vendo. Ele leva à tela de assinar
  (`/assinar`), e o do menu à seção de preço. *Acompanha a regra do menu, e reabre junto.*
- **Quem cancela e ainda tem dias pagos continua assistindo até o fim deles** — *"enquanto for
  válida a assinatura nos dias restantes"*. É a regra do gate de Ago 2026, confirmada; nesse caso
  a pessoa também não é deslogada. *Sem gatilho próprio: é a regra do gate. O reembolso, em que o
  período deixa de estar pago, tem regra própria desde 10/10/2026 (*Reembolso*, acima).*
- **Os textos da tela "Assinaturas", e a posição do item no menu são RASCUNHO do
  agente** (pendência P59). *Fecha quando ele revisar.*
- **A tela "Assinaturas" vai virar um painel** *(pedido dele depois de usar a tela: "achei pouco
  funcional […] um mini sisteminha administrativo sem precisar ficar indo na Stripe")*: lista com
  filtros e busca, e as ações que cabem em cada situação. **Mapa aprovado por ele em
  10/10/2026**, e fica para depois da etapa 4.7 (*"que é mais importante"*): plano → etapa 4.7b.
  *Reabre se um problema de aluno não se resolver com a tela de hoje antes de o painel existir.*
- **Assinatura cancelada: o SISTEMA manda sozinho o e-mail com o link para reativar, e é o
  aluno quem paga**; no painel, o admin só copia o link (entre isso, dar acesso de cortesia
  pela tela, e os dois). *Reabre se ele quiser presentear acesso por ali.*

**Convenções de engenharia (como o código faz):**
- **O espelho é gravado por UMA rotina só** (`sincronizar`, em `server/src/lib/assinaturas.ts`),
  com a trava da assinatura e buscando na Stripe na hora. Quem a chama: o aviso da Stripe, o
  checkout e o admin. O que precisar "acertar o acesso" chama a rotina, nunca grava à mão.
- **O checkout sincroniza** quando a Stripe diz que a conta tem assinatura viva e o espelho não dá
  acesso (quem pagou e ficou trancado): responde "já é assinante", agora com a aula aberta. Roda
  fora da trava da conta. Se a Stripe não responder nessa hora, é erro ("tente de novo"), nunca
  um "já é assinante" com a aula trancada.
- **A sincronia do admin** (`POST /api/admin/assinaturas/sincronizar`, só admin; o corpo diz só o
  e-mail — a conta se acha **ao pé da letra, em minúsculas**, como o login; a busca "sem
  diferenciar maiúsculas" do banco trata "_" como qualquer caractere e acharia a conta de outra
  pessoa): confere as assinaturas que a Stripe lista para o cliente da conta (as últimas 20) e as
  que o espelho já conhece dela. Serve aos dois lados — libera quem pagou, tira de quem a Stripe
  encerrou. **A assinatura que a Stripe não conhece é relatada, e o espelho dela nunca é apagado
  por ali** (é o caso das assinaturas de teste no banco de produção: quem as tira é a Fase 7).
- **Perder o acesso derruba a sessão** — só quando a conta TINHA acesso antes da gravação e
  DEIXOU de ter depois, na mesma transação, e só as sessões dela. Quem tenta pagar e não consegue
  nunca é deslogado. **Não é a fronteira:** quem tranca a aula é o gate, a cada pedido.
- **"Já foi assinante" é derivado do espelho** (uma assinatura que passou do primeiro pagamento),
  sem coluna; só escolhe o texto do botão.
- **`requireActiveMembership`** (login + assinatura, sem exceção) é o invólucro HTTP do gate; a
  primeira rota é o download dos arquivos da aula. **O erro que escapa de qualquer rota da API**
  responde sempre a mesma coisa, sem status nem cabeçalho do erro (o da Stripe carrega os dela).
  O pedido cujo corpo o servidor recusou ao ler continua 4xx, e a recusa fica no registro
  (endereço, status e motivo — nunca o corpo).
- **Toda ida nova à Stripe passa por `erroSemMensagem`** (`server/src/lib/stripe.ts`), como as de
  hoje: o registro leva o rastro do erro, e a mensagem crua da Stripe iria junto.

`[FATO — context7 /websites/stripe, 10/10/2026]` A Stripe reentrega um aviso que falhou por **até
3 dias** na conta de verdade, com intervalos crescentes (na área restrita, 3 vezes em poucas
horas); o reenvio manual vale 15 dias pelo painel e 30 pela CLI. Depois disso, só a sincronia.
`[FATO — context7 /better-auth/better-auth e medido na suíte, 10/10/2026]` Apagar as sessões no
banco desloga na hora **enquanto não houver `cookieCache` nem `secondaryStorage`** (o repo não usa
nenhum; com `cookieCache`, a sessão revogada valeria até o cache vencer — o teste que usa o cookie
de antes reprovaria).
`[FATO — medido na área restrita, 10/10/2026]` com uma conta descartável e o cartão de teste: a
Stripe diz ativa e o espelho não existe → assinar de novo devolveu o espelho e o acesso, sem
assinatura nova · a sincronia do admin fez o mesmo · a assinatura que a Stripe não conhece voltou
como `resource_missing` e foi relatada · cancelada na Stripe com a fatura paga → `canceled`, paga
por mais 31 dias, com acesso.

**Limitações conhecidas:**
- **A sessão só cai quando a Stripe avisa** (ou quando alguém sincroniza). Quem só deixa o período
  pago vencer continua logado — a aula tranca do mesmo jeito.
- **Duas assinaturas da mesma conta mudando no mesmo instante** (uma acabando, outra começando)
  podem deslogar quem tem acesso: a pessoa entra de novo e segue. E duas ACABANDO no mesmo
  instante podem deixar logado quem ficou sem acesso. Nos dois casos, não libera nem tira
  acesso: a aula tranca pelo gate. *Reabre se a escola passar a permitir duas assinaturas vivas
  na mesma conta — aí a sincronia ganha uma trava por conta.*
- **Assinatura "não paga" (`unpaid`), ou pausada com o período vencido:** a pessoa vê "Reativar
  assinatura", clica, e o checkout responde "já é assinante" — ela não consegue voltar a pagar
  por ali, e o registro grita. Só acontece se a régua da Stripe terminar em "marcar como não
  paga" — **decidido em 10/10/2026: a régua termina em CANCELAR** (*Régua de inadimplência*,
  acima); falta a configuração no painel (pendência P60).
- **A tela de depois do pagamento não chama a sincronia:** se o aviso atrasar, ela fica em "está
  demorando" até ele chegar, ou até a pessoa voltar à tela de assinar e clicar de novo.
- **A sincronia do admin olha as últimas 20 assinaturas** do cliente na Stripe.
- **Assinatura paga sem conta** (a Stripe não diz de quem é) não se resolve por aqui: é a etapa 4.7.
  *(Para a do VISITANTE, resolvida na etapa 4.7, passo 4: com o e-mail da ficha de espera, a
  conferência faz a conta nascer — *Assinar sem conta*, acima.)*

**Da revisão de segurança da etapa (10/10/2026) — nenhum bloqueio.** Corrigidos na hora, com
teste: a busca do admin por e-mail (acima) e a recusa de corpo sem registro. Com destino marcado:
a trava do checkout que segura conexão do banco (pré-requisito (b) da etapa 4.7, no plano) · o
monitor de erro, sem o qual toda falha de cobrança só existe no registro (Fase 7; será o Sentry) ·
a assinatura "não paga" (P60). O relato completo está no plano, Fase 4 → etapa 4.4 → Passo 9.

## Minha assinatura: Faturamento e Assinatura *(Fase 4, etapa 4.6 — 11/10/2026)*

**Decisões do operador (11/10/2026)** — perguntadas com opções antes de construir:
- **A tela mora no item que já existia no menu da conta, "Faturamento e Assinatura"** (menu da
  foto e coluna de Minha conta), em `/aluno/conta/faturamento` — o item estava no menu e não abria
  tela nenhuma. *Reabre se a conta ganhar outra tela de cobrança (recibos, notas) que peça
  separar "assinatura" de "faturamento".*
- **Resumo + uma tela por ação, cada uma com endereço próprio** (`…/faturamento/cartao`,
  `…/faturamento/plano`, `…/faturamento/cancelar`), e não tudo numa tela só. É o que dá link
  direto para "trocar o cartão": o painel do admin (4.7b) e o e-mail da cobrança que falhou (4.7)
  precisam dele. *Reabre se o Antigravity redesenhar a tela.*
- **Motivos de cancelamento: a lista curta, e escolher é OPCIONAL** — "Está caro para mim agora" ·
  "Não estou tendo tempo de estudar" · "Já aprendi o que precisava" · "Não encontrei o conteúdo
  que procurava" · "Outro motivo" —, mais o campo opcional "Quer contar mais?". *Reabre quando
  houver cancelamentos de verdade e "Outro motivo" for a resposta mais comum.*
- **Anual → mensal vale no FIM do ano já pago** (entre isso, na hora com crédito, e não oferecer):
  a pessoa continua no anual até a data paga e dali em diante é cobrada todo mês; a tela diz "Seu
  plano muda para Mensal em DD/MM/AAAA" e deixa desistir; nenhum dinheiro volta. **Mensal → anual
  vale na hora**, com o valor mostrado antes. *Reabre se um aluno pedir a troca na hora, ou se o
  agendamento na Stripe der mais manutenção do que vale — aí "não oferecer" volta à mesa.*
- **Depois do reembolso pedido pela própria pessoa, ela CONTINUA LOGADA** (e não deslogada, como
  manda a regra de quem perde o acesso): vê a confirmação e segue no site, sem as aulas, com
  "Reativar assinatura". Vale só para esse caso. *Reabre se a sessão que fica aberta der algum
  acesso que o gate não tranca.*
- **O que decorre das decisões de reembolso, lido de volta a ele e aprovado:** o reembolso devolve
  **tudo o que foi pago naquela assinatura** (quem trocou de plano dentro dos 7 dias recebe as
  duas cobranças) · a assinatura de cortesia (código de 100%) **não mostra** a saída do reembolso ·
  cartão trocado com o pagamento atrasado → a escola **tenta cobrar na hora** com o cartão novo ·
  o motivo do cancelamento fica guardado **na Stripe**, em cada assinatura (a contagem dentro da
  escola vem com o painel, 4.7b) · cancelar com reembolso **direto no painel da Stripe** também
  passa a cortar o acesso. *Acompanham a regra do reembolso, acima.*
- **Os textos da sessão (a) — o resumo e a troca de cartão —, aprovados** (`app.faturamento.*`).
  Um a mais é rascunho do agente: "Sua assinatura terminou.", para quando não há a data do fim (pendência P65).
- **Cancelar com a cobrança ATRASADA: a assinatura termina na hora, a Stripe para de tentar
  cobrar, e a pessoa continua logada** para ler a confirmação (decisão do operador, 11/10/2026 —
  entre isso, terminar e deslogar, e não deixar cancelar enquanto estiver atrasada). Não há
  período pago a manter: os dias que ela usava eram de tolerância. O texto, aprovado em
  português: **"Sua assinatura termina agora, e a cobrança em aberto não será mais tentada."**
  **No servidor desde 11/10/2026** (a tela vem no passo 9): a operação ENCERRA a
  assinatura e só depois anula a cobrança em aberto; a resposta diz que terminou, e a tela é
  avisada antes (`terminaAoCancelar`). *Reabre se a escola quiser cobrar de quem volta o período
  que ficou em atraso.*
- **Os dados que as telas guardaram são limpos também ao ENTRAR** (decisão do operador,
  11/10/2026): "Sair" já limpa; isto cobre a sessão que acaba sozinha (venceu, ou o site
  derrubou) com outra conta entrando em seguida no mesmo computador. **Feito em 11/10/2026**
  (a senha errada não limpa nada). *Sem gatilho: é correção.*
- **Os textos da sessão (b), em PORTUGUÊS: aprovados** (11/10/2026, em três blocos mostrados a
  ele — a tela de mudar de plano, a de cancelar e o banco pedindo confirmação; moram em
  `app.faturamento.plano`, `.cancelamento` e `.banco`).
- **"Já aprendi o que precisava" aparece como "Outro" no painel da Stripe** (a lista de motivos
  dela é fixa); o motivo exato fica junto da assinatura, e é o que o painel da escola vai
  contar. Aceito por ele em 11/10/2026. *Reabre se a Stripe passar a aceitar motivos próprios
  sem configuração por ambiente.*

**Depois do teste dele no navegador (11/10/2026)** — as duas telas abriram, o campo de verdade da
Stripe guardou o cartão de teste e o resumo passou a mostrá-lo:
- **A frase de autorização embaixo do campo do cartão fica a da STRIPE** (entre isso, esconder e
  escrever a nossa, e deixar para os termos de uso). É o próprio campo que a escreve quando um
  cartão é guardado para cobranças futuras — aparece também na tela de assinar. O nome que ele viu,
  "Área restrita de JILSON RODRIGUES DE SANTANA", é o da área de teste; no site entra o **nome
  público da conta de verdade**, que ele confere no painel da Stripe (pendência P58). `[FATO —
  tipos de `@stripe/stripe-js@10.0.0`]` a frase se esconde com `terms: { card: "never" }`; sem
  ela, dizer ao aluno que o cartão será cobrado nas renovações passa a ser da escola. *Reabre se
  o nome público certo ainda deixar a frase estranha, ou quando os termos de uso forem escritos
  (P61).*
- **Quem abre a tela com a assinatura já encerrada na Stripe é deslogado na hora: mantido** — é
  a regra de quem perde o acesso. *Acompanha a regra de Access Architecture.*
- **"Sair" limpa o que as telas guardaram** (achado da revisão de segurança: outra conta na
  mesma aba via, por instantes, dados da anterior). **Feito na abertura da sessão (b),
  11/10/2026.** *Sem gatilho: é correção.*
- **A sessão (a) é publicada sozinha**, sem esperar a (b). *Decisão de uma vez só.*

**Convenções de engenharia (como o código faz):**
- **O site nunca diz QUAL assinatura, cliente ou cartão.** A conta é a da sessão; a assinatura é a
  que dá acesso a essa conta, achada no espelho; nenhum código da Stripe vem do navegador nem vai
  a ele. As três rotas novas não leem corpo nenhum.
- **A tela lê a Stripe NA HORA** (o plano, a próxima cobrança, o cartão, "vai cancelar"); o
  espelho continua guardando só o que o gate lê, sem migration. Sem assinatura que dê acesso, a
  resposta sai do espelho e a Stripe nem é consultada. **Ler não grava nada — com uma exceção:**
  se o espelho dá acesso e a Stripe diz que a assinatura acabou (o aviso do fim se perdeu), a
  leitura chama a rotina de sincronia; senão as aulas seguiriam abertas e "Reativar assinatura"
  responderia "já é assinante". A sessão cai, como em toda perda de acesso.
- **O dono é o do espelho, e a Stripe confere:** se ela diz que a assinatura é de OUTRA conta,
  nada é lido nem trocado, e o registro grita (a linha do espelho está errada).
- **A sincronia que não espera** (`sincronizarSeLivre`): o que o aluno pode repetir à vontade
  não entra na fila da trava da assinatura — esperar seguraria uma conexão do banco por pedido.
  Se outro já está sincronizando, segue sem sincronizar: o aviso da Stripe vem atrás.
- **Assinatura que dá acesso e a Stripe não conhece:** 404 na tela; no registro, **erro em
  produção** (lá é sempre acesso sem assinatura de verdade) e aviso fora dela (a do seed).
- **A leitura não fica guardada no navegador depois de a tela fechar:** a conta seguinte na
  mesma aba veria o plano e o cartão da anterior. "Sair" limpa tudo o que as telas guardaram
  (sessão b); esquecer ao fechar a tela cobre a sessão que acaba sem o "Sair" — a que o
  servidor derruba.
- **As operações moram em `server/src/lib/minha-assinatura.ts`**, e não na rota: o painel (4.7b)
  e o JilsonAI chamam as mesmas. A ida à Stripe mora em `server/src/lib/stripe-assinatura.ts`, a
  segunda metade da fronteira (`stripe.ts` é a de assinar e a do espelho).
- **O plano é lido pelo INTERVALO da cobrança** (por mês, por ano), não pela lookup key: a chave
  passa para o preço novo quando o valor muda, e quem assinou antes fica no preço antigo, sem ela.
- **A próxima cobrança é a prévia da fatura da própria Stripe** (já com desconto e saldo), pedida
  só para a assinatura que renova: o valor mostrado é o cobrado.
- **Trocar o cartão, em dois tempos.** O servidor abre um pedido de guardar cartão para o cliente
  DA ASSINATURA, marcado com a conta e a assinatura; o site o confirma com o campo da Stripe,
  aberto para só guardar (nada é cobrado ali); o servidor lê **na Stripe** o cartão confirmado —
  só vale o pedido que deu certo, do nosso fluxo, desta conta, deste cliente e desta assinatura,
  **aberto há até 1 hora** — e o põe na assinatura. O cartão antigo sai da Stripe depois (se não sair, é aviso).
- **Com a cobrança atrasada, o cartão novo paga a fatura em aberto**, e o espelho é acertado por
  `sincronizarSeLivre`. Cartão novo recusado não é erro: a troca valeu, e a Stripe segue
  tentando. Se a fatura foi paga no mesmo instante por outro caminho, a fatura é relida — não
  vira erro. **A troca do cartão não segura a trava da assinatura** — ela não decide nada pelo
  espelho; a trava fica para cancelar e reembolsar (sessão b).
- **"Aceita cartão novo?" é uma regra só** (`aceitaCartaoNovo`): a tela mostra o botão e a
  operação aceita pelo mesmo critério. A assinatura encerrada de vez, ainda com dias pagos, não
  aceita: não cobra mais nada.

- **Parar a renovação e voltar atrás** (sessão b, passo 7). "Cancelar" é MARCAR a assinatura
  para acabar no fim do período pago — ela segue viva, o gate não muda e ninguém é deslogado;
  voltar atrás tira a marca, sem cobrar. O pedido de cancelar leva só o motivo e o comentário, os
  dois opcionais; o de manter, nada. **O motivo fica na Stripe**, em cada assinatura: a lista de
  motivos dela é fixa, então vai o par mais próximo no campo dela ("Já aprendi o que precisava"
  não tem par: vai como "outro") e o motivo exato da escola em `metadata.motivo`. O comentário é
  texto livre do aluno e nunca vai para o registro. Voltar atrás apaga o motivo.
- **Toda operação que MUDA a assinatura passa por `operarNaAssinatura`** (`assinaturas.ts`): a
  Stripe e depois a sincronia de sempre, com a trava da assinatura — o aviso que a mudança
  dispara espera a trava e já encontra o espelho gravado. **Não espera a trava:** com a
  assinatura ocupada, responde 409 sem ter ido à Stripe. Se a Stripe mudou e a sincronia falhou,
  a operação valeu: é aviso, e o aviso da Stripe acerta o espelho.
- **Trocar o cartão tira da Stripe TODOS os outros cartões do cliente** (sessão b): o que era da
  assinatura, o confirmado e nunca aplicado, e o padrão do cliente — depois de o novo estar no
  lugar. Se algum não sair, é aviso: a troca valeu.

- **O reembolso** (sessão b, passo 8). Dentro do prazo, a operação **encerra a assinatura na
  hora e devolve tudo o que foi pago nela** — o que falta voltar de cada cobrança. O pedido leva
  só o motivo: quanto devolver e de qual assinatura, quem sabe é o servidor. **O prazo (7 dias do
  primeiro dia da assinatura) é conferido no servidor na hora da ação, e de novo com a trava.** A
  cortesia não tem o que devolver, e não é encerrada. **A ordem é encerrar e depois devolver,
  da cobrança mais antiga para a mais nova:** se a devolução falha, a tela recebe uma resposta
  com nome próprio, o registro grita (precisa de gente) e a pessoa pode repetir — repetir não
  devolve duas vezes (a trava, a chave de repetição, e a Stripe, que não devolve mais do que
  cobrou). Enquanto a última cobrança não voltar, ela segue com o acesso do que pagou. **O
  reembolso acha também a assinatura já encerrada e sem acesso**, se ainda está no prazo (as
  três encerradas mais novas da conta): é o que deixa repetir depois de uma falha. A troca de
  plano que esperava a confirmação do banco é anulada antes. **A sessão só fica quando o
  reembolso saiu.** Se o dinheiro voltou e o espelho não foi acertado, a operação tenta mais uma
  vez e, se não der, alguém é avisado. *(Da revisão de segurança, 11/10/2026.)*
- **A devolução que falha depois** (a Stripe aceita, e dias depois o banco devolve): o aviso
  dela vira alerta, e a assinatura é sincronizada — o período volta a contar como pago.
- **Com a trava, os detalhes são relidos** (parar, voltar atrás, reembolsar, mudar de plano,
  desistir): a decisão vale pelo que a Stripe diz naquele instante, não pelo que a outra aba
  deixou. A operação tem 90 s de trava, a mesma conta do checkout.
- **O período devolvido não conta como pago.** Na Stripe a fatura devolvida continua "paga";
  quem diz que o dinheiro voltou é a cobrança. O "pago até" — do espelho e da tela, pela mesma
  conta — trata a última fatura devolvida POR INTEIRO como não paga; a devolução parcial continua
  contando. Custa uma ida a mais à Stripe em cada busca da assinatura cuja última fatura tem
  pagamento. *Reabre se essa ida a mais pesar (a busca roda dentro da trava do aviso).*
- **Depois do reembolso pedido pelo dono, a sessão fica** (`manterSessao`, só nessa operação).
  Se a devolução deu certo e a sincronia falhou, quem acerta o espelho é o aviso da Stripe — e
  aí a pessoa é deslogada, como em toda perda de acesso.
- **O aviso de dinheiro devolvido** (`charge.refunded`) traz só a cobrança: o servidor acha a
  assinatura pelo pagamento e a sincroniza. É o que faz o reembolso dado **direto no painel da
  Stripe** também cortar o acesso, quando a assinatura já está encerrada. Devolver sem encerrar
  não tira acesso: a assinatura viva dá acesso pelo status.
- **Mudar de plano** (sessão b, passo 10; as operações em `meu-plano.ts`). O site diz só PARA
  QUAL plano. **Mensal → anual vale na hora**, e a assinatura só muda se o pagamento passar.
  **O ano do Anual começa no dia da troca** *(decisão do operador, 11/10/2026 — P76)*: a
  pessoa paga o anual inteiro, menos o que sobrou do mês já pago, e a cobrança seguinte vem um
  ano depois. *Reabre se os números mostrarem que o valor cheio na hora afasta quem trocaria
  de plano — aí a conta proporcional até o aniversário da assinatura volta a ser opção.*
  **O valor mostrado é exatamente o que se cobra, num clique só** *(decisões do operador,
  11/10/2026: "prefiro perder 1 centavo a cobrar a mais do que foi mostrado" e, depois de
  testar no navegador, "tem que acontecer num passo só […] sem uma segunda confirmação do
  aluno")*. O que sobra do mês diminui com o tempo, e a escola abre mão da diferença: quem
  demora na tela paga o que leu, sem aviso e sem segundo clique. *O prazo de 10 minutos e o
  aviso dele na tela, decididos mais cedo no mesmo dia, saíram depois do teste: "ninguém demora
  10 minutos para decidir".*
  **Como o valor vem do navegador, o servidor o confere:** tem que estar no máximo R$ 1,00
  ABAIXO da conta refeita na hora, com a trava (`FOLGA_DO_VALOR_MOSTRADO`) — nunca acima. Um
  valor inventado não é cobrado; o máximo que alguém tira da escola mentindo é essa folga.
  *O R$ 1,00 é decisão do operador (11/10/2026: "R$ 1,00 está ok"): cobre a tela aberta por
  umas 7 horas.*
  **Passou disso, a tela leva ao Início** *(decisão do operador, 11/10/2026: "passou do tempo,
  redireciona; quando for lá novamente já vê o novo valor […] igual banco que expira")* — sem
  mensagem e sem segundo clique. A tela sai sozinha quando o prazo passa (a oferta traz
  `valeAte`: o tempo que a conta leva para andar a folga, calculado com o mês mais curto para
  nunca dizer um prazo maior que o de verdade), e também no clique, se o servidor disser que o
  valor já não confere (o mês que virou, o preço que mudou). Na volta, a pessoa vê o valor novo.
  *Reabre se a escola passar a vender um plano mensal bem mais caro (os centavos por hora
  crescem com o preço) ou se ligar imposto na fatura — nos dois casos, rever a
  folga e a conta do crédito.*
  **Anual → mensal é só marcado** para o fim do período pago (um agendamento com duas fases, que
  leva o desconto junto): até lá nada muda nem é cobrado, e desistir solta o agendamento.
  **Cartão recusado:** a fatura da troca é anulada na hora — nada fica para ser cobrado depois.
  **O banco pede confirmação:** o site a completa com o segredo que a resposta traz; a troca só
  vale depois. Desistir anula a fatura da troca; se o pagamento já tinha passado, o plano mudou.
- **A confirmação do banco na troca de cartão** (sessão b): com a cobrança atrasada, se o banco
  pede confirmação, a resposta de aplicar o cartão leva o segredo da fatura em aberto — fecha, do
  lado do servidor, a limitação anotada na sessão (a).
- **Quem está saindo não troca de plano:** parar a renovação solta antes a troca marcada (com
  ela a Stripe recusa parar) e anula a troca que esperava a confirmação do banco. **Decisão do
  operador (11/10/2026): fica assim, e a tela de cancelar AVISA** — entre isso e o site lembrar
  da troca e refazê-la sozinho quando a pessoa clica em "Manter a assinatura". Quem cancela com
  a troca para o Mensal marcada e depois volta atrás torna a renovar no ANUAL (o resumo mostra
  a próxima cobrança), e marca a troca de novo se quiser. O texto do aviso, aprovado em
  português: **"Sua troca para o plano Mensal também será desfeita."** *Reabre se um aluno for cobrado pelo
  ano por causa disso, ou reclamar.*
- **A fronteira com a Stripe tem seis arquivos** (sessão b): `stripe-cliente.ts` (a biblioteca
  com a chave), `stripe.ts` (assinar e o espelho), `stripe-assinatura.ts` (gerir a assinatura),
  `stripe-devolucao.ts` (ler se a fatura foi devolvida), `stripe-reembolso.ts` (encerrar e
  devolver) e `stripe-plano.ts` (mudar de plano). Só eles falam com a Stripe.

`[FATO — medido na área restrita, 11/10/2026, e provado com as funções de verdade: 25 pontos]`
A troca na hora cobra o plano novo inteiro menos o que sobrou do período pago (R$ 895,10 no
primeiro dia do mensal), e com o mesmo instante na prévia e na troca **o cobrado é o mostrado**,
mesmo segundos depois · a assinatura vira anual com a MESMA data de início (o prazo do reembolso
não recomeça), e o reembolso devolve as duas cobranças · com o banco pedindo confirmação ou o
cartão recusado a Stripe responde igual (a assinatura CONTINUA no plano antigo, a troca pendente
por ~23 h, a fatura em aberto): distingue-se pelo pagamento da fatura · confirmado o pagamento, a
Stripe aplica a troca sozinha · anular a fatura da troca desfaz a pendência, sem deixar crédito ·
a troca marcada deixa a assinatura intacta, e a prévia da próxima cobrança já diz o valor do
plano novo na data do fim do período · o desconto só sobrevive ao agendamento se as fases o
levarem · com agendamento, a Stripe recusa parar a renovação direto na assinatura; trocar o
cartão e encerrar na hora continuam aceitos.

`[FATO — medido na área restrita, 11/10/2026]` a fatura devolvida continua `paid`, com o mesmo
valor pago, e o pagamento dela também · a Stripe não deixa expandir da assinatura até a cobrança
(limite de 4 níveis) · a cobrança não diz de que fatura é: acha-se pelo pagamento · encerrar na
hora sem crédito não gera fatura nova · a mesma chave de repetição devolve a MESMA devolução, e
devolver de novo o que já voltou é recusado · a cortesia tem fatura paga de valor zero e nenhum
pagamento · pagamento que não existe: a lista vem vazia, sem erro · **com as funções de verdade,
23 pontos**: depois de encerrar e devolver, o espelho fica "pago só até o começo do período" e a
conta fica sem acesso; com devolução parcial, o período continua contando · ao encerrar na hora
uma assinatura com a troca de plano esperando o banco, a Stripe anula a fatura da troca e cancela
o pagamento dela (confirmar depois é recusado) · trocado o cartão da assinatura, o agendamento da
troca marcada passa a apontar o cartão novo sozinho.

`[FATO — medido na área restrita com o RELÓGIO DE TESTE, 11/10/2026; 6 pontos com as funções de
verdade]` Com a renovação num cartão que falha, a assinatura fica `past_due`, a cobrança fica em
aberto e o "pago até" é o dia em que a renovação falhou · encerrada na hora e com a cobrança
anulada, não sobra fatura em aberto nem nova tentativa marcada, e o espelho fica sem acesso ·
**anular a cobrança em aberto com a assinatura AINDA VIVA faz a Stripe dá-la como `active` de
novo** — com as aulas abertas sem pagar. É por isso que a operação encerra primeiro. **Vale para
o painel da Stripe também:** anular à mão a fatura em aberto de quem está atrasado dá o mês de
graça.

`[FATO — medido na área restrita, 11/10/2026, com dois clientes descartáveis]` Parar a renovação
deixa a assinatura `active`, com a data de fim igual ao fim do período, e guarda o motivo, o
comentário e o `metadata.motivo` · parar de novo sem motivo mantém o de antes · voltar atrás com
os campos vazios apaga os três · a data avulsa de fim (posta pelo painel) se desfaz com `cancel_at`
vazio, e mandar as duas marcas juntas a Stripe recusa · tirar os outros cartões limpa também o
cartão padrão do cliente, e a assinatura segue `active` com o novo.

`[FATO — tipos da `stripe@23.0.0` e medido na área restrita, 11/10/2026]` No pedido de guardar
cartão, a lista de formas de pagamento é **`allowed_payment_method_types`** — o nome antigo
(`payment_method_types`) não existe mais nesta versão da API. A Stripe aceitou o pedido assim e
ele nasce só com `card`.
`[FATO — medido na área restrita, 11/10/2026, com duas contas descartáveis; 32 pontos]` a prévia
da fatura de uma assinatura mensal em dia devolve o valor cheio, com a data 31 dias à frente · para
a assinatura marcada para acabar no fim do período, a prévia responde `invoice_upcoming_none` (o
servidor trata como "sem próxima cobrança") · aplicar antes de o campo confirmar não muda nada ·
depois da confirmação, o cartão da assinatura passa a ser o novo e o antigo sai do cliente ·
repetir a aplicação não tira o cartão novo · **com um relógio de teste da Stripe**, a renovação
num cartão que falha deixa a assinatura `past_due` com a fatura `open`, a conta segue com acesso,
e o cartão novo paga a fatura na hora: `active`, fatura `paid`, espelho pago até o fim do período
novo · cartão novo que também falha: a troca vale, a assinatura segue `past_due`, sem erro ·
encerrada de vez com dias pagos: tem acesso e o servidor recusa cartão.

**Limitações conhecidas:**
- **A conta que tem acesso pela assinatura de mentira do seed** (o `member@` do banco de dev) vê
  "Não foi possível carregar a sua assinatura": a Stripe não conhece aquela assinatura. Para ver a
  tela no computador, a conta precisa assinar pela tela de assinar, com o cartão de teste.
- **Depois de uma troca de plano que não se completou** (recusada, ou desistida), a "última
  fatura" da assinatura na Stripe é a anulada, até a próxima renovação. Para a assinatura viva
  não muda nada (ela dá acesso pelo status); se for ENCERRADA NA HORA nesse intervalo — pelo
  painel, ou pelo reembolso —, o período pago deixa de contar na hora. No reembolso isso só
  aparece se a devolução falhar: a pessoa fica sem acesso antes de o dinheiro voltar, alguém é
  avisado, e ela pode repetir. *Reabre se acontecer de verdade: aí o "pago até" passa a olhar a
  fatura paga anterior.*
- **A chave de repetição da devolução muda a cada 5 minutos** porque a Stripe guarda por um dia
  a primeira resposta de cada chave, inclusive a falha — é o que ela documenta; não foi medido.
- **O cupom de duração limitada** seria copiado para a fase nova da troca marcada. Hoje não
  existe cupom assim; conferir quando o operador criar o primeiro.
- **A virada do anual para o mensal foi provada com o relógio de teste** (11/10/2026): no fim do
  ano o plano vira mensal e a primeira cobrança sai paga, com o cartão que estiver na assinatura
  naquele dia. Depois da virada, o agendamento continua preso à assinatura por mais um mês, já
  sem troca nenhuma: o que impede mudar de plano é a troca MARCADA, não o agendamento, e a
  operação solta o agendamento velho antes de mudar.
- **O agendamento copia o desconto, e só ele.** Se a escola um dia ligar o imposto
  automático, conferir que as fases da troca marcada o levam.
- **Os avisos de devolução chegam ao site no ar** *(P69, resolvida pelo operador em 12/10/2026)*:
  o endereço de avisos da conta de verdade (`https://www.jilsonsantana.com/api/stripe/webhook`)
  passou de 5 para 7 avisos — entraram `charge.refunded` e `refund.failed`, ao lado de
  `customer.subscription.created`/`updated`/`deleted`, `invoice.paid` e
  `invoice.payment_failed` (conferido na tela dele antes de salvar). É o que faz o reembolso
  dado direto no painel cortar o acesso, acerta o espelho quando a sincronia do reembolso pela
  tela falha, e avisa da devolução que o banco rejeita dias depois. *Se um aviso novo passar a
  ser tratado no código, ele tem que ser incluído nesse endereço também.*
- **A chave da Stripe em produção lê tudo o que a sincronia precisa** *(P71, respondida pelo
  operador em 12/10/2026)*: a chave que está na Railway é a comum (`sk_live_`), e não uma
  restrita — pagamentos, faturas, devoluções e agendamentos. E a `SENTRY_DSN` está preenchida:
  os alertas de cobrança chegam por e-mail. *Se um dia a chave for trocada por uma restrita
  (`rk_live_`), ela precisa dessas quatro leituras — sem elas todo aviso da Stripe responde erro.*
- **Fechar a aba depois de o campo confirmar e antes do último passo:** o cartão fica guardado no
  cliente e não vai para a assinatura; a pessoa repete a troca.
- **A Stripe já encerrou a assinatura e o espelho ainda não soube:** o resumo diz "terminou" e
  oferece "Reativar assinatura", mas a tela de assinar responde pelo gate ("Você já é assinante")
  até o aviso chegar.
- ~~**As rotas novas não têm limite de tentativas**~~ — **têm desde 19/10/2026**, como todas as
  de cobrança que vão à Stripe (etapa 4.7, passo 1: *Limite de tentativas nas rotas de cobrança*,
  abaixo).
- **A confirmação do banco na tela** (sessão b): na troca para o Anual e na cobrança atrasada
  paga com o cartão novo, a janela do banco abre por cima da tela; não concluída — por qualquer
  motivo, inclusive o Stripe.js que quebra —, a troca de plano é desfeita na hora, e a troca de
  cartão oferece "Confirmar pagamento". *A janela do banco de verdade ainda não abriu num
  navegador — ver Pendências de verificação.*
- **A tela só AFIRMA o que o servidor disse** (segunda revisão de segurança, 11/10/2026): a
  janela do banco pode dar erro depois de o pagamento passar. Por isso `desistir` responde em
  que plano a assinatura ficou, e "nada foi cobrado" só aparece quando o plano continua o mesmo;
  depois de qualquer falha, a tela relê a assinatura antes de dizer que não deu. *Limite:* com o
  pagamento aprovado, se o servidor ainda não disser Anual em ~9 segundos, a tela afirma assim
  mesmo — o resumo pode mostrar Mensal por instantes.
- **A fatura da troca é só a da troca** (`billing_reason: subscription_update`), e desistir não
  anula fatura nenhuma com a cobrança atrasada. `[FATO — medido com o relógio de teste,
  11/10/2026]` se a renovação chega com uma troca ainda pendente, a Stripe descarta a troca
  (anula a fatura dela) e a assinatura fica atrasada com a fatura da renovação em aberto.
- **Só o agendamento que a escola criou é "troca marcada"**: `agendarTroca` grava a marca
  `MARCA_DA_TROCA`, e só o agendamento com ela é mostrado, desfeito por "Continuar no Anual" e
  solto ao mudar de plano. O que for posto pelo painel da Stripe fica como está, e essa
  assinatura não muda de plano pela tela — só ao CANCELAR ele é solto (com ele a Stripe recusa
  parar a renovação), e o operador é avisado.
- **O que vira alerta para o operador resolver no painel da Stripe:** a devolução que falhou
  (a pessoa lê a frase aprovada, continua logada, e não tem botão para repetir quando a
  assinatura já aparece terminada — quem devolve é o operador); a cobrança em aberto que não
  pôde ser anulada ao cancelar com a cobrança atrasada; e a cobrança que PASSOU no instante
  desse cancelamento — aí a pessoa pagou um período que quis cancelar.
- **Pedido que muda cobrança e vem de outro site é recusado** (403 `OutroSite`, pelo
  `Sec-Fetch-Site` do navegador): segunda trava além do cookie, para todo `/api/billing`.
  Navegador antigo que não manda o cabeçalho fica só com a primeira.
- **O ano do Anual e a conta da troca — o que foi medido (11/10/2026, com o relógio de teste):**
  sem pedir nada, a Stripe mantém o ANIVERSÁRIO da assinatura — quem assinou o Mensal em 11/10 e
  troca em 30/12 pagaria R$ 738,25 (o anual proporcional até 11/10/2027) e seria cobrado de novo
  nove meses depois. Com o período recomeçando no dia da troca (a decisão do operador), o mesmo
  caso paga **R$ 956,33** — os R$ 995,00 menos os 12 dias que sobraram do mês — e a cobrança
  seguinte vem em 30/12/2027. A data de início da assinatura não muda (o prazo do reembolso não
  recomeça). **Como o valor fica congelado:** com o período recomeçando, a Stripe não aceita fixar
  o instante da conta — ela desconta o que sobra do mês no momento do pedido, e isso anda cerca
  de 1 centavo a cada 4 minutos e meio. Então a cobrança NÃO usa essa conta: o anual entra
  cheio, e o desconto entra como uma linha de crédito de valor fixo, no mesmo pedido, do
  tamanho exato para a fatura dar o valor mostrado (`paraPedidoDeCobrar`). `[FATOS — medidos]`
  mostrado R$ 956,33, a conta da Stripe 9 minutos depois R$ 956,35, cobrado R$ 956,33; com um
  código de 50% o cobrado também é o mostrado, porque o crédito fica fora do alcance do código
  (`discountable: false` — sem isso ele é cortado pela metade); anulada a fatura, nada sobra no
  cliente. Na fatura da Stripe o crédito aparece como uma linha negativa com o nome do produto.
  **A rede de segurança:** se um dia a fatura da troca não der o valor mostrado, a que ainda
  espera o banco é anulada e a troca falha; a que já foi cobrada vira alerta para o operador.
  A rede olha a fatura NOVA (outra que não a de antes da troca), sem depender do motivo que a
  Stripe escreve nela; e, se a anulação falhar, o alerta diz que a fatura continua em aberto.
- **O pedido de troca repetido** (terceira revisão de segurança, 11/10/2026). Se a Stripe demorar
  e o pedido "falhar" do nosso lado com a cobrança ainda andando, a pessoa clica de novo.
  `[FATO — medido em tempo de verdade]` repetido numa assinatura que já virou anual, o pedido não
  cobra outra vez, mas deixa o crédito do mês SOLTO no cliente — e a renovação seguinte sairia
  R$ 99,90 mais barata. Duas travas: o pedido nem é feito se o item já está no preço novo, e vai
  com uma chave de repetição (`chaveDaTroca`) — com a mesma chave a Stripe devolve o resultado
  do primeiro pedido. A chave leva a última fatura de antes da troca, para a tentativa seguinte
  a uma recusa (ou a uma confirmação do banco desfeita) ser uma tentativa de verdade.
- **Saldo de crédito do cliente na Stripe** (só existe se o operador der saldo pelo painel): a
  troca para o Anual o consome de um jeito diferente do que a conta por tempo consumiria, sempre
  contra o aluno, nunca contra a escola — no pior caso, a sobra do mês se perde. Hoje nenhum
  fluxo da escola cria saldo. *Reabre se a escola passar a dar saldo a alunos: aí o crédito da
  troca se calcula sobre o total da fatura, e não sobre o valor devido.*
- **O reembolso pela tela pode se repetir** — assinar, pedir o dinheiro em 7 dias, assinar de
  novo, pedir de novo. Nada limita, por decisão do operador (10/10/2026, confirmada em 21/10/2026
  — fecha a P75): *Reembolso: 7 dias, por lei*, acima.

## Códigos promocionais — como criar na Stripe *(decisão do operador, 19/10/2026)*

**A regra:** **limite de usos, só em código de 100%** (cortesia, presente): ele ativa a assinatura
no próprio clique, então o uso é gasto em acesso de verdade. **Código de desconto parcial**
(campanha, como "50% na Black Friday") **vai sem limite de usos, só com data de validade** —
ninguém consegue esgotá-lo. *(À pergunta da etapa 4.7, passo 2, com o exemplo explicado, ele
escolheu "Sem limite de usos", entre isso, uma trava no servidor e só registrar.)* *Reabre se a
escola precisar de um código parcial com poucas vagas — aí volta à mesa a trava no servidor (a
mesma conta não gasta mais de 2 usos do mesmo código sem pagar), com texto novo dele.*
**E o código de 100% que NÃO é "para sempre"** (só a primeira cobrança, ou alguns meses) tem um
cuidado próprio, já anotado e ainda em aberto (*Assinar com a conta logada* → *Da revisão de
segurança da etapa*): ele libera o acesso antes de o cartão ser guardado, e nada impede a mesma
conta de usá-lo de novo quando a assinatura cair. Antes de criar o primeiro: com a restrição "só
na primeira compra" da Stripe, conferida na área restrita — e a decisão dele sobre recusar o código
repetido pela mesma conta.
**Código de 100% nasce DIFÍCIL DE ADIVINHAR** *(decisão do operador, 21/10/2026, junto do teto por
dia — Limite de tentativas, abaixo)*: letras e números sem sentido, como `PRESENTE-K7Q2X9` — nunca
uma palavra (`CORTESIA`, `PRESENTE`) —, e com poucos usos. Na tela sem login (etapa 4.7, passo 4)
qualquer pessoa confere código; o teto por dia só atrasa quem tenta adivinhar, e quem acha um
código de 100% ganha acesso. *Reabre se a escola quiser um código de cortesia fácil de divulgar.*

**Por quê** `[FATO — medido na área restrita em 19/10/2026, com as funções de verdade do
checkout]`: criar a assinatura incompleta com o código **gasta um uso** (do código e do cupom),
antes de qualquer pagamento · cancelá-la — o que o checkout faz quando a pessoa troca de plano e
clica de novo — **não devolve** · a abandonada, que expira sozinha em 23 h (relógio de teste),
**também não** · esgotado, o código fica inativo (`active: false`), e a nossa conferência já diz
"não é válido" · criar com o código esgotado é recusado com `param: promotion_code` (sem `code`) —
o checkout passou a tratar isso como "código não vale" (antes, sairia "não foi possível
concluir"). A prévia (`invoices.createPreview`) **não** gasta uso (medido em 10/10/2026).
`[FATO — context7 /websites/stripe, 19/10/2026]` *"Applying a coupon means attaching it directly
to a subscription […] Both actions count toward the same `max_redemptions` limit on the coupon."*
Com desconto parcial, a incompleta nasce a cada clique em "Assinar" com outro plano: um código de
100 usos se esgotaria em 100 cliques, sem ninguém pagar.

## Limite de tentativas nas rotas de cobrança *(Fase 4, etapa 4.7, passo 1 — 19/10/2026)*

**Decisões do operador (19/10/2026):**
- **O plano do passo, com o pacote `express-rate-limit`** (à pergunta "posso seguir este plano,
  com o pacote?": *"Sim, com o pacote"*), fixo na **8.7.0** — a mais nova com duas semanas ou
  mais, sem correção de segurança nas duas seguintes. Os tetos abaixo estavam no plano que ele
  aprovou. *Reabre se um aluno honesto parar num teto, ou se o registro mostrar teste de cartão
  passando por baixo dele.*
- **A frase de quem passou do limite:** **"Muitas tentativas seguidas. Por segurança, espere
  alguns minutos e tente de novo."** (`app.comum.muitasTentativas`). Aparece no lugar do erro, nos
  pontos em que a pessoa clica — assinar, aplicar o código promocional, trocar o cartão, cancelar,
  manter, mudar de plano e desistir da troca. As telas que só carregam seguem com "não foi
  possível carregar": para chegar ao teto de leitura é preciso recarregar dezenas de vezes.
  *Reabre se alguém chegar ao teto de leitura sem estar atacando — aí a frase vai também para as
  telas que carregam.*

**Os tetos** — por conta, e o dobro por endereço de internet (quem divide o endereço, como a rede
de uma operadora de celular, não paga pelo vizinho); **cada rota conta separado**:

| Grupo | Rotas | Por conta | Por endereço |
|---|---|---|---|
| Guardar cartão ou cobrar | `POST` assinatura, cartao, cartao/aplicar, minha-assinatura/plano | 5 a cada 15 min, e 20 por dia | 10 e 40 |
| Outras ações | `POST` previa, minha-assinatura/cancelar, …/manter, …/reembolso, …/plano/desistir | 10 a cada 15 min | 20 |
| Leituras que vão à Stripe | `GET` planos, minha-assinatura, minha-assinatura/plano | 60 a cada 15 min | 120 |

**SEM LOGIN** *(etapa 4.7, passo 4 — os tetos estavam no plano aprovado pelo operador em
21/10/2026; o da prévia por dia é decisão dele, no mesmo dia)*: não há conta, então conta-se por
**endereço** e, ao assinar, também por **e-mail** — o mesmo teto da conta, para ninguém encher a
tentativa de outra pessoa:

| Rota (`/billing/visitante/…`) | Por e-mail (com o endereço) | Por endereço |
|---|---|---|
| `POST assinatura` | 5 a cada 15 min, e 20 por dia | 10 e 40 |
| E-mails novos — cada um, um cliente novo na Stripe | — | **10 por dia** |
| Conferir código promocional — a prévia E o assinar que traz código, numa contagem só | — | **40 por dia** |
| `POST previa` | — | 20 a cada 15 min |
| `GET planos` | — | 120 a cada 15 min |
| `POST confirmacao` ("o pagamento já valeu?") | — | 900 a cada 15 min (a tela pergunta a cada 2 s; duas abas cabem) |

E, somando todos os endereços, **no máximo 3 `POST assinatura` em andamento ao mesmo tempo** (*Assinar
sem conta*, acima).

- **Os e-mails novos contam CLIENTES CRIADOS, nunca pedidos** (`contarClienteNovo`): a regra de
  assinar a chama no instante em que um cliente novo vai nascer na Stripe — quem erra o CPF, ou
  volta com o mesmo e-mail, não gasta nada. *(Foi pego antes do commit: contado na entrada da rota,
  dez CPFs errados gastariam o dia do endereço.)* É a recomendação da Stripe de limitar quantos
  clientes um endereço cria por dia (acima).
- **Os tetos do e-mail antes dos do endereço**, como os da conta: quem já passou do teto do próprio
  e-mail não gasta a cota do endereço, que outras pessoas dividem. O e-mail se lê do corpo, aparado
  e em minúsculas; sem um, o pedido não conta por e-mail (e a validação o recusa logo depois). Nunca
  vai para o registro.
- **O teto "por e-mail" conta o e-mail JUNTO com o endereço** (achado da revisão de segurança do
  passo 4, 21/10/2026): contado só pelo e-mail, quem soubesse o de alguém o trancaria de qualquer
  lugar com pedidos de propósito (5 pedidos inválidos trancariam 15 minutos; 20, o dia). Assim,
  trancar exige estar no endereço da pessoa; os números são os do plano aprovado.
- **Os e-mails novos do dia esgotados recusam QUALQUER e-mail do endereço**, com o mesmo 429: recusar
  só o e-mail novo diria a quem sonda que um e-mail tinha começado uma assinatura.
- **Sem endereço válido em produção, as rotas sem login contam todos JUNTOS**, numa contagem só (e o
  alerta de sempre, uma vez): com login, o pedido sem endereço não conta por endereço porque o teto
  da conta continua (passo 1); sem login não há conta, e não contar deixaria as rotas sem limite.

**Sem limite, de propósito:** `GET /billing/assinatura` ("já tenho acesso?") — a tela de depois do
pagamento a repete a cada 2 s, e ela só lê o banco. `GET /billing/planos` não estava na lista do
plano e entrou: também vai à Stripe a cada vez.

`[FATO — context7 /websites/stripe, 19/10/2026, a página de prevenção de teste de cartão]`
*"Endpoints targeted by card testers typically allow them to […] Save card. Make a payment."* — e,
entre as sugestões dela: *"Limit the number of cards that can be added to an account"* e limitar
quantos clientes um mesmo endereço cria *"in 1 day"*. É o porquê do teto do dia nas rotas de
cartão e de cobrança.

**Convenções de engenharia (como o código faz):**
- **Um arquivo, `server/src/lib/limite-de-tentativas.ts`**, e o limite entra em cada rota
  **depois do `requireAuth`**: sem sessão continua 401, e quem não entrou não gasta a cota de
  ninguém. **Rota nova de `/billing` que vá à Stripe entra num dos grupos.**
- **A chave:** a rota pelo DESENHO dela, como foi declarada (`/billing/cartao`) — nunca o endereço
  como foi digitado: o Express aceita `/API/…`, `/Api/…` e a barra no fim, e cada grafia abriria
  uma contagem (achado P1 da revisão de segurança, corrigido no mesmo dia); sem o método, então o
  `HEAD` conta junto com o `GET` — + a conta da sessão, ou o endereço: o `x-real-ip`, o mesmo do
  limite do login (`CLAUDE.md` → *Quality Gates*). **O IPv6 conta pela faixa /56**: quem recebe
  uma faixa inteira da operadora trocaria de endereço a cada pedido.
- **O endereço tem que ser um IP.** Em produção, sem o `x-real-ip` ou com um que não é IP (a
  borda deixou de reescrevê-lo), o pedido **não conta por endereço** — contar pela conexão
  juntaria a escola inteira na contagem do proxy da Railway —, o teto da conta continua, e vai
  **um alerta** por processo. Fora de produção, vale a conexão.
- **O limite por conta só existe depois do `requireAuth`:** montado sem sessão é erro (500, e o
  alerta), nunca uma contagem de todo mundo junto — um robô trancaria a escola inteira. **Rota
  pública ganha grupo próprio**, por endereço (e, no "Enviar de novo", também por e-mail) — existe
  desde o passo 4: `limiteSemLogin` (a tabela *Sem login*, acima).
- **Os tetos da conta (a janela e o dia) antes dos do endereço:** quem já passou de um teto da
  própria conta não gasta a cota do endereço, que outras pessoas dividem.
- **A prévia do código não se repete sozinha** (achado P1 da revisão, 19/10/2026): voltar a um
  plano já visto, à aba ou à rede usa o que já veio — sem isso, quem só comparou os planos
  pararia no limite. O servidor confere o código de novo ao assinar. **E o "desistir da troca"**
  que a tela de mudar de plano repete sozinha **para quando o servidor manda esperar**.
- **Nunca ligar `DEBUG=express-rate-limit` em produção:** o registro do próprio pacote imprime a
  chave, que leva o endereço.
- **A janela é de cada pessoa** e começa no primeiro pedido: quem parou espera no máximo 15
  minutos (o teto do dia, até 24 horas).
- **A recusa:** 429 `MuitasTentativas`, com o `Retry-After` (em quantos segundos a contagem zera),
  **antes** da rota — o pedido nem chega à Stripe. Uma linha de aviso (`console.warn`, não alerta),
  só na primeira recusa da janela, com a conta e **sem o endereço**.
- **Nenhum cabeçalho de contagem** nas respostas que passam.
- **Nos testes o limite fica LIGADO, como em produção**; o `server/src/test/setup.ts` zera as
  contagens antes de cada teste (sem isso, o quinto teste de um arquivo pararia pelo que os
  anteriores gastaram).

`[FATO — medido no código da `express-rate-limit@8.7.0`, 19/10/2026]` as conferências de endereço
do pacote (o `trust proxy`, o `X-Forwarded-For`) só rodam na chave padrão dele — com a nossa, não
disparam · os cabeçalhos antigos de contagem vêm ligados de fábrica (desligados aqui) · o
`Retry-After` só sai com os cabeçalhos ligados (a recusa põe o nosso) · na contagem em memória a
janela de cada chave começa no primeiro pedido dela · `ipKeyGenerator`: IPv4 fica como está, o
IPv4 "embrulhado" (`::ffff:127.0.0.1`) vira IPv4, e o IPv6 vira a faixa (`2001:db8:1:2::1` e
`2001:db8:1:2:ffff::9` → `2001:db8:1::/56`).

**Limitações conhecidas:**
- **A contagem é em memória:** publicar zera, e com dois servidores cada um contaria o seu.
  *Gatilho: subir um segundo servidor — aí a contagem vai para um lugar comum.*
- **O endereço depende de a Railway reescrever o `x-real-ip`**, como o limite do login. *Gatilho:
  trocar de hospedagem ou pôr uma CDN na frente — o mesmo do login.*
- **Confirmar o cartão no campo da Stripe vai do navegador DIRETO para ela**, sem passar por aqui:
  o que este limite segura é abrir o pedido de guardar cartão e criar a assinatura. Um pedido já
  aberto pode ser confirmado de novo com outro cartão, e quem segura essa parte é a proteção da
  própria Stripe (o Radar). **O Radar está ativo na conta de verdade** *(conferido pelo operador
  em 20/10/2026, no painel: Configurações → Radar — "Screening all renewals"; fecha a P91)*. **A
  Stripe tem teto de recusas por pagamento** (medido no passo 4, 21/10/2026: cancela o pagamento
  depois de 10 recusas), e o servidor não acrescenta o seu — *Assinar sem conta*, acima.
  **"Use Radar on payment methods saved for future use" fica DESLIGADO** *(decisão do operador,
  20/10/2026, entre deixar desligado e ligar)*: é a chave que passa o filtro do Radar também
  quando o cartão é GUARDADO sem cobrança na hora — na escola, a tela "Trocar cartão" e os códigos
  de 100% só no primeiro mês —, e a Stripe cobra por tentativa. O risco ali é pequeno: só quem já
  assina chega à troca de cartão, e o limite deixa 5 tentativas a cada 15 minutos e 20 por dia.
  *Reabre se o painel mostrar muitas tentativas de guardar cartão recusadas (sinal de teste de
  cartão), ou se nascer uma tela pública que guarde cartão sem cobrar.*
  `[FATO — context7 /websites/stripe, 20/10/2026]` com o Payment Element, *"we have many automated
  and manual controls in place to mitigate card testing, including rate limiters, AI models,
  CAPTCHA triggers"* — ligados de fábrica (para tirar o CAPTCHA, só pedindo ao suporte) —, e o
  bloqueado aparece como *"Blocked by Stripe"*; a regra `Block if :risk_level: = 'highest'` vale
  *"regardless of your configured rules"*. E o sinal de maior peso para esses modelos é a
  *"Advanced fraud detection"* do Stripe.js — que a escola só carrega nas telas de pagamento
  (`@stripe/stripe-js/pure`, escolha de peso da etapa 4.2): rever na revisão da etapa 4.10.
- **O teto por endereço é o único que recusa quem não fez nada**: numa sala com o mesmo Wi-Fi, a
  11ª pessoa a assinar em 15 minutos (ou a 21ª a aplicar um código) para no limite; a faixa IPv6
  também pode juntar aparelhos de uma operadora. *Reabre se a escola vender ao vivo num evento
  presencial — aí os tetos por endereço ficam ajustáveis, ou se aceita o risco.*
- ~~**A prévia do código não tem teto por dia**~~ — **decidido em 21/10/2026: teto por dia E
  código difícil** *(operador, à pergunta da abertura do passo 4: "Teto por dia + código difícil",
  entre isso e só a regra dos códigos)*. **Sem login**, a conferência do código tem **20 a cada 15
  minutos e 40 por dia por endereço** (quem é honesto usa de 1 a 3); com login, continua 10 a cada
  15 minutos por conta. E todo código de 100% é criado difícil de adivinhar e com poucos usos
  (*Códigos promocionais*, acima). *Reabre se uma pessoa honesta chegar ao teto do dia.*
- **O "desistir da troca" tem o teto das outras ações (10)**: a tela de mudar de plano o pede uma
  vez a cada confirmação do banco não concluída, e só repete quando a assinatura está ocupada —
  nunca no limite. Se ele for recusado, a troca pendente vence sozinha em ~23 h, e a troca seguinte
  a anula.

## Pendências de verificação

**Da etapa 4.6, sessão (b) (11/10/2026):** o servidor foi provado na área restrita com as
funções de verdade (o reembolso, a troca de plano, o cancelamento com a cobrança atrasada — este
com o relógio de teste). *Não exercitado em navegador:* as telas de cancelar e de mudar de
plano, e **a janela de confirmação do banco** (o Stripe.js de verdade conduzindo a confirmação
— nos testes ele é dublê). Para o operador, no computador, com a área restrita: na tela de mudar
de plano, com o cartão de teste **4000 0027 6000 3184** (o que sempre pede confirmação) na
assinatura, mudar do Mensal para o Anual — a janela do banco tem que abrir; confirmando, o plano
vira Anual; fechando a janela, a tela diz que nada foi cobrado e o plano segue Mensal.
**Da etapa 4.6, sessão (a) (11/10/2026):** a leitura e a troca de cartão foram provadas na área
restrita, pelo servidor (acima), e **no navegador, pelo operador, no mesmo dia**: como `member@`
no computador, o resumo abriu ("Mensal · R$ 99,90/mês", "Próxima cobrança: R$ 0,00 em
10/11/2026", "Nenhum cartão cadastrado."), o campo de VERDADE da Stripe abriu para só guardar o
cartão, o `4242` foi salvo ("Cartão atualizado.") e o resumo passou a mostrar "Visa •••• 4242".
*Não exercitado no navegador:* a cobrança atrasada paga pelo cartão novo (só na área restrita,
com o relógio de teste).
**Da etapa 4.4 (10/10/2026):** a sincronia do checkout e a do admin foram
provadas na área restrita (acima). *Não exercitado contra a Stripe, só com ela simulada e sessões
de verdade:* a assinatura cancelada por falta de pagamento derrubando a sessão. **Na conta de VERDADE (etapa 4.3, 10/10/2026):** o operador assinou no site com um
código de 100% e o espelho de produção ficou ativo, de verdade — as chaves, os preços, o código e o
aviso real provados; o caminho do CARTÃO de verdade ainda não foi exercitado no site (é cobrança
real: quando ele quiser). A da etapa 4.2 fechou em 10/10/2026: o operador assinou como `member@`, no
navegador dele, com o cartão de teste e depois com o `TESTE100` (ativa, sem cartão, fatura de
valor zero, 1 de 5 usos do código) — com o aviso chegando pelo `stripe listen`.
*(A da pausa fechou em 09/10/2026 — ver "A cobrança pausada", acima.)*
