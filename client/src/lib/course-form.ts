import { z } from "zod";
import {
  ContentStatus,
  slugSchema,
  levelSchema,
  contentStatusSchema,
  layerSchema,
  materialSchema,
  highlightSchema,
  faqItemSchema,
  contentLanguageSchema,
  enderecoDeImagemValido,
  bunnyVideoIdSchema,
  LIMITES_DO_CURSO,
  type CourseCreateInput,
} from "@jilson/core";
import type { AdminCourseDetail } from "@/lib/api";

// A LÓGICA do formulário de curso do admin: o schema da tela, os valores em
// branco e as duas conversões (curso → formulário, formulário → API). Separada
// da página para ela ficar só compondo as seções (CLAUDE.md → Component
// discipline).

function acimaDoLimite(limite: number): string {
  return `Use no máximo ${limite.toLocaleString("pt-BR")} caracteres.`;
}

const itemDaListaDoFormulario = z.object({
  valor: z
    .string()
    .max(LIMITES_DO_CURSO.itemDaLista, acimaDoLimite(LIMITES_DO_CURSO.itemDaLista)),
});

export const courseFormSchema = z.object({
  slug: slugSchema,
  language: contentLanguageSchema,
  // Os limites são os do servidor (`core`); a tela já trava no número, e o aviso
  // aparece se algo chegar acima (um curso antigo, por exemplo).
  title: z
    .string()
    .min(1, "Obrigatório")
    .max(LIMITES_DO_CURSO.title, acimaDoLimite(LIMITES_DO_CURSO.title)),
  subtitle: z.string().max(LIMITES_DO_CURSO.subtitle, acimaDoLimite(LIMITES_DO_CURSO.subtitle)),
  description: z
    .string()
    .max(LIMITES_DO_CURSO.description, acimaDoLimite(LIMITES_DO_CURSO.description)),
  level: z.union([levelSchema, z.literal("")]),
  // As três listas: um campo por item, até 160 caracteres cada (operador,
  // 28/09/2026). Objeto `{ valor }` porque o `useFieldArray` do react-hook-form
  // precisa de um objeto por item para dar a cada um uma identidade estável.
  learnTags: z.array(itemDaListaDoFormulario),
  requirements: z.array(itemDaListaDoFormulario),
  personas: z.array(itemDaListaDoFormulario),
  highlights: z.array(highlightSchema),
  faq: z.array(faqItemSchema),
  camadas: z.array(layerSchema),
  materiais: z.array(materialSchema),
  // As mensagens do passo Mensagens (04/10/2026). Vazio = nenhuma mensagem.
  welcomeMessage: z.string().max(LIMITES_DO_CURSO.mensagem, acimaDoLimite(LIMITES_DO_CURSO.mensagem)),
  congratsMessage: z.string().max(LIMITES_DO_CURSO.mensagem, acimaDoLimite(LIMITES_DO_CURSO.mensagem)),
  // Mesma regra do servidor (`core`), conferida antes de enviar para o erro
  // aparecer embaixo do campo. Vazio = sem imagem.
  thumbnailUrl: z
    .string()
    .refine(
      (v) => v.trim() === "" || enderecoDeImagemValido(v.trim()),
      "Use um caminho do site que comece com / (ex.: /img/curso.jpg) ou um endereço que comece com https://",
    ),
  // O id do vídeo no Bunny (o envio preenche sozinho). Colado à mão, precisa ter
  // o formato do Bunny, a mesma regra do servidor.
  introVideoId: z
    .string()
    .refine(
      (v) => v.trim() === "" || bunnyVideoIdSchema.safeParse(v.trim()).success,
      "Cole o ID do vídeo como aparece no Bunny (ex.: eb1c4f77-0cda-46be-b47d-1118ad7c2ffe)",
    ),
  displayOrder: z.coerce.number().int(),
  status: contentStatusSchema,
});

export type CourseFormValues = z.infer<typeof courseFormSchema>;

export const blankValues: CourseFormValues = {
  slug: "",
  // Curso novo nasce em português — a escola nasceu em PT. O operador troca no
  // campo Idioma enquanto o curso é rascunho.
  language: "pt",
  title: "",
  subtitle: "",
  description: "",
  level: "",
  learnTags: [],
  requirements: [],
  personas: [],
  highlights: [],
  faq: [],
  camadas: [],
  materiais: [],
  welcomeMessage: "",
  congratsMessage: "",
  thumbnailUrl: "",
  introVideoId: "",
  displayOrder: 0,
  status: ContentStatus.DRAFT,
};

type ItemDaLista = { valor: string };

// Lista vazia abre com UM campo em branco: o operador começa digitando, sem
// precisar achar o "Adicionar item" primeiro. O campo vazio não vai no envio.
function paraItens(lista: string[]): ItemDaLista[] {
  return lista.length > 0 ? lista.map((valor) => ({ valor })) : [{ valor: "" }];
}

/** Os itens na ordem da tela, sem os campos deixados em branco. */
function deItens(itens: ItemDaLista[]): string[] {
  return itens.map((item) => item.valor.trim()).filter(Boolean);
}

export function toFormValues(course: AdminCourseDetail): CourseFormValues {
  return {
    slug: course.slug,
    language: course.language,
    title: course.title,
    subtitle: course.subtitle ?? "",
    description: course.description ?? "",
    level: course.level ?? "",
    learnTags: paraItens(course.learnTags),
    requirements: paraItens(course.requirements),
    personas: paraItens(course.personas),
    highlights: course.highlights ?? [],
    faq: course.faq ?? [],
    camadas: course.camadas,
    materiais: course.materiais ?? [],
    welcomeMessage: course.welcomeMessage ?? "",
    congratsMessage: course.congratsMessage ?? "",
    thumbnailUrl: course.thumbnailUrl ?? "",
    introVideoId: course.introVideoId ?? "",
    displayOrder: course.displayOrder,
    status: course.status,
  };
}

// camadaOverride is intentionally NOT round-tripped here (out of scope —
// CLAUDE.md: it's the exception, not the routine); omitting it from the
// payload leaves it untouched server-side (update schema treats an omitted
// field as "leave unchanged", not "reset").
//
// Campo APAGADO vai como `null`, nunca como ausente: ausente o servidor lê como
// "não mexe", e o valor antigo continuava lá com a tela dizendo "salvo"
// (achado de 29/09/2026). No ID do vídeo, `null` apaga o vídeo no Bunny também.
export function toPayload(values: CourseFormValues): CourseCreateInput {
  return {
    slug: values.slug,
    language: values.language,
    title: values.title,
    subtitle: values.subtitle.trim() || null,
    description: values.description.trim() || null,
    level: values.level === "" ? null : values.level,
    learnTags: deItens(values.learnTags),
    requirements: deItens(values.requirements),
    personas: deItens(values.personas),
    highlights: values.highlights.filter((h) => h.icon.trim() && h.title.trim() && h.text.trim()),
    faq: values.faq.filter((f) => f.pergunta.trim() && f.resposta.trim()),
    camadas: values.camadas,
    materiais: values.materiais,
    welcomeMessage: values.welcomeMessage.trim() || null,
    congratsMessage: values.congratsMessage.trim() || null,
    thumbnailUrl: values.thumbnailUrl.trim() || null,
    introVideoId: values.introVideoId.trim() || null,
    displayOrder: values.displayOrder,
    status: values.status,
  };
}

/**
 * O código de erro que o servidor devolve (`{ error: "SlugTaken" }`), lido do
 * erro do Axios sem depender do Axios aqui: basta a forma `response.data.error`.
 */
export function codigoDoErro(erro: unknown): string | undefined {
  if (typeof erro !== "object" || erro === null || !("response" in erro)) return undefined;
  // Seguro: a linha acima provou que é um objeto com `response`; o resto é opcional.
  const codigo = (erro as { response?: { data?: { error?: unknown } } }).response?.data?.error;
  return typeof codigo === "string" ? codigo : undefined;
}

/**
 * A frase que o formulário mostra quando o salvamento falha. Antes a tela não
 * dizia nada, e a falha passava despercebida (achado da etapa 3c, 24/09/2026).
 * Admin fica em português, com o texto aqui (decisão do operador, 23/09).
 */
export function mensagemDeErroAoSalvar(erro: unknown): string {
  switch (codigoDoErro(erro)) {
    case "SlugTaken":
      return "Este slug já está em uso por outro curso.";
    case "LanguageLocked":
      return "O idioma trava depois que o curso é publicado.";
    case "LanguageInUse":
      return "Este curso está numa trilha de outro idioma. Tire-o da trilha antes de trocar o idioma.";
    case "BunnyNaoApagou":
      return "Não foi possível tirar o vídeo de apresentação: o Bunny não apagou. Tente de novo.";
    default:
      return "Não foi possível salvar o curso. Tente de novo.";
  }
}

/**
 * A frase quando excluir falha. Excluir aula, módulo ou curso apaga no Bunny
 * antes (decisão do operador, 28/09/2026); se o Bunny recusar, nada é excluído
 * e o operador tenta de novo — o que já foi apagado lá não se repete.
 */
export function mensagemAoExcluir(erro: unknown): string {
  return codigoDoErro(erro) === "BunnyNaoApagou"
    ? "Não foi possível excluir: o Bunny não apagou o vídeo ou os arquivos. Tente de novo."
    : "Não foi possível excluir. Tente de novo.";
}
