import "dotenv/config";
import { prisma } from "./lib/prisma.js";

// ── SMOKE SEED — disposable example content (Phase 2 / Block 2) ───────────────
// NOT the launch catalog. It exists only to exercise the read API, the screens
// (Block 5) and E2E. The real "Trilha 1 — Fundamentos (Excel + IA)" is authored
// BY HAND via the admin UI (Block 6) — the operator is the "IA v0".
//
// Everything here is keyed by an `exemplo-` slug and is fully idempotent: courses
// and trilhas are upserted by slug, and their children are wiped + recreated, so
// re-running converges to the same state (stable row counts). To remove it all:
//   prisma.course.deleteMany({ where: { slug: { startsWith: "exemplo-" } } })
//   prisma.learningPlan.deleteMany({ where: { slug: { startsWith: "exemplo-" } } })

type SeedLesson = { title: string; tags: string[] };
type SeedModule = {
  title: string;
  layer: "UNIVERSAL" | "MODERNO" | "IA";
  lessons: SeedLesson[];
};

// Upsert a PUBLISHED course by slug, then reset its module/lesson subtree.
async function seedCourse(
  slug: string,
  data: {
    title: string;
    subtitle?: string;
    description?: string;
    level?: "INICIANTE" | "INTERMEDIARIO" | "AVANCADO";
    learnTags?: string[];
    requirements?: string[];
    personas?: string[];
    highlights?: { icon: string; title: string; text: string }[];
    faq?: { pergunta: string; resposta: string }[];
    camadas?: ("UNIVERSAL" | "MODERNO" | "IA")[];
    status: "DRAFT" | "PUBLISHED";
    displayOrder?: number;
    modules?: SeedModule[];
  },
): Promise<number> {
  const { modules = [], ...fields } = data;
  const course = await prisma.course.upsert({
    where: { slug },
    update: fields,
    create: { slug, ...fields },
  });

  // Reset the subtree (cascade removes lessons) so re-runs stay idempotent.
  await prisma.module.deleteMany({ where: { courseId: course.id } });
  for (const [mi, m] of modules.entries()) {
    const mod = await prisma.module.create({
      data: {
        courseId: course.id,
        title: m.title,
        layer: m.layer,
        displayOrder: mi,
        status: "PUBLISHED",
      },
    });
    for (const [li, lesson] of m.lessons.entries()) {
      await prisma.lesson.create({
        data: {
          moduleId: mod.id,
          title: lesson.title,
          tags: lesson.tags,
          displayOrder: li,
          status: "PUBLISHED",
        },
      });
    }
  }
  return course.id;
}

async function main(): Promise<void> {
  // A published example course with all three camadas (to exercise the selo).
  const courseId = await seedCourse("exemplo-fundamentos-excel-ia", {
    title: "Exemplo — Fundamentos de Excel + IA",
    subtitle: "Da lógica de fórmulas ao copiloto de IA, num só lugar.",
    description:
      "Curso de exemplo (smoke seed) para exercitar a plataforma. Substitua pela autoria real no admin.",
    level: "INTERMEDIARIO",
    learnTags: ["Fórmulas dinâmicas", "PROCX", "Tabelas dinâmicas", "IA aplicada"],
    requirements: ["Ter o Excel instalado", "Noções básicas de planilha"],
    personas: ["Analistas de dados", "Profissionais administrativos", "Quem quer migrar pra dados"],
    highlights: [
      { icon: "stack-2", title: "Base que não quebra", text: "Fundamentos que rodam em qualquer versão." },
      { icon: "bolt", title: "Recursos modernos", text: "PROCX e matrizes dinâmicas na prática." },
      { icon: "sparkles", title: "IA do seu lado", text: "Gere lógica e destrave erros com o JilsonAI." },
    ],
    faq: [
      { pergunta: "Preciso do Excel 365?", resposta: "Não para a base; alguns recursos modernos pedem versões recentes." },
    ],
    camadas: ["UNIVERSAL", "MODERNO", "IA"],
    status: "PUBLISHED",
    displayOrder: 0,
    modules: [
      {
        title: "Base Lógica Inquebrável",
        layer: "UNIVERSAL",
        lessons: [
          { title: "SE, E, OU e a ordem de execução", tags: ["se", "logica", "formulas"] },
          { title: "PROCV e ÍNDICE+CORRESP", tags: ["procv", "indice", "corresp", "busca"] },
        ],
      },
      {
        title: "Copiloto de Fórmulas (IA)",
        layer: "IA",
        lessons: [
          { title: "Escrevendo prompts para gerar fórmulas", tags: ["ia", "prompt", "claude", "formulas"] },
        ],
      },
    ],
  });

  // A DRAFT course — proves the public catalog excludes it (and 404s on detail).
  await seedCourse("exemplo-rascunho", {
    title: "Exemplo — Rascunho (não publicado)",
    status: "DRAFT",
    displayOrder: 99,
  });

  // A curated trilha (template) pointing at the published course (free-mix item).
  const plan = await prisma.learningPlan.upsert({
    where: { slug: "exemplo-fundamentos" },
    update: {
      name: "Exemplo — Trilha Fundamentos",
      description: "Trilha de exemplo (smoke seed).",
      isTemplate: true,
      skillsCovered: ["Excel", "Análise de dados", "IA aplicada"],
      status: "PUBLISHED",
      displayOrder: 0,
    },
    create: {
      slug: "exemplo-fundamentos",
      name: "Exemplo — Trilha Fundamentos",
      description: "Trilha de exemplo (smoke seed).",
      isTemplate: true,
      skillsCovered: ["Excel", "Análise de dados", "IA aplicada"],
      status: "PUBLISHED",
      displayOrder: 0,
    },
  });

  await prisma.planModule.deleteMany({ where: { planId: plan.id } });
  const pm = await prisma.planModule.create({
    data: { planId: plan.id, title: "Comece por aqui", displayOrder: 0 },
  });
  await prisma.planItem.create({
    data: { planModuleId: pm.id, itemType: "COURSE", courseId, displayOrder: 0 },
  });

  const [courses, modules, lessons, plans, planItems] = await Promise.all([
    prisma.course.count(),
    prisma.module.count(),
    prisma.lesson.count(),
    prisma.learningPlan.count(),
    prisma.planItem.count(),
  ]);
  console.log("Smoke seed complete:", { courses, modules, lessons, plans, planItems });
}

main()
  .catch((err) => {
    console.error("Content seed failed:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
