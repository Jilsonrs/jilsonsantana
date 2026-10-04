import { useCallback, useEffect, useState } from "react";

// A MENSAGEM FLUTUANTE de "salvou" ou "não salvou" (decisões do operador,
// 03/10/2026, a partir da Udemy): o sucesso some sozinho; o erro fica até a
// pessoa fechar, para não passar despercebido.

export type Aviso = { tipo: "sucesso" | "erro"; texto: string };

/** Quanto tempo a mensagem de sucesso fica na tela. */
export const TEMPO_DO_SUCESSO = 5000;

export function useAvisoFlutuante(inicial: Aviso | null = null) {
  // Um número por mensagem: salvar duas vezes seguidas recomeça o relógio.
  const [estado, setEstado] = useState<(Aviso & { vez: number }) | null>(inicial ? { ...inicial, vez: 1 } : null);
  const avisar = useCallback((tipo: Aviso["tipo"], texto: string) => setEstado((a) => ({ tipo, texto, vez: (a?.vez ?? 0) + 1 })), []);
  const fechar = useCallback(() => setEstado(null), []);

  // Efeito: o sucesso some sozinho — é um relógio, fora do React.
  useEffect(() => {
    if (estado?.tipo !== "sucesso") return;
    const relogio = setTimeout(() => setEstado(null), TEMPO_DO_SUCESSO);
    return () => clearTimeout(relogio);
  }, [estado]);

  return { aviso: estado, avisar, fechar };
}
