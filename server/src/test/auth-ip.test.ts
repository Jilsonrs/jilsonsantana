import { describe, it, expect } from "vitest";
import { auth } from "../lib/auth.js";

// GUARDA DE CONFIGURAÇÃO — e é exceção consciente à regra de "testar
// comportamento". O comportamento (cada pessoa ter o próprio limite de login)
// só existe em PRODUÇÃO: o rate-limit é desligado fora dela, e ligá-lo aqui
// faria toda a suíte de login bater no limite. A prova de comportamento está no
// plano (BLOQUEIO DO GO-LIVE): o aviso do balde compartilhado sumir do log da
// Railway, e errar a senha 3 vezes numa rede sem travar o login na outra.
//
// O que este teste impede: alguém remover a linha achando que o default cobre.
// Sem ela, o login volta ao balde único EM SILÊNCIO — nenhum outro teste
// reprova, e a escola trava na primeira pessoa que errar a senha 3 vezes.
describe("rate-limit do login — de onde vem o IP", () => {
  it("lê SÓ o x-real-ip, que a Railway sobrescreve", () => {
    expect(auth.options.advanced?.ipAddress?.ipAddressHeaders).toEqual(["x-real-ip"]);
  });

  it("nunca confia num cabeçalho que o visitante consegue escrever", () => {
    // Medido em produção (23/09/2026): estes três repassam o valor forjado.
    const cabecalhos = auth.options.advanced?.ipAddress?.ipAddressHeaders ?? [];
    for (const perigoso of ["fastly-client-ip", "true-client-ip", "cf-connecting-ip"]) {
      expect(cabecalhos).not.toContain(perigoso);
    }
  });
});
