import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { ContentStatus, LessonKind } from "@jilson/core";
import * as api from "@/lib/api";
import type { AdminLesson } from "@/lib/api";
import { ROTULO_DO_STATUS } from "@/lib/course-completeness";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CLASSE_DO_SELECT_PEQUENO } from "./ModuleCard";
import { LessonTextPanel } from "./LessonTextPanel";
import { LessonVideoPanel } from "./LessonVideoPanel";
import { LessonFilesPanel } from "./LessonFilesPanel";
import { AlcaDeArraste, useArrastavel } from "./arrastar";

const ROTULO_DO_TIPO: Record<LessonKind, string> = { VIDEO: "Vídeo", TEXT: "Texto" };

/**
 * Uma aula: o tipo, título, palavras-chave, status, a ordem e excluir. A aula de
 * TEXTO abre o painel do texto; a de vídeo não tem texto (operador, 28/09/2026).
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
  const [title, setTitle] = useState(lesson.title);
  const [tagsText, setTagsText] = useState(lesson.tags.join(", "));
  const [status, setStatus] = useState<string>(lesson.status);
  // Um painel aberto por vez: o conteúdo (texto ou vídeo) ou os arquivos.
  const [aberto, setAberto] = useState<"conteudo" | "arquivos" | null>(null);
  const alternar = (painel: "conteudo" | "arquivos") => setAberto(aberto === painel ? null : painel);

  const save = useMutation({
    mutationFn: () =>
      api.updateLesson(lesson.id, {
        title,
        tags: tagsText.split(",").map((t) => t.trim()).filter(Boolean),
        // Seguro: o select só oferece valores de ContentStatus.
        status: status as ContentStatus,
      }),
    onSuccess: onChanged,
  });
  const del = useMutation({
    mutationFn: () => api.deleteLesson(lesson.id),
    onSuccess: onChanged,
  });
  const { setNodeRef, estilo, alca } = useArrastavel({ tipo: "aula", id: lesson.id });

  return (
    <div ref={setNodeRef} style={estilo} className="space-y-2">
      <div className="flex flex-wrap items-center gap-2 border-l border-border pl-3">
        <AlcaDeArraste rotulo={`Arrastar a aula ${lesson.title}`} alca={alca} />
        <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
          {ROTULO_DO_TIPO[lesson.kind]}
        </span>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} className="max-w-xs" aria-label="Título da aula" />
        <Input
          placeholder="tags, separadas, por vírgula"
          value={tagsText}
          onChange={(e) => setTagsText(e.target.value)}
          className="max-w-xs"
          aria-label="Palavras-chave da aula"
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={CLASSE_DO_SELECT_PEQUENO} aria-label="Status da aula">
          {Object.values(ContentStatus).map((s) => (
            <option key={s} value={s}>
              {ROTULO_DO_STATUS[s]}
            </option>
          ))}
        </select>
        <Button type="button" size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
          Salvar
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
        <Button type="button" variant="outline" size="sm" aria-expanded={aberto === "conteudo"} onClick={() => alternar("conteudo")}>
          {lesson.kind === LessonKind.TEXT
            ? aberto === "conteudo" ? "Fechar texto" : "Editar texto"
            : aberto === "conteudo" ? "Fechar vídeo" : "Vídeo da aula"}
        </Button>
        <Button type="button" variant="outline" size="sm" aria-expanded={aberto === "arquivos"} onClick={() => alternar("arquivos")}>
          {aberto === "arquivos" ? "Fechar arquivos" : "Arquivos"}
        </Button>
        {lesson.isFreePreview && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">Prévia grátis</span>
        )}
      </div>
      {aberto === "conteudo" &&
        (lesson.kind === LessonKind.TEXT ? (
          <LessonTextPanel lesson={lesson} onChanged={onChanged} />
        ) : (
          <LessonVideoPanel lesson={lesson} onChanged={onChanged} />
        ))}
      {aberto === "arquivos" && <LessonFilesPanel lesson={lesson} />}
    </div>
  );
}
