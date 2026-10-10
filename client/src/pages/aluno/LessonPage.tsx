import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { ContentStatus, LessonKind } from "@jilson/core";
import { useSession } from "@/lib/auth-client";
import { useT } from "@/lib/language";
import { cn } from "@/lib/utils";
import { usePaginaDaAula } from "@/lib/pagina-da-aula";
import { porcentagemDoCurso, useConcluirAula } from "@/lib/progresso";
import { usePontoDaAula } from "@/lib/ponto-da-aula";
import { useEventosDaAula } from "@/lib/eventos-da-aula";
import { useLembrarLegenda, usePreferencias } from "@/lib/legenda-lembrada";
import { useIrPara } from "@/lib/versao";
import { useIdsSalvos } from "@/lib/salvos";
import { PageContainer } from "@/components/layout/PageLayout";
import { CourseContentsNav } from "@/components/aula/CourseContentsNav";
import { LessonHeader } from "@/components/aula/LessonHeader";
import { LessonContent, LessonContentCarregando } from "@/components/aula/LessonContent";
import { CourseDetails } from "@/components/aula/CourseDetails";
import { BotaoDaIa, PainelDaIa } from "@/components/aula/AiDock";

/** O servidor respondeu 404? (aula que não existe, ou fora da cadeia publicada). */
function naoEncontrada(erro: unknown): boolean {
  if (typeof erro !== "object" || erro === null || !("response" in erro)) return false;
  // Seguro: a linha acima provou que é um objeto com `response`; o resto é opcional.
  return (erro as { response?: { status?: number } }).response?.status === 404;
}

/**
 * A PÁGINA DA AULA (etapa 4 do Bloco U — decisões do operador, 28–29/09/2026, no
 * estilo do LinkedIn Learning): o conteúdo do curso no nível 2, o player grande,
 * e a IA num botão flutuante que abre um painel à direita e encolhe o player.
 * Visitante também entra: a prévia grátis toca sem login.
 */
export function LessonPage() {
  const { id } = useParams();
  const lessonId = /^\d+$/.test(id ?? "") ? Number(id) : null;
  const t = useT();
  const { data: session } = useSession();
  const { data, isPlaceholderData, isError, error, comoAdmin, carregandoSessao, refetch } = usePaginaDaAula(lessonId);
  const [iaAberta, setIaAberta] = useState(false);
  const { mutate: concluir } = useConcluirAula();
  // Com versão nova no servidor, a próxima aula abre carregando a página (06/10/2026).
  const irPara = useIrPara();
  const salvos = useIdsSalvos(Boolean(session));
  // A legenda lembrada (Bloco AULA, etapa 6, 07/10/2026): só para quem está logado.
  const preferencias = usePreferencias(Boolean(session));
  const lembrarLegenda = useLembrarLegenda();
  // Os dados DESTA aula. Enquanto a próxima carrega, a tela mostra os da anterior
  // (mesmo curso — Bloco AULA, 07/10/2026): o topo e a lista ficam, e nada da aula
  // anterior — conteúdo, conclusão, ponto — pode valer para esta.
  const daAula = data && !isPlaceholderData ? data : undefined;

  // A aula que esta pessoa pode concluir agora: logada, liberada e ainda não
  // concluída (Fase 5, 03/10/2026). O visitante da prévia grátis não tem progresso.
  const concluivel = daAula && session && daAula.aula.liberada && !daAula.concluidas.includes(daAula.aula.id) ? daAula.aula : null;
  const textoParaConcluir = concluivel?.kind === LessonKind.TEXT ? concluivel.id : null;

  // Efeito: ABRIR a aula de texto é o que a conclui (decisão do operador,
  // 03/10/2026) — uma escrita no servidor disparada pela tela que abriu.
  useEffect(() => {
    if (textoParaConcluir !== null) concluir({ lessonId: textoParaConcluir, comoAdmin });
  }, [textoParaConcluir, comoAdmin, concluir]);

  // ONDE A PESSOA PAROU, na conta (Bloco AULA, 06/10/2026): só logado e com a aula liberada.
  const ponto = usePontoDaAula({
    lessonId,
    comoAdmin,
    ativo: Boolean(session && daAula?.aula.id === lessonId && daAula.aula.liberada),
    video: daAula?.aula.kind === LessonKind.VIDEO,
    comecarEm: daAula?.aula.ponto ?? null,
  });
  // OS EVENTOS DO VÍDEO (Bloco MEDIR, 09/10/2026): só do aluno — o admin não grava.
  const eventos = useEventosDaAula({
    lessonId,
    ativo: Boolean(session && !comoAdmin && daAula?.aula.id === lessonId && daAula.aula.liberada && daAula.aula.kind === LessonKind.VIDEO),
  });
  // O player avisa uma vez; quem ouve são o ponto e os eventos.
  const ouvintes = useMemo(
    () => ({
      aoAndar: (segundos: number, duracao: number) => {
        ponto.aoAndar(segundos, duracao);
        eventos.aoAndar(segundos);
      },
      aoPausar: (segundos: number) => {
        ponto.aoPausar(segundos);
        eventos.aoPausar(segundos);
      },
      aoTocar: () => {
        ponto.aoTocar();
        eventos.aoTocar();
      },
    }),
    [ponto, eventos],
  );

  if (lessonId === null || (isError && naoEncontrada(error))) {
    return <Aviso texto={t.aula.naoEncontrada} />;
  }
  if (isError) return <Aviso texto={t.aula.erro} alerta />;
  if (carregandoSessao || !data) return <Aviso texto={t.aula.carregando} />;

  const { curso } = data;
  const aula = daAula?.aula;
  const lista = curso.modulos.flatMap((m) => m.aulas);
  // A aula na lista do curso: é dela que sai o título enquanto a aula carrega.
  const naLista = lista.find((a) => a.id === lessonId);
  const porcentagem = porcentagemDoCurso(curso, data.concluidas);
  const concluirVideo = concluivel?.kind === LessonKind.VIDEO ? () => concluir({ lessonId: concluivel.id, comoAdmin }) : undefined;
  const temArquivos = Boolean(naLista?.temArquivos);
  // A PRÓXIMA aula da lista que a pessoa vê (operador, 05/10/2026): o fim do vídeo
  // grava "viu até o fim" e leva até ela, na hora, seja vídeo ou texto; na aula de
  // texto, o botão "Próxima aula" (operador, 06/10/2026). Na última aula, nada.
  const proxima = lista[lista.findIndex((a) => a.id === lessonId) + 1];
  const aoTerminarOVideo = () => {
    ponto.aoTerminar();
    eventos.aoTerminar();
    if (proxima) irPara(`/aluno/aula/${proxima.id}`);
  };
  // A legenda vai no endereço do vídeo: logado, o player espera a preferência chegar.
  const esperandoALegenda = Boolean(session) && preferencias.isPending;
  const legendaLigada = Boolean(preferencias.data?.legendas);
  // Só grava o que MUDOU: o aviso igual ao que a conta já tem não vira pedido.
  const aoMudarLegenda = (ligada: boolean) => {
    if (ligada !== legendaLigada) lembrarLegenda(ligada);
  };
  return (
    <div className="flex min-h-full flex-col">
      {/* Barra Superior Customizada da Aula (Avatar flutua por cima, à direita) */}
      <LessonHeader
        lessonId={lessonId}
        titulo={aula?.title ?? naLista?.title ?? ""}
        status={aula?.status ?? naLista?.status ?? ContentStatus.PUBLISHED}
        curso={curso}
        logado={Boolean(session)}
        cursoSalvo={salvos.cursos.has(curso.id)}
        porcentagem={porcentagem}
      />

      <div className="mx-auto w-full max-w-[1600px] px-4 pt-[20px] pb-6 sm:px-6 sm:pb-8 md:px-[50px] md:pb-8">
        <div className={cn("grid gap-6", iaAberta && "lg:grid-cols-[minmax(0,1fr)_360px]")}>
          <div className="min-w-0 space-y-8">
            {aula && !(esperandoALegenda && aula.kind === LessonKind.VIDEO) ? (
              <LessonContent
                aula={aula}
                comoAdmin={comoAdmin}
                temArquivos={temArquivos}
                aoConcluir={concluirVideo}
                aoTerminar={aoTerminarOVideo}
                ouvintes={ouvintes}
                proximaAulaId={proxima?.id}
                podeAssinar={Boolean(session)}
                // Logado, a conta SEMPRE diz como a legenda abre: ligada ou `off` (vence a memória do aparelho).
                legenda={session ? { abrirCom: legendaLigada ? curso.language : "off", aoMudar: aoMudarLegenda } : undefined}
                // Aba aberta de um dia para o outro: a aula busca um endereço novo do vídeo (06/10/2026).
                renovarVideo={() => void refetch()}
              />
            ) : (
              <LessonContentCarregando video={(aula?.kind ?? naLista?.kind) !== LessonKind.TEXT} />
            )}

            {/* Em toda aula, liberada ou não (operador, 29/09/2026). */}
            <CourseDetails curso={curso} />
          {/* No desktop, o visitante não tem o shell, então o menu fica aqui no fim da página.
              No celular, todos agora usam a gaveta lá no topo. */}
          <div className="hidden md:block">
            {!session && <CourseContentsNav lessonId={lessonId} />}
          </div>
        </div>
        {iaAberta && (
          <div className="hidden lg:block relative">
            <div className="sticky top-8 h-[calc(100vh-64px)]">
              <PainelDaIa aoFechar={() => setIaAberta(false)} />
            </div>
          </div>
        )}
      </div>
      <BotaoDaIa aberto={iaAberta} aoAlternar={() => setIaAberta(!iaAberta)} />
      </div>
    </div>
  );
}

function Aviso({ texto, alerta = false }: { texto: string; alerta?: boolean }) {
  return (
    <PageContainer>
      <p role={alerta ? "alert" : undefined} className={cn("py-16 text-center", alerta ? "font-medium text-destructive" : "text-muted-foreground")}>
        {texto}
      </p>
    </PageContainer>
  );
}
