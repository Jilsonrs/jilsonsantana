import { useMutation } from "@tanstack/react-query";
import * as api from "@/lib/api";
import type { AdminModule } from "@/lib/api";
import { mensagemAoExcluir } from "@/lib/course-form";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ModuleHeader } from "./ModuleHeader";
import { LessonList } from "./LessonList";
import { useArrastavel } from "./arrastar";

/** Um módulo do curso: o cabeçalho (ver ou editar) e as aulas dele. */
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
  const del = useMutation({
    mutationFn: () => api.deleteModule(module.id),
    onSuccess: onChanged,
  });
  const { setNodeRef, estilo, alca } = useArrastavel({ tipo: "modulo", id: module.id });

  return (
    <Card ref={setNodeRef} style={estilo}>
      <CardHeader className="space-y-0">
        <ModuleHeader
          module={module}
          alca={alca}
          isFirst={isFirst}
          isLast={isLast}
          ocupado={ocupado}
          onMover={onMover}
          onExcluir={() => {
            if (confirm(`Excluir o módulo "${module.title}" e suas aulas?`)) del.mutate();
          }}
          onChanged={onChanged}
        />
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
