import type { ReactNode } from "react";
import { Captions, FileDown, FileText, Gift, MonitorPlay, type LucideIcon } from "lucide-react";
import { MATERIAL_CONFIG, type LanguageCode, type Material } from "@jilson/core";
import type { CursoInclui } from "@/lib/api";
import { useTextosComuns } from "@/lib/common-texts";
import { contagem } from "@/lib/contagem";
import { horasEMinutos } from "@/lib/duracao-do-curso";
import { resolveIcon } from "./icon-registry";

type Linha = { chave: string; Icone: LucideIcon; texto: ReactNode };

/**
 * "ESTE CURSO INCLUI" — o resumo do que o curso entrega, na página de venda e no
 * "Sobre o curso" da aula (decisões do operador, 04 e 05/10/2026, a partir da
 * Udemy). As linhas calculadas vêm do servidor (`inclui`) e só aparecem quando
 * existem: horas de vídeo, artigos, aulas grátis, arquivos e legendas; depois, os
 * materiais exclusivos marcados no passo Publicar. Os textos são globais
 * (`common.inclui` e `common.materiais`, editáveis em Admin → Textos); o número
 * quem põe é o código. Sem nada a mostrar, o quadro não aparece.
 */
export function CourseIncludes({
  materiais,
  inclui,
  idiomaDoCurso,
}: {
  materiais: Material[];
  inclui: CursoInclui;
  /** A legenda é no idioma do curso, não no da tela. */
  idiomaDoCurso: LanguageCode;
}) {
  const { inclui: t, materiais: nomes } = useTextosComuns();
  const linhas: Linha[] = [];
  if (inclui.segundosDeVideo > 0) {
    linhas.push({ chave: "video", Icone: MonitorPlay, texto: `${horasEMinutos(inclui.segundosDeVideo)} ${t.deVideo}` });
  }
  if (inclui.artigos > 0) linhas.push({ chave: "artigos", Icone: FileText, texto: contagem(inclui.artigos, t.artigo, t.artigos) });
  if (inclui.aulasGratis > 0) {
    linhas.push({ chave: "gratis", Icone: Gift, texto: contagem(inclui.aulasGratis, t.aulaGratis, t.aulasGratis) });
  }
  if (inclui.arquivos) linhas.push({ chave: "arquivos", Icone: FileDown, texto: t.arquivos });
  if (inclui.legendas) {
    linhas.push({ chave: "legendas", Icone: Captions, texto: idiomaDoCurso === "en" ? t.legendasEn : t.legendasPt });
  }
  for (const material of materiais) {
    linhas.push({ chave: material, Icone: resolveIcon(MATERIAL_CONFIG[material].icon), texto: nomes[material] });
  }
  if (linhas.length === 0) return null;
  return (
    <section className="rounded-2xl border border-border/40 bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold">{t.titulo}</h2>
      <ul className="mt-4 space-y-3">
        {linhas.map(({ chave, Icone, texto }) => (
          <li key={chave} className="flex items-center gap-3 text-sm text-foreground">
            <Icone className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            {texto}
          </li>
        ))}
      </ul>
    </section>
  );
}
