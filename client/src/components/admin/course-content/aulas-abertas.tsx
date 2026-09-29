import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { LessonKind } from "@jilson/core";
import type { AdminModule } from "@/lib/api";

/**
 * QUEM COMEÇA ABERTA ao entrar no Conteúdo (decisão do operador, 29/09/2026, como
 * na Udemy): a aula de vídeo sem vídeo (espera o envio) e a que o Bunny ainda não
 * confirmou como pronta (processando). A com o vídeo pronto e a de texto começam
 * recolhidas.
 */
export function aulasQueComecamAbertas(modulos: AdminModule[]): number[] {
  return modulos
    .flatMap((m) => m.lessons)
    .filter((l) => l.kind === LessonKind.VIDEO && (!l.bunnyVideoId || !l.bunnyVideoReady))
    .map((l) => l.id);
}

type AulasAbertas = {
  estaAberta: (id: number) => boolean;
  alternar: (id: number) => void;
  abrir: (id: number) => void;
};

const Contexto = createContext<AulasAbertas | null>(null);

/**
 * Guarda quais aulas estão abertas enquanto o operador fica no Conteúdo. Fica na
 * árvore, e não em cada linha, por dois motivos: o que está aberto continua aberto
 * quando o curso recarrega, e o "+" consegue abrir a aula que acabou de criar. A
 * regra de quem começa aberta vale só na ENTRADA: depois, quem abre e fecha é ele.
 */
export function AulasAbertasProvider({ modulos, children }: { modulos: AdminModule[]; children: ReactNode }) {
  const [abertas, setAbertas] = useState(() => new Set(aulasQueComecamAbertas(modulos)));
  const valor = useMemo<AulasAbertas>(
    () => ({
      estaAberta: (id) => abertas.has(id),
      alternar: (id) =>
        setAbertas((atual) => {
          const nova = new Set(atual);
          if (nova.has(id)) nova.delete(id);
          else nova.add(id);
          return nova;
        }),
      abrir: (id) => setAbertas((atual) => new Set(atual).add(id)),
    }),
    [abertas],
  );
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useAulasAbertas(): AulasAbertas {
  const valor = useContext(Contexto);
  if (!valor) throw new Error("useAulasAbertas fora do AulasAbertasProvider");
  return valor;
}
