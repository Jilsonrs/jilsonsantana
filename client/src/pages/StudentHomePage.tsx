import { Link } from "react-router-dom";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Home do aluno — o destino de quem acaba de entrar.
 *
 * Hoje é deliberadamente magra: saudação + o vazio de "continue estudando" + a
 * porta para o catálogo. **O conteúdo real depende da Fase 5** (captura de
 * progresso): sem `LessonProgress` não existe "o que você estava vendo" nem "o
 * que falta concluir", e inventar dado de mentira aqui esconderia a dependência.
 *
 * Não busca dados de propósito — por isso não tem estado de carregando nem de
 * erro. Quando passar a buscar, os três estados entram junto com os testes
 * deles (Definição de pronto por fatia).
 */
export function StudentHomePage() {
  const { data: session } = useSession();
  const primeiroNome = session?.user.name?.split(" ")[0];

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">
        {primeiroNome ? `Olá, ${primeiroNome}` : "Olá"}
      </h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Continue estudando</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Estado vazio HONESTO: diz o que vai aparecer e o que fazer agora.
              "Nenhum curso" sozinho parece defeito; isto parece começo. */}
          <p className="text-sm text-muted-foreground">
            Suas aulas em andamento aparecem aqui assim que você começar um
            curso.
          </p>
          <Button asChild>
            <Link to="/cursos">Ver catálogo</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
