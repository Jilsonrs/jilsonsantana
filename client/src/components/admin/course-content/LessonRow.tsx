import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { ContentStatus } from "@jilson/core";
import * as api from "@/lib/api";
import type { AdminLesson } from "@/lib/api";
import { ROTULO_DO_STATUS } from "@/lib/course-completeness";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CLASSE_DO_SELECT_PEQUENO } from "./ModuleCard";

/** Uma aula: título, palavras-chave, status, a ordem e excluir. */
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

  return (
    <div className="flex flex-wrap items-center gap-2 border-l border-border pl-3">
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
    </div>
  );
}
