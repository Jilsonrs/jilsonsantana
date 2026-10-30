// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import type { AssinaturaCriada, CorpoDePixDaAtrasada, MinhaAssinatura, PlanosDaAssinatura } from "@jilson/core";
import { renderWithProviders } from "@/test-utils";
import type { Desfecho, PedidoDeCartao } from "@/lib/stripe-do-site";

const getMinhaAssinatura = vi.fn<() => Promise<MinhaAssinatura>>();
const getPlanosDaAssinatura = vi.fn<() => Promise<PlanosDaAssinatura>>();
const pagarAAtrasadaComPix = vi.fn<(corpo: CorpoDePixDaAtrasada) => Promise<AssinaturaCriada>>();
const avisarCampoQueNaoAbriu = vi.fn(async (_corpo: unknown) => undefined);
vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  avisarCampoQueNaoAbriu: (corpo: unknown) => avisarCampoQueNaoAbriu(corpo),
  getMinhaAssinatura: () => getMinhaAssinatura(),
  getPlanosDaAssinatura: () => getPlanosDaAssinatura(),
  pagarAAtrasadaComPix: (corpo: CorpoDePixDaAtrasada) => pagarAAtrasadaComPix(corpo),
}));

// A NOSSA fronteira com o Stripe.js vira dublê (nunca `@stripe/*`): o campo é um marcador que mostra com o que foi
// aberto, e o campo responde o que o teste mandar.
const validar = vi.fn<() => Promise<Desfecho>>();
const confirmar = vi.fn<(segredo: string, tipo: string, voltarPara: string, pagador?: { email: string }) => Promise<Desfecho>>();
vi.mock("@/lib/stripe-do-site", () => ({
  CartaoProvider: ({ pedido, children }: { pedido: PedidoDeCartao; children: ReactNode }) => (
    <div data-testid="campo" data-centavos={pedido.centavos} data-pix={pedido.pix?.configuracao ?? ""} data-chave={pedido.chavePublicavel}>
      {children}
    </div>
  ),
  CampoDoCartao: function CampoDeMentira({ aoFicarPronto }: { aoFicarPronto?: () => void }) {
    useEffect(() => aoFicarPronto?.(), []);
    return <div>campo do pix</div>;
  },
  useCartao: () => ({ validar: () => validar(), confirmar: (segredo: string, tipo: string, voltarPara: string, pagador?: { email: string }) => confirmar(segredo, tipo, voltarPara, pagador) }),
}));

import { PagarComPixPage } from "./PagarComPixPage";

// PAGAR COM PIX A COBRANÇA ATRASADA — a tela (Fase 4, etapa 4.9b, E14; textos aprovados pelo operador em 30/10/2026).
// O que estes testes protegem:
//   - carregando e falha; quem NÃO tem atrasada vai a Assinar (quem diz é o servidor);
//   - o texto aprovado, com o plano, o valor de AGORA (o dos planos, o mesmo que o servidor cobra) e o período;
//   - sem o Pix no ar: só a frase de erro, sem campo nem botão;
//   - o envio, na ordem: o CPF conferido → o campo → o servidor (só o CPF vai) → o QR com o segredo e o e-mail → concluído;
//   - cada recusa do servidor com a sua saída; nunca "concluído" numa falha;
//   - depois do clique, a tela não pula para Assinar mesmo que a assinatura releia "sem atrasada".

const CPF = "529.982.247-25";
const ATRASADA: MinhaAssinatura = {
  situacao: "atrasada",
  plano: "mensal",
  preco: { centavos: 8990, moeda: "brl" },
  proximaCobranca: null,
  acessoAte: null,
  cartao: null,
  aceitaCartao: true,
  podeParar: false,
  podeManter: false,
  terminaAoCancelar: true,
  reembolso: null,
  podeMudarDePlano: false,
  trocaMarcada: null,
  aulasAte: null,
  aulasTrancadas: true,
};
const PLANOS: PlanosDaAssinatura = {
  chavePublicavel: "pk_test_da_tela",
  planos: [
    { plano: "mensal", centavos: 9990, moeda: "brl" },
    { plano: "anual", centavos: 99500, moeda: "brl" },
  ],
  formasDePagamento: ["card"],
  pix: { configuracao: "pmc_so_pix" },
};
const PAGAR: AssinaturaCriada = { estado: "pagar", segredo: "pi_123_secret_x", tipo: "pix", email: "aluno@teste.local" };
const erroDoServidor = (codigo: string) => ({ response: { data: { error: codigo } } });

const abrir = () =>
  renderWithProviders(<PagarComPixPage />, {
    route: "/aluno/pagar-com-pix",
    path: "/aluno/pagar-com-pix",
    extraRoutes: [
      { path: "/aluno/assinar", element: <p>TELA DE ASSINAR</p> },
      { path: "/aluno/assinar/concluido", element: <p>TELA DE CONCLUÍDO</p> },
      { path: "/aluno/conta/faturamento", element: <p>TELA DO FATURAMENTO</p> },
    ],
  });
const preencherEGerar = async () => {
  fireEvent.change(await screen.findByLabelText(/CPF ou CNPJ/i), { target: { value: CPF } });
  fireEvent.click(screen.getByRole("button", { name: "Gerar o Pix" }));
};

beforeEach(() => {
  window.sessionStorage.clear();
  getMinhaAssinatura.mockReset().mockResolvedValue(ATRASADA);
  getPlanosDaAssinatura.mockReset().mockResolvedValue(PLANOS);
  pagarAAtrasadaComPix.mockReset().mockResolvedValue(PAGAR);
  validar.mockReset().mockResolvedValue({ ok: true });
  confirmar.mockReset().mockResolvedValue({ ok: true });
  avisarCampoQueNaoAbriu.mockClear();
});

describe("PagarComPixPage — o que aparece", () => {
  it("carregando: a frase de carregando, sem campo nem botão", () => {
    getMinhaAssinatura.mockReturnValue(new Promise(() => {}));
    abrir();
    expect(screen.getByText("Carregando…")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Gerar o Pix" })).toBeNull();
  });

  it("a leitura falhou: o erro, sem campo nem botão", async () => {
    getMinhaAssinatura.mockRejectedValue(new Error("rede"));
    abrir();
    expect((await screen.findByRole("alert")).textContent).toContain("Não foi possível carregar a sua assinatura");
    expect(screen.queryByRole("button", { name: "Gerar o Pix" })).toBeNull();
  });

  it("quem não tem cobrança atrasada vai a Assinar (o servidor diz)", async () => {
    getMinhaAssinatura.mockResolvedValue({ ...ATRASADA, situacao: "ativa" } as MinhaAssinatura);
    abrir();
    expect(await screen.findByText("TELA DE ASSINAR")).toBeTruthy();
    getMinhaAssinatura.mockResolvedValue({ situacao: "nenhuma" } as MinhaAssinatura);
    abrir();
    expect((await screen.findAllByText("TELA DE ASSINAR")).length).toBeGreaterThan(0);
  });

  it("o texto aprovado, com o plano, o valor de AGORA e o período — e o campo só de Pix", async () => {
    abrir();
    expect(await screen.findByText("Ao pagar com Pix, sua assinatura no cartão é encerrada agora e você paga o plano Mensal: R$ 99,90 por 1 mês. O acesso volta assim que o Pix for pago. O Pix não renova sozinho: quando acabar, é só pagar de novo.")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Pagar com Pix" })).toBeTruthy();
    const campo = screen.getByTestId("campo");
    expect([campo.dataset.centavos, campo.dataset.pix, campo.dataset.chave]).toEqual(["9990", "pmc_so_pix", "pk_test_da_tela"]);
  });

  it("o plano anual: o nome e o período do anual", async () => {
    getMinhaAssinatura.mockResolvedValue({ ...ATRASADA, plano: "anual" });
    abrir();
    expect(await screen.findByText(/você paga o plano Anual: R\$\s995,00 por 1 ano\./)).toBeTruthy();
  });

  it("sem o Pix no ar: só a frase de erro, sem campo nem botão", async () => {
    getPlanosDaAssinatura.mockResolvedValue({ ...PLANOS, pix: null });
    abrir();
    expect((await screen.findByRole("alert")).textContent).toContain("Não foi possível concluir a assinatura");
    expect(screen.queryByTestId("campo")).toBeNull();
    expect(screen.queryByRole("button", { name: "Gerar o Pix" })).toBeNull();
  });
});

describe("PagarComPixPage — gerar o Pix", () => {
  it("na ordem: o campo, o servidor (só o CPF vai), o QR com o segredo e o e-mail — e a tela de concluído", async () => {
    abrir();
    await preencherEGerar();
    expect(await screen.findByText("TELA DE CONCLUÍDO")).toBeTruthy();
    expect(pagarAAtrasadaComPix).toHaveBeenCalledWith({ documento: CPF });
    expect(confirmar).toHaveBeenCalledWith("pi_123_secret_x", "pix", "/aluno/assinar/concluido", { email: "aluno@teste.local" });
    expect(validar.mock.invocationCallOrder[0]).toBeLessThan(pagarAAtrasadaComPix.mock.invocationCallOrder[0] ?? 0);
    expect(pagarAAtrasadaComPix.mock.invocationCallOrder[0]).toBeLessThan(confirmar.mock.invocationCallOrder[0] ?? 0);
    // Guardado para a tela de concluído mostrar o QR de novo.
    expect(window.sessionStorage.getItem("jilson.assinar.pix")).toContain("pi_123_secret_x");
  });

  it("o CPF inválido: a frase no campo, e nada vai ao servidor", async () => {
    abrir();
    fireEvent.change(await screen.findByLabelText(/CPF ou CNPJ/i), { target: { value: "123" } });
    fireEvent.click(screen.getByRole("button", { name: "Gerar o Pix" }));
    expect(await screen.findByText("Confira o número: este CPF ou CNPJ não é válido.")).toBeTruthy();
    expect(validar).not.toHaveBeenCalled();
    expect(pagarAAtrasadaComPix).not.toHaveBeenCalled();
  });

  it("o campo do Pix não conferiu: a frase da Stripe, e NADA vai ao servidor (que encerraria a assinatura)", async () => {
    validar.mockResolvedValue({ ok: false, mensagem: "Preencha o campo." });
    abrir();
    await preencherEGerar();
    expect(await screen.findByText("Preencha o campo.")).toBeTruthy();
    expect(pagarAAtrasadaComPix).not.toHaveBeenCalled();
    expect(confirmar).not.toHaveBeenCalled();
  });

  it("a Stripe recusa o CPF: a frase no campo, sem QR", async () => {
    pagarAAtrasadaComPix.mockRejectedValue(erroDoServidor("DocumentoInvalido"));
    abrir();
    await preencherEGerar();
    expect(await screen.findByText("Confira o número: este CPF ou CNPJ não é válido.")).toBeTruthy();
    expect(confirmar).not.toHaveBeenCalled();
  });

  it("a cobrança já não está atrasada (pagou no meio): vai a Assinar; já tem acesso: vai ao Faturamento", async () => {
    pagarAAtrasadaComPix.mockRejectedValueOnce(erroDoServidor("NaoAtrasada"));
    abrir();
    await preencherEGerar();
    expect(await screen.findByText("TELA DE ASSINAR")).toBeTruthy();
    pagarAAtrasadaComPix.mockRejectedValueOnce(erroDoServidor("JaAssinante"));
    abrir();
    await preencherEGerar();
    expect(await screen.findByText("TELA DO FATURAMENTO")).toBeTruthy();
  });

  it("ocupada, o Pix em conferência e o QR que não abriu: a frase na tela, e nunca 'concluído'", async () => {
    pagarAAtrasadaComPix.mockRejectedValueOnce(erroDoServidor("Ocupada"));
    abrir();
    await preencherEGerar();
    expect(await screen.findByText("Aguarde um instante e tente novamente.")).toBeTruthy();

    pagarAAtrasadaComPix.mockRejectedValueOnce(erroDoServidor("PixEmConferencia"));
    fireEvent.click(screen.getByRole("button", { name: "Gerar o Pix" }));
    await waitFor(() => expect(pagarAAtrasadaComPix).toHaveBeenCalledTimes(2));
    expect((await screen.findByRole("alert")).textContent).not.toContain("Aguarde um instante");

    confirmar.mockResolvedValueOnce({ ok: false, mensagem: "O QR expirou." });
    fireEvent.click(screen.getByRole("button", { name: "Gerar o Pix" }));
    expect(await screen.findByText("O QR expirou.")).toBeTruthy();
    expect(screen.queryByText("TELA DE CONCLUÍDO")).toBeNull();
  });

  it("depois do clique, a assinatura relida sem atrasada não tira a pessoa do QR", async () => {
    let soltar: (resposta: AssinaturaCriada) => void = () => {};
    pagarAAtrasadaComPix.mockReturnValue(new Promise((resolve) => (soltar = resolve)));
    confirmar.mockReturnValue(new Promise(() => {}));
    const { queryClient } = abrir();
    await preencherEGerar();
    await waitFor(() => expect(pagarAAtrasadaComPix).toHaveBeenCalledTimes(1));
    // O servidor já encerrou a atrasada: a releitura diz "terminada".
    getMinhaAssinatura.mockResolvedValue({ situacao: "terminada", terminouEm: null } as MinhaAssinatura);
    await queryClient.invalidateQueries();
    soltar(PAGAR);
    await waitFor(() => expect(confirmar).toHaveBeenCalledTimes(1));
    expect(screen.queryByText("TELA DE ASSINAR")).toBeNull();
    expect((screen.getByRole("button", { name: "Processando…" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
