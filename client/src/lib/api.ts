import axios from "axios";
import type {
  Level,
  Layer,
  ContentStatus,
  PlanItemType,
  CourseCreateInput,
  CourseUpdateInput,
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
  displayOrder: number;
  moduleCount: number;
  lessonCount: number;
};

export type AdminLesson = {
  id: number;
  moduleId: number;
  title: string;
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
  displayOrder: number;
  status: ContentStatus;
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

export async function getCourses(): Promise<CourseCard[]> {
  const { data } = await client.get<CourseCard[]>("/courses");
  return data;
}

export async function getCourseBySlug(slug: string): Promise<CourseDetail> {
  const { data } = await client.get<CourseDetail>(`/courses/${slug}`);
  return data;
}

export async function getTrilhas(): Promise<TrilhaCard[]> {
  const { data } = await client.get<TrilhaCard[]>("/trilhas");
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

export async function search(q: string): Promise<SearchResult> {
  const { data } = await client.get<SearchResult>("/search", { params: { q } });
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
