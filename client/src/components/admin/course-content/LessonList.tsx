import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { LessonKind } from "@jilson/core";
import * as api from "@/lib/api";
import type { AdminLesson } from "@/lib/api";
import { idDoArraste } from "@/lib/course-structure";
import { LessonRow } from "./LessonRow";
import { InsertPoint } from "./InsertPoint";
import { TIPOS_DE_AULA } from "./opcoes";

/**
 * As aulas de um módulo, com o "+" entre elas e o "+ Aula" no fim (como na Udemy
 * — operador, 28/09/2026: adicionar já grava, sem campo fixo nem Salvar).
 */
export function LessonList({
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
  // A aula nasce NA POSIÇÃO (Bloco E, etapa 2).
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
            {/* Depois da última aula, quem insere é o "+ Aula", logo abaixo. */}
            {index < lessons.length - 1 && (
              <InsertPoint rotulo={`Inserir depois de ${lesson.title}`} opcoes={TIPOS_DE_AULA} aoInserir={inserirAqui(index + 1)} />
            )}
          </div>
        ))}
      </SortableContext>
      <div className="pt-2">
        <InsertPoint rotulo="Adicionar aula no fim do módulo" fixo="Aula" opcoes={TIPOS_DE_AULA} aoInserir={inserirAqui(lessons.length)} />
      </div>
    </div>
  );
}
