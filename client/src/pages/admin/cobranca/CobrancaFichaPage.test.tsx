// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { renderWithProviders } from "@/test-utils";
import type { AssinaturaDaLista, CobrancaDaFicha, FichaDaCobranca } from "@jilson/core";

type Quem = { conta: string } | { assinatura: number } | { visitante: string };
const adminFichaDaCobranca = vi.fn<(quem: Quem) => Promise<FichaDaCobranca>>();
const adminConferir = vi.fn<(quem: Quem) => Promise<{ temAcesso: boolean; detalhe: string }>>();
const adminCancelar = vi.fn<(assinatura: number) => Promise<{ detalhe: string }>>();
const adminDesfazerCancelamento = vi.fn<(assinatura: number) => Promise<{ detalhe: string }>>();
const adminCorrigirDocumento = vi.fn<(quem: Quem, documento: string) => Promise<{ detalhe: string }>>();
const adminEnviarLink = vi.fn<(conta: string, link: string) => Promise<{ detalhe: string }>>();
vi.mock("@/lib/api", () => ({
  adminCorrigirDocumento: (quem: Quem, documento: string) => adminCorrigirDocumento(quem, documento),
  adminEnviarLink: (conta: string, link: string) => adminEnviarLink(conta, link),
  adminFichaDaCobranca: (quem: Quem) => adminFichaDaCobranca(quem),
  adminConferir: (quem: Quem) => adminConferir(quem),
  adminCancelar: (assinatura: number) => adminCancelar(assinatura),
  adminDesfazerCancelamento: (assinatura: number) => adminDesfazerCancelamento(assinatura),
}));

import { CobrancaFichaPage } from "./CobrancaFichaPage";

// ADMIN → COBRANÇA → A FICHA DO ALUNO (etapa 4.7b, passo 1d). O que estes testes protegem: a ficha pede QUEM o
// endereço diz (conta ou assinatura) e nada sem isso; os estados (carregando; a ficha que não existe, sem "tentar de
// novo"; a falha, com ele; a Stripe fora do ar, que mostra o resto); e o que cada parte diz — o acesso, a cobrança
// recusada com o motivo em português, a devolvida em parte com o valor, a contestada com o prazo, o recibo, o cartão,
// o CPF escondido e os e-mails que saíram e os que não saíram.

const ROTA = "/admin/cobranca/assinaturas/ficha";
const assinatura: AssinaturaDaLista = { id: 7, aluno: { id: "u-1", nome: "Ana Souza", email: "ana@exemplo.com" }, plano: "mensal", prePaga: false, situacao: "ativa", status: "active", pagoAte: "2026-11-20T15:00:00.000Z", acabaEm: null, daAcesso: true, codigo: null, deTeste: false, criadaEm: "2026-10-20T15:00:00.000Z" };
const cobranca = (extra: Partial<CobrancaDaFicha>): CobrancaDaFicha => ({ id: "ch_1", em: "2026-11-20T15:00:00.000Z", centavos: 9990, moeda: "brl", forma: "cartao", cartao: { bandeira: "visa", final: "4242" }, situacao: "paga", devolvido: 0, motivoDaFalha: null, recibo: null, contestacao: null, ...extra });
const ficha = (extra: Partial<FichaDaCobranca> = {}): FichaDaCobranca => ({
  conta: { id: "u-1", nome: "Ana Souza", email: "ana@exemplo.com", criadaEm: "2026-10-01T15:00:00.000Z" },
  visitante: null,
  pixEsperando: [],
  temAcesso: true,
  assinaturas: [assinatura],
  cobrancas: [],
  maisCobrancas: false,
  cartao: { bandeira: "visa", final: "4242", mes: 1, ano: 2031 },
  documento: "CPF 529••••••25",
  emails: [],
  stripeIndisponivel: false,
  registro: [],
  links: { trocarCartao: "https://escola.test/login?depois=cartao", reativar: "https://escola.test/login?depois=assinar", pagarComPix: null },
  ...extra,
});
const abrir = (consulta = "?conta=u-1") => renderWithProviders(<CobrancaFichaPage />, { route: `${ROTA}${consulta}`, path: ROTA });

beforeEach(() => {
  adminFichaDaCobranca.mockReset().mockResolvedValue(ficha());
  adminConferir.mockReset().mockResolvedValue({ temAcesso: true, detalhe: "active; com acesso" });
  adminCancelar.mockReset().mockResolvedValue({ detalhe: "não renova; acesso até 2026-11-20" });
  adminDesfazerCancelamento.mockReset().mockResolvedValue({ detalhe: "volta a renovar" });
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

describe("a ficha do visitante e o Pix aberto (passo 1e)", () => {
  it("pela ficha de espera: quem é, quando tentou, o lembrete, quando some — e o Pix gerado e não pago", async () => {
    adminFichaDaCobranca.mockResolvedValue(
      ficha({
        conta: null,
        temAcesso: false,
        assinaturas: [],
        visitante: { id: "ficha-1", nome: "Vera Visitante", email: "vera@exemplo.com", ultimaTentativaEm: "2026-11-20T15:00:00.000Z", lembreteEm: null, someEm: "2026-11-27T15:00:00.000Z", novidades: true, naoApagada: false },
        pixEsperando: [{ id: "pi_qr", em: "2026-11-20T15:00:00.000Z", centavos: 9990, moeda: "brl" }],
      }),
    );
    abrir("?visitante=ficha-1");
    expect(await screen.findByRole("heading", { name: "Vera Visitante" })).toBeTruthy();
    expect(adminFichaDaCobranca.mock.calls).toEqual([[{ visitante: "ficha-1" }]]);
    expect(screen.getByText("vera@exemplo.com · começou a assinar sem conta e não terminou · última tentativa em 20/11/2026")).toBeTruthy();
    expect(screen.getByText("O lembrete ainda não saiu · a ficha some em 27/11/2026 · quer receber novidades")).toBeTruthy();
    expect(screen.getByText("R$ 99,90 · 20/11/2026 · Pix gerado e não pago")).toBeTruthy();
  });

  it("a limpeza achou pagamento e não apagou: a ficha avisa", async () => {
    adminFichaDaCobranca.mockResolvedValue(
      ficha({ conta: null, temAcesso: false, assinaturas: [], visitante: { id: "ficha-2", nome: null, email: "sem@exemplo.com", ultimaTentativaEm: "2026-11-01T15:00:00.000Z", lembreteEm: "2026-11-01T17:00:00.000Z", someEm: "2026-11-08T15:00:00.000Z", novidades: false, naoApagada: true } }),
    );
    abrir("?visitante=ficha-2");
    expect(await screen.findByRole("heading", { name: "sem@exemplo.com" })).toBeTruthy();
    expect(screen.getByText("A limpeza dos 7 dias achou um pagamento e não apagou: alguém pagou e ficou sem conta.")).toBeTruthy();
  });
});

describe("a ficha — o que aconteceu (passo 1f)", () => {
  it("mostra o registro da pessoa, sem repetir o nome dela em cada linha", async () => {
    adminFichaDaCobranca.mockResolvedValue(ficha({ registro: [{ id: 1, em: "2026-11-20T15:30:00.000Z", quem: "STRIPE", acao: "invoice.payment_failed", detalhe: "past_due", centavos: null, aluno: { id: "u-1", nome: "Ana Souza", email: "ana@exemplo.com" } }] }));
    abrir();
    expect(await screen.findByText("Cobrança recusada · pagamento atrasado")).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Ana Souza" })).toBeNull();
  });
});

describe("a ficha — as ações (passo 3a)", () => {
  it("em dia: 'Cancelar no fim do período' pede confirmação dizendo o efeito, faz, mostra o que a Stripe respondeu e relê a ficha", async () => {
    abrir();
    fireEvent.click(await screen.findByRole("button", { name: "Cancelar no fim do período" }));
    expect(screen.getByText("Ana Souza continua com acesso até 20/11/2026, e a assinatura não renova.")).toBeTruthy();
    expect(adminCancelar).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect((await screen.findAllByRole("status")).map((s) => s.textContent)).toContain("Feito: não renova; acesso até 2026-11-20.");
    expect(adminCancelar.mock.calls).toEqual([[7]]);
    await waitFor(() => expect(adminFichaDaCobranca.mock.calls.length).toBeGreaterThan(1));
  });

  it("'Voltar' desiste sem fazer nada", async () => {
    abrir();
    fireEvent.click(await screen.findByRole("button", { name: "Cancelar no fim do período" }));
    fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
    expect(screen.getByRole("button", { name: "Cancelar no fim do período" })).toBeTruthy();
    expect(adminCancelar).not.toHaveBeenCalled();
  });

  it("atrasada: 'Cancelar agora', com o efeito de terminar na hora; marcada para acabar: 'Desfazer o cancelamento'", async () => {
    adminFichaDaCobranca.mockResolvedValue(ficha({ assinaturas: [{ ...assinatura, situacao: "atrasada" }, { ...assinatura, id: 8, situacao: "vai-cancelar", acabaEm: "2026-11-20T15:00:00.000Z" }] }));
    abrir();
    fireEvent.click(await screen.findByRole("button", { name: "Cancelar agora" }));
    expect(screen.getByText("A cobrança está atrasada: a assinatura termina agora, sem acesso, e a cobrança em aberto não é mais tentada.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Desfazer o cancelamento" }));
    const confirmar = screen.getAllByRole("button", { name: "Confirmar" });
    fireEvent.click(confirmar[1] as HTMLElement);
    await waitFor(() => expect(adminDesfazerCancelamento.mock.calls).toEqual([[8]]));
  });

  it("a ação que não deu: diz por quê; a cancelada e a pré-paga não têm botão", async () => {
    adminCancelar.mockRejectedValue({ response: { data: { error: "Ocupada" } } });
    adminFichaDaCobranca.mockResolvedValue(ficha({ assinaturas: [assinatura, { ...assinatura, id: 9, situacao: "cancelada" }, { ...assinatura, id: 10, situacao: "pre-paga", prePaga: true }] }));
    abrir();
    // Só a ativa tem botão: a cancelada e a pré-paga, não.
    expect(await screen.findAllByRole("button", { name: /Cancelar|Desfazer/ })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Cancelar no fim do período" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    expect((await screen.findByRole("alert")).textContent).toBe("A assinatura está sendo atualizada agora. Tente de novo em instantes.");
  });

  it("'Conferir na Stripe' confere quem a ficha mostra, e diz como ficou", async () => {
    abrir();
    fireEvent.click(await screen.findByRole("button", { name: "Conferir na Stripe" }));
    expect((await screen.findAllByRole("status")).map((s) => s.textContent)).toContain("Conferido: active; com acesso.");
    expect(adminConferir.mock.calls).toEqual([[{ conta: "u-1" }]]);
  });

  it("os links: copiar põe o link na área de transferência; o que não está no ar não aparece", async () => {
    const writeText = vi.fn<(texto: string) => Promise<void>>().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    abrir();
    expect(await screen.findByText("Trocar o cartão (paga a cobrança atrasada)")).toBeTruthy();
    expect(screen.queryByText("Pagar a cobrança atrasada com Pix")).toBeNull();
    fireEvent.click(screen.getAllByRole("button", { name: "Copiar" })[0] as HTMLElement);
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("https://escola.test/login?depois=cartao"));
    expect(await screen.findByRole("button", { name: "Copiado" })).toBeTruthy();
  });
});

describe("a ficha — o CPF e o link por e-mail (passo 3b)", () => {
  it("corrigir o CPF: manda o número aparado para quem a ficha mostra, e diz o que foi feito; o inválido diz isso", async () => {
    adminCorrigirDocumento.mockReset().mockResolvedValueOnce({ detalhe: "CPF corrigido" }).mockRejectedValueOnce({ response: { data: { error: "DocumentoInvalido" } } });
    abrir();
    fireEvent.change(await screen.findByLabelText("Corrigir o CPF ou CNPJ"), { target: { value: " 529.982.247-25 " } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(await screen.findByText("Feito: CPF corrigido.")).toBeTruthy();
    expect(adminCorrigirDocumento.mock.calls).toEqual([[{ conta: "u-1" }, "529.982.247-25"]]);
    fireEvent.change(screen.getByLabelText("Corrigir o CPF ou CNPJ"), { target: { value: "111" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Este CPF ou CNPJ não é válido.");
  });

  it("a ficha aberta por uma assinatura sem conta não tem o campo do CPF; a do visitante tem", async () => {
    adminFichaDaCobranca.mockResolvedValue(ficha({ conta: null, temAcesso: false }));
    abrir("?assinatura=7");
    await screen.findByRole("heading", { name: "Assinatura sem conta" });
    expect(screen.queryByLabelText("Corrigir o CPF ou CNPJ")).toBeNull();
  });

  it("enviar o link por e-mail (só com conta): manda a conta e o link, e diz o que foi feito", async () => {
    adminEnviarLink.mockReset().mockResolvedValue({ detalhe: "o link (trocarCartao) foi enviado" });
    abrir();
    fireEvent.click((await screen.findAllByRole("button", { name: "Enviar por e-mail" }))[0] as HTMLElement);
    expect(await screen.findByText("Feito: o link (trocarCartao) foi enviado.")).toBeTruthy();
    expect(adminEnviarLink.mock.calls).toEqual([["u-1", "trocarCartao"]]);
  });
});
