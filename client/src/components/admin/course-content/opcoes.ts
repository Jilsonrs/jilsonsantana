import { LessonKind } from "@jilson/core";
import type { OpcaoDeInsercao } from "./InsertPoint";

// O que o "+" oferece (operador, 27–28/09/2026). O quiz tem etapa própria: por
// enquanto, EM BREVE. O botão que grava diz o que adiciona, como na Udemy
// ("Adicionar aula", "Adicionar módulo" — operador, 28/09/2026).
export const TIPOS_DE_AULA: OpcaoDeInsercao[] = [
  { valor: LessonKind.VIDEO, rotulo: "Aula de vídeo", adicionar: "Adicionar aula" },
  { valor: LessonKind.TEXT, rotulo: "Aula de texto", adicionar: "Adicionar aula" },
  { valor: "QUIZ", rotulo: "Quiz", emBreve: true },
];

export const MODULO: OpcaoDeInsercao[] = [{ valor: "MODULO", rotulo: "Módulo", adicionar: "Adicionar módulo" }];

// A classe inteira escrita aqui, como texto (GEMINI.md, regra 1).
export const CLASSE_DO_SELECT_PEQUENO =
  "h-[56px] rounded-xl border border-border/60 bg-background px-6 py-4 text-[1.05rem] shadow-[0_10px_40px_rgba(0,0,0,0.03),0_2px_10px_rgba(35,143,232,0.05)] focus-visible:outline-none focus-visible:border-primary focus-visible:shadow-[0_10px_40px_rgba(35,143,232,0.12)] transition-all duration-300";

export const CLASSE_DA_ETIQUETA = "rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground";
