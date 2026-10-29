import { useState, type ReactNode } from "react";
import { DuracaoDoDesconto, enderecoDeEmailSchema, lerDocumentoFiscal, Plano, TELA_DE_CONCLUIDO_SEM_LOGIN, type PlanosDaAssinatura } from "@jilson/core";
import { PageSection } from "@/components/layout/PageLayout";
import { telaDeConcluido, usePrevia, type FormaDePagamento } from "@/lib/assinar";
import { codigoDoErro } from "@/lib/course-form";
import { passouDoLimite } from "@/lib/faturamento";
import { useT } from "@/lib/language";
import { pedirAoServidor } from "@/lib/pedido-de-assinatura";
import { CampoDoCartao, CartaoProvider, type Cartao } from "@/lib/stripe-do-site";
import { semInterromper } from "@/lib/versao";
import { BotaoDeAssinar } from "./BotaoDeAssinar";
import { CampoDoDocumento } from "./CampoDoDocumento";
import { CodigoPromocional } from "./CodigoPromocional";
import { CaixaDeNovidades, CampoDoEmail } from "./DadosDoVisitante";
import { EscolhaDaFormaDePagamento } from "./EscolhaDaFormaDePagamento";
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
 *
 * SEM LOGIN (`semLogin`, a tela pública — etapa 4.7, passo 6e): pede também o e-mail e as novidades,
 * usa as rotas do visitante, e guarda a TENTATIVA que o servidor devolve — só na memória e no
 * `sessionStorage`, antes de o cartão confirmar (`lib/tentativa-de-assinar.ts`). O pedido ao servidor,
 * nas quatro combinações, mora em `lib/pedido-de-assinatura.ts`.
 *
 * O PIX PRÉ-PAGO (etapa 4.9, passo 2b): quando o servidor diz que o Pix está no ar (`dados.pix`), a
 * escolha "Como você quer pagar?" vem antes do campo. Com o Pix, o código promocional some (o Pix é o
 * preço cheio), o resumo diz até quando vai o acesso, o botão diz "Pagar com Pix" e o campo abre em modo
 * pagamento, só com o Pix; a confirmação abre o QR da própria Stripe. A tela NUNCA pede um QR novo
 * sozinha: só o clique no botão pede.
 */
export function FormularioDeAssinatura({
  dados,
  aoConcluir,
  aoSaberQueJaAssina,
  reativar,
  semLogin = false,
}: {
  dados: PlanosDaAssinatura;
  aoConcluir: () => void;
  aoSaberQueJaAssina: () => void;
  /** Quem já foi assinante REATIVA: só muda o texto do botão (decisão do operador, 10/10/2026). */
  reativar?: boolean;
  /** A tela pública, sem conta (etapa 4.7, passo 6e). */
  semLogin?: boolean;
}) {
  const { assinar: t, comum, login } = useT();
  const [plano, setPlano] = useState<Plano>(Plano.MENSAL);
  const [codigo, setCodigo] = useState<string | null>(null);
  const [documento, setDocumento] = useState("");
  const [erroDoDocumento, setErroDoDocumento] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [erroDoEmail, setErroDoEmail] = useState<string | null>(null);
  const [novidades, setNovidades] = useState(false);
  const [forma, setForma] = useState<FormaDePagamento>("cartao");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const previa = usePrevia(plano, codigo, semLogin);
  const escolhido = dados.planos.find((p) => p.plano === plano) ?? dados.planos[0];
  if (!escolhido) return null;
  const comCodigo = codigo !== null && previa.data ? previa.data : null;
  const conferindo = codigo !== null && previa.isFetching;
  const recusado = codigo !== null && previa.isError ? (codigoDoErro(previa.error) === "CodigoInvalido" ? t.codigoInvalido : passouDoLimite(previa.error) ? comum.muitasTentativas : t.erro) : null;
  const centavosHoje = comCodigo ? comCodigo.centavosHoje : escolhido.centavos;
  // Nada a pagar, hoje nem depois: sem cartão. Se o desconto acaba, o cartão é pedido mesmo com
  // zero hoje — a cobrança seguinte precisa dele.
  const semCartao = comCodigo !== null && comCodigo.centavosHoje === 0 && comCodigo.desconto.duracao === DuracaoDoDesconto.PARA_SEMPRE;
  const pixNoAr = dados.pix != null;
  const comPix = pixNoAr && forma === "pix";
  // Escolher o Pix esquece o código: o Pix não tem código promocional (decisão (b) da etapa 4.9).
  const escolherForma = (nova: FormaDePagamento) => {
    setForma(nova);
    if (nova === "pix") setCodigo(null);
  };

  async function enviar(cartao: Cartao | null) {
    if (enviando || conferindo) return;
    // Os dados primeiro: errados, nada vai ao servidor nem ao cartão.
    if (semLogin && !enderecoDeEmailSchema.safeParse(email).success) return setErroDoEmail(login.emailInvalido);
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
        const criada = await pedirAoServidor({ semLogin, forma: comPix ? "pix" : "cartao", plano, codigo: comCodigo && codigo ? codigo : null, documento, email, novidades, chavePublicavel: dados.chavePublicavel });
        if (criada.estado === "pagar") {
          // O servidor pede pagamento e a tela não tinha cartão: o código mudou no meio do caminho.
          if (!cartao) {
            void previa.refetch();
            return setErro(t.erro);
          }
          // O endereço de volta NUNCA leva a tentativa (ela está na memória e no `sessionStorage`).
          const confirmado = await cartao.confirmar(criada.segredo, criada.tipo, semLogin ? TELA_DE_CONCLUIDO_SEM_LOGIN : telaDeConcluido(reativar));
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
      // Só a tela pública ouve estes (as rotas do visitante): o e-mail que já tem conta entra para
      // assinar (decisão do operador, 21/10/2026); o mesmo e-mail noutra aba; muita gente ao mesmo tempo.
      else if (semLogin && motivo === "JaTemConta") setErroDoEmail(t.emailJaTemConta);
      else if (semLogin && motivo === "Ocupada") setErro(t.ocupadaOutraAba);
      // Muitas assinaturas ao mesmo tempo nesta cópia do site (com e sem login): esperar e tentar de novo.
      else if (motivo === "MuitosAoMesmoTempo") setErro(t.aguardeUmInstante);
      else setErro(passouDoLimite(falha) ? comum.muitasTentativas : t.erro);
    } finally {
      setEnviando(false);
    }
  }

  // À esquerda, o que se preenche, com "O que está incluído" logo depois dos planos; à direita (no
  // celular, embaixo), o resumo com o botão por último — como a Udemy (decisão do operador, 27/10/2026).
  const tela = (botao: ReactNode) => (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="space-y-8">
        <PageSection title={t.seusDados} className="space-y-6 pt-0 sm:pt-0">
          {semLogin && (
            <CampoDoEmail
              valor={email}
              aoMudar={(valor) => {
                setEmail(valor);
                setErroDoEmail(null);
              }}
              erro={erroDoEmail}
              travado={enviando}
            />
          )}
          <CampoDoDocumento
            valor={documento}
            aoMudar={(valor) => {
              setDocumento(valor);
              setErroDoDocumento(null);
            }}
            erro={erroDoDocumento}
            travado={enviando}
          />
          {semLogin && <CaixaDeNovidades marcada={novidades} aoMudar={setNovidades} travado={enviando} />}
        </PageSection>
        <EscolhaDoPlano planos={dados.planos} escolhido={plano} aoEscolher={setPlano} travado={enviando} />
        <OQueEstaIncluido incluido={dados.incluido} />
        {pixNoAr && !semCartao && <EscolhaDaFormaDePagamento escolhida={forma} aoEscolher={escolherForma} travado={enviando} />}
        {!comPix && (
          <CodigoPromocional
            aplicado={comCodigo ? codigo : null}
            recusado={recusado}
            conferindo={conferindo}
            travado={enviando}
            aoAplicar={setCodigo}
            aoRemover={() => setCodigo(null)}
          />
        )}
        {!semCartao && (
          <PageSection title={t.pagamento} className="pt-0 sm:pt-0">
            <CampoDoCartao />
          </PageSection>
        )}
      </div>
      <div className="space-y-8">
        <ResumoDaAssinatura plano={escolhido} comCodigo={comCodigo} erro={erro} botao={botao} pix={comPix} />
      </div>
    </div>
  );

  if (semCartao) return tela(<BotaoDeAssinar enviando={enviando} aoClicar={() => void enviar(null)} reativar={reativar} />);
  return (
    <CartaoProvider pedido={{ chavePublicavel: dados.chavePublicavel, centavos: centavosHoje, moeda: escolhido.moeda, formasDePagamento: dados.formasDePagamento, pix: comPix && dados.pix ? dados.pix : null }}>
      {tela(<BotaoComCartao enviando={enviando} aoEnviar={(cartao) => void enviar(cartao)} reativar={reativar} pix={comPix} />)}
    </CartaoProvider>
  );
}
