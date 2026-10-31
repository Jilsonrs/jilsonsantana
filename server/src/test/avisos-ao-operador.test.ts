import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import type { PedidoDeEmail, Envio } from "../lib/email.js";

// O AVISO AO OPERADOR (etapa 4.7b, passo 2d — decisão do operador, P137). Só o balcão de e-mail vira dublê; o resto roda
// contra o banco. O que protege:
//   - o URGENTE aberto e não avisado sai num e-mail a cada admin (o e-mail do banco), uma vez só; o não urgente, não;
//   - se nenhum e-mail saiu, a marca volta, e a próxima vez tenta de novo — e também se algo falhar depois de tomar os
//     casos; as contas de admin são lidas ANTES de tomá-los (revisão de segurança do bloco 2, 31/10/2026);
//   - o caso REABERTO sai com outra chave: a do primeiro aviso faria o Resend descartar o e-mail novo (a mesma revisão);
//   - o caso urgente aberto por um aviso da Stripe sai ao fim do processamento dele (fora da transação);
//   - o resumo da manhã: só às 12h UTC, só se houver caso aberto, um por dia (a chave do dia).
const enviarEmail = vi.fn<(pedido: PedidoDeEmail) => Promise<Envio>>();
vi.mock("../lib/email.js", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/email.js")>()),
  enviarEmail: (pedido: PedidoDeEmail) => enviarEmail(pedido),
}));

import { prisma, QuemFez, TipoDeCaso } from "../lib/prisma.js";
import { abrirCaso } from "../lib/casos.js";
import { avisarUrgentes, chaveDosUrgentes, ehHoraDoResumo, mandarResumoDosCasos, mensagemDosUrgentes } from "../lib/avisos-ao-operador.js";
import { fecharCaso } from "../lib/casos.js";
import { depoisDoAviso } from "../lib/depois-do-aviso.js";

const S = `${Date.now()}`;
const DIA = 24 * 60 * 60 * 1000;
let emailDoAdmin = "";
const doTipo = (tipo: string) => enviarEmail.mock.calls.map(([p]) => p).filter((p) => p.tipo === tipo);

beforeAll(async () => {
  emailDoAdmin = (process.env.SEED_ADMIN_EMAIL ?? "").toLowerCase();
  // Os casos de outros testes já não importam aqui: começa sem nenhum aberto.
  await prisma.billingCase.updateMany({ where: { open: true }, data: { open: false, closedAt: new Date() } });
});

beforeEach(() => {
  enviarEmail.mockReset().mockResolvedValue({ enviado: true, id: "re_teste" });
});

afterAll(async () => {
  await prisma.billingCase.deleteMany({ where: { key: { contains: S } } });
});

describe("o aviso dos casos urgentes", () => {
  it("o urgente sai num e-mail ao admin, uma vez só; o não urgente, não", async () => {
    await abrirCaso({ tipo: TipoDeCaso.CONTESTACAO, chave: `du:${S}_1`, urgente: true, detalhe: "aberta · fraudulent" });
    await abrirCaso({ tipo: TipoDeCaso.COBRANCA_EM_ABERTO, chave: `fatura:${S}_1`, urgente: false, detalhe: "não anulada" });
    expect(await avisarUrgentes()).toBe(1);
    const [email] = doTipo("casos-urgentes");
    expect(email?.para).toBe(emailDoAdmin);
    expect(email?.mensagem.assunto).toBe("Precisa de atendente: 1 caso urgente na cobrança");
    expect(email?.mensagem.paragrafos).toContain("Contestação no banco — aberta · fraudulent");
    expect(JSON.stringify(email?.mensagem)).not.toContain("não anulada");
    expect(await avisarUrgentes()).toBe(0);
    expect(doTipo("casos-urgentes")).toHaveLength(1);
  });

  it("nenhum e-mail saiu: a marca volta, e a próxima vez tenta de novo", async () => {
    await abrirCaso({ tipo: TipoDeCaso.DEVOLUCAO_FALHOU, chave: `pagamento:${S}_2`, urgente: true });
    enviarEmail.mockResolvedValueOnce({ enviado: false, motivo: "falhou" });
    expect(await avisarUrgentes()).toBe(0);
    expect((await prisma.billingCase.findUniqueOrThrow({ where: { kind_key: { kind: TipoDeCaso.DEVOLUCAO_FALHOU, key: `pagamento:${S}_2` } } })).notifiedAt).toBeNull();
    expect(await avisarUrgentes()).toBe(1);
    expect(doTipo("casos-urgentes")).toHaveLength(2);
  });

  it("o caso REABERTO depois do aviso sai de novo, com OUTRA chave — o mesmo lote, com a mesma", async () => {
    const alvo = { tipo: TipoDeCaso.CONTESTACAO, chave: `du:${S}_reaberto` };
    await abrirCaso({ ...alvo, urgente: true, detalhe: "aberta · fraudulent" });
    expect(await avisarUrgentes()).toBe(1);
    await fecharCaso(alvo, { quem: QuemFez.OPERADOR, nota: "respondida" });
    await abrirCaso({ ...alvo, urgente: true, detalhe: "aberta · fraudulent" });
    expect(await avisarUrgentes()).toBe(1);
    const [primeiro, segundo] = doTipo("casos-urgentes");
    expect(primeiro?.chave).toMatch(/^casos-urgentes\/[^/]+\/[0-9a-f]{32}$/);
    expect(segundo?.chave).not.toBe(primeiro?.chave);
  });

  it("a chave: o mesmo lote, o mesmo texto e o mesmo admin dão a mesma; reaberto, outro texto ou outro admin, outra", () => {
    const mensagem = mensagemDosUrgentes([{ kind: "CONTESTACAO", detail: "aberta" }]);
    const lote = [{ id: 7, openedAt: new Date("2026-11-02T10:00:00Z") }, { id: 3, openedAt: new Date("2026-11-01T10:00:00Z") }];
    const chave = chaveDosUrgentes("admin-1", lote, mensagem);
    expect(chaveDosUrgentes("admin-1", [...lote].reverse(), mensagem)).toBe(chave);
    expect(chaveDosUrgentes("admin-1", [lote[0]!, { id: 3, openedAt: new Date("2026-11-02T11:00:00Z") }], mensagem)).not.toBe(chave);
    expect(chaveDosUrgentes("admin-1", lote, mensagemDosUrgentes([{ kind: "CONTESTACAO", detail: "ganha" }]))).not.toBe(chave);
    expect(chaveDosUrgentes("admin-2", lote, mensagem)).not.toBe(chave);
  });

  it("a leitura das contas de admin falhou: nada fica marcado — e algo que falhe DEPOIS de tomar os casos devolve a marca", async () => {
    const alvo = { tipo: TipoDeCaso.DEVOLUCAO_FALHOU, chave: `pagamento:${S}_falhas` };
    await abrirCaso({ ...alvo, urgente: true });
    const marca = async () => (await prisma.billingCase.findUniqueOrThrow({ where: { kind_key: { kind: alvo.tipo, key: alvo.chave } } })).notifiedAt;
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const contas = vi.spyOn(prisma.user, "findMany").mockRejectedValueOnce(new Error("o banco caiu"));
    expect(await avisarUrgentes()).toBe(0);
    expect(contas).toHaveBeenCalled();
    contas.mockRestore();
    expect(await marca()).toBeNull();
    enviarEmail.mockRejectedValueOnce(new Error("o envio quebrou"));
    expect(await avisarUrgentes()).toBe(0);
    expect(await marca()).toBeNull();
    expect(await avisarUrgentes()).toBe(1);
    expect(await marca()).not.toBeNull();
  });

  it("o caso urgente aberto por um aviso da Stripe sai ao fim do processamento dele", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const sub = `sub_${S}_3`;
    await depoisDoAviso({ id: `evt_${S}_3`, tipo: "customer.subscription.updated", assinatura: sub }, { resultado: "sem-conta", assinatura: { id: sub, status: "active", pagoAte: new Date(Date.now() + 10 * DIA), clienteId: `cus_${S}`, userId: null, livemode: false }, motivo: "conta inexistente" });
    expect(doTipo("casos-urgentes").map((p) => p.mensagem.paragrafos.join(" "))).toEqual([expect.stringContaining("Pagou e está sem conta")]);
  });

  it("a mensagem: o nome da tela, o botão que leva a ela, o plural, e no máximo 30 casos listados (o resto, no painel)", () => {
    const muitos = Array.from({ length: 32 }, () => ({ kind: "CONTESTACAO", detail: null }));
    const mensagem = mensagemDosUrgentes(muitos);
    expect(mensagem.assunto).toBe("Precisa de atendente: 32 casos urgentes na cobrança");
    expect(mensagem.titulo).toBe("Precisa de atendente");
    expect(mensagem.paragrafos[0]).toBe("Estes casos da cobrança precisam de atendente agora:");
    expect(mensagemDosUrgentes(muitos.slice(0, 1)).paragrafos[0]).toBe("Este caso da cobrança precisa de atendente agora:");
    // O botão abre a tela no admin (Financeiro → Receita — o endereço do menu e da rota do app).
    expect(mensagem.botao?.texto).toBe("Abrir Precisa de atendente");
    expect(new URL(mensagem.botao?.endereco ?? "http://x/sem-botao").pathname).toBe("/admin/financeiro/receita/precisa-de-atendente");
    expect(mensagem.paragrafos).toHaveLength(1 + 30 + 1);
    expect(mensagem.paragrafos[31]).toBe("E mais 2, no painel.");
  });
});

describe("o resumo da manhã", () => {
  it("só às 12h UTC (9h em Brasília)", () => {
    expect(ehHoraDoResumo(new Date("2026-11-02T12:05:00Z"))).toBe(true);
    expect(ehHoraDoResumo(new Date("2026-11-02T11:59:00Z"))).toBe(false);
  });

  it("com caso aberto: um e-mail com todos (os urgentes primeiro), com a chave do dia; sem nenhum aberto, nada", async () => {
    const agora = new Date("2026-11-02T12:05:00Z");
    expect(await mandarResumoDosCasos(agora)).toBe(true);
    const [resumo] = doTipo("resumo-dos-casos");
    expect(resumo?.chave).toMatch(/\/2026-11-02$/);
    expect(resumo?.mensagem.titulo).toBe("O resumo da manhã");
    expect(resumo?.mensagem.paragrafos[1]).toMatch(/^(Contestação no banco|Devolução que falhou|Pagou e está sem conta)/);
    await prisma.billingCase.updateMany({ where: { open: true }, data: { open: false, closedAt: new Date() } });
    enviarEmail.mockClear();
    expect(await mandarResumoDosCasos(agora)).toBe(false);
    expect(enviarEmail).not.toHaveBeenCalled();
  });
});
