import { useState } from "react";
import { DuracaoDoDesconto, Plano, type PlanosDaAssinatura } from "@jilson/core";
import { PageSection } from "@/components/layout/PageLayout";
import { criarAssinatura } from "@/lib/api";
import { descreverDesconto, dinheiro, TELA_DE_CONCLUIDO, usePrevia } from "@/lib/assinar";
import { codigoDoErro } from "@/lib/course-form";
import { useIdioma, useT } from "@/lib/language";
import { CartaoProvider, type Cartao } from "@/lib/stripe-do-site";
import { semInterromper } from "@/lib/versao";
import { BotaoDeAssinar } from "./BotaoDeAssinar";
import { CodigoPromocional } from "./CodigoPromocional";
import { EscolhaDoPlano } from "./EscolhaDoPlano";
import { PagamentoComCartao } from "./PagamentoComCartao";

/**
 * ASSINAR — o plano, o código promocional e o cartão (Fase 4, etapa 4.2). Separado da página
 * de propósito: o visitante sem conta (etapa 4.7) vai usar este mesmo formulário.
 *
 * O site manda ao servidor só QUAL plano e o código. O valor de hoje, com código, é o que a
 * Stripe calculou (`usePrevia`). O envio: confere o cartão → o servidor cria a assinatura → o
 * cartão confirma com o segredo que ele devolveu. Com desconto de 100% PARA SEMPRE não há
 * cartão: a assinatura já nasce ativa (decisão do operador, 09/10/2026).
 */
export function FormularioDeAssinatura({ dados, aoConcluir, aoSaberQueJaAssina }: { dados: PlanosDaAssinatura; aoConcluir: () => void; aoSaberQueJaAssina: () => void }) {
  const t = useT().assinar;
  const idioma = useIdioma();
  const [plano, setPlano] = useState<Plano>(Plano.MENSAL);
  const [codigo, setCodigo] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const previa = usePrevia(plano, codigo);

  const escolhido = dados.planos.find((p) => p.plano === plano) ?? dados.planos[0];
  if (!escolhido) return null;
  const comCodigo = codigo !== null && previa.data ? previa.data : null;
  const conferindo = codigo !== null && previa.isFetching;
  const recusado = codigo !== null && previa.isError ? (codigoDoErro(previa.error) === "CodigoInvalido" ? t.codigoInvalido : t.erro) : null;
  const centavosHoje = comCodigo ? comCodigo.centavosHoje : escolhido.centavos;
  // Nada a pagar, hoje nem depois: sem cartão. Se o desconto acaba, o cartão é pedido mesmo com
  // zero hoje — a cobrança seguinte precisa dele.
  const semCartao = comCodigo !== null && comCodigo.centavosHoje === 0 && comCodigo.desconto.duracao === DuracaoDoDesconto.PARA_SEMPRE;

  async function enviar(cartao: Cartao | null) {
    if (enviando || conferindo) return;
    setEnviando(true);
    setErro(null);
    try {
      // Carregar a página no meio cortaria o pagamento (`lib/versao.ts`).
      await semInterromper(async () => {
        if (cartao) {
          const preenchido = await cartao.validar();
          if (!preenchido.ok) return setErro(preenchido.mensagem ?? t.erro);
        }
        const criada = await criarAssinatura(comCodigo && codigo ? { plano, codigo } : { plano });
        if (criada.estado === "pagar") {
          // O servidor pede pagamento e a tela não tinha cartão: o código mudou no meio do caminho.
          if (!cartao) {
            void previa.refetch();
            return setErro(t.erro);
          }
          const confirmado = await cartao.confirmar(criada.segredo, criada.tipo, TELA_DE_CONCLUIDO);
          if (!confirmado.ok) return setErro(confirmado.mensagem ?? t.erro);
        }
        aoConcluir();
      });
    } catch (falha) {
      const motivo = codigoDoErro(falha);
      if (motivo === "JaAssinante") aoSaberQueJaAssina();
      else if (motivo === "CodigoInvalido") void previa.refetch();
      else setErro(t.erro);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      <EscolhaDoPlano planos={dados.planos} escolhido={plano} aoEscolher={setPlano} travado={enviando} />
      <CodigoPromocional
        aplicado={comCodigo ? codigo : null}
        recusado={recusado}
        conferindo={conferindo}
        travado={enviando}
        aoAplicar={setCodigo}
        aoRemover={() => setCodigo(null)}
      />

      {/* SÓ com código promocional (pedido do operador, 10/10/2026): sem código, o cartão do plano
          já diz o preço e como é cobrado, e repetir o valor aqui confundia. Com código, o valor
          de hoje muda — e é o que a Stripe calculou. */}
      <div aria-live="polite">
        {comCodigo && (
          <div className="space-y-1 rounded-xl border border-border/60 bg-card p-4">
            <p className="flex items-baseline justify-between gap-4">
              <span className="text-sm text-muted-foreground">{t.hoje}</span>
              <span className="text-xl font-semibold text-foreground">{dinheiro(centavosHoje, escolhido.moeda, idioma)}</span>
            </p>
            <p className="text-sm text-muted-foreground">{descreverDesconto(t, comCodigo.desconto, comCodigo.moeda, idioma)}</p>
          </div>
        )}
      </div>

      {erro && (
        <p role="alert" className="text-sm text-destructive">
          {erro}
        </p>
      )}

      {semCartao ? (
        <BotaoDeAssinar enviando={enviando} aoClicar={() => void enviar(null)} />
      ) : (
        <PageSection title={t.pagamento} className="pt-0 sm:pt-0">
          <CartaoProvider pedido={{ chavePublicavel: dados.chavePublicavel, centavos: centavosHoje, moeda: escolhido.moeda, formasDePagamento: dados.formasDePagamento, idioma }}>
            <PagamentoComCartao enviando={enviando} aoEnviar={(cartao) => void enviar(cartao)} />
          </CartaoProvider>
        </PageSection>
      )}
    </div>
  );
}
