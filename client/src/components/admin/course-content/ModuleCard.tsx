import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Layer, ContentStatus, LessonKind } from "@jilson/core";
import * as api from "@/lib/api";
import type { AdminLesson, AdminModule } from "@/lib/api";
import { ROTULO_DO_STATUS } from "@/lib/course-completeness";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { LessonRow } from "./LessonRow";
import { InsertPoint, type OpcaoDeInsercao } from "./InsertPoint";
import { AlcaDeArraste, useArrastavel } from "./arrastar";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { idDoArraste } from "@/lib/course-structure";
import { mensagemAoExcluir } from "@/lib/course-form";

// O que o "+" entre duas aulas oferece (operador, 27–28/09/2026). O quiz tem
// etapa própria: por enquanto, EM BREVE.
const TIPOS_DE_AULA: OpcaoDeInsercao[] = [
  { valor: LessonKind.VIDEO, rotulo: "Aula de vídeo" },
  { valor: LessonKind.TEXT, rotulo: "Aula de texto" },
  { valor: "QUIZ", rotulo: "Quiz", emBreve: true },
];

// A classe inteira escrita aqui, como texto (GEMINI.md, regra 1).
export const CLASSE_DO_SELECT_PEQUENO =
  "h-[56px] rounded-xl border border-border/60 bg-background px-6 py-4 text-[1.05rem] shadow-[0_10px_40px_rgba(0,0,0,0.03),0_2px_10px_rgba(35,143,232,0.05)] focus-visible:outline-none focus-visible:border-primary focus-visible:shadow-[0_10px_40px_rgba(35,143,232,0.12)] transition-all duration-300";

/** Um módulo do curso: título, camada, status, a ordem, e as aulas dele. */
export function ModuleCard({
  module,
  isFirst,
  isLast,
  ocupado,
  onMover,
  onMoverAula,
  onChanged,
}: {
  module: AdminModule;
  isFirst: boolean;
  isLast: boolean;
  /** Uma mudança de ordem está sendo gravada: as setas esperam. */
  ocupado: boolean;
  onMover: (passo: -1 | 1) => void;
  onMoverAula: (indice: number, passo: -1 | 1) => void;
  onChanged: () => void;
}) {
  const [title, setTitle] = useState(module.title);
  const [layer, setLayer] = useState<string>(module.layer ?? "");
  const [status, setStatus] = useState<string>(module.status);

  const save = useMutation({
    mutationFn: () =>
      api.updateModule(module.id, {
        title,
        // Seguros: os dois selects só oferecem valores das listas do core.
        layer: layer === "" ? undefined : (layer as Layer),
        status: status as ContentStatus,
      }),
    onSuccess: onChanged,
  });
  const del = useMutation({
    mutationFn: () => api.deleteModule(module.id),
    onSuccess: onChanged,
  });
  const { setNodeRef, estilo, alca } = useArrastavel({ tipo: "modulo", id: module.id });

  return (
    <Card ref={setNodeRef} style={estilo}>
      <CardHeader className="flex flex-row items-center gap-2 space-y-0">
        <AlcaDeArraste rotulo={`Arrastar o módulo ${module.title}`} alca={alca} />
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className="max-w-xs" aria-label="Título do módulo" />
          <select value={layer} onChange={(e) => setLayer(e.target.value)} className={CLASSE_DO_SELECT_PEQUENO} aria-label="Camada do módulo">
            <option value="">sem camada</option>
            {Object.values(Layer).map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={CLASSE_DO_SELECT_PEQUENO} aria-label="Status do módulo">
            {Object.values(ContentStatus).map((s) => (
              <option key={s} value={s}>
                {ROTULO_DO_STATUS[s]}
              </option>
            ))}
          </select>
          <Button type="button" size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
            Salvar
          </Button>
        </div>
        <Button type="button" variant="ghost" size="icon" aria-label={`Subir o módulo ${module.title}`} onClick={() => onMover(-1)} disabled={isFirst || ocupado}>
          <ArrowUp className="h-4 w-4" />
        </Button>
        <Button type="button" variant="ghost" size="icon" aria-label={`Descer o módulo ${module.title}`} onClick={() => onMover(1)} disabled={isLast || ocupado}>
          <ArrowDown className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Excluir o módulo ${module.title}`}
          onClick={() => {
            if (confirm(`Excluir o módulo "${module.title}" e suas aulas?`)) del.mutate();
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {del.isError && (
          <p role="alert" className="w-full text-sm font-medium text-destructive">
            {mensagemAoExcluir(del.error)}
          </p>
        )}
        <LessonList moduleId={module.id} lessons={module.lessons} ocupado={ocupado} onMoverAula={onMoverAula} onChanged={onChanged} />
      </CardContent>
    </Card>
  );
}

function LessonList({
  moduleId,
  lessons,
  ocupado,
  onMoverAula,
  onChanged,
}: {
  moduleId: number;
  lessons: AdminLesson[];
  ocupado: boolean;
  onMoverAula: (indice: number, passo: -1 | 1) => void;
  onChanged: () => void;
}) {
  const [newTitle, setNewTitle] = useState("");
  const addLesson = useMutation({
    // Mesma razão do módulo: entra no fim, sem empatar em 0.
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

  // O "+" na posição `posicao`: a aula nasce ali (Bloco E, etapa 2).
  const inserirAqui = (posicao: number) => (tipo: string, titulo: string) =>
    // Seguro: o "+" só oferece os tipos de TIPOS_DE_AULA que não são "em breve".
    api.insertLesson(moduleId, { title: titulo, kind: tipo as LessonKind, posicao }).then(onChanged);

  return (
    <div className="space-y-1 pl-4">
      <InsertPoint rotulo="Inserir no começo do módulo" opcoes={TIPOS_DE_AULA} aoInserir={inserirAqui(0)} />
      <SortableContext items={lessons.map((l) => idDoArraste({ tipo: "aula", id: l.id }))} strategy={verticalListSortingStrategy}>
        {lessons.map((lesson, index) => (
          <div key={lesson.id} className="space-y-1">
            <LessonRow
              lesson={lesson}
              isFirst={index === 0}
              isLast={index === lessons.length - 1}
              ocupado={ocupado}
              onMover={(passo) => onMoverAula(index, passo)}
              onChanged={onChanged}
            />
            <InsertPoint rotulo={`Inserir depois de ${lesson.title}`} opcoes={TIPOS_DE_AULA} aoInserir={inserirAqui(index + 1)} />
          </div>
        ))}
      </SortableContext>
      <div className="flex gap-2">
        <Input placeholder="Título da nova aula" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
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
