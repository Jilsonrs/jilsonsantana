import { useState } from "react";
import { useParams } from "react-router-dom";
import { ContentStatus } from "@jilson/core";
import { useSession } from "@/lib/auth-client";
import { useT } from "@/lib/language";
import { cn } from "@/lib/utils";
import { usePaginaDaAula } from "@/lib/pagina-da-aula";
import { PageContainer, PageHeader } from "@/components/layout/PageLayout";
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
    <PageContainer>
      <PageHeader
        title={aula.title}
        description={curso.title}
        actions={
          aula.status !== ContentStatus.PUBLISHED && (
            <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
              {aula.status === ContentStatus.ARCHIVED ? t.aula.arquivado : t.aula.rascunho}
            </span>
          )
        }
      />
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
    </PageContainer>
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
