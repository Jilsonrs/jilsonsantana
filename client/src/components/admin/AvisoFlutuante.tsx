import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Aviso } from "@/lib/aviso-flutuante";

/**
 * A MENSAGEM FLUTUANTE do admin (decisão do operador, 03/10/2026, a partir da
 * Udemy): diz se salvou ou não, num cartão no canto da tela, com "Fechar". A
 * região fica SEMPRE na página, vazia quando não há mensagem: o leitor de tela só
 * anuncia o que aparece dentro de uma região que já existia. A frase do erro
 * anuncia com prioridade (`role="alert"`). O acabamento é do Antigravity.
 */
export function AvisoFlutuante({ aviso, aoFechar }: { aviso: Aviso | null; aoFechar: () => void }) {
  const erro = aviso?.tipo === "erro";
  const Icone = erro ? AlertCircle : CheckCircle2;
  return (
    <div aria-live="polite" className="pointer-events-none fixed bottom-6 right-6 z-50">
      {aviso && (
        <div
          className={cn(
            "pointer-events-auto flex max-w-sm items-start gap-3 rounded-xl border bg-background p-4 shadow-lg",
            erro ? "border-destructive/60" : "border-primary/40",
          )}
        >
          <Icone className={cn("mt-0.5 size-5 shrink-0", erro ? "text-destructive" : "text-primary")} aria-hidden="true" />
          <div className="space-y-3">
            {/* O alerta é só a frase: o "Fechar" não entra no que o leitor de tela anuncia. */}
            <p role={erro ? "alert" : undefined} className="text-sm font-medium text-foreground">
              {aviso.texto}
            </p>
            <Button type="button" size="sm" variant="outline" onClick={aoFechar}>
              Fechar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
