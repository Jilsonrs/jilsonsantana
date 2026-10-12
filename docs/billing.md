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

**O PRAZO: 7 dias no Brasil, 14 dias fora** *(decisão do operador, 10/10/2026: "deixa no sistema
7 dias Brasil e 14 dias lá fora" — depois de ver, na tabela da Udemy, que a lei de vários países
dá 14)*. **Substitui, para fora do Brasil, os 7 dias prometidos ao mundo em 22/09** (acima).
*Convenção de engenharia:* "Brasil ou fora" é o **país do cartão**, o mesmo critério da moeda
(cobrança em real → 7 dias; em dólar → 14) — nunca o idioma do site. **A resposta de "Is there a
refund?" passou a dizer 14 dias** *(pedido do operador, 10/10/2026: "muda para 14 em inglês";
o texto é o dele: "14-day money-back guarantee")*: **"Yes, we offer a 14-day money-back
guarantee."** — por duas migrations de dado, que só trocam o texto de fábrica (uma edição feita
em Admin → FAQ não é sobrescrita). A primeira gravou a sugestão do agente, com "(7 days for
purchases made in Brazil)"; ele escolheu o texto sem o parêntese, e a segunda tirou.
**Consequência conhecida:** quem lê a página em inglês e paga com cartão do Brasil lê 14 dias,
e a regra do cartão dá 7 — a decidir quando a cobrança em dólar for construída (etapa 4.8). *Reabre se a escola vender num lugar em que a lei exija mais de 14 dias — a tabela da
Udemy cita Quebec e Turquia, "a qualquer momento".*

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
- **Foi esta tabela que levou à decisão de 14 dias fora do Brasil** (acima, 10/10/2026): a
  página em inglês da escola prometia 7 dias ao mundo, menos do que a lei de vários países.
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
**O texto dos termos é do operador, no modelo da cláusula da Udemy (P61).**
**As travas que não dependem de texto** (já decididas ou no plano): o reembolso corta o acesso na
hora · o painel de assinaturas (etapa 4.7b) mostra as cobranças devolvidas de cada aluno, para o
caso a caso.
*Reabre se o reembolso repetido virar prejuízo medido — aí um limite volta à mesa.*

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
  esta tela.* **Feito na etapa 4.6 (11/10/2026):** quem tem a assinatura terminando numa data é
  levado dali a Faturamento e Assinatura, onde está "Manter a assinatura" — voltar sem pagar de
  novo o período que já pagou.
- **O cartão só some com desconto de 100% PARA SEMPRE** (10/10/2026 — consequência da Stripe,
  levada pelo agente e aceita por ele). Com 100% só na primeira cobrança, ou por alguns meses,
  nada é cobrado hoje, mas o cartão é pedido: a cobrança seguinte precisa dele. *Reabre se ele
  quiser cortesia temporária sem cartão — aí a primeira cobrança falharia, e quem decide o resto
  é a régua de inadimplência.*
- **Os textos da tela estão como RASCUNHO do agente** (`app.assinar.*` e `app.aula.assinar`, nos
  dois idiomas), a revisar por ele (*"isso fazemos depois, é detalhe"*, 10/10/2026) — inclusive
  se a tela leva uma linha sobre o reembolso de 7 dias. *Fecha quando ele revisar.* **A proposta
  dessa linha (12/10/2026) está em *A tela pública de assinar*, abaixo — P80 e P81.**
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

## A tela pública de assinar *(Fase 4, etapa 4.7, passo 6 — PROPOSTA do agente, 12/10/2026)*

> **NADA AQUI ESTÁ DECIDIDO além do que traz data e frase do operador.** É a proposta do agente
> depois de ele mostrar as telas de pagamento da Udemy e do Code with Mosh. O que existe na tela
> e os textos são dele: as perguntas estão em `pendencias.md` (**P79 a P85**). Quem construir o
> passo 6 confere antes o que ele já respondeu, e registra a resposta aqui, com a data e a frase.
> *A Udemy e o Mosh são referência desta análise, nunca texto do site.*

**O que o operador disse (12/10/2026):**
- *"como fizemos para os alunos logado que vai assinar está ótimo porque já está funcionando"* —
  a tela pública parte do MESMO formulário (plano, código, cartão), sem refazê-lo.
- *"sem esquecer do desconto no plano anual que é um atrativo"* — o anual continua à vista, ao
  lado do mensal, com o selo do desconto.

**O que a Stripe exige para aprovar o pagamento** `[FATO — context7 /websites/stripe, 12/10/2026:
"The Payment Element only collects essential billing address details by default. To collect a
customer's full billing address for tax calculation […] use the Address Element."]`
- **Endereço não é exigido para aprovar o cartão.** O campo de pagamento já pede sozinho o que
  cada cartão precisa. Endereço completo serve para **calcular imposto**: é por isso que o Mosh
  pede (ele cobra "+ taxes") e a Udemy pede só o país.
- **Para a escola:** nenhum campo a mais na abertura, com a cobrança em reais. *Reabre na etapa
  4.8:* com o dólar e o imposto de fora (P22), pode ser preciso o país — conferir na doc lá.
- **Quem pode pedir um campo a mais não é a Stripe, é a NOTA FISCAL** *(achado, 12/10/2026)*: a
  FAQ da home responde "Sim, emitimos nota fiscal para todos os pagamentos", e a tela pede só
  e-mail e cartão. Se a nota precisar do CPF de quem paga, o campo entra aqui: **P79**, com o
  contador.

**O que a Udemy e o Mosh mostram na hora de pagar, e a escola:**

| Elemento | Udemy | Mosh | A escola hoje | Proposta |
|---|---|---|---|---|
| Página só de pagamento, sem menu, com uma saída no canto | sim ("Cancelar") | sim (só o logo) | a tela logada tem o menu do app | **vale ter** |
| Criar a conta ANTES de pagar (nome, e-mail, código de 6 dígitos) | sim | não: o e-mail vai na própria tela | decidido: a conta nasce no pagamento | não se aplica |
| "Já tem conta? Entrar" | sim | sim | não | **vale ter** |
| Mensal ou anual na tela de pagamento, com selo no anual | sim (anual vem marcado) | escolhe antes, na página | **já temos** (mensal vem marcado) | fica como está |
| "O que está incluído" | 3 linhas | 5 a 6 linhas | só na home | **vale ter** (a lista da home) |
| Dizer que renova sozinha, por quanto, até cancelar | sim | sim | só a frase da Stripe embaixo do cartão, sem valor | **vale ter** (uma linha) |
| Resumo do pedido numa coluna (total de hoje, próxima cobrança) | sim | sim | "Hoje você paga", só com código (decisão de 10/10) | não: a linha acima basta |
| Código promocional | sim | sim | **já temos** | — |
| "Cancele quando quiser" | sim, e diz onde | sim | **já temos** | — |
| Reembolso | "não concedemos, exceto por lei" | selo de 30 dias | não aparece na tela | **vale ter** (7 dias) |
| "Pagamento seguro" | sim | sim | não | **vale ter** (uma linha) |
| "Ao assinar, você concorda com os Termos" | sim | sim | não | **vale ter**, quando os Termos existirem |
| País ou endereço | só o país | endereço completo | nada | não se aplica hoje (ver acima) |
| Receber novidades por e-mail | caixa já marcada | caixa desmarcada | não pergunta | **P82** (desmarcada) |
| Nome completo | sim | sim | o nome é opcional | **P83** (pedir ao criar a senha) |
| Apple Pay, Google Pay, PayPal | os dois primeiros | Apple Pay e PayPal | só cartão (Pix na 4.9) | não na abertura |
| Depoimentos na tela de pagamento | não | 2 | só na home | não na abertura |
| Nota de avaliações, contagem de cursos e de horas | "31.000 cursos" | "52+ courses", nota 4,6 | não | não se aplica hoje |

**A TELA, de cima para baixo** *(o que é novo está marcado; a arrumação visual é do Antigravity —
sugestão: no computador, o formulário à esquerda e os itens 8 e 9 numa coluna à direita; no
celular, uma coluna só, nesta ordem)*:
1. **Topo** *(novo)* — só o logo (leva à home) e "Voltar". Sem menu: nada puxa a pessoa para
   fora na hora de pagar.
2. **Título** — "Assinar" e "Uma assinatura, todos os cursos e trilhas." (os de hoje).
3. **Seu e-mail** *(novo)* — o campo, uma linha dizendo para que serve e "Já tem conta? Entrar".
4. **Escolha o plano** — os dois cartões de hoje, sem mudança: Mensal marcado (é o cartão em que
   a pessoa clicou na home) e Anual ao lado com o selo "17% de desconto" e "equivale a R$ 82,92
   por mês". Embaixo, "Sem fidelidade. Cancele quando quiser."
5. **Código promocional** — o de hoje, com "Hoje você paga" só quando há código.
6. **Pagamento** — o campo do cartão de hoje, com a frase da Stripe embaixo dele.
7. **Junto do botão** *(novo)* — três linhas curtas: a renovação (muda com o plano escolhido), o
   reembolso e o pagamento seguro. Depois o botão **Assinar** e, embaixo dele, a linha dos Termos.
8. **O que está incluído** *(novo nesta tela)* — a MESMA lista do cartão da home e a frase do
   rodapé dele ("Acesso a tudo desde o primeiro dia…"). Duas linhas dela prometem o que ainda
   não existe (o JilsonAI e o Pix): **P84**.
9. **Dúvidas** *(novo)* — um link para as perguntas frequentes da home.

**Os textos** *(o português é RASCUNHO do agente para o operador aprovar ou reescrever: P81; o
inglês é rascunho e passa pela revisão do `idiomas.md`)*:

| Onde | Português | Inglês (rascunho) |
|---|---|---|
| Topo | Voltar | Back |
| E-mail, rótulo | Seu e-mail | Your email |
| E-mail, ajuda | É com ele que você entra na escola. Depois do pagamento, enviamos o link para criar sua senha. | You'll use it to sign in. After payment, we'll email you a link to create your password. |
| E-mail, atalho | Já tem conta? Entrar | Already have an account? Sign in |
| E-mail que já tem conta | Este e-mail já tem conta. Entre para assinar. | This email already has an account. Sign in to subscribe. |
| Renovação, mensal | Renova todo mês por {valor}, até você cancelar. | Renews every month at {valor} until you cancel. |
| Renovação, anual | Renova uma vez por ano por {valor}, até você cancelar. | Renews once a year at {valor} until you cancel. |
| Reembolso | Garantia de 7 dias: se não gostar, você recebe de volta o valor pago. | 14-day money-back guarantee. *(ver "em inglês", abaixo)* |
| Pagamento seguro | Pagamento seguro, processado pela Stripe. A escola não guarda os dados do seu cartão. | Secure payment, processed by Stripe. We never store your card details. |
| Termos | Ao assinar, você concorda com os Termos de Uso e a Política de Privacidade. | By subscribing, you agree to our Terms of Use and Privacy Policy. |
| Título da lista | O que está incluído | What's included |
| Dúvidas | Ficou com dúvida? Veja as perguntas frequentes. | Questions? See the FAQ. |
| Novidades *(se a P82 for sim)* | Quero receber novidades e ofertas da escola por e-mail. | Email me news and offers from the school. |
| Depois de pagar, título | Assinatura confirmada. | You're subscribed. |
| Depois de pagar, texto | Enviamos um e-mail para {email} com o link para você criar sua senha e começar a estudar. | We've sent an email to {email} with a link to create your password and start learning. |
| Depois de pagar, não chegou | Não chegou em alguns minutos? Confira a caixa de spam ou peça de novo. | Didn't get it in a few minutes? Check your spam folder or ask for a new one. |
| Depois de pagar, botão | Enviar de novo | Send it again |
| Depois de pagar, reenviado | Enviamos de novo. | Sent again. |
| Depois de pagar, e-mail errado | Digitou o e-mail errado? Escreva para {contato}. | Wrong email? Write to {contato}. |

**Depois do pagamento.** Quem acabou de pagar não tem senha nem está logado: a tela não pode
dizer "Começar a estudar", como a de hoje. Ela confirma, repete o e-mail digitado (é ali que a
pessoa percebe um erro de digitação), diz o que fazer a seguir e dá a saída para quando o e-mail
não chega. Enquanto a confirmação não vem, valem os textos de hoje ("Confirmando sua
assinatura…", "Está demorando mais que o normal…"). `{contato}` depende da P49.

**Em inglês.** Mesma tela, mesmos blocos. Três diferenças; as duas últimas são a **P85**:
- **O preço** é o que o servidor manda: reais até a etapa 4.8, como a home em inglês hoje.
- **O reembolso:** a FAQ em inglês já diz 14 dias, mas o sistema hoje dá 7 a toda cobrança
  (`PRAZO_DO_REEMBOLSO_EM_DIAS`); os 14 chegam com o dólar, na 4.8. Até lá, a linha em inglês
  promete mais do que a tela de reembolso entrega sozinha.
- **O endereço:** proposta `/en/subscribe` (junto da P14). O botão continua só ligando com uma
  aula publicada em inglês (decisão de 14/09/2026).

**O que isto muda nos passos da 4.7** (detalhe em cada passo, no plano): o **6** ganha os itens
acima · o **5** pede o nome ao criar a senha (P83) e ganha o "Enviar de novo" · o **4** recebe a
resposta da caixa de novidades (P82), o CPF se o contador pedir (P79), e precisa dizer à tela de
depois do pagamento que a assinatura valeu, sem login · o **1** inclui o "Enviar de novo" no
limite de tentativas · o **8** só abre com os Termos de Uso e a Política de Privacidade no ar.

**O que o agente sugere NÃO ter na abertura** *(para ninguém propor de novo sem o gatilho)*:
- **Resumo do pedido numa coluna à parte** — repete o que o cartão do plano já diz; ele pediu a
  tela simples em 10/10/2026. *Reabre com o dólar (4.8) ou o Pix (4.9), como já estava escrito.*
- **Depoimentos e perguntas frequentes na própria tela** — quem clicou em Assinar acabou de
  passar por eles na home. *Reabre se os números mostrarem gente desistindo nesta tela.*
- **Campo de país ou endereço** — a Stripe não exige. *Reabre na 4.8, ou pela P79.*
- **Apple Pay, Google Pay e PayPal** — mais formas de pagamento a testar e manter antes de haver
  aluno. *Reabre depois do lançamento, se alunos pedirem ou o celular pesar nas desistências.*
- **Caixa de novidades já marcada** — marcada de fábrica não vale como consentimento (LGPD).
- **Contagem de cursos e de horas** — com poucos cursos, o número não vende. *Reabre quando o
  catálogo crescer; aí o número sai do banco, nunca de texto fixo.*
- **Anual marcado de início** (como a Udemy) — a pessoa clicou num cartão que diz R$ 99,90 e
  veria R$ 995 primeiro. *Reabre se ele quiser testar.*

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
- **Os textos da sessão (a) — o resumo e a troca de cartão —, em português e inglês: aprovados**
  (`app.faturamento.*`). Um a mais é rascunho do agente: "Sua assinatura terminou." / "Your
  subscription has ended.", para quando não há a data do fim (pendência P65).
- **Cancelar com a cobrança ATRASADA: a assinatura termina na hora, a Stripe para de tentar
  cobrar, e a pessoa continua logada** para ler a confirmação (decisão do operador, 11/10/2026 —
  entre isso, terminar e deslogar, e não deixar cancelar enquanto estiver atrasada). Não há
  período pago a manter: os dias que ela usava eram de tolerância. O texto, aprovado em
  português: **"Sua assinatura termina agora, e a cobrança em aberto não será mais tentada."**
  (inglês, rascunho: "Your subscription ends now, and we won't try the pending charge again." —
  P72). **No servidor desde 11/10/2026** (a tela vem no passo 9): a operação ENCERRA a
  assinatura e só depois anula a cobrança em aberto; a resposta diz que terminou, e a tela é
  avisada antes (`terminaAoCancelar`). *Reabre se a escola quiser cobrar de quem volta o período
  que ficou em atraso.*
- **Os dados que as telas guardaram são limpos também ao ENTRAR** (decisão do operador,
  11/10/2026): "Sair" já limpa; isto cobre a sessão que acaba sozinha (venceu, ou o site
  derrubou) com outra conta entrando em seguida no mesmo computador. **Feito em 11/10/2026**
  (a senha errada não limpa nada). *Sem gatilho: é correção.*
- **Os textos da sessão (b), em PORTUGUÊS: aprovados** (11/10/2026, em três blocos mostrados a
  ele — a tela de mudar de plano, a de cancelar e o banco pedindo confirmação; moram em
  `app.faturamento.plano`, `.cancelamento` e `.banco`). **O inglês entra como está e será
  revisado com o Antigravity** (*"pode deixar assim, depois revisamos com o Antigravity a parte
  do inglês"*; pendência P72). *Fecha quando o inglês for revisado.*
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
  crescem com o preço) ou se ligar imposto na fatura (etapa 4.8) — nos dois casos, rever a
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
  português: **"Sua troca para o plano Mensal também será desfeita."** (inglês, rascunho: "Your
  switch to the Monthly plan will also be undone." — P72). *Reabre se um aluno for cobrado pelo
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
- **O agendamento copia o desconto, e só ele.** Quando a escola ligar o imposto automático
  (etapa 4.8), conferir que as fases da troca marcada o levam.
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
- **As rotas novas não têm limite de tentativas** — como as outras de cobrança: é pré-requisito
  da etapa 4.7, que agora as cita pelo nome.
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
  novo, pedir de novo. Nada limita hoje; é pergunta ao operador (pendência P75), a responder
  antes da etapa 4.7.

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
com o relógio de teste) e as telas em inglês.
**Da etapa 4.4 (10/10/2026):** a sincronia do checkout e a do admin foram
provadas na área restrita (acima). *Não exercitado contra a Stripe, só com ela simulada e sessões
de verdade:* a assinatura cancelada por falta de pagamento derrubando a sessão. **Na conta de VERDADE (etapa 4.3, 10/10/2026):** o operador assinou no site com um
código de 100% e o espelho de produção ficou ativo, de verdade — as chaves, os preços, o código e o
aviso real provados; o caminho do CARTÃO de verdade ainda não foi exercitado no site (é cobrança
real: quando ele quiser). A da etapa 4.2 fechou em 10/10/2026: o operador assinou como `member@`, no
navegador dele, com o cartão de teste e depois com o `TESTE100` (ativa, sem cartão, fatura de
valor zero, 1 de 5 usos do código) — com o aviso chegando pelo `stripe listen`.
*(A da pausa fechou em 09/10/2026 — ver "A cobrança pausada", acima.)*
