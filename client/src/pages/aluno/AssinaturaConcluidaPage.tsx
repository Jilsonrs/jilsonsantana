import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { PageContainer, PageHeader } from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { useSituacaoDaAssinatura } from "@/lib/assinar";
import { useT } from "@/lib/language";

/**
 * DEPOIS DE ASSINAR (Fase 4, etapa 4.2; o endereço é decisão do operador, 10/10/2026). Quem
 * diz que a assinatura valeu é o SERVIDOR — o gate, que lê o espelho gravado pelo aviso da
 * Stripe —, nunca "o pagamento passou no navegador". Por isso esta tela pergunta de novo até a
 * resposta ser sim. Se demorar, diz com calma que continua conferindo, e continua.
 * O que a Stripe acrescenta ao endereço na volta não é lido: não é ele que libera nada.
 */
export function AssinaturaConcluidaPage({ conferirACada = 2000, demora = 20_000 }: { conferirACada?: number; demora?: number }) {
  const t = useT();
  const queryClient = useQueryClient();
  const situacao = useSituacaoDaAssinatura(conferirACada);
  const temAcesso = situacao.data?.temAcesso === true;
  const [demorou, setDemorou] = useState(false);

  // Efeito: é um relógio — "está demorando" depende do tempo que passou, não de dado nenhum.
  useEffect(() => {
    const relogio = setTimeout(() => setDemorou(true), demora);
    return () => clearTimeout(relogio);
  }, [demora]);

  // Efeito: o acesso chegou, e o que as OUTRAS telas guardaram de antes (a aula trancada) deixa
  // de valer — sem isto, voltar à aula mostraria "para assinantes" por um instante, logo depois de pagar.
  useEffect(() => {
    if (temAcesso) queryClient.removeQueries({ type: "inactive" });
  }, [temAcesso, queryClient]);

  return (
    <PageContainer>
      <PageHeader title={t.assinar.titulo} />
      {temAcesso ? (
        <div className="space-y-4">
          <p role="status" className="text-foreground">
            {t.assinar.confirmada}
          </p>
          <Button asChild>
            <Link to="/inicio">{t.assinar.comecar}</Link>
          </Button>
        </div>
      ) : (
        <div role="status" className="space-y-2">
          <p className="text-foreground">{t.assinar.confirmando}</p>
          {demorou && <p className="max-w-[60ch] text-sm text-muted-foreground">{t.assinar.demorando}</p>}
        </div>
      )}
    </PageContainer>
  );
}
