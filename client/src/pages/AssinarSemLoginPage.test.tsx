// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { ReactNode } from "react";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { AxiosError, AxiosHeaders } from "axios";
import type { AssinaturaSemLogin, PlanosDaAssinatura } from "@jilson/core";
import { renderWithProviders } from "@/test-utils";
import type { Desfecho, PedidoDeCartao } from "@/lib/stripe-do-site";

const getPlanosSemLogin = vi.fn();
const getPreviaSemLogin = vi.fn();
const getPreviaDaAssinatura = vi.fn();
const assinarSemLogin = vi.fn();
const pagarComPixSemLogin = vi.fn();
const criarAssinatura = vi.fn();
vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  getPlanosSemLogin: (...args: unknown[]) => getPlanosSemLogin(...args),
  getPreviaSemLogin: (...args: unknown[]) => getPreviaSemLogin(...args),
  getPreviaDaAssinatura: (...args: unknown[]) => getPreviaDaAssinatura(...args),
  assinarSemLogin: (...args: unknown[]) => assinarSemLogin(...args),
  pagarComPixSemLogin: (...args: unknown[]) => pagarComPixSemLogin(...args),
  criarAssinatura: (...args: unknown[]) => criarAssinatura(...args),
}));
// A NOSSA fronteira com o Stripe.js vira dublê (nunca `@stripe/*`), como no teste da tela logada.
const validar = vi.fn<() => Promise<Desfecho>>();
const confirmar = vi.fn<(segredo: string, tipo: string, voltarPara: string, pagador?: { email: string }) => Promise<Desfecho>>();
vi.mock("@/lib/stripe-do-site", () => ({
  CartaoProvider: ({ pedido, children }: { pedido: PedidoDeCartao; children: ReactNode }) => (
    <div data-testid="cartao" data-centavos={pedido.centavos} data-pix={pedido.pix?.configuracao ?? ""}>
      {children}
    </div>
  ),
  CampoDoCartao: () => <div>campo do cartão</div>,
  useCartao: () => ({ validar: () => validar(), confirmar: (segredo: string, tipo: string, voltarPara: string, pagador?: { email: string }) => (pagador ? confirmar(segredo, tipo, voltarPara, pagador) : confirmar(segredo, tipo, voltarPara)) }),
}));

import { navegador } from "@/lib/versao";
import { esquecerPix, lerPix } from "@/lib/pix-pendente";
import { lerTentativa, esquecerTentativa } from "@/lib/tentativa-de-assinar";
import { AssinarSemLoginPage } from "./AssinarSemLoginPage";

// A TELA PÚBLICA DE ASSINAR, a parte do app (etapa 4.7, passos 6c e 6e). O que estes testes protegem:
//   - os planos e a prévia vêm das rotas SEM LOGIN (o visitante não tem sessão), com o Mensal marcado;
//   - carregando, erro e "sem planos" — nunca uma tela em branco;
//   - o visitante diz o e-mail (com "Já tem conta? Entrar", que volta à tela de assinar do app), o
//     CPF ou CNPJ e as novidades (desmarcada); errado, nada vai ao servidor nem ao cartão;
//   - A TENTATIVA (ela abre a conta): guardada só na memória e no `sessionStorage`, ANTES de o cartão
//     confirmar; nunca no endereço de volta da Stripe; a do mesmo e-mail segue no novo clique;
//   - depois do pagamento, a tela de concluído carrega inteira (página do servidor);
//   - as recusas das rotas do visitante: o e-mail que já tem conta, o mesmo e-mail noutra aba,
//     muita gente ao mesmo tempo, e o CPF que a Stripe recusou.

const PLANOS: PlanosDaAssinatura = {
  chavePublicavel: "pk_test_da_tela",
  planos: [
    { plano: "mensal", centavos: 9990, moeda: "brl" },
    { plano: "anual", centavos: 99500, moeda: "brl" },
  ],
  formasDePagamento: ["card"],
};
const TENTATIVA = "TentativaDoServidor_24bytesAAAAAA";
const PAGAR: AssinaturaSemLogin = { estado: "pagar", segredo: "pi_1_secret_x", tipo: "pagamento", tentativa: TENTATIVA };
// O Pix pré-pago no ar (etapa 4.9): o servidor manda a configuração só-Pix.
const COM_PIX: PlanosDaAssinatura = { ...PLANOS, pix: { configuracao: "pmc_so_pix" } };
const PAGAR_PIX: AssinaturaSemLogin = { estado: "pagar", segredo: "pi_pix_secret_x", tipo: "pix", tentativa: TENTATIVA, email: "visitante@exemplo.com" };
const EMAIL = "Visitante@Exemplo.com";
const CPF = "529.982.247-25";
const erroDoServidor = (codigo: string, status = 409) =>
  new AxiosError("erro", "ERR_BAD_REQUEST", undefined, undefined, { status, statusText: "", headers: {}, config: { headers: new AxiosHeaders() }, data: { error: codigo } });

let ir: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  for (const f of [getPlanosSemLogin, getPreviaSemLogin, getPreviaDaAssinatura, assinarSemLogin, pagarComPixSemLogin, criarAssinatura, validar, confirmar]) f.mockReset();
  getPlanosSemLogin.mockResolvedValue(PLANOS);
  assinarSemLogin.mockResolvedValue(PAGAR);
  pagarComPixSemLogin.mockResolvedValue(PAGAR_PIX);
  esquecerPix();
  validar.mockResolvedValue({ ok: true });
  confirmar.mockResolvedValue({ ok: true });
  ir = vi.spyOn(navegador, "ir").mockImplementation(() => {});
  esquecerTentativa();
  window.localStorage.clear();
});
afterEach(() => vi.restoreAllMocks());

const abrir = () => renderWithProviders(<AssinarSemLoginPage />);
const preencher = ({ email = EMAIL, documento = CPF } = {}) => {
  fireEvent.change(screen.getByLabelText("Seu e-mail"), { target: { value: email } });
  fireEvent.change(screen.getByLabelText("CPF ou CNPJ"), { target: { value: documento } });
};
const assinar = () => fireEvent.click(screen.getByRole("button", { name: "Assinar" }));

describe("a tela pública de assinar — os planos", () => {
  it("enquanto os planos não chegam: Carregando…", () => {
    getPlanosSemLogin.mockReturnValue(new Promise(() => {}));
    abrir();
    expect(screen.getByText("Carregando…")).toBeTruthy();
  });

  it("os dois planos, da rota sem login, com o Mensal marcado", async () => {
    abrir();
    const mensal = (await screen.findByRole("radio", { name: /Mensal/ })) as HTMLInputElement;
    expect([mensal.checked, (screen.getByRole("radio", { name: /Anual/ }) as HTMLInputElement).checked]).toEqual([true, false]);
    expect(getPlanosSemLogin).toHaveBeenCalledTimes(1);
  });

  it("a leitura falhou, ou não há planos: o aviso — nunca a tela em branco", async () => {
    getPlanosSemLogin.mockRejectedValue(new Error("fora do ar"));
    const { unmount } = abrir();
    expect((await screen.findByRole("alert")).textContent).toBe("Não foi possível carregar os planos. Tente de novo.");
    unmount();
    getPlanosSemLogin.mockResolvedValue({ ...PLANOS, planos: [] });
    abrir();
    expect((await screen.findByRole("alert")).textContent).toBe("Não foi possível carregar os planos. Tente de novo.");
  });

  it("o código promocional é conferido pela rota SEM LOGIN", async () => {
    getPreviaSemLogin.mockResolvedValue({ centavosHoje: 4995, moeda: "brl", desconto: { percentual: 50, centavos: null, duracao: "uma-vez", meses: null } });
    abrir();
    fireEvent.change(await screen.findByLabelText("Código promocional"), { target: { value: "METADE" } });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));
    await waitFor(() => expect(getPreviaSemLogin).toHaveBeenCalledWith({ plano: "mensal", codigo: "METADE" }));
    expect(getPreviaDaAssinatura).not.toHaveBeenCalled();
  });
});

describe("a tela pública de assinar — os dados do visitante", () => {
  it("o e-mail, com \"Já tem conta? Entrar\" que volta à tela de assinar do app; e as novidades DESMARCADAS", async () => {
    abrir();
    expect(await screen.findByLabelText("Seu e-mail")).toBeTruthy();
    expect(screen.getByText("É com ele que você entra na escola.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Entrar" }).getAttribute("href")).toBe("/login?depois=assinar");
    expect((screen.getByRole("checkbox", { name: "Quero receber novidades e ofertas da escola por e-mail." }) as HTMLInputElement).checked).toBe(false);
  });

  it("e-mail que não é e-mail: o aviso embaixo dele — e nada vai ao cartão nem ao servidor", async () => {
    abrir();
    await screen.findByLabelText("Seu e-mail");
    preencher({ email: "nao-e-email" });
    assinar();
    expect((await screen.findByRole("alert")).textContent).toBe("Informe um e-mail válido.");
    expect(screen.getByLabelText("Seu e-mail").getAttribute("aria-invalid")).toBe("true");
    expect(validar).not.toHaveBeenCalled();
    expect(assinarSemLogin).not.toHaveBeenCalled();
  });
});

describe("a tela pública de assinar — o envio e a tentativa", () => {
  it("assina pela rota SEM LOGIN, guarda a tentativa ANTES de o cartão confirmar, volta sem ela no endereço, e carrega a tela de concluído", async () => {
    let guardadaAntesDoCartao: unknown = null;
    confirmar.mockImplementation(async () => ((guardadaAntesDoCartao = lerTentativa()), { ok: true }));
    abrir();
    await screen.findByLabelText("Seu e-mail");
    preencher();
    assinar();
    await waitFor(() => expect(ir).toHaveBeenCalledWith("/assinar/concluido"));
    expect(assinarSemLogin).toHaveBeenCalledWith({ email: EMAIL, documento: CPF, plano: "mensal", novidades: false });
    expect(criarAssinatura).not.toHaveBeenCalled();
    expect(guardadaAntesDoCartao).toEqual({ tentativa: TENTATIVA, email: EMAIL });
    expect(JSON.parse(window.sessionStorage.getItem("jilson.assinar.tentativa") ?? "null")).toEqual({ tentativa: TENTATIVA, email: EMAIL });
    // O endereço de volta da Stripe NUNCA leva a tentativa.
    expect(confirmar).toHaveBeenCalledWith("pi_1_secret_x", "pagamento", "/assinar/concluido");
    expect(confirmar.mock.calls.flat().join(" ")).not.toContain(TENTATIVA);
  });

  it("as novidades marcadas e a origem guardada (o YouTube) vão no pedido", async () => {
    window.localStorage.setItem("jilson.attribution", JSON.stringify({ source: "youtube", campaign: "video-excel", capturedAt: "2026-10-27T00:00:00Z" }));
    abrir();
    await screen.findByLabelText("Seu e-mail");
    preencher();
    fireEvent.click(screen.getByRole("checkbox", { name: "Quero receber novidades e ofertas da escola por e-mail." }));
    assinar();
    await waitFor(() => expect(assinarSemLogin).toHaveBeenCalledWith({ email: EMAIL, documento: CPF, plano: "mensal", novidades: true, origem: "youtube", campanha: "video-excel" }));
  });

  it("o cartão recusado e um novo clique: a tentativa do MESMO e-mail segue — a de outro e-mail, não", async () => {
    confirmar.mockResolvedValueOnce({ ok: false, mensagem: "Cartão recusado." });
    abrir();
    await screen.findByLabelText("Seu e-mail");
    preencher();
    assinar();
    expect((await screen.findByRole("alert")).textContent).toBe("Cartão recusado.");
    assinar();
    await waitFor(() => expect(assinarSemLogin).toHaveBeenCalledTimes(2));
    expect(assinarSemLogin.mock.calls[1]?.[0]).toMatchObject({ email: EMAIL, tentativa: TENTATIVA });

    preencher({ email: "outra@exemplo.com" });
    assinar();
    await waitFor(() => expect(assinarSemLogin).toHaveBeenCalledTimes(3));
    expect(assinarSemLogin.mock.calls[2]?.[0]).not.toHaveProperty("tentativa");
  });

  it("o e-mail que já tem conta: o aviso embaixo do e-mail — e o cartão não confirma", async () => {
    assinarSemLogin.mockRejectedValue(erroDoServidor("JaTemConta"));
    abrir();
    await screen.findByLabelText("Seu e-mail");
    preencher();
    assinar();
    expect((await screen.findByRole("alert")).textContent).toBe("Este e-mail já tem conta. Entre para assinar.");
    expect(screen.getByLabelText("Seu e-mail").getAttribute("aria-invalid")).toBe("true");
    expect(confirmar).not.toHaveBeenCalled();
    expect(lerTentativa()).toBeNull();
  });

  it("o mesmo e-mail em outra aba, e muita gente ao mesmo tempo: as frases de esperar", async () => {
    assinarSemLogin.mockRejectedValueOnce(erroDoServidor("Ocupada")).mockRejectedValueOnce(erroDoServidor("MuitosAoMesmoTempo"));
    abrir();
    await screen.findByLabelText("Seu e-mail");
    preencher();
    assinar();
    expect((await screen.findByRole("alert")).textContent).toBe("Este e-mail já tem uma assinatura em andamento em outra aba. Termine por lá ou aguarde um instante.");
    assinar();
    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("Aguarde um instante e tente novamente."));
  });

  it("o CPF que a Stripe recusou: o aviso embaixo do campo", async () => {
    assinarSemLogin.mockRejectedValue(erroDoServidor("DocumentoInvalido", 400));
    abrir();
    await screen.findByLabelText("Seu e-mail");
    preencher();
    assinar();
    expect((await screen.findByRole("alert")).textContent).toBe("Confira o número: este CPF ou CNPJ não é válido.");
    expect(screen.getByLabelText("CPF ou CNPJ").getAttribute("aria-invalid")).toBe("true");
  });
});

// O PIX PRÉ-PAGO sem conta (etapa 4.9, passo 2b): a mesma escolha da tela logada, pelas rotas do visitante.
describe("a tela pública de assinar — o Pix pré-pago", () => {
  const escolherPix = async () => fireEvent.click(await screen.findByRole("radio", { name: /^Pix/ }));

  it("pede pela rota do visitante com e-mail, CPF, plano e novidades — sem código —, guarda a tentativa e o segredo do Pix ANTES de confirmar, confirma com o tipo pix, e carrega a tela de concluído", async () => {
    getPlanosSemLogin.mockResolvedValue(COM_PIX);
    let guardados: unknown = null;
    confirmar.mockImplementation(async () => ((guardados = [lerTentativa(), lerPix()]), { ok: true }));
    abrir();
    await screen.findByLabelText("Seu e-mail");
    preencher();
    await escolherPix();
    expect(screen.queryByLabelText("Código promocional")).toBeNull();
    expect(screen.getByTestId("cartao").dataset.pix).toBe("pmc_so_pix");
    fireEvent.click(screen.getByRole("button", { name: "Pagar com Pix" }));
    await waitFor(() => expect(ir).toHaveBeenCalledWith("/assinar/concluido"));
    expect(pagarComPixSemLogin).toHaveBeenCalledWith({ email: EMAIL, documento: CPF, plano: "mensal", novidades: false });
    expect(assinarSemLogin).not.toHaveBeenCalled();
    expect(guardados).toEqual([
      { tentativa: TENTATIVA, email: EMAIL },
      { segredo: "pi_pix_secret_x", chavePublicavel: "pk_test_da_tela" },
    ]);
    // O e-mail de quem paga vai na confirmação — o que o SERVIDOR devolveu (em minúsculas), nunca o digitado (P113).
    expect(confirmar).toHaveBeenCalledWith("pi_pix_secret_x", "pix", "/assinar/concluido", { email: "visitante@exemplo.com" });
    expect(confirmar.mock.calls.flat().join(" ")).not.toContain(TENTATIVA);
  });

  it("o novo clique do mesmo e-mail segue com a tentativa (o servidor devolve o mesmo QR)", async () => {
    getPlanosSemLogin.mockResolvedValue(COM_PIX);
    confirmar.mockResolvedValueOnce({ ok: false, mensagem: null });
    abrir();
    await screen.findByLabelText("Seu e-mail");
    preencher();
    await escolherPix();
    fireEvent.click(screen.getByRole("button", { name: "Pagar com Pix" }));
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "Pagar com Pix" }));
    await waitFor(() => expect(pagarComPixSemLogin).toHaveBeenCalledTimes(2));
    expect(pagarComPixSemLogin.mock.calls[1]?.[0]).toMatchObject({ email: EMAIL, tentativa: TENTATIVA });
  });

  it("sem o Pix no ar (os planos sem `pix`): a escolha não aparece, e tudo segue pelo cartão", async () => {
    abrir();
    await screen.findByLabelText("Seu e-mail");
    expect(screen.queryByText("Como você quer pagar?")).toBeNull();
    expect(screen.getByTestId("cartao").dataset.pix).toBe("");
  });
});
