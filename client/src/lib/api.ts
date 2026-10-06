import axios from "axios";
import { anotarVersaoDoServidor } from "@/lib/versao";
import type { CredenciaisDeEnvio, DadosDoEnvio } from "@/lib/video-upload";
import type {
  Level,
  Layer,
  Material,
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
  AnnouncementInput,
  AnnouncementAudience,
} from "@jilson/core";

// Same-origin by design (mirrors auth-client.ts): in dev the Vite proxy
// forwards /api -> :3000; in prod Express serves the client from the same
// origin. withCredentials so the better-auth session cookie rides along on
// member-only writes (e.g. saveTrilha).
const client = axios.create({ baseURL: "/api", withCredentials: true });

// Toda resposta do servidor diz qual versão ele é (`X-Versao-Do-App`, 06/10/2026):
// é assim que uma aba aberta antes de uma publicação percebe a versão nova e passa
// a carregar a página inteira na próxima troca de tela (`lib/versao.ts`).
export function aoResponder<T extends { headers: Record<string, unknown> }>(resposta: T): T {
  anotarVersaoDoServidor(resposta.headers["x-versao-do-app"]);
  return resposta;
}
export function aoFalhar(erro: unknown): Promise<never> {
  if (axios.isAxiosError(erro)) anotarVersaoDoServidor(erro.response?.headers["x-versao-do-app"]);
  return Promise.reject(erro);
}
client.interceptors.response.use(aoResponder, aoFalhar);

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
  /** A soma dos vídeos PUBLICADOS, em segundos (operador, 30/09/2026). */
  videoSeconds: number;
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
  /** O idioma do curso (a legenda do "Este curso inclui" é nesse idioma). */
  language: LanguageCode;
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
  /** A soma dos vídeos PUBLICADOS, em segundos (operador, 30/09/2026). */
  videoSeconds: number;
  /** O quadro "Este curso inclui" (04/10/2026): os materiais marcados no Publicar… */
  materiais: Material[];
  /** …e as linhas que se calculam sozinhas, da cadeia publicada (04 e 05/10/2026). */
  inclui: CursoInclui;
};

/**
 * "Este curso inclui" — as linhas que o SERVIDOR calcula (decisões do operador, 04
 * e 05/10/2026; `server/src/lib/inclui.ts`). O aluno conta o publicado; o admin, tudo.
 */
export type CursoInclui = {
  segundosDeVideo: number;
  artigos: number;
  aulasGratis: number;
  arquivos: boolean;
  legendas: boolean;
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
  level: Level | null;
  status: ContentStatus;
  language: LanguageCode;
  displayOrder: number;
  moduleCount: number;
  lessonCount: number;
  /** Todo vídeo enviado, em segundos, inclusive rascunho (operador, 30/09/2026). */
  videoSeconds: number;
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
  /** A duração do vídeo em segundos, que o Bunny informa quando termina (29/09/2026). */
  videoDurationSeconds: number | null;
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
  /** Os materiais exclusivos marcados no passo Publicar (04/10/2026). */
  materiais: Material[];
  /** As mensagens do passo Mensagens (04/10/2026); `null` = nenhuma. */
  welcomeMessage: string | null;
  congratsMessage: string | null;
  /** Todas as aulas de vídeo publicadas com legenda em dia — o ✓ do passo Legendas (05/10/2026). */
  legendasCompletas: boolean;
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
  /**
   * A duração do vídeo, ao lado da aula (operador, 06/10/2026); `null` em aula de
   * texto ou vídeo processando. Opcional: um servidor de antes desta mudança não a
   * manda (API aditiva — `CLAUDE.md` → Rendering Boundary).
   */
  duracaoSegundos?: number | null;
};
export type ArquivoDaAula = { id: number; originalName: string; sizeBytes: number };
export type PaginaDaAula = {
  curso: {
    id: number;
    slug: string;
    title: string;
    language: "pt" | "en";
    status: ContentStatus;
    // Os DETALHES do curso, embaixo do player em toda aula (operador, 29/09/2026).
    level: Level | null;
    description: string | null;
    learnTags: string[];
    requirements: string[];
    personas: string[];
    highlights: Highlight[] | null;
    faq: FaqItem[] | null;
    camadas: Layer[];
    /** Os materiais exclusivos, para o quadro "Este curso inclui" (04/10/2026)… */
    materiais: Material[];
    /** …e as linhas que se calculam sozinhas, da lista que a pessoa vê (05/10/2026). */
    inclui: CursoInclui;
    videoSeconds: number;
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
  /** As aulas deste curso que QUEM PEDE concluiu (Fase 5, 03/10/2026); visitante: []. */
  concluidas: number[];
};

/**
 * A PRÉ-VISUALIZAÇÃO do curso como aluno (passo Publicar, 04/10/2026): o curso como
 * a página da aula o mostra ao admin, em qualquer status, sem aula. Só o admin.
 */
export async function getAdminCoursePage(courseId: number): Promise<{ curso: PaginaDaAula["curso"] }> {
  const { data } = await client.get<{ curso: PaginaDaAula["curso"] }>(`/admin/courses/${courseId}/pagina`);
  return data;
}

export async function getLessonPage(lessonId: number, comoAdmin: boolean): Promise<PaginaDaAula> {
  const rota = comoAdmin ? `/admin/lessons/${lessonId}/aula` : `/lessons/${lessonId}/aula`;
  const { data } = await client.get<PaginaDaAula>(rota);
  return data;
}

/**
 * Conclui a aula para quem está logado (Fase 5, 03/10/2026). A tela chama sozinha:
 * vídeo a 90%, texto ao abrir. O admin conclui pela rota dele, em qualquer status.
 */
export async function concluirAula(lessonId: number, comoAdmin: boolean): Promise<void> {
  await client.put(comoAdmin ? `/admin/lessons/${lessonId}/concluida` : `/lessons/${lessonId}/concluida`);
}

// "SALVOS" — salvar curso ou aula para assistir depois (decisão do operador,
// 03/10/2026, "como no LinkedIn"). Só com login; a lista só traz o publicado.
export type CursoSalvo = { id: number; slug: string; title: string; subtitle: string | null; level: Level | null; thumbnailUrl: string | null };
export type AulaSalva = { id: number; title: string; kind: LessonKind; curso: { slug: string; title: string } };
export type Salvos = { cursos: CursoSalvo[]; aulas: AulaSalva[] };

export async function getSalvos(): Promise<Salvos> {
  const { data } = await client.get<Salvos>("/salvos");
  return data;
}

/** Salva ou tira dos salvos um curso ou uma aula. */
export async function alternarSalvo(tipo: "cursos" | "aulas", id: number, salvar: boolean): Promise<void> {
  if (salvar) await client.put(`/salvos/${tipo}/${id}`);
  else await client.delete(`/salvos/${tipo}/${id}`);
}

/** Uma notificação do sino (Bloco E, etapa 4 — 04/10/2026). O texto é Markdown do admin. */
export type Notificacao = {
  id: number;
  /** AVISO = o que o operador escreve em Comunicação → Notificações (06/10/2026). */
  tipo: "BOAS_VINDAS" | "PARABENS" | "AVISO";
  /**
   * O título do aviso; nas mensagens do curso, `null` (a tela monta). Opcional: um
   * servidor de antes desta mudança não o manda (API aditiva).
   */
  titulo?: string | null;
  texto: string;
  criadaEm: string;
  lida: boolean;
  /** O título do envio; `slug` só enquanto o curso está publicado. O aviso não tem curso. */
  curso: { titulo: string | null; slug: string | null } | null;
};
export type Notificacoes = { naoLidas: number; itens: Notificacao[] };

/** As notificações de quem está logado: as mais recentes e quantas faltam ler. */
export async function getNotificacoes(): Promise<Notificacoes> {
  const { data } = await client.get<Notificacoes>("/notificacoes");
  return data;
}

/** Marca uma notificação como lida. */
export async function marcarNotificacaoLida(id: number): Promise<void> {
  await client.put(`/notificacoes/${id}/lida`);
}

/** Marca todas as notificações como lidas. */
export async function marcarTodasLidas(): Promise<void> {
  await client.put("/notificacoes/lidas");
}

/** O progresso de quem está logado em cada curso que ele começou (só aulas publicadas). */
export type ProgressoDoCurso = { courseId: number; concluidas: number; total: number };

export async function getProgressoDosCursos(): Promise<ProgressoDoCurso[]> {
  const { data } = await client.get<ProgressoDoCurso[]>("/progresso/cursos");
  return data;
}

/** O link de download: mesmo site, então o cookie vai junto e o arquivo vem com o nome original. */
export function enderecoDoArquivo(lessonId: number, fileId: number, comoAdmin: boolean): string {
  return comoAdmin ? `/api/admin/lesson-files/${fileId}/download` : `/api/lessons/${lessonId}/files/${fileId}`;
}

// AS LEGENDAS (passo Legendas do editor — decisões do operador, 04/10/2026):
// uma `.vtt` por aula de vídeo e uma pela apresentação, no idioma do curso.
export type LegendaNaTela = { enviadaEm: string; nomeDoArquivo: string; precisaReenviar: boolean };
export type AulaNasLegendas = { id: number; title: string; status: ContentStatus; temVideo: boolean; legenda: LegendaNaTela | null };
export type LegendasDoCurso = {
  idioma: LanguageCode;
  apresentacao: { temVideo: boolean; legenda: LegendaNaTela | null };
  modulos: { id: number; title: string; status: ContentStatus; aulas: AulaNasLegendas[] }[];
  contagem: { comLegenda: number; total: number };
};
/** De quem é a legenda: uma aula, ou a apresentação do curso. */
export type DonoDaLegenda = { tipo: "aula"; id: number } | { tipo: "apresentacao"; cursoId: number };

const rotaDaLegenda = (dono: DonoDaLegenda) =>
  dono.tipo === "aula" ? `/admin/lessons/${dono.id}/legenda` : `/admin/courses/${dono.cursoId}/legenda-apresentacao`;

export async function getLegendas(courseId: number): Promise<LegendasDoCurso> {
  const { data } = await client.get<LegendasDoCurso>(`/admin/courses/${courseId}/legendas`);
  return data;
}

/**
 * O servidor diz se conseguiu limpar o cache do Bunny (04/10/2026): sem isso, o
 * player pode mostrar a legenda anterior por um tempo. Sem corpo (nada a excluir), limpo.
 */
export type ResultadoDaLegenda = { cacheLimpo: boolean };

/** Envia (ou substitui) a legenda: o arquivo cru no corpo, o nome no cabeçalho. */
export async function enviarLegenda(dono: DonoDaLegenda, arquivo: File): Promise<ResultadoDaLegenda> {
  const { data } = await client.put<ResultadoDaLegenda>(rotaDaLegenda(dono), arquivo, {
    headers: { "Content-Type": "text/vtt", "X-Nome-Do-Arquivo": encodeURIComponent(arquivo.name) },
  });
  return { cacheLimpo: data?.cacheLimpo !== false };
}

export async function excluirLegenda(dono: DonoDaLegenda): Promise<ResultadoDaLegenda> {
  const { data } = await client.delete<ResultadoDaLegenda | "">(rotaDaLegenda(dono));
  return { cacheLimpo: !(typeof data === "object" && data?.cacheLimpo === false) };
}

/** O link de "Baixar": mesmo site, então o cookie vai junto, e vem com o nome original. */
export function enderecoDaLegenda(dono: DonoDaLegenda): string {
  return `/api${rotaDaLegenda(dono)}`;
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

// ---------------------------------------------------------------- COMUNICAÇÃO
// O AVISO de Comunicação → Notificações (bloco C1 — decisões do operador,
// 06/10/2026): rascunho até enviar; enviado, pode ser editado e apagado.

export type AdminAviso = {
  id: number;
  title: string;
  body: string;
  audience: AnnouncementAudience;
  course: { id: number; title: string } | null;
  /** `null` = rascunho. */
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
  recebidas: number;
  lidas: number;
};

export async function adminGetAvisos(): Promise<AdminAviso[]> {
  const { data } = await client.get<AdminAviso[]>("/admin/announcements");
  return data;
}
export async function adminGetAviso(id: number): Promise<AdminAviso> {
  const { data } = await client.get<AdminAviso>(`/admin/announcements/${id}`);
  return data;
}
export async function adminCriarAviso(input: AnnouncementInput): Promise<AdminAviso> {
  const { data } = await client.post<AdminAviso>("/admin/announcements", input);
  return data;
}
export async function adminSalvarAviso(id: number, input: AnnouncementInput): Promise<AdminAviso> {
  const { data } = await client.put<AdminAviso>(`/admin/announcements/${id}`, input);
  return data;
}
export async function adminEnviarAviso(id: number): Promise<{ enviadas: number }> {
  const { data } = await client.post<{ enviadas: number }>(`/admin/announcements/${id}/enviar`);
  return data;
}
export async function adminApagarAviso(id: number): Promise<void> {
  await client.delete(`/admin/announcements/${id}`);
}
/** Quantas pessoas vão receber (o Enviar confirma antes). */
export async function adminContarDestinatarios(audience: AnnouncementAudience, courseId: number | null): Promise<number> {
  const { data } = await client.get<{ quantos: number }>("/admin/announcements/destinatarios", {
    params: { audience, ...(courseId ? { courseId } : {}) },
  });
  return data.quantos;
}

/** As MENSAGENS AUTOMÁTICAS de cada curso (a boas-vindas e os parabéns), para a lista. */
export type MensagensDoCurso = {
  courseId: number;
  courseTitle: string;
  status: ContentStatus;
  boasVindas: string | null;
  parabens: string | null;
};
export async function adminGetMensagensDosCursos(): Promise<MensagensDoCurso[]> {
  const { data } = await client.get<MensagensDoCurso[]>("/admin/course-messages");
  return data;
}
