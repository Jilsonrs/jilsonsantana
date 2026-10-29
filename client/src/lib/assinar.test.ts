import { describe, it, expect } from "vitest";
import { Plano } from "@jilson/core";
import { dataDoResumo, fimDoPeriodoPrePago } from "./assinar";

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
