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
  // é alcançado por id (`/minhas-trilhas/:id`). Sem `to`, o link vem do slug.
  to?: string;
};

export function TrilhaCard(trilha: TrilhaCardProps) {
  const body = (
    <Card className="h-full transition-colors hover:border-primary">
      <CardHeader>
        <CardTitle className="text-base">{trilha.name}</CardTitle>
        {trilha.description && (
          <p className="text-sm text-muted-foreground">{trilha.description}</p>
        )}
      </CardHeader>
      {trilha.skillsCovered && trilha.skillsCovered.length > 0 && (
        <CardContent className="flex flex-wrap gap-2">
          {trilha.skillsCovered.map((skill) => (
            <Badge key={skill} variant="secondary">
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
  if (!href) return <div>{body}</div>;
  return (
    <Link to={href} className="block">
      {body}
    </Link>
  );
}
