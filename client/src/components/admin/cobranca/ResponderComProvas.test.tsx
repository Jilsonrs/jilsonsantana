// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, within } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";
import type { ProvasDaContestacao } from "@jilson/core";

const adminProvasDaContestacao = vi.fn<(casoId: number) => Promise<ProvasDaContestacao>>();
const adminResolverCaso = vi.fn<(casoId: number, acao: string) => Promise<{ detalhe: string }>>();
vi.mock("@/lib/api", () => ({
  adminProvasDaContestacao: (casoId: number) => adminProvasDaContestacao(casoId),
  adminResolverCaso: (casoId: number, acao: string) => adminResolverCaso(casoId, acao),
}));

import { ResponderComProvas } from "./ResponderComProvas";

// "RESPONDER COM PROVAS" NO CASO DA CONTESTAÇÃO (etapa 4.7b, passo 5b — P140). O que protege: a prévia só é pedida quando o
// operador abre; ela mostra cada campo com o nome dele e o texto EXATO; o envio pede confirmação (não tem volta) e vai com o
// caso certo; o carregando, o erro (com "tentar de novo") e a falha do envio dizem o que houve.

const PROVAS: ProvasDaContestacao = {
  prazo: "2026-11-20T23:59:59.000Z",
  motivo: "fraudulent",
  centavos: 9990,
  campos: [
    { campo: "customer_name", texto: "Ana Souza" },
    { campo: "access_activity_log", texto: "Aulas abertas: 1; concluídas: 1; tempo assistido: 25 min." },
    { campo: "refund_policy_disclosure", texto: "A escola segue o direito de arrependimento." },
  ],
};

beforeEach(() => {
  adminProvasDaContestacao.mockReset().mockResolvedValue(PROVAS);
  adminResolverCaso.mockReset().mockResolvedValue({ detalhe: "as provas foram ao banco; agora é a decisão dele (a ficha mostra a situação da contestação)" });
});

describe("responder com provas", () => {
  it("a prévia só é pedida ao abrir; carregando; cada campo com o nome e o texto exato; o prazo, o motivo e o valor", async () => {
    adminProvasDaContestacao.mockReturnValueOnce(new Promise(() => {}));
    const { unmount } = renderWithProviders(<ResponderComProvas casoId={7} />);
    expect(adminProvasDaContestacao).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Responder com provas" }));
    expect(await screen.findByText("Montando as provas…")).toBeTruthy();
    unmount();

    renderWithProviders(<ResponderComProvas casoId={7} />);
    fireEvent.click(screen.getByRole("button", { name: "Responder com provas" }));
    const provas = await screen.findByRole("region", { name: "As provas que vão ao banco" });
    expect(adminProvasDaContestacao).toHaveBeenLastCalledWith(7);
    expect(within(provas).getByText(/^Prazo para responder: 20\/11\/2026 · motivo: fraude \(a pessoa diz que não fez a compra\) · valor: R\$\s99,90$/)).toBeTruthy();
    expect(within(provas).getByText("Nome")).toBeTruthy();
    expect(within(provas).getByText("Ana Souza")).toBeTruthy();
    expect(within(provas).getByText("O que ela usou: as aulas e as horas")).toBeTruthy();
    expect(within(provas).getByText("Aulas abertas: 1; concluídas: 1; tempo assistido: 25 min.")).toBeTruthy();
    expect(within(provas).getByText("A política de reembolso")).toBeTruthy();
    expect(adminResolverCaso).not.toHaveBeenCalled();
  });

  it("enviar pede confirmação (não tem volta); confirmado, vai com o caso certo, e diz o que houve", async () => {
    renderWithProviders(<ResponderComProvas casoId={7} />);
    fireEvent.click(screen.getByRole("button", { name: "Responder com provas" }));
    fireEvent.click(await screen.findByRole("button", { name: "Enviar ao banco" }));
    expect(screen.getByRole("group", { name: "Confirmar o envio" }).textContent).toContain("Depois de enviar, não dá para mudar: o banco decide com estas provas.");
    expect(adminResolverCaso).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar o envio" }));
    expect((await screen.findByRole("status")).textContent).toBe("Feito: as provas foram ao banco; agora é a decisão dele (a ficha mostra a situação da contestação).");
    expect(adminResolverCaso.mock.calls).toEqual([[7, "enviar-provas"]]);
  });

  it("a prévia que não veio: diz por quê, e 'tentar de novo' pede de novo", async () => {
    adminProvasDaContestacao.mockRejectedValueOnce({ response: { data: { error: "ContestacaoNaoAberta" } } });
    renderWithProviders(<ResponderComProvas casoId={7} />);
    fireEvent.click(screen.getByRole("button", { name: "Responder com provas" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Só a contestação aberta se responde ou se aceita: o inquérito se resolve devolvendo o dinheiro, e a já decidida não muda.");
    fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(await screen.findByRole("region", { name: "As provas que vão ao banco" })).toBeTruthy();
    expect(adminProvasDaContestacao).toHaveBeenCalledTimes(2);
  });

  it("o envio que falhou: diz por quê", async () => {
    adminResolverCaso.mockRejectedValueOnce({ response: { data: { error: "ContestacaoNaoAberta" } } });
    renderWithProviders(<ResponderComProvas casoId={7} />);
    fireEvent.click(screen.getByRole("button", { name: "Responder com provas" }));
    fireEvent.click(await screen.findByRole("button", { name: "Enviar ao banco" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar o envio" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Só a contestação aberta se responde ou se aceita: o inquérito se resolve devolvendo o dinheiro, e a já decidida não muda.");
  });
});
