import type { FormaDePagamento } from "@/lib/assinar";
import { useT } from "@/lib/language";
import { cn } from "@/lib/utils";

/**
 * CARTÃO OU PIX (etapa 4.9, passo 2b — textos aprovados pelo operador em 28/10/2026). Só aparece quando o
 * servidor diz que o Pix está no ar (`planos.pix`). O cartão renova sozinho; o Pix é pré-pago: paga uma
 * vez e estuda pelo período. Botões de rádio de verdade, num grupo com legenda — como a escolha do plano.
 */
export function EscolhaDaFormaDePagamento({ escolhida, aoEscolher, travado }: { escolhida: FormaDePagamento; aoEscolher: (forma: FormaDePagamento) => void; travado: boolean }) {
  const t = useT().assinar.pix;
  const formas: { forma: FormaDePagamento; nome: string; descricao: string }[] = [
    { forma: "cartao", nome: t.cartao, descricao: t.cartaoDescricao },
    { forma: "pix", nome: t.pix, descricao: t.pixDescricao },
  ];
  return (
    <fieldset disabled={travado} className="space-y-3">
      <legend className="text-sm font-medium text-foreground">{t.comoPagar}</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {formas.map(({ forma, nome, descricao }) => {
          const marcada = forma === escolhida;
          return (
            <label
              key={forma}
              className={cn(
                "flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border p-4 focus-within:ring-2 focus-within:ring-ring",
                marcada ? "border-primary bg-primary/5" : "border-border/60 bg-card",
              )}
            >
              <input type="radio" name="forma-de-pagamento" value={forma} checked={marcada} onChange={() => aoEscolher(forma)} className="mt-1 size-4 accent-primary" />
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-foreground">{nome}</span>
                <span className="block text-sm text-muted-foreground">{descricao}</span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
