import type { SVGProps } from "react";

/**
 * O ícone "CC" das legendas (pedido do operador, 05/10/2026). O Lucide não tem um
 * CC, então ele é desenhado aqui com o mesmo traço dos ícones do Lucide (24×24,
 * linha de 2, pontas redondas): um retângulo com dois "C".
 */
export function IconeCC(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      data-icone="cc"
      {...props}
    >
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M10 10a2.5 2.5 0 1 0 0 4" />
      <path d="M17 10a2.5 2.5 0 1 0 0 4" />
    </svg>
  );
}
