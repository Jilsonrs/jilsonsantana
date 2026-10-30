import { afterEach, describe, expect, it } from "vitest";
import { loadTestEnv } from "./test-env.js";

// A SUÍTE NUNCA MANDA E-MAIL DE VERDADE (decisão do operador, 30/10/2026, na P126). Em 26/10/2026 a suíte rodou num
// terminal com a chave do Resend e mandou dezenas de boas-vindas para endereços `@teste.local`, que voltaram e pesam na
// reputação do domínio de envio. A trava fica no `loadTestEnv` (o preparo de cada arquivo de teste): sem a chave, o
// balcão de e-mail não envia. O envio de verdade se prova de propósito, nos roteiros de prova — nunca na suíte.
describe("a suíte sem e-mail de verdade", () => {
  const noComeco = process.env.RESEND_API_KEY;

  afterEach(() => {
    if (noComeco === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = noComeco;
  });

  it("montar o ambiente da suíte tira a chave do Resend — venha ela do terminal ou do .env.test", () => {
    process.env.RESEND_API_KEY = "re_chave_do_terminal";
    loadTestEnv();
    expect(process.env.RESEND_API_KEY).toBeUndefined();
  });

  it("e cada arquivo de teste já começa sem ela", () => {
    expect(noComeco).toBeUndefined();
  });
});
