import { Button } from "@/components/ui/button";
import { useT } from "@/lib/language";

/** O botão de assinar. Só trava DEPOIS do clique, enquanto o envio corre: dois cliques, um pedido. */
export function BotaoDeAssinar({ enviando, aoClicar }: { enviando: boolean; aoClicar?: () => void }) {
  const t = useT().assinar;
  return (
    <Button type={aoClicar ? "button" : "submit"} size="lg" disabled={enviando} onClick={aoClicar} className="min-h-12 w-full sm:w-auto">
      {enviando ? t.processando : t.botao}
    </Button>
  );
}
