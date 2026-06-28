import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Layer, ContentStatus } from "@jilson/core";
import * as api from "@/lib/api";
import type { AdminLesson, AdminModule } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

// Module/lesson are edited inline inside the course form page (not their own
// screens) — both are small, child content of a course, and this avoids
// multiplying pages for a handful of fields each. Reorder is two PATCHes
// swapping displayOrder with the adjacent sibling — no drag-and-drop lib for
// a short list edited only by the operator (CLAUDE.md: AUTO effort).
export function ModuleLessonTree({ courseId }: { courseId: number }) {
  const queryClient = useQueryClient();
  const queryKey = ["admin-course", courseId];
  const { data: course } = useQuery({ queryKey, queryFn: () => api.adminGetCourse(courseId) });
  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const modules = course?.modules ?? [];

  const [newModuleTitle, setNewModuleTitle] = useState("");
  const addModule = useMutation({
    // Without an explicit displayOrder every new module defaults to 0
    // (Prisma's @default(0)) — they'd all tie, making the up/down reorder
    // buttons a no-op for anything just added. Append at the end instead.
    mutationFn: () =>
      api.createModule({
        courseId,
        title: newModuleTitle,
        displayOrder: modules.length === 0 ? 0 : Math.max(...modules.map((m) => m.displayOrder)) + 1,
      }),
    onSuccess: () => {
      setNewModuleTitle("");
      invalidate();
    },
  });

  return (
    <div className="space-y-4">
      {modules.map((mod, index) => (
        <ModuleCard
          key={mod.id}
          module={mod}
          isFirst={index === 0}
          isLast={index === modules.length - 1}
          siblingAbove={modules[index - 1]}
          siblingBelow={modules[index + 1]}
          onChanged={invalidate}
        />
      ))}

      <Card>
        <CardContent className="flex gap-2 pt-6">
          <Input
            placeholder="Título do novo módulo"
            value={newModuleTitle}
            onChange={(e) => setNewModuleTitle(e.target.value)}
          />
          <Button
            type="button"
            onClick={() => addModule.mutate()}
            disabled={!newModuleTitle.trim() || addModule.isPending}
          >
            <Plus className="mr-1 h-4 w-4" /> Adicionar módulo
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function ModuleCard({
  module,
  isFirst,
  isLast,
  siblingAbove,
  siblingBelow,
  onChanged,
}: {
  module: AdminModule;
  isFirst: boolean;
  isLast: boolean;
  siblingAbove?: AdminModule;
  siblingBelow?: AdminModule;
  onChanged: () => void;
}) {
  const [title, setTitle] = useState(module.title);
  const [layer, setLayer] = useState<string>(module.layer ?? "");
  const [status, setStatus] = useState<string>(module.status);

  const save = useMutation({
    mutationFn: () =>
      api.updateModule(module.id, {
        title,
        layer: layer === "" ? undefined : (layer as Layer),
        status: status as ContentStatus,
      }),
    onSuccess: onChanged,
  });
  const del = useMutation({
    mutationFn: () => api.deleteModule(module.id),
    onSuccess: onChanged,
  });
  const moveUp = useMutation({
    mutationFn: async () => {
      if (!siblingAbove) return;
      await api.updateModule(module.id, { displayOrder: siblingAbove.displayOrder });
      await api.updateModule(siblingAbove.id, { displayOrder: module.displayOrder });
    },
    onSuccess: onChanged,
  });
  const moveDown = useMutation({
    mutationFn: async () => {
      if (!siblingBelow) return;
      await api.updateModule(module.id, { displayOrder: siblingBelow.displayOrder });
      await api.updateModule(siblingBelow.id, { displayOrder: module.displayOrder });
    },
    onSuccess: onChanged,
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 space-y-0">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className="max-w-xs" />
          <select
            value={layer}
            onChange={(e) => setLayer(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">sem camada</option>
            {Object.values(Layer).map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            {Object.values(ContentStatus).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <Button type="button" size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
            Salvar
          </Button>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={() => moveUp.mutate()} disabled={isFirst}>
          <ArrowUp className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" onClick={() => moveDown.mutate()} disabled={isLast}>
          <ArrowDown className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => {
            if (confirm(`Excluir o módulo "${module.title}" e suas aulas?`)) del.mutate();
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <LessonList moduleId={module.id} lessons={module.lessons} onChanged={onChanged} />
      </CardContent>
    </Card>
  );
}

function LessonList({
  moduleId,
  lessons,
  onChanged,
}: {
  moduleId: number;
  lessons: AdminLesson[];
  onChanged: () => void;
}) {
  const [newTitle, setNewTitle] = useState("");
  const addLesson = useMutation({
    // Same reasoning as addModule: append at the end of displayOrder, don't
    // let every new lesson default to a tied 0.
    mutationFn: () =>
      api.createLesson({
        moduleId,
        title: newTitle,
        displayOrder: lessons.length === 0 ? 0 : Math.max(...lessons.map((l) => l.displayOrder)) + 1,
      }),
    onSuccess: () => {
      setNewTitle("");
      onChanged();
    },
  });

  return (
    <div className="space-y-2 pl-4">
      {lessons.map((lesson, index) => (
        <LessonRow
          key={lesson.id}
          lesson={lesson}
          isFirst={index === 0}
          isLast={index === lessons.length - 1}
          siblingAbove={lessons[index - 1]}
          siblingBelow={lessons[index + 1]}
          onChanged={onChanged}
        />
      ))}
      <div className="flex gap-2">
        <Input
          placeholder="Título da nova aula"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => addLesson.mutate()}
          disabled={!newTitle.trim() || addLesson.isPending}
        >
          <Plus className="mr-1 h-4 w-4" /> Adicionar aula
        </Button>
      </div>
    </div>
  );
}

function LessonRow({
  lesson,
  isFirst,
  isLast,
  siblingAbove,
  siblingBelow,
  onChanged,
}: {
  lesson: AdminLesson;
  isFirst: boolean;
  isLast: boolean;
  siblingAbove?: AdminLesson;
  siblingBelow?: AdminLesson;
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
        status: status as ContentStatus,
      }),
    onSuccess: onChanged,
  });
  const del = useMutation({
    mutationFn: () => api.deleteLesson(lesson.id),
    onSuccess: onChanged,
  });
  const moveUp = useMutation({
    mutationFn: async () => {
      if (!siblingAbove) return;
      await api.updateLesson(lesson.id, { displayOrder: siblingAbove.displayOrder });
      await api.updateLesson(siblingAbove.id, { displayOrder: lesson.displayOrder });
    },
    onSuccess: onChanged,
  });
  const moveDown = useMutation({
    mutationFn: async () => {
      if (!siblingBelow) return;
      await api.updateLesson(lesson.id, { displayOrder: siblingBelow.displayOrder });
      await api.updateLesson(siblingBelow.id, { displayOrder: lesson.displayOrder });
    },
    onSuccess: onChanged,
  });

  return (
    <div className="flex flex-wrap items-center gap-2 border-l border-border pl-3">
      <Input value={title} onChange={(e) => setTitle(e.target.value)} className="max-w-xs" />
      <Input
        placeholder="tags, separadas, por vírgula"
        value={tagsText}
        onChange={(e) => setTagsText(e.target.value)}
        className="max-w-xs"
      />
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
      >
        {Object.values(ContentStatus).map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <Button type="button" size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
        Salvar
      </Button>
      <Button type="button" variant="ghost" size="icon" onClick={() => moveUp.mutate()} disabled={isFirst}>
        <ArrowUp className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="icon" onClick={() => moveDown.mutate()} disabled={isLast}>
        <ArrowDown className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => {
          if (confirm(`Excluir a aula "${lesson.title}"?`)) del.mutate();
        }}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
