import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useT } from "@/lib/language";

/**
 * O CPF OU CNPJ, obrigatório (decisões do operador, 12/10/2026), nas DUAS telas de assinar (P80,
 * 27/10/2026). A conferência do número é a do `core` (`lerDocumentoFiscal`), na tela e no servidor;
 * o número vai para a ficha do cliente na Stripe, nunca para os dados do cartão.
 */
export function CampoDoDocumento({ valor, aoMudar, erro, travado }: { valor: string; aoMudar: (valor: string) => void; erro: string | null; travado: boolean }) {
  const t = useT().assinar;
  return (
    <div className="space-y-2">
      <Label htmlFor="documento-fiscal">{t.documento}</Label>
      <Input
        id="documento-fiscal"
        name="documento"
        value={valor}
        onChange={(evento) => aoMudar(evento.target.value)}
        disabled={travado}
        maxLength={32}
        inputMode="numeric"
        className="max-w-md"
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? "documento-fiscal-ajuda documento-fiscal-erro" : "documento-fiscal-ajuda"}
      />
      <p id="documento-fiscal-ajuda" className="text-sm text-muted-foreground">
        {t.documentoAjuda}
      </p>
      {erro && (
        <p id="documento-fiscal-erro" role="alert" className="text-sm text-destructive">
          {erro}
        </p>
      )}
    </div>
  );
}
