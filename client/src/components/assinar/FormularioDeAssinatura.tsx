import { useState, type ReactNode } from "react";
import { DuracaoDoDesconto, lerDocumentoFiscal, Plano, type PlanosDaAssinatura } from "@jilson/core";
import { PageSection } from "@/components/layout/PageLayout";
import { criarAssinatura } from "@/lib/api";
import { telaDeConcluido, usePrevia } from "@/lib/assinar";
import { codigoDoErro } from "@/lib/course-form";
import { passouDoLimite } from "@/lib/faturamento";
import { useT } from "@/lib/language";
import { CampoDoCartao, CartaoProvider, type Cartao } from "@/lib/stripe-do-site";
import { semInterromper } from "@/lib/versao";
import { BotaoDeAssinar } from "./BotaoDeAssinar";
import { CampoDoDocumento } from "./CampoDoDocumento";
import { CodigoPromocional } from "./CodigoPromocional";
import { EscolhaDoPlano } from "./EscolhaDoPlano";
import { OQueEstaIncluido } from "./OQueEstaIncluido";
import { BotaoComCartao } from "./PagamentoComCartao";
import { ResumoDaAssinatura } from "./ResumoDaAssinatura";

/**
 * ASSINAR — os dados, o plano, o código promocional e o cartão (Fase 4, etapa 4.2), com a coluna de
 * resumo e "O que está incluído" (etapa 4.7, passo 6d). Separado da página de propósito: as duas
 * telas, a pública e a de quem está logado, são IGUAIS (decisão do operador, 27/10/2026, P80).
 *
 * O site manda ao servidor só QUAL plano, o código e o CPF ou CNPJ. O valor de hoje, com código, é o
 * que a Stripe calculou (`usePrevia`). O envio: confere o CPF ou CNPJ → confere o cartão → o servidor
 * cria a assinatura → o cartão confirma com o segredo que ele devolveu. Com desconto de 100% PARA
 * SEMPRE não há cartão: a assinatura já nasce ativa (decisão do operador, 09/10/2026).
 */
export function FormularioDeAssinatura({
  dados,
  aoConcluir,
  aoSaberQueJaAssina,
  reativar,
}: {
  dados: PlanosDaAssinatura;
  aoConcluir: () => void;
  aoSaberQueJaAssina: () => void;
  /** Quem já foi assinante REATIVA: só muda o texto do botão (decisão do operador, 10/10/2026). */
  reativar?: boolean;
}) {
  const { assinar: t, comum } = useT();
  const [plano, setPlano] = useState<Plano>(Plano.MENSAL);
  const [codigo, setCodigo] = useState<string | null>(null);
  const [documento, setDocumento] = useState("");
  const [erroDoDocumento, setErroDoDocumento] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const previa = usePrevia(plano, codigo);
  const escolhido = dados.planos.find((p) => p.plano === plano) ?? dados.planos[0];
  if (!escolhido) return null;
  const comCodigo = codigo !== null && previa.data ? previa.data : null;
  const conferindo = codigo !== null && previa.isFetching;
  const recusado = codigo !== null && previa.isError ? (codigoDoErro(previa.error) === "CodigoInvalido" ? t.codigoInvalido : passouDoLimite(previa.error) ? comum.muitasTentativas : t.erro) : null;
  const centavosHoje = comCodigo ? comCodigo.centavosHoje : escolhido.centavos;
  // Nada a pagar, hoje nem depois: sem cartão. Se o desconto acaba, o cartão é pedido mesmo com
  // zero hoje — a cobrança seguinte precisa dele.
  const semCartao = comCodigo !== null && comCodigo.centavosHoje === 0 && comCodigo.desconto.duracao === DuracaoDoDesconto.PARA_SEMPRE;

  async function enviar(cartao: Cartao | null) {
    if (enviando || conferindo) return;
    // O CPF ou CNPJ primeiro: errado, nada vai ao servidor nem ao cartão.
    if (!lerDocumentoFiscal(documento)) return setErroDoDocumento(t.documentoInvalido);
    setEnviando(true);
    setErro(null);
    try {
      // Carregar a página no meio cortaria o pagamento (`lib/versao.ts`).
      await semInterromper(async () => {
        if (cartao) {
          const preenchido = await cartao.validar();
          if (!preenchido.ok) return setErro(preenchido.mensagem ?? t.erro);
        }
        const criada = await criarAssinatura(comCodigo && codigo ? { plano, codigo, documento } : { plano, documento });
        if (criada.estado === "pagar") {
          // O servidor pede pagamento e a tela não tinha cartão: o código mudou no meio do caminho.
          if (!cartao) {
            void previa.refetch();
            return setErro(t.erro);
          }
          const confirmado = await cartao.confirmar(criada.segredo, criada.tipo, telaDeConcluido(reativar));
          if (!confirmado.ok) return setErro(confirmado.mensagem ?? t.erro);
        }
        aoConcluir();
      });
    } catch (falha) {
      const motivo = codigoDoErro(falha);
      // "CobrancaAtrasada" (etapa 4.6b): a situação relida diz `atrasada`, e a tela de assinar leva ao Faturamento.
      if (motivo === "JaAssinante" || motivo === "CobrancaAtrasada") aoSaberQueJaAssina();
      else if (motivo === "CodigoInvalido") void previa.refetch();
      // A Stripe recusou o número que o `core` aceitou (o servidor responde 400 `DocumentoInvalido`).
      else if (motivo === "DocumentoInvalido") setErroDoDocumento(t.documentoInvalido);
      else setErro(passouDoLimite(falha) ? comum.muitasTentativas : t.erro);
    } finally {
      setEnviando(false);
    }
  }

  // À esquerda, o que se preenche; à direita (no celular, embaixo), o resumo com o botão e a lista.
  const tela = (botao: ReactNode) => (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="space-y-8">
        <PageSection title={t.seusDados} className="pt-0 sm:pt-0">
          <CampoDoDocumento
            valor={documento}
            aoMudar={(valor) => {
              setDocumento(valor);
              setErroDoDocumento(null);
            }}
            erro={erroDoDocumento}
            travado={enviando}
          />
        </PageSection>
        <EscolhaDoPlano planos={dados.planos} escolhido={plano} aoEscolher={setPlano} travado={enviando} />
        <CodigoPromocional
          aplicado={comCodigo ? codigo : null}
          recusado={recusado}
          conferindo={conferindo}
          travado={enviando}
          aoAplicar={setCodigo}
          aoRemover={() => setCodigo(null)}
        />
        {!semCartao && (
          <PageSection title={t.pagamento} className="pt-0 sm:pt-0">
            <CampoDoCartao />
          </PageSection>
        )}
      </div>
      <div className="space-y-8">
        <ResumoDaAssinatura plano={escolhido} comCodigo={comCodigo} erro={erro} botao={botao} />
        <OQueEstaIncluido incluido={dados.incluido} />
      </div>
    </div>
  );

  if (semCartao) return tela(<BotaoDeAssinar enviando={enviando} aoClicar={() => void enviar(null)} reativar={reativar} />);
  return (
    <CartaoProvider pedido={{ chavePublicavel: dados.chavePublicavel, centavos: centavosHoje, moeda: escolhido.moeda, formasDePagamento: dados.formasDePagamento }}>
      {tela(<BotaoComCartao enviando={enviando} aoEnviar={(cartao) => void enviar(cartao)} reativar={reativar} />)}
    </CartaoProvider>
  );
}
