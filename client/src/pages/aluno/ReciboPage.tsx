import { useParams } from "react-router";
import type { ReciboDaEscola } from "@jilson/core";
import { Button } from "@/components/ui/button";
import { PageContainer, PageHeader } from "@/components/layout/PageLayout";
import { useSession } from "@/lib/auth-client";
import { dinheiro } from "@/lib/assinar";
import { codigoDoErro } from "@/lib/course-form";
import { dataPorExtenso } from "@/lib/faturamento";
import { formaDaCobranca, situacaoDaCobranca, useRecibo } from "@/lib/minhas-cobrancas";
import { useT, type AppTexts } from "@/lib/language";

type Textos = AppTexts["faturamento"]["recibo"];
type Linha = [rotulo: string, valor: string];

/** O que foi pago: o plano (ou a assinatura, quando não se sabe o plano) e o período. */
function oQueFoiPago(t: Textos, recibo: ReciboDaEscola): { item: string; periodo: string | null } {
  const item = recibo.plano === "mensal" ? t.planoMensal : recibo.plano === "anual" ? t.planoAnual : t.semPlano;
  const periodo = recibo.periodo ? t.periodo.replace("{de}", dataPorExtenso(recibo.periodo.de)).replace("{ate}", dataPorExtenso(recibo.periodo.ate)) : null;
  return { item, periodo };
}

/** Os valores: o preço e o que saiu dele (o desconto com o código, o crédito da troca de plano) — quando o servidor os mandou — e o total pago. */
function valores(t: Textos, recibo: ReciboDaEscola): Linha[] {
  const valor = (centavos: number) => dinheiro(centavos, recibo.moeda);
  const abatido = (centavos: number) => t.abatimento.replace("{valor}", valor(centavos));
  const linhas: Linha[] = [];
  if (recibo.detalhe) {
    linhas.push([t.preco, valor(recibo.detalhe.preco)]);
    for (const desconto of recibo.detalhe.descontos) linhas.push([desconto.codigo ? t.desconto.replace("{codigo}", desconto.codigo) : t.descontoSemCodigo, abatido(desconto.centavos)]);
    if (recibo.detalhe.credito > 0) linhas.push([t.credito, abatido(recibo.detalhe.credito)]);
  }
  linhas.push([t.total, valor(recibo.centavos)]);
  return linhas;
}

function Linhas({ linhas }: { linhas: Linha[] }) {
  return (
    <dl className="divide-y divide-border rounded-2xl border border-border/60">
      {linhas.map(([rotulo, valor]) => (
        <div key={rotulo} className="flex flex-col gap-1 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <dt className="text-sm text-muted-foreground">{rotulo}</dt>
          <dd className="text-sm font-medium text-foreground">{valor}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * O RECIBO DA ESCOLA (Fase 4, etapa 4.7b, passo 6a — decisões do operador, 31/10/2026): no lugar da página de recibo da
 * Stripe, que vinha em inglês e levava à fatura com o CPF inteiro de quem pagou. Em português, sem CPF, e com os itens que
 * ele escolheu: o número e a data, a escola, quem assina, o plano e o período, o preço, o desconto com o código, o total
 * pago, a forma, a situação e as dúvidas. Fora do menu do app (rota fora do Layout), para imprimir só o recibo. Quem diz
 * tudo é o servidor, que acha a cobrança pela chave SÓ entre as da conta da sessão.
 */
export function ReciboPage() {
  const textos = useT();
  const t = textos.faturamento.recibo;
  const { chave = "" } = useParams();
  const { data: sessao } = useSession();
  const { data: recibo, isLoading, isError, error, refetch } = useRecibo(chave);

  let conteudo;
  if (isLoading) conteudo = <p className="text-muted-foreground">{textos.comum.carregando}</p>;
  else if (isError && codigoDoErro(error) === "NaoEncontrado") conteudo = <p className="text-muted-foreground">{t.naoEncontrado}</p>;
  else if (isError || !recibo)
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
  else {
    const usuario = sessao?.user;
    const { item, periodo } = oQueFoiPago(t, recibo);
    conteudo = (
      <div className="space-y-8">
        <p className="text-sm text-muted-foreground">{t.numero.replace("{numero}", recibo.numero).replace("{data}", dataPorExtenso(recibo.em))}</p>
        <div className="space-y-1">
          <p className="font-semibold text-foreground">{t.emitente}</p>
          <p className="text-sm text-muted-foreground">{t.cnpj}</p>
          <p className="text-sm text-muted-foreground">{t.site}</p>
        </div>
        <Linhas linhas={[[t.assinante, usuario?.name || usuario?.email || ""]]} />
        <div className="space-y-3">
          <div>
            <p className="font-semibold text-foreground">{item}</p>
            {periodo && <p className="text-sm text-muted-foreground">{periodo}</p>}
          </div>
          <Linhas linhas={valores(t, recibo)} />
        </div>
        <Linhas
          linhas={[
            [t.forma, formaDaCobranca(textos.faturamento.cobrancas, recibo)],
            [t.situacao, situacaoDaCobranca(textos.faturamento.cobrancas, recibo)],
          ]}
        />
        <p className="text-sm text-muted-foreground">{t.duvidas}</p>
      </div>
    );
  }

  return (
    <PageContainer className="max-w-3xl">
      <PageHeader
        title={t.titulo}
        actions={
          recibo ? (
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
