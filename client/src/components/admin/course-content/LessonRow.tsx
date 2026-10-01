import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, Eye, Pencil, Trash2 } from "lucide-react";
import { LessonKind } from "@jilson/core";
import * as api from "@/lib/api";
import type { AdminLesson } from "@/lib/api";
import { ROTULO_DO_STATUS } from "@/lib/course-completeness";
import { mensagemAoExcluir } from "@/lib/course-form";
import { Button } from "@/components/ui/button";
import { LessonEditForm } from "./LessonEditForm";
import { LessonTextPanel } from "./LessonTextPanel";
import { LessonVideoPanel } from "./LessonVideoPanel";
import { LessonFilesPanel } from "./LessonFilesPanel";
import { AlcaDeArraste, useArrastavel } from "./arrastar";
import { useAulasAbertas } from "./aulas-abertas";
import { CLASSE_DA_ETIQUETA } from "./opcoes";

const ROTULO_DO_TIPO: Record<LessonKind, string> = { VIDEO: "Vídeo", TEXT: "Texto" };

/**
 * Uma aula, como na Udemy (operador, 28/09/2026): a linha mostra o tipo, o título
 * e o status; o lápis abre a edição (com Cancelar e Salvar). A seta no fim da
 * linha abre e recolhe a aula: dentro, o conteúdo (o vídeo ou o texto) e,
 * embaixo, os arquivos. Quem começa aberta, e a aula recém-criada, vêm de
 * `aulas-abertas.tsx` (operador, 29/09/2026).
 */
export function LessonRow({
  lesson,
  isFirst,
  isLast,
  ocupado,
  onMover,
  onChanged,
}: {
  lesson: AdminLesson;
  isFirst: boolean;
  isLast: boolean;
  ocupado: boolean;
  onMover: (passo: -1 | 1) => void;
  onChanged: () => void;
}) {
  const [editando, setEditando] = useState(false);
  const { estaAberta, alternar } = useAulasAbertas();
  const aberta = estaAberta(lesson.id);

  const del = useMutation({
    mutationFn: () => api.deleteLesson(lesson.id),
    onSuccess: onChanged,
  });
  const { setNodeRef, estilo, alca } = useArrastavel({ tipo: "aula", id: lesson.id });

  return (
    <div ref={setNodeRef} style={estilo} className="space-y-2 group">
      <div className="flex flex-wrap items-center gap-2 border-l-2 border-border pl-4 py-2 pr-2 rounded-r-md hover:bg-muted/30 transition-colors">
        <AlcaDeArraste rotulo={`Arrastar a aula ${lesson.title}`} alca={alca} />
        <span className={CLASSE_DA_ETIQUETA}>{ROTULO_DO_TIPO[lesson.kind]}</span>
        {editando ? (
          <LessonEditForm lesson={lesson} aoTerminar={() => setEditando(false)} onChanged={onChanged} />
        ) : (
          <>
            <p className="text-sm font-medium">{lesson.title}</p>
            <span className={CLASSE_DA_ETIQUETA}>{ROTULO_DO_STATUS[lesson.status]}</span>
            {lesson.isFreePreview && <span className={CLASSE_DA_ETIQUETA}>Prévia grátis</span>}
            <Button type="button" variant="ghost" size="icon" aria-label={`Editar a aula ${lesson.title}`} onClick={() => setEditando(true)}>
              <Pencil className="h-4 w-4" />
            </Button>
          </>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-1">
          {/* A aula como o aluno vê (etapa 4 do Bloco U, 29/09/2026). Em aba nova:
              um envio de vídeo em andamento aqui continua sem interrupção. */}
          <Button asChild variant="ghost" size="sm">
            <a href={`/aluno/aula/${lesson.id}`} target="_blank" rel="noopener noreferrer" aria-label={`Visualizar a aula ${lesson.title}`} className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Visualizar
            </a>
          </Button>
          <Button type="button" variant="ghost" size="icon" aria-label={`Subir a aula ${lesson.title}`} onClick={() => onMover(-1)} disabled={isFirst || ocupado}>
            <ArrowUp className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" aria-label={`Descer a aula ${lesson.title}`} onClick={() => onMover(1)} disabled={isLast || ocupado}>
            <ArrowDown className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Excluir a aula ${lesson.title}`}
            onClick={() => {
              if (confirm(`Excluir a aula "${lesson.title}"?`)) del.mutate();
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-expanded={aberta}
            aria-label={`${aberta ? "Recolher" : "Abrir"} a aula ${lesson.title}`}
            onClick={() => alternar(lesson.id)}
          >
            {aberta ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      {del.isError && (
        <p role="alert" className="w-full text-sm font-medium text-destructive">
          {mensagemAoExcluir(del.error)}
        </p>
      )}
      {aberta && (
        <div className="space-y-3 rounded-lg border border-border p-3">
          {lesson.kind === LessonKind.TEXT ? (
            <LessonTextPanel lesson={lesson} onChanged={onChanged} />
          ) : (
            <LessonVideoPanel lesson={lesson} onChanged={onChanged} />
          )}
          <div className="border-t border-border pt-3">
            <LessonFilesPanel lesson={lesson} />
          </div>
        </div>
      )}
    </div>
  );
}
