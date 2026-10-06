import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/layout/PageLayout";
import { useT } from "@/lib/language";
import { ehErroDeVersaoAntiga, pagina, recarregarUmaVez } from "@/lib/recarregar";

/**
 * A TELA DE ERRO no lugar da página em branco (achado do operador, 05/10/2026).
 * Se uma tela quebra, o resto do app (menu, topo) continua, e no lugar dela
 * aparece a mensagem com "Recarregar a página". Quando a causa é um pedaço do
 * app de uma versão anterior do site, a página recarrega sozinha uma vez
 * (`lib/recarregar.ts`).
 *
 * `chave`: trocar de tela (outro endereço) limpa o erro.
 */
export class ErroDaTela extends Component<{ chave: string; children: ReactNode }, { erro: unknown; chave: string }> {
  state = { erro: null as unknown, chave: this.props.chave };

  static getDerivedStateFromError(erro: unknown) {
    return { erro };
  }

  static getDerivedStateFromProps(props: { chave: string }, state: { erro: unknown; chave: string }) {
    return props.chave === state.chave ? null : { erro: null, chave: props.chave };
  }

  componentDidCatch(erro: unknown, _info: ErrorInfo) {
    if (ehErroDeVersaoAntiga(erro)) recarregarUmaVez();
  }

  render() {
    return this.state.erro ? <TelaDeErro /> : this.props.children;
  }
}

function TelaDeErro() {
  const t = useT();
  return (
    <PageContainer>
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <p role="alert" className="text-foreground">
          {t.comum.algoDeuErrado}
        </p>
        <Button type="button" variant="outline" onClick={() => pagina.recarregar()}>
          {t.comum.recarregar}
        </Button>
      </div>
    </PageContainer>
  );
}
