import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

// Minimal public entry. The rich marketing landing (hero trilha-demo, pillars,
// pricing, FAQ from content.md/design.md) is a later, dedicated build.
export function HomePage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-24 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">
        Torne-se um especialista em dados na era da IA
      </h1>
      <p className="mt-4 text-muted-foreground">
        Excel, Power BI, SQL, Python e IA aplicada — em trilhas guiadas, com o
        JilsonAI do seu lado.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Button asChild>
          <Link to="/login">Entrar</Link>
        </Button>
        <Button variant="outline" disabled>
          Assinar (em breve)
        </Button>
      </div>
    </div>
  );
}
