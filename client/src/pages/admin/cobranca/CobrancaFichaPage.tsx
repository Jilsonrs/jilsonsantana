import { Link, useSearchParams } from "react-router";
import { codigoDoErro } from "@/lib/course-form";
import type { FichaDaCobranca } from "@jilson/core";
import { dataCurta } from "@/lib/cobranca-admin";
import { dinheiro, quemDaFicha, useFichaDoAdmin } from "@/lib/cobranca-ficha";
import { LinhaDaAssinatura } from "@/components/admin/cobranca/LinhaDaAssinatura";
import { CobrancasDaFicha } from "@/components/admin/cobranca/CobrancasDaFicha";
import { ResumoDaFicha } from "@/components/admin/cobranca/ResumoDaFicha";
import { LinhasDoRegistro } from "@/components/admin/cobranca/LinhasDoRegistro";
import { AcoesDaAssinatura } from "@/components/admin/cobranca/AcoesDaAssinatura";
import { ConferirDaFicha } from "@/components/admin/cobranca/ConferirDaFicha";
import { LinksParaOAluno } from "@/components/admin/cobranca/LinksParaOAluno";
import { CorrigirDocumento } from "@/components/admin/cobranca/CorrigirDocumento";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageContainer, PageHeader, PageSection } from "@/components/layout/PageLayout";

/** O título e a frase de baixo: a conta, o visitante que não terminou de assinar, ou a assinatura sem conta. */
function cabecalho({ conta, visitante }: FichaDaCobranca): { titulo: string; descricao: string } {
  if (conta) return { titulo: conta.nome ?? conta.email, descricao: `${conta.email} · conta criada em ${dataCurta(conta.criadaEm)}` };
  if (visitante) return { titulo: visitante.nome ?? visitante.email, descricao: `${visitante.email} · começou a assinar sem conta e não terminou · última tentativa em ${dataCurta(visitante.ultimaTentativaEm)}` };
  return { titulo: "Assinatura sem conta", descricao: "A Stripe não diz de que conta ela é." };
}

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

  const { visitante, temAcesso, assinaturas, stripeIndisponivel, pixEsperando } = ficha.data;
  const { titulo, descricao } = cabecalho(ficha.data);
  return (
    <PageContainer>
      <PageHeader title={titulo} description={descricao} />
      <div className="space-y-12">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant={temAcesso ? "default" : "secondary"}>{temAcesso ? "Com acesso às aulas" : "Sem acesso às aulas"}</Badge>
          {voltar}
        </div>
        <ConferirDaFicha quem={quem} />
        {visitante ? (
          <div className="space-y-1">
            <p className="text-foreground">
              {[visitante.lembreteEm ? `O lembrete saiu em ${dataCurta(visitante.lembreteEm)}` : "O lembrete ainda não saiu", visitante.naoApagada ? null : `a ficha some em ${dataCurta(visitante.someEm)}`, visitante.novidades ? "quer receber novidades" : null].filter((parte): parte is string => parte !== null).join(" · ")}
            </p>
            {visitante.naoApagada ? <p className="font-medium text-destructive">A limpeza dos 7 dias achou um pagamento e não apagou: alguém pagou e ficou sem conta.</p> : null}
          </div>
        ) : null}
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
                <LinhaDaAssinatura key={assinatura.id} assinatura={assinatura}>
                  <AcoesDaAssinatura assinatura={assinatura} quem={titulo} />
                </LinhaDaAssinatura>
              ))}
            </ul>
          )}
        </PageSection>
        {pixEsperando.length > 0 ? (
          <PageSection title="Pix esperando pagamento">
            <ul aria-label="Pix esperando pagamento" className="space-y-1">
              {pixEsperando.map((pix) => (
                <li key={pix.id} className="text-foreground">
                  {dinheiro(pix.centavos, pix.moeda)} · {dataCurta(pix.em)} · Pix gerado e não pago
                </li>
              ))}
            </ul>
          </PageSection>
        ) : null}
        <PageSection title="Cobranças">
          <CobrancasDaFicha cobrancas={ficha.data.cobrancas} maisCobrancas={ficha.data.maisCobrancas} stripeIndisponivel={stripeIndisponivel} />
        </PageSection>
        <PageSection title="Cartão, CPF e e-mails">
          <div className="space-y-6">
            <ResumoDaFicha ficha={ficha.data} />
            {"conta" in quem || "visitante" in quem ? <CorrigirDocumento quem={"conta" in quem ? { conta: quem.conta } : { visitante: quem.visitante }} /> : null}
          </div>
        </PageSection>
        <PageSection title="Links para o aluno" description="Copie e mande ao aluno: ele entra e cai na tela certa.">
          <LinksParaOAluno links={ficha.data.links} conta={ficha.data.conta?.id ?? null} />
        </PageSection>
        <PageSection title="O que aconteceu">
          <LinhasDoRegistro linhas={ficha.data.registro} />
        </PageSection>
      </div>
    </PageContainer>
  );
}
