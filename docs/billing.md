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

## Pendências de verificação

- **`[VERIFICAR antes de codar a Fase 4]`** — semântica exata de `paused` /
  `pause_collection`, e se `currentPeriodEnd` continua populado durante a pausa.
  A regra do gate (no `CLAUDE.md`) é a **especificação**; o mapeamento para os
  campos reais da API se confirma na hora, via context7 `/websites/stripe`.
