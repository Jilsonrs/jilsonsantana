import { Link } from "react-router-dom";
import type { CartaoDaAssinatura } from "@jilson/core";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageSection } from "@/components/layout/PageLayout";
import { descreverCartao, TELA_DE_TROCAR_O_CARTAO } from "@/lib/faturamento";
import { useT } from "@/lib/language";

/**
 * A FORMA DE PAGAMENTO: o cartão que a Stripe vai cobrar — a bandeira, os 4 últimos e a
 * validade — e o caminho para trocá-lo. O botão só aparece quando o SERVIDOR diz que a
 * assinatura aceita cartão novo (a encerrada de vez, ainda com dias pagos, não aceita).
 */
export function BlocoDoCartao({ cartao, aceitaCartao }: { cartao: CartaoDaAssinatura | null; aceitaCartao: boolean }) {
  const t = useT().faturamento;
  return (
    <PageSection title={t.formaDePagamento}>
      <Card className="max-w-3xl">
        <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className={cartao ? "text-sm font-semibold text-foreground" : "text-sm text-muted-foreground"}>{cartao ? descreverCartao(t, cartao) : t.semCartao}</p>
          {aceitaCartao && (
            <Button asChild variant="outline">
              <Link to={TELA_DE_TROCAR_O_CARTAO}>{cartao ? t.trocarCartao : t.adicionarCartao}</Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </PageSection>
  );
}
