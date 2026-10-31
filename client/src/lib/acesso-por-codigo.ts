import { useLocation } from "react-router";
import { CHAVE_DO_RECIBO, DESTINOS_DEPOIS_DE_ENTRAR as DESTINOS, entrarPara, telaDoRecibo } from "@jilson/core";
import { codigoDaRecusa } from "@/lib/faturamento";

// O CÓDIGO NO E-MAIL nas telas de acesso (etapa 4.7, passo 5): as regras que as telas dividem.

// Depois de entrar, TODO MUNDO cai no Início — nunca na conta (destino de tarefa) nem no catálogo
// (uma seção, não o começo). Inclusive o admin: a plataforma é uma só, e o Dashboard dele fica a um
// clique no menu (decisão do operador, 29/09/2026). Este é o único lugar que aponta para lá — com
// senha, com o código, ou depois de criar a senha nova.
export const POS_LOGIN = "/inicio";

/**
 * AS EXCEÇÕES, e por endereço: o "Já tem conta? Entrar" da tela pública de assinar leva a
 * `ENTRAR_PARA_ASSINAR`, e depois de entrar a pessoa vai à tela de assinar do app (decisão do
 * operador, 27/10/2026, P80); os botões dos e-mails da cobrança levam à tela de assinar e à de trocar
 * o cartão (etapa 4.7, passo 7). LISTA FECHADA, a do `core` (`DESTINOS_DEPOIS_DE_ENTRAR`, a mesma que o
 * servidor usa nos e-mails): o destino nunca vem do endereço — `?depois=` só escolhe um nome da
 * lista, e o que não está nela vai para o Início (nada de levar a outro site).
 */
const DESTINOS_DEPOIS_DE_ENTRAR: ReadonlyMap<string, string> = new Map(Object.entries(DESTINOS));
export const ENTRAR_PARA_ASSINAR = entrarPara("assinar");

/** Para onde ir depois de entrar, pela busca do endereço da tela de entrar. Função pura. */
export function destinoDepoisDeEntrar(busca: string): string {
  const parametros = new URLSearchParams(busca);
  const nome = parametros.get("depois");
  // O recibo dos e-mails (4.7b, passo 6a): o nome e a chave, conferida — sem ela no formato, o Início.
  if (nome === "recibo") {
    const chave = parametros.get("recibo") ?? "";
    return CHAVE_DO_RECIBO.test(chave) ? telaDoRecibo(chave) : POS_LOGIN;
  }
  return (nome !== null && DESTINOS_DEPOIS_DE_ENTRAR.get(nome)) || POS_LOGIN;
}

/** O destino depois de entrar, para a tela aberta agora. */
export function useDestinoDepoisDeEntrar(): string {
  return destinoDepoisDeEntrar(useLocation().search);
}

/** Os 6 números do código — a conferência da tela, antes de gastar uma das 3 tentativas. */
export const CODIGO_DE_6_NUMEROS = /^\d{6}$/;

/** Como a tela descreve uma falha: o código não serve, excesso de tentativas, ou outra coisa. */
export type FalhaDoCodigo = "codigo" | "limite" | "falha";

/**
 * A recusa do Better Auth ao GASTAR o código (entrar com ele, ou criar a senha nova): errado,
 * vencido ou com tentativas demais (400 e 403) → "o código não serve"; excesso de pedidos (429) →
 * "muitas tentativas"; o resto — rede, servidor — → "não foi possível".
 */
export function falhaAoGastarCodigo(erro: { status?: number } | null | undefined): FalhaDoCodigo {
  if (erro?.status === 400 || erro?.status === 403) return "codigo";
  if (erro?.status === 429) return "limite";
  return "falha";
}

/** A recusa da NOSSA rota de pedir o código: excesso de pedidos, ou outra falha. */
export function falhaAoPedirCodigo(erro: unknown): "limite" | "falha" {
  return codigoDaRecusa(erro) === "MuitasTentativas" ? "limite" : "falha";
}
