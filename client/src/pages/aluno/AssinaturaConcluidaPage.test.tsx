// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { renderWithProviders } from "@/test-utils";

const getSituacaoDaAssinatura = vi.fn();
vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  getSituacaoDaAssinatura: (...args: unknown[]) => getSituacaoDaAssinatura(...args),
}));

import { AssinaturaConcluidaPage } from "./AssinaturaConcluidaPage";

// DEPOIS DE ASSINAR (Fase 4, etapa 4.2). O que estes testes protegem:
//   - a tela só diz "confirmada" quando o SERVIDOR diz que a conta tem acesso — e pergunta de
//     novo, sozinha, até lá (o aviso da Stripe pode levar uns segundos), inclusive depois de falha;
//   - se demorar, diz com calma que continua conferindo — e continua;
//   - confirmada, para de perguntar, e o que as outras telas guardaram de antes é esquecido.

beforeEach(() => {
  getSituacaoDaAssinatura.mockReset().mockResolvedValue({ temAcesso: false });
});

/** Uma tela qualquer da escola, que guarda o que leu do servidor (como a aula guarda "trancada"). */
function OutraTela({ ler }: { ler: () => Promise<string> }) {
  const { data } = useQuery({ queryKey: ["outra-tela"], queryFn: ler });
  return (
    <div>
      <p>{data ?? "outra tela: lendo do servidor"}</p>
      <Link to="/aluno/assinar/concluido">ir para concluído</Link>
    </div>
  );
}

const abrir = (demora = 60_000, rota = "/aluno/assinar/concluido", outraTela = <p>tela de início</p>) =>
  renderWithProviders(<AssinaturaConcluidaPage conferirACada={20} demora={demora} />, {
    route: rota,
    path: "/aluno/assinar/concluido",
    extraRoutes: [{ path: "/inicio", element: outraTela }],
  });

describe("AssinaturaConcluidaPage", () => {
  it("enquanto o servidor não confirma: \"confirmando\", sem o botão de começar", async () => {
    abrir();
    expect((await screen.findByRole("status")).textContent).toBe("Confirmando sua assinatura…");
    await waitFor(() => expect(getSituacaoDaAssinatura).toHaveBeenCalled());
    expect(screen.queryByRole("link", { name: "Começar a estudar" })).toBeNull();
    expect(screen.queryByText(/demorando/)).toBeNull();
  });

  it("pergunta de novo, sozinha, até o servidor dizer que sim — e então confirma e leva ao Início", async () => {
    getSituacaoDaAssinatura.mockResolvedValueOnce({ temAcesso: false }).mockResolvedValueOnce({ temAcesso: false }).mockResolvedValue({ temAcesso: true });
    abrir();
    expect(await screen.findByText("Assinatura confirmada. Bons estudos!")).toBeTruthy();
    expect(getSituacaoDaAssinatura.mock.calls.length).toBeGreaterThanOrEqual(3);
    expect(screen.queryByText("Confirmando sua assinatura…")).toBeNull();
    fireEvent.click(screen.getByRole("link", { name: "Começar a estudar" }));
    expect(await screen.findByText("tela de início")).toBeTruthy();
  });

  it("confirmada, PARA de perguntar", async () => {
    getSituacaoDaAssinatura.mockResolvedValue({ temAcesso: true });
    abrir();
    await screen.findByText("Assinatura confirmada. Bons estudos!");
    const ate = getSituacaoDaAssinatura.mock.calls.length;
    await new Promise((ok) => setTimeout(ok, 120));
    expect(getSituacaoDaAssinatura.mock.calls.length).toBe(ate);
  });

  it("a pergunta falha (rede): continua \"confirmando\" e continua tentando, até dar certo", async () => {
    getSituacaoDaAssinatura.mockRejectedValueOnce(new Error("rede")).mockRejectedValueOnce(new Error("rede")).mockResolvedValue({ temAcesso: true });
    abrir();
    expect((await screen.findByRole("status")).textContent).toBe("Confirmando sua assinatura…");
    expect(await screen.findByText("Assinatura confirmada. Bons estudos!")).toBeTruthy();
  });

  it("demorou: diz com calma que continua conferindo — e continua, até confirmar", async () => {
    let sim = false;
    getSituacaoDaAssinatura.mockImplementation(async () => ({ temAcesso: sim }));
    abrir(40);
    expect(await screen.findByText("Está demorando mais que o normal. Seu pagamento não se perde: esta página continua conferindo.")).toBeTruthy();
    expect(screen.getByText("Confirmando sua assinatura…")).toBeTruthy();
    sim = true;
    expect(await screen.findByText("Assinatura confirmada. Bons estudos!")).toBeTruthy();
    expect(screen.queryByText(/demorando/)).toBeNull();
  });

  it("confirmada, o que as OUTRAS telas guardaram de antes é esquecido: a tela seguinte lê do servidor de novo, sem mostrar o velho", async () => {
    getSituacaoDaAssinatura.mockResolvedValue({ temAcesso: true });
    const ler = vi.fn<() => Promise<string>>().mockResolvedValueOnce("aula trancada").mockResolvedValue("aula liberada");
    // Começa numa outra tela (que guarda "aula trancada"), vai para concluído, e volta a ela.
    abrir(60_000, "/inicio", <OutraTela ler={ler} />);
    expect(await screen.findByText("aula trancada")).toBeTruthy();
    fireEvent.click(screen.getByRole("link", { name: "ir para concluído" }));
    fireEvent.click(await screen.findByRole("link", { name: "Começar a estudar" }));
    // O texto velho NÃO aparece nem por um instante: a tela abre lendo, e mostra o novo.
    expect(screen.queryByText("aula trancada")).toBeNull();
    expect(await screen.findByText("aula liberada")).toBeTruthy();
  });
});
