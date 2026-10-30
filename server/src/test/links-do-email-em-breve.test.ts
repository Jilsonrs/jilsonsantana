import { describe, it, expect, vi, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import request from "supertest";
import { pt } from "@jilson/core";
import { prisma } from "../lib/prisma.js";
import { caminhoDoLink } from "../lib/links-do-email.js";

// O LINK DO E-MAIL COM O "EM BREVE" LIGADO (etapa 4.7, passo 9). O portão do "Em breve" só existe em PRODUÇÃO
// (`app.ts`), e o site é montado na hora em que o arquivo é carregado: este teste carrega um site NOVO em modo de
// produção, com o portão ligado, e confere que a página do link abre (o link de um e-mail funciona sempre — o de
// descadastrar, por lei) enquanto a home fica atrás do portão. Num arquivo à parte: o site de produção não se mistura
// com o dos outros testes.

const S = `${Date.now()}`;
const AMBIENTE = ["NODE_ENV", "COMING_SOON"] as const;
const antes = Object.fromEntries(AMBIENTE.map((nome) => [nome, process.env[nome]]));

afterAll(async () => {
  for (const nome of AMBIENTE) {
    if (antes[nome] === undefined) delete process.env[nome];
    else process.env[nome] = antes[nome];
  }
  vi.resetModules();
  await prisma.lead.deleteMany({ where: { email: { endsWith: `-${S}@teste.local` } } });
});

describe("com o 'Em breve' ligado, em produção", () => {
  it("a página do link do e-mail abre; a home fica atrás do portão", async () => {
    const lead = await prisma.lead.create({ data: { id: randomUUID(), email: `em-breve-${S}@teste.local`, origem: "CAIXA_AO_ASSINAR", consentimentoEm: new Date() } });
    process.env.NODE_ENV = "production";
    process.env.COMING_SOON = "true";
    vi.resetModules();
    const { default: servidor } = (await import("./servidor.js")) as { default: Server };

    const link = await request(servidor).get(caminhoDoLink("descadastrar", lead.id));
    expect(link.status).toBe(200);
    expect(link.text).toContain(pt.app.linksDoEmail.descadastrarTitulo);

    // A prova de que o portão está ligado neste site: a home não chega (a seção dos cursos é da home).
    const home = await request(servidor).get("/");
    expect(home.text).not.toContain('id="cursos"');
  });
});
