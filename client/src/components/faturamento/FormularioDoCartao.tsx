import { useState } from "react";
import type { CartaoTrocado } from "@jilson/core";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { aplicarCartaoNovo, prepararTrocaDeCartao } from "@/lib/api";
import { codigoDoErro } from "@/lib/course-form";
import { TELA_DO_FATURAMENTO, passouDoLimite } from "@/lib/faturamento";
import { useT } from "@/lib/language";
import { CampoDoCartao, CartaoProvider, confirmarNoBanco, useCartao } from "@/lib/stripe-do-site";
import { semInterromper } from "@/lib/versao";

type Props = {
  /** A chave e as formas de pagamento vêm do servidor; a moeda é a da assinatura. */
  dados: { chavePublicavel: string; formasDePagamento: string[]; moeda: string };
  aoTrocar: (trocado: CartaoTrocado) => void;
  /** O servidor disse que a conta não tem assinatura que aceite cartão. */
  aoNaoTerOndePor: () => void;
};

/**
 * TROCAR O CARTÃO (Fase 4, etapa 4.6). O campo é o da Stripe, aberto para SÓ GUARDAR o cartão
 * (nada é cobrado aqui): o dado do cartão nunca passa pela escola. O envio, na ordem: confere o
 * que foi preenchido → o servidor abre o pedido de guardar cartão → o campo o confirma com o
 * segredo → o servidor põe o cartão na assinatura (ele o lê na Stripe; daqui não vai código).
 */
export function FormularioDoCartao({ dados, aoTrocar, aoNaoTerOndePor }: Props) {
  return (
    <CartaoProvider pedido={{ chavePublicavel: dados.chavePublicavel, centavos: 0, moeda: dados.moeda, formasDePagamento: dados.formasDePagamento }}>
      <CampoEBotao chavePublicavel={dados.chavePublicavel} aoTrocar={aoTrocar} aoNaoTerOndePor={aoNaoTerOndePor} />
    </CartaoProvider>
  );
}

/** Mora DENTRO do `CartaoProvider`: é daqui que sai o cartão que o envio confere e confirma. */
function CampoEBotao({ chavePublicavel, aoTrocar, aoNaoTerOndePor }: Pick<Props, "aoTrocar" | "aoNaoTerOndePor"> & { chavePublicavel: string }) {
  const { faturamento: t, comum } = useT();
  // A cobrança atrasada pediu a confirmação do banco: a janela dele está aberta por cima da tela.
  const [noBanco, setNoBanco] = useState(false);
  const cartao = useCartao();
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  // O cartão já foi confirmado na Stripe e só o último passo falhou: um novo clique repete SÓ
  // esse passo — confirmar de novo guardaria um segundo cartão.
  const [confirmado, setConfirmado] = useState(false);

  async function enviar() {
    if (enviando) return;
    setEnviando(true);
    setErro(null);
    try {
      // Carregar a página no meio cortaria a troca (`lib/versao.ts`).
      await semInterromper(async () => {
        if (!confirmado) {
          const preenchido = await cartao.validar();
          if (!preenchido.ok) return setErro(preenchido.mensagem ?? t.erroDoCartao);
          const { segredo } = await prepararTrocaDeCartao();
          const guardado = await cartao.confirmar(segredo, "cartao", TELA_DO_FATURAMENTO);
          if (!guardado.ok) return setErro(guardado.mensagem ?? t.erroDoCartao);
          setConfirmado(true);
        }
        const trocado = await aplicarCartaoNovo();
        // O cartão novo foi posto, e a cobrança em aberto pediu a confirmação do banco (sessão
        // b): a pessoa a completa agora. Passou → pago. Não concluiu → o segredo segue com a
        // tela, que oferece tentar de novo.
        if (!trocado.confirmar) return aoTrocar(trocado);
        setNoBanco(true);
        const banco = await confirmarNoBanco(chavePublicavel, trocado.confirmar);
        aoTrocar(banco === "confirmado" ? { ...trocado, pagou: true, confirmar: null } : trocado);
      });
    } catch (falha) {
      if (codigoDoErro(falha) === "SemAssinatura") aoNaoTerOndePor();
      else setErro(passouDoLimite(falha) ? comum.muitasTentativas : t.erroDoCartao);
    } finally {
      setNoBanco(false);
      setEnviando(false);
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardContent className="p-6 sm:p-8">
        <form
          className="space-y-6"
          onSubmit={(evento) => {
            evento.preventDefault();
            void enviar();
          }}
        >
          <CampoDoCartao />
          {noBanco && (
            <div className="rounded-xl border border-border/60 bg-muted/30 p-3.5">
              <p role="status" className="text-sm font-medium text-foreground">
                {t.banco.confirmando}
              </p>
            </div>
          )}
          {erro && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3.5">
              <p role="alert" className="text-sm font-medium text-destructive">
                {erro}
              </p>
            </div>
          )}
          <div className="pt-2">
            <Button type="submit" size="lg" disabled={enviando} className="min-h-12 w-full sm:w-auto">
              {enviando ? t.salvando : t.salvarCartao}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
