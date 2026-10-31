// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";
import type { LinhaDoRegistro, OQueAconteceu } from "@jilson/core";

const adminOQueAconteceu = vi.fn<(pagina: number) => Promise<OQueAconteceu>>();
vi.mock("@/lib/api", () => ({ adminOQueAconteceu: (pagina: number) => adminOQueAconteceu(pagina) }));

import { CobrancaOQueAconteceuPage } from "./CobrancaOQueAconteceuPage";

// ADMIN → COBRANÇA → O QUE ACONTECEU (etapa 4.7b, passo 1f). O que estes testes protegem: os estados (carregando,
// erro com "tentar de novo", nada registrado); os motivos de cancelamento com o MESMO texto que o aluno leu; cada linha
// dizendo quando, quem e o quê — o tipo do aviso e o resumo traduzidos, o valor da contestação, o tipo desconhecido como
// veio — e levando à ficha do aluno; e as páginas.

const linha = (extra: Partial<LinhaDoRegistro>): LinhaDoRegistro => ({ id: 1, em: "2026-11-20T15:30:00.000Z", quem: "STRIPE", acao: "invoice.paid", detalhe: null, centavos: null, aluno: null, ...extra });
const MOTIVOS: OQueAconteceu["motivos"] = [
  { motivo: "caro", total: 2 },
  { motivo: "sem-tempo", total: 0 },
  { motivo: "ja-aprendi", total: 1 },
  { motivo: "sem-conteudo", total: 0 },
  { motivo: "outro", total: 0 },
];

beforeEach(() => {
  adminOQueAconteceu.mockReset().mockResolvedValue({
    motivos: MOTIVOS,
    temMais: false,
    linhas: [
      linha({ id: 3, acao: "customer.subscription.updated", detalhe: "active · vai-cancelar · motivo:caro", aluno: { id: "u-1", nome: "Ana Souza", email: "ana@exemplo.com" } }),
      linha({ id: 2, acao: "charge.dispute.created", detalhe: "aberta · fraudulent", centavos: 9990 }),
      linha({ id: 1, acao: "tipo.novo_da_stripe", quem: "RODADA" }),
    ],
  });
});

describe("Cobrança → O que aconteceu", () => {
  it("carregando", () => {
    adminOQueAconteceu.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<CobrancaOQueAconteceuPage />);
    expect(screen.getByText("Carregando…")).toBeTruthy();
  });

  it("erro: diz que não carregou, e 'tentar de novo' pede de novo", async () => {
    adminOQueAconteceu.mockRejectedValue(new Error("fora do ar"));
    renderWithProviders(<CobrancaOQueAconteceuPage />);
    expect((await screen.findByRole("alert")).textContent).toContain("Não foi possível carregar o que aconteceu.");
    adminOQueAconteceu.mockResolvedValue({ motivos: MOTIVOS, temMais: false, linhas: [] });
    fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(await screen.findByText("Nada registrado ainda.")).toBeTruthy();
  });

  it("os motivos com o texto que o aluno leu, e cada linha: quando, quem, o quê, o valor — e o aluno levando à ficha", async () => {
    renderWithProviders(<CobrancaOQueAconteceuPage />);
    expect(await screen.findByText("Está caro para mim agora: 2")).toBeTruthy();
    expect(screen.getByText("Já aprendi o que precisava: 1")).toBeTruthy();
    expect(screen.getByText("Assinatura mudou · ativa · vai cancelar no fim do período · motivo: Está caro para mim agora")).toBeTruthy();
    expect(screen.getByText("Contestação no banco · aberta · fraudulent · R$ 99,90")).toBeTruthy();
    expect(screen.getByText("tipo.novo_da_stripe")).toBeTruthy();
    expect(screen.getAllByText("20/11/2026, 12:30 · Stripe")).toHaveLength(2);
    expect(screen.getByText("20/11/2026, 12:30 · A rodada de hora em hora")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Ana Souza" }).getAttribute("href")).toBe("/admin/cobranca/assinaturas/ficha?conta=u-1");
  });

  it("as páginas: 'Próxima' pede a 2", async () => {
    adminOQueAconteceu.mockResolvedValue({ motivos: MOTIVOS, temMais: true, linhas: [linha({})] });
    renderWithProviders(<CobrancaOQueAconteceuPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Próxima" }));
    await waitFor(() => expect(adminOQueAconteceu).toHaveBeenLastCalledWith(2));
  });
});
