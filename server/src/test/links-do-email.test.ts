import { describe, it, expect, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import request from "supertest";
import { pt } from "@jilson/core";
import servidor from "./servidor.js";
import { prisma } from "../lib/prisma.js";
import { caminhoDoLink, codigoDoLink } from "../lib/links-do-email.js";
import { LIMITES_DO_VISITANTE } from "../lib/limite-de-tentativas.js";

// AS PÁGINAS DOS LINKS DO E-MAIL (etapa 4.7, passo 9 — decisões do operador, 29/10/2026; textos aprovados em 30/10).
// O que estes testes protegem:
//   - ABRIR NÃO FAZ NADA: só o clique no botão (o POST) cria o lead ou descadastra — os programas de segurança de
//     e-mail abrem os links sozinhos;
//   - "Quero receber novidades" cria o lead DO LEMBRETE, com o e-mail provado; "Descadastrar" descadastra o e-mail (o
//     lead e a caixa da conta), e repetir não muda nada;
//   - o código adulterado, o de outro tipo, o da ficha já apagada: a mesma página de "não vale", e nada muda;
//   - o pedido de outro site é recusado; cada endereço tem um teto de cliques;
//   - todo valor passa por `escapeHtml`; a página fica fora do Google e não fica guardada;
//   - as páginas são montadas ANTES do "Em breve".

const S = `${Date.now()}`;
const t = pt.app.linksDoEmail;
let n = 0;
const novoEmail = () => `links-${++n}-${S}@teste.local`;
const novaFicha = (dados: { email?: string; nome?: string | null; acquisitionSource?: string | null } = {}) =>
  prisma.guestCheckout.create({ data: { id: randomUUID(), email: dados.email ?? novoEmail(), stripeCustomerId: `cus_links_${S}_${++n}`, livemode: false, nome: dados.nome ?? null, acquisitionSource: dados.acquisitionSource ?? null } });
const novoLead = (email = novoEmail()) => prisma.lead.create({ data: { id: randomUUID(), email, origem: "CAIXA_AO_ASSINAR", consentimentoEm: new Date() } });
const DO_SITE = { "sec-fetch-site": "same-origin" };
const clicar = (caminho: string, cabecalhos: Record<string, string> = DO_SITE, endereco = "198.51.100.90") => request(servidor).post(caminho).set(cabecalhos).set("x-forwarded-for", endereco);

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: `-${S}@teste.local` } } });
  await prisma.guestCheckout.deleteMany({ where: { stripeCustomerId: { startsWith: `cus_links_${S}` } } });
  await prisma.lead.deleteMany({ where: { email: { contains: `-${S}@teste.local` } } });
});

describe("Quero receber novidades", () => {
  it("abrir o link mostra a pergunta, com o e-mail e o botão — e NÃO cria o lead; a página fica fora do Google e não fica guardada", async () => {
    const ficha = await novaFicha();
    const res = await request(servidor).get(caminhoDoLink("novidades", ficha.id));
    expect(res.status).toBe(200);
    expect(res.text).toContain(t.novidadesTitulo);
    expect(res.text).toContain(t.novidadesTexto.replace("{email}", ficha.email));
    expect(res.text).toContain(`<form method="post" action="${caminhoDoLink("novidades", ficha.id)}">`);
    expect(res.text).toContain(`>${t.novidadesBotao}</button>`);
    expect(res.text).toContain('<meta name="robots" content="noindex">');
    expect(res.headers["x-robots-tag"]).toBe("noindex");
    expect(res.headers["cache-control"]).toContain("no-store");
    expect(await prisma.lead.findUnique({ where: { email: ficha.email } })).toBeNull();
  });

  it("o clique cria o lead DO LEMBRETE, com o e-mail provado, o nome e o UTM da ficha — e diz que está pronto", async () => {
    const ficha = await novaFicha({ nome: "Gil", acquisitionSource: "youtube" });
    const antes = Date.now();
    const res = await clicar(caminhoDoLink("novidades", ficha.id));
    expect(res.status).toBe(200);
    expect(res.text).toContain(t.pronto);
    expect(res.text).toContain(t.novidadesPronto);
    const lead = await prisma.lead.findUniqueOrThrow({ where: { email: ficha.email } });
    expect([lead.origem, lead.nome, lead.acquisitionSource, lead.descadastradoEm]).toEqual(["LEMBRETE", "Gil", "youtube", null]);
    expect(lead.confirmadoEm?.getTime()).toBeGreaterThanOrEqual(antes);
    expect(lead.consentimentoEm.getTime()).toBeGreaterThanOrEqual(antes);
  });

  it("o pedido de OUTRO SITE é recusado — com e sem o cabeçalho do navegador —, e nada muda", async () => {
    const ficha = await novaFicha();
    const deOutroSite: Array<Record<string, string>> = [{ "sec-fetch-site": "cross-site" }, { "sec-fetch-site": "same-site" }, { origin: "https://outro-site.com" }];
    for (const cabecalhos of deOutroSite) {
      const res = await clicar(caminhoDoLink("novidades", ficha.id), cabecalhos);
      expect(res.status, JSON.stringify(cabecalhos)).toBe(403);
      expect(res.text).toContain(t.naoValeTitulo);
    }
    expect(await prisma.lead.findUnique({ where: { email: ficha.email } })).toBeNull();
  });

  it("o código adulterado, o de descadastrar, o que não é código e o da ficha já apagada: a página de 'não vale' — e nada muda", async () => {
    const ficha = await novaFicha();
    const codigo = codigoDoLink("novidades", ficha.id);
    const adulterado = `${codigo.slice(0, -1)}${codigo.endsWith("A") ? "B" : "A"}`;
    const apagada = await novaFicha();
    await prisma.guestCheckout.delete({ where: { id: apagada.id } });
    for (const caminho of [`/novidades/${adulterado}`, `/novidades/${codigoDoLink("descadastrar", ficha.id)}`, "/novidades/qualquer/coisa", `/novidades/${ficha.id}/${"A".repeat(43)}`, caminhoDoLink("novidades", apagada.id)]) {
      const aberta = await request(servidor).get(caminho);
      expect([aberta.status, aberta.text.includes(t.naoValeTitulo)], caminho).toEqual([404, true]);
      expect(aberta.text).toContain(t.naoValeTexto.replace("{contato}", "suporte@jilsonsantana.com"));
      expect((await clicar(caminho)).status, caminho).toBe(404);
    }
    expect(await prisma.lead.count({ where: { email: { in: [ficha.email, apagada.email] } } })).toBe(0);
  });

  it("todo valor passa por escapeHtml", async () => {
    const ficha = await novaFicha({ email: `<b>marca</b>-${++n}-${S}@teste.local` });
    const res = await request(servidor).get(caminhoDoLink("novidades", ficha.id));
    expect(res.text).toContain("&lt;b&gt;marca&lt;/b&gt;");
    expect(res.text).not.toContain("<b>marca</b>");
  });
});

describe("Descadastrar", () => {
  it("abrir mostra a pergunta com o e-mail — e NÃO descadastra; o clique descadastra o e-mail (o lead e a caixa da conta); repetir não muda a data", async () => {
    const lead = await novoLead();
    await prisma.user.create({ data: { id: `conta-links-${S}-${++n}`, email: lead.email, marketingConsent: true } });
    const aberta = await request(servidor).get(caminhoDoLink("descadastrar", lead.id));
    expect(aberta.status).toBe(200);
    expect(aberta.text).toContain(t.descadastrarTitulo);
    expect(aberta.text).toContain(t.descadastrarTexto.replace("{email}", lead.email));
    expect(aberta.text).toContain(`<form method="post" action="${caminhoDoLink("descadastrar", lead.id)}">`);
    expect((await prisma.lead.findUniqueOrThrow({ where: { id: lead.id } })).descadastradoEm).toBeNull();

    const clique = await clicar(caminhoDoLink("descadastrar", lead.id));
    expect(clique.status).toBe(200);
    expect(clique.text).toContain(t.descadastrarPronto);
    const depois = await prisma.lead.findUniqueOrThrow({ where: { id: lead.id } });
    expect(depois.descadastradoEm).not.toBeNull();
    expect((await prisma.user.findUniqueOrThrow({ where: { email: lead.email } })).marketingConsent).toBe(false);

    expect((await clicar(caminhoDoLink("descadastrar", lead.id))).status).toBe(200);
    expect((await prisma.lead.findUniqueOrThrow({ where: { id: lead.id } })).descadastradoEm?.toISOString()).toBe(depois.descadastradoEm?.toISOString());
  });

  it("o código de 'Quero receber novidades' não descadastra, o de outro site é recusado, e o do lead que não existe dá 'não vale'", async () => {
    const lead = await novoLead();
    expect((await clicar(`/descadastrar/${codigoDoLink("novidades", lead.id)}`)).status).toBe(404);
    expect((await clicar(caminhoDoLink("descadastrar", lead.id), { "sec-fetch-site": "cross-site" })).status).toBe(403);
    expect((await prisma.lead.findUniqueOrThrow({ where: { id: lead.id } })).descadastradoEm).toBeNull();
    expect((await request(servidor).get(caminhoDoLink("descadastrar", randomUUID()))).status).toBe(404);
  });
});

describe("o teto de cliques e o 'Em breve'", () => {
  it("cada endereço tem um teto de cliques: o seguinte é recusado; de outro endereço, passa", async () => {
    const teto = LIMITES_DO_VISITANTE.links.endereco.porJanela;
    const lead = await novoLead();
    for (let i = 0; i < teto; i++) expect((await clicar(caminhoDoLink("descadastrar", lead.id), DO_SITE, "198.51.100.91")).status, `clique ${i + 1}`).toBe(200);
    expect((await clicar(caminhoDoLink("descadastrar", lead.id), DO_SITE, "198.51.100.91")).status).toBe(429);
    expect((await clicar(caminhoDoLink("descadastrar", lead.id), DO_SITE, "198.51.100.92")).status).toBe(200);
  });

  it("as páginas são montadas ANTES do portão do 'Em breve': o link de um e-mail funciona sempre", () => {
    const app = readFileSync(new URL("../app.ts", import.meta.url), "utf8");
    const links = app.indexOf('app.use("/", linksDoEmailRouter);');
    expect(links).toBeGreaterThan(0);
    expect(links).toBeLessThan(app.indexOf("if (hasPreviewCookie(req)) return next();"));
  });
});
