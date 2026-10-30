// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { act, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { focusManager, onlineManager } from "@tanstack/react-query";
import { useLocation } from "react-router";
import type { AssinaturaCriada, PlanosDaAssinatura, PreviaDaAssinatura } from "@jilson/core";
import { renderWithProviders } from "@/test-utils";
import type { Desfecho, PedidoDeCartao } from "@/lib/stripe-do-site";

const getPlanosDaAssinatura = vi.fn();
const getPreviaDaAssinatura = vi.fn();
const criarAssinatura = vi.fn();
const pagarComPix = vi.fn();
const getSituacaoDaAssinatura = vi.fn();
const getMinhaAssinatura = vi.fn();
// O vigia do campo de pagamento (E3 da revisão ampla): o campo de mentira fica pronto, ou falha quando o teste pede.
const avisarCampoQueNaoAbriu = vi.fn(async (_corpo: unknown) => undefined);
let campoFalha = false;
vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  avisarCampoQueNaoAbriu: (corpo: unknown) => avisarCampoQueNaoAbriu(corpo),
  getMinhaAssinatura: (...args: unknown[]) => getMinhaAssinatura(...args),
  getPlanosDaAssinatura: (...args: unknown[]) => getPlanosDaAssinatura(...args),
  getPreviaDaAssinatura: (...args: unknown[]) => getPreviaDaAssinatura(...args),
  criarAssinatura: (...args: unknown[]) => criarAssinatura(...args),
  pagarComPix: (...args: unknown[]) => pagarComPix(...args),
  getSituacaoDaAssinatura: (...args: unknown[]) => getSituacaoDaAssinatura(...args),
}));

// A NOSSA fronteira com o Stripe.js vira dublê (nunca `@stripe/*`): o campo é um marcador que
// mostra com o que foi aberto, e o cartão responde o que o teste mandar.
const validar = vi.fn<() => Promise<Desfecho>>();
const confirmar = vi.fn<(segredo: string, tipo: string, voltarPara: string, pagador?: { email: string }) => Promise<Desfecho>>();
vi.mock("@/lib/stripe-do-site", () => ({
  CartaoProvider: ({ pedido, children }: { pedido: PedidoDeCartao; children: ReactNode }) => (
    <div data-testid="cartao" data-centavos={pedido.centavos} data-moeda={pedido.moeda} data-formas={pedido.formasDePagamento.join(",")} data-chave={pedido.chavePublicavel} data-pix={pedido.pix?.configuracao ?? ""}>
      {children}
    </div>
  ),
  // Como o campo de verdade, avisa que ficou pronto (o vigia do campo — E3 — não mostra a frase de "não carregou").
  CampoDoCartao: function CampoDeMentira({ aoFicarPronto, aoFalhar }: { aoFicarPronto?: () => void; aoFalhar?: () => void }) {
    useEffect(() => (campoFalha ? aoFalhar?.() : aoFicarPronto?.()), []);
    return <div>campo do cartão</div>;
  },
  useCartao: () => ({ validar: () => validar(), confirmar: (segredo: string, tipo: string, voltarPara: string, pagador?: { email: string }) => (pagador ? confirmar(segredo, tipo, voltarPara, pagador) : confirmar(segredo, tipo, voltarPara)) }),
}));

import { esquecerPix, guardarPix, lerPix } from "@/lib/pix-pendente";
import { AssinarPage } from "./AssinarPage";

// ASSINAR COM A CONTA LOGADA (Fase 4, etapa 4.2). O que estes testes protegem:
//   - carregando, erro e "já é assinante" (quem já assina não vê formulário);
//   - o valor na tela é o que o SERVIDOR mandou, e o campo do cartão abre com ele; cada plano diz
//     o preço e como é cobrado, e o anual leva o selo do desconto, CALCULADO dos dois preços;
//   - a COLUNA DE RESUMO (etapa 4.7, passo 6d — as duas telas iguais, decisão do operador de
//     27/10/2026): o total de hoje é o do servidor; a renovação diz o valor sem código, e sai sem
//     ele com código (nunca conta feita na tela); o reembolso, o pagamento seguro e os Termos;
//   - o CPF OU CNPJ, obrigatório: errado, nada vai ao servidor nem ao cartão; vai no pedido;
//   - o código promocional: o valor de hoje é o da prévia do servidor; código que não vale
//     avisa e não muda nada; com 100% PARA SEMPRE o cartão some — e só nesse caso;
//   - o envio, na ordem: confere o cartão → cria no servidor (só plano, código e CPF) → confirma com
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
// O Pix pré-pago no ar (etapa 4.9): o servidor manda a configuração só-Pix.
const COM_PIX: PlanosDaAssinatura = { ...PLANOS, pix: { configuracao: "pmc_so_pix" } };
const PAGAR_PIX: AssinaturaCriada = { estado: "pagar", segredo: "pi_pix_secret_x", tipo: "pix", email: "aluno@teste.local" };
const erroDoServidor = (codigo: string) => ({ response: { data: { error: codigo } } });

beforeEach(() => {
  campoFalha = false;
  avisarCampoQueNaoAbriu.mockClear();
  getSituacaoDaAssinatura.mockReset().mockResolvedValue({ temAcesso: false, reativar: false });
  getMinhaAssinatura.mockReset().mockResolvedValue(RENOVA);
  getPlanosDaAssinatura.mockReset().mockResolvedValue(PLANOS);
  getPreviaDaAssinatura.mockReset().mockResolvedValue(CEM_PARA_SEMPRE);
  criarAssinatura.mockReset().mockResolvedValue(PAGAR);
  pagarComPix.mockReset().mockResolvedValue(PAGAR_PIX);
  validar.mockReset().mockResolvedValue({ ok: true });
  confirmar.mockReset().mockResolvedValue({ ok: true });
  esquecerPix();
});

/** A assinatura de quem já assina e RENOVA, como a tela de Faturamento e Assinatura a recebe. */
const RENOVA = { situacao: "ativa", plano: "mensal", preco: { centavos: 9990, moeda: "brl" }, proximaCobranca: null, acessoAte: null, cartao: null, aceitaCartao: true, podeParar: true, podeManter: false, terminaAoCancelar: false, reembolso: null, podeMudarDePlano: true, trocaMarcada: null };

/** A tela de concluído, mostrando o que veio no endereço (a marca de quem reativou). */
function Concluido() {
  return <p>tela de concluído{useLocation().search}</p>;
}

const abrir = () =>
  renderWithProviders(<AssinarPage />, {
    route: "/aluno/assinar",
    extraRoutes: [
      { path: "/aluno/assinar/concluido", element: <Concluido /> },
      { path: "/inicio", element: <p>tela de início</p> },
      { path: "/aluno/conta/faturamento", element: <p>tela de faturamento e assinatura</p> },
    ],
  });
/** O texto da tela, com o espaço do "R$ 99,90" (que não quebra linha) trocado por um comum. */
const naTela = () => (document.body.textContent ?? "").replace(/ /g, " ");
const cartao = () => screen.queryByTestId("cartao");
const CPF = "529.982.247-25";
const preencherCpf = (valor = CPF) => fireEvent.change(screen.getByLabelText("CPF ou CNPJ"), { target: { value: valor } });
/** Preenche o CPF (obrigatório desde o passo 6d) e clica em Assinar. */
const assinar = (botao = "Assinar") => {
  preencherCpf();
  fireEvent.click(screen.getByRole("button", { name: botao }));
};
async function aplicar(codigo: string) {
  fireEvent.change(await screen.findByLabelText("Código promocional"), { target: { value: codigo } });
  fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));
}

// "REATIVAR ASSINATURA" (Fase 4, etapa 4.4 — decisão do operador, 10/10/2026): quem já foi
// assinante e está sem acesso REATIVA; "Assinar" fica só para a primeira vez (o resto deste
// arquivo). Quem diz é o servidor — a tela só troca o texto.
describe("AssinarPage — quem já foi assinante", () => {
  it("o título da tela e o botão dizem Reativar assinatura — com o cartão, e também sem ele (código de 100%)", async () => {
    getSituacaoDaAssinatura.mockResolvedValue({ temAcesso: false, reativar: true });
    abrir();
    expect(await screen.findByRole("heading", { level: 1, name: "Reativar assinatura" })).toBeTruthy();
    expect(await screen.findByRole("button", { name: "Reativar assinatura" })).toBeTruthy();
    expect(cartao()).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Assinar" })).toBeNull();

    await aplicar("TESTE100");
    await screen.findByText("TESTE100");
    await waitFor(() => expect(cartao()).toBeNull());
    expect(screen.getByRole("button", { name: "Reativar assinatura" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Assinar" })).toBeNull();
  });

  it("reativar manda ao servidor o mesmo pedido de quem assina pela primeira vez", async () => {
    getSituacaoDaAssinatura.mockResolvedValue({ temAcesso: false, reativar: true });
    abrir();
    await aplicar("TESTE100");
    await screen.findByText("TESTE100");
    await waitFor(() => expect(cartao()).toBeNull());
    assinar("Reativar assinatura");
    await waitFor(() => expect(criarAssinatura).toHaveBeenCalledWith({ plano: "mensal", codigo: "TESTE100", documento: CPF }));
  });

  // O TÍTULO CONTINUA "Reativar assinatura" na confirmação (decisão do operador, 11/10/2026):
  // quem reativou chega à tela de concluído com a marca disso no endereço — pelo caminho de
  // dentro do site e pelo endereço de volta que a Stripe usa.
  it("quem reativou vai para a confirmação com a marca de que REATIVOU — e quem assina pela primeira vez, sem ela", async () => {
    getSituacaoDaAssinatura.mockResolvedValue({ temAcesso: false, reativar: true });
    criarAssinatura.mockResolvedValue(PAGAR);
    const { unmount } = abrir();
    await screen.findByRole("button", { name: "Reativar assinatura" });
    assinar("Reativar assinatura");
    expect(await screen.findByText("tela de concluído?reativou=1")).toBeTruthy();
    expect(confirmar).toHaveBeenCalledWith("pi_1_secret_x", "pagamento", "/aluno/assinar/concluido?reativou=1");
    unmount();

    getSituacaoDaAssinatura.mockResolvedValue({ temAcesso: false, reativar: false });
    abrir();
    await screen.findByRole("button", { name: "Assinar" });
    assinar();
    expect(await screen.findByText("tela de concluído")).toBeTruthy();
    expect(screen.queryByText(/reativou/)).toBeNull();
  });
});

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

  // QUEM CANCELOU E AINDA TEM DIAS PAGOS (etapa 4.6, passo 12): assinar de novo cobraria duas
  // vezes o mesmo período. A pessoa é levada a Faturamento e Assinatura, onde está "Manter a
  // assinatura" (ou a data em que o acesso termina).
  it("parou a renovação e ainda tem dias pagos: é levada a Faturamento e Assinatura — sem formulário, sem cobrar de novo", async () => {
    getSituacaoDaAssinatura.mockResolvedValue({ temAcesso: true });
    getMinhaAssinatura.mockResolvedValue({ ...RENOVA, situacao: "vai-cancelar", acessoAte: "2026-11-10T15:00:00.000Z", podeParar: false, podeManter: true });
    abrir();
    expect(await screen.findByText("tela de faturamento e assinatura")).toBeTruthy();
    expect(screen.queryByText("Você já é assinante.")).toBeNull();
    expect(getPlanosDaAssinatura).not.toHaveBeenCalled();
    expect(criarAssinatura).not.toHaveBeenCalled();
  });

  it("encerrada de vez, ainda com dias pagos (não dá para manter): também vai para lá, que diz até quando há acesso", async () => {
    getSituacaoDaAssinatura.mockResolvedValue({ temAcesso: true });
    getMinhaAssinatura.mockResolvedValue({ ...RENOVA, situacao: "vai-cancelar", acessoAte: "2026-11-10T15:00:00.000Z", podeParar: false, podeManter: false, aceitaCartao: false, podeMudarDePlano: false });
    abrir();
    expect(await screen.findByText("tela de faturamento e assinatura")).toBeTruthy();
  });

  it("quem assina e RENOVA (ou está com a cobrança atrasada) continua lendo 'Você já é assinante' — não é levado a lugar nenhum", async () => {
    getSituacaoDaAssinatura.mockResolvedValue({ temAcesso: true });
    for (const situacao of ["ativa", "atrasada"]) {
      getMinhaAssinatura.mockResolvedValue({ ...RENOVA, situacao });
      const { unmount } = abrir();
      expect(await screen.findByText("Você já é assinante."), situacao).toBeTruthy();
      unmount();
    }
  });

  it("não deu para ler a assinatura (a Stripe fora do ar, ou a de mentira do seed): vale o aviso de sempre — a tela não tranca", async () => {
    getSituacaoDaAssinatura.mockResolvedValue({ temAcesso: true });
    getMinhaAssinatura.mockRejectedValue(new Error("404"));
    abrir();
    expect(await screen.findByText("Você já é assinante.")).toBeTruthy();
  });

  it("quem NÃO assina: a assinatura nem é lida", async () => {
    abrir();
    await screen.findByRole("button", { name: "Assinar" });
    expect(getMinhaAssinatura).not.toHaveBeenCalled();
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
    // O resumo: o total de hoje é o preço do plano, e a renovação diz o valor.
    expect(naTela()).toContain("Total de hojeR$ 99,90");
    expect(naTela()).toContain("Renova todo mês por R$ 99,90, até você cancelar.");
    expect(cartao()?.dataset).toMatchObject({ centavos: "9990", moeda: "brl", formas: "card", chave: "pk_test_da_tela" });
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
    expect(naTela()).toContain("Total de hojeR$ 0,00");
    // Com código, a renovação sai SEM valor (a prévia não o diz — nunca conta feita na tela).
    expect(naTela()).toContain("Renova todo mês, até você cancelar.");
    expect(naTela()).toContain("100% de desconto em todas as cobranças");
    expect(cartao()).toBeNull();
    expect(screen.getByRole("button", { name: "Assinar" })).toBeTruthy();
  });

  it("código que não vale: avisa, e o valor e o cartão continuam os mesmos", async () => {
    getPreviaDaAssinatura.mockRejectedValue(erroDoServidor("CodigoInvalido"));
    abrir();
    await aplicar("NAOEXISTE");
    expect((await screen.findByRole("alert")).textContent).toBe("Este código não é válido.");
    expect(naTela()).toContain("Total de hojeR$ 99,90");
    expect(cartao()?.dataset.centavos).toBe("9990");
    expect(screen.getByLabelText("Código promocional").getAttribute("aria-invalid")).toBe("true");
  });

  // O LIMITE DE TENTATIVAS (etapa 4.7, passo 1 — a frase é do operador, 19/10/2026): no lugar do
  // erro de sempre, que mandaria tentar de novo na hora.
  it("muitas tentativas ao aplicar o código: a frase de esperar — e o valor e o cartão continuam os mesmos", async () => {
    getPreviaDaAssinatura.mockRejectedValue(erroDoServidor("MuitasTentativas"));
    abrir();
    await aplicar("QUALQUER");
    expect((await screen.findByRole("alert")).textContent).toBe("Muitas tentativas seguidas. Por segurança, espere alguns minutos e tente de novo.");
    expect(naTela()).toContain("Total de hojeR$ 99,90");
    expect(cartao()?.dataset.centavos).toBe("9990");
  });

  it("remover o código: voltam o valor cheio e o cartão", async () => {
    abrir();
    await aplicar("TESTE100");
    fireEvent.click(await screen.findByRole("button", { name: "Remover" }));
    expect(naTela()).toContain("Total de hojeR$ 99,90");
    expect(naTela()).toContain("Renova todo mês por R$ 99,90, até você cancelar.");
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
    expect(naTela()).toContain("Total de hojeR$ 49,95");
    expect(naTela()).toContain("Renova todo mês, até você cancelar.");
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

  // Cada prévia gasta uma das 10 tentativas de 15 minutos (etapa 4.7, passo 1 — achado P1 da
  // revisão de segurança): quem só compara os planos, ou vai ao app do banco e volta, não pode
  // parar no limite. O que já veio fica; o servidor confere o código de novo ao assinar.
  it("a prévia não é pedida de novo sozinha: voltar a um plano já visto, à aba ou à rede não gasta tentativa", async () => {
    abrir();
    await aplicar("TESTE100");
    await screen.findByText("TESTE100");
    fireEvent.click(screen.getByRole("radio", { name: /Anual/ }));
    await waitFor(() => expect(getPreviaDaAssinatura).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getByRole("radio", { name: /Mensal/ }));
    act(() => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
      onlineManager.setOnline(false);
      onlineManager.setOnline(true);
    });
    await new Promise((pronto) => setTimeout(pronto, 50));
    expect(getPreviaDaAssinatura).toHaveBeenCalledTimes(2);
    focusManager.setFocused(undefined);
  });
});

// AS PARTES NOVAS (etapa 4.7, passo 6d): as duas telas iguais — decisão do operador, 27/10/2026 (P80);
// os textos, aprovados por ele no mesmo dia (P81).
describe("AssinarPage — o CPF ou CNPJ, o resumo e o que está incluído", () => {
  it("sem o CPF, ou com o dígito errado: o aviso embaixo do campo — e nada vai ao cartão nem ao servidor", async () => {
    abrir();
    await screen.findByRole("radio", { name: /Mensal/ });
    fireEvent.click(screen.getByRole("button", { name: "Assinar" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Confira o número: este CPF ou CNPJ não é válido.");
    preencherCpf("529.982.247-24");
    fireEvent.click(screen.getByRole("button", { name: "Assinar" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Confira o número: este CPF ou CNPJ não é válido.");
    expect(screen.getByLabelText("CPF ou CNPJ").getAttribute("aria-invalid")).toBe("true");
    expect(validar).not.toHaveBeenCalled();
    expect(criarAssinatura).not.toHaveBeenCalled();
  });

  it("o CNPJ também vale, e vai no pedido como foi digitado (quem confere e converte é o servidor)", async () => {
    abrir();
    await screen.findByRole("radio", { name: /Mensal/ });
    preencherCpf("11.222.333/0001-81");
    fireEvent.click(screen.getByRole("button", { name: "Assinar" }));
    await waitFor(() => expect(criarAssinatura).toHaveBeenCalledWith({ plano: "mensal", documento: "11.222.333/0001-81" }));
  });

  it("o servidor recusou o número (a Stripe não aceitou): o aviso embaixo do campo, e o cartão não confirma", async () => {
    criarAssinatura.mockRejectedValue(erroDoServidor("DocumentoInvalido"));
    abrir();
    await screen.findByRole("radio", { name: /Mensal/ });
    assinar();
    expect((await screen.findByRole("alert")).textContent).toBe("Confira o número: este CPF ou CNPJ não é válido.");
    expect(screen.getByLabelText("CPF ou CNPJ").getAttribute("aria-invalid")).toBe("true");
    expect(confirmar).not.toHaveBeenCalled();
  });

  // Muitas assinaturas ao mesmo tempo nesta cópia do site (achado P1 da revisão do passo 6): o texto do operador.
  it("muitas assinaturas ao mesmo tempo (409 MuitosAoMesmoTempo): a frase de esperar", async () => {
    criarAssinatura.mockRejectedValue(erroDoServidor("MuitosAoMesmoTempo"));
    abrir();
    await screen.findByRole("radio", { name: /Mensal/ });
    assinar();
    expect((await screen.findByRole("alert")).textContent).toBe("Aguarde um instante e tente novamente.");
  });

  // O clique duplo, ou o Pix devolvido que o servidor acabou de limpar (409 Ocupada): a frase de esperar —
  // decisão do operador, 29/10/2026. Sem ela, a frase genérica mandava conferir os dados.
  it("ocupada (409 Ocupada): a frase de esperar, e o cartão não confirma", async () => {
    criarAssinatura.mockRejectedValue(erroDoServidor("Ocupada"));
    abrir();
    await screen.findByRole("radio", { name: /Mensal/ });
    assinar();
    expect((await screen.findByRole("alert")).textContent).toBe("Aguarde um instante e tente novamente.");
    expect(confirmar).not.toHaveBeenCalled();
  });

  it("o anual no resumo: o plano, o total de hoje e a renovação de uma vez por ano, com o valor", async () => {
    abrir();
    fireEvent.click(await screen.findByRole("radio", { name: /Anual/ }));
    expect(naTela()).toContain("Total de hojeR$ 995,00");
    expect(naTela()).toContain("Renova uma vez por ano por R$ 995,00, até você cancelar.");
  });

  it("o reembolso, o pagamento seguro e os Termos — os dois links abrem em outra aba (quem lê não perde o que preencheu)", async () => {
    abrir();
    await screen.findByRole("radio", { name: /Mensal/ });
    expect(naTela()).toContain("Garantia de 7 dias: se não gostar, você recebe de volta o valor pago.");
    expect(naTela()).toContain("Pagamento seguro, processado pela Stripe. A escola não guarda os dados do seu cartão.");
    expect(naTela()).toContain("Ao assinar, você concorda com os Termos de Uso e a Política de Privacidade.");
    const termos = screen.getByRole("link", { name: "Termos de Uso" });
    const privacidade = screen.getByRole("link", { name: "Política de Privacidade" });
    expect([termos.getAttribute("href"), privacidade.getAttribute("href")]).toEqual(["/termos", "/privacidade"]);
    expect([termos.getAttribute("target"), privacidade.getAttribute("rel")]).toEqual(["_blank", "noopener noreferrer"]);
  });

  it("\"O que está incluído\": a lista e a frase que o servidor mandou; sem elas, a parte não aparece", async () => {
    getPlanosDaAssinatura.mockResolvedValue({ ...PLANOS, incluido: { itens: ["Item A", "Item B"], frase: "A frase de baixo." } });
    const { unmount } = abrir();
    expect(await screen.findByRole("heading", { name: "O que está incluído" })).toBeTruthy();
    expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual(expect.arrayContaining(["Item A", "Item B"]));
    expect(screen.getByText("A frase de baixo.")).toBeTruthy();
    unmount();

    getPlanosDaAssinatura.mockResolvedValue(PLANOS);
    abrir();
    await screen.findByRole("radio", { name: /Mensal/ });
    expect(screen.queryByRole("heading", { name: "O que está incluído" })).toBeNull();
  });

  // COMO A UDEMY (decisão do operador, 27/10/2026): quem preenche de cima para baixo termina no botão.
  // O formulário é o mesmo nas duas telas (P80): a ordem vale para a pública também.
  it("a ordem, como a Udemy: no resumo, os Termos e o botão POR ÚLTIMO; \"O que está incluído\" fora do resumo, entre os planos e o código", async () => {
    getPlanosDaAssinatura.mockResolvedValue({ ...PLANOS, incluido: { itens: ["Item A"], frase: "A frase de baixo." } });
    abrir();
    const incluido = await screen.findByRole("heading", { name: "O que está incluído" });
    const resumo = screen.getByRole("region", { name: "Resumo" });
    const botao = within(resumo).getByRole("button", { name: "Assinar" });
    const vemDepois = (a: Node, b: Node) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    expect(vemDepois(within(resumo).getByRole("link", { name: "Termos de Uso" }), botao)).toBe(true);
    expect(resumo.lastElementChild?.contains(botao)).toBe(true);
    expect(resumo.contains(incluido)).toBe(false);
    expect(vemDepois(screen.getByRole("radio", { name: /Anual/ }), incluido)).toBe(true);
    expect(vemDepois(incluido, screen.getByLabelText("Código promocional"))).toBe(true);
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
    expect(criarAssinatura).toHaveBeenCalledWith({ plano: "anual", documento: CPF });
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

  // E15 (a frase aprovada pelo operador em 30/10/2026): o cartão RECUSADO pelo banco, com o Pix no ar, sugere o Pix;
  // sem o Pix no ar, fica a frase da Stripe.
  it("cartão RECUSADO com o Pix no ar: a frase que sugere o Pix; sem o Pix no ar, a da Stripe", async () => {
    confirmar.mockResolvedValue({ ok: false, mensagem: "Seu cartão foi recusado.", recusado: true });
    getPlanosDaAssinatura.mockResolvedValue(COM_PIX);
    const { unmount } = abrir();
    await screen.findByRole("radio", { name: /Mensal/ });
    assinar();
    expect((await screen.findByRole("alert")).textContent).toBe("Seu cartão foi recusado. Tente outro cartão ou pague com Pix; se precisar, escreva para suporte@jilsonsantana.com.");
    unmount();

    getPlanosDaAssinatura.mockResolvedValue(PLANOS);
    abrir();
    await screen.findByRole("radio", { name: /Mensal/ });
    assinar();
    expect((await screen.findByRole("alert")).textContent).toBe("Seu cartão foi recusado.");
  });

  it("falha sem frase para o aluno (a Stripe não carregou): a frase da escola", async () => {
    validar.mockResolvedValue({ ok: false, mensagem: null });
    abrir();
    await screen.findByRole("radio", { name: /Mensal/ });
    assinar();
    expect((await screen.findByRole("alert")).textContent).toBe("Não foi possível concluir a assinatura. Confira os dados e tente de novo; se continuar, escreva para suporte@jilsonsantana.com.");
  });

  it("com o código de 100%: cria com o plano E o código, sem cartão, e vai para a tela de concluído", async () => {
    criarAssinatura.mockResolvedValue({ estado: "ativa" });
    abrir();
    await aplicar("TESTE100");
    await screen.findByText("TESTE100");
    assinar();
    expect(await screen.findByText("tela de concluído")).toBeTruthy();
    expect(criarAssinatura).toHaveBeenCalledWith({ plano: "mensal", codigo: "TESTE100", documento: CPF });
    expect(validar).not.toHaveBeenCalled();
    expect(confirmar).not.toHaveBeenCalled();
  });

  it("o servidor pede pagamento e a tela estava sem cartão: avisa, e NÃO vai para a tela de concluído", async () => {
    abrir();
    await aplicar("TESTE100");
    await screen.findByText("TESTE100");
    assinar();
    expect((await screen.findByRole("alert")).textContent).toBe("Não foi possível concluir a assinatura. Confira os dados e tente de novo; se continuar, escreva para suporte@jilsonsantana.com.");
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

  // A COBRANÇA ATRASADA há mais de 3 dias (etapa 4.6b): não se assina de novo por cima — a
  // assinatura continua viva, e o caminho é trocar o cartão dela, em Faturamento e Assinatura.
  it("a conta está com a cobrança atrasada e sem aulas: vai para Faturamento e Assinatura, sem mostrar plano nem botão de assinar", async () => {
    getSituacaoDaAssinatura.mockResolvedValue({ temAcesso: false, reativar: true, atrasada: true });
    abrir();
    expect(await screen.findByText("tela de faturamento e assinatura")).toBeTruthy();
    expect(screen.queryByRole("radio")).toBeNull();
    expect(criarAssinatura).not.toHaveBeenCalled();
  });

  it("o servidor recusa por cobrança atrasada (409) no clique: a tela relê a situação e vai para Faturamento e Assinatura", async () => {
    criarAssinatura.mockRejectedValue(erroDoServidor("CobrancaAtrasada"));
    abrir();
    await screen.findByRole("radio", { name: /Mensal/ });
    getSituacaoDaAssinatura.mockResolvedValue({ temAcesso: false, reativar: true, atrasada: true });
    assinar();
    expect(await screen.findByText("tela de faturamento e assinatura")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
    expect(confirmar).not.toHaveBeenCalled();
  });

  it("o servidor falha: a frase de erro, e nada é confirmado", async () => {
    criarAssinatura.mockRejectedValue(new Error("500"));
    abrir();
    await screen.findByRole("radio", { name: /Mensal/ });
    assinar();
    expect((await screen.findByRole("alert")).textContent).toBe("Não foi possível concluir a assinatura. Confira os dados e tente de novo; se continuar, escreva para suporte@jilsonsantana.com.");
    expect(confirmar).not.toHaveBeenCalled();
  });

  it("muitas tentativas ao assinar: a frase de esperar, e nada é confirmado", async () => {
    criarAssinatura.mockRejectedValue(erroDoServidor("MuitasTentativas"));
    abrir();
    await screen.findByRole("radio", { name: /Mensal/ });
    assinar();
    expect((await screen.findByRole("alert")).textContent).toBe("Muitas tentativas seguidas. Por segurança, espere alguns minutos e tente de novo.");
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

// O PIX PRÉ-PAGO (etapa 4.9, passo 2b — textos aprovados pelo operador em 28/10/2026). O que protege:
//   - a escolha "Como você quer pagar?" só existe quando o servidor diz que o Pix está no ar; o Cartão
//     vem marcado e nada muda no campo nem no resumo;
//   - com o Pix: o código promocional some (e o aplicado é esquecido — o Pix é o preço cheio), o resumo
//     diz "Acesso até" (um mês ou um ano à frente, contado de hoje), o botão diz "Pagar com Pix" e o
//     campo abre com a configuração só-Pix e o valor do plano;
//   - o envio: confere o campo → pede o Pix com SÓ o plano e o CPF → guarda o segredo ANTES de
//     confirmar (para o "QR de novo") → confirma com o tipo pix → tela de concluído;
//   - as recusas do servidor seguem o caminho do cartão (quem já assina relê a situação).
describe("AssinarPage — o Pix pré-pago", () => {
  afterEach(() => vi.useRealTimers());
  const escolherPix = async () => fireEvent.click(await screen.findByRole("radio", { name: /^Pix/ }));

  it("sem o Pix no ar: a escolha não aparece, e o campo abre sem a configuração só-Pix", async () => {
    abrir();
    await screen.findByRole("radio", { name: /Mensal/ });
    expect(screen.queryByText("Como você quer pagar?")).toBeNull();
    expect(screen.queryByRole("radio", { name: /^Pix/ })).toBeNull();
    expect(cartao()?.dataset.pix).toBe("");
    expect(screen.getByRole("button", { name: "Assinar" })).toBeTruthy();
  });

  it("com o Pix no ar: a escolha com os dois textos, o Cartão marcado — e nada muda no campo nem no resumo", async () => {
    getPlanosDaAssinatura.mockResolvedValue(COM_PIX);
    abrir();
    const cartaoRadio = (await screen.findByRole("radio", { name: /^Cartão/ })) as HTMLInputElement;
    expect(screen.getByText("Como você quer pagar?")).toBeTruthy();
    expect(cartaoRadio.checked).toBe(true);
    expect(cartaoRadio.closest("label")?.textContent).toBe("CartãoRenova sozinho todo mês (ou todo ano). Cancele quando quiser.");
    expect(screen.getByRole("radio", { name: /^Pix/ }).closest("label")?.textContent).toBe("PixVocê paga uma vez e estuda por 1 mês ou 1 ano. Não renova sozinho: quando acabar, é só pagar de novo.");
    expect(cartao()?.dataset).toMatchObject({ centavos: "9990", pix: "" });
    expect(naTela()).toContain("Renova todo mês por R$ 99,90, até você cancelar.");
    expect(screen.getByLabelText("Código promocional")).toBeTruthy();
  });

  it("escolher o Pix: o código some, o resumo diz 'Acesso até' (o dia que não existe vira o último do mês), o botão diz 'Pagar com Pix', e o campo abre só com o Pix e o valor do plano", async () => {
    vi.useFakeTimers({ toFake: ["Date"], now: new Date(2026, 0, 31, 12) });
    getPlanosDaAssinatura.mockResolvedValue(COM_PIX);
    abrir();
    await escolherPix();
    expect(screen.queryByLabelText("Código promocional")).toBeNull();
    expect(naTela()).toContain("Acesso até 28/02/2026");
    expect(naTela()).not.toContain("Renova todo mês");
    // A linha do pagamento seguro sem a parte do cartão (decisão do operador, P110, 28/10/2026).
    expect(naTela()).toContain("Pagamento seguro, processado pela Stripe.");
    expect(naTela()).not.toContain("A escola não guarda os dados do seu cartão.");
    expect(screen.getByRole("button", { name: "Pagar com Pix" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Assinar" })).toBeNull();
    expect(cartao()?.dataset).toMatchObject({ centavos: "9990", pix: "pmc_so_pix", chave: "pk_test_da_tela" });
    // O anual: um ano à frente, e o valor dele.
    fireEvent.click(screen.getByRole("radio", { name: /Anual/ }));
    expect(naTela()).toContain("Acesso até 31/01/2027");
    expect(cartao()?.dataset.centavos).toBe("99500");
    // De volta ao cartão: tudo como antes.
    fireEvent.click(screen.getByRole("radio", { name: /^Cartão/ }));
    expect(screen.getByLabelText("Código promocional")).toBeTruthy();
    expect(naTela()).toContain("Renova uma vez por ano por R$ 995,00, até você cancelar.");
    expect(naTela()).toContain("A escola não guarda os dados do seu cartão.");
    expect(cartao()?.dataset.pix).toBe("");
  });

  it("o código aplicado é esquecido ao escolher o Pix: o total volta ao cheio, e o pedido vai sem código", async () => {
    getPlanosDaAssinatura.mockResolvedValue(COM_PIX);
    getPreviaDaAssinatura.mockResolvedValue({ centavosHoje: 4995, moeda: "brl", desconto: { percentual: 50, centavos: null, duracao: "uma-vez", meses: null } });
    abrir();
    await aplicar("METADE");
    await waitFor(() => expect(naTela()).toContain("Total de hojeR$ 49,95"));
    await escolherPix();
    expect(naTela()).toContain("Total de hojeR$ 99,90");
    expect(cartao()?.dataset.centavos).toBe("9990");
    assinar("Pagar com Pix");
    expect(await screen.findByText("tela de concluído")).toBeTruthy();
    expect(pagarComPix).toHaveBeenCalledWith({ plano: "mensal", documento: CPF });
    expect(criarAssinatura).not.toHaveBeenCalled();
  });

  it("o envio no Pix: confere o campo → pede o Pix com SÓ o plano e o CPF → guarda o segredo e a chave ANTES de confirmar → confirma com o tipo pix → tela de concluído", async () => {
    getPlanosDaAssinatura.mockResolvedValue(COM_PIX);
    const ordem: string[] = [];
    let guardadoAntes: unknown = null;
    validar.mockImplementation(async () => (ordem.push("confere"), { ok: true }));
    pagarComPix.mockImplementation(async () => (ordem.push("pede"), PAGAR_PIX));
    confirmar.mockImplementation(async () => (ordem.push("confirma"), (guardadoAntes = lerPix()), { ok: true }));
    abrir();
    await escolherPix();
    fireEvent.click(screen.getByRole("radio", { name: /Anual/ }));
    assinar("Pagar com Pix");
    expect(await screen.findByText("tela de concluído")).toBeTruthy();
    expect(ordem).toEqual(["confere", "pede", "confirma"]);
    expect(pagarComPix).toHaveBeenCalledWith({ plano: "anual", documento: CPF });
    expect(criarAssinatura).not.toHaveBeenCalled();
    // O e-mail de quem paga vai na confirmação — o que o SERVIDOR devolveu, nunca a tela (P113).
    expect(confirmar).toHaveBeenCalledWith("pi_pix_secret_x", "pix", "/aluno/assinar/concluido", { email: "aluno@teste.local" });
    // Com o e-mail que o servidor devolveu: o "QR de novo" gera outro QR com ele quando o anterior venceu (P115).
    expect(guardadoAntes).toEqual({ segredo: "pi_pix_secret_x", chavePublicavel: "pk_test_da_tela", email: "aluno@teste.local" });
    expect(JSON.parse(window.sessionStorage.getItem("jilson.assinar.pix") ?? "null")).toEqual({ segredo: "pi_pix_secret_x", chavePublicavel: "pk_test_da_tela", email: "aluno@teste.local" });
  });

  it("no cartão, com o Pix no ar: nada do Pix é pedido nem guardado", async () => {
    getPlanosDaAssinatura.mockResolvedValue(COM_PIX);
    abrir();
    await screen.findByRole("radio", { name: /^Cartão/ });
    assinar();
    expect(await screen.findByText("tela de concluído")).toBeTruthy();
    expect(pagarComPix).not.toHaveBeenCalled();
    expect(lerPix()).toBeNull();
  });

  it("quem escolheu o Pix, desistiu e pagou por CARTÃO: o Pix guardado na aba é esquecido ANTES de confirmar (a tela de concluído não oferece um QR morto)", async () => {
    getPlanosDaAssinatura.mockResolvedValue(COM_PIX);
    guardarPix({ segredo: "pi_antigo_secret_x", chavePublicavel: "pk_test_da_tela" });
    let guardadoAoConfirmar: unknown = "não lido";
    confirmar.mockImplementation(async () => ((guardadoAoConfirmar = lerPix()), { ok: true }));
    abrir();
    await screen.findByRole("radio", { name: /^Cartão/ });
    assinar();
    expect(await screen.findByText("tela de concluído")).toBeTruthy();
    expect(criarAssinatura).toHaveBeenCalled();
    expect(guardadoAoConfirmar).toBeNull();
    expect(lerPix()).toBeNull();
  });

  it("o servidor diz que a conta já assina (409) no Pix: a tela relê a situação, como no cartão — e nada fica guardado", async () => {
    getPlanosDaAssinatura.mockResolvedValue(COM_PIX);
    pagarComPix.mockRejectedValue(erroDoServidor("JaAssinante"));
    abrir();
    await escolherPix();
    getSituacaoDaAssinatura.mockResolvedValue({ temAcesso: true });
    assinar("Pagar com Pix");
    expect(await screen.findByText("Você já é assinante.")).toBeTruthy();
    expect(confirmar).not.toHaveBeenCalled();
    expect(lerPix()).toBeNull();
  });

  // Um Pix desta conta foi pago e está EM CONFERÊNCIA (a segunda revisão de segurança do passo 6 da 4.9): a
  // frase aprovada pelo operador, por cartão e por Pix — nada de pagar de novo.
  it("um Pix pago em conferência (409 PixEmConferencia): a frase do operador, por cartão e por Pix, e nada confirma", async () => {
    const FRASE = "Recebemos o seu Pix e estamos conferindo o pagamento. Já fomos avisados e vamos responder pelo seu e-mail. Se precisar, escreva para suporte@jilsonsantana.com.";
    getPlanosDaAssinatura.mockResolvedValue(COM_PIX);
    criarAssinatura.mockRejectedValue(erroDoServidor("PixEmConferencia"));
    pagarComPix.mockRejectedValue(erroDoServidor("PixEmConferencia"));
    abrir();
    await screen.findByRole("radio", { name: /Mensal/ });
    assinar();
    expect((await screen.findByRole("alert")).textContent).toBe(FRASE);
    await escolherPix();
    assinar("Pagar com Pix");
    await waitFor(() => expect(pagarComPix).toHaveBeenCalled());
    expect((await screen.findByRole("alert")).textContent).toBe(FRASE);
    expect(confirmar).not.toHaveBeenCalled();
  });
});

describe("AssinarPage — o campo de pagamento que não carregou (E3)", () => {
  it("a frase do operador, e o servidor é avisado com o nome DESTA tela", async () => {
    campoFalha = true;
    abrir();
    await screen.findByRole("radio", { name: /Mensal/ });
    expect(await screen.findByText("O campo de pagamento não carregou. Tente outro navegador ou desative o bloqueador; se continuar, escreva para suporte@jilsonsantana.com.")).toBeTruthy();
    expect(avisarCampoQueNaoAbriu).toHaveBeenCalledWith({ tela: "assinar", motivo: "erro-ao-carregar" });
  });
});
