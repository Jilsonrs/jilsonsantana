import { describe, it, expect } from "vitest";
import { prisma } from "../lib/prisma.js";

// TODA TABELA DO `public` TEM RLS (CLAUDE.md → Database & Migrations — achado da revisão de segurança do bloco 1 da
// 4.7b, 31/10/2026). A suíte acabou de aplicar TODAS as migrations num banco limpo (`global-setup.ts`): é a prova de
// que o REPOSITÓRIO produz um banco com RLS em toda tabela — inclusive a `_prisma_migrations` —, e não só que um banco
// está certo. Uma migration nova que esqueça o `ENABLE ROW LEVEL SECURITY` reprova aqui, sem depender de lembrar.

describe("RLS em toda tabela", () => {
  it("nenhuma tabela do public sem RLS, depois de todas as migrations", async () => {
    const semRls = await prisma.$queryRaw<{ relname: string }[]>`SELECT relname FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relkind = 'r' AND NOT relrowsecurity ORDER BY relname`;
    expect(semRls.map((t) => t.relname)).toEqual([]);
  });
});
