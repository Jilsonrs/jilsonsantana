import { useState } from "react";
import { Plano } from "@jilson/core";
import { EscolhaDoPlano } from "@/components/assinar/EscolhaDoPlano";
import { usePlanosSemLogin } from "@/lib/assinar";
import { useT } from "@/lib/language";

/**
 * A TELA PÚBLICA DE ASSINAR, a parte do app (etapa 4.7, passo 6c): o que vai no meio da página do
 * servidor `/assinar` — o menu, o rodapé, o título e a frase são dela (`server/src/views/assinar.ts`).
 * Só o visitante chega aqui: quem está logado é levado pelo servidor à tela de assinar do app.
 * Nesta parte, os planos (Mensal marcado: é o cartão em que a pessoa clicou na home); os dados, o
 * resumo e o cartão chegam nas partes 6d e 6e.
 */
export function AssinarSemLoginPage() {
  const t = useT();
  const planos = usePlanosSemLogin();
  const [plano, setPlano] = useState<Plano>(Plano.MENSAL);
  if (planos.isPending) return <p className="text-muted-foreground">{t.comum.carregando}</p>;
  // Sem planos (a Stripe não deu os preços) é a mesma falha: não há o que assinar.
  if (planos.isError || planos.data.planos.length === 0) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {t.assinar.erroPlanos}
      </p>
    );
  }
  return <EscolhaDoPlano planos={planos.data.planos} escolhido={plano} aoEscolher={setPlano} travado={false} />;
}
