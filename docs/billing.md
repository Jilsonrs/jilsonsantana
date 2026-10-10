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
`[PESQUISA — busca na web, 10/10/2026; a página oficial da Udemy não abriu para o agente (403);
NÃO é parecer jurídico]`
- **Como a Udemy faz:** ela se reserva o direito de limitar ou negar o reembolso quando entende
  que há abuso — parte grande do curso já assistida ou baixada, vários pedidos do mesmo curso,
  conta com reembolso demais — e de restringir a conta
  ([comunicado](https://teach.udemy.com/new-refund-system-policy-updates/),
  [resposta a instrutor](https://community.udemy.com/en/discussion/82596/the-same-student-keeps-asking-for-refunds-and-signing-up-again)).
  Nas assinaturas ela não devolve, "a menos que a lei aplicável exija"
  ([política](https://support.udemy.com/hc/articles/360050856093)).
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
— a garantia de 7 dias prometida fora do Brasil é promessa nossa, e pode ter condição. Para o
consumidor brasileiro, dentro dos 7 dias da lei, negar reembolso só pela cláusula é frágil: ali
ela serve para dizer o que a escola considera abuso e para sustentar a análise caso a caso.
**O texto dos termos é do operador, com advogado (P61).**
**As travas que não dependem de texto** (já decididas ou no plano): o reembolso corta o acesso na
hora · o painel de assinaturas (etapa 4.7b) mostra as cobranças devolvidas de cada aluno, para o
caso a caso.
*Reabre se o reembolso repetido virar prejuízo medido — aí um limite volta à mesa, com parecer de
advogado.*

**Estado do código (10/10/2026): o reembolso ainda NÃO corta o acesso.** A fatura da Stripe não
tem situação de "reembolsada" (as situações são `draft`, `open`, `paid`, `uncollectible` e `void`
— tipos da `stripe@23.0.0`): devolvido o dinheiro, ela continua `paid`, e o espelho trata o mês
como pago. A regra acima entra com o cancelamento (plano → etapa 4.6): o período
devolvido deixa de contar como pago no espelho. **Precede a primeira venda de verdade.**

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
liga a assinatura à conta pelo `userId` que o NOSSO checkout grava na Stripe.

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
  assinatura pela metade lá. É também o que a etapa 4.8 precisa (o país do cartão antes de cobrar).
- **Uma conta é sempre UM cliente na Stripe** (tabela `stripe_customer`).
- **Uma tentativa de cada vez por conta, e a nova tentativa usa a MESMA assinatura**: cartão
  recusado e novo clique não criam outra; trocar de plano ou de código cancela a tentativa
  anterior antes de criar a nova.
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
- **Quem cancela e ainda tem dias pagos continua assistindo até o fim deles** — *"enquanto for
  válida a assinatura nos dias restantes"*. É a regra do gate de Ago 2026, confirmada; nesse caso
  a pessoa também não é deslogada. *Sem gatilho próprio: é a regra do gate. O reembolso, em que o
  período deixa de estar pago, tem regra própria desde 10/10/2026 (*Reembolso*, acima).*
- **Os textos da tela "Assinaturas", a posição do item no menu e o inglês "Reactivate
  subscription" são RASCUNHO do agente** (pendência P59). *Fecha quando ele revisar.*
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

**Da revisão de segurança da etapa (10/10/2026) — nenhum bloqueio.** Corrigidos na hora, com
teste: a busca do admin por e-mail (acima) e a recusa de corpo sem registro. Com destino marcado:
a trava do checkout que segura conexão do banco (pré-requisito (b) da etapa 4.7, no plano) · o
monitor de erro, sem o qual toda falha de cobrança só existe no registro (Fase 7; será o Sentry) ·
a assinatura "não paga" (P60). O relato completo está no plano, Fase 4 → etapa 4.4 → Passo 9.

## Pendências de verificação

Nenhuma aberta. **Da etapa 4.4 (10/10/2026):** a sincronia do checkout e a do admin foram
provadas na área restrita (acima). *Não exercitado contra a Stripe, só com ela simulada e sessões
de verdade:* a assinatura cancelada por falta de pagamento derrubando a sessão. **Na conta de VERDADE (etapa 4.3, 10/10/2026):** o operador assinou no site com um
código de 100% e o espelho de produção ficou ativo, de verdade — as chaves, os preços, o código e o
aviso real provados; o caminho do CARTÃO de verdade ainda não foi exercitado no site (é cobrança
real: quando ele quiser). A da etapa 4.2 fechou em 10/10/2026: o operador assinou como `member@`, no
navegador dele, com o cartão de teste e depois com o `TESTE100` (ativa, sem cartão, fatura de
valor zero, 1 de 5 usos do código) — com o aviso chegando pelo `stripe listen`.
*(A da pausa fechou em 09/10/2026 — ver "A cobrança pausada", acima.)*
