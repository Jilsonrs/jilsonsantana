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
      <CardContent className="flex h-full flex-col gap-3 pt-6">
        {titulo && <h2 className="text-base font-semibold text-foreground">{titulo}</h2>}
        {texto && <p className="text-sm text-muted-foreground">{texto}</p>}
        <div className="mt-auto pt-1">
          <Button type="button" variant="outline" onClick={aoClicar} disabled={desligado}>
            {enviando ? t.assinar.processando : botao}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
