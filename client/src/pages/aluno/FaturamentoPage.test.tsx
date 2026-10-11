// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, act } from "@testing-library/react";
import type { MinhaAssinatura } from "@jilson/core";
import { renderWithProviders } from "@/test-utils";

const getMinhaAssinatura = vi.fn<() => Promise<MinhaAssinatura>>();
vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  getMinhaAssinatura: () => getMinhaAssinatura(),
}));

import { FaturamentoPage } from "./FaturamentoPage";
import { IdiomaProvider } from "@/lib/language";

// FATURAMENTO E ASSINATURA — o resumo (Fase 4, etapa 4.6). O que estes testes protegem:
//   - a tela diz o que o SERVIDOR disse da assinatura, em cada situação — e nunca mostra um
//     plano, uma cobrança ou um cartão enquanto carrega ou quando a leitura falha;
//   - quem não tem assinatura é levado a assinar; quem já teve, a reativar;
//   - o valor da próxima cobrança é o que veio do servidor (com desconto, é menor que o preço);
//   - a cobrança que falhou aparece como alerta; a renovação parada, com a data do fim;
//   - do cartão só aparecem a bandeira, os 4 últimos e a validade;
//   - em inglês, tudo em inglês.

const MEIO_DIA = "2026-11-10T15:00:00.000Z";
const VISA = { bandeira: "visa", final: "4242", mes: 3, ano: 2028 };
const ATIVA: MinhaAssinatura = {
  situacao: "ativa",
  plano: "mensal",
  preco: { centavos: 9990, moeda: "brl" },
  proximaCobranca: { centavos: 9990, moeda: "brl", em: MEIO_DIA },
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

const abrir = (ui = <FaturamentoPage />) =>
  renderWithProviders(ui, {
    route: "/aluno/conta/faturamento",
    path: "/aluno/conta/faturamento",
    extraRoutes: [
      { path: "/aluno/assinar", element: <p>TELA DE ASSINAR</p> },
      { path: "/aluno/conta/faturamento/cartao", element: <p>TELA DE TROCAR O CARTÃO</p> },
    ],
  });

/** O texto da tela, com o espaço do "R$ 99,90" (que não quebra linha) trocado por um comum. */
const naTela = () => (document.body.textContent ?? "").replace(/ /g, " ");

beforeEach(() => {
  getMinhaAssinatura.mockReset().mockResolvedValue(ATIVA);
});

describe("FaturamentoPage — carregando e falha", () => {
  it("enquanto carrega: o título e 'Carregando…', sem plano, sem cartão e sem botão", () => {
    getMinhaAssinatura.mockReturnValue(new Promise(() => {}));
    abrir();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Faturamento e Assinatura");
    expect(screen.getByText("Carregando…")).toBeTruthy();
    expect(screen.queryByText("Seu plano")).toBeNull();
    expect(screen.queryByText("Forma de pagamento")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("a leitura falhou: o erro, e nada da assinatura", async () => {
    getMinhaAssinatura.mockRejectedValue(new Error("500"));
    abrir();
    expect((await screen.findByRole("alert")).textContent).toBe("Não foi possível carregar a sua assinatura. Tente de novo.");
    expect(screen.queryByText("Carregando…")).toBeNull();
    expect(screen.queryByText("Seu plano")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });
});

describe("FaturamentoPage — a leitura que falha DEPOIS de ter dado certo", () => {
  it("ao voltar à aba a tela lê de novo; se falhar, mostra só a falha — e não o plano e o cartão de antes", async () => {
    abrir();
    expect(await screen.findByText("Visa •••• 4242 · vence em 03/2028")).toBeTruthy();
    getMinhaAssinatura.mockRejectedValue(new Error("500"));
    // É o que o navegador avisa quando a pessoa volta para a aba: a tela busca de novo.
    act(() => {
      window.dispatchEvent(new Event("visibilitychange"));
    });
    expect((await screen.findByRole("alert")).textContent).toBe("Não foi possível carregar a sua assinatura. Tente de novo.");
    expect(screen.queryByText("Seu plano")).toBeNull();
    expect(screen.queryByText("Visa •••• 4242 · vence em 03/2028")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });
});

describe("FaturamentoPage — sem acesso", () => {
  it("nunca assinou: diz que não tem assinatura e leva a ASSINAR", async () => {
    getMinhaAssinatura.mockResolvedValue({ situacao: "nenhuma" });
    abrir();
    expect(await screen.findByText("Você ainda não tem uma assinatura.")).toBeTruthy();
    expect(screen.queryByText("Seu plano")).toBeNull();
    fireEvent.click(screen.getByRole("link", { name: "Assinar" }));
    expect(await screen.findByText("TELA DE ASSINAR")).toBeTruthy();
  });

  it("já foi assinante: diz o dia em que terminou e leva a REATIVAR", async () => {
    getMinhaAssinatura.mockResolvedValue({ situacao: "terminada", terminouEm: MEIO_DIA });
    abrir();
    expect(await screen.findByText("Sua assinatura terminou em 10/11/2026.")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Assinar" })).toBeNull();
    fireEvent.click(screen.getByRole("link", { name: "Reativar assinatura" }));
    expect(await screen.findByText("TELA DE ASSINAR")).toBeTruthy();
  });

  it("terminada sem data: a frase sem a data, em vez de uma data inventada", async () => {
    getMinhaAssinatura.mockResolvedValue({ situacao: "terminada", terminouEm: null });
    abrir();
    expect(await screen.findByText("Sua assinatura terminou.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Reativar assinatura" })).toBeTruthy();
  });
});

describe("FaturamentoPage — com acesso", () => {
  it("ativa: o plano com o preço, a próxima cobrança com valor e data, e o cartão", async () => {
    abrir();
    expect(await screen.findByText("Seu plano")).toBeTruthy();
    expect(naTela()).toContain("Mensal · R$ 99,90/mês");
    expect(naTela()).toContain("Próxima cobrança: R$ 99,90 em 10/11/2026");
    expect(screen.getByText("Forma de pagamento")).toBeTruthy();
    expect(screen.getByText("Visa •••• 4242 · vence em 03/2028")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByText(/termina em/)).toBeNull();
  });

  it("o plano anual: 'Anual' e 'por ano'", async () => {
    getMinhaAssinatura.mockResolvedValue({ ...ATIVA, plano: "anual", preco: { centavos: 99500, moeda: "brl" }, proximaCobranca: { centavos: 99500, moeda: "brl", em: MEIO_DIA } });
    abrir();
    await screen.findByText("Seu plano");
    expect(naTela()).toContain("Anual · R$ 995,00/ano");
    expect(naTela()).not.toContain("Mensal");
  });

  it("com desconto: a próxima cobrança é o valor que o SERVIDOR mandou, não o preço do plano", async () => {
    getMinhaAssinatura.mockResolvedValue({ ...ATIVA, proximaCobranca: { centavos: 0, moeda: "brl", em: MEIO_DIA } });
    abrir();
    await screen.findByText("Seu plano");
    expect(naTela()).toContain("Mensal · R$ 99,90/mês");
    expect(naTela()).toContain("Próxima cobrança: R$ 0,00 em 10/11/2026");
  });

  it("a renovação foi parada: a data até quando há acesso, e nenhuma próxima cobrança", async () => {
    getMinhaAssinatura.mockResolvedValue({ ...ATIVA, situacao: "vai-cancelar", proximaCobranca: null, acessoAte: MEIO_DIA });
    abrir();
    expect(await screen.findByText("Sua assinatura termina em 10/11/2026. Você continua com acesso até lá.")).toBeTruthy();
    expect(naTela()).not.toContain("Próxima cobrança");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("a última cobrança falhou: o alerta para trocar o cartão, sem próxima cobrança nem data de fim", async () => {
    getMinhaAssinatura.mockResolvedValue({ ...ATIVA, situacao: "atrasada", proximaCobranca: null });
    abrir();
    expect((await screen.findByRole("alert")).textContent).toBe("Não conseguimos cobrar o seu cartão. Troque o cartão para não perder o acesso.");
    expect(naTela()).not.toContain("Próxima cobrança");
    expect(screen.queryByText(/termina em/)).toBeNull();
  });

  it("sem cartão guardado: diz que não há cartão, em vez de um cartão em branco", async () => {
    getMinhaAssinatura.mockResolvedValue({ ...ATIVA, cartao: null });
    abrir();
    expect(await screen.findByText("Nenhum cartão cadastrado.")).toBeTruthy();
    expect(naTela()).not.toContain("••••");
  });

  it("com cartão: o botão 'Trocar cartão' leva à tela de trocar", async () => {
    abrir();
    fireEvent.click(await screen.findByRole("link", { name: "Trocar cartão" }));
    expect(await screen.findByText("TELA DE TROCAR O CARTÃO")).toBeTruthy();
  });

  it("sem cartão: o botão diz 'Adicionar cartão', e leva à mesma tela", async () => {
    getMinhaAssinatura.mockResolvedValue({ ...ATIVA, cartao: null });
    abrir();
    expect(screen.queryByRole("link", { name: "Trocar cartão" })).toBeNull();
    fireEvent.click(await screen.findByRole("link", { name: "Adicionar cartão" }));
    expect(await screen.findByText("TELA DE TROCAR O CARTÃO")).toBeTruthy();
  });

  it("assinatura que o servidor diz que NÃO aceita cartão (encerrada de vez, com dias pagos): sem botão", async () => {
    getMinhaAssinatura.mockResolvedValue({ ...ATIVA, situacao: "vai-cancelar", proximaCobranca: null, acessoAte: MEIO_DIA, aceitaCartao: false });
    abrir();
    expect(await screen.findByText("Visa •••• 4242 · vence em 03/2028")).toBeTruthy();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("bandeira que a tela não conhece: só os 4 últimos e a validade, sem um nome errado", async () => {
    getMinhaAssinatura.mockResolvedValue({ ...ATIVA, cartao: { ...VISA, bandeira: "unknown" } });
    abrir();
    expect(await screen.findByText("•••• 4242 · vence em 03/2028")).toBeTruthy();
  });

  it("preço que não é de nenhum dos dois planos: a tela abre, sem a linha do plano", async () => {
    getMinhaAssinatura.mockResolvedValue({ ...ATIVA, plano: null, preco: null });
    abrir();
    expect(await screen.findByText("Seu plano")).toBeTruthy();
    expect(naTela()).not.toContain("Mensal");
    expect(naTela()).toContain("Próxima cobrança: R$ 99,90 em 10/11/2026");
  });
});

describe("FaturamentoPage — em inglês", () => {
  const emIngles = (
    <IdiomaProvider idioma="en">
      <FaturamentoPage />
    </IdiomaProvider>
  );

  it("o título, o plano, a próxima cobrança (com o mês por extenso) e o cartão em inglês", async () => {
    abrir(emIngles);
    expect(await screen.findByText("Your plan")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Billing and subscription");
    expect(naTela()).toContain("Monthly · R$99.90/month");
    expect(naTela()).toContain("Next charge: R$99.90 on Nov 10, 2026");
    expect(screen.getByText("Visa •••• 4242 · expires 03/2028")).toBeTruthy();
    expect(screen.queryByText("Seu plano")).toBeNull();
    expect(screen.queryByText("Forma de pagamento")).toBeNull();
  });

  it("sem assinatura e terminada: o convite em inglês", async () => {
    getMinhaAssinatura.mockResolvedValue({ situacao: "terminada", terminouEm: MEIO_DIA });
    abrir(emIngles);
    expect(await screen.findByText("Your subscription ended on Nov 10, 2026.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Reactivate subscription" })).toBeTruthy();
  });
});
