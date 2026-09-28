import Markdown from "react-markdown";
import { cn } from "@/lib/utils";

// O que a descrição do curso aceita (decisão do operador, 27/09/2026): negrito,
// itálico e listas. O resto do Markdown (título, link, imagem, código) vira
// texto comum. HTML digitado aparece como texto e nunca vira HTML: é o padrão
// do react-markdown, que só liga HTML cru com um plugin que este repo não usa.
export const ELEMENTOS_DA_DESCRICAO = ["p", "strong", "em", "ul", "ol", "li", "br"] as const;

/**
 * O ÚNICO jeito de mostrar Markdown no React deste repo (CLAUDE.md → Client).
 * Quem usa escolhe o que vale em `permitidos`; o JilsonAI (Fase 6) passa a sua lista.
 */
export function MarkdownText({
  texto,
  permitidos = ELEMENTOS_DA_DESCRICAO,
  className,
}: {
  texto: string;
  permitidos?: readonly string[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "space-y-3 text-sm leading-relaxed text-foreground [&_li]:mt-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-5",
        className,
      )}
    >
      <Markdown allowedElements={permitidos} unwrapDisallowed>
        {texto}
      </Markdown>
    </div>
  );
}
