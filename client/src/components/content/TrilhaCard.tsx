import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Only the fields actually rendered — shared by the full catalog card (which
// has skillsCovered), search results (which don't carry it) and a trilha SALVA
// pelo aluno (que não tem slug — ver `to`).
export type TrilhaCardProps = {
  slug?: string | null;
  name: string;
  description: string | null;
  skillsCovered?: string[];
  // Destino explícito, quando o card não se resolve por slug: o clone do aluno
  // é alcançado por id (`/aluno/minhas-trilhas/:id`). Sem `to`, o link vem do slug.
  to?: string;
};

export function TrilhaCard(trilha: TrilhaCardProps) {
  const body = (
    <Card className="group flex h-full flex-col overflow-hidden rounded-xl border border-border/50 bg-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-md">
      <CardHeader className="flex-none p-6 pb-4 relative">
        <div className="absolute top-0 right-0 p-4 opacity-5">
          <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zm0 7.5l-10-5v3l10 5 10-5v-3l-10 5zM2 12l10 5 10-5v3l-10 5-10-5v-3z"/></svg>
        </div>
        <div className="relative z-10 space-y-2">
          <div className="text-[10px] font-mono tracking-widest text-primary/80 uppercase mb-2">Trilha de Aprendizado</div>
          <CardTitle className="font-display text-[1.15rem] font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
            {trilha.name}
          </CardTitle>
          {trilha.description && (
            <p className="line-clamp-2 text-sm text-muted-foreground leading-relaxed">
              {trilha.description}
            </p>
          )}
        </div>
      </CardHeader>
      {trilha.skillsCovered && trilha.skillsCovered.length > 0 && (
        <CardContent className="mt-auto flex flex-wrap items-center gap-2 p-6 pt-0">
          {trilha.skillsCovered.map((skill) => (
            <Badge key={skill} variant="secondary" className="rounded-full px-3 py-0.5 font-medium text-xs">
              {skill}
            </Badge>
          ))}
        </CardContent>
      )}
    </Card>
  );

  // Catalog templates always carry a slug (Prisma comment: curated templates
  // get a slug; only member clones may not) — but the type is nullable, so
  // guard rather than render a broken link.
  const href = trilha.to ?? (trilha.slug ? `/trilha/${trilha.slug}` : null);
  if (!href) return <div className="h-full">{body}</div>;
  return (
    <Link to={href} className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-xl">
      {body}
    </Link>
  );
}
