import axios from "axios";
import type { CredenciaisDeEnvio, DadosDoEnvio } from "@/lib/video-upload";
import type {
  Level,
  Layer,
  ContentStatus,
  PlanItemType,
  CourseCreateInput,
  CourseUpdateInput,
  CourseStructureInput,
  LessonInsertInput,
  ModuleInsertInput,
  LessonKind,
  ModuleCreateInput,
  ModuleUpdateInput,
  LessonCreateInput,
  LessonUpdateInput,
  LanguageCode,
  Dict,
  TestimonialCreateInput,
  TestimonialUpdateInput,
  HomeFaqCreateInput,
  HomeFaqUpdateInput,
} from "@jilson/core";

// Same-origin by design (mirrors auth-client.ts): in dev the Vite proxy
// forwards /api -> :3000; in prod Express serves the client from the same
// origin. withCredentials so the better-auth session cookie rides along on
// member-only writes (e.g. saveTrilha).
const client = axios.create({ baseURL: "/api", withCredentials: true });

// ── Response shapes ──────────────────────────────────────────────────────────
// Mirror the `select`/`include` shape of each server route exactly (courses.ts,
// trilhas.ts, lessons.ts, search.ts) — no transformation to replicate.

export type CourseCard = {
  id: number;
  slug: string;
  title: string;
  subtitle: string | null;
  level: Level | null;
  thumbnailUrl: string | null;
  camadas: Layer[];
  displayOrder: number;
  moduleCount: number;
  lessonCount: number;
};

export type CourseLesson = { id: number; title: string; tags: string[]; displayOrder: number };
export type CourseModule = {
  id: number;
  title: string;
  layer: Layer | null;
  displayOrder: number;
  status: ContentStatus;
  lessons: CourseLesson[];
};

export type Highlight = { icon: string; title: string; text: string };
export type FaqItem = { pergunta: string; resposta: string };

export type CourseDetail = {
  id: number;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  level: Level | null;
  learnTags: string[];
  requirements: string[];
  personas: string[];
  highlights: Highlight[] | null;
  faq: FaqItem[] | null;
  camadas: Layer[];
  thumbnailUrl: string | null;
  introVideoId: string | null;
  // O player do vídeo de apresentação, montado no SERVIDOR (null sem vídeo, ou
  // sem a biblioteca configurada neste ambiente).
  introVideoEmbedUrl: string | null;
  modules: CourseModule[];
  moduleCount: number;
  lessonCount: number;
};

export type TrilhaCard = {
  id: number;
  slug: string | null;
  name: string;
  description: string | null;
  skillsCovered: string[];
  displayOrder: number;
  _count: { planModules: number };
};

export type PlanItemCourseRef = {
  id: number;
  slug: string;
  title: string;
  subtitle: string | null;
  level: Level | null;
  thumbnailUrl: string | null;
  camadas: Layer[];
};
export type PlanItemLessonRef = { id: number; title: string; tags: string[] };

export type PlanItemDetail = {
  id: number;
  itemType: PlanItemType;
  displayOrder: number;
  course: PlanItemCourseRef | null;
  lesson: PlanItemLessonRef | null;
};

export type PlanModuleDetail = {
  id: number;
  title: string;
  displayOrder: number;
  items: PlanItemDetail[];
};

export type TrilhaDetail = {
  id: number;
  slug: string | null;
  name: string;
  description: string | null;
  skillsCovered: string[];
  planModules: PlanModuleDetail[];
};

// Trilha SALVA pelo aluno (clone de uma curada). Não é `TrilhaCard`: o clone
// não carrega slug — é alcançado por id (`/trilhas/mine/:id`) — e carrega
// `sourcePlanId`, que diz de qual trilha curada ele saiu.
export type MyTrilhaSummary = {
  id: number;
  name: string;
  description: string | null;
  skillsCovered: string[];
  sourcePlanId: number | null;
  displayOrder: number;
  _count: { planModules: number };
};

export type SearchLessonResult = {
  id: number;
  title: string;
  tags: string[];
  module: { title: string; course: { slug: string; title: string } };
};

export type SearchResult = {
  query: string;
  trilhas: Pick<TrilhaCard, "id" | "slug" | "name" | "description">[];
  courses: Pick<CourseCard, "id" | "slug" | "title" | "subtitle" | "level" | "thumbnailUrl" | "camadas">[];
  lessons: SearchLessonResult[];
};

// ── Admin (any status — never exposed by the public reads above) ───────────

export type AdminCourseCard = {
  id: number;
  slug: string;
  title: string;
  status: ContentStatus;
  language: LanguageCode;
  displayOrder: number;
  moduleCount: number;
  lessonCount: number;
  // O PREENCHIMENTO do cartão do admin (27/09/2026). O vídeo vem como sim/não e a
  // descrição como número de palavras (curta abaixo de 200 — 28/09); aulas
  // publicadas contam a cadeia (aula publicada em módulo publicado).
  thumbnailUrl: string | null;
  hasIntroVideo: boolean;
  descriptionWordCount: number;
  publishedLessonCount: number;
  /** Aulas de VÍDEO publicadas na cadeia ainda sem vídeo (o quinto item, 28/09). */
  lessonsWithoutVideo: number;
};

export type AdminLesson = {
  id: number;
  moduleId: number;
  title: string;
  kind: LessonKind;
  /** O texto da aula de texto (Markdown); null na aula de vídeo. */
  content: string | null;
  /** O vídeo da aula no Bunny (só o admin vê) e o envio em andamento. */
  bunnyVideoId: string | null;
  bunnyVideoPendingId: string | null;
  /** O Bunny já confirmou que o vídeo está pronto: no editor, a aula volta recolhida (29/09/2026). */
  bunnyVideoReady: boolean;
  /** Prévia grátis: a aula toca para qualquer visitante (etapa 4 do Bloco U). */
  isFreePreview: boolean;
  tags: string[];
  displayOrder: number;
  status: ContentStatus;
};

export type AdminModule = {
  id: number;
  courseId: number;
  title: string;
  layer: Layer | null;
  displayOrder: number;
  status: ContentStatus;
  lessons: AdminLesson[];
};

export type AdminCourseDetail = {
  id: number;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  level: Level | null;
  learnTags: string[];
  requirements: string[];
  personas: string[];
  highlights: Highlight[] | null;
  faq: FaqItem[] | null;
  camadas: Layer[];
  thumbnailUrl: string | null;
  introVideoId: string | null;
  // O player do vídeo de apresentação, montado no SERVIDOR (null sem vídeo, ou
  // sem a biblioteca configurada neste ambiente).
  introVideoEmbedUrl: string | null;
  displayOrder: number;
  status: ContentStatus;
  language: LanguageCode;
  modules: AdminModule[];
};

export async function adminGetCourses(): Promise<AdminCourseCard[]> {
  const { data } = await client.get<AdminCourseCard[]>("/admin/courses");
  return data;
}

export async function adminGetCourse(id: number): Promise<AdminCourseDetail> {
  const { data } = await client.get<AdminCourseDetail>(`/admin/courses/${id}`);
  return data;
}

export async function createCourse(input: CourseCreateInput): Promise<AdminCourseDetail> {
  const { data } = await client.post<AdminCourseDetail>("/courses", input);
  return data;
}

export async function updateCourse(id: number, input: CourseUpdateInput): Promise<AdminCourseDetail> {
  const { data } = await client.patch<AdminCourseDetail>(`/courses/${id}`, input);
  return data;
}

export async function deleteCourse(id: number): Promise<void> {
  await client.delete(`/courses/${id}`);
}

// O "+" entre dois itens (Bloco E, etapa 2): a aula ou o módulo nasce NA POSIÇÃO.
export async function insertLesson(moduleId: number, input: LessonInsertInput): Promise<AdminLesson> {
  const { data } = await client.post<AdminLesson>(`/admin/modules/${moduleId}/lessons`, input);
  return data;
}

export async function insertModule(courseId: number, input: ModuleInsertInput): Promise<AdminModule> {
  const { data } = await client.post<AdminModule>(`/admin/courses/${courseId}/modules`, input);
  return data;
}

// A ORDEM INTEIRA de módulos e aulas do curso, numa gravação só (Bloco E, etapa 2).
export async function updateCourseStructure(id: number, input: CourseStructureInput): Promise<void> {
  await client.put(`/admin/courses/${id}/estrutura`, input);
}

// O envio do vídeo de apresentação começa no servidor, que cria o vídeo no
// Bunny e devolve só a assinatura; o arquivo vai direto para o Bunny
// (`lib/video-upload.ts`).
export async function startIntroVideoUpload(id: number, titulo: string): Promise<CredenciaisDeEnvio> {
  const { data } = await client.post<CredenciaisDeEnvio>(`/admin/courses/${id}/intro-video`, { titulo });
  return data;
}

// O envio terminou: o vídeo em andamento vira o vídeo do curso, e o servidor
// apaga no Bunny o vídeo que ele substituiu (decisão do operador, 27/09/2026).
export async function completeIntroVideoUpload(
  id: number,
  videoId: string,
): Promise<{ introVideoId: string; introVideoEmbedUrl: string | null }> {
  const { data } = await client.post<{ introVideoId: string; introVideoEmbedUrl: string | null }>(
    `/admin/courses/${id}/intro-video/complete`,
    { videoId },
  );
  return data;
}

// O VÍDEO DE CADA AULA (Bloco U, etapa 3): o envio tem a mesma forma da
// apresentação. No editor não há player (como a Udemy — operador, 28/09/2026):
// a aula mostra o RESUMO do vídeo, lido no Bunny pelo servidor.
export async function startLessonVideoUpload(lessonId: number, titulo: string): Promise<DadosDoEnvio> {
  const { data } = await client.post<DadosDoEnvio>(`/admin/lessons/${lessonId}/video`, { titulo });
  return data;
}

export async function completeLessonVideoUpload(lessonId: number, videoId: string): Promise<{ bunnyVideoId: string }> {
  const { data } = await client.post<{ bunnyVideoId: string }>(`/admin/lessons/${lessonId}/video/complete`, { videoId });
  return data;
}

export type ResumoDoVideoDaAula = {
  pronto: boolean;
  falhou: boolean;
  nome: string | null;
  duracaoEmSegundos: number | null;
  miniaturaUrl: string | null;
};

export async function getLessonVideo(lessonId: number): Promise<{ video: ResumoDoVideoDaAula | null }> {
  const { data } = await client.get<{ video: ResumoDoVideoDaAula | null }>(`/admin/lessons/${lessonId}/video`);
  return data;
}

// A PÁGINA DA AULA (etapa 4 do Bloco U, 29/09/2026). O aluno lê pela rota da
// trava (só o publicado; o conteúdo só vem liberado); o admin, pela rota de
// admin (qualquer status). A tela não decide acesso: mostra o que o servidor mandou.
export type AulaNaLista = {
  id: number;
  title: string;
  kind: LessonKind;
  isFreePreview: boolean;
  status: ContentStatus;
  temArquivos: boolean;
};
export type ArquivoDaAula = { id: number; originalName: string; sizeBytes: number };
export type PaginaDaAula = {
  curso: {
    id: number;
    slug: string;
    title: string;
    language: "pt" | "en";
    status: ContentStatus;
    modulos: { id: number; title: string; status: ContentStatus; aulas: AulaNaLista[] }[];
  };
  aula: {
    id: number;
    title: string;
    kind: LessonKind;
    isFreePreview: boolean;
    status: ContentStatus;
    moduloId: number;
    liberada: boolean;
    /** Os arquivos são só para assinante, inclusive na prévia grátis (operador, 29/09/2026). */
    arquivosLiberados: boolean;
    playerUrl?: string | null;
    texto?: string | null;
    arquivos?: ArquivoDaAula[];
  };
};

export async function getLessonPage(lessonId: number, comoAdmin: boolean): Promise<PaginaDaAula> {
  const rota = comoAdmin ? `/admin/lessons/${lessonId}/aula` : `/lessons/${lessonId}/aula`;
  const { data } = await client.get<PaginaDaAula>(rota);
  return data;
}

/** O link de download: mesmo site, então o cookie vai junto e o arquivo vem com o nome original. */
export function enderecoDoArquivo(lessonId: number, fileId: number, comoAdmin: boolean): string {
  return comoAdmin ? `/api/admin/lesson-files/${fileId}/download` : `/api/lessons/${lessonId}/files/${fileId}`;
}

// OS ARQUIVOS PARA BAIXAR de cada aula (Bloco E, etapa 2, parte 2e): o admin
// envia e exclui. O arquivo vai CRU no corpo, e o nome original no cabeçalho.
export type AdminLessonFile = { id: number; originalName: string; sizeBytes: number; createdAt: string };

export async function listLessonFiles(lessonId: number): Promise<AdminLessonFile[]> {
  const { data } = await client.get<AdminLessonFile[]>(`/admin/lessons/${lessonId}/files`);
  return data;
}

export async function uploadLessonFile(
  lessonId: number,
  arquivo: File,
  aoProgredir: (porcentagem: number) => void = () => {},
): Promise<AdminLessonFile> {
  const { data } = await client.post<AdminLessonFile>(`/admin/lessons/${lessonId}/files`, arquivo, {
    headers: { "Content-Type": "application/octet-stream", "X-Nome-Do-Arquivo": encodeURIComponent(arquivo.name) },
    // Sem limite de tamanho (operador, 29/09/2026): um .zip grande sem porcentagem parece travado.
    onUploadProgress: (e) => {
      if (e.total) aoProgredir(Math.round((e.loaded * 100) / e.total));
    },
  });
  return data;
}

export async function deleteLessonFile(fileId: number): Promise<void> {
  await client.delete(`/admin/lesson-files/${fileId}`);
}

// O Bunny já terminou de processar o vídeo? A prévia do admin pergunta até ficar pronto.
export async function getIntroVideoStatus(videoId: string): Promise<{ pronto: boolean; falhou: boolean }> {
  const { data } = await client.get<{ pronto: boolean; falhou: boolean }>(`/admin/intro-video/${videoId}/status`);
  return data;
}

// A capa vai CRUA no corpo, com o tipo do arquivo no cabeçalho; o servidor
// confere o conteúdo, manda para o Bunny Storage e grava o endereço no curso.
export async function uploadCourseThumbnail(id: number, file: File): Promise<{ thumbnailUrl: string }> {
  const { data } = await client.post<{ thumbnailUrl: string }>(`/admin/courses/${id}/thumbnail`, file, {
    headers: { "Content-Type": file.type },
  });
  return data;
}

export async function createModule(input: ModuleCreateInput): Promise<AdminModule> {
  const { data } = await client.post<AdminModule>("/modules", input);
  return data;
}

export async function updateModule(id: number, input: ModuleUpdateInput): Promise<AdminModule> {
  const { data } = await client.patch<AdminModule>(`/modules/${id}`, input);
  return data;
}

export async function deleteModule(id: number): Promise<void> {
  await client.delete(`/modules/${id}`);
}

export async function createLesson(input: LessonCreateInput): Promise<AdminLesson> {
  const { data } = await client.post<AdminLesson>("/lessons", input);
  return data;
}

export async function updateLesson(id: number, input: LessonUpdateInput): Promise<AdminLesson> {
  const { data } = await client.patch<AdminLesson>(`/lessons/${id}`, input);
  return data;
}

export async function deleteLesson(id: number): Promise<void> {
  await client.delete(`/lessons/${id}`);
}

// ── Calls ─────────────────────────────────────────────────────────────────────

// As listas de DESCOBERTA pedem o idioma do app (`?lang=`); sem ele o servidor
// devolve português. O link direto (por slug) não leva idioma: abre sempre.
export async function getCourses(lang: LanguageCode = "pt"): Promise<CourseCard[]> {
  const { data } = await client.get<CourseCard[]>("/courses", { params: { lang } });
  return data;
}

export async function getCourseBySlug(slug: string): Promise<CourseDetail> {
  const { data } = await client.get<CourseDetail>(`/courses/${slug}`);
  return data;
}

export async function getTrilhas(lang: LanguageCode = "pt"): Promise<TrilhaCard[]> {
  const { data } = await client.get<TrilhaCard[]>("/trilhas", { params: { lang } });
  return data;
}

export async function getTrilhaBySlug(slug: string): Promise<TrilhaDetail> {
  const { data } = await client.get<TrilhaDetail>(`/trilhas/${slug}`);
  return data;
}

// ── Trilhas do próprio aluno (exigem sessão; o servidor filtra por dono) ─────

export async function getMyTrilhas(): Promise<MyTrilhaSummary[]> {
  const { data } = await client.get<MyTrilhaSummary[]>("/trilhas/mine");
  return data;
}

// A árvore da trilha salva tem a MESMA forma da curada (`planTreeInclude` no
// servidor), por isso reusa `TrilhaDetail` em vez de um tipo paralelo que
// precisaria ser mantido em sincronia com ele.
export async function getMyTrilha(id: number): Promise<TrilhaDetail> {
  const { data } = await client.get<TrilhaDetail>(`/trilhas/mine/${id}`);
  return data;
}

export async function search(q: string, lang: LanguageCode = "pt"): Promise<SearchResult> {
  const { data } = await client.get<SearchResult>("/search", { params: { q, lang } });
  return data;
}

export async function saveTrilha(planId: number): Promise<{ id: number }> {
  const { data } = await client.post<{ id: number }>(`/trilhas/${planId}/save`);
  return data;
}

// ── Texto de página (admin) ─────────────────────────────────────────────────
// A lista vem do DICIONÁRIO, não do banco: todo campo aparece, editado ou não.
// `factory` é o valor de fábrica (o código); `override` é o que o operador
// gravou, ou null. Ver docs/content.md § 16.

export type SiteTextValue = { factory: string; override: string | null };
export type SiteTextField = {
  key: string;
  section: string;
  pt: SiteTextValue;
  en: SiteTextValue;
};

export async function adminGetSiteText(): Promise<SiteTextField[]> {
  const { data } = await client.get<{ campos: SiteTextField[] }>("/admin/site-text");
  return data.campos;
}

export async function adminUpdateSiteText(input: {
  key: string;
  language: LanguageCode;
  value: string;
}): Promise<void> {
  await client.put("/admin/site-text", input);
}

// Os textos COMUNS (menu e rodapé) já com as edições do operador — leitura
// pública. É por aqui que o rodapé do app mostra o MESMO texto do rodapé da
// home. Quem salva em Admin → Textos invalida esta chave, para o rodapé do
// próprio operador mudar na hora.
export type CommonTexts = Dict["common"];
export const COMMON_TEXTS_QUERY = "site-text-common";

export async function getCommonTexts(lang: LanguageCode): Promise<CommonTexts> {
  const { data } = await client.get<CommonTexts>(`/site-text/common/${lang}`);
  return data;
}

// O idioma do app, gravado na CONTA de quem está logado.
export async function updateMyLanguage(language: LanguageCode): Promise<void> {
  await client.patch("/me/language", { language });
}

// ---------------------------------------------------------------------------
// Depoimentos e perguntas frequentes da home (Bloco C3) — admin-only.
// A lista traz os DOIS idiomas e TODOS os status; a tela filtra o idioma.
// Excluir apaga a linha de vez (LGPD); esconder é mudar o status.

type ItemDaHome = {
  id: number;
  language: LanguageCode;
  displayOrder: number;
  status: ContentStatus;
  createdAt: string;
  updatedAt: string;
};
export type AdminTestimonial = ItemDaHome & { text: string; name: string };
export type AdminHomeFaq = ItemDaHome & { question: string; answer: string };

export async function adminGetTestimonials(): Promise<AdminTestimonial[]> {
  const { data } = await client.get<AdminTestimonial[]>("/admin/testimonials");
  return data;
}
export async function adminCreateTestimonial(input: TestimonialCreateInput): Promise<AdminTestimonial> {
  const { data } = await client.post<AdminTestimonial>("/admin/testimonials", input);
  return data;
}
export async function adminUpdateTestimonial(
  id: number,
  input: TestimonialUpdateInput,
): Promise<AdminTestimonial> {
  const { data } = await client.patch<AdminTestimonial>(`/admin/testimonials/${id}`, input);
  return data;
}
export async function adminDeleteTestimonial(id: number): Promise<void> {
  await client.delete(`/admin/testimonials/${id}`);
}

export async function adminGetHomeFaq(): Promise<AdminHomeFaq[]> {
  const { data } = await client.get<AdminHomeFaq[]>("/admin/faq");
  return data;
}
export async function adminCreateHomeFaq(input: HomeFaqCreateInput): Promise<AdminHomeFaq> {
  const { data } = await client.post<AdminHomeFaq>("/admin/faq", input);
  return data;
}
export async function adminUpdateHomeFaq(id: number, input: HomeFaqUpdateInput): Promise<AdminHomeFaq> {
  const { data } = await client.patch<AdminHomeFaq>(`/admin/faq/${id}`, input);
  return data;
}
export async function adminDeleteHomeFaq(id: number): Promise<void> {
  await client.delete(`/admin/faq/${id}`);
}
