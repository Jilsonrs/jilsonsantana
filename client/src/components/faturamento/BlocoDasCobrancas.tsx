import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageSection } from "@/components/layout/PageLayout";
import { dinheiro } from "@/lib/assinar";
import { dataPorExtenso, useMinhasCobrancas } from "@/lib/faturamento";
import { enderecoDoRecibo, formaDaCobranca, situacaoDaCobranca } from "@/lib/minhas-cobrancas";
import { useT } from "@/lib/language";

/**
 * MINHAS COBRANÇAS (Fase 4, etapa 4.7b, passo 6a — decisão do operador, 31/10/2026, P144): as cobranças que passaram, da
 * mais nova à mais antiga, e o recibo de cada uma — o recibo da ESCOLA, numa aba nova (decisão dele, 31/10/2026: no lugar
 * do da Stripe, que mostrava o CPF de quem pagou). Quem diz o que passou é o servidor; aqui só se desenha.
 */
export function BlocoDasCobrancas() {
  const textos = useT();
  const t = textos.faturamento.cobrancas;
  const { data, isLoading, isError } = useMinhasCobrancas();
  let conteudo;
  if (isLoading) conteudo = <p className="text-sm text-muted-foreground">{textos.comum.carregando}</p>;
  else if (isError || !data)
    conteudo = (
      <p role="alert" className="text-sm text-destructive">
        {t.erro}
      </p>
    );
  else if (data.cobrancas.length === 0) conteudo = <p className="text-sm text-muted-foreground">{t.vazio}</p>;
  else
    conteudo = (
      <Card className="max-w-3xl">
        <CardContent className="p-0">
          <ul aria-label={t.titulo} className="divide-y divide-border">
            {data.cobrancas.map((cobranca) => (
              <li key={cobranca.chave} className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-foreground">
                    {dataPorExtenso(cobranca.em)} · {dinheiro(cobranca.centavos, cobranca.moeda)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formaDaCobranca(t, cobranca)} · {situacaoDaCobranca(t, cobranca)}
                  </p>
                </div>
                <Button asChild variant="outline" size="sm" className="self-start sm:self-auto">
                  <a href={enderecoDoRecibo(cobranca.chave)} target="_blank" rel="noopener noreferrer" aria-label={t.reciboDe.replace("{data}", dataPorExtenso(cobranca.em))}>
                    {t.recibo}
                  </a>
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    );
  return <PageSection title={t.titulo}>{conteudo}</PageSection>;
}
