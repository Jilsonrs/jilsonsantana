import { Link, useSearchParams } from "react-router";
import { codigoDoErro } from "@/lib/course-form";
import { dataCurta } from "@/lib/cobranca-admin";
import { quemDaFicha, useFichaDoAdmin } from "@/lib/cobranca-ficha";
import { LinhaDaAssinatura } from "@/components/admin/cobranca/LinhaDaAssinatura";
import { CobrancasDaFicha } from "@/components/admin/cobranca/CobrancasDaFicha";
import { ResumoDaFicha } from "@/components/admin/cobranca/ResumoDaFicha";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageContainer, PageHeader, PageSection } from "@/components/layout/PageLayout";

/**
 * ADMIN → COBRANÇA → A FICHA DO ALUNO (Fase 4, etapa 4.7b, passo 1d — o mapa aprovado pelo operador, 10/10 e
 * 31/10/2026): tudo da cobrança de uma pessoa numa tela — as assinaturas, as cobranças com o que aconteceu e o
 * recibo, o cartão, o CPF escondido e os e-mails. Só leitura (as ações chegam no bloco 3). Admin: texto na tela.
 */
export function CobrancaFichaPage() {
  const [parametros] = useSearchParams();
  const quem = quemDaFicha(parametros);
  const ficha = useFichaDoAdmin(quem);
  const voltar = (
    <Link to="/admin/cobranca/assinaturas" className="text-sm text-primary underline-offset-4 hover:underline">
      ← Assinaturas
    </Link>
  );

  if (!quem || ficha.isError) {
    const naoExiste = !quem || codigoDoErro(ficha.error) === "NaoEncontrada";
    return (
      <PageContainer>
        <PageHeader title="Ficha do aluno" />
        <div role="alert" className="space-y-3">
          <p className="font-medium text-destructive">{naoExiste ? "Não achamos esta ficha." : "Não foi possível abrir a ficha."}</p>
          {naoExiste ? null : (
            <Button type="button" variant="outline" onClick={() => void ficha.refetch()}>
              Tentar de novo
            </Button>
          )}
          <div>{voltar}</div>
        </div>
      </PageContainer>
    );
  }
  if (ficha.isPending) {
    return (
      <PageContainer>
        <PageHeader title="Ficha do aluno" />
        <p className="text-muted-foreground">Carregando…</p>
      </PageContainer>
    );
  }

  const { conta, temAcesso, assinaturas, stripeIndisponivel } = ficha.data;
  return (
    <PageContainer>
      <PageHeader title={conta ? (conta.nome ?? conta.email) : "Assinatura sem conta"} description={conta ? `${conta.email} · conta criada em ${dataCurta(conta.criadaEm)}` : "A Stripe não diz de que conta ela é."} />
      <div className="space-y-12">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant={temAcesso ? "default" : "secondary"}>{temAcesso ? "Com acesso às aulas" : "Sem acesso às aulas"}</Badge>
          {voltar}
        </div>
        {stripeIndisponivel ? (
          <div role="status" className="space-y-2">
            <p className="text-foreground">A Stripe não respondeu: as cobranças, o cartão e o CPF não aparecem agora.</p>
            <Button type="button" variant="outline" size="sm" onClick={() => void ficha.refetch()}>
              Tentar de novo
            </Button>
          </div>
        ) : null}
        <PageSection title="Assinaturas">
          {assinaturas.length === 0 ? (
            <p className="text-muted-foreground">Nenhuma assinatura.</p>
          ) : (
            <ul aria-label="Assinaturas" className="divide-y divide-border rounded-2xl border border-border/60">
              {assinaturas.map((assinatura) => (
                <LinhaDaAssinatura key={assinatura.id} assinatura={assinatura} />
              ))}
            </ul>
          )}
        </PageSection>
        <PageSection title="Cobranças">
          <CobrancasDaFicha cobrancas={ficha.data.cobrancas} maisCobrancas={ficha.data.maisCobrancas} stripeIndisponivel={stripeIndisponivel} />
        </PageSection>
        <PageSection title="Cartão, CPF e e-mails">
          <ResumoDaFicha ficha={ficha.data} />
        </PageSection>
      </div>
    </PageContainer>
  );
}
