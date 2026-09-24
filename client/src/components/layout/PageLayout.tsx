import React from "react";
import { cn } from "@/lib/utils";

/**
 * Container principal para as páginas.
 * Alinhado à esquerda com uma distância fixa de 50px da barra lateral (em telas grandes).
 * Largura máxima ampla para não estourar em monitores ultrawide.
 */
export function PageContainer({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 sm:py-8 md:px-[50px] md:py-10", className)}>
      {children}
    </div>
  );
}

/**
 * Cabeçalho fixo (sticky) para as páginas administrativas.
 * Permite colocar o título à esquerda e botões de ação à direita.
 */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="sticky top-0 z-10 -mx-4 mb-6 sm:mb-8 flex flex-col gap-4 border-b border-border/40 bg-background/95 px-4 pb-4 pt-4 sm:-mx-6 sm:px-6 sm:pb-6 sm:pt-6 md:-mx-[50px] md:px-[50px] md:flex-row md:items-center md:justify-between backdrop-blur">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-2 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}

/**
 * Padrão Split-Panel (Estilo Vercel/Stripe).
 * Lado esquerdo (1/3): Título e descrição da seção.
 * Lado direito (2/3): Conteúdo (geralmente um Card com os formulários).
 */
export function SplitSection({
  title,
  description,
  children,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-1 gap-x-8 gap-y-6 pt-8 sm:gap-y-8 sm:pt-10 md:grid-cols-3", className)}>
      <div>
        <h2 className="text-base font-semibold leading-7">{title}</h2>
        {description && <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>}
      </div>
      <div className="md:col-span-2">
        {children}
      </div>
    </div>
  );
}
