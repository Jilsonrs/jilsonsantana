import { Link } from "react-router";
import { CreditCard, QrCode } from "lucide-react";
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
 * A PRÉ-PAGA (etapa 4.9): "Pix" — não há cartão, nem o que trocar.
 */
export function BlocoDoCartao({ cartao, aceitaCartao, prePago = false }: { cartao: CartaoDaAssinatura | null; aceitaCartao: boolean; prePago?: boolean }) {
  const t = useT().faturamento;
  return (
    <PageSection title={t.formaDePagamento}>
      <Card className="max-w-3xl">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-muted/40 text-muted-foreground" aria-hidden="true">
              {prePago ? <QrCode className="size-5" /> : <CreditCard className="size-5" />}
            </div>
            <p className={cartao || prePago ? "text-sm font-semibold text-foreground" : "text-sm text-muted-foreground"}>
              {cartao ? descreverCartao(t, cartao) : prePago ? t.pix : t.semCartao}
            </p>
          </div>
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
