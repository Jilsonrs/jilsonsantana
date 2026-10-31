import { Link } from "react-router";
import { useQuery } from "@tanstack/react-query";
import type { TentativaDaLista } from "@jilson/core";
import * as api from "@/lib/api";
import { dataCurta } from "@/lib/cobranca-admin";
import { enderecoDaFicha } from "@/lib/cobranca-ficha";
import { Button } from "@/components/ui/button";
import { PageContainer, PageHeader, PageSection } from "@/components/layout/PageLayout";

/** O que se diz de cada tentativa, numa linha. */
function detalhes(tentativa: TentativaDaLista): string {
  if (tentativa.tipo === "conta") return `${tentativa.situacao === "aguardando" ? "Esperando o primeiro pagamento" : "Expirou sem pagar"} · ${dataCurta(tentativa.em)}`;
  const v = tentativa.visitante;
  const partes = [
    `Visitante sem conta · última tentativa em ${dataCurta(v.ultimaTentativaEm)}`,
    v.lembreteEm ? `lembrete saiu em ${dataCurta(v.lembreteEm)}` : "lembrete ainda não saiu",
    v.naoApagada ? "pagamento achado: a ficha não foi apagada" : `some em ${dataCurta(v.someEm)}`,
    v.novidades ? "quer receber novidades" : null,
  ];
  return partes.filter((parte): parte is string => parte !== null).join(" · ");
}

/**
 * ADMIN → COBRANÇA → TENTATIVAS (Fase 4, etapa 4.7b, passo 1e — o mapa aprovado pelo operador, 31/10/2026): quem
 * começou a assinar e não pagou — o visitante sem conta (a ficha some 7 dias depois) e a conta com a assinatura
 * esperando o primeiro pagamento. O que aconteceu em cada uma, a ficha mostra. Não é a lista dos leads.
 */
export function CobrancaTentativasPage() {
  const lista = useQuery({ queryKey: ["admin", "cobranca", "tentativas"], queryFn: () => api.adminListarTentativas() });
  let conteudo;
  if (lista.isPending) conteudo = <p className="text-muted-foreground">Carregando…</p>;
  else if (lista.isError)
    conteudo = (
      <div role="alert" className="space-y-3">
        <p className="font-medium text-destructive">Não foi possível carregar as tentativas.</p>
        <Button type="button" variant="outline" onClick={() => void lista.refetch()}>
          Tentar de novo
        </Button>
      </div>
    );
  else if (lista.data.tentativas.length === 0) conteudo = <p className="text-muted-foreground">Ninguém deixou uma assinatura pela metade.</p>;
  else
    conteudo = (
      <div className="space-y-3">
        <ul aria-label="Tentativas" className="divide-y divide-border rounded-2xl border border-border/60">
          {lista.data.tentativas.map((tentativa) => {
            const pessoa = tentativa.tipo === "visitante" ? tentativa.visitante : tentativa.conta;
            const endereco = tentativa.tipo === "visitante" ? enderecoDaFicha({ conta: null, assinatura: null, visitante: tentativa.visitante.id }) : enderecoDaFicha({ conta: tentativa.conta.id, assinatura: null });
            return (
              <li key={tentativa.tipo === "visitante" ? `v-${tentativa.visitante.id}` : `c-${tentativa.assinatura}`} className="space-y-1 px-5 py-4">
                <Link to={endereco ?? "/admin/financeiro/receita/tentativas"} className="font-medium text-foreground underline-offset-4 hover:underline">
                  {pessoa.nome ?? pessoa.email}
                </Link>
                {pessoa.nome ? <p className="text-sm text-muted-foreground">{pessoa.email}</p> : null}
                <p className="text-sm text-foreground">{detalhes(tentativa)}</p>
              </li>
            );
          })}
        </ul>
        {lista.data.temMais ? <p className="text-sm text-muted-foreground">Há mais tentativas que não aparecem aqui.</p> : null}
      </div>
    );
  return (
    <PageContainer>
      <PageHeader title="Tentativas" description="Quem começou a assinar e não pagou. Abra a pessoa para ver o que aconteceu: o cartão recusado, o Pix que não foi pago." />
      <PageSection title="Não terminaram">{conteudo}</PageSection>
    </PageContainer>
  );
}
