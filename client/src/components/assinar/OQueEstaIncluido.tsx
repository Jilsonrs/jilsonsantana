import type { PlanosDaAssinatura } from "@jilson/core";
import { useT } from "@/lib/language";

/**
 * "O QUE ESTÁ INCLUÍDO" (decisão do operador, 27/10/2026, P80): a MESMA lista do cartão de preço da
 * home, e a frase de baixo dele — um texto só, com as edições do admin, que vem do servidor junto
 * com os planos. Sem ela (servidor de antes desta versão), não aparece.
 */
export function OQueEstaIncluido({ incluido }: { incluido: PlanosDaAssinatura["incluido"] }) {
  const t = useT().assinar;
  if (!incluido || incluido.itens.length === 0) return null;
  return (
    <section aria-labelledby="o-que-esta-incluido" className="space-y-3">
      <h2 id="o-que-esta-incluido" className="text-base font-semibold text-foreground">
        {t.incluidoTitulo}
      </h2>
      <ul className="list-disc space-y-1.5 pl-5 text-sm text-foreground">
        {incluido.itens.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      {incluido.frase && <p className="text-sm text-muted-foreground">{incluido.frase}</p>}
    </section>
  );
}
