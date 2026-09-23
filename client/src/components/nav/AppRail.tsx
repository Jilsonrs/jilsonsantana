import { Fragment } from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { secaoAtiva, secoesVisiveis, type Secao } from "@/lib/navigation";

/**
 * NÍVEL 1 — o rail escuro (design.md §6).
 *
 * Recolhido por padrão (80px, só ícone); expande para 280px **sobrepondo** o
 * conteúdo, sem empurrá-lo. A sobreposição é o que a referência faz e o que o
 * `Sidebar` do shadcn NÃO fazia — por isso este componente é nosso.
 *
 * A mecânica é CSS puro: um espaçador de largura fixa reserva os 80px, e o rail
 * de verdade é `fixed` por cima. Sem estado em React, sem efeito, sem cookie.
 *
 * **`focus-within` ao lado de `hover` é a trava de acessibilidade do §6, não um
 * detalhe:** expandir só com o mouse deixa de fora quem navega por teclado. As
 * duas condições vivem na MESMA linha de propósito — separá-las é como o
 * caminho do teclado morre sem ninguém perceber.
 */

// Escritas LITERAIS, e nunca montadas por template string: o Tailwind gera CSS
// varrendo o texto do arquivo, então `hover:${algumaVariavel}` produziria uma
// classe que não existe no CSS final — sem erro de build, só um rail que não
// expande.
const LARGURA_RECOLHIDO = "w-20";
const EXPANDE = "hover:w-[280px] focus-within:w-[280px]";

/** Ícone Lucide com traço FINO (o padrão é 2). É o que o §6 chama de "traço
 *  fino" e, sozinho, responde por boa parte do ar de refinamento. */
const TRACO = 1.5;

/**
 * Tudo que só aparece com o rail expandido.
 *
 * **Por OPACIDADE, e isso é a regra inteira:** recorte sozinho não bastava — o
 * item começa depois do ícone, e sobrava espaço dentro dos 80px, então vazava o
 * começo de cada palavra em vez de mostrar só ícones.
 *
 * E opacidade em vez de `display:none` ou `hidden` porque o elemento
 * transparente **continua na árvore de acessibilidade**: quem usa leitor de
 * tela ouve o nome do item nos dois estados. Trocar isto por `hidden` deixaria
 * a tela idêntica e apagaria o rótulo para quem não enxerga.
 */
const ROTULO =
  "whitespace-nowrap opacity-0 transition-opacity duration-200 group-hover:opacity-100 " +
  "group-focus-within:opacity-100 motion-reduce:transition-none";

/**
 * "Glow timeline" do item ativo: ponto luminoso azul na borda com um rastro em
 * gradiente descendo — a navegação lida como jornada, não como lista.
 *
 * Desenhado com `before`/`after` no próprio item em vez de elementos extras:
 * pseudo-elemento não entra na árvore de acessibilidade, então o leitor de tela
 * anuncia só o nome do item, sem ruído decorativo.
 */
const GLOW_ATIVO = cn(
  "before:absolute before:left-0 before:top-1/2 before:size-1.5 before:-translate-y-1/2",
  "before:rounded-full before:bg-primary before:shadow-[0_0_12px_2px_hsl(var(--primary)/0.6)]",
  "after:absolute after:left-[2px] after:top-1/2 after:bottom-[-28px] after:w-[2px]",
  "after:bg-gradient-to-b after:from-primary after:to-transparent",
);

/**
 * Seção PLANEJADA: a tela ainda não existe (decisão do operador, set/2026 —
 * ele quer o mapa inteiro à vista para não esquecer o que falta).
 *
 * Renderiza como TEXTO, nunca como `<a>`. É aqui que mora a trava que antes
 * vivia no filtro: item de menu que leva a rota inexistente é link quebrado, e
 * link quebrado no rail é pior que item ausente. `aria-disabled` para quem usa
 * leitor de tela ouvir que aquilo não é acionável, e a etiqueta "em breve" para
 * quem enxerga não achar que o clique falhou.
 */
function ItemPlanejado({ secao }: { secao: Secao }) {
  const Icon = secao.icon;
  return (
    <li>
      <div
        aria-disabled="true"
        className={cn(
          "relative mx-3 flex h-12 items-center gap-4 rounded-[10px] pl-4 pr-4 text-sm",
          "text-rail-foreground/40",
        )}
      >
        <Icon className="size-6 shrink-0" strokeWidth={TRACO} />
        <span className={cn(ROTULO, "flex items-center gap-2")}>
          {secao.label}
          <span className="rounded-full border border-white/10 px-1.5 py-0.5 font-mono text-[0.55rem] tracking-[0.08em]">
            EM BREVE
          </span>
        </span>
      </div>
    </li>
  );
}

function ItemRail({ secao, ativa }: { secao: Secao; ativa: boolean }) {
  const Icon = secao.icon;
  return (
    <li>
      <Link
        to={secao.to}
        aria-current={ativa ? "page" : undefined}
        className={cn(
          // mx-3 (12px) + pl-4 (16px) = 28px da borda do rail.
          // 28px + 12px (metade do ícone de 24px) = 40px, que é o EXATO centro do rail de 80px!
          "relative mx-3 flex h-12 items-center gap-4 rounded-[10px] pl-4 pr-4 text-sm",
          "transition-colors focus-visible:outline-none",
          "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
          // Hover NEUTRO: o azul é o único sinal de "onde estou" (§6). Se o
          // hover também fosse azul, o rail perderia esse sinal.
          ativa
            ? cn("font-semibold text-white", GLOW_ATIVO)
            : "text-rail-foreground hover:text-white",
        )}
      >
        <Icon className={cn("size-6 shrink-0", ativa ? "text-primary" : "")} strokeWidth={TRACO} />
        <span className={ROTULO}>{secao.label}</span>
      </Link>
    </li>
  );
}

export function AppRail({ papel }: { papel?: string }) {
  const { pathname } = useLocation();
  const secoes = secoesVisiveis(papel);
  const ativa = secaoAtiva(pathname, secoes);

  // Onde o bloco do admin começa — separa visualmente as duas áreas sem
  // precisar de um segundo componente nem de um título extra no rail.
  const primeiraAdmin = secoes.findIndex((s) => s.papel !== undefined);

  return (
    // Espaçador: reserva os 80px no fluxo. É ele que faz o rail SOBREPOR em vez
    // de empurrar — sem isto, expandir mexeria o conteúdo inteiro para o lado.
    <div className={cn("hidden shrink-0 md:block", LARGURA_RECOLHIDO)}>
      <nav
        aria-label="Principal"
        className={cn(
          "group fixed inset-y-0 left-0 z-40 flex flex-col overflow-hidden",
          "border-r border-white/5 bg-rail text-rail-foreground",
          LARGURA_RECOLHIDO,
          EXPANDE,
          // A sombra só existe expandido: é o que descola o painel do conteúdo
          // que ele está cobrindo. Recolhido, não há nada a descolar.
          "hover:shadow-[20px_0_50px_rgba(0,0,0,0.4)] focus-within:shadow-[20px_0_50px_rgba(0,0,0,0.4)]",
          "transition-[width] duration-300 ease-out motion-reduce:transition-none",
        )}
      >
        {/* A marca. Recolhida é só o "#", grande e centrado, fazendo o papel de
            ícone; expandida ele encolhe e o nome entra ao lado. */}
        <Link
          to="/inicio"
          className="flex h-20 shrink-0 items-center pl-[28px] pr-4 font-brand font-bold tracking-tight text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          <span className="shrink-0 text-[28px] leading-none text-primary transition-[font-size] duration-300 group-hover:text-2xl group-focus-within:text-2xl motion-reduce:transition-none">
            #
          </span>
          <span className={cn(ROTULO, "ml-2 text-2xl leading-none")}>Jilson Santana</span>
        </Link>

        {/* Etiqueta de seção. Some junto com os rótulos: recolhida não caberia,
            e um fragmento cortado é pior que ausência. */}
        <span
          className={cn(
            ROTULO,
            "mx-3 mb-4 flex shrink-0 items-center gap-2 rounded-full",
            "border border-white/10 px-2.5 py-1.5 font-mono text-[0.6rem] tracking-[0.1em]",
          )}
        >
          <span
            aria-hidden="true"
            className="size-1 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.8)]"
          />
          PLATAFORMA
        </span>

        <ul className="relative flex flex-1 flex-col gap-2">
          {/* Linha-guia vertical: liga os ícones e sustenta o rastro do item
              ativo, para o glow não parecer solto no escuro. Decorativa. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute bottom-0 left-[14px] top-0 w-[2px] bg-gradient-to-b from-transparent via-white/5 to-transparent z-0"
          />
          {secoes.map((secao, i) => (
            // Fragment, não <div>: só <li> é filho válido de <ul>, e o
            // separador também vai como <li> por isso.
            <Fragment key={secao.to}>
              {i === primeiraAdmin && i > 0 && (
                <li className="mx-6 my-3 border-t border-white/10" aria-hidden="true" />
              )}
              {secao.estado === "planejado" ? (
                <ItemPlanejado secao={secao} />
              ) : (
                <ItemRail secao={secao} ativa={secao.to === ativa?.to} />
              )}
            </Fragment>
          ))}
        </ul>

      </nav>
    </div>
  );
}
