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

- **Sem teste grátis. Sem conteúdo grátis dentro da escola** — o grátis mora no
  YouTube.
- Troca mensal↔anual = `subscriptions.update`; **a proração é da Stripe**, e é
  previsualizável antes de mostrar o número ao aluno.
- `temAcessoAtivo()` **ignora qual plano** o membro tem.
- **Não existe oferta de fundador** *(decisão do operador, set/2026)* — nem bônus temporário,
  nem preço travado. A home não usa escassez fabricada.

### Fora do Brasil — dólar, pelo país do CARTÃO *(decisão do operador, 14/09/2026)*

A escola é bilíngue desde o lançamento (`idiomas.md`). **Cartão do Brasil paga em reais;
cartão de qualquer outro país paga em dólar** — independente do idioma do site.

| Cartão | Mensal | Anual |
|---|---|---|
| Brasil | R$ 99,90 | ~R$ 995 |
| Outros países | **US$ 30** | **US$ 299** (mesmo cálculo: ~17%, ≈ 2 meses grátis — confirmado em 14/09) |

- **Por que o cartão e não o idioma:** se a moeda seguisse o idioma, qualquer estrangeiro
  trocaria o site para português e pagaria em real, bem menos que US$ 30.
- **A forma na Stripe** (um `Price` com duas moedas ou `Price`s separados, e como detectar o
  país do cartão antes de cobrar) **não foi verificada** → context7 `/websites/stripe` na
  abertura da Fase 4.
- **Em aberto — preço mostrado × cobrado:** a página pública é vista antes do cartão. Quando o
  cartão levar a outra moeda, **a tela de pagamento mostra o valor final antes da confirmação**.
  Cobrar de um estrangeiro mais do que a página mostrava é o pior caso.
- **`temAcessoAtivo()` continua ignorando plano, moeda E idioma** *(decisão do operador,
  14/09/2026 — modelo LinkedIn Learning)*: **uma assinatura dá acesso aos cursos dos dois
  idiomas**. O idioma é só filtro do que aparece; quem troca de idioma estuda os cursos do outro na
  mesma assinatura.
- **Botão de assinar nas páginas em inglês só liga com pelo menos 1 aula publicada em inglês**
  *(decisão do operador, 14/09/2026)*, para quem só lê inglês não pagar US$ 30 sem aula que entenda.
  Condição derivada do banco (nunca interruptor manual). **É regra de exibição, não de checkout:**
  como a assinatura não tem idioma, quem assina pela página em português está certo e não é
  recusado. A aparência do botão desligado se decide na abertura da Fase 4.

### Imposto internacional — decidir ANTES da primeira venda fora do Brasil

`[FATO — docs da Stripe via context7 + guias de IVA europeu, 14/09/2026]` Detalhe completo em
`idiomas.md` §5. Em uma linha cada:
- **Stripe Tax** calcula e cobra, mas **registro e declaração no governo estrangeiro ficam com o
  vendedor** (a Stripe indica parceiros para declarar).
- **UE: vendedor de fora deve IVA desde a primeira venda**, sem mínimo — **já vale hoje para aluno
  de Portugal**.
- **Stripe Managed Payments** tira a papelada (a Stripe vira a vendedora), mas só funciona com a
  **página de pagamento da Stripe** — colide com *Payment Element embutido, sem página hospedada*.
  Aceitar empresa brasileira: **não verificado**.

**A escolha é do operador, com o contador**, e reabre a decisão da página embutida **só se** o
Managed Payments for o caminho — *dado novo* legítimo (imposto em 80+ países), não argumento
repetido.

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

**A página em inglês promete isso ao MUNDO, não só ao Brasil** *(22/09/2026 — o operador acatou a
recomendação do parceiro de design)*. O texto é **"7-day money-back guarantee"**, porque
"garantia legal de arrependimento" não significa nada para quem lê de fora e termo vago de lei
gera desconfiança. **A consequência é comercial, não de tradução:** o CDC obriga no Brasil; fora
dele, isto passa a ser uma **promessa nossa**, oferecida por escolha. Duas coisas decorrem:
- **A Fase 4 tem que conseguir honrar reembolso de assinante internacional**, não só brasileiro.
- **O texto em português está MAIS VAGO que o em inglês** — ele diz "garantia legal de
  arrependimento", sem citar os 7 dias que esta seção manda dizer. *Alinhar é decisão do operador
  (texto de interface é dele); fica aqui apontado, não corrigido.*

**Estado do código (etapa 4.1, 09/10/2026): o reembolso ainda NÃO corta o acesso.** A fatura da
Stripe não tem situação de "reembolsada" (as situações são `draft`, `open`, `paid`, `uncollectible`
e `void` — tipos da `stripe@23.0.0`): devolvido o dinheiro, ela continua `paid`, e o espelho trata o
mês como pago. Se o acesso acaba na hora do reembolso é a pendência **P56** do operador, a decidir
antes da primeira venda de verdade.

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
que se resolve sozinho na maioria das vezes.

## Cancelamento dentro do site

Deliberadamente **não usamos o Customer Portal da Stripe**: cancelar e gerenciar
acontece em telas nativas da escola (o aluno nunca sai do site).

- Coleta o motivo → `subscriptions.update` com `cancel_at_period_end`.
- **Anti roach-motel:** um "cancelar mesmo assim" claro, de **1 clique**, sempre
  visível. Tom calmo, não retentivo. *(Sensibilidade Procon/CDC — já levantada na
  decisão de preço.)*
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
liga a assinatura à conta pelo `userId` que o NOSSO checkout grava na Stripe.

**As chaves:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` e `STRIPE_PUBLISHABLE_KEY` (esta não é
segredo, mas mora junto: o servidor a entrega ao site, e trocar de ambiente é trocar as variáveis
de um lugar só), **só no ambiente do servidor**
(`server/.env` em dev, Railway em produção) — coladas pelo operador, nunca pelo chat. Até o
lançamento: as do **modo de teste**. Sem o segredo do webhook, todo aviso é recusado (nunca "aceitar
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
  esta tela.*
- **O cartão só some com desconto de 100% PARA SEMPRE** (10/10/2026 — consequência da Stripe,
  levada pelo agente e aceita por ele). Com 100% só na primeira cobrança, ou por alguns meses,
  nada é cobrado hoje, mas o cartão é pedido: a cobrança seguinte precisa dele. *Reabre se ele
  quiser cortesia temporária sem cartão — aí a primeira cobrança falharia, e quem decide o resto
  é a régua de inadimplência.*
- **Os textos da tela estão como RASCUNHO do agente** (`app.assinar.*` e `app.aula.assinar`, nos
  dois idiomas), a revisar por ele (*"isso fazemos depois, é detalhe"*, 10/10/2026) — inclusive
  se a tela leva uma linha sobre o reembolso de 7 dias. *Fecha quando ele revisar.*
- **A tela é simples, "como a Anthropic faz"** (10/10/2026, depois do primeiro teste dele): cada
  cartão de plano diz o preço e como é cobrado; o anual leva o selo do desconto (calculado dos
  dois preços, nunca um texto fixo); **"Hoje você paga" só aparece com código promocional**. O
  acabamento visual é do Antigravity. *Reabre se o dólar (etapa 4.8) ou o Pix (4.9) pedirem
  mostrar de novo o valor final antes de confirmar.*
- **A home tem que levar à assinatura também quem não tem conta** (10/10/2026): é a etapa 4.7.
- **A Stripe fecha INTEIRA na Fase 4, com o Pix** (10/10/2026): *"quero que a escola possa ser
  lançada a qualquer momento depois da fase da Stripe."* *Reabre só por decisão dele.*

**Convenções de engenharia (como o código faz):**
- **O site diz só QUAL plano e o código promocional.** A conta é a da sessão; cliente, preço e
  valor são do servidor (`server/src/lib/checkout.ts`).
- **O valor mostrado é o cobrado.** Os preços vêm da Stripe, pela lookup key; com código, o valor
  de hoje é a prévia da fatura da própria Stripe — que não gasta uso do código.
- **O cartão é preenchido antes de a assinatura existir na Stripe**: quem só olha a tela não deixa
  assinatura pela metade lá. É também o que a etapa 4.8 precisa (o país do cartão antes de cobrar).
- **Uma conta é sempre UM cliente na Stripe** (tabela `stripe_customer`).
- **Uma tentativa de cada vez por conta, e a nova tentativa usa a MESMA assinatura**: cartão
  recusado e novo clique não criam outra; trocar de plano ou de código cancela a tentativa
  anterior antes de criar a nova.
- **Só o aviso da Stripe grava o espelho.** A tela de depois do pagamento pergunta ao gate até a
  resposta ser sim; nada no navegador libera acesso.
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
**o limite de tentativas do código promocional não existe** — precisa existir antes de a etapa
4.7 abrir a conferência ao visitante.

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

## Pendências de verificação

Nenhuma aberta. A da etapa 4.2 fechou em 10/10/2026: o operador assinou como `member@`, no
navegador dele, com o cartão de teste e depois com o `TESTE100` (ativa, sem cartão, fatura de
valor zero, 1 de 5 usos do código) — com o aviso chegando pelo `stripe listen`.
*(A da pausa fechou em 09/10/2026 — ver "A cobrança pausada", acima.)*
