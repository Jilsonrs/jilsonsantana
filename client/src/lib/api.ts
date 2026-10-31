import axios from "axios";
import { anotarVersaoDoServidor } from "@/lib/versao";
import type { CredenciaisDeEnvio, DadosDoEnvio } from "@/lib/video-upload";
import type { TipoDeEvento, Level, Layer, Material, ContentStatus, PlanItemType, CourseCreateInput, CourseUpdateInput, CourseStructureInput, LessonInsertInput, ModuleInsertInput, LessonKind, ModuleCreateInput, ModuleUpdateInput, LessonCreateInput, LessonUpdateInput, Dict, TestimonialCreateInput, TestimonialUpdateInput, HomeFaqCreateInput, HomeFaqUpdateInput, AnnouncementInput, AnnouncementAudience, PlanosDaAssinatura, PreviaInput, PreviaDaAssinatura, CorpoDeAssinar, CorpoDeAssinarSemLogin, CorpoDePix, CorpoDePixDaAtrasada, CorpoDePixSemLogin, CampoNaoAbriuInput, AssinaturaSemLogin, ConfirmacaoSemLogin, SenhaCriada, AssinaturaCriada, SituacaoDaAssinatura, SincroniaDaConta, FiltroDasAssinaturas, ListaDeAssinaturas, FichaDaCobranca, OndeLeva, ListaDeTentativas, OQueAconteceu, ListaDeCasos, AcaoFeita, ConferenciaPelaFicha, ConsertoDoCaso, LinkParaOAluno, CodigoDoEmailEnviado, EmailCorrigido, PreviaDaDevolucao, Plano, MinhaAssinatura, TrocaDeCartaoPreparada, CartaoTrocado, CancelarInput, RenovacaoParada, ReembolsoFeito, MudarDePlanoInput, PlanoMudado, TrocaDesfeita, TrocaDisponivel, PedirCodigoInput, CodigoPedido, ProvasDaContestacao, NumerosDoMes, CodigoDaLista, CodigoCriado, CriarCodigoInput, MinhasCobrancas } from "@jilson/core";

// Same-origin by design (mirrors auth-client.ts): in dev the Vite proxy
// forwards /api -> :3000; in prod Express serves the client from the same
// origin. withCredentials so the better-auth session cookie rides along on
// member-only writes (e.g. saveTrilha).
export const client = axios.create({ baseURL: "/api", withCredentials: true });

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
  modules: AdminModule[];
};

export async function adminGetCourses(): Promise<AdminCourseCard[]> {
  const { data } = await client.get<AdminCourseCard[]>("/admin/courses");
  return data;
}

/**
 * Os NÚMEROS do cartão do curso no admin (Fase 5, Bloco MEDIR, etapa 2 — 09/10/2026): as
 * horas assistidas (em segundos) e os alunos que começaram, no total e no mês de Brasília.
 * Só alunos. Curso sem nenhum número não vem: é zero.
 */
export type NumerosDoCurso = {
  courseId: number;
  horas: { total: number; mes: number };
  alunos: { total: number; mes: number };
};

export async function adminGetNumerosDosCursos(): Promise<NumerosDoCurso[]> {
  const { data } = await client.get<{ cursos: NumerosDoCurso[] }>("/admin/stats/cursos");
  return data.cursos;
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
    /**
     * De que segundo o vídeo abre para QUEM PEDE (Bloco AULA, 06/10/2026): o ponto
     * dele, guardado na conta; `null` = do começo. Só vem com a aula liberada.
     */
    ponto?: number | null;
    arquivos?: ArquivoDaAula[];
  };
  /** As aulas deste curso que QUEM PEDE concluiu (Fase 5, 03/10/2026); visitante: []. */
  concluidas: number[];
  /**
   * Quem pede já foi assinante e hoje está sem acesso: o botão da aula trancada diz "Reativar
   * assinatura" (decisão do operador, 10/10/2026). Não vem na página do admin.
   */
  reativar?: boolean;
  /** Quem pede está com a cobrança atrasada há mais de 3 dias: a aula trancada diz isso, com "Trocar cartão" (etapa 4.6b). */
  atrasada?: boolean;
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

// ONDE A PESSOA PAROU (Bloco AULA — plano aprovado pelo operador em 06/10/2026): o
// segundo do vídeo e a aula em que a pessoa está, gravados na CONTA.

/** O endereço que grava o ponto (o do admin, em qualquer status). Também o do envio na saída da página. */
export function enderecoDoPonto(lessonId: number, comoAdmin: boolean): string {
  return comoAdmin ? `/api/admin/lessons/${lessonId}/ponto` : `/api/lessons/${lessonId}/ponto`;
}

/** A pessoa está nesta aula, neste segundo (`null` = viu até o fim, ou a aula não tem vídeo). */
export async function gravarPonto(lessonId: number, segundos: number | null, comoAdmin: boolean): Promise<void> {
  await client.post(comoAdmin ? `/admin/lessons/${lessonId}/ponto` : `/lessons/${lessonId}/ponto`, { segundos });
}

// OS EVENTOS DO VÍDEO (Fase 5, Bloco MEDIR, etapa 1 — pedido do operador, 09/10/2026):
// tocou, pausou, terminou, guardados para as horas assistidas do cartão do admin. Só a
// porta do aluno: o admin não grava.

/** O endereço que guarda os eventos. Também o do "pausou" que sai quando a página esconde. */
export function enderecoDosEventos(lessonId: number): string {
  return `/api/lessons/${lessonId}/eventos`;
}

/** Aconteceu isto no vídeo desta aula, neste segundo. */
export async function gravarEvento(lessonId: number, tipo: TipoDeEvento, segundos: number): Promise<void> {
  await client.post(`/lessons/${lessonId}/eventos`, { tipo, segundos });
}

/**
 * As preferências do aluno logado (Bloco AULA, etapa 6 — decisão do operador, 07/10/2026):
 * hoje, a LEGENDA lembrada. Ligada no CC do player, continua ligada nas próximas aulas, em
 * qualquer aparelho, até o aluno desligar no mesmo CC.
 */
export type PreferenciasDoAluno = { legendas: boolean };

export async function getPreferencias(): Promise<PreferenciasDoAluno> {
  const { data } = await client.get<PreferenciasDoAluno>("/me/preferences");
  return data;
}

export async function salvarPreferencias(preferencias: PreferenciasDoAluno): Promise<void> {
  await client.patch("/me/preferences", preferencias);
}

/** Em que aula a pessoa entra no curso: a última em que esteve, ou a primeira. `null`: o curso não tem aula. */
export async function getEntradaDoCurso(slug: string): Promise<{ aulaId: number | null }> {
  const { data } = await client.get<{ aulaId: number | null }>(`/cursos/${encodeURIComponent(slug)}/entrada`);
  return data;
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

/**
 * O progresso de quem está logado em cada trilha DELE que ele começou (Bloco MEDIR, etapa 3 —
 * 09/10/2026), e se ela está CONCLUÍDA — todas as aulas concluídas (o certificado, Fase 6.5).
 */
export type ProgressoDaTrilha = { planId: number; concluidas: number; total: number; concluida: boolean };

export async function getProgressoDasTrilhas(): Promise<ProgressoDaTrilha[]> {
  const { data } = await client.get<ProgressoDaTrilha[]>("/progresso/trilhas");
  return data;
}

/** O link de download: mesmo site, então o cookie vai junto e o arquivo vem com o nome original. */
export function enderecoDoArquivo(lessonId: number, fileId: number, comoAdmin: boolean): string {
  return comoAdmin ? `/api/admin/lesson-files/${fileId}/download` : `/api/lessons/${lessonId}/files/${fileId}`;
}

// AS LEGENDAS (passo Legendas do editor — decisões do operador, 04/10/2026):
// uma `.vtt` por aula de vídeo e uma pela apresentação.
export type LegendaNaTela = { enviadaEm: string; nomeDoArquivo: string; precisaReenviar: boolean };
export type AulaNasLegendas = { id: number; title: string; status: ContentStatus; temVideo: boolean; legenda: LegendaNaTela | null };
export type LegendasDoCurso = {
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

// OS ARQUIVOS PARA BAIXAR de cada aula (Bloco E, etapa 2, parte 2e; em partes na
// etapa G2 do Bloco G): o admin envia e exclui. O arquivo vai CRU no corpo, em
// pedaços de até 30 MB (com nova tentativa automática se um pedaço falhar), e o
// nome original vai no cabeçalho.
export type AdminLessonFile = { id: number; originalName: string; sizeBytes: number; createdAt: string };

export const TAMANHO_DA_PARTE_DO_ARQUIVO = 30 * 1024 * 1024;
const TENTATIVAS_POR_PARTE = 3;

function erroTemporarioNoEnvio(erro: unknown): boolean {
  const status = (erro as { response?: { status?: number } })?.response?.status;
  // Sem resposta (rede caiu) ou falha temporária do servidor/limite: tenta de novo.
  // Recusa de regra (400, 401, 403, 404, 413) ou Storage não configurado (503) para na hora.
  return status === undefined || status === 408 || status === 429 || (status >= 500 && status !== 503);
}

async function enviarComNovaTentativa<T>(acao: () => Promise<T>): Promise<T> {
  let ultimoErro: unknown;
  for (let tentativa = 1; tentativa <= TENTATIVAS_POR_PARTE; tentativa++) {
    try {
      return await acao();
    } catch (erro) {
      ultimoErro = erro;
      if (tentativa === TENTATIVAS_POR_PARTE || !erroTemporarioNoEnvio(erro)) throw erro;
    }
  }
  throw ultimoErro;
}

export async function listLessonFiles(lessonId: number): Promise<AdminLessonFile[]> {
  const { data } = await client.get<AdminLessonFile[]>(`/admin/lessons/${lessonId}/files`);
  return data;
}

export async function uploadLessonFile(
  lessonId: number,
  arquivo: File,
  aoProgredir: (porcentagem: number) => void = () => {},
): Promise<AdminLessonFile> {
  const tamanhoTotal = arquivo.size;
  const totalDePartes = Math.max(1, Math.ceil(tamanhoTotal / TAMANHO_DA_PARTE_DO_ARQUIVO));

  if (totalDePartes === 1) {
    return enviarComNovaTentativa(async () => {
      const { data } = await client.post<AdminLessonFile>(`/admin/lessons/${lessonId}/files`, arquivo, {
        headers: { "Content-Type": "application/octet-stream", "X-Nome-Do-Arquivo": encodeURIComponent(arquivo.name) },
        // Sem limite de tamanho (operador, 29/09/2026): um .zip grande sem porcentagem parece travado.
        onUploadProgress: (e) => {
          if (e.total) aoProgredir(Math.round((e.loaded * 100) / e.total));
        },
      });
      return data;
    });
  }

  const primeiraParte = arquivo.slice(0, TAMANHO_DA_PARTE_DO_ARQUIVO);
  let criado = await enviarComNovaTentativa(async () => {
    const { data } = await client.post<AdminLessonFile>(`/admin/lessons/${lessonId}/files`, primeiraParte, {
      headers: {
        "Content-Type": "application/octet-stream",
        "X-Nome-Do-Arquivo": encodeURIComponent(arquivo.name),
        "X-Total-De-Partes": String(totalDePartes),
      },
      onUploadProgress: (e) => {
        if (tamanhoTotal > 0) aoProgredir(Math.min(100, Math.round((e.loaded * 100) / tamanhoTotal)));
      },
    });
    return data;
  });

  try {
    for (let parte = 2; parte <= totalDePartes; parte++) {
      const inicio = (parte - 1) * TAMANHO_DA_PARTE_DO_ARQUIVO;
      const fim = Math.min(parte * TAMANHO_DA_PARTE_DO_ARQUIVO, tamanhoTotal);
      const pedaco = arquivo.slice(inicio, fim);
      criado = await enviarComNovaTentativa(async () => {
        const { data } = await client.put<AdminLessonFile>(`/admin/lesson-files/${criado.id}/partes/${parte}`, pedaco, {
          headers: { "Content-Type": "application/octet-stream" },
          onUploadProgress: (e) => {
            if (tamanhoTotal > 0) {
              aoProgredir(Math.min(100, Math.round(((inicio + e.loaded) * 100) / tamanhoTotal)));
            }
          },
        });
        return data;
      });
    }
  } catch (erro) {
    await client.delete(`/admin/lesson-files/${criado.id}`).catch(() => undefined);
    throw erro;
  }

  return criado;
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

// As listas de DESCOBERTA. A escola é só em português (12/10/2026): o site não
// manda mais idioma, e o servidor devolve português.
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

export async function getCommonTexts(): Promise<CommonTexts> {
  const { data } = await client.get<CommonTexts>("/site-text/common");
  return data;
}

// ---------------------------------------------------------------------------
// Depoimentos e perguntas frequentes da home (Bloco C3) — admin-only.
// A lista traz TODOS os status.
// Excluir apaga a linha de vez (LGPD); esconder é mudar o status.

type ItemDaHome = {
  id: number;
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

// ── Assinar (Fase 4, etapa 4.2) ──────────────────────────────────────────────
// O site diz só QUAL plano e o código promocional: preço, valor e conta são do servidor.

/**
 * Pede o código de 6 números no e-mail (etapa 4.7, passo 5): para ENTRAR sem senha, ou para criar
 * uma SENHA nova. A resposta é a mesma exista a conta ou não. Excesso de pedidos: 429 `MuitasTentativas`.
 */
export async function pedirCodigo(corpo: PedirCodigoInput): Promise<CodigoPedido> {
  const { data } = await client.post<CodigoPedido>("/conta/codigo", corpo);
  return data;
}

/** Os dois planos com o valor lido da Stripe, a chave publicável e as formas de pagamento. */
export async function getPlanosDaAssinatura(): Promise<PlanosDaAssinatura> {
  const { data } = await client.get<PlanosDaAssinatura>("/billing/planos");
  return data;
}

/** A prévia do código para o VISITANTE, sem login (etapa 4.7, passo 6e). Código que não vale: 400 `CodigoInvalido`. */
export async function getPreviaSemLogin(corpo: PreviaInput): Promise<PreviaDaAssinatura> {
  const { data } = await client.post<PreviaDaAssinatura>("/billing/visitante/previa", corpo);
  return data;
}

/**
 * Assinar SEM CONTA (etapa 4.7, passo 6e): devolve a TENTATIVA — que abre a conta depois do pagamento —
 * e, se há o que pagar, o segredo. A tentativa vai só para a memória da página e o `sessionStorage`
 * (`lib/tentativa-de-assinar.ts`), nunca para o endereço.
 */
export async function assinarSemLogin(corpo: CorpoDeAssinarSemLogin): Promise<AssinaturaSemLogin> {
  const { data } = await client.post<AssinaturaSemLogin>("/billing/visitante/assinatura", corpo);
  return data;
}

/** "O pagamento já valeu?" — a tela de depois do pagamento de quem assinou sem conta (etapa 4.7, passo 6e2). POST: a tentativa nunca vai no endereço. */
export async function confirmarSemLogin(tentativa: string): Promise<ConfirmacaoSemLogin> {
  const { data } = await client.post<ConfirmacaoSemLogin>("/billing/visitante/confirmacao", { tentativa });
  return data;
}

/** Criar a senha logo depois de pagar (etapa 4.7, passo 6e2); a sessão vem no cookie. Recusas: 409 com o motivo. */
export async function criarSenhaSemLogin(corpo: { tentativa: string; senha: string }): Promise<SenhaCriada> {
  const { data } = await client.post<SenhaCriada>("/billing/visitante/senha", corpo);
  return data;
}

/**
 * "Confira na Stripe" — a tela de depois do pagamento, sem confirmação, pede ao servidor que confira a assinatura da
 * conta da sessão (E2 da revisão ampla da cobrança): o aviso da Stripe pode ter se perdido. Não decide nada — a
 * pergunta de sempre (`getSituacaoDaAssinatura`) vê o resultado. NUNCA tenta de novo sozinho (quem repete é a tela).
 */
export async function conferirMinhaAssinatura(): Promise<void> {
  await client.post("/billing/conferir", {});
}

/** A mesma conferência, para quem pagou SEM CONTA, pela tentativa desta aba (POST: ela nunca vai no endereço). */
export async function conferirSemLogin(tentativa: string): Promise<void> {
  await client.post("/billing/visitante/conferir", { tentativa });
}

/**
 * O campo de pagamento da Stripe não abriu nesta tela (E3 da revisão ampla da cobrança): o servidor alerta o
 * operador. Sem login (o visitante também paga). Só a tela e o motivo, de listas fechadas. NUNCA tenta de novo.
 */
export async function avisarCampoQueNaoAbriu(corpo: CampoNaoAbriuInput): Promise<void> {
  await client.post("/billing/campo-nao-abriu", corpo);
}

/** Os mesmos planos para o VISITANTE, sem login (a tela pública de assinar — etapa 4.7, passo 6c). */
export async function getPlanosSemLogin(): Promise<PlanosDaAssinatura> {
  const { data } = await client.get<PlanosDaAssinatura>("/billing/visitante/planos");
  return data;
}

/** Quanto se paga hoje com o código promocional. Código que não vale: 400 `CodigoInvalido`. */
export async function getPreviaDaAssinatura(corpo: PreviaInput): Promise<PreviaDaAssinatura> {
  const { data } = await client.post<PreviaDaAssinatura>("/billing/previa", corpo);
  return data;
}

/** Cria a assinatura. Quem já assina: 409 `JaAssinante`. NUNCA tenta de novo sozinho (gravação que cria). */
export async function criarAssinatura(corpo: CorpoDeAssinar): Promise<AssinaturaCriada> {
  const { data } = await client.post<AssinaturaCriada>("/billing/assinatura", corpo);
  return data;
}

/**
 * PAGAR COM PIX, pré-pago, com a conta logada (etapa 4.9, passo 2): só o plano e o CPF ou CNPJ — sem
 * código promocional. O servidor devolve o segredo do pagamento Pix; o site abre o QR com ele, e a
 * assinatura nasce quando o Pix cai (o gate é quem diz).
 */
export async function pagarComPix(corpo: CorpoDePix): Promise<AssinaturaCriada> {
  const { data } = await client.post<AssinaturaCriada>("/billing/pix", corpo);
  return data;
}

/** PAGAR COM PIX, pré-pago, SEM CONTA (etapa 4.9, passo 2): o mesmo pedido do assinar sem login, sem o código; devolve também a tentativa. */
/** Pagar com Pix a cobrança ATRASADA (4.9b, E14): encerra a atrasada da conta da sessão e gera o Pix do mesmo plano. Só o CPF ou CNPJ vai. */
export async function pagarAAtrasadaComPix(corpo: CorpoDePixDaAtrasada): Promise<AssinaturaCriada> {
  const { data } = await client.post<AssinaturaCriada>("/billing/minha-assinatura/pix", corpo);
  return data;
}

export async function pagarComPixSemLogin(corpo: CorpoDePixSemLogin): Promise<AssinaturaSemLogin> {
  const { data } = await client.post<AssinaturaSemLogin>("/billing/visitante/pix", corpo);
  return data;
}

/** Esta conta tem acesso agora? (a resposta do gate do servidor) */
export async function getSituacaoDaAssinatura(): Promise<SituacaoDaAssinatura> {
  const { data } = await client.get<SituacaoDaAssinatura>("/billing/assinatura");
  return data;
}

/**
 * A assinatura da conta, para a tela de Faturamento e Assinatura (etapa 4.6): o plano, a próxima
 * cobrança e o cartão, como a Stripe diz agora. O pedido não diz de quem nem qual.
 */
export async function getMinhaAssinatura(): Promise<MinhaAssinatura> {
  const { data } = await client.get<MinhaAssinatura>("/billing/minha-assinatura");
  return data;
}
/** As cobranças que passaram e os recibos (etapa 4.7b, passo 6a). */
export async function getMinhasCobrancas(): Promise<MinhasCobrancas> {
  const { data } = await client.get<MinhasCobrancas>("/billing/minhas-cobrancas");
  return data;
}

/**
 * Trocar o cartão, 1º tempo: o servidor abre o pedido de guardar cartão e devolve o segredo com
 * que o campo da Stripe o confirma. Sem assinatura que aceite cartão: 409 `SemAssinatura`.
 * NUNCA tenta de novo sozinho (gravação que cria).
 */
export async function prepararTrocaDeCartao(): Promise<TrocaDeCartaoPreparada> {
  const { data } = await client.post<TrocaDeCartaoPreparada>("/billing/cartao");
  return data;
}

/**
 * Trocar o cartão, 2º tempo: o servidor põe na assinatura o cartão que o campo acabou de
 * confirmar — ele o lê na Stripe; daqui não vai código nenhum. Repetir não faz mal.
 */
export async function aplicarCartaoNovo(): Promise<CartaoTrocado> {
  const { data } = await client.post<CartaoTrocado>("/billing/cartao/aplicar");
  return data;
}

/**
 * Cancelar (etapa 4.6, sessão b): para a renovação, com o motivo se a pessoa disse — o acesso
 * continua até o fim do período pago. Com a cobrança atrasada, a assinatura termina na hora
 * (`terminou`). O pedido não diz qual assinatura. NUNCA tenta de novo sozinho.
 */
export async function cancelarMinhaAssinatura(corpo: CancelarInput): Promise<RenovacaoParada> {
  const { data } = await client.post<RenovacaoParada>("/billing/minha-assinatura/cancelar", corpo);
  return data;
}

/** Volta atrás: a assinatura com a renovação parada torna a renovar. Nada é cobrado. */
export async function manterMinhaAssinatura(): Promise<void> {
  await client.post("/billing/minha-assinatura/manter");
}

/**
 * Cancelar e receber o dinheiro de volta, dentro do prazo: o acesso termina na hora. Fora do
 * prazo: 409 `ForaDoPrazo`; encerrou e a devolução não saiu: 502 `DevolucaoFalhou`. NUNCA tenta
 * de novo sozinho.
 */
export async function reembolsarMinhaAssinatura(corpo: CancelarInput): Promise<ReembolsoFeito> {
  const { data } = await client.post<ReembolsoFeito>("/billing/minha-assinatura/reembolso", corpo);
  return data;
}

/**
 * Mudar de plano (etapa 4.6, sessão b): a troca que esta conta pode fazer agora, já com a conta
 * da Stripe — quanto se paga hoje (para o anual) ou quando a troca vale (para o mensal). Nenhuma:
 * `troca` vem vazia. Não muda nada.
 */
export async function getTrocaDePlano(): Promise<TrocaDisponivel> {
  const { data } = await client.get<TrocaDisponivel>("/billing/minha-assinatura/plano");
  return data;
}

/**
 * Muda o plano: o site diz só PARA QUAL e devolve o valor que mostrou, para o servidor conferir.
 * Cartão recusado: 402 `CartaoRecusado`; o valor já não confere: 409 `PreviaVencida`. NUNCA tenta de
 * novo sozinho (é cobrança).
 */
export async function mudarDePlano(corpo: MudarDePlanoInput): Promise<PlanoMudado> {
  const { data } = await client.post<PlanoMudado>("/billing/minha-assinatura/plano", corpo);
  return data;
}

/** Desiste da troca marcada, ou da que ficou esperando a confirmação do banco. `trocado`: não deu — o pagamento já tinha passado. */
export async function desistirDaTroca(): Promise<TrocaDesfeita> {
  const { data } = await client.post<TrocaDesfeita>("/billing/minha-assinatura/plano/desistir");
  return data;
}

/**
 * ADMIN: confere na Stripe as assinaturas da conta deste e-mail e acerta o acesso (etapa 4.4).
 * Conta que não existe: 404 `ContaNaoEncontrada`. Sem tentar de novo sozinho.
 */
/** A lista do painel da Cobrança (etapa 4.7b, passo 1b): uma página, com a contagem de cada filtro. */
export async function adminListarAssinaturas(consulta: { filtro: FiltroDasAssinaturas; busca?: string; pagina: number }): Promise<ListaDeAssinaturas> {
  // No corpo, nunca no endereço: a busca é o e-mail ou o nome de um aluno, e o endereço vai inteiro para o registro.
  const { data } = await client.post<ListaDeAssinaturas>("/admin/assinaturas/lista", consulta);
  return data;
}

/** A ficha do aluno no painel da Cobrança (etapa 4.7b, passo 1d): por conta, ou pela assinatura sem conta. */
export async function adminFichaDaCobranca(quem: { conta: string } | { assinatura: number } | { visitante: string }): Promise<FichaDaCobranca> {
  const { data } = await client.get<FichaDaCobranca>("/admin/cobranca/ficha", { params: quem });
  return data;
}

/** AS AÇÕES DO PAINEL (etapa 4.7b, passo 3a): a assinatura pelo id do espelho. */
export async function adminConferir(quem: { conta: string } | { assinatura: number } | { visitante: string }): Promise<ConferenciaPelaFicha> {
  const { data } = await client.post<ConferenciaPelaFicha>("/admin/cobranca/acoes/conferir", quem);
  return data;
}
export async function adminEncerrarPagaPorFora(assinatura: number): Promise<AcaoFeita> {
  const { data } = await client.post<AcaoFeita>("/admin/cobranca/acoes/encerrar-paga-por-fora", { assinatura });
  return data;
}
export async function adminCancelar(assinatura: number): Promise<AcaoFeita> {
  const { data } = await client.post<AcaoFeita>("/admin/cobranca/acoes/cancelar", { assinatura });
  return data;
}
/** Liberar acesso pago por fora (passo 4d — P120): a pré-paga paga por fora, para a conta e o plano. */
export async function adminLiberarPagoPorFora(conta: string, plano: Plano): Promise<AcaoFeita> {
  const { data } = await client.post<AcaoFeita>("/admin/cobranca/acoes/liberar-pago-por-fora", { conta, plano });
  return data;
}

/** Tentar cobrar de novo agora a cobrança em aberto da atrasada (passo 4b). */
export async function adminCobrarDeNovo(assinatura: number): Promise<AcaoFeita> {
  const { data } = await client.post<AcaoFeita>("/admin/cobranca/acoes/cobrar-de-novo", { assinatura });
  return data;
}
export async function adminDesfazerCancelamento(assinatura: number): Promise<AcaoFeita> {
  const { data } = await client.post<AcaoFeita>("/admin/cobranca/acoes/desfazer-cancelamento", { assinatura });
  return data;
}
export async function adminReenviarEmail(casoId: number): Promise<AcaoFeita> {
  const { data } = await client.post<AcaoFeita>(`/admin/cobranca/casos/${casoId}/reenviar`);
  return data;
}

/** Os consertos do passo 3b: o do caso, o CPF ou CNPJ, e o link por e-mail. */
export async function adminResolverCaso(casoId: number, acao: ConsertoDoCaso): Promise<AcaoFeita> {
  const { data } = await client.post<AcaoFeita>(`/admin/cobranca/casos/${casoId}/resolver`, { acao });
  return data;
}
export async function adminCorrigirDocumento(quem: { conta: string } | { visitante: string }, documento: string): Promise<AcaoFeita> {
  const { data } = await client.post<AcaoFeita>("/admin/cobranca/acoes/corrigir-documento", { ...quem, documento });
  return data;
}
export async function adminEnviarLink(conta: string, link: LinkParaOAluno): Promise<AcaoFeita> {
  const { data } = await client.post<AcaoFeita>("/admin/cobranca/acoes/enviar-link", { conta, link });
  return data;
}

/** As devoluções (passo 4a — P114 e P139): a prévia e "Cancelar e devolver o dinheiro"; e devolver um pagamento. */
export async function adminPreviaDeDevolverTudo(assinatura: number): Promise<PreviaDaDevolucao> {
  const { data } = await client.post<PreviaDaDevolucao>("/admin/cobranca/acoes/devolver-tudo/previa", { assinatura });
  return data;
}
export async function adminDevolverTudo(assinatura: number, centavos: number): Promise<AcaoFeita> {
  const { data } = await client.post<AcaoFeita>("/admin/cobranca/acoes/devolver-tudo", { assinatura, centavos });
  return data;
}
export async function adminDevolverPagamento(quem: { conta: string } | { visitante: string }, cobranca: string, centavos: number, devolvido: number, encerrar: boolean): Promise<AcaoFeita> {
  const { data } = await client.post<AcaoFeita>("/admin/cobranca/acoes/devolver-pagamento", { ...quem, cobranca, centavos, devolvido, encerrar });
  return data;
}

/** Corrigir o e-mail (passo 3c — P121): o código vai ao e-mail certo, e a troca só vale com ele. */
export async function adminPedirCodigoDoEmail(conta: string, email: string): Promise<CodigoDoEmailEnviado> {
  const { data } = await client.post<CodigoDoEmailEnviado>("/admin/cobranca/acoes/corrigir-email/codigo", { conta, email });
  return data;
}
export async function adminCorrigirEmail(conta: string, email: string, codigo: string): Promise<EmailCorrigido> {
  const { data } = await client.post<EmailCorrigido>("/admin/cobranca/acoes/corrigir-email", { conta, email, codigo });
  return data;
}

/** Os números do mês, para a faixa no topo da Cobrança (passo 6c). */
export async function adminNumerosDoMes(): Promise<NumerosDoMes> {
  const { data } = await client.get<NumerosDoMes>("/admin/cobranca/numeros");
  return data;
}
/** Os códigos promocionais da escola, com quantos usaram (passo 6d). */
export async function adminListarCodigos(): Promise<CodigoDaLista[]> {
  const { data } = await client.get<CodigoDaLista[]>("/admin/cobranca/codigos");
  return data;
}
/** Cria um código: a cortesia (o servidor sorteia o código) ou o desconto (passo 6d). */
export async function adminCriarCodigo(pedido: CriarCodigoInput): Promise<CodigoCriado> {
  const { data } = await client.post<CodigoCriado>("/admin/cobranca/codigos", pedido);
  return data;
}
/** Pausa (`ativo: false`) ou reativa um código (passo 6d). */
export async function adminMudarCodigo(id: string, ativo: boolean): Promise<AcaoFeita> {
  const { data } = await client.post<AcaoFeita>("/admin/cobranca/codigos/ativo", { id, ativo });
  return data;
}
/** A prévia das provas da contestação (passo 5b): o texto exato que vai ao banco. */
export async function adminProvasDaContestacao(casoId: number): Promise<ProvasDaContestacao> {
  const { data } = await client.get<ProvasDaContestacao>(`/admin/cobranca/casos/${casoId}/provas`);
  return data;
}
/** "Precisa de você": os casos abertos ou os fechados (etapa 4.7b, passo 2c). */
export async function adminListarCasos(consulta: { situacao: "abertos" | "fechados"; pagina: number }): Promise<ListaDeCasos> {
  const { data } = await client.get<ListaDeCasos>("/admin/cobranca/casos", { params: consulta });
  return data;
}

/** O operador fecha um caso, com uma nota opcional. */
export async function adminFecharCaso(id: number, nota: string): Promise<void> {
  await client.post(`/admin/cobranca/casos/${id}/fechar`, { nota });
}

/** O que aconteceu na cobrança da escola, e os motivos de cancelamento contados (etapa 4.7b, passo 1f). */
export async function adminOQueAconteceu(pagina: number): Promise<OQueAconteceu> {
  const { data } = await client.get<OQueAconteceu>("/admin/cobranca/o-que-aconteceu", { params: { pagina } });
  return data;
}

/** Quem começou a assinar e não terminou (etapa 4.7b, passo 1e). */
export async function adminListarTentativas(): Promise<ListaDeTentativas> {
  const { data } = await client.get<ListaDeTentativas>("/admin/cobranca/tentativas");
  return data;
}

/** De quem é o código da Stripe que veio num alerta. */
export async function adminAcharCodigo(codigo: string): Promise<OndeLeva> {
  const { data } = await client.get<OndeLeva>("/admin/cobranca/achar", { params: { codigo } });
  return data;
}

export async function adminSincronizarConta(email: string): Promise<SincroniaDaConta> {
  const { data } = await client.post<SincroniaDaConta>("/admin/assinaturas/sincronizar", { email });
  return data;
}
