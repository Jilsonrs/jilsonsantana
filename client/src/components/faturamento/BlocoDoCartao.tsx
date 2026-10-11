import type { CartaoDaAssinatura } from "@jilson/core";
import { Card, CardContent } from "@/components/ui/card";
import { PageSection } from "@/components/layout/PageLayout";
import { descreverCartao } from "@/lib/faturamento";
import { useT } from "@/lib/language";

/** A FORMA DE PAGAMENTO: o cartão que a Stripe vai cobrar — a bandeira, os 4 últimos e a validade. */
export function BlocoDoCartao({ cartao }: { cartao: CartaoDaAssinatura | null }) {
  const t = useT().faturamento;
  return (
    <PageSection title={t.formaDePagamento}>
      <Card className="max-w-3xl">
        <CardContent className="pt-6">
          <p className={cartao ? "text-sm font-semibold text-foreground" : "text-sm text-muted-foreground"}>{cartao ? descreverCartao(t, cartao) : t.semCartao}</p>
        </CardContent>
      </Card>
    </PageSection>
  );
}
