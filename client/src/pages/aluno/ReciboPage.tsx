import { useParams } from "react-router";
import { Button } from "@/components/ui/button";
import { PageContainer, PageHeader } from "@/components/layout/PageLayout";
import { useSession } from "@/lib/auth-client";
import { dinheiro } from "@/lib/assinar";
import { dataPorExtenso, useMinhasCobrancas } from "@/lib/faturamento";
import { formaDaCobranca, situacaoDaCobranca } from "@/lib/minhas-cobrancas";
import { useT } from "@/lib/language";

/**
 * O RECIBO DA ESCOLA (Fase 4, etapa 4.7b, passo 6a — decisão do operador, 31/10/2026): no lugar da página de recibo da
 * Stripe, que vinha em inglês e levava à fatura com o CPF inteiro de quem pagou. Em português e sem CPF: quem recebeu (a
 * escola), quem assina, o que foi pago, a data, o valor, como foi paga e em que pé está. Fora do menu do app (rota fora do
 * Layout), para imprimir só o recibo. A cobrança vem da lista da conta da SESSÃO e é achada pela chave: a chave de outra
 * conta não acha nada.
 */
export function ReciboPage() {
  const textos = useT();
  const t = textos.faturamento.recibo;
  const { chave } = useParams();
  const { data: sessao } = useSession();
  const { data, isLoading, isError, refetch } = useMinhasCobrancas();
  const cobranca = data?.cobrancas.find((c) => c.chave === chave);

  let conteudo;
  if (isLoading) conteudo = <p className="text-muted-foreground">{textos.comum.carregando}</p>;
  else if (isError || !data)
    conteudo = (
      <div className="flex flex-col items-start gap-3">
        <p role="alert" className="text-destructive">
          {t.erro}
        </p>
        <Button variant="outline" onClick={() => refetch()}>
          {t.tentarDeNovo}
        </Button>
      </div>
    );
  else if (!cobranca) conteudo = <p className="text-muted-foreground">{t.naoEncontrado}</p>;
  else {
    const usuario = sessao?.user;
    const assinante = usuario?.name ? `${usuario.name} · ${usuario.email}` : (usuario?.email ?? "");
    const linhas: [string, string][] = [
      [t.assinante, assinante],
      [t.referente, t.assinatura],
      [t.data, dataPorExtenso(cobranca.em)],
      [t.valor, dinheiro(cobranca.centavos, cobranca.moeda)],
      [t.forma, formaDaCobranca(textos.faturamento.cobrancas, cobranca)],
      [t.situacao, situacaoDaCobranca(textos.faturamento.cobrancas, cobranca)],
    ];
    conteudo = (
      <div className="space-y-8">
        <div className="space-y-1">
          <p className="font-semibold text-foreground">{t.emitente}</p>
          <p className="text-sm text-muted-foreground">{t.cnpj}</p>
          <p className="text-sm text-muted-foreground">{t.contato}</p>
        </div>
        <dl className="divide-y divide-border rounded-2xl border border-border/60">
          {linhas.map(([rotulo, valor]) => (
            <div key={rotulo} className="flex flex-col gap-1 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <dt className="text-sm text-muted-foreground">{rotulo}</dt>
              <dd className="text-sm font-medium text-foreground">{valor}</dd>
            </div>
          ))}
        </dl>
      </div>
    );
  }

  return (
    <PageContainer className="max-w-3xl">
      <PageHeader
        title={t.titulo}
        actions={
          cobranca ? (
            <Button className="print:hidden" onClick={() => window.print()}>
              {t.imprimir}
            </Button>
          ) : undefined
        }
      />
      {conteudo}
    </PageContainer>
  );
}
