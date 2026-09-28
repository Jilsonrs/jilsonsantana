import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import * as api from "@/lib/api";
import { estruturaDe, moverAula, moverModulo, type Estrutura } from "@/lib/course-structure";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ModuleCard } from "./ModuleCard";
import { InsertPoint } from "./InsertPoint";

const MODULO = [{ valor: "MODULO", rotulo: "Módulo" }];

/**
 * O CONTEÚDO do curso: módulos e aulas, no passo Conteúdo do editor. Módulo e
 * aula se editam aqui mesmo, cada um salvando a sua parte (são pequenos demais
 * para ter tela própria).
 *
 * A ORDEM vai inteira numa gravação só (`PUT /admin/courses/:id/estrutura`,
 * Bloco E, etapa 2): as setas calculam a lista nova em `lib/course-structure.ts`.
 * Antes elas trocavam dois números em duas gravações, e dois itens com o mesmo
 * número (o padrão 0) não saíam do lugar.
 */
export function ModuleLessonTree({ courseId }: { courseId: number }) {
  const queryClient = useQueryClient();
  const queryKey = ["admin-course", courseId];
  const { data: course } = useQuery({ queryKey, queryFn: () => api.adminGetCourse(courseId) });
  const invalidate = () => queryClient.invalidateQueries({ queryKey });

  const modules = course?.modules ?? [];
  const estrutura = estruturaDe(modules);

  const reordenar = useMutation({
    mutationFn: (nova: Estrutura) => api.updateCourseStructure(courseId, { modulos: nova }),
    onSettled: invalidate,
  });

  // O "+" entre dois módulos: o módulo nasce naquela posição (Bloco E, etapa 2).
  const inserirModulo = (posicao: number) => (_tipo: string, titulo: string) =>
    api.insertModule(courseId, { title: titulo, posicao }).then(invalidate);

  const [newModuleTitle, setNewModuleTitle] = useState("");
  const addModule = useMutation({
    // Sem displayOrder explícito todo módulo novo nasceria em 0 (o padrão do
    // Prisma) e empataria com os outros. Entra no fim.
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
      {reordenar.isError && (
        <p role="alert" className="text-sm font-medium text-destructive">
          Não foi possível mudar a ordem. Tente de novo.
        </p>
      )}
      <InsertPoint rotulo="Inserir módulo no começo" opcoes={MODULO} aoInserir={inserirModulo(0)} />
      {modules.map((mod, index) => (
        <div key={mod.id} className="space-y-4">
          <ModuleCard
            module={mod}
            isFirst={index === 0}
            isLast={index === modules.length - 1}
            ocupado={reordenar.isPending}
            onMover={(passo) => reordenar.mutate(moverModulo(estrutura, index, passo))}
            onMoverAula={(indice, passo) => reordenar.mutate(moverAula(estrutura, mod.id, indice, passo))}
            onChanged={invalidate}
          />
          <InsertPoint rotulo={`Inserir módulo depois de ${mod.title}`} opcoes={MODULO} aoInserir={inserirModulo(index + 1)} />
        </div>
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
