import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "@/lib/api";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import {
  aplicarArraste,
  estruturaDe,
  idDoArraste,
  moverAula,
  moverModulo,
  type Estrutura,
  type ItemArrastavel,
} from "@/lib/course-structure";
import { ModuleCard } from "./ModuleCard";
import { InsertPoint } from "./InsertPoint";
import { MODULO } from "./opcoes";
import { ArrasteDoCurso } from "./arrastar";


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
  // O título de cada item arrastável, para os avisos ao leitor de tela.
  const nomes = new Map<string, string>(
    modules.flatMap((m) => [
      [idDoArraste({ tipo: "modulo", id: m.id }), `o módulo ${m.title}`] as const,
      ...m.lessons.map((l) => [idDoArraste({ tipo: "aula", id: l.id }), `a aula ${l.title}`] as const),
    ]),
  );

  const reordenar = useMutation({
    mutationFn: (nova: Estrutura) => api.updateCourseStructure(courseId, { modulos: nova }),
    onSettled: invalidate,
  });

  // Soltou o que arrastava: grava só se a ordem mudou (soltar no mesmo lugar não
  // é uma edição).
  function soltar(ativo: ItemArrastavel, alvo: ItemArrastavel) {
    const nova = aplicarArraste(estrutura, ativo, alvo);
    if (JSON.stringify(nova) !== JSON.stringify(estrutura)) reordenar.mutate(nova);
  }

  // O "+" entre dois módulos: o módulo nasce naquela posição (Bloco E, etapa 2).
  const inserirModulo = (posicao: number) => (_tipo: string, titulo: string) =>
    api.insertModule(courseId, { title: titulo, posicao }).then(invalidate);

  return (
    <div className="space-y-4">
      {reordenar.isError && (
        <p role="alert" className="text-sm font-medium text-destructive">
          Não foi possível mudar a ordem. Tente de novo.
        </p>
      )}
      <InsertPoint rotulo="Inserir módulo no começo" opcoes={MODULO} aoInserir={inserirModulo(0)} />
      <ArrasteDoCurso nomes={nomes} aoSoltar={soltar}>
        <SortableContext items={modules.map((m) => idDoArraste({ tipo: "modulo", id: m.id }))} strategy={verticalListSortingStrategy}>
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
              {/* Depois do último módulo, quem insere é o "+ Módulo", logo abaixo. */}
              {index < modules.length - 1 && (
                <InsertPoint rotulo={`Inserir módulo depois de ${mod.title}`} opcoes={MODULO} aoInserir={inserirModulo(index + 1)} />
              )}
            </div>
          ))}
        </SortableContext>
      </ArrasteDoCurso>

      {/* Como na Udemy (operador, 28/09/2026): o botão abre o título, e "Adicionar
          módulo" já grava — sem campo fixo nem Salvar. */}
      <InsertPoint rotulo="Adicionar módulo no fim do curso" fixo="Módulo" opcoes={MODULO} aoInserir={inserirModulo(modules.length)} />
    </div>
  );
}
