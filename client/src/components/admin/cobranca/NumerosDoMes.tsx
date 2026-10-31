import { useQuery } from "@tanstack/react-query";
import * as api from "@/lib/api";
import { dataCurta } from "@/lib/cobranca-admin";
import { dinheiro } from "@/lib/cobranca-ficha";
import { Button } from "@/components/ui/button";

// OS NÚMEROS DO MÊS (etapa 4.7b, passo 6c — decisão do operador, 31/10/2026, P143): a faixa no topo da Cobrança. Admin fica em
// português, com o texto aqui (decisão do operador, 23/09/2026); o operador confere usando.

/** Um número da faixa: o rótulo, o valor e, às vezes, o detalhe. */
function Numero({ rotulo, valor, detalhe }: { rotulo: string; valor: string; detalhe?: string }) {
  return (
    <div className="rounded-xl border border-border/60 p-3">
      <dt className="text-sm text-muted-foreground">{rotulo}</dt>
      <dd className="text-xl font-semibold text-foreground">{valor}</dd>
      {detalhe ? <dd className="text-xs text-muted-foreground">{detalhe}</dd> : null}
    </div>
  );
}

/** A faixa: carregando, a falha (com "tentar de novo") e os números — o dinheiro sem a Stripe aparece como "—". */
export function NumerosDoMes() {
  const numeros = useQuery({ queryKey: ["admin", "cobranca", "numeros"], queryFn: api.adminNumerosDoMes });
  if (numeros.isPending) return <p className="text-sm text-muted-foreground">Carregando os números do mês…</p>;
  if (numeros.isError) {
    return (
      <div className="space-y-2">
        <p role="alert" className="text-sm font-medium text-destructive">
          Não foi possível carregar os números do mês.
        </p>
        <Button type="button" size="sm" variant="outline" onClick={() => void numeros.refetch()}>
          Tentar de novo
        </Button>
      </div>
    );
  }
  const n = numeros.data;
  const reais = (centavos: number | null) => (centavos === null ? "—" : dinheiro(centavos, "brl"));
  // A assinatura sem plano conhecido (a de teste antiga) conta no total: "outros", para a soma fechar.
  const outros = n.ativos.total - n.ativos.mensal - n.ativos.anual - n.ativos.prePagas;
  return (
    <section aria-label="Os números do mês" className="space-y-2">
      <p className="text-sm text-muted-foreground">Desde {dataCurta(n.desde)} (o mês de Brasília).</p>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Numero rotulo="Assinantes agora" valor={String(n.ativos.total)} detalhe={`mensal ${n.ativos.mensal} · anual ${n.ativos.anual} · Pix e pagas por fora ${n.ativos.prePagas}${outros > 0 ? ` · outros ${outros}` : ""}`} />
        <Numero rotulo="Novos no mês" valor={String(n.novos)} />
        <Numero rotulo="Encerradas no mês" valor={String(n.encerradas)} />
        <Numero rotulo="Atrasadas agora" valor={String(n.atrasados)} />
        <Numero rotulo="Entrou no mês" valor={reais(n.entrou)} />
        <Numero rotulo="Devolvido no mês" valor={reais(n.devolvido)} detalhe={n.entrou === null ? "A Stripe não respondeu agora." : undefined} />
      </dl>
    </section>
  );
}
