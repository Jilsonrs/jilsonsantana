import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import servidor from "./servidor.js";
import { prisma } from "../lib/prisma.js";

// O TEXTO DE UMA CAMADA SÓ, SOBRESCRITO NUM CURSO (`camadaOverride` — a exceção, como o N8N).
// O curso sobrescreve a camada que quiser, não as três. No Zod 4 o `z.record` com as camadas
// como chave passou a EXIGIR as três; este teste reprova se ele voltar (26/10/2026).

const S = `-camada-${Date.now()}`;
let admin: string[] = [];
let cursoId = 0;

beforeAll(async () => {
  const res = await request(servidor).post("/api/auth/sign-in/email").send({
    email: process.env.SEED_ADMIN_EMAIL,
    password: process.env.SEED_ADMIN_PASSWORD,
  });
  admin = (res.headers["set-cookie"] as unknown as string[] | undefined) ?? [];
  cursoId = (await prisma.course.create({ data: { slug: `curso${S}`, title: "Curso", status: "DRAFT" } })).id;
});

afterAll(async () => {
  await prisma.course.deleteMany({ where: { slug: { endsWith: S } } });
});

const salvar = (corpo: object) => request(servidor).patch(`/api/courses/${cursoId}`).set("Cookie", admin).send(corpo);
const gravado = async () => (await prisma.course.findUniqueOrThrow({ where: { id: cursoId }, select: { camadaOverride: true } })).camadaOverride;

describe("o texto de uma camada sobrescrito no curso", () => {
  it("uma camada só: grava, e as outras ficam com o texto global", async () => {
    const res = await salvar({ camadaOverride: { IA: { name: "IA no N8N" } } });
    expect(res.status).toBe(200);
    expect(await gravado()).toEqual({ IA: { name: "IA no N8N" } });
  });

  it("uma camada que não existe: 400, e nada muda", async () => {
    const res = await salvar({ camadaOverride: { INVENTADA: { name: "x" } } });
    expect(res.status).toBe(400);
    expect(await gravado()).toEqual({ IA: { name: "IA no N8N" } });
  });
});
