import { Link, Navigate } from "react-router-dom";
import { PageContainer, PageHeader } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { MotivoDoCancelamento } from "@/components/faturamento/MotivoDoCancelamento";
import { SaidaDoCancelamento } from "@/components/faturamento/SaidaDoCancelamento";
import { dinheiro } from "@/lib/assinar";
import { useCancelamento } from "@/lib/cancelamento";
import { comAcesso, dataPorExtenso, TELA_DO_FATURAMENTO, useMinhaAssinatura } from "@/lib/faturamento";
import { useIdioma, useT } from "@/lib/language";

/**
 * CANCELAR A ASSINATURA (Fase 4, etapa 4.6 — tela própria, com endereço próprio; textos
 * aprovados pelo operador em 11/10/2026). Tom calmo, o motivo é opcional, e o botão de cancelar
 * está sempre à vista. O que a tela oferece é o que o SERVIDOR disse que cabe:
 *   - em dia: parar a renovação — o acesso continua até o fim do período pago;
 *   - nos 7 primeiros dias, com dinheiro pago: as DUAS saídas — parar e continuar, ou cancelar e
 *     receber o dinheiro de volta (o acesso termina na hora);
 *   - com a cobrança atrasada: a assinatura termina na hora.
 * Sem nada a cancelar, a pessoa volta ao resumo, que diz em que pé a assinatura está.
 */
export function CancelarPage() {
  const t = useT();
  const idioma = useIdioma();
  const c = t.faturamento.cancelamento;
  const { data, isLoading, isError } = useMinhaAssinatura();
  const cancelamento = useCancelamento();
  const { feito, falha, enviando } = cancelamento;
  const viva = comAcesso(isError ? undefined : data);
  const reembolso = viva?.reembolso ?? null;
  const cabeCancelar = viva !== null && (viva.podeParar || viva.terminaAoCancelar || reembolso !== null);
  const quando = (iso: string) => dataPorExtenso(iso, idioma);

  // Terminou na hora (a cobrança estava atrasada): o resumo diz que acabou e oferece reativar.
  // E a renovação parada sem a data do fim (o servidor sempre a manda): o resumo diz o que há.
  if (feito?.como === "terminou" || (feito?.como === "parou" && !feito.acessoAte)) return <Navigate to={TELA_DO_FATURAMENTO} replace />;
  // A DEVOLUÇÃO QUE FALHOU fica na tela: a assinatura já foi encerrada (não há mais o que
  // cancelar), e a pessoa precisa ler que o dinheiro não voltou e que alguém já foi avisado.
  const devolucaoFalhou = !feito && falha === "devolucao";
  if (!feito && !devolucaoFalhou && data && !isError && !cabeCancelar) return <Navigate to={TELA_DO_FATURAMENTO} replace />;

  // Até quando há acesso: o fim do período pago — é a data da próxima cobrança de quem renova.
  const acessoAte = viva?.proximaCobranca?.em ?? viva?.acessoAte ?? null;
  const valor = reembolso ? dinheiro(reembolso.centavos, reembolso.moeda, idioma) : "";
  const ocupado = enviando !== null;

  return (
    <PageContainer>
      <PageHeader title={t.faturamento.cancelar} description={c.descricao} />
      {feito?.como === "parou" && feito.acessoAte && (
        <div className="space-y-4">
          <p role="status" className="max-w-3xl text-foreground">
            {c.parou.replace("{data}", quando(feito.acessoAte))}
          </p>
          <Button asChild>
            <Link to={TELA_DO_FATURAMENTO}>{t.nav.faturamento}</Link>
          </Button>
        </div>
      )}
      {feito?.como === "reembolsado" && (
        <div className="space-y-4">
          <p role="status" className="max-w-3xl text-foreground">
            {c.reembolsado.replace("{valor}", dinheiro(feito.centavos, feito.moeda, idioma))}
          </p>
          <Button asChild>
            <Link to={TELA_DO_FATURAMENTO}>{t.nav.faturamento}</Link>
          </Button>
        </div>
      )}
      {devolucaoFalhou && !(viva && cabeCancelar) && (
        <div className="space-y-4">
          <p role="alert" className="max-w-3xl text-sm text-destructive">
            {c.devolucaoFalhou}
          </p>
          <Button asChild>
            <Link to={TELA_DO_FATURAMENTO}>{t.nav.faturamento}</Link>
          </Button>
        </div>
      )}
      {!feito && !devolucaoFalhou && isLoading && <p className="text-muted-foreground">{t.comum.carregando}</p>}
      {!feito && !devolucaoFalhou && isError && (
        <p role="alert" className="text-sm text-destructive">
          {t.faturamento.erro}
        </p>
      )}
      {!feito && viva && cabeCancelar && (
        <div className="space-y-8">
          {viva.trocaMarcada && <p className="max-w-3xl text-sm text-muted-foreground">{c.trocaDesfeita}</p>}
          <MotivoDoCancelamento motivo={cancelamento.motivo} aoEscolher={cancelamento.setMotivo} comentario={cancelamento.comentario} aoComentar={cancelamento.setComentario} desligado={ocupado} />
          {falha && (
            <p role="alert" className="max-w-3xl text-sm text-destructive">
              {falha === "prazo" ? c.prazoAcabou : falha === "devolucao" ? c.devolucaoFalhou : c.erro}
            </p>
          )}
          {viva.terminaAoCancelar ? (
            <SaidaDoCancelamento texto={c.terminaAgora} botao={t.faturamento.cancelar} aoClicar={cancelamento.parar} enviando={enviando === "parar"} desligado={ocupado} />
          ) : reembolso ? (
            <div className="flex flex-col gap-6 lg:flex-row">
              {viva.podeParar ? (
                <SaidaDoCancelamento titulo={c.pararTitulo} texto={acessoAte ? c.acessoAte.replace("{data}", quando(acessoAte)) : null} botao={c.pararBotao} aoClicar={cancelamento.parar} enviando={enviando === "parar"} desligado={ocupado} />
              ) : (
                acessoAte && <p className="max-w-3xl flex-1 text-sm text-muted-foreground">{t.faturamento.vaiCancelar.replace("{data}", quando(acessoAte))}</p>
              )}
              <SaidaDoCancelamento
                titulo={c.reembolsoTitulo}
                texto={c.reembolsoTexto.replace("{valor}", valor).replace("{data}", quando(reembolso.ate))}
                botao={c.reembolsoBotao.replace("{valor}", valor)}
                aoClicar={cancelamento.reembolsar}
                enviando={enviando === "reembolsar"}
                desligado={ocupado}
              />
            </div>
          ) : (
            <SaidaDoCancelamento texto={acessoAte ? c.acessoAte.replace("{data}", quando(acessoAte)) : null} botao={t.faturamento.cancelar} aoClicar={cancelamento.parar} enviando={enviando === "parar"} desligado={ocupado} />
          )}
          <Button asChild variant="ghost">
            <Link to={TELA_DO_FATURAMENTO}>{c.voltar}</Link>
          </Button>
        </div>
      )}
    </PageContainer>
  );
}
