import { Button } from "@/components/ui/button";
import { useT } from "@/lib/language";

/**
 * O botão de assinar. Só trava DEPOIS do clique, enquanto o envio corre: dois cliques, um pedido.
 * Para quem já foi assinante ele diz "Reativar assinatura" (decisão do operador, 10/10/2026).
 */
export function BotaoDeAssinar({ enviando, aoClicar, reativar }: { enviando: boolean; aoClicar?: () => void; reativar?: boolean }) {
  const t = useT().assinar;
  return (
    <Button type={aoClicar ? "button" : "submit"} size="lg" disabled={enviando} onClick={aoClicar} className="min-h-12 w-full sm:w-auto">
      {enviando ? t.processando : reativar ? t.botaoReativar : t.botao}
    </Button>
  );
}
