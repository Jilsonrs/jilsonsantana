import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/lib/language";

/**
 * O CÓDIGO PROMOCIONAL. Quem diz se vale, e quanto fica, é o servidor (a conta é da Stripe);
 * aqui só se digita, aplica e remove. É um formulário próprio: o Enter aplica o código, em vez
 * de enviar a assinatura.
 */
export function CodigoPromocional({
  aplicado,
  desconto,
  recusado,
  conferindo,
  travado,
  aoAplicar,
  aoRemover,
}: {
  /** O código que está valendo, ou nada. */
  aplicado: string | null;
  /** O desconto dele, por extenso. */
  desconto: string | null;
  /** A frase da recusa, quando o último código não valeu. */
  recusado: string | null;
  conferindo: boolean;
  travado: boolean;
  aoAplicar: (codigo: string) => void;
  aoRemover: () => void;
}) {
  const t = useT().assinar;
  const [digitado, setDigitado] = useState("");

  if (aplicado) {
    return (
      <div className="space-y-2">
        <p className="text-sm font-medium text-foreground">{t.codigo}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-medium text-foreground">{aplicado}</span>
          {desconto && <span className="text-sm text-muted-foreground">{desconto}</span>}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={travado}
            onClick={() => {
              setDigitado("");
              aoRemover();
            }}
          >
            {t.remover}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      className="space-y-2"
      onSubmit={(evento) => {
        evento.preventDefault();
        const codigo = digitado.trim();
        if (codigo && !conferindo && !travado) aoAplicar(codigo);
      }}
    >
      <Label htmlFor="codigo-promocional">{t.codigo}</Label>
      <div className="flex max-w-md gap-2">
        <Input
          id="codigo-promocional"
          name="codigo"
          value={digitado}
          onChange={(evento) => setDigitado(evento.target.value)}
          maxLength={64}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          enterKeyHint="done"
          aria-invalid={recusado ? true : undefined}
          aria-describedby={recusado ? "codigo-promocional-erro" : undefined}
          disabled={travado}
        />
        <Button type="submit" variant="outline" disabled={conferindo || travado}>
          {t.aplicar}
        </Button>
      </div>
      {recusado && (
        <p id="codigo-promocional-erro" role="alert" className="text-sm text-destructive">
          {recusado}
        </p>
      )}
    </form>
  );
}
