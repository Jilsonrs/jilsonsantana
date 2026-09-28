import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { ContentStatus } from "@jilson/core";
import * as api from "@/lib/api";
import type { AdminLesson } from "@/lib/api";
import { ROTULO_DO_STATUS } from "@/lib/course-completeness";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CLASSE_DO_SELECT_PEQUENO } from "./opcoes";

/**
 * A EDIÇÃO de uma aula, aberta pelo lápis (como na Udemy — operador, 28/09/2026):
 * título, palavras-chave e status, com "Cancelar" e "Salvar". Fora disto, a linha
 * mostra só o texto.
 */
export function LessonEditForm({
  lesson,
  aoTerminar,
  onChanged,
}: {
  lesson: AdminLesson;
  aoTerminar: () => void;
  onChanged: () => void;
}) {
  const [title, setTitle] = useState(lesson.title);
  const [tagsText, setTagsText] = useState(lesson.tags.join(", "));
  const [status, setStatus] = useState<string>(lesson.status);

  const salvar = useMutation({
    mutationFn: () =>
      api.updateLesson(lesson.id, {
        title: title.trim(),
        tags: tagsText.split(",").map((t) => t.trim()).filter(Boolean),
        // Seguro: o select só oferece valores de ContentStatus.
        status: status as ContentStatus,
      }),
    onSuccess: () => {
      onChanged();
      aoTerminar();
    },
  });

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (title.trim()) salvar.mutate();
  }

  return (
    <form onSubmit={enviar} className="flex flex-wrap items-center gap-2">
      <Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} className="max-w-xs" aria-label="Título da aula" />
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
      <Button type="button" variant="ghost" size="sm" onClick={aoTerminar}>
        Cancelar
      </Button>
      <Button type="submit" size="sm" disabled={!title.trim() || salvar.isPending}>
        Salvar
      </Button>
      {salvar.isError && (
        <p role="alert" className="w-full text-sm font-medium text-destructive">
          Não foi possível salvar a aula. Tente de novo.
        </p>
      )}
    </form>
  );
}
