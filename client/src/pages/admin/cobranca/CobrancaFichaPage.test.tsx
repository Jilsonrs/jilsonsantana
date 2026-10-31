// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";
import type { AssinaturaDaLista, CobrancaDaFicha, FichaDaCobranca } from "@jilson/core";

type Quem = { conta: string } | { assinatura: number };
const adminFichaDaCobranca = vi.fn<(quem: Quem) => Promise<FichaDaCobranca>>();
vi.mock("@/lib/api", () => ({ adminFichaDaCobranca: (quem: Quem) => adminFichaDaCobranca(quem) }));

import { CobrancaFichaPage } from "./CobrancaFichaPage";

// ADMIN → COBRANÇA → A FICHA DO ALUNO (etapa 4.7b, passo 1d). O que estes testes protegem: a ficha pede QUEM o
// endereço diz (conta ou assinatura) e nada sem isso; os estados (carregando; a ficha que não existe, sem "tentar de
// novo"; a falha, com ele; a Stripe fora do ar, que mostra o resto); e o que cada parte diz — o acesso, a cobrança
// recusada com o motivo em português, a devolvida em parte com o valor, a contestada com o prazo, o recibo, o cartão,
// o CPF escondido e os e-mails que saíram e os que não saíram.

const ROTA = "/admin/cobranca/assinaturas/ficha";
const assinatura: AssinaturaDaLista = { id: 7, aluno: { id: "u-1", nome: "Ana Souza", email: "ana@exemplo.com" }, plano: "mensal", prePaga: false, situacao: "ativa", status: "active", pagoAte: "2026-11-20T15:00:00.000Z", acabaEm: null, codigo: null, deTeste: false, criadaEm: "2026-10-20T15:00:00.000Z" };
const cobranca = (extra: Partial<CobrancaDaFicha>): CobrancaDaFicha => ({ id: "ch_1", em: "2026-11-20T15:00:00.000Z", centavos: 9990, moeda: "brl", forma: "cartao", cartao: { bandeira: "visa", final: "4242" }, situacao: "paga", devolvido: 0, motivoDaFalha: null, recibo: null, contestacao: null, ...extra });
const ficha = (extra: Partial<FichaDaCobranca> = {}): FichaDaCobranca => ({
  conta: { id: "u-1", nome: "Ana Souza", email: "ana@exemplo.com", criadaEm: "2026-10-01T15:00:00.000Z" },
  temAcesso: true,
  assinaturas: [assinatura],
  cobrancas: [],
  maisCobrancas: false,
  cartao: { bandeira: "visa", final: "4242", mes: 1, ano: 2031 },
  documento: "CPF 529••••••25",
  emails: [],
  stripeIndisponivel: false,
  ...extra,
});
const abrir = (consulta = "?conta=u-1") => renderWithProviders(<CobrancaFichaPage />, { route: `${ROTA}${consulta}`, path: ROTA });

beforeEach(() => {
  adminFichaDaCobranca.mockReset().mockResolvedValue(ficha());
});

describe("a ficha — quem e os estados", () => {
  it("pede a conta ou a assinatura que o endereço diz", async () => {
    abrir();
    expect(await screen.findByRole("heading", { name: "Ana Souza" })).toBeTruthy();
    expect(adminFichaDaCobranca.mock.calls).toEqual([[{ conta: "u-1" }]]);
  });

  it("pela assinatura sem conta: pede a assinatura, e o título diz que ela está sem conta", async () => {
    adminFichaDaCobranca.mockResolvedValue(ficha({ conta: null, temAcesso: false }));
    abrir("?assinatura=7");
    expect(await screen.findByRole("heading", { name: "Assinatura sem conta" })).toBeTruthy();
    expect(screen.getByText("Sem acesso às aulas")).toBeTruthy();
    expect(adminFichaDaCobranca.mock.calls).toEqual([[{ assinatura: 7 }]]);
  });

  it("sem quem no endereço (ou com os dois): 'não achamos', sem pedir nada", () => {
    abrir("");
    expect(screen.getByRole("alert").textContent).toContain("Não achamos esta ficha.");
    abrir("?conta=u-1&assinatura=7");
    expect(adminFichaDaCobranca).not.toHaveBeenCalled();
  });

  it("carregando", () => {
    adminFichaDaCobranca.mockReturnValue(new Promise(() => {}));
    abrir();
    expect(screen.getByText("Carregando…")).toBeTruthy();
  });

  it("a ficha que não existe: 'não achamos', sem 'tentar de novo'", async () => {
    adminFichaDaCobranca.mockRejectedValue({ response: { data: { error: "NaoEncontrada" } } });
    abrir();
    expect((await screen.findByRole("alert")).textContent).toContain("Não achamos esta ficha.");
    expect(screen.queryByRole("button", { name: "Tentar de novo" })).toBeNull();
  });

  it("a falha: diz que não abriu, e 'tentar de novo' pede de novo", async () => {
    adminFichaDaCobranca.mockRejectedValue(new Error("fora do ar"));
    abrir();
    expect((await screen.findByRole("alert")).textContent).toContain("Não foi possível abrir a ficha.");
    adminFichaDaCobranca.mockResolvedValue(ficha());
    fireEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
    expect(await screen.findByRole("heading", { name: "Ana Souza" })).toBeTruthy();
  });

  it("a Stripe fora do ar: o resto aparece, e diz o que falta", async () => {
    adminFichaDaCobranca.mockResolvedValue(ficha({ stripeIndisponivel: true, cartao: null, documento: null }));
    abrir();
    expect((await screen.findByRole("status")).textContent).toContain("A Stripe não respondeu");
    expect(screen.getByText("As cobranças não aparecem agora: a Stripe não respondeu.")).toBeTruthy();
    expect(screen.getByText("Ativa")).toBeTruthy();
  });
});

describe("a ficha — o que ela diz", () => {
  it("o acesso, a conta, as cobranças com o que aconteceu, o recibo, o cartão, o CPF e os e-mails", async () => {
    adminFichaDaCobranca.mockResolvedValue(
      ficha({
        cobrancas: [
          cobranca({ id: "ch_falhou", situacao: "falhou", motivoDaFalha: "insufficient_funds" }),
          cobranca({ id: "ch_parte", situacao: "devolvida-em-parte", devolvido: 1000, recibo: "https://pay.stripe.com/receipts/x" }),
          cobranca({ id: "ch_contestada", situacao: "contestada", contestacao: { situacao: "needs_response", motivo: "fraudulent", prazo: "2026-11-25T15:00:00.000Z" } }),
          cobranca({ id: "ch_pix", forma: "pix", cartao: null, motivoDaFalha: "codigo_novo", situacao: "falhou" }),
        ],
        maisCobrancas: true,
        emails: [
          { tipo: "CONFIRMADA", em: "2026-10-20T15:00:00.000Z", saiu: true },
          { tipo: "COBRANCA_FALHOU", em: "2026-11-20T15:00:00.000Z", saiu: false },
        ],
      }),
    );
    abrir();
    expect(await screen.findByText("Com acesso às aulas")).toBeTruthy();
    expect(screen.getByText("ana@exemplo.com · conta criada em 01/10/2026")).toBeTruthy();
    expect(screen.getByText("Recusada: sem saldo ou sem limite")).toBeTruthy();
    expect(screen.getByText("Devolvida em parte (R$ 10,00)")).toBeTruthy();
    expect(screen.getByText("Contestada no banco: precisa de resposta · prazo 25/11/2026")).toBeTruthy();
    expect(screen.getByText("Recusada: recusado (codigo_novo)")).toBeTruthy();
    expect(screen.getAllByText("R$ 99,90 · 20/11/2026")).toHaveLength(4);
    expect(screen.getByRole("link", { name: "Ver recibo" }).getAttribute("href")).toBe("https://pay.stripe.com/receipts/x");
    expect(screen.getByText("Há cobranças mais antigas na Stripe que não aparecem aqui.")).toBeTruthy();
    expect(screen.getByText("visa •••• 4242 · vence 01/2031")).toBeTruthy();
    expect(screen.getByText("CPF 529••••••25")).toBeTruthy();
    expect(screen.getByText("Assinatura confirmada · saiu em 20/10/2026")).toBeTruthy();
    expect(screen.getByText("A cobrança falhou · não saiu")).toBeTruthy();
  });

  it("sem cobranças, sem cartão e sem e-mails: diz isso", async () => {
    adminFichaDaCobranca.mockResolvedValue(ficha({ cartao: null, documento: null }));
    abrir();
    expect(await screen.findByText("Nenhuma cobrança na Stripe.")).toBeTruthy();
    expect(screen.getByText("Nenhum cartão salvo.")).toBeTruthy();
    expect(screen.getByText("Não informado.")).toBeTruthy();
    expect(screen.getByText("Nenhum e-mail da cobrança para esta pessoa.")).toBeTruthy();
  });
});
