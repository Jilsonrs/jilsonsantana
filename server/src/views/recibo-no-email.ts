import { NOME_DA_BANDEIRA, entrarParaORecibo, type Dict, type ReciboDaEscola } from "@jilson/core";
import { diaNoEmail } from "./email-da-cobranca.js";
import type { ReciboDoEmail } from "./email.js";

// O RECIBO NO E-MAIL, em texto (4.7b, passo 6a — decisões do operador, 31/10/2026): o mesmo recibo da tela, montado para o
// bloco do modelo de e-mail. Só texto, sem banco nem Stripe — a prévia (`email:previa`) também o usa.

const dinheiro = (centavos: number, moeda: string) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: moeda.toUpperCase() }).format(centavos / 100);

/** O recibo para o bloco do e-mail — os mesmos itens e textos da tela, sem o nome de quem assina. Função pura. */
export function reciboDoEmail(recibo: ReciboDaEscola, t: Dict["app"]["faturamento"]): ReciboDoEmail {
  const r = t.recibo;
  const c = t.cobrancas;
  const valor = (centavos: number) => dinheiro(centavos, recibo.moeda);
  const abatido = (centavos: number) => r.abatimento.replace("{valor}", () => valor(centavos));
  const item = recibo.plano === "mensal" ? r.planoMensal : recibo.plano === "anual" ? r.planoAnual : r.semPlano;
  const periodo = recibo.periodo ? r.periodo.replace("{de}", diaNoEmail(new Date(recibo.periodo.de))).replace("{ate}", diaNoEmail(new Date(recibo.periodo.ate))) : null;
  const bandeira = recibo.cartao ? NOME_DA_BANDEIRA[recibo.cartao.bandeira] : undefined;
  const final = recibo.cartao?.final ?? "";
  const forma = recibo.forma === "pix" ? c.pix : recibo.cartao ? (bandeira ? c.cartao.replace("{bandeira}", () => bandeira) : c.cartaoSemBandeira).replace("{final}", () => final) : c.outra;
  // As duas caixas da tela: os valores (o preço e o que saiu dele, quando a conta fecha, e o total) e o pagamento.
  const valores: ReciboDoEmail["valores"] = [];
  if (recibo.detalhe) {
    valores.push({ rotulo: r.preco, valor: valor(recibo.detalhe.preco) });
    for (const d of recibo.detalhe.descontos) {
      const codigo = d.codigo;
      valores.push({ rotulo: codigo ? r.desconto.replace("{codigo}", () => codigo) : r.descontoSemCodigo, valor: abatido(d.centavos) });
    }
    if (recibo.detalhe.credito > 0) valores.push({ rotulo: r.credito, valor: abatido(recibo.detalhe.credito) });
  }
  valores.push({ rotulo: r.total, valor: valor(recibo.centavos) });
  const situacao = recibo.situacao === "devolvida" ? c.devolvida : recibo.situacao === "devolvida-em-parte" ? c.devolvidaEmParte.replace("{valor}", () => valor(recibo.devolvido)) : recibo.situacao === "contestada" ? c.contestada : c.paga;
  const pagamento = [
    { rotulo: r.forma, valor: forma },
    { rotulo: r.situacao, valor: situacao },
  ];
  return { titulo: r.titulo, numero: r.numero.replace("{numero}", () => recibo.numero).replace("{data}", diaNoEmail(new Date(recibo.em))), escola: [r.emitente, r.cnpj, r.site], item, periodo, valores, pagamento, nota: r.duvidas };
}

/** O endereço do recibo na escola, pelo número (que é a chave em maiúsculas, em grupos). Função pura. */
export function caminhoDoRecibo(recibo: ReciboDaEscola): string {
  // Pela tela de entrar: quem já está logado segue direto; quem não está entra e cai NO RECIBO, e não no Início.
  return entrarParaORecibo(recibo.numero.replace(/-/g, "").toLowerCase());
}

