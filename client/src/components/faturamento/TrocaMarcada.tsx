import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Plano } from "@jilson/core";
import { Button } from "@/components/ui/button";
import { desistirDaTroca } from "@/lib/api";
import { CHAVE_DA_MINHA_ASSINATURA, dataPorExtenso } from "@/lib/faturamento";
import { useT } from "@/lib/language";

/**
 * A TROCA DE PLANO MARCADA para o fim do período pago (anual → mensal): quando ela vale, e o
 * botão de desistir — até lá nada muda e nada é cobrado (decisão do operador, 11/10/2026). Fica
 * no resumo e na tela de mudar de plano. Depois de desistir, continua na tela para dizer que deu
 * certo, mesmo com a troca já fora da assinatura.
 */
export function TrocaMarcada({ troca }: { troca: { plano: Plano; em: string } | null }) {
  const t = useT();
  const p = t.faturamento.plano;
  const queryClient = useQueryClient();
  const desistir = useMutation({
    mutationFn: desistirDaTroca,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CHAVE_DA_MINHA_ASSINATURA }),
  });
  if (!troca && desistir.isIdle) return null;

  return (
    <div className="space-y-3">
      {troca && !desistir.isSuccess && (
        <div className="space-y-3 rounded-xl border border-border/60 bg-muted/30 p-4">
          <p className="text-sm text-muted-foreground">{p.mudaParaOMensal.replace("{data}", dataPorExtenso(troca.em))}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => desistir.mutate()} disabled={desistir.isPending}>
            {desistir.isPending ? t.assinar.processando : p.continuarNoAnual}
          </Button>
        </div>
      )}
      {desistir.isSuccess && (
        <div className="rounded-xl border border-border/60 bg-muted/30 p-3.5">
          <p role="status" className="text-sm font-medium text-foreground">
            {p.continuaNoAnual}
          </p>
        </div>
      )}
      {desistir.isError && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3.5">
          <p role="alert" className="text-sm font-medium text-destructive">
            {p.erro}
          </p>
        </div>
      )}
    </div>
  );
}
