import { ContentStatus, contarPalavras, MINIMO_DE_PALAVRAS_DA_DESCRICAO } from "@jilson/core";
import type { CourseUpdateInput } from "@jilson/core";
import type { AdminCourseDetail } from "@/lib/api";
import { toPayload, type CourseFormValues } from "@/lib/course-form";
import { contarAulasPublicadas } from "@/lib/course-completeness";

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
  /** Tela que ainda não existe (Mensagens: etapa 4). Sai como texto, nunca link. */
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
    campos: ["learnTags", "requirements", "personas"],
    envia: ["learnTags", "requirements", "personas"],
  },
  // O Conteúdo (módulos e aulas) se salva item a item, como antes: não tem o
  // botão Salvar do passo.
  { slug: "conteudo", label: "Conteúdo", campos: [], envia: [] },
  // As legendas se salvam linha a linha (04/10/2026): sem o Salvar do passo.
  { slug: "legendas", label: "Legendas", campos: [], envia: [] },
  {
    slug: "pagina",
    // "Página do curso" fica para a página PÚBLICA, que o operador confere pelo
    // passo Publicar quando a página definitiva existir (operador, 29/09/2026).
    label: "Mídia e destaques",
    campos: ["thumbnailUrl", "introVideoId", "highlights", "faq", "camadas"],
    envia: ["thumbnailUrl", "introVideoId", "highlights", "faq", "camadas"],
  },
  { slug: "mensagens", label: "Mensagens", planejado: true, campos: [], envia: [] },
  {
    slug: "publicar",
    label: "Publicar",
    // Os materiais exclusivos são marcados aqui (decisão do operador, 04/10/2026).
    campos: ["status", "displayOrder", "materiais"],
    envia: ["status", "displayOrder", "materiais"],
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
    // A mesma cadeia do cartão da lista: aula publicada DENTRO de módulo publicado.
    conteudo: contarAulasPublicadas(curso.modules) > 0,
    pagina: Boolean(curso.thumbnailUrl) && Boolean(curso.introVideoId),
    publicar: curso.status === ContentStatus.PUBLISHED,
  };
  // Seguro: as chaves de `regras` são escritas acima, todas do tipo PassoDoCurso.
  return new Set((Object.keys(regras) as PassoDoCurso[]).filter((slug) => regras[slug]));
}
