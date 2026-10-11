import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { manterMinhaAssinatura } from "@/lib/api";
import { CHAVE_DA_MINHA_ASSINATURA, TELA_DE_CANCELAR, type AssinaturaComAcesso } from "@/lib/faturamento";
import { useT } from "@/lib/language";

/**
 * O QUE DÁ PARA FAZER COM O PLANO, no resumo: "Manter a assinatura" (a renovação está parada e
 * ainda dá para voltar atrás, sem pagar nada) e o caminho para a tela de cancelar. Cada botão só
 * aparece quando o SERVIDOR diz que a ação cabe — a tela nunca oferece o que ele vai recusar.
 * Cancelar cabe a quem renova, a quem está com a cobrança atrasada e a quem ainda está no prazo
 * do reembolso (mesmo com a renovação já parada).
 */
export function AcoesDoPlano({ assinatura }: { assinatura: AssinaturaComAcesso }) {
  const t = useT();
  const queryClient = useQueryClient();
  const manter = useMutation({
    mutationFn: manterMinhaAssinatura,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CHAVE_DA_MINHA_ASSINATURA }),
  });
  const podeCancelar = assinatura.podeParar || assinatura.terminaAoCancelar || assinatura.reembolso !== null;
  if (!podeCancelar && !assinatura.podeManter && manter.isIdle) return null;

  return (
    <div className="space-y-3 pt-2">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {assinatura.podeManter && (
          <Button type="button" onClick={() => manter.mutate()} disabled={manter.isPending}>
            {manter.isPending ? t.assinar.processando : t.faturamento.manter}
          </Button>
        )}
        {podeCancelar && (
          <Button asChild variant="outline">
            <Link to={TELA_DE_CANCELAR}>{t.faturamento.cancelar}</Link>
          </Button>
        )}
      </div>
      {manter.isSuccess && (
        <p role="status" className="text-sm text-foreground">
          {t.faturamento.cancelamento.mantida}
        </p>
      )}
      {manter.isError && (
        <p role="alert" className="text-sm text-destructive">
          {t.faturamento.cancelamento.erroAoManter}
        </p>
      )}
    </div>
  );
}
