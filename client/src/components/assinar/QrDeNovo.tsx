import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/language";
import { esquecerPix, lerPix } from "@/lib/pix-pendente";

/**
 * "MOSTRAR O QR DE NOVO" (etapa 4.9, passo 2b — texto aprovado pelo operador em 28/10/2026): nas telas de
 * concluído, para quem pagou com Pix e fechou a janela do QR sem pagar. Só com um Pix guardado nesta aba
 * (`lib/pix-pendente.ts`) e enquanto o servidor não confirma; confirmada, o Pix é esquecido. A fronteira
 * com o Stripe.js vem à parte (`import()`, já em `PEDACOS_DO_ALUNO`): estas telas estão no pacote de todo
 * aluno, e o Stripe.js só é preciso aqui. O que a janela devolve não decide nada — quem diz que a
 * assinatura valeu é o servidor, que a tela continua perguntando.
 */
export function QrDeNovo({ confirmado }: { confirmado: boolean }) {
  const t = useT().assinar.pix;
  const [pix] = useState(lerPix);
  const [abrindo, setAbrindo] = useState(false);
  // Efeito: a confirmação chega de fora (do servidor), e o que esta aba guardou deixa de servir.
  useEffect(() => {
    if (confirmado) esquecerPix();
  }, [confirmado]);
  if (!pix || confirmado) return null;
  async function mostrar() {
    if (!pix || abrindo) return;
    setAbrindo(true);
    try {
      const { mostrarQrDeNovo } = await import("@/lib/stripe-do-site");
      if (!(await mostrarQrDeNovo(pix.chavePublicavel, pix.segredo))) console.warn("[pix] a janela do QR não abriu de novo");
    } catch {
      console.warn("[pix] o Stripe.js não carregou para mostrar o QR de novo");
    } finally {
      setAbrindo(false);
    }
  }
  return (
    <Button type="button" variant="outline" disabled={abrindo} onClick={() => void mostrar()}>
      {t.qrDeNovo}
    </Button>
  );
}
