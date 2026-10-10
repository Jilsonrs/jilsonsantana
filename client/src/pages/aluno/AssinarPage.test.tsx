// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import type { AssinaturaCriada, PlanosDaAssinatura, PreviaDaAssinatura } from "@jilson/core";
import { renderWithProviders } from "@/test-utils";
import type { Desfecho, PedidoDeCartao } from "@/lib/stripe-do-site";

const getPlanosDaAssinatura = vi.fn();
const getPreviaDaAssinatura = vi.fn();
const criarAssinatura = vi.fn();
const getSituacaoDaAssinatura = vi.fn();
vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  getPlanosDaAssinatura: (...args: unknown[]) => getPlanosDaAssinatura(...args),
  getPreviaDaAssinatura: (...args: unknown[]) => getPreviaDaAssinatura(...args),
  criarAssinatura: (...args: unknown[]) => criarAssinatura(...args),
  getSituacaoDaAssinatura: (...args: unknown[]) => getSituacaoDaAssinatura(...args),
}));

// A NOSSA fronteira com o Stripe.js vira dublê (nunca `@stripe/*`): o campo é um marcador que
// mostra com o que foi aberto, e o cartão responde o que o teste mandar.
const validar = vi.fn<() => Promise<Desfecho>>();
const confirmar = vi.fn<(segredo: string, tipo: string, voltarPara: string) => Promise<Desfecho>>();
vi.mock("@/lib/stripe-do-site", () => ({
  CartaoProvider: ({ pedido, children }: { pedido: PedidoDeCartao; children: ReactNode }) => (
    <div data-testid="cartao" data-centavos={pedido.centavos} data-moeda={pedido.moeda} data-formas={pedido.formasDePagamento.join(",")} data-chave={pedido.chavePublicavel} data-idioma={pedido.idioma}>
      {children}
    </div>
  ),
  CampoDoCartao: () => <div>campo do cartão</div>,
  useCartao: () => ({ validar: () => validar(), confirmar: (segredo: string, tipo: string, voltarPara: string) => confirmar(segredo, tipo, voltarPara) }),
}));

import { AssinarPage } from "./AssinarPage";

// ASSINAR COM A CONTA LOGADA (Fase 4, etapa 4.2). O que estes testes protegem:
//   - carregando, erro e "já é assinante" (quem já assina não vê formulário);
//   - o valor na tela é o que o SERVIDOR mandou, e o campo do cartão abre com ele; cada plano diz
//     o preço e como é cobrado, e o anual leva o selo do desconto, CALCULADO dos dois preços;
//   - "Hoje você paga" só aparece com código promocional (sem código, repetia o preço do plano);
//   - o código promocional: o valor de hoje é o da prévia do servidor; código que não vale
//     avisa e não muda nada; com 100% PARA SEMPRE o cartão some — e só nesse caso;
//   - o envio, na ordem: confere o cartão → cria no servidor (só plano e código) → confirma com
//     o segredo → vai para a tela de concluído; qualquer falha fica na tela, com a frase;
//   - dois cliques, um pedido.

const PLANOS: PlanosDaAssinatura = {
  chavePublicavel: "pk_test_da_tela",
  planos: [
    { plano: "mensal", centavos: 9990, moeda: "brl" },
    { plano: "anual", centavos: 99500, moeda: "brl" },
  ],
  formasDePagamento: ["card"],
};
const CEM_PARA_SEMPRE: PreviaDaAssinatura = { centavosHoje: 0, moeda: "brl", desconto: { percentual: 100, centavos: null, duracao: "para-sempre", meses: null } };
const PAGAR: AssinaturaCriada = { estado: "pagar", segredo: "pi_1_secret_x", tipo: "pagamento" };
const erroDoServidor = (codigo: string) => ({ response: { data: { error: codigo } } });

beforeEach(() => {
  getSituacaoDaAssinatura.mockReset().mockResolvedValue({ temAcesso: false });
  getPlanosDaAssinatura.mockReset().mockResolvedValue(PLANOS);
  getPreviaDaAssinatura.mockReset().mockResolvedValue(CEM_PARA_SEMPRE);
  criarAssinatura.mockReset().mockResolvedValue(PAGAR);
  validar.mockReset().mockResolvedValue({ ok: true });
  confirmar.mockReset().mockResolvedValue({ ok: true });
});

const abrir = () =>
  renderWithProviders(<AssinarPage />, {
    route: "/aluno/assinar",
    extraRoutes: [
      { path: "/aluno/assinar/concluido", element: <p>tela de concluído</p> },
      { path: "/inicio", element: <p>tela de início</p> },
    ],
  });
/** O texto da tela, com o espaço do "R$ 99,90" (que não quebra linha) trocado por um comum. */
const naTela = () => (document.body.textContent ?? "").replace(/ /g, " ");
const cartao = () => screen.queryByTestId("cartao");
const assinar = () => fireEvent.click(screen.getByRole("button", { name: "Assinar" }));
async function aplicar(codigo: string) {
  fireEvent.change(await screen.findByLabelText("Código promocional"), { target: { value: codigo } });
  fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));
}

describe("AssinarPage — estados", () => {
  it("carregando", () => {
    getSituacaoDaAssinatura.mockReturnValue(new Promise(() => {}));
    abrir();
    expect(screen.getByRole("heading", { level: 1, name: "Assinar" })).toBeTruthy();
    expect(screen.getByText("Carregando…")).toBeTruthy();
    expect(cartao()).toBeNull();
  });

  it("erro ao carregar os planos: avisa, e não há formulário", async () => {
    getPlanosDaAssinatura.mockRejectedValue(new Error("rede"));
    abrir();
    expect((await screen.findByRole("alert")).textContent).toBe("Não foi possível carregar os planos. Tente de novo.");
    expect(screen.queryByRole("radio")).toBeNull();
    expect(cartao()).toBeNull();
  });

  it("não deu para saber se já assina: avisa, e não há formulário", async () => {
    getSituacaoDaAssinatura.mockRejectedValue(new Error("rede"));
    abrir();
    expect((await screen.findByRole("alert")).textContent).toBe("Não foi possível carregar os planos. Tente de novo.");
    expect(screen.queryByRole("radio")).toBeNull();
  });

  it("quem já é assinante: o aviso e o caminho para o Início — sem formulário, e os planos nem são pedidos", async () => {
    getSituacaoDaAssinatura.mockResolvedValue({ temAcesso: true });
    abrir();
    expect(await screen.findByText("Você já é assinante.")).toBeTruthy();
    expect(screen.queryByRole("radio")).toBeNull();
    expect(cartao()).toBeNull();
    expect(getPlanosDaAssinatura).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("link", { name: "Ir para o Início" }));
    expect(await screen.findByText("tela de início")).toBeTruthy();
  });
});

describe("AssinarPage — o plano e o valor", () => {
  it("os dois planos com o valor do servidor; o mensal vem marcado, e o cartão abre com o valor dele", async () => {
    abrir();
    const mensal = (await screen.findByRole("radio", { name: /Mensal/ })) as HTMLInputElement;
    const anual = screen.getByRole("radio", { name: /Anual/ }) as HTMLInputElement;
    expect(mensal.checked).toBe(true);
    expect(anual.checked).toBe(false);
    // Cada cartão diz o preço e como é cobrado; o anual leva o selo do desconto.
    expect(mensal.closest("label")?.textContent?.replace(/\u00a0/g, " ")).toBe("MensalR$ 99,90/mêsCobrado todo mês");
    expect(anual.closest("label")?.textContent?.replace(/\u00a0/g, " ")).toBe("Anual17% de descontoR$ 995,00/anoCobrado uma vez por anoequivale a R$ 82,92 por mês");
    // Sem código promocional, o valor não é repetido num bloco à parte.
    expect(naTela()).not.toContain("Hoje você paga");
    expect(cartao()?.dataset).toMatchObject({ centavos: "9990", moeda: "brl", formas: "card", chave: "pk_test_da_tela", idioma: "pt" });
    expect(screen.getByText("campo do cartão")).toBeTruthy();
  });

  it("escolher o anual: ele fica marcado, e o cartão passa a abrir com o valor dele", async () => {
    abrir();
    const anual = (await screen.findByRole("radio", { name: /Anual/ })) as HTMLInputElement;
    fireEvent.click(anual);
    expect(anual.checked).toBe(true);
    expect((screen.getByRole("radio", { name: /Mensal/ }) as HTMLInputElement).checked).toBe(false);
    expect(cartao()?.dataset.centavos).toBe("99500");
  });
});

describe("AssinarPage — o selo do desconto do anual", () => {
  const comPrecos = (mensal: number, anual: number) =>
    getPlanosDaAssinatura.mockResolvedValue({ ...PLANOS, planos: [{ plano: "mensal", centavos: mensal, moeda: "brl" }, { plano: "anual", centavos: anual, moeda: "brl" }] });

  it("é CALCULADO dos dois preços do servidor, não um texto fixo", async () => {
    comPrecos(10000, 90000);
    abrir();
    await screen.findByRole("radio", { name: /Anual/ });
    expect(naTela()).toContain("25% de desconto");
    expect(naTela()).not.toContain("17% de desconto");
  });

  it("anual que não sai mais barato que doze mensais: sem selo", async () => {
    comPrecos(10000, 120000);
    abrir();
    await screen.findByRole("radio", { name: /Anual/ });
    expect(naTela()).not.toContain("de desconto");
  });

  it("o selo fica só no anual", async () => {
    abrir();
    const mensal = await screen.findByRole("radio", { name: /Mensal/ });
    expect(mensal.closest("label")?.textContent).not.toContain("de desconto");
  });
});

describe("AssinarPage — o código promocional", () => {
  it("100% para sempre: pede a prévia com o plano e o código aparado; hoje R$ 0,00; e o cartão SOME", async () => {
    abrir();
    await aplicar("  TESTE100 ");
    expect(await screen.findByText("TESTE100")).toBeTruthy();
    expect(getPreviaDaAssinatura).toHaveBeenCalledWith({ plano: "mensal", codigo: "TESTE100" });
    expect(naTela()).toContain("Hoje você pagaR$ 0,00");
    expect(naTela()).toContain("100% de desconto em todas as cobranças");
    expect(cartao()).toBeNull();
    expect(screen.getByRole("button", { name: "Assinar" })).toBeTruthy();
  });

  it("código que não vale: avisa, e o valor e o cartão continuam os mesmos", async () => {
    getPreviaDaAssinatura.mockRejectedValue(erroDoServidor("CodigoInvalido"));
    abrir();
    await aplicar("NAOEXISTE");
    expect((await screen.findByRole("alert")).textContent).toBe("Este código não é válido.");
    expect(naTela()).not.toContain("Hoje você paga");
    expect(cartao()?.dataset.centavos).toBe("9990");
    expect(screen.getByLabelText("Código promocional").getAttribute("aria-invalid")).toBe("true");
  });

  it("remover o código: voltam o valor cheio e o cartão", async () => {
    abrir();
    await aplicar("TESTE100");
    fireEvent.click(await screen.findByRole("button", { name: "Remover" }));
    expect(naTela()).not.toContain("Hoje você paga");
    expect(naTela()).not.toContain("100% de desconto em todas as cobranças");
    expect(cartao()?.dataset.centavos).toBe("9990");
    expect(screen.getByLabelText("Código promocional")).toBeTruthy();
  });

  it("100% só na PRIMEIRA cobrança: nada hoje, mas o cartão continua (a cobrança seguinte precisa dele)", async () => {
    getPreviaDaAssinatura.mockResolvedValue({ centavosHoje: 0, moeda: "brl", desconto: { percentual: 100, centavos: null, duracao: "uma-vez", meses: null } });
    abrir();
    await aplicar("PRIMEIRA");
    expect(await screen.findByText("PRIMEIRA")).toBeTruthy();
    expect(naTela()).toContain("100% de desconto na primeira cobrança");
    expect(cartao()?.dataset.centavos).toBe("0");
  });

  it("desconto parcial: o cartão abre com o valor JÁ com o desconto", async () => {
    getPreviaDaAssinatura.mockResolvedValue({ centavosHoje: 4995, moeda: "brl", desconto: { percentual: 50, centavos: null, duracao: "por-meses", meses: 3 } });
    abrir();
    await aplicar("METADE");
    expect(await screen.findByText("METADE")).toBeTruthy();
    expect(naTela()).toContain("Hoje você pagaR$ 49,95");
    expect(naTela()).toContain("50% de desconto por 3 meses");
    expect(cartao()?.dataset.centavos).toBe("4995");
  });

  it("trocar de plano com o código aplicado: a prévia é pedida de novo, para o plano novo", async () => {
    abrir();
    await aplicar("TESTE100");
    await screen.findByText("TESTE100");
    fireEvent.click(screen.getByRole("radio", { name: /Anual/ }));
    await waitFor(() => expect(getPreviaDaAssinatura).toHaveBeenCalledWith({ plano: "anual", codigo: "TESTE100" }));
  });
});

describe("AssinarPage — o envio", () => {
  it("no cartão: confere o cartão → cria com SÓ o plano → confirma com o segredo do servidor → tela de concluído", async () => {
    const ordem: string[] = [];
    validar.mockImplementation(async () => (ordem.push("confere"), { ok: true }));
    criarAssinatura.mockImplementation(async () => (ordem.push("cria"), PAGAR));
    confirmar.mockImplementation(async () => (ordem.push("confirma"), { ok: true }));
    abrir();
    fireEvent.click(await screen.findByRole("radio", { name: /Anual/ }));
    assinar();
    expect(await screen.findByText("tela de concluído")).toBeTruthy();
    expect(ordem).toEqual(["confere", "cria", "confirma"]);
    expect(criarAssinatura).toHaveBeenCalledWith({ plano: "anual" });
    expect(confirmar).toHaveBeenCalledWith("pi_1_secret_x", "pagamento", "/aluno/assinar/concluido");
  });

  it("cartão incompleto: mostra a frase, e NADA é criado no servidor", async () => {
    validar.mockResolvedValue({ ok: false, mensagem: "O número do cartão está incompleto." });
    abrir();
    await screen.findByRole("radio", { name: /Mensal/ });
    assinar();
    expect((await screen.findByRole("alert")).textContent).toBe("O número do cartão está incompleto.");
    expect(criarAssinatura).not.toHaveBeenCalled();
    expect(screen.queryByText("tela de concluído")).toBeNull();
  });

  it("cartão recusado: a frase da Stripe, continua na tela, e o botão volta para tentar de novo", async () => {
    confirmar.mockResolvedValue({ ok: false, mensagem: "Seu cartão foi recusado." });
    abrir();
    await screen.findByRole("radio", { name: /Mensal/ });
    assinar();
    expect((await screen.findByRole("alert")).textContent).toBe("Seu cartão foi recusado.");
    expect(screen.queryByText("tela de concluído")).toBeNull();
    const botao = screen.getByRole("button", { name: "Assinar" }) as HTMLButtonElement;
    expect(botao.disabled).toBe(false);
  });

  it("falha sem frase para o aluno (a Stripe não carregou): a frase da escola", async () => {
    validar.mockResolvedValue({ ok: false, mensagem: null });
    abrir();
    await screen.findByRole("radio", { name: /Mensal/ });
    assinar();
    expect((await screen.findByRole("alert")).textContent).toBe("Não foi possível concluir a assinatura. Confira os dados e tente de novo.");
  });

  it("com o código de 100%: cria com o plano E o código, sem cartão, e vai para a tela de concluído", async () => {
    criarAssinatura.mockResolvedValue({ estado: "ativa" });
    abrir();
    await aplicar("TESTE100");
    await screen.findByText("TESTE100");
    assinar();
    expect(await screen.findByText("tela de concluído")).toBeTruthy();
    expect(criarAssinatura).toHaveBeenCalledWith({ plano: "mensal", codigo: "TESTE100" });
    expect(validar).not.toHaveBeenCalled();
    expect(confirmar).not.toHaveBeenCalled();
  });

  it("o servidor pede pagamento e a tela estava sem cartão: avisa, e NÃO vai para a tela de concluído", async () => {
    abrir();
    await aplicar("TESTE100");
    await screen.findByText("TESTE100");
    assinar();
    expect((await screen.findByRole("alert")).textContent).toBe("Não foi possível concluir a assinatura. Confira os dados e tente de novo.");
    expect(screen.queryByText("tela de concluído")).toBeNull();
  });

  it("o servidor diz que a conta já assina (409): a tela passa a dizer isso, sem formulário", async () => {
    criarAssinatura.mockRejectedValue(erroDoServidor("JaAssinante"));
    abrir();
    await screen.findByRole("radio", { name: /Mensal/ });
    getSituacaoDaAssinatura.mockResolvedValue({ temAcesso: true });
    assinar();
    expect(await screen.findByText("Você já é assinante.")).toBeTruthy();
    expect(screen.queryByRole("radio")).toBeNull();
    expect(confirmar).not.toHaveBeenCalled();
  });

  it("o servidor falha: a frase de erro, e nada é confirmado", async () => {
    criarAssinatura.mockRejectedValue(new Error("500"));
    abrir();
    await screen.findByRole("radio", { name: /Mensal/ });
    assinar();
    expect((await screen.findByRole("alert")).textContent).toBe("Não foi possível concluir a assinatura. Confira os dados e tente de novo.");
    expect(confirmar).not.toHaveBeenCalled();
  });

  it("dois cliques: UM pedido, e o botão diz que está processando", async () => {
    let soltar: (v: AssinaturaCriada) => void = () => {};
    criarAssinatura.mockReturnValue(new Promise<AssinaturaCriada>((ok) => (soltar = ok)));
    abrir();
    await screen.findByRole("radio", { name: /Mensal/ });
    assinar();
    const processando = (await screen.findByRole("button", { name: "Processando…" })) as HTMLButtonElement;
    expect(processando.disabled).toBe(true);
    fireEvent.click(processando);
    await waitFor(() => expect(criarAssinatura).toHaveBeenCalledTimes(1));
    expect(validar).toHaveBeenCalledTimes(1);
    soltar(PAGAR);
    expect(await screen.findByText("tela de concluído")).toBeTruthy();
  });
});
