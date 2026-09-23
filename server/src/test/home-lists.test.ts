import { describe, it, expect, afterEach } from "vitest";
import request from "supertest";
import { en } from "@jilson/core";
import app from "../app.js";
import { prisma } from "../lib/prisma.js";

// Depoimentos e perguntas frequentes da home vêm do BANCO (Bloco C3).
//
// A migration do C3 já semeia o conteúdo que estava no ar (PT e EN, publicado),
// então estas linhas existem aqui também. Cada teste cria as SUAS, marcadas, e
// o afterEach apaga só as marcadas: a suíte compartilha UM banco, e linha
// esquecida quebraria outro teste por ordem de execução.

const MARCA = "⟦c3-teste⟧";

afterEach(async () => {
  await prisma.testimonial.deleteMany({ where: { name: { contains: MARCA } } });
  await prisma.faqItem.deleteMany({ where: { question: { contains: MARCA } } });
});

const depoimento = (
  language: "PT" | "EN",
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED",
  text: string,
  displayOrder = 5,
  name = `Pessoa ${MARCA}`,
) => prisma.testimonial.create({ data: { language, status, text, name, displayOrder } });

const pergunta = (
  language: "PT" | "EN",
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED",
  question: string,
  answer = "Resposta de teste.",
) => prisma.faqItem.create({ data: { language, status, question: `${question} ${MARCA}`, answer } });

/** Os blocos JSON-LD da página, já parseados. */
function jsonLds(html: string): Array<Record<string, unknown>> {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(
    (m) => JSON.parse(m[1]) as Record<string, unknown>,
  );
}

describe("home — depoimentos e perguntas vêm do banco", () => {
  it("mostra só o PUBLICADO do idioma da página", async () => {
    await depoimento("PT", "PUBLISHED", "Depoimento publicado em português.");
    await depoimento("PT", "DRAFT", "Depoimento ainda em rascunho.");
    await depoimento("PT", "ARCHIVED", "Depoimento arquivado.");
    await depoimento("EN", "PUBLISHED", "Published testimonial in English.");

    const pt = await request(app).get("/");
    expect(pt.text).toContain("Depoimento publicado em português.");
    expect(pt.text).not.toContain("Depoimento ainda em rascunho.");
    expect(pt.text).not.toContain("Depoimento arquivado.");
    expect(pt.text).not.toContain("Published testimonial in English.");

    const enPage = await request(app).get("/en");
    expect(enPage.text).toContain("Published testimonial in English.");
    expect(enPage.text).not.toContain("Depoimento publicado em português.");
  });

  it("a mesma regra vale para as perguntas frequentes", async () => {
    await pergunta("PT", "PUBLISHED", "Pergunta publicada?");
    await pergunta("PT", "DRAFT", "Pergunta em rascunho?");
    await pergunta("EN", "PUBLISHED", "Published question?");

    const pt = await request(app).get("/");
    expect(pt.text).toContain("Pergunta publicada?");
    expect(pt.text).not.toContain("Pergunta em rascunho?");
    expect(pt.text).not.toContain("Published question?");
  });

  it("a ordem é a do campo Ordem, não a de criação", async () => {
    // Criado PRIMEIRO, mas com ordem maior: tem que aparecer DEPOIS.
    await depoimento("PT", "PUBLISHED", "Vem por último na página.", 999);
    await depoimento("PT", "PUBLISHED", "Vem primeiro na página.", 1);

    const res = await request(app).get("/");
    const primeiro = res.text.indexOf("Vem primeiro na página.");
    const ultimo = res.text.indexOf("Vem por último na página.");
    expect(primeiro).toBeGreaterThan(-1);
    expect(primeiro).toBeLessThan(ultimo);
  });

  it("as iniciais do avatar saem do nome — primeiro e último", async () => {
    await depoimento("PT", "PUBLISHED", "Texto qualquer.", 5, `Ana Maria de Souza ${MARCA}`);

    const res = await request(app).get("/");
    // O último "nome" aqui é a marca do teste, que começa com "⟦".
    expect(res.text).toContain('aria-hidden="true">A⟦</div>');
    // E o seed real, que não tem marca: "Vinicius Dias de Queiroz" → "VQ".
    expect(res.text).toContain('aria-hidden="true">VQ</div>');
  });

  it("sem nada publicado no idioma, as duas seções somem inteiras — título incluído", async () => {
    const depoimentos = await prisma.testimonial.findMany({
      where: { language: "EN", status: "PUBLISHED" },
      select: { id: true },
    });
    const perguntas = await prisma.faqItem.findMany({
      where: { language: "EN", status: "PUBLISHED" },
      select: { id: true },
    });
    const idsD = depoimentos.map((d) => d.id);
    const idsP = perguntas.map((p) => p.id);
    expect(idsD.length).toBeGreaterThan(0);
    expect(idsP.length).toBeGreaterThan(0);

    await prisma.testimonial.updateMany({ where: { id: { in: idsD } }, data: { status: "ARCHIVED" } });
    await prisma.faqItem.updateMany({ where: { id: { in: idsP } }, data: { status: "ARCHIVED" } });
    try {
      const res = await request(app).get("/en");
      expect(res.status).toBe(200);
      expect(res.text).not.toContain(en.home.testimonials.title);
      expect(res.text).not.toContain("testimonials-grid");
      expect(res.text).not.toContain(en.home.faq.title);
      expect(res.text).not.toContain('id="faq"');
      expect(jsonLds(res.text).some((b) => b["@type"] === "FAQPage")).toBe(false);

      // O português não foi tocado e continua com as duas seções.
      const pt = await request(app).get("/");
      expect(pt.text).toContain("testimonials-grid");
      expect(pt.text).toContain('id="faq"');
    } finally {
      await prisma.testimonial.updateMany({ where: { id: { in: idsD } }, data: { status: "PUBLISHED" } });
      await prisma.faqItem.updateMany({ where: { id: { in: idsP } }, data: { status: "PUBLISHED" } });
    }
  });

  it("FAQ ganha JSON-LD FAQPage com exatamente as perguntas da página", async () => {
    const res = await request(app).get("/");

    const faqPage = jsonLds(res.text).find((b) => b["@type"] === "FAQPage");
    expect(faqPage).toBeDefined();
    const perguntas = (faqPage?.mainEntity ?? []) as Array<{ name: string; acceptedAnswer: { text: string } }>;
    const detalhes = [...res.text.matchAll(/<details>/g)].length;

    expect(perguntas.length).toBeGreaterThan(0);
    expect(perguntas.length).toBe(detalhes);
    expect(perguntas.map((p) => p.name)).toContain("Serve para a minha área?");
  });
});

describe("home — o que vem do banco nunca vira HTML", () => {
  it("depoimento com marcação aparece como TEXTO", async () => {
    await depoimento("PT", "PUBLISHED", '<img src=x onerror="alert(1)">');

    const res = await request(app).get("/");
    expect(res.text).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    expect(res.text).not.toContain('<img src=x onerror="alert(1)">');
  });

  it("pergunta com </script> não fecha o bloco do JSON-LD", async () => {
    await pergunta("PT", "PUBLISHED", "</script><script>alert(1)</script>");

    const res = await request(app).get("/");
    expect(res.text).not.toContain("</script><script>alert(1)");
    // E o bloco continua JSON válido, com a pergunta inteira dentro.
    const faqPage = jsonLds(res.text).find((b) => b["@type"] === "FAQPage");
    const nomes = ((faqPage?.mainEntity ?? []) as Array<{ name: string }>).map((p) => p.name);
    expect(nomes.some((n) => n.startsWith("</script><script>alert(1)</script>"))).toBe(true);
  });
});
