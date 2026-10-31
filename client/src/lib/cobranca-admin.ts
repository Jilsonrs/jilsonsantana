import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { AssinaturaDaLista, FiltroDasAssinaturas } from "@jilson/core";
import * as api from "@/lib/api";

// O PAINEL DA COBRANÇA DO ADMIN (Fase 4, etapa 4.7b). Admin fica em português, com o texto aqui (decisão do
// operador, 23/09/2026); o operador confere usando (31/10/2026).

export const ROTULO_DO_FILTRO: Record<FiltroDasAssinaturas, string> = {
  todas: "Todas",
  ativas: "Ativas",
  "vao-cancelar": "Vão cancelar",
  atrasadas: "Pagamento atrasado",
  canceladas: "Canceladas",
  aguardando: "Aguardando o primeiro pagamento",
};

/** A ordem dos filtros na tela (o mapa aprovado pelo operador). */
export const ORDEM_DOS_FILTROS: FiltroDasAssinaturas[] = ["todas", "ativas", "vao-cancelar", "atrasadas", "canceladas", "aguardando"];

/** A data, no fuso de Brasília. */
export function dataCurta(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

/** A situação de uma linha da lista, em português. */
export function textoDaSituacao(assinatura: AssinaturaDaLista, agora: Date = new Date()): string {
  const { acabaEm, pagoAte } = assinatura;
  switch (assinatura.situacao) {
    case "ativa":
      return "Ativa";
    case "vai-cancelar":
      return acabaEm ? `Vai cancelar em ${dataCurta(acabaEm)}` : "Vai cancelar";
    case "pre-paga":
      return acabaEm ? `Pix · acesso até ${dataCurta(acabaEm)}` : "Pix";
    case "atrasada":
      return "Pagamento atrasado";
    case "cancelada":
      return pagoAte && new Date(pagoAte) > agora ? `Cancelada · acesso até ${dataCurta(pagoAte)}` : "Cancelada";
    case "aguardando":
      return "Aguardando o primeiro pagamento";
    case "pausada":
      return "Cobrança pausada";
    case "outra":
      return `Na Stripe: ${assinatura.status}`;
  }
}

/** O plano, o "pago até", o código e a marca de teste, numa linha só. */
export function detalhesDaLinha(assinatura: AssinaturaDaLista): string {
  const plano = assinatura.plano === "mensal" ? "Mensal" : assinatura.plano === "anual" ? "Anual" : "Plano não informado";
  const partes = [plano, assinatura.pagoAte ? `pago até ${dataCurta(assinatura.pagoAte)}` : null, assinatura.codigo ? `código ${assinatura.codigo}` : null, assinatura.deTeste ? "teste" : null];
  return partes.filter((parte): parte is string => parte !== null).join(" · ");
}

export type ConsultaDasAssinaturas = { filtro: FiltroDasAssinaturas; busca?: string; pagina: number };

/** Uma página da lista do admin. Ao trocar de filtro, busca ou página, a anterior fica na tela até a nova chegar (sem piscar). */
export function useAssinaturasDoAdmin(consulta: ConsultaDasAssinaturas) {
  return useQuery({ queryKey: ["admin", "assinaturas", consulta], queryFn: () => api.adminListarAssinaturas(consulta), placeholderData: keepPreviousData });
}
