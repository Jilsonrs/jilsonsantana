import type { ReactNode } from "react";
import { Plano, ROTAS_PUBLICAS, type PlanoDaAssinatura, type PreviaDaAssinatura } from "@jilson/core";
import { dataDoResumo, descreverDesconto, dinheiro, fimDoPeriodoPrePago } from "@/lib/assinar";
import { useT } from "@/lib/language";

/**
 * A COLUNA DE RESUMO (decisão do operador, 12/10/2026; nas duas telas desde 27/10/2026, P80): o plano
 * e o valor, o desconto quando há código, o TOTAL DE HOJE, a renovação, o reembolso, o pagamento
 * seguro, a linha dos Termos e, POR ÚLTIMO, o botão — como a Udemy (decisão do operador, 27/10/2026).
 * Todo valor é o do servidor: com código, o de hoje é o que a Stripe calculou; e a renovação, sem o
 * valor (a prévia não o diz) — nunca conta feita na tela.
 * Com o PIX (etapa 4.9, pré-pago): no lugar da renovação, "Acesso até DD/MM/AAAA" (texto do operador,
 * 28/10/2026) — a previsão do fim do período, contada de hoje.
 */
export function ResumoDaAssinatura({ plano, comCodigo, erro, botao, pix = false }: { plano: PlanoDaAssinatura; comCodigo: PreviaDaAssinatura | null; erro: string | null; botao: ReactNode; pix?: boolean }) {
  const t = useT().assinar;
  const mensal = plano.plano === Plano.MENSAL;
  const centavosHoje = comCodigo ? comCodigo.centavosHoje : plano.centavos;
  const renovacao = pix
    ? t.pix.acessoAte.replace("{data}", dataDoResumo(fimDoPeriodoPrePago(new Date(), plano.plano)))
    : comCodigo
      ? mensal
        ? t.renovaMensalSemValor
        : t.renovaAnualSemValor
      : (mensal ? t.renovaMensal : t.renovaAnual).replace("{valor}", dinheiro(plano.centavos, plano.moeda));
  return (
    <section aria-labelledby="resumo-da-assinatura" className="h-fit space-y-4 rounded-xl border border-border/60 bg-card p-5">
      <h2 id="resumo-da-assinatura" className="text-base font-semibold text-foreground">
        {t.resumo}
      </h2>
      <p className="flex items-baseline justify-between gap-4 text-sm">
        <span className="text-foreground">{mensal ? t.mensal : t.anual}</span>
        <span className="text-foreground">{dinheiro(plano.centavos, plano.moeda)}</span>
      </p>
      {comCodigo && <p className="text-sm text-muted-foreground">{descreverDesconto(t, comCodigo.desconto, comCodigo.moeda)}</p>}
      <p aria-live="polite" className="flex items-baseline justify-between gap-4 border-t border-border/60 pt-3">
        <span className="font-semibold text-foreground">{t.totalDeHoje}</span>
        <span className="text-xl font-semibold text-foreground">{dinheiro(centavosHoje, plano.moeda)}</span>
      </p>
      <ul className="space-y-1.5 text-sm text-muted-foreground">
        <li>{renovacao}</li>
        <li>{t.reembolso}</li>
        <li>{t.pagamentoSeguro}</li>
      </ul>
      <LinhaDosTermos />
      {erro && (
        <p role="alert" className="text-sm text-destructive">
          {erro}
        </p>
      )}
      {botao}
    </section>
  );
}

/**
 * "Ao assinar, você concorda com os Termos de Uso e a Política de Privacidade" (decisão do operador,
 * 27/10/2026), com os dois links do rodapé. Abrem em outra aba: quem lê os Termos não perde o que já
 * preencheu.
 */
function LinhaDosTermos() {
  const t = useT().assinar;
  const [antes, resto = ""] = t.termos.split("{termos}");
  const [meio, depois = ""] = resto.split("{privacidade}");
  const link = (endereco: string, texto: string) => (
    <a href={endereco} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-foreground">
      {texto}
    </a>
  );
  return (
    <p className="text-xs text-muted-foreground">
      {antes}
      {link(ROTAS_PUBLICAS.termos, t.termosDeUso)}
      {meio}
      {link(ROTAS_PUBLICAS.privacidade, t.politicaDePrivacidade)}
      {depois}
    </p>
  );
}
