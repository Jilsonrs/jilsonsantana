import { PageSection } from "@/components/layout/PageLayout";
import { useT } from "@/lib/language";
import type { SeusDadosDaTela } from "@/lib/seus-dados";
import { CampoDoDocumento } from "./CampoDoDocumento";
import { CaixaDeNovidades, CampoDoEmail, CampoDoNome } from "./DadosDoVisitante";

/**
 * "SEUS DADOS" (etapa 4.7, passo 9 — saiu do `FormularioDeAssinatura` sem mudar a tela): nas duas telas de
 * assinar, o CPF ou CNPJ; na pública (`semLogin`), antes dele o nome e o e-mail, e depois a caixa de
 * novidades. O estado e a conferência moram em `useSeusDados` (`lib/seus-dados.ts`).
 */
export function SeusDados({ dados, semLogin, travado }: { dados: SeusDadosDaTela; semLogin: boolean; travado: boolean }) {
  const t = useT().assinar;
  return (
    <PageSection title={t.seusDados} className="space-y-6 pt-0 sm:pt-0">
      {semLogin && <CampoDoNome valor={dados.nome} aoMudar={dados.mudarNome} erro={dados.erroDoNome} travado={travado} />}
      {semLogin && <CampoDoEmail valor={dados.email} aoMudar={dados.mudarEmail} erro={dados.erroDoEmail} travado={travado} />}
      <CampoDoDocumento valor={dados.documento} aoMudar={dados.mudarDocumento} erro={dados.erroDoDocumento} travado={travado} />
      {semLogin && <CaixaDeNovidades marcada={dados.novidades} aoMudar={dados.setNovidades} travado={travado} />}
    </PageSection>
  );
}
