import type { CSSProperties, ReactNode } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  pointerWithin,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type KeyboardCoordinateGetter,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { idDoArraste, lerIdDoArraste, type ItemArrastavel } from "@/lib/course-structure";

// ARRASTAR módulos e aulas (Bloco E, etapa 2 — dnd-kit liberado pelo operador em
// 28/09/2026). As setas continuam. Esta peça só carrega no passo Conteúdo do
// admin (o passo é `lazy()`): o aluno não a baixa.

/**
 * Onde o item caiu. Módulo só cai sobre módulo. Aula cai primeiro sobre a aula
 * que está debaixo do ponteiro; se não há aula ali (módulo vazio), sobre o
 * módulo; pelo teclado, que não tem ponteiro, sobre a aula mais próxima.
 */
const ondeCaiu: CollisionDetection = (args) => {
  const doTipo = (tipo: ItemArrastavel["tipo"]) =>
    args.droppableContainers.filter((c) => lerIdDoArraste(c.id)?.tipo === tipo);
  if (lerIdDoArraste(args.active.id)?.tipo === "modulo") {
    return closestCenter({ ...args, droppableContainers: doTipo("modulo") });
  }
  const naAula = pointerWithin({ ...args, droppableContainers: doTipo("aula") });
  if (naAula.length > 0) return naAula;
  const noModulo = pointerWithin({ ...args, droppableContainers: doTipo("modulo") });
  if (noModulo.length > 0) return noModulo;
  return closestCenter({ ...args, droppableContainers: doTipo("aula") });
};

/**
 * A seta do teclado procura o próximo item DO MESMO TIPO. Sem isto, a seta para
 * baixo, partindo de um módulo, parava na primeira aula dele (que está logo
 * abaixo na tela), e o módulo "caía" sobre si mesmo: não saía do lugar.
 */
const setaDoMesmoTipo: KeyboardCoordinateGetter = (evento, args) => {
  const { droppableContainers: todos, active } = args.context;
  const tipo = active ? lerIdDoArraste(active.id)?.tipo : undefined;
  // A lista do dnd-kit é uma subclasse de Map que o pacote não exporta: a cópia
  // nasce da mesma classe, para manter os métodos que a seta usa.
  const Classe = todos.constructor as new () => typeof todos;
  const doTipo = new Classe();
  for (const alvo of todos.toArray()) {
    if (lerIdDoArraste(alvo.id)?.tipo === tipo) doTipo.set(alvo.id, alvo);
  }
  return sortableKeyboardCoordinates(evento, { ...args, context: { ...args.context, droppableContainers: doTipo } });
};

/**
 * O contexto do arrastar. `nomes` dá o título de cada item para os avisos ao
 * leitor de tela, que saem em português (o padrão do dnd-kit é inglês, e o
 * admin fica em português — decisão do operador, 23/09).
 */
export function ArrasteDoCurso({
  nomes,
  aoSoltar,
  children,
}: {
  nomes: Map<string, string>;
  aoSoltar: (ativo: ItemArrastavel, alvo: ItemArrastavel) => void;
  children: ReactNode;
}) {
  const sensores = useSensors(
    // 5 px antes de começar: um clique na alça não vira arraste por engano.
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: setaDoMesmoTipo }),
  );
  const nome = (id: string | number) => nomes.get(String(id)) ?? "o item";

  const avisos: Announcements = {
    onDragStart: ({ active }) => `Pegou ${nome(active.id)}.`,
    onDragOver: ({ active, over }) => (over ? `${nome(active.id)} está sobre ${nome(over.id)}.` : `${nome(active.id)} está fora da lista.`),
    onDragEnd: ({ active, over }) => (over ? `Soltou ${nome(active.id)} no lugar de ${nome(over.id)}.` : `Soltou ${nome(active.id)} fora da lista.`),
    onDragCancel: ({ active }) => `Cancelou. ${nome(active.id)} voltou para o lugar.`,
  };

  function soltar({ active, over }: DragEndEvent) {
    const ativo = lerIdDoArraste(active.id);
    const alvo = over ? lerIdDoArraste(over.id) : null;
    if (ativo && alvo) aoSoltar(ativo, alvo);
  }

  return (
    <DndContext
      sensors={sensores}
      collisionDetection={ondeCaiu}
      onDragEnd={soltar}
      accessibility={{
        announcements: avisos,
        screenReaderInstructions: {
          draggable:
            "Para arrastar, aperte espaço ou Enter. Use as setas para mover, e espaço ou Enter para soltar. Esc cancela.",
        },
      }}
    >
      {children}
    </DndContext>
  );
}

/** Liga um módulo ou uma aula ao arrastar: o nó que se move e a alça que o pega. */
export function useArrastavel(item: ItemArrastavel) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: idDoArraste(item),
  });
  const estilo: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : undefined,
  };
  return { setNodeRef, estilo, alca: { ref: setActivatorNodeRef, attributes, listeners } };
}

/** A alça de arrastar: um botão de verdade, então o teclado a alcança. */
export function AlcaDeArraste({
  rotulo,
  alca,
}: {
  rotulo: string;
  alca: ReturnType<typeof useArrastavel>["alca"];
}) {
  return (
    <button
      type="button"
      ref={alca.ref}
      {...alca.attributes}
      {...alca.listeners}
      aria-label={rotulo}
      className="flex size-8 cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
    >
      <GripVertical className="size-4" />
    </button>
  );
}
