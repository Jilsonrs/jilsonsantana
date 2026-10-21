import type { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// A MOLDURA DAS TELAS DE ACESSO — a de entrar e a de criar a senha nova (etapa 4.7, passo 5). É o
// desenho da tela de entrar, MOVIDO para cá sem mudar uma classe (o acabamento é do Antigravity):
// a "luz de IA", o título com a ênfase, a etiqueta da área e o cartão com o fio de luz.

type Props = { tituloPrefixo: string; tituloEnfase: string; area: string; tituloDoCartao: string; children: ReactNode };

export function MolduraDeAcesso({ tituloPrefixo, tituloEnfase, area, tituloDoCartao, children }: Props) {
  return (
    <div className="relative overflow-hidden">
      {/* "Luz de IA" (§6): gradiente radial azul no canto esquerdo. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-40 -top-40 size-[800px] bg-[radial-gradient(circle,hsl(var(--primary)/0.05)_0%,transparent_70%)]"
      />

      <div className="relative z-10 mx-auto w-full max-w-[440px] px-6 py-16">
        <div className="mb-10 flex flex-col items-center text-center">
          <h1 className="text-[2.5rem] font-semibold leading-none tracking-tight">
            {tituloPrefixo} <span className="font-emphasis italic text-primary">{tituloEnfase}</span>.
          </h1>
          <p className="mt-4 font-mono text-[0.75rem] tracking-[0.1em] text-muted-foreground uppercase">{area}</p>
        </div>

        <Card className="relative overflow-hidden border-border/60 shadow-[0_4px_20px_rgba(0,0,0,0.03),0_20px_40px_rgba(35,143,232,0.03)] sm:rounded-2xl">
          {/* Fio de luz no topo do card (accent) */}
          <div className="absolute left-0 top-0 h-[2px] w-full bg-gradient-to-r from-primary to-transparent" />

          <CardHeader className="pt-8 pb-4">
            <CardTitle className="sr-only">{tituloDoCartao}</CardTitle>
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>
      </div>
    </div>
  );
}

/** A mensagem de erro de um campo, no desenho da tela de entrar. */
export function ErroDoCampo({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="text-[13px] text-destructive/90 flex items-center gap-2 mt-1.5 font-medium">
      <span className="w-1.5 h-1.5 rounded-full bg-destructive shadow-[0_0_6px_hsl(var(--destructive))]"></span>
      {children}
    </p>
  );
}

/**
 * A falha do formulário, no desenho da tela de entrar. `role="alert"` faz o leitor de tela ANUNCIAR
 * a falha assim que ela aparece — sem isso, quem não vê a tela só descobre que falhou tentando de novo.
 */
export function FalhaDoFormulario({ id = "form-error", children }: { id?: string; children: ReactNode }) {
  return (
    <div id={id} role="alert" className="flex items-center gap-2.5 mt-2 p-3 border border-destructive/20 rounded-lg bg-destructive/5 text-[13px] text-destructive/90 font-medium">
      <span className="w-1.5 h-1.5 shrink-0 rounded-full bg-destructive shadow-[0_0_6px_hsl(var(--destructive))]"></span>
      <span>{children}</span>
    </div>
  );
}
