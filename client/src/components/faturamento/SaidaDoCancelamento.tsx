import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useT } from "@/lib/language";

/**
 * UMA SAÍDA da tela de cancelar: o que acontece e o botão que faz acontecer. Nos 7 primeiros
 * dias a tela mostra duas, lado a lado, cada uma com o seu título; depois, uma só, sem título.
 * Só desenha.
 */
export function SaidaDoCancelamento({ titulo, texto, botao, aoClicar, enviando, desligado }: { titulo?: string; texto: string | null; botao: string; aoClicar: () => void; enviando: boolean; desligado: boolean }) {
  const t = useT();
  return (
    <Card className="max-w-3xl flex-1">
      <CardContent className="flex h-full flex-col justify-between gap-5 p-6">
        <div className="space-y-2">
          {titulo && <h2 className="text-base font-semibold tracking-tight text-foreground">{titulo}</h2>}
          {texto && <p className="text-sm leading-relaxed text-muted-foreground">{texto}</p>}
        </div>
        <div className="pt-2">
          <Button type="button" variant="outline" onClick={aoClicar} disabled={desligado} className="w-full sm:w-auto">
            {enviando ? t.assinar.processando : botao}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
