import type { AssinaturaCriada, Plano } from "@jilson/core";
import { assinarSemLogin, criarAssinatura, pagarComPix, pagarComPixSemLogin } from "@/lib/api";
import type { FormaDePagamento } from "@/lib/assinar";
import { getStoredAttribution } from "@/lib/attribution";
import { esquecerPix, guardarPix } from "@/lib/pix-pendente";
import { guardarTentativa, lerTentativa } from "@/lib/tentativa-de-assinar";

/** O que a tela de assinar manda ao servidor: QUAL plano, o código (só no cartão), o CPF ou CNPJ e, sem login, o e-mail e as novidades. */
export type PedidoDaTela = {
  semLogin: boolean;
  forma: FormaDePagamento;
  plano: Plano;
  /** O código promocional APLICADO (a prévia o aceitou). No Pix não existe: o Pix é sempre o preço cheio (decisão (b) da etapa 4.9). */
  codigo: string | null;
  documento: string;
  email: string;
  novidades: boolean;
  /** Vai guardada com o segredo do Pix: a tela de concluído abre o QR de novo com ela, sem ler os planos. */
  chavePublicavel: string;
};

/**
 * O PEDIDO AO SERVIDOR (etapa 4.9, passo 2b — era o `assinarComoVisitante` do formulário): a rota certa
 * para as quatro combinações (logado ou sem conta × cartão ou Pix). O site manda só QUAL plano, o código,
 * o CPF ou CNPJ e os dados do visitante — nunca preço, cliente nem conta. Sem login, a tentativa desta
 * aba segue quando é do mesmo e-mail, e a que o servidor devolve fica guardada ANTES de o campo
 * confirmar. No Pix, o segredo do pagamento fica guardado para a tela de concluído ("Mostrar o QR de
 * novo"), também antes. Quem segue por CARTÃO esquece o Pix que esta aba guardou antes (achado da
 * revisão geral, 29/10/2026): o servidor cancela aquele Pix ao criar a assinatura por cartão, e a tela
 * de concluído mostraria um "Mostrar o QR de novo" que não abre nada.
 */
export async function pedirAoServidor(pedido: PedidoDaTela): Promise<AssinaturaCriada> {
  if (pedido.forma === "cartao") esquecerPix();
  const criada = pedido.semLogin ? await pedirSemLogin(pedido) : await pedirLogado(pedido);
  if (criada.estado === "pagar" && criada.tipo === "pix") guardarPix({ segredo: criada.segredo, chavePublicavel: pedido.chavePublicavel });
  return criada;
}

function pedirLogado({ forma, plano, codigo, documento }: PedidoDaTela): Promise<AssinaturaCriada> {
  if (forma === "pix") return pagarComPix({ plano, documento });
  return criarAssinatura(codigo ? { plano, codigo, documento } : { plano, documento });
}

async function pedirSemLogin({ forma, plano, codigo, documento, email, novidades }: PedidoDaTela): Promise<AssinaturaCriada> {
  const origem = getStoredAttribution();
  const anterior = lerTentativa();
  const doMesmoEmail = anterior !== null && anterior.email.toLowerCase() === email.trim().toLowerCase();
  const corpo = {
    email,
    documento,
    plano,
    novidades,
    ...(doMesmoEmail ? { tentativa: anterior.tentativa } : {}),
    ...(origem?.source ? { origem: origem.source } : {}),
    ...(origem?.campaign ? { campanha: origem.campaign } : {}),
  };
  const resposta = forma === "pix" ? await pagarComPixSemLogin(corpo) : await assinarSemLogin(codigo ? { ...corpo, codigo } : corpo);
  guardarTentativa({ tentativa: resposta.tentativa, email: email.trim() });
  return resposta.estado === "pagar" ? { estado: "pagar", segredo: resposta.segredo, tipo: resposta.tipo, ...(resposta.email ? { email: resposta.email } : {}) } : { estado: "ativa" };
}
