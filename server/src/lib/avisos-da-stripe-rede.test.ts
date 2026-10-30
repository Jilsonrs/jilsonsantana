import { describe, it, expect, vi, beforeEach } from "vitest";
import Stripe from "stripe";

// A LISTA DOS AVISOS DA STRIPE (E1 da revisão ampla da cobrança, 29/10/2026), com a biblioteca trocada por um dublê
// do tamanho do que a função usa (só a rede é falsa). O que protege: a rodada pede só os tipos que o endereço de
// avisos assina, no intervalo pedido, em segundos; para no máximo; e a recusa sobe sem a mensagem crua da Stripe.
const falsa = { events: { list: vi.fn(), retrieve: vi.fn() } };
vi.mock("./stripe-cliente.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./stripe-cliente.js")>()),
  stripe: () => falsa,
}));

import { AVISOS_DO_ENDERECO, avisoExisteNaStripe, avisosDaStripe } from "./stripe.js";

/** A lista da biblioteca é percorrida com `for await` (ela pagina sozinha): o dublê entrega os eventos assim. */
const lista = (quantos: number) =>
  (async function* () {
    for (let i = 0; i < quantos; i++) yield { id: `evt_${i}`, type: "invoice.paid", created: 1_000 + i };
  })();

beforeEach(() => {
  falsa.events.list.mockReset();
  falsa.events.retrieve.mockReset();
});

describe("os avisos da Stripe que a rodada confere", () => {
  it("pede só os tipos do endereço de avisos, do intervalo pedido (em segundos), 100 por página", async () => {
    falsa.events.list.mockReturnValue(lista(3));
    const eventos = await avisosDaStripe(new Date("2031-03-01T00:00:00Z"), new Date("2031-03-03T23:50:00Z"), 2_000);
    expect(eventos.map((evento) => evento.id)).toEqual(["evt_0", "evt_1", "evt_2"]);
    expect(falsa.events.list).toHaveBeenCalledWith({
      types: [...AVISOS_DO_ENDERECO],
      created: { gte: Date.UTC(2031, 2, 1) / 1000, lte: Date.UTC(2031, 2, 3, 23, 50) / 1000 },
      limit: 100,
    });
  });

  it("para no máximo pedido", async () => {
    falsa.events.list.mockReturnValue(lista(10));
    expect(await avisosDaStripe(new Date(0), new Date(1), 4)).toHaveLength(4);
  });

  it("a recusa sobe sem a mensagem crua", async () => {
    // Como na biblioteca: a recusa chega quando a lista começa a ser lida (a primeira página), antes de qualquer evento.
    falsa.events.list.mockReturnValue(
      (async function* () {
        throw new Stripe.errors.StripePermissionError({ message: "mensagem crua da Stripe, com sk_live_abc", type: "invalid_request_error", statusCode: 403 });
      })(),
    );
    const erro = await avisosDaStripe(new Date(0), new Date(1), 10).catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(Error);
    expect(String(erro)).toContain("a lista dos avisos da Stripe falhou");
    expect(String(erro)).not.toContain("sk_live_abc");
  });
});

// "ESTE AVISO EXISTE NA STRIPE?" (C1 da revisão do grupo 1, 29/10/2026): é o que separa o segredo trocado (alerta) do
// aviso forjado (só registro). Na dúvida, não — e a recusa nunca sobe com a mensagem crua.
describe("o aviso existe na Stripe?", () => {
  it("a Stripe devolve o aviso: sim — perguntado pelo id", async () => {
    falsa.events.retrieve.mockResolvedValue({ id: "evt_1QaBcD2eFgHiJkLm", object: "event" });
    expect(await avisoExisteNaStripe("evt_1QaBcD2eFgHiJkLm")).toBe(true);
    expect(falsa.events.retrieve).toHaveBeenCalledWith("evt_1QaBcD2eFgHiJkLm");
  });

  it("a Stripe não o conhece (forjado): não, sem registro", async () => {
    const registro = vi.spyOn(console, "warn").mockImplementation(() => {});
    falsa.events.retrieve.mockRejectedValue(new Stripe.errors.StripeInvalidRequestError({ message: "No such event", type: "invalid_request_error", code: "resource_missing", statusCode: 404 }));
    expect(await avisoExisteNaStripe("evt_1QaBcD2eFgHiJkLm")).toBe(false);
    expect(registro).not.toHaveBeenCalled();
    registro.mockRestore();
  });

  it("a Stripe não respondeu: não (a rodada acha o segredo trocado de qualquer jeito), com um registro sem a mensagem crua", async () => {
    const registro = vi.spyOn(console, "warn").mockImplementation(() => {});
    falsa.events.retrieve.mockRejectedValue(new Stripe.errors.StripeAPIError({ message: "mensagem crua da Stripe, com sk_live_abc", type: "api_error", statusCode: 500 }));
    expect(await avisoExisteNaStripe("evt_1QaBcD2eFgHiJkLm")).toBe(false);
    expect(registro).toHaveBeenCalledTimes(1);
    expect(String(registro.mock.calls[0]?.[0])).not.toContain("sk_live_abc");
    registro.mockRestore();
  });
});
