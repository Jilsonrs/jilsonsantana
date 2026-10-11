// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import type { CartaoTrocado, MinhaAssinatura, PlanosDaAssinatura, TrocaDeCartaoPreparada } from "@jilson/core";
import { renderWithProviders } from "@/test-utils";
import type { Desfecho, PedidoDeCartao } from "@/lib/stripe-do-site";

const getMinhaAssinatura = vi.fn<() => Promise<MinhaAssinatura>>();
const getPlanosDaAssinatura = vi.fn<() => Promise<PlanosDaAssinatura>>();
const prepararTrocaDeCartao = vi.fn<() => Promise<TrocaDeCartaoPreparada>>();
const aplicarCartaoNovo = vi.fn<() => Promise<CartaoTrocado>>();
vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  getMinhaAssinatura: () => getMinhaAssinatura(),
  getPlanosDaAssinatura: () => getPlanosDaAssinatura(),
  prepararTrocaDeCartao: (...args: unknown[]) => (prepararTrocaDeCartao as (...a: unknown[]) => Promise<TrocaDeCartaoPreparada>)(...args),
  aplicarCartaoNovo: (...args: unknown[]) => (aplicarCartaoNovo as (...a: unknown[]) => Promise<CartaoTrocado>)(...args),
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

import { TrocarCartaoPage } from "./TrocarCartaoPage";
import { IdiomaProvider } from "@/lib/language";

// TROCAR O CARTÃO — a tela (Fase 4, etapa 4.6). O que estes testes protegem:
//   - carregando e falha: sem campo de cartão e sem botão;
//   - quem não tem assinatura que aceite cartão (é o SERVIDOR que diz) volta ao resumo;
//   - o campo abre para SÓ GUARDAR o cartão (nada a cobrar), com a chave, as formas de pagamento
//     e a moeda que vieram do servidor;
//   - o envio, na ordem: confere o cartão → o servidor abre o pedido → o campo confirma com o
//     segredo → o servidor aplica; do site não vai código de cartão nenhum;
//   - qualquer falha fica na tela, com a frase — e nunca "cartão atualizado";
//   - o último passo falhou: um novo clique repete SÓ ele (não guarda um segundo cartão);
//   - dois cliques, um pedido; e, em inglês, tudo em inglês.

const VISA = { bandeira: "visa", final: "4242", mes: 3, ano: 2028 };
const MASTER = { bandeira: "mastercard", final: "4444", mes: 1, ano: 2030 };
const ATIVA: MinhaAssinatura = {
  situacao: "ativa",
  plano: "mensal",
  preco: { centavos: 9990, moeda: "brl" },
  proximaCobranca: { centavos: 9990, moeda: "brl", em: "2026-11-10T15:00:00.000Z" },
  acessoAte: null,
  cartao: VISA,
  aceitaCartao: true,
  podeParar: true,
  podeManter: false,
  terminaAoCancelar: false,
  reembolso: null,
  podeMudarDePlano: true,
  trocaMarcada: null,
};
const PLANOS: PlanosDaAssinatura = {
  chavePublicavel: "pk_test_da_tela",
  planos: [
    { plano: "mensal", centavos: 9990, moeda: "brl" },
    { plano: "anual", centavos: 99500, moeda: "brl" },
  ],
  formasDePagamento: ["card"],
};
const erroDoServidor = (codigo: string) => ({ response: { data: { error: codigo } } });

const abrir = (ui = <TrocarCartaoPage />) =>
  renderWithProviders(ui, {
    route: "/aluno/conta/faturamento/cartao",
    path: "/aluno/conta/faturamento/cartao",
    extraRoutes: [{ path: "/aluno/conta/faturamento", element: <p>TELA DO RESUMO</p> }],
  });
const salvar = async () => fireEvent.click(await screen.findByRole("button", { name: "Salvar cartão" }));
/** A ordem em que as quatro partes do envio foram chamadas. */
const ordem = () =>
  [
    ["validar", validar],
    ["preparar", prepararTrocaDeCartao],
    ["confirmar", confirmar],
    ["aplicar", aplicarCartaoNovo],
  ]
    .flatMap(([nome, dublê]) => (dublê as ReturnType<typeof vi.fn>).mock.invocationCallOrder.map((n) => [n, nome] as const))
    .sort(([a], [b]) => a - b)
    .map(([, nome]) => nome);

beforeEach(() => {
  getMinhaAssinatura.mockReset().mockResolvedValue(ATIVA);
  getPlanosDaAssinatura.mockReset().mockResolvedValue(PLANOS);
  prepararTrocaDeCartao.mockReset().mockResolvedValue({ segredo: "seti_1_secret_x" });
  aplicarCartaoNovo.mockReset().mockResolvedValue({ cartao: MASTER, pagou: false });
  validar.mockReset().mockResolvedValue({ ok: true });
  confirmar.mockReset().mockResolvedValue({ ok: true });
});

describe("TrocarCartaoPage — carregando, falha e quem não tem o que trocar", () => {
  it("enquanto carrega: 'Carregando…', sem campo de cartão e sem botão", () => {
    getMinhaAssinatura.mockReturnValue(new Promise(() => {}));
    abrir();
    expect(screen.getByText("Carregando…")).toBeTruthy();
    expect(screen.queryByTestId("cartao")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("a leitura da assinatura falhou: o erro, sem campo de cartão", async () => {
    getMinhaAssinatura.mockRejectedValue(new Error("500"));
    abrir();
    expect((await screen.findByRole("alert")).textContent).toBe("Não foi possível carregar a sua assinatura. Tente de novo.");
    expect(screen.queryByTestId("cartao")).toBeNull();
    expect(getPlanosDaAssinatura).not.toHaveBeenCalled();
  });

  it("a chave do campo não veio (os planos falharam): o erro, sem campo de cartão", async () => {
    getPlanosDaAssinatura.mockRejectedValue(new Error("503"));
    abrir();
    expect((await screen.findByRole("alert")).textContent).toBe("Não foi possível carregar a sua assinatura. Tente de novo.");
    expect(screen.queryByTestId("cartao")).toBeNull();
  });

  it("sem assinatura, com ela terminada, ou quando o servidor diz que ela não aceita cartão: volta ao resumo", async () => {
    for (const assinatura of [{ situacao: "nenhuma" }, { situacao: "terminada", terminouEm: null }, { ...ATIVA, situacao: "vai-cancelar", aceitaCartao: false }] as MinhaAssinatura[]) {
      getMinhaAssinatura.mockResolvedValue(assinatura);
      const { unmount } = abrir();
      expect(await screen.findByText("TELA DO RESUMO")).toBeTruthy();
      expect(screen.queryByTestId("cartao")).toBeNull();
      unmount();
    }
    expect(getPlanosDaAssinatura).not.toHaveBeenCalled();
    expect(prepararTrocaDeCartao).not.toHaveBeenCalled();
  });
});

describe("TrocarCartaoPage — o campo", () => {
  it("abre para SÓ GUARDAR o cartão (nada a cobrar), com a chave, as formas e a moeda do servidor", async () => {
    abrir();
    const campo = await screen.findByTestId("cartao");
    expect(campo.dataset).toMatchObject({ centavos: "0", moeda: "brl", formas: "card", chave: "pk_test_da_tela", idioma: "pt" });
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Trocar cartão");
    expect(screen.getByText("O novo cartão passa a valer na próxima cobrança.")).toBeTruthy();
    // Só abrir a tela não cria nada no servidor.
    expect(prepararTrocaDeCartao).not.toHaveBeenCalled();
  });

  it("a moeda é a da ASSINATURA, não a do primeiro plano da lista", async () => {
    getMinhaAssinatura.mockResolvedValue({ ...ATIVA, preco: { centavos: 3000, moeda: "usd" } });
    abrir();
    expect((await screen.findByTestId("cartao")).dataset.moeda).toBe("usd");
  });

  it("assinatura sem cartão guardado: o título é 'Adicionar cartão'", async () => {
    getMinhaAssinatura.mockResolvedValue({ ...ATIVA, cartao: null });
    abrir();
    await screen.findByTestId("cartao");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Adicionar cartão");
  });
});

describe("TrocarCartaoPage — o envio", () => {
  it("na ordem: confere → o servidor abre o pedido → o campo confirma com o segredo → o servidor aplica; e a tela diz que trocou", async () => {
    abrir();
    await salvar();
    expect((await screen.findByRole("status")).textContent).toBe("Cartão atualizado.");
    expect(ordem()).toEqual(["validar", "preparar", "confirmar", "aplicar"]);
    // O campo confirma para GUARDAR (não cobra), e uma forma de pagamento que saia do site volta ao resumo.
    expect(confirmar.mock.calls).toEqual([["seti_1_secret_x", "cartao", "/aluno/conta/faturamento"]]);
    // Do site não vai nada: nem cartão, nem assinatura.
    expect(prepararTrocaDeCartao.mock.calls).toEqual([[]]);
    expect(aplicarCartaoNovo.mock.calls).toEqual([[]]);
    // O cartão NOVO aparece, o formulário some, e há o caminho de volta ao resumo.
    expect(screen.getByText("Mastercard •••• 4444 · vence em 01/2030")).toBeTruthy();
    expect(screen.queryByTestId("cartao")).toBeNull();
    fireEvent.click(screen.getByRole("link", { name: "Faturamento e Assinatura" }));
    expect(await screen.findByText("TELA DO RESUMO")).toBeTruthy();
  });

  it("a cobrança estava atrasada e o cartão novo pagou: a tela diz que o pagamento foi confirmado", async () => {
    aplicarCartaoNovo.mockResolvedValue({ cartao: MASTER, pagou: true });
    abrir();
    await salvar();
    expect((await screen.findByRole("status")).textContent).toBe("Cartão atualizado e pagamento confirmado.");
  });

  it("depois de trocar, o resumo é lido de novo (ele tinha guardado o cartão antigo)", async () => {
    abrir();
    await screen.findByTestId("cartao");
    const antes = getMinhaAssinatura.mock.calls.length;
    await salvar();
    await screen.findByRole("status");
    await waitFor(() => expect(getMinhaAssinatura.mock.calls.length).toBeGreaterThan(antes));
  });

  it("o cartão está mal preenchido: a frase da Stripe aparece, e NADA vai ao servidor", async () => {
    validar.mockResolvedValue({ ok: false, mensagem: "O número do cartão está incompleto." });
    abrir();
    await salvar();
    expect((await screen.findByRole("alert")).textContent).toBe("O número do cartão está incompleto.");
    expect(prepararTrocaDeCartao).not.toHaveBeenCalled();
    expect(aplicarCartaoNovo).not.toHaveBeenCalled();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("o cartão foi recusado ao guardar: a frase aparece, e o servidor NÃO aplica nada", async () => {
    confirmar.mockResolvedValue({ ok: false, mensagem: "Seu cartão foi recusado." });
    abrir();
    await salvar();
    expect((await screen.findByRole("alert")).textContent).toBe("Seu cartão foi recusado.");
    expect(aplicarCartaoNovo).not.toHaveBeenCalled();
    expect(screen.queryByRole("status")).toBeNull();
    // O botão volta: a pessoa pode tentar outro cartão.
    expect(screen.getByRole("button", { name: "Salvar cartão" })).toHaveProperty("disabled", false);
  });

  it("falha sem frase da Stripe (ou do servidor): a frase da escola — nunca 'cartão atualizado'", async () => {
    prepararTrocaDeCartao.mockRejectedValue(new Error("500"));
    abrir();
    await salvar();
    expect((await screen.findByRole("alert")).textContent).toBe("Não foi possível salvar o cartão. Confira os dados e tente de novo.");
    expect(confirmar).not.toHaveBeenCalled();
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("o servidor diz que a conta não tem assinatura que aceite cartão: volta ao resumo", async () => {
    prepararTrocaDeCartao.mockRejectedValue(erroDoServidor("SemAssinatura"));
    abrir();
    await salvar();
    expect(await screen.findByText("TELA DO RESUMO")).toBeTruthy();
    expect(confirmar).not.toHaveBeenCalled();
  });

  it("o cartão foi guardado e o ÚLTIMO passo falhou: o erro aparece; o novo clique repete só esse passo", async () => {
    aplicarCartaoNovo.mockRejectedValueOnce(new Error("rede"));
    abrir();
    await salvar();
    expect((await screen.findByRole("alert")).textContent).toBe("Não foi possível salvar o cartão. Confira os dados e tente de novo.");
    expect(screen.queryByRole("status")).toBeNull();
    await salvar();
    expect((await screen.findByRole("status")).textContent).toBe("Cartão atualizado.");
    // Confirmar de novo guardaria um SEGUNDO cartão na Stripe.
    expect(ordem()).toEqual(["validar", "preparar", "confirmar", "aplicar", "aplicar"]);
  });

  it("dois cliques, um pedido — e o botão diz 'Salvando…' enquanto corre", async () => {
    let soltar: (valor: TrocaDeCartaoPreparada) => void = () => {};
    prepararTrocaDeCartao.mockReturnValue(new Promise((resolve) => (soltar = resolve)));
    abrir();
    await salvar();
    const botao = await screen.findByRole("button", { name: "Salvando…" });
    expect(botao).toHaveProperty("disabled", true);
    fireEvent.click(botao);
    soltar({ segredo: "seti_1_secret_x" });
    await screen.findByRole("status");
    expect(prepararTrocaDeCartao).toHaveBeenCalledTimes(1);
    expect(aplicarCartaoNovo).toHaveBeenCalledTimes(1);
  });
});

describe("TrocarCartaoPage — em inglês", () => {
  it("o título, a descrição, o botão e a confirmação em inglês; o campo da Stripe abre em inglês", async () => {
    abrir(
      <IdiomaProvider idioma="en">
        <TrocarCartaoPage />
      </IdiomaProvider>,
    );
    expect((await screen.findByTestId("cartao")).dataset.idioma).toBe("en");
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Update card");
    expect(screen.getByText("The new card will be used for your next charge.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Save card" }));
    expect((await screen.findByRole("status")).textContent).toBe("Card updated.");
    expect(screen.getByText("Mastercard •••• 4444 · expires 01/2030")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Billing and subscription" })).toBeTruthy();
  });
});
