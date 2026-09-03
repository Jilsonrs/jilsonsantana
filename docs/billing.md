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
- **Sem trava vitalícia de preço** para fundadores — condição de fundador é bônus
  temporário, nunca preço congelado para sempre.

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
