import { Link } from "react-router-dom";
import type { AdminCourseCard as Curso, NumerosDoCurso } from "@/lib/api";
import { preenchimentoDoCurso, ROTULO_DO_STATUS } from "@/lib/course-completeness";
import { horasEMinutos } from "@/lib/duracao-do-curso";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CompletenessBar } from "./CompletenessBar";
import { ContentStatus, pt } from "@jilson/core";

type Numero = { rotulo: string; total: string; embaixo: string | null };

/**
 * Os números do cartão (Bloco A de 27/09; Bloco MEDIR, etapa 2 — decisão do operador de
 * 09/10/2026): o TOTAL grande e "N este mês" embaixo. Sem os números (carregando, ou a busca
 * falhou): "—". A Avaliação continua "em breve" até a avaliação por curso existir.
 */
function numerosDoCartao(n: NumerosDoCurso | null): Numero[] {
  return [
    { rotulo: "Horas assistidas", total: n ? horasEMinutos(n.horas.total) : "—", embaixo: n ? `${horasEMinutos(n.horas.mes)} este mês` : null },
    { rotulo: "Alunos", total: n ? String(n.alunos.total) : "—", embaixo: n ? `${n.alunos.mes} este mês` : null },
    { rotulo: "Avaliação", total: "—", embaixo: "em breve" },
  ];
}

export function AdminCourseCard({ curso, numeros = null, aoExcluir }: { curso: Curso; numeros?: NumerosDoCurso | null; aoExcluir: () => void }) {
  const { porcentagem, faltando } = preenchimentoDoCurso(curso);

  return (
    <Card 
      role="article" 
      aria-label={curso.title} 
      className="group transition-all duration-300 hover:-translate-y-1 hover:shadow-md border border-border hover:border-primary/30 bg-background overflow-hidden"
    >
      {/* p-5 ou p-6 garante a margem ao redor da foto para ela flutuar, semelhante à home pública */}
      <CardContent className="flex flex-col gap-6 p-6 md:flex-row md:items-start">
        {/* Foto estritamente retangular (aspect-video) sem rounded interno, container controla o recorte para hover */}
        <div className="relative aspect-video w-full shrink-0 overflow-hidden bg-surface-alt md:w-[320px]">
          {curso.thumbnailUrl ? (
            <img 
              src={curso.thumbnailUrl} 
              alt={`Capa de ${curso.title}`} 
              className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]" 
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center border border-dashed border-border bg-surface-alt/50">
              <span className="font-mono text-xs tracking-widest text-muted-foreground uppercase">Sem imagem</span>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-6 md:py-1">
          {/* Cabeçalho */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-3">
              <h3 className="font-display text-xl font-semibold leading-tight text-foreground transition-colors group-hover:text-primary">
                {curso.title}
              </h3>
              
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant={curso.status === ContentStatus.PUBLISHED ? "default" : "secondary"} className="rounded-full px-3 font-medium">
                  {ROTULO_DO_STATUS[curso.status]}
                </Badge>
                {curso.level && (
                  <Badge variant="secondary" className="rounded-full font-medium">
                    {/* Em português sempre: o admin não muda de idioma (23/09/2026). */}
                    {pt.app.niveis[curso.level]}
                  </Badge>
                )}
                {curso.language === "en" && (
                  <Badge variant="outline" className="rounded-full px-2 font-mono text-[10px] tracking-wider uppercase">
                    EN
                  </Badge>
                )}
                <span className="flex items-center gap-2 font-mono text-xs tracking-wide text-muted-foreground before:text-primary before:font-bold before:content-['—']">
                  {curso.moduleCount} módulos · {curso.lessonCount} aulas · {horasEMinutos(curso.videoSeconds)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1 sm:pt-0">
              <Button asChild variant="outline" size="sm" className="rounded-full hover:border-primary/40 hover:text-primary transition-colors">
                <Link to={`/admin/cursos/${curso.id}`}>Editar</Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                onClick={aoExcluir}
              >
                Excluir
              </Button>
            </div>
          </div>

          {/* Grid de Números */}
          <dl className="grid grid-cols-3 gap-6 pt-1">
            {numerosDoCartao(numeros).map(({ rotulo, total, embaixo }) => (
              <div key={rotulo} className="flex flex-col gap-1 border-l border-border-fine pl-4 first:border-0 first:pl-0">
                <dt className="text-xs font-medium text-muted-foreground">{rotulo}</dt>
                <dd className="font-display text-2xl font-light text-foreground">{total}</dd>
                {embaixo && <dd className="font-mono text-[10px] tracking-widest text-muted-foreground/70 uppercase">{embaixo}</dd>}
              </div>
            ))}
          </dl>

          {/* Preenchimento */}
          <div className="pt-2">
            <CompletenessBar titulo={curso.title} porcentagem={porcentagem} faltando={faltando} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
