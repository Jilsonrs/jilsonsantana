import { entrarPara, type DestinoDepoisDeEntrar, type Dict } from "@jilson/core";
import { enderecoDoSite } from "../lib/endereco-do-site.js";
import type { SubscriptionEmailKind } from "../lib/prisma.js";
import type { AssinaturaNaStripe } from "../lib/stripe.js";
import type { MensagemDeEmail } from "./email.js";

// OS E-MAILS DA COBRANÇA, MONTADOS (Fase 4, etapa 4.7, passo 7): o texto de cada um, a partir do
// dicionário (`app.email`). Sem banco e sem rede — a regra de QUANDO cada um sai mora em
// `lib/avisos-da-assinatura.ts`, e a prévia (`npm --workspace server run email:previa`) monta com
// esta mesma função, para o operador conferir o texto. Quem chama manda texto, nunca HTML: o modelo
// (`email.ts`) escapa tudo.

/** O e-mail devido agora: o tipo, a falha (ou o fim) a que ele se refere e, na atrasada, quando as aulas trancam. */
export type EmailDevido = { tipo: SubscriptionEmailKind; referencia: string; trancaEm: Date | null };

/** As datas dos e-mails, no horário de Brasília: o servidor roda em UTC. */
const FUSO_DA_ESCOLA = "America/Sao_Paulo";

/** O dia, como o e-mail o escreve (31/10/2026), no horário de Brasília. Função pura. */
export function diaNoEmail(data: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO_DA_ESCOLA, day: "2-digit", month: "2-digit", year: "numeric" }).format(data);
}

/**
 * O e-mail devido, montado com os textos do dicionário (`app.email` — o rascunho do agente, que o
 * operador confere). Função pura: a prévia (`npm --workspace server run email:previa`) monta com a
 * mesma. `enderecoDe`: o endereço absoluto de um caminho do site — sem um que sirva, sai sem o botão.
 */
export function montarAvisoDaCobranca(
  devido: EmailDevido,
  naStripe: Pick<AssinaturaNaStripe, "proximaTentativa" | "encerradaSemPagamento" | "plano">,
  agora: Date,
  e: Dict["app"]["email"],
  enderecoDe: (caminho: string) => string | null = enderecoDoSite,
): MensagemDeEmail {
  const botao = (texto: string, destino: DestinoDepoisDeEntrar): Pick<MensagemDeEmail, "botao"> => {
    const endereco = enderecoDe(entrarPara(destino));
    return endereco ? { botao: { texto, endereco } } : {};
  };
  const ate = devido.trancaEm ? diaNoEmail(devido.trancaEm) : "";
  if (devido.tipo === "COBRANCA_FALHOU") {
    const t = e.cobrancaFalhou;
    const proxima = naStripe.proximaTentativa && naStripe.proximaTentativa > agora ? [t.novaTentativa.replace("{data}", diaNoEmail(naStripe.proximaTentativa))] : [];
    return { assunto: t.assunto, titulo: t.titulo, paragrafos: [t.naoPassou, ...proxima, t.abertasAte.replace("{data}", ate)], ...botao(t.botao, "cartao") };
  }
  if (devido.tipo === "ANTES_DE_TRANCAR") {
    const t = e.antesDeTrancar;
    return { assunto: t.assunto, titulo: t.titulo, paragrafos: [t.semPagamento, t.perdeAcesso.replace("{data}", ate)], ...botao(t.botao, "cartao") };
  }
  if (devido.tipo === "CONFIRMADA") {
    // A confirmação (E18): no Pix, até quando vai o acesso; no cartão, o plano e quando renova. O botão leva ao Início.
    const t = e.confirmada;
    const anual = naStripe.plano === "anual";
    const texto = devido.trancaEm ? t.pix.replace("{data}", ate) : t.cartao.replace("{plano}", anual ? t.anual : t.mensal).replace("{quando}", anual ? t.todoAno : t.todoMes);
    const inicio = enderecoDe("/inicio");
    return { assunto: t.assunto, titulo: t.titulo, paragrafos: [texto], ...(inicio ? { botao: { texto: t.botao, endereco: inicio } } : {}) };
  }
  if (devido.tipo === "PREPAGO_TERMINANDO") {
    // SEM botão: pagar de novo é só DEPOIS de acabar (decisão do operador, etapa 4.9) — o botão de reativar vem no "terminou".
    const t = e.prePagoTerminando;
    return { assunto: t.assunto.replace("{data}", ate), titulo: t.titulo, paragrafos: [t.acaba.replace("{data}", ate), t.depois] };
  }
  const t = e.cancelada;
  return naStripe.encerradaSemPagamento
    ? { assunto: t.assuntoSemPagamento, titulo: t.tituloSemPagamento, paragrafos: [t.semPagamento, t.progressoAoReativar], ...botao(t.botao, "assinar") }
    : { assunto: t.assunto, titulo: t.titulo, paragrafos: [t.terminou, t.progressoSeVoltar], ...botao(t.botao, "assinar") };
}
