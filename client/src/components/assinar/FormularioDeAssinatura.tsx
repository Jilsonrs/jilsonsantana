import { useState, type ReactNode } from "react";
import { DuracaoDoDesconto, enderecoDeEmailSchema, lerDocumentoFiscal, Plano, TELA_DE_CONCLUIDO_SEM_LOGIN, type AssinaturaCriada, type PlanosDaAssinatura } from "@jilson/core";
import { PageSection } from "@/components/layout/PageLayout";
import { assinarSemLogin, criarAssinatura } from "@/lib/api";
import { getStoredAttribution } from "@/lib/attribution";
import { telaDeConcluido, usePrevia } from "@/lib/assinar";
import { codigoDoErro } from "@/lib/course-form";
import { passouDoLimite } from "@/lib/faturamento";
import { useT } from "@/lib/language";
import { CampoDoCartao, CartaoProvider, type Cartao } from "@/lib/stripe-do-site";
import { guardarTentativa, lerTentativa } from "@/lib/tentativa-de-assinar";
import { semInterromper } from "@/lib/versao";
import { BotaoDeAssinar } from "./BotaoDeAssinar";
import { CampoDoDocumento } from "./CampoDoDocumento";
import { CodigoPromocional } from "./CodigoPromocional";
import { CaixaDeNovidades, CampoDoEmail } from "./DadosDoVisitante";
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
 * `sessionStorage`, antes de o cartão confirmar (`lib/tentativa-de-assinar.ts`).
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
        const criada = semLogin ? await assinarComoVisitante() : await criarAssinatura(comCodigo && codigo ? { plano, codigo, documento } : { plano, documento });
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

  /** O pedido do visitante: a tentativa desta aba segue (é a mesma assinatura); a nova fica guardada antes do cartão. */
  async function assinarComoVisitante(): Promise<AssinaturaCriada> {
    const origem = getStoredAttribution();
    const anterior = lerTentativa();
    const doMesmoEmail = anterior !== null && anterior.email.toLowerCase() === email.trim().toLowerCase();
    const resposta = await assinarSemLogin({
      email,
      documento,
      plano,
      novidades,
      ...(comCodigo && codigo ? { codigo } : {}),
      ...(doMesmoEmail ? { tentativa: anterior.tentativa } : {}),
      ...(origem?.source ? { origem: origem.source } : {}),
      ...(origem?.campaign ? { campanha: origem.campaign } : {}),
    });
    guardarTentativa({ tentativa: resposta.tentativa, email: email.trim() });
    return resposta.estado === "pagar" ? { estado: "pagar", segredo: resposta.segredo, tipo: resposta.tipo } : { estado: "ativa" };
  }

  // À esquerda, o que se preenche; à direita (no celular, embaixo), o resumo com o botão e a lista.
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
