import { describe, it, expect } from "vitest";
import { AxiosError, AxiosHeaders } from "axios";
import { Plano } from "@jilson/core";
import { dataDoResumo, esperaDaProximaConferencia, fimDoPeriodoPrePago, segundosPedidos } from "./assinar";

// O FIM DO PERÍODO PRÉ-PAGO (etapa 4.9, passo 2b): a previsão do resumo, "Acesso até DD/MM/AAAA". Função
// pura, sem tela: o mês seguinte no mesmo dia; o dia que não existe vira o último do mês (como a Stripe
// conta); o anual, um ano à frente.
describe("fimDoPeriodoPrePago", () => {
  const em = (ano: number, mes: number, dia: number) => new Date(ano, mes - 1, dia, 10, 30);
  const dia = (data: Date) => [data.getFullYear(), data.getMonth() + 1, data.getDate()];

  it("o mensal: o mesmo dia do mês seguinte", () => {
    expect(dia(fimDoPeriodoPrePago(em(2026, 3, 15), Plano.MENSAL))).toEqual([2026, 4, 15]);
    expect(dia(fimDoPeriodoPrePago(em(2026, 12, 31), Plano.MENSAL))).toEqual([2027, 1, 31]);
  });

  it("o dia que não existe no mês seguinte vira o último dele — e nunca pula um mês (31/01 → 28/02, não 03/03)", () => {
    expect(dia(fimDoPeriodoPrePago(em(2026, 1, 31), Plano.MENSAL))).toEqual([2026, 2, 28]);
    expect(dia(fimDoPeriodoPrePago(em(2028, 1, 31), Plano.MENSAL))).toEqual([2028, 2, 29]);
    expect(dia(fimDoPeriodoPrePago(em(2026, 3, 31), Plano.MENSAL))).toEqual([2026, 4, 30]);
  });

  it("o anual: um ano à frente, com a mesma regra do dia (29/02 → 28/02)", () => {
    expect(dia(fimDoPeriodoPrePago(em(2026, 10, 28), Plano.ANUAL))).toEqual([2027, 10, 28]);
    expect(dia(fimDoPeriodoPrePago(em(2028, 2, 29), Plano.ANUAL))).toEqual([2029, 2, 28]);
  });

  it("a hora do dia é a de hoje (a Stripe conta do instante do pagamento), e a data sai como o aluno lê", () => {
    const fim = fimDoPeriodoPrePago(em(2026, 10, 28), Plano.MENSAL);
    expect([fim.getHours(), fim.getMinutes()]).toEqual([10, 30]);
    expect(dataDoResumo(fim)).toBe("28/11/2026");
  });
});

// A ESPERA DA PERGUNTA "JÁ VALEU?" (P108): a recusa com `Retry-After` é respeitada. Funções puras.
describe("a espera da próxima conferência (P108)", () => {
  const recusa = (cabecalhos: Record<string, string>) =>
    new AxiosError("erro", "ERR_BAD_REQUEST", undefined, undefined, { status: 429, statusText: "", headers: cabecalhos, config: { headers: new AxiosHeaders() }, data: { error: "MuitasTentativas" } });

  it("lê o Retry-After em segundos; sem ele, ou com lixo, nada", () => {
    expect(segundosPedidos(recusa({ "retry-after": "120" }))).toBe(120);
    expect(segundosPedidos(recusa({}))).toBeNull();
    expect(segundosPedidos(recusa({ "retry-after": "amanhã" }))).toBeNull();
    expect(segundosPedidos(recusa({ "retry-after": "0" }))).toBeNull();
    expect(segundosPedidos(new Error("a rede caiu"))).toBeNull();
    expect(segundosPedidos(null)).toBeNull();
  });

  it("sem recusa, o intervalo de sempre; com o Retry-After, a espera do servidor — nunca menos que o intervalo", () => {
    expect(esperaDaProximaConferencia(null, 2000)).toBe(2000);
    expect(esperaDaProximaConferencia(recusa({}), 2000)).toBe(2000);
    expect(esperaDaProximaConferencia(recusa({ "retry-after": "120" }), 2000)).toBe(120_000);
    expect(esperaDaProximaConferencia(recusa({ "retry-after": "1" }), 2000)).toBe(2000);
  });
});
