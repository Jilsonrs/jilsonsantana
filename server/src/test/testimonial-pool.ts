import { prisma } from "../lib/prisma.js";

// A home SORTEIA 4 depoimentos por visita (decisão do operador, 23/09/2026).
// Teste que precisa ver UM depoimento específico na página só é determinístico
// se o sorteio for feito sobre um conjunto conhecido: este helper arquiva os
// publicados daquele idioma (inclusive os que a migration semeou) e devolve a
// função que os publica de volta. Chame-a no afterEach — o banco é compartilhado.
export async function isolarDepoimentos(language: "PT" | "EN"): Promise<() => Promise<void>> {
  const ids = (
    await prisma.testimonial.findMany({ where: { language, status: "PUBLISHED" }, select: { id: true } })
  ).map((t) => t.id);
  await prisma.testimonial.updateMany({ where: { id: { in: ids } }, data: { status: "ARCHIVED" } });
  return async () => {
    await prisma.testimonial.updateMany({ where: { id: { in: ids } }, data: { status: "PUBLISHED" } });
  };
}
