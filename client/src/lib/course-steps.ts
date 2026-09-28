import { ContentStatus, contarPalavras, MINIMO_DE_PALAVRAS_DA_DESCRICAO } from "@jilson/core";
import type { CourseUpdateInput } from "@jilson/core";
import type { AdminCourseDetail } from "@/lib/api";
import { toPayload, type CourseFormValues } from "@/lib/course-form";

// OS PASSOS DO EDITOR DO CURSO (Bloco E, etapa 1 — decisões do operador, 27–28/09/2026):
// a ordem é a de PREENCHIMENTO ("ir completando; quando chegar no final está
// pronto para publicar"), e cada passo salva só a parte dele. O mapa de
// navegação monta o nível 2 a partir desta lista. Admin fica em português, com
// o texto aqui (decisão de 23/09).

export type PassoDoCurso =
  | "basico"
  | "para-quem-e"
  | "conteudo"
  | "legendas"
  | "pagina"
  | "mensagens"
  | "publicar";

type CampoDoPayload = keyof CourseUpdateInput;

type Passo = {
  slug: PassoDoCurso;
  label: string;
  /** Tela que ainda não existe (Legendas: etapa 3; Mensagens: etapa 4). Sai como texto, nunca link. */
  planejado?: true;
  /** Os campos do formulário que o passo confere antes de salvar. */
  campos: (keyof CourseFormValues)[];
  /** O que o passo manda ao servidor — SÓ isto (o PATCH aceita envio parcial). */
  envia: CampoDoPayload[];
};

export const PASSOS_DO_CURSO: Passo[] = [
  {
    slug: "basico",
    label: "Informações básicas",
    campos: ["title", "subtitle", "slug", "description", "language", "level"],
    envia: ["title", "subtitle", "slug", "description", "language", "level"],
  },
  {
    slug: "para-quem-e",
    label: "Para quem é",
    campos: ["learnTagsText", "requirementsText", "personasText"],
    envia: ["learnTags", "requirements", "personas"],
  },
  // O Conteúdo (módulos e aulas) se salva item a item, como antes: não tem o
  // botão Salvar do passo.
  { slug: "conteudo", label: "Conteúdo", campos: [], envia: [] },
  { slug: "legendas", label: "Legendas", planejado: true, campos: [], envia: [] },
  {
    slug: "pagina",
    label: "Página do curso",
    campos: ["thumbnailUrl", "introVideoId", "highlights", "faq", "camadas"],
    envia: ["thumbnailUrl", "introVideoId", "highlights", "faq", "camadas"],
  },
  { slug: "mensagens", label: "Mensagens", planejado: true, campos: [], envia: [] },
  {
    slug: "publicar",
    label: "Publicar",
    campos: ["status", "displayOrder"],
    envia: ["status", "displayOrder"],
  },
];

export function passoDoCurso(slug: PassoDoCurso): Passo {
  // Seguro: `PassoDoCurso` é exatamente a lista de slugs acima.
  return PASSOS_DO_CURSO.find((p) => p.slug === slug)!;
}

/** O pedaço do curso que ESTE passo envia — nenhum campo de outro passo vai junto. */
export function payloadDoPasso(values: CourseFormValues, slug: PassoDoCurso): CourseUpdateInput {
  const completo = toPayload(values);
  const payload: CourseUpdateInput = {};
  for (const campo of passoDoCurso(slug).envia) {
    Object.assign(payload, { [campo]: completo[campo] });
  }
  return payload;
}

/** Aula publicada DENTRO de módulo publicado — a mesma cadeia do cartão da lista. */
function temAulaPublicada(curso: AdminCourseDetail): boolean {
  return curso.modules.some(
    (m) => m.status === ContentStatus.PUBLISHED && m.lessons.some((l) => l.status === ContentStatus.PUBLISHED),
  );
}

/**
 * Os passos COMPLETOS, lidos do curso GRAVADO — nunca do formulário: o ✓ diz o
 * que está salvo. As regras são do operador (28/09/2026).
 */
export function passosConcluidos(curso: AdminCourseDetail): Set<PassoDoCurso> {
  const regras: Partial<Record<PassoDoCurso, boolean>> = {
    basico:
      curso.title.trim() !== "" &&
      (curso.subtitle ?? "").trim() !== "" &&
      curso.level !== null &&
      contarPalavras(curso.description) >= MINIMO_DE_PALAVRAS_DA_DESCRICAO,
    "para-quem-e": curso.learnTags.length > 0 && curso.requirements.length > 0 && curso.personas.length > 0,
    conteudo: temAulaPublicada(curso),
    pagina: Boolean(curso.thumbnailUrl) && Boolean(curso.introVideoId),
    publicar: curso.status === ContentStatus.PUBLISHED,
  };
  // Seguro: as chaves de `regras` são escritas acima, todas do tipo PassoDoCurso.
  return new Set((Object.keys(regras) as PassoDoCurso[]).filter((slug) => regras[slug]));
}
