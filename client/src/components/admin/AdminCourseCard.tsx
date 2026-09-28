import { Link } from "react-router-dom";
import type { AdminCourseCard as Curso } from "@/lib/api";
import { preenchimentoDoCurso, ROTULO_DO_STATUS } from "@/lib/course-completeness";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

// Os números que ainda não existem (plano de 27/09/2026): aparecem como "—" com
// "em breve" e viram número real na Fase 5 — horas assistidas (eventos do
// player), alunos (progresso por aula) e avaliação (só para o operador, nunca no
// site). Sem preço: a escola é por assinatura (decisão do operador).
const NUMEROS_EM_BREVE = ["Horas assistidas", "Alunos", "Avaliação"];

/** O cartão de um curso na lista do admin: capa, status, números e o que falta. */
export function AdminCourseCard({ curso, aoExcluir }: { curso: Curso; aoExcluir: () => void }) {
  const { porcentagem, faltando } = preenchimentoDoCurso(curso);

  return (
    // `article` com o nome do curso: leitor de tela anuncia cada cartão, e o teste
    // acha o cartão pelo que ele é, não por uma classe de estilo.
    <Card role="article" aria-label={curso.title} className="overflow-hidden transition-all duration-200 hover:shadow-md">
      <CardContent className="flex flex-col gap-6 p-0 md:flex-row">
        <div className="aspect-video w-full shrink-0 bg-muted md:w-64">
          {curso.thumbnailUrl ? (
            <img src={curso.thumbnailUrl} alt={`Capa de ${curso.title}`} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="text-sm text-muted-foreground">Sem imagem</span>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-4 p-6 md:pl-0">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-lg font-semibold">{curso.title}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{ROTULO_DO_STATUS[curso.status]}</Badge>
                {/* Curso em inglês ganha etiqueta, para o operador ver qual é qual (24/09). */}
                {curso.language === "en" && <Badge variant="outline">EN</Badge>}
                <span className="text-sm text-muted-foreground">
                  {curso.moduleCount} módulos · {curso.lessonCount} aulas
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <Link to={`/admin/cursos/${curso.id}`}>Editar</Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={aoExcluir}
              >
                Excluir
              </Button>
            </div>
          </div>

          <dl className="grid grid-cols-3 gap-4">
            {NUMEROS_EM_BREVE.map((rotulo) => (
              <div key={rotulo}>
                <dt className="text-sm text-muted-foreground">{rotulo}</dt>
                <dd className="text-2xl font-semibold">—</dd>
                <dd className="text-xs text-muted-foreground">em breve</dd>
              </div>
            ))}
          </dl>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Preenchimento</span>
              <span className="font-medium">{porcentagem}%</span>
            </div>
            <div
              role="progressbar"
              aria-label={`Preenchimento de ${curso.title}`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={porcentagem}
              className="h-2 w-full overflow-hidden rounded-full bg-muted"
            >
              <div className="h-full rounded-full bg-primary" style={{ width: `${porcentagem}%` }} />
            </div>
            {faltando.length > 0 && (
              <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {faltando.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
