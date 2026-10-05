import { icons, type LucideIcon } from "lucide-react";

// TODOS os desenhos do Lucide. Só entra por `import()` (HighlightIcon) ou pelo
// seletor do admin, que já é preguiçoso: importar isto direto numa tela põe os
// 1.488 desenhos no pacote que todo aluno baixa.
// (Por que não o `lucide-react/dynamicIconImports`, um arquivo por ícone: medido
// em 05/10/2026, ele põe a lista dos 1.488 arquivos no pacote principal —
// +16 KB compactados em TODA página, para servir poucos cursos.)

/** "arrow-down-0-1" → "ArrowDown01": o nome do componente no Lucide. */
function nomeDoComponente(token: string): string {
  return token
    .split("-")
    .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))
    .join("");
}

/** O desenho do Lucide para um nome técnico ("hard-hat"), ou null se não existe. */
export function desenhoDoLucide(token: string): LucideIcon | null {
  const nome = nomeDoComponente(token);
  // Seguro: o `hasOwnProperty` prova que o nome é uma chave de `icons`.
  return Object.prototype.hasOwnProperty.call(icons, nome) ? icons[nome as keyof typeof icons] : null;
}
