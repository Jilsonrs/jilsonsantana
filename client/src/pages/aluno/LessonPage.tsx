import { useState } from "react";
import { useParams } from "react-router-dom";
import { ContentStatus } from "@jilson/core";
import { useSession } from "@/lib/auth-client";
import { useT } from "@/lib/language";
import { cn } from "@/lib/utils";
import { usePaginaDaAula } from "@/lib/pagina-da-aula";
import { PageContainer } from "@/components/layout/PageLayout";
import { CourseContentsNav } from "@/components/aula/CourseContentsNav";
import { LessonContent } from "@/components/aula/LessonContent";
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
  const { data, isError, error, comoAdmin, carregandoSessao } = usePaginaDaAula(lessonId);
  const [iaAberta, setIaAberta] = useState(false);

  if (lessonId === null || (isError && naoEncontrada(error))) {
    return <Aviso texto={t.aula.naoEncontrada} />;
  }
  if (isError) return <Aviso texto={t.aula.erro} alerta />;
  if (carregandoSessao || !data) return <Aviso texto={t.aula.carregando} />;

  const { curso, aula } = data;
  const temArquivos = curso.modulos.some((m) => m.aulas.some((a) => a.id === aula.id && a.temArquivos));
  return (
    <div className="flex min-h-full flex-col">
      {/* Barra Superior Customizada da Aula (Avatar flutua por cima, à direita) */}
      <div className="relative flex min-h-[60px] md:min-h-[80px] items-center px-4 sm:px-6 md:px-[50px] border-b border-border/40 bg-card/50">
        <div className="flex flex-col justify-center max-w-[80%] py-3 gap-1">
          <h1 className="text-lg md:text-2xl font-display font-bold tracking-tight text-foreground truncate flex items-center gap-3">
            {aula.title}
            {aula.status !== ContentStatus.PUBLISHED && (
              <span className="inline-flex rounded-full border border-border px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-muted-foreground">
                {aula.status === ContentStatus.ARCHIVED ? t.aula.arquivado : t.aula.rascunho}
              </span>
            )}
          </h1>
          <span className="text-sm md:text-[0.95rem] text-muted-foreground truncate">
            {curso.title}
          </span>
        </div>

        {/* Linha de progresso (visual) */}
        <div className="absolute bottom-0 left-4 right-4 sm:left-6 sm:right-6 md:left-[50px] md:right-[50px] h-[3px] bg-primary/10" aria-hidden="true">
          {/* Valor estático para visualização do design, será dinâmico depois */}
          <div className="h-full bg-primary rounded-r-full transition-all duration-500" style={{ width: "35%" }} />
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1600px] px-4 pt-[20px] pb-6 sm:px-6 sm:pb-8 md:px-[50px] md:pb-8">
        <div className={cn("grid gap-6", iaAberta && "lg:grid-cols-[minmax(0,1fr)_360px]")}>
          <div className="min-w-0 space-y-8">
            <LessonContent aula={aula} comoAdmin={comoAdmin} temArquivos={temArquivos} />

            {/* Em toda aula, liberada ou não (operador, 29/09/2026). */}
            <CourseDetails curso={curso} />
          {/* No computador, quem está logado vê o conteúdo do curso no nível 2 da
              navegação. No celular, e para o visitante (que não tem o shell), ele
              fica aqui embaixo — o nível 2 nunca some (design.md §6). */}
          <div className={cn(session && "md:hidden")}>
            <CourseContentsNav lessonId={lessonId} />
          </div>
        </div>
        {iaAberta && <PainelDaIa aoFechar={() => setIaAberta(false)} />}
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
