import { describe, it, expect } from "vitest";
import { createServer, request } from "node:http";
import type { AddressInfo } from "node:net";
import { desligarComCalma } from "./desligar.js";

// A troca de servidor na publicação (06/10/2026): o pedido que estava no meio
// termina antes de o servidor sair.

function pedir(porta: number): Promise<{ status: number; corpo: string }> {
  return new Promise((resolver, rejeitar) => {
    const pedido = request({ host: "127.0.0.1", port: porta, path: "/" }, (resposta) => {
      let corpo = "";
      resposta.on("data", (parte) => (corpo += parte));
      resposta.on("end", () => resolver({ status: resposta.statusCode ?? 0, corpo }));
    });
    pedido.on("error", rejeitar);
    pedido.end();
  });
}

describe("desligarComCalma", () => {
  it("o pedido em andamento termina inteiro; só depois o servidor sai", async () => {
    let responder: () => void = () => {};
    let avisarQueChegou: () => void = () => {};
    const chegou = new Promise<void>((avisar) => (avisarQueChegou = avisar));
    const servidor = createServer((_req, res) => {
      responder = () => res.end("aula concluída");
      avisarQueChegou();
    });
    await new Promise<void>((pronto) => servidor.listen(0, "127.0.0.1", pronto));
    const porta = (servidor.address() as AddressInfo).port;

    const resposta = pedir(porta);
    await chegou;

    let saiu = false;
    const terminou = new Promise<void>((avisar) =>
      desligarComCalma(servidor, () => {
        saiu = true;
        avisar();
      }),
    );
    await new Promise((r) => setTimeout(r, 50));
    expect(saiu).toBe(false); // ainda há um pedido no meio

    responder();
    expect(await resposta).toEqual({ status: 200, corpo: "aula concluída" });
    await terminou;
    expect(saiu).toBe(true);
  });
});
