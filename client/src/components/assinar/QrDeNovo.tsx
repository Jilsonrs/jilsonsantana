import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/language";
import { esquecerPix, lerPix } from "@/lib/pix-pendente";

/**
 * "MOSTRAR O QR DE NOVO" (etapa 4.9, passo 2b — texto aprovado pelo operador em 28/10/2026): nas telas de
 * concluído, para quem pagou com Pix e fechou a janela do QR sem pagar. Só com um Pix guardado nesta aba
 * (`lib/pix-pendente.ts`) e enquanto o servidor não confirma; confirmada, o Pix é esquecido. Com o QR
 * VENCIDO, o mesmo botão gera um QR novo no mesmo pagamento (P115, decisão do operador, 29/10/2026); só se
 * não houver como, a frase aprovada por ele manda voltar. A fronteira com o Stripe.js vem à parte
 * (`import()`, já em `PEDACOS_DO_ALUNO`): estas telas estão no pacote de todo aluno, e o Stripe.js só é
 * preciso aqui. O que a janela devolve não decide nada — quem diz que a assinatura valeu é o servidor, que
 * a tela continua perguntando.
 */
export function QrDeNovo({ confirmado }: { confirmado: boolean }) {
  const t = useT().assinar.pix;
  const [pix] = useState(lerPix);
  const [abrindo, setAbrindo] = useState(false);
  const [naoAbriu, setNaoAbriu] = useState(false);
  // Efeito: a confirmação chega de fora (do servidor), e o que esta aba guardou deixa de servir.
  useEffect(() => {
    if (confirmado) esquecerPix();
  }, [confirmado]);
  if (!pix || confirmado) return null;
  async function mostrar() {
    if (!pix || abrindo) return;
    setAbrindo(true);
    setNaoAbriu(false);
    try {
      const { mostrarQrDeNovo } = await import("@/lib/stripe-do-site");
      if ((await mostrarQrDeNovo(pix.chavePublicavel, pix.segredo, pix.email)) === "falhou") {
        console.warn("[pix] a janela do QR não abriu de novo");
        setNaoAbriu(true);
      }
    } catch {
      console.warn("[pix] o Stripe.js não mostrou o QR de novo");
      setNaoAbriu(true);
    } finally {
      setAbrindo(false);
    }
  }
  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" disabled={abrindo} onClick={() => void mostrar()}>
        {t.qrDeNovo}
      </Button>
      {naoAbriu && (
        <p role="alert" className="text-sm text-destructive">
          {t.qrNaoAbriu}
        </p>
      )}
    </div>
  );
}
