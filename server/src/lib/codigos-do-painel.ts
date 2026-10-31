import type { AcaoFeita, CodigoCriado, CodigoDaLista, CriarCodigoInput } from "@jilson/core";
import { prisma } from "./prisma.js";
import { transacaoDaCobranca } from "./casos.js";
import { registrar, type PorQuem, type Resultado } from "./acoes-da-cobranca.js";
import { codigoAtivoExiste, codigoDeCortesia, codigoDoPedido, criarCupomECodigo, lerCodigo, listarCodigos, mudarAtivoDoCodigo, paraCodigoDaLista } from "./stripe-codigos.js";

// OS CÓDIGOS PROMOCIONAIS PELO PAINEL (Fase 4, etapa 4.7b, passo 6d — decisão do operador, 31/10/2026, P142): criar,
// pausar, reativar e ver quantos usaram, sem ir à Stripe. As regras de `billing.md` → *Códigos promocionais* moram aqui e no
// formulário: a CORTESIA é 100%, para sempre, com o código sorteado pelo servidor e um limite de usos; o DESCONTO parcial
// tem data de validade e não tem limite de usos. Os dois tipos que esperam a P125 (o de 100% que não é para sempre e o "por
// N meses") não existem aqui. Cada ação fica no registro da cobrança, com quem fez.

/** Até 4 idas à Stripe com a trava: o pedido repetido, o código que já existe, o cupom e o código. */
const TEMPO_DA_CRIACAO = { maxWait: 10_000, timeout: 60_000 };
const TRES_HORAS = 3 * 60 * 60 * 1000;

/** O fim do dia escolhido, no horário de Brasília (UTC−3, sem horário de verão). Nada: o dia não existe ou já passou. Função pura. */
export function fimDoDia(dia: string, agora: Date): Date | null {
  const fim = new Date(`${dia}T23:59:59-03:00`);
  if (Number.isNaN(fim.getTime())) return null;
  // "2026-02-31" vira 3 de março: o dia de volta não bate.
  if (new Date(fim.getTime() - TRES_HORAS).toISOString().slice(0, 10) !== dia) return null;
  return fim > agora ? fim : null;
}

/** O dia, como o operador lê (DD/MM/AAAA, em Brasília). */
function diaLido(quando: string): string {
  const [ano, mes, dia] = new Date(new Date(quando).getTime() - TRES_HORAS).toISOString().slice(0, 10).split("-");
  return `${dia}/${mes}/${ano}`;
}

/** O código numa linha do registro: o texto, o desconto, os usos e a validade. */
export function descricaoDoCodigo(codigo: CodigoDaLista): string {
  const duracao = codigo.duracao === "uma-vez" ? "só na primeira cobrança" : codigo.duracao === "para-sempre" ? "em todas as cobranças" : codigo.duracao === "por-meses" ? `por ${codigo.meses ?? "?"} meses` : null;
  const desconto = codigo.percentual !== null ? `${codigo.percentual}%${duracao ? ` ${duracao}` : ""}` : "desconto em valor";
  return [codigo.codigo, desconto, codigo.maximo !== null ? `até ${codigo.maximo} ${codigo.maximo === 1 ? "uso" : "usos"}` : null, codigo.validoAte ? `vale até ${diaLido(codigo.validoAte)}` : null].filter((parte): parte is string => parte !== null).join(" · ");
}

/** Os códigos da escola, do mais novo ao mais antigo, com quantos usaram. */
export async function listarCodigosDoPainel(agora: Date = new Date()): Promise<CodigoDaLista[]> {
  return (await listarCodigos()).map((codigo) => paraCodigoDaLista(codigo, agora));
}

/**
 * CRIAR (passo 6d): com a trava dos códigos, sem esperar — dois pedidos ao mesmo tempo não criam dois. O pedido que vem de
 * novo (a resposta que se perdeu) devolve o código que ele já criou, em vez de criar outro: com a cortesia, outro código de
 * 100% no ar que ninguém sabe que existe.
 */
export async function criarCodigoPeloOperador(pedido: CriarCodigoInput, por: PorQuem, agora: Date = new Date()): Promise<Resultado<CodigoCriado>> {
  const expiraEm = pedido.validoAte !== undefined ? fimDoDia(pedido.validoAte, agora) : null;
  if (pedido.validoAte !== undefined && expiraEm === null) return { resultado: "data-invalida" };
  const feito = await transacaoDaCobranca(async (tx) => {
    const [trava] = await tx.$queryRaw<{ livre: boolean }[]>`SELECT pg_try_advisory_xact_lock(hashtext('codigos-promocionais')) AS livre`;
    if (trava?.livre !== true) return { resultado: "ocupada" as const };
    const jaCriado = await codigoDoPedido(pedido.pedido, agora);
    if (jaCriado) return { resultado: "ok" as const, codigo: jaCriado, novo: false };
    let texto = pedido.tipo === "desconto" ? pedido.codigo : codigoDeCortesia();
    if (pedido.tipo === "desconto") {
      if (await codigoAtivoExiste(texto)) return { resultado: "codigo-ja-existe" as const };
    } else {
      // Sorteado entre mais de um bilhão: repetir um código ativo é quase impossível, mas a Stripe recusaria.
      for (let tentativa = 0; tentativa < 3 && (await codigoAtivoExiste(texto)); tentativa++) texto = codigoDeCortesia();
    }
    const cortesia = pedido.tipo === "cortesia";
    const criado = await criarCupomECodigo({
      codigo: texto,
      percentual: cortesia ? 100 : pedido.percentual,
      duracao: cortesia ? "para-sempre" : pedido.duracao,
      maxUsos: cortesia ? pedido.usos : null,
      expiraEm,
      operador: por.conta,
      pedido: pedido.pedido,
    });
    return { resultado: "ok" as const, codigo: criado, novo: true };
  }, TEMPO_DA_CRIACAO);
  if (feito.resultado !== "ok") return { resultado: feito.resultado };
  const linha = paraCodigoDaLista(feito.codigo, agora);
  const detalhe = descricaoDoCodigo(linha);
  // O pedido repetido só registra se o primeiro não chegou a registrar (caiu entre a Stripe e o registro).
  const registrado = !feito.novo && (await prisma.billingLog.findFirst({ where: { action: "criar-codigo", detail: { startsWith: `${linha.codigo} · ` }, createdAt: { gte: new Date(feito.codigo.created * 1000) } }, select: { id: true } }));
  if (!registrado) await registrar(por, "criar-codigo", {}, detalhe);
  return { resultado: "ok", feito: { detalhe, codigo: linha.codigo } };
}

/** PAUSAR ou REATIVAR (passo 6d). Reativar só o pausado: o esgotado e o vencido não voltam (a Stripe recusaria). */
export async function mudarCodigoPeloOperador(id: string, ativo: boolean, por: PorQuem, agora: Date = new Date()): Promise<Resultado<AcaoFeita>> {
  const codigo = await lerCodigo(id);
  if (!codigo) return { resultado: "nao-encontrada" };
  if (codigo.active === ativo) return { resultado: "nada-a-fazer" };
  if (ativo && paraCodigoDaLista(codigo, agora).situacao !== "pausado") return { resultado: "nao-reativa" };
  const mudado = await mudarAtivoDoCodigo(id, ativo);
  const detalhe = `${mudado.code} ${ativo ? "reativado" : "pausado"}`;
  await registrar(por, ativo ? "reativar-codigo" : "pausar-codigo", {}, detalhe);
  return { resultado: "ok", feito: { detalhe } };
}
